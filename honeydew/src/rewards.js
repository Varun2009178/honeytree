import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REWARDS_FILE = path.join(os.homedir(), ".honeydew", "rewards.json");

const TIERS = [
  { slug: "planter", label: "Planter", threshold: 1, description: "Badge on status line" },
  { slug: "bloomer", label: "Bloomer", threshold: 5, description: "Cherry blossom canopy in forest" },
  { slug: "grove", label: "Grove", threshold: 10, description: "Teal ground and trunk palette" },
  { slug: "ancient", label: "Ancient Forest", threshold: 25, description: "Rare tall golden trees" },
  { slug: "legend", label: "Legend", threshold: 50, description: "Username above your forest" },
];

export { TIERS };

export function getRewards() {
  try {
    return JSON.parse(fs.readFileSync(REWARDS_FILE, "utf8"));
  } catch {
    return { badges: [], planter: false, bloomer: false, grove: false, ancient: false, legend: false, username: "" };
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

// Back-compat aliases
export function hasCherryBlossom() { return hasReward("bloomer"); }
export function hasGroveStatus() { return hasReward("grove"); }

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
      planter: slugs.includes("planter"),
      bloomer: slugs.includes("bloomer"),
      grove: slugs.includes("grove"),
      ancient: slugs.includes("ancient"),
      legend: slugs.includes("legend"),
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
