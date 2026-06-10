import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { readNewTokens, readTurnTokens } from "../src/transcript.js";

let file;
const line = (out) =>
  JSON.stringify({ type: "assistant", message: { usage: { output_tokens: out } } }) + "\n";
const userLine = JSON.stringify({ type: "user", message: { content: "hi" } }) + "\n";

beforeEach(() => {
  file = path.join(os.tmpdir(), `ht-transcript-${Date.now()}-${Math.random()}.jsonl`);
});
afterEach(() => {
  try { fs.rmSync(file); } catch {}
});

describe("readTurnTokens", () => {
  it("sums output_tokens across assistant lines since offset", () => {
    fs.writeFileSync(file, userLine + line(100) + line(250));
    assert.equal(readTurnTokens(file, 0), 350);
  });
  it("counts only lines after the baseline offset", () => {
    fs.writeFileSync(file, line(100));
    const off = fs.statSync(file).size;
    fs.appendFileSync(file, line(40));
    assert.equal(readTurnTokens(file, off), 40);
  });
  it("returns 0 for a missing file", () => {
    assert.equal(readTurnTokens("/no/such/file.jsonl", 0), 0);
  });
});

describe("readNewTokens", () => {
  it("reads new complete lines and advances the offset", () => {
    fs.writeFileSync(file, line(100) + line(50));
    const r = readNewTokens(file, 0);
    assert.equal(r.tokens, 150);
    assert.equal(r.newOffset, fs.statSync(file).size);
  });
  it("ignores a partial trailing line until its newline arrives", () => {
    fs.writeFileSync(file, line(100));
    const off = fs.statSync(file).size;
    const partial = JSON.stringify({ type: "assistant", message: { usage: { output_tokens: 99 } } });
    fs.appendFileSync(file, partial); // no trailing newline yet
    const r = readNewTokens(file, off);
    assert.equal(r.tokens, 0);
    assert.equal(r.newOffset, off); // not advanced past the partial line
    fs.appendFileSync(file, "\n");
    assert.equal(readNewTokens(file, r.newOffset).tokens, 99);
  });
  it("skips malformed lines", () => {
    fs.writeFileSync(file, "{ not json }\n" + line(20) + "\n");
    assert.equal(readNewTokens(file, 0).tokens, 20);
  });
});
