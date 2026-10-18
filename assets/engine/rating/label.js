/*
  The label every Orbe Rating carries. YouTube's derived-metrics policy
  (YouTube API Services Developer Policies, Section L, and the derived metrics
  page) allows custom scores, bands and benchmarks only when they are labelled
  "clearly and prominently" as generated independently by the developer and not
  sourced from YouTube. We label every kind the same way, so no surface has to
  remember which kinds need it. The site, the card and every report show
  RATING_LABEL wherever a rating, band, sub-score or benchmark appears, and
  RATING_NOTICE in full wherever there is room for a sentence.
*/
/** The short label, shown next to every rating, band, sub-score and benchmark. Do not shorten or restyle it. */
export const RATING_LABEL = "Independently calculated by Orbe";
/** The platform each kind's numbers come from, named in the notice. */
export const PLATFORM_NAME = {
    youtube: "YouTube or Google",
    substack: "Substack",
    twitch: "Twitch",
    podcast: "any podcast platform",
    photography: "any photography platform",
};
/** The full sentence for a kind: what the label means and who did not provide it. */
export function ratingNotice(kind) {
    return `${RATING_LABEL}. It is not a ${kind === "youtube" ? "YouTube" : "platform"} metric, and it is not provided or endorsed by ${PLATFORM_NAME[kind]}.`;
}
/** The YouTube notice, the one the YouTube API Services review reads. */
export const RATING_NOTICE = ratingNotice("youtube");
/** Where the published maths lives; the label links to it. */
export const MATHS_URL = "https://orbe.vc/maths";
export function attributionFor(kind) {
    return { label: RATING_LABEL, notice: ratingNotice(kind), maths: MATHS_URL };
}
/**
  For money Orbe works out from what a platform reports (the indicative value,
  and any figure built on YouTube's estimatedRevenue). YouTube's derived-metrics
  page asks that financial projections be presented as third-party estimates
  with a prominent note that they are not approved by Google.
*/
export const ESTIMATE_NOTICE = "Indicative value independently calculated by Orbe from your connected revenue. It is an estimate, not advice and not an offer, and it is not provided or approved by YouTube or Google.";
