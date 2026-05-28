import React, { useMemo } from "react";
import { Text } from "ink";

import { renderFrame } from "../renderer.js";
import { getVirtualWidth } from "../plant.js";

const h = React.createElement;

export default function ForestScene({ forest, viewportX, windTick, termWidth, spriteOverride, groundOverlay, groundPulse, rewards }) {
  const frame = useMemo(() => {
    const vw = getVirtualWidth(forest.trees.length, termWidth);
    return renderFrame(forest, termWidth, {
      twinkleSeed: windTick,
      viewportX,
      virtualWidth: vw,
      windTick,
      includeStats: false,
      spriteOverride: spriteOverride ?? undefined,
      groundOverlay: groundOverlay ?? undefined,
      groundPulse: groundPulse ?? false,
      rewards: rewards ?? undefined,
    });
  }, [forest, viewportX, windTick, termWidth, spriteOverride, groundOverlay, groundPulse, rewards]);

  return h(Text, null, frame);
}
