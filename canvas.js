/*
  The canvas, wired. Every figure comes from canvas-data.js, which asks the
  Orbe engine. Motion: the headline word turns once through the six kinds
  (450ms reflow, 24ms stagger) and stops; nothing else moves on its own.
*/
import { mountWordmark, wordmarkSVG } from "./assets/r5/wordmark.js";
import { mountArt, ease, GW, GH } from "./pixels.js";
import { reserve, cleanHandle } from "./assets/r5/reserve.js";
import { mountGiant } from "./footer.js";
import { mountBlockArt } from "./block.js";
import {
  KINDS, rated, sale, quote, plausible, prefixed, disagree,
  count, gbp, gbpExact, TAKE_RATE, OP3_SAMPLE, letterFor, noteDate, signed, minus,
  recentWorks, afterPost, middle, benchKinds, podcastSample,
} from "./canvas-data.js";

document.documentElement.classList.add("js");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
const EASE = "cubic-bezier(0.6, 0.04, 0.3, 1)";

mountWordmark($("[data-wordmark]"), { animate: !reduce });
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
/*
  The visible word is drawn letter by letter as generated content, so it is
  never text: innerText, a copy and a screen reader all get the word once,
  from the inline copy beside it, even while an old word is still leaving.
*/
function chars(word) {
  const s = document.createElement("span");
  s.className = "slot-word";
  s.setAttribute("aria-hidden", "true");
  s.dataset.slotWord = word;
  for (const c of word) { const ch = document.createElement("span"); ch.className = "ch"; ch.dataset.c = c; s.appendChild(ch); }
  return s;
}
let settle = 0;
function setWord(word, animate) {
  const old = $("[data-slot-word]", slot);
  slotSr.textContent = word;
  if (old && old.dataset.slotWord === word) return;
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
let current = KINDS[0].key;
const DARK_KINDS = new Set(["devlog", "letsplay", "longexposure"]);

/* the piece answers too: a click on it turns to the next kind (the tabs are its keyboard twin) */
$("[data-art]").addEventListener("click", () => { stopCycle(); const i = KINDS.findIndex((k) => k.key === current); show(KINDS[(i + 1) % KINDS.length].key, true); });
for (const k of KINDS) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = k.label; b.dataset.kind = k.key; b.setAttribute("aria-pressed", String(k.key === current));
  b.addEventListener("click", () => { stopCycle(); show(k.key, true); });
  kindList.appendChild(b);
}
/* the strip is one row: arrow keys walk it, and where it scrolls, its edges fade */
const kindsWrap = $("[data-kinds-wrap]");
const kindBtns = $$("button", kindList);
kindList.addEventListener("keydown", (e) => {
  const i = kindBtns.indexOf(document.activeElement);
  const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: kindBtns.length - 1 }[e.key];
  if (i < 0 || to === undefined) return;
  e.preventDefault();
  kindBtns[(to + kindBtns.length) % kindBtns.length].focus();
});
function fadeKinds() {
  const max = kindsWrap.scrollWidth - kindsWrap.clientWidth;
  kindsWrap.classList.toggle("fade-l", max > 1 && kindsWrap.scrollLeft > 2);
  kindsWrap.classList.toggle("fade-r", max > 1 && kindsWrap.scrollLeft < max - 2);
}
/* bring the chosen kind into the strip's view, without moving the page */
function revealKind(key) {
  const b = kindBtns.find((x) => x.dataset.kind === key);
  if (!b) return;
  const pad = 48, L = b.offsetLeft, R = L + b.offsetWidth, W = kindsWrap.clientWidth, x = kindsWrap.scrollLeft;
  const to = L - pad < x ? L - pad : R + pad > x + W ? R + pad - W : x;
  if (to !== x) kindsWrap.scrollTo({ left: Math.max(0, to), behavior: reduce ? "auto" : "smooth" });
}
kindsWrap.addEventListener("scroll", fadeKinds, { passive: true });
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
  for (const f of ["name", "open", "band", "beat", "detail", "handle"]) N(f).textContent = L[f];
  stopCount(N("signed"));
  N("signed").textContent = L.signed;
  /* it rewrites for the new kind: a short dip says so, only if someone can see it */
  if (animate && noteOpen && !reduce) noteBody.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 260, easing: EASE });
}

