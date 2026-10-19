/* Orbe r7-e: the moon page. Every figure comes from the engine via examples.js. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, BENCHMARK_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { drawOrb, mountOrb, setOrb } from "./orb.js";

const root = document.documentElement;
root.classList.add("js");
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
if (!reduce) root.classList.add("motion");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const handleOf = (v) => cleanHandle(v).toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- the brand colour ---------- */
const swatches = $$(".swatch button");
function setColour(c, save) {
  root.dataset.c = c;
  root.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  for (const cv of $$("canvas.orb")) if (cv.dataset.p != null) drawOrb(cv, +cv.dataset.p);
  if (save) {
    try { localStorage.setItem("orbe-r7e-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));
swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === root.dataset.c)));

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-big]")) mountWordmark(el, { animate: !reduce });

/* ---------- the kinds ---------- */
const initials = { channel: "FR", newsletter: "MN", stream: "NS", podcast: "LT", portfolio: "LP" };
const tabLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const WORD = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "podcast", portfolio: "photos" };
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" class="tab" data-tk="${k}" aria-pressed="false"><span class="tab-l">${tabLabel[k]}</span><span class="tab-pill" aria-hidden="true"><i></i></span></button>`).join("");

/* Newsletters lead with new paying subscribers, not opens: tracked opens include machine opens. */
const leadOf = (k, e) => (k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0]);
const partsOf = (k, e) => (k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => e.result.parts.find((p) => p.key === key)) : e.parts);
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}

/* The hundred: one square per creator your size, lit up to the ones you beat. */
const hundred = $("[data-hundred]");
hundred.innerHTML = Array.from({ length: 100 }, (_, i) => `<i style="--d:${(i % 10) * 9 + Math.floor(i / 10) * 14}ms"></i>`).join("");
const cells = [...hundred.children];

let kind = "channel";
let said = "";
const heroOrb = $("[data-orb='lead']");
let heroOrbOn = false;

function countUp(el, final) {
  const n = parseFloat(final);
  if (reduce || !isFinite(n)) { el.textContent = final; return; }
  const t0 = performance.now();
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, (now - t0) / 700);
    el.textContent = String(Math.round(n * (1 - Math.pow(1 - t, 4))));
    if (t < 1) requestAnimationFrame(step);
  };
  el.dataset.final = final;
  requestAnimationFrame(step);
}

function setKind(k, { from = "ui" } = {}) {
  kind = k;
  const e = example(k);
  const lead = leadOf(k, e);
  const parts = partsOf(k, e);
  const count = NUM[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, size: e.sizeBand, lead: String(lead.score), peers: e.peers, fact: firstSentence(e, lead),
    initials: initials[k], signed: e.signed, band: e.band, best: e.best,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    weighs: `${lead.name} is one of ${count} parts. The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line1: EXAMPLE_LINE, line3: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) {
    const v = bind[el.dataset.b];
    if (v == null) continue;
    if (el.dataset.b === "lead" && from !== "init") countUp(el, v); else { el.textContent = v; el.dataset.final = v; }
  }
  /* the phone */
  cells.forEach((c, i) => c.classList.toggle("on", i < lead.score));
  hundred.classList.remove("run"); void hundred.offsetWidth; hundred.classList.add("run");
  $("[data-app-parts]").innerHTML = parts.map((p) => `<li><span>${esc(p.name)}</span><span class="pip" style="--v:${p.score}"><i></i></span><b>${p.score}</b></li>`).join("");
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is"' : ""}>${b}</li>`).join("");
  if (heroOrbOn) setOrb(heroOrb, lead.score / 100, { reduce }); else heroOrb.dataset.p = String(lead.score / 100);
  /* the rating window */
  setScale(e);
  $("[data-parts]").innerHTML = parts.map((p) => `<li><b>${p.score}</b><span>${esc(p.name)}<small>${esc(p.value)}</small></span></li>`).join("");
  setYard(k);
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
}

/* Zero is typical: the five bands on one ruler from -3 to +3, zero in the middle. */
const EDGES = [-3, -2, -0.8, 0.8, 2, 3];
function setScale(e) {
  const at = (v) => ((Math.max(-3, Math.min(3, v)) + 3) / 6) * 100;
  $("[data-scale]").innerHTML = BANDS.map((b, i) => `<li class="${b === e.band ? "is" : ""}" style="--a:${at(EDGES[i])}%;--b:${at(EDGES[i + 1])}%"><span>${b}</span></li>`).join("")
    + `<li class="zero" aria-hidden="true" style="--a:50%"><span>0 typical</span></li><li class="you" aria-hidden="true" style="--a:${at(e.rating)}%"><span>${esc(e.signed)}</span></li>`;
}

