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
const DV = [0, 3, 9, 20, 40, 70, 110, 160, 220, 290, 370, 460, 560, 670, 790, 920, 1060, 1210, 1370, 1540, 1370, 1060, 330, 120, 40, 0, -45];
const Dc = monotone(T.concat([482]), DV.concat([-70]));
const T_CENTER = 305, T_SWAP = 306;
const R_KEYS = [[0, 3], [20, 4], [50, 9], [80, 24], [210, 24], [225, 46], [255, 46], [275, 14], [330, 9], [352, 3], [372, 2.6], [392, 3], [420, 9], [470, 12], [1540, 12]];
const Rof = (D) => keyed(R_KEYS, D);
const COLS = [[0, '#5a4030'], [6, '#6b4e37'], [40, '#7d6a58'], [130, '#78706a'], [250, '#867d73'], [420, '#6e6a70'], [455, '#7a5242'], [520, '#9b3f26'], [700, '#bd4d1a'],
  [900, '#dc6a1a'], [1040, '#ef8f2e'], [1075, '#ffd27a'], [1200, '#ffd9a0'], [1370, '#ffe2b0'], [1540, '#ffe8c0']].map(([d, c]) => [d, new THREE.Color(c)]);
function colorAt(D) { for (let i = 0; i < COLS.length - 1; i++) if (D <= COLS[i + 1][0]) return COLS[i][1].clone().lerp(COLS[i + 1][1], clamp((D - COLS[i][0]) / (COLS[i + 1][0] - COLS[i][0]), 0, 1)); return COLS[COLS.length - 1][1].clone(); }
const PITCH = [[0, -34], [4, -62], [9, -72], [305, -72], [335, 72], [425, 72], [450, 60], [465, 28], [482, 14]];
const YAW = [[0, 0], [305, 18], [335, 28], [482, 40]];

const LINES = [];
const SL = ['You’re digging through your own floor.', 'Soil is only a thin skin.', 'You’re below the water pipes.', 'Winter and summer can’t reach you.', 'You’ve passed the water table.',
  'Deeper than the Statue of Liberty.', 'Deeper than the Eiffel Tower is tall.', 'Deeper than the tallest building.', 'The deepest known cave is above you.', 'Miners stop here. You don’t.',
  'No drill has gone deeper than this.', 'You’ve left the crust.', 'Diamonds are born around here.', 'Solid rock flows around you.', 'A sunken ocean floor lies beside you.',
  'You’re inside most of the planet.', 'Gravity is strongest here.', 'Liquid iron moves around you.', 'Crushing pressure keeps this iron solid.', 'Nothing pulls you any more.',
  'You’re heading out the other side.', 'The liquid iron is behind you.', 'The crust here is thin.', 'Hot springs rise from the seabed.', 'You can see sunlight again.',
  'You’ve crossed the whole planet.', 'And you still can’t stop.'];
SL.forEach((s, i) => { const t0 = T[i] + (i === 0 ? 0.8 : 0.9), end = i === 26 ? 480 : Math.min(T[i + 1] - 1.2, t0 + 9); LINES.push([t0, end, s]); });
// calm fillers in the longer gaps (true, simple)
[[8.5, 14, 'The floor lets go of you.'], [22, 28, 'Roots hang in the dark.'], [37, 43, 'It’s getting quiet down here.'], [53, 59, 'The air smells of wet stone.'], [68, 73.5, 'Your room is a small light now.'],
  [185, 192, 'Heat comes up from below.'], [246, 253, 'Pressure builds with every metre.'], [312, 322, 'Up is now the other way.'], [340, 350, 'You’re gaining speed again.']].forEach((l) => LINES.push(l));
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
  const seg = 26, step = 3, len = d1 - d0, rings = Math.ceil(len / step);
  const g = new THREE.CylinderGeometry(1, 1, len, seg, rings, true);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const ix = i % (seg + 1), iy = Math.floor(i / (seg + 1)), ang = Math.atan2(p.getZ(i), p.getX(i));
    const D = d0 + (len / 2 - p.getY(i)), n = hash2((ix % seg) + seed, iy + seed * 3) - 0.5, n2 = hash2(iy * 0.31 + seed, 7);
    const r = Rof(D) * (1 + n * 0.34 * (D > 440 ? 0.6 : 1));
    p.setXYZ(i, Math.cos(ang) * r, p.getY(i), Math.sin(ang) * r);
    colorAt(D).multiplyScalar(0.82 + 0.3 * n2 + 0.2 * n).toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  m.position.y = -(d0 + len / 2); scene.add(m); return m;
}
const nearShaft = buildShaft(1, 0, 1560);
const farShaft = buildShaft(5, 120, 1560); farShaft.visible = false;

