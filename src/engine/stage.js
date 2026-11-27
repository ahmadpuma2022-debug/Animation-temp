import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// One stage for every video: renderer, scene, camera, sky, sun, haze, and the small helpers everything else uses.
// 60 frames per second for the final video (smooth motion over busy ground); stills are numbered at 30 per second
export const FPS = (typeof window !== 'undefined' && window.__FPS) || 30;

// ---------- seeded random ----------
let seed = 1234567;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------- timeline helpers ----------
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
// a value that changes smoothly in log space through keyframes [[t, value], ...] (heights, speeds, sizes)
export function logCurve(keys, off = 0.25) {
  const f = monotone(keys.map((k) => k[0]), keys.map((k) => Math.log(k[1] + off)));
  return (t) => Math.max(0, Math.exp(f(t)) - off);
}
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
function keyed(keys, t) { // smooth piecewise keys [[t,v],...]
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) return lerp(v0, v1, smooth(t0, t1, t));
  }
  return keys[keys.length - 1][1];
}
// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(window.__PR || 1.5);
renderer.setSize(1920, 1080, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1920 / 1080, 0.03, 1.2e9);
camera.rotation.order = 'YXZ';

const SUN = new THREE.Vector3(-0.55, 0.15, -0.82).normalize(); // direction toward the sun
const HAZE = new THREE.Color('#b9bdd8');
const FOG = new THREE.Fog(HAZE, 50, 600); scene.fog = FOG;

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { sunDir: { value: SUN }, alt: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w*0.99999; }`,
  fragmentShader: `
    uniform vec3 sunDir; uniform float alt; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float h = d.y;
      float hi = clamp(alt/5000.0, 0.0, 1.0);
      vec3 zenith = mix(vec3(0.12,0.27,0.66), vec3(0.05,0.14,0.46), hi);
      vec3 mid    = mix(vec3(0.38,0.52,0.84), vec3(0.25,0.40,0.78), hi);
      float az = max(dot(normalize(vec3(d.x,0.0,d.z)), normalize(vec3(sunDir.x,0.0,sunDir.z))), 0.0);
      vec3 horiz  = mix(vec3(0.76,0.76,0.90), vec3(1.0,0.76,0.55), pow(az, 4.0) * 0.85);
      vec3 col = mix(horiz, mid, smoothstep(-0.01, 0.09, h));
      col = mix(col, zenith, smoothstep(0.09, 0.7, h));
      col = mix(col, vec3(0.74,0.75,0.88), smoothstep(0.0,-0.25,h));
      float dark = smoothstep(12000.0, 60000.0, alt);
      col = mix(col, vec3(0.004, 0.006, 0.02), dark);
      float s = max(dot(d, sunDir), 0.0);
      col += vec3(1.0,0.72,0.48) * pow(s, 5.0) * 0.42 * (1.0 - dark);
      col += vec3(1.0,0.86,0.66) * pow(s, 60.0) * 0.6 * (1.0 - 0.7 * dark);
      col += vec3(1.0,0.97,0.9) * smoothstep(0.9993, 0.9997, s) * 3.0;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(100000, 48, 24), skyMat);
sky.frustumCulled = false;
scene.add(sky);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#bccbf2', '#9a7b5e', 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffc994', 3.7);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0004;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

// ---------- helpers ----------
const mats = new Map();
function M(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true, ...opts }));
  return mats.get(k);
}
function box(w, h, d, color, x, y, z, parent = scene, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, opts));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function jitter(geo, amt) {
  const g = mergeVertices(geo); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const r = (h - Math.floor(h)) - 0.5;
    const h2 = Math.sin(x * 93.98 + y * 17.23 + z * 57.1) * 23421.631; const r2 = (h2 - Math.floor(h2)) - 0.5;
    p.setXYZ(i, x * (1 + r * amt), y * (1 + r2 * amt), z * (1 + (r + r2) * 0.5 * amt));
  }
  g.computeVertexNormals(); return g;
}
function gable(w, d, h) { // triangular prism roof, ridge along x, base at y=0
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0); return g;
}

function instanced(geo, mat, list, shadow = true, parent = scene) {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((it, i) => {
    o.position.set(it.x, it.y || 0, it.z); o.rotation.set(0, it.r || 0, 0); o.scale.set(it.sx || 1, it.sy || 1, it.sz || 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.c) im.setColorAt(i, c.set(it.c));
  });
  im.castShadow = shadow; im.receiveShadow = true; parent.add(im); return im;
}

export { rnd, rr, pick, monotone, lerp, clamp, smooth, keyed, renderer, scene, camera, SUN, HAZE, FOG, skyMat, sky, hemi, sun, M, box, jitter, gable, instanced };
