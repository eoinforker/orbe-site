/*
  SAMPLE DATA. A show dashboard built from made-up listening, so a creator
  can see what the dashboard will show before their prefix is live. Nothing
  here is a count of anyone's audience: listeners, apps, countries, chart
  positions, ratings, clicks and promo results are generated from a fixed
  seed. What is real is the machinery: the made-up request logs go through
  the same counter (iab.ts), daily aggregation, chart tracking, promo
  attribution, plausibility model and dashboard view model as live data, and
  the episodes are the creator's own (from their feed) when one is given.
  Every result carries SAMPLE_LABEL, and the site must show it.
*/
import { enclosureKey } from "../ingest/browser.js";
import { dailyStats, filesFromFeed } from "./aggregate.js";
import { bestPositions, memoryChartStore, trackChart } from "./charts.js";
import { buildDashboard } from "./dashboard.js";
import { countDownloads } from "./iab.js";
import { assessPlausibility } from "./plausibility.js";
import { prefixUrl } from "./prefix.js";
import { attribute, memoryPromoStore } from "./promos.js";
import { summariseRatings } from "./reviews.js";
import { checkPrefix } from "./verify.js";
export const SAMPLE_LABEL = "Sample data. Made up to show what your dashboard will look like; none of these numbers describe your show. Your own appear once your Orbe prefix is live.";
/** A small seeded generator (mulberry32), so the sample reads the same every time. */
export function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const pick = (rand, items) => {
    const total = items.reduce((a, [, w]) => a + w, 0);
    let r = rand() * total;
    for (const [v, w] of items)
        if ((r -= w) <= 0)
            return v;
    return items[items.length - 1][0];
};
/** Made-up user agents, shaped like the apps' real ones, weighted roughly like podcast app shares reported in public surveys. */
const AGENTS = [
    ["Podcasts/1650.20 CFNetwork/1485 Darwin/23.1.0", 40],
    ["Spotify/8.8.0 iOS/17.1 (iPhone15,2)", 16],
    ["Spotify/8.8.0 Android/34 (Pixel 8)", 9],
    ["Overcast/3.0 (+http://overcast.fm/; iOS podcast app)", 7],
    ["PocketCasts/1.0 (Pocket Casts Feed Parser; +http://pocketcasts.com/)", 1],
    ["Pocket Casts/7.50 Android", 6],
    ["PodcastAddict/v5 (+https://podcastaddict.com/; Android podcast app)", 5],
    ["CastBox/9.10 (fm.castbox.audio.radio.podcast.app; Android 13)", 3],
    ["AntennaPod/3.2.0", 3],
    ["AmazonMusic/22.4 Android", 3],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", 4],
];
const COUNTRIES = [
    ["GB", 46],
    ["US", 22],
    ["IE", 6],
    ["AU", 5],
    ["CA", 5],
    ["DE", 4],
    ["NL", 3],
    ["NZ", 2],
    ["FR", 2],
];
const BOTS = ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "python-requests/2.31", "Feedly/1.0 (+http://www.feedly.com/fetcher.html)"];
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export function sampleDashboard(o) {
    const rand = seeded(o.seed ?? 7);
    const nDays = o.days ?? 28;
    const start = addDays(o.through, -(nDays - 1));
    const scale = o.scale ?? 260;
    // The sample shows what a live prefix looks like: the creator's feed with Orbe's prefix applied.
    const live = { ...o.feed, enclosures: o.feed.enclosures.map((e) => ({ ...e, url: prefixUrl(o.showId, e.url) })) };
    const newest = [...o.feed.enclosures].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, 10);
    // Episodes released before the window still draw a tail; spread their release days back if the feed's are old.
    const span = Math.max(1, newest.length);
    const releases = newest.map((e, i) => {
        const own = e.publishedAt.slice(0, 10);
        const inWindow = own >= addDays(start, -60) && own <= o.through;
        return { e, day: inWindow ? own : addDays(o.through, -Math.round(((i + 0.5) * (nDays + 21)) / span)) };
    });
    const records = [];
    let n = 0;
    const listener = () => `sample-${Math.floor(rand() * 1e9).toString(36)}`;
    for (let d = start; d <= o.through; d = addDays(d, 1)) {
        const weekend = [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()) ? 0.82 : 1;
        for (const [i, r] of releases.entries()) {
            const age = (Date.parse(`${d}T00:00:00Z`) - Date.parse(`${r.day}T00:00:00Z`)) / 864e5;
            if (age < 0)
                continue;
            const hit = i === 2 ? 1.8 : 1;
            const expected = scale * hit * weekend * (Math.exp(-age / 2.2) + 0.05 * Math.exp(-age / 40));
            const count = Math.max(0, Math.round(expected * (0.85 + rand() * 0.3)));
            for (let k = 0; k < count; k++) {
                const at = `${d}T${String(Math.floor(rand() * 24)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00.000Z`;
                const who = listener();
                const ua = pick(rand, AGENTS);
                const country = pick(rand, COUNTRIES);
                // Some players probe the first bytes before the real request; the counter must merge or drop these.
                if (rand() < 0.12)
                    records.push({ v: 1, kind: "download", at, showId: o.showId, target: r.e.url, method: "GET", listener: who, ua, range: "bytes=0-1", country });
                records.push({ v: 1, kind: "download", at, showId: o.showId, target: r.e.url, method: "GET", listener: who, ua, range: rand() < 0.5 ? null : "bytes=0-", country });
                n++;
            }
            // Bots, HEAD requests and abandoned probes, which must not count.
            const noise = Math.round(count * 0.08);
            for (let k = 0; k < noise; k++) {
                const at = `${d}T12:00:00.000Z`;
                const kind = rand();
                if (kind < 0.5)
                    records.push({ v: 1, kind: "download", at, showId: o.showId, target: r.e.url, method: "GET", listener: listener(), ua: BOTS[Math.floor(rand() * BOTS.length)], range: null, country: "US" });
                else if (kind < 0.75)
                    records.push({ v: 1, kind: "download", at, showId: o.showId, target: r.e.url, method: "HEAD", listener: listener(), ua: AGENTS[0][0], range: null, country: "GB" });
                else
                    records.push({ v: 1, kind: "download", at, showId: o.showId, target: r.e.url, method: "GET", listener: listener(), ua: AGENTS[1][0], range: "bytes=0-1", country: "GB" });
            }
        }
    }
    const counted = countDownloads(records, { fileFor: filesFromFeed(o.feed) });
    const days = dailyStats(counted.downloads, start, o.through);
    // Charts: a made-up climb in one Apple category chart, run through the real tracker so the moments are the tracker's own.
    const store = memoryChartStore();
    const chart = { platform: "apple", country: "gb", category: o.feed.categories[0]?.split(" / ")[0] ?? "Society & Culture" };
    const showRef = `apple:sample-${o.showId}`;
    const moments = [];
    let rank = 140;
    for (let d = addDays(start, 7); d <= o.through; d = addDays(d, 1)) {
        const release = releases.some((r) => r.day === d || r.day === addDays(d, -1));
        rank = Math.max(4, Math.round(rank * (release ? 0.62 : 1.04) + (rand() - 0.5) * 6));
        if (rank <= 200)
            moments.push(...trackChart(store, { chart, date: d, entries: [{ chart, date: d, rank, showRef, name: o.feed.title }] }, new Map([[showRef, [o.showId]]])));
    }
    const bestCharts = bestPositions(store, o.showId).map((b) => ({ chart, best: b.best, on: b.on, latest: b.latest.rank, latestOn: b.latest.date }));
    const readings = [];
    for (let i = 0; i < 5; i++) {
        const at = `${addDays(o.through, -i * 9)}T06:00:00.000Z`;
        readings.push({ platform: "apple", country: "gb", showRef, average: 4.7 + rand() * 0.2, count: 212 - i * 7, at });
        readings.push({ platform: "spotify", country: null, showRef, average: 4.6 + rand() * 0.2, count: 96 - i * 5, at });
    }
    // Smart link clicks, by app and by where the link was posted.
    const clicks = [];
    const apps = [["apple", 44], ["spotify", 31], ["overcast", 7], ["pocketcasts", 6], ["youtube", 5], ["podcastaddict", 4], ["rss", 3]];
    const sources = [["instagram.com", 34], ["newsletter", 22], ["direct", 18], ["x.com", 11], ["linkedin.com", 9], ["guest-episode", 6]];
    for (let d = start; d <= o.through; d = addDays(d, 1)) {
        const c = Math.round(18 + rand() * 30);
        for (let k = 0; k < c; k++)
            clicks.push({ v: 1, kind: "click", at: `${d}T10:00:00.000Z`, showId: o.showId, target: pick(rand, apps), method: "GET", listener: listener(), ua: AGENTS[0][0], range: null, country: "GB", via: pick(rand, sources) });
    }
    // A cross-promo: a made-up partner show ran a promo; sightings carry made-up tokens, matched by the real attribution rules.
    const promos = memoryPromoStore();
    const partner = "sample-partner-show";
    const promoStart = addDays(start, 4);
    for (let k = 0; k < 900; k++) {
        const tok = `tok-${k}`;
        const day = addDays(promoStart, Math.floor(rand() * 10));
        promos.add({ showId: partner, episodeKey: "sample/partner/promo-episode.mp3", day, tokens: [tok] });
        const r = rand();
        if (r < 0.06)
            promos.add({ showId: o.showId, episodeKey: enclosureKey(newest[0]?.url) ?? "ep", day: addDays(day, -5), tokens: [tok] });
        else if (r < 0.2)
            promos.add({ showId: o.showId, episodeKey: enclosureKey(newest[0]?.url) ?? "ep", day: addDays(day, 1 + Math.floor(rand() * 20)), tokens: [tok] });
    }
    const promo = attribute(promos, { id: "sample-promo", kind: "cross_promo", hostShowId: partner, episodeKeys: ["sample/partner/promo-episode.mp3"], promotedShowId: o.showId, startDay: promoStart, endDay: addDays(promoStart, 9) }, o.through);
    const prefix = checkPrefix(live, o.showId, new Date(`${o.through}T23:00:00.000Z`));
    const last30 = days.slice(-30).reduce((a, d) => a + d.downloads, 0);
    const plausibility = assessPlausibility({
        claim: { basis: "host", monthlyDownloads: Math.round(last30 * 1.12) },
        measured: { monthlyDownloads: last30, daysMeasured: nDays, prefixCoverage: "live" },
        feed: o.feed,
        bestChart: bestCharts[0] ? { rank: bestCharts[0].best, chart: "Apple Podcasts" } : null,
        ratings: { count: 212 + 96 },
        now: new Date(`${o.through}T23:00:00.000Z`),
    });
    const dashboard = buildDashboard({
        showId: o.showId,
        feedUrl: o.feedUrl,
        feed: live,
        days,
        downloadsMethod: "measured",
        prefix,
        hostConnected: false,
        publicSignals: ["your public feed", "Apple Podcasts charts"],
        bestCharts,
        moments,
        ratings: summariseRatings(readings, new Date(`${o.through}T23:00:00.000Z`)),
        clicks,
        promos: [promo],
        plausibility,
    });
    void n;
    return { label: SAMPLE_LABEL, dashboard, excluded: counted.excluded, requests: counted.requests, days };
}
