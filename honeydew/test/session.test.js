import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const TEST_DIR = path.join(os.tmpdir(), `ht-session-${Date.now()}`);
process.env.HONEYDEW_DIR = TEST_DIR;

const { writeActiveSession, readActiveSession, clearActiveSession, isStale } =
  await import("../src/session.js");

describe("active session state", () => {
  beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
  afterEach(() => fs.rmSync(TEST_DIR, { recursive: true, force: true }));

  it("round-trips a session", () => {
    writeActiveSession({ transcript_path: "/t.jsonl", baselineOffset: 42, type: "oak", x: 12, turnStartedAt: 1000 });
    const s = readActiveSession();
    assert.equal(s.transcript_path, "/t.jsonl");
    assert.equal(s.baselineOffset, 42);
    assert.equal(s.type, "oak");
    assert.equal(s.x, 12);
  });
  it("returns null when absent", () => {
    clearActiveSession();
    assert.equal(readActiveSession(), null);
  });
  it("clears the session", () => {
    writeActiveSession({ transcript_path: "/t.jsonl", baselineOffset: 0, type: "pine", x: 1, turnStartedAt: 1 });
    clearActiveSession();
    assert.equal(readActiveSession(), null);
  });
  it("flags stale sessions past the cutoff", () => {
    const now = 10_000_000;
    assert.equal(isStale({ turnStartedAt: now - 6 * 60 * 1000 }, now), true);
    assert.equal(isStale({ turnStartedAt: now - 1000 }, now), false);
    assert.equal(isStale(null, now), true);
  });
});
