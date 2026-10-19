/*
  The giant mark at the foot of the page: the one thing here that loops, by
  the founder's call, and only while it is on screen.

  One turn, 3.6s, on the page's one easing:
    0 to 1000ms     the chisel cuts each stroke along its line, in writing
                    order, then the cut opens out to the flared ends
    900 to 2100ms   the O's counter fills, from empty, to a made-up
                    creator's place in their hundred, and settles there
    2700 to 3500ms  the cut closes and runs off the end of each stroke
    3500ms          the band takes the next product's colour pair
  Six turns, six product pairs, six made-up creators, then round again.
  Reduced motion: one still frame, fully drawn, the O at the first creator.
*/
import { WORDMARK } from "../assets/r5/wordmark.js";
import { ease } from "./pixels.js";

const NS = "http://www.w3.org/2000/svg";
const el = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const clamp = (t) => Math.max(0, Math.min(1, t));
const PAIRS = ["note", "spon", "sell", "rec", "pod", "also"];
const TURN = 3600;
const CUT = [[0, 420], [130, 360], [230, 450], [300, 540], [380, 680], [480, 760], [560, 840]];
const OPEN = [600, 1000], FILL = [900, 2100], CLOSE = [2700, 3000], AWAY = [2900, 3500];

/* The O's counter, lifted from the drawing: the second subpath of the O. */
const counterOf = (d) => "M" + d.split("M")[2];

export function mountGiant(box, svgHost, cap, people, { reduce = false } = {}) {
  const c = WORDMARK.text;
  const [x0, y0, w, h] = c.vb.split(" ").map(Number);
  const svg = el("svg", { viewBox: c.vb, width: w, height: h, fill: "currentColor", focusable: "false" });
  const id = "giant-" + Math.random().toString(36).slice(2, 8);
  const defs = el("defs");
  const mask = el("mask", { id: id + "m", maskUnits: "userSpaceOnUse", x: x0 - 200, y: y0 - 300, width: w + 400, height: h + 600 });
  const lines = c.spines.map(([, d, sw]) => { const p = el("path", { d, fill: "none", stroke: "#fff", "stroke-linecap": "butt", "stroke-linejoin": "round" }); p.dataset.w = sw; mask.appendChild(p); return p; });
  const clip = el("clipPath", { id: id + "c" });
  /* a hair larger than the counter, so no seam shows where the level meets the stroke */
  clip.appendChild(el("path", { d: counterOf(c.O), transform: "translate(332 -350) scale(1.03) translate(-332 350)" }));
  defs.append(mask, clip);
  svg.appendChild(defs);
  const g = el("g", { mask: `url(#${id}m)` });
  for (const k of ["O", "r", "b", "e"]) g.appendChild(el("path", { d: c[k] }));
  /* the O's level: a block in the counter whose top is the creator's place */
  const top = -633, bottom = -67;
  const level = el("rect", { x: 100, width: 470, y: bottom, height: 0, "clip-path": `url(#${id}c)`, "fill-opacity": "0.32" });
  svg.appendChild(g);
  svg.appendChild(level);
  svgHost.appendChild(svg);
  const lens = lines.map((p) => p.getTotalLength());
  lines.forEach((p, i) => p.setAttribute("stroke-dasharray", `${lens[i]} ${lens[i] * 2}`));

  const setLevel = (f) => { const y = bottom - (bottom - top) * f; level.setAttribute("y", y); level.setAttribute("height", bottom - y); };
  const setPair = (i) => {
    const k = PAIRS[i % PAIRS.length], who = people[i % people.length];
    box.style.setProperty("--gbg", `var(--p-${k}-bg)`);
    box.style.setProperty("--gfg", `var(--p-${k}-fg)`);
    cap.textContent = `${who.name} · ${who.beats} in 100 · made up`;
  };
  /* t in ms within one turn */
  const frame = (t, who) => {
    const open = ease(clamp((t - OPEN[0]) / (OPEN[1] - OPEN[0]))) - ease(clamp((t - CLOSE[0]) / (CLOSE[1] - CLOSE[0])));
    lines.forEach((p, i) => {
      const [a, b] = CUT[Math.min(i, CUT.length - 1)];
      const cut = ease(clamp((t - a) / (b - a)));
      const off = ease(clamp((t - AWAY[0] - i * 40) / (AWAY[1] - AWAY[0] - 240)));
      /* drawn from 0 to len along the stroke; then the drawn part runs off its far end */
      p.setAttribute("stroke-dashoffset", lens[i] * (1 - cut) - lens[i] * off);
      p.setAttribute("stroke-width", +p.dataset.w * 0.86 + open * 340);
    });
    const fill = ease(clamp((t - FILL[0]) / (FILL[1] - FILL[0]))) * (1 - ease(clamp((t - AWAY[0]) / (AWAY[1] - AWAY[0]))));
    setLevel((who.beats / 100) * fill);
  };

  setPair(0);
  if (reduce) { frame(2400, people[0]); return; }
  frame(0, people[0]);

  let raf = 0, t0 = 0, turn = 0, shown = false, paused = 0;
  const loop = (now) => {
    if (!t0) t0 = now - paused;
    let t = now - t0;
    if (t >= TURN) { turn++; t0 = now; t = 0; setPair(turn); }
    frame(t, people[turn % people.length]);
    raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver((es) => {
    const on = es.some((e) => e.isIntersecting);
    if (on === shown) return;
    shown = on;
    if (on) { raf = requestAnimationFrame(loop); }
    else { cancelAnimationFrame(raf); paused = t0 ? performance.now() - t0 : 0; t0 = 0; }
  }, { threshold: 0.15 });
  io.observe(box);
}
