import { example, ORDER, CARD_EXAMPLE_LINE, EXAMPLE_LINE, MATHS, MODEL_VERSION, signed } from "../assets/r5/examples.js";
import { artwork } from "../assets/r5/artwork.js";
import { renderCard } from "../assets/r5/card.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { HAND } from "./hand.js";
import { annotate, layer, note, stroke, strikePath, rectIn, arrowPath } from "./ink.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, still ? 0 : ms));
const phone = () => innerWidth < 900;

/* ---------- palette: Blue or Pink, from ?c=, then memory ---------- */
const root = document.documentElement;
function setPalette(c, remember = true) {
  root.dataset.c = c;
  $$(".palette button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.set === c)));
  if (remember) { try { localStorage.setItem("orbe-c", c); } catch (e) { /* private mode */ } }
  if (typeof paintCards === "function" && document.querySelector("#cards .cd")) paintCards();
}
setPalette(root.dataset.c || "blue", false);
$$(".palette button").forEach((b, i, all) => {
  b.tabIndex = b.dataset.set === root.dataset.c ? 0 : -1;
  b.addEventListener("click", () => { setPalette(b.dataset.set); all.forEach((x) => (x.tabIndex = x === b ? 0 : -1)); });
  b.addEventListener("keydown", (ev) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
    ev.preventDefault();
    const next = all[(i + 1) % all.length];
    next.click(); next.focus();
  });
});

/* ---------- rolling digits: only the digits that change move ---------- */
const ROLLS = new Map();
const ctx = document.createElement("canvas").getContext("2d");
function glyph(el, ch) {
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText(ch).width + (parseFloat(cs.letterSpacing) || 0);
}
function roll(el, text, { instant = false } = {}) {
  ROLLS.set(el, text);
  el.setAttribute("aria-label", text);
  let box = el.querySelector(":scope > .roll");
  const shape = text.replace(/\d/g, "0");
  if (!box || box.dataset.shape !== shape) {
    box = document.createElement("span");
    box.className = "roll"; box.setAttribute("aria-hidden", "true"); box.dataset.shape = shape;
    for (const ch of text) {
      if (/\d/.test(ch)) {
        const d = document.createElement("span"); d.className = "d";
        const col = document.createElement("span"); col.className = "col";
        for (let i = 0; i < 10; i++) { const g = document.createElement("i"); g.textContent = i; col.appendChild(g); }
        d.appendChild(col); box.appendChild(d);
      } else {
        const c = document.createElement("span"); c.className = "c"; c.textContent = ch; box.appendChild(c);
      }
    }
    el.replaceChildren(box);
  }
  const kids = [...box.children], chars = [...text];
  const now = instant || still;
  kids.forEach((k, i) => {
    if (k.classList.contains("c")) { k.textContent = chars[i]; return; }
    const col = k.firstChild;
    col.style.transitionDelay = now ? "0ms" : `${(kids.length - 1 - i) * 30}ms`;
    col.style.transitionDuration = now ? "0ms" : "";
    k.style.transitionDuration = col.style.transitionDuration;
    col.style.transform = `translateY(${-10 * +chars[i]}%)`;
    k.style.width = glyph(el, chars[i]) + "px";
  });
}

/* ---------- the data, all from the engine ---------- */
const PLATFORM = { youtube: "YouTube channel", substack: "Substack newsletter", twitch: "Twitch stream", podcast: "Podcast", photography: "Photography portfolio" };
const DATA = ORDER.map((k) => {
  const e = example(k);
  const d = e.result.detail;
  return { ...e, noun: d.workNoun, nouns: d.workNoun.endsWith("s") ? d.workNoun : d.workNoun + "s", total: d.works ?? d.workRatings.length, works: d.workRatings, art: artwork(k) };
});
const byKind = Object.fromEntries(DATA.map((e) => [e.kind, e]));
const days = (a) => { const n = Math.max(1, Math.round(a)); return n === 1 ? "1 day" : `${n} days`; };
$("#exampleLine").textContent = "Made-up creators and made-up pictures, rated live by the Orbe engine.";

