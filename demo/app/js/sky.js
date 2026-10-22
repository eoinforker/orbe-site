/*
  Painted Sky: the field behind every first impression (the homes, sign-in,
  the walkthrough and an invitation). A soft, painterly wash made only of
  Orbe's own colours: Sky, Water, Chalk and Paper, with a breath of Peony and
  a warm Paper light kept to the upper right and away from Water, so nothing
  mixes towards mauve. No glow and no halo: every wash is a soft-edged
  ellipse of one colour, and the site's paper grain sits on top in CSS.

  Painted once, at half the box's size (it is soft, so that costs nothing in
  sharpness and a quarter of the pixels), onto a canvas a little larger than
  the box. The drift is a CSS transform on that canvas, so nothing repaints
  while it moves; under reduced motion it holds still. It repaints only when
  the box's width changes enough to matter.
*/

/* A seeded random source, so a field looks the same every visit. */
function rnd(seed) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* Colours as [r, g, b]. */
const SKY = [148, 230, 255];
const SKY_HI = [191, 239, 255];
const SKY_LO = [169, 233, 255];
const PALE = [198, 241, 255];
const WATER = [77, 154, 208];
const CHALK = [251, 250, 246];
const PAPER = [243, 240, 232];
const PEONY = [242, 135, 158];
const LIGHT = [255, 244, 214];

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

/* One soft wash: an ellipse whose colour fades to nothing at its edge. */
function wash(x, cx, cy, rx, ry, angle, col, a) {
  x.save();
  x.translate(cx, cy);
  x.rotate(angle);
  x.scale(rx / ry, 1);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.8));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, ry, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/* A faint brushed streak, soft at both ends, as light catching paper. */
function streak(x, cx, cy, len, thick, angle, col, a) {
  x.save();
  x.translate(cx, cy);
  x.rotate(angle);
  const g = x.createLinearGradient(-len / 2, 0, len / 2, 0);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.5, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.beginPath();
  x.ellipse(0, 0, len / 2, thick, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/* Paint the field into a context of w by h (CSS pixels at the chosen scale). */
export function paint(x, w, h, seed = 7) {
  const r = rnd(seed);
  const base = x.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, rgba(SKY_HI, 1));
  base.addColorStop(0.6, rgba(SKY, 1));
  base.addColorStop(1, rgba(SKY_LO, 1));
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  const s = Math.max(w, h * 2) / 1440;
  // The body of the sky: broad washes of Chalk, Paper, paler Sky and a little Water.
  const cool = [[CHALK, 0.85], [PAPER, 0.75], [WATER, 0.3], [SKY, 0.9], [PALE, 0.9]];
  for (let i = 0; i < 88; i++) {
    const [col, a] = cool[Math.floor(r() * cool.length)];
    wash(x, r() * w, r() * h, (120 + r() * 300) * s, (60 + r() * 120) * s, -0.2 + r() * 0.15, col, a);
  }
  // Warmth only in the upper right: a warm Paper light first, then Peony inside it, so Peony
  // meets cream rather than Sky and never mixes towards mauve.
  const warm = Array.from({ length: 3 }, () => [w * (0.6 + r() * 0.34), h * r() * 0.34, (180 + r() * 200) * s, (70 + r() * 70) * s]);
  for (const [cx, cy, rx, ry] of warm) wash(x, cx, cy, rx, ry, -0.15, LIGHT, 0.9);
  for (const [cx, cy, rx, ry] of warm.slice(0, 2)) wash(x, cx + rx * 0.08, cy, rx * 0.55, ry * 0.55, -0.15, PEONY, 0.3);
  // Brushed light.
  for (let i = 0; i < 16; i++) streak(x, r() * w, r() * h, (80 + r() * 260) * s, (2 + r() * 4) * s, -0.35, r() < 0.55 ? CHALK : [127, 211, 245], 0.4);
  // A veil through the middle, so the words always sit on calm sky.
  const v = x.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, rgba(PALE, 0));
  v.addColorStop(0.35, rgba([214, 245, 255], 0.3));
  v.addColorStop(0.62, rgba([214, 245, 255], 0.2));
  v.addColorStop(1, rgba([214, 245, 255], 0));
  x.fillStyle = v;
  x.fillRect(0, 0, w, h);
}

/**
  paintedSky(host, opts) lays the field into host (positioned, with
  overflow hidden) and returns { node, destroy }. opts.seed picks the field;
  opts.drift (default true) lets it move very slowly.
*/
export function paintedSky(host, opts = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = `cn-sky${opts.drift === false ? "" : " cn-sky--drift"}`;
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  let painted = 0;
  function draw() {
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * 1.12));
    const ht = Math.max(1, Math.round(rect.height * 1.12));
    if (painted && Math.abs(painted - w) < 80) return;
    painted = w;
    // Half size: the wash is soft, so this loses nothing and saves three quarters of the work.
    const k = 0.5;
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(ht * k);
    const x = canvas.getContext("2d");
    x.setTransform(k, 0, 0, k, 0, 0);
    paint(x, w, ht, opts.seed ?? 7);
  }
  draw();
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  ro?.observe(host);
  return { node: canvas, destroy: () => { ro?.disconnect(); canvas.remove(); } };
}

/*
  Quick-start pictures: small abstract images in Orbe's colours, one for each
  kind of task, painted on the device. Never people, never logos.
*/
const C = { sky: "#94E6FF", pale: "#BDEFFF", water: "#4D9AD0", chalk: "#FBFAF6", paper: "#F3F0E8", cobalt: "#1F4BFF", deep: "#0E2AAE", straw: "#F5D34A", peony: "#F2879E", claret: "#6F1726", ink: "#141311" };

