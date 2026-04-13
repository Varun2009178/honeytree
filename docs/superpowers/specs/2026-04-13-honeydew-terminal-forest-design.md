# Honeydew — Terminal Forest for Claude Code

**Date:** 2026-04-13
**Status:** Review

## Overview

Honeydew is an npm package that grows a 2D pixel-art forest in your terminal every time you use Claude Code. Each prompt plants a tree. Run `honeydew` in a separate terminal window to watch your forest grow in real time as you code.

Stardew Valley-style cozy pixel art. Panoramic layout with breathing room, stars in the sky, organic variety. The reward is watching it grow.

## Commands

### `honeydew init`

Sets up Honeydew for use with Claude Code:

1. Creates `~/.honeydew/` directory
2. Creates `~/.honeydew/forest.json` with empty initial state
3. Adds a `Stop` hook to `~/.claude/settings.json` that calls `honeydew plant` after each Claude Code response
4. If hooks already exist, merges into the existing `Stop` array (never overwrites)
5. If honeydew hook is already present, prints "already configured" and exits
6. Prints confirmation with instructions to run `honeydew` in a separate terminal

### `honeydew`

Opens the forest viewer:

1. Reads `~/.honeydew/forest.json`
2. Renders the full forest to the terminal using ANSI block characters
3. Watches `forest.json` via `fs.watch` for changes
4. On change: re-reads state, animates the new tree appearing, re-renders
5. Runs until Ctrl+C
6. Clears screen and restores terminal on exit

### `honeydew plant` (hidden)

Called by the Claude Code hook, never by the user directly:

1. Reads `forest.json`
2. Creates a new tree with random type, random growth (0.3–1.0), random x position (with minimum spacing from existing trees)
3. Nudges all existing partial trees toward full growth (+0.1–0.2 per prompt)
4. Increments `totalPrompts`
5. Writes back to `forest.json`
6. Must complete in <50ms to avoid slowing Claude Code

## Data Model

### `~/.honeydew/forest.json`

```json
{
  "trees": [
    {
      "id": 1,
      "type": "oak",
      "growth": 1.0,
      "x": 24,
      "plantedAt": "2026-04-12T10:30:00Z"
    }
  ],
  "totalPrompts": 42,
  "createdAt": "2026-04-12T10:00:00Z"
}
```

**Fields:**

- `trees[].id` — Auto-incrementing integer
- `trees[].type` — One of: `oak`, `pine`, `birch`, `willow`, `cherry`. Randomly selected on plant.
- `trees[].growth` — Float 0.0 to 1.0. Randomized on creation (some spawn full, some partial). Partial trees grow toward 1.0 on subsequent prompts.
- `trees[].x` — Horizontal position in terminal columns. Randomly placed with minimum spacing (tree width + 2 chars gap).
- `trees[].plantedAt` — ISO timestamp
- `totalPrompts` — Lifetime prompt count
- `createdAt` — When honeydew was initialized

## Claude Code Hook

