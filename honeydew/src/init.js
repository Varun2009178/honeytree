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
      command: "honeytree __tick",
    },
  ],
};

const HONEYDEW_SESSION_HOOK = {
  matcher: "",
  hooks: [
    {
      type: "command",
      command: "honeytree __session",
    },
  ],
};

function hasHoneydewHook(settings) {
  return (
    settings?.hooks?.Stop?.some((entry) =>
      entry?.hooks?.some((hook) => hook?.command === "honeytree __tick"),
    ) ?? false
  );
}

function hasSessionHook(settings) {
  return (
    settings?.hooks?.UserPromptSubmit?.some((entry) =>
      entry?.hooks?.some((hook) => hook?.command === "honeytree __session"),
    ) ?? false
  );
}

// Rewrite any legacy `honeytree plant` Stop hook to the new hidden `__tick`.
// Returns true if anything changed.
function migrateLegacyHook(settings) {
  let changed = false;
  for (const entry of settings?.hooks?.Stop ?? []) {
    for (const hook of entry?.hooks ?? []) {
      if (hook?.command === "honeytree plant") {
        hook.command = "honeytree __tick";
        changed = true;
      }
    }
  }
  return changed;
}

export async function init() {
  const honeydewDir = getHoneydewDir();
  fs.mkdirSync(honeydewDir, { recursive: true });

  const existing = readForest();
  if (!existing) {
    writeForest(createEmptyForest());
    console.log(`Created ${path.join(honeydewDir, "forest.json")}`);
  } else {
    let migrated = false;
    if (existing.lastActiveDate === undefined) {
      existing.lastActiveDate = new Date().toISOString().slice(0, 10);
      migrated = true;
    }
    if (existing.streak === undefined) {
      existing.streak = 0;
      migrated = true;
    }
    if (migrated) {
      writeForest(existing);
      console.log(`Updated forest with streak tracking (${existing.trees.length} trees kept)`);
    } else {
      console.log(`Forest already up to date at ${path.join(honeydewDir, "forest.json")}`);
    }
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

  const migrated = migrateLegacyHook(settings);
  if (migrated) {
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
    console.log(`Migrated legacy honeytree hook to __tick in ${settingsPath}`);
  }

  if (hasHoneydewHook(settings)) {
    console.log(`Claude Code hook already configured in ${settingsPath}`);
  } else {
    settings.hooks.Stop.push(HONEYDEW_STOP_HOOK);
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
    console.log(`Added honeytree Stop hook to ${settingsPath}`);
  }

  settings.hooks.UserPromptSubmit ??= [];
  if (!hasSessionHook(settings)) {
    settings.hooks.UserPromptSubmit.push(HONEYDEW_SESSION_HOOK);
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
    console.log(`Added honeytree UserPromptSubmit hook to ${settingsPath}`);
  }

  console.log("");
  console.log("Setup complete.");
  console.log("Run `honeytree` in a separate terminal to watch the forest grow.");
}
