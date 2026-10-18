// Final Orbe wordmark geometry: "The lap". Exports path data used by wordmark.svg and wordmark.js.
import { B, O_plain, r, b, e, oval, stroke } from "./letters.mjs";

const f = (n) => (Math.round(n * 10) / 10).toString();
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

export function build(o = {}) {
  const Sr = o.Sr ?? 102, H = o.H ?? 30, rx = 340;
  const O = O_plain(0, { Sr, H, rx, ki: 0.6 });
  const crx = rx - Sr, cry = O.ry - H;
  const s = o.scale ?? 0.6, th = ((o.at ?? -46) * Math.PI) / 180;
  const px = O.cx + crx * Math.cos(th), py = O.cy + cry * Math.sin(th);
  const lrx = crx * s, lry = cry * s, lcx = px - lrx * Math.cos(th), lcy = py - lry * Math.sin(th);
  const sweep = o.sweep ?? 306, hw = o.hw ?? 11, sw = o.swell ?? 26, ballR = o.ball ?? 24;
  // The loop bites a little into the O's thick right wall: its start is hidden inside the stroke and it
  // emerges into the counter with a crisp acute crotch, the way a shoulder leaves a stem.
  const bite = o.bite ?? 10;
  const fn = (t) => { const a = th - (sweep * t * Math.PI) / 180; return [lcx + bite * Math.cos(th) + lrx * Math.cos(a), lcy + bite * Math.sin(th) + lry * Math.sin(a)]; };
  const wfn = (t) => {
    const a = th - (sweep * t * Math.PI) / 180, v = Math.abs(Math.cos(a));
    const T0 = o.t0 ?? -0.01, T1 = o.tin ?? 0.09; const bracket = t < T1 ? Math.max(0.02, (t - T0) / (T1 - T0)) ** 0.8 : 1;
    return (hw + sw * v) * bracket;
  };
  const loop = stroke(fn, wfn, o.n ?? 110, o.t0 ?? -0.01, 1);
  const end = fn(1);
  const ball = oval(end[0], end[1], ballR, ballR, 0.5523, true);
  // centreline for the draw-on mask, as smooth cubic path
  const N = 36, cl = [];
  for (let i = 0; i <= N; i++) cl.push(fn(-0.04 + (1.04 * i) / N));
  let spine = `M${pt(cl[0])}`;
  for (let i = 0; i < cl.length - 1; i++) {
    const p0 = cl[Math.max(0, i - 1)], p1 = cl[i], p2 = cl[i + 1], p3 = cl[Math.min(cl.length - 1, i + 2)];
    spine += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  const rr = r(O.adv + (o.k1 ?? 40)), bb = b(rr.adv + (o.k2 ?? 42)), ee = e(bb.adv + (o.k3 ?? 48));
  return { geo: { lcx, lcy, lrx, lry, bite, th, sweep, crx, cry }, th, Sr, H, rx, ry: O.ry, O: O.d, loop, ball, spine, rbe: rr.d + bb.d + ee.d, end, ballR, Ocx: O.cx, Ocy: O.cy, width: ee.adv, B };
}
