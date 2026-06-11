"use client"

import { useMemo, useState, useEffect, useRef } from "react"

// ─── Colors (matches sprites.js exactly) ─────────────────
const C = {
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
  petalSoft: "#f7d1e0",
  petalBright: "#ffa6c9",
  petalDeep: "#e87aab",
  branch: "#a67c5b",
  mythicGlow: "#b388ff",
  mythicBright: "#e0c3fc",
  mythicCore: "#7c4dff",
  mythicTrunk: "#5e35b1",
  goldTop: "#FFD700",
  goldMid: "#DAA520",
  goldDark: "#B8860B",
  goldTrunk: "#8B7355",
}

type Cell = { ch: string; col: string | null }
type SpriteCell = [string, string | null]
interface Sprite { rows: SpriteCell[][]; width: number }

interface ForestTree {
  type: string
  growth: number
  x: number
  variant?: string | null
  heightBonus?: number
}

interface BiomeDef {
  min: number
  ground: string[]
  density: number
  glyphs: string[]
  colors: string[]
}

function parseSprite(tpl: string, pal: Record<string, string>): Sprite {
  const lines = tpl.trim().split("\n")
  const w = Math.max(...lines.map((l) => l.length))
  const rows = lines
    .map((l) => l.padEnd(w, " "))
    .map((l) =>
      Array.from(l, (ch): SpriteCell => {
        const col = pal[ch] ?? null
        return col ? ["\u2588", col] : [" ", null]
      })
    )
    .reverse()
  return { rows, width: w }
}

const SPRITES: Record<string, Record<string, Sprite>> = {
  oak: {
    seed: parseSprite(` g\n t`, { g: C.canopyMid, t: C.trunkMid }),
    sapling: parseSprite(` gg\nggg\n t`, { g: C.canopyMid, t: C.trunkMid }),
    young: parseSprite(`  gg\n gGGg\nggGGgg\n  tt\n  tt`, { g: C.canopyMid, G: C.canopyDark, t: C.trunkMid }),
    full: parseSprite(`   gg\n gGGGG\nggGGGGgg\n gGGGGg\n   tt\n   tt`, { g: C.canopyMid, G: C.canopyDark, t: C.trunkMid }),
  },
  pine: {
    seed: parseSprite(` g\n t`, { g: C.canopyDeep, t: C.trunkDark }),
    sapling: parseSprite(`  g\n gg\nggg\n t`, { g: C.canopyDeep, t: C.trunkDark }),
    young: parseSprite(`   g\n  ggg\n gGGGg\nggGGGG\n   t\n   t`, { g: C.canopyDeep, G: C.canopyDark, t: C.trunkDark }),
    full: parseSprite(`    g\n   ggg\n  gGGGg\n gGGGGGg\nggGGGGGG\n gGGGGG\n    t\n    t`, { g: C.canopyDeep, G: C.canopyDark, t: C.trunkDark }),
  },
  birch: {
    seed: parseSprite(` g\n b`, { g: C.canopyLight, b: C.birchTrunk }),
    sapling: parseSprite(` gg\nghg\n b`, { g: C.canopyLight, h: C.canopyBright, b: C.birchTrunk }),
    young: parseSprite(`  hg\n hggg\nggghhg\n  bb\n  bb`, { g: C.canopyLight, h: C.canopyBright, b: C.birchTrunk }),
    full: parseSprite(`   hh\n hgggh\nggghhgg\n hgggh\n   bb\n   bb`, { g: C.canopyLight, h: C.canopyBright, b: C.birchTrunk }),
  },
  willow: {
    seed: parseSprite(` g\n t`, { g: C.canopyLight, t: C.trunkMid }),
    sapling: parseSprite(` ggg\nggggg\n ttt`, { g: C.canopyLight, t: C.trunkMid }),
    young: parseSprite(`  gggg\n gggggg\ngg ggg gg\ngg     gg\n   tt\n   tt`, { g: C.canopyLight, t: C.trunkMid }),
    full: parseSprite(`   ggggg\n gggggggg\ngg ggggg gg\ngg  ggg  gg\ngg       gg\n    tt\n    tt`, { g: C.canopyLight, t: C.trunkMid }),
  },
  cherry: {
    seed: parseSprite(` p\n t`, { p: C.cherryPink, t: C.trunkLight }),
    sapling: parseSprite(` pp\npPp\n t`, { p: C.cherryBloom, P: C.cherryPink, t: C.trunkLight }),
    young: parseSprite(`  pP\n pPPp\npPPpPP\n  tt\n  tt`, { p: C.cherryBloom, P: C.cherryPink, t: C.trunkLight }),
    full: parseSprite(`   pPp\n pPPPPp\npPPpPPPp\n pPPPpp\n   tt\n   tt`, { p: C.cherryBloom, P: C.cherryPink, t: C.trunkLight }),
  },
  cherry_blossom: {
    seed: parseSprite(` p\n b`, { p: C.petalSoft, b: C.branch }),
    sapling: parseSprite(` pP\npBp\n b`, { p: C.petalSoft, P: C.petalBright, B: C.petalDeep, b: C.branch }),
    young: parseSprite(`  PB\n PpBp\npBPpBP\n  bb\n  bb`, { p: C.petalSoft, P: C.petalBright, B: C.petalDeep, b: C.branch }),
    full: parseSprite(`   PBp\n pBPPBp\nPBpPBPBP\n pBPPBp\n   bb\n   bb`, { p: C.petalSoft, P: C.petalBright, B: C.petalDeep, b: C.branch }),
  },
  mythic: {
    seed: parseSprite(` m\n t`, { m: C.mythicGlow, t: C.mythicTrunk }),
    sapling: parseSprite(` mm\nmGm\n t`, { m: C.mythicGlow, G: C.mythicBright, t: C.mythicTrunk }),
    young: parseSprite(`  mG\n mGGm\nmGGcGm\n  tt\n  tt`, { m: C.mythicGlow, G: C.mythicBright, c: C.mythicCore, t: C.mythicTrunk }),
    full: parseSprite(`   mGm\n mGGGGm\nmGGccGGm\n mGGGGm\n   tt\n   tt`, { m: C.mythicGlow, G: C.mythicBright, c: C.mythicCore, t: C.mythicTrunk }),
  },
}

