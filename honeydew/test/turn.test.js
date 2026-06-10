import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const TEST_DIR = path.join(os.tmpdir(), `ht-turn-${Date.now()}`);
process.env.HONEYDEW_DIR = TEST_DIR;

const { startTurn, computeTickShape } = await import("../src/turn.js");
const { readActiveSession } = await import("../src/session.js");
const { createEmptyForest, writeForest } = await import("../src/state.js");

const aLine = (out) =>
  JSON.stringify({ type: "assistant", message: { usage: { output_tokens: out } } }) + "\n";

describe("turn orchestration", () => {
  let transcript;
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    writeForest(createEmptyForest());
    transcript = path.join(TEST_DIR, "t.jsonl");
    fs.writeFileSync(transcript, aLine(10)); // pre-existing content (previous turn)
  });
  afterEach(() => fs.rmSync(TEST_DIR, { recursive: true, force: true }));

  it("startTurn records the baseline offset, type and x", () => {
    startTurn({ transcript_path: transcript, session_id: "s1" });
    const s = readActiveSession();
    assert.equal(s.transcript_path, transcript);
    assert.equal(s.baselineOffset, fs.statSync(transcript).size);
    assert.ok(typeof s.type === "string");
    assert.ok(typeof s.x === "number");
  });

  it("computeTickShape totals only this turn's tokens and clears the session", () => {
    startTurn({ transcript_path: transcript, session_id: "s1" });
    fs.appendFileSync(transcript, aLine(2000)); // this turn produced 2000
    const shape = computeTickShape({ transcript_path: transcript });
    assert.equal(shape.growth, 1);
    assert.ok(shape.heightBonus >= 1); // 2000 > FULL_TOKENS
    assert.ok(typeof shape.x === "number" && typeof shape.type === "string");
    assert.equal(readActiveSession(), null); // cleared
  });

  it("computeTickShape returns null when there is no matching session", () => {
    assert.equal(computeTickShape({ transcript_path: transcript }), null);
  });
});
