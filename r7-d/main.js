/* Orbe r7-d. Every figure comes from the engine: ratings via examples.js, fees via the market engine. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { rate, rateWorks, explain, signed, fixtureSnapshot, FIXTURE_NOW } from "../assets/engine/rating/browser.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { successFee, buyerPremium, TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField, spread, drawBlock, rng, mix, lerp } from "../fx/halftone.js";
import { drawOrb } from "../r8-b/orb.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const moving = root.classList.contains("move");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const handleOf = (v) => cleanHandle(v).toLowerCase();
const clampScore = (n) => Math.max(1, Math.min(99, Math.round(n)));
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const C = { ink: "#141311", chalk: "#FBFAF6", linen: "#E7E2D7", ember: "#FF5A1F" };
const accent = () => css("--accent") || "#1F4BFF";
const tint = () => css("--field") || "#9EE9FB";
const tint2 = () => css("--field-tint") || "#D6F6FD";
const pitchBig = () => (innerWidth >= 768 ? 8 : 6);
const gbp = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" });
const pctOf = (bps) => `${+(bps / 100).toFixed(2)}%`;
const compact = (pence) => { const p = pence / 100; return p >= 1e6 ? `£${+(p / 1e6).toFixed(1)}M` : `£${+(p / 1e3).toFixed(0)}k`; };

/* ---------- live rating: the made-up creators, re-rated by the engine as you drag ----------
   The same inputs examples.js gives the engine for each made-up creator (kept in step with MADE_UP there). */
const INPUT = {
  channel: { kind: "youtube", audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 },
  newsletter: { kind: "substack", audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 },
  stream: { kind: "twitch", audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 },
  podcast: { kind: "podcast", audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 },
  portfolio: { kind: "photography", audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 },
};
const snapFor = (k, mult) => { const s = fixtureSnapshot({ noise: 0.25, ...INPUT[k], reach: mult, title: example(k).name }); s.account.handle = example(k).handle; return s; };
/* the reach slider: 0 to 100, a quarter to four times the example's inputs, on a log scale */
const toMult = (pos) => 0.25 * Math.pow(16, pos / 100);
const toPos = (m) => Math.round((Math.log(m / 0.25) / Math.log(16)) * 100);
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");

/* ---------- the normal curve the engine's priors use ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* ================================================================ the hundred, as halftone cells
   One cell per creator your size. Ranked from the bottom left with seeded jitter, so the front is ragged.
   The first n are the creators beaten (blue), the next is you (Ember), the rest are ahead (Ink dots). */
