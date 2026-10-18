// Orbe wordmark, A3 "Carved". Glyphic lettering drawn as SVG paths (see WORDMARK.md).
// Every stem narrows at the waist and flares to a crisp, flat-cut end; there are no serifs.
// Two cuts of one drawing: "text" for 25px tall and up, "small" for 16 to 24px (heavier waists,
// lower contrast, opener e and looser spacing). mountWordmark picks the cut from the rendered height.
// Usage: import { mountWordmark } from "../assets/r5/wordmark.js"; mountWordmark(el, { animate: true });
// Colour is currentColor, so a reverse (paper on ink) mark is just color: var(--paper) on the parent.
// Size: set --wm-h on the parent or any ancestor (default 0.78em, so it follows font-size), e.g. .nav { --wm-h: 21px }.
// The drawing's source is wordmark-src/carved.mjs. Do not edit the paths here by hand.

// Units: 1000 per em, baseline at y = 0, x-height 500 (small cut 510), O cap 700, b ascender 742.
export const WORDMARK = {"text":{"vb":"0 -742 2040 755","w":2040,"h":755,"O":"M332,-713c187.6,0 332,157.9 332,363c0,205.1 -144.4,363 -332,363c-187.6,0 -332,-157.9 -332,-363c0,-205.1 144.4,-363 332,-363zM112,-350c0,169.8 88,283 220,283c132,0 220,-113.2 220,-283c0,-169.8 -88,-283 -220,-283c-132,0 -220,113.2 -220,283z","r":"M842,-250c0,129.4 1.6,132 20,250h-142c18.4,-118 20,-120.6 20,-250c0,-129.4 -1.4,-132 -17,-250h74c52,0 86,-11 142,-11c52,0 68,11 104,26l-3,98c-30,-20 -63,-45 -109,-40c-43.2,2.8 -79.3,48.8 -88.5,99c-0.4,20.5 -0.5,45.1 -0.5,78z","b":"M1213,-742c-13.3,100.5 -16.3,150.6 -16.9,289.6c35.8,-37.1 83.4,-58.6 139.4,-58.6c126.3,0 210.5,109.6 210.5,261c0,151.4 -84.2,261 -210.5,261c-48.5,0 -90.8,-16.2 -124.6,-44.7c1.5,10.7 3.2,21.8 5.1,33.7h-142c18.4,-118 20,-166.6 20,-371c0,-204.4 -1.4,-253 -17,-371zM1196,-371c0,141.9 0.8,208.7 7.4,275.7c22.3,17 50,26.3 82.1,26.3c89.6,0 144.5,-72.4 144.5,-181c0,-108.6 -54.9,-181 -144.5,-181c-35.8,0 -66.1,11.6 -89.5,32.4c0,8.9 0,18.1 0,27.6z","e":"M1824,-511c111.4,0 195.5,88.7 212.7,213c2.2,15.5 3.3,31.5 3.3,48c0,4 -0.1,8 -0.2,12l-319.6,0c3.1,98.7 44.7,169 105.8,169c46.3,0 81.3,-40.2 97,-102.6l83.9,65.5c-37.2,71.5 -103,117.1 -182.8,117.1c-121.9,0 -211.1,-106.2 -215.8,-249c-0.1,-4 -0.2,-8 -0.2,-12c0,0 0,0 0,0c0,-16.5 1.1,-32.5 3.3,-48c17.3,-124.3 101.3,-213 212.7,-213zM1826,-431c-53.4,0 -91.9,53.6 -102.8,133l205.7,0c-10.9,-79.4 -49.4,-133 -102.8,-133z","spines":[["O","M332,-673 C171.2,-673 56,-538.1 56,-350 C56,-161.8 171.2,-27 332,-27 C492.7,-27 608,-161.8 608,-350 C608,-538.1 492.7,-673 332,-673",112],["r","M791,-500 L791,0",102],["r","M821,-358 C851,-481 941,-481 1041,-436",84],["b","M1145,-742 L1145,0",102],["b","M1145,-471 C1345,-471 1488,-431 1488,-250 C1488,-69 1345,-29 1145,-29",116],["e","M1628,-268 L1984,-268 C1984,-451 1944,-471 1824,-471 C1668,-471 1664,-391 1664,-250 C1664,-89 1724,-29 1844,-29 C1934,-29 1970,-39 2010,-118",112]]},"small":{"vb":"0 -742 2130 754","w":2130,"h":754,"O":"M336,-712c189.8,0 336,157.5 336,362c0,204.5 -146.2,362 -336,362c-189.8,0 -336,-157.5 -336,-362c0,-204.5 146.2,-362 336,-362zM122,-350c0,160.8 85.6,268 214,268c128.4,0 214,-107.2 214,-268c0,-160.8 -85.6,-268 -214,-268c-128.4,0 -214,107.2 -214,268z","r":"M878,-255c0,135.5 1.1,151 14,255h-146c12.9,-104 14,-119.5 14,-255c0,-135.5 -0.9,-151 -11,-255h76c52,0 86,-10 142,-10c52,0 78,11 114,26l-3,106c-30,-20 -73,-43 -119,-38c-43.4,2.8 -72.6,44.9 -80.8,95c-0.2,20.8 -0.2,45.3 -0.2,76z","b":"M1273,-742c-8.3,85.6 -10.4,141.1 -10.9,273.9c35,-33 80.1,-51.9 132.4,-51.9c126.9,0 211.5,111.3 211.5,265c0,153.7 -84.6,265 -211.5,265c-47.4,0 -88.9,-15.5 -122.3,-43c1.1,10.6 2.4,21.6 3.8,33h-146c12.9,-104 14,-163.5 14,-371c0,-207.5 -0.9,-267 -11,-371zM1262,-371c0,133.6 0.5,205.9 4.2,268.1c20.7,13.5 45.7,20.9 74.3,20.9c87.7,0 141.5,-69.2 141.5,-173c0,-103.8 -53.8,-173 -141.5,-173c-30.6,0 -57,8.4 -78.5,23.7c0,10.7 0,21.7 0,33.3z","e":"M1908,-520c113.5,0 199.4,88.5 218.2,213c2.5,16.7 3.8,34.1 3.8,52c0,6.1 -0.2,12.1 -0.4,18h-323.1c4.7,90.9 44.9,155 103.5,155c43.5,0 76.9,-35.4 93.2,-90.8l93.3,62.9c-38.2,73.2 -106,119.9 -188.4,119.9c-123.6,0 -214.5,-105 -221.6,-247c-0.3,-5.9 -0.4,-11.9 -0.4,-18c0,0 0,0 0,0c0,-17.9 1.3,-35.3 3.8,-52c18.8,-124.5 104.7,-213 218.2,-213zM1910,-428c-51,0 -88.1,48.5 -100,121l199.9,0c-11.9,-72.5 -49,-121 -100,-121z","spines":[["O","M336,-665 C175.8,-665 61,-533.4 61,-350 C61,-166.5 175.8,-35 336,-35 C496.1,-35 611,-166.5 611,-350 C611,-533.4 496.1,-665 336,-665",122],["r","M819,-510 L819,0",118],["r","M849,-362 C879,-490 969,-490 1079,-441",94],["b","M1203,-742 L1203,0",118],["b","M1203,-474 C1403,-474 1544,-440 1544,-255 C1544,-70 1403,-36 1203,-36",124],["e","M1706,-272 L2070,-272 C2070,-460 2028,-474 1908,-474 C1746,-474 1746,-400 1746,-255 C1746,-90 1808,-36 1928,-36 C2018,-36 2060,-40 2100,-117",120]]}};

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
