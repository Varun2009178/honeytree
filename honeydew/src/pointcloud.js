const SPECIES = {
  oak:     { name: "oak",     colors: ["#4a8c3f", "#3d7a34", "#5a9e4a", "#6aae5a"], shape: "ellipsoid", widthScale: 1.4, heightScale: 1.0 },
  pine:    { name: "pine",    colors: ["#2a7a6a", "#1d6a5a", "#3a8a7a", "#4a9a8a"], shape: "cone",      widthScale: 0.7, heightScale: 1.6 },
  birch:   { name: "birch",   colors: ["#cc66aa", "#bb5599", "#dd77bb", "#ee88cc"], shape: "ellipsoid", widthScale: 0.8, heightScale: 1.0 },
  willow:  { name: "willow",  colors: ["#88aa33", "#779922", "#99bb44", "#aacc55"], shape: "drooping",  widthScale: 1.2, heightScale: 1.0 },
  cherry:  { name: "cherry",  colors: ["#cc8833", "#bb7722", "#dd9944", "#eeaa55"], shape: "sphere",    widthScale: 1.0, heightScale: 1.0 },
  default: { name: "default", colors: ["#6a8a6a", "#5a7a5a", "#7a9a7a", "#8aaa8a"], shape: "ellipsoid", widthScale: 1.2, heightScale: 1.0 },
};

const TRUNK_COLOR = "#8B6914";

const EXT_MAP = {
  ".js": "oak", ".jsx": "oak", ".mjs": "oak", ".cjs": "oak",
  ".ts": "pine", ".tsx": "pine", ".mts": "pine",
  ".css": "birch", ".scss": "birch", ".sass": "birch", ".less": "birch",
  ".py": "willow", ".pyw": "willow",
  ".md": "cherry", ".json": "cherry", ".yaml": "cherry", ".yml": "cherry",
  ".toml": "cherry", ".xml": "cherry", ".ini": "cherry",
};

export function getSpecies(extension) {
  const key = EXT_MAP[extension] || "default";
  return SPECIES[key];
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul((s >>> 16) ^ s, 0x45d9f3b) >>> 0;
    s = Math.imul((s >>> 16) ^ s, 0x45d9f3b) >>> 0;
    s = ((s >>> 16) ^ s) >>> 0;
    return s / 0x100000000;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

export function generateTreeCloud(file, position, fileIndex = 0) {
  const species = getSpecies(file.extension);
  const seed = hashString(file.relativePath);
  const rng = seededRandom(seed);

  const sizeLog = Math.log2(Math.max(1, file.size));
  const basePoints = Math.round(30 + sizeLog * 5);
  const churnMultiplier = 1 + Math.min(1, (file.churn || 0) / 30);
  const canopyCount = Math.round(basePoints * churnMultiplier);

  const height = 2 + sizeLog * 0.5;
  const canopyCenterY = height;
  const canopyRadiusX = (height * 0.4) * species.widthScale;
  const canopyRadiusY = (height * 0.35) * species.heightScale;
  const canopyRadiusZ = canopyRadiusX;

  const points = [];

  for (let i = 0; i < canopyCount; i++) {
    let px, py, pz;

    if (species.shape === "cone") {
      const t = rng();
      const angle = rng() * Math.PI * 2;
      const radius = t * canopyRadiusX;
      px = Math.cos(angle) * radius;
      pz = Math.sin(angle) * radius;
      py = canopyCenterY + canopyRadiusY * (1 - t);
    } else if (species.shape === "drooping") {
      const u = rng() * Math.PI * 2;
      const v = rng() * Math.PI;
      const r = rng();
      px = Math.cos(u) * Math.sin(v) * canopyRadiusX * r;
      py = canopyCenterY + Math.cos(v) * canopyRadiusY * r;
      pz = Math.sin(u) * Math.sin(v) * canopyRadiusZ * r;
      if (rng() < 0.3) {
        py = canopyCenterY - rng() * canopyRadiusY * 0.8;
      }
    } else if (species.shape === "sphere") {
      const u = rng() * Math.PI * 2;
      const v = Math.acos(2 * rng() - 1);
      const r = Math.cbrt(rng()) * canopyRadiusX;
      px = Math.cos(u) * Math.sin(v) * r;
      py = canopyCenterY + Math.cos(v) * r;
      pz = Math.sin(u) * Math.sin(v) * r;
    } else {
      const u = rng() * Math.PI * 2;
      const v = Math.acos(2 * rng() - 1);
      const r = Math.cbrt(rng());
      px = Math.cos(u) * Math.sin(v) * canopyRadiusX * r;
      py = canopyCenterY + Math.cos(v) * canopyRadiusY * r;
      pz = Math.sin(u) * Math.sin(v) * canopyRadiusZ * r;
    }

    const color = species.colors[Math.floor(rng() * species.colors.length)];
    points.push({
      x: position.x + px,
      y: py,
      z: position.z + pz,
      color,
      fileIndex,
    });
  }

  const trunkCount = Math.round(3 + height * 0.8);
  for (let i = 0; i < trunkCount; i++) {
    const t = i / trunkCount;
    points.push({
      x: position.x + (rng() - 0.5) * 0.3,
      y: t * (canopyCenterY - canopyRadiusY * 0.5),
      z: position.z + (rng() - 0.5) * 0.3,
      color: TRUNK_COLOR,
      fileIndex,
    });
  }

  return points;
}

export function generateForestCloud(files) {
  const dirGroups = {};
  for (let i = 0; i < files.length; i++) {
    const dir = files[i].directory || ".";
    const topDir = dir === "." ? "." : dir.split("/")[0];
    if (!dirGroups[topDir]) dirGroups[topDir] = [];
    dirGroups[topDir].push({ file: files[i], index: i });
  }

  const dirs = Object.keys(dirGroups);
  const totalFiles = files.length;
  const spreadRadius = Math.max(10, Math.sqrt(totalFiles) * 3);

  const allPoints = [];
  const filePaths = files.map((f) => f.relativePath);

  dirs.forEach((dir, dirIndex) => {
    const angle = (dirIndex / dirs.length) * Math.PI * 2;
    const clusterCenterX = Math.cos(angle) * spreadRadius * 0.5;
    const clusterCenterZ = Math.sin(angle) * spreadRadius * 0.5;

    const group = dirGroups[dir];
    const clusterSpread = Math.max(3, Math.sqrt(group.length) * 2);

    group.forEach((entry, fileInGroup) => {
      const seed = hashString(entry.file.relativePath);
      const rng = seededRandom(seed);
      const fx = clusterCenterX + (rng() - 0.5) * clusterSpread;
      const fz = clusterCenterZ + (rng() - 0.5) * clusterSpread;

      const treePoints = generateTreeCloud(entry.file, { x: fx, z: fz }, entry.index);
      allPoints.push(...treePoints);
    });
  });

  return { points: allPoints, filePaths };
}

export function generateGroundPlane(radius) {
  const points = [];
  const step = 1.5;
  const groundColors = ["#3a2a1a", "#4a3a2a", "#352515", "#2a1a0a"];

  for (let x = -radius; x <= radius; x += step) {
    for (let z = -radius; z <= radius; z += step) {
      if (x * x + z * z > radius * radius) continue;

      const seed = hashString(`ground_${x}_${z}`);
      const rng = seededRandom(seed);
      const color = groundColors[Math.floor(rng() * groundColors.length)];

      points.push({
        x,
        y: 0,
        z,
        color,
        fileIndex: -1,
      });
    }
  }

  return points;
}
