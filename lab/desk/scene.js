/*
  Orbe's desk in three.js.

  The desk, monitor, keyboard and pencil were modelled and lit in Blender (build/desk.py): their light is
  baked into one lightmap and multiplied by flat palette colours, so they cost one draw call and never
  change. What you can touch (the orb and the paper) is lit live with matching lights and casts real
  shadows onto the desk. The physics is a small solver written for this page: circles and sheets sliding
  on one plane, a spring for the hand, and friction tuned so a hard push settles in under two seconds.
  It sleeps when nothing moves, and so does the renderer: nothing here runs on a loop.
*/
import * as THREE from "three";
import { GLTFLoader } from "./assets/vendor/three-addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "./assets/vendor/three-addons/environments/RoomEnvironment.js";
import { createScreen } from "./screen.js";
import { createPaper, createLedger } from "./paper.js";

const C = {
  sky: 0x9ee9fb, ink: 0x141311, paper: 0xf3f0e8, chalk: 0xfbfaf6, linen: 0xe7e2d7, cobalt: 0x1f4bff, peony: 0xf2879e, claret: 0x6f1726,
};
const EXPOSURE = 1.32;
const SUN = new THREE.Vector3(-0.55, 1.0, 0.62).normalize(); // Blender's sun, in three's axes
const ORB_R = 0.082, GLASS = 0.0035;
const DESK = { x: 0.60, z: 0.305 };
const BOXES = [
  { x0: -0.218, x1: 0.218, z0: -0.42, z1: 0.058 },  // monitor
  { x0: -0.232, x1: 0.192, z0: 0.096, z1: 0.244 },  // keyboard
  { x0: -0.588, x1: -0.282, z0: -0.216, z1: -0.154 }, // the rack of orbs
];
const RACK = { x0: -0.555, dx: 0.06, z: -0.185, top: 0.0172, r: 0.027 };
const ORDER = ["channel", "newsletter", "stream", "podcast", "portfolio"];
const PAPER_W = 0.196, PAPER_D = 0.274;

