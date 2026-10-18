import { example, ORDER, EXAMPLE_LINE, benchmark, BENCHMARK_LINE, mathsFor } from "../assets/r5/examples.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { folk, setFill, FOLK_W, FOLK_H } from "./folk.js";
import { WORDMARK } from "../assets/r5/wordmark.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const f = (name) => $(`[data-f="${name}"]`);
const root = document.documentElement;
root.classList.add("js");
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const params = new URLSearchParams(location.search);
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const NS = "http://www.w3.org/2000/svg";

mountWordmark($("#wm"), { animate: !reduce });
mountWordmark($("#wm-foot"), { animate: false });
f("example-line").textContent = EXAMPLE_LINE;
f("v-example").textContent = EXAMPLE_LINE;
f("bench-line").textContent = BENCHMARK_LINE;

const HEAD = { channel: "channels", newsletter: "newsletters", stream: "streamers", podcast: "podcasts", portfolio: "photographers" };
const WORKS = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "show", portfolio: "photography" };
const PLATFORM = { channel: ["YouTube", "YouTube or Google"], newsletter: ["platform", "Substack"], stream: ["platform", "Twitch"], podcast: ["platform", "any podcast platform"], portfolio: ["platform", "any photography platform"] };
const pct = (v) => { const p = v * 100; return (p >= 10 ? Math.round(p) : +p.toFixed(1)) + "%"; };
const nounOf = (e) => e.sizeBand.split(" ").pop();
const sizeOf = (e) => e.sizeBand.replace(/ \S+$/, "");
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function colours() {
  return { ink: css("--orbe-ink"), paper: css("--orbe-chalk"), spark: css("--orbe-ember"), fill: css("--field") };
}
const kindColour = (k) => css(`--k-${k}`);
function box(svg) {
  const r = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  return { w, h };
}
/* Width of a kind's folk in local units: the camera body is wider than the O. */
const spanOf = (k) => (k === "portfolio" ? { l: -96, r: 794 } : { l: 0, r: FOLK_W + 34 });
const headroom = 1.27; // props rise about a quarter above the O

/* ================================================================
   1. The hero line-up: creators of one kind, small to big, standing on a
   ruler. Three of them are your size, and the bracket says so.
   ================================================================ */
