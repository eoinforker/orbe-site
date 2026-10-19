/*
  Orbe Studio. Five areas a creator returns to (Today, Work, Record, Deals,
  Sell), plus the small windows around them. On a desktop each is a window that
  moves and stacks; on a phone each is a tab. Every figure comes from data.js,
  which reads the Orbe engine. Copy is gathered in COPY so it can be rewritten
  without touching the logic.
*/
import * as D from "./data.js";
import { createWorld } from "./world.js";
import { WORDMARK } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { icon } from "../assets/icons/icons.js";
import { C as PX, RGB, ICONS as PIXEL } from "../lab/pixel/assets/sprites.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const still = document.documentElement.classList.contains("still");
const isDesk = () => matchMedia("(min-width: 1024px) and (min-height: 600px)").matches;
const lower = (s) => String(s ?? "").toLowerCase();

/* ================================================================ copy, in one place */
const COPY = {
  madeUp: (d) => `<b>Made up.</b> ${esc(d.name)} is an invented ${esc(d.words.kind)}, rated live by the Orbe engine. Use your export and this becomes yours.`,
  mine: (d) => `<b>Yours.</b> Read from ${esc(d.source.label)} on this device. Nothing was sent anywhere.`,
  sayRated: (d) => [["name", d.name], " beats ", ["n", String(d.reachScore)], " in 100 ", ["peers", d.words.peers], " its size, on reach."],
  sayBest: (d) => ["A personal best on ", ["name", d.latest.title], ". Nobody else's numbers were needed for this one."],
  sayUnrated: (d) => [["name", d.name], " needs a few more ", ["peers", d.words.works], " before Orbe can rate it."],
  copied: "Copied. Paste it anywhere.",
  quietSell: "For the day you want it. Until then, keep building. Most people just like knowing what it's worth, and looking costs nothing.",
  week0: "No new work this week. Rest counts too.",
};

/* ================================================================ state */
const S = {
  example: D.madeUpDesk("field"),
  own: null,
  view: "example",
  record: D.madeUpRecord(),
  ownRecord: null,
  sel: null,
  sort: "new",
  month: null,
  ledger: "ledger",
  deal: { format: 0, source: "network", price: null },
  sell: { margin: 0.62, face: 0.2, price: null },
  frame: 0,
};
const desk = () => (S.view === "own" && S.own ? S.own : S.example);
const record = () => S.ownRecord ?? S.record;

/* ================================================================ pixel marks (fal's grid, Orbe's colours) */
const MORE = {
  work: ["                ", "                ", "             kk ", "             ks ", "         kk  ks ", "         kb  ks ", "     kk  kb  ks ", "     kp  kb  ks ", " kk  kp  kb  ks ", " kp  kp  kb  ks ", " kp  kp  kb  ks ", " kp  kp  kb  ks ", "kkkkkkkkkkkkkkkk", "                ", "                ", "                "],
  week: ["                ", " kkkkkk kkkkkk  ", " kbbbbk kssssk  ", " kbppbk kseesk  ", " kbbbbk kssssk  ", " kkkkkk kkkkkk  ", "                ", " kkkkkk kkkkkk  ", " krrrrk keeeek  ", " krkkrk kepeek  ", " krrrrk keeeek  ", " kkkkkk kkkkkk  ", "                ", "                ", "                ", "                "],
  export: ["   kkkkkkkk     ", "   kppppppkk    ", "   kpppppppkk   ", "   kpppppppppk  ", "   kpppkpppppk  ", "   kppkkkppppk  ", "   kpkkkkkpppk  ", "   kppkkkppppk  ", "   kppkkkppppk  ", "   kppkkkppppk  ", "   kpppppppppk  ", "   kkkkkkkkkkk  ", "                ", "  ssssssssssss  ", "                ", "                "],
  people: ["                ", "                ", "   kkk    kkk   ", "  kbbbk  ksssk  ", " kbpbbbkksppssk ", " kbbbbbkkssssssk", " kbbbbbkkssssssk", "  kbbbk  ksssk  ", "   kkk    kkk   ", "      kkkk      ", "     keeeek     ", "    kepeeeek    ", "    keeeeeek    ", "     keeeek     ", "      kkkk      ", "                "],
  earns: ["                ", "     kkkkkk     ", "   kkssssssk    ", "  ksspssssssk   ", "  kspssssssssk  ", " kssssskkssssk  ", " ksssskssksssk  ", " kssssskssssssk ", " ksssskkkksssk  ", " ksssssksssssk  ", "  kssskkkkkssk  ", "  ksssssssssk   ", "   kkssssskk    ", "     kkkkkk     ", "                ", "                "],
};
const MARKS = { today: PIXEL.rate, work: MORE.work, record: PIXEL.diligence, deals: PIXEL.sponsorships, sell: PIXEL.selling, week: MORE.week, export: MORE.export, people: MORE.people, earns: MORE.earns };
const KEY = { k: PX.INK, b: PX.COBALT, e: PX.EMBER, s: PX.STRAW, r: PX.PEONY, p: PX.PAPER };
function pixel(name, scale) {
  const rows = MARKS[name];
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  c.style.width = c.style.height = `${16 * scale}px`;
  c.setAttribute("aria-hidden", "true");
  const g = c.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const k = KEY[ch]; if (k) { g.fillStyle = `rgb(${RGB[k].join(",")})`; g.fillRect(x, y, 1, 1); } }));
  return c;
}

/* ================================================================ the wordmark: its O is your orb, and the switch */
function drawWordmark() {
  const svg = $("[data-wm]");
  const c = WORDMARK.text;
  const d = desk();
  const f = d.rated ? d.reachScore / 100 : 0;
  // the O's counter, filled from the bottom to the score
  const top = -633, bottom = -67, level = bottom - (bottom - top) * f;
  svg.innerHTML = `<defs><clipPath id="wm-o"><ellipse cx="332" cy="-350" rx="220" ry="283"/></clipPath></defs>
    <rect class="wm-fill" clip-path="url(#wm-o)" x="100" y="${level}" width="470" height="${bottom - level + 4}"/>
    ${f > 0 && f < 1 ? `<line class="wm-level" clip-path="url(#wm-o)" x1="100" x2="570" y1="${level}" y2="${level}"/>` : ""}
    ${["O", "r", "b", "e"].map((k) => `<path class="wm-ink" d="${c[k]}"/>`).join("")}`;
  const sw = $("[data-switch]");
  sw.setAttribute("aria-pressed", String(S.view === "own"));
  $("[data-switch-label]").textContent = S.own
    ? `Orbe. Showing ${S.view === "own" ? "your numbers" : "the made-up example"}; press to switch to ${S.view === "own" ? "the example" : "your numbers"}`
    : "Orbe. Press to use your own export";
  sw.title = S.own ? "Switch between yours and the example" : "Use my export";
}

/* ================================================================ Odin's word, for the moments that matter */
const EASE_W = "cubic-bezier(0.45, 0, 0.2, 1)";
function chars(word) {
  const w = document.createElement("span");
  w.className = "w";
  for (const ch of word) { const c = document.createElement("span"); c.className = "c"; c.textContent = ch; w.appendChild(c); }
  return w;
}
function swapWord(slot, word) {
  const old = slot.querySelector(".w:not(.out)");
  if (old && old.textContent === word) return;
  slot.setAttribute("aria-label", word);
  if (!old || still) { slot.replaceChildren(chars(word)); return; }
  const from = slot.getBoundingClientRect().width;
  const next = chars(word);
  old.classList.add("out");
  slot.appendChild(next);
  slot.style.width = "auto";
  const to = slot.getBoundingClientRect().width;
  slot.style.width = from + "px";
  slot.animate([{ width: from + "px" }, { width: to + "px" }], { duration: 450, easing: EASE_W, fill: "forwards" })
    .finished.then(() => { slot.getAnimations().forEach((a) => a.cancel()); slot.style.width = ""; }).catch(() => {});
  old.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 360, easing: EASE_W, fill: "forwards" });
  [...old.children].forEach((c, i) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: i * 12, fill: "forwards" }));
  setTimeout(() => old.remove(), 420);
  [...next.children].forEach((c, i) => c.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 360, delay: i * 24, easing: EASE_W, fill: "backwards" }));
}
/* A sentence of fixed words and slots; on change only the slots move. */
function say(el, parts) {
  const shape = parts.map((p) => (Array.isArray(p) ? `[${p[0]}]` : p)).join("");
  if (el.dataset.shape !== shape) {
    el.dataset.shape = shape;
    el.innerHTML = parts.map((p) => (Array.isArray(p) ? `<span class="slot${p[0] === "n" ? " hi" : ""}" data-s="${p[0]}"></span>` : esc(p))).join("");
  }
  for (const p of parts) if (Array.isArray(p)) swapWord(el.querySelector(`[data-s="${p[0]}"]`), p[1]);
}

