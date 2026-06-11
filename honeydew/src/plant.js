import { getSprite } from "./sprites.js";
import { getUnlockedVarietyKeys } from "./rewards.js";
import { unlockedPool, pickSpecies } from "./varieties.js";
import { createEmptyForest, readForest, writeForest } from "./state.js";
import { findBadgeFile, writeBadgeSVG } from "./badge.js";
import { migrateLayout } from "./migrate.js";
import { isLoggedIn } from "./auth.js";
import { syncToCloud } from "./sync.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MIN_GAP = 6;
const DEFAULT_WIDTH = 80;
const TREE_SPACING = 6;

export function getVirtualWidth(treeCount, termWidth) {
  return Math.max(termWidth, treeCount * TREE_SPACING);
}

export function getPlantWidth(forest) {
  const termWidth = forest.viewerWidth && forest.viewerWidth > 40
    ? forest.viewerWidth
    : DEFAULT_WIDTH;
  const treeCount = forest.trees.length + 1;
  return getVirtualWidth(treeCount, termWidth);
}

function randomGrowth() {
  return Math.round((0.3 + Math.random() * 0.7) * 100) / 100;
}

function occupiedRanges(trees) {
  return trees.map((tree) => {
    const sprite = getSprite(tree.type, tree.growth);
    const half = Math.floor(sprite.width / 2);
    return [tree.x - half - MIN_GAP, tree.x + half + MIN_GAP];
  });
}

export function findOpenX(trees, type, growth, width) {
  const sprite = getSprite(type, growth);
  const half = Math.floor(sprite.width / 2);
  const margin = half + 1;
  const ranges = occupiedRanges(trees);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const x =
      margin + Math.floor(Math.random() * Math.max(1, width - margin * 2));
    const left = x - half;
    const right = x + half;
    const collides = ranges.some(
      ([occupiedLeft, occupiedRight]) =>
        left < occupiedRight && right > occupiedLeft,
    );
    if (!collides) return x;
  }

  return margin + Math.floor(Math.random() * Math.max(1, width - margin * 2));
}

function nudgeGrowth(growth) {
  if (growth >= 1) return 1;
  const nextGrowth = growth + 0.1 + Math.random() * 0.1;
  return Math.min(1, Math.round(nextGrowth * 100) / 100);
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  return Math.round(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}

export async function tick(shape = null) {
  const forest = readForest() ?? createEmptyForest();
  const width = getPlantWidth(forest);

  // Migrate old layouts to use virtual width
  if (!forest.layoutVersion || forest.layoutVersion < 2) {
    const termWidth = forest.viewerWidth && forest.viewerWidth > 40
      ? forest.viewerWidth
      : DEFAULT_WIDTH;
    migrateLayout(forest, termWidth);
  }

  // Update streak
  const today = new Date().toISOString().slice(0, 10);
  if (forest.lastActiveDate) {
    const gap = daysBetween(forest.lastActiveDate, today);
    if (gap === 0) {
      // Same day — streak stays (ensure at least 1)
      forest.streak = Math.max(forest.streak || 0, 1);
    } else if (gap === 1) {
      forest.streak = (forest.streak || 1) + 1;
    } else {
      forest.streak = 1;
    }
  } else {
    forest.streak = 1;
  }
  forest.lastActiveDate = today;

  for (const tree of forest.trees) {
    tree.growth = nudgeGrowth(tree.growth);
  }

  let type = shape?.type;
  let variant = shape?.variant ?? null;
  if (!type) {
    const species = pickSpecies(unlockedPool(getUnlockedVarietyKeys()));
    type = species.type;
    variant = species.variant ?? null;
  }
  const growth = typeof shape?.growth === "number" ? shape.growth : randomGrowth();
  const nextId = forest.trees.reduce((max, tree) => Math.max(max, tree.id), 0) + 1;
  const x = typeof shape?.x === "number" ? shape.x : findOpenX(forest.trees, type, growth, width);

  const tree = { id: nextId, type, growth, x, plantedAt: new Date().toISOString() };
  if (shape?.heightBonus) tree.heightBonus = shape.heightBonus;
  if (variant) tree.variant = variant;
  forest.trees.push(tree);
  forest.totalPrompts += 1;

  writeForest(forest);

  // Auto-refresh badge if one exists in the repo
  try {
    const badgePath = findBadgeFile();
    if (badgePath) writeBadgeSVG(forest, badgePath);
  } catch {}

  // Cloud sync on every plant (fire-and-forget) so the web dashboard, which
  // polls every 20s, mirrors the terminal in near real time.
  if (isLoggedIn()) {
    syncToCloud(forest).catch(() => {});
  }

  // Milestone check at every 50 prompts — unlocks 1 real tree planting
  if (isLoggedIn() && forest.totalPrompts > 0 && forest.totalPrompts % 50 === 0) {
    const milestoneFile = path.join(os.homedir(), ".honeydew", "milestone.json");
    fs.mkdirSync(path.dirname(milestoneFile), { recursive: true });
    fs.writeFileSync(
      milestoneFile,
      JSON.stringify({ totalPrompts: forest.totalPrompts, timestamp: Date.now() })
    );
  }
}
