import * as THREE from 'three';
import { rnd, rr, pick, lerp, clamp, smooth, scene, M, box, jitter, gable, instanced, SUN, HAZE } from './stage.js';

// Dust floating in the room, thin streaks rushing past outside.
export function buildMotes() {
// ---------- dust motes / rising streaks ----------
const NM = 420;
const moteGeo = new THREE.BufferGeometry();
const motePos = new Float32Array(NM * 6), moteSeed = [];
for (let i = 0; i < NM; i++) moteSeed.push([rr(-1, 1), rr(0, 1), rr(-1, 1)]);
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const moteMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, fog: false, depthWrite: false });
const motes = new THREE.LineSegments(moteGeo, moteMat); motes.frustumCulled = false; scene.add(motes);

  return { NM, motePos, moteSeed, moteGeo, moteMat };
}
