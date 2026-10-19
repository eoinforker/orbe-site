/* Orbe r7-c, the print shop. Every figure comes from the engine, live.
   A stamp type press prints one creator's numbers onto the Sky. Four dials move the engine:
   the size, the views, a sponsorship and a sale. The wrong verdicts arrive as die-cut stickers
   you can fling off the yardstick. */
import { example, benchmark, ORDER, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { rate, rateWorks, explain, signed, fixtureSnapshot, FIXTURE_NOW } from "../assets/engine/rating/browser.js";
import { scaleSnapshot } from "../assets/engine/rating/fixtures.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { successFee, buyerPremium } from "../assets/engine/market/fees.js";
import { pounds, formatMoney } from "../assets/engine/market/money.js";
import { feeTermsFor, fundingFor } from "../assets/engine/sponsor/fees.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { createField, spread, rng, mix, lerp } from "../fx/halftone.js";
import { mount as mountPress } from "./press.js";
import { mount as mountStickers } from "./stickers.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const still = new URLSearchParams(location.search).has("still");
let reduce = still;
try { reduce = reduce || matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
if (!reduce) document.documentElement.classList.add("moving");
const easeUi = (t) => t * (2 - t);
const handleOf = (v) => cleanHandle(v).toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const scheme = () => (document.documentElement.dataset.scheme === "pink" ? "pink" : "blue");
const setText = (sel, t) => { for (const el of $$(sel)) el.textContent = t; };
const n0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const pc = (x) => { const v = x * 100; return (v < 10 ? v.toFixed(1) : v.toFixed(0)) + "%"; };
const splitSize = (s) => { const m = s.match(/^(.*\d\S*)\s+(\D+)$/); return m ? [m[1], m[2]] : [s, ""]; };
const roundSig = (x, d = 2) => { const p = Math.pow(10, Math.floor(Math.log10(x)) - d + 1); return Math.round(x / p) * p; };
const short = (x) => (x >= 1e6 ? +(x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + "M" : x >= 1e3 ? +(x / 1e3).toFixed(x >= 1e5 ? 0 : 1) + "k" : String(Math.round(x)));
const gbp = (p) => ({ amount: pounds(p), currency: "GBP" });
const money = (m) => formatMoney(m);
const pence = (amount) => formatMoney({ amount, currency: "GBP" });

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const colours = () => ({
  ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", stone: "#A29E95", ember: "#FF5A1F", straw: "#EED56A",
  accent: css("--accent") || "#1F4BFF", field: css("--field") || "#9EE9FB", tint: css("--field-tint") || "#D6F6FD",
});
let C = colours();

/* ---------- the made-up creators, rebuilt from the same fixtures examples.js uses, so a dial can move them ---------- */
const MADE_UP = {
  channel: { kind: "youtube", title: "Field Recordings", o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 } },
  newsletter: { kind: "substack", title: "Margin Notes", o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 } },
  stream: { kind: "twitch", title: "Night Shift", o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 } },
  podcast: { kind: "podcast", title: "The Long Table", o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 } },
  portfolio: { kind: "photography", title: "Low Tide Prints", o: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 } },
};
const SNAP = {};
function snapFor(k) {
  if (SNAP[k]) return SNAP[k];
  const m = MADE_UP[k];
  const s = fixtureSnapshot({ kind: m.kind, noise: 0.25, ...m.o, title: m.title });
  s.account.handle = example(k).handle;
  return (SNAP[k] = s);
}

/* ---------- the dials: a log scale on a native range input, so keys, touch and screen readers all work ---------- */
function logDial(input, lo, hi) {
  return {
    to: (v) => lo * Math.pow(hi / lo, v / 1000),
    from: (x) => Math.round((1000 * Math.log(x / lo)) / Math.log(hi / lo)),
    fill() { input.style.setProperty("--p", input.value / 10 + "%"); },
  };
}
const sayDial = (input, text) => input.setAttribute("aria-valuetext", text);

/* ---------- wordmarks: still ---------- */
mountWordmark($("[data-wordmark]"), { animate: false });
mountWordmark($("[data-wordmark-foot]"), { animate: false });

