/*
  Is the prefix live? Read the show's public feed and look at its newest
  episodes' enclosure URLs. This is how a creator learns their setting took,
  and it is the second of the three ownership proofs (ownership.ts): only
  someone who controls the feed can put Orbe's prefix, with their show id,
  into it.
*/
import { systemClock } from "../core/util.js";
import { normaliseFeedUrl, requestText, withRetry } from "../ingest/browser.js";
import { readFeedDetails } from "./feed.js";
import { DEFAULT_PREFIX_BASE, prefixChain } from "./prefix.js";
/** Provisional: hosts usually apply a prefix to every episode; we look at the newest few, which is where listening is. */
export const EPISODES_CHECKED = 5;
/** Hosts by the domains their enclosure files are served from, for setup help. */
export const HOST_DOMAINS = [
    { host: "Buzzsprout", pattern: /buzzsprout\.com/i },
    { host: "Libsyn", pattern: /libsyn(pro)?\.com|libsyn\.com/i },
    { host: "Transistor", pattern: /transistor\.fm/i },
    { host: "Captivate", pattern: /captivate\.fm/i },
    { host: "Simplecast", pattern: /simplecast\.com/i },
    { host: "Megaphone", pattern: /megaphone\.fm/i },
    { host: "Podbean", pattern: /podbean\.com/i },
    { host: "Acast", pattern: /acast\.com/i },
    { host: "RSS.com", pattern: /(^|[/.])rss\.com\//i },
    { host: "Spreaker", pattern: /spreaker\.com/i },
    { host: "Omny Studio", pattern: /omny\.fm|omnycontent\.com/i },
    { host: "ART19", pattern: /art19\.com/i },
    { host: "Spotify for Creators", pattern: /anchor\.fm|podcasters\.spotify\.com|spotifycdn/i },
    { host: "RedCircle", pattern: /redcircle\.com/i },
    { host: "Audioboom", pattern: /audioboom\.com/i },
];
export function hostOf(url) {
    return HOST_DOMAINS.find((h) => h.pattern.test(url))?.host ?? null;
}
export function checkPrefix(feed, showId, now, base = DEFAULT_PREFIX_BASE) {
    const newest = [...feed.enclosures].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, EPISODES_CHECKED);
    const chains = newest.map((e) => prefixChain(e.url, base));
    const withPrefix = chains.filter((c) => c.orbeShowId === showId).length;
    const otherShowIds = [...new Set(chains.map((c) => c.orbeShowId).filter((s) => !!s && s !== showId))];
    const otherPrefixes = [...new Set(chains.flatMap((c) => c.others))];
    const closedPrefixes = [...new Set(chains.flatMap((c) => c.closed))];
    const host = newest.length ? hostOf(newest[0].url) : null;
    let status;
    let message;
    if (newest.length === 0) {
        status = "no_episodes";
        message = "The feed has no episodes with audio yet, so there is nothing to check.";
    }
    else if (withPrefix === newest.length) {
        status = "live";
        message = `The Orbe prefix is on your ${newest.length} newest episodes. Downloads are being measured.`;
    }
    else if (otherShowIds.length && withPrefix === 0) {
        status = "wrong_show";
        message = "Your feed has an Orbe prefix with a different show id. Copy the prefix from your Orbe settings again.";
    }
    else if (withPrefix > 0) {
        status = "partial";
        message = `The Orbe prefix is on ${withPrefix} of your ${newest.length} newest episodes. Most hosts apply it to every episode; some only to new ones, or after the feed refreshes.`;
    }
    else {
        status = "absent";
        message = "We could not find the Orbe prefix in your feed yet. Hosts can take a few minutes to an hour to update the feed after you save the setting.";
    }
    if (closedPrefixes.length)
        message += ` Your feed still sends listeners through ${closedPrefixes.join(" and ")}, which has closed; removing it avoids failed downloads.`;
    return { status, checked: newest.length, withPrefix, otherShowIds, otherPrefixes, closedPrefixes, host, checkedAt: now.toISOString(), message };
}
/** Reads a feed with the injected fetch. Feeds are public; we identify ourselves and do not cache. */
export function feedReader(deps) {
    const clock = deps.clock ?? systemClock;
    return async (feedUrl) => {
        const res = await withRetry(() => requestText({
            fetch: deps.fetch,
            source: "podcast_rss",
            url: normaliseFeedUrl(feedUrl),
            headers: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.5", "user-agent": "OrbeBot/1.0 (+https://orbe.vc/bot)", "cache-control": "no-cache" },
            now: clock,
        }));
        return readFeedDetails(res.text);
    };
}
export async function verifyPrefixLive(read, feedUrl, showId, clock = systemClock, base = DEFAULT_PREFIX_BASE) {
    return checkPrefix(await read(feedUrl), showId, clock(), base);
}
