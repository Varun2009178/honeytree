import { execSync } from "node:child_process";

export function getChangedFiles(rootDir) {
  const changed = new Set();

  try {
    const tracked = execSync("git diff --name-only", {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    for (const line of tracked.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) changed.add(trimmed);
    }

    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    for (const line of untracked.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) changed.add(trimmed);
    }
  } catch {
    // Not a git repo or git not available
  }

  return changed;
}

export function getFileDiff(rootDir, filePath) {
  try {
    const diff = execSync(`git diff -U3 -- "${filePath}"`, {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return diff;
  } catch {
    return "";
  }
}
