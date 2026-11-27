// What if you dug down and couldn't stop? (8:02). One shaft, drawn twice: down to the centre, then up the far side.
import * as THREE from 'three';
import { FPS, monotone, logCurve, lerp, clamp, smooth, keyed, renderer, scene, camera, skyMat, sky, hemi, sun, M, rnd } from '../../src/engine/stage.js';
import { buildHome } from '../../src/engine/home.js';
import { buildHands } from '../../src/engine/hands.js';
import { buildEiffel, buildBurj } from '../../src/engine/landmarks.js';
import { overlay } from '../../src/engine/readout.js';

export const DURATION = 482;

// ---------- the journey: stage times (s) and the real number (metres from your room) ----------
const T = [0, 15, 30, 45, 60, 75, 90, 108, 126, 144, 162, 180, 195, 210, 225, 240, 255, 270, 285, 305, 330, 355, 380, 405, 425, 450, 465];
const DIST = [0.3, 1.5, 3, 10, 30, 93, 330, 828, 2212, 3900, 12262, 35000, 150000, 410000, 660000, 2000000, 2891000, 4000000, 5150000, 6371000, 7592000, 9851000, 12731000, 12738300, 12741800, 12742000, 12742000];
const AK = T.map((t, i) => [t, DIST[i]]).concat([[482, 12742000]]);
export const altitude = logCurve(AK, 0.25);
// temperature (top right), same stage times
const TEMP = [15, 12, 12, 12, 12, 13, 16.5, 23, 42, 65, 180, 500, 1200, 1500, 1650, 2200, 3700, 4800, 6000, 6000, 6000, 3700, 500, 2, 15, 20, 20];

// ---------- the picture: how far the camera has gone along the shaft (D, world units; the centre is D = 1540) ----------
const DV = [0, 20, 45, 75, 110, 150, 205, 265, 330, 395, 460, 530, 605, 685, 770, 860, 955, 1055, 1160, 1275, 1160, 955, 300, 90, 30, 0, -12];
const K = 4;   // world units per stage unit: the fall is fast
const Dc = monotone(T.concat([482]), DV.concat([-20]));
const T_CENTER = 305, T_SWAP = 306;
const R_KEYS = [[0, 3], [20, 4], [45, 6], [110, 10], [135, 24], [290, 24], [305, 30], [318, 46], [345, 46], [360, 14], [385, 9], [420, 9], [445, 9], [455, 2.6], [478, 2.6], [492, 9], [530, 10], [600, 12], [1275, 12]];
const Rof = (D) => keyed(R_KEYS, D);
const COLS = [[0, '#5a4030'], [8, '#6b4e37'], [45, '#8a6a4c'], [180, '#9a9086'], [320, '#a69c90'], [450, '#6e6a70'], [525, '#7a5242'], [600, '#9b3f26'], [770, '#bd4d1a'],
  [900, '#dc6a1a'], [955, '#ef8f2e'], [975, '#ffd27a'], [1055, '#ffd9a0'], [1160, '#ffe2b0'], [1275, '#ffe8c0']].map(([d, c]) => [d, new THREE.Color(c)]);
function colorAt(D) { for (let i = 0; i < COLS.length - 1; i++) if (D <= COLS[i + 1][0]) return COLS[i][1].clone().lerp(COLS[i + 1][1], clamp((D - COLS[i][0]) / (COLS[i + 1][0] - COLS[i][0]), 0, 1)); return COLS[COLS.length - 1][1].clone(); }
const WOW = [75, 90, 108, 126, 144, 162];
const PITCH = [[0, -36], [2.2, -56], [3.6, -78]].concat(WOW.flatMap((w) => [[w - 6, -78], [w - 1.5, -52], [w + 3, -52], [w + 8, -78]])).concat([[305, -78], [335, 72], [425, 72], [450, 60], [465, 28], [482, 14]]);
const YAW = [[0, 0], [305, 18], [335, 28], [482, 40]];

