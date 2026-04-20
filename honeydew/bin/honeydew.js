#!/usr/bin/env node

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("../src/init.js");
  await init();
} else if (command === "plant") {
  const { plant } = await import("../src/plant.js");
  await plant();
} else if (command === "badge") {
  const { badge } = await import("../src/badge.js");
  await badge();
} else if (command === "md") {
  const { generateForestMd } = await import("../src/markdown.js");
  await generateForestMd();
} else if (!command) {
  const { viewer } = await import("../src/viewer.js");
  await viewer();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: honeytree [init|plant|badge|md]");
  process.exit(1);
}
