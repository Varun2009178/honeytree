import React from "react";
import { Box, Text } from "ink";

const h = React.createElement;

// Small status line shown while a live turn is streaming.
export default function LiveTree({ tokens }) {
  return h(
    Box,
    {},
    h(Text, { color: "green" }, "● live "),
    h(Text, { color: "yellow" }, `· ${tokens.toLocaleString()} tok`),
  );
}
