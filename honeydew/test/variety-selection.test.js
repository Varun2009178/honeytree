import { test } from "node:test";
import assert from "node:assert/strict";
import { unlockedPool, pickSpecies } from "../src/varieties.js";

// With nothing unlocked, the forest only grows standard species
// (never cherry/pine/oak/mythic/ancient).
test("locked forest never selects an unlocked-only species", () => {
  const pool = unlockedPool([]); // standard only
  const types = new Set();
  for (let i = 0; i < 200; i++) types.add(pickSpecies(pool).type);
  for (const t of types) assert.ok(["birch", "willow"].includes(t), `unexpected type ${t}`);
});

// Once pine is unlocked, pine becomes reachable.
test("unlocking pine adds it to the reachable pool", () => {
  const pool = unlockedPool(["pine"]);
  assert.ok(pool.some((s) => s.type === "pine"));
});