/* ---------------------------------------------------------------- after_post.txt: a small game, then how it did and three next steps
  Above or below your typical? One of your last five works sits on a tile.
  Drag it left or right (or press Below or Above) and the engine shows the
  real multiple, with a short settle; the comparison and next steps then
  follow that work. Next brings the following one.
*/
const game = $("[data-game]"), tile = $("[data-tile]"), tileMark = $("[data-tile-mark]");
const gameNext = $("[data-game-next]"), gameCue = $("[data-game-cue]");
let postAt = 0, works = [], called = null;
const MARK = 9;
function drawMark(m) {
  tileMark.innerHTML = "";
  /* nine cells; typical fills half of them, as zero is typical; before the call, only you */
  const fill = m == null ? 0 : Math.max(1, Math.min(MARK, Math.round(m * 4.5)));
  for (let i = 0; i < MARK; i++) {
    const c = document.createElement("i");
    if (m == null ? i === 4 : i < fill) c.className = m == null ? "you" : "on";
    tileMark.appendChild(c);
  }
}
function paintPost(key) {
  const a = afterPost(key, postAt);
  const shown = called !== null;
  $("[data-game-n]").textContent = `${postAt + 1} of ${works.length}`;
  $("[data-tile-name]").textContent = shown ? `${a.own} your typical` : `Your ${a.one} from ${a.label}`;
  const right = called === (a.multiple >= 1 ? "above" : "below");
  $("[data-tile-sub]").textContent = shown ? `${right ? "You called it" : "Not quite"}: ${a.ownLine}.` : `${a.soFar} ${a.unit.replace(/ in 7 days$/, "")} so far`;
  tile.classList.toggle("shown", shown);
  $("[data-post]").classList.toggle("called", shown);
  drawMark(shown ? a.multiple : null);
  gameNext.hidden = !shown; gameCue.hidden = shown;
  $$("[data-guess]", game).forEach((b) => { b.disabled = shown; b.setAttribute("aria-pressed", String(called === b.dataset.guess)); });
  $("[data-post-own]").textContent = shown ? a.own : "?";
  $("[data-post-own-line]").textContent = shown ? `${a.ownLine.charAt(0).toUpperCase()}${a.ownLine.slice(1)}, with ${a.soFar} ${a.unit.replace(/ in 7 days$/, "")} so far.` : "Make your call above, and the engine shows its multiple.";
  $("[data-post-peers-k]").textContent = `Against ${a.peers} your size, at its age`;
  $("[data-post-peers]").textContent = `${a.peersBeat} in 100`;
  $("[data-post-peers-line]").textContent = `It reached ${a.share} of ${a.audienceNoun}. Typical at your size is ${a.typicalShare}.`;
  $("[data-post-steps]").innerHTML = "";
  for (const s of a.steps) {
    const li = document.createElement("li");
    const d = document.createElement("b"); d.textContent = s.do;
    const w = document.createElement("span"); w.textContent = ` ${s.why}`;
    li.append(d, w);
    $("[data-post-steps]").appendChild(li);
  }
}
function fillPost(key) {
  works = recentWorks(key);
  const one = works[0]?.one ?? "work";
  $("[data-post-one]").textContent = one;
  gameNext.textContent = `Next ${one}`;
  postAt = 0; called = null;
  tile.style.transform = "";
  paintPost(key);
}
function guess(side) {
  if (called !== null) return;
  called = side;
  const dx = side === "above" ? 1 : -1;
  if (reduce) tile.style.transform = "";
  else tile.animate([{ transform: tile.style.transform || "none" }, { transform: `translateX(${dx * 56}px)` }, { transform: "none" }], { duration: 500, easing: EASE });
  tile.style.transform = "";
  const fromKeys = document.activeElement?.matches?.("[data-guess]");
  paintPost(current);
  if (fromKeys) gameNext.focus();
}
$$("[data-guess]", game).forEach((b) => b.addEventListener("click", () => guess(b.dataset.guess)));
gameNext.addEventListener("click", () => {
  postAt = (postAt + 1) % works.length; called = null;
  paintPost(current);
  $("[data-guess=\"below\"]", game).focus();
  if (!reduce) tile.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: EASE });
});
/* the drag: the tile follows the pointer across its lane; past a third of the way, it is a call */
{
  let drag = null;
  tile.addEventListener("pointerdown", (e) => {
    if (called !== null || e.button !== 0) return;
    e.preventDefault();
    drag = { id: e.pointerId, x: e.clientX, max: (tile.parentElement.clientWidth - tile.offsetWidth) / 2 + 24 };
    tile.setPointerCapture(e.pointerId); tile.classList.add("held");
  });
  tile.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = Math.max(-drag.max, Math.min(drag.max, e.clientX - drag.x));
    tile.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
    drag.dx = dx;
  });
  const drop = () => {
    if (!drag) return;
    const dx = drag.dx || 0; drag = null; tile.classList.remove("held");
    if (Math.abs(dx) > 40) guess(dx > 0 ? "above" : "below");
    else if (!reduce) { tile.animate([{ transform: tile.style.transform || "none" }, { transform: "none" }], { duration: 450, easing: EASE }); tile.style.transform = ""; }
    else tile.style.transform = "";
  };
  tile.addEventListener("pointerup", drop);
  tile.addEventListener("pointercancel", drop);
}

