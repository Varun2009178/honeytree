# honeylog

A minimal, fast, habit-forming terminal tool that visualizes your git commit consistency as a living forest.

## Quick Start

```bash
npm install -g honeylog
cd your-git-repo
honeylog
```

## Example Output

```
🌱 Day 5 streak
. . 🌱 🌿 🌳 🌲 🌱
🌿 . . 🌱 🌱 🌿 🌳
🌲 🌱 🌿 🌳 🌲 🌱 🌱
Your forest is growing.
```

## Options

### `--ascii`

Use ASCII characters instead of emoji, for terminals that don't support them:

```
🌱 Day 5 streak
. . * * Y A *
* . . * * * Y
A * * Y A * *
Your forest is growing.
```

| Emoji | ASCII | Meaning |
|-------|-------|---------|
| 🌱 | `*` | 1 commit |
| 🌿 | `*` | 2-3 commits |
| 🌳 | `Y` | 4-6 commits |
| 🌲 | `A` | 7+ commits |
| 🥀 | `x` | Decaying |
| `.` | `.` | No commits |

## How It Works

honeylog reads your git log for the last 21 days, maps each day's commit count to a tree emoji, and arranges them into a 3×7 grid. Consecutive days with commits build a streak. Miss a day and your forest starts to decay — recent trees wilt to show the gap. It's a quick visual nudge to keep shipping.
