import { getAuth, saveAuth, authedFetch } from "./auth.js";
import { readForest } from "./state.js";

const API_URL = process.env.HONEYTREE_API_URL || "https://www.tryhoney.xyz";

export async function syncToCloud(forest) {
  const auth = getAuth();
  if (!auth || !auth.access_token) return;

  // Send tree data for rendering on the web. variant ("ancient") and
  // heightBonus must travel too, or gold/tall trees mirror as plain short ones.
  const trees = (forest.trees || []).map((t) => ({
    type: t.type,
    growth: t.growth,
    x: t.x,
    ...(t.variant ? { variant: t.variant } : {}),
    ...(t.heightBonus ? { heightBonus: t.heightBonus } : {}),
  }));

  try {
    // authedFetch refreshes the access token and retries once on 401.
    const res = await authedFetch(`${API_URL}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: forest.totalPrompts,
        streak: forest.streak || 0,
        trees,
      }),
    });

    if (res && res.ok) {
      const fresh = getAuth() || auth;
      fresh.lastSyncedPrompts = forest.totalPrompts;
      saveAuth(fresh);
    }
  } catch {
    // Silently fail — sync is best-effort
  }
}

// Immediate sync (called after login)
export async function syncNow() {
  const forest = readForest();
  if (forest) await syncToCloud(forest);
}
