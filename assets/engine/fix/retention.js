/*
  Where viewers leave an upload, and where it could be cut.

  Read from YouTube Analytics' audience retention report for one video:
  audienceWatchRatio (the share of viewers still watching at each point, by
  elapsedVideoTimeRatio, 0 to 1 in hundredths) and, where YouTube gives it,
  relativeRetentionPerformance (0 to 1, where 0.5 is typical for YouTube
  videos of a similar length; YouTube's comparison, not creators the same
  size). Read only: this suggests, it changes nothing.

  Three findings, each with its time in seconds:
  - the opening: how many are still there after the first stretch (30
    seconds, or a tenth of a short upload), against typical when given;
  - drops: the steepest falls after the opening, larger than the upload's
    own usual fall between points by DROP_FACTOR and by at least DROP_MIN;
  - cuts: stretches after the opening that fall faster than usual and sit
    below typical, up to MAX_CUTS, each a candidate to tighten or remove.
  Every threshold is provisional, chosen by judgement until measured edits
  let us fit them.
*/
export const RETENTION_VERSION = "retention-2026-10";
/** PROVISIONAL: a fall counts as a drop when it is this many times the upload's median fall between points. */
export const DROP_FACTOR = 2.5;
/** PROVISIONAL: and at least this share of the audience (three points). */
export const DROP_MIN = 0.03;
/** PROVISIONAL: relativeRetentionPerformance below this is below typical; above 1 - this, above. */
export const TYPICAL_BAND = 0.35;
/** At most this many cut suggestions. */
export const MAX_CUTS = 3;
const round = (n, places = 3) => Math.round(n * 10 ** places) / 10 ** places;
export function readRetention(points, durationSec) {
    if (!Number.isFinite(durationSec) || durationSec <= 0)
        throw new Error("durationSec must be a positive number of seconds");
    const pts = points
        .filter((p) => Number.isFinite(p.at) && Number.isFinite(p.watch) && p.at >= 0 && p.at <= 1)
        .sort((a, b) => a.at - b.at);
    if (pts.length < 5)
        throw new Error("At least five retention points are needed, from 0 to 1 of the upload");
    const sec = (at) => Math.round(at * durationSec);
    // The opening: 30 seconds, or a tenth of the upload when that is shorter.
    const openAt = Math.min(30 / durationSec, 0.1);
    const opening = pts.find((p) => p.at >= openAt) ?? pts[pts.length - 1];
    const vsTypical = (r) => (r === null || r === undefined ? null : r < TYPICAL_BAND ? "below" : r > 1 - TYPICAL_BAND ? "above" : "typical");
    const falls = pts.slice(1).map((p, i) => ({ from: pts[i], to: p, fell: pts[i].watch - p.watch }));
    const after = falls.filter((f) => f.from.at >= opening.at);
    const sorted = after.map((f) => f.fell).filter((x) => x > 0).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const isDrop = (f) => f.fell >= DROP_MIN && f.fell >= median * DROP_FACTOR;
    const drops = after
        .filter(isDrop)
        .sort((a, b) => b.fell - a.fell)
        .slice(0, 5)
        .sort((a, b) => a.from.at - b.from.at)
        .map((f) => ({ fromSec: sec(f.from.at), toSec: sec(f.to.at), fell: round(f.fell), atShare: round(f.from.at, 2) }));
    // Cuts: runs of falls after the opening that are faster than usual and, where given, below typical.
    const weak = (f) => f.fell > Math.max(median * 1.5, 0.005) && (f.to.relative === undefined || f.to.relative === null || f.to.relative < TYPICAL_BAND);
    const runs = [];
    for (const f of after) {
        if (!weak(f))
            continue;
        const last = runs[runs.length - 1];
        if (last && Math.abs(last.to - f.from.at) < 1e-9) {
            last.to = f.to.at;
            last.fell += f.fell;
        }
        else
            runs.push({ from: f.from.at, to: f.to.at, fell: f.fell });
    }
    const cuts = runs
        .filter((r) => r.fell >= DROP_MIN && r.to < 0.97)
        .sort((a, b) => b.fell - a.fell)
        .slice(0, MAX_CUTS)
        .sort((a, b) => a.from - b.from)
        .map((r) => ({
        fromSec: sec(r.from),
        toSec: sec(r.to),
        why: `${Math.round(r.fell * 100)} in every 100 viewers left here, faster than the rest of the upload${pts.some((p) => p.relative !== undefined && p.relative !== null) ? ", and below typical for videos this long" : ""}. Worth tightening or cutting.`,
    }));
    return {
        durationSec,
        opening: { sec: sec(opening.at), stillWatching: round(opening.watch), vsTypical: vsTypical(opening.relative) },
        drops,
        cuts,
        endWatching: round(pts[pts.length - 1].watch),
        basis: "YouTube Analytics' audience retention for this video. Typical means YouTube's comparison with videos of a similar length, not creators the same size.",
        version: RETENTION_VERSION,
    };
}
