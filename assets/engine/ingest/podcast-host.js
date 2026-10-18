/*
  Podcast hosts: download analytics read through the creator's own host
  credentials, normalised to the same Works the public RSS read produces,
  with downloads_7d, downloads_30d and per-day downloads.

  Each host client (host-*.ts) returns a HostRead: daily downloads per host
  episode over a range. This file matches those episodes to the feed's
  episodes (guid, then enclosure file, then title and date), so a host read
  and an RSS read land on one Work, and turns the series into core shapes.
  Every figure carries provenance method "reported": read from your host.
*/
import { systemClock } from "../core/util.js";
import { ConfigError, InvalidInputError, withRetry } from "./errors.js";
import { requestText } from "./http.js";
import { accountIdFor, addDays, isIsoDate, workIdFor } from "./ids.js";
import { normaliseFeedUrl, parseFeed } from "./podcast.js";
import { checkRange, emptyResult } from "./result.js";
export const HOSTS = ["buzzsprout", "transistor", "captivate", "simplecast", "spreaker", "omny", "podbean"];
export const HOST_LABEL = {
    buzzsprout: "Buzzsprout",
    transistor: "Transistor",
    captivate: "Captivate",
    simplecast: "Simplecast",
    spreaker: "Spreaker",
    omny: "Omny Studio",
    podbean: "Podbean",
};
export const ORBE_USER_AGENT = "OrbeBot/1.0 (+https://orbe.vc/bot)";
export const HOST_POLICY = {
    // Provisional: daily keeps after-episode reports current; tune once host rate limits bite.
    refreshEveryDays: 1,
    maxAgeDays: null,
    rule: "Read from the creator's podcast host with their API key; no platform retention limit found in the docs we read",
};
/** Every date from start to end inclusive. */
export function datesIn(range) {
    const out = [];
    for (let d = range.start; d <= range.end; d = addDays(d, 1))
        out.push(d);
    return out;
}
export const sumDaily = (daily) => Object.values(daily).reduce((a, b) => a + b, 0);
/** Adds a day's count, ignoring negatives and non-numbers rather than trusting them. */
export function addTo(daily, date, n) {
    const v = typeof n === "string" ? Number(n) : n;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || !isIsoDate(date))
        return;
    daily[date] = (daily[date] ?? 0) + v;
}
/** The show series from its episodes, for hosts that only report per episode. */
export function showDailyFromEpisodes(episodes) {
    const out = {};
    for (const e of episodes)
        for (const [d, n] of Object.entries(e.daily))
            addTo(out, d, n);
    return out;
}
/** The file name at the end of an enclosure URL, which survives prefixes and CDN changes. */
export function enclosureKey(url) {
    if (!url)
        return null;
    const path = url.split(/[?#]/)[0];
    const last = path.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last).toLowerCase() : null;
}
const normTitle = (t) => t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
/** Days between two ISO instants, as a positive number. */
const dayGap = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;
/**
  Matches each host episode to a feed episode. Guid first (hosts that write
  the guid say so), then the enclosure's file name, then title with a
  publish date within two days (hosts store their own time zone).
*/
export function matchEpisodes(feed, host) {
    const byGuid = new Map(feed.map((e) => [e.guid, e]));
    const byFile = new Map();
    for (const e of feed) {
        const k = enclosureKey(e.enclosureUrl);
        if (k)
            byFile.set(k, e);
    }
    const used = new Set();
    const out = new Map();
    const take = (h, e) => {
        if (!e || used.has(e))
            return false;
        used.add(e);
        out.set(h, e);
        return true;
    };
    const rest = [];
    for (const h of host)
        if (!(h.guid && take(h, byGuid.get(h.guid))))
            rest.push(h);
    const rest2 = [];
    for (const h of rest) {
        const k = enclosureKey(h.enclosureUrl);
        if (!(k && take(h, byFile.get(k))))
            rest2.push(h);
    }
    for (const h of rest2) {
        const t = normTitle(h.title);
        const candidate = feed.find((e) => !used.has(e) && normTitle(e.title) === t && (!h.publishedAt || dayGap(h.publishedAt, e.publishedAt) <= 2));
        take(h, candidate);
    }
    return out;
}
/**
  Downloads in the first `days` days, counting the publish day as day one.
  Null when the read does not reach back to the publish day, because a
  window we cannot see the start of is unknown, not small. A window still
  open is returned as far as it goes: the rating corrects young works by age.
*/
export function windowDownloads(daily, publishedAt, days, range) {
    const first = publishedAt.slice(0, 10);
    if (first < range.start)
        return null;
    const last = addDays(first, days - 1);
    let n = 0;
    for (const [d, v] of Object.entries(daily))
        if (d >= first && d <= last)
            n += v;
    return n;
}
/** A HostRead and its feed, as a ReadResult with Works, daily show downloads and per-episode totals. */
export function normaliseHostRead({ read, feed, feedUrl, checkedAt }) {
    const result = emptyResult("podcast_host", HOST_POLICY, checkedAt);
    result.warnings.push(...read.warnings);
    const platformId = feed.podcastGuid ?? normaliseFeedUrl(feedUrl);
    const account = {
        id: accountIdFor("podcast", platformId),
        creatorId: null,
        kind: "podcast",
        platformId,
        handle: normaliseFeedUrl(feedUrl),
        title: feed.title,
        // Hosts report downloads, not followers.
        audience: 0,
    };
    const provenance = { source: "podcast_host", accountId: `${read.host}:${read.showId}`, checkedAt, basis: "connected", method: "reported" };
    const matched = matchEpisodes(feed.episodes, read.episodes);
    const metricsFor = new Map();
    let outOfRange = 0;
    for (const [h, e] of matched) {
        const m = {};
        if (h.noData) {
            metricsFor.set(e, m);
            continue;
        }
        const d7 = windowDownloads(h.daily, e.publishedAt, 7, read.range);
        const d30 = windowDownloads(h.daily, e.publishedAt, 30, read.range);
        if (d7 !== null)
            m.downloads_7d = d7;
        if (d30 !== null)
            m.downloads_30d = d30;
        if (d7 === null)
            outOfRange++;
        metricsFor.set(e, m);
    }
    const unmatched = read.episodes.length - matched.size;
    if (unmatched)
        result.warnings.push(`${unmatched} ${HOST_LABEL[read.host]} episodes did not match an episode in the public feed (private, deleted or retitled) and were left out`);
    if (outOfRange)
        result.warnings.push(`${outOfRange} episodes were published before ${read.range.start}, so their first-week and first-month downloads are unknown from this read`);
    const works = feed.episodes.map((e) => ({
        id: workIdFor("podcast", `${platformId}|${e.guid}`),
        accountId: account.id,
        kind: "podcast",
        title: e.title,
        publishedAt: e.publishedAt,
        durationSec: e.durationSec ?? 0,
        metrics: metricsFor.get(e) ?? {},
        platformId: e.guid,
    }));
    result.snapshot = { account, works, provenance };
    const daily = Object.entries(read.showDaily)
        .filter(([d]) => d >= read.range.start && d <= read.range.end)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, downloads]) => ({ accountId: account.id, date, metrics: { downloads }, provenance }));
    result.daily = daily;
    const workMetrics = [];
    for (const [h, e] of matched) {
        if (h.noData)
            continue;
        workMetrics.push({
            workId: workIdFor("podcast", `${platformId}|${e.guid}`),
            platformWorkId: e.guid,
            range: read.range,
            metrics: { downloads: sumDaily(h.daily) },
            provenance,
        });
        if (h.totalDownloads !== undefined) {
            result.facts.push({ accountId: account.id, key: `downloads_total:${e.guid}`, value: h.totalDownloads, provenance });
        }
    }
    result.workMetrics = workMetrics;
    result.facts.push({ accountId: account.id, key: "downloads_in_range", value: sumDaily(read.showDaily), provenance });
    return result;
}
export const isHostName = (s) => !!s && HOSTS.includes(s);
/**
  The podcast_host connector. The token names its host in `issuer` and the
  host's show id in `accountHint`; the host client reads downloads, the feed
  is read for the episode list, and the two are joined.
*/
export function createPodcastHost(config) {
    const clock = config.clock ?? systemClock;
    async function readConnected(tokens, range) {
        checkRange(range, "podcast_host");
        const host = tokens.issuer;
        if (!isHostName(host))
            throw new InvalidInputError(`Unknown podcast host: ${String(host)}`, "podcast_host");
        const client = config.clients[host];
        if (!client)
            throw new ConfigError(`No client for ${HOST_LABEL[host]}`, "podcast_host");
        const showId = tokens.accountHint;
        if (!showId)
            throw new InvalidInputError(`The ${HOST_LABEL[host]} connection does not name a show`, "podcast_host");
        const feedUrl = await config.feedFor(host, showId);
        if (!feedUrl)
            throw new InvalidInputError(`No public feed is recorded for ${HOST_LABEL[host]} show ${showId}`, "podcast_host");
        const read = await client(config, tokens, showId, range);
        const res = await withRetry(() => requestText({ fetch: config.fetch, source: "podcast_host", url: normaliseFeedUrl(feedUrl), headers: { "user-agent": config.userAgent ?? ORBE_USER_AGENT }, now: clock }), config.retry);
        return normaliseHostRead({ read, feed: parseFeed(res.text), feedUrl, checkedAt: clock().toISOString() });
    }
    return { source: "podcast_host", kind: "podcast", basis: "connected", scopes: [], refresh: HOST_POLICY, readConnected };
}
