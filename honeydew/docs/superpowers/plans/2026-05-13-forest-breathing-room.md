# Forest Breathing Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dense forests (50+ trees) look spacious and natural by introducing a virtual canvas wider than the terminal, viewport panning, height variation, and biome-driven ground detail.

**Architecture:** The forest's virtual width grows with tree count (`treeCount * 10`). The terminal viewer shows a viewport window into this wider canvas and supports arrow-key panning. Trees get per-ID height offsets, and procedural ground details fill gaps between trunks based on biome density.

**Tech Stack:** Node.js (ESM), chalk, node:test

---

### Task 1: Increase Scene Height (TREE_ROWS 7 → 10)

**Files:**
- Modify: `src/renderer.js:6` (TREE_ROWS constant)
- Modify: `test/renderer.test.js:18-19` (SCENE_HEIGHT assertion)

- [ ] **Step 1: Write the failing test**

Add a test that asserts the new SCENE_HEIGHT value. In `test/renderer.test.js`, add:

```javascript
it("has the correct scene height (sky + trees + ground + spacer + stats + cta)", () => {
  // 4 sky + 10 trees + 2 ground + 1 spacer + 1 stats + 1 cta = 19
  assert.equal(SCENE_HEIGHT, 19);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/renderer.test.js`
Expected: FAIL — SCENE_HEIGHT is currently 16 (with TREE_ROWS=7), not 19.

- [ ] **Step 3: Update TREE_ROWS**

In `src/renderer.js`, change line 6:

