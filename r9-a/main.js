/* Orbe r9-a: The Hundred and The Months. Every figure is computed here, at runtime, by the Orbe engine. */
import { example, benchmark, ORDER, EXAMPLE_LINE, BENCHMARK_LINE } from "../assets/r5/examples.js";
import { SPECS, MODEL_VERSION } from "../assets/engine/rating/browser.js";
import { TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { settle, feeTermsFor } from "../assets/engine/sponsor/browser.js";
import { buildRecord, cleanCreator, suspiciousCreator, FIXTURE_NOW } from "../assets/engine/record/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createTray, loadThree, levelFor } from "./tray.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const moving = root.classList.contains("move");
const query = new URLSearchParams(location.search);
/* ?frames: the drop plays against a clock the recorder steps (window.orbeStep), for frame strips. */
if (query.has("frames")) { let vt = 0; window.orbeClock = () => vt; window.orbeStep = (ms) => { vt += ms; }; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const gbp = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" });
const gbp2 = (pence) => "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (bps) => `${+(bps / 100).toFixed(2)}%`;
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const clampScore = (n) => Math.max(1, Math.min(99, Math.round(n)));

/* ---------- the normal curve the engine's priors use ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* ================================================================ chrome */
mountWordmark($("[data-wordmark]"), { animate: moving });
mountWordmark($("[data-wordmark-foot]"), { animate: false });
const nav = $(".nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ================================================================ 1. the hundred */
const PICK = { channel: "Channel", newsletter: "Newsletter", stream: "Stream", podcast: "Podcast", portfolio: "Photos" };
const SINGULAR = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "show", portfolio: "portfolio" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");

/* everything the tray and its labels need for one kind, from the engine */
function standing(k) {
  const e = example(k);
  const key = leadKey(k);
  const spec = SPECS[e.platform];
  const part = e.result.detail.parts.find((p) => p.key === key);
  const own = e.result.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const bm = benchmark(k);
  const banded = typeof prior.median === "object";
  const beatsAt = (row) => (row.key === bm.example ? own.score : clampScore(phi(Math.log(part.measured / prior.median[row.key]) / prior.sigma) * 100));
  const mine = bm.rows.find((r) => r.key === bm.example);
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1];
  return {
    k, e, key, part: own, n: clampScore(own.score), peers: e.peers, band: mine?.label ?? e.sizeBand,
    banded, small: { label: first.label, n: beatsAt(first) }, big: { label: last.label, n: beatsAt(last) },
  };
}

const kindsEl = $("[data-kinds]");
kindsEl.innerHTML = ORDER.map((k) => `<button type="button" data-k="${k}" aria-pressed="${k === "channel"}">${PICK[k]}</button>`).join("");

const trayFig = $("[data-tray]");
const trayBox = $("[data-tray-box]");
const canvas = $("[data-tray-canvas]");
const scaleEl = $("[data-scale]");
const youTag = $("[data-you-tag]");
let current = "channel";
let tray = null;

/* ---------- sound: off until asked for; every sample varies a little ---------- */
let audio = null, soundOn = false;
const soundBtn = $("[data-sound]");
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  soundBtn.textContent = soundOn ? "Sound on" : "Sound off";
  if (soundOn && !audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } }
  if (audio && audio.state === "suspended") audio.resume();
});
function tick(gain, freq, dur = 0.012) {
  if (!soundOn || !audio) return;
  const t = audio.currentTime, rate = 0.9 + Math.random() * 0.2;
  const len = Math.ceil(audio.sampleRate * dur);
  const buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = audio.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
  const bp = audio.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq * rate; bp.Q.value = 4;
  const g = audio.createGain(); g.gain.value = gain;
  src.connect(bp).connect(g).connect(audio.destination);
  src.start(t);
}

