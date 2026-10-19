/*
  Orbe pixel sprites, drawn as data.

  Every piece in the hero is built on one cell grid (the page scales the whole
  scene by one whole number of CSS pixels per cell: 4 on desktop, 3 on tablets,
  2 on phones). Each piece uses at most three colours plus Paper for glints:

    beaten marble  Cobalt rim and fill, Paper glint (a creator you beat)
    ahead marble   Ink rim, Straw fill, Paper glint (a creator ahead of you)
    lit marble     Ink rim, Paper fill, Sky glint (the one you point at)
    your marble    Ink rim, Ember fill to your score, Straw lattice, Paper glint
    small jar      Ink outline, Cobalt and Straw lattice, one Ember point
    receipt        Ink edges, Paper slip, one Ember strike
    ledger         Ink rim and rules, Paper card, Ember pin
    jar            Ink outline, Paper glass lattice, the field shows through
    shelf          Ink edges, Peony plank, Paper lattice
    lid            Ink rim, Straw crown and skirt with grooves left out, Paper glint
    shelf label    Ink rim, Paper card

  Shading is done by leaving cells out, never by adding a tone.
*/

export const C = { NONE: 0, INK: 1, COBALT: 2, EMBER: 3, STRAW: 4, PEONY: 5, PAPER: 6, SKY: 7 };

/* Brand values from site/assets/brand/tokens.css. Index matches C. */
export const RGB = [
  null,
  [0x14, 0x13, 0x11], // Ink
  [0x1f, 0x4b, 0xff], // Cobalt
  [0xff, 0x5a, 0x1f], // Ember
  [0xee, 0xd5, 0x6a], // Straw
  [0xf2, 0x87, 0x9e], // Peony
  [0xf3, 0xf0, 0xe8], // Paper
  [0x9e, 0xe9, 0xfb], // Sky
];

/* ---------------------------------------------------------------- the marble

  Nine cells across. o is the rim, a dot is glass, g is the glint (always Paper,
  drawn over whatever is under it). Hand set: the rim steps 2, 1, 1 at each quarter
  so it reads round at 2px cells as well as 4.
*/
export const MARBLE = [
  "  ooooo  ",
  " o.....o ",
  "o.gg....o",
  "o.g.....o",
  "o.......o",
  "o.......o",
  "o.......o",
  " o.....o ",
  "  ooooo  ",
];
export const D = MARBLE.length;

const MARBLE_RIM = [];
const MARBLE_IN = [];
const MARBLE_GLINT = [];
MARBLE.forEach((row, y) => [...row].forEach((ch, x) => {
  if (ch === "o") MARBLE_RIM.push([x, y]);
  else if (ch === ".") MARBLE_IN.push([x, y]);
  else if (ch === "g") { MARBLE_IN.push([x, y]); MARBLE_GLINT.push([x, y]); }
}));

/* The order glass fills in: bottom row first, and in each row from the middle out,
   so a part filled row shows a level surface with a small meniscus. */
const MID = (D - 1) / 2;
const FILL_ORDER = [...MARBLE_IN].sort((a, b) => b[1] - a[1] || Math.abs(a[0] - MID) - Math.abs(b[0] - MID) || a[0] - b[0]);
export const MARBLE_CELLS = FILL_ORDER.length;

/* Your marble's lattice: a diagonal lattice on a two cell pitch, offset every other
   row, then left out toward the lower right so the ball turns away from the light. */
function lattice(x, y) {
  if (y % 2 === 0) return false;
  if (((x + (y % 4 === 1 ? 0 : 2)) % 4) !== 1) return false;
  return x + y < 11;
}

/**
 * The cells of one marble, as [dx, dy, colour].
 * look: "beaten", "ahead", "lit" or "you". Only yours is filled to a score;
 * every other marble is a whole creator, solid.
 */
export function marble(look = "beaten", score = 100) {
  const out = [];
  const rim = look === "beaten" ? C.COBALT : C.INK;
  const body = { beaten: C.COBALT, ahead: C.STRAW, lit: C.PAPER, you: C.EMBER }[look];
  const glint = look === "lit" ? C.SKY : C.PAPER;
  const n = look === "you" ? Math.round((Math.max(0, Math.min(100, score)) / 100) * MARBLE_CELLS) : MARBLE_CELLS;
  for (const [x, y] of MARBLE_RIM) out.push([x, y, rim]);
  for (let i = 0; i < n; i++) {
    const [x, y] = FILL_ORDER[i];
    out.push([x, y, look === "you" && lattice(x, y) ? C.STRAW : body]);
  }
  for (const [x, y] of MARBLE_GLINT) out.push([x, y, glint]);
  return out;
}

