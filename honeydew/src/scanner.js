// src/scanner.js
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build",
  ".next", "__pycache__", ".venv", "venv", "coverage",
  ".superpowers", ".honeytree",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".o", ".a",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".lock", ".sqlite", ".db",
]);

export function scanDirectory(rootDir) {
  const files = [];

  function walk(dir, relativeBase) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".") {
        if (entry.isDirectory()) continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = relativeBase
        ? `${relativeBase}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        walk(fullPath, relativePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;

        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        files.push({
          absolutePath: fullPath,
          relativePath,
          extension: ext,
          size: stat.size,
          directory: relativeBase || ".",
        });
      }
    }
  }

  walk(rootDir, "");
  return files;
}

export function getGitChurn(rootDir) {
  try {
    const output = execSync("git log --format= --name-only --diff-filter=ACMR", {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const counts = {};
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      counts[trimmed] = (counts[trimmed] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export function scanCodebase(rootDir) {
  const files = scanDirectory(rootDir);
  const churn = getGitChurn(rootDir);

  for (const file of files) {
    file.churn = churn[file.relativePath] || 0;
  }

  return files;
}
