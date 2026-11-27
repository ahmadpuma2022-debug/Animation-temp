import * as THREE from 'three';
import { rnd, rr, pick, lerp, clamp, smooth, scene, M, box, jitter, gable, instanced, SUN, HAZE } from './stage.js';

// A low-poly cloud layer at about 1,400-1,750 m, with a far ring so it has no edge.
export function buildClouds() {
// ---------- clouds (layer 1350..1750 m) ----------
const blobs = [];
for (let k = 0; k < 4800; k++) {
  const cx = rr(-16000, 16000), cz = rr(-16000, 16000), base = rr(1380, 1520), big = rr(0.7, 1.8);
  const n = 5 + Math.floor(rnd() * 6);
  for (let b = 0; b < n; b++) {
    const s = rr(70, 170) * big;
    const ox = rr(-1, 1), oz = rr(-1, 1), c = 1 - Math.hypot(ox, oz) / 1.42;
    blobs.push({ x: cx + ox * 190 * big, z: cz + oz * 190 * big, y: base + s * (0.15 + c * rr(0.4, 1.3)), sx: s * rr(1.1, 1.5), sy: s * rr(0.8, 1.1), sz: s * rr(1.1, 1.5), r: rr(0, 6) });
  }
}
for (let k = 0; k < 2600; k++) {
  const a = rr(0, Math.PI * 2), d = rr(16000, 70000), cx = Math.cos(a) * d, cz = Math.sin(a) * d, big = rr(2.2, 4.5);
  for (let b = 0; b < 5; b++) { const s = rr(70, 170) * big; blobs.push({ x: cx + rr(-200, 200) * big, z: cz + rr(-200, 200) * big, y: 1450 + s * rr(0.05, 0.5), sx: s * 1.4, sy: s * 0.7, sz: s * 1.4, r: rr(0, 6) }); }
}
// a guaranteed cluster right above us so we fly through one
for (let b = 0; b < 9; b++) { const s = rr(120, 190); blobs.push({ x: rr(-200, 200), z: rr(-260, 120), y: 1450 + s * rr(0.1, 0.6), sx: s * 1.6, sy: s * 0.9, sz: s * 1.6, r: rr(0, 6) }); }
const cloudG = jitter(new THREE.IcosahedronGeometry(1, 1), 0.12);
const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#c3cde6', emissiveIntensity: 0.36 });
// a few towering cumulus on the horizon
for (let k = 0; k < 28; k++) { const a = rr(0, 6.28), d = rr(8000, 16000), cx = Math.cos(a) * d, cz = Math.sin(a) * d; for (let b = 0; b < 14; b++) { const s = rr(220, 420), lv = b / 14; blobs.push({ x: cx + rr(-260, 260) * (1 - lv * 0.6), z: cz + rr(-260, 260) * (1 - lv * 0.6), y: 1450 + lv * 1300, sx: s * 1.5, sy: s * 1.1, sz: s * 1.5, r: rr(0, 6) }); } }
const clouds = instanced(cloudG, cloudMat, blobs, false);
clouds.receiveShadow = false;

  return { clouds };
}