/* ---------------------------------------------------------------- the jar

  Drawn from a profile: for each row from the top, how far the wall sits in from
  the jar's outer edge. Mouth with two thread lines, a neck, a stepped shoulder,
  a straight body and a heavy glass foot.
*/
const MOUTH = [3, 3, 3, 3, 3];
const NECK = [5, 5, 5, 5];
const SHOULDER = [4, 3, 2, 1, 1, 0, 0];  /* the shoulder steps back out from the neck */
const FOOT = [0, 0, 1, 2, 4];

export function jarProfile(bodyRows) {
  const rows = [];
  MOUTH.forEach((v, i) => rows.push({ inset: v, part: "mouth", i }));
  NECK.forEach((v, i) => rows.push({ inset: v, part: "neck", i }));
  SHOULDER.forEach((v, i) => rows.push({ inset: v, part: "shoulder", i }));
  for (let i = 0; i < bodyRows; i++) rows.push({ inset: 0, part: "body", i });
  FOOT.forEach((v, i) => rows.push({ inset: v, part: "foot", i }));
  return rows;
}

/**
 * Draws the jar into `put(x, y, colour)` with its top left at (ox, oy).
 * Returns the interior box the marbles may use, in scene cells.
 */
export function drawJar(put, ox, oy, width, bodyRows) {
  const rows = jarProfile(bodyRows);
  const W = width;
  rows.forEach((r, y) => {
    const L = r.inset, R = W - 1 - r.inset;
    const prev = rows[y - 1], next = rows[y + 1];
    put(ox + L, oy + y, C.INK);
    put(ox + R, oy + y, C.INK);
    /* Close the outline wherever the wall steps in or out. */
    if (prev && prev.inset !== r.inset) {
      const a = Math.min(prev.inset, r.inset), b = Math.max(prev.inset, r.inset);
      for (let x = a; x <= b; x++) { put(ox + x, oy + y, C.INK); put(ox + W - 1 - x, oy + y, C.INK); }
    }
    if (!prev) for (let x = L; x <= R; x++) put(ox + x, oy + y, C.INK);
    if (!next) for (let x = L; x <= R; x++) put(ox + x, oy + y, C.INK);

    if (r.part === "mouth") {
      /* Two thread lines, and a lip of light along the top. */
      if (r.i === 2 || r.i === 4) for (let x = L + 1; x < R; x++) put(ox + x, oy + y, C.INK);
      if (r.i === 1) for (let x = L + 2; x < R - 1; x += 2) put(ox + x, oy + y, C.PAPER);
    }
    if (r.part === "body" || r.part === "shoulder") {
      /* The glass: a Paper streak inside the left wall, broken so it reads as a
         reflection, and only a few points on the right, the side in shade. */
      const band = (r.i + (r.part === "shoulder" ? 0 : 7)) % 23;
      if (band < 14 || band === 16 || band === 18) put(ox + L + 2, oy + y, C.PAPER);
      if (r.part === "body" && band < 6 && r.i % 2 === 0) put(ox + L + 4, oy + y, C.PAPER);
      if (r.part === "body" && (r.i % 23 === 11 || r.i % 23 === 13)) put(ox + R - 2, oy + y, C.PAPER);
    }
    if (r.part === "shoulder" && r.i >= 2 && r.i % 2 === 0) {
      /* The shoulder catches the light: a short run of lattice points from the
         left, each row shorter, so it fades by leaving points out. */
      const run = 22 - r.i * 3;
      for (let k = 0; k < run; k += 4) put(ox + L + 4 + k + (r.i % 4 === 0 ? 2 : 0), oy + y, C.PAPER);
    }
    if (r.part === "foot" && r.i >= 1 && r.i <= 3 && y < rows.length - 1) {
      /* The heavy foot: a diagonal Paper lattice, thinning to the right. */
      for (let x = L + 3; x < R - 2; x++) if ((x + r.i * 2) % 6 === 0 && x < W * (0.5 - r.i * 0.08)) put(ox + x, oy + y, C.PAPER);
    }
    if (r.part === "foot" && r.i === 0) for (let x = L + 1; x < R; x++) put(ox + x, oy + y, C.INK);
  });
  const top = MOUTH.length + NECK.length + SHOULDER.length;
  return { x: ox + 1, y: oy + top, w: W - 2, h: bodyRows, rows: rows.length };
}