/* ================================================================ windows */
const AREAS = ["today", "work", "record", "deals", "sell"];
const WIN = Object.fromEntries($$("[data-win]").map((w) => [w.dataset.win, w]));
let zTop = 20;
const RENDER = {};
const rendered = new Set();
/* Where each window opens on a 1440 x 822 desk, scaled to the desk it is given. */
const PLACE = {
  today: { x: 40, y: 0.44, w: 500 },
  work: { x: 0.33, y: 0.05, w: 640 },
  record: { x: 0.36, y: 0.08, w: 600 },
  deals: { x: 0.40, y: 0.11, w: 520 },
  sell: { x: 0.44, y: 0.14, w: 500 },
  week: { x: 0.56, y: 0.06, w: 420 },
  people: { x: 0.5, y: 0.08, w: 560 },
  export: { x: 0.52, y: 0.08, w: 560 },
  reserve: { x: 0.6, y: 0.2, w: 420 },
  earns: { x: 0.6, y: 0.3, w: 460 },
};
function place(name) {
  const w = WIN[name], p = PLACE[name], host = $(".desk");
  const W = host.clientWidth, H = host.clientHeight;
  const width = Math.min(p.w, W - 40);
  w.style.width = width + "px";
  const x = p.x > 1 ? p.x : Math.round(p.x * W);
  w.style.left = Math.max(12, Math.min(W - width - 12, x)) + "px";
  w.style.top = Math.round((p.y > 1 ? p.y : p.y * H)) + "px";
  if (name === "today") w.style.maxHeight = `${H - Math.round(p.y * H) - 14}px`;
  w.dataset.placed = "1";
}
function front(name) {
  const w = WIN[name];
  for (const o of Object.values(WIN)) o.classList.remove("front");
  w.classList.add("front");
  w.style.zIndex = ++zTop;
}
function open(name, { focus = true } = {}) {
  if (!WIN[name]) return;
  if (!isDesk() && AREAS.includes(name)) return tab(name, { focus });
  const w = WIN[name];
  if (!rendered.has(name)) { RENDER[name]?.(); rendered.add(name); }
  const was = !w.hidden;
  w.hidden = false;
  if (isDesk() && !w.dataset.placed) place(name);
  front(name);
  if (!was && name === "record") rollCounter();
  if (focus) (w.querySelector(".tb-t")).focus?.({ preventScroll: true });
  markBar();
}
function close(name) {
  const w = WIN[name];
  w.hidden = true;
  w.classList.remove("front");
  markBar();
  if (!isDesk()) $(`[data-tab="${currentTab}"]`)?.focus();
}
function markBar() {
  for (const b of $$(".bar-areas [data-go]")) b.setAttribute("aria-current", String(!WIN[b.dataset.go].hidden && WIN[b.dataset.go].classList.contains("front")));
}
for (const w of Object.values(WIN)) {
  $(".tb-t", w).tabIndex = -1;
  $("[data-close]", w).addEventListener("click", () => close(w.dataset.win));
  w.addEventListener("pointerdown", () => { if (isDesk()) { front(w.dataset.win); markBar(); } });
  // drag by the title bar; arrow keys move the window when its title bar has focus
  const tb = $(".tb", w);
  tb.addEventListener("pointerdown", (e) => {
    if (!isDesk() || e.target.closest("button")) return;
    const host = $(".desk").getBoundingClientRect();
    const r = w.getBoundingClientRect();
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    w.classList.add("dragging");
    tb.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const x = Math.max(-r.width + 80, Math.min(host.width - 80, ev.clientX - host.left - ox));
      const y = Math.max(0, Math.min(host.height - 30, ev.clientY - host.top - oy));
      w.style.left = x + "px"; w.style.top = y + "px";
    };
    const up = () => { w.classList.remove("dragging"); tb.removeEventListener("pointermove", move); tb.removeEventListener("pointerup", up); tb.removeEventListener("pointercancel", up); };
    tb.addEventListener("pointermove", move);
    tb.addEventListener("pointerup", up);
    tb.addEventListener("pointercancel", up);
  });
  $(".tb-t", w).addEventListener("keydown", (e) => {
    if (!isDesk()) return;
    const step = e.shiftKey ? 40 : 10;
    const dx = { ArrowLeft: -step, ArrowRight: step }[e.key] ?? 0, dy = { ArrowUp: -step, ArrowDown: step }[e.key] ?? 0;
    if (!dx && !dy) return;
    e.preventDefault();
    w.style.left = (parseFloat(w.style.left) || 0) + dx + "px";
    w.style.top = Math.max(0, (parseFloat(w.style.top) || 0) + dy) + "px";
  });
}
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = Object.values(WIN).filter((w) => !w.hidden && (isDesk() || w.classList.contains("win-sheet")));
  const top = open.sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0];
  if (top && (top.contains(document.activeElement) || !isDesk())) close(top.dataset.win);
});
for (const b of $$("[data-go]")) b.addEventListener("click", () => open(b.dataset.go));

/* phone tabs */
let currentTab = "today";
function tab(name, { focus = false } = {}) {
  currentTab = name;
  document.body.dataset.tab = name;
  for (const a of AREAS) { WIN[a].classList.toggle("on", a === name); WIN[a].hidden = false; if (!rendered.has(a) && a === name) { RENDER[a](); rendered.add(a); } }
  for (const b of $$("[data-tab]")) b.setAttribute("aria-current", String(b.dataset.tab === name));
  if (name === "record") rollCounter();
  scrollTo({ top: 0 });
  if (focus) $(".tb-t", WIN[name]).focus({ preventScroll: true });
  if (name === "today") world.resize();
}
for (const b of $$("[data-tab]")) {
  b.prepend(pixel(b.dataset.tab === "today" ? "today" : b.dataset.tab, 2));
  b.addEventListener("click", () => tab(b.dataset.tab, { focus: true }));
}

/* desktop icons */
const ICONS = [["today", "Today"], ["work", "Work"], ["record", "Record"], ["deals", "Deals"], ["sell", "Sell"], ["week", "Sunday note"], ["people", "Like me"], ["export", "My export"], ["earns", "Orbe earns"]];
$("[data-icons]").innerHTML = ICONS.map(([k, l]) => `<li><button type="button" data-go="${k}"><span class="ic-l">${esc(l)}</span></button></li>`).join("");
for (const b of $$("[data-icons] button")) { b.prepend(pixel(b.dataset.go, 2)); b.addEventListener("click", () => open(b.dataset.go)); }
for (const el of $$("[data-i]")) el.outerHTML = icon(el.dataset.i, { size: 18 });

/* ================================================================ the world */
const world = createWorld($("[data-world]"), {
  reduced: still,
  onOpen: (w) => { S.sel = w.id; open("work"); renderWork(); },
});

