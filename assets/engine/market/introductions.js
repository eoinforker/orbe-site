/*
  Consented introductions: a member asks, the creator approves or declines,
  and only on approval does Orbe introduce them and share the creator's file
  with that one buyer.

  This is the line MODEL.md Part 4 draws: introduce, don't arrange. Orbe does
  not negotiate, advise or sign for either side. Before an introduction is
  made the buyer has accepted that, and the creator has signed the written
  success fee agreement (Part 4, rule 3). Every step lands in the audit trail.
*/
import { id as newId } from "../core/util.js";
import { SYSTEM, entry } from "./audit.js";
import { can, canSeeListing } from "./buyers.js";
import { DEFAULT_MARKET_SCHEDULE, buyerPremium, successFee } from "./fees.js";
import { liveConsent } from "./listings.js";
import { addDays } from "./months.js";
/** A creator has this long to answer before a request lapses. PROVISIONAL: tune against real response times. */
export const RESPONSE_DAYS = 14;
/** After a decline, the same buyer waits this long before asking about the same listing again. PROVISIONAL. */
export const REASK_AFTER_DAYS = 30;
export const MAX_MESSAGE_LENGTH = 2000;
/** The terms a buyer accepts before asking. Kept here so the copy and the rule cannot drift apart. */
export const BUYER_TERMS_VERSION = "buyer-terms-2026.10-take-rate";
export const BUYER_TERMS = "Orbe introduces buyers and sellers. It does not advise either side, negotiate, arrange the sale or hold any money. You agree terms directly with the seller, with your own advisers, and payment runs through an independent escrow provider. " +
    "If you buy, you pay Orbe a buyer's premium on the price at completion, as set out in the fee schedule shown to you. " +
    "If you or anyone connected with you buys the business, or any part of it, from this seller within 24 months of Orbe's introduction, whether or not through Orbe, the premium is owed as if the sale had completed through Orbe, and you will tell Orbe of the sale.";
