#!/usr/bin/env node

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("../src/init.js");
  await init();
} else if (command === "__session") {
  // Hidden: UserPromptSubmit hook — marks the start of a turn (token baseline + chosen tree).
  try {
    const { readStdin } = await import("../src/stdin.js");
    const { startTurn } = await import("../src/turn.js");
    const payload = JSON.parse((await readStdin()) || "{}");
    startTurn(payload);
  } catch {}
} else if (command === "__tick") {
  // Hidden: Stop hook — finalizes this turn's token-sized tree (random fallback).
  const { tick } = await import("../src/plant.js");
  let shape = null;
  try {
    const { readStdin } = await import("../src/stdin.js");
    const { computeTickShape } = await import("../src/turn.js");
    const payload = JSON.parse((await readStdin()) || "{}");
    shape = computeTickShape(payload);
  } catch {}
  await tick(shape);
} else if (command === "plant") {
  const { plant } = await import("../src/plant-real.js");
  await plant();
} else if (command === "badge") {
  const { badge } = await import("../src/badge.js");
  await badge();
} else if (!command) {
  const { viewer } = await import("../src/viewer2d.js");
  await viewer();
} else if (command === "login") {
  const { loginWithDevice } = await import("../src/auth.js");
  const success = await loginWithDevice();
  if (success) {
    const { syncNow } = await import("../src/sync.js");
    console.log("  Syncing your forest...");
    await syncNow();
    console.log("  Forest synced to the cloud.");
  }
} else if (command === "logout") {
  const { clearAuth } = await import("../src/auth.js");
  clearAuth();
  console.log("Logged out.");
} else if (command === "sync") {
  const { isLoggedIn } = await import("../src/auth.js");
  if (!isLoggedIn()) {
    console.log("Not logged in. Run: honeytree login");
    process.exit(1);
  }
  const { syncNow } = await import("../src/sync.js");
  const { syncRewards } = await import("../src/rewards.js");
  console.log("  Syncing forest...");
  await syncNow();
  const rewards = await syncRewards();
  if (rewards && rewards.badges.length > 0) {
    console.log(`  Badges: ${rewards.badges.map(b => b.label).join(", ")}`);
    if (rewards.cherry) console.log("  Cherry blossom trees unlocked!");
  }
  console.log("  Done.");
} else if (command === "rewards") {
  const { isLoggedIn } = await import("../src/auth.js");
  const { syncRewards, printRewardsStatus, getRewards } = await import("../src/rewards.js");
  if (isLoggedIn()) {
    console.log("  Fetching rewards...");
    await syncRewards();
  }
  printRewardsStatus(getRewards().realTrees || 0);
} else if (command === "status") {
  const { getAuth } = await import("../src/auth.js");
  const auth = getAuth();
  if (auth && auth.username) {
    console.log(`Logged in as ${auth.username}`);
  } else {
    console.log("Not logged in. Run: honeytree login");
  }
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: honeytree [init|login|plant|badge|logout|sync|status|rewards]");
  process.exit(1);
}
