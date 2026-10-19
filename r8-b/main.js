/* Orbe r8-b, Orbe OS. Every figure on the page comes from the engine at runtime. */
import { example, benchmark, ORDER, EXAMPLE_LINE, BENCHMARK_LINE, mathsFor } from "../assets/r5/examples.js";
import { rate, rateWorks, explain, fixtureSnapshot, FIXTURE_NOW, SPECS, signed, ratingNotice } from "../assets/engine/rating/browser.js";
import { successFee, buyerPremium, TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { suspiciousCreator } from "../assets/engine/record/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField, spread, drawBlock, rng, mix, lerp } from "../fx/halftone.js";
import { drawOrb, riseOrb } from "./orb.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const moving = root.classList.contains("move");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const gbp = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" });
const compact = (p) => (p >= 1e6 ? `£${+(p / 1e6).toFixed(p >= 1e7 ? 0 : 1)}M` : p >= 1e3 ? `£${+(p / 1e3).toFixed(0)}k` : `£${p}`);
const pctOf = (bps) => `${+(bps / 100).toFixed(2)}%`;
const clampScore = (n) => Math.max(1, Math.min(99, Math.round(n)));
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const C = { ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", linen: "#E7E2D7", graphite: "#5D584F", stone: "#A29E95", ember: "#FF5A1F" };
const accent = () => css("--accent") || "#1F4BFF";
const tint = () => css("--field") || "#9EE9FB";
const tint2 = () => css("--field-tint") || "#D6F6FD";
const desk = () => innerWidth >= 1280;
const pitchBig = () => (innerWidth >= 768 ? 8 : 6);

/* ---------- maths: the normal curve the engine's priors use ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* ---------- the made-up creators, as examples.js builds them, so rating.app can re-rate a changed copy ---------- */
const MADE_UP = {
  channel: { kind: "youtube", title: "Field Recordings", o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 } },
  newsletter: { kind: "substack", title: "Margin Notes", o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 } },
  stream: { kind: "twitch", title: "Night Shift", o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 } },
  podcast: { kind: "podcast", title: "The Long Table", o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 } },
  portfolio: { kind: "photography", title: "Low Tide Prints", o: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 } },
};
const COUNT_NOUN = { channel: "views", newsletter: "opens", stream: "viewers", podcast: "downloads", portfolio: "views" };
const WORK = { channel: "upload", newsletter: "issue", stream: "stream", podcast: "episode", portfolio: "photo set" };
const PICK = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photography" };
const NUMWORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");

