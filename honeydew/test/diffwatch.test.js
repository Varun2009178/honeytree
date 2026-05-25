import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { getChangedFiles, getFileDiff } from "../src/diffwatch.js";

function makeTmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diffwatch-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd: dir, stdio: "pipe" });
  fs.writeFileSync(path.join(dir, "a.js"), "const x = 1;\n");
  execSync("git add . && git commit -m 'init'", { cwd: dir, stdio: "pipe" });
  return dir;
}

describe("diffwatch", () => {
  describe("getChangedFiles", () => {
    it("returns empty set when no changes", async () => {
      const dir = makeTmpRepo();
      const result = await getChangedFiles(dir);
      assert.equal(result.size, 0);
    });

    it("returns changed file paths after modification", async () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "const x = 2;\n");
      const result = await getChangedFiles(dir);
      assert.ok(result.has("a.js"));
      assert.equal(result.size, 1);
    });

    it("includes new untracked files", async () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "b.js"), "new file\n");
      const result = await getChangedFiles(dir);
      assert.ok(result.has("b.js"));
    });
  });

  describe("getFileDiff", () => {
    it("returns unified diff for a modified file", async () => {
      const dir = makeTmpRepo();
      fs.writeFileSync(path.join(dir, "a.js"), "const x = 2;\n");
      const diff = await getFileDiff(dir, "a.js");
      assert.ok(diff.includes("@@"));
      assert.ok(diff.includes("-const x = 1;"));
      assert.ok(diff.includes("+const x = 2;"));
    });

    it("returns empty string for unchanged file", async () => {
      const dir = makeTmpRepo();
      const diff = await getFileDiff(dir, "a.js");
      assert.equal(diff, "");
    });
  });
});
