/* Orbe r7-f: the story in a phone, on a field that changes with each moment. Every rating figure comes from the engine via examples.js. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { drawOrb } from "../r8-b/orb.js";
import { createHundred, drawMini, easeUi } from "./hundred.js";
import { labKind, labRedraw } from "./lab.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = !root.classList.contains("move");
const handleOf = (v) => cleanHandle(v).toLowerCase();
const N = 4;
let cur = 0;
let kind = "channel";
let said = "";

/* ---------- colour: the field per moment, and what the art draws in on it ---------- */
const C = { ink: "#141311", chalk: "#FBFAF6", cobalt: "#1F4BFF", claret: "#6F1726", ember: "#FF5A1F" };
const scheme = () => (root.dataset.scheme === "pink" ? "pink" : "blue");
const accent = () => (scheme() === "pink" ? C.claret : C.cobalt);
const scenePal = () => (cur === N - 1 ? { lit: C.chalk, dots: C.chalk, you: C.ember } : { lit: accent(), dots: C.ink, you: C.ember });

/* ---------- the hundred: one cell per creator your size ---------- */
const hCanvas = $("[data-hundred]");
const wide = matchMedia("(min-width: 768px)");
const desk = matchMedia("(min-width: 1280px)");
let hundred = null;
let hState = { n: 93, you: 93 };
function buildHundred() {
  if (hundred) hundred.destroy();
  hundred = wide.matches
    ? createHundred(hCanvas, { cols: 10, rows: 10, cell: desk.matches ? 14 : 20, palette: scenePal })
    : createHundred(hCanvas, { cols: 20, rows: 5, cell: 17, palette: scenePal, shape: "strip" });
  hundred.show(hState, false);
}
buildHundred();
wide.addEventListener?.("change", buildHundred);
desk.addEventListener?.("change", buildHundred);
function light(next, animate = true) { hState = next; hundred.show(next, animate, reduce); }
const hk = $("[data-hk]"), hv = $("[data-hv]");
let seqT = [];
function clearSeq() { seqT.forEach(clearTimeout); seqT = []; }

/* the zero, at the close: a hundred creators, none of them paying */
const zero = createHundred($("[data-zero]"), { cols: 10, rows: 10, cell: wide.matches ? 20 : 16, palette: () => ({ lit: accent(), dots: C.ink, you: C.ember }) });
zero.show({ n: 0, you: -1 });

/* little hundreds in the windows: a fee is so many in 100 */
const minis = $$("[data-mini]").map((m) => drawMini(m, +m.dataset.mini, +(m.dataset.mini2 || 0), { ink: C.ink }));

/* ---------- small orbs: each creator filled to the score their story leads with ---------- */
const leadOf = (k) => { const e = example(k); return k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0]; };
function drawOrbs() {
  for (const cv of $$("[data-tk] canvas")) drawOrb(cv, { fill: leadOf(cv.dataset.k).score / 100, pitch: 4, ink: accent(), rim: C.ink });
  drawOrb($("[data-orb-post]"), { fill: leadOf(kind).score / 100, pitch: 4, ink: accent(), rim: C.ink });
  drawOrb($("[data-orb-next]"), { fill: 0, pitch: 4, ink: C.chalk, rim: C.chalk });
}

/* ---------- every kind can play the story ---------- */
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false"><canvas data-k="${k}" aria-hidden="true"></canvas><span>${trayLabel[k]}</span></button>`).join("");

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
let leadScore = 93;
function setKind(k) {
  kind = k;
  const e = example(k);
  /* Newsletters lead with new paying subscribers, not opens: tracked opens include machine opens. */
  const lead = leadOf(k);
  leadScore = lead.score;
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, lead: String(lead.score), peers: e.peers, fact: firstSentence(e, lead),
    signed: e.signed, band: e.band,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    partOf: `${lead.name}, one of ${count} parts`,
    weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line1: EXAMPLE_LINE, line3: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-ms]").style.setProperty("--to", lead.score / 100);
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  setYard(k);
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
  hk.textContent = `100 ${e.peers} your size`;
  drawOrbs();
  requestAnimationFrame(() => setTimeout(() => { enter(cur, true); labKind(k); }, 0));
}