const lineSvg = $("#lineup");
const lineFig = $(".lineup");
let heroRose = false;
function drawLineup(mode = "still") {
  const { w, h } = box(lineSvg);
  const c = colours();
  const k = kindNow;
  const wide = w >= 600;
  const ground = h - (wide ? 30 : 16);
  const top = wide ? 54 : 40; // room for the bracket
  const sizes = wide ? [0.55, 1, 1, 1, 1.55] : [0.42, 0.68, 1, 1, 1, 1.62];
  const trio = sizes.map((m, i) => (m === 1 ? i : -1)).filter((i) => i >= 0);
  const you = trio[1];
  const sp = spanOf(k);
  const ratio = (sp.r - sp.l) / FOLK_H;
  const g = wide ? -0.12 : 0.04;
  const upTo = sizes.slice(0, trio[2] + 1);
  const byW = (w - (wide ? 40 : 20)) / (upTo.reduce((a, m) => a + m * ratio, 0) + (upTo.length - 1) * g);
  const trioH = Math.min((ground - top) / headroom, byW);
  const gap = trioH * g;
  let x = wide ? 24 : 12;
  const items = sizes.map((m, i) => {
    const hh = trioH * m, s = hh / FOLK_H;
    const it = { i, s, x: x - sp.l * s, w: (sp.r - sp.l) * s, hh };
    x += it.w + gap;
    return it;
  });
  let out = "";
  // the ruler: a carved line with ticks every 12px, longer every 60px
  out += `<g class="ruler-g" fill="${c.ink}"><rect x="0" y="${ground}" width="${w}" height="3"/>`;
  for (let t = 6; t < w; t += 12) { const big = (t - 6) % 60 === 0; out += `<rect x="${t}" y="${ground + 3}" width="${big ? 2 : 1.5}" height="${big ? 10 : 5}"/>`; }
  out += `</g>`;
  [...items.filter((it) => it.i !== you), items[you]].forEach((it) => {
    const n = it.i;
    const isYou = it.i === you;
    const look = it.i < you ? 0.9 : it.i > you ? -0.9 : 0;
    const body = isYou ? kindColour(k) : c.paper;
    const anim = mode === "rise" ? ` class="rise" style="--rd:${n * 90}ms"` : mode === "hop" ? ` class="hop" style="--hd:${Math.abs(n - you) * 50}ms"` : "";
    out += `<g transform="translate(${it.x.toFixed(1)} ${ground}) scale(${it.s.toFixed(4)})"><g${anim}>${folk({ kind: k, body, colours: c, look, cls: isYou ? "is-you" : "" }).replace('class="folk', `style="--bd:${(n * 1.3) % 5}s" class="folk`)}</g></g>`;
  });
  // the bracket over the three who are your size
  const a = items[trio[0]], b = items[trio[2]];
  const bx0 = a.x + spanOf(k).l * a.s, bx1 = b.x + (spanOf(k).r - 34) * b.s;
  const by = ground - trioH * headroom - 14;
  const len = (bx1 - bx0) + 2 * 16;
  out += `<path class="bracket" style="--bl:${len.toFixed(0)}" d="M${bx0},${by + 16}L${bx0},${by}L${bx1},${by}L${bx1},${by + 16}" fill="none" stroke="${c.ink}" stroke-width="3"/>`;
  const label = "your size";
  const lw = label.length * (wide ? 9 : 8) + 22;
  const lx = (bx0 + bx1) / 2;
  out += `<g class="b-label"><rect x="${lx - lw / 2}" y="${by - 13}" width="${lw}" height="26" rx="13" fill="${c.ink}"/><text x="${lx}" y="${by + 5}" text-anchor="middle" fill="${css("--orbe-chalk")}" style="font:500 ${wide ? 14 : 13}px var(--mono);letter-spacing:.04em">${label.toUpperCase()}</text></g>`;
  lineSvg.innerHTML = out;
  if (mode === "rise") {
    lineFig.classList.add("is-go");
    setTimeout(() => lineFig.classList.remove("is-go"), 1700);
  }
}

/* ================================================================
   2. Drag your size. Two of the same kind stand side by side, the same
   size as each other, and grow as you drag. Each O is a glass, filled to
   its reach: the typical one at this size, and the example's own. Below,
   the whole line-up of sizes, small to big.
   ================================================================ */
const drag = $("#drag");
const stage = $("#stage");
const stageSvg = $("#stage-svg");
let bench, ex, own = 0, bandNow = -1, scaleTop = 1, shownTypical = null, tween = null;

function bandOf(v) { return Math.min(bench.rows.length - 1, Math.floor(v * bench.rows.length)); }

