/*
  Orbe r7-b: the dithered orb. The construction is r8-a's (buildOrb: a disc on a square grid of
  cells, a one-cell Ink rim, interior cells sorted bottom row first); the drawing is this page's own.

  - The fill is the figure: exactly round(score% of the interior cells) are lit, whole rows from the
    bottom up, then a two-row band at the fill line ordered by a 4x4 Bayer matrix, so the edge reads
    as a sphere and the count stays exact.
  - Every lit cell holds one round dot of one size. Shading is by omission only: toward the light
    (upper left) an ordered Bayer threshold leaves dots out, so the lit side reads paler and the
    shadow side stays solid. Ink dots on a light field, so more dots means more shadow.
  - Three colours: the accent body, the Ink rim, and the ground it sits on. No gradient, no glow.
*/
import { buildOrb } from "../r8-a/orb.js";

export { buildOrb };

function litSet(orb, k) {
  const lit = new Set();
  if (k <= 0) return lit;
  let below = 0, i = 0;
  while (i < orb.rowKeys.length && below + orb.rows.get(orb.rowKeys[i]).length <= k) {
    for (const cell of orb.rows.get(orb.rowKeys[i])) lit.add(cell);
    below += orb.rows.get(orb.rowKeys[i]).length;
    i++;
  }
  const need = k - below;
  if (need <= 0 || i >= orb.rowKeys.length) return lit;
  const band = [];
  for (const cell of orb.rows.get(orb.rowKeys[i])) band.push({ cell, w: cell.b });
  if (i + 1 < orb.rowKeys.length) for (const cell of orb.rows.get(orb.rowKeys[i + 1])) band.push({ cell, w: cell.b + 0.75 });
  band.sort((a, b) => a.w - b.w);
  for (let j = 0; j < need && j < band.length; j++) lit.add(band[j].cell);
  return lit;
}

/**
  drawOrb(canvas, orb, { cell, score, t, colours: { body, rim } })
    cell    CSS px per cell (one per orb)
    score   0 to 100, the share of interior cells lit
    t       0 to 1, how far the fill has risen toward the score
*/
export function drawOrb(canvas, orb, { cell, score, t = 1, colours }) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const css = orb.n * cell;
  const px = Math.round(css * dpr);
  if (canvas.width !== px) {
    canvas.width = canvas.height = px;
    canvas.style.width = canvas.style.height = css + "px";
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, px, px);
  const p = cell * dpr;
  const at = (c) => Math.round((c + 0.5) * p * 2) / 2;
  const rad = Math.max(0.75, p * 0.4);
  const dot = (c, r) => { const x = at(c), y = at(r); ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); };

  ctx.fillStyle = colours.rim;
  ctx.beginPath();
  for (const { c, r } of orb.rim) dot(c, r);
  ctx.fill();

  const k = Math.round((orb.body.length * Math.max(0, Math.min(100, score)) / 100) * Math.max(0, Math.min(1, t)));
  ctx.fillStyle = colours.body;
  ctx.beginPath();
  for (const cell of litSet(orb, k)) {
    /* lam runs 0.3 (shadow) to 1 (full light); keep 100% of dots in shadow, 40% at the highlight */
    const light = Math.max(0, Math.min(1, (cell.lam - 0.3) / 0.7));
    const keep = 1 - 0.6 * Math.pow(light, 1.6);
    if (cell.b >= keep) continue;
    dot(cell.c, cell.r);
  }
  ctx.fill();
  return { lit: k, of: orb.body.length };
}
