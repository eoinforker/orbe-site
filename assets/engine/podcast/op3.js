/*
  OP3, the Open Podcast Prefix Project (op3.dev): free, open download
  analytics for shows that add its prefix. Its data is public by design.
  The API needs a bearer token (free from op3.dev). Shapes follow OP3's API
  documentation (op3.dev/api/docs, read 21 October 2026) and its own source
  (github.com/skymethod/op3, worker/routes/api_queries_model.ts):
    GET /api/1/shows/{showUuid | podcastGuid | base64url(feed URL)}
      -> { showUuid, title, podcastGuid, statsPageUrl, ... }; 404 when OP3 does not know the show
    GET /api/1/queries/show-download-counts?showUuid=...
      -> { asof, showDownloadCounts: { [showUuid]: { days, monthlyDownloads,
           weeklyDownloads: [4 numbers], weeklyAvgDownloads, numWeeks } } }
    GET /api/1/downloads/show/{showUuid}?start=&end=&format=json&bots=exclude&limit=
      -> { rows: [{ time, url, episodeId, agentName?, countryCode?, ... }],
           count, queryTime, continuationToken? }, oldest first; start is
           inclusive and end exclusive; at most 20,000 rows a page
  OP3 counts only requests that pass through its prefix, so a show not using
  OP3 has no numbers here, and that says nothing about its size.

  Orbe reads OP3 as an independent second count: a show's daily downloads in
  the same shape the Orbe prefix's counts are kept in (DayStats), labelled as
  OP3's, never mixed into Orbe's own. Rows carry hashed addresses and
  audience ids; only the day's totals are kept.
*/
import { systemClock } from "../core/util.js";
import { enclosureKey, NotFoundError, requestJson, withQuery, withRetry } from "../ingest/browser.js";
import { prefixChain } from "./prefix.js";
import { EPISODES_CHECKED } from "./verify.js";
export const OP3_API = "https://op3.dev/api/1";
/** How every OP3 figure is labelled wherever it appears. */
export const OP3_LABEL = "Counted by OP3 (op3.dev), an open podcast prefix";
/** OP3's own cap on one page of download rows. */
export const OP3_PAGE_LIMIT = 20_000;
/** Provisional: pages read for one window before giving up, so one very large show cannot run the job for ever. */
export const OP3_MAX_PAGES = 50;
/** OP3 looks up a show by feed URL given as unpadded base64url. */
export const op3FeedRef = (feedUrl) => {
    let bin = "";
    for (const b of new TextEncoder().encode(feedUrl))
        bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export function createOp3(config) {
    const clock = config.clock ?? systemClock;
    const get = (path, query = {}) => withRetry(() => requestJson({ fetch: config.fetch, source: "podcast_rss", url: withQuery(`${OP3_API}${path}`, query), headers: { authorization: `Bearer ${config.token}`, accept: "application/json" }, now: clock }));
    return {
        async show(ref) {
            try {
                const s = await get(`/shows/${encodeURIComponent(ref)}`);
                return s.showUuid ? s : null;
            }
            catch (e) {
                if (e instanceof NotFoundError)
                    return null;
                throw e;
            }
        },
        async counts(showUuid) {
            const r = await get("/queries/show-download-counts", { showUuid });
            const c = r.showDownloadCounts?.[showUuid];
            return c ? { asof: r.asof, ...c } : null;
        },
        async downloads(showUuid, window) {
            const rows = [];
            let token;
            for (let page = 0; page < OP3_MAX_PAGES; page++) {
                const q = { start: window.start, end: window.end, format: "json", bots: "exclude", limit: String(OP3_PAGE_LIMIT) };
                if (token)
                    q.continuationToken = token;
                const r = await get(`/downloads/show/${encodeURIComponent(showUuid)}`, q);
                rows.push(...(r.rows ?? []));
                token = r.continuationToken;
                if (!token)
                    return { complete: true, rows };
            }
            return { complete: false, rows };
        },
    };
}
const nextDay = (day) => new Date(Date.parse(`${day}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
const bump = (b, k) => {
    b[k] = (b[k] ?? 0) + 1;
};
/**
  OP3's download rows as daily counts in the prefix's own shape: one row per
  day from start to end inclusive, zeros included, episodes keyed by the file
  name at the end of the URL (as Orbe's counter keys them), apps by OP3's
  agent name and countries by its country code.
*/
export function op3Days(rows, start, end) {
    const days = new Map();
    for (let d = start; d <= end; d = nextDay(d))
        days.set(d, { day: d, downloads: 0, byEpisode: {}, byApp: {}, byCountry: {} });
    for (const r of rows) {
        const s = days.get(String(r.time).slice(0, 10));
        if (!s)
            continue;
        s.downloads++;
        const key = enclosureKey(r.url);
        if (key)
            bump(s.byEpisode, key);
        bump(s.byApp, r.agentName || "Unknown");
        bump(s.byCountry, r.countryCode || "Unknown");
    }
    return [...days.values()];
}
/** Whether the show's newest episodes go through OP3's prefix, which is the only way OP3 has numbers for it. */
export function usesOp3(feed) {
    const newest = [...feed.enclosures].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, EPISODES_CHECKED);
    return newest.some((e) => prefixChain(e.url).others.includes("OP3"));
}
/**
  Provisional: how far apart Orbe's count and OP3's may be and still agree.
  Both are prefix counts under IAB-style rules, but each dedupes, filters bots
  and judges partial downloads its own way, so some difference is normal.
  Replace with a measured spread once shows have both side by side.
*/
export const OP3_TOLERANCE = 0.25;
/** Provisional: below this many downloads apart, small shows agree whatever the share. */
export const OP3_MIN_GAP = 10;
/**
  Compares Orbe's count of a window with OP3's. A disagreement is a flag for
  a person to look at, never a verdict: neither count is assumed right.
*/
export function crossCheck(orbe, op3, tolerance = OP3_TOLERANCE) {
    const gap = Math.abs(orbe - op3);
    const difference = gap / Math.max(orbe, op3, 1);
    const agree = gap <= OP3_MIN_GAP || difference <= tolerance;
    const pct = `${Math.round(difference * 100)}%`;
    return {
        status: agree ? "agree" : "disagree",
        orbe,
        op3,
        difference: Math.round(difference * 1000) / 1000,
        tolerance,
        note: agree
            ? `Orbe counted ${orbe} and OP3 counted ${op3}: ${pct} apart, inside the ${Math.round(tolerance * 100)}% Orbe allows.`
            : `Orbe counted ${orbe} and OP3 counted ${op3}: ${pct} apart, more than the ${Math.round(tolerance * 100)}% Orbe allows. A person at Orbe will look at both before anything changes.`,
    };
}
