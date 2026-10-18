/* Selling: the market module's valuation, fees and tail clause (site/assets/engine/market), in the browser. */
import { shell, $, $$, esc, money, bps, pct, day, segmented, liveStrip, nodash } from "../assets/shell.js";
import { valuate, INDICATIVE_LABEL, VALUATION_MODEL_VERSION, TAKE_RATE, TAKE_RATE_LAUNCH, settlement, BUYER_TERMS, tailScenario } from "../../assets/engine/market/browser.js";

shell("selling");
$("[data-live]").innerHTML = liveStrip({
  live: `The indicative valuation (model ${VALUATION_MODEL_VERSION}), the take-rate fee schedule, settlement through escrow and the tail clause: the market module's own code.`,
  local: "Your figures are valued on this device and count as declared, not verified. Nothing is sent or kept.",
  api: "Values from revenue read at source (Stripe, AdSense, uploaded invoices cross-checked), a listing, free vetted buyers, consented introductions, and completion through an escrow partner.",
});

/* ---------- valuation ---------- */
const vf = $("[data-val-form]");
const STREAMS = ["ads", "sponsorship", "subscriptions", "memberships", "products", "licensing", "tips", "other"];
const STREAM_NAME = { ads: "Ads", sponsorship: "Sponsorship", subscriptions: "Subscriptions", memberships: "Memberships", products: "Products", licensing: "Licensing", tips: "Tips", other: "Other" };
const streamRow = (v = {}) => `<div class="fields cols3" data-stream style="align-items:end">
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
$("[data-val-example]").addEventListener("click", () => {
  mode = "quick";
  streamsEl.innerHTML = streamRow({ stream: "ads", amount: 6200, who: "" }) + streamRow({ stream: "sponsorship", amount: 3800, who: "Brindle Coffee (made up)" }) + streamRow({ stream: "memberships", amount: 1500 });
  vf.elements.months.value = 24;
  vf.elements.growth.value = 18;
  vf.elements.margin.value = 62;
  vf.elements.face.value = 60;
  $("[data-face-out]").textContent = "60%";
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
  const months = monthsBack(Math.max(3, Math.min(36, Number(f.months.value) || 12)));
  const g = (Number(f.growth.value) || 0) / 100;
  const out = [];
  for (const row of $$("[data-stream]")) {
    const pounds = Number($('[data-s="amount"]', row).value);
    if (!(pounds > 0)) continue;
    const stream = $('[data-s="stream"]', row).value;
    const who = $('[data-s="who"]', row).value.trim() || undefined;
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
  const input = { kind: f.kind.value, revenue: [], declared, costs: { basis: "declared_margin", margin: Math.min(1, Math.max(0.01, Number(f.margin.value) / 100)) }, faceDependence: Number(f.face.value) / 100 };
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
      <p class="kick" style="margin:0"><span class="tag warn">Indicative</span><span class="tag">Confidence ${esc(v.confidence)}</span></p>
      ${v.range ? `<p class="big num" style="font-size:clamp(40px,9vw,72px)">${esc(money(v.range.low))} to ${esc(money(v.range.high))}</p>
        <p class="small">${v.multiples.low}x to ${v.multiples.high}x a year's profit, centred on ${v.multiples.centre}x.</p>` : `<p class="h2">No range</p>`}
      <dl class="dl"><dt>Revenue, last twelve months${v.annualised ? " (annualised)" : ""}</dt><dd>${esc(money(v.ttmRevenue))}</dd><dt>Profit</dt><dd>${esc(money(v.ttmProfit))}</dd><dt>Verified share</dt><dd>${pct(v.verifiedShare)}</dd><dt>Growth</dt><dd>${v.growth === null ? "n/a" : pct(v.growth)}</dd><dt>Largest stream</dt><dd>${pct(v.largestStreamShare)}</dd></dl>
      <ul class="reasons">${v.reasons.map((r) => `<li><span>${esc(nodash(r))}</span></li>`).join("")}</ul>
    </div>
    <div class="panel stack">
      <h3 class="h3">What moved the multiple</h3>
      <div class="tbl-wrap"><table class="tbl"><tbody>${v.factors.map((x) => `<tr><td>${esc(FACTOR[x.key] ?? x.key)}</td><td class="r" style="white-space:nowrap">${x.key === "base" ? `${x.effect}x` : `${x.effect >= 0 ? "+" : ""}${x.effect.toFixed(2)}x`}</td><td class="small">${esc(nodash(x.reason))}</td></tr>`).join("")}</tbody></table></div>
    </div>
    ${w.range && v.range ? `<div class="panel stack"><h3 class="h3">What if it were verified?</h3><p>With the same figures read at source, the range would be <b style="font-weight:500">${esc(money(w.range.low))} to ${esc(money(w.range.high))}</b>, confidence ${esc(w.confidence)}. Connecting your revenue sources narrows the range and can lift the centre, because buyers pay for numbers they can trust.</p><p class="small">A what-if on your own figures, not a second valuation.</p></div>` : ""}
    <p class="note warn">${esc(INDICATIVE_LABEL)} Every multiple and adjustment is provisional (model ${esc(v.modelVersion)}), set from public comparables until Orbe's own completed deals replace them. Your figures here are declared, so none of them counts as verified.</p>`;
});

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
    <div class="panel stack">
      <h3 class="h3">Seller's success fee: ${esc(money(fee.fee))} (${bps(fee.effectiveRateBps)} effective)</h3>
      ${fee.launchRateApplied ? `<p class="small">Launch rate applied: deal ${Number(f.deal.value)} of the first 20.</p>` : `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Slice of the price</th><th class="r">Rate</th><th class="r">Fee</th></tr></thead><tbody>${sliceRows(fee)}</tbody></table></div>`}
      ${fee.minimumApplied ? `<p class="small">The £4,000 minimum applies.</p>` : ""}
      <p class="small">8% to £500,000, 5% to £2M, 3% above, marginal like income tax so the fee never jumps at a boundary. Paid from the proceeds by the escrow partner.</p>
    </div>
    ${prem ? `<div class="panel stack"><h3 class="h3">Buyer's premium: ${esc(money(prem.fee))} (${bps(prem.effectiveRateBps)} effective)</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Slice of the price</th><th class="r">Rate</th><th class="r">Premium</th></tr></thead><tbody>${sliceRows(prem)}</tbody></table></div>
      ${prem.minimumApplied ? `<p class="small">The £1,000 minimum applies.</p>` : ""}
      <p class="small">2% to £2M and 1% above, paid by the buyer at completion in place of memberships. Access is free once Orbe has vetted the buyer, and reports are included; a report is charged £1,500 only if the buyer walks away.</p></div>` : ""}
    <div class="panel"><dl class="dl">
      <dt>Orbe's fee${f.vat.checked ? ` plus VAT ${esc(money(s.feeVat))}` : ""}</dt><dd>${esc(money({ amount: fee.fee.amount + s.feeVat.amount, currency: "GBP" }))}</dd>
      ${prem ? `<dt>Buyer's premium${f.vat.checked ? ` plus VAT ${esc(money(s.premiumVat))}` : ""}</dt><dd>${esc(money({ amount: prem.fee.amount + s.premiumVat.amount, currency: "GBP" }))}</dd>` : ""}
      <dt>Escrow partner's fee, at cost</dt><dd>${esc(money(s.escrow.partnerFee))}</dd>
      <dt class="tot">The partner pays Orbe</dt><dd class="tot">${esc(money(s.orbeReceives))}</dd>
    </dl><p class="small" style="margin-top:10px">The escrow partner holds every pound and pays Orbe only its own fees. VAT treatment for overseas parties needs an accountant's view.</p></div>`;
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
  out.innerHTML = `<div class="stack" style="margin-top:6px">
    <p><span class="tag ${a.owed ? "warn" : "good"}" style="font-size:14px;padding:5px 12px">${a.owed ? "Fees owed" : "Nothing owed"}</span>${r.tailEndsAt && !f.never.checked ? ` <span class="small">Tail ends ${esc(day(r.tailEndsAt))}</span>` : ""}</p>
    <ul class="reasons">${a.reasons.map((x) => `<li><span>${esc(nodash(x))}</span></li>`).join("")}</ul>
    ${a.owed ? `<dl class="dl"><dt>Seller's fee</dt><dd>${esc(money(a.sellerFee.fee))}</dd><dt>Buyer's premium</dt><dd>${esc(money(a.premium?.fee))}</dd></dl>${a.needsLegalReview ? `<p class="note warn">A whole-company share sale: flagged for a lawyer before any invoice.</p>` : ""}` : ""}
  </div>`;
}
tf.addEventListener("input", tail);
tail();
