/*
  The Hundred: a small, deterministic solver for one orb rolling along a row of
  100 fixed orbs. Units are CSS pixels and seconds, with height measured up from
  the centre line of the row.

  The rolling orb rides the envelope of the row: over orb i its centre can sit no
  lower than sqrt((R + r)^2 - (x - x_i)^2). Between two orbs that envelope has a
  cusp, so the rolling orb drops into a shallow valley at every boundary. The
  valley between orb k - 1 and orb k is "beats k".

  Physics, in order:
  - falling: gravity only; the orb leaves the top of the frame with the speed
    it will roll at;
  - impact: the normal part of the velocity reflects with restitution E; the
    first impact also converts sliding to rolling, so the speed along the row
    drops to 5/7 (a solid ball gaining spin from friction);
  - rolling: acceleration along the row is 5/7 of gravity times the slope, minus
    rolling resistance and a little linear damping. Over a crest the orb leaves
    the surface whenever gravity cannot hold it to the curve, so a fast orb
    skips across the tops and a slow one rolls;
  - rest: once slow inside a valley it settles on the valley floor.

  The launch speed and the resistance are chosen per drop by searching, so the
  orb always comes to rest in the right valley in about TARGET seconds. The
  trajectory is computed once at 240 Hz and played back against the clock, so
  every frame of every playback is the same.
*/

export const HZ = 240;
const DT = 1 / HZ;
const E = 0.36;            // restitution on the row
const DAMP = 0.6;          // linear damping, per second, on the rolling speed
const TARGET = 2.05;       // seconds from release to rest
const MAX = 2.45;          // never longer than this

/** Geometry of the tray for a canvas of width W: pitch, orb radii, the drop. */
export function layout(W, { phone = W < 560 } = {}) {
  const R = phone ? 17 : Math.round(Math.max(24, Math.min(34, W / 36)));
  const pad = phone ? 6 : 12;
  const p = (W - 2 * pad) / 100;
  const r = p * (phone ? 0.46 : 0.43);
  const x0 = pad;
  const bed = r;                       // bed top sits r below the row's centre line
  const phi = (phone ? 16 : 18) * Math.PI / 180;
  return { W, phone, R, r, p, x0, pad, bed, phi, cos: Math.cos(phi), sin: Math.sin(phi), G: 490 * R, xi: (i) => x0 + (i + 0.5) * p };
}

/** Height of the rolling orb's centre over x, and the slope there. */
export function ground(L, x) {
  const S = L.R + L.r;
  const j = (x - L.x0) / L.p - 0.5;
  let best = L.R - L.bed, slope = 0;            // resting on the bed beyond the row
  for (let i = Math.floor(j) - 4; i <= Math.ceil(j) + 4; i++) {
    if (i < 0 || i > 99) continue;
    const dx = x - L.xi(i);
    if (Math.abs(dx) >= S) continue;
    const h = Math.sqrt(S * S - dx * dx);
    if (h > best) { best = h; slope = -dx / h; }
  }
  return [best, slope];
}

/** Valley k sits at the boundary between orb k - 1 and orb k. */
export const valleyX = (L, k) => L.x0 + k * L.p;

