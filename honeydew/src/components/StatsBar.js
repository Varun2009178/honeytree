import React, { useMemo } from "react";
import { Box, Text } from "ink";

import { getStatsData } from "../renderer.js";
import { getVirtualWidth } from "../plant.js";

const h = React.createElement;

const STATS_ACCENT = "#f5a50b";
const STATS_TEXT = "#8e8a84";
const STATS_WARN = "#c4653a";
const STREAK_COLOR = "#e8a33a";
const BAR_FILL = "#6cb95e";
const BAR_EMPTY = "#3d3d3d";

export default function StatsBar({ forest, viewportX, termWidth, rewards }) {
  const vw = getVirtualWidth(forest.trees.length, termWidth);
  const stats = useMemo(
    () => getStatsData(forest, viewportX, vw, termWidth),
    [forest, viewportX, vw, termWidth],
  );

  const barWidth = 12;
  const filledWidth = Math.max(0, Math.min(barWidth, Math.round(stats.progress * barWidth)));

  // Minimap
  let minimap = null;
  if (stats.virtualWidth > stats.termWidth) {
    const mapWidth = 12;
    const viewFraction = stats.termWidth / stats.virtualWidth;
    const thumbWidth = Math.max(1, Math.round(viewFraction * mapWidth));
    const maxOffset = stats.virtualWidth - stats.termWidth;
    const thumbPos = maxOffset > 0
      ? Math.round((stats.viewportX / maxOffset) * (mapWidth - thumbWidth))
      : 0;
    const mapBar =
      "─".repeat(thumbPos) +
      "═".repeat(thumbWidth) +
      "─".repeat(mapWidth - thumbPos - thumbWidth);
    minimap = h(Text, null,
      h(Text, { color: STATS_TEXT }, " ["),
      h(Text, { color: BAR_FILL }, mapBar),
      h(Text, { color: STATS_TEXT }, "]"),
    );
  }

  const streakSegment = stats.wilt > 0
    ? h(Text, { color: STATS_WARN }, `wilting (${stats.idleDays}d idle)`)
    : stats.streak > 0
      ? h(Text, { color: STREAK_COLOR }, `${stats.streak}-day streak`)
      : h(Text, { color: STATS_TEXT }, "no streak");

  const planterBadge = rewards && rewards.planter
    ? h(Text, { color: "#6cb95e" }, " 🌱 Planter")
    : null;

  return h(Box, { flexDirection: "column" },
    h(Box, null,
      h(Text, { color: STATS_ACCENT }, " honeytree"),
      planterBadge,
      h(Text, { color: STATS_TEXT }, ` · ${stats.treeCount} tree${stats.treeCount === 1 ? "" : "s"} · `),
      streakSegment,
      h(Text, { color: STATS_TEXT }, " · "),
      h(Text, { color: BAR_FILL }, "█".repeat(filledWidth)),
      h(Text, { color: BAR_EMPTY }, "░".repeat(barWidth - filledWidth)),
      h(Text, { color: STATS_TEXT }, ` next: ${stats.nextTreeType}`),
      h(Text, { color: "#555555" }, ` [${stats.biomeName}]`),
      minimap,
    ),
    h(Box, null,
      h(Text, { color: "#555555" }, " ← → pan  · ↑↓ select tree  · enter info  · q quit  ·  "),
      h(Text, { color: STATS_ACCENT }, "honeytree badge"),
    ),
  );
}
