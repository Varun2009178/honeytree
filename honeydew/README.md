# Honeytree

> *your codebase is a forest*

[![npm version](https://img.shields.io/npm/v/honeytree.svg)](https://www.npmjs.com/package/honeytree)
[![license](https://img.shields.io/npm/l/honeytree.svg)](https://github.com/Varun2009178/honeytree/blob/main/LICENSE)

A 3D forest that grows from your codebase. Every file becomes a tree — rendered as a rotatable point cloud right in your terminal using block characters (░▒▓█).

No browser. No app. No install beyond npm.

```bash
npx honeytree
```

That's it. One command. Run it in any project directory.

---

## What You See

- Each **file** is a **tree**
- **Tree height** = file size (bigger files are taller)
- **Tree species/color** = file type
- **Canopy density** = git churn (more commits = denser canopy)
- **Spatial layout** = directory structure (files in the same folder cluster together)

### Species

| Extension | Species | Color | Shape |
|-----------|---------|-------|-------|
| `.js` `.jsx` `.mjs` | Oak | Bright green | Wide ellipsoid |
| `.ts` `.tsx` | Pine | Teal | Narrow cone |
| `.css` `.scss` | Birch | Pink | Slim ellipsoid |
| `.py` | Willow | Lime green | Drooping |
| `.md` `.json` `.yaml` | Cherry | Pink-purple | Sphere |

---

## Controls

| Input | Action |
|-------|--------|
| Mouse drag | Rotate the forest |
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| Arrow keys | Rotate camera |
| Hover | Show file path (displayed at top) |
| `r` | Rescan codebase |
| `q` | Quit |

---

## Install Globally (optional)

```bash
npm install -g honeytree
honeytree
```

Or point it at a specific directory:

```bash
honeytree view ~/my-project
```

---

## How It Works

A custom terminal-based 3D engine:

1. **Scanner** — walks your project, collects file metadata (size, extension, git history)
2. **Point cloud** — generates 3D points for each tree based on species shape
3. **Camera** — orbital rotation with perspective projection
4. **Rasterizer** — z-buffer depth sorting, block character shading, point splatting

Everything renders to Unicode block characters with 24-bit true color. No WebGL, no canvas, no browser — just your terminal.

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