/**
  Run one drop. Returns the frames (x, h, vx, contact) at 240 Hz, the valley it
  rests in and when it stopped.
*/
export function run(L, { v0, mu, x: xs, h0, keep = false }) {
  const G = L.G;
  let x = xs, h = h0, vx = v0, vy = 0, onGround = false, rolling = false, t = 0;
  const lo = L.x0 + 0.2 * L.p, hi = L.x0 + 99.8 * L.p;
  const frames = keep ? [] : null;
  let stopped = -1, landed = -1, quiet = 0;
  for (let n = 0; n < HZ * 3.2; n++) {
    t = n * DT;
    if (onGround) {
      let [g, s] = ground(L, x);
      const a = -(5 / 7) * G * s / (1 + s * s) - Math.sign(vx) * mu * G - DAMP * vx;
      vx += a * DT;
      x += vx * DT;
      [g, s] = ground(L, x);
      // over a crest, gravity must supply v^2 / radius to keep the orb on the curve
      const S = L.R + L.r;
      const vt2 = vx * vx * (1 + s * s);
      if (vt2 / S > G / Math.sqrt(1 + s * s) && Math.abs(s) < 0.35) { onGround = false; vy = vx * s; h = g + 0.01; }
      else h = g;
      if (onGround) {
        const k = Math.round((x - L.x0) / L.p);
        const vxAbs = Math.abs(vx);
        if (vxAbs < 6 && Math.abs(x - valleyX(L, k)) < 0.6) quiet++; else quiet = 0;
        if (quiet > 6) { x = valleyX(L, k); h = ground(L, x)[0]; vx = 0; stopped = t; }
      }
    } else {
      vy -= G * DT;
      x += vx * DT;
      h += vy * DT;
      const [g, s] = ground(L, x);
      if (h <= g) {
        h = g;
        if (landed < 0) landed = t;
        const nl = Math.hypot(s, 1), nx = -s / nl, ny = 1 / nl;
        let vn = vx * nx + vy * ny;
        if (vn < 0) {
          let tx = ny, ty = -nx;                 // tangent along the row
          let vt = vx * tx + vy * ty;
          if (!rolling) { vt *= 5 / 7; rolling = true; }
          if (-vn > 0.11 * Math.sqrt(G * L.R)) vn = -E * vn; else { vn = 0; onGround = true; }
          vx = vt * tx + vn * nx;
          vy = vt * ty + vn * ny;
          if (onGround) vx = vt * tx;
        }
      }
    }
    if (x < lo) { x = lo; vx = Math.abs(vx) * 0.3; }
    if (x > hi) { x = hi; vx = -Math.abs(vx) * 0.3; }
    if (keep) frames.push({ x, h, vx, c: onGround ? 1 : 0 });
    if (stopped >= 0) break;
  }
  return { frames, rest: stopped >= 0 ? Math.round((x - L.x0) / L.p) : -1, stop: stopped, landed };
}

/** Where the orb is released: above the frame, over the first few orbs. */
export function start(L, rowY) {
  return { x: L.x0 + 1.6 * L.p + L.R * 0.3, h0: (rowY + L.R + 8) / L.cos };
}

/**
  Find a launch speed and resistance that rest the orb in valley k, close to
  TARGET seconds. Deterministic: same inputs, same path.
*/
const CACHE = new Map();
export function solve(L, k, rowY) {
  const key = [L.W, k, Math.round(rowY)].join(",");
  if (CACHE.has(key)) return CACHE.get(key);
  const s0 = start(L, rowY);
  const d = valleyX(L, k) - s0.x;
  const mu0 = Math.max(0.004, (2 * d) / (TARGET * TARGET) / L.G * 0.8);
  // resistances to try, nearest the estimate first
  const mus = [1, 0.85, 1.18, 0.72, 1.4, 0.6, 1.65, 0.5, 2, 0.4].map((m) => mu0 * m);
  let best = null;
  for (const mu of mus) {
    const guess = (2 * d) / TARGET * 1.25;
    for (let step = 0; step < 300; step++) {
      const off = (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 0.004;
      const v0 = guess * (1 + off);
      if (v0 <= 0) continue;
      const res = run(L, { v0, mu, ...s0 });
      if (res.rest !== k || res.stop > MAX || res.stop < 1.2) continue;
      if (!best || Math.abs(res.stop - TARGET) < Math.abs(best.stop - TARGET)) best = { v0, mu, ...res };
      if (Math.abs(res.stop - TARGET) < 0.2) break;
    }
    if (best && Math.abs(best.stop - TARGET) < 0.2) break;
  }
  if (!best) { CACHE.set(key, null); return null; }
  const out = { ...run(L, { v0: best.v0, mu: best.mu, ...s0, keep: true }), v0: best.v0, mu: best.mu, k };
  CACHE.set(key, out);
  return out;
}
