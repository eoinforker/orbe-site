import { hasBenchmarksConsent } from "../bench/consent.js";
import { roundSig } from "../bench/stats.js";
import { median } from "../rating/stats.js";
import { DOMINANCE_SHARE, MIN_COHORT } from "./calibration.js";
export const PLACEMENTS = ["integration", "dedicated", "newsletter_slot", "podcast_read", "stream_segment"];
export function validateDeal(d) {
    const problems = [];
    const money = (m, what) => {
        if (m && !(Number.isInteger(m.amount) && m.amount > 0))
            problems.push(`${what} must be a whole number of pence above zero`);
    };
    money(d.offered, "offered");
    money(d.agreed, "agreed");
    if (d.agreed && d.agreed.currency !== d.offered.currency)
        problems.push("offered and agreed must be in one currency");
    if (!PLACEMENTS.includes(d.placement))
        problems.push(`unknown placement ${d.placement}`);
    if (!d.category.trim())
        problems.push("a brand category is needed");
    if (d.deliveredReach !== null && !(Number.isFinite(d.deliveredReach) && d.deliveredReach >= 0))
        problems.push("delivered reach must be zero or more");
    if (d.daysToPay !== null && !(Number.isFinite(d.daysToPay) && d.daysToPay >= 0))
        problems.push("days to pay must be zero or more");
    if (d.consent.scope !== "private" && d.consent.scope !== "aggregate")
        problems.push("consent scope must be private or aggregate");
    return problems;
}
/** May this deal count in the aggregates at `at`? */
export function countable(d, at, consents) {
    const t = Date.parse(at);
    const c = d.consent;
    if (c.scope !== "aggregate" || !(Date.parse(c.grantedAt) <= t) || (c.revokedAt !== null && Date.parse(c.revokedAt) <= t))
        return false;
    if (consents && !hasBenchmarksConsent(consents, d.creatorId, at))
        return false;
    return validateDeal(d).length === 0;
}
const SIG = 3;
const toPence = (m, fx) => {
    const r = m.currency === "GBP" ? 1 : fx[m.currency];
    return r === undefined ? null : m.amount * r;
};
function statsOf(deals, fx) {
    const renewals = deals.filter((d) => d.renewed !== null);
    const agreed = deals.filter((d) => d.agreed !== null);
    const per1k = agreed
        .filter((d) => d.deliveredReach !== null && d.deliveredReach > 0)
        .map((d) => toPence(d.agreed, fx) / (d.deliveredReach / 1000));
    const paid = deals.filter((d) => d.daysToPay !== null).map((d) => d.daysToPay);
    const sig = (x) => (x === null ? null : roundSig(x, SIG));
    return {
        renewalRate: renewals.length ? sig(renewals.filter((d) => d.renewed).length / renewals.length) : null,
        agreedOverOffered: agreed.length ? sig(median(agreed.map((d) => d.agreed.amount / d.offered.amount))) : null,
        agreedPer1k: per1k.length ? sig(median(per1k)) : null,
        medianDaysToPay: paid.length ? sig(median(paid)) : null,
        basis: { renewal: renewals.length, agreed: agreed.length, per1k: per1k.length, paid: paid.length },
    };
}
function cohort(coords, deals, k, share, fx) {
    const per = new Map();
    for (const d of deals)
        per.set(d.creatorId, (per.get(d.creatorId) ?? 0) + 1);
    const creators = per.size;
    if (creators < k)
        return { ...coords, creators: null, deals: null, suppressed: true, stats: null };
    if (Math.max(...per.values()) > share * deals.length)
        return { ...coords, creators, deals: deals.length, suppressed: true, stats: null };
    return { ...coords, creators, deals: deals.length, suppressed: false, stats: statsOf(deals, fx) };
}
/** The anonymised deal benchmarks: one cohort per brand category, kind and size band (and placement, if asked). */
export function dealAggregates(all, o) {
    const k = o.minCohort ?? MIN_COHORT;
    const share = o.dominanceShare ?? DOMINANCE_SHARE;
    const fx = o.fxToGBP ?? {};
    const deals = all.filter((d) => countable(d, o.at, o.consents) && toPence(d.offered, fx) !== null);
    const groups = new Map();
    const add = (key, d) => {
        const list = groups.get(key);
        if (list)
            list.push(d);
        else
            groups.set(key, [d]);
    };
    for (const d of deals) {
        const cat = d.category.trim().toLowerCase();
        add(`${cat}|${d.kind}|${d.sizeBand}|*`, d);
        if (o.byPlacement)
            add(`${cat}|${d.kind}|${d.sizeBand}|${d.placement}`, d);
    }
    return [...groups.keys()].sort().map((key) => {
        const [category, kind, sizeBand, placement] = key.split("|");
        return cohort({ category, kind: kind, sizeBand, placement: placement }, groups.get(key), k, share, fx);
    });
}
/**
  The lookalike line: "Brands in software renewed with YouTube channels of
  10k to 100k subscribers at 42%." Null when the cohort is withheld or has
  no renewal answers, so nothing is ever said from too few creators.
*/
export function renewalLine(cohorts, q) {
    const c = cohorts.find((x) => x.category === q.category.trim().toLowerCase() && x.kind === q.kind && x.sizeBand === q.sizeBand && x.placement === "*");
    const rate = c?.stats?.renewalRate;
    if (!c || c.suppressed || rate === null || rate === undefined)
        return null;
    const pct = Math.round(rate * 100);
    return `Brands in ${c.category} renewed with ${q.kindLabel ?? q.kind} creators of ${q.bandLabel ?? q.sizeBand} at ${pct}% (${c.stats.basis.renewal} deals from ${c.creators} creators).`;
}
