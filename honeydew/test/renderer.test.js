import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderFrame, SCENE_HEIGHT } from "../src/renderer.js";
import { getVirtualWidth } from "../src/plant.js";

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

  it("has the correct scene height (sky + trees + ground + spacer + stats + cta)", () => {
    // 4 sky + 10 trees + 2 ground + 1 spacer + 1 stats + 1 cta = 19
    assert.equal(SCENE_HEIGHT, 19);
  });
});

describe("viewport rendering", () => {
  it("renders a viewport slice of a wider virtual canvas", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 200, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    const output = renderFrame(forest, 80, { viewportX: 180, virtualWidth: 300 });
    assert.ok(output.includes("█"));
  });

  it("does not show trees outside viewport", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: [
        { id: 1, type: "oak", growth: 1, x: 400, plantedAt: EMPTY_FOREST.createdAt },
      ],
    };
    const withTree = renderFrame(forest, 80, { viewportX: 0, virtualWidth: 500 });
    const without = renderFrame(EMPTY_FOREST, 80, { viewportX: 0, virtualWidth: 500 });
    const treeLines = (output) => output.split("\n").slice(4, 14);
    assert.deepEqual(treeLines(withTree), treeLines(without));
  });

  it("shows viewport indicator when forest is wider than terminal", () => {
    const forest = {
      ...EMPTY_FOREST,
      trees: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        type: "oak",
        growth: 1,
        x: i * 10 + 5,
        plantedAt: EMPTY_FOREST.createdAt,
      })),
    };
    const output = renderFrame(forest, 80, { viewportX: 40, virtualWidth: 200 });
    assert.ok(output.includes("["), "should contain minimap left bracket");
    assert.ok(output.includes("]"), "should contain minimap right bracket");
  });

  it("does not show viewport indicator when forest fits in terminal", () => {
    const output = renderFrame(EMPTY_FOREST, 80);
    const statsLine = output.split("\n").find((l) => l.includes("honeytree"));
    assert.ok(!statsLine.includes("═"), "no minimap ═ chars for small forests");
  });
});