/* ---------- the labels over the tray, placed from the tray's own geometry ---------- */
function placeLabels(st) {
  if (!tray) return;
  const g = tray.geo();
  const L = g.x0, Rx = g.x0 + 100 * g.p, X = (n) => g.x0 + n * g.p;
  const pos = (n) => X(n - 0.5);
  const youX = g.vx(st.n);
  const ticks = [1, 25, 50, 75, 100];
  const near = (x, d) => Math.abs(x - youX) < d;
  const html = [`<span class="ax" style="left:${L}px;width:${Rx - L}px"></span>`];
  for (const t of ticks) {
    const x = pos(t);
    const cls = t === 1 ? "tl l" : t === 100 ? "tl r" : "tl";
    const lx = t === 1 ? L : t === 100 ? Rx : x;
    const label = t === 50 ? (g.W < 560 ? "50, typical" : "50, typical: rated 0") : String(t);
    const w = t === 50 ? (g.W < 560 ? 44 : 84) : 18;
    html.push(`<span class="tk" style="left:${x}px"></span><span class="${cls}${near(x, w + 16) ? " hide" : ""}" style="left:${lx}px">${label}</span>`);
  }
  html.push(`<span class="you-k" style="left:${youX}px"></span><span class="you-kl" style="left:${youX}px">${st.n}</span>`);
  if (st.banded) for (const y of [st.small, st.big]) if (Math.abs(y.n - st.n) >= 2) html.push(`<span class="yd" style="left:${X(y.n)}px"></span>`);
  const beatenLabel = `${st.n} beaten`, aheadLabel = `${100 - st.n} ahead`;
  html.push(`<span class="bar b" style="left:${L}px;width:${youX - L - 2}px"></span><span class="bl" style="left:${L}px">${beatenLabel}</span>`);
  html.push(`<span class="bar a" style="left:${youX + 2}px;width:${Rx - youX - 2}px"></span><span class="bl r" style="left:${Rx}px">${aheadLabel}</span>`);
  scaleEl.innerHTML = html.join("");
  // the tag over your orb, kept inside the frame, with a leader down to it
  const tagW = youTag.offsetWidth;
  const cx = Math.max(tagW / 2, Math.min(g.W - tagW / 2, youX));
  youTag.style.left = cx + "px";
  youTag.style.top = Math.max(0, g.youTop - 34) + "px";
  youTag.style.setProperty("--leader", `${tagW / 2 + (youX - cx)}px`);
  youTag.style.setProperty("--leader-h", `${Math.max(4, g.youTop - Math.max(0, g.youTop - 34) - 26)}px`);
}

function writeReadout(st) {
  const e = st.e;
  $("[data-you-name]").textContent = e.name;
  $("[data-you-signed]").textContent = e.signed;
  $("[data-you-band]").textContent = e.band;
  $("[data-v-name]").textContent = e.name;
  $("[data-v-n]").textContent = st.n;
  $("[data-v-peers]").textContent = st.peers;
  $("[data-v-sub]").innerHTML = `On ${esc(st.part.name.toLowerCase())}, among ${esc(st.peers)} with ${esc(st.band)} ${esc(e.sizeBand.replace(/^.*?\s(?=[a-z]+$)/, ""))}. Orbe Rating <b>${esc(e.signed)}</b>, ${esc(e.band)}. Zero is typical.`;
  $("[data-yards]").innerHTML = st.banded
    ? `<span class="ring" aria-hidden="true"></span>The wrong yardsticks, marked on the scale: against ${esc(st.peers)} ${esc(lc(st.small.label))} it beats <s>${st.small.n}</s>; against ${esc(st.peers)} ${esc(lc(st.big.label))}, <s>${st.big.n}</s>. Neither is fair.`
    : `${esc(st.part.name)} does not change with size, so every yardstick reads ${st.n}. Orbe still compares like with like.`;
  $("[data-example-line]").textContent = `A made-up ${SINGULAR[st.k]}, rated live by the Orbe engine (model ${MODEL_VERSION}). The hundred are the engine's starting baselines.`;
  canvas.setAttribute("aria-label", `A tray of 100 ${st.peers} the size of ${e.name}, in rank order. ${e.name}'s orb rests after ${st.n}: it beats ${st.n} and ${100 - st.n} are ahead. The middle, 50, is typical and rates 0.`);
}

