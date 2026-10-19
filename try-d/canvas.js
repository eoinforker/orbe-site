/*
  The canvas, wired. Every figure comes from canvas-data.js, which asks the
  Orbe engine. Motion: the headline word turns once through the six kinds
  (450ms reflow, 24ms stagger) and stops; nothing else moves on its own.
*/
import { mountWordmark, wordmarkSVG } from "../assets/r5/wordmark.js";
import { mountArt, ease, GW, GH } from "./pixels.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import {
  MODEL_VERSION as MODEL, KINDS, rated, newest, sale, quote, plausible, prefixed, disagree, mathsFor, benchmark,
  count, gbp, gbpExact, TAKE_RATE, OP3_SAMPLE, letterFor, noteDate, checksum, signed, minus,
} from "./canvas-data.js";

document.documentElement.classList.add("js");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";

mountWordmark($("[data-wordmark]"), { animate: !reduce });
mountWordmark($("[data-wordmark-small]"), { animate: false });
if (!reduce) document.documentElement.classList.add("motion");

/*
  Count a figure up to its engine value, once, on the page's one easing.
  Any later paint of the same element stops the count, so a figure never
  shows anything but the engine's own value once a person touches it.
*/
const counting = new WeakMap();
const stopCount = (el) => counting.delete(el);
function countUp(el, to, fmt, D = 720) {
  if (reduce) { el.textContent = fmt(to); return; }
  const id = {};
  counting.set(el, id);
  const t0 = performance.now();
  const tick = (now) => {
    if (counting.get(el) !== id) return;
    const t = Math.min(1, (now - t0) / D);
    el.textContent = fmt(t < 1 ? to * ease(t) : to);
    if (t < 1) requestAnimationFrame(tick); else counting.delete(el);
  };
  el.textContent = fmt(0);
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- the headline slot */
const slot = $("[data-slot]");
const slotSr = $("[data-slot-sr]");
const h1 = $("#h1");
function measure(word) {
  const m = document.createElement("span");
  m.className = "slot-word";
  m.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0";
  m.textContent = word;
  h1.appendChild(m);
  const w = m.getBoundingClientRect().width;
  m.remove();
  return w;
}
function chars(word) {
  const s = document.createElement("span");
  s.className = "slot-word";
  s.setAttribute("aria-hidden", "true");
  s.dataset.slotWord = "";
  for (const c of word) { const ch = document.createElement("span"); ch.className = "ch"; ch.textContent = c; s.appendChild(ch); }
  return s;
}
let settle = 0;
function setWord(word, animate) {
  const old = $("[data-slot-word]", slot);
  slotSr.textContent = word;
  if (old && old.textContent === word) return;
  const next = chars(word);
  if (!animate || reduce) { old?.remove(); slot.appendChild(next); slot.style.width = ""; return; }
  const from = slot.getBoundingClientRect().width;
  const to = measure(word);
  slot.style.width = `${from}px`;
  if (old) {
    delete old.dataset.slotWord;
    old.classList.add("out");
    old.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], { duration: 360, easing: EASE, fill: "forwards" }).onfinish = () => old.remove();
  }
  slot.appendChild(next);
  [...next.children].forEach((ch, i) => ch.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 450, delay: i * 24, easing: EASE, fill: "backwards" }));
  void slot.offsetWidth;
  slot.style.width = `${to}px`;
  clearTimeout(settle);
  settle = setTimeout(() => { slot.style.width = ""; }, 480 + word.length * 24);
}

/* ---------------------------------------------------------------- the instrument */
const hero = $("[data-hero]");
const cellsBox = $("[data-cells]");
const select = $("[data-select]");
const views = $("[data-views]");
const kindList = $("[data-kinds]");
const art = mountArt($("[data-art]"));
const F = (v) => Math.exp((v / 100) * Math.log(3));
const FILL = { sky: "chalk", straw: "straw", peony: "peony" };
let current = KINDS[0].key;

for (const k of KINDS) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = k.label; b.dataset.kind = k.key; b.setAttribute("aria-pressed", String(k.key === current));
  b.addEventListener("click", () => { stopCycle(); show(k.key, true); });
  kindList.appendChild(b);
}
/* the hundred: one cell per creator your size, the ones you beat in ink, you in Cobalt */
const cellEls = Array.from({ length: 100 }, () => { const i = document.createElement("i"); i.className = "c"; cellsBox.insertBefore(i, select); return i; });