/* ================================================================ Today */
function renderSay() {
  const d = desk();
  say($("[data-say]"), d.rated ? (d.latestBest ? COPY.sayBest(d) : COPY.sayRated(d)) : COPY.sayUnrated(d));
  const B = D.bricksOf(d);
  $("[data-bricks]").innerHTML = `<span>${esc(B.works)}</span>${B.hours ? `<span>${esc(B.hours)}</span>` : ""}${B.since ? `<span>${esc(B.since)}</span>` : ""}`;
  $("[data-world-key]").innerHTML = d.rated ? `<b>The hundred:</b> ${esc(d.peersLine)}, on reach. <i class="k-c"></i>beaten <i class="k-s"></i>ahead <i class="k-e"></i>${esc(d.name)}<br><b>Plinths:</b> one per ${esc(d.workWord === "Short" ? "Short" : d.words.work)}, as tall as it did against your typical. <i class="k-p"></i>under <i class="k-c"></i>over <i class="k-s"></i>twice or more` : "";
}
function made(d) {
  if (d.madeUp && !(S.own && S.view === "own")) return `<p class="made"><span>${COPY.madeUp(d)}</span></p>`;
  return `<p class="made mine"><span>${COPY.mine(d)}</span></p>`;
}
function bands(band) {
  return `<div class="bands" aria-label="Band: ${esc(band)}">${["Poor", "Subpar", "Average", "Good", "Great"].map((b) => `<span class="${b === band ? "on" : ""}">${b}</span>`).join("")}</div>`;
}
function spark(d, { sel } = {}) {
  const ws = [...d.works].reverse().slice(-16);
  const W = 460, H = 64, bw = W / ws.length, max = Math.max(2.4, ...ws.map((w) => w.multiple ?? 0));
  const y = (m) => H - 12 - (Math.min(m, max) / max) * (H - 16);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    ${ws.map((w, i) => { const m = w.multiple ?? 0; const cls = w.id === (sel ?? d.latest?.id) ? "now" : m >= 2 ? "hit" : m >= 1 ? "up" : ""; return `<rect class="b ${cls}" x="${i * bw + 2}" y="${y(m)}" width="${bw - 4}" height="${H - 12 - y(m)}"/>`; }).join("")}
    <line class="typ" x1="0" x2="${W}" y1="${y(1)}" y2="${y(1)}"/>
  </svg>`;
}
RENDER.today = renderToday;
/* The next size band up, from the engine's own bands: where they would be compared next. */
function nextBand(d) {
  const bands = d.spec.sizeBands;
  const i = bands.findIndex((b) => d.audience >= b.min && (b.max === undefined || d.audience < b.max));
  const nb = bands[i + 1];
  if (!nb) return null;
  return { label: nb.label.replace(/^Under/, "under").replace(/^Over/, "over"), more: nb.min - d.audience };
}
function renderToday() {
  const d = desk();
  const el = $("[data-today]");
  $("[data-today-meta]").textContent = `${d.name}, as of ${D.day(d.at)}`;
  if (!d.rated) {
    el.innerHTML = `${made(d)}<h3 class="h h-l">Not rated yet</h3><p class="p">${esc(D.nodash(d.result.message))}</p><p class="small">Have ${d.result.have}, need ${d.result.need}.</p>`;
    return;
  }
  const L = d.latest;
  const W = d.words, ww = d.workWord;
  const pb = d.bests.find((b) => b.metric === d.primary) ?? d.bests[0];
  const mom = d.parts.find((p) => p.key === "momentum");
  const cad = d.parts.find((p) => p.key === "cadence");
  const nb = nextBand(d);
  const B = D.bricksOf(d);
  el.innerHTML = `${made(d)}
    <p class="lab">What you made: your latest ${esc(ww)}, ${esc(D.day(L.publishedAt))}</p>
    <h3 class="h h-xl">${esc(L.title)}</h3>
    <div class="fig">
      <div class="big num">${L.multiple != null ? `${L.multiple.toFixed(2)}<small>×</small>` : "new"}</div>
      <p class="fig-side">${L.multiple != null ? `your typical ${esc(ww)}. <b>${D.count(L.value)}</b> ${esc(W.unit)} so far${L.ageDays < 30 && L.projected > L.value * 1.02 ? `, heading for about <b>${D.count(L.projected)}</b>` : ""}.` : "Too new to rate. Check back in a day or two."}</p>
    </div>
    ${L.reachPct != null ? `<p class="p">Against ${esc(d.peersLine)}: it reached ${Math.round(L.reach * 100)}% of your ${esc(W.aud)}, which beats <b>${Math.min(99, L.reachPct)} in 100</b> of them${L.ageDays < 30 ? ", projected to maturity" : ""}.</p>` : ""}
    ${spark(d)}
    <p class="small" style="margin-top:2px">Your last ${Math.min(16, d.works.length)} against your typical (the dashed line). Today's is the orange one.</p>
    <div class="world-slot" data-world-slot></div>

    <hr class="rule">
    <p class="lab">How it's growing</p>
    <dl class="kv">
      ${mom ? `<dt>Your newest ten against the twenty before</dt><dd>${esc(mom.value)}</dd>` : ""}
      ${cad ? `<dt>How often you put work out</dt><dd>${esc(cad.value)}</dd>` : ""}
      <dt>What you've built, ${esc(B.note)}</dt><dd>${esc(B.works)}${B.hours ? `, ${esc(B.hours)}` : ""}</dd>
    </dl>

    <hr class="rule">
    <p class="lab">Personal bests</p>
    ${d.latestBest ? `<p class="p"><b>A personal best, just now:</b> ${esc(d.latestBest.label)}, ${D.count(d.latestBest.value)}, beating your ${D.count(d.latestBest.previous)}. Nobody else's numbers were needed for this one.</p>` : ""}
    <ul class="bests">${d.bests.filter((b) => !b.metric.includes("@")).slice(0, 3).map((b) => `<li><span>${esc(b.label[0].toUpperCase() + b.label.slice(1))}<small>“${esc(b.title)}”</small></span><b class="num">${D.count(b.value)}</b></li>`).join("")}</ul>

    <hr class="rule">
    <p class="lab">Where you stand</p>
    <div class="fig" style="margin-top:0;align-items:center">
      <div class="big num" style="font-size:52px">${esc(d.signed)}</div>
      <p class="fig-side"><b>${esc(d.band)}</b> overall, where zero is typical for ${esc(d.peersLine)}. Typical is a good place to build from.</p>
    </div>
    ${bands(d.band)}
    <ul class="parts">${d.parts.map((p) => `<li><span class="pn">${esc(p.name)}</span><span class="track" aria-hidden="true"><i style="width:${p.score}%"></i></span><span class="pv" aria-label="better than ${p.score} in 100">${p.score}</span></li>`).join("")}</ul>
    <p class="small">Each part against ${esc(d.peersLine)}: 50 is typical, the line marks it.</p>

    <hr class="rule">
    <p class="lab">What's next</p>
    <ul class="reasons">
      ${pb ? `<li>The record to beat: ${esc(pb.label)}, <b>${D.count(pb.value)}</b>.</li>` : ""}
      ${nb ? `<li>${D.count(nb.more)} more ${esc(W.audLong)} and you'd be measured against ${esc(W.peers)} with ${esc(nb.label)} ${esc(d.spec.audienceNoun)}. You'd start that band nearer typical, which is how bands work.</li>` : ""}
      ${d.top ? `<li>Keep what's working: ${esc(d.top.name.toLowerCase())} is your strongest part, better than ${d.top.score} in 100.</li>` : ""}
    </ul>

    <div class="post">
      <p class="lab" style="padding:10px 14px 0;margin:0">The line to post</p>
      <blockquote data-line>${esc(d.line)}</blockquote>
      <div class="post-row"><span class="small" style="margin:0">${d.madeUp && S.view !== "own" ? "About the made-up example, until you use yours." : "Your numbers, in your words."}</span><button class="btn btn-sm btn-cobalt" type="button" data-copy>${icon("copy", { size: 16 })}<span>Copy the line</span></button></div>
    </div>
    <div class="fig" style="gap:8px;margin-top:14px">
      <button class="btn btn-sm" type="button" data-go-in="week">The Sunday note</button>
      <button class="btn btn-sm" type="button" data-go-in="work">Every ${esc(ww === "Short" ? "Short" : W.work)}, rated</button>
    </div>
    <p class="notice"><b>Independently calculated by Orbe.</b> ${esc(d.notice.replace(/^Independently calculated by Orbe\.\s*/, ""))} ${d.provisional ? "Compared on the engine's starting baselines, replaced by measured ones as creators consent to be counted." : ""} Model ${esc(D.MODEL_VERSION)}.</p>`;
  $("[data-copy]", el).addEventListener("click", () => copy(d.line));
  for (const b of $$("[data-go-in]", el)) b.addEventListener("click", () => open(b.dataset.goIn));
  parkWorld();
}
/* On a phone the world sits inside Today, under the latest upload; on a desktop it is the desktop. */
function parkWorld() {
  const w = $("[data-world]"), key = $("[data-world-key]");
  const slot = $("[data-world-slot]");
  const home = $("[data-field]");
  if (!isDesk() && slot) { if (w.parentElement !== slot) { slot.append(w, key); world.resize(); } }
  else if (w.parentElement !== home) { home.insertBefore(w, $("[data-icons]")); home.insertBefore(key, $("[data-icons]")); world.resize(); }
}
async function copy(text) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    try { ok = document.execCommand("copy"); } catch {} t.remove();
  }
  toast(ok ? COPY.copied : "Your browser blocked copying. Select the line and copy it yourself.");
  window.__orbeCopied = ok ? text : null;
}
let toastT = 0;
function toast(msg) { const t = $("[data-toast]"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); }

/* ================================================================ Work */
RENDER.work = renderWork;
function sorted(d) {
  const ws = [...d.works];
  if (S.sort === "best") ws.sort((a, b) => (b.multiple ?? -1) - (a.multiple ?? -1));
  if (S.sort === "reach") ws.sort((a, b) => (b.reachPct ?? -1) - (a.reachPct ?? -1));
  return ws;
}
function renderWork() {
  const d = desk();
  const el = $("[data-work]");
  $("[data-work-meta]").textContent = `${d.works.length} ${lower(d.workNoun ?? d.spec.formats[0].noun)}s`;
  if (!d.works.length) { el.innerHTML = `${made(d)}<p class="p">No works read yet.</p>`; return; }
  if (!S.sel || !d.works.find((w) => w.id === S.sel)) S.sel = d.latest.id;
  const noun = lower(d.workNoun ?? "work");
  const sel = d.works.find((w) => w.id === S.sel);
  const chrono = [...d.works].reverse();
  el.innerHTML = `${made(d)}
    <p class="work-say" data-work-say aria-live="polite"></p>
    <svg class="scrub" data-scrub role="slider" tabindex="0" aria-label="Scrub through your ${esc(noun)}s, oldest to newest" aria-valuemin="1" aria-valuemax="${chrono.length}"></svg>
    <div class="fig" style="justify-content:space-between;margin-top:8px;align-items:center">
      <p class="small" style="margin:0">Drag along the ${esc(noun)}s or use the arrow keys. Each bar is one against your typical, oldest on the left.</p>
    </div>
    <div class="why" data-why></div>
    <div class="fig" style="justify-content:space-between;align-items:center;margin-top:14px">
      <p class="lab" style="margin:0">Every ${esc(noun)}, rated</p>
      <div class="seg" data-sort role="group" aria-label="Sort">
        <button type="button" data-v="new" aria-pressed="${S.sort === "new"}">Newest</button>
        <button type="button" data-v="best" aria-pressed="${S.sort === "best"}">Best</button>
        <button type="button" data-v="reach" aria-pressed="${S.sort === "reach"}">Reach</button>
      </div>
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(noun[0].toUpperCase() + noun.slice(1))}</th><th>Out</th><th class="r">× typical</th><th class="r" title="On reach, against ${esc(d.peersLine ?? "")}">In 100</th></tr></thead>
    <tbody data-rows>${sorted(d).map((w) => `<tr data-id="${esc(w.id)}" class="${w.id === S.sel ? "sel" : ""}"><td class="t"><button class="rowbtn" type="button">${esc(w.title)}</button>${w.id === d.latest.id ? ' <span class="pill pill-e">latest</span>' : ""}${w.id === d.best?.id ? ' <span class="pill pill-s">best</span>' : ""}</td><td class="nw">${esc(D.shortDay(w.publishedAt))}</td><td class="r">${w.multiple != null ? w.multiple.toFixed(2) : "early"}</td><td class="r">${w.reachPct != null ? Math.min(99, w.reachPct) : ""}</td></tr>`).join("")}</tbody></table></div>
    ${d.rated ? `<details class="fold"><summary>What the engine says about all of it</summary><p class="p">${esc(d.explain)}</p>${d.focus.length ? `<ul class="reasons">${d.focus.map((f) => `<li><b style="font-weight:600">${esc(f.name)}.</b> ${esc(D.nodash(f.advice))}</li>`).join("")}</ul>` : ""}</details>` : ""}
    <p class="notice"><b>Independently calculated by Orbe.</b> Each ${esc(noun)} is judged against your own median, and its reach against ${esc(d.peersLine ?? "creators your size")} on the engine's starting baselines.</p>`;
  for (const b of $$("[data-sort] button", el)) b.addEventListener("click", () => { S.sort = b.dataset.v; renderWork(); $(`[data-sort] [data-v="${S.sort}"]`).focus(); });
  $("[data-rows]", el).addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) pick(tr.dataset.id); });
  drawScrub();
  showSel(sel, false);
  const sc = $("[data-scrub]", el);
  const fromX = (x) => { const r = sc.getBoundingClientRect(); return chrono[Math.max(0, Math.min(chrono.length - 1, Math.floor(((x - r.left) / r.width) * chrono.length)))]; };
  sc.addEventListener("pointerdown", (e) => { sc.setPointerCapture(e.pointerId); pick(fromX(e.clientX).id); const mv = (ev) => pick(fromX(ev.clientX).id); sc.addEventListener("pointermove", mv); sc.addEventListener("pointerup", () => sc.removeEventListener("pointermove", mv), { once: true }); });
  sc.addEventListener("keydown", (e) => {
    const i = chrono.findIndex((w) => w.id === S.sel);
    const j = { ArrowLeft: i - 1, ArrowDown: i - 1, ArrowRight: i + 1, ArrowUp: i + 1, Home: 0, End: chrono.length - 1, PageDown: i - 5, PageUp: i + 5 }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    pick(chrono[Math.max(0, Math.min(chrono.length - 1, j))].id);
  });
}
function drawScrub() {
  const d = desk(), sc = $("[data-scrub]");
  if (!sc) return;
  const chrono = [...d.works].reverse();
  const W = 600, H = 120, bw = W / chrono.length, max = Math.max(2.4, ...chrono.map((w) => w.multiple ?? 0));
  const y = (m) => H - 16 - (Math.min(m, max) / max) * (H - 26);
  sc.setAttribute("viewBox", `0 0 ${W} ${H}`);
  sc.setAttribute("preserveAspectRatio", "none");
  sc.innerHTML = chrono.map((w, i) => { const m = w.multiple ?? 0; const cls = w.id === S.sel ? "sel" : m >= 2 ? "hit" : m >= 1 ? "up" : ""; return `<rect class="b ${cls}" x="${i * bw + 1.5}" y="${y(m)}" width="${Math.max(1, bw - 3)}" height="${H - 16 - y(m)}"/>`; }).join("")
    + `<line class="typ" x1="0" x2="${W}" y1="${y(1)}" y2="${y(1)}"/>`;
  const i = chrono.findIndex((w) => w.id === S.sel), w = chrono[i];
  sc.setAttribute("aria-valuenow", String(i + 1));
  sc.setAttribute("aria-valuetext", `${w.title}, ${w.multiple != null ? `${w.multiple.toFixed(2)} times your typical` : "too new to rate"}`);
}
function showSel(w, animate = true) {
  const d = desk();
  const sayEl = $("[data-work-say]");
  if (!sayEl) return;
  if (!animate) sayEl.dataset.shape = "";
  say(sayEl, [["t", `“${w.title}”`], " did ", ["m", w.multiple != null ? `${w.multiple.toFixed(2)}×` : "too early"], " your typical."]);
  const lines = D.whyItWorked(d, w);
  const good = (w.multiple ?? 0) >= 1;
  $("[data-why]").innerHTML = `<p class="lab">${good ? "Why it worked" : "How it did"}, from its own numbers</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
    <p class="small">Out ${esc(D.day(w.publishedAt))}${w.ageDays < 30 ? `, ${Math.round(w.ageDays)} days old` : ""}. ${w.id === d.best?.id ? `<span class="note">your best of the lot</span>` : w.id === d.latest?.id ? `<span class="note note-ember">the newest one</span>` : ""}</p>`;
}
function pick(id) {
  if (S.sel === id) return;
  S.sel = id;
  const d = desk();
  for (const tr of $$("[data-rows] tr")) tr.classList.toggle("sel", tr.dataset.id === id);
  drawScrub();
  showSel(d.works.find((w) => w.id === id));
  world.select(id);
}