const DIRS = [45, 135, 315, 225, 90, 0];
function hundredMap(n) {
  const rand = rng(93);
  const cells = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) cells.push({ c, r, d: Math.hypot(c, 9 - r) + rand() * 1.6 });
  cells.sort((a, b) => a.d - b.d);
  const map = new Map();
  cells.forEach((cell, i) => {
    const pitchK = [0.1, 0.085, 0.12][Math.floor(rand() * 3)];
    const dir = DIRS[Math.floor(rand() * DIRS.length)];
    const kind = i < n ? "beaten" : i === n ? "you" : "ahead";
    map.set(cell.c + "," + cell.r, { kind, depth: n > 1 ? i / (n - 1) : 0, pitchK, dir });
  });
  return { map, order: cells.slice(0, Math.min(100, n + 1)).map((x) => [x.c, x.r]) };
}
/* ground: the plate's Chalk, or null to sit straight on the hero's field */
function hundredLook(get, ground) {
  return (c, r, p) => {
    const { map, field } = get();
    const L = map.get(c + "," + r);
    const cell = field ? field.cell : 36;
    if (!L) return { base: ground, ink: C.ink, from: 0, to: 0 };
    const idle = { base: ground, ink: C.ink, pitch: cell * L.pitchK, angle: 45, dir: L.dir, from: L.kind === "ahead" ? 0.42 : 0.16, to: 0.02 };
    if (L.kind === "ahead" || p <= 0) return idle;
    const A = accent(), T = ground ? tint() : null, T2 = ground ? tint2() : null;
    const f = L.kind === "you" ? { base: C.ember, ink: C.ember, from: 1, to: 1 }
      : L.depth < 0.52 ? { base: A, ink: A, from: 1, to: 1 }
      : L.depth < 0.8 ? { base: T, ink: A, from: 0.92, to: lerp(0.5, 0.2, (L.depth - 0.52) / 0.28) }
      : { base: T2, ink: A, from: 0.55, to: 0.04 };
    if (p >= 1) return { ...f, pitch: idle.pitch, angle: 45, dir: L.dir };
    const q = Math.min(1, p * 2), w = Math.max(0, p * 2 - 1);
    const toBase = f.base === f.ink ? (L.kind === "you" ? C.ember : (T ?? f.base)) : f.base;
    return {
      base: ground ? mix(ground, toBase, q) : (q >= 1 ? f.base : null),
      ink: mix(C.ink, f.ink, q), pitch: idle.pitch, angle: 45, dir: L.dir,
      from: lerp(idle.from * (1 - q), f.from, w), to: lerp(idle.to * (1 - q), f.to, w),
    };
  };
}
function makeHundred(cv, ground) {
  const h = { map: new Map(), order: [], field: null, run: null, n: -1 };
  h.field = createField(cv, { cols: 10, rows: 10, look: hundredLook(() => h, ground) });
  return h;
}
function setHundred(h, n) {
  if (h.n === n) return;
  h.n = n;
  const m = hundredMap(n);
  h.map = m.map; h.order = m.order;
  if (h.run) { h.run.cancel(); h.run = null; }
  h.field.setAll(0);
  for (const [c, r] of h.order) h.field.set(c, r, 1);
}
function playHundred(h, { delay = 0, duration = 620, stagger = 17 } = {}) {
  if (!moving) return;
  if (h.run) h.run.cancel();
  h.field.setAll(0);
  const go = () => { h.run = spread(h.field, { order: h.order, to: 1, duration, stagger, easing: (t) => t, reduce: !moving }); };
  if (delay) setTimeout(go, delay); else go();
}

const heroH = makeHundred($("[data-hero-field]"), null);
const leadH = makeHundred($("[data-field]"), C.chalk);
const fitLead = () => $(".plate-field").style.setProperty("--fw", $("[data-field]").style.width);
new ResizeObserver(fitLead).observe($("[data-field]")); fitLead();

/* ================================================================ the bell row: twelve cells, -3 to +3 */
const bellCv = $("[data-bell]");
const bell = { rating: 0, field: null };
bell.field = createField(bellCv, {
  cols: 12, rows: 1, look: (c) => {
    const z = -3 + (c + 0.5) * 0.5;
    const mine = Math.max(0, Math.min(11, Math.floor((bell.rating + 3) / 0.5))) === c;
    if (mine) return { base: accent(), ink: accent(), from: 1, to: 1 };
    const d = 0.86 * Math.exp(-(z * z) / 2);
    return { base: C.chalk, ink: C.ink, pitch: Math.max(4, (bell.field?.cell ?? 24) * 0.14), angle: 45, dir: 270, from: d, to: d * 0.45 };
  },
});
const fitBell = () => $("[data-bell-wrap]").parentElement.style.setProperty("--fw", bellCv.style.width);
new ResizeObserver(fitBell).observe(bellCv); fitBell();

