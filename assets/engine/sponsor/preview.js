/*
  Previews for the site, before a creator connects anything:
  1. inventoryFromStats: a creator types (or pastes from an export) what
     their recent works delivered at each format's price window, and gets
     the same inventory and price suggestion buildInventory gives a connected
     creator. The figures are the creator's own, so their provenance is
     "uploaded", and the result says so: typed figures are not read at source.
  2. previewBrief: how matching ranks the made-up, opted-in creators in
     fixtures.ts for a brand's brief, with the sentence per criterion.
  Pure and browser-safe.
*/
import { optIn } from "./consent.js";
import { feeTermsFor, fundingFor } from "./fees.js";
import { BRAND, FIXTURE_FX, FIXTURE_NOW, JUNIPER, KIT, NOVA, OLLIE, SETTINGS, WREN, allConsents, brief as fixtureBrief, juniper, kit, nova, ollie, wren } from "./fixtures.js";
import { specsForKind } from "./formats.js";
import { buildInventory } from "./inventory.js";
import { rankCreators, shortlist } from "./matching.js";
import { addDays } from "./util.js";
export const TYPED_NOTE = "These are the figures you typed. Once you connect your accounts, Orbe reads them at source and brands see them as verified.";
const SOURCE = { youtube: "youtube_analytics", substack: "substack_export", podcast: "podcast_host", twitch: "twitch", photography: "photo_licensing" };
/** The creator's own view of their inventory, from typed figures. */
export function inventoryFromStats(s) {
    const creatorId = "preview_creator";
    const account = { id: "preview_account", creatorId, kind: s.kind, platformId: "preview", handle: "you", title: "You", audience: Math.max(0, Math.round(s.audience)) };
    const specs = specsForKind(s.kind);
    const snapshots = [];
    const at = s.at;
    s.units.forEach((u, i) => {
        if (!Number.isFinite(u) || u < 0)
            return;
        for (const spec of specs) {
            const day = spec.priceWindow;
            // Each work published so that it reached its price window a few days before now, a week apart.
            const published = addDays(at, -(day + 2 + i * 7));
            const metrics = spec.windowedMetric ? { [spec.windowedMetric[day]]: u } : { [spec.metric]: u };
            const work = { id: `preview_work_${i}`, accountId: account.id, kind: s.kind, title: `Work ${i + 1}`, publishedAt: published, durationSec: 0, metrics };
            const provenance = { source: SOURCE[s.kind], accountId: "preview", checkedAt: addDays(published, day), basis: "uploaded" };
            snapshots.push({ account, works: [work], provenance });
        }
    });
    const rating = s.rating ? { accountId: account.id, kind: s.kind, rating: s.rating.rating, band: s.rating.band, sizeBand: "", parts: [], modelVersion: "preview", computedAt: at } : null;
    const offerings = specs.map((spec) => ({ accountId: account.id, format: spec.format, price: s.price ?? null, available: true }));
    const settings = { creatorId, offerings, excludedCategories: [], minNoticeDays: 7, blackouts: [] };
    const inventory = buildInventory({ creatorId, accounts: [{ account, sources: { snapshots }, rating }], consents: [optIn(creatorId, addDays(at, -1))], settings }, { at, viewer: { kind: "creator", creatorId }, currency: s.currency ?? "USD", fx: s.fx });
    return { inventory, note: TYPED_NOTE };
}
export const SAMPLE_CREATORS_LABEL = "Made-up creators who have opted in to sponsorships, for this preview only. None is a real person, channel or show.";
const NAMES = {
    [JUNIPER.creatorId]: "Juniper Vale",
    [OLLIE.creatorId]: "Ollie Marsh",
    [NOVA.creatorId]: "Nova Reyes",
    [KIT.creatorId]: "Kit Arden",
    [WREN.creatorId]: "Wren Hollis",
};
/** The made-up field, each built with the brand's view (public and shared figures only). */
export function sampleCandidates(at = FIXTURE_NOW) {
    const consents = allConsents();
    const inputs = [
        [JUNIPER.creatorId, juniper()],
        [OLLIE.creatorId, ollie()],
        [NOVA.creatorId, nova()],
        [KIT.creatorId, kit()],
        [WREN.creatorId, wren()],
    ];
    return inputs.map(([creatorId, input]) => {
        const settings = SETTINGS[creatorId] ?? { creatorId, offerings: [], excludedCategories: [], minNoticeDays: 7, blackouts: [] };
        const inventory = buildInventory({ creatorId, accounts: [input], consents, settings }, { at, viewer: { kind: "brand", brandId: BRAND.id }, fx: FIXTURE_FX });
        return { creatorId, displayName: NAMES[creatorId], settings, accounts: [input.account], inventory, consents };
    });
}
/** Ranks the made-up field for a brief, as of the fixtures' date. */
export function previewBrief(p) {
    const at = FIXTURE_NOW;
    const brief = fixtureBrief({
        title: "Your brief",
        budget: { amount: Math.round(p.budgetPounds * 100), currency: "GBP" },
        formats: p.formats,
        audience: { countries: p.countries, verticals: p.verticals },
        window: { start: addDays(at, p.windowFromDays), end: addDays(at, p.windowToDays) },
    });
    const terms = feeTermsFor(p.source);
    const matches = rankCreators(brief, p.category, sampleCandidates(at), terms, at);
    const list = shortlist(matches, brief.budget, terms);
    const costs = list.picks.map((m) => ({ creatorId: m.creatorId, ...fundingFor(m.price, terms) }));
    return { label: SAMPLE_CREATORS_LABEL, at, brief, matches, picks: list.picks, spend: list.spend, left: list.left, fee: { bps: terms.bps, payer: terms.payer, source: p.source }, costs };
}
