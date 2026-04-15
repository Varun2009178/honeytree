#!/usr/bin/env node

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("../src/init.js");
  await init();
} else if (command === "plant") {
  const { plant } = await import("../src/plant.js");
  await plant();
} else if (!command) {
  const { viewer } = await import("../src/viewer.js");
  await viewer();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: honeytree [init|plant]");
  process.exit(1);
}