/* ================================================================ the twelve: the last uploads against their own typical */
const twelveCv = $("[data-twelve]");
let twelveData = [];
let twelve = null;
twelve = createField(twelveCv, {
  cols: 12, rows: 1, look: (c) => {
    const w = twelveData[c];
    if (!w) return { base: C.chalk, ink: C.ink, from: 0, to: 0 };
    if (w.best) return { base: accent(), ink: accent(), from: 1, to: 1 };
    const d = Math.max(0.06, Math.min(0.9, 0.18 + Math.log2(w.multiple) * 0.35));
    return { base: C.chalk, ink: C.ink, pitch: Math.max(4, (twelve?.cell ?? 24) * 0.14), angle: 45, dir: 270, from: d, to: d * 0.4 };
  },
});
function drawUploads(k, mult) {
  const works = rateWorks(snapFor(k, mult), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  const best = works.reduce((a, w) => (w.multiple > a.multiple ? w : a), works[0]);
  twelveData = works.map((w) => ({ multiple: w.multiple, best: w === best }));
  const e = example(k);
  const noun = e.result.detail.workNoun ?? "upload";
  const above = works.filter((w) => w.multiple >= 1).length;
  twelveCv.setAttribute("aria-label", `The last ${works.length} ${noun}s against its own typical: ${works.map((w) => w.multiple.toFixed(1) + " times").join(", ")}. ${above} at or above it; the best did ${best.multiple.toFixed(1)} times.`);
  $("[data-ups-cap]").innerHTML = `Rated ${esc(e.signed)}: <span>the last ${works.length} ${esc(noun)}s in dots, denser the further past its typical, the best in <span data-cw>blue</span>.</span>`;
  paintCw();
  $("[data-tags-post]").innerHTML = `<li class="t-straw">${esc(e.band)}</li><li class="t-ink">Best ${best.multiple.toFixed(1)}×</li><li class="t-fixed">${esc(e.signed)}</li>`;
  twelve.draw();
}

/* ================================================================ the yardsticks: a struck diff, from the engine's own priors */
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
let yard = null;
let yardAt = -1;
function readYard(k, r) {
  const e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const part = r.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = r.parts.find((p) => p.key === key).score;
  const bm = benchmark(k);
  const banded = typeof prior.median === "object";
  const typical = (row) => (banded ? prior.median[row.key] : prior.median);
  const beats = (row) => (row.key === r.detail.bandKey ? own : clampScore(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100));
  return { key, banded, name: part.name, own, rows: bm.rows.map((row) => ({ ...row, n: beats(row), mine: row.key === r.detail.bandKey })) };
}
function drawYard(k, r) {
  const e = example(k);
  yard = readYard(k, r);
  const rows = yard.rows;
  const mineAt = rows.findIndex((x) => x.mine);
  const s = $("[data-s-yard]");
  s.max = String(rows.length - 1);
  if (yardAt < 0 || yardAt > rows.length - 1) yardAt = mineAt;
  s.value = String(yardAt);
  fill(s);
  const first = rows[0], last = rows[rows.length - 1];
  $("[data-yard-why]").textContent = yard.banded
    ? `Against small ${e.peers}, ${VERDICT[say(first.n)]}. Against the giants, ${VERDICT[say(last.n)]}. Neither is fair.`
    : "Size does not move paid conversion. Every yardstick is fair here.";
  $("[data-yard-path]").textContent = `${yard.key}.yardstick`;
  yardOut();
}
function yardOut() {
  const e = example(kind);
  const x = yard.rows[yardAt];
  const mine = yard.rows.find((r) => r.mine);
  const fair = x.mine || !yard.banded;
  $("[data-yc-out]").textContent = `Against ${x.label}: beats ${x.n} in 100. ${x.mine ? "Its size. Fair." : fair ? `${say(x.n, true)} Fair here.` : `${say(x.n)} Not a fair comparison.`}`;
  const row = (cls, m, text) => `<li class="${cls}" data-m="${m}"><span class="t">${esc(text)}</span></li>`;
  const lines = [row("ctx", "", `"${e.name}": {`)];
  if (!fair) lines.push(row("del", "-", `"${x.label}": ${x.n},`));
  else if (!x.mine) lines.push(row("ctx", "", `"${x.label}": ${x.n},`));
  lines.push(row("add", "+", `"${mine.label}": ${mine.n}`), row("ctx", "", "}"));
  const ol = $("[data-diff-yard]");
  ol.innerHTML = lines.join("");
  ol.setAttribute("aria-label", fair
    ? `${yard.name} for ${e.name}: against ${x.label} it beats ${x.n} in 100, a fair yardstick; against its own size, ${mine.label}, ${mine.n} in 100.`
    : `${yard.name} for ${e.name}: against ${x.label} it beats ${x.n} in 100, struck out as unfair. Against its own size, ${mine.label}, it beats ${mine.n} in 100.`);
  $("[data-ghost-yard]").textContent = String(x.n);
  $("[data-tags-yard]").innerHTML = `<li class="t-straw">${esc(yard.name)}</li><li class="t-ink">${esc(x.label)}</li><li class="t-fixed">${mine.n} in 100</li>`;
  $("[data-yard-cap]").innerHTML = fair
    ? `Fair yardstick: <span>${x.mine ? "its own size, in <span data-cw>blue</span>." : "size does not move it, so every row is the same."}</span>`
    : `Fair yardstick: <span>${esc(x.label)} struck out, its own size in <span data-cw>blue</span>.</span>`;
  paintCw();
  $("[data-s-yard]").setAttribute("aria-valuetext", `${x.label}, beats ${x.n} in 100`);
}
$("[data-s-yard]").addEventListener("input", (ev) => { yardAt = +ev.target.value; yardOut(); });

/* ================================================================ the kind: the headline's word drives the whole page */
const kindsRow = $("[data-kinds]");
const PICK = { channel: "YouTube", newsletter: "Newsletter", stream: "Twitch", podcast: "Podcast", portfolio: "Photography" };
kindsRow.innerHTML = ORDER.map((k) => `<button type="button" data-k="${k}" aria-pressed="false">${PICK[k] ?? example(k).word}</button>`).join("");

let kind = "channel";
let mult = INPUT.channel.reach;
let said = "";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(text, lead) {
  const ss = text.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [text];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}

/* Everything the rating touches, from one engine result. */
let pending = null;
function render(k, r) {
  const e = example(k);
  const lead = r.parts.find((p) => p.key === leadKey(k));
  const reach = r.parts.find((p) => p.key === "reach");
  const show = (k === "newsletter" ? ["conversion", "engagement", "growth"] : e.parts.map((p) => p.key)).map((key) => r.parts.find((p) => p.key === key)).filter(Boolean);
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  const sg = signed(r.rating);
  said = `My ${e.word} is rated ${sg}, ${r.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, lead: String(lead.score), peers: e.peers, fact: firstSentence(explain(r), lead), size: e.sizeBand,
    signed: sg, band: r.band,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    weighs: `The rating weighs all ${count}: ${sg}, ${r.band}.`,
    line: EXAMPLE_LINE, reachName: reach.name, reachValue: `A typical ${r.detail.workNoun ?? "upload"}: ${reach.value}`,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-reach-n]").textContent = String(reach.score);
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === r.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  $("[data-parts]").innerHTML = show.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.value)}</td><td>${p.score}</td></tr>`).join("");
  bell.rating = r.rating; bell.field.draw();
  bellCv.setAttribute("aria-label", `The Orbe Rating runs from minus 3 to plus 3, densest at zero, the typical. ${e.name} sits at ${sg}, ${r.band}.`);
  const n = clampScore(lead.score);
  setHundred(leadH, n);
  $("[data-field]").setAttribute("aria-label", `A field of 100 cells, one for every 100 ${e.peers} its size. ${n} fill in ${root.dataset.scheme === "pink" ? "claret" : "blue"}, one for each it beats; one orange cell is ${e.name}; ${99 - n} are ahead.`);
  $("[data-field-cap]").innerHTML = `Beats ${n} in 100: <span><span data-cw>blue</span> spreads through the ${esc(e.peers)} its size, and stops at ${esc(e.name)}.</span>`;
  drawYard(k, r);
  paintCw();
  $("[data-hero-foot]").textContent = `Made-up example: ${e.handle} beats ${lead.score} in 100 ${e.peers} its size`;
  $("[data-s-reach]").setAttribute("aria-valuetext", `${reach.value}. ${reach.name} beats ${reach.score} in 100. Rating ${sg}, ${r.band}.`);
}

