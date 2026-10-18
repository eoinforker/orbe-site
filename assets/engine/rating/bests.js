import { DAY_MS } from "../core/util.js";
import { SPECS } from "./kinds.js";
import { formatMetric } from "./format.js";
import { specFor } from "./rate.js";
/** The metric name a record is reported under: "views", or "views@24h" for a best start. */
export const recordMetric = (r) => (r.atAgeHours === undefined ? r.metric : `${r.metric}@${r.atAgeHours}h`);
const valid = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
export function personalBests(history, options = {}) {
    const snapshots = (Array.isArray(history) ? [...history] : [history]).sort((a, b) => Date.parse(a.provenance.checkedAt) - Date.parse(b.provenance.checkedAt));
    if (!snapshots.length)
        return [];
    const spec = specFor(snapshots[0].account.kind, options.specs ?? SPECS);
    const minPrevious = options.minPrevious ?? 3;
    const out = [];
    for (const record of spec.records)
        out.push(...recordEvents(spec, record, snapshots, minPrevious, options.includeBaseline ?? false));
    return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || (a.workId < b.workId ? -1 : a.workId > b.workId ? 1 : 0) || (a.metric < b.metric ? -1 : 1));
}
function recordEvents(spec, record, snapshots, minPrevious, includeBaseline) {
    const metric = recordMetric(record);
    const published = new Map();
    const readings = new Map();
    const settled = new Set();
    const events = [];
    const limitHours = record.atAgeHours;
    snapshots.forEach((snap, i) => {
        const t = Date.parse(snap.provenance.checkedAt);
        // Record this snapshot's readings first, so every work is compared at the same moment.
        const current = [];
        for (const work of snap.works) {
            if (work.kind !== spec.kind)
                continue;
            const pub = Date.parse(work.publishedAt);
            const value = work.metrics[record.metric];
            if (!Number.isFinite(pub) || pub > t || !valid(value))
                continue;
            published.set(work.id, pub);
            const ageHours = ((t - pub) / DAY_MS) * 24;
            const list = readings.get(work.id) ?? [];
            list.push({ t, ageHours, value });
            readings.set(work.id, list);
            current.push({ work, ageHours, value });
        }
        for (const { work, ageHours, value } of current) {
            if (settled.has(work.id))
                continue;
            if (limitHours !== undefined && ageHours > limitHours)
                continue;
            const rivals = rivalValues(readings, work.id, t, limitHours === undefined ? undefined : ageHours);
            if (rivals.length < minPrevious)
                continue;
            const previous = rivals.length ? Math.max(...rivals) : null;
            if (previous !== null && value <= previous)
                continue;
            settled.add(work.id);
            // In the first snapshot a record may have fallen long ago; that is history unless asked for.
            if (i === 0 && !includeBaseline)
                continue;
            events.push({ workId: work.id, metric, value, previous, at: snap.provenance.checkedAt });
        }
    });
    return events;
}
/**
  The best value each other work had: its latest reading up to time t, or for
  a best start, its latest reading at no more than the same age. Works we did
  not see that young are left out rather than guessed.
*/
function rivalValues(readings, self, t, atAgeHours) {
    const out = [];
    for (const [id, list] of readings) {
        if (id === self)
            continue;
        let best;
        for (const r of list) {
            if (r.t > t)
                continue;
            if (atAgeHours !== undefined && r.ageHours > atAgeHours)
                continue;
            if (!best || r.t > best.t)
                best = r;
        }
        // For a best start, a rival first seen far younger than this work is not a fair comparison.
        if (best && (atAgeHours === undefined || best.ageHours >= atAgeHours / 2))
            out.push(best.value);
    }
    return out;
}
/** The celebration line: "New personal best: most views on an upload (64,227). Your previous best was 51,002." */
export function personalBestLine(pb, kind, specs = SPECS) {
    const spec = specFor(kind, specs);
    const record = spec.records.find((r) => recordMetric(r) === pb.metric);
    const base = pb.metric.split("@")[0];
    const unit = spec.metrics.find((m) => m.key === base)?.unit ?? "count";
    const label = record?.label ?? pb.metric;
    const prev = pb.previous === null ? "" : ` Your previous best was ${formatMetric(unit, pb.previous)}.`;
    return `New personal best: ${label} (${formatMetric(unit, pb.value)}).${prev}`;
}
