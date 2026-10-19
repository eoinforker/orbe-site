/*
  The close's pixel art. Two creatures without faces, hand-drawn as cell
  maps on the page's lattice, reach in from the block's left and right
  edges and are clipped by its rounded corners. Each is a Sky or Straw
  body with a diamond dot fill in deep Cobalt, a one cell outline in a
  lighter tone of its body, and a one cell ring of lighter Cobalt around
  it. A few small clusters of lighter and deeper Cobalt sit about the
  block. On entering view the cells settle in once, column by column from
  the edge; reduced motion draws them still. No cell ever sits on the words.
*/
import { ease } from "./pixels.js";

/* x is body; anything else is empty. Drawn as it enters: column 0 is the block's edge for the left one, the last column for the right one. */
const LEFT = [
  "xxxx                      ",
  "xxxxx                     ",
  "xxxxxx                    ",
  "xxxxxxx       xxx         ",
  "xxxxxxxx     xxxxx        ",
  "xxxxxxxxx   xxxxxx        ",
  "xxxxxxxxxx xxxxxx         ",
  "xxxxxxxxxxxxxxxx          ",
  "xxxxxxxxxxxxxxx           ",
  "xxxxxxxxxxxxx             ",
  "xxxxxxxxxxxx              ",
  "xxxxxxxxxxx               ",
  "xxxxxxxxxxxx              ",
  "xxxxxxxxxxxxxx            ",
  "xxxxxxxxxxxxxxxxxx        ",
  "xxxxxxxxxxxxxxxxxxxxxx    ",
  "xxxxxxxxxxxxxxxxxxxxxxxx  ",
  "xxxxxxxxxxxxxxxxxxxxxxxxx ",
  "xxxxxxxxxxxxxxxxxxxxxxxx  ",
  "xxxxxxx   xxxxxxxxxxxxx   ",
  "xxxxxx     xxxxxxxxxx     ",
  "xxxxxxx   xxxxxxx         ",
  "xxxxxxxxxxxxxxx           ",
  "xxxxxxxxxxxxx             ",
  "xxxxxxxxxxxx              ",
  "xxxxxxxxxxx               ",
  "xxxxxxxxxxx               ",
  "xxxxxxxxxx                ",
  "xxxxxxxxx                 ",
  "xxxxxxxxx                 ",
  "xxxxxxxx                  ",
  "xxxxxxx                   ",
  "xxxxx                     ",
  "xxx                       ",
];
const RIGHT = [
  "         xxxxxxxxxxxxxxxxx",
  "          xxxxxxxxxxxxxxxx",
  "           xxxxxxxxxxxxxxx",
  "     xxx    xxxxxxxxxxxxxx",
  "    xxxxx  xxxxxxxxxxxxxxx",
  "    xxxxxxxxxxxxxxxxxxxxxx",
  "     xxxxxxxxxxxxxxxxxxxxx",
  "       xxxxxxxxxxxxxxxxxxx",
  "        xxxxxxxxxxxxxxxxxx",
  "        xxxxxxxxxxxxxxxxxx",
  "       xxxxxxxxxxxxxxxxxxx",
  "      xxxxxxxxxx  xxxxxxxx",
  "      xxxxxxxxx    xxxxxxx",
  "       xxxxxxxx   xxxxxxxx",
  "        xxxxxxxxxxxxxxxxxx",
  "         xxxxxxxxxxxxxxxxx",
  "          xxxxxxxxxxxxxxx ",
  "          xxxxxxxxxxxxxx  ",
  "         xxxxxxxxxxxxx    ",
  "        xxxxxxx xxxxx     ",
  "        xxxxxx   xxxx     ",
  "         xxxx    xxxx     ",
  "                 xxxx     ",
  "                 xxx      ",
  "                  xx      ",
];
/* small clusters, placed by fraction of the block */
const CLUSTERS = [
  { at: [0.21, 0.07], tone: "deep", map: ["xx ", " xx", " x "] },
  { at: [0.25, 0.17], tone: "light", map: ["x"] },
  { at: [0.17, 0.24], tone: "light", map: ["x x"] },
  { at: [0.79, 0.84], tone: "deep", map: ["x x", "xxx", "  x"] },
  { at: [0.74, 0.92], tone: "light", map: ["xx"] },
  { at: [0.86, 0.72], tone: "light", map: ["x"] },
  { at: [0.88, 0.93], tone: "deep", map: [" x", "xx"] },
  { at: [0.69, 0.06], tone: "light", map: ["x", "x"] },
];
const C = {
  sky: "#9EE9FB", skyEdge: "#D6F6FD",
  straw: "#EED56A", strawEdge: "#F5E9B7",
  dot: "#1238D6", light: "#3E64FE", deep: "#1238D6",
};