let worksRead = 0;
function bumpRead(n = 1) { worksRead += n; roll($("#worksRead"), worksRead.toLocaleString("en-GB")); }

/* ---------- 1. the wall: five made-up creators, each rated live ---------- */
const wall = $("#wall");
const WALL = ["channel", "stream", "newsletter", "portfolio", "podcast"];
for (const k of WALL) {
  const e = byKind[k];
  const fig = document.createElement("figure");
  fig.className = `tile t-${k}`;
  fig.innerHTML = `<div class="ph"><img alt="" decoding="async"></div><figcaption class="tag"><span class="tag-who"><b></b><em></em></span><span class="tag-r"><b class="num"></b><em></em></span></figcaption>`;
  const img = fig.querySelector("img");
  img.src = e.art.href; img.alt = e.art.alt;
  fig.querySelector(".tag-who b").textContent = e.name;
  fig.querySelector(".tag-who em").textContent = e.sizeBand;
  fig.querySelector(".tag-r b").textContent = e.signed;
  fig.querySelector(".tag-r em").textContent = e.band;
  wall.appendChild(fig);
}

/* ---------- ink: drawn when its panel comes into view ---------- */
const INK = [];
function inkOn(host) {
  if (still) { host.classList.add("on"); return; }
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { host.classList.add("on"); io.disconnect(); } }, { threshold: 0.35 });
  io.observe(host);
}
function drawInk(host, draw) {
  const job = () => {
    host.querySelectorAll(":scope > .ink-layer.auto, :scope > .hand-abs").forEach((n) => n.remove());
    const svg = layer(host.clientWidth, host.clientHeight, "ink-layer auto");
    host.appendChild(svg);
    draw(svg);
  };
  INK.push(job);
  job();
  inkOn(host);
}

function drawHeadline() {
  const s = $("[data-strike]");
  const w = s.parentElement.offsetWidth, h = s.parentElement.offsetHeight;
  const svg = layer(w + 6, h);
  svg.appendChild(stroke(strikePath(w + 6, h, 7), { delay: 650, width: phone() ? 2.6 : 3.4 }));
  s.replaceChildren(svg);
}

function drawWall(svg) {
  const t = $(".t-stream .tag-r", wall);
  const r = rectIn(wall, t);
  const mob = phone();
  const size = mob ? 19 : 24;
  const w = (size / (HAND.ahead.h * 0.92)) * HAND.ahead.w;
  const at = mob ? [Math.min(wall.clientWidth - w - 10, r.x + r.w - w + 6), r.y + r.h + 34] : [r.x - w - 40, r.y + r.h + 26];
  annotate(wall, svg, { target: t, key: "ahead", size, at, from: mob ? [0.86, -0.1] : [0.98, 0.1], to: mob ? [0.45, 1.02] : [0.1, 0.9], pad: 8, seed: 5, delay: 900, bend: mob ? 0.3 : -0.3 });
}

function drawBand(svg) {
  const host = $(".band-in");
  const line = $(".band-line span:last-child");
  const r = rectIn(host, line);
  const mob = phone();
  const n = note("yoursize", mob ? 20 : 30, { delay: 500 });
  n.classList.add("hand-abs", "on-field");
  const at = mob ? [r.x + r.w * 0.28, r.y + r.h + 8] : [r.x + r.w * 0.3, r.y + r.h + 22];
  n.style.left = `${at[0]}px`; n.style.top = `${at[1]}px`;
  host.appendChild(n);
  svg.appendChild(stroke(`M${r.x + 4} ${r.y + r.h - 2} C ${r.x + r.w * 0.4} ${r.y + r.h + 5}, ${r.x + r.w * 0.7} ${r.y + r.h - 1}, ${r.x + r.w - 4} ${r.y + r.h + 3}`, { delay: 200, width: mob ? 3.4 : 5 }));
}

