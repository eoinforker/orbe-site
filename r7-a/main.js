/* Orbe r7-a. Every figure comes from the engine: the examples via examples.js, and every slider
   re-rates the same made-up creator with the same engine, live, as you drag.
   The device is the hundred: one cell per creator your size, drawn in the illustration language
   (site/fx/halftone.js), on one cell grid per piece. Each piece plays once when it is 40% in view. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { rate, rateWorks, fixtureSnapshot, FIXTURE_NOW, SPECS, signed, ratingNotice } from "../assets/engine/rating/browser.js";
import { successFee, buyerPremium, TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField, spread, rng, mix, lerp } from "../fx/halftone.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let reduce = new URLSearchParams(location.search).has("still");
try { reduce = reduce || matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const handleOf = (v) => cleanHandle(v).toLowerCase();
const num = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const clampScore = (n) => Math.max(1, Math.min(99, Math.round(n))); /* never "100 in 100", never "0 in 100" */
const compact = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));
const gbp = (p) => formatMoney({ amount: Math.round(p * 100), currency: "GBP" });
const gbpC = (p) => "£" + compact(p);
const easeUi = (t) => t * (2 - t); /* ease-out-quad, the same curve as --ease-ui */
const linear = (t) => t;

const C = { ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", sky: "#9EE9FB", mist: "#D6F6FD", cobalt: "#1F4BFF", ember: "#FF5A1F" };

/* ---------- wordmarks: still ---------- */
mountWordmark($("[data-wordmark]"), { animate: false });
mountWordmark($("[data-wordmark-foot]"), { animate: false });

/* ---------- nav: Paper once the page moves; a sheet on phones ---------- */
const nav = $("[data-nav]");
const onScroll = () => nav.classList.toggle("is-solid", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();
const menu = $("[data-menu]"), sheet = $("[data-sheet]");
const setMenu = (open) => { menu.setAttribute("aria-expanded", String(open)); sheet.hidden = !open; nav.classList.toggle("is-open", open); };
menu.addEventListener("click", () => setMenu(sheet.hidden));
sheet.addEventListener("click", (ev) => { if (ev.target.closest("a")) setMenu(false); });
addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !sheet.hidden) { setMenu(false); menu.focus(); } });

/* ---------- the made-up creators, as examples.js builds them, so the sliders can re-rate them ---------- */
const MADE_UP = {
  channel: { kind: "youtube", title: "Field Recordings", o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 } },
  newsletter: { kind: "substack", title: "Margin Notes", o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 } },
  stream: { kind: "twitch", title: "Night Shift", o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 } },
  podcast: { kind: "podcast", title: "The Long Table", o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 } },
  portfolio: { kind: "photography", title: "Low Tide Prints", o: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 } },
};
const COUNT_NOUN = { channel: "views", newsletter: "opens", stream: "viewers", podcast: "downloads", portfolio: "views" };
const WORKS = { channel: "uploads", newsletter: "issues", stream: "streams", podcast: "episodes", portfolio: "photo sets" };
const WORK = { channel: "upload", newsletter: "issue", stream: "stream", podcast: "episode", portfolio: "photo set" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");

const BASE = {};
function baseSnap(k) {
  if (BASE[k]) return BASE[k];
  const m = MADE_UP[k];
  const s = fixtureSnapshot({ kind: m.kind, noise: 0.25, ...m.o, title: m.title });
  s.account.handle = example(k).handle;
  return (BASE[k] = s);
}
/* The same works, read at another audience, with every volume scaled by k (rates and the mailing list stay put). */
function snapAt(k, audience, scale) {
  const s = baseSnap(k);
  const spec = SPECS[s.account.kind];
  const vol = new Set(spec.metrics.filter((m) => m.unit !== "ratio" && m.key !== "recipients").map((m) => m.key));
  return {
    ...s,
    account: { ...s.account, audience },
    works: scale === 1 ? s.works : s.works.map((w) => ({ ...w, metrics: Object.fromEntries(Object.entries(w.metrics).map(([key, v]) => [key, vol.has(key) ? v * scale : v])) })),
  };
}

/* ---------- maths: the normal curve the engine's priors use ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function probit(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) return -probit(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ---------- fields: one helper for every cell piece on the page ---------- */
/* Redraw only the cells whose final look changed, so a slider stays inside a frame. */
function makePiece(canvas, { cols, rows, gap, look, target }) {
  const sig = new Map();
  let played = reduce, run = null;
  const piece = {
    played: () => played,
    field: null,
    settle() {
      if (run) { run.cancel(); run = null; }
      const f = piece.field;
      if (!played) { f.draw(); return; }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const p = target(c, r), key = c + "," + r, s = JSON.stringify(look(c, r, p));
        if (sig.get(key) === s && f.get(c, r) === p) continue;
        sig.set(key, s); f.set(c, r, p);
      }
    },
    /* groups: [{ order, delay, stagger, duration, easing }], each spread starting after its delay */
    play(groups) {
      played = true;
      piece.field.setAll(0);
      sig.clear();
      const runs = [], timers = [];
      const done = groups.map((g) => new Promise((res) => {
        timers.push(setTimeout(() => {
          const r = spread(piece.field, { to: (c, rr) => target(c, rr), duration: 330, stagger: 6, easing: easeUi, reduce, ...g });
          runs.push(r); r.done.then(res);
        }, reduce ? 0 : g.delay ?? 0));
      }));
      run = { cancel() { timers.forEach(clearTimeout); runs.forEach((r) => r.cancel()); } };
      Promise.all(done).then(() => { run = null; piece.settle(); });
    },
    relayout() { sig.clear(); piece.field.layout(); if (played) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) piece.field.set(c, r, target(c, r)); } },
  };
  piece.field = createField(canvas, { cols, rows, gap, look: (c, r, p) => look(c, r, p) });
  if (played) piece.relayout();
  return piece;
}
const pitchOf = (f, fallback = 36) => (f ? f.cell : fallback) * 0.1;
const DIRS = [45, 135, 315, 225, 90, 0];
const dirRand = rng(93);
const DIR = Array.from({ length: 400 }, () => DIRS[Math.floor(dirRand() * 6)]);
/* from idle dots to a final look, in two halves: the tint arrives, then the dots grow and close */
function blend(idle, fin, p, pitch, dir) {
  if (!fin || p <= 0) return { ...idle, pitch, angle: 45, dir };
  if (p >= 1) return { ...fin, pitch, angle: 45, dir };
  const q = Math.min(1, p * 2), w = Math.max(0, p * 2 - 1);
  return {
    base: fin.base ? (idle.base ? mix(idle.base, fin.base, q) : q > 0.5 ? fin.base : null) : idle.base,
    ink: mix(idle.ink, fin.ink, q), pitch, angle: 45, dir,
    from: lerp(idle.from * (1 - q), fin.from, w), to: lerp(idle.to * (1 - q), fin.to, w),
  };
}

