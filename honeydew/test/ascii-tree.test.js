import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asciiTree } from "../src/ascii-tree.js";

describe("asciiTree", () => {
  it("returns a non-empty string for the base tree", () => {
    assert.ok(asciiTree(false).length > 0);
  });
  it("returns a different design when bloomer is unlocked", () => {
    assert.notEqual(asciiTree(true), asciiTree(false));
  });
});
