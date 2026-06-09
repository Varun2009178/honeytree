import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tokensToTree, GROWTH } from "../src/growth.js";

describe("tokensToTree", () => {
  it("tiny turns are shrubs/saplings", () => {
    const r = tokensToTree(0);
    assert.ok(r.growth >= 0.15 && r.growth <= 0.2);
    assert.equal(r.heightBonus, 0);
    assert.equal(r.variant, null);
  });
  it("sapling boundary (~250) hits ~0.35", () => {
    assert.ok(Math.abs(tokensToTree(GROWTH.SAPLING_MAX).growth - 0.35) < 0.02);
  });
  it("interpolates young->full between sapling and full", () => {
    const g = tokensToTree(875).growth; // midpoint of 250..1500
    assert.ok(g > 0.6 && g < 0.75);
  });
  it("reaches full growth at FULL_TOKENS", () => {
    assert.equal(tokensToTree(GROWTH.FULL_TOKENS).growth, 1);
    assert.equal(tokensToTree(GROWTH.FULL_TOKENS).heightBonus, 0);
  });
  it("big turns add capped height bonus", () => {
    const r = tokensToTree(2750); // halfway 1500..4000
    assert.equal(r.growth, 1);
    assert.ok(r.heightBonus >= 1 && r.heightBonus <= GROWTH.MAX_HEIGHT_BONUS);
    assert.equal(r.variant, null);
  });
  it("monster turns get max height but no token-driven variant", () => {
    const r = tokensToTree(GROWTH.MONSTER_TOKENS + 500);
    assert.equal(r.variant, null);
    assert.equal(r.heightBonus, GROWTH.MAX_HEIGHT_BONUS);
  });
  it("handles bad input safely", () => {
    assert.equal(tokensToTree(-5).variant, null);
    assert.equal(tokensToTree(NaN).growth >= 0.15, true);
  });
});
