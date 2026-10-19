/* Orbe r7-c, the print shop. Every figure comes from the engine, live.
   One device runs through every panel: a chunky dial you drag, and hard-edged charts the engine
   redraws as you drag it. The size, the views, a sponsorship, a sale: move it, watch it compute. */
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
import { mount as mountStamp, WORLDS, WORLDS_PINK } from "../assets/fx/stamptype.js";
import { mount as mountStickers } from "./stickers.js";

document.documentElement.classList.add("js");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
if (!reduce) document.documentElement.classList.add("moving");
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
function mountPrint(e, lead) {
  const host = $("[data-print]");
  if (stamp) stamp.destroy();
  const mom = e.result.parts.find((p) => p.key === "momentum");
  const [span, unit] = splitSize(e.sizeBand);
  const lines = [
    ["you beat", `${lead.score} in 100`, e.peers, "your size."],
    ["rated", `${e.signed},`, `${e.band}.`, "zero is typical."],
    ["momentum", `${mom.value}:`, `beats ${mom.score}`, "in 100."],
    ["your size:", span, `${unit}.`, "not the charts."],
    ["creators", "never pay.", "we earn when", "money moves."],
  ];
  const base = scheme() === "pink" ? WORLDS_PINK : WORLDS;
  const worlds = lines.map((l, i) => ({ ...base[i % base.length], lines: l }));
  host.setAttribute("aria-label", "A type press printing this creator's numbers on a loop: " + worlds.map((w) => w.lines.join(" ")).join(" / "));
  stamp = mountStamp(host, { worlds, scheme: scheme() });
}

/* ---------- state: one made-up creator, moved by two dials ---------- */
let kind = "channel";
let aud = 412000; // the audience the size dial sets
let vf = 1;       // the views dial: a typical upload's views, as a multiple of its own
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

/* ---------- the pixel field: a hundred creators your size, one square each ---------- */
$("[data-pix]").innerHTML = Array.from({ length: 100 }, (_, i) => `<i style="--d:${Math.floor(i / 10) * 70 + (i % 10) * 10}ms"></i>`).join("");
const pixes = $$("[data-pix] i");
const paintPix = (lead) => pixes.forEach((p, i) => { p.className = i < lead ? "b" : i === lead ? "y" : "a"; });
$("[data-pix-q]").innerHTML = Array.from({ length: 100 }, (_, i) => (i === 56 ? `<i class="y q"><b>?</b></i>` : `<i class="a"></i>`)).join("");

/* ---------- a rating on its own scale: zero in the middle, three either side, the band edges marked ---------- */
const BAND_SPAN = [["Poor", 1], ["Subpar", 1.2], ["Average", 1.6], ["Good", 1.2], ["Great", 1]];
function scaleHTML(r) {
  const v = Math.max(-3, Math.min(3, r));
  const left = 50 + (Math.min(0, v) / 3) * 50, w = (Math.abs(v) / 3) * 50;
  const ticks = [-2, -0.8, 0.8, 2].map((t) => `<i class="sc-t" style="left:${50 + (t / 3) * 50}%"></i>`).join("");
  return `<span class="sc-track"></span>${ticks}<span class="sc-bar${v < 0 ? " neg" : ""}" style="left:${left}%;width:${w}%"></span><span class="sc-zero"><b>0</b></span>`;
}

