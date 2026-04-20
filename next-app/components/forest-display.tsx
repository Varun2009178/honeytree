"use client"

import { useState, useEffect, useMemo } from "react"

// ─── Exact colors from sprites.js ───────────────────────
const C = {
  canopyDark:   '#3f7132',
  canopyMid:    '#5b9a4a',
  canopyLight:  '#7cc96a',
  canopyDeep:   '#2d5b29',
  canopyBright: '#a4e28d',
  trunkDark:    '#6f4c2f',
  trunkMid:     '#8e6238',
  trunkLight:   '#b18552',
  birchTrunk:   '#d9d6d2',
  cherryPink:   '#de93b8',
  cherryBloom:  '#f0b7cf',
}

type Cell = { ch: string; col: string | null }
type SpriteCell = [string, string | null]

interface Sprite {
  rows: SpriteCell[][]
  width: number
}

interface TreeDef {
  type: string
  growth: number
  fx: number
}

interface BiomeDef {
  min: number
  ground: string[]
  density: number
  glyphs: string[]
  colors: string[]
}

function parseSprite(tpl: string, pal: Record<string, string>): Sprite {
  const lines = tpl.trim().split('\n')
  const w = Math.max(...lines.map(l => l.length))
  const rows = lines
    .map(l => l.padEnd(w, ' '))
    .map(l => Array.from(l, (ch): SpriteCell => {
      const col = pal[ch] ?? null
      return col ? ['\u2588', col] : [' ', null]
    }))
    .reverse()
  return { rows, width: w }
}

// ─── Exact sprite templates from sprites.js ──────────────
const SPRITES: Record<string, Record<string, Sprite>> = {
  oak: {
    seed:    parseSprite(` g\n t`,                                    { g: C.canopyMid,   t: C.trunkMid }),
    sapling: parseSprite(` gg\nggg\n t`,                              { g: C.canopyMid,   t: C.trunkMid }),
    young:   parseSprite(`  gg\n gGGg\nggGGgg\n  tt\n  tt`,          { g: C.canopyMid,   G: C.canopyDark, t: C.trunkMid }),
    full:    parseSprite(`   gg\n gGGGG\nggGGGGgg\n gGGGGg\n   tt\n   tt`, { g: C.canopyMid, G: C.canopyDark, t: C.trunkMid }),
  },
  pine: {
    seed:    parseSprite(` g\n t`,                                                    { g: C.canopyDeep, t: C.trunkDark }),
    sapling: parseSprite(`  g\n gg\nggg\n t`,                                        { g: C.canopyDeep, t: C.trunkDark }),
    young:   parseSprite(`   g\n  ggg\n gGGGg\nggGGGG\n   t\n   t`,                 { g: C.canopyDeep, G: C.canopyDark, t: C.trunkDark }),
    full:    parseSprite(`    g\n   ggg\n  gGGGg\n gGGGGGg\nggGGGGGG\n gGGGGG\n    t\n    t`, { g: C.canopyDeep, G: C.canopyDark, t: C.trunkDark }),
  },
  birch: {
    seed:    parseSprite(` g\n b`,                                        { g: C.canopyLight, b: C.birchTrunk }),
    sapling: parseSprite(` gg\nghg\n b`,                                  { g: C.canopyLight, h: C.canopyBright, b: C.birchTrunk }),
    young:   parseSprite(`  hg\n hggg\nggghhg\n  bb\n  bb`,               { g: C.canopyLight, h: C.canopyBright, b: C.birchTrunk }),
    full:    parseSprite(`   hh\n hgggh\nggghhgg\n hgggh\n   bb\n   bb`,  { g: C.canopyLight, h: C.canopyBright, b: C.birchTrunk }),
  },
  willow: {
    seed:    parseSprite(` g\n t`,                                                    { g: C.canopyLight, t: C.trunkMid }),
    sapling: parseSprite(` ggg\nggggg\n ttt`,                                         { g: C.canopyLight, t: C.trunkMid }),
    young:   parseSprite(`  gggg\n gggggg\ngg ggg gg\ngg     gg\n   tt\n   tt`,       { g: C.canopyLight, t: C.trunkMid }),
    full:    parseSprite(`   ggggg\n gggggggg\ngg ggggg gg\ngg  ggg  gg\ngg       gg\n    tt\n    tt`, { g: C.canopyLight, t: C.trunkMid }),
  },
  cherry: {
    seed:    parseSprite(` p\n t`,                                        { p: C.cherryPink,  t: C.trunkLight }),
    sapling: parseSprite(` pp\npPp\n t`,                                  { p: C.cherryBloom, P: C.cherryPink, t: C.trunkLight }),
    young:   parseSprite(`  pP\n pPPp\npPPpPP\n  tt\n  tt`,              { p: C.cherryBloom, P: C.cherryPink, t: C.trunkLight }),
    full:    parseSprite(`   pPp\n pPPPPp\npPPpPPPp\n pPPPpp\n   tt\n   tt`, { p: C.cherryBloom, P: C.cherryPink, t: C.trunkLight }),
  },
}

