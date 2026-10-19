/* Orbe r8-a. Every figure on the page comes from the engine at runtime. */
import { example, benchmark, ORDER, EXAMPLE_LINE } from "../assets/r5/examples.js";
import { SPECS } from "../assets/engine/rating/browser.js";
import { suspiciousCreator } from "../assets/engine/record/browser.js";
import { successFee, buyerPremium, DEFAULT_FEE_SCHEDULE, DEFAULT_BUYER_PREMIUM, TAKE_RATE } from "../assets/engine/market/browser.js";
import { DEFAULT_TAKE_RATE } from "../assets/engine/sponsor/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField, spread, drawBlock, rng, mix, lerp } from "../fx/halftone.js";
import { buildOrb, drawOrb } from "./orb.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const still = new URLSearchParams(location.search).has("still");
let reduce = still;
try { reduce = reduce || matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
/* the canvases ease with the same curve as the UI: ease-out-quad */
const easeUi = (t) => t * (2 - t);
const linear = (t) => t;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const colours = () => ({
  ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", stone: "#A29E95",
  accent: css("--accent") || "#1F4BFF", field: css("--field") || "#9EE9FB", tint: css("--field-tint") || "#D6F6FD",
});
let C = colours();

/* ---------- the example, from the engine ---------- */
const e = example("channel");
const spec = SPECS[e.platform];
const part = e.result.detail.parts.find((p) => p.key === "reach");
const prior = spec.parts.find((p) => p.key === "reach").prior;
const own = e.result.parts.find((p) => p.key === "reach").score;
const bm = benchmark("channel");
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const beatsAt = (measured, key) => Math.max(1, Math.min(99, Math.round(phi(Math.log(measured / prior.median[key]) / prior.sigma) * 100)));
const beats = (row) => (row.key === bm.example ? own : beatsAt(part.measured, row.key));
const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
const say = (n) => (n >= 97 ? "a genius" : n >= 75 ? "great" : n >= 45 ? "ordinary" : "weak");
const fact = (e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain])[0].split(/, (?:which beats|better than)/)[0].trim().replace(/\.$/, "") + ".";
const said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;

const bind = {
  lead: String(own), peers: e.peers, name: e.name, fact, signed: e.signed, band: e.band,
  said: `“${said}”`, handle: e.handle, line: EXAMPLE_LINE,
};
for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];
$("[data-yard-why]").innerHTML = `Against small ${esc(e.peers)}, ${say(beats(first))}. Against the giants, ${say(beats(last))}. <b class="ink">Neither is fair.</b>`;

/* ---------- scheme ---------- */
const schemeBtns = $$("[data-scheme-btn]");
function setScheme(s, save) {
  document.documentElement.dataset.scheme = s;
  schemeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.schemeBtn === s)));
  C = colours();
  if (save) {
    try { localStorage.setItem("orbe-r8a-scheme", s); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", s); history.replaceState(null, "", u); } catch {}
  }
  redrawAll();
}
schemeBtns.forEach((b) => b.addEventListener("click", () => setScheme(b.dataset.schemeBtn, true)));

/* ---------- wordmarks: still, never animated ---------- */
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

