/* Orbe r7-e: the moon page, at the round 8 finish. Every figure comes from the engine at runtime. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, BENCHMARK_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS, rate, rateWorks, explain, signed as signedOf, fixtureSnapshot, FIXTURE_NOW } from "../assets/engine/rating/browser.js";
import { successFee, buyerPremium, DEFAULT_FEE_SCHEDULE, DEFAULT_BUYER_PREMIUM, TAKE_RATE } from "../assets/engine/market/browser.js";
import { DEFAULT_TAKE_RATE } from "../assets/engine/sponsor/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField, spread, drawBlock, mix, lerp } from "../fx/halftone.js";
import { drawMoon, waxMoon } from "./moon.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const still = new URLSearchParams(location.search).has("still");
let reduce = still;
try { reduce = reduce || matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
/* canvases ease with the UI curve (ease-out-quad); data moves linearly */
const easeUi = (t) => t * (2 - t);

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const colours = () => ({
  ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", linen: "#E7E2D7", stone: "#A29E95", graphite: "#5D584F",
  accent: css("--accent") || "#1F4BFF", field: css("--field") || "#9EE9FB",
});
let C = colours();
const bp = () => (innerWidth >= 1280 ? "d" : innerWidth >= 768 ? "t" : "m");

/* ---------- scheme ---------- */
const schemeBtns = $$("[data-scheme-btn]");
function setScheme(s, save) {
  document.documentElement.dataset.scheme = s;
  schemeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.schemeBtn === s)));
  C = colours();
  if (save) {
    try { localStorage.setItem("orbe-r7e-colour", s); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", s); history.replaceState(null, "", u); } catch {}
  }
  redrawAll();
}
schemeBtns.forEach((b) => b.addEventListener("click", () => setScheme(b.dataset.schemeBtn, true)));
schemeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.schemeBtn === document.documentElement.dataset.scheme)));

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