function drawHundred(r) {
  const at = Math.max(0, Math.min(99, Math.round(r.beats) - (r.beats >= 100 ? 1 : 0)));
  cellEls.forEach((el, i) => { el.classList.toggle("you", i === at); el.classList.toggle("above", i > at); });
  const el = cellEls[at];
  select.style.left = `${el.offsetLeft - 4}px`;
  select.style.top = `${el.offsetTop - 4}px`;
  const tag = $("[data-tag]");
  const W = cellsBox.clientWidth, tw = tag.offsetWidth || 160, cx = el.offsetLeft + el.offsetWidth / 2;
  const shift = cx - tw / 2 < 0 ? -(cx) : cx + tw / 2 > W ? -(tw - (W - cx)) : -tw / 2;
  tag.style.setProperty("--tag-x", `${shift + 0}px`);
}

const beatsOf = (r) => Math.max(1, Math.min(99, r.beats));
function paint(r) {
  const k = r.k;
  const b = beatsOf(r);
  stopCount($("[data-rating]"));
  $("[data-rating]").textContent = r.signed;
  $("[data-band]").textContent = r.band;
  $("[data-tag]").textContent = `${k.name} · ${b} in 100`;
  $("[data-beats]").textContent = b;
  $("[data-reach]").textContent = r.reachValue;
  const out = $("[data-views-out]");
  out.textContent = count(r.typical);
  views.setAttribute("aria-valuetext", `${count(r.typical)} ${k.unit}. Rating ${r.signed.replace("−", "minus ")}, ${r.band}. Beats ${b} in 100 ${r.peers} your size.`);
  drawHundred(r);
  $("[data-checksum]").textContent = `sha256 ${checksum(r.k.key, F(Number(views.value)))} · model ${MODEL}`;
}