function show(key, animateWord) {
  current = key;
  const k = KINDS.find((x) => x.key === key);
  views.value = 0;
  const r = rated(key, 1);
  hero.dataset.kindPair = key;
  hero.dataset.head = DARK_KINDS.has(key) ? "dark" : "light";
  art.show(key, animateWord && !reduce);
  $("[data-frame-name]").textContent = `rating.txt / ${k.name}`;
  $("[data-who-name]").textContent = k.name;
  $("[data-who-handle]").textContent = k.handle;
  $("[data-who-size]").textContent = r.sizeBand;
  $("[data-peers]").textContent = r.peers;
  $("[data-noun]").textContent = k.noun;
  $("[data-noun-2]").textContent = k.noun;
  $("[data-unit]").textContent = k.unit;
  $$("[data-kind]", kindList).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === key)));
  revealKind(key);
  setWord(k.word, animateWord);
  paint(r);
  fillNote(key, animateWord);
  fillPost(key);
}

views.addEventListener("input", () => { stopCycle(); paint(rated(current, F(Number(views.value)))); });
addEventListener("resize", () => { paint(rated(current, F(Number(views.value)))); placeArt(); fadeKinds(); });

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
fadeKinds();
document.fonts?.ready.then(() => { paint(rated(current, F(Number(views.value)))); placeArt(); fadeKinds(); });

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
  $("[data-sell-fee-s]").textContent = gbp(s.fee);
  $("[data-sell-prem-s]").textContent = gbp(s.premium);
  stopCount($("[data-sell-net]"));
  $("[data-sell-net]").textContent = gbp(s.net);
  $("[data-sell-net-2]").textContent = gbp(s.net);
  $("[data-sell-slices]").innerHTML = s.slices.map((x) => `<li>${x.rateBps / 100}% of ${gbp(x.from)} to ${gbp(x.to)}: ${gbp(x.fee)}</li>`).join("") + (s.minimum ? `<li>Below £4,000, so the minimum applies.</li>` : "") + `<li>Buyer pays ${gbp(s.buyerPays)} in all.</li>`;
  sellIn.setAttribute("aria-valuetext", `${gbp(s.price)}. Seller's fee ${gbp(s.fee)}, you receive ${gbp(s.net)}.`);
}
sellIn.addEventListener("input", paintSale);
paintSale();

