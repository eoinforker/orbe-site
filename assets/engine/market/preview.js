/*
  Previews for the site's fee calculator: the tail clause applied to one
  made-up introduction and one off-platform completion, through the same
  assessOffPlatformCompletion the API will use. Pure and browser-safe.
*/
import { DEFAULT_MARKET_SCHEDULE } from "./fees.js";
import { BUYER_TERMS_VERSION, addCalendarMonths, assessOffPlatformCompletion } from "./introductions.js";
export function tailScenario(s, schedule = DEFAULT_MARKET_SCHEDULE) {
    const at = `${s.introducedOn}T12:00:00.000Z`;
    const tailEndsAt = schedule.tailMonths === null ? null : addCalendarMonths(at, schedule.tailMonths);
    const intro = {
        id: "preview_intro",
        listingId: "preview_listing",
        buyerId: "preview_buyer",
        creatorId: "preview_creator",
        state: "introduced",
        message: null,
        buyerTermsAcceptedAt: at,
        buyerTermsVersion: BUYER_TERMS_VERSION,
        terms: { scheduleVersion: schedule.version, premiumVersion: schedule.buyerPremium?.version ?? null, tailMonths: schedule.tailMonths },
        tailEndsAt,
        feeAgreement: { version: "preview", scheduleVersion: schedule.seller.version, acceptedAt: at },
        requestedAt: at,
        expiresAt: at,
        respondedAt: at,
        declineReason: null,
        audit: [],
    };
    const completion = {
        creatorId: "preview_creator",
        buyerId: "preview_buyer",
        completedAt: `${s.completedOn}T12:00:00.000Z`,
        price: s.price,
        structure: s.structure,
        reportedAt: `${s.reportedOn ?? s.completedOn}T12:00:00.000Z`,
        reportedBy: { role: "creator", id: "preview_creator" },
    };
    return { assessment: assessOffPlatformCompletion(completion, s.introduced === false ? [] : [intro], schedule), tailEndsAt };
}
