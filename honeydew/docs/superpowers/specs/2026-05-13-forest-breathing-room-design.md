# Forest Breathing Room & Visual Variety

**Date:** 2026-05-13
**Problem:** At 77+ trees, the forest renders as a cramped wall of pixels — uniform canopy band, no visible ground, no sense of space.
**Goals:** Breathing room between trees (B) and visual variety/texture (C).

---

## 1. Virtual Canvas & Spacing

The forest gets a virtual width wider than the terminal, calculated dynamically:

```
virtualWidth = max(terminalWidth, treeCount * TREE_SPACING)
```

- `TREE_SPACING` = 10 columns per tree (up from effective ~1 col/tree at 77 trees in 80 cols)
- `MIN_GAP` increases from 4 to 6 to enforce real breathing room between trunks
- `plant.js` places trees across the full virtual width, not just `viewerWidth`
- Existing tree x-positions are **migrated** on first load: spread proportionally across the new virtual width, preserving relative left-to-right order with randomized jitter to avoid a grid look

## 2. Viewport & Panning

The terminal displays a viewport window into the wider virtual canvas.

**Viewport state:**
- `forest.json` gains a `viewportX` field (default 0)
- Viewport width = terminal width
- Viewport clamps to `[0, virtualWidth - terminalWidth]`

**Panning controls:**
- Left/right arrow keys pan by 4 columns per keypress
- Extends the existing keypress listener in the viewer

**Follow newest tree:**
- When a new tree is detected via file watcher, viewport pans to center on the new tree's x-position
- Growth animation plays at the new viewport position
- User can manually pan away afterward

**Viewport indicator:**
- Minimap-style bar in the stats line: `[===----------]` showing position relative to total width
- Keeps user oriented in large forests

## 3. Height Variation

Trees render at slightly different vertical offsets to break the flat canopy line.

**Per-tree vertical offset:**
- Each tree gets `yOffset`: -1, 0, or +1 rows from the baseline
- Assigned deterministically via `hash(tree.id)` — no extra state needed
- Existing trees derive offset from their ID automatically

**Scene height increase:**
- `TREE_ROWS` increases from 7 to 10 (+3 rows)
- Accommodates tallest sprites shifted up by 1 without clipping, and gives ground detail room
- `SKY_ROWS` (4) and `GROUND_ROWS` (2) remain unchanged

**Rendering:**
- `compositeSprite` uses `treeBaseY - tree.yOffset` instead of fixed `treeBaseY`
- `yOffset = +1` = tree on a rise (higher), `yOffset = -1` = tree in a dip (lower)

## 4. Ground-Level Detail

Procedurally generated small sprites fill the space between tree trunks.

**Detail sprites:**
- 1-2 character wide, 1-2 row tall: mushrooms, rocks, fallen leaves, small bushes, grass tufts
- Defined in `sprites.js` using the same `parse()` system
- Palette matches biome ground colors

**Biome-driven density:**

| Biome | Trees | Detail Level |
|-------|-------|-------------|
| Clearing | 0-9 | None |
| Grove | 10-24 | Sparse — occasional rock or grass tuft |
| Woodland | 25-49 | Moderate — mushrooms, small bushes |
| Old Growth | 50-99 | Dense — fallen leaves, underbrush, mushrooms, rocks |
| Ancient Forest | 100+ | Lush — full ground cover between trees |

**Placement:**
- Procedurally scattered using `hash(x + biomeSeed)` across ground rows and lowest tree row
- Only render in gaps — skip if a tree sprite pixel already occupies the cell
- Generated at render time (deterministic from biome + tree positions), not persisted in `forest.json`

## 5. Migration & Backwards Compatibility

**Forest migration (one-time):**
- On first load with new code, trees clustered in old 80-col range are redistributed across the new virtual width
- Preserves left-to-right ordering; applies randomized jitter of +/-2 columns to avoid grid appearance
- `layoutVersion: 2` field added to `forest.json` — migration runs once
- One-way migration, no backup of old positions

**State format changes:**
- New fields: `viewportX` (number), `layoutVersion` (number)
- All existing fields unchanged
- Older versions of honeytree ignore unknown fields — trees may be off-screen but nothing crashes

## Renderer Priority

- **Terminal**: Primary target for all features
- **VS Code webview**: Secondary — can receive these improvements later

## Out of Scope

- Depth/layering (foreground/background trees with size/brightness variation)
- Auto-panning or screensaver mode
- Mouse drag panning (terminal)
- VS Code-specific rendering changes
