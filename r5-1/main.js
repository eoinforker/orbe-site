import { ORDER, example, mathsFor, EXAMPLE_LINE, signed } from "../assets/r5/examples.js";
import { reserve, cleanHandle, MAILBOX } from "../assets/r5/reserve.js";
import { SELLER_FEE, PRICES } from "../assets/r5/terms.js";
import { value, gbp } from "../assets/js/valuation.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const mq = matchMedia("(prefers-reduced-motion: reduce)");
const still = () => mq.matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (s) => Number(String(s).replace("−", "-"));
const outQuart = (t) => 1 - Math.pow(1 - t, 4);
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const EX = Object.fromEntries(ORDER.map((k) => [k, example(k)]));
/* What a report reads first, in each kind's own terms. */
const PIECE = { channel: "upload", newsletter: "issue", stream: "stream", podcast: "episode", portfolio: "release" };

$$("[data-line]").forEach((el) => (el.textContent = EXAMPLE_LINE));

/* The wordmark: an O whose stress tilts like a pen's, turning once into place. */
function drawO(tilt) {
  const cx = 20, cy = 20, R = 18.6, rx = 12.4, ry = 16.6, t = (tilt * Math.PI) / 180, pts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push(`${(cx + x * Math.cos(t) - y * Math.sin(t)).toFixed(2)},${(cy + x * Math.sin(t) + y * Math.cos(t)).toFixed(2)}`);
  }
  return `M${cx - R},${cy}a${R},${R} 0 1,0 ${R * 2},0a${R},${R} 0 1,0 ${-R * 2},0Z M${pts.join(" L")}Z`;
}
const oPath = $(".wm-o-path");
oPath.setAttribute("fill-rule", "evenodd");
if (still()) oPath.setAttribute("d", drawO(-18));
else {
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 1400);
    oPath.setAttribute("d", drawO(62 - 80 * outQuart(k)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Count a rating from one value to another, the way a result settles. */
const counting = new WeakMap();
function countTo(el, to, ms = 700) {
  cancelAnimationFrame(counting.get(el));
  const from = el.dataset.n ? Number(el.dataset.n) : 0;
  el.dataset.n = to;
  if (still() || ms === 0 || from === to) { el.textContent = signed(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = signed(Number((from + (to - from) * outQuart(k)).toFixed(2)));
    if (k < 1) counting.set(el, requestAnimationFrame(step));
  };
  counting.set(el, requestAnimationFrame(step));
}

/* Swap the words of a block with a short blurred crossfade (240ms). */
async function crossfade(els, write) {
  if (still()) { write(); return; }
  els.forEach((e) => e.classList.add("swap-out"));
  await wait(200);
  write();
  requestAnimationFrame(() => els.forEach((e) => e.classList.remove("swap-out")));
}

/* Hold a block at the height of its tallest kind, so nothing below it moves. */
function lockHeight(el, render, current) {
  el.style.minHeight = "";
  let max = 0;
  ORDER.forEach((k) => { render(k, true); max = Math.max(max, el.offsetHeight); });
  render(current, true);
  el.style.minHeight = `${max}px`;
}

/* ---------- 1. The report, arriving ---------- */
const report = $("[data-report]");
const rp = (f) => $(`[data-f="${f}"]`, report);
const partsHTML = (d, sub) => d.parts.map((p) => `<li><span class="n">${esc(p.name)}</span><span class="v">${esc(p.value)}</span><span class="bar"><i style="--k:${p.score / 100}"></i></span>${sub(p)}</li>`).join("");
let heroKind = "channel";

function fillReport(k, instant) {
  const d = EX[k];
  rp("label").textContent = d.label;
  rp("best").textContent = d.best;
  rp("name").textContent = d.name;
  rp("size").textContent = d.sizeBand;
  rp("band").textContent = d.band;
  rp("peers").textContent = d.peers;
  rp("parts").innerHTML = partsHTML(d, (p) => `<span class="s">Better than ${p.score} in 100 ${esc(d.peers)} your size</span>`);
  if (instant) { const n = rp("rating"); n.dataset.n = d.rating; n.textContent = d.signed; }
}

const readBar = $(".rp-read i", report);
async function read(k, ms) {
  rp("when").textContent = `Reading your latest ${PIECE[k]}`;
  if (still()) return;
  readBar.getAnimations().forEach((a) => a.cancel());
  await readBar.animate(
    [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1, offset: 0.85 }, { transform: "scaleX(1)", opacity: 0 }],
    { duration: ms, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }
  ).finished.catch(() => {});
}

async function showKind(k, first = false) {
  heroKind = k;
  const blocks = $$(".rp-best, .rp-who, .rp-verdict, .rp-parts .n, .rp-parts .v, .rp-parts .s", report);
  if (first) {
    fillReport(k);
    $$(".bar i", report).forEach((b) => (b.style.transform = "scaleX(0)"));
    await read(k, 1100);
    if (heroKind !== k) return;
    rp("when").textContent = "6 minutes after you posted";
    countTo(rp("rating"), EX[k].rating, 900);
    requestAnimationFrame(() => $$(".bar i", report).forEach((b) => (b.style.transform = "")));
    return;
  }
  const reading = read(k, 650);
  await crossfade(blocks, () => { fillReport(k); countTo(rp("rating"), EX[k].rating, 520); });
  await reading;
  if (heroKind !== k) return;
  rp("when").textContent = "6 minutes after you posted";
}

const heroSelect = $('[data-form="hero"] [data-kind]');
function arrive() {
  fillReport("channel");
  if (still()) { fillReport("channel", true); return; }
  report.classList.add("pre");
  rp("rating").textContent = signed(0);
  rp("rating").dataset.n = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    report.classList.add("arrive");
    report.classList.remove("pre");
    setTimeout(() => showKind("channel", true), 260);
  }));
}

