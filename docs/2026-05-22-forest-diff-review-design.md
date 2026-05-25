# Forest Diff Review — Design Spec

## Goal

Turn the 3D forest viewer into a visual code review tool. When any tool (AI or human) edits files, affected trees shift to amber. Click a changed tree to see its diff in an overlay panel and accept or reject individual hunks. Accepted hunks are git-staged; rejected hunks are reverted.

## Architecture

The system adds three capabilities to the existing viewer:

1. **Change detection** — periodic `git diff` polling
2. **Visual differentiation** — amber color shift for changed trees
3. **Overlay diff panel** — per-hunk accept/reject with git staging

All changes are additive to the existing viewer. No existing functionality is removed.

---

## 1. Change Detection

Every 2 seconds, run `git diff --name-only` (spawned async, non-blocking) to get the set of files with uncommitted changes. Store as a `Set<relativePath>`.

Each file object in the scanner output gains a `changed: boolean` field. When the diff set updates, the viewer marks matching files and triggers a redraw if the set changed.

Also run `git diff -U3 <file>` on demand when opening the overlay panel for a specific file — this provides the full unified diff with context needed for hunk display.

No file-watching library. No fs.watch. Just git, which is fast and already a dependency of the scanner (for churn).

---

## 2. Visual Differentiation

Changed trees shift to an amber palette regardless of species:

- Amber colors: `#ffaa33`, `#ff8822`, `#ffcc44`, `#ee7711`
- Shape and size remain unchanged (species shape, file-size height)
- Trunk color unchanged
- Top bar shows `[modified]` tag when hovering a changed tree

**Diff mode toggle (`d` key):** When active, unchanged trees dim (colors lerp 60% toward background) while changed trees stay bright amber. Makes it easy to spot changes in a large forest. Press `d` again to return to normal view.

**Status bar:** When changes exist, show count: `3 files changed | drag to rotate | +/- zoom | q quit`

---

## 3. Overlay Diff Panel

Triggered by clicking a changed tree (not just hover — actual mouse click on an amber tree).

### Layout

- Forest shrinks to left 40% of screen width
- Overlay panel takes right 60%
- Panel has a visible left border to separate from forest

### Panel Contents

**Header line:**
```
src/utils.js  +12 -5  3 hunks
```

**Diff body:** Standard unified diff rendered with chalk:
- Added lines: green text
- Removed lines: red text
- Context lines: dim/grey text
- Current hunk highlighted with a brighter background or border character

**Per-hunk indicator:** Each hunk shows its status:
- `[ ]` — unreviewed
- `[a]` — accepted
- `[r]` — rejected

### Keybindings (while panel is open)

| Key | Action |
|-----|--------|
| `j` / `↓` | Next hunk |
| `k` / `↑` | Previous hunk |
| `a` | Accept current hunk |
| `r` | Reject current hunk |
| `A` | Accept all remaining unreviewed hunks |
| `R` | Reject all remaining unreviewed hunks |
| `Esc` | Close panel, return to full forest |

### Scrolling

If a hunk is taller than the panel height, `j/k` scroll within the hunk before moving to the next one. Page up/down also work for long diffs.

---

## 4. Git Actions on Resolution

When all hunks in a file are resolved (each marked accept or reject):

- **Accepted hunks:** Generate a patch from the accepted hunks and apply it to the staging area via `git apply --cached`. The working tree retains the changes.
- **Rejected hunks:** Generate a reverse patch from the rejected hunks and apply it to the working tree via `git apply --reverse`. This reverts those specific changes.
- The tree's `changed` flag clears and it returns to normal species color on next poll cycle.

If a git operation fails (e.g., conflict), show an error in the panel header and keep the tree amber. The user can retry or handle it manually.

---

## 5. New Modules

| Module | Responsibility |
|--------|---------------|
| `src/diffwatch.js` | Polls `git diff`, parses output, maintains changed file set |
| `src/diffparser.js` | Parses unified diff into structured hunk objects |
| `src/diffpanel.js` | Renders the overlay panel, handles hunk navigation and accept/reject |
| `src/diffactions.js` | Executes git stage/revert operations for resolved hunks |

Existing modules modified:
- `src/viewer.js` — poll loop, click handling, panel integration, `d` key toggle
- `src/pointcloud.js` — accept `changed` flag, swap colors to amber
- `src/renderer3d.js` — support split-screen rendering (forest at reduced width), dim mode for unchanged trees
- `src/scanner.js` — no changes (diff detection is separate from scan)

---

## 6. Data Flow

```
[git diff --name-only] → diffwatch.js → Set<changedPaths>
                                           ↓
                              viewer.js marks file.changed = true
                                           ↓
                         pointcloud.js renders amber trees
                                           ↓
                            user clicks amber tree
                                           ↓
               [git diff -U3 <file>] → diffparser.js → hunks[]
                                           ↓
                          diffpanel.js renders overlay
                                           ↓
                      user accepts/rejects per hunk
                                           ↓
                   diffactions.js → git apply --cached / --reverse
                                           ↓
                        tree returns to normal color
```
