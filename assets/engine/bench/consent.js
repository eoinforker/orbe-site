export const isLiveConsent = (c, scope, at) => {
    if (c.scope !== scope)
        return false;
    const t = Date.parse(at);
    if (!(Date.parse(c.grantedAt) <= t))
        return false;
    return c.revokedAt === null || Date.parse(c.revokedAt) > t;
};
export const hasBenchmarksConsent = (consents, creatorId, at) => consents.some((c) => c.creatorId === creatorId && isLiveConsent(c, "benchmarks", at));
export const benchmarkConsenters = (consents, at) => {
    const ids = new Set();
    for (const c of consents)
        if (isLiveConsent(c, "benchmarks", at))
            ids.add(c.creatorId);
    return ids;
};