/* ---------- 1. the hero orb: filled to the score, once ---------- */
const orbCanvas = $("[data-orb]");
const orbCell = () => (innerWidth >= 1280 ? [8, 62] : innerWidth >= 768 ? [8, 46] : [6, 42]);
let orbModel = null, orbT = reduce ? 1 : 0;
function paintOrb() {
  const [cell, n] = orbCell();
  if (!orbModel || orbModel.n !== n) orbModel = buildOrb(n);
  orbCanvas.width = 0;
  drawOrb(orbCanvas, orbModel, { cell, score: own, t: orbT, colours: { body: C.accent, rim: C.ink, glint: C.paper } });
}
orbCanvas.setAttribute("aria-label", `An orb filled to ${own} in 100: ${e.name} beats ${own} in 100 ${e.peers} its size on reach.`);
paintOrb();
function fillOrb() {
  if (reduce) { orbT = 1; paintOrb(); return; }
  const start = performance.now() + 600, dur = 900;
  const [cell] = orbCell();
  const tick = (now) => {
    const t = Math.max(0, Math.min(1, (now - start) / dur));
    orbT = linear(t);
    drawOrb(orbCanvas, orbModel, { cell, score: own, t: orbT, colours: { body: C.accent, rim: C.ink, glint: C.paper } });
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- 2a. the yardstick diff ---------- */
const row = (cls, mark, text) => `<li class="${cls}" data-m="${mark}"><span class="t">${esc(text)}</span></li>`;
$("[data-diff-yard]").innerHTML = [
  row("del", "-", `"${first.label}": ${beats(first)},`),
  row("del", "-", `"${last.label}": ${beats(last)},`),
  row("add", "+", `"${mine.label}": ${beats(mine)}`),
].join("");
$("[data-diff-yard]").setAttribute("aria-label", `Reach for ${e.name}: against ${first.label} ${e.peers} it beats ${beats(first)} in 100, against ${last.label} ${beats(last)} in 100; neither is fair. Against its own size, ${mine.label}, it beats ${beats(mine)} in 100.`);
$("[data-ghost-yard]").textContent = String(own);

/* Redraw only the cells whose final look changed, so a slider stays under a frame or two. */
const fieldSig = new Map(), feeSig = new Map();
function settleOnly(f, look, cache, target) {
  for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++) {
    const p = target(c, r), key = c + "," + r, sig = JSON.stringify(look(c, r, p));
    if (cache.get(key) === sig && f.get(c, r) === p) continue;
    cache.set(key, sig); f.set(c, r, p);
  }
}

/* ---------- 2b. the 93 field, and a slider that rates a typical upload ---------- */
const COLS = 10, ROWS = 10;
const rand = rng(93);
const rank = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) rank.push({ c, r, d: Math.hypot(c, ROWS - 1 - r) + rand() * 1.6, dir: [45, 135, 315, 225, 90, 0][Math.floor(rand() * 6)] });
rank.sort((a, b) => a.d - b.d);
const rankOf = new Map(rank.map((x, k) => [x.c + "," + x.r, { k, dir: x.dir }]));
let beaten = own;
const finFor = (k) => {
  if (k < beaten) {
    const depth = beaten > 1 ? k / (beaten - 1) : 0;
    if (depth < 0.52) return { base: C.accent, ink: C.accent, from: 1, to: 1 };
    if (depth < 0.8) return { base: C.field, ink: C.accent, from: 0.92, to: lerp(0.5, 0.2, (depth - 0.52) / 0.28) };
    return { base: C.tint, ink: C.accent, from: 0.55, to: 0.04 };
  }
  if (k === beaten) return { base: "#FF5A1F", ink: "#FF5A1F", from: 1, to: 1 };
  return null;
};
let field;
const fieldLook = (c, r, p) => {
  const L = rankOf.get(c + "," + r);
  const pitch = (field ? field.cell : 36) * 0.1;
  const idle = { base: C.chalk, ink: C.ink, pitch, angle: 45, dir: L.dir, from: L.k > beaten ? 0.42 : 0.16, to: 0.02 };
  const f = finFor(L.k);
  if (!f || p <= 0) return idle;
  if (p >= 1) return { ...f, pitch, angle: 45, dir: L.dir };
  const q = Math.min(1, p * 2), w = Math.max(0, p * 2 - 1);
  return { base: mix(C.chalk, f.base === f.ink ? (L.k === beaten ? "#FF5A1F" : C.field) : f.base, q), ink: mix(C.ink, f.ink, q), pitch, angle: 45, dir: L.dir, from: lerp(idle.from * (1 - q), f.from, w), to: lerp(idle.to * (1 - q), f.to, w) };
};
const fieldCanvas = $("[data-field]");
field = createField(fieldCanvas, { cols: COLS, rows: ROWS, look: fieldLook });
const fitBand = (fig, canvas) => fig.style.setProperty("--fw", canvas.style.width);
fitBand($("#p-field"), fieldCanvas);
let fieldRun = null, fieldPlayed = false;
function setBeaten(n) {
  beaten = n;
  if (fieldRun) { fieldRun.cancel(); fieldRun = null; }
  if (fieldPlayed || reduce) settleOnly(field, fieldLook, fieldSig, (c, r) => (rankOf.get(c + "," + r).k <= beaten ? 1 : 0));
  else field.draw();
  fieldCanvas.setAttribute("aria-label", `A field of 100 cells, one for every 100 ${e.peers} its size. ${n} fill in blue, one for each it beats; one orange cell is ${e.name}; ${99 - n} are ahead.`);
  $("[data-field-cap]").innerHTML = `Beats ${n} in 100: <span>blue spreads through the ${esc(e.peers)} its size, and stops at ${esc(e.name)}.</span>`;
}
function playField() {
  fieldPlayed = true;
  field.setAll(0);
  const order = rank.slice(0, beaten + 1).map((x) => [x.c, x.r]);
  fieldRun = spread(field, { order, to: 1, duration: 330, stagger: 6, easing: easeUi, reduce });
}

