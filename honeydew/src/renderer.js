import chalk from "chalk";

import { getSprite, TREE_TYPES } from "./sprites.js";

const SKY_ROWS = 4;
const TREE_ROWS = 7;
const GROUND_ROWS = 2;
const SPACER_ROWS = 1;
const STATS_ROWS = 1;
const CTA_ROWS = 1;

export const SCENE_HEIGHT =
  SKY_ROWS + TREE_ROWS + GROUND_ROWS + SPACER_ROWS + STATS_ROWS + CTA_ROWS;

const STATS_ACCENT = "#f5a50b";
const STATS_TEXT = "#8e8a84";
const STATS_WARN = "#c4653a";
const STREAK_COLOR = "#e8a33a";
const BAR_FILL = "#6cb95e";
const BAR_EMPTY = "#3d3d3d";
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

// Wilting — lerp toward dry brown when idle
const WILT_TARGET = { r: 0x8a, g: 0x6a, b: 0x4a };

function parseHex(hex) {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function wiltColor(hex, factor) {
  if (factor <= 0) return hex;
  const c = parseHex(hex);
  return toHex({
    r: c.r + (WILT_TARGET.r - c.r) * factor,
    g: c.g + (WILT_TARGET.g - c.g) * factor,
    b: c.b + (WILT_TARGET.b - c.b) * factor,
  });
}

export function getWiltFactor(lastActiveDate) {
  if (!lastActiveDate) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const a = new Date(lastActiveDate + "T00:00:00");
  const b = new Date(today + "T00:00:00");
  const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 0;
  if (days === 1) return 0.25;
  if (days === 2) return 0.45;
  if (days === 3) return 0.65;
  return Math.min(0.85, 0.65 + (days - 3) * 0.05);
}

// Fog — procedural haze that thickens with inactivity
const FOG_CHARS = ["░", "░", "▒"];
const FOG_COLOR_UPPER = "#9a9a9a";
const FOG_COLOR_LOWER = "#6a6a6a";

function applyFog(buffer, wilt, width) {
  if (wilt <= 0) return;
  // Higher wilt → lower threshold → more fog
  const threshold = Math.max(3, Math.round(18 * (1 - wilt)));
  const fogStart = SKY_ROWS - 2; // creep into lower sky
  const fogEnd = SKY_ROWS + TREE_ROWS + GROUND_ROWS;

  for (let y = Math.max(0, fogStart); y < fogEnd; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const h = hash(x * 31 + y * 97 + 12345);
      if (h % threshold !== 0) continue;
      const fogChar = FOG_CHARS[h % FOG_CHARS.length];
      const blend = (y - fogStart) / (fogEnd - fogStart);
      const fogColor = blend > 0.5 ? FOG_COLOR_LOWER : FOG_COLOR_UPPER;
      buffer[y][x] = { char: fogChar, color: fogColor };
    }
  }
}

// Biomes evolve as the forest grows — never resets, only gets richer
const BIOMES = [
  { // 0-9: sparse clearing
    ground: ["#2a3a28", "#1e2d1c"],
    starGlyphs: ["·", ".", " ", " "],
    starDensity: 12,
    starColors: ["#3a3a3a", "#444444"],
    label: "clearing",
  },
  { // 10-24: young grove
    ground: ["#22492d", "#18361f"],
    starGlyphs: ["·", "·", "✦", "."],
    starDensity: 9,
    starColors: ["#444444", "#5d5d5d"],
    label: "grove",
  },
  { // 25-49: dense woodland
    ground: ["#1e4a28", "#163a1e"],
    starGlyphs: ["·", "✦", "✧", "·", "."],
    starDensity: 7,
    starColors: ["#4d4d4d", "#5d5d5d", "#6a6a55"],
    label: "woodland",
  },
  { // 50-99: old growth
    ground: ["#1a5230", "#124020"],
    starGlyphs: ["✦", "✧", "·", "·", "✦", "."],
    starDensity: 6,
    starColors: ["#5d5d5d", "#6d6d5a", "#7a7a60"],
    label: "old growth",
  },
  { // 100+: ancient forest
    ground: ["#165a32", "#0e4822"],
    starGlyphs: ["✦", "✧", "·", "✦", "⋆", "."],
    starDensity: 5,
    starColors: ["#6d6d5a", "#7a7a60", "#8a8a6a"],
    label: "ancient forest",
  },
];

function getBiome(treeCount) {
  if (treeCount < 10) return BIOMES[0];
  if (treeCount < 25) return BIOMES[1];
  if (treeCount < 50) return BIOMES[2];
  if (treeCount < 100) return BIOMES[3];
  return BIOMES[4];
}

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