const nearSet = new THREE.Group(), farSet = new THREE.Group(); scene.add(nearSet, farSet); farSet.visible = false;
const at = (grp, D, x, z) => { const o = new THREE.Group(); o.position.set(x, -D, z); grp.add(o); return o; };
const mesh = (geo, color, parent, x = 0, y = 0, z = 0, opts) => { const m = new THREE.Mesh(geo, M(color, opts)); m.position.set(x, y, z); parent.add(m); return m; };
const glow = (color) => new THREE.MeshBasicMaterial({ color });

// 1:15 Statue of Liberty (93 m: base to torch), hanging upside down
{
  const o = at(nearSet, 70, -8, 0), s = new THREE.Group(); o.add(s); s.rotation.x = Math.PI;
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
  const E = buildEiffel(0, 0); scene.remove(E); const o = at(nearSet, 118, -10, 4); const w = new THREE.Group(); o.add(w); w.add(E); E.position.set(0, 0, 0); w.rotation.x = Math.PI; w.scale.setScalar(0.3); w.position.y = 0; w.children[0].position.y = -165;
  const B = buildBurj(0, 0); scene.remove(B); const o2 = at(nearSet, 160, 9, -3); const w2 = new THREE.Group(); o2.add(w2); w2.add(B); w2.rotation.x = Math.PI; w2.scale.setScalar(0.11); B.position.y = -414;
  for (const t of [E, B]) t.traverse((m) => { if (m.isMesh) { m.castShadow = false; } });
}
// 2:06 deepest cave: stalactites and stalagmites in a huge cavern
{
  const o = at(nearSet, 240, 0, 0); const mat = '#a29a8c';
  for (let k = 0; k < 34; k++) { const a = rnd() * Math.PI * 2, r = 28 + rnd() * 16, h = 5 + rnd() * 16, up = rnd() < 0.5; const m = mesh(new THREE.ConeGeometry(1.2 + rnd() * 2.2, h, 6), mat, o, Math.cos(a) * r, (rnd() - 0.5) * 40, Math.sin(a) * r); m.rotation.x = up ? 0 : Math.PI; }
  mesh(new THREE.TorusGeometry(52, 0.6, 5, 40), '#7ab8d8', o, 0, -22, 0, { emissive: '#4a8ab0', emissiveIntensity: 0.6 }).rotation.x = Math.PI / 2;   // an underground lake rim
}
// 2:24 the lift cage of a gold mine
{
  const o = at(nearSet, 292, 3.5, 0);
  const cage = new THREE.Group(); o.add(cage);
  mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), '#4d555c', cage, 0, -2, 0); mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), '#4d555c', cage, 0, 2, 0);
  for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) mesh(new THREE.BoxGeometry(0.18, 4, 0.18), '#c9a227', cage, x, 0, z);
  mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), '#ffe9a0', cage, 0, 0.2, 1.4, { emissive: '#ffd060', emissiveIntensity: 1 });
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 400, 4), '#222', o, 0, 202, 0);
}
// 2:42 the bottom of the Kola borehole: a narrow bore, a drill bit
{ const o = at(nearSet, 392, 0.9, 0.9); mesh(new THREE.ConeGeometry(0.7, 1.6, 8), '#8a929a', o, 0, -0.8, 0).rotation.x = Math.PI; mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 6), '#6a7077', o, 0, 15, 0); }
// 3:15 a diamond growing in the rock
{
  const o = at(nearSet, 560, -2.5, -1);
  const dia = mesh(new THREE.OctahedronGeometry(2.6), '#d8f4ff', o, 0, 0, 0, { emissive: '#8fd4ff', emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.2 }); dia.scale.set(1, 1.5, 1);
  nearSet.userData.dia = dia;
  for (let k = 0; k < 9; k++) mesh(new THREE.OctahedronGeometry(0.35 + rnd() * 0.5), '#bde8ff', o, (rnd() - 0.5) * 9, (rnd() - 0.5) * 12, (rnd() - 0.5) * 6, { emissive: '#6fb8e8', emissiveIntensity: 0.9 });
}
// 3:45 a sunken ocean plate: a cold, dark slab
{ const o = at(nearSet, 790, -7, -3); const s = mesh(new THREE.BoxGeometry(46, 1.8, 30), '#35465e', o, 0, 0, 0); s.rotation.z = 0.55; s.rotation.y = 0.5; const s2 = mesh(new THREE.BoxGeometry(40, 1.2, 24), '#2d3b4f', o, -6, -8, 4); s2.rotation.z = 0.55; s2.rotation.y = 0.5; }
// 4:30 liquid iron: bright streaks flowing past (animated)
const IRON = [];
{ const o = at(nearSet, 1210, 0, 0); for (let k = 0; k < 46; k++) { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 7; const m = new THREE.Mesh(new THREE.BoxGeometry(0.5 + rnd() * 0.8, 6 + rnd() * 14, 0.5 + rnd() * 0.8), glow(rnd() < 0.5 ? '#ffe9b8' : '#ffb35a')); m.position.set(Math.cos(a) * r, (rnd() - 0.5) * 80, Math.sin(a) * r); o.add(m); IRON.push([m, rnd() * 80, 4 + rnd() * 8]); } }
// 4:45 the inner core ahead, and the centre
{ const o = at(nearSet, 1560, 0, 0); mesh(new THREE.SphereGeometry(30, 20, 14), '#fff6dc', o, 0, 0, 0).material = new THREE.MeshBasicMaterial({ color: '#fff3d0', side: THREE.DoubleSide, fog: false }); }
// far side: the seabed with black smokers, and the sea above
{
  const sea = at(farSet, 120, 0, 0);
  const bed = new THREE.Mesh(new THREE.RingGeometry(5.2, 600, 40, 1), M('#3b3a3c', { side: THREE.DoubleSide })); bed.rotation.x = -Math.PI / 2; sea.add(bed);
  for (let k = 0; k < 14; k++) {
    const a = rnd() * Math.PI * 2, r = 9 + rnd() * 50, h = 6 + rnd() * 12, x = Math.cos(a) * r, z = Math.sin(a) * r;
    mesh(new THREE.CylinderGeometry(0.9, 2.2, h, 7), '#2a2a2c', sea, x, h / 2, z);
    mesh(new THREE.SphereGeometry(1.1, 6, 5), '#ff9a3c', sea, x, h + 0.4, z).material = glow('#ff9a3c');
    for (let j = 0; j < 5; j++) mesh(new THREE.SphereGeometry(1.6 + j * 0.7, 6, 5), '#3a3a40', sea, x + j * 0.4, h + 3 + j * 3.4, z, { transparent: true, opacity: 0.35 });
  }
}
const OCEAN = new THREE.Mesh(new THREE.CircleGeometry(60000, 48), new THREE.MeshStandardMaterial({ color: '#1f6f9f', roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
OCEAN.rotation.x = -Math.PI / 2; OCEAN.visible = false; scene.add(OCEAN);

const fogBase = new THREE.Fog('#050404', 8, 150); scene.fog = fogBase;
const lamp2 = new THREE.PointLight('#cfd8ff', 30, 0, 1.4); scene.add(lamp2);
const { poseHands, drawHands } = await buildHands();
const $ = (id) => document.getElementById(id);
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
  const roomOff = 1.6 * (1 - smooth(1, 9, t));
  const eye = -D + roomOff;
  camera.position.set(0.25 * (1 - smooth(4, 8, t)), eye, t < 6 ? 1.35 * (1 - smooth(0, 6, t)) - 0.2 * smooth(0, 6, t) : 0);
  camera.rotation.x = THREE.MathUtils.degToRad(keyed(PITCH, t));
  camera.rotation.y = THREE.MathUtils.degToRad(keyed(YAW, t));
  camera.rotation.z = 0; camera.near = 0.05; camera.updateProjectionMatrix();

  // the room only at the start; the floor lets go at ~4.4 s under a quick dark
  const inRoom = t < 5.2;
  for (const o of ROOM) o.visible = inRoom;
  $('dark').style.opacity = (smooth(3.9, 4.35, t) * (1 - smooth(4.6, 5.1, t)) * 0.97).toFixed(3);
  nearShaft.visible = !out; nearSet.visible = !out;
  farShaft.visible = out; farSet.visible = out;
  const above = eye > 0 && out;       // above the water
  OCEAN.visible = out && D < 60;
  sky.visible = out && D < 6;
  const under = out && D > 0;

  // light and haze follow the heat
  const heat = clamp(Math.log10(Math.max(tempF(t), 10)) / 3.9, 0, 1);       // 0 cold .. 1 white-hot
  const warm = new THREE.Color().setHSL(lerp(0.08, 0.12, heat), lerp(0.2, 0.9, smooth(0.3, 0.75, heat)), lerp(0.82, 0.78, heat));
  let fogC = new THREE.Color().setHSL(lerp(0.07, 0.07, heat), 0.7, lerp(0.025, 0.3, smooth(0.5, 0.95, heat)));
  let fogFar = lerp(120, 380, smooth(0.5, 0.95, heat)), I = lerp(34, 55, heat);
  let hm = lerp(0.16, 0.55, smooth(0.45, 0.95, heat));
  if (t < 8) { fogC = new THREE.Color('#050404'); }
  if (out && D < 140) {                                   // water
    const w = smooth(140, 118, D);
    fogC.lerp(new THREE.Color('#0a3d63'), w); fogFar = lerp(fogFar, lerp(90, 220, smooth(120, 5, D)), w);
    warm.lerp(new THREE.Color('#a6dcff'), w); hm = lerp(hm, lerp(0.7, 1.5, smooth(120, 0, D)), w); I = lerp(I, 8, w);
    fogC.lerp(new THREE.Color('#2f87b8'), smooth(60, 0, D) * w);
  }
  if (out && D <= 6) { const u = smooth(6, -8, D); fogC.lerp(new THREE.Color('#b9bdd8'), u); fogFar = lerp(fogFar, 9000, u); }
  fogBase.color.copy(fogC); scene.background = fogC.clone(); fogBase.near = 6; fogBase.far = fogFar;
  lamp2.color.copy(warm); lamp2.intensity = I * (out && D < 40 ? 0.1 : 1); lamp2.position.set(camera.position.x, eye - 1, camera.position.z);
  hemi.intensity = hm; sun.castShadow = inRoom; sun.intensity = inRoom ? 3.0 : (out && D < 20 ? 3.7 : 0);
  if (!inRoom) { sun.position.set(-30, 70, -45); sun.target.position.set(0, 0, 0); }
  lamp.intensity = inRoom ? 2.2 : 0;
  OCEAN.position.set(camera.position.x, 0, camera.position.z);
  sky.position.copy(camera.position); skyMat.uniforms.alt.value = 0;

  // things that move
  if (nearSet.userData.dia) nearSet.userData.dia.rotation.y = t * 0.5;
  for (const [m, ph, sp] of IRON) { const y = ((ph + t * sp) % 80) - 40; m.position.y = y; }
  if (t < 80) hole.rotation.z = 0;

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
