// What if you floated up and couldn't stop? (6:00: the 9:00 journey played 1.5x faster). The journey, numbers and sources: episodes/float-up/journey.md
// Your room -> roof -> town -> Eiffel Tower -> Burj Khalifa -> a cloud -> Everest -> an airliner -> black sky ->
// a burst balloon -> meteors -> the Kármán line -> the ISS -> GPS -> the geostationary ring -> the Moon -> 1 AU ->
// Neptune -> the pale blue dot -> Voyager 1 at one light-day.
import * as THREE from 'three';
import { FPS, logCurve, monotone, lerp, smooth, renderer, scene, camera, SUN, FOG, skyMat, sky, hemi, sun } from '../../src/engine/stage.js';
import { buildHome } from '../../src/engine/home.js';
import { buildTown } from '../../src/engine/town.js';
import { buildClouds } from '../../src/engine/clouds.js';
import { buildSpace } from '../../src/engine/space.js';
import { buildEiffel, buildBurj, buildEverest } from '../../src/engine/landmarks.js';
import { buildDeepSpace } from '../../src/engine/deepspace.js';
import { buildMotes } from '../../src/engine/motes.js';
import { buildHands } from '../../src/engine/hands.js';
import { overlay, tempAt, fmtDist } from '../../src/engine/readout.js';

// SPEED: every time below is journey time (the 9:00 plan in journey.md); the video plays it SPEED times faster.
// 1.5 -> a 6:00 video. Set 1 for the full 9:00 (over 8 minutes, so YouTube can put ads in the middle).
export const SPEED = (typeof window !== 'undefined' && window.__SPEED) || 1.5;
export const DURATION = 540 / SPEED;

// ---------- the journey: your altitude (metres) at each time; the stage values from journey.md are exact keys ----------
const AK = [[0, 0], [1.2, 0], [4, 0.15], [6, 0.3], [12, 0.95], [14.6, 1.15], [15.0, 2.0], [15.5, 3.6], [30, 9], [50, 100], [70, 330], [90, 830],
  [104, 1300], [110, 1500], [114, 1950], [130, 3000], [150, 5500], [170, 8849], [190, 11000], [210, 19200], [230, 25000], [250, 33000],
  [270, 41419], [290, 86000], [310, 100000], [330, 400000], [350, 2000000], [370, 20200000], [390, 35786000],
  [409, 3.45e8], [415, 3.77842e8], [421, 4.1e8],           // slow down beside the Moon (closest pass at 6:55)
  [440, 1.496e11], [465, 4.5e12], [490, 6.0e12], [515, 2.59e13], [540, 3.0e13]];
export const altitude = logCurve(AK);

// ---------- camera: where you look (degrees; one smooth curve each, never a separate ease per point) ----------
const PITCH = [[0, -14], [6, -24], [10, -13], [20, -52], [24, -50], [30, -26], [38, -30], [48, -44], [58, -25], [66, -6], [72, -2], [80, -8],
  [90, 0], [100, 6], [110, 8], [118, -6], [130, -26], [140, -14], [150, -6], [163, -3], [172, -1], [182, -14], [190, -18], [200, -8], [210, 16],
  [220, 6], [230, -8], [242, -6], [250, -16], [260, 8], [270, -4], [282, -40], [290, -52], [300, -24], [310, -9], [320, -10], [330, -14],
  [340, -38], [350, -55], [360, -26], [370, -10], [380, -45], [390, -72], [400, -30], [409, 3], [415, 0], [421, -4], [430, -45], [440, -78],
  [452, -40], [465, -4], [478, -40], [490, -80], [503, -30], [515, -3], [540, -1]];
const YAW = [[0, 0], [30, 4], [50, 0], [62, -12], [72, -20], [82, -24], [92, -34], [104, -30], [120, -20], [150, -14], [175, -14], [195, -14],
  [230, -18], [392, -18], [405, -26], [415, -28], [425, -24], [450, -22], [465, -26], [480, -20], [515, -20], [540, -19]];   // the Sun stays just out of frame on the left
const pitchAt = monotone(PITCH.map((k) => k[0]), PITCH.map((k) => k[1]));
const yawAt = monotone(YAW.map((k) => k[0]), YAW.map((k) => k[1]));

