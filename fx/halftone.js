/*
  Orbe halftone: gradient cells on canvas, for the explainer illustrations.
  Vanilla ES module, no dependencies. See docs/handoff/ILLUSTRATION-LANGUAGE.md.

  A cell is a square of the page filled with a base colour and a screen of
  round dots. The dots sit on one lattice for the whole canvas (so neighbouring
  cells with the same pitch line up), turned to the screen angle. Dot area
  follows a density that runs from `from` to `to` along the gradient direction,
  so one cell reads as a halftone ramp. At density 1 the dots close into solid ink.

    import { createField, spread, drawOrb } from "./halftone.js";
    const field = createField(canvas, { cols: 10, rows: 10, look: (c, r, p) => state });
    spread(field, { order: [[0, 9], [1, 9], ...], to: 1 });

  A state is { base, ink, pitch, angle, dir, from, to }:
    base   the cell's flat colour under the dots, or null for transparent
    ink    the dot colour
    pitch  dot spacing in CSS pixels (never below 3 device pixels once drawn)
    angle  screen angle of the lattice in degrees (45 is the classic screen)
    dir    direction the density ramps toward, in degrees (0 is left to right)
    from   density at the start of the ramp, 0 to 1
    to     density at the end of the ramp, 0 to 1

  Crispness rules, so nothing blurs or seams at any device pixel ratio:
  cell edges are rounded to whole device pixels from one running total, every
  cell is clipped to its own whole-pixel rectangle, and dots smaller than half
  a device pixel are drawn at half a pixel with their opacity scaled to the
  same tone, so a ramp fades out evenly instead of stopping at a hard line.
*/

const PI_4 = Math.PI / 4;
const MIN_R = 0.5;

/* ---------- small helpers ---------- */

/** Seeded random numbers in [0, 1), so a field reads the same on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (c) => {
  let h = c.replace("#", "");
  if (h.length === 3) h = [...h].map((x) => x + x).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** Mix two hex colours, t from 0 (a) to 1 (b). */
export function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const x = hex(a), y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** The house easing: a quick start that settles softly, close to cubic-bezier(0.2, 0, 0, 1). */
export const settle = (t) => 1 - Math.pow(1 - clamp01(t), 4);

/** Dot radius, as a fraction of the pitch, that covers `d` of the area. Round dots until they touch, then closing to solid. */
function radiusFor(d) {
  if (d <= 0) return 0;
  if (d <= PI_4) return Math.sqrt(d / Math.PI);
  return lerp(0.5, Math.SQRT1_2, (Math.min(1, d) - PI_4) / (1 - PI_4));
}

/* ---------- one cell ---------- */

