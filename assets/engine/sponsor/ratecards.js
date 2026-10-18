/*
  PROVISIONAL rate cards: what brands pay per thousand units of delivery,
  by format, as published by third parties in 2024 to 2026.

  These are not Orbe's numbers and not facts about any creator. They are the
  starting point a price suggestion falls back to when neither the creator's
  own completed sponsorships nor enough comparable creators exist. They are
  replaced, cell by cell, by realised rates from verified sponsorships through
  Orbe (pricing.ts: own history first, then comparables). Every figure below
  comes from search snippets of the cited pages, most of them vendors or
  blogs, so each is marked "not verified" in the README; read the originals
  before quoting any of them outside the product.

  Amounts are minor units of USD per 1,000 units, because every source quotes
  US dollars. pricing.ts converts with an injected rate.
*/
export const RATE_CARD_VERSION = "2026.10-provisional";
export const PROVISIONAL_RATE_CARDS = [
    {
        format: "integration",
        kind: "youtube",
        currency: "USD",
        cpmLow: 2000,
        cpmHigh: 3500,
        per: "1,000 views at 30 days",
        note: "Integrated 60 to 90 second reads; one vendor reports a median near $26.50. Finance and B2B software sit above the range.",
        sources: [
            { label: "CreatorsJet, How much do brands pay for YouTube sponsorships (2026)", url: "https://www.creatorsjet.com/blog/how-much-do-brands-pay-for-youtube-sponsorships" },
            { label: "Start Motion Media, YouTube sponsorship rates", url: "https://www.startmotionmedia.com/startup-video-production/youtube-sponsorship-rates-descript-ai-proven-pricing-tricks-brands-dont-want-you-to-know/" },
        ],
        provisional: true,
    },
    {
        format: "dedicated",
        kind: "youtube",
        currency: "USD",
        cpmLow: 4000,
        cpmHigh: 7000,
        per: "1,000 views at 30 days",
        note: "No published comparable was found for dedicated videos. This is a placeholder at twice the integration range, because the whole upload is the sponsor's; it is the first cell to replace with realised rates.",
        sources: [],
        provisional: true,
    },
    {
        format: "newsletter_slot",
        kind: "substack",
        currency: "USD",
        cpmLow: 1500,
        cpmHigh: 5000,
        per: "1,000 unique opens at 7 days",
        note: "Secondary placements are quoted at $15 to $25 and primary placements at $35 to $50 per thousand opens. beehiiv's own Ad Network example uses a $5 CPM, which is a network rate, not a direct sponsorship.",
        sources: [
            { label: "Beamly, Sponsorship calculator", url: "https://beamly.com/tools/sponsorship-calculator/" },
            { label: "beehiiv, Ad Network FAQ", url: "https://www.beehiiv.com/support/article/17507491038231-ad-network-faq" },
        ],
        provisional: true,
    },
    {
        format: "dedicated",
        kind: "substack",
        currency: "USD",
        cpmLow: 5000,
        cpmHigh: 8000,
        per: "1,000 unique opens at 7 days",
        note: "Dedicated sends are quoted at $50 or more per thousand opens; the top of the range is a placeholder.",
        sources: [{ label: "Beamly, Sponsorship calculator", url: "https://beamly.com/tools/sponsorship-calculator/" }],
        provisional: true,
    },
    {
        format: "podcast_read",
        kind: "podcast",
        currency: "USD",
        cpmLow: 1800,
        cpmHigh: 2600,
        per: "1,000 downloads at 30 days",
        note: "AdvertiseCast's 60 second average was $21.99 in February 2024 and peaked at $25.40 in January 2022; a later blog puts 60 second host reads at $24 to $26.",
        sources: [
            { label: "RAIN News, Podcast ad rates rose (a bit) in February: Libsyn AdvertiseCast", url: "https://rainnews.com/advertisecast-podcast-ad-rates-february-2024/" },
            { label: "Podder, Podcast advertising rates", url: "https://podderapp.com/post/podcast-advertising-rates" },
        ],
        provisional: true,
    },
    {
        format: "stream_segment",
        kind: "twitch",
        currency: "USD",
        cpmLow: 80000,
        cpmHigh: 200000,
        per: "1,000 viewer-hours (average concurrent viewers × hours)",
        note: "Guides quote $0.80 to $2.00 per average concurrent viewer per hour. Sources disagree by several times and none cites primary data.",
        sources: [
            { label: "StreamScheme, Twitch sponsorship rate card", url: "https://www.streamscheme.com/twitch-sponsorship-rate-card/" },
            { label: "InfluencerFee, Twitch sponsorship rates", url: "https://influencerfee.com/blog/twitch-sponsorship-rates/" },
        ],
        provisional: true,
    },
];
export const rateCardFor = (format, kind, cards = PROVISIONAL_RATE_CARDS) => cards.find((c) => c.format === format && c.kind === kind) ?? null;