/* the slider: a typical upload's reach, as a share of subscribers, on a log scale from 1% to 100% */
const reachIn = $("[data-reach]");
const shareAt = (v) => 0.01 * Math.pow(100, v / 1000);
const vAt = (s) => Math.round((Math.log(s / 0.01) / Math.log(100)) * 1000);
let share = part.measured;
reachIn.value = String(vAt(share));
const pct = (s) => `${s >= 0.1 ? Math.round(s * 100) : (Math.round(s * 1000) / 10).toString()}%`;
function showReach(fromUser) {
  const n = fromUser ? beatsAt(share, mine.key) : own;
  reachIn.style.setProperty("--p", `${reachIn.value / 10}%`);
  $("[data-reach-out]").textContent = `${pct(share)} of subscribers`;
  reachIn.setAttribute("aria-valuetext", `${pct(share)} of subscribers`);
  $("[data-reach-res]").textContent = `Beats ${n} in 100 ${e.peers} its size.`;
  setBeaten(n);
}
reachIn.addEventListener("input", () => { share = shareAt(+reachIn.value); showReach(true); });
showReach(false);

/* ---------- 3. zero is typical: a bell drawn in dots ---------- */
const BANDS = ["Poor", "Subpar", "Average", "Good", "Great"];
const EDGES = [-3, -2, -0.8, 0.8, 2, 3];
const SLOTS = 12;
const mass = Array.from({ length: SLOTS }, (_, i) => phi(-3 + (i + 1) * 0.5) - phi(-3 + i * 0.5));
const peak = Math.max(...mass);
const youSlot = Math.max(0, Math.min(SLOTS - 1, Math.floor((Math.max(-3, Math.min(2.999, e.rating)) + 3) / 0.5)));
const bellLook = (c, r, p) => {
  const pitch = (bell ? bell.cell : 40) * 0.1;
  if (c === youSlot) return { base: mix(C.ink, C.field, p), ink: C.field, pitch, angle: 45, dir: 90, from: 1, to: 1 };
  const d = (mass[c] / peak) * 0.86 * p;
  return { base: C.ink, ink: C.paper, pitch, angle: 45, dir: 90, from: d, to: d * 0.35 };
};
let bell = null;
const bellCanvas = $("[data-bell]");
bell = createField(bellCanvas, { cols: SLOTS, rows: 1, look: bellLook });
const fitBell = () => $(".bell").style.setProperty("--bw", bellCanvas.style.width);
fitBell();
bellCanvas.setAttribute("aria-label", `Twelve cells spanning the rating from -3 to +3. The two in the middle hold the most creators; ${e.name}'s cell, at ${e.signed}, is filled.`);
$("[data-bell-cap]").textContent = `The rating runs from -3 to +3, and zero is the typical creator your size. The middle cells hold the most; ${e.name} sits at ${e.signed}, ${e.band}.`;
const at = (v) => ((v + 3) / 6) * 100;
$("[data-bands]").innerHTML = BANDS.map((b, i) => `<li${b === e.band ? ' class="is"' : ""} style="--a:${at(EDGES[i])}%;--b:${at(EDGES[i + 1])}%">${b}</li>`).join("");
function playBell() {
  bell.setAll(0);
  /* density rises from the two ends toward the middle, then the creator's cell closes */
  const order = [];
  for (let i = 0; i < SLOTS / 2; i++) { order.push([i, 0]); order.push([SLOTS - 1 - i, 0]); }
  const rest = order.filter(([c]) => c !== youSlot);
  spread(bell, { order: [...rest, [youSlot, 0]], to: 1, duration: 330, stagger: 40, easing: easeUi, reduce });
}