function drawStage() {
  if (!bench) return;
  const { w, h } = box(stageSvg);
  const c = colours();
  const k = kindNow, kc = kindColour(k);
  const v = +drag.value / 1000;
  const wide = w >= 600;
  const sp = spanOf(k);
  const trackH = wide ? 78 : 64;
  const labelH = wide ? 64 : 56;
  const ground = h - trackH - labelH;
  const pad = wide ? 40 : 18;
  const gap = wide ? 64 : 34;
  const byWidth = ((w - pad * 2 - gap) / 2 / (sp.r - sp.l)) * FOLK_H;
  const hMax = Math.min((ground - 12) / headroom, byWidth);
  const hh = hMax * (0.5 + 0.5 * v);
  const s = hh / FOLK_H;
  const cw = (sp.r - sp.l - 34) * s;
  const xT = w / 2 - gap / 2 - cw - sp.l * s;
  const xY = w / 2 + gap / 2 - sp.l * s;
  const typ = shownTypical ?? bench.rows[bandNow].value;
  const share = (x) => clamp01(x / scaleTop);
  const chalk = css("--orbe-chalk");
  let out = "";
  out += `<rect x="0" y="${ground}" width="${w}" height="2" fill="${chalk}" opacity=".5"/>`;
  out += `<g transform="translate(${xT.toFixed(1)} ${ground}) scale(${s.toFixed(4)})">${folk({ kind: k, body: c.paper, colours: c, look: 1, fill: true, cls: "typ" })}</g>`;
  out += `<g transform="translate(${xY.toFixed(1)} ${ground}) scale(${s.toFixed(4)})">${folk({ kind: k, body: kc, colours: c, look: -1, fill: true, cls: "you" })}</g>`;
  // measuring: a line at each fill level, across both glasses
  const yAt = (sh) => ground + s * (-67 - 213 - sh * 566);
  const yT = yAt(share(typ)), yY = yAt(share(own));
  const xa = xT + 100 * s, xb = xY + 564 * s;
  out += `<g stroke-width="2.5" stroke-dasharray="7 5"><line x1="${xa}" y1="${yT}" x2="${xb}" y2="${yT}" stroke="${chalk}"/><line x1="${xa}" y1="${yY}" x2="${xb}" y2="${yY}" stroke="${kc}"/></g>`;
  const mx = w / 2;
  out += `<g stroke="${chalk}" stroke-width="3"><line x1="${mx}" y1="${yT}" x2="${mx}" y2="${yY}"/><line x1="${mx - 9}" y1="${yT}" x2="${mx + 9}" y2="${yT}"/><line x1="${mx - 9}" y1="${yY}" x2="${mx + 9}" y2="${yY}"/></g>`;
  // the labels under their feet
  const fs = wide ? 30 : 24, ns = wide ? 14 : 13;
  const cxT = xT + (sp.l + (sp.r - 34)) / 2 * s, cxY = xY + (sp.l + (sp.r - 34)) / 2 * s;
  out += `<g fill="${chalk}" text-anchor="middle"><text x="${cxT}" y="${ground + fs + 6}" style="font:700 ${fs}px var(--sans);letter-spacing:-.03em">${pct(typ)}</text><text x="${cxT}" y="${ground + fs + 6 + ns + 6}" style="font:500 ${ns}px var(--sans)">Typical at this size</text>`;
  out += `<text x="${cxY}" y="${ground + fs + 6}" style="font:700 ${fs}px var(--sans);letter-spacing:-.03em">${pct(own)}</text><text x="${cxY}" y="${ground + fs + 6 + ns + 6}" style="font:500 ${ns}px var(--sans)">${ex.name}</text></g>`;
  // the line-up of sizes along the track, lined up with the slider
  const sr = stage.getBoundingClientRect(), ir = drag.getBoundingClientRect();
  const thumb = 17;
  const x0 = ir.left - sr.left + thumb, x1 = ir.right - sr.left - thumb;
  const n = bench.rows.length;
  const tg = h - 6;
  bench.rows.forEach((r, i) => {
    const cx = x0 + ((i + 0.5) / n) * (x1 - x0);
    const ph = (wide ? 22 : 18) + (i / (n - 1)) * (wide ? 30 : 24);
    const ps = ph / FOLK_H;
    const active = i === bandNow;
    const home = r.key === bench.example;
    const g = folk({ kind: k, body: home ? kc : c.paper, colours: c, fill: true });
    out += `<g opacity="${active ? 1 : 0.5}" transform="translate(${(cx - ((sp.l + sp.r - 34) / 2) * ps).toFixed(1)} ${tg}) scale(${ps.toFixed(4)})" data-share="${share(r.value)}">${g}</g>`;
  });
  stageSvg.innerHTML = out;
  // fills
  const gs = $$(".folk", stageSvg);
  setFill(gs[0], share(typ));
  setFill(gs[1], share(own));
  $$("g[data-share]", stageSvg).forEach((g) => setFill($(".folk", g), +g.dataset.share));
}