/* ---------------------------------------------------------------- the shelf */
export function drawShelf(put, x0, y0, x1, depth = 7) {
  for (let x = x0; x <= x1; x++) {
    put(x, y0, C.INK);
    put(x, y0 + depth - 1, C.INK);
    for (let y = 1; y < depth - 1; y++) {
      /* Paper lattice on the plank, left out near the bottom edge (shade under the lip). */
      const lat = y < depth - 3 && (x + y * 2) % 6 === 0;
      put(x, y0 + y, lat ? C.PAPER : C.PEONY);
    }
  }
  for (let y = 0; y < depth; y++) put(x0, y0 + y, C.INK);
  /* A bracket under the shelf, stepped. */
  const bx = x0 + 3;
  for (let i = 0; i < 12; i++) {
    put(bx, y0 + depth + i, C.INK);
    put(bx + 1, y0 + depth + i, C.INK);
    const w = 11 - i;
    if (w > 0) put(bx + 1 + w, y0 + depth + i, C.INK);
    if (i === 0) for (let x = bx; x <= bx + 12; x++) put(x, y0 + depth, C.INK);
    for (let x = bx + 2; x < bx + 1 + w; x++) put(x, y0 + depth + i, (x + i) % 3 === 0 && i < 6 ? C.PAPER : C.PEONY);
  }
}

/* ---------------------------------------------------------------- the lid
   The screw lid, ajar: resting on the left of the mouth and lifted on the right,
   climbing one cell every `run` columns. Steps meet corner to corner, as a
   pixel line does, with no extra cells to bridge them. Rows from the top of each column: Ink rim, Straw crown with a Paper
   glint, an Ink seam, then the Straw skirt with grooves left out. */
export function drawLid(put, x, baseY, w, run = 10, h = 9) {
  for (let i = 0; i < w; i++) {
    const lift = Math.floor(i / run);
    const bottom = baseY - lift;
    const top = bottom - h + 1;
    const end = i === 0 || i === w - 1;
    for (let j = 0; j < h; j++) {
      const y = top + j;
      let c = C.STRAW;
      if (end || j === 0 || j === h - 1) c = C.INK;
      else if (j === 3) c = C.INK;
      else if (j === 1 && i > 3 && i < w * 0.4 && i % 2 === 0) c = C.PAPER;
      else if (j > 3 && (i + 1) % 3 === 0) c = C.NONE;
      put(x + i, y, c);
    }
  }
}

/* ---------------------------------------------------------------- the small jars
   The other kinds, on the shelf with their lids on. A lattice of points stands
   for the hundred: Cobalt up to that kind's rank, Straw above, and one Ember
   point where the example creator sits. */
export function drawMiniJar(put, x, y, w, h, beats) {
  const neck = 2, cap = 4;
  for (let j = 0; j < h; j++) {
    const inset = j < cap ? 2 : j < cap + neck ? 3 : j === cap + neck ? 1 : j >= h - 2 ? (j === h - 1 ? 1 : 0) : 0;
    const L = inset, R = w - 1 - inset;
    if (j < cap) {
      /* the cap: Ink rim, Straw, grooves left out */
      for (let i = L; i <= R; i++) {
        const edge = j === 0 || j === cap - 1 || i === L || i === R;
        put(x + i, y + j, edge ? C.INK : (i % 2 === 0 ? C.STRAW : C.NONE));
      }
      continue;
    }
    put(x + L, y + j, C.INK); put(x + R, y + j, C.INK);
    if (j === cap + neck || j === h - 1) for (let i = L; i <= R; i++) put(x + i, y + j, C.INK);
  }
  /* the hundred, as a lattice inside the body */
  const top = y + cap + neck + 2, bottom = y + h - 3;
  const rows = [];
  for (let yy = bottom; yy >= top; yy -= 2) rows.push(yy);
  const level = Math.round(rows.length * beats / 100);
  rows.forEach((yy, r) => {
    for (let i = 2 + (r % 2); i < w - 2; i += 2) {
      if (r < level) put(x + i, yy, C.COBALT);
      else if ((i + r) % 4 === 0) put(x + i, yy, C.STRAW);
    }
  });
  /* the example creator: a two by two Ember point at its rank, with air around it */
  const ey = rows[Math.min(level, rows.length - 1)] - 1, ex = x + (w >> 1) - 1;
  for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) put(ex + i, ey + j, C.NONE);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) put(ex + i, ey + j, C.EMBER);
  /* a glint down the left of the glass */
  for (let j = cap + neck + 2; j < h - 4; j++) if (j % 5 !== 0) put(x + 1, y + j, C.PAPER);
}

/* ---------------------------------------------------------------- the receipt
   A slip printed from above the window, so its top runs off the edge, with a
   torn foot. Rules are solid one cell lines. */
