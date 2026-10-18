/*
  Podcast RSS: the show and every episode, with durations and dates, read
  from the public feed. Feeds carry no download counts, so episodes have no
  metrics here; downloads need the host's API (podcast_host, not built yet).
*/
import { systemClock } from "../core/util.js";
import { InvalidInputError, withRetry } from "./errors.js";
import { itunesDurationSeconds } from "./duration.js";
import { requestText } from "./http.js";
import { accountIdFor, workIdFor } from "./ids.js";
import { emptyResult } from "./result.js";
import { child, childrenNamed, childText, parseXml } from "./xml.js";
export const PODCAST_POLICY = {
    // Provisional: most shows publish weekly at most.
    refreshEveryDays: 7,
    maxAgeDays: null,
    rule: "Public RSS feed; no retention limit",
};
/** Zone names that RFC 822 allows or feeds use but Date.parse does not know. Offsets are fixed by definition. */
const ZONES = { UT: "+0000", UTC: "+0000", GMT: "+0000", Z: "+0000", BST: "+0100", CET: "+0100", CEST: "+0200", EET: "+0200", EEST: "+0300" };
/** RFC 822 / 2822 dates as feeds write them, to ISO. Null when unreadable. */
export function parseFeedDate(text) {
    if (!text)
        return null;
    let t = text.trim().replace(/\s+/g, " ");
    const zone = / ([A-Z]{1,4})$/.exec(t);
    if (zone && ZONES[zone[1]])
        t = t.slice(0, zone.index) + " " + ZONES[zone[1]];
    let ms = Date.parse(t);
    // A missing weekday or an ISO date also turns up in the wild.
    if (Number.isNaN(ms))
        ms = Date.parse(t.replace(/^[A-Za-z]{3,9}, ?/, ""));
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
export function parseFeed(xml) {
    const root = parseXml(xml);
    if (root.name !== "rss")
        throw new InvalidInputError(`Not an RSS feed (root element <${root.name}>)`, "podcast_rss");
    const channel = child(root, "channel");
    if (!channel)
        throw new InvalidInputError("RSS feed without a <channel>", "podcast_rss");
    const warnings = [];
    const episodes = [];
    const seen = new Set();
    let undated = 0;
    let dupes = 0;
    for (const item of childrenNamed(channel, "item")) {
        const enclosureUrl = child(item, "enclosure")?.attrs.url;
        const title = childText(item, "title") ?? childText(item, "itunes:title") ?? "Untitled episode";
        const guid = childText(item, "guid") ?? enclosureUrl ?? `${title}|${childText(item, "pubDate") ?? ""}`;
        if (seen.has(guid)) {
            dupes++;
            continue;
        }
        seen.add(guid);
        const publishedAt = parseFeedDate(childText(item, "pubDate"));
        if (!publishedAt) {
            undated++;
            continue;
        }
        const raw = childText(item, "itunes:duration");
        const ep = { guid, title, publishedAt, durationSec: raw === undefined ? null : itunesDurationSeconds(raw) };
        if (enclosureUrl)
            ep.enclosureUrl = enclosureUrl;
        const type = childText(item, "itunes:episodeType");
        if (type)
            ep.episodeType = type;
        episodes.push(ep);
    }
    if (undated)
        warnings.push(`${undated} episodes without a readable date were left out`);
    if (dupes)
        warnings.push(`${dupes} episodes repeated a guid and were read once`);
    const feed = { title: childText(channel, "title") ?? "Untitled podcast", episodes, warnings };
    const link = childText(channel, "link");
    const author = childText(channel, "itunes:author");
    const podcastGuid = childText(channel, "podcast:guid");
    const newFeedUrl = childText(channel, "itunes:new-feed-url");
    if (link)
        feed.link = link;
    if (author)
        feed.author = author;
    if (podcastGuid)
        feed.podcastGuid = podcastGuid;
    if (newFeedUrl)
        feed.newFeedUrl = newFeedUrl;
    return feed;
}
/** A feed URL with a lower-cased host and no fragment, so trivial variants are one show. */
export function normaliseFeedUrl(input) {
    let u;
    try {
        u = new URL(input.trim());
    }
    catch {
        throw new InvalidInputError(`Not a feed URL: ${input}`, "podcast_rss");
    }
    if (u.protocol !== "https:" && u.protocol !== "http:")
        throw new InvalidInputError(`Feeds must be http or https: ${input}`, "podcast_rss");
    u.hash = "";
    return u.toString();
}
export function createPodcastRss(config) {
    const clock = config.clock ?? systemClock;
    async function readPublic(handle) {
        const feedUrl = normaliseFeedUrl(handle);
        const res = await withRetry(() => requestText({ fetch: config.fetch, source: "podcast_rss", url: feedUrl, headers: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.5" }, now: clock }), config.retry);
        const feed = parseFeed(res.text);
        const checkedAt = clock().toISOString();
        const result = emptyResult("podcast_rss", PODCAST_POLICY, checkedAt);
        result.warnings.push(...feed.warnings);
        if (feed.newFeedUrl && normaliseFeedUrl(feed.newFeedUrl) !== feedUrl)
            result.warnings.push(`The feed says it has moved to ${feed.newFeedUrl}`);
        // podcast:guid survives a change of host; the URL does not.
        const platformId = feed.podcastGuid ?? feedUrl;
        const account = {
            id: accountIdFor("podcast", platformId),
            creatorId: null,
            kind: "podcast",
            platformId,
            handle: feedUrl,
            title: feed.title,
            // RSS carries no audience figure.
            audience: 0,
        };
        const works = feed.episodes.map((e) => ({
            id: workIdFor("podcast", `${platformId}|${e.guid}`),
            accountId: account.id,
            kind: "podcast",
            title: e.title,
            publishedAt: e.publishedAt,
            durationSec: e.durationSec ?? 0,
            metrics: {},
        }));
        const missing = feed.episodes.filter((e) => e.durationSec === null).length;
        if (missing)
            result.warnings.push(`${missing} episodes have no readable duration; recorded as 0`);
        const provenance = { source: "podcast_rss", accountId: platformId, checkedAt, basis: "public" };
        result.snapshot = { account, works, provenance };
        return result;
    }
    return { source: "podcast_rss", kind: "podcast", basis: "public", scopes: [], refresh: PODCAST_POLICY, readPublic };
}