/* ---------- one piece of work, three yardsticks ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const yardWin = $("[data-yardwin]");
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
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}`;
  const yard = $("[data-yard]");
  yard.setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  yard.innerHTML = [[first], [last], [mine, true]].map(([row, m]) => `<li class="y${m ? " mine" : ""}">
    <canvas class="orb orb-y" width="44" height="44" data-y="${beats(row)}" aria-hidden="true"></canvas>
    <span class="y-vs">${m ? `Its size, ${esc(row.label)}` : `Against ${esc(row.label)}`}</span>
    <span class="y-say"><span class="y-w">${say(beats(row), m || !banded)}</span>${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span>
    <b class="y-n">${beats(row)}<small> in 100</small></b>
  </li>`).join("");
  for (const c of $$("canvas[data-y]", yard)) mountOrb(c, +c.dataset.y / 100, { reduce, dur: 900 });
  yardWin.classList.toggle("flat", !banded);
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
}

/* ---------- the tabs, the cycling word, and the pause ---------- */
const cyc = $("[data-cyc]");
let typing = 0;
function typeWord(w) {
  const my = ++typing;
  if (reduce) { cyc.textContent = w; return; }
  const tick = () => {
    if (my !== typing) return;
    const cur = cyc.textContent;
    if (cur && !w.startsWith(cur)) { cyc.textContent = cur.slice(0, -1); setTimeout(tick, 34); return; }
    if (cur.length < w.length) { cyc.textContent = w.slice(0, cur.length + 1); setTimeout(tick, 62); }
  };
  tick();
}

const STEP_MS = 5200;
let paused = reduce;
let inView = true;
let timer = 0;
const pauseBtn = $("[data-pause]");
function setPaused(v) {
  paused = v;
  pauseBtn.setAttribute("aria-pressed", String(v));
  pauseBtn.querySelector(".vh").textContent = v ? "Play the examples" : "Pause the examples";
  root.classList.toggle("paused", v);
  schedule();
}
function schedule() {
  clearTimeout(timer);
  for (const p of $$(".tab-pill i")) p.classList.remove("run");
  if (paused || !inView || document.hidden) return;
  const pill = $(`[data-tk="${kind}"] .tab-pill i`);
  void pill.offsetWidth; pill.classList.add("run");
  timer = setTimeout(() => {
    const next = ORDER[(ORDER.indexOf(kind) + 1) % ORDER.length];
    setKind(next, { from: "cycle" });
    typeWord(WORD[next]);
    schedule();
  }, STEP_MS);
}
tray.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (!b) return;
  setKind(b.dataset.tk);
  typeWord(WORD[b.dataset.tk]);
  setPaused(true);
});
pauseBtn.addEventListener("click", () => setPaused(!paused));
document.addEventListener("visibilitychange", schedule);
if ("IntersectionObserver" in window) {
  const seen = new Set();
  const io = new IntersectionObserver((es) => {
    for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
    const was = inView; inView = seen.size > 0;
    if (was !== inView) schedule();
  });
  io.observe($(".hero")); io.observe($(".deck-plate"));
}