/* ---------- the hundred: rank 0 is the bottom left, counted along each row and up ---------- */
const rankOf = (c, r) => (9 - r) * 10 + c;
const cellAt = (k) => [k % 10, 9 - Math.floor(k / 10)];
const ORDER100 = Array.from({ length: 100 }, (_, k) => cellAt(k));
function hundredLook(getBeaten, getField) {
  return (c, r, p) => {
    const k = rankOf(c, r), n = getBeaten();
    const pitch = pitchOf(getField());
    const idle = { base: null, ink: C.ink, from: k > n ? 0.42 : 0.16, to: 0.04 };
    let fin = null;
    if (k < n) {
      const left = n - 1 - k; /* the newer half of the beaten are the frontier, in halftone: shading by omission */
      fin = left >= n / 2 ? { base: C.cobalt, ink: C.cobalt, from: 1, to: 1 }
        : left >= n / 5 ? { base: null, ink: C.cobalt, from: 0.92, to: 0.62 }
        : { base: null, ink: C.cobalt, from: 0.6, to: 0.18 };
    } else if (k === n) fin = { base: C.ember, ink: C.ember, from: 1, to: 1 };
    return blend(idle, fin, p, pitch, 270); /* one ramp direction: denser at the bottom of each cell, so the fill reads as a level */
  };
}

/* ---------- hero: the hundred for the channel example, filled once ---------- */
const heroEx = example("channel");
const heroBeat = clampScore(heroEx.result.parts.find((p) => p.key === "reach").score);
$("[data-hero-n]").textContent = String(heroBeat);
$("[data-hero-peers]").textContent = heroEx.peers;
$("[data-hero-name]").textContent = heroEx.name;
const heroCanvas = $("[data-hero-field]");
heroCanvas.setAttribute("aria-label", `A hundred ${heroEx.peers} its size, one cell each. ${heroEx.name} beats ${heroBeat} of them on reach: ${heroBeat} cells in blue, one orange cell for ${heroEx.name}, ${99 - heroBeat} ahead.`);
let hero;
hero = makePiece(heroCanvas, { cols: 10, rows: 10, gap: 4, look: hundredLook(() => heroBeat, () => hero?.field), target: (c, r) => (rankOf(c, r) <= heroBeat ? 1 : 0) });
hero.settle();

