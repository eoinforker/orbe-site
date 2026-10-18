/*
  Promo attribution, Orbe's version of Chartable's SmartPromos. When show A
  runs an ad or cross-promo for show B, and both use the Orbe prefix, how
  many listeners who downloaded A's promo episode went on to download B for
  the first time within 30 days?

  Privacy, in full:
  - Nothing here sees an IP or a user agent. Each counted download of a show
    in a live campaign carries promo tokens: HMACs of IP and user agent made
    with a salt that lives one 30-day epoch and is destroyed after the next
    (privacy.ts). A request carries the current epoch's token and the
    previous one's, so two requests up to 30 days apart always share one.
  - Tokens are kept as "sightings" (show, episode, day, tokens) only for
    shows in a live campaign, and deleted after SIGHTING_DAYS. When the
    salts are gone, the tokens link to nothing.
  - Results are aggregate counts only, never a list, and only when both
    the exposed and the converted counts reach MIN_REPORTABLE; counts are
    rounded to the nearest ROUND_TO so that two overlapping reports cannot
    be subtracted to single out a listener.
  - Shows join a campaign by both creators' consent; neither sees the
    other's listeners, only the shared aggregate.
  - A token is a household device and app, not a person: shared IPs merge
    listeners and changing networks splits one. We say so wherever the
    numbers appear: "estimated listeners".
*/
import { episodeKeyOf } from "./iab.js";
/** The attribution window. */
export const PROMO_WINDOW_DAYS = 30;
/** Provisional: below this many, a count is too small to share without risking re-identification. */
export const MIN_REPORTABLE = 10;
/** Provisional: published counts are rounded to the nearest five. */
export const ROUND_TO = 5;
/** Sightings outlive their salts by nothing: two epochs. */
export const SIGHTING_DAYS = 60;
/** How far back we look for listeners the promoted show already had, so they are not counted as won. */
export const LOOKBACK_DAYS = 30;
export function memoryPromoStore() {
    let rows = [];
    return {
        add: (s) => void rows.push(s),
        forShow: (showId, from, to) => rows.filter((r) => r.showId === showId && r.day >= from && r.day <= to),
        purgeBefore(day) {
            const n = rows.length;
            rows = rows.filter((r) => r.day >= day);
            return n - rows.length;
        },
    };
}
/**
  Sightings from one day's logs: only downloads that passed the counting
  rules, only for shows with promo tokens, one per listener, episode and day.
*/
export function sightingsFrom(records, counted) {
    const tokens = new Map();
    for (const r of records) {
        if (r.kind !== "download" || !r.promo?.length)
            continue;
        const k = `${r.at.slice(0, 10)}|${r.showId}|${episodeKeyOf(r.target)}|${r.listener}`;
        if (!tokens.has(k))
            tokens.set(k, r.promo);
    }
    const out = [];
    for (const d of counted) {
        const t = tokens.get(`${d.day}|${d.showId}|${d.episodeKey}|${d.listener}`);
        if (t)
            out.push({ showId: d.showId, episodeKey: d.episodeKey, day: d.day, tokens: t });
    }
    return out;
}
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const round = (n) => Math.round(n / ROUND_TO) * ROUND_TO;
/**
  Attribution for one campaign up to `through` (the last full day counted).
  Exposed: distinct listener tokens who downloaded a promo episode. Already
  listening: of those, ones the promoted show saw in the LOOKBACK_DAYS before
  their exposure. Converted: the rest who downloaded the promoted show within
  PROMO_WINDOW_DAYS after exposure.
*/
export function attribute(store, c, through) {
    const exposureEnd = c.endDay && c.endDay < through ? c.endDay : through;
    const keys = new Set(c.episodeKeys);
    const exposures = store.forShow(c.hostShowId, c.startDay, exposureEnd).filter((s) => keys.has(s.episodeKey));
    // Each listener's first exposure, keyed by their primary token; all their tokens are kept for matching.
    const firstExposure = new Map();
    for (const s of [...exposures].sort((a, b) => (a.day < b.day ? -1 : 1))) {
        if (!s.tokens.some((t) => firstExposure.has(t)))
            for (const t of s.tokens)
                firstExposure.set(t, s);
    }
    const exposedListeners = new Set(firstExposure.values());
    const promoted = store.forShow(c.promotedShowId, addDays(c.startDay, -LOOKBACK_DAYS), addDays(exposureEnd, PROMO_WINDOW_DAYS)).filter((s) => s.day <= through);
    let already = 0;
    let converted = 0;
    for (const e of exposedListeners) {
        const theirs = promoted.filter((p) => p.tokens.some((t) => e.tokens.includes(t)));
        if (theirs.some((p) => p.day < e.day && p.day >= addDays(e.day, -LOOKBACK_DAYS))) {
            already++;
            continue;
        }
        if (theirs.some((p) => p.day >= e.day && p.day <= addDays(e.day, PROMO_WINDOW_DAYS)))
            converted++;
    }
    const exposed = exposedListeners.size;
    const note = "Estimated listeners: one listener is one device and app on one network, matched without keeping IP addresses. Counts are rounded to the nearest five.";
    if (exposed < MIN_REPORTABLE || converted < MIN_REPORTABLE)
        return { status: "too_few", campaignId: c.id, threshold: MIN_REPORTABLE, through, note: `Fewer than ${MIN_REPORTABLE} listeners on one side so far, so nothing is shown yet. ${note}` };
    return { status: "reported", campaignId: c.id, exposed: round(exposed), converted: round(converted), alreadyListening: round(already), conversionRate: Math.round((converted / (exposed - already || 1)) * 1000) / 1000, windowDays: PROMO_WINDOW_DAYS, through, note };
}
