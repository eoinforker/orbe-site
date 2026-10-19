/*
  Orbe r7-e: the moon. One sphere drawn only in round dots on one 45 degree
  screen, lit like a moon phase by a real figure.

  The figure p (0 to 1) places the terminator, and exactly p of the disc's area
  is lit: on every row the lit run is 2hp of the row's 2h, so "beats 93 in 100"
  is a 93% moon, a 15% fee is a thin crescent, and an unrated handle is a new
  moon: only its rim and a faint ghost of the dark side.

  Construction, per the spec (docs/handoff/TEARDOWN-FAL.md 13.4 and
  ILLUSTRATION-LANGUAGE.md 5.6):
  - one pitch per moon, set by the caller per breakpoint (8, 6 or 4 CSS px);
  - three colours: the body (the accent, or Ink on newsprint), a one-dot rim
    that always shows, and the ground it sits on;
  - shading by omission: the lit side keeps bigger dots toward the light, the
    terminator is a two-dot ordered step so the edge reads round but stays
    countable, the dark side is a ghost of tiny dots;
  - drawn at the device ratio (capped at 3) and redrawn on resize. No outline,
    no gradient, no glow.
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

/* The light comes from the lit limb, upper right, as on a waxing moon. */
const LX = 0.62, LY = -0.4, LZ = Math.sqrt(1 - LX * LX - LY * LY);

/**
  drawMoon(canvas, { phase, pitch, body, rim, ghost })
    phase  0 to 1, the share of the disc that is lit
    pitch  dot spacing in CSS px (one per moon)
    body   the lit dots and the ghost
    rim    the rim dots
    ghost  density of the dark side's dots (default 0.05)
  The canvas takes its size from its CSS box.
*/
export function drawMoon(cv, o = {}) {
  const size = cv.clientWidth;
  if (!size) return;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const W = Math.round(size * dpr);
  if (cv.width !== W || cv.height !== W) { cv.width = W; cv.height = W; }
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, W, W);
  const p = Math.max(3, (o.pitch ?? 6) * dpr);
  const c = W / 2;
  const R = W / 2 - p * 0.55;
  const q = clamp01(o.phase ?? 0);
  const ghostR = radiusFor(o.ghost ?? 0.05) * p;
  const ux = Math.SQRT1_2, uy = Math.SQRT1_2, vx = -uy, vy = ux;
  const n = Math.ceil((R * 1.5) / p) + 2;
  const body = new Path2D(), ghost = new Path2D(), rim = new Path2D();
  const add = (path, x, y, r) => { if (r < 0.5) return; path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); };
  const band = (0.75 * p) / R; /* half the terminator step, in disc units */
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = c + (i * ux + j * vx) * p, y = c + (i * uy + j * vy) * p;
      const dx = (x - c) / R, dy = (y - c) / R, d = Math.hypot(dx, dy);
      /* the interior stops a dot short of the rim, which is laid on the circle itself */
      if (d > 1 - (0.95 * p) / R) continue;
      const h = Math.sqrt(Math.max(0, 1 - dy * dy));
      const xt = h * (1 - 2 * q);
      const s = dx - xt;
      if (q > 0 && s > band) {
        const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
        const lam = clamp01(dx * LX + dy * LY + nz * LZ);
        add(body, x, y, radiusFor(0.3 + 0.62 * lam) * p);
      } else if (q > 0 && s > -band) {
        /* the two-dot step at the terminator: alternate dots, so the edge reads round and the count holds */
        add(body, x, y, radiusFor(((i + j) & 1) ? 0.4 : 0.16) * p);
      } else {
        add(ghost, x, y, ghostR);
      }
    }
  }
  /* the rim: dots spaced one pitch apart along the circle, so the silhouette is round at any size */
  const N = Math.max(12, Math.round((2 * Math.PI * R) / p));
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    add(rim, c + Math.cos(a) * R, c + Math.sin(a) * R, p * 0.3);
  }
  ctx.fillStyle = o.body || "#1F4BFF";
  ctx.fill(body);
  ctx.fill(ghost);
  ctx.fillStyle = o.rim || "#141311";
  ctx.fill(rim);
}

/** Wax a moon from new to its phase over `ms`, linear: the phase is the data, so it moves at an even rate. */
export function waxMoon(cv, o, { ms = 900, delay = 0, reduce = false } = {}) {
  let stop = false;
  if (reduce || ms <= 0) { drawMoon(cv, o); return () => {}; }
  drawMoon(cv, { ...o, phase: 0 });
  const start = performance.now() + delay;
  const step = (now) => {
    if (stop) return;
    const t = clamp01((now - start) / ms);
    drawMoon(cv, { ...o, phase: (o.phase ?? 0) * t });
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return () => { stop = true; };
}