/* ---------- The Orbe Times ---------- */
const pct = (v) => `${Math.round(v * 100)}%`;
function times() {
  const e = example("channel");
  const bm = benchmark("channel");
  const reachPart = e.result.detail.parts.find((p) => p.key === "reach");
  const mine = bm.rows.find((r) => r.key === bm.example);
  const max = Math.max(reachPart.measured, ...bm.rows.map((r) => r.value));
  const reachScore = e.result.parts.find((p) => p.key === "reach").score;
  $("[data-lead]").innerHTML = `
    <p class="kick"><span class="stamp">Made up</span> Lead story</p>
    <h3 class="lead-h">The middle reaches ${pct(mine.value)}. ${esc(e.name)} reaches ${pct(reachPart.measured)}.</h3>
    <p class="lead-d">${esc(bm.what)} For ${esc(e.peers)} at ${esc(mine.label)} ${esc(SPECS.youtube.audienceNoun)}, the typical is ${pct(mine.value)}. ${esc(e.name)} sits at ${pct(reachPart.measured)}, which beats ${reachScore} in 100 ${esc(e.peers)} its size.</p>
    <figure class="chart">
      <figcaption>${esc(bm.title)}</figcaption>
      <ol>${bm.rows.map((r) => `<li class="${r.key === bm.example ? "is" : ""}"><span class="c-l">${esc(r.label)}</span><span class="c-bar"><i style="--w:${(r.value / max) * 100}%"></i></span><b>${pct(r.value)}</b></li>`).join("")}
        <li class="you"><span class="c-l">${esc(e.name)}</span><span class="c-bar"><i style="--w:${(reachPart.measured / max) * 100}%"></i></span><b>${pct(reachPart.measured)}</b></li></ol>
    </figure>`;

  const story = (k, h, d) => {
    const x = example(k);
    const lead = leadOf(k, x);
    return `<article class="story">
      <figure class="plate"><canvas class="orb orb-story" width="72" height="72" data-story="${lead.score}" aria-hidden="true"></canvas><figcaption>${esc(lead.name)}: ${lead.score} in 100</figcaption></figure>
      <p class="kick"><span class="stamp">Made up</span> ${esc(x.label)}, ${esc(x.sizeBand)}</p>
      <h3>${esc(h)}</h3><p>${esc(d)}</p></article>`;
  };
  const nl = example("newsletter"), st = example("stream"), pd = example("podcast"), pf = example("portfolio");
  const reachOf = (x) => x.result.parts.find((p) => p.key === "reach").score;
  const out = [];
  if (nl.card.sizeUp) out.push(story("newsletter", `${nl.name} moves up a size.`, `From ${nl.card.sizeUp.from} to ${nl.card.sizeUp.to} ${SPECS.substack.audienceNoun}. Against its new rivals, it beats ${reachOf(nl)} in 100 on reach.`));
  if (st.card.personalBest) out.push(story("stream", `${st.name} breaks its own record.`, `Its ${st.card.personalBest.label}: ${st.card.personalBest.value}, up from ${st.card.personalBest.previous}. Rated ${st.signed}, ${st.band}.`));
  const mult = (pd.best.match(/([\d.]+)×/) || [])[1];
  if (mult) out.push(story("podcast", `One episode of ${pd.name} did ${mult}× a typical one.`, `The show is rated ${pd.signed}, ${pd.band}. ${firstSentence(pd, pd.parts[0])}`));
  out.push(story("portfolio", `${pf.name} lands in the middle: ${pf.signed}, ${pf.band}.`, `${firstSentence(pf, pf.parts[0])} Zero is typical, and the middle is where most good work lives.`));
  $("[data-stories]").innerHTML = out.join("");
  $("[data-times-fine]").textContent = `Every story in The Orbe Times is made up, about made-up creators rated live by the Orbe engine. ${BENCHMARK_LINE} Independently calculated by Orbe.`;
  $("[data-times-date]").textContent = "No. 1";
  for (const c of $$("canvas[data-story]")) mountOrb(c, +c.dataset.story / 100, { reduce });
}
times();

/* ---------- the second door: every example, rated live ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  const reach = x.result.parts.find((p) => p.key === "reach").score;
  return `<li><canvas class="orb orb-roll" width="40" height="40" data-roll-p="${reach}" aria-hidden="true"></canvas><span class="rl-s">${esc(span)}<small>${esc(unit)}</small></span><span class="rl-n">${esc(x.name)}<small>${esc(x.label)}</small></span><b class="rl-r">${esc(x.signed)}</b><span class="rl-b">${esc(x.band)}</span></li>`;
}).join("");
for (const c of $$("canvas[data-roll-p]")) mountOrb(c, +c.dataset.rollP / 100, { reduce });

/* ---------- the fees: each moon lit by its own percentage ---------- */
for (const c of $$("canvas[data-fee]")) mountOrb(c, +c.dataset.fee / 100, { reduce, dur: 900 });
/* the dark moon at the close: no figure yet */
const nextOrb = $("[data-next]");
nextOrb.dataset.p = "0";
drawOrb(nextOrb, 0);

/* ---------- the windows open with a hard snap as they arrive ---------- */
if (!reduce && "IntersectionObserver" in window) {
  const wio = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); wio.unobserve(e.target); }
  }, { threshold: 0.15 });
  for (const w of $$(".win, .story, .lead")) wio.observe(w);
} else for (const w of $$(".win, .story, .lead")) w.classList.add("in");

/* ---------- start ---------- */
setKind("channel", { from: "init" });
heroOrbOn = true;
mountOrb(heroOrb, +heroOrb.dataset.p, { reduce, dur: 1600, delay: 200 });
if (!reduce) setTimeout(() => { typeWord(WORD[kind]); }, 1800);
setPaused(paused);

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
for (const s of $$("[data-kind]")) s.addEventListener("change", () => { setKind(s.value); typeWord(WORD[s.value]); setPaused(true); });

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
