/*
  Fair offer check. The fair range is the sponsor engine's own price
  suggestion (site/assets/engine/sponsor, as Sponsorships uses it), with the
  same rate cards and the same example 0.75 pounds per dollar. The verdict,
  counter and reply are this page's reading of that range.

  "Before you post" runs the loop module (./loop, generated from
  product/src/loop) on a made-up creator from assets/r5/examples.js:
  a sealed prediction for the next upload, and a backtest of sealed
  predictions against what the creator's own past uploads did.
  Nothing leaves the browser.
*/
import { shell, $, $$, esc, count, money, store, copyText, copyLabel, day } from "../assets/shell.js";
import { inventoryFromStats, specsForKind, sizeBandFor } from "../../assets/engine/sponsor/browser.js";
import { fixtureSnapshot, SPECS } from "../../assets/engine/rating/browser.js";
import { maturedShare } from "../../assets/engine/rating/measure.js";
import { ORDER, example } from "../../assets/r5/examples.js";
import { predict, verifyChain, isPrediction, HORIZON_DAYS } from "./loop/predict.js";
import { calibrate, MIN_COHORT } from "./loop/calibration.js";
import { outcomeFor, recordReading } from "./loop/outcomes.js";

shell("offer");

const FX = 0.75; // pounds per dollar: the example rate Sponsorships uses, stated on the page
const KEY = "orbe-offer-record";
const DAY = 864e5;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================================================================ the check */
const form = $("[data-form]");
const out = $("[data-out]");
const AUD = { youtube: "Subscribers", substack: "Subscribers", podcast: "Followers", twitch: "Followers" };
const NOUN = { youtube: "upload", substack: "issue", podcast: "episode", twitch: "stream" };

function kindChanged() {
  const kind = form.elements.kind.value;
  const specs = specsForKind(kind);
  const spec = specs[0];
  const what = spec.quantity === "hour" ? "Average viewers per stream" : `${spec.unit[0].toUpperCase()}${spec.unit.slice(1)} at ${spec.priceWindow} days`;
  $("[data-units-label]").textContent = `${what}, recent ${NOUN[kind]}s`;
  $("[data-aud-label]").textContent = AUD[kind];
  $("[data-placement]").innerHTML = specs.map((s) => `<option value="${s.format}">${esc(s.name)}</option>`).join("");
  $("[data-offer-label]").textContent = spec.quantity === "hour" ? "Their offer per hour, in pounds" : "Their offer, in pounds";
}
form.elements.kind.addEventListener("change", kindChanged);
kindChanged();

const parseUnits = (text) => text.split(/[\s,;]+/).map((x) => Number(x.replace(/[^\d.]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
const a = (w) => `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;
const up10 = (pence) => Math.ceil(pence / 1000) * 1000;
const gbp = (amount) => ({ amount, currency: "GBP" });
const fx = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * FX), currency: "GBP" } : null);

/* The fair range for one placement, from the sponsor engine. */
function fairRange({ kind, audience, units, placement }) {
  const { inventory } = inventoryFromStats({ kind, audience, units, price: null, currency: "GBP", fx, rating: null, at: new Date().toISOString() });
  const item = inventory.items.find((i) => i.format === placement) ?? inventory.items[0];
  return { item, s: item?.suggestion };
}

/* low, fair or strong, and what to say back */
function judge(offer, s, placementName, kind) {
  const low = s.low.amount, high = s.high.amount, mid = (low + high) / 2;
  const deliver = `about ${count(s.expected.units)} ${s.expected.unit} at ${s.expected.day} ${s.expected.day === 1 ? "day" : "days"}`;
  const per = s.per === "hour" ? " an hour" : "";
  if (offer < low) {
    const counter = up10(mid);
    return {
      verdict: "low", word: "Low", tag: "bad", counter,
      reason: `${money(gbp(offer))} is ${Math.round((1 - offer / low) * 100)}% under the bottom of your fair range for ${deliver}. Ask for the middle of it.`,
      reply: `Thanks for the offer. My recent ${NOUN[kind]}s deliver ${deliver}, so my rate for ${a(placementName.toLowerCase())} is ${money(gbp(counter))}${per}. Happy to talk through the details and dates.`,
    };
  }
  if (offer > high) {
    return {
      verdict: "strong", word: "Strong", tag: "good", counter: null,
      reason: `Above your fair range for ${deliver}. Take it, and get the deliverables and the payment date in writing.`,
      reply: `Thanks, ${money(gbp(offer))}${per} works for me. Could you confirm the deliverables, any usage rights and the payment date in writing?`,
    };
  }
  if (offer < mid) {
    const counter = up10(mid);
    return {
      verdict: "fair", word: "Fair", tag: "warn", counter,
      reason: `Inside your range for ${deliver}, but in its lower half. The middle is a fair ask.`,
      reply: `Thanks for the offer. For ${deliver}, I'd be glad to do ${a(placementName.toLowerCase())} at ${money(gbp(counter))}${per}. Could you confirm the deliverables and payment date?`,
    };
  }
  return {
    verdict: "fair", word: "Fair", tag: "good", counter: null,
    reason: `In the upper half of your fair range for ${deliver}. Take it, or hold the price and ask for a second placement.`,
    reply: `Thanks, ${money(gbp(offer))}${per} works for me. Could you confirm the deliverables, any usage rights and the payment date in writing?`,
  };
}