const LINES = [];
const SL = ['You’re digging through your own floor.', 'Soil is only a thin skin.', 'You’re below the water pipes.', 'Winter and summer can’t reach you.', 'You’ve passed the water table.',
  'Deeper than the Statue of Liberty.', 'Deeper than the Eiffel Tower is tall.', 'Deeper than the tallest building.', 'The deepest known cave is above you.', 'Miners stop here. You don’t.',
  'No drill has gone deeper than this.', 'You’ve left the crust.', 'Diamonds are born around here.', 'Solid rock flows around you.', 'A sunken ocean floor lies beside you.',
  'You’re inside most of the planet.', 'Gravity is strongest here.', 'Liquid iron moves around you.', 'Crushing pressure keeps this iron solid.', 'Nothing pulls you any more.',
  'You’re heading out the other side.', 'The liquid iron is behind you.', 'The crust here is thin.', 'Hot springs rise from the seabed.', 'You can see sunlight again.',
  'You’ve crossed the whole planet.', 'And you still can’t stop.'];
SL.forEach((s, i) => { const t0 = T[i] + (i === 0 ? 3.7 : 0.9), end = i === 26 ? 480 : Math.min(T[i + 1] - 1.2, t0 + 9); LINES.push([t0, end, s]); });
// calm fillers in the longer gaps (true, simple)
[[22, 28, 'Roots hang in the dark.'], [37, 43, 'It’s getting quiet down here.'], [53, 59, 'The air smells of wet stone.'], [68, 73.5, 'Your room is a small light now.'],
  [185, 192, 'Heat comes up from below.'], [246, 253, 'Pressure builds with every metre.'], [312, 322, 'Up is now the other way.'], [340, 350, 'You’re gaining speed again.']].forEach((l) => LINES.push(l));
LINES.push([0.3, 3.4, 'What if you dug down and couldn’t stop?']);
LINES.sort((a, b) => a[0] - b[0]);

// ---------- world ----------
scene.background = new THREE.Color('#050404');
sky.visible = false;
const before = new Set(scene.children);
const { lamp } = buildHome();
const ROOM = scene.children.filter((o) => !before.has(o));
const hole = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: '#050403' }));
hole.rotation.x = -Math.PI / 2; hole.position.set(0.25, 0.012, -0.2); ROOM.push(hole); scene.add(hole);

const hash2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
function buildShaft(seed, d0, d1) {
  const seg = 26, step = 3, len = (d1 - d0) * K, rings = Math.ceil(len / step);
  const g = new THREE.CylinderGeometry(1, 1, len, seg, rings, true);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const ix = i % (seg + 1), iy = Math.floor(i / (seg + 1)), ang = Math.atan2(p.getZ(i), p.getX(i));
    const D = d0 + (len / 2 - p.getY(i)) / K, n = hash2((ix % seg) + seed, iy + seed * 3) - 0.5, n2 = hash2(iy * 0.31 + seed, 7);
    const r = Rof(D) * (1 + n * 0.34 * (D > 440 ? 0.6 : 1));
    p.setXYZ(i, Math.cos(ang) * r, p.getY(i), Math.sin(ang) * r);
    const cc = colorAt(D).multiplyScalar((0.7 + 0.4 * n2 + 0.2 * n) * (1 + 0.3 * Math.sin(D * K / 7.0 + seed) * (D < 1000 ? 1 : 0.3)));
    if (hash2((ix % seg) * 1.7 + seed, iy * 0.5 + 3) > 0.93 && D > 30) cc.lerp(new THREE.Color(D > 525 ? '#ffc864' : '#f0e6d2'), 0.7).multiplyScalar(1.5);
    cc.toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  m.position.y = -(d0 * K + len / 2); scene.add(m); return m;
}
const nearShaft = buildShaft(1, 0, 1290);
const farShaft = buildShaft(5, 90, 1290); farShaft.visible = false;

