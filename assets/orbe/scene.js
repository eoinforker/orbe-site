/*
  The band scene: one crafted Orbe object, drawn on the lattice into a
  product band, in the free space on the band's right side.

    import { mountScene, orb } from "../assets/orbe/scene.js";
    mountScene(band, {
      item: { make: orb({ level: 0.93, liquid: ["mist", "sky", "water", "press"] }), size: [150, 260] },
      light: "water", dark: "ink", specks: { colors: ["sky", "ember"], n: 3 },
    });

  One piece, never a crowd. A page that wants no art does not mount one.

  How it places it. Every word, chip, link, control and window inside the
  band is measured (text by its line boxes, controls by their boxes), and so
  is the header bar above it (`ceiling`). Those cells are a no-go zone, with
  a distance to the nearest one for every free cell. The object takes the
  largest size in its range that keeps `calm` px of clear band round it on
  every side the words are on, with its centre in the right half of the
  content column (`side`). The band's right and bottom edges are open, so it
  may bleed off them by up to `cut` of its cells. Among the places that fit,
  it takes the one with the most room round it. When it cannot fit even at
  its smallest (most phones), nothing is drawn and the canvas hides, so the
  band never grows for it.

  How it draws. Cells are 5.64px (half the page lattice; 2.82px under 721px),
  snapped to device pixels so every edge is crisp; the tools from
  ../../pixels.js sit on the half lattice. Colour comes from gradient light
  (lit from the top left, deeper to the lower right), and the object is
  dressed on the lattice: a one cell light outline, light dots on a diamond
  lattice over its dark tones and sparse dark dots over its light ones, with
  edges and highlights plain. Up to three small clusters of two to six cells
  sit near it, clear of the words and of each other.

  Motion. Once fonts are ready the object rises into place up its columns
  and an orb's liquid fills to its level, about a second in all, then
  nothing runs. Reduced motion draws the final state. A ResizeObserver
  redraws the final state when the band changes size.

  Faces. Nothing here may read as one: no pair of small marks side by side.
  Orbs carry no bubbles, highlights are single crescents, grilles run as
  lines, clusters are never a single cell and keep 8 cells apart, and the
  game pad loses its Select and Start. The camera is drawn here, not taken
  from the homepage: one lens with a crescent and no catchlight dot, no
  viewfinder window and no flash, so nothing pairs with the lens. The moth
  and the pan stay out.
*/
import { ease, reducedMotion } from "./ease.js";
import { piece } from "../../pixels.js";

export const CELL = 5.64;

/* ---------------------------------------------------------------- colour */
const FALLBACK = {
  ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", linen: "#E7E2D7", stone: "#A29E95", graphite: "#38342E", soot: "#2A2824",
  sky: "#94E6FF", mist: "#D6F6FD", water: "#4D9AD0", cobalt: "#1F4BFF", press: "#1238D6",
  straw: "#F5D34A", ochre: "#C9A84C", ember: "#FF5A1F", dawn: "#F2A58E", peony: "#F2879E", blush: "#FBD9E0", claret: "#6F1726",
};
let tokens = null;
/* a brand colour by name (read from --orbe-*, --action-press for press), or a hex as given */
export function tone(name) {
  if (name.startsWith("#")) return name;
  if (!tokens) {
    tokens = {};
    const cs = getComputedStyle(document.documentElement);
    for (const k of Object.keys(FALLBACK)) {
      const v = cs.getPropertyValue(k === "press" ? "--action-press" : `--orbe-${k}`).trim();
      tokens[k] = /^#[0-9a-f]{6}$/i.test(v) ? v : FALLBACK[k];
    }
  }
  return tokens[name] ?? FALLBACK.ink;
}
const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
/* a to b by t */
export const mix = (a, b, t) => { const p = rgb(tone(a)), q = rgb(tone(b)); return hex(p.map((v, k) => v + (q[k] - v) * t)); };
/* a gradient through named stops, t from 0 (lit) to 1 (shade); colours are memoised per stop list */
const gradCache = new Map();
export function grad(stops, t) {
  const key = stops.join();
  let g = gradCache.get(key);
  if (!g) { g = stops.map((s) => rgb(tone(s))); gradCache.set(key, g); }
  t = Math.max(0, Math.min(1, t)) * (g.length - 1);
  const k = Math.min(g.length - 2, Math.floor(t)), f = t - k;
  return hex(g[k].map((v, n) => v + (g[k + 1][n] - v) * f));
}

/* ---------------------------------------------------------------- shapes in cells */
/* depth of each cell from the outside of a mask, counted across cell sides, so rings are clean staircases */
function depths(w, h, inside) {
  const layer = new Int16Array(w * h).fill(-1);
  const q0 = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inside(i, j)) layer[j * w + i] = 9999;
  const isIn = (i, j) => i >= 0 && j >= 0 && i < w && j < h && layer[j * w + i] >= 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!isIn(i, j)) continue;
    if (!isIn(i - 1, j) || !isIn(i + 1, j) || !isIn(i, j - 1) || !isIn(i, j + 1)) { layer[j * w + i] = 0; q0.push(j * w + i); }
  }
  for (let L = 1, q = q0; q.length; L++) {
    const next = [];
    for (const p of q) {
      const i = p % w, j = (p - i) / w;
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        const n = b * w + a;
        if (isIn(a, b) && layer[n] > L) { layer[n] = L; next.push(n); }
      }
    }
    q = next;
  }
  return layer;
}