function setupMeter(e) {
  ex = e;
  bench = benchmark(e.kind);
  own = parseFloat(e.parts.find((p) => p.key === "reach").value) / 100;
  scaleTop = Math.max(own, ...bench.rows.map((r) => r.value)) * 1.5;
  f("ex-name").textContent = e.name;
  f("ex-own").textContent = pct(own);
  f("ex-noun").textContent = nounOf(e);
  const i = bench.rows.findIndex((r) => r.key === bench.example);
  drag.value = Math.round(((i + 0.5) / bench.rows.length) * 1000);
  bandNow = -1;
  shownTypical = null;
  // the published weights, for this kind
  f("w-peers").textContent = e.peers;
  f("w-list").innerHTML = mathsFor(e.kind).map((m) => `<li>${m.name} <b>${m.weight}%</b></li>`).join("");
  const [m, who] = PLATFORM[e.kind];
  f("notice").textContent = `It is not a ${m} metric, and it is not provided or endorsed by ${who}.`;
  readMeter(false);
}
const times = (x) => (x >= 10 ? Math.round(x) : x.toFixed(1)) + "×";
function says(x) {
  return x < 1 ? "Looks behind." : x < 1.6 ? "Looks typical." : x < 2.2 ? "Looks good." : x < 4.5 ? "Looks great." : "Looks like genius.";
}
function readMeter(animate) {
  const i = bandOf(+drag.value / 1000);
  if (i !== bandNow) {
    const prev = bandNow;
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
    f("m-verdict").innerHTML = home
      ? `This is its size. Rated here: <b>${ex.signed} ${ex.band}</b>, reach beats ${reach.score} in 100 ${ex.peers} its size.`
      : `<span class="says">${says(x)}</span> Wrong yardstick. ${ex.name} has ${homeLabel} ${noun}, so that is where Orbe rates it.`;
    drag.setAttribute("aria-valuetext", `${r.label} ${noun}: typical ${pct(r.value)}, ${ex.name} ${times(x)} typical`);
    // the typical glass drains or fills to its new level; a figure settles, never bounces
    const from = prev === -1 || !animate || reduce ? r.value : (shownTypical ?? bench.rows[prev].value);
    if (tween) cancelAnimationFrame(tween);
    if (from === r.value) { shownTypical = null; }
    else {
      const t0 = performance.now(), dur = 380;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        shownTypical = from + (r.value - from) * e;
        drawStage();
        if (p < 1) tween = requestAnimationFrame(step); else { tween = null; shownTypical = null; }
      };
      tween = requestAnimationFrame(step);
    }
  }
  drawStage();
}
drag.addEventListener("input", () => { stopDemo(); readMeter(true); });

let dragging = false;
function fromPointer(ev) {
  const ir = drag.getBoundingClientRect();
  const v = clamp01((ev.clientX - ir.left - 17) / (ir.width - 34));
  drag.value = Math.round(v * 1000);
  readMeter(true);
}
stage.addEventListener("pointerdown", (ev) => { stopDemo(); dragging = true; try { stage.setPointerCapture(ev.pointerId); } catch {} fromPointer(ev); });
stage.addEventListener("pointermove", (ev) => { if (dragging) fromPointer(ev); });
stage.addEventListener("pointerup", () => { dragging = false; });
stage.addEventListener("pointercancel", () => { dragging = false; });

/* On first view the pair walks the sizes once, from its own size out and back, so people see it moves. */
let demo = null, demoDone = params.get("auto") === "0";
function stopDemo() { if (demo) cancelAnimationFrame(demo); demo = null; demoDone = true; }
function runDemo() {
  if (demoDone || reduce) return;
  demoDone = true;
  const start = +drag.value, t0 = performance.now(), dur = 4200;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const path = p < 0.32 ? start + (999 - start) * ease(p / 0.32) : p < 0.72 ? 999 - 999 * ease((p - 0.32) / 0.4) : start * ease((p - 0.72) / 0.28);
    drag.value = Math.round(path);
    readMeter(true);
    if (p < 1) demo = requestAnimationFrame(step); else demo = null;
  };
  demo = requestAnimationFrame(step);
}
try {
  new IntersectionObserver(([en], io) => { if (en.isIntersecting && en.intersectionRatio > 0.55) { io.disconnect(); setTimeout(runDemo, 450); } }, { threshold: [0, 0.55, 1] }).observe(stage);
} catch {}

/* ================================================================
   3. The verdict: the figure counts up once, and the creator walks the
   ruler from zero (typical) to where it stands.
   ================================================================ */
