/* Selling: the market module's valuation, fees and tail clause (site/assets/engine/market), in the browser. */
import { shell, $, $$, esc, money, bps, pct, day, segmented, nodash, fold, sourcesList } from "../assets/shell.js";
import { valuate, INDICATIVE_LABEL, VALUATION_MODEL_VERSION, TAKE_RATE, TAKE_RATE_LAUNCH, settlement, BUYER_TERMS, tailScenario } from "../../assets/engine/market/browser.js";

shell("selling");
$("[data-live] [data-mv]").textContent = VALUATION_MODEL_VERSION;

/* ---------- valuation ---------- */
const vf = $("[data-val-form]");
const STREAMS = ["ads", "sponsorship", "subscriptions", "memberships", "products", "licensing", "tips", "other"];
const STREAM_NAME = { ads: "Ads", sponsorship: "Sponsorship", subscriptions: "Subscriptions", memberships: "Memberships", products: "Products", licensing: "Licensing", tips: "Tips", other: "Other" };
const streamRow = (v = {}) => `<div class="fields cols3 stream-row" data-stream style="align-items:end">
  <label class="field"><span>Stream</span><select class="input" data-s="stream">${STREAMS.map((s) => `<option value="${s}"${s === v.stream ? " selected" : ""}>${STREAM_NAME[s]}</option>`).join("")}</select></label>
  <label class="field"><span>£ a month</span><input class="input" type="number" min="0" step="10" data-s="amount" value="${esc(v.amount ?? "")}"></label>
  <label class="field"><span>Main payer (optional)</span><input class="input" data-s="who" value="${esc(v.who ?? "")}" placeholder="e.g. a sponsor"></label>
</div>`;
const streamsEl = $("[data-streams]");
streamsEl.innerHTML = streamRow({ stream: "ads" }) + streamRow({ stream: "sponsorship" });
$("[data-add-stream]").addEventListener("click", () => streamsEl.insertAdjacentHTML("beforeend", streamRow({ stream: "other" })));
let mode = "quick";
segmented($("[data-val-mode]"), (v) => { mode = v; $("[data-quick]").classList.toggle("hide", v !== "quick"); $("[data-lines]").classList.toggle("hide", v !== "lines"); });
vf.elements.face.addEventListener("input", () => ($("[data-face-out]").textContent = `${vf.elements.face.value}%`));
/* The made-up example: a YouTube channel with three streams. It is valued on load, labelled, until you value your own. */
const EXAMPLE = { kind: "youtube", months: 24, growth: 18, margin: 62, face: 60, streams: [{ stream: "ads", amount: 6200, who: "" }, { stream: "sponsorship", amount: 3800, who: "Brindle Coffee (made up)" }, { stream: "memberships", amount: 1500 }] };
$("[data-val-example]").addEventListener("click", () => {
  mode = "quick";
  streamsEl.innerHTML = EXAMPLE.streams.map(streamRow).join("");
  vf.elements.kind.value = EXAMPLE.kind;
  vf.elements.months.value = EXAMPLE.months;
  vf.elements.growth.value = EXAMPLE.growth;
  vf.elements.margin.value = EXAMPLE.margin;
  vf.elements.face.value = EXAMPLE.face;
  $("[data-face-out]").textContent = `${EXAMPLE.face}%`;
  vf.requestSubmit();
});