/* ---------- the engine helpers ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const pct = (v) => `${Math.round(v * 100)}%`;
const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const short = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)));
const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/* Newsletters lead with new paying subscribers, not opens: tracked opens include machine opens. */
const leadOf = (k, x) => (k === "newsletter" ? x.result.parts.find((p) => p.key === "conversion") : x.parts[0]);
const partsOf = (k, x) => (k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => x.result.parts.find((p) => p.key === key)) : x.parts);
function firstSentence(x, lead) {
  const ss = x.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [x.explain];
  const hit = ss.find((s) => (lead.key === "conversion" ? /paying/ : /beats/).test(s)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}

/* ---------- 1. the hero moon: lit to the score, once ---------- */
const fr = example("channel");
const frLead = fr.parts[0].score;
const heroMoon = $("[data-moon-hero]");
const heroPitch = () => (bp() === "m" ? 6 : 8);
const heroOpts = () => ({ phase: frLead / 100, pitch: heroPitch(), body: C.accent, rim: C.ink });
heroMoon.setAttribute("aria-label", `A moon lit to ${frLead} in 100: ${fr.name}, a made-up channel, beats ${frLead} in 100 ${fr.peers} its size on reach.`);
drawMoon(heroMoon, { ...heroOpts(), phase: reduce ? frLead / 100 : 0 });
let heroDone = reduce;
function waxHero() {
  if (reduce) { drawMoon(heroMoon, heroOpts()); return; }
  waxMoon(heroMoon, heroOpts(), { ms: 900, delay: 600 });
  setTimeout(() => { heroDone = true; }, 1500);
}

/* ---------- 2. where you stand: the kinds, the yardstick, the parts ---------- */
const tabLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photography" };
$("[data-kinds]").innerHTML = ORDER.map((k) => `<button type="button" class="kind" data-tk="${k}" aria-pressed="false">${tabLabel[k]}</button>`).join("");

const say = (n) => (n >= 97 ? "a genius" : n >= 75 ? "great" : n >= 45 ? "ordinary" : "weak");
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
let kind = "channel", said = "", yard = [];
const yardPitch = () => (bp() === "m" ? 4 : 6);
const smallPitch = 4;

function yardFor(k) {
  const x = example(k);
  const spec = SPECS[x.platform];
  const key = leadKey(k);
  const part = x.result.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = x.result.parts.find((p) => p.key === key).score;
  const bm = benchmark(k);
  const banded = typeof prior.median === "object";
  const typical = (row) => (banded ? prior.median[row.key] : prior.median);
  const beats = (row) => (row.key === bm.example ? own : Math.max(1, Math.min(99, Math.round(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100))));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  return { x, part, banded, own, first, last, mine, beats, what: part.name.toLowerCase() };
}

function setKind(k) {
  kind = k;
  const x = example(k);
  const lead = leadOf(k, x);
  const parts = partsOf(k, x);
  const maths = mathsFor(k);
  const count = NUM[maths.length] ?? String(maths.length);
  said = `My ${x.word} is rated ${x.signed}, ${x.band}, against ${x.peers} my size.`;
  const bind = {
    handle: x.handle, lead: String(lead.score), peers: x.peers, name: x.name, fact: firstSentence(x, lead),
    weights: `The weights for ${x.peers}: ${maths.map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(x.platform), said: `“${said}”`, line: EXAMPLE_LINE,
    weighs: `${lead.name} is one of ${count} parts. The rating weighs all ${count}: ${x.signed}, ${x.band}.`,
  };
  for (const el of $$("#rating [data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];

  /* one piece of work, three yardsticks: two wrong sizes struck, its own size lit in full */
  const Y = yardFor(k);
  const rows = Y.banded ? [[Y.first, false], [Y.last, false], [Y.mine, true]] : [[Y.first, true], [Y.last, true], [Y.mine, true]];
  const ol = $("[data-yard]");
  ol.setAttribute("aria-label", `One ${x.word}'s ${Y.what}, against three sizes of ${x.peers}`);
  ol.innerHTML = rows.map(([row, fair], i) => {
    const n = Y.beats(row);
    const mineRow = row === Y.mine;
    const struck = !fair;
    return `<li class="y${mineRow ? " mine" : ""}${struck ? " struck" : ""}">
      <canvas class="moon moon-y" data-y="${i}" aria-hidden="true"></canvas>
      <p class="small y-vs"><span class="t">${mineRow ? `Its size, ${esc(row.label)}` : `Against ${esc(lowerFirst(row.label))}`}</span>${struck ? '<span class="vh">, not a fair comparison</span>' : ""}</p>
      <p class="h4 y-n">${n}<span class="small"> in 100</span></p>
      <p class="small soft y-w">${mineRow ? "Fair." : Y.banded ? `Looks ${say(n)}.` : "Fair here too."}</p>
    </li>`;
  }).join("");
  yard = rows.map(([row, fair]) => ({ n: Y.beats(row), fair: fair && row === Y.mine || !Y.banded }));
  paintYard(1);
  $("[data-yard-cap]").innerHTML = Y.banded
    ? `<b>Fair yardstick:</b> <span>two wrong sizes struck out, its own size lit in full.</span>`
    : `<b>Every yardstick is fair here:</b> <span>size does not move ${esc(Y.what)}.</span>`;
  $("[data-yard-why]").innerHTML = Y.banded
    ? `Against small ${esc(x.peers)}, ${say(Y.beats(Y.first))}. Against the giants, ${say(Y.beats(Y.last))}. <b>Neither is fair.</b>`
    : `Size does not move ${esc(Y.what)}, so every yardstick reads the same. <b>Each one is fair.</b>`;
  const mineLabel = Y.mine.label.toUpperCase();
  $("[data-yard-tags]").innerHTML = `<li class="t-straw">${esc(Y.part.name.toUpperCase())}</li><li class="t-ink">${esc(mineLabel)}</li><li class="t-fixed">${Y.own} IN 100</li>`;

  /* the parts, each with a small moon lit by its score */
  $("[data-parts]").innerHTML = parts.map((p) => `<li><canvas class="moon moon-s" data-part="${p.score}" aria-hidden="true"></canvas><span class="h4 p-n">${p.score}</span><span class="p-t"><span class="body-p">${esc(p.name)}</span><span class="small soft">${esc(p.value)}</span></span></li>`).join("");
  paintParts();

  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = x.peers;
  $("[data-copied]").innerHTML = `<span>${esc(EXAMPLE_LINE)}</span>`;
}

function paintYard(t) {
  $$("[data-y]").forEach((cv, i) => {
    const y = yard[i];
    if (!y) return;
    drawMoon(cv, { phase: (y.n / 100) * t, pitch: yardPitch(), body: y.fair ? C.accent : C.graphite, rim: y.fair ? C.ink : C.stone });
  });
}
function paintParts() { for (const cv of $$("[data-part]")) drawMoon(cv, { phase: +cv.dataset.part / 100, pitch: smallPitch, body: C.accent, rim: C.ink }); }
let yardPlayed = reduce;
function playYard(el) {
  el.classList.add("run");
  yardPlayed = true;
  if (reduce) { paintYard(1); return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 900);
    paintYard(t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

$("[data-kinds]").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (b) setKind(b.dataset.tk);
});

/* copy the line */
const copyBtn = $("[data-copy]");
copyBtn.addEventListener("click", async () => {
  const x = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${x.handle}`;
  try { await navigator.clipboard.writeText(text); copyBtn.textContent = "Copied"; $("[data-copied]").textContent = "Paste it under your next post."; }
  catch { $("[data-copied]").textContent = text; copyBtn.textContent = "Select and copy below"; }
  setTimeout(() => { copyBtn.textContent = "Copy the line"; }, 2000);
});

/* ---------- 3. zero is typical: a bell drawn in dots, and the lab that moves along it ---------- */
const EDGES = [-3, -2, -0.8, 0.8, 2, 3];
const SLOTS = 12;
const mass = Array.from({ length: SLOTS }, (_, i) => phi(-3 + (i + 1) * 0.5) - phi(-3 + i * 0.5));
const peak = Math.max(...mass);
const slotOf = (v) => Math.max(0, Math.min(SLOTS - 1, Math.floor((Math.max(-3, Math.min(2.999, v)) + 3) / 0.5)));
let youSlot = slotOf(fr.rating);
let bell = null;
const bellLook = (c, r, p) => {
  const pitch = (bell ? bell.cell : 40) * 0.1;
  if (c === youSlot) return { base: mix(C.ink, C.field, p), ink: C.field, pitch, angle: 45, dir: 90, from: 1, to: 1 };
  const d = (mass[c] / peak) * 0.86 * p;
  return { base: null, ink: C.paper, pitch, angle: 45, dir: 90, from: d, to: d * 0.35 };
};
const bellCanvas = $("[data-bell]");
bell = createField(bellCanvas, { cols: SLOTS, rows: 1, look: bellLook });
const fitBell = () => $(".bell").style.setProperty("--bw", bellCanvas.style.width);
fitBell();
const atPct = (v) => ((v + 3) / 6) * 100;
let bellPlayed = reduce;
function playBell() {
  bellPlayed = true;
  bell.setAll(0);
  /* density rises from the two ends toward the middle, then the creator's cell closes */
  const order = [];
  for (let i = 0; i < SLOTS / 2; i++) { order.push([i, 0]); order.push([SLOTS - 1 - i, 0]); }
  const rest = order.filter(([c]) => c !== youSlot);
  spread(bell, { order: [...rest, [youSlot, 0]], to: 1, duration: 330, stagger: 40, easing: easeUi, reduce });
}

/* rating.lab: drag a made-up channel; the engine re-rates it on every move */
const sig = (n, d = 2) => { const q = Math.pow(10, Math.floor(Math.log10(n)) - d + 1); return Math.round(n / q) * q; };
const LAB = { base: { kind: "youtube", noise: 0.25, engagement: 1.6, hitEvery: 5, seed: 1, title: "Your channel" } };
/* the typical views the engine reads at reach 1, per subscriber, so the slider sets the typical itself */
LAB.perSub = rate(fixtureSnapshot({ ...LAB.base, audience: 100000, reach: 1 }), FIXTURE_NOW).detail.typical.views / 100000;
const audAt = (t) => sig(Math.pow(10, 3 + 4 * t), 2);
const viewsAt = (t) => sig(Math.pow(10, 2 + 4.7 * t), 2);
const audSl = $("[data-lab='aud']"), viewsSl = $("[data-lab='views']");
audSl.value = String(Math.round(((Math.log10(412000) - 3) / 4) * 1000));
viewsSl.value = String(Math.round(((Math.log10(150000) - 2) / 4.7) * 1000));
const bmRows = benchmark("channel").rows;
const labMoon = $("[data-moon-lab]");
const labPitch = () => (bp() === "m" ? 4 : 6);
let lab = { score: frLead, measured: fr.result.detail.parts[0].measured, band: "", works: [], typical: 1, max: 0.4 };

/* the two charts share one cell grid: 24 columns by 8 rows, the same cell size */
const CC = 24, CR = 8;
let hist = null, ups = null;
const cellPitch = (f) => Math.max(3, (f ? f.cell : 30) * 0.12);
const histLook = (c, r) => {
  const b = Math.floor(c / 4), sub = c % 4;
  const row = bmRows[b];
  if (sub === 3 || !row) return { base: null, ink: C.paper, from: 0, to: 0 };
  const h = (row.value / lab.max) * CR, rr = CR - 1 - r, fill = Math.max(0, Math.min(1, h - rr));
  const mineBand = lab.band.startsWith(row.label + " ");
  if (fill <= 0) return { base: null, ink: C.paper, from: 0, to: 0 };
  const pitch = cellPitch(hist);
  if (mineBand) return { base: null, ink: C.field, pitch, angle: 45, dir: 270, from: 0.9 * fill, to: 0.9 * fill };
  return { base: null, ink: C.paper, pitch, angle: 45, dir: 270, from: 0.46 * fill, to: 0.3 * fill };
};
const upsLook = (c, r) => {
  const i = Math.floor(c / 2), sub = c % 2;
  const w = lab.works[i];
  if (sub === 1 || !w) return { base: null, ink: C.paper, from: 0, to: 0 };
  const h = (w.multiple / lab.top) * CR, rr = CR - 1 - r, fill = Math.max(0, Math.min(1, h - rr));
  if (fill <= 0) return { base: null, ink: C.paper, from: 0, to: 0 };
  const pitch = cellPitch(ups);
  if (w === lab.best) return { base: null, ink: C.field, pitch, angle: 45, dir: 270, from: 0.9 * fill, to: 0.9 * fill };
  const d = w.multiple >= 1 ? 0.46 : 0.22;
  return { base: null, ink: C.paper, pitch, angle: 45, dir: 270, from: d * fill, to: d * 0.65 * fill };
};
hist = createField($("[data-hist]"), { cols: CC, rows: CR, look: histLook });
ups = createField($("[data-ups]"), { cols: CC, rows: CR, look: upsLook });
$("[data-hist-labels]").innerHTML = bmRows.map((r) => `<li>${esc(r.label)}</li>`).join("");

function fill(sl) { sl.style.setProperty("--p", `${(+sl.value / +sl.max) * 100}%`); }
let sayT = 0;
function runLab() {
  const aud = audAt(+audSl.value / 1000);
  let views = viewsAt(+viewsSl.value / 1000);
  /* a typical upload never reaches more people than the channel has subscribers: snap the thumb to that ceiling */
  const cap = aud;
  if (views > cap) { views = cap; viewsSl.value = String(Math.floor(((Math.log10(cap) - 2) / 4.7) * 1000)); }
  const snap = fixtureSnapshot({ ...LAB.base, audience: aud, reach: views / (aud * LAB.perSub) });
  const r = rate(snap, FIXTURE_NOW);
  const reachP = r.parts.find((p) => p.key === "reach");
  const measured = r.detail.parts.find((p) => p.key === "reach").measured;
  const typ = r.detail.typical.views;
  $("[data-out='aud']").textContent = nf.format(aud);
  $("[data-out='views']").textContent = nf.format(typ);
  audSl.setAttribute("aria-valuetext", `${nf.format(aud)} subscribers`);
  viewsSl.setAttribute("aria-valuetext", `${nf.format(typ)} views`);
  fill(audSl); fill(viewsSl);
  /* a percentile reads 1 to 99: never "100 in 100", never "0 in 100" */
  const score = Math.max(1, Math.min(99, reachP.score));
  $("[data-lab-band]").textContent = lowerFirst(r.sizeBand);
  $("[data-lab-beat]").textContent = String(score);
  $("[data-lab-rating]").textContent = signedOf(r.rating);
  $("[data-lab-bandname]").textContent = r.band;
  $("[data-lab-reach]").textContent = pct(measured);
  const ws = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  const top = Math.max(...ws.map((w) => w.multiple), 1) * 1.1;
  const best = ws.reduce((a, w) => (w.multiple > a.multiple ? w : a), ws[0]);
  lab = { score, measured, band: r.sizeBand, works: ws, best, top, typical: typ, max: Math.max(measured, ...bmRows.map((x) => x.value)) * 1.08 };
  drawMoon(labMoon, { phase: score / 100, pitch: labPitch(), body: C.field, rim: C.stone });
  labMoon.setAttribute("aria-label", `A moon lit to ${score} in 100.`);
  hist.draw(); ups.draw();
  $("[data-hist-line]").style.setProperty("--y", `${Math.min(1, measured / lab.max) * 100}%`);
  $("[data-ups-line]").style.setProperty("--y", `${(1 / top) * 100}%`);
  $("[data-hist]").setAttribute("aria-label", `Typical reach by size: ${bmRows.map((x) => `${x.label} ${pct(x.value)}`).join(", ")}. This channel reaches ${pct(measured)}, in the ${r.sizeBand} band.`);
  $("[data-ups]").setAttribute("aria-label", `Twelve uploads against the channel's own typical of ${nf.format(typ)} views; the best did ${best.multiple.toFixed(1)} times.`);
  $("[data-lab-typ]").textContent = `1× is ${short(typ)} views`;
  $("[data-ups-best]").textContent = `Best of the twelve: ${best.multiple.toFixed(1)}×, ${short(best.multiple * typ)} views.`;
  /* the bell follows the lab */
  const slot = slotOf(r.rating);
  if (slot !== youSlot) { youSlot = slot; if (bellPlayed) bell.setAll(1); else bell.draw(); }
  $("[data-bands]").innerHTML = BANDS.map((b, i) => `<li${b === r.band ? ' class="is"' : ""} style="--a:${atPct(EDGES[i])}%;--b:${atPct(EDGES[i + 1])}%">${b}</li>`).join("");
  $("[data-bell-cap]").textContent = `The rating runs from -3 to +3, and zero is the typical creator your size. The middle cells hold the most; this made-up channel sits at ${signedOf(r.rating)}, ${r.band}.`;
  bellCanvas.setAttribute("aria-label", `Twelve cells spanning the rating from -3 to +3. The two in the middle hold the most creators; the channel's cell, at ${signedOf(r.rating)}, is filled.`);
  clearTimeout(sayT);
  sayT = setTimeout(() => { $("[data-lab-say]").textContent = `${explain(r).split(/(?<=\.)\s/)[0]} Rated ${signedOf(r.rating)}, ${r.band}.`.replace(/^A typical upload from Your channel/, "A typical upload from your made-up channel").replace(/beats 100 in 100/, "beats 99 in 100").replace(/beats 0 in 100/, "beats 1 in 100"); }, 350);
}
for (const sl of [audSl, viewsSl]) sl.addEventListener("input", runLab);

/* ---------- 4. The Orbe Times ---------- */
let leadPlate = null;
const plateMoons = [];
function times() {
  const bm = benchmark("channel");
  const reachPart = fr.result.detail.parts.find((p) => p.key === "reach");
  const mine = bm.rows.find((r) => r.key === bm.example);
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1];
  const noun = SPECS.youtube.audienceNoun;
  $("[data-lead]").innerHTML = `
    <div class="lead-copy">
      <p class="kick small">Lead story, made up</p>
      <h3 class="dm serif lead-h">The middle reaches ${pct(mine.value)}. ${esc(fr.name)} reaches ${pct(reachPart.measured)}.</h3>
      <p class="lede serif lead-s">${esc(bm.what)}</p>
      <div class="lead-body serif">
        <p>For ${esc(fr.peers)} at ${esc(mine.label)} ${esc(noun)}, the typical upload reaches ${pct(mine.value)} of them. ${esc(fr.name)} sits at ${pct(reachPart.measured)}, which beats ${frLead} in 100 ${esc(fr.peers)} its size.</p>
        <p>Against the smallest ${esc(fr.peers)}, ${esc(lowerFirst(first.label))}, the typical is ${pct(first.value)}; against the largest, ${esc(lowerFirst(last.label))}, it is ${pct(last.value)}. That is why Orbe never rates a channel against a size it is not.</p>
      </div>
    </div>
    <figure class="lead-fig">
      <div class="newsprint"><div class="np-canvas"><canvas data-lead-plate role="img" aria-label="${esc(bm.title)}: ${bm.rows.map((r) => `${esc(r.label)} ${pct(r.value)}`).join(", ")}; ${esc(fr.name)} ${pct(reachPart.measured)}."></canvas></div>
        <ol class="np-vals" aria-hidden="true">${bm.rows.map((r, i) => `<li${r.key === bm.example ? ' class="is"' : ""} style="grid-column:${2 * i + 1}">${pct(r.value)}</li>`).join("")}<li class="you" style="grid-column:${2 * bm.rows.length + 1}">${pct(reachPart.measured)}</li></ol>
      </div>
      <figcaption class="small serif np-cap">${esc(bm.title)}, from the smallest, ${esc(lowerFirst(first.label))}, to the largest, ${esc(lowerFirst(last.label))}. The darkest bar is its own size, ${esc(mine.label)}; the last, in colour, is ${esc(fr.name)}.</figcaption>
    </figure>`;

  const story = (k, h, d) => {
    const x = example(k);
    const lead = leadOf(k, x);
    return `<article class="story">
      <figure class="np-photo"><div class="newsprint"><canvas class="moon moon-np" data-story="${lead.score}" role="img" aria-label="A moon lit to ${lead.score} in 100."></canvas></div><figcaption class="small serif np-cap">${esc(lead.name)}: ${lead.score} in 100 ${esc(x.peers)} its size.</figcaption></figure>
      <p class="kick small">Made up. ${esc(x.label)}, ${esc(x.sizeBand)}.</p>
      <h3 class="h5 serif">${esc(h)}</h3><p class="body-p serif">${esc(d)}</p></article>`;
  };
  const nl = example("newsletter"), st = example("stream"), pd = example("podcast"), pf = example("portfolio");
  const reachOf = (x) => x.result.parts.find((p) => p.key === "reach").score;
  const out = [];
  if (nl.card.sizeUp) out.push(story("newsletter", `${nl.name} moves up a size.`, `It now sits with newsletters of ${nl.card.sizeUp.to} ${SPECS.substack.audienceNoun}, one band up from ${nl.card.sizeUp.from}. Against its new rivals, it beats ${reachOf(nl)} in 100 on reach.`));
  if (st.card.personalBest) out.push(story("stream", `${st.name} breaks its own record.`, `Its ${st.card.personalBest.label}: ${st.card.personalBest.value}, up from ${st.card.personalBest.previous}. Rated ${st.signed}, ${st.band}.`));
  const mult = (pd.best.match(/([\d.]+)×/) || [])[1];
  if (mult) out.push(story("podcast", `One episode of ${pd.name} did ${mult}× a typical one.`, `The show is rated ${pd.signed}, ${pd.band}. ${firstSentence(pd, pd.parts[0])}`));
  out.push(story("portfolio", `${pf.name} lands in the middle: ${pf.signed}, ${pf.band}.`, `${firstSentence(pf, pf.parts[0])} Zero is typical, and the middle is where most good work lives.`));
  $("[data-stories]").innerHTML = out.join("");
  $("[data-times-fine]").textContent = `Every story in The Orbe Times is made up, about made-up creators rated live by the Orbe engine. ${BENCHMARK_LINE} Independently calculated by Orbe.`;

  /* the lead plate: seven bars on one cell grid, ink on newsprint, the creator's in colour */
  const bars = [...bm.rows.map((r) => ({ v: r.value, is: r.key === bm.example })), { v: reachPart.measured, you: true }];
  const PC = bars.length * 2 - 1, PR = 8, top = 0.4;
  const plateLook = (c, r) => {
    if (c % 2 === 1) return { base: null, ink: C.ink, from: 0, to: 0 };
    const b = bars[c / 2];
    const h = (b.v / top) * PR, rr = PR - 1 - r, f = Math.max(0, Math.min(1, h - rr));
    if (f <= 0) return { base: null, ink: C.ink, from: 0, to: 0 };
    const pitch = Math.max(3, (leadPlate ? leadPlate.cell : 30) * 0.14);
    if (b.you) return { base: null, ink: C.accent, pitch, angle: 45, dir: 270, from: f, to: f };
    const d = b.is ? 0.78 : 0.4;
    return { base: null, ink: C.ink, pitch, angle: 45, dir: 270, from: d * f, to: d * 0.7 * f };
  };
  leadPlate = createField($("[data-lead-plate]"), { cols: PC, rows: PR, look: plateLook });
  fitWidths();
  for (const cv of $$("canvas[data-story]")) plateMoons.push(cv);
  paintNewsprint();
}
/* labels and lines take the canvas's whole-cell width, so their edges meet the cells exactly */
function fitWidths() {
  if (leadPlate) $(".lead-fig .newsprint").style.setProperty("--cw", $("[data-lead-plate]").style.width);
  for (const cv of $$("[data-hist], [data-ups]")) cv.closest(".chart").style.setProperty("--cw", cv.style.width);
}
function paintNewsprint() {
  for (const cv of plateMoons) drawMoon(cv, { phase: +cv.dataset.story / 100, pitch: 4, body: C.ink, rim: C.graphite, ghost: 0.08 });
}

/* ---------- 5. money ---------- */
const gbp0 = (p) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(p / 100);
const kCompact = (p) => { const x = p / 100; return x >= 1e6 ? `£${+(x / 1e6).toFixed(2)}M` : `£${Math.round(x / 1000)}k`; };
const tiers = DEFAULT_FEE_SCHEDULE.tiers;
const tierName = (i) => { const t = tiers[i]; return t.upTo == null ? `${t.rateBps / 100}% above ${kCompact(tiers[i - 1].upTo)}` : i === 0 ? `${t.rateBps / 100}% up to ${kCompact(t.upTo)}` : `${t.rateBps / 100}% from ${kCompact(tiers[i - 1].upTo)} to ${kCompact(t.upTo)}`; };
const tierText = tiers.map((t, i) => (t.upTo == null ? `${t.rateBps / 100}% above` : tierName(i))).join(", ");
const prem = DEFAULT_BUYER_PREMIUM.tiers;
$("[data-sale-terms]").textContent = `${tierText}, ${gbp0(DEFAULT_FEE_SCHEDULE.minimum)} minimum.`;
$("[data-buy-terms]").textContent = `Free, vetted access. A ${prem[0].rateBps / 100}% buyer's premium at completion, ${prem[1].rateBps / 100}% above ${kCompact(prem[0].upTo)}, ${gbp0(DEFAULT_BUYER_PREMIUM.minimum)} minimum. Diligence reports included; ${gbp0(TAKE_RATE.buyers.report.standard)} only if you walk away after one, never if it shows the listing was wrong.`;
$("[data-sp-net]").textContent = `${DEFAULT_TAKE_RATE.networkBps / 100}%`;
$("[data-sp-dir]").textContent = `${DEFAULT_TAKE_RATE.directBps / 100}%`;
const feeMoonPhase = { sp: DEFAULT_TAKE_RATE.networkBps / 10000, sale: tiers[0].rateBps / 10000 };
$("[data-fee-moon='sp']").setAttribute("aria-label", `A moon lit to ${DEFAULT_TAKE_RATE.networkBps / 100} in 100, the rate when Orbe finds the brand.`);
$("[data-fee-moon='sale']").setAttribute("aria-label", `A moon lit to ${tiers[0].rateBps / 100} in 100, the first tier.`);
const paintFeeMoons = () => { for (const cv of $$("[data-fee-moon]")) drawMoon(cv, { phase: feeMoonPhase[cv.dataset.feeMoon], pitch: smallPitch, body: C.accent, rim: C.ink }); };

/* the sale: a field of 100 cells is the whole price; the fee peels off by tier */
const priceIn = $("[data-price]");
const LO = 20000, HI = 5000000;
const priceAt = (v) => { const raw = LO * Math.pow(HI / LO, v / 1000); const step = raw < 100000 ? 1000 : raw < 1000000 ? 10000 : 50000; return Math.round(raw / step) * step; };
const vOfPrice = (p) => Math.round((Math.log(p / LO) / Math.log(HI / LO)) * 1000);
let price = 1200000;
priceIn.value = String(vOfPrice(price));
let feeCells = { you: 100, tiers: [] };
let feeField = null;
const TIER_DENSITY = [[0.9, 0.62], [0.55, 0.3], [0.28, 0.1]];
const feeSig = new Map();
function feeLook(c, r, p) {
  const k = r * 10 + c;
  const pitch = feeField ? feeField.cell * 0.1 : 3.6;
  const idle = { base: C.chalk, ink: C.ink, pitch, angle: 45, dir: 45, from: 0.12, to: 0.02 };
  let fin;
  if (k < feeCells.you) fin = { base: C.accent, ink: C.accent, from: 1, to: 1 };
  else {
    let j = feeCells.you;
    for (const t of feeCells.tiers) { if (k < j + t.cells) { const [a, b] = TIER_DENSITY[Math.min(2, t.i)]; fin = { base: C.chalk, ink: C.ink, from: a, to: b }; break; } j += t.cells; }
  }
  if (!fin || p <= 0) return idle;
  if (p >= 1) return { ...fin, pitch, angle: 45, dir: 45 };
  return { base: mix(C.chalk, fin.base, p), ink: mix(C.ink, fin.ink, p), pitch, angle: 45, dir: 45, from: lerp(idle.from, fin.from, p), to: lerp(idle.to, fin.to, p) };
}
feeField = createField($("[data-fee]"), { cols: 10, rows: 10, look: (c, r, p) => feeLook(c, r, p) });
const fitBand = (fig, canvas) => fig.style.setProperty("--fw", canvas.style.width);
fitBand($("#p-fee"), $("[data-fee]"));
function settleOnly(f, look, cache, target) {
  for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++) {
    const p = target(c, r), key = c + "," + r, s = JSON.stringify(look(c, r, p));
    if (cache.get(key) === s && f.get(c, r) === p) continue;
    cache.set(key, s); f.set(c, r, p);
  }
}
let feePlayed = reduce, feeRun = [];
function computeFee() {
  const sale = { amount: price * 100, currency: "GBP" };
  const f = successFee(sale);
  const pr = buyerPremium(sale);
  /* cells round down to whole percentages and the remainder goes to the creator, never to the fee */
  const total = Math.floor(f.effectiveRateBps / 100);
  const parts = f.minimumApplied ? [{ i: 0, exact: total }] : f.slices.map((s, i) => ({ i, exact: (s.fee / sale.amount) * 100 }));
  let cells = parts.map((x) => ({ i: x.i, cells: Math.floor(x.exact), rem: x.exact - Math.floor(x.exact) }));
  let left = total - cells.reduce((a, x) => a + x.cells, 0);
  for (const x of [...cells].sort((a, b) => b.rem - a.rem)) { if (left <= 0) break; x.cells++; left--; }
  cells = cells.filter((x) => x.cells > 0);
  feeCells = { you: 100 - total, tiers: cells };
  return { f, pr, sale };
}
function showPrice() {
  const { f, pr, sale } = computeFee();
  priceIn.style.setProperty("--p", `${priceIn.value / 10}%`);
  $("[data-price-out]").textContent = gbp0(sale.amount);
  priceIn.setAttribute("aria-valuetext", gbp0(sale.amount));
  const eff = (f.effectiveRateBps / 100).toFixed(2).replace(/\.?0+$/, "");
  $("[data-sale-rows]").innerHTML = [
    ["You receive", gbp0(sale.amount - f.fee.amount)],
    ["Orbe's seller fee, from the proceeds", gbp0(f.fee.amount)],
    ["Effective rate", `${eff}%`],
    ["The buyer's premium, paid by the buyer", gbp0(pr.fee.amount)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  const key = f.minimumApplied
    ? [{ d: TIER_DENSITY[0], name: `The ${gbp0(DEFAULT_FEE_SCHEDULE.minimum)} minimum applies`, v: f.fee.amount }]
    : f.slices.map((s, i) => ({ d: TIER_DENSITY[Math.min(2, i)], name: tierName(i), v: s.fee }));
  $("[data-key]").innerHTML = key.map((x) => `<li><canvas class="swatch" data-sw="${x.d.join(",")}"></canvas><span>${esc(x.name)}</span><b>${gbp0(x.v)}</b></li>`).join("");
  paintSwatches();
  $("[data-fee]").setAttribute("aria-label", `A field of 100 cells, the whole sale price of ${gbp0(sale.amount)}. ${feeCells.you} solid cells go to the creator; ${100 - feeCells.you} cells in grey dots are Orbe's fee, split by tier.`);
  $("[data-fee-cap]").innerHTML = f.minimumApplied
    ? `Fees by tier: <span>${feeCells.you} cells of the sale move to you; below the tiers, the ${gbp0(f.fee.amount)} minimum applies.</span>`
    : `Fees by tier: <span>${feeCells.you} cells of the sale move to you, and each tier keeps only its own slice.</span>`;
  if (feePlayed) { feeRun.forEach((r) => r.cancel()); feeRun = []; settleOnly(feeField, feeLook, feeSig, () => 1); }
  else feeField.draw();
}
function paintSwatches() { for (const cv of $$("[data-sw]")) { const [a, b] = cv.dataset.sw.split(",").map(Number); drawBlock(cv, { base: C.chalk, ink: C.ink, pitch: 3, angle: 45, dir: 45, from: a, to: b }); } }
priceIn.addEventListener("input", () => { price = priceAt(+priceIn.value); showPrice(); });
function playFee() {
  feePlayed = true;
  feeField.setAll(0);
  const you = [], fee = [];
  for (let k = 0; k < 100; k++) (k < feeCells.you ? you : fee).push([k % 10, Math.floor(k / 10)]);
  feeRun = [spread(feeField, { order: you, to: 1, duration: 330, stagger: 5, easing: easeUi, reduce })];
  /* the fee settles 300ms after the money has moved */
  setTimeout(() => feeRun.push(spread(feeField, { order: fee, to: 1, duration: 330, stagger: 30, easing: easeUi, reduce })), you.length * 5 + 300);
}

/* buyers: every example, by size, each moon lit by its reach score */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  const reach = x.result.parts.find((p) => p.key === "reach").score;
  return `<tr><td class="m"><canvas class="moon moon-s" data-roll-p="${reach}" role="img" aria-label="Reach ${reach} in 100"></canvas></td><td>${esc(span)}<small>${esc(unit)}</small></td><td>${esc(x.name)}<small>${esc(x.label)}</small></td><td class="num"><span class="fig">${esc(x.signed)}</span><small>${esc(x.band)}</small></td></tr>`;
}).join("");
const paintRoll = () => { for (const cv of $$("[data-roll-p]")) drawMoon(cv, { phase: +cv.dataset.rollP / 100, pitch: smallPitch, body: C.accent, rim: C.ink }); };

/* ---------- 6. the close: a new moon, waiting for a handle ---------- */
const nextMoon = $("[data-moon-next]");
const paintNext = () => drawMoon(nextMoon, { phase: 0, pitch: bp() === "m" ? 6 : 8, body: C.accent, rim: C.ink, ghost: 0.12 });

const handleOf = (v) => cleanHandle(v).toLowerCase();
const handles = $$("[data-handle]");
for (const h of handles) h.addEventListener("input", () => { $("[data-mirror]").textContent = handleOf(h.value) || "yourhandle"; });
for (const s of $$("[data-kind]")) s.addEventListener("change", () => setKind(s.value));
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]");
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; input.focus(); return; }
    input.value = h;
    $("[data-mirror]").textContent = h;
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email app has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}

