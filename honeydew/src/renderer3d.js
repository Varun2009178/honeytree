import chalk from "chalk";

chalk.level = 3; // force 24-bit true color

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

    const t = (p.depth - minDepth) / depthSpan;
    const charIndex = t === 0 ? 0 : Math.min(BLOCK_CHARS.length - 1, Math.ceil(t * BLOCK_CHARS.length) - 1);
    const blockChar = BLOCK_CHARS[charIndex];
    const dimFactor = t * 0.6;
    const dimmedColor = lerpColor(p.color, BG_COLOR, dimFactor);

    // Point splatting — closer points splat larger (2x2 for near, 1x1 for far)
    const splatRadius = t < 0.3 ? 2 : t < 0.7 ? 1 : 0;

    for (let dy = -splatRadius; dy <= splatRadius; dy++) {
      for (let dx = -splatRadius; dx <= splatRadius; dx++) {
        const px = sx + dx;
        const py = sy + dy;

        if (px < 0 || px >= buf.width || py < 0 || py >= buf.height) continue;

        if (p.depth < buf.depth[py][px]) {
          buf.depth[py][px] = p.depth;
          buf.fileIndices[py][px] = p.fileIndex;

          // Edge pixels of splat use lighter block char
          const edgeChar = (dx === 0 && dy === 0) ? blockChar : BLOCK_CHARS[Math.min(BLOCK_CHARS.length - 1, charIndex + 1)];
          buf.chars[py][px] = { char: edgeChar, color: dimmedColor };
        }
      }
    }
  }
}

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

export function renderTopBar(hoveredFile, width) {
  if (!hoveredFile) return " ".repeat(width);
  const label = ` ${hoveredFile} `;
  const pad = Math.max(0, Math.floor((width - label.length) / 2));
  return " ".repeat(pad) + chalk.hex("#f5a50b")(label) + " ".repeat(Math.max(0, width - pad - label.length));
}

export function renderStatusBar(fileCount, width) {
  const rightPart = `${fileCount} files  |  drag to rotate  |  +/- zoom  |  q quit  r rescan `;
  const padding = Math.max(0, width - rightPart.length);
  return " ".repeat(padding) + chalk.hex("#8e8a84")(rightPart);
}
