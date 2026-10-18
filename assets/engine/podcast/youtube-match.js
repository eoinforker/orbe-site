/*
  The video versions of episodes on YouTube, matched by title and date. The
  YouTube read itself is ingest's public connector (createYouTubePublic),
  passed in as its result, so this module adds no quota of its own and keeps
  YouTube's 30-day rule where the connector applies it.
  Since 24 August 2026 a public YouTube view counts from the first frame,
  autoplay included (docs/research/podcasts.md, section 5), so views of
  videos published from then on are marked as a separate series.
*/
/** The day YouTube's public view count changed meaning. */
export const YOUTUBE_FIRST_FRAME_FROM = "2026-08-24";
/** Provisional: how alike two titles must be (token overlap) and how far apart the dates may be. */
export const TITLE_SIMILARITY = 0.6;
export const MAX_DAYS_APART = 3;
const STOP = new Set(["the", "a", "an", "and", "of", "to", "in", "on", "with", "ep", "episode", "podcast", "full", "video", "official"]);
export function titleTokens(t) {
    return new Set(t
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter((w) => w && !STOP.has(w)));
}
/** Overlap of title words, 0 to 1, as the share of the shorter title's words found in the longer. */
export function titleSimilarity(a, b) {
    const x = titleTokens(a);
    const y = titleTokens(b);
    if (!x.size || !y.size)
        return 0;
    const [small, big] = x.size <= y.size ? [x, y] : [y, x];
    let hit = 0;
    for (const w of small)
        if (big.has(w))
            hit++;
    return hit / small.size;
}
/** Each episode's best video match, each video used once. */
export function matchVideos(episodes, videos) {
    const cands = [];
    for (const e of episodes) {
        for (const v of videos) {
            if (typeof v.metrics.views !== "number")
                continue;
            const days = Math.abs(Date.parse(e.publishedAt) - Date.parse(v.publishedAt)) / 864e5;
            if (days > MAX_DAYS_APART)
                continue;
            const sim = titleSimilarity(e.title, v.title);
            if (sim < TITLE_SIMILARITY)
                continue;
            cands.push({ episodeGuid: e.guid, videoWorkId: v.id, videoTitle: v.title, views: v.metrics.views, daysApart: Math.round(days * 10) / 10, similarity: Math.round(sim * 100) / 100, firstFrameCount: v.publishedAt.slice(0, 10) >= YOUTUBE_FIRST_FRAME_FROM });
        }
    }
    cands.sort((a, b) => b.similarity - a.similarity || a.daysApart - b.daysApart);
    const usedE = new Set();
    const usedV = new Set();
    const out = [];
    for (const c of cands) {
        if (usedE.has(c.episodeGuid) || usedV.has(c.videoWorkId))
            continue;
        usedE.add(c.episodeGuid);
        usedV.add(c.videoWorkId);
        out.push(c);
    }
    return out;
}
