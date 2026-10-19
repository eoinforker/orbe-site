/* Orbe r7-f: the sliders. Every number is worked out by the engine on each move:
   the rating engine for size and reach, the market engine for the fees. */
import { rate, rateWorks, fixtureSnapshot, FIXTURE_NOW, SPECS, signed } from "../assets/engine/rating/browser.js";
import { successFee, buyerPremium, TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { example, benchmark, BANDS, BENCHMARK_LINE } from "../assets/r5/examples.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const n0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/* The made-up creators, as examples.js builds them (same fixture, same seed), so the
   sliders start exactly on the example the story tells. */
const MADE = {
  channel: { kind: "youtube", noise: 0.25, audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 },
  newsletter: { kind: "substack", noise: 0.25, audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 },
  stream: { kind: "twitch", noise: 0.25, audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 },
  podcast: { kind: "podcast", noise: 0.25, audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 },
  portfolio: { kind: "photography", noise: 0.25, audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 },
};

/* ---------------------------------------------------------------- size and reach */
const sSize = $("[data-sl-size]"), sReach = $("[data-sl-reach]");
const grid = $("[data-lab-hundred]");
grid.innerHTML = Array.from({ length: 100 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
const cells = [...grid.children];
let kind = "channel", spec, lo, hi, base, bm;
const RMIN = 0.2, RMAX = 4;
const R = 200;
const toLog = (v, a, b) => a * Math.pow(b / a, v / R);
const fromLog = (x, a, b) => Math.round((Math.log(x / a) / Math.log(b / a)) * R);
/* Round a slider's audience to two significant figures, so it reads like a real count. */
const nice = (x) => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / p) * p; };

export function labKind(k) {
  kind = k;
  base = MADE[k];
  spec = SPECS[base.kind];
  bm = benchmark(k);
  const bands = spec.sizeBands;
  lo = Math.max(100, (bands[0].max ?? 1000) / 10);
  hi = (bands[bands.length - 1].min ?? 1e6) * 4;
  const e = example(k);
  const pw = platformWord(base.kind);
  $("[data-lab-who]").textContent = `${e.name}, a made-up ${pw === e.word ? e.word : `${pw} ${e.word}`}.`;
  $("[data-lab-handle]").textContent = e.handle;
  $("[data-lab-peers]").textContent = e.peers;
  $("[data-sl-size-l]").textContent = cap(spec.audienceNoun);
  $("[data-hist-t]").textContent = bm.title;
  $("[data-hist-note]").textContent = `${bm.what} ${BENCHMARK_LINE}`;
  const noun = e.result.detail.workNoun;
  $("[data-sl-reach-l]").textContent = `Reach of a typical ${noun}`;
  $("[data-ups-t]").textContent = `The last 12, ${noun} by ${noun}`;
  $("[data-ups-noun]").textContent = `Each ${noun}`;
  reset();
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const platformWord = (p) => ({ youtube: "YouTube", substack: "Substack", twitch: "Twitch", podcast: "podcast", photography: "photography" })[p] ?? p;

function reset() {
  sSize.value = String(fromLog(base.audience, lo, hi));
  sReach.value = String(fromLog(1, RMIN, RMAX));
  run(true);
}

function run(exact = false) {
  const audience = exact ? base.audience : nice(toLog(+sSize.value, lo, hi));
  const mult = exact ? 1 : toLog(+sReach.value, RMIN, RMAX);
  /* The same uploads at a different size: keep the people reached, change the audience. Then scale the reach. */
  const snap = fixtureSnapshot({ ...base, audience, reach: base.reach * (base.audience / audience) * mult, title: example(kind).name });
  const r = rate(snap, FIXTURE_NOW);
  const reach = r.parts.find((p) => p.key === "reach");
  const part = r.detail.parts.find((p) => p.key === "reach");
  /* A percentile: never "100 in 100", never "0 in 100". */
  const beat = Math.max(1, Math.min(99, reach.score));
  $("[data-sl-size-o]").textContent = n0.format(audience);
  $("[data-sl-size-h]").textContent = `${r.sizeBand} ${spec.audienceNoun}`;
  $("[data-sl-reach-o]").textContent = reach.value;
  $("[data-sl-reach-h]").textContent = `${n0.format(part.measured * audience)} on a typical ${r.detail.workNoun}`;
  sSize.setAttribute("aria-valuetext", `${n0.format(audience)} ${spec.audienceNoun}`);
  sReach.setAttribute("aria-valuetext", reach.value);
  $("[data-lab-n]").textContent = String(beat);
  $("[data-lab-signed]").textContent = signed(r.rating);
  $("[data-lab-band]").textContent = r.band;
  $("[data-lab-bands]").innerHTML = BANDS.map((b) => `<li${b === r.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  cells.forEach((c, i) => { c.classList.toggle("on", i < beat); c.classList.toggle("you", i === beat); });

  /* Chart one: typical reach for each size, yours drawn across it. */
  /* Hard scales that still show the move: the size chart grows to fit yours, the uploads chart is set by typical for your size. */
  const hMax = Math.max(...bm.rows.map((x) => x.value)) * 1.2;
  const yH = Math.max(hMax, part.measured * 1.12);
  const pct = (v, m = yH) => `${Math.min(100, (v / m) * 100).toFixed(2)}%`;
  const fmt = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
  $("[data-hist]").innerHTML = bm.rows.map((row) => `<div class="hb${row.key === r.detail.bandKey ? " mine" : ""}"><span class="hb-v">${fmt(row.value)}</span><i style="height:${pct(row.value)}"></i><span class="hb-l">${row.label}</span></div>`).join("")
    + `<div class="you-line" style="bottom:${pct(part.measured)}"><span>Yours ${fmt(part.measured)}</span></div>`;

  /* Chart two: the last twelve against typical for this size. */
  const typical = bm.rows.find((x) => x.key === r.detail.bandKey)?.value ?? 0;
  const works = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reverse();
  const uMax = typical * 7;
  $("[data-ups]").innerHTML = works.map((w) => { const v = w.multiple * part.measured; return `<i class="${v > typical ? "up" : ""}${v > uMax ? " over" : ""}" style="height:${pct(v, uMax)}"></i>`; }).join("")
    + `<div class="ty-line" style="bottom:${pct(typical, uMax)}"></div>`;
}
let raf = 0;
const onInput = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; run(); }); };
sSize.addEventListener("input", onInput);
sReach.addEventListener("input", onInput);
$("[data-lab-reset]").addEventListener("click", reset);

/* ---------------------------------------------------------------- the money */
const gbp = (pounds) => ({ amount: Math.round(pounds) * 100, currency: "GBP" });
const money = (pence) => formatMoney({ amount: pence, currency: "GBP" });

const sDeal = $("[data-deal]");
const D_LO = 500, D_HI = 100000;
let who = "network";
sDeal.value = String(fromLog(2500, D_LO, D_HI));
function deal() {
  const v = nice(toLog(+sDeal.value, D_LO, D_HI));
  const bps = who === "network" ? TAKE_RATE.sponsorship.networkBps : TAKE_RATE.sponsorship.directBps;
  const fee = Math.round(v * 100 * bps / 10000);
  $("[data-deal-o]").textContent = money(v * 100);
  sDeal.setAttribute("aria-valuetext", money(v * 100));
  const tot = v * 100 + fee;
  $("[data-deal-bar]").innerHTML = `<i class="s-you" style="flex-grow:${v * 100 / tot}"><span>You</span></i><i class="s-fee" style="flex-grow:${fee / tot}"></i>`;
  $("[data-deal-out]").innerHTML = `The brand pays Orbe <b>${money(fee)}</b>, ${bps / 100}% on top. You get <b>${money(v * 100)}</b>, all of it.`;
}
sDeal.addEventListener("input", deal);
for (const b of $$("[data-who]")) b.addEventListener("click", () => {
  who = b.dataset.who;
  for (const x of $$("[data-who]")) x.setAttribute("aria-pressed", String(x === b));
  deal();
});

const sSale = $("[data-sale]");
const S_LO = 25000, S_HI = 8000000;
sSale.value = String(fromLog(220000, S_LO, S_HI));
function sale() {
  const v = nice(toLog(+sSale.value, S_LO, S_HI));
  const price = gbp(v);
  const f = successFee(price);
  const p = buyerPremium(price);
  const tot = price.amount + p.fee.amount;
  const keep = price.amount - f.fee.amount;
  $("[data-sale-o]").textContent = money(price.amount);
  sSale.setAttribute("aria-valuetext", money(price.amount));
  const tiers = f.minimumApplied ? [{ fee: f.fee.amount, rateBps: 0 }] : f.slices;
  $("[data-sale-bar]").innerHTML = `<i class="s-you" style="flex-grow:${keep / tot}"><span>You keep</span></i>`
    + tiers.map((s, i) => `<i class="s-fee s-t${i}" style="flex-grow:${s.fee / tot}"></i>`).join("")
    + `<i class="s-buy" style="flex-grow:${p.fee.amount / tot}"></i>`;
  $("[data-sale-key]").innerHTML = (f.minimumApplied
    ? [`<li><span class="k s-fee s-t0"></span>The £4,000 minimum: ${money(f.fee.amount)}</li>`]
    : f.slices.map((s, i) => `<li><span class="k s-fee s-t${i}"></span>${s.rateBps / 100}% on ${money(s.from)} to ${money(s.to)}: ${money(s.fee)}</li>`))
    .concat(`<li><span class="k s-buy"></span>Buyer's premium, on top: ${money(p.fee.amount)}${p.minimumApplied ? " (the £1,000 minimum)" : ""}</li>`).join("");
  $("[data-sale-out]").innerHTML = `Orbe's fee <b>${money(f.fee.amount)}</b>, ${(f.effectiveRateBps / 100).toFixed(1)}% of the price, from the proceeds. You keep <b>${money(keep)}</b>.`;
}
sSale.addEventListener("input", sale);
deal();
sale();