function setKind(k) {
  kind = k;
  mult = INPUT[k].reach;
  yardAt = -1;
  const e = example(k);
  const sr = $("[data-s-reach]");
  sr.value = String(toPos(mult)); fill(sr);
  $("[data-reach-label]").textContent = k === "newsletter" ? "Drag how many open a typical issue" : `Drag a typical ${e.result.detail.workNoun ?? "upload"}'s reach`;
  $("[data-reset]").hidden = true;
  render(k, e.result);
  drawUploads(k, mult);
  const lead = e.result.parts.find((p) => p.key === leadKey(k));
  setHundred(heroH, clampScore(lead.score));
  for (const b of $$("[data-k]")) b.setAttribute("aria-pressed", String(b.dataset.k === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
}

/* drag the reach: the engine re-rates the made-up creator, once per frame */
$("[data-s-reach]").addEventListener("input", (ev) => {
  stopCycle();
  mult = toMult(+ev.target.value);
  $("[data-reset]").hidden = false;
  if (pending) return;
  /* the thumb paints this frame; the engine re-rates just after it */
  pending = requestAnimationFrame(() => setTimeout(() => { pending = null; render(kind, rate(snapFor(kind, mult), FIXTURE_NOW)); }, 0));
});
$("[data-reset]").addEventListener("click", () => { setKind(kind); $("[data-s-reach]").focus(); });
kindsRow.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-k]");
  if (!b) return;
  stopCycle();
  if (b.dataset.k === kind) return;
  /* the pressed tab shows this frame; the page redraws just after it */
  for (const x of $$("[data-k]")) x.setAttribute("aria-pressed", String(x === b));
  showWord(b.dataset.k);
  requestAnimationFrame(() => setTimeout(() => setKind(b.dataset.k), 0));
});