/* The hero cycles through the kinds while nobody is using it; the form's kind follows. */
let idle = true, paused = false, inView = true, cycleT;
function cycle() {
  clearTimeout(cycleT);
  if (still()) return;
  cycleT = setTimeout(() => {
    if (idle && !paused && inView && !document.hidden) {
      const k = ORDER[(ORDER.indexOf(heroKind) + 1) % ORDER.length];
      heroSelect.value = k;
      showKind(k);
    }
    if (idle) cycle();
  }, 4200);
}
const stopCycle = () => { idle = false; clearTimeout(cycleT); };
const heroForm = $('[data-form="hero"]');
["focusin", "pointerdown"].forEach((ev) => heroForm.addEventListener(ev, stopCycle));
report.addEventListener("pointerenter", () => (paused = true));
report.addEventListener("pointerleave", () => (paused = false));
new IntersectionObserver(([e]) => (inView = e.isIntersecting)).observe(report);
heroSelect.addEventListener("change", () => { stopCycle(); showKind(heroSelect.value); });

/* ---------- 2. The rating ---------- */
const MIN = -3, MAX = 3;
const at = (r) => ((Math.max(MIN, Math.min(MAX, r)) - MIN) / (MAX - MIN)) * 100;
const ticks = $(".scale-ticks");
for (let v = MIN * 5; v <= MAX * 5; v++) {
  const t = document.createElement("i");
  t.style.left = `${at(v / 5)}%`;
  if (v === 0) t.className = "z"; else if (v % 5 === 0) t.className = "m";
  ticks.appendChild(t);
}
const CUTS = [[-2], [-0.8], [0.8], [2]];
const NAMES = [["Poor", -2.5], ["Subpar", -1.4], ["Average", 0], ["Good", 1.4], ["Great", 2.5]];
$(".scale-bands").innerHTML =
  CUTS.map(([c]) => `<b style="left:${at(c)}%"></b>`).join("") +
  NAMES.map(([n, c]) => `<span style="left:${at(c)}%">${n}</span>`).join("");
const sYou = $(".scale-you");
const sNum = $('[data-s="num"]');

const seg = $(".seg");
seg.insertAdjacentHTML("beforeend", ORDER.map((k, i) => `<button role="tab" id="tab-${k}" aria-controls="rc-panel" data-k="${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(EX[k].label)}</button>`).join(""));
const pill = $(".seg-pill");
const placePill = () => {
  const b = $('[aria-selected="true"]', seg);
  pill.style.width = `${b.offsetWidth}px`;
  pill.style.transform = `translateX(${b.offsetLeft}px)`;
};
const rc = $(".rc");
const rg = (f) => $(`[data-g="${f}"]`, rc);
const explain = $("[data-explain]");
let ratingKind = "channel";
let kept = "";