/* ---------- one piece of work, three yardsticks: the smallest, the biggest, and its own size ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const yardWin = $(".yard-win");
let yardSeq = [];
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
  /* A percentile: never "100 in 100", never "0 in 100". */
  const beats = (row) => (row.key === bm.example ? own : Math.max(1, Math.min(99, Math.round(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100))));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  const what = part.name.toLowerCase();
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}`;
  $("[data-yard]").setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  $("[data-yard]").innerHTML = [[first], [last], [mine, true]].map(([row, m]) => `<li class="y${m ? " mine" : ""}">
    <span class="y-vs">${m ? `Its size, ${row.label}` : row.label}</span>
    <span class="y-say"><span class="y-w">${say(beats(row), m || !banded)}</span>${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span>
    <b class="y-n">${beats(row)}</b>
  </li>`).join("");
  yardWin.classList.toggle("flat", !banded);
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
  yardSeq = banded
    ? [[`Against ${first.label}`, beats(first)], [`Against ${last.label}`, beats(last)], [`Your size`, own]]
    : [[`Your size`, own]];
}
function strike() {
  yardWin.classList.remove("struck"); void yardWin.offsetWidth;
  if (reduce) { yardWin.classList.add("struck"); return; }
  setTimeout(() => yardWin.classList.add("struck"), 300);
}
const later = (fn) => requestAnimationFrame(() => setTimeout(fn, 0));
tray.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (!b) return;
  /* the pressed creator answers at once; the story rebinds on the next frame */
  for (const x of $$("[data-tk]")) x.setAttribute("aria-pressed", String(x === b));
  later(() => setKind(b.dataset.tk));
});

/* ---------- the second door: every example, rated live ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  return `<li><span class="rl-n">${x.name}<small>${x.label}, ${x.sizeBand}</small></span><span class="rl-r"><b>${x.signed}</b><small>${x.band}</small></span></li>`;
}).join("");

/* ---------- wordmarks, still ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: false });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- numbers that arrive: once, from zero, ease-out, no bounce ---------- */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (reduce || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, Math.max(0, (now - t0) / 900));
    el.textContent = sign + (target * easeUi(t)).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ---------- the story ---------- */
const moments = $$(".mo");
const bars = $$("[data-bar]");
const groups = $$(".pg");
const phone = $("[data-phone]");
let paused = reduce;
let away = false;

function enter(i, again = false) {
  const p = moments[i];
  clearSeq();
  if (i === 0) {
    light({ n: leadScore, you: leadScore });
    hv.textContent = `You beat ${leadScore}`;
    p.classList.remove("fill"); void p.offsetWidth; p.classList.add("fill");
  } else if (i === 1) {
    strike();
    const show = ([label, n], anim) => { light({ n, you: n }, anim); hv.textContent = `${label}: ${n}`; };
    if (reduce) show(yardSeq[yardSeq.length - 1], false);
    else yardSeq.forEach((s, n) => seqT.push(setTimeout(() => show(s, true), n * 1100)));
  } else if (i === 2) {
    light({ n: leadScore, you: leadScore });
    hv.textContent = `Posted: ${example(kind).signed}, ${example(kind).band}`;
  } else {
    light({ n: 0, you: 44, ask: true });
    hv.textContent = "You beat ? in 100";
  }
  if (!again || i < 2) for (const el of $$("[data-count]", p)) countUp(el);
}

function setScene(i) {
  cur = ((i % N) + N) % N;
  document.body.dataset.scene = String(cur);
  hundred.redraw();
  moments.forEach((q, n) => { q.classList.toggle("is-on", n === cur); q.toggleAttribute("inert", n !== cur); q.setAttribute("aria-hidden", String(n !== cur)); });
  groups.forEach((g, n) => g.classList.toggle("is-on", n === cur));
  bars.forEach((b, n) => { b.classList.toggle("done", n < cur || (reduce && n === cur)); b.classList.remove("run"); });
  $("[data-pos]").textContent = String(cur + 1);
  syncPlay();
  /* The press paints first; the hundred and the counts follow on the next frame. */
  const at = cur;
  requestAnimationFrame(() => setTimeout(() => {
    if (at !== cur) return;
    if (!reduce) bars[cur].classList.add("run");
    enter(cur);
  }, 0));
}
function syncPlay() {
  phone.classList.toggle("is-paused", paused || away);
  const b = $("[data-pause]");
  b.setAttribute("aria-pressed", String(paused));
  b.textContent = paused ? "Play" : "Pause";
  b.disabled = reduce;
}
for (const b of bars) b.addEventListener("animationend", () => {
  if (b !== bars[cur] || paused || reduce) return;
  if (cur === N - 1) { paused = true; syncPlay(); return; }
  setScene(cur + 1);
});
for (const b of $$("[data-step]")) b.addEventListener("click", () => setScene(cur + Number(b.dataset.step)));
$("[data-pause]").addEventListener("click", () => { paused = !paused; if (!paused && cur === N - 1) { setScene(0); return; } syncPlay(); });

/* Tap the left of the screen for the moment before, anywhere else for the next. */
phone.addEventListener("click", (ev) => {
  if (ev.target.closest("a, button, input, select, label, form, textarea, blockquote, .win")) return;
  const r = phone.getBoundingClientRect();
  setScene(cur + (ev.clientX - r.left < r.width * 0.3 ? -1 : 1));
});
/* Reading or typing inside the phone holds the story still. */
phone.addEventListener("focusin", (ev) => { if (ev.target.matches("input, select")) { paused = true; syncPlay(); } });

/* Off screen, the story waits. */
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => { away = !e.isIntersecting; syncPlay(); document.body.classList.toggle("past", !e.isIntersecting && e.boundingClientRect.top < 0); }, { threshold: 0.15 }).observe(phone);
}

setKind("channel");
setScene(0);
requestAnimationFrame(() => document.body.classList.add("ready"));

/* ---------- the scheme: blue or pink, remembered ---------- */
function setScheme(c) {
  root.dataset.scheme = c;
  try { localStorage.setItem("orbe-r7f-scheme", c); } catch {}
  for (const b of $$("[data-scheme-set]")) b.setAttribute("aria-pressed", String(b.dataset.schemeSet === c));
  $('meta[name="theme-color"]').setAttribute("content", c === "pink" ? "#F2879E" : "#9EE9FB");
  hundred.redraw(); zero.redraw(); minis.forEach((m) => m.draw()); drawOrbs(); labRedraw();
}
for (const b of $$("[data-scheme-set]")) b.addEventListener("click", () => setScheme(b.dataset.schemeSet));
for (const b of $$("[data-scheme-set]")) b.setAttribute("aria-pressed", String(b.dataset.schemeSet === scheme()));

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  paused = true; syncPlay();
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
for (const k of $$("[data-kind]")) k.addEventListener("change", () => setKind(k.value));

/* The reply bar carries the handle into the last moment. */
$("[data-jump]").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("[data-handle]", ev.currentTarget);
  const h = handleOf(input.value);
  if (h) input.value = h;
  syncHandles(input);
  paused = true;
  setScene(N - 1);
  phone.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  const target = $(".stack-form " + (h ? "button" : "input"));
  setTimeout(() => target.focus({ preventScroll: true }), reduce ? 0 : 500);
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
