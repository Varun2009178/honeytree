import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ANIMATION_KEYFRAMES } from "../src/animation-keyframes.js";
import { getSprite } from "../src/sprites.js";

describe("animation keyframes", () => {
  it("has keyframes for oak", () => {
    assert.ok(ANIMATION_KEYFRAMES.oak);
    assert.equal(ANIMATION_KEYFRAMES.oak.length, 10);
  });

  it("oak keyframes have ascending times from 0 to 5", () => {
    const times = ANIMATION_KEYFRAMES.oak.map((kf) => kf.time);
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i] > times[i - 1], `time[${i}] should be > time[${i - 1}]`);
    }
    assert.equal(times[0], 0);
    assert.ok(times[times.length - 1] <= 5);
  });

  it("oak keyframes all have same dimensions as full sprite", () => {
    const full = getSprite("oak", 1.0);
    for (const kf of ANIMATION_KEYFRAMES.oak) {
      assert.equal(kf.sprite.width, full.width, "width mismatch");
      assert.equal(kf.sprite.rows.length, full.rows.length, "row count mismatch");
    }
  });

  it("oak keyframes store rows as [char, color] tuples", () => {
    for (const kf of ANIMATION_KEYFRAMES.oak) {
      for (const row of kf.sprite.rows) {
        for (const cell of row) {
          assert.equal(Array.isArray(cell), true);
          assert.equal(cell.length, 2);
        }
      }
    }
  });

  it("oak KF1 has a groundEffect", () => {
    assert.ok(ANIMATION_KEYFRAMES.oak[0].groundEffect);
    assert.ok(ANIMATION_KEYFRAMES.oak[0].groundEffect.radius > 0);
  });

  it("oak KF9 matches the full static sprite pixel-for-pixel", () => {
    const full = getSprite("oak", 1.0);
    const kf9 = ANIMATION_KEYFRAMES.oak[8].sprite;
    for (let r = 0; r < full.rows.length; r++) {
      for (let c = 0; c < full.rows[r].length; c++) {
        assert.deepEqual(kf9.rows[r][c], full.rows[r][c],
          `pixel mismatch at row ${r}, col ${c}`);
      }
    }
  });
});
