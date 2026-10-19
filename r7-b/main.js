/* Orbe r7-b: Orbe OS in Peony. A desktop of windows you can drag, and the dithered orb.
   Every figure on the page comes from the engine at runtime. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { rate, rateWorks, explain, fixtureSnapshot, FIXTURE_NOW, signed as signOf } from "../assets/engine/rating/browser.js";
import { successFee, buyerPremium } from "../assets/engine/market/browser.js";
import { pounds, formatMoney } from "../assets/engine/market/money.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField } from "../fx/halftone.js";
import { buildOrb, drawOrb } from "./orb.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const moving = root.classList.contains("move");
const handleOf = (v) => cleanHandle(v).toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const C = { ink: "#141311", chalk: "#FBFAF6", graphite: "#5D584F" };
const accent = () => css("--accent") || "#6F1726";
const W = () => innerWidth;

/* ---------- maths: the normal curve the engine's priors use ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* ================================================================ the orb
   One device, everywhere: a disc of round dots on a square grid of cells, filled from the bottom
   to a real figure (93 lights 93% of the interior cells), with a two-row Bayer band at the fill line.
   One cell unit per orb: 8px in the hero (6 on phones), 6px in rating.app, 4px for small orbs. */
const SPEC = {
  hero: () => (W() >= 1280 ? [56, 8] : W() >= 768 ? [48, 8] : [40, 6]),
  rating: () => (W() >= 768 ? [28, 6] : [20, 6]),
  post: () => [24, 4],
  you: () => (W() >= 768 ? [26, 6] : [24, 4]),
  yard: () => [16, 4],
  dock: () => (W() >= 768 ? [12, 4] : [10, 4]),
};
const built = new Map();
const orbOf = (n) => built.get(n) ?? (built.set(n, buildOrb(n)), built.get(n));
const orbs = new Map(); /* canvas -> { kind, score, t, raf } */
function paint(cv) {
  const st = orbs.get(cv); if (!st) return;
  const [n, cell] = SPEC[st.kind]();
  drawOrb(cv, orbOf(n), { cell, score: st.score, t: st.t, colours: { body: accent(), rim: C.ink } });
}
function setOrb(cv, kind, score) {
  if (!cv) return;
  const st = orbs.get(cv) ?? { kind, score, t: moving ? 0 : 1, raf: 0, risen: !moving };
  st.kind = kind; st.score = score;
  orbs.set(cv, st);
  paint(cv);
}
/* The fill rises once, linear, from empty to the figure: the fill is the data, so it rises at an even rate. */
function rise(cv, delay = 0) {
  const st = orbs.get(cv); if (!st || st.risen) return;
  st.risen = true;
  if (!moving) { st.t = 1; paint(cv); return; }
  const start = performance.now() + delay;
  const step = (now) => {
    st.t = Math.max(0, Math.min(1, (now - start) / 900));
    paint(cv);
    st.raf = st.t < 1 ? requestAnimationFrame(step) : 0;
  };
  st.raf = requestAnimationFrame(step);
}
function redrawOrbs() { for (const cv of orbs.keys()) paint(cv); }