/* ================================================================ the sale: drag a price, the market engine computes the fees */
const priceAt = (pos) => { const p = 50000 * Math.pow(100, pos / 100); return p < 1e6 ? Math.round(p / 5000) * 5000 : Math.round(p / 25000) * 25000; };
const tierCv = $("[data-tier]");
let tierCells = [];
let tier = null;
tier = createField(tierCv, {
  cols: 10, rows: 10, look: (c, r, p) => {
    const t = tierCells[r * 10 + c] ?? "you";
    const pitch = Math.max(4, (tier?.cell ?? 28) * 0.16);
    const idle = { base: C.chalk, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.14, to: 0.02 };
    const fin = t === "you" ? { base: tint(), ink: accent(), pitch, angle: 45, dir: [45, 135, 315, 225][(c * 7 + r * 3) % 4], from: 0.92, to: 0.5 }
      : t === 0 ? { base: C.linen, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.92, to: 0.62 }
      : t === 1 ? { base: C.linen, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.52, to: 0.3 }
      : { base: C.linen, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.26, to: 0.1 };
    if (p >= 1) return fin;
    if (p <= 0) return idle;
    return { base: mix(C.chalk, fin.base, p), ink: mix(C.ink, fin.ink, p), pitch, angle: 45, dir: 45, from: lerp(idle.from, fin.from, p), to: lerp(idle.to, fin.to, p) };
  },
});
tier.setAll(1);
function setSale(pos, from) {
  for (const s of $$("[data-s-sale]")) if (s !== from) { s.value = String(pos); fill(s); }
  const P = priceAt(pos);
  const price = { amount: P * 100, currency: "GBP" };
  const f = successFee(price), b = buyerPremium(price);
  const keep = price.amount - f.fee.amount;
  $("[data-sale-price]").textContent = gbp(price.amount);
  $("[data-sale-fee]").textContent = gbp(f.fee.amount);
  $("[data-sale-keep]").textContent = gbp(keep);
  $("[data-sale-rate]").textContent = ((f.fee.amount / price.amount) * 100).toFixed(1) + "%";
  $("[data-prem-price]").textContent = gbp(price.amount);
  $("[data-prem]").textContent = gbp(b.fee.amount);
  const tiers = TAKE_RATE.seller.tiers;
  $("[data-sale-note]").textContent = f.minimumApplied
    ? `${pctOf(tiers[0].rateBps)} would be less than ${gbp(TAKE_RATE.seller.minimum)}, so the minimum applies. Nothing if it doesn't sell.`
    : f.slices.length === 1 ? `${pctOf(tiers[0].rateBps)} up to ${compact(tiers[0].upTo)}. From the proceeds, only if it sells.`
    : f.slices.length === 2 ? `${pctOf(tiers[0].rateBps)} on the first ${compact(tiers[0].upTo)}, ${pctOf(tiers[1].rateBps)} on the rest up to ${compact(tiers[1].upTo)}. Only if it sells.`
    : `${pctOf(tiers[0].rateBps)} to ${compact(tiers[0].upTo)}, ${pctOf(tiers[1].rateBps)} to ${compact(tiers[1].upTo)}, ${pctOf(tiers[2].rateBps)} above. Only if it sells.`;
  /* whole percentages; the remainder goes to the creator, never to the fee, so the picture never overstates the fee */
  const feeCells = Math.floor((f.fee.amount / price.amount) * 100);
  let split;
  if (f.minimumApplied) split = [feeCells, 0, 0];
  else {
    const raw = f.slices.map((s) => (s.fee / f.fee.amount) * feeCells);
    split = raw.map(Math.floor);
    let left = feeCells - split.reduce((a, x) => a + x, 0);
    raw.map((x, i) => [x - Math.floor(x), i]).sort((a, c) => c[0] - a[0]).forEach(([, i]) => { if (left > 0) { split[i]++; left--; } });
  }
  tierCells = Array(100 - feeCells).fill("you");
  split.forEach((n, i) => { for (let j = 0; j < n; j++) tierCells.push(i); });
  tier.draw();
  tierCv.setAttribute("aria-label", `A hundred cells, each 1% of a ${gbp(price.amount)} sale: ${100 - feeCells} go to you, ${feeCells} are Orbe's fee, split by tier.`);
  $("[data-tags-tier]").innerHTML = `<li class="t-straw">Sale ${compact(price.amount)}</li><li class="t-ink">${pctOf(f.effectiveRateBps)} fee</li><li class="t-fixed">You keep ${gbp(keep)}</li>`;
  for (const s of $$("[data-s-sale]")) s.setAttribute("aria-valuetext", `${gbp(price.amount)}: Orbe's fee ${gbp(f.fee.amount)}, buyer's premium ${gbp(b.fee.amount)}`);
}
for (const s of $$("[data-s-sale]")) s.addEventListener("input", () => { fill(s); setSale(+s.value, s); });

