import { test } from "node:test";
import assert from "node:assert/strict";
import { eraSpecies, pickSpecies } from "../src/varieties.js";

// With nothing unlocked, the forest only grows standard species
// (never cherry/pine/oak/mythic/ancient).
test("locked forest never selects an unlocked-only species", () => {
  const pool = eraSpecies([]); // standard only
  const types = new Set();
  for (let i = 0; i < 200; i++) types.add(pickSpecies(pool).type);
  for (const t of types) assert.ok(["birch", "willow"].includes(t), `unexpected type ${t}`);
});

// Eras: every tree takes the LATEST unlocked variety, not a mix.
test("era is the latest unlocked variety only", () => {
  assert.deepEqual(eraSpecies(["cherry"]), [{ type: "cherry_blossom" }]);
  assert.deepEqual(eraSpecies(["cherry", "pine"]), [{ type: "pine" }]);
  assert.deepEqual(eraSpecies(["cherry", "pine", "oak"]), [{ type: "oak" }]);
  assert.deepEqual(eraSpecies(["cherry", "pine", "oak", "ancient"]), [{ type: "oak", variant: "ancient" }]);
  assert.deepEqual(eraSpecies(["cherry", "pine", "oak", "ancient", "mythic"]), [{ type: "mythic" }]);
});

// The "standard" key in the unlocked list never overrides a real unlock.
test("standard key does not override an unlocked era", () => {
  assert.deepEqual(eraSpecies(["standard", "cherry"]), [{ type: "cherry_blossom" }]);
});
