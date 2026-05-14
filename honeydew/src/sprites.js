export const TREE_TYPES = ["oak", "pine", "birch", "willow", "cherry"];

const COLORS = {
  canopyDark: "#3f7132",
  canopyMid: "#5b9a4a",
  canopyLight: "#7cc96a",
  canopyDeep: "#2d5b29",
  canopyBright: "#a4e28d",
  trunkDark: "#6f4c2f",
  trunkMid: "#8e6238",
  trunkLight: "#b18552",
  birchTrunk: "#d9d6d2",
  cherryPink: "#de93b8",
  cherryBloom: "#f0b7cf",
};

const DETAIL_COLORS = {
  mushroom: "#c4a882",
  mushroomCap: "#9e4a3a",
  rock: "#6b6b6b",
  rockLight: "#8a8a8a",
  grass: "#4a7a3a",
  grassLight: "#6ba85a",
  leaf: "#8a6a3a",
  leafDark: "#6a4a2a",
  bush: "#3a6a2a",
  bushLight: "#5a8a4a",
};

function parse(template, palette) {
  const lines = template.trim().split("\n");
  const width = Math.max(...lines.map((line) => line.length));
  const rows = lines
    .map((line) => line.padEnd(width, " "))
    .map((line) =>
      Array.from(line, (token) => {
        const color = palette[token] ?? null;
        return color ? ["█", color] : [" ", null];
      }),
    )
    .reverse();

  return { rows, width };
}

const SPRITES = {
  oak: {
    seed: parse(
      `
 g
 t
`,
      { g: COLORS.canopyMid, t: COLORS.trunkMid },
    ),
    sapling: parse(
      `
 gg
ggg
 t
`,
      { g: COLORS.canopyMid, t: COLORS.trunkMid },
    ),
    young: parse(
      `
  gg
 gGGg
ggGGgg
  tt
  tt
`,
      { g: COLORS.canopyMid, G: COLORS.canopyDark, t: COLORS.trunkMid },
    ),
    full: parse(
      `
   gg
 gGGGG
ggGGGGgg
 gGGGGg
   tt
   tt
`,
      { g: COLORS.canopyMid, G: COLORS.canopyDark, t: COLORS.trunkMid },
    ),
  },
  pine: {
    seed: parse(
      `
 g
 t
`,
      { g: COLORS.canopyDeep, t: COLORS.trunkDark },
    ),
    sapling: parse(
      `
  g
 gg
ggg
 t
`,
      { g: COLORS.canopyDeep, t: COLORS.trunkDark },
    ),
    young: parse(
      `
   g
  ggg
 gGGGg
ggGGGG
   t
   t
`,
      { g: COLORS.canopyDeep, G: COLORS.canopyDark, t: COLORS.trunkDark },
    ),
    full: parse(
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
      { g: COLORS.canopyDeep, G: COLORS.canopyDark, t: COLORS.trunkDark },
    ),
  },
  birch: {
    seed: parse(
      `
 g
 b
`,
      { g: COLORS.canopyLight, b: COLORS.birchTrunk },
    ),
    sapling: parse(
      `
 gg
ghg
 b
`,
      { g: COLORS.canopyLight, h: COLORS.canopyBright, b: COLORS.birchTrunk },
    ),
    young: parse(
      `
  hg
 hggg
ggghhg
  bb
  bb
`,
      { g: COLORS.canopyLight, h: COLORS.canopyBright, b: COLORS.birchTrunk },
    ),
    full: parse(
      `
   hh
 hgggh
ggghhgg
 hgggh
   bb
   bb
`,
      { g: COLORS.canopyLight, h: COLORS.canopyBright, b: COLORS.birchTrunk },
    ),
  },
  willow: {
    seed: parse(
      `
 g
 t
`,
      { g: COLORS.canopyLight, t: COLORS.trunkMid },
    ),
    sapling: parse(
      `
 ggg
ggggg
 ttt
`,
      { g: COLORS.canopyLight, t: COLORS.trunkMid },
    ),
    young: parse(
      `
  gggg
 gggggg
gg ggg gg
gg     gg
   tt
   tt
`,
      { g: COLORS.canopyLight, t: COLORS.trunkMid },
    ),
    full: parse(
      `
   ggggg
 gggggggg
gg ggggg gg
gg  ggg  gg
gg       gg
    tt
    tt
`,
      { g: COLORS.canopyLight, t: COLORS.trunkMid },
    ),
  },
  cherry: {
    seed: parse(
      `
 p
 t
`,
      { p: COLORS.cherryPink, t: COLORS.trunkLight },
    ),
    sapling: parse(
      `
 pp
pPp
 t
`,
      { p: COLORS.cherryBloom, P: COLORS.cherryPink, t: COLORS.trunkLight },
    ),
    young: parse(
      `
  pP
 pPPp
pPPpPP
  tt
  tt
`,
      { p: COLORS.cherryBloom, P: COLORS.cherryPink, t: COLORS.trunkLight },
    ),
    full: parse(
      `
   pPp
 pPPPPp
pPPpPPPp
 pPPPpp
   tt
   tt
`,
      { p: COLORS.cherryBloom, P: COLORS.cherryPink, t: COLORS.trunkLight },
    ),
  },
};

const GROUND_DETAILS = {
  mushroom: parse(
    `
rr
 t
`,
    { r: DETAIL_COLORS.mushroomCap, t: DETAIL_COLORS.mushroom },
  ),
  rock: parse(
    `
rR
`,
    { r: DETAIL_COLORS.rock, R: DETAIL_COLORS.rockLight },
  ),
  grass: parse(
    `
gG
`,
    { g: DETAIL_COLORS.grass, G: DETAIL_COLORS.grassLight },
  ),
  leaf: parse(
    `
lL
`,
    { l: DETAIL_COLORS.leaf, L: DETAIL_COLORS.leafDark },
  ),
  bush: parse(
    `
bB
`,
    { b: DETAIL_COLORS.bush, B: DETAIL_COLORS.bushLight },
  ),
};

export const GROUND_DETAIL_TYPES = Object.keys(GROUND_DETAILS);

export function getGroundDetail(type) {
  const detail = GROUND_DETAILS[type];
  if (!detail) {
    throw new Error(`Unknown ground detail type: ${type}`);
  }
  return detail;
}

function getGrowthStage(growth) {
  if (growth < 0.2) return "seed";
  if (growth < 0.5) return "sapling";
  if (growth < 0.8) return "young";
  return "full";
}

export function getSprite(type, growth) {
  const spriteSet = SPRITES[type];
  if (!spriteSet) {
    throw new Error(`Unknown tree type: ${type}`);
  }
  return spriteSet[getGrowthStage(growth)];
}