/* fees in words, from the engine's schedules */
(function feeWords() {
  const T = TAKE_RATE;
  const set = (k, v) => { const el = $(`[data-fee='${k}']`); if (el) el.textContent = v; };
  set("network", pctOf(T.sponsorship.networkBps));
  set("direct", pctOf(T.sponsorship.directBps));
  const st = T.seller.tiers;
  set("t1", pctOf(st[0].rateBps)); set("t2", pctOf(st[1].rateBps)); set("t3", pctOf(st[2].rateBps));
  set("sell", `${gbp(T.seller.minimum)} minimum. From the proceeds, only if it sells. Nothing if it doesn't.`);
  const bp = T.buyerPremium.tiers;
  set("b1", pctOf(bp[0].rateBps)); set("b2", pctOf(bp[1].rateBps));
  set("buy", `Free, vetted access. ${gbp(T.buyerPremium.minimum)} minimum. Diligence reports included; ${gbp(T.buyers.report.standard)} only if you walk away after one, never if it shows the listing was wrong.`);
})();

/* ================================================================ the headline word: it cycles through the kinds once, calmly, and stops */
const word = $("[data-word]");
const cycleBtn = $("[data-cycle]");
function showWord(k) {
  const set = () => { word.textContent = example(k).word; };
  if (!moving) { set(); return; }
  word.classList.add("out");
  setTimeout(() => { set(); word.classList.remove("out"); }, 170);
}
let auto = moving;
let heroOn = true;
let timer = 0;
let steps = 0;
function cycleLabel() {
  cycleBtn.setAttribute("aria-pressed", String(!auto));
  $("[data-cycle-l]").textContent = auto ? "Pause the headline" : "Play the headline";
}
function stopCycle() { auto = false; clearTimeout(timer); cycleLabel(); }
function tick() {
  clearTimeout(timer);
  if (!auto) return;
  timer = setTimeout(() => {
    if (!auto) return;
    if (heroOn && !document.hidden) {
      const next = ORDER[(ORDER.indexOf(kind) + 1) % ORDER.length];
      showWord(next); setKind(next);
      steps++;
      /* once round every kind and back to the first, then it rests */
      if (steps >= ORDER.length) { stopCycle(); return; }
    }
    tick();
  }, 2800);
}
cycleBtn.addEventListener("click", () => {
  if (auto) { stopCycle(); return; }
  auto = true; steps = 0; cycleLabel(); tick();
});
if (!moving) cycleBtn.hidden = true;
/* typing a handle means you have chosen: the word holds still */
for (const h of $$("[data-handle]")) h.addEventListener("focus", () => { if (auto) stopCycle(); });