/*
  The piece's place. Wide: measure the words, then take the larger of two
  boxes, beside lines two to four or below the whole headline, right of the
  lede and buttons. Either box stops 32px short of the instrument, and the
  piece sits in its lower right corner, bleeding off both edges.
  Narrower: a band below the instrument (set in CSS), the piece in its corner.
*/
const heroSec = $(".hero"), artBox = $("[data-art-box]"), artCanvas = $("[data-art]");
const BLEED_X = 0.16, BLEED_Y = 0.12;
const textBox = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); };
let lastCell = 0;
function placeArt() {
  let cell;
  let wide = false;
  try { wide = matchMedia("(min-width: 1181px)").matches; } catch (e) {}
  if (wide) {
    const H = heroSec.getBoundingClientRect();
    const right = $(".stage").getBoundingClientRect().left - H.left - 32;
    const lines = $$(".h-line").map(textBox);
    const aLeft = Math.max(...lines.slice(1).map((b) => b.right)) - H.left + 48;
    const aTop = lines[0].bottom - H.top + 24;
    const bLeft = Math.max(textBox($(".lede")).right, ...$$(".ctas .btn").map((b) => b.getBoundingClientRect().right)) - H.left + 48;
    const bTop = lines[3].bottom - H.top + 32;
    const fit = (left, top) => { const w = right - left, h = H.height - top; return w < 160 || h < 160 ? 0 : Math.min(w / (GW * (1 - BLEED_X)), h / (GH * (1 - BLEED_Y))); };
    const a = fit(aLeft, aTop), b = fit(bLeft, bTop);
    const [left, top] = a >= b ? [aLeft, aTop] : [bLeft, bTop];
    cell = Math.min(11.28, Math.floor(Math.max(a, b) * 4) / 4);
    artBox.hidden = cell < 3;
    Object.assign(artBox.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${H.height - top}px` });
  } else {
    artBox.hidden = false;
    artBox.removeAttribute("style");
    cell = Math.floor((artBox.clientHeight / (GH * (1 - BLEED_Y))) * 4) / 4;
  }
  artCanvas.style.right = `${-GW * cell * BLEED_X}px`;
  artCanvas.style.bottom = `${-GH * cell * BLEED_Y}px`;
  if (cell !== lastCell) { lastCell = cell; artCanvas.style.setProperty("--cell", `${cell}px`); art.resize(); }
}

/* ---------------------------------------------------------------- sunday_note.txt */
const noteEl = $("[data-note]"), noteBody = $("[data-note-body]");
const N = (k) => $(`[data-n="${k}"]`, noteEl);
N("date").textContent = noteDate();
$("[data-sig]", noteEl).appendChild(wordmarkSVG({ cut: "text" }));
let noteOpen = false;
function fillNote(key, animate) {
  const L = letterFor(key);
  for (const f of ["name", "open", "band", "beat", "detail", "best", "handle"]) N(f).textContent = L[f];
  stopCount(N("signed"));
  N("signed").textContent = L.signed;
  /* it rewrites for the new kind: a short dip says so, only if someone can see it */
  if (animate && noteOpen && !reduce) noteBody.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 260, easing: EASE });
}

function show(key, animateWord) {
  current = key;
  const k = KINDS.find((x) => x.key === key);
  views.value = 0;
  const r = rated(key, 1);
  hero.dataset.fill = FILL[k.colour];
  art.show(key, animateWord && !reduce);
  $("[data-frame-name]").textContent = `Rate my work / ${k.name}`;
  $("[data-who-name]").textContent = k.name;
  $("[data-who-handle]").textContent = k.handle;
  $("[data-who-size]").textContent = r.sizeBand;
  $("[data-peers]").textContent = r.peers;
  $("[data-noun]").textContent = k.noun;
  $("[data-noun-2]").textContent = k.noun;
  $("[data-unit]").textContent = k.unit;
  $$("[data-kind]", kindList).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === key)));
  setWord(k.word, animateWord);
  paint(r);
  fillNote(key, animateWord);
  const sel = $("[data-kind-select]");
  if (sel) sel.value = key;
}

views.addEventListener("input", () => { stopCycle(); paint(rated(current, F(Number(views.value)))); });
addEventListener("resize", () => { paint(rated(current, F(Number(views.value)))); placeArt(); });

/* ---------------------------------------------------------------- the turn: once through the six, then stop */
const pause = $("[data-pause]");
const ORDER = KINDS.map((k) => k.key);
let timer = 0, step = 0, cycling = false;
function stopCycle() {
  if (!cycling) return;
  cycling = false; clearInterval(timer);
  pause.textContent = "Replay"; pause.setAttribute("aria-pressed", "true");
}
function startCycle() {
  cycling = true; step = ORDER.indexOf(current);
  pause.textContent = "Pause"; pause.setAttribute("aria-pressed", "false");
  let turns = 0;
  timer = setInterval(() => {
    step = (step + 1) % ORDER.length; turns++;
    show(ORDER[step], true);
    if (turns >= ORDER.length) { stopCycle(); }
  }, 2200);
}
pause.addEventListener("click", () => (cycling ? stopCycle() : startCycle()));

show(current, false);
placeArt();
countUp($("[data-rating]"), rated(current, 1).rating, (x) => minus(signed(x)), 900);
if (reduce) { pause.hidden = true; }
else {
  setTimeout(() => { if (!document.hidden) startCycle(); }, 1800);
  /* stop as soon as the instrument leaves view */
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { if (es.some((e) => !e.isIntersecting)) stopCycle(); }).observe(hero);
}
document.fonts?.ready.then(() => { paint(rated(current, F(Number(views.value)))); placeArt(); });

/* ---------------------------------------------------------------- Selling / Price */
const sellIn = $("[data-sell]");
const priceOf = (v) => Math.round(Math.exp(Math.log(20000) + (v / 1000) * (Math.log(3000000) - Math.log(20000))) / 1000) * 1000;
const SALE_START = 220000;
sellIn.value = Math.round(((Math.log(SALE_START) - Math.log(20000)) / (Math.log(3000000) - Math.log(20000))) * 1000);
function paintSale() {
  const p = priceOf(Number(sellIn.value));
  const s = sale(p);
  $("[data-sell-price]").textContent = gbp(s.price);
  $("[data-sell-fee]").textContent = gbp(s.fee);
  $("[data-sell-rate]").textContent = s.minimum ? `The £4,000 minimum, ${s.feeRate.toFixed(1).replace(/\.0$/, "")}% of the price` : s.slices.length === 1 ? "8% on all of it" : `${s.feeRate.toFixed(2).replace(/0$/, "")}% overall, in tiers`;
  $("[data-sell-prem]").textContent = gbp(s.premium);
  stopCount($("[data-sell-net]"));
  $("[data-sell-net]").textContent = gbp(s.net);
  $("[data-split-net]").style.width = `${(s.net / s.price) * 100}%`;
  $("[data-split-fee]").style.width = `${(s.fee / s.price) * 100}%`;
  $("[data-sell-slices]").innerHTML = s.slices.map((x) => `<li>${x.rateBps / 100}% of ${gbp(x.from)} to ${gbp(x.to)}: ${gbp(x.fee)}</li>`).join("") + (s.minimum ? `<li>Below £4,000, so the minimum applies.</li>` : "") + `<li>Buyer pays ${gbp(s.buyerPays)} in all.</li>`;
  sellIn.setAttribute("aria-valuetext", `${gbp(s.price)}. Seller's fee ${gbp(s.fee)}, you receive ${gbp(s.net)}.`);
}
sellIn.addEventListener("input", paintSale);
paintSale();

/* ---------------------------------------------------------------- The Record: estimate and paid, racing once */
const d = disagree();
const estEl = $("[data-race-est]"), paidEl = $("[data-race-paid]");
const estBar = $("[data-race-est-bar]"), paidBar = $("[data-race-paid-bar]");
const finish = () => {
  estEl.innerHTML = `<s>${gbpExact(d.estimate)}</s>`; paidEl.textContent = gbpExact(d.paid);
  estBar.style.width = "100%"; paidBar.style.width = `${(d.paid / d.estimate) * 100}%`;
  $("[data-race-est-line]").textContent = "Not what was paid.";
};
function race() {
  const D = 1800, t0 = performance.now();
  $("[data-race-est-line]").textContent = "Counting.";
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / D);
    const e = Math.min(d.estimate, (d.estimate * 1.0) * t), p = Math.min(d.paid, d.estimate * t);
    estEl.textContent = gbpExact(e); paidEl.textContent = gbpExact(p);
    estBar.style.width = `${(e / d.estimate) * 100}%`; paidBar.style.width = `${(p / d.estimate) * 100}%`;
    if (t < 1) requestAnimationFrame(tick); else finish();
  };
  requestAnimationFrame(tick);
}
if (reduce || !("IntersectionObserver" in window)) finish();
else {
  estBar.style.width = "0%"; paidBar.style.width = "0%";
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); race(); } }, { threshold: 0.6 });
  io.observe($("[data-race]"));
}

