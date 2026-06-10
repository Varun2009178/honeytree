# Honeytree

> *your codebase is a forest*

[![npm version](https://img.shields.io/npm/v/honeytree.svg)](https://www.npmjs.com/package/honeytree)
[![license](https://img.shields.io/npm/l/honeytree.svg)](https://github.com/Varun2009178/honeytree/blob/main/LICENSE)

Honeytree grows a pixel-art forest in your terminal as you code with Claude Code. Then it lets you plant real ones.

## Quick start

```bash
npm install -g honeytree@latest
honeytree init
honeytree login
honeytree
```

`honeytree init` registers a Claude Code hook that plants a tree after every prompt. `honeytree login` links your terminal to your account so your forest syncs to the cloud. Open a second terminal pane, run `honeytree`, and watch your forest grow in real time.

**Live growth:** keep `honeytree` open in a second pane while you use Claude Code — the
current turn's tree grows in real time as the response streams, and bigger turns grow
taller trees. One prompt still plants one tree.

## Tree varieties

New trees are drawn from the varieties you've unlocked. Everyone starts with the
standard species (birch, willow); planting real trees unlocks more:

| Variety | Real trees | Look |
|---------|-----------|------|
| Cherry Blossom | 1 | Pink blossom canopy |
| Pine | 5 | Tall evergreen |
| Oak | 10 | Broad rounded canopy |
| Ancient | 25 | Rare tall golden tree |
| Mythic | 50 | Glowing purple tree |

The first time a new variety is unlocked, the viewer opens with a full-screen
celebration screen. Check progress anytime with `honeytree rewards`.

## Plant real trees

```bash
honeytree plant
```

`honeytree plant` shows how many real trees you've unlocked (every 50 virtual trees = 1 real tree), opens a $1 checkout via the Good API, then prints your receipt and any newly-unlocked varieties right in the terminal. A keepsake receipt also lands in your inbox.

## Your public profile

Every account gets a public profile at `tryhoney.xyz/<username>` — your forest, totals,
CO₂ impact, and unlocked varieties, ready to share.

---

## CLI reference

| Command | What it does |
|---------|-------------|
| `honeytree` | Open the forest viewer |
| `honeytree init` | Register Claude Code hook |
| `honeytree plant` | Plant your unlocked real trees |
| `honeytree login` | Link terminal to your account |
| `honeytree logout` | Remove stored credentials |
| `honeytree sync` | Push forest to cloud |
| `honeytree rewards` | Show variety unlocks and progress |
| `honeytree status` | Check login status |
| `honeytree badge` | Generate `honeytree-badge.svg` |

---

## Requirements

- Node.js 18+
- A terminal with true color support (most modern terminals)

## Links

- **npm**: [npmjs.com/package/honeytree](https://www.npmjs.com/package/honeytree)
- **GitHub**: [github.com/Varun2009178/honeytree](https://github.com/Varun2009178/honeytree)
- **Issues**: [github.com/Varun2009178/honeytree/issues](https://github.com/Varun2009178/honeytree/issues)

## License

MIT