/* ================================================================ the stack: panels slide over each other */
const panels = $$(".p");
function pinTops() {
  panels.forEach((p, i) => {
    const want = 72 + i * (innerWidth >= 768 ? 12 : 8);
    p.style.setProperty("--top", Math.min(want, innerHeight - p.offsetHeight - 16) + "px");
  });
}
function shade() {
  if (!moving) return;
  panels.forEach((p, i) => {
    const n = panels[i + 1];
    if (!n) return;
    const pt = p.getBoundingClientRect().top;
    const nt = n.getBoundingClientRect().top;
    const span = Math.max(1, innerHeight - pt);
    const t = Math.max(0, Math.min(1, (innerHeight - nt) / span));
    p.style.setProperty("--shade", (0.3 * t).toFixed(3));
  });
}
const nav = $("[data-nav]");
let ticking = false;
const onScroll = () => {
  nav.classList.toggle("is-scrolled", scrollY > 8);
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; shade(); });
};
addEventListener("scroll", onScroll, { passive: true });

/* numbers that arrive: once, from zero, linear because they are data */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!moving || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, Math.max(0, (now - t0) / 700));
    el.textContent = sign + (target * t).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ================================================================ the buyer's list: small orbs, filled to each lead part */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const lead = x.parts[0];
  return `<li><canvas data-rn="${lead.score}" aria-hidden="true"></canvas><span class="rl-n">${esc(x.name)}<small>${esc(x.label)}, ${esc(x.sizeBand)}. ${esc(lead.name)} beats ${lead.score} in 100.</small></span><b class="rl-r">${esc(x.signed)}<small>${esc(x.band)}</small></b></li>`;
}).join("");
function drawOrbs() {
  for (const cv of $$("[data-rn]")) drawOrb(cv, { fill: +cv.dataset.rn / 100, pitch: 4, ink: accent(), rim: C.ink });
  drawOrb($("[data-orb-you]"), { fill: 0, pitch: pitchBig(), ink: accent(), rim: C.ink });
}
/* the captions name the accent the scheme draws in */
function paintCw() { const w = root.dataset.scheme === "pink" ? "claret" : "blue"; for (const el of $$("[data-cw]")) el.textContent = w; }
const blocks = () => { for (const b of $$("[data-block]")) drawBlock(b, { base: null, ink: C.ink, pitch: 4, angle: 45, dir: 90, from: 0.62, to: 0.04 }); };

