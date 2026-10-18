/*
  The hand layer: biro rings, arrows, strikes and notes drawn over the live
  product, the way someone circles a number on a printout. Every mark is drawn
  in pixels for the box it sits in, so it stays crisp; it is redrawn when the
  layout changes. Notes are outlined lettering from hand.js, so they are
  drawings, not a typeface.
*/
import { HAND } from "./hand.js";

const NS = "http://www.w3.org/2000/svg";
const f = (n) => Math.round(n * 10) / 10;

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
}

/* A smooth path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/* A loop drawn in one go: it starts top left, goes round once and overshoots. */
export function ringPath(w, h, seed = 1) {
  const r = rng(seed);
  const cx = w / 2, cy = h / 2;
  const a0 = -2.5 + r() * 0.4;
  const turn = Math.PI * 2 * (1.1 + r() * 0.06);
  const ph = r() * 6;
  const pts = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + turn * t;
    const grow = 0.93 + 0.12 * t;
    const wob = 1 + 0.035 * Math.sin(a * 2 + ph);
    pts.push([cx + Math.cos(a) * (w / 2) * grow * wob, cy + Math.sin(a) * (h / 2) * grow * wob * (1 + 0.04 * Math.cos(a))]);
  }
  return smooth(pts);
}

/* A scratched-out word: three passes back and forth, a little uphill. */
export function strikePath(w, h, seed = 2) {
  const r = rng(seed);
  const pts = [];
  const passes = 3;
  for (let i = 0; i <= passes; i++) {
    const x = i % 2 ? w * (0.97 + r() * 0.05) : w * (0.0 + r() * 0.04);
    const y = h * (0.6 - i * 0.06) + (r() - 0.5) * h * 0.06;
    pts.push([x, y]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` Q${f((x0 + x1) / 2)} ${f((y0 + y1) / 2 - h * 0.08)} ${f(x1)} ${f(y1)}`;
  }
  return d;
}

/* An arrow with a lazy bend and a two-stroke head. */
export function arrowPath([x1, y1], [x2, y2], bend = 0.25) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const a = Math.atan2(y2 - cy, x2 - cx);
  const L = Math.min(13, Math.hypot(dx, dy) * 0.35);
  const h1 = [x2 - Math.cos(a - 0.5) * L, y2 - Math.sin(a - 0.5) * L];
  const h2 = [x2 - Math.cos(a + 0.42) * L * 0.9, y2 - Math.sin(a + 0.42) * L * 0.9];
  return {
    shaft: `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`,
    head: `M${f(h1[0])} ${f(h1[1])} L${f(x2)} ${f(y2)} L${f(h2[0])} ${f(h2[1])}`,
  };
}

function el(name, attrs = {}) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function stroke(d, { delay = 0, width = 2.2, cls = "" } = {}) {
  const p = el("path", { d, pathLength: "1", class: `ink-s ${cls}`.trim(), "stroke-width": width });
  p.style.setProperty("--d", `${delay}ms`);
  return p;
}

/* A handwritten note at a given cap height in pixels. */
export function note(key, height = 22, { delay = 0 } = {}) {
  const g = HAND[key];
  const s = el("svg", { viewBox: `0 ${g.base * 0.08} ${g.w} ${g.h * 0.92}`, class: "hand", "aria-hidden": "true", focusable: "false" });
  const w = (height / (g.h * 0.92)) * g.w;
  s.style.width = `${f(w)}px`;
  s.style.height = `${height}px`;
  s.style.setProperty("--d", `${delay}ms`);
  s.appendChild(el("path", { d: g.d }));
  return s;
}

/* A pixel-sized SVG layer over a box. */
export function layer(w, h, cls = "ink-layer") {
  return el("svg", { class: cls, width: f(w), height: f(h), viewBox: `0 0 ${f(w)} ${f(h)}`, "aria-hidden": "true", focusable: "false" });
}

/* Ring a target inside a container: returns the ring's box in container pixels. */
export function rectIn(container, target) {
  const a = container.getBoundingClientRect(), b = target.getBoundingClientRect();
  return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
}

/*
  annotate(container, svgLayer, { target, key, at, size, pad, seed, from, to, delay })
  rings the target, writes the note at `at` (container pixels, top left of the
  note) and draws an arrow from the note's anchor to the ring.
*/
export function annotate(container, svg, o) {
  const r = o.rect ?? rectIn(container, o.target);
  const pad = o.pad ?? 8;
  const box = { x: r.x - pad, y: r.y - pad * 0.8, w: r.w + pad * 2, h: r.h + pad * 1.6 };
  const out = [];
  if (o.ring !== false) {
    const ring = stroke(ringPath(box.w, box.h, o.seed ?? 3), { delay: o.delay ?? 0, width: o.width ?? 2.4 });
    ring.setAttribute("transform", `translate(${f(box.x)} ${f(box.y)})`);
    svg.appendChild(ring);
    out.push(ring);
  }
  if (o.key) {
    const n = note(o.key, o.size ?? 20, { delay: (o.delay ?? 0) + 380 });
    n.classList.add("hand-abs");
    const nw = parseFloat(n.style.width);
    o.at = [Math.max(2, Math.min(o.at[0], container.clientWidth - nw - 4)), o.at[1]];
    n.style.left = `${f(o.at[0])}px`;
    n.style.top = `${f(o.at[1])}px`;
    container.appendChild(n);
    out.push(n);
    if (o.from && o.to) {
      const fx = o.at[0] + parseFloat(n.style.width) * o.from[0];
      const fy = o.at[1] + (o.size ?? 20) * o.from[1];
      const tx = box.x + box.w * o.to[0], ty = box.y + box.h * o.to[1];
      const a = arrowPath([fx, fy], [tx, ty], o.bend ?? 0.25);
      const s1 = stroke(a.shaft, { delay: (o.delay ?? 0) + 700, width: 2 });
      const s2 = stroke(a.head, { delay: (o.delay ?? 0) + 980, width: 2 });
      svg.append(s1, s2);
      out.push(s1, s2);
    }
  }
  return out;
}