/* the fraction of a disc's height that holds a given fraction of its area */
export function heightFor(area) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const h = (lo + hi) / 2, th = 2 * Math.acos(1 - 2 * h);
    if ((th - Math.sin(th)) / (2 * Math.PI) < area) lo = h; else hi = h;
  }
  return (lo + hi) / 2;
}

/*
  A glass orb filled to `level` (a fraction of its area, so 0.5 sits exactly
  at the middle). Size is its diameter in cells.
    rim     the glass ring, lit to shade (four stops)
    liquid  the liquid, lit to deep (four stops)
    tint    the faint sheen on the open glass, or null
  The liquid is shaded as a sphere lit from the top left, so its gradient is
  smooth across the cells; the pixel detail is the stepped rim, a waterline
  that climbs the glass, one highlight crescent and the bounce of light
  inside the liquid at the lower right. No bubbles: two dots read as eyes.
*/
const LX = -0.46, LY = -0.62, LZ = 0.64;
export function orb({ level = 0.5, rim = ["chalk", "mist", "sky", "water"], liquid = ["mist", "sky", "water", "press"], tint = "chalk" } = {}) {
  return (D) => {
    D = Math.max(14, Math.round(D / 2) * 2);
    const R = D / 2, RIM = 3;
    const layer = depths(D, D, (i, j) => Math.hypot(i + 0.5 - R, j + 0.5 - R) < R - 0.25);
    const lit = new Float32Array(D * D), lam = new Float32Array(D * D), ang = new Float32Array(D * D);
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
      const dx = i + 0.5 - R, dy = j + 0.5 - R, d = Math.hypot(dx, dy) || 1, p = j * D + i;
      lit[p] = (-dx - dy) / (d * Math.SQRT2);
      const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      lam[p] = nx * LX + ny * LY + nz * LZ;
      ang[p] = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    /* the highlight: one crescent on the glass at the top left, two rings deep in a large orb */
    const hi = new Set();
    for (let p = 0; p < D * D; p++) {
      const k = layer[p], a = ang[p];
      if (k === RIM && a > -158 && a < (R >= 12 ? -104 : -118)) hi.add(p);
      if (R >= 14 && k === RIM + 1 && a > -148 && a < -122) hi.add(p);
    }
    const surf = (h) => RIM + (D - 2 * RIM) * (1 - h);
    const finalTop = surf(heightFor(level));
    const occ = new Uint8Array(D * D);
    for (let p = 0; p < D * D; p++) occ[p] = layer[p] >= 0 ? 1 : 0;
    const must = [...hi].map((p) => [p % D, Math.floor(p / D)]);
    const ft = Math.min(D - 1, Math.round(finalTop));
    for (let i = 0; i < D; i++) if (layer[ft * D + i] >= RIM && i < R) must.push([i, ft]);
    function cells(f = 1) {
      const out = [];
      const h = heightFor(level * f), top = h > 0.001 ? surf(h) : D;
      const lh = Math.max(1, D - RIM - top);
      const wet = (i, j) => {
        if (j < 0) return false;
        const k = layer[j * D + i];
        if (k < 2) return false;
        const y = j + 0.5 - top;
        if (y > 0) return true;
        /* the meniscus: the waterline climbs one row where it meets the glass */
        return h > 0.03 && top > R * 0.45 && k <= RIM && y > -1;
      };
      const sheen = [];
      for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
        const p = j * D + i, k = layer[p];
        if (k < 0) continue;
        const shade = (1 - lam[p]) / 2; /* 0 lit, 1 shade */
        let c = null;
        const surface = wet(i, j) && !wet(i, j - 1);
        if (k < 2) c = grad(rim, Math.min(1, ((1 - lit[p]) / 2) * 0.95 + k * 0.12));
        else if (wet(i, j)) {
          const depth = (j + 0.5 - top) / lh;
          if (surface) c = grad(liquid, 0.02 + shade * 0.2);
          else {
            c = grad(liquid, 0.16 + shade * 0.62 + depth * 0.2 + (k === 2 ? 0.08 : 0));
            /* the bounce: light through the glass, a lighter line just inside the rim at the lower right */
            if (k === RIM && lit[p] < -0.8 && depth > 0.3) c = grad(liquid, 0.1 + shade * 0.3);
          }
        } else if (k === 2) c = mix(grad(rim, 0.55 + ((1 - lit[p]) / 2) * 0.45), grad(rim, 1), 0.25);
        else if (tint) sheen.push([i, j, tone(tint), 0.03 + 0.2 * Math.max(0, lam[p]) ** 3]);
        if (hi.has(p) && !surface) c = tone("chalk");
        if (c) out.push([i, j, c]);
      }
      return sheen.concat(out);
    }
    return { w: D, h: D, occ, must, fill: true, cells };
  };
}

