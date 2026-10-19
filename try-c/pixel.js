/*
  The one pixel piece: an object for each kind of creator, drawn on fal's
  11.28px lattice (36 by 30 cells) in three colours, shaded by omission. When
  the kind changes, the cells travel from the old object to the new one.
*/
const W = 36, H = 30;
const C = { a: "--orbe-chalk", b: "--orbe-straw", c: "--orbe-ember" };

function grid() { return Array.from({ length: H }, () => Array(W).fill(null)); }
function painter(g) {
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  return {
    rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); },
    disc(cx, cy, r, c) { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= r) set(i, j, c); },
    ring(cx, cy, r, t, c) { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy); if (d <= r && d > r - t) set(i, j, c); } },
    clear(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, null); },
    line(x0, y0, x1, y1, c, t = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2; for (let k = 0; k <= n; k++) { const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n); for (let o = 0; o < t; o++) set(x, y + o, c); } },
  };
}

const DRAW = {
  /* a video camera with two reels: the channel */
  channel(p) {
    for (const [cx, cy, r] of [[10, 7.5, 6], [22, 8, 5.2]]) {
      p.disc(cx, cy, r, "a");
      for (let k = 0; k < 4; k++) { const t = Math.PI / 4 + (k * Math.PI) / 2; p.disc(cx + Math.cos(t) * r * 0.5, cy + Math.sin(t) * r * 0.5, r * 0.22, null); }
      p.disc(cx, cy, 1, "b");
    }
    p.rect(3, 14, 24, 13, "a");
    p.rect(5, 16, 20, 1, null); p.rect(5, 24, 20, 1, null); p.rect(5, 16, 1, 9, null); p.rect(24, 16, 1, 9, null);
    for (let y = 18; y <= 22; y += 2) for (let x = 15; x <= 22; x += 2) p.rect(x, y, 1, 1, null);
    p.rect(7, 18, 3, 3, "c");
    p.rect(27, 17, 2, 7, "b"); p.rect(29, 15, 2, 11, "b"); p.rect(31, 13, 3, 15, "b"); p.rect(30, 16, 1, 9, null);
    p.rect(12, 27, 6, 1, "b"); p.rect(14, 28, 2, 2, "b");
  },
  /* an envelope with this week's letter in it: the newsletter */
  newsletter(p) {
    p.rect(6, 1, 24, 12, "b");
    for (const y of [3, 5, 7]) p.rect(8, y, y === 7 ? 12 : 20, 1, null);
    p.rect(8, 9, 11, 1, "c");
    p.rect(2, 10, 32, 19, "a");
    p.line(2, 10, 17, 21, null, 1); p.line(33, 10, 18, 21, null, 1);
    p.line(2, 28, 12, 21, null, 1); p.line(33, 28, 23, 21, null, 1);
  },
  /* a controller: the stream */
  stream(p) {
    p.rect(6, 9, 24, 12, "a");
    p.disc(8, 19, 6.5, "a"); p.disc(28, 19, 6.5, "a");
    p.rect(9, 14, 5, 1, null); p.rect(11, 12, 1, 5, null);
    p.disc(26, 12.5, 1.2, "c"); p.disc(29, 15.5, 1.2, "b"); p.disc(23, 15.5, 1.2, "b"); p.disc(26, 18.5, 1.2, "c");
    p.rect(16, 12, 2, 1, null); p.rect(19, 12, 2, 1, null);
    p.disc(14, 20, 2.8, "b"); p.disc(22, 20, 2.8, "b"); p.disc(14, 20, 1.2, null); p.disc(22, 20, 1.2, null);
    p.rect(14, 4, 8, 2, "b"); p.rect(17, 6, 2, 3, "b");
  },
  /* a studio microphone on a yoke: the podcast */
  podcast(p) {
    p.disc(18, 8, 7, "a"); p.rect(11, 8, 14, 11, "a");
    for (let y = 5; y <= 15; y += 2) p.rect(13, y, 10, 1, null);
    p.rect(11, 17, 14, 2, "c");
    p.rect(7, 11, 2, 11, "b"); p.rect(27, 11, 2, 11, "b"); p.rect(7, 21, 22, 2, "b");
    p.rect(17, 23, 2, 4, "a");
    p.rect(10, 27, 16, 2, "a");
  },
  /* a stills camera: the photographs */
  portfolio(p) {
    p.rect(2, 9, 32, 19, "a");
    p.rect(12, 4, 12, 5, "a");
    p.rect(26, 6, 4, 3, "c");
    p.disc(18, 18, 8, "b"); p.disc(18, 18, 5.6, null); p.disc(18, 18, 3.6, "a"); p.disc(18, 18, 1.6, null);
    p.rect(4, 11, 5, 3, null);
    p.rect(14, 6, 8, 1, null);
  },
};

