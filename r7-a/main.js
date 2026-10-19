/* Orbe r7-a. Every figure comes from the engine via examples.js; the hundred is built from it. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const moving = document.documentElement.classList.contains("move");
const handleOf = (v) => cleanHandle(v).toLowerCase();

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: moving });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- giant type, split into words that stamp in ---------- */
for (const h of $$("[data-words]")) {
  let i = 0;
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) { frag.append(part); return; }
          const s = document.createElement("span");
          s.className = "w"; s.style.setProperty("--i", i++); s.textContent = part;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("vh")) {
        if (n.classList.contains("dot")) { n.classList.add("w"); n.style.setProperty("--i", i++); }
        else walk(n);
      }
    }
  };
  walk(h);
}

/* ---------- maths: the normal curve the engine's priors use ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
/* Acklam's inverse normal, to place a hundred creators at the engine's quantiles. */
function probit(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) return -probit(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const clampScore = (n) => Math.max(1, Math.min(99, Math.round(n)));

/* ---------- the hundred, as a field: one square per creator your size ---------- */
const hundredEl = $("[data-hundred]");
function drawHundred(score) {
  const s = clampScore(score);
  let html = "";
  for (let p = 0; p < 100; p++) {
    const row = Math.floor(p / 10), col = p % 10;
    const n = (9 - row) * 10 + col; /* rank: bottom left is the lowest */
    const cls = n < s ? "b" : n === s ? "y" : "u";
    html += `<i class="${cls}" style="--k:${n}"></i>`;
  }
  hundredEl.innerHTML = html;
  $("[data-hundred-hero]").innerHTML = html;
}

/* ---------- the hundred, as the size band: the engine's prior, a hundred quantiles ---------- */
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const pct = (v) => (v >= 0.1 ? Math.round(v * 100) : v >= 0.01 ? (v * 100).toFixed(1) : (v * 100).toFixed(2)) + "%";
function drawHist(k) {
  const e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const median = typeof prior.median === "object" ? prior.median[e.result.detail.bandKey] : prior.median;
  const own = clampScore(e.result.parts.find((p) => p.key === key).score);
  const part = e.result.parts.find((p) => p.key === key);
  const W = 0.34, B = 7;
  const cols = Array.from({ length: 2 * B + 1 }, () => []);
  for (let i = 0; i < 100; i++) {
    const z = probit((i + 0.5) / 100);
    const b = Math.max(-B, Math.min(B, Math.round(z / W)));
    cols[b + B].push(i);
  }
  const hist = $("[data-hist]");
  hist.innerHTML = cols.map((c) => `<span class="col">${c.map((i) => `<i class="${i < own ? "b" : i === own ? "y" : "u"}" style="--k:${i}"></i>`).join("")}</span>`).join("")
    + `<span class="zero" style="left:50%"><b>Typical: zero</b></span>`;
  const fmt = key === "reach" ? pct : (v) => (v * 1000).toFixed(2);
  const lowV = median * Math.exp(prior.sigma * -B * W), highV = median * Math.exp(prior.sigma * B * W);
  $("[data-axis]").innerHTML = `<span>${fmt(lowV)}</span><span>${fmt(median)}</span><span>${fmt(highV)}</span>`;
  hist.setAttribute("aria-label", `A hundred ${e.peers} your size, spread by ${part.name.toLowerCase()} from the engine's typical for the size. ${e.name} beats ${own} of them.`);
  const unit = key === "reach" ? `${part.name.toLowerCase()}, as a share of ${spec.audienceNoun}` : `new paying subscribers per 1,000 recipients`;
  $("[data-hist-cap]").textContent = `Each square is one of a hundred ${e.peers} with ${e.sizeBand}, placed by ${unit}. Ember is ${e.name}.`;
}

/* ---------- the rating, in squares ---------- */
const GLYPH = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "+": ["000", "000", "010", "111", "010", "000", "000"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
};
function drawPixnum(text) {
  const el = $("[data-pixnum]");
  let k = 0;
  el.innerHTML = [...text.replace("−", "-")].map((ch) => {
    const g = GLYPH[ch]; if (!g) return "";
    const cols = g[0].length;
    return `<span class="g" style="--cols:${cols}">${g.flatMap((r) => [...r]).map((b) => `<i class="${b === "1" ? "on" : ""}" style="--k:${b === "1" ? k++ : 0}"></i>`).join("")}</span>`;
  }).join("");
}

/* ---------- the unknown: your hundred is a question mark ---------- */
const Q = ["0001111000", "0011001100", "0110000110", "0000000110", "0000001100", "0000011000", "0000110000", "0000110000", "0000000000", "0000110000"];
$("[data-qfield]").innerHTML = Q.flatMap((r, y) => [...r].map((b, x) => `<i class="${b === "1" ? "q" + (y === 9 ? " qd" : "") : ""}" style="--k:${y * 10 + x}"></i>`)).join("");

/* ---------- scattered squares, the same every visit ---------- */
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const s of $$("[data-scatter]")) {
  const n = +s.dataset.scatter;
  let h = "";
  for (let i = 0; i < 7 * Math.ceil(n / 3); i++) h += `<i class="${rnd() < 0.42 ? "" : "o"}" style="--k:${i * 4}"></i>`;
  s.innerHTML = h;
}