const monthsBack = (n) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n + i, 1)).toISOString().slice(0, 10));
};
function declaredLines() {
  const f = vf.elements;
  if (mode === "lines") {
    return f.lines.value.split(/\n+/).map((l) => l.split(/[,;\t]+/).map((x) => x.trim())).filter((p) => p.length >= 3).map((p) => {
      const m = /^(\d{4})-(\d{1,2})/.exec(p[0]);
      const stream = STREAMS.includes(p[1]?.toLowerCase()) ? p[1].toLowerCase() : "other";
      const amount = Math.round(Number(String(p[2]).replace(/[£,\s]/g, "")) * 100);
      if (!m || !(amount > 0)) return null;
      return { month: `${m[1]}-${m[2].padStart(2, "0")}-01`, gross: { amount, currency: "GBP" }, stream, counterparty: p[3] || undefined };
    }).filter(Boolean);
  }
  const streams = $$("[data-stream]").map((row) => ({ stream: $('[data-s="stream"]', row).value, amount: Number($('[data-s="amount"]', row).value), who: $('[data-s="who"]', row).value }));
  return linesFromStreams(streams, Number(f.months.value), Number(f.growth.value));
}
function linesFromStreams(streams, monthsN, growth) {
  const months = monthsBack(Math.max(3, Math.min(36, monthsN || 12)));
  const g = (growth || 0) / 100;
  const out = [];
  for (const row of streams) {
    const pounds = Number(row.amount);
    if (!(pounds > 0)) continue;
    const stream = row.stream;
    const who = row.who?.trim() || undefined;
    months.forEach((month, i) => {
      const age = months.length - 1 - i;
      const k = age < 12 ? 1 : 1 / (1 + g);
      out.push({ month, gross: { amount: Math.round(pounds * 100 * k), currency: "GBP" }, stream, counterparty: who });
    });
  }
  return out;
}
vf.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-val-err]");
  err.textContent = "";
  const declared = declaredLines();
  if (!declared.length) return void (err.textContent = "Add at least one stream with a monthly amount, or some revenue lines.");
  const f = vf.elements;
  valueIt({ kind: f.kind.value, declared, margin: f.margin.value, face: f.face.value, pasted: mode === "lines" });
  // On a phone the result sits above the form, so bring it into view.
  if (innerWidth < 900) $("[data-val-out]").firstElementChild?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
});
function valueIt({ kind, declared, margin, face, pasted, sample = false }) {
  const err = $("[data-val-err]");
  const input = { kind, revenue: [], declared, costs: { basis: "declared_margin", margin: Math.min(1, Math.max(0.01, Number(margin) / 100)) }, faceDependence: Number(face) / 100 };
  let v, w;
  try {
    v = valuate(input);
    // What if every line were read at source: the same figures, connected.
    const connected = declared.map((d, i) => ({ id: `whatif_${i}`, accountId: "whatif", month: d.month, stream: d.stream, counterparty: d.counterparty, gross: d.gross, provenance: { source: "stripe", accountId: "whatif", checkedAt: new Date().toISOString(), basis: "connected" } }));
    w = valuate({ ...input, revenue: connected, declared: [] });
  } catch (x) {
    return void (err.textContent = nodash(x.message));
  }
  const FACTOR = { base: "Starting multiple", verification: "Verification", diversification: "Spread of streams", face: "Needs you", history: "History", growth: "Growth", concentration: "One big payer", size: "Size" };
  $("[data-val-out]").innerHTML = `<div class="panel stack">
      <p class="small" style="margin:0">${sample ? "A made-up example. " : ""}Indicative. Confidence ${esc(v.confidence)}.</p>
      ${v.range ? `<p class="big num" style="font-size:clamp(40px,9vw,72px)">${esc(money(v.range.low))} to ${esc(money(v.range.high))}</p>
        <p class="small">${v.multiples.low}× to ${v.multiples.high}× a year's profit, centred on ${v.multiples.centre}×.</p>` : `<p class="h2">No range</p>`}
      ${sample ? `<div class="sample"><span><b>A made-up YouTube channel:</b> ads, a sponsor and memberships, £${(EXAMPLE.streams.reduce((t, x) => t + x.amount, 0)).toLocaleString("en-GB")} a month at a ${margin}% margin. Shown until you value your own: enter your revenue and press Value it.</span></div>` : ""}
      <dl class="dl"><dt>Revenue, last twelve months${v.annualised ? " (annualised)" : ""}</dt><dd>${esc(money(v.ttmRevenue))}</dd><dt>Profit</dt><dd>${esc(money(v.ttmProfit))}</dd><dt>Verified share</dt><dd>${pct(v.verifiedShare)}</dd><dt>Growth</dt><dd>${v.growth === null ? "n/a" : pct(v.growth)}</dd><dt>Largest stream</dt><dd>${pct(v.largestStreamShare)}</dd></dl>
      ${fold("Why this range", `${v.reasons.length} reason${v.reasons.length === 1 ? "" : "s"}`, `<ul class="reasons">${v.reasons.map((r) => `<li><span>${esc(nodash(r))}</span></li>`).join("")}</ul>`)}
      ${fold("Sources", "3", sourcesList([
        { kind: "typed", label: `${declared.length} revenue lines, ${sample ? "made up for the example, by stream" : pasted ? "as you pasted them" : "built from your monthly figures by stream"}`, provenance: sample ? "Invented for the example, and declared, so none of it counts as verified." : "Declared by you, so none of it counts as verified. Connected revenue (Stripe, AdSense, checked invoices) replaces it." },
        { kind: "typed", label: `A ${margin}% profit margin and ${face}% reliance on the creator`, provenance: sample ? "Part of the made-up example." : "Your own estimates." },
        { kind: "engine", label: `Orbe's valuation model ${v.modelVersion}`, provenance: "Provisional multiples set from public comparables until Orbe's own completed deals replace them." },
      ]))}
    </div>
    ${fold("What moved the multiple", `${v.factors.length} factors`, `<div class="tbl-wrap"><table class="tbl"><tbody>${v.factors.map((x) => `<tr><td>${esc(FACTOR[x.key] ?? x.key)}</td><td class="r" style="white-space:nowrap">${x.key === "base" ? `${x.effect}×` : `${x.effect >= 0 ? "+" : "\u2212"}${Math.abs(x.effect).toFixed(2)}×`}</td><td class="small">${esc(nodash(x.reason))}</td></tr>`).join("")}</tbody></table></div>`)}
    ${w.range && v.range ? `<div class="panel stack"><h3 class="h3">If it were verified</h3><p>With the same figures read at source, the range would be <b style="font-weight:500">${esc(money(w.range.low))} to ${esc(money(w.range.high))}</b>, confidence ${esc(w.confidence)}. Connecting your revenue sources narrows the range and can lift the centre, because buyers pay for numbers they can trust.</p><p class="small">A what-if on your own figures, not a second valuation.</p></div>` : ""}
    <p class="small">${esc(INDICATIVE_LABEL)} Every multiple is provisional (model ${esc(v.modelVersion)}) until Orbe's own completed deals replace them, and your figures count as declared, not verified.</p>`;
}
valueIt({ kind: EXAMPLE.kind, declared: linesFromStreams(EXAMPLE.streams, EXAMPLE.months, EXAMPLE.growth), margin: EXAMPLE.margin, face: EXAMPLE.face, sample: true });

