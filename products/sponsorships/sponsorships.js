/* Sponsorships: the sponsor module's inventory, pricing and matching (site/assets/engine/sponsor), in the browser. */
import { shell, $, $$, esc, count, money, bps, store, segmented, liveStrip, nodash } from "../assets/shell.js";
import { inventoryFromStats, previewBrief, TYPED_NOTE, SAMPLE_CREATORS_LABEL, DEFAULT_TAKE_RATE, feeTermsFor, fundingFor, specsForKind, RATE_CARD_VERSION, RATING_LABEL } from "../../assets/engine/sponsor/browser.js";

shell("sponsorships");
$("[data-live]").innerHTML = liveStrip({
  live: "The inventory, price suggestion with its reasons and rate-card sources, matching with a sentence per criterion, and the take rate: the sponsor module's own code.",
  local: "Your figures are priced on this device. The brief is matched against made-up creators who have opted in, labelled as such.",
  api: "Delivery read at source from your connected accounts, real opted-in creators, offers with guarantees, bookings, disclosure checks, and payment held by a payments partner (never by Orbe).",
});
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
$("[data-price-example]").addEventListener("click", () => {
  pf.elements.kind.value = "youtube";
  kindChanged();
  pf.elements.audience.value = 85000;
  pf.elements.units.value = "21000, 18000, 25000, 19500, 30000, 17000, 22500";
  pf.elements.band.value = "Good";
  pf.elements.price.value = "";
  pf.requestSubmit();
});

pf.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-price-err]");
  err.textContent = "";
  const f = pf.elements;
  const units = f.units.value.split(/[\s,;]+/).map((x) => Number(x.replace(/[^\d.]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
  const audience = Number(f.audience.value);
  if (!(audience > 0)) return void (err.textContent = "Add your audience size.");
  if (units.length < 3) return void (err.textContent = "Add at least three works' numbers.");
  const currency = f.currency.value;
  const rate = Number(f.fx.value);
  if (currency === "GBP" && !(rate > 0)) return void (err.textContent = "To quote in pounds, give the rate you use. Orbe does not guess exchange rates.");
  const fx = currency === "GBP" ? (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * rate), currency: "GBP" } : null) : undefined;
  const price = Number(f.price.value) > 0 ? { amount: Math.round(Number(f.price.value) * 100), currency } : null;
  const { inventory, note } = inventoryFromStats({ kind: f.kind.value, audience, units, price, currency, fx, rating: f.band.value ? { band: f.band.value, rating: 0 } : null, at: new Date().toISOString() });
  $("[data-price-out]").innerHTML = inventory.items.map((item) => itemPanel(item, price)).join("") + `<p class="note plain">${esc(note)}</p>`;
});

function itemPanel(item, price) {
  const s = item.suggestion;
  const w = item.stats.windows;
  const per = s?.per === "hour" ? "an hour" : "a placement";
  const fees = price ? ["network", "direct"].map((src) => ({ src, ...fundingFor(price, feeTermsFor(src)) })) : [];
  return `<div class="panel stack">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3 class="h3">${esc(item.name)}</h3><p class="small">${esc(item.description)}</p></div>${s?.status === "suggested" && s.provisional ? '<span class="tag warn">Provisional rate card</span>' : ""}</div>
    ${s?.status === "suggested"
      ? `<div><p class="small">Suggested price, ${per}</p><p class="big num" style="font-size:clamp(40px,8vw,64px)">${esc(money(s.low))} to ${esc(money(s.high))}</p></div>
         <dl class="dl"><dt>Rate used per 1,000 ${esc(item.stats.unit)}</dt><dd>${esc(money(s.cpm.low, { pence: true }))} to ${esc(money(s.cpm.high, { pence: true }))}</dd><dt>Expected delivery</dt><dd>${count(s.expected.units)} ${esc(s.expected.unit)} at ${s.expected.day} ${s.expected.day === 1 ? "day" : "days"}</dd><dt>Evidence</dt><dd>${esc({ own_history: "Your own completed sponsorships", comparables: "Creators your kind and size", rate_card: "Provisional rate card" }[s.basis])}</dd></dl>
         <ul class="reasons">${s.reasons.map((r) => `<li><span>${esc(nodash(r))}</span></li>`).join("")}</ul>
         ${s.sources.length ? `<div><p class="label">Rate-card sources (${esc(s.version || RATE_CARD_VERSION)})</p><ul class="reasons" style="margin-top:6px">${s.sources.map((src) => `<li><span><a href="${esc(src.url)}" rel="noopener noreferrer" target="_blank">${esc(src.label)}</a></span></li>`).join("")}</ul><p class="small" style="margin-top:6px">Third-party figures from search snippets, not verified against the originals. Replaced by realised rates from verified sponsorships through Orbe.</p></div>` : s.provisional ? `<p class="small">No published comparable was found for this format: the rate is a placeholder, the first to be replaced with realised rates.</p>` : ""}`
      : `<p class="note warn">${esc(nodash(s?.reason ?? "No suggestion yet."))}</p>`}
    <p class="small">Delivery: ${w.map((x) => x.median === null ? `${x.day} days: ${esc(x.note ?? "not enough")}` : `${x.day} days: median ${count(x.median)}, middle half ${count(x.p25)} to ${count(x.p75)} (${x.n} works)`).join("; ")}.${item.stats.consistency !== null ? ` Consistency ${Math.round(item.stats.consistency * 100)}%.` : ""}</p>
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
  out.innerHTML = `<div class="panel stack">
      <h3 class="h3">Shortlist within £${count(p.brief.budget.amount / 100)}</h3>
      <dl class="dl">${p.picks.map((m) => `<dt>${esc(m.displayName)}, ${esc(FORMAT_NAME[m.format] ?? m.format)}</dt><dd>${esc(money(cost.get(m.creatorId).total))}</dd>`).join("") || "<dt>No one fits the budget</dt><dd></dd>"}
      <dt class="tot">Spend, including Orbe's ${bps(p.fee.bps)}</dt><dd class="tot">${esc(money(p.spend))}</dd><dt>Left</dt><dd>${esc(money(p.left))}</dd></dl>
      <p class="small">Each total is the creator's own price plus Orbe's fee, paid by the brand. The creator keeps 100% of their price.</p>
    </div>
    ${p.matches.map((m) => `<div class="panel stack">
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px">
        <div><h3 class="h3">${esc(m.displayName)} <span class="tag">Made up</span></h3><p class="small">${m.format ? esc(FORMAT_NAME[m.format] ?? m.format) : "No matching format"}${m.price ? ` · ${esc(money(m.price))}` : ""}${m.expectedUnits ? ` · ${count(m.expectedUnits)} expected` : ""}${m.expectedCpm ? ` · ${esc(money(m.expectedCpm, { pence: true }))} per 1,000` : ""}</p></div>
        ${m.excluded ? '<span class="tag bad">Left out</span>' : `<span class="tag acc" style="font-size:15px">${m.score}</span>`}
      </div>
      <ul class="fits">${m.reasons.map((r) => `<li><span class="tag ${FIT[r.fit][1]}">${FIT[r.fit][0]}</span><span>${esc(nodash(r.sentence))}</span></li>`).join("")}</ul>
    </div>`).join("")}
    <p class="small">Scores out of 100 from provisional weights. Ratings shown: ${esc(RATING_LABEL)} A creator who has not opted in never appears. Matched as of ${new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>`;
});
pickSource("network");
bf.requestSubmit();