`honeydew init` adds to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "honeydew plant"
          }
        ]
      }
    ]
  }
}
```

The `Stop` event fires after Claude finishes each response, which triggers `honeydew plant` to add a tree.

## Rendering

### Approach

The terminal is treated as a character grid. Each frame:

1. Build a 2D buffer (array of arrays) sized to terminal width × fixed height
2. Fill sky rows with black (empty) + scattered dim stars
3. Fill ground rows (bottom 2) with dark green blocks
4. For each tree, composite its sprite onto the buffer at position `x`, aligned to ground
5. Draw stats bar at the very bottom
6. Write entire buffer to stdout using ANSI cursor reset (`\x1b[H`) to avoid flicker

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ [sky — black with dim stars · ✦]                        │  ~4 rows
│                                                         │
│        ██           ██                                  │
│       ████         ████            ▄█                   │  ~6 rows
│      ██████       ██████          ▄███                  │  (trees)
│     ████████       ████            ██                   │
│       ████         ████            ██                   │
│ ████████████████████████████████████████████████████████ │  2 rows
│ ████████████████████████████████████████████████████████ │  (ground)
│                                                         │
│  honeydew · 12 trees · 3 days · ████████░░░░ next: oak  │  1 row
└─────────────────────────────────────────────────────────┘
```

Total height: ~15 rows fixed. Width: adapts to `process.stdout.columns`.

### Tree Sprites

5 tree types, each with 4 growth stages (seed, sapling, young, full). Each sprite is a 2D array of `[char, color]` pairs.

**Growth stage mapping:**
- Seed (growth 0.0–0.2): 1–2 blocks, just a sprout
- Sapling (growth 0.2–0.5): short trunk, small canopy ~3 chars wide
- Young (growth 0.5–0.8): taller trunk, medium canopy ~5 chars wide
- Full (growth 0.8–1.0): full size, ~6–10 chars wide depending on type

**Tree silhouettes at full growth:**

- **Oak** — wide round canopy (8 wide), thick trunk
- **Pine** — narrow triangle (6 wide), thin trunk
- **Birch** — medium canopy (6 wide), thin white trunk
- **Willow** — drooping sides (10 wide), medium trunk
- **Cherry** — round canopy like oak but pink-tinted (7 wide)

### Color Palette

| Element | Colors |
|---------|--------|
| Canopy greens | `#2a4`, `#3a5`, `#4a7`, `#5b8`, `#6c9` (varied per tree) |
| Trunks | `#743`, `#854`, `#964` (browns) |
| Birch trunk | `#ccc` (light gray) |
| Cherry canopy | `#d6a` (pink-green) |
| Ground | `#253`, `#142` (dark earth greens) |
| Stars | `#444` (dim gray) |
| Stats label | `#f5a50b` (amber) |
| Stats text | `#888` (gray) |

### Stats Bar

Format: `honeydew · N trees · N days · [progress bar] next: [type]`

- Progress bar shows total trees toward the next milestone (10, 25, 50, 100, 250, 500, 1000)
- `next: [type]` previews what the next random tree type will be (pre-seeded from deterministic hash of tree count)

### Animation

When the viewer detects a new tree in `forest.json`:

- The new tree "grows" from the ground up over ~500ms (render 3–4 intermediate frames)
- Stars twinkle briefly (randomly toggle 1–2 stars)
- Stats bar updates

No continuous animation loop. Only re-renders on file change events.

## Package Structure

```
honeydew/
├── package.json
├── bin/
│   └── honeydew.js       # #!/usr/bin/env node — CLI entry, routes to commands
├── src/
│   ├── init.js           # honeydew init — setup hook + state file
│   ├── plant.js          # honeydew plant — add tree, must be <50ms
│   ├── viewer.js         # honeydew — render loop + fs.watch
│   ├── renderer.js       # ANSI frame buffer, composite trees onto grid
│   ├── sprites.js        # Tree pixel art definitions (5 types × 4 stages)
│   └── state.js          # Read/write ~/.honeydew/forest.json
└── README.md
```

### Dependencies

- `chalk` — ANSI color output (only hard dependency)
- Node built-ins only for everything else: `fs`, `path`, `process`, `crypto`

No build step. Plain JS. `#!/usr/bin/env node` shebang.

### package.json

```json
{
  "name": "honeydew",
  "version": "0.1.0",
  "description": "Grow a pixel-art forest in your terminal every time you use Claude Code",
  "bin": {
    "honeydew": "./bin/honeydew.js"
  },
  "dependencies": {
    "chalk": "^5"
  },
  "engines": {
    "node": ">=18"
  }
}
```

## Edge Cases

- **Viewer not running when tree planted:** No problem. Viewer reads full state on launch. Trees planted while viewer is closed just appear when you open it next.
- **Terminal resize:** Re-render on `SIGWINCH`. Trees that would overflow are clipped or pushed to a "next row" (forest grows downward once a row fills up).
- **Forest gets huge:** Cap rendered trees at what fits the terminal width. Older trees scroll off the left or the forest pans to show the newest section.
- **Concurrent writes:** `plant` reads, modifies, writes atomically (write to temp file, rename). Viewer uses fs.watch debounced to 100ms.
- **No forest.json:** Viewer prints "Run `honeydew init` first" and exits.
- **npm name taken:** Fallback to `honeydew-forest` or `@honeydew/cli`.