// Tall golden tree for the Ancient reward (matches sprites.js ANCIENT_TREE).
const ANCIENT: Record<string, Sprite> = {
  seed: parseSprite(` g\n t`, { g: C.goldTop, t: C.goldTrunk }),
  sapling: parseSprite(` gg\ngGg\n t`, { g: C.goldTop, G: C.goldMid, t: C.goldTrunk }),
  young: parseSprite(`  Tg\n TGGg\nTgGGgT\n  tt\n  tt\n  tt`, { g: C.goldMid, G: C.goldDark, T: C.goldTop, t: C.goldTrunk }),
  full: parseSprite(`   TT\n  TGGT\n TgGGGgT\nTgGGGGgT\n TgGGGg\n   tt\n   tt\n   tt`, { g: C.goldMid, G: C.goldDark, T: C.goldTop, t: C.goldTrunk }),
}

function growthStage(growth: number): "seed" | "sapling" | "young" | "full" {
  if (growth < 0.2) return "seed"
  if (growth < 0.5) return "sapling"
  if (growth < 0.8) return "young"
  return "full"
}

// rows are bottom-first; extra trunk rows at the bottom push the canopy up
// (matches sprites.js addTrunkRows).
function addTrunkRows(sprite: Sprite, n: number): Sprite {
  const bottom = sprite.rows[0] || []
  const trunkRow: SpriteCell[] = bottom.map((cell) =>
    cell && cell[1] ? ["█", cell[1]] : [" ", null]
  )
  const extra = Array.from({ length: n }, () => trunkRow.map((c): SpriteCell => [c[0], c[1]]))
  return { rows: [...extra, ...sprite.rows], width: sprite.width }
}

function getSprite(
  type: string,
  growth: number,
  variant?: string | null,
  heightBonus = 0
): Sprite {
  let sprite =
    variant === "ancient"
      ? ANCIENT[growthStage(growth)]
      : (SPRITES[type] || SPRITES.oak)[growthStage(growth)]
  if (heightBonus > 0) sprite = addTrunkRows(sprite, heightBonus)
  return sprite
}

const BIOMES: BiomeDef[] = [
  { min: 0, ground: ["#2a3a28", "#1e2d1c"], density: 14, glyphs: ["\u00b7", ".", " ", " "], colors: ["#3a3a3a", "#444444"] },
  { min: 10, ground: ["#22492d", "#18361f"], density: 9, glyphs: ["\u00b7", "\u00b7", "\u2726", "."], colors: ["#444444", "#5d5d5d"] },
  { min: 25, ground: ["#1e4a28", "#163a1e"], density: 7, glyphs: ["\u00b7", "\u2726", "\u2727", "\u00b7", "."], colors: ["#4d4d4d", "#5d5d5d", "#6a6a55"] },
  { min: 50, ground: ["#1a5230", "#124020"], density: 6, glyphs: ["\u2726", "\u2727", "\u00b7", "\u00b7", "."], colors: ["#5d5d5d", "#6d6d5a", "#7a7a60"] },
  { min: 100, ground: ["#165a32", "#0e4822"], density: 5, glyphs: ["\u2726", "\u2727", "\u00b7", "\u2726", "\u22c6", "."], colors: ["#6d6d5a", "#7a7a60", "#8a8a6a"] },
]