/* ================================================================ Record */
RENDER.record = renderRecord;
let counterDone = false;
function rollCounter() {
  const el = $("[data-count]");
  if (!el) return;
  const n = record().months.length;
  if (counterDone || still) { el.textContent = n; counterDone = true; return; }
  counterDone = true;
  const t0 = performance.now();
  const step = (now) => { const u = Math.min(1, (now - t0) / 1200); el.textContent = Math.round(n * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function renderRecord() {
  const r = record();
  const el = $("[data-record]");
  const d = desk();
  if (S.month == null || !r.months.find((m) => m.m === S.month)) S.month = r.months.at(-1).m;
  const total = r.months.reduce((a, m) => a + m.total, 0);
  const sources = r.madeUp ? [...new Set(r.months.flatMap((m) => m.counted.map((l) => l.source)))] : ["Typed by you"];
  el.innerHTML = `
    ${r.madeUp ? `<p class="made"><span><b>Made up.</b> ${esc(r.accountTitle)} is the record engine's own invented channel, read from invented AdSense, Stripe and invoice lines. ${esc(d.name)} is ${d.madeUp ? "made" : "read"} from ${d.madeUp ? "uploads" : "an export of works"} alone, and an export of works holds no payouts, so it has no record of its own.</span></p>`
      : `<p class="made mine"><span><b>Declared by you.</b> These months are what you typed, not read at source, so none of it counts as verified. Connecting Stripe or AdSense (with the Orbe API) replaces them.</span></p>`}
    <div class="counter"><span class="big num" data-count>${counterDone || still ? r.months.length : 0}</span><span class="h h-m">months of payouts read.</span></div>
    <p class="p">Only money fills it. Each month counts what was paid, set beside what platforms estimated, with every figure's source and the day it was read. ${D.gbp(total)} counted in all.</p>
    <svg class="months" data-months role="group" aria-label="Months, oldest to newest"></svg>
    <div class="legend"><span><i style="background:var(--cobalt)"></i>Ads</span><span><i style="background:var(--straw)"></i>Shop sales</span><span><i style="background:var(--ember)"></i>Sponsorship</span><span><i style="background:var(--peony)"></i>Other</span></div>
    <div data-month></div>
    ${r.disagree ? `<div class="est-vs"><p class="lab">Estimates are not a record</p>In ${esc(D.monthName(r.disagree.month))}, YouTube estimated another made-up channel's ad revenue (${esc(r.disagree.name)}) at <span class="struck">${D.gbp(r.disagree.estimate, { pence: true })}<svg class="pencil-strike" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 C 30 5, 60 7, 98 3"/></svg></span> <span class="paid">${D.gbp(r.disagree.paid, { pence: true })}</span>, which is what AdSense paid. Read from payouts, not estimates: this is what was actually paid, so it is what the record keeps.</div>` : ""}
    ${r.madeUp && r.checks?.length ? `<details class="fold"><summary>The checks behind it</summary><ul class="reasons">${r.checks.filter((c) => c.performed).map((c) => `<li>${esc(D.nodash(c.text))}</li>`).join("")}</ul></details>` : ""}
    <details class="fold" data-declare><summary>Type in your own months</summary>
      <p class="small">One line a month and stream: <span class="mono">2026-09, ads, 6200</span>. Streams: ads, sponsorship, subscriptions, memberships, products, licensing, tips, other. It stays on this device and counts as declared, never verified.</p>
      <label class="field-l" style="margin-top:8px"><span>Your months</span><textarea class="in" data-lines rows="5" placeholder="2026-08, ads, 5400&#10;2026-08, sponsorship, 3000&#10;2026-09, ads, 6200"></textarea></label>
      <p class="err" data-lines-err></p>
      <div class="fig" style="gap:8px"><button class="btn btn-sm btn-ink" type="button" data-use-lines>Use these months</button>${S.ownRecord ? `<button class="btn btn-sm" type="button" data-drop-lines>Back to the example</button>` : ""}</div>
    </details>`;
  drawMonths();
  showMonth(false);
  $("[data-use-lines]", el).addEventListener("click", () => {
    const rec = D.declaredRecord($("[data-lines]", el).value);
    if (!rec) return void ($("[data-lines-err]", el).textContent = "No lines read. Each needs a month (2026-09), a stream and an amount.");
    S.ownRecord = rec; S.month = null; counterDone = false;
    renderRecord(); rollCounter(); rerender(["sell"]);
    toast("Your months are in the record, marked as declared.");
  });
  $("[data-drop-lines]", el)?.addEventListener("click", () => { S.ownRecord = null; S.month = null; renderRecord(); rerender(["sell"]); });
}
let monthsRead = false;
function drawMonths() {
  const r = record(), svg = $("[data-months]");
  const first = !monthsRead && !still;
  monthsRead = true;
  const n = r.months.length, W = 600, H = 150, bw = W / Math.max(n, 12);
  const peak = Math.max(...r.months.map((m) => m.total), 1);
  const order = ["ads", "products", "sponsorship", "subscriptions", "memberships", "licensing", "tips", "other"];
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.innerHTML = r.months.map((m, i) => {
    let y = H - 18;
    const segs = order.filter((s) => m.by[s]).map((s) => { const h = (m.by[s] / peak) * (H - 30); y -= h; return `<rect class="${s} seg-r" x="${i * bw + 2}" y="${y}" width="${bw - 4}" height="${h}"/>`; }).join("");
    const lbl = new Date(m.m).getUTCMonth() === 0 || i === 0 ? `<text x="${i * bw + 2}" y="${H - 4}">${new Date(m.m).getUTCFullYear()}</text>` : "";
    return `<g class="m${m.m === S.month ? " sel" : ""}${first ? " fill-in" : ""}" style="--i:${i}" data-m="${m.m}" tabindex="${m.m === S.month ? 0 : -1}" role="button" aria-pressed="${m.m === S.month}" aria-label="${esc(D.monthName(m.m))}, ${esc(D.gbp(m.total))} counted"><rect class="hit" x="${i * bw}" y="0" width="${bw}" height="${H - 16}"/>${segs}${lbl}</g>`;
  }).join("");
  for (const g of $$(".m", svg)) {
    g.addEventListener("click", () => setMonth(g.dataset.m));
    g.addEventListener("keydown", (e) => {
      const i = r.months.findIndex((m) => m.m === S.month);
      const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: n - 1 }[e.key];
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMonth(g.dataset.m); return; }
      if (j === undefined) return;
      e.preventDefault();
      setMonth(r.months[Math.max(0, Math.min(n - 1, j))].m, true);
    });
  }
}
function setMonth(m, focus = false) { S.month = m; drawMonths(); showMonth(true); if (focus) $(`[data-m="${m}"]`).focus(); }
const ROLE = { counted: ["Counted", ""], corroborating: ["An estimate, set aside", "estimate"], settlement: ["The payout that settled it", "settlement"], superseded: ["Replaced by the payment it became", "estimate"], declared: ["Declared by you", ""] };
function showMonth(animate) {
  const r = record(), m = r.months.find((x) => x.m === S.month), host = $("[data-month]");
  const prev = new Map($$("[data-lid]", host).map((li) => [li.dataset.lid, li.getBoundingClientRect()]));
  const row = (l) => `<li data-lid="${esc(l.id)}" class="${(ROLE[l.role] ?? ["", ""])[1]}"><span>${esc(D.STREAM[l.stream] ?? l.stream)}${l.counterparty ? `, ${esc(l.counterparty)}` : ""}</span><span class="amt">${D.gbp(l.amount, { pence: true })}</span><span class="src">${esc(l.source)}${l.checkedAt ? `, read ${esc(D.day(l.checkedAt))}` : ""}${l.role !== "counted" && l.role !== "declared" ? `. ${esc(ROLE[l.role]?.[0] ?? "")}` : ""}</span></li>`;
  let list;
  if (S.ledger === "statement" || !r.madeUp) list = m.lines.map(row).join("");
  else list = ["counted", "corroborating", "settlement", "superseded"].map((role) => { const ls = m.lines.filter((l) => l.role === role); return ls.length ? `<li class="group">${esc(ROLE[role][0])}${role === "counted" ? `, ${D.gbp(ls.reduce((a, l) => a + l.amount, 0))}` : ""}</li>${ls.map(row).join("")}` : ""; }).join("");
  host.innerHTML = `<div class="fig" style="justify-content:space-between;align-items:center;margin-top:14px">
      <h3 class="h h-m">${esc(D.monthName(m.m))}: ${D.gbp(m.total)} counted</h3>
      ${r.madeUp ? `<div class="seg" role="group" aria-label="View"><button type="button" data-l="statement" aria-pressed="${S.ledger === "statement"}">As it arrived</button><button type="button" data-l="ledger" aria-pressed="${S.ledger === "ledger"}">As the record reads it</button></div>` : ""}
    </div>
    <ul class="ledger">${list}</ul>`;
  for (const b of $$("[data-l]", host)) b.addEventListener("click", () => { S.ledger = b.dataset.l; showMonth(true); $(`[data-l="${S.ledger}"]`).focus(); });
  // the statement turns into the ledger: each line slides to its place (FLIP), once
  if (animate && !still && prev.size) {
    for (const li of $$("[data-lid]", host)) {
      const a = prev.get(li.dataset.lid); if (!a) continue;
      const b = li.getBoundingClientRect(), dy = a.top - b.top;
      if (Math.abs(dy) > 1) li.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 450, easing: EASE_W });
    }
  }
}

/* ================================================================ Deals */
const SPONSOR_CARE = `<p class="care"><b>Before you open an attachment:</b> real sponsors don't need you to install anything. Google's Threat Analysis Group found forged sponsorship offers sent to YouTubers whose "demo software" stole their channels (<a href="https://blog.google/threat-analysis-group/phishing-campaign-targets-youtube-creators-cookie-theft-malware/" rel="noopener" target="_blank">Google, 20 Oct 2021</a>).</p><p class="p p-soft" style="margin-top:0">Sponsors are a way to fund the work, priced from what you actually delivered.</p>`;
RENDER.deals = renderDeals;
function renderDeals() {
  const d = desk();
  const el = $("[data-deals]");
  const p = D.priceDeal(d);
  if (!p) {
    el.innerHTML = `${SPONSOR_CARE}${made(d)}<h3 class="h h-l">Sponsorship pricing is for channels, newsletters, podcasts and streams</h3><p class="p">${d.kind === "photography" ? "Photographers earn from licences, and the engine has no published rate card for sponsored photo sets yet. When it does, it will read from your own saves and licences, as it does for everyone else." : "Orbe needs at least three of your works with delivery figures to suggest a price."}</p>`;
    return;
  }
  const items = p.items.filter((i) => i.suggestion?.status === "suggested");
  if (!items.length) { el.innerHTML = `${made(d)}<p class="p">${esc(D.nodash(p.items[0]?.suggestion?.reason ?? "No suggestion yet."))}</p>`; return; }
  const item = items[Math.min(S.deal.format, items.length - 1)];
  const s = item.suggestion;
  const mid = Math.round((s.low.amount + s.high.amount) / 2 / 1000) * 1000;
  if (S.deal.price == null || S.deal.forItem !== item.name + d.name) { S.deal.price = mid; S.deal.forItem = item.name + d.name; }
  const unitWord = s.expected.unit;
  el.innerHTML = `${SPONSOR_CARE}${made(d)}
    <p class="lab">What your work delivered</p>
    <p class="p">Your median is <b>${D.count(s.expected.units)} ${esc(unitWord)}</b>${s.per === "hour" ? "" : ` at ${s.expected.day} days`}, across ${p.del.units.length} recent ${esc(lower(d.workNoun ?? "work"))}s${p.del.older ? " at least 30 days old" : ""}, as read from ${d.madeUp && S.view !== "own" ? "the made-up file" : "your export"}.</p>
    <div class="fig" style="margin-top:12px;align-items:center"><div class="seg" role="group" aria-label="Format">${items.map((it, i) => `<button type="button" data-f="${i}" aria-pressed="${it === item}">${esc(it.name)}</button>`).join("")}</div></div>
    <p class="lab" style="margin-top:14px">Orbe suggests, ${s.per === "hour" ? "an hour" : "a placement"}</p>
    <div class="big num" style="font-size:48px">${esc(D.money(s.low))} to ${esc(D.money(s.high))}</div>
    <p class="small">${D.money(s.cpm.low, { pence: true })} to ${D.money(s.cpm.high, { pence: true })} per 1,000${s.provisional ? ", from a provisional rate card" : ""}. In dollars, the rate cards' own: Orbe doesn't guess exchange rates. You set your own price.</p>
    <hr class="rule-soft">
    <div class="cols">
      <label class="field-l"><span>Your price, in dollars</span><input class="in num" type="number" inputmode="numeric" min="0" step="50" data-price value="${Math.round(S.deal.price / 100)}"></label>
      <div class="field-l"><span>Who found the brand?</span><div class="seg" role="group" aria-label="Who found the brand"><button type="button" data-src="network" aria-pressed="${S.deal.source === "network"}">Orbe, 15%</button><button type="button" data-src="direct" aria-pressed="${S.deal.source === "direct"}">You, 5%</button></div></div>
    </div>
    <div data-deal-out></div>
    <details class="fold"><summary>How Orbe priced it</summary><ul class="reasons">${s.reasons.map((r) => `<li>${esc(D.nodash(r.replace(/ read at source\./, ", from your export.")))}</li>`).join("")}</ul>
      ${s.sources?.length ? `<p class="small">Sources: ${s.sources.map((x) => esc(x.label)).join("; ")}. Third-party figures, not verified against the originals.</p>` : ""}</details>
    <p class="notice">${esc(p.note)} <b>Independently calculated by Orbe.</b></p>`;
  for (const b of $$("[data-f]", el)) b.addEventListener("click", () => { S.deal.format = +b.dataset.f; S.deal.price = null; renderDeals(); $(`[data-f="${b.dataset.f}"]`).focus(); });
  for (const b of $$("[data-src]", el)) b.addEventListener("click", () => { S.deal.source = b.dataset.src; for (const x of $$("[data-src]", el)) x.setAttribute("aria-pressed", String(x === b)); dealOut(); });
  $("[data-price]", el).addEventListener("input", (e) => { S.deal.price = Math.max(0, Math.round(Number(e.target.value) * 100) || 0); dealOut(); });
  dealOut();
}
function dealOut() {
  const out = $("[data-deal-out]");
  if (!out) return;
  const price = { amount: S.deal.price, currency: "USD" };
  if (!(price.amount > 0)) { out.innerHTML = `<p class="err">Type a price above nothing.</p>`; return; }
  const terms = D.feeTermsFor(S.deal.source);
  const f = D.fundingFor(price, terms);
  const share = f.price.amount / f.total.amount;
  out.innerHTML = `<dl class="kv"><dt>You get, all of your price</dt><dd>${D.money(f.price)}</dd><dt>Orbe's fee, ${terms.bps / 100}%, paid by the brand</dt><dd>${D.money(f.fee)}</dd><dt class="tot">The brand pays</dt><dd class="tot">${D.money(f.total)}</dd></dl>
    <div class="split" aria-hidden="true"><span class="you" style="flex-grow:${share}">You</span><span class="fee" style="flex-grow:${1 - share}">Orbe</span></div>
    <p class="small">${S.deal.source === "network" ? "15% when Orbe finds the brand." : "5% when you bring the brand yourself."} Charged only when the sponsorship completes; a refunded booking earns Orbe nothing.</p>`;
}

/* ================================================================ Sell */
RENDER.sell = renderSell;
function renderSell() {
  const r = record();
  const el = $("[data-sell]");
  let v;
  try { v = D.valueOf(r, { margin: S.sell.margin, face: S.sell.face }); } catch (e) { el.innerHTML = `<p class="p">${esc(COPY.quietSell)}</p><p class="err">${esc(D.nodash(e.message))}</p>`; return; }
  if (!v.range) { el.innerHTML = `<p class="p">${esc(COPY.quietSell)}</p><p class="p">Not enough months to value yet: Orbe needs at least a few months of revenue.</p>`; return; }
  const centre = Math.round((v.range.low.amount + v.range.high.amount) / 2 / 100000) * 100000;
  if (S.sell.price == null || S.sell.for !== r.name) { S.sell.price = centre; S.sell.for = r.name; }
  el.innerHTML = `<p class="p p-soft" style="margin-top:0">${esc(COPY.quietSell)}</p>
    ${r.madeUp ? `<p class="made"><span><b>Made up.</b> Valued from ${esc(r.accountTitle)}'s invented record in Record, with an invented margin. Type your own months in Record and this values yours.</span></p>` : `<p class="made mine"><span><b>Declared by you.</b> Valued from the months you typed in Record, so none of it is verified.</span></p>`}
    <p class="lab">Indicative value</p>
    <div class="big num" style="font-size:48px">${D.money(v.range.low)} to ${D.money(v.range.high)}</div>
    <p class="small">${v.multiples.low}× to ${v.multiples.high}× a year's profit of ${D.money(v.ttmProfit)}, on ${D.money(v.ttmRevenue)} revenue. ${Math.round(v.verifiedShare * 100)}% verified. Confidence ${esc(v.confidence)}.</p>
    <div class="cols" style="margin-top:12px">
      <label class="field-l"><span>Profit margin, your estimate: <b data-mo>${Math.round(S.sell.margin * 100)}%</b></span><input type="range" min="5" max="95" step="1" value="${Math.round(S.sell.margin * 100)}" data-margin></label>
      <label class="field-l"><span>How much it needs you on camera: <b data-fo>${Math.round(S.sell.face * 100)}%</b></span><input type="range" min="0" max="100" step="5" value="${Math.round(S.sell.face * 100)}" data-face></label>
    </div>
    <hr class="rule-soft">
    <label class="field-l"><span>If it sold for <b data-po>${D.gbp(S.sell.price)}</b></span><input type="range" min="${Math.max(100000, Math.round(v.range.low.amount * 0.3 / 100000) * 100000)}" max="${Math.round(v.range.high.amount * 1.6 / 100000) * 100000}" step="100000" value="${S.sell.price}" data-sale></label>
    <div data-fee-out></div>
    <details class="fold"><summary>Why this range</summary><ul class="reasons">${v.reasons.map((x) => `<li>${esc(D.nodash(x))}</li>`).join("")}</ul></details>
    <p class="notice">${esc(D.INDICATIVE_LABEL)} Valuation model ${esc(v.modelVersion)}, provisional until Orbe's own completed sales replace its multiples.</p>`;
  const reval = () => { renderSell(); };
  $("[data-margin]", el).addEventListener("change", (e) => { S.sell.margin = e.target.value / 100; reval(); $("[data-margin]").focus(); });
  $("[data-margin]", el).addEventListener("input", (e) => { $("[data-mo]").textContent = `${e.target.value}%`; });
  $("[data-face]", el).addEventListener("change", (e) => { S.sell.face = e.target.value / 100; reval(); $("[data-face]").focus(); });
  $("[data-face]", el).addEventListener("input", (e) => { $("[data-fo]").textContent = `${e.target.value}%`; });
  $("[data-sale]", el).addEventListener("input", (e) => { S.sell.price = +e.target.value; $("[data-po]").textContent = D.gbp(S.sell.price); feeOut(); });
  feeOut();
}
function feeOut() {
  const out = $("[data-fee-out]");
  const fee = D.successFee({ amount: S.sell.price, currency: "GBP" });
  out.innerHTML = `<dl class="kv"><dt>Orbe's success fee, ${(fee.effectiveRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}% effective</dt><dd>${D.money(fee.fee)}</dd><dt class="tot">You keep, before escrow at cost</dt><dd class="tot">${D.gbp(S.sell.price - fee.fee.amount)}</dd><dt>If it doesn't sell</dt><dd>£0</dd></dl>
    <p class="small">${fee.minimumApplied ? "The £4,000 minimum applies. " : ""}8% up to £500k, 5% from £500k to £2M, 3% above, worked out slice by slice like income tax, so the fee never jumps at a line. Paid from the proceeds, and only if it sells.</p>`;
}

/* ================================================================ The Sunday note: a letter the studio writes from their numbers */
RENDER.week = renderWeek;
const longDay = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
function noteParts(d) {
  const wk = D.weekOf(d);
  const W = d.words;
  const plural = (n) => (n === 1 ? d.workWord : d.workWord === "Short" ? "Shorts" : W.works);
  const P = [];
  if (!wk.works.length) {
    P.push(`Nothing new went out this week, and that is fine. Your rating waits for you; nothing here decays while you rest.`);
  } else {
    const names = wk.works.map((w) => `“${w.title}”`);
    P.push(`This week you put out ${wk.works.length === 1 ? "one" : wk.works.length} ${plural(wk.works.length)}: ${names.join(" and ")}.`);
    const L = wk.works[0];
    const why = D.whyItWorked(d, L);
    if (why.length) P.push({ hi: why[0] });
    if (why[1]) P.push(why[1]);
  }
  if (d.rated) {
    const mom = d.parts.find((p) => p.key === "momentum");
    if (mom) P.push(`Your newest ten ${W.works} against the twenty before them: ${mom.value}. ${parseFloat(mom.value) >= 0 ? "Still climbing." : "A softer stretch, which every long run has."}`);
    if (d.latestBest) P.push(`And a personal best: ${d.latestBest.label}, ${D.count(d.latestBest.value)}, beating your ${D.count(d.latestBest.previous)}. Nobody else's numbers were needed for this one.`);
    else {
      const pb = d.bests.find((b) => b.metric === d.primary) ?? d.bests[0];
      if (pb) P.push(`Your record to beat is still ${pb.label}: ${D.count(pb.value)}, on “${pb.title}”. It will be there when you're ready.`);
    }
    if (d.top) P.push(`One thing to notice: ${D.nodash(d.top.line.replace(/^Your #1 stat: /, "your strongest part is ")).replace(/^y/, "y")}`);
  }
  return { wk, P };
}
function renderWeek() {
  const d = desk();
  const el = $("[data-week]");
  const { P } = noteParts(d);
  const text = (x) => (typeof x === "string" ? x : x.hi);
  const ps = d.madeUp && S.view !== "own" ? `P.S. ${d.name} is made up, so this note is too. Use your export and next Sunday's is yours.` : `P.S. Everything here came from your export, read on this device. Nothing was sent anywhere.`;
  el.innerHTML = `<article class="letter">
      <p class="l-date">${esc(longDay(d.at))}</p>
      <p class="l-hello">Hello, ${esc(d.name)}.</p>
      ${P.map((x) => `<p>${typeof x === "string" ? esc(x) : `<mark>${esc(x.hi)}</mark>`}</p>`).join("")}
      <p class="l-ps">${esc(ps)}</p>
      <p class="l-sign">See you Sunday.</p>
      ${signature()}
    </article>
    <div class="fig" style="gap:8px;margin-top:14px"><button class="btn btn-sm btn-cobalt" type="button" data-ncopy>${icon("copy", { size: 16 })}<span>Copy the note</span></button></div>
    <p class="small">Written in your browser from the week before ${esc(D.day(d.at))}. Every figure in it is the engine's. <b>Independently calculated by Orbe.</b></p>`;
  $("[data-ncopy]", el).addEventListener("click", () => copy([`Hello, ${d.name}.`, ...P.map(text), ps, "See you Sunday. Orbe"].join("\n\n")));
}
/* The Carved wordmark, drawn along its own spines like a pencil signature. */
function signature() {
  const c = WORDMARK.text;
  return `<svg class="l-sig" viewBox="-40 -800 2120 860" aria-label="Orbe" role="img">${c.spines.map(([, dd, w]) => `<path d="${dd}" stroke-width="${Math.round(w * 0.32)}"/>`).join("")}</svg>`;
}

/* ================================================================ Someone like me */
RENDER.people = renderPeople;
function renderPeople() {
  const el = $("[data-people]");
  const cur = S.view === "example" ? S.example.person?.id : null;
  el.innerHTML = `<p class="p" style="margin-top:0">Pick the one closest to you. Every one is invented, with numbers the engine makes up and rates live, so you can see how Orbe reads work like yours.</p>
    <ul class="people" style="margin-top:12px">${D.PEOPLE.map((p) => `<li><button type="button" data-p="${p.id}" aria-pressed="${p.id === cur}"><span class="pp-w">${esc(D.VOICE[p.kind].kind)}, ${esc(p.who.toLowerCase())}</span><span class="pp-n">${esc(p.title)}</span><span class="pp-say">${esc(p.say)}</span></button></li>`).join("")}</ul>
    <div class="fig" style="gap:8px"><button class="btn btn-export" type="button" data-p-export>${icon("upload", { size: 16 })}<span>Or use my export</span></button></div>`;
  for (const b of $$("[data-p]", el)) b.addEventListener("click", () => { S.example = D.madeUpDesk(b.dataset.p); S.view = "example"; S.sel = null; S.deal.price = null; changed(); renderPeople(); $(`[data-p="${b.dataset.p}"]`).focus(); toast(`Showing ${S.example.name}, made up.`); });
  $("[data-p-export]", el).addEventListener("click", () => { close("people"); open("export"); });
}

/* ================================================================ Use my export */
RENDER.export = renderExport;
const FIXTURES = [
  ["made-up-youtube-studio.csv", "YouTube Studio", 84000, "Bench Notes (made up)"],
  ["made-up-substack-posts.csv", "Substack", 12500, "Margin Notes (made up)"],
  ["made-up-podcast-host.csv", "Podcast host", 6000, "The Long Table (made up)"],
  ["made-up-spotify-for-creators.csv", "Spotify for Creators", 900, "Small Hours (made up)"],
];
let picked = null;
function renderExport() {
  const el = $("[data-export]");
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `<p class="p" style="margin-top:0">Drop the export you already download from YouTube Studio, Substack, Spotify for Creators or your podcast host. Orbe reads it right here, in this browser. <b>Nothing leaves this device.</b></p>
    <div class="lanes" data-lanes>
      <label class="drop" data-drop>
        <span>${icon("upload", { size: 28 })}</span>
        <p><b>Drag your CSV here</b>, or press to choose it</p>
        <p class="small" data-picked style="margin:0">No file yet</p>
        <input class="sr" type="file" accept=".csv,text/csv" data-file>
      </label>
    </div>
    <div class="cols" style="margin-top:4px">
      <label class="field-l"><span>Your followers or subscribers</span><input class="in num" type="number" inputmode="numeric" min="1" data-aud placeholder="e.g. 48000"><small class="small" style="margin:0">Exports rarely carry it, and parts of the rating need it.</small></label>
      <label class="field-l"><span>Exported on</span><input class="in" type="date" data-on value="${today}"></label>
    </div>
    <label class="field-l" style="margin-top:12px"><span>Your name, as you'd like it shown (optional)</span><input class="in" type="text" data-name autocomplete="nickname" placeholder="e.g. Bench Notes"></label>
    <p class="err" data-ex-err role="alert"></p>
    <div class="fig" style="gap:8px;margin-top:12px"><button class="btn btn-ink" type="button" data-read>Rate my export</button></div>
    <details class="fold"><summary>Where to find your export</summary><ul class="reasons">${D.EXPORT_FORMATS.map((f) => `<li><b style="font-weight:600">${esc(f.label)}.</b> ${esc(f.where)}</li>`).join("")}</ul></details>
    <details class="fold"><summary>No export to hand? Try a made-up one</summary><div class="fixtures">${FIXTURES.map(([f, l]) => `<button class="btn btn-sm" type="button" data-fx="${f}">${esc(l)}</button>`).join("")}</div><p class="small">Invented files, for trying the studio. They are labelled made up everywhere they show.</p></details>`;
  drawLanes();
  const drop = $("[data-drop]", el), file = $("[data-file]", el);
  const take = (f) => { if (!f) return; picked = { name: f.name, read: () => f.text(), sample: false }; $("[data-picked]", el).textContent = `${f.name}, ready. It stays on this device.`; };
  file.addEventListener("change", () => take(file.files[0]));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); take(e.dataTransfer.files[0]); });
  $("[data-read]", el).addEventListener("click", () => readIt());
  for (const b of $$("[data-fx]", el)) b.addEventListener("click", async () => {
    const fx = FIXTURES.find((x) => x[0] === b.dataset.fx);
    const text = await (await fetch(`../products/fixtures/${fx[0]}`)).text();
    picked = { name: fx[0], read: async () => text, sample: true };
    $("[data-aud]", el).value = fx[2]; $("[data-name]", el).value = fx[3]; $("[data-on]", el).value = "2026-10-18";
    $("[data-picked]", el).textContent = `${fx[0]}, a made-up file.`;
    readIt();
  });
}
/* Modern's lanes: the four exports Orbe reads, wrapping the place you drop one. */
function drawLanes() {
  const host = $("[data-lanes]");
  if (!host) return;
  $$(".lane, .lane-l", host).forEach((x) => x.remove());
  const L = [["YouTube Studio", "var(--cobalt)"], ["Substack", "var(--straw)"], ["Spotify for Creators", "var(--ember)"], ["Podcast host", "var(--peony)"]];
  L.forEach(([label, c], i) => {
    const inset = 18 - i * 6;
    const ln = document.createElement("span"); ln.className = "lane"; ln.style.cssText = `inset:${inset}px;border-color:${c};border-width:5px`; host.prepend(ln);
  });
  L.forEach(([label], i) => {
    const t = document.createElement("span"); t.className = "lane-l"; t.textContent = label;
    t.style.cssText = i < 2 ? `top:${-1 + i * 0}px;${i === 0 ? "left:16%" : "right:16%"}` : `bottom:-1px;${i === 2 ? "left:16%" : "right:16%"}`;
    host.appendChild(t);
  });
}
async function readIt() {
  const el = $("[data-export]"), err = $("[data-ex-err]", el);
  err.textContent = "";
  if (!picked) return void (err.textContent = "Choose an export first, or try a made-up one.");
  const audience = Number($("[data-aud]", el).value);
  if (!(audience > 0)) { err.textContent = "Add your followers or subscribers: parts of the rating are measured against them."; $("[data-aud]", el).focus(); return; }
  try {
    const text = await picked.read();
    const d = await D.deskFromExport(text, { fileName: picked.name, audience, exportedOn: $("[data-on]", el).value || new Date().toISOString().slice(0, 10), title: $("[data-name]", el).value.trim(), sample: picked.sample });
    S.own = d; S.view = "own"; S.sel = null; S.deal.price = null;
    changed();
    close("export");
    open("today");
    toast(d.rated ? `${d.name}: ${d.signed}, ${d.band}. ${picked.sample ? "A made-up file." : "Yours, read on this device."}` : `${d.name} is read, but not rated yet.`);
  } catch (x) {
    err.textContent = D.nodash(x?.message || "That file could not be read.");
  }
}

