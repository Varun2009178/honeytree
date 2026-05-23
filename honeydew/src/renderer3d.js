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

      const t = (p.depth - minDepth) / depthSpan;
      // Map t in [0,1] to char indices [0,3]. Use ceil-1 so t=0.25 maps to index 0
      const charIndex = t === 0 ? 0 : Math.min(BLOCK_CHARS.length - 1, Math.ceil(t * BLOCK_CHARS.length) - 1);
      const blockChar = BLOCK_CHARS[charIndex];

      const dimFactor = t * 0.6;
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
