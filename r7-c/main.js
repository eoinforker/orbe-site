/* Orbe r7-c, the print shop. Every figure comes from the engine via examples.js.
   One device runs through every panel: the score stroke, a fat rounded bar whose length is a number.
   In the hero the creator's strokes are thrown across the field; scrolling lands them as score bars. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { mount as mountStamp, WORLDS, WORLDS_PINK } from "../assets/fx/stamptype.js";
import { mount as mountStickers } from "./stickers.js";

document.documentElement.classList.add("js");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
if (!reduce) document.documentElement.classList.add("flying");
const wide = () => innerWidth >= 900;
const handleOf = (v) => cleanHandle(v).toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const scheme = () => (document.documentElement.dataset.scheme === "pink" ? "pink" : "blue");

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- the tray: whose numbers to print ---------- */
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = `<span class="tray-k">Print</span>` + ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false">${trayLabel[k]}</button>`).join("");

/* ---------- the stamp press: the creator's own numbers, printed on a loop ---------- */
let stamp = null;
function printWorlds(e, lead) {
  const mom = e.result.parts.find((p) => p.key === "momentum");
  const [span, unit = ""] = splitSize(e.sizeBand);
  const lines = [
    ["you beat", `${lead.score} in 100`, e.peers, "your size."],
    ["rated", `${e.signed},`, `${e.band}.`, "zero is typical."],
    ["momentum", `${mom.value}:`, `beats ${mom.score}`, "in 100."],
    ["your size:", span, `${unit}.`, "not the charts."],
    ["creators", "never pay.", "we earn when", "money moves."],
  ];
  const base = scheme() === "pink" ? WORLDS_PINK : WORLDS;
  return lines.map((l, i) => ({ ...base[i % base.length], lines: l }));
}
function mountPrint(e, lead) {
  const host = $("[data-print]");
  if (stamp) stamp.destroy();
  host.removeAttribute("aria-label");
  const worlds = printWorlds(e, lead);
  host.setAttribute("aria-label", "A type press printing this creator's numbers on a loop: " + worlds.map((w) => w.lines.join(" ")).join(" / "));
  stamp = mountStamp(host, { worlds, scheme: scheme() });
}
const splitSize = (s) => { const m = s.match(/^(.*\d\S*)\s+(\D+)$/); return m ? [m[1], m[2]] : [s, ""]; };

