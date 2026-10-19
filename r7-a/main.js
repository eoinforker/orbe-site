/* Orbe r7-a. Every figure comes from the engine: the examples via examples.js, and every slider
   re-rates the same made-up creator with the same engine, live, as you drag. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { rate, rateWorks, fixtureSnapshot, FIXTURE_NOW, SPECS, RATING_BANDS, signed, ratingNotice } from "../assets/engine/rating/browser.js";
import { successFee, buyerPremium, TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const moving = document.documentElement.classList.contains("move");
const handleOf = (v) => cleanHandle(v).toLowerCase();
const num = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const clampScore = (n) => Math.max(1, Math.min(99, Math.round(n))); /* never "100 in 100", never "0 in 100" */
const compact = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));
const gbp = (p) => formatMoney({ amount: Math.round(p * 100), currency: "GBP" });
const gbpC = (p) => "£" + compact(p);

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: moving });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- giant type, split into words that stamp in ---------- */
for (const h of $$("[data-words]")) {
  let i = 0;
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) { frag.append(part); return; }
          const s = document.createElement("span");
          s.className = "w"; s.style.setProperty("--i", i++); s.textContent = part;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("vh")) {
        if (n.classList.contains("dot")) { n.classList.add("w"); n.style.setProperty("--i", i++); }
        else walk(n);
      }
    }
  };
  walk(h);
}

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

