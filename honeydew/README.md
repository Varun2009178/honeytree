# Honeytree

Grow a pixel-art forest in your terminal every time you use Claude Code.

Each prompt plants a new tree. Each tree grows over time. Your forest evolves from a quiet clearing into an ancient woodland — and it never resets.

## Install

```bash
npm install -g honeytree
```

## Setup

```bash
honeytree init
```

This creates `~/.honeydew/forest.json` and adds a `Stop` hook to your Claude Code settings so a tree is planted after every response.

## Watch your forest

```bash
honeytree
```

Open this in a separate terminal. It watches your forest file and animates new trees as they appear. Press `Ctrl+C` to exit.

## How it works

1. **`honeytree init`** — Creates the forest state file and registers a Claude Code hook
2. **`honeytree`** — Opens the viewer that renders your forest in real time

After init, a tree is automatically planted after every Claude Code response via the hook. Each tree is a random species (oak, pine, birch, willow, or cherry) and growth stage. Existing young trees grow a little each time too.

## Biomes

Your forest evolves as it grows:

| Trees | Biome | What changes |
|-------|-------|-------------|
| 0–9 | Clearing | Sparse stars, light ground |
| 10–24 | Grove | More stars, richer ground |
| 25–49 | Woodland | Dense canopy, varied starlight |
| 50–99 | Old Growth | Deep greens, warm starlight |
| 100+ | Ancient Forest | Richest palette, brightest sky |

Trees are never deleted. The forest only grows.

## Tree types

- **Oak** — Wide, rounded canopy
- **Pine** — Tall, triangular shape
- **Birch** — Light trunk, bright leaves
- **Willow** — Drooping canopy
- **Cherry** — Pink blossoms

Each type has 4 growth stages: seed, sapling, young, and full.

## Requirements

- Node.js 18+
- Claude Code (for the automatic hook)

## License

MIT
