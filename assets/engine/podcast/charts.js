/*
  Chart tracking: each day, the public Apple and Spotify charts per country
  and category are read once (apple.ts, spotify.ts), the positions of shows
  Orbe tracks are kept as history, and moments are found: a new best
  position, first time in a chart, a top-ten finish, a big climb. Moments
  feed the after-episode report and the share card.
  One read of a chart serves every tracked show in it, so the cost is per
  chart, not per show.
*/
export const chartKey = (c) => `${c.platform}/${c.country}/${c.category}`;
export function memoryChartStore() {
    const rows = [];
    return {
        add(p) {
            const i = rows.findIndex((r) => r.chartKey === p.chartKey && r.showId === p.showId && r.date === p.date);
            if (i >= 0)
                rows[i] = p;
            else
                rows.push(p);
        },
        history: (showId, key) => rows.filter((r) => r.showId === showId && (!key || r.chartKey === key)).sort((a, b) => (a.date < b.date ? -1 : 1)),
    };
}
/** Provisional: a climb of this many places in a day is worth telling a creator about. */
export const BIG_CLIMB_PLACES = 20;
const PLATFORM_NAME = { apple: "Apple Podcasts", spotify: "Spotify" };
export function chartName(c) {
    const where = c.country.toUpperCase();
    const cat = c.category === "all" || c.category === "top" ? "Top Podcasts" : c.category;
    return `${PLATFORM_NAME[c.platform]} ${cat} (${where})`;
}
/**
  Records today's positions for tracked shows and returns the moments.
  `tracked` maps a chart show reference (apple:<id>, spotify:<id>) to Orbe show ids.
*/
export function trackChart(store, chart, tracked) {
    const key = chartKey(chart.chart);
    const moments = [];
    const name = chartName(chart.chart);
    for (const e of chart.entries) {
        for (const showId of tracked.get(e.showRef) ?? []) {
            const past = store.history(showId, key).filter((p) => p.date < chart.date);
            const best = past.length ? Math.min(...past.map((p) => p.rank)) : null;
            const yesterday = past.length ? past[past.length - 1] : null;
            store.add({ chartKey: key, showId, date: chart.date, rank: e.rank });
            const m = (kind, line) => moments.push({ kind, showId, chart: chart.chart, date: chart.date, rank: e.rank, previousBest: best, line });
            if (best === null)
                m("entered", `Entered the ${name} chart at number ${e.rank}.`);
            else if (e.rank < best)
                m("new_high", `New high: number ${e.rank} on ${name}, up from a best of ${best}.`);
            if (e.rank === 1 && (best === null || best > 1))
                m("number_one", `Number one on ${name}.`);
            else if (e.rank <= 10 && (best === null || best > 10))
                m("top_ten", `First time in the top ten of ${name}.`);
            if (yesterday && yesterday.rank - e.rank >= BIG_CLIMB_PLACES)
                m("big_climb", `Up ${yesterday.rank - e.rank} places on ${name} in a day, to number ${e.rank}.`);
        }
    }
    return moments;
}
/** A show's best position in each chart it has been in, for the dashboard. */
export function bestPositions(store, showId) {
    const by = new Map();
    for (const p of store.history(showId))
        by.set(p.chartKey, [...(by.get(p.chartKey) ?? []), p]);
    return [...by.entries()].map(([k, ps]) => {
        const best = ps.reduce((a, b) => (b.rank < a.rank ? b : a));
        return { chartKey: k, best: best.rank, on: best.date, latest: ps[ps.length - 1] };
    });
}
