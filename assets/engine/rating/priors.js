import { SPECS } from "./kinds.js";
import { measureFormat, prepare, toMs } from "./measure.js";
import { LOG_FLOOR, median, robustSigma } from "./stats.js";
/*
  Priors: for each kind, format, size band and part, the typical value and
  how widely creators spread around it. They start provisional (the guesses
  in kinds.ts) and are replaced, cell by cell, by distributions measured from
  creators who consented to be counted. A table is versioned, so every rating
  says which maths produced it, and old ratings can be explained later.
*/
/** The published maths version. Bump it whenever a spec, a prior or the engine changes a number. */
export const MODEL_VERSION = "2026.10";
/** A measured prior needs at least this many consented creators in its cell before it replaces the provisional one. */
export const DEFAULT_MIN_SAMPLE = 30;
/** A measured spread is never allowed below this share of the provisional one, so a tight early cohort cannot make everyone extreme. */
export const SIGMA_FLOOR_SHARE = 0.25;
export const priorKey = (kind, format, band, part) => `${kind}/${format}/${band}/${part}`;
export function provisionalPrior(part, format, band) {
    const source = part.prior.formats?.[format] ?? part.prior;
    const median = typeof source.median === "number" ? source.median : source.median[band];
    return { median, sigma: source.sigma, n: 0, source: "provisional" };
}
export function provisionalPriors(specs = SPECS, version = MODEL_VERSION, createdAt = "2026-10-01T00:00:00.000Z") {
    const entries = {};
    for (const spec of Object.values(specs)) {
        if (!spec)
            continue;
        for (const f of spec.formats)
            for (const b of spec.sizeBands)
                for (const p of spec.parts)
                    entries[priorKey(spec.kind, f.key, b.key, p.key)] = provisionalPrior(p, f.key, b.key);
    }
    return { version, createdAt, minSample: DEFAULT_MIN_SAMPLE, entries, offsets: {} };
}
/** The provisional table every rating uses until measured priors are published. */
export const PROVISIONAL_PRIORS = provisionalPriors();
export function priorFor(priors, spec, format, band, part) {
    return priors.entries[priorKey(spec.kind, format, band, part.key)] ?? provisionalPrior(part, format, band);
}
export function offsetFor(priors, kind, band) {
    return priors.offsets[`${kind}/${band}`] ?? priors.offsets[kind] ?? 0;
}
/** Fits a median and spread to measured values on the part's own scale. */
export function fitValues(values, scale, provisionalSigma) {
    const floor = SIGMA_FLOOR_SHARE * provisionalSigma;
    if (scale === "log") {
        const logs = values.map((v) => Math.log(Math.max(v, LOG_FLOOR)));
        return { median: Math.exp(median(logs)), sigma: Math.max(robustSigma(logs), floor) };
    }
    return { median: median(values), sigma: Math.max(robustSigma(values), floor) };
}
/** One snapshot per account, the most recently checked, so nobody is counted twice. */
export function latestPerAccount(snapshots) {
    const byAccount = new Map();
    for (const s of snapshots) {
        const seen = byAccount.get(s.account.id);
        if (!seen || Date.parse(s.provenance.checkedAt) > Date.parse(seen.provenance.checkedAt))
            byAccount.set(s.account.id, s);
    }
    return [...byAccount.values()].sort((a, b) => (a.account.id < b.account.id ? -1 : 1));
}
/** Gathers every consented creator's measurement into its prior cell. */
export function sampleCells(snapshots, now, specs = SPECS) {
    const cells = new Map();
    const nowMs = toMs(now);
    for (const snapshot of latestPerAccount(snapshots)) {
        const spec = specs[snapshot.account.kind];
        if (!spec)
            continue;
        const prepared = prepare(spec, snapshot.works, nowMs);
        // A creator who makes both Shorts and long-form counts towards both, each on its own works.
        for (const f of spec.formats) {
            const m = measureFormat(spec, snapshot, prepared, f.key);
            if (m.pool.length < spec.minWorks)
                continue;
            for (const part of spec.parts) {
                const v = m.parts[part.key];
                if (!v)
                    continue;
                const key = priorKey(spec.kind, f.key, m.band.key, part.key);
                const list = cells.get(key) ?? [];
                list.push(v.value);
                cells.set(key, list);
            }
        }
    }
    return cells;
}
/**
  Fits priors from consented snapshots. Cells with at least `minSample`
  creators get a measured median and spread; the rest keep the base table's
  prior. Offsets are cleared, because they belonged to the old medians:
  run recalibrate() on the season's cohort afterwards.
*/
export function fitPriors(snapshots, options) {
    const specs = options.specs ?? SPECS;
    const base = options.base ?? PROVISIONAL_PRIORS;
    const minSample = options.minSample ?? base.minSample ?? DEFAULT_MIN_SAMPLE;
    if (options.version === base.version)
        throw new Error(`Fitted priors need a new version, not ${base.version}`);
    const counted = options.include ? snapshots.filter(options.include) : snapshots;
    const cells = sampleCells(counted, options.now, specs);
    const entries = {};
    for (const spec of Object.values(specs)) {
        if (!spec)
            continue;
        for (const f of spec.formats)
            for (const b of spec.sizeBands)
                for (const part of spec.parts) {
                    const key = priorKey(spec.kind, f.key, b.key, part.key);
                    const before = base.entries[key] ?? provisionalPrior(part, f.key, b.key);
                    const values = cells.get(key) ?? [];
                    entries[key] =
                        values.length >= minSample
                            ? { ...fitValues(values, part.scale, provisionalPrior(part, f.key, b.key).sigma), n: values.length, source: "measured" }
                            : { ...before, n: values.length };
                }
    }
    return {
        version: options.version,
        createdAt: options.createdAt ?? new Date(toMs(options.now)).toISOString(),
        basedOn: base.version,
        minSample,
        entries,
        offsets: {},
    };
}
