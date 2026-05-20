import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAnimationFrames } from "../src/animation.js";
import { getSprite, TREE_TYPES } from "../src/sprites.js";

describe("animation engine", () => {
  it("returns the expected number of frames", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    assert.equal(frames.length, 40);
  });

  it("each frame has a sprite with rows and width", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    for (const frame of frames) {
      assert.ok(frame.sprite);
      assert.ok(Array.isArray(frame.sprite.rows));
      assert.ok(frame.sprite.width > 0);
    }
  });

  it("frame sprites have [char, color] tuples", () => {
    const frames = getAnimationFrames("oak", 1.0, 10);
    for (const frame of frames) {
      for (const row of frame.sprite.rows) {
        for (const cell of row) {
          assert.equal(Array.isArray(cell), true);
          assert.equal(cell.length, 2);
        }
      }
    }
  });

  it("first frame is mostly empty", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    const filledPixels = frames[0].sprite.rows.flat().filter(([, color]) => color).length;
    assert.ok(filledPixels < 10);
  });

  it("last frame matches the static sprite", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    const last = frames[frames.length - 1];
    const full = getSprite("oak", 1.0);
    assert.equal(last.sprite.width, full.width);
    assert.equal(last.sprite.rows.length, full.rows.length);
    for (let r = 0; r < full.rows.length; r++) {
      for (let c = 0; c < full.rows[r].length; c++) {
        assert.deepEqual(last.sprite.rows[r][c], full.rows[r][c],
          `pixel mismatch at row ${r}, col ${c}`);
      }
    }
  });

  it("early frames have ground overlay data", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    const earlyFrame = frames[1];
    assert.ok(earlyFrame.groundOverlay);
    assert.ok(Array.isArray(earlyFrame.groundOverlay));
  });

  it("later frames have no ground overlay", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    const lateFrame = frames[frames.length - 1];
    assert.ok(!lateFrame.groundOverlay || lateFrame.groundOverlay.length === 0);
  });

  it("uses bud characters in middle frames", () => {
    const frames = getAnimationFrames("oak", 1.0, 40);
    const midFrame = frames[Math.floor(frames.length * 0.5)];
    const chars = midFrame.sprite.rows.flat().map(([ch]) => ch);
    const hasBuds = chars.includes("░") || chars.includes("▒");
    assert.ok(hasBuds, "middle frames should contain bud characters");
  });

  it("works for all tree types", () => {
    for (const type of TREE_TYPES) {
      const frames = getAnimationFrames(type, 1.0, 40);
      assert.equal(frames.length, 40);
      const full = getSprite(type, 1.0);
      const last = frames[frames.length - 1];
      assert.equal(last.sprite.width, full.width);
    }
  });

  it("produces fewer filled pixels for low-growth trees", () => {
    const seedFrames = getAnimationFrames("oak", 0.15, 40);
    const fullFrames = getAnimationFrames("oak", 1.0, 40);
    const seedPixels = seedFrames[seedFrames.length - 1].sprite.rows.flat().filter(([, c]) => c).length;
    const fullPixels = fullFrames[fullFrames.length - 1].sprite.rows.flat().filter(([, c]) => c).length;
    assert.ok(seedPixels < fullPixels);
  });
});