const BASE = {};
function baseSnap(k) {
  if (BASE[k]) return BASE[k];
  const m = MADE_UP[k];
  const s = fixtureSnapshot({ kind: m.kind, noise: 0.25, ...m.o, title: m.title });
  s.account.handle = example(k).handle;
  return (BASE[k] = s);
}
/* The same works with every volume scaled by `scale` (rates and the mailing list stay put). */
function snapAt(k, scale) {
  const s = baseSnap(k);
  if (scale === 1) return s;
  const spec = SPECS[s.account.kind];
  const vol = new Set(spec.metrics.filter((m) => m.unit !== "ratio" && m.key !== "recipients").map((m) => m.key));
  return { ...s, works: s.works.map((w) => ({ ...w, metrics: Object.fromEntries(Object.entries(w.metrics).map(([key, v]) => [key, vol.has(key) ? v * scale : v])) })) };
}
function firstSentence(text, key) {
  const ss = text.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [text];
  const hit = ss.find((x) => (key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}

/* ================================================================ orbs */
const orbState = new Map(); /* canvas -> { fill, pitch } */
function orb(cv, fill, pitch, { rise = false, delay = 0 } = {}) {
  if (!cv) return;
  orbState.set(cv, { fill, pitch });
  const o = { fill, pitch, ink: accent(), rim: C.ink };
  if (rise && moving) riseOrb(cv, o, { ms: 900, delay });
  else drawOrb(cv, o);
}
function redrawOrbs() { for (const [cv, s] of orbState) drawOrb(cv, { ...s, ink: accent(), rim: C.ink }); }

/* ================================================================ the bell row: twelve cells, -3 to +3, density from the normal */
const bells = new Map(); /* canvas -> { field, rating } */
function bellLook(cv) {
  return (c) => {
    const b = bells.get(cv);
    const z = -3 + (c + 0.5) * 0.5;
    const mine = b && b.rating != null && Math.max(0, Math.min(11, Math.floor((b.rating + 3) / 0.5))) === c;
    if (mine) return { base: accent(), ink: accent(), from: 1, to: 1 };
    const d = 0.86 * Math.exp(-(z * z) / 2);
    return { base: C.chalk, ink: C.ink, pitch: Math.max(4, (b?.field?.cell ?? 24) * 0.14), angle: 45, dir: 270, from: d, to: d * 0.45 };
  };
}
function makeBell(cv) {
  if (!cv) return;
  const b = { rating: 0, field: null };
  bells.set(cv, b);
  b.field = createField(cv, { cols: 12, rows: 1, look: bellLook(cv) });
  const wrap = cv.closest("[data-bell-wrap]");
  const fit = () => {
    const w = cv.style.width;
    wrap.style.setProperty("--fw", w);
    const axis = wrap.nextElementSibling;
    if (axis && axis.matches("[data-axis]")) axis.style.setProperty("--fw", w);
    placeLine(cv);
  };
  new ResizeObserver(fit).observe(cv);
  fit();
}
function setBell(cv, rating) { const b = bells.get(cv); if (!b) return; b.rating = rating; b.field.draw(); placeLine(cv); }
/* the hero's one line draw: from zero to the creator's cell, 900ms linear, starting at 1s */
function placeLine(cv) {
  const line = cv.parentElement.querySelector("[data-bell-line]");
  const b = bells.get(cv);
  if (!line || !b) return;
  const cell = b.field.cell;
  const mineC = Math.max(0, Math.min(11, Math.floor((b.rating + 3) / 0.5)));
  const zeroX = 6 * cell;
  const endX = b.rating >= 0 ? (mineC + 1) * cell : mineC * cell;
  line.style.setProperty("--x0", `${Math.min(zeroX, endX)}px`);
  line.style.setProperty("--w", `${Math.abs(endX - zeroX)}px`);
  line.style.transformOrigin = b.rating >= 0 ? "left center" : "right center";
}

/* ================================================================ state */
const S = { kind: "channel", scale: 1, r: null, seen: new Set() };
let said = "";

/* ================================================================ the picker */
const picker = $("[data-picker]");
picker.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="${k === "channel"}"><canvas aria-hidden="true"></canvas><span>${PICK[k]}<span class="vh">: ${esc(example(k).name)}</span></span></button>`).join("");
for (const b of $$("[data-tk]")) {
  const k = b.dataset.tk;
  const lead = example(k).result.parts.find((p) => p.key === leadKey(k));
  orb($("canvas", b), lead.score / 100, 4);
}
picker.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (!b || b.dataset.tk === S.kind) return;
  for (const x of $$("[data-tk]")) x.setAttribute("aria-pressed", String(x === b));
  requestAnimationFrame(() => setTimeout(() => setKind(b.dataset.tk), 0));
});

/* ================================================================ the yardsticks: a struck diff, from the engine's own priors */
function drawYard(k) {
  const e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const part = e.result.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = e.result.parts.find((p) => p.key === key).score;
  const bm = benchmark(k);
  const banded = typeof prior.median === "object";
  const beats = (row) => (row.key === bm.example || !banded ? own : clampScore(phi(Math.log(part.measured / prior.median[row.key]) / prior.sigma) * 100));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  const row = (cls, m, text) => `<li class="${cls}" data-m="${m}"><span class="t">${esc(text)}</span></li>`;
  const strike = banded ? "del" : "ctx";
  $("[data-diff-yard]").innerHTML = [
    row("ctx", "", `"${e.name}": {`),
    row(strike, banded ? "-" : "", `"${first.label}": ${beats(first)},`),
    row(strike, banded ? "-" : "", `"${last.label}": ${beats(last)},`),
    row("add", "+", `"${mine.label}": ${beats(mine)}`),
    row("ctx", "", "}"),
  ].join("");
  const what = part.name.toLowerCase();
  $("[data-diff-yard]").setAttribute("aria-label", banded
    ? `${part.name} for ${e.name}: against ${first.label} ${e.peers} it beats ${beats(first)} in 100, against ${last.label} ${beats(last)} in 100; neither is fair. Against its own size, ${mine.label}, it beats ${beats(mine)} in 100.`
    : `${part.name} for ${e.name} beats ${own} in 100 at every size: size does not move it.`);
  $("[data-ghost-yard]").textContent = String(own);
  $("[data-tags-yard]").innerHTML = `<li class="t-straw">${esc(part.name)}</li><li class="t-ink">${esc(mine.label)}</li><li class="t-fixed">${own} in 100</li>`;
  $("[data-yard-path]").textContent = `${key}.yardstick`;
  $("[data-yard-cap]").textContent = banded ? "two wrong sizes struck out, its own size in blue." : "size does not move it, so every row is the same.";
  const verdict = (n) => (n >= 97 ? "a genius" : n >= 75 ? "great" : n >= 45 ? "ordinary" : "weak");
  $("[data-yard-why]").textContent = banded
    ? `Against small ${e.peers}, ${verdict(beats(first))}. Against the giants, ${verdict(beats(last))}.`
    : `Size does not move ${what}.`;
  $("[data-yard-h]").innerHTML = banded ? "Neither<br> is fair." : "Every<br> yardstick<br> is fair here.";
}

/* ================================================================ the field: beats N in 100 */
const COLS = 10, ROWS = 10;
const fieldCv = $("[data-field]");
let fieldLookMap = new Map(), fieldOrder = [], fieldRun = null, field = null;
const DIRS = [45, 135, 315, 225, 90, 0];
function fieldLook(c, r, p) {
  const L = fieldLookMap.get(c + "," + r);
  const cell = field ? field.cell : 36;
  if (!L) return { base: C.chalk, ink: C.ink, from: 0, to: 0 };
  const idle = { base: C.chalk, ink: C.ink, pitch: cell * L.pitchK, angle: 45, dir: L.dir, from: L.kind === "ahead" ? 0.42 : 0.16, to: 0.02 };
  if (L.kind === "ahead" || p <= 0) return idle;
  const A = accent(), T = tint(), T2 = tint2();
  const f = L.kind === "you" ? { base: C.ember, ink: C.ember, from: 1, to: 1 }
    : L.depth < 0.52 ? { base: A, ink: A, from: 1, to: 1 }
    : L.depth < 0.8 ? { base: T, ink: A, from: 0.92, to: lerp(0.5, 0.2, (L.depth - 0.52) / 0.28) }
    : { base: T2, ink: A, from: 0.55, to: 0.04 };
  if (p >= 1) return { ...f, pitch: idle.pitch, angle: 45, dir: L.dir };
  const q = Math.min(1, p * 2), w = Math.max(0, p * 2 - 1);
  return {
    base: mix(C.chalk, f.base === f.ink ? (L.kind === "you" ? C.ember : T) : f.base, q),
    ink: mix(C.ink, f.ink, q), pitch: idle.pitch, angle: 45, dir: L.dir,
    from: lerp(idle.from * (1 - q), f.from, w), to: lerp(idle.to * (1 - q), f.to, w),
  };
}
function buildField(k) {
  const e = example(k);
  const lead = e.result.parts.find((p) => p.key === leadKey(k));
  const beaten = clampScore(lead.score);
  const rand = rng(93);
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r, d: Math.hypot(c, ROWS - 1 - r) + rand() * 1.6 });
  cells.sort((a, b) => a.d - b.d);
  fieldLookMap = new Map();
  cells.forEach((cell, i) => {
    const pitchK = [0.1, 0.085, 0.12][Math.floor(rand() * 3)];
    const dir = DIRS[Math.floor(rand() * DIRS.length)];
    const kind = i < beaten ? "beaten" : i === beaten ? "you" : "ahead";
    fieldLookMap.set(cell.c + "," + cell.r, { kind, depth: beaten > 1 ? i / (beaten - 1) : 0, pitchK, dir });
  });
  fieldOrder = cells.slice(0, beaten + 1).map((x) => [x.c, x.r]);
  fieldCv.setAttribute("aria-label", `A field of 100 cells, one for every 100 ${e.peers} its size. ${beaten} fill in blue, one for each it beats; one orange cell is ${e.name}; ${99 - beaten} are ahead.`);
  $("[data-field-cap]").innerHTML = `Beats ${beaten} in 100: <span>blue spreads through the ${esc(e.peers)} its size, and stops at ${esc(e.name)}.</span>`;
  $("[data-field-note]").textContent = `${e.name}, ${e.sizeBand}. ${lead.name}: ${lead.value}.`;
  $("[data-field-path]").textContent = leadKey(k);
}
function playField(animate) {
  if (fieldRun) fieldRun.cancel();
  field.setAll(0);
  if (!animate || !moving) { for (const [c, r] of fieldOrder) field.set(c, r, 1); return; }
  fieldRun = spread(field, { order: fieldOrder, to: 1, duration: 620, stagger: 17, easing: (t) => t, reduce: !moving });
}

/* ================================================================ the payout diff, from the record engine */
(function drawPay() {
  const nova = suspiciousCreator();
  const month = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
  const ads = nova.revenue.filter((l) => l.month === month && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source === "adsense");
  const monthName = new Date(month).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const ratio = est.gross.amount / paid.gross.amount;
  const row = (cls, m, text) => `<li class="${cls}" data-m="${m}"><span class="t">${esc(text)}</span></li>`;
  $("[data-diff-pay]").innerHTML = [
    row("ctx", "", `"ads, ${monthName}": {`),
    row("del", "-", `"estimate": "${gbp(est.gross.amount)}",`),
    row("add", "+", `"paid_out": "${gbp(paid.gross.amount)}",`),
    row("ctx", "", `"source": "AdSense"`),
    row("ctx", "", "}"),
  ].join("");
  $("[data-diff-pay]").setAttribute("aria-label", `Ad revenue for ${monthName}: YouTube's estimate of ${gbp(est.gross.amount)} is struck out; the AdSense payout of ${gbp(paid.gross.amount)} is the figure on the record.`);
  $("[data-ghost-pay]").textContent = `${ratio.toFixed(1)}×`;
  $("[data-tags-pay]").innerHTML = `<li class="t-straw">${esc(monthName)}</li><li class="t-ink">AdSense</li><li class="t-fixed">Paid out</li>`;
  const name = (nova.accounts.find((a) => a.kind === "youtube")?.title ?? "Nova Plays").replace(/\s*\(fixture\)/, "");
  $("[data-pay-note]").textContent = `${name}, a made-up channel from the record engine: YouTube's estimate ran ${ratio.toFixed(1)} times what AdSense paid.`;
})();
const blocks = () => { for (const b of $$("[data-block]")) drawBlock(b, { base: null, ink: C.ink, pitch: 4, angle: 45, dir: 90, from: 0.62, to: 0.04 }); };

/* ================================================================ the slider: native input, log scale, the engine's own marks */
function makeLog(lo, hi) {
  const L = Math.log(lo), H = Math.log(hi);
  return { toVal: (p) => Math.exp(L + (p / 1000) * (H - L)), toPos: (v) => Math.round(((Math.log(v) - L) / (H - L)) * 1000) };
}
function bindSlider(input, { lo, hi, ticks, snap = 14, nice = (v) => v, valueText, onChange }) {
  const sc = makeLog(lo, hi);
  const tickEl = input.parentElement.querySelector("[data-ticks]");
  tickEl.innerHTML = ticks.map((t) => `<span class="${t.now ? "now" : ""}" style="left:${sc.toPos(t.v) / 10}%">${t.l}</span>`).join("");
  let value = 0, pending = false;
  const paintTrack = () => input.style.setProperty("--p", `${input.value / 10}%`);
  const set = (v, fromInput) => {
    value = v;
    if (!fromInput) input.value = String(sc.toPos(v));
    paintTrack();
    input.setAttribute("aria-valuetext", valueText(v));
    if (fromInput) {
      /* the thumb moves this frame; the engine re-rates once per frame after it paints */
      if (!pending) { pending = true; requestAnimationFrame(() => setTimeout(() => { pending = false; onChange(value); }, 0)); }
    } else onChange(v);
  };
  input.addEventListener("input", () => {
    const p = +input.value;
    let v = sc.toVal(p);
    const near = ticks.find((t) => Math.abs(sc.toPos(t.v) - p) <= snap);
    if (near) { v = near.v; input.value = String(sc.toPos(v)); }
    set(nice(v), true);
  });
  return { set, get: () => value };
}

/* ================================================================ rating.app */
const reachIn = $("[data-slider='reach']");
const BR = {};
const baseReach = (k) => (BR[k] ??= rate(baseSnap(k), FIXTURE_NOW).detail.parts.find((p) => p.key === "reach").measured * MADE_UP[k].o.audience);
const reach = bindSlider(reachIn, {
  lo: 0.1, hi: 10,
  ticks: [{ v: 0.25, l: "÷4" }, { v: 0.5, l: "÷2" }, { v: 1, l: "Now", now: true }, { v: 2, l: "×2" }, { v: 4, l: "×4" }],
  valueText: (v) => `${num.format(baseReach(S.kind) * v)} ${COUNT_NOUN[S.kind]}`,
  onChange: (v) => { S.scale = v; S.r = rate(snapAt(S.kind, v), FIXTURE_NOW); paintRating(); },
});
$("[data-reset]").addEventListener("click", () => { reach.set(1); reachIn.focus(); });

function paintRating() {
  const k = S.kind, r = S.r, e = example(k), spec = SPECS[e.platform];
  const sg = signed(r.rating);
  const pctl = clampScore(phi(r.rating) * 100);
  $("[data-out='signed']").textContent = sg;
  $("[data-out='band']").textContent = r.band;
  $("[data-out='where']").textContent = `The orb is filled to ${pctl} in 100: where ${sg} sits among ${e.peers} this size.`;
  orb($("[data-orb='rating']"), pctl / 100, pitchBig());
  setBell($("[data-bell='rating']"), r.rating);
  const rp = r.detail.parts.find((p) => p.key === "reach");
  $("[data-out='reach']").textContent = num.format(baseReach(k) * S.scale);
  $("[data-out='share']").textContent = `${(rp.measured * 100).toFixed(rp.measured >= 0.1 ? 0 : 1)}% of ${spec.audienceNoun}`;
  const lead = r.parts.find((p) => p.key === leadKey(k));
  const changed = Math.abs(S.scale - 1) > 1e-9;
  const times = S.scale >= 1 ? `${+S.scale.toFixed(2)}×` : `${+S.scale.toFixed(2)}×`;
  $("[data-out='say']").innerHTML = changed
    ? `<b>${times} the example's reach: rated ${sg}, ${esc(r.band)}.</b> ${esc(firstSentence(explain(r), lead.key))}`
    : `${esc(firstSentence(e.explain, lead.key))} Drag it and the engine rates it again.`;
  $("[data-reset]").hidden = !changed;
}

/* ================================================================ story.app: four moments, tapped through */
let mo = 0;
const moments = $$("[data-mo]");
const twelveCv = $("[data-twelve]");
let twelve = null, twelveData = [];
function twelveLook(c) {
  const w = twelveData[c];
  if (!w) return { base: C.chalk, ink: C.ink, from: 0, to: 0 };
  if (w.best) return { base: accent(), ink: accent(), from: 1, to: 1 };
  const d = Math.max(0.06, Math.min(0.9, 0.18 + Math.log2(w.multiple) * 0.35));
  return { base: C.chalk, ink: C.ink, pitch: Math.max(4, (twelve?.cell ?? 24) * 0.14), angle: 45, dir: 270, from: d, to: d * 0.4 };
}
function buildTwelve(k) {
  const works = rateWorks(baseSnap(k), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  const best = works.reduce((a, w) => (w.multiple > a.multiple ? w : a), works[0]);
  twelveData = works.map((w) => ({ multiple: w.multiple, best: w === best }));
  const e = example(k);
  const above = works.filter((w) => w.multiple >= 1).length;
  twelveCv.setAttribute("aria-label", `${e.name}'s last ${works.length} ${WORK[k]}s against its own typical: ${above} at or above it. The best did ${best.multiple.toFixed(1)} times it.`);
  if (twelve) twelve.draw();
}
function showMoment(i) {
  mo = Math.max(0, Math.min(moments.length - 1, i));
  moments.forEach((m, j) => { m.hidden = j !== mo; m.setAttribute("aria-hidden", String(j !== mo)); });
  $("[data-pos]").textContent = String(mo + 1);
  $("[data-step='-1']").disabled = mo === 0;
  $("[data-step='1']").disabled = mo === moments.length - 1;
  const cv = moments[mo].querySelector("canvas.orb");
  if (cv && !S.seen.has("mo" + mo + S.kind)) { S.seen.add("mo" + mo + S.kind); const st = orbState.get(cv); if (st) orb(cv, st.fill, st.pitch, { rise: true }); }
}
for (const b of $$("[data-step]")) b.addEventListener("click", () => {
  showMoment(mo + +b.dataset.step);
  /* a button that just became disabled hands focus to the other one, so the keyboard never drops to the page */
  if (b.disabled) $(`[data-step='${-b.dataset.step}']`).focus();
});
$("[data-screen]").addEventListener("click", (ev) => {
  if (ev.target.closest("a, button")) return;
  const r = ev.currentTarget.getBoundingClientRect();
  showMoment(mo + (ev.clientX - r.left < r.width / 3 ? -1 : 1));
});

/* ================================================================ price.calc: the engine's own fee schedule */
const saleIn = $("[data-slider='sale']");
const tierCv = $("[data-tier]");
let tier = null, tierCells = [];
function tierLook(c, r, p) {
  const k = r * 10 + c;
  const t = tierCells[k] ?? "you";
  const pitch = Math.max(4, (tier?.cell ?? 28) * 0.16);
  const idle = { base: C.chalk, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.14, to: 0.02 };
  const fin = t === "you" ? { base: tint(), ink: accent(), pitch, angle: 45, dir: [45, 135, 315, 225][(c * 7 + r * 3) % 4], from: 0.92, to: 0.5 }
    : t === 0 ? { base: C.linen, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.92, to: 0.62 }
    : t === 1 ? { base: C.linen, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.52, to: 0.3 }
    : { base: C.linen, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.26, to: 0.1 };
  if (p >= 1) return fin;
  if (p <= 0) return idle;
  return { base: mix(C.chalk, fin.base, p), ink: mix(C.ink, fin.ink, p), pitch, angle: 45, dir: 45, from: lerp(idle.from, fin.from, p), to: lerp(idle.to, fin.to, p) };
}
function paintSale(pounds) {
  const price = { amount: Math.round(pounds * 100), currency: "GBP" };
  const f = successFee(price), b = buyerPremium(price);
  $("[data-out='sale']").textContent = gbp(price.amount);
  /* whole percentages; the remainder goes to the creator, never to the fee, so the picture never overstates the fee */
  const feeCells = Math.floor((f.fee.amount / price.amount) * 100);
  let split;
  if (f.minimumApplied) split = [feeCells, 0, 0];
  else {
    const raw = f.slices.map((s) => (s.fee / f.fee.amount) * feeCells);
    split = raw.map(Math.floor);
    let left = feeCells - split.reduce((a, x) => a + x, 0);
    raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b2) => b2[0] - a[0]).forEach(([, i]) => { if (left > 0) { split[i]++; left--; } });
  }
  tierCells = Array(100 - feeCells).fill("you");
  split.forEach((n, i) => { for (let j = 0; j < n; j++) tierCells.push(i); });
  if (tier) tier.draw();
  tierCv.setAttribute("aria-label", `A hundred cells, each 1% of a ${gbp(price.amount)} sale: ${100 - feeCells} go to you, ${feeCells} are Orbe's fee.`);
  const net = price.amount - f.fee.amount;
  $("[data-sums]").innerHTML = `
    <div><dt>Seller fee${f.minimumApplied ? ", the minimum" : ""}, from the proceeds</dt><dd>${gbp(f.fee.amount)}<small>${pctOf(f.effectiveRateBps)}</small></dd></div>
    <div><dt>You keep</dt><dd>${gbp(net)}</dd></div>
    <div><dt>Buyer's premium${b.minimumApplied ? ", the minimum" : ""}, paid by the buyer</dt><dd>${gbp(b.fee.amount)}</dd></div>
    <div><dt>If it doesn't sell</dt><dd>£0</dd></div>`;
}
const sale = bindSlider(saleIn, {
  lo: 20000, hi: 20000000, snap: 12,
  ticks: [{ v: 50000, l: "£50k" }, { v: 500000, l: "£500k" }, { v: 2000000, l: "£2M" }, { v: 10000000, l: "£10M" }],
  nice: (v) => (v >= 1e6 ? Math.round(v / 5e4) * 5e4 : v >= 1e5 ? Math.round(v / 5e3) * 5e3 : Math.round(v / 1e3) * 1e3),
  valueText: (v) => gbp(v * 100),
  onChange: (v) => paintSale(v),
});

/* ================================================================ fees in words, from the engine's schedules */
(function feeWords() {
  const T = TAKE_RATE;
  const sp = T.sponsorship;
  $("[data-fee='network']").textContent = pctOf(sp.networkBps);
  $("[data-fee='direct']").textContent = pctOf(sp.directBps);
  const tiers = T.seller.tiers;
  const p = (pence) => compact(pence / 100);
  $("[data-fee='terms']").textContent = `${pctOf(tiers[0].rateBps)} up to ${p(tiers[0].upTo)}, ${pctOf(tiers[1].rateBps)} from ${p(tiers[0].upTo)} to ${p(tiers[1].upTo)}, ${pctOf(tiers[2].rateBps)} above, ${gbp(T.seller.minimum)} minimum. From the proceeds, only if it sells. Nothing if it doesn't.`;
  const bp = T.buyerPremium.tiers;
  $("[data-fee='buy']").textContent = `Free, vetted access. A ${pctOf(bp[0].rateBps)} buyer's premium at completion, ${pctOf(bp[1].rateBps)} above ${p(bp[0].upTo)}, ${gbp(T.buyerPremium.minimum)} minimum. Diligence reports included; ${gbp(T.buyers.report.standard)} only if you walk away after one, never if it shows the listing was wrong.`;
})();

/* ================================================================ the network and the terminal */
function drawNet(k) {
  const bm = benchmark(k);
  const e = example(k);
  const fmt = (v) => `${v >= 0.1 ? Math.round(v * 100) : +(v * 100).toFixed(1)}%`;
  $("[data-net-what]").textContent = `Typical reach for ${e.peers}, by size: each orb is filled to that share of ${SPECS[e.platform].audienceNoun}.`;
  $("[data-net]").innerHTML = bm.rows.map((r) => `<li class="${r.key === bm.example ? "own" : ""}"><canvas aria-hidden="true"></canvas><b>${esc(r.label)}</b><span>typical reach ${fmt(r.value)}</span></li>`).join("");
  $$("[data-net] canvas").forEach((cv, i) => orb(cv, bm.rows[i].value, 4));
  $("[data-net-line]").textContent = `${BENCHMARK_LINE} Every creator who connects replaces a baseline with consented figures.`;
}
$("[data-term]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  return `<li><span class="tn">${esc(x.name)}</span><span class="tr">${esc(x.signed)}</span><span class="ts">${esc(x.label)}, ${esc(x.sizeBand)}</span><span class="tbd">${esc(x.band)}</span></li>`;
}).join("");

