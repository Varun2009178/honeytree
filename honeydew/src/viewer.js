import { scanCodebase } from "./scanner.js";
import { generateForestCloud, generateGroundPlane } from "./pointcloud.js";
import { createCamera, rotatePoint, projectPoint, clampElevation, clampAzimuth } from "./camera.js";
import { createFrameBuffer, rasterize, renderBufferToString, renderStatusBar } from "./renderer3d.js";

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
  let needsRedraw = true;

  let screenWidth = process.stdout.columns || 80;
  let screenHeight = (process.stdout.rows || 24) - 1;

  function renderFrame() {
    screenWidth = process.stdout.columns || 80;
    screenHeight = (process.stdout.rows || 24) - 1;

    const buf = createFrameBuffer(screenWidth, screenHeight);

    const projected = [];
    for (const p of allPoints) {
      const [rx, ry, rz] = rotatePoint(p.x, p.y, p.z, camera.azimuth, camera.elevation);
      const proj = projectPoint(rx, ry, rz, screenWidth, screenHeight, camera.distance);
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

    return buf;
  }

  hideCursor();
  clearScreen();
  enableMouse();
  enableMouseMotion();
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

      if (key === "r") {
        process.stdout.write("\x1b[H");
        process.stdout.write("Rescanning...");
        const newFiles = scanCodebase(dir);
        files.length = 0;
        files.push(...newFiles);
        const { points: newTreePoints, filePaths: newPaths } = generateForestCloud(files);
        const newGround = generateGroundPlane(Math.max(25, Math.sqrt(files.length) * 7));
        allPoints.length = 0;
        allPoints.push(...newTreePoints, ...newGround);
        filePaths.length = 0;
        filePaths.push(...newPaths);
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

      // Zoom: +/= to zoom in, - to zoom out
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
        const sy = mouse.y;
        const sx = mouse.x;
        if (currentBuf && sy >= 0 && sy < currentBuf.height && sx >= 0 && sx < currentBuf.width) {
          const fi = currentBuf.fileIndices[sy][sx];
          const newHover = fi >= 0 ? filePaths[fi] : "";
          if (newHover !== hoveredFile) {
            hoveredFile = newHover;
            const statusY = screenHeight + 1;
            writeAnsi(`\x1b[${statusY};1H`);
            process.stdout.write(renderStatusBar(hoveredFile, files.length, screenWidth));
          }
        }
      }
    });
  }
}
