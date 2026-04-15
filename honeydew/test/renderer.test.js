import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderFrame, SCENE_HEIGHT } from "../src/renderer.js";

const EMPTY_FOREST = {
  trees: [],
  totalPrompts: 0,
  createdAt: "2026-04-12T00:00:00.000Z",
};

describe("renderer", () => {
  it("returns a string", () => {
    assert.equal(typeof renderFrame(EMPTY_FOREST, 80), "string");
  });

  it("renders the expected number of lines", () => {
    const lines = renderFrame(EMPTY_FOREST, 80).split("\n");
    assert.equal(lines.length, SCENE_HEIGHT);
  });

  it("renders ground blocks", () => {
    assert.ok(renderFrame(EMPTY_FOREST, 40).includes("█"));
  });

  it("shows tree count in the stats bar", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 10, plantedAt: EMPTY_FOREST.createdAt },
        { id: 2, type: "pine", growth: 0.6, x: 28, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    assert.ok(renderFrame(forest, 80).includes("2 trees"));
  });

  it("changes the frame when a tree is present", () => {
    const withTree = renderFrame(
      {
        ...EMPTY_FOREST,
        trees: [{ id: 1, type: "oak", growth: 1, x: 18, plantedAt: EMPTY_FOREST.createdAt }],
      },
      80,
    );
    assert.notEqual(withTree, renderFrame(EMPTY_FOREST, 80));
  });
});
