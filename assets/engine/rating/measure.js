import { DAY_MS } from "../core/util.js";
import { AUDIENCE } from "./spec.js";
import { LOG_FLOOR, median } from "./stats.js";
export const toMs = (now) => (now instanceof Date ? now.getTime() : typeof now === "number" ? now : Date.parse(now));
/** The smallest share of a metric we assume has arrived, so a work minutes old is not multiplied a thousandfold. */
export const MATURITY_FLOOR = 0.05;
export function maturedShare(m, ageDays) {
    if (!m)
        return 1;
    const age = Math.max(ageDays, 0);
    const share = m.windowDays
        ? (1 - Math.exp(-Math.min(age, m.windowDays) / m.tauDays)) / (1 - Math.exp(-m.windowDays / m.tauDays))
        : 1 - Math.exp(-age / m.tauDays);
    return Math.min(1, Math.max(share, MATURITY_FLOOR));
}
export const sizeBandOf = (spec, audience) => spec.sizeBands.find((b) => audience >= b.min && (b.max === undefined || audience < b.max)) ?? spec.sizeBands[0];
/** Durations of 0 mean "unknown", so they fall through to the default format. */
export function formatOf(spec, durationSec) {
    for (const f of spec.formats) {
        const d = f.durationSec;
        if (!d)
            continue;
        if (durationSec >= (d.min ?? 0) && durationSec <= (d.max ?? Infinity))
            return f.key;
    }
    return spec.formats.find((f) => !f.durationSec).key;
}
const usable = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
/** Newest first, with the id as a tie-breaker so the order never depends on input order. */
export const newestFirst = (a, b) => a.ageDays - b.ageDays || (a.work.id < b.work.id ? -1 : a.work.id > b.work.id ? 1 : 0);
export function prepare(spec, works, nowMs) {
    const out = [];
    for (const work of works) {
        if (work.kind !== spec.kind)
            continue;
        const published = Date.parse(work.publishedAt);
        if (!Number.isFinite(published))
            continue;
        const ageDays = (nowMs - published) / DAY_MS;
        if (ageDays < 0)
            continue; // scheduled, not yet out
        const matured = {};
        for (const m of spec.metrics) {
            const v = work.metrics[m.key];
            if (usable(v))
                matured[m.key] = v / maturedShare(m.maturity, ageDays);
        }
        out.push({ work, ageDays, format: formatOf(spec, work.durationSec), matured });
    }
    return out.sort(newestFirst);
}
/** Works old enough to count, newest first, capped at the kind's maximum. */
export const maturedOnly = (spec, prepared, minAge = spec.minAgeDays) => prepared.filter((p) => p.ageDays >= minAge);
export function poolFor(spec, prepared, format) {
    return maturedOnly(spec, prepared).filter((p) => p.format === format).slice(0, spec.maxWorks);
}
/** The format with the most matured works is the one a creator is rated on; ties go to the default format. */
export function primaryFormat(spec, prepared) {
    const counts = new Map();
    for (const p of maturedOnly(spec, prepared))
        counts.set(p.format, (counts.get(p.format) ?? 0) + 1);
    const fallback = spec.formats.find((f) => !f.durationSec).key;
    let best = fallback;
    for (const f of spec.formats)
        if ((counts.get(f.key) ?? 0) > (counts.get(best) ?? 0))
            best = f.key;
    return best;
}
const denominatorOf = (p, den, audience) => den === AUDIENCE ? Math.max(audience, 1) : p.matured[den];
/** The ratio for one work, or undefined when any metric it needs is missing. */
export function workRatio(p, numerator, den, audience) {
    let num = 0;
    for (const k of numerator) {
        const v = p.matured[k];
        if (v === undefined)
            return undefined;
        num += v;
    }
    const d = denominatorOf(p, den, audience);
    if (d === undefined || d <= 0)
        return undefined;
    return { ratio: num / d, den: d };
}
/**
  A pooled ratio weights works by their denominator, the way "total likes over
  total views" does, with two guards against one work setting the whole ratio:
  no work may weigh more than `cap` times the median work, and no work may
  contribute more than `cap` times the average of the others (or, when the
  others contribute nothing, more than `cap` over n of its own share).
*/
export function pooledRatio(items, cap) {
    if (!items.length)
        return undefined;
    const limit = cap * median(items.map((i) => i.den));
    const weights = items.map((i) => Math.min(i.den, limit));
    const contributions = items.map((i, k) => weights[k] * i.ratio);
    const total = contributions.reduce((s, c) => s + c, 0);
    const n = items.length;
    let num = 0;
    for (const c of contributions) {
        const othersMean = n > 1 ? (total - c) / (n - 1) : Infinity;
        num += Math.min(c, cap * (othersMean > 0 ? othersMean : c / n));
    }
    const den = weights.reduce((s, w) => s + w, 0);
    return den > 0 ? num / den : undefined;
}
const AVERAGE_MONTH_DAYS = 365.25 / 12;
export function measure(spec, m, pool, formatWorks, audience) {
    switch (m.type) {
        case "ratio": {
            const items = pool.map((p) => workRatio(p, m.numerator, m.denominator, audience)).filter((x) => x !== undefined);
            if (!items.length)
                return null;
            const value = m.aggregate === "median" ? median(items.map((i) => i.ratio)) : pooledRatio(items, spec.influenceCap);
            return value === undefined ? null : { value, display: value, n: items.length };
        }
        case "median": {
            const xs = pool.map((p) => p.matured[m.metric]).filter((x) => x !== undefined);
            if (!xs.length)
                return null;
            const value = median(xs);
            return { value, display: value, n: xs.length };
        }
        case "momentum": {
            const xs = pool.map((p) => p.matured[m.metric]).filter((x) => x !== undefined);
            if (!xs.length)
                return null;
            // Short histories are split in thirds, so a creator with six works still gets a fair comparison.
            const recentN = Math.min(m.recent, Math.ceil(xs.length / 3));
            const recent = median(xs.slice(0, recentN));
            const before = median(xs.slice(recentN, recentN + m.before));
            const growth = xs.length < 2 || (recent === 0 && before === 0) ? 1 : recent / Math.max(before, LOG_FLOOR);
            return { value: growth, display: growth, n: xs.length };
        }
        case "hits": {
            const xs = pool.map((p) => p.matured[m.metric]).filter((x) => x !== undefined);
            if (!xs.length)
                return null;
            const med = median(xs);
            // When the typical work scores zero, any work that scores at all is a hit.
            const threshold = med > 0 ? m.multiple * med : Number.MIN_VALUE;
            const rate = xs.filter((x) => x >= threshold).length / xs.length;
            return { value: rate, display: rate, n: xs.length };
        }
        case "cadence": {
            const inWindow = formatWorks.filter((p) => p.ageDays <= m.windowDays);
            const oldest = formatWorks.length ? formatWorks[formatWorks.length - 1].ageDays : 0;
            // A creator younger than the window, or a connector that only read the newest works, is judged on the span we can see.
            const spanDays = Math.min(m.windowDays, Math.max(oldest, AVERAGE_MONTH_DAYS));
            const perMonth = inWindow.length / (spanDays / AVERAGE_MONTH_DAYS);
            const gaps = inWindow.slice(1).map((p, i) => p.ageDays - inWindow[i].ageDays);
            const meanGap = gaps.reduce((s, g) => s + g, 0) / Math.max(gaps.length, 1);
            const cv = gaps.length > 2 ? Math.sqrt(gaps.reduce((s, g) => s + (g - meanGap) ** 2, 0) / gaps.length) / Math.max(meanGap, 0.1) : 1;
            const steadiness = Math.exp(-m.irregularityPenalty * Math.max(cv - m.irregularityAllowance, 0));
            return { value: Math.max(perMonth, 0.1) * steadiness, display: perMonth, n: inWindow.length };
        }
    }
}
export function measurePart(spec, part, pool, formatWorks, audience) {
    const eligible = part.minAgeDays === undefined ? pool : pool.filter((p) => p.ageDays >= part.minAgeDays);
    return measure(spec, part.measure, eligible, formatWorks, audience);
}
export function typicalValues(spec, pool) {
    const out = {};
    for (const m of spec.metrics) {
        const xs = pool.map((p) => p.matured[m.key]).filter((x) => x !== undefined);
        if (xs.length)
            out[m.key] = median(xs);
    }
    return out;
}
export function measureFormat(spec, snapshot, prepared, format) {
    const audience = snapshot.account.audience;
    const pool = poolFor(spec, prepared, format);
    const formatWorks = prepared.filter((p) => p.format === format);
    const parts = {};
    for (const part of spec.parts)
        parts[part.key] = measurePart(spec, part, pool, formatWorks, audience);
    return { format, band: sizeBandOf(spec, audience), pool, parts, typical: typicalValues(spec, pool) };
}
export function measureSnapshot(spec, snapshot, now, format) {
    const prepared = prepare(spec, snapshot.works, toMs(now));
    return measureFormat(spec, snapshot, prepared, format ?? primaryFormat(spec, prepared));
}
