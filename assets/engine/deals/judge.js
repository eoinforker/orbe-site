import { numbersIn } from "../guide/facts.js";
/** Most counters an offer may carry (the sponsor module allows 3); the assistant leaves the last to the creator. */
export const AGENT_MAX_COUNTERS = 2;
export const FORMAT_WORDS = {
    integration: "an integration",
    dedicated: "a dedicated video",
    newsletter_slot: "a newsletter slot",
    podcast_read: "a podcast read",
    stream_segment: "a stream segment",
};
/** "£1,250" or "£1,250.50": whole pounds when the pence are zero. */
export function moneyText(m) {
    const sign = m.currency === "GBP" ? "£" : m.currency === "USD" ? "$" : "€";
    const pounds = m.amount / 100;
    return `${sign}${pounds.toLocaleString("en-GB", { minimumFractionDigits: m.amount % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
/** Facts numbered in order, F1 onwards, each with the numbers its text contains. */
export function factList(items) {
    return items.map((x, i) => ({ id: `F${i + 1}`, source: "deal", ref: x.ref, text: x.text, numbers: numbersIn(x.text) }));
}
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function judgeOffer(o, limits, ctx) {
    const items = [];
    const reasons = [];
    const say = (ref, text) => {
        items.push({ ref, text });
        reasons.push(text);
    };
    const done = (verdict, counterPrice = null) => ({ verdict, counterPrice, reasons, facts: factList(items) });
    items.push({ ref: "offer.price", text: `${o.brandName} offers ${moneyText(o.price)} for ${o.quantity === 1 ? FORMAT_WORDS[o.format] : `${o.quantity} of ${FORMAT_WORDS[o.format]}`}.` });
    if (limits.avoidBrands.some((b) => key(b) === key(o.brandName))) {
        say("limits.avoid_brand", `${o.brandName} is on your list of brands to avoid.`);
        return done("recommend_decline");
    }
    if (ctx.brandCategory && limits.avoidCategories.includes(ctx.brandCategory.toLowerCase())) {
        say("limits.avoid_category", `${o.brandName} is in ${ctx.brandCategory}, a category you avoid.`);
        return done("recommend_decline");
    }
    if (limits.formats.length && !limits.formats.includes(o.format)) {
        say("limits.format", `You do not offer ${FORMAT_WORDS[o.format]} at the moment.`);
        return done("recommend_decline");
    }
    const leadMs = Date.parse(o.publishWindow.start) - ctx.now.getTime();
    if (Number.isFinite(leadMs) && leadMs < limits.leadDays * 864e5) {
        say("limits.lead", `It would go live sooner than the ${limits.leadDays} days' notice you asked for.`);
        return done("hold");
    }
    const perUnit = limits.minimums[o.format];
    const minimum = perUnit ? { amount: perUnit * o.quantity, currency: o.price.currency } : null;
    if (minimum)
        items.push({ ref: "limits.minimum", text: `Your minimum for this is ${moneyText(minimum)}.` });
    const low = ctx.range && ctx.range.low.currency === o.price.currency ? { amount: ctx.range.low.amount * o.quantity, currency: o.price.currency } : null;
    const high = ctx.range && ctx.range.high.currency === o.price.currency ? { amount: ctx.range.high.amount * o.quantity, currency: o.price.currency } : null;
    if (low && high)
        items.push({ ref: "range", text: `Your own results support ${moneyText(low)} to ${moneyText(high)} for this.` });
    const target = minimum && low ? (minimum.amount >= low.amount ? minimum : low) : (minimum ?? low);
    if (target && o.price.amount < target.amount) {
        if (o.counters.length >= AGENT_MAX_COUNTERS) {
            say("counters.used", `You have countered ${o.counters.length} times already, so the next answer is yours.`);
            return done("hold");
        }
        reasons.push(minimum && target === minimum ? `It is below your minimum of ${moneyText(minimum)}.` : `It is below the ${moneyText(target)} your own results support.`);
        return done("counter", target);
    }
    reasons.push(minimum || low ? "It meets your minimum and the range your results support." : "It fits your limits. Set a minimum so the assistant can judge the price too.");
    return done("recommend_accept");
}