/* ---------------------------------------------------------------- The Record: estimate and paid, racing; a click runs it again */
const d = disagree();
const estEl = $("[data-race-est]"), paidEl = $("[data-race-paid]");
const estBar = $("[data-race-est-bar]"), paidBar = $("[data-race-paid-bar]");
const raceLine = $("[data-race-line]");
const RACE_DONE = `${gbp(d.estimate - d.paid)} less was paid.`;
let raceRaf = 0;
const finish = () => {
  estEl.innerHTML = `<s>${gbpExact(d.estimate)}</s>`; paidEl.textContent = gbpExact(d.paid);
  estBar.style.width = "100%"; paidBar.style.width = `${(d.paid / d.estimate) * 100}%`;
  raceLine.textContent = RACE_DONE;
};
function race() {
  cancelAnimationFrame(raceRaf);
  if (reduce) { finish(); return; }
  const D = 1800, t0 = performance.now();
  raceLine.textContent = "Counting both.";
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / D);
    const e = Math.min(d.estimate, d.estimate * t), p = Math.min(d.paid, d.estimate * t);
    estEl.textContent = gbpExact(e); paidEl.textContent = gbpExact(p);
    estBar.style.width = `${(e / d.estimate) * 100}%`; paidBar.style.width = `${(p / d.estimate) * 100}%`;
    if (t < 1) raceRaf = requestAnimationFrame(tick); else finish();
  };
  raceRaf = requestAnimationFrame(tick);
}
$("[data-race-go]").addEventListener("click", race);
$("[data-race] .win-body").addEventListener("click", race);
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
  $("[data-pl-why]").textContent = `${ratio}× a made-up public count of ${count(OP3_SAMPLE)}.`;
  plIn.setAttribute("aria-valuetext", `${count(c)} downloads a month. ${VERDICT[p.verdict]}.`);
}
plIn.addEventListener("input", paintClaim);
paintClaim();

/* ---------------------------------------------------------------- Podcasts / Prefix */
const showIn = $("[data-show]");
function paintPrefix() {
  const id = showIn.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "yourshow";
  let url;
  try { url = prefixed(id, "https://media.example.com/ep1.mp3"); } catch (e) { url = `https://m.orbe.vc/p/${id}/media.example.com/ep1.mp3`; }
  const shown = url.replace(/^https:\/\//, "");
  $("[data-show-out]").textContent = shown;
  $("[data-show-out]").title = shown;
}
showIn.addEventListener("input", paintPrefix);
paintPrefix();

/* ---------------------------------------------------------------- Podcasts / what you get back: the podcast page's own made-up sample */
const podBars = $("[data-pod-bars]");
fetch("./products/fixtures/made-up-feed.xml")
  .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
  .then((xml) => {
    const p = podcastSample(xml, "thelongtable");
    const max = Math.max(...p.byDay.map((d) => d.downloads));
    podBars.innerHTML = p.byDay.map((d) => `<i style="height:${Math.max(4, Math.round((d.downloads / max) * 100))}%"></i>`).join("");
    const top = p.byDay.reduce((a, d) => (d.downloads > a.downloads ? d : a));
    podBars.setAttribute("aria-label", `Downloads by day for 28 days, made up. The busiest day had ${count(top.downloads)}.`);
    $("[data-pod-total]").textContent = count(p.total);
    $("[data-pod-apps]").textContent = p.apps.slice(0, 3).map(([n, v]) => `${n} ${count(v)}`).join(", ");
  })
  .catch(() => { podBars.hidden = true; });

/* ---------------------------------------------------------------- where_you_sit.txt: pick a size, see typical */
const midKind = $("[data-mid-kind]"), midBands = $("[data-mid-bands]");
midKind.innerHTML = benchKinds().map((k) => `<option value="${k.key}">${k.label === "Photography" ? "Photographer" : k.label}</option>`).join("");
let midBand = null;
function paintMid() {
  const m = middle(midKind.value);
  if (!m.rows.some((r) => r.key === midBand)) midBand = m.at;
  const row = m.rows.find((r) => r.key === midBand);
  $$("button", midBands).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.band === midBand)));
  $("[data-mid-fig]").textContent = row.value;
  const mine = midBand === m.at && m.own ? ` ${m.name}, made up: ${m.own}, better than ${m.beats} in 100.` : "";
  $("[data-mid-what]").textContent = `Typical reach for ${m.peers} with ${row.label.replace(/^Under/, "under").replace(/^Over/, "over")} ${m.audienceNoun}.${mine}`;
}
function fillMid() {
  const m = middle(midKind.value);
  midBand = null;
  midBands.innerHTML = "";
  for (const r of m.rows) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = r.label; b.dataset.band = r.key;
    b.addEventListener("click", () => { midBand = r.key; paintMid(); });
    midBands.appendChild(b);
  }
  paintMid();
}
midKind.addEventListener("change", fillMid);
fillMid();