/* ---------- sliders: log scales, snap ticks, chunky square thumbs ---------- */
/* A slider runs 0..1000 over a log range; near a tick it snaps to it. */
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
  for (const t of [...ticks].sort((a, b) => (b.l === "Now") - (a.l === "Now"))) if (labelled.every((u) => Math.abs(sc.toPos(u.v) - sc.toPos(t.v)) >= 110)) labelled.push(t);
  tickEl.innerHTML = ticks.map((t) => `<span class="${t.l === "Now" ? "now" : ""}" style="left:${sc.toPos(t.v) / 10}%"><i></i>${labelled.includes(t) ? t.l : ""}</span>`).join("");
  const ctl = input.closest(".ctl");
  let value = initial;
  const set = (v, from) => {
    value = v;
    if (from !== "input") input.value = String(sc.toPos(v));
    input.style.setProperty("--p", `${input.value / 10}%`);
    input.setAttribute("aria-valuetext", valueText(v));
    if (fast) fast(v);
    /* the thumb and readout move this frame; the engine re-rates after the frame paints, once per frame */
    if (from === "input" && heavy) {
      if (!pending) requestAnimationFrame(() => setTimeout(() => { const x = pending; pending = null; onChange(x); }, 0));
      pending = v;
    } else onChange(v);
  };
  let pending = null;
  input.addEventListener("input", () => {
    const p = +input.value;
    let v = sc.toVal(p);
    const near = ticks.find((t) => Math.abs(sc.toPos(t.v) - p) <= SNAP);
    if (near) { v = near.v; if (input.value !== String(sc.toPos(v))) input.value = String(sc.toPos(v)); ctl.classList.remove("snap"); void ctl.offsetWidth; ctl.classList.add("snap"); }
    set(nice(v), "input");
  });
  input.setAttribute("aria-label", label);
  /* Touch: the page keeps scrolling. The track only takes horizontal drags (touch-action: pan-y),
     so a vertical swipe scrolls as normal and never moves a value. Keyboard stays on the native input. */
  const wrap = document.createElement("div");
  wrap.className = "slider-wrap";
  input.before(wrap); wrap.append(input);
  const fromX = (x) => {
    const r = input.getBoundingClientRect();
    const tw = parseFloat(getComputedStyle(input.closest(".ctl")).getPropertyValue("--tw")) || 44;
    const f = Math.max(0, Math.min(1, (x - r.left - tw / 2) / (r.width - tw)));
    input.value = String(Math.round(f * 1000));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  let drag = null;
  wrap.addEventListener("pointerdown", (ev) => {
    if (ev.button > 0) return;
    drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), moved: ev.pointerType !== "touch", vertical: false };
    input.focus({ preventScroll: true });
    if (ev.pointerType !== "touch") { wrap.setPointerCapture(ev.pointerId); fromX(ev.clientX); }
    wrap.classList.add("is-down");
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
    drag = null; wrap.classList.remove("is-down");
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

/* ---------- the hundred, as a field: one square per creator your size ---------- */
const hundredEl = $("[data-hundred]");
const heroEl = $("[data-hundred-hero]");
for (const el of [hundredEl, heroEl]) {
  let html = "";
  for (let p = 0; p < 100; p++) { const row = Math.floor(p / 10), col = p % 10; html += `<i style="--k:${(9 - row) * 10 + col}"></i>`; }
  el.innerHTML = html;
}
function drawHundred(score) {
  const s = clampScore(score);
  for (const el of [hundredEl, heroEl]) {
    [...el.children].forEach((c, p) => {
      const row = Math.floor(p / 10), col = p % 10;
      const n = (9 - row) * 10 + col; /* rank: bottom left is the lowest */
      c.className = n < s ? "b" : n === s ? "y" : "u";
    });
  }
}

/* ---------- the hundred, as the size band: the engine's prior at a hundred quantiles ---------- */
const pct = (v) => (v >= 0.1 ? Math.round(v * 100) : v >= 0.01 ? (v * 100).toFixed(1) : (v * 100).toFixed(2)) + "%";
function drawHist() {
  const k = S.kind, r = S.r, e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const median = typeof prior.median === "object" ? prior.median[r.detail.bandKey] : prior.median;
  const part = r.parts.find((p) => p.key === key);
  const own = clampScore(part.score);
  const W = 0.34, B = 7;
  const cols = Array.from({ length: 2 * B + 1 }, () => []);
  for (let i = 0; i < 100; i++) {
    const z = probit((i + 0.5) / 100);
    cols[Math.max(-B, Math.min(B, Math.round(z / W))) + B].push(i);
  }
  const hist = $("[data-hist]");
  hist.innerHTML = cols.map((c) => `<span class="col">${c.map((i) => `<i class="${i < own ? "b" : i === own ? "y" : "u"}" style="--k:${i}"></i>`).join("")}</span>`).join("")
    + `<span class="zero" style="left:50%"><b>Typical</b></span>`;
  const fmt = key === "reach" ? pct : (v) => (v * 1000).toFixed(2);
  const lowV = median * Math.exp(prior.sigma * -B * W), highV = median * Math.exp(prior.sigma * B * W);
  $("[data-axis]").innerHTML = `<span>${fmt(lowV)}</span><span>${fmt(median)}</span><span>${fmt(highV)}</span>`;
  hist.setAttribute("aria-label", `A hundred ${e.peers} with ${r.sizeBand} ${spec.audienceNoun}, spread around the engine's typical. ${e.name} beats ${own} of them.`);
  const unit = key === "reach" ? `${part.name.toLowerCase()}, as a share of ${spec.audienceNoun}` : `new paying subscribers per 1,000 recipients`;
  $("[data-hist-cap]").textContent = `Each square is one of a hundred ${e.peers} with ${r.sizeBand} ${spec.audienceNoun}, placed by ${unit}. Ember is ${e.name}.`;
}

/* ---------- the rating on its scale: five bands, hard edges, one marker ---------- */
const scaleEl = $("[data-scale]");
const LO = -3, HI = 3;
const xOf = (v) => ((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * 100;
(function buildScale() {
  const edges = [LO, -2, -0.8, 0.8, 2, HI];
  const names = [...BANDS];
  scaleEl.innerHTML = names.map((n, i) => `<span class="sb sb-${i}" style="left:${xOf(edges[i])}%;width:${xOf(edges[i + 1]) - xOf(edges[i])}%"><b>${n}</b></span>`).join("")
    + [[-2, "−2"], [-0.8, "−0.8"], [0, "0"], [0.8, "+0.8"], [2, "+2"]].map(([v, l]) => `<span class="st" style="left:${xOf(v)}%">${l}</span>`).join("")
    + `<span class="mk" data-mk></span>`;
})();
const bandOf = (v) => RATING_BANDS.find((b) => (b.atLeast !== undefined ? v >= b.atLeast : b.above !== undefined ? v > b.above : true)).band;

/* ---------- three yardsticks, as three bars ---------- */
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
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}`;
  $("[data-yard]").setAttribute("aria-label", `One ${e.word}'s ${what}, against ${list.length} sizes of ${e.peers}`);
  $("[data-yard]").innerHTML = list.map(([row, m]) => `<li class="${m ? "mine" : banded ? "wrong" : ""}">
    <span class="y-vs">${m ? `Its size, ${row.label}` : row.label}<small>${say(beats(row), m || !banded)}${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</small></span>
    <span class="y-bar"><i style="width:${beats(row)}%"></i></span>
    <b class="y-n">${beats(row)}</b>
  </li>`).join("");
  $("[data-yard-why]").innerHTML = !banded
    ? `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`
    : list.length === 3
      ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
      : `Against ${mine === first ? "the giants" : "small " + e.peers}, ${VERDICT[say(beats(mine === first ? last : first))]}. <b>Not fair either.</b>`;
}

/* ---------- the rating, in squares ---------- */
const GLYPH = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "+": ["000", "000", "010", "111", "010", "000", "000"], "-": ["000", "000", "000", "111", "000", "000", "000"], ".": ["0", "0", "0", "0", "0", "0", "1"],
};
function drawPixnum(text) {
  let k = 0;
  $("[data-pixnum]").innerHTML = [...text.replace("−", "-")].map((ch) => {
    const g = GLYPH[ch]; if (!g) return "";
    return `<span class="g" style="--cols:${g[0].length}">${g.flatMap((r) => [...r]).map((b) => `<i class="${b === "1" ? "on" : ""}" style="--k:${b === "1" ? k++ : 0}"></i>`).join("")}</span>`;
  }).join("");
}