function fillRating(k, instant) {
  const d = EX[k];
  rg("name").textContent = d.name;
  rg("size").textContent = `${d.label}, ${d.sizeBand}`;
  rg("band").textContent = d.band;
  rg("parts").innerHTML = d.parts.map((p) => `<li><span class="n">${esc(p.name)}</span><span class="v">${esc(p.value)}</span><span class="w">${esc(p.what)} <b>Better than ${p.score} in 100.</b></span></li>`).join("");
  explain.textContent = `${d.explain} Together that comes to ${d.signed}: ${d.band.toLowerCase()} for ${d.peers} this size.`;
  $('[data-s="name"]').textContent = d.name;
  fillMaths(k);
  $('[data-s="cap"]').textContent = `the example ${d.word}, against ${d.peers} the same size`;
  if (instant) { rg("rating").dataset.n = d.rating; rg("rating").textContent = d.signed; }
}
function placeMarker(k) {
  sYou.style.setProperty("--x", at(EX[k].rating));
  sNum.textContent = EX[k].signed;
}

async function selectKind(k, { focus = false } = {}) {
  const b = $(`[data-k="${k}"]`, seg);
  $$("button", seg).forEach((x) => { const on = x === b; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1; });
  rc.querySelector("[role=tabpanel]").setAttribute("aria-labelledby", b.id);
  placePill();
  if (seg.scrollWidth > seg.clientWidth) seg.scrollLeft = Math.max(0, b.offsetLeft - (seg.clientWidth - b.offsetWidth) / 2);
  if (focus) b.focus();
  if (k === ratingKind) return;
  ratingKind = k;
  if (kept) $("[data-kick]").textContent = `@${kept}: here's how a ${EX[k].word} your size is read.`;
  placeMarker(k);
  countTo(rg("rating"), EX[k].rating, 650);
  await crossfade($$(".rc-head, .rc-score em, .rc-parts .n, .rc-parts .v, .rc-parts .w, .explain, .scale-cap, .maths-list, [data-maths-note]", document), () => fillRating(k));
}
seg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) selectKind(b.dataset.k); });
seg.addEventListener("keydown", (e) => {
  const i = ORDER.indexOf(ratingKind);
  const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ORDER.length - 1 }[e.key];
  if (n === undefined) return;
  e.preventDefault();
  selectKind(ORDER[(n + ORDER.length) % ORDER.length], { focus: true });
});

/* The maths for the kind on show: every part, its weight, and what it measures. */
const mathsList = $("[data-maths]");
function fillMaths(k) {
  const d = EX[k], m = mathsFor(k);
  const top = Math.max(...m.map((x) => x.weight));
  $("[data-maths-note]").textContent = `How a ${d.word}'s rating adds up. Each part is scored against ${d.peers} the same size, where zero is the typical one, then weighted. A measure of how your work is doing, not a score of your talent.`;
  mathsList.innerHTML = m.map((x) => `<li><span class="mn">${esc(x.name)}</span><span class="mb"><i style="width:${(x.weight / top) * 100}%"></i></span><span class="mw">${x.weight}%</span><span class="mt">${esc(x.what)}</span></li>`).join("");
}

fillRating("channel", true);
placeMarker("channel");

/* ---------- 3. Record and value ---------- */
$('[data-rec="handle"]').textContent = `orbe.vc/${EX.channel.handle}`;
$("[data-fee]").textContent = `${SELLER_FEE}.`;
const sources = $(".sources");
const stamps = $$("li span:last-child", sources);
const dates = stamps.map((s) => s.textContent);
if (!still()) {
  stamps.forEach((s) => { s.textContent = "Reading"; s.parentElement.classList.add("wait"); });
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    stamps.forEach((s, i) => setTimeout(() => { s.textContent = dates[i]; s.parentElement.classList.remove("wait"); }, 500 + i * 420));
  }, { threshold: 0.5 });
  io.observe(sources);
}

