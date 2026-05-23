// test/scanner.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { scanDirectory } from "../src/scanner.js";

function makeTmpProject(structure) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-test-"));
  for (const [filePath, content] of Object.entries(structure)) {
    const full = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe("scanner", () => {
  it("returns an array of file entries", () => {
    const dir = makeTmpProject({ "a.js": "hello", "b.ts": "world" });
    const files = scanDirectory(dir);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 2);
  });

  it("each entry has path, size, extension, relativePath", () => {
    const dir = makeTmpProject({ "src/app.js": "const x = 1;" });
    const files = scanDirectory(dir);
    const f = files[0];
    assert.ok(f.absolutePath.endsWith("app.js"));
    assert.equal(f.relativePath, "src/app.js");
    assert.equal(f.extension, ".js");
    assert.equal(f.size, 12);
  });

  it("ignores node_modules and .git by default", () => {
    const dir = makeTmpProject({
      "app.js": "x",
      "node_modules/dep/index.js": "y",
      ".git/config": "z",
    });
    const files = scanDirectory(dir);
    assert.equal(files.length, 1);
    assert.ok(files[0].relativePath === "app.js");
  });

  it("ignores binary files", () => {
    const dir = makeTmpProject({ "a.js": "code", "b.png": "binary" });
    const files = scanDirectory(dir);
    assert.equal(files.length, 1);
  });

  it("groups files by directory", () => {
    const dir = makeTmpProject({
      "src/a.js": "a",
      "src/b.js": "b",
      "test/c.js": "c",
    });
    const files = scanDirectory(dir);
    const srcFiles = files.filter((f) => f.relativePath.startsWith("src/"));
    assert.equal(srcFiles.length, 2);
  });
});
