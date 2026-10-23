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
  "You pay each sponsorship in advance, before the creator starts. The money is held until delivery is verified from the creator's own accounts; the creator is then paid, and any shortfall against an agreed guarantee is made good or refunded as the offer says. Orbe's fee is shown on every offer. You and the creator are each responsible for disclosing the sponsorship as the law requires where it is seen; Orbe checks what it can read and tells you both.";

/** A handle as its platform writes it: an @ on YouTube and Twitch, never on a podcast or newsletter. */
export const handleOf = (handle, kind) => {
  const bare = String(handle ?? "").replace(/^@+/, "");
  return kind === "youtube" || kind === "twitch" ? `@${bare}` : bare;
};

export const KINDS = { youtube: "YouTube", substack: "Newsletter", twitch: "Twitch", podcast: "Podcast", photography: "Photography" };

/** Size bands in words, smallest to largest, as the brand side's reports say them (services/brandintel.ts BAND_WORDS). */
export const SIZE_WORDS = { seed: "Smallest", rise: "Small", low: "Lower middle", mid: "Middle", high: "Large", top: "Top", unknown: "Not public" };
/** rating/kinds.ts sizeBands, each band's range in the kind's own unit, as creators see it. */
export const SIZE_RANGES = {
  youtube: { unit: "subscribers", seed: "Under 10k", rise: "10k to 100k", low: "100k to 250k", mid: "250k to 1M", high: "1M to 5M", top: "Over 5M" },
  substack: { unit: "subscribers", seed: "Under 1k", rise: "1k to 10k", low: "10k to 50k", mid: "50k to 250k", top: "Over 250k" },
  twitch: { unit: "followers", seed: "Under 1k", rise: "1k to 10k", low: "10k to 100k", mid: "100k to 1M", top: "Over 1M" },
  podcast: { unit: "followers", seed: "Under 1k", rise: "1k to 5k", low: "5k to 25k", mid: "25k to 100k", top: "Over 100k" },
};
/** A band in words, with its range when the kind is known: "Small, 10k to 100k subscribers". */
export const sizeWords = (band, kind) => {
  const word = SIZE_WORDS[band] ?? "Not public";
  const r = SIZE_RANGES[kind];
  return r?.[band] ? `${word}, ${r[band]} ${r.unit}` : word;
};

/** What each consent lets Orbe do, and what revoking it removes (store/revoke.ts). */
export const CONSENTS = {
  connect: {
    name: "Read what you connect",
    grants: "Orbe reads the accounts you connect (YouTube Analytics, AdSense, Patreon, Stripe) and the exports you upload.",
    revoking: "Deletes every connection and everything read through them: connected revenue, connected figures and snapshots. Reports built on them are withdrawn.",
  },
  rate_public: {
    name: "Keep your rating on file",
    grants: "Orbe keeps your rating and each work's rating, so your record and card can show them.",
    revoking: "Deletes your stored ratings, your works' ratings and your personal bests.",
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