/* ================================================================ binding the story */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const WORK = { channel: "upload", newsletter: "issue", stream: "stream", podcast: "episode", portfolio: "photo set" };
const DOCK = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const leadOf = (k) => example(k).result.parts.find((p) => p.key === leadKey(k));
function firstSentence(text, key) {
  const ss = text.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [text];
  const hit = ss.find((x) => (key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
const partsFor = (k, r) => (k === "newsletter" ? ["conversion", "engagement", "growth"] : example(k).parts.map((p) => p.key)).map((key) => r.parts.find((p) => p.key === key)).filter(Boolean);
const partsHTML = (parts) => parts.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.value)}</td><td class="fig">${p.score}</td></tr>`).join("");
const bandsHTML = (band) => BANDS.map((b) => `<li${b === band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");

let kind = "channel";
let said = "";
function setKind(k) {
  kind = k;
  const e = example(k);
  const lead = leadOf(k);
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  const ratingP = Math.round(phi(e.rating) * 100);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    name: e.name, handle: e.handle, lead: String(lead.score), peers: e.peers, leadName: lead.name.toLowerCase(),
    signed: e.signed, band: e.band, work: WORK[k],
    partOf: `${lead.name}, one of ${count} parts.`,
    orbline: `The orb is filled to ${lead.score}%.`,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`, line: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";

  const hero = $('[data-orb="hero"]');
  hero.setAttribute("aria-label", `An orb filled to ${lead.score} in 100: ${e.name} beats ${lead.score} in 100 ${e.peers} its size on ${lead.name.toLowerCase()}.`);
  setOrb(hero, "hero", lead.score);
  setOrb($('[data-orb="post"]'), "post", ratingP);

  /* the last twelve, and the best of them */
  const [bh, ...bt] = e.best.split(": ");
  $("[data-best-h]").textContent = bt.length ? `${bh}:` : e.best;
  $("[data-best-t]").textContent = bt.join(": ");
  $("[data-works-key]").textContent = `Each cell is one ${WORK[k]}, oldest first, against its own typical. Denser is better; the solid cell is the best.`;

  setRating(e, { rating: e.rating, band: e.band, signed: e.signed, parts: partsFor(k, e.result) });
  setYard(k);
  setLive(k);
  setWorks(k);
}

/* ================================================================ rating.app: orb, the bell row, the bands, the parts */
let bell = null, bellRating = 0;
function setRating(e, r) {
  const p = Math.round(phi(r.rating) * 100);
  $('[data-out="signed"]').textContent = r.signed;
  $('[data-out="band"]').textContent = r.band;
  $('[data-out="where"]').textContent = `The orb is filled to ${p}%: where ${r.signed} sits among ${e.peers} this size.`;
  $("[data-bands]").innerHTML = bandsHTML(r.band);
  $("[data-parts]").innerHTML = partsHTML(r.parts);
  setOrb($('[data-orb="rating"]'), "rating", p);
  bellRating = r.rating;
  if (bell) bell.draw();
}
function makeBell() {
  const cv = $("[data-bell]");
  const mineOf = () => Math.max(0, Math.min(11, Math.floor((bellRating + 3) / 0.5)));
  bell = createField(cv, {
    cols: 12, rows: 1,
    look: (c) => {
      if (c === mineOf()) return { base: accent(), ink: accent(), from: 1, to: 1 };
      const z = -3 + (c + 0.5) * 0.5;
      const d = 0.86 * Math.exp(-(z * z) / 2);
      return { base: C.chalk, ink: C.ink, pitch: Math.max(4, (bell?.cell ?? 48) * 0.14), angle: 45, dir: 270, from: d, to: d * 0.45 };
    },
  });
  const fit = () => $("[data-axis]").style.setProperty("--fw", cv.style.width);
  new ResizeObserver(fit).observe(cv);
  fit();
}

/* ================================================================ three yardsticks, as windows */
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
let yardSeen = false, yardTimers = [];
let sz = null, szField = null;
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
  const rows = [[first, false], [last, false], [mine, true]];
  const box = $("[data-yard]");
  box.setAttribute("aria-label", `One ${e.word}'s ${part.name.toLowerCase()}, against three sizes of ${e.peers}`);
  box.setAttribute("role", "group");
  box.innerHTML = rows.map(([row, m], i) => {
    const n = beats(row);
    const unfair = !m && banded;
    const control = unfair
      ? `<button type="button" class="tb-close" data-l="${esc(row.label)}" aria-label="Close the ${esc(row.label)} yardstick" aria-expanded="true"></button>`
      : '<span class="tb-box" aria-hidden="true"></span>';
    return `<div class="win yw${m ? " mine" : ""}${unfair ? " unfair" : ""}" data-win>
      <div class="tb" data-tb>${control}<span class="tb-t"><span class="tb-w">yardstick ${i + 1}</span><span class="tb-shut">${esc(row.label)}: ${n}</span></span><span class="tb-lines" aria-hidden="true"></span><span class="tb-r">${m ? "its size" : unfair ? "not fair" : "fair"}</span></div>
      <div class="ybody"><div class="yb"><div class="yb-in">
        <canvas class="orb" aria-hidden="true"></canvas>
        <div class="y-txt"><p class="y-k">${m ? `Its size, ${esc(row.label)}` : `Against ${esc(row.label)}`}. ${esc(part.name)}, beats in 100.</p>
        <p class="y-say"><span class="y-w">${say(n, m || !banded)}</span></p></div>
        <p class="y-n">${n}</p>
      </div></div></div>
    </div>`;
  }).join("");
  $$(".yw", box).forEach((w, i) => { const cv = $("canvas", w); const st = { kind: "yard", score: beats(rows[i][0]), t: 1, risen: true }; orbs.set(cv, st); paint(cv); });
  for (const b of $$(".tb-close", box)) b.addEventListener("click", () => {
    const w = b.closest(".yw");
    const shut = !w.classList.contains("closed");
    w.classList.toggle("closed", shut);
    w.classList.add("struck");
    b.setAttribute("aria-expanded", String(!shut));
    b.setAttribute("aria-label", `${shut ? "Reopen" : "Close"} the ${b.dataset.l} yardstick`);
  });
  for (const w of $$(".yw", box)) bindDrag(w);

  $("[data-yard-why]").textContent = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}.`
    : "Size does not move paid conversion.";
  $("[data-yard-h]").innerHTML = banded ? "Neither<br> is fair." : "Every yardstick<br> is fair here.";

  sz = { rows: bm.rows, n: bm.rows.map(beats), mine: bm.rows.indexOf(mine), banded, part: part.name };
  renderSizes();
  if (yardSeen) runYard();
}
function runYard() {
  yardTimers.forEach(clearTimeout); yardTimers = [];
  const ws = $$(".yw");
  const unfair = ws.filter((w) => w.classList.contains("unfair"));
  const mine = ws.find((w) => w.classList.contains("mine"));
  const shut = (w) => { w.classList.add("closed"); const b = $(".tb-close", w); if (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", `Reopen the ${b.dataset.l} yardstick`); } };
  if (!moving) { unfair.forEach((w) => { w.classList.add("struck"); shut(w); }); mine?.classList.add("fair"); return; }
  const at = (ms, f) => yardTimers.push(setTimeout(f, ms));
  at(0, () => unfair.forEach((w) => w.classList.add("struck")));
  at(1000, () => unfair.forEach(shut));
  at(1100, () => mine?.classList.add("fair"));
}

/* sizes.chart: the same work against every size; one row per size, ten cells to a row, each cell ten */
const szIn = $("[data-sz]");
function renderSizes() {
  if (!sz) return;
  szIn.max = String(sz.rows.length - 1);
  szIn.value = String(sz.mine);
  $("[data-sz-k]").textContent = `${sz.part}, at every size:`;
  $("[data-sz-l]").innerHTML = sz.rows.map((r, j) => `<span${j === sz.mine ? ' class="on"' : ""}>${esc(r.label)}</span>`).join("");
  const cv = $("[data-sz-field]");
  if (szField) szField.destroy();
  szField = createField(cv, {
    cols: 10, rows: sz.rows.length, gap: 2,
    look: (c, r) => {
      const n = sz.n[r], full = Math.floor(n / 10), rem = (n % 10) / 10;
      /* its own size in solid accent; the other sizes in a mid Ink screen, so the fair row leads */
      if (r === sz.mine) {
        if (c < full) return { base: accent(), ink: accent(), from: 1, to: 1 };
        if (c === full && rem > 0) return { base: C.chalk, ink: accent(), pitch: 4, angle: 45, from: rem, to: rem };
      } else {
        if (c < full) return { base: C.chalk, ink: C.ink, pitch: 4, angle: 45, from: 0.6, to: 0.6 };
        if (c === full && rem > 0) return { base: C.chalk, ink: C.ink, pitch: 4, angle: 45, from: 0.6 * rem, to: 0.6 * rem };
      }
      return { base: C.chalk, ink: C.ink, pitch: 4, angle: 45, from: 0.05, to: 0.05 };
    },
  });
  cv.setAttribute("aria-label", `${sz.part}, beats in 100, against each size: ${sz.rows.map((r, j) => `${r.label} ${sz.n[j]}`).join(", ")}.`);
  const fit = () => $("[data-sz-l]").style.setProperty("--cell", `${szField.cell}px`);
  fit();
  new ResizeObserver(fit).observe(cv);
  pickSize();
}
function pickSize() {
  const j = +szIn.value;
  const r = sz.rows[j], n = sz.n[j];
  $$("[data-sz-l] span").forEach((s, i) => s.classList.toggle("on", i === j));
  const tail = !sz.banded ? "Size does not move this part, so every size reads the same." : j === sz.mine ? "Its own size: the fair yardstick." : `${say(n)} Not a fair comparison.`;
  $("[data-sz-out]").innerHTML = `<b>${j === sz.mine ? `Its size, ${esc(r.label)}` : `Against ${esc(r.label)}`}: beats ${n} in 100.</b> ${tail}`;
  szIn.setAttribute("aria-valuetext", `${r.label}: beats ${n} in 100`);
  szIn.style.setProperty("--p", `${(j / Math.max(1, sz.rows.length - 1)) * 100}%`);
}
szIn.addEventListener("input", pickSize);

/* ================================================================ live: drag a typical upload's reach and the engine rates it again */
const MADE = {
  channel: { kind: "youtube", title: "Field Recordings", o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 } },
  newsletter: { kind: "substack", title: "Margin Notes", o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 } },
  stream: { kind: "twitch", title: "Night Shift", o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 } },
  podcast: { kind: "podcast", title: "The Long Table", o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 } },
  portfolio: { kind: "photography", title: "Low Tide Prints", o: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 } },
};
const snapFor = (k, mult = 1) => { const m = MADE[k]; return fixtureSnapshot({ kind: m.kind, noise: 0.25, ...m.o, reach: m.o.reach * mult, title: m.title }); };
const reachIn = $("[data-reach]");
const liveBox = $("[data-live]");
let liveOK = false;
function setLive(k) {
  const e = example(k);
  /* the fixture must rebuild the very creator examples.js rates; if it ever drifts, the slider hides */
  liveOK = Math.abs(rate(snapFor(k), FIXTURE_NOW).rating - e.rating) < 1e-9;
  liveBox.hidden = !liveOK;
  reachIn.value = "0";
  reachIn.style.setProperty("--p", "50%");
  $("[data-reach-reset]").hidden = true;
  $("[data-reach-out]").textContent = `${firstSentence(e.explain, leadKey(k))} Drag it and the engine rates it again.`;
  reachIn.setAttribute("aria-valuetext", "its typical reach");
}
let reachRaf = 0;
reachIn.addEventListener("input", () => {
  cancelAnimationFrame(reachRaf);
  reachRaf = requestAnimationFrame(() => {
    if (!liveOK) return;
    const v = +reachIn.value;
    reachIn.style.setProperty("--p", `${(v + 100) / 2}%`);
    const mult = 2 ** (v / 50);
    const e = example(kind);
    const r = rate(snapFor(kind, mult), FIXTURE_NOW);
    const sg = signOf(r.rating);
    setRating(e, { rating: r.rating, band: r.band, signed: sg, parts: partsFor(kind, r) });
    const times = `${mult.toFixed(2)}×`;
    $("[data-reach-out]").innerHTML = `<b>${times} the example's typical reach: rated ${sg}, ${r.band}.</b> ${firstSentence(explain(r), leadKey(kind))}`;
    reachIn.setAttribute("aria-valuetext", `${times} the example's reach, rated ${sg}, ${r.band}`);
    $("[data-reach-reset]").hidden = v === 0;
  });
});
$("[data-reach-reset]").addEventListener("click", () => { reachIn.value = "0"; reachIn.dispatchEvent(new Event("input")); reachIn.focus(); });