/*
  A roster in depth: one large orb in front and smaller ones stepping back
  behind it to one side (never one each side, which would read as a face),
  each crafted at full detail and filled to its own level. The first level
  is the front orb. Size is the group's width in cells.
*/
export function orbDepth({ levels = [0.5, 0.5, 0.5], ...rest } = {}) {
  return (W) => {
    const m = Math.min(3, levels.length);
    const scale = [1, 0.7, 0.5].slice(0, m);
    /* each one behind starts 80% of the way across the one in front, and sits higher */
    const lay = (Ds) => {
      const xs = [0], bs = [0];
      for (let k = 1; k < m; k++) { xs.push(Math.round(xs[k - 1] + Ds[k - 1] * 0.8)); bs.push(Math.round(bs[k - 1] - Ds[k - 1] * 0.3)); }
      return { xs, bs, width: Math.max(...Ds.map((D, k) => xs[k] + D)) };
    };
    const across = lay(scale.map((k) => k * 100)).width / 100;
    const D = Math.max(16, Math.round(W / across / 2) * 2);
    const Ds = scale.map((k) => Math.max(14, Math.round((D * k) / 2) * 2));
    const { xs, bs } = lay(Ds);
    const minTop = Math.min(...Ds.map((d, k) => bs[k] - d));
    const oy = (k) => bs[k] - Ds[k] - minTop;
    const parts = levels.slice(0, m).map((level, k) => orb({ ...rest, level })(Ds[k]));
    const w = Math.max(...parts.map((o, k) => xs[k] + o.w)), h = Math.max(...parts.map((o, k) => oy(k) + o.h));
    const occ = new Uint8Array(w * h), owner = new Int8Array(w * h).fill(-1);
    /* nearest wins: paint the back first, the front last */
    for (let k = m - 1; k >= 0; k--) {
      const o = parts[k];
      for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (o.occ[j * o.w + i]) { const p = (oy(k) + j) * w + xs[k] + i; occ[p] = 1; owner[p] = k; }
    }
    const must = [];
    parts.forEach((o, k) => { for (const [i, j] of o.must) if (owner[(oy(k) + j) * w + xs[k] + i] === k) must.push([xs[k] + i, oy(k) + j]); });
    const cells = (f = 1) => {
      const out = [];
      for (let k = m - 1; k >= 0; k--) {
        const fk = Math.max(0, Math.min(1, f * 1.3 - (m - 1 - k) * 0.1));
        for (const [i, j, c, a] of parts[k].cells(fk)) {
          const x = xs[k] + i, y = oy(k) + j;
          /* a cell hidden by a nearer orb is not drawn: the glass in front reads clean */
          if (owner[y * w + x] === k) out.push([x, y, c, a]);
        }
      }
      return out;
    };
    return { w, h, occ, must, fill: true, cells };
  };
}

/*
  A general object from a design drawn in its own units: `parts` are layers,
  each { shape(x, y) in units, stops (lit to shade), edge: bevel strength }.
  Each cell takes its layer's gradient along the light (top left to lower
  right across the whole object), with a one cell bevel: lighter where the
  cell faces the light, deeper where it faces away.
*/
function drawn(Wu, Hu, parts, { rot = 0, must: mustU = [] } = {}) {
  return (H) => {
    const S = H / Hu;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    /* the rotated design's box */
    const cx = Wu / 2, cy = Hu / 2;
    const corners = [[0, 0], [Wu, 0], [0, Hu], [Wu, Hu]].map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
    const minX = Math.min(...corners.map((c) => c[0])), maxX = Math.max(...corners.map((c) => c[0]));
    const minY = Math.min(...corners.map((c) => c[1])), maxY = Math.max(...corners.map((c) => c[1]));
    const w = Math.ceil((maxX - minX) * S), h = Math.ceil((maxY - minY) * S);
    /* a cell centre back to design units */
    const at = (i, j) => {
      const X = (i + 0.5) / S + minX - cx, Y = (j + 0.5) / S + minY - cy;
      return [cx + X * cos + Y * sin, cy - X * sin + Y * cos];
    };
    const owner = new Int16Array(w * h).fill(-1);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const [x, y] = at(i, j);
      for (let L = parts.length - 1; L >= 0; L--) if (parts[L].shape(x, y)) { owner[j * w + i] = L; break; }
    }
    const occ = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) occ[p] = owner[p] >= 0 ? 1 : 0;
    const out = [];
    const own = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? -1 : owner[j * w + i]);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const L = owner[j * w + i];
      if (L < 0) continue;
      const P = parts[L];
      if (P.clear) continue;
      const [x, y] = at(i, j);
      let t = P.light ? P.light(x, y) : (i / w + j / h) / 2;
      const e = P.edge ?? 0.18;
      /* the bevel: against other parts too, so each part reads as its own piece */
      if (own(i - 1, j) !== L || own(i, j - 1) !== L) t -= e;
      if (own(i + 1, j) !== L || own(i, j + 1) !== L) t += e;
      const c = P.color ? P.color(x, y, t, i, j) : grad(P.stops, t);
      if (c) out.push([i, j, c]);
    }
    const must = mustU.map(([x, y]) => {
      const X = x - cx, Y = y - cy;
      return [Math.round((cx + X * cos - Y * sin - minX) * S), Math.round((cy + X * sin + Y * cos - minY) * S)];
    });
    return { w, h, occ, must, cells: () => out };
  };
}

