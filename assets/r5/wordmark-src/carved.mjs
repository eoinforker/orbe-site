// Orbe wordmark, A3 "Carved": the drawing. Glyphic lettering: every stem narrows at the waist and
// flares to a crisp, flat-cut end; no serifs. Units: 1000 per em, y down, baseline at y = 0.
// Two cuts from one construction: "text" (display, above 24px) and "small" (16 to 24px, heavier waists,
// lower contrast, opener counters and looser spacing).
// Run: node carved.mjs <outdir>   (needs the paper package: npm i paper@0.12.18)
import paper from 'paper';
import fs from 'fs';
paper.setup(new paper.Size(10, 10));
const P = paper;
const pt = (x, y) => new P.Point(x, y);
const seg = (x, y, hi, ho) => new P.Segment(pt(x, y), hi ? pt(...hi) : null, ho ? pt(...ho) : null);
const path = (segs) => new P.Path({ segments: segs, closed: true, insert: false });
const norm = (p) => { if (p.className === 'Path' && p.area < 0) p.reverse(); else if (p.reorient) p.reorient(true, true); return p; };
const U = (...a) => a.flat().map(norm).reduce((x, y) => norm(x.unite(y, { insert: false })));
const Sub = (a, ...b) => b.flat().map(norm).reduce((x, y) => norm(x.subtract(y, { insert: false })), norm(a));
const Int = (a, b) => norm(norm(a).intersect(norm(b), { insert: false }));
const poly = (pts) => path(pts.map(([x, y]) => seg(x, y)));

// Oval from its four extremes, with separate handle factors for the horizontal and vertical extremes.
function oval(l, t, r, b, kx = 0.56, ky = kx) {
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
  return path([
    seg(cx, t, [-kx * rx, 0], [kx * rx, 0]),
    seg(r, cy, [0, -ky * ry], [0, ky * ry]),
    seg(cx, b, [kx * rx, 0], [-kx * rx, 0]),
    seg(l, cy, [0, ky * ry], [0, -ky * ry]),
  ]);
}

// A waisted stem: flat-cut ends of width eT (top) and eB (bottom), waist w at wy (fraction of the height
// from the top). F is how far the flare reaches along the stem from each end: the chisel's entry.
function stem(cx, yT, yB, { eT, eB, w, F, wy = 0.5 }) {
  const ym = yT + (yB - yT) * wy, up = ym - yT, dn = yB - ym;
  const side = (s) => [
    seg(cx + s * eT / 2, yT, null, [-s * (eT - w) / 2 * 0.92, Math.min(F, up * 0.8)]),
    seg(cx + s * w / 2, ym, [0, -(up - Math.min(F, up * 0.8) * 0.35) * 0.62], [0, (dn - Math.min(F, dn * 0.8) * 0.35) * 0.62]),
    seg(cx + s * eB / 2, yB, [-s * (eB - w) / 2 * 0.92, -Math.min(F, dn * 0.8)], null),
  ];
  const R = side(1), L = side(-1).reverse().map((g) => new P.Segment(g.point, g.handleOut, g.handleIn));
  return path([...R, ...L]);
}

export const CUTS = {
  text: {
    XH: 500, ASC: 742, CAP: 700, osC: 13, osX: 11,
    stem: { eT: 136, eB: 142, w: 102, F: 118 },
    O: { w: 664, side: 112, top: 80, ko: 0.565, ki: 0.6, tilt: 0 },
    r: { arm: 84, tip: 98, reach: 252, join: -318 },
    b: { w: 452, side: 116, top: 80, joinT: 46, joinB: 40 },
    e: { w: 432, side: 112, top: 80, bar: 60, barY: -268, apex: 14, ang: 38 },
    gaps: { Or: 56, rb: 34, be: 62 },
  },
  small: {
    XH: 510, ASC: 742, CAP: 700, osC: 12, osX: 10,
    stem: { eT: 140, eB: 146, w: 118, F: 104 },
    O: { w: 672, side: 122, top: 94, ko: 0.565, ki: 0.6, tilt: 0 },
    r: { arm: 94, tip: 106, reach: 262, join: -322 },
    b: { w: 462, side: 124, top: 92, joinT: 56, joinB: 50 },
    e: { w: 444, side: 120, top: 92, bar: 70, barY: -272, apex: 0, ang: 34 },
    gaps: { Or: 74, rb: 52, be: 80 },
  },
};

