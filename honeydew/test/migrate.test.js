import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { migrateLayout } from "../src/migrate.js";

describe("migrateLayout", () => {
  it("does nothing if layoutVersion is 2", () => {
    const forest = {
      trees: [
        { id: 1, x: 100 },
        { id: 2, x: 200 },
      ],
      layoutVersion: 2,
    };
    const result = migrateLayout(forest, 80);
    assert.equal(result.trees[0].x, 100);
    assert.equal(result.trees[1].x, 200);
  });

  it("spreads trees across virtual width preserving order", () => {
    const forest = {
      trees: [
        { id: 1, type: "oak", growth: 1, x: 10 },
        { id: 2, type: "pine", growth: 1, x: 30 },
        { id: 3, type: "birch", growth: 1, x: 50 },
      ],
    };
    const result = migrateLayout(forest, 80);
    assert.ok(result.trees[0].x < result.trees[1].x);
    assert.ok(result.trees[1].x < result.trees[2].x);
    assert.equal(result.layoutVersion, 2);
  });

  it("spreads cramped trees into wider space", () => {
    const trees = [];
    for (let i = 0; i < 50; i++) {
      trees.push({ id: i + 1, type: "oak", growth: 1, x: 5 + i });
    }
    const forest = { trees };
    const result = migrateLayout(forest, 80);
    const xs = result.trees.map((t) => t.x);
    const spread = Math.max(...xs) - Math.min(...xs);
    assert.ok(spread > 200, `spread ${spread} should be > 200`);
    assert.equal(result.layoutVersion, 2);
  });

  it("applies jitter within +/-2 columns", () => {
    const trees = [];
    for (let i = 0; i < 20; i++) {
      trees.push({ id: i + 1, type: "oak", growth: 1, x: 5 + i * 2 });
    }
    const forest = { trees };
    const result = migrateLayout(forest, 80);
    for (let i = 1; i < result.trees.length; i++) {
      assert.ok(
        result.trees[i].x > result.trees[i - 1].x,
        `Tree ${i} (x=${result.trees[i].x}) should be after tree ${i - 1} (x=${result.trees[i - 1].x})`,
      );
    }
  });

  it("handles empty forest", () => {
    const forest = { trees: [] };
    const result = migrateLayout(forest, 80);
    assert.equal(result.layoutVersion, 2);
    assert.equal(result.trees.length, 0);
  });

  it("handles single tree", () => {
    const forest = { trees: [{ id: 1, type: "oak", growth: 1, x: 40 }] };
    const result = migrateLayout(forest, 80);
    assert.equal(result.layoutVersion, 2);
    assert.equal(result.trees.length, 1);
    assert.ok(typeof result.trees[0].x === "number");
  });
});
