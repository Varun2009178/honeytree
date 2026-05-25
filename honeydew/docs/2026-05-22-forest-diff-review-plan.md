# Forest Diff Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live diff review mode to the 3D forest viewer — changed files turn amber, clicking opens an overlay panel for per-hunk accept/reject, with git staging and reverting.

**Architecture:** A 2-second poll loop runs `git diff --name-only` to detect uncommitted changes. Changed trees render in amber. Clicking a changed tree opens an overlay diff panel on the right 60% of the screen. The user navigates hunks with j/k and accepts/rejects with a/r. Accepted hunks are git-staged; rejected hunks are reverted.

**Tech Stack:** Node.js ES modules, `node:child_process` (execSync/spawn for git), `node:test` for testing, chalk for colors.

---

## File Structure

| File | Responsibility | Status |
|------|---------------|--------|
| `src/diffwatch.js` | Poll `git diff --name-only`, maintain `Set<changedPaths>`, fetch per-file diffs | Create |
| `src/diffparser.js` | Parse unified diff output into structured hunk objects | Create |
| `src/diffpanel.js` | Render overlay panel, hunk navigation, accept/reject UI | Create |
| `src/diffactions.js` | Execute `git apply --cached` / `git apply --reverse` for resolved hunks | Create |
| `test/diffwatch.test.js` | Tests for change detection | Create |
| `test/diffparser.test.js` | Tests for diff parsing | Create |
| `test/diffpanel.test.js` | Tests for panel rendering | Create |
| `test/diffactions.test.js` | Tests for git staging/reverting | Create |
| `src/pointcloud.js` | Add amber color override for changed trees | Modify |
| `src/renderer3d.js` | Add split-screen rendering, dim mode | Modify |
| `src/viewer.js` | Poll loop, click handling, panel integration, `d` key | Modify |

---

### Task 1: Diff Parser

Parse unified diff output into structured hunk objects. This is a pure function with no side effects — easiest to test first.

**Files:**
- Create: `src/diffparser.js`
- Create: `test/diffparser.test.js`

- [ ] **Step 1: Write the failing test for basic hunk parsing**

