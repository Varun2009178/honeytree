import { exec } from "node:child_process";
import { isLoggedIn, loginWithDevice, getAuth } from "./auth.js";
import { readForest } from "./state.js";
import { syncToCloud } from "./sync.js";
import { asciiTree } from "./ascii-tree.js";

const API_URL = process.env.HONEYTREE_API_URL || "https://tryhoney.xyz";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

// ---- Pure helpers (unit-tested) ----

export function formatAvailability({ available, virtualTrees, virtualToNext }) {
  const lines = [];
  lines.push("");
  lines.push("  50 virtual trees = 1 real tree.");
  if (available >= 1) {
    lines.push(`  You have ${available} real tree${available > 1 ? "s" : ""} ready to plant.`);
  } else {
    lines.push("  No real trees ready to plant yet.");
  }
  lines.push(`  ${virtualToNext} virtual trees until your next one. (${virtualTrees} planted so far.)`);
  lines.push("");
  return lines;
}

export function findNewCompletedPlantings(baselineIds, currentPlantings) {
  const seen = new Set(baselineIds);
  return (currentPlantings || []).filter((p) => p.status === "completed" && !seen.has(p.id));
}

export function findNewBadgeLabels(baselineSlugs, currentBadges) {
  const seen = new Set(baselineSlugs);
  return (currentBadges || [])
    .filter((b) => b.unlocked && !seen.has(b.slug))
    .map((b) => b.label);
}

// ---- I/O glue ----

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start \"\"" : "xdg-open";
  exec(`${cmd} "${url}"`, () => {});
}

async function fetchStats() {
  const auth = getAuth();
  if (!auth?.access_token) return null;
  try {
    const res = await fetch(`${API_URL}/api/user/stats`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function plant() {
  if (!isLoggedIn()) {
    console.log("  Linking your terminal first...");
    const ok = await loginWithDevice();
    if (!ok) return;
  }

  // Make sure the server has the latest virtual count.
  const forest = readForest();
  if (forest) await syncToCloud(forest);

  const stats = await fetchStats();
  if (!stats) {
    console.log("  Could not reach Honeytree. Try again in a moment.");
    return;
  }

  for (const line of formatAvailability({
    available: stats.available_to_plant ?? 0,
    virtualTrees: stats.virtual_trees ?? 0,
    virtualToNext: stats.virtual_to_next ?? 50,
  })) {
    console.log(line);
  }

  if ((stats.available_to_plant ?? 0) < 1) {
    return;
  }

  const baselineIds = (stats.plantings || []).map((p) => p.id);
  const baselineBadgeSlugs = (stats.badges || []).filter((b) => b.unlocked).map((b) => b.slug);

  const url = `${API_URL}/dashboard?plant=1`;
  console.log(`  Opening ${url}`);
  console.log("  Complete your payment in the browser — I'll wait here.");
  openBrowser(url);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const latest = await fetchStats();
    if (!latest) continue;
    const newlyPlanted = findNewCompletedPlantings(baselineIds, latest.plantings);
    if (newlyPlanted.length === 0) continue;

    const treesPlanted = newlyPlanted.reduce((s, p) => s + (p.real_trees_planted || 0), 0);
    const newBadges = findNewBadgeLabels(baselineBadgeSlugs, latest.badges);
    const hasBloomer = (latest.badges || []).some((b) => b.slug === "bloomer" && b.unlocked);

    console.log("");
    console.log(asciiTree(hasBloomer));
    console.log(`  🌳 Planted ${treesPlanted} real tree${treesPlanted > 1 ? "s" : ""}!`);
    console.log(`  You've now planted ${latest.real_trees_planted} real tree${latest.real_trees_planted > 1 ? "s" : ""} total.`);
    for (const label of newBadges) {
      console.log(`  🏅 ${label} unlocked!`);
    }
    console.log("  A receipt is on its way to your email.");
    console.log("");
    return;
  }

  console.log("  Still processing — check your dashboard, or run `honeytree plant` again.");
}