const LINES = [
  [3.5, 9.0, 'Your feet just left the floor.'],
  [12.2, 18.0, 'The ceiling doesn’t stop you.'],
  [21.5, 27.5, 'Your roof is below you now.'],
  [30.5, 36.5, 'You can see the whole street.'],
  [40.5, 46.5, 'You’re above the treetops.'],
  [50.5, 56.5, 'The cars look like toys.'],
  [60.5, 66.5, 'The town is getting smaller.'],
  [70.5, 76.5, 'You’re level with the Eiffel Tower.'],
  [80.5, 86.5, 'The air is getting cooler.'],
  [90.5, 96.5, 'Taller than the tallest building.'],
  [99.5, 105.0, 'A cloud is right above you.'],
  [107.0, 112.5, 'You’re inside a cloud.'],
  [124.0, 129.5, 'The air is below freezing now.'],
  [130.5, 136.5, 'The clouds are below you now.'],
  [140.5, 146.5, 'Breathing is getting harder.'],
  [150.5, 156.5, 'Half the air is below you.'],
  [160.5, 166.5, 'Everest rises out of the haze.'],
  [170.5, 176.5, 'You’re higher than Everest.'],
  [181.5, 187.5, 'It’s about minus fifty out here.'],
  [190.5, 196.5, 'A passenger jet passes beneath you.'],
  [200.5, 206.5, 'You’re above every airliner now.'],
  [210.5, 216.5, 'The sky is turning black.'],
  [220.5, 226.5, 'Water boils at body heat up here.'],
  [230.5, 236.5, 'Almost all the air is below.'],
  [240.5, 246.5, 'You’re inside the ozone layer.'],
  [250.5, 256.5, 'The sky above you is black.'],
  [259.0, 264.5, 'Weather balloons pop at this height.'],
  [270.5, 276.5, 'You’re higher than any skydiver.'],
  [279.5, 285.5, 'No balloon has ever flown this high.'],
  [290.5, 296.5, 'Shooting stars burn beneath you.'],
  [300.5, 306.5, 'The coldest air above Earth.'],
  [310.5, 316.5, 'This is where space begins.'],
  [320.5, 326.5, 'The sky is black, even in daylight.'],
  [330.5, 336.5, 'A space station flies past you.'],
  [340.5, 346.5, 'It circles Earth every ninety minutes.'],
  [350.5, 356.5, 'Earth is shrinking beneath you.'],
  [360.5, 366.5, 'You’re in the radiation belts now.'],
  [370.5, 376.5, 'Your phone’s satellites are here.'],
  [380.5, 386.5, 'Everyone you know is down there.'],
  [390.5, 396.5, 'Earth is one small disc.'],
  [400.5, 406.5, 'The Moon is getting closer.'],
  [411.0, 418.5, 'The Moon is right beside you.'],
  [426.5, 432.5, 'Now the Moon falls behind you.'],
  [440.5, 446.5, 'Earth’s light takes eight minutes.'],
  [452.5, 458.5, 'You’re as far out as Jupiter.'],
  [465.5, 471.5, 'You’ve reached Neptune’s orbit.'],
  [477.5, 483.5, 'Light from home takes hours now.'],
  [490.5, 496.5, 'Earth is a pale blue dot.'],
  [502.5, 508.5, 'Voyager 1 left Earth in 1977.'],
  [515.5, 539.4, 'And you still can’t stop.'],
];

// ---------- directions: bearing in degrees, 0 = straight ahead at the start, negative = to the right ----------
const rad = THREE.MathUtils.degToRad;
const dirB = (deg) => new THREE.Vector3(-Math.sin(rad(deg)), 0, -Math.cos(rad(deg)));
const rightB = (deg) => new THREE.Vector3(Math.cos(rad(deg)), 0, -Math.sin(rad(deg)));

// ---------- build the world (order matters: the random town is the same every time) ----------
const before = new Set(scene.children);
const { lamp } = buildHome();
buildTown();
buildClouds();
// the landmarks, beside your path at their real heights: each one is about 12 degrees right of where you look at its moment
{ const p = dirB(-32).multiplyScalar(1150); buildEiffel(p.x, p.z); }    // 1:10, just outside the town
{ const p = dirB(-46).multiplyScalar(1700); buildBurj(p.x, p.z); }      // 1:30
{ const p = dirB(-31).multiplyScalar(34000); buildEverest(p.x, p.z); }  // 2:50, appears out of the haze from ~2:30
const GROUND_OBJS = scene.children.filter((o) => !before.has(o));   // the flat ground world, hidden once we're high up
const SWITCH_ALT = 25000;
const { EARTH_C, space, earth, cloudShell, atmo, stars, starMat, plane, iss, moon } = buildSpace();
const D = buildDeepSpace(EARTH_C);
const smallPlane = plane.clone(); smallPlane.children.splice(-2); smallPlane.scale.setScalar(0.5); scene.add(smallPlane);   // no contrails at 2.5 km
smallPlane.children.slice(0, 3).forEach((m) => { m.material = new THREE.MeshStandardMaterial({ color: '#d24b3a', roughness: 0.5, flatShading: true }); });   // a red body: a white plane vanishes against the clouds

// the Moon: its centre 384,400 km from Earth's centre, 30,000 km to your right, so you pass it at 377,842 km (6:55)
const MOON_L = 12000000, MOON_B = -40;
moon.position.copy(EARTH_C).addScaledVector(dirB(MOON_B), MOON_L).add(new THREE.Vector3(0, Math.sqrt(384400000 ** 2 - MOON_L ** 2), 0));

