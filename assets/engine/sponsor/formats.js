/*
  What a creator can sell, kind by kind, and how each format's delivery is
  measured. Everything kind-specific is data here, so verification, pricing and
  reporting have no per-kind branches.

  Delivery is always read from the work itself, in the kind's own terms
  (core Work.metrics): YouTube views, newsletter opens, podcast downloads in
  the IAB-style 7 and 30 day windows, Twitch average viewers. Never a
  screenshot, never a creator's say-so.
*/
export const SPONSOR_FORMATS = ["integration", "dedicated", "newsletter_slot", "podcast_read", "stream_segment"];
const YOUTUBE_SOURCES = ["youtube_analytics", "youtube_public"];
export const FORMAT_SPECS = [
    {
        format: "integration",
        kind: "youtube",
        name: "Integrated sponsorship",
        description: "A 60 to 90 second read inside a long-form upload.",
        metric: "views",
        unit: "views",
        quantity: "placement",
        windows: [7, 30],
        priceWindow: 30,
        lateToleranceDays: { 7: 2, 30: 5 },
        sources: YOUTUBE_SOURCES,
        durationSec: { min: 181 },
    },
    {
        format: "dedicated",
        kind: "youtube",
        name: "Dedicated video",
        description: "A whole long-form upload about the sponsor's product.",
        metric: "views",
        unit: "views",
        quantity: "placement",
        windows: [7, 30],
        priceWindow: 30,
        lateToleranceDays: { 7: 2, 30: 5 },
        sources: YOUTUBE_SOURCES,
        durationSec: { min: 181 },
    },
    {
        format: "newsletter_slot",
        kind: "substack",
        name: "Newsletter sponsor slot",
        description: "A labelled sponsor block in a regular issue.",
        metric: "opens",
        unit: "opens",
        quantity: "placement",
        windows: [7, 30],
        priceWindow: 7,
        // Opens mature within a day or two (rating tau 1 day), so a late reading barely moves.
        lateToleranceDays: { 7: 7, 30: 14 },
        sources: ["substack_export"],
    },
    {
        format: "dedicated",
        kind: "substack",
        name: "Dedicated send",
        description: "A whole issue for one sponsor, sent to the full list.",
        metric: "opens",
        unit: "opens",
        quantity: "placement",
        windows: [7, 30],
        priceWindow: 7,
        lateToleranceDays: { 7: 7, 30: 14 },
        sources: ["substack_export"],
    },
    {
        format: "podcast_read",
        kind: "podcast",
        name: "Host-read podcast spot",
        description: "A 60 second host-read mid-roll in an episode.",
        metric: "downloads",
        unit: "downloads",
        quantity: "placement",
        windows: [7, 30],
        priceWindow: 30,
        // The host's own windowed counts, so a late reading is still exact.
        windowedMetric: { 7: "downloads_7d", 30: "downloads_30d" },
        lateToleranceDays: { 7: 365, 30: 365 },
        sources: ["podcast_host", "podcast_rss"],
    },
    {
        format: "stream_segment",
        kind: "twitch",
        name: "Sponsored stream segment",
        description: "A sponsored segment of a live stream, sold by the hour.",
        metric: "avg_viewers",
        unit: "viewer-hours",
        quantity: "hour",
        // A stream's audience is live: it is read once, the day after the stream.
        windows: [1],
        priceWindow: 1,
        lateToleranceDays: { 1: 14 },
        sources: ["twitch"],
    },
];
export const specFor = (format, kind) => FORMAT_SPECS.find((s) => s.format === format && s.kind === kind) ?? null;
export const specsForKind = (kind) => FORMAT_SPECS.filter((s) => s.kind === kind);
export const finalWindow = (spec) => spec.windows[spec.windows.length - 1];
/** Units of delivery a reading represents: views as read, or average viewers × hours sponsored. */
export const unitsFor = (spec, metricValue, quantity) => spec.quantity === "hour" ? metricValue * quantity : metricValue;
/*
  Size bands, copied from the rating's kind specs (rating/kinds.ts) so
  comparables are drawn from creators of the same size. If the rating's
  bands change, change these with them (CORE-REQUESTS.md asks for one shared table).
*/
export const SIZE_BANDS = {
    youtube: [
        { key: "seed", min: 0, max: 1e4 },
        { key: "rise", min: 1e4, max: 1e5 },
        { key: "low", min: 1e5, max: 2.5e5 },
        { key: "mid", min: 2.5e5, max: 1e6 },
        { key: "high", min: 1e6, max: 5e6 },
        { key: "top", min: 5e6 },
    ],
    substack: [
        { key: "seed", min: 0, max: 1e3 },
        { key: "rise", min: 1e3, max: 1e4 },
        { key: "low", min: 1e4, max: 5e4 },
        { key: "mid", min: 5e4, max: 2.5e5 },
        { key: "top", min: 2.5e5 },
    ],
    twitch: [
        { key: "seed", min: 0, max: 1e3 },
        { key: "rise", min: 1e3, max: 1e4 },
        { key: "low", min: 1e4, max: 1e5 },
        { key: "mid", min: 1e5, max: 1e6 },
        { key: "top", min: 1e6 },
    ],
    podcast: [
        { key: "seed", min: 0, max: 1e3 },
        { key: "rise", min: 1e3, max: 5e3 },
        { key: "low", min: 5e3, max: 2.5e4 },
        { key: "mid", min: 2.5e4, max: 1e5 },
        { key: "top", min: 1e5 },
    ],
    photography: [{ key: "all", min: 0 }],
};
export function sizeBandFor(kind, audience) {
    const band = SIZE_BANDS[kind].find((b) => audience >= b.min && (b.max === undefined || audience < b.max));
    return band ? band.key : SIZE_BANDS[kind][0].key;
}
/** "a" or "an" before a format's name in lower case, so a sentence reads "an integrated sponsorship". */
export const withArticle = (name) => `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`;
