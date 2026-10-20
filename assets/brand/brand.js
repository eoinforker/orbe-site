/*
  Orbe brand assets, drawn in code. Every function returns an SVG string and
  touches no DOM, so pages, Node scripts and the card renderer can all use it.
  Nothing here is copied art: the grain, the dithered orb, the pixel creature,
  the fat bars, the pixel stripe, the brushed landscape and the crayon marks
  are all generated from a seed. Same seed, same drawing.

    grain({ w, h, seed, opacity, freq })            film grain for colour fields
    ditherOrb({ cells, cell, fg, seed, light })     an ordered-dither sphere
    creature({ seed, cell, body, edge, mark, eye, phase })   a pixel creature
    bars({ w, h, colours, seed })                    fat rounded bars
    pixelStripe({ w, cell, colours, seed })          a pixel divider
    landscape({ w, h, palette, seed })               a brushed idyll
    crayon({ shape, colour, w, h, seed })            a crayon mark
    dataUri(svg)                                      for CSS backgrounds

  See docs/BRAND.md, "Texture and image", for when each one is used.
*/

export const COLOURS = {
  sky: "#9EE9FB", cobalt: "#1F4BFF", ink: "#141311", paper: "#F3F0E8", ember: "#FF5A1F",
  peony: "#F2879E", claret: "#6F1726",
  chalk: "#FBFAF6", linen: "#E7E2D7", mist: "#D6F6FD", blush: "#FBD9E0",
  soot: "#2A2824", graphite: "#45413A", stone: "#A29E95",
  meadow: "#8E9A4A", ochre: "#C9A84C", straw: "#EED56A", grove: "#262B12", water: "#4D9AD0", dawn: "#F2A58E",
};

const C = COLOURS;
let uid = 0;
const id = (p) => `${p}${(++uid).toString(36)}`;
const f1 = (n) => (Math.round(n * 10) / 10).toString();

/** A small, fast, seeded generator (LCG). */
export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export const dataUri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22")}")`;

/* ------------------------------------------------------------------ grain */

/** Film grain: fine monochrome noise to lay over a flat field (multiply or overlay). */
export function grain({ w = 240, h = 240, seed = 7, opacity = 0.22, freq = 0.9, tone = "#141311" } = {}) {
  const f = id("gr");
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(tone.slice(i, i + 2), 16) / 255);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><filter id="${f}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ${r.toFixed(3)}  0 0 0 0 ${g.toFixed(3)}  0 0 0 0 ${b.toFixed(3)}  0 0 0 -2.2 1.35"/></filter><rect width="100%" height="100%" filter="url(#${f})" opacity="${opacity}"/></svg>`;
}

/* ------------------------------------------------------------------ dither */

const BAYER = (() => {
  // 8x8 ordered dither matrix, values 0..63
  const m = [[0]];
  let M = m;
  for (let n = 1; n < 8; n *= 2) {
    const N = [];
    for (let y = 0; y < n * 2; y++) {
      N.push([]);
      for (let x = 0; x < n * 2; x++) {
        const q = (y < n ? 0 : 2) + (x < n ? 0 : 1);
        const add = [0, 2, 3, 1][q];
        N[y].push(4 * M[y % n][x % n] + add);
      }
    }
    M = N;
  }
  return M.map((row) => row.map((v) => (v + 0.5) / 64));
})();

/** Draws filled cells (a Set of "x,y") as row runs, so the SVG stays small. */
function runs(cells, cols, rows, cell, fill) {
  let d = "";
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (!cells(x, y)) { x++; continue; }
      let e = x;
      while (e < cols && cells(e, y)) e++;
      d += `M${x * cell} ${y * cell}h${(e - x) * cell}v${cell}h${-(e - x) * cell}z`;
      x = e;
    }
  }
  return d ? `<path fill="${fill}" d="${d}"/>` : "";
}

