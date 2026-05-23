# 3D Codebase Forest Viewer — Design Spec

## Overview

Replace Honeytree's 2D side-view forest renderer with a 3D point-cloud forest that represents an entire codebase. Each file in the project becomes a tree. Users rotate the forest by mouse-dragging to orbit the camera. Built as a custom 3D engine with zero new dependencies — vanilla JS, block-character rendering (░▒▓█), 24-bit truecolor via chalk.

## What Each Tree Represents

Each tree = one file in the codebase. Visual properties encode file metadata:

| File property | Visual mapping |
|---|---|
| File size (bytes/lines) | Tree height and point count (bigger file = taller, larger tree) |
| File extension | Tree species and color palette |
| Git churn (commit frequency) | Canopy density (1.5-2x point multiplier for high-churn files) |

## Tree Species

| Extension | Species | Shape | Color palette |
|---|---|---|---|
| .js, .jsx | Oak | Wide ellipsoid canopy | Green |
| .ts, .tsx | Pine | Tall cone canopy | Blue-green |
| .css, .scss | Birch | Slim ellipsoid canopy | Pink/magenta |
| .py | Willow | Drooping ellipsoid | Yellow-green |
| .md, .json, config | Cherry | Round sphere canopy | Warm orange/amber |
| Other | Generic oak | Wide ellipsoid | Neutral gray-green |

## Spatial Layout

Trees are placed on a ground plane (XZ plane, Y is up).

- Each top-level directory gets a region arranged in a circle around the origin
- Files within a directory form a tight cluster with small random jitter
- Nested subdirectories get sub-regions within their parent's region (groves within groves)
- Spacing scales with total tree count so the forest stays a reasonable size

This means distinct groves for `src/`, `tests/`, `docs/`, etc., visible when rotating.

## Rendering Pipeline

Five-stage pipeline, runs every frame:

```
1. Scan Codebase → 2. Generate Point Cloud → 3. Transform (rotate) → 4. Project to 2D → 5. Rasterize
```

### Stage 1: Scan Codebase

Walk the project directory, collect: file path, size, extension, git churn (number of commits touching the file). Results are cached. Rescan on `r` keypress or file watch events. Respects .gitignore.

### Stage 2: Generate Point Cloud

Each tree is a cluster of 3D points generated parametrically:

- **Canopy:** 40-80 base points arranged in the species' shape (ellipsoid, cone, sphere, drooping ellipsoid). Scaled by file size. Churn multiplier of 1.5-2x for high-activity files.
- **Trunk:** 5-15 points in a vertical column below canopy center.
- **Height:** Canopy center Y position scales with file size.
- All point positions are deterministic (seeded by file path hash) so they don't jitter between frames.

### Stage 3: Transform

Apply rotation matrix based on current camera azimuth and elevation. Standard 3D rotation — 9 multiplications per point.

### Stage 4: Perspective Projection

Project 3D points onto the 2D terminal grid with perspective division. Farther points converge toward center. Compute per-point depth value for use in rasterization.

### Stage 5: Rasterize

For each terminal cell, a z-buffer tracks the nearest point. Depth maps to block characters:

| Depth band | Character |
|---|---|
| Nearest 25% | `█` |
| 25-50% | `▓` |
| 50-75% | `▒` |
| Farthest 25% | `░` |

Color is the tree's species color, dimmed by depth (lerp toward background for atmospheric fade). 24-bit truecolor via chalk.hex().

### Ground Plane

Flat grid of points at Y=0, brown/soil palette. Lower point density than trees so it reads as a surface. Goes through the same transform/project/rasterize pipeline.

### Background

Cells with no points are background color (dark navy/black). No stars or decoration — clean negative space.

## Camera & Controls

### Camera Model

Orbits around forest center (origin). Defined by:

- **Azimuth:** 0-360°, mouse drag left/right
- **Elevation:** Clamped 10°-80°, mouse drag up/down
- **Default:** 30° elevation, 45° azimuth (three-quarter view)

### Mouse Input

SGR mouse mode (`\x1b[?1006h`). Provides button state and position.

- **Drag:** Accumulate delta-X/Y, map to azimuth/elevation change at ~0.5° per cell
- **Release:** Camera holds at current angle
- **Fallback:** Arrow keys for terminals without mouse support

### Tree Selection (Hover)

Maintain a cell → tree lookup populated during rasterization (each cell stores which file's point is frontmost). Mouse position maps to cell, cell maps to file. Hovered file path shown in status bar.

### Keyboard

- `q` — quit
- `r` — rescan codebase
- Arrow keys — rotate camera (fallback for no mouse)

## Status Bar

Bottom row of terminal:

```
 src/renderer.js  |  142 files  |  drag to rotate  |  q quit  r rescan
```

- Left: hovered file path (empty if not hovering a tree)
- Right: file count, controls hint

## Performance

Target 15fps during active drag, static when idle. Expected point counts:

- Small project (50 files × 60 pts): 3,000 points/frame
- Medium project (200 files × 60 pts): 12,000 points/frame
- Large project (1000 files × 60 pts): 60,000 points/frame

For large projects, apply LOD: when total points exceed 30,000, reduce points-per-tree proportionally (e.g., halve canopy points, keep trunk points). This keeps frame time consistent regardless of codebase size.

## Architecture (Files)

This replaces the existing 2D renderer. New/modified files:

| File | Purpose |
|---|---|
| `src/scanner.js` | NEW — walks codebase, collects file metadata, caches results |
| `src/pointcloud.js` | NEW — generates 3D point clouds from tree definitions |
| `src/camera.js` | NEW — camera state, rotation matrix, perspective projection |
| `src/renderer3d.js` | NEW — z-buffer, block-shade rasterization, screen buffer output |
| `src/viewer.js` | MODIFIED — replace 2D render loop with 3D pipeline, add mouse tracking |
| `src/sprites.js` | MODIFIED or REMOVED — species definitions change from 2D sprites to parametric 3D shapes |
| `bin/honeydew.js` | MODIFIED — `view` command now takes a directory path argument for which codebase to visualize |

The existing `state.js`, `plant.js`, and animation system are no longer used by the viewer (they were for the prompt-tracking forest). They can remain for backward compatibility or be removed.

## Non-Goals

- No GPU rendering or image protocols (Sixel/Kitty)
- No new npm dependencies
- No interactive file editing or navigation (just view + hover)
- No animation system (trees are static once rendered; only the camera moves)
- No streaks, wilting, biomes, or gamification — this is a pure codebase visualizer
