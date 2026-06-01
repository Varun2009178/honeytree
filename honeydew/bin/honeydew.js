#!/usr/bin/env node

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("../src/init.js");
  await init();
} else if (command === "__tick") {
  // Hidden: invoked by the Claude Code Stop hook to grow the forest each prompt.
  const { tick } = await import("../src/plant.js");
  await tick();
} else if (command === "plant") {
  const { plant } = await import("../src/plant-real.js");
  await plant();
} else if (command === "badge") {
  const { badge } = await import("../src/badge.js");
  await badge();
} else if (command === "md") {
  const { generateForestMd } = await import("../src/markdown.js");
  await generateForestMd();
} else if (!command) {
  const { viewer } = await import("../src/viewer2d.js");
  await viewer();
} else if (command === "view") {
  const targetDir = process.argv[3] || process.cwd();
  const { viewer } = await import("../src/viewer3d.js");
  await viewer(targetDir);
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
    if (rewards.cherry_blossom) console.log("  Cherry blossom trees unlocked!");
    if (rewards.grove) console.log("  Grove status unlocked — teal palette active!");
  }
  console.log("  Done.");
} else if (command === "rewards") {
  const { isLoggedIn } = await import("../src/auth.js");
  const { syncRewards, printRewardsStatus } = await import("../src/rewards.js");
  const { readForest } = await import("../src/state.js");
  if (isLoggedIn()) {
    console.log("  Fetching rewards...");
    await syncRewards();
  }
  const forest = readForest();
  const realTrees = 0; // local doesn't know real trees; printRewardsStatus uses cached data
  printRewardsStatus(realTrees);
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
  console.error("Usage: honeytree [init|login|plant|view <dir>|badge|md|logout|sync|status|rewards]");
  process.exit(1);
}