/* ---------- sliders: log scales, snap ticks ---------- */
function makeLog(lo, hi) {
  const L = Math.log(lo), H = Math.log(hi);
  return { toVal: (p) => Math.exp(L + (p / 1000) * (H - L)), toPos: (v) => Math.round(((Math.log(v) - L) / (H - L)) * 1000) };
}
const SNAP = 18; /* slider steps, of 1000 */
function bindSlider(name, { lo, hi, ticks, label, onChange, initial, nice = (v) => v, valueText, fast = null, heavy = false }) {
  const input = $(`[data-slider="${name}"]`);
  const sc = makeLog(lo, hi);
  const tickEl = $(`[data-ticks="${name}"]`);
  /* every tick gets a mark; labels only where they have room, "Now" first */
  const labelled = [];
  for (const t of [...ticks].sort((a, b) => (b.l === "Now") - (a.l === "Now"))) if (labelled.every((u) => Math.abs(sc.toPos(u.v) - sc.toPos(t.v)) >= 140)) labelled.push(t);
  tickEl.innerHTML = ticks.map((t) => `<span class="${t.l === "Now" ? "now" : ""}" style="left:${sc.toPos(t.v) / 10}%"><i></i>${labelled.includes(t) ? esc(t.l) : ""}</span>`).join("");
  let value = initial, pending = null;
  const set = (v, from) => {
    value = v;
    if (from !== "input") input.value = String(sc.toPos(v));
    input.style.setProperty("--p", `${input.value / 10}%`);
    input.setAttribute("aria-valuetext", valueText(v));
    if (fast) fast(v);
    /* the thumb and readout move this frame; the engine re-rates after the frame paints, once per frame */
    if (from === "input" && heavy) {
      if (pending == null) requestAnimationFrame(() => setTimeout(() => { const x = pending; pending = null; onChange(x); }, 0));
      pending = v;
    } else onChange(v);
  };
  input.addEventListener("input", () => {
    const p = +input.value;
    let v = sc.toVal(p);
    const near = ticks.find((t) => Math.abs(sc.toPos(t.v) - p) <= SNAP);
    if (near) { v = near.v; input.value = String(sc.toPos(v)); }
    set(near ? near.v : nice(v), "input");
  });
  input.setAttribute("aria-label", label);
  /* Touch: the page keeps scrolling. The track only takes horizontal drags (touch-action: pan-y),
     so a vertical swipe scrolls as normal and never moves a value. Keyboard stays on the native input. */
  const wrap = document.createElement("div");
  wrap.className = "slider-wrap";
  input.before(wrap); wrap.append(input);
  const fromX = (x) => {
    const r = input.getBoundingClientRect();
    const tw = 20;
    const f = Math.max(0, Math.min(1, (x - r.left - tw / 2) / (r.width - tw)));
    input.value = String(Math.round(f * 1000));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  let drag = null;
  wrap.addEventListener("pointerdown", (ev) => {
    if (ev.button > 0) return;
    drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), moved: ev.pointerType !== "touch", vertical: false };
    input.focus({ preventScroll: true });
    if (ev.pointerType !== "touch") { wrap.setPointerCapture(ev.pointerId); fromX(ev.clientX); ev.preventDefault(); }
  });
  wrap.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(ev.clientY - drag.y) > 8) drag.vertical = true; /* a scroll, not a drag */
    if (!drag.moved && !drag.vertical && Math.abs(ev.clientX - drag.x) > 4) { drag.moved = true; try { wrap.setPointerCapture(ev.pointerId); } catch {} }
    if (drag.moved) fromX(ev.clientX);
  });
  const end = (ev, apply) => {
    if (!drag || ev.pointerId !== drag.id) return;
    /* a short, still tap moves the thumb there; anything that travelled up or down was a scroll */
    if (apply && !drag.moved && !drag.vertical && Math.abs(ev.clientY - drag.y) <= 8 && performance.now() - drag.t < 400) fromX(ev.clientX);
    drag = null;
  };
  wrap.addEventListener("pointerup", (ev) => end(ev, true));
  wrap.addEventListener("pointercancel", (ev) => end(ev, false)); /* the browser took it as a scroll */
  return { set, get: () => value, scale: sc, input };
}

/* ---------- state: one creator, one audience, one reach multiple ---------- */
const S = { kind: "channel", audience: 412000, scale: 1, r: null };
function rerate() {
  S.r = rate(snapAt(S.kind, S.audience, S.scale), FIXTURE_NOW);
  return S.r;
}

/* ---------- the live hundred, beside the size slider ---------- */
let beatN = heroBeat;
const hundredCanvas = $("[data-hundred]");
let beat;
beat = makePiece(hundredCanvas, { cols: 10, rows: 10, gap: 4, look: hundredLook(() => beatN, () => beat?.field), target: (c, r) => (rankOf(c, r) <= beatN ? 1 : 0) });

/* ---------- the hundred, by reach: the engine's prior at a hundred quantiles, stacked ---------- */
const pct = (v) => (v >= 0.1 ? Math.round(v * 100) : v >= 0.01 ? (v * 100).toFixed(1) : (v * 100).toFixed(2)) + "%";
const HW = 0.34, HB = 7, HCOLS = 2 * HB + 1;
const histCols = Array.from({ length: HCOLS }, () => []);
for (let i = 0; i < 100; i++) histCols[Math.max(-HB, Math.min(HB, Math.round(probit((i + 0.5) / 100) / HW))) + HB].push(i);
const HROWS = Math.max(...histCols.map((c) => c.length));
let histOwn = 93;
const histAt = (c, r) => histCols[c][HROWS - 1 - r];
let hist;
const histLook = (c, r, p) => {
  const i = histAt(c, r);
  const pitch = pitchOf(hist?.field, 24);
  if (i == null) return { base: null, ink: C.chalk, pitch, angle: 45, dir: 90, from: 0, to: 0 };
  const idle = { base: null, ink: C.chalk, from: 0.16, to: 0.04 };
  const fin = i < histOwn ? { base: C.sky, ink: C.sky, from: 1, to: 1 } : i === histOwn ? { base: C.ember, ink: C.ember, from: 1, to: 1 } : { base: null, ink: C.chalk, from: 0.5, to: 0.12 };
  return blend(idle, fin, p, pitch, DIR[i]);
};
hist = makePiece($("[data-hist]"), { cols: HCOLS, rows: HROWS, gap: 2, look: histLook, target: (c, r) => (histAt(c, r) == null ? 0 : 1) });
function fitHist() {
  const w = parseFloat($("[data-hist]").style.width) || 0;
  $("[data-typ]").style.left = `${w / 2}px`;
  $("[data-axis]").style.width = `${w}px`;
}
function drawHist() {
  const k = S.kind, r = S.r, e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const median = typeof prior.median === "object" ? prior.median[r.detail.bandKey] : prior.median;
  const part = r.parts.find((p) => p.key === key);
  histOwn = clampScore(part.score);
  hist.settle();
  const fmt = key === "reach" ? pct : (v) => (v * 1000).toFixed(2);
  const lowV = median * Math.exp(prior.sigma * -HB * HW), highV = median * Math.exp(prior.sigma * HB * HW);
  $("[data-axis]").innerHTML = `<span>${fmt(lowV)}</span><span>${fmt(median)}</span><span>${fmt(highV)}</span>`;
  $("[data-hist]").setAttribute("aria-label", `A hundred ${e.peers} with ${r.sizeBand} ${spec.audienceNoun}, stacked around the engine's typical. ${e.name} beats ${histOwn} of them.`);
  const unit = key === "reach" ? `${part.name.toLowerCase()}, as a share of ${spec.audienceNoun}` : `new paying subscribers per 1,000 recipients`;
  $("[data-hist-cap]").textContent = `Each cell is one of a hundred ${e.peers} with ${r.sizeBand} ${spec.audienceNoun}, placed by ${unit}. Sky cells are beaten; orange is ${e.name}.`;
}

