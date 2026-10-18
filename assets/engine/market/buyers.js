/*
  Buyer access levels and what each one can see and do.

  Under the take rate (MODEL.md Part 6) access is free but vetted: Orbe checks
  who the buyer is, that they can fund a purchase, and that they have accepted
  the buyer terms (introduce only, the buyer's premium and the tail clause).
  Buyers pay when money moves, through the premium at completion, not for a
  login. The core `Buyer.plan` field now names an access level: "member" is a
  vetted buyer, "institutional" a vetted institution, "none" not vetted; and
  `planRenewsAt` is when the vetting falls due again. Under the memberships
  model (MEMBERSHIP_BUYER_PRICING) the same levels are bought instead.

  Anyone may browse anonymised cards. Vetted buyers see new listings first, save
  searches, see full verified files once a creator agrees, and request
  introductions. Institutions add benchmark feeds, valuation marks, the deal-flow
  API and more seats.
*/
import { DEFAULT_BUYER_PRICING, MEMBERSHIP_BUYER_PRICING, membershipPrice, reportPrice } from "./fees.js";
import { isLive } from "./listings.js";
import { addDays } from "./months.js";
/*
  Early access window. PROVISIONAL: Microns.io shows free buyers deals five days
  late (MODEL.md Part 2). Seven days gives members one full working week; tune it
  against how quickly first introductions are requested on real listings.
*/
export const EARLY_ACCESS_DAYS = 7;
/* Saved search and seat limits are PROVISIONAL product choices, not research. */
export const PLAN_ENTITLEMENTS = {
    none: {
        browseCards: true,
        earlyAccess: false,
        seeFullFiles: false,
        requestIntroductions: false,
        directMessaging: false,
        savedSearches: 0,
        benchmarkFeed: false,
        valuationMarks: false,
        dealFlowApi: false,
        seats: 1,
    },
    member: {
        browseCards: true,
        earlyAccess: true,
        seeFullFiles: true,
        requestIntroductions: true,
        directMessaging: true,
        savedSearches: 20,
        benchmarkFeed: false,
        valuationMarks: false,
        dealFlowApi: false,
        seats: 1,
    },
    institutional: {
        browseCards: true,
        earlyAccess: true,
        seeFullFiles: true,
        requestIntroductions: true,
        directMessaging: true,
        savedSearches: Infinity,
        benchmarkFeed: true,
        valuationMarks: true,
        dealFlowApi: true,
        seats: 5,
    },
};
export const entitlements = (plan) => PLAN_ENTITLEMENTS[plan];
/** A paid plan counts only while it is in date; a lapsed membership is treated as no plan. */
export function effectivePlan(buyer, at) {
    if (buyer.plan === "none" || buyer.planRenewsAt === null)
        return "none";
    return Date.parse(buyer.planRenewsAt) > Date.parse(at) ? buyer.plan : "none";
}
const ACTION_COPY = {
    browseCards: "browse listings",
    earlyAccess: "see new listings early",
    seeFullFiles: "see full verified files",
    requestIntroductions: "request introductions",
    directMessaging: "message creators",
    benchmarkFeed: "use the benchmark feed",
    valuationMarks: "see valuation marks",
    dealFlowApi: "use the deal-flow API",
};
export function can(buyer, action, at, pricing = DEFAULT_BUYER_PRICING) {
    const plan = effectivePlan(buyer, at);
    if (entitlements(plan)[action])
        return { allowed: true };
    const lapsed = buyer.plan !== "none" && plan === "none";
    const forMembers = PLAN_ENTITLEMENTS.member[action];
    if (pricing.access === "vetted") {
        const needs = forMembers ? "vetted buyer access" : "vetted institutional access";
        return {
            allowed: false,
            reason: lapsed ? `Your buyer vetting has lapsed. Renew it, free, to ${ACTION_COPY[action]}.` : `You need ${needs}, which is free, to ${ACTION_COPY[action]}.`,
        };
    }
    const needs = forMembers ? "a membership" : "an institutional membership";
    return { allowed: false, reason: lapsed ? `Your membership has lapsed. Renew to ${ACTION_COPY[action]}.` : `You need ${needs} to ${ACTION_COPY[action]}.` };
}
/** When a listing becomes visible to buyers without early access. */
export const publicFrom = (l) => (l.listedAt ? addDays(l.listedAt, EARLY_ACCESS_DAYS) : null);
export function canSeeListing(buyer, l, at) {
    if (!isLive(l) || !l.listedAt)
        return false;
    if (entitlements(effectivePlan(buyer, at)).earlyAccess)
        return true;
    return Date.parse(at) >= Date.parse(publicFrom(l));
}
/*
  PROVISIONAL vetting rules, product choices rather than research. Proof of
  funds of £50,000 is a little above the smallest listings Orbe expects (the
  seller's £4,000 minimum fee implies deals from about £50k); vetting is
  repeated yearly so funds and identity stay current. Replace with what
  separates buyers who close from buyers who do not.
*/
export const VETTING_VALID_DAYS = 365;
export const MIN_FUNDS_EVIDENCE = 5_000_000;
/**
  Grants free access at a level once a buyer is vetted. Returns the buyer with
  the level and the date vetting falls due again, for the store to save. A
  buyer can be re-vetted at any time; the new date runs from this check.
*/
export function vetBuyer(buyer, level, vetting, pricing = DEFAULT_BUYER_PRICING) {
    if (pricing.access !== "vetted")
        throw new Error("Under the memberships model access is bought: use chargeMembership");
    const problems = [];
    if (!vetting.identityChecked)
        problems.push("Identity has not been checked.");
    if (!vetting.termsAcceptedAt)
        problems.push("The buyer terms, including the buyer's premium and the tail clause, have not been accepted.");
    if (!vetting.fundsEvidence || vetting.fundsEvidence.currency !== pricing.currency || vetting.fundsEvidence.amount < MIN_FUNDS_EVIDENCE) {
        problems.push(`Proof of funds of at least ${pricing.currency === "GBP" ? "£50,000" : "50,000"} has not been sighted.`);
    }
    if (level === "institutional" && !vetting.companyNumber?.trim())
        problems.push("An institution needs a registered company number.");
    if (!vetting.checkedBy.trim())
        problems.push("Vetting must name who checked.");
    if (problems.length > 0)
        return { granted: false, problems };
    const validUntil = addDays(vetting.at, VETTING_VALID_DAYS);
    return { granted: true, buyer: { ...buyer, plan: level, planRenewsAt: validUntil }, level, validUntil };
}
/** Removes access, for a buyer who breaks the terms (a circumvention, say). Their open requests should be withdrawn too. */
export const revokeAccess = (buyer) => ({ ...buyer, plan: "none", planRenewsAt: null });
const YEAR_DAYS = 365;
/**
  Starts, renews or upgrades a yearly membership.
  Renewing the same plan extends from the current end date, so paying early loses nothing.
  Upgrading from member to institutional starts a fresh year now and credits the
  unused days of the member year pro rata. Downgrades take effect at renewal, so
  they are refused here rather than refunded.
*/
/*
  Defaults to the memberships pricing, because under the take rate access is not
  sold (use vetBuyer). The API's membership route still calls this; it should move
  to vetBuyer when the take rate is wired in.
*/
export function chargeMembership(buyer, plan, at, pricing = MEMBERSHIP_BUYER_PRICING) {
    if (pricing.access !== "paid")
        throw new Error("Buyer access is free under the take rate; vet the buyer instead");
    const current = effectivePlan(buyer, at);
    const price = membershipPrice(plan, pricing);
    const zero = { amount: 0, currency: price.currency };
    if (current === "institutional" && plan === "member")
        throw new Error("Downgrades take effect at renewal; charge the member plan when the institutional year ends");
    if (current === plan) {
        const start = buyer.planRenewsAt;
        const end = addDays(start, YEAR_DAYS);
        return { buyer: { ...buyer, plan, planRenewsAt: end }, plan, charge: price, periodStart: start, periodEnd: end, credit: zero };
    }
    let credit = zero;
    if (current === "member" && plan === "institutional") {
        const daysLeft = (Date.parse(buyer.planRenewsAt) - Date.parse(at)) / 864e5;
        const unused = Math.floor((membershipPrice("member", pricing).amount * Math.max(0, daysLeft)) / YEAR_DAYS);
        credit = { amount: unused, currency: price.currency };
    }
    const end = addDays(at, YEAR_DAYS);
    return {
        buyer: { ...buyer, plan, planRenewsAt: end },
        plan,
        charge: { amount: price.amount - credit.amount, currency: price.currency },
        periodStart: at,
        periodEnd: end,
        credit,
    };
}
/**
  The price of an Orbe Verified report for this buyer today. Under the take rate
  this is what a buyer owes only if they walk away after receiving it (reports.ts).
*/
export const reportPriceFor = (buyer, at, pricing = DEFAULT_BUYER_PRICING) => reportPrice(effectivePlan(buyer, at), pricing);