const nearSet = new THREE.Group(), farSet = new THREE.Group(); scene.add(nearSet, farSet); farSet.visible = false;
const at = (grp, D, x, z) => { const o = new THREE.Group(); o.position.set(x, -D * K, z); grp.add(o); return o; };
const mesh = (geo, color, parent, x = 0, y = 0, z = 0, opts) => { const m = new THREE.Mesh(geo, M(color, opts)); m.position.set(x, y, z); parent.add(m); return m; };
const glow = (color) => new THREE.MeshBasicMaterial({ color });

// 1:15 Statue of Liberty (93 m: base to torch), hanging upside down
{
  const o = at(nearSet, 150, -4, -14), s = new THREE.Group(); o.add(s); s.rotation.x = Math.PI;
  const stone = '#b9b2a2', green = '#6fa89a';
  mesh(new THREE.BoxGeometry(14, 42, 14), stone, s, 0, 21 - 46.5, 0);            // pedestal
  mesh(new THREE.ConeGeometry(7, 26, 8), green, s, 0, 42 + 13 - 46.5, 0);          // robe
  mesh(new THREE.SphereGeometry(2.6, 8, 6), green, s, 0, 70 - 46.5, 0);            // head
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 1.1 - 0.55 * Math.PI; mesh(new THREE.ConeGeometry(0.5, 4, 4), green, s, Math.sin(a) * 3.4, 72.5 - 46.5, Math.cos(a) * 3.4).rotation.z = -a; }
  const arm = mesh(new THREE.CylinderGeometry(1, 1.3, 22, 6), green, s, 4, 80 - 46.5, 0); arm.rotation.z = -0.12;
  mesh(new THREE.ConeGeometry(2.2, 5, 6), '#f2c66a', s, 5.5, 94 - 46.5, 0, { emissive: '#f2a030', emissiveIntensity: 1.2 });   // torch
}
// 1:30 Eiffel Tower, tip first; 1:48 Burj Khalifa, spire first
{
  const E = buildEiffel(0, 0); scene.remove(E); const o = at(nearSet, 205, 5, -14); const w = new THREE.Group(); o.add(w); w.add(E); E.position.set(0, 0, 0); w.rotation.x = Math.PI; w.scale.setScalar(0.3); w.position.y = 0; w.children[0].position.y = -165;
  const B = buildBurj(0, 0); scene.remove(B); const o2 = at(nearSet, 265, -4, -14); const w2 = new THREE.Group(); o2.add(w2); w2.add(B); w2.rotation.x = Math.PI; w2.scale.setScalar(0.11); B.position.y = -414;
  for (const t of [E, B]) t.traverse((m) => { if (m.isMesh) { m.castShadow = false; } });
}
// 2:06 deepest cave: stalactites and stalagmites in a huge cavern
{
  const o = at(nearSet, 330, 0, 0); const mat = '#a29a8c';
  for (let k = 0; k < 34; k++) { const a = rnd() * Math.PI * 2, r = 28 + rnd() * 16, h = 5 + rnd() * 16, up = rnd() < 0.5; const m = mesh(new THREE.ConeGeometry(1.2 + rnd() * 2.2, h, 6), mat, o, Math.cos(a) * r, (rnd() - 0.5) * 40, Math.sin(a) * r); m.rotation.x = up ? 0 : Math.PI; }
  mesh(new THREE.TorusGeometry(52, 0.6, 5, 40), '#7ab8d8', o, 0, -22, 0, { emissive: '#4a8ab0', emissiveIntensity: 0.6 }).rotation.x = Math.PI / 2;   // an underground lake rim
}
// 2:24 the lift cage of a gold mine
{
  const o = at(nearSet, 395, 3, -3);
  const cage = new THREE.Group(); o.add(cage);
  mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), '#4d555c', cage, 0, -2, 0); mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), '#4d555c', cage, 0, 2, 0);
  for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) mesh(new THREE.BoxGeometry(0.18, 4, 0.18), '#c9a227', cage, x, 0, z);
  mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), '#ffe9a0', cage, 0, 0.2, 1.4, { emissive: '#ffd060', emissiveIntensity: 1 });
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 400, 4), '#222', o, 0, 202, 0);
}
// 2:42 the bottom of the Kola borehole: a narrow bore, a drill bit
{ const o = at(nearSet, 470, 0.9, 0.9); mesh(new THREE.ConeGeometry(0.7, 1.6, 8), '#8a929a', o, 0, -0.8, 0).rotation.x = Math.PI; mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 6), '#6a7077', o, 0, 15, 0); }
// 3:15 a diamond growing in the rock
{
  const o = at(nearSet, 605, -2.5, -1);
  const dia = mesh(new THREE.OctahedronGeometry(2.6), '#d8f4ff', o, 0, 0, 0, { emissive: '#8fd4ff', emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.2 }); dia.scale.set(1, 1.5, 1);
  nearSet.userData.dia = dia;
  for (let k = 0; k < 9; k++) mesh(new THREE.OctahedronGeometry(0.35 + rnd() * 0.5), '#bde8ff', o, (rnd() - 0.5) * 9, (rnd() - 0.5) * 12, (rnd() - 0.5) * 6, { emissive: '#6fb8e8', emissiveIntensity: 0.9 });
}
// 3:45 a sunken ocean plate: a cold, dark slab
{ const o = at(nearSet, 770, -7, -3); const s = mesh(new THREE.BoxGeometry(46, 1.8, 30), '#35465e', o, 0, 0, 0); s.rotation.z = 0.55; s.rotation.y = 0.5; const s2 = mesh(new THREE.BoxGeometry(40, 1.2, 24), '#2d3b4f', o, -6, -8, 4); s2.rotation.z = 0.55; s2.rotation.y = 0.5; }
// 4:30 liquid iron: bright streaks flowing past (animated)
const IRON = [];
{ const o = at(nearSet, 1055, 0, 0); for (let k = 0; k < 46; k++) { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 7; const m = new THREE.Mesh(new THREE.BoxGeometry(0.5 + rnd() * 0.8, 6 + rnd() * 14, 0.5 + rnd() * 0.8), glow(rnd() < 0.5 ? '#ffe9b8' : '#ffb35a')); m.position.set(Math.cos(a) * r, (rnd() - 0.5) * 80, Math.sin(a) * r); o.add(m); IRON.push([m, rnd() * 80, 4 + rnd() * 8]); } }
// 4:45 the inner core ahead, and the centre
{ const o = at(nearSet, 1280, 0, 0); mesh(new THREE.SphereGeometry(30, 20, 14), '#fff6dc', o, 0, 0, 0).material = new THREE.MeshBasicMaterial({ color: '#fff3d0', side: THREE.DoubleSide, fog: false }); }
// far side: the seabed with black smokers, and the sea above
{
  const sea = at(farSet, 90, 0, 0);
  const bed = new THREE.Mesh(new THREE.RingGeometry(5.2, 600, 40, 1), M('#3b3a3c', { side: THREE.DoubleSide })); bed.rotation.x = -Math.PI / 2; sea.add(bed);
  for (let k = 0; k < 14; k++) {
    const a = rnd() * Math.PI * 2, r = 9 + rnd() * 50, h = 6 + rnd() * 12, x = Math.cos(a) * r, z = Math.sin(a) * r;
    mesh(new THREE.CylinderGeometry(0.9, 2.2, h, 7), '#2a2a2c', sea, x, h / 2, z);
    mesh(new THREE.SphereGeometry(1.1, 6, 5), '#ff9a3c', sea, x, h + 0.4, z).material = glow('#ff9a3c');
    for (let j = 0; j < 5; j++) mesh(new THREE.SphereGeometry(1.6 + j * 0.7, 6, 5), '#3a3a40', sea, x + j * 0.4, h + 3 + j * 3.4, z, { transparent: true, opacity: 0.35 });
  }
}
nearSet.traverse((m) => { if (m.isMesh && m.material.isMeshStandardMaterial && m.material.emissive.getHex() === 0) { m.material = m.material.clone(); m.material.emissive.copy(m.material.color).multiplyScalar(0.42); } });
const OCEAN = new THREE.Mesh(new THREE.CircleGeometry(60000, 48), new THREE.MeshStandardMaterial({ color: '#1f6f9f', emissive: '#2c78a8', emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
OCEAN.rotation.x = -Math.PI / 2; OCEAN.visible = false; scene.add(OCEAN);

const NR = 260, ROCKS = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#5e564e', flatShading: true, roughness: 0.9 }), NR);
ROCKS.frustumCulled = false; scene.add(ROCKS);
const RK = Array.from({ length: NR }, () => ({ a: rnd() * 6.283, r: 0.25 + rnd() * 0.6, y: rnd(), s: 0.06 + rnd() * rnd() * 0.4 }));
const _o = new THREE.Object3D();
const gcv = document.createElement('canvas'); gcv.width = gcv.height = 128; { const gx = gcv.getContext('2d'), gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128); }
const GLOW = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gcv), color: '#ffb060', blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, transparent: true, opacity: 0 }));
GLOW.renderOrder = 999; scene.add(GLOW);
const fogBase = new THREE.Fog('#050404', 8, 150); scene.fog = fogBase;
const lamp2 = new THREE.PointLight('#cfd8ff', 30, 0, 1.4); scene.add(lamp2);
const { poseHands, drawHands } = await buildHands();
const $ = (id) => document.getElementById(id);
// ---------- anticipation layer: journey gauge, "next" tag, chapter titles ----------
const css = document.createElement('style');
css.textContent = `.ro{text-shadow:0 2px 22px rgba(0,0,0,.55),0 1px 4px rgba(0,0,0,.5) !important}#line{text-shadow:0 2px 20px rgba(0,0,0,.75),0 1px 5px rgba(0,0,0,.65) !important}
#c,#acc{filter:contrast(1.12) saturate(1.2) brightness(1.04)}
#gauge{position:absolute;right:62px;top:430px;width:3px;height:410px;background:rgba(255,255,255,.25);border-radius:2px}
#gfill{position:absolute;right:62px;top:430px;width:3px;height:0;background:#fff;border-radius:2px}
#gdot{position:absolute;right:56px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 0 16px 4px rgba(255,255,255,.65)}
.gt{position:absolute;right:92px;font:600 16px "IN";letter-spacing:.2em;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.7);white-space:nowrap}
.gk{position:absolute;right:58px;width:11px;height:2px;background:#fff}
#next{position:absolute;right:108px;top:872px;font:600 23px "IN";letter-spacing:.2em;color:#fff;text-align:right;white-space:nowrap;text-shadow:0 2px 12px rgba(0,0,0,.75);opacity:0}
#next b{font-weight:800;opacity:.85}
#chap{position:absolute;left:0;right:0;top:640px;text-align:center;font:500 78px "NR";letter-spacing:.28em;color:#fff;opacity:0;text-shadow:0 2px 26px rgba(0,0,0,.6);white-space:nowrap}
#chap small{display:block;font:600 24px "IN";letter-spacing:.3em;margin-top:6px;opacity:.85}`;
document.head.appendChild(css);
const mk = (id, parent = $('stage')) => { const e = document.createElement('div'); e.id = id; parent.appendChild(e); return e; };
const GH = 410, GTOP = 430, GN = 26;
mk('gauge'); const gfill = mk('gfill'), gdot = mk('gdot'), nextEl = mk('next'), chapEl = mk('chap');
const GTICKS = [['SURFACE', 0], ['MANTLE', 11], ['CORE', 16], ['CENTRE', 19], ['FAR SIDE', 22]];
const gtEls = GTICKS.map(([name, i]) => { const y = GTOP + (i / GN) * GH; const k = document.createElement('div'); k.className = 'gk'; k.style.top = y + 'px'; $('stage').appendChild(k);
  const e = document.createElement('div'); e.className = 'gt'; e.textContent = name; e.style.top = (y - 10) + 'px'; $('stage').appendChild(e); return [i, e, k]; });