/* ================================================================ binding a kind */
function setKind(k, { first = false } = {}) {
  S.kind = k; S.scale = 1;
  S.r = rate(baseSnap(k), FIXTURE_NOW);
  const e = example(k), spec = SPECS[e.platform];
  const lead = e.result.parts.find((p) => p.key === leadKey(k));
  const count = NUMWORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, name: e.name, peers: e.peers, lead: String(clampScore(lead.score)), signed: e.signed, band: e.band,
    sizeBand: e.sizeBand, partOf: `${lead.name}, one of ${count} parts.`, best: e.best, work: WORK[k], countNoun: COUNT_NOUN[k],
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), line: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];
  $("[data-said]").textContent = `“${said}”`;
  $("[data-peers-you]").textContent = e.peers;
  for (const s of $$("[data-kind]")) if (k in MADE_UP) s.value = k;
  for (const x of $$("[data-tk]")) x.setAttribute("aria-pressed", String(x.dataset.tk === k));

  /* hero, controls and story orbs */
  const fill = clampScore(lead.score) / 100;
  for (const cv of $$("[data-ctl]")) orb(cv, fill, 4);
  orb($("[data-orb='hero']"), fill, pitchBig(), { rise: first, delay: 600 });
  orb($("[data-orb='story']"), fill, pitchBig());
  setBell($("[data-bell='hero']"), e.rating);
  setBell($("[data-bell='story']"), e.rating);

  drawYard(k);
  buildField(k);
  if (field) playField(!first && S.seen.has("field"));
  buildTwelve(k);
  drawNet(k);
  reach.set(1);
  if (!first) { const copy = $("[data-copy]"); copy.textContent = "Copy the line"; $("[data-copied]").textContent = ""; }
  showMoment(mo);
  if (S.r.rating !== e.rating) console.warn("r8-b: rating.app drifted from examples.js", k, S.r.rating, e.rating);
}