let pending = null;
function onSettle() {
  trayFig.classList.add("settled");
  placeLabels(standing(current));
  tick(0.5, 1700, 0.03); setTimeout(() => tick(0.3, 900, 0.03), 18);
}

function show(k, { animate }) {
  current = k;
  const st = standing(k);
  writeReadout(st);
  trayFig.classList.remove("settled");
  placeLabels(st);
  const fill = st.n / 100;
  if (!tray.state.prev || !animate) tray.set({ k: st.n, fill }, { animate });
  else tray.redrop({ k: st.n, fill });
  if (!animate) trayFig.classList.add("settled");
}

kindsEl.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-k]");
  if (!b || b.dataset.k === current) return;
  for (const x of $$("[data-k]", kindsEl)) x.setAttribute("aria-pressed", String(x === b));
  show(b.dataset.k, { animate: moving });
});

async function bootTray() {
  let force2d = query.has("2d");
  if (!force2d) { try { await loadThree(); } catch (e) { force2d = true; } }
  tray = createTray(canvas, {
    force2d,
    onSettle,
    onPass: (i, v) => tick(Math.min(0.12, v / 9000), 2600 + i * 6),
    onImpact: (s) => tick(0.6 * s, 180, 0.05),
  });
  root.dataset.renderer = tray.gl ? "webgl" : "2d";
  window.orbeTray = tray;
  tray.size();
  const go = () => show(current, { animate: moving });
  if (moving) {
    await (document.fonts?.ready ?? Promise.resolve());
    // the first screen paints, then the orb drops
    requestAnimationFrame(() => setTimeout(go, 260));
  } else go();
  let w = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === w) return;
    w = innerWidth;
    tray.resize();
    trayFig.classList.add("settled");
    placeLabels(standing(current));
  });
}
writeReadout(standing("channel"));
bootTray();

/* ================================================================ 2. the months */
const rec = buildRecord(cleanCreator(), { now: FIXTURE_NOW });
const terms = feeTermsFor("direct", { version: TAKE_RATE.version, networkBps: TAKE_RATE.sponsorship.networkBps, directBps: TAKE_RATE.sponsorship.directBps, payer: TAKE_RATE.sponsorship.payer });
const SOURCE = { adsense: "AdSense, connected", stripe: "Stripe, connected" };
const STREAM = { ads: "Ads", products: "Shop sales", sponsorship: "Sponsorship" };
const monthName = (m, o = { month: "long", year: "numeric" }) => new Date(m).toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
const MONTHS = rec.history.map((m) => {
  const lines = rec.lines.filter((l) => l.month === m && l.role === "counted");
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const sponsor = lines.find((l) => l.line.stream === "sponsorship");
  const fee = sponsor ? settle({ amount: sponsor.amount, currency: "GBP" }, terms, 10000).orbeFee.amount : 0;
  return { m, lines, total, sponsor, fee };
});
const peak = Math.max(...MONTHS.map((x) => x.total));
const feeTotal = MONTHS.reduce((a, x) => a + x.fee, 0);
const sponsorTotal = MONTHS.reduce((a, x) => a + (x.sponsor?.amount ?? 0), 0);
const allTotal = MONTHS.reduce((a, x) => a + x.total, 0);

/* estimates against payouts: the record engine's made-up gaming channel */
{
  const nova = suspiciousCreator();
  const last = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
  const ads = nova.revenue.filter((l) => l.month === last && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source === "adsense");
  $("[data-est]").innerHTML = `Estimates are not a record. For ${esc(monthName(last))}, YouTube estimated one made-up channel's ad revenue at <s>${gbp2(est.gross.amount)}</s>; AdSense paid <b>${gbp2(paid.gross.amount)}</b>. Orbe records what was paid.`;
}

const rowEl = $("[data-row]");
const rowSvg = $("[data-row-svg]");
const NS = "http://www.w3.org/2000/svg";
let sel = 23, rowGeo = null, filled = !moving;
const fillNow = new Float32Array(24);

