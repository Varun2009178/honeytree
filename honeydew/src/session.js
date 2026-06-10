import fs from "node:fs";
import path from "node:path";
import { getHoneydewDir } from "./state.js";

const STALE_MS = 5 * 60 * 1000; // a turn older than this is abandoned

function sessionFile() {
  return path.join(getHoneydewDir(), "active-session.json");
}

export function writeActiveSession(data) {
  const dir = getHoneydewDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionFile(), JSON.stringify(data, null, 2));
}

export function readActiveSession() {
  try {
    return JSON.parse(fs.readFileSync(sessionFile(), "utf8"));
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  try {
    fs.unlinkSync(sessionFile());
  } catch {}
}

export function isStale(session, now = Date.now()) {
  if (!session || typeof session.turnStartedAt !== "number") return true;
  return now - session.turnStartedAt > STALE_MS;
}
