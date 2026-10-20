/*
  Orbe Rights Record v0: the shapes. An open format (see SPEC.md) for who made
  a piece of work, who owns it, what the creator let a team do, and what a brand
  may do with it, kept as an append-only, hash-chained list of events.

  Every number is an integer: shares in basis points (10000 is the whole work),
  fees in minor units (pence, cents). Times are RFC 3339 with an offset; grant
  bounds may also be bare dates (YYYY-MM-DD, read in UTC, end inclusive).
*/
export const FORMAT = "orbe-rights-record";
export const FORMAT_VERSION = "0";
export const GENESIS = "0".repeat(64);
export const WHOLE = 10000;
export const PARTY_KINDS = ["creator", "brand", "agency", "team"];
export const WORK_KINDS = ["video", "photo", "audio", "text", "stream", "other"];
/** A creator's grant of authority to a team. */
export const CONSENT_SCOPES = ["roster", "claim", "license", "show_buyers"];
export const SCOPE_WORDS = {
    roster: "Manage me on a roster",
    claim: "Claim my work on my behalf",
    license: "License my work on my behalf",
    show_buyers: "Show my record to buyers",
};
/** Channels a usage grant can name. "other:<slug>" is allowed for anything not listed. */
export const CHANNELS = ["instagram", "tiktok", "youtube", "facebook", "pinterest", "x", "snapchat", "web", "email", "retail", "ooh", "tv", "print"];
/** organic: unpaid posts; paid: money behind it; both. */
export const MEDIA = ["organic", "paid", "both"];
/** What a brand wants to do, when asking canUse. */
export const USES = ["organic", "paid", "whitelisting", "ad"];
export const EVENT_TYPES = [
    "work.registered",
    "ownership.set",
    "ownership.transferred",
    "consent.granted",
    "consent.revoked",
    "grant.issued",
    "grant.extended",
    "grant.revoked",
    "usage.reported",
    "usage.ended",
];
