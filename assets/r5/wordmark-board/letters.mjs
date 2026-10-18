// Orbe lettering engine. Pure functions that return SVG path data.
// Units: 1000 per em, y down, baseline at B.
export const B = 760;
const f = (n) => (Math.round(n * 10) / 10).toString();
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

// One elliptical quarter between two extrema. startH: tangent at start is horizontal.
export function quarter(a, b, startH, k = 0.5523) {
  const c1 = startH ? [a[0] + k * (b[0] - a[0]), a[1]] : [a[0], a[1] + k * (b[1] - a[1])];
  const c2 = startH ? [b[0], b[1] - k * (b[1] - a[1])] : [b[0] - k * (b[0] - a[0]), b[1]];
  return `C${pt(c1)} ${pt(c2)} ${pt(b)}`;
}

// Closed super-ellipse-ish oval from 4 extrema. cw = clockwise on screen.
export function oval(cx, cy, rx, ry, k = 0.5523, cw = true, rot = 0) {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const T = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
  const kk = cw ? [[0, -ry], [rx, 0], [0, ry], [-rx, 0]] : [[0, -ry], [-rx, 0], [0, ry], [rx, 0]];
  let d = `M${pt(T(...kk[0]))}`;
  for (let i = 0; i < 4; i++) {
    const a = kk[i], b = kk[(i + 1) % 4];
    const startH = a[1] !== 0; // top/bottom points have horizontal tangents
    const c1 = startH ? [a[0] + k * (b[0] - a[0]), a[1]] : [a[0], a[1] + k * (b[1] - a[1])];
    const c2 = startH ? [b[0], b[1] - k * (b[1] - a[1])] : [b[0] - k * (b[0] - a[0]), b[1]];
    d += `C${pt(T(...c1))} ${pt(T(...c2))} ${pt(T(...b))}`;
  }
  return d + "Z";
}

export const poly = (pts) => `M${pts.map(pt).join("L")}Z`;

// Smooth open polyline as cubic beziers (Catmull-Rom), returns command string without M.
function cr(points) {
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}
export const smoothClosed = (points) => {
  const n = points.length;
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + "Z";
};

// Pen stroke: centreline fn(t) -> [x,y], width fn(t). Flat ends. n samples.
export function stroke(fn, wfn, n = 48, t0 = 0, t1 = 1) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n, e = 1e-4;
    const p = fn(t), q = fn(Math.min(t1, t + e)), o = fn(Math.max(t0, t - e));
    let dx = q[0] - o[0], dy = q[1] - o[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = wfn(t) / 2;
    L.push([p[0] - dy * w, p[1] + dx * w]);
    R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  R.reverse();
  const poly_ = L.concat(R);
  let A = 0;
  for (let i = 0; i < poly_.length; i++) { const a = poly_[i], b2 = poly_[(i + 1) % poly_.length]; A += a[0] * b2[1] - b2[0] * a[1]; }
  if (A < 0) { L.reverse(); R.reverse(); return `M${pt(R[0])}${cr(R)}L${pt(L[0])}${cr(L)}Z`; }
  return `M${pt(L[0])}${cr(L)}L${pt(R[0])}${cr(R)}Z`;
}
// Broad-nib stroke: width depends on direction vs nib angle (deg).
export function nib(fn, nibW, nibH, angle, n = 96, t0 = 0, t1 = 1, taper = null) {
  const a = (angle * Math.PI) / 180;
  return stroke(fn, (t) => {
    const e = 1e-4, p = fn(Math.max(t0, t - e)), q = fn(Math.min(t1, t + e));
    const dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const w = Math.abs(Math.sin(dir - a)) * nibW + nibH;
    return taper ? w * taper(t) : w;
  }, n, t0, t1);
}
export const bez = (p0, p1, p2, p3) => (t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
};

// ---------- Base serif letters (Timeless-adjacent) ----------
export const P = { S: 94, Sr: 104, H: 36, cap: 700, x: 492, asc: 738, ov: 12 };

export function O_plain(x0, opt = {}) {
  const { S, Sr, H, cap, ov } = { ...P, ...opt };
  const rx = opt.rx ?? 340, ry = cap / 2 + ov, cx = x0 + rx, cy = B - cap / 2;
  const d = oval(cx, cy, rx, ry, 0.56, true) + oval(cx + (opt.dx || 0), cy, rx - Sr, ry - H, opt.ki ?? 0.6, false, opt.tilt || 0);
  return { d, adv: x0 + 2 * rx, cx, cy, rx, ry };
}

