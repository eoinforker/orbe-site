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
  - impact: the big orb lands across two small ones, so the impact normal is
    straight up; the vertical speed reflects with restitution E, and the first
    impact converts sliding to rolling, so the speed along the row drops to 5/7
    (a solid ball gaining spin from friction);
  - rolling: acceleration along the row is 5/7 of gravity times the slope, minus
    rolling resistance and a little linear damping. The orb is held to the row
    once it has landed, so where it stops rises steadily with the launch speed
    and a bisection finds the speed for any valley;
  - rest: once slow inside a valley it settles on the valley floor.

  The launch speed and the resistance are chosen per drop by bisection, so the
  orb always comes to rest in the right valley in about TARGET seconds. The
  trajectory is computed once at 240 Hz and played back against the clock, so
  every frame of every playback is the same.
*/

export const HZ = 240;
const DT = 1 / HZ;
const SUB = 8;
const E = 0.36;            // restitution on the row
const DAMP = 0.6;          // linear damping, per second, on the rolling speed
const TARGET = 2.05;       // seconds from release to rest
const MAX = 2.45;          // never longer than this

/** Geometry of the tray for a canvas of width W: pitch, orb radii, the drop. */
export function layout(W, { phone = W < 560, k = 0 } = {}) {
  const R = phone ? 17 : Math.round(Math.max(24, Math.min(34, W / 36)));
  const pad = phone ? 6 : 12;
  // the orbs ahead of you stand back a little: a gap at your rank, so you settle into it
  const p = (W - 2 * pad) / 100.7;
  const gap = k > 0 ? 0.7 * p : 0;
  const r = p * (phone ? 0.46 : 0.43);
  const x0 = pad;
  const bed = r;                       // bed top sits r below the row's centre line
  const phi = (phone ? 16 : 18) * Math.PI / 180;
  return { W, phone, R, r, p, x0, pad, bed, phi, k, gap, cos: Math.cos(phi), sin: Math.sin(phi), G: 490 * R, xi: (i) => x0 + (i + 0.5) * p + (k > 0 && i >= k ? gap : 0) };
}

/** Height of the rolling orb's centre over x, and the slope there. */
export function ground(L, x) {
  const S = L.R + L.r;
  const j = (x - L.x0) / L.p - 0.5 - (L.k > 0 && x > valleyX(L, L.k) ? L.gap / L.p : 0);
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
export const valleyX = (L, k) => (L.xi(k - 1) + L.xi(k)) / 2;
/** The valley nearest x. */
export const valleyAt = (L, x) => Math.round((x - L.x0 - (L.k > 0 && x > valleyX(L, L.k) ? L.gap : 0)) / L.p);

/**
  Run one drop. Returns the frames (x, h, vx, contact) at 240 Hz, the valley it
  rests in and when it stopped.
*/
export function run(L, { v0, mu, x: xs, h0, keep = false }) {
  const G = L.G;
  let x = xs, h = h0, vx = v0, vy = 0, onGround = false, rolling = false, t = 0;
  const lo = L.x0 + 0.2 * L.p, hi = L.xi(99) + 0.3 * L.p;
  const frames = keep ? [] : null;
  let stopped = -1, landed = -1, quiet = 0;
  for (let n = 0; n < HZ * 3.2; n++) {
    t = n * DT;
    if (onGround) {
      // sub-steps, so each small orb's bump is integrated finely at any speed
      for (let q = 0; q < SUB; q++) {
        const s = ground(L, x)[1];
        // rolling resistance opposes motion only, so an orb can never balance on a crest
        const a = -(5 / 7) * G * s / (1 + s * s) - Math.sign(vx) * Math.min(1, Math.abs(vx) / 4) * mu * G - DAMP * vx;
        vx += a * DT / SUB;
        x += vx * DT / SUB;
      }
      h = ground(L, x)[0];
      if (onGround) {
        const k = valleyAt(L, x);
        const vxAbs = Math.abs(vx);
        if (vxAbs < 24 && Math.abs(x - valleyX(L, k)) < 1.2) quiet++; else quiet = 0;
        if (quiet > 3) { x = valleyX(L, k); h = ground(L, x)[0]; vx = 0; stopped = t; }
      }
    } else {
      vy -= G * DT;
      x += vx * DT;
      h += vy * DT;
      const [g] = ground(L, x);
      if (h <= g) {
        h = g;
        if (landed < 0) landed = t;
        // a big orb lands across two small ones at once, so the impact normal is
        // the row's, straight up, not the slope of one small orb
        if (vy < 0) {
          if (!rolling) { vx *= 5 / 7; rolling = true; }
          if (-vy > 0.11 * Math.sqrt(G * L.R)) vy = -E * vy; else { vy = 0; onGround = true; }
        }
      }
    }
    if (x < lo) { x = lo; vx = Math.abs(vx) * 0.3; }
    if (x > hi) { x = hi; vx = -Math.abs(vx) * 0.3; }
    if (keep) frames.push({ x, h, vx, c: onGround ? 1 : 0 });
    if (stopped >= 0) break;
  }
  return { frames, rest: stopped >= 0 ? valleyAt(L, x) : -1, stop: stopped, landed };
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
  const restAt = (v0, mu) => run(L, { v0, mu, ...s0 });
  /* the lowest launch speed that rests at valley j or beyond: rest is monotonic in speed */
  const lowest = (j, mu) => {
    let lo = 1, hi = (4 * d) / TARGET + 300;
    for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; const r = restAt(m, mu).rest; if (r >= j || r < 0) hi = m; else lo = m; }
    return hi;
  };
  let best = null;
  const consider = (v0, mu) => {
    const res = restAt(v0, mu);
    if (res.rest !== k || res.stop > MAX || res.stop < 1.3) return;
    if (!best || Math.abs(res.stop - TARGET) < Math.abs(best.stop - TARGET)) best = { v0, mu, ...res };
  };
  for (const m of [1, 1.25, 0.8, 1.55, 0.65, 1.9, 0.5, 2.4]) {
    const mu = mu0 * m;
    const e1 = lowest(k - 4, mu), e2 = lowest(k + 4, mu);
    const a0 = Math.min(e1, e2), b0 = Math.max(e1, e2) * 1.01;
    // scan the window around the valley finely: nearly monotonic, so the hits are in here
    for (let n = 0; n <= 64; n++) consider(a0 + (b0 - a0) * n / 64, mu);
    if (best && Math.abs(best.stop - TARGET) < 0.15) break;
  }
  if (!best) { CACHE.set(key, null); return null; }
  const out = { ...run(L, { v0: best.v0, mu: best.mu, ...s0, keep: true }), v0: best.v0, mu: best.mu, k };
  CACHE.set(key, out);
  return out;
}
