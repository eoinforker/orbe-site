/* Sponsorships: the sponsor module's inventory, pricing and matching (site/assets/engine/sponsor), in the browser. */
import { shell, $, $$, esc, count, money, bps, store, segmented, nodash, fold, sourcesList, icon } from "../assets/shell.js";
import { inventoryFromStats, previewBrief, TYPED_NOTE, SAMPLE_CREATORS_LABEL, DEFAULT_TAKE_RATE, feeTermsFor, fundingFor, specsForKind, RATE_CARD_VERSION, RATING_LABEL } from "../../assets/engine/sponsor/browser.js";

shell("sponsorships");
$("[data-network]").textContent = bps(DEFAULT_TAKE_RATE.networkBps);
$("[data-direct]").textContent = bps(DEFAULT_TAKE_RATE.directBps);
$("[data-sample-label]").innerHTML = `<b>Made-up creators.</b> ${esc(SAMPLE_CREATORS_LABEL.replace(/^Made-up creators /, "Creators "))}`;

/* ---------- price my sponsorship ---------- */
const pf = $("[data-price-form]");
const AUD = { youtube: "Subscribers", substack: "Subscribers", podcast: "Followers", twitch: "Followers" };
function kindChanged() {
  const kind = pf.elements.kind.value;
  const spec = specsForKind(kind)[0];
  const what = spec.quantity === "hour" ? "Average viewers per stream" : `${spec.unit[0].toUpperCase()}${spec.unit.slice(1)} at ${spec.priceWindow} days`;
  $("[data-units-label]").textContent = `${what}, recent ${kind === "substack" ? "issues" : kind === "podcast" ? "episodes" : kind === "twitch" ? "streams" : "uploads"}`;
  $("[data-aud-label]").textContent = AUD[kind];
}
pf.elements.kind.addEventListener("change", kindChanged);
const fxToggle = () => $("[data-fx-field]").classList.toggle("hide", pf.elements.currency.value !== "GBP");
pf.elements.currency.addEventListener("change", fxToggle);
fxToggle();
kindChanged();
const rated = store.session.json("orbe-products-card");
if (rated?.result?.band && ["youtube", "substack", "podcast", "twitch"].includes(rated.kind)) {
  pf.elements.kind.value = rated.kind;
  kindChanged();
  pf.elements.band.value = rated.result.band;
  $("[data-band-hint]").textContent = `From your rating in Rate my work (${rated.result.band}). Calculated independently by Orbe.`;
}
/* The made-up example: a YouTube channel's recent uploads. It is priced on load, labelled, until you price your own. */
const EXAMPLE = { kind: "youtube", audience: 85000, units: "21000, 18000, 25000, 19500, 30000, 17000, 22500", band: "Good" };
$("[data-price-example]").addEventListener("click", () => {
  pf.elements.kind.value = EXAMPLE.kind;
  kindChanged();
  pf.elements.audience.value = EXAMPLE.audience;
  pf.elements.units.value = EXAMPLE.units;
  pf.elements.band.value = EXAMPLE.band;
  pf.elements.price.value = "";
  pf.requestSubmit();
});
const parseUnits = (text) => text.split(/[\s,;]+/).map((x) => Number(x.replace(/[^\d.]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);

let priceSample = false;
function priceIt({ kind, audience, units, band, listPrice, currency, rate }, sample = false) {
  priceSample = sample;
  const fx = currency === "GBP" ? (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * rate), currency: "GBP" } : null) : undefined;
  const price = listPrice > 0 ? { amount: Math.round(listPrice * 100), currency } : null;
  const { inventory, note } = inventoryFromStats({ kind, audience, units, price, currency, fx, rating: band ? { band, rating: 0 } : null, at: new Date().toISOString() });
  const label = sample ? `<div class="sample"><span><b>A made-up YouTube channel:</b> ${count(audience)} subscribers, ${units.length} recent uploads, rated ${esc(band)}. Shown until you price your own: type your figures and press Price it.</span></div>` : "";
  $("[data-price-out]").innerHTML = inventory.items.map((item, i) => itemPanel(item, price, units.length, currency === "GBP" ? rate : null, i === 0 ? label : "")).join("") + `<p class="note plain">${esc(note)}</p>`;
}

