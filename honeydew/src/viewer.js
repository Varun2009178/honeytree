import fs from "node:fs";

import { renderFrame } from "./renderer.js";
import { getForestFile, readForest } from "./state.js";

function writeAnsi(code) {
  process.stdout.write(code);
}

function clearScreen() {
  writeAnsi("\x1b[2J\x1b[H");
}

function hideCursor() {
  writeAnsi("\x1b[?25l");
}

function showCursor() {
  writeAnsi("\x1b[?25h");
}

function moveHome() {
  writeAnsi("\x1b[H");
}

function renderForest(forest, twinkleSeed = 0) {
  moveHome();
  process.stdout.write(renderFrame(forest, process.stdout.columns || 80, { twinkleSeed }));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animateNewTree(forest, newTreeId) {
  const tree = forest.trees.find((entry) => entry.id === newTreeId);
  if (!tree) {
    renderForest(forest);
    return;
  }

  const originalGrowth = tree.growth;
  const frames = [0.12, 0.32, 0.6, originalGrowth].filter(
    (value, index, values) => value <= originalGrowth && values.indexOf(value) === index,
  );

  for (let index = 0; index < frames.length; index += 1) {
    tree.growth = frames[index];
    renderForest(forest, index);
    await delay(120);
  }

  tree.growth = originalGrowth;
  renderForest(forest);
}

export async function viewer() {
  const forestFile = getForestFile();
  let forest = readForest();

  if (!forest || !fs.existsSync(forestFile)) {
    console.error('No forest found. Run "honeytree init" first.');
    process.exit(1);
  }

  hideCursor();
  clearScreen();
  renderForest(forest);

  let lastMaxId = forest.trees.reduce((max, tree) => Math.max(max, tree.id), 0);

  const cleanup = () => {
    showCursor();
    clearScreen();
    console.log(
      `Forest summary: ${forest.trees.length} trees across ${forest.totalPrompts} prompts`,
    );
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.stdout.on("resize", () => {
    clearScreen();
    renderForest(forest);
  });

  let debounceTimer;
  fs.watch(forestFile, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const updated = readForest();
      if (!updated) return;

      const nextMaxId = updated.trees.reduce((max, tree) => Math.max(max, tree.id), 0);
      forest = updated;
      if (nextMaxId > lastMaxId) {
        lastMaxId = nextMaxId;
        await animateNewTree(forest, nextMaxId);
      } else {
        renderForest(forest);
      }
    }, 100);
  });
}
