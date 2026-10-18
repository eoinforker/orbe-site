/*
  A creator's sponsorship inventory: what they sell, what each format has
  verifiably delivered, their audience's geography where connected, and a
  suggested price with the reasons.

  The same function builds the creator's own view and the view a brand sees.
  The difference is only which reads the viewer may use (consent.ts mayUse):
  a brand without a share sees public figures and is told how many private
  readings exist, never their values.
*/
import { RATING_LABEL, ratingNotice } from "../rating/label.js";
import { canReadConnected, hasOptedIn, mayUse } from "./consent.js";
import { specFor, specsForKind } from "./formats.js";
import { notExpired } from "./observe.js";
import { suggestPrice } from "./pricing.js";
import { provenanceTable } from "./sources.js";
import { deliveryStats } from "./stats.js";
import { assertPence } from "./util.js";
export const DEFAULT_SETTINGS = (creatorId) => ({ creatorId, offerings: [], excludedCategories: [], minNoticeDays: 7, blackouts: [] });
export function validateSettings(s, accounts) {
    if (!Number.isInteger(s.minNoticeDays) || s.minNoticeDays < 0 || s.minNoticeDays > 180)
        throw new Error("Notice must be 0 to 180 whole days");
    const seen = new Set();
    for (const o of s.offerings) {
        const acct = accounts.find((a) => a.id === o.accountId);
        if (!acct || acct.creatorId !== s.creatorId)
            throw new Error(`Account ${o.accountId} is not this creator's`);
        if (!specFor(o.format, acct.kind))
            throw new Error(`A ${acct.kind} account cannot offer ${o.format}`);
        const key = `${o.accountId}|${o.format}`;
        if (seen.has(key))
            throw new Error(`${o.format} is listed twice for ${o.accountId}`);
        seen.add(key);
        if (o.price) {
            assertPence(o.price.amount, "price");
            if (o.price.amount <= 0)
                throw new Error("A price must be more than zero");
        }
    }
    for (const b of s.blackouts)
        if (!(Date.parse(b.start) <= Date.parse(b.end)))
            throw new Error("A blackout must end after it starts");
}
/*
  The label is the rating module's, imported rather than re-typed, so the words
  cannot drift (docs/NORTHSTAR.md, rule 3: "exactly"). Re-exported for the API.
*/
export { RATING_LABEL };
/** Which reads this viewer may use for this creator, and which exist at all. */
export function usableFor(creatorId, viewer, consents, at) {
    const fresh = notExpired(at);
    const connectedOk = canReadConnected(consents, creatorId, at);
    const readable = (p) => fresh(p) && (p.basis !== "connected" || connectedOk);
    return { readable, viewer: (p) => readable(p) && mayUse(p.basis, viewer, creatorId, consents, at) };
}
export function buildInventory(input, opts) {
    const { creatorId, consents, settings } = input;
    const at = opts.at;
    const viewer = opts.viewer;
    const optedIn = hasOptedIn(consents, creatorId, at);
    const notes = [];
    const table = provenanceTable();
    if (viewer.kind === "brand" && !optedIn) {
        // A creator who has not opted in does not exist for brands.
        return { creatorId, at, viewer: viewer.kind, optedIn, items: [], geography: [], ratings: [], provenance: [], notes: ["This creator does not take sponsorships through Orbe."] };
    }
    if (viewer.kind === "creator" && viewer.creatorId !== creatorId)
        throw new Error("A creator can only see their own inventory");
    const usable = usableFor(creatorId, viewer, consents, at);
    const items = [];
    const geography = [];
    const ratings = [];
    for (const a of input.accounts) {
        const acct = a.account;
        if (acct.creatorId !== creatorId || acct.expiredAt)
            continue;
        for (const spec of specsForKind(acct.kind)) {
            const offering = settings.offerings.find((o) => o.accountId === acct.id && o.format === spec.format) ?? null;
            // Brands see only what the creator offers; the creator sees every format they could offer.
            if (viewer.kind === "brand" && !offering)
                continue;
            items.push(itemFor(spec, a, offering, input, opts, usable, table));
        }
        geography.push(geographyView(a, viewer, creatorId, consents, at, usable.readable, table));
        if (a.rating && a.rating.accountId === acct.id) {
            ratings.push({ accountId: acct.id, rating: a.rating.rating, band: a.rating.band, modelVersion: a.rating.modelVersion, label: RATING_LABEL, notice: ratingNotice(acct.kind) });
        }
    }
    const withheld = items.reduce((n, i) => n + i.stats.withheld, 0);
    if (withheld > 0 && viewer.kind === "brand") {
        notes.push(`${withheld} works have private readings this creator has not shared with you. You can ask them to share.`);
    }
    if (!canReadConnected(consents, creatorId, at))
        notes.push("No accounts are connected, so figures come from public reads and uploads only.");
    return { creatorId, at, viewer: viewer.kind, optedIn, items, geography, ratings, provenance: table.list(), notes };
}
function itemFor(spec, a, offering, input, opts, usable, table) {
    const stats = deliveryStats(spec, a.account, a.sources, usable, table, opts);
    const suggestion = opts.viewer.kind === "brand"
        ? null
        : suggestPrice({ creatorId: input.creatorId, spec, stats, audience: a.account.audience, rating: a.rating, own: input.own, comparables: input.comparables, at: opts.at }, { currency: opts.currency, fx: opts.fx, rateCards: opts.rateCards });
    return {
        accountId: a.account.id,
        kind: a.account.kind,
        handle: a.account.handle,
        format: spec.format,
        name: spec.name,
        description: spec.description,
        offered: offering !== null,
        available: offering?.available ?? false,
        listPrice: offering?.price ?? null,
        stats,
        suggestion,
    };
}
function geographyView(a, viewer, creatorId, consents, at, readable, table) {
    const g = a.geography;
    const accountId = a.account.id;
    if (!g || g.accountId !== accountId || !readable(g.provenance)) {
        return { accountId, status: "not_connected", reason: "Audience geography needs a connected analytics account." };
    }
    if (!mayUse(g.provenance.basis, viewer, creatorId, consents, at)) {
        return { accountId, status: "withheld", reason: "Audience geography is private until the creator shares it with you." };
    }
    const shares = g.shares.filter((s) => s.share > 0).sort((x, y) => y.share - x.share || x.country.localeCompare(y.country));
    return { accountId, status: "shown", measure: g.measure, shares, provenanceId: table.add(g.provenance) };
}
/** Share of an audience in any of the given countries, or null when geography is not visible. */
export function shareIn(view, countries) {
    if (!view || view.status !== "shown")
        return null;
    const set = new Set(countries.map((c) => c.toUpperCase()));
    return Math.min(1, view.shares.filter((s) => set.has(s.country.toUpperCase())).reduce((n, s) => n + s.share, 0));
}
