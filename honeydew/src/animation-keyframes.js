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
      groundEffect: { radius: 5, color: "#f5c842" },
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

  pine: [
    // KF1 (0.0s): Ground sparkles - 8×8, sparkles at trunk position
    {
      time: 0.0,
      sprite: parseAnim(
        `
........
........
........
........
........
........
    **
    **
`,
        { "*": "#4a7a3a", ".": null },
      ),
      groundEffect: { radius: 5, color: "#f5c842" },
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
........
........
    tt
    tt
`,
        { t: "#6f4c2f", ".": null },
      ),
    },

    // KF3 (1.0s): Trunk full height - dark brown
    {
      time: 1.0,
      sprite: parseAnim(
        `
........
........
........
........
........
........
    tt
    tt
`,
        { t: "#6f4c2f", ".": null },
      ),
    },

    // KF4 (1.5s): Bottom branches sprout - needles start at base
    {
      time: 1.5,
      sprite: parseAnim(
        `
........
........
........
........
  1111
 1tttt1
    tt
    tt
`,
        { t: "#6f4c2f", "1": "#3a5a36", ".": null },
      ),
    },

    // KF5 (2.0s): Middle branches extend
    {
      time: 2.0,
      sprite: parseAnim(
        `
........
........
........
  222
 22222
 2GGGG2
 2tttt2
    tt
`,
        { t: "#6f4c2f", G: "#3f7132", "2": "#3a5a36", ".": null },
      ),
    },

    // KF6 (2.5s): Upper branches appear - conical shape forming
    {
      time: 2.5,
      sprite: parseAnim(
        `
........
   33
  3333
 33GG33
 3GGGGG3
 3GGGG3
 gttttg
    tt
`,
        { t: "#6f4c2f", g: "#2d5b29", G: "#3f7132", "3": "#4a7a3a", ".": null },
      ),
    },

    // KF7 (3.0s): Top tuft grows
    {
      time: 3.0,
      sprite: parseAnim(
        `
    3
   333
  gGGGg
 gGGGGGg
 gGGGGGg
 gGGGGg
 gttttg
    tt
`,
        { t: "#6f4c2f", g: "#2d5b29", G: "#3f7132", "3": "#4a7a3a", ".": null },
      ),
    },

    // KF8 (3.5s): Needles fill in - brighter green
    {
      time: 3.5,
      sprite: parseAnim(
        `
    g
   ggg
  gGGGg
 gGGGGGg
 gGGGGGG
 gGGGGg
 gttttg
    tt
`,
        { t: "#6f4c2f", g: "#2d5b29", G: "#3f7132", ".": null },
      ),
    },

    // KF9 (4.0s): Full pine - MUST MATCH getSprite("pine", 1.0) EXACTLY
    {
      time: 4.0,
      sprite: parseAnim(
        `
    g
   ggg
  gGGGg
 gGGGGGg
ggGGGGGG
 gGGGGG
    t
    t
`,
        { g: "#2d5b29", G: "#3f7132", t: "#6f4c2f" },
      ),
    },

    // KF10 (4.5s): Glow + slight sway
    {
      time: 4.5,
      sprite: parseAnim(
        `
   g....
  ggg...
 gGGGg..
gGGGGGg.
gGGGGGGg
 gGGGGg.
   t....
   t....
`,
        { g: "#2d5b29", G: "#3f7132", t: "#6f4c2f", ".": null },
      ),
    },
  ],

  birch: [
    // KF1 (0.0s): Ground sparkles - 7×6, sparkles at trunk position
    {
      time: 0.0,
      sprite: parseAnim(
        `
.......
.......
.......
.......
   **
   **
`,
        { "*": "#c4e2ba", ".": null },
      ),
      groundEffect: { radius: 5, color: "#f5c842" },
    },

    // KF2 (0.5s): Trunk base appears - 2 rows, pale white
    {
      time: 0.5,
      sprite: parseAnim(
        `
.......
.......
.......
.......
   bb
   bb
`,
        { b: "#d9d6d2", ".": null },
      ),
    },

    // KF3 (1.0s): Trunk full height - birch white
    {
      time: 1.0,
      sprite: parseAnim(
        `
.......
.......
.......
   ww
   bb
   bb
`,
        { b: "#d9d6d2", w: "#e9e6e2", ".": null },
      ),
    },

    // KF4 (1.5s): Asymmetric branches - thin sparse stubs
    {
      time: 1.5,
      sprite: parseAnim(
        `
.......
.......
 b   b
 bbbbb
   bb
   bb
`,
        { b: "#d9d6d2", ".": null },
      ),
    },

    // KF5 (2.0s): Buds appear - sparse, airy, light green
    {
      time: 2.0,
      sprite: parseAnim(
        `
.......
1    1
11bbb1
1bbbbb1
   bb
   bb
`,
        { b: "#d9d6d2", "1": "#c4e2ba", ".": null },
      ),
    },

    // KF6 (2.5s): Buds thicken - light green filling in
    {
      time: 2.5,
      sprite: parseAnim(
        `
  22
 2ggg2
2gghhhg
 2ggg2
   bb
   bb
`,
        { b: "#d9d6d2", g: "#7cc96a", h: "#a4e28d", "2": "#c4e2ba" },
      ),
    },

    // KF7 (3.0s): Canopy brightens - bright accents appear
    {
      time: 3.0,
      sprite: parseAnim(
        `
  hh...
 hggg..
ggghhh.
 hgggh.
   bb..
   bb..
`,
        { b: "#d9d6d2", g: "#7cc96a", h: "#a4e28d", ".": null },
      ),
    },

    // KF8 (3.5s): Nearly mature - colors deepen slightly
    {
      time: 3.5,
      sprite: parseAnim(
        `
   hh
 hgggh
ggghhgg
 hgggh
   bb
   bb
`,
        { b: "#d9d6d2", g: "#7cc96a", h: "#a4e28d" },
      ),
    },

    // KF9 (4.0s): Full birch - MUST MATCH getSprite("birch", 1.0) EXACTLY
    {
      time: 4.0,
      sprite: parseAnim(
        `
   hh
 hgggh
ggghhgg
 hgggh
   bb
   bb
`,
        { g: "#7cc96a", h: "#a4e28d", b: "#d9d6d2" },
      ),
    },

    // KF10 (4.5s): Glow + sway
    {
      time: 4.5,
      sprite: parseAnim(
        `
  hh...
hgggh..
gghhgg.
hgggh..
  bb...
  bb...
`,
        { g: "#7cc96a", h: "#a4e28d", b: "#d9d6d2", ".": null },
      ),
    },
  ],

  willow: [
    // KF1 (0.0s): Ground sparkles - 11×7, sparkles at trunk position
    {
      time: 0.0,
      sprite: parseAnim(
        `
...........
...........
...........
...........
...........
    **
    **
`,
        { "*": "#9ac98a", ".": null },
      ),
      groundEffect: { radius: 5, color: "#f5c842" },
    },

    // KF2 (0.5s): Trunk base appears - 2 rows
    {
      time: 0.5,
      sprite: parseAnim(
        `
...........
...........
...........
...........
...........
    tt
    tt
`,
        { t: "#8e6238", ".": null },
      ),
    },

    // KF3 (0.9s): Trunk full height
    {
      time: 0.9,
      sprite: parseAnim(
        `
...........
...........
...........
...........
...........
    tt
    tt
`,
        { t: "#8e6238", ".": null },
      ),
    },

    // KF4 (1.3s): Crown buds FIRST - top-down growth pattern unique to willow
    {
      time: 1.3,
      sprite: parseAnim(
        `
...........
...........
...........
   1111
   11111
    tt
    tt
`,
        { t: "#8e6238", "1": "#b4d9a4", ".": null },
      ),
    },

    // KF5 (1.8s): Crown spreads wide - fronds start to droop
    {
      time: 1.8,
      sprite: parseAnim(
        `
...........
...........
  22222
 2222222
 2222222
    tt
    tt
`,
        { t: "#8e6238", "2": "#9ac98a", ".": null },
      ),
    },

    // KF6 (2.4s): Fronds cascade down - gaps form
    {
      time: 2.4,
      sprite: parseAnim(
        `
...........
  33333
 3333333
33 333 33
33     33
    tt
    tt
`,
        { t: "#8e6238", "3": "#9ac98a", ".": null },
      ),
    },

    // KF7 (3.0s): Lower fronds extend - willow curtain forms
    {
      time: 3.0,
      sprite: parseAnim(
        `
   ggggg..
 gggggggg.
gg ggggg gg
gg  ggg  gg
gg       gg
    tt.....
    tt.....
`,
        { t: "#8e6238", g: "#7cc96a", ".": null },
      ),
    },

    // KF8 (3.5s): Fronds fill in - pale mint green
    {
      time: 3.5,
      sprite: parseAnim(
        `
   ggggg
 gggggggg
gg ggggg gg
gg  ggg  gg
gg       gg
    tt
    tt
`,
        { t: "#8e6238", g: "#7cc96a" },
      ),
    },

    // KF9 (4.0s): Full willow - MUST MATCH getSprite("willow", 1.0) EXACTLY
    {
      time: 4.0,
      sprite: parseAnim(
        `
   ggggg
 gggggggg
gg ggggg gg
gg  ggg  gg
gg       gg
    tt
    tt
`,
        { g: "#7cc96a", t: "#8e6238" },
      ),
    },

    // KF10 (4.5s): Glow + gentle sway
    {
      time: 4.5,
      sprite: parseAnim(
        `
 ggggg.....
gggggggg...
ggggg gg...
 ggg  gg...
     gg....
  tt.......
  tt.......
`,
        { g: "#7cc96a", t: "#8e6238", ".": null },
      ),
    },
  ],

  cherry: [
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
        { "*": "#f0d0e0", ".": null },
      ),
      groundEffect: { radius: 5, color: "#f5c842" },
    },

    // KF2 (0.5s): Trunk base appears - 2 rows, light trunk
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
        { t: "#b18552", ".": null },
      ),
    },

    // KF3 (0.9s): Trunk full height - elegant upward branches
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
        { t: "#b18552", w: "#c9a572", ".": null },
      ),
    },

    // KF4 (1.3s): Upward branches extend
    {
      time: 1.3,
      sprite: parseAnim(
        `
........
........
 b   b
 btttb
   tt
   tt
`,
        { t: "#b18552", b: "#c9a572", ".": null },
      ),
    },

    // KF5 (1.8s): White buds radiate from center
    {
      time: 1.8,
      sprite: parseAnim(
        `
........
   1
 11111
 1ttt1
   tt
   tt
`,
        { t: "#b18552", "1": "#f0d0e0", ".": null },
      ),
    },

    // KF6 (2.4s): Buds thicken - white blooms spread
    {
      time: 2.4,
      sprite: parseAnim(
        `
  222...
 22222..
222P222.
 2PPP2..
   tt...
   tt...
`,
        { t: "#b18552", P: "#de93b8", "2": "#f0d0e0", ".": null },
      ),
    },

    // KF7 (3.0s): Pink blush appears - elegant bloom pattern
    {
      time: 3.0,
      sprite: parseAnim(
        `
   pPp
 pPPPPp
pPPpPPPp
 pPPPp
   tt
   tt
`,
        { t: "#b18552", p: "#f0b7cf", P: "#de93b8" },
      ),
    },

    // KF8 (3.5s): Blooms deepen - more pink
    {
      time: 3.5,
      sprite: parseAnim(
        `
   pPp
 pPPPPp
pPPpPPPp
 pPPPpp
   tt
   tt
`,
        { t: "#b18552", p: "#f0b7cf", P: "#de93b8" },
      ),
    },

    // KF9 (4.0s): Full cherry - MUST MATCH getSprite("cherry", 1.0) EXACTLY
    {
      time: 4.0,
      sprite: parseAnim(
        `
   pPp
 pPPPPp
pPPpPPPp
 pPPPpp
   tt
   tt
`,
        { p: "#f0b7cf", P: "#de93b8", t: "#b18552" },
      ),
    },

    // KF10 (4.5s): Glow + soft sway
    {
      time: 4.5,
      sprite: parseAnim(
        `
  pPp...
pPPPPp..
PPpPPPp.
pPPPpp..
  tt....
  tt....
`,
        { p: "#f0b7cf", P: "#de93b8", t: "#b18552", ".": null },
      ),
    },
  ],
};
