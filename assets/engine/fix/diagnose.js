import { DAY_MS } from "../core/util.js";
import { Z_QUARTILE, predictFromPrepared, predictRange } from "../loop/predict.js";
import { formatOf, maturedShare, prepare, toMs } from "../rating/measure.js";
import { specFor } from "../rating/rate.js";
/** Orbe Fix changes titles and thumbnails, which only YouTube has the permissions for. */
export const FIX_KIND = "youtube";
/**
  PROVISIONAL: an upload is judged once it is a day old (too early and the
  first hours say little) and no later than 60 days (after that a new title
  has too few views left to lift). The candidate line is the lower quartile
  of uploads by creators the same size at the same age.
*/
export const FIX_MIN_AGE_DAYS = 1;
export const FIX_MAX_AGE_DAYS = 60;
export const UNDER_Z = -Z_QUARTILE;
/** PROVISIONAL: click-through more than a fifth below the creator's own typical counts as a packaging problem. */
export const CTR_SHORTFALL = 0.8;
const round = (x) => Math.round(x);
export function diagnose(input) {
    const { work } = input;
    const nowMs = toMs(input.now);
    const ageDays = (nowMs - Date.parse(work.publishedAt)) / DAY_MS;
    const spec = specFor(FIX_KIND);
    const format = formatOf(spec, work.durationSec);
    const views = typeof work.metrics.views === "number" && work.metrics.views >= 0 ? work.metrics.views : null;
    const base = { workId: work.id, ageDays, views, format, styleHints: [...(input.styleHints ?? [])] };
    const none = { sizeBand: null, expected: null, z: null, ownMultiple: null, target: null };
    if (work.kind !== FIX_KIND)
        return { ...base, ...none, status: "not_eligible", why: "Orbe Fix works on YouTube uploads only: other platforms give no way to change a title or thumbnail." };
    if (views === null)
        return { ...base, ...none, status: "not_eligible", why: "The upload has no view count, so there is nothing to judge." };
    if (!(ageDays >= FIX_MIN_AGE_DAYS))
        return { ...base, ...none, status: "too_young", why: `Too early to judge: wait until the upload is ${FIX_MIN_AGE_DAYS} day old.` };
    if (ageDays > FIX_MAX_AGE_DAYS)
        return { ...base, ...none, status: "too_old", why: `Over ${FIX_MAX_AGE_DAYS} days old: too few views are left for a new title or thumbnail to lift.` };
    const bench = predictRange({ work: { id: work.id, kind: FIX_KIND, durationSec: work.durationSec }, creatorId: "", accountId: "", audience: input.audience, history: [], now: nowMs, priors: input.priors });
    if ("status" in bench)
        return { ...base, ...none, status: "not_eligible", why: bench.reason };
    const viewsSpec = spec.metrics.find((m) => m.key === "views");
    const share = maturedShare(viewsSpec?.maturity, ageDays);
    const centre = Math.log(bench.inputs.benchmarkMedian * share);
    const sigma = bench.inputs.benchmarkSigma;
    const expected = { p25: round(Math.exp(centre - Z_QUARTILE * sigma)), median: round(Math.exp(centre)), p75: round(Math.exp(centre + Z_QUARTILE * sigma)) };
    const z = (Math.log(Math.max(views, 1)) - centre) / sigma;
    const own = input.history?.length
        ? predictFromPrepared({ work: { id: work.id, kind: FIX_KIND, durationSec: work.durationSec }, creatorId: "", accountId: "", audience: input.audience, now: nowMs, priors: input.priors }, preparedHistory(input.history, nowMs).filter((p) => p.work.id !== work.id))
        : null;
    const ownMedian = own && !("status" in own) ? own.inputs.ownMedian : null;
    const ownMultiple = ownMedian ? views / (ownMedian * share) : null;
    const found = { ...base, sizeBand: bench.sizeBand, expected, z, ownMultiple };
    if (z > UNDER_Z) {
        return { ...found, status: "on_track", target: null, why: `On track: ${views.toLocaleString("en-GB")} views at ${ageDays.toFixed(1)} days, inside the middle range for creators the same size (${expected.p25.toLocaleString("en-GB")} to ${expected.p75.toLocaleString("en-GB")}). Nothing to fix.` };
    }
    const { target, reason } = targetFor(input.ctr);
    return {
        ...found,
        status: "underperforming",
        target,
        why: `Below creators the same size: ${views.toLocaleString("en-GB")} views at ${ageDays.toFixed(1)} days, where the lower quartile is ${expected.p25.toLocaleString("en-GB")}. ${reason}`,
    };
}
/*
  The creator's history, prepared once per list and moment. A list of uploads
  is diagnosed against the same history, so preparing it again for each one
  repeated the same work hundreds of times; leaving one work out of the
  prepared list is the same as preparing the list without it.
*/
const PREPARED = new WeakMap();
function preparedHistory(history, nowMs) {
    const hit = PREPARED.get(history);
    if (hit && hit.nowMs === nowMs)
        return hit.prepared;
    const prepared = prepare(specFor(FIX_KIND), history, nowMs);
    PREPARED.set(history, { nowMs, prepared });
    return prepared;
}
function targetFor(ctr) {
    if (!ctr || !(ctr.typical > 0))
        return { target: "both", reason: "Without click-through from YouTube Analytics we cannot tell a weak thumbnail from a weak title, so options cover both." };
    if (ctr.work < ctr.typical * CTR_SHORTFALL)
        return { target: "both", reason: `People see it and do not click: click-through is ${(ctr.work * 100).toFixed(1)}% against your typical ${(ctr.typical * 100).toFixed(1)}%, so the packaging is the lever.` };
    return { target: "title", reason: "Click-through is normal, so YouTube is showing it to fewer people. A clearer title can help search and suggestions; a new thumbnail is unlikely to." };
}
