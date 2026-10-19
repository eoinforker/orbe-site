/*
  The Today world. A small paper island under a still camera and a soft sun.
  On it sit two things, both read from the engine:

    the hundred   a tray of 100 marbles, the creators nearest your size, in rank
                  order from the front corner. The ones you beat are Cobalt, the
                  ones ahead of you Straw, and your orb, Ember, sits in its own
                  place filled to your score.
    your uploads  one plinth per upload on an arc, oldest at the back. Height is
                  the upload against your own typical (the engine's multiple),
                  so the sheet of glass at 1x is your typical. Straw plinths did
                  twice your typical or better: the engine's hit rate.

  Plinths can be pushed (drag) and opened (click). They stay where you leave
  them. Nothing loops: the frame loop runs only while something moves and stops
  when everything has settled. Reduced motion draws the settled scene once.
  Without WebGL the same numbers are drawn flat on a 2D canvas.
*/

const TAU = Math.PI * 2;
let THREE = null;
async function loadThree() { if (!THREE) THREE = await import("../assets/vendor/three-0.160.0.module.min.js"); return THREE; }

const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
/* A quick rise that lands with one small settle, never a loop. */
const easeBack = (t) => { t = Math.min(1, Math.max(0, t)); const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/* Height of the level line in a sphere filled to volume share f, from -1 (bottom) to 1 (top). */
function levelFor(f) {
  f = Math.min(1, Math.max(0, f));
  let lo = 0, hi = 2;
  for (let i = 0; i < 40; i++) { const h = (lo + hi) / 2; ((h * h * (3 - h)) / 4 < f ? (lo = h) : (hi = h)); }
  return (lo + hi) / 2 - 1;
}

export function createWorld(host, { onOpen = () => {}, onHover = () => {}, reduced = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "world-canvas";
  canvas.setAttribute("role", "img");
  host.appendChild(canvas);
  const labels = document.createElement("div");
  labels.className = "world-labels";
  labels.setAttribute("aria-hidden", "true");
  host.appendChild(labels);

  const W = { desk: null, gl: null, ready: null, frame: 0, framing: "desk" };

  async function boot() {
    try {
      const T = await loadThree();
      const probe = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl");
      if (!probe) throw new Error("no webgl");
      W.gl = makeGL(T, canvas, labels, { onOpen, onHover, reduced });
    } catch (e) {
      W.gl = make2D(canvas, labels, { onOpen, onHover });
    }
    host.dataset.mode = W.gl.mode;
    return W.gl;
  }
  W.ready = boot();
  return {
    async show(desk, { animate = true } = {}) {
      const g = await W.ready;
      W.desk = desk;
      canvas.setAttribute("aria-label", desk.rated
        ? `${desk.name}: your orb sits at ${desk.reachScore} in a tray of 100 ${desk.peersLine}, on reach. ${desk.works.length} uploads stand on an arc, each as tall as it did against your own typical; the tallest is ${desk.best?.title ?? "none yet"} at ${desk.best?.multiple?.toFixed(2) ?? "n/a"} times.`
        : `${desk.name}: not rated yet.`);
      g.build(desk, { animate: animate && !reduced });
    },
    resize() { W.ready.then((g) => g.resize()); },
    frame(mode) { W.framing = mode; W.ready.then((g) => g.frame(mode)); },
    select(id) { W.ready.then((g) => g.select?.(id)); },
    get mode() { return W.gl?.mode; },
    tidy() { W.ready.then((g) => g.tidy?.()); },
  };
}

/* ================================================================ three.js */
function makeGL(T, canvas, labels, { onOpen, onHover, reduced }) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);

  const C = {
    paper: new T.Color(css("--paper", "#F3F0E8")),
    chalk: new T.Color(css("--chalk", "#FBFAF6")),
    linen: new T.Color(css("--linen", "#E7E2D7")),
    ink: new T.Color(css("--ink", "#141311")),
    cobalt: new T.Color(css("--cobalt", "#1F4BFF")),
    ember: new T.Color(css("--ember", "#FF5A1F")),
    straw: new T.Color(css("--straw", "#EED56A")),
    sky: new T.Color(css("--sky", "#9EE9FB")),
    peony: new T.Color(css("--peony", "#F2879E")),
  };

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 0.5, 200);
  const LOOK = new T.Vector3(0, 0.6, 0);

  /* Light: a soft sky dome and one warm, low sun from the upper left, like late morning. */
  scene.add(new T.HemisphereLight(0xdff8ff, 0xe9e2d2, 1.55));
  const sun = new T.DirectionalLight(0xfff1dc, 2.1);
  sun.position.set(-9, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 50;
  sun.shadow.radius = 5; sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xd6f6fd, 0.5);
  fill.position.set(10, 6, -4);
  scene.add(fill);

  const mat = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...o });
  const edgeMat = new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.9 });
  const edges = (geo, thr = 30) => new T.LineSegments(new T.EdgesGeometry(geo, thr), edgeMat);

  /* ---------- the island: a thick disc of paper with a linen skirt and an ink rim */
  const R = 6.5;
  const island = new T.Group();
  scene.add(island);
  {
    const top = new T.Mesh(new T.CylinderGeometry(R, R, 0.5, 128), mat(C.paper));
    top.position.y = -0.25; top.receiveShadow = true; island.add(top);
    const skirt = new T.Mesh(new T.CylinderGeometry(R - 0.05, R - 0.6, 0.9, 128, 1, true), mat(C.linen, { side: T.DoubleSide }));
    skirt.position.y = -0.95; island.add(skirt);
    const base = new T.Mesh(new T.CircleGeometry(R - 0.6, 96), mat(C.linen));
    base.rotation.x = Math.PI / 2; base.position.y = -1.4; island.add(base);
    const rim = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => new T.Vector3(Math.cos((i / 160) * TAU) * R, 0.001, Math.sin((i / 160) * TAU) * R))), edgeMat);
    island.add(rim);
    const rim2 = rim.clone(); rim2.position.y = -0.5; island.add(rim2);
  }

  {
    const catcher = new T.Mesh(new T.CircleGeometry(R * 1.5, 64), new T.ShadowMaterial({ color: 0x1b5b6b, opacity: 0.18 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = -3.2; catcher.receiveShadow = true;
    scene.add(catcher);
    island.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  /* ---------- the hundred: a tray of ten by ten */
  const TRAY = { x: -1.7, z: -1.9, pitch: 0.47, r: 0.175 };
  const traySize = TRAY.pitch * 10 + 0.5;
  const trayG = new T.Group();
  trayG.position.set(TRAY.x, 0, TRAY.z);
  trayG.rotation.y = 0.28;
  island.add(trayG);
  {
    const shell = new T.Shape();
    const s = traySize / 2, rr = 0.25;
    shell.moveTo(-s + rr, -s); shell.lineTo(s - rr, -s); shell.quadraticCurveTo(s, -s, s, -s + rr); shell.lineTo(s, s - rr); shell.quadraticCurveTo(s, s, s - rr, s); shell.lineTo(-s + rr, s); shell.quadraticCurveTo(-s, s, -s, s - rr); shell.lineTo(-s, -s + rr); shell.quadraticCurveTo(-s, -s, -s + rr, -s);
    const geo = new T.ExtrudeGeometry(shell, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    const tray = new T.Mesh(geo, mat(C.chalk));
    tray.castShadow = true; tray.receiveShadow = true;
    trayG.add(tray);
    trayG.add(edges(geo, 40));
  }
  const marbleGeo = new T.SphereGeometry(TRAY.r, 24, 16);
  const marbles = new T.InstancedMesh(marbleGeo, mat(0xffffff, { roughness: 0.35 }), 100);
  marbles.castShadow = true; marbles.receiveShadow = true;
  trayG.add(marbles);
  /* rank 1 is the front left corner; ranks run left to right, rows run back */
  const slot = (rank) => {
    const i = rank - 1, col = i % 10, row = Math.floor(i / 10);
    return new T.Vector3((col - 4.5) * TRAY.pitch, 0.27 + TRAY.r, (4.5 - row) * TRAY.pitch);
  };

  /* your orb, filled to your score: two halves cut by one level plane */
  const ORB_R = 0.5;
  const orb = new T.Group();
  trayG.add(orb);
  const planeLo = new T.Plane(new T.Vector3(0, -1, 0), 0);
  const planeHi = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const orbGeo = new T.SphereGeometry(ORB_R, 48, 32);
  const orbLo = new T.Mesh(orbGeo, mat(C.ember, { roughness: 0.45, clippingPlanes: [planeLo], clipShadows: true }));
  const orbHi = new T.Mesh(orbGeo, new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, clippingPlanes: [planeHi], depthWrite: false }));
  const orbCap = new T.Mesh(new T.CircleGeometry(ORB_R, 48), mat(C.ember, { roughness: 0.6, side: T.DoubleSide }));
  orbCap.rotation.x = -Math.PI / 2;
  const orbRing = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new T.Vector3(Math.cos((i / 64) * TAU), 0, Math.sin((i / 64) * TAU)))), new T.LineBasicMaterial({ color: C.ink }));
  orbLo.castShadow = true;
  const orbShell = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new T.Vector3(Math.cos((i / 96) * TAU) * ORB_R, Math.sin((i / 96) * TAU) * ORB_R, 0))), new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.5 }));
  orb.add(orbLo, orbHi, orbCap, orbRing);

  /* ---------- your uploads: plinths on an arc, with the sheet of your typical */
  const ARC = { cx: 1.0, cz: 0.5, r0: 3.75, a0: -0.42 * Math.PI, a1: 0.88 * Math.PI };
  const UNIT = 0.95; /* height of a typical upload */
  const plinthGeo = new T.BoxGeometry(0.38, 1, 0.38);
  plinthGeo.translate(0, 0.5, 0);
  const plinthEdges = new T.EdgesGeometry(plinthGeo);
  const plinths = [];
  const plinthG = new T.Group();
  island.add(plinthG);
  const sheet = new T.Mesh(new T.RingGeometry(ARC.r0 - 0.6, ARC.r0 + 0.6, 96, 1, ARC.a0 - 0.06, ARC.a1 - ARC.a0 + 0.12), new T.MeshBasicMaterial({ color: C.sky, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(ARC.cx, UNIT, ARC.cz);
  island.add(sheet);
  const sheetEdge = new T.LineSegments(new T.EdgesGeometry(sheet.geometry), new T.LineBasicMaterial({ color: C.cobalt, transparent: true, opacity: 0.8 }));
  sheetEdge.rotation.x = -Math.PI / 2;
  sheetEdge.position.copy(sheet.position);
  island.add(sheetEdge);

  /* ---------- labels laid over the canvas */
  const tag = (cls, html) => { const el = document.createElement("div"); el.className = `wl ${cls}`; el.innerHTML = html; labels.appendChild(el); return el; };
  const L = { you: tag("wl-you", ""), first: tag("wl-end", ""), last: tag("wl-end", ""), typical: tag("wl-typ", ""), newest: tag("wl-arc", ""), oldest: tag("wl-arc", ""), best: tag("wl-arc wl-best", ""), pencil: tag("wl-pencil", ""), tip: tag("wl-tip", "") };
  L.tip.hidden = true;
  L.pencil.hidden = true;

  /* ---------- state */
  const S = { desk: null, t0: 0, anim: false, raf: 0, size: { w: 1, h: 1 }, hover: null, drag: null, sel: null, framing: "desk", dirty: true };

  function build(desk, { animate }) {
    S.desk = desk;
    // the hundred
    const score = desk.rated ? desk.reachScore : 50;
    const m = new T.Matrix4();
    const col = new T.Color();
    for (let rank = 1; rank <= 100; rank++) {
      const p = slot(rank);
      m.makeTranslation(p.x, p.y, p.z);
      if (rank === score) m.makeScale(0.0001, 0.0001, 0.0001).setPosition(p.x, p.y, p.z);
      marbles.setMatrixAt(rank - 1, m);
      col.copy(rank < score ? C.cobalt : C.straw);
      marbles.setColorAt(rank - 1, col);
    }
    marbles.instanceMatrix.needsUpdate = true;
    if (marbles.instanceColor) marbles.instanceColor.needsUpdate = true;
    S.orbHome = slot(score).add(new T.Vector3(0, ORB_R - TRAY.r + 0.02, 0));
    S.fill = score / 100;

    // the plinths
    for (const p of plinths) { plinthG.remove(p.mesh); p.mesh.geometry !== plinthGeo && p.mesh.geometry.dispose(); }
    plinths.length = 0;
    const works = [...desk.works].reverse(); // oldest first, along the arc
    const n = works.length;
    works.forEach((w, i) => {
      const a = n === 1 ? (ARC.a0 + ARC.a1) / 2 : ARC.a0 + ((ARC.a1 - ARC.a0) * i) / (n - 1);
      const x = ARC.cx + Math.cos(a) * ARC.r0, z = ARC.cz + Math.sin(a) * ARC.r0;
      const mult = w.multiple ?? 0;
      const hit = mult >= 2, latest = w.id === desk.latest?.id, best = w.id === desk.best?.id;
      const color = hit ? C.straw : mult >= 1 ? C.cobalt : C.chalk;
      const mesh = new T.Mesh(plinthGeo, mat(color, { roughness: 0.7 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      const line = new T.LineSegments(plinthEdges, edgeMat);
      mesh.add(line);
      if (latest) {
        const cap = new T.Mesh(new T.BoxGeometry(0.4, 0.08, 0.4), mat(C.ember));
        cap.position.y = 1; cap.userData.cap = true; mesh.add(cap);
      }
      mesh.position.set(x, 0, z);
      mesh.rotation.y = -a;
      mesh.userData.i = plinths.length;
      plinthG.add(mesh);
      const h = Math.max(0.12, Math.min(3.2, mult)) * UNIT;
      plinths.push({ w, mesh, h, x, z, vx: 0, vz: 0, home: { x, z }, cur: animate ? 0.001 : 1, latest, best, hit });
      mesh.scale.y = animate ? 0.001 : h;
    });
    S.t0 = performance.now();
    S.anim = animate;
    S.orbT = animate ? 0 : 1;
    if (!animate) L.pencil.hidden = false;
    placeOrb(animate ? 0 : 1);
    labelsText();
    resize();
    kick();
  }

  function placeOrb(u) {
    // the orb drops from above its place and lands with one small settle
    const h = S.orbHome;
    if (!h) return;
    const drop = 3.2;
    const y = u >= 1 ? h.y : h.y + drop * (1 - easeBack(u));
    orb.position.set(h.x, y, h.z);
    const lvl = levelFor(S.fill) * ORB_R;
    orbCap.position.y = lvl;
    const rr = Math.sqrt(Math.max(0, ORB_R * ORB_R - lvl * lvl));
    orbCap.scale.set(rr / ORB_R, rr / ORB_R, 1);
    orbRing.scale.set(rr, 1, rr);
    orbRing.position.y = lvl + 0.002;
    orb.updateMatrixWorld(true);
    const wy = orb.getWorldPosition(new T.Vector3()).y + lvl;
    planeLo.constant = wy; // keeps y below wy
    planeHi.constant = -wy; // keeps y above wy
  }

  function labelsText() {
    const d = S.desk;
    if (!d.rated) { for (const k of Object.keys(L)) if (k !== "tip") L[k].innerHTML = ""; return; }
    L.you.innerHTML = "";
    L.first.textContent = "1";
    L.last.textContent = "100";
    L.typical.innerHTML = `Your typical, 1×`;
    L.newest.innerHTML = `Newest<span>${esc(d.latest?.title ?? "")}</span>`;
    L.oldest.innerHTML = `Oldest`;
    const pb = d.latestBest;
    S.pencilAt = pb ? "latest" : "orb";
    const wob = (rx, ry) => { let p = ""; for (let i = 0; i <= 40; i++) { const a = -0.6 + (i / 40) * (Math.PI * 2 + 0.5), k = 1 + 0.06 * Math.sin(i * 1.7) + (i > 34 ? 0.08 : 0); p += `${i ? "L" : "M"}${(Math.cos(a) * rx * k).toFixed(1)} ${(Math.sin(a) * ry * k).toFixed(1)}`; } return p; };
    const fresh = L.pencil.cloneNode(false); L.pencil.replaceWith(fresh); L.pencil = fresh;
    L.pencil.innerHTML = `<svg width="2" height="2" viewBox="-1 -1 2 2"><path d="${pb ? wob(26, 40) : wob(34, 30)}"/></svg><em>${pb ? "a personal best" : `you, ahead of ${d.reachScore} in 100`}</em>`;
    L.pencil.hidden = true;
    L.best.innerHTML = d.best && d.best.id !== d.latest?.id ? `Best, ${d.best.multiple.toFixed(2)}\u00d7<span>${esc(d.best.title)}</span>` : "";
  }

  /* ---------- camera framing: the desk leaves room for the headline and windows */
  function frame(mode) { S.framing = mode; resize(); }
  /* points that bound what must be seen: the rim, the tray, the tallest plinth and the orb's label */
  function boundsPx() {
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; pts.push(new T.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R), new T.Vector3(Math.cos(a) * R, -1.4, Math.sin(a) * R)); }
    for (const p of plinths) pts.push(new T.Vector3(p.x, p.h, p.z));
    if (S.orbHome) pts.push(trayG.localToWorld(S.orbHome.clone().add(new T.Vector3(0, 2.2, 0))));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of pts) { const p = project(q); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    return { x0, x1, y0, y1 };
  }
  function resize() {
    const host = canvas.parentElement;
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    S.size = { w, h };
    renderer.setSize(w, h, false);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    camera.aspect = w / h;
    const desk = S.framing === "desk";
    // The island is fitted into a target rectangle: on the desk, the right, clear of the headline, Today and the icons.
    const rect = desk ? { x0: 0.4 * w, x1: w - 124, y0: 0.1 * h, y1: h + 30 } : { x0: 8, x1: w - 8, y0: 34, y1: h - 4 };
    camera.fov = 24;
    let dist = 40;
    const aim = () => { camera.position.set(-0.08 * dist, dist * 0.6, dist * 0.8).add(LOOK); camera.lookAt(LOOK); camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
    for (let k = 0; k < 3; k++) {
      aim();
      const b = boundsPx();
      const scale = Math.min((rect.x1 - rect.x0) / (b.x1 - b.x0), (rect.y1 - rect.y0) / (b.y1 - b.y0));
      dist /= scale;
    }
    aim();
    const b = boundsPx();
    camera.setViewOffset(w, h, (b.x0 + b.x1) / 2 - (rect.x0 + rect.x1) / 2, (b.y0 + b.y1) / 2 - (rect.y0 + rect.y1) / 2, w, h);
    camera.updateProjectionMatrix();
    kick();
  }

  /* ---------- the loop: runs only while something moves */
  function kick() { if (!S.raf) S.raf = requestAnimationFrame(tick); }
  function tick(now) {
    S.raf = 0;
    let moving = false;
    if (S.anim) {
      const t = now - S.t0;
      // plinths rise one after another, 24ms apart, each over 450ms
      plinths.forEach((p, i) => {
        const u = Math.min(1, Math.max(0, (t - 200 - i * 24) / 450));
        p.cur = easeBack(u);
        if (u < 1) moving = true;
      });
      // your orb drops after the plinths have started, and settles by 1.7s
      const u = Math.min(1, Math.max(0, (t - 500) / 1100));
      placeOrb(u);
      if (u < 1) moving = true;
      if (!moving) { S.anim = false; L.pencil.hidden = false; }
    }
    for (const p of plinths) {
      const lift = p === S.hover || p === S.drag?.p || p.w.id === S.sel ? 0.12 : 0;
      const ty = p.cur * p.h;
      p.mesh.scale.y = Math.max(0.001, ty);
      const cy = p.mesh.position.y;
      const ny = cy + (lift - cy) * 0.35;
      p.mesh.position.y = Math.abs(ny - lift) < 0.002 ? lift : ny;
      if (p.mesh.position.y !== lift) moving = true;
      // a pushed plinth slides, slows and stops
      if (!S.drag || S.drag.p !== p) {
        if (Math.abs(p.vx) + Math.abs(p.vz) > 0.0008) {
          p.x += p.vx; p.z += p.vz; p.vx *= 0.86; p.vz *= 0.86; moving = true;
          keepOn(p);
        } else { p.vx = p.vz = 0; }
      }
      p.mesh.position.x = p.x; p.mesh.position.z = p.z;
      // the cap on the latest upload rides on top regardless of height
      for (const c of p.mesh.children) if (c.userData.cap) { c.scale.y = 1 / Math.max(0.001, p.mesh.scale.y); c.position.y = 1 + 0.04 / Math.max(0.001, p.mesh.scale.y); }
    }
    if (collide()) moving = true;
    renderer.render(scene, camera);
    placeLabels();
    if (moving) kick();
  }

  function keepOn(p) {
    const r = Math.hypot(p.x, p.z), max = R - 0.5;
    if (r > max) { p.x *= max / r; p.z *= max / r; p.vx *= -0.3; p.vz *= -0.3; }
  }
  /* plinths push each other apart, and stay clear of the tray */
  function collide() {
    let any = false;
    const min = 0.55;
    for (let i = 0; i < plinths.length; i++) {
      const a = plinths[i];
      for (let j = i + 1; j < plinths.length; j++) {
        const b = plinths[j];
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < min && d > 1e-6) {
          const push = (min - d) / 2, ux = dx / d, uz = dz / d;
          const aFixed = S.drag?.p === a, bFixed = S.drag?.p === b;
          if (!aFixed) { a.x -= ux * push * (bFixed ? 2 : 1); a.z -= uz * push * (bFixed ? 2 : 1); }
          if (!bFixed) { b.x += ux * push * (aFixed ? 2 : 1); b.z += uz * push * (aFixed ? 2 : 1); b.vx += ux * 0.02; b.vz += uz * 0.02; }
          any = true;
        }
      }
      // the tray is a solid square
      const local = trayG.worldToLocal(new T.Vector3(a.x, 0, a.z));
      const half = traySize / 2 + 0.3;
      if (Math.abs(local.x) < half && Math.abs(local.z) < half && S.drag?.p !== a) {
        const ox = half - Math.abs(local.x), oz = half - Math.abs(local.z);
        if (ox < oz) local.x += Math.sign(local.x || 1) * ox; else local.z += Math.sign(local.z || 1) * oz;
        const back = trayG.localToWorld(local);
        a.x = back.x; a.z = back.z; a.vx *= -0.2; a.vz *= -0.2; any = true;
      }
      keepOn(a);
    }
    return any;
  }

  const v = new T.Vector3();
  function project(p3) {
    v.copy(p3).project(camera);
    return { x: (v.x * 0.5 + 0.5) * S.size.w, y: (-v.y * 0.5 + 0.5) * S.size.h, behind: v.z > 1 };
  }
  const put = (el, p, dx = 0, dy = 0) => { const hw = (el.offsetWidth || 0) / 2 + 4; const x = Math.max(hw, Math.min(S.size.w - hw, p.x + dx)); el.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max((el.offsetHeight || 0) + 4, p.y + dy))}px)`; };
  function placeLabels() {
    if (!S.desk?.rated) return;
    put(L.first, project(trayG.localToWorld(slot(1).add(new T.Vector3(-0.1, 0, 0.75)))));
    put(L.last, project(trayG.localToWorld(slot(100).add(new T.Vector3(0.1, 0, -0.55)))));
    const ta = ARC.a1 + 0.1;
    put(L.typical, project(new T.Vector3(ARC.cx + Math.cos(ARC.a0 - 0.08) * (ARC.r0 + 0.65), UNIT, ARC.cz + Math.sin(ARC.a0 - 0.08) * (ARC.r0 + 0.65))));
    const newest = plinths[plinths.length - 1], oldest = plinths[0];
    if (newest) put(L.newest, project(new T.Vector3(newest.x, 0, newest.z + 0.55)));
    if (oldest) put(L.oldest, project(new T.Vector3(oldest.x + 0.5, 0, oldest.z - 0.4)));
    const best = plinths.find((p) => p.best && !p.latest);
    if (best) put(L.best, project(new T.Vector3(best.x, best.h * best.cur + 0.25, best.z)), 0, -34);
    if (!L.pencil.hidden) {
      if (S.pencilAt === "latest") { const lp = plinths[plinths.length - 1]; if (lp) put(L.pencil, project(new T.Vector3(lp.x, lp.h * lp.cur * 0.6, lp.z))); }
      else { const q = project(orb.getWorldPosition(new T.Vector3())); L.pencil.style.transform = `translate(${Math.round(q.x)}px, ${Math.round(q.y)}px)`; }
    }
    if (S.hover && !S.drag?.moved) {
      const p = S.hover;
      const q = project(new T.Vector3(p.x, p.h + 0.4, p.z));
      put(L.tip, q);
    }
  }

  /* ---------- pointer: hover lifts, click opens, drag pushes */
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  const ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(plinths.map((p) => p.mesh), false)[0];
    return hit ? plinths[hit.object.userData.i] : null;
  }
  function groundAt(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(ground, new T.Vector3());
  }
  function setHover(p) {
    if (S.hover === p) return;
    S.hover = p;
    canvas.style.cursor = p ? "grab" : "";
    if (p) {
      const d = S.desk;
      L.tip.innerHTML = `<b>${esc(p.w.title)}</b><span>${p.w.multiple != null ? `${p.w.multiple.toFixed(2)}× your typical` : "too new to rate"}${p.latest ? ", your latest" : p.best ? ", your best" : ""}</span>`;
      L.tip.hidden = false;
    } else L.tip.hidden = true;
    onHover(p?.w ?? null);
    kick();
  }
  canvas.addEventListener("pointermove", (e) => {
    if (S.drag) {
      const g = groundAt(e);
      if (!g) return;
      const p = S.drag.p;
      if (!S.drag.moved && Math.hypot(e.clientX - S.drag.sx, e.clientY - S.drag.sy) > 6) { S.drag.moved = true; L.tip.hidden = true; canvas.style.cursor = "grabbing"; }
      if (S.drag.moved) {
        const nx = g.x - S.drag.ox, nz = g.z - S.drag.oz;
        p.vx = (nx - p.x) * 0.6; p.vz = (nz - p.z) * 0.6;
        p.x = nx; p.z = nz; keepOn(p);
        kick();
      }
      return;
    }
    if (e.pointerType === "mouse") setHover(pick(e));
  });
  canvas.addEventListener("pointerdown", (e) => {
    const p = pick(e);
    if (!p) return;
    const g = groundAt(e);
    S.drag = { p, sx: e.clientX, sy: e.clientY, moved: false, ox: g ? g.x - p.x : 0, oz: g ? g.z - p.z : 0 };
    canvas.setPointerCapture(e.pointerId);
    setHover(p);
  });
  const end = (e) => {
    if (!S.drag) return;
    const { p, moved } = S.drag;
    S.drag = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    canvas.style.cursor = "grab";
    if (!moved) { S.sel = p.w.id; onOpen(p.w); }
    if (e.pointerType !== "mouse") setHover(null);
    kick();
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", () => { if (!S.drag) setHover(null); });

  return {
    mode: "3d", build, resize, frame,
    select(id) { S.sel = id; kick(); },
    tidy() { for (const p of plinths) { p.x = p.home.x; p.z = p.home.z; p.vx = p.vz = 0; } kick(); },
  };
}

/* ================================================================ the flat fallback */
function make2D(canvas, labels, { onOpen }) {
  const ctx = canvas.getContext("2d");
  let desk = null, hit = [];
  const color = (n) => css(n, "#000");
  function draw() {
    const host = canvas.parentElement;
    const w = host.clientWidth, h = host.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!desk?.rated) return;
    const x0 = w * 0.45, y0 = h * 0.35, size = Math.min(w * 0.22, h * 0.45), p = size / 10;
    // the hundred
    for (let rank = 1; rank <= 100; rank++) {
      const i = rank - 1, cx = x0 + (i % 10 + 0.5) * p, cy = y0 + (9 - Math.floor(i / 10) + 0.5) * p;
      ctx.beginPath(); ctx.arc(cx, cy, p * 0.36, 0, TAU);
      ctx.fillStyle = rank === desk.reachScore ? color("--ember") : rank < desk.reachScore ? color("--cobalt") : color("--straw");
      ctx.fill(); ctx.strokeStyle = color("--ink"); ctx.lineWidth = 1; ctx.stroke();
    }
    // the uploads, oldest first
    const works = [...desk.works].reverse(), bw = Math.min(14, (w * 0.4) / works.length);
    const bx = x0 + size + 40, by = y0 + size, unit = size * 0.3;
    hit = [];
    works.forEach((wk, i) => {
      const hh = Math.max(3, Math.min(3.6, wk.multiple ?? 0) * unit);
      ctx.fillStyle = (wk.multiple ?? 0) >= 2 ? color("--straw") : (wk.multiple ?? 0) >= 1 ? color("--cobalt") : color("--chalk");
      ctx.fillRect(bx + i * bw, by - hh, bw - 3, hh);
      ctx.strokeRect(bx + i * bw + 0.5, by - hh + 0.5, bw - 4, hh - 1);
      hit.push({ x: bx + i * bw, y: by - hh, w: bw - 3, h: hh, wk });
    });
    ctx.strokeStyle = color("--cobalt"); ctx.beginPath(); ctx.moveTo(bx - 6, by - unit); ctx.lineTo(bx + works.length * bw + 6, by - unit); ctx.stroke();
  }
  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const f = hit.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (f) onOpen(f.wk);
  });
  return { mode: "2d", build(d) { desk = d; draw(); }, resize: draw, frame: draw };
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
