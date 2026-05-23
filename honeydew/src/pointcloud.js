const SPECIES = {
  oak:     { name: "oak",     colors: ["#55cc44", "#44bb33", "#66dd55", "#77ee66", "#3da832"], shape: "ellipsoid", widthScale: 1.4, heightScale: 1.0 },
  pine:    { name: "pine",    colors: ["#33bbaa", "#22aa99", "#44ccbb", "#55ddcc", "#11997a"], shape: "cone",      widthScale: 0.7, heightScale: 1.6 },
  birch:   { name: "birch",   colors: ["#ff77cc", "#ee55bb", "#ff99dd", "#ffaaee", "#dd44aa"], shape: "ellipsoid", widthScale: 0.8, heightScale: 1.0 },
  willow:  { name: "willow",  colors: ["#aadd44", "#99cc33", "#bbee55", "#ccff66", "#88bb22"], shape: "drooping",  widthScale: 1.2, heightScale: 1.0 },
  cherry:  { name: "cherry",  colors: ["#ff88cc", "#ff66bb", "#ffaadd", "#ffbbee", "#ee55aa", "#ff99ff", "#dd77cc"], shape: "sphere", widthScale: 1.0, heightScale: 1.0 },
  default: { name: "default", colors: ["#88bb88", "#77aa77", "#99cc99", "#aaddaa"], shape: "ellipsoid", widthScale: 1.2, heightScale: 1.0 },
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

export function generateTreeCloud(file, position, fileIndex = 0, lodScale = 1) {
  const species = getSpecies(file.extension);
  const seed = hashString(file.relativePath);
  const rng = seededRandom(seed);

  const sizeLog = Math.log2(Math.max(1, file.size));
  const basePoints = Math.round(220 + sizeLog * 35);
  const churnMultiplier = 1 + Math.min(1, (file.churn || 0) / 30);
  const canopyCount = Math.round(basePoints * churnMultiplier * lodScale);

  const height = 3 + sizeLog * 0.8;
  const canopyCenterY = height;
  const canopyRadiusX = (height * 0.45) * species.widthScale;
  const canopyRadiusY = (height * 0.5) * species.heightScale;
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

  const trunkCount = Math.round((8 + height * 2) * Math.max(0.5, lodScale));
  for (let i = 0; i < trunkCount; i++) {
    const t = i / trunkCount;
    points.push({
      x: position.x + (rng() - 0.5) * 0.5,
      y: t * (canopyCenterY - canopyRadiusY * 0.5),
      z: position.z + (rng() - 0.5) * 0.5,
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
  const spreadRadius = Math.max(20, Math.sqrt(totalFiles) * 8);

  const MAX_POINTS = 80000;
  const estimatedPointsPerFile = 400;
  const estimatedTotal = totalFiles * estimatedPointsPerFile;
  const lodScale = estimatedTotal > MAX_POINTS ? MAX_POINTS / estimatedTotal : 1;

  const allPoints = [];
  const filePaths = files.map((f) => f.relativePath);

  dirs.forEach((dir, dirIndex) => {
    const angle = (dirIndex / dirs.length) * Math.PI * 2;
    const clusterCenterX = Math.cos(angle) * spreadRadius * 0.6;
    const clusterCenterZ = Math.sin(angle) * spreadRadius * 0.6;

    const group = dirGroups[dir];
    const clusterSpread = Math.max(8, Math.sqrt(group.length) * 6);

    group.forEach((entry, fileInGroup) => {
      const seed = hashString(entry.file.relativePath);
      const rng = seededRandom(seed);
      const fx = clusterCenterX + (rng() - 0.5) * clusterSpread;
      const fz = clusterCenterZ + (rng() - 0.5) * clusterSpread;

      const treePoints = generateTreeCloud(entry.file, { x: fx, z: fz }, entry.index, lodScale);
      allPoints.push(...treePoints);
    });
  });

  return { points: allPoints, filePaths };
}

export function generateGroundPlane(radius) {
  const points = [];
  const step = 0.7;
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
