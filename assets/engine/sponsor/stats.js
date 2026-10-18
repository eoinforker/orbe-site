/*
  Verified delivery statistics for one account and one format: what a
  sponsor can expect, from the creator's own recent works, read at source.

  Medians, not means, so one breakout cannot set a price the next upload will
  not meet. The lower quartile is reported too: it is what the creator hits
  three times in four, which is the honest basis for a guarantee.
*/
import { fitsFormat, readAt, worksIn } from "./observe.js";
import { daysBetween, median, quantile } from "./util.js";
export const STATS_DEFAULTS = { lookbackDays: 180, maxWorks: 20, minWorks: 3 };
export function deliveryStats(spec, account, sources, usable, table, opts) {
    const lookback = opts.lookbackDays ?? STATS_DEFAULTS.lookbackDays;
    const maxWorks = opts.maxWorks ?? STATS_DEFAULTS.maxWorks;
    const minWorks = opts.minWorks ?? STATS_DEFAULTS.minWorks;
    const eligible = worksIn(sources.snapshots)
        .filter((w) => w.accountId === account.id && fitsFormat(spec, w))
        .filter((w) => {
        const age = daysBetween(w.publishedAt, opts.at);
        return age >= spec.windows[0] && age <= lookback;
    });
    const lines = [];
    let withheld = 0;
    for (const work of eligible) {
        if (lines.length >= maxWorks)
            break;
        const readings = [];
        let hidden = false;
        for (const day of spec.windows) {
            const r = readAt(spec, work, day, sources, usable.viewer);
            if (r)
                readings.push({ day, value: r.value, how: r.how, ageDays: r.ageDays, provenanceId: table.add(r.provenance) });
            else if (readAt(spec, work, day, sources, usable.readable))
                hidden = true;
        }
        if (hidden)
            withheld++;
        if (readings.length)
            lines.push({ workId: work.id, title: work.title, publishedAt: work.publishedAt, readings });
    }
    const windows = spec.windows.map((day) => {
        const at = lines.flatMap((l) => l.readings.filter((r) => r.day === day));
        const basis = { public: 0, connected: 0, uploaded: 0 };
        const entries = new Map(table.list().map((e) => [e.id, e]));
        const ids = new Set();
        for (const r of at) {
            ids.add(r.provenanceId);
            const b = entries.get(r.provenanceId)?.basis;
            if (b === "public" || b === "connected" || b === "uploaded")
                basis[b]++;
        }
        const values = at.map((r) => r.value);
        if (values.length < minWorks) {
            return { day, n: values.length, median: null, p25: null, p75: null, provenanceIds: [...ids], basis, note: `${values.length} of the needed ${minWorks} works have a reading at ${day} ${day === 1 ? "day" : "days"}` };
        }
        return { day, n: values.length, median: median(values), p25: quantile(values, 0.25), p75: quantile(values, 0.75), provenanceIds: [...ids], basis };
    });
    const priced = windows.find((w) => w.day === spec.priceWindow);
    const consistency = priced && priced.median && priced.p25 !== null ? Math.min(1, priced.p25 / priced.median) : null;
    return { accountId: account.id, kind: account.kind, format: spec.format, metric: spec.metric, unit: spec.unit, windows, works: lines, consistency, withheld };
}
export const windowFor = (stats, day) => stats.windows.find((w) => w.day === day) ?? null;