/* ================================================================ start */
for (const cv of $$("[data-bell]")) makeBell(cv);
field = createField(fieldCv, { cols: COLS, rows: ROWS, look: fieldLook });
const fitField = () => $("#p-field").style.setProperty("--fw", fieldCv.style.width);
new ResizeObserver(fitField).observe(fieldCv); fitField();
twelve = createField(twelveCv, { cols: 12, rows: 1, look: twelveLook });
tier = createField(tierCv, { cols: 10, rows: 10, look: tierLook });
const fitTier = () => $("[data-tierwrap]").parentElement.style.setProperty("--fw", tierCv.style.width);
new ResizeObserver(fitTier).observe(tierCv); fitTier();

setKind("channel", { first: true });
sale.set(1200000);
showMoment(0);
orb($("[data-orb='empty']"), 0, pitchBig());
orb($("[data-orb='you']"), 0, pitchBig());
blocks();
field.setAll(0);
if (!moving) for (const [c, r] of fieldOrder) field.set(c, r, 1);

/* the hero: the orb fills once (above), and one line draws once, then nothing moves */
const heroLine = $("[data-bell-line]");
if (moving && heroLine) {
  heroLine.classList.add("wait");
  setTimeout(() => { heroLine.classList.add("draw"); heroLine.classList.remove("wait"); }, 1000);
}

