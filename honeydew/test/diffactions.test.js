import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { stageHunk, revertHunk } from "../src/diffactions.js";
import { parseDiff } from "../src/diffparser.js";

function makeTmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diffactions-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd: dir, stdio: "pipe" });
  fs.writeFileSync(path.join(dir, "a.js"), "line1\nline2\nline3\n");
  execSync("git add . && git commit -m 'init'", { cwd: dir, stdio: "pipe" });
  return dir;
}

describe("diffactions", () => {
  describe("stageHunk", () => {
    it("stages a hunk into the git index", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "line1\nline2modified\nline3\n");

      const diff = execSync("git diff -U3 -- a.js", { cwd: dir, encoding: "utf-8" });
      const hunks = parseDiff(diff);
      const result = stageHunk(dir, "a.js", hunks[0]);

      assert.equal(result.ok, true);

      const staged = execSync("git diff --cached --name-only", { cwd: dir, encoding: "utf-8" });
      assert.ok(staged.includes("a.js"));
    });
  });

  describe("revertHunk", () => {
    it("reverts a hunk in the working tree", () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "line1\nline2modified\nline3\n");

      const diff = execSync("git diff -U3 -- a.js", { cwd: dir, encoding: "utf-8" });
      const hunks = parseDiff(diff);
      const result = revertHunk(dir, "a.js", hunks[0]);

      assert.equal(result.ok, true);

      const content = fs.readFileSync(path.join(dir, "a.js"), "utf-8");
      assert.equal(content, "line1\nline2\nline3\n");
    });
  });
});
