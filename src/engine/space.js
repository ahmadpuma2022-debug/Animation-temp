import * as THREE from 'three';
import { rnd, rr, pick, lerp, clamp, smooth, scene, M, box, jitter, gable, instanced, SUN, HAZE } from './stage.js';

// The round Earth (with clouds and a glowing atmosphere), stars, a passenger plane, a weather balloon,
// the International Space Station and the Moon. Units are metres; Earth's centre is straight below the start point.
export function buildSpace() {
// ---------- the round Earth, atmosphere, stars, plane, balloon, ISS, Moon (metres, Earth centre below us) ----------
const R_E = 6371000, EARTH_C = new THREE.Vector3(0, -R_E, 0);
const hash3 = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), L(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
           L(L(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), L(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm = (x, y, z, o = 5) => { let a = 0, f = 1, amp = 0.5; for (let i = 0; i < o; i++) { a += amp * vnoise(x * f, y * f, z * f); f *= 2.03; amp *= 0.5; } return a; };
function facePaint(geo, fn, itemSize = 3) {
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * itemSize), c = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    c.set((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3).normalize();
    const rgba = fn(c);
    for (let k = 0; k < 3; k++) for (let j = 0; j < itemSize; j++) col[(i + k) * itemSize + j] = rgba[j];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, itemSize));
}
const space = new THREE.Group(); space.visible = false; scene.add(space);
// Earth: poles on the z axis so our town (top of the sphere) sits in the green mid-latitudes
const earthGeo = new THREE.IcosahedronGeometry(R_E, 90);
const cOcean = new THREE.Color('#1d4f8f'), cShallow = new THREE.Color('#2f78b4'), cGreen = new THREE.Color('#5d8f45'), cGreen2 = new THREE.Color('#7da356'),
  cDry = new THREE.Color('#b49a66'), cRock = new THREE.Color('#8b7d6a'), cIce = new THREE.Color('#eef3f7'), tmp = new THREE.Color();
facePaint(earthGeo, (c) => {
  const e = fbm(c.x * 2.2 + 3.1, c.y * 2.2, c.z * 2.2 + 1.7) + (c.y > 0.985 ? 0.25 : 0); // land around our spot
  const lat = Math.abs(c.z);
  if (lat > 0.92) return cIce.toArray();
  if (e < 0.5) return tmp.copy(cOcean).lerp(cShallow, clamp((e - 0.42) / 0.08, 0, 1)).toArray();
  const m = fbm(c.x * 6 + 9, c.y * 6, c.z * 6, 3);
  if (e > 0.66) return tmp.copy(cRock).lerp(cIce, clamp((e - 0.7) / 0.06, 0, 1)).toArray();
  // each land face a little lighter or darker, so the ground seen from 25-100 km reads as a patchwork, not one flat green
  return tmp.copy(m > 0.55 ? cDry : cGreen).lerp(cGreen2, m * 0.5).multiplyScalar(0.86 + 0.28 * hash3(c.x * 900, c.y * 900, c.z * 900)).toArray();
});
const earth = new THREE.Mesh(earthGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, emissive: '#1d3766', emissiveIntensity: 0.22 }));
earth.position.copy(EARTH_C); space.add(earth);
const cloudShellGeo = new THREE.IcosahedronGeometry(R_E + 4000, 90);
facePaint(cloudShellGeo, (c) => { const n = fbm(c.x * 5 + 20, c.y * 5, c.z * 5, 4); return [1, 1, 1, n > 0.52 ? 0.92 : 0]; }, 4);
const cloudShell = new THREE.Mesh(cloudShellGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 1, flatShading: true, depthWrite: false }));
cloudShell.position.copy(EARTH_C); space.add(cloudShell);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(R_E + 90000, 96, 64), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, fog: false,
  uniforms: { sunDir: { value: SUN } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 sunDir; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    #include <logdepthbuf_pars_fragment>
    void main(){
      #include <logdepthbuf_fragment>
      float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
      float lit = smoothstep(-0.25, 0.4, dot(vN, sunDir));
      gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * rim * lit * 1.6, 1.0);
    }`,
}));
atmo.position.copy(EARTH_C); space.add(atmo);
// stars on a big shell around the camera
const starGeo = new THREE.BufferGeometry(), starPos = new Float32Array(4000 * 3);
for (let i = 0; i < 4000; i++) { const v = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(90000); starPos.set(v.toArray(), i * 3); }
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; scene.add(stars);
// passenger plane at 10.6 km with two contrails
const plane = new THREE.Group();
{
  const W = M('#f2f2f0', { roughness: 0.5 }), G = M('#9aa3ad', { roughness: 0.5 }), B = M('#2d4f8a', { roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 38, 16), W); body.rotation.z = Math.PI / 2; plane.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), W); nose.rotation.z = -Math.PI / 2; nose.position.x = 19; plane.add(nose);
  const tailC = new THREE.Mesh(new THREE.ConeGeometry(2, 7, 16), W); tailC.rotation.z = Math.PI / 2; tailC.position.x = -22.5; plane.add(tailC);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 34), G); wing.position.set(1, -0.8, 0); wing.rotation.y = 0.0; plane.add(wing);
  for (const z of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 15), G); w2.position.set(-1, -0.8, z * 9); w2.rotation.y = z * 0.45; plane.add(w2); }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.5), B); fin.position.set(-21, 4, 0); fin.rotation.z = 0.35; plane.add(fin);
  const hs = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 12), G); hs.position.set(-21, 0.8, 0); plane.add(hs);
  for (const z of [-1, 1]) { const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4.5, 14), G); eng.rotation.z = Math.PI / 2; eng.position.set(3.5, -2.2, z * 6.5); plane.add(eng); }
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.03, 2.03, 30, 16, 1, true, -0.4, 0.8), B); stripe.rotation.z = Math.PI / 2; stripe.rotation.x = Math.PI / 2; plane.add(stripe);
  for (const z of [-1, 1]) {
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 6, 2500, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    trail.rotation.z = Math.PI / 2; trail.position.set(-1260, -2.2, z * 6.5); plane.add(trail);
  }
}
plane.visible = false; scene.add(plane);
// weather balloon at ~35.5 km
const balloon = new THREE.Group();
{
  const env = new THREE.Mesh(new THREE.SphereGeometry(13, 24, 16), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.35, transparent: true, opacity: 0.92, emissive: '#8a8478', emissiveIntensity: 0.6 }));
  env.scale.set(1, 1.08, 1); balloon.add(env);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 22, 4), M('#d9d4c8')); line.position.y = -24; balloon.add(line);
  const pay = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), M('#e9b02f')); pay.position.y = -35.6; balloon.add(pay);
}
balloon.visible = false; scene.add(balloon);
// International Space Station (~109 m wide)
const iss = new THREE.Group();
{
  const truss = new THREE.Mesh(new THREE.BoxGeometry(100, 2.2, 2.2), M('#c9c5bc', { roughness: 0.6, metalness: 0.2 })); iss.add(truss);
  const panel = new THREE.MeshStandardMaterial({ color: '#b5862f', roughness: 0.35, metalness: 0.4, emissive: '#8a6420', emissiveIntensity: 0.55, flatShading: true });   // lit even with the sun behind it
  for (const x of [-46, -36, 36, 46]) for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.15, 34), panel); p.position.set(x, 0, z * 19); iss.add(p); }
  const mod = M('#e8e6e1', { roughness: 0.5, emissive: '#6d6c68', emissiveIntensity: 0.5 });
  for (const [x, z, l] of [[0, 0, 26], [0, -18, 9], [0, 16, 12]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, l, 14), mod); c.rotation.x = Math.PI / 2; c.position.set(x, -4, z); iss.add(c); }
  for (const x of [-14, 14]) { const rad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 14), M('#f4f4f4')); rad.position.set(x, -1.5, -9); iss.add(rad); }
}
iss.visible = false; scene.add(iss);
// the Moon: centre 384,400 km from Earth's centre, radius 1,737 km, straight above us
const moonGeo = new THREE.IcosahedronGeometry(1737000, 40);
const cM1 = new THREE.Color('#8f8c86'), cM2 = new THREE.Color('#6a6762'), cM3 = new THREE.Color('#b4b0a8');
facePaint(moonGeo, (c) => { const n = fbm(c.x * 3 + 5, c.y * 3, c.z * 3, 5), k = fbm(c.x * 14, c.y * 14 + 3, c.z * 14, 2);
  return tmp.copy(n < 0.45 ? cM2 : cM1).lerp(cM3, k > 0.62 ? 0.8 : 0).toArray(); });
// the Moon gets its own light so it reads as a bright gibbous Moon in the last shot
const moon = new THREE.Mesh(moonGeo, new THREE.ShaderMaterial({
  vertexColors: true, uniforms: { lightDir: { value: new THREE.Vector3(-0.35, -0.75, 0.55).normalize() } },
  vertexShader: `varying vec3 vC; varying vec3 vW;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vC = color; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 lightDir; varying vec3 vC; varying vec3 vW;
    #include <logdepthbuf_pars_fragment>
    void main(){
      #include <logdepthbuf_fragment>
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
      if (dot(n, cameraPosition - vW) < 0.0) n = -n;
      float l = max(dot(n, lightDir), 0.0);
      vec3 c = vC * (0.03 + 1.25 * l);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
space.add(moon);

  return { R_E, EARTH_C, space, earth, cloudShell, atmo, stars, starMat, plane, balloon, iss, moon };
}
