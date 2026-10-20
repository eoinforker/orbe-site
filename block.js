/*
  The close: two glass orbs on the lattice under "Build your goliath."

  A large orb low on the left and a smaller one high on the right, each
  clipped by the band's edges and placed so no cell comes near the words.
  They are drawn cell by cell on half the page's lattice (5.64px; half that
  again on a phone), snapped to device pixels, so the curves stay smooth and
  every cell stays crisp.

  The glass: a rim two cells deep in light tones that turn with the light
  (Chalk at the top left, Mist, Sky, Water in the shade), a darker inner
  edge, a Chalk highlight crescent a cell in from the edge at the top left,
  and a faint dotted reflection on the open glass at the top right. The band
  shows through the rest, so the glass reads clear.

  The liquid: a light top band whose waterline climbs the wall in two steps,
  the body, and a deeper part dotted on a diamond lattice that tightens near
  the bottom. A bubble or two rise in a column, never side by side.

  The large orb is Sky over Water, filled to exactly half by area, with a
  Chalk tick out from the rim at the line: zero is typical. The small one is
  you, in Ember over Claret with a Straw glint on the surface, filled to the
  made-up creator's place in their hundred from the engine. Its fill is
  drawn at no more than 78 in 100, so clear glass always shows above it.

  On entering view the liquid rises to its level once (900ms, the page
  easing), the surface settles with one small wave, and it stops. Reduced
  motion draws the final state.
*/
import { ease } from "./assets/orbe/ease.js";

const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const PITCH = 11.28;
const FILL = 900, WAVE = 760, END = FILL + WAVE;
const YOU_MAX = 0.78;

/* the fraction of a disc's height that holds a given fraction of its area */
function heightFor(area) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const h = (lo + hi) / 2, th = 2 * Math.acos(1 - 2 * h);
    if ((th - Math.sin(th)) / (2 * Math.PI) < area) lo = h; else hi = h;
  }
  return (lo + hi) / 2;
}

/* the surface row for a fill of h (by height), measured inside the rim, so half is exactly the middle */
const RIM = 3;
const surf = (D, h) => RIM + (D - 2 * RIM) * (1 - h);

/*
  The fixed parts of one orb of radius R (D = 2R cells). Each cell keeps its
  depth from the outside (0 and 1 the rim, 2 the inner edge, 3 on the glass),
  counted in steps across cell sides, so every ring is one clean staircase.
*/
const shapes = new Map();
function shape(R) {
  if (shapes.has(R)) return shapes.get(R);
  const D = 2 * R, N = D * D;
  const layer = new Int16Array(N).fill(-1), dot = new Float32Array(N), dot2 = new Float32Array(N), hiDot = new Float32Array(N);
  let q = [];
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    const dx = i + 0.5 - R, dy = j + 0.5 - R, d = Math.hypot(dx, dy) || 1, p = j * D + i;
    if (d < R - 0.25) layer[p] = 9999;
    dot[p] = (-dx - dy) / (d * Math.SQRT2); /* towards the light, top left */
    dot2[p] = (dx - dy) / (d * Math.SQRT2); /* towards the top right */
    hiDot[p] = (-0.5 * dx - 0.866 * dy) / d; /* the highlight's light, a little steeper */
  }
  const inside = (i, j) => i >= 0 && j >= 0 && i < D && j < D && layer[j * D + i] >= 0;
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    if (!inside(i, j)) continue;
    if (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)) { layer[j * D + i] = 0; q.push(j * D + i); }
  }
  for (let L = 1; q.length; L++) {
    const next = [];
    for (const p of q) {
      const i = p % D, j = (p - i) / D;
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        const n = b * D + a;
        if (inside(a, b) && layer[n] > L) { layer[n] = L; next.push(n); }
      }
    }
    q = next;
  }
  /* the highlight: a crescent on the glass a cell in from the edge, longest on its first ring */
  const pick = (L, n) => {
    const ring = [];
    for (let p = 0; p < N; p++) if (layer[p] === L) ring.push(p);
    return ring.sort((a, b) => hiDot[b] - hiDot[a]).slice(0, n);
  };
  const n = Math.max(5, Math.min(12, Math.round(R * 0.42)));
  const hi = new Set([...pick(RIM + 1, n), ...pick(RIM + 2, Math.round(n * 0.4))]);
  const hiFirst = pick(RIM + 1, n);
  /* the reflection: a dotted arc three rings in, towards the top right, every other cell along it */
  const arc = [];
  for (let p = 0; p < N; p++) if (layer[p] === RIM + 3 && dot2[p] > 0.8) arc.push(p);
  const ang = (p) => Math.atan2(Math.floor(p / D) + 0.5 - R, (p % D) + 0.5 - R);
  const refl = new Set(arc.sort((a, b) => ang(a) - ang(b)).filter((_, k) => k % 2 === 0));
  /* each row's span, for a quick test against the words */
  const span = [];
  for (let j = 0; j < D; j++) {
    let a = -1, b = -1;
    for (let i = 0; i < D; i++) if (layer[j * D + i] >= 0) { if (a < 0) a = i; b = i; }
    span.push([a, b]);
  }
  const total = span.reduce((s, [a, b]) => s + (a < 0 ? 0 : b - a + 1), 0);
  const s = { R, D, layer, dot, hi, hiFirst, refl, span, total };
  shapes.set(R, s);
  return s;
}

