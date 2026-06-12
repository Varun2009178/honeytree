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

export default function StatsBar({ forest, viewportX, termWidth, rewards }) {
  const vw = getVirtualWidth(forest.trees.length, termWidth);
  const stats = useMemo(
    () => getStatsData(forest, viewportX, vw, termWidth),
    [forest, viewportX, vw, termWidth],
  );

  // Minimap
  let minimap = null;
  if (stats.virtualWidth > stats.termWidth) {
    const mapWidth = 12;
    const viewFraction = stats.termWidth / stats.virtualWidth;
    // Clamp everything: viewportX can be stale (resize, forest re-layout) and
    // rounding can overshoot — a negative .repeat() crashes the whole frame.
    const thumbWidth = Math.max(1, Math.min(mapWidth, Math.round(viewFraction * mapWidth)));
    const maxOffset = stats.virtualWidth - stats.termWidth;
    const ratio = maxOffset > 0 ? Math.min(1, Math.max(0, stats.viewportX / maxOffset)) : 0;
    const thumbPos = Math.round(ratio * (mapWidth - thumbWidth));
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

  return h(Box, { flexDirection: "column" },
    h(Box, null,
      h(Text, { color: STATS_ACCENT }, " honeytree"),
      h(Text, { color: STATS_TEXT }, ` · ${stats.treeCount} tree${stats.treeCount === 1 ? "" : "s"} · `),
      streakSegment,
      minimap,
    ),
    h(Box, null,
      h(Text, { color: "#555555" }, " ← → pan  · ↑↓ select tree  · enter info  · q quit  ·  "),
      h(Text, { color: STATS_ACCENT }, "honeytree badge"),
    ),
  );
}