/* ================================================================ the last twelve: one cell each, oldest first */
let works = [], best = null, worksField = null, worksTop = 1;
function setWorks(k) {
  works = rateWorks(snapFor(k), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  worksTop = Math.max(...works.map((w) => Math.abs(Math.log2(w.multiple))), 1);
  best = works.reduce((a, w) => (w.multiple > a.multiple ? w : a), works[0]);
  const cv = $("[data-works]");
  cv.setAttribute("aria-label", `The last ${works.length}, oldest first, against its own typical: ${works.map((w) => `${w.multiple.toFixed(1)}×`).join(", ")}.`);
  if (!worksField) {
    worksField = createField(cv, {
      cols: 6, rows: 2, gap: 2,
      look: (c, r) => {
        const w = works[r * 6 + c];
        if (!w) return { base: C.chalk, ink: C.ink, from: 0, to: 0 };
        if (w === best) return { base: accent(), ink: accent(), from: 1, to: 1 };
        const d = Math.max(0.04, Math.min(0.92, 0.5 + 0.45 * (Math.log2(w.multiple) / worksTop)));
        return { base: C.chalk, ink: C.ink, pitch: 5, angle: 45, dir: 270, from: d, to: d };
      },
    });
  } else worksField.draw();
}

/* ================================================================ price.calc: the engine's fee schedule, three tiers on one axis */
const priceIn = $("[data-price-in]");
const TIERS = [[20000, 500000], [500000, 2000000], [2000000, 10000000]];
const priceAt = (t) => { const i = Math.min(2, Math.floor(t / 100)); const [a, b] = TIERS[i]; const p = a + (b - a) * ((t - i * 100) / 100); const step = p < 1e6 ? 10000 : 50000; return Math.round(p / step) * step; };
const money = (n) => formatMoney({ amount: n, currency: "GBP" });
let cells = [];
const DENS = { 800: 0.85, 500: 0.55, 300: 0.3, min: 0.85 };
const tierField = createField($("[data-tier]"), {
  cols: 10, rows: 10,
  look: (c, r) => {
    const k = cells[r * 10 + c];
    /* your share in a closed accent screen, the fee in an Ink screen, denser for a dearer tier */
    if (k === "you") return { base: C.chalk, ink: accent(), pitch: 4, angle: 45, from: 0.82, to: 0.82 };
    const d = DENS[k] ?? 0;
    return { base: C.chalk, ink: C.ink, pitch: 4, angle: 45, from: d, to: d };
  },
});
function setPrice() {
  const t = +priceIn.value;
  priceIn.style.setProperty("--p", `${(t / 300) * 100}%`);
  const p = priceAt(t);
  const price = { amount: pounds(p), currency: "GBP" };
  const f = successFee(price), b = buyerPremium(price);
  const rateTxt = `${+(f.effectiveRateBps / 100).toFixed(2)}%`;
  $("[data-price]").textContent = money(price.amount);
  $("[data-fee]").textContent = `${money(f.fee.amount)}, ${rateTxt}`;
  $("[data-keep]").textContent = money(price.amount - f.fee.amount);
  $("[data-prem]").textContent = money(b.fee.amount);
  $("[data-fee-note]").textContent = f.minimumApplied
    ? "At this price the £4,000 minimum applies. Nothing if it doesn't sell."
    : "Charged on each slice of the price at that slice's rate. Nothing if it doesn't sell.";
  /* whole percentages; any remainder goes to the creator, never to the fee */
  const fee = [];
  if (f.minimumApplied) for (let i = 0; i < Math.floor((f.fee.amount / price.amount) * 100); i++) fee.push("min");
  else {
    const cap = Math.floor((f.fee.amount / price.amount) * 100);
    for (const s of f.slices) for (let i = 0; i < Math.round((s.fee / price.amount) * 100); i++) fee.push(s.rateBps);
    fee.length = Math.min(fee.length, cap);
  }
  cells = Array.from({ length: 100 }, (_, i) => (i < 100 - fee.length ? "you" : fee[i - (100 - fee.length)]));
  tierField.draw();
  $("[data-tier]").setAttribute("aria-label", `Of ${money(price.amount)}, ${100 - fee.length} cells go to you and ${fee.length} are Orbe's fee.`);
  priceIn.setAttribute("aria-valuetext", `${money(price.amount)}: Orbe's fee ${money(f.fee.amount)}`);
}
priceIn.addEventListener("input", setPrice);

/* ================================================================ buyers: every example, by size */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  return `<li><span class="rl-n">${esc(x.name)}</span><b class="rl-r">${esc(x.signed)}</b><span class="rl-s">${esc(x.label)}, ${esc(x.sizeBand)}</span><span class="rl-b">${esc(x.band)}</span></li>`;
}).join("");

