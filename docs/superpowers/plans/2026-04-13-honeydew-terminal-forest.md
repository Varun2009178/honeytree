# Honeydew Terminal Forest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an npm package that grows a pixel-art forest in the terminal every time you use Claude Code.

**Architecture:** A Claude Code `Stop` hook calls `honeydew plant` after each response, which appends a tree to `~/.honeydew/forest.json`. A separate viewer process (`honeydew`) watches that file and renders the forest using ANSI block characters. All rendering is done via a character grid buffer written to stdout.

**Tech Stack:** Node.js (>=18), chalk v5 (ESM), fs.watch, ANSI escape codes

**Spec:** `docs/superpowers/specs/2026-04-13-honeydew-terminal-forest-design.md`

---

## File Map

```
honeydew/
├── package.json          # npm package config, bin entry, chalk dep
├── bin/
│   └── honeydew.js       # CLI entry — parses args, routes to init/plant/viewer
├── src/
│   ├── state.js          # Read/write ~/.honeydew/forest.json, atomic writes
│   ├── sprites.js        # 5 tree types × 4 growth stages as 2D pixel arrays
│   ├── renderer.js       # Frame buffer: compose sky + ground + trees + stats → string
│   ├── plant.js          # Add a tree to forest.json (called by hook, <50ms)
│   ├── init.js           # Setup ~/.honeydew/ dir + Claude Code Stop hook
│   └── viewer.js         # Render forest, fs.watch for changes, animate new trees
└── test/
    ├── state.test.js     # State read/write/atomic tests
    ├── sprites.test.js   # Sprite dimensions and growth stage tests
    ├── renderer.test.js  # Buffer composition tests
    └── plant.test.js     # Tree placement, growth nudge, ID increment tests
```

---

### Task 1: Project Scaffold & package.json

**Files:**
- Create: `honeydew/package.json`
- Create: `honeydew/bin/honeydew.js`

- [ ] **Step 1: Create the honeydew directory and package.json**