/* the level line for a disc of radius r filled to f by area, as an SVG rect top */
const levelY = (cy, r, f) => cy - levelFor(f) * r;

function rowLayout() {
  const W = rowEl.clientWidth;
  const two = W < 640;
  const per = two ? 12 : 24;
  const pitch = W / per;
  const r = Math.min(20, pitch * 0.4);
  const rowH = two ? 104 : 124;
  return { W, two, per, pitch, r, rowH, H: two ? rowH * 2 + 4 : rowH };
}

function drawRow() {
  const G = (rowGeo = rowLayout());
  rowSvg.setAttribute("viewBox", `0 0 ${G.W} ${G.H}`);
  rowSvg.setAttribute("height", G.H);
  const out = [];
  out.push(`<defs>${MONTHS.map((_, i) => { const c = cell(i); return `<clipPath id="mc${i}"><circle cx="${c.x}" cy="${c.y}" r="${G.r - 0.6}"/></clipPath>`; }).join("")}</defs>`);
  MONTHS.forEach((mo, i) => {
    const c = cell(i);
    const month = new Date(mo.m).getUTCMonth();
    const f = fillNow[i];
    out.push(`<g data-i="${i}">`);
    out.push(`<circle class="mo" cx="${c.x}" cy="${c.y}" r="${G.r}"/>`);
    out.push(`<rect class="lv" clip-path="url(#mc${i})" x="${c.x - G.r}" y="${f > 0 ? levelY(c.y, G.r, f) : c.y + G.r}" width="${G.r * 2}" height="${G.r * 2}"/>`);
    out.push(`<circle class="rim" cx="${c.x}" cy="${c.y}" r="${G.r - 0.6}"/>`);
    out.push(`<text class="ml${i === sel ? " on" : ""}" x="${c.x}" y="${c.y + G.r + 18}" text-anchor="middle">${monthName(mo.m, { month: "short" }).slice(0, G.two ? 1 : 3)}</text>`);
    if (mo.fee) {
      out.push(`<circle class="fee" cx="${c.x}" cy="${c.y + G.r + 32}" r="3"/>`);
      if (!G.two) out.push(`<text class="fl" x="${c.x}" y="${c.y + G.r + 50}" text-anchor="middle">${gbp(mo.fee)}</text>`);
    }
    if (month === 0 || i === 0) out.push(`<text class="yl" x="${c.x - G.r}" y="${c.y - G.r - 10}">${new Date(mo.m).getUTCFullYear()}</text>`);
    out.push(`</g>`);
  });
  const s = cell(sel);
  out.push(`<circle class="cur" data-cur cx="${s.x}" cy="${s.y}" r="${G.r + 5}"/>`);
  rowSvg.innerHTML = out.join("");
}
function cell(i) {
  const G = rowGeo;
  const col = G.two ? i % 12 : i, line = G.two ? Math.floor(i / 12) : 0;
  return { x: G.pitch * (col + 0.5), y: 30 + G.r + line * (G.rowH + 4) };
}

const pickOrb = $("[data-pick-orb]");
let pickFill = 0, pickRaf = 0;
function drawPickOrb(f) {
  const r = 58, cx = 60, cy = 60;
  pickOrb.innerHTML = `<defs><clipPath id="pk"><circle cx="${cx}" cy="${cy}" r="${r - 1}"/></clipPath></defs><circle class="mo" cx="${cx}" cy="${cy}" r="${r}" fill="var(--orbe-chalk)"/><rect clip-path="url(#pk)" x="0" y="${levelY(cy, r, f)}" width="120" height="120" fill="var(--accent)"/><circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="var(--orbe-ink)" stroke-width="1.5"/>`;
}
function tweenPick(to) {
  cancelAnimationFrame(pickRaf);
  if (!moving) { pickFill = to; drawPickOrb(to); return; }
  const from = pickFill, t0 = performance.now();
  const step = (now) => {
    const u = Math.min(1, (now - t0) / 120), e = 1 - (1 - u) * (1 - u);
    pickFill = from + (to - from) * e; drawPickOrb(pickFill);
    if (u < 1) pickRaf = requestAnimationFrame(step);
  };
  pickRaf = requestAnimationFrame(step);
}

