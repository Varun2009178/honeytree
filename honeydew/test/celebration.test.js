import { test } from "node:test";
import assert from "node:assert/strict";
import { celebrationFor } from "../src/components/UnlockCelebration.js";

test("celebrationFor returns label + ascii art for a known variety", () => {
  const c = celebrationFor("mythic");
  assert.equal(c.label, "Mythic");
  assert.ok(typeof c.art === "string" && c.art.length > 0);
});

test("celebrationFor falls back gracefully for an unknown key", () => {
  const c = celebrationFor("nope");
  assert.ok(c.label.length > 0);
  assert.ok(typeof c.art === "string");
});