function drawCards(svg) {
  const host = $(".cards");
  const front = $(".cd-front", host);
  if (!front) return;
  const r = rectIn(host, front);
  const mob = phone();
  const size = mob ? 26 : 34;
  const n = note("post", size, { delay: 400 });
  const w = (size / (HAND.post.h * 0.92)) * HAND.post.w;
  const at = mob ? [r.x + 4, r.y - size - 10] : [r.x + r.w - 150, r.y - size - 30];
  n.classList.add("hand-abs");
  n.style.left = `${at[0]}px`; n.style.top = `${at[1]}px`;
  host.appendChild(n);
  const a = mob ? arrowPath([at[0] + w + 8, at[1] + size * 0.5], [at[0] + w + 54, r.y + 26], 0.35) : arrowPath([at[0] + w + 10, at[1] + size * 0.6], [r.x + r.w - 10, r.y + 40], 0.4);
  svg.append(stroke(a.shaft, { delay: 700, width: 2.2 }), stroke(a.head, { delay: 950, width: 2.2 }));
}

/* static notes: [data-hand] spans */
function placeNotes() {
  $$("[data-hand]").forEach((s, i) => {
    const big = !phone();
    const size = +(s.dataset.size || (big ? 26 : 21));
    s.replaceChildren(note(s.dataset.hand, size, { delay: 300 }));
    inkOn(s);
  });
}

/* ---------- 2. the live product ---------- */
const app = $("#app");
const tabs = $("#tabs");
let current = 0, token = 0, auto = !still;
DATA.forEach((e, i) => {
  const b = document.createElement("button");
  b.className = "tab"; b.type = "button"; b.setAttribute("role", "tab");
  b.textContent = e.label;
  b.setAttribute("aria-selected", i === 0 ? "true" : "false");
  b.addEventListener("click", () => { auto = false; show(i); });
  tabs.appendChild(b);
});
$("#model").textContent = `Model ${MODEL_VERSION}`;
$("#weights").innerHTML = `The weights, published: ${MATHS.map((m) => `<span>${m.name} <b>${m.weight}%</b></span>`).join(" ")}`;
const bars = $("#bars");
for (let i = 0; i < 12; i++) { const b = document.createElement("span"); b.className = "bar-w"; bars.appendChild(b); }

function fill(e) {
  $("#name").textContent = e.name;
  $("#meta").textContent = `${e.handle}, ${PLATFORM[e.platform]}`;
  $("#size").textContent = e.sizeBand;
  $("#band").textContent = e.band;
  $("#zero").textContent = `Zero is typical for ${e.peers} this size.`;
  $("#explain").textContent = e.explain;
  const latest = e.works[0];
  $("#reportWhen").textContent = `Latest ${e.noun}, ${days(latest.ageDays)} in`;
  $("#multNoun").textContent = `× a typical ${e.noun}`;
  $("#workRating").textContent = `Rated ${signed(latest.rating)}`;
  $("#barsKey").textContent = `Last 12 ${e.nouns}`;
  $("#lineKey").textContent = `Line marks a typical ${e.noun}`;
  $("#parts").replaceChildren(...e.parts.map((p) => {
    const li = document.createElement("li"); li.className = "part";
    li.innerHTML = `<span class="part-name"></span><span class="part-val"></span><span class="part-beat">Beats <b class="num"></b> in 100</span><span class="part-track"><span class="part-fill"></span></span>`;
    li.querySelector(".part-name").textContent = p.name;
    li.querySelector(".part-val").textContent = p.value;
    li.querySelector(".part-beat b").textContent = p.score;
    li.title = p.what;
    return li;
  }));
  const last = e.works.slice(0, 12).reverse();
  const top = Math.max(2, ...last.map((w) => w.multiple)) * 1.08;
  bars.style.setProperty("--one", `${(1 / top) * 100}%`);
  [...bars.children].forEach((b, i) => { const w = last[i]; b.style.setProperty("--h", w ? `${(w.multiple / top) * 100}%` : "0%"); b.classList.remove("now"); });
}

