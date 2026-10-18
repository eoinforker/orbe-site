/*
  FIXTURES. Made-up creators and brands for tests, not real people, channels
  or companies. Every id starts "fx_" and every name is invented. Figures
  follow simple rules so each case is easy to reason about:
  - Juniper Vale: a YouTube channel, connected (Analytics ranges at 7 and 30
    days) and read publicly every two days; audience mostly in the UK.
  - Ollie Marsh: a newsletter, opens from weekly Substack exports.
  - Nova Reyes: a podcast, downloads from the host's export.
  - Kit Arden: a Twitch streamer, average viewers per stream.
  - Wren Hollis: a YouTube channel that has not opted in to sponsorships.
*/
import { addDays } from "./util.js";
export const FIXTURE_NOW = "2026-10-18T09:00:00.000Z";
export const daysAgo = (d) => addDays(FIXTURE_NOW, -d);
const prov = (source, accountId, basis, checkedAt, youtube = false) => ({
    source,
    accountId,
    checkedAt,
    basis,
    // YouTube API data must be refreshed or deleted within 30 days.
    deleteBy: youtube ? addDays(checkedAt, 30) : null,
});
const account = (id, creatorId, kind, handle, audience) => ({
    id,
    creatorId,
    kind,
    platformId: `${id}_platform`,
    handle,
    title: handle.replace("@", ""),
    audience,
});
/** Views at an age, on a simple maturity curve that reaches v30 at 30 days. */
export const viewsAt = (v30, age) => Math.round((v30 * (1 - Math.exp(-age / 9))) / (1 - Math.exp(-30 / 9)));
/* Juniper Vale: YouTube */
export const JUNIPER = { creatorId: "fx_cr_juniper", accountId: "fx_ac_juniper_yt" };
export const JUNIPER_FACTORS = [1.0, 0.8, 1.2, 0.9, 1.1, 0.7, 1.3, 1.0, 0.95, 1.05, 0.85, 1.15];
export const JUNIPER_BASE_V30 = 40_000;
export function juniper() {
    const acct = account(JUNIPER.accountId, JUNIPER.creatorId, "youtube", "@junipervale", 180_000);
    acct.country = "GB";
    const works = JUNIPER_FACTORS.map((f, i) => ({
        id: `fx_wk_juniper_${i + 1}`,
        accountId: acct.id,
        kind: "youtube",
        title: `Workshop build ${i + 1}`,
        publishedAt: daysAgo(10 + i * 10),
        durationSec: 900,
        metrics: {},
        platformId: `fx_vid_juniper_${i + 1}`,
        v30: Math.round(JUNIPER_BASE_V30 * f),
    }));
    // Public reads every two days for the last 40 days; the oldest are past YouTube's 30-day limit.
    const snapshots = [];
    for (let d = 40; d >= 0; d -= 2) {
        const at = daysAgo(d);
        const listed = works
            .filter((w) => Date.parse(w.publishedAt) <= Date.parse(at))
            .map(({ v30, ...w }) => ({ ...w, metrics: { views: viewsAt(v30, (Date.parse(at) - Date.parse(w.publishedAt)) / 864e5), likes: 100 } }));
        snapshots.push({ account: acct, works: listed, provenance: prov("youtube_public", acct.platformId, "public", at, true) });
    }
    // Connected Analytics: exact 7 and 30 day ranges, re-read two days ago.
    const checked = daysAgo(2);
    const workMetrics = [];
    for (const w of works) {
        const start = w.publishedAt.slice(0, 10);
        for (const day of [7, 30]) {
            const end = addDays(`${start}T00:00:00.000Z`, day - 1).slice(0, 10);
            if (Date.parse(checked) < Date.parse(`${end}T00:00:00Z`) + 864e5)
                continue;
            workMetrics.push({ workId: w.id, platformWorkId: w.platformId, range: { start, end }, metrics: { views: viewsAt(w.v30, day) }, provenance: prov("youtube_analytics", acct.platformId, "connected", checked, true) });
        }
    }
    const geography = {
        accountId: acct.id,
        shares: [
            { country: "GB", share: 0.55 },
            { country: "US", share: 0.25 },
            { country: "IE", share: 0.05 },
        ],
        measure: "views in the last 90 days",
        provenance: prov("youtube_analytics", acct.platformId, "connected", checked, true),
    };
    const rating = { accountId: acct.id, kind: "youtube", rating: 1.4, band: "Good", sizeBand: "low", parts: [], modelVersion: "2026.10", computedAt: checked };
    return { account: acct, sources: { snapshots, workMetrics }, geography, rating };
}
/* Ollie Marsh: newsletter */
export const OLLIE = { creatorId: "fx_cr_ollie", accountId: "fx_ac_ollie_ss" };
export function ollie() {
    const acct = account(OLLIE.accountId, OLLIE.creatorId, "substack", "ollie.substack.example", 30_000);
    const issues = Array.from({ length: 10 }, (_, i) => ({
        id: `fx_wk_ollie_${i + 1}`,
        accountId: acct.id,
        kind: "substack",
        title: `Issue ${100 - i}`,
        publishedAt: daysAgo(3 + i * 7),
        durationSec: 0,
        metrics: {},
    }));
    const snapshots = [];
    for (let d = 80; d >= 0; d -= 7) {
        const at = daysAgo(d);
        const listed = issues.filter((w) => Date.parse(w.publishedAt) <= Date.parse(at)).map((w, i) => ({ ...w, metrics: { recipients: 30_000, opens: 13_000 + (i % 3) * 500 } }));
        snapshots.push({ account: acct, works: listed, provenance: prov("substack_export", acct.platformId, "uploaded", at) });
    }
    return { account: acct, sources: { snapshots } };
}
/* Nova Reyes: podcast */
export const NOVA = { creatorId: "fx_cr_nova", accountId: "fx_ac_nova_pod" };
export function nova() {
    const acct = account(NOVA.accountId, NOVA.creatorId, "podcast", "Night Shift Notes", 12_000);
    const episodes = Array.from({ length: 8 }, (_, i) => ({
        id: `fx_wk_nova_${i + 1}`,
        accountId: acct.id,
        kind: "podcast",
        title: `Episode ${60 - i}`,
        publishedAt: daysAgo(35 + i * 7),
        durationSec: 3000,
        metrics: { downloads_7d: 6_000 + i * 100, downloads_30d: 9_000 + i * 100 },
    }));
    const at = daysAgo(1);
    return { account: acct, sources: { snapshots: [{ account: acct, works: episodes, provenance: prov("podcast_host", acct.platformId, "uploaded", at) }] } };
}
/* Kit Arden: Twitch */
export const KIT = { creatorId: "fx_cr_kit", accountId: "fx_ac_kit_tw" };
export function kit() {
    const acct = account(KIT.accountId, KIT.creatorId, "twitch", "kitarden", 40_000);
    const streams = Array.from({ length: 6 }, (_, i) => ({
        id: `fx_wk_kit_${i + 1}`,
        accountId: acct.id,
        kind: "twitch",
        title: `Stream ${i + 1}`,
        publishedAt: daysAgo(4 + i * 3),
        durationSec: 4 * 3600,
        metrics: { avg_viewers: 800 + i * 20, peak_viewers: 1500 },
    }));
    // One read per stream, the day after.
    const snapshots = streams.map((s) => ({ account: acct, works: [s], provenance: prov("twitch", acct.platformId, "connected", addDays(s.publishedAt, 1)) }));
    return { account: acct, sources: { snapshots } };
}
/* Wren Hollis: not opted in */
export const WREN = { creatorId: "fx_cr_wren", accountId: "fx_ac_wren_yt" };
export function wren() {
    const base = juniper();
    const acct = { ...base.account, id: WREN.accountId, creatorId: WREN.creatorId, handle: "@wrenhollis", platformId: "fx_ac_wren_platform" };
    return { account: acct, sources: { snapshots: [] } };
}
export const consentsFor = (creatorId, scopes, at = daysAgo(60)) => scopes.map((scope) => ({ creatorId, scope, grantedAt: at, revokedAt: null }));
export function allConsents() {
    return [
        ...consentsFor(JUNIPER.creatorId, ["connect", "sponsorships"]),
        ...consentsFor(OLLIE.creatorId, ["sponsorships"]),
        ...consentsFor(NOVA.creatorId, ["sponsorships"]),
        ...consentsFor(KIT.creatorId, ["connect", "sponsorships"]),
        ...consentsFor(WREN.creatorId, ["connect"]),
    ];
}
const gbp = (pounds) => ({ amount: pounds * 100, currency: "GBP" });
export const SETTINGS = {
    [JUNIPER.creatorId]: {
        creatorId: JUNIPER.creatorId,
        offerings: [
            { accountId: JUNIPER.accountId, format: "integration", price: gbp(900), available: true },
            { accountId: JUNIPER.accountId, format: "dedicated", price: gbp(2400), available: false },
        ],
        excludedCategories: ["gambling"],
        minNoticeDays: 7,
        blackouts: [],
        vertical: "diy",
    },
    [OLLIE.creatorId]: {
        creatorId: OLLIE.creatorId,
        offerings: [{ accountId: OLLIE.accountId, format: "newsletter_slot", price: gbp(450), available: true }],
        excludedCategories: [],
        minNoticeDays: 3,
        blackouts: [],
        vertical: "finance",
    },
    [NOVA.creatorId]: {
        creatorId: NOVA.creatorId,
        offerings: [{ accountId: NOVA.accountId, format: "podcast_read", price: gbp(220), available: true }],
        excludedCategories: ["fintech"],
        minNoticeDays: 5,
        blackouts: [],
        vertical: "culture",
    },
    [KIT.creatorId]: {
        creatorId: KIT.creatorId,
        offerings: [{ accountId: KIT.accountId, format: "stream_segment", price: gbp(700), available: true }],
        excludedCategories: [],
        minNoticeDays: 2,
        blackouts: [],
        vertical: "gaming",
    },
};
export const BRAND = { id: "fx_brand_ledgerly", org: "Ledgerly", email: "team@ledgerly.example", category: "fintech", createdAt: daysAgo(30), termsAcceptedAt: daysAgo(30) };
export const brief = (over = {}) => ({
    title: "Ledgerly autumn launch",
    product: "Ledgerly, a budgeting app",
    budget: gbp(10_000),
    kinds: [],
    formats: ["integration", "newsletter_slot", "podcast_read", "stream_segment"],
    audience: { countries: ["GB"], verticals: ["finance", "diy"] },
    window: { start: addDays(FIXTURE_NOW, 8), end: addDays(FIXTURE_NOW, 60) },
    kpis: [],
    jurisdictions: ["UK"],
    reviewDrafts: true,
    ...over,
});
/** A fixed exchange rate for tests only: 1 USD = 0.75 GBP. Not a real rate. */
export const FIXTURE_FX = (m, to) => {
    if (m.currency === to)
        return m;
    if (m.currency === "USD" && to === "GBP")
        return { amount: Math.round(m.amount * 0.75), currency: "GBP" };
    return null;
};
