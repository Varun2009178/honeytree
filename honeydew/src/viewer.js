import chalk from "chalk";
import { scanCodebase } from "./scanner.js";
import { generateForestCloud, generateGroundPlane } from "./pointcloud.js";
import { createCamera, rotatePoint, projectPoint, clampElevation, clampAzimuth } from "./camera.js";
import { createFrameBuffer, rasterize, renderBufferToString, renderTopBar, renderStatusBar } from "./renderer3d.js";
import { getChangedFiles, getFileDiff } from "./diffwatch.js";
import { parseDiff } from "./diffparser.js";
import { createDiffPanel, renderDiffPanel } from "./diffpanel.js";
import { stageHunk, revertHunk } from "./diffactions.js";

export function createForestWatcher(filePath, onChange) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    const watcher = fs.watch(filePath, onChange);
    watcher.on("error", () => {
      try { watcher.close(); } catch {}
    });
    return watcher;
  } catch {
    return null;
  }
}

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
  writeAnsi("\x1b[?1000h");
  writeAnsi("\x1b[?1002h");
  writeAnsi("\x1b[?1006h");
}

function disableMouse() {
  writeAnsi("\x1b[?1006l");
  writeAnsi("\x1b[?1002l");
  writeAnsi("\x1b[?1000l");
}

function enableMouseMotion() {
  writeAnsi("\x1b[?1003h");
}

function disableMouseMotion() {
  writeAnsi("\x1b[?1003l");
}

