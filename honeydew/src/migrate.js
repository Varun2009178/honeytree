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