/* ---------- the last twelve, against its own typical: a pixel strip chart ---------- */
const WORKS_CACHE = {};
function drawStrip() {
  const k = S.kind, e = example(k);
  const works = (WORKS_CACHE[k] ??= rateWorks(baseSnap(k), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse());
  const U = 4; /* squares per doubling */
  const cols = works.map((w) => {
    const raw = Math.round(Math.log2(w.multiple) * U);
    const n = Math.max(-5, Math.min(10, raw === 0 ? (w.multiple >= 1 ? 1 : -1) : raw));
    const up = n > 0 ? n : 0, down = n < 0 ? -n : 0;
    const cls = w.multiple >= 2 ? "hit" : w.multiple >= 1 ? "up" : "down";
    return `<span class="sc ${cls}"><span class="sc-up">${"<i></i>".repeat(up)}</span><span class="sc-dn">${"<i></i>".repeat(down)}</span><b>${w.multiple.toFixed(1)}×</b></span>`;
  });
  const strip = $("[data-strip]");
  strip.innerHTML = cols.join("") + `<span class="sc-line"></span>`;
  const hits = works.filter((w) => w.multiple >= 2).length, above = works.filter((w) => w.multiple >= 1).length;
  strip.setAttribute("aria-label", `${e.name}'s last ${works.length} ${WORKS[k]} against its own typical: ${above} at or above it, ${hits} at twice it or better.`);
  $("[data-strip-cap]").textContent = `Each column is one ${WORK[k]}, oldest first. The black line is its own typical; four squares is double it. Ember did twice it or better: ${hits} of ${works.length}.`;
}

/* ---------- arrival: snap things in once, when they reach the screen ---------- */
const seen = new Set();
function pop(el) { if (!moving || !seen.has(el)) return; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); }

/* ---------- everything that reads the live rating ---------- */
let said = "";
function paint({ structural = false } = {}) {
  const k = S.kind, r = S.r, e = example(k);
  const spec = SPECS[e.platform];
  const lead = r.parts.find((p) => p.key === leadKey(k));
  const beat = clampScore(lead.score);
  $("[data-beat-n]").textContent = String(beat);
  $("[data-beat-cap]").textContent = String(beat);
  const isOwn = r.sizeBand === e.sizeBand.replace(/ \D+$/, "");
  $("[data-size-say]").innerHTML = isOwn ? "your&nbsp;size" : `with ${r.sizeBand}`;
  hundredEl.setAttribute("aria-label", `A hundred ${e.peers} with ${r.sizeBand} ${spec.audienceNoun}, one square each. ${e.name} beats ${beat} of them.`);
  drawHundred(lead.score);
  /* outputs */
  const sg = signed(r.rating);
  for (const el of $$('[data-out="signed"]')) el.textContent = sg;
  for (const el of $$('[data-out="band"]')) el.textContent = r.band;
  $('[data-out="size"]').textContent = num.format(S.audience);
  $('[data-out="sizeBand"]').textContent = `${r.sizeBand} ${spec.audienceNoun}`;
  const reach = r.detail.parts.find((p) => p.key === "reach");
  $('[data-out="reach"]').textContent = num.format(reach.measured * S.audience);
  $('[data-out="share"]').textContent = `${pct(reach.measured)} of ${spec.audienceNoun}`;
  $("[data-mk]").style.left = `${xOf(r.rating)}%`;
  for (const [i, n] of BANDS.entries()) $(`.sb-${i}`).classList.toggle("is", n === r.band);
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"] : e.parts.map((p) => p.key);
  $("[data-parts]").innerHTML = parts.map((key) => r.parts.find((p) => p.key === key)).filter(Boolean)
    .map((p) => `<li><b>${clampScore(p.score)}</b><span>${p.name}<small>${p.value}</small></span><span class="p-bar"><i style="width:${clampScore(p.score)}%"></i></span></li>`).join("");
  drawHist();
  drawYard();
  drawPixnum(sg);
  said = `My ${e.word} is rated ${sg}, ${r.band}, against ${e.peers} my size.`;
  $("[data-said]").textContent = `“${said}”`;
  if (structural) for (const el of $$(".hundred-fig, .hist, .pixnum, .strip")) pop(el);
}