export async function viewer(targetDir) {
  const dir = targetDir || process.cwd();

  process.stdout.write("Scanning codebase...\n");
  const files = scanCodebase(dir);

  if (files.length === 0) {
    console.error("No source files found in", dir);
    process.exit(1);
  }

  const { points: treePoints, filePaths } = generateForestCloud(files);
  const groundRadius = Math.max(25, Math.sqrt(files.length) * 7);
  const groundPoints = generateGroundPlane(groundRadius);
  const allPoints = [...treePoints, ...groundPoints];

  const camera = createCamera();
  let mouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let hoveredFile = "";
  let hoveredModified = false;
  let needsRedraw = true;

  let changedFiles = new Set();
  let diffPanel = null;
  let diffMode = false;
  let pollTimer = null;

  let screenWidth = process.stdout.columns || 80;
  let screenHeight = (process.stdout.rows || 24) - 2;

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

    const changedIndices = diffMode
      ? new Set(files.map((f, i) => f.changed ? i : -1).filter(i => i >= 0))
      : null;

    moveHome();
    process.stdout.write(renderTopBar(hoveredFile, screenWidth, hoveredModified));
    process.stdout.write("\n");

    const forestLines = renderBufferToString(buf, undefined, changedIndices).split("\n");

    if (diffPanel) {
      const panelWidth = screenWidth - forestWidth - 1;
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

    const changedCount = changedFiles.size;
    const changeText = changedCount > 0 ? `${changedCount} files changed  |  ` : "";
    process.stdout.write(renderStatusBar(files.length, screenWidth, changeText));

    return buf;
  }

  function regeneratePoints() {
    const { points: newTreePoints, filePaths: newPaths } = generateForestCloud(files);
    const newGround = generateGroundPlane(groundRadius);
    allPoints.length = 0;
    allPoints.push(...newTreePoints, ...newGround);
    filePaths.length = 0;
    filePaths.push(...newPaths);
  }

  function pollChanges() {
    const newChanged = getChangedFiles(dir);
    const changed = newChanged.size !== changedFiles.size ||
      [...newChanged].some(f => !changedFiles.has(f));
    changedFiles = newChanged;

    for (const file of files) {
      file.changed = changedFiles.has(file.relativePath);
    }

    if (changed) {
      regeneratePoints();
      needsRedraw = true;
      redraw();
    }
  }

  function checkAllResolved() {
    if (!diffPanel) return;
    const allDone = diffPanel.hunkStatus.every(s => s !== "pending");
    if (!allDone) return;

    for (let i = 0; i < diffPanel.hunks.length; i++) {
      if (diffPanel.hunkStatus[i] === "accepted") {
        stageHunk(dir, diffPanel.filePath, diffPanel.hunks[i]);
      } else if (diffPanel.hunkStatus[i] === "rejected") {
        revertHunk(dir, diffPanel.filePath, diffPanel.hunks[i]);
      }
    }

    diffPanel = null;
    clearScreen();
    pollChanges();
  }

  hideCursor();
  clearScreen();
  enableMouse();
  enableMouseMotion();

  pollTimer = setInterval(pollChanges, 2000);
  pollChanges();

  let currentBuf = renderFrame();
  needsRedraw = false;

  function redraw() {
    if (!needsRedraw) return;
    needsRedraw = false;
    currentBuf = renderFrame();
  }

  function parseMouseEvent(data) {
    const str = data.toString();
    const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
    if (!match) return null;

    const button = parseInt(match[1]);
    const x = parseInt(match[2]) - 1;
    const y = parseInt(match[3]) - 1;
    const released = match[4] === "m";

    return { button, x, y, released };
  }

  const cleanup = () => {
    if (pollTimer) clearInterval(pollTimer);
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

      if (key === "\x03" || key === "q") {
        cleanup();
        return;
      }

      // Panel keybindings (when panel is open)
      if (diffPanel) {
        if (key === "\x1b" || key === "\x1b\x1b") {
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
        return;
      }

      if (key === "d") {
        diffMode = !diffMode;
        needsRedraw = true;
        redraw();
        return;
      }

      if (key === "r") {
        process.stdout.write("\x1b[H");
        process.stdout.write("Rescanning...");
        const newFiles = scanCodebase(dir);
        files.length = 0;
        files.push(...newFiles);
        regeneratePoints();
        needsRedraw = true;
        clearScreen();
        redraw();
        return;
      }

      if (key === "\x1b[D") {
        camera.azimuth = clampAzimuth(camera.azimuth - 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "\x1b[C") {
        camera.azimuth = clampAzimuth(camera.azimuth + 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "\x1b[A") {
        camera.elevation = clampElevation(camera.elevation + 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "\x1b[B") {
        camera.elevation = clampElevation(camera.elevation - 5);
        needsRedraw = true;
        redraw();
        return;
      }

      if (key === "+" || key === "=") {
        camera.distance = Math.max(10, camera.distance - 5);
        needsRedraw = true;
        redraw();
        return;
      }
      if (key === "-" || key === "_") {
        camera.distance = Math.min(120, camera.distance + 5);
        needsRedraw = true;
        redraw();
        return;
      }

      const mouse = parseMouseEvent(data);
      if (!mouse) return;

      if (mouse.button === 0 && !mouse.released) {
        mouseDown = true;
        lastMouseX = mouse.x;
        lastMouseY = mouse.y;
        return;
      }

      if (mouse.released && mouse.button === 0) {
        const sy = mouse.y - 1;
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
                clearScreen();
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

      if (mouse.button === 32 && mouseDown) {
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

      if (mouse.button === 35 || (mouse.button >= 32 && mouse.released === false && !mouseDown)) {
        const sy = mouse.y - 1;
        const sx = mouse.x;
        if (currentBuf && sy >= 0 && sy < currentBuf.height && sx >= 0 && sx < currentBuf.width) {
          const fi = currentBuf.fileIndices[sy][sx];
          const newHover = fi >= 0 ? filePaths[fi] : "";
          const isModified = fi >= 0 && files[fi] && files[fi].changed;
          if (newHover !== hoveredFile) {
            hoveredFile = newHover;
            hoveredModified = isModified;
            writeAnsi(`\x1b[1;1H`);
            process.stdout.write(renderTopBar(hoveredFile, screenWidth, hoveredModified));
          }
        }
      }
    });
  }
}