function generateStars(width, biome, twinkle = 0) {
  const stars = [];
  for (let x = 0; x < width; x += 1) {
    const seeded = hash(x + width * 17 + twinkle * 101);
    if (seeded % biome.starDensity !== 0) continue;
    stars.push({
      x,
      y: seeded % SKY_ROWS,
      char: biome.starGlyphs[seeded % biome.starGlyphs.length],
      color: biome.starColors[seeded % biome.starColors.length],
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

function buildStreakSegment(forest) {
  const wilt = getWiltFactor(forest.lastActiveDate);
  const streak = forest.streak || 0;

  if (wilt > 0) {
    const a = new Date(forest.lastActiveDate + "T00:00:00");
    const b = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    const idle = Math.round((b - a) / (24 * 60 * 60 * 1000));
    return chalk.hex(STATS_WARN)(`wilting (${idle}d idle)`);
  }

  if (streak <= 0) return chalk.hex(STATS_TEXT)("no streak");
  return chalk.hex(STREAK_COLOR)(`${streak}-day streak`);
}

function buildStatsLine(forest, biome) {
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
      ` · ${treeCount} tree${treeCount === 1 ? "" : "s"} · `,
    ) +
    buildStreakSegment(forest) +
    chalk.hex(STATS_TEXT)(" · ") +
    bar +
    chalk.hex(STATS_TEXT)(` next: ${getNextTreeType(treeCount)}`) +
    chalk.hex("#555555")(` [${biome.label}]`)
  );
}

export function renderFrame(forest, termWidth = 80, options = {}) {
  const width = Math.max(40, termWidth);
  const buffer = createBuffer(width);
  const groundStart = SKY_ROWS + TREE_ROWS;
  const biome = getBiome(forest.trees.length);
  const wilt = getWiltFactor(forest.lastActiveDate);

  for (const star of generateStars(width, biome, options.twinkleSeed ?? 0)) {
    buffer[star.y][star.x] = { char: star.char, color: star.color };
  }

  for (let rowIndex = 0; rowIndex < GROUND_ROWS; rowIndex += 1) {
    for (let x = 0; x < width; x += 1) {
      buffer[groundStart + rowIndex][x] = {
        char: "█",
        color: biome.ground[rowIndex],
      };
    }
  }

  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY);
  }

  applyFog(buffer, wilt, width);

  const lines = [];
  for (let y = 0; y < SCENE_HEIGHT - SPACER_ROWS - STATS_ROWS - CTA_ROWS; y += 1) {
    let line = "";
    for (const cell of buffer[y]) {
      if (!cell.color) {
        line += cell.char;
      } else {
        // Apply wilting to tree rows and ground (skip sky)
        const color = wilt > 0 && y >= SKY_ROWS ? wiltColor(cell.color, wilt) : cell.color;
        line += chalk.hex(color)(cell.char);
      }
    }
    lines.push(line);
  }

  lines.push("");
  lines.push(buildStatsLine(forest, biome));
  lines.push(
    chalk.hex("#555555")(" add your forest to your README → ") +
    chalk.hex(STATS_ACCENT)("honeytree badge"),
  );

  return lines.join("\n");
}

export function buildScene(forest, width) {
  const w = Math.max(40, width);
  const sceneRows = SKY_ROWS + TREE_ROWS + GROUND_ROWS;
  const buffer = Array.from({ length: sceneRows }, () =>
    Array.from({ length: w }, () => ({ char: " ", color: null })),
  );
  const groundStart = SKY_ROWS + TREE_ROWS;
  const biome = getBiome(forest.trees.length);
  const wilt = getWiltFactor(forest.lastActiveDate);

  for (const star of generateStars(w, biome, 0)) {
    if (star.y < sceneRows) {
      buffer[star.y][star.x] = { char: star.char, color: star.color };
    }
  }

  for (let rowIndex = 0; rowIndex < GROUND_ROWS; rowIndex += 1) {
    for (let x = 0; x < w; x += 1) {
      buffer[groundStart + rowIndex][x] = { char: "█", color: biome.ground[rowIndex] };
    }
  }

  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY);
  }

  applyFog(buffer, wilt, w);

  if (wilt > 0) {
    for (let y = SKY_ROWS; y < sceneRows; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (buffer[y][x].color) {
          buffer[y][x].color = wiltColor(buffer[y][x].color, wilt);
        }
      }
    }
  }

  return { buffer, biome, sceneRows };
}

export function renderPlainText(forest, width = 60) {
  const w = Math.max(40, Math.min(width, 80));
  const buffer = createBuffer(w);
  const groundStart = SKY_ROWS + TREE_ROWS;
  const biome = getBiome(forest.trees.length);

  for (const star of generateStars(w, biome, 0)) {
    buffer[star.y][star.x] = { char: star.char, color: star.color };
  }

  for (let rowIndex = 0; rowIndex < GROUND_ROWS; rowIndex += 1) {
    for (let x = 0; x < w; x += 1) {
      buffer[groundStart + rowIndex][x] = { char: "█", color: "#333" };
    }
  }

  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY);
  }

  const lines = [];
  for (let y = 0; y < SCENE_HEIGHT - SPACER_ROWS - STATS_ROWS - CTA_ROWS; y += 1) {
    let line = "";
    for (const cell of buffer[y]) {
      line += cell.char;
    }
    lines.push(line.trimEnd());
  }

  return lines.join("\n");
}
