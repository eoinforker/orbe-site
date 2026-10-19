/*
  The Hundred, drawn. One tray, 100 orbs in rank order (each filled to its own
  place), and your orb, which drops, rolls past the ones it beats and rests at
  its rank. three.js draws it with a still orthographic camera; when WebGL is
  missing the same scene is drawn with the 2D canvas from the same numbers.

  Nothing here loops: the frame loop runs only while something is moving and
  stops itself when the orb is at rest and every spring has settled.
*/
import { layout, solve, ground, valleyX, start, HZ } from "./sim.js";

const TAU = Math.PI * 2;
/* The clock the drop plays against. A recorder can swap in its own (window.orbeClock) to step frames. */
const clock = () => (typeof window.orbeClock === "function" ? window.orbeClock() : performance.now());

/* The disc area below a level line equals the score: invert (t - sin t) / 2pi. */
const LEVELS = new Float32Array(1001);
for (let n = 0; n <= 1000; n++) {
  const f = n / 1000;
  let lo = -1, hi = 1;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2, th = 2 * Math.acos(-m);
    if ((th - Math.sin(th)) / TAU < f) lo = m; else hi = m;
  }
  LEVELS[n] = (lo + hi) / 2;
}
export const levelFor = (f) => LEVELS[Math.round(Math.max(0, Math.min(1, f)) * 1000)];

