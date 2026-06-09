import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ht-rewards-"));
  process.env.HOME = tmp; // rewards.js resolves ~/.honeydew from os.homedir()
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("getUnlockedVarietyKeys reflects saved cache and always includes standard", async () => {
  const { saveRewards, getUnlockedVarietyKeys } = await import("../src/rewards.js?cache=1");
  saveRewards({ badges: [], cherry: true, pine: false, oak: false, ancient: false, mythic: false, celebrated: [] });
  const keys = getUnlockedVarietyKeys();
  assert.ok(keys.includes("standard"));
  assert.ok(keys.includes("cherry"));
  assert.ok(!keys.includes("pine"));
});

test("markCelebrated appends a key idempotently", async () => {
  const { saveRewards, getRewards, markCelebrated } = await import("../src/rewards.js?cache=2");
  saveRewards({ badges: [], celebrated: [] });
  markCelebrated("cherry");
  markCelebrated("cherry");
  assert.deepEqual(getRewards().celebrated, ["cherry"]);
});

test("uncelebratedUnlocked returns unlocked-but-not-celebrated keys", async () => {
  const { saveRewards, uncelebratedUnlocked } = await import("../src/rewards.js?cache=3");
  saveRewards({ badges: [], cherry: true, pine: true, celebrated: ["cherry"] });
  assert.deepEqual(uncelebratedUnlocked(), ["pine"]);
});
