/* Orbe r6-f, "Tactile". Every figure comes from the Orbe engine via examples.js. */
import { example, ORDER, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { mountWordmark, WORDMARK } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { renderCard } from "../assets/r5/card.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let REDUCE = false;
try { REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
const NS = "http://www.w3.org/2000/svg";
const svgEl = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const O_PATH = WORDMARK.text.O;
const clamp = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const sizeWord = (e) => `${e.peers} this size`;

let idx = 0;
let ex = example(ORDER[0]);

/* ---------- wordmark ---------- */
mountWordmark($("[data-wordmark]"), { animate: true });
mountWordmark($("[data-wordmark-foot]"), { animate: false });

/* ---------- the brand colour: Blue or Pink, chosen by the founder ---------- */
const ACCENT = { pink: "#F2879E", blue: "#9EE9FB" };
const colour = () => document.documentElement.getAttribute("data-c") === "blue" ? "blue" : "pink";
function setColour(c, save = true) {
  document.documentElement.setAttribute("data-c", c);
  $$("[data-set-c]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setC === c)));
  if (save) { try { localStorage.setItem("orbe-r6f-c", c); } catch (e) {} }
  drawCard();
  embossO($("#panelO"), { face: ACCENT[c], depth: 1.6 });
  PIN = hexRgb(ACCENT[c]);
  if (typeof drawNow === "function" && nodes.length) drawNow();
}
$$("[data-set-c]").forEach((b) => b.addEventListener("click", () => setColour(b.dataset.setC)));

/* ---------- the tag: a die-cut card with an embossed O ---------- */
function tagPath(w, h, r, n) {
  // A rounded card with a half-round die-cut notch in the middle of every side.
  const cx = w / 2, cy = h / 2;
  return [
    `M${r} 0`, `L${cx - n} 0`, `A${n} ${n} 0 0 0 ${cx + n} 0`, `L${w - r} 0`, `A${r} ${r} 0 0 1 ${w} ${r}`,
    `L${w} ${cy - n}`, `A${n} ${n} 0 0 0 ${w} ${cy + n}`, `L${w} ${h - r}`, `A${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L${cx + n} ${h}`, `A${n} ${n} 0 0 0 ${cx - n} ${h}`, `L${r} ${h}`, `A${r} ${r} 0 0 1 0 ${h - r}`,
    `L0 ${cy + n}`, `A${n} ${n} 0 0 0 0 ${cy - n}`, `L0 ${r}`, `A${r} ${r} 0 0 1 ${r} 0`, "Z",
  ].join(" ");
}
let gid = 0;
function grainFilter(defs, id, alpha, freq = 0.9) {
  const f = svgEl("filter", { id, x: "0", y: "0", width: "100%", height: "100%" });
  f.appendChild(svgEl("feTurbulence", { type: "fractalNoise", baseFrequency: String(freq), numOctaves: "3", stitchTiles: "stitch", seed: "7" }));
  f.appendChild(svgEl("feColorMatrix", { values: `0 0 0 0 .95  0 0 0 0 .91  0 0 0 0 .85  ${2.6 * alpha} 0 0 0 ${-1.25 * alpha}` }));
  f.appendChild(svgEl("feComposite", { in2: "SourceGraphic", operator: "in" }));
  defs.appendChild(f);
}
function drawTag() {
  const svg = $("#tagBody"), tag = $("#tag");
  const w = tag.offsetWidth, h = tag.offsetHeight;
  if (!w) return;
  const big = w > 260;
  const r = big ? 24 : 18, n = big ? 10 : 8;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.textContent = "";
  const d = tagPath(w, h, r, n);
  const defs = svgEl("defs"); svg.appendChild(defs);
  const id = "g" + ++gid;
  grainFilter(defs, id, 0.4);
  const cp = svgEl("clipPath", { id: id + "c" }); cp.appendChild(svgEl("path", { d })); defs.appendChild(cp);
  svg.appendChild(svgEl("path", { d, fill: "#2b2622" }));
  svg.appendChild(svgEl("rect", { width: w, height: h, fill: "#fff", filter: `url(#${id})`, "clip-path": `url(#${id}c)`, opacity: ".55" }));
  // a lit top edge and a shaded lower edge, like a thick card under a lamp
  svg.appendChild(svgEl("path", { d, fill: "none", stroke: "rgba(0,0,0,.55)", "stroke-width": "1", transform: "translate(0 .6)", "clip-path": `url(#${id}c)` }));
  svg.appendChild(svgEl("path", { d, fill: "none", stroke: "rgba(236,229,218,.14)", "stroke-width": "1", transform: "translate(0 .8)", "clip-path": `url(#${id}c)` }));
  // the creasing lines from each notch, as on a folded die-cut
  const L = big ? 26 : 18, gap = n + 5;
  const cx = w / 2, cy = h / 2;
  const crease = (x1, y1, x2, y2) => {
    svg.appendChild(svgEl("line", { x1, y1: y1 + 0.7, x2, y2: y2 + 0.7, stroke: "rgba(236,229,218,.09)", "stroke-width": "1" }));
    svg.appendChild(svgEl("line", { x1, y1, x2, y2, stroke: "rgba(0,0,0,.55)", "stroke-width": "1" }));
  };
  crease(cx, gap, cx, gap + L * 0.6);
  crease(gap, cy, gap + L, cy);
  crease(w - gap, cy, w - gap - L, cy);
  tag.classList.add("drawn");
}
function embossO(svg, { face, depth = 1 }) {
  svg.setAttribute("viewBox", "-30 -743 724 786");
  svg.textContent = "";
  svg.appendChild(svgEl("path", { d: O_PATH, fill: "rgba(0,0,0,.55)", transform: `translate(${6 * depth} ${16 * depth})` }));
  svg.appendChild(svgEl("path", { d: O_PATH, fill: "rgba(0,0,0,.5)", transform: `translate(${3 * depth} ${7 * depth})` }));
  svg.appendChild(svgEl("path", { d: O_PATH, fill: "rgba(236,229,218,.22)", transform: `translate(${-3 * depth} ${-6 * depth})` }));
  svg.appendChild(svgEl("path", { d: O_PATH, fill: face }));
}
embossO($("#tagO"), { face: "#38312b" });


/* ---------- the strings: your mark, threaded to 100 creators your size ---------- */
const stage = $("#stage"), canvas = $("#strings"), ctx = canvas.getContext("2d");
const PEERS = 100;
let W = 0, H = 0, DPR = 1, origin = { x: 0, y: 0 }, nodes = [];
const shift = { x: 0, y: 0 };
let PIN = [242, 135, 158];
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
let partIdx = 0, t0 = 0, raf = 0, visible = true, lastSwitch = 0, threadStart = 0;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function layout() {
  const rect = stage.getBoundingClientRect();
  W = rect.width; H = rect.height; DPR = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  hang.style.translate = "0px 0px";
  const o = $(".t-o").getBoundingClientRect();
  const tr = $(".tag-hang").getBoundingClientRect();
  origin = { x: o.left + o.width / 2 - rect.left, y: o.top + o.height / 2 - rect.top };
  const pad = W > 600 ? 26 : 14;
  const box = { l: tr.left - rect.left - pad, r: tr.right - rect.left + pad, t: tr.top - rect.top - pad, b: tr.bottom - rect.top + pad };
  const top = W > 600 ? 64 : 34, bottom = $(".cap").getBoundingClientRect().top - rect.top - (W > 600 ? 26 : 12), side = W > 600 ? 24 : 14;
  const rand = rng(2026);
  const pts = [];
  const ok = (x, y) => !(x > box.l && x < box.r && y > box.t && y < box.b);
  while (pts.length < PEERS) {
    let best = null, bestD = -1;
    for (let k = 0; k < 14; k++) {
      const x = side + rand() * (W - side * 2), y = top + rand() * (bottom - top);
      if (!ok(x, y)) { k--; continue; }
      let dmin = 1e9;
      for (const p of pts) { const dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < dmin) dmin = dd; }
      if (dmin > bestD) { bestD = dmin; best = { x, y }; }
    }
    pts.push(best);
  }
  // a fixed order of who you beat, the same for every part, so a bigger score lights more of the same strings
  const order = pts.map((_, i) => i).sort(() => 0).map((i) => ({ i, k: rand() })).sort((a, b) => a.k - b.k);
  const rank = []; order.forEach((o2, r) => (rank[o2.i] = r));
  const old = nodes;
  nodes = pts.map((p, i) => ({
    ...p, rank: rank[i], ang: Math.atan2(p.y - origin.y, p.x - origin.x),
    a: REDUCE ? 1 : 0, beat: old[i] ? old[i].beat : 0, beatT: 0, spin: rand() * Math.PI * 2,
  }));
  // thread in angle order, like string wound round a board of pins
  const byAng = [...nodes].sort((a, b) => a.ang - b.ang);
  byAng.forEach((nd, j) => (nd.seq = j));
}

function score() { return ex.parts[partIdx % ex.parts.length].score; }

function spiral(x, y, r, rot) {
  ctx.beginPath();
  const turns = 1.7, steps = 22;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, ang = rot + t * turns * Math.PI * 2, rr = 0.6 + t * r;
    const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
    s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
}

function frame(now) {
  raf = 0;
  if (!t0) t0 = now;
  const T = REDUCE ? 1e9 : now - threadStart;
  const ox = origin.x + shift.x, oy = origin.y + shift.y;
  const sc = score();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round";
  let busy = false;
  const big = W > 600;
  for (const nd of nodes) {
    const start = nd.seq * 11, draw = clamp((T - start) / 420);
    const prog = REDUCE ? 1 : easeOut(draw);
    if (prog < 1) busy = true;
    const want = nd.rank < sc ? 1 : 0;
    const sinceSwitch = now - lastSwitch - nd.rank * 9;
    if (REDUCE) nd.beat = want;
    else if (sinceSwitch > 0 && nd.beat !== want) {
      nd.beat += (want - nd.beat) * 0.14;
      if (Math.abs(want - nd.beat) < 0.01) nd.beat = want; else busy = true;
    } else if (nd.beat !== want) busy = true;
    const b = nd.beat;
    // the string
    if (prog > 0) {
      const ex2 = ox + (nd.x - ox) * prog, ey2 = oy + (nd.y - oy) * prog;
      ctx.strokeStyle = `rgba(236,229,218,${0.05 + b * 0.34})`;
      ctx.lineWidth = big ? 0.8 : 0.7;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex2, ey2); ctx.stroke();
    }
    // the pin
    const na = clamp((T - start - 260) / 300);
    if (na > 0) {
      ctx.lineWidth = big ? 1.35 : 0.9;
      const [r1, g1, b1] = PIN;
      ctx.strokeStyle = `rgba(${Math.round(236 + (r1 - 236) * b)},${Math.round(229 + (g1 - 229) * b)},${Math.round(218 + (b1 - 218) * b)},${na * (0.2 + b * 0.75)})`;
      spiral(nd.x, nd.y, big ? 5 : 2.9, nd.spin);
      if (na < 1) busy = true;
    }
  }
  if (busy && visible) raf = requestAnimationFrame(frame);
}
const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
const drawNow = () => { if (!raf) frame(performance.now()); };

function rollNumber(el, to, ms = 900) {
  if (REDUCE) { el.textContent = ex.signed; return; }
  const t1 = performance.now();
  const step = (now) => {
    const t = easeOut(clamp((now - t1) / ms)), v = to * t;
    el.textContent = (v >= 0 ? "+" : "") + v.toFixed(2);
    if (t < 1) requestAnimationFrame(step); else el.textContent = ex.signed;
  };
  requestAnimationFrame(step);
}

const ticksEl = $("[data-ticks]");
ticksEl.innerHTML = "<i></i>".repeat(100);
const ticks = [...ticksEl.children];

/* ---------- filling the page from the engine ---------- */
function setCaption() {
  const p = ex.parts[partIdx % ex.parts.length];
  $("[data-part]").textContent = p.name;
  $("[data-score]").textContent = p.score;
  $("[data-beats]").textContent = `${p.name}: beats ${p.score} in 100 ${sizeWord(ex)}.`;
  ticks.forEach((t, i) => { t.style.transitionDelay = REDUCE ? "0ms" : `${Math.abs(i - p.score) * 4}ms`; t.classList.toggle("on", i < p.score); });
}
function fill() {
  $("[data-rating]").textContent = REDUCE ? ex.signed : "+0.00";
  $("[data-band]").textContent = ex.band;
  $("[data-name]").textContent = ex.name;
  $("[data-size]").textContent = ex.sizeBand;
  $("[data-handle]").textContent = ex.handle;
  $("[data-pager]").textContent = `${String(idx + 1).padStart(2, "0")}/0${ORDER.length}`;
  $$("[data-example]").forEach((e) => (e.textContent = EXAMPLE_LINE));
  stage.setAttribute("aria-label", `${EXAMPLE_LINE} ${ex.name}, ${ex.sizeBand}, rated ${ex.signed}, ${ex.band}, against ${ex.peers} its size, on provisional benchmarks.`);
  partIdx = 0; setCaption();
  $("#weights").innerHTML = mathsFor(ex.kind).map((m) => `<span>${m.name} <b>${m.weight}%</b></span>`).join(", ") + ".";
  $("#meters").innerHTML = ex.parts.map((p) => `<li><span>${p.name}</span><span class="ticks" aria-hidden="true">${"<i></i>".repeat(100)}</span><b>${p.score}</b><small>Beats ${p.score} in 100 ${sizeWord(ex)}. ${p.what}</small></li>`).join("");
  fillMeters(REDUCE);
  drawCard();
}

function thread() {
  threadStart = performance.now(); lastSwitch = threadStart + 1300;
  for (const nd of nodes) nd.beat = 0;
  setTimeout(() => rollNumber($("[data-rating]"), ex.rating), REDUCE ? 0 : 1100);
  kick();
}

let cycle = 0;
function startCycle() {
  clearInterval(cycle);
  if (REDUCE) return;
  cycle = setInterval(() => {
    if (!visible || document.hidden) return;
    partIdx = (partIdx + 1) % ex.parts.length;
    lastSwitch = performance.now();
    setCaption(); kick();
  }, 3600);
}

function nextExample() {
  idx = (idx + 1) % ORDER.length; ex = example(ORDER[idx]);
  fill(); thread(); startCycle(); runPanel(true);
}
$("#tag").addEventListener("click", nextExample);
$("#next").addEventListener("click", nextExample);

function fillMeters(on) {
  $$("#meters li").forEach((li, r) => {
    const n = ex.parts[r].score;
    $$(".ticks i", li).forEach((t, i) => { t.style.transitionDelay = `${r * 160 + i * 7}ms`; t.classList.toggle("on", on && i < n); });
  });
}

/* ---------- the card: the product's own drawing, printed on the page ---------- */
function drawCard() {
  const box = $("#printCard");
  if (!box) return;
  try {
    const c = ex.card;
    box.innerHTML = renderCard(ex.result, {
      format: "story", theme: "ink-" + colour(), moment: "rating", handle: ex.handle, name: ex.name, idPrefix: "pc",
      works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, image: c.image, workTitle: c.workTitle,
    });
    const svg = $("svg", box);
    if (svg) { svg.removeAttribute("width"); svg.removeAttribute("height"); svg.setAttribute("aria-hidden", "true"); }
    box.setAttribute("aria-label", `The Orbe card for ${ex.name}, a made-up creator: ${ex.signed}, ${ex.band}.`);
  } catch (e) { box.textContent = ""; }
}

/* ---------- the reading panel: Orbe working through a creator, step by step ---------- */
const steps = $$("#steps li"), quad = $$(".quad i");
function stepsFor(e) {
  const d = e.result.detail, noun = d.workNoun, weights = mathsFor(e.kind);
  const parts = e.parts.map((p, i) => (i ? `${p.name} beats ${p.score}.` : `${p.name} beats ${p.score} in 100.`)).join(" ");
  return [
    { label: `Reading ${noun}s`, value: `${d.works} read`, title: `Reading ${d.works} ${noun}s`, detail: e.best },
    { label: "Comparing with your size", value: "Provisional", title: `Against ${e.peers}, ${e.sizeBand}`, detail: `${parts} On provisional benchmarks.` },
    { label: "Weighing the parts", value: `${weights.length} parts`, title: "Weighing the parts", detail: `${weights.map((m) => `${m.name} ${m.weight}%`).join(", ")}. The same weights for every ${noun}.` },
    { label: "Rating", value: e.signed, title: `${e.signed}, ${e.band}`, detail: `Zero is typical for ${sizeWord(e)}. Above zero, you're ahead of them.` },
  ];
}
let runId = 0, panelVisible = false, panelStarted = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function paintStep(i, list) {
  steps.forEach((li, j) => { li.className = j < i ? "done" : j === i ? "now" : ""; $("span", li).textContent = list[j].label; $("em", li).textContent = list[j].value; });
  quad.forEach((q, j) => q.classList.toggle("on", j <= i));
  $("[data-p-step]").textContent = String(Math.min(i + 1, 4));
}
async function runPanel(restart = false) {
  const id = ++runId, e = ex, list = stepsFor(e);
  $("[data-p-name]").textContent = e.name;
  const T = $("[data-now-t]"), D = $("[data-now-d]");
  fillMeters(false);
  $("#again").hidden = true;
  if (REDUCE) {
    fillMeters(true);
    paintStep(4, list); $("[data-p-step]").textContent = "4"; $("[data-p-verb]").textContent = "Rated";
    T.textContent = list[3].title; D.textContent = list[3].detail; return;
  }
  do {
    $("[data-p-verb]").textContent = "Reading";
    for (let i = 0; i < 4; i++) {
      if (id !== runId) return;
      paintStep(i, list);
      T.textContent = list[i].title; D.textContent = "";
      const text = list[i].detail;
      for (let c = 1; c <= text.length; c++) {
        if (id !== runId) return;
        D.textContent = text.slice(0, c);
        await sleep(text[c - 1] === "." ? 160 : 17);
      }
      await sleep(1100);
    }
    paintStep(4, list); $("[data-p-step]").textContent = "4"; $("[data-p-verb]").textContent = "Rated";
    T.textContent = list[3].title; D.textContent = list[3].detail;
    fillMeters(true);
    $("#again").hidden = false;
    return;
  } while (id === runId);
}

$("#again").addEventListener("click", () => runPanel(true));

/* ---------- the forms ---------- */
function wire(formSel, inputSel, noteSel) {
  $(formSel).addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $(noteSel), h = cleanHandle($(inputSel).value);
    if (!h) { note.textContent = "Type the handle you want, and Orbe keeps it for you."; $(inputSel).focus(); return; }
    const res = await reserve({ handle: h, kind: ex.kind });
    note.innerHTML = res.via === "api"
      ? `<b>@${h}</b> is yours. Ratings open with YouTube: connect your channel to see yours.`
      : `<b>@${h}</b>: your email app has the request written out; send it and it is yours. Ratings open with YouTube: connect your channel to see yours.`;
  });
}
wire("#reserve", "#handle", "#note");
wire("#reserve2", "#handle2", "#note2");