/* ---------- the sliders ---------- */
let size, reach;
function bindRatingSliders() {
  const k = S.kind, e = example(k), spec = SPECS[e.platform];
  const bands = spec.sizeBands;
  const lo = Math.max(500, bands[1].min / 10), hi = bands[bands.length - 1].min * 4;
  size = bindSlider("size", {
    lo, hi, initial: MADE_UP[k].o.audience, label: `${spec.audienceNoun} for ${e.name}`,
    ticks: [...bands.slice(1).map((b) => ({ v: b.min, l: compact(b.min) })), { v: MADE_UP[k].o.audience, l: "Now", own: true }],
    nice: (v) => (v >= 1e6 ? Math.round(v / 1e4) * 1e4 : v >= 1e4 ? Math.round(v / 1e3) * 1e3 : Math.round(v / 10) * 10),
    valueText: (v) => `${num.format(v)} ${spec.audienceNoun}`,
    heavy: true, fast: (v) => { $('[data-out="size"]').textContent = num.format(v); },
    onChange: (v) => { S.audience = v; rerate(); paint(); },
  });
  reach = bindSlider("reach", {
    lo: 0.1, hi: 10, initial: 1, label: `How many people a typical ${WORK[k]} reaches`,
    ticks: [{ v: 0.25, l: "÷4" }, { v: 0.5, l: "÷2" }, { v: 1, l: "Now" }, { v: 2, l: "×2" }, { v: 4, l: "×4" }],
    valueText: (v) => `${num.format((baseReach() * v))} ${COUNT_NOUN[k]}`,
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
  else reach.set(1);
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
function setKind(k, { replay = true } = {}) {
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
  size.set(S.audience); reach.set(1);
  drawStrip();
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
  if (replay) paint({ structural: true });
  if (S.r.rating !== e.rating) console.warn("r7-a: slider model drifted from examples.js", k, S.r.rating, e.rating);
}
tray.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (!b) return;
  for (const x of $$("[data-tk]")) x.setAttribute("aria-pressed", String(x === b));
  requestAnimationFrame(() => setTimeout(() => setKind(b.dataset.tk), 0));
});

/* ---------- money: the fee engine, live ---------- */
let who = "network";
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
  $('[data-out="spon"]').textContent = gbp(v);
  const total = v + fee;
  $("[data-spon-stack]").innerHTML = `<span class="sk sk-you" style="width:${(v / total) * 100}%"><b>To you</b></span><span class="sk sk-fee" style="width:${(fee / total) * 100}%"><b>${bps / 100}%</b></span>`;
  $("[data-spon-sums]").innerHTML = `<div><dt>You receive</dt><dd>${gbp(v)}</dd></div><div><dt>Orbe's ${bps / 100}%, paid by the brand</dt><dd>${gbp(fee)}</dd></div><div class="tot"><dt>The brand pays</dt><dd>${gbp(total)}</dd></div>`;
}
for (const b of $$("[data-who]")) b.addEventListener("click", () => {
  who = b.dataset.who;
  for (const x of $$("[data-who]")) x.setAttribute("aria-checked", String(x === b));
  paintSpon(spon.get());
});