/* The range as a line, with the offer marked on it. */
function scale(low, high, offer) {
  const max = Math.max(high * 1.4, offer * 1.1);
  const at = (x) => `${Math.min(100, (x / max) * 100).toFixed(2)}%`;
  return `<div class="scale" role="img" aria-label="Fair range ${esc(money(gbp(low)))} to ${esc(money(gbp(high)))}; the offer is ${esc(money(gbp(offer)))}">
    <span class="scale-band" style="left:${at(low)};width:calc(${at(high)} - ${at(low)})"></span>
    <span class="scale-mark" style="left:${at(offer)}"><span>Offer</span></span>
  </div><div class="scale-ends"><span>£0</span><span>${esc(money(gbp(Math.round(max / 100) * 100)))}</span></div>`;
}

let last = null;
function check(input, sample = false) {
  const { item, s } = fairRange(input);
  if (!s || s.status !== "suggested") {
    last = null;
    out.innerHTML = `<p class="note warn">${esc(s?.reason ?? "No fair range for this placement yet.")}</p>`;
    return;
  }
  const offer = Math.round(input.offer * 100);
  const j = judge(offer, s, item.name, input.kind);
  last = { input, item, s, j, offer };
  out.innerHTML = `<div class="panel stack">
      ${sample ? `<div class="sample"><span><b>A made-up YouTube channel:</b> ${count(input.audience)} subscribers, ${input.units.length} recent uploads, offered ${esc(money(gbp(offer)))}. Shown until you check your own.</span></div>` : ""}
      <div class="verdict-row"><p class="small">This offer is</p><p class="verdict v-${j.verdict}"><span class="tag ${j.tag} tag-l">${j.word}</span></p></div>
      <p class="small">Fair range, ${esc(item.name.toLowerCase())}${s.per === "hour" ? ", an hour" : ""}</p>
      <p class="big num big-m">${esc(money(s.low))} to ${esc(money(s.high))}</p>
      ${scale(s.low.amount, s.high.amount, offer)}
      <p class="small">At ${esc(money(s.cpm.low, { pence: true }))} to ${esc(money(s.cpm.high, { pence: true }))} per 1,000 ${esc(s.expected.unit)}, from a provisional rate card converted at ${FX} pounds per dollar.</p>
    </div>
    <div class="panel stack">
      <p class="label">${j.counter ? `Counter at ${esc(money(gbp(j.counter)))}` : "No counter needed"}</p>
      <p class="small">${esc(j.reason)}</p>
      <div class="copy"><code data-reply>${esc(j.reply)}</code><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-copy>${copyLabel("Copy reply")}</button></div>
      <div class="btns"><button class="ob-btn ob-btn--s" type="button" data-save>${sample ? "Save the example to your record" : "Save this offer to your record"}</button><span class="small" data-saved-say aria-live="polite"></span></div>
    </div>`;
  $("[data-copy]", out).addEventListener("click", (e) => copyText(e.currentTarget, j.reply));
  $("[data-save]", out).addEventListener("click", save);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-err]");
  err.textContent = "";
  const f = form.elements;
  const audience = Number(f.audience.value);
  const units = parseUnits(f.units.value);
  const offer = Number(f.offer.value);
  if (!(audience > 0)) return void (err.textContent = "Add your audience size.");
  if (units.length < 3) return void (err.textContent = "Add at least three works' numbers.");
  if (!(offer > 0)) return void (err.textContent = "Add the brand's offer in pounds.");
  check({ kind: f.kind.value, audience, units, placement: f.placement.value, offer });
  if (innerWidth < 900) out.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
});

