/*
  From counted downloads to what the rest of Orbe reads: daily counts by
  episode, app and country, and a ReadResult shaped like a connector's, so
  the measured tier joins the record and the rating the same way a host read
  does. Its provenance says method "measured": measured by Orbe.
*/
import { accountIdFor, enclosureKey, normaliseFeedUrl, workIdFor } from "../ingest/browser.js";
const bump = (b, k, n = 1) => {
    b[k] = (b[k] ?? 0) + n;
};
/** Daily counts, one row per day from start to end, zeros included, so a quiet day is a known zero. */
export function dailyStats(downloads, start, end) {
    const days = new Map();
    for (let d = start; d <= end; d = new Date(Date.parse(`${d}T00:00:00Z`) + 864e5).toISOString().slice(0, 10)) {
        days.set(d, { day: d, downloads: 0, byEpisode: {}, byApp: {}, byCountry: {} });
    }
    for (const x of downloads) {
        const s = days.get(x.day);
        if (!s)
            continue;
        s.downloads++;
        bump(s.byEpisode, x.episodeKey);
        bump(s.byApp, x.app);
        bump(s.byCountry, x.country ?? "Unknown");
    }
    return [...days.values()];
}
/** Sums breakdowns over days. */
export function totals(days, pick) {
    const out = {};
    for (const d of days)
        for (const [k, n] of Object.entries(pick(d)))
            bump(out, k, n);
    return out;
}
/** The feed's files keyed as the counter keys them, so the one-minute rule can use real sizes and lengths. */
export function filesFromFeed(feed) {
    const m = new Map();
    for (const e of feed.enclosures) {
        const key = enclosureKey(e.url);
        if (key)
            m.set(key, { key, bytes: e.bytes, durationSec: e.durationSec });
    }
    return (k) => m.get(k);
}
export const measuredProvenance = (showId, checkedAt) => ({
    source: "podcast_host",
    accountId: `orbe:${showId}`,
    checkedAt,
    // Consent semantics match a connected read: the creator chose to send us this data, and revoking "connect" must remove it.
    basis: "connected",
    method: "measured",
});
/** Measured downloads as a connector-shaped result: works with downloads_7d and downloads_30d, and daily totals. */
export function measuredRead(input) {
    const { feed, showId, checkedAt } = input;
    const platformId = feed.podcastGuid ?? normaliseFeedUrl(input.feedUrl);
    const account = { id: accountIdFor("podcast", platformId), creatorId: null, kind: "podcast", platformId, handle: normaliseFeedUrl(input.feedUrl), title: feed.title, audience: 0 };
    const provenance = measuredProvenance(showId, checkedAt);
    const byEpisodeDay = new Map();
    for (const d of input.downloads) {
        if (d.day < input.measuredFrom || d.day > input.measuredTo)
            continue;
        const b = byEpisodeDay.get(d.episodeKey) ?? {};
        bump(b, d.day);
        byEpisodeDay.set(d.episodeKey, b);
    }
    const keyOf = new Map(feed.enclosures.map((e) => [e.guid, enclosureKey(e.url)]));
    const warnings = [];
    let early = 0;
    const workMetrics = [];
    const works = feed.episodes.map((e) => {
        const id = workIdFor("podcast", `${platformId}|${e.guid}`);
        const key = keyOf.get(e.guid);
        const daily = (key && byEpisodeDay.get(key)) || {};
        const metrics = {};
        const first = e.publishedAt.slice(0, 10);
        if (first >= input.measuredFrom) {
            for (const [metric, days] of [["downloads_7d", 7], ["downloads_30d", 30]]) {
                const last = new Date(Date.parse(`${first}T00:00:00Z`) + (days - 1) * 864e5).toISOString().slice(0, 10);
                metrics[metric] = Object.entries(daily).reduce((a, [d, n]) => (d >= first && d <= last ? a + n : a), 0);
            }
        }
        else
            early++;
        const total = Object.values(daily).reduce((a, b) => a + b, 0);
        if (total > 0)
            workMetrics.push({ workId: id, platformWorkId: e.guid, range: { start: input.measuredFrom, end: input.measuredTo }, metrics: { downloads: total }, provenance });
        return { id, accountId: account.id, kind: "podcast", title: e.title, publishedAt: e.publishedAt, durationSec: e.durationSec ?? 0, metrics, platformId: e.guid };
    });
    if (early)
        warnings.push(`${early} episodes came out before Orbe started measuring on ${input.measuredFrom}; their first-week and first-month downloads are not measured`);
    const daily = dailyStats(input.downloads, input.measuredFrom, input.measuredTo).map((s) => ({ accountId: account.id, date: s.day, metrics: { downloads: s.downloads }, provenance }));
    return {
        source: "podcast_host",
        checkedAt,
        nextRefreshDue: new Date(Date.parse(checkedAt) + 864e5).toISOString(),
        deleteBy: null,
        snapshot: { account, works, provenance },
        revenue: [],
        daily,
        workMetrics,
        facts: [{ accountId: account.id, key: "downloads_measured", value: daily.reduce((a, d) => a + (d.metrics.downloads ?? 0), 0), provenance }],
        payouts: [],
        tokens: null,
        quota: null,
        warnings,
    };
}
