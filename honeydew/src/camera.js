// src/camera.js

const DEG_TO_RAD = Math.PI / 180;

export function createCamera() {
  return {
    azimuth: 45,
    elevation: 30,
    distance: 40,
  };
}

export function rotatePoint(x, y, z, azimuthDeg, elevationDeg) {
  const az = azimuthDeg * DEG_TO_RAD;
  const el = elevationDeg * DEG_TO_RAD;

  const cosAz = Math.cos(az);
  const sinAz = Math.sin(az);
  const x1 = x * cosAz + z * sinAz;
  const z1 = -x * sinAz + z * cosAz;

  const cosEl = Math.cos(el);
  const sinEl = Math.sin(el);
  const y1 = y * cosEl - z1 * sinEl;
  const z2 = y * sinEl + z1 * cosEl;

  return [x1, y1, z2];
}

export function projectPoint(x, y, z, screenWidth, screenHeight) {
  const fov = 60;
  const fovRad = fov * DEG_TO_RAD;
  const focalLength = screenHeight / (2 * Math.tan(fovRad / 2));

  const zView = z - 25;

  if (zView >= -1) {
    return { screenX: -1, screenY: -1, depth: Infinity, visible: false };
  }

  const scale = focalLength / -zView;
  const screenX = Math.round(x * scale * 2 + screenWidth / 2);
  const screenY = Math.round(-y * scale + screenHeight / 2);

  return { screenX, screenY, depth: -zView, visible: true };
}

export function clampElevation(elevation) {
  return Math.max(10, Math.min(80, elevation));
}

export function clampAzimuth(azimuth) {
  return ((azimuth % 360) + 360) % 360;
}