export function cellsFor(kind) {
  const g = grid();
  (DRAW[kind] ?? DRAW.channel)(painter(g));
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) out.push({ x, y, c: g[y][x] });
  return out;
}

const EASE = (t) => { /* cubic-bezier(0.45, 0, 0.2, 1), solved numerically */
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; const x = 3 * 0.45 * m * (1 - m) ** 2 + 3 * 0.2 * m * m * (1 - m) + m ** 3; if (x < t) lo = m; else hi = m; }
  const s = (lo + hi) / 2; return 3 * 0 * s * (1 - s) ** 2 + 3 * 1 * s * s * (1 - s) + s ** 3;
};

export function mountPixel(canvas, kind, { reduce = false } = {}) {
  const ctx = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const colour = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, css.getPropertyValue(v).trim()]));
  let cell = 11.28, dpr = 1;
  let cells = cellsFor(kind).map((q) => ({ ...q, fx: q.x, fy: q.y, fc: q.c, a0: 1, a1: 1 }));
  let start = 0, raf = 0;
  const DUR = 820;

  function size() {
    cell = parseFloat(getComputedStyle(canvas).getPropertyValue("--cell")) || 11.28;
    dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.style.width = `${W * cell}px`; canvas.style.height = `${H * cell}px`;
    canvas.width = Math.round(W * cell * dpr); canvas.height = Math.round(H * cell * dpr);
  }
  function draw(now) {
    const s = cell * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let busy = false;
    for (const q of cells) {
      const delay = (q.y + q.x * 0.35) * 9;
      let t = start ? Math.min(1, Math.max(0, (now - start - delay) / (DUR - 300))) : 1;
      if (t < 1) busy = true;
      const e = EASE(t);
      const x = q.fx + (q.x - q.fx) * e, y = q.fy + (q.y - q.fy) * e;
      const a = q.a0 + (q.a1 - q.a0) * e;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = colour[e < 0.5 ? q.fc : q.c];
      const px = Math.round(x * s), py = Math.round(y * s);
      ctx.fillRect(px, py, Math.round((x + 1) * s) - px, Math.round((y + 1) * s) - py);
    }
    ctx.globalAlpha = 1;
    if (busy) raf = requestAnimationFrame(draw);
    else { start = 0; cells = cells.filter((q) => q.a1 > 0); }
  }
  size(); draw(0);
  addEventListener("resize", () => { size(); draw(performance.now()); });

  return function to(next) {
    const target = cellsFor(next);
    /* pair old and new cells in reading order, so the object reassembles rather than dissolves */
    const old = cells.filter((q) => q.a1 > 0).sort((a, b) => a.y - b.y || a.x - b.x);
    const n = Math.max(old.length, target.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      const o = old[Math.floor((i * old.length) / n)] ?? old[0];
      const t = target[Math.floor((i * target.length) / n)];
      if (i < target.length || t) out.push({ x: t.x, y: t.y, c: t.c, fx: o.x, fy: o.y, fc: o.c, a0: 1, a1: 1 });
    }
    /* duplicates on the same target cell are harmless; drop them once settled */
    const seen = new Set();
    cells = out.filter((q) => { const k = `${q.x},${q.y},${q.fx},${q.fy}`; if (seen.has(k)) return false; seen.add(k); return true; });
    cancelAnimationFrame(raf);
    if (reduce) { cells.forEach((q) => { q.fx = q.x; q.fy = q.y; q.fc = q.c; }); start = 0; draw(0); return; }
    start = performance.now();
    raf = requestAnimationFrame(draw);
  };
}
