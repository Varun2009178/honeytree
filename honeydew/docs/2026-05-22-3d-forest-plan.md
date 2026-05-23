# 3D Codebase Forest Viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Honeytree's 2D pixel-art forest with a 3D rotatable point-cloud forest where each file in a codebase becomes a tree, rendered with block characters (░▒▓█) in the terminal.

**Architecture:** Custom 3D pipeline: scan codebase → generate point clouds → rotate via camera matrix → perspective project to 2D → z-buffer rasterize with block shading. Zero new dependencies. Mouse drag orbits camera. Files clustered by directory.

**Tech Stack:** Vanilla JS (ES modules), Node.js 18+, chalk (existing dep), node:test for testing.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/scanner.js` | NEW — Walk a directory tree, collect file metadata (path, size, extension, git churn). Respect .gitignore. Cache results. |
| `src/pointcloud.js` | NEW — Define tree species as parametric 3D shapes. Generate point arrays from file metadata. Handle LOD. |
| `src/camera.js` | NEW — Orbital camera state (azimuth, elevation). Rotation matrix math. Perspective projection. |
| `src/renderer3d.js` | NEW — Z-buffer, block-shade rasterization, ground plane generation, screen buffer to string output. |
| `src/viewer.js` | MODIFIED — Replace 2D render loop with 3D pipeline. Add SGR mouse tracking. Add tree hover/selection. |
| `bin/honeydew.js` | MODIFIED — Add `view3d <dir>` command (or change default `view` to accept a dir path). |
| `test/scanner.test.js` | NEW — Tests for codebase scanning. |
| `test/pointcloud.test.js` | NEW — Tests for point cloud generation. |
| `test/camera.test.js` | NEW — Tests for camera math. |
| `test/renderer3d.test.js` | NEW — Tests for rasterization. |

---

### Task 1: Codebase Scanner

**Files:**
- Create: `src/scanner.js`
- Create: `test/scanner.test.js`

- [ ] **Step 1: Write failing tests for scanDirectory**

```js
// test/scanner.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { scanDirectory } from "../src/scanner.js";

