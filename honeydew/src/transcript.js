import fs from "node:fs";

function sumOutputTokens(text) {
  let total = 0;
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      const ot = obj?.message?.usage?.output_tokens;
      if (typeof ot === "number" && Number.isFinite(ot)) total += ot;
    } catch {
      // ignore malformed line
    }
  }
  return total;
}

function readFrom(filePath, fromOffset) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }
  if (stat.size <= fromOffset) return { text: "", size: stat.size };
  const fd = fs.openSync(filePath, "r");
  try {
    const len = stat.size - fromOffset;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, fromOffset);
    return { text: buf.toString("utf8"), size: stat.size };
  } finally {
    fs.closeSync(fd);
  }
}

// Sum all output tokens from `fromOffset` to EOF (turn is complete at Stop).
export function readTurnTokens(filePath, fromOffset) {
  const r = readFrom(filePath, fromOffset);
  if (!r) return 0;
  return sumOutputTokens(r.text);
}

// Read only complete (newline-terminated) lines; leave a partial trailing line
// for the next read by not advancing the offset past it.
export function readNewTokens(filePath, fromOffset) {
  const r = readFrom(filePath, fromOffset);
  if (!r) return { tokens: 0, newOffset: fromOffset };
  if (!r.text) return { tokens: 0, newOffset: fromOffset };
  const lastNl = r.text.lastIndexOf("\n");
  if (lastNl === -1) return { tokens: 0, newOffset: fromOffset };
  const complete = r.text.slice(0, lastNl + 1);
  const tokens = sumOutputTokens(complete);
  const consumed = Buffer.byteLength(complete, "utf8");
  return { tokens, newOffset: fromOffset + consumed };
}
