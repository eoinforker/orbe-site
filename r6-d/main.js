import { example, ORDER, EXAMPLE_LINE, CARD_EXAMPLE_LINE, benchmark, BENCHMARK_LINE } from "../assets/r5/examples.js";
import { renderCard } from "../assets/r5/card.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const f = (name) => $(`[data-f="${name}"]`);
const root = document.documentElement;
root.classList.add("js");
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const params = new URLSearchParams(location.search);
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const KIND_COLOUR = (k) => css(`--k-${k}`);

mountWordmark($("#wm"), { animate: !reduce });
mountWordmark($("#wm-giant"), { animate: false });
f("example-line").textContent = EXAMPLE_LINE;
f("bench-line").textContent = BENCHMARK_LINE;
f("card-line").textContent = CARD_EXAMPLE_LINE;

const HEAD = { channel: "channels", newsletter: "newsletters", stream: "streamers", podcast: "podcasts", portfolio: "photographers" };
const WORKS = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "show", portfolio: "photographer" };
const pct = (v) => { const p = v * 100; return (p >= 10 ? Math.round(p) : +p.toFixed(1)) + "%"; };
const nounOf = (e) => e.sizeBand.split(" ").pop();

/* ================================================================
   Pixels. fal's creatures: a lumpy blob on a grid, every cell a body
   square with a small plus inside, ringed by one cell of a bright edge.
   ================================================================ */
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

function setupCanvas(c) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return { ctx, w, h };
}

/* A creature: a body ball plus limbs that sway. Returns nothing; paints cells. */
function creature(ctx, o) {
  const { x, y, r, cell: c, t = 0, seed = 1, limbs = 5, reach = 1.35, body, dot, edge } = o;
  const span = Math.ceil((r * (reach + 0.9)) / c);
  const gx0 = Math.round(x / c) - span, gy0 = Math.round(y / c) - span;
  const n = span * 2 + 1;
  // limbs: tapering capsules along a bent path, each ending in a small blob
  const segs = [], blobs = [[x, y, r * 0.7]];
  for (let i = 0; i < limbs; i++) {
    const a0 = (i / limbs) * Math.PI * 2 + hash(i, 1, seed) * 0.8 + Math.sin(t * 0.9 + i * 1.7) * 0.14;
    const len = r * (0.95 + hash(i, 2, seed) * (reach - 0.5)) * (1 + Math.sin(t * 1.3 + i) * 0.06);
    const w0 = r * (0.3 + hash(i, 3, seed) * 0.1);
    const bend = (hash(i, 4, seed) - 0.5) * 1.6 + Math.sin(t * 1.1 + i * 2.3) * 0.15;
    let px = x, py = y;
    for (let q = 1; q <= 4; q++) {
      const u = q / 4, aa = a0 + bend * u * u;
      const nx = x + Math.cos(aa) * len * u, ny = y + Math.sin(aa) * len * u;
      segs.push([px, py, nx, ny, w0 * (1 - u * 0.5)]);
      px = nx; py = ny;
    }
    if (hash(i, 5, seed) > 0.4) blobs.push([px, py, w0 * 0.95]);
  }
  const holes = [];
  for (let i = 0; i < 2; i++) { const ha = hash(i, 11, seed) * 6.28, hd = r * 0.3 * hash(i, 12, seed); holes.push([x + Math.cos(ha) * hd, y + Math.sin(ha) * hd, r * (0.1 + hash(i, 13, seed) * 0.06)]); }
  const seg = (px, py, s) => { const [ax, ay, bx, by, w] = s; const dx = bx - ax, dy = by - ay; const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - ax - dx * u, py - ay - dy * u) - w; };
  const tick = Math.floor(t * 2);
  const m = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const px = (gx0 + i + 0.5) * c, py = (gy0 + j + 0.5) * c;
    let d = Infinity;
    for (const [bx, by, br] of blobs) d = Math.min(d, Math.hypot(px - bx, py - by) - br);
    for (const sg of segs) d = Math.min(d, seg(px, py, sg));
    for (const [hx, hy, hr] of holes) d = Math.max(d, hr - Math.hypot(px - hx, py - hy));
    d += (hash(gx0 + i, gy0 + j, seed + tick) - 0.5) * c * 0.9;
    m[j * n + i] = d < 0 ? 1 : 0;
  }
  const at = (i, j) => (i < 0 || j < 0 || i >= n || j >= n ? 0 : m[j * n + i]);
  // edge first
  ctx.fillStyle = edge;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (at(i, j)) continue;
    if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1) || at(i - 1, j - 1) || at(i + 1, j + 1) || at(i - 1, j + 1) || at(i + 1, j - 1)) ctx.fillRect((gx0 + i) * c, (gy0 + j) * c, c, c);
  }
  ctx.fillStyle = body;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (at(i, j)) ctx.fillRect((gx0 + i) * c, (gy0 + j) * c, c, c);
  // the plus in every cell, on a checker so the lattice reads as texture
  ctx.fillStyle = dot;
  const a = Math.max(1, Math.round(c * 0.22)), b = Math.max(3, Math.round(c * 0.66)), off = (c - b) / 2, offa = (c - a) / 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (!at(i, j) || ((i + j) & 1)) continue;
    const X = (gx0 + i) * c, Y = (gy0 + j) * c;
    ctx.fillRect(X + off, Y + offa, b, a);
    ctx.fillRect(X + offa, Y + off, a, b);
  }
}

