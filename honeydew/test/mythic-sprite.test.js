import { test } from "node:test";
import assert from "node:assert/strict";
import { getSprite } from "../src/sprites.js";

test("mythic sprite renders at every growth stage", () => {
  for (const g of [0.1, 0.4, 0.7, 1.0]) {
    const s = getSprite("mythic", g);
    assert.ok(s.width > 0);
    assert.ok(s.rows.length > 0);
  }
});
