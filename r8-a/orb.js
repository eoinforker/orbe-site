/*
  The hero orb, built to the round 8 spec (docs/handoff/TEARDOWN-FAL.md 13.4)
  in the illustration language's motif (round dots, never square pixels).

  - One cell unit for the whole piece: 8 CSS px at desktop, 6 at phones.
  - A disc on a square grid of cells; every cell holds at most one round dot.
  - Three colours: body (the accent), a one-cell rim (Ink), glints (Paper).
  - The fill is the score: exactly round(score% of the interior cells) are lit,
    counted from the bottom row up. The partly lit rows are a two-cell band
    dithered with a 4x4 Bayer matrix, so the edge reads as a sphere and the
    count stays exact. Unlit cells are empty: an unrated orb is only its rim.
  - Shading by omission: dots shrink and drop out on the shadow side; no
    fourth tone, no gradient, no glow.
*/

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function buildOrb(n) {
  const R = n / 2;
  const inside = (c, r) => {
    const dx = c + 0.5 - R, dy = r + 0.5 - R;
    return dx * dx + dy * dy <= R * R;
  };
  const rim = [], body = [];
  const L = [-0.5, -0.58], lz = Math.sqrt(1 - L[0] * L[0] - L[1] * L[1]);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!inside(c, r)) continue;
      const edge = !inside(c - 1, r) || !inside(c + 1, r) || !inside(c, r - 1) || !inside(c, r + 1);
      if (edge) { rim.push({ c, r }); continue; }
      const dx = (c + 0.5 - R) / R, dy = (r + 0.5 - R) / R;
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const lam = 0.3 + 0.7 * Math.max(0, dx * L[0] + dy * L[1] + nz * lz);
      body.push({ c, r, lam, b: BAYER[r % 4][c % 4] / 16 });
    }
  }
  /* bottom row first, so the fill rises; within a row, left to right */
  body.sort((a, b) => b.r - a.r || a.c - b.c);
  const rows = new Map();
  for (const cell of body) { if (!rows.has(cell.r)) rows.set(cell.r, []); rows.get(cell.r).push(cell); }
  const rowKeys = [...rows.keys()].sort((a, b) => b - a);
  return { n, rim, body, rows, rowKeys };
}

/** Which body cells are lit for a count k: whole rows from the bottom, then a two-row Bayer band. */
function litSet(orb, k) {
  const lit = new Set();
  if (k <= 0) return lit;
  let below = 0, i = 0;
  while (i < orb.rowKeys.length && below + orb.rows.get(orb.rowKeys[i]).length <= k) {
    for (const cell of orb.rows.get(orb.rowKeys[i])) lit.add(cell);
    below += orb.rows.get(orb.rowKeys[i]).length;
    i++;
  }
  let need = k - below;
  if (need <= 0 || i >= orb.rowKeys.length) return lit;
  /* the band: the row being filled and the one above it; the lower row takes most */
  const band = [];
  for (const cell of orb.rows.get(orb.rowKeys[i])) band.push({ cell, w: cell.b });
  if (i + 1 < orb.rowKeys.length) for (const cell of orb.rows.get(orb.rowKeys[i + 1])) band.push({ cell, w: cell.b + 0.75 });
  band.sort((a, b) => a.w - b.w);
  for (let j = 0; j < need && j < band.length; j++) lit.add(band[j].cell);
  return lit;
}

/**
  Draw the orb into a canvas.
    orb     from buildOrb(n)
    cell    CSS px per cell
    score   0 to 100: the share of interior cells lit
    t       0 to 1: how far the fill has risen toward the score
    colours { body, rim, glint }
*/
export function drawOrb(canvas, orb, { cell, score, t = 1, colours }) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const css = orb.n * cell;
  if (canvas.width !== Math.round(css * dpr)) {
    canvas.width = canvas.height = Math.round(css * dpr);
    canvas.style.width = canvas.style.height = css + "px";
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const p = cell * dpr;
  const at = (c) => Math.round((c + 0.5) * p * 2) / 2;
  const dot = (c, r, rad) => { const x = at(c), y = at(r); ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); };

  /* the rim: always drawn, so an empty orb still shows its edge */
  ctx.fillStyle = colours.rim;
  ctx.beginPath();
  for (const { c, r } of orb.rim) dot(c, r, p * 0.4);
  ctx.fill();

  const k = Math.round((orb.body.length * Math.max(0, Math.min(100, score)) / 100) * Math.max(0, Math.min(1, t)));
  const lit = litSet(orb, k);
  const glints = [];
  ctx.fillStyle = colours.body;
  ctx.beginPath();
  for (const cell of lit) {
    /* shading by omission: on the dark side a Bayer threshold leaves cells out */
    if (cell.lam < 0.42 && cell.b > (cell.lam - 0.3) * 6) continue;
    const rad = p * (0.16 + 0.28 * Math.min(1, (cell.lam - 0.3) / 0.62));
    /* glints: a sparse diagonal lattice where the light is strongest */
    if (cell.lam > 0.95 && (cell.c - cell.r) % 4 === 0 && cell.r % 2 === 0) { glints.push(cell); continue; }
    dot(cell.c, cell.r, rad);
  }
  ctx.fill();
  ctx.fillStyle = colours.glint;
  ctx.beginPath();
  for (const cell of glints) dot(cell.c, cell.r, p * 0.4);
  ctx.fill();
  return { lit: k, of: orb.body.length };
}
