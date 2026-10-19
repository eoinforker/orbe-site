/*
  The tool on the desk: one pixel object per kind of creator, on fal's strict
  lattice (11.28px cells), in three colours: a Cobalt body, an Ink rim and Ink
  detail, Chalk texture laid as four-point cells on a diagonal lattice and left
  out on the shadow side. One cell is Ember: you.

  Each object is drawn here from a few plain shapes evaluated on a 40 by 32
  cell grid, then traced: a body cell with an empty neighbour becomes rim.
  When the creator changes, every cell flies to its place in the next object,
  staggered left to right, each in 420ms on the page's one curve, all settled
  inside 700ms. Nothing moves after that.
*/
export const GW = 40, GH = 32;
const hyp = Math.hypot;
const circ = (cx, cy, r) => (x, y) => hyp(x - cx, y - cy) <= r;
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
const rrect = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return hyp(x - cx, y - cy) <= r;
};
const seg = (ax, ay, bx, by, r) => (x, y) => {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return hyp(x - ax - vx * t, y - ay - vy * t) <= r;
};
const any = (...f) => (x, y) => f.some((g) => g(x, y));

/* each object: body, holes (empty), detail (ink), solid (chalk), ember cell, and where the light comes from */
const OBJECTS = {
  headphones: {
    body: any((x, y) => { const d = hyp(x - 20, y - 18); return y < 19 && d >= 11.8 && d <= 15; }, rrect(3, 16, 12, 30, 2.6), rrect(28, 16, 37, 30, 2.6), rect(6.5, 13, 9.5, 17), rect(30.5, 13, 33.5, 17)),
    detail: any(rect(10, 18, 11, 28), rect(29, 18, 30, 28), rect(13, 3, 27, 4)),
    solid: any(rect(5, 19, 9, 27), rect(31, 19, 35, 27)),
    ember: [33, 22],
  },
  controller: {
    body: any(rrect(5, 9, 35, 22, 5), circ(10.5, 22, 5.6), circ(29.5, 22, 5.6)),
    detail: any(rect(8, 15, 15, 17), rect(10.5, 12.5, 12.5, 19.5), rect(17, 12, 19, 13), rect(21, 12, 23, 13)),
    holes: any(circ(27.5, 13.5, 1.1), circ(30.5, 16.5, 1.1), circ(24.5, 16.5, 1.1), circ(27.5, 19.5, 1.1)),
    ember: [30, 16],
  },
  pan: {
    body: any(circ(15, 16, 12), seg(26, 16, 41, 16, 1.9)),
    detail: (x, y) => { const d = hyp(x - 15, y - 16); return d > 9.6 && d <= 10.6; },
    solid: (x, y) => { const d = hyp((x - 14) / 1.1, y - 16.6); return d <= 5.2 && hyp(x - 13, y - 13) > 0.6; },
    holes: rect(37, 15.5, 39, 16.5),
    ember: [15, 16],
  },
  camera: {
    body: any(rrect(2, 11, 18, 28, 1.4), rect(5, 8, 13, 11), rect(17, 13, 37, 26), rect(36, 12, 40, 27)),
    detail: any(rect(22, 13, 23, 26), rect(30, 13, 31, 26), rect(5, 14, 13, 15), rect(36, 12, 37, 27)),
    solid: rect(6, 17, 12, 24),
    ember: [7, 9],
  },
  bulb: {
    body: any(circ(20, 12, 10.2), rrect(14.5, 18, 25.5, 24, 2), rect(16, 24, 24, 29), rect(18, 29, 22, 31)),
    detail: any(rect(16, 25, 24, 26), rect(16, 27, 24, 28), seg(16.5, 13, 18.5, 8.5, 0.5), seg(18.5, 8.5, 20.5, 13, 0.5), seg(20.5, 13, 22.5, 8.5, 0.5), seg(22.5, 8.5, 24, 12.5, 0.5), rect(17, 13, 18, 20), rect(22, 13, 23, 20)),
    ember: [20, 9],
  },
  stopwatch: {
    body: any(circ(20, 18, 12.4), rect(17, 2, 23, 5), rect(18.5, 5, 21.5, 7), seg(29, 7, 31, 5, 1.5)),
    solid: circ(20, 18, 9.6),
    detail: any(seg(20, 18, 20, 11, 0.5), seg(20, 18, 25, 14.5, 0.5), rect(19, 9, 21, 10), rect(28, 17, 29, 19), rect(19, 26, 21, 27), rect(11, 17, 12, 19)),
    ember: [25, 14],
  },
  envelope: {
    body: rect(2, 7, 38, 28),
    detail: any(seg(2.5, 7.5, 20, 19, 0.55), seg(37.5, 7.5, 20, 19, 0.55), seg(2.5, 27.5, 15, 18.2, 0.5), seg(37.5, 27.5, 25, 18.2, 0.5)),
    ember: [20, 18],
  },
  chisel: {
    body: any(seg(4, 28, 15, 17, 4.2), seg(18.5, 13.5, 34, 3, 2.3), seg(32, 1.8, 37.5, 1.2, 1.6)),
    detail: any(seg(15.5, 16.5, 18.5, 13.5, 3.2), seg(7, 25, 12.5, 19.5, 0.5)),
    solid: (x, y) => { const d = hyp(x - 30, y - 22); return d <= 4.6 && d > 2.8 && !(x < 30 && y < 22); },
    ember: [9, 23],
  },
  mic: {
    body: any(rrect(13, 1, 27, 20, 7), (x, y) => { const d = hyp(x - 20, y - 12); return y > 12 && d >= 9.6 && d <= 11.4; }, rect(19, 23, 21, 28), rrect(12, 28, 28, 31, 1)),
    detail: any(rect(13, 11, 27, 12), rect(14, 13, 26, 14)),
    ember: [20, 4],
  },
  code: {
    body: any(seg(12.5, 7, 3, 16, 2), seg(3, 16, 12.5, 25, 2), seg(23.5, 4, 16.5, 28, 1.7), seg(27.5, 7, 37, 16, 2), seg(37, 16, 27.5, 25, 2)),
    ember: [4, 16],
  },
};

