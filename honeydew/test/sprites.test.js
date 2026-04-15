import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSprite, TREE_TYPES } from "../src/sprites.js";

describe("sprites", () => {
  it("exports all five tree types", () => {
    assert.deepEqual(TREE_TYPES, ["oak", "pine", "birch", "willow", "cherry"]);
  });

  it("returns sprites for every growth tier", () => {
    for (const type of TREE_TYPES) {
      for (const growth of [0.1, 0.3, 0.6, 1]) {
        const sprite = getSprite(type, growth);
        assert.ok(Array.isArray(sprite.rows));
        assert.ok(sprite.rows.length > 0);
        assert.ok(sprite.width > 0);
      }
    }
  });

  it("full trees are wider than seeds", () => {
    for (const type of TREE_TYPES) {
      assert.ok(getSprite(type, 1).width > getSprite(type, 0.1).width);
    }
  });

  it("stores rows as [char, color] tuples", () => {
    const sprite = getSprite("oak", 1);
    for (const row of sprite.rows) {
      for (const cell of row) {
        assert.equal(Array.isArray(cell), true);
        assert.equal(cell.length, 2);
      }
    }
  });
});
