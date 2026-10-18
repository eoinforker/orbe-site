/*
  Podcast Index (api.podcastindex.org), a free, open directory of about
  4.7 million feeds. A free key and secret from api.podcastindex.org.
  Every request carries, per the Index's own example code
  (github.com/Podcastindex-org/example-code):
    User-Agent:    who we are
    X-Auth-Key:    the API key
    X-Auth-Date:   now, in Unix seconds
    Authorization: SHA-1 hex of key + secret + that same X-Auth-Date
  The Index gives no download counts. It gives the cross-checks around them:
  the Apple id, how many episodes exist, when the feed began and last
  published, whether the feed is dead or locked, and the podcast:guid.
*/
import { sha1Hex } from "../core/hash.js";
import { systemClock } from "../core/util.js";
import { ConfigError, requestJson, withQuery, withRetry } from "../ingest/browser.js";
export const PODCAST_INDEX_API = "https://api.podcastindex.org/api/1.0";
/** The four auth headers, built from one timestamp so the hash and the date always agree. */
export function podcastIndexHeaders(key, secret, now, userAgent = "Orbe/1.0 (+https://orbe.vc)") {
    if (!key || !secret)
        throw new ConfigError("Podcast Index needs an API key and secret");
    const date = String(Math.floor(now.getTime() / 1000));
    const authorization = sha1Hex(key + secret + date);
    return { "user-agent": userAgent, "x-auth-key": key, "x-auth-date": date, authorization, accept: "application/json" };
}
export function createPodcastIndex(config) {
    const clock = config.clock ?? systemClock;
    const get = (path, query) => withRetry(() => requestJson({ fetch: config.fetch, source: "podcast_rss", url: withQuery(`${PODCAST_INDEX_API}${path}`, query), headers: podcastIndexHeaders(config.key, config.secret, clock(), config.userAgent), now: clock }));
    // The Index answers "not found" with 200 and an empty feed, sometimes an empty array.
    const feedOf = (r) => (r.feed && !Array.isArray(r.feed) && r.feed.id ? r.feed : null);
    return {
        byFeedUrl: async (url) => feedOf(await get("/podcasts/byfeedurl", { url })),
        byGuid: async (guid) => feedOf(await get("/podcasts/byguid", { guid })),
        byItunesId: async (id) => feedOf(await get("/podcasts/byitunesid", { id })),
        episodes: async (feedId, max = 100) => (await get("/episodes/byfeedid", { id: feedId, max })).items ?? [],
    };
}