const { NM, motePos, moteSeed, moteGeo, moteMat } = buildMotes();
const { poseHands, drawHands } = await buildHands();
const $ = (id) => document.getElementById(id);

// ---------- set pieces: staged to pass close by you (relative to where your eyes are) ----------
// at bearing `b`, `dist` metres out, `y` metres up (moving vy m/s), `side` metres to the right (moving vs m/s), dt seconds after its moment
function near(b, dist, y, vy, side, vs, dt) {
  return camera.position.clone().addScaledVector(dirB(b), dist).addScaledVector(rightB(b), side + vs * dt).add(new THREE.Vector3(0, y + vy * dt, 0));
}
const headingAcross = (b) => { const r = rightB(b); return Math.atan2(-r.z, r.x); };   // plane nose (+x) pointing to the right
const VOY_Y = monotone([500, 515, 540], [13, -1.4, -2.8]);   // Voyager comes down beside you and stays
function placeSetPieces(t, a) {
  let dt = t - 130;  smallPlane.visible = Math.abs(dt) < 11;      // a small plane far below, over the clouds
  if (smallPlane.visible) { smallPlane.position.copy(near(-12, 480, -280, -10, -30, 45, dt)); smallPlane.rotation.set(0, headingAcross(-8), 0); }
  dt = t - 190; plane.visible = Math.abs(dt) < 11;                 // an airliner at cruising height, just below you
  if (plane.visible) { plane.position.copy(near(-16, 260, -140, -15, 40, 60, dt)); plane.rotation.set(0, headingAcross(-16), 0); }   // right of centre, clear of the readout
  dt = t - 250; D.burst.visible = Math.abs(dt) < 13;               // the burst weather balloon falling back
  if (D.burst.visible) { D.burst.position.copy(near(-18, 55, -17, -5, 0, 0, dt)); D.burst.rotation.set(0, 0.6 + 0.04 * dt, 0); }
  D.meteorsAt(t, camera.position);                                  // meteors burning up below you (4:44 - 4:57)
  dt = t - 330; iss.visible = Math.abs(dt) < 13;                    // the International Space Station
  if (iss.visible) {
    iss.position.copy(near(-14, 190, -52, -5, 8, -9, dt));
    const toCam = camera.position.clone().sub(iss.position).normalize();   // solar panels face you, turned a little
    iss.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toCam); iss.rotateY(0.5 + 0.01 * dt); iss.rotateX(-0.45);
  }
  dt = t - 370; D.gps.visible = Math.abs(dt) < 11;                  // a GPS satellite
  if (D.gps.visible) {
    D.gps.position.copy(near(-20, 30, -4, -1.8, 3, -0.6, dt));
    const toCam = camera.position.clone().sub(D.gps.position).normalize();   // solar wings turned toward you (edge-on they vanish)
    D.gps.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toCam); D.gps.rotateY(0.35 + 0.02 * dt); D.gps.rotateX(-0.5);
  }
  D.geoRing.visible = a > 5e6 && a < 3e8;                           // the geostationary ring (real size and place)
  dt = t - 465; D.neptune.visible = Math.abs(dt) < 13;              // Neptune, a faint blue disc
  if (D.neptune.visible) { D.neptune.position.copy(near(-42, 40, -4, -0.9, 0, 0, dt)); D.neptune.rotation.y = 0.02 * dt; }
  D.voyager.visible = t > 500;                                      // Voyager 1 comes down beside you and stays to the end
  if (D.voyager.visible) {
    D.voyager.position.copy(camera.position).addScaledVector(dirB(-32), 11).add(new THREE.Vector3(0, VOY_Y(t), 0));
    // dish toward Earth (down), tilted 35 degrees toward you so you can see into it
    const toCam = camera.position.clone().sub(D.voyager.position).setY(0).normalize();
    const n = new THREE.Vector3(0, -Math.cos(rad(35)), 0).addScaledVector(toCam, Math.sin(rad(35))).normalize();
    D.voyager.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), n); D.voyager.rotateY(2.4 + 0.012 * (t - 515));   // long boom to the right, away from the readout
  }
  // the Moon's own light: from the Sun's side, but turned toward you so it reads as a bright gibbous Moon
  const toCamM = camera.position.clone().sub(moon.position).normalize();
  moon.material.uniforms.lightDir.value.copy(SUN).addScaledVector(toCamM, 0.8).normalize();
}