/* shape helpers in design units */
const disc = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const ringU = (cx, cy, r0, r1) => (x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r0 && d <= r1; };
const box = (x0, y0, x1, y1, r = 0) => (x, y) => {
  const qx = Math.max(x0 + r - x, 0, x - (x1 - r)), qy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return x >= x0 && x <= x1 && y >= y0 && y <= y1 && qx * qx + qy * qy <= r * r;
};
const seg = (x0, y0, x1, y1, wd) => (x, y) => {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= wd / 2;
};
const any = (...fs) => (x, y) => fs.some((f) => f(x, y));
const all = (...fs) => (x, y) => fs.every((f) => f(x, y));
const not = (f) => (x, y) => !f(x, y);
const diag = (W, H) => (x, y) => (x / W + y / H) / 2;


/*
  A studio microphone: a domed head with a grille of horizontal slots, a
  collar, a solid lower body, the yoke under it, the stem and a weighted
  base. Size is its height in cells. Every part is shaded as a cylinder lit
  from the left, so the light runs smoothly round it.
    head   the grille's metal, lit to shade
    body   the lower body, lit to shade
    metal  the collar, yoke, stem and base, lit to shade
*/
export function mic({ head = ["chalk", "blush", "peony", "claret"], body = ["peony", "claret", "ink"], metal = ["blush", "claret", "ink"], slot = "claret" } = {}) {
  const W = 38, H = 62, cx = 19;
  /* a cylinder's light across x, from 0 (lit, a little left of the middle) to 1 (shade) */
  const cyl = (half, lift = 0) => (x, y) => {
    const nx = Math.max(-1, Math.min(1, (x - cx) / half));
    const l = -nx * 0.62 + Math.sqrt(1 - nx * nx) * 0.7 + lift * (1 - y / H);
    return Math.max(0, Math.min(1, 0.92 - l * 0.8));
  };
  const headS = any(disc(cx, 13, 10.5), box(cx - 10.5, 13, cx + 10.5, 26));
  const headIn = any(disc(cx, 13, 8.6), box(cx - 8.6, 13, cx + 8.6, 24.2));
  const yoke = all(ringU(cx, 31, 13.2, 15), (x, y) => y >= 31);
  return drawn(W, H, [
    { shape: any(yoke, box(cx - 15, 27.5, cx - 13.2, 31), box(cx + 13.2, 27.5, cx + 15, 31)), stops: metal, edge: 0.12, light: cyl(16) },
    { shape: box(cx - 1.6, 45, cx + 1.6, 55), stops: metal, edge: 0.12, light: cyl(2.4) },
    { shape: box(cx - 10, 54, cx + 10, 58.5, 2.2), stops: metal, edge: 0.16, light: cyl(11, 0.2) },
    { shape: box(cx - 9.6, 28, cx + 9.6, 41, 4.2), stops: body, edge: 0.12, light: cyl(10) },
    {
      shape: headS, stops: head, edge: 0.1, light: cyl(10.5, 0.35),
      /* the grille: every other cell row inside the head's edge is a slot, so it reads as lines, never as dots */
      color: (x, y, t, i, j) => (headIn(x, y) && j % 2 === 0 ? mix(grad(head, t + 0.1), slot, 0.38) : grad(head, t)),
    },
    { shape: box(cx - 11.6, 25, cx + 11.6, 29.2, 1.2), stops: metal, edge: 0.18, light: cyl(11.6) },
  ], { must: [[cx, 4], [cx, 27]] });
}