export function build(c) {
  const { XH, ASC, CAP, osC, osX, stem: st } = c;
  const parts = {}, spines = [];
  // O: outer and counter from extremes; vertical stress; the counter a touch squarer than the outline.
  const oT = -CAP - osC, oB = osC, oL = 0, oR = c.O.w;
  const O = Sub(oval(oL, oT, oR, oB, c.O.ko), oval(oL + c.O.side, oT + c.O.top, oR - c.O.side, oB - c.O.top, c.O.ki));
  parts.O = O;
  spines.push({ k: 'O', d: ovalD(oL + c.O.side / 2, oT + c.O.top / 2, oR - c.O.side / 2, oB - c.O.top / 2, (c.O.ko + c.O.ki) / 2), w: c.O.side });

  // r: a waisted stem; the arm springs from its right side in a thin crotch, rises to the x-height and
  // ends in a flat cut that is itself a small flare (the tip is heavier than the arch).
  const r0 = oR + c.gaps.Or + st.eB / 2;
  const rStem = stem(r0, -XH, 0, st);
  const a = c.r, xT = r0 + a.reach, top = -XH - osX;
  const tipTop = top + 26, tipBot = tipTop + a.tip, archBot = top + a.arm;
  const arm = path([
    seg(r0 + 6, -XH, null, [52, 0]),
    seg(r0 + 148, top, [-56, 0], [52, 0]),
    seg(xT, tipTop, [-36, -15], null),
    seg(xT - 3, tipBot, null, [-30, -20]),
    seg(r0 + 140, archBot, [46, -5], [-46, 3]),
    seg(r0 + st.w / 2 - 1, a.join, [6, -54], null),
    seg(r0, a.join + 20),
    seg(r0, -XH),
  ]);
  parts.r = U(rStem, arm);
  spines.push({ k: 'r', d: `M${r0},${-XH} L${r0},0`, w: st.w });
  spines.push({ k: 'r', d: `M${r0 + 30},${a.join - 40} C${r0 + 60},${top + 30} ${r0 + 150},${top + 30} ${xT - 2},${tipTop + a.tip / 2}`, w: a.arm });

  // b: a tall waisted stem and a bowl whose counter is the stem's own concave side.
  const b0 = xT + c.gaps.rb + st.eT / 2;
  const bStem = stem(b0, -ASC, 0, st);
  const bT = -XH - osX, bB = osX, bR = b0 - st.w / 2 + c.b.w;
  const bowlOut = oval(b0 - 20, bT, bR, bB, 0.6, 0.58);
  const bowlIn = oval(b0 - 4, bT + c.b.top, bR - c.b.side, bB - c.b.top, 0.62, 0.6);
  // thin the joins: the counter reaches up and down into the stem's corners a little
  const bowl = Int(Sub(bowlOut, bowlIn), poly([[b0, -900], [bR + 50, -900], [bR + 50, 100], [b0, 100]]));
  parts.b = U(bStem, bowl);
  spines.push({ k: 'b', d: `M${b0},${-ASC} L${b0},0`, w: st.w });
  const bcx = (b0 - 12 + bR - c.b.side / 2) / 2;
  spines.push({ k: 'b', d: `M${b0},${bT + c.b.top / 2} C${b0 + 200},${bT + c.b.top / 2} ${bR - c.b.side / 2},${bT + 80} ${bR - c.b.side / 2},${(bT + bB) / 2} C${bR - c.b.side / 2},${bB - 80} ${b0 + 200},${bB - c.b.top / 2} ${b0},${bB - c.b.top / 2}`, w: c.b.side });

  // e: a round with a fine bar; the aperture is one straight cut from the bar's end, so the terminal is
  // a crisp angled end like the stems'.
  const eL = bR + c.gaps.be, eR = eL + c.e.w, eT = -XH - osX, eB = osX, ecx = (eL + eR) / 2;
  const eOut = oval(eL, eT, eR, eB, 0.58, 0.57);
  const eIn = oval(eL + c.e.side, eT + c.e.top, eR - c.e.side + 4, eB - c.e.top, 0.6, 0.58);
  const barB = c.e.barY + c.e.bar / 2, barT = c.e.barY - c.e.bar / 2;
  const tA = Math.tan(c.e.ang * Math.PI / 180), ax = ecx + c.e.apex;
  let e = Sub(eOut, eIn);
  e = U(e, Int(poly([[eL, barT], [eR, barT], [eR, barB], [eL, barB]]), eOut));
  e = Sub(e, poly([[ax, barB], [eR + 400, barB], [eR + 400, barB + 400 * tA + (eR - ax) * tA]]));
  parts.e = e;
  spines.push({ k: 'e', d: `M${eL + 20},${c.e.barY} L${eR - c.e.side / 2},${c.e.barY} C${eR - c.e.side / 2},${eT + 60} ${ecx + 120},${eT + c.e.top / 2} ${ecx},${eT + c.e.top / 2} C${eL + 60},${eT + c.e.top / 2} ${eL + c.e.side / 2},${eT + 120} ${eL + c.e.side / 2},${(eT + eB) / 2} C${eL + c.e.side / 2},${eB - 100} ${ecx - 100},${eB - c.e.top / 2} ${ecx + 20},${eB - c.e.top / 2} C${ecx + 110},${eB - c.e.top / 2} ${eR - 70},${eB - 50} ${eR - 30},${barB + 120}`, w: c.e.side });

  const W = Math.ceil(eR);
  const vb = { x: 0, y: -ASC, w: W, h: ASC + osC };
  const r1 = (s) => s.replace(/-?\d+\.\d+/g, (m) => (+(+m).toFixed(1)).toString());
  const D = {};
  for (const k of ['O', 'r', 'b', 'e']) D[k] = r1(parts[k].pathData);
  return { D, d: r1(U(Object.values(parts)).pathData), vb, spines, metrics: { XH, ASC, CAP, osC, osX, r0, b0, eL, eR, oR } };
}