const input = $("#profit");
const tickRow = $(".ticks");
const TN = 47;
for (let i = 0; i < TN; i++) tickRow.appendChild(document.createElement("i"));
function val() {
  const profit = Number(input.value);
  const rpm = 4.2;
  const v = value({ views: (profit * 0.55 * 1000) / (12 * rpm), rpm, sponsors: profit * 0.35, other: profit * 0.1, margin: 1, faceDependence: 0.5, age: 9 });
  $('[data-v="low"]').textContent = gbp(v.low);
  $('[data-v="high"]').textContent = gbp(v.high);
  $('[data-v="mult"]').textContent = `${v.mLow.toFixed(1)} to ${v.mHigh.toFixed(1)} times a year's profit, from what similar businesses sold for`;
  $('[data-v="profit"]').textContent = gbp(profit);
  input.setAttribute("aria-valuetext", `${gbp(profit)} profit a year: ${gbp(v.low)} to ${gbp(v.high)}`);
  const k = (profit - Number(input.min)) / (Number(input.max) - Number(input.min));
  const a = Math.round(k * (TN - 1));
  [...tickRow.children].forEach((t, i) => { t.classList.toggle("on", i < a); t.classList.toggle("at", i === a); });
}
input.addEventListener("input", val);
val();

/* ---------- 4. Buyers ---------- */
$('[data-p="membership"]').textContent = `${PRICES.membership}.`;
$('[data-p="report"]').textContent = `${PRICES.report}, or ${PRICES.reportMember} for members.`;
const DEALS = [
  ["channel", "A music channel", "£120k to £180k"],
  ["newsletter", "A culture newsletter", "£90k to £130k"],
  ["stream", "A strategy game stream", "£140k to £190k"],
  ["portfolio", "A coastal photography studio", "£60k to £90k"],
];
$("[data-deals]").innerHTML = DEALS.map(([k, who, profit]) => {
  const d = EX[k];
  return `<tr><td>${who}<small>${esc(d.sizeBand)}<span class="pm">, ${profit} profit</span></small></td><td class="p">${profit} profit</td><td class="r"><b>${d.signed}</b><span>${d.band}</span></td></tr>`;
}).join("");

const BARS = [["Under 1k", 52], ["1k to 10k", 47], ["10k to 50k", 44], ["50k to 250k", 40], ["Over 250k", 36]];
const top = 60;
$("[data-bars]").innerHTML = BARS.map(([b, v], i) => `<li class="${i === 2 ? "mid" : ""}"><span>${b}</span><span class="t"><i style="--w:${(v / top) * 100}%"></i></span><span class="num">${v}%</span></li>`).join("");
if (!still()) {
  const bars = $$("[data-bars] .t i");
  bars.forEach((b) => b.style.setProperty("--k", 0));
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    bars.forEach((b, i) => setTimeout(() => b.style.setProperty("--k", 1), i * 70));
  }, { threshold: 0.5 });
  io.observe($("[data-bars]"));
}

/* ---------- The handle: reserve it, say so honestly, then land the example on the scale ---------- */
let flight = null;
function land(k, from) {
  const kick = $("[data-kick]");
  const target = $("#rating");
  const y1 = Math.min(target.getBoundingClientRect().top + scrollY, document.documentElement.scrollHeight - innerHeight);
  if (still() || !from) {
    selectKind(k);
    scrollTo({ top: y1, behavior: "instant" });
    if (!still()) { sYou.classList.remove("landing"); void sYou.offsetWidth; sYou.classList.add("landing"); }
    return;
  }
  /* The example's number leaves the report and settles as the mark on the scale while the page moves. */
  const prevT = sYou.style.transition;
  sYou.style.transition = "none";
  selectKind(k);
  placeMarker(k);
  sYou.classList.add("hide");
  const y0 = scrollY;
  const end = sNum.getBoundingClientRect();
  const endDoc = { x: end.left + end.width / 2, y: end.top + scrollY + end.height / 2 };
  const fly = document.createElement("span");
  fly.className = "flyer";
  fly.setAttribute("aria-hidden", "true");
  fly.textContent = EX[k].signed;
  document.body.appendChild(fly);
  const fw = fly.offsetWidth, fh = fly.offsetHeight;
  const startDoc = { x: from.left + fw / 2, y: from.top + y0 + fh / 2 };
  const s1 = 15 / 64;
  const dur = 1500;
  const t0 = performance.now();
  const cancel = () => (flight = "stop");
  flight = "go";
  addEventListener("wheel", cancel, { once: true, passive: true });
  addEventListener("touchstart", cancel, { once: true, passive: true });
  const finish = () => {
    fly.remove();
    sYou.style.transition = prevT;
    sYou.classList.remove("hide");
    sYou.classList.remove("landing"); void sYou.offsetWidth; sYou.classList.add("landing");
    removeEventListener("wheel", cancel);
    removeEventListener("touchstart", cancel);
    flight = null;
  };
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    if (flight === "stop") { finish(); return; }
    const sy = y0 + (y1 - y0) * inOut(t);
    scrollTo({ top: sy, behavior: "instant" });
    const ty = inOut(Math.min(1, t * 1.06));
    const tx = outQuart(t);
    const cx = startDoc.x + (endDoc.x - startDoc.x) * tx;
    const cy = startDoc.y + (endDoc.y - startDoc.y) * ty - sy;
    const sc = 1 + (s1 - 1) * inOut(t);
    fly.style.transform = `translate(${cx - (fw * sc) / 2}px, ${cy - (fh * sc) / 2}px) scale(${sc})`;
    fly.style.transformOrigin = "0 0";
    fly.style.opacity = t > 0.92 ? String(1 - (t - 0.92) / 0.08) : "1";
    if (t < 1) requestAnimationFrame(step);
    else finish();
  };
  requestAnimationFrame(step);
}

