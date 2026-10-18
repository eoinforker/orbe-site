/*
  Reading a work's delivery at an age: views at 7 days, downloads at 30 days.

  A work's count keeps growing, so "views" alone means nothing for a
  sponsorship; the figure has to be tied to an age. Three ways to get one, in
  order of how exact they are:
  1. range: a connected per-work read over exactly the first N days
     (YouTube Analytics with a date range starting on the publish date);
  2. window: the platform's own windowed count (podcast downloads_7d);
  3. snapshot: a read of the work taken at age N, or a few days later
     within the format's tolerance. Never earlier: a reading before day N
     would understate it and could never be fair to the creator.
  Among equally exact readings, the more trusted source wins (spec.sources order).
*/
import { daysBetween } from "./util.js";
/** A read whose platform terms say it must already be deleted (YouTube's 30 days) is never used. */
export const notExpired = (at) => (p) => !p.deleteBy || Date.parse(p.deleteBy) > Date.parse(at);
const HOW_RANK = { range: 0, window: 1, snapshot: 2 };
const dateOnly = (iso) => iso.slice(0, 10);
function better(spec, a, b) {
    const sa = spec.sources.indexOf(a.provenance.source);
    const sb = spec.sources.indexOf(b.provenance.source);
    if (HOW_RANK[a.how] !== HOW_RANK[b.how])
        return HOW_RANK[a.how] < HOW_RANK[b.how] ? a : b;
    if (sa !== sb)
        return sa >= 0 && (sb < 0 || sa < sb) ? a : b;
    // Closest to the window is fairest; later reads of a windowed count are equally exact, so prefer the newest.
    if (a.how === "snapshot" && a.ageDays !== b.ageDays)
        return a.ageDays < b.ageDays ? a : b;
    return Date.parse(a.provenance.checkedAt) >= Date.parse(b.provenance.checkedAt) ? a : b;
}
const isNumber = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
function fromSnapshot(spec, work, snap, day) {
    const age = daysBetween(work.publishedAt, snap.provenance.checkedAt);
    if (age < day)
        return null;
    const windowed = spec.windowedMetric?.[day];
    if (windowed) {
        const v = work.metrics[windowed];
        return isNumber(v) ? { workId: work.id, accountId: work.accountId, day, value: v, ageDays: age, how: "window", provenance: snap.provenance } : null;
    }
    if (age > day + (spec.lateToleranceDays[day] ?? 0))
        return null;
    const v = work.metrics[spec.metric];
    return isNumber(v) ? { workId: work.id, accountId: work.accountId, day, value: v, ageDays: age, how: "snapshot", provenance: snap.provenance } : null;
}
function fromRange(spec, work, wm, day) {
    if (wm.workId !== work.id)
        return null;
    if (wm.range.start !== dateOnly(work.publishedAt))
        return null;
    const span = Math.round(daysBetween(`${wm.range.start}T00:00:00Z`, `${wm.range.end}T00:00:00Z`)) + 1;
    if (span !== day)
        return null;
    // A range read before it closed is still filling in.
    if (Date.parse(wm.provenance.checkedAt) < Date.parse(`${wm.range.end}T00:00:00Z`) + 864e5)
        return null;
    const v = wm.metrics[spec.metric];
    if (!isNumber(v))
        return null;
    return { workId: work.id, accountId: work.accountId, day, value: v, ageDays: daysBetween(work.publishedAt, wm.provenance.checkedAt), how: "range", provenance: wm.provenance };
}
/** The best reading of one work at one window, or null if no usable read stands for it. */
export function readAt(spec, work, day, sources, usable) {
    let best = null;
    const consider = (r) => {
        if (r && usable(r.provenance) && spec.sources.includes(r.provenance.source))
            best = best ? better(spec, best, r) : r;
    };
    for (const wm of sources.workMetrics ?? [])
        consider(fromRange(spec, work, wm, day));
    for (const snap of sources.snapshots) {
        for (const w of snap.works)
            if (w.id === work.id)
                consider(fromSnapshot(spec, w, snap, day));
    }
    return best;
}
/** Whether a work belongs to the format's history: right kind, and long-form where the format needs it. */
export function fitsFormat(spec, work) {
    if (work.kind !== spec.kind)
        return false;
    const d = spec.durationSec;
    if (!d)
        return true;
    // Unknown duration (0) is let through: excluding it would drop whole connectors that do not report length.
    if (work.durationSec === 0)
        return true;
    return (d.min === undefined || work.durationSec >= d.min) && (d.max === undefined || work.durationSec <= d.max);
}
/** Every distinct work in the snapshots, newest version of each, newest published first. */
export function worksIn(snapshots) {
    const byId = new Map();
    for (const s of snapshots) {
        const at = Date.parse(s.provenance.checkedAt);
        for (const w of s.works) {
            const prev = byId.get(w.id);
            if (!prev || prev.at < at)
                byId.set(w.id, { w, at });
        }
    }
    return [...byId.values()].map((x) => x.w).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
}
