import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rasterize, createFrameBuffer, renderBufferToString } from "../src/renderer3d.js";

describe("renderer3d", () => {
  describe("createFrameBuffer", () => {
    it("creates buffer of correct dimensions", () => {
      const buf = createFrameBuffer(80, 24);
      assert.equal(buf.chars.length, 24);
      assert.equal(buf.chars[0].length, 80);
      assert.equal(buf.depth.length, 24);
      assert.equal(buf.depth[0].length, 80);
      assert.equal(buf.fileIndices.length, 24);
      assert.equal(buf.fileIndices[0].length, 80);
    });

    it("initializes depth to Infinity", () => {
      const buf = createFrameBuffer(10, 5);
      assert.equal(buf.depth[0][0], Infinity);
    });

    it("initializes fileIndices to -1", () => {
      const buf = createFrameBuffer(10, 5);
      assert.equal(buf.fileIndices[0][0], -1);
    });
  });

  describe("rasterize", () => {
    it("writes the nearest point to each cell", () => {
      const buf = createFrameBuffer(80, 24);
      const projectedPoints = [
        { screenX: 10, screenY: 5, depth: 20, color: "#ff0000", fileIndex: 0, visible: true },
        { screenX: 10, screenY: 5, depth: 10, color: "#00ff00", fileIndex: 1, visible: true },
      ];
      rasterize(buf, projectedPoints);
      assert.equal(buf.fileIndices[5][10], 1);
      assert.ok(buf.chars[5][10].color === "#00ff00");
    });

    it("skips points outside screen bounds", () => {
      const buf = createFrameBuffer(80, 24);
      const projectedPoints = [
        { screenX: -5, screenY: 3, depth: 10, color: "#ff0000", fileIndex: 0, visible: true },
        { screenX: 100, screenY: 3, depth: 10, color: "#ff0000", fileIndex: 0, visible: true },
      ];
      rasterize(buf, projectedPoints);
      assert.equal(buf.fileIndices[3][0], -1);
    });

    it("maps depth to block characters", () => {
      const buf = createFrameBuffer(80, 24);
      const projectedPoints = [
        { screenX: 5, screenY: 5, depth: 5, color: "#ff0000", fileIndex: 0, visible: true },
      ];
      rasterize(buf, projectedPoints, { minDepth: 0, maxDepth: 20 });
      assert.equal(buf.chars[5][5].char, "█");
    });
  });

  describe("renderBufferToString", () => {
    it("returns a string with correct line count", () => {
      const buf = createFrameBuffer(40, 10);
      const result = renderBufferToString(buf, "#0a0a1a");
      const lines = result.split("\n");
      assert.equal(lines.length, 10);
    });
  });

  describe("renderBufferToString with dim", () => {
    it("dims cells that are not marked as changed", () => {
      const buf = createFrameBuffer(4, 1);
      buf.chars[0][0] = { char: "█", color: "#55cc44" };
      buf.chars[0][1] = { char: "█", color: "#ffaa33" };
      buf.fileIndices[0][0] = 0;
      buf.fileIndices[0][1] = 1;

      const changedIndices = new Set([1]);
      const normal = renderBufferToString(buf);
      const dimmed = renderBufferToString(buf, "#0a0a1a", changedIndices);

      assert.ok(typeof normal === "string");
      assert.ok(typeof dimmed === "string");
      assert.notEqual(normal, dimmed);
    });
  });
});
