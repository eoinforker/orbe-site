/** "audience" in a denominator means the account's audience rather than a metric of the work. */
export const AUDIENCE = "audience";
/** Checks a spec is internally consistent. Returns the problems found; empty means valid. */
export function validateSpec(spec) {
    const problems = [];
    const metricKeys = new Set(spec.metrics.map((m) => m.key));
    const bandKeys = new Set(spec.sizeBands.map((b) => b.key));
    const formatKeys = new Set(spec.formats.map((f) => f.key));
    const known = (m, where) => {
        if (!metricKeys.has(m))
            problems.push(`${where}: unknown metric "${m}"`);
    };
    if (metricKeys.has(AUDIENCE))
        problems.push(`"${AUDIENCE}" is reserved and cannot be a metric`);
    if (metricKeys.size !== spec.metrics.length)
        problems.push("metric keys must be unique");
    const total = spec.parts.reduce((s, p) => s + p.weight, 0);
    if (Math.abs(total - 1) > 1e-9)
        problems.push(`weights sum to ${total}, not 1`);
    if (new Set(spec.parts.map((p) => p.key)).size !== spec.parts.length)
        problems.push("part keys must be unique");
    spec.sizeBands.forEach((b, i) => {
        const next = spec.sizeBands[i + 1];
        if (i === 0 && b.min !== 0)
            problems.push("the first size band must start at 0");
        if (next && b.max !== next.min)
            problems.push(`size band ${b.key} must end where ${next.key} starts`);
        if (!next && b.max !== undefined)
            problems.push("the last size band must be open-ended");
    });
    if (!spec.formats.length)
        problems.push("a kind needs at least one format");
    if (spec.formats.filter((f) => !f.durationSec).length !== 1)
        problems.push("exactly one format must be the default (no duration rule)");
    for (const p of spec.parts) {
        const where = `part ${p.key}`;
        if (!(p.weight > 0))
            problems.push(`${where}: weight must be positive`);
        if (!(p.prior.sigma > 0))
            problems.push(`${where}: prior sigma must be positive`);
        const m = p.measure;
        if (m.type === "ratio") {
            m.numerator.forEach((n) => known(n, where));
            if (m.denominator !== AUDIENCE)
                known(m.denominator, where);
        }
        else if (m.type === "median" || m.type === "momentum" || m.type === "hits") {
            known(m.metric, where);
        }
        const checkMedian = (median, label) => {
            if (typeof median === "number") {
                if (!(median > 0) && p.scale === "log")
                    problems.push(`${label}: a log-scale median must be positive`);
                return;
            }
            for (const b of bandKeys)
                if (!(b in median))
                    problems.push(`${label}: no median for size band ${b}`);
            for (const b of Object.keys(median))
                if (!bandKeys.has(b))
                    problems.push(`${label}: unknown size band ${b}`);
        };
        checkMedian(p.prior.median, where);
        for (const [f, o] of Object.entries(p.prior.formats ?? {})) {
            if (!formatKeys.has(f))
                problems.push(`${where}: unknown format ${f}`);
            checkMedian(o.median, `${where} (${f})`);
        }
    }
    known(spec.work.primary, "work score");
    if (spec.work.secondary) {
        spec.work.secondary.numerator.forEach((n) => known(n, "work score"));
        if (spec.work.secondary.denominator !== AUDIENCE)
            known(spec.work.secondary.denominator, "work score");
    }
    spec.records.forEach((r) => known(r.metric, "record"));
    return problems;
}