/* ---------- fees ---------- */
const ff = $("[data-fee-form]");
const sliceRows = (fee) => fee.slices.filter((s) => s.fee > 0).map((s) => `<tr><td>${esc(money({ amount: s.from, currency: "GBP" }))} to ${esc(money({ amount: s.to, currency: "GBP" }))}</td><td class="r">${bps(s.rateBps)}</td><td class="r">${esc(money({ amount: s.fee, currency: "GBP" }))}</td></tr>`).join("");
function fees() {
  const f = ff.elements;
  $("[data-dealno]").classList.toggle("hide", !f.launch.checked);
  const price = { amount: Math.round((Number(f.price.value) || 0) * 100), currency: "GBP" };
  const out = $("[data-fee-out]");
  if (price.amount < 100000) return void (out.innerHTML = `<p class="err">Enter a price of at least £1,000.</p>`);
  const schedule = f.launch.checked ? TAKE_RATE_LAUNCH : TAKE_RATE;
  const partnerFee = { amount: Math.round(price.amount * (Number(f.escrow.value) || 0) / 100), currency: "GBP" };
  let s;
  try {
    s = settlement(price, partnerFee, { schedule: schedule.seller, buyerPremium: schedule.buyerPremium, dealNumber: Number(f.deal.value) || 1, vatRateBps: f.vat.checked ? 2000 : 0 });
  } catch (x) {
    return void (out.innerHTML = `<p class="err">${esc(nodash(x.message))}</p>`);
  }
  const fee = s.successFee;
  const prem = s.buyerPremium;
  out.innerHTML = `<div class="grid two">
      <div class="panel stack"><p class="small">The seller receives</p><p class="big num" style="font-size:40px">${esc(money(s.sellerReceives))}</p><p class="small">The price less Orbe's fee${f.vat.checked ? " and its VAT" : ""} and half the escrow fee.</p></div>
      <div class="panel stack"><p class="small">The buyer pays in</p><p class="big num" style="font-size:40px">${esc(money(s.buyerPays))}</p><p class="small">The price, the buyer's premium${f.vat.checked ? " and its VAT" : ""}, and half the escrow fee.</p></div>
    </div>
    ${fold("The working", `success fee ${esc(money(fee.fee))}${prem ? `, premium ${esc(money(prem.fee))}` : ""}`, `    <div class="stack">
      <h3 class="h3">Seller's success fee: ${esc(money(fee.fee))} (${bps(fee.effectiveRateBps)} effective)</h3>
      ${fee.launchRateApplied ? `<p class="small">Launch rate applied: deal ${Number(f.deal.value)} of the first 20.</p>` : `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Slice of the price</th><th class="r">Rate</th><th class="r">Fee</th></tr></thead><tbody>${sliceRows(fee)}</tbody></table></div>`}
      ${fee.minimumApplied ? `<p class="small">The £4,000 minimum applies.</p>` : ""}
      <p class="small">8% to £500,000, 5% to £2M, 3% above, marginal like income tax so the fee never jumps at a boundary. Paid from the proceeds by the escrow partner.</p>
    </div>
    ${prem ? `<div class="stack"><h3 class="h3">Buyer's premium: ${esc(money(prem.fee))} (${bps(prem.effectiveRateBps)} effective)</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Slice of the price</th><th class="r">Rate</th><th class="r">Premium</th></tr></thead><tbody>${sliceRows(prem)}</tbody></table></div>
      ${prem.minimumApplied ? `<p class="small">The £1,000 minimum applies.</p>` : ""}
      <p class="small">2% to £2M and 1% above, paid by the buyer at completion. Access is free once Orbe has vetted the buyer, and reports are included; a report is charged £1,500 only if the buyer walks away.</p></div>` : ""}
    <div><dl class="dl">
      <dt>Orbe's fee${f.vat.checked ? ` plus VAT ${esc(money(s.feeVat))}` : ""}</dt><dd>${esc(money({ amount: fee.fee.amount + s.feeVat.amount, currency: "GBP" }))}</dd>
      ${prem ? `<dt>Buyer's premium${f.vat.checked ? ` plus VAT ${esc(money(s.premiumVat))}` : ""}</dt><dd>${esc(money({ amount: prem.fee.amount + s.premiumVat.amount, currency: "GBP" }))}</dd>` : ""}
      <dt>Escrow partner's fee, at cost</dt><dd>${esc(money(s.escrow.partnerFee))}</dd>
      <dt class="tot">The partner pays Orbe</dt><dd class="tot">${esc(money(s.orbeReceives))}</dd>
    </dl><p class="small" style="margin-top:10px">The escrow partner holds every pound and pays Orbe only its own fees. VAT treatment for overseas parties needs an accountant's view.</p></div>`)}`;
}
ff.addEventListener("input", fees);
fees();