/* ---------------------------------------------------------------- Diligence and Lending, from the engine's fee table */
$("[data-dil]").textContent = gbp(TAKE_RATE.buyers.report.standard);
$("[data-lend]").textContent = gbp(TAKE_RATE.financingFilePrice);

/* ---------------------------------------------------------------- reserve */
/* what you make follows the kind chosen in the instrument above */
const NOTE_IDLE = "Free for creators, for good. Held once your email arrives; we check it’s yours when ratings open.";
const form = $("[data-reserve]");
const handleIn = $("[data-handle]");
handleIn.addEventListener("input", () => {
  const h = cleanHandle(handleIn.value).toLowerCase();
  $("[data-reserve-note]").textContent = h ? `orbe.vc/@${h}, held once your email arrives. We check it’s yours when ratings open.` : NOTE_IDLE;
});
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const h = cleanHandle(handleIn.value).toLowerCase();
  if (!h) { $("[data-reserve-note]").textContent = "Type the handle you’d like first."; handleIn.focus(); return; }
  const kind = KINDS.find((k) => k.key === current)?.word ?? "work";
  const res = await reserve({ handle: h, kind });
  $("[data-reserve-note]").textContent = res.ok ? `Your email app has the request for orbe.vc/@${h}. Held once it arrives.` : "That handle is taken. Try another.";
});

/* ---------------------------------------------------------------- windows open, once
  Each window opens the way a 1-bit window did: two outlines step out from
  its title bar to its frame in 180ms, then the window is there. The note's
  lines then arrive in reading order, and its rating and the sale's net
  count up to the engine's values. Each plays once; reduced motion skips it all.
*/
const wall = $("[data-wall]");
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
  /* a keyboard arriving first opens them all at once: nothing focusable stays shut */
  wall.addEventListener("focusin", () => { wins.forEach((w) => { io.unobserve(w); if (w.classList.contains("shut")) { w.classList.remove("shut"); if (w === noteEl) openNote(); } }); }, { once: true });
}

/* ---------------------------------------------------------------- moving the windows
  On a desktop the windows, and the instrument at the top, can be picked up by their title rows, the
  way TypeSafe's can: a press brings one to the front, a drag moves it
  within the section, and Tidy puts every window back on the grid. A
  focused title moves with the arrow keys (Shift for a longer step), and
  Escape puts that one back. On a phone nothing moves and the windows stack.
*/
const tidyRow = $("[data-tidy-row]"), tidyBtn = $("[data-tidy]"), tidySay = $("[data-tidy-say]");
const moveWins = [hero, ...$$("[data-win]", wall)];
const off = new Map(moveWins.map((w) => [w, { x: 0, y: 0 }]));
let movable = false, zTop = 1;
const canMove = () => { try { return matchMedia("(min-width: 1024px)").matches && !matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } };
const nameOf = (w) => $("[data-grip]", w).textContent;
function put(w, x, y) {
  const o = off.get(w);
  const r = w.getBoundingClientRect(), S = w.closest("section").getBoundingClientRect(), pad = 8;
  /* the instrument never goes up under the fixed header */
  const padTop = w === hero ? $("[data-bar]").offsetHeight + 8 : pad;
  const baseL = r.left - o.x, baseT = r.top - o.y;
  o.x = Math.round(Math.max(S.left + pad - baseL, Math.min(S.right - pad - r.width - baseL, x)));
  o.y = Math.round(Math.max(S.top + padTop - baseT, Math.min(S.bottom - pad - r.height - baseT, y)));
  w.style.transform = o.x || o.y ? `translate(${o.x}px, ${o.y}px)` : "";
  if (w === hero) heroTidy.hidden = !(o.x || o.y);
}
/* the instrument's own Tidy, shown only once it has been moved */
const heroTidy = document.createElement("button");
heroTidy.type = "button"; heroTidy.className = "win-btn"; heroTidy.textContent = "Tidy"; heroTidy.hidden = true;
heroTidy.addEventListener("click", () => { settleBack([hero]); heroTidy.hidden = true; $("[data-grip]", hero).focus(); });
$(".win-ctl", hero).appendChild(heroTidy);
const front = (w) => { if (movable) w.style.zIndex = String(++zTop); };
function settleBack(list) {
  for (const w of list) {
    if (!reduce) { w.classList.add("tidying"); setTimeout(() => w.classList.remove("tidying"), 340); }
    const o = off.get(w); o.x = 0; o.y = 0; w.style.transform = "";
    if (w === hero) heroTidy.hidden = true;
  }
}
function setMovable(on) {
  movable = on;
  wall.classList.toggle("movable", on);
  $(".stage").classList.toggle("movable", on);
  tidyRow.hidden = !on;
  for (const w of moveWins) {
    const g = $("[data-grip]", w);
    if (on) {
      g.tabIndex = 0; g.setAttribute("role", "button");
      g.setAttribute("aria-roledescription", "movable window");
      g.setAttribute("aria-describedby", "move-help");
    } else {
      g.removeAttribute("tabindex"); g.removeAttribute("role"); g.removeAttribute("aria-roledescription"); g.removeAttribute("aria-describedby");
      const o = off.get(w); o.x = 0; o.y = 0; w.style.transform = ""; w.style.zIndex = "";
    }
  }
}
const help = document.createElement("span");
help.id = "move-help"; help.className = "sr";
help.textContent = "Arrow keys move this window, Shift for a longer step. Escape puts it back.";
tidyRow.appendChild(help);