/* Scattered pixel clusters that blink slowly. */
function makeClusters(seed, count, box, c) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const cx = box.x + hash(k, 7, seed) * box.w, cy = box.y + hash(k, 8, seed) * box.h;
    const size = 1 + Math.floor(hash(k, 9, seed) * 3);
    for (let q = 0; q < size * 2; q++) {
      out.push({ x: Math.round(cx / c + Math.floor(hash(k, q + 20, seed) * 4) - 2) * c, y: Math.round(cy / c + Math.floor(hash(k, q + 40, seed) * 4) - 2) * c, w: c * (1 + (hash(k, q, seed) > 0.75 ? 1 : 0)), ph: hash(k, q + 60, seed) * 6.28, hot: hash(k, q + 80, seed) > 0.86 });
    }
  }
  return out;
}
function drawClusters(ctx, list, c, t, cold, hot) {
  for (const p of list) {
    if (!reduce && Math.sin(t * 0.8 + p.ph) < -0.55) continue;
    ctx.fillStyle = p.hot ? hot : cold;
    ctx.fillRect(p.x, p.y, p.w, c);
  }
}

/* ================================================================
   Painters: each canvas redraws on its own clock while on screen.
   ================================================================ */
const painters = [];
function painter(canvas, draw) {
  const p = { canvas, draw, visible: true };
  painters.push(p);
  try { new IntersectionObserver(([en]) => { p.visible = en.isIntersecting; }).observe(canvas); } catch {}
  return p;
}
let last = 0;
function frame(now) {
  if (now - last > 110) { // about nine steps a second: pixels should step, not glide
    last = now;
    for (const p of painters) if (p.visible) p.draw(now / 1000);
  }
  requestAnimationFrame(frame);
}
function paintAll(t = 0) { for (const p of painters) p.draw(t); }

/* Hero art */
const heroCanvas = $("#art-hero");
let heroClusters = null, heroKey = "";
painter(heroCanvas, (t) => {
  const { ctx, w, h } = setupCanvas(heroCanvas);
  ctx.clearRect(0, 0, w, h);
  const wide = w >= 1100, mid = w >= 700;
  const c = wide ? 12 : mid ? 10 : 8;
  const key = `${w}x${h}`;
  if (key !== heroKey) {
    heroKey = key;
    heroClusters = makeClusters(11, wide ? 14 : 9, wide ? { x: w * 0.8, y: 110, w: w * 0.18, h: 110 } : { x: w * 0.62, y: 70, w: w * 0.36, h: 130 }, c);
  }
  const strong = css("--strong"), k = KIND_COLOUR(kindNow);
  drawClusters(ctx, heroClusters, c, t, strong, k);
  const x = wide ? 200 : mid ? 200 : 122, y = wide ? 400 : mid ? 170 : 170, r = wide ? 108 : mid ? 76 : 60;
  creature(ctx, { x, y, r, cell: c, t: reduce ? 0 : t, seed: 4, limbs: 6, reach: 1.3, body: strong, dot: k, edge: k });
});

