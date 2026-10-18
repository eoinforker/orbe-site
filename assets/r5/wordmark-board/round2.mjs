import { B, P, O_plain, r, b, e, oval, stroke, nib, bez } from "./letters.mjs";
const word = (O) => { const rr = r(O.adv + 44), bb = b(rr.adv + 44), ee = e(bb.adv + 50); return O.d + rr.d + bb.d + ee.d; };

// Lap O: an elliptical stroke of just over one turn; last stretch steps inside the start.
export function lapO(x0, o = {}) {
  const RX = o.rx ?? 340, RY = 362, H = o.H ?? 36, Sr = o.Sr ?? 104;
  const cx = x0 + RX, cy = B - 350;
  const crx = RX - Sr / 2, cry = RY - H / 2;
  const a0 = o.a0 ?? -90, over = o.over ?? 34, step = o.step ?? (H + (o.gap ?? 10));
  const sweep = 360 + over;
  const fn = (t) => {
    const deg = a0 + sweep * t, a = (deg * Math.PI) / 180;
    const into = Math.max(0, (deg - (a0 + 360 - (o.ease ?? 40))) / ((o.ease ?? 40)));
    const s = into * into * (3 - 2 * Math.min(1, into));
    const k = (Math.min(1, s));
    return [cx + (crx - k * step * Math.abs(Math.cos(a)) * 0) * Math.cos(a) - 0, cy + (cry - k * step) * Math.sin(a) + 0];
  };
  const tp = (t) => {
    const s0 = over / sweep; // taper length
    if (t < s0) return 0.12 + 0.88 * (t / s0);
    if (t > 1 - s0) return 0.12 + 0.88 * ((1 - t) / s0);
    return 1;
  };
  const d = nib(fn, Sr - H, H, 0, 240, 0, 1, tp);
  return { d, adv: x0 + 2 * RX };
}

const list = [];
const add = (id, title, idea, d) => list.push({ id, title, idea, d });
add("a1", "Axis A1", "Counter tilted 23.4 degrees, moderate contrast.", word(O_plain(0, { tilt: -23.4, Sr: 100, ki: 0.58 })));
add("a2", "Axis A2", "Higher contrast, finer hairlines at 11 and 5 o'clock.", word(O_plain(0, { tilt: -23.4, Sr: 120, H: 26, ki: 0.6 })));
add("a3", "Axis A3", "Round outer, narrower lens counter (pointier ends).", word(O_plain(0, { tilt: -23.4, Sr: 112, H: 30, ki: 0.5, rx: 352 })));
add("l1", "Lap L1", "Overlap at 12 o'clock, end tucked under the start.", word(lapO(0, { a0: -100, over: 40 })));
add("l2", "Lap L2", "Overlap at about 1 o'clock, longer.", word(lapO(0, { a0: -70, over: 50, gap: 14 })));
add("l3", "Lap L3", "Overlap at 11 o'clock, short and tight.", word(lapO(0, { a0: -130, over: 30, gap: 8 })));
export const candidates = list;