/* ---------- nav: Paper once the page moves; a sheet on phones ---------- */
const nav = $("[data-nav]");
const onScroll = () => nav.classList.toggle("is-solid", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();
const menu = $("[data-menu]"), sheet = $("[data-sheet]");
const setMenu = (open) => { menu.setAttribute("aria-expanded", String(open)); sheet.hidden = !open; nav.classList.toggle("is-open", open); };
menu.addEventListener("click", () => setMenu(sheet.hidden));
sheet.addEventListener("click", (ev) => { if (ev.target.closest("a")) setMenu(false); });
addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !sheet.hidden) { setMenu(false); menu.focus(); } });

/* ---------- the kinds: whose numbers to print ---------- */
const trayLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photography" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false">${trayLabel[k]}</button>`).join("");

/* ---------- the press: the creator's own numbers, printed once onto the Sky, then parked on the first ---------- */
let press = null;
const pressBtn = $("[data-press-btn]");
function pressWorlds(e, lead) {
  const mom = e.result.parts.find((p) => p.key === "momentum");
  const [span, unit] = splitSize(e.sizeBand);
  const lines = [
    ["you beat", `${lead.score} in 100`, e.peers, "your size."],
    ["rated", `${e.signed},`, `${e.band}.`, "zero is typical."],
    ["momentum", `${mom.value}:`, `beats ${mom.score}`, "in 100."],
    ["your size:", span, `${unit}.`, "not the charts."],
    ["creators", "never pay.", "we earn when", "money moves."],
  ];
  /* bar and ink per print, all from the brand set, every ink at AA or better on its bar */
  const inks = scheme() === "pink"
    ? [["#141311", C.field], ["#F3F0E8", "#141311"], [C.accent, "#FBD9E0"], ["#141311", "#F3F0E8"], [C.straw, "#141311"]]
    : [["#141311", C.field], ["#F3F0E8", "#141311"], [C.accent, "#FBFAF6"], ["#141311", "#F3F0E8"], [C.ember, "#141311"]];
  return lines.map((l, i) => ({ bar: inks[i][0], ink: inks[i][1], lines: l }));
}
function mountPrint(e, lead) {
  const host = $("[data-print]");
  if (press) press.destroy();
  const worlds = pressWorlds(e, lead);
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", "A type press printing this creator's numbers onto the page: " + worlds.map((w) => w.lines.join(" ")).join(" / "));
  press = mountPress(host, {
    worlds, still, bleed: innerWidth < 768 ? 0.06 : 0.14,
    font: getComputedStyle(document.documentElement).getPropertyValue("--sans").trim() || undefined,
    onState: (s) => { pressBtn.textContent = s === "playing" ? "Pause" : s === "paused" ? "Play" : "Print again"; },
  });
}
pressBtn.addEventListener("click", () => { if (press.playing) press.pause(); else press.play(); });

/* ---------- the field: a hundred creators its size, one cell each (the illustration language) ---------- */
const COLS = 10, ROWS = 10;
const rand = rng(93);
const rank = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) rank.push({ c, r, d: Math.hypot(c, ROWS - 1 - r) + rand() * 1.6, dir: [45, 135, 315, 225, 90, 0][Math.floor(rand() * 6)] });
rank.sort((a, b) => a.d - b.d);
const rankOf = new Map(rank.map((x, k) => [x.c + "," + x.r, { k, dir: x.dir }]));
let beaten = 93;
const finFor = (k) => {
  if (k < beaten) {
    const depth = beaten > 1 ? k / (beaten - 1) : 0;
    if (depth < 0.52) return { base: C.accent, ink: C.accent, from: 1, to: 1 };
    if (depth < 0.8) return { base: C.field, ink: C.accent, from: 0.92, to: lerp(0.5, 0.2, (depth - 0.52) / 0.28) };
    return { base: C.tint, ink: C.accent, from: 0.55, to: 0.04 };
  }
  if (k === beaten) return { base: C.ember, ink: C.ember, from: 1, to: 1 };
  return null;
};
let field = null;
const fieldLook = (c, r, p) => {
  const L = rankOf.get(c + "," + r);
  const pitch = (field ? field.cell : 36) * 0.1;
  const idle = { base: C.chalk, ink: C.ink, pitch, angle: 45, dir: L.dir, from: L.k > beaten ? 0.42 : 0.16, to: 0.02 };
  const f = finFor(L.k);
  if (!f || p <= 0) return idle;
  if (p >= 1) return { ...f, pitch, angle: 45, dir: L.dir };
  const q = Math.min(1, p * 2), w = Math.max(0, p * 2 - 1);
  return { base: mix(C.chalk, f.base === f.ink ? (L.k === beaten ? C.ember : C.field) : f.base, q), ink: mix(C.ink, f.ink, q), pitch, angle: 45, dir: L.dir, from: lerp(idle.from * (1 - q), f.from, w), to: lerp(idle.to * (1 - q), f.to, w) };
};
const fieldCanvas = $("[data-field]");
field = createField(fieldCanvas, { cols: COLS, rows: ROWS, look: fieldLook });
const fitBand = () => $("#p-field").style.setProperty("--fw", fieldCanvas.style.width);
fitBand();
new ResizeObserver(fitBand).observe(fieldCanvas.parentElement);
let fieldRun = null, fieldPlayed = reduce;
const fieldSig = new Map();
function settleField() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = rankOf.get(c + "," + r).k <= beaten ? 1 : 0, key = c + "," + r, sig = JSON.stringify(fieldLook(c, r, p));
    if (fieldSig.get(key) === sig && field.get(c, r) === p) continue;
    fieldSig.set(key, sig); field.set(c, r, p);
  }
}
function setBeaten(n, peers, name) {
  beaten = n;
  if (fieldRun) { fieldRun.cancel(); fieldRun = null; }
  if (fieldPlayed) settleField(); else field.draw();
  fieldCanvas.setAttribute("aria-label", `A field of 100 cells, one for every 100 ${peers} its size. ${n} fill in the brand colour, one for each it beats; one orange cell is ${name}; ${99 - n} are ahead.`);
  $("[data-field-cap]").innerHTML = `Beats ${n} in 100: <span>colour spreads through the ${esc(peers)} its size, and stops at ${esc(name)}.</span>`;
}
function playField() {
  fieldPlayed = true;
  field.setAll(0);
  fieldSig.clear();
  const order = rank.slice(0, beaten + 1).map((x) => [x.c, x.r]);
  fieldRun = spread(field, { order, to: 1, duration: 330, stagger: 6, easing: easeUi, reduce });
}

/* the closing field: ninety-nine creators your size in Ink dots, and one Ember cell still to find */
let fieldQ = null;
const qLook = (c, r) => {
  const pitch = (fieldQ ? fieldQ.cell : 36) * 0.1;
  const L = rankOf.get(c + "," + r);
  if (c === 6 && r === 5) return { base: C.chalk, ink: C.ember, pitch, angle: 45, dir: 45, from: 1, to: 0.6 };
  return { base: C.chalk, ink: C.ink, pitch, angle: 45, dir: L.dir, from: 0.16, to: 0.02 };
};
fieldQ = createField($("[data-field-q]"), { cols: COLS, rows: ROWS, look: qLook });

/* ---------- a rating on its own scale: zero in the middle, three either side, the band edges marked ---------- */
const BANDS = ["Poor", "Subpar", "Average", "Good", "Great"];
const EDGES = [-3, -2, -0.8, 0.8, 2, 3];
const at = (v) => ((Math.max(-3, Math.min(3, v)) + 3) / 6) * 100;
function scaleHTML(r) {
  const v = Math.max(-3, Math.min(3, r));
  const left = Math.min(at(0), at(v)), w = Math.abs(at(v) - at(0));
  const ticks = EDGES.slice(1, -1).map((t) => `<i class="sc-t" style="left:${at(t)}%"></i>`).join("");
  return `<span class="sc-track"></span>${ticks}<span class="sc-bar" style="left:${left}%;width:${w}%"></span><span class="sc-zero"></span>`;
}
const miniHTML = (r) => {
  const left = Math.min(at(0), at(r)), w = Math.max(1, Math.abs(at(r) - at(0)));
  return `<div class="mini" aria-hidden="true"><span class="m-t"></span><span class="m-b" style="left:${left}%;width:${w}%"></span><span class="m-z"></span></div>`;
};

/* ---------- state: one made-up creator, moved by two dials ---------- */
let kind = "channel";
let aud = 412000;
let vf = 1;
let said = "";
const audIn = $("[data-aud]"), viewsIn = $("[data-views]");
let audDial = logDial(audIn, 1, 2);
const viewsDial = logDial(viewsIn, 0.25, 4);
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function rated() {
  const base = snapFor(kind);
  const s = vf === 1 ? base : scaleSnapshot(base, vf);
  return rate({ ...s, account: { ...s.account, audience: aud } }, FIXTURE_NOW);
}
function firstSentence(text, key) {
  const ss = text.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [text];
  const hit = ss.find((x) => (key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}

/* ---------- everything the two dials move ---------- */
function render() {
  const e = example(kind);
  const spec = SPECS[e.platform];
  const r = rated();
  const key = leadKey(kind);
  const lead = r.parts.find((p) => p.key === key);
  const sgn = signed(r.rating);
  const unit = spec.audienceNoun;

  setText("[data-lead]", String(lead.score));
  setBeaten(lead.score, e.peers, e.name);
  const band = `${cap(e.peers)} ${r.sizeBand} ${unit}.`;
  setText("[data-band-line]", band);
  const audText = `${n0.format(aud)} ${unit}`;
  setText("[data-aud-v]", audText);
  sayDial(audIn, `${audText}: beats ${lead.score} in 100 ${e.peers} ${r.sizeBand}`);
  audDial.fill();

  /* typical reach for each size, with this creator's reach as a dashed line */
  const bm = benchmark(kind);
  const you = r.detail.parts.find((p) => p.key === "reach")?.measured ?? 0;
  const top = Math.max(...bm.rows.map((x) => x.value), you) * 1.18;
  $("[data-hist-title]").textContent = bm.title.replace(/\.?$/, ".");
  $("[data-hist-sub]").textContent = `This one reaches ${pc(you)}, the dashed line.`;
  const hist = $("[data-hist]");
  hist.style.setProperty("--you", (you / top) * 100 + "%");
  hist.innerHTML = `<div class="h-cols">${bm.rows.map((x) => `<div class="h-col${x.key === r.detail.bandKey ? " is" : ""}"><span class="h-bar" style="height:${(x.value / top) * 100}%"><b>${pc(x.value)}</b></span></div>`).join("")}<span class="h-you" style="--you:${(you / top) * 100}%"></span></div>
    <div class="h-labs">${bm.rows.map((x) => `<span class="${x.key === r.detail.bandKey ? "is" : ""}">${x.label}</span>`).join("")}</div>`;
  hist.setAttribute("aria-label", `${bm.title}: ${bm.rows.map((x) => `${x.label}, ${pc(x.value)}`).join("; ")}. This one reaches ${pc(you)}, against ${r.sizeBand}.`);

  /* every part, scored out of 100 */
  const maths = mathsFor(kind);
  const w = Object.fromEntries(maths.map((m) => [m.name, m.weight]));
  $("[data-bars]").innerHTML = r.parts.map((p) => `<li class="${p.key === key ? "lead" : ""}">
    <p class="p-n">${p.name}<small>${p.value}, ${w[p.name] ?? 0}% of the rating</small></p>
    <span class="p-v" aria-label="beats ${p.score} in 100">${p.score}</span>
    <span class="p-t" aria-hidden="true"><span class="p-b" style="--w:${p.score}%"></span></span></li>`).join("");
  const count = WORDS[maths.length] ?? String(maths.length);
  setText("[data-weighs]", `The rating weighs all ${count}: ${sgn}, ${r.band}.`);
  $("[data-fact]").textContent = firstSentence(explain(r), key);

  /* the rating and its scale */
  setText("[data-rating]", sgn);
  setText("[data-band]", r.band);
  for (const s of $$("[data-scale]")) s.innerHTML = scaleHTML(r.rating);
  $("[data-bands]").innerHTML = BANDS.map((b, i) => `<li style="--a:${at(EDGES[i])}%;--b:${at(EDGES[i + 1])}%"${b === r.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  const reachP = r.parts.find((p) => p.key === "reach");
  const vText = `${vf < 1 ? vf.toFixed(2) : vf.toFixed(1)}× its own`;
  setText("[data-views-v]", vText);
  sayDial(viewsIn, `${vText}: rated ${sgn}, ${r.band}`);
  viewsDial.fill();
  $("[data-views-read]").textContent = `Reach ${reachP.value}: beats ${reachP.score} in 100.`;

  said = `My ${e.word} is rated ${sgn}, ${r.band}, against ${e.peers} my size.`;
  setText("[data-said]", `“${said}”`);
}