const sale = bindSlider("sale", {
  lo: 20000, hi: 20000000, initial: 250000, label: "Sale price in pounds",
  ticks: [{ v: 50000, l: "£50k" }, { v: 500000, l: "£500k" }, { v: 2000000, l: "£2M" }, { v: 10000000, l: "£10M" }],
  nice: (v) => (v >= 1e6 ? Math.round(v / 5e4) * 5e4 : v >= 1e5 ? Math.round(v / 5e3) * 5e3 : Math.round(v / 1e3) * 1e3),
  valueText: (v) => gbp(v),
  onChange: (v) => paintSale(v),
});
const TIER_C = ["t8", "t5", "t3"];
function paintSale(v) {
  const price = { amount: Math.round(v * 100), currency: "GBP" };
  const f = successFee(price);
  const bp = buyerPremium(price);
  $('[data-out="sale"]').textContent = gbp(v);
  /* the price, split into the tiers it falls in; each slice says what it costs */
  $("[data-tiers]").innerHTML = `<p class="tier-h mono">The price, by tier</p><div class="tier-bar">${f.slices.map((s, i) => {
    const w = ((s.to - s.from) / price.amount) * 100;
    return `<span class="tb ${TIER_C[i]}" style="width:${w}%"><b>${s.rateBps / 100}%</b></span>`;
  }).join("")}</div><ul class="tier-list mono">${f.slices.map((s, i) => `<li><i class="${TIER_C[i]}"></i>${gbpC((s.to - s.from) / 100)} at ${s.rateBps / 100}% = ${formatMoney({ amount: s.fee, currency: "GBP" })}</li>`).join("")}</ul>`;
  const net = price.amount - f.fee.amount;
  $("[data-sale-sums]").innerHTML = `
    <div class="${f.minimumApplied ? "flag" : ""}"><dt>Seller fee${f.minimumApplied ? ", the £4,000 minimum" : ""}</dt><dd>${formatMoney(f.fee)} <small>${(f.effectiveRateBps / 100).toFixed(2)}%</small></dd></div>
    <div><dt>You keep</dt><dd>${formatMoney({ amount: net, currency: "GBP" })}</dd></div>
    <div class="${bp.minimumApplied ? "flag" : ""}"><dt>Buyer's premium${bp.minimumApplied ? ", the £1,000 minimum" : ""}, paid by the buyer</dt><dd>${formatMoney(bp.fee)} <small>${(bp.effectiveRateBps / 100).toFixed(2)}%</small></dd></div>
    <div class="tot"><dt>If it doesn't sell</dt><dd>£0</dd></div>`;
}
spon.set(10000);
sale.set(250000);

/* ---------- the unknown: your hundred is a question mark ---------- */
const Q = ["0001111000", "0011001100", "0110000110", "0000000110", "0000001100", "0000011000", "0000110000", "0000110000", "0000000000", "0000110000"];
$("[data-qfield]").innerHTML = Q.flatMap((r, y) => [...r].map((b, x) => `<i class="${b === "1" ? "q" + (y === 9 ? " qd" : "") : ""}" style="--k:${y * 10 + x}"></i>`)).join("");

/* ---------- scattered squares, the same every visit ---------- */
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const s of $$("[data-scatter]")) {
  let h = "";
  for (let i = 0; i < 7 * Math.ceil(+s.dataset.scatter / 3); i++) h += `<i class="${rnd() < 0.42 ? "" : "o"}" style="--k:${i * 4}"></i>`;
  s.innerHTML = h;
}

/* ---------- the second door: every example, rated live, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k, i) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  return `<li><span class="rl-s">${span}<small>${unit}, ${x.label.toLowerCase()}</small></span><b class="rl-r">${x.signed}<small>${x.band}</small></b>
    <span class="rl-bar" aria-hidden="true"><i class="${x.rating < 0 ? "neg" : ""}" style="--v:${(xOf(Math.abs(x.rating)) - 50) / 50};--k:${i}"></i></span>
    <span class="rl-n">${x.name}, ${x.handle}</span></li>`;
}).join("");

setKind("channel", { replay: false });
paint();

/* ---------- arrival ---------- */
const targets = [...$$("[data-words]"), ...$$(".scatter"), $(".hundred-fig"), heroEl, $(".hist"), $(".pixnum"), $(".strip"), $("[data-qfield]"), $(".roll"), $(".tiers"), $("[data-yard]")];
function arrive(el) { if (seen.has(el)) return; seen.add(el); el.classList.add("on"); }
if (moving && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) { arrive(en.target); io.unobserve(en.target); } }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
  for (const t of targets) io.observe(t);
} else for (const t of targets) arrive(t);

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(S.kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  const btn = $("[data-copy]");
  btn.textContent = "Copying";
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    out.textContent = "Paste it under your next post.";
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy the line"; }, 1800);
  } catch { btn.textContent = "Copy the line"; out.textContent = text; }
});

/* ---------- reserving a handle: one handle and one kind, everywhere ---------- */
const handles = $$("[data-handle]");
const mirrors = $$("[data-mirror]");
function syncHandles(src) {
  for (const h of handles) if (h !== src) h.value = src.value;
  const h = handleOf(src.value);
  for (const m of mirrors) m.textContent = h || "yourhandle";
}
for (const h of handles) h.addEventListener("input", () => { syncHandles(h); for (const x of handles) x.removeAttribute("aria-invalid"); });
for (const k of $$("[data-kind]")) k.addEventListener("change", () => requestAnimationFrame(() => setTimeout(() => setKind(k.value), 0)));
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid"); note.classList.remove("is-error");
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
