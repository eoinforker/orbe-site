/* Orbe r7-f: the story in a phone, in a loud world. Every rating figure comes from the engine via examples.js. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const wide = matchMedia("(min-width: 1024px)");
const handleOf = (v) => cleanHandle(v).toLowerCase();
const N = 4;
let cur = 0;
let kind = "channel";
let said = "";

/* ---------- the hundred: one pixel per creator your size ---------- */
const grid = $("[data-hundred]");
grid.innerHTML = Array.from({ length: 100 }, (_, i) => `<i style="--i:${i};--dx:${0}px;--dy:${0}px"></i>`).join("");
const cells = [...grid.children];
/* a fixed scatter, so the pixels fly the same way every time */
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
cells.forEach((c, i) => {
  const col = i % 10, row = Math.floor(i / 10);
  const ang = Math.atan2(row - 4.5, col - 4.5) + (rnd() - 0.5) * 1.2;
  const d = 0.6 + rnd() * 1.6;
  c.style.setProperty("--dx", `${(Math.cos(ang) * d).toFixed(2)}`);
  c.style.setProperty("--dy", `${(Math.sin(ang) * d).toFixed(2)}`);
});
function light(n, you = n) {
  cells.forEach((c, i) => { c.classList.toggle("on", i < n); c.classList.toggle("you", i === you); });
}
const hk = $("[data-hk]"), hv = $("[data-hv]");
let seqT = [];
function clearSeq() { seqT.forEach(clearTimeout); seqT = []; }

/* the zero, at the close */
$("[data-zero]").innerHTML = Array.from({ length: 100 }, () => "<i></i>").join("");

/* little hundreds in the windows: a fee is so many in 100 */
for (const m of $$("[data-mini]")) {
  const a = +m.dataset.mini, b = +(m.dataset.mini2 || 0);
  m.innerHTML = Array.from({ length: 100 }, (_, i) => `<i class="${i < a ? "on" : i < a + b ? "on2" : ""}"></i>`).join("");
}

/* ---------- every kind can play the story ---------- */
const initials = { channel: "FR", newsletter: "MN", stream: "NS", podcast: "LT", portfolio: "LP" };
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false"><span class="tr-av" aria-hidden="true">${initials[k]}</span><span class="tr-k">${trayLabel[k]}</span></button>`).join("");

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
  const lead = k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0];
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
  wantTok = e.peers;
  enter(cur, true);
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
    <span class="y-vs">${m ? `Its size<small>${row.label}</small>` : row.label}</span>
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
  setTimeout(() => yardWin.classList.add("struck"), 450);
}
tray.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });

/* ---------- the second door: every example, rated live ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
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
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, Math.max(0, (now - t0) / 900));
    el.textContent = sign + (target * ease(t)).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ---------- the giant statement: Odin's typed token, one kind of creator at a time ---------- */
const tok = $("[data-tok]");
const TOKS = ["creators", ...ORDER.map((k) => example(k).peers)];
let wantTok = null;
if (!reduce) {
  let ti = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    await sleep(2600);
    for (;;) {
      const next = wantTok ?? TOKS[(ti = (ti + 1) % TOKS.length)];
      wantTok = null;
      if (next !== tok.textContent) {
        while (tok.textContent.length) { tok.textContent = tok.textContent.slice(0, -1); await sleep(38); }
        for (const ch of next) { tok.textContent += ch; await sleep(62); }
      }
      for (let w = 0; w < 26 && !wantTok; w++) await sleep(100);
    }
  })();
}