export async function createDesk({ canvas, room, still, onFirstFrame }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // ---------------------------------------------------------------- the baked world
  const texLoader = new THREE.TextureLoader();
  const loadTex = (url) => new Promise((res, rej) => texLoader.load(url, res, undefined, rej));
  const [gltf, deskLight, groundLight] = await Promise.all([
    new GLTFLoader().loadAsync("assets/desk.glb"),
    loadTex("assets/desk-light.png"),
    loadTex("assets/ground-light.png"),
  ]);
  for (const t of [deskLight, groundLight]) { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }

  const screen = createScreen();
  const screenTex = new THREE.CanvasTexture(screen.canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  screenTex.flipY = false;

  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "desk") o.material = new THREE.MeshBasicMaterial({ vertexColors: true, map: deskLight, color: new THREE.Color(EXPOSURE, EXPOSURE, EXPOSURE) });
    else if (o.name === "ground") o.material = new THREE.MeshBasicMaterial({ color: C.sky, map: groundLight });
    else if (o.name === "screen") { o.material = new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(0.93, 0.93, 0.93) }); o.userData.screen = true; }
  });
  scene.add(gltf.scene);
  const screenMesh = gltf.scene.getObjectByName("screen");
  // the CRT glass: a faint reflection of the room over the window
  if (screenMesh) {
    const glass = new THREE.Mesh(screenMesh.geometry, new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.2, depthWrite: false }));
    glass.position.copy(screenMesh.position); glass.quaternion.copy(screenMesh.quaternion); glass.scale.copy(screenMesh.scale);
    glass.translateZ(0.0012);
    glass.renderOrder = 2;
    screenMesh.parent.add(glass);
  }

  // ---------------------------------------------------------------- live light, matched to the bake
  const hemi = new THREE.HemisphereLight(0xdff7ff, C.peony, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e4, 2.1);
  sun.position.copy(SUN).multiplyScalar(3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 0.5, far: 6 });
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.002;
  scene.add(sun);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(DESK.x * 2, DESK.z * 2), new THREE.ShadowMaterial({ color: C.claret, opacity: 0.32, depthWrite: false }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.0003;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // ---------------------------------------------------------------- the orbs: thick glass, cobalt liquid filled to the score
  // The liquid's surface is a clipping plane kept level in the world, closed by a disc, so it stays flat when the orb rolls.
  function makeOrb(R, inner, segs = 64) {
    const group = new THREE.Group();
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: R * 0.06, ior: 1.25, envMapIntensity: 1.3, specularIntensity: 1, clearcoat: 0.5, clearcoatRoughness: 0.05 });
    const glass = new THREE.Mesh(new THREE.SphereGeometry(R, segs, Math.round(segs * 0.75)), glassMat);
    group.add(glass);
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const liq = new THREE.Mesh(new THREE.SphereGeometry(inner, segs, Math.round(segs * 0.75)), new THREE.MeshStandardMaterial({ color: C.cobalt, roughness: 0.3, metalness: 0, clippingPlanes: [plane], clipShadows: true, side: THREE.DoubleSide, envMapIntensity: 0.55 }));
    liq.castShadow = true;
    group.add(liq);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, segs), new THREE.MeshStandardMaterial({ color: 0x6283ff, roughness: 0.06, metalness: 0, envMapIntensity: 1.4 }));
    scene.add(disc);
    scene.add(group);
    const up = new THREE.Vector3(0, 0, 1);
    function set(level, tilt = null) {
      const n = tilt ? new THREE.Vector3(tilt.x, 1, tilt.y).normalize() : new THREE.Vector3(0, 1, 0);
      const h = (level * 2 - 1) * inner;
      const p = group.position.clone().addScaledVector(n, h);
      plane.normal.copy(n).negate();
      plane.constant = -plane.normal.dot(p);
      const rr = Math.sqrt(Math.max(0, inner * inner - h * h)) * 0.995;
      disc.visible = rr > 0.0008;
      disc.position.copy(p);
      disc.quaternion.setFromUnitVectors(up, n);
      disc.scale.setScalar(Math.max(rr, 0.0001));
    }
    return { group, glass, set };
  }
  const big = makeOrb(ORB_R, ORB_R * 0.93);
  const orb = big.group, glassMesh = big.glass;
  const small = ORDER.map((k, i) => {
    const o = makeOrb(RACK.r, RACK.r * 0.9, 32);
    o.group.position.set(RACK.x0 + i * RACK.dx, RACK.top + RACK.r - 0.003, RACK.z);
    o.key = k;
    return o;
  });

  // ---------------------------------------------------------------- the paper
  const paperArt = createPaper();
  const ledgerArt = createLedger();
  const ledgerTex = new THREE.CanvasTexture(ledgerArt.canvas);
  ledgerTex.colorSpace = THREE.SRGBColorSpace;
  ledgerTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paperTex = new THREE.CanvasTexture(paperArt.canvas);
  paperTex.colorSpace = THREE.SRGBColorSpace;
  paperTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  function sheetGeometry(curl, W2 = PAPER_W, D2 = PAPER_D) {
    const geo = new THREE.PlaneGeometry(W2, D2, 12, 16);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (W2 / 2), z = p.getZ(i) / (D2 / 2);
      p.setY(i, curl * (Math.pow(Math.max(0, z), 4) * 0.9 + Math.pow(Math.abs(x), 6) * 0.25));
    }
    geo.computeVertexNormals();
    return geo;
  }
  const sheets = [
    { color: C.linen, curl: 0.0016, x: -0.418, z: 0.128, a: -0.30, tex: null },
    { color: C.paper, curl: 0.0020, x: -0.428, z: 0.122, a: -0.13, tex: null },
    { color: 0xffffff, curl: 0.0026, x: -0.438, z: 0.118, a: 0.05, tex: paperTex },
    { color: 0xffffff, curl: 0.0012, x: 0.395, z: 0.175, a: -0.22, tex: ledgerTex, w: 0.128, d: 0.172, base: 0.0016, card: true },
  ].map((s, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: s.color, map: s.tex, roughness: s.card ? 0.8 : 0.92, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.25 });
    const w = s.w ?? PAPER_W, d = s.d ?? PAPER_D;
    const m = new THREE.Mesh(sheetGeometry(s.curl, w, d), mat);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    return { kind: "paper", mesh: m, i, w2: w, d2: d, r: Math.min(w, d) * 0.43, base: s.base ?? 0.0007 + i * 0.0009, pos: new THREE.Vector2(s.x, s.z), vel: new THREE.Vector2(), a: s.a, w: 0, y: 0, vy: 0 };
  });
  const orbBody = { kind: "orb", mesh: glassMesh, pos: new THREE.Vector2(0.40, -0.01), vel: new THREE.Vector2(), y: 0, vy: 0, tilt: new THREE.Vector2(), tiltV: new THREE.Vector2(), level: 0, levelV: 0, levelTo: 0, lastV: new THREE.Vector2() };
  const bodies = [orbBody, ...sheets];

  // ---------------------------------------------------------------- framing
  let W = 1, H = 1;
  const look = new THREE.Vector3();
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  function frame() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    const rr = room();
    const portrait = rr.width / rr.height < 1.05;
    // what must be seen: the whole desk on wide screens, the monitor, orb and paper on a phone
    const box = portrait
      ? new THREE.Box3(new THREE.Vector3(-0.61, -0.02, -0.26), new THREE.Vector3(0.61, 0.46, 0.31))
      : new THREE.Box3(new THREE.Vector3(-0.60, -0.08, -0.30), new THREE.Vector3(0.60, 0.46, 0.31));
    const elev = portrait ? 0.66 : 0.36, yaw = portrait ? -0.06 : -0.14;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
    look.set(0, 0.12, 0);
    camera.fov = portrait ? 28 : 20;
    camera.aspect = W / H;
    camera.clearViewOffset();
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const span = (d) => {
      camera.position.copy(look).addScaledVector(dir, d);
      camera.lookAt(look);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const c of corners) {
        const p = c.clone().project(camera);
        const px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      return { x0, x1, y0, y1 };
    };
    let lo = 0.3, hi = 20;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2, s = span(mid);
      if (s.x1 - s.x0 <= rr.width * 0.94 && s.y1 - s.y0 <= rr.height * 1.0) hi = mid; else lo = mid;
    }
    const s = span(hi);
    camera.userData.base = camera.position.clone();
    camera.userData.dir = dir; camera.userData.d = hi;
    const dx = (s.x0 + s.x1) / 2 - (rr.left + rr.width / 2);
    // wide: centred in the room; tall: sat down on the form, so the gap goes above, under the sentence
    const dy = portrait ? s.y1 - (rr.top + rr.height) : (s.y0 + s.y1) / 2 - (rr.top + rr.height / 2);
    camera.setViewOffset(W, H, dx, dy, W, H);
    camera.updateProjectionMatrix();
    wake();
  }

  // ---------------------------------------------------------------- state from the engine
  let current = null;
  let screenAnim = null;
  function setKind(d, { instant = false } = {}) {
    current = d;
    orbBody.levelTo = d.n / 100;
    if (instant) { orbBody.level = orbBody.levelTo; screen.draw(d.window, 1, false); screenTex.needsUpdate = true; paperArt.draw(d.paper); paperTex.needsUpdate = true; wake(); return; }
    screenAnim = { t0: performance.now(), d };
    const top = sheets[2];
    top.vy = 0.3; top.pendingArt = d.paper; top.w += (Math.random() - 0.5) * 0.3;
    wake();
  }

  function setRack(levels) { small.forEach((sm) => { sm.level = levels[sm.key] ?? 0; }); wake(); }
  function setLedger(rows) { ledgerArt.draw(rows); ledgerTex.needsUpdate = true; wake(); }

  // where the labels go: points in the world, projected to the canvas each frame
  const anchors = {};
  const proj = new THREE.Vector3();
  let onFrame = null;
  function anchorsNow() {
    const r = {};
    const at = (k, v) => { proj.copy(v).project(camera); r[k] = { x: (proj.x + 1) / 2 * W, y: (1 - proj.y) / 2 * H }; };
    at("orb", new THREE.Vector3(orb.position.x, orb.position.y + ORB_R + 0.012, orb.position.z));
    const top = sheets[2], led = sheets[3];
    at("paper", new THREE.Vector3(top.pos.x, top.base + top.y, top.pos.y - PAPER_D * 0.5 - 0.01));
    at("ledger", new THREE.Vector3(led.pos.x, led.base + led.y, led.pos.y - led.d2 * 0.5 - 0.008));
    small.forEach((sm) => at("rack-" + sm.key, new THREE.Vector3(sm.group.position.x, sm.group.position.y + RACK.r + 0.006, sm.group.position.z)));
    at("screen", new THREE.Vector3(0, 0.47, -0.05));
    return r;
  }
  void anchors;

  // ---------------------------------------------------------------- physics
  const G = 9.8;
  function collideCircle(b, r, e) {
    const minX = -DESK.x + r, maxX = DESK.x - r, minZ = -DESK.z + r, maxZ = DESK.z - r;
    if (b.pos.x < minX) { b.pos.x = minX; b.vel.x = Math.abs(b.vel.x) * e; }
    if (b.pos.x > maxX) { b.pos.x = maxX; b.vel.x = -Math.abs(b.vel.x) * e; }
    if (b.pos.y < minZ) { b.pos.y = minZ; b.vel.y = Math.abs(b.vel.y) * e; }
    if (b.pos.y > maxZ) { b.pos.y = maxZ; b.vel.y = -Math.abs(b.vel.y) * e; }
    for (const k of BOXES) {
      const cx = Math.max(k.x0, Math.min(b.pos.x, k.x1)), cz = Math.max(k.z0, Math.min(b.pos.y, k.z1));
      const dx = b.pos.x - cx, dz = b.pos.y - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        let nx, nz, d = Math.sqrt(d2);
        if (d > 1e-6) { nx = dx / d; nz = dz / d; }
        else { // centre inside the box: push out the shortest way
          const opts = [[b.pos.x - k.x0, -1, 0], [k.x1 - b.pos.x, 1, 0], [b.pos.y - k.z0, 0, -1], [k.z1 - b.pos.y, 0, 1]].sort((a, c) => a[0] - c[0]);
          nx = opts[0][1]; nz = opts[0][2]; d = -opts[0][0];
        }
        b.pos.x += nx * (r - d); b.pos.y += nz * (r - d);
        const vn = b.vel.x * nx + b.vel.y * nz;
        if (vn < 0) { b.vel.x -= (1 + e) * vn * nx; b.vel.y -= (1 + e) * vn * nz; }
        b.bumped = Math.max(b.bumped || 0, -vn);
      }
    }
  }

  const grab = { body: null, local: new THREE.Vector2(), target: new THREE.Vector2(), y: 0 };
  let awake = true;
  function step(dt) {
    let moving = false;
    // the orb
    const o = orbBody;
    o.lastV.copy(o.vel);
    if (grab.body === o) {
      const k = 260, c = 2 * Math.sqrt(k) * 0.9;
      o.vel.x += (k * (grab.target.x - o.pos.x) - c * o.vel.x) * dt;
      o.vel.y += (k * (grab.target.y - o.pos.y) - c * o.vel.y) * dt;
    } else {
      const sp = o.vel.length();
      if (sp > 0) { const dec = Math.min(sp, (0.42 + sp * 0.9) * dt); o.vel.multiplyScalar((sp - dec) / sp); }
    }
    o.pos.addScaledVector(o.vel, dt);
    o.bumped = 0;
    collideCircle(o, ORB_R, 0.42);
    // falling in on load, bouncing on the desk
    if (o.y > 0 || o.vy !== 0) {
      o.vy -= G * dt; o.y += o.vy * dt;
      if (o.y <= 0) { o.y = 0; const imp = -o.vy; o.vy = imp > 0.25 ? imp * 0.36 : 0; o.levelV -= imp * 0.6; o.tiltV.x += (Math.random() - 0.5) * imp * 2; }
    }
    // the liquid: level springs to the score, surface tilts against acceleration and settles
    const ax = (o.vel.x - o.lastV.x) / dt, az = (o.vel.y - o.lastV.y) / dt;
    const wn = 2 * Math.PI * 1.7, z = 0.16;
    o.tiltV.x += (-wn * wn * o.tilt.x - 2 * z * wn * o.tiltV.x - ax * 0.9) * dt;
    o.tiltV.y += (-wn * wn * o.tilt.y - 2 * z * wn * o.tiltV.y - az * 0.9) * dt;
    o.tilt.addScaledVector(o.tiltV, dt);
    o.tilt.clampLength(0, 0.5);
    const wl = 2 * Math.PI * 1.25, zl = 0.32;
    o.levelV += (-wl * wl * (o.level - o.levelTo) - 2 * zl * wl * o.levelV) * dt;
    o.level += o.levelV * dt;
    if (o.vel.lengthSq() > 1e-6 || Math.abs(o.vy) > 0 || o.y > 0 || o.tilt.lengthSq() > 1e-6 || o.tiltV.lengthSq() > 1e-5 || Math.abs(o.level - o.levelTo) > 1e-4 || Math.abs(o.levelV) > 1e-3 || grab.body === o) moving = true;
    else { o.vel.set(0, 0); o.tilt.set(0, 0); o.tiltV.set(0, 0); o.level = o.levelTo; o.levelV = 0; }

    // the sheets
    for (const s of sheets) {
      if (grab.body === s) {
        const k = 220, c = 2 * Math.sqrt(k) * 0.95;
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        const px = s.pos.x + grab.local.x * ca + grab.local.y * sa, pz = s.pos.y - grab.local.x * sa + grab.local.y * ca;
        const fx = k * (grab.target.x - px) - c * s.vel.x, fz = k * (grab.target.y - pz) - c * s.vel.y;
        s.vel.x += fx * dt; s.vel.y += fz * dt;
        const rx = px - s.pos.x, rz = pz - s.pos.y;
        const I = (s.w2 * s.w2 + s.d2 * s.d2) / 12;
        s.w += (-(rx * fz - rz * fx) / I * 0.35 - s.w * 6) * dt;
      } else {
        const sp = s.vel.length();
        if (sp > 0) { const dec = Math.min(sp, (1.6 + sp * 2.2) * dt); s.vel.multiplyScalar((sp - dec) / sp); }
        s.w *= Math.exp(-5.5 * dt);
        if (Math.abs(s.w) < 0.004) s.w = 0;
      }
      s.pos.addScaledVector(s.vel, dt);
      s.a += s.w * dt;
      s.bumped = 0;
      collideCircle(s, s.r, 0.15);
      // the flutter: a sheet dropped or lifted falls slowly, like paper
      if (s.y > 0 || s.vy !== 0) {
        s.vy -= G * 0.42 * dt; s.vy = Math.max(s.vy, -0.55);
        s.y += s.vy * dt;
        if (s.pendingArt && s.vy < 0) { paperArt.draw(s.pendingArt); paperTex.needsUpdate = true; s.pendingArt = null; }
        if (s.y <= 0) { s.y = 0; s.vy = 0; }
      }
      if (s.vel.lengthSq() > 1e-6 || s.w !== 0 || s.y > 0 || s.vy !== 0 || grab.body === s) moving = true;
      else s.vel.set(0, 0);
    }
    return moving;
  }

  function place() {
    const o = orbBody;
    orb.position.set(o.pos.x, ORB_R + o.y, o.pos.y);
    big.set(o.level, o.tilt);
    for (const sm of small) sm.set(sm.level ?? 0);
    for (const s of sheets) {
      s.mesh.position.set(s.pos.x, s.base + s.y, s.pos.y);
      s.mesh.rotation.set(0, s.a, 0);
      s.mesh.rotation.z = s.y * 0.6 * Math.sin(s.a * 3 + 1);
      s.mesh.rotation.x = s.y * 0.4;
    }
  }

  // ---------------------------------------------------------------- the screen's repaint
  function animateScreen(now) {
    if (!screenAnim) return false;
    const t = now - screenAnim.t0;
    const flash = t < 90;
    const fill = Math.min(1, Math.max(0, (t - 60) / 420));
    screen.draw(screenAnim.d.window, Math.floor(fill * 25) / 25, flash);
    screenTex.needsUpdate = true;
    if (t > 480) { screenAnim = null; }
    return true;
  }

  // ---------------------------------------------------------------- the loop that is not a loop
  let raf = 0, last = 0, acc = 0, first = true, running = false;
  function wake() { if (!raf) { if (!running) last = performance.now(); running = true; raf = requestAnimationFrame(tick); } }
  function tick() {
    raf = 0;
    const now = performance.now();
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    let busy = false;
    if (!still) {
      acc += dt;
      while (acc > 1 / 240) { busy = step(1 / 240) || busy; acc -= 1 / 240; }
    }
    busy = animateScreen(now) || busy;
    // gentle parallax towards the pointer, damped, still when the pointer is still
    parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 5);
    parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 5);
    if (Math.abs(parallax.tx - parallax.x) > 1e-4 || Math.abs(parallax.ty - parallax.y) > 1e-4) busy = true;
    if (camera.userData.base) {
      const d = camera.userData.d, base = camera.userData.dir;
      const yaw = parallax.x * 0.035, pitch = parallax.y * 0.02;
      const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      dir.y += pitch; dir.normalize();
      camera.position.copy(look).addScaledVector(dir, d);
      camera.lookAt(look);
    }
    place();
    renderer.render(scene, camera);
    onFrame?.(anchorsNow());
    if (first) { first = false; onFirstFrame?.(); }
    if (busy) raf = requestAnimationFrame(tick);
    else running = false;
  }

  // ---------------------------------------------------------------- the hand
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const toNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  function pick(e) {
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    const targets = [glassMesh, ...sheets.map((s) => s.mesh)];
    const hits = ray.intersectObjects(targets, false);
    if (!hits.length) return null;
    const h = hits[0];
    if (h.object === glassMesh) return { body: orbBody, point: h.point };
    // a sheet: take the top most one under the pointer
    const sheetHits = hits.filter((x) => x.object !== glassMesh).map((x) => sheets.find((s) => s.mesh === x.object));
    sheetHits.sort((a, b) => b.i - a.i);
    return { body: sheetHits[0], point: hits.find((x) => x.object === sheetHits[0].mesh).point };
  }
  function onPlane(e, y) {
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    plane.constant = -y;
    return ray.ray.intersectPlane(plane, hitPoint) ? hitPoint : null;
  }
  let down = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (still || e.button > 0) return;
    const p = pick(e);
    if (!p) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const b = p.body;
    grab.body = b; grab.y = p.point.y;
    grab.target.set(p.point.x, p.point.z);
    if (b.kind === "paper") {
      const dx = p.point.x - b.pos.x, dz = p.point.z - b.pos.y, ca = Math.cos(b.a), sa = Math.sin(b.a);
      grab.local.set(dx * ca - dz * sa, dx * sa + dz * ca);
    }
    down = { x: e.clientX, y: e.clientY, t: performance.now(), point: p.point.clone(), body: b, moved: false };
    canvas.classList.add("grabbing");
    onTouch?.();
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      parallax.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      parallax.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!still) wake();
    }
    if (grab.body) {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) down.moved = true;
      const q = onPlane(e, grab.y);
      if (q) grab.target.set(q.x, q.z);
      wake();
    } else if (e.pointerType === "mouse" && !still) {
      canvas.classList.toggle("grab", !!pick(e));
    }
  });
  const release = (e) => {
    if (!grab.body) return;
    const b = grab.body;
    if (down && !down.moved && performance.now() - down.t < 350) {
      // a tap is a nudge, away from the viewer and off the point you touched
      const away = new THREE.Vector2(down.point.x - camera.position.x, down.point.z - camera.position.z).normalize();
      if (b.kind === "orb") { const off = new THREE.Vector2(b.pos.x - down.point.x, b.pos.y - down.point.z).multiplyScalar(6); b.vel.add(away.multiplyScalar(0.55)).add(off); b.vy = 0.6; }
      else { b.vel.add(away.multiplyScalar(0.32)); b.w += (down.point.x - b.pos.x) * 30; }
    }
    b.vel.clampLength(0, 1.4);
    grab.body = null; down = null;
    canvas.classList.remove("grabbing");
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    wake();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { parallax.tx = 0; parallax.ty = 0; if (!still) wake(); });
  // on touch, a press on the orb or a sheet must not scroll the page
  canvas.addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t && pick(t)) e.preventDefault(); }, { passive: false });

  let onTouch = null;
  function drop() {
    // the entrance: the orb falls onto the desk, the sheets float down after it
    if (still) return;
    orbBody.y = 0.26; orbBody.vy = 0;
    sheets.forEach((s, i) => { s.y = 0.05 + i * 0.03; s.vy = 0; s.w = (i - 1) * 0.5; });
    wake();
  }

  frame();
  let rt = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(frame); });

  return {
    setKind, setRack, setLedger, drop, wake, render: () => wake(),
    set onFrame(f) { onFrame = f; wake(); },
    set onTouch(f) { onTouch = f; },
    renderer, camera, scene,
  };
}
