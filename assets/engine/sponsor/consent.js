/*
  Consent for sponsorships.

  Three scopes that core does not have yet (CORE-REQUESTS.md asks for them):
  - "sponsorships": the creator opts in to the network. Only opted-in creators
    are ever matched, shown to a brand or sent an offer. Revoking it closes
    open offers but never breaks a sponsorship already agreed.
  - "share_with_brand": the creator shows their private, connected numbers to
    one brand, buyer-style, one at a time. YouTube's developer policies allow
    authorised analytics to be compiled only for the channel owner or their
    authorised representative (docs/RESEARCH-2026-10.md section 4), so no brand
    sees a connected figure, even as a band or a ranking input, without it.
  - "discoverable": an opted-in creator also lets brands find them by
    measured results (the API's discovery and data API). Without it a creator
    still takes offers but never appears in a search. It counts only while
    "sponsorships" is live, and what a search shows stays anonymised and
    public-only until a share with that brand.

  The shape is core's Consent with a wider scope and a brandId, so a core
  Consent is accepted as is and the store can keep both in one table once core
  grows the scopes.
*/
export const isLive = (c, at) => Date.parse(c.grantedAt) <= Date.parse(at) && (c.revokedAt === null || Date.parse(c.revokedAt) > Date.parse(at));
export function liveConsent(consents, creatorId, scope, at, brandId) {
    return (consents.find((c) => c.creatorId === creatorId && c.scope === scope && isLive(c, at) && (scope !== "share_with_brand" || c.brandId === brandId)) ?? null);
}
export const hasOptedIn = (consents, creatorId, at) => liveConsent(consents, creatorId, "sponsorships", at) !== null;
/** Brands may find this creator in a search: opted in to the network and to discovery, both live. */
export const isDiscoverable = (consents, creatorId, at) => hasOptedIn(consents, creatorId, at) && liveConsent(consents, creatorId, "discoverable", at) !== null;
export const makeDiscoverable = (creatorId, at) => ({ creatorId, scope: "discoverable", grantedAt: at, revokedAt: null });
export const sharesWith = (consents, creatorId, brandId, at) => liveConsent(consents, creatorId, "share_with_brand", at, brandId) !== null;
/** Connected numbers can be read at all only while the creator's connect consent is live. */
export const canReadConnected = (consents, creatorId, at) => liveConsent(consents, creatorId, "connect", at) !== null;
export const optIn = (creatorId, at) => ({ creatorId, scope: "sponsorships", grantedAt: at, revokedAt: null });
export function shareWithBrand(creatorId, brandId, at, campaignId) {
    if (!brandId)
        throw new Error("A share needs the brand it is for");
    const c = { creatorId, scope: "share_with_brand", grantedAt: at, revokedAt: null, brandId };
    if (campaignId)
        c.campaignId = campaignId;
    return c;
}
export const revoke = (c, at) => (c.revokedAt ? c : { ...c, revokedAt: at });
/** Whether a figure of this basis may be shown to (or used for) this viewer. */
export function mayUse(basis, viewer, creatorId, consents, at) {
    if (basis === "public")
        return true;
    if (viewer.kind === "creator")
        return viewer.creatorId === creatorId;
    // Orbe staff act for the creator (support, disputes), never as a reader of pooled data.
    if (viewer.kind === "orbe")
        return true;
    return sharesWith(consents, creatorId, viewer.brandId, at);
}
