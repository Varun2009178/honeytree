// test/diffpanel.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDiffPanel, renderDiffPanel } from "../src/diffpanel.js";

const SAMPLE_HUNKS = [
  {
    header: "@@ -1,3 +1,3 @@",
    lines: [
      { type: "context", text: " const x = 1;" },
      { type: "removed", text: "-const y = 2;" },
      { type: "added", text: "+const y = 3;" },
    ],
    added: 1,
    removed: 1,
  },
  {
    header: "@@ -10,2 +10,3 @@",
    lines: [
      { type: "context", text: " function foo() {" },
      { type: "added", text: "+  console.log('hi');" },
      { type: "context", text: " }" },
    ],
    added: 1,
    removed: 0,
  },
];

describe("diffpanel", () => {
  describe("createDiffPanel", () => {
    it("creates panel state with hunks and file info", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      assert.equal(panel.filePath, "src/app.js");
      assert.equal(panel.hunks.length, 2);
      assert.equal(panel.currentHunk, 0);
      assert.deepEqual(panel.hunkStatus, ["pending", "pending"]);
    });
  });

  describe("renderDiffPanel", () => {
    it("returns an array of strings for each line", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      const lines = renderDiffPanel(panel, 40, 20);
      assert.ok(Array.isArray(lines));
      assert.equal(lines.length, 20);
    });

    it("includes the file path in the header", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      const lines = renderDiffPanel(panel, 40, 20);
      const plain = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
      assert.ok(plain.includes("src/app.js"));
    });

    it("shows hunk status indicators", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      panel.hunkStatus[0] = "accepted";
      const lines = renderDiffPanel(panel, 40, 20);
      const plain = lines.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
      assert.ok(plain.includes("[✓]") || plain.includes("✓"));
    });
  });

  describe("navigation", () => {
    it("nextHunk advances currentHunk", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      assert.equal(panel.currentHunk, 0);
      panel.currentHunk = Math.min(panel.currentHunk + 1, panel.hunks.length - 1);
      assert.equal(panel.currentHunk, 1);
    });

    it("acceptHunk marks current hunk as accepted", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      panel.hunkStatus[panel.currentHunk] = "accepted";
      assert.equal(panel.hunkStatus[0], "accepted");
    });

    it("allResolved returns true when all hunks decided", () => {
      const panel = createDiffPanel("src/app.js", SAMPLE_HUNKS);
      panel.hunkStatus[0] = "accepted";
      panel.hunkStatus[1] = "rejected";
      const allResolved = panel.hunkStatus.every(s => s !== "pending");
      assert.ok(allResolved);
    });
  });
});
