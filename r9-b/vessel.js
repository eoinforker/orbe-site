/*
  The O as a vessel. The Carved wordmark's O is the glass and its counter holds
  the liquid. Everything here is in the wordmark's own units (1000 per em,
  y up is negative in the drawing, so the code works in z = -y, "height").

  Physics: the free surface is a sum of eight sloshing modes of a tank the
  width of the counter, cos(n pi x / L), each a damped oscillator with the
  water-wave dispersion relation w^2 = g k tanh(k h), so a shallow fill
  sloshes slower than a deep one, as real liquid does. A sideways
  acceleration A of the glass tilts the rest state of the surface to slope
  A / g; only the odd modes carry that tilt. Volume is exact: every frame the
  mean level is solved (by bisection) so the liquid's area inside the
  counter's true outline equals the target, whatever the surface is doing.
*/
import { WORDMARK } from "../assets/r5/wordmark.js";

const GLYPH = WORDMARK.text.O;
export const O_W = 664;           /* glyph advance box */
export const O_TOP = -713;
export const O_H = 726;           /* from -713 to 13 */
const INNER = "M" + GLYPH.split("M")[2];
const RING = new Path2D(GLYPH);
const COUNTER = new Path2D(INNER);

/* Sample the counter's outline (an M and four relative cubics) into a polyline. */
function contour(d) {
  const nums = d.match(/-?\d*\.?\d+/g).map(Number);
  let x = nums[0], y = nums[1];
  const pts = [];
  for (let i = 2; i + 5 < nums.length; i += 6) {
    const [a, b, c, e, f, g] = nums.slice(i, i + 6);
    const p0 = [x, y], p1 = [x + a, y + b], p2 = [x + c, y + e], p3 = [x + f, y + g];
    for (let t = 0; t < 1; t += 1 / 90) {
      const u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    x = p3[0]; y = p3[1];
  }
  return pts;
}
const PTS = contour(INNER);
const XL = Math.min(...PTS.map((p) => p[0])), XR = Math.max(...PTS.map((p) => p[0]));
export const L = XR - XL;                                  /* 440 */
const ZB = -Math.max(...PTS.map((p) => p[1])), ZT = -Math.min(...PTS.map((p) => p[1]));
export const COUNTER_BOX = { xl: XL, xr: XR, zb: ZB, zt: ZT };

const N = 120;                                             /* columns */
const DX = L / N;
const XS = new Float64Array(N), LO = new Float64Array(N), HI = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const x = XL + (i + 0.5) * DX;
  XS[i] = x;
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j < PTS.length; j++) {
    const a = PTS[j], b = PTS[(j + 1) % PTS.length];
    if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue;
    const z = -(a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
    lo = Math.min(lo, z); hi = Math.max(hi, z);
  }
  LO[i] = lo; HI[i] = hi;
}
let FULL = 0;
for (let i = 0; i < N; i++) FULL += (HI[i] - LO[i]) * DX;
export const COUNTER_AREA = FULL;

const K = 8;
const COS = Array.from({ length: K + 1 }, (_, n) => Float64Array.from(XS, (x) => Math.cos((n * Math.PI * (x - XL)) / L)));
const G = 14400;                                           /* units / s^2: the first mode of a full O rings at about 0.62 s */
const ZETA = 0.34;

/** Mean level (z) for which the liquid fills `frac` of the counter, given surface offsets eta. */
function solveLevel(frac, eta) {
  const want = frac * FULL;
  let a = ZB - 400, b = ZT + 400;
  for (let it = 0; it < 26; it++) {
    const m = (a + b) / 2;
    let area = 0;
    for (let i = 0; i < N; i++) {
      const top = m + (eta ? eta[i] : 0);
      area += (top <= LO[i] ? 0 : top >= HI[i] ? HI[i] - LO[i] : top - LO[i]) * DX;
    }
    if (area < want) a = m; else b = m;
  }
  return (a + b) / 2;
}
/** The static height of a fill fraction: where a mark for that fraction belongs. */
export const levelOf = (frac) => solveLevel(Math.max(0, Math.min(1, frac)), null);