let held = null;
for (const w of moveWins) {
  const bar = $(".win-bar", w), grip = $("[data-grip]", w);
  w.addEventListener("pointerdown", () => front(w));
  bar.addEventListener("pointerdown", (e) => {
    if (!movable || e.button !== 0 || e.target.closest("a, button, input, summary, label, .kinds")) return;
    e.preventDefault();
    const o = off.get(w);
    held = { w, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y };
    bar.setPointerCapture(e.pointerId);
    w.classList.add("held");
  });
  bar.addEventListener("pointermove", (e) => {
    if (!held || held.w !== w || held.id !== e.pointerId) return;
    put(w, held.ox + e.clientX - held.sx, held.oy + e.clientY - held.sy);
  });
  const drop = (e) => {
    if (!held || held.w !== w) return;
    held = null; w.classList.remove("held"); headTheme();
    try { bar.releasePointerCapture(e.pointerId); } catch (err) {}
  };
  bar.addEventListener("pointerup", drop);
  bar.addEventListener("pointercancel", drop);
  grip.addEventListener("focus", () => front(w));
  grip.addEventListener("keydown", (e) => {
    if (!movable) return;
    const step = e.shiftKey ? 64 : 16, o = off.get(w);
    const by = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (by) { e.preventDefault(); put(w, o.x + by[0], o.y + by[1]); return; }
    if (e.key === "Escape") { e.preventDefault(); settleBack([w]); tidySay.textContent = `${nameOf(w)} is back in its place.`; }
  });
}
tidyBtn.addEventListener("click", () => {
  settleBack(moveWins);
  moveWins.forEach((w) => { w.style.zIndex = ""; });
  tidySay.textContent = "Every window is back on the grid.";
});
setMovable(canMove());
addEventListener("resize", () => {
  const on = canMove();
  if (on !== movable) setMovable(on);
  else if (on) for (const w of moveWins) { const o = off.get(w); put(w, o.x, o.y); }
});

/* ---------------------------------------------------------------- the giant mark */
mountGiant($("[data-giant]"), $("[data-giant-svg]"), $("[data-giant-cap]"),
  KINDS.map((k) => ({ name: k.name, beats: beatsOf(rated(k.key, 1)) })), { reduce: reduce || !("IntersectionObserver" in window) });