const parse = (rows) => rows.map((r) => [...r].map((ch) => ch === "x"));

export function mountBlockArt(block, cv, { reduce = false } = {}) {
  if (!block || !cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  const L = parse(LEFT), R = parse(RIGHT);
  let cells = [], done = reduce, raf = 0, t0 = 0;

  /* one creature: body, outline and ring, in block cells, with each cell's distance from its edge */
  function creature(map, ox, oy, side, body, edge) {
    const h = map.length, w = map[0].length;
    const atEdge = (x) => (side === "l" ? x < 0 : x >= w);
    const inside = (x, y) => (y < 0 || y >= h ? false : atEdge(x) ? true : x < 0 || x >= w ? false : map[y][x]);
    const out = [];
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const from = side === "l" ? x : w - 1 - x;
      if (inside(x, y)) {
        if (x < 0 || x >= w) continue;
        const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        /* a diamond of five cells on a staggered pitch of four */
        const u = ((x % 4) + 4) % 4, v = ((y % 4) + 4) % 4, row = Math.floor(y / 4) % 2 ? 2 : 0;
        const du = (u - row + 4) % 4, dot = (du === 1 && v === 1) || (du === 1 && v === 0) || (du === 1 && v === 2) || (du === 0 && v === 1) || (du === 2 && v === 1);
        out.push({ x: ox + x, y: oy + y, c: rim ? edge : dot ? C.dot : body, d: from });
      } else if (x >= 0 && x < w && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) {
        out.push({ x: ox + x, y: oy + y, c: C.light, d: from });
      }
    }
    return out;
  }

  function layout() {
    const W = block.clientWidth, H = block.clientHeight;
    const cell = W >= 1024 ? 8 : W >= 680 ? 7 : 5;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    const cols = Math.floor(W / cell), rows = Math.ceil(H / cell);
    /* how far each creature reaches in: all of it on a wide block, less as the words take the width */
    const reach = W >= 1024 ? 26 : W >= 680 ? 14 : 6;
    const lx = reach - L[0].length, rx = cols - reach;
    const ly = Math.max(0, rows - L.length + 4), ry = -2;
    /* the words' own boxes, a cell wider all round: nothing is drawn there */
    const B = block.getBoundingClientRect();
    const keep = [];
    for (const el of block.querySelectorAll(".giant, .block-lede, .form-note")) {
      const rg = document.createRange(); rg.selectNodeContents(el);
      for (const r of rg.getClientRects()) keep.push(r);
    }
    for (const el of block.querySelectorAll(".reserve > *:not(.sr)")) keep.push(el.getBoundingClientRect());
    const pad = cell * 1.5;
    const clear = (c) => {
      const x = c.x * cell + B.left, y = c.y * cell + B.top;
      return !keep.some((r) => x + cell > r.left - pad && x < r.right + pad && y + cell > r.top - pad && y < r.bottom + pad);
    };
    cells = [
      ...creature(L, lx, ly, "l", C.sky, C.skyEdge),
      ...creature(R, rx, ry, "r", C.straw, C.strawEdge),
    ];
    for (const k of CLUSTERS) {
      const cx = Math.round(k.at[0] * cols), cy = Math.round(k.at[1] * rows);
      k.map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "x") cells.push({ x: cx + x, y: cy + y, c: C[k.tone], d: 30, cluster: true }); }));
    }
    cells = cells.filter(clear);
    return { cell, dpr };
  }
  let geo = layout();

  function draw(t) {
    const { cell, dpr } = geo;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const c of cells) {
      /* each column arrives 22ms after the one nearer the edge, over 360ms; clusters come last */
      const k = done ? 1 : ease(Math.max(0, Math.min(1, (t - c.d * 22) / 360)));
      if (k <= 0) continue;
      ctx.globalAlpha = k;
      ctx.fillStyle = c.c;
      ctx.fillRect(c.x * cell, c.y * cell + (1 - k) * cell * 0.6, cell, cell);
    }
    ctx.globalAlpha = 1;
  }
  const END = 30 * 22 + 360;
  const run = (now) => {
    if (!t0) t0 = now;
    const t = now - t0;
    draw(t);
    if (t < END) raf = requestAnimationFrame(run); else { done = true; draw(END); }
  };

  draw(done ? END : 0);
  if (!done && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); raf = requestAnimationFrame(run); }
    }, { threshold: 0.35 });
    io.observe(block);
  } else if (!done) { done = true; draw(END); }

  let rs = 0;
  const redo = () => { clearTimeout(rs); rs = setTimeout(() => { geo = layout(); if (done) draw(END); }, 60); };
  addEventListener("resize", redo);
  document.fonts?.ready.then(redo);
}
