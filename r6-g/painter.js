/*
  The archive's painter. Every picture on the page is laid down here with a
  flat brush, one deliberate stroke at a time: a stroke is a band of bristles
  that starts crisp, carries its paint, and breaks into dry streaks where the
  paint runs out. Compositions are placed by hand (see SCENES), not scattered:
  a few wide strokes for the ground, a handful of dabs for one stand of trees,
  a few flicks of grass. No filters, no noise fields.
*/

/* Seeded random, so a picture is the same every time it is painted. */
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/* Shift a colour lighter (k > 0) or darker (k < 0), the way two pigments on one brush streak. */
function shade(h, k) {
  const c = hex(h).map((v) => (k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",")})`;
}

/* Catmull-Rom through the given points, sampled every ~3px, with normals and running length. */
function sample(pts) {
  const out = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(seg / 3));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  let L = 0;
  const S = out.map((p, i) => {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    if (i) L += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]);
    return { x: p[0], y: p[1], nx: -dy / d, ny: dx / d, s: L };
  });
  return { S, L };
}

/*
  One stroke of a flat brush.
  pts    the path of the brush's centre, in px
  w      the brush's width, in px
  color  the paint
  dry    0 to 1, how far the end breaks into streaks
  taper  0 for a flat band, 1 for a flick that narrows to a point
  streak how much the bristles differ in colour (two pigments on one brush)
  bristles  how many bristles, when a small mark needs finer ones than its width gives
  crumb  the shortest run of dry paint kept, in px; shorter flecks are dropped
*/
export function stroke(ctx, R, pts, { w, color, mix = null, dry = 0.5, taper = 0, streak = 0.07, alpha = 1, edge = 0.1, scratch = 1, bristles = 0, crumb = 0 }) {
  const { S, L } = sample(pts);
  if (L < 2) return;
  const n = bristles || Math.max(6, Math.min(80, Math.round(w / 1.1)));
  ctx.lineJoin = "round";
  const tail = Math.min(L * 0.5, w * (1.4 + dry * 2.6)) * dry;
  const step = S.length > 1 ? L / (S.length - 1) : 3;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;                            // -0.5 .. 0.5 across the brush
    const e = Math.abs(u) * 2;                              // 0 centre, 1 at the edge
    const off = u * w + (R() - 0.5) * (w / n) * 1.2;
    const lw = (w / n) * (1.3 + R() * 1.6);
    // a second pigment rides on some bristles: the streaks inside a band
    const base = mix && R() < 0.22 ? mix : color;
    const k = R() < 0.2 ? (R() - 0.45) * streak * 3.2 : (R() - 0.5) * streak;
    const col = shade(base, k);
    const a = alpha * (0.82 + R() * 0.18);
    // the start is crisp but not ruled: edges a touch behind, the odd bristle late
    const s0 = R() * w * 0.06 + e * e * w * (taper ? 0.03 : 0.2) + (R() < 0.08 ? R() * w * 0.4 : 0);
    // the end runs dry, the edges first
    const s1 = L - e * e * w * (taper ? 0.04 : 0.3) - Math.pow(R(), 1.2) * tail * (0.3 + e * 0.9);
    if (s1 <= s0) continue;
    // some bristles run short of paint the whole way: the scratches inside a band, most at the edges
    const skippy = R() < (0.06 + dry * 0.12 + e * e * 0.22) * scratch * (taper ? 0.4 : 1);
    const dryFrom = skippy ? s0 + R() * w * 0.5 : Math.max(s0, s1 - tail * (0.35 + R() * 0.65));
    const wob = R() * 6.28, wf = 0.6 + R() * 1.6;
    const at = (p) => {
      const t = p.s / L;
      const prof = taper ? Math.max(0.04, Math.pow(1 - t, taper > 1 ? 0.5 : 0.9) * Math.min(1, t * 8 + 0.5)) : 1;
      const o = off * prof + Math.sin(t * 6.28 * wf + wob) * w * edge * 0.14 * e;
      return [p.x + p.nx * o, p.y + p.ny * o, prof];
    };
    // body: one continuous line of paint
    ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineCap = "butt"; ctx.lineWidth = lw;
    ctx.beginPath();
    let pen = false;
    for (const p of S) {
      if (p.s < s0 || p.s > dryFrom) continue;
      const [x, y] = at(p);
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
    // dry tail: the bristle thins and skips, in long runs with short gaps, as it catches the paper
    if (s1 > dryFrom + step) {
      ctx.lineCap = "round";
      let run = 0, gap = 0, target = skippy ? 30 + R() * 120 : 10 + R() * 34, seg = [];
      const flush = () => {
        if (seg.length > 1 && (!crumb || Math.hypot(seg[seg.length - 1][0] - seg[0][0], seg[seg.length - 1][1] - seg[0][1]) >= crumb)) {
          ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]);
          for (const q of seg) ctx.lineTo(q[0], q[1]);
          ctx.stroke();
        }
        seg = [];
      };
      for (const p of S) {
        if (p.s < dryFrom || p.s > s1) continue;
        const d = skippy ? Math.max(0, (p.s - (s1 - tail)) / Math.max(1, tail)) * 0.8 : (p.s - dryFrom) / Math.max(1, s1 - dryFrom);
        if (gap > 0) { gap -= step; continue; }
        if (!seg.length) { ctx.lineWidth = Math.max(0.5, lw * (0.75 - d * 0.45) * (0.6 + R() * 0.4)); ctx.globalAlpha = a * (0.95 - d * 0.35); }
        seg.push(at(p));
        run += step;
        if (run > target * (1 - d * 0.6)) { flush(); run = 0; gap = 2 + R() * (3 + d * 14); target = (skippy && d < 0.1 ? 50 + R() * 140 : 8 + R() * 30); }
      }
      flush();
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------------- palettes */

export const PALETTES = {
  // The archive's own pictures, in the brand: Sky field, painterly ground
  blue: { field: "#9EE9FB", cloud: ["#FBFAF6", "#D6F6FD"], high: "#7FD6EE", water: "#4D9AD0", far: "#5E9C86", grove: "#262B12", grove2: "#353A18", lit: "#C9A84C", ochre: "#C9A84C", meadow: "#8E9A4A", straw: "#EED56A", pale: "#F3F0E8", deep: "#5F6A2C", dawn: "#F2A58E", peony: "#F2879E" },
  pink: { field: "#F2879E", cloud: ["#FBD9E0", "#FBFAF6"], high: "#EE7A93", water: "#9EE9FB", far: "#6E8C66", grove: "#262B12", grove2: "#353A18", lit: "#EED56A", ochre: "#C9A84C", meadow: "#8E9A4A", straw: "#FBD9E0", pale: "#F3F0E8", deep: "#5F6A2C", dawn: "#F2A58E", peony: "#F6B3C1" },
};

/* ---------------------------------------------------------------- scenes, placed by hand */

/* A stand of trees: a few upright dabs that make one clear silhouette, a lit side, a dark foot. */
function trees(ctx, R, P, cx, base, wide, tall, u) {
  // two or three crowns of different heights, so the top line is drawn, not ruled
  const k = wide > u * 20 ? 3 : 2;
  const crowns = Array.from({ length: k }, (_, i) => {
    const big = i === 1 || (k === 2 && i === 0);
    const c = cx + ((i + 0.5) / k - 0.5) * wide * 0.78 + (R() - 0.5) * u * 2;
    const rx = (wide / k) * (big ? 0.78 : 0.62) * (0.9 + R() * 0.2);
    const top = tall * (big ? 1 : 0.62 + R() * 0.18);
    const ry = Math.min(top * 0.42, rx * 0.95);
    return { c, rx, ry, cy: base - top + ry, big };
  }).sort((a, b) => a.big - b.big);
  // trunks, thin and dark, under the crowns
  for (const t of crowns) {
    stroke(ctx, R, [[t.c + (R() - 0.5) * u, base + u], [t.c + (R() - 0.5) * u * 1.5, t.cy]], { w: u * 1.1, color: P.grove, dry: 0.1, scratch: 0 });
  }
  for (const t of crowns) {
    // the core: two fat strokes across, so nothing shows through
    for (let j = 0; j < 2; j++) {
      const y = t.cy + (j - 0.4) * t.ry * 0.55;
      stroke(ctx, R, [[t.c - t.rx * 0.7, y + u * 0.5], [t.c, y - u * 0.5], [t.c + t.rx * 0.7, y]], { w: t.ry * 0.9, color: P.grove, dry: 0.3, streak: 0.05, scratch: 0.2 });
    }
    // the crown: strokes pushed out from the middle, so each dry end makes the edge
    const n = 7 + Math.round(t.rx / (u * 2.2));
    for (let j = 0; j < n; j++) {
      const a = Math.PI * (0.95 + (j + R() * 0.8) / n * 1.1);        // the top half, a little past each side
      const r = 0.92 + R() * 0.22;
      const sx = t.c + (R() - 0.5) * t.rx * 0.4, sy = t.cy + t.ry * 0.15;
      const ex = t.c + Math.cos(a) * t.rx * r, ey = t.cy + Math.sin(a) * t.ry * r;
      stroke(ctx, R, [[sx, sy], [(sx + ex) / 2 + (R() - 0.5) * u, (sy + ey) / 2], [ex, ey]], { w: u * (4.4 + R() * 2.6), color: R() < 0.25 ? P.grove2 : P.grove, dry: 0.6, streak: 0.07, scratch: 0.35 });
    }
    // the underside: a few short strokes down and out, flatter
    for (let j = 0; j < 4; j++) {
      const a = Math.PI * (0.15 + j / 3 * 0.7);
      const ex = t.c + Math.cos(a) * t.rx * 0.95, ey = t.cy + Math.sin(a) * t.ry * 0.75;
      stroke(ctx, R, [[t.c + (ex - t.c) * 0.2, t.cy], [ex, ey]], { w: u * 3.4, color: P.grove, dry: 0.6, scratch: 0.3 });
    }
  }
  // the light, on one side of the tallest crown only
  const L = crowns[crowns.length - 1];
  stroke(ctx, R, [[L.c - L.rx * 0.15, L.cy + L.ry * 0.05], [L.c - L.rx * 0.45, L.cy - L.ry * 0.45], [L.c - L.rx * 0.62, L.cy - L.ry * 0.62]], { w: Math.max(u * 1.4, 2.5), color: P.lit, dry: 0.8, streak: 0.14, scratch: 0.6, alpha: 0.8 });
  // the foot, laid across
  stroke(ctx, R, [[cx - wide * 0.5, base + u * 0.6], [cx + wide * 0.5, base + u * 0.3]], { w: u * 1.8, color: P.grove, dry: 0.15, scratch: 0 });
}

/* Grass: a few confident flicks, up and slightly over. */
function grass(ctx, R, P, x0, x1, base, top, u, colors) {
  const n = Math.max(6, Math.round((x1 - x0) / (u * 2.6)));
  for (let i = 0; i < n; i++) {
    const f = (i + R() * 0.8) / n;
    const x = x0 + f * (x1 - x0);
    const t = top + (R() * 0.5 + Math.abs(f - 0.45) * 0.5) * (base - top);
    const bend = (R() - 0.3) * u * 6;
    stroke(ctx, R, [[x, base], [x + bend * 0.15, (base + t) / 2], [x + bend, t]], { w: u * (0.9 + R() * 1.1), color: colors[i % colors.length], dry: 0.85, taper: 2, streak: 0.2 });
  }
}

/*
  The hero: on the brand field, so the sky is the page itself. Two clouds,
  a thread of water at the horizon, one stand of trees right of centre and a
  small one far left, three bands of field and a few flicks of grass.
*/
function hero(ctx, R, P, W, H) {
  const u = Math.min(H / 100, W / 160);
  const hz = H * 0.56;
  stroke(ctx, R, [[W * 0.06, H * 0.2], [W * 0.24, H * 0.19], [W * 0.4, H * 0.205]], { w: u * 4.2, color: P.cloud[0], dry: 0.7, scratch: 0.3 });
  stroke(ctx, R, [[W * 0.98, H * 0.33], [W * 0.78, H * 0.325], [W * 0.6, H * 0.335]], { w: u * 3.4, color: P.cloud[1], dry: 0.75, scratch: 0.3 });
  stroke(ctx, R, [[W * 0.15, H * 0.255], [W * 0.3, H * 0.25]], { w: u * 2, color: P.cloud[1], dry: 0.8, alpha: 0.9, scratch: 0.3 });
  // the far band: a thread of water, a low line of land
  stroke(ctx, R, [[-W * 0.02, hz - u * 1.2], [W * 0.5, hz - u * 1.6], [W * 1.02, hz - u * 1]], { w: u * 2.6, color: P.water, dry: 0.4 });
  stroke(ctx, R, [[W * 1.02, hz + u * 0.6], [W * 0.4, hz + u * 0.4], [-W * 0.02, hz + u * 0.8]], { w: u * 2.4, color: P.far, dry: 0.5 });
  // the ground under everything, so no sky shows through the field
  ctx.fillStyle = P.ochre; ctx.fillRect(0, hz + u * 2, W, H);
  // the trees
  trees(ctx, R, P, W * 0.72, hz, W * 0.2, H * 0.22, u);
  trees(ctx, R, P, W * 0.1, hz + u * 0.5, W * 0.07, H * 0.12, u * 0.8);
  // the field, in three wide bands, each laid in one pass
  stroke(ctx, R, [[-W * 0.04, hz + u * 5], [W * 0.5, hz + u * 4.4], [W * 1.04, hz + u * 5.4]], { w: u * 9, color: P.ochre, dry: 0.3, streak: 0.09 });
  stroke(ctx, R, [[W * 1.04, hz + u * 14], [W * 0.6, hz + u * 13], [W * 0.18, hz + u * 14.5]], { w: u * 11, color: P.meadow, dry: 0.75, streak: 0.09 });
  stroke(ctx, R, [[-W * 0.04, hz + u * 25], [W * 0.45, hz + u * 24], [W * 1.04, hz + u * 26]], { w: u * 13, color: P.ochre, dry: 0.3, streak: 0.1 });
  stroke(ctx, R, [[W * 1.04, H - u * 4], [W * 0.5, H - u * 5], [-W * 0.04, H - u * 3]], { w: u * 12, color: P.deep, dry: 0.4, streak: 0.08 });
  // the grass, in the foreground left
  { const g = Math.min(u, 4); grass(ctx, R, P, W - g * 26, W - g * 3, H + g * 2, H - Math.min(H - hz - u * 14, g * 36), g, [P.straw, P.pale, P.straw]); }
}

/*
  The close: a dawn, painted all the way up. Sky laid in long strokes with the
  dawn low in it, a far hill, trees on the left this time, and a dark ground
  that runs down into the footer's ink.
*/
function dawn(ctx, R, P, W, H) {
  const u = Math.min(H / 100, W / 120);
  const hz = H * 0.42;
  ctx.fillStyle = P.field; ctx.fillRect(0, 0, W, hz);
  stroke(ctx, R, [[-W * 0.04, H * 0.07], [W * 1.04, H * 0.06]], { w: H * 0.12, color: P.field, dry: 0.2, streak: 0.05, scratch: 0.25 });
  stroke(ctx, R, [[W * 1.04, H * 0.18], [W * 0.1, H * 0.19]], { w: H * 0.1, color: P.high, dry: 0.6, streak: 0.06, scratch: 0.35 });
  stroke(ctx, R, [[-W * 0.04, H * 0.3], [W * 0.82, H * 0.29]], { w: H * 0.09, color: P.dawn, dry: 0.65, streak: 0.06, scratch: 0.35 });
  stroke(ctx, R, [[W * 1.04, hz - u * 3], [W * 0.3, hz - u * 2.5]], { w: u * 4, color: P.peony, dry: 0.8, streak: 0.06 });
  stroke(ctx, R, [[W * 0.5, H * 0.12], [W * 0.86, H * 0.115]], { w: u * 2.6, color: P.cloud[0], dry: 0.85 });
  // a far hill
  stroke(ctx, R, [[W * 0.35, hz + u], [W * 0.62, hz - u * 4], [W * 1.04, hz - u * 1]], { w: u * 5, color: P.far, dry: 0.4, streak: 0.06 });
  stroke(ctx, R, [[-W * 0.04, hz + u * 1.2], [W * 1.04, hz + u * 1.2]], { w: u * 2.6, color: P.water, dry: 0.3 });
  trees(ctx, R, P, W * 0.22, hz + u, W * 0.3, H * 0.12, u);
  // the ground, darkening as it comes forward
  stroke(ctx, R, [[W * 1.04, hz + u * 6], [W * 0.4, hz + u * 5.2], [-W * 0.04, hz + u * 6.5]], { w: u * 8, color: P.ochre, dry: 0.35, streak: 0.09 });
  stroke(ctx, R, [[-W * 0.04, hz + u * 14], [W * 0.7, hz + u * 13], [W * 1.04, hz + u * 14.5]], { w: u * 10, color: P.meadow, dry: 0.3, streak: 0.09 });
  ctx.fillStyle = "#141311"; ctx.fillRect(0, hz + u * 26, W, H);
  stroke(ctx, R, [[W * 1.04, hz + u * 22], [W * 0.3, hz + u * 21], [-W * 0.04, hz + u * 22.5]], { w: u * 10, color: P.deep, dry: 0.3, streak: 0.08 });
  stroke(ctx, R, [[-W * 0.04, hz + u * 30], [W * 0.6, hz + u * 29], [W * 1.04, hz + u * 30.4]], { w: u * 12, color: P.grove, dry: 0.2, streak: 0.06 });
  stroke(ctx, R, [[W * 1.04, hz + u * 38], [W * 0.2, hz + u * 38.5]], { w: u * 10, color: "#1A1C10", dry: 0.5, streak: 0.05 });
}

/* An underline under a figure: one stroke, laid fast. */
function underline(ctx, R, P, W, H) {
  // fine bristles, and no flecks shorter than the mark is tall, so the dry end reads as streaks at any density
  stroke(ctx, R, [[W * 0.02, H * 0.6], [W * 0.5, H * 0.45], [W * 0.98, H * 0.5]], { w: H * 0.5, color: P.ink || "#FF5A1F", dry: 0.8, streak: 0.12, bristles: 16, crumb: H * 1.2, scratch: 0.5 });
}

/* A score bar: one horizontal stroke, exactly as long as the score. */
function bar(ctx, R, P, W, H, score) {
  const end = Math.max(H, W * score / 100);
  stroke(ctx, R, [[0, H / 2 + 0.3], [end * 0.5, H / 2 - 0.4], [end, H / 2]], { w: H * 0.62, color: P.ink || "#141311", dry: 0.35, streak: 0.18, edge: 0.4, scratch: 0.6 });
}

export const SCENES = { hero, dawn, underline, bar };

/*
  Paint a scene into a canvas at its rendered size. Returns false when the
  canvas has no size yet. The key stops it repainting the same picture.
*/
export function paintCanvas(canvas, scene, palette, seed = 7, extra) {
  const r = canvas.getBoundingClientRect();
  const W = Math.round(r.width), H = Math.round(r.height);
  if (!W || !H) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, W * H > 600000 ? 2 : 3);
  const key = `${scene}:${W}x${H}:${dpr}:${seed}:${JSON.stringify(palette)}:${extra ?? ""}`;
  if (canvas.dataset.key === key) return true;
  canvas.dataset.key = key;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  SCENES[scene](ctx, rng(seed * 7919 + 13), palette, W, H, extra);
  return true;
}

/*
  Paper grain, made once: fine tooth at two scales and a scatter of short
  fibres, very low in contrast. Returned as a tile for CSS backgrounds.
*/
export function grainTile(size = 240, seed = 5) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const R = rng(seed);
  const img = ctx.createImageData(size, size);
  const coarse = new Float32Array((size / 3 + 2) ** 2);
  for (let i = 0; i < coarse.length; i++) coarse[i] = R();
  const cw = size / 3 + 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const v = R() * 0.6 + coarse[((y / 3) | 0) * cw + ((x / 3) | 0)] * 0.4;
    const dark = v > 0.5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 40 : 255;
    img.data[i + 3] = Math.round(Math.abs(v - 0.5) * (dark ? 34 : 14));
  }
  ctx.putImageData(img, 0, 0);
  // fibres
  ctx.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    const x = R() * size, y = R() * size, a = R() * 6.28, l = 3 + R() * 9;
    ctx.strokeStyle = "rgba(40,36,28,0.06)";
    ctx.lineWidth = 0.6 + R() * 0.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  return c.toDataURL("image/png");
}
