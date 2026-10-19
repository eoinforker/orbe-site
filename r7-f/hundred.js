/*
  Orbe r7-f: the hundred, drawn in the illustration language (docs/handoff/ILLUSTRATION-LANGUAGE.md 5.2).
  One cell is one creator your size. Lit cells close to solid accent, the frontier is accent halftone,
  the cells ahead keep a faint Ink screen, and you are the one Ember cell. One cell unit per piece,
  set by the caller per breakpoint; three colours per piece (accent, Ink dots, Ember). Drawn with
  site/fx/halftone.js, so cells tile on whole device pixels with no seams.
*/
import { createField, spread, rng, mix, lerp } from "../fx/halftone.js";

export const easeUi = (t) => 1 - (1 - t) * (1 - t); /* ease-out quad, the page's one curve */

/* Faint screen for the cells ahead: dense at one corner, thinning across the cell. */
const AHEAD_FROM = 0.2, AHEAD_TO = 0.03;
const DIRS = [0, 45, 90, 135, 225, 315];

/**
  createHundred(canvas, { cols, rows, cell, palette, shape })
    palette()  returns { lit, dots, you } as hex
    shape      "corner" ranks from the bottom left out; "strip" ranks left to right
  Returns { show({ n, you, ask }, animate), redraw(), destroy() }.
*/
export function createHundred(canvas, opts) {
  const { cols, rows, cell, palette, shape = "corner" } = opts;
  const r = rng(93);
  const score = [];
  const dir = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const jit = r() * 1.6;
    score.push(shape === "strip" ? x + (rows - 1 - y) * 0.25 + jit : Math.hypot(x, rows - 1 - y) + jit);
    dir.push(DIRS[Math.floor(r() * DIRS.length)]);
  }
  const order = score.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const rank = new Int16Array(cols * rows);
  order.forEach((i, k) => (rank[i] = k));
  let state = { n: 0, you: -1, ask: false };
  const pitch = Math.max(3, Math.round(cell * 0.2 * 2) / 2);

  const look = (c, y, p) => {
    const i = y * cols + c, k = rank[i];
    const pal = palette();
    const base = { base: null, pitch, angle: 45, dir: dir[i] };
    if (k === state.you) {
      if (state.ask) return { ...base, ink: pal.you, from: 0.5, to: 0.12 };
      return { ...base, ink: mix(pal.dots, pal.you, p), from: lerp(AHEAD_FROM, 1, p), to: lerp(AHEAD_TO, 1, p) };
    }
    /* the frontier: the last few lit cells stay halftone, so the spread reads as arriving */
    const edge = k >= state.n - 7;
    const tFrom = edge ? 0.95 : 1, tTo = edge ? 0.5 : 1;
    return { ...base, ink: mix(pal.dots, pal.lit, p), from: lerp(AHEAD_FROM, tFrom, p), to: lerp(AHEAD_TO, tTo, p) };
  };
  const field = createField(canvas, { cols, rows, cell, look });
  const cells = order.map((i) => [i % cols, Math.floor(i / cols)]);
  let job = null;

  return {
    show(next, animate = false, reduce = false) {
      state = { n: 0, you: -1, ask: false, ...next };
      if (job) job.cancel();
      const to = (c, y) => { const k = rank[y * cols + c]; return k < state.n || (k === state.you && !state.ask) ? 1 : 0; };
      if (!animate || reduce) {
        for (const [c, y] of cells) field.set(c, y, to(c, y));
        job = null;
        return;
      }
      job = spread(field, { order: cells, to, duration: 280, stagger: 7, easing: easeUi, reduce });
    },
    redraw() { field.draw(); },
    destroy() { if (job) job.cancel(); field.destroy(); },
  };
}

/** A small fee field: `a` solid cells and `b` halftone cells in 100, drawn once. */
export function drawMini(canvas, a, b = 0, colours = { ink: "#141311" }) {
  const look = (c, y) => {
    const i = y * 10 + c;
    const s = { base: null, pitch: 3, angle: 45, dir: 45, ink: colours.ink };
    if (i < a) return { ...s, from: 1, to: 1 };
    if (i < a + b) return { ...s, from: 0.55, to: 0.4 };
    return { ...s, from: 0.1, to: 0.04 };
  };
  const f = createField(canvas, { cols: 10, rows: 10, cell: 6, look });
  return f;
}
