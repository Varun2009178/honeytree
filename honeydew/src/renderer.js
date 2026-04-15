import chalk from "chalk";

import { getSprite, TREE_TYPES } from "./sprites.js";

const SKY_ROWS = 4;
const TREE_ROWS = 7;
const GROUND_ROWS = 2;
const SPACER_ROWS = 1;
const STATS_ROWS = 1;

export const SCENE_HEIGHT =
  SKY_ROWS + TREE_ROWS + GROUND_ROWS + SPACER_ROWS + STATS_ROWS;

const STAR_GLYPHS = ["·", "·", "✦", "."];
const GROUND_COLORS = ["#22492d", "#18361f"];
const STATS_ACCENT = "#f5a50b";
const STATS_TEXT = "#8e8a84";
const BAR_FILL = "#6cb95e";
const BAR_EMPTY = "#3d3d3d";
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

function createBuffer(width) {
  return Array.from({ length: SCENE_HEIGHT }, () =>
    Array.from({ length: width }, () => ({ char: " ", color: null })),
  );
}

function hash(seed) {
  let value = seed >>> 0;
  value = Math.imul((value >>> 16) ^ value, 0x45d9f3b) >>> 0;
  value = Math.imul((value >>> 16) ^ value, 0x45d9f3b) >>> 0;
  return ((value >>> 16) ^ value) >>> 0;
}

function generateStars(width, twinkle = 0) {
  const stars = [];
  for (let x = 0; x < width; x += 1) {
    const seeded = hash(x + width * 17 + twinkle * 101);
    if (seeded % 9 !== 0) continue;
    stars.push({
      x,
      y: seeded % SKY_ROWS,
      char: STAR_GLYPHS[seeded % STAR_GLYPHS.length],
      color: seeded % 3 === 0 ? "#5d5d5d" : "#444444",
    });
  }
  return stars;
}

function compositeSprite(buffer, sprite, centerX, baseY) {
  const offsetX = centerX - Math.floor(sprite.width / 2);
  for (let rowIndex = 0; rowIndex < sprite.rows.length; rowIndex += 1) {
    const targetY = baseY - rowIndex;
    if (targetY < 0 || targetY >= buffer.length) continue;
    const row = sprite.rows[rowIndex];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const targetX = offsetX + columnIndex;
      if (targetX < 0 || targetX >= buffer[0].length) continue;
      const [char, color] = row[columnIndex];
      if (!color) continue;
      buffer[targetY][targetX] = { char, color };
    }
  }
}

function getNextMilestone(treeCount) {
  return MILESTONES.find((value) => treeCount < value) ?? treeCount + 100;
}

function getNextTreeType(treeCount) {
  return TREE_TYPES[treeCount % TREE_TYPES.length];
}

function getDayCount(createdAt) {
  const created = new Date(createdAt).getTime();
  const diff = Date.now() - created;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return Math.max(1, days + 1);
}

function buildStatsLine(forest) {
  const treeCount = forest.trees.length;
  const milestone = getNextMilestone(treeCount);
  const progress = milestone === 0 ? 0 : treeCount / milestone;
  const barWidth = 12;
  const filledWidth = Math.max(0, Math.min(barWidth, Math.round(progress * barWidth)));
  const bar =
    chalk.hex(BAR_FILL)("█".repeat(filledWidth)) +
    chalk.hex(BAR_EMPTY)("░".repeat(barWidth - filledWidth));

  return (
    chalk.hex(STATS_ACCENT)(" honeytree") +
    chalk.hex(STATS_TEXT)(
      ` · ${treeCount} tree${treeCount === 1 ? "" : "s"} · ${getDayCount(
        forest.createdAt,
      )} day${getDayCount(forest.createdAt) === 1 ? "" : "s"} · `,
    ) +
    bar +
    chalk.hex(STATS_TEXT)(` next: ${getNextTreeType(treeCount)}`)
  );
}

export function renderFrame(forest, termWidth = 80, options = {}) {
  const width = Math.max(40, termWidth);
  const buffer = createBuffer(width);
  const groundStart = SKY_ROWS + TREE_ROWS;

  for (const star of generateStars(width, options.twinkleSeed ?? 0)) {
    buffer[star.y][star.x] = { char: star.char, color: star.color };
  }

  for (let rowIndex = 0; rowIndex < GROUND_ROWS; rowIndex += 1) {
    for (let x = 0; x < width; x += 1) {
      buffer[groundStart + rowIndex][x] = {
        char: "█",
        color: GROUND_COLORS[rowIndex],
      };
    }
  }

  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY);
  }

  const lines = [];
  for (let y = 0; y < SCENE_HEIGHT - SPACER_ROWS - STATS_ROWS; y += 1) {
    let line = "";
    for (const cell of buffer[y]) {
      line += cell.color ? chalk.hex(cell.color)(cell.char) : cell.char;
    }
    lines.push(line);
  }

  lines.push("");
  lines.push(buildStatsLine(forest));

  return lines.join("\n");
}
