/*
  The statistics the guide needs, dependency free and deterministic. Every
  random step takes a seed derived from a stable key, so a result never
  depends on the order things were computed in.
*/
/** mulberry32: small, fast, good enough for resampling. */
export function seededRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** FNV-1a, so a seed can come from a readable key such as "journal/ac_1/weekend". */
export function hashSeed(key) {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}
export function median(xs) {
    if (!xs.length)
        return NaN;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
/** Type 7 quantile of sorted data, the same definition as bench and most spreadsheets. */
export function quantileSorted(sorted, p) {
    if (!sorted.length)
        return NaN;
    const h = (sorted.length - 1) * p;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}
/** The geometric mean: the "typical" multiple when multiples spread log-normally. */
export const geoMean = (xs) => Math.exp(mean(xs.map((x) => Math.log(Math.max(x, 1e-9)))));
/**
  The ratio of typical values between two groups of positive numbers, as the
  ratio of geometric means: exp(mean log a - mean log b).
*/
export const geoRatio = (a, b) => geoMean(a) / geoMean(b);
/**
  A percentile bootstrap interval for the ratio of geometric means. Each group
  is resampled on its own, as the two are separate samples of works.
*/
export function bootstrapRatio(a, b, seed, resamples = 2000, level = 0.95) {
    const la = a.map((x) => Math.log(Math.max(x, 1e-9)));
    const lb = b.map((x) => Math.log(Math.max(x, 1e-9)));
    const rand = seededRng(seed);
    const stats = new Float64Array(resamples);
    for (let r = 0; r < resamples; r++) {
        let sa = 0;
        for (let i = 0; i < la.length; i++)
            sa += la[Math.floor(rand() * la.length)];
        let sb = 0;
        for (let i = 0; i < lb.length; i++)
            sb += lb[Math.floor(rand() * lb.length)];
        stats[r] = sa / la.length - sb / lb.length;
    }
    stats.sort();
    const tail = (1 - level) / 2;
    return { low: Math.exp(quantileSorted(stats, tail)), high: Math.exp(quantileSorted(stats, 1 - tail)), level };
}
/**
  A two-sided permutation test on the difference in mean log values. The
  p-value counts the observed split itself, so it is never zero.
*/
export function permutationP(a, b, seed, permutations = 2000) {
    const all = [...a, ...b].map((x) => Math.log(Math.max(x, 1e-9)));
    const na = a.length;
    const total = all.reduce((s, x) => s + x, 0);
    const observed = Math.abs(mean(all.slice(0, na)) - mean(all.slice(na)));
    const rand = seededRng(seed);
    const work = [...all];
    let extreme = 0;
    for (let r = 0; r < permutations; r++) {
        // A partial Fisher-Yates shuffle: only the first na places need to be random.
        let sa = 0;
        for (let i = 0; i < na; i++) {
            const j = i + Math.floor(rand() * (work.length - i));
            const t = work[i];
            work[i] = work[j];
            work[j] = t;
            sa += work[i];
        }
        const diff = Math.abs(sa / na - (total - sa) / (work.length - na));
        if (diff >= observed - 1e-12)
            extreme++;
    }
    return (extreme + 1) / (permutations + 1);
}
/**
  Benjamini-Hochberg adjusted p-values (q-values), in the input order. Testing
  many splits at once makes some look striking by luck; q controls the share
  of false discoveries among the ones we call clear.
*/
export function benjaminiHochberg(ps) {
    const m = ps.length;
    const order = ps.map((p, i) => ({ p, i })).sort((x, y) => x.p - y.p || x.i - y.i);
    const q = new Array(m);
    let running = 1;
    for (let k = m - 1; k >= 0; k--) {
        running = Math.min(running, (order[k].p * m) / (k + 1));
        q[order[k].i] = Math.min(1, running);
    }
    return q;
}
const logFactorialCache = [0];
export function logFactorial(n) {
    for (let k = logFactorialCache.length; k <= n; k++)
        logFactorialCache[k] = logFactorialCache[k - 1] + Math.log(k);
    return logFactorialCache[n];
}
const logChoose = (n, k) => logFactorial(n) - logFactorial(k) - logFactorial(n - k);
/**
  The chance that a random draw of `draws` works from `population` contains at
  least `hits` of the `marked` ones: the hypergeometric upper tail. It answers
  "could your best works share this trait by luck?".
*/
export function hypergeomUpper(population, marked, draws, hits) {
    let p = 0;
    const hi = Math.min(marked, draws);
    for (let k = Math.max(hits, 0); k <= hi; k++) {
        if (draws - k > population - marked)
            continue;
        p += Math.exp(logChoose(marked, k) + logChoose(population - marked, draws - k) - logChoose(population, draws));
    }
    return Math.min(1, p);
}
export const round = (x, dp = 2) => {
    const f = 10 ** dp;
    const r = Math.round(x * f) / f;
    return Object.is(r, -0) ? 0 : r;
};