// ---------- the readout: altitude, then outside temperature, switching to gravity just before the Kármán line ----------
const SUPER = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const gAt = (a) => 9.80665 * (6371000 / (6371000 + a)) ** 2;
function fmtG(g) {
  if (g >= 0.01) return g.toPrecision(3);
  if (g >= 0.001) return g.toPrecision(2);
  const e = Math.floor(Math.log10(g)); let m = g / 10 ** e;
  if (+m.toFixed(1) >= 10) return fmtG(10 ** (e + 1));
  return m.toFixed(1) + ' × 10' + String(e).split('').map((c) => SUPER[c]).join('');
}
const fmtT = (T) => (T < -0.05 ? '−' : '') + Math.abs(T).toFixed(1) + ' °C';
const READOUT = {
  num: fmtDist, fit: 880,
  right: (a) => a < 95000
    ? ['OUTSIDE AIR', fmtT(tempAt(Math.min(a, 86000))), 1 - smooth(93000, 95000, a)]   // the model ends at 86 km: hold that value
    : ['GRAVITY', fmtG(gAt(a)) + ' m/s²', smooth(95000, 97000, a)],
};

// ---------- frame ----------
const v3 = new THREE.Vector3();
function frame(f) {
  const t = f / FPS * SPEED;   // journey time
  const a = altitude(t), eye = a + 1.6;
  camera.position.set(0.25, eye, lerp(1.35, -0.75, smooth(2.75, 4.4, eye)));   // a steady camera: no sway, no bob
  camera.rotation.set(rad(pitchAt(t)), rad(yawAt(t)), 0);
  camera.near = 0.03; camera.far = a > 5e7 ? 1e15 : 1.2e9;   // far enough for Earth and the Moon from deep space
  camera.updateProjectionMatrix();

  // haze widens with altitude; from ~3 km it opens out so Everest (34 km away) appears
  const inside = 1 - smooth(2.4, 3.6, eye);
  FOG.near = Math.min(60 + a * 3, 4000);
  FOG.far = Math.min(900 + a * 22, 32000 + 70000 * smooth(2500, 8000, a));
  // inside the cloud: a light white veil for a few seconds, fully white for about one second
  const veil = smooth(1380, 1430, a) * (1 - smooth(1680, 1740, a)), dense = smooth(1470, 1495, a) * (1 - smooth(1555, 1580, a));
  $('white').style.opacity = Math.max(veil * 0.5, dense * 0.93).toFixed(3);
  // through the ceiling + attic: a brief dark
  const thru = smooth(2.6, 2.74, eye) * (1 - smooth(4.75, 5.05, eye));
  $('dark').style.opacity = (thru * 0.97).toFixed(3);
  const high = a > SWITCH_ALT;
  for (const o of GROUND_OBJS) o.visible = !high;
  space.visible = a > 12000;
  earth.visible = cloudShell.visible = high && a < 6e9;
  atmo.visible = high && a < 2e9;
  moon.visible = a < 3e9;
  D.earthDotAt(camera.position, smooth(1.5e9, 4e9, a));   // Earth as a pale blue dot once it is too small to draw
  scene.fog = high ? null : FOG;
  sun.castShadow = !high;
  starMat.opacity = smooth(18000, 60000, a) * 0.9;
  stars.position.copy(camera.position);
  placeSetPieces(t, a);
  // the sky darkens faster above 12 km than the engine default, so it is visibly black by the balloon (33 km)
  skyMat.uniforms.alt.value = a < 12000 ? a : 12000 + (a - 12000) * 4.5;
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

  // dust floating in the room only (streaks outside jump every frame and read as shaking)
  for (let i = 0; i < NM; i++) {
    const [sx, sy, sz] = moteSeed[i];
    const y = ((sy - (t * 0.02) % 1) + 1) % 1;
    const px = camera.position.x + sx * 2.2, pz = camera.position.z + sz * 2.2;
    const py = camera.position.y + (y - 0.5) * 2.2 * 1.4 + Math.sin(t * 0.6 + i) * 0.05;
    motePos.set([px, py, pz, px, py + 0.004, pz], i * 6);
  }
  moteGeo.attributes.position.needsUpdate = true;
  moteMat.opacity = inside > 0.5 ? 0.5 : 0;

  poseHands(t, a);
  // the readout shows this frame's own moment (motion blur renders a little before and after it)
  const tc = Math.round(f) / FPS * SPEED;
  overlay(tc, altitude(tc), LINES, READOUT);
  if (!window.__SIDE) renderer.render(scene, camera);
  drawHands();
}

window.renderFrame = (f) => { frame(f); return true; };
window.TOTAL_FRAMES = FPS * DURATION;
window.ALT = (t) => altitude(t * SPEED);
document.fonts.ready.then(() => { window.READY = true; });
if (!window.__RENDERER) { // live preview in a normal browser
  const t0 = performance.now();
  const loop = () => { frame(Math.floor(((performance.now() - t0) / 1000 * FPS) % (FPS * DURATION))); requestAnimationFrame(loop); };
  loop();
}
