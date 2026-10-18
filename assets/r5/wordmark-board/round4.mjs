import { B, P, O_plain, r, b, e, oval, stroke } from "./letters.mjs";
const word = (O) => { const rr = r(O.adv + 44), bb = b(rr.adv + 44), ee = e(bb.adv + 50); return O.d + rr.d + bb.d + ee.d; };
export function loopO(x0, o = {}) {
  const Sr = o.Sr ?? 112, H = o.H ?? 30, rx = o.rx ?? 340;
  const O = O_plain(x0, { Sr, H, rx, ki: 0.6 });
  const crx = rx - Sr, cry = O.ry - H;
  const s = o.scale ?? 0.6, th = ((o.at ?? -62) * Math.PI) / 180;
  const px = O.cx + crx * Math.cos(th), py = O.cy + cry * Math.sin(th);
  const lrx = crx * s, lry = cry * s, lcx = px - lrx * Math.cos(th), lcy = py - lry * Math.sin(th);
  const sweep = o.sweep ?? 290, hw = o.hw ?? 14, sw = o.swell ?? 16;
  // t=0 at the merge with the wall, t=1 at the free end (ball). Travels clockwise on screen from the merge.
  const fn = (t) => { const a = th + (sweep * t * Math.PI) / 180; return [lcx + lrx * Math.cos(a), lcy + lry * Math.sin(a)]; };
  const wfn = (t) => {
    const a = th + (sweep * t * Math.PI) / 180, v = Math.abs(Math.cos(a));
    const bracket = t < 0.12 ? 1 + (o.bracket ?? 0.9) * Math.pow(1 - t / 0.12, 2) : 1;
    const tail = o.ball ? 1 : (t > 0.8 ? 1 - 0.85 * ((t - 0.8) / 0.2) : 1);
    return (hw + sw * v) * bracket * tail;
  };
  // start the stroke slightly inside the wall so the join is solid
  let d = stroke((t) => { const p = fn(t); return t === 0 ? p : p; }, wfn, 120, -0.02, 1);
  if (o.ball) { const end = fn(1); d += oval(end[0], end[1], o.ball, o.ball, 0.5523, true); }
  return { d: O.d + d, adv: O.adv, loop: { lcx, lcy, lrx, lry, th, sweep } };
}
const list = [];
const add = (id, title, idea, d) => list.push({ id, title, idea, d });
add("r1", "Loop R1", "Scale .62, merge at 1 o'clock, ball 26.", word(loopO(0, { scale: 0.62, at: -62, sweep: 290, ball: 26 })));
add("r2", "Loop R2", "Scale .54, merge at 12:30, ball 24, more air.", word(loopO(0, { scale: 0.54, at: -75, sweep: 300, ball: 24 })));
add("r3", "Loop R3", "Scale .70, merge at 1:30, tapered end, no ball.", word(loopO(0, { scale: 0.7, at: -50, sweep: 285, ball: 0 })));
add("a2", "Axis A2", "Reference: the quiet alternative.", word(O_plain(0, { tilt: -23.4, Sr: 120, H: 26, ki: 0.6 })));
export const candidates = list;
