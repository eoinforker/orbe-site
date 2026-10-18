/*
  A listing and its life: draft, ready check, listed, under offer, completed or withdrawn.

  Listings are free (MODEL.md Part 3: listing fees deter the creators Orbe most
  wants). Only verified creators can list: the ready check insists on connected,
  fresh sources, a year of verified revenue, a current Orbe Verified report and
  live consent to list. Every function returns a new listing; nothing is mutated,
  so the store can persist each step and the audit trail is the history.
*/
import { id as newId } from "../core/util.js";
import { SYSTEM, entry } from "./audit.js";
export const TRANSITIONS = {
    draft: ["ready_check", "withdrawn"],
    ready_check: ["listed", "draft", "withdrawn"],
    listed: ["under_offer", "withdrawn"],
    under_offer: ["listed", "completed", "withdrawn"],
    completed: [],
    withdrawn: ["draft"],
};
export const canTransition = (from, to) => TRANSITIONS[from].includes(to);
/** States in which buyers can find the listing at all. */
export const isLive = (l) => l.state === "listed";
export class ListingError extends Error {
}
function move(l, to, actor, at, patch = {}, detail) {
    if (!canTransition(l.state, to))
        throw new ListingError(`A listing cannot go from ${l.state} to ${to}`);
    return {
        ...l,
        ...patch,
        state: to,
        updatedAt: at,
        history: [...l.history, entry(at, actor, `listing.${to}`, l.id, { from: l.state, ...detail })],
    };
}
const mustBeOwner = (l, actor) => {
    if (actor.role === "creator" && actor.id !== l.creatorId)
        throw new ListingError("Only the creator who owns a listing can change it");
    if (actor.role === "buyer")
        throw new ListingError("Buyers cannot change a listing");
};
export function createListing(input) {
    if (input.accountIds.length === 0)
        throw new ListingError("A listing needs at least one account");
    const id = input.id ?? newId("ls");
    return {
        id,
        creatorId: input.creatorId,
        kind: input.kind,
        accountIds: [...input.accountIds],
        state: "draft",
        facts: null,
        readiness: null,
        createdAt: input.at,
        updatedAt: input.at,
        listedAt: null,
        closedAt: null,
        introductionId: null,
        dealId: null,
        history: [entry(input.at, { role: "creator", id: input.creatorId }, "listing.draft", id)],
    };
}
/*
  12 months matches the floor Empire Flippers sets for listings (MODEL.md Part 2).
  30 days matches the YouTube API refresh rule. The report age is PROVISIONAL: a
  buyer should not be reading numbers a quarter old; tune it with the first buyers.
*/
export const DEFAULT_READINESS_RULES = {
    minVerifiedMonths: 12,
    minConnectedSources: 1,
    sourceMaxAgeDays: 30,
    reportMaxAgeDays: 90,
};
export const liveConsent = (consents, creatorId, scope, at, buyerId) => consents.find((c) => c.creatorId === creatorId &&
    c.scope === scope &&
    c.revokedAt === null &&
    Date.parse(c.grantedAt) <= Date.parse(at) &&
    (buyerId === undefined || c.buyerId === buyerId)) ?? null;