const appInk = $("#appInk");
function clearAppInk() { appInk.replaceChildren(); app.querySelectorAll(":scope > .hand-abs").forEach((n) => n.remove()); app.classList.remove("inked"); }
function drawAppInk() {
  clearAppInk();
  appInk.setAttribute("width", app.clientWidth); appInk.setAttribute("height", app.clientHeight);
  appInk.setAttribute("viewBox", `0 0 ${app.clientWidth} ${app.clientHeight}`);
  const mob = phone();
  const n = $("#rating-n");
  const r = rectIn(app, n);
  const side = rectIn(app, $(".score-side"));
  // ring the rating; the note sits under the rating's side text
  const at = mob ? [side.x - 4, side.y - 30] : [side.x + 4, side.y - 40];
  annotate(app, appInk, { target: n, key: "ahead", size: mob ? 17 : 21, at, from: [0.02, 0.6], to: [0.98, 0.25], pad: 9, seed: current + 11, bend: 0.4 });
  // ring the newest bar
  const nb = bars.children[11];
  const br = rectIn(app, bars);
  const b = { x: br.x + nb.offsetLeft, y: br.y + nb.offsetTop, w: nb.offsetWidth, h: nb.offsetHeight };
  const at2 = mob ? [b.x - 140, br.y - 34] : [b.x - 160, br.y - 40];
  annotate(app, appInk, { rect: b, key: "newest", size: mob ? 17 : 20, at: at2, from: [0.98, 0.7], to: [0.1, 0.1], pad: 5, seed: current + 21, delay: 500, bend: -0.35 });
  requestAnimationFrame(() => app.classList.add("inked"));
}

async function show(i) {
  const my = ++token;
  current = i;
  [...tabs.children].forEach((t, j) => t.setAttribute("aria-selected", j === i ? "true" : "false"));
  const e = DATA[i];
  clearAppInk();
  if (!still) { app.classList.add("swap"); await wait(240); if (my !== token) return; }
  app.classList.remove("rated"); app.classList.add("reading");
  fill(e);
  [...bars.children].forEach((b) => b.classList.remove("in"));
  app.querySelectorAll(".part-fill").forEach((x) => x.style.setProperty("--s", 0));
  roll($("#rating-n"), e.signed, { instant: true });
  roll($("#mult"), "0.00", { instant: true });
  app.classList.remove("swap");
  const n = e.total;
  const step = Math.max(40, Math.min(80, 1600 / n));
  for (let k = 1; k <= n; k++) {
    if (my !== token) return;
    $("#status").textContent = `Reading ${e.noun} ${k} of ${n}`;
    bumpRead();
    const fromEnd = n - k;
    if (fromEnd < 12) bars.children[11 - fromEnd]?.classList.add("in");
    if (!still) await wait(step);
  }
  if (my !== token) return;
  app.classList.remove("reading"); app.classList.add("rated");
  $("#status").textContent = `Rated against ${e.sizeBand.split(" ").slice(0, 3).join(" ")} ${e.peers}`;
  roll($("#rating-n"), e.signed.replace(/\d/g, "0"), { instant: true });
  await wait(30);
  roll($("#rating-n"), e.signed);
  app.querySelectorAll(".part").forEach((li, j) => setTimeout(() => li.querySelector(".part-fill").style.setProperty("--s", e.parts[j].score / 100), still ? 0 : 120 + j * 60));
  await wait(500);
  if (my !== token) return;
  roll($("#mult"), e.works[0].multiple.toFixed(2));
  bars.children[11].classList.add("now");
  await wait(350);
  if (my !== token) return;
  drawAppInk();
  if (still || !auto) return;
  await wait(6800);
  if (my !== token || !auto) return;
  waitForView(() => { if (my === token && auto) show((current + 1) % DATA.length); });
}
let inView = false, pending = null, started = false;
function waitForView(fn) { if (inView && !document.hidden) fn(); else pending = fn; }
function resume() { if (inView && !document.hidden && pending) { const f = pending; pending = null; f(); } }
new IntersectionObserver(([en]) => {
  inView = en.isIntersecting;
  if (inView && !started) { started = true; show(0); }
  resume();
}, { threshold: 0.2 }).observe(app);
document.addEventListener("visibilitychange", resume);

/* the hero counter counts the wall's reads too: each tile is a rating the engine just made */
function readWall() {
  const total = WALL.reduce((a, k) => a + byKind[k].total, 0);
  if (still) { bumpRead(total); return; }
  let left = total;
  const t = setInterval(() => { const n = Math.min(left, 3); bumpRead(n); left -= n; if (left <= 0) clearInterval(t); }, 28);
}

