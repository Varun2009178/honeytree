<div align="center">

# Every Claude Code prompt plants a tree.

**Honeytree grows a pixel-art forest in your terminal as you code with Claude Code.**
**Then it lets you plant real ones.**

[![npm version](https://img.shields.io/npm/v/honeytree.svg)](https://www.npmjs.com/package/honeytree)
[![license](https://img.shields.io/npm/l/honeytree.svg)](https://github.com/Varun2009178/honeytree/blob/main/LICENSE)

</div>

## Quick start

```bash
npm install -g honeytree@latest
honeytree init
honeytree login
honeytree
```

`honeytree init` registers a [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks) that plants a tree after every prompt. `honeytree login` links your terminal to your account so your forest syncs to the cloud. Open a second terminal pane, run `honeytree`, and watch your forest grow in real time.

### Watch it grow in real time

Run `honeytree` in a second terminal pane while you work. As Claude Code streams a
response, the current turn's tree **grows live** — bigger responses grow taller trees.
Each turn plants exactly one tree; the size reflects how much that turn actually produced.

---

## Tree varieties

New trees are drawn from the varieties you've unlocked. Everyone starts with the
standard species (birch, willow); planting **real trees** unlocks more:

| Variety | Real trees | Look |
|---------|-----------|------|
| Cherry Blossom | 1 | Pink blossom canopy |
| Pine | 5 | Tall evergreen |
| Oak | 10 | Broad rounded canopy |
| Ancient | 25 | Rare tall golden tree |
| Mythic | 50 | Glowing purple tree |

The first time a new variety is unlocked, the viewer opens with a full-screen
celebration. Varieties stack — your forest keeps growing from the full unlocked pool.

## Plant real trees

Every **50 virtual trees** unlocks a real tree planting for **$1** through [Good API](https://thegoodapi.com).

```bash
honeytree plant     # plant your unlocked real trees
honeytree rewards   # check your variety unlocks
```

`honeytree plant` opens a $1 checkout, prints your receipt in the terminal, and unlocks varieties as you hit thresholds. A keepsake receipt also lands in your inbox.

## Your public profile

Every account gets a public profile at `tryhoney.xyz/<username>` — your forest, total
virtual trees, real trees planted, CO₂ impact, and unlocked varieties, ready to share.

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
- A terminal with 24-bit color (iTerm2, Kitty, Windows Terminal, Ghostty — most modern terminals work)

---

<div align="center">

**Free and open source. Auth and payments are entirely opt-in. Your forest works offline forever.**

[npm](https://www.npmjs.com/package/honeytree) · [GitHub](https://github.com/Varun2009178/honeytree) · MIT License

</div>