/* copy the line: a short check on the button itself */
const copyBtn = $("[data-copy]");
copyBtn.addEventListener("click", async () => {
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  try { await navigator.clipboard.writeText(text); copyBtn.textContent = "Copied"; }
  catch { $("[data-copied]").textContent = text; copyBtn.textContent = "Select and copy below"; }
  setTimeout(() => { copyBtn.textContent = "Copy the line"; }, 2000);
});

/* ---------- 4a. read from payouts: the record engine's made-up channel ---------- */
const nova = suspiciousCreator();
const month = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
const ads = nova.revenue.filter((l) => l.month === month && l.stream === "ads");
const est = ads.find((l) => l.provenance.source === "youtube_analytics");
const paid = ads.find((l) => l.provenance.source === "adsense");
const gbp = (p) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const gbp0 = (p) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(p / 100);
const monthName = new Date(month).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const ratio = est.gross.amount / paid.gross.amount;
$("[data-diff-pay]").innerHTML = [
  row("del", "-", `"estimate": "${gbp(est.gross.amount)}",`),
  row("add", "+", `"paid_out": "${gbp(paid.gross.amount)}"`),
].join("");
$("[data-diff-pay]").setAttribute("aria-label", `Ad revenue for ${monthName}: YouTube's estimate of ${gbp(est.gross.amount)} is struck out; the AdSense payout of ${gbp(paid.gross.amount)} is the figure on the record.`);
$("[data-ghost-pay]").textContent = `${ratio.toFixed(1)}×`;
const novaName = (nova.accounts.find((a) => a.kind === "youtube")?.title ?? "Nova Plays").replace(/\s*\(fixture\)/, "");
$("[data-pay-note]").textContent = `Ads, ${monthName}. ${novaName}, a made-up channel from the record engine: YouTube's estimate ran ${ratio.toFixed(1)} times what AdSense paid.`;
const blocks = () => { for (const b of $$("[data-block]")) drawBlock(b, { base: null, ink: C.ink, pitch: 4, angle: 45, dir: 90, from: 0.62, to: 0.04 }); };

/* sponsorships, from the sponsor engine's take rate */
$("[data-sp-net]").textContent = `${DEFAULT_TAKE_RATE.networkBps / 100}%`;
$("[data-sp-dir]").textContent = `${DEFAULT_TAKE_RATE.directBps / 100}%`;

/* ---------- 4b. price a sale: the fee tiers ---------- */
const tiers = DEFAULT_FEE_SCHEDULE.tiers;
const kCompact = (p) => { const x = p / 100; return x >= 1e6 ? `£${+(x / 1e6).toFixed(2)}M` : `£${Math.round(x / 1000)}k`; };
const tierText = tiers.map((t, i) => (t.upTo == null ? `${t.rateBps / 100}% above` : i === 0 ? `${t.rateBps / 100}% up to ${kCompact(t.upTo)}` : `${t.rateBps / 100}% from ${kCompact(tiers[i - 1].upTo)} to ${kCompact(t.upTo)}`)).join(", ");
$("[data-sale-terms]").textContent = `${tierText}, ${gbp0(DEFAULT_FEE_SCHEDULE.minimum)} minimum, from the proceeds. Nothing if it doesn't sell.`;
const bp = DEFAULT_BUYER_PREMIUM.tiers;
const walk = TAKE_RATE.buyers.report.standard;
$("[data-buy-terms]").textContent = `Free, vetted access. A ${bp[0].rateBps / 100}% buyer's premium at completion, ${bp[1].rateBps / 100}% above ${kCompact(bp[0].upTo)}, ${gbp0(DEFAULT_BUYER_PREMIUM.minimum)} minimum. Diligence reports included; ${gbp0(walk)} only if you walk away after one.`;