/* ---------- the rating on its scale: five bands, ruled, one marker ---------- */
const scaleEl = $("[data-scale]");
const LO = -3, HI = 3;
const xOf = (v) => ((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * 100;
(function buildScale() {
  const edges = [LO, -2, -0.8, 0.8, 2, HI];
  scaleEl.innerHTML = [...BANDS].map((n, i) => `<span class="sb sb-${i}" style="left:${xOf(edges[i])}%;width:${xOf(edges[i + 1]) - xOf(edges[i])}%"><b>${n}</b></span>`).join("")
    + [[-2, "-2"], [0, "0"], [2, "+2"]].map(([v, l]) => `<span class="st" style="left:${xOf(v)}%">${l}</span>`).join("")
    + `<span class="mk" data-mk></span>`;
})();

/* ---------- three yardsticks, as a diff: the wrong sizes struck, its own size on the bar ---------- */
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
function drawYard() {
  const k = S.kind, r = S.r, e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const part = r.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = clampScore(r.parts.find((p) => p.key === key).score);
  const bm = benchmark(k);
  const banded = typeof prior.median === "object";
  const typical = (row) => (banded ? prior.median[row.key] : prior.median);
  const mineKey = r.detail.bandKey;
  const beats = (row) => (row.key === mineKey ? own : clampScore(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100));
  const rows = bm.rows;
  const first = rows[0], last = rows[rows.length - 1], mine = rows.find((x) => x.key === mineKey) ?? rows[0];
  const what = part.name.toLowerCase();
  const list = mine === first ? [[last], [mine, true]] : mine === last ? [[first], [mine, true]] : [[first], [last], [mine, true]];
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}: beats, in 100`;
  const yard = $("[data-yard]");
  yard.setAttribute("aria-label", `One ${e.word}'s ${what}, against ${list.length} sizes of ${e.peers}`);
  yard.innerHTML = list.map(([row, m]) => {
    const cls = m ? "mine" : banded ? "wrong" : "";
    const mark = m ? "+" : banded ? "-" : "";
    return `<li class="${cls}" data-m="${mark}"><span class="lab"><span class="t">${esc(m ? `Its size, ${row.label}` : row.label)}: ${beats(row)}</span><small>${say(beats(row), m || !banded)}${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</small></span></li>`;
  }).join("");
  $("[data-yard-why]").innerHTML = !banded
    ? `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`
    : list.length === 3
      ? `Against small ${esc(e.peers)}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
      : `Against ${mine === first ? "the giants" : "small " + esc(e.peers)}, ${VERDICT[say(beats(mine === first ? last : first))]}. <b>Not fair either.</b>`;
}

/* ---------- the rating, in cells: pixel numerals ---------- */
const GLYPH = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "+": ["000", "000", "010", "111", "010", "000", "000"], "-": ["000", "000", "000", "111", "000", "000", "000"], ".": ["0", "0", "0", "0", "0", "0", "1"],
};
const PIX_COLS = 24; /* room for "+1.23" and "-0.45", one cell between glyphs */
let pixMap = new Set();
function pixFor(text) {
  const map = new Set();
  let x = 0;
  const glyphs = [...text.replace("−", "-")].map((ch) => GLYPH[ch]).filter(Boolean);
  for (const g of glyphs) {
    g.forEach((row, y) => [...row].forEach((b, i) => { if (b === "1") map.add(`${x + i},${y}`); }));
    x += g[0].length + 1;
  }
  return map;
}
let pix;
const pixLook = (c, r, p) => {
  const pitch = pitchOf(pix?.field, 20);
  const on = pixMap.has(`${c},${r}`);
  const idle = { base: null, ink: C.ink, from: 0.08, to: 0.02 };
  return blend(idle, on ? { base: C.ink, ink: C.ink, from: 1, to: 1 } : null, p, pitch, DIR[r * PIX_COLS + c]);
};
pix = makePiece($("[data-pix]"), { cols: PIX_COLS, rows: 7, gap: 2, look: pixLook, target: (c, r) => (pixMap.has(`${c},${r}`) ? 1 : 0) });

/* ---------- the last twelve, against its own typical: a cell strip ---------- */
const WORKS_CACHE = {};
const UP = 8, DOWN = 4, U = 4; /* four cells per doubling */
let stripCols = [];
let strip;
const stripLook = (c, r, p) => {
  const pitch = pitchOf(strip?.field, 30);
  const col = stripCols[c];
  const idle = { base: null, ink: C.ink, from: 0, to: 0 };
  if (!col) return { ...idle, pitch, angle: 45, dir: 90 };
  let fin = null;
  if (r < UP && UP - r <= col.up) fin = col.hit ? { base: C.cobalt, ink: C.cobalt, from: 1, to: 1 } : { base: C.ink, ink: C.ink, from: 1, to: 1 };
  else if (r >= UP && r - UP < col.down) fin = { base: null, ink: C.ink, from: 0.62, to: 0.3 };
  return blend(idle, fin, p, pitch, r >= UP ? 270 : 90);
};
strip = makePiece($("[data-strip]"), { cols: 12, rows: UP + DOWN, gap: 2, look: stripLook, target: (c, r) => { const col = stripCols[c]; return col && ((r < UP && UP - r <= col.up) || (r >= UP && r - UP < col.down)) ? 1 : 0; } });
const stripLine = document.createElement("span");
stripLine.className = "strip-line";
stripLine.setAttribute("aria-hidden", "true");
$(".stripwrap").append(stripLine);
function fitStrip() {
  const f = strip.field, w = parseFloat($("[data-strip]").style.width) || 0;
  const pitch = f.cell + 2;
  stripLine.style.cssText = `position:absolute;left:0;top:${UP * pitch - 2}px;width:${w}px;height:2px;background:${C.ink}`;
  $("[data-strip-x]").style.cssText = `--sc:${pitch}px;width:${w}px`;
}
function drawStrip() {
  const k = S.kind, e = example(k);
  const works = (WORKS_CACHE[k] ??= rateWorks(baseSnap(k), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse());
  stripCols = works.map((w) => {
    const raw = Math.round(Math.log2(w.multiple) * U);
    const n = Math.max(-DOWN, Math.min(UP, raw === 0 ? (w.multiple >= 1 ? 1 : -1) : raw));
    return { up: n > 0 ? n : 0, down: n < 0 ? -n : 0, hit: w.multiple >= 2 };
  });
  $("[data-strip-x]").innerHTML = works.map((w) => `<li>${w.multiple.toFixed(1)}</li>`).join("");
  const hits = works.filter((w) => w.multiple >= 2).length, above = works.filter((w) => w.multiple >= 1).length;
  $("[data-strip]").setAttribute("aria-label", `${e.name}'s last ${works.length} ${WORKS[k]} against its own typical: ${above} at or above it, ${hits} at twice it or better.`);
  $("[data-strip-cap]").textContent = `Each column is one ${WORK[k]}, oldest first, with its multiple of the ${e.word}'s own typical under it. The line is that typical; four cells is double it. Blue did twice it or better: ${hits} of ${works.length}.`;
  strip.settle();
}

/* ---------- the unknown: your hundred is a question mark, and the dot is you ---------- */
const Q = ["0001111000", "0011001100", "0110000110", "0000000110", "0000001100", "0000011000", "0000110000", "0000110000", "0000000000", "0000220000"];
let q;
const qLook = (c, r, p) => {
  const pitch = pitchOf(q?.field, 18);
  const v = Q[r][c];
  const idle = { base: null, ink: C.ink, from: 0.16, to: 0.03 };
  const fin = v === "1" ? { base: C.ink, ink: C.ink, from: 1, to: 1 } : v === "2" ? { base: C.ember, ink: C.ember, from: 1, to: 1 } : null;
  return blend(idle, fin, p, pitch, DIR[r * 10 + c]);
};
q = makePiece($("[data-q]"), { cols: 10, rows: 10, gap: 2, look: qLook, target: (c, r) => (Q[r][c] === "0" ? 0 : 1) });

/* ---------- everything that reads the live rating ---------- */
let said = "";
function paint() {
  const k = S.kind, r = S.r, e = example(k);
  const spec = SPECS[e.platform];
  const lead = r.parts.find((p) => p.key === leadKey(k));
  const n = clampScore(lead.score);
  $("[data-beat-n]").textContent = String(n);
  $("[data-beat-cap]").textContent = String(n);
  const isOwn = r.sizeBand === e.sizeBand.replace(/ \D+$/, "");
  $("[data-size-say]").innerHTML = isOwn ? "your&nbsp;size" : `with ${esc(r.sizeBand)}`;
  hundredCanvas.setAttribute("aria-label", `A hundred ${e.peers} with ${r.sizeBand} ${spec.audienceNoun}, one cell each. ${e.name} beats ${n} of them: ${n} cells in blue, one orange cell for ${e.name}, ${99 - n} ahead.`);
  beatN = n;
  beat.settle();
  const sg = signed(r.rating);
  for (const el of $$('[data-out="signed"]')) el.textContent = sg;
  for (const el of $$('[data-out="band"]')) el.textContent = r.band;
  $('[data-out="size"]').textContent = num.format(S.audience);
  $('[data-out="sizeBand"]').textContent = `${r.sizeBand} ${spec.audienceNoun}`;
  const reach = r.detail.parts.find((p) => p.key === "reach");
  $('[data-out="reach"]').textContent = num.format(reach.measured * S.audience);
  $('[data-out="share"]').textContent = `${pct(reach.measured)} of ${spec.audienceNoun}`;
  $("[data-mk]").style.left = `${xOf(r.rating)}%`;
  for (const [i, b] of BANDS.entries()) $(`.sb-${i}`).classList.toggle("is", b === r.band);
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"] : e.parts.map((p) => p.key);
  $("[data-parts]").innerHTML = parts.map((key) => r.parts.find((p) => p.key === key)).filter(Boolean)
    .map((p) => `<li><span class="pn">${clampScore(p.score)}</span><span class="pl">${esc(p.name)}<small>${esc(p.value)}, beats ${clampScore(p.score)} in 100</small></span><span class="pb" aria-hidden="true"><i style="width:${clampScore(p.score)}%"></i></span></li>`).join("");
  drawHist();
  drawYard();
  pixMap = pixFor(sg);
  pix.settle();
  said = `My ${e.word} is rated ${sg}, ${r.band}, against ${e.peers} my size.`;
  $("[data-said]").textContent = `“${said}”`;
}

/* ---------- the two rating sliders ---------- */
let size, reachS;
function bindRatingSliders() {
  const k = S.kind, e = example(k), spec = SPECS[e.platform];
  const bands = spec.sizeBands;
  const lo = Math.max(500, bands[1].min / 10), hi = bands[bands.length - 1].min * 4;
  size = bindSlider("size", {
    lo, hi, initial: MADE_UP[k].o.audience, label: `${spec.audienceNoun} for ${e.name}`,
    ticks: [...bands.slice(1).map((b) => ({ v: b.min, l: compact(b.min) })), { v: MADE_UP[k].o.audience, l: "Now" }],
    nice: (v) => (v >= 1e6 ? Math.round(v / 1e4) * 1e4 : v >= 1e4 ? Math.round(v / 1e3) * 1e3 : Math.round(v / 10) * 10),
    valueText: (v) => `${num.format(v)} ${spec.audienceNoun}`,
    heavy: true, fast: (v) => { $('[data-out="size"]').textContent = num.format(v); },
    onChange: (v) => { S.audience = v; rerate(); paint(); },
  });
  reachS = bindSlider("reach", {
    lo: 0.1, hi: 10, initial: 1, label: `How many people a typical ${WORK[k]} reaches`,
    ticks: [{ v: 0.25, l: "÷4" }, { v: 0.5, l: "÷2" }, { v: 1, l: "Now" }, { v: 2, l: "×2" }, { v: 4, l: "×4" }],
    valueText: (v) => `${num.format(baseReach() * v)} ${COUNT_NOUN[k]}`,
    heavy: true, fast: (v) => { $('[data-out="reach"]').textContent = num.format(baseReach() * v); },
    onChange: (v) => { S.scale = v; rerate(); paint(); },
  });
}
const BR = {};
/* a typical work's reach count does not depend on the audience it is read against */
const baseReach = () => (BR[S.kind] ??= rate(baseSnap(S.kind), FIXTURE_NOW).detail.parts.find((p) => p.key === "reach").measured * MADE_UP[S.kind].o.audience);
/* rebinding replaces the inputs' listeners by cloning them */
function freshSlider(name) {
  const old = $(`[data-slider="${name}"]`);
  const n = old.cloneNode(true);
  const w = old.closest(".slider-wrap");
  (w ?? old).replaceWith(n);
}
for (const b of $$("[data-reset]")) b.addEventListener("click", () => {
  if (b.dataset.reset === "size") size.set(MADE_UP[S.kind].o.audience);
  else reachS.set(1);
});

/* ---------- every kind can be the example ---------- */
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false">${trayLabel[k]}</button>`).join("");
const NUMWORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
function setKind(k) {
  S.kind = k; S.audience = MADE_UP[k].o.audience; S.scale = 1;
  const e = example(k);
  const spec = SPECS[e.platform];
  const lead = k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0];
  const count = NUMWORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  const bind = {
    handle: e.handle, peers: e.peers, peerOne: e.word, fact: firstSentence(e, lead), partLow: lead.name.toLowerCase(),
    against: `against ${e.peers} its size`, works: WORKS[k], work: WORK[k], countNoun: COUNT_NOUN[k], audNoun: spec.audienceNoun,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`, line: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];
  freshSlider("size"); freshSlider("reach");
  bindRatingSliders();
  rerate();
  size.set(S.audience); reachS.set(1);
  drawStrip();
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  if (S.r.rating !== e.rating) console.warn("r7-a: slider model drifted from examples.js", k, S.r.rating, e.rating);
}
tray.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (!b) return;
  for (const x of $$("[data-tk]")) x.setAttribute("aria-pressed", String(x === b));
  requestAnimationFrame(() => setTimeout(() => setKind(b.dataset.tk), 0));
});

/* ---------- money: the fee engine, live, as a hundred cells ---------- */
const TIER_DENSITY = [[0.92, 0.66], [0.6, 0.34], [0.32, 0.12]];
function feeLook(getModel, getField) {
  return (c, r, p) => {
    const k = r * 10 + c, m = getModel();
    const pitch = pitchOf(getField(), 29);
    const idle = { base: C.chalk, ink: C.ink, from: 0.12, to: 0.02 };
    let fin = null;
    if (k < m.you) fin = { base: C.cobalt, ink: C.cobalt, from: 1, to: 1 };
    else {
      let j = m.you;
      for (const t of m.tiers) { if (k < j + t.cells) { const [a, b] = TIER_DENSITY[Math.min(2, t.i)]; fin = { base: C.chalk, ink: C.ink, from: a, to: b }; break; } j += t.cells; }
    }
    return blend(idle, fin, p, pitch, 45);
  };
}
const ALL100 = Array.from({ length: 100 }, (_, k) => [k % 10, Math.floor(k / 10)]);

let who = "network";
let sponModel = { you: 87, tiers: [{ i: 0, cells: 13 }] };
let sponF;
sponF = makePiece($("[data-spon-field]"), { cols: 10, rows: 10, gap: 2, look: feeLook(() => sponModel, () => sponF?.field), target: () => 1 });
const spon = bindSlider("spon", {
  lo: 500, hi: 250000, initial: 10000, label: "Sponsorship value in pounds",
  ticks: [{ v: 1000, l: "£1k" }, { v: 10000, l: "£10k" }, { v: 100000, l: "£100k" }],
  nice: (v) => (v >= 1e4 ? Math.round(v / 500) * 500 : Math.round(v / 50) * 50),
  valueText: (v) => gbp(v),
  onChange: (v) => paintSpon(v),
});
function paintSpon(v) {
  const bps = who === "network" ? TAKE_RATE.sponsorship.networkBps : TAKE_RATE.sponsorship.directBps;
  const fee = Math.round(v * bps) / 10000;
  const total = v + fee;
  $('[data-out="spon"]').textContent = gbp(v);
  /* cells round down for the fee; the remainder goes to the creator */
  const feeCells = Math.floor((fee / total) * 100);
  sponModel = { you: 100 - feeCells, tiers: [{ i: 0, cells: feeCells }] };
  sponF.settle();
  $("[data-spon-field]").setAttribute("aria-label", `A hundred cells, everything the brand pays, ${gbp(total)}. ${100 - feeCells} cells in blue reach you; ${feeCells} in dots are Orbe's ${bps / 100}%.`);
  $("[data-spon-cap]").textContent = `What the brand pays, in a hundred cells: ${100 - feeCells} in blue reach you, ${feeCells} in dots are Orbe's ${bps / 100}%.`;
  $("[data-spon-sums]").innerHTML = `<div><dt>You receive</dt><dd>${gbp(v)}</dd></div><div><dt>Orbe's ${bps / 100}%, paid by the brand</dt><dd>${gbp(fee)}</dd></div><div class="tot"><dt>The brand pays</dt><dd>${gbp(total)}</dd></div>`;
}
/* one tab stop for the pair: the checked radio */
const syncWho = () => { for (const x of $$("[data-who]")) { x.setAttribute("aria-checked", String(x.dataset.who === who)); x.tabIndex = x.dataset.who === who ? 0 : -1; } };
for (const b of $$("[data-who]")) b.addEventListener("click", () => {
  who = b.dataset.who;
  syncWho();
  paintSpon(spon.get());
});
syncWho();
/* arrow keys move between the two radios */
$(".seg").addEventListener("keydown", (ev) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
  ev.preventDefault();
  const next = $$("[data-who]").find((x) => x.dataset.who !== who);
  next.focus(); next.click();
});

