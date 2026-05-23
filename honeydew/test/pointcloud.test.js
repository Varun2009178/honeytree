import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSpecies,
  generateTreeCloud,
  generateForestCloud,
  generateGroundPlane,
} from "../src/pointcloud.js";

describe("pointcloud", () => {
  describe("getSpecies", () => {
    it("maps .js to oak", () => {
      assert.equal(getSpecies(".js").name, "oak");
    });

    it("maps .ts to pine", () => {
      assert.equal(getSpecies(".ts").name, "pine");
    });

    it("maps .css to birch", () => {
      assert.equal(getSpecies(".css").name, "birch");
    });

    it("maps .py to willow", () => {
      assert.equal(getSpecies(".py").name, "willow");
    });

    it("maps .md to cherry", () => {
      assert.equal(getSpecies(".md").name, "cherry");
    });

    it("maps unknown extension to default", () => {
      assert.equal(getSpecies(".xyz").name, "default");
    });
  });

  describe("generateTreeCloud", () => {
    it("returns an array of points", () => {
      const points = generateTreeCloud({
        relativePath: "src/app.js",
        extension: ".js",
        size: 500,
        churn: 5,
      }, { x: 0, z: 0 });
      assert.ok(Array.isArray(points));
      assert.ok(points.length > 0);
    });

    it("each point has x, y, z, color, fileIndex", () => {
      const points = generateTreeCloud({
        relativePath: "a.js",
        extension: ".js",
        size: 100,
        churn: 0,
      }, { x: 0, z: 0 });
      const p = points[0];
      assert.ok(typeof p.x === "number");
      assert.ok(typeof p.y === "number");
      assert.ok(typeof p.z === "number");
      assert.ok(typeof p.color === "string");
      assert.ok(typeof p.fileIndex === "number");
    });

    it("larger files produce more points", () => {
      const small = generateTreeCloud(
        { relativePath: "s.js", extension: ".js", size: 100, churn: 0 },
        { x: 0, z: 0 },
      );
      const big = generateTreeCloud(
        { relativePath: "b.js", extension: ".js", size: 10000, churn: 0 },
        { x: 5, z: 5 },
      );
      assert.ok(big.length > small.length);
    });

    it("high churn produces more points", () => {
      const low = generateTreeCloud(
        { relativePath: "l.js", extension: ".js", size: 500, churn: 1 },
        { x: 0, z: 0 },
      );
      const high = generateTreeCloud(
        { relativePath: "h.js", extension: ".js", size: 500, churn: 50 },
        { x: 5, z: 5 },
      );
      assert.ok(high.length > low.length);
    });

    it("points are deterministic (same input = same output)", () => {
      const a = generateTreeCloud(
        { relativePath: "a.js", extension: ".js", size: 500, churn: 3 },
        { x: 0, z: 0 },
      );
      const b = generateTreeCloud(
        { relativePath: "a.js", extension: ".js", size: 500, churn: 3 },
        { x: 0, z: 0 },
      );
      assert.deepEqual(a, b);
    });
  });

  describe("generateForestCloud", () => {
    it("returns points and filePaths arrays", () => {
      const files = [
        { relativePath: "src/a.js", extension: ".js", size: 200, churn: 1, directory: "src" },
        { relativePath: "test/b.js", extension: ".js", size: 300, churn: 2, directory: "test" },
      ];
      const result = generateForestCloud(files);
      assert.ok(Array.isArray(result.points));
      assert.ok(Array.isArray(result.filePaths));
      assert.equal(result.filePaths.length, 2);
    });

    it("clusters files from the same directory near each other", () => {
      const files = [
        { relativePath: "src/a.js", extension: ".js", size: 200, churn: 0, directory: "src" },
        { relativePath: "src/b.js", extension: ".js", size: 200, churn: 0, directory: "src" },
        { relativePath: "lib/c.js", extension: ".js", size: 200, churn: 0, directory: "lib" },
      ];
      const result = generateForestCloud(files);
      const srcPoints = result.points.filter((p) => p.fileIndex === 0 || p.fileIndex === 1);
      const libPoints = result.points.filter((p) => p.fileIndex === 2);
      const avgSrcX = srcPoints.reduce((s, p) => s + p.x, 0) / srcPoints.length;
      const avgLibX = libPoints.reduce((s, p) => s + p.x, 0) / libPoints.length;
      assert.ok(Math.abs(avgSrcX - avgLibX) > 1);
    });
  });

  describe("generateGroundPlane", () => {
    it("returns an array of ground points", () => {
      const points = generateGroundPlane(20);
      assert.ok(Array.isArray(points));
      assert.ok(points.length > 0);
    });

    it("all ground points have y = 0", () => {
      const points = generateGroundPlane(10);
      for (const p of points) {
        assert.equal(p.y, 0);
      }
    });

    it("ground points have soil color", () => {
      const points = generateGroundPlane(10);
      assert.ok(points[0].color.startsWith("#"));
    });
  });

  describe("LOD", () => {
    it("reduces points per tree when total exceeds threshold", () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        relativePath: `src/file${i}.js`,
        extension: ".js",
        size: 2000,
        churn: 10,
        directory: "src",
      }));
      const result = generateForestCloud(files);
      const avgPointsPerFile = result.points.length / 100;

      const smallFiles = files.slice(0, 5);
      const smallResult = generateForestCloud(smallFiles);
      const avgSmall = smallResult.points.length / 5;

      assert.ok(avgPointsPerFile < avgSmall);
    });
  });
});