const ART = {
  // Three frames fanned out: one video becoming many.
  video(x, w, h) {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, C.pale);
    g.addColorStop(1, C.sky);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    [[-14, C.deep], [0, C.cobalt], [14, C.water]].forEach(([deg, col], i) => {
      x.save();
      x.translate(w / 2 + (i - 1) * w * 0.2, h * 0.58);
      x.rotate((deg * Math.PI) / 180);
      const fw = w * 0.25, fh = h * 0.64;
      x.fillStyle = "rgba(20,19,17,0.14)";
      x.fillRect(-fw / 2 + 4, -fh / 2 + 6, fw, fh);
      const f = x.createLinearGradient(0, -fh / 2, 0, fh / 2);
      f.addColorStop(0, i === 1 ? C.straw : C.chalk);
      f.addColorStop(1, col);
      x.fillStyle = f;
      x.fillRect(-fw / 2, -fh / 2, fw, fh);
      x.restore();
    });
  },
  // A board of brand squares: who backs creators like you.
  sponsor(x, w, h) {
    x.fillStyle = C.straw;
    x.fillRect(0, 0, w, h);
    const cols = [C.ink, C.cobalt, C.peony, C.chalk, C.deep, C.chalk];
    const cw = w * 0.21, ch = h * 0.27;
    for (let i = 0; i < 6; i++) {
      const cx = w * (0.17 + (i % 3) * 0.33), cy = h * (0.3 + Math.floor(i / 3) * 0.41);
      x.fillStyle = cols[i];
      x.beginPath();
      if (x.roundRect) x.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 8);
      else x.rect(cx - cw / 2, cy - ch / 2, cw, ch);
      x.fill();
    }
  },
  // A balance: is the offer fair.
  offer(x, w, h) {
    x.fillStyle = C.deep;
    x.fillRect(0, 0, w, h);
    x.fillStyle = C.sky;
    x.fillRect(w * 0.17, h * 0.57, w * 0.28, h * 0.08);
    x.fillRect(w * 0.55, h * 0.48, w * 0.28, h * 0.08);
    x.fillStyle = C.chalk;
    x.fillRect(w * 0.49, h * 0.2, w * 0.015, h * 0.58);
    x.strokeStyle = C.chalk;
    x.lineWidth = Math.max(2, w * 0.014);
    x.beginPath();
    x.moveTo(w * 0.31, h * 0.57);
    x.lineTo(w * 0.69, h * 0.48);
    x.stroke();
    x.fillStyle = C.straw;
    x.beginPath();
    x.arc(w * 0.5, h * 0.2, h * 0.055, 0, Math.PI * 2);
    x.fill();
  },
  // A rising line against a quiet one: rated against creators your size.
  rate(x, w, h) {
    x.fillStyle = C.ink;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(251,250,246,0.28)";
    x.lineWidth = Math.max(1.5, w * 0.008);
    x.beginPath();
    x.moveTo(w * 0.08, h * 0.7);
    x.bezierCurveTo(w * 0.35, h * 0.66, w * 0.6, h * 0.62, w * 0.92, h * 0.58);
    x.stroke();
    x.strokeStyle = C.sky;
    x.lineWidth = Math.max(2.5, w * 0.016);
    x.beginPath();
    x.moveTo(w * 0.08, h * 0.76);
    x.bezierCurveTo(w * 0.4, h * 0.72, w * 0.55, h * 0.3, w * 0.92, h * 0.22);
    x.stroke();
    x.fillStyle = C.straw;
    x.beginPath();
    x.arc(w * 0.92, h * 0.22, h * 0.05, 0, Math.PI * 2);
    x.fill();
  },
  // Two prints side by side: is this copy yours.
  protect(x, w, h) {
    x.fillStyle = C.sky;
    x.fillRect(0, 0, w, h);
    [[0.3, C.chalk], [0.7, C.paper]].forEach(([cx, col]) => {
      x.fillStyle = col;
      x.fillRect(w * cx - w * 0.16, h * 0.2, w * 0.32, h * 0.6);
      x.fillStyle = C.deep;
      x.fillRect(w * cx - w * 0.1, h * 0.32, w * 0.2, h * 0.2);
      x.fillStyle = C.water;
      x.fillRect(w * cx - w * 0.1, h * 0.6, w * 0.14, h * 0.05);
    });
  },
  // Waves from a microphone: a show.
  podcast(x, w, h) {
    x.fillStyle = C.peony;
    x.fillRect(0, 0, w, h);
    x.fillStyle = C.claret;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const bh = h * (0.18 + 0.5 * Math.abs(Math.sin(i * 1.1 + 0.6)));
      x.fillRect(w * (0.14 + (i * 0.72) / n), h / 2 - bh / 2, w * 0.045, bh);
    }
  },
};

/** A quick start's picture: a canvas painted with that kind of task's art, at device resolution. */
export function quickArt(kind, w = 72, h = 48) {
  const canvas = document.createElement("canvas");
  canvas.className = "cn-qart";
  canvas.setAttribute("aria-hidden", "true");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const x = canvas.getContext("2d");
  x.scale(dpr, dpr);
  (ART[kind] ?? ART.rate)(x, w, h);
  return canvas;
}

/** The YouTube thumbnail for a work, when it is a YouTube video Orbe can name. */
export function thumbOf(work) {
  const m = /[?&]v=([\w-]{11})/.exec(work?.url ?? "");
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

/** A work's own picture, falling back to the task's art if it cannot load. */
export function workArt(work, kind) {
  const src = thumbOf(work);
  if (!src) return quickArt(kind);
  const img = document.createElement("img");
  img.className = "cn-qart";
  img.alt = "";
  img.decoding = "async";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => img.replaceWith(quickArt(kind)), { once: true });
  img.src = src;
  return img;
}
