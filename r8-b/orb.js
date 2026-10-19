/*
  Orbe r8-b: the orb, drawn only in round dots on one 45 degree screen.

  Its fill is a figure: the share of the disc's AREA below the fill line equals
  the score (93 fills 93% of the disc), so the fill can be counted, not guessed.
  One pitch per orb (8px at desktop, 6px on phones, 4px for small orbs), set by
  the caller. Three colours at most: the accent for the body and its ghost, Ink
  for a one-dot rim that always shows (an unrated orb is a rim with no fill),
  and whatever ground it sits on. Shading is by omission: the lit side keeps
  smaller dots. No outline, no gradient, no glow.
*/

const PI_4 = Math.PI / 4;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, t) => a + (b - a) * t;

/* Dot radius, as a share of the pitch, that covers `d` of the area. */
function radiusFor(d) {
  if (d <= 0) return 0;
  if (d <= PI_4) return Math.sqrt(d / Math.PI);
  return lerp(0.5, Math.SQRT1_2, (Math.min(1, d) - PI_4) / (1 - PI_4));
}

/* The height h (0 to 2R, from the bottom) whose circular segment holds `f` of the disc's area. */
function heightFor(f, R) {
  if (f <= 0) return 0;
  if (f >= 1) return 2 * R;
  let lo = 0, hi = 2 * R;
  const total = Math.PI * R * R;
  for (let i = 0; i < 40; i++) {
    const h = (lo + hi) / 2;
    const a = R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(Math.max(0, 2 * R * h - h * h));
    if (a / total < f) lo = h; else hi = h;
  }
  return (lo + hi) / 2;
}

/**
  drawOrb(canvas, { fill, pitch, ink, rim })
    fill   0 to 1, the share of the disc that is filled
    pitch  dot spacing in CSS pixels (one per orb)
    ink    the accent (Cobalt, or Claret in the pink scheme)
    rim    the rim dots (Ink)
*/
export function drawOrb(cv, o = {}) {
  const size = cv.clientWidth;
  if (!size) return;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const W = Math.round(size * dpr);
  if (cv.width !== W || cv.height !== W) { cv.width = W; cv.height = W; }
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, W, W);
  const p = Math.max(3, (o.pitch ?? 8) * dpr);
  const c = W / 2;
  const R = W / 2 - p * 0.55;
  const h = heightFor(clamp01(o.fill ?? 0), R);
  const level = c + R - h; /* canvas y of the fill line */
  const a = Math.PI / 4;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const L = [-0.5, -0.6]; const lz = Math.sqrt(1 - L[0] * L[0] - L[1] * L[1]);
  const n = Math.ceil((R * 1.5) / p) + 2;
  const body = new Path2D(), ghost = new Path2D(), rim = new Path2D();
  const add = (path, x, y, r) => { if (r < 0.5) return; path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); };
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = c + (i * ux + j * vx) * p, y = c + (i * uy + j * vy) * p;
      const dx = (x - c) / R, dy = (y - c) / R, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      if (d > 1 - (0.85 * p) / R) { add(rim, x, y, p * 0.3); continue; }
      if (y >= level + p * 0.5) {
        const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
        const lit = clamp01(dx * L[0] + dy * L[1] + nz * lz);
        add(body, x, y, radiusFor(0.95 - 0.4 * lit) * p);
      } else if (y >= level - p * 1.5) {
        /* the two-dot band at the fill line: an ordered step, so the edge reads round but stays countable */
        add(body, x, y, radiusFor(((i + j) & 1) ? 0.5 : 0.22) * p);
      } else {
        add(ghost, x, y, radiusFor(0.06) * p);
      }
    }
  }
  ctx.fillStyle = o.ink || "#1F4BFF";
  ctx.fill(body);
  ctx.globalAlpha = 1;
  ctx.fill(ghost);
  ctx.fillStyle = o.rim || "#141311";
  ctx.fill(rim);
}

/** Fill an orb from 0 to `fill` over `ms`, linear: the fill is the data, so it rises at an even rate. */
export function riseOrb(cv, o, { ms = 900, delay = 0, reduce = false } = {}) {
  if (reduce || ms <= 0) { drawOrb(cv, o); return; }
  drawOrb(cv, { ...o, fill: 0 });
  const start = performance.now() + delay;
  const step = (now) => {
    const t = clamp01((now - start) / ms);
    drawOrb(cv, { ...o, fill: o.fill * t });
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
