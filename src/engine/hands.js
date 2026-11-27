import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { smooth, scene, camera, renderer, SUN, sun, hemi } from './stage.js';

// Your own hands (a real rigged human hand model, WebXR generic-hand, MIT) drawn on top of the world.
export async function buildHands() {
// ---------- first-person hands (camera space) ----------
scene.add(camera);
// hands live in their own small scene drawn on top, with a camera that always sits at the origin:
// skinned meshes are skinned in world space, so at thousands of km up they would break apart
const handScene = new THREE.Scene();
const handCam = new THREE.PerspectiveCamera(62, 1920 / 1080, 0.01, 10); handCam.rotation.order = 'YXZ'; handScene.add(handCam);
const handHemi = new THREE.HemisphereLight('#bccbf2', '#9a7b5e', 1.0), handSun = new THREE.DirectionalLight('#ffc994', 3.7);
handScene.add(handHemi, handSun, handSun.target);
const SKIN = new THREE.MeshStandardMaterial({ color: '#e7b08b', roughness: 0.62, emissive: '#5a2414', emissiveIntensity: 0.12 });
const SLEEVE = new THREE.MeshStandardMaterial({ color: '#25272d', roughness: 0.95 });
const CUFF = new THREE.MeshStandardMaterial({ color: '#2e3138', roughness: 0.95 });
// Real rigged human hands: WebXR generic-hand (MIT, Amazon), models/right.glb + left.glb.
// Rest pose is an open flat hand; we curl each finger joint a little and aim the hand in camera space.
const gltfs = await Promise.all(['models/right.glb', 'models/left.glb'].map((u) => new GLTFLoader().loadAsync(u)));
function hand(gltf, side) {
  const root = gltf.scene, bones = {};
  root.traverse((o) => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { o.material = SKIN; o.frustumCulled = false; o.castShadow = o.receiveShadow = false; } });
  root.updateMatrixWorld(true);
  const L = (n) => bones[n].position.clone();                         // armature-local
  const Wd = (n) => bones[n].getWorldPosition(new THREE.Vector3());   // rest world
  const basis = (P) => {
    const F = P('middle-finger-tip').sub(P('middle-finger-metacarpal')).normalize();
    const T = P('thumb-tip').sub(P('index-finger-metacarpal')); T.addScaledVector(F, -T.dot(F)).normalize();
    const B = side > 0 ? new THREE.Vector3().crossVectors(F, T) : new THREE.Vector3().crossVectors(T, F);
    return { F, T, B };
  };
  const loc = basis(L), wor = basis(Wd);
  // curl: rotate the rest of the chain about the joint, toward the palm (-B)
  function curl(names, angles, axis) {
    angles.forEach((a, k) => {
      let q = new THREE.Quaternion().setFromAxisAngle(axis, a);
      if (loc.F.clone().applyQuaternion(q).dot(loc.B) > 0) q = new THREE.Quaternion().setFromAxisAngle(axis, -a);
      const pivot = bones[names[k]].position.clone();
      for (let j = k; j < names.length; j++) {
        const b = bones[names[j]];
        if (j > k) b.position.sub(pivot).applyQuaternion(q).add(pivot);
        b.quaternion.premultiply(q);
      }
    });
  }
  const C = { index: [0.14, 0.22, 0.14], middle: [0.18, 0.26, 0.16], ring: [0.22, 0.28, 0.17], pinky: [0.26, 0.3, 0.18] };
  for (const f of Object.keys(C)) curl(['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map((x) => `${f}-finger-${x}`), C[f], loc.T);
  const thumbAxis = new THREE.Vector3().crossVectors(loc.B, L('thumb-tip').sub(L('thumb-metacarpal')).normalize()).normalize();
  curl(['thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'], [0.12, 0.22], thumbAxis);
  // groups: h (aimed) > inner (rest basis undone, wrist at origin) > gltf root
  const h = new THREE.Group(), inner = new THREE.Group();
  const Mr = new THREE.Matrix4().makeBasis(wor.F, wor.B, new THREE.Vector3().crossVectors(wor.F, wor.B)); // proper rotation
  inner.quaternion.setFromRotationMatrix(Mr).invert();
  root.position.copy(Wd('wrist')).negate();
  inner.add(root); h.add(inner);
  // sleeve toward the elbow
  const arm = new THREE.Group();
  const cuffG = new THREE.Group(), cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.05, 0.075, 24), CUFF);
  cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.012; cuffG.add(cuff); handCam.add(cuffG);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.075, 0.55, 24), SLEEVE);
  sleeve.rotation.x = Math.PI / 2; sleeve.position.z = 0.3; arm.add(sleeve);
  handCam.add(h, arm);
  return { h, arm, cuffG, side };
}
const handR = hand(gltfs[0], 1), handL = hand(gltfs[1], -1);
window.HANDDBG = () => {
  const out = {};
  for (const [n, H] of [['R', handR], ['L', handL]]) {
    H.h.updateMatrixWorld(true);
    const bones = {}; H.h.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const cp = (b) => camera.worldToLocal(bones[b].getWorldPosition(new THREE.Vector3())).toArray().map((v) => +v.toFixed(3));
    out[n] = { wrist: cp('wrist'), midMC: cp('middle-finger-metacarpal'), midTip: cp('middle-finger-tip'), thumbTip: cp('thumb-tip'), pinkyTip: cp('pinky-finger-tip'), hpos: H.h.position.toArray().map((v) => +v.toFixed(3)) };
  }
  return JSON.stringify(out);
};
const _m = new THREE.Matrix4(), _o = new THREE.Vector3(), _v = new THREE.Vector3(), _u = new THREE.Vector3();
// Matrix4.lookAt(eye, target) sets local +z = eye - target, so this points local +z along dir
function aim(obj, dir, up) { _m.lookAt(_o, _v.copy(dir).negate(), up); obj.quaternion.setFromRotationMatrix(_m); }
// orient so the hand's finger axis (local x of h) = D and back of the hand (local y) ~ up
function aimHand(obj, D, up) {
  const F = D.clone().normalize(), B = up.clone().addScaledVector(F, -up.dot(F)).normalize(), T = new THREE.Vector3().crossVectors(F, B);
  obj.quaternion.setFromRotationMatrix(_m.makeBasis(F, B, T));
}
// Pose in camera space from anatomy: elbow below the frame, wrist just under the bottom edge,
// forearm rising toward the wrist, wrist bent ~30 deg so the hand reaches forward into the frame.
function poseHands(t, a) {
  const lift = smooth(1.0, 6, t) * 0.01 + smooth(12, 30, t) * 0.006;
  for (const [H, ph] of [[handR, 0], [handL, 1.7]]) {
    const s = H.side;
    const Pw = new THREE.Vector3(0.2 * s + Math.sin(t * 0.6 + ph) * 0.004, -0.262 + lift + Math.sin(t * 0.8 + ph) * 0.004, -0.42);
    const Pe = new THREE.Vector3(0.27 * s, -0.55, -0.2);
    const A = Pw.clone().sub(Pe).normalize();                       // forearm direction (elbow -> wrist)
    const lat = new THREE.Vector3().crossVectors(A, new THREE.Vector3(0, 1, 0)).normalize();
    const bend = 0.62 + Math.sin(t * 0.9 + ph) * 0.04;               // wrist flex, radians
    const F = A.clone().applyAxisAngle(lat, -bend);                  // hand direction
    if (F.y > A.y) F.copy(A).applyAxisAngle(lat, bend);              // make sure the bend goes down
    F.x += -0.12 * s; F.normalize();
    H.h.position.copy(Pw);
    aimHand(H.h, F, _u.set(-0.2 * s, 1, 0.3));
    H.arm.position.copy(Pw);
    aim(H.arm, A.clone().negate(), new THREE.Vector3(0, 1, 0));      // sleeve runs back to the elbow
    H.cuffG.position.copy(Pw);
    aim(H.cuffG, A.clone().negate().add(F.clone().negate()).normalize(), new THREE.Vector3(0, 1, 0));
  }
}

  // debug: window.__SIDE = [x, y, z] (metres, relative to your eyes) shows the world and your hands from there
  let sideW = null, sideH = null;
  function drawSide() {
    const v = window.__SIDE, look = window.__LOOK || [0.2, -0.22, -0.45];
    camera.updateMatrixWorld(true); handCam.updateMatrixWorld(true);
    sideW = sideW || new THREE.PerspectiveCamera(40, 1920 / 1080, 0.01, 1e9); sideH = sideH || new THREE.PerspectiveCamera(40, 1920 / 1080, 0.01, 100);
    sideW.position.copy(camera.localToWorld(new THREE.Vector3(...v))); sideW.lookAt(camera.localToWorld(new THREE.Vector3(...look)));
    sideH.position.copy(handCam.localToWorld(new THREE.Vector3(...v))); sideH.lookAt(handCam.localToWorld(new THREE.Vector3(...look)));
    renderer.render(scene, sideW);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(handScene, sideH); renderer.autoClear = true;
  }
  function drawHands() {
    if (window.__SIDE) return drawSide();
    handCam.rotation.copy(camera.rotation);
    handSun.position.copy(SUN).multiplyScalar(5); handSun.intensity = sun.intensity;
    handHemi.intensity = Math.max(hemi.intensity, 0.45); handSun.color.copy(sun.color);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(handScene, handCam); renderer.autoClear = true;
  }
  return { poseHands, drawHands, handCam };
}
