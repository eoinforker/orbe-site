/*
  buildRecord: a creator's verified record, from core inputs only. The steps
  run in a fixed order because each depends on the last: decide what may be
  used, cross-check sources, decide what counts, then measure.
*/
import { audienceSignals, cadenceSignals } from "./audience.js";
import { runCrossChecks, TOLERANCES } from "./crosscheck.js";
import { figure } from "./figures.js";
import { buildFlags } from "./flags.js";
import { assignRoles, buildCoverage, counted } from "./ledger.js";
import { revenueMetrics } from "./metrics.js";
import { prepare } from "./prepare.js";
import { freshnessOf } from "./sources.js";
import { slug, sum } from "./util.js";
export function buildRecord(input, opts = {}) {
    const tol = { ...TOLERANCES, ...opts.tolerances };
    const prep = prepare(input, opts);
    // Materiality needs a rough year's revenue before the checks decide what counts.
    assignRoles(prep, new Map());
    const inTtm = new Set(prep.months);
    const ttmRevenue = sum(counted(prep.lines).filter((l) => inTtm.has(l.month)).map((l) => l.amount));
    const cross = runCrossChecks({ prep, tol, ttmRevenue, settlementSources: opts.settlementSources ?? ["stripe"] });
    assignRoles(prep, cross.supersede);
    const rating = addRatings(prep, input.rating);
    addDeclared(prep, input);
    const coverage = buildCoverage(prep);
    const metrics = {
        ...revenueMetrics(prep),
        audience: audienceSignals(prep, opts.benchmarks),
        cadence: cadenceSignals(prep),
        faceDependence: input.declared?.faceDependence ?? null,
    };
    const flags = buildFlags(prep, coverage, metrics);
    return {
        creatorId: input.creator.id,
        asOf: prep.asOf,
        currency: prep.currency,
        months: prep.months,
        history: prep.history,
        provenance: prep.provenance,
        lines: prep.lines,
        exclusions: prep.exclusions,
        coverage,
        findings: cross.findings,
        checks: cross.checks,
        metrics,
        flags,
        rating,
        accounts: prep.accounts,
        snapshots: prep.snapshots,
    };
}
/** The rating is accepted as data; its provenance is the published model version that produced it. */
function addRatings(prep, input) {
    const ratings = input ? (Array.isArray(input) ? input : [input]) : [];
    const known = new Set(prep.accounts.map((a) => a.id));
    return ratings
        .filter((r) => known.has(r.accountId))
        .map((r) => {
        // Ratings are computed from public reads, so they age like public YouTube data.
        const f = freshnessOf("youtube_public", r.computedAt, prep.now);
        const entry = {
            id: `p${prep.provenance.length + 1}`,
            source: "orbe_rating",
            label: `Orbe Rating, model ${r.modelVersion}`,
            accountId: prep.accounts.find((a) => a.id === r.accountId).platformId,
            basis: "public",
            firstCheckedAt: r.computedAt,
            lastCheckedAt: r.computedAt,
            freshness: f.status,
            ageDays: Math.floor(f.ageDays),
            lineCount: 0,
            snapshotCount: 0,
        };
        prep.provenance.push(entry);
        prep.provById.set(entry.id, entry);
        const handle = prep.accounts.find((a) => a.id === r.accountId).handle;
        return {
            rating: r,
            provId: entry.id,
            figure: figure(`rating.${slug(handle)}`, `Orbe Rating, @${handle} (${r.band})`, r.rating, "rating", [entry.id], { basis: "public" }),
        };
    });
}
function addDeclared(prep, input) {
    const face = input.declared?.faceDependence;
    if (!face)
        return;
    const entry = {
        id: `p${prep.provenance.length + 1}`,
        source: "declared",
        label: `Declared by the ${face.declaredBy.replace("_", " ")}`,
        accountId: input.creator.id,
        basis: "declared",
        firstCheckedAt: face.declaredAt,
        lastCheckedAt: face.declaredAt,
        freshness: "fresh",
        ageDays: 0,
        lineCount: 0,
        snapshotCount: 0,
    };
    prep.provenance.push(entry);
    prep.provById.set(entry.id, entry);
}
