/*
  A suggested price range for one format, with the reasons.

  price = expected delivery × a rate per thousand. Expected delivery is the
  creator's own verified median at the format's price window. The rate comes
  from the best evidence there is, in this order:
  1. own history: the creator's completed, verified sponsorships through Orbe
     in this format (realised price over verified delivery);
  2. comparables: completed, verified sponsorships of creators of the same
     kind, format and size band;
  3. the provisional rate card (ratecards.ts), named as such.
  Only the creator sees the suggestion; they set their own list price.
*/
import { RATING_LABEL } from "../rating/label.js";
import { sizeBandFor } from "./formats.js";
import { PROVISIONAL_RATE_CARDS, RATE_CARD_VERSION, rateCardFor } from "./ratecards.js";
import { windowFor } from "./stats.js";
import { daysBetween, formatCount, formatMoney, quantile } from "./util.js";
export const PRICING_DEFAULTS = { minOwn: 3, minComparables: 8, maxAgeDays: 365 };
/*
  PROVISIONAL: a rate card or comparable rate says nothing about how well this
  creator's audience responds, so the Orbe Rating band nudges it. Own history
  already carries that, so it is not nudged. Replace with the measured
  relationship between band and realised rate once there are enough sponsorships.
*/
export const BAND_ADJUSTMENT = { Great: 1.15, Good: 1.075, Average: 1, Subpar: 0.925, Poor: 0.85 };
/** Below this consistency (lower quartile over median), the low end assumes a weaker work. PROVISIONAL. */
export const UNEVEN_BELOW = 0.6;
/** Prices are rounded to whole tens so they do not pretend to precision. */
const ROUND = 1000;
const cpmOf = (c) => ({ amount: Math.round((c.price.amount * 1000) / c.deliveredUnits), currency: c.price.currency });
export function suggestPrice(input, opts = {}) {
    const { spec, stats } = input;
    const currency = opts.currency ?? "GBP";
    const base = { format: spec.format, kind: spec.kind };
    const win = windowFor(stats, spec.priceWindow);
    if (!win || win.median === null || win.p25 === null) {
        return { status: "not_enough_data", ...base, reason: `No verified ${spec.unit} at ${spec.priceWindow} days yet: ${win?.note ?? "no readings"}.` };
    }
    if (win.median <= 0)
        return { status: "not_enough_data", ...base, reason: `Recent works show no ${spec.unit} at ${spec.priceWindow} days.` };
    const minOwn = opts.minOwn ?? PRICING_DEFAULTS.minOwn;
    const minComp = opts.minComparables ?? PRICING_DEFAULTS.minComparables;
    const maxAge = opts.maxAgeDays ?? PRICING_DEFAULTS.maxAgeDays;
    const reasons = [];
    const convert = (m) => (m.currency === currency ? m : (opts.fx?.(m, currency) ?? null));
    const usable = (list) => (list ?? [])
        .filter((c) => c.format === spec.format && c.kind === spec.kind && c.deliveredUnits > 0 && daysBetween(c.completedAt, input.at) <= maxAge && daysBetween(c.completedAt, input.at) >= 0)
        .map((c) => convert(cpmOf(c)))
        .filter((m) => m !== null)
        .map((m) => m.amount);
    const band = sizeBandFor(spec.kind, input.audience);
    const own = usable((input.own ?? []).filter((c) => c.creatorId === input.creatorId));
    // Peers are other creators: the creator's own record counts only as own history.
    const peers = (input.comparables ?? []).filter((c) => c.sizeBand === band && c.creatorId !== input.creatorId);
    const peerRates = usable(peers);
    const peerCreators = new Set(peers.map((c) => c.creatorId)).size;
    let basis;
    let lowRate;
    let highRate;
    let sources = [];
    let provisional = false;
    if (own.length >= minOwn) {
        basis = "own_history";
        lowRate = quantile(own, 0.25);
        highRate = quantile(own, 0.75);
        reasons.push(`Your ${own.length} completed sponsorships in this format through Orbe paid ${formatMoney({ amount: Math.round(lowRate), currency })} to ${formatMoney({ amount: Math.round(highRate), currency })} per 1,000 verified ${spec.unit} (middle half).`);
    }
    else if (peerRates.length >= minComp && peerCreators * 2 >= minComp) {
        basis = "comparables";
        lowRate = quantile(peerRates, 0.25);
        highRate = quantile(peerRates, 0.75);
        reasons.push(`${peerRates.length} completed sponsorships by ${peerCreators} creators of your kind and size paid ${formatMoney({ amount: Math.round(lowRate), currency })} to ${formatMoney({ amount: Math.round(highRate), currency })} per 1,000 verified ${spec.unit} (middle half).`);
    }
    else {
        const card = rateCardFor(spec.format, spec.kind, opts.rateCards ?? PROVISIONAL_RATE_CARDS);
        if (!card)
            return { status: "not_enough_data", ...base, reason: "No rate card or completed sponsorships for this format yet." };
        const lo = convert({ amount: card.cpmLow, currency: card.currency });
        const hi = convert({ amount: card.cpmHigh, currency: card.currency });
        if (!lo || !hi)
            return { status: "not_enough_data", ...base, reason: `The rate card is in ${card.currency} and no exchange rate to ${currency} was given.` };
        basis = "rate_card";
        provisional = true;
        lowRate = lo.amount;
        highRate = hi.amount;
        sources = card.sources;
        reasons.push(`Not enough completed sponsorships yet, so this uses a provisional rate card: ${formatMoney(lo)} to ${formatMoney(hi)} per ${card.per}, from published third-party figures. ${card.note}`);
    }
    if (basis !== "own_history" && input.rating) {
        const k = BAND_ADJUSTMENT[input.rating.band];
        if (k !== 1) {
            lowRate *= k;
            highRate *= k;
            const pct = Math.round(Math.abs(k - 1) * 1000) / 10;
            reasons.push(`Your Orbe Rating is ${input.rating.band}, so the rate is ${k > 1 ? "raised" : "lowered"} by ${pct}% (a provisional adjustment). ${RATING_LABEL}.`);
        }
    }
    const perUnit = spec.quantity === "hour" ? "per hour of sponsored stream" : "per placement";
    const expected = win.median;
    const consistency = stats.consistency ?? 1;
    const lowUnits = consistency < UNEVEN_BELOW ? win.p25 : expected;
    reasons.push(`Your median is ${formatCount(expected)} ${spec.quantity === "hour" ? "average viewers" : spec.unit} at ${spec.priceWindow} ${spec.priceWindow === 1 ? "day" : "days"}, across ${win.n} recent works read at source.`);
    if (lowUnits !== expected) {
        reasons.push(`Your numbers vary: a typical weaker work reaches ${formatCount(lowUnits)}, ${Math.round(consistency * 100)}% of the median, so the low end assumes one of those.`);
    }
    const low = Math.max(0, Math.floor((lowRate * lowUnits) / 1000 / ROUND) * ROUND);
    const high = Math.max(low + ROUND, Math.ceil((highRate * expected) / 1000 / ROUND) * ROUND);
    return {
        status: "suggested",
        ...base,
        per: spec.quantity,
        low: { amount: low, currency },
        high: { amount: high, currency },
        basis,
        expected: { metric: spec.metric, unit: spec.unit, day: spec.priceWindow, units: expected },
        cpm: { low: { amount: Math.round(lowRate), currency }, high: { amount: Math.round(highRate), currency } },
        provisional,
        reasons: [...reasons, `Suggested ${perUnit}: ${formatMoney({ amount: low, currency })} to ${formatMoney({ amount: high, currency })}. You set your own price.`],
        sources,
        version: RATE_CARD_VERSION,
    };
}
