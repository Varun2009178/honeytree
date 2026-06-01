<div align="center">

# Every Claude Code prompt plants a tree.

<video src="https://github.com/Varun2009178/honeytree/raw/main/honeytree_correct_video.mp4" autoplay loop muted playsinline controls width="640"></video>

**Honeytree grows a pixel-art forest in your terminal as you code with Claude Code.**
**Then it lets you plant real ones.**

[![npm version](https://img.shields.io/npm/v/honeytree.svg)](https://www.npmjs.com/package/honeytree)
[![license](https://img.shields.io/npm/l/honeytree.svg)](https://github.com/Varun2009178/honeytree/blob/main/LICENSE)

[![honeytree](./honeytree-badge.svg)](https://github.com/Varun2009178/honeytree)

</div>

## Quick start

```bash
npm install -g honeytree
honeytree init
honeytree login
honeytree
```

`honeytree init` registers a [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks) that plants a tree after every prompt. `honeytree login` links your terminal to your account so your forest syncs to the cloud. Open a second terminal pane, run `honeytree`, and watch your forest grow in real time.

### Plant real trees

```bash
honeytree plant
```

`honeytree plant` shows how many real trees you've unlocked (every 50 virtual trees = 1 real tree), opens your dashboard to complete a $1 planting via the Good API, then prints your receipt and any newly-unlocked badges right in the terminal. A keepsake receipt also lands in your inbox.

---

## What happens

Every time Claude Code finishes a response, a new pixel-art tree appears in your terminal. Five species (oak, pine, birch, willow, cherry), four growth stages (seed → sapling → young → full), and five biomes that evolve as your forest grows:

| Trees | Biome | What changes |
|-------|-------|-------------|
| 0–9 | Clearing | Sparse, quiet sky |
| 10–24 | Grove | Stars brighten, ground details appear |
| 25–49 | Woodland | Dense canopy, mushrooms and bushes |
| 50–99 | Old Growth | Rich palette, warm atmosphere |
| 100+ | Ancient Forest | Deepest colors, full detail |

Trees sway in the wind. Skip a day and they wilt. Come back and they recover.

---

## Plant real trees

Every **50 virtual trees** unlocks a real tree planting for **$1** through [Good API](https://thegoodapi.com). Sign in with GitHub, sync your forest to the cloud, and turn code into canopy.

```bash
honeytree login     # link your terminal to your account
honeytree sync      # push your forest to the cloud
honeytree rewards   # check your reward tier
```

Visit [tryhoney.xyz/dashboard](https://tryhoney.xyz/dashboard) to see your stats, track milestones, and plant.

---

## Rewards

Rewards unlock based on real trees planted. They stack — a Legend sees all five effects at once.

| Tier | Real trees | Unlock |
|------|-----------|--------|
| Planter | 1 | Badge on your status bar |
| Bloomer | 5 | Cherry blossom petals across your canopy |
| Grove | 10 | Teal ground and trunk palette |
| Ancient Forest | 25 | Rare tall golden trees appear |
| Legend | 50 | Your username floats above your forest |

---

## 3D codebase viewer

Honeytree also ships a 3D mode that turns any project into a rotatable point-cloud forest:

```bash
honeytree view .          # current directory
honeytree view ~/my-app   # any directory
```

Each source file becomes a tree. Files in the same folder cluster together. Modified files glow amber. Mouse over a tree to see its path. Press `d` to open the inline diff panel.

| Control | Action |
|---------|--------|
| Click + drag | Orbit camera |
| `+` / `-` | Zoom |
| Arrow keys | Pan |
| `d` | Toggle diff panel |
| `q` | Quit |

---

## CLI reference

| Command | What it does |
|---------|-------------|
| `honeytree` | Open the 2D forest viewer |
| `honeytree init` | Register Claude Code hook |
| `honeytree plant` | Plant your unlocked real trees |
| `honeytree view [dir]` | 3D codebase viewer |
| `honeytree login` | Link terminal to your account |
| `honeytree logout` | Remove stored credentials |
| `honeytree sync` | Push forest to cloud |
| `honeytree rewards` | Show reward tiers and progress |
| `honeytree status` | Check login status |
| `honeytree badge` | Generate `honeytree-badge.svg` |
| `honeytree md` | Generate `FOREST.md` |

---

## Requirements

- Node.js 18+
- A terminal with 24-bit color (iTerm2, Kitty, Windows Terminal, Ghostty — most modern terminals work)

---

<div align="center">

**Free and open source. Auth and payments are entirely opt-in. Your forest works offline forever.**

[npm](https://www.npmjs.com/package/honeytree) · [GitHub](https://github.com/Varun2009178/honeytree) · [Dashboard](https://tryhoney.xyz/dashboard) · MIT License

</div>