export class Vessel {
  constructor(frac = 0) {
    this.frac = frac;
    this.a = new Float64Array(K + 1);
    this.v = new Float64Array(K + 1);
    this.eta = new Float64Array(N);
    this.level = levelOf(frac);
    this.A = 0;                 /* sideways acceleration of the glass, units / s^2 */
    this.gEff = G;
  }
  /** A drop of liquid landing at x (units) with downward speed vz (units / s) and a share of the counter `m`. */
  impulse(x, strength) {
    const u = (x - XL) / L;
    for (let n = 1; n <= K; n++) this.v[n] -= strength * Math.cos(n * Math.PI * u) / (1 + 0.45 * n);
  }
  step(dt) {
    const h = Math.max(40, this.level - ZB);
    const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
    const d = dt / sub;
    const tilt = Math.max(-0.42, Math.min(0.42, this.A / this.gEff));
    for (let s = 0; s < sub; s++) {
      for (let n = 1; n <= K; n++) {
        const k = (n * Math.PI) / L;
        const w = Math.sqrt(this.gEff * k * Math.tanh(k * h));
        const z = ZETA + 0.04 * n;
        const target = n % 2 ? (tilt * 4 * L) / (n * n * Math.PI * Math.PI) : 0;
        const acc = -w * w * (this.a[n] - target) - 2 * z * w * this.v[n];
        this.v[n] += acc * d;
        this.a[n] += this.v[n] * d;
      }
    }
    for (let i = 0; i < N; i++) {
      let e = 0;
      for (let n = 1; n <= K; n++) e += this.a[n] * COS[n][i];
      this.eta[i] = e;
    }
    this.level = solveLevel(this.frac, this.eta);
  }
  /** True when the surface is still to well under a device pixel. */
  get still() {
    if (Math.abs(this.A) > 1) return false;
    let e = 0;
    for (let n = 1; n <= K; n++) e += Math.abs(this.a[n]) + Math.abs(this.v[n]) * 0.02;
    return e < 0.25;
  }
  rest() { this.a.fill(0); this.v.fill(0); this.eta.fill(0); this.level = levelOf(this.frac); }
  /** Surface height (z, units) at x. */
  surfaceAt(x) {
    const i = Math.max(0, Math.min(N - 1, Math.floor((x - XL) / DX)));
    return Math.max(LO[i], this.level + this.eta[i]);
  }