function select(i, { announce = true } = {}) {
  sel = Math.max(0, Math.min(23, i));
  const mo = MONTHS[sel];
  $("[data-pick-month]").textContent = monthName(mo.m);
  $("[data-pick-total]").textContent = `${gbp2(mo.total)} paid out`;
  const order = ["ads", "products", "sponsorship"];
  $("[data-pick-lines]").innerHTML = [...mo.lines].sort((a, b) => order.indexOf(a.line.stream) - order.indexOf(b.line.stream)).map((l) => {
    const src = l.line.stream === "sponsorship" ? `${l.line.counterparty}, paid through Stripe` : SOURCE[l.source] ?? l.source;
    return `<li><span>${esc(STREAM[l.line.stream] ?? l.line.stream)}</span><span class="v">${gbp2(l.amount)}</span><span class="s">${esc(src)}</span></li>`;
  }).join("");
  $("[data-pick-fee]").innerHTML = mo.fee
    ? `<span class="dot" aria-hidden="true"></span>Orbe's fee <b>${gbp2(mo.fee)}</b>: ${pct(terms.bps)} of the sponsorship, paid by the brand on top. The creator keeps all ${gbp(mo.sponsor.amount)}.`
    : `Orbe's fee <b>£0</b>. No money moved through Orbe this month.`;
  rowEl.setAttribute("aria-valuenow", String(sel + 1));
  rowEl.setAttribute("aria-valuetext", `${monthName(mo.m)}: ${gbp2(mo.total)} paid out. Orbe's fee ${mo.fee ? gbp2(mo.fee) + ", paid by the brand" : "nothing"}.`);
  if (rowGeo) {
    const c = cell(sel), cur = $("[data-cur]", rowSvg);
    if (cur) { cur.setAttribute("cx", c.x); cur.setAttribute("cy", c.y); }
    $$(".ml", rowSvg).forEach((t, j) => t.classList.toggle("on", j === sel));
  }
  tweenPick(filled ? mo.total / peak : 0);
}

function fromPointer(ev) {
  const b = rowEl.getBoundingClientRect();
  const G = rowGeo;
  const x = ev.clientX - b.left, y = ev.clientY - b.top;
  const col = Math.max(0, Math.min(G.per - 1, Math.floor(x / G.pitch)));
  const line = G.two ? (y > G.rowH ? 1 : 0) : 0;
  return col + line * 12;
}
let dragging = false;
rowEl.addEventListener("pointerdown", (ev) => { dragging = true; rowEl.setPointerCapture?.(ev.pointerId); const i = fromPointer(ev); if (i !== sel) select(i); });
rowEl.addEventListener("pointermove", (ev) => { if (!dragging && ev.pointerType !== "mouse") return; const i = fromPointer(ev); if (i !== sel) select(i); });
const stop = () => { dragging = false; };
rowEl.addEventListener("pointerup", stop);
rowEl.addEventListener("pointercancel", stop);
rowEl.addEventListener("keydown", (ev) => {
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 12, PageDown: -12 }[ev.key];
  if (step) { ev.preventDefault(); select(sel + step); }
  else if (ev.key === "Home") { ev.preventDefault(); select(0); }
  else if (ev.key === "End") { ev.preventDefault(); select(23); }
});

$("[data-record-sum]").innerHTML = `${gbp(allTotal)} paid out over two years. Twelve months carried a sponsor; Orbe's fee on those, <b>${gbp(feeTotal)}</b>, was paid by the brands. Every other month: <b>£0</b>.`;
$("[data-record-line]").textContent = `Juniper Vale Workshop, a made-up channel from the Orbe record engine, ${monthName(rec.history[0], { month: "short", year: "numeric" })} to ${monthName(rec.history.at(-1), { month: "short", year: "numeric" })}. Each orb is filled to that month's payouts against the best month, ${gbp(peak)}. Sponsor fees are shown as if each deal had been booked through Orbe at ${pct(terms.bps)}, the rate when you bring the brand (${pct(TAKE_RATE.sponsorship.networkBps)} when Orbe finds it).`;

