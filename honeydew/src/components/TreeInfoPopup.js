import React from "react";
import { Box, Text } from "ink";

const h = React.createElement;

export default function TreeInfoPopup({ tree }) {
  if (!tree) return null;

  const growthPct = Math.round(tree.growth * 100);
  const plantedDate = tree.plantedAt
    ? new Date(tree.plantedAt).toLocaleDateString()
    : "unknown";

  let age = "";
  if (tree.plantedAt) {
    const days = Math.floor((Date.now() - new Date(tree.plantedAt).getTime()) / (24 * 60 * 60 * 1000));
    age = days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
  }

  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "#f5a50b", paddingX: 1 },
    h(Text, { bold: true, color: "#f5a50b" }, ` ${tree.type} `),
    h(Text, { color: "#8e8a84" }, `  Growth:  ${growthPct}%`),
    h(Text, { color: "#8e8a84" }, `  Planted: ${plantedDate}`),
    age ? h(Text, { color: "#8e8a84" }, `  Age:     ${age}`) : null,
    h(Text, { color: "#8e8a84" }, `  ID:      ${tree.id}`),
    h(Text, { dimColor: true }, `  [esc] close`),
  );
}