  /*
    Draw into ctx at a box in CSS px: { x, y, h } is the O's glyph box (top left, height).
    opts: liquid, ink, air (colour for marks above the liquid), wet (marks under it),
    sheen, marks: [{ frac | z, text, side: "l" | "r", dash, rule, sub }], px: device ratio.
  */
  draw(ctx, box, o) {
    const s = box.h / O_H;
    const px = o.px || 1;
    ctx.save();
    ctx.setTransform(px * s, 0, 0, px * s, px * box.x, px * (box.y - O_TOP * s));
    const u = 1 / s;          /* one CSS px, in units */
    const liquid = new Path2D();
    if (this.frac > 0.0005) {
      liquid.moveTo(XL - 2, -(this.level + this.eta[0]));
      for (let i = 0; i < N; i++) liquid.lineTo(XS[i], -(this.level + this.eta[i]));
      liquid.lineTo(XR + 2, -(this.level + this.eta[N - 1]));
      liquid.lineTo(XR + 2, 20); liquid.lineTo(XL - 2, 20); liquid.closePath();
    }
    const air = new Path2D();
    air.moveTo(XL - 2, -(this.frac > 0.0005 ? this.level + this.eta[0] : -40));
    if (this.frac > 0.0005) for (let i = 0; i < N; i++) air.lineTo(XS[i], -(this.level + this.eta[i]));
    else air.lineTo(XR + 2, 40);
    air.lineTo(XR + 2, this.frac > 0.0005 ? -(this.level + this.eta[N - 1]) : 40);
    air.lineTo(XR + 2, -900); air.lineTo(XL - 2, -900); air.closePath();

    if (this.frac > 0.0005) {
      ctx.save();
      ctx.clip(COUNTER);
      ctx.fillStyle = o.liquid;
      ctx.fill(liquid);
      /* the surface catches the light: a Sky line just inside the liquid */
      ctx.beginPath();
      for (let i = 0; i < N; i++) ctx.lineTo(XS[i], -(this.level + this.eta[i]) + 1.4 * u);
      ctx.strokeStyle = o.sheen; ctx.lineWidth = 2.2 * u; ctx.stroke();
      ctx.restore();
    }
    /* marks: drawn twice, once clipped to the air in ink and once clipped to the liquid in chalk */
    const marks = o.marks || [];
    if (marks.length) {
      for (const [clip, col] of [[air, o.air], [liquid, o.wet]]) {
        if (clip === liquid && this.frac <= 0.0005) continue;
        ctx.save();
        ctx.clip(COUNTER); ctx.clip(clip);
        for (const m of marks) this.mark(ctx, m, col, u);
        ctx.restore();
      }
    }
    ctx.fillStyle = o.ink;
    ctx.fill(RING, "evenodd");
    ctx.restore();
  }
  /*
    A graduation: a rule across the counter (or a short tick at one wall) and a label.
    The label sits just above its line ("above") or just under it ("below"), inset from
    the wall at its own height, and picks the longest of its texts that fits.
  */
  mark(ctx, m, col, u) {
    const z = m.z ?? levelOf(m.frac);
    const alpha = m.alpha ?? 1;
    if (alpha <= 0.01) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    if (m.rule !== false) {
      ctx.lineWidth = (m.weight || 1) * u;
      ctx.setLineDash(m.dash ? [5 * u, 4 * u] : []);
      ctx.beginPath();
      if (m.tick) {
        const hw = halfWidthAt(z), cx = (XL + XR) / 2;
        const x0 = m.side === "l" ? cx - hw : cx + hw - m.tick * u;
        ctx.moveTo(x0, -z); ctx.lineTo(x0 + m.tick * u, -z);
      } else { ctx.moveTo(XL, -z); ctx.lineTo(XR, -z); }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (m.text) {
      const fs = (m.size || 11) * u;
      ctx.font = `500 ${fs}px "Commit Mono", ui-monospace, Menlo, monospace`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.06 * fs}px`;
      ctx.textBaseline = "alphabetic";
      const cap = fs * 0.72;
      const base = m.pos === "below" ? z - 6 * u - cap : m.pos === "mid" ? z - cap / 2 : z + 5 * u;
      const half = Math.min(halfWidthAt(base), halfWidthAt(base + cap)) - (m.tick ? 0 : 0);
      const inset = (m.side === "r" ? (m.rightInset ?? 10) : 10) * u;
      const avail = 2 * half - inset - 10 * u - (m.reserve || 0) * u;
      const list = Array.isArray(m.text) ? m.text : [m.text];
      const text = list.find((t) => ctx.measureText(t).width <= avail);
      if (text) {
        const cx = (XL + XR) / 2;
        ctx.textAlign = m.side === "r" ? "right" : "left";
        ctx.fillText(text, m.side === "r" ? cx + half - inset : cx - half + inset, -base);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Half the counter's width at height z. */
export function halfWidthAt(z) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (z >= LO[i] && z <= HI[i]) { lo = Math.min(lo, XS[i]); hi = Math.max(hi, XS[i]); }
  return lo === Infinity ? 0 : (hi - lo) / 2;
}
export const counterX = (x) => x - XL;
export { XL, XR, ZB, ZT, RING, COUNTER, G };
