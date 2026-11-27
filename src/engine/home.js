import * as THREE from 'three';
import { rnd, rr, pick, lerp, clamp, smooth, scene, M, box, jitter, gable, instanced, SUN, HAZE } from './stage.js';

// Your bedroom, your house and the lamp. Everything is added to the scene.
export function buildHome() {
const lamp = new THREE.PointLight('#ffc98a', 2.2, 7, 1.6);
lamp.position.set(-1.55, 1.05, -1.7);
scene.add(lamp);
// ---------- bedroom (interior x -2.2..2.2, z -2.2..2.2, h 2.7) ----------
const ROOM = { x0: -2.2, x1: 2.2, z0: -2.2, z1: 2.2, h: 2.7, t: 0.22 };
const WALL = '#e9dccb', WALL2 = '#d8e2e6', TRIM = '#f4efe7', WOOD = '#b98a5c', WOOD2 = '#a6764a';
// floor planks
for (let i = 0; i < 11; i++) {
  const x = ROOM.x0 + 0.2 + i * 0.4;
  box(0.395, 0.06, 4.4, i % 2 ? WOOD : WOOD2, x, -0.06, 0);
}
box(9.4, 0.25, 8.0, '#7d7468', 2.3, -0.31, 1.0); // slab under the house
// walls: back (-z) has the window
const WX0 = -0.55, WX1 = 1.15, WY0 = 0.9, WY1 = 2.15;
const zb = ROOM.z0 - ROOM.t / 2;
box(WX0 - ROOM.x0 + ROOM.t, ROOM.h, ROOM.t, WALL, (ROOM.x0 - ROOM.t + WX0) / 2, 0, zb);
box(ROOM.x1 + ROOM.t - WX1, ROOM.h, ROOM.t, WALL, (WX1 + ROOM.x1 + ROOM.t) / 2, 0, zb);
box(WX1 - WX0, WY0, ROOM.t, WALL, (WX0 + WX1) / 2, 0, zb);
box(WX1 - WX0, ROOM.h - WY1, ROOM.t, WALL, (WX0 + WX1) / 2, WY1, zb);
// window frame + sill + cross bars
box(WX1 - WX0 + 0.16, 0.07, 0.34, TRIM, (WX0 + WX1) / 2, WY0 - 0.07, zb + 0.04);
box(WX1 - WX0 + 0.12, 0.06, 0.1, TRIM, (WX0 + WX1) / 2, WY1, zb);
box(0.06, WY1 - WY0, 0.1, TRIM, WX0 - 0.03, WY0, zb); box(0.06, WY1 - WY0, 0.1, TRIM, WX1 + 0.03, WY0, zb);
box(0.04, WY1 - WY0, 0.06, TRIM, (WX0 + WX1) / 2, WY0, zb);
box(WX1 - WX0, 0.04, 0.06, TRIM, (WX0 + WX1) / 2, (WY0 + WY1) / 2, zb);
// curtains
for (const [x, s] of [[WX0 - 0.32, 1], [WX1 + 0.32, -1]]) {
  for (let k = 0; k < 4; k++) box(0.13, 2.2, 0.1 + (k % 2) * 0.05, '#7f9bb3', x + s * (k - 1.5) * 0.11, 0.3, zb + 0.18);
}
box(2.9, 0.04, 0.04, '#5b4a3a', (WX0 + WX1) / 2, 2.45, zb + 0.18);
// side walls, front wall, ceiling
box(ROOM.t, ROOM.h, 4.4 + ROOM.t * 2, WALL2, ROOM.x0 - ROOM.t / 2, 0, 0);
box(ROOM.t, ROOM.h, 4.4 + ROOM.t * 2, WALL2, ROOM.x1 + ROOM.t / 2, 0, 0);
box(4.4 + ROOM.t * 2, ROOM.h, ROOM.t, WALL, 0, 0, ROOM.z1 + ROOM.t / 2);
const ceil = box(4.4 + ROOM.t * 2, 0.18, 4.4 + ROOM.t * 2, '#f2eee8', 0, ROOM.h, 0);
// skirting
box(4.4, 0.1, 0.03, TRIM, 0, 0, ROOM.z0 + 0.015); box(0.03, 0.1, 4.4, TRIM, ROOM.x0 + 0.015, 0, 0); box(0.03, 0.1, 4.4, TRIM, ROOM.x1 - 0.015, 0, 0);
// bed (head against left wall)
box(2.05, 0.32, 1.45, '#8a6343', -1.1, 0.0, -0.55);
box(1.98, 0.22, 1.4, '#f3f1ec', -1.1, 0.32, -0.55);
box(1.35, 0.12, 1.46, '#d9744f', -0.78, 0.5, -0.55); // blanket
box(0.12, 0.85, 1.5, '#7a5538', -2.12, 0, -0.55); // headboard
box(0.42, 0.14, 0.62, '#ffffff', -1.85, 0.54, -0.86); box(0.42, 0.14, 0.62, '#eef2f6', -1.85, 0.54, -0.24);
// nightstand + lamp
box(0.5, 0.55, 0.45, WOOD2, -1.85, 0, -1.72);
box(0.08, 0.32, 0.08, '#3d3a36', -1.85, 0.55, -1.72);
const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.22, 7, 1, true), M('#ffe2b5', { emissive: '#ffb75e', emissiveIntensity: 0.9, side: THREE.DoubleSide }));
shade.position.set(-1.85, 0.97, -1.72); scene.add(shade);
// rug
box(1.9, 0.015, 1.3, '#4f6f8f', 0.55, 0, 0.75);
box(1.6, 0.017, 1.0, '#e2c58f', 0.55, 0, 0.75);
// desk, chair, monitor, mug, plant (right wall)
box(0.7, 0.05, 1.4, '#cfa978', 1.8, 0.72, 0.55);
for (const [dx, dz] of [[-0.3, -0.62], [0.3, -0.62], [-0.3, 0.62], [0.3, 0.62]]) box(0.05, 0.72, 0.05, '#4a4038', 1.8 + dx, 0, 0.55 + dz);
box(0.06, 0.38, 0.62, '#1d2024', 2.05, 0.85, 0.5); box(0.03, 0.3, 0.54, '#3b6ea8', 2.01, 0.89, 0.5, scene, { emissive: '#2f5c92', emissiveIntensity: 0.6 });
box(0.1, 0.12, 0.08, '#2e2b28', 2.05, 0.77, 0.5);
box(0.09, 0.1, 0.09, '#e45b4a', 1.65, 0.77, 0.05);
box(0.45, 0.05, 0.45, '#2f3b4a', 1.25, 0.46, 0.6); box(0.05, 0.5, 0.42, '#2f3b4a', 1.02, 0.5, 0.6);
for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.04, 0.46, 0.04, '#222', 1.25 + dx, 0, 0.6 + dz);
box(0.22, 0.24, 0.22, '#c86f4a', 1.9, 0, 1.75);
const plant = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(0.3, 0), 0.35), M('#4f8a3c'));
plant.position.set(1.9, 0.5, 1.75); plant.castShadow = true; scene.add(plant);
// shelf with books (left wall above bed? -> left wall near front)
box(0.28, 0.04, 1.1, WOOD, -2.06, 1.62, 1.2);
let bz = 0.7; const BOOK = ['#c2483b', '#2f6d8f', '#e0b04c', '#3f7a52', '#7b4e8f', '#e6e1d6', '#d27a3b'];
while (bz < 1.68) { const w = rr(0.04, 0.08), h = rr(0.18, 0.28); box(0.2, h, w, pick(BOOK), -2.04, 1.66, bz + w / 2); bz += w + 0.005; }
// posters on the right wall
box(0.03, 0.62, 0.46, '#20232a', 2.18, 1.45, -1.1); box(0.035, 0.54, 0.38, '#e98f5b', 2.17, 1.49, -1.1);
box(0.03, 0.42, 0.56, '#20232a', 2.18, 1.6, -0.2); box(0.035, 0.36, 0.5, '#6aa6c9', 2.17, 1.63, -0.2);
// door on front wall
box(0.9, 2.05, 0.05, '#c9b49a', -1.1, 0, ROOM.z1 - 0.03);