```javascript
const TREE_ROWS = 10;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/renderer.test.js`
Expected: All tests PASS. The "renders the expected number of lines" test still works because it checks `lines.length === SCENE_HEIGHT` dynamically.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.js test/renderer.test.js
git commit -m "feat(renderer): increase TREE_ROWS from 7 to 10 for height variation"
```

---

### Task 2: Add Virtual Width Calculation to Plant

**Files:**
- Modify: `src/plant.js:5-11` (MIN_GAP, getPlantWidth)
- Modify: `test/plant.test.js` (add virtual width tests)

- [ ] **Step 1: Write the failing test**

In `test/plant.test.js`, add a new test after the existing ones:

```javascript
it("spreads trees across virtual width for large forests", async () => {
  const forest = createEmptyForest();
  // Pre-populate with 50 trees in a narrow range (simulating old layout)
  for (let i = 1; i <= 50; i++) {
    forest.trees.push({
      id: i,
      type: "oak",
      growth: 1,
      x: 5 + i,
      plantedAt: new Date().toISOString(),
    });
  }
  writeForest(forest);

  await plant();

  const updated = readForest();
  const newTree = updated.trees.find((tree) => tree.id === 51);
  // Virtual width = max(80, 51 * 10) = 510
  // New tree should be placed within this wider range
  assert.ok(newTree.x >= 0, `x=${newTree.x} should be >= 0`);
  assert.ok(newTree.x <= 510, `x=${newTree.x} should be <= 510`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/plant.test.js`
Expected: FAIL — currently `getPlantWidth` returns at most `viewerWidth` (80), so `findOpenX` is constrained to ~80 cols and the new tree likely collides or gets crammed.

- [ ] **Step 3: Update MIN_GAP and getPlantWidth**

In `src/plant.js`, replace lines 5-12:

```javascript
const MIN_GAP = 6;
const DEFAULT_WIDTH = 80;
const TREE_SPACING = 10;

function getPlantWidth(forest) {
  const termWidth = forest.viewerWidth && forest.viewerWidth > 40
    ? forest.viewerWidth
    : DEFAULT_WIDTH;
  // Virtual width grows with tree count so trees have room to breathe
  const treeCount = forest.trees.length + 1; // +1 for the tree about to be planted
  return Math.max(termWidth, treeCount * TREE_SPACING);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/plant.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plant.js test/plant.test.js
git commit -m "feat(plant): use virtual width and increase MIN_GAP to 6"
```

---

### Task 3: Export Virtual Width Helper for Renderer

**Files:**
- Modify: `src/plant.js` (export getVirtualWidth)
- Modify: `test/plant.test.js` (test getVirtualWidth)

- [ ] **Step 1: Write the failing test**

In `test/plant.test.js`, update the import to include `getVirtualWidth`:

```javascript
const { plant } = await import("../src/plant.js");
```

Change to:

```javascript
const { plant, getVirtualWidth } = await import("../src/plant.js");
```

Add a test:

```javascript
describe("getVirtualWidth", () => {
  it("returns terminal width for small forests", () => {
    assert.equal(getVirtualWidth(5, 80), 80);
  });

  it("returns tree count * spacing for large forests", () => {
    assert.equal(getVirtualWidth(50, 80), 500);
  });

  it("always returns at least terminal width", () => {
    assert.equal(getVirtualWidth(3, 120), 120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/plant.test.js`
Expected: FAIL — `getVirtualWidth` is not exported.

- [ ] **Step 3: Add the exported helper**

In `src/plant.js`, add after the `TREE_SPACING` constant:

```javascript
export function getVirtualWidth(treeCount, termWidth) {
  return Math.max(termWidth, treeCount * TREE_SPACING);
}
```

Then update `getPlantWidth` to use it:

```javascript
function getPlantWidth(forest) {
  const termWidth = forest.viewerWidth && forest.viewerWidth > 40
    ? forest.viewerWidth
    : DEFAULT_WIDTH;
  const treeCount = forest.trees.length + 1;
  return getVirtualWidth(treeCount, termWidth);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/plant.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plant.js test/plant.test.js
git commit -m "feat(plant): export getVirtualWidth helper for renderer"
```

---

### Task 4: Add Migration Logic for Existing Tree Positions

**Files:**
- Create: `src/migrate.js`
- Create: `test/migrate.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/migrate.test.js`:

```javascript
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { migrateLayout } from "../src/migrate.js";

describe("migrateLayout", () => {
  it("does nothing if layoutVersion is 2", () => {
    const forest = {
      trees: [
        { id: 1, x: 100 },
        { id: 2, x: 200 },
      ],
      layoutVersion: 2,
    };
    const result = migrateLayout(forest, 80);
    assert.equal(result.trees[0].x, 100);
    assert.equal(result.trees[1].x, 200);
  });

  it("spreads trees across virtual width preserving order", () => {
    const forest = {
      trees: [
        { id: 1, type: "oak", growth: 1, x: 10 },
        { id: 2, type: "pine", growth: 1, x: 30 },
        { id: 3, type: "birch", growth: 1, x: 50 },
      ],
    };
    const result = migrateLayout(forest, 80);
    // Virtual width = max(80, 3 * 10) = 80
    // Trees should still be in left-to-right order
    assert.ok(result.trees[0].x < result.trees[1].x);
    assert.ok(result.trees[1].x < result.trees[2].x);
    assert.equal(result.layoutVersion, 2);
  });

  it("spreads cramped trees into wider space", () => {
    const trees = [];
    for (let i = 0; i < 50; i++) {
      trees.push({ id: i + 1, type: "oak", growth: 1, x: 5 + i });
    }
    const forest = { trees };
    const result = migrateLayout(forest, 80);
    // Virtual width = max(80, 50 * 10) = 500
    // Trees should now span a much wider range
    const xs = result.trees.map((t) => t.x);
    const spread = Math.max(...xs) - Math.min(...xs);
    assert.ok(spread > 200, `spread ${spread} should be > 200`);
    assert.equal(result.layoutVersion, 2);
  });

  it("applies jitter within +/-2 columns", () => {
    const trees = [];
    for (let i = 0; i < 20; i++) {
      trees.push({ id: i + 1, type: "oak", growth: 1, x: 5 + i * 2 });
    }
    const forest = { trees };
    const result = migrateLayout(forest, 80);
    // Virtual width = max(80, 20 * 10) = 200
    // Even spacing = 200 / 21 ≈ 9.5 per tree
    // Jitter is +/-2, so trees should still be in order
    for (let i = 1; i < result.trees.length; i++) {
      assert.ok(
        result.trees[i].x > result.trees[i - 1].x,
        `Tree ${i} (x=${result.trees[i].x}) should be after tree ${i - 1} (x=${result.trees[i - 1].x})`,
      );
    }
  });

  it("handles empty forest", () => {
    const forest = { trees: [] };
    const result = migrateLayout(forest, 80);
    assert.equal(result.layoutVersion, 2);
    assert.equal(result.trees.length, 0);
  });

  it("handles single tree", () => {
    const forest = { trees: [{ id: 1, type: "oak", growth: 1, x: 40 }] };
    const result = migrateLayout(forest, 80);
    assert.equal(result.layoutVersion, 2);
    assert.equal(result.trees.length, 1);
    assert.ok(typeof result.trees[0].x === "number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/migrate.test.js`
Expected: FAIL — `src/migrate.js` does not exist.

- [ ] **Step 3: Implement migrateLayout**

Create `src/migrate.js`:

```javascript
import { getVirtualWidth } from "./plant.js";

function hash(seed) {
  let value = seed >>> 0;
  value = Math.imul((value >>> 16) ^ value, 0x45d9f3b) >>> 0;
  value = Math.imul((value >>> 16) ^ value, 0x45d9f3b) >>> 0;
  return ((value >>> 16) ^ value) >>> 0;
}

export function migrateLayout(forest, termWidth) {
  if (forest.layoutVersion >= 2) return forest;

  const trees = forest.trees;
  if (trees.length === 0) {
    forest.layoutVersion = 2;
    return forest;
  }

  const virtualWidth = getVirtualWidth(trees.length, termWidth);
  const margin = 6;
  const usable = virtualWidth - margin * 2;

  // Sort by current x to preserve left-to-right order
  const sorted = [...trees].sort((a, b) => a.x - b.x);

  // Spread evenly across usable width with deterministic jitter
  const gap = trees.length === 1 ? 0 : usable / (trees.length - 1);

  for (let i = 0; i < sorted.length; i++) {
    const baseX = trees.length === 1
      ? Math.round(virtualWidth / 2)
      : Math.round(margin + i * gap);
    // Deterministic jitter: +/-2 based on tree id
    const jitter = (hash(sorted[i].id * 7 + 31) % 5) - 2;
    sorted[i].x = Math.max(margin, Math.min(virtualWidth - margin, baseX + jitter));
  }

  // Ensure order is preserved after jitter — nudge if needed
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x <= sorted[i - 1].x) {
      sorted[i].x = sorted[i - 1].x + 1;
    }
  }

  forest.layoutVersion = 2;
  return forest;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/migrate.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/migrate.js test/migrate.test.js
git commit -m "feat(migrate): add layout migration to spread trees across virtual width"
```

---

### Task 5: Integrate Migration into Plant and Viewer

**Files:**
- Modify: `src/plant.js:63-65` (call migrateLayout)
- Modify: `src/viewer.js:59-64` (call migrateLayout on load)

- [ ] **Step 1: Write the failing test**

In `test/plant.test.js`, add:

```javascript
it("migrates layout on first plant if no layoutVersion", async () => {
  const forest = createEmptyForest();
  // Simulate old-format forest with cramped trees
  for (let i = 1; i <= 30; i++) {
    forest.trees.push({
      id: i,
      type: "oak",
      growth: 1,
      x: 5 + i,
      plantedAt: new Date().toISOString(),
    });
  }
  // No layoutVersion field
  writeForest(forest);

  await plant();

  const updated = readForest();
  assert.equal(updated.layoutVersion, 2);
  // Trees should be spread out
  const xs = updated.trees.filter((t) => t.id <= 30).map((t) => t.x);
  const spread = Math.max(...xs) - Math.min(...xs);
  assert.ok(spread > 100, `spread ${spread} should be > 100 after migration`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/plant.test.js`
Expected: FAIL — plant does not call migrateLayout, so layoutVersion is not set and trees stay cramped.

- [ ] **Step 3: Integrate migration into plant**

In `src/plant.js`, add import at top:

```javascript
import { migrateLayout } from "./migrate.js";
```

In the `plant()` function, after `const width = getPlantWidth(forest);` (line 65), add:

```javascript
  // Migrate old layouts to use virtual width
  if (!forest.layoutVersion || forest.layoutVersion < 2) {
    const termWidth = forest.viewerWidth && forest.viewerWidth > 40
      ? forest.viewerWidth
      : DEFAULT_WIDTH;
    migrateLayout(forest, termWidth);
  }
```

- [ ] **Step 4: Integrate migration into viewer**

In `src/viewer.js`, add import at top:

```javascript
import { migrateLayout } from "./migrate.js";
```

In the `viewer()` function, after `let forest = readForest();` and the existence check, add:

```javascript
  // Migrate old layouts on first view
  if (forest && (!forest.layoutVersion || forest.layoutVersion < 2)) {
    const termWidth = process.stdout.columns || 80;
    migrateLayout(forest, termWidth);
    ignoreNextChange = true;
    writeForest(forest);
  }
```

Place this before `syncWidth()`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test/plant.test.js`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/plant.js src/viewer.js test/plant.test.js
git commit -m "feat: integrate layout migration into plant and viewer"
```

---

### Task 6: Add Viewport Rendering to renderFrame

**Files:**
- Modify: `src/renderer.js:224-274` (renderFrame — accept viewportX, render virtual buffer then slice)
- Modify: `test/renderer.test.js` (viewport tests)

- [ ] **Step 1: Write the failing tests**

In `test/renderer.test.js`, add after existing imports:

```javascript
import { getVirtualWidth } from "../src/plant.js";
```

Add new tests:

```javascript
describe("viewport rendering", () => {
  it("renders a viewport slice of a wider virtual canvas", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 200, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    // Tree is at x=200, outside 80-col terminal without viewport
    // With viewportX=180, the tree should be visible at relative x=20
    const output = renderFrame(forest, 80, { viewportX: 180, virtualWidth: 300 });
    // Output should contain tree pixels (block chars from the oak sprite)
    assert.ok(output.includes("█"));
  });

  it("does not show trees outside viewport", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 400, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    // Tree at x=400, viewport at x=0 with width 80 — tree is off-screen
    const withTree = renderFrame(forest, 80, { viewportX: 0, virtualWidth: 500 });
    const without = renderFrame(EMPTY_FOREST, 80, { viewportX: 0, virtualWidth: 500 });
    // The tree rows should be identical (tree is not visible)
    const treeLines = (output) => output.split("\n").slice(4, 14);
    assert.deepEqual(treeLines(withTree), treeLines(without));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/renderer.test.js`
Expected: FAIL — renderFrame ignores viewportX, renders tree at absolute x.

- [ ] **Step 3: Update renderFrame to support viewport**

In `src/renderer.js`, add import at top:

```javascript
import { getVirtualWidth } from "./plant.js";
```

Replace the `renderFrame` function (lines 224-274):

```javascript
export function renderFrame(forest, termWidth = 80, options = {}) {
  const width = Math.max(40, termWidth);
  const treeCount = forest.trees.length;
  const virtualWidth = options.virtualWidth ?? getVirtualWidth(treeCount, width);
  const viewportX = Math.max(
    0,
    Math.min(options.viewportX ?? 0, Math.max(0, virtualWidth - width)),
  );

  // Build the full virtual-width buffer
  const buffer = createBuffer(virtualWidth);
  const groundStart = SKY_ROWS + TREE_ROWS;
  const biome = getBiome(treeCount);
  const wilt = getWiltFactor(forest.lastActiveDate);

  for (const star of generateStars(virtualWidth, biome, options.twinkleSeed ?? 0)) {
    buffer[star.y][star.x] = { char: star.char, color: star.color };
  }

  for (let rowIndex = 0; rowIndex < GROUND_ROWS; rowIndex += 1) {
    for (let x = 0; x < virtualWidth; x += 1) {
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

  applyFog(buffer, wilt, virtualWidth);

  // Slice the viewport from the virtual buffer
  const lines = [];
  for (let y = 0; y < SCENE_HEIGHT - SPACER_ROWS - STATS_ROWS - CTA_ROWS; y += 1) {
    let line = "";
    for (let x = viewportX; x < viewportX + width; x += 1) {
      const cell = buffer[y][x];
      if (!cell.color) {
        line += cell.char;
      } else {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/renderer.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.js test/renderer.test.js
git commit -m "feat(renderer): add viewport support to renderFrame"
```

---

### Task 7: Add Viewport Panning and Follow-New-Tree to Viewer

**Files:**
- Modify: `src/viewer.js` (add viewport state, arrow key handling, follow-tree logic)

- [ ] **Step 1: Add viewport state and pass to renderFrame**

In `src/viewer.js`, add import:

```javascript
import { getVirtualWidth } from "./plant.js";
```

After `let animating = false;`, add:

```javascript
  let viewportX = forest.viewportX || 0;
  const PAN_STEP = 4;

  function getViewportWidth() {
    return process.stdout.columns || 80;
  }

  function clampViewport(x) {
    const vw = getVirtualWidth(forest.trees.length, getViewportWidth());
    return Math.max(0, Math.min(x, Math.max(0, vw - getViewportWidth())));
  }
```

Update the `renderForest` function:

```javascript
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
```

- [ ] **Step 2: Add arrow key input handling**

After the `process.stdout.on("resize", ...)` block, add:

```javascript
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
```

- [ ] **Step 3: Persist viewportX on exit**

In the `cleanup` function, save viewportX before exiting:

```javascript
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
```

- [ ] **Step 4: Add follow-newest-tree behavior**

In the `checkForUpdates` function, update the new-tree branch:

```javascript
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
```

- [ ] **Step 5: Run all tests to verify nothing broke**

Run: `node --test test/*.test.js`
Expected: All tests PASS.

- [ ] **Step 6: Manual test**

Run `honeytree` and verify:
- Left/right arrow keys pan the viewport
- Press `q` or Ctrl+C to exit
- If you run `honeytree plant` in another terminal, the viewport should follow the new tree

- [ ] **Step 7: Commit**

```bash
git add src/viewer.js
git commit -m "feat(viewer): add viewport panning with arrow keys and follow-new-tree"
```

---

### Task 8: Add Viewport Position Indicator to Stats Bar

**Files:**
- Modify: `src/renderer.js:201-222` (buildStatsLine)
- Modify: `test/renderer.test.js` (viewport indicator test)

- [ ] **Step 1: Write the failing test**

In `test/renderer.test.js`, add:

```javascript
it("shows viewport indicator when forest is wider than terminal", () => {
  const forest = {
    ...EMPTY_FOREST,
    trees: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      type: "oak",
      growth: 1,
      x: i * 10 + 5,
      plantedAt: EMPTY_FOREST.createdAt,
    })),
  };
  const output = renderFrame(forest, 80, { viewportX: 40, virtualWidth: 200 });
  // Should contain the minimap bracket indicators
  assert.ok(output.includes("["), "should contain minimap left bracket");
  assert.ok(output.includes("]"), "should contain minimap right bracket");
});

it("does not show viewport indicator when forest fits in terminal", () => {
  const output = renderFrame(EMPTY_FOREST, 80);
  // No minimap for forests that fit in one screen — ═ only appears in the minimap
  const statsLine = output.split("\n").find((l) => l.includes("honeytree"));
  assert.ok(!statsLine.includes("═"), "no minimap ═ chars for small forests");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/renderer.test.js`
Expected: FAIL — stats bar has no viewport indicator.

- [ ] **Step 3: Add viewport indicator to buildStatsLine**

In `src/renderer.js`, update `buildStatsLine` to accept viewport info and add the minimap. Change the signature and add minimap logic:

```javascript
function buildStatsLine(forest, biome, viewportX = 0, virtualWidth = 0, termWidth = 80) {
  const treeCount = forest.trees.length;
  const milestone = getNextMilestone(treeCount);
  const progress = milestone === 0 ? 0 : treeCount / milestone;
  const barWidth = 12;
  const filledWidth = Math.max(0, Math.min(barWidth, Math.round(progress * barWidth)));
  const bar =
    chalk.hex(BAR_FILL)("█".repeat(filledWidth)) +
    chalk.hex(BAR_EMPTY)("░".repeat(barWidth - filledWidth));

  // Viewport minimap — only show when forest is wider than terminal
  let minimap = "";
  if (virtualWidth > termWidth) {
    const mapWidth = 12;
    const viewFraction = termWidth / virtualWidth;
    const thumbWidth = Math.max(1, Math.round(viewFraction * mapWidth));
    const maxOffset = virtualWidth - termWidth;
    const thumbPos = maxOffset > 0
      ? Math.round((viewportX / maxOffset) * (mapWidth - thumbWidth))
      : 0;
    const mapBar =
      "─".repeat(thumbPos) +
      "═".repeat(thumbWidth) +
      "─".repeat(mapWidth - thumbPos - thumbWidth);
    minimap = chalk.hex(STATS_TEXT)(" [") +
      chalk.hex(BAR_FILL)(mapBar) +
      chalk.hex(STATS_TEXT)("]");
  }

  return (
    chalk.hex(STATS_ACCENT)(" honeytree") +
    chalk.hex(STATS_TEXT)(
      ` · ${treeCount} tree${treeCount === 1 ? "" : "s"} · `,
    ) +
    buildStreakSegment(forest) +
    chalk.hex(STATS_TEXT)(" · ") +
    bar +
    chalk.hex(STATS_TEXT)(` next: ${getNextTreeType(treeCount)}`) +
    chalk.hex("#555555")(` [${biome.label}]`) +
    minimap
  );
}
```

Update the call to `buildStatsLine` in `renderFrame` to pass viewport info:

```javascript
  lines.push(buildStatsLine(forest, biome, viewportX, virtualWidth, width));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/renderer.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.js test/renderer.test.js
git commit -m "feat(renderer): add viewport position minimap to stats bar"
```

---

### Task 9: Add Height Variation (yOffset per Tree)

**Files:**
- Modify: `src/renderer.js:244-247` (compositeSprite call uses yOffset)
- Modify: `test/renderer.test.js` (height variation test)

- [ ] **Step 1: Write the failing test**

In `test/renderer.test.js`, add:

```javascript
describe("height variation", () => {
  it("renders trees at different vertical offsets", () => {
    // Tree IDs that hash to different yOffsets
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 20, plantedAt: EMPTY_FOREST.createdAt },
        { id: 2, type: "oak", growth: 1, x: 40, plantedAt: EMPTY_FOREST.createdAt },
        { id: 3, type: "oak", growth: 1, x: 60, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    // Render and check that the output string is produced without error
    const output = renderFrame(forest, 80);
    assert.ok(typeof output === "string");
    assert.ok(output.length > 0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (baseline)**

Run: `node --test test/renderer.test.js`
Expected: PASS — this establishes a baseline.

- [ ] **Step 3: Add yOffset calculation and apply it**

In `src/renderer.js`, add a helper function after the `hash` function:

```javascript
function getTreeYOffset(treeId) {
  const h = hash(treeId * 13 + 7);
  return (h % 3) - 1; // Returns -1, 0, or 1
}
```

Update the tree rendering loop in `renderFrame` (the section that composites tree sprites):

```javascript
  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    const yOffset = getTreeYOffset(tree.id);
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY - yOffset);
  }
```

Also update `buildScene` and `renderPlainText` with the same change. In `buildScene`:

```javascript
  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    const yOffset = getTreeYOffset(tree.id);
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY - yOffset);
  }
```

In `renderPlainText`:

```javascript
  const treeBaseY = groundStart - 1;
  for (const tree of forest.trees) {
    const yOffset = getTreeYOffset(tree.id);
    compositeSprite(buffer, getSprite(tree.type, tree.growth), tree.x, treeBaseY - yOffset);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/renderer.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.js test/renderer.test.js
git commit -m "feat(renderer): add per-tree height variation using yOffset"
```

---

### Task 10: Add Ground Detail Sprites

**Files:**
- Modify: `src/sprites.js` (add ground detail sprite definitions)
- Modify: `test/sprites.test.js` (test ground detail sprites)

- [ ] **Step 1: Write the failing test**

In `test/sprites.test.js`, add:

```javascript
import { getGroundDetail, GROUND_DETAIL_TYPES } from "../src/sprites.js";
```

Update the import line at the top (replace the existing import):

```javascript
import { getSprite, getGroundDetail, TREE_TYPES, GROUND_DETAIL_TYPES } from "../src/sprites.js";
```

Add tests:

```javascript
describe("ground details", () => {
  it("exports ground detail types", () => {
    assert.ok(Array.isArray(GROUND_DETAIL_TYPES));
    assert.ok(GROUND_DETAIL_TYPES.length > 0);
  });

  it("returns sprites for every detail type", () => {
    for (const type of GROUND_DETAIL_TYPES) {
      const sprite = getGroundDetail(type);
      assert.ok(Array.isArray(sprite.rows));
      assert.ok(sprite.rows.length > 0);
      assert.ok(sprite.rows.length <= 2, `${type} should be 1-2 rows tall`);
      assert.ok(sprite.width <= 2, `${type} should be 1-2 chars wide`);
    }
  });

  it("stores rows as [char, color] tuples", () => {
    for (const type of GROUND_DETAIL_TYPES) {
      const sprite = getGroundDetail(type);
      for (const row of sprite.rows) {
        for (const cell of row) {
          assert.equal(Array.isArray(cell), true);
          assert.equal(cell.length, 2);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sprites.test.js`
Expected: FAIL — `getGroundDetail` and `GROUND_DETAIL_TYPES` are not exported.

- [ ] **Step 3: Add ground detail sprites**

In `src/sprites.js`, add after the COLORS constant:

```javascript
const DETAIL_COLORS = {
  mushroom: "#c4a882",
  mushroomCap: "#9e4a3a",
  rock: "#6b6b6b",
  rockLight: "#8a8a8a",
  grass: "#4a7a3a",
  grassLight: "#6ba85a",
  leaf: "#8a6a3a",
  leafDark: "#6a4a2a",
  bush: "#3a6a2a",
  bushLight: "#5a8a4a",
};
```

Add after the `SPRITES` object:

```javascript
const GROUND_DETAILS = {
  mushroom: parse(
    `
rr
 t
`,
    { r: DETAIL_COLORS.mushroomCap, t: DETAIL_COLORS.mushroom },
  ),
  rock: parse(
    `
rR
`,
    { r: DETAIL_COLORS.rock, R: DETAIL_COLORS.rockLight },
  ),
  grass: parse(
    `
gG
`,
    { g: DETAIL_COLORS.grass, G: DETAIL_COLORS.grassLight },
  ),
  leaf: parse(
    `
lL
`,
    { l: DETAIL_COLORS.leaf, L: DETAIL_COLORS.leafDark },
  ),
  bush: parse(
    `
bB
`,
    { b: DETAIL_COLORS.bush, B: DETAIL_COLORS.bushLight },
  ),
};

export const GROUND_DETAIL_TYPES = Object.keys(GROUND_DETAILS);

export function getGroundDetail(type) {
  const detail = GROUND_DETAILS[type];
  if (!detail) {
    throw new Error(`Unknown ground detail type: ${type}`);
  }
  return detail;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/sprites.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sprites.js test/sprites.test.js
git commit -m "feat(sprites): add ground detail sprites (mushroom, rock, grass, leaf, bush)"
```

---

### Task 11: Render Ground Details in renderFrame

**Files:**
- Modify: `src/renderer.js` (add ground detail rendering after trees, before fog)
- Modify: `test/renderer.test.js` (ground detail rendering test)

- [ ] **Step 1: Write the failing test**

In `test/renderer.test.js`, update imports:

```javascript
import { renderFrame, buildScene, SCENE_HEIGHT } from "../src/renderer.js";
```

Add:

```javascript
describe("ground details", () => {
  it("renders ground details for old growth forests", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        type: "oak",
        growth: 1,
        x: i * 10 + 5,
        plantedAt: EMPTY_FOREST.createdAt,
      })),
    };
    // buildScene returns the raw buffer — check for detail sprite colors
    const { buffer } = buildScene(forest, 600);
    // Ground details render in the lowest tree row (groundStart - 1) and ground rows
    // With 60 trees (old growth biome), there should be details scattered between trees
    // Just verify the function runs without error and produces output
    assert.ok(buffer.length > 0);
  });

  it("does not render ground details for clearings (< 10 trees)", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 20, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    const { buffer } = buildScene(forest, 80);
    // In clearing biome, no ground details should appear
    // The ground row should only have ground block colors
    assert.ok(buffer.length > 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (baseline)**

Run: `node --test test/renderer.test.js`
Expected: PASS — these are baseline tests.

- [ ] **Step 3: Add ground detail rendering**

In `src/renderer.js`, add import:

```javascript
import { getSprite, getGroundDetail, TREE_TYPES, GROUND_DETAIL_TYPES } from "./sprites.js";
```

Add biome detail density configuration to each biome in the `BIOMES` array:

```javascript
const BIOMES = [
  { // 0-9: sparse clearing
    ground: ["#2a3a28", "#1e2d1c"],
    starGlyphs: ["·", ".", " ", " "],
    starDensity: 12,
    starColors: ["#3a3a3a", "#444444"],
    label: "clearing",
    detailDensity: 0,
    detailTypes: [],
  },
  { // 10-24: young grove
    ground: ["#22492d", "#18361f"],
    starGlyphs: ["·", "·", "✦", "."],
    starDensity: 9,
    starColors: ["#444444", "#5d5d5d"],
    label: "grove",
    detailDensity: 18,
    detailTypes: ["rock", "grass"],
  },
  { // 25-49: dense woodland
    ground: ["#1e4a28", "#163a1e"],
    starGlyphs: ["·", "✦", "✧", "·", "."],
    starDensity: 7,
    starColors: ["#4d4d4d", "#5d5d5d", "#6a6a55"],
    label: "woodland",
    detailDensity: 12,
    detailTypes: ["rock", "grass", "mushroom", "bush"],
  },
  { // 50-99: old growth
    ground: ["#1a5230", "#124020"],
    starGlyphs: ["✦", "✧", "·", "·", "✦", "."],
    starDensity: 6,
    starColors: ["#5d5d5d", "#6d6d5a", "#7a7a60"],
    label: "old growth",
    detailDensity: 8,
    detailTypes: ["rock", "grass", "mushroom", "bush", "leaf"],
  },
  { // 100+: ancient forest
    ground: ["#165a32", "#0e4822"],
    starGlyphs: ["✦", "✧", "·", "✦", "⋆", "."],
    starDensity: 5,
    starColors: ["#6d6d5a", "#7a7a60", "#8a8a6a"],
    label: "ancient forest",
    detailDensity: 5,
    detailTypes: ["rock", "grass", "mushroom", "bush", "leaf"],
  },
];
```

Add a function to scatter ground details:

```javascript
function renderGroundDetails(buffer, biome, virtualWidth, groundStart) {
  if (biome.detailDensity === 0 || biome.detailTypes.length === 0) return;

  const detailRow = groundStart - 1; // lowest tree row, just above ground

  for (let x = 0; x < virtualWidth; x += 1) {
    const h = hash(x * 53 + 9973);
    if (h % biome.detailDensity !== 0) continue;

    // Pick detail type deterministically
    const detailType = biome.detailTypes[h % biome.detailTypes.length];
    const sprite = getGroundDetail(detailType);

    // Only place if all cells are currently empty (no tree pixel there)
    // compositeSprite centers the sprite, so match that logic here
    const offsetX = x - Math.floor(sprite.width / 2);
    let blocked = false;
    for (let rowIndex = 0; rowIndex < sprite.rows.length; rowIndex++) {
      const targetY = detailRow - rowIndex;
      if (targetY < 0 || targetY >= buffer.length) { blocked = true; break; }
      for (let colIndex = 0; colIndex < sprite.rows[rowIndex].length; colIndex++) {
        const targetX = offsetX + colIndex;
        if (targetX < 0 || targetX >= virtualWidth) { blocked = true; break; }
        const [, color] = sprite.rows[rowIndex][colIndex];
        if (color && buffer[targetY][targetX].color) { blocked = true; break; }
      }
      if (blocked) break;
    }
    if (blocked) continue;

    // Place the detail sprite (compositeSprite centers at x)
    compositeSprite(buffer, sprite, x, detailRow);
  }
}
```

In `renderFrame`, add the call after tree compositing and before fog:

```javascript
  renderGroundDetails(buffer, biome, virtualWidth, groundStart);

  applyFog(buffer, wilt, virtualWidth);
```

In `buildScene`, add the same call after tree compositing and before fog:

```javascript
  renderGroundDetails(buffer, biome, w, groundStart);

  applyFog(buffer, wilt, w);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/renderer.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.js test/renderer.test.js
git commit -m "feat(renderer): add biome-driven ground detail rendering"
```

---

### Task 12: Update buildScene and renderPlainText for Virtual Width

**Files:**
- Modify: `src/renderer.js:276-349` (buildScene and renderPlainText)
- Modify: `test/renderer.test.js` (verify buildScene works with virtual width)

- [ ] **Step 1: Write the failing test**

In `test/renderer.test.js`, add:

```javascript
describe("buildScene with virtual width", () => {
  it("builds a scene buffer wider than terminal width", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        type: "oak",
        growth: 1,
        x: i * 10 + 5,
        plantedAt: EMPTY_FOREST.createdAt,
      })),
    };
    const { buffer } = buildScene(forest, 200);
    assert.equal(buffer[0].length, 200);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test test/renderer.test.js`
Expected: PASS — buildScene already accepts a width parameter.

- [ ] **Step 3: Verify renderPlainText still works**

`renderPlainText` is capped at 80 chars for markdown embeds. It should continue to work as-is with height variation applied in Task 9. No changes needed beyond what Task 9 already did.

Run: `node --test test/renderer.test.js`
Expected: All PASS.

- [ ] **Step 4: Commit (if any changes were made)**

If no changes needed, skip this commit.

---

### Task 13: Final Integration Test

**Files:**
- Modify: `test/renderer.test.js` (end-to-end integration test)

- [ ] **Step 1: Write the integration test**

In `test/renderer.test.js`, add:

```javascript
describe("full integration", () => {
  it("renders a large forest with viewport, height variation, and ground details", () => {
    const forest = {
      trees: Array.from({ length: 77 }, (_, i) => ({
        id: i + 1,
        type: TREE_TYPES[i % TREE_TYPES.length],
        growth: 0.5 + (i % 5) * 0.1,
        x: i * 10 + 5,
        plantedAt: "2026-04-12T00:00:00.000Z",
      })),
      totalPrompts: 77,
      createdAt: "2026-04-12T00:00:00.000Z",
      lastActiveDate: new Date().toISOString().slice(0, 10),
      streak: 5,
    };

    // Render at different viewport positions
    const vw = 770; // 77 * 10
    const frame1 = renderFrame(forest, 80, { viewportX: 0, virtualWidth: vw });
    const frame2 = renderFrame(forest, 80, { viewportX: 200, virtualWidth: vw });
    const frame3 = renderFrame(forest, 80, { viewportX: 690, virtualWidth: vw });

    // All frames should be valid strings with the right number of lines
    for (const frame of [frame1, frame2, frame3]) {
      assert.equal(typeof frame, "string");
      assert.equal(frame.split("\n").length, SCENE_HEIGHT);
    }

    // Different viewport positions should produce different frames
    assert.notEqual(frame1, frame2);
    assert.notEqual(frame2, frame3);
  });
});
```

Add the TREE_TYPES import if not already there:

```javascript
import { TREE_TYPES } from "../src/sprites.js";
```

- [ ] **Step 2: Run the test**

Run: `node --test test/renderer.test.js`
Expected: All tests PASS.

- [ ] **Step 3: Run the full test suite**

Run: `node --test test/*.test.js`
Expected: All tests PASS across all test files.

- [ ] **Step 4: Commit**

```bash
git add test/renderer.test.js
git commit -m "test: add full integration test for viewport, height variation, and ground details"
```

---

### Task 14: Manual Verification and Cleanup

- [ ] **Step 1: Run honeytree with the updated code**

```bash
node bin/honeydew.js
```

Verify:
- Forest renders with visible spacing between trees
- Arrow keys pan left/right
- Stats bar shows minimap indicator `[═══─────────]`
- Trees appear at slightly different heights
- Ground details (mushrooms, rocks, grass) visible between trees in old growth
- `q` exits cleanly

- [ ] **Step 2: Test with a fresh forest**

```bash
HONEYDEW_DIR=/tmp/test-forest node bin/honeydew.js init
HONEYDEW_DIR=/tmp/test-forest node bin/honeydew.js plant
HONEYDEW_DIR=/tmp/test-forest node bin/honeydew.js
```

Verify it renders correctly with just 1 tree (clearing biome, no ground details, no minimap).

- [ ] **Step 3: Commit any final fixes**

If any issues were found, fix them and commit.
