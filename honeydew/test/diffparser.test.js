import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDiff, hunkToPatch } from "../src/diffparser.js";

describe("diffparser", () => {
  describe("parseDiff", () => {
    it("parses a single hunk with added and removed lines", () => {
      const diff = [
        "diff --git a/src/app.js b/src/app.js",
        "index abc1234..def5678 100644",
        "--- a/src/app.js",
        "+++ b/src/app.js",
        "@@ -1,3 +1,4 @@",
        " const x = 1;",
        "-const y = 2;",
        "+const y = 3;",
        "+const z = 4;",
      ].join("\n");

      const result = parseDiff(diff);
      assert.equal(result.length, 1);
      assert.equal(result[0].header, "@@ -1,3 +1,4 @@");
      assert.equal(result[0].lines.length, 4);
      assert.deepEqual(result[0].lines[0], { type: "context", text: " const x = 1;" });
      assert.deepEqual(result[0].lines[1], { type: "removed", text: "-const y = 2;" });
      assert.deepEqual(result[0].lines[2], { type: "added", text: "+const y = 3;" });
      assert.deepEqual(result[0].lines[3], { type: "added", text: "+const z = 4;" });
    });

    it("parses multiple hunks", () => {
      const diff = [
        "diff --git a/src/app.js b/src/app.js",
        "--- a/src/app.js",
        "+++ b/src/app.js",
        "@@ -1,3 +1,3 @@",
        " const x = 1;",
        "-const y = 2;",
        "+const y = 3;",
        "@@ -10,3 +10,4 @@",
        " function foo() {",
        "+  console.log('hi');",
        "   return 1;",
        " }",
      ].join("\n");

      const result = parseDiff(diff);
      assert.equal(result.length, 2);
      assert.equal(result[0].header, "@@ -1,3 +1,3 @@");
      assert.equal(result[1].header, "@@ -10,3 +10,4 @@");
      assert.equal(result[1].lines.length, 4);
    });

    it("returns empty array for empty input", () => {
      assert.deepEqual(parseDiff(""), []);
    });

    it("counts added and removed lines per hunk", () => {
      const diff = [
        "diff --git a/f.js b/f.js",
        "--- a/f.js",
        "+++ b/f.js",
        "@@ -1,2 +1,3 @@",
        " a",
        "-b",
        "+c",
        "+d",
      ].join("\n");

      const result = parseDiff(diff);
      assert.equal(result[0].added, 2);
      assert.equal(result[0].removed, 1);
    });
  });

  describe("hunkToPatch", () => {
    it("reconstructs a valid unified diff patch from a hunk", () => {
      const diff = [
        "diff --git a/f.js b/f.js",
        "--- a/f.js",
        "+++ b/f.js",
        "@@ -1,2 +1,3 @@",
        " a",
        "-b",
        "+c",
        "+d",
      ].join("\n");

      const hunks = parseDiff(diff);
      const patch = hunkToPatch("f.js", hunks[0]);
      assert.ok(patch.includes("--- a/f.js"));
      assert.ok(patch.includes("+++ b/f.js"));
      assert.ok(patch.includes("@@ -1,2 +1,3 @@"));
      assert.ok(patch.includes("-b"));
      assert.ok(patch.includes("+c"));
    });
  });
});
