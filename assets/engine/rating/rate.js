import { SPECS } from "./kinds.js";
import { formatDisplay } from "./format.js";
import { attributionFor } from "./label.js";
import { maturedOnly, measureFormat, prepare, primaryFormat, sizeBandOf, toMs, workRatio, pooledRatio } from "./measure.js";
import { offsetFor, priorFor, PROVISIONAL_PRIORS } from "./priors.js";
import { clampZ, linearZ, logZ, median, normalCdf, round } from "./stats.js";
/*
  The Orbe Rating. Like a match rating, zero is the typical creator of your
  kind and size: positive means your recent work does better than creators
  in your band, negative means it does worse. Each part is a z-score against
  the band's prior, shown as a percentile; the rating is twice the weighted
  mean of the z-scores, so it runs from -6 to +6 and most creators sit
  between -2 and +2.
*/
/** The rating scale: twice the weighted z-score, as in the original YouTube engine. */
export const RATING_SCALE = 2;
/** Named bands on the rating. Ties go away from Average, so +0.80 is Good and -0.80 is Subpar. */
export const RATING_BANDS = [
    { band: "Great", atLeast: 2 },
    { band: "Good", atLeast: 0.8 },
    { band: "Average", above: -0.8 },
    { band: "Subpar", above: -2 },
    { band: "Poor" },
];
export function bandFor(rating) {
    for (const b of RATING_BANDS) {
        if (b.atLeast !== undefined && rating >= b.atLeast)
            return b.band;
        if (b.above !== undefined && rating > b.above)
            return b.band;
        if (b.atLeast === undefined && b.above === undefined)
            return b.band;
    }
    return "Poor";
}
export const isRated = (r) => r.status === "rated";
export function specFor(kind, specs = SPECS) {
    const spec = specs[kind];
    if (!spec)
        throw new Error(`No rating spec for kind "${kind}"`);
    return spec;
}
/** Small samples are noisy, so their z-scores are pulled towards typical until there are enough works. */
export const shrinkFor = (n, fullWeightWorks) => Math.sqrt(Math.min(1, n / Math.max(fullWeightWorks, 1)));
const plural = (noun, n) => (n === 1 ? noun : `${noun}s`);
export function rate(snapshot, now, priors = PROVISIONAL_PRIORS, specs = SPECS) {
    const spec = specFor(snapshot.account.kind, specs);
    const nowMs = toMs(now);
    const computedAt = new Date(nowMs).toISOString();
    const audience = Math.max(snapshot.account.audience, 0);
    const band = sizeBandOf(spec, audience);
    const prepared = prepare(spec, snapshot.works, nowMs);
    const format = primaryFormat(spec, prepared);
    const m = measureFormat(spec, snapshot, prepared, format);
    const fmt = spec.formats.find((f) => f.key === format);
    const base = {
        accountId: snapshot.account.id,
        kind: spec.kind,
        title: snapshot.account.title,
        sizeBand: band.label,
        modelVersion: priors.version,
        computedAt,
        attribution: attributionFor(spec.kind),
    };
    if (m.pool.length < spec.minWorks) {
        const total = prepared.length;
        const young = total - maturedOnly(spec, prepared).length;
        const noun = plural(fmt.noun, 2);
        const ageNote = spec.minAgeDays > 0 ? ` that are at least ${spec.minAgeDays} ${plural("day", spec.minAgeDays)} old` : "";
        const have = total === 0 ? "There are none yet." : `So far there ${total === 1 ? "is" : "are"} ${total}${young ? `, ${young} of them still too new to count` : ""}.`;
        return {
            ...base,
            status: "not_enough_work",
            reason: "too_few_works",
            have: m.pool.length,
            need: spec.minWorks,
            message: `Not enough work yet. Orbe rates a ${spec.name} once it has ${spec.minWorks} ${noun}${ageNote}, so the rating reflects a pattern rather than one lucky or unlucky ${fmt.noun}. ${have}`,
        };
    }
    const parts = [];
    const unavailable = [];
    for (const part of spec.parts) {
        const got = m.parts[part.key];
        if (!got) {
            unavailable.push(part.key);
            continue;
        }
        const prior = priorFor(priors, spec, format, band.key, part);
        const z0 = part.scale === "log" ? logZ(got.value, prior.median, prior.sigma) : linearZ(got.value, prior.median, prior.sigma);
        // Cadence is not a sample of works: a low count is itself the signal, so it is never shrunk.
        const shrink = part.measure.type === "cadence" ? 1 : shrinkFor(got.n, spec.fullWeightWorks);
        const shown = formatDisplay(part.display, got.display);
        parts.push({
            key: part.key,
            name: part.name,
            weight: part.weight,
            effectiveWeight: 0,
            measured: got.value,
            display: shown.value,
            raw: shown.raw,
            z: clampZ(z0 * shrink),
            shrink,
            n: got.n,
            prior,
            advice: part.advice,
        });
    }
    const available = parts.reduce((s, p) => s + p.weight, 0);
    if (available < spec.minWeightAvailable) {
        return {
            ...base,
            status: "not_enough_work",
            reason: "missing_metrics",
            have: Math.round(available * 100),
            need: Math.round(spec.minWeightAvailable * 100),
            message: `Not enough data yet. The numbers Orbe can read for this ${spec.name} cover only ${Math.round(available * 100)}% of the rating, and it needs at least ${Math.round(spec.minWeightAvailable * 100)}%. Connecting the account usually fills the gap.`,
        };
    }
    for (const p of parts)
        p.effectiveWeight = p.weight / available;
    const rawRating = RATING_SCALE * parts.reduce((s, p) => s + p.effectiveWeight * p.z, 0);
    const offset = offsetFor(priors, spec.kind, band.key);
    const rating = round(rawRating - offset);
    const subScores = parts.map((p) => {
        const part = spec.parts.find((x) => x.key === p.key);
        return { key: p.key, name: p.name, score: Math.round(normalCdf(p.z) * 100), value: p.display, what: part.what };
    });
    return {
        ...base,
        status: "rated",
        rating,
        band: bandFor(rating),
        parts: subScores,
        detail: {
            format,
            formatName: fmt.name,
            workNoun: fmt.noun,
            bandKey: band.key,
            works: m.pool.length,
            typical: m.typical,
            parts,
            unavailable,
            confidence: m.pool.length < spec.fullWeightWorks ? "low" : "normal",
            rawRating: round(rawRating, 4),
            offset,
            provisional: parts.some((p) => p.prior.source === "provisional"),
            workRatings: scoreWorks(spec, prepared, audience),
        },
    };
}
function baselineFor(spec, prepared, format, audience) {
    const matured = maturedOnly(spec, prepared);
    const same = matured.filter((p) => p.format === format).slice(0, spec.maxWorks);
    const pool = same.length >= spec.minWorks ? same : matured.slice(0, spec.maxWorks);
    const primaries = pool.map((p) => p.matured[spec.work.primary]).filter((x) => x !== undefined);
    if (!primaries.length)
        return undefined;
    const sec = spec.work.secondary;
    const secondary = sec ? pooledRatio(pool.map((p) => workRatio(p, sec.numerator, sec.denominator, audience)).filter((x) => x !== undefined), spec.influenceCap) : undefined;
    return { median: median(primaries), secondary };
}
function scoreOne(spec, p, base, audience) {
    const primary = p.matured[spec.work.primary];
    if (primary === undefined)
        return undefined;
    const multiple = primary / Math.max(base.median, 1e-9);
    const zPrimary = clampZ(Math.log(Math.max(multiple, 1e-3)) / spec.work.sigma);
    const sec = spec.work.secondary;
    const ratio = sec ? workRatio(p, sec.numerator, sec.denominator, audience) : undefined;
    const useSecondary = sec && ratio && base.secondary !== undefined && base.secondary > 0;
    const z = useSecondary ? (1 - sec.weight) * zPrimary + sec.weight * logZ(ratio.ratio, base.secondary, sec.sigma) : zPrimary;
    return {
        workId: p.work.id,
        rating: round(RATING_SCALE * z),
        multiple: round(multiple, 3),
        format: p.format,
        ageDays: round(p.ageDays, 3),
        matured: p.ageDays >= spec.minAgeDays,
    };
}
function scoreWorks(spec, prepared, audience) {
    const baselines = new Map();
    const out = [];
    for (const p of prepared) {
        if (!baselines.has(p.format))
            baselines.set(p.format, baselineFor(spec, prepared, p.format, audience));
        const base = baselines.get(p.format);
        const scored = base && scoreOne(spec, p, base, audience);
        if (scored)
            out.push(scored);
    }
    return out;
}
/**
  A rating for every work in the snapshot, young ones included, so a creator
  can see how a new upload is tracking minutes after posting. Each is judged
  against the creator's own median, so a work at their typical level is zero.
*/
export function rateWorks(snapshot, now, specs = SPECS) {
    const spec = specFor(snapshot.account.kind, specs);
    return scoreWorks(spec, prepare(spec, snapshot.works, toMs(now)), Math.max(snapshot.account.audience, 0));
}
/** The rating of one work against the creator's own body of work in the snapshot. */
export function rateWork(work, snapshot, now, specs = SPECS) {
    const spec = specFor(snapshot.account.kind, specs);
    const nowMs = toMs(now);
    const others = snapshot.works.filter((w) => w.id !== work.id);
    const prepared = prepare(spec, [...others, work], nowMs);
    const target = prepared.find((p) => p.work.id === work.id);
    if (!target)
        return undefined;
    const audience = Math.max(snapshot.account.audience, 0);
    const base = baselineFor(spec, prepared, target.format, audience);
    return base && scoreOne(spec, target, base, audience);
}
/**
  Your #1 stat: the part you score highest on against creators your size.
  Ties go to the part listed first in the spec, which is the heavier one.
*/
export function topStat(rating, specs = SPECS) {
    if ("status" in rating && rating.status !== "rated")
        return null;
    const r = rating;
    if (!r.parts.length)
        return null;
    let best = r.parts[0];
    for (const p of r.parts)
        if (p.score > best.score)
            best = p;
    const peers = specs[r.kind]?.peers ?? "creators";
    const provisional = "detail" in r && r.detail.parts.find((p) => p.key === best.key)?.prior.source === "provisional";
    const line = `Your #1 stat: ${best.name}, ${best.value}. Better than ${best.score} in 100 ${peers} your size${provisional ? " on provisional benchmarks" : ""}.`;
    return { ...best, line };
}
/** The parts to work on: the two weakest below typical, with advice. Celebration comes first, so never more than two. */
export function focusAreas(result) {
    if (!isRated(result))
        return [];
    return result.parts
        .filter((p) => p.score < 50)
        .sort((a, b) => a.score - b.score || (a.key < b.key ? -1 : 1))
        .slice(0, 2)
        .map((p) => ({ key: p.key, name: p.name, score: p.score, advice: result.detail.parts.find((d) => d.key === p.key).advice }));
}