/**
  An orb in ordered dither: a lit sphere whose shading is carried only by the
  density of square cells, with a scattered halo at its edge. The TypeSafe side
  of the brand: precise, machine-made, never soft.
*/
export function ditherOrb({ cells = 72, cell = 6, fg = C.paper, seed = 3, light = [-0.55, -0.6, 0.58], halo = 0.22 } = {}) {
  const R = rng(seed);
  const n = Math.hypot(...light);
  const L = light.map((v) => v / n);
  const grid = new Uint8Array(cells * cells);
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const nx = ((x + 0.5) / cells) * 2 - 1, ny = ((y + 0.5) / cells) * 2 - 1;
      const r = Math.hypot(nx, ny) / (1 - halo / 2);
      let v;
      if (r <= 1) {
        const sx = nx / (1 - halo / 2), sy = ny / (1 - halo / 2), z = Math.sqrt(Math.max(0, 1 - r * r));
        const lam = Math.max(0, sx * L[0] + sy * L[1] + z * L[2]);
        v = 0.08 + 0.92 * Math.pow(lam, 1.15);
      } else {
        const t = (r - 1) / (halo * 1.6);
        v = t < 1 ? 0.18 * (1 - t) * (R() < 0.55 ? 1 : 0) : 0;
      }
      grid[y * cells + x] = v > BAYER[y % 8][x % 8] ? 1 : 0;
    }
  }
  const size = cells * cell;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">${runs((x, y) => grid[y * cells + x], cells, cells, cell, fg)}</svg>`;
}

/* ------------------------------------------------------------------ creature */

/**
  Orbe's pixel creatures: a lumpy body on a grid, swaying limbs, a lattice of
  plus signs inside, a one-cell bright edge and two eyes, so each one is a
  character. `phase` (0..1) sways the limbs; step it at about nine frames a
  second for the walk. Drawn on its own grid; never scale it by a fraction.
*/
export function creature({ seed = 1, cols = 44, rows = 36, cell = 8, body = C.cobalt, edge = C.sky, mark = C.ember, eye = C.ink, ring = C.ink, phase = 0 } = {}) {
  const R = rng(seed * 31 + 5);
  const balls = [];
  const cx = cols * 0.5, cy = rows * 0.5;
  const nb = 4 + Math.floor(R() * 3);
  for (let i = 0; i < nb; i++) {
    const a = R() * Math.PI * 2, d = R() * Math.min(cols, rows) * 0.2;
    balls.push([cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d * 0.8, Math.min(cols, rows) * (0.1 + R() * 0.08)]);
  }
  // limbs: wavy lines from the body outward
  const limbs = [];
  const nl = 4 + Math.floor(R() * 3);
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + R() * 0.8 + 0.3;
    const len = Math.min(cols, rows) * (0.4 + R() * 0.14);
    const sway = 0.6 + R() * 0.9;
    limbs.push({ a, len, sway: R() < 0.5 ? sway : -sway, w: 1.8 + R() * 1.1, off: R() * Math.PI * 2 });
  }
  const inside = (x, y) => {
    let s = 0;
    for (const [bx, by, br] of balls) s += (br * br) / ((x - bx) ** 2 + (y - by) ** 2 + 0.01);
    if (s > 1.15) return true;
    for (const l of limbs) {
      for (let t = 0.2; t <= 1; t += 0.05) {
        const wob = Math.sin(t * 3 + l.off + phase * Math.PI * 2) * l.sway * t;
        const a = l.a + wob * 0.35;
        const px = Math.min(cols - 3, Math.max(2, cx + Math.cos(a) * l.len * t * 1.25)), py = Math.min(rows - 3, Math.max(2, cy + Math.sin(a) * l.len * t));
        const w = t > 0.92 ? l.w * 1.25 : l.w * (1.2 - t * 0.55);
        if ((x - px) ** 2 + (y - py) ** 2 < w * w) return true;
      }
    }
    return false;
  };
  const g = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g[y * cols + x] = inside(x + 0.5, y + 0.5) ? 1 : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : g[y * cols + x]);
  const isEdge = (x, y) => at(x, y) && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1));
  const isRing = (x, y) => !at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1));
  // eyes sit in the body near its top centre
  const mx = balls.reduce((a, b) => a + b[0], 0) / balls.length, my = balls.reduce((a, b) => a + b[1], 0) / balls.length;
  const ex = Math.round(mx), ey = Math.round(my - 3);
  const eyeCells = new Set([`${ex - 3},${ey}`, `${ex - 3},${ey + 1}`, `${ex - 2},${ey}`, `${ex - 2},${ey + 1}`, `${ex + 2},${ey}`, `${ex + 2},${ey + 1}`, `${ex + 3},${ey}`, `${ex + 3},${ey + 1}`]);
  const isEye = (x, y) => eyeCells.has(`${x},${y}`) && at(x, y) && !isEdge(x, y);
  const plus = (x, y) => {
    const u = (x + 2) % 5, v = (y + 2) % 5;
    return ((u === 2 && v >= 1 && v <= 3) || (v === 2 && u >= 1 && u <= 3)) && at(x, y) && !isEdge(x, y) && !isEye(x, y) && !(Math.abs(x - ex) < 6 && Math.abs(y - ey) < 3);
  };
  const W = cols * cell, H = rows * cell;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">`
    + (ring ? runs(isRing, cols, rows, cell, ring) : "")
    + runs((x, y) => at(x, y) && !isEdge(x, y), cols, rows, cell, body)
    + runs(isEdge, cols, rows, cell, edge)
    + runs(plus, cols, rows, cell, mark)
    + runs(isEye, cols, rows, cell, eye)
    + `</svg>`;
}

