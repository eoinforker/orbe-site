/* Orbe r7-d. Every figure comes from the engine via examples.js. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

document.documentElement.classList.add("js");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const handleOf = (v) => cleanHandle(v).toLowerCase();

/* ---------- the hundred: 100 pixels, one per creator your size ----------
   Ranked from the bottom left: the first n are the creators beaten, the next one is you. */
const Q = [
  "..........", "...####...", "..##..##..", "......##..", ".....##...",
  "....##....", "....##....", "..........", "....##....", "..........",
];
function hundred(el, n, { you = true, mask = null } = {}) {
  let html = "";
  for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
    const rank = (9 - row) * 10 + col;
    let c = "";
    if (mask) c = mask[row][col] === "#" ? "on" : "";
    else if (rank < n) c = "on";
    else if (you && rank === n && n < 100) c = "you";
    const d = mask ? (row * 10 + col) * 9 : Math.floor(rank / 10) * 46 + (rank % 10) * 7 + (c === "you" ? 160 : 0);
    html += `<i${c ? ` class="${c}"` : ""} style="--d:${d}ms"></i>`;
  }
  el.innerHTML = html;
  el.dataset.n = String(n);
}
function strip(el, n) {
  let html = "";
  for (let row = 0; row < 4; row++) for (let col = 0; col < 25; col++) {
    const rank = col * 4 + row;
    html += `<i${rank < n ? ' class="on"' : ""} style="--d:${rank * 34}ms"></i>`;
  }
  el.innerHTML = html;
}
/* Light the pixels: a few at a time, frame by frame, so a snap never costs a slow frame. Still under reduced motion. */
function light(el, replay = true) {
  el.classList.add("go");
  const cells = [...el.children].filter((c) => c.className);
  if (reduce || !replay) { for (const c of cells) c.classList.add("l"); return; }
  const ds = cells.map((c) => parseFloat(c.style.getPropertyValue("--d")) || 0);
  for (const c of cells) c.classList.remove("l");
  const run = (el.__run = (el.__run || 0) + 1);
  const t0 = performance.now();
  let next = 0;
  const order = cells.map((c, i) => i).sort((a, b) => ds[a] - ds[b]);
  const step = (now) => {
    if (el.__run !== run) return;
    const t = now - t0;
    while (next < order.length && ds[order[next]] <= t) cells[order[next++]].classList.add("l");
    if (next < order.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- the brand colour ---------- */
const swatches = $$(".swatch button");
function setColour(c, save) {
  document.documentElement.dataset.c = c;
  document.documentElement.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  if (save) {
    try { localStorage.setItem("orbe-r7d-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
setColour(document.documentElement.dataset.c === "pink" ? "pink" : "blue", false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- one piece of work, three yardsticks (the same reading of the engine as r6-a and r6-e) ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const yardEl = $("[data-yard]");
function setYard(k) {
  const e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const part = e.result.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = e.result.parts.find((p) => p.key === key).score;
  const bm = benchmark(k);
  const banded = typeof prior.median === "object";
  const typical = (row) => (banded ? prior.median[row.key] : prior.median);
  const beats = (row) => (row.key === bm.example ? own : Math.max(1, Math.min(99, Math.round(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100))));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  const what = part.name.toLowerCase();
  yardEl.setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  yardEl.innerHTML = [[first], [last], [mine, true]].map(([row, m]) => `<li class="y${m ? " mine" : ""}">
    <span class="y-strike" aria-hidden="true"></span>
    <span class="y-vs">${m ? `Its size<small>${row.label}</small>` : `Against<small>${row.label}</small>`}</span>
    <div class="hund" data-yn="${beats(row)}" aria-hidden="true"></div>
    <b class="y-n">${beats(row)}</b>
    <span class="y-w">${say(beats(row), m || !banded)}${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span>
  </li>`).join("");
  for (const h of $$("[data-yn]", yardEl)) hundred(h, +h.dataset.yn);
  yardEl.classList.toggle("flat", !banded);
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
}
function strike() {
  yardEl.classList.remove("struck"); void yardEl.offsetWidth;
  if (reduce) { yardEl.classList.add("struck"); return; }
  setTimeout(() => yardEl.classList.add("struck"), 650);
}

/* ---------- the kind: the headline's word drives the whole page ---------- */
const kindsRow = $("[data-kinds]");
kindsRow.innerHTML = ORDER.map((k) => `<button type="button" data-k="${k}" aria-pressed="false">${example(k).word}</button>`).join("");

let kind = "channel";
let said = "";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
const leadOf = (k) => { const e = example(k); return k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0]; };

function setKind(k) {
  kind = k;
  const e = example(k);
  const lead = leadOf(k);
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => e.result.parts.find((p) => p.key === key)) : e.parts;
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, lead: String(lead.score), peers: e.peers, fact: firstSentence(e, lead), size: e.sizeBand,
    signed: e.signed, band: e.band,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    partOf: `${lead.name}, one of ${count} parts`,
    weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  $("[data-parts]").innerHTML = parts.map((p) => `<li><b>${p.score}</b><span>${p.name}<small>${p.value}</small></span></li>`).join("");
  $("[data-scale]").style.setProperty("--at", `${Math.max(4, Math.min(96, 50 + (e.rating / 3) * 50))}%`);
  for (const h of $$('[data-hund="lead"]')) hundred(h, lead.score);
  setYard(k);
  drift(k);
  $("[data-hero-foot]").textContent = `Made-up example: ${e.handle} beats ${lead.score} in 100 ${e.peers} its size`;
  for (const b of $$("[data-k]")) b.setAttribute("aria-pressed", String(b.dataset.k === k));
  for (const s of $$("[data-kind]")) s.value = k;
  for (const s of $$("[data-kind-hidden]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
  /* panels already on screen relight with the new numbers */
  for (const p of panels) if (p.classList.contains("seen")) {
    for (const h of $$(".hund", p)) light(h);
    for (const c of $$("[data-count]", p)) countUp(c);
    if (p.classList.contains("p2")) strike();
  }
}

/* ---------- the headline word, cycling with a snap ---------- */
const slot = $("[data-slot]");
const word = $("[data-word]");
const swash = $("[data-swash]");
function fitSlot() { slot.style.width = word.offsetWidth + "px"; }
function showWord(k, animate = true) {
  const i = ORDER.indexOf(k);
  const set = () => {
    word.textContent = example(k).word;
    swash.style.setProperty("--swash", `var(--sw-${i})`);
    fitSlot();
  };
  if (!animate || reduce) { set(); return; }
  word.classList.remove("in"); word.classList.add("out");
  setTimeout(() => {
    set();
    word.classList.remove("out"); void word.offsetWidth; word.classList.add("in");
    swash.classList.remove("go"); void swash.offsetWidth; swash.classList.add("go");
  }, 230);
}
let auto = !reduce;
let heroOn = true;
let timer = 0;
function tick() {
  clearTimeout(timer);
  if (!auto) return;
  timer = setTimeout(() => {
    if (auto && heroOn && !document.hidden) {
      const next = ORDER[(ORDER.indexOf(kind) + 1) % ORDER.length];
      showWord(next); setKind(next);
    }
    tick();
  }, 2400);
}
kindsRow.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-k]");
  if (!b) return;
  auto = false; clearTimeout(timer);
  if (b.dataset.k !== kind) { showWord(b.dataset.k); setKind(b.dataset.k); }
});
/* typing a handle means you have chosen: the word holds still */
for (const h of $$("[data-handle]")) h.addEventListener("focus", () => { auto = false; clearTimeout(timer); });

/* ---------- the hero's pixels: real data, drifting off the edges ----------
   Right: the example's own hundred, dissolving. Left: typical reach by size, from the engine's baselines. */
function seeded(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function drift(k) {
  const lead = leadOf(k).score;
  const r = $('[data-drift="r"]');
  const rnd = seeded(lead * 31 + 7);
  let html = "";
  for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
    const rank = (9 - row) * 10 + col;
    const keep = rnd() < Math.min(1, 0.25 + (row + col) / 13);
    const c = rank === lead ? "you" : rank < lead && keep ? "on" : "";
    html += `<i${c ? ` class="${c}"` : ""}></i>`;
  }
  r.innerHTML = html;
  r.style.setProperty("--cols", 10);
  const rows = benchmark(k).rows.filter((x) => x.value > 0);
  const l = $('[data-drift="l"]');
  const lo = Math.log(Math.min(...rows.map((x) => x.value))), hi = Math.log(Math.max(...rows.map((x) => x.value)));
  const hs = rows.map((x) => 2 + Math.round(((Math.log(x.value) - lo) / (hi - lo || 1)) * 9));
  const cols = rows.length * 2 - 1;
  const rnd2 = seeded(rows.length * 97 + 3);
  html = "";
  for (let row = 0; row < 11; row++) for (let c = 0; c < cols; c++) {
    const j = c / 2, h = hs[j];
    const filled = c % 2 === 0 && 10 - row < h;
    const top = filled && 10 - row === h - 1;
    html += `<i${filled && (!top || rnd2() > 0.4) ? ` class="${rows[j].key === benchmark(k).example ? "you" : "on"}"` : ""}></i>`;
  }
  l.innerHTML = html;
  l.style.setProperty("--cols", cols);
}

/* ---------- the stack: panels slide over each other ---------- */
const panels = $$(".p");
const stack = $("[data-stack]");
function headerH() { return innerWidth >= 900 ? 84 : 66; }
function pinTops() {
  panels.forEach((p, i) => {
    const want = headerH() + i * (innerWidth >= 900 ? 14 : 10);
    p.style.setProperty("--top", Math.min(want, innerHeight - p.offsetHeight - 10) + "px");
  });
}
function shade() {
  if (reduce) return;
  panels.forEach((p, i) => {
    const n = panels[i + 1];
    if (!n) return;
    const pt = p.getBoundingClientRect().top;
    const nt = n.getBoundingClientRect().top;
    const span = Math.max(1, innerHeight - pt);
    const t = Math.max(0, Math.min(1, (innerHeight - nt) / span));
    p.style.transform = t > 0 ? `scale(${1 - 0.06 * t})` : "";
    p.style.setProperty("--shade", (0.38 * t).toFixed(3));
  });
}
let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; shade(); });
}, { passive: true });
let rt = 0;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { pinTops(); fitSlot(); shade(); }, 120); });

