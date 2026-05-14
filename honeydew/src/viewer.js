import fs from "node:fs";

import { renderFrame } from "./renderer.js";
import { getForestFile, readForest, writeForest } from "./state.js";
import { migrateLayout } from "./migrate.js";
import { getVirtualWidth } from "./plant.js";

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function viewer() {
  const forestFile = getForestFile();
  let forest = readForest();

  if (!forest || !fs.existsSync(forestFile)) {
    console.error('No forest found. Run "honeytree init" first.');
    process.exit(1);
  }

  // Migrate old layouts on first view
  if (forest && (!forest.layoutVersion || forest.layoutVersion < 2)) {
    const termWidth = process.stdout.columns || 80;
    migrateLayout(forest, termWidth);
    // Will be written to disk by syncWidth below
  }

  // Save terminal width so plant knows how wide to spread trees
  let ignoreNextChange = false;
  function syncWidth() {
    const cols = process.stdout.columns || 80;
    if (forest.viewerWidth !== cols) {
      forest.viewerWidth = cols;
      ignoreNextChange = true;
      writeForest(forest);
    }
  }

  let lastMaxId = forest.trees.reduce((max, tree) => Math.max(max, tree.id), 0);
  let lastTotalPrompts = forest.totalPrompts;
  let animating = false;

  let viewportX = forest.viewportX || 0;
  const PAN_STEP = 4;

  function getViewportWidth() {
    return process.stdout.columns || 80;
  }

  function clampViewport(x) {
    const vw = getVirtualWidth(forest.trees.length, getViewportWidth());
    return Math.max(0, Math.min(x, Math.max(0, vw - getViewportWidth())));
  }

  function renderForest(forest, twinkleSeed = 0) {
    moveHome();
    const termWidth = process.stdout.columns || 80;
    const vw = getVirtualWidth(forest.trees.length, termWidth);
    process.stdout.write(renderFrame(forest, termWidth, {
      twinkleSeed,
      viewportX,
      virtualWidth: vw,
    }));
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

  syncWidth();
  hideCursor();
  clearScreen();
  renderForest(forest);

  const cleanup = () => {
    // Persist viewport position for next session
    forest.viewportX = viewportX;
    ignoreNextChange = true;
    writeForest(forest);
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
    syncWidth();
    clearScreen();
    renderForest(forest);
  });

  // Enable raw mode for keypress handling
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (data) => {
      const key = data.toString();
      // Ctrl+C or q to quit
      if (key === "\x03" || key === "q") {
        cleanup();
        return;
      }
      // Left arrow: \x1b[D
      if (key === "\x1b[D") {
        viewportX = clampViewport(viewportX - PAN_STEP);
        forest.viewportX = viewportX;
        renderForest(forest);
        return;
      }
      // Right arrow: \x1b[C
      if (key === "\x1b[C") {
        viewportX = clampViewport(viewportX + PAN_STEP);
        forest.viewportX = viewportX;
        renderForest(forest);
        return;
      }
    });
  }

  // Check for changes — used by both fs.watch and polling fallback
  async function checkForUpdates() {
    if (animating) return;

    if (ignoreNextChange) {
      ignoreNextChange = false;
      return;
    }

    const updated = readForest();
    if (!updated) return;

    // Only re-render if something actually changed
    if (updated.totalPrompts === lastTotalPrompts) return;

    const nextMaxId = updated.trees.reduce((max, tree) => Math.max(max, tree.id), 0);
    forest = updated;
    lastTotalPrompts = forest.totalPrompts;

    if (nextMaxId > lastMaxId) {
      lastMaxId = nextMaxId;
      // Center viewport on the new tree
      const newTree = forest.trees.find((t) => t.id === nextMaxId);
      if (newTree) {
        const termWidth = getViewportWidth();
        viewportX = clampViewport(newTree.x - Math.floor(termWidth / 2));
      }
      animating = true;
      await animateNewTree(forest, nextMaxId);
      animating = false;
    } else {
      renderForest(forest);
    }
  }

  // fs.watch can drop events on macOS after atomic renames, so
  // use it for fast response but also poll as a reliable fallback
  function startWatcher() {
    try {
      const watcher = fs.watch(forestFile, () => {
        checkForUpdates();
      });
      watcher.on("error", () => {});
      return watcher;
    } catch {
      return null;
    }
  }

  let watcher = startWatcher();

  // Poll every 800ms as fallback — cheap since it only reads if mtime changed
  let lastMtime = 0;
  try {
    lastMtime = fs.statSync(forestFile).mtimeMs;
  } catch {}

  setInterval(() => {
    try {
      const mtime = fs.statSync(forestFile).mtimeMs;
      if (mtime !== lastMtime) {
        lastMtime = mtime;
        checkForUpdates();

        // Re-establish watcher in case rename killed it
        if (watcher) {
          try { watcher.close(); } catch {}
        }
        watcher = startWatcher();
      }
    } catch {}
  }, 800);
}