/* ---------------------------------------------------------------- who it's for: one live figure each, from the engine */
{
  const q = quote(155000).find((x) => x.format === "integration")?.s;
  if (q && q.status === "suggested") $("[data-for-brand]").textContent = `${gbp(q.low.amount)} to ${gbp(q.high.amount)}`;
  const rs = KINDS.map((k) => rated(k.key, 1).rating).sort((a, b) => a - b);
  $("[data-for-roster]").textContent = `${minus(signed(rs[0]))} to ${minus(signed(rs.at(-1)))}`;
  $("[data-for-roster-cap]").textContent = "Six made-up clients, rated by size";
  $("[data-for-gap]").textContent = gbpExact(d.estimate - d.paid);
  const m = middle(benchKinds()[0].key), row = m.rows.find((r) => r.key === m.at);
  $("[data-for-mid]").textContent = row.value;
  $("[data-for-mid-cap]").textContent = `Typical reach, ${row.label.replace(/^Under/, "under").replace(/^Over/, "over")} ${m.audienceNoun}`;
}

/* ---------------------------------------------------------------- the audience line: jump to the part, light it once */
for (const a of $$("[data-aud] a")) {
  a.addEventListener("click", (e) => {
    const ids = a.dataset.to.split(" ");
    const els = ids.map((id) => (id === "hero" ? hero : document.getElementById(id))).filter(Boolean);
    if (!els.length) return;
    e.preventDefault();
    const first = els[0];
    first.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: first === hero ? "nearest" : "center" });
    for (const el of els) {
      el.classList.remove("lit");
      void el.offsetWidth;
      el.classList.add("lit");
      clearTimeout(el._lit);
      el._lit = setTimeout(() => el.classList.remove("lit"), reduce ? 4000 : 1800);
    }
    if (first === hero) $("[data-kind][aria-pressed=\"true\"]", hero).focus({ preventScroll: true });
    else first.focus({ preventScroll: true });
  });
}

/* ---------------------------------------------------------------- the pointer's trail, in the Sky hero
  Where a mouse moves over the hero, a light confetti of the lattice follows
  it: cells a little smaller than fal's 11.28px pitch, softly rounded, half
  see-through, each lifted off the paper by a soft shadow. They fade and
  drift up two pixels over 0.9s; a click scatters a small cluster. At most
  40 at once, drawn on one canvas under the words, and nothing runs once
  the last has gone. Off on touch and under reduced motion.
*/
{
  const fine = (() => { try { return matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { return false; } })();
  const cv = $("[data-trail]");
  if (fine && !reduce && cv) {
    const heroEl = $(".hero"), ctx = cv.getContext("2d");
    const CELL = 11.28, INSET = 1.6, LIFE = 900, MAX = 40, DRIFT = 2;
    const TRAIL = {
      explainer: ["#EED56A", "#FBFAF6", "#1F4BFF"], devlog: ["#FBFAF6", "#141311", "#EED56A"], podcast: ["#F2879E", "#FBFAF6", "#6F1726"],
      letsplay: ["#1238D6", "#FBFAF6", "#EED56A"], recipe: ["#FBD9E0", "#FBFAF6", "#1F4BFF"], longexposure: ["#6F1726", "#FBD9E0", "#FBFAF6"],
    };
    let cells = [], raf = 0, dpr = 1, last = "";
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      const w = heroEl.clientWidth, h = heroEl.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    };
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(heroEl);
    const draw = (now) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      cells = cells.filter((c) => now - c.t < LIFE);
      ctx.shadowColor = "rgba(20, 19, 17, 0.16)";
      ctx.shadowBlur = 4 * dpr; ctx.shadowOffsetY = 1 * dpr;
      const s = (CELL - INSET * 2) * dpr, rad = 2 * dpr;
      for (const c of cells) {
        const t = Math.max(0, (now - c.t) / LIFE), e = ease(t);
        ctx.globalAlpha = c.a * (1 - e);
        ctx.fillStyle = c.c;
        const x = (c.x * CELL + INSET) * dpr, y = (c.y * CELL + INSET - DRIFT * e) * dpr;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, s, s, rad); else ctx.rect(x, y, s, s);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = cells.length ? requestAnimationFrame(draw) : 0;
    };
    const add = (x, y, now) => {
      const pal = TRAIL[current] ?? TRAIL.explainer;
      const i = (((x * 7 + y * 3) % pal.length) + pal.length) % pal.length;
      cells.push({ x, y, t: now, c: pal[i], a: 0.35 + (((x * 13 + y * 29) % 11) / 10) * 0.25 });
      if (cells.length > MAX) cells.splice(0, cells.length - MAX);
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const at = (e) => { const b = heroEl.getBoundingClientRect(); return [Math.floor((e.clientX - b.left) / CELL), Math.floor((e.clientY - b.top) / CELL)]; };
    const over = (e) => e.pointerType === "mouse" && !e.target.closest(".stage");
    heroEl.addEventListener("pointermove", (e) => {
      if (!over(e) || e.buttons) return;
      const [x, y] = at(e), k = `${x},${y}`;
      if (k === last) return;
      /* a fast move fills a few cells between, every other one, so the line stays light */
      const now = performance.now(), [px, py] = last ? last.split(",").map(Number) : [x, y];
      const n = Math.min(6, Math.max(Math.abs(x - px), Math.abs(y - py)));
      for (let i = 2; i < n; i += 2) add(Math.round(px + ((x - px) * i) / n), Math.round(py + ((y - py) * i) / n), now - (n - i) * 8);
      last = k;
      add(x, y, now);
    });
    heroEl.addEventListener("pointerdown", (e) => {
      if (!over(e) || e.target.closest("a, button, input, select, label")) return;
      const [x, y] = at(e), now = performance.now();
      for (const [dx, dy] of [[0, 0], [1, -1], [-1, 0], [1, 1], [-2, -1], [0, 2], [2, 0]]) add(x + dx, y + dy, now - Math.abs(dx + dy) * 40);
    });
    heroEl.addEventListener("pointerleave", () => { last = ""; });
  }
}

