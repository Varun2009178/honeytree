import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const TEST_DIR = path.join(os.tmpdir(), `honeydew-state-${Date.now()}`);
process.env.HONEYDEW_DIR = TEST_DIR;

const { createEmptyForest, readForest, writeForest } = await import("../src/state.js");

describe("state", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("creates the expected initial state", () => {
    const forest = createEmptyForest();
    assert.deepEqual(forest.trees, []);
    assert.equal(forest.totalPrompts, 0);
    assert.ok(forest.createdAt);
  });

  it("round trips a forest through disk", () => {
    const forest = createEmptyForest();
    forest.trees.push({
      id: 1,
      type: "oak",
      growth: 0.8,
      x: 22,
      plantedAt: new Date().toISOString(),
    });
    forest.totalPrompts = 1;

    writeForest(forest);
    const loaded = readForest();

    assert.equal(loaded.trees.length, 1);
    assert.equal(loaded.trees[0].type, "oak");
    assert.equal(loaded.totalPrompts, 1);
  });

  it("returns null when the state file is missing", () => {
    assert.equal(readForest(), null);
  });

  it("writes atomically without leaving tmp files behind", () => {
    writeForest(createEmptyForest());
    const files = fs.readdirSync(TEST_DIR);
    assert.ok(files.includes("forest.json"));
    assert.ok(!files.some((name) => name.endsWith(".tmp")));
  });
});