/* ================================================================ the dock */
const dock = $("[data-dock]");
dock.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="${k === "channel"}" aria-label="${DOCK[k]}: ${esc(example(k).name)}, beats ${leadOf(k).score} in 100"><canvas aria-hidden="true"></canvas><span class="dk-l">${DOCK[k]}</span></button>`).join("");
$$("[data-tk]").forEach((b) => { const cv = $("canvas", b); orbs.set(cv, { kind: "dock", score: leadOf(b.dataset.tk).score, t: 1, risen: true }); paint(cv); });
dock.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });

/* ================================================================ windows: raise, drag, put back */
let z = 10;
const moved = new Set();
const tidy = $("[data-tidy]");
function bindDrag(w) {
  const tb = $("[data-tb]", w); if (!tb || tb.dataset.bound) return;
  tb.dataset.bound = "1";
  let sx = 0, sy = 0, bx = 0, by = 0, lo = 0, hi = 0, top = 0, bot = 0, id = null;
  w.addEventListener("pointerdown", () => { w.style.zIndex = ++z; });
  tb.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest("button, a") || ev.button > 0) return;
    id = ev.pointerId; tb.setPointerCapture(id);
    sx = ev.clientX; sy = ev.clientY;
    bx = +w.dataset.dx || 0; by = +w.dataset.dy || 0;
    const r = w.getBoundingClientRect();
    const desk = (w.closest("[data-desk]") ?? document.body).getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    lo = bx + (8 - r.left); hi = bx + (vw - 8 - r.right);
    top = by + (desk.top + 8 - r.top); bot = by + (desk.bottom - 8 - r.bottom);
    if (bot < top) bot = top;
    w.classList.remove("homing");
    w.classList.add("dragging");
  });
  tb.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== id) return;
    const dx = Math.round(Math.max(lo, Math.min(hi, bx + ev.clientX - sx)));
    const dy = Math.round(Math.max(top, Math.min(bot, by + ev.clientY - sy)));
    w.dataset.dx = dx; w.dataset.dy = dy;
    w.style.setProperty("--dx", dx + "px"); w.style.setProperty("--dy", dy + "px");
    if (dx || dy) { moved.add(w); tidy.hidden = false; }
  });
  const end = (ev) => { if (ev.pointerId !== id) return; id = null; w.classList.remove("dragging"); };
  tb.addEventListener("pointerup", end); tb.addEventListener("pointercancel", end);
}
function putBack(animate) {
  for (const w of $$("[data-win]")) {
    if (!w.dataset.dx && !w.dataset.dy) continue;
    if (animate && moving) { w.classList.add("homing"); setTimeout(() => w.classList.remove("homing"), 320); }
    delete w.dataset.dx; delete w.dataset.dy; w.style.removeProperty("--dx"); w.style.removeProperty("--dy");
  }
  moved.clear();
  tidy.hidden = true;
}
tidy.addEventListener("click", () => putBack(true));
for (const w of $$("[data-win]")) bindDrag(w);

/* ================================================================ the menu bar gains Paper once the page moves */
const bar = $("[data-nav]");
const onScroll = () => bar.classList.toggle("is-scrolled", scrollY > 16);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ================================================================ scheme */
const swatches = $$(".scheme button");
function setScheme(c) {
  root.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  const tc = $('meta[name="theme-color"]'); if (tc) tc.content = c === "blue" ? "#9EE9FB" : "#F2879E";
  redrawOrbs(); bell?.draw(); szField?.draw(); worksField?.draw(); tierField.draw();
  try { localStorage.setItem("orbe-r7b-scheme", c); } catch {}
  try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
}
swatches.forEach((b) => b.addEventListener("click", () => setScheme(b.dataset.c)));
swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === root.dataset.scheme)));
{ const tc = $('meta[name="theme-color"]'); if (tc && root.dataset.scheme === "blue") tc.content = "#9EE9FB"; }

/* ================================================================ wordmarks */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: false });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ================================================================ start */
makeBell();
setOrb($('[data-orb="you"]'), "you", 0);
setKind("channel");
setPrice();

/* the hero orb rises once, 600ms after first paint; every other orb rises once when 40% in view */
rise($('[data-orb="hero"]'), 600);
const seen = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    const t = e.target;
    if (t.matches("[data-yard]")) { yardSeen = true; runYard(); } else rise(t);
    seen.unobserve(t);
  }
}, { threshold: 0.4 });
for (const s of ["rating", "post"]) seen.observe($(`[data-orb="${s}"]`));
seen.observe($("[data-yard]"));

let lastW = innerWidth;
addEventListener("resize", () => {
  if (Math.abs(innerWidth - lastW) < 40) return;
  lastW = innerWidth;
  putBack(false);
  redrawOrbs();
});
if (document.fonts) document.fonts.ready.then(redrawOrbs);

/* ================================================================ the rating is the post: copy the line */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  try { await navigator.clipboard.writeText(text); out.textContent = "Copied. Paste it under your next post."; }
  catch { out.textContent = text; }
});

/* ================================================================ reserving a handle */
for (const s of $$("[data-kind]")) s.addEventListener("change", () => setKind(s.value));
const handles = $$("[data-handle]");
for (const h of handles) h.addEventListener("input", () => {
  const v = handleOf(h.value);
  for (const m of $$("[data-mirror]")) m.textContent = v || "yourhandle";
});
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid");
    note.classList.remove("is-error");
    input.value = h;
    for (const m of $$("[data-mirror]")) m.textContent = h;
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
