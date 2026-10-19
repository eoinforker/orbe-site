/*
  The Orbe moon: one dithered sphere, lit by a real figure.

  A figure p (0 to 1) sets the terminator, so exactly p of the disc is lit:
  "beats 93 in 100" is a 93% moon, a 15% fee is a thin crescent, an unrated
  handle is a dark disc with only its dotted rim. Shading is Lambert from the
  upper right, quantised by an 8x8 Bayer matrix into hard square dots. No blur.
*/
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const L = (() => { const v = [0.62, -0.42, 0.66]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

function rgb(css) {
  const m = css.match(/\d+(\.\d+)?/g) || ["20", "19", "17"];
  return [+m[0], +m[1], +m[2]];
}

/** Paint one orb into a canvas at phase p. The canvas's CSS colour is the ink of the dots. */
export function drawOrb(canvas, p, { rim = true, ambient = 0.05 } = {}) {
  const N = canvas.width;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(N, N);
  const d = img.data;
  const [r, g, b] = rgb(getComputedStyle(canvas).color);
  const q = Math.max(0, Math.min(1, p));
  const px = 2 / N;
  for (let y = 0; y < N; y++) {
    const ny = (y + 0.5) / N * 2 - 1;
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5) / N * 2 - 1;
      const r2 = nx * nx + ny * ny;
      let on = false;
      if (r2 <= 1) {
        const nz = Math.sqrt(1 - r2);
        const h = Math.sqrt(Math.max(0, 1 - ny * ny));
        const xt = h * (1 - 2 * q);
        const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        /* a short ramp at the terminator, so the edge reads as a curved surface, not a cut */
        const ramp = Math.min(h * 0.32, Math.max(px, (h - xt) * 0.4));
        const t = h > 0 ? (nx - xt) / (ramp + px) : -1;
        const lit = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
        const v = ambient * (0.4 + nz) + lit * (0.18 + 0.82 * Math.pow(lam, 0.8));
        on = v > (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
        if (rim && !on && r2 > Math.pow(1 - px * 1.6, 2) && (x + y) % 3 === 0) on = true;
      }
      if (on) { const i = (y * N + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
  Wax an orb from new to its figure once it comes into view; with reduced motion it simply sits at
  its figure. Returns a function that repaints it at its figure (after a colour change).
*/
export function mountOrb(canvas, p, { reduce = false, dur = 1300, delay = 0 } = {}) {
  canvas.dataset.p = String(p);
  let shown = reduce;
  const still = () => drawOrb(canvas, +canvas.dataset.p);
  if (reduce || !("IntersectionObserver" in window)) { still(); return still; }
  drawOrb(canvas, 0);
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const t0 = performance.now() + delay;
    const step = (now) => {
      const t = Math.max(0, Math.min(1, (now - t0) / dur));
      /* steps of 1/40: the moon waxes in visible ticks, like a dial, not a fade */
      const k = Math.round(easeOut(t) * 40) / 40;
      drawOrb(canvas, +canvas.dataset.p * k);
      if (t < 1) requestAnimationFrame(step); else { shown = true; still(); }
    };
    requestAnimationFrame(step);
  }, { threshold: 0.25 });
  io.observe(canvas);
  return () => { if (shown) still(); };
}

/** Change an orb's figure: ticks from where it is to where it should be. */
export function setOrb(canvas, p, { reduce = false, dur = 700 } = {}) {
  const from = +canvas.dataset.p || 0;
  canvas.dataset.p = String(p);
  if (reduce) { drawOrb(canvas, p); return; }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const k = Math.round(easeOut(t) * 30) / 30;
    drawOrb(canvas, from + (p - from) * k);
    if (t < 1 && canvas.dataset.p === String(p)) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
