import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const TEST_DIR = path.join(os.tmpdir(), `honeydew-plant-${Date.now()}`);
process.env.HONEYDEW_DIR = TEST_DIR;

const { plant } = await import("../src/plant.js");
const { createEmptyForest, readForest, writeForest } = await import("../src/state.js");

describe("plant", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    writeForest(createEmptyForest());
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("adds a tree to an empty forest", async () => {
    await plant();
    const forest = readForest();
    assert.equal(forest.trees.length, 1);
    assert.equal(forest.totalPrompts, 1);
  });

  it("adds the required tree fields", async () => {
    await plant();
    const [tree] = readForest().trees;
    assert.ok(["oak", "pine", "birch", "willow", "cherry"].includes(tree.type));
    assert.ok(tree.growth >= 0.3 && tree.growth <= 1);
    assert.ok(typeof tree.x === "number");
    assert.equal(tree.id, 1);
    assert.ok(tree.plantedAt);
  });

  it("increments ids", async () => {
    await plant();
    await plant();
    await plant();
    const ids = readForest().trees.map((tree) => tree.id);
    assert.deepEqual(ids, [1, 2, 3]);
  });

  it("nudges partial trees toward full growth", async () => {
    const forest = createEmptyForest();
    forest.trees.push({
      id: 1,
      type: "oak",
      growth: 0.4,
      x: 20,
      plantedAt: new Date().toISOString(),
    });
    writeForest(forest);

    await plant();

    const updated = readForest();
    const originalTree = updated.trees.find((tree) => tree.id === 1);
    assert.ok(originalTree.growth > 0.4);
    assert.ok(originalTree.growth <= 1);
  });

  it("does not overgrow fully grown trees", async () => {
    const forest = createEmptyForest();
    forest.trees.push({
      id: 1,
      type: "pine",
      growth: 1,
      x: 15,
      plantedAt: new Date().toISOString(),
    });
    writeForest(forest);

    await plant();

    const updated = readForest();
    assert.equal(updated.trees.find((tree) => tree.id === 1).growth, 1);
  });
});