const rulerSvg = $("#ruler");
let verdictSeen = reduce;
function drawRuler() {
  const e = example(kindNow);
  const { w, h } = box(rulerSvg);
  const c = colours();
  const ink = c.ink;
  const base = h - 42;
  const xOf = (r) => 10 + ((Math.max(-3, Math.min(3, r)) + 3) / 6) * (w - 20);
  let out = `<rect x="0" y="${base}" width="${w}" height="3" fill="${ink}"/>`;
  for (let r = -3; r <= 3.001; r += 0.25) {
    const big = Math.abs(r - Math.round(r)) < 0.01;
    out += `<rect x="${xOf(r) - 0.75}" y="${base + 3}" width="${big ? 2 : 1.5}" height="${big ? 11 : 5}" fill="${ink}"/>`;
  }
  [-2, -0.8, 0.8, 2].forEach((b) => { out += `<rect x="${xOf(b) - 1.5}" y="${base - 12}" width="3" height="15" fill="${ink}"/>`; });
  const bands = [["Poor", -2.5], ["Subpar", -1.4], ["Average", 0], ["Good", 1.4], ["Great", 2.5]];
  const fsz = w < 420 ? 12 : 14;
  bands.forEach(([n, at]) => { const on = n === e.band; out += `<text x="${xOf(at)}" y="${base + 34}" text-anchor="middle" fill="${ink}" style="font:${on ? "italic 600" : "400"} ${on ? fsz + 3 : fsz}px ${on ? "var(--serif)" : "var(--sans)"}">${n}</text>`; });
  out += `<text x="${xOf(0)}" y="${base - 18}" text-anchor="middle" fill="${ink}" style="font:500 12px var(--mono);letter-spacing:.04em">0 TYPICAL</text>`;
  const ph = Math.min(h - 58, 92), s = ph / FOLK_H;
  const sp = spanOf(kindNow);
  const half = ((sp.l + sp.r - 34) / 2) * s;
  const at = verdictSeen ? xOf(e.rating) : xOf(0);
  out += `<g class="walker" style="transform:translateX(${at.toFixed(1)}px)"><g transform="translate(${-half} ${base}) scale(${s.toFixed(4)})">${folk({ kind: kindNow, body: kindColour(kindNow), colours: c, look: e.rating > 0 ? 0.8 : -0.8 })}</g></g>`;
  rulerSvg.innerHTML = out;
  rulerSvg.dataset.to = xOf(e.rating).toFixed(1);
}
function fillVerdict(e) {
  f("v-num").textContent = verdictSeen ? e.signed : "+0.00";
  f("v-band").textContent = e.band;
  f("v-name").textContent = e.name;
  f("v-peers").textContent = e.peers;
  f("v-size").textContent = e.sizeBand;
  f("v-parts").innerHTML = e.parts.map((p, i) => `<li style="--d:${i * 120}ms"><span class="pn">${p.name}</span><span class="pv">${p.value}</span><span class="ps"><b>${p.score}</b>in 100</span><span class="pbar" aria-hidden="true"><i style="--w:${p.score}%"></i></span></li>`).join("");
  // the line a creator would post: their strongest part, said plainly
  const pool = e.parts.filter((p) => !(e.kind === "newsletter" && p.key === "reach"));
  const best = pool.reduce((a, p) => (p.score > a.score ? p : a), pool[0]);
  const line = `My ${WORKS[e.kind]} beats <b>${best.score} in 100</b> ${e.peers} my size on ${best.name.toLowerCase()}.`;
  f("post-q").innerHTML = line;
  f("post-q").dataset.text = line.replace(/<\/?b>/g, "");
  $(".post-c").textContent = `The line for ${e.name}, a made-up example. Independently calculated by Orbe.`;
  drawRuler();
}
function countUp(e) {
  const el = f("v-num");
  const t0 = performance.now(), dur = 900;
  const sign = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2);
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? sign(e.rating * k) : e.signed;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
try {
  new IntersectionObserver(([en], io) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    const e = example(kindNow);
    verdictSeen = true;
    if (reduce) { fillVerdict(e); return; }
    countUp(e);
    const wk = $(".walker", rulerSvg);
    if (wk) requestAnimationFrame(() => { wk.style.transform = `translateX(${rulerSvg.dataset.to}px)`; });
  }, { threshold: 0.45 }).observe($(".v-fig"));
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { $(".parts").classList.add("seen"); io.disconnect(); } }, { threshold: 0.3 }).observe($(".parts"));
} catch { verdictSeen = true; $(".parts").classList.add("seen"); }

