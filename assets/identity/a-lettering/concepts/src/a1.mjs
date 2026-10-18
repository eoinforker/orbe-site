// A1 Handed on: each letter touches the next
import { oval, rect, poly, circ, U, S, bracket, vstroke, finish, svg } from './lib.mjs';
import fs from 'fs';
const XH = -500, ASC = -745;
const ST = 112, HL = 40;
const O = S(oval(340, -350, 330, 362, 0.57), oval(340, -350, 330 - ST, 362 - HL, 0.6));
// r
const r0 = 714, r1 = r0 + ST;
const rStem = rect(r0, XH - 4, ST, 504);
const rFoot = U(rect(r0 - 46, -36, ST + 92, 36), bracket(r0, -36, -40, -44), bracket(r1, -36, 40, -44));
import { P } from './lib.mjs';
const pp = (x, y) => new P.Point(x, y);
const rHead = new P.Path({ closed: true, insert: false, segments: [
  new P.Segment(pp(r0 + 4, XH - 4)), new P.Segment(pp(636, XH + 6)),
  new P.Segment(pp(642, XH + 22), null, pp(40, 0)),
  new P.Segment(pp(r0 + 4, XH + 96), pp(-20, -50), null)]});
const arm = vstroke(`M${r1 - 6},-392 C${r1 + 14},-468 ${r1 + 62},-504 ${r1 + 122},-506 C${r1 + 150},-507 ${r1 + 172},-500 ${r1 + 186},-488`,
  (t) => 26 + 22 * Math.min(1, t * 2.2));
const ball = circ(r1 + 160, -450, 52);
// b
const b0 = r1 + 160 + 52 - 4, b1 = b0 + ST;
const bStem = rect(b0, ASC + 40, ST, -ASC - 40);
const bHead = poly([[b0, ASC + 30], [b1, ASC - 4], [b1, ASC + 80], [b0, ASC + 80]]);
const bOutR = b1 + 356;
const bOut = oval((b0 + bOutR) / 2, -250, (bOutR - b0) / 2, 262, 0.58);
const bInL = b1 + 16, bInR = bOutR - ST;
const bIn = oval((bInL + bInR) / 2, -250, (bInR - bInL) / 2, 262 - HL, 0.62);
const bSpur = U(rect(b0 - 34, -30, 40, 30), bracket(b0, -30, -30, -30));
// e sharing b's right stroke
const eL = bInR, eR = eL + 432, eInL = bOutR, eInR = eR - 104;
const eCx = (eInL + eInR) / 2;
const eOut = oval((eL + eR) / 2, -250, (eR - eL) / 2, 262, 0.58);
const eIn = oval(eCx, -250, (eInR - eInL) / 2, 262 - HL, 0.62);
const t30 = Math.tan(32 * Math.PI / 180);
let e = S(eOut, eIn, poly([[eCx, -246], [eR + 100, -246], [eR + 100, -246 + (eR + 100 - eCx) * t30]]));
const bar = rect(eInL - 2, -284, eInR - eInL + 4, 38);
const out = finish([O, rStem, rFoot, rHead, arm, ball, S(U(bStem, bHead, bOut, bSpur), bIn), e, bar]);
fs.writeFileSync('A1.svg', svg(out)); console.log(out.w, out.h);