/* ------------------------------------------------------------------ bars */

/** Fat rounded bars that cross a field: fal's energy, in Orbe's colours. Decoration only. */
export function bars({ w = 1440, h = 900, colours = [C.ember, C.cobalt], seed = 2, weight = 0.06, lines = null } = {}) {
  const R = rng(seed);
  const t = Math.round(Math.min(w, h) * weight);
  // lines: [[x1, y1, x2, y2, colour], ...] in fractions of w and h, for placing bars clear of type
  if (lines) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${lines.map(([a, b, c, d, col]) => `<line x1="${f1(a * w)}" y1="${f1(b * h)}" x2="${f1(c * w)}" y2="${f1(d * h)}" stroke="${col}" stroke-width="${t}" stroke-linecap="round"/>`).join("")}</svg>`;
  const out = colours.map((col, i) => {
    const side = i % 2;
    const x1 = side ? w * (0.7 + R() * 0.25) : w * (0.02 + R() * 0.2);
    const y1 = h * (0.08 + R() * 0.5);
    const a = (side ? 1 : -1) * (0.25 + R() * 0.35) + (side ? Math.PI : 0);
    const len = Math.min(w, h) * (0.45 + R() * 0.25);
    const x2 = x1 + Math.cos(a) * len * (side ? -1 : 1), y2 = y1 + Math.sin(Math.abs(a)) * len * 0.6;
    return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${t}" stroke-linecap="round"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${out.join("")}</svg>`;
}

/* ------------------------------------------------------------------ pixel stripe */

/** A divider of pixel runs in a few colours: three rows, runs of random length, some gaps. */
export function pixelStripe({ w = 1440, cell = 8, rows = 3, colours = [C.cobalt, C.sky, C.ink, C.ember], seed = 4, gap = 0.18 } = {}) {
  const R = rng(seed);
  const cols = Math.ceil(w / cell);
  let s = "";
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      const len = 2 + Math.floor(R() * 14);
      if (R() > gap) {
        const col = colours[Math.floor(R() * colours.length)];
        s += `<rect x="${x * cell}" y="${y * cell}" width="${len * cell}" height="${cell}" fill="${col}"/>`;
      }
      x += len;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cell} ${rows * cell}" width="${cols * cell}" height="${rows * cell}" preserveAspectRatio="none" shape-rendering="crispEdges">${s}</svg>`;
}

/* ------------------------------------------------------------------ landscape */