pf.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-price-err]");
  err.textContent = "";
  const f = pf.elements;
  const units = parseUnits(f.units.value);
  const audience = Number(f.audience.value);
  if (!(audience > 0)) return void (err.textContent = "Add your audience size.");
  if (units.length < 3) return void (err.textContent = "Add at least three works' numbers.");
  const currency = f.currency.value;
  const rate = Number(f.fx.value);
  if (currency === "GBP" && !(rate > 0)) return void (err.textContent = "To quote in pounds, give the rate you use. Orbe does not guess exchange rates.");
  priceIt({ kind: f.kind.value, audience, units, band: f.band.value, listPrice: Number(f.price.value), currency, rate });
});

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
function itemPanel(item, price, typed, rate, label = "") {
  const s = item.suggestion;
  const fxNote = s?.low?.currency === "GBP" && rate ? ` Converted from the dollar rate card at ${rate} pounds per dollar.` : "";
  const w = item.stats.windows;
  const per = s?.per === "hour" ? "an hour" : "a placement";
  const fees = price ? ["network", "direct"].map((src) => ({ src, ...fundingFor(price, feeTermsFor(src)) })) : [];
  return `<div class="panel stack">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3 class="h3">${esc(item.name)}</h3><p class="small">${esc(item.description)}</p></div></div>
    ${s?.status === "suggested"
      ? `<div><p class="small">${label ? "A made-up example. " : ""}Suggested price, ${per}</p><p class="big num" style="font-size:clamp(40px,8vw,64px)">${esc(money(s.low))} to ${esc(money(s.high))}</p>
         <p class="small" style="margin-top:6px">${count(s.expected.units)} ${esc(s.expected.unit)} expected at ${s.expected.day} ${s.expected.day === 1 ? "day" : "days"}, at ${esc(money(s.cpm.low, { pence: true }))} to ${esc(money(s.cpm.high, { pence: true }))} per 1,000.${s.provisional ? " From a provisional rate card." : ""}${fxNote}</p></div>
         ${label}
         ${fold("How Orbe priced it", `${s.reasons.length} reason${s.reasons.length === 1 ? "" : "s"}, ${s.sources.length + 1} source${s.sources.length ? "s" : ""}`, `<ul class="reasons">${s.reasons.map((r) => `<li><span>${esc(nodash(r.replace(/ read at source\./, ", from the figures you typed.")))}</span></li>`).join("")}</ul>
         <dl class="dl"><dt>Evidence</dt><dd>${esc({ own_history: "Your own completed sponsorships", comparables: "Creators your kind and size", rate_card: "Provisional rate card" }[s.basis])}</dd></dl>
         <p class="small">Delivery: ${w.filter((x) => x.n > 0).map((x) => x.median === null ? `${x.day} days: ${esc(x.note ?? "not enough")}` : `${x.day} days: median ${count(x.median)}, middle half ${count(x.p25)} to ${count(x.p75)} (${x.n} works)`).join("; ")}.${item.stats.consistency !== null ? ` Consistency ${Math.round(item.stats.consistency * 100)}%.` : ""}</p>
         ${sourcesList([
           priceSample ? { kind: "typed", label: `${typed} made-up uploads and audience`, provenance: "Invented for the example. Your own figures replace them when you price yours." } : { kind: "typed", label: `Your ${typed} works and audience`, provenance: "Typed by you, not yet read at source. Brands see verified delivery once your accounts are connected." },
           ...s.sources.map((src) => ({ kind: "link", label: src.label, url: src.url, provenance: `${host(src.url)}. A third-party figure from a search snippet, not verified against the original. Rate card ${s.version || RATE_CARD_VERSION}.` })),
         ])}${s.sources.length ? `<p class="small">Replaced by realised rates from verified sponsorships through Orbe.</p>` : s.provisional ? `<p class="small">No published comparable was found for this format: the rate is a placeholder, the first to be replaced with realised rates.</p>` : ""}`)}`
      : `<p class="note warn">${esc(nodash(s?.reason ?? "No suggestion yet."))}</p>`}
    ${fees.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>At your price</th><th class="r">You get</th><th class="r">Orbe's fee</th><th class="r">Brand pays</th></tr></thead><tbody>${fees.map((x) => `<tr><td>${x.src === "network" ? "Orbe found the brand" : "You brought the brand"}</td><td class="r">${esc(money(x.price))}</td><td class="r">${esc(money(x.fee))}</td><td class="r">${esc(money(x.total))}</td></tr>`).join("")}</tbody></table></div>` : ""}
  </div>`;
}

/* ---------- brief matching ---------- */
const bf = $("[data-brief-form]");
let source = "network";
const pickSource = segmented($("[data-source]"), (v) => { source = v; });
const checked = (sel) => $$(`${sel} input:checked`).map((i) => i.value);
const FIT = { strong: ["Strong", "good"], partial: ["Partial", "warn"], miss: ["Miss", "bad"], unknown: ["Unknown", ""] };
const FORMAT_NAME = { integration: "YouTube integration", dedicated: "Dedicated video", newsletter_slot: "Newsletter slot", podcast_read: "Podcast read", stream_segment: "Stream segment, per hour" };
bf.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = bf.elements;
  const out = $("[data-brief-out]");
  const formats = checked("[data-formats]");
  const from = Number(f.from.value);
  const to = Number(f.to.value);
  if (!formats.length) return void (out.innerHTML = `<p class="err">Choose at least one format.</p>`);
  if (!(to > from)) return void (out.innerHTML = `<p class="err">The window must close after it opens.</p>`);
  let p;
  try {
    p = previewBrief({ budgetPounds: Number(f.budget.value) || 0, formats, countries: checked("[data-countries]"), verticals: checked("[data-verticals]"), category: f.category.value, windowFromDays: from, windowToDays: to, source });
  } catch (x) {
    return void (out.innerHTML = `<p class="err">${esc(nodash(x.message))}</p>`);
  }
  const cost = new Map(p.costs.map((c) => [c.creatorId, c]));
  // A creator who scores 0 fits the budget but misses the brief: never shortlisted.
  const picks = p.picks.filter((m) => m.score > 0);
  const spendPence = picks.reduce((t, m) => t + cost.get(m.creatorId).total.amount, 0);
  const spend = { amount: spendPence, currency: p.brief.budget.currency };
  const left = { amount: p.brief.budget.amount - spendPence, currency: p.brief.budget.currency };
  out.innerHTML = `<div class="panel stack">
      <h3 class="h3">Shortlist within £${count(p.brief.budget.amount / 100)}</h3>
      <dl class="dl">${picks.map((m) => `<dt>${esc(m.displayName)}, ${esc(FORMAT_NAME[m.format] ?? m.format)}</dt><dd>${esc(money(cost.get(m.creatorId).total))}</dd>`).join("") || "<dt>No one fits the budget</dt><dd></dd>"}
      <dt class="tot">Spend, including Orbe's ${bps(p.fee.bps)}</dt><dd class="tot">${esc(money(spend))}</dd><dt>Left</dt><dd>${esc(money(left))}</dd></dl>
      <p class="small">Each total is the creator's own price plus Orbe's fee, paid by the brand. The creator keeps 100% of their price.</p>
    </div>
    <ul class="matches">${p.matches.map((m) => `<li><details class="fold"><summary>${icon("caret", { size: 16, className: "caret" })}<span class="m-sum"><span><b>${esc(m.displayName)}</b> <span class="small">(made up) ${m.format ? esc(FORMAT_NAME[m.format] ?? m.format) : "No matching format"}${m.price ? `, ${esc(money(m.price))}` : ""}</span></span>${m.excluded ? '<span class="tag bad">Left out</span>' : m.score > 0 ? `<span class="m-score">${m.score}</span>` : '<span class="m-miss small">Fits the budget, misses the brief</span>'}</span></summary>
      <div class="fold-body"><ul class="fits">${m.reasons.map((r) => `<li><span class="tag ${FIT[r.fit][1]}">${FIT[r.fit][0]}</span><span>${esc(nodash(r.sentence))}</span></li>`).join("")}</ul></div></details></li>`).join("")}</ul>
    <p class="small">Scores out of 100 from provisional weights. Ratings shown are ${esc(RATING_LABEL.replace(/^I/, "i"))}. A creator who has not opted in never appears. Matched as of ${new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>`;
});
pickSource("network");
bf.requestSubmit();
priceIt({ ...EXAMPLE, units: parseUnits(EXAMPLE.units), listPrice: 0, currency: "GBP", rate: Number(pf.elements.fx.value) || 0.75 }, true);
