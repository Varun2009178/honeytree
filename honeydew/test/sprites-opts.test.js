import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSprite, getAncientSprite } from "../src/sprites.js";

describe("getSprite options", () => {
  it("is unchanged with no opts", () => {
    const base = getSprite("oak", 1);
    assert.ok(base.rows.length > 0);
    assert.equal(getSprite("oak", 1, {}).rows.length, base.rows.length);
  });
  it("adds N trunk rows for heightBonus", () => {
    const base = getSprite("oak", 1).rows.length;
    assert.equal(getSprite("oak", 1, { heightBonus: 3 }).rows.length, base + 3);
  });
  it("uses the ancient sprite for variant 'ancient'", () => {
    const a = getSprite("oak", 1, { variant: "ancient" });
    const anc = getAncientSprite(1);
    assert.equal(a.rows.length, anc.rows.length);
    assert.equal(a.width, anc.width);
  });
  it("added rows are trunk-colored and match width", () => {
    const s = getSprite("oak", 1, { heightBonus: 2 });
    assert.equal(s.rows[0].length, s.width);
    assert.ok(s.rows[0].some((c) => c[1] !== null)); // has trunk pixels
  });
});