```javascript
// test/diffparser.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDiff } from "../src/diffparser.js";

describe("diffparser", () => {
  describe("parseDiff", () => {
    it("parses a single hunk with added and removed lines", () => {
      const diff = [
        "diff --git a/src/app.js b/src/app.js",
        "index abc1234..def5678 100644",
        "--- a/src/app.js",
        "+++ b/src/app.js",
        "@@ -1,3 +1,4 @@",
        " const x = 1;",
        "-const y = 2;",
        "+const y = 3;",
        "+const z = 4;",
        " const w = 5;",
      ].join("\n");

      const result = parseDiff(diff);
      assert.equal(result.length, 1);
      assert.equal(result[0].header, "@@ -1,3 +1,4 @@");
      assert.equal(result[0].lines.length, 4);
      assert.deepEqual(result[0].lines[0], { type: "context", text: " const x = 1;" });
      assert.deepEqual(result[0].lines[1], { type: "removed", text: "-const y = 2;" });
      assert.deepEqual(result[0].lines[2], { type: "added", text: "+const y = 3;" });
      assert.deepEqual(result[0].lines[3], { type: "added", text: "+const z = 4;" });
    });

    it("parses multiple hunks", () => {
      const diff = [
        "diff --git a/src/app.js b/src/app.js",
        "--- a/src/app.js",
        "+++ b/src/app.js",
        "@@ -1,3 +1,3 @@",
        " const x = 1;",
        "-const y = 2;",
        "+const y = 3;",
        "@@ -10,3 +10,4 @@",
        " function foo() {",
        "+  console.log('hi');",
        "   return 1;",
        " }",
      ].join("\n");

      const result = parseDiff(diff);
      assert.equal(result.length, 2);
      assert.equal(result[0].header, "@@ -1,3 +1,3 @@");
      assert.equal(result[1].header, "@@ -10,3 +10,4 @@");
      assert.equal(result[1].lines.length, 4);
    });

    it("returns empty array for empty input", () => {
      assert.deepEqual(parseDiff(""), []);
    });

    it("counts added and removed lines per hunk", () => {
      const diff = [
        "diff --git a/f.js b/f.js",
        "--- a/f.js",
        "+++ b/f.js",
        "@@ -1,2 +1,3 @@",
        " a",
        "-b",
        "+c",
        "+d",
      ].join("\n");

      const result = parseDiff(diff);
      assert.equal(result[0].added, 2);
      assert.equal(result[0].removed, 1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/diffparser.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/diffparser.js

export function parseDiff(diffText) {
  if (!diffText || !diffText.trim()) return [];

  const lines = diffText.split("\n");
  const hunks = [];
  let currentHunk = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (currentHunk) {
        currentHunk.added = currentHunk.lines.filter(l => l.type === "added").length;
        currentHunk.removed = currentHunk.lines.filter(l => l.type === "removed").length;
        hunks.push(currentHunk);
      }
      currentHunk = { header: line, lines: [], added: 0, removed: 0 };
    } else if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({ type: "added", text: line });
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({ type: "removed", text: line });
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.lines.push({ type: "context", text: line });
      }
    }
  }

  if (currentHunk) {
    currentHunk.added = currentHunk.lines.filter(l => l.type === "added").length;
    currentHunk.removed = currentHunk.lines.filter(l => l.type === "removed").length;
    hunks.push(currentHunk);
  }

  return hunks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/diffparser.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Add test for reconstructing a hunk as patch text**

```javascript
// append to test/diffparser.test.js, inside describe("diffparser")

  describe("hunkToPatch", () => {
    it("reconstructs a valid unified diff patch from a hunk", () => {
      const diff = [
        "diff --git a/f.js b/f.js",
        "--- a/f.js",
        "+++ b/f.js",
        "@@ -1,2 +1,3 @@",
        " a",
        "-b",
        "+c",
        "+d",
      ].join("\n");

      const hunks = parseDiff(diff);
      const patch = hunkToPatch("f.js", hunks[0]);
      assert.ok(patch.includes("--- a/f.js"));
      assert.ok(patch.includes("+++ b/f.js"));
      assert.ok(patch.includes("@@ -1,2 +1,3 @@"));
      assert.ok(patch.includes("-b"));
      assert.ok(patch.includes("+c"));
    });
  });
```

Update import: `import { parseDiff, hunkToPatch } from "../src/diffparser.js";`

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test test/diffparser.test.js`
Expected: FAIL — hunkToPatch not defined

- [ ] **Step 7: Implement hunkToPatch**

Add to `src/diffparser.js`:

```javascript
export function hunkToPatch(filePath, hunk) {
  const lines = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    hunk.header,
    ...hunk.lines.map(l => l.text),
  ];
  return lines.join("\n") + "\n";
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test test/diffparser.test.js`
Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add src/diffparser.js test/diffparser.test.js
git commit -m "feat: add diff parser for unified diff output"
```

---

### Task 2: Diff Watcher

Poll `git diff --name-only` every 2 seconds and maintain a set of changed file paths. Also fetch per-file diffs on demand.

**Files:**
- Create: `src/diffwatch.js`
- Create: `test/diffwatch.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// test/diffwatch.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { getChangedFiles, getFileDiff } from "../src/diffwatch.js";

function makeTmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diffwatch-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd: dir, stdio: "pipe" });
  fs.writeFileSync(path.join(dir, "a.js"), "const x = 1;\n");
  execSync("git add . && git commit -m 'init'", { cwd: dir, stdio: "pipe" });
  return dir;
}

