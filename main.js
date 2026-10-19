/* Orbe r6-e: the story. Every figure comes from the engine via examples.js. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "./assets/r5/examples.js";
import { ratingNotice } from "./assets/engine/rating/label.js";
import { SPECS } from "./assets/engine/rating/kinds.js";
import { mountWordmark } from "./assets/r5/wordmark.js";
import { reserve, cleanHandle } from "./assets/r5/reserve.js";
import { paintCanvas, PALETTES } from "./painter.js";

document.documentElement.classList.add("js");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const wide = matchMedia("(min-width: 1024px)");
const handleOf = (v) => cleanHandle(v).toLowerCase();

/* ---------- the paintings: laid with the archive's flat brush, one stroke at a time ---------- */
const canvases = $$("canvas.paint");
function paintAll() {
  const pal = PALETTES[document.documentElement.dataset.scheme === "pink" ? "pink" : "blue"];
  for (const c of canvases) paintCanvas(c, c.dataset.scene, pal, +c.dataset.seed || 7);
}
let paintT = 0;
addEventListener("resize", () => { clearTimeout(paintT); paintT = setTimeout(paintAll, 200); });
if (document.fonts) document.fonts.ready.then(paintAll);

/* ---------- the brand colour: Blue or Pink, mapped to the tokens' data-scheme ---------- */
const swatches = $$(".swatch button");
function setColour(c, save) {
  document.documentElement.dataset.c = c;
  document.documentElement.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  paintAll();
  if (save) {
    try { localStorage.setItem("orbe-r6e-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
setColour(document.documentElement.dataset.c === "pink" ? "pink" : "blue", false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- every kind can play the story ---------- */
const initials = { channel: "FR", newsletter: "MN", stream: "NS", podcast: "LT", portfolio: "LP" };
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false"><span class="tr-av" aria-hidden="true">${initials[k]}</span><span class="tr-k">${trayLabel[k]}</span></button>`).join("");

let kind = "channel";
let said = "";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
function setKind(k, { recount = true } = {}) {
  kind = k;
  const e = example(k);
  /* Newsletters lead with new paying subscribers, not opens: tracked opens include machine opens. */
  const lead = k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0];
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => e.result.parts.find((p) => p.key === key)) : e.parts;
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, size: e.sizeBand, lead: String(lead.score), peers: e.peers, fact: firstSentence(e, lead),
    initials: initials[k], signed: e.signed, band: e.band,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    partOf: `${lead.name}, one of ${count} parts`,
    weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line1: EXAMPLE_LINE, line2: EXAMPLE_LINE, line3: EXAMPLE_LINE + " Painting drawn by Orbe.",
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-ms]").style.setProperty("--to", lead.score / 100);
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  $("[data-parts]").innerHTML = parts.map((p) => `<li><b>${p.score}</b><span>${p.name}<small>${p.value}</small></span></li>`).join("");
  setYard(k);
  if (cur === 1) strike();
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
  if (recount && cur >= 0 && cur < 2) for (const el of $$("[data-count]", moments[cur])) countUp(el);
  const m1 = $(".m1");
  m1.classList.remove("fill"); void m1.offsetWidth; m1.classList.add("fill");
}
/* ---------- one piece of work, three yardsticks: the smallest, the biggest, and its own size ----------
   The same reading of the engine as r6-a: where the work's reach would sit among the smallest and the
   biggest creators of its kind, against the score the engine gives it among its own size. */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const lower = (s) => s.replace(/^Under/, "under").replace(/^Over/, "over");
/* The window reads the part moment 1 leads with, so "where I stand" is one number on both screens. */
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
function setYard(k) {
  const e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const part = e.result.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = e.result.parts.find((p) => p.key === key).score;
  const bm = benchmark(k);
  /* Where the engine's typical changes with size, each row is read against that size's typical.
     Where it does not (a newsletter's paid conversion is counted per 1,000 recipients), every size reads the same. */
  const banded = typeof prior.median === "object";
  const typical = (row) => (banded ? prior.median[row.key] : prior.median);
  /* A percentile: never "100 in 100", never "0 in 100". */
  const beats = (row) => (row.key === bm.example ? own : Math.max(1, Math.min(99, Math.round(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100))));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  const what = part.name.toLowerCase();
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}`;
  $("[data-yard]").setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  $("[data-yard]").innerHTML = [[first], [last], [mine, true]].map(([row, m]) => `<li class="y${m ? " mine" : ""}">
    <span class="y-vs">${m ? `Its size<small>${row.label}</small>` : row.label}</span>
    <span class="y-say"><span class="y-w">${say(beats(row), m || !banded)}</span>${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span>
    <b class="y-n">${beats(row)}</b>
  </li>`).join("");
  m2win.classList.toggle("flat", !banded);
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
}
/* The wrong verdicts are struck through in turn as the window arrives. */
const m2win = document.querySelector(".m2 .win");
function strike() {
  m2win.classList.remove("struck"); void m2win.offsetWidth;
  if (reduce) { m2win.classList.add("struck"); return; }
  setTimeout(() => m2win.classList.add("struck"), 450);
}

tray.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });

/* ---------- the second door: every example, rated live ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  /* A buyer's list leads with the size band: "250k to 1M" over "subscribers". */
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  return `<li><span class="rl-s">${span}<small>${unit}</small></span><span class="rl-n">${x.name}<small>${x.label}</small></span><b class="rl-r">${x.signed}</b><span class="rl-b">${x.band}</span></li>`;
}).join("");

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- numbers that arrive: once, from zero, no bounce ---------- */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (reduce || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  const dur = 900;
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

/* ---------- the story ---------- */
const moments = $$(".mo");
const fills = $$("[data-fill]");
const N = moments.length;
let cur = -1;
let paused = false;
const phone = $(".phone");

function setScene(i, { replay = false } = {}) {
  const changed = i !== cur;
  cur = i;
  document.body.dataset.scene = String(i);
  const k = Math.min(i, N - 1);
  for (const p of $$("[data-pos2]")) p.textContent = String(k + 1);
  const pos = $("[data-pos]"); if (pos) pos.textContent = String(k + 1);
  for (const f of fills) {
    f.style.setProperty("--a", k / N);
    f.style.setProperty("--b", (k + 1) / N);
    if (wide.matches && !reduce && (changed || replay)) { f.classList.remove("run"); void f.offsetWidth; f.classList.add("run"); }
    else if (!wide.matches || reduce) f.classList.remove("run");
  }
  moments.forEach((q, n) => q.classList.toggle("is-on", n === i));
  const p = moments[i];
  if (p && changed) {
    const first = !p.classList.contains("seen");
    p.classList.add("seen");
    if (i === 0) { p.classList.remove("fill"); void p.offsetWidth; p.classList.add("fill"); }
    for (const el of $$("[data-count]", p)) if (wide.matches || first) countUp(el);
    if (i === 1 && (wide.matches || first)) strike();
  }
}

/* Phone: the page scrolls; the moment at the middle of the screen is the scene. Past the story, scene 4+. */
const panels = $$(".panel");
function sceneFromScroll() {
  const mid = innerHeight * 0.5;
  /* a panel hidden on this screen (the close, on a phone) never counts */
  for (let k = panels.length - 1; k >= 0; k--) if (panels[k].offsetParent && panels[k].getBoundingClientRect().top <= mid) return N + k;
  for (let k = N - 1; k >= 0; k--) if (moments[k].getBoundingClientRect().top <= mid) return k;
  return 0;
}
/* The phone header wears the ground of whatever sits under it, so it never prints over a moment's type. */
const top = $(".top");
function groundTop() {
  const y = top.offsetHeight;
  let s = 0;
  moments.forEach((q, n) => { if (q.getBoundingClientRect().top <= y) s = n; });
  panels.forEach((q, n) => { if (q.offsetParent && q.getBoundingClientRect().top <= y) s = N + n; });
  top.dataset.s = String(s);
}
let ticking = false;
addEventListener("scroll", () => {
  if (wide.matches || ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; groundTop(); const s = sceneFromScroll(); if (s !== cur) setScene(s); });
}, { passive: true });

function goPhone(i) {
  const t = moments[Math.max(0, Math.min(N - 1, i))];
  t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/* Tap the right of a moment for the next, the left for the one before. */
$(".story").addEventListener("click", (ev) => {
  if (wide.matches) return;
  if (ev.target.closest("a, button, input, select, label, form, textarea, .win, blockquote")) return;
  const dir = ev.clientX < innerWidth * 0.3 ? -1 : 1;
  if ((dir > 0 && cur >= N - 1) || (dir < 0 && cur <= 0)) return;
  goPhone(cur + dir);
});

/* Desktop: the story plays in the phone, with a pause, and the page wears its colour. */
function show(i) { setScene(((i % N) + N) % N, { replay: true }); }
function setPaused(v) {
  paused = v;
  phone.classList.toggle("is-paused", v);
  const b = $("[data-pause]");
  b.setAttribute("aria-pressed", String(v));
  b.textContent = v ? "Play" : "Pause";
}
function framed() {
  if (wide.matches) {
    for (const f of fills) f.style.setProperty("--dur", "6000ms");
    show(cur < 0 || cur > N - 1 ? 0 : cur);
  } else {
    moments.forEach((q) => q.classList.remove("is-on"));
    setScene(sceneFromScroll());
    groundTop();
  }
}
fills[1]?.addEventListener("animationend", () => {
  if (!wide.matches || reduce || paused) return;
  if (cur === N - 1) { setPaused(true); return; }
  show(cur + 1);
});
for (const b of $$("[data-go], [data-step]")) b.addEventListener("click", () => show(cur + Number(b.dataset.go ?? b.dataset.step)));
$("[data-pause]").addEventListener("click", () => { setPaused(!paused); if (!paused) show(cur); });
if (reduce) setPaused(true);
wide.addEventListener?.("change", framed);

setKind("channel", { recount: false });
framed();

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
  document.body.classList.toggle("typed", !!h);
}
for (const h of handles) h.addEventListener("input", () => syncHandles(h));
for (const k of $$("[data-kind]")) k.addEventListener("change", () => setKind(k.value));


/* The reply bar carries the handle into the last moment. */
$("[data-jump]").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("[data-handle]", ev.currentTarget);
  /* the bar hands the cleaned handle over, so the last moment's field shows what will be sent */
  const h = handleOf(input.value);
  if (h) input.value = h;
  syncHandles(input);
  goPhone(N - 1);
  const target = $(".stack-form " + (handleOf(input.value) ? "button" : "input"));
  setTimeout(() => target.focus({ preventScroll: true }), reduce ? 0 : 600);
});

for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-done"); input.focus(); return; }
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