/* Buyers art: a second creature, ink panel. */
const doorCanvas = $("#art-door");
let doorClusters = null, doorKey = "";
painter(doorCanvas, (t) => {
  const { ctx, w, h } = setupCanvas(doorCanvas);
  ctx.clearRect(0, 0, w, h);
  const wide = w >= 1100;
  const c = wide ? 12 : 8;
  if (doorKey !== `${w}x${h}`) { doorKey = `${w}x${h}`; doorClusters = makeClusters(23, wide ? 10 : 6, wide ? { x: 40, y: h * 0.65, w: w * 0.25, h: h * 0.3 } : { x: w * 0.06, y: 92, w: w * 0.4, h: 70 }, c); }
  drawClusters(ctx, doorClusters, c, t, css("--k-portfolio"), css("--k-newsletter"));
  const x = wide ? 230 : w - 92, y = wide ? 320 : 150, r = wide ? 110 : 40;
  creature(ctx, { x, y, r, cell: c, t: reduce ? 0 : t * 0.8, seed: 9, limbs: 5, reach: 1.6, body: "#0e3b1c", dot: css("--k-stream"), edge: css("--k-stream") });
});

/* Close art: clusters only, so the type leads. */
const closeCanvas = $("#art-close");
let closeClusters = null, closeKey = "";
painter(closeCanvas, (t) => {
  const { ctx, w, h } = setupCanvas(closeCanvas);
  ctx.clearRect(0, 0, w, h);
  const wide = w >= 1100, c = wide ? 12 : 8;
  if (closeKey !== `${w}x${h}`) { closeKey = `${w}x${h}`; closeClusters = makeClusters(31, wide ? 10 : 6, wide ? { x: w * 0.82, y: 30, w: w * 0.16, h: 110 } : { x: w * 0.5, y: 14, w: w * 0.46, h: 44 }, c); }
  drawClusters(ctx, closeClusters, c, t, css("--strong"), KIND_COLOUR(kindNow));
});

/* ================================================================
   Drag your size. The same reach, held against every size band:
   the creature grows as you drag, the column under it is what is
   typical at that size, and the line is the example's own reach.
   ================================================================ */
const drag = $("#drag");
const stage = $("#stage");
const sizeCanvas = $("#art-size");
const youEl = $(".stage-you");
let bench, ex, own = 0, bandNow = -1, scaleTop = 1;

function geometry(w, h) {
  const n = bench.rows.length;
  const pad = w >= 1100 ? 0 : 16;
  const gap = w >= 1100 ? 10 : 6;
  const colW = (w - pad * 2 - gap * (n - 1)) / n;
  const base = h - 4;
  const plotH = h * 0.6;
  const yOf = (v) => base - (v / scaleTop) * plotH;
  return { n, pad, gap, colW, base, yOf };
}

