import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createEmptyForest,
  getHoneydewDir,
  readForest,
  writeForest,
} from "./state.js";

function getClaudeSettingsPath() {
  const claudeRoot =
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  return path.join(claudeRoot, "settings.json");
}

const HONEYDEW_STOP_HOOK = {
  matcher: "",
  hooks: [
    {
      type: "command",
      command: "honeytree plant",
    },
  ],
};

function hasHoneydewHook(settings) {
  return (
    settings?.hooks?.Stop?.some((entry) =>
      entry?.hooks?.some((hook) => hook?.command === "honeytree plant"),
    ) ?? false
  );
}

export async function init() {
  const honeydewDir = getHoneydewDir();
  fs.mkdirSync(honeydewDir, { recursive: true });

  if (!readForest()) {
    writeForest(createEmptyForest());
    console.log(`Created ${path.join(honeydewDir, "forest.json")}`);
  } else {
    console.log(`Forest already exists at ${path.join(honeydewDir, "forest.json")}`);
  }

  const settingsPath = getClaudeSettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    settings = {};
  }

  settings.hooks ??= {};
  settings.hooks.Stop ??= [];

  if (hasHoneydewHook(settings)) {
    console.log(`Claude Code hook already configured in ${settingsPath}`);
  } else {
    settings.hooks.Stop.push(HONEYDEW_STOP_HOOK);
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
    console.log(`Added honeytree Stop hook to ${settingsPath}`);
  }

  console.log("");
  console.log("Setup complete.");
  console.log("Run `honeytree` in a separate terminal to watch the forest grow.");
}