/*
  A creator tool from the homepage's lattice objects (../../pixels.js): the
  bulb (explainer), the microphone (podcast) and the game pad (letsplay), in
  a band's own colours, on the half lattice. The moth, the pan and the
  homepage camera stay out (eyes); on the game pad any small dark group
  (Select and Start) takes the colour round it, so no pair of marks remains.
    dark    stops for the pieces' Ink, lit to shade
    body    stops for their Chalk
    accent  their Cobalt and Straw
*/
const SRC = { ink: "#141311", cobalt: "#1F4BFF", chalk: "#FBFAF6", straw: "#F5D34A" };
function noPairs(cells) {
  const key = (x, y) => `${x},${y}`;
  const ink = new Map(cells.filter((p) => p.c === SRC.ink).map((p) => [key(p.x, p.y), p]));
  const drop = new Set(), seen = new Set();
  for (const k0 of ink.keys()) {
    if (seen.has(k0)) continue;
    const group = [k0], q = [k0];
    seen.add(k0);
    while (q.length) {
      const [x, y] = q.pop().split(",").map(Number);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const k = key(x + dx, y + dy);
        if (ink.has(k) && !seen.has(k)) { seen.add(k); group.push(k); q.push(k); }
      }
    }
    if (group.length < 10) group.forEach((k) => drop.add(k));
  }
  const at = new Map(cells.map((p) => [key(p.x, p.y), p.c]));
  return cells.map((p) => {
    if (!(p.c === SRC.ink && drop.has(key(p.x, p.y)))) return p;
    for (let r = 1; r < 4; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
      const c = at.get(key(p.x + dx, p.y + dy));
      if (c && c !== SRC.ink) return { ...p, c };
    }
    return null;
  }).filter(Boolean);
}
export function tool({ key = "explainer", dark = ["claret", "ink"], body = ["chalk", "blush"], accent = "ember", flip = false } = {}) {
  return () => {
    let src = piece(key);
    if (key === "letsplay") src = noPairs(src);
    const xs = src.map((p) => p.x), ys = src.map((p) => p.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), fw = Math.max(...xs) - x0 + 1, fh = Math.max(...ys) - y0 + 1;
    const focc = new Uint8Array(fw * fh);
    const out = src.map((p) => {
      const i = flip ? fw - 1 - (p.x - x0) : p.x - x0, j = p.y - y0, t = (i / fw + j / fh) / 2;
      focc[j * fw + i] = 1;
      const c = p.c === SRC.ink ? grad(dark, t) : p.c === SRC.chalk ? grad(body, t) : tone(accent);
      return [i, j, c];
    });
    return { fw, fh, unit: 0.5, focc, must: [], cells: () => out };
  };
}

/*
  A camera: a body with a lighter top plate, the prism hump in the middle of
  the top, and one large lens. The lens barrel is a stepped metal ring; the
  glass inside is one smooth gradient with a single crescent of light at the
  upper left. No catchlight dot, no viewfinder window, no flash and no
  shutter button, so the lens never gains a partner and nothing reads as a
  face. Size is its height in cells.
    body   the lower body, lit to shade
    plate  the top plate and the hump, lit to shade
    barrel the lens ring, lit to shade
    glass  the glass, lit to deep
*/
export function camera({ body = ["graphite", "soot", "ink"], plate = ["chalk", "linen", "stone"], barrel = ["stone", "graphite", "soot"], glass = ["water", "press", "ink"], shine = "chalk" } = {}) {
  const W = 56, H = 40, cx = 28, cy = 24.5;
  const hump = (x, y) => y >= 2 && y <= 11 && Math.abs(x - cx) <= 6 + (y - 2) * 0.55;
  const light = diag(W, H);
  const radial = (x, y) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return 0.5 + ((dx + dy) / (d * Math.SQRT2)) * 0.42; };
  return drawn(W, H, [
    { shape: box(2, 10, 54, 37, 3.5), stops: body, edge: 0.12, light },
    { shape: any(hump, box(2, 10, 54, 15.5, 3.5)), stops: plate, edge: 0.14, light: (x, y) => light(x, y) * 0.8 },
    { shape: ringU(cx, cy, 9.4, 12.6), stops: barrel, edge: 0.12, light: radial },
    {
      shape: disc(cx, cy, 9.4), stops: glass, edge: 0,
      /* the glass: deeper toward the lower right; one crescent of light at the upper left */
      color: (x, y) => {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (d > 6 && d < 8.2 && a > -170 && a < -112) return tone(shine);
        return grad(glass, 0.2 + ((dx + dy) / 18.8 + 1) * 0.38);
      },
    },
  ], { must: [[cx, 3], [cx, cy]] });
}

/* ---------------------------------------------------------------- placement */
const TEXT = "h1, h2, h3, h4, p, dt, dd, li, figcaption, small, label, legend, blockquote";
const BOXES = ".ob-chip, a, button, input, select, textarea, .ob-win, .ob-card, img, svg, video, canvas:not(.ob-scene), [data-scene-avoid]";

