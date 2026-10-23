import { AGENT_MAX_COUNTERS, FORMAT_WORDS, factList, moneyText } from "./judge.js";
import { FORMAT_PLURAL, dayText, listText, monthText } from "./limits.js";
/** Bump when a rule's meaning changes, so a stored decision says which rules decided it. */
export const DECIDE_VERSION = "handoff-1";
/** Minutes a decision that runs alone waits, so the creator can stop it or do it now. */
export const GRACE_MINUTES = 30;
/** The rules, in the order they are tried. */
export const RULE_ORDER = [
    "avoid_brand",
    "avoid_category",
    "format",
    "currency",
    "blocked_dates",
    "notice",
    "month_cap",
    "guarantee",
    "no_basis",
    "counters_used",
    "floor",
    "market",
    "meets",
];
const DAY = 864e5;
const key = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** The UTC day of an ISO day or timestamp; null when it does not parse. */
const dayOf = (iso) => {
    const t = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
    return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};
const nextDay = (d) => new Date(Date.parse(`${d}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
/** Longest window looked at day by day; a longer one is judged on its first year. */
const MAX_WINDOW_DAYS = 366;
const CURRENCY_NAME = { GBP: "pounds", USD: "US dollars", EUR: "euros" };
/** What a guarantee counts, by format. */
export const UNIT_WORDS = { integration: "views", dedicated: "views", newsletter_slot: "opens", podcast_read: "downloads", stream_segment: "viewer hours" };
const timesText = (n) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
const noticeText = (n) => `${n} ${n === 1 ? "day's" : "days'"} notice`;
const count = (n) => n.toLocaleString("en-GB");
/** "20 to 24 December", "20 December to 2 January", or "20 December". */
export function spanText(start, end) {
    if (start === end)
        return dayText(start);
    const [a, b] = [dayText(start), dayText(end)];
    const [da, ma] = a.split(" ");
    return ma === b.split(" ")[1] && start.slice(0, 4) === end.slice(0, 4) ? `${da} to ${b}` : `${a} to ${b}`;
}
const fromText = (start, end) => (start === end ? `on ${dayText(start)}` : `from ${spanText(start, end)}`);
/** Runs of consecutive days, as [first, last]. */
function runsOf(days) {
    const out = [];
    for (const d of days) {
        const last = out[out.length - 1];
        if (last && nextDay(last[1]) === d)
            last[1] = d;
        else
            out.push([d, d]);
    }
    return out;
}
/**
  One offer against the rules. The first decisive rule wins:
  avoid_brand, avoid_category, format (decline); currency (ask); blocked_dates,
  notice, month_cap (decline); guarantee, no_basis, counters_used (ask);
  floor or market (counter on the ladder); meets (accept).
*/
export function decideOffer(input) {
    const { offer: o, rules: l, range, now, rulesVersion } = input;
    const items = [];
    const notes = [];
    const qty = Math.max(1, o.quantity);
    const what = qty === 1 ? FORMAT_WORDS[o.format] : `${qty} ${FORMAT_PLURAL[o.format]}`;
    const offered = moneyText(o.price);
    if ((input.origin ?? "offer") === "offer")
        items.push({ ref: "offer.price", text: `Your offer is ${offered} for ${what}.` });
    const done = (verdict, rule, why, price = null) => ({ verdict, price, rule, why, reasons: [why, ...notes], facts: factList(items), rulesVersion });
    // 1. Brands never taken. No reason goes to the brand: the draft simply passes.
    if (l.avoidBrands.some((b) => key(b) === key(o.brandName)))
        return done("decline", "avoid_brand", `${o.brandName} is a brand you never take.`);
    // 2. Categories never taken, from the rules and the sponsorship settings.
    const category = input.brandCategory?.trim().toLowerCase() || null;
    const never = new Set([...l.avoidCategories, ...input.settings.excludedCategories].map((c) => c.trim().toLowerCase()));
    if (category && never.has(category)) {
        items.push({ ref: "rules.category", text: `I do not take sponsorships in ${category}.` });
        return done("decline", "avoid_category", `${o.brandName} is in ${category}, a category you never take.`);
    }
    // 3. Formats not offered.
    if (l.formats.length && !l.formats.includes(o.format)) {
        items.push({ ref: "rules.format", text: `I am not taking ${FORMAT_PLURAL[o.format]} at the moment.` });
        return done("decline", "format", `You do not offer ${FORMAT_PLURAL[o.format]} at the moment.`);
    }
    // 4. Currency: floors are in pounds, the range in its own currency. Orbe does not guess exchange rates.
    const cur = o.price.currency;
    const floorsInPounds = Object.keys(l.minimums).length > 0;
    const floorClash = floorsInPounds && cur !== "GBP";
    const rangeClash = range !== null && (range.low.currency !== cur || range.high.currency !== cur);
    if (floorClash || rangeClash) {
        const theirs = floorClash ? "GBP" : range.low.currency;
        items.push({ ref: "rules.currency", text: `I price my sponsorships in ${CURRENCY_NAME[theirs]}.` });
        return done("ask", "currency", `The offer is in ${CURRENCY_NAME[cur]} and your ${floorClash ? "floors are" : "range is"} in ${CURRENCY_NAME[theirs]}. Orbe does not guess exchange rates, so the answer is yours.`);
    }
    // 5. Dates away (the rules) and blocked out (the settings).
    const startDay = dayOf(o.publishWindow.start);
    const endDayRaw = dayOf(o.publishWindow.end);
    if (startDay) {
        const endDay = endDayRaw && endDayRaw >= startDay ? endDayRaw : startDay;
        const blocks = [
            ...l.blockedDates.map((b) => ({ start: b.start, end: b.end, away: true })),
            ...input.settings.blackouts.flatMap((b) => {
                const [s0, e0] = [dayOf(b.start), dayOf(b.end)];
                return s0 && e0 ? [{ start: s0, end: e0 < s0 ? s0 : e0, away: false }] : [];
            }),
        ];
        const hits = blocks.filter((b) => b.start <= endDay && b.end >= startDay);
        if (hits.length) {
            const free = [];
            for (let d = startDay, i = 0; d <= endDay && i < MAX_WINDOW_DAYS; d = nextDay(d), i++)
                if (!hits.some((b) => b.start <= d && d <= b.end))
                    free.push(d);
            const away = hits.filter((b) => b.away).map((b) => fromText(b.start, b.end));
            const out = hits.filter((b) => !b.away).map((b) => spanText(b.start, b.end));
            if (!free.length) {
                if (away.length)
                    items.push({ ref: "rules.dates", text: `I am away ${listText(away)}.` });
                if (out.length)
                    items.push({ ref: "rules.dates", text: `I am not available on ${listText(out)}.` });
                const why = [away.length ? `You are away ${listText(away)}.` : "", out.length ? `You have blocked out ${listText(out)}.` : ""].filter(Boolean).join(" ");
                return done("decline", "blocked_dates", why);
            }
            const runs = runsOf(free).slice(0, 3).map(([a, b]) => spanText(a, b));
            notes.push(`Part of the window is blocked; ${listText(runs)} ${free.length === 1 ? "is" : "are"} free.`);
            items.push({ ref: "window.free", text: `I can publish ${runsOf(free).length === 1 && free.length === 1 ? "on" : "within"} ${listText(runs)} in your window.` });
        }
    }
    // 6. Notice: the window must end no sooner than the notice the creator asked for.
    const startMs = Date.parse(o.publishWindow.start);
    const endMs = Date.parse(o.publishWindow.end);
    const earliest = now.getTime() + l.leadDays * DAY;
    if (Number.isFinite(endMs) && endMs < earliest) {
        items.push({ ref: "rules.notice", text: `I need ${noticeText(l.leadDays)} before a read goes live.` });
        return done("decline", "notice", `It would go live sooner than the ${noticeText(l.leadDays)} you asked for.`);
    }
    if (Number.isFinite(startMs) && startMs < earliest) {
        const from = dayText(new Date(earliest).toISOString());
        notes.push(`The window opens sooner than your ${noticeText(l.leadDays)}, so it would go live from ${from}.`);
        items.push({ ref: "window.earliest", text: `The earliest I can publish is ${from}.` });
    }
    // 7. Reads a month: declined only when every month the window touches is full.
    if (l.maxReadsPerMonth !== null && startDay) {
        const endDay = endDayRaw && endDayRaw >= startDay ? endDayRaw : startDay;
        const months = [];
        for (let m = startDay.slice(0, 7); m <= endDay.slice(0, 7) && months.length < 13;) {
            months.push(m);
            const [y, mo] = m.split("-").map(Number);
            m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
        }
        const max = l.maxReadsPerMonth;
        const full = months.filter((m) => (input.bookedByMonth[m] ?? 0) >= max);
        if (full.length && full.length === months.length) {
            const names = listText(full.map(monthText));
            items.push({ ref: "rules.month", text: `${names} ${full.length === 1 ? "is" : "are"} fully booked for me.` });
            if (full.length === 1) {
                const n = input.bookedByMonth[full[0]] ?? 0;
                return done("decline", "month_cap", `${names} is full: ${n} ${n === 1 ? "read" : "reads"} booked, ${n === max ? "your most" : `over your most of ${max}`}.`);
            }
            return done("decline", "month_cap", `${names} are full, at your most of ${max} ${max === 1 ? "read" : "reads"} a month.`);
        }
        if (full.length)
            notes.push(`${listText(full.map(monthText))} ${full.length === 1 ? "is" : "are"} full, so the read must go in ${listText(months.filter((m) => !full.includes(m)).map(monthText))}.`);
    }
    // 8. A guarantee above what the creator usually delivers at that day.
    const g = o.guarantee ?? null;
    if (g) {
        const unit = UNIT_WORDS[o.format];
        if (!input.expected || input.expected.day !== g.day)
            return done("ask", "guarantee", `The guarantee is ${count(g.units)} ${unit} at ${g.day} days, and Orbe has no figure of yours at that day to judge it, so the answer is yours.`);
        if (g.units > input.expected.units)
            return done("ask", "guarantee", `The guarantee is above your usual ${count(input.expected.units)} ${unit} at ${g.day} days, so a short read could cost you.`);
    }
    // 9. Nothing to judge the price by.
    const floorPer = l.minimums[o.format] ?? null;
    if (!floorPer && !range)
        return done("ask", "no_basis", `Set a floor for ${FORMAT_PLURAL[o.format]} so I can judge the price.`);
    const floor = floorPer ? { amount: floorPer, currency: "GBP" } : null;
    const total = (m) => ({ amount: m.amount * qty, currency: m.currency });
    const floorTotal = floor ? total(floor) : null;
    const low = range ? total(range.low) : null;
    const high = range ? total(range.high) : null;
    if (floor)
        items.push({ ref: "rules.floor", text: `My floor is ${moneyText(floor)} ${FORMAT_WORDS[o.format]}.` });
    if (range)
        items.push({ ref: "rules.range", text: `My results support ${moneyText(range.low)} to ${moneyText(range.high)} ${FORMAT_WORDS[o.format]}.` });
    const floorBinds = floorTotal !== null && (low === null || floorTotal.amount >= low.amount);
    const target = floorBinds ? floorTotal : low;
    if (o.price.amount < target.amount) {
        // 10. Two counters made: the next move is the creator's.
        if (o.counters.length >= AGENT_MAX_COUNTERS)
            return done("ask", "counters_used", `You have countered ${timesText(o.counters.length)}, so the next answer is yours.`);
        // 11. Counter on the ladder.
        const rule = floorBinds ? "floor" : "market";
        const n = o.counters.length;
        const price = total(counterLadder(n, floor, range));
        if (price.amount <= o.price.amount)
            return done("accept", rule, `${offered} is at or above the counter Orbe would make, so it can be taken as it stands.`, o.price);
        const still = n > 0 ? "still " : "";
        const p = moneyText(price);
        let why;
        if (!low || !high)
            why = `${offered} is ${still}below your ${moneyText(floorTotal)} floor, so the counter is your floor.`;
        else {
            const span = `${moneyText(low)} to ${moneyText(high)}`;
            const mid = (low.amount + high.amount) / 2;
            const atFloor = floorTotal !== null && price.amount === floorTotal.amount;
            const rounded = " rounded up to the nearest £10";
            const where = n === 0
                ? floorTotal !== null && floorTotal.amount >= mid
                    ? `your floor${atFloor ? "" : rounded}`
                    : `the middle${price.amount === mid ? "" : rounded}`
                : atFloor
                    ? "your floor"
                    : "the low end of your range";
            why = floorBinds
                ? `${offered} is ${still}below your ${moneyText(floorTotal)} floor. Your results support ${span}, so the counter is ${p}, ${where}.`
                : `${offered} is ${still}below the ${span} your results support, so the counter is ${p}, ${where}.`;
        }
        items.push({ ref: "decision.price", text: `My counter is ${p} for ${what}.` });
        return done("counter", rule, why, price);
    }
    // 12. It meets the rules.
    let why;
    if (floorTotal && high)
        why = `${offered} meets your floor and ${o.price.amount <= high.amount ? "sits in" : "is above"} your range.`;
    else if (floorTotal)
        why = `${offered} meets your floor.`;
    else
        why = `${offered} ${o.price.amount <= high.amount ? "sits in" : "is above"} the range your results support.`;
    return done("accept", "meets", why, o.price);
}
/** Declines under these rules may run alone when autoDecline is on. */
export const DECLINE_ALONE = ["avoid_brand", "avoid_category", "format", "blocked_dates", "notice", "month_cap"];
/** Whether a decision runs alone (after the grace window) or waits for a person. */
export function autonomyOf(d, rules, origin) {
    if (origin !== "offer")
        return "ask";
    if (d.verdict === "decline")
        return rules.autoDecline && DECLINE_ALONE.includes(d.rule) ? "auto" : "ask";
    if (d.verdict === "counter")
        return rules.autoCounter ? "auto" : "ask";
    if (d.verdict === "accept")
        return rules.accept.mode === "auto" && d.price !== null && d.price.currency === "GBP" && d.price.amount >= rules.accept.above ? "auto" : "ask";
    return "ask";
}
const roundUpTen = (pence) => Math.ceil(pence / 1000) * 1000;
/**
  The counter for one placement after n counters already made: first the
  higher of the floor and the middle of the range, rounded up to £10; then
  the higher of the floor and the range's low end. With no range, both are
  the floor. Throws without a floor or a range (the no_basis rule asks first).
*/
export function counterLadder(n, floor, range) {
    if (!floor && !range)
        throw new Error("A counter needs a floor or a range");
    const currency = (floor ?? range.low).currency;
    const f = floor?.amount ?? 0;
    if (!range)
        return { amount: f, currency };
    if (n <= 0)
        return { amount: roundUpTen(Math.max(f, (range.low.amount + range.high.amount) / 2)), currency };
    return { amount: Math.max(f, range.low.amount), currency };
}