const EXAMPLE = { kind: "youtube", audience: 85000, units: "21000, 18000, 25000, 19500, 30000, 17000, 22500", placement: "integration", offer: 400 };
$("[data-example]").addEventListener("click", () => {
  const f = form.elements;
  f.kind.value = EXAMPLE.kind;
  kindChanged();
  f.audience.value = EXAMPLE.audience;
  f.units.value = EXAMPLE.units;
  f.placement.value = EXAMPLE.placement;
  f.offer.value = EXAMPLE.offer;
  form.requestSubmit();
});

/* ================================================================ the record, on this device */
const PLACE = Object.fromEntries(["youtube", "substack", "podcast", "twitch"].flatMap((k) => specsForKind(k).map((s) => [`${k}/${s.format}`, s.name])));
const load = () => (Array.isArray(store.local.json(KEY)) ? store.local.json(KEY) : []);
const keep = (list) => store.local.put(KEY, list);

/* An Outcome-ready entry: the shape product/src/loop/deals.ts records a deal in. */
function save() {
  if (!last) return;
  const { input, s, j, offer } = last;
  const at = new Date().toISOString();
  const entry = {
    id: `dl_local_${Date.now().toString(36)}`,
    kind: input.kind,
    sizeBand: sizeBandFor(input.kind, input.audience),
    category: "",
    placement: input.placement,
    offered: gbp(offer),
    agreed: null,
    deliveredReach: null,
    renewed: null,
    daysToPay: null,
    consent: { scope: "private", grantedAt: at, revokedAt: null },
    recordedAt: at,
    fair: { low: s.low.amount, high: s.high.amount, per: s.per },
    verdict: j.verdict,
  };
  const ok = keep([entry, ...load()].slice(0, 50));
  $("[data-saved-say]", out).textContent = ok ? "Saved on this device." : "This browser is not letting the page save. Nothing was kept.";
  renderSaved();
}

