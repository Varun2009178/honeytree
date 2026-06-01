import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAvailability,
  findNewCompletedPlantings,
  findNewBadgeLabels,
} from "../src/plant-real.js";

describe("formatAvailability", () => {
  it("reports when trees are ready", () => {
    const out = formatAvailability({ available: 2, virtualTrees: 137, virtualToNext: 13 }).join("\n");
    assert.match(out, /2 real tree/);
    assert.match(out, /13 virtual trees/);
  });
  it("uses the singular for exactly one ready tree", () => {
    const out = formatAvailability({ available: 1, virtualTrees: 50, virtualToNext: 50 }).join("\n");
    assert.match(out, /1 real tree ready/);
    assert.doesNotMatch(out, /1 real trees/);
  });
  it("reports when none are ready yet", () => {
    const out = formatAvailability({ available: 0, virtualTrees: 10, virtualToNext: 40 }).join("\n");
    assert.match(out, /40 virtual trees/);
  });
});

describe("findNewCompletedPlantings", () => {
  it("returns completed plantings whose id is not in the baseline", () => {
    const baseline = [1, 2];
    const current = [
      { id: 1, status: "completed" },
      { id: 2, status: "completed" },
      { id: 3, status: "completed" },
      { id: 4, status: "pending" },
    ];
    const found = findNewCompletedPlantings(baseline, current);
    assert.deepEqual(found.map((p) => p.id), [3]);
  });
});

describe("findNewBadgeLabels", () => {
  it("returns labels of newly unlocked badges", () => {
    const baseline = ["planter"];
    const current = [
      { slug: "planter", label: "Planter", unlocked: true },
      { slug: "bloomer", label: "Bloomer", unlocked: true },
      { slug: "grove", label: "Grove", unlocked: false },
    ];
    assert.deepEqual(findNewBadgeLabels(baseline, current), ["Bloomer"]);
  });
});