painter(sizeCanvas, (t) => {
  if (!bench) return;
  const { ctx, w, h } = setupCanvas(sizeCanvas);
  ctx.clearRect(0, 0, w, h);
  const g = geometry(w, h);
  const c = w >= 1100 ? 10 : 8;
  const v = +drag.value / 1000;
  const k = KIND_COLOUR(kindNow), strong = css("--strong"), on = css("--on-strong");
  const dim = css("--strong-dim");
  // columns, built from cells, with a dithered cap
  bench.rows.forEach((r, i) => {
    const x0 = g.pad + i * (g.colW + g.gap);
    const top = g.yOf(r.value);
    const active = i === bandNow;
    const cols = Math.max(1, Math.floor(g.colW / c));
    const x = x0 + (g.colW - cols * c) / 2;
    const rows = Math.max(1, Math.round((g.base - top) / c));
    const X = Math.round(x), W = cols * c;
    ctx.fillStyle = active ? k : dim;
    ctx.fillRect(X, Math.round(g.base - (rows - 1) * c), W, (rows - 1) * c);
    for (let cc = 0; cc < cols; cc += 2) ctx.fillRect(X + cc * c, Math.round(g.base - rows * c), c, c); // a dithered cap
    if (active) {
      ctx.fillStyle = on;
      ctx.font = `700 ${w >= 1100 ? 14 : 12}px ${css("--mono")}`;
      ctx.textAlign = "center";
      const ly0 = g.yOf(own), capY = g.base - rows * c;
      const inside = capY < ly0 + 30; // the column reaches the line: write the value inside it
      ctx.fillStyle = inside ? "#121412" : on;
      ctx.fillText(pct(r.value), X + W / 2, inside ? g.base - 12 : capY - 8);
    }
    if (r.key === bench.example) { // the example's own band carries a mark under it
      ctx.fillStyle = on;
      ctx.fillRect(X, g.base + 1, W, 3);
    }
  });
  // the example's reach: a pixel line across every column
  const ly = Math.round(g.yOf(own) / 2) * 2;
  ctx.fillStyle = on;
  for (let x = g.pad; x < w - g.pad; x += 8) ctx.fillRect(x, ly - 1, 5, 3);
  stage.style.setProperty("--ly", ly + "px");
  // you: a creature that walks the line and grows with your size
  const rr = (w >= 1100 ? 18 : 15) + v * v * (w >= 1100 ? 70 : 46);
  const cx = Math.min(w - rr * 1.5, Math.max(rr * 1.5, g.pad + v * (w - g.pad * 2)));
  const cell = rr > 34 ? c : Math.max(4, c - 3);
  const cy = ly - rr * 1.15;
  creature(ctx, { x: cx, y: cy, r: rr, cell, t: reduce ? 0 : t * 1.4, seed: 2, limbs: 4, reach: 1.25, body: "#121412", dot: k, edge: k });
  stage.classList.toggle("tag-right", cx < w * 0.5);
  const chipW = youEl.offsetWidth || 0;
  const chipX = Math.min(w - chipW / 2 - 6, Math.max(chipW / 2 + 6, cx));
  stage.style.setProperty("--yx", chipX + "px");
  stage.style.setProperty("--ax", Math.min(chipW - 10, Math.max(10, cx - chipX + chipW / 2)) + "px");
  stage.style.setProperty("--yy", Math.max(14, cy - rr * 1.55 - 6) + "px");
});

function setupMeter(e) {
  ex = e;
  bench = benchmark(e.kind);
  own = parseFloat(e.parts.find((p) => p.key === "reach").value) / 100;
  scaleTop = Math.max(own, ...bench.rows.map((r) => r.value));
  f("ex-name").textContent = e.name;
  f("ex-own").textContent = pct(own);
  f("ex-noun").textContent = nounOf(e);
  f("m-tag").textContent = `${e.name}: ${pct(own)}`;
  f("m-you").textContent = e.name;
  const i = bench.rows.findIndex((r) => r.key === bench.example);
  drag.value = Math.round(((i + 0.5) / bench.rows.length) * 1000);
  bandNow = -1;
  readMeter(false);
}
function times(x) { return (x >= 10 ? Math.round(x) : x.toFixed(1)) + "×"; }
function readMeter(animate) {
  const n = bench.rows.length;
  const i = Math.min(n - 1, Math.floor((+drag.value / 1000) * n));
  const first = bandNow !== -1;
  if (i !== bandNow) {
    bandNow = i;
    const r = bench.rows[i];
    const noun = nounOf(ex);
    const x = own / r.value;
    f("m-band").textContent = r.label;
    f("m-noun").textContent = noun;
    roll(f("m-x"), times(x), animate);
    f("m-line").textContent = `A typical ${WORKS[ex.kind]} this size reaches ${pct(r.value)}. ${ex.name} reaches ${pct(own)}.`;
    const reach = ex.parts.find((p) => p.key === "reach");
    const home = r.key === bench.example;
    const homeLabel = bench.rows.find((row) => row.key === bench.example).label;
    f("m-here").innerHTML = home
      ? `This is its size. Rated here: <b>${ex.signed} ${ex.band}</b>, reach beats ${reach.score} in 100 ${ex.peers} its size.`
      : x >= 1
        ? `Same ${pct(own)}, ${times(x)} typical here. But ${ex.name} has ${homeLabel} ${noun}, so that is where Orbe rates it.`
        : `Same ${pct(own)}, under typical here. But ${ex.name} has ${homeLabel} ${noun}, so that is where Orbe rates it.`;
    drag.setAttribute("aria-valuetext", `${r.label} ${noun}: typical ${pct(r.value)}, ${ex.name} ${times(x)} typical`);
    if (animate && first && navigator.vibrate) { try { navigator.vibrate(8); } catch {} }
  }
  sizeCanvas && painters.find((p) => p.canvas === sizeCanvas)?.draw(performance.now() / 1000);
}
drag.addEventListener("input", () => { stopDemo(); readMeter(true); });

