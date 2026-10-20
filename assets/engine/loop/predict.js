import { sha256Hex } from "../core/hash.js";
import { DAY_MS } from "../core/util.js";
import { formatOf, maturedShare, poolFor, prepare, sizeBandOf, toMs } from "../rating/measure.js";
import { MODEL_VERSION, PROVISIONAL_PRIORS, fitValues, priorFor } from "../rating/priors.js";
import { shrinkFor, specFor } from "../rating/rate.js";
import { AUDIENCE } from "../rating/spec.js";
import { median } from "../rating/stats.js";
/** The predictor's own version. A change to how inputs are combined bumps it; the rating's MODEL_VERSION travels beside it. */
export const PREDICTOR_VERSION = "loop-1";
/** The horizon every prediction is made for, in days after release. */
export const HORIZON_DAYS = 30;
/** z for the 25th and 75th percentiles of a standard normal. */
export const Z_QUARTILE = 0.6744897501960817;
/** The rating part that measures reach as one metric over the audience (or over a metric such as recipients). */
export function reachPart(spec) {
    return (spec.parts.find((p) => p.key === "reach" && p.measure.type === "ratio" && p.measure.numerator.length === 1) ??
        spec.parts.find((p) => p.measure.type === "ratio" && p.measure.numerator.length === 1 && p.measure.denominator === AUDIENCE));
}
/**
  The range for one upcoming work, before sealing. Returns a reason instead
  when there is neither a benchmark nor enough history to say anything.
*/
export function predictRange(input) {
    const spec = specFor(input.work.kind);
    const part = reachPart(spec);
    if (!part || part.measure.type !== "ratio")
        return { status: "no_prediction", reason: `No reach measure for ${spec.name}.` };
    const metric = part.measure.numerator[0];
    const denominator = part.measure.denominator;
    const metricSpec = spec.metrics.find((m) => m.key === metric);
    const audience = Math.max(0, Math.round(input.audience));
    const band = sizeBandOf(spec, audience);
    const format = formatOf(spec, input.work.durationSec ?? 0);
    const nowMs = toMs(input.now);
    const pool = poolFor(spec, prepare(spec, input.history, nowMs), format);
    const own = pool.map((p) => p.matured[metric]).filter((v) => typeof v === "number" && v >= 0);
    // The benchmark: prior median ratio times the denominator this work will face.
    const prior = priorFor(input.priors ?? PROVISIONAL_PRIORS, spec, format, band.key, part);
    const denoms = denominator === AUDIENCE ? [] : pool.map((p) => p.matured[denominator]).filter((v) => typeof v === "number" && v > 0);
    const base = denominator === AUDIENCE || !denoms.length ? audience : median(denoms);
    const benchmarkMedian = prior.median * base;
    const benchmarkSigma = Math.sqrt(prior.sigma ** 2 + spec.work.sigma ** 2);
    const n = own.length;
    const ownWeight = n >= spec.minWorks ? shrinkFor(n, spec.fullWeightWorks) : 0;
    if (!(benchmarkMedian > 0) && ownWeight === 0) {
        return { status: "no_prediction", reason: `Need ${spec.minWorks} matured works or an audience figure to predict from.` };
    }
    const fit = n >= spec.minWorks ? fitValues(own, "log", spec.work.sigma) : null;
    let centre;
    let sigma;
    if (!(benchmarkMedian > 0)) {
        centre = Math.log(fit.median);
        sigma = fit.sigma;
    }
    else {
        const ownLog = fit ? Math.log(Math.max(fit.median, 1e-6)) : 0;
        centre = ownWeight * ownLog + (1 - ownWeight) * Math.log(benchmarkMedian);
        sigma = ownWeight * (fit?.sigma ?? 0) + (1 - ownWeight) * benchmarkSigma;
    }
    const horizonShare = maturedShare(metricSpec?.maturity, HORIZON_DAYS);
    const at = (z) => Math.round(Math.exp(centre + z * sigma) * horizonShare);
    return {
        metric,
        sizeBand: band.key,
        range: { p25: at(-Z_QUARTILE), p75: at(Z_QUARTILE) },
        inputs: {
            audience,
            format,
            metric,
            part: part.key,
            ownWorks: n,
            ownMedian: fit ? fit.median : null,
            ownSigma: fit ? fit.sigma : null,
            benchmarkMedian,
            benchmarkSigma,
            benchmarkSource: prior.source,
            ownWeight,
            horizonShare,
        },
    };
}
/* ---------------------------------------------------------------- sealing */
/** JSON with keys sorted at every level and no whitespace, so the same body always hashes the same. */
export function canonicalJSON(value) {
    if (value === null || typeof value !== "object") {
        if (typeof value === "number" && !Number.isFinite(value))
            throw new Error("Cannot seal a non-finite number");
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
        return `[${value.map(canonicalJSON).join(",")}]`;
    const entries = Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJSON(v)}`).join(",")}}`;
}
/** The seal: SHA-256 (core/hash.ts) of the canonical body, which includes the previous seal. */
export const sealOf = (body) => sha256Hex(canonicalJSON(body));
export function seal(body) {
    return { ...body, seal: sealOf(body) };
}
const bodyOf = (p) => {
    const { seal: _seal, ...body } = p;
    return body;
};
/** True when nothing in the prediction has changed since it was sealed. */
export const verifySeal = (p) => sealOf(bodyOf(p)) === p.seal;
/**
  Checks a creator's predictions in the order they were sealed. Each must
  verify, point at the seal before it, and be made no earlier than the one
  before it, so a prediction cannot be slipped in later with an old date:
  it would need every later seal rewritten, and those have been shown.
  A prediction made after its own release date is flagged too.
*/
export function verifyChain(chain) {
    const problems = [];
    chain.forEach((p, i) => {
        if (!verifySeal(p))
            problems.push({ index: i, id: p.id, problem: "tampered" });
        const before = chain[i - 1];
        if ((before?.seal ?? null) !== p.prev)
            problems.push({ index: i, id: p.id, problem: "broken_link" });
        if (before && Date.parse(p.madeAt) < Date.parse(before.madeAt))
            problems.push({ index: i, id: p.id, problem: "out_of_order" });
        if (p.releaseAt && Date.parse(p.madeAt) >= Date.parse(p.releaseAt))
            problems.push({ index: i, id: p.id, problem: "after_release" });
    });
    return problems;
}
/**
  Predicts and seals in one step. `prev` is the creator's last seal, so the
  new prediction joins their chain. `id` is supplied by the caller (core id()
  server side), so this stays deterministic and testable.
*/
export function predict(input) {
    const r = predictRange(input);
    if ("status" in r)
        return r;
    const madeAt = new Date(toMs(input.now)).toISOString();
    const releaseAt = input.work.releaseAt ?? null;
    if (releaseAt && Date.parse(releaseAt) <= Date.parse(madeAt)) {
        return { status: "no_prediction", reason: "The work is already out: a prediction must be sealed before release." };
    }
    return seal({
        id: input.id,
        workId: input.work.id,
        creatorId: input.creatorId,
        accountId: input.accountId,
        kind: input.work.kind,
        sizeBand: r.sizeBand,
        metric: r.metric,
        horizonDays: HORIZON_DAYS,
        range: r.range,
        inputs: r.inputs,
        modelVersion: `${PREDICTOR_VERSION}/${MODEL_VERSION}`,
        madeAt,
        releaseAt,
        prev: input.prev,
    });
}
export const isPrediction = (p) => !("status" in p);
/** Days since release at a moment, for outcome readings. */
export const daysSince = (releaseAt, at) => (Date.parse(at) - Date.parse(releaseAt)) / DAY_MS;
