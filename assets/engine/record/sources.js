/*
  What the record knows about each source: how long its data stays fresh, how
  to read a line's measure, who pays, and which sources measure the same money
  so a total never counts it twice.
*/
import { daysBetween } from "./util.js";
/**
  Provisional windows. They follow each source's own rhythm (AdSense finalises
  monthly, Stripe is live, exports are manual) but the exact days are Orbe's
  judgement, to be replaced by what buyers accept once the first reports are
  sold. The YouTube limit is not a judgement: API data must be refreshed or
  deleted within 30 days under the YouTube API Services terms.
*/
export const FRESHNESS_WINDOWS = {
    youtube_public: { freshDays: 7, staleAfterDays: 30, hardLimitDays: 30, why: "YouTube API data must be refreshed or deleted within 30 days" },
    youtube_analytics: { freshDays: 7, staleAfterDays: 30, hardLimitDays: 30, why: "YouTube API data must be refreshed or deleted within 30 days" },
    adsense: { freshDays: 35, staleAfterDays: 65, hardLimitDays: null, why: "AdSense finalises earnings once a month" },
    stripe: { freshDays: 7, staleAfterDays: 30, hardLimitDays: null, why: "Stripe is read live, so a week-old read is already behind" },
    substack_export: { freshDays: 30, staleAfterDays: 90, hardLimitDays: null, why: "Substack data arrives as a manual export" },
    patreon: { freshDays: 7, staleAfterDays: 30, hardLimitDays: null, why: "Patreon is read live through its API" },
    twitch: { freshDays: 7, staleAfterDays: 30, hardLimitDays: null, why: "Twitch is read live through its API" },
    podcast_rss: { freshDays: 7, staleAfterDays: 30, hardLimitDays: null, why: "Feeds change with every episode" },
    podcast_host: { freshDays: 14, staleAfterDays: 45, hardLimitDays: null, why: "Host statistics settle over a fortnight" },
    photo_licensing: { freshDays: 30, staleAfterDays: 90, hardLimitDays: null, why: "Licensing statements are periodic" },
    invoice_upload: { freshDays: 30, staleAfterDays: 90, hardLimitDays: null, why: "Uploaded invoices describe the past and are not refreshed automatically" },
};
export function freshnessOf(source, checkedAt, now) {
    const w = FRESHNESS_WINDOWS[source];
    const ageDays = Math.max(0, daysBetween(checkedAt, now));
    const status = ageDays <= w.freshDays ? "fresh" : ageDays <= w.staleAfterDays ? "ageing" : "stale";
    return { status, ageDays, overHardLimit: w.hardLimitDays !== null && ageDays > w.hardLimitDays };
}
export const SOURCE_LABEL = {
    youtube_public: "YouTube public data",
    youtube_analytics: "YouTube Analytics",
    adsense: "Google AdSense",
    stripe: "Stripe",
    substack_export: "Substack export",
    patreon: "Patreon",
    twitch: "Twitch",
    podcast_rss: "Podcast RSS feed",
    podcast_host: "Podcast host",
    photo_licensing: "Photo licensing statements",
    invoice_upload: "Uploaded invoices",
};
/** Who pays the money a line records. */
export const PAYER = {
    youtube_public: "YouTube",
    youtube_analytics: "YouTube",
    adsense: "YouTube",
    stripe: "Stripe (direct)",
    substack_export: "Substack",
    patreon: "Patreon",
    twitch: "Twitch",
    podcast_rss: "Podcast host",
    podcast_host: "Podcast host",
    photo_licensing: "Licensing agencies",
    invoice_upload: "Invoiced directly",
};
/** The audience platform a source's money depends on, when the source itself implies it. */
export const SOURCE_AUDIENCE = {
    youtube_public: "youtube",
    youtube_analytics: "youtube",
    adsense: "youtube",
    substack_export: "substack",
    twitch: "twitch",
    podcast_rss: "podcast",
    podcast_host: "podcast",
    photo_licensing: "photography",
};
/** Stripe payouts are recognised by an explicit measure, or by a counterparty the connector names as a payout. */
const PAYOUT = /\bpayouts?\b/i;
export function defaultMeasure(line) {
    if (line.measure)
        return line.measure;
    if (line.provenance.source === "youtube_analytics")
        return "estimated";
    if (line.provenance.source === "invoice_upload")
        return "invoiced";
    if (line.counterparty && PAYOUT.test(line.counterparty))
        return "paid_out";
    return "earned";
}
export const OVERLAPS = [
    {
        sources: ["adsense", "youtube_analytics"],
        streams: ["ads"],
        sameAccount: false,
        why: "AdSense pays the YouTube ad revenue that YouTube Analytics estimates; AdSense is finalised, so it wins",
    },
    {
        sources: ["stripe", "substack_export"],
        streams: ["subscriptions"],
        sameAccount: false,
        why: "Substack charges paid subscribers through the creator's Stripe account; the Stripe ledger wins",
    },
];
/** Best first: connected before uploaded before public. */
const BASIS_RANK = { connected: 0, uploaded: 1, public: 2 };
export const basisRank = (basis) => BASIS_RANK[basis];