/* Drag anywhere on the stage, not only the thumb. */
let dragging = false;
function fromPointer(ev) {
  const rect = stage.getBoundingClientRect();
  const pad = rect.width >= 1100 ? 0 : 16;
  const v = Math.min(1, Math.max(0, (ev.clientX - rect.left - pad) / (rect.width - pad * 2)));
  drag.value = Math.round(v * 1000);
  readMeter(true);
}
stage.addEventListener("pointerdown", (ev) => { stopDemo(); dragging = true; try { stage.setPointerCapture(ev.pointerId); } catch {} fromPointer(ev); });
stage.addEventListener("pointermove", (ev) => { if (dragging) fromPointer(ev); });
stage.addEventListener("pointerup", () => { dragging = false; });
stage.addEventListener("pointercancel", () => { dragging = false; });

/* The first time the stage comes into view, the creature walks once to show it can be dragged. */
let demo = null, demoDone = params.get("auto") === "0";
function stopDemo() { if (demo) cancelAnimationFrame(demo); demo = null; demoDone = true; }
function runDemo() {
  if (demoDone || reduce) return;
  demoDone = true;
  const start = +drag.value, t0 = performance.now(), dur = 2600;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    // out to the biggest size, back down to the smallest, home again
    const path = p < 0.4 ? start + (1000 - start) * ease(p / 0.4) : p < 0.75 ? 1000 - 1000 * ease((p - 0.4) / 0.35) : start * ease((p - 0.75) / 0.25);
    drag.value = Math.round(path);
    readMeter(true);
    if (p < 1) demo = requestAnimationFrame(step); else demo = null;
  };
  demo = requestAnimationFrame(step);
}
const ease = (x) => 1 - Math.pow(1 - x, 3);
try {
  new IntersectionObserver(([en], io) => { if (en.isIntersecting && en.intersectionRatio > 0.6) { io.disconnect(); setTimeout(runDemo, 250); } }, { threshold: [0, 0.6, 1] }).observe(stage);
} catch {}

/* ================================================================
   The card: the product's own drawing, dealt like a deck.
   ================================================================ */
