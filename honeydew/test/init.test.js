import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const TEST_HOME = path.join(os.tmpdir(), `honeydew-init-${Date.now()}`);
process.env.HONEYDEW_DIR = path.join(TEST_HOME, ".honeydew");
process.env.CLAUDE_CONFIG_DIR = path.join(TEST_HOME, ".claude");

const settingsPath = () => path.join(process.env.CLAUDE_CONFIG_DIR, "settings.json");
const readHook = () => {
  const s = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  return s.hooks.Stop.flatMap((e) => e.hooks.map((h) => h.command));
};

const { init } = await import("../src/init.js");

describe("init hook wiring", () => {
  beforeEach(() => {
    fs.mkdirSync(process.env.CLAUDE_CONFIG_DIR, { recursive: true });
    fs.mkdirSync(process.env.HONEYDEW_DIR, { recursive: true });
  });
  afterEach(() => {
    fs.rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it("adds the hidden __tick Stop hook on a fresh install", async () => {
    await init();
    assert.ok(readHook().includes("honeytree __tick"));
    assert.ok(!readHook().includes("honeytree plant"));
  });

  it("migrates a legacy 'honeytree plant' Stop hook to __tick", async () => {
    fs.writeFileSync(
      settingsPath(),
      JSON.stringify({ hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "honeytree plant" }] }] } }, null, 2)
    );
    await init();
    const cmds = readHook();
    assert.ok(cmds.includes("honeytree __tick"));
    assert.ok(!cmds.includes("honeytree plant"));
  });

  it("adds the UserPromptSubmit __session hook on a fresh install", async () => {
    await init();
    const s = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    const cmds = (s.hooks.UserPromptSubmit || []).flatMap((e) => e.hooks.map((h) => h.command));
    assert.ok(cmds.includes("honeytree __session"));
  });

  it("is idempotent for the __session hook", async () => {
    await init();
    await init();
    const s = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    const cmds = (s.hooks.UserPromptSubmit || []).flatMap((e) => e.hooks.map((h) => h.command));
    assert.equal(cmds.filter((c) => c === "honeytree __session").length, 1);
  });
});
