/*
  Ratings and reviews: public rating counts and averages per platform and
  country, read where a public page shows them (apple.ts, spotify.ts), kept
  over time. A reading we could not take is absent, never zero.
*/
const key = (r) => `${r.platform}|${r.country ?? ""}`;
export function summariseRatings(readings, now) {
    const groups = new Map();
    for (const r of readings)
        groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
    const monthAgo = new Date(now.getTime() - 30 * 864e5).toISOString();
    return [...groups.values()].map((rs) => {
        const sorted = [...rs].sort((a, b) => (a.at < b.at ? -1 : 1));
        const first = sorted[0];
        const latest = sorted[sorted.length - 1];
        const before = sorted.filter((r) => r.at <= monthAgo).pop() ?? null;
        return {
            platform: latest.platform,
            country: latest.country,
            latest,
            countChange: latest.count - first.count,
            countChange30d: before ? latest.count - before.count : null,
            averageChange: Math.round((latest.average - first.average) * 100) / 100,
        };
    });
}
/** All public ratings across platforms and countries, latest of each: the total and a count-weighted average. */
export function totalRatings(readings, now) {
    const latest = summariseRatings(readings, now).map((s) => s.latest);
    const count = latest.reduce((a, r) => a + r.count, 0);
    const average = count ? Math.round((latest.reduce((a, r) => a + r.average * r.count, 0) / count) * 100) / 100 : null;
    return { count, average };
}