$('[data-f="copy"]').addEventListener("click", async (ev) => {
  const b = ev.currentTarget;
  const text = `${f("post-q").dataset.text} Independently calculated by Orbe. orbe.vc`;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {}
  b.textContent = ok ? "Copied. Post it." : text;
  setTimeout(() => { b.textContent = "Copy the line"; }, 2400);
});

/* ================================================================
   4. The door: a big folk peeks in at the terms.
   ================================================================ */
const doorSvg = $("#door-o");
function drawDoor() {
  const { w, h } = box(doorSvg);
  const c = colours();
  const s = Math.min(w / (FOLK_W + 40), h / (FOLK_H + 60));
  doorSvg.innerHTML = `<g transform="translate(10 ${h - 4}) scale(${s.toFixed(4)})">${folk({ kind: kindNow, body: css("--night-accent"), colours: { ...c, ink: "#000" }, look: -1 })}</g>`;
}

/* ================================================================
   5. The close: a landscape cut from paper, the sun a carved O, and one
   creator of every kind standing on the ridge at the same size.
   ================================================================ */
const landSvg = $("#land");
const landBox = $(".land");
let landRose = false;
function drawLand(mode = "still") {
  const { w, h } = box(landSvg);
  const c = colours();
  const ridge = (x, base, amp, freq, ph) => base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 1.7) * amp * 0.3;
  const hill = (base, amp, freq, ph) => { let d = `M0,${h}L0,${ridge(0, base, amp, freq, ph).toFixed(1)}`; for (let x = 8; x <= w + 8; x += 8) d += `L${x},${ridge(x, base, amp, freq, ph).toFixed(1)}`; return d + `L${w + 8},${h}Z`; };
  const fr = 6.2 / Math.max(w, 600);
  const sunR = Math.min(h * 0.36, 120), sunS = (sunR * 2) / 726;
  let out = "";
  out += `<g transform="translate(${w * 0.72 - sunR * 0.92} ${h * 0.5 - sunR}) scale(${sunS.toFixed(4)}) translate(0 713)"><path d="${WORDMARK.text.O}" fill="${css("--l-sun")}" fill-rule="evenodd"/></g>`;
  const layer = (d, fill) => `<path d="${d}" fill="${c.ink}" transform="translate(0 -4)"/><path d="${d}" fill="${fill}"/>`;
  out += layer(hill(h * 0.48, h * 0.08, fr * 0.8, 1.2), css("--l-far"));
  out += layer(hill(h * 0.64, h * 0.06, fr * 1.1, 3.1), css("--l-mid"));
  const nearBase = h * 0.8, nearAmp = h * 0.035, nearPh = 0.4;
  out += layer(hill(nearBase, nearAmp, fr * 0.9, nearPh), css("--l-near"));
  const ph = Math.min(h * 0.4, w < 600 ? 66 : 118), s = ph / FOLK_H;
  const kinds = ORDER;
  const step = Math.min((w - 40) / kinds.length, ph * 1.5);
  const x0 = w / 2 - (step * (kinds.length - 1)) / 2;
  kinds.forEach((k, i) => {
    const sp = spanOf(k);
    const cx = x0 + i * step;
    const gy = ridge(cx, nearBase, nearAmp, fr * 0.9, nearPh) + ph * 0.06;
    const anim = mode === "rise" ? ` class="rise" style="--rd:${i * 110}ms"` : "";
    out += `<g transform="translate(${(cx - ((sp.l + sp.r - 34) / 2) * s).toFixed(1)} ${gy.toFixed(1)}) scale(${s.toFixed(4)})"><g${anim}>${folk({ kind: k, body: kindColour(k), colours: c, look: (i - 2) * -0.4 }).replace('class="folk', `style="--bd:${i * 1.1}s" class="folk`)}</g></g>`;
  });
  landSvg.innerHTML = out;
  if (mode === "rise") { landBox.classList.add("is-go"); setTimeout(() => landBox.classList.remove("is-go"), 1800); }
}
try {
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { io.disconnect(); if (!reduce) { landRose = true; drawLand("rise"); } } }, { threshold: 0.4 }).observe(landBox);
} catch {}