/* ---------- tail ---------- */
$("[data-tail-months]").textContent = String(TAKE_RATE.tailMonths);
$("[data-terms]").textContent = BUYER_TERMS;
const tf = $("[data-tail-form]");
function tail() {
  const f = tf.elements;
  const out = $("[data-tail-out]");
  if (!f.intro.value || !f.done.value) return void (out.innerHTML = "");
  let r;
  try {
    r = tailScenario({ introducedOn: f.intro.value, completedOn: f.done.value, reportedOn: f.reported.value || f.done.value, price: { amount: Math.round((Number(f.price.value) || 0) * 100), currency: "GBP" }, structure: f.structure.value, introduced: !f.never.checked });
  } catch (x) {
    return void (out.innerHTML = `<p class="err">${esc(nodash(x.message))}</p>`);
  }
  const a = r.assessment;
  $("[data-tail-sum]").textContent = a.owed ? "this one owes the fees" : "this one owes nothing";
  out.innerHTML = `<div class="stack" style="margin-top:6px">
    <p><span class="tag ${a.owed ? "warn" : "good"}">${a.owed ? "Fees owed" : "Nothing owed"}</span>${r.tailEndsAt && !f.never.checked ? ` <span class="small">Tail ends ${esc(day(r.tailEndsAt))}</span>` : ""}</p>
    <ul class="reasons">${a.reasons.map((x) => `<li><span>${esc(nodash(x))}</span></li>`).join("")}</ul>
    ${a.owed ? `<dl class="dl"><dt>Seller's fee</dt><dd>${esc(money(a.sellerFee.fee))}</dd><dt>Buyer's premium</dt><dd>${esc(money(a.premium?.fee))}</dd></dl>${a.needsLegalReview ? `<p class="note warn">A whole-company share sale: flagged for a lawyer before any invoice.</p>` : ""}` : ""}
  </div>`;
}
tf.addEventListener("input", tail);
tail();
