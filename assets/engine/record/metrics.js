/*
  The diligence numbers a buyer asks for first: what the business earned over
  the last year, from whom, through which platform, how it is moving, and how
  well paying members stay. Everything is computed from counted lines only, so
  money two sources both describe is never counted twice.
*/
import { basisOf, derived, figure, moneyFigure } from "./figures.js";
import { counted, STREAM_LABEL, STREAM_ORDER } from "./ledger.js";
import { SOURCE_LABEL } from "./sources.js";
import { addMonths, calendarMonth, formatMonth, mean, monthRange, normaliseName, slope, slug, stdev, sum } from "./util.js";
/**
  Provisional thresholds. Each is a judgement to be replaced by the distribution
  measured across verified creators once the benchmarks module has enough of them.
*/
export const THRESHOLDS = {
    /** Above this share of revenue from one audience platform, the business depends on it. */
    platformDependence: 0.8,
    /** Fewest distinct paying counterparties before retention can be read from revenue lines. */
    minSubscribersForRetention: 20,
    /** Fewest months with revenue before seasonality is described at all. */
    minMonthsForDispersion: 6,
};
/**
  Streams usually paid by many small buyers, so a missing counterparty means
  dispersed, not one unnamed payer. Ads count as dispersed too: the platform
  pays, but thousands of advertisers bid; the platform risk is measured
  separately as platform dependence.
*/
const DISPERSED_STREAMS = new Set(["ads", "subscriptions", "memberships", "tips", "products"]);
export const KIND_LABEL = {
    youtube: "YouTube",
    substack: "Substack",
    twitch: "Twitch",
    podcast: "Podcasts",
    photography: "Photography",
};
export function revenueMetrics(prep) {
    const cur = prep.currency;
    const lines = counted(prep.lines);
    const inTtm = new Set(prep.months);
    const ttmLines = lines.filter((l) => inTtm.has(l.month));
    const ttm = trailingTwelve(prep.months, ttmLines, cur);
    return {
        months: prep.months,
        currency: cur,
        ttm,
        growth: growth(prep, lines, ttm.total),
        seasonality: seasonality(prep, lines, ttm),
        concentration: concentration(ttmLines, ttm.total, cur),
        platform: platform(prep, ttmLines, ttm.total, cur),
        retention: retention(prep, lines),
    };
}
function trailingTwelve(months, lines, cur) {
    const total = moneyFigure("ttm.total", "Revenue, trailing twelve months", lines, cur);
    const byStream = STREAM_ORDER.filter((s) => lines.some((l) => l.line.stream === s)).map((s) => {
        const t = moneyFigure(`ttm.stream.${s}`, `${STREAM_LABEL[s]}, trailing twelve months`, lines.filter((l) => l.line.stream === s), cur);
        return { stream: s, total: t, share: derived(`ttm.stream.${s}.share`, `${STREAM_LABEL[s]} share of revenue`, share(t.value, total.value), "percent", [t]) };
    });
    const byMonth = months.map((m) => {
        const here = lines.filter((l) => l.month === m);
        const row = { month: m, total: moneyFigure(`ttm.month.${m.slice(0, 7)}`, `Revenue, ${formatMonth(m)}`, here, cur), byStream: {} };
        for (const s of byStream) {
            const part = here.filter((l) => l.line.stream === s.stream);
            row.byStream[s.stream] = moneyFigure(`ttm.month.${m.slice(0, 7)}.${s.stream}`, `${STREAM_LABEL[s.stream]}, ${formatMonth(m)}`, part, cur);
        }
        return row;
    });
    return { total, byStream, byMonth };
}
const share = (part, whole) => (whole > 0 ? part / whole : 0);
/** The first month any counted line covers. A comparison needs history that reaches back far enough. */
const earliest = (lines) => lines.reduce((m, l) => (m === null || l.month < m ? l.month : m), null);
function growth(prep, lines, ttmTotal) {
    const cur = prep.currency;
    const first = earliest(lines);
    const months = prep.months;
    const prior = months.map((m) => addMonths(m, -12));
    let ttmYoY = null;
    let last3YoY = null;
    const notes = [];
    if (first && first <= prior[0]) {
        const p = moneyFigure("growth.prior_ttm", "Revenue, the twelve months before", lines.filter((l) => prior.includes(l.month)), cur);
        if (p.value > 0)
            ttmYoY = derived("growth.ttm_yoy", "Change on the twelve months before", ttmTotal.value / p.value - 1, "change", [ttmTotal, p]);
    }
    else
        notes.push("Year-on-year growth needs two full years of records.");
    const last3 = months.slice(-3);
    const last3Prior = last3.map((m) => addMonths(m, -12));
    if (first && first <= last3Prior[0]) {
        const a = moneyFigure("growth.last3", `Revenue, ${formatMonth(last3[0])} to ${formatMonth(last3[2])}`, lines.filter((l) => last3.includes(l.month)), cur);
        const b = moneyFigure("growth.last3_prior", `Revenue, ${formatMonth(last3Prior[0])} to ${formatMonth(last3Prior[2])}`, lines.filter((l) => last3Prior.includes(l.month)), cur);
        if (b.value > 0)
            last3YoY = derived("growth.last3_yoy", "Last three months against the same months a year earlier", a.value / b.value - 1, "change", [a, b]);
    }
    else
        notes.push("The last three months cannot be compared with a year earlier: the record does not reach back that far.");
    const series = months.map((m) => sum(lines.filter((l) => l.month === m).map((l) => l.amount)));
    const active = series.filter((v) => v !== 0).length;
    const avg = mean(series);
    const monthlyTrend = active >= 6 && avg > 0
        ? derived("growth.trend", "Underlying monthly trend, as a share of an average month", slope(series) / avg, "change", [ttmTotal], {
            note: "Least-squares slope of the last twelve monthly totals, divided by their mean",
        })
        : null;
    if (!monthlyTrend)
        notes.push("Too few months with revenue to fit a trend.");
    return { ttmYoY, last3YoY, monthlyTrend, note: notes.join(" ") };
}
function seasonality(prep, lines, ttm) {
    const series = ttm.byMonth.map((r) => r.total.value);
    const withRevenue = series.filter((v) => v > 0);
    const out = { method: "insufficient", index: [], peakToTrough: null, q4Share: null, variation: null };
    if (withRevenue.length < THRESHOLDS.minMonthsForDispersion)
        return out;
    const months = ttm.byMonth;
    const peak = months.reduce((a, b) => (b.total.value > a.total.value ? b : a));
    const trough = months.reduce((a, b) => (b.total.value < a.total.value ? b : a));
    if (trough.total.value > 0) {
        out.peakToTrough = derived("season.peak_to_trough", `Best month (${formatMonth(peak.month)}) against weakest (${formatMonth(trough.month)})`, peak.total.value / trough.total.value, "multiple", [peak.total, trough.total]);
    }
    const q4 = months.filter((r) => calendarMonth(r.month) >= 10);
    if (q4.length === 3) {
        const q = derived("season.q4", "October to December revenue", sum(q4.map((r) => r.total.value)), "money", q4.map((r) => r.total), { currency: prep.currency });
        out.q4Share = derived("season.q4_share", "Share of the year earned October to December", share(q.value, ttm.total.value), "percent", [q]);
    }
    const avg = mean(series);
    if (avg > 0)
        out.variation = derived("season.variation", "Month-to-month variation (coefficient of variation)", stdev(series) / avg, "percent", [ttm.total]);
    out.method = "dispersion_only";
    // A seasonal index needs at least two full years, so a one-off spike is not read as a season.
    const first = earliest(lines);
    const years = first ? Math.floor((prep.history.length - prep.history.indexOf(first)) / 12) : 0;
    if (years >= 2) {
        const last = prep.months[prep.months.length - 1];
        const ratios = new Map();
        for (let y = 0; y < Math.min(years, 3); y++) {
            const block = monthRange(addMonths(last, -12 * y - 11), addMonths(last, -12 * y));
            const totals = block.map((m) => moneyFigure(`season.m.${m.slice(0, 7)}`, `Revenue, ${formatMonth(m)}`, lines.filter((l) => l.month === m), prep.currency));
            const blockMean = mean(totals.map((t) => t.value));
            if (blockMean <= 0)
                continue;
            for (const t of totals) {
                const cm = calendarMonth(t.id.slice(9) + "-01");
                ratios.set(cm, [...(ratios.get(cm) ?? []), derived(`season.r.${t.id.slice(9)}`, `${t.label} against its year's average`, t.value / blockMean, "ratio", [t])]);
            }
        }
        out.index = [...ratios.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([cm, rs]) => ({
            calendarMonth: cm,
            figure: derived(`season.index.${cm}`, `Seasonal index, ${formatMonth(`2000-${String(cm).padStart(2, "0")}-01`).slice(0, 3)}`, mean(rs.map((r) => r.value)), "ratio", rs),
        }));
        out.method = "seasonal_index";
    }
    return out;
}
function concentration(lines, total, cur) {
    const groups = new Map();
    const dispersed = [];
    for (const l of lines) {
        const name = l.line.counterparty ?? (DISPERSED_STREAMS.has(l.line.stream) ? null : l.platform);
        if (name === null) {
            dispersed.push(l);
            continue;
        }
        const key = normaliseName(name) || name;
        const g = groups.get(key) ?? { name, lines: [] };
        g.lines.push(l);
        groups.set(key, g);
    }
    const rows = [...groups.values()]
        .map((g) => {
        const t = moneyFigure(`conc.${slug(g.name)}`, `Revenue from ${g.name}`, g.lines, cur);
        return { name: g.name, total: t, share: derived(`conc.${slug(g.name)}.share`, `Share of revenue from ${g.name}`, share(t.value, total.value), "percent", [t]) };
    })
        .sort((a, b) => b.total.value - a.total.value);
    const positive = rows.filter((r) => r.total.value > 0);
    const top3 = positive.slice(0, 3);
    // Herfindahl index on 0 to 10,000 over named payers; dispersed revenue adds almost nothing, so it is left out.
    const hhi = sum(positive.map((r) => (r.share.value * 100) ** 2));
    const d = moneyFigure("conc.dispersed", "Revenue from many small payers", dispersed, cur);
    return {
        top: positive[0] ?? null,
        top3Share: derived("conc.top3", "Share of revenue from the three largest payers", sum(top3.map((r) => r.share.value)), "percent", top3.map((r) => r.total).concat(total)),
        hhi: derived("conc.hhi", "Herfindahl index of payers (0 to 10,000)", Math.round(hhi), "index", [total]),
        dispersedShare: derived("conc.dispersed.share", "Share of revenue from many small payers", share(d.value, total.value), "percent", [d]),
        counterparties: rows.slice(0, 10),
    };
}
function platform(prep, lines, total, cur) {
    const shareRows = (key, prefix) => {
        const groups = new Map();
        for (const l of lines)
            groups.set(key(l), [...(groups.get(key(l)) ?? []), l]);
        return [...groups.entries()]
            .map(([name, ls]) => {
            const t = moneyFigure(`${prefix}.${slug(name)}`, `Revenue through ${name}`, ls, cur);
            return { name, total: t, share: derived(`${prefix}.${slug(name)}.share`, `Share of revenue through ${name}`, share(t.value, total.value), "percent", [t]) };
        })
            .sort((a, b) => b.total.value - a.total.value);
    };
    // With one content platform, money not tied to an account (an invoiced sponsor, say) still rests on that audience.
    const kinds = [...new Set(prep.accounts.map((a) => a.kind))];
    const only = kinds.length === 1 ? kinds[0] : null;
    const byAudience = shareRows((l) => {
        const k = l.audienceKind ?? only;
        return k ? KIND_LABEL[k] : "Not tied to one platform";
    }, "plat.aud");
    const tied = byAudience.filter((r) => r.name !== "Not tied to one platform");
    const largest = tied[0]?.share ?? null;
    return {
        byPayer: shareRows((l) => l.platform, "plat.pay"),
        byAudience,
        largestAudienceShare: largest,
        dependent: !!largest && largest.value > THRESHOLDS.platformDependence,
    };
}
function retention(prep, lines) {
    const out = [];
    const inTtm = new Set(prep.months);
    // Member counts, where a source supplies them, are the better basis.
    const byAccount = new Map();
    for (const m of prep.memberships)
        if (inTtm.has(m.month))
            byAccount.set(m.period.accountId, [...(byAccount.get(m.period.accountId) ?? []), m]);
    for (const [accountId, periods] of byAccount) {
        const start = sum(periods.map((p) => p.period.start));
        const cancelled = sum(periods.map((p) => p.period.cancelled));
        const prov = periods.map((p) => p.provId);
        const known = prep.accounts.find((a) => a.id === accountId);
        const subject = known ? `@${known.handle}` : SOURCE_LABEL[periods[0].period.provenance.source];
        if (start <= 0)
            continue;
        const churn = cancelled / start;
        const basis = periods.every((p) => p.period.provenance.basis === "connected") ? "connected" : "mixed";
        const churnFig = figure(`ret.${slug(accountId)}.churn`, `Average monthly member churn, ${subject}`, churn, "percent", prov, { basis });
        out.push({
            basis: "member_counts",
            subject,
            monthlyChurn: churnFig,
            retention12: derived(`ret.${slug(accountId)}.r12`, `Members expected to remain after twelve months, ${subject}`, (1 - churn) ** 12, "percent", [churnFig], {
                note: "Compounded from the average monthly churn",
            }),
            netRevenueRetention: null,
            note: `Cancellations divided by members at the start of each month, over ${periods.length} months.`,
        });
    }
    // Otherwise read retention from revenue lines that name each payer.
    const subs = lines.filter((l) => (l.line.stream === "subscriptions" || l.line.stream === "memberships") && inTtm.has(l.month));
    const payers = [...new Set(subs.map((l) => l.platform))].sort();
    for (const payer of payers) {
        if (out.some((r) => r.basis === "member_counts"))
            break;
        const own = subs.filter((l) => l.platform === payer);
        const named = own.filter((l) => l.line.counterparty);
        const people = new Set(named.map((l) => normaliseName(l.line.counterparty)));
        if (people.size < THRESHOLDS.minSubscribersForRetention) {
            out.push({
                basis: "none",
                subject: payer,
                monthlyChurn: null,
                retention12: null,
                netRevenueRetention: null,
                note: named.length
                    ? "Too few named subscribers to measure retention."
                    : "Subscription revenue arrives as monthly totals without member counts, so retention and churn could not be measured.",
            });
            continue;
        }
        const active = prep.months.map((m) => new Set(named.filter((l) => l.month === m).map((l) => normaliseName(l.line.counterparty))));
        let lost = 0;
        let base = 0;
        for (let i = 1; i < active.length; i++) {
            base += active[i - 1].size;
            for (const p of active[i - 1])
                if (!active[i].has(p))
                    lost++;
        }
        const first = active.findIndex((s) => s.size > 0);
        const cohort = active[first] ?? new Set();
        const last = active[active.length - 1];
        const prov = named.map((l) => l.provId);
        const basis = basisOf(named);
        const revenueOf = (m) => sum(named.filter((l) => l.month === m && cohort.has(normaliseName(l.line.counterparty))).map((l) => l.amount));
        const startRev = revenueOf(prep.months[first]);
        const endRev = revenueOf(prep.months[prep.months.length - 1]);
        const span = prep.months.length - 1 - first;
        out.push({
            basis: "counterparty_lines",
            subject: payer,
            monthlyChurn: base > 0 ? figure(`ret.${slug(payer)}.churn`, `Average monthly subscriber churn, ${payer}`, lost / base, "percent", prov, { basis }) : null,
            retention12: cohort.size > 0 && span > 0
                ? figure(`ret.${slug(payer)}.cohort`, `Subscribers from ${formatMonth(prep.months[first])} still paying in ${formatMonth(prep.months[prep.months.length - 1])}`, [...cohort].filter((p) => last.has(p)).length / cohort.size, "percent", prov, { basis })
                : null,
            netRevenueRetention: startRev > 0 && span > 0
                ? figure(`ret.${slug(payer)}.nrr`, `Revenue from the ${formatMonth(prep.months[first])} cohort now, against then`, endRev / startRev, "percent", prov, { basis })
                : null,
            note: "Read from payments that name each subscriber: a subscriber is active in a month they paid.",
        });
    }
    return out;
}