const MOMENTS = ["rating", "best", "size", "season"];
const MOMENT_NAME = { rating: "Rating", best: "Personal best", size: "Up a size", season: "Season" };
let momentNow = "rating";
function cardSvg(e, moment) {
  const c = e.card;
  const svg = renderCard(e.result, { moment, format: "square", theme: root.dataset.c === "pink" ? "ink-pink" : "ink-blue", handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: `d-${e.kind}-${moment}`, works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image });
  return svg.replace(/<svg([^>]*)\swidth="\d+"\s*height="\d+"/, '<svg$1').replace(/<svg([^>]*)\sheight="\d+"\s*width="\d+"/, '<svg$1');
}
function availableMoments(e) { return MOMENTS.filter((m) => (m !== "best" || e.card.personalBest) && (m !== "size" || e.card.sizeUp)); }
function drawDeck(animate) {
  const e = example(kindNow);
  const list = availableMoments(e);
  if (!list.includes(momentNow)) momentNow = list[0];
  const next = list[(list.indexOf(momentNow) + 1) % list.length];
  const front = $(".deck-card.front"), back = $(".deck-card.back");
  const paint = () => {
    front.innerHTML = cardSvg(e, momentNow);
    back.innerHTML = cardSvg(e, next);
    front.setAttribute("aria-label", `Example card, ${MOMENT_NAME[momentNow]}, for ${e.name}`);
  };
  $$(".moments button").forEach((b) => { b.hidden = !list.includes(b.dataset.m); b.setAttribute("aria-checked", String(b.dataset.m === momentNow)); });
  if (!animate || reduce) { paint(); return; }
  front.classList.remove("in");
  front.classList.add("out");
  setTimeout(() => { front.classList.remove("out"); paint(); front.classList.add("in"); }, 280);
}
function setMoment(m, animate = true) { if (m === momentNow) return; momentNow = m; drawDeck(animate); }
$("#deck-next").addEventListener("click", () => {
  const list = availableMoments(example(kindNow));
  setMoment(list[(list.indexOf(momentNow) + 1) % list.length]);
});
$$(".moments button").forEach((b) => b.addEventListener("click", () => setMoment(b.dataset.m)));
radioKeys($(".moments"), () => $$(".moments button:not([hidden])"), (b) => setMoment(b.dataset.m));

/* ================================================================
   Kinds: the word rolls, the creature takes the kind's colour,
   the size bands and the card re-rate with the engine.
   ================================================================ */
function roll(el, text, animate) {
  const old = el.dataset.v ?? "";
  el.dataset.v = text;
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const n = text.length;
  [...text].forEach((ch, i) => {
    const col = document.createElement("span");
    col.className = "ch";
    col.setAttribute("aria-hidden", "true");
    const inner = document.createElement("span");
    inner.textContent = ch;
    col.appendChild(inner);
    const fromRight = n - 1 - i;
    if (animate && !reduce && old[old.length - 1 - fromRight] !== ch) { col.classList.add("move"); col.style.setProperty("--d", fromRight * 25 + "ms"); }
    el.appendChild(col);
  });
}
function fitSlot(slot, word) {
  const h1 = slot.parentElement;
  const probe = document.createElement("span");
  probe.className = "slot";
  probe.style.cssText = "position:absolute;visibility:hidden;font-size:1em";
  probe.textContent = word;
  h1.appendChild(probe);
  const need = probe.getBoundingClientRect().width;
  probe.remove();
  const room = h1.getBoundingClientRect().width;
  slot.style.fontSize = need > room ? (room / need - 0.005).toFixed(3) + "em" : "";
}
function swapWord(word, animate) {
  const slot = $(".slot");
  const cur = $(".slot-word:not(.out)", slot);
  if (cur && cur.textContent === word) return;
  fitSlot(slot, word);
  if (!animate || reduce || !cur) { slot.innerHTML = `<span class="slot-word">${word}</span>`; return; }
  const w0 = slot.getBoundingClientRect().width;
  $$(".out", slot).forEach((x) => x.remove());
  cur.className = "slot-word out";
  const nw = document.createElement("span");
  nw.className = "slot-word in";
  nw.textContent = word;
  slot.appendChild(nw);
  slot.style.width = "auto";
  const w1 = slot.getBoundingClientRect().width;
  slot.style.width = w0 + "px";
  slot.getBoundingClientRect();
  slot.style.width = w1 + "px";
  setTimeout(() => { cur.remove(); slot.style.width = ""; nw.className = "slot-word"; }, 620);
}