/* ---------------------------------------------------------------- Sponsorships / Quote */
const sponIn = $("[data-spon]");
const viewsOf = (v) => Math.round(Math.exp(Math.log(5000) + (v / 1000) * (Math.log(600000) - Math.log(5000))) / 500) * 500;
sponIn.value = Math.round(((Math.log(155000) - Math.log(5000)) / (Math.log(600000) - Math.log(5000))) * 1000);
function paintQuote() {
  const v = viewsOf(Number(sponIn.value));
  const q = quote(v);
  const int = q.find((x) => x.format === "integration")?.s;
  $("[data-spon-views]").textContent = count(v);
  const text = int && int.status === "suggested" ? `${gbp(int.low.amount)} to ${gbp(int.high.amount)}` : "Not enough to price";
  $("[data-spon-int]").textContent = text;
  sponIn.setAttribute("aria-valuetext", `${count(v)} views. ${text} an integrated read.`);
}
sponIn.addEventListener("input", paintQuote);
paintQuote();

/* ---------------------------------------------------------------- Plausibility / Claim */
const plIn = $("[data-pl]");
const claimOf = (v) => Math.round(Math.exp(Math.log(20000) + (v / 1000) * (Math.log(400000) - Math.log(20000))) / 1000) * 1000;
const VERDICT = { consistent: "Consistent", consistent_with_notes: "Consistent, with notes", questions: "Questions", inconsistent: "Inconsistent", not_enough_signal: "Not enough signal" };
function paintClaim() {
  const c = claimOf(Number(plIn.value));
  const p = plausible(c);
  $("[data-pl-claim]").textContent = count(c);
  $("[data-pl-verdict]").textContent = VERDICT[p.verdict] ?? p.verdict;
  const ratio = (c / OP3_SAMPLE).toFixed(1);
  $("[data-pl-why]").textContent = `${ratio}× a made-up public count of ${count(OP3_SAMPLE)} over eight weeks. ${p.flags[0]?.innocent ?? "Within what public counts allow for."}`;
  plIn.setAttribute("aria-valuetext", `${count(c)} downloads a month. ${VERDICT[p.verdict]}.`);
}
plIn.addEventListener("input", paintClaim);
paintClaim();

