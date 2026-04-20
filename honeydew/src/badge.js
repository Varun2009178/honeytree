import fs from "node:fs";
import path from "node:path";

import { readForest } from "./state.js";
import { buildScene, getWiltFactor } from "./renderer.js";

const CELL = 6;
const BG = "#0d1117";
const TEXT_PAD = 18;

function buildStatsText(forest, biome) {
  const count = forest.trees.length;
  const streak = forest.streak || 0;
  const wilt = getWiltFactor(forest.lastActiveDate);

  const parts = [`${count} tree${count === 1 ? "" : "s"}`];

  if (wilt > 0) {
    const a = new Date(forest.lastActiveDate + "T00:00:00");
    const b = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    const idle = Math.round((b - a) / (24 * 60 * 60 * 1000));
    parts.push(`wilting (${idle}d idle)`);
  } else if (streak > 0) {
    parts.push(`${streak}d streak`);
  }

  parts.push(biome.label);
  return parts.join(" · ");
}

function generateForestSVG(forest) {
  const cols = Math.max(40, Math.min(forest.viewerWidth || 60, 80));
  const { buffer, biome, sceneRows } = buildScene(forest, cols);

  const artW = cols * CELL;
  const artH = sceneRows * CELL;
  const totalW = artW;
  const totalH = artH + TEXT_PAD;

  let rects = "";
  for (let y = 0; y < sceneRows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = buffer[y][x];
      if (!cell.color) continue;
      rects += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${cell.color}"/>`;
    }
  }

  const stats = buildStatsText(forest, biome);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
<rect width="${totalW}" height="${totalH}" fill="${BG}" rx="6"/>
${rects}
<text x="${totalW / 2}" y="${artH + 13}" text-anchor="middle" fill="#8e8a84" font-family="monospace" font-size="10">${stats}</text>
</svg>`;
}

export function writeBadgeSVG(forest, outPath) {
  fs.writeFileSync(outPath, generateForestSVG(forest));
}

export function findBadgeFile() {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, "honeytree-badge.svg");
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

export async function badge() {
  const forest = readForest();
  if (!forest) {
    console.error('No forest found. Run "honeytree init" first.');
    process.exit(1);
  }

  const outPath = path.resolve("honeytree-badge.svg");
  writeBadgeSVG(forest, outPath);

  console.log(`Badge written to ${outPath}`);
  console.log("");
  console.log("Add this to your README to show your Honeytree forest.");
  console.log("The badge links to https://github.com/Varun2009178/honeytree");
  console.log("");
  console.log(
    `[![honeytree](./honeytree-badge.svg)](https://github.com/Varun2009178/honeytree)`,
  );
}