let kindNow = "channel";
function setKind(k, animate = true) {
  if (k === kindNow && animate) return;
  kindNow = k;
  document.body.dataset.kind = k;
  $$(".kinds button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.kind === k)));
  swapWord(HEAD[k], animate);
  $("#kind-live").textContent = `Rated against ${HEAD[k]} your size.`;
  const e = example(k);
  setupMeter(e);
  drawDeck(false);
  paintAll(performance.now() / 1000);
}
$$(".kinds button").forEach((b) => b.addEventListener("click", () => {
  stopCycle();
  setKind(b.dataset.kind);
  b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
}));
radioKeys($(".kinds"), () => $$(".kinds button"), (b) => { stopCycle(); setKind(b.dataset.kind); });

/* Every kind of creator: the headline walks through them until you choose. */
let cycle = null;
function stopCycle() { if (cycle) clearInterval(cycle); cycle = null; }
if (!reduce && params.get("auto") !== "0") {
  let heroSeen = true;
  try { new IntersectionObserver(([en]) => { heroSeen = en.isIntersecting; }).observe($(".h1")); } catch {}
  cycle = setInterval(() => {
    if (!heroSeen || document.hidden) return;
    if (document.activeElement && document.activeElement.closest(".hero form, .kinds")) return;
    const order = ["channel", "stream", "newsletter", "podcast", "portfolio"];
    setKind(order[(order.indexOf(kindNow) + 1) % order.length]);
  }, 2800);
  ["pointerdown", "keydown"].forEach((t) => $(".hero").addEventListener(t, (ev) => { if (ev.target.closest(".kinds, form")) stopCycle(); }, { passive: true }));
}

/* Arrow keys move through a radio group. */
function radioKeys(group, items, pick) {
  group.addEventListener("keydown", (ev) => {
    const d = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    ev.preventDefault();
    const list = items();
    const i = list.findIndex((b) => b.getAttribute("aria-checked") === "true");
    const b = list[(i + d + list.length) % list.length];
    b.focus();
    pick(b);
  });
}

/* ================================================================
   The colour switch: Blue or Pink, remembered.
   ================================================================ */
function setPalette(c, save = true) {
  root.dataset.c = c;
  $$(".palette button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.c === c)));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = css("--field");
  if (save) { try { localStorage.setItem("orbe-r6d-c", c); } catch {} }
  const u = new URL(location.href);
  if (u.searchParams.get("c") && u.searchParams.get("c") !== c) { u.searchParams.set("c", c); try { history.replaceState(null, "", u); } catch {} }
  paintAll(performance.now() / 1000);
  /* The card takes the brand theme for this colour. */
  if ($(".deck-card.front").firstChild) drawDeck(false);
}
$$(".palette button").forEach((b) => b.addEventListener("click", () => setPalette(b.dataset.c)));
radioKeys($(".palette"), () => $$(".palette button"), (b) => setPalette(b.dataset.c));

/* ================================================================
   Stripes between panels, and bars that draw in when seen.
   ================================================================ */
$$(".stripe").forEach((s, si) => {
  const cols = ["--k-channel", "--strong", "--k-stream", "--field", "--k-newsletter", "--strong", "--k-podcast", "--k-portfolio", "--ink"];
  let html = "";
  for (let i = 0; i < 18; i++) html += `<i style="--w:${1 + Math.floor(hash(i, si, 5) * 4)};--c:var(${cols[Math.floor(hash(i, si, 6) * cols.length)]})"></i>`;
  s.innerHTML = html;
});
try {
  const io = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { $$(".bar", en.target).forEach((b) => b.classList.add("seen")); io.unobserve(en.target); } }), { threshold: 0.25 });
  $$(".bars").forEach((b) => io.observe(b));
} catch { $$(".bar").forEach((b) => b.classList.add("seen")); }

/* ================================================================
   Reserve: honest about what happens.
   ================================================================ */
$$("form.reserve").forEach((form) => form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const note = $(".note", form);
  const input = $("input", form);
  const h = cleanHandle(input.value);
  if (!h) { note.textContent = "Type the handle you want, then reserve it."; input.focus(); return; }
  const res = await reserve({ handle: h, kind: kindNow });
  note.classList.add("done");
  note.textContent = res.via === "api"
    ? `@${h} is yours. Ratings open with YouTube: connect your channel to see yours.`
    : `Your email app has the request for @${h} written out. Send it and we hold the handle for you.`;
}));

/* Start */
const startKind = ORDER.includes(params.get("kind")) ? params.get("kind") : "channel";
setPalette(root.dataset.c === "pink" ? "pink" : "blue", false);
setKind(startKind, false);
if (reduce) {
  paintAll(0);
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => paintAll(0), 120); });
} else requestAnimationFrame(frame);
