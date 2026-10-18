import { B, P, O_plain, r, b, e, oval, stroke, nib, bez, poly } from "./letters.mjs";

const serifWord = (O, extra = "") => {
  const rr = r(O.adv + 44), bb = b(rr.adv + 30), ee = e(bb.adv + 50);
  return { d: O.d + rr.d + bb.d + ee.d + extra, rr, bb, ee };
};

// 1. Axis: O stress tilted to the Earth's axial tilt.
function axis() {
  const O = O_plain(0, { tilt: -23.4, Sr: 100, ki: 0.58 });
  const w = serifWord(O);
  return { id: "axis", title: "1 Axis", idea: "The O is drawn with its stress tilted 23.4 degrees, the Earth's axial tilt. A world on its axis, set among upright letters.", d: w.d };
}

// 2. Lap: the O is one pen stroke that goes once round and a little past where it began.
function lap() {
  const rx = 340 - 52, ry = 362 - 18, cx = 340, cy = B - 350;
  const a0 = -112, sweep = 392; // degrees, clockwise from top-left
  const fn = (t) => {
    const a = ((a0 + sweep * t) * Math.PI) / 180;
    const shrink = t > 0.86 ? (t - 0.86) / 0.14 : 0; // tuck inside on the last stretch
    const k = 1 - 0.07 * shrink * shrink;
    return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)];
  };
  const O = nib(fn, 70, 34, 0, 160, 0, 1, (t) => (t < 0.04 ? 0.55 + 0.45 * (t / 0.04) : t > 0.9 ? 1 - 0.75 * ((t - 0.9) / 0.1) : 1));
  const w = serifWord({ d: O, adv: 680 });
  return { id: "lap", title: "2 Lap", idea: "The O is one stroke that goes once round and finishes a little past where it began. An orbit is a lap, and every lap is measured against your own last one.", d: w.d };
}

// 3. Orbit swash: the e's tail runs back under the word and closes into the O.
function swash() {
  const O = O_plain(0);
  const w = serifWord(O);
  const ex = w.ee.adv;
  const tail = bez([ex - 18, B - 112], [ex + 40, B + 40], [ex - 260, B + 96], [ex - 700, B + 92]);
  const tail2 = bez([ex - 700, B + 92], [ex - 1200, B + 88], [O.cx + 420, B + 70], [O.cx + 150, B - 2]);
  const s1 = stroke(tail, (t) => 34 - 18 * t, 40);
  const s2 = stroke(tail2, (t) => 16 + 10 * Math.sin(Math.PI * t) * 0 + 4 * t, 60);
  return { id: "swash", title: "3 Orbit swash", idea: "The e's tail runs back beneath the word and closes into the O, so the name completes one orbit and returns to where it began.", d: w.d + s1 + s2 };
}

// 4. One measure: lowercase orbe where o, b and e are the same circle.
function measure() {
  const R = 262, S = 100, B2 = B, cy = B2 - 250, gap = 70;
  let d = "", x = R;
  const ring = (cx) => oval(cx, cy, R, R, 0.5523, true) + oval(cx, cy, R - S, R - S, 0.5523, false);
  d += ring(x); // o
  // r: stem plus a quarter of the same ring
  const rx0 = x + R + gap;
  d += poly([[rx0, cy - R + 20], [rx0 + S, cy - R + 20], [rx0 + S, B2], [rx0, B2]]);
  const rc = rx0 + R; // arc centred so its left edge is the stem
  const arc = (t) => { const a = Math.PI + (Math.PI / 2.35) * t; return [rc + (R - S / 2) * Math.cos(a), cy + (R - S / 2) * Math.sin(a)]; };
  d += stroke(arc, () => S, 40);
  // b
  const bx0 = rx0 + S + 150;
  d += poly([[bx0, cy - R - 238], [bx0 + S, cy - R - 238], [bx0 + S, B2 + 12], [bx0, B2 + 12]]);
  d += ring(bx0 + R);
  // e: ring cut open at lower right, crossbar as its diameter
  const ecx = bx0 + 2 * R + gap + R;
  const er = (t) => { const a = (-0 + 320 * t) * Math.PI / 180 * -1 + 0; return [ecx + (R - S / 2) * Math.cos(a), cy + (R - S / 2) * Math.sin(a)]; };
  d += stroke((t) => { const a = (-(320 * t) * Math.PI) / 180; return [ecx + (R - S / 2) * Math.cos(a), cy + (R - S / 2) * Math.sin(a)]; }, () => S, 80);
  d += poly([[ecx - R + 10, cy - S * 0.42], [ecx + R - 2, cy - S * 0.42], [ecx + R - 2, cy + S * 0.42], [ecx - R + 10, cy + S * 0.42]]);
  return { id: "measure", title: "4 One measure", idea: "o, b and e are the same circle, and the r's arm is a quarter of it. One measure for everyone, the fair yardstick drawn into the letters.", d };
}

// 5. Meridian: a heavier O whose thick sides carry an engraved inline, an orbit traced inside the letter.
function meridian() {
  const O = O_plain(0, { Sr: 132, H: 30 });
  const w = serifWord(O);
  const cx = O.cx, cy = O.cy, rx = O.rx - 66, ry = O.ry - 15;
  const side = (s) => (t) => { const a = ((s ? -62 : 118) + 124 * t) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
  const inl = (t) => 3 + 13 * Math.sin(Math.PI * t);
  return { id: "meridian", title: "5 Meridian", idea: "The O's thick sides carry an engraved inline that traces an orbit inside the letter, like a line cut into a coin.", d: w.d, cut: stroke(side(true), inl, 50) + stroke(side(false), inl, 50) };
}

// 6. rb ligature: the r's arm reaches up and becomes the b's flag.
function lig() {
  const O = O_plain(0);
  const rr = r(O.adv + 44, { ball: 0.01 });
  const bb = b(rr.adv + 10), ee = e(bb.adv + 50);
  const xt = B - P.x, at = B - P.asc;
  const s = rr.sR;
  const arc = bez([s - 14, xt + 118], [s + 30, xt - 60], [s + 60, at + 70], [bb.sL - 10, at + 30]);
  const d = O.d + rr.d.replace(/M[^M]*$/, "") + bb.d + ee.d + stroke(arc, (t) => 74 - 46 * t, 60);
  return { id: "lig", title: "6 rb ligature", idea: "The r's arm climbs and becomes the flag of the b, one stroke tying the rating to the record, in the tradition of the old ct and st ligatures.", d };
}

export const candidates = [axis(), lap(), swash(), measure(), meridian(), lig()];