/* everything below the fold explains once, on entering view */
const once = new IntersectionObserver((ents) => {
  for (const en of ents) {
    if (!en.isIntersecting) continue;
    const t = en.target;
    once.unobserve(t);
    if (t.id === "p-field") { S.seen.add("field"); playField(true); }
    else if (t.id === "p-yard" || t.id === "p-pay") { requestAnimationFrame(() => t.classList.add("run")); }
    else if (t.matches("[data-app='rating']")) { const st = orbState.get($("[data-orb='rating']")); orb($("[data-orb='rating']"), st.fill, st.pitch, { rise: true }); }
    else if (t.matches("[data-app='price']")) {
      if (!moving) continue;
      const order = []; for (let i = 0; i < 100; i++) order.push([i % 10, Math.floor(i / 10)]);
      tier.setAll(0);
      spread(tier, { order, to: 1, duration: 330, stagger: 6, easing: (x) => x });
    }
    else if (t.matches(".net")) { $$("[data-net] canvas").forEach((cv) => { const st = orbState.get(cv); orb(cv, st.fill, st.pitch, { rise: true }); }); }
  }
}, { threshold: 0.4 });
if (moving) {
  for (const el of [$("#p-field"), $("#p-yard"), $("#p-pay"), $("[data-app='rating']"), $("[data-app='price']"), $(".net")]) once.observe(el);
} else {
  for (const el of $$("#p-yard, #p-pay")) el.classList.add("run");
}

