import fs from "node:fs";
import path from "node:path";

import { readForest } from "./state.js";
import { renderPlainText, getWiltFactor } from "./renderer.js";

function getBiomeLabel(count) {
  if (count < 10) return "clearing";
  if (count < 25) return "grove";
  if (count < 50) return "woodland";
  if (count < 100) return "old growth";
  return "ancient forest";
}

function getDayCount(createdAt) {
  const created = new Date(createdAt).getTime();
  const diff = Date.now() - created;
  return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)) + 1);
}

function buildMarkdown(forest) {
  const count = forest.trees.length;
  const streak = forest.streak || 0;
  const biome = getBiomeLabel(count);
  const wilt = getWiltFactor(forest.lastActiveDate);
  const days = getDayCount(forest.createdAt);
  const width = Math.min(forest.viewerWidth || 60, 80);

  const art = renderPlainText(forest, width);

  const statParts = [`**${count} tree${count === 1 ? "" : "s"}**`];
  if (wilt > 0) {
    const a = new Date(forest.lastActiveDate + "T00:00:00");
    const b = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    const idle = Math.round((b - a) / (24 * 60 * 60 * 1000));
    statParts.push(`**wilting (${idle}d idle)**`);
  } else if (streak > 0) {
    statParts.push(`**${streak}-day streak**`);
  }
  statParts.push(`**${biome}**`);

  const lines = [
    `<div align="center">`,
    ``,
    `[![honeytree](./honeytree-badge.svg)](https://github.com/Varun2009178/honeytree)`,
    ``,
    statParts.join(" · "),
    ``,
    "```",
    art,
    "```",
    ``,
    `${forest.totalPrompts} prompts over ${days} day${days === 1 ? "" : "s"}`,
    ``,
    `<sub>Grown with <a href="https://github.com/Varun2009178/honeytree">honeytree</a> — a forest that grows in your terminal every time you use Claude Code</sub>`,
    ``,
    `</div>`,
    ``,
  ];

  return lines.join("\n");
}

export async function generateForestMd() {
  const forest = readForest();
  if (!forest) {
    console.error('No forest found. Run "honeytree init" first.');
    process.exit(1);
  }

  const md = buildMarkdown(forest);
  const outPath = path.resolve("FOREST.md");
  fs.writeFileSync(outPath, md);

  console.log(`Written to ${outPath}`);
  console.log("Tip: run `honeytree badge` to generate the badge SVG too.");
}
