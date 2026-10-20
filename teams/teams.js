/*
  The brands page's quote: the MCP server's own tools (../developers/tools.js,
  type-stripped by product/src/mcp/build.ts) on the compiled engine, so the
  quote here is the one an agent or a booking gets. Made-up delivery around
  the typical figure chosen; nothing leaves the page.
*/
import * as rating from "../assets/engine/rating/browser.js";
import * as ratingFormat from "../assets/engine/rating/format.js";
import * as sponsor from "../assets/engine/sponsor/browser.js";
import * as market from "../assets/engine/market/browser.js";
import * as podcast from "../assets/engine/podcast/browser.js";
import { createTools } from "../developers/tools.js";

const tools = createTools({ rating, ratingFormat, sponsor, market, podcast });
const $ = (s) => document.querySelector(s);
const NOW = "2026-10-18T12:00:00Z";
const USD_GBP = 0.79;
/* Six recent works around the typical figure, as uneven as real ones. */
const SPREAD = [1.01, 0.86, 1.2, 0.85, 1.09, 0.99];
const FORMATS = {
  podcast: { kind: "podcast", format: "podcast_read", unit: "Downloads", noun: "episode", min: 1000, max: 200000, start: 14000, audience: (t) => t },
  youtube: { kind: "youtube", format: "integration", unit: "Views", noun: "video", min: 2000, max: 800000, start: 48000, audience: (t) => Math.round(t * 2.5) },
};
let fmt = "podcast";
const input = $("[data-typical]");
const nf = new Intl.NumberFormat("en-GB");
const typicalOf = (v, f) => Math.round(Math.exp(Math.log(f.min) + (v / 1000) * (Math.log(f.max) - Math.log(f.min))) / 100) * 100;
const sliderOf = (t, f) => Math.round(((Math.log(t) - Math.log(f.min)) / (Math.log(f.max) - Math.log(f.min))) * 1000);

function paint() {
  const f = FORMATS[fmt];
  const typical = typicalOf(Number(input.value), f);
  $("[data-typ]").textContent = nf.format(typical);
  $("[data-unit]").textContent = f.unit;
  $("[data-noun]").textContent = f.noun;
  const q = tools.call("orbe_quote_guaranteed_read", { kind: f.kind, audience: f.audience(typical), delivery: SPREAD.map((x) => Math.round(typical * x)), format: f.format, currency: "GBP", usdRate: USD_GBP, now: NOW });
  if (!q.ok) { $("[data-price]").textContent = "Not enough to price"; return; }
  const s = q.structured;
  $("[data-price]").textContent = s.priceShown;
  $("[data-floor]").textContent = s.guarantee ? `${nf.format(s.guarantee.units)} ${f.unit.toLowerCase()}` : "No guarantee";
  $("[data-pay]").textContent = s.brandPaysShown;
  if (s.guarantee) {
    const c = tools.call("orbe_check_delivery", { kind: f.kind, format: f.format, price: s.price, guarantee: s.guarantee.units, delivered: Math.floor(s.guarantee.units * 0.8), remedy: "pro_rata", now: NOW });
    $("[data-short]").textContent = c.ok && c.structured.payout ? `${sponsor.formatMoney(c.structured.payout.brandRefund)} back to you` : "";
  }
  input.setAttribute("aria-valuetext", `${nf.format(typical)} ${f.unit.toLowerCase()}. Price ${s.priceShown}, you pay ${s.brandPaysShown}.`);
}

for (const b of document.querySelectorAll("[data-fmt] button")) {
  b.addEventListener("click", () => {
    fmt = b.dataset.v;
    for (const x of document.querySelectorAll("[data-fmt] button")) x.setAttribute("aria-pressed", String(x === b));
    input.value = String(sliderOf(FORMATS[fmt].start, FORMATS[fmt]));
    paint();
  });
}
input.addEventListener("input", paint);
input.value = String(sliderOf(FORMATS[fmt].start, FORMATS[fmt]));
paint();