function noGo(band, B, cell, cols, rows, ceiling) {
  const grid = new Uint8Array(cols * rows);
  const mark = (q) => {
    if (!q.width || !q.height) return;
    const x0 = Math.max(0, Math.floor((q.left - B.left) / cell)), x1 = Math.min(cols - 1, Math.floor((q.right - B.left) / cell));
    const y0 = Math.max(0, Math.floor((q.top - B.top) / cell)), y1 = Math.min(rows - 1, Math.floor((q.bottom - B.top) / cell));
    if (x1 < x0 || y1 < y0) return;
    for (let y = y0; y <= y1; y++) grid.fill(1, y * cols + x0, y * cols + x1 + 1);
  };
  const shown = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
  for (const el of band.querySelectorAll(TEXT)) {
    if (!shown(el)) continue;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    for (const q of rg.getClientRects()) mark(q);
  }
  for (const el of band.querySelectorAll(BOXES)) if (shown(el)) mark(el.getBoundingClientRect());
  /* everything above the ceiling's bottom (the header bar, which sits over the band's top) */
  const top = ceiling && document.querySelector(ceiling);
  if (top) {
    /* the bar is fixed, so its bottom is measured from the band's top as it sits on the page, whatever the scroll */
    const fixed = getComputedStyle(top).position === "fixed";
    const bottom = top.getBoundingClientRect().bottom + (fixed ? scrollY : 0);
    const y = Math.max(0, Math.min(rows, Math.ceil((bottom - (B.top + scrollY)) / cell)));
    grid.fill(1, 0, y * cols);
  }
  return grid;
}

/*
  Distance in cells from every cell to the nearest no-go cell or to the
  band's left or top edge (the right and bottom edges are open). Two-pass
  chamfer, near enough to Euclidean for spacing.
*/
function distance(grid, cols, rows, edges = true) {
  const INF = 1e6, d = new Float32Array(cols * rows);
  for (let p = 0; p < d.length; p++) d[p] = grid[p] ? 0 : INF;
  const A = 1, Dg = Math.SQRT2;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const p = y * cols + x;
    let v = d[p];
    if (edges) v = Math.min(v, x + 1, y + 1);
    if (x > 0) v = Math.min(v, d[p - 1] + A);
    if (y > 0) {
      v = Math.min(v, d[p - cols] + A);
      if (x > 0) v = Math.min(v, d[p - cols - 1] + Dg);
      if (x < cols - 1) v = Math.min(v, d[p - cols + 1] + Dg);
    }
    d[p] = v;
  }
  for (let y = rows - 1; y >= 0; y--) for (let x = cols - 1; x >= 0; x--) {
    const p = y * cols + x;
    let v = d[p];
    if (x < cols - 1) v = Math.min(v, d[p + 1] + A);
    if (y < rows - 1) {
      v = Math.min(v, d[p + cols] + A);
      if (x < cols - 1) v = Math.min(v, d[p + cols + 1] + Dg);
      if (x > 0) v = Math.min(v, d[p + cols - 1] + Dg);
    }
    d[p] = v;
  }
  return d;
}

/* an object's outline cells (occupied, with an empty or outside neighbour), for quick clearance tests */
function outline(o) {
  const out = [];
  const at = (i, j) => i >= 0 && j >= 0 && i < o.w && j < o.h && o.occ[j * o.w + i];
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    if (!at(i, j)) continue;
    if (!at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1)) out.push([i, j]);
  }
  return out;
}

/*
  The lattice dress every object wears: a light outline `ow` cells wide all
  round it (on the coarse lattice, whatever the object's own unit), and its
  fills textured in place: on a dark tone a light dot on a diamond lattice,
  on a light tone a sparse dark dot. Edge cells and the highlight stay plain,
  so the silhouette reads clean. Returns the object padded by its outline,
  with coarse occupancy for placement.
*/
const lumCache = new Map();
function lum(c) {
  let v = lumCache.get(c);
  if (v === undefined) { const [r, g, b] = rgb(c); v = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; lumCache.set(c, v); }
  return v;
}
function dress(o, ow, light, outer = 1) {
  const u = o.unit ?? 1, fw0 = o.fw ?? o.w, fh0 = o.fh ?? o.h, f0 = o.focc ?? o.occ;
  const pf = Math.round(ow / u), fw = fw0 + 2 * pf, fh = fh0 + 2 * pf;
  const focc = new Uint8Array(fw * fh), ring = new Uint8Array(fw * fh);
  for (let j = 0; j < fh0; j++) for (let i = 0; i < fw0; i++) if (f0[j * fw0 + i]) focc[(j + pf) * fw + i + pf] = 1;
  /* rings outward, counted with diagonals so corners stay square */
  let edge = [];
  for (let p = 0; p < fw * fh; p++) if (focc[p]) edge.push(p);
  for (let r = 1; r <= pf; r++) {
    const next = [];
    for (const p of edge) {
      const i = p % fw, j = (p - i) / fw;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = i + dx, b = j + dy, n = b * fw + a;
        if (a < 0 || b < 0 || a >= fw || b >= fh || focc[n] || ring[n]) continue;
        ring[n] = r; next.push(n);
      }
    }
    edge = next;
  }
  const lines = [];
  for (let p = 0; p < fw * fh; p++) if (ring[p]) lines.push([p % fw, Math.floor(p / fw), light, ring[p] > Math.round(1 / u) ? outer : 1]);
  /* interior cells: all four neighbours inside the object */
  const inner = (i, j) => focc[j * fw + i] && focc[j * fw + i - 1] && focc[j * fw + i + 1] && focc[(j - 1) * fw + i] && focc[(j + 1) * fw + i];
  const w = Math.ceil(fw * u), h = Math.ceil(fh * u), occ = new Uint8Array(w * h);
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) if (focc[j * fw + i] || ring[j * fw + i]) occ[Math.floor(j * u) * w + Math.floor(i * u)] = 1;
  const cells = (f) => o.cells(f).map(([i, j, c, a]) => [i + pf, j + pf, c, a]);
  return { w, h, fw, fh, unit: u, occ, inner, plain: o.plain, lines, fill: o.fill, must: (o.must ?? []).map(([i, j]) => [i + ow, j + ow]), cells };
}