/* ================================================================ the rating is the post: copy the line */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(S.kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const btn = $("[data-copy]"), out = $("[data-copied]");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    out.textContent = "Paste it under your next post.";
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy the line"; }, 1800);
  } catch { out.textContent = text; }
});

/* ================================================================ reserving a handle */
const handles = $$("[data-handle]");
function syncHandles(src) {
  const h = cleanHandle(src.value).toLowerCase();
  for (const m of $$("[data-mirror]")) m.textContent = h || "yourhandle";
}
for (const h of handles) h.addEventListener("input", () => { syncHandles(h); h.removeAttribute("aria-invalid"); });
for (const s of $$("[data-kind]")) s.addEventListener("change", () => { if (s.value !== S.kind) requestAnimationFrame(() => setTimeout(() => setKind(s.value), 0)); });
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form), input = $("[data-handle]", form);
    const h = cleanHandle(input.value).toLowerCase();
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid"); note.classList.remove("is-error");
    input.value = h; syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}

/* ================================================================ wordmarks, nav, scheme, resize */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: false });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

const nav = $("[data-nav]");
const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

const swatches = $$(".scheme button");
function setScheme(c, save) {
  root.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  redrawOrbs();
  for (const b of bells.values()) b.field.draw();
  field.draw(); twelve.draw(); tier.draw();
  if (save) {
    try { localStorage.setItem("orbe-r8b-scheme", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
swatches.forEach((b) => b.addEventListener("click", () => setScheme(b.dataset.c, true)));
swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === root.dataset.scheme)));

let lastW = innerWidth, rt = 0;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const crossed = (lastW >= 768) !== (innerWidth >= 768);
    lastW = innerWidth;
    if (crossed) for (const [cv, s] of orbState) if (s.pitch !== 4) s.pitch = pitchBig();
    redrawOrbs(); blocks();
  }, 120);
});
if (document.fonts) document.fonts.ready.then(() => { blocks(); });