/* ================================================================
   Kinds: the word swaps, everyone takes the kind's colour and prop,
   and every panel re-rates with the engine.
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
  setTimeout(() => cur.remove(), 200);
  setTimeout(() => { slot.style.width = ""; nw.className = "slot-word"; }, 520);
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
  fillVerdict(e);
  if (heroRose) drawLineup(animate && !reduce ? "hop" : "still");
  drawDoor();
}
$$(".kinds button").forEach((b) => b.addEventListener("click", () => {
  stopCycle();
  setKind(b.dataset.kind);
  b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
}));
radioKeys($(".kinds"), () => $$(".kinds button"), (b) => { stopCycle(); setKind(b.dataset.kind); });

/* Every kind of creator: the headline walks through them once (on a phone) or until you choose, with a pause. */
const pauseBtn = $(".pause");
let cycle = null, paused = false, steps = 0;
function stopCycle() { if (cycle) clearInterval(cycle); cycle = null; pauseBtn.hidden = true; }
if (!reduce && params.get("auto") !== "0") {
  let heroSeen = true;
  try { new IntersectionObserver(([en]) => { heroSeen = en.isIntersecting; }).observe($(".h1")); } catch {}
  const order = ["channel", "stream", "newsletter", "podcast", "portfolio"];
  const phone = matchMedia("(max-width: 599px)").matches;
  pauseBtn.hidden = false;
  cycle = setInterval(() => {
    if (paused || !heroSeen || document.hidden) return;
    if (document.activeElement && document.activeElement.closest(".hero form, .kinds")) return;
    steps++;
    setKind(order[(order.indexOf(kindNow) + 1) % order.length]);
    if (phone && steps >= order.length) stopCycle();
  }, 2800);
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.setAttribute("aria-label", paused ? "Play the changing word" : "Pause the changing word");
  });
  ["pointerdown", "keydown"].forEach((t) => $(".hero").addEventListener(t, (ev) => { if (ev.target.closest(".kinds, form")) stopCycle(); }, { passive: true }));
}

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
   The founder's colour switch: Blue or Pink, remembered.
   ================================================================ */
function drawAll() {
  drawLineup("still");
  drawStage();
  drawRuler();
  drawDoor();
  drawLand("still");
}
function setPalette(c, save = true) {
  root.dataset.scheme = c;
  $$(".palette button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.c === c)));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = css("--field");
  if (save) { try { localStorage.setItem("orbe-r6d-c", c); } catch {} }
  const u = new URL(location.href);
  if (u.searchParams.get("c") && u.searchParams.get("c") !== c) { u.searchParams.set("c", c); try { history.replaceState(null, "", u); } catch {} }
  if (heroRose) drawAll();
}
$$(".palette button").forEach((b) => b.addEventListener("click", () => setPalette(b.dataset.c)));
radioKeys($(".palette"), () => $$(".palette button"), (b) => setPalette(b.dataset.c));

/* ================================================================
   Reserve: honest about what happens.
   ================================================================ */
$$("form.reserve").forEach((form) => form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const note = $(".note", form);
  const input = $("input", form);
  const h = cleanHandle(input.value).toLowerCase();
  if (!h) { note.classList.remove("done"); note.textContent = "Type the handle you want, then reserve it."; input.focus(); return; }
  input.value = h;
  const res = await reserve({ handle: h, kind: kindNow });
  note.classList.add("done");
  const sign = `<span class="sign">orbe.vc/@${h}</span>`;
  note.innerHTML = res.via === "api"
    ? `${sign}<br>Held for you. We'll check it's yours when ratings open.`
    : `${sign}<br>Your email app has the request written out. Held once your email arrives. We'll check it's yours when ratings open.`;
}));

/* Start */
const startKind = ORDER.includes(params.get("kind")) ? params.get("kind") : "channel";
setPalette(root.dataset.scheme === "pink" ? "pink" : "blue", false);
setKind(startKind, false);
heroRose = true;
drawLineup(reduce ? "still" : "rise");
drawLand("still");
let rt, lastW = innerWidth;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => { if (innerWidth !== lastW || true) { lastW = innerWidth; drawAll(); } }, 120);
});
document.fonts?.ready.then(() => { drawStage(); drawRuler(); });