/* a small, fixed noise so the shading by omission has a hand to it */
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

/* cell types: 1 body (cobalt), 2 rim and detail (ink), 3 chalk solid, 4 texture over body, 5 ember */
export function cellsOf(name) {
  const o = OBJECTS[name];
  const has = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && o.body(x + 0.5, y + 0.5) && !(o.holes && o.holes(x + 0.5, y + 0.5) && !(o.back && o.back(x + 0.5, y + 0.5)));
  const out = [];
  let cx = 0, cy = 0, n = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (has(x, y)) { cx += x; cy += y; n++; }
  cx /= n; cy /= n;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (!has(x, y)) continue;
    const px = x + 0.5, py = y + 0.5;
    let t = 1;
    const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
    if (edge || (o.detail && o.detail(px, py))) t = 2;
    else if (o.solid && o.solid(px, py)) t = 3;
    else if ((x + y) % 2 === 0) {
      /* light from the upper left: texture thins toward the lower right and is left out in the shadow */
      const shade = ((x - cx) * 0.55 + (y - cy) * 0.8) / 10 + (hash(x, y) - 0.5) * 0.9;
      if (shade < 0.55) t = 4;
    }
    if (o.ember && x === o.ember[0] && y === o.ember[1]) t = 5;
    out.push({ x, y, t });
  }
  return out;
}
export const NAMES = Object.keys(OBJECTS);

