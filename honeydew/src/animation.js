import { ANIMATION_KEYFRAMES } from "./animation-keyframes.js";
import { getSprite } from "./sprites.js";

const CHAR_ORDER = [" ", "░", "▒", "█"];

function charIndex(ch) {
  const idx = CHAR_ORDER.indexOf(ch);
  return idx >= 0 ? idx : 0;
}

function interpolateChar(ch1, ch2, t) {
  const i1 = charIndex(ch1);
  const i2 = charIndex(ch2);
  const idx = Math.round(i1 + (i2 - i1) * t);
  return CHAR_ORDER[Math.max(0, Math.min(CHAR_ORDER.length - 1, idx))];
}

function parseHex(hex) {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(hex1, hex2, t) {
  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);
  return toHex({
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  });
}

function interpolateSprite(sprite1, sprite2, t) {
  const rows = sprite1.rows.map((row, r) =>
    row.map(([ch1, col1], c) => {
      const [ch2, col2] = sprite2.rows[r][c];
      if (!col1 && !col2) return [" ", null];
      if (!col1 && col2) {
        const ch = interpolateChar(" ", ch2, t);
        if (ch === " ") return [" ", null];
        return [ch, col2];
      }
      if (col1 && !col2) {
        const ch = interpolateChar(ch1, " ", t);
        if (ch === " ") return [" ", null];
        return [ch, col1];
      }
      const ch = interpolateChar(ch1, ch2, t);
      const col = lerpColor(col1, col2, t);
      return [ch, col];
    }),
  );
  return { rows, width: sprite1.width };
}

function brightenSprite(sprite, amount) {
  const rows = sprite.rows.map((row) =>
    row.map(([ch, col]) => {
      if (!col) return [ch, col];
      const c = parseHex(col);
      return [ch, toHex({
        r: Math.min(255, c.r + (255 - c.r) * amount),
        g: Math.min(255, c.g + (255 - c.g) * amount),
        b: Math.min(255, c.b + (255 - c.b) * amount),
      })];
    }),
  );
  return { rows, width: sprite.width };
}

export function getAnimationFrames(type, growth, frameCount = 40) {
  const allKeyframes = ANIMATION_KEYFRAMES[type];
  if (!allKeyframes) throw new Error(`No animation keyframes for type: ${type}`);

  const finalSprite = getSprite(type, growth);

  let keyframes;
  if (growth >= 0.8) {
    keyframes = allKeyframes;
  } else {
    let maxKF;
    if (growth < 0.2) maxKF = 3;
    else if (growth < 0.5) maxKF = 6;
    else maxKF = 8;

    keyframes = allKeyframes.slice(0, maxKF);
    const lastTime = keyframes[keyframes.length - 1].time;
    const timeScale = 4.0 / Math.max(lastTime, 0.1);

    keyframes = keyframes.map((kf) => ({ ...kf, time: kf.time * timeScale }));
    keyframes.push({ time: 4.0, sprite: finalSprite });
    keyframes.push({ time: 4.5, sprite: brightenSprite(finalSprite, 0.2) });
  }

  const totalDuration = 5.0;
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    const t = (i / (frameCount - 1)) * totalDuration;

    let kfBefore = keyframes[0];
    let kfAfter = keyframes[0];

    for (let k = 0; k < keyframes.length - 1; k++) {
      if (t >= keyframes[k].time && t <= keyframes[k + 1].time) {
        kfBefore = keyframes[k];
        kfAfter = keyframes[k + 1];
        break;
      }
      if (k === keyframes.length - 2) {
        kfBefore = keyframes[keyframes.length - 1];
        kfAfter = keyframes[keyframes.length - 1];
      }
    }

    const segmentDuration = kfAfter.time - kfBefore.time;
    const segmentT = segmentDuration > 0 ? (t - kfBefore.time) / segmentDuration : 1;
    const clampedT = Math.max(0, Math.min(1, segmentT));

    const sprite = interpolateSprite(kfBefore.sprite, kfAfter.sprite, clampedT);

    let groundOverlay = null;
    if (t < 0.5 && kfBefore.groundEffect) {
      const ge = kfBefore.groundEffect;
      groundOverlay = [];
      for (let dx = -ge.radius; dx <= ge.radius; dx++) {
        const intensity = 1 - Math.abs(dx) / ge.radius;
        if (intensity > 0.3) {
          groundOverlay.push({ dx, char: "░", color: ge.color });
        }
      }
    }

    if (i === frameCount - 1) {
      frames.push({ sprite: finalSprite, groundOverlay: null });
    } else {
      frames.push({ sprite, groundOverlay });
    }
  }

  return frames;
}