function fillRow() {
  filled = true;
  if (!moving) { MONTHS.forEach((m, i) => (fillNow[i] = m.total / peak)); drawRow(); tweenPick(MONTHS[sel].total / peak); return; }
  const t0 = performance.now();
  const step = (now) => {
    let busy = false;
    MONTHS.forEach((m, i) => {
      const u = Math.max(0, Math.min(1, (now - t0 - i * 80) / 300));
      fillNow[i] = (m.total / peak) * u;
      if (u < 1) busy = true;
    });
    drawRow();
    if (busy) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  tweenPick(MONTHS[sel].total / peak);
}

drawRow();
select(23, { announce: false });
if (!moving) fillRow();
else if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fillRow(); } }, { threshold: 0.4 });
  io.observe(rowEl);
} else fillRow();
let rw = rowEl.clientWidth;
new ResizeObserver(() => { if (rowEl.clientWidth !== rw) { rw = rowEl.clientWidth; drawRow(); } }).observe(rowEl);

/* ================================================================ 3. fees, in full, from the engine */
{
  const s = TAKE_RATE.seller, b = TAKE_RATE.buyerPremium, sp = TAKE_RATE.sponsorship;
  const tier = (t) => pct(t.rateBps);
  const up = (t) => (t.upTo ? gbp(t.upTo).replace(/,000,000$/, "M").replace(/,000$/, "k") : null);
  const rows = [
    ["Your rating and record", "Free", "Rated against creators your size, read from your payouts. Always free."],
    ["Sponsorships", `${pct(sp.networkBps)} or ${pct(sp.directBps)}`, `${pct(sp.networkBps)} when Orbe finds the brand, ${pct(sp.directBps)} when you bring it. Paid by the brand, on top of your price.`],
    ["Selling your business", s.tiers.map(tier).join(", "), `${tier(s.tiers[0])} up to ${up(s.tiers[0])}, ${tier(s.tiers[1])} up to ${up(s.tiers[1])}, ${tier(s.tiers[2])} above. ${gbp(s.minimum)} minimum, from the proceeds. Nothing if it does not sell.`],
    ["Buying a business", `${tier(b.tiers[0])} premium`, `${tier(b.tiers[0])} on top of the price, ${tier(b.tiers[1])} above ${up(b.tiers[0])}, ${gbp(b.minimum)} minimum, paid at completion.`],
  ];
  $("[data-fees] tbody").innerHTML = rows.map(([h, n, d]) => `<tr><th scope="row">${esc(h)}</th><td class="n">${esc(n)}</td><td class="d">${esc(d)}</td></tr>`).join("");
}

/* ================================================================ the reserve form */
{
  const form = $("[data-reserve]");
  const input = $("#handle");
  const status = $("[data-status]");
  $("[data-kind-select]").innerHTML = ORDER.map((k) => `<option value="${k}">${PICK[k]}</option>`).join("");
  input.addEventListener("input", () => { input.removeAttribute("aria-invalid"); status.textContent = ""; });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const h = cleanHandle(input.value);
    if (!h) { input.setAttribute("aria-invalid", "true"); status.textContent = "Add your handle or a link to your work, then reserve."; input.focus(); return; }
    status.textContent = `Reserving @${h}...`;
    const res = await reserve({ handle: h, kind: $("[data-kind-select]").value });
    status.textContent = res.ok
      ? res.via === "api" ? `@${h} is reserved. We will write when it opens.` : `Your email app has the request for @${h} written out. Send it and the handle is held.`
      : res.reason === "taken" ? `@${h} is already reserved. Try another spelling.` : "That did not go through. Try again.";
  });
}