let saleModel = { you: 92, tiers: [{ i: 0, cells: 8 }] };
let saleF;
saleF = makePiece($("[data-sale-field]"), { cols: 10, rows: 10, gap: 2, look: feeLook(() => saleModel, () => saleF?.field), target: () => 1 });
const sale = bindSlider("sale", {
  lo: 20000, hi: 20000000, initial: 250000, label: "Sale price in pounds",
  ticks: [{ v: 50000, l: "£50k" }, { v: 500000, l: "£500k" }, { v: 2000000, l: "£2M" }, { v: 10000000, l: "£10M" }],
  nice: (v) => (v >= 1e6 ? Math.round(v / 5e4) * 5e4 : v >= 1e5 ? Math.round(v / 5e3) * 5e3 : Math.round(v / 1e3) * 1e3),
  valueText: (v) => gbp(v),
  onChange: (v) => paintSale(v),
});
function paintSale(v) {
  const price = { amount: Math.round(v * 100), currency: "GBP" };
  const f = successFee(price);
  const bp = buyerPremium(price);
  $('[data-out="sale"]').textContent = gbp(v);
  /* cells round down to whole percentages and the remainder goes to the creator, never to the fee */
  const total = Math.floor(f.effectiveRateBps / 100);
  const parts = f.minimumApplied ? [{ i: 0, exact: total }] : f.slices.map((s, i) => ({ i, exact: (s.fee / price.amount) * 100 }));
  let cells = parts.map((p) => ({ i: p.i, cells: Math.floor(p.exact), rem: p.exact - Math.floor(p.exact) }));
  let left = total - cells.reduce((a, x) => a + x.cells, 0);
  for (const x of [...cells].sort((a, b) => b.rem - a.rem)) { if (left <= 0) break; x.cells++; left--; }
  cells = cells.filter((x) => x.cells > 0);
  saleModel = { you: 100 - total, tiers: cells };
  saleF.settle();
  const tierWords = f.minimumApplied ? "the minimum" : cells.map((t) => `${f.slices[t.i].rateBps / 100}%`).join(", ");
  $("[data-sale-field]").setAttribute("aria-label", `A hundred cells, the whole sale price of ${gbp(v)}. ${100 - total} cells in blue go to you; ${total} in dots are Orbe's fee, by tier (${tierWords}).`);
  $("[data-sale-cap]").textContent = f.minimumApplied
    ? `The sale price, in a hundred cells: ${100 - total} in blue go to you. Below the tiers, the £4,000 minimum applies.`
    : `The sale price, in a hundred cells: ${100 - total} in blue go to you; each tier keeps only its own slice, denser for the higher rate.`;
  $("[data-tiers]").innerHTML = f.slices.map((s, i) => `<li><i class="d${i}" aria-hidden="true"></i>${gbpC((s.to - s.from) / 100)} at ${s.rateBps / 100}% = ${formatMoney({ amount: s.fee, currency: "GBP" })}</li>`).join("");
  const net = price.amount - f.fee.amount;
  $("[data-sale-sums]").innerHTML = `
    <div><dt>Seller fee${f.minimumApplied ? ", the £4,000 minimum" : ""}, ${(f.effectiveRateBps / 100).toFixed(2)}%</dt><dd>${formatMoney(f.fee)}</dd></div>
    <div class="tot"><dt>You keep</dt><dd>${formatMoney({ amount: net, currency: "GBP" })}</dd></div>
    <div><dt>Buyer's premium${bp.minimumApplied ? ", the £1,000 minimum" : ""}, ${(bp.effectiveRateBps / 100).toFixed(2)}%, paid by the buyer</dt><dd>${formatMoney(bp.fee)}</dd></div>
    <div><dt>If it doesn't sell</dt><dd>£0</dd></div>`;
}
spon.set(10000);
sale.set(250000);

