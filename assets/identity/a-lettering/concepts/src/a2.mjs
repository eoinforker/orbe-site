// A2 The burin: one engraver's angle sets every stroke's weight and cuts every end
import { vstroke2 as VS, vring2, cutAt, ovalD, U, S, I, rect, poly, bracket, finish, svg, P } from './lib.mjs';
import fs from 'fs';
const ANG = -20, ST = 98, HL = 20, XH = -470;
const w = (th) => HL + (ST - HL) * Math.pow(Math.abs(Math.sin((th - ANG) * Math.PI / 180)), 2.4);
const vs = (d) => VS(d, (t, th) => w(th));
const cutIn = (x, y, dir, bx) => I(cutAt(x, y, ANG, dir), rect(...bx));
const pp = (x, y) => new P.Point(x, y);
// pointed wedge serif: from stem side at y0 outwards by len, concave
const T = Math.tan(-ANG * Math.PI / 180);
// flag on stem top-left: tip on the cut line, concave underside
function flag(x, yTop, len, h) { return new P.Path({ closed: true, insert: false, segments: [
  new P.Segment(pp(x + 2, yTop)), new P.Segment(pp(x - len, yTop + len * T), null, pp(len * 0.5, 0)),
  new P.Segment(pp(x + 2, yTop + h), pp(-len * 0.1, -h * 0.5), null)]}); }
function wedge(x, y, len, h, side) { // side -1 left, 1 right; y = baseline-level flat edge (bottom) or top
  return new P.Path({ closed: true, insert: false, segments: [
    new P.Segment(pp(x, y)), new P.Segment(pp(x + side * len, y), null, pp(-side * len * 0.55, 0)),
    new P.Segment(pp(x, y - h), pp(0, h * 0.55), null)]});
}
const O = vring2(ovalD(318, -350, 276, 336, 0.565), w);
// r
const sx0 = 724, sx1 = sx0 + ST;
const rStem = S(U(rect(sx0, XH - 60, ST, -(XH - 60)), flag(sx0, XH + 2, 70, 110)), cutAt(sx0, XH + 2, ANG, -1));
const rFeet = U(wedge(sx0, 0, 58, 64, -1), wedge(sx1, 0, 58, 64, 1));
const rArm = S(vs(`M${sx1 - 8},-290 C${sx1 + 12},-400 ${sx1 + 72},-472 ${sx1 + 156},-474 C${sx1 + 226},-476 ${sx1 + 266},-436 ${sx1 + 268},-300`, ),
  cutIn(sx1 + 262, -428, 1, [sx1 + 160, -440, 220, 260]));
// b
const bx0 = sx1 + 330, bx1 = bx0 + ST;
const bStem = S(U(rect(bx0, -820, ST, 820), flag(bx0, -744, 72, 120)), cutAt(bx0, -744, ANG, -1));
const bBowl = vs(`M${bx1 - 40},-300 C${bx1 + 10},-420 ${bx1 + 96},-474 ${bx1 + 172},-474 C${bx1 + 300},-474 ${bx1 + 362},-366 ${bx1 + 362},-234 C${bx1 + 362},-88 ${bx1 + 278},10 ${bx1 + 156},10 C${bx1 + 86},10 ${bx1 + 20},-20 ${bx1 - 40},-80`);
const bSpur = wedge(bx0, 0, 40, 50, -1);
// e
const eL = bx1 + 362 + 140;
const eRing = S(vs(`M${eL + 300},-220 C${eL + 300},-396 ${eL + 236},-474 ${eL + 146},-474 C${eL + 46},-474 ${eL - 2},-376 ${eL - 2},-236 C${eL - 2},-84 ${eL + 74},10 ${eL + 180},10 C${eL + 250},10 ${eL + 300},-24 ${eL + 336},-120`),
  cutIn(eL + 312, -92, -1, [eL + 220, -214, 200, 150]));
const eBar = rect(eL + 20, -272, 290, HL + 8);
const out = finish([O, rStem, rFeet, rArm, bStem, bBowl, bSpur, eRing, eBar]);
fs.writeFileSync('A2.svg', svg(out)); console.log(out.w, out.h);
