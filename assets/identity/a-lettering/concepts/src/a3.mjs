// A3 Carved: glyphic lettering, every stroke waisted and flaring to a crisp cut end
import { vstroke2 as VS, vring2, ovalD, rect, poly, U, S, I, finish, svg, P } from './lib.mjs';
import fs from 'fs';
const XH = -500, WE = 138, WM = 100;
const pp = (x, y) => new P.Point(x, y);
const sstep = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const s2 = (th) => Math.pow(Math.sin(th * Math.PI / 180), 2);
function stem(cx, yTop, yBot) {
  const h = yBot - yTop, e = WE / 2, m = WM / 2, ym = (yTop + yBot) / 2;
  const k = Math.min(h * 0.42, 190);
  const side = (s) => [
    new P.Segment(pp(cx + s * e, yTop), null, pp(-s * (e - m) * 0.7, k * 0.45)),
    new P.Segment(pp(cx + s * m, ym), pp(0, -h * 0.3), pp(0, h * 0.3)),
    new P.Segment(pp(cx + s * e, yBot), pp(-s * (e - m) * 0.7, -k * 0.45), null)];
  const R = side(1), L = side(-1).reverse().map(sg => new P.Segment(sg.point, sg.handleOut, sg.handleIn));
  return new P.Path({ closed: true, insert: false, segments: [...R, ...L] });
}
const wO = (th) => 84 + 30 * s2(th);
const O = vring2(ovalD(344, -350, 344 - 57, 362 - 42, 0.575), wO, { n: 120 });
// r
const r0 = 2 * 344 + 66 + WE / 2;
const rStem = stem(r0, XH, 0);
const rArm = I(vring2(ovalD(r0 + 176, -250, 176, 208, 0.6), (th) => 70 + 30 * s2(th), { n: 120 }), poly([[r0, -560], [r0 + 262, -560], [r0 + 262, -330], [r0 + 40, -330], [r0, -330]]));
// b
const b0 = r0 + 262 + 80 + WE / 2;
const bStem = stem(b0, -745, 0);
const bcx = b0 + 6 + 222;
const bBowl = vring2(ovalD(bcx, -250, 222, 262 - 42, 0.6), (th) => 80 + 34 * s2(th), { n: 120 });
// e
const e0 = bcx + 222 + 57 + 66;
const ecx = e0 + 200;
const eRx = 200, eRy = 220;
let eRing = vring2(ovalD(ecx, -250, eRx, eRy, 0.58), (th) => 82 + 32 * s2(th), { n: 120 });
const tA = Math.tan(34 * Math.PI / 180);
eRing = S(eRing, poly([[ecx, -232], [ecx + 600, -232], [ecx + 600, -232 + 600 * tA]]));
const eBar = rect(ecx - eRx + 20, -296, 2 * eRx - 44, 66);
const out = finish([O, rStem, rArm, bStem, bBowl, eRing, eBar]);
fs.writeFileSync('A3.svg', svg(out)); console.log(out.w, out.h);
