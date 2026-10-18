// A4 Orbs: the O is the orb; every open curve in the word ends in the same orb, small
import { oval, rect, poly, circ, U, S, I, vstroke2 as VS, bracket, finish, svg } from './lib.mjs';
import fs from 'fs';
const ST = 112, HL = 24, XH = -500, ASC = -745, BR = 50;
const sstep = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const O = S(oval(318, -350, 318, 362, 0.56), oval(318, -350, 318 - ST, 362 - HL - 4, 0.58));
// serif helpers: hairline slab, tiny bracket
const serifL = (x, y, len, up) => U(rect(x - len, up ? y : y - HL, len, HL), bracket(x, up ? y + HL : y - HL, -16, up ? 16 : -16));
const serifR = (x, y, len, up) => U(rect(x, up ? y : y - HL, len, HL), bracket(x, up ? y + HL : y - HL, 16, up ? 16 : -16));
// r
const r0 = 636 + 70, r1 = r0 + ST;
const rStem = U(rect(r0, XH, ST, -XH), serifL(r0, XH, 64, true), serifL(r0, 0, 56, false), serifR(r1, 0, 56, false));
const rArm = VS(`M${r1 - 4},-372 C${r1 + 26},-452 ${r1 + 86},-494 ${r1 + 150},-494 C${r1 + 178},-494 ${r1 + 200},-488 ${r1 + 214},-478`, (t) => 22 + 10 * sstep(0.5, 1, t), { n: 70 });
const rBall = circ(r1 + 174, -446, BR);
// b
const b0 = r1 + 174 + BR + 84, b1 = b0 + ST;
const bStem = U(rect(b0, ASC, ST, -ASC), serifL(b0, ASC, 64, true));
const bOutR = b1 + 330;
const bcx = (b0 + 40 + bOutR) / 2;
const bBowl = S(oval(bcx, -250, (bOutR - b0 - 40) / 2, 262, 0.57), oval(bcx - 20, -250, (bOutR - ST - b1 - 6) / 2, 262 - HL, 0.6));
const bSpur = rect(b0, -2, 1, 1);
// e
const e0 = bOutR + 70, eR = e0 + 420;
const ecx = (e0 + eR) / 2;
let e = S(oval(ecx, -250, 210, 262, 0.57), oval(ecx + 4, -250, 210 - ST + 6, 262 - HL, 0.6));
e = S(e, rect(ecx + 10, -234, 300, 260));
const eTail = VS(`M${ecx - 10},0 C${ecx + 80},0 ${ecx + 148},-36 ${ecx + 178},-104`, (t) => HL + 8 * sstep(0.5, 1, t), { n: 60 });
const eBall = circ(ecx + 160, -130, BR - 4);
const eBar = rect(e0 + 30, -262, 2 * 210 - 50, HL + 4);
const out = finish([O, rStem, rArm, rBall, bStem, bBowl, bSpur, e, eTail, eBall, eBar]);
fs.writeFileSync('A4.svg', svg(out)); console.log(out.w, out.h);