function getSprite(type: string, growth: number): Sprite {
  const s = SPRITES[type] || SPRITES.oak
  if (growth < 0.2) return s.seed
  if (growth < 0.5) return s.sapling
  if (growth < 0.8) return s.young
  return s.full
}

// ─── Biomes (from renderer.js) ───────────────────────────
const BIOMES: BiomeDef[] = [
  { min: 0,   ground: ['#2a3a28','#1e2d1c'], density: 14, glyphs: ['\u00b7','.',' ',' '],    colors: ['#3a3a3a','#444444'] },
  { min: 10,  ground: ['#22492d','#18361f'], density: 9,  glyphs: ['\u00b7','\u00b7','\u2726','.'],    colors: ['#444444','#5d5d5d'] },
  { min: 25,  ground: ['#1e4a28','#163a1e'], density: 7,  glyphs: ['\u00b7','\u2726','\u2727','\u00b7','.'],colors: ['#4d4d4d','#5d5d5d','#6a6a55'] },
  { min: 50,  ground: ['#1a5230','#124020'], density: 6,  glyphs: ['\u2726','\u2727','\u00b7','\u00b7','.'],colors: ['#5d5d5d','#6d6d5a','#7a7a60'] },
  { min: 100, ground: ['#165a32','#0e4822'], density: 5,  glyphs: ['\u2726','\u2727','\u00b7','\u2726','\u22c6','.'], colors: ['#6d6d5a','#7a7a60','#8a8a6a'] },
]

function getBiome(n: number): BiomeDef {
  let b = BIOMES[0]
  for (const bm of BIOMES) { if (n >= bm.min) b = bm }
  return b
}

// ─── Buffer rendering ────────────────────────────────────
const SKY_ROWS   = 4
const TREE_ROWS  = 7
const GROUND_ROWS = 2
const SCENE_ROWS = SKY_ROWS + TREE_ROWS + GROUND_ROWS

function hash(n: number): number {
  let v = n >>> 0
  v = (Math.imul((v ^ (v >>> 16)), 0x45d9f3b)) >>> 0
  v = (Math.imul((v ^ (v >>> 16)), 0x45d9f3b)) >>> 0
  return ((v ^ (v >>> 16))) >>> 0
}

function mkBuf(w: number, h: number): Cell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ ch: ' ', col: null }))
  )
}

function placeStars(buf: Cell[][], w: number, biome: BiomeDef, seed: number) {
  for (let x = 0; x < w; x++) {
    const h2 = hash(x + w * 17 + seed * 101)
    if (h2 % biome.density !== 0) continue
    const y = h2 % SKY_ROWS
    buf[y][x] = {
      ch:  biome.glyphs[h2 % biome.glyphs.length],
      col: biome.colors[h2 % biome.colors.length],
    }
  }
}

