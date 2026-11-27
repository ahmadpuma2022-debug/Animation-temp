import * as THREE from 'three';
import { rr, scene, M, jitter } from './stage.js';

// Things for the trip above the air: a burst weather balloon falling back, meteors burning up, a GPS satellite,
// the ring of geostationary satellites, Earth as a dot when it is too far to draw as a ball, Neptune and Voyager 1.
// All low-poly and flat shaded. Positions are set by the episode (most are staged to pass close by you).
export function buildDeepSpace(EARTH_C) {
  const lit = (color, e = 0.25, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, emissive: color, emissiveIntensity: e, ...extra });

  // ---------- burst weather balloon: shreds of latex, an orange parachute, the payload box ----------
  const burst = new THREE.Group();
  {
    burst.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), lit('#e9b02f', 0.3)), {}));
    const chute = new THREE.Mesh(new THREE.SphereGeometry(2.8, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2.4), lit('#e2572d', 0.35, { side: THREE.DoubleSide }));
    chute.position.y = 5.2; chute.scale.y = 0.75; burst.add(chute);
    for (let k = 0; k < 6; k++) {          // suspension lines from the chute rim to the box
      const a = k / 6 * Math.PI * 2, top = new THREE.Vector3(Math.cos(a) * 2.6, 5.6, Math.sin(a) * 2.6), bot = new THREE.Vector3(0, 0.6, 0);
      const d = top.clone().sub(bot), l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, d.length(), 3), M('#d9d4c8'));
      l.position.copy(bot).addScaledVector(d, 0.5); l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); burst.add(l);
    }
    const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7, 3), M('#d9d4c8')); tether.position.y = 10.3; burst.add(tether);
    for (let k = 0; k < 6; k++) {          // torn latex hanging from the tether
      const s = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 0), 0.6), lit('#f2ede2', 0.4));
      s.scale.set(rr(0.8, 1.6), rr(2.2, 4), rr(0.15, 0.35)); s.position.set(rr(-1.2, 1.2), 14 + rr(-1, 2), rr(-1.2, 1.2)); s.rotation.set(rr(-0.4, 0.4), rr(0, 6), rr(-0.4, 0.4)); burst.add(s);
    }
  }
  burst.visible = false; scene.add(burst);

  // ---------- meteors: a glowing head and a tail, each lasting under a second ----------
  const meteorMat = new THREE.MeshBasicMaterial({ color: '#ffdcae', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff6e2', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const tailG = new THREE.CylinderGeometry(30, 0, 3600, 6, 1, true); tailG.translate(0, -1800, 0);   // head at the origin, tail behind (-y)
  const headG = new THREE.IcosahedronGeometry(38, 1);
  const meteors = [];
  // [start s, duration s, bearing deg, distance m, depth below you m, heading deg, dive deg]
  for (const [t0, dur, b, d, y, hd, dv] of [[284.5, 0.9, -40, 9000, -7000, 60, 25], [286.8, 0.7, 5, 14000, -11000, 160, 35], [288.6, 0.8, -10, 7000, -9000, 20, 30],
    [290.9, 0.9, -55, 11000, -8000, 110, 20], [292.4, 0.7, 15, 9000, -12000, 250, 40], [294.3, 1.0, -25, 6000, -6500, 300, 25], [296.2, 0.8, -5, 12000, -10000, 200, 30]]) {
    const mat = meteorMat.clone(), hmat = headMat.clone(), g = new THREE.Group();
    g.add(new THREE.Mesh(tailG, mat), new THREE.Mesh(headG, hmat));
    const br = THREE.MathUtils.degToRad(b), h = THREE.MathUtils.degToRad(hd), v = THREE.MathUtils.degToRad(dv);
    const dir = new THREE.Vector3(Math.cos(h) * Math.cos(v), -Math.sin(v), Math.sin(h) * Math.cos(v));
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.visible = false; scene.add(g);
    meteors.push({ g, mat, hmat, t0, dur, off: new THREE.Vector3(-Math.sin(br) * d, y, -Math.cos(br) * d).multiplyScalar(0.6), dir });   // 60% of the listed distance
  }
  // place the meteors around the camera position `cam` at time t
  function meteorsAt(t, cam) {
    for (const m of meteors) {
      const u = (t - m.t0) / m.dur;
      m.g.visible = u > 0 && u < 1;
      if (!m.g.visible) continue;
      const o = Math.sin(Math.PI * u);
      m.mat.opacity = o; m.hmat.opacity = o;
      m.g.position.copy(cam).add(m.off).addScaledVector(m.dir, 5000 * u);
    }
  }

  // ---------- GPS satellite (Block IIF): a gold box, two blue solar wings, antennas facing Earth ----------
  const gps = new THREE.Group();
  {
    gps.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.0), lit('#c9a043', 0.35, { metalness: 0.3 })));
    const ant = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.6), lit('#e8e6e1', 0.3)); ant.position.y = -1.25; gps.add(ant);
    for (const s of [-1, 1]) {
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 4), M('#b8b8b8')); boom.rotation.z = Math.PI / 2; boom.position.x = s * 2; gps.add(boom);
      for (const k of [0, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.9), lit('#2a3d72', 0.35, { metalness: 0.4, roughness: 0.35 })); p.position.x = s * (4.1 + k * 2.5); gps.add(p); }
    }
  }
  gps.visible = false; scene.add(gps);

  // ---------- the geostationary ring: 480 satellites on a circle 42,164 km from Earth's centre ----------
  // Its plane is tilted 30 degrees from your path (as if you lived at 30 degrees latitude), so it reads as a ring around Earth.
  const R_GEO = 42164000, n = new THREE.Vector3(0, Math.cos(Math.PI / 3), Math.sin(Math.PI / 3));
  const u = new THREE.Vector3(1, 0, 0), w = new THREE.Vector3().crossVectors(n, u);
  const ringPos = new Float32Array(480 * 3);
  for (let k = 0; k < 480; k++) {
    const a = k / 480 * Math.PI * 2 + rr(-0.004, 0.004);
    const p = EARTH_C.clone().addScaledVector(u, Math.cos(a) * R_GEO).addScaledVector(w, Math.sin(a) * R_GEO);
    ringPos.set(p.toArray(), k * 3);
  }
  const ringGeo = new THREE.BufferGeometry(); ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  const geoRing = new THREE.Points(ringGeo, new THREE.PointsMaterial({ color: '#ffe9c4', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
  geoRing.frustumCulled = false; geoRing.visible = false; scene.add(geoRing);

  // ---------- Earth as a dot (when it is too far to draw as a ball): a pale blue point and a soft glow ----------
  const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const dotMat = new THREE.PointsMaterial({ color: '#a9cdff', size: 5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, depthTest: false });
  const glowMat = new THREE.PointsMaterial({ color: '#6f9fe8', size: 16, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const earthDot = new THREE.Group(); earthDot.add(new THREE.Points(dotGeo, glowMat), new THREE.Points(dotGeo, dotMat));
  earthDot.children.forEach((p) => { p.frustumCulled = false; p.renderOrder = 5; });
  scene.add(earthDot);
  function earthDotAt(cam, opacity) {   // put it 10 km from the camera, in Earth's direction
    earthDot.position.copy(cam).addScaledVector(EARTH_C.clone().sub(cam).normalize(), 10000);
    dotMat.opacity = opacity; glowMat.opacity = opacity * 0.45; earthDot.visible = opacity > 0.001;
  }

  // ---------- Neptune: a faint blue ball with soft bands ----------
  const nepGeo = new THREE.IcosahedronGeometry(1, 4).toNonIndexed();
  {
    const p = nepGeo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), A = new THREE.Color('#4f74c9'), B = new THREE.Color('#6a8fdc'), C = new THREE.Color('#3d5fb0');
    for (let i = 0; i < p.count; i += 3) {
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, band = Math.sin(y * 9.0);
      c.copy(band > 0.6 ? B : band < -0.7 ? C : A);
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    nepGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); nepGeo.computeVertexNormals();
  }
  const neptune = new THREE.Mesh(nepGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, emissive: '#1b2a5a', emissiveIntensity: 0.6 }));
  neptune.scale.setScalar(2.4); neptune.rotation.z = 0.5; neptune.visible = false; scene.add(neptune);

  // ---------- Voyager 1: the 3.7 m dish, the ten-sided body, the long magnetometer boom, the power (RTG) boom ----------
  const voyager = new THREE.Group();
  {
    const white = lit('#f1efe8', 0.32), silver = lit('#c9c6bd', 0.15, { metalness: 0.4, roughness: 0.4 }), dark = lit('#3a3835', 0.1), gold = lit('#c7a24a', 0.2, { metalness: 0.3 });
    // the top cap of a sphere whose centre is below it: a bowl that opens downward (toward Earth), apex at y 0.9, rim at y 0.32
    const dish = new THREE.Mesh(new THREE.SphereGeometry(3.3, 28, 6, 0, Math.PI * 2, 0, 0.6), new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.55, flatShading: true, side: THREE.DoubleSide, emissive: '#f1efe8', emissiveIntensity: 0.32 }));
    dish.position.y = 0.9 - 3.3; voyager.add(dish);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 6), silver); feed.position.y = -0.2; voyager.add(feed);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 3), silver); st.position.set(Math.cos(a) * 0.8, 0.1, Math.sin(a) * 0.8); st.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); voyager.add(st); }
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.47, 10), gold); bus.position.y = 1.2; voyager.add(bus);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 10), silver); top.position.y = 1.6; voyager.add(top);
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 13, 4), silver); mag.rotation.z = Math.PI / 2; mag.position.set(-7.4, 1.2, 0.4); voyager.add(mag);
    const rtgBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4), silver); rtgBoom.rotation.x = Math.PI / 2; rtgBoom.rotation.z = 0.3; rtgBoom.position.set(0.5, 1.1, 2.1); voyager.add(rtgBoom);
    for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 8), dark); r.rotation.x = Math.PI / 2; r.position.set(0.85, 1.05, 2.4 + k * 0.6); voyager.add(r); }
    const sci = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 4), silver); sci.rotation.x = Math.PI / 2; sci.rotation.z = -0.3; sci.position.set(-0.5, 1.2, -2.0); voyager.add(sci);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), dark); plat.position.set(-0.85, 1.25, -3.2); voyager.add(plat);
  }
  voyager.visible = false; scene.add(voyager);

  return { burst, meteorsAt, gps, geoRing, earthDotAt, neptune, voyager };
}