function renderSaved() {
  const list = load();
  const host = $("[data-saved]");
  if (!list.length) {
    host.innerHTML = `<p class="small empty-rec">Nothing saved yet. Check an offer, then save it here.</p>`;
    return;
  }
  host.innerHTML = `<ul class="rec">${list.map((d) => `<li class="rec-row" data-id="${esc(d.id)}">
      <div class="rec-what"><b>${esc(PLACE[`${d.kind}/${d.placement}`] ?? d.placement)}</b><span class="small">${esc(day(d.recordedAt))}, ${esc(d.sizeBand)} band</span></div>
      <div class="rec-num"><span class="small">Offered</span><b>${esc(money(d.offered))}</b></div>
      <div class="rec-num"><span class="small">Fair range</span><span>${esc(money(gbp(d.fair.low)))} to ${esc(money(gbp(d.fair.high)))}</span></div>
      <div class="rec-num"><span class="small">Agreed</span>${d.agreed ? `<b>${esc(money(d.agreed))}</b>` : `<form class="agree" data-agree><label class="sr" for="ag-${esc(d.id)}">Agreed price in pounds</label><input class="ob-input" id="ag-${esc(d.id)}" type="number" min="1" step="1" inputmode="decimal" placeholder="£"><button class="ob-btn ob-btn--light ob-btn--s" type="submit">Add</button></form>`}</div>
      <button class="ob-btn ob-btn--light ob-btn--s rec-rm" type="button" data-rm aria-label="Remove this offer from your record">Remove</button>
    </li>`).join("")}</ul>
    <p class="small">Kept in this browser only, private to you. <span class="chip-say">With the API</span> you could add what the work delivered, whether the brand came back and how long they took to pay, and choose to count it, anonymised, in deal benchmarks.</p>`;
  for (const row of $$(".rec-row", host)) {
    const id = row.dataset.id;
    $("[data-rm]", row).addEventListener("click", () => { keep(load().filter((d) => d.id !== id)); renderSaved(); ($("[data-saved] [data-rm]") ?? $("#rec-h")).focus(); });
    $("[data-agree]", row)?.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = Number(e.currentTarget.querySelector("input").value);
      if (!(v > 0)) return;
      keep(load().map((d) => (d.id === id ? { ...d, agreed: gbp(Math.round(v * 100)) } : d)));
      renderSaved();
    });
  }
}
renderSaved();

/* ================================================================ before you post */
/* The made-up creators of assets/r5/examples.js, rebuilt from the same fixed seeds so their works are to hand. */
const SEEDS = {
  channel: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 },
  newsletter: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 },
  stream: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 },
  podcast: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 },
  portfolio: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 },
};
const creatorSel = $("[data-creator]");
creatorSel.innerHTML = ORDER.map((k) => `<option value="${k}">${esc(example(k).name)} (made up ${esc(example(k).word)})</option>`).join("");

const snapFor = (key) => fixtureSnapshot({ kind: example(key).platform, noise: 0.25, ...SEEDS[key], title: example(key).name });
const metricName = (spec, key) => (spec.metrics.find((m) => m.key === key)?.name ?? key).toLowerCase();

/* A work's metrics as they stood at an earlier moment, using the rating's own maturity curve. */
function rewind(spec, work, nowMs, atMs) {
  const ageNow = (nowMs - Date.parse(work.publishedAt)) / DAY;
  const ageAt = (atMs - Date.parse(work.publishedAt)) / DAY;
  const metrics = {};
  for (const m of spec.metrics) if (m.key in work.metrics) metrics[m.key] = (work.metrics[m.key] / maturedShare(m.maturity, ageNow)) * maturedShare(m.maturity, ageAt);
  return { ...work, metrics };
}

/* Backtest: a sealed prediction before each of twelve past works, from only what came before it, against what it did by day 30. */
function backtest(key) {
  const snap = snapFor(key);
  const spec = SPECS[snap.account.kind];
  const nowMs = Date.now();
  const past = snap.works.filter((w) => (nowMs - Date.parse(w.publishedAt)) / DAY > HORIZON_DAYS + 1).slice(0, 12).reverse();
  const preds = [];
  const outs = [];
  let prev = null;
  for (const w of past) {
    const madeMs = Date.parse(w.publishedAt) - 2 * 36e5;
    const history = snap.works.filter((x) => Date.parse(x.publishedAt) < Date.parse(w.publishedAt)).map((x) => rewind(spec, x, nowMs, madeMs));
    const p = predict({ id: `pr_${key}_${w.id}`, prev, work: { id: w.id, kind: w.kind, durationSec: w.durationSec, releaseAt: w.publishedAt }, creatorId: `made_up_${key}`, accountId: snap.account.id, audience: snap.account.audience, history, now: madeMs });
    if (!isPrediction(p)) continue;
    const m = spec.metrics.find((x) => x.key === p.metric);
    const ageNow = (nowMs - Date.parse(w.publishedAt)) / DAY;
    const actual = Math.round((w.metrics[p.metric] / maturedShare(m?.maturity, ageNow)) * maturedShare(m?.maturity, HORIZON_DAYS));
    const o = recordReading(outcomeFor(p, w.publishedAt), "30d", { value: actual, checkedAt: new Date(Date.parse(w.publishedAt) + (HORIZON_DAYS * 24 + 1) * 36e5).toISOString(), basis: "public" });
    preds.push(p);
    outs.push(o);
    prev = p.seal;
  }
  return { snap, spec, preds, outs };
}