/* A panel lights up the first time it arrives: its stroke is thrown, its pixels snap on, its numbers count. */
function arrive(p) {
  if (p.classList.contains("seen")) return;
  p.classList.add("seen");
  for (const h of $$(".hund, .strip", p)) light(h);
  for (const c of $$("[data-count]", p)) countUp(c);
  if (p.classList.contains("p2")) strike();
}
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) arrive(e.target); }, { threshold: 0.3 });
  panels.forEach((p) => io.observe(p));
  const hio = new IntersectionObserver((es) => { heroOn = es[0].isIntersecting; }, { threshold: 0.55 });
  hio.observe($(".hero"));
  const qio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { light($('[data-hund="q"]')); qio.disconnect(); } }, { threshold: 0.4 });
  qio.observe($('[data-hund="q"]'));
} else panels.forEach(arrive);

/* ---------- numbers that arrive: once, from zero ---------- */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (reduce || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  const dur = 800;
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, Math.max(0, (now - t0) / dur));
    el.textContent = sign + (target * ease(t)).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ---------- static pixels: fees, the buyer's list, the question ---------- */
for (const s of $$("[data-strip]")) strip(s, +s.dataset.strip);
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const lead = x.parts[0];
  return `<li><div class="hund" data-rn="${lead.score}" aria-hidden="true"></div><span class="rl-n">${x.name}<small>${x.label}, ${x.sizeBand}. ${lead.name} beats ${lead.score} in 100.</small></span><b class="rl-r">${x.signed}<small>${x.band}</small></b></li>`;
}).join("");
for (const h of $$("[data-rn]")) hundred(h, +h.dataset.rn);
hundred($('[data-hund="q"]'), 0, { mask: Q });

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- start ---------- */
setKind("channel");
showWord("channel", false);
if (document.fonts) document.fonts.ready.then(() => { fitSlot(); pinTops(); shade(); });
pinTops();
shade();
if (reduce) { panels.forEach((p) => { p.classList.add("seen"); for (const h of $$(".hund, .strip", p)) light(h); }); light($('[data-hund="q"]'), false); yardEl.classList.add("struck"); }
tick();

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  try { await navigator.clipboard.writeText(text); out.textContent = "Copied. Paste it under your next post."; }
  catch { out.textContent = text; }
});

/* ---------- reserving a handle: one handle and one kind, everywhere ---------- */
const handles = $$("[data-handle]");
const mirrors = $$("[data-mirror]");
function syncHandles(src) {
  for (const h of handles) if (h !== src) h.value = src.value;
  const h = handleOf(src.value);
  for (const m of mirrors) m.textContent = h || "yourhandle";
}
for (const h of handles) h.addEventListener("input", () => syncHandles(h));
for (const k of $$("[data-kind]")) k.addEventListener("change", () => { auto = false; showWord(k.value, false); setKind(k.value); });

for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-done"); form.classList.add("err"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    form.classList.remove("err"); input.removeAttribute("aria-invalid");
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: (form.elements.kind && form.elements.kind.value) || kind });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
