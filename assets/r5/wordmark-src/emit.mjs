// Writes site/assets/r5/wordmark.js, wordmark.svg and wordmark-small.svg from carved.json.
import fs from 'fs';
const J = JSON.parse(fs.readFileSync('carved.json', 'utf8'));
const OUT = '/home/user/orbeold/site/assets/r5';
const cut = (g) => ({
  vb: `${g.vb.x} ${g.vb.y} ${g.vb.w} ${g.vb.h}`, w: g.vb.w, h: g.vb.h,
  O: g.D.O, r: g.D.r, b: g.D.b, e: g.D.e,
  spines: g.spines.map((s) => [s.k, s.d.replace(/(\d)\.(\d)\d+/g, '$1.$2'), s.w]),
});
const data = { text: cut(J.text), small: cut(J.small) };
const js = `// Orbe wordmark, A3 "Carved". Glyphic lettering drawn as SVG paths (see WORDMARK.md).
// Every stem narrows at the waist and flares to a crisp, flat-cut end; there are no serifs.
// Two cuts of one drawing: "text" for 25px tall and up, "small" for 16 to 24px (heavier waists,
// lower contrast, opener e and looser spacing). mountWordmark picks the cut from the rendered height.
// Usage: import { mountWordmark } from "../assets/r5/wordmark.js"; mountWordmark(el, { animate: true });
// Colour is currentColor, so a reverse (paper on ink) mark is just color: var(--paper) on the parent.
// Size: set --wm-h on the parent or any ancestor (default 0.78em, so it follows font-size), e.g. .nav { --wm-h: 21px }.
// The drawing's source is wordmark-src/carved.mjs. Do not edit the paths here by hand.

// Units: 1000 per em, baseline at y = 0, x-height 500 (small cut 510), O cap 700, b ascender 742.
export const WORDMARK = ${JSON.stringify(data)};

const NS = "http://www.w3.org/2000/svg";
const SMALL_MAX = 24.5; // CSS px tall: at or below this the small cut is used
let uid = 0;

function el(name, attrs) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function paint(svg, which) {
  const c = WORDMARK[which];
  svg.setAttribute("viewBox", c.vb);
  svg.setAttribute("width", c.w);
  svg.setAttribute("height", c.h);
  svg.dataset.cut = which;
  for (const k of ["O", "r", "b", "e"]) svg.querySelector(".wm-" + k).setAttribute("d", c[k]);
}

/** The bare mark, still. Pass { cut: "small" } for a mark you know will sit 16 to 24px tall. */
export function wordmarkSVG({ cut = "text" } = {}) {
  const svg = el("svg", { role: "img", "aria-label": "Orbe", focusable: "false", fill: "currentColor", class: "orbe-wordmark" });
  svg.style.cssText = "display:inline-block;height:var(--wm-h,0.78em);width:auto;overflow:visible;vertical-align:var(--wm-va,-0.02em)";
  const t = el("title", {}); t.textContent = "Orbe"; svg.appendChild(t);
  for (const k of ["O", "r", "b", "e"]) svg.appendChild(el("path", { class: "wm-" + k }));
  paint(svg, cut === "small" ? "small" : "text");
  return svg;
}

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (t) => Math.max(0, Math.min(1, t));

// The reveal (1.1s, once): a chisel cuts each stroke along its line, in writing order, as a groove the
// width of the waist; then the cut opens out and the flares arrive at the ends, last, as crisp corners.
// Windows per stroke, in ms from the start: [start, end].
const CUTS_AT = [[0, 460], [150, 380], [260, 470], [330, 560], [420, 700], [520, 780], [600, 860]];
const FLARE = [640, 1100];

function play(svg) {
  const id = "orbe-wm-" + ++uid;
  const c = WORDMARK[svg.dataset.cut];
  const defs = el("defs", {});
  const mask = el("mask", { id, maskUnits: "userSpaceOnUse", x: "-200", y: "-1000", width: String(c.w + 400), height: "1300" });
  const lines = c.spines.map(([, d, w]) => {
    const p = el("path", { d, fill: "none", stroke: "#fff", "stroke-linecap": "butt", "stroke-linejoin": "round" });
    p.dataset.w = w;
    mask.appendChild(p);
    return p;
  });
  defs.appendChild(mask);
  svg.insertBefore(defs, svg.firstChild);
  const lens = lines.map((p) => p.getTotalLength());
  lines.forEach((p, i) => { p.setAttribute("stroke-dasharray", lens[i] + " " + lens[i]); p.setAttribute("stroke-dashoffset", lens[i]); });
  const g = el("g", { mask: "url(#" + id + ")" });
  for (const k of ["O", "r", "b", "e"]) g.appendChild(svg.querySelector(".wm-" + k));
  svg.appendChild(g);
  const done = () => { for (const k of ["O", "r", "b", "e"]) svg.appendChild(svg.querySelector(".wm-" + k)); g.remove(); defs.remove(); };
  let t0 = 0;
  const step = (now) => {
    if (!t0) t0 = now;
    const t = now - t0;
    const f = easeOut(clamp((t - FLARE[0]) / (FLARE[1] - FLARE[0])));
    lines.forEach((p, i) => {
      const [a, b] = CUTS_AT[Math.min(i, CUTS_AT.length - 1)];
      p.setAttribute("stroke-dashoffset", lens[i] * (1 - easeIO(clamp((t - a) / (b - a)))));
      p.setAttribute("stroke-width", (+p.dataset.w * 0.86) + f * 340);
    });
    if (t < FLARE[1]) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
}

export function mountWordmark(target, { animate = true } = {}) {
  const svg = wordmarkSVG();
  target.textContent = "";
  target.appendChild(svg);
  // Pick the cut from the height it actually renders at, and keep it right if the layout changes.
  const fit = () => { const h = svg.getBoundingClientRect().height; if (h) { const want = h <= SMALL_MAX ? "small" : "text"; if (svg.dataset.cut !== want) paint(svg, want); } };
  fit();
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe(svg);
  let reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (!animate || reduce) return svg;
  // Fail safe: the mark is fully drawn until the moment it plays. If it is on screen now it plays now;
  // otherwise it plays the first time any of it scrolls into view, so it never sits half cut.
  const r = svg.getBoundingClientRect();
  const onScreen = r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  if (onScreen || !("IntersectionObserver" in window)) { play(svg); return svg; }
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    play(svg);
  });
  io.observe(svg);
  return svg;
}
`;
fs.writeFileSync(`${OUT}/wordmark.js`, js);
const svg = (g) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${g.vb.x} ${g.vb.y} ${g.vb.w} ${g.vb.h}" width="${g.vb.w}" height="${g.vb.h}" role="img" aria-label="Orbe"><title>Orbe</title><path fill="currentColor" d="${g.d}"/></svg>\n`;
fs.writeFileSync(`${OUT}/wordmark.svg`, svg(J.text));
fs.writeFileSync(`${OUT}/wordmark-small.svg`, svg(J.small));
console.log('spines', J.text.spines.length, 'js bytes', js.length);