const hex = (c) => { const s = c.trim().replace("#", ""); const v = parseInt(s.length === 3 ? [...s].map((x) => x + x).join("") : s, 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; };
const css = (el, name, fb) => getComputedStyle(el).getPropertyValue(name).trim() || fb;

export function palette(el) {
  return {
    body: css(el, "--tray-body", "#FBFAF6"),
    ahead: css(el, "--tray-ahead", "#9EE9FB"),
    beaten: css(el, "--tray-beaten", "#1F4BFF"),
    you: css(el, "--tray-you", "#FF5A1F"),
    ink: css(el, "--tray-ink", "#141311"),
    bed: css(el, "--tray-bed", "#F3F0E8"),
    lip: css(el, "--tray-lip", "#E7E2D7"),
    shadow: css(el, "--tray-shadow", "#D9D4C8"),
  };
}

/* ------------------------------------------------------------------ the shared scene state */
export function createTray(canvas, { onSettle = () => {}, onPass = () => {}, onImpact = () => {}, onFrame = () => {}, force2d = false } = {}) {
  const host = canvas.parentElement;
  const S = {
    L: null, W: 0, H: 0, rowY: 0, D: 0, thick: 0,
    k: 0, youFill: 0.93, path: null, t0: 0, playing: false, settled: false,
    x: 0, h: 0, vx: 0, tilt: 0, tiltV: 0, lift: 0,
    beat: new Float32Array(100), beatTo: new Uint8Array(100),
    dip: new Float32Array(100), dipV: new Float32Array(100),
    passAt: new Int32Array(100), lastIdx: 0, impactSeen: 0,
    raf: 0, pal: palette(host), visible: false,
    gapK: 0, open: 0,
    /* where orb i is drawn: the orbs ahead stand back by the gap as your orb arrives */
    rx(i) { const L = this.L; return L.x0 + (i + 0.5) * L.p + (this.gapK > 0 && i >= this.gapK ? L.p * 0.7 * this.open : 0); },
  };
  let gl = null;
  if (!force2d) { try { gl = makeGL(canvas, S); } catch (e) { gl = null; } }
  const ctx = gl ? null : canvas.getContext("2d");
  const draw = gl ? () => gl.draw() : () => draw2d(ctx, canvas, S);

  function size() {
    const W = Math.round(host.clientWidth);
    const L = layout(W, { k: S.k });
    const D = L.R * 0.95, thick = L.phone ? 5 : 7;
    const H = Math.round(L.phone ? 136 : 210);
    const rowY = H - (L.bed * L.cos + D * L.sin + thick * L.cos) - 1;
    Object.assign(S, { L, W, H, D, thick, rowY });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    if (gl) gl.resize(W, H, dpr);
    else { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  }

  /* where things are on screen, for the labels the page lays over the canvas */
  const geo = () => {
    const { L, rowY } = S;
    const restH = ground(L, valleyX(L, S.k))[0];
    return {
      W: S.W, H: S.H, rowY, p: L.p, r: L.r, R: L.R, x0: L.x0,
      xi: (i) => L.xi(i), vx: (k) => valleyX(L, k),
      youX: valleyX(L, S.k), youTop: rowY - restH * L.cos - L.R,
      rowBottom: rowY + L.r * L.cos, bedBottom: S.H,
    };
  };

  function settleNow() {
    const { L } = S;
    S.playing = false; S.settled = true; S.path = null; S.lift = 0;
    S.gapK = S.k; S.open = 1;
    if (S.nextFill != null) { S.youFill = S.nextFill; S.nextFill = null; }
    S.x = valleyX(L, S.k); S.h = ground(L, S.x)[0]; S.vx = 0; S.tilt = 0; S.tiltV = 0;
    for (let i = 0; i < 100; i++) { S.beatTo[i] = i < S.k ? 1 : 0; S.beat[i] = S.beatTo[i]; S.dip[i] = 0; S.dipV[i] = 0; }
    draw();
  }

  /* one step of the springs and the slosh, from the orb's motion this frame */
  function physics(dt, ax, contact, impact) {
    const { L } = S;
    // the fill behaves like a liquid: its surface leans against the acceleration
    const target = contact ? Math.max(-0.34, Math.min(0.34, Math.atan2(-ax, L.G))) : S.tilt * 0.98;
    const w = 15, z = 0.2;
    S.tiltV += (-(w * w) * (S.tilt - target) - 2 * z * w * S.tiltV) * dt;
    S.tilt += S.tiltV * dt;
    // the row gives a little under the orb, and rings back when it rolls on
    const Sr = L.R + L.r, A = L.r * 0.32, kk = 1100, c = 2 * 0.32 * Math.sqrt(kk);
    let busy = Math.abs(S.tilt) > 0.002 || Math.abs(S.tiltV) > 0.01;
    for (let i = 0; i < 100; i++) {
      const dx = Math.abs(S.x - S.rx(i));
      let rest = 0;
      if (contact && dx < Sr && S.lift === 0) rest = A * Math.pow(1 - dx / Sr, 2) * 2.2;
      if (impact && dx < Sr) S.dipV[i] += impact * Math.pow(1 - dx / Sr, 1.5);
      S.dipV[i] += (-kk * (S.dip[i] - rest) - c * S.dipV[i]) * dt;
      S.dip[i] += S.dipV[i] * dt;
      if (S.beat[i] !== S.beatTo[i]) { S.beat[i] += Math.sign(S.beatTo[i] - S.beat[i]) * dt / 0.14; S.beat[i] = Math.max(0, Math.min(1, S.beat[i])); if (Math.abs(S.beat[i] - S.beatTo[i]) < 0.02) S.beat[i] = S.beatTo[i]; busy = true; }
      if (Math.abs(S.dip[i]) > 0.01 || Math.abs(S.dipV[i]) > 0.1) busy = true;
    }
    return busy;
  }

  let last = 0;
  function frame() {
    const now = clock();
    S.raf = 0;
    const dt = Math.max(0, Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60));
    last = now;
    let busy = false, ax = 0, contact = false, impact = 0;
    if (S.lift > 0) {
      // the previous orb leaves straight up before the next one drops
      const u = Math.min(1, (now - S.liftAt) / 220);
      S.h = S.liftFrom + (S.H + S.L.R * 2) / S.L.cos * u * u;
      busy = true;
      if (u >= 1) { S.lift = 0; S.t0 = now; S.playing = true; S.lastIdx = 0; S.impactSeen = 0; for (let i = 0; i < 100; i++) S.beatTo[i] = 0; const s0 = start(S.L, S.rowY); S.x = s0.x; S.h = s0.h0; if (S.nextFill != null) { S.youFill = S.nextFill; S.nextFill = null; } }
    } else if (S.playing) {
      const f = S.path.frames;
      const t = (now - S.t0) / 1000;
      const idx = Math.max(0, Math.min(f.length - 1, t * HZ));
      const a = f[Math.floor(idx)], b = f[Math.min(f.length - 1, Math.floor(idx) + 1)], u = idx - Math.floor(idx);
      S.x = a.x + (b.x - a.x) * u; S.h = a.h + (b.h - a.h) * u;
      const i0 = Math.max(1, Math.floor(idx));
      const fA = f[i0 - 1], fB = f[i0];
      ax = (fB.vx - fA.vx) * HZ; S.vx = fB.vx;
      contact = !!fB.c;
      // impacts and passes since the last frame
      for (let j = S.lastIdx + 1; j <= Math.floor(idx); j++) {
        if (f[j].h < f[j - 1].h && j + 1 < f.length && f[j + 1].h > f[j].h && !f[j].c && j > S.impactSeen + 8) {
          const vy = (f[j].h - f[j - 1].h) * HZ;
          if (vy < -60) { impact += -vy * 0.012 * (S.L.r / 5); S.impactSeen = j; onImpact(Math.min(1, -vy / 2600)); }
        }
      }
      if (S.lastIdx === 0 && idx > 0) { /* first frame */ }
      for (let i = 0; i < S.k; i++) if (!S.beatTo[i] && S.x >= S.rx(i)) { S.beatTo[i] = 1; onPass(i, Math.abs(S.vx)); }
      S.lastIdx = Math.floor(idx);
      contact = contact || (S.h - ground(S.L, S.x)[0] < 0.6);
      busy = true;
      if (idx >= f.length - 1) { S.playing = false; S.settled = true; S.x = valleyX(S.L, S.k); onSettle(); }
    }
    // the gap: closes while the old orb lifts out, opens as the new one comes near
    if (S.lift > 0) { S.open = Math.max(0, S.open - dt / 0.2); busy = true; }
    else if (S.playing) {
      if (S.gapK !== S.k) { S.gapK = S.k; S.open = 0; }
      const near = (valleyX(S.L, S.k) - S.x) / (S.L.p * 14);
      const want = Math.max(0, Math.min(1, 1 - near));
      S.open = Math.max(S.open, want * want * (3 - 2 * want));
    }
    const springs = physics(dt, ax, contact || S.settled, impact);
    draw();
    onFrame(S);
    if (busy || springs) S.raf = requestAnimationFrame(frame);
    else last = 0;
  }
  const kick = () => { if (!S.raf) { last = 0; S.raf = requestAnimationFrame(frame); } };

  return {
    gl: !!gl,
    state: S,
    geo,
    resize() { size(); settleNow(); },
    /** Set the rank. animate: drop (or re-drop) the orb; otherwise draw it at rest. */
    set({ k, fill }, { animate = true } = {}) {
      S.k = Math.max(1, Math.min(99, k));
      S.youFill = fill;
      size();
      if (gl) gl.colors();
      S.prev = true;
      const path = animate ? solve(S.L, S.k, S.rowY) : null;
      if (!path) { settleNow(); if (animate) onSettle(); return false; }
      const s0 = start(S.L, S.rowY);
      S.path = path; S.settled = false; S.lift = 0;
      S.x = s0.x; S.h = s0.h0; S.t0 = clock(); S.playing = true; S.lastIdx = 0; S.impactSeen = 0;
      for (let i = 0; i < 100; i++) S.beatTo[i] = 0;
      kick();
      return true;
    },
    redrop({ k, fill }) {
      S.k = Math.max(1, Math.min(99, k)); S.nextFill = fill;
      S.L = layout(S.W, { k: S.k });
      const path = solve(S.L, S.k, S.rowY);
      if (!path) { settleNow(); onSettle(); return false; }
      S.path = path; S.settled = false; S.playing = false;
      S.liftAt = clock(); S.liftFrom = S.h; S.lift = 1;
      kick();
      return true;
    },
    /** Solve a rank ahead of time, so a later drop starts without work on the click. */
    prepare(k) { if (!S.L) size(); solve(layout(S.W, { k }), Math.max(1, Math.min(99, k)), S.rowY); },
    recolor() { S.pal = palette(host); if (gl) gl.colors(); draw(); },
    size,
    draw,
  };
}

/* ------------------------------------------------------------------ 2D fallback */
function draw2d(ctx, canvas, S) {
  const { L, W, H, rowY, D, thick, pal } = S;
  if (!L) return;
  ctx.clearRect(0, 0, W, H);
  const Y = (h, z = 0) => rowY - h * L.cos + z * L.sin;
  // bed: top, then the front lip
  const bx0 = 0.5, bx1 = W - 0.5;
  const top = Y(-L.bed, -D), front = Y(-L.bed, D);
  ctx.fillStyle = pal.bed; ctx.fillRect(bx0, top, bx1 - bx0, front - top);
  ctx.fillStyle = pal.lip; ctx.fillRect(bx0, front, bx1 - bx0, thick * L.cos);
  // the orb's shadow on the bed, behind the row (light from the front and above)
  const g = S.h - (L.R - L.bed);
  const sh = Math.max(0, 1 - g / (S.H * 1.2));
  if (S.x && sh > 0) {
    ctx.fillStyle = pal.shadow;
    ctx.beginPath();
    ctx.ellipse(S.x, Y(-L.bed, -D * 0.55), L.R * (0.55 + 0.45 * sh), L.R * L.sin * 0.55 * (0.5 + 0.5 * sh), 0, 0, TAU);
    ctx.fill();
  }
  // the row
  for (let i = 0; i < 100; i++) {
    const fill = (i + 1) / 100;
    disc(ctx, S.rx(i), Y(-S.dip[i]), L.r, levelFor(fill), 0, mixHex(pal.ahead, pal.beaten, S.beat[i]), pal, Math.min(1, L.r * 0.28), false);
  }
  // your orb
  if (S.x) disc(ctx, S.x, Y(S.h), L.R, levelFor(S.youFill), S.tilt, pal.you, pal, 1.5, true);
}

function disc(ctx, x, y, r, level, tilt, fillCol, pal, rim, line) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = pal.body; ctx.fill();
  ctx.clip();
  ctx.translate(x, y); ctx.rotate(tilt);
  ctx.fillStyle = fillCol;
  ctx.fillRect(-r * 1.6, -level * r, r * 3.2, r * 2.4);
  if (line) { ctx.fillStyle = pal.ink; ctx.fillRect(-r * 1.6, -level * r - 0.5, r * 3.2, 1); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r - rim / 2, 0, TAU); ctx.lineWidth = rim; ctx.strokeStyle = pal.ink; ctx.stroke();
}