/* ---------- the tag moves like a thing on a string ---------- */
const hang = $("#tagHang");
const spring = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, on: false };
const fine = (() => { try { return matchMedia("(pointer: fine)").matches; } catch (e) { return false; } })();
if (!REDUCE) {
  if (fine) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      spring.tx = ((e.clientX - r.left) / r.width - 0.5) * 36;
      spring.ty = ((e.clientY - r.top) / r.height - 0.5) * 26;
      wake();
    });
    stage.addEventListener("pointerleave", () => { spring.tx = 0; spring.ty = 0; wake(); });
  } else {
    let lastY = scrollY;
    addEventListener("scroll", () => {
      const dy = scrollY - lastY; lastY = scrollY;
      if (!visible) return;
      spring.vy += Math.max(-3, Math.min(3, -dy * 0.12));
      wake();
    }, { passive: true });
  }
}
function wake() { if (!spring.on) { spring.on = true; requestAnimationFrame(swing); } }
function swing() {
  const k = 0.06, d = 0.82;
  spring.vx = (spring.vx + (spring.tx - spring.x) * k) * d;
  spring.vy = (spring.vy + (spring.ty - spring.y) * k) * d;
  spring.x += spring.vx; spring.y += spring.vy;
  hang.style.translate = `${spring.x.toFixed(2)}px ${spring.y.toFixed(2)}px`;
  shift.x = spring.x; shift.y = spring.y;
  drawNow();
  if (Math.abs(spring.vx) + Math.abs(spring.vy) + Math.abs(spring.tx - spring.x) + Math.abs(spring.ty - spring.y) > 0.05) requestAnimationFrame(swing);
  else spring.on = false;
}

/* ---------- start ---------- */
fill();
setColour(colour(), false);
const ready = () => { drawTag(); layout(); };
document.fonts?.ready.then(() => { drawTag(); layout(); kick(); });
ready(); thread(); startCycle();
let rz = 0;
addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { drawTag(); layout(); threadStart = -1e9; kick(); }); });
if ("IntersectionObserver" in window) {
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
  new IntersectionObserver((es) => {
    panelVisible = es[0].isIntersecting;
    if (panelVisible && !panelStarted) { panelStarted = true; runPanel(); }
  }, { threshold: 0.25 }).observe($("#panel"));
} else runPanel();
if (REDUCE) runPanel();
