import { execSync } from "node:child_process";
import { hunkToPatch } from "./diffparser.js";

export function stageHunk(rootDir, filePath, hunk) {
  try {
    const patch = hunkToPatch(filePath, hunk);
    execSync("git apply --cached --unidiff-zero -", {
      cwd: rootDir,
      input: patch,
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function revertHunk(rootDir, filePath, hunk) {
  try {
    const patch = hunkToPatch(filePath, hunk);
    execSync("git apply --reverse --unidiff-zero -", {
      cwd: rootDir,
      input: patch,
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
