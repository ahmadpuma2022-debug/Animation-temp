// Example (38 s): bedroom -> roof -> clouds. The smallest working episode; copy it to start a new one.
import * as THREE from 'three';
import { FPS, logCurve, lerp, clamp, smooth, keyed, renderer, scene, camera, SUN, FOG, skyMat, sky, hemi, sun } from '../../src/engine/stage.js';
import { buildHome } from '../../src/engine/home.js';
import { buildTown } from '../../src/engine/town.js';
import { buildClouds } from '../../src/engine/clouds.js';
import { buildSpace } from '../../src/engine/space.js';
import { buildMotes } from '../../src/engine/motes.js';
import { buildHands } from '../../src/engine/hands.js';
import { overlay } from '../../src/engine/readout.js';

export const DURATION = 38;

// ---------- the journey: the number on screen (your altitude, metres) at each time ----------
const AK = [[0, 0], [1.2, 0.0], [9, 0.95], [10.1, 3.6], [12.5, 8], [18, 45], [24, 360], [28.6, 1300], [31.4, 1850], [38, 3600]];
export const altitude = logCurve(AK);

// ---------- camera: where you look (degrees), and the line at the bottom ----------
const PITCH = [[0, -14], [8, -20], [9.6, -38], [11.5, -60], [18, -55], [23, -30], [27.5, -6], [30, 3], [32.5, -8], [38, -2]];
const YAW = [[0, 0], [12, 4], [20, 10], [30, 18], [38, 24]];
const LINES = [
  [0.6, 5.0, 'Your feet just left the floor.'],
  [5.6, 10.2, 'You can’t come down.'],
  [12.6, 17.6, 'The roof is under you now.'],
  [18.6, 24.2, 'Your street looks like a map.'],
  [25.0, 29.2, 'The clouds are coming.'],
  [32.0, 37.6, 'It’s getting colder.'],
];


// ---------- build the world (order matters: the random town is the same every time) ----------
const before = new Set(scene.children);
const { lamp } = buildHome();
buildTown();
buildClouds();
const GROUND_OBJS = scene.children.filter((o) => !before.has(o));   // the flat ground world, hidden once we're high up
const SWITCH_ALT = 25000;
const { EARTH_C, space, earth, cloudShell, atmo, stars, starMat, plane, balloon, iss, moon } = buildSpace();
// put it (at its real distance) exactly where the last shot looks: pitch 78, yaw 30
{
  const look = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(63), THREE.MathUtils.degToRad(8), 0, 'YXZ'));
  const camEnd = new THREE.Vector3(0.25, 372000000, -0.75), rel = camEnd.clone().sub(EARTH_C), D = 384400000;
  const b = rel.dot(look), c = rel.lengthSq() - D * D, sDist = -b + Math.sqrt(b * b - c);
  moon.position.copy(camEnd).addScaledVector(look, sDist);
}

const { NM, motePos, moteSeed, moteGeo, moteMat } = buildMotes();
const { poseHands, drawHands } = await buildHands();
const $ = (id) => document.getElementById(id);

// ---------- set pieces: placed from where the camera is at their moment ----------
function camAt(t) { // camera position + flat forward direction at time t
  const a = altitude(t), yaw = THREE.MathUtils.degToRad(keyed(YAW, t));
  return { pos: new THREE.Vector3(0.25, a + 1.6, -0.75), fwd: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)) };
}
const PLANE_T = 234, BALLOON_T = 305, ISS_T = 386;
const P0 = camAt(PLANE_T), B0 = camAt(BALLOON_T), I0 = camAt(ISS_T);
function placeSetPieces(t, a) {
  // plane: crosses left to right 380 m ahead at 10,650 m, 120 m/s
  plane.visible = Math.abs(t - PLANE_T) < 14;
  if (plane.visible) {
    const across = new THREE.Vector3(-P0.fwd.z, 0, P0.fwd.x); // to the right
    plane.position.copy(P0.pos).addScaledVector(P0.fwd, 380).addScaledVector(across, 120 * (t - PLANE_T));
    plane.position.y = 10650;
    plane.rotation.set(0, Math.atan2(-across.z, across.x), 0);
  }
  balloon.visible = Math.abs(t - BALLOON_T) < 16;
  if (balloon.visible) { balloon.position.copy(B0.pos).addScaledVector(B0.fwd, 160); balloon.position.y = altitude(BALLOON_T) + 1.6 + 140 + 5 * (t - BALLOON_T); balloon.rotation.y = t * 0.05; }
  iss.visible = Math.abs(t - ISS_T) < 14;
  if (iss.visible) {
    const across = new THREE.Vector3(-I0.fwd.z, 0, I0.fwd.x);
    iss.position.copy(I0.pos).addScaledVector(I0.fwd, 190).addScaledVector(across, -9 * (t - ISS_T));
    iss.position.y = altitude(ISS_T) + 1.6 - 55;
    // solar panels (local +y normal) face the camera, slightly turned so it doesn't look flat
    const toCam = camera.position.clone().sub(iss.position).normalize();
    iss.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toCam);
    iss.rotateY(0.5 + 0.01 * (t - ISS_T)); iss.rotateX(-0.45);
  }
}

