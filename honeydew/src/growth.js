// Pure mapping from a turn's output-token count to a tree's shape.
// Tunable: change these to reshape the forest's "honesty" curve.
export const GROWTH = {
  SAPLING_MAX: 250,
  FULL_TOKENS: 1500,
  MONSTER_TOKENS: 4000,
  MAX_HEIGHT_BONUS: 4,
};

export function tokensToTree(tokens) {
  const n = Number.isFinite(tokens) && tokens > 0 ? tokens : 0;

  let growth;
  if (n < GROWTH.SAPLING_MAX) {
    growth = 0.15 + (n / GROWTH.SAPLING_MAX) * 0.2; // 0.15 .. 0.35
  } else if (n < GROWTH.FULL_TOKENS) {
    const r = (n - GROWTH.SAPLING_MAX) / (GROWTH.FULL_TOKENS - GROWTH.SAPLING_MAX);
    growth = 0.35 + r * 0.65; // 0.35 .. 1.0
  } else {
    growth = 1;
  }

  let heightBonus = 0;
  if (n > GROWTH.FULL_TOKENS) {
    const over =
      (n - GROWTH.FULL_TOKENS) / (GROWTH.MONSTER_TOKENS - GROWTH.FULL_TOKENS);
    heightBonus = Math.min(GROWTH.MAX_HEIGHT_BONUS, Math.max(1, Math.ceil(over * GROWTH.MAX_HEIGHT_BONUS)));
  }

  // Variant (species/look) is owned by the variety system, not token count.
  return { growth: Math.min(1, Math.round(growth * 100) / 100), heightBonus, variant: null };
}
