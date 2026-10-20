/*
  The pixel pieces: one creator object per kind of work, drawn on fal's
  11.28px lattice in three colours, with shading by omission (a shadowed cell
  is left out, never darkened). Shapes are drawn in a 48 by 40 design space
  and set on a 67 by 56 lattice, so each piece is large and its edges fine.
  On load the piece rises into place up its columns; when the headline word
  changes, each column's cells travel straight up or down to become the next
  piece. Drawn on a canvas, once per change, then still.
*/
const W = 48, H = 40, S = 1.4;
export const GW = Math.round(W * S), GH = Math.round(H * S), CELL = 11.28;
const INK = "#141311", COBALT = "#1F4BFF", CHALK = "#FBFAF6", STRAW = "#EED56A";

const disc = (cx, cy, r) => (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
const ell = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
const ring = (cx, cy, r0, r1) => (x, y) => { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); return d >= r0 && d <= r1; };
const or = (...fs) => (x, y) => fs.some((f) => f(x, y));
const and = (...fs) => (x, y) => fs.every((f) => f(x, y));
const not = (f) => (x, y) => !f(x, y);
const line = (x0, y0, x1, y1, w = 0.6) => (x, y) => {
  const px = x + 0.5, py = y + 0.5, dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)) <= w;
};
const mirror = (f) => (x, y) => f(x, y) || f(W - 1 - x, y);

/*
  A layer: shape, fill colour, outline colour (cells on the shape's edge),
  and shade: the light comes from the top left, so cells far to the lower
  right of the shape's centre are omitted on a checker, then on a sparser one.
*/
function render(layers) {
  const map = new Map();
  const at = (X, Y) => [(X + 0.5) / S - 0.5, (Y + 0.5) / S - 0.5];
  for (const L of layers) {
    const inside = (X, Y) => L.shape(...at(X, Y));
    for (let Y = 0; Y < GH; Y++) for (let X = 0; X < GW; X++) {
      if (!inside(X, Y)) continue;
      const k = `${X},${Y}`;
      const edge = L.outline && (!inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1));
      if (edge) { map.set(k, L.outline); continue; }
      if (L.shade) {
        const [cx, cy, r] = L.shade;
        const [x, y] = at(X, Y);
        const s = ((x + 0.5 - cx) + (y + 0.5 - cy)) / (r * 1.41);
        if (s > 0.62 && !(X % 2 === 0 && Y % 2 === 0)) { if (L.under) map.delete(k); continue; }
        if (s > 0.3 && (X + Y) % 2 === 1) { if (L.under) map.delete(k); continue; }
      }
      if (L.pattern && !L.pattern(X, Y)) continue;
      map.set(k, L.fill);
    }
  }
  return [...map].map(([k, c]) => { const [x, y] = k.split(",").map(Number); return { x, y, c }; });
}

const PIECES = {
  /* a light bulb with a lit filament: the explainer */
  explainer: () => render([
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = Math.PI * (1.05 + i * 0.15); return { shape: line(24 + Math.cos(a) * 15.5, 15 + Math.sin(a) * 15.5, 24 + Math.cos(a) * 18, 15 + Math.sin(a) * 18, 0.6), fill: INK }; }),
    { shape: disc(24, 15, 12.5), fill: CHALK, outline: INK, shade: [24, 15, 12.5] },
    { shape: or(line(18, 17, 21, 12), line(21, 12, 24, 17), line(24, 17, 27, 12), line(27, 12, 30, 17)), fill: COBALT },
    { shape: or(line(20.5, 17, 20.5, 26, 0.5), line(27.5, 17, 27.5, 26, 0.5)), fill: INK },
    { shape: rect(17, 26, 31, 29), fill: CHALK, outline: INK },
    { shape: rect(17, 29, 31, 36), fill: COBALT, outline: INK, pattern: (x, y) => y % 2 === 0 },
    { shape: rect(20, 36, 28, 39), fill: INK },
  ]),
  /* a moth, for a game called Moth Engine: the devlog */
  devlog: () => render([
    { shape: mirror(or(line(23, 6, 15, 0, 0.6), line(15, 0, 12, 1, 0.6))), fill: INK },
    { shape: ell(13, 15, 11.5, 9), fill: CHALK, outline: INK, shade: [13, 15, 10] },
    { shape: ell(35, 15, 11.5, 9), fill: CHALK, outline: INK, shade: [35, 15, 10] },
    { shape: ell(16, 28, 8.5, 7), fill: CHALK, outline: INK, shade: [16, 28, 8] },
    { shape: ell(32, 28, 8.5, 7), fill: CHALK, outline: INK, shade: [32, 28, 8] },
    { shape: mirror(disc(12.5, 14.5, 3.6)), fill: COBALT, outline: INK },
    { shape: mirror(disc(12.5, 14.5, 1.2)), fill: INK },
    { shape: mirror(disc(16, 28.5, 2)), fill: COBALT },
    { shape: or(rect(22, 8, 26, 36), disc(24, 7, 2.6)), fill: INK },
  ]),
  /* a studio microphone: the podcast */
  podcast: () => render([
    { shape: and(ring(24, 17, 12.2, 13.8), (x, y) => y >= 17), fill: INK },
    { shape: rect(23, 30, 26, 35), fill: INK },
    { shape: rect(14, 35, 35, 38), fill: COBALT, outline: INK },
    { shape: or(rect(15, 10, 34, 24), disc(24.5, 10, 9.5)), fill: CHALK, outline: INK, shade: [24.5, 13, 11], pattern: (x, y) => !(x % 3 === 0 && y % 3 === 0) },
    { shape: rect(15, 19, 34, 22), fill: COBALT, outline: INK },
  ]),
  /* a game pad: the Let's Play */
  letsplay: () => render([
    { shape: or(line(24, 14, 24, 7, 0.6), line(24, 7, 30, 3, 0.6), line(30, 3, 38, 2, 0.6)), fill: INK },
    { shape: or(rect(10, 14, 38, 27), disc(12, 24, 8), disc(36, 24, 8)), fill: COBALT, outline: INK, shade: [24, 20, 15] },
    { shape: or(rect(12, 19, 19, 22), rect(14, 17, 17, 24)), fill: CHALK, outline: INK },
    { shape: or(disc(32, 17.5, 1.7), disc(35.5, 21, 1.7), disc(32, 24.5, 1.7), disc(28.5, 21, 1.7)), fill: CHALK },
    { shape: or(rect(21, 17, 23, 18), rect(25, 17, 27, 18)), fill: INK },
  ]),
  /* one pan, one egg: the recipe */
  recipe: () => render([
    { shape: or(line(14, 6, 15, 3, 0.55), line(15, 3, 14, 0, 0.55), line(20, 6, 21, 3, 0.55), line(21, 3, 20, 0, 0.55), line(26, 6, 27, 3, 0.55)), fill: CHALK, pattern: (x, y) => y % 2 === 0 },
    { shape: rect(32, 21, 48, 25), fill: INK, outline: INK },
    { shape: disc(20, 23, 14), fill: INK, outline: INK },
    { shape: disc(20, 23, 11.8), fill: INK, shade: [20, 23, 11.8], under: true },
    { shape: or(disc(18, 21, 6.5), disc(23, 25, 5.5), disc(14.5, 26, 4.2), disc(22, 18, 4)), fill: CHALK },
    { shape: disc(19, 22, 2.9), fill: STRAW },
  ]),
  /* a camera under star trails: the long exposure */
  longexposure: () => render([
    ...[24, 28, 32, 36].map((r) => ({ shape: and(ring(46, -2, r - 0.5, r + 0.5), (x, y) => y < 12 && x < 46), fill: CHALK, pattern: (x) => x % 2 === 0 })),
    { shape: or(rect(18, 8, 30, 13), rect(6, 12, 42, 35)), fill: INK, outline: INK },
    { shape: rect(34, 9, 39, 12), fill: COBALT },
    { shape: rect(8, 14, 13, 17), fill: CHALK },
    { shape: disc(24, 23.5, 10.5), fill: CHALK, outline: INK, shade: [24, 23.5, 10.5] },
    { shape: disc(24, 23.5, 7.2), fill: INK },
    { shape: disc(24, 23.5, 4.6), fill: COBALT },
    { shape: disc(22.2, 21.8, 1.3), fill: CHALK },
  ]),
};