function getBiome(n: number): BiomeDef {
  let b = BIOMES[0]
  for (const bm of BIOMES) if (n >= bm.min) b = bm
  return b
}

const SKY_ROWS = 4
// Tallest sprite is full ancient (8 rows) plus possible trunk height bonus.
const TREE_ROWS = 11
const GROUND_ROWS = 2
const SCENE_ROWS = SKY_ROWS + TREE_ROWS + GROUND_ROWS

function hash(n: number): number {
  let v = n >>> 0
  v = (Math.imul(v ^ (v >>> 16), 0x45d9f3b)) >>> 0
  v = (Math.imul(v ^ (v >>> 16), 0x45d9f3b)) >>> 0
  return (v ^ (v >>> 16)) >>> 0
}

function mkBuf(w: number, h: number): Cell[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ch: " ", col: null })))
}

function compositeSprite(buf: Cell[][], sprite: Sprite, cx: number, baseY: number, w: number) {
  const ox = cx - Math.floor(sprite.width / 2)
  for (let ri = 0; ri < sprite.rows.length; ri++) {
    const ty = baseY - ri
    if (ty < 0 || ty >= buf.length) continue
    for (let ci = 0; ci < sprite.rows[ri].length; ci++) {
      const tx = ox + ci
      if (tx < 0 || tx >= w) continue
      const [ch, col] = sprite.rows[ri][ci]
      if (col) buf[ty][tx] = { ch, col }
    }
  }
}

function buildForestBuffer(trees: ForestTree[], cols: number, twinkle: number = 0): Cell[][] {
  const biome = getBiome(trees.length)
  const buf = mkBuf(cols, SCENE_ROWS)

  // Stars
  for (let x = 0; x < cols; x++) {
    const h2 = hash(x + cols * 17 + twinkle * 101)
    if (h2 % biome.density !== 0) continue
    const y = h2 % SKY_ROWS
    buf[y][x] = { ch: biome.glyphs[h2 % biome.glyphs.length], col: biome.colors[h2 % biome.colors.length] }
  }

  // Ground
  const gy = SKY_ROWS + TREE_ROWS
  for (let r = 0; r < GROUND_ROWS; r++)
    for (let x = 0; x < cols; x++)
      buf[gy + r][x] = { ch: "\u2588", col: biome.ground[r] }

  // Trees — map x from forest virtual width to display cols
  const maxX = Math.max(...trees.map((t) => t.x), 80)
  const baseY = SKY_ROWS + TREE_ROWS - 1
  for (const t of trees) {
    const displayX = Math.max(2, Math.min(cols - 2, Math.round((t.x / maxX) * (cols - 1))))
    compositeSprite(buf, getSprite(t.type, t.growth, t.variant, t.heightBonus ?? 0), displayX, baseY, cols)
  }

  return buf
}

function BufRow({ cells }: { cells: Cell[] }) {
  const segs: { col: string | null; txt: string }[] = []
  let i = 0
  while (i < cells.length) {
    const col = cells[i].col
    let txt = ""
    let j = i
    while (j < cells.length && cells[j].col === col) { txt += cells[j].ch; j++ }
    segs.push({ col, txt })
    i = j
  }
  return (
    <div>
      {segs.map((s, k) =>
        s.col ? <span key={k} style={{ color: s.col }}>{s.txt}</span> : <span key={k}>{s.txt}</span>
      )}
    </div>
  )
}

const FONT_PX = 12
const LINE_H = 1.28
const CHAR_W = FONT_PX * 0.601

export function UserForestDisplay({ trees }: { trees: ForestTree[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [twinkle, setTwinkle] = useState(0)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(wrapRef.current)
    setWidth(wrapRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTwinkle((s) => (s + 1) % 999), 2000)
    return () => clearInterval(t)
  }, [])

  const cols = Math.max(40, Math.floor(width / CHAR_W))
  const buf = useMemo(() => buildForestBuffer(trees, cols, twinkle), [trees, cols, twinkle])

  return (
    <div ref={wrapRef} className="user-forest-wrap">
      {width > 0 && (
        <pre
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: FONT_PX + "px",
            lineHeight: LINE_H,
            margin: 0,
            padding: 0,
            background: "transparent",
            overflow: "hidden",
          }}
        >
          {buf.map((row, ri) => (
            <BufRow key={ri} cells={row} />
          ))}
        </pre>
      )}
    </div>
  )
}