function makeTmpProject(structure) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-test-"));
  for (const [filePath, content] of Object.entries(structure)) {
    const full = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe("scanner", () => {
  it("returns an array of file entries", () => {
    const dir = makeTmpProject({ "a.js": "hello", "b.ts": "world" });
    const files = scanDirectory(dir);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 2);
  });

  it("each entry has path, size, extension, relativePath", () => {
    const dir = makeTmpProject({ "src/app.js": "const x = 1;" });
    const files = scanDirectory(dir);
    const f = files[0];
    assert.ok(f.absolutePath.endsWith("app.js"));
    assert.equal(f.relativePath, "src/app.js");
    assert.equal(f.extension, ".js");
    assert.equal(f.size, 14); // "const x = 1;".length + newline handling
  });

  it("ignores node_modules and .git by default", () => {
    const dir = makeTmpProject({
      "app.js": "x",
      "node_modules/dep/index.js": "y",
      ".git/config": "z",
    });
    const files = scanDirectory(dir);
    assert.equal(files.length, 1);
    assert.ok(files[0].relativePath === "app.js");
  });

  it("ignores binary files", () => {
    const dir = makeTmpProject({ "a.js": "code", "b.png": "binary" });
    const files = scanDirectory(dir);
    assert.equal(files.length, 1);
  });

  it("groups files by directory", () => {
    const dir = makeTmpProject({
      "src/a.js": "a",
      "src/b.js": "b",
      "test/c.js": "c",
    });
    const files = scanDirectory(dir);
    const srcFiles = files.filter((f) => f.relativePath.startsWith("src/"));
    assert.equal(srcFiles.length, 2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/scanner.test.js`
Expected: FAIL — module `../src/scanner.js` not found

- [ ] **Step 3: Implement scanDirectory**

```js
// src/scanner.js
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build",
  ".next", "__pycache__", ".venv", "venv", "coverage",
  ".superpowers", ".honeytree",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".o", ".a",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".lock", ".sqlite", ".db",
]);

export function scanDirectory(rootDir) {
  const files = [];

  function walk(dir, relativeBase) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".") {
        if (entry.isDirectory()) continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = relativeBase
        ? `${relativeBase}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        walk(fullPath, relativePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;

        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        files.push({
          absolutePath: fullPath,
          relativePath,
          extension: ext,
          size: stat.size,
          directory: relativeBase || ".",
        });
      }
    }
  }

  walk(rootDir, "");
  return files;
}

export function getGitChurn(rootDir) {
  try {
    const output = execSync("git log --format= --name-only --diff-filter=ACMR", {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const counts = {};
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      counts[trimmed] = (counts[trimmed] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export function scanCodebase(rootDir) {
  const files = scanDirectory(rootDir);
  const churn = getGitChurn(rootDir);

  for (const file of files) {
    file.churn = churn[file.relativePath] || 0;
  }

  return files;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/scanner.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/scanner.js test/scanner.test.js
git commit -m "feat: add codebase scanner for 3D forest viewer"
```

---

### Task 2: Camera & Projection Math

**Files:**
- Create: `src/camera.js`
- Create: `test/camera.test.js`

- [ ] **Step 1: Write failing tests for camera**

```js
// test/camera.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createCamera, rotatePoint, projectPoint } from "../src/camera.js";

describe("camera", () => {
  it("createCamera returns default state", () => {
    const cam = createCamera();
    assert.equal(cam.azimuth, 45);
    assert.equal(cam.elevation, 30);
  });

  it("rotatePoint with zero rotation returns same point", () => {
    const [x, y, z] = rotatePoint(1, 2, 3, 0, 0);
    assert.ok(Math.abs(x - 1) < 0.001);
    assert.ok(Math.abs(y - 2) < 0.001);
    assert.ok(Math.abs(z - 3) < 0.001);
  });

  it("rotatePoint 360 degrees returns same point", () => {
    const [x, y, z] = rotatePoint(5, 3, 1, 360, 0);
    assert.ok(Math.abs(x - 5) < 0.01);
    assert.ok(Math.abs(y - 3) < 0.01);
    assert.ok(Math.abs(z - 1) < 0.01);
  });

  it("rotatePoint 90 azimuth swaps x and z", () => {
    const [x, y, z] = rotatePoint(1, 0, 0, 90, 0);
    assert.ok(Math.abs(x) < 0.001);
    assert.ok(Math.abs(z - (-1)) < 0.001);
  });

  it("projectPoint returns screenX, screenY, depth", () => {
    const result = projectPoint(0, 5, -10, 80, 24);
    assert.ok("screenX" in result);
    assert.ok("screenY" in result);
    assert.ok("depth" in result);
  });

  it("projectPoint places origin at screen center", () => {
    const result = projectPoint(0, 0, -20, 80, 24);
    // Should be near center of 80x24 screen
    assert.ok(Math.abs(result.screenX - 40) < 5);
    assert.ok(Math.abs(result.screenY - 12) < 5);
  });

  it("clampElevation stays within 10-80", () => {
    const cam = createCamera();
    cam.elevation = 90;
    cam.elevation = Math.max(10, Math.min(80, cam.elevation));
    assert.equal(cam.elevation, 80);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/camera.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement camera module**

```js
// src/camera.js

const DEG_TO_RAD = Math.PI / 180;

export function createCamera() {
  return {
    azimuth: 45,    // horizontal angle, degrees
    elevation: 30,  // vertical angle, degrees, clamped 10-80
    distance: 40,   // orbit distance from origin
  };
}

export function rotatePoint(x, y, z, azimuthDeg, elevationDeg) {
  const az = azimuthDeg * DEG_TO_RAD;
  const el = elevationDeg * DEG_TO_RAD;

  // Rotate around Y axis (azimuth)
  const cosAz = Math.cos(az);
  const sinAz = Math.sin(az);
  const x1 = x * cosAz + z * sinAz;
  const z1 = -x * sinAz + z * cosAz;

  // Rotate around X axis (elevation)
  const cosEl = Math.cos(el);
  const sinEl = Math.sin(el);
  const y1 = y * cosEl - z1 * sinEl;
  const z2 = y * sinEl + z1 * cosEl;

  return [x1, y1, z2];
}

export function projectPoint(x, y, z, screenWidth, screenHeight) {
  // Perspective projection
  const fov = 60;
  const fovRad = fov * DEG_TO_RAD;
  const focalLength = screenHeight / (2 * Math.tan(fovRad / 2));

  // z should be negative (in front of camera) for visible points
  // Add distance offset so points at origin appear in front of camera
  const zView = z - 40; // push scene away from camera

  if (zView >= -1) {
    // Behind camera — not visible
    return { screenX: -1, screenY: -1, depth: Infinity, visible: false };
  }

  const scale = focalLength / -zView;
  // Correct for terminal character aspect ratio (~2:1 height:width)
  const screenX = Math.round(x * scale * 2 + screenWidth / 2);
  const screenY = Math.round(-y * scale + screenHeight / 2);

  return {
    screenX,
    screenY,
    depth: -zView,
    visible: true,
  };
}

export function clampElevation(elevation) {
  return Math.max(10, Math.min(80, elevation));
}

export function clampAzimuth(azimuth) {
  return ((azimuth % 360) + 360) % 360;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/camera.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/camera.js test/camera.test.js
git commit -m "feat: add orbital camera with rotation and projection"
```

---

### Task 3: Point Cloud Generation

**Files:**
- Create: `src/pointcloud.js`
- Create: `test/pointcloud.test.js`

- [ ] **Step 1: Write failing tests for point cloud generation**

```js
// test/pointcloud.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSpecies,
  generateTreeCloud,
  generateForestCloud,
  generateGroundPlane,
} from "../src/pointcloud.js";

describe("pointcloud", () => {
  describe("getSpecies", () => {
    it("maps .js to oak", () => {
      assert.equal(getSpecies(".js").name, "oak");
    });

    it("maps .ts to pine", () => {
      assert.equal(getSpecies(".ts").name, "pine");
    });

    it("maps .css to birch", () => {
      assert.equal(getSpecies(".css").name, "birch");
    });

    it("maps .py to willow", () => {
      assert.equal(getSpecies(".py").name, "willow");
    });

    it("maps .md to cherry", () => {
      assert.equal(getSpecies(".md").name, "cherry");
    });

    it("maps unknown extension to default", () => {
      assert.equal(getSpecies(".xyz").name, "default");
    });
  });

  describe("generateTreeCloud", () => {
    it("returns an array of points", () => {
      const points = generateTreeCloud({
        relativePath: "src/app.js",
        extension: ".js",
        size: 500,
        churn: 5,
      }, { x: 0, z: 0 });
      assert.ok(Array.isArray(points));
      assert.ok(points.length > 0);
    });

    it("each point has x, y, z, color, fileIndex", () => {
      const points = generateTreeCloud({
        relativePath: "a.js",
        extension: ".js",
        size: 100,
        churn: 0,
      }, { x: 0, z: 0 });
      const p = points[0];
      assert.ok(typeof p.x === "number");
      assert.ok(typeof p.y === "number");
      assert.ok(typeof p.z === "number");
      assert.ok(typeof p.color === "string");
      assert.ok(typeof p.fileIndex === "number");
    });

    it("larger files produce more points", () => {
      const small = generateTreeCloud(
        { relativePath: "s.js", extension: ".js", size: 100, churn: 0 },
        { x: 0, z: 0 },
      );
      const big = generateTreeCloud(
        { relativePath: "b.js", extension: ".js", size: 10000, churn: 0 },
        { x: 5, z: 5 },
      );
      assert.ok(big.length > small.length);
    });

    it("high churn produces more points", () => {
      const low = generateTreeCloud(
        { relativePath: "l.js", extension: ".js", size: 500, churn: 1 },
        { x: 0, z: 0 },
      );
      const high = generateTreeCloud(
        { relativePath: "h.js", extension: ".js", size: 500, churn: 50 },
        { x: 5, z: 5 },
      );
      assert.ok(high.length > low.length);
    });

    it("points are deterministic (same input = same output)", () => {
      const a = generateTreeCloud(
        { relativePath: "a.js", extension: ".js", size: 500, churn: 3 },
        { x: 0, z: 0 },
      );
      const b = generateTreeCloud(
        { relativePath: "a.js", extension: ".js", size: 500, churn: 3 },
        { x: 0, z: 0 },
      );
      assert.deepEqual(a, b);
    });
  });

  describe("generateForestCloud", () => {
    it("returns points and filePaths arrays", () => {
      const files = [
        { relativePath: "src/a.js", extension: ".js", size: 200, churn: 1, directory: "src" },
        { relativePath: "test/b.js", extension: ".js", size: 300, churn: 2, directory: "test" },
      ];
      const result = generateForestCloud(files);
      assert.ok(Array.isArray(result.points));
      assert.ok(Array.isArray(result.filePaths));
      assert.equal(result.filePaths.length, 2);
    });

    it("clusters files from the same directory near each other", () => {
      const files = [
        { relativePath: "src/a.js", extension: ".js", size: 200, churn: 0, directory: "src" },
        { relativePath: "src/b.js", extension: ".js", size: 200, churn: 0, directory: "src" },
        { relativePath: "lib/c.js", extension: ".js", size: 200, churn: 0, directory: "lib" },
      ];
      const result = generateForestCloud(files);
      // Points from src files should be closer to each other than to lib files
      const srcPoints = result.points.filter((p) => p.fileIndex === 0 || p.fileIndex === 1);
      const libPoints = result.points.filter((p) => p.fileIndex === 2);
      // Compute average X of each group
      const avgSrcX = srcPoints.reduce((s, p) => s + p.x, 0) / srcPoints.length;
      const avgLibX = libPoints.reduce((s, p) => s + p.x, 0) / libPoints.length;
      // They should be separated
      assert.ok(Math.abs(avgSrcX - avgLibX) > 1);
    });
  });

  describe("generateGroundPlane", () => {
    it("returns an array of ground points", () => {
      const points = generateGroundPlane(20);
      assert.ok(Array.isArray(points));
      assert.ok(points.length > 0);
    });

    it("all ground points have y = 0", () => {
      const points = generateGroundPlane(10);
      for (const p of points) {
        assert.equal(p.y, 0);
      }
    });

    it("ground points have soil color", () => {
      const points = generateGroundPlane(10);
      assert.ok(points[0].color.startsWith("#"));
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/pointcloud.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement point cloud generation**

```js
// src/pointcloud.js

const SPECIES = {
  oak:     { name: "oak",     colors: ["#4a8c3f", "#3d7a34", "#5a9e4a", "#6aae5a"], shape: "ellipsoid", widthScale: 1.4, heightScale: 1.0 },
  pine:    { name: "pine",    colors: ["#2a7a6a", "#1d6a5a", "#3a8a7a", "#4a9a8a"], shape: "cone",      widthScale: 0.7, heightScale: 1.6 },
  birch:   { name: "birch",   colors: ["#cc66aa", "#bb5599", "#dd77bb", "#ee88cc"], shape: "ellipsoid", widthScale: 0.8, heightScale: 1.0 },
  willow:  { name: "willow",  colors: ["#88aa33", "#779922", "#99bb44", "#aacc55"], shape: "drooping",  widthScale: 1.2, heightScale: 1.0 },
  cherry:  { name: "cherry",  colors: ["#cc8833", "#bb7722", "#dd9944", "#eeaa55"], shape: "sphere",    widthScale: 1.0, heightScale: 1.0 },
  default: { name: "default", colors: ["#6a8a6a", "#5a7a5a", "#7a9a7a", "#8aaa8a"], shape: "ellipsoid", widthScale: 1.2, heightScale: 1.0 },
};

const TRUNK_COLOR = "#8B6914";

const EXT_MAP = {
  ".js": "oak", ".jsx": "oak", ".mjs": "oak", ".cjs": "oak",
  ".ts": "pine", ".tsx": "pine", ".mts": "pine",
  ".css": "birch", ".scss": "birch", ".sass": "birch", ".less": "birch",
  ".py": "willow", ".pyw": "willow",
  ".md": "cherry", ".json": "cherry", ".yaml": "cherry", ".yml": "cherry",
  ".toml": "cherry", ".xml": "cherry", ".ini": "cherry",
};

export function getSpecies(extension) {
  const key = EXT_MAP[extension] || "default";
  return SPECIES[key];
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul((s >>> 16) ^ s, 0x45d9f3b) >>> 0;
    s = Math.imul((s >>> 16) ^ s, 0x45d9f3b) >>> 0;
    s = ((s >>> 16) ^ s) >>> 0;
    return s / 0x100000000;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

export function generateTreeCloud(file, position, fileIndex = 0) {
  const species = getSpecies(file.extension);
  const seed = hashString(file.relativePath);
  const rng = seededRandom(seed);

  // Scale point count by file size (log scale to avoid extremes)
  const sizeLog = Math.log2(Math.max(1, file.size));
  const basePoints = Math.round(30 + sizeLog * 5); // 30-80 range for typical files
  const churnMultiplier = 1 + Math.min(1, (file.churn || 0) / 30); // up to 2x
  const canopyCount = Math.round(basePoints * churnMultiplier);

  // Tree height scales with file size
  const height = 2 + sizeLog * 0.5; // 2-10 range
  const canopyCenterY = height;
  const canopyRadiusX = (height * 0.4) * species.widthScale;
  const canopyRadiusY = (height * 0.35) * species.heightScale;
  const canopyRadiusZ = canopyRadiusX;

  const points = [];

  // Generate canopy points
  for (let i = 0; i < canopyCount; i++) {
    let px, py, pz;

    if (species.shape === "cone") {
      // Cone: narrower at top
      const t = rng(); // 0=top, 1=bottom of cone
      const angle = rng() * Math.PI * 2;
      const radius = t * canopyRadiusX;
      px = Math.cos(angle) * radius;
      pz = Math.sin(angle) * radius;
      py = canopyCenterY + canopyRadiusY * (1 - t);
    } else if (species.shape === "drooping") {
      // Ellipsoid but with extra points hanging below
      const u = rng() * Math.PI * 2;
      const v = rng() * Math.PI;
      const r = rng();
      px = Math.cos(u) * Math.sin(v) * canopyRadiusX * r;
      py = canopyCenterY + Math.cos(v) * canopyRadiusY * r;
      pz = Math.sin(u) * Math.sin(v) * canopyRadiusZ * r;
      // 30% chance of drooping below canopy center
      if (rng() < 0.3) {
        py = canopyCenterY - rng() * canopyRadiusY * 0.8;
      }
    } else if (species.shape === "sphere") {
      // Uniform sphere
      const u = rng() * Math.PI * 2;
      const v = Math.acos(2 * rng() - 1);
      const r = Math.cbrt(rng()) * canopyRadiusX;
      px = Math.cos(u) * Math.sin(v) * r;
      py = canopyCenterY + Math.cos(v) * r;
      pz = Math.sin(u) * Math.sin(v) * r;
    } else {
      // Ellipsoid (oak, birch, default)
      const u = rng() * Math.PI * 2;
      const v = Math.acos(2 * rng() - 1);
      const r = Math.cbrt(rng());
      px = Math.cos(u) * Math.sin(v) * canopyRadiusX * r;
      py = canopyCenterY + Math.cos(v) * canopyRadiusY * r;
      pz = Math.sin(u) * Math.sin(v) * canopyRadiusZ * r;
    }

    const color = species.colors[Math.floor(rng() * species.colors.length)];
    points.push({
      x: position.x + px,
      y: py,
      z: position.z + pz,
      color,
      fileIndex,
    });
  }

  // Generate trunk points
  const trunkCount = Math.round(3 + height * 0.8);
  for (let i = 0; i < trunkCount; i++) {
    const t = i / trunkCount;
    points.push({
      x: position.x + (rng() - 0.5) * 0.3,
      y: t * (canopyCenterY - canopyRadiusY * 0.5),
      z: position.z + (rng() - 0.5) * 0.3,
      color: TRUNK_COLOR,
      fileIndex,
    });
  }

  return points;
}

export function generateForestCloud(files) {
  // Group files by top-level directory
  const dirGroups = {};
  for (let i = 0; i < files.length; i++) {
    const dir = files[i].directory || ".";
    const topDir = dir === "." ? "." : dir.split("/")[0];
    if (!dirGroups[topDir]) dirGroups[topDir] = [];
    dirGroups[topDir].push({ file: files[i], index: i });
  }

  const dirs = Object.keys(dirGroups);
  const totalFiles = files.length;
  // Spread radius scales with file count
  const spreadRadius = Math.max(10, Math.sqrt(totalFiles) * 3);

  const allPoints = [];
  const filePaths = files.map((f) => f.relativePath);

  dirs.forEach((dir, dirIndex) => {
    // Position each directory cluster on a circle
    const angle = (dirIndex / dirs.length) * Math.PI * 2;
    const clusterCenterX = Math.cos(angle) * spreadRadius * 0.5;
    const clusterCenterZ = Math.sin(angle) * spreadRadius * 0.5;

    const group = dirGroups[dir];
    const clusterSpread = Math.max(3, Math.sqrt(group.length) * 2);

    group.forEach((entry, fileInGroup) => {
      // Scatter files within the cluster
      const seed = hashString(entry.file.relativePath);
      const rng = seededRandom(seed);
      const fx = clusterCenterX + (rng() - 0.5) * clusterSpread;
      const fz = clusterCenterZ + (rng() - 0.5) * clusterSpread;

      const treePoints = generateTreeCloud(entry.file, { x: fx, z: fz }, entry.index);
      allPoints.push(...treePoints);
    });
  });

  return { points: allPoints, filePaths };
}

export function generateGroundPlane(radius) {
  const points = [];
  const step = 1.5; // spacing between ground points
  const groundColors = ["#3a2a1a", "#4a3a2a", "#352515", "#2a1a0a"];

  for (let x = -radius; x <= radius; x += step) {
    for (let z = -radius; z <= radius; z += step) {
      // Circular ground
      if (x * x + z * z > radius * radius) continue;

      const seed = hashString(`ground_${x}_${z}`);
      const rng = seededRandom(seed);
      const color = groundColors[Math.floor(rng() * groundColors.length)];

      points.push({
        x,
        y: 0,
        z,
        color,
        fileIndex: -1, // ground, not a file
      });
    }
  }

  return points;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/pointcloud.test.js`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/pointcloud.js test/pointcloud.test.js
git commit -m "feat: add parametric 3D point cloud generation for tree species"
```

---

### Task 4: 3D Rasterizer

**Files:**
- Create: `src/renderer3d.js`
- Create: `test/renderer3d.test.js`

- [ ] **Step 1: Write failing tests for renderer3d**

```js
// test/renderer3d.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rasterize, createFrameBuffer, renderBufferToString } from "../src/renderer3d.js";

describe("renderer3d", () => {
  describe("createFrameBuffer", () => {
    it("creates buffer of correct dimensions", () => {
      const buf = createFrameBuffer(80, 24);
      assert.equal(buf.chars.length, 24);
      assert.equal(buf.chars[0].length, 80);
      assert.equal(buf.depth.length, 24);
      assert.equal(buf.depth[0].length, 80);
      assert.equal(buf.fileIndices.length, 24);
      assert.equal(buf.fileIndices[0].length, 80);
    });

    it("initializes depth to Infinity", () => {
      const buf = createFrameBuffer(10, 5);
      assert.equal(buf.depth[0][0], Infinity);
    });

    it("initializes fileIndices to -1", () => {
      const buf = createFrameBuffer(10, 5);
      assert.equal(buf.fileIndices[0][0], -1);
    });
  });

  describe("rasterize", () => {
    it("writes the nearest point to each cell", () => {
      const buf = createFrameBuffer(80, 24);
      const projectedPoints = [
        { screenX: 10, screenY: 5, depth: 20, color: "#ff0000", fileIndex: 0, visible: true },
        { screenX: 10, screenY: 5, depth: 10, color: "#00ff00", fileIndex: 1, visible: true },
      ];
      rasterize(buf, projectedPoints);
      // Nearer point (depth 10) wins
      assert.equal(buf.fileIndices[5][10], 1);
      assert.ok(buf.chars[5][10].color === "#00ff00");
    });

    it("skips points outside screen bounds", () => {
      const buf = createFrameBuffer(80, 24);
      const projectedPoints = [
        { screenX: -5, screenY: 3, depth: 10, color: "#ff0000", fileIndex: 0, visible: true },
        { screenX: 100, screenY: 3, depth: 10, color: "#ff0000", fileIndex: 0, visible: true },
      ];
      rasterize(buf, projectedPoints);
      // No crash, no writes
      assert.equal(buf.fileIndices[3][0], -1);
    });

    it("maps depth to block characters", () => {
      const buf = createFrameBuffer(80, 24);
      const projectedPoints = [
        { screenX: 5, screenY: 5, depth: 5, color: "#ff0000", fileIndex: 0, visible: true },
      ];
      rasterize(buf, projectedPoints, { minDepth: 0, maxDepth: 20 });
      // Depth 5 out of 0-20 = nearest 25% → should be "█"
      assert.equal(buf.chars[5][5].char, "█");
    });
  });

  describe("renderBufferToString", () => {
    it("returns a string with correct line count", () => {
      const buf = createFrameBuffer(40, 10);
      const result = renderBufferToString(buf, "#0a0a1a");
      const lines = result.split("\n");
      assert.equal(lines.length, 10);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/renderer3d.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement renderer3d**

```js
// src/renderer3d.js
import chalk from "chalk";

const BLOCK_CHARS = ["█", "▓", "▒", "░"];
const BG_COLOR = "#0a0a1a";

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

function lerpColor(hex, targetHex, factor) {
  const c = parseHex(hex);
  const t = parseHex(targetHex);
  return toHex({
    r: c.r + (t.r - c.r) * factor,
    g: c.g + (t.g - c.g) * factor,
    b: c.b + (t.b - c.b) * factor,
  });
}

export function createFrameBuffer(width, height) {
  const chars = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: " ", color: null }))
  );
  const depth = Array.from({ length: height }, () =>
    new Float64Array(width).fill(Infinity)
  );
  const fileIndices = Array.from({ length: height }, () =>
    new Int32Array(width).fill(-1)
  );

  return { chars, depth, fileIndices, width, height };
}

export function rasterize(buf, projectedPoints, depthRange = null) {
  // Compute depth range if not provided
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  if (depthRange) {
    minDepth = depthRange.minDepth;
    maxDepth = depthRange.maxDepth;
  } else {
    for (const p of projectedPoints) {
      if (!p.visible) continue;
      if (p.depth < minDepth) minDepth = p.depth;
      if (p.depth > maxDepth) maxDepth = p.depth;
    }
  }

  const depthSpan = maxDepth - minDepth || 1;

  for (const p of projectedPoints) {
    if (!p.visible) continue;

    const sx = p.screenX;
    const sy = p.screenY;

    if (sx < 0 || sx >= buf.width || sy < 0 || sy >= buf.height) continue;

    if (p.depth < buf.depth[sy][sx]) {
      buf.depth[sy][sx] = p.depth;
      buf.fileIndices[sy][sx] = p.fileIndex;

      // Map depth to block character
      const t = (p.depth - minDepth) / depthSpan; // 0 = near, 1 = far
      const charIndex = Math.min(BLOCK_CHARS.length - 1, Math.floor(t * BLOCK_CHARS.length));
      const blockChar = BLOCK_CHARS[charIndex];

      // Dim color by depth (atmospheric fade)
      const dimFactor = t * 0.6; // up to 60% dimming at max depth
      const dimmedColor = lerpColor(p.color, BG_COLOR, dimFactor);

      buf.chars[sy][sx] = { char: blockChar, color: dimmedColor };
    }
  }
}

export function renderBufferToString(buf, bgColor = BG_COLOR) {
  const lines = [];

  for (let y = 0; y < buf.height; y++) {
    let line = "";
    for (let x = 0; x < buf.width; x++) {
      const cell = buf.chars[y][x];
      if (!cell.color) {
        line += chalk.hex(bgColor)(" ");
      } else {
        line += chalk.hex(cell.color)(cell.char);
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
}

export function renderStatusBar(hoveredFile, fileCount, width) {
  const leftPart = hoveredFile
    ? ` ${hoveredFile}`
    : "";
  const rightPart = `${fileCount} files  |  drag to rotate  |  q quit  r rescan `;

  const padding = Math.max(0, width - leftPart.length - rightPart.length);

  return (
    chalk.hex("#f5a50b")(leftPart) +
    " ".repeat(padding) +
    chalk.hex("#8e8a84")(rightPart)
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/renderer3d.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer3d.js test/renderer3d.test.js
git commit -m "feat: add 3D z-buffer rasterizer with block-shade depth mapping"
```

---

### Task 5: Wire Up the 3D Viewer

**Files:**
- Modify: `src/viewer.js`
- Modify: `bin/honeydew.js`

This is the integration task that connects scanner → pointcloud → camera → renderer3d into a live interactive viewer.

- [ ] **Step 1: Rewrite viewer.js with 3D pipeline**

```js
// src/viewer.js
import { scanCodebase } from "./scanner.js";
import { generateForestCloud, generateGroundPlane } from "./pointcloud.js";
import { createCamera, rotatePoint, projectPoint, clampElevation, clampAzimuth } from "./camera.js";
import { createFrameBuffer, rasterize, renderBufferToString, renderStatusBar } from "./renderer3d.js";

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

function enableMouse() {
  // Enable SGR mouse mode (button events + motion while pressed)
  writeAnsi("\x1b[?1000h"); // enable mouse click tracking
  writeAnsi("\x1b[?1002h"); // enable mouse drag tracking
  writeAnsi("\x1b[?1006h"); // enable SGR extended mode
}

function disableMouse() {
  writeAnsi("\x1b[?1006l");
  writeAnsi("\x1b[?1002l");
  writeAnsi("\x1b[?1000l");
}

function enableMouseMotion() {
  writeAnsi("\x1b[?1003h"); // any-event tracking (motion even without buttons)
}

function disableMouseMotion() {
  writeAnsi("\x1b[?1003l");
}

export async function viewer(targetDir) {
  const dir = targetDir || process.cwd();

  // Scan codebase
  process.stdout.write("Scanning codebase...\n");
  const files = scanCodebase(dir);

  if (files.length === 0) {
    console.error("No source files found in", dir);
    process.exit(1);
  }

  // Generate point cloud
  const { points: treePoints, filePaths } = generateForestCloud(files);
  const groundRadius = Math.max(15, Math.sqrt(files.length) * 4);
  const groundPoints = generateGroundPlane(groundRadius);
  const allPoints = [...treePoints, ...groundPoints];

  // Camera
  const camera = createCamera();
  let mouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let hoveredFile = "";
  let needsRedraw = true;

  // Frame buffer — reused each frame
  let screenWidth = process.stdout.columns || 80;
  let screenHeight = (process.stdout.rows || 24) - 1; // -1 for status bar

  function renderFrame() {
    screenWidth = process.stdout.columns || 80;
    screenHeight = (process.stdout.rows || 24) - 1;

    const buf = createFrameBuffer(screenWidth, screenHeight);

    // Transform and project all points
    const projected = [];
    for (const p of allPoints) {
      const [rx, ry, rz] = rotatePoint(p.x, p.y, p.z, camera.azimuth, camera.elevation);
      const proj = projectPoint(rx, ry, rz, screenWidth, screenHeight);
      if (proj.visible) {
        projected.push({
          ...proj,
          color: p.color,
          fileIndex: p.fileIndex,
        });
      }
    }

    rasterize(buf, projected);

    moveHome();
    process.stdout.write(renderBufferToString(buf));
    process.stdout.write("\n");
    process.stdout.write(renderStatusBar(hoveredFile, files.length, screenWidth));

    // Store buffer for hit-testing
    return buf;
  }

  // Initial render
  hideCursor();
  clearScreen();
  enableMouse();
  enableMouseMotion();
  let currentBuf = renderFrame();
  needsRedraw = false;

  // Redraw loop — only when needed
  function redraw() {
    if (!needsRedraw) return;
    needsRedraw = false;
    currentBuf = renderFrame();
  }

  // Parse SGR mouse events from stdin
  function parseMouseEvent(data) {
    const str = data.toString();
    // SGR format: \x1b[<button;x;y(M|m)
    const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
    if (!match) return null;

    const button = parseInt(match[1]);
    const x = parseInt(match[2]) - 1; // 1-based → 0-based
    const y = parseInt(match[3]) - 1;
    const released = match[4] === "m";

    return { button, x, y, released };
  }

  const cleanup = () => {
    disableMouseMotion();
    disableMouse();
    showCursor();
    clearScreen();
    console.log(`Scanned ${files.length} files in ${dir}`);
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.stdout.on("resize", () => {
    needsRedraw = true;
    clearScreen();
    redraw();
  });

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

      // r to rescan
      if (key === "r") {
        process.stdout.write("\x1b[H");
        process.stdout.write("Rescanning...");
        const newFiles = scanCodebase(dir);
        files.length = 0;
        files.push(...newFiles);
        const { points: newTreePoints, filePaths: newPaths } = generateForestCloud(files);
        const newGround = generateGroundPlane(Math.max(15, Math.sqrt(files.length) * 4));
        allPoints.length = 0;
        allPoints.push(...newTreePoints, ...newGround);
        filePaths.length = 0;
        filePaths.push(...newPaths);
        needsRedraw = true;
        clearScreen();
        redraw();
        return;
      }

      // Arrow key fallback rotation
      if (key === "\x1b[D") { // left
        camera.azimuth = clampAzimuth(camera.azimuth - 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "\x1b[C") { // right
        camera.azimuth = clampAzimuth(camera.azimuth + 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "\x1b[A") { // up
        camera.elevation = clampElevation(camera.elevation + 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "\x1b[B") { // down
        camera.elevation = clampElevation(camera.elevation - 5);
        needsRedraw = true;
        redraw();
        return;
      }

      // Mouse events
      const mouse = parseMouseEvent(data);
      if (!mouse) return;

      if (mouse.button === 0 && !mouse.released) {
        // Left button press
        mouseDown = true;
        lastMouseX = mouse.x;
        lastMouseY = mouse.y;
        return;
      }

      if (mouse.released && mouse.button === 0) {
        // Left button release
        mouseDown = false;
        return;
      }

      if (mouse.button === 32 && mouseDown) {
        // Drag (motion with button held = button + 32)
        const dx = mouse.x - lastMouseX;
        const dy = mouse.y - lastMouseY;
        lastMouseX = mouse.x;
        lastMouseY = mouse.y;

        camera.azimuth = clampAzimuth(camera.azimuth + dx * 0.8);
        camera.elevation = clampElevation(camera.elevation - dy * 0.8);
        needsRedraw = true;
        redraw();
        return;
      }

      // Mouse motion without button (hover) — for hit-testing
      if (mouse.button === 35 || (mouse.button >= 32 && mouse.released === false && !mouseDown)) {
        const sy = mouse.y;
        const sx = mouse.x;
        if (currentBuf && sy >= 0 && sy < currentBuf.height && sx >= 0 && sx < currentBuf.width) {
          const fi = currentBuf.fileIndices[sy][sx];
          const newHover = fi >= 0 ? filePaths[fi] : "";
          if (newHover !== hoveredFile) {
            hoveredFile = newHover;
            // Only redraw status bar
            const statusY = screenHeight + 1;
            writeAnsi(`\x1b[${statusY};1H`);
            process.stdout.write(renderStatusBar(hoveredFile, files.length, screenWidth));
          }
        }
      }
    });
  }
}
```

- [ ] **Step 2: Update bin/honeydew.js to support directory argument**

```js
// bin/honeydew.js — full replacement
#!/usr/bin/env node

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("../src/init.js");
  await init();
} else if (command === "plant") {
  const { plant } = await import("../src/plant.js");
  await plant();
} else if (command === "badge") {
  const { badge } = await import("../src/badge.js");
  await badge();
} else if (command === "md") {
  const { generateForestMd } = await import("../src/markdown.js");
  await generateForestMd();
} else if (!command || command === "view") {
  const targetDir = !command ? process.cwd() : process.argv[3] || process.cwd();
  const { viewer } = await import("../src/viewer.js");
  await viewer(targetDir);
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: honeytree [init|plant|badge|md|view <dir>]");
  process.exit(1);
}
```

- [ ] **Step 3: Run the viewer manually to smoke test**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node bin/honeydew.js view /Users/varunnukala/Desktop/sriko/honeydew`
Expected: A 3D forest appears in the terminal. Arrow keys rotate it. `q` quits.

- [ ] **Step 4: Test mouse drag rotation**

In the running viewer, click and drag to orbit the camera. Verify the forest rotates smoothly. Hover over a tree area and check the status bar shows a file path.

- [ ] **Step 5: Commit**

```bash
git add src/viewer.js bin/honeydew.js
git commit -m "feat: replace 2D viewer with 3D rotatable codebase forest"
```

---

### Task 6: Tuning & Polish

**Files:**
- Modify: `src/pointcloud.js` (if tree sizes need adjustment)
- Modify: `src/camera.js` (if projection needs tweaking)
- Modify: `src/renderer3d.js` (if depth mapping needs adjustment)

This task is for visual tuning after seeing the first render. The specific changes will depend on what looks wrong.

- [ ] **Step 1: Run the viewer on this project and evaluate visuals**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node bin/honeydew.js view .`

Check these things:
- Are trees large and wide enough? (If not, increase `canopyRadiusX/Y/Z` and `basePoints` in `pointcloud.js`)
- Does depth shading look good? (If blocks are all the same shade, adjust `depthSpan` or `dimFactor` in `renderer3d.js`)
- Is the camera distance appropriate? (If forest is too small or too large, adjust `distance` and the z-offset in `projectPoint` in `camera.js`)
- Does mouse drag feel responsive? (If sluggish, adjust the `0.8` sensitivity multiplier in `viewer.js`)

- [ ] **Step 2: Adjust tree scale if needed**

In `src/pointcloud.js`, the key tuning parameters are:
- `basePoints = Math.round(30 + sizeLog * 5)` — increase for denser trees
- `height = 2 + sizeLog * 0.5` — increase multiplier for taller trees
- `canopyRadiusX = (height * 0.4) * species.widthScale` — increase `0.4` for wider trees

- [ ] **Step 3: Adjust camera distance if needed**

In `src/camera.js`, the `zView = z - 40` offset in `projectPoint` controls how far the scene is from the camera. Decrease for closer (bigger), increase for farther (smaller).

- [ ] **Step 4: Run all existing tests to make sure nothing is broken**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && npm test`
Expected: All tests pass (existing + new ones)

- [ ] **Step 5: Commit any tuning changes**

```bash
git add -u
git commit -m "fix: tune tree scale, camera distance, and depth shading"
```

---

### Task 7: LOD for Large Projects

**Files:**
- Modify: `src/pointcloud.js`

- [ ] **Step 1: Write failing test for LOD**

Add to `test/pointcloud.test.js`:

```js
describe("LOD", () => {
  it("reduces points per tree when total exceeds threshold", () => {
    // Generate 100 files worth of points
    const files = Array.from({ length: 100 }, (_, i) => ({
      relativePath: `src/file${i}.js`,
      extension: ".js",
      size: 2000,
      churn: 10,
      directory: "src",
    }));
    const result = generateForestCloud(files);
    const avgPointsPerFile = result.points.length / 100;

    // Generate 5 files worth (no LOD)
    const smallFiles = files.slice(0, 5);
    const smallResult = generateForestCloud(smallFiles);
    const avgSmall = smallResult.points.length / 5;

    // LOD should reduce per-tree points for the large set
    assert.ok(avgPointsPerFile < avgSmall);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/pointcloud.test.js`
Expected: FAIL — currently no LOD is applied

- [ ] **Step 3: Add LOD to generateForestCloud**

In `src/pointcloud.js`, modify `generateForestCloud`:

```js
export function generateForestCloud(files) {
  // Group files by top-level directory
  const dirGroups = {};
  for (let i = 0; i < files.length; i++) {
    const dir = files[i].directory || ".";
    const topDir = dir === "." ? "." : dir.split("/")[0];
    if (!dirGroups[topDir]) dirGroups[topDir] = [];
    dirGroups[topDir].push({ file: files[i], index: i });
  }

  const dirs = Object.keys(dirGroups);
  const totalFiles = files.length;
  const spreadRadius = Math.max(10, Math.sqrt(totalFiles) * 3);

  // LOD: estimate total points and reduce if over threshold
  const MAX_POINTS = 30000;
  const estimatedPointsPerFile = 60; // rough average
  const estimatedTotal = totalFiles * estimatedPointsPerFile;
  const lodScale = estimatedTotal > MAX_POINTS ? MAX_POINTS / estimatedTotal : 1;

  const allPoints = [];
  const filePaths = files.map((f) => f.relativePath);

  dirs.forEach((dir, dirIndex) => {
    const angle = (dirIndex / dirs.length) * Math.PI * 2;
    const clusterCenterX = Math.cos(angle) * spreadRadius * 0.5;
    const clusterCenterZ = Math.sin(angle) * spreadRadius * 0.5;

    const group = dirGroups[dir];
    const clusterSpread = Math.max(3, Math.sqrt(group.length) * 2);

    group.forEach((entry) => {
      const seed = hashString(entry.file.relativePath);
      const rng = seededRandom(seed);
      const fx = clusterCenterX + (rng() - 0.5) * clusterSpread;
      const fz = clusterCenterZ + (rng() - 0.5) * clusterSpread;

      const treePoints = generateTreeCloud(entry.file, { x: fx, z: fz }, entry.index, lodScale);
      allPoints.push(...treePoints);
    });
  });

  return { points: allPoints, filePaths };
}
```

And update `generateTreeCloud` signature to accept `lodScale`:

```js
export function generateTreeCloud(file, position, fileIndex = 0, lodScale = 1) {
  // ... existing code ...
  const canopyCount = Math.round(basePoints * churnMultiplier * lodScale);
  const trunkCount = Math.round((3 + height * 0.8) * Math.max(0.5, lodScale)); // keep at least half of trunk
  // ... rest stays the same ...
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/varunnukala/Desktop/sriko/honeydew && node --test test/pointcloud.test.js`
Expected: All tests PASS including new LOD test

- [ ] **Step 5: Commit**

```bash
git add src/pointcloud.js test/pointcloud.test.js
git commit -m "feat: add LOD scaling for large codebases (30k point cap)"
```
