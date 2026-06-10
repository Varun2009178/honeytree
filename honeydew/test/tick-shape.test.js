import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const TEST_DIR = path.join(os.tmpdir(), `ht-tickshape-${Date.now()}`);
process.env.HONEYDEW_DIR = TEST_DIR;

const { tick, getPlantWidth, findOpenX } = await import("../src/plant.js");
const { createEmptyForest, readForest, writeForest } = await import("../src/state.js");

describe("tick(shape)", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    writeForest(createEmptyForest());
  });
  afterEach(() => fs.rmSync(TEST_DIR, { recursive: true, force: true }));

  it("applies a provided shape to the new tree", async () => {
    await tick({ type: "oak", growth: 1, heightBonus: 2, variant: "ancient", x: 20 });
    const t = readForest().trees.at(-1);
    assert.equal(t.type, "oak");
    assert.equal(t.growth, 1);
    assert.equal(t.heightBonus, 2);
    assert.equal(t.variant, "ancient");
    assert.equal(t.x, 20);
  });
  it("falls back to random growth with no shape", async () => {
    await tick();
    const t = readForest().trees.at(-1);
    assert.ok(t.growth >= 0.3 && t.growth <= 1);
    assert.equal(t.heightBonus, undefined);
  });
  it("exports layout helpers", () => {
    assert.equal(typeof getPlantWidth, "function");
    assert.equal(typeof findOpenX, "function");
  });
});
