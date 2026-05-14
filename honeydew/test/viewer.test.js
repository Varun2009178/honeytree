import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createForestWatcher } from "../src/viewer.js";

describe("createForestWatcher", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "honeydew-viewer-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns a watcher for a regular file", () => {
    const file = path.join(tmpDir, "forest.json");
    fs.writeFileSync(file, "{}");
    const watcher = createForestWatcher(file, () => {});
    assert.ok(watcher, "expected a watcher for a regular file");
    watcher.close();
  });

  it("returns null for a non-existent path", () => {
    const result = createForestWatcher(path.join(tmpDir, "nope.json"), () => {});
    assert.equal(result, null);
  });

  it("returns null for a directory", () => {
    const result = createForestWatcher(tmpDir, () => {});
    assert.equal(result, null);
  });

  it("returns null for a Unix socket", async () => {
    const socketPath = path.join(tmpDir, "test.sock");
    const server = net.createServer();
    await new Promise((resolve) => server.listen(socketPath, resolve));
    try {
      const result = createForestWatcher(socketPath, () => {});
      assert.equal(result, null);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("auto-closes the watcher on error", () => {
    const file = path.join(tmpDir, "forest.json");
    fs.writeFileSync(file, "{}");
    const watcher = createForestWatcher(file, () => {});
    assert.ok(watcher);

    let closed = false;
    const originalClose = watcher.close.bind(watcher);
    watcher.close = () => { closed = true; originalClose(); };

    watcher.emit("error", new Error("simulated watch failure"));
    assert.ok(closed, "watcher should auto-close on error");
  });
});
