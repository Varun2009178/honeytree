import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ANIMATION_KEYFRAMES } from "../src/animation-keyframes.js";
import { getSprite, TREE_TYPES } from "../src/sprites.js";

const EXPECTED_DIMS = {
  oak:    { width: 8, rows: 6 },
  pine:   { width: 8, rows: 8 },
  birch:  { width: 7, rows: 6 },
  willow: { width: 11, rows: 7 },
  cherry: { width: 8, rows: 6 },
};

describe("animation keyframes", () => {
  for (const type of TREE_TYPES) {
    describe(type, () => {
      it("has 10 keyframes", () => {
        assert.ok(ANIMATION_KEYFRAMES[type], `missing keyframes for ${type}`);
        assert.equal(ANIMATION_KEYFRAMES[type].length, 10);
      });

      it("has ascending times from 0 to <=5", () => {
        const times = ANIMATION_KEYFRAMES[type].map((kf) => kf.time);
        for (let i = 1; i < times.length; i++) {
          assert.ok(times[i] > times[i - 1]);
        }
        assert.equal(times[0], 0);
        assert.ok(times[times.length - 1] <= 5);
      });

      it("all keyframes match full sprite dimensions", () => {
        const dims = EXPECTED_DIMS[type];
        for (let i = 0; i < ANIMATION_KEYFRAMES[type].length; i++) {
          const kf = ANIMATION_KEYFRAMES[type][i];
          assert.equal(kf.sprite.width, dims.width, `KF${i + 1} width`);
          assert.equal(kf.sprite.rows.length, dims.rows, `KF${i + 1} rows`);
        }
      });

      it("stores rows as [char, color] tuples", () => {
        for (const kf of ANIMATION_KEYFRAMES[type]) {
          for (const row of kf.sprite.rows) {
            for (const cell of row) {
              assert.equal(Array.isArray(cell), true);
              assert.equal(cell.length, 2);
            }
          }
        }
      });

      it("KF1 has a groundEffect", () => {
        assert.ok(ANIMATION_KEYFRAMES[type][0].groundEffect);
        assert.ok(ANIMATION_KEYFRAMES[type][0].groundEffect.radius > 0);
      });

      it("KF9 matches the full static sprite", () => {
        const full = getSprite(type, 1.0);
        const kf9 = ANIMATION_KEYFRAMES[type][8].sprite;
        for (let r = 0; r < full.rows.length; r++) {
          for (let c = 0; c < full.rows[r].length; c++) {
            assert.deepEqual(kf9.rows[r][c], full.rows[r][c],
              `${type} pixel mismatch at row ${r}, col ${c}`);
          }
        }
      });
    });
  }

  describe("enhanced ground effect", () => {
    for (const type of ["oak", "pine", "birch", "willow", "cherry"]) {
      it(`${type} KF1 has ground effect radius of 5`, () => {
        const kf1 = ANIMATION_KEYFRAMES[type][0];
        assert.ok(kf1.groundEffect, `${type} KF1 should have groundEffect`);
        assert.equal(kf1.groundEffect.radius, 5);
      });

      it(`${type} KF1 uses bright gold sparkle color`, () => {
        const kf1 = ANIMATION_KEYFRAMES[type][0];
        assert.equal(kf1.groundEffect.color, "#f5c842");
      });
    }
  });
});
