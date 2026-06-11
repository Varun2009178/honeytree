// Canonical tree-variety definitions for the CLI forest.
// Each variety maps to one or more renderable "species" specs: { type, variant }.
// `type` indexes SPRITES in sprites.js; `variant: "ancient"` routes through
// getAncientSprite (the type is then a base placeholder).
export const VARIETIES = [
  { key: "standard", threshold: 0,  label: "Standard",       species: [{ type: "birch" }, { type: "willow" }] },
  { key: "cherry",   threshold: 1,  label: "Cherry Blossom", species: [{ type: "cherry_blossom" }] },
  { key: "pine",     threshold: 2,  label: "Pine",           species: [{ type: "pine" }] },
  { key: "oak",      threshold: 4,  label: "Oak",            species: [{ type: "oak" }] },
  { key: "ancient",  threshold: 7,  label: "Ancient",        species: [{ type: "oak", variant: "ancient" }] },
  { key: "mythic",   threshold: 10, label: "Mythic",         species: [{ type: "mythic" }] },
];

// Build the species pool from the set of unlocked variety keys.
// `standard` is always included.
export function unlockedPool(unlockedKeys = []) {
  const keys = new Set(["standard", ...unlockedKeys]);
  const pool = [];
  for (const v of VARIETIES) {
    if (keys.has(v.key)) pool.push(...v.species);
  }
  return pool;
}

const STANDARD_SPECIES = VARIETIES[0].species;

export function pickSpecies(pool) {
  const list = Array.isArray(pool) && pool.length > 0 ? pool : STANDARD_SPECIES;
  return list[Math.floor(Math.random() * list.length)];
}