/* ---------- the fat strokes: where each one lies in each moment ---------- */
/* [centre x %, centre y %, length % of width, angle] for the three bars, then the arc [x %, y %, size %, angle] */
const SK_WIDE = [
  [[60, 30, 22, -35], [98, 12, 26, 30], [14, 99, 30, -8], [47, 98, 16, 20]],
  [[50, 85, 120, -3], [94, 94, 24, -38], [97, 8, 22, 62], [52, 1, 14, 200]],
  [[26, 102, 30, -62], [74, 0, 30, 14], [97, 66, 26, -66], [56, 97, 20, 300]],
  [[88, 100, 34, -40], [4, 100, 30, 30], [52, 24, 16, -40], [30, 99, 22, 120]],
];
const SK_NARROW = [
  [[94, 14, 46, -30], [0, 50, 70, 60], [96, 88, 60, -50], [6, 98, 40, 200]],
  [[50, 27.5, 130, -4], [96, 90, 60, -40], [0, 60, 60, 32], [94, 15, 40, 60]],
  [[2, 40, 60, -60], [98, 60, 60, 30], [40, 99, 70, -6], [92, 14, 40, 300]],
  [[98, 40, 60, -46], [2, 66, 60, 40], [90, 92, 60, 10], [94, 15, 40, 120]],
];
const world = $(".world");
const sks = $$(".sk"), arc = $(".arc");
function placeStrokes(i) {
  const W = world.clientWidth, H = world.clientHeight;
  const cfg = (wide.matches ? SK_WIDE : SK_NARROW)[i];
  sks.forEach((el, n) => {
    const [x, y, w, r] = cfg[n];
    el.style.setProperty("--x", `${(x / 100) * W}px`);
    el.style.setProperty("--y", `${(y / 100) * H}px`);
    el.style.setProperty("--w", `${(w / 100) * W}px`);
    el.style.setProperty("--r", `${r}deg`);
  });
  const [x, y, s, r] = cfg[3];
  arc.style.setProperty("--x", `${(x / 100) * W}px`);
  arc.style.setProperty("--y", `${(y / 100) * H}px`);
  arc.style.setProperty("--s", `${(s / 100) * W}px`);
  arc.style.setProperty("--r", `${r}deg`);
}

/* ---------- the story ---------- */
const moments = $$(".mo");
const bars = $$("[data-bar]");
const groups = $$(".pg");
const phone = $("[data-phone]");
let paused = reduce;
let away = false;
const DUR = 7000;

function enter(i, again = false) {
  const p = moments[i];
  clearSeq();
  grid.classList.remove("scatter", "ask");
  if (i === 0) {
    light(leadScore);
    hv.textContent = `You beat ${leadScore}`;
    p.classList.remove("fill"); void p.offsetWidth; p.classList.add("fill");
  } else if (i === 1) {
    strike();
    const show = ([label, n]) => { light(n); hv.textContent = `${label}: ${n}`; };
    if (reduce) show(yardSeq[yardSeq.length - 1]);
    else yardSeq.forEach((s, n) => seqT.push(setTimeout(() => show(s), n * 1100)));
  } else if (i === 2) {
    light(leadScore);
    hv.textContent = `Posted: ${example(kind).signed}, ${example(kind).band}`;
    grid.classList.add("scatter");
  } else {
    light(0, 44);
    grid.classList.add("ask");
    hv.textContent = "You beat ? in 100";
  }
  if (!again || i < 2) for (const el of $$("[data-count]", p)) countUp(el);
}

function setScene(i) {
  cur = ((i % N) + N) % N;
  document.body.dataset.scene = String(cur);
  moments.forEach((q, n) => { q.classList.toggle("is-on", n === cur); q.toggleAttribute("inert", n !== cur); q.setAttribute("aria-hidden", String(n !== cur)); });
  groups.forEach((g, n) => g.classList.toggle("is-on", n === cur));
  bars.forEach((b, n) => { b.classList.toggle("done", n < cur); b.classList.remove("run"); });
  void bars[cur].offsetWidth;
  if (!reduce) bars[cur].classList.add("run");
  else bars[cur].classList.add("done");
  $("[data-pos]").textContent = String(cur + 1);
  placeStrokes(cur);
  enter(cur);
  syncPlay();
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
let rz = 0;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => placeStrokes(cur), 120); });
wide.addEventListener?.("change", () => placeStrokes(cur));

setKind("channel");
setScene(0);
requestAnimationFrame(() => document.body.classList.add("ready"));
if (document.fonts) document.fonts.ready.then(() => placeStrokes(cur));

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
