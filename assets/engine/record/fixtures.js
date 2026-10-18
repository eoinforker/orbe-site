/*
  FIXTURES. Made-up creators for tests and examples, not real people, channels
  or companies. Every id starts "fx_" and every name is invented. Figures are
  generated from simple rules (below) so each case is easy to reason about:
  - clean: Juniper Vale, a woodworking channel whose sources all agree;
  - messy: Ollie Marsh, a newsletter with stale exports, gaps, other
    currencies and invoices paid by bank transfer;
  - suspicious: Nova Reyes, a gaming channel with a subscriber jump, a view
    spike, estimates that disagree with payouts and invoices paid short.
*/
import { addMonths, monthRange } from "./util.js";
/** Every fixture is built as of this moment. */
export const FIXTURE_NOW = "2026-10-18T09:00:00.000Z";
export const FIXTURE_BUYER = "fx_byr_holdco";
const DAY = 864e5;
const isoDaysAgo = (days, from = FIXTURE_NOW) => new Date(Date.parse(from) - days * DAY).toISOString();
/** Deterministic noise in [-1, 1], so fixtures never change between runs. */
function noise(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    };
}
const prov = (source, accountId, basis, checkedAt) => ({ source, accountId, checkedAt, basis });
/** Line ids restart for each fixture so building one twice gives identical ids. */
let seq = 0;
let prefix = "";
const begin = (name) => {
    seq = 0;
    prefix = name;
};
function line(accountId, month, stream, pounds, p, extra = {}) {
    const l = {
        id: extra.id ?? `fx_rv_${prefix}_${(++seq).toString().padStart(4, "0")}`,
        accountId,
        month,
        stream,
        gross: { amount: Math.round(pounds * 100), currency: extra.currency ?? "GBP" },
        provenance: p,
    };
    if (extra.counterparty)
        l.counterparty = extra.counterparty;
    if (extra.measure)
        l.measure = extra.measure;
    return l;
}
const consent = (creatorId, scope, grantedAt, buyerId, revokedAt = null) => {
    const c = { creatorId, scope, grantedAt, revokedAt };
    if (buyerId)
        c.buyerId = buyerId;
    return c;
};
/** Weekly works over the last year with views around `views` and engagement around `likeRate`. */
function weeklyWorks(accountId, kind, prefix, count, everyDays, views, likeRate, seed, startDaysAgo = 3) {
    const r = noise(seed);
    const works = [];
    for (let i = 0; i < count; i++) {
        const v = Math.round(views * (1 + 0.25 * r()));
        works.push({
            id: `fx_wk_${prefix}_${i}`,
            accountId,
            kind,
            title: `${prefix} work ${count - i}`,
            publishedAt: isoDaysAgo(startDaysAgo + i * everyDays),
            durationSec: kind === "substack" ? 0 : 900,
            metrics: { views: v, likes: Math.round(v * likeRate * (1 + 0.15 * r())), comments: Math.round(v * likeRate * 0.12) },
        });
    }
    return works;
}
/** Daily public reads over the last `days`, the audience growing by `perDay`, with optional steps. */
function dailySnapshots(account, works, days, perDay, steps = {}) {
    const out = [];
    const stepped = Object.values(steps).reduce((a, b) => a + b, 0);
    let audience = account.audience - perDay * days - stepped;
    for (let d = days; d >= 0; d--) {
        if (d < days)
            audience += perDay + (steps[d] ?? 0);
        const checkedAt = isoDaysAgo(d);
        out.push({
            account: { ...account, audience: Math.round(audience) },
            works: works.filter((w) => Date.parse(w.publishedAt) <= Date.parse(checkedAt)),
            provenance: prov("youtube_public", account.platformId, "public", checkedAt),
        });
    }
    return out;
}
/** YouTube shows public counts to three significant figures. */
const threeFigures = (n) => {
    const p = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 2);
    return Math.floor(n / p) * p;
};
const MONTHS_24 = monthRange("2024-10-01", "2026-09-01");
const seasonalAds = (m) => ({ 11: 1.3, 12: 1.4, 1: 0.8 }[Number(m.slice(5, 7))] ?? 1);
/* Juniper Vale: clean. */
export function cleanCreator() {
    begin("juniper");
    const creatorId = "fx_cr_juniper";
    const yt = {
        id: "fx_ac_juniper_yt",
        creatorId,
        kind: "youtube",
        platformId: "UCfxJuniperVale0000001",
        handle: "junipervale",
        title: "Juniper Vale Workshop (fixture)",
        audience: 241_734,
        createdAt: "2019-03-02T00:00:00.000Z",
        country: "GB",
    };
    const recent = isoDaysAgo(2);
    const adsense = prov("adsense", "pub-fx-juniper", "connected", recent);
    const yta = prov("youtube_analytics", yt.platformId, "connected", recent);
    const stripe = prov("stripe", "acct_fx_juniper", "connected", recent);
    const invoices = prov("invoice_upload", "fx_upload_juniper", "uploaded", isoDaysAgo(10));
    const revenue = [];
    const sponsors = ["Oakline Tools Ltd", "Brightgrain Finishes", "Northfold Clamps"];
    const r = noise(11);
    MONTHS_24.forEach((m, i) => {
        const ads = 6000 * 1.015 ** i * seasonalAds(m) * (1 + 0.03 * r());
        revenue.push(line("fx_ac_juniper_adsense", m, "ads", ads, adsense));
        revenue.push(line(yt.id, m, "ads", ads * 1.02, yta));
        const products = 2500 * 1.01 ** i * (1 + 0.05 * r());
        revenue.push(line("fx_ac_juniper_stripe", m, "products", products, stripe));
        let charged = products;
        // A sponsor every other month, invoiced and paid through Stripe the month after.
        if (i % 2 === 0 && i < MONTHS_24.length - 1) {
            const sponsor = sponsors[(i / 2) % sponsors.length];
            const amount = 4000 + 500 * ((i / 2) % 3);
            revenue.push(line("fx_ac_juniper_invoices", m, "sponsorship", amount, invoices, { counterparty: sponsor }));
            revenue.push(line("fx_ac_juniper_stripe", addMonths(m, 1), "sponsorship", amount, stripe, { counterparty: sponsor.replace("Ltd", "Limited") }));
        }
        if (i % 2 === 1)
            charged += 4000 + 500 * (((i - 1) / 2) % 3);
        revenue.push(line("fx_ac_juniper_stripe", m, "other", charged * 0.972, stripe, { counterparty: "Stripe payout", measure: "paid_out" }));
    });
    const works = weeklyWorks(yt.id, "youtube", "juniper", 52, 7, 60_000, 0.04, 21);
    const publicReads = dailySnapshots({ ...yt, audience: threeFigures(yt.audience) }, works, 27, 310).map((s) => ({
        ...s,
        account: { ...s.account, audience: threeFigures(s.account.audience) },
    }));
    const connected = { account: yt, works, provenance: prov("youtube_analytics", yt.platformId, "connected", recent) };
    const rating = {
        accountId: yt.id,
        kind: "youtube",
        rating: 2.14,
        band: "Good",
        sizeBand: "100k to 500k",
        parts: [],
        modelVersion: "2026.10",
        computedAt: isoDaysAgo(1),
    };
    return {
        creator: { id: creatorId, displayName: "Juniper Vale (fixture)" },
        accounts: [yt],
        snapshots: [...publicReads, connected],
        revenue,
        consents: [
            consent(creatorId, "connect", "2025-01-10T10:00:00.000Z"),
            consent(creatorId, "verified_profile", "2025-01-10T10:00:00.000Z"),
            consent(creatorId, "share_with_buyer", "2026-09-30T10:00:00.000Z", FIXTURE_BUYER),
        ],
        rating,
        declared: { faceDependence: { level: "none", declaredBy: "creator", declaredAt: "2026-09-30T10:00:00.000Z", note: "Hands and tools on camera; the creator is rarely shown." } },
        publicSettings: { revenue: "band", streams: true, audience: true, rating: true, checks: true, sources: true },
    };
}
/* Ollie Marsh: messy. */
export function messyCreator() {
    begin("ollie");
    const creatorId = "fx_cr_ollie";
    const sub = {
        id: "fx_ac_ollie_substack",
        creatorId,
        kind: "substack",
        platformId: "marshreport",
        handle: "marshreport",
        title: "The Marsh Report (fixture)",
        audience: 48_200,
        createdAt: "2021-05-01T00:00:00.000Z",
    };
    const yt = {
        id: "fx_ac_ollie_yt",
        creatorId,
        kind: "youtube",
        platformId: "UCfxOllieMarsh00000001",
        handle: "marshreport",
        title: "Marsh Report Video (fixture)",
        audience: 12_400,
    };
    const exportRead = prov("substack_export", "marshreport", "uploaded", isoDaysAgo(120));
    const stripe = prov("stripe", "acct_fx_ollie", "connected", isoDaysAgo(3));
    const adsense = prov("adsense", "pub-fx-ollie", "connected", isoDaysAgo(40));
    const invoices = prov("invoice_upload", "fx_upload_ollie", "uploaded", isoDaysAgo(20));
    const revenue = [];
    const r = noise(5);
    MONTHS_24.forEach((m, i) => {
        const subs = 9000 * 1.008 ** i * (1 + 0.02 * r());
        // The Substack export was uploaded in June 2026 and stops at May.
        if (m <= "2026-05-01")
            revenue.push(line(sub.id, m, "subscriptions", subs, exportRead));
        // Stripe was connected in March 2026; it reads from then on.
        if (m >= "2026-03-01")
            revenue.push(line(sub.id, m, "subscriptions", subs * 1.01, stripe));
        // AdSense is small and two months are missing from the read.
        if (m !== "2026-02-01" && m !== "2026-03-01")
            revenue.push(line("fx_ac_ollie_adsense", m, "ads", 380 * (1 + 0.1 * r()), adsense));
    });
    // Sponsors paid by bank transfer: invoices with nothing in Stripe to match.
    for (const [m, amount] of [["2025-11-01", 3500], ["2026-02-01", 3500], ["2026-06-01", 4200]]) {
        revenue.push(line("fx_ac_ollie_invoices", m, "sponsorship", amount, invoices, { counterparty: "Thornbury Press" }));
    }
    // The same invoice entered twice under two ids.
    revenue.push(line("fx_ac_ollie_invoices", "2026-08-01", "sponsorship", 2800, invoices, { counterparty: "Fieldnote Paper Co" }));
    revenue.push(line("fx_ac_ollie_invoices", "2026-08-01", "sponsorship", 2800, invoices, { counterparty: "Fieldnote Paper Co" }));
    // A US sponsor invoiced in dollars, with no exchange rate supplied.
    revenue.push(line("fx_ac_ollie_invoices", "2026-04-01", "sponsorship", 5000, invoices, { counterparty: "Ledgerly Inc", currency: "USD" }));
    // A line supplied twice with the same id.
    const repeated = line("fx_ac_ollie_invoices", "2026-07-01", "sponsorship", 1500, invoices, { counterparty: "Inkwell Studio" });
    revenue.push(repeated, { ...repeated });
    // The current month, not complete yet.
    revenue.push(line(sub.id, "2026-10-01", "subscriptions", 4100, stripe));
    // Posts weekly until two months ago, then nothing.
    const posts = weeklyWorks(sub.id, "substack", "marsh", 40, 7, 21_000, 0.012, 9, 64);
    const subSnap = { account: sub, works: posts, provenance: prov("substack_export", "marshreport", "uploaded", isoDaysAgo(120)) };
    const subSnapNow = { account: sub, works: posts, provenance: prov("substack_export", "marshreport", "uploaded", isoDaysAgo(20)) };
    // A public YouTube read from 45 days ago must have been refreshed or deleted.
    const oldYt = {
        account: yt,
        works: weeklyWorks(yt.id, "youtube", "marshvid", 10, 14, 3000, 0.03, 4, 50),
        provenance: prov("youtube_public", yt.platformId, "public", isoDaysAgo(45)),
    };
    return {
        creator: { id: creatorId, displayName: "Ollie Marsh (fixture)" },
        accounts: [sub, yt],
        snapshots: [subSnap, subSnapNow, oldYt],
        revenue,
        consents: [
            consent(creatorId, "connect", "2026-03-01T10:00:00.000Z"),
            consent(creatorId, "share_with_buyer", "2026-10-01T10:00:00.000Z", FIXTURE_BUYER),
            // An earlier buyer the creator later withdrew from.
            consent(creatorId, "share_with_buyer", "2026-04-01T10:00:00.000Z", "fx_byr_former", "2026-06-01T10:00:00.000Z"),
        ],
        declared: { faceDependence: { level: "partial", declaredBy: "creator", declaredAt: "2026-10-01T10:00:00.000Z", note: "Written in the first person; a guest writer covers one issue a month." } },
    };
}
/* Nova Reyes: suspicious. */
export function suspiciousCreator() {
    begin("nova");
    const creatorId = "fx_cr_nova";
    const yt = {
        id: "fx_ac_nova_yt",
        creatorId,
        kind: "youtube",
        platformId: "UCfxNovaReyes000000001",
        handle: "novaplays",
        title: "Nova Plays (fixture)",
        audience: 171_000,
        createdAt: "2025-01-15T00:00:00.000Z",
    };
    const recent = isoDaysAgo(1);
    const adsense = prov("adsense", "pub-fx-nova", "connected", recent);
    const yta = prov("youtube_analytics", yt.platformId, "connected", recent);
    const stripe = prov("stripe", "acct_fx_nova", "connected", recent);
    const patreon = prov("patreon", "fx_patreon_nova", "connected", recent);
    const invoices = prov("invoice_upload", "fx_upload_nova", "uploaded", isoDaysAgo(6));
    const revenue = [];
    const memberships = [];
    const r = noise(77);
    let members = 900;
    const vexel = ["2025-11-01", "2026-01-01", "2026-03-01", "2026-05-01", "2026-07-01"];
    const vexelPaid = new Set(vexel.map((m) => addMonths(m, 1)));
    MONTHS_24.forEach((m, i) => {
        const ads = 3000 * 1.02 ** i * seasonalAds(m) * (1 + 0.03 * r());
        revenue.push(line("fx_ac_nova_adsense", m, "ads", ads, adsense));
        // YouTube's estimates run 40% above what AdSense finalised for the last four months.
        revenue.push(line(yt.id, m, "ads", ads * (i >= 20 ? 1.4 : 1.01), yta));
        // Products through Stripe; payouts exceed charges in two months.
        const products = 1200 * (1 + 0.05 * r()) * (m === "2026-04-01" ? 20 : 1);
        revenue.push(line("fx_ac_nova_stripe", m, "products", products, stripe));
        const extra = m === "2026-05-01" || m === "2026-06-01" ? 6000 : 0;
        const sponsorPaid = vexelPaid.has(m) ? 6000 : 0;
        revenue.push(line("fx_ac_nova_stripe", m, "other", (products + sponsorPaid) * 0.97 + extra, stripe, { counterparty: "Stripe payout", measure: "paid_out" }));
        // Patreon members churn fast and are replaced.
        const cancelled = Math.round(members * 0.14);
        const joined = Math.round(members * 0.13);
        memberships.push({ accountId: "fx_ac_nova_patreon", month: m, start: members, joined, cancelled, end: members + joined - cancelled, provenance: patreon });
        revenue.push(line("fx_ac_nova_patreon", m, "memberships", members * 5, patreon));
        members = members + joined - cancelled;
    });
    // One sponsor dominates, invoiced at twice what reached Stripe.
    for (const m of vexel) {
        revenue.push(line("fx_ac_nova_invoices", m, "sponsorship", 12000, invoices, { counterparty: "Vexel Energy Ltd" }));
        revenue.push(line("fx_ac_nova_stripe", addMonths(m, 1), "sponsorship", 6000, stripe, { counterparty: "Vexel Energy" }));
    }
    // And a large invoice that never appears anywhere.
    revenue.push(line("fx_ac_nova_invoices", "2026-08-01", "sponsorship", 25000, invoices, { counterparty: "Pixelwave Studios" }));
    // Works: steady, plus one video with huge views and almost no engagement.
    const works = weeklyWorks(yt.id, "youtube", "nova", 50, 7, 40_000, 0.04, 31);
    works[20] = { ...works[20], title: "nova work spike", metrics: { views: 900_000, likes: 2100, comments: 300 } };
    // The audience jumps by 50,000 over three days with no breakout upload.
    const reads = dailySnapshots({ ...yt }, works, 27, 120, { 12: 18_000, 11: 17_000, 10: 15_000 });
    const connected = { account: { ...yt, audience: 171_400 }, works, provenance: prov("youtube_analytics", yt.platformId, "connected", recent) };
    return {
        creator: { id: creatorId, displayName: "Nova Reyes (fixture)" },
        accounts: [yt],
        snapshots: [...reads, connected],
        revenue,
        consents: [consent(creatorId, "connect", "2025-02-01T10:00:00.000Z"), consent(creatorId, "share_with_buyer", "2026-10-10T10:00:00.000Z", FIXTURE_BUYER)],
        memberships,
        rating: { accountId: yt.id, kind: "youtube", rating: -0.4, band: "Average", sizeBand: "100k to 500k", parts: [], modelVersion: "2026.10", computedAt: recent },
        declared: { faceDependence: { level: "central", declaredBy: "buyer", declaredAt: "2026-10-12T10:00:00.000Z", note: "Face-cam on every video; the persona is the brand." } },
    };
}
