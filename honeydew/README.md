# Honeytree

[![npm version](https://img.shields.io/npm/v/honeytree.svg)](https://www.npmjs.com/package/honeytree)
[![license](https://img.shields.io/npm/l/honeytree.svg)](https://github.com/Varun2009178/honeytree/blob/main/LICENSE)

Grow a pixel-art forest in your terminal every time you use Claude Code.

Each prompt plants a new tree. Each tree grows over time. Your forest evolves from a quiet clearing into an ancient woodland — and it never resets.

---

## Quick Start

```bash
npm install -g honeytree
honeytree init
honeytree
```

That's it. Three commands:

1. **Install** the CLI globally
2. **Init** creates your forest file and registers a Claude Code hook
3. **Run the viewer** in a separate terminal to watch your forest grow

After setup, trees are planted automatically after every Claude Code response. No manual steps needed.

---

## How It Works

When you run `honeytree init`, it does two things:

- Creates `~/.honeydew/forest.json` to store your forest state
- Adds a `Stop` hook to `~/.claude/settings.json` that runs after every Claude Code response

From then on, every time Claude Code responds to a prompt, a new tree is planted in your forest automatically. Open the viewer in a second terminal to watch them grow in real time.

---

## Biomes

Your forest evolves visually as it grows — the sky, ground, and atmosphere all change:

| Trees | Biome | What changes |
|------:|-------|-------------|
| 0–9 | Clearing | Sparse stars, light ground |
| 10–24 | Grove | More stars, richer ground |
| 25–49 | Woodland | Dense canopy, varied starlight |
| 50–99 | Old Growth | Deep greens, warm starlight |
| 100+ | Ancient Forest | Richest palette, brightest sky |

Trees are never deleted. The forest only grows.

---

## Tree Species

Five species are randomly assigned when a tree is planted:

| Species | Look |
|---------|------|
| Oak | Wide, rounded canopy |
| Pine | Tall, triangular shape |
| Birch | Light trunk, bright leaves |
| Willow | Drooping canopy |
| Cherry | Pink blossoms |

Each species has 4 growth stages (seed, sapling, young, full). Existing trees grow a little with each new prompt.

---

## Viewer

The viewer adapts to your terminal width — expand your terminal and new trees will spread across the full width.

Press `Ctrl+C` to exit. The viewer shows a summary of your forest when you close it.

---

## Requirements

- Node.js 18+
- [Claude Code](https://claude.com/claude-code) (for the automatic hook)

## Links

- **npm**: [npmjs.com/package/honeytree](https://www.npmjs.com/package/honeytree)
- **GitHub**: [github.com/Varun2009178/honeytree](https://github.com/Varun2009178/honeytree)
- **Issues**: [github.com/Varun2009178/honeytree/issues](https://github.com/Varun2009178/honeytree/issues)

## License

MIT