// what is coming next (stage index it belongs to, shown as "NEXT" for 10 s before and "NOW" for 5 s after)
const MILE = [[5, 'STATUE OF LIBERTY · 93 m'], [6, 'EIFFEL TOWER · 330 m'], [7, 'BURJ KHALIFA · 828 m'], [8, 'THE DEEPEST CAVE · 2,212 m'], [9, 'THE DEEPEST MINE · 3.9 km'],
  [10, 'THE DEEPEST HOLE EVER DRILLED · 12.3 km'], [11, 'THE BOTTOM OF THE CRUST · 35 km'], [12, 'DIAMONDS · 150 km'], [14, 'A SUNKEN OCEAN FLOOR · 660 km'], [16, 'THE EARTH’S CORE · 2,891 km'],
  [17, 'LIQUID IRON · 4,000 km'], [18, 'THE INNER CORE · 5,150 km'], [19, 'THE CENTRE OF THE EARTH · 6,371 km'], [22, 'THE FAR SIDE’S CRUST · 12,731 km'], [23, 'THE SEABED · 12,738 km'], [25, 'THE FAR SIDE OF THE WORLD · 12,742 km']];
const TEASE = [[3.8, 11, 'DESTINATION', 'THE OTHER SIDE OF THE EARTH · 12,742 km'], [38, 46, 'COMING UP', 'THE TALLEST BUILDINGS, UPSIDE DOWN'], [168, 176, 'COMING UP', 'DIAMONDS · THEN THE HEAT OF THE MANTLE'],
  [232, 240, 'COMING UP', 'A SEA OF LIQUID IRON'], [286, 295, 'ALMOST THERE', 'THE EXACT CENTRE OF THE EARTH'], [331, 340, 'NOW', 'THE OTHER HALF OF THE JOURNEY'], [430, 441, 'LAST STRETCH', 'LIGHT · AIR · THE OTHER SIDE OF THE WORLD']];