/* ---------------------------------------------------------------- the renderer */
const EASE = (() => {
  const x1 = 0.45, y1 = 0, x2 = 0.2, y2 = 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (u) => { if (u <= 0) return 0; if (u >= 1) return 1; let t = u; for (let i = 0; i < 6; i++) { const e = ((ax * t + bx) * t + cx) * t - u, d = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return ((ay * t + by) * t + cy) * t; };
})();

export function createCells(canvas, { still = false, colours }) {
  const g = canvas.getContext("2d");
  const S = { cells: [], from: null, t0: 0, raf: 0, cs: 11.28, dpr: 1, ember: null };
  const C = colours;
  function size() {
    S.dpr = Math.min(2, devicePixelRatio || 1);
    const cs = parseFloat(getComputedStyle(canvas).getPropertyValue("--cell")) || 11.28;
    S.cs = cs;
    canvas.width = Math.round(GW * cs * S.dpr); canvas.height = Math.round(GH * cs * S.dpr);
    canvas.style.width = GW * cs + "px"; canvas.style.height = GH * cs + "px";
    draw(performance.now());
  }
  const colourOf = (t) => (t === 2 ? C.ink : t === 3 ? C.chalk : t === 5 ? C.ember : C.cobalt);
  function cell(x, y, t, a = 1) {
    const k = S.cs * S.dpr;
    const x0 = Math.round(x * k), y0 = Math.round(y * k), x1 = Math.round((x + 1) * k), y1 = Math.round((y + 1) * k);
    g.globalAlpha = a;
    g.fillStyle = colourOf(t === 4 ? 1 : t);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (t === 4) {
      /* a concave four-point cell, the lattice's texture */
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = (x1 - x0) * 0.36;
      g.fillStyle = C.chalk;
      g.beginPath(); g.moveTo(cx, cy - r);
      g.quadraticCurveTo(cx, cy, cx + r, cy); g.quadraticCurveTo(cx, cy, cx, cy + r);
      g.quadraticCurveTo(cx, cy, cx - r, cy); g.quadraticCurveTo(cx, cy, cx, cy - r);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  function draw(now) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    let moving = false;
    for (const c of S.cells) {
      if (!c.from) { cell(c.x, c.y, c.t, c.a ?? 1); continue; }
      const u = Math.min(1, Math.max(0, (now - S.t0 - c.delay) / 420)), e = EASE(u);
      if (u < 1) moving = true;
      const x = c.from.x + (c.x - c.from.x) * e, y = c.from.y + (c.y - c.from.y) * e;
      const a = c.fade ? 1 - e : c.born ? e : 1;
      cell(x, y, e < 0.7 ? c.from.t : c.t, a);
    }
    if (!moving && S.cells.some((c) => c.from)) { S.cells = S.cells.filter((c) => !c.fade).map((c) => ({ x: c.x, y: c.y, t: c.t })); draw(now); return; }
    if (moving) S.raf = requestAnimationFrame(draw);
  }
  function show(name, { animate = true } = {}) {
    const next = cellsOf(name);
    const e = next.find((c) => c.t === 5);
    S.ember = e ? { x: e.x, y: e.y } : null;
    cancelAnimationFrame(S.raf);
    if (!animate || still || !S.cells.length) { S.cells = next; draw(performance.now()); return; }
    /* column by column, like a pin board resetting: every cell moves only up or down its own column,
       old cells in reading order onto new ones; cells with no partner appear or leave in place */
    const prev = S.cells.filter((c) => !c.fade);
    const out = [];
    for (let x = 0; x < GW; x++) {
      const a = prev.filter((c) => c.x === x).sort((p, q) => p.y - q.y);
      const b = next.filter((c) => c.x === x).sort((p, q) => p.y - q.y);
      const delay = (x / GW) * 240;
      b.forEach((c, i) => {
        const p = a.length ? a[Math.min(a.length - 1, Math.round((i * (a.length - 1)) / Math.max(1, b.length - 1)))] : null;
        out.push(p ? { ...c, from: { x: p.x, y: p.y, t: p.t }, delay } : { ...c, from: { x: c.x, y: c.y, t: c.t }, born: true, delay });
      });
      if (!b.length) for (const p of a) out.push({ x: p.x, y: p.y, t: p.t, from: { x: p.x, y: p.y, t: p.t }, fade: true, delay });
    }
    S.cells = out;
    S.t0 = performance.now();
    S.raf = requestAnimationFrame(draw);
  }
  size();
  return { show, size, get ember() { return S.ember; }, get cs() { return S.cs; } };
}
