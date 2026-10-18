import paper from 'paper';
paper.setup(new paper.Size(10, 10));
export const P = paper;
const pt = (x, y) => new P.Point(x, y);
// superellipse-ish oval: 4 segments, handle factor k (0.552 circle)
export function oval(cx, cy, rx, ry, k = 0.56, kx = null) {
  const ky = k, kh = kx ?? k;
  const p = new P.Path({ closed: true, insert: false, segments: [
    new P.Segment(pt(cx + rx, cy), pt(0, -ky * ry), pt(0, ky * ry)),
    new P.Segment(pt(cx, cy + ry), pt(kh * rx, 0), pt(-kh * rx, 0)),
    new P.Segment(pt(cx - rx, cy), pt(0, ky * ry), pt(0, -ky * ry)),
    new P.Segment(pt(cx, cy - ry), pt(-kh * rx, 0), pt(kh * rx, 0)),
  ]});
  return p;
}
export const rect = (x, y, w, h) => new P.Path.Rectangle({ point: [x, y], size: [w, h], insert: false });
export const poly = (pts) => new P.Path({ segments: pts.map(([x, y]) => pt(x, y)), closed: true, insert: false });
export const D = (d) => { const p = P.PathItem.create(d); p.remove(); return p; };
export const circ = (x, y, r) => new P.Path.Circle({ center: [x, y], radius: r, insert: false });
const norm = (p) => { if (p.className === 'Path' && p.area < 0) p.reverse(); else if (p.reorient) p.reorient(true, true); return p; };
export const U = (...a) => a.flat().map(norm).reduce((x, y) => norm(x.unite(y, { insert: false })));
export const S = (a, ...b) => b.flat().map(norm).reduce((x, y) => norm(x.subtract(y, { insert: false })), norm(a));
export const I = (a, b) => norm(norm(a).intersect(norm(b), { insert: false }));
// bracket fillet in a corner: corner (x,y), arm along x by sx (signed), along y by sy (signed)
export function bracket(x, y, sx, sy, k = 0.6) {
  const A = pt(x + sx, y), B = pt(x, y + sy);
  return new P.Path({ closed: true, insert: false, segments: [
    new P.Segment(pt(x, y)),
    new P.Segment(A, null, pt(-sx * k, 0)),
    new P.Segment(B, pt(0, -sy * k), null),
  ]});
}
// variable width stroke along skeleton path d; wfn(t, tangentAngleDeg) -> width; returns closed path with flat caps
export function vstroke(d, wfn, { n = 160, tol = 0.25, vec = null } = {}) {
  const sk = P.PathItem.create(d); sk.remove();
  const L = sk.length, A = [], B = [];
  for (let i = 0; i <= n; i++) {
    const s = Math.min(L, (L * i) / n);
    const p = sk.getPointAt(s), tg = sk.getTangentAt(s);
    const w = wfn(i / n, tg.angle);
    let nv = vec ? vec(i / n, tg) : sk.getNormalAt(s);
    A.push(p.add(nv.multiply(w / 2))); B.push(p.subtract(nv.multiply(w / 2)));
  }
  const a = new P.Path({ segments: A, insert: false }); a.simplify(tol);
  const b = new P.Path({ segments: B.reverse(), insert: false }); b.simplify(tol);
  const out = new P.Path({ insert: false, closed: true });
  out.addSegments(a.segments.map(s => s.clone()));
  out.addSegments(b.segments.map(s => s.clone()));
  return out;
}
export function toSVGd(item) { return item.pathData; }
export function finish(glyphs, { pad = 0 } = {}) {
  const all = U(glyphs);
  const b = all.bounds;
  all.translate(pt(-b.x + pad, -b.y + pad));
  // round numbers
  const d = all.pathData.replace(/-?\d+\.\d+/g, m => (+(+m).toFixed(1)).toString());
  return { d, w: Math.ceil(b.width + 2 * pad), h: Math.ceil(b.height + 2 * pad), baselineFromTop: -b.y + pad };
}
export function svg({ d, w, h }, title = 'Orbe') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><path fill="currentColor" d="${d}"/></svg>\n`;
}
// translational broad pen: nib length L at angle deg (y-down; negative = up-right). Exact sweep via runs.
export function pen(d, L, deg, { n = 400, tol = 0.3, mono = 0 } = {}) {
  const sk = P.PathItem.create(d); sk.remove();
  const a = deg * Math.PI / 180, h = new P.Point(Math.cos(a) * L / 2, Math.sin(a) * L / 2);
  const len = sk.length, pts = [], sg = [];
  for (let i = 0; i <= n; i++) { const s = Math.min(len, len * i / n); const p = sk.getPointAt(s), t = sk.getTangentAt(s); pts.push(p); sg.push(Math.sign(t.cross(h)) || 1); }
  const runs = []; let st = 0;
  for (let i = 1; i <= n; i++) if (sg[i] !== sg[st] || i === n) { runs.push([st, i]); st = i; }
  const pieces = runs.map(([i0, i1]) => {
    const A = [], B = [];
    for (let i = i0; i <= i1; i++) { A.push(pts[i].add(h)); B.push(pts[i].subtract(h)); }
    const pa = new P.Path({ segments: A, insert: false }); if (tol && A.length > 3) pa.simplify(tol);
    const pb = new P.Path({ segments: B.reverse(), insert: false }); if (tol && B.length > 3) pb.simplify(tol);
    const o = new P.Path({ insert: false, closed: true });
    o.addSegments(pa.segments.map(s => s.clone())); o.addSegments(pb.segments.map(s => s.clone()));
    return o;
  });
  if (mono) pieces.push(vstroke(d, () => mono, { n: 120 }));
  return U(pieces);
}
// closed skeleton ring with width by tangent
export function vring(d, wfn, { n = 240, tol = 0.25 } = {}) {
  const sk = P.PathItem.create(d); sk.remove();
  const L = sk.length, A = [], B = [];
  for (let i = 0; i < n; i++) {
    const s = (L * i) / n, p = sk.getPointAt(s), tg = sk.getTangentAt(s), nv = sk.getNormalAt(s), w = wfn(tg.angle);
    A.push(p.add(nv.multiply(w / 2))); B.push(p.subtract(nv.multiply(w / 2)));
  }
  const a = new P.Path({ segments: A, closed: true, insert: false }); a.simplify(tol);
  const b = new P.Path({ segments: B, closed: true, insert: false }); b.simplify(tol);
  return S(a.area * a.area > b.area * b.area ? a : b, a.area * a.area > b.area * b.area ? b : a);
}
// half-plane beyond line through (x,y) at angle deg, on side given by normal direction sign; big polygon
export function cutLine(x, y, deg, side = 1, R = 3000) {
  const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * side, ny = dx * side;
  return poly([[x - dx * R, y - dy * R], [x + dx * R, y + dy * R], [x + dx * R + nx * R, y + dy * R + ny * R], [x - dx * R + nx * R, y - dy * R + ny * R]]);
}
export const ovalD = (cx, cy, rx, ry, k = 0.56) => `M${cx},${cy - ry} C${cx + rx * k},${cy - ry} ${cx + rx},${cy - ry * k} ${cx + rx},${cy} C${cx + rx},${cy + ry * k} ${cx + rx * k},${cy + ry} ${cx},${cy + ry} C${cx - rx * k},${cy + ry} ${cx - rx},${cy + ry * k} ${cx - rx},${cy} C${cx - rx},${cy - ry * k} ${cx - rx * k},${cy - ry} ${cx},${cy - ry} Z`;
const sm = (p) => { p.smooth({ type: 'catmull-rom', factor: 0.5 }); return p; };
export function vstroke2(d, wfn, { n = 60 } = {}) {
  const sk = P.PathItem.create(d); sk.remove();
  const L = sk.length, A = [], B = [];
  for (let i = 0; i <= n; i++) {
    const s = Math.min(L, (L * i) / n), p = sk.getPointAt(s), tg = sk.getTangentAt(s), nv = sk.getNormalAt(s), w = wfn(i / n, tg.angle);
    A.push(p.add(nv.multiply(w / 2))); B.push(p.subtract(nv.multiply(w / 2)));
  }
  const a = sm(new P.Path({ segments: A, insert: false })), b = sm(new P.Path({ segments: B.reverse(), insert: false }));
  const out = new P.Path({ insert: false, closed: true });
  out.addSegments(a.segments.map(s => s.clone())); out.addSegments(b.segments.map(s => s.clone()));
  return out;
}
export function vring2(d, wfn, { n = 96 } = {}) {
  const sk = P.PathItem.create(d); sk.remove();
  const L = sk.length, A = [], B = [];
  for (let i = 0; i < n; i++) {
    const s = (L * i) / n, p = sk.getPointAt(s), tg = sk.getTangentAt(s), nv = sk.getNormalAt(s), w = wfn(tg.angle);
    A.push(p.add(nv.multiply(w / 2))); B.push(p.subtract(nv.multiply(w / 2)));
  }
  const a = sm(new P.Path({ segments: A, closed: true, insert: false })), b = sm(new P.Path({ segments: B, closed: true, insert: false }));
  return Math.abs(a.area) > Math.abs(b.area) ? S(a, b) : S(b, a);
}
// remove everything above (dir=-1) or below (dir=1) the line through x,y at angle deg
export function cutAt(x, y, deg, dir, R = 4000) {
  const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const A = [x - dx * R, y - dy * R], B = [x + dx * R, y + dy * R];
  return poly([A, B, [B[0], B[1] + dir * R * 3], [A[0], A[1] + dir * R * 3]]);
}
