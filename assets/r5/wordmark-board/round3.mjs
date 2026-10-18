import { B, P, O_plain, r, b, e, oval, stroke, bez } from "./letters.mjs";
const word = (O, extra = "") => { const rr = r(O.adv + 44), bb = b(rr.adv + 44), ee = e(bb.adv + 50); return O.d + rr.d + bb.d + ee.d + extra; };

// Loop O: a didone-ish O plus a hairline orbit that leaves the counter wall tangentially and ends in a ball.
export function loopO(x0, o = {}) {
  const Sr = o.Sr ?? 112, H = o.H ?? 30, rx = o.rx ?? 340;
  const O = O_plain(x0, { Sr, H, rx, tilt: o.tilt || 0, ki: 0.6 });
  const crx = rx - Sr, cry = O.ry - H; // counter radii
  const s = o.scale ?? 0.6, th = ((o.at ?? -60) * Math.PI) / 180;
  // small ellipse internally tangent to counter at angle th
  const px = O.cx + crx * Math.cos(th), py = O.cy + cry * Math.sin(th);
  const lrx = crx * s, lry = cry * s;
  const lcx = px - lrx * Math.cos(th), lcy = py - lry * Math.sin(th);
  const hw = o.hw ?? 16, sweep = o.sweep ?? 300;
  const fn = (t) => { const a = th + (sweep * t * Math.PI) / 180; return [lcx + lrx * Math.cos(a), lcy + lry * Math.sin(a)]; };
  const wfn = (t) => {
    const a = th + (sweep * t * Math.PI) / 180; // thicker on vertical travel
    const v = Math.abs(Math.cos(a));
    const base = hw + (o.swell ?? 18) * v;
    return t < 0.06 ? base * (0.4 + 0.6 * t / 0.06) : base;
  };
  let d = stroke(fn, wfn, 90);
  const end = fn(1), br = o.ball ?? 24;
  if (br) d += oval(end[0], end[1], br, br, 0.5523, true);
  return { d: O.d + d, adv: O.adv, cx: O.cx, cy: O.cy };
}

const list = [];
const add = (id, title, idea, d) => list.push({ id, title, idea, d });
add("v1", "Loop V1", "Inner orbit at 60 percent of the counter, leaving at 2 o'clock, ball end.", word(loopO(0, {})));
add("v2", "Loop V2", "Small copperplate loop near the top.", word(loopO(0, { scale: 0.34, at: -75, sweep: 330, ball: 20 })));
add("v3", "Loop V3", "Large orbit hugging the counter, no ball, tapered end.", word(loopO(0, { scale: 0.78, at: -40, sweep: 280, ball: 0, hw: 12, swell: 14 })));
add("v4", "Loop V4", "Inner orbit with axis tilt on the O.", word(loopO(0, { tilt: -23.4, Sr: 118, H: 26, scale: 0.55, at: -110, sweep: 300 })));
export const candidates = list;