$$(".handle").forEach((form) => {
  const slot = form.parentElement;
  const done = $(".done", slot);
  const err = $(".err", form);
  const field = $("input", form);
  field.addEventListener("input", () => (err.textContent = ""));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = cleanHandle(field.value);
    const k = $("[data-kind]", form).value;
    if (!h) { err.textContent = "Type the handle you'd like, without the @."; field.focus(); return; }
    const from = form.dataset.form === "hero" ? rp("rating").getBoundingClientRect() : form.getBoundingClientRect();
    if (form.dataset.form === "hero" && heroKind !== k) { stopCycle(); heroSelect.value = k; fillReport(k, true); }
    const res = await reserve({ handle: h, kind: k });
    if (!res.ok) {
      err.textContent = res.reason === "taken" ? `@${h} is already kept for someone. Try another.` : "That didn't go through. Try again, or write to " + MAILBOX + ".";
      return;
    }
    const word = EX[k].word;
    done.innerHTML = res.via === "api"
      ? `<b><span>@${esc(h)}</span> is yours.</b>Ratings open with YouTube, and yours will be waiting. Here's how a ${word} your size is read.`
      : `<b><span>@${esc(h)}</span> is nearly yours.</b>Your email app has opened with the request written out. Send it and the handle is kept. Ratings open with YouTube, and yours will be waiting.<p class="alt">Nothing opened? Write to <a href="mailto:${MAILBOX}?subject=${encodeURIComponent(`Reserve @${h}`)}">${MAILBOX}</a>.</p>`;
    slot.style.minHeight = `${form.offsetHeight}px`;
    form.hidden = true;
    slot.classList.add("is-done");
    done.hidden = false;
    done.focus({ preventScroll: true });
    done.classList.add("in");
    kept = h;
    $("[data-kick]").textContent = `@${h}: here's how a ${word} your size is read.`;
    await wait(still() ? 0 : 1200);
    land(k, from);
  });
});

/* The nav's button takes you to the field itself. */
$(".top-go").addEventListener("click", (e) => {
  const f = $("#hh");
  if (f.offsetParent === null) return;
  e.preventDefault();
  scrollTo({ top: 0, behavior: still() ? "instant" : "smooth" });
  f.focus({ preventScroll: true });
});

/* ---------- Layout: lock heights so kind changes never move the page ---------- */
function layout() {
  rp("best").style.minHeight = "";
  report.style.minHeight = "";
  lockHeight(rp("best"), (k) => fillReport(k, true), heroKind);
  lockHeight(report, (k) => fillReport(k, true), heroKind);
  lockHeight($(".rc-body"), (k) => fillRating(k, true), ratingKind);
  lockHeight(explain, (k) => fillRating(k, true), ratingKind);
  lockHeight(mathsList, (k) => fillRating(k, true), ratingKind);
  fillRating(ratingKind, true);
  placePill();
}
document.fonts.ready.then(() => {
  layout();
  arrive();
  cycle();
});
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (!flight) { report.style.minHeight = ""; layout(); fillReport(heroKind, true); } }, 150); });
