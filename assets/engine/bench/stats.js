export const sortedCopy = (values) => Float64Array.from(values).sort();
/** Type 7 quantile of an ascending array. */
export const quantile = (sorted, p) => {
    const n = sorted.length;
    if (n === 0)
        throw new Error("quantile of nothing");
    if (n === 1)
        return sorted[0];
    const h = p * (n - 1);
    const lo = Math.floor(h);
    const hi = Math.min(lo + 1, n - 1);
    return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
};
/**
  The smallest cohort size at which a type 7 quantile p interpolates only
  between interior order statistics, never touching the minimum or maximum.
  Below it, p10 or p90 would be the smallest or largest creator's own value.
*/
export const interiorMinN = (p) => {
    const q = Math.min(p, 1 - p);
    return Math.ceil(1 / q - 1e-9) + 1;
};
/** Mid-rank percentile of x in an ascending sample, 0 to 100. */
export const percentileRank = (sorted, x) => {
    let below = 0;
    let equal = 0;
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] < x)
            below++;
        else if (sorted[i] === x)
            equal++;
    }
    return (100 * (below + equal / 2)) / sorted.length;
};
/**
  Percentile bootstrap intervals for several quantiles at once. Each resample
  is drawn as a multiset of counts over the sorted sample, so its quantiles
  are read by walking the counts in O(n) rather than sorting.
*/
export const bootstrapQuantiles = (sorted, ps, rng, resamples, level) => {
    const n = sorted.length;
    const counts = new Int32Array(n);
    const estimates = ps.map(() => new Float64Array(resamples));
    const ranks = ps.map((p) => {
        const h = p * (n - 1);
        const lo = Math.floor(h);
        return { lo, hi: Math.min(lo + 1, n - 1), frac: h - lo };
    });
    for (let b = 0; b < resamples; b++) {
        counts.fill(0);
        for (let i = 0; i < n; i++)
            counts[Math.floor(rng() * n)]++;
        for (let q = 0; q < ps.length; q++) {
            const { lo, hi, frac } = ranks[q];
            estimates[q][b] = valueAtRank(sorted, counts, lo) * (1 - frac) + (frac > 0 ? valueAtRank(sorted, counts, hi) * frac : 0);
        }
    }
    const alpha = (1 - level) / 2;
    return estimates.map((e) => {
        e.sort();
        return [quantile(e, alpha), quantile(e, 1 - alpha)];
    });
};
/** The value at 0-based rank r of the resample described by counts. */
const valueAtRank = (sorted, counts, r) => {
    let seen = 0;
    for (let i = 0; i < counts.length; i++) {
        seen += counts[i];
        if (seen > r)
            return sorted[i];
    }
    return sorted[sorted.length - 1];
};
/**
  Published values are rounded to a few significant figures. It stops a
  licensee from reading back the exact figure that sits under a quantile,
  and nobody needs RPM to the penny.
*/
export const roundSig = (x, figures) => {
    if (x === 0 || !Number.isFinite(x))
        return x;
    const magnitude = Math.floor(Math.log10(Math.abs(x)));
    const factor = Math.pow(10, figures - 1 - magnitude);
    const r = Math.round(x * factor) / factor;
    // Clean floating point noise such as 0.30000000000000004.
    return Number(r.toPrecision(figures));
};