/* ---------- start ---------- */
setKind("channel");
runLab();
times();
showPrice();
paintFeeMoons();
paintRoll();
paintNext();

/* motion: each piece plays once, on entering view; with reduced motion everything is drawn final */
const plays = new Map([
  [$("#p-yard"), (el) => playYard(el)],
  [$(".bell"), () => playBell()],
  [$("#p-fee"), () => playFee()],
]);
if (reduce) {
  for (const [el] of plays) el.classList.add("run");
  bell.setAll(1);
  showPrice();
} else {
  paintYard(0);
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { plays.get(en.target)?.(en.target); io.unobserve(en.target); }
  }, { threshold: 0.4 });
  for (const [el] of plays) io.observe(el);
}

function redrawAll() {
  if (heroDone) drawMoon(heroMoon, heroOpts());
  paintYard(yardPlayed ? 1 : 0);
  paintParts(); paintFeeMoons(); paintRoll(); paintNext(); paintNewsprint(); paintSwatches();
  feeSig.clear();
  bell.layout(); hist.layout(); ups.layout(); leadPlate.layout(); feeField.layout();
  if (bellPlayed) bell.setAll(1);
  if (feePlayed) settleOnly(feeField, feeLook, feeSig, () => 1);
  fitBell(); fitBand($("#p-fee"), $("[data-fee]")); fitWidths();
  runLab();
}
let rt = 0, lastW = innerWidth;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; redrawAll(); } }, 120); });
if (document.fonts) document.fonts.ready.then(waxHero); else waxHero();
