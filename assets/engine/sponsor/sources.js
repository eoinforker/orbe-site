/*
  A numbered table of where figures came from. Inventory and the brand report
  hand every number a provenance id ("p1", "p2", ...) that resolves here, so a
  figure can never be shown without the read behind it.
*/
export function provenanceTable() {
    const byKey = new Map();
    const ids = new Set();
    const put = (key, make) => {
        const found = byKey.get(key);
        if (found)
            return found.id;
        const e = make(`p${byKey.size + 1}`);
        byKey.set(key, e);
        ids.add(e.id);
        return e.id;
    };
    return {
        add: (p) => put(`${p.source}|${p.accountId}|${p.checkedAt}|${p.basis}`, (id) => ({ id, source: p.source, accountId: p.accountId, checkedAt: p.checkedAt, basis: p.basis })),
        addPartner: (holdId, reference, at) => put(`partner|${holdId}|${reference}`, (id) => ({ id, source: "payments_partner", accountId: holdId, checkedAt: at, basis: "partner", reference })),
        addOffer: (offerId, at) => put(`offer|${offerId}`, (id) => ({ id, source: "orbe_offer", accountId: offerId, checkedAt: at, basis: "record" })),
        has: (id) => ids.has(id),
        list: () => [...byKey.values()],
    };
}
export const SOURCE_NAMES = {
    youtube_public: "YouTube Data API (public)",
    youtube_analytics: "YouTube Analytics (connected)",
    adsense: "AdSense (connected)",
    stripe: "Stripe (connected)",
    substack_export: "Substack export (uploaded by the creator)",
    patreon: "Patreon (connected)",
    twitch: "Twitch",
    podcast_rss: "Podcast RSS feed (public)",
    podcast_host: "Podcast host export",
    photo_licensing: "Photo licensing",
    invoice_upload: "Invoice upload",
    payments_partner: "Payments partner",
    orbe_offer: "The accepted offer (Orbe's record)",
};