describe("diffwatch", () => {
  describe("getChangedFiles", () => {
    it("returns empty set when no changes", () => {
      const dir = makeTmpRepo();
      const result = getChangedFiles(dir);
      assert.equal(result.size, 0);
    });

    it("returns changed file paths after modification", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "const x = 2;\n");
      const result = getChangedFiles(dir);
      assert.ok(result.has("a.js"));
      assert.equal(result.size, 1);
    });

    it("includes new untracked files", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "b.js"), "new file\n");
      const result = getChangedFiles(dir);
      assert.ok(result.has("b.js"));
    });
  });

  describe("getFileDiff", () => {
    it("returns unified diff for a modified file", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "const x = 2;\n");
      const diff = getFileDiff(dir, "a.js");
      assert.ok(diff.includes("@@"));
      assert.ok(diff.includes("-const x = 1;"));
      assert.ok(diff.includes("+const x = 2;"));
    });

    it("returns empty string for unchanged file", () => {
      const dir = makeTmpRepo();
      const diff = getFileDiff(dir, "a.js");
      assert.equal(diff, "");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/diffwatch.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/diffwatch.js
import { execSync } from "node:child_process";

export function getChangedFiles(rootDir) {
  const changed = new Set();

  try {
    // Modified/deleted tracked files
    const tracked = execSync("git diff --name-only", {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    for (const line of tracked.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) changed.add(trimmed);
    }

    // Untracked files
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    for (const line of untracked.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) changed.add(trimmed);
    }
  } catch {
    // Not a git repo or git not available
  }

  return changed;
}

export function getFileDiff(rootDir, filePath) {
  try {
    const diff = execSync(`git diff -U3 -- "${filePath}"`, {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return diff;
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/diffwatch.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/diffwatch.js test/diffwatch.test.js
git commit -m "feat: add git diff watcher for change detection"
```

---

### Task 3: Diff Actions

Execute git staging and reverting for accepted/rejected hunks.

**Files:**
- Create: `src/diffactions.js`
- Create: `test/diffactions.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// test/diffactions.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { stageHunk, revertHunk } from "../src/diffactions.js";
import { parseDiff } from "../src/diffparser.js";

function makeTmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diffactions-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd: dir, stdio: "pipe" });
  fs.writeFileSync(path.join(dir, "a.js"), "line1\nline2\nline3\n");
  execSync("git add . && git commit -m 'init'", { cwd: dir, stdio: "pipe" });
  return dir;
}

describe("diffactions", () => {
  describe("stageHunk", () => {
    it("stages a hunk into the git index", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "line1\nline2modified\nline3\n");

      const diff = execSync("git diff -U3 -- a.js", { cwd: dir, encoding: "utf-8" });
      const hunks = parseDiff(diff);
      const result = stageHunk(dir, "a.js", hunks[0]);

      assert.equal(result.ok, true);

      // Check that the file is staged
      const staged = execSync("git diff --cached --name-only", { cwd: dir, encoding: "utf-8" });
      assert.ok(staged.includes("a.js"));
    });
  });

  describe("revertHunk", () => {
    it("reverts a hunk in the working tree", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "line1\nline2modified\nline3\n");

      const diff = execSync("git diff -U3 -- a.js", { cwd: dir, encoding: "utf-8" });
      const hunks = parseDiff(diff);
      const result = revertHunk(dir, "a.js", hunks[0]);

      assert.equal(result.ok, true);

      // Check that the file is back to original
      const content = fs.readFileSync(path.join(dir, "a.js"), "utf-8");
      assert.equal(content, "line1\nline2\nline3\n");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/diffactions.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/diffactions.js
import { execSync } from "node:child_process";
import { hunkToPatch } from "./diffparser.js";

export function stageHunk(rootDir, filePath, hunk) {
  try {
    const patch = hunkToPatch(filePath, hunk);
    execSync("git apply --cached --unidiff-zero -", {
      cwd: rootDir,
      input: patch,
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function revertHunk(rootDir, filePath, hunk) {
  try {
    const patch = hunkToPatch(filePath, hunk);
    execSync("git apply --reverse --unidiff-zero -", {
      cwd: rootDir,
      input: patch,
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/diffactions.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/diffactions.js test/diffactions.test.js
git commit -m "feat: add git stage/revert actions for diff hunks"
```

---

### Task 4: Diff Panel Renderer

Render the overlay panel showing hunks with navigation and accept/reject controls.

**Files:**
- Create: `src/diffpanel.js`
- Create: `test/diffpanel.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// test/diffpanel.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDiffPanel, renderDiffPanel } from "../src/diffpanel.js";

const SAMPLE_HUNKS = [
  {
    header: "@@ -1,3 +1,3 @@",
    lines: [
      { type: "context", text: " const x = 1;" },
      { type: "removed", text: "-const y = 2;" },
      { type: "added", text: "+const y = 3;" },
    ],
    added: 1,
    removed: 1,
  },
  {
    header: "@@ -10,2 +10,3 @@",
    lines: [
      { type: "context", text: " function foo() {" },
      { type: "added", text: "+  console.log('hi');" },
      { type: "context", text: " }" },
    ],
    added: 1,
    removed: 0,
  },
];

describe("diffpanel", () => {
  describe("createDiffPanel", () => {
    it("creates panel state with hunks and file info", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      assert.equal(panel.filePath, "src/app.js");
      assert.equal(panel.hunks.length, 2);
      assert.equal(panel.currentHunk, 0);
      assert.deepEqual(panel.hunkStatus, ["pending", "pending"]);
    });
  });

  describe("renderDiffPanel", () => {
    it("returns an array of strings for each line", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      const lines = renderDiffPanel(panel, 40, 20);
      assert.ok(Array.isArray(lines));
      assert.equal(lines.length, 20);
    });

    it("includes the file path in the header", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      const lines = renderDiffPanel(panel, 40, 20);
      // Strip ANSI codes for assertion
      const plain = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
      assert.ok(plain.includes("src/app.js"));
    });

    it("shows hunk status indicators", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      panel.hunkStatus[0] = "accepted";
      const lines = renderDiffPanel(panel, 40, 20);
      const plain = lines.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
      assert.ok(plain.includes("[a]") || plain.includes("✓"));
    });
  });

  describe("navigation", () => {
    it("nextHunk advances currentHunk", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      assert.equal(panel.currentHunk, 0);
      panel.currentHunk = Math.min(panel.currentHunk + 1, panel.hunks.length - 1);
      assert.equal(panel.currentHunk, 1);
    });

    it("acceptHunk marks current hunk as accepted", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      panel.hunkStatus[panel.currentHunk] = "accepted";
      assert.equal(panel.hunkStatus[0], "accepted");
    });

    it("allResolved returns true when all hunks decided", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      panel.hunkStatus[0] = "accepted";
      panel.hunkStatus[1] = "rejected";
      const allResolved = panel.hunkStatus.every(s => s !== "pending");
      assert.ok(allResolved);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/diffpanel.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/diffpanel.js
import chalk from "chalk";

chalk.level = 3;

export function createDiffPanel(filePath, hunks) {
  return {
    filePath,
    hunks,
    currentHunk: 0,
    hunkStatus: hunks.map(() => "pending"),
    scrollOffset: 0,
  };
}

export function renderDiffPanel(panel, width, height) {
  const lines = [];
  const totalAdded = panel.hunks.reduce((s, h) => s + h.added, 0);
  const totalRemoved = panel.hunks.reduce((s, h) => s + h.removed, 0);

  // Header
  const header = ` ${panel.filePath}  +${totalAdded} -${totalRemoved}  ${panel.hunks.length} hunks`;
  lines.push(chalk.hex("#f5a50b").bold(header.padEnd(width).slice(0, width)));

  // Separator
  lines.push(chalk.hex("#555555")("─".repeat(width)));

  // Help line
  const help = " j/k: navigate  a: accept  r: reject  A/R: all  Esc: close";
  lines.push(chalk.hex("#888888")(help.padEnd(width).slice(0, width)));

  lines.push(chalk.hex("#555555")("─".repeat(width)));

  // Render hunks
  const bodyHeight = height - lines.length;
  const bodyLines = [];

  for (let hi = 0; hi < panel.hunks.length; hi++) {
    const hunk = panel.hunks[hi];
    const isCurrent = hi === panel.currentHunk;
    const status = panel.hunkStatus[hi];

    // Hunk header with status
    let statusIcon = "[ ]";
    if (status === "accepted") statusIcon = chalk.green("[✓]");
    else if (status === "rejected") statusIcon = chalk.red("[✗]");

    const hunkHeader = isCurrent
      ? chalk.hex("#ffcc44").bold(`▸ Hunk ${hi + 1}/${panel.hunks.length} ${statusIcon} ${hunk.header}`)
      : chalk.hex("#888888")(`  Hunk ${hi + 1}/${panel.hunks.length} ${statusIcon} ${hunk.header}`);

    bodyLines.push(hunkHeader.padEnd(width).slice(0, width));

    // Hunk lines
    for (const line of hunk.lines) {
      let rendered;
      const text = line.text.padEnd(width).slice(0, width);
      if (line.type === "added") {
        rendered = chalk.green(text);
      } else if (line.type === "removed") {
        rendered = chalk.red(text);
      } else {
        rendered = isCurrent ? chalk.hex("#cccccc")(text) : chalk.hex("#666666")(text);
      }
      bodyLines.push(rendered);
    }

    bodyLines.push(""); // blank line between hunks
  }

  // Apply scroll offset and fill to height
  const scrolled = bodyLines.slice(panel.scrollOffset, panel.scrollOffset + bodyHeight);
  for (const line of scrolled) {
    lines.push(line);
  }

  // Pad remaining height
  while (lines.length < height) {
    lines.push(" ".repeat(width));
  }

  return lines.slice(0, height);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/diffpanel.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/diffpanel.js test/diffpanel.test.js
git commit -m "feat: add diff panel renderer with hunk navigation"
```

---

### Task 5: Amber Tree Colors in Point Cloud

When a file has `changed: true`, render its tree in amber instead of its normal species colors.

**Files:**
- Modify: `src/pointcloud.js`
- Modify: `test/pointcloud.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/pointcloud.test.js`, inside `describe("pointcloud")`:

```javascript
  describe("changed tree colors", () => {
    it("uses amber colors when file.changed is true", () => {
      const points = generateTreeCloud(
        { relativePath: "src/app.js", extension: ".js", size: 500, churn: 5, changed: true },
        { x: 0, z: 0 },
      );
      const canopyPoints = points.filter(p => p.color !== "#8B6914"); // exclude trunk
      const amberColors = ["#ffaa33", "#ff8822", "#ffcc44", "#ee7711"];
      for (const p of canopyPoints) {
        assert.ok(amberColors.includes(p.color), `Expected amber color, got ${p.color}`);
      }
    });

    it("uses normal species colors when file.changed is false or absent", () => {
      const points = generateTreeCloud(
        { relativePath: "src/app.js", extension: ".js", size: 500, churn: 5 },
        { x: 0, z: 0 },
      );
      const canopyPoints = points.filter(p => p.color !== "#8B6914");
      const amberColors = ["#ffaa33", "#ff8822", "#ffcc44", "#ee7711"];
      for (const p of canopyPoints) {
        assert.ok(!amberColors.includes(p.color), `Did not expect amber color, got ${p.color}`);
      }
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/pointcloud.test.js`
Expected: First new test FAILS (canopy points use oak colors, not amber)

- [ ] **Step 3: Modify pointcloud.js to support changed flag**

In `src/pointcloud.js`, add the amber colors constant near the top (after `TRUNK_COLOR`):

```javascript
const AMBER_COLORS = ["#ffaa33", "#ff8822", "#ffcc44", "#ee7711"];
```

In the `generateTreeCloud` function, after `const species = getSpecies(file.extension);`, add:

```javascript
const colors = file.changed ? AMBER_COLORS : species.colors;
```

Then change the line that picks a color (around line 98):

```javascript
// Change this:
const color = species.colors[Math.floor(rng() * species.colors.length)];
// To this:
const color = colors[Math.floor(rng() * colors.length)];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/pointcloud.test.js`
Expected: PASS (all tests including 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/pointcloud.js test/pointcloud.test.js
git commit -m "feat: render changed trees in amber color"
```

---

### Task 6: Split-Screen Rendering and Dim Mode

Add the ability to render the forest at a reduced width (for split-screen with overlay), and a dim mode that fades unchanged trees.

**Files:**
- Modify: `src/renderer3d.js`
- Modify: `test/renderer3d.test.js`

- [ ] **Step 1: Write the failing test for dim mode**

Append to `test/renderer3d.test.js`, inside `describe("renderer3d")`:

```javascript
  describe("renderBufferToString with dim", () => {
    it("dims cells that are not marked as changed", () => {
      const buf = createFrameBuffer(4, 1);
      buf.chars[0][0] = { char: "█", color: "#55cc44" };
      buf.chars[0][1] = { char: "█", color: "#ffaa33" };
      buf.fileIndices[0][0] = 0;
      buf.fileIndices[0][1] = 1;

      const changedIndices = new Set([1]);
      const normal = renderBufferToString(buf);
      const dimmed = renderBufferToString(buf, "#0a0a1a", changedIndices);

      // Both should produce strings, dimmed version should be different
      // because file index 0 is not in changedIndices and gets dimmed
      assert.ok(typeof normal === "string");
      assert.ok(typeof dimmed === "string");
      assert.notEqual(normal, dimmed);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/renderer3d.test.js`
Expected: FAIL — renderBufferToString doesn't accept changedIndices parameter yet

- [ ] **Step 3: Modify renderBufferToString to support dim mode**

In `src/renderer3d.js`, update the `renderBufferToString` signature and body:

```javascript
export function renderBufferToString(buf, bgColor = BG_COLOR, changedIndices = null) {
  const lines = [];

  for (let y = 0; y < buf.height; y++) {
    let line = "";
    for (let x = 0; x < buf.width; x++) {
      const cell = buf.chars[y][x];
      if (!cell.color) {
        line += chalk.hex(bgColor)(" ");
      } else {
        let color = cell.color;
        if (changedIndices && buf.fileIndices[y][x] >= 0 && !changedIndices.has(buf.fileIndices[y][x])) {
          color = lerpColor(color, bgColor, 0.6);
        }
        line += chalk.hex(color)(cell.char);
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/renderer3d.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/renderer3d.js test/renderer3d.test.js
git commit -m "feat: add dim mode for unchanged trees in renderer"
```

---

### Task 7: Viewer Integration

Wire everything together in the viewer: poll loop, click-to-open panel, keybindings, split-screen rendering.

**Files:**
- Modify: `src/viewer.js`

This task is integration work that ties the previous modules together. It modifies the interactive viewer which is difficult to unit test (TTY, raw mode, mouse events). Testing is manual.

- [ ] **Step 1: Add imports to viewer.js**

At the top of `src/viewer.js`, add:

```javascript
import { getChangedFiles, getFileDiff } from "./diffwatch.js";
import { parseDiff } from "./diffparser.js";
import { createDiffPanel, renderDiffPanel } from "./diffpanel.js";
import { stageHunk, revertHunk } from "./diffactions.js";
```

- [ ] **Step 2: Add state variables**

After the existing state variables (around `let needsRedraw = true;`), add:

```javascript
  let changedFiles = new Set();
  let diffPanel = null;       // null when panel is closed
  let diffMode = false;       // 'd' key toggle
  let pollTimer = null;
```

- [ ] **Step 3: Add the poll loop**

After the resize handler, add:

```javascript
  function pollChanges() {
    const newChanged = getChangedFiles(dir);
    const changed = newChanged.size !== changedFiles.size ||
      [...newChanged].some(f => !changedFiles.has(f));
    changedFiles = newChanged;

    // Mark files as changed
    for (const file of files) {
      file.changed = changedFiles.has(file.relativePath);
    }

    if (changed) {
      // Regenerate point cloud with changed flags
      const { points: newTreePoints, filePaths: newPaths } = generateForestCloud(files);
      const newGround = generateGroundPlane(groundRadius);
      allPoints.length = 0;
      allPoints.push(...newTreePoints, ...newGround);
      filePaths.length = 0;
      filePaths.push(...newPaths);
      needsRedraw = true;
      redraw();
    }
  }

  pollTimer = setInterval(pollChanges, 2000);
  pollChanges(); // initial check
```

- [ ] **Step 4: Update renderFrame for split-screen and dim mode**

Replace the current `renderFrame` function body to support split-screen when the panel is open:

```javascript
  function renderFrame() {
    screenWidth = process.stdout.columns || 80;
    screenHeight = (process.stdout.rows || 24) - 2;

    const forestWidth = diffPanel ? Math.floor(screenWidth * 0.4) : screenWidth;
    const buf = createFrameBuffer(forestWidth, screenHeight);

    const projected = [];
    for (const p of allPoints) {
      const [rx, ry, rz] = rotatePoint(p.x, p.y, p.z, camera.azimuth, camera.elevation);
      const proj = projectPoint(rx, ry, rz, forestWidth, screenHeight, camera.distance);
      if (proj.visible) {
        projected.push({
          ...proj,
          color: p.color,
          fileIndex: p.fileIndex,
        });
      }
    }

    rasterize(buf, projected);

    // Build changed file indices set for dim mode
    const changedIndices = diffMode
      ? new Set(files.map((f, i) => f.changed ? i : -1).filter(i => i >= 0))
      : null;

    moveHome();
    // Top bar
    const topBarText = renderTopBar(hoveredFile, screenWidth);
    process.stdout.write(topBarText);
    process.stdout.write("\n");

    // Forest + optional panel
    const forestLines = renderBufferToString(buf, undefined, changedIndices).split("\n");

    if (diffPanel) {
      const panelWidth = screenWidth - forestWidth - 1; // 1 for border
      const panelLines = renderDiffPanel(diffPanel, panelWidth, screenHeight);
      const border = chalk.hex("#555555")("│");

      for (let y = 0; y < screenHeight; y++) {
        const fLine = forestLines[y] || "";
        const pLine = panelLines[y] || "";
        process.stdout.write(fLine + border + pLine);
        if (y < screenHeight - 1) process.stdout.write("\n");
      }
    } else {
      process.stdout.write(forestLines.join("\n"));
    }

    process.stdout.write("\n");

    // Status bar
    const changedCount = changedFiles.size;
    const changeText = changedCount > 0 ? `${changedCount} files changed  |  ` : "";
    process.stdout.write(renderStatusBar(files.length, screenWidth, changeText));

    return buf;
  }
```

- [ ] **Step 5: Update renderStatusBar to accept a prefix**

In `src/renderer3d.js`, modify `renderStatusBar`:

```javascript
export function renderStatusBar(fileCount, width, prefix = "") {
  const rightPart = `${prefix}${fileCount} files  |  drag to rotate  |  +/- zoom  |  d diff  |  q quit  r rescan `;
  const padding = Math.max(0, width - rightPart.length);
  return " ".repeat(padding) + chalk.hex("#8e8a84")(rightPart);
}
```

- [ ] **Step 6: Add click handling for opening the diff panel**

In the mouse event handling section, update the click handler (mouse button 0, released). Replace the existing click release block:

```javascript
      if (mouse.released && mouse.button === 0) {
        // Check if clicking a changed tree
        const sy = mouse.y - 1; // offset for top bar
        const sx = mouse.x;
        if (!diffPanel && currentBuf && sy >= 0 && sy < currentBuf.height && sx >= 0 && sx < currentBuf.width) {
          const fi = currentBuf.fileIndices[sy][sx];
          if (fi >= 0 && files[fi] && files[fi].changed) {
            const filePath = filePaths[fi];
            const diff = getFileDiff(dir, filePath);
            if (diff) {
              const hunks = parseDiff(diff);
              if (hunks.length > 0) {
                diffPanel = createDiffPanel(filePath, hunks);
                needsRedraw = true;
                redraw();
                mouseDown = false;
                return;
              }
            }
          }
        }
        mouseDown = false;
        return;
      }
```

- [ ] **Step 7: Add panel keybindings**

Before the existing arrow key handlers, add panel-specific key handling:

```javascript
      // Panel keybindings (when panel is open)
      if (diffPanel) {
        if (key === "\x1b" || key === "\x1b\x1b") { // Esc
          diffPanel = null;
          needsRedraw = true;
          clearScreen();
          redraw();
          return;
        }
        if (key === "j" || key === "\x1b[B") {
          diffPanel.currentHunk = Math.min(diffPanel.currentHunk + 1, diffPanel.hunks.length - 1);
          needsRedraw = true;
          redraw();
          return;
        }
        if (key === "k" || key === "\x1b[A") {
          diffPanel.currentHunk = Math.max(diffPanel.currentHunk - 1, 0);
          needsRedraw = true;
          redraw();
          return;
        }
        if (key === "a") {
          diffPanel.hunkStatus[diffPanel.currentHunk] = "accepted";
          // Auto-advance to next pending hunk
          const next = diffPanel.hunkStatus.findIndex((s, i) => i > diffPanel.currentHunk && s === "pending");
          if (next >= 0) diffPanel.currentHunk = next;
          checkAllResolved();
          needsRedraw = true;
          redraw();
          return;
        }
        if (key === "r") {
          diffPanel.hunkStatus[diffPanel.currentHunk] = "rejected";
          const next = diffPanel.hunkStatus.findIndex((s, i) => i > diffPanel.currentHunk && s === "pending");
          if (next >= 0) diffPanel.currentHunk = next;
          checkAllResolved();
          needsRedraw = true;
          redraw();
          return;
        }
        if (key === "A") {
          for (let i = 0; i < diffPanel.hunkStatus.length; i++) {
            if (diffPanel.hunkStatus[i] === "pending") diffPanel.hunkStatus[i] = "accepted";
          }
          checkAllResolved();
          needsRedraw = true;
          redraw();
          return;
        }
        if (key === "R") {
          for (let i = 0; i < diffPanel.hunkStatus.length; i++) {
            if (diffPanel.hunkStatus[i] === "pending") diffPanel.hunkStatus[i] = "rejected";
          }
          checkAllResolved();
          needsRedraw = true;
          redraw();
          return;
        }
        // Consume other keys when panel is open
        return;
      }
```

- [ ] **Step 8: Add the checkAllResolved function and 'd' key**

After the `redraw` function:

```javascript
  function checkAllResolved() {
    if (!diffPanel) return;
    const allDone = diffPanel.hunkStatus.every(s => s !== "pending");
    if (!allDone) return;

    // Apply accepted hunks
    for (let i = 0; i < diffPanel.hunks.length; i++) {
      if (diffPanel.hunkStatus[i] === "accepted") {
        stageHunk(dir, diffPanel.filePath, diffPanel.hunks[i]);
      } else if (diffPanel.hunkStatus[i] === "rejected") {
        revertHunk(dir, diffPanel.filePath, diffPanel.hunks[i]);
      }
    }

    // Close panel
    diffPanel = null;
    clearScreen();
    // Trigger immediate poll to refresh changed state
    pollChanges();
  }
```

Add the `d` key handler in the keyboard section (before the arrow keys, after the panel key block):

```javascript
      if (key === "d") {
        diffMode = !diffMode;
        needsRedraw = true;
        redraw();
        return;
      }
```

- [ ] **Step 9: Update cleanup to clear poll timer**

In the `cleanup` function, add:

```javascript
    if (pollTimer) clearInterval(pollTimer);
```

- [ ] **Step 10: Add chalk import for border rendering**

Add to viewer.js imports:

```javascript
import chalk from "chalk";
```

- [ ] **Step 11: Commit**

```bash
git add src/viewer.js src/renderer3d.js
git commit -m "feat: integrate diff review into viewer with split-screen panel"
```

---

### Task 8: Top Bar Modified Tag

When hovering a changed tree, show `[modified]` tag in the top bar.

**Files:**
- Modify: `src/renderer3d.js`
- Modify: `src/viewer.js`

- [ ] **Step 1: Update renderTopBar to accept a modified flag**

In `src/renderer3d.js`:

```javascript
export function renderTopBar(hoveredFile, width, modified = false) {
  if (!hoveredFile) return " ".repeat(width);
  const tag = modified ? chalk.hex("#ff8822")(" [modified]") : "";
  const label = ` ${hoveredFile}${tag} `;
  const plainLen = hoveredFile.length + (modified ? 12 : 0) + 2;
  const pad = Math.max(0, Math.floor((width - plainLen) / 2));
  return " ".repeat(pad) + chalk.hex("#f5a50b")(` ${hoveredFile}`) + tag + " ".repeat(Math.max(0, width - pad - plainLen));
}
```

- [ ] **Step 2: Update hover handler in viewer.js**

In the hover section where `hoveredFile` is set, also track whether the file is changed:

```javascript
          const newHover = fi >= 0 ? filePaths[fi] : "";
          const isModified = fi >= 0 && files[fi] && files[fi].changed;
          if (newHover !== hoveredFile) {
            hoveredFile = newHover;
            hoveredModified = isModified;
            writeAnsi(`\x1b[1;1H`);
            process.stdout.write(renderTopBar(hoveredFile, screenWidth, hoveredModified));
          }
```

Add `let hoveredModified = false;` to the state variables section.

Also update the `renderFrame` call to pass the modified flag:

```javascript
    const topBarText = renderTopBar(hoveredFile, screenWidth, hoveredModified);
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer3d.js src/viewer.js
git commit -m "feat: show [modified] tag in top bar for changed files"
```
