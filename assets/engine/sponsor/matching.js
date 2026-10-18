/*
  Matching creators to a brief, with reasons a brand can read.

  Only creators with a live "sponsorships" opt-in are considered at all. Every
  figure used comes from the inventory built for this brand (inventory.ts), so
  a private reading the creator has not shared with this brand can neither be
  shown nor move the ranking: if it did, the order itself would leak it.

  Hard filters exclude: the format is not offered or priced, the creator
  excludes the brand's category, the price is over budget, or the creator is
  not free in the brief's window. Everything else is scored and weighted.
  A criterion the brief does not set, or that cannot be judged from what this
  brand may see, is left out of the score rather than counted as a match.
*/
import { RATING_LABEL } from "../rating/label.js";
import { hasOptedIn } from "./consent.js";
import { fundingFor } from "./fees.js";
import { specFor, unitsFor } from "./formats.js";
import { shareIn } from "./inventory.js";
import { windowFor } from "./stats.js";
import { addDays, formatCount, formatMoney } from "./util.js";
/*
  PROVISIONAL weights: geography and value first, because they are what a
  brief's money buys. Re-weight from which matches brands send offers to and
  which bookings deliver.
*/
export const MATCH_WEIGHTS = {
    geography: 20,
    value: 20,
    audience: 15,
    vertical: 15,
    delivery: 15,
    reliability: 10,
    rating: 10,
};
const FIT_SCORE = { strong: 1, partial: 0.5, miss: 0 };
const RATING_FIT = { Great: "strong", Good: "strong", Average: "partial", Subpar: "miss", Poor: "miss" };
/** Whether the creator can publish inside the window, given their notice and blackouts. */
export function freeInWindow(settings, window, at) {
    const earliest = Math.max(Date.parse(window.start), Date.parse(addDays(at, settings.minNoticeDays)));
    const end = Date.parse(window.end);
    if (earliest > end)
        return false;
    // Walk the window a day at a time; a window is at most 180 days.
    for (let t = earliest; t <= end; t += 864e5) {
        if (!settings.blackouts.some((b) => t >= Date.parse(b.start) && t <= Date.parse(b.end)))
            return true;
    }
    return false;
}
function scoreItem(c, item, brief, brandCategory, terms, at) {
    const reasons = [];
    const spec = specFor(item.format, item.kind);
    const base = {
        creatorId: c.creatorId,
        displayName: c.displayName,
        accountId: item.accountId,
        handle: item.handle,
        format: item.format,
        price: item.listPrice,
        expectedUnits: null,
        expectedCpm: null,
        score: 0,
        excluded: true,
        reasons,
    };
    const exclude = (criterion, sentence) => {
        reasons.push({ criterion, fit: "miss", sentence });
        return base;
    };
    if (!spec)
        return exclude("format", "This format is not one Orbe can verify.");
    if (!item.available || !item.listPrice)
        return exclude("format", `${item.name} is not open for bookings.`);
    reasons.push({ criterion: "format", fit: "strong", sentence: `Offers a ${item.name.toLowerCase()} on ${item.handle}.` });
    const category = brandCategory.trim().toLowerCase();
    if (c.settings.excludedCategories.some((x) => x.trim().toLowerCase() === category)) {
        return exclude("category", "Does not take sponsors in your category.");
    }
    const price = item.listPrice;
    if (price.currency !== brief.budget.currency)
        return exclude("budget", `Prices in ${price.currency}, and your budget is in ${brief.budget.currency}.`);
    const cost = fundingFor(price, terms).total;
    if (cost.amount > brief.budget.amount)
        return exclude("budget", `Costs ${formatMoney(cost)} with Orbe's fee, over your ${formatMoney(brief.budget)} budget.`);
    reasons.push({ criterion: "budget", fit: "strong", sentence: `Costs ${formatMoney(cost)} with Orbe's fee, inside your budget.` });
    if (!freeInWindow(c.settings, brief.window, at))
        return exclude("availability", "Not free to publish inside your dates.");
    let num = 0;
    let den = 0;
    const add = (criterion, fit, sentence) => {
        reasons.push({ criterion, fit, sentence });
        if (fit === "unknown")
            return;
        num += MATCH_WEIGHTS[criterion] * FIT_SCORE[fit];
        den += MATCH_WEIGHTS[criterion];
    };
    const account = c.accounts.find((a) => a.id === item.accountId);
    const { minAudience, maxAudience } = brief.audience;
    if (account && (minAudience !== undefined || maxAudience !== undefined)) {
        const n = account.audience;
        const lo = minAudience ?? 0;
        const hi = maxAudience ?? Infinity;
        const fit = n >= lo && n <= hi ? "strong" : n >= lo * 0.8 && n <= hi * 1.2 ? "partial" : "miss";
        add("audience", fit, `${formatCount(n)} ${account.kind === "substack" ? "subscribers" : "followers"}, ${fit === "strong" ? "inside" : fit === "partial" ? "just outside" : "outside"} the size you asked for.`);
    }
    if (brief.audience.countries.length) {
        const geo = c.inventory.geography.find((g) => g.accountId === item.accountId);
        const share = shareIn(geo, brief.audience.countries);
        if (share === null) {
            add("geography", "unknown", geo?.status === "withheld" ? "Audience geography is private: ask the creator to share it." : "No connected audience geography to judge by.");
        }
        else {
            const fit = share >= 0.5 ? "strong" : share >= 0.2 ? "partial" : "miss";
            add("geography", fit, `${Math.round(share * 100)}% of the audience is in ${brief.audience.countries.join(", ")}.`);
        }
    }
    if (brief.audience.verticals.length) {
        const v = c.settings.vertical;
        if (!v)
            add("vertical", "unknown", "The creator has not set a vertical.");
        else {
            const ok = brief.audience.verticals.map((x) => x.toLowerCase()).includes(v.toLowerCase());
            add("vertical", ok ? "strong" : "miss", ok ? `Makes ${v} content, which your brief asks for.` : `Makes ${v} content, outside the verticals you chose.`);
        }
    }
    const win = windowFor(item.stats, spec.priceWindow);
    const expected = win?.median ?? null;
    if (expected !== null && expected > 0) {
        const units = unitsFor(spec, expected, 1);
        base.expectedUnits = units;
        base.expectedCpm = { amount: Math.round((price.amount * 1000) / units), currency: price.currency };
    }
    const cpmKpi = brief.kpis.find((k) => k.key === "cost_per_thousand");
    if (cpmKpi && cpmKpi.key === "cost_per_thousand") {
        if (!base.expectedCpm)
            add("value", "unknown", `No verified ${spec.unit} this brand may see, so cost per thousand cannot be judged.`);
        else {
            const ratio = base.expectedCpm.amount / cpmKpi.max.amount;
            const fit = ratio <= 1 ? "strong" : ratio <= 1.25 ? "partial" : "miss";
            add("value", fit, `Expected ${formatMoney(base.expectedCpm)} per 1,000 ${spec.unit}, against your target of ${formatMoney(cpmKpi.max)}.`);
        }
    }
    const unitsKpi = brief.kpis.find((k) => k.key === "units_at");
    if (unitsKpi && unitsKpi.key === "units_at") {
        const w = windowFor(item.stats, unitsKpi.day);
        if (!w || w.median === null)
            add("delivery", "unknown", `No verified ${spec.unit} at ${unitsKpi.day} days that you may see.`);
        else {
            const fit = w.median >= unitsKpi.min ? "strong" : (w.p75 ?? 0) >= unitsKpi.min ? "partial" : "miss";
            add("delivery", fit, `Median ${formatCount(w.median)} ${spec.unit} at ${unitsKpi.day} days across ${w.n} recent works; you asked for ${formatCount(unitsKpi.min)}.`);
        }
    }
    if (item.stats.consistency !== null) {
        const k = item.stats.consistency;
        const fit = k >= 0.6 ? "strong" : k >= 0.4 ? "partial" : "miss";
        add("reliability", fit, `A weaker work still reaches ${Math.round(k * 100)}% of the median, so delivery is ${fit === "strong" ? "steady" : fit === "partial" ? "fairly steady" : "uneven"}.`);
    }
    const rating = c.inventory.ratings.find((r) => r.accountId === item.accountId);
    if (rating)
        add("rating", RATING_FIT[rating.band], `Orbe Rating ${rating.band} for their size. ${RATING_LABEL}.`);
    base.excluded = false;
    base.score = den === 0 ? 50 : Math.round((100 * num) / den);
    return base;
}
/** Ranks every opted-in candidate by their best-fitting offering. Excluded candidates sort last, with their reasons. */
export function rankCreators(brief, brandCategory, candidates, terms, at) {
    const out = [];
    for (const c of candidates) {
        if (!hasOptedIn(c.consents, c.creatorId, at))
            continue;
        const items = c.inventory.items.filter((i) => brief.formats.includes(i.format) && (brief.kinds.length === 0 || brief.kinds.includes(i.kind)));
        if (items.length === 0) {
            out.push({ creatorId: c.creatorId, displayName: c.displayName, accountId: null, handle: null, format: null, price: null, expectedUnits: null, expectedCpm: null, score: 0, excluded: true, reasons: [{ criterion: "format", fit: "miss", sentence: "Offers none of the formats in your brief." }] });
            continue;
        }
        const scored = items.map((i) => scoreItem(c, i, brief, brandCategory, terms, at));
        scored.sort(order);
        out.push(scored[0]);
    }
    return out.sort(order);
}
function order(a, b) {
    if (a.excluded !== b.excluded)
        return a.excluded ? 1 : -1;
    if (a.score !== b.score)
        return b.score - a.score;
    const ca = a.expectedCpm?.amount ?? Infinity;
    const cb = b.expectedCpm?.amount ?? Infinity;
    if (ca !== cb)
        return ca - cb;
    return a.creatorId.localeCompare(b.creatorId) || (a.accountId ?? "").localeCompare(b.accountId ?? "");
}
/** The best matches that fit the budget together, one booking per creator, in rank order. */
export function shortlist(matches, budget, terms) {
    let left = budget.amount;
    const picks = [];
    for (const m of matches) {
        if (m.excluded || !m.price || m.price.currency !== budget.currency)
            continue;
        const cost = fundingFor(m.price, terms).total.amount;
        if (cost <= left) {
            picks.push(m);
            left -= cost;
        }
    }
    return { picks, spend: { amount: budget.amount - left, currency: budget.currency }, left: { amount: left, currency: budget.currency } };
}