/* ---------- the second door: every example, rated live, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  return `<tr><td>${esc(span)}<small>${esc(unit)}, ${esc(x.label.toLowerCase())}</small></td><td>${esc(x.name)}<small>${esc(x.handle)}</small></td><td class="num"><b>${esc(x.signed)}</b><small>${esc(x.band)}</small></td></tr>`;
}).join("");

setKind("channel");

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(S.kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  const btn = $("[data-copy]");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    out.textContent = "Paste it under your next post.";
  } catch { out.textContent = text; }
  clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy the line"; }, 1800);
});

/* ---------- reserving a handle ---------- */
for (const k of $$("[data-kind]")) k.addEventListener("change", () => requestAnimationFrame(() => setTimeout(() => setKind(k.value), 0)));
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]");
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid");
    input.value = h;
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
  $("[data-handle]", form).addEventListener("input", (ev) => ev.target.removeAttribute("aria-invalid"));
}

/* ---------- motion: the hero fills once; each piece below plays once on entering view ---------- */
fitHist(); fitStrip();
const playHero = () => {
  const order = ORDER100.slice(0, heroBeat + 1);
  /* 600ms after first paint, the fill rises over 900ms, linear by rank: the fill is the data */
  hero.play([{ order, delay: 600, duration: 330, stagger: (900 - 330) / order.length, easing: linear }]);
};
/* the money moves to you first; the fee settles 300ms after */
const playFee = (piece, m) => piece.play([{ order: ALL100.slice(0, m.you), stagger: 4 }, { order: ALL100.slice(m.you), stagger: 30, delay: m.you * 4 + 300 }]);
const plays = new Map([
  [$(".beat-fig"), () => beat.play([{ order: ORDER100.slice(0, beatN + 1) }])],
  [$(".histwrap"), () => { const order = []; for (let i = 0; i < 100; i++) { const c = histCols.findIndex((col) => col.includes(i)); order.push([c, HROWS - 1 - histCols[c].indexOf(i)]); } hist.play([{ order, stagger: 5 }]); }],
  [$("[data-yard]"), (el) => el.classList.add("run")],
  [$(".pixwrap"), () => { const order = []; for (let c = 0; c < PIX_COLS; c++) for (let r = 0; r < 7; r++) if (pixMap.has(`${c},${r}`)) order.push([c, r]); pix.play([{ order, stagger: 8 }]); }],
  [$(".stripwrap"), () => { const order = []; stripCols.forEach((col, c) => { for (let j = 1; j <= col.up; j++) order.push([c, UP - j]); for (let j = 0; j < col.down; j++) order.push([c, UP + j]); }); strip.play([{ order, stagger: 8 }]); }],
  [$(".qwrap"), () => { const order = []; for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (Q[r][c] !== "0") order.push([c, r]); q.play([{ order, stagger: 24 }]); }],
  [$("[data-spon-field]"), () => playFee(sponF, sponModel)],
  [$("[data-sale-field]"), () => playFee(saleF, saleModel)],
]);
if (reduce) {
  for (const [el] of plays) el.classList.add("run");
} else {
  if (document.fonts) document.fonts.ready.then(playHero); else playHero();
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { plays.get(en.target)?.(en.target); io.unobserve(en.target); }
  }, { threshold: 0.4 });
  for (const [el] of plays) io.observe(el);
}

/* ---------- resize: every piece keeps whole cells ---------- */
let rt = 0, lastW = innerWidth;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    for (const p of [hero, beat, hist, pix, strip, q, sponF, saleF]) p.relayout();
    fitHist(); fitStrip();
  }, 120);
});
