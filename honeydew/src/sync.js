import { getAuth, saveAuth } from "./auth.js";
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
    const res = await fetch(`${API_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.access_token}`,
      },
      body: JSON.stringify({
        count: forest.totalPrompts,
        streak: forest.streak || 0,
        trees,
      }),
    });

    if (res.ok) {
      auth.lastSyncedPrompts = forest.totalPrompts;
      saveAuth(auth);
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