/* ---------- the yardsticks: one piece of work, three sizes, the wrong verdicts as stickers ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
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
  $("[data-yard-part]").textContent = `${part.name}, against three sizes of ${e.peers}. Beats, in 100.`;
  const yard = $("[data-yard]");
  yard.setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  yard.innerHTML = [[first, false], [last, false], [mine, true]].map(([row, m]) => {
    const n = beats(row);
    const fair = m || !banded;
    return `<li class="${m ? "mine" : ""}${fair ? "" : " wrong"}">
      <p class="y-h"><span>${m ? `Its own size, ${row.label}` : `Against ${row.label}`}${fair ? "" : `<span class="vh">: ${say(n)} Not a fair comparison.</span>`}</span><b>${n}</b></p>
      <div class="y-t" aria-hidden="true"><span class="y-b" style="--w:${n}%"></span></div>
    </li>`;
  }).join("");
  $("[data-yard-why]").innerHTML = banded
    ? `against small ${esc(e.peers)}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. Neither is fair.`
    : `size does not move paid conversion. Every yardstick is fair here.`;
  if (stickers) { stickers.destroy(); stickers = null; }
  $("[data-drag]").hidden = !banded;
  if (!banded) return;
  const host = $("[data-stick]");
  const lis = $$("li", yard);
  const atRow = (li) => { const t = $(".y-t", li); return (t.offsetTop + 26) / host.clientHeight; };
  stickers = mountStickers(host, {
    still: reduce,
    size: (W) => Math.max(20, Math.min(30, W * 0.068)),
    stickers: [
      { word: say(beats(first)), font: '"Newsreader", Georgia, serif', weight: 500, style: "italic", base: C.straw, fill: "#141311", edge: "#FBFAF6", x: 0.6, y: atRow(lis[0]), rot: -5, from: "left" },
      { word: say(beats(last)), font: '"Schibsted Grotesk", Arial, sans-serif', weight: 600, style: "normal", base: C.ember, fill: "#141311", edge: "#FBFAF6", x: 0.56, y: atRow(lis[1]), rot: 4, from: "right" },
    ],
  });
}

/* ---------- uploads against the creator's own typical ---------- */
function setUploads(k) {
  const e = example(k);
  const works = rateWorks(snapFor(k), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  const top = Math.max(3, ...works.map((w) => w.multiple)) * 1.15;
  const best = works.reduce((a, w) => (w.multiple > a.multiple ? w : a), works[0]);
  const noun = e.result.detail.workNoun;
  $("[data-ups-title]").textContent = `The last twelve ${noun}s,`;
  $("[data-ups-sub]").textContent = `against its own typical. Best: ${best.multiple.toFixed(1)}×.`;
  const el = $("[data-ups]");
  el.innerHTML = `<div class="u-cols">${works.map((w) => `<span class="u-col${w.multiple >= 2 ? " hit" : ""}" style="height:${(w.multiple / top) * 100}%">${w === best ? `<b class="u-best">${w.multiple.toFixed(1)}×</b>` : ""}</span>`).join("")}<span class="u-one" style="--one:${(1 / top) * 100}%"><b>1×</b></span></div>`;
  el.setAttribute("aria-label", `The last twelve ${noun}s as multiples of its own typical, oldest first: ${works.map((w) => w.multiple.toFixed(1) + " times").join(", ")}.`);
}

/* ---------- switching creator ---------- */
function setKind(k) {
  kind = k;
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  const e = example(k);
  const a0 = MADE_UP[k].o.audience;
  audDial = logDial(audIn, a0 * 0.4, a0 * 12);
  aud = a0; vf = 1;
  audIn.value = audDial.from(a0);
  viewsIn.value = viewsDial.from(1);
  $("[data-aud-min]").textContent = short(a0 * 0.4);
  $("[data-aud-max]").textContent = short(a0 * 12);
  const bind = {
    handle: e.handle, peers: e.peers,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), line1: EXAMPLE_LINE, line3: EXAMPLE_LINE,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];
  render();
  setYard(k);
  setUploads(k);
  mountPrint(e, e.result.parts.find((p) => p.key === leadKey(k)));
  for (const s of $$("[data-kind]")) s.value = k;
  for (const p of $$("[data-peers-you]")) p.textContent = e.peers;
  $("[data-copied]").textContent = "";
}
tray.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });
for (const s of $$("[data-kind]")) s.addEventListener("change", () => setKind(s.value));