/** Adds whole calendar months to an ISO timestamp, clamping to the month's last day (31 January plus one month is 28 or 29 February). */
export function addCalendarMonths(iso, months) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        throw new Error(`Not a date: ${iso}`);
    const day = d.getUTCDate();
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString();
}
export class IntroductionError extends Error {
}
const isOpen = (i) => i.state === "requested";
export function requestIntroduction(input) {
    const { buyer, listing, at } = input;
    const schedule = input.schedule ?? DEFAULT_MARKET_SCHEDULE;
    const p = can(buyer, "requestIntroductions", at, schedule.buyers);
    if (!p.allowed)
        throw new IntroductionError(p.reason);
    if (!canSeeListing(buyer, listing, at))
        throw new IntroductionError("This listing is not open for introductions");
    if (!input.buyerTermsAcceptedAt)
        throw new IntroductionError("Accept the introduction terms first");
    const mine = input.existing.filter((i) => i.buyerId === buyer.id && i.listingId === listing.id);
    if (mine.some(isOpen))
        throw new IntroductionError("You already have a request open for this listing");
    if (mine.some((i) => i.state === "introduced"))
        throw new IntroductionError("You have already been introduced to this creator");
    const lastDecline = mine.filter((i) => i.state === "declined" && i.respondedAt).map((i) => i.respondedAt).sort().pop();
    if (lastDecline && Date.parse(at) < Date.parse(addDays(lastDecline, REASK_AFTER_DAYS))) {
        throw new IntroductionError(`The creator declined recently. You can ask again after ${REASK_AFTER_DAYS} days.`);
    }
    const message = input.message?.trim() || null;
    if (message && message.length > MAX_MESSAGE_LENGTH)
        throw new IntroductionError(`Keep the note under ${MAX_MESSAGE_LENGTH} characters`);
    const id = newId("in");
    const actor = { role: "buyer", id: buyer.id };
    return {
        id,
        listingId: listing.id,
        buyerId: buyer.id,
        creatorId: listing.creatorId,
        state: "requested",
        message,
        buyerTermsAcceptedAt: input.buyerTermsAcceptedAt,
        buyerTermsVersion: BUYER_TERMS_VERSION,
        terms: { scheduleVersion: schedule.version, premiumVersion: schedule.buyerPremium?.version ?? null, tailMonths: schedule.tailMonths },
        tailEndsAt: null,
        feeAgreement: null,
        requestedAt: at,
        expiresAt: addDays(at, RESPONSE_DAYS),
        respondedAt: null,
        declineReason: null,
        audit: [
            entry(input.buyerTermsAcceptedAt, actor, "introduction.terms_accepted", id, { version: BUYER_TERMS_VERSION, tailMonths: schedule.tailMonths }),
            entry(at, actor, "introduction.requested", id, { listingId: listing.id }),
        ],
    };
}
const mustBeCreator = (i, actor) => {
    if (actor.role !== "creator" || actor.id !== i.creatorId)
        throw new IntroductionError("Only the creator can answer this request");
};
const mustBeOpen = (i, at) => {
    if (!isOpen(i))
        throw new IntroductionError(`This request is ${i.state}`);
    if (Date.parse(at) >= Date.parse(i.expiresAt))
        throw new IntroductionError("This request has expired");
};
/**
  The creator says yes. Returns the introduction, now made, and the share_with_buyer
  consent to store: that consent is what lets this one buyer see the full file.
*/
export function approveIntroduction(i, input) {
    const { actor, listing, at } = input;
    mustBeCreator(i, actor);
    mustBeOpen(i, at);
    if (listing.id !== i.listingId)
        throw new IntroductionError("Listing does not match the request");
    if (listing.state !== "listed")
        throw new IntroductionError(`The listing is ${listing.state}, so no new introductions can be made`);
    if (!liveConsent(input.consents, i.creatorId, "listing", at))
        throw new IntroductionError("Consent to list has been withdrawn");
    if (!input.feeAgreement)
        throw new IntroductionError("Sign the success fee agreement before the first introduction");
    const consent = { creatorId: i.creatorId, scope: "share_with_buyer", grantedAt: at, revokedAt: null, buyerId: i.buyerId };
    const tailMonths = i.terms?.tailMonths ?? null;
    const tailEndsAt = tailMonths === null ? null : addCalendarMonths(at, tailMonths);
    const introduction = {
        ...i,
        state: "introduced",
        feeAgreement: input.feeAgreement,
        respondedAt: at,
        tailEndsAt,
        audit: [
            ...i.audit,
            entry(input.feeAgreement.acceptedAt, actor, "introduction.fee_agreement_signed", i.id, { version: input.feeAgreement.version, schedule: input.feeAgreement.scheduleVersion }),
            entry(at, actor, "introduction.approved", i.id),
            entry(at, actor, "consent.share_with_buyer.granted", i.id, { buyerId: i.buyerId }),
            entry(at, SYSTEM, "introduction.made", i.id, { tailEndsAt }),
        ],
    };
    return { introduction, consent };
}
export function declineIntroduction(i, input) {
    mustBeCreator(i, input.actor);
    mustBeOpen(i, input.at);
    const reason = input.reason?.trim() || null;
    return {
        ...i,
        state: "declined",
        respondedAt: input.at,
        declineReason: reason,
        // The reason stays with the creator; the buyer is told only that the answer was no.
        audit: [...i.audit, entry(input.at, input.actor, "introduction.declined", i.id, { reasonGiven: reason !== null })],
    };
}
export function withdrawRequest(i, input) {
    if (input.actor.role !== "buyer" || input.actor.id !== i.buyerId)
        throw new IntroductionError("Only the buyer who asked can withdraw the request");
    if (!isOpen(i))
        throw new IntroductionError(`This request is ${i.state}`);
    return { ...i, state: "withdrawn", respondedAt: input.at, audit: [...i.audit, entry(input.at, input.actor, "introduction.withdrawn", i.id)] };
}
/** Lapses unanswered requests. Returns only the ones that changed, for the store to save. */
export function expireStale(intros, at) {
    return intros
        .filter((i) => isOpen(i) && Date.parse(at) >= Date.parse(i.expiresAt))
        .map((i) => ({ ...i, state: "expired", respondedAt: at, audit: [...i.audit, entry(at, SYSTEM, "introduction.expired", i.id)] }));
}
/**
  Closes open requests when a listing leaves the market (withdrawn, under offer
  elsewhere, completed), so creators are not asked to answer for a sale that is off.
*/
export function closeForListing(intros, listing, at) {
    if (listing.state === "listed")
        return [];
    return intros
        .filter((i) => i.listingId === listing.id && isOpen(i))
        .map((i) => ({ ...i, state: "expired", respondedAt: at, audit: [...i.audit, entry(at, SYSTEM, "introduction.closed", i.id, { listingState: listing.state })] }));
}
/** The note both parties receive when an introduction is made. */
export function introductionNotice(i, escrowPartnerName) {
    if (i.state !== "introduced")
        throw new IntroductionError("No introduction has been made");
    return [
        "You have been introduced through Orbe.",
        "Orbe does not advise either of you, negotiate, arrange the sale or hold any money.",
        "Agree terms directly, with your own advisers.",
        `When you agree a price, payment runs through ${escrowPartnerName}, an independent escrow provider, and Orbe's fees are paid at completion.`,
        ...(i.tailEndsAt ? [`Orbe's fees apply to a sale between you that completes by ${i.tailEndsAt.slice(0, 10)}, through Orbe or not.`] : []),
    ].join(" ");
}
/**
  Whether an off-platform completion owes fees under the tail. Fees are worked
  out under `schedule`, which must be the one the parties accepted: its version
  is checked against what the introduction recorded, so a later change of rates
  never reaches back. `dealNumber` is needed only under a launch rate.
*/
export function assessOffPlatformCompletion(c, introductions, schedule = DEFAULT_MARKET_SCHEDULE, opts = {}) {
    if (!Number.isSafeInteger(c.price.amount) || c.price.amount <= 0)
        throw new IntroductionError("The completion needs a positive price");
    const completed = Date.parse(c.completedAt);
    if (Number.isNaN(completed))
        throw new IntroductionError("The completion needs a date");
    const made = introductions
        .filter((i) => i.state === "introduced" && i.creatorId === c.creatorId && i.buyerId === c.buyerId && i.respondedAt)
        .sort((a, b) => Date.parse(a.respondedAt) - Date.parse(b.respondedAt));
    if (made.length === 0)
        return { owed: false, reasons: ["Orbe never introduced these parties."] };
    // Any introduction whose tail covers the completion date will do; the earliest is the one the claim rests on.
    const covering = made.filter((i) => typeof i.tailEndsAt === "string" && Date.parse(i.respondedAt) <= completed && completed <= Date.parse(i.tailEndsAt));
    if (covering.length === 0) {
        const before = made.every((i) => completed < Date.parse(i.respondedAt));
        if (before)
            return { owed: false, reasons: ["The sale completed before Orbe's introduction."] };
        if (made.every((i) => !i.tailEndsAt))
            return { owed: false, reasons: ["The introduction was made under terms with no tail clause."] };
        return { owed: false, reasons: ["The sale completed after the tail ended."] };
    }
    const i = covering[0];
    const reasons = [`Orbe introduced these parties on ${i.respondedAt.slice(0, 10)}; the tail runs to ${i.tailEndsAt.slice(0, 10)}, and the sale completed on ${c.completedAt.slice(0, 10)}.`];
    if (c.structure === "minority_stake") {
        return { owed: false, reasons: [...reasons, "A minority stake is outside what Orbe can take a completion fee on without an authorised partner (MODEL.md Part 4); refer it, do not invoice it."] };
    }
    if (!i.feeAgreement)
        throw new IntroductionError("An introduction was made without a fee agreement, which approveIntroduction never allows");
    if (i.feeAgreement.scheduleVersion !== schedule.seller.version) {
        throw new IntroductionError(`The seller signed schedule ${i.feeAgreement.scheduleVersion}; assess with that schedule, not ${schedule.seller.version}`);
    }
    if ((i.terms?.premiumVersion ?? null) !== (schedule.buyerPremium?.version ?? null)) {
        throw new IntroductionError(`The buyer accepted premium ${i.terms?.premiumVersion ?? "none"}; assess with that schedule`);
    }
    if (c.listingId && c.listingId !== i.listingId)
        reasons.push("The sale was of the same creator's business under a different listing, which the tail still covers.");
    if (Date.parse(c.reportedAt) > Date.parse(i.tailEndsAt))
        reasons.push("It was reported after the tail ended, but completed within it, so the fees are owed.");
    return {
        owed: true,
        introductionId: i.id,
        tailEndsAt: i.tailEndsAt,
        sellerFee: successFee(c.price, schedule.seller, { dealNumber: opts.dealNumber }),
        premium: buyerPremium(c.price, schedule.buyerPremium),
        needsLegalReview: c.structure === "share_sale_whole_company",
        reasons,
    };
}