// ---------- our house exterior ----------
const HX0 = ROOM.x0 - ROOM.t, HX1 = 7.2, HZ0 = ROOM.z0 - ROOM.t, HZ1 = ROOM.z1 + ROOM.t;
box(HX1 - ROOM.x1 - ROOM.t, ROOM.h + 0.18, HZ1 - HZ0, '#e7d7c1', (ROOM.x1 + ROOM.t + HX1) / 2, 0, 0);
// attic: dark gable interior + roof
const roofW = HX1 - HX0 + 0.8, roofD = HZ1 - HZ0 + 0.9;
const roofIn = new THREE.Mesh(gable(roofW - 0.2, roofD - 0.6, 2.1), M('#3a2e25', { side: THREE.BackSide }));
roofIn.position.set((HX0 + HX1) / 2, ROOM.h + 0.18, 0); scene.add(roofIn);
const roof = new THREE.Mesh(gable(roofW, roofD, 2.35), M('#9b4b3c'));
roof.position.set((HX0 + HX1) / 2, ROOM.h + 0.12, 0); roof.castShadow = true; roof.receiveShadow = true; scene.add(roof);
box(0.6, 1.2, 0.6, '#8c847a', 4.8, 3.6, -0.6); // chimney
// garden fence + lawn patch
// garden fence: fewer, thicker pickets and NO cast shadow. Rows of thin picket shadows are a fine repeating
// pattern that shimmers as you move (it read as "shaking" through the window and over the yard)
for (let x = -8; x <= 12; x += 0.8) box(0.13, 0.9, 0.1, '#efe9df', x, 0, -9).castShadow = false;
box(20.5, 0.08, 0.06, '#efe9df', 2, 0.68, -9).castShadow = false;
{ const lawn = box(30, 0.02, 22, '#7fae5a', 2, -0.045, 0); lawn.castShadow = false; lawn.material = lawn.material.clone(); lawn.material.depthWrite = false; lawn.renderOrder = -10; }   // flat ground pieces only RECEIVE shadows (a thin slab casting onto itself flickers)

  return { lamp, ceil };
}
