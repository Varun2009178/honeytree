import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function resolveHoneydewDir() {
  return process.env.HONEYDEW_DIR || path.join(os.homedir(), ".honeydew");
}

function resolveForestFile() {
  return path.join(resolveHoneydewDir(), "forest.json");
}

export const HONEYDEW_DIR = resolveHoneydewDir();
export const FOREST_FILE = resolveForestFile();

export function getHoneydewDir() {
  return resolveHoneydewDir();
}

export function getForestFile() {
  return resolveForestFile();
}

export function createEmptyForest() {
  return {
    trees: [],
    totalPrompts: 0,
    createdAt: new Date().toISOString(),
    lastActiveDate: new Date().toISOString().slice(0, 10),
    streak: 0,
  };
}

export function readForest() {
  try {
    return JSON.parse(fs.readFileSync(resolveForestFile(), "utf8"));
  } catch {
    return null;
  }
}

export function writeForest(state) {
  const dir = resolveHoneydewDir();
  const file = resolveForestFile();
  fs.mkdirSync(dir, { recursive: true });
  const tmpFile = path.join(
    dir,
    `forest.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`,
  );
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
  fs.renameSync(tmpFile, file);
}
