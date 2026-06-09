import React from "react";
import { Box, Text, useInput } from "ink";
import { VARIETIES } from "../varieties.js";

const h = React.createElement;

// ASCII reveal art per variety (screenshot-worthy, terminal-safe).
const ART = {
  cherry: "  .::.\n.:(@@):.\n :(@@): \n   ||   ",
  pine: "    ^\n   /^\\\n  /^^^\\\n /^^^^^\\\n   |||  ",
  oak: "   ___\n  (###)\n (#####)\n  (###)\n   |||  ",
  ancient: "  *___*\n (#####)\n(#######)\n (#####)\n  |||||  ",
  mythic: "  *. .*\n .*###*.\n*#######*\n .*###*.\n  |||||  ",
};

export function celebrationFor(key) {
  const v = VARIETIES.find((x) => x.key === key);
  return {
    label: v ? v.label : key,
    art: ART[key] || "  ###\n (###)\n  |||",
  };
}

// Full-screen celebration. Calls onDismiss() when the user presses any key.
export default function UnlockCelebration({ varietyKey, onDismiss }) {
  const { label, art } = celebrationFor(varietyKey);
  useInput(() => onDismiss());

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", justifyContent: "center", height: 18, width: "100%" },
    h(Text, { color: "#f5a50b", bold: true }, "✦  NEW TREE VARIETY UNLOCKED  ✦"),
    h(Box, { height: 1 }),
    h(Text, { color: "#b388ff" }, art),
    h(Box, { height: 1 }),
    h(Text, { bold: true }, label),
    h(Box, { height: 1 }),
    h(Text, { dimColor: true }, "Screenshot this — then press any key to enter your forest")
  );
}
