// Pure gating math: 1 real tree unlocked per 50 virtual (CLI) trees.

export function realTreesUnlocked(virtualTrees: number): number {
  if (!Number.isFinite(virtualTrees) || virtualTrees < 0) return 0
  return Math.floor(virtualTrees / 50)
}

export function availableToPlant(virtualTrees: number, alreadyPlanted: number): number {
  const planted =
    Number.isFinite(alreadyPlanted) && alreadyPlanted > 0 ? alreadyPlanted : 0
  return Math.max(0, realTreesUnlocked(virtualTrees) - planted)
}

// Virtual trees remaining until the next real tree unlocks (1..50).
export function virtualToNext(virtualTrees: number): number {
  const v = Number.isFinite(virtualTrees) && virtualTrees > 0 ? virtualTrees : 0
  return 50 - (v % 50)
}

export type QuantityResult =
  | { ok: true; quantity: number }
  | { ok: false; error: string }

export function resolveQuantity(requested: unknown, available: number): QuantityResult {
  if (available < 1) return { ok: false, error: "No real trees unlocked yet" }
  const n = Math.floor(Number(requested))
  if (!Number.isFinite(n) || n < 1) return { ok: false, error: "Invalid quantity" }
  if (n > available) return { ok: false, error: `Only ${available} tree(s) available to plant` }
  return { ok: true, quantity: n }
}
