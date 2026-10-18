/*
  The indicative value: a range on a multiple of trailing twelve months' profit.

  Small online businesses change hands on a multiple of yearly profit. Where in
  the range a business lands depends on how much a buyer can trust the numbers
  and how much of the income survives the sale: verified revenue, spread across
  streams, not tied to one face or one sponsor, with history and growth behind it.

  Every multiple and adjustment below is PROVISIONAL. They are set from the public
  comparables in MODEL.md Part 2 and the earlier site calculator, and are replaced
  by the multiples Orbe's own completed deals actually achieve (sale price over
  verified trailing profit, by kind and size band) once there are enough of them
  to publish. The model version changes whenever they do.

  The output is always labelled indicative: not advice, not an offer.
*/
import { formatCompact, formatMoney, pct, roundTo } from "./money.js";
import { addMonths, assertMonth, monthWindow, monthsBetween } from "./months.js";
export const VALUATION_MODEL_VERSION = "2026.10-provisional";
export const INDICATIVE_LABEL = "Indicative only. This is not advice, not a formal valuation and not an offer. The price is agreed between buyer and seller, with their own advisers.";
/*
  Base multiples of yearly profit, by kind. PROVISIONAL.
  - Empire Flippers: typical 2.2x annual profit, premium 2.4x, $1M+ premium 3.2x
    (empireflippers.com/switching-to-annual-multiples, MODEL.md Part 2).
  - Flippa: YouTube channels about 1.5x to 2x a year; content sites about 2.6x to 2.85x
    (flippa.com/blog/buy-youtube-channel, MODEL.md Part 2).
  No kind-specific public comparable was found for newsletters, streams, podcasts or
  photography, so every kind starts at Empire Flippers' typical 2.2x. Replace per kind
  with the median completed-deal multiple once a kind has enough Orbe deals.
*/
export const BASE_MULTIPLE = {
    youtube: 2.2,
    substack: 2.2,
    twitch: 2.2,
    podcast: 2.2,
    photography: 2.2,
};
/** Half-width of the range for a fully verified business with two years of history. PROVISIONAL. */
export const BASE_HALF_WIDTH = 0.3;
/*
  How much each kind of evidence counts towards "verified". PROVISIONAL.
  Connected reads come straight from the platform; uploaded invoices are documents
  a person supplied, so they count for half until cross-checks against payouts
  (the record module) can promote them. Public estimates and declared figures count for nothing.
*/
export const VERIFIED_WEIGHT = {
    connected: 1,
    uploaded: 0.5,
    public: 0,
    declared: 0,
};
/** Below this many months of revenue on file there is too little to annualise honestly. */
export const MIN_MONTHS = 3;
function collect(input) {
    const items = [];
    let currency = null;
    const take = (m) => {
        if (currency === null)
            currency = m.currency;
        else if (m.currency !== currency)
            throw new Error(`Revenue mixes ${currency} and ${m.currency}; convert before valuing`);
    };
    for (const l of input.revenue) {
        assertMonth(l.month);
        take(l.gross);
        items.push({ month: l.month, amount: l.gross.amount, stream: l.stream, counterparty: l.counterparty, weight: VERIFIED_WEIGHT[l.provenance.basis] });
    }
    for (const d of input.declared ?? []) {
        assertMonth(d.month);
        take(d.gross);
        items.push({ month: d.month, amount: d.gross.amount, stream: d.stream ?? "other", counterparty: d.counterparty, weight: VERIFIED_WEIGHT.declared });
    }
    return { items, currency: currency ?? "GBP" };
}
const sum = (xs) => xs.reduce((a, x) => a + x.amount, 0);
const inWindow = (items, months) => {
    const set = new Set(months);
    return items.filter((x) => set.has(x.month));
};
function shareOfLargest(items, key) {
    const total = sum(items);
    const by = new Map();
    let named = false;
    for (const x of items) {
        const k = key(x);
        if (k === undefined || k === "")
            continue;
        named = true;
        by.set(k, (by.get(k) ?? 0) + x.amount);
    }
    if (!named || total <= 0)
        return null;
    return Math.max(...by.values()) / total;
}
/** A multiple rounded for display and storage: two decimals is all the precision these deserve. */
const r2 = (x) => Math.round(x * 100) / 100;
export function valuate(input) {
    if (!(input.faceDependence >= 0 && input.faceDependence <= 1))
        throw new Error("faceDependence must be between 0 and 1");
    const { items, currency } = collect(input);
    if (items.length === 0)
        throw new Error("No revenue to value");
    const months = items.map((x) => x.month).sort();
    const first = months[0];
    const asOf = input.asOfMonth ?? months[months.length - 1];
    assertMonth(asOf);
    const span = monthsBetween(first, asOf) + 1;
    if (span < MIN_MONTHS)
        throw new Error(`At least ${MIN_MONTHS} months of revenue are needed for an indicative value`);
    const monthsOfData = Math.min(12, span);
    const annualised = monthsOfData < 12;
    const scale = 12 / monthsOfData;
    const ttmMonths = monthWindow(asOf, monthsOfData);
    const ttm = inWindow(items, ttmMonths);
    const ttmRevenue = Math.round(sum(ttm) * scale);
    if (ttmRevenue <= 0)
        throw new Error("No revenue in the trailing twelve months");
    const verifiedShare = ttm.reduce((a, x) => a + x.amount * x.weight, 0) / sum(ttm);
    // Costs: connected lines over the same window, or the creator's declared margin.
    let ttmProfit;
    if (input.costs.basis === "lines") {
        const set = new Set(ttmMonths);
        let costs = 0;
        for (const c of input.costs.months) {
            assertMonth(c.month);
            if (c.amount.currency !== currency)
                throw new Error("Costs and revenue must share a currency");
            if (set.has(c.month))
                costs += c.amount.amount;
        }
        ttmProfit = ttmRevenue - Math.round(costs * scale);
    }
    else {
        const m = input.costs.margin;
        if (!(m >= -1 && m <= 1))
            throw new Error("Declared margin must be between -1 and 1");
        ttmProfit = Math.round(ttmRevenue * m);
    }
    // Growth: a full year against the year before when we have it, else the latest half against the one before.
    let growth = null;
    let growthBasis = null;
    if (span >= 24) {
        const prior = sum(inWindow(items, monthWindow(addMonths(asOf, -12), 12)));
        if (prior > 0) {
            growth = sum(inWindow(items, monthWindow(asOf, 12))) / prior - 1;
            growthBasis = "year";
        }
    }
    else if (span >= 12) {
        const prior = sum(inWindow(items, monthWindow(addMonths(asOf, -6), 6)));
        if (prior > 0) {
            growth = sum(inWindow(items, monthWindow(asOf, 6))) / prior - 1;
            growthBasis = "half";
        }
    }
    const largestStreamShare = shareOfLargest(ttm, (x) => x.stream) ?? 1;
    const topCounterpartyShare = shareOfLargest(ttm, (x) => x.counterparty);
    const history = Math.max(input.historyMonths ?? 0, span);
    const factors = [];
    const add = (key, effect, reason) => factors.push({ key, effect, reason });
    const base = BASE_MULTIPLE[input.kind];
    add("base", base, `The starting point is ${base.toFixed(1)}x a year's profit, the typical multiple for small online businesses that sell through vetted marketplaces.`);
    if (verifiedShare >= 0.8) {
        add("verification", 0.1, `${pct(verifiedShare)} of revenue is verified, so a buyer can rely on it without screenshots. Vetted businesses tend to sell at better multiples.`);
    }
    else if (verifiedShare >= 0.5) {
        add("verification", 0, `${pct(verifiedShare)} of revenue is verified. Connecting the remaining sources would narrow the range.`);
    }
    else {
        add("verification", 0, `Only ${pct(verifiedShare)} of revenue is verified, so the range is wide. Connecting your revenue sources is the quickest way to firm it up.`);
    }
    if (largestStreamShare <= 0.6) {
        add("diversification", 0.2, `No single stream is more than ${pct(largestStreamShare)} of revenue. Income spread across streams is safer for a buyer.`);
    }
    else if (largestStreamShare >= 0.9) {
        add("diversification", -0.15, `${pct(largestStreamShare)} of revenue comes from one stream, so a change on one platform would hit the whole business.`);
    }
    if (input.faceDependence > 0.66) {
        add("face", -0.35, "The business leans on you personally, so most buyers will want a handover period or an earn-out.");
    }
    else if (input.faceDependence < 0.33) {
        add("face", 0.25, "The format can run without you on screen, which widens the pool of buyers.");
    }
    if (history < 12) {
        add("history", -0.6, "There is under a year of history. Most marketplaces want at least twelve months, and buyers discount heavily for less.");
    }
    else if (history < 24) {
        add("history", -0.35, "There is under two years of history, which buyers discount for.");
    }
    else if (history >= 60) {
        add("history", 0.1, "Five or more years of history show the business has lasted through platform changes.");
    }
    if (growth !== null) {
        const against = growthBasis === "year" ? "on the year before" : "on the six months before";
        if (growth >= 0.25)
            add("growth", 0.25, `Revenue grew ${pct(growth)} ${against}. Buyers pay more for momentum.`);
        else if (growth >= 0.1)
            add("growth", 0.15, `Revenue grew ${pct(growth)} ${against}.`);
        else if (growth <= -0.2)
            add("growth", -0.35, `Revenue fell ${pct(-growth)} ${against}. Buyers will want to understand why before paying for past profit.`);
        else if (growth <= -0.05)
            add("growth", -0.15, `Revenue fell ${pct(-growth)} ${against}.`);
    }
    if (topCounterpartyShare !== null) {
        if (topCounterpartyShare >= 0.5)
            add("concentration", -0.4, `One partner pays ${pct(topCounterpartyShare)} of revenue. If that relationship does not transfer, most of the income goes with it.`);
        else if (topCounterpartyShare >= 0.3)
            add("concentration", -0.25, `One partner pays ${pct(topCounterpartyShare)} of revenue, which buyers will treat as a concentration risk.`);
    }
    // PROVISIONAL: Empire Flippers report a higher premium multiple for $1M+ listings (3.2x against 2.4x).
    if (ttmProfit >= 25_000_000)
        add("size", 0.2, "Profit above £250k a year puts the business in the size band where buyers have historically paid higher multiples.");
    const centre = Math.max(0.8, factors.reduce((a, f) => a + f.effect, 0));
    // Width: what we do not know widens the range. PROVISIONAL weights.
    let half = BASE_HALF_WIDTH + 0.4 * (1 - verifiedShare);
    if (input.costs.basis === "declared_margin")
        half += 0.1;
    if (annualised)
        half += 0.15;
    if (history < 24)
        half += 0.1;
    const confidence = half <= 0.4 ? "high" : half <= 0.6 ? "medium" : "low";
    const multiples = { low: r2(Math.max(0.5, centre - half)), centre: r2(centre), high: r2(centre + half) };
    const money = (amount) => ({ amount, currency });
    const reasons = [];
    const profitLine = `${annualised ? `Annualised from ${monthsOfData} months: ` : "Over the last twelve months: "}${formatMoney(money(roundTo(ttmProfit, 100)))} profit on ${formatMoney(money(roundTo(ttmRevenue, 100)))} revenue.`;
    reasons.push(profitLine);
    let range = null;
    if (ttmProfit <= 0) {
        reasons.push("Profit is not positive, so a multiple of profit gives no value. Businesses like this usually sell on revenue or assets, which needs a conversation rather than a formula.");
    }
    else {
        const step = ttmProfit >= 2_500_000 ? 100_000 : 10_000;
        const low = roundTo(ttmProfit * multiples.low, step);
        const high = roundTo(ttmProfit * multiples.high, step);
        range = { low: money(low), high: money(high) };
        reasons.push(`At ${multiples.low.toFixed(2)}x to ${multiples.high.toFixed(2)}x that profit, the indicative range is ${formatCompact(money(low))} to ${formatCompact(money(high))}.`);
    }
    for (const f of factors)
        if (f.key !== "base")
            reasons.push(f.reason);
    if (input.costs.basis === "declared_margin")
        reasons.push("Costs are your own estimate. Connecting your bookkeeping or uploading statements would narrow the range.");
    if (annualised)
        reasons.push(`Only ${monthsOfData} months of revenue are on file, so the year is estimated from them.`);
    reasons.push(`Confidence in this range is ${confidence}.`);
    return {
        indicative: true,
        label: INDICATIVE_LABEL,
        modelVersion: VALUATION_MODEL_VERSION,
        kind: input.kind,
        asOfMonth: asOf,
        currency,
        monthsOfData,
        annualised,
        ttmRevenue: money(ttmRevenue),
        ttmProfit: money(ttmProfit),
        verifiedShare,
        growth,
        largestStreamShare,
        topCounterpartyShare,
        confidence,
        multiples,
        range,
        factors,
        reasons,
    };
}
