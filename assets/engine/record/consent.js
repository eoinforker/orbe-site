/*
  Consent decides what the record may read and who may see the report.
  Consent is live from grantedAt until revokedAt. Revoking is immediate, so a
  report cannot be built for a buyer the moment the creator withdraws.
*/
export function isLive(c, now) {
    const t = now.getTime();
    if (Date.parse(c.grantedAt) > t)
        return false;
    return c.revokedAt === null || Date.parse(c.revokedAt) > t;
}
export function liveConsent(consents, creatorId, scope, now, buyerId) {
    return (consents.find((c) => c.creatorId === creatorId && c.scope === scope && isLive(c, now) && (scope !== "share_with_buyer" || c.buyerId === buyerId)) ?? null);
}
export function gate(audience, creatorId, consents, now) {
    switch (audience.kind) {
        case "creator":
            return audience.creatorId === creatorId
                ? null
                : { code: "not_the_creator", message: "A creator's own report can only be built for that creator." };
        case "buyer":
            return liveConsent(consents, creatorId, "share_with_buyer", now, audience.buyerId)
                ? null
                : {
                    code: "no_share_consent",
                    message: "The creator has not agreed to share their record with this buyer, or has withdrawn that agreement.",
                };
        case "public":
            return liveConsent(consents, creatorId, "verified_profile", now)
                ? null
                : { code: "no_profile_consent", message: "The creator has not opted in to a public profile." };
    }
}
