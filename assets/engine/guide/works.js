import { DAY_MS } from "../core/util.js";
import { median } from "./stats.js";
/**
  The share of a metric that has arrived by a given age, from the rating's
  maturity curve: 1 - exp(-t / tau), or for a windowed metric (downloads in
  the first 7 days) the same curve scaled to be complete at the window's end.
  Kept identical to rating/measure.ts maturedShare (a test checks they agree).
*/
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
/** The raw share, without the floor, for comparing a work's start with an expected curve. */
export function expectedShare(m, ageDays) {
    if (!m)
        return 1;
    const age = Math.max(ageDays, 0);
    return m.windowDays
        ? (1 - Math.exp(-Math.min(age, m.windowDays) / m.tauDays)) / (1 - Math.exp(-m.windowDays / m.tauDays))
        : 1 - Math.exp(-age / m.tauDays);
}
export const metricSpec = (spec, key) => spec.metrics.find((m) => m.key === key);
/**
  How old a work must be before its primary metric is "settled" enough to
  compare: the kind's minimum age, and at least one time constant of its
  curve (about two thirds arrived) or the end of its window.
*/
export function settleDays(spec) {
    const m = metricSpec(spec, spec.work.primary)?.maturity;
    const curve = m ? (m.windowDays ?? m.tauDays) : 0;
    return Math.max(spec.minAgeDays, curve);
}
export function formatOf(spec, durationSec) {
    for (const f of spec.formats) {
        const d = f.durationSec;
        if (!d)
            continue;
        if (durationSec >= (d.min ?? 0) && durationSec <= (d.max ?? Infinity))
            return f.key;
    }
    return spec.formats.find((f) => !f.durationSec)?.key ?? spec.formats[0].key;
}
export const sizeBandOf = (spec, audience) => spec.sizeBands.find((b) => audience >= b.min && (b.max === undefined || audience < b.max)) ?? spec.sizeBands[0];
/** Every reading of every work across the history, oldest first. A work's latest reading wins for its metrics. */
export function readingsByWork(history) {
    const sorted = sortHistory(history);
    const works = new Map();
    const readings = new Map();
    for (const snap of sorted) {
        const t = Date.parse(snap.provenance.checkedAt);
        for (const w of snap.works) {
            const pub = Date.parse(w.publishedAt);
            if (!Number.isFinite(pub) || pub > t)
                continue;
            works.set(w.id, w);
            const list = readings.get(w.id) ?? [];
            list.push({ at: snap.provenance.checkedAt, ageHours: (t - pub) / 36e5, metrics: w.metrics });
            readings.set(w.id, list);
        }
    }
    return { works, readings };
}
export const sortHistory = (history) => [...history].sort((a, b) => Date.parse(a.provenance.checkedAt) - Date.parse(b.provenance.checkedAt));
export const latestSnapshot = (history) => sortHistory(history).at(-1);
/** How many earlier works make the rolling baseline, and the fewest before we fall back to the overall median. */
export const BASELINE_WINDOW = 12;
export const BASELINE_MIN = 4;
const usable = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
/**
  The settled works of an account, oldest first, each with its matured
  primary value and its multiples. Works too young to settle are left out:
  the after-post report is where young works are judged.
*/
export function guideWorks(spec, history, nowMs) {
    const last = latestSnapshot(history);
    if (!last)
        return [];
    const now = nowMs ?? Date.parse(last.provenance.checkedAt);
    const { works, readings } = readingsByWork(history);
    const primary = metricSpec(spec, spec.work.primary);
    const settle = settleDays(spec);
    const all = [...works.values()]
        .filter((w) => w.kind === spec.kind && Number.isFinite(Date.parse(w.publishedAt)))
        .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || (a.id < b.id ? -1 : 1));
    // Gaps and recent counts are measured over every work, young ones too, because cadence is about publishing.
    const gapOf = new Map();
    all.forEach((w, i) => {
        const t = Date.parse(w.publishedAt);
        const prev = i > 0 ? Date.parse(all[i - 1].publishedAt) : undefined;
        let recent = 0;
        for (let k = i - 1; k >= 0 && t - Date.parse(all[k].publishedAt) <= 14 * DAY_MS; k--)
            recent++;
        gapOf.set(w.id, { gap: prev === undefined ? undefined : (t - prev) / DAY_MS, recent });
    });
    const settled = [];
    for (const w of all) {
        const publishedMs = Date.parse(w.publishedAt);
        const ageDays = (now - publishedMs) / DAY_MS;
        // The value is scaled by its age when it was read, which is older than now if a later read missed the work.
        const readAgeDays = (readings.get(w.id)?.at(-1)?.ageHours ?? ageDays * 24) / 24;
        if (readAgeDays < settle)
            continue;
        const v = w.metrics[spec.work.primary];
        if (!usable(v))
            continue;
        const g = gapOf.get(w.id);
        settled.push({ work: w, format: formatOf(spec, w.durationSec), ageDays, publishedMs, matured: v / maturedShare(primary?.maturity, readAgeDays), gapDays: g.gap, recentCount: g.recent });
    }
    const overallByFormat = new Map();
    for (const f of new Set(settled.map((s) => s.format)))
        overallByFormat.set(f, median(settled.filter((s) => s.format === f).map((s) => s.matured)));
    const overall = median(settled.map((s) => s.matured));
    const baseline = (pool, fallback) => {
        const window = pool.slice(-BASELINE_WINDOW).map((p) => p.matured);
        const b = window.length >= BASELINE_MIN ? median(window) : fallback;
        return b > 0 ? b : fallback > 0 ? fallback : 1;
    };
    return settled.map((s, i) => {
        const before = settled.slice(0, i);
        const sameFormat = before.filter((p) => p.format === s.format);
        return {
            ...s,
            multiple: s.matured / baseline(sameFormat, overallByFormat.get(s.format)),
            rawMultiple: s.matured / baseline(before, overall),
        };
    });
}
/** The format a creator makes most of; ties go to the default format. */
export function mainFormat(spec, works) {
    const counts = new Map();
    for (const w of works)
        counts.set(w.format, (counts.get(w.format) ?? 0) + 1);
    let best = spec.formats.find((f) => !f.durationSec)?.key ?? spec.formats[0].key;
    for (const f of spec.formats)
        if ((counts.get(f.key) ?? 0) > (counts.get(best) ?? 0))
            best = f.key;
    return best;
}
export const formatNoun = (spec, format) => spec.formats.find((f) => f.key === format)?.noun ?? "work";