/* ================================================================ Reserve, and How Orbe earns */
RENDER.reserve = () => {
  const el = $("[data-reserve]");
  const d = desk();
  el.innerHTML = `<p class="p" style="margin-top:0">Keep your name on Orbe for when public ratings open. Free, and it stays free.</p>
    <form data-res novalidate>
      <label class="field-l" style="margin-top:12px"><span>Your handle</span><input class="in" name="handle" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="yourhandle" maxlength="40" value="${S.view === "own" && S.own && !S.own.madeUp ? esc(cleanHandle(S.own.name)) : ""}"></label>
      <label class="field-l" style="margin-top:12px"><span>What you make</span><select class="in" name="kind">${["channel", "newsletter", "stream", "podcast", "photography"].map((k) => `<option${k === d.words.kind ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <p class="err" data-res-err role="alert"></p>
      <div class="fig" style="gap:8px;margin-top:12px"><button class="btn btn-ink" type="submit">Reserve my handle</button></div>
    </form>
    <p class="small">Until the Orbe API is switched on, this opens your email app with the request written out to hello@orbe.vc, so nothing is sent without you seeing it.</p>`;
  $("[data-res]", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const h = cleanHandle(f.handle.value);
    if (!h) return void ($("[data-res-err]", el).textContent = "Type the handle you'd like.");
    $("[data-res-err]", el).textContent = "";
    const r = await reserve({ handle: h, kind: f.kind.value });
    toast(r.via === "api" ? `Reserved @${h}.` : `Your email app has the request for @${h}. Send it and it's yours.`);
  });
};
RENDER.earns = () => {
  const T = D.TAKE_RATE;
  $("[data-earns]").innerHTML = `<p class="h h-l" style="margin:0">Free for creators, for good.</p>
    <p class="p">No subscription, and nothing here behind a paywall. Orbe earns a share only when money moves, and never from the creator's price.</p>
    <dl class="kv"><dt>Your rating, the studio, your record</dt><dd>Free</dd>
    <dt>A sponsorship Orbe found, paid by the brand</dt><dd>${T.sponsorship.networkBps / 100}%</dd>
    <dt>A sponsorship you brought, paid by the brand</dt><dd>${T.sponsorship.directBps / 100}%</dd>
    <dt>Selling, from the proceeds, only if it sells</dt><dd>8%, 5%, 3%</dd>
    <dt>The minimum on a sale</dt><dd>${D.gbp(T.seller.minimum)}</dd>
    <dt>Buying: the buyer's premium at completion</dt><dd>2%, 1% above £2M</dd></dl>
    <p class="small">Sale fees are worked out slice by slice: 8% up to £500k, 5% to £2M, 3% above. Escrow is passed through at cost. A refunded booking earns nothing. Terms ${esc(T.version)}.</p>`;
};

