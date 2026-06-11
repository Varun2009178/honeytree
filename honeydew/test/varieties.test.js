import { test } from "node:test";
import assert from "node:assert/strict";
import { VARIETIES, unlockedPool, pickSpecies } from "../src/varieties.js";

test("VARIETIES lists six varieties in threshold order", () => {
  assert.deepEqual(
    VARIETIES.map((v) => v.key),
    ["standard", "cherry", "pine", "oak", "ancient", "mythic"]
  );
  assert.deepEqual(
    VARIETIES.map((v) => v.threshold),
    [0, 1, 2, 4, 7, 10]
  );
});

test("unlockedPool always includes standard species and adds unlocked ones", () => {
  const base = unlockedPool([]);
  assert.ok(base.length > 0, "standard pool is non-empty");
  assert.ok(base.every((s) => s.variant == null));

  const withCherry = unlockedPool(["cherry"]);
  assert.ok(withCherry.some((s) => s.type === "cherry_blossom"));

  const withMythic = unlockedPool(["mythic"]);
  assert.ok(withMythic.some((s) => s.type === "mythic"));

  const withAncient = unlockedPool(["ancient"]);
  assert.ok(withAncient.some((s) => s.variant === "ancient"));
});

test("pickSpecies returns a {type} from the given pool", () => {
  const pool = unlockedPool(["cherry"]);
  const s = pickSpecies(pool);
  assert.ok(typeof s.type === "string");
  assert.ok(pool.includes(s));
});

test("pickSpecies falls back to a standard species on an empty pool", () => {
  const s = pickSpecies([]);
  assert.ok(typeof s.type === "string");
});
