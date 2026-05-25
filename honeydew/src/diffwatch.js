import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function execAsync(cmd, args, opts) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 5000, encoding: "utf-8", ...opts }, (err, stdout) => {
      resolve(err ? "" : stdout);
    });
  });
}

export async function getChangedFiles(rootDir) {
  const changed = new Set();

  const [tracked, untracked] = await Promise.all([
    execAsync("git", ["diff", "--name-only"], { cwd: rootDir }),
    execAsync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: rootDir }),
  ]);

  for (const output of [tracked, untracked]) {
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) changed.add(trimmed);
    }
  }

  return changed;
}

export function getFileDiff(rootDir, filePath) {
  return execAsync("git", ["diff", "-U3", "--", filePath], { cwd: rootDir });
}

export function watchForChanges(rootDir, callback) {
  let debounceTimer = null;
  const debounced = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(callback, 300);
  };

  try {
    const watcher = fs.watch(rootDir, { recursive: true }, (event, filename) => {
      if (!filename) return;
      if (filename.includes("node_modules") || filename.includes(".git")) return;
      debounced();
    });
    return watcher;
  } catch {
    return null;
  }
}