function mixHex(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const A = hex(a), B = hex(b);
  return "rgb(" + A.map((v, i) => Math.round((v + (B[i] - v) * t) * 255)).join(",") + ")";
}

/* ------------------------------------------------------------------ three.js */
let THREE = null;
export async function loadThree() {
  if (THREE) return THREE;
  THREE = await import("../assets/vendor/three-0.160.0.module.min.js");
  return THREE;
}
export const threeReady = () => !!THREE;

const VERT = `
attribute float aLevel;
attribute float aBeat;
varying vec3 vN;
varying vec3 vP;
varying float vLevel;
varying float vBeat;
varying float vRad;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vRad = length((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vP = wp.xyz - c.xyz;
  vN = normalize(position);
  vLevel = aLevel;
  vBeat = aBeat;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = `
uniform vec3 uBody;
uniform vec3 uFillA;
uniform vec3 uFillB;
uniform vec3 uInk;
uniform vec3 uView;
uniform vec3 uLight;
uniform float uTilt;
uniform float uRim;
uniform float uLine;
varying vec3 vN;
varying vec3 vP;
varying float vLevel;
varying float vBeat;
varying float vRad;
void main() {
  vec3 n = normalize(vN);
  float ndv = clamp(dot(n, uView), 0.0, 1.0);
  float fromEdge = vRad * (1.0 - sqrt(max(0.0, 1.0 - ndv * ndv)));
  vec2 tn = vec2(sin(uTilt), cos(uTilt));
  float yl = dot(vP.xy, tn) / vRad;
  float lw = fwidth(yl);
  float below = 1.0 - smoothstep(vLevel - lw * 0.6, vLevel + lw * 0.6, yl);
  vec3 col = mix(uBody, mix(uFillA, uFillB, vBeat), below);
  float lit = dot(n, uLight);
  col = mix(col, col * 0.9, 1.0 - smoothstep(-0.32, -0.26, lit));
  if (uLine > 0.0) {
    float d = abs(yl - vLevel) / max(lw, 1e-4);
    col = mix(uInk, col, smoothstep(uLine * 0.5, uLine * 0.5 + 1.0, d));
  }
  float a = smoothstep(uRim - 0.6, uRim + 0.6, fromEdge);
  col = mix(uInk, col, a);
  gl_FragColor = vec4(col, 1.0);
}`;

function makeGL(canvas, S) {
  if (!THREE) throw new Error("three not loaded");
  const T = THREE;
  T.ColorManagement.enabled = false;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  if (!renderer.getContext()) throw new Error("no webgl");
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.LinearSRGBColorSpace;
  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
  const geoS = new T.SphereGeometry(1, 40, 28);
  const geoBig = new T.SphereGeometry(1, 72, 48);
  const mat = (line) => new T.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uBody: { value: new T.Color() }, uFillA: { value: new T.Color() }, uFillB: { value: new T.Color() }, uInk: { value: new T.Color() }, uView: { value: new T.Vector3() }, uLight: { value: new T.Vector3(-0.35, 0.75, 0.56).normalize() }, uTilt: { value: 0 }, uRim: { value: 1 }, uLine: { value: line ? 1 : 0 } },
  });
  const rowMat = mat(false), youMat = mat(true);
  const row = new T.InstancedMesh(geoS, rowMat, 100);
  const aLevel = new T.InstancedBufferAttribute(new Float32Array(100), 1);
  const aBeat = new T.InstancedBufferAttribute(new Float32Array(100), 1);
  geoS.setAttribute("aLevel", aLevel); geoS.setAttribute("aBeat", aBeat);
  const you = new T.InstancedMesh(geoBig, youMat, 1);
  const yLevel = new T.InstancedBufferAttribute(new Float32Array(1), 1);
  geoBig.setAttribute("aLevel", yLevel); geoBig.setAttribute("aBeat", new T.InstancedBufferAttribute(new Float32Array([0]), 1));
  const bedMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const lipMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const shMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const bed = new T.Mesh(new T.PlaneGeometry(1, 1), bedMat); bed.rotation.x = -Math.PI / 2;
  const lip = new T.Mesh(new T.PlaneGeometry(1, 1), lipMat);
  const shadow = new T.Mesh(new T.CircleGeometry(1, 48), shMat); shadow.rotation.x = -Math.PI / 2;
  row.frustumCulled = false; you.frustumCulled = false; shadow.frustumCulled = false;
  scene.add(bed, lip, shadow, row, you);
  const m4 = new T.Matrix4();
  let built = false;

  const toLin = (c) => new T.Color(c);
  return {
    resize(W, H, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      const { L, rowY, D, thick } = S;
      cam.left = -W / 2; cam.right = W / 2; cam.top = rowY; cam.bottom = -(H - rowY);
      const d = 1000;
      cam.position.set(W / 2, d * L.sin, d * L.cos);
      cam.up.set(0, L.cos, -L.sin);
      cam.lookAt(W / 2, 0, 0);
      cam.updateProjectionMatrix();
      rowMat.uniforms.uView.value.set(0, L.sin, L.cos);
      youMat.uniforms.uView.value.set(0, L.sin, L.cos);
      rowMat.uniforms.uRim.value = Math.min(1, L.r * 0.28);
      youMat.uniforms.uRim.value = 1.5;
      bed.scale.set(W - 1, 2 * D, 1); bed.position.set(W / 2, -L.bed, 0);
      lip.scale.set(W - 1, thick, 1); lip.position.set(W / 2, -L.bed - thick / 2, D);
      for (let i = 0; i < 100; i++) aLevel.array[i] = levelFor((i + 1) / 100);
      aLevel.needsUpdate = true;
      built = true;
    },
    colors() {
      const p = S.pal;
      for (const m of [rowMat, youMat]) { m.uniforms.uBody.value = toLin(p.body); m.uniforms.uInk.value = toLin(p.ink); }
      rowMat.uniforms.uFillA.value = toLin(p.ahead); rowMat.uniforms.uFillB.value = toLin(p.beaten);
      youMat.uniforms.uFillA.value = toLin(p.you); youMat.uniforms.uFillB.value = toLin(p.you);
      bedMat.color = toLin(p.bed); lipMat.color = toLin(p.lip); shMat.color = toLin(p.shadow);
    },
    draw() {
      if (!built) return;
      const { L } = S;
      for (let i = 0; i < 100; i++) {
        m4.makeScale(L.r, L.r, L.r); m4.setPosition(S.rx(i), -S.dip[i], 0);
        row.setMatrixAt(i, m4); aBeat.array[i] = S.beat[i];
      }
      row.instanceMatrix.needsUpdate = true; aBeat.needsUpdate = true;
      you.visible = !!S.x;
      m4.makeScale(L.R, L.R, L.R); m4.setPosition(S.x, S.h, 0);
      you.setMatrixAt(0, m4); you.instanceMatrix.needsUpdate = true;
      yLevel.array[0] = levelFor(S.youFill); yLevel.needsUpdate = true;
      youMat.uniforms.uTilt.value = S.tilt;
      const g = S.h - (L.R - L.bed);
      const sh = Math.max(0, 1 - g / (S.H * 1.2));
      shadow.visible = !!S.x && sh > 0;
      shadow.scale.set(L.R * (0.55 + 0.45 * sh), L.R * 0.55 * (0.5 + 0.5 * sh), 1);
      shadow.position.set(S.x, -L.bed + 0.05, -S.D * 0.55);
      renderer.render(scene, cam);
    },
  };
}