const priceIn = $("[data-price]");
const LO = 20000, HI = 5000000;
const priceAt = (v) => { const raw = LO * Math.pow(HI / LO, v / 1000); const step = raw < 100000 ? 1000 : raw < 1000000 ? 10000 : 50000; return Math.round(raw / step) * step; };
const vOfPrice = (p) => Math.round((Math.log(p / LO) / Math.log(HI / LO)) * 1000);
let price = 1200000;
priceIn.value = String(vOfPrice(price));

let feeCells = { you: 100, tiers: [] };
let feeField = null;
feeField = createField($("[data-fee]"), { cols: 10, rows: 10, look: (c, r, p) => feeLook(c, r, p) });
fitBand($("#p-fee"), $("[data-fee]"));
const TIER_DENSITY = [[0.9, 0.62], [0.55, 0.3], [0.28, 0.1]];
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
let feePlayed = false, feeRun = [];
function computeFee() {
  const sale = { amount: price * 100, currency: "GBP" };
  const f = successFee(sale);
  const prem = buyerPremium(sale);
  /* cells round down to whole percentages and the remainder goes to the creator, never to the fee */
  const total = Math.floor(f.effectiveRateBps / 100);
  let parts;
  if (f.minimumApplied) parts = [{ i: 0, exact: total }];
  else parts = f.slices.map((s, i) => ({ i, exact: (s.fee / sale.amount) * 100 }));
  let cells = parts.map((p) => ({ i: p.i, cells: Math.floor(p.exact), rem: p.exact - Math.floor(p.exact) }));
  let left = total - cells.reduce((a, x) => a + x.cells, 0);
  for (const x of [...cells].sort((a, b) => b.rem - a.rem)) { if (left <= 0) break; x.cells++; left--; }
  cells = cells.filter((x) => x.cells > 0);
  feeCells = { you: 100 - total, tiers: cells };
  return { f, prem, sale };
}
function showPrice() {
  const { f, prem, sale } = computeFee();
  priceIn.style.setProperty("--p", `${priceIn.value / 10}%`);
  $("[data-price-out]").textContent = gbp0(sale.amount);
  priceIn.setAttribute("aria-valuetext", gbp0(sale.amount));
  const flat = Math.round(sale.amount * tiers[0].rateBps / 10000);
  let rows;
  if (f.minimumApplied) rows = [row("del", "-", `"${tiers[0].rateBps / 100}% of ${kCompact(sale.amount)}": "${gbp0(flat)}",`), row("add", "+", `"minimum": "${gbp0(f.fee.amount)}"`)];
  else if (f.slices.length > 1) rows = [row("del", "-", `"flat ${tiers[0].rateBps / 100}%": "${gbp0(flat)}",`), row("add", "+", `"tiered": "${gbp0(f.fee.amount)}"`)];
  else rows = [row("add", "+", `"${tiers[0].rateBps / 100}% of ${kCompact(sale.amount)}": "${gbp0(f.fee.amount)}"`)];
  const d = $("[data-diff-fee]");
  d.innerHTML = rows.join("");
  d.setAttribute("aria-label", f.minimumApplied ? `On ${gbp0(sale.amount)}, ${tiers[0].rateBps / 100}% would be ${gbp0(flat)}; the ${gbp0(f.fee.amount)} minimum applies.` : f.slices.length > 1 ? `A flat ${tiers[0].rateBps / 100}% would take ${gbp0(flat)}; the tiered fee is ${gbp0(f.fee.amount)}.` : `The fee is ${gbp0(f.fee.amount)}.`);
  const eff = (f.effectiveRateBps / 100).toFixed(2).replace(/\.?0+$/, "");
  $("[data-sale-rows]").innerHTML = [
    ["Orbe's fee, from the proceeds", gbp0(f.fee.amount)],
    ["Effective rate", `${eff}%`],
    ["You keep", gbp0(sale.amount - f.fee.amount)],
    ["Buyer's premium, paid by the buyer", gbp0(prem.fee.amount)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  const tierWords = f.minimumApplied ? "the minimum" : feeCells.tiers.map((t) => `${tiers[t.i].rateBps / 100}%`).join(", ");
  $("[data-fee]").setAttribute("aria-label", `A field of 100 cells, the whole sale price of ${gbp0(sale.amount)}. ${feeCells.you} cells in blue go to the creator; ${100 - feeCells.you} cells in grey dots are Orbe's fee, split by tier (${tierWords}).`);
  $("[data-fee-cap]").innerHTML = f.minimumApplied
    ? `Fees by tier: <span>${feeCells.you} cells of the sale move to you in blue; below the tiers, the ${gbp0(f.fee.amount)} minimum applies.</span>`
    : `Fees by tier: <span>${feeCells.you} cells of the sale move to you in blue; each tier keeps only its own slice.</span>`;
  if (feePlayed || reduce) { feeRun.forEach((r) => r.cancel()); feeRun = []; settleOnly(feeField, feeLook, feeSig, () => 1); }
  else feeField.draw();
}
priceIn.addEventListener("input", () => { price = priceAt(+priceIn.value); showPrice(); });
showPrice();
function playFee() {
  feePlayed = true;
  feeField.setAll(0);
  const you = [], fee = [];
  for (let k = 0; k < 100; k++) (k < feeCells.you ? you : fee).push([k % 10, Math.floor(k / 10)]);
  feeRun = [spread(feeField, { order: you, to: 1, duration: 330, stagger: 5, easing: easeUi, reduce })];
  /* the fee settles 300ms after the money has moved */
  setTimeout(() => feeRun.push(spread(feeField, { order: fee, to: 1, duration: 330, stagger: 30, easing: easeUi, reduce })), reduce ? 0 : you.length * 5 + 300);
}

/* ---------- 4c. buyers: every example, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  return `<tr><td>${esc(span)}<small>${esc(unit)}</small></td><td>${esc(x.name)}<small>${esc(x.label)}</small></td><td class="num">${esc(x.signed)}<small>${esc(x.band)}</small></td></tr>`;
}).join("");

/* ---------- 5. reserve ---------- */
const handleOf = (v) => cleanHandle(v).toLowerCase();
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]");
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; input.focus(); return; }
    input.value = h;
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email app has opened with the request for @${h}. Send it and the handle is held.`;
  });
}

/* ---------- motion: each piece plays once, on entering view ---------- */
const plays = new Map([
  [$("#p-yard"), (el) => el.classList.add("run")],
  [$("#p-pay"), (el) => el.classList.add("run")],
  [$("#p-field"), () => playField()],
  [$(".bell"), () => playBell()],
  [$("#p-fee"), () => playFee()],
]);
if (reduce) {
  for (const [el] of plays) el.classList.add("run");
  fieldPlayed = feePlayed = true;
  showReach(false); showPrice();
  bell.setAll(1);
} else {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { plays.get(en.target)?.(en.target); io.unobserve(en.target); }
  }, { threshold: 0.4 });
  for (const [el] of plays) io.observe(el);
}

function redrawAll() {
  paintOrb();
  blocks();
  fieldSig.clear(); feeSig.clear();
  field.layout(); bell.layout(); feeField.layout();
  fitBand($("#p-field"), fieldCanvas); fitBand($("#p-fee"), $("[data-fee]")); fitBell();
}
blocks();
let rt = 0, lastW = innerWidth;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; redrawAll(); } }, 120); });
if (document.fonts) document.fonts.ready.then(() => { blocks(); fillOrb(); }); else fillOrb();