export function r(x0, opt = {}) {
  const { S, x } = { ...P, ...opt };
  const xt = B - x, sL = x0 + 56, sR = sL + S;
  let d = "";
  // stem with wedge flag
  d += `M${pt([x0 - 4, xt + 44])}L${pt([sR, xt - 16])}L${pt([sR, B - 60])}`;
  d += `C${pt([sR, B - 30])} ${pt([sR + 40, B - 26])} ${pt([sR + 84, B - 26])}L${pt([sR + 84, B])}L${pt([x0 - 2, B])}L${pt([x0 - 2, B - 26])}`;
  d += `C${pt([sL - 36, B - 26])} ${pt([sL, B - 30])} ${pt([sL, B - 60])}L${pt([sL, xt + 66])}C${pt([sL, xt + 52])} ${pt([sL - 26, xt + 46])} ${pt([x0 - 4, xt + 44])}Z`;
  // arm: a rising pen stroke with a pendant ball under its end
  const br = opt.ball ?? 45, reach = opt.reach ?? 112;
  const bc = [sR + reach, xt + 46];
  const arm = bez([sR - 40, xt + 118], [sR - 2, xt + 30], [sR + 50, xt + 4], [bc[0] - 4, bc[1] - 14]);
  d += stroke(arm, (t) => 76 - 44 * Math.pow(t, 0.75), 48);
  d += oval(bc[0], bc[1], br, br + 1, 0.5523, true);
  return { d, adv: bc[0] + br, sL, sR };
}

export function b(x0, opt = {}) {
  const { S, H, x, asc, ov } = { ...P, ...opt };
  const xt = B - x, at = B - asc, sL = x0 + 58, sR = sL + S;
  let d = "";
  d += `M${pt([x0, at + 42])}L${pt([sR, at - 6])}L${pt([sR, B - 40])}L${pt([sL, B - 40])}L${pt([sL, at + 64])}C${pt([sL, at + 50])} ${pt([sL - 26, at + 44])} ${pt([x0, at + 42])}Z`;
  const w = opt.bw ?? 432, ox = sL + 26, cx = ox + (w - 26 - S / 2) / 2 + S / 4;
  const right = sL + w, top = xt - ov, bot = B + ov;
  // bowl outer (from stem shoulder, round, back into stem foot)
  d += `M${pt([sR - 2, xt + 70])}C${pt([sR + 50, xt + 8])} ${pt([sR + 110, top])} ${pt([sR + 150, top])}`;
  d += quarter([sR + 150, top], [right, (top + bot) / 2], true, 0.6);
  d += quarter([right, (top + bot) / 2], [sR + 120, bot], false, 0.58);
  d += `C${pt([sR + 50, bot])} ${pt([sR + 10, bot - 2])} ${pt([sR, B + 9])}L${pt([sL, B + 2])}L${pt([sL, B - 50])}L${pt([sR, B - 50])}Z`;
  // counter
  const ct = top + H + 2, cb = bot - H, cr_ = right - (P.Sr - 6), cl = sR;
  d += `M${pt([cl, xt + 110])}L${pt([cl, B - 110])}C${pt([cl, B - 60])} ${pt([cl + 50, cb])} ${pt([cl + 110, cb])}`;
  d += `C${pt([cr_ - 30, cb])} ${pt([cr_, cb - 120])} ${pt([cr_, (ct + cb) / 2])}`;
  d += `C${pt([cr_, ct + 110])} ${pt([cr_ - 40, ct])} ${pt([cl + 100, ct])}C${pt([cl + 50, ct])} ${pt([cl, ct + 50])} ${pt([cl, xt + 110])}Z`;
  return { d, adv: right, sL, sR };
}

export function e(x0, opt = {}) {
  const { H, x, ov } = { ...P, ...opt };
  const w = opt.w ?? 418, Se = (opt.Se ?? 96);
  const xt = B - x, top = xt - ov, bot = B + ov, L = x0, R = x0 + w, mid = (top + bot) / 2;
  const cb = opt.bar ?? B - 0.53 * x, ct = cb - (opt.barH ?? 32), cx = (L + R) / 2;
  let d = `M${pt([R, cb])}`;
  d += `C${pt([R, top + 90])} ${pt([R - 90, top])} ${pt([cx + 4, top])}`;
  d += quarter([cx + 4, top], [L, mid + 6], true, 0.56);
  d += quarter([L, mid + 6], [cx + 14, bot], false, 0.56);
  const tx = R - 10, ty = B - 118;
  d += `C${pt([cx + 110, bot])} ${pt([tx - 40, bot - 50])} ${pt([tx, ty])}`;
  d += `L${pt([tx - 30, ty - 22])}`;
  const ib = bot - H - 4, il = L + Se;
  d += `C${pt([tx - 70, ib - 30])} ${pt([cx + 90, ib])} ${pt([cx + 30, ib])}`;
  d += `C${pt([il + 40, ib])} ${pt([il, ib - 120])} ${pt([il, cb + 30])}L${pt([il, cb])}Z`;
  // eye
  const er = R - Se + 6, et = top + H;
  d += `M${pt([il, ct])}C${pt([il, et + 70])} ${pt([cx - 50, et])} ${pt([cx + 6, et])}C${pt([cx + 60, et])} ${pt([er, et + 70])} ${pt([er, ct])}Z`;
  return { d, adv: R };
}

// Spacing helper
export function word(parts) {
  return parts.join("");
}