const CHAPS = [[2.5, 6.2, 'THE CRUST', 'Earth’s thin outer skin'], [180, 184.5, 'THE MANTLE', 'Hot rock that flows'], [255, 259.5, 'THE OUTER CORE', 'A sea of liquid iron'], [285, 289.5, 'THE INNER CORE', 'Solid iron, hot as the Sun’s surface'],
  [305, 310, 'THE CENTRE', 'Where gravity is zero'], [380, 384.5, 'THE FAR SIDE', 'Crust under an ocean'], [405, 409.5, 'THE OCEAN', 'Water from the bottom up'], [450, 454.5, 'THE SURFACE', 'The other side of the world']];
function extras(t) {
  let si = 0; for (let i = 0; i < T.length - 1; i++) if (t >= T[i]) si = i + (t - T[i]) / (T[i + 1] - T[i]); if (t >= T[T.length - 1]) si = T.length - 1 + (t - T[T.length - 1]) / 17;
  const g = clamp(si / GN, 0, 1), vis = smooth(1.5, 3.2, t);
  gfill.style.height = (g * GH) + 'px'; gfill.style.opacity = vis; $('gauge').style.opacity = vis; gdot.style.top = (GTOP + g * GH - 7) + 'px'; gdot.style.opacity = vis;
  for (const [i, e, k] of gtEls) { const o = (si >= i - 0.01 ? 1 : 0.5) * vis; e.style.opacity = o; k.style.opacity = o; }
  let txt = '', op = 0;
  for (const [a, b, lab, tx] of TEASE) if (t >= a && t < b) { txt = '<b>' + lab + '</b> · ' + tx; op = Math.min(smooth(a, a + 0.6, t), 1 - smooth(b - 0.6, b, t)); }
  for (const [i, tx] of MILE) { const arr = T[i], a = arr - 10, b = arr + 5;
    if (t >= a && t < b) { const now = t >= arr - 1; txt = '<b>' + (now ? 'NOW' : 'NEXT') + '</b> · ' + tx; op = Math.min(smooth(a, a + 0.6, t), 1 - smooth(b - 0.6, b, t)); } }
  nextEl.innerHTML = txt; nextEl.style.opacity = op * vis;
  let ct = '', co = 0;
  for (const [a, b, h, sub] of CHAPS) if (t >= a && t < b) { ct = h + '<small>' + sub.toUpperCase() + '</small>'; co = Math.min(smooth(a, a + 0.7, t), 1 - smooth(b - 0.9, b, t)); }
  chapEl.innerHTML = ct; chapEl.style.opacity = co;
}
$('label').textContent = 'DISTANCE FROM YOUR ROOM'; $('sub').textContent = 'AND STILL DIGGING';

