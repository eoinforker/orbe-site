/*
  OP3, the Open Podcast Prefix Project (op3.dev): free, open download
  analytics for shows that add its prefix. Its data is public by design.
  The API needs a bearer token (free from op3.dev). Shapes follow OP3's own
  source (github.com/skymethod/op3, worker/routes/api_queries_model.ts):
    GET /api/1/shows/{showUuid | podcastGuid | base64url(feed URL)}
      -> { showUuid, title, podcastGuid, ... }
    GET /api/1/queries/show-download-counts?showUuid=...
      -> { asof, showDownloadCounts: { [showUuid]: { days, monthlyDownloads,
           weeklyDownloads: [4 numbers], weeklyAvgDownloads, numWeeks } } }
  OP3 counts only requests that pass through its prefix, so a show not using
  OP3 has no numbers here, and that says nothing about its size.
*/
import { systemClock } from "../core/util.js";
import { NotFoundError, requestJson, withQuery, withRetry } from "../ingest/browser.js";
export const OP3_API = "https://op3.dev/api/1";
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
    };
}
