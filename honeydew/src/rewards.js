import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { VARIETIES } from "./varieties.js";

const REWARDS_FILE = path.join(os.homedir(), ".honeydew", "rewards.json");

const TIERS = [
  { slug: "cherry",  label: "Cherry Blossom", threshold: 1,  description: "Cherry blossom trees in your forest" },
  { slug: "pine",    label: "Pine",           threshold: 2,  description: "Evergreen pines in your forest" },
  { slug: "oak",     label: "Oak",            threshold: 4,  description: "Broad oaks in your forest" },
  { slug: "ancient", label: "Ancient",        threshold: 7,  description: "Rare tall golden ancients" },
  { slug: "mythic",  label: "Mythic",         threshold: 10, description: "Glowing mythic trees" },
];

export { TIERS };

export function getRewards() {
  try {
    const data = JSON.parse(fs.readFileSync(REWARDS_FILE, "utf8"));
    if (!Array.isArray(data.celebrated)) data.celebrated = [];
    return data;
  } catch {
    return { badges: [], cherry: false, pine: false, oak: false, ancient: false, mythic: false, celebrated: [], username: "" };
  }
}

export function saveRewards(data) {
  const dir = path.dirname(REWARDS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REWARDS_FILE, JSON.stringify(data, null, 2));
}

export function hasReward(slug) {
  return getRewards()[slug] === true;
}

// Back-compat alias used by the renderer's blossom branch.
export function hasCherryBlossom() { return hasReward("cherry"); }

// Fetch rewards from server and cache locally
export async function syncRewards(apiUrl) {
  apiUrl = apiUrl || process.env.HONEYTREE_API_URL || "https://tryhoney.xyz";
  const { getAuth } = await import("./auth.js");
  const auth = getAuth();
  if (!auth || !auth.access_token) return null;

  try {
    const res = await fetch(`${apiUrl}/api/rewards`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });

    if (!res.ok) return null;

    const { rewards } = await res.json();
    const unlocked = rewards.filter((r) => r.unlocked);
    const slugs = unlocked.map((r) => r.slug);

    const data = {
      badges: unlocked.map((r) => ({ slug: r.slug, label: r.label, description: r.description })),
      cherry: slugs.includes("cherry"),
      pine: slugs.includes("pine"),
      oak: slugs.includes("oak"),
      ancient: slugs.includes("ancient"),
      mythic: slugs.includes("mythic"),
      celebrated: getRewards().celebrated,
      username: auth.username || "",
    };

    saveRewards(data);
    return data;
  } catch {
    return null;
  }
}

// Print rewards status to console
export function printRewardsStatus(realTreesPlanted = 0) {
  const rewards = getRewards();
  console.log();
  console.log("  Honeytree Rewards");
  console.log("  ─────────────────");
  for (const tier of TIERS) {
    const unlocked = rewards[tier.slug] === true;
    if (unlocked) {
      console.log(`  ✅ ${tier.label} (${tier.threshold} tree${tier.threshold > 1 ? "s" : ""}) — ${tier.description}`);
    } else {
      const remaining = tier.threshold - realTreesPlanted;
      const progress = remaining > 0 ? `${remaining} more real tree${remaining > 1 ? "s" : ""} to go` : "ready to unlock";
      console.log(`  🔒 ${tier.label} (${tier.threshold} tree${tier.threshold > 1 ? "s" : ""}) — ${progress}`);
    }
  }
  console.log();
}

// Unlocked variety keys (always includes "standard"), read from the local cache.
export function getUnlockedVarietyKeys() {
  const r = getRewards();
  return VARIETIES.filter((v) => v.key === "standard" || r[v.key] === true).map((v) => v.key);
}

// Mark a variety's celebration as shown (idempotent).
export function markCelebrated(key) {
  const r = getRewards();
  if (!Array.isArray(r.celebrated)) r.celebrated = [];
  if (!r.celebrated.includes(key)) {
    r.celebrated.push(key);
    saveRewards(r);
  }
}

// Unlocked varieties (excluding standard) whose celebration has not been shown.
export function uncelebratedUnlocked() {
  const r = getRewards();
  const celebrated = new Set(r.celebrated || []);
  return VARIETIES
    .filter((v) => v.key !== "standard" && r[v.key] === true && !celebrated.has(v.key))
    .map((v) => v.key);
}