const CACHE = {};
export const piece = (key) => (CACHE[key] ??= PIECES[key]());

/* the page's one easing, from the shared system */
import { ease } from "./assets/orbe/ease.js";
export { ease };

export function mountArt(canvas) {
  const ctx = canvas.getContext("2d");
  let cells = [], raf = 0;
  let cs = 1;
  const size = () => {
    const c = parseFloat(getComputedStyle(canvas).getPropertyValue("--cell")) || CELL;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(GW * c * dpr); canvas.height = Math.round(GH * c * dpr);
    canvas.style.width = `${GW * c}px`; canvas.style.height = `${GH * c}px`;
    cs = c * dpr;
  };
  size();
  const draw = (list) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of list) {
      ctx.fillStyle = p.c;
      const x0 = Math.round(p.x * cs), y0 = Math.round(p.y * cs);
      ctx.fillRect(x0, y0, Math.round((p.x + 1) * cs) - x0, Math.round((p.y + 1) * cs) - y0);
    }
  };
  /*
    Column paths: in each column, the old cells and the new are paired top to
    bottom; a cell with no partner comes up from below the edge, or leaves
    down through it. Every cell moves straight up or down, never sideways.
  */
  function travel(from, to) {
    const cols = new Map();
    const put = (list, side) => { for (const c of list) { if (!cols.has(c.x)) cols.set(c.x, { a: [], b: [] }); cols.get(c.x)[side].push(c); } };
    put(from, "a"); put(to, "b");
    const moves = [];
    for (const [x, { a, b }] of cols) {
      a.sort((p, q) => p.y - q.y); b.sort((p, q) => p.y - q.y);
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) {
        const A = a[i] ?? { x, y: GH + (n - i), c: b[i].c };
        const B = b[i] ?? { x, y: GH + (n - i), c: A.c };
        moves.push({ x, y0: A.y, y1: B.y, c0: A.c, c1: B.c, delay: x * 2.6 });
      }
    }
    return moves;
  }
  function show(key, animate) {
    const next = piece(key);
    cancelAnimationFrame(raf);
    if (!animate) { cells = next; draw(cells); return; }
    const moves = travel(cells, next);
    const t0 = performance.now(), D = 420, END = D + GW * 2.6;
    const frame = (now) => {
      draw(moves.map((m) => {
        const t = ease(Math.max(0, Math.min(1, (now - t0 - m.delay) / D)));
        return { x: m.x, y: m.y0 + (m.y1 - m.y0) * t, c: t < 0.5 ? m.c0 : m.c1 };
      }));
      if (now - t0 < END) raf = requestAnimationFrame(frame); else { cells = next; draw(cells); }
    };
    raf = requestAnimationFrame(frame);
  }
  /* the page sets --cell when it places the piece; redraw at the new size */
  const resize = () => { size(); draw(cells); };
  return { show, resize };
}
