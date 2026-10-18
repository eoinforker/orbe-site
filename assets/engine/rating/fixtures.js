import { DAY_MS } from "../core/util.js";
import { SPECS } from "./kinds.js";
import { maturedShare } from "./measure.js";
/*
  FIXTURES. Synthetic creators for tests, built from the provisional priors
  so that a "typical" fixture should rate close to zero. None of these are
  real creators and none of their numbers are observations.
*/
export const FIXTURE_NOW = "2026-10-18T12:00:00.000Z";
/** A small seeded generator (mulberry32), so property tests are repeatable. */
export function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** A standard normal draw by Box-Muller. */
export const gaussian = (rand) => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-12))) * Math.cos(2 * Math.PI * rand());
const TYPICAL_EVERY_DAYS = { youtube: 7.6, substack: 7.6, twitch: 2.5, podcast: 7.6, photography: 7.6 };
const DEFAULT_AUDIENCE = { youtube: 50_000, substack: 5_000, twitch: 5_000, podcast: 3_000, photography: 20_000 };
/** The metrics of one fixture work once matured, before scaling down for its age. */
function maturedMetrics(kind, audience, volume, eng, durationSec) {
    switch (kind) {
        case "youtube": {
            const short = durationSec > 0 && durationSec <= 180;
            const views = audience * (short ? 0.35 : 0.2) * volume;
            const rate = (short ? 0.04 : 0.035) * eng;
            return { views, likes: views * rate * 0.8, comments: views * rate * 0.2 };
        }
        case "substack": {
            const recipients = audience;
            const opens = recipients * 0.45 * Math.min(volume, 2);
            return { recipients, opens, clicks: opens * 0.1 * eng, new_paid: recipients * 0.0004 * eng, new_free: audience * 0.003 * volume };
        }
        case "twitch": {
            const avg = audience * 0.012 * volume;
            const hours = avg * (durationSec / 3600 || 3);
            return { avg_viewers: avg, peak_viewers: avg / 0.6, hours_watched: hours, new_followers: hours * 0.04 * eng };
        }
        case "podcast": {
            const d7 = audience * 0.5 * volume;
            return { downloads_7d: d7, downloads_30d: d7 * 1.4, completion: Math.min(0.6 * eng, 1) };
        }
        case "photography": {
            const views = audience * 0.15 * volume;
            const licences = views * 0.00005 * eng;
            return { views, saves: views * 0.02 * eng, licences, licence_revenue: licences * 4500 };
        }
    }
}
export function fixtureSnapshot(o) {
    const spec = SPECS[o.kind];
    const now = Date.parse(o.now ?? FIXTURE_NOW);
    const audience = o.audience ?? DEFAULT_AUDIENCE[o.kind];
    const n = o.n ?? 25;
    const every = o.everyDays ?? TYPICAL_EVERY_DAYS[o.kind];
    const newest = o.newestAgeDays ?? Math.max(spec.minAgeDays, 1) + 1;
    const hitEvery = o.hitEvery ?? 8;
    const rand = seeded(o.seed ?? 1);
    const accountId = o.id ?? `ac_fixture_${o.kind}`;
    const durationSec = o.durationSec ?? (o.kind === "twitch" ? 3 * 3600 : o.kind === "photography" || o.kind === "substack" ? 0 : 900);
    const works = [];
    for (let i = 0; i < n; i++) {
        const ageDays = newest + i * every;
        const hit = hitEvery > 0 && i % hitEvery === hitEvery - 1 ? 2.5 : 1;
        const volume = (o.reach ?? 1) * hit * (o.noise ? Math.exp(o.noise * gaussian(rand)) : 1);
        const target = maturedMetrics(o.kind, audience, volume, o.engagement ?? 1, durationSec);
        const metrics = {};
        for (const m of spec.metrics)
            if (m.key in target)
                metrics[m.key] = target[m.key] * maturedShare(m.maturity, ageDays);
        works.push({
            id: `wk_fixture_${o.kind}_${String(i).padStart(3, "0")}`,
            accountId,
            kind: o.kind,
            title: `Fixture work ${i}`,
            publishedAt: new Date(now - ageDays * DAY_MS).toISOString(),
            durationSec,
            metrics,
        });
    }
    return {
        account: { id: accountId, creatorId: null, kind: o.kind, platformId: `fixture-${o.kind}`, handle: `@fixture${o.kind}`, title: o.title ?? `Fixture ${spec.name}`, audience },
        works,
        provenance: { source: sourceFor(o.kind), accountId, checkedAt: o.now ?? FIXTURE_NOW, basis: "public" },
    };
}
const SOURCES = {
    youtube: "youtube_public",
    substack: "substack_export",
    twitch: "twitch",
    podcast: "podcast_host",
    photography: "photo_licensing",
};
const sourceFor = (kind) => SOURCES[kind];
/** Scales the audience and every volume metric by k, leaving rates (like completion) alone. */
export function scaleSnapshot(s, k) {
    const spec = SPECS[s.account.kind];
    const volume = new Set(spec.metrics.filter((m) => m.unit !== "ratio").map((m) => m.key));
    return {
        ...s,
        account: { ...s.account, audience: s.account.audience * k },
        works: s.works.map((w) => ({ ...w, metrics: Object.fromEntries(Object.entries(w.metrics).map(([key, v]) => [key, volume.has(key) ? v * k : v])) })),
    };
}
/** Multiplies one metric on every work. */
export function scaleMetric(s, metric, k) {
    return { ...s, works: s.works.map((w) => (metric in w.metrics ? { ...w, metrics: { ...w.metrics, [metric]: w.metrics[metric] * k } } : w)) };
}
export const ALL_KINDS = ["youtube", "substack", "twitch", "podcast", "photography"];