/* ================================================================ the scheme */
const swatches = $$(".scheme button");
function setScheme(c, save) {
  root.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  paintCw(); heroH.field.draw(); leadH.field.draw(); bell.field.draw(); twelve.draw(); tier.draw(); drawOrbs();
  if (save) {
    try { localStorage.setItem("orbe-r7d-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
swatches.forEach((b) => b.addEventListener("click", () => setScheme(b.dataset.c, true)));
swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === root.dataset.scheme)));

/* ================================================================ every slider shows its fill */
function fill(r) { r.style.setProperty("--fill", ((r.value - r.min) / (r.max - r.min || 1)) * 100 + "%"); }
const ranges = $$(".range");
for (const r of ranges) r.addEventListener("input", () => fill(r));

/* ================================================================ start */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: false });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

setKind("channel");
setSale(45);
ranges.forEach(fill);
drawOrbs();
blocks();
cycleLabel();
pinTops();
onScroll();

/* the hero: the hundred fills once, then only the word moves, and that stops too */
playHundred(heroH, { delay: 600, duration: 500, stagger: 8 });

/* everything below the fold explains once, on entering view */
if (moving && "IntersectionObserver" in window) {
  const once = new IntersectionObserver((ents) => {
    for (const en of ents) {
      if (!en.isIntersecting) continue;
      const t = en.target;
      once.unobserve(t);
      if (t.matches(".plate-field")) playHundred(leadH);
      else if (t.matches("[data-plate]")) requestAnimationFrame(() => t.classList.add("run"));
      else if (t.matches(".plate-tier")) {
        const order = []; for (let i = 0; i < 100; i++) order.push([i % 10, Math.floor(i / 10)]);
        tier.setAll(0);
        spread(tier, { order, to: 1, duration: 330, stagger: 6, easing: (x) => x });
      } else for (const c of $$("[data-count]", t)) countUp(c);
    }
  }, { threshold: 0.4 });
  for (const el of $$(".plate-field, [data-plate], .plate-tier")) once.observe(el);
  for (const p of panels) once.observe(p);
  const hio = new IntersectionObserver((es) => { heroOn = es[0].isIntersecting; }, { threshold: 0.5 });
  hio.observe($(".hero"));
} else {
  for (const el of $$("[data-plate]")) el.classList.add("run");
}
tick();
if (document.fonts) document.fonts.ready.then(() => { pinTops(); blocks(); });

let lastW = innerWidth, rt = 0;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => { if ((lastW >= 768) !== (innerWidth >= 768)) drawOrbs(); lastW = innerWidth; pinTops(); blocks(); shade(); }, 120);
});

/* ================================================================ the rating is the post: copy the line */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
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
  const h = handleOf(src.value);
  for (const m of $$("[data-mirror]")) m.textContent = h || "yourhandle";
}
for (const h of handles) h.addEventListener("input", () => { syncHandles(h); h.removeAttribute("aria-invalid"); });
for (const k of $$("[data-kind]")) k.addEventListener("change", () => { stopCycle(); showWord(k.value); setKind(k.value); });
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form), input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid"); note.classList.remove("is-error");
    input.value = h; syncHandles(input);
    const res = await reserve({ handle: h, kind: (form.elements.kind && form.elements.kind.value) || kind });
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