/* ---------- 3. the band and the cards ---------- */
const bandArt = $("#bandArt");
for (const k of ["stream", "podcast", "portfolio"]) {
  const d = document.createElement("div"); d.className = `bt bt-${k}`;
  const img = document.createElement("img"); img.alt = ""; img.src = byKind[k].art.href; img.decoding = "async";
  const h = document.createElement("span"); h.className = "bt-h"; h.textContent = byKind[k].handle;
  d.append(img, h);
  bandArt.appendChild(d);
}

function cardSvg(k, theme, moment, id) {
  const e = byKind[k], c = e.card;
  return renderCard(e.result, { moment, format: "square", theme, handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: id, works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image });
}
/* The two cards take the brand themes for the current colour: ink with the brand ball behind, the brand field in front. */
const cards = $("#cards");
function paintCards() {
  const c = root.dataset.c === "pink" ? "pink" : "blue";
  const back = cardSvg("channel", `ink-${c}`, "rating", "cb"), front = cardSvg("stream", c, "best", "cf");
  /* Repaint only the two cards, so the hand-drawn ink layer over them stays. */
  if ($(".cd-back", cards)) { $(".cd-back", cards).innerHTML = back; $(".cd-front .c-svg", cards).innerHTML = front; }
  else cards.innerHTML = `<div class="cd cd-back" aria-hidden="true">${back}</div><figure class="cd cd-front"><div class="c-svg">${front}</div><figcaption class="sr">Night Shift's card: a personal best, rated against streamers its size.</figcaption></figure>`;
  $$(".cd svg").forEach((s) => { s.removeAttribute("width"); s.removeAttribute("height"); s.setAttribute("aria-hidden", "true"); });
}
paintCards();
$("#cardNote").textContent = CARD_EXAMPLE_LINE;

/* ---------- reserve ---------- */
function wire(form) {
  const done = $(".done", form);
  const input = $("input", form);
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const h = cleanHandle(input.value);
    done.hidden = false;
    if (!h) { done.className = "done err"; done.textContent = "Type the handle you want, without the @."; input.focus(); return; }
    done.className = "done";
    const res = await reserve({ handle: h, kind: DATA[current].word });
    done.innerHTML = res.via === "api"
      ? `<b></b> Is yours. Ratings open with YouTube: connect your channel to see yours.`
      : `<b></b> Your email app has the request written out. Send it and we hold the handle.`;
    done.querySelector("b").textContent = `orbe.vc/@${h}.`;
  });
  input.addEventListener("input", () => { done.hidden = true; });
}
wire($("#reserve")); wire($("#reserve2"));
$$('a[href="#reserve"]').forEach((a) => a.addEventListener("click", () => setTimeout(() => $("#handle").focus({ preventScroll: true }), 400)));

/* ---------- go ---------- */
mountWordmark($(".bar .wm"), { animate: !still });
mountWordmark($(".foot .wm"), { animate: false });
roll($("#worksRead"), "0", { instant: true });

function drawAll() {
  drawHeadline();
  INK.forEach((j) => j());
  placeNotes();
  if (app.classList.contains("rated") && app.classList.contains("inked")) drawAppInk();
}
async function boot() {
  try { await document.fonts?.ready; } catch (e) { /* fonts optional */ }
  drawHeadline();
  inkOn($(".ever"));
  drawInk(wall, drawWall);
  drawInk($(".band-in"), drawBand);
  drawInk(cards, drawCards);
  $$("[data-ring]").forEach((t, i) => { const host = t.closest(".close-in"); drawInk(host, (svg) => annotate(host, svg, { target: t, pad: phone() ? 8 : 14, seed: 40 + i, width: phone() ? 2.6 : 3.4 })); });
  placeNotes();
  readWall();
  ROLLS.forEach((t, el) => roll(el, t, { instant: true }));
  let w = innerWidth, tm;
  addEventListener("resize", () => { if (innerWidth === w) return; w = innerWidth; clearTimeout(tm); tm = setTimeout(drawAll, 150); });
}
boot();