/* ================================================================ when the desk changes */
function rerender(names) { for (const n of names) { if (rendered.has(n)) RENDER[n](); } }
function changed() {
  const d = desk();
  const mine = S.view === "own" && S.own;
  $("[data-who-name]").textContent = d.name;
  $("[data-who-tag]").textContent = mine ? (d.madeUp ? "made-up file" : "yours") : "made up";
  $(".who").classList.toggle("mine", !!mine);
  drawWordmark();
  renderSay();
  world.show(d, { animate: true });
  counterDone = counterDone || !!S.ownRecord;
  rerender(["today", "work", "deals", "week", "sell", "people", "reserve"]);
}
$("[data-switch]").addEventListener("click", () => {
  if (!S.own) return open("export");
  S.view = S.view === "own" ? "example" : "own";
  S.sel = null; S.deal.price = null;
  changed();
  toast(S.view === "own" ? `Showing ${S.own.name}.` : `Showing ${S.example.name}, made up.`);
});

/* ================================================================ layout */
let wasDesk = null;
function layout() {
  const nowDesk = isDesk();
  if (nowDesk === wasDesk) { world.resize(); return; }
  wasDesk = nowDesk;
  parkWorld();
  world.frame(nowDesk ? "desk" : "phone");
  if (nowDesk) {
    for (const a of AREAS) WIN[a].classList.remove("on");
    for (const [n, w] of Object.entries(WIN)) w.hidden = n !== "today" && !w.dataset.placed;
    for (const w of Object.values(WIN)) if (!w.hidden && !w.dataset.placed) place(w.dataset.win);
    WIN.today.hidden = false; place("today");
    front("today");
    markBar();
  } else {
    for (const [n, w] of Object.entries(WIN)) { if (w.classList.contains("win-sheet")) w.hidden = true; w.style.cssText = ""; delete w.dataset.placed; }
    tab(currentTab);
  }
  world.resize();
}
let rz = 0;
addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });

/* ================================================================ go */
changed();
RENDER.today(); rendered.add("today");
layout();
if (S.example.drift) console.warn("Orbe Studio: the made-up channel no longer matches the products pages.");
window.orbeStudio = { S, open, close, tab, desk };