const ageDays = (iso, at) => (Date.parse(at) - Date.parse(iso)) / 864e5;
export function checkReadiness(e, at, rules = DEFAULT_READINESS_RULES) {
    const has = (scope) => liveConsent(e.consents, e.creatorId, scope, at) !== null;
    const fresh = e.connectedSources.filter((s) => ageDays(s.checkedAt, at) <= rules.sourceMaxAgeDays);
    const stale = e.connectedSources.length - fresh.length;
    const reportAge = e.report ? ageDays(e.report.generatedAt, at) : null;
    const items = [
        {
            key: "verified_creator",
            label: "Verified profile",
            done: has("verified_profile") && has("connect"),
            detail: has("verified_profile") && has("connect") ? "Your profile is verified." : "Claim your profile and connect an account to verify it. Only verified creators can list.",
        },
        {
            key: "connected_sources",
            label: "Revenue sources connected",
            done: fresh.length >= rules.minConnectedSources,
            detail: fresh.length >= rules.minConnectedSources
                ? `${fresh.length} source${fresh.length === 1 ? "" : "s"} connected and read in the last ${rules.sourceMaxAgeDays} days.`
                : stale > 0
                    ? `${stale} source${stale === 1 ? " has" : "s have"} not been read in ${rules.sourceMaxAgeDays} days. Reconnect to refresh.`
                    : "Connect the accounts your revenue is paid into.",
        },
        {
            key: "verified_months",
            label: `${rules.minVerifiedMonths} months of verified revenue`,
            done: e.verifiedMonths >= rules.minVerifiedMonths,
            detail: e.verifiedMonths >= rules.minVerifiedMonths
                ? `${e.verifiedMonths} months verified.`
                : `${e.verifiedMonths} of ${rules.minVerifiedMonths} months verified. Buyers want a full year of numbers they can trust.`,
        },
        {
            key: "report_generated",
            label: "Orbe Verified report",
            done: reportAge !== null && reportAge <= rules.reportMaxAgeDays,
            detail: reportAge === null
                ? "Generate your Orbe Verified report. It is free for sellers."
                : reportAge <= rules.reportMaxAgeDays
                    ? "Your report is current."
                    : `Your report is over ${rules.reportMaxAgeDays} days old. Regenerate it so buyers see current numbers.`,
        },
        {
            key: "consent_to_list",
            label: "Consent to list",
            done: has("listing"),
            detail: has("listing")
                ? "You have agreed to list. Buyers see an anonymised card until you choose to share your file with one of them."
                : "Agree to list. Buyers will see an anonymised card, never your name, until you approve an introduction.",
        },
    ];
    return { ready: items.every((i) => i.done), checkedAt: at, items };
}
/* Transitions. */
export const submitForCheck = (l, actor, at) => {
    mustBeOwner(l, actor);
    return move(l, "ready_check", actor, at);
};
/**
  Runs the checklist. A pass lists the business with the facts it was checked on;
  a fail sends it back to draft with the checklist, so the creator sees what is missing.
*/
export function runReadyCheck(l, evidence, facts, at, rules = DEFAULT_READINESS_RULES) {
    if (l.state !== "ready_check")
        throw new ListingError(`Only a listing in ready_check can be checked, this one is ${l.state}`);
    if (evidence.creatorId !== l.creatorId)
        throw new ListingError("Evidence is for a different creator");
    if (facts.kind !== l.kind)
        throw new ListingError("Facts are for a different kind of business");
    const readiness = checkReadiness(evidence, at, rules);
    if (!readiness.ready) {
        const missing = readiness.items.filter((i) => !i.done).map((i) => i.key).join(",");
        return move(l, "draft", SYSTEM, at, { readiness }, { missing });
    }
    return move(l, "listed", SYSTEM, at, { readiness, facts, listedAt: at });
}
export const markUnderOffer = (l, introductionId, actor, at) => {
    mustBeOwner(l, actor);
    return move(l, "under_offer", actor, at, { introductionId }, { introductionId });
};
/** The offer fell away; the listing goes back on the market with its original listing date. */
export const offerFellThrough = (l, actor, at) => {
    mustBeOwner(l, actor);
    return move(l, "listed", actor, at, { introductionId: null, dealId: null });
};
export const markCompleted = (l, dealId, actor, at) => {
    if (actor.role === "buyer")
        throw new ListingError("Buyers cannot change a listing");
    return move(l, "completed", actor, at, { dealId, closedAt: at }, { dealId });
};
export const withdraw = (l, actor, at, reason) => {
    mustBeOwner(l, actor);
    return move(l, "withdrawn", actor, at, { closedAt: at }, { reason });
};
/** A withdrawn listing can be brought back as a draft; it must pass the ready check again. */
export const reopen = (l, actor, at) => {
    mustBeOwner(l, actor);
    return move(l, "draft", actor, at, { facts: null, readiness: null, listedAt: null, closedAt: null, introductionId: null, dealId: null });
};
/**
  Consent comes first: if the creator revokes consent to list, the listing comes
  down at once, whatever state it is in. Returns the listing unchanged when consent is live.
*/
export function enforceListingConsent(l, consents, at) {
    if (l.state === "draft" || l.state === "completed" || l.state === "withdrawn")
        return l;
    if (liveConsent(consents, l.creatorId, "listing", at))
        return l;
    return move(l, "withdrawn", SYSTEM, at, { closedAt: at }, { reason: "consent_revoked" });
}