/**
  Draw one halftone cell into a device-pixel rectangle.
  rect is { x, y, w, h } in device pixels, already whole numbers.
*/
export function drawCell(ctx, rect, s, dpr = 1) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.clearRect(x, y, w, h);
  if (s.base) { ctx.fillStyle = s.base; ctx.fillRect(x, y, w, h); }
  const from = clamp01(s.from ?? 0), to = clamp01(s.to ?? 0);
  if (from >= 0.999 && to >= 0.999) {
    ctx.fillStyle = s.ink; ctx.fillRect(x, y, w, h); ctx.restore(); return;
  }
  if (from <= 0.001 && to <= 0.001) { ctx.restore(); return; }

  const pitch = Math.max(3, (s.pitch ?? 4) * dpr);
  const a = ((s.angle ?? 45) * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const g = ((s.dir ?? 45) * Math.PI) / 180;
  const gx = Math.cos(g), gy = Math.sin(g);

  const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
  const proj = (px, py, ax, ay) => px * ax + py * ay;
  const range = (ax, ay) => {
    const p = corners.map(([px, py]) => proj(px, py, ax, ay));
    return [Math.min(...p), Math.max(...p)];
  };
  const [t0, t1] = range(gx, gy);
  const [i0, i1] = range(ux, uy).map((v) => v / pitch);
  const [j0, j1] = range(vx, vy).map((v) => v / pitch);
  const span = t1 - t0 || 1;
  const ease = s.ease ?? ((t) => t);

  /*
    Dots too small to draw cleanly are not dropped (that leaves a hard edge
    where the ramp crosses the threshold). They are drawn at the smallest clean
    size with their opacity scaled to keep the same tone, in four buckets.
  */
  const faint = [[], [], [], []];
  ctx.fillStyle = s.ink;
  ctx.beginPath();
  for (let i = Math.floor(i0) - 1; i <= Math.ceil(i1) + 1; i++) {
    for (let j = Math.floor(j0) - 1; j <= Math.ceil(j1) + 1; j++) {
      const px = (i * ux + j * vx) * pitch;
      const py = (i * uy + j * vy) * pitch;
      if (px < x - pitch || px > x + w + pitch || py < y - pitch || py > y + h + pitch) continue;
      const t = clamp01((proj(px, py, gx, gy) - t0) / span);
      const r = radiusFor(lerp(from, to, ease(t))) * pitch;
      if (r <= 0) continue;
      if (r < MIN_R) { const k = Math.min(3, Math.floor(((r * r) / (MIN_R * MIN_R)) * 4)); faint[k].push(px, py); continue; }
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  faint.forEach((pts, k) => {
    if (!pts.length) return;
    ctx.globalAlpha = (k + 0.5) / 4;
    ctx.beginPath();
    for (let n = 0; n < pts.length; n += 2) { ctx.moveTo(pts[n] + MIN_R, pts[n + 1]); ctx.arc(pts[n], pts[n + 1], MIN_R, 0, Math.PI * 2); }
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------- a field of cells ---------- */

/**
  A grid of halftone cells on one canvas.
    cols, rows   grid size
    look(c, r, p)  the state of cell (c, r) at progress p (0 to 1)
    cell         CSS pixels per cell; omit to fit the canvas's parent width
    gap          CSS pixels between cells (default 0, as in a pixel field)
  Each cell carries a progress p, which spread() animates.
*/
export function createField(canvas, opts) {
  const { cols, rows, look, gap = 0 } = opts;
  const ctx = canvas.getContext("2d");
  const progress = new Float32Array(cols * rows);
  let cell = opts.cell ?? 0, dpr = 1;

  /* Starts of cell i and its whole-pixel width, from one running total so cells never overlap or leave a seam. */
  const rectOf = (c, r) => {
    const x = Math.round(c * (cell + gap) * dpr), y = Math.round(r * (cell + gap) * dpr);
    const x2 = Math.round((c * (cell + gap) + cell) * dpr), y2 = Math.round((r * (cell + gap) + cell) * dpr);
    return { x, y, w: x2 - x, h: y2 - y };
  };

  function layout() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    if (!opts.cell) {
      const avail = canvas.parentElement ? canvas.parentElement.clientWidth : canvas.clientWidth;
      cell = Math.max(8, Math.floor((avail - gap * (cols - 1)) / cols));
    }
    const W = cols * cell + gap * (cols - 1), H = rows * cell + gap * (rows - 1);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    draw();
  }

  function drawOne(c, r) { drawCell(ctx, rectOf(c, r), look(c, r, progress[r * cols + c]), dpr); }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) drawOne(c, r);
  }

  const ro = typeof ResizeObserver === "function" && !opts.cell ? new ResizeObserver(() => layout()) : null;
  if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
  const mq = window.matchMedia ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`) : null;
  const onDpr = () => layout();
  if (mq && mq.addEventListener) mq.addEventListener("change", onDpr);
  layout();

  return {
    cols, rows,
    get cell() { return cell; },
    get(c, r) { return progress[r * cols + c]; },
    set(c, r, p) { progress[r * cols + c] = p; drawOne(c, r); },
    setAll(p) { progress.fill(p); draw(); },
    draw, layout,
    destroy() { if (ro) ro.disconnect(); if (mq && mq.removeEventListener) mq.removeEventListener("change", onDpr); },
  };
}

/**
  Spread a colour through the field cell by cell.
    order     [[c, r], ...] in the order the cells turn; cells left out stay put
    to        target progress, a number or (c, r, k) => number (default 1)
    duration  ms each cell takes (default 560)
    stagger   ms between one cell starting and the next (default 18)
    easing    (t) => t, default settle
  Returns { done: Promise, cancel() }. With reduced motion, or duration 0,
  every cell jumps to its target in one frame.
*/
export function spread(field, opts) {
  const { order, duration = 560, stagger = 18, easing = settle } = opts;
  const target = typeof opts.to === "function" ? opts.to : () => opts.to ?? 1;
  const jobs = order.map(([c, r], k) => ({ c, r, from: field.get(c, r), to: target(c, r, k), at: k * stagger }));
  const reduce = opts.reduce ?? (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let raf = 0, cancelled = false, resolve;
  const done = new Promise((res) => (resolve = res));
  if (reduce || duration <= 0) {
    for (const j of jobs) field.set(j.c, j.r, j.to);
    resolve();
    return { done, cancel() {} };
  }
  const start = performance.now();
  const end = (jobs.length ? jobs[jobs.length - 1].at : 0) + duration;
  const tick = (now) => {
    if (cancelled) return;
    const el = now - start;
    for (const j of jobs) {
      if (j.fin) continue;
      const t = (el - j.at) / duration;
      if (t <= 0) continue;
      if (t >= 1) { field.set(j.c, j.r, j.to); j.fin = true; continue; }
      field.set(j.c, j.r, lerp(j.from, j.to, easing(t)));
    }
    if (el < end) raf = requestAnimationFrame(tick); else resolve();
  };
  raf = requestAnimationFrame(tick);
  return { done, cancel() { cancelled = true; cancelAnimationFrame(raf); resolve(); } };
}

/* ---------- a single gradient block ---------- */

/** Fill a whole canvas with one halftone ramp, sized to its CSS box and the device pixel ratio. */
export function drawBlock(canvas, s) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  drawCell(canvas.getContext("2d"), { x: 0, y: 0, w: canvas.width, h: canvas.height }, s, dpr);
}

/* ---------- the orb ---------- */

/**
  The orb: a sphere drawn only in dots, filled to the creator's score.
    fill    0 to 1, the share of the sphere that is lit (the score over 100)
    ink     dot colour; base: colour behind (null for transparent)
    pitch   dot spacing in CSS pixels; angle: screen angle in degrees
    light   [x, y] direction of the light, default from the upper left
  Below the fill line the dots run dense and shade with the sphere; above it
  they thin to a faint ghost, and the line itself is a soft halftone ramp a
  tenth of the diameter tall. Dot centres stay inside the circle and shrink at
  the rim, so the silhouette is made of dots, never a clipped hard edge.
*/
export function drawOrb(canvas, o = {}) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const size = canvas.clientWidth;
  canvas.width = canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext("2d");
  const S = canvas.width, R = S / 2 - 1, cx = S / 2, cy = S / 2;
  ctx.clearRect(0, 0, S, S);
  if (o.base) { ctx.fillStyle = o.base; ctx.fillRect(0, 0, S, S); }
  const pitch = Math.max(3, (o.pitch ?? Math.max(3, size / 26)) * dpr);
  const a = ((o.angle ?? 45) * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const [lx, ly] = o.light ?? [-0.45, -0.55];
  const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
  const fill = clamp01(o.fill ?? 0.5);
  const level = cy + R - fill * 2 * R;
  const band = (2 * R) / 10;
  const n = Math.ceil((R * 1.5) / pitch) + 1;
  ctx.fillStyle = o.ink ?? "#1F4BFF";
  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const px = cx + (i * ux + j * vx) * pitch, py = cy + (i * uy + j * vy) * pitch;
      const dx = (px - cx) / R, dy = (py - cy) / R, rr = dx * dx + dy * dy;
      if (rr >= 1) continue;
      const nz = Math.sqrt(1 - rr);
      const lambert = clamp01(dx * lx + dy * ly + nz * lz);
      const lit = clamp01((py - (level - band / 2)) / band);
      const d = lerp(0.05 + 0.1 * lambert, 0.55 + 0.45 * (1 - lambert * 0.6), lit);
      const rim = clamp01((1 - Math.sqrt(rr)) * R / (pitch * 1.2));
      const r = radiusFor(d) * pitch * (0.35 + 0.65 * rim);
      if (r < MIN_R) continue;
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}