/** The idyll palettes. "sky" is the brand's own: the field colour in the sky, cobalt water, warm painterly ground. */
export const LANDSCAPES = {
  sky: { sky: ["#9EE9FB", "#B6F0FC", "#86DDF5", "#A9ECFA"], streak: ["#F7F4EA", "#1F4BFF", "#FBFAF6"], far: ["#1F4BFF", "#3E6BFF", "#5FC3E0"], trees: ["#1E2410", "#2C3316", "#161B0C", "#3C4219"], treeLit: ["#C9A84C", "#EED56A"], field: ["#C9A84C", "#B99A45", "#D8BC64", "#8E9A4A", "#E1CB7E"], grass: ["#EED56A", "#F4E7A8", "#FF5A1F", "#E3C04F"], low: ["#7E8A42", "#E9D9B8", "#1F4BFF"] },
  dawn: { sky: ["#F2A58E", "#F2879E", "#F6B3A3", "#EE9A8A"], streak: ["#FBE3D8", "#F7EEDF", "#9EE9FB"], far: ["#4F7F62", "#9EE9FB", "#2F5A44"], trees: ["#1A2414", "#25301B", "#121A0E", "#33401F"], treeLit: ["#E9B44C", "#F6B3C1"], field: ["#8EA35B", "#A3AE62", "#C6B26A", "#6F8A4A", "#D8C27A"], grass: ["#F6D3DA", "#EFC85A", "#FBEFC6"], low: ["#5D7340", "#F2879E", "#2F3A1A"] },
  noon: { sky: ["#3E95D8", "#2F86CF", "#5AA8E0", "#2A7BC4"], streak: ["#CFE4F4", "#F4F1EA"], far: ["#9EE9FB", "#6FB0C9"], trees: ["#24301A", "#30381B", "#1B2412"], treeLit: ["#B98C3B", "#D3A447"], field: ["#E2A845", "#D8973A", "#EAC160", "#8EA35B", "#C6B26A"], grass: ["#F0D46A", "#E6C255", "#F6E2A0"], low: ["#2B3318", "#A39B87", "#F2E9DA"] },
  night: { sky: ["#141311", "#1B2A44", "#10182A", "#22314F"], streak: ["#1F4BFF", "#9EE9FB"], far: ["#1F4BFF", "#2D5B84"], trees: ["#0B0F0A", "#121812", "#070A07"], treeLit: ["#FF5A1F", "#F6C46E"], field: ["#1D2A2E", "#22343A", "#2A3E3E", "#33473E"], grass: ["#9EE9FB", "#C9A84C", "#5E7A8E"], low: ["#0B0F0A", "#1F4BFF", "#FF5A1F"] },
};

function ribbon(R, x0, y0, x1, y1, w, bend = 0) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (x0 + x1) / 2 + nx * bend, cy = (y0 + y1) / 2 + ny * bend;
  const N = Math.max(6, Math.min(24, Math.round(len / 20)));
  const top = [], bot = [];
  const st = 0.2 + R() * 0.5, et = 0.15 + R() * 0.4;
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const px = u * u * x0 + 2 * u * t * cx + t * t * x1, py = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const taper = Math.min(1, (t / st) * 1.4 + 0.25, ((1 - t) / et) * 1.2 + 0.2);
    const h = (w / 2) * taper * (0.82 + R() * 0.36);
    top.push([px + nx * h, py + ny * h]);
    bot.push([px - nx * h * (0.85 + R() * 0.3), py - ny * h * (0.85 + R() * 0.3)]);
  }
  return "M" + top.concat(bot.reverse()).map((p) => f1(p[0]) + "," + f1(p[1])).join("L") + "Z";
}