/* ---------- everything the two dials move ---------- */
function render() {
  const e = example(kind);
  const spec = SPECS[e.platform];
  const r = rated();
  const key = leadKey(kind);
  const lead = r.parts.find((p) => p.key === key);
  const sgn = signed(r.rating);
  const [span] = splitSize(r.sizeBand);
  const unit = spec.audienceNoun;

  setText("[data-lead]", String(lead.score));
  setText("[data-ahead]", String(99 - lead.score));
  paintPix(lead.score);
  $("[data-pix]").setAttribute("aria-label", `A hundred ${e.peers} your size, one square each: ${lead.score} you beat, then you, then ${99 - lead.score} ahead.`);
  setText("[data-band-line]", `${cap(e.peers)} ${r.sizeBand} ${unit}.`);
  setText("[data-size-short]", span);
  const audText = `${n0.format(aud)} ${unit}`;
  setText("[data-aud-v]", audText);
  sayDial(audIn, `${audText}: beats ${lead.score} in 100 ${e.peers} ${r.sizeBand}`);
  audDial.fill();

  /* the size histogram: the engine's typical reach for each size, and this creator's reach as a line */
  const bm = benchmark(kind);
  const you = r.detail.parts.find((p) => p.key === "reach")?.measured ?? 0;
  const top = Math.max(...bm.rows.map((x) => x.value), you) * 1.15;
  $("[data-hist-title]").textContent = bm.title;
  $("[data-hist-you]").textContent = `This one: ${pc(you)}`;
  const hist = $("[data-hist]");
  hist.style.setProperty("--you", (you / top) * 100 + "%");
  hist.innerHTML = `<div class="h-cols">${bm.rows.map((x) => `<div class="h-col${x.key === r.detail.bandKey ? " is" : ""}"><span class="h-bar" style="height:${(x.value / top) * 100}%"><b>${pc(x.value)}</b></span></div>`).join("")}<span class="h-you"><b>This one ${pc(you)}</b></span></div>
    <div class="h-labs">${bm.rows.map((x) => `<span class="${x.key === r.detail.bandKey ? "is" : ""}">${x.label}</span>`).join("")}</div>`;
  hist.setAttribute("aria-label", `${bm.title}: ${bm.rows.map((x) => `${x.label}, ${pc(x.value)}`).join("; ")}. This one reaches ${pc(you)}, against ${r.sizeBand}.`);

  /* every part, scored out of 100, as hard bars */
  const maths = mathsFor(kind);
  const w = Object.fromEntries(maths.map((m) => [m.name, m.weight]));
  $("[data-bars]").innerHTML = r.parts.map((p, i) => `<li class="hb${p.key === key ? " lead" : ""}">
    <span class="hb-n"><b>${p.name}</b> <small>${p.value}, ${w[p.name] ?? 0}% of the rating</small></span>
    <span class="hb-t"><span class="hb-b k${i % 4}" style="width:${p.score}%"></span><b class="hb-v">${p.score}</b></span></li>`).join("");
  const count = WORDS[maths.length] ?? String(maths.length);
  setText("[data-weighs]", `The rating weighs all ${count}: ${sgn}, ${r.band}.`);
  $("[data-fact]").textContent = firstSentence(explain(r), key);

  /* the rating and its scale */
  setText("[data-rating]", sgn);
  setText("[data-band]", r.band);
  for (const s of $$("[data-scale]")) s.innerHTML = scaleHTML(r.rating);
  $("[data-bands]").innerHTML = BAND_SPAN.map(([b, f]) => `<li style="flex:${f}"${b === r.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  const reachP = r.parts.find((p) => p.key === "reach");
  const vText = `${vf < 1 ? vf.toFixed(2) : vf.toFixed(1)}× its own`;
  setText("[data-views-v]", vText);
  sayDial(viewsIn, `${vText}: rated ${sgn}, ${r.band}`);
  viewsDial.fill();
  $("[data-views-read]").textContent = `Reach ${reachP.value}: beats ${reachP.score} in 100.`;

  said = `My ${e.word} is rated ${sgn}, ${r.band}, against ${e.peers} my size.`;
  setText("[data-said]", `“${said}”`);
}

/* ---------- the yardsticks: one piece of work, three sizes (the same reading of the engine as r6-a and r6-e) ---------- */
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
  $("[data-yard-part]").textContent = `Against ${e.peers}, ${what}`;
  const yard = $("[data-yard]");
  yard.setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  yard.innerHTML = [[first, false], [last, false], [mine, true]].map(([row, m]) => {
    const n = beats(row);
    const fair = m || !banded;
    return `<li class="y${m ? " mine" : ""}${fair ? "" : " wrong"}">
      <p class="y-h"><span class="y-vs">${m ? `Its size, ${row.label}` : `Against ${row.label}`}</span><span class="y-say">${say(n, fair)}${fair ? "" : '<span class="vh"> Not a fair comparison.</span>'}</span></p>
      <div class="y-t"><span class="y-b" style="width:${n}%"></span><b class="y-n">${n}</b></div>
    </li>`;
  }).join("");
  $("[data-yard-why]").innerHTML = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}. <b>Neither is&nbsp;fair.</b>`
    : `Size does not move paid conversion. <b>Every yardstick is fair&nbsp;here.</b>`;
  if (stickers) { stickers.destroy(); stickers = null; }
  $("[data-drag]").hidden = !banded;
  if (!banded) return;
  const host = $("[data-stick]");
  const lis = $$("li", yard);
  const at = (li) => (li.offsetTop + li.offsetHeight * 0.62) / host.clientHeight;
  stickers = mountStickers(host, {
    size: (W) => Math.max(20, Math.min(40, W * 0.068)),
    stickers: [
      { word: say(beats(first)), font: '"Newsreader", Georgia, serif', weight: 700, style: "italic", base: "#EED56A", fill: "#141311", x: 0.56, y: at(lis[0]), rot: -6, from: "left" },
      { word: say(beats(last)), font: '"Schibsted Grotesk", Arial, sans-serif', weight: 900, style: "normal", base: "#FF5A1F", fill: "#141311", x: 0.52, y: at(lis[1]), rot: 5, from: "right" },
    ],
  });
}

/* ---------- uploads against the creator's own typical ---------- */
function setUploads(k) {
  const e = example(k);
  const works = rateWorks(snapFor(k), FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  const top = Math.max(3, ...works.map((w) => w.multiple)) * 1.1;
  const best = works.reduce((a, w) => (w.multiple > a.multiple ? w : a), works[0]);
  const noun = e.result.detail.workNoun;
  $("[data-ups-title]").textContent = `The last twelve ${noun}s, against its own typical`;
  $("[data-ups-best]").textContent = `Best: ${best.multiple.toFixed(1)}×`;
  const el = $("[data-ups]");
  el.style.setProperty("--one", (1 / top) * 100 + "%");
  el.innerHTML = `<div class="u-cols">${works.map((w) => `<span class="u-col${w.multiple >= 2 ? " hit" : ""}" style="height:${(w.multiple / top) * 100}%"><b>${w.multiple.toFixed(1)}×</b></span>`).join("")}<span class="u-one"><b>1×</b></span></div>`;
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
function renderSpon() {
  const p = gbp(niceSpon(sponDial.to(+sponIn.value)));
  const rows = [["network", "Orbe finds the brand", "15%"], ["direct", "You bring your own", "5%"]].map(([src, name, rateTxt]) => ({ name, rateTxt, f: fundingFor(p, feeTermsFor(src)) }));
  const max = Math.max(...rows.map((x) => x.f.total.amount));
  setText("[data-spon-v]", money(p));
  sayDial(sponIn, `${money(p)}: you get ${money(p)}, the brand pays the fee`);
  sponDial.fill();
  $("[data-spon-chart]").innerHTML = rows.map((x) => `<div class="st-row">
    <p class="st-h"><b>${x.name}</b><span>The brand pays <b>${money(x.f.total)}</b></span></p>
    <div class="st-bar" style="width:${(x.f.total.amount / max) * 100}%"><span class="st-you" style="flex:${x.f.price.amount}"><b>You get ${money(x.f.price)}</b></span><span class="st-fee" style="flex:${x.f.fee.amount}"><b>${x.rateTxt}</b></span></div>
    <p class="st-f">Orbe's fee <b>${money(x.f.fee)}</b>, paid by the brand.</p>
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
    ? `<span class="st-fee" style="flex:${f.fee.amount}"></span>`
    : f.slices.map((s) => `<span class="st-fee" style="flex:${s.fee}"></span>`).join("");
  const how = f.minimumApplied ? "the £4,000 minimum" : f.slices.length > 1 ? `${eff} in all: ${f.slices.map((s) => `${s.rateBps / 100}% of ${pence(s.to - s.from)}`).join(", ")}` : `${eff}`;
  $("[data-sale-chart]").innerHTML = `<div class="st-row">
    <p class="st-h"><b>Sold for ${money(p)}</b><span>The buyer pays <b>${pence(p.amount + b.fee.amount)}</b></span></p>
    <div class="st-bar st-sale"><span class="st-you" style="flex:${keep}"><b>You keep ${pence(keep)}</b></span>${slices}<span class="st-prem" style="flex:${b.fee.amount}"></span></div>
    <ul class="st-key">
      <li><i class="k-fee"></i><span>Orbe's fee <b>${money(f.fee)}</b>, ${how}, from the proceeds.</span></li>
      <li><i class="k-prem"></i><span>Buyer's premium <b>${money(b.fee)}</b>, ${b.minimumApplied ? "the £1,000 minimum" : (b.effectiveRateBps / 100).toFixed(1) + "%"}, on top of the price.</span></li>
    </ul>
  </div>`;
}
sponIn.addEventListener("input", renderSpon);
saleIn.addEventListener("input", () => { salePrice = niceSale(saleDial.to(+saleIn.value)); renderSale(); });
renderSpon();
renderSale();

/* ---------- the second door: every example, rated live, by size ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [span, unit] = splitSize(x.sizeBand);
  return `<li><span class="rl-s">${span}<small>${unit}</small></span><span class="rl-n">${x.name}<small>${x.label}</small></span><div class="scale scale-xs" aria-hidden="true">${scaleHTML(x.rating)}</div><span class="rl-r"><b>${x.signed}</b><small>${x.band}</small></span></li>`;
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
    mountPrint(example(kind), example(kind).result.parts.find((p) => p.key === leadKey(kind)));
  }
}
setColour(scheme(), false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- panels arrive: the pixels print in, the charts rise ---------- */
const seen = new IntersectionObserver((es) => {
  for (const en of es) if (en.isIntersecting) { en.target.classList.add("seen"); seen.unobserve(en.target); }
}, { threshold: 0.25 });
for (const el of $$(".pix-wrap, .chart-size, .chart-parts, .win-ups, .stack")) seen.observe(el);

setKind("channel");

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  const btn = $("[data-copy]");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied"; btn.classList.add("is-done");
    out.textContent = "Paste it under your next post.";
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy the line"; btn.classList.remove("is-done"); }, 2200);
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
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