/*
  The best spot for the object at one size: every outline cell inside the
  band keeps `need` cells from the words; no more than `cut` of its cells
  fall off the right or bottom edge, and none off the left or top; its
  `must` cells stay in view; its centre stays between xMin and xMax. Score:
  its size in view, the room round it (up to a point), and how near the
  share of it off the edge comes to `bleed`.
*/
function spot(o, edge, total, dist, cols, rows, { need, cut, bleed, xMin = 0, xMax = Infinity }) {
  let best = null;
  const step = o.w > 30 ? 2 : 1, cap = need * 2.2;
  for (let oy = 0; oy <= rows - Math.ceil(o.h * (1 - cut)); oy += step) {
    for (let ox = 0; ox <= cols - Math.ceil(o.w * (1 - cut)); ox += step) {
      const mid = ox + o.w / 2;
      if (mid < xMin || mid > xMax) continue;
      if (!o.must.every(([i, j]) => ox + i < cols && oy + j < rows)) continue;
      let room = Infinity, ok = true, outside = 0;
      for (const [i, j] of edge) {
        const x = ox + i, y = oy + j;
        if (x >= cols || y >= rows) continue;
        const v = dist[y * cols + x];
        if (v < need) { ok = false; break; }
        if (v < room) room = v;
      }
      if (!ok) continue;
      if (ox + o.w > cols || oy + o.h > rows) {
        for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (o.occ[j * o.w + i] && (ox + i >= cols || oy + j >= rows)) outside++;
        if (outside / total > cut) continue;
      }
      /* it leans on the open edges: a little of it off the bottom or right reads as set in the band, not floating */
      const f = outside / total;
      const score = Math.sqrt(total * (1 - f)) + 0.6 * Math.min(room, cap) - Math.abs(f - bleed) * 40;
      if (!best || score > best.score) best = { ox, oy, score };
    }
  }
  return best;
}