let current = null;
let tampered = false;
const short = (h) => `${h.slice(0, 10)}…`;
const WHERE = { inside: ["Inside", "good"], above: ["Above", "warn"], below: ["Below", "warn"] };

function renderCreator() {
  const key = creatorSel.value;
  const bt = backtest(key);
  const { snap, spec } = bt;
  const ex = example(key);
  const nowIso = new Date().toISOString();
  const next = predict({ id: `pr_${key}_next`, prev: bt.preds.at(-1)?.seal ?? null, work: { id: `${key}_next`, kind: snap.account.kind, durationSec: snap.works[0].durationSec, releaseAt: new Date(Date.now() + DAY).toISOString() }, creatorId: `made_up_${key}`, accountId: snap.account.id, audience: snap.account.audience, history: snap.works, now: nowIso });
  current = { key, bt, next, ex, spec };
  tampered = false;
  const noun = ex.result?.detail?.workNoun ?? "work";
  if (!isPrediction(next)) {
    $("[data-pred]").innerHTML = `<p class="note warn">${esc(next.reason)}</p>`;
  } else {
    const band = spec.sizeBands.find((b) => b.key === next.sizeBand);
    const w = Math.round(next.inputs.ownWeight * 100);
    $("[data-pred]").innerHTML = `<p class="small"><b>${esc(ex.name)}</b>, ${count(snap.account.audience)} ${esc(spec.audienceNoun)}. Predicted ${esc(metricName(spec, next.metric))} for the next ${esc(noun)}, read at ${HORIZON_DAYS} days</p>
      <p class="big num big-m">${count(next.range.p25)} to ${count(next.range.p75)}</p>
      <p class="small">The middle half: about half of ${esc(noun)}s like this should land inside. From ${next.inputs.ownWorks} of its own recent ${esc(noun)}s (${w}% of the weight) and the provisional benchmark for ${esc(spec.peers)} of ${esc((band?.label ?? next.sizeBand).replace(/^(Under|Over)/, (x) => x.toLowerCase()))} ${esc(spec.audienceNoun)}.</p>`;
  }
  $("[data-sealed]").innerHTML = "";
  $("[data-seal]").disabled = !isPrediction(next);
  renderPast();
}

$("[data-seal]").addEventListener("click", () => {
  const p = current?.next;
  if (!p || !isPrediction(p)) return;
  // Re-seal at the moment of the click, so the timestamp is when you pressed it.
  const fresh = predict({ id: p.id, prev: p.prev, work: { id: p.workId, kind: p.kind, durationSec: current.bt.snap.works[0].durationSec, releaseAt: p.releaseAt }, creatorId: p.creatorId, accountId: p.accountId, audience: p.inputs.audience, history: current.bt.snap.works, now: new Date().toISOString() });
  if (!isPrediction(fresh)) return;
  $("[data-sealed]").innerHTML = `<div class="sealbox">
    <p class="label">Sealed ${esc(new Date(fresh.madeAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }))} UTC</p>
    <p class="small">SHA-256 of the prediction, its inputs, model ${esc(fresh.modelVersion)} and the seal before it:</p>
    <code class="hash mono">${esc(fresh.seal)}</code>
    <p class="small">Change one figure and the hash no longer matches. Each seal includes the one before, so a prediction cannot be slipped in later with an earlier date. <span class="chip-say">With the API</span> seals are kept on your record before release, and a brand sees how often you land in range.</p>
  </div>`;
});