function ovalD(l, t, r, b, k) {
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
  // anticlockwise on screen from the top, the way an O is written
  return `M${cx},${t} C${cx - rx * k},${t} ${l},${cy - ry * k} ${l},${cy} C${l},${cy + ry * k} ${cx - rx * k},${b} ${cx},${b} C${cx + rx * k},${b} ${r},${cy + ry * k} ${r},${cy} C${r},${cy - ry * k} ${cx + rx * k},${t} ${cx},${t}`;
}

export function svgOf(g, title = 'Orbe') {
  const { vb } = g;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}" role="img" aria-label="${title}"><title>${title}</title><path fill="currentColor" d="${g.d}"/></svg>\n`;
}

if (process.argv[1] && process.argv[1].endsWith('carved.mjs')) {
  const out = process.argv[2] || '.';
  const res = {};
  for (const [k, c] of Object.entries(CUTS)) {
    const g = build(c);
    res[k] = g;
    fs.writeFileSync(`${out}/carved-${k}.svg`, svgOf(g));
  }
  fs.writeFileSync(`${out}/carved.json`, JSON.stringify(res));
  console.log(Object.entries(res).map(([k, g]) => `${k} ${g.vb.w}x${g.vb.h} nodes ${(g.d.match(/[cCLlVvHhzZ]/g) || []).length}`).join('\n'));
}
