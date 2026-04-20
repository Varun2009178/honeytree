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

## Streaks

Honeytree tracks your coding streak — consecutive days where you use Claude Code.

- **Active streak**: The viewer and badge show your current streak count (e.g. `7-day streak`)
- **Broken streak**: Miss a day and your forest starts **wilting** — trees desaturate toward brown, and fog rolls in across the scene
- **Recovery**: Your next prompt resets the streak to 1 and clears the wilting immediately

The longer you go without coding, the worse it gets:

| Days idle | Effect |
|----------:|--------|
| 1 | Light desaturation, sparse fog |
| 2 | Noticeable browning, moderate fog |
| 3 | Heavy browning, dense fog |
| 4+ | Near-dead forest, thick fog |

Plant a tree to bring it all back to life.

---

## Badge

Generate a badge for your GitHub README that shows your forest stats and links back to [Honeytree](https://github.com/Varun2009178/honeytree):

```bash
honeytree badge
```

This creates a `honeytree-badge.svg` file in your current directory and prints the markdown to embed it:

```markdown
[![honeytree](./honeytree-badge.svg)](https://github.com/Varun2009178/honeytree)
```

The badge displays your tree count and streak status. It links to the [Honeytree repo](https://github.com/Varun2009178/honeytree) so anyone who sees it can install it themselves.

| State | Badge color | Example |
|-------|-------------|---------|
| Active streak | Green | `42 trees · 7d streak` |
| Wilting | Orange-red | `42 trees · wilting` |
| No streak data | Grey | `42 trees` |

Re-run `honeytree badge` any time to update the SVG with your latest stats. Commit it to your repo to keep it current.

---

## FOREST.md

Generate a shareable markdown snapshot of your forest:

```bash
honeytree md
```

This creates a `FOREST.md` in your current directory with:

- Your Honeytree badge (links to the [Honeytree repo](https://github.com/Varun2009178/honeytree))
- Stats: tree count, streak, biome
- A plain-text rendering of your forest (tree silhouettes, stars, ground)
- Total prompts and forest age

Commit `FOREST.md` to your repo root so your team can see the forest. When teammates see it, they can install Honeytree themselves — one install spreads to the whole team.

Run `honeytree badge` first to generate the SVG, then `honeytree md` to generate the markdown that embeds it.

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

## CLI Reference

| Command | Description |
|---------|-------------|
| `honeytree init` | Create forest and register Claude Code hook |
| `honeytree` | Launch the live viewer |
| `honeytree plant` | Plant a tree manually (normally runs via hook) |
| `honeytree badge` | Generate `honeytree-badge.svg` in current directory |
| `honeytree md` | Generate `FOREST.md` in current directory |

---

## Viewer

The viewer adapts to your terminal width — expand your terminal and new trees will spread across the full width.

Press `Ctrl+C` to exit. The viewer shows a summary of your forest when you close it.

### Reading the Stats Bar

Below your forest you'll see a stats bar like this:

```
 honeytree · 42 trees · 7-day streak · ████████░░░░ next: oak [woodland]
```

Here's what each part means:

| Segment | What it tells you |
|---------|-------------------|
| `42 trees` | Total trees in your forest — one planted per prompt, never deleted |
| `7-day streak` | Consecutive days you've used Claude Code. Resets to 1 if you skip a day |
| `wilting (2d idle)` | Appears instead of streak when you've been inactive — your forest is dying |
| `████████░░░░` | Progress bar toward the next milestone (10, 25, 50, 100, 250, 500, 1000 trees) |
| `next: oak` | The species of the next tree that will be planted |
| `[woodland]` | Your current biome — evolves as your tree count grows |

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