export function mountOrbs(band, cv, { reduce = false, you = 93 } = {}) {
  if (!band || !cv || !cv.getContext) return { setYou() {} };
  const ctx = cv.getContext("2d");
  const C = {
    chalk: css("--orbe-chalk", "#FBFAF6"), mist: css("--orbe-mist", "#D6F6FD"), sky: css("--orbe-sky", "#9EE9FB"),
    edge: css("--action-press", "#1238D6"), water: css("--orbe-water", "#4D9AD0"),
    ember: css("--orbe-ember", "#FF5A1F"), claret: css("--orbe-claret", "#6F1726"),
    dawn: css("--orbe-dawn", "#F2A58E"), straw: css("--orbe-straw", "#EED56A"),
  };
  const LIQ = {
    sky: { top: C.mist, body: C.sky, deep: C.water, bubble: C.chalk, glint: null },
    ember: { top: C.dawn, body: C.ember, deep: C.claret, bubble: C.dawn, glint: C.straw },
  };
  let orbs = [], geo = null, done = reduce, started = false, raf = 0, t0 = 0, last = 0;

  /* the rim's colour: its outer ring lighter than its second, both turning with the light */
  function rim(L, d) {
    if (L === 0) return d > 0.35 ? C.chalk : d < -0.5 ? C.sky : C.mist;
    return d > 0.55 ? C.mist : d < -0.45 ? C.water : C.sky;
  }

  /*
    One orb's cells for a moment: liquid up to `h` (a fraction of its height),
    the surface offset by `wave(i)` rows. Returns [i, j, colour] in its own grid.
  */
  function cells(o, h, wave, final) {
    const { R, D, layer, dot, hi, refl } = o.s, L = LIQ[o.liquid], out = [];
    const top = h > 0.001 ? surf(D, h) : D; /* the surface, in rows from the orb's top */
    const climbs = top > R * 0.6; /* the waterline climbs the wall, except where the wall leans over it */
    const isLiq = (i, j) => {
      if (i < 0 || j < 0 || i >= D || j >= D) return false;
      const k = layer[j * D + i];
      if (k < 2) return false;
      const y = j + 0.5 - top - wave(i);
      if (y > 0) return true;
      /* the meniscus: below the middle, two rows up on the glass's first ring and one on the next two; above it, one row on the first ring */
      return climbs && h > 0.02 && ((k === RIM && y > (top > R ? -2 : -1)) || ((k === RIM + 1 || k === RIM + 2) && top > R && y > -1));
    };
    const lh = Math.max(1, D - RIM - top), finalTop = Math.round(surf(D, heightFor(o.level)));
    const bub = final ? o.bubbles(finalTop, o.s) : [];
    const nearBub = (i, j) => bub.some(([x, y]) => Math.abs(x - i) <= 1 && Math.abs(y - j) <= 1);
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
      const p = j * D + i, k = layer[p];
      if (k < 0) continue;
      let c, surface = false;
      if (k < 2) c = rim(k, dot[p]);
      else if (isLiq(i, j)) {
        const depth = (j + 0.5 - top) / lh;
        /* the inner edge takes the deep tone only in the liquid's lower part, so the glass stays light */
        if (k === 2) c = depth > 0.5 ? L.deep : L.body;
        else if (!isLiq(i, j - 1)) { c = o.glint && final && o.glint(i, o.s) ? L.glint : L.top; surface = true; }
        else {
          /*
            The deep part: first the deep tone as a sparse diamond lattice on
            the body, then, lower, the deep tone itself with the body as the
            same lattice, so the dots stay one pattern and the tone deepens.
          */
          const diamond = (i % 4 === 0 && j % 4 === 0) || (i % 4 === 2 && j % 4 === 2);
          c = L.body;
          if (bub.some(([x, y]) => x === i && y === j)) c = L.bubble;
          /* a small orb has too few cells for dots to read as a pattern (they would read as a face): a two row dither, then the deep tone */
          else if (R < 16) c = depth > 0.72 || (depth > 0.6 && (i + j) % 2 === 0) ? L.deep : L.body;
          else if (depth > 0.78) c = diamond && k > RIM ? L.body : L.deep;
          else if (k > RIM && !nearBub(i, j) && depth > 0.46 && diamond) c = L.deep;
        }
      } else if (k === 2) c = C.edge;
      /* the reflection only where the glass is open: three rows or more above the water */
      else if (refl.has(p) && j + 3.5 <= top) c = C.sky;
      /* the highlight sits on the glass and never breaks the waterline */
      if (hi.has(p) && !surface) c = C.chalk;
      if (c) out.push([i, j, c]);
    }
    if (o.tick) for (const [i, j] of o.tick(finalTop, o.s)) out.push([i, j, C.chalk]);
    return out;
  }

  /* where the words are, as lattice cells nothing may touch, with a running count per row */
  function blocked(B, cell, cols, rows) {
    const keep = [];
    for (const el of band.querySelectorAll(".ob-giant, .block-lede, .form-note")) {
      const rg = document.createRange(); rg.selectNodeContents(el);
      for (const q of rg.getClientRects()) keep.push(q);
    }
    for (const el of band.querySelectorAll(".reserve > *:not(.ob-sr)")) {
      const q = el.getBoundingClientRect();
      if (q.width && getComputedStyle(el).display !== "none") keep.push(q);
    }
    const grid = new Uint8Array(cols * rows), pad = 16;
    for (const q of keep) {
      if (!q.width || !q.height) continue;
      const x0 = Math.max(0, Math.floor((q.left - B.left - pad) / cell)), x1 = Math.min(cols - 1, Math.floor((q.right - B.left + pad) / cell));
      const y0 = Math.max(0, Math.floor((q.top - B.top - pad) / cell)), y1 = Math.min(rows - 1, Math.floor((q.bottom - B.top + pad) / cell));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * cols + x] = 1;
    }
    const sum = new Uint32Array((cols + 1) * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) sum[y * (cols + 1) + x + 1] = sum[y * (cols + 1) + x] + grid[y * cols + x];
    return { grid, hits: (y, x0, x1) => sum[y * (cols + 1) + x1 + 1] - sum[y * (cols + 1) + x0] };
  }

  /*
    The best place for an orb: as much of it showing as the words allow, cut
    by its own edges of the band (left or bottom for the large one, right for
    the small one), with its highlight, waterline and tick in view and, for
    the large one, never cut near its middle.
  */
  function place(o, cols, rows, words, side, Rs, prefer, strict = true) {
    let best = null;
    for (const R of Rs) {
      const s = shape(R), D = s.D, top = Math.round(surf(D, heightFor(o.level)));
      const extra = o.tick ? o.tick(top, s) : [];
      const must = [...extra, ...(strict ? [...s.hi].map((p) => [p % D - 2, Math.floor(p / D)]) : [])];
      for (let i = 0; i < D; i++) if (s.layer[top * D + i] >= 2 && (side === "l" ? i >= R * 1.3 : i < R * 0.7)) must.push([i, top]);
      const xs = side === "l" ? [-Math.floor(D * (strict ? 0.3 : 0.62)), cols - D] : [cols - D + 1, cols - Math.ceil(D * 0.58)];
      const ys = side === "l" ? [0, rows - Math.ceil(D * 0.5)] : [0, rows - D];
      for (let oy = ys[0]; oy <= ys[1]; oy++) for (let ox = xs[0]; ox <= xs[1]; ox++) {
        const cut = side === "l" ? ox < 0 || oy + D > rows : ox + D > cols;
        if (!cut || !prefer(ox, oy, D)) continue;
        if (!must.every(([i, j]) => ox + i >= 0 && ox + i < cols && oy + j >= 0 && oy + j < rows)) continue;
        if (extra.some(([i, j]) => words.grid[(oy + j) * cols + ox + i])) continue;
        let seen = 0, ok = true;
        for (let j = 0; j < D; j++) {
          const y = oy + j, [a, b] = s.span[j];
          if (y < 0 || y >= rows || a < 0) continue;
          const x0 = Math.max(0, ox + a), x1 = Math.min(cols - 1, ox + b);
          if (x0 > x1) continue;
          if (words.hits(y, x0, x1)) { ok = false; break; }
          seen += x1 - x0 + 1;
        }
        if (!ok) continue;
        const frac = 1 - seen / s.total;
        if (frac < 0.08 || frac > 0.5) continue;
        /* enough of the liquid shows below the line */
        if (side === "l" && rows - (oy + top) < Math.min(D - top - RIM, Math.ceil(R * 0.6))) continue;
        const cy = (oy + R) / rows, score = seen * (1 + 0.3 * (side === "l" ? cy : 1 - cy));
        if (!best || score > best.score) best = { score, seen, ox, oy, s };
      }
    }
    return best || (strict ? place(o, cols, rows, words, side, Rs, prefer, false) : null);
  }

  function layout() {
    const W = band.clientWidth, H = band.clientHeight, B = band.getBoundingClientRect();
    const cell = W >= 900 ? PITCH / 2 : PITCH / 4;
    const dpr = Math.min(3, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), words = blocked(B, cell, cols, rows);
    const range = (a, b) => Array.from({ length: Math.max(0, a - b + 1) }, (_, k) => a - k);
    const fine = cell < PITCH / 2;
    const bigMax = fine ? 26 : W >= 1600 ? 38 : W >= 1280 ? 32 : 28;
    /* the large orb: Sky to exactly half, and a three cell Chalk tick out from the rim on the words' side, on the waterline */
    const big = {
      liquid: "sky", level: 0.5,
      tick: (top, s) => [[s.D, top], [s.D + 1, top], [s.D + 2, top]],
      /* bubbles rise in a column right of the middle, one cell and two, never side by side */
      bubbles: (top, s) => [[s.R + Math.round(s.R * 0.3), top + 4], [s.R + Math.round(s.R * 0.36), top + 8], [s.R + Math.round(s.R * 0.36), top + 9]],
    };
    /* the small one: you, in Ember, drawn at no more than 78 in 100; a Straw glint on the surface left of the middle, and one bubble */
    const small = {
      liquid: "ember", level: Math.min(YOU_MAX, you / 100),
      glint: (i, s) => i >= s.R - Math.round(s.R * 0.55) && i < s.R - Math.round(s.R * 0.25),
      bubbles: (top, s) => [[s.R + Math.round(s.R * 0.2), top + 5]],
    };
    orbs = [];
    const bp = place(big, cols, rows, words, "l", range(bigMax, fine ? 12 : 14), (ox, oy, D) => fine || oy + D / 2 >= rows * 0.5);
    if (bp) orbs.push({ ...big, ...bp });
    const bR = bp ? bp.s.R : 20, bCy = bp ? bp.oy + bR : rows;
    /* the small one stays clearly the smaller: about two thirds of the large one */
    const sMax = Math.round(bR * 0.7), sMin = Math.min(sMax, fine ? 11 : 12);
    const sp = place(small, cols, rows, words, "r", range(sMax, sMin), (ox, oy, D) => oy + D / 2 < bCy - 4);
    if (sp) orbs.push({ ...small, ...sp });
    geo = { cell, dpr };
  }

  function draw(t) {
    if (!geo) return;
    const { cell, dpr } = geo;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const fill = done ? 1 : ease(Math.max(0, Math.min(1, t / FILL)));
    const s = done ? 1 : Math.max(0, Math.min(1, (t - FILL) / WAVE));
    /* one small wave travels across the surface, two cells at most, and dies away */
    const amp = done || t < FILL ? 0 : 1.7 * (1 - ease(s));
    const X = (c) => Math.round(c * cell * dpr);
    for (const o of orbs) {
      const h = heightFor(o.level * fill), D = o.s.D;
      const wave = (i) => (amp ? Math.round(amp * Math.sin((i / D) * Math.PI * 2.4 - s * Math.PI * 2.6)) : 0);
      for (const [i, j, c] of cells(o, h, wave, done || t >= FILL)) {
        const x = o.ox + i, y = o.oy + j;
        ctx.fillStyle = c;
        ctx.fillRect(X(x), X(y), X(x + 1) - X(x), X(y + 1) - X(y));
      }
    }
  }
  const run = (now) => {
    if (!t0) t0 = now;
    last = now - t0;
    if (last >= END) { done = true; draw(END); return; }
    draw(last);
    raf = requestAnimationFrame(run);
  };

  layout();
  draw(0);
  const start = () => { if (started || done) return; started = true; raf = requestAnimationFrame(run); };
  if (!done && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { threshold: 0.35 });
    io.observe(band);
  } else if (!done) { done = true; draw(END); }

  let rs = 0;
  const redo = () => { clearTimeout(rs); rs = setTimeout(() => { layout(); draw(done ? END : last); }, 80); };
  addEventListener("resize", redo);
  document.fonts?.ready.then(redo);
  /* the made-up creator in the instrument changes: so does your level */
  return {
    setYou(n) {
      const v = Math.max(1, Math.min(99, Math.round(n)));
      if (v === you) return;
      you = v; layout(); draw(done ? END : last);
    },
  };
}