/**
  A brushed landscape: sky drags, a far band of water and hills, a tree line of
  dabs, wide field bands and grass flicks, each layer roughened and dry-brushed
  by turbulence, with crayon grain on top. The idyll side of the brand: warm,
  made by hand, a place to keep work.
*/
export function landscape({ w = 1200, h = 800, palette = "sky", seed = 43, horizon = 0.5, grainOpacity = 0.5, sky = true } = {}) {
  const S = typeof palette === "string" ? LANDSCAPES[palette] : palette;
  const R = rng(seed * 977 + w);
  const s = Math.max(0.55, Math.min(1.6, Math.sqrt(w * h) / 560));
  const p = id("ls");
  const pick = (a) => a[Math.floor(R() * a.length)];
  const mk = (name, fx, fy, scale, cut) =>
    `<filter id="${p}${name}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${(0.006 / s).toFixed(4)} ${(0.018 / s).toFixed(4)}" numOctaves="2" seed="${seed}" result="w"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="w" scale="${f1(9 * s * scale)}" xChannelSelector="R" yChannelSelector="G" result="r0"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="${(0.07 / s).toFixed(4)} ${(0.16 / s).toFixed(4)}" numOctaves="3" seed="${seed + 2}" result="w2"/>`
    + `<feDisplacementMap in="r0" in2="w2" scale="${f1(10 * s)}" xChannelSelector="R" yChannelSelector="G" result="r"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="${(fx / s).toFixed(4)} ${(fy / s).toFixed(4)}" numOctaves="3" seed="${seed + 7}" result="n"/>`
    + `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${cut} 0 0 0 ${(0.4 - cut * 0.3).toFixed(2)}" result="m"/>`
    + `<feComposite in="r" in2="m" operator="in"/></filter>`;
  const defs = `<defs>${mk("h", 0.005, 0.09, 1, 4.6)}${mk("v", 0.16, 0.006, 0.7, 4.0)}${mk("d", 0.05, 0.05, 1.2, 2.4)}`
    + `<filter id="${p}c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed + 3}"/><feColorMatrix type="matrix" values="0 0 0 0 0.14  0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 -1.6 1.0"/></filter><mask id="${p}m"><rect y="${f1(h * horizon)}" width="${w}" height="${h}" fill="#fff"/></mask></defs>`;
  const layer = (f, paths) => `<g filter="url(#${p}${f})">${paths.join("")}</g>`;
  const path = (fill, d, op = 1) => `<path fill="${fill}" d="${d}" opacity="${op.toFixed(2)}"/>`;
  const hz = h * (horizon + R() * 0.04);
  // sky: false paints only the ground, so it can sit on a page's own field
  const out = sky ? [`<rect width="${w}" height="${h}" fill="${S.sky[0]}"/>`] : [];
  let ps = [];
  for (let i = 0; i < 18; i++) {
    const y = R() * hz * 1.05, bw = Math.max(hz * (0.12 + R() * 0.22), 22);
    const x0 = -w * 0.2 + R() * w * 0.5, x1 = x0 + w * (0.5 + R() * 0.9);
    ps.push(path(pick(S.sky), ribbon(R, x0, y, x1, y + (R() - 0.5) * h * 0.05, bw, (R() - 0.5) * h * 0.04), 0.75 + R() * 0.25));
  }
  for (let i = 0; i < 7; i++) {
    const y = R() * hz * 0.95, bw = Math.max(hz * (0.03 + R() * 0.06), 6);
    const x0 = R() * w * 0.8, x1 = x0 + w * (0.15 + R() * 0.4);
    ps.push(path(pick(S.streak), ribbon(R, x0, y, x1, y - h * 0.01, bw, h * 0.01), 0.55 + R() * 0.4));
  }
  if (sky) out.push(layer("h", ps));
  out.push(`<rect x="0" y="${f1(hz + h * 0.015)}" width="${w}" height="${f1(h - hz)}" fill="${S.field[1]}"/>`);
  ps = [];
  for (let i = 0; i < 9; i++) {
    const y = hz - h * (0.02 - R() * 0.06), bw = h * (0.02 + R() * 0.05);
    const x0 = -w * 0.1 + R() * w * 0.6, x1 = x0 + w * (0.3 + R() * 0.7);
    ps.push(path(pick(S.far), ribbon(R, x0, y, x1, y + (R() - 0.5) * h * 0.03, bw, -h * 0.02), 0.85));
  }
  out.push(layer("h", ps));
  ps = [];
  const clusters = 3 + Math.floor(R() * 3);
  for (let c = 0; c < clusters; c++) {
    const cx = ((c + 0.2 + R() * 0.6) / clusters) * w, spread = w * (0.07 + R() * 0.12);
    const tall = Math.min(hz * 0.8, h * (0.08 + R() * (c % 2 ? 0.2 : 0.1)));
    for (let i = 0; i < 30; i++) {
      const x = cx + (R() - 0.5) * spread * 2;
      const fall = 1 - Math.abs(x - cx) / (spread * 1.1);
      const top = hz - tall * Math.max(0.15, fall) * (0.6 + R() * 0.5);
      const len = tall * (0.25 + R() * 0.45) + 6, ang = (R() - 0.5) * 1.2;
      ps.push(path(pick(S.trees), ribbon(R, x, top + len, x + Math.sin(ang) * len, top, w * (0.02 + R() * 0.035) + 6), 0.95));
    }
    ps.push(path(pick(S.trees), ribbon(R, cx - spread, hz + h * 0.02, cx + spread, hz + h * 0.01, h * (0.04 + R() * 0.04), -h * 0.04)));
    for (let i = 0; i < 5; i++) {
      const x = cx + (R() - 0.2) * spread, y = hz - tall * (0.3 + R() * 0.5);
      ps.push(path(pick(S.treeLit), ribbon(R, x, y, x + w * 0.015, y - h * 0.025, w * 0.008 + h * 0.006), 0.8));
    }
  }
  out.push(layer("d", ps));
  ps = [];
  for (let i = 0; i < 11; i++) {
    const t = R(), y = hz + (h - hz) * (t * 1.05), bw = (h - hz) * (0.18 + R() * 0.32);
    const x0 = -w * 0.3 + R() * w * 0.6, x1 = x0 + w * (0.6 + R() * 0.9);
    const fill = t > 0.72 && R() > 0.4 ? pick(S.low) : pick(S.field);
    ps.push(path(fill, ribbon(R, x0, y, x1, y + (R() - 0.5) * h * 0.04, bw, (R() - 0.5) * h * 0.05), 0.8 + R() * 0.2));
  }
  out.push(layer("h", ps));
  ps = [];
  const n = Math.round(w / 9);
  for (let i = 0; i < n; i++) {
    const x = R() * w, base = h * (0.82 + R() * 0.2), len = (h - hz) * (0.12 + R() * 0.38);
    if (R() < 0.45) continue;
    ps.push(path(pick(S.grass), ribbon(R, x, base, x + (R() - 0.3) * w * 0.04, base - len, w * 0.006 + 4 + R() * 5), 0.75 + R() * 0.25));
  }
  out.push(layer("v", ps));
  out.push(`<rect width="${w}" height="${h}" filter="url(#${p}c)" opacity="${grainOpacity}"${sky ? "" : ` mask="url(#${p}m)"`}/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">${defs}${out.join("")}</svg>`;
}

/* ------------------------------------------------------------------ crayon */

const SHAPES = {
  // loose hand marks on a 200 x 100 box
  underline: "M8 62 C 50 54, 110 58, 192 50 M20 74 C 80 66, 140 70, 186 64",
  loop: "M100 12 C 160 10, 192 40, 186 58 C 178 86, 60 94, 22 70 C 0 54, 30 18, 108 16 C 140 16, 160 22, 170 30",
  arrow: "M12 70 C 60 72, 120 60, 176 30 M150 24 L 178 28 L 170 56",
  zigzag: "M10 70 L 40 30 L 70 70 L 100 30 L 130 70 L 160 30 L 190 70",
  wave: "M6 50 C 30 20, 50 20, 70 50 S 110 80, 130 50 S 170 20, 194 50",
};

/** A crayon mark: a stroke bitten by paper tooth, for the warm, hand side (underlines, loops, arrows). */
export function crayon({ shape = "underline", colour = C.cobalt, w = 200, h = 100, seed = 5, weight = 9 } = {}) {
  const f = id("cr");
  const d = SHAPES[shape] ?? shape;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="${w}" height="${h}" preserveAspectRatio="none"><filter id="${f}" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed + 1}" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.05" result="m"/><feComposite in="d" in2="m" operator="in"/></filter><path d="${d}" fill="none" stroke="${colour}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${f})"/></svg>`;
}