const fmtNum = (a) => a < 10 ? a.toFixed(1) + ' m' : a < 15000 ? Math.round(a).toLocaleString('en-US') + ' m'
  : (a / 1000 < 12000 ? Math.round(a / 1000).toLocaleString('en-US') : (a / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })) + ' km';
const tempOf = (t) => { // smooth through the stage values, in time
  const f = monotone(T, TEMP); return f(t);
};
const tempF = monotone(T, TEMP);

// ---------- frame ----------
const v3 = new THREE.Vector3();
function frame(f) {
  const t = f / FPS, ad = altitude(t), D = Dc(t);
  const out = t >= T_SWAP;
  const roomOff = 1.6 * (1 - smooth(0.3, 2.3, t));
  const eye = -D * K + roomOff;
  camera.position.set(0.25 * (1 - smooth(1.5, 3.5, t)), eye, t < 3 ? 1.35 * (1 - smooth(0, 3, t)) - 0.2 * smooth(0, 3, t) : 0);
  camera.rotation.x = THREE.MathUtils.degToRad(keyed(PITCH, t));
  camera.rotation.y = THREE.MathUtils.degToRad(keyed(YAW, t));
  camera.rotation.z = 0; camera.near = 0.05; camera.updateProjectionMatrix();

  // the room only at the start; the floor lets go at ~4.4 s under a quick dark
  const inRoom = t < 2.6;
  for (const o of ROOM) o.visible = inRoom;
  $('dark').style.opacity = 0;
  nearShaft.visible = !out; nearSet.visible = !out;
  farShaft.visible = out; farSet.visible = out;
  const above = eye > 0 && out;       // above the water
  OCEAN.visible = out && D < 30;
  sky.visible = out && D < 3;
  const under = out && D > 0;

  // light and haze follow the heat
  const heat = clamp(Math.log10(Math.max(tempF(t), 10)) / 3.9, 0, 1);       // 0 cold .. 1 white-hot
  const warm = new THREE.Color().setHSL(lerp(0.08, 0.12, heat), lerp(0.2, 0.9, smooth(0.3, 0.75, heat)), lerp(0.82, 0.78, heat));
  let fogC = new THREE.Color().setHSL(lerp(0.07, 0.07, heat), 0.7, lerp(0.05, 0.3, smooth(0.5, 0.95, heat)));
  let fogFar = lerp(220, 420, smooth(0.5, 0.95, heat)), I = lerp(135, 70, heat);
  let hm = lerp(0.85, 0.6, smooth(0.45, 0.95, heat));
  if (t < 3) { fogC = new THREE.Color('#050404'); }
  if (out && D < 110) {                                   // water
    const w = smooth(110, 92, D);
    fogC.lerp(new THREE.Color('#1c78ad'), w); fogFar = lerp(fogFar, lerp(90, 220, smooth(90, 3, D)), w);
    warm.lerp(new THREE.Color('#a6dcff'), w); hm = lerp(hm, lerp(0.7, 1.5, smooth(90, 0, D)), w); I = lerp(I, 45, w);
    fogC.lerp(new THREE.Color('#4aa6d8'), smooth(35, 0, D) * w);
  }
  if (out && D <= 3) { const u = smooth(3, -4, D); fogC.lerp(new THREE.Color('#b9bdd8'), u); fogFar = lerp(fogFar, 9000, u); }
  fogBase.color.copy(fogC); scene.background = fogC.clone(); fogBase.near = 6; fogBase.far = fogFar;
  lamp2.color.copy(warm); lamp2.intensity = I * (out && D < 20 ? 0.1 : 1); lamp2.position.set(camera.position.x, eye - 1, camera.position.z);
  hemi.intensity = hm; sun.castShadow = inRoom; sun.intensity = inRoom ? 3.0 : (out && D < 10 ? 3.7 : 0);
  if (!inRoom) { sun.position.set(-30, 70, -45); sun.target.position.set(0, 0, 0); }
  lamp.intensity = inRoom ? 2.2 : 0;
  OCEAN.position.set(camera.position.x, 0, camera.position.z);
  sky.position.copy(camera.position); skyMat.uniforms.alt.value = 0;

  { const dirY = out ? 1 : -1, show = t > 2.4 && !(out && D < 60);
    GLOW.visible = show; GLOW.position.set(camera.position.x, eye + dirY * 140, camera.position.z); GLOW.scale.setScalar(120 + 260 * heat);
    GLOW.material.color.copy(warm).lerp(new THREE.Color('#ff8a2a'), 0.35); GLOW.material.opacity = lerp(0.16, 0.85, smooth(0.35, 0.95, heat)) * smooth(2.4, 4, t) * (1 - smooth(60, 30, D) * (out ? 1 : 0)); }
  // rocks fixed in the shaft: they rush past you, which is what shows the speed
  { const H = 160, Dold = D; ROCKS.visible = !inRoom && !(out && D < 112);
    for (let i = 0; i < NR; i++) { const k = RK[i]; const yy = ((k.y * H - eye) % H + H) % H - H / 2 + eye; const R = Rof(clamp(Dold, 0, 1275)) * k.r;
      _o.position.set(Math.cos(k.a) * R, yy, Math.sin(k.a) * R); _o.rotation.set(k.a * 3, k.y * 9, 0); _o.scale.setScalar(k.s * (0.5 + R / 20)); _o.updateMatrix(); ROCKS.setMatrixAt(i, _o.matrix); }
    ROCKS.instanceMatrix.needsUpdate = true; }
  // things that move
  if (nearSet.userData.dia) nearSet.userData.dia.rotation.y = t * 0.5;
  for (const [m, ph, sp] of IRON) { const y = ((ph + t * sp) % 80) - 40; m.position.y = y; }
  if (t < 80) hole.rotation.z = 0;

  extras(t);
  $('dark').style.opacity = smooth(479.6, 481.8, t);
  poseHands(t, 0.3);
  const labelWater = t >= 395;
  overlay(t, ad, LINES, {
    num: fmtNum, fit: 800,
    right: () => {
      const tv = tempF(t), est = (t >= 175 && t < 395) || t >= 415;
      const val = tv < 100 ? Math.round(tv * (tv < 20 ? 2 : 1) / (tv < 20 ? 2 : 1)) : Math.round(tv / (tv >= 1000 ? 100 : 10) ) * (tv >= 1000 ? 100 : 10);
      return [labelWater ? 'WATER TEMPERATURE' : 'ROCK TEMPERATURE', (est ? '~' : '') + val.toLocaleString('en-US') + ' °C', 1];
    },
  });
  $('sub').textContent = t < T_CENTER ? 'AND STILL DIGGING' : 'AND STILL GOING';
  if (!window.__SIDE) renderer.render(scene, camera);
  drawHands();
}

window.renderFrame = (f) => { frame(f); return true; };
window.TOTAL_FRAMES = FPS * DURATION;
window.ALT = (t) => altitude(t);
document.fonts.ready.then(() => { window.READY = true; });
if (!window.__RENDERER) {
  const t0 = performance.now();
  const loop = () => { frame(Math.floor(((performance.now() - t0) / 1000 * FPS) % (FPS * DURATION))); requestAnimationFrame(loop); };
  loop();
}
