export const BANDS = [
    { key: "seed", label: "Under 10k", min: 0, max: 1e4, reach: 0.3 },
    { key: "rise", label: "10k to 100k", min: 1e4, max: 1e5, reach: 0.2 },
    { key: "low", label: "100k to 250k", min: 1e5, max: 2.5e5, reach: 0.15 },
    { key: "mid", label: "250k to 1M", min: 2.5e5, max: 1e6, reach: 0.1 },
    { key: "high", label: "1M to 5M", min: 1e6, max: 5e6, reach: 0.065 },
    { key: "top", label: "Over 5M", min: 5e6, max: Infinity, reach: 0.04 },
];
export const bandOf = (subs) => BANDS.find((b) => subs >= b.min && subs < b.max) ?? BANDS[0];
const WEIGHTS = { reach: 0.3, momentum: 0.25, hits: 0.2, engagement: 0.15, cadence: 0.1 };
// Abramowitz and Stegun 7.1.26, plenty for percentiles.
function cdf(z) {
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(z * z) / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
const clampZ = (z) => Math.max(-3, Math.min(3, z));
const logZ = (x, median, sigma) => clampZ(Math.log(Math.max(x, 1e-6) / median) / sigma);
const median = (xs) => {
    if (!xs.length)
        return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** Most of a video's views arrive in its first fortnight; scale young uploads up so they compare fairly. */
const matured = (views, ageDays) => views / (1 - Math.exp(-Math.max(ageDays, 0.5) / 9));
const pct = (n) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
const DAY = 864e5;
export function rate({ channel, uploads }, now = Date.now()) {
    const band = bandOf(channel.subscribers);
    const all = uploads
        .map((u) => ({ ...u, ageDays: (now - Date.parse(u.publishedAt)) / DAY, short: u.durationSec > 0 && u.durationSec <= 180 }))
        .sort((a, b) => a.ageDays - b.ageDays);
    const long = all.filter((u) => !u.short && u.ageDays >= 2);
    const pool = long.length >= 5 ? long : all.filter((u) => u.ageDays >= 2);
    const adj = pool.map((u) => matured(u.views, u.ageDays));
    const med = median(adj) || 1;
    // Reach: a typical upload's views as a share of subscribers.
    const reachRatio = med / Math.max(channel.subscribers, 1);
    const zReach = logZ(reachRatio, band.reach, 0.9);
    // Hits: share of uploads at twice the channel's own median or better.
    const hitRate = adj.filter((v) => v >= 2 * med).length / Math.max(adj.length, 1);
    const zHits = clampZ((hitRate - 0.12) / 0.08);
    // Momentum: the last ten uploads against the twenty before them.
    const recent = median(adj.slice(0, 10));
    const before = median(adj.slice(10, 30)) || recent;
    const growth = recent / Math.max(before, 1);
    const zMomentum = clampZ(Math.log(Math.max(growth, 1e-3)) / 0.45);
    // Engagement: likes and comments per view.
    const views = pool.reduce((s, u) => s + u.views, 0) || 1;
    const eng = pool.reduce((s, u) => s + u.likes + u.comments, 0) / views;
    const zEng = logZ(eng, 0.035, 0.6);
    // Cadence: uploads a month over the last half year, docked for long gaps.
    const half = all.filter((u) => u.ageDays <= 182);
    const perMonth = half.length / 6;
    const gaps = half.slice(1).map((u, i) => u.ageDays - half[i].ageDays);
    const meanGap = gaps.reduce((s, g) => s + g, 0) / Math.max(gaps.length, 1);
    const cv = gaps.length > 2 ? Math.sqrt(gaps.reduce((s, g) => s + (g - meanGap) ** 2, 0) / gaps.length) / Math.max(meanGap, 0.1) : 1;
    const zCadence = clampZ(logZ(Math.max(perMonth, 0.1), 4, 0.8) - 0.4 * Math.max(cv - 0.8, 0));
    const z = { reach: zReach, hits: zHits, momentum: zMomentum, engagement: zEng, cadence: zCadence };
    const score = (k) => Math.round(cdf(z[k]) * 100);
    const parts = [
        {
            key: "reach", name: "Reach", score: score("reach"), value: `${pct(reachRatio)} of subs`,
            what: "How many of your subscribers a typical upload reaches.",
            advice: "Your audience isn't seeing most uploads. Packaging is usually the lever: test titles and thumbnails against the three uploads that travelled furthest.",
        },
        {
            key: "momentum", name: "Momentum", score: score("momentum"), value: `${growth >= 1 ? "+" : ""}${Math.round((growth - 1) * 100)}%`,
            what: "Your last ten uploads against the twenty before them.",
            advice: "Recent uploads are landing below your own norm. Look at what changed: length, topic, upload day or format.",
        },
        {
            key: "hits", name: "Hit rate", score: score("hits"), value: pct(hitRate),
            what: "Uploads that did twice your median or better.",
            advice: "Few uploads break out. Hits come from ideas, not effort: borrow the premise of your best upload and make the sequel.",
        },
        {
            key: "engagement", name: "Engagement", score: score("engagement"), value: `${(eng * 100).toFixed(1)}%`,
            what: "Likes and comments for every hundred views.",
            advice: "Viewers watch but don't respond. Ask one specific question on screen, and answer the first comments in the first hour.",
        },
        {
            key: "cadence", name: "Cadence", score: score("cadence"), value: `${perMonth.toFixed(1)} a month`,
            what: "How often and how steadily you upload.",
            advice: "Long gaps cost momentum. A steady schedule you can keep beats bursts.",
        },
    ];
    const rating = Number(Object.keys(WEIGHTS).reduce((s, k) => s + WEIGHTS[k] * z[k], 0).toFixed(2)) * 2;
    const scored = all.map((u) => {
        const multiple = matured(u.views, u.ageDays) / med;
        const engU = (u.likes + u.comments) / Math.max(u.views, 1);
        const r = 0.75 * clampZ(Math.log(Math.max(multiple, 1e-3)) / 0.7) + 0.25 * logZ(engU, Math.max(eng, 1e-4), 0.5);
        return { ...u, multiple, rating: Number((r * 2).toFixed(2)) };
    });
    const ranked = scored.filter((u) => !u.short && u.ageDays >= 2);
    const best = [...(ranked.length ? ranked : scored)].sort((a, b) => b.multiple - a.multiple)[0];
    const focus = [...parts].sort((a, b) => a.score - b.score).filter((p) => p.score < 50).slice(0, 2);
    return {
        rating: Number(rating.toFixed(2)),
        band,
        parts,
        uploads: scored,
        medianViews: Math.round(med),
        focus,
        best,
        shortsShare: all.length ? all.filter((u) => u.short).length / all.length : 0,
        perMonth,
    };
}
/** Named bands on the rating, the way a match rating reads: most channels sit in Average. */
export const verdict = (n) => (n >= 2 ? "Great" : n >= 0.8 ? "Good" : n > -0.8 ? "Average" : n > -2 ? "Subpar" : "Poor");
export const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}`;