/* ---------------------------------------------------------------- Podcasts / Prefix */
const showIn = $("[data-show]");
function paintPrefix() {
  const id = showIn.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "yourshow";
  let url;
  try { url = prefixed(id, "https://media.example.com/episode-1.mp3"); } catch (e) { url = `https://m.orbe.vc/p/${id}/media.example.com/episode-1.mp3`; }
  $("[data-show-out]").textContent = url.replace(/^https:\/\//, "");
}
showIn.addEventListener("input", paintPrefix);
paintPrefix();

/* ---------------------------------------------------------------- Rate my work / Maths and the State of the Middle */
const bm = benchmark("channel");
const maxV = Math.max(...bm.rows.map((r) => r.value));
$("[data-sizes]").innerHTML = bm.rows.map((r) => `<li class="${r.key === bm.example ? "here" : ""}"><span>${r.label}</span><i style="width:${(r.value / maxV) * 100}%"></i><span>${Math.round(r.value * 100)}%</span></li>`).join("");

/* ---------------------------------------------------------------- Diligence, Lending, the guide */
const report = gbp(TAKE_RATE.buyers.report.standard);
$$("[data-dil]").forEach((b) => b.addEventListener("click", () => {
  $$("[data-dil]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  $("[data-dil-out]").textContent = b.dataset.dil === "1" ? report : "£0";
}));
$("[data-lend]").textContent = gbp(TAKE_RATE.financingFilePrice);
const nw = newest("explainer");
$("[data-guide]").textContent = `${nw.multiple.toFixed(1)}×`;
$("[data-guide-line]").textContent = `Field Recordings’ newest upload, ${Math.round(nw.ageDays)} days in, against its own typical. Then three next steps. With the API.`;

/* ---------------------------------------------------------------- reserve */
const sel = $("[data-kind-select]");
sel.innerHTML = KINDS.map((k) => `<option value="${k.key}">${k.label}</option>`).join("") + `<option value="other">Something else</option>`;
sel.value = current;
const form = $("[data-reserve]");
const handleIn = $("[data-handle]");
handleIn.addEventListener("input", () => {
  const h = cleanHandle(handleIn.value).toLowerCase();
  $("[data-reserve-note]").textContent = h ? `orbe.vc/@${h}, held once your email arrives. We’ll check it’s yours when ratings open.` : "Held once your email arrives. We’ll check it’s yours when ratings open.";
});
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const h = cleanHandle(handleIn.value).toLowerCase();
  if (!h) { $("[data-reserve-note]").textContent = "Type the handle you’d like first."; handleIn.focus(); return; }
  const kind = sel.value === "other" ? "work" : KINDS.find((k) => k.key === sel.value)?.word ?? "work";
  const res = await reserve({ handle: h, kind });
  $("[data-reserve-note]").textContent = res.ok ? `Your email app has the request for orbe.vc/@${h}. Held once it arrives.` : "That handle is taken. Try another.";
});

/* ---------------------------------------------------------------- windows open, once
  Each window opens the way a 1-bit window did: two outlines step out from
  its title bar to its frame in 180ms, then the window is there. The note's
  lines then arrive in reading order, and its rating and the sale's net
  count up to the engine's values. Each plays once; reduced motion skips it all.
*/
const wall = $(".wall");
const px = (b) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
function zoomOpen(win, then) {
  const W = wall.getBoundingClientRect(), r = win.getBoundingClientRect();
  const x = r.left - W.left, y = r.top - W.top;
  const from = { left: x + r.width / 2 - 32, top: y, width: 64, height: 24 };
  const to = { left: x, top: y, width: r.width, height: r.height };
  [0, 60].forEach((d) => {
    const z = document.createElement("i");
    z.className = "zoom"; z.setAttribute("aria-hidden", "true");
    wall.appendChild(z);
    z.animate([px(from), px(to)], { duration: 120, delay: d, easing: "steps(5, jump-none)", fill: "both" }).onfinish = () => z.remove();
  });
  setTimeout(() => { win.classList.remove("shut"); then?.(); }, 180);
}
function openNote() {
  noteOpen = true;
  $$(".n-line", noteEl).forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 220, delay: i * 36, easing: EASE, fill: "backwards" }));
  const L = letterFor(current);
  setTimeout(() => countUp(N("signed"), L.rating, (x) => minus(signed(x)), 520), 3 * 36);
}
function openSell() {
  const s = sale(priceOf(Number(sellIn.value)));
  countUp($("[data-sell-net]"), s.net, gbp, 600);
}
const wins = $$(".wall .win");
if (reduce || !("IntersectionObserver" in window)) { noteOpen = true; document.documentElement.classList.remove("motion"); }
else {
  wins.forEach((w) => w.classList.add("shut"));
  let queue = 0;
  const io = new IntersectionObserver((es) => {
    const now = es.filter((e) => e.isIntersecting).map((e) => e.target).sort((a, b) => wins.indexOf(a) - wins.indexOf(b));
    now.forEach((w, i) => {
      io.unobserve(w);
      const t = Math.max(0, queue - performance.now()) + i * 60;
      queue = performance.now() + t + 60;
      setTimeout(() => zoomOpen(w, w === noteEl ? openNote : w.classList.contains("c-sell") ? openSell : null), t);
    });
  }, { threshold: 0.2 });
  wins.forEach((w) => io.observe(w));
}