function renderPast() {
  const { bt, spec, ex } = current;
  const preds = tampered ? bt.preds.map((p, i) => (i === 5 ? { ...p, range: { ...p.range, p75: Math.round(p.range.p75 * 1.6) } } : p)) : bt.preds;
  const problems = verifyChain(preds);
  const bad = new Set(problems.map((x) => x.id));
  const cal = calibrate(preds, bt.outs);
  const mine = cal.byCreator[0];
  const scoredWhere = (p) => {
    const o = bt.outs.find((x) => x.predictionId === p.id);
    const v = o.readings["30d"].value;
    return { v, where: v < p.range.p25 ? "below" : v > p.range.p75 ? "above" : "inside" };
  };
  const st = mine?.stats;
  $("[data-past]").innerHTML = `<div class="panel stack">
      <div class="sample"><span><b>${esc(ex.name)} is made up.</b> Twelve of its past ${esc(ex.result?.detail?.workNoun ?? "work")}s, each predicted from only the ones before it, then read at ${HORIZON_DAYS} days. Computed on this page from fixed seeds.</span></div>
      ${st ? `<div class="cal">
        <div><span class="small">Landed in range</span><b class="big-s num">${Math.round(st.inside * 100)}%</b><span class="small">a calibrated range holds about 50%</span></div>
        <div><span class="small">Above / below</span><b class="big-s num">${Math.round(st.above * 100)}% / ${Math.round(st.below * 100)}%</b><span class="small">of ${mine.n} sealed predictions</span></div>
        <div><span class="small">Bias</span><b class="big-s num">${st.bias.toFixed(2)}×</b><span class="small">actuals against the range's middle</span></div>
      </div>` : `<p class="note">Calibration shows from ${MIN_COHORT} sealed predictions. ${mine ? `This creator has ${mine.n}.` : ""}</p>`}
      <div class="tbl-wrap"><table class="tbl past"><thead><tr><th scope="col">Sealed</th><th scope="col" class="r">Predicted range</th><th scope="col" class="r">Actual</th><th scope="col">Result</th><th scope="col">Seal</th></tr></thead><tbody>
      ${preds.slice().reverse().slice(0, 8).map((p) => { const s = scoredWhere(p); const w = WHERE[s.where]; return `<tr${bad.has(p.id) ? ' class="is-bad"' : ""}><td class="nw">${esc(day(p.madeAt))}</td><td class="r nw">${count(p.range.p25)} to ${count(p.range.p75)}</td><td class="r nw">${count(s.v)}</td><td><span class="tag ${w[1]}">${w[0]}</span></td><td class="nw"><code class="mono h-s">${esc(short(p.seal))}</code>${bad.has(p.id) ? ' <span class="tag bad">Fails</span>' : ""}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="small">The newest 8 of ${preds.length} shown. Calibration counts all ${preds.length}.</p>
      <p class="small" data-chain>${problems.length ? `<b>Caught.</b> ${esc(problems.map((x) => `The prediction sealed ${day(preds[x.index].madeAt)} ${x.problem === "tampered" ? "no longer matches its hash" : x.problem.replace(/_/g, " ")}`).join(". "))}. Sealing it again would give it a new hash, and the next prediction, which carries the old one, would stop linking.` : `All ${preds.length} seals verify and link in order. Actuals are ${esc(metricName(spec, bt.preds[0]?.metric ?? ""))} at ${HORIZON_DAYS} days.`}</p>
      <div class="btns"><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-tamper aria-pressed="${tampered}">${tampered ? "Put the range back" : "Try widening a past range"}</button></div>
    </div>`;
  $("[data-tamper]").addEventListener("click", () => { tampered = !tampered; renderPast(); $("[data-tamper]").focus(); });
}

creatorSel.addEventListener("change", renderCreator);
renderCreator();

/* The made-up example is checked on load, labelled, until you check your own. */
form.elements.kind.value = EXAMPLE.kind;
kindChanged();
check({ ...EXAMPLE, units: parseUnits(EXAMPLE.units) }, true);
