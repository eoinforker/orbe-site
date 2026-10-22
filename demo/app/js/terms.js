/*
  Words and constants the app shows that mirror the engine. The web app test
  checks each against its source module (sponsor formats and shortfall terms,
  the take rate, consent scopes, connection sources), so they cannot drift.
*/

/** sponsor/formats.ts FORMAT_SPECS: what each kind of account can sell. */
export const FORMATS = [
  { format: "integration", kind: "youtube", name: "Integrated sponsorship", unit: "views" },
  { format: "dedicated", kind: "youtube", name: "Dedicated video", unit: "views" },
  { format: "newsletter_slot", kind: "substack", name: "Newsletter sponsor slot", unit: "opens" },
  { format: "dedicated", kind: "substack", name: "Dedicated send", unit: "opens" },
  { format: "podcast_read", kind: "podcast", name: "Host-read podcast spot", unit: "downloads" },
  { format: "stream_segment", kind: "twitch", name: "Sponsored stream segment", unit: "viewer-hours" },
];

export const formatName = (format, kind) => FORMATS.find((f) => f.format === format && (!kind || f.kind === kind))?.name ?? format.replaceAll("_", " ");
export const unitOf = (format, kind) => FORMATS.find((f) => f.format === format && f.kind === kind)?.unit ?? "units";

/** sponsor/guarantee.ts DEFAULT_SHORTFALL: provisional, set on every offer until offers let brands and creators choose. */
export const SHORTFALL = { toleranceBps: 500, floorBps: 5000, makeGoodDays: 30 };

/** sponsor/fees.ts DEFAULT_TAKE_RATE: Orbe's fee on a network deal, paid by the brand on top of the creator's price. */
export const TAKE_RATE = { networkBps: 1500, directBps: 500, payer: "brand" };

/** sponsor/campaigns.ts BRAND_TERMS, word for word: what a brand accepts before sending an offer. */
export const BRAND_TERMS =
  "You pay each sponsorship in advance to Orbe's payments partner, which holds the money. Orbe never holds it. The creator is paid when delivery is verified from their own accounts, and any shortfall against an agreed guarantee is made good or refunded as the offer says. Orbe's fee is shown on every offer. You and the creator are each responsible for disclosing the sponsorship as the law requires where it is seen; Orbe checks what it can read and tells you both.";

export const KINDS = { youtube: "YouTube", substack: "Substack", twitch: "Twitch", podcast: "Podcast", photography: "Photography" };

/** What each consent lets Orbe do, and what revoking it removes (store/revoke.ts). */
export const CONSENTS = {
  connect: {
    name: "Read what you connect",
    grants: "Orbe reads the accounts you connect (YouTube Analytics, AdSense, Patreon, Stripe) and the exports you upload.",
    revoking: "Deletes every connection and everything read through them: connected revenue, connected figures and snapshots. Reports built on them are withdrawn.",
  },
  rate_public: {
    name: "Keep your rating on file",
    grants: "Orbe keeps your rating and each upload's rating, so your record and card can show them.",
    revoking: "Deletes your stored ratings, your uploads' ratings and your personal bests.",
  },
  verified_profile: {
    name: "A public profile",
    grants: "You may publish your profile and its card, with your rating, at a link you can share.",
    revoking: "Unpublishes your profile. Your card and share link stop working.",
  },
  benchmarks: {
    name: "Count me in benchmarks",
    grants: "Your figures count, without your name, in the benchmarks that rate creators your size.",
    revoking: "Takes you out of every season not yet published. Published seasons are anonymous and cannot be unpicked.",
  },
  listing: {
    name: "List my business",
    grants: "You may list your business for vetted buyers to see, and answer their introductions.",
    revoking: "Withdraws your listings and closes their open introductions.",
  },
  share_with_buyer: {
    name: "Shared with a buyer",
    grants: "One buyer may read your full file, because you approved their introduction.",
    revoking: "Withdraws your introduction with that buyer and the reports issued to them.",
  },
};

/** api/services/connect.ts OAUTH_SOURCES: connections made through the platform's own sign-in. */
export const SOURCES = {
  youtube_analytics: { name: "YouTube Analytics", what: "Views, watch time and audience for a channel you own. Connecting it is how you claim the channel." },
  adsense: { name: "AdSense", what: "Ad earnings, month by month." },
  patreon: { name: "Patreon", what: "Members and pledges." },
  stripe: { name: "Stripe", what: "Charges and payouts, read only. Orbe never moves money." },
};