export function drawReceipt(put, x, w, h, rules = []) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const tooth = j >= h - 2 ? (i % 4 < 2 ? h - 2 : h - 1) : h;
      if (j > tooth) continue;
      const foot = j === tooth || (j === h - 2 && i % 4 === 1) || (j === h - 1 && i % 4 === 2);
      const edge = i === 0 || i === w - 1;
      put(x + i, j, edge || foot ? C.INK : C.PAPER);
    }
  }
  for (const r of rules) for (let i = 3; i < w - 3; i++) put(x + i, r, C.INK);
}

/* ---------------------------------------------------------------- the ledger
   A card pinned up beside the jar, ruled in Ink, with an Ember pin. */
export function drawLedger(put, x, y, w, h, rules = []) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue;
    const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
    put(x + i, y + j, edge ? C.INK : C.PAPER);
  }
  for (const r of rules) for (let i = 2; i < w - 2; i++) put(x + i, y + r, C.INK);
  const px = x + (w >> 1) - 2, py = y - 2;
  const PIN = [" kkk ", "keeek", "keeek", " kkk ", "  k  "];
  PIN.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== " ") put(px + i, py + j, ch === "k" ? C.INK : C.EMBER); }));
}

/* ---------------------------------------------------------------- the shelf label */
export function drawLabel(put, x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
    put(x + i, y + j, edge ? C.INK : C.PAPER);
  }
}

/* ---------------------------------------------------------------- product icons
   Sixteen cells square, three colours plus Paper each. Keys: k Ink, b Cobalt,
   e Ember, s Straw, r Peony, p Paper. */
export const ICONS = {
  rate: [
    "                ",
    "                ",
    "     kkkkkk     ",
    "   kkeeeeeekk   ",
    "  keppeeeeeeek  ",
    "  kepeesesseek  ",
    " keeeseeeeseeek ",
    " keeeeeeeeeeeek ",
    "kkkkkkkkkkkkkkkk",
    " keeeeeeeeeeeek ",
    "  keeeeeeeeeek  ",
    "  keeeeeeeeeek  ",
    "   kkeeeeeekk   ",
    "     kkkkkk     ",
    "                ",
    "                ",
  ],
  podcasts: [
    "      kkkk      ",
    "     kbbbbk     ",
    "    kbpbbbbk    ",
    "    kbpbkbbk    ",
    "    kbbbbbbk    ",
    "    kbkbbkbk    ",
    "  k kbbbbbbk k  ",
    "  k kbbkbbbk k  ",
    "  k  kbbbbk  k  ",
    "   k  kkkk  k   ",
    "    kk    kk    ",
    "      kkkk      ",
    "       kk       ",
    "       kk       ",
    "    kkkkkkkk    ",
    "                ",
  ],
  sponsorships: [
    "                ",
    "    kkkkkkkk    ",
    "   kssssssssk   ",
    "   kkkkkkkkkk   ",
    "   kssssssssk   ",
    "  kkkkkkkkkkk   ",
    "  ksssssssssk   ",
    "  kkkkkkkkkkkk  ",
    "  kpsssssssssk  ",
    "  kkkkkkkkkkkk  ",
    "   kssssssssssk ",
    "   kkkkkkkkkkkk ",
    "   kpsssssssssk ",
    "   kkkkkkkkkkkk ",
    "                ",
    "                ",
  ],
  selling: [
    "                ",
    "   kkkk         ",
    "  kssssk        ",
    " ksskkssk       ",
    " ksk  ksk       ",
    " ksk  ksk       ",
    " ksskkssk       ",
    "  kssssk        ",
    "   kssk         ",
    "    ksskkkkkkk  ",
    "    kssssssssk  ",
    "     kkkkskskk  ",
    "         kk kk  ",
    "                ",
    "                ",
    "                ",
  ],
  diligence: [
    " kkkkkkkkkk     ",
    " kppppppppk     ",
    " kpkkkkkkpk     ",
    " kppppppppk     ",
    " kpkkkkkppk     ",
    " kpppkkkkkk     ",
    " kpkkkkbbbbk    ",
    " kpppkbppbbbk   ",
    " kpkkkbpbbbbk   ",
    " kpppkbbbbbbk   ",
    " kkkkkkbbbbkk   ",
    "        kkkkkk  ",
    "           kkk  ",
    "            kkk ",
    "             kk ",
    "                ",
  ],
};
export const ICON_KEYS = { k: C.INK, b: C.COBALT, e: C.EMBER, s: C.STRAW, r: C.PEONY, p: C.PAPER };