function placeGround(buf: Cell[][], w: number, biome: BiomeDef) {
  const gy = SKY_ROWS + TREE_ROWS
  for (let r = 0; r < GROUND_ROWS; r++) {
    for (let x = 0; x < w; x++) {
      buf[gy + r][x] = { ch: '\u2588', col: biome.ground[r] }
    }
  }
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

function buildBuffer(trees: TreeDef[], cols: number, twinkle: number = 0): Cell[][] {
  const biome = getBiome(trees.length)
  const buf = mkBuf(cols, SCENE_ROWS)
  placeStars(buf, cols, biome, twinkle)
  placeGround(buf, cols, biome)
  const baseY = SKY_ROWS + TREE_ROWS - 1
  for (const t of trees) {
    const x = Math.max(4, Math.min(cols - 4, Math.round(t.fx * (cols - 1))))
    compositeSprite(buf, getSprite(t.type, t.growth), x, baseY, cols)
  }
  return buf
}

// ─── Row renderer (batches same-color runs) ──────────────
function BufRow({ cells }: { cells: Cell[] }) {
  const segs: { col: string | null; txt: string }[] = []
  let i = 0
  while (i < cells.length) {
    const col = cells[i].col
    let txt = ''
    let j = i
    while (j < cells.length && cells[j].col === col) { txt += cells[j].ch; j++ }
    segs.push({ col, txt })
    i = j
  }
  return (
    <div>
      {segs.map((s, k) =>
        s.col
          ? <span key={k} style={{ color: s.col }}>{s.txt}</span>
          : <span key={k}>{s.txt}</span>
      )}
    </div>
  )
}

// ─── Demo tree layout ────────────────────────────────────
const DEMO_TREES: TreeDef[] = [
  { type: 'cherry', growth: 0.90, fx: 0.050 },
  { type: 'oak',    growth: 1.00, fx: 0.120 },
  { type: 'cherry', growth: 0.65, fx: 0.195 },
  { type: 'oak',    growth: 1.00, fx: 0.275 },
  { type: 'pine',   growth: 0.95, fx: 0.355 },
  { type: 'cherry', growth: 0.45, fx: 0.415 },
  { type: 'birch',  growth: 1.00, fx: 0.475 },
  { type: 'oak',    growth: 0.85, fx: 0.545 },
  { type: 'cherry', growth: 0.55, fx: 0.610 },
  { type: 'willow', growth: 1.00, fx: 0.670 },
  { type: 'pine',   growth: 1.00, fx: 0.750 },
  { type: 'birch',  growth: 0.75, fx: 0.820 },
  { type: 'oak',    growth: 1.00, fx: 0.890 },
  { type: 'cherry', growth: 0.40, fx: 0.955 },
]

const FONT_PX = 13
const LINE_H  = 1.28
const CHAR_W  = FONT_PX * 0.601

// ─── Main animated forest ────────────────────────────────
export function ForestDisplay({ containerWidth = 760 }: { containerWidth?: number }) {
  const [visible,  setVisible]  = useState(0)
  const [twinkle,  setTwinkle]  = useState(0)

  useEffect(() => {
    if (visible >= DEMO_TREES.length) return
    const delay = visible === 0 ? 600 : 320
    const t = setTimeout(() => setVisible(v => v + 1), delay)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    const t = setInterval(() => setTwinkle(s => (s + 1) % 999), 1800)
    return () => clearInterval(t)
  }, [])

  const cols = Math.max(40, Math.floor(containerWidth / CHAR_W))
  const buf  = useMemo(
    () => buildBuffer(DEMO_TREES.slice(0, visible), cols, twinkle),
    [visible, cols, twinkle]
  )

  return (
    <pre style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: FONT_PX + 'px',
      lineHeight: LINE_H,
      margin: 0, padding: 0,
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {buf.map((row, ri) => <BufRow key={ri} cells={row} />)}
    </pre>
  )
}

// ─── Mini single-species preview ─────────────────────────
export function MiniTree({ type, cols = 14 }: { type: string; cols?: number }) {
  const biome = BIOMES[2]
  const buf = useMemo(() => {
    const b = mkBuf(cols, SCENE_ROWS)
    placeStars(b, cols, biome, 7 + cols)
    placeGround(b, cols, biome)
    const cx = Math.floor(cols / 2)
    compositeSprite(b, getSprite(type, 1.0), cx, SKY_ROWS + TREE_ROWS - 1, cols)
    return b
  }, [type, cols])

  return (
    <pre style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '11px',
      lineHeight: 1.3,
      margin: 0, padding: 0,
      background: 'transparent',
    }}>
      {buf.map((row, ri) => <BufRow key={ri} cells={row} />)}
    </pre>
  )
}