/* ---------- three yardsticks: the smallest, the biggest, and its own size ---------- */
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const rateWin = $(".win-rate");
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
  const beats = (row) => (row.key === bm.example ? own : clampScore(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  const what = part.name.toLowerCase();
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}`;
  $("[data-yard]").setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  $("[data-yard]").innerHTML = [[first], [last], [mine, true]].map(([row, m]) => `<li class="${m ? "mine" : ""}">
    <span class="y-vs">${m ? `Its size<small>${row.label}</small>` : row.label}</span>
    <span class="y-say">${say(beats(row), m || !banded)}${m || !banded ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span>
    <b class="y-n">${beats(row)}</b>
  </li>`).join("");
  rateWin.classList.toggle("flat", !banded);
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
}
function strike() {
  rateWin.classList.remove("struck"); void rateWin.offsetWidth;
  if (!moving) { rateWin.classList.add("struck"); return; }
  setTimeout(() => rateWin.classList.add("struck"), 350);
}

/* ---------- numbers that arrive in hard steps ---------- */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!moving || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now(), dur = 700, fps = 14;
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, Math.floor(((now - t0) / dur) * fps * (dur / 1000)) / (fps * (dur / 1000)));
    el.textContent = sign + (target * (1 - Math.pow(1 - t, 3))).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ---------- every kind can be the example ---------- */
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false">${trayLabel[k]}</button>`).join("");
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
let kind = "channel";
let said = "";
const seen = new Set();
function setKind(k, { replay = true } = {}) {
  kind = k;
  const e = example(k);
  const lead = k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0];
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => e.result.parts.find((p) => p.key === key)) : e.parts;
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, lead: String(lead.score), leadn: String(lead.score), peers: e.peers, fact: firstSentence(e, lead),
    signed: e.signed, band: e.band, partLow: lead.name.toLowerCase(),
    against: `against ${e.peers} its size`,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  $("[data-parts]").innerHTML = parts.map((p) => `<li><b>${p.score}</b><span>${p.name}<small>${p.value}</small></span></li>`).join("");
  hundredEl.setAttribute("aria-label", `A hundred ${e.peers} your size, one square each. ${e.name} beats ${lead.score} of them.`);
  drawHundred(lead.score);
  drawHist(k);
  drawPixnum(e.signed);
  setYard(k);
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
  if (replay) {
    /* re-run what is on screen, with snap */
    for (const el of $$(".hundred-fig, .hist, .pixnum")) if (seen.has(el)) { el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); }
    for (const el of $$("[data-count]")) if (seen.has(el)) countUp(el);
    if (seen.has(rateWin)) strike();
  }
}
/* the press paints first; the hundred re-forms on the next frame */
tray.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tk]");
  if (!b) return;
  for (const x of $$("[data-tk]")) x.setAttribute("aria-pressed", String(x === b));
  requestAnimationFrame(() => setTimeout(() => setKind(b.dataset.tk), 0));
});

/* ---------- the second door: every example, rated live, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k, i) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  const v = Math.min(1, Math.abs(x.rating) / 2.5);
  return `<li><span class="rl-s">${span}<small>${unit}, ${x.label.toLowerCase()}</small></span><b class="rl-r">${x.signed}<small>${x.band}</small></b>
    <span class="rl-bar" aria-hidden="true"><i class="${x.rating < 0 ? "neg" : ""}" style="--v:${v.toFixed(3)};--k:${i}"></i></span>
    <span class="rl-n">${x.name}, ${x.handle}</span></li>`;
}).join("");

setKind("channel", { replay: false });

/* ---------- arrival: everything snaps in once, when it reaches the screen ---------- */
/* strokes start off screen, so the panel they belong to is what is watched */
const targets = [...$$(".panel"), ...$$("[data-words]"), $(".hundred-fig"), $(".hist"), $(".pixnum"), $("[data-qfield]"), $("[data-hundred-hero]"), $(".stair"), $(".roll"), rateWin, ...$$("[data-count]")];
function arrive(el) {
  if (seen.has(el)) return;
  seen.add(el);
  el.classList.add("on");
  if (el.classList.contains("panel")) for (const s of $$(":scope > .stroke, :scope > .scatter", el)) s.classList.add("on");
  if (el.hasAttribute("data-count")) countUp(el);
  if (el === rateWin) strike();
}
if (moving && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((ents) => {
    for (const en of ents) if (en.isIntersecting) { arrive(en.target); io.unobserve(en.target); }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
  for (const t of targets) io.observe(t);
} else {
  for (const t of targets) arrive(t);
  rateWin.classList.add("struck");
}

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  const btn = $("[data-copy]");
  btn.textContent = "Copying";
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    out.textContent = "Paste it under your next post.";
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy the line"; }, 1800);
  } catch { out.textContent = text; }
});

/* ---------- reserving a handle: one handle and one kind, everywhere ---------- */
const handles = $$("[data-handle]");
const mirrors = $$("[data-mirror]");
function syncHandles(src) {
  for (const h of handles) if (h !== src) h.value = src.value;
  const h = handleOf(src.value);
  for (const m of mirrors) m.textContent = h || "yourhandle";
}
for (const h of handles) h.addEventListener("input", () => { syncHandles(h); for (const x of handles) x.removeAttribute("aria-invalid"); });
for (const k of $$("[data-kind]")) k.addEventListener("change", () => requestAnimationFrame(() => setTimeout(() => setKind(k.value), 0)));

for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid"); note.classList.remove("is-error");
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