/* ---------------------------------------------------------------- the close: two lattice creatures settle in from the block's edges, once */
mountBlockArt($("[data-block]"), $("[data-block-art]"), { reduce });
for (const a of $$("[data-to-hero]")) {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    hero.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    $("[data-kind][aria-pressed=\"true\"]", hero).focus({ preventScroll: true });
  });
}

/* ---------------------------------------------------------------- the header's colours
  An IntersectionObserver whose root is cut down to a one pixel line through
  the middle of the fixed header reports which declared fields ([data-head])
  are under it. Each part of the header (the mark, the links, the button)
  then takes the theme of the smallest field under its own centre, so a
  dark window under the links turns only the links. Nothing runs between
  crossings; a field changing its theme (the instrument's kind, the mark in
  the footer) is caught by a MutationObserver.
*/
const bar = $("[data-bar]");
const parts = $$("[data-part]", bar);
/* a window's title row is Chalk whatever its body is */
$$(".win-bar").forEach((b) => { b.dataset.head = "light"; });
const fields = $$("[data-head]");
const under = new Set();
function headTheme() {
  const B = bar.getBoundingClientRect(), y = B.top + B.height / 2;
  const live = [...under].filter((el) => !el.classList.contains("shut")).map((el) => [el, el.getBoundingClientRect()]).filter(([, r]) => r.top <= y && r.bottom >= y);
  for (const p of parts) {
    const P = p.getBoundingClientRect(), x = P.left + P.width / 2;
    let best = null, area = Infinity;
    for (const [el, r] of live) {
      if (r.left > x || r.right < x) continue;
      const A = r.width * r.height;
      /* the smallest field wins; at the same size, the one inside the other */
      if (A < area || (A === area && best?.contains(el))) { best = el; area = A; }
    }
    const on = best?.dataset.head ?? "light";
    if (p.dataset.on !== on) p.dataset.on = on;
  }
}
let headIO = null;
function watchHead() {
  headIO?.disconnect();
  under.clear();
  const B = bar.getBoundingClientRect(), mid = Math.round(B.top + B.height / 2);
  headIO = new IntersectionObserver((es) => {
    for (const e of es) e.isIntersecting ? under.add(e.target) : under.delete(e.target);
    headTheme();
  }, { rootMargin: `${-mid}px 0px ${-(innerHeight - mid - 1)}px 0px`, threshold: 0 });
  fields.forEach((f) => headIO.observe(f));
}
if ("IntersectionObserver" in window) {
  watchHead();
  let rs = 0;
  addEventListener("resize", () => { clearTimeout(rs); rs = setTimeout(watchHead, 120); });
  new MutationObserver(headTheme).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-head", "class"] });
}
