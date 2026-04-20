import { getSprite, TREE_TYPES } from "./sprites.js";
import { createEmptyForest, readForest, writeForest } from "./state.js";
import { findBadgeFile, writeBadgeSVG } from "./badge.js";

const MIN_GAP = 4;
const DEFAULT_WIDTH = 80;

function getPlantWidth(forest) {
  // Use the width saved by the viewer, fall back to default
  if (forest.viewerWidth && forest.viewerWidth > 40) return forest.viewerWidth;
  return DEFAULT_WIDTH;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
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

function findOpenX(trees, type, growth, width) {
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

export async function plant() {
  const forest = readForest() ?? createEmptyForest();
  const width = getPlantWidth(forest);

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

  const type = randomItem(TREE_TYPES);
  const growth = randomGrowth();
  const nextId = forest.trees.reduce((max, tree) => Math.max(max, tree.id), 0) + 1;

  forest.trees.push({
    id: nextId,
    type,
    growth,
    x: findOpenX(forest.trees, type, growth, width),
    plantedAt: new Date().toISOString(),
  });
  forest.totalPrompts += 1;

  writeForest(forest);

  // Auto-refresh badge if one exists in the repo
  try {
    const badgePath = findBadgeFile();
    if (badgePath) writeBadgeSVG(forest, badgePath);
  } catch {}
}