```json
{
  "name": "honeydew",
  "version": "0.1.0",
  "description": "Grow a pixel-art forest in your terminal every time you use Claude Code",
  "type": "module",
  "bin": {
    "honeydew": "./bin/honeydew.js"
  },
  "scripts": {
    "test": "node --test test/*.test.js"
  },
  "dependencies": {
    "chalk": "^5.4.1"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create CLI entry point**

Create `honeydew/bin/honeydew.js`:

```js
#!/usr/bin/env node

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("../src/init.js");
  await init();
} else if (command === "plant") {
  const { plant } = await import("../src/plant.js");
  await plant();
} else if (!command) {
  const { viewer } = await import("../src/viewer.js");
  await viewer();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: honeydew [init]");
  process.exit(1);
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd honeydew && npm install`
Expected: `node_modules/` created, `chalk` installed

- [ ] **Step 4: Verify CLI wiring**

Run: `cd honeydew && node bin/honeydew.js bogus`
Expected: `Unknown command: bogus` + usage text, exit code 1

- [ ] **Step 5: Commit**

```bash
git add honeydew/package.json honeydew/package-lock.json honeydew/bin/honeydew.js
git commit -m "feat(honeydew): scaffold project with CLI entry point"
```

---

### Task 2: State Module — Read/Write forest.json

**Files:**
- Create: `honeydew/src/state.js`
- Create: `honeydew/test/state.test.js`

- [ ] **Step 1: Write failing tests for state module**

Create `honeydew/test/state.test.js`:

```js
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Override home dir for tests
const TEST_DIR = path.join(os.tmpdir(), "honeydew-test-" + Date.now());
const FOREST_PATH = path.join(TEST_DIR, "forest.json");

// We'll set this env var so state.js uses our test path
process.env.HONEYDEW_DIR = TEST_DIR;

const { readForest, writeForest, HONEYDEW_DIR, FOREST_FILE, createEmptyForest } = await import("../src/state.js");

describe("state", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("createEmptyForest returns valid initial state", () => {
    const state = createEmptyForest();
    assert.deepStrictEqual(state.trees, []);
    assert.equal(state.totalPrompts, 0);
    assert.ok(state.createdAt);
  });

  it("writeForest + readForest round-trips", () => {
    const state = createEmptyForest();
    state.trees.push({
      id: 1,
      type: "oak",
      growth: 0.8,
      x: 20,
      plantedAt: new Date().toISOString(),
    });
    state.totalPrompts = 1;
    writeForest(state);
    const loaded = readForest();
    assert.equal(loaded.trees.length, 1);
    assert.equal(loaded.trees[0].type, "oak");
    assert.equal(loaded.totalPrompts, 1);
  });

  it("readForest returns null when file missing", () => {
    const result = readForest();
    assert.equal(result, null);
  });

  it("writeForest uses atomic rename", () => {
    const state = createEmptyForest();
    writeForest(state);
    // File should exist at the expected path
    assert.ok(fs.existsSync(FOREST_PATH));
    // No .tmp file should linger
    const files = fs.readdirSync(TEST_DIR);
    assert.ok(!files.some((f) => f.endsWith(".tmp")));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd honeydew && node --test test/state.test.js`
Expected: FAIL — `../src/state.js` does not exist

- [ ] **Step 3: Implement state.js**

Create `honeydew/src/state.js`:

```js
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const HONEYDEW_DIR = process.env.HONEYDEW_DIR || path.join(os.homedir(), ".honeydew");
export const FOREST_FILE = path.join(HONEYDEW_DIR, "forest.json");

export function createEmptyForest() {
  return {
    trees: [],
    totalPrompts: 0,
    createdAt: new Date().toISOString(),
  };
}

export function readForest() {
  try {
    const data = fs.readFileSync(FOREST_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function writeForest(state) {
  fs.mkdirSync(HONEYDEW_DIR, { recursive: true });
  const tmpFile = FOREST_FILE + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
  fs.renameSync(tmpFile, FOREST_FILE);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd honeydew && node --test test/state.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add honeydew/src/state.js honeydew/test/state.test.js
git commit -m "feat(honeydew): add state module for forest.json read/write"
```

---

### Task 3: Sprites — Pixel Art Tree Definitions

**Files:**
- Create: `honeydew/src/sprites.js`
- Create: `honeydew/test/sprites.test.js`

- [ ] **Step 1: Write failing tests for sprites**

Create `honeydew/test/sprites.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSprite, TREE_TYPES } from "../src/sprites.js";

describe("sprites", () => {
  it("exports all 5 tree types", () => {
    assert.deepStrictEqual(TREE_TYPES, ["oak", "pine", "birch", "willow", "cherry"]);
  });

  it("returns a sprite for each type at each growth stage", () => {
    const growths = [0.1, 0.3, 0.6, 1.0]; // seed, sapling, young, full
    for (const type of TREE_TYPES) {
      for (const growth of growths) {
        const sprite = getSprite(type, growth);
        assert.ok(Array.isArray(sprite.rows), `${type} at ${growth} should have rows`);
        assert.ok(sprite.rows.length > 0, `${type} at ${growth} should have >0 rows`);
        assert.ok(sprite.width > 0, `${type} at ${growth} should have width`);
      }
    }
  });

  it("full trees are wider than seeds", () => {
    for (const type of TREE_TYPES) {
      const seed = getSprite(type, 0.1);
      const full = getSprite(type, 1.0);
      assert.ok(full.width > seed.width, `${type} full (${full.width}) should be wider than seed (${seed.width})`);
    }
  });

  it("sprite rows contain [char, color] pairs", () => {
    const sprite = getSprite("oak", 1.0);
    for (const row of sprite.rows) {
      for (const cell of row) {
        assert.ok(Array.isArray(cell), "each cell should be an array");
        assert.equal(cell.length, 2, "each cell should be [char, color]");
        assert.equal(typeof cell[0], "string", "char should be string");
        assert.ok(typeof cell[1] === "string" || cell[1] === null, "color should be string or null");
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd honeydew && node --test test/sprites.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement sprites.js**

Create `honeydew/src/sprites.js`:

Each sprite is `{ rows: [[[char, color], ...], ...], width: N }`. Rows are bottom-up (row 0 = trunk base, last row = canopy top). Color `null` means transparent (skip when compositing).

```js
export const TREE_TYPES = ["oak", "pine", "birch", "willow", "cherry"];

// Colors
const G1 = "#4a7c3f"; // dark canopy green
const G2 = "#5b9a4a"; // mid canopy green
const G3 = "#6cb95e"; // light canopy green
const G4 = "#3a6a30"; // deep green
const G5 = "#8cd47a"; // highlight green
const T1 = "#8b6914"; // dark trunk brown
const T2 = "#a07828"; // mid trunk brown
const T3 = "#b8923c"; // light trunk brown
const BT = "#cccccc"; // birch trunk (light gray)
const PK = "#d4a0b0"; // cherry pink
const PG = "#8ab87a"; // cherry pink-green mix
const _ = null; // transparent

// Helper: build sprite from string template
// Each char maps to a [block, color] pair
function parse(template, colorMap) {
  const lines = template.split("\n").filter((l) => l.length > 0);
  const width = Math.max(...lines.map((l) => l.length));
  const rows = lines.map((line) => {
    const row = [];
    for (let i = 0; i < width; i++) {
      const ch = line[i] || " ";
      if (ch === " " || !colorMap[ch]) {
        row.push([" ", _]);
      } else {
        row.push(["█", colorMap[ch]]);
      }
    }
    return row;
  });
  // Reverse so row 0 = bottom (trunk base)
  rows.reverse();
  return { rows, width };
}

const OAK = {
  seed: parse(
    ` g \n T `,
    { g: G2, T: T2 }
  ),
  sapling: parse(
    ` gg \nggg\n TT `,
    { g: G2, T: T2 }
  ),
  young: parse(
    `  gg  \n gggg \ngGggGg\n  TT  \n  TT  `,
    { g: G2, G: G1, T: T2 }
  ),
  full: parse(
    `   gg   \n  gGGg  \n gGggGg \ngGggggGg\n   TT   \n   TT   `,
    { g: G2, G: G1, T: T2 }
  ),
};

const PINE = {
  seed: parse(
    ` g \n T `,
    { g: G4, T: T1 }
  ),
  sapling: parse(
    `  g \n gg \nggg\n T  `,
    { g: G4, T: T1 }
  ),
  young: parse(
    `  g  \n ggg \n ggg \nGgggG\n  T  \n  T  `,
    { g: G4, G: G1, T: T1 }
  ),
  full: parse(
    `   g  \n  ggg \n  ggg \n Ggggg\n GgggG\nGgggGg\n   T  \n   T  `,
    { g: G4, G: G1, T: T1 }
  ),
};

const BIRCH = {
  seed: parse(
    ` g \n B `,
    { g: G3, B: BT }
  ),
  sapling: parse(
    ` gg \nggg\n B  `,
    { g: G3, B: BT }
  ),
  young: parse(
    `  gg  \n hggh \nhgggh\n  BB  \n  BB  `,
    { g: G3, h: G5, B: BT }
  ),
  full: parse(
    `  hgg  \n hgggh \nhghhgh\nhggggh\n  BB   \n  BB   `,
    { g: G3, h: G5, B: BT }
  ),
};

const WILLOW = {
  seed: parse(
    ` g \n T `,
    { g: G3, T: T2 }
  ),
  sapling: parse(
    ` ggg \n ggg \ngg gg\n  T  `,
    { g: G3, T: T2 }
  ),
  young: parse(
    `  gggg  \n gggggg \ngg gg gg\ngg    gg\n   TT   \n   TT   `,
    { g: G3, T: T2 }
  ),
  full: parse(
    `   ggggg  \n  ggggggg \n gg ggg gg\ngg  ggg  gg\ngg       gg\n    TT     \n    TT     `,
    { g: G3, T: T2 }
  ),
};

const CHERRY = {
  seed: parse(
    ` p \n T `,
    { p: PK, T: T3 }
  ),
  sapling: parse(
    ` pp \nppp\n T  `,
    { p: PK, T: T3 }
  ),
  young: parse(
    `  pp  \n pPPp \npPppPp\n  TT  \n  TT  `,
    { p: PG, P: PK, T: T3 }
  ),
  full: parse(
    `  pPPp  \n pPppPp \npPpppPp\npPppPPp\n   TT   \n   TT   `,
    { p: PG, P: PK, T: T3 }
  ),
};

const SPRITES = { oak: OAK, pine: PINE, birch: BIRCH, willow: WILLOW, cherry: CHERRY };

function growthStage(growth) {
  if (growth < 0.2) return "seed";
  if (growth < 0.5) return "sapling";
  if (growth < 0.8) return "young";
  return "full";
}

export function getSprite(type, growth) {
  const stage = growthStage(growth);
  return SPRITES[type][stage];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd honeydew && node --test test/sprites.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add honeydew/src/sprites.js honeydew/test/sprites.test.js
git commit -m "feat(honeydew): add pixel art tree sprites (5 types × 4 stages)"
```

---

### Task 4: Renderer — Frame Buffer & Composition

**Files:**
- Create: `honeydew/src/renderer.js`
- Create: `honeydew/test/renderer.test.js`

- [ ] **Step 1: Write failing tests for renderer**

Create `honeydew/test/renderer.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderFrame, SCENE_HEIGHT } from "../src/renderer.js";

describe("renderer", () => {
  it("renderFrame returns a string", () => {
    const forest = { trees: [], totalPrompts: 0, createdAt: new Date().toISOString() };
    const output = renderFrame(forest, 80);
    assert.equal(typeof output, "string");
  });

  it("output has correct number of lines for empty forest", () => {
    const forest = { trees: [], totalPrompts: 0, createdAt: new Date().toISOString() };
    const output = renderFrame(forest, 80);
    const lines = output.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, SCENE_HEIGHT);
  });

  it("ground rows contain block characters", () => {
    const forest = { trees: [], totalPrompts: 0, createdAt: new Date().toISOString() };
    const output = renderFrame(forest, 40);
    // Ground rows should have █ characters
    assert.ok(output.includes("█"), "output should contain block chars for ground");
  });

  it("stats bar includes tree count", () => {
    const forest = {
      trees: [
        { id: 1, type: "oak", growth: 1.0, x: 10, plantedAt: "2026-04-12T00:00:00Z" },
        { id: 2, type: "pine", growth: 0.5, x: 30, plantedAt: "2026-04-12T00:00:00Z" },
      ],
      totalPrompts: 5,
      createdAt: "2026-04-10T00:00:00Z",
    };
    const output = renderFrame(forest, 80);
    assert.ok(output.includes("2 trees"), "stats bar should show tree count");
  });

  it("renders trees at their x positions", () => {
    const forest = {
      trees: [{ id: 1, type: "oak", growth: 1.0, x: 10, plantedAt: "2026-04-12T00:00:00Z" }],
      totalPrompts: 1,
      createdAt: "2026-04-12T00:00:00Z",
    };
    // Output should differ from empty forest
    const withTree = renderFrame(forest, 80);
    const empty = renderFrame({ trees: [], totalPrompts: 0, createdAt: forest.createdAt }, 80);
    assert.notEqual(withTree, empty);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd honeydew && node --test test/renderer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement renderer.js**

Create `honeydew/src/renderer.js`:

```js
import chalk from "chalk";
import { getSprite, TREE_TYPES } from "./sprites.js";

// Layout: 4 sky + 7 tree area + 2 ground + 1 blank + 1 stats = 15
const SKY_ROWS = 4;
const TREE_AREA_ROWS = 7;
const GROUND_ROWS = 2;
const BLANK_ROW = 1;
const STATS_ROW = 1;
export const SCENE_HEIGHT = SKY_ROWS + TREE_AREA_ROWS + GROUND_ROWS + BLANK_ROW + STATS_ROW;

const GROUND_COLORS = ["#225533", "#1a4422"];
const STAR_CHARS = ["·", "✦", "·", "·"]; // weighted toward dim dots
const STAR_COLOR = "#444444";

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

function getNextMilestone(treeCount) {
  for (const m of MILESTONES) {
    if (treeCount < m) return m;
  }
  return treeCount + 100;
}

function getNextTreeType(treeCount) {
  // Deterministic from count so it's stable
  return TREE_TYPES[treeCount % TREE_TYPES.length];
}

function daysSince(isoDate) {
  const then = new Date(isoDate);
  const now = new Date();
  return Math.max(1, Math.ceil((now - then) / (1000 * 60 * 60 * 24)));
}

// Seed star positions deterministically from terminal width
function generateStars(width) {
  const stars = [];
  // Use a simple hash to place stars
  for (let i = 0; i < width; i++) {
    const hash = (i * 7 + 13) % 37;
    if (hash < 3) {
      const row = hash % SKY_ROWS;
      stars.push({ x: i, row, char: STAR_CHARS[hash] });
    }
  }
  return stars;
}

export function renderFrame(forest, termWidth) {
  const width = termWidth || 80;
  const totalRows = SCENE_HEIGHT;

  // Build buffer: [row][col] = { char, color }
  const buffer = [];
  for (let r = 0; r < totalRows; r++) {
    const row = [];
    for (let c = 0; c < width; c++) {
      row.push({ char: " ", color: null });
    }
    buffer.push(row);
  }

  // Sky: stars
  const stars = generateStars(width);
  for (const star of stars) {
    if (star.row < SKY_ROWS && star.x < width) {
      buffer[star.row][star.x] = { char: star.char, color: STAR_COLOR };
    }
  }

  // Ground: 2 rows of blocks
  const groundStart = SKY_ROWS + TREE_AREA_ROWS;
  for (let r = 0; r < GROUND_ROWS; r++) {
    const color = GROUND_COLORS[r];
    for (let c = 0; c < width; c++) {
      buffer[groundStart + r][c] = { char: "█", color };
    }
  }

  // Trees: composite sprites onto tree area, aligned to bottom (just above ground)
  for (const tree of forest.trees) {
    const sprite = getSprite(tree.type, tree.growth);
    const treeBottom = groundStart - 1; // row just above ground

    for (let sr = 0; sr < sprite.rows.length; sr++) {
      const bufRow = treeBottom - sr;
      if (bufRow < 0 || bufRow >= totalRows) continue;

      const spriteRow = sprite.rows[sr];
      const offsetX = tree.x - Math.floor(sprite.width / 2); // center sprite on x

      for (let sc = 0; sc < spriteRow.length; sc++) {
        const bufCol = offsetX + sc;
        if (bufCol < 0 || bufCol >= width) continue;

        const [ch, color] = spriteRow[sc];
        if (color !== null) {
          buffer[bufRow][bufCol] = { char: ch, color };
        }
      }
    }
  }

  // Render buffer to ANSI string
  const lines = [];
  for (let r = 0; r < totalRows - BLANK_ROW - STATS_ROW; r++) {
    let line = "";
    for (let c = 0; c < width; c++) {
      const cell = buffer[r][c];
      if (cell.color) {
        line += chalk.hex(cell.color)(cell.char);
      } else {
        line += cell.char;
      }
    }
    lines.push(line);
  }

  // Blank row
  lines.push("");

  // Stats bar
  const treeCount = forest.trees.length;
  const days = daysSince(forest.createdAt);
  const milestone = getNextMilestone(treeCount);
  const progress = Math.min(treeCount / milestone, 1);
  const barWidth = 12;
  const filled = Math.round(progress * barWidth);
  const barFull = chalk.hex("#5b9a4a")("█".repeat(filled));
  const barEmpty = chalk.hex("#333333")("░".repeat(barWidth - filled));
  const nextType = getNextTreeType(treeCount);

  const stats =
    chalk.hex("#f5a50b")(" honeydew") +
    chalk.hex("#888888")(` · ${treeCount} tree${treeCount !== 1 ? "s" : ""} · ${days} day${days !== 1 ? "s" : ""} · `) +
    barFull + barEmpty +
    chalk.hex("#888888")(` next: ${nextType}`);
  lines.push(stats);

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd honeydew && node --test test/renderer.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add honeydew/src/renderer.js honeydew/test/renderer.test.js
git commit -m "feat(honeydew): add ANSI renderer with sky, ground, trees, stats bar"
```

---

### Task 5: Plant — Add Tree to Forest

**Files:**
- Create: `honeydew/src/plant.js`
- Create: `honeydew/test/plant.test.js`

- [ ] **Step 1: Write failing tests for plant**

Create `honeydew/test/plant.test.js`:

```js
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TEST_DIR = path.join(os.tmpdir(), "honeydew-plant-test-" + Date.now());
process.env.HONEYDEW_DIR = TEST_DIR;

// Must import after setting env
const { plant } = await import("../src/plant.js");
const { readForest, writeForest, createEmptyForest } = await import("../src/state.js");

describe("plant", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    writeForest(createEmptyForest());
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("adds a tree to an empty forest", async () => {
    await plant();
    const forest = readForest();
    assert.equal(forest.trees.length, 1);
    assert.equal(forest.totalPrompts, 1);
  });

  it("new tree has required fields", async () => {
    await plant();
    const tree = readForest().trees[0];
    assert.ok(["oak", "pine", "birch", "willow", "cherry"].includes(tree.type));
    assert.ok(tree.growth >= 0.3 && tree.growth <= 1.0);
    assert.ok(typeof tree.x === "number");
    assert.ok(tree.x >= 0);
    assert.equal(tree.id, 1);
    assert.ok(tree.plantedAt);
  });

  it("increments tree IDs", async () => {
    await plant();
    await plant();
    await plant();
    const forest = readForest();
    assert.equal(forest.trees.length, 3);
    assert.deepStrictEqual(
      forest.trees.map((t) => t.id),
      [1, 2, 3]
    );
  });

  it("nudges partial trees toward full growth", async () => {
    const forest = createEmptyForest();
    forest.trees.push({
      id: 1,
      type: "oak",
      growth: 0.4,
      x: 20,
      plantedAt: new Date().toISOString(),
    });
    writeForest(forest);

    await plant();

    const updated = readForest();
    const oldTree = updated.trees.find((t) => t.id === 1);
    assert.ok(oldTree.growth > 0.4, `growth should increase from 0.4, got ${oldTree.growth}`);
    assert.ok(oldTree.growth <= 1.0, "growth should not exceed 1.0");
  });

  it("does not grow trees already at 1.0", async () => {
    const forest = createEmptyForest();
    forest.trees.push({
      id: 1,
      type: "pine",
      growth: 1.0,
      x: 15,
      plantedAt: new Date().toISOString(),
    });
    writeForest(forest);

    await plant();

    const updated = readForest();
    const tree = updated.trees.find((t) => t.id === 1);
    assert.equal(tree.growth, 1.0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd honeydew && node --test test/plant.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement plant.js**

Create `honeydew/src/plant.js`:

```js
import { readForest, writeForest, createEmptyForest } from "./state.js";
import { TREE_TYPES, getSprite } from "./sprites.js";

const DEFAULT_WIDTH = 80;
const MIN_GAP = 2;

function randomType() {
  return TREE_TYPES[Math.floor(Math.random() * TREE_TYPES.length)];
}

function randomGrowth() {
  // Range 0.3 to 1.0
  return 0.3 + Math.random() * 0.7;
}

function findOpenX(trees, newType, newGrowth) {
  const sprite = getSprite(newType, newGrowth);
  const halfWidth = Math.floor(sprite.width / 2);

  // Collect occupied ranges [left, right] for each existing tree
  const occupied = trees.map((t) => {
    const s = getSprite(t.type, t.growth);
    const half = Math.floor(s.width / 2);
    return [t.x - half - MIN_GAP, t.x + half + MIN_GAP];
  });

  // Try random positions, pick first open one
  const margin = halfWidth + 2;
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = margin + Math.floor(Math.random() * (DEFAULT_WIDTH - margin * 2));
    const left = x - halfWidth;
    const right = x + halfWidth;
    const collision = occupied.some(([ol, or_]) => left < or_ && right > ol);
    if (!collision) return x;
  }

  // Fallback: place at a random spot anyway (forest is dense)
  return Math.floor(Math.random() * (DEFAULT_WIDTH - margin * 2)) + margin;
}

export async function plant() {
  let forest = readForest();
  if (!forest) {
    forest = createEmptyForest();
  }

  // Nudge partial trees
  for (const tree of forest.trees) {
    if (tree.growth < 1.0) {
      tree.growth = Math.min(1.0, tree.growth + 0.1 + Math.random() * 0.1);
      // Round to avoid float drift
      tree.growth = Math.round(tree.growth * 100) / 100;
    }
  }

  // Add new tree
  const type = randomType();
  const growth = randomGrowth();
  const maxId = forest.trees.reduce((max, t) => Math.max(max, t.id), 0);

  forest.trees.push({
    id: maxId + 1,
    type,
    growth: Math.round(growth * 100) / 100,
    x: findOpenX(forest.trees, type, growth),
    plantedAt: new Date().toISOString(),
  });

  forest.totalPrompts++;
  writeForest(forest);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd honeydew && node --test test/plant.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add honeydew/src/plant.js honeydew/test/plant.test.js
git commit -m "feat(honeydew): add plant command — adds tree with random type/growth/position"
```

---

### Task 6: Init — Setup Hook & State File

**Files:**
- Create: `honeydew/src/init.js`

- [ ] **Step 1: Implement init.js**

Create `honeydew/src/init.js`:

```js
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { HONEYDEW_DIR, FOREST_FILE, readForest, writeForest, createEmptyForest } from "./state.js";

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");

const HONEYDEW_HOOK = {
  matcher: "",
  hooks: [
    {
      type: "command",
      command: "honeydew plant",
    },
  ],
};

export async function init() {
  // 1. Create honeydew directory + forest.json
  fs.mkdirSync(HONEYDEW_DIR, { recursive: true });

  if (!readForest()) {
    writeForest(createEmptyForest());
    console.log("Created ~/.honeydew/forest.json");
  } else {
    console.log("~/.honeydew/forest.json already exists");
  }

  // 2. Add Claude Code hook
  const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH);
  fs.mkdirSync(claudeDir, { recursive: true });

  let settings = {};
  try {
    const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf-8");
    settings = JSON.parse(raw);
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.Stop) {
    settings.hooks.Stop = [];
  }

  // Check if honeydew hook already exists
  const alreadyExists = settings.hooks.Stop.some((entry) =>
    entry.hooks?.some((h) => h.command === "honeydew plant")
  );

  if (alreadyExists) {
    console.log("Claude Code hook already configured");
  } else {
    settings.hooks.Stop.push(HONEYDEW_HOOK);
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log("Added honeydew hook to ~/.claude/settings.json");
  }

  // 3. Instructions
  console.log("");
  console.log("Setup complete! Open a new terminal and run:");
  console.log("");
  console.log("  honeydew");
  console.log("");
  console.log("Then use Claude Code normally — your forest will grow with each prompt.");
}
```

- [ ] **Step 2: Test init manually**

Run: `cd honeydew && HONEYDEW_DIR=/tmp/honeydew-test node bin/honeydew.js init`
Expected: Creates `/tmp/honeydew-test/forest.json`, prints setup instructions. (Do NOT run without HONEYDEW_DIR override or it will modify your real `~/.claude/settings.json`.)

- [ ] **Step 3: Verify idempotence**

Run: `cd honeydew && HONEYDEW_DIR=/tmp/honeydew-test node bin/honeydew.js init`
Expected: "already exists" and "already configured" messages

- [ ] **Step 4: Clean up test artifacts**

Run: `rm -rf /tmp/honeydew-test`

- [ ] **Step 5: Commit**

```bash
git add honeydew/src/init.js
git commit -m "feat(honeydew): add init command — creates state file + Claude Code hook"
```

---

### Task 7: Viewer — Watch & Render Loop

**Files:**
- Create: `honeydew/src/viewer.js`

- [ ] **Step 1: Implement viewer.js**

Create `honeydew/src/viewer.js`:

```js
import fs from "node:fs";
import { readForest, FOREST_FILE, HONEYDEW_DIR } from "./state.js";
import { renderFrame, SCENE_HEIGHT } from "./renderer.js";

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function cursorHome() {
  process.stdout.write("\x1b[H");
}

function hideCursor() {
  process.stdout.write("\x1b[?25l");
}

function showCursor() {
  process.stdout.write("\x1b[?25h");
}

function render(forest) {
  const width = process.stdout.columns || 80;
  const frame = renderFrame(forest, width);
  cursorHome();
  process.stdout.write(frame);
}

async function animateNewTree(forest, newTreeId) {
  const tree = forest.trees.find((t) => t.id === newTreeId);
  if (!tree) return;

  const originalGrowth = tree.growth;
  const steps = [0.1, 0.3, 0.6, originalGrowth];

  for (const step of steps) {
    tree.growth = Math.min(step, originalGrowth);
    render(forest);
    await new Promise((r) => setTimeout(r, 120));
  }

  tree.growth = originalGrowth;
  render(forest);
}

export async function viewer() {
  // Check forest exists
  if (!fs.existsSync(HONEYDEW_DIR)) {
    console.error('No forest found. Run "honeydew init" first.');
    process.exit(1);
  }

  let forest = readForest();
  if (!forest) {
    console.error('No forest found. Run "honeydew init" first.');
    process.exit(1);
  }

  // Setup terminal
  hideCursor();
  clearScreen();

  // Initial render
  let lastTreeCount = forest.trees.length;
  let lastMaxId = forest.trees.reduce((max, t) => Math.max(max, t.id), 0);
  render(forest);

  // Clean exit
  function cleanup() {
    showCursor();
    clearScreen();
    console.log(`🌳 ${forest.trees.length} trees planted across ${forest.totalPrompts} prompts`);
    process.exit(0);
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Re-render on terminal resize
  process.stdout.on("resize", () => {
    clearScreen();
    render(forest);
  });

  // Watch for file changes
  let debounceTimer = null;
  fs.watch(FOREST_FILE, { persistent: true }, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const updated = readForest();
      if (!updated) return;

      const newMaxId = updated.trees.reduce((max, t) => Math.max(max, t.id), 0);
      const hasNewTree = newMaxId > lastMaxId;

      forest = updated;

      if (hasNewTree) {
        await animateNewTree(forest, newMaxId);
      } else {
        render(forest);
      }

      lastTreeCount = forest.trees.length;
      lastMaxId = newMaxId;
    }, 100);
  });
}
```

- [ ] **Step 2: Test viewer manually with simulated trees**

In one terminal:
```bash
cd honeydew
HONEYDEW_DIR=/tmp/honeydew-viewer-test node -e "
  const {writeForest,createEmptyForest} = await import('./src/state.js');
  writeForest(createEmptyForest());
"
HONEYDEW_DIR=/tmp/honeydew-viewer-test node bin/honeydew.js
```

In another terminal, plant a tree:
```bash
HONEYDEW_DIR=/tmp/honeydew-viewer-test node -e "
  const {plant} = await import('./src/plant.js');
  await plant();
"
```

Expected: Viewer shows an empty forest initially, then animates a tree appearing when you plant one.

- [ ] **Step 3: Plant a few more trees to see the forest grow**

Run in the second terminal (repeat a few times):
```bash
HONEYDEW_DIR=/tmp/honeydew-viewer-test node -e "const {plant} = await import('./src/plant.js'); await plant();"
```

Expected: Each run adds a tree with an animation in the viewer.

- [ ] **Step 4: Verify Ctrl+C cleanup**

Press Ctrl+C in the viewer terminal.
Expected: Screen clears, cursor reappears, shows summary line like "🌳 4 trees planted across 4 prompts"

- [ ] **Step 5: Clean up and commit**

```bash
rm -rf /tmp/honeydew-viewer-test
git add honeydew/src/viewer.js
git commit -m "feat(honeydew): add viewer — watches forest.json, animates new trees"
```

---

### Task 8: End-to-End Test & Polish

**Files:**
- Modify: `honeydew/src/renderer.js` (if needed for visual tweaks)
- Modify: `honeydew/src/sprites.js` (if needed for visual tweaks)

- [ ] **Step 1: Run all tests**

Run: `cd honeydew && node --test test/*.test.js`
Expected: All tests pass

- [ ] **Step 2: Test the full init → plant → view flow**

```bash
cd honeydew
# Init with test dir
HONEYDEW_DIR=/tmp/honeydew-e2e node bin/honeydew.js init

# Plant 10 trees
for i in $(seq 1 10); do
  HONEYDEW_DIR=/tmp/honeydew-e2e node bin/honeydew.js plant
done

# Check state
cat /tmp/honeydew-e2e/forest.json | node -e "
  let d='';process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const f=JSON.parse(d);
    console.log(f.trees.length+' trees, '+f.totalPrompts+' prompts');
  });
"
```

Expected: "10 trees, 10 prompts"

- [ ] **Step 3: View the forest**

```bash
HONEYDEW_DIR=/tmp/honeydew-e2e node bin/honeydew.js
```

Expected: A panoramic forest with 10 trees, stars, ground, and stats bar. Ctrl+C to exit.

- [ ] **Step 4: Test with npm link**

```bash
cd honeydew && npm link
honeydew init  # This will modify real ~/.claude/settings.json — only if you want to test for real
```

Or safer:
```bash
HONEYDEW_DIR=/tmp/honeydew-link-test honeydew init
HONEYDEW_DIR=/tmp/honeydew-link-test honeydew plant
HONEYDEW_DIR=/tmp/honeydew-link-test honeydew
```

Expected: CLI works when installed globally via npm link.

- [ ] **Step 5: Clean up and commit**

```bash
rm -rf /tmp/honeydew-e2e /tmp/honeydew-link-test
npm unlink -g honeydew 2>/dev/null
git add -A honeydew/
git commit -m "feat(honeydew): complete terminal forest — init, plant, view"
```

---

## Summary

| Task | What it builds | Files |
|------|---------------|-------|
| 1 | Project scaffold + CLI routing | `package.json`, `bin/honeydew.js` |
| 2 | State read/write with atomic file ops | `src/state.js`, `test/state.test.js` |
| 3 | Pixel art tree sprites (5 types × 4 stages) | `src/sprites.js`, `test/sprites.test.js` |
| 4 | ANSI frame buffer renderer | `src/renderer.js`, `test/renderer.test.js` |
| 5 | Plant command (tree placement + growth) | `src/plant.js`, `test/plant.test.js` |
| 6 | Init command (state file + Claude Code hook) | `src/init.js` |
| 7 | Viewer (watch + render + animate) | `src/viewer.js` |
| 8 | E2E test + polish | All files |