// ---------- frame ----------
const v3 = new THREE.Vector3();
function frame(f) {
  const t = f / FPS;
  const a = altitude(t), eye = a + 1.6;
  const vel = (altitude(t + 0.05) - altitude(t - 0.05)) / 0.1;
  const bob = 0;   // a steady camera: any sway or bob makes thin edges (window, fence, roads) shimmer
  const dx = 0, dz = 0;
  camera.position.set(0.25 + dx, eye + bob, lerp(1.35, -0.75, smooth(2.75, 4.4, eye)) + dz);
  camera.rotation.x = THREE.MathUtils.degToRad(keyed(PITCH, t));
  camera.rotation.y = THREE.MathUtils.degToRad(keyed(YAW, t));
  camera.rotation.z = 0;
  camera.near = 0.03;
  camera.updateProjectionMatrix();

  // fog widens with altitude
  const inside = 1 - smooth(2.4, 3.6, eye);
  FOG.near = Math.min(60 + a * 3, 4000);
  FOG.far = Math.min(900 + a * 22, 32000);
  // cloud whiteout
  const inCloud = smooth(1360, 1480, a) * (1 - smooth(1700, 1820, a));
  $('white').style.opacity = (inCloud * 0.93).toFixed(3);
  // through ceiling + attic: brief dark
  const thru = smooth(2.6, 2.74, eye) * (1 - smooth(4.75, 5.05, eye));
  $('dark').style.opacity = (thru * 0.97).toFixed(3);
  const high = a > SWITCH_ALT;
  for (const o of GROUND_OBJS) o.visible = !high;
  space.visible = a > 12000;
  earth.visible = cloudShell.visible = atmo.visible = high;
  scene.fog = high ? null : FOG;
  sun.castShadow = !high;
  starMat.opacity = smooth(18000, 60000, a) * 0.9;
  stars.position.copy(camera.position);
  placeSetPieces(t, a);
  skyMat.uniforms.alt.value = a;
  sky.position.copy(camera.position);
  hemi.intensity = lerp(1.0, 1.2, smooth(5, 2000, a)) * (1 - 0.88 * smooth(15000, 80000, a));
  lamp.intensity = 2.2 * inside;

  // shadows: a FIXED area per part of the trip (room, roof, town). A shadow area that moves or changes size
  // every frame makes every shadow edge crawl, which looks like the picture is shaking.
  let S, cx, cz;
  if (inside > 0.5) { S = 7; cx = 0; cz = 0; }
  else if (a < 60) { S = 60; cx = 0; cz = -25; }
  else { S = 1600; cx = -300; cz = -900; }
  v3.set(cx, 0, cz);
  sun.target.position.copy(v3);
  sun.position.copy(v3).addScaledVector(SUN, Math.max(60, S * 3));
  const sc = sun.shadow.camera; sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 1; sc.far = Math.max(200, S * 7);
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02 * Math.max(1, S / 7);

  // motes: dust floating in the room, thin streaks outside that rush down as you rise
  const box = inside > 0.5 ? 2.2 : 14;
  const vis = Math.min(vel, 40);
  for (let i = 0; i < NM; i++) {
    const [sx, sy, sz] = moteSeed[i];
    let y = ((sy - (t * (inside > 0.5 ? 0.02 : vis * 0.08)) % 1) + 1) % 1;
    const px = camera.position.x + sx * box, pz = camera.position.z + sz * box;
    const py = camera.position.y + (y - 0.5) * box * 1.4 + (inside > 0.5 ? Math.sin(t * 0.6 + i) * 0.05 : 0);
    const len = inside > 0.5 ? 0.004 : 0.05 + vis * 0.06;
    motePos.set([px, py, pz, px, py + len, pz], i * 6);
  }
  moteGeo.attributes.position.needsUpdate = true;
  moteMat.opacity = inside > 0.5 ? 0.5 : 0;   // dust in the room only: streaks outside jump every frame and read as shaking

  poseHands(t, a);
  overlay(t, a, LINES);
  if (!window.__SIDE) renderer.render(scene, camera);
  drawHands();
}

window.renderFrame = (f) => { frame(f); return true; };
window.TOTAL_FRAMES = FPS * DURATION;
window.ALT = (t) => altitude(t);
document.fonts.ready.then(() => { window.READY = true; });
if (!window.__RENDERER) { // live preview in a normal browser
  const t0 = performance.now();
  const loop = () => { frame(Math.floor(((performance.now() - t0) / 1000 * FPS) % (FPS * DURATION))); requestAnimationFrame(loop); };
  loop();
}