/* small clusters near the object: two to six cells, never one, so no pair of dots can read as eyes */
const SHAPES = [[[0, 0], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 1], [2, 2], [2, 1]]];
const hash = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/* ---------------------------------------------------------------- mount */
export function mountScene(band, { item, calm = 44, ceiling = ".ob-bar", within = ".wrap", side = 0.5, minWidth = 0, label, light = "chalk", dark = "ink", specks = null, seed = 7 } = {}) {
  if (!band || !item) return { redraw() {} };
  const cv = document.createElement("canvas");
  cv.className = "ob-scene";
  cv.setAttribute("aria-hidden", "true");
  if (label) cv.dataset.label = label;
  band.prepend(cv);
  const ctx = cv.getContext("2d");
  const reduce = reducedMotion();
  let placed = null, clusters = [], geo = null, done = reduce, raf = 0, t0 = 0, started = false, lastW = 0, lastH = 0;
  const RISE = 620, FILL = 900, END = Math.max(RISE, FILL) + 400;

  function layout() {
    const W = band.clientWidth, H = band.clientHeight, B = band.getBoundingClientRect();
    lastW = W; lastH = H;
    const cell = W > 720 ? CELL : CELL / 2;
    const dpr = Math.min(3, devicePixelRatio || 1);
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    placed = null; clusters = [];
    geo = { cell, dpr, W, H };
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    if (W < minWidth) { cv.hidden = true; return; }
    const grid = noGo(band, B, cell, cols, rows, ceiling);
    const dist = distance(grid, cols, rows);
    const room = (W > 720 ? calm : calm * 0.6) / cell;
    /* the object's centre sits over the right part of the content column; wide margins stay empty */
    const wrap = within && band.querySelector(within)?.getBoundingClientRect();
    const left = wrap ? (wrap.left - B.left) / cell : 0, right = wrap ? (wrap.right - B.left) / cell : cols;
    const xMin = left + (right - left) * side, xMax = right;
    const [lo, hi] = item.size.map((px) => Math.round(px / cell));
    const cut = item.cut ?? 0.3, need = Math.ceil(room);
    /* every size in the range, the best spot for each, and the best of those */
    for (let s = hi; s >= lo; s -= Math.max(1, Math.round((hi - lo) / 10))) {
      /* the object wears a one cell light outline */
      const o = dress(item.make(s), item.ring ?? 1, tone(item.light ?? light));
      const edge = outline(o), total = o.occ.reduce((a, b) => a + b, 0);
      const at = spot(o, edge, total, dist, cols, rows, { need, cut, bleed: Math.min(cut, item.bleed ?? 0.15), xMin, xMax });
      if (at && (!placed || at.score > placed.score)) placed = { o, ...at };
    }
    cv.hidden = !placed;
    if (!placed || !specks) return;
    /* up to three clusters near the object, clear of the words, the object and each other */
    const g = new Uint8Array(cols * rows), o = placed.o;
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (o.occ[j * o.w + i] && placed.ox + i < cols && placed.oy + j < rows) g[(placed.oy + j) * cols + placed.ox + i] = 1;
    const near = distance(g, cols, rows, false);
    const spread = Math.max(o.w, o.h) * 0.45, n = Math.min(3, specks.n ?? 3);
    for (let t = 0; t < 4000 && clusters.length < n; t++) {
      const x = Math.floor(hash(t, 1, seed) * cols), y = Math.floor(hash(t, 2, seed) * rows);
      if (x < left || x > right) continue;
      const sh = SHAPES[Math.floor(hash(t, 3, seed) * SHAPES.length)];
      let ok = true;
      for (const [i, j] of sh) {
        const X = x + i, Y = y + j;
        if (X >= cols || Y >= rows) { ok = false; break; }
        const p = Y * cols + X;
        if (dist[p] < need || near[p] < 3 || near[p] > spread) { ok = false; break; }
      }
      if (!ok || clusters.some((q) => Math.hypot(q.x - x, q.y - y) < 8)) continue;
      clusters.push({ x, y, sh, c: tone(specks.colors[Math.floor(hash(t, 4, seed) * specks.colors.length)]) });
    }
  }

  /* the dress: dots on a diamond lattice on dark tones, sparse dark dots on light ones, on the band's own lattice */
  const dk = () => tone(dark), lt = () => tone(light), chalk = () => tone("chalk");
  function dressed(c, gx, gy) {
    if (c === chalk()) return c;
    const v = lum(c);
    if (v < 0.42) return gx % 2 === 0 && gy % 2 === 0 && ((gx + gy) / 2) % 2 === 0 ? mix(c, lt(), 0.62) : c;
    if (v > 0.55) return (gx % 4 === 0 && gy % 4 === 0) || (gx % 4 === 2 && gy % 4 === 2) ? mix(c, dk(), 0.3) : c;
    return c;
  }

  function draw(t) {
    if (!geo) return;
    const { cell, dpr } = geo;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!placed) return;
    const X = (c) => Math.round(c * cell * dpr);
    const p = placed;
    const rise = done ? 1 : Math.max(0, Math.min(1, t / RISE));
    const fill = done ? 1 : ease(Math.max(0, Math.min(1, (t - RISE * 0.35) / FILL)));
    const cells = p.o.lines.concat(p.o.cells(p.o.fill ? fill : 1));
    /* an object on the half lattice (the tools) gives its cells in half cells */
    const u = p.o.unit ?? 1, w = p.o.fw ?? p.o.w, h = p.o.fh ?? p.o.h;
    const gx0 = Math.round(p.ox / u), gy0 = Math.round(p.oy / u);
    for (let [i, j, c, a] of cells) {
      if (!p.o.plain && (a ?? 1) >= 1 && p.o.inner(i, j)) c = dressed(c, gx0 + i, gy0 + j);
      /* rising into place up its columns: lower cells first, the left a little ahead */
      if (rise < 1) {
        const q = ease(Math.max(0, Math.min(1, rise * 1.5 - (i / w) * 0.5)));
        if ((h - j) / h > q) continue;
      }
      const x = p.ox + i * u, y = p.oy + j * u;
      ctx.globalAlpha = a ?? 1;
      ctx.fillStyle = c;
      ctx.fillRect(X(x), X(y), X(x + u) - X(x), X(y + u) - X(y));
    }
    ctx.globalAlpha = 1;
    /* the clusters arrive once the object has settled */
    if (done || t > RISE) for (const q of clusters) {
      ctx.fillStyle = q.c;
      for (const [i, j] of q.sh) ctx.fillRect(X(q.x + i), X(q.y + j), X(q.x + i + 1) - X(q.x + i), X(q.y + j + 1) - X(q.y + j));
    }
  }

  const run = (now) => {
    if (!t0) t0 = now;
    const t = now - t0;
    if (t >= END) { done = true; draw(END); return; }
    draw(t);
    raf = requestAnimationFrame(run);
  };
  const start = () => {
    layout();
    if (done || !placed) { done = true; draw(END); return; }
    if (!started) { started = true; raf = requestAnimationFrame(run); }
  };
  (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(start));

  /* the band changes size (a window fills in, the screen turns): lay out again and draw the final state */
  let rs = 0;
  const ro = new ResizeObserver(() => {
    if (!geo || (band.clientWidth === lastW && band.clientHeight === lastH)) return;
    clearTimeout(rs);
    rs = setTimeout(() => { cancelAnimationFrame(raf); done = true; layout(); draw(END); }, 90);
  });
  ro.observe(band);
  return { redraw() { layout(); draw(END); } };
}
