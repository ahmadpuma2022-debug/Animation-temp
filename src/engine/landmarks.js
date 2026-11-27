import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene, M } from './stage.js';

// Famous tall things standing on the ground at their real heights (metres), placed beside your path the way
// scale-comparison videos do: the Eiffel Tower (330 m), the Burj Khalifa (828 m), Mount Everest (8,849 m).
// Low-poly and flat shaded like the rest of the world. They cast no shadows: their real shadows at a low sun are
// kilometres long and would be cut off at the edge of the fixed shadow area.
const UP = new THREE.Vector3(0, 1, 0);
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = false; m.receiveShadow = true; parent.add(m); return m;
}
// a square beam that tapers from radius r0 at point a to r1 at point b
function strut(parent, mat, a, b, r0, r1) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 4, 1); g.rotateY(Math.PI / 4);
  const m = add(parent, g, mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// ---------- Eiffel Tower: 4 legs, arches, 2 platforms, the long top section, antenna to 330 m ----------
export function buildEiffel(x, z) {
  const g = new THREE.Group(), mat = M('#8b6e55', { roughness: 0.8 }), V = (a, b, c) => new THREE.Vector3(a, b, c);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    strut(g, mat, V(50 * sx, 0, 50 * sz), V(24 * sx, 57, 24 * sz), 11, 7);        // the four legs
    strut(g, mat, V(23 * sx, 61, 23 * sz), V(12 * sx, 115, 12 * sz), 6, 4);       // second stage
    strut(g, mat, V(11 * sx, 117, 11 * sz), V(2.6 * sx, 276, 2.6 * sz), 3.6, 1.4); // the long top section
  }
  // the big arches between the legs (half a torus in each face)
  for (const [ax, az, ry] of [[0, 43, 0], [0, -43, 0], [43, 0, Math.PI / 2], [-43, 0, Math.PI / 2]]) {
    const arch = add(g, new THREE.TorusGeometry(35, 1.8, 4, 20, Math.PI), mat, ax, 4, az); arch.rotation.y = ry;
  }
  add(g, new THREE.BoxGeometry(72, 6, 72), mat, 0, 57, 0);   // first platform
  add(g, new THREE.BoxGeometry(40, 4, 40), mat, 0, 115, 0);  // second platform
  // square frames tying the top section together
  for (const y of [150, 190, 230, 262]) {
    const s = 11 - (y - 117) / 159 * 8.4;
    for (const [w, d, px, pz] of [[2 * s, 0.9, 0, s], [2 * s, 0.9, 0, -s], [0.9, 2 * s, s, 0], [0.9, 2 * s, -s, 0]]) add(g, new THREE.BoxGeometry(w, 1.4, d), mat, px, y, pz);
  }
  add(g, new THREE.BoxGeometry(9, 9, 9), mat, 0, 280, 0);                                // top platform
  add(g, new THREE.CylinderGeometry(1.5, 4, 8, 6), mat, 0, 288, 0);
  add(g, new THREE.CylinderGeometry(0.5, 1.1, 38, 6), M('#b8b0a6'), 0, 311, 0);          // antenna, tip at 330 m
  g.position.set(x, 0, z); scene.add(g); return g;
}

// ---------- Burj Khalifa: three wings that step back in a spiral, a hexagonal core, a spire to 828 m ----------
export function buildBurj(x, z) {
  const g = new THREE.Group(), glass = M('#c4ced8', { roughness: 0.4, metalness: 0.15 }), steel = M('#9aa6b2', { roughness: 0.45, metalness: 0.2 });
  [90, 210, 330].forEach((deg, w) => {
    const a = deg * Math.PI / 180;
    for (let k = 0; k < 9; k++) {
      const top = 110 + k * 55 + w * 18, len = 64 - k * 6.4, wid = 27 - k * 1.3;   // each tier shorter, narrower, taller
      const b = add(g, new THREE.BoxGeometry(len, top, wid), glass, Math.cos(a) * len / 2, top / 2, Math.sin(a) * len / 2);
      b.rotation.y = -a;
    }
  });
  add(g, new THREE.CylinderGeometry(13, 19, 600, 6), glass, 0, 300, 0);   // core
  add(g, new THREE.CylinderGeometry(7, 11, 60, 6), steel, 0, 630, 0);
  add(g, new THREE.CylinderGeometry(0.5, 7, 170, 6), steel, 0, 743, 0);   // spire: 658 -> 828 m
  g.position.set(x, 0, z); scene.add(g); return g;
}

// ---------- Mount Everest (8,849 m) with Lhotse, Nuptse and lower peaks around it ----------
function peakGeo(r, h, seed) {
  let geo = new THREE.ConeGeometry(r, h, 11, 7, true); geo.translate(0, h / 2, 0);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo);                                  // shared corners move together: no cracks
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    if (Y > h - 1 || Y < 1) continue;                        // the summit and the base ring stay exactly in place
    const s = 1 + (hash(X * 0.0013 + seed, Y * 0.0011, Z * 0.0017) - 0.5) * 0.5;
    p.setXYZ(i, X * s, Y * (1 + (hash(X * 0.0021, Y * 0.0019 + seed, Z * 0.0023) - 0.5) * 0.14), Z * s);
  }
  geo = geo.toNonIndexed(); geo.computeVertexNormals();
  // colour each face by its height: snow on top, dark rock, then brown-green foothills
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const SNOW = new THREE.Color('#eef2f6'), ROCK = new THREE.Color('#6f6a66'), ROCK2 = new THREE.Color('#867c72'), LOW = new THREE.Color('#7f8770');
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const n = hash(cx * 0.01, cy * 0.01, seed);
    const f = cy / h;
    c.copy(f > 0.58 + n * 0.12 ? SNOW : f > 0.28 + n * 0.08 ? (n > 0.5 ? ROCK : ROCK2) : LOW);
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
export function buildEverest(x, z) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  // [dx, dz, height, base radius]: Everest itself, then Lhotse (8,516 m), Nuptse (7,861 m) and lower ridges
  for (const [dx, dz, h, r, s] of [[0, 0, 8849, 11000, 1], [2900, 3100, 8516, 7500, 2], [-2600, 2800, 7861, 6500, 3], [-5200, -1500, 7200, 8000, 4],
    [4800, -2400, 6900, 7000, 5], [8000, 4000, 6200, 8500, 6], [-8500, 4200, 5900, 8500, 7], [1500, -6500, 5600, 8000, 8]]) add(g, peakGeo(r, h, s), mat, dx, 0, dz);
  g.position.set(x, 0, z); scene.add(g); return g;
}