/* dragging redraws in the same frame: the engine rates a creator in well under a millisecond */
audIn.addEventListener("input", () => { aud = roundSig(audDial.to(+audIn.value), 3); render(); });
viewsIn.addEventListener("input", () => { vf = +viewsDial.to(+viewsIn.value).toFixed(2); render(); });

/* ---------- the money: Orbe's own fee code, on a dragged deal ---------- */
const sponIn = $("[data-spon]"), saleIn = $("[data-sale]");
const sponDial = logDial(sponIn, 500, 100000), saleDial = logDial(saleIn, 25000, 10000000);
sponIn.value = sponDial.from(10000);
saleIn.value = saleDial.from(220000);
const niceSpon = (x) => (x < 10000 ? Math.round(x / 100) * 100 : Math.round(x / 500) * 500);
const niceSale = (x) => (x < 1e6 ? Math.round(x / 5000) * 5000 : Math.round(x / 50000) * 50000);
const key = (cls, colour, text) => `<li><i style="background:${colour}"></i><span>${text}</span></li>`;
function renderSpon() {
  const p = gbp(niceSpon(sponDial.to(+sponIn.value)));
  const rows = [["network", "Orbe finds the brand", "15%"], ["direct", "You bring your own", "5%"]].map(([src, name, rateTxt]) => ({ name, rateTxt, f: fundingFor(p, feeTermsFor(src)) }));
  const max = Math.max(...rows.map((x) => x.f.total.amount));
  setText("[data-spon-v]", money(p));
  sayDial(sponIn, `${money(p)}: you get ${money(p)}, the brand pays the fee`);
  sponDial.fill();
  $("[data-spon-chart]").innerHTML = rows.map((x) => `<div class="s-row">
    <p class="s-h"><span>${x.name}, ${x.rateTxt}</span><span>The brand pays <b>${money(x.f.total)}</b></span></p>
    <div class="s-bar" aria-hidden="true" style="width:${(x.f.total.amount / max) * 100}%"><span class="s-you" style="flex:${x.f.price.amount}"></span><span class="s-fee" style="flex:${x.f.fee.amount}"></span></div>
    <ul class="s-key">${key("", C.chalk, `You get <b>${money(x.f.price)}</b>`)}${key("", C.straw, `Orbe's fee <b>${money(x.f.fee)}</b>, paid by the brand`)}</ul>
  </div>`).join("");
}
let salePrice = 220000;
function renderSale() {
  const p = gbp(salePrice);
  const f = successFee(p), b = buyerPremium(p);
  const keep = p.amount - f.fee.amount;
  setText("[data-sale-v]", money(p));
  sayDial(saleIn, `${money(p)}: Orbe's fee ${money(f.fee)}, you keep ${pence(keep)}, the buyer's premium ${money(b.fee)}`);
  saleDial.fill();
  const eff = (f.effectiveRateBps / 100).toFixed(1) + "%";
  const slices = f.minimumApplied
    ? `<span class="s-fee" style="flex:${f.fee.amount}"></span>`
    : f.slices.map((s) => `<span class="s-fee" style="flex:${s.fee}"></span>`).join("");
  const how = f.minimumApplied ? "the £4,000 minimum" : f.slices.length > 1 ? `${eff} in all: ${f.slices.map((s) => `${s.rateBps / 100}% of ${pence(s.to - s.from)}`).join(", ")}` : `${eff}`;
  $("[data-sale-chart]").innerHTML = `<div class="s-row">
    <p class="s-h"><span>Sold for ${money(p)}</span><span>The buyer pays <b>${pence(p.amount + b.fee.amount)}</b></span></p>
    <div class="s-bar" aria-hidden="true"><span class="s-you" style="flex:${keep}"></span>${slices}<span class="s-prem" style="flex:${b.fee.amount}"></span></div>
    <ul class="s-key">
      ${key("", C.chalk, `You keep <b>${pence(keep)}</b>`)}
      ${key("", C.straw, `Orbe's fee <b>${money(f.fee)}</b>, ${how}, from the proceeds`)}
      ${key("", C.ink, `Buyer's premium <b>${money(b.fee)}</b>, ${b.minimumApplied ? "the £1,000 minimum" : (b.effectiveRateBps / 100).toFixed(1) + "%"}, on top of the price`)}
    </ul>
  </div>`;
}
sponIn.addEventListener("input", () => { settleNow(sponIn); renderSpon(); });
saleIn.addEventListener("input", () => { settleNow(saleIn); salePrice = niceSale(saleDial.to(+saleIn.value)); renderSale(); });
renderSpon();
renderSale();

/* ---------- the second door: every example, rated live, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [span, unit] = splitSize(x.sizeBand);
  return `<tr><td>${span}<small>${unit}</small></td><td>${x.name}<small>${x.label}</small></td><td class="sc">${miniHTML(x.rating)}</td><td class="num"><b>${x.signed}</b><small>${x.band}</small></td></tr>`;
}).join("");

/* ---------- the brand colour ---------- */
const swatches = $$(".swatch button");
function setColour(c, save) {
  document.documentElement.dataset.c = c;
  document.documentElement.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  C = colours();
  if (save) {
    try { localStorage.setItem("orbe-r7c-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
    fieldSig.clear();
    if (fieldPlayed) settleField(); else field.draw();
    fieldQ.draw();
    renderSpon(); renderSale();
    setYard(kind);
    mountPrint(example(kind), example(kind).result.parts.find((p) => p.key === leadKey(kind)));
  }
}
setColour(scheme(), false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- explaining motion: the field spreads and the bars rise once, on entering view ---------- */
const rises = [$("[data-hist]"), $("[data-bars]"), $("[data-ups]"), $("[data-spon-chart]"), $("[data-sale-chart]")];
function settleNow(input) { const box = input.closest(".deal, .ex, .content"); for (const r of rises) if (box && box.contains(r)) r.classList.add("seen", "settled"); }
for (const r of rises) r.classList.add("rise");
audIn.addEventListener("input", () => settleNow(audIn));
viewsIn.addEventListener("input", () => settleNow(viewsIn));
const seen = new IntersectionObserver((es) => {
  for (const en of es) {
    if (!en.isIntersecting) continue;
    seen.unobserve(en.target);
    if (en.target === fieldCanvas) { if (!fieldPlayed) playField(); continue; }
    en.target.classList.add("seen");
    setTimeout(() => en.target.classList.add("settled"), 700);
  }
}, { threshold: 0.4 });
if (reduce) { for (const r of rises) r.classList.add("seen", "settled"); }
else { for (const r of rises) seen.observe(r); seen.observe(fieldCanvas); }

setKind("channel");

/* ---------- the line you post: copy it ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  const btn = $("[data-copy]");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    out.textContent = "Paste it under your next post.";
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy the line"; }, 2200);
  } catch { out.textContent = text; }
});

/* ---------- reserving a handle ---------- */
const handles = $$("[data-handle]");
const mirrors = $$("[data-mirror]");
function syncHandles(src) {
  const h = handleOf(src.value);
  for (const m of mirrors) m.textContent = h || "yourhandle";
}
for (const h of handles) h.addEventListener("input", () => { h.removeAttribute("aria-invalid"); syncHandles(h); });
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-done"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    input.removeAttribute("aria-invalid");
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
