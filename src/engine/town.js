import * as THREE from 'three';
import { rnd, rr, pick, lerp, clamp, smooth, scene, M, box, jitter, gable, instanced, SUN, HAZE } from './stage.js';

// The ground, the town around your house, the river, fields, forest and far hills.
export function buildTown() {
  // Flat ground layers (fields, river, roads, pools, road dashes) lie millimetres apart. Letting the depth test pick
  // the winner makes them flicker from far away. Instead they don't write depth and are drawn in a fixed order on top
  // of the ground (fields, then river, roads, pools, dashes); houses and trees drawn later still cover them.
  const layer = (im, order) => { im.material = im.material.clone(); im.material.depthWrite = false; im.renderOrder = -10 + order; return im; };
// ---------- town ----------
const GROUND = new THREE.Mesh(new THREE.PlaneGeometry(4000000, 4000000), M('#86a96a'));
GROUND.rotation.x = -Math.PI / 2; GROUND.position.y = -0.05; GROUND.receiveShadow = true; GROUND.renderOrder = -20; scene.add(GROUND);   // drawn first, then the flat layers on top

const LOT = 52, ROADW = 9, TOWN_R = 900;
const houses = [], roofs = [], hips = [], trees = [], trunks = [], roads = [], cars = [], fields = [], pools = [], towers = [], river = [];
const riverZ = (x) => -330 + 140 * Math.sin(x / 420) + 40 * Math.sin(x / 130);
for (let x = -9000; x < 9000; x += 18) { const z0 = riverZ(x), z1 = riverZ(x + 18); river.push({ x: x + 9, z: (z0 + z1) / 2, y: 0.004, sx: 21, sz: 30, r: -Math.atan2(z1 - z0, 18) }); }
const CENTER = [-170, -620];
const HOUSEC = ['#f1e4d0', '#e8d2b6', '#dfe6e8', '#f2ead9', '#d9c3a5', '#e9e0ce', '#c9d6dc', '#f0d9c4'];
const ROOFC = ['#9b4b3c', '#6d6a6a', '#8a5a44', '#4f5b66', '#a8604a', '#7a4a3a'];
const TREEC = ['#4f8a3c', '#5e9a42', '#3f7a38', '#6aa04a', '#4a7f45'];
// road grid: every 2 lots
for (let k = -40; k <= 40; k++) {
  const p = k * LOT * 2 + LOT; // road centre lines between lot pairs
  if (Math.abs(p) > TOWN_R + 200) continue;
  roads.push({ x: p, z: 0, y: 0.01, sx: ROADW, sz: (TOWN_R + 200) * 2 });
  roads.push({ x: 0, z: p, y: 0.012, sx: (TOWN_R + 200) * 2, sz: ROADW });
}
const roadDist = (v) => { const m = ((v - LOT) % (2 * LOT) + 2 * LOT) % (2 * LOT); return Math.min(m, 2 * LOT - m); };
for (let i = -60; i <= 60; i++) for (let j = -60; j <= 60; j++) {
  const x = i * 17.3, z = j * 17.3;
  const d = Math.hypot(x, z);
  if (d > TOWN_R + rr(-150, 150)) continue;
  if (roadDist(x) < ROADW / 2 + 6.5 || roadDist(z) < ROADW / 2 + 6.5) continue;
  if (Math.abs(x) < 18 && Math.abs(z) < 18) continue; // our lot
  if (rnd() < 0.08) continue;
  if (Math.abs(z - riverZ(x)) < 30) { if (rnd() < 0.5) { const s2 = rr(0.8, 1.5); trees.push({ x: x + rr(-6, 6), z: z + rr(-6, 6), y: 2.2 * s2, sx: s2 * 2.6, sy: s2 * 3.2, sz: s2 * 2.6, r: rr(0, 6), c: pick(TREEC) }); } continue; }
  const dc = Math.hypot(x - CENTER[0], z - CENTER[1]);
  if (dc < 230) {
    const fl = Math.floor(rr(3, 4 + 10 * (1 - dc / 230)));
    const tw = rr(11, 16), td = rr(11, 16), th = fl * 3.2;
    towers.push({ x: x + rr(-1, 1), z: z + rr(-1, 1), sx: tw, sy: th, sz: td, r: 0, c: pick(['#d9d4cc', '#b9c2c9', '#e6dccb', '#a7b4c2', '#cfc6b8', '#8f9daa']) });
    towers.push({ x: x + rr(-2, 2), z: z + rr(-2, 2), y: th, sx: rr(2, 4), sy: rr(1.2, 2.4), sz: rr(2, 4), r: 0, c: '#7d7f84' });
    continue;
  }
  const blk = Math.floor((x + 5000) / 104) * 7 + Math.floor((z + 5000) / 104) * 13;
  const park = ((Math.sin(blk * 12.9898) * 43758.5453) % 1 + 1) % 1 < 0.14;
  if (park) { for (let q = 0; q < 6; q++) { const s2 = rr(0.8, 1.6), tx = x + rr(-8, 8), tz = z + rr(-8, 8); trees.push({ x: tx, z: tz, y: 2.2 * s2, sx: s2 * 2.6, sy: s2 * 3.2, sz: s2 * 2.6, r: rr(0, 6), c: pick(TREEC) }); trunks.push({ x: tx, z: tz, sx: s2, sy: s2 * 2.4, sz: s2 }); } continue; }
  const w = rr(7, 10.5), dd = rr(6.5, 8.5), h = rr(2.8, 3.4) * (rnd() < 0.2 ? 2 : 1);
  const r = pick([0, Math.PI / 2]) + rr(-0.03, 0.03);
  const ox = x + rr(-2, 2), oz = z + rr(-2, 2);
  houses.push({ x: ox, z: oz, r, sx: w, sy: h, sz: dd, c: pick(HOUSEC) });
  (rnd() < 0.45 ? hips : roofs).push({ x: ox, z: oz, y: h, r, sx: w + 0.8, sy: rr(2, 3), sz: dd + 0.8, c: pick(ROOFC) });
  if (rnd() < 0.5) trees.push({ x: ox + rr(-9, 9), z: oz + pick([-1, 1]) * rr(6, 9), y: 2.2, sx: 2.6 * rr(0.8, 1.3), sy: 3.2 * rr(0.8, 1.3), sz: 2.6 * rr(0.8, 1.3), r: rr(0, 6), c: pick(TREEC) });
  if (rnd() < 0.12) pools.push({ x: ox + rr(-6, 6), z: oz + (r ? 0 : 8), y: 0.02, sx: 4, sz: 2.6 });
  const nt = Math.floor(rr(1, 4));
  for (let t = 0; t < nt; t++) {
    const tx = x + rr(-8, 8), tz = z + rr(-8, 8), s = rr(0.7, 1.4);
    if (Math.abs(tx - ox) < w / 2 + 2 && Math.abs(tz - oz) < dd / 2 + 2) continue;
    trees.push({ x: tx, z: tz, y: 2.2 * s, sx: s * 2.6, sy: s * 3.2, sz: s * 2.6, r: rr(0, 6), c: pick(TREEC) });
    trunks.push({ x: tx, z: tz, sx: s, sy: s * 2.4, sz: s });
  }
}
// our yard trees + neighbours seen through the window
for (const [x, z, s] of [[-4.5, -13, 1.3], [5.5, -15, 1.1], [-12, -24, 1.4], [9, -27, 1.2], [-7, 8, 1.2], [12, 6, 1.0], [-14, -6, 1.3]]) {
  trees.push({ x, z, y: 2.2 * s, sx: s * 2.6, sy: s * 3.2, sz: s * 2.6, r: rr(0, 6), c: pick(TREEC) });
  trunks.push({ x, z, sx: s, sy: s * 2.4, sz: s });
}
// cars on roads
for (let k = 0; k < 140; k++) {
  const along = rr(-TOWN_R, TOWN_R), line = (Math.floor(rr(-17, 17)) * 2 + 1) * LOT, side = pick([-2, 2]);
  const vert = rnd() < 0.5;
  cars.push(vert ? { x: line + side, z: along, r: 0, sx: 1.9, sy: 1.4, sz: 4.3, c: pick(['#c94a3b', '#e9e7e2', '#2c3e57', '#3c3c3c', '#e2b23f', '#5f86a8']) }
                 : { x: along, z: line + side, r: 0, sx: 4.3, sy: 1.4, sz: 1.9, c: pick(['#c94a3b', '#e9e7e2', '#2c3e57', '#3c3c3c', '#e2b23f', '#5f86a8']) });
}
// fields + forest outside town
const FIELDC = ['#9cb86a', '#b9c27a', '#7ea25a', '#c9b878', '#8fae62', '#a8bf72', '#6f9450'];
for (let k = 0; k < 2600; k++) {
  const a = rr(0, Math.PI * 2), d = rr(TOWN_R + 60, 22000);
  const x = Math.cos(a) * d, z = Math.sin(a) * d, s = rr(140, 420) * (0.6 + d / 20000);
  fields.push({ x, z, y: 0.01 + rnd() * 0.05, sx: s * rr(0.6, 1.4), sz: s * rr(0.6, 1.4), r: rr(-0.25, 0.25), c: pick(FIELDC) });
}
for (let k = 0; k < 7000; k++) {
  const cx = rr(-12000, 12000), cz = rr(-12000, 12000);
  if (Math.hypot(cx, cz) < TOWN_R + 80) continue;
  const s = rr(1.5, 3.5);
  rr(0, 6); pick(TREEC);   // scattered field trees are 1-2 px dots from above and twinkle: not drawn (random calls kept so the rest of the world stays the same)
}
const unitBox = new THREE.BoxGeometry(1, 1, 1); unitBox.translate(0, 0.5, 0);
const flat = new THREE.BoxGeometry(1, 0.02, 1);
instanced(unitBox, M('#ffffff'), houses);
const roofG = gable(1, 1, 1);
instanced(roofG, M('#ffffff'), roofs);
const hipG = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); hipG.rotateY(Math.PI / 4); hipG.translate(0, 0.5, 0);
instanced(hipG, M('#ffffff'), hips);
instanced(unitBox, M('#ffffff', { roughness: 0.75 }), towers);
layer(instanced(flat, M('#4d8db0', { roughness: 0.3 }), river, false), 2);
const treeG = jitter(new THREE.IcosahedronGeometry(0.5, 1), 0.28);
instanced(treeG, M('#ffffff'), trees);
const trunkG = new THREE.CylinderGeometry(0.12, 0.16, 1, 5); trunkG.translate(0, 0.5, 0);
instanced(trunkG, M('#6b4e36'), trunks);
layer(instanced(flat, M('#5d5f63', { roughness: 0.95 }), roads, false), 3);
instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#ffffff', { roughness: 0.5 }), cars);
layer(instanced(flat, M('#ffffff'), fields, false), 1);
layer(instanced(flat, M('#59b8d6', { roughness: 0.25 }), pools, false), 4);
// road centre dashes near the middle
const dashes = [];
for (let k = -12; k <= 12; k++) { const p = k * LOT * 2 + LOT; for (let s = -TOWN_R; s < TOWN_R; s += 16) { if (Math.abs(p) > TOWN_R) continue; dashes.push({ x: p, z: s, y: 0.03, sx: 0.55, sz: 7 }); dashes.push({ x: s, z: p, y: 0.031, sx: 7, sz: 0.55 }); } }   // few, wide dashes: thin ones shimmer from above
layer(instanced(flat, M('#efe7cf'), dashes, false), 5);
// far hills ring
const hills = [];
for (let k = 0; k < 90; k++) {
  const a = (k / 90) * Math.PI * 2 + rr(-0.03, 0.03), d = rr(16000, 30000);
  hills.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, sx: rr(4000, 9000), sy: rr(700, 2200), sz: rr(4000, 9000), r: rr(0, 6), c: pick(['#6f8f6a', '#7d9a76', '#64836a']) });
}
const hillG = jitter(new THREE.IcosahedronGeometry(1, 1), 0.2); hillG.translate(0, -0.25, 0);
instanced(hillG, M('#ffffff'), hills, false);

}