/* ---------- the score strokes: thrown in the hero, landed as bars ---------- */
const fly = $("[data-fly]");
const barsEl = $("[data-bars]");
const hero = $("[data-hero]");
let flyers = [];
/* Where each stroke is thrown in the hero: centre x as a share of the width, centre y in px, angle. */
const THROW = {
  phone: [[0.42, 112, -13], [0.8, 112, 20], [0.2, 162, 8], [0.62, 160, -5], [0.99, 196, 60], [0.06, 108, -38], [0.5, 138, 17]],
  desk: [[0.34, 158, -7], [0.84, 812, -9], [0.2, 900, 5], [0.54, 920, -5], [0.985, 560, 66], [0.05, 136, -30], [0.66, 118, 9]],
};
function buildStrokes(parts, weights) {
  fly.innerHTML = parts.map((p, i) => `<span class="sk p${i + 1}" data-i="${i}"><b>${p.name} ${p.score}</b></span>`).join("");
  barsEl.innerHTML = parts.map((p, i) => `<li class="bar">
    <p class="bar-h"><b>${p.name}</b> <span class="bar-v">${p.value}</span> <span class="bar-w">${weights[p.name] ?? ""}% of the rating</span></p>
    <div class="bar-slot"><span class="sk sk-bar p${i + 1}" style="--s:${p.score / 100}"><b>${p.name} ${p.score}</b></span></div>
  </li>`).join("");
  flyers = $$(".sk", fly).map((el, i) => ({ el, i, s: parts[i].score / 100 }));
  measure();
}
let poses = [];
function measure() {
  if (!flyers.length) return;
  const main = $("main");
  fly.style.height = main.offsetHeight + "px";
  const sy = scrollY;
  const hr = hero.getBoundingClientRect();
  const W = hr.width, top = hr.top + sy;
  const desk = wide();
  const set = desk ? THROW.desk : THROW.phone;
  const L = desk ? Math.min(620, W * 0.42) : W * 0.8;
  const T = desk ? 54 : 30;
  const slots = $$(".sk-bar", barsEl);
  poses = flyers.map((f, i) => {
    const [cx, cy, r] = set[i % set.length];
    const a = { x: hr.left + cx * W, y: top + cy, r, w: Math.max(T * 1.2, f.s * L), h: T };
    const s = slots[i].getBoundingClientRect();
    const b = { x: s.left + s.width / 2, y: s.top + sy + s.height / 2, r: 0, w: s.width, h: s.height };
    return { a, b };
  });
  const bt = slots[0].getBoundingClientRect().top + sy;
  end = Math.max(60, bt - innerHeight * 0.5);
  paintFly();
}
let end = 1;
const io3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
function paintFly() {
  const n = flyers.length;
  const base = reduce ? 0 : clamp(scrollY / end);
  const lag = 0.05;
  for (const f of flyers) {
    const P = poses[f.i];
    if (!P) continue;
    const t = clamp((base - f.i * lag) / (1 - lag * (n - 1)));
    const e = io3(t);
    const tumble = Math.sin(t * Math.PI) * (f.i % 2 ? 24 : -24);
    const x = P.a.x + (P.b.x - P.a.x) * e;
    const y = P.a.y + (P.b.y - P.a.y) * e;
    const w = P.a.w + (P.b.w - P.a.w) * e;
    const h = P.a.h + (P.b.h - P.a.h) * e;
    const r = P.a.r * (1 - e) + tumble;
    f.el.style.width = w.toFixed(1) + "px";
    f.el.style.height = h.toFixed(1) + "px";
    f.el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${r.toFixed(2)}deg)`;
    f.el.classList.toggle("landed", t >= 1);
  }
  /* reduced motion: the thrown strokes stay in the hero and the bars are drawn in place */
}
let tick = false;
addEventListener("scroll", () => {
  if (reduce || tick) return;
  tick = true;
  requestAnimationFrame(() => { tick = false; paintFly(); });
}, { passive: true });
let rz = 0;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(measure, 120); });
if (document.fonts) document.fonts.ready.then(measure);
new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(measure, 120); }).observe($("main"));

/* ---------- a hundred creators your size, one square each ---------- */
function buildPix(lead) {
  const el = $("[data-pix]");
  let h = "";
  for (let i = 0; i < 100; i++) {
    const c = i < lead ? "b" : i === lead ? "y" : "a";
    h += `<i class="${c}" style="--d:${Math.floor(i / 10) * 90 + (i % 10) * 12}ms"></i>`;
  }
  el.innerHTML = h;
  el.parentElement.classList.remove("run"); void el.offsetWidth;
  if (seenPix) el.parentElement.classList.add("run");
}
let seenPix = false;
function buildPixQ() {
  const el = $("[data-pix-q]");
  let h = "";
  for (let i = 0; i < 100; i++) h += i === 56 ? `<i class="y q"><b>?</b></i>` : `<i class="a" style="--d:${(i % 10) * 40 + Math.floor(i / 10) * 30}ms"></i>`;
  el.innerHTML = h;
}
buildPixQ();

/* ---------- one piece of work, three yardsticks (the same reading of the engine as r6-a and r6-e) ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
let stickers = null;
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
  const rows = [[first, false], [last, false], [mine, true]];
  yard.innerHTML = rows.map(([row, m]) => {
    const n = beats(row);
    const fair = m || !banded;
    return `<li class="y${m ? " mine" : ""}${fair ? "" : " wrong"}">
      <p class="y-h"><span class="y-vs">${m ? `Its size, ${row.label}` : `Against ${row.label}`}</span><span class="y-say">${say(n, fair)}${fair ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span></p>
      <div class="y-slot"><span class="sk ${m ? "c-ember" : "c-ghost"}" style="--s:${n / 100}"><b>${n}</b></span></div>
    </li>`;
  }).join("");
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
  /* The wrong verdicts, as stickers, flung onto their rows. */
  if (stickers) { stickers.destroy(); stickers = null; }
  if (!banded) return;
  const host = $("[data-stick]");
  const lis = $$("li", yard);
  const at = (li) => (li.offsetTop + li.offsetHeight * 0.62) / host.clientHeight;
  stickers = mountStickers(host, {
    size: (W) => Math.max(20, Math.min(40, W * 0.068)),
    stickers: [
      { word: say(beats(first)), font: '"Newsreader", Georgia, serif', weight: 700, style: "italic", base: "#EED56A", fill: "#141311", x: 0.6, y: at(lis[0]), rot: -6, from: "left" },
      { word: say(beats(last)), font: '"Schibsted Grotesk", Arial, sans-serif', weight: 900, style: "normal", base: "#FF5A1F", fill: "#141311", x: 0.56, y: at(lis[1]), rot: 5, from: "right" },
    ],
  });
}

/* ---------- a rating on its own scale: zero in the middle, three either side ---------- */
const axisHTML = (r) => {
  const left = 50 + Math.min(0, r) / 3 * 50, w = Math.abs(r) / 3 * 50;
  return `<span class="ax-track"></span><span class="ax-zero"><b>0</b></span><span class="sk sk-rate c-ember" style="left:${left}%;width:max(var(--t), ${w}%)"></span>`;
};
const BAND_SPAN = [["Poor", 1], ["Subpar", 1.2], ["Average", 1.6], ["Good", 1.2], ["Great", 1]];

/* ---------- the story for one creator ---------- */
let kind = "channel";
let said = "";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
function setKind(k) {
  kind = k;
  const e = example(k);
  const lead = k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0];
  const maths = mathsFor(k);
  const count = WORDS[maths.length] ?? String(maths.length);
  const [span, unit] = splitSize(e.sizeBand);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, lead: String(lead.score), ahead: String(99 - lead.score), peers: e.peers, fact: firstSentence(e, lead),
    signed: e.signed, band: e.band, sizeShort: span,
    sizeLine: `${cap(e.peers)} ${span} ${unit}.`,
    weights: `The weights for ${e.peers}: ${maths.map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line1: EXAMPLE_LINE, line3: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  /* every part of the rating, in the engine's order, with its published weight */
  const weights = Object.fromEntries(maths.map((m) => [m.name, m.weight]));
  const parts = e.result.parts.map(({ name, score, value }) => ({ name, score, value }));
  buildStrokes(parts, weights);
  buildPix(lead.score);
  $(".pix").setAttribute("aria-label", `A hundred ${e.peers} your size, one square each: ${lead.score} you beat, then you, then ${99 - lead.score} ahead.`);
  $("[data-axis]").innerHTML = axisHTML(e.rating);
  $("[data-post-stroke]").outerHTML = `<div class="axis axis-s" data-post-stroke aria-hidden="true">${axisHTML(e.rating)}</div>`;
  $("[data-bands]").innerHTML = BAND_SPAN.map(([b, f]) => `<li style="flex:${f}"${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  setYard(k);
  mountPrint(e, lead);
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  for (const p of $$("[data-peers-you]")) p.textContent = e.peers;
  $("[data-copied]").textContent = "";
  for (const el of $$("[data-count]")) if (el.closest(".seen")) countUp(el);
}
tray.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });
for (const s of $$("[data-kind]")) s.addEventListener("change", () => setKind(s.value));

/* ---------- the second door: every example, rated live, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [span, unit] = splitSize(x.sizeBand);
  return `<li><span class="rl-s">${span}<small>${unit}</small></span><span class="rl-n">${x.name}<small>${x.label}</small></span><div class="axis axis-xs" aria-hidden="true">${axisHTML(x.rating)}</div><span class="rl-r"><b>${x.signed}</b><small>${x.band}</small></span></li>`;
}).join("");

/* ---------- the brand colour ---------- */
const swatches = $$(".swatch button");
function setColour(c, save) {
  document.documentElement.dataset.c = c;
  document.documentElement.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  if (save) {
    try { localStorage.setItem("orbe-r7c-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
    setKind(kind);
  }
}
setColour(scheme(), false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- numbers that arrive: once, from zero ---------- */
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

/* ---------- panels arrive: the pixels print, fees snap out, figures count ---------- */
const seen = new IntersectionObserver((es) => {
  for (const en of es) {
    if (!en.isIntersecting) continue;
    const t = en.target;
    t.classList.add("seen");
    if (t.matches(".pix-wrap")) { seenPix = true; t.classList.add("run"); }
    for (const c of $$("[data-count]", t)) countUp(c);
    seen.unobserve(t);
  }
}, { threshold: 0.35 });
for (const el of $$(".pix-wrap, .fees, .win-zero, .s-stand .beat")) seen.observe(el);

setKind("channel");

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
