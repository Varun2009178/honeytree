// test/camera.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createCamera, rotatePoint, projectPoint } from "../src/camera.js";

describe("camera", () => {
  it("createCamera returns default state", () => {
    const cam = createCamera();
    assert.equal(cam.azimuth, 45);
    assert.equal(cam.elevation, 30);
  });

  it("rotatePoint with zero rotation returns same point", () => {
    const [x, y, z] = rotatePoint(1, 2, 3, 0, 0);
    assert.ok(Math.abs(x - 1) < 0.001);
    assert.ok(Math.abs(y - 2) < 0.001);
    assert.ok(Math.abs(z - 3) < 0.001);
  });

  it("rotatePoint 360 degrees returns same point", () => {
    const [x, y, z] = rotatePoint(5, 3, 1, 360, 0);
    assert.ok(Math.abs(x - 5) < 0.01);
    assert.ok(Math.abs(y - 3) < 0.01);
    assert.ok(Math.abs(z - 1) < 0.01);
  });

  it("rotatePoint 90 azimuth swaps x and z", () => {
    const [x, y, z] = rotatePoint(1, 0, 0, 90, 0);
    assert.ok(Math.abs(x) < 0.001);
    assert.ok(Math.abs(z - (-1)) < 0.001);
  });

  it("projectPoint returns screenX, screenY, depth", () => {
    const result = projectPoint(0, 5, -10, 80, 24);
    assert.ok("screenX" in result);
    assert.ok("screenY" in result);
    assert.ok("depth" in result);
  });

  it("projectPoint places origin at screen center", () => {
    const result = projectPoint(0, 0, -20, 80, 24);
    assert.ok(Math.abs(result.screenX - 40) < 5);
    assert.ok(Math.abs(result.screenY - 12) < 5);
  });

  it("clampElevation stays within 10-80", () => {
    const cam = createCamera();
    cam.elevation = 90;
    cam.elevation = Math.max(10, Math.min(80, cam.elevation));
    assert.equal(cam.elevation, 80);
  });
});
