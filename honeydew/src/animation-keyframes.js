/**
 * Animation keyframes for tree growth
 * Each keyframe defines a sprite at a specific time in the animation
 */

/**
 * Parse animation template with support for bud characters
 * Similar to sprites.js parse(), but supports special tokens:
 * - Regular letters → "█" with palette color
 * - "1" → "░" with palette["1"] color (light bud)
 * - "2" → "▒" with palette["2"] color (medium bud)
 * - "3" → "░" with palette["3"] color (bud variant)
 */
export function parseAnim(template, palette) {
  const lines = template.trim().split("\n");
  const width = Math.max(...lines.map((line) => line.length));
  const rows = lines
    .map((line) => line.padEnd(width, " "))
    .map((line) =>
      Array.from(line, (token) => {
        const color = palette[token] ?? null;
        if (!color) return [" ", null];

        // Special bud tokens
        if (token === "1") return ["░", color];
        if (token === "2") return ["▒", color];
        if (token === "3") return ["░", color];

        // Regular token → solid block
        return ["█", color];
      }),
    )
    .reverse();

  return { rows, width };
}

/**
 * Animation keyframes for each tree type
 * Each keyframe has:
 * - time: seconds into animation
 * - sprite: result from parseAnim
 * - groundEffect: optional { radius, color }
 */
export const ANIMATION_KEYFRAMES = {
  oak: [
    // KF1 (0.0s): Ground sparkles - 8×6, sparkles at trunk position
    {
      time: 0.0,
      sprite: parseAnim(
        `
........
........
........
........
   **
   **
`,
        { "*": "#a4e28d", ".": null },
      ),
      groundEffect: { radius: 3, color: "#4a5a48" },
    },

    // KF2 (0.5s): Trunk base appears - 2 rows of trunk
    {
      time: 0.5,
      sprite: parseAnim(
        `
........
........
........
........
   tt
   tt
`,
        { t: "#8e6238", ".": null },
      ),
    },

    // KF3 (0.9s): Trunk full height - fresh wood at top
    {
      time: 0.9,
      sprite: parseAnim(
        `
........
........
........
   ww
   tt
   tt
`,
        { t: "#8e6238", w: "#b18552", ".": null },
      ),
    },

    // KF4 (1.2s): Bare branches - brown stubs extend from trunk
    {
      time: 1.2,
      sprite: parseAnim(
        `
........
........
 b    b
 btttb
   tt
   tt
`,
        { t: "#8e6238", b: "#8e6238", ".": null },
      ),
    },

    // KF5 (1.5s): Wide branches - stubs reach further
    {
      time: 1.5,
      sprite: parseAnim(
        `
........
........
b  t  b
 btttb
   tt
   tt
`,
        { t: "#8e6238", b: "#8e6238", ".": null },
      ),
    },

    // KF6 (2.0s): First buds - light green ░ around branches
    {
      time: 2.0,
      sprite: parseAnim(
        `
........
1  1
11ttt11
 1ttt1
   tt
   tt
`,
        { t: "#8e6238", "1": "#a4e28d", ".": null },
      ),
    },

    // KF7 (2.5s): Buds thicken - ▒ characters, denser
    {
      time: 2.5,
      sprite: parseAnim(
        `
 22
2GGGGG2
22GGGG22
 2GGGG2
   tt
   tt
`,
        { t: "#8e6238", G: "#7cc96a", "2": "#a4e28d" },
      ),
    },

    // KF8 (3.2s): Canopy solid, pale - yellow-green palette
    {
      time: 3.2,
      sprite: parseAnim(
        `
   ll
 lLLLL
llLLLLll
 lLLLLl
   tt
   tt
`,
        { t: "#8e6238", l: "#a4e28d", L: "#7cc96a" },
      ),
    },

    // KF9 (4.0s): Canopy ripened - MUST MATCH getSprite("oak", 1.0) EXACTLY
    {
      time: 4.0,
      sprite: parseAnim(
        `
gg
 gGGGG
ggGGGGgg
 gGGGGg
   tt
   tt
`,
        { g: "#5b9a4a", G: "#3f7132", t: "#8e6238" },
      ),
    },

    // KF10 (4.5s): Glow + sway - brightened colors, shifted 1px left
    {
      time: 4.5,
      sprite: parseAnim(
        `
bg
bgGGGG
bgGGGGgg
bgGGGGg
  tt
  tt
`,
        { b: "#a4e28d", g: "#5b9a4a", G: "#3f7132", t: "#8e6238" },
      ),
    },
  ],
};
