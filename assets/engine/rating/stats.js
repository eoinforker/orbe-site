/*
  The small amount of statistics the rating needs. Kept dependency free and
  deterministic: no randomness, and every sort has a tie-breaker.
*/
/** Normal CDF via Abramowitz and Stegun 7.1.26: accurate to about 1e-7, plenty for percentiles. */
export function normalCdf(z) {
    const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
    const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    const y = 1 - poly * Math.exp(-(z * z) / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
/** Z-scores are clamped so no single part can swing the rating more than three spreads. */
export const Z_CAP = 3;
export const clampZ = (z) => (Number.isFinite(z) ? Math.max(-Z_CAP, Math.min(Z_CAP, z)) : z > 0 ? Z_CAP : -Z_CAP);
/** The smallest positive value we take a log of, so zeros read as "very low" rather than minus infinity. */
export const LOG_FLOOR = 1e-6;
/** How many spreads x sits from the median on a log scale: the log-normal z-score. */
export const logZ = (x, median, sigma) => clampZ(Math.log(Math.max(x, LOG_FLOOR) / Math.max(median, LOG_FLOOR)) / sigma);
export const linearZ = (x, median, sigma) => clampZ((x - median) / sigma);
export function median(xs) {
    if (!xs.length)
        return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Median absolute deviation scaled to match a standard deviation for normal data. */
export function robustSigma(xs) {
    if (xs.length < 2)
        return 0;
    const m = median(xs);
    return 1.4826 * median(xs.map((x) => Math.abs(x - m)));
}
export const round = (x, dp = 2) => {
    const f = 10 ** dp;
    const r = Math.round(x * f) / f;
    return Object.is(r, -0) ? 0 : r;
};
/** A plain thousands grouping that does not depend on the host's locale data. */
export function groupThousands(n, dp = 0) {
    const fixed = Math.abs(n).toFixed(dp);
    const [whole, frac] = fixed.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${n < 0 && Number(fixed) !== 0 ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}
