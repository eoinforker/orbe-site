import { DAY_MS } from "../core/util.js";
import { assertPlain, grouped, WORKS_NOUN } from "./format.js";
const ANY = "*";
/** Which published statistics a note covers, in reading order. Craft first, then the one money figure that matters most for the kind. */
export const RESEARCH_METRICS = ["cadence.perMonth", "engagement", "growth.audience", "newsletter.paidConversion", "membership.churn", "revenue.per1k", "ads.rpm"];
/** At most this many points, so the note stays a note. */
export const RESEARCH_MAX_POINTS = 4;
/**
  What "engagement" means per kind in the benchmarks. Mirrors bench's
  ENGAGEMENT formulas at method 2026.10; if bench changes them, change this.
*/
export const ENGAGEMENT_WORDS = {
    youtube: "likes and comments per view",
    substack: "open rate",
    twitch: "average viewers as a share of followers",
    podcast: "thirty-day downloads per follower",
    photography: "saves per view",
};
const KIND_PLURAL = { youtube: "YouTube channels", substack: "newsletters", twitch: "Twitch streamers", podcast: "podcasts", photography: "photographers" };
const AUDIENCE_NOUN = { youtube: "subscribers", substack: "subscribers", twitch: "followers", podcast: "followers", photography: "followers" };
const bandOf = (bands, x) => bands?.find((b) => x >= b.min && (b.max === null || x < b.max));
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
export function researchNote(season, input) {
    const kind = input.kind;
    const aBand = bandOf(season.audienceBands[kind], input.audience);
    const rBand = input.revenueGBP != null ? bandOf(season.revenueBands, input.revenueGBP) : undefined;
    const live = (c) => (c && !c.suppressed && (c.count ?? 0) > 0 ? c : undefined);
    const find = (aud, rev) => live(season.cohorts.find((c) => c.kind === kind && c.audienceBand === aud && c.revenueBand === rev && c.vertical === ANY));
    // Narrowest first: kind, size and revenue; then size; then revenue; then the whole kind.
    const candidates = [];
    const sizeWords = aBand ? `with ${lower(aBand.label)} ${AUDIENCE_NOUN[kind]}` : "";
    const revWords = rBand ? `earning ${lower(rBand.label)} a year` : "";
    if (aBand && rBand)
        candidates.push({ c: find(aBand.id, rBand.id), label: `${KIND_PLURAL[kind]} ${sizeWords} ${revWords}` });
    if (aBand)
        candidates.push({ c: find(aBand.id, ANY), label: `${KIND_PLURAL[kind]} ${sizeWords}` });
    if (rBand)
        candidates.push({ c: find(ANY, rBand.id), label: `${KIND_PLURAL[kind]} ${revWords}` });
    candidates.push({ c: find(ANY, ANY), label: `${KIND_PLURAL[kind]} of every size` });
    for (const { c, label } of candidates) {
        if (!c)
            continue;
        const points = RESEARCH_METRICS.map((m) => point(c, m, kind, input.own?.[m]))
            .filter((p) => p !== null)
            .slice(0, RESEARCH_MAX_POINTS);
        if (!points.length)
            continue;
        const count = c.count ?? 0;
        const lead = `Among the ${grouped(count)} ${label} who share their numbers with Orbe (season ${season.season}):`;
        return {
            status: "ok",
            season: season.season,
            version: season.version,
            kind,
            cohort: { key: c.key, level: c.level, label, count },
            points,
            text: assertPlain([lead, ...points.map((p) => p.text)].join(" ")),
            tier: "free",
        };
    }
    return {
        status: "no_cohort",
        season: season.season,
        version: season.version,
        kind,
        cohort: null,
        points: [],
        text: assertPlain(`There are not yet enough ${KIND_PLURAL[kind]} your size sharing their numbers to say what is typical without risking anyone's privacy. This fills in as more creators join.`),
        tier: "free",
    };
}
function value(unit, v) {
    switch (unit) {
        case "gbp":
        case "gbp_per_1k":
            return v >= 1000 ? `£${grouped(Math.round(v))}` : `£${grouped(v, v < 10 ? 2 : 0)}`;
        case "ratio":
            return `${grouped(v * 100, Math.abs(v) < 0.1 ? 1 : 0)}%`;
        case "per_month":
            return `${grouped(v, 1)} a month`;
        default:
            return grouped(v, 2);
    }
}
function point(c, metric, kind, you) {
    const m = c.metrics.find((x) => x.metric === metric);
    if (!m || m.suppressed || m.median === null || !m.n)
        return null;
    const v = (x) => value(m.unit, x);
    const bare = (x) => (m.unit === "per_month" ? grouped(x, 1) : v(x));
    const half = m.p25 !== null && m.p75 !== null ? ` The middle half sit between ${bare(m.p25)} and ${bare(m.p75)}.` : "";
    const sentence = {
        "cadence.perMonth": `The typical one publishes ${grouped(m.median, 1)} ${WORKS_NOUN[kind]} a month.`,
        engagement: `Typical ${ENGAGEMENT_WORDS[kind]} is ${v(m.median)}.`,
        "growth.audience": `Typical audience growth is ${v(m.median)} a year.`,
        "newsletter.paidConversion": `Typically ${v(m.median)} of subscribers pay.`,
        "membership.churn": `Typical monthly membership churn is ${v(m.median)}.`,
        "revenue.per1k": `Typical revenue is ${v(m.median)} a year for every 1,000 ${AUDIENCE_NOUN[kind]}.`,
        "ads.rpm": `Typical ad revenue is ${v(m.median)} per 1,000 ${kind === "podcast" ? "downloads" : "views"}.`,
    };
    const label = sentence[metric];
    if (!label)
        return null;
    let position = null;
    let mine = "";
    if (you !== undefined && Number.isFinite(you) && m.p25 !== null && m.p75 !== null) {
        position = you < m.p25 ? "below" : you > m.p75 ? "above" : "within";
        const where = position === "within" ? "inside the middle half" : position === "below" ? "below the middle half" : "above the middle half";
        const shown = metric === "cadence.perMonth" ? `${grouped(you, 1)} a month` : v(you);
        mine = ` Yours is ${shown}, ${where}.`;
    }
    return { metric, label: metric, n: m.n, median: m.median, p25: m.p25, p75: m.p75, you: you ?? null, position, text: label + half + mine };
}
/**
  The creator's own cadence and engagement on the benchmark definitions
  (works in the last 90 days read; engagement as bench's ENGAGEMENT), so a
  note can say where they sit. Mirrors bench/profile.ts at method 2026.10.
*/
export function ownBenchValues(latest) {
    const until = Date.parse(latest.provenance.checkedAt);
    const recent = latest.works.filter((w) => {
        const t = Date.parse(w.publishedAt);
        return t > until - 90 * DAY_MS && t <= until;
    });
    const out = { "cadence.perMonth": (recent.length * (365.25 / 12)) / 90 };
    const sum = (keys, w) => keys.reduce((s, k) => s + (w.metrics[k] ?? 0), 0);
    const kind = latest.account.kind;
    const ratio = {
        youtube: [["likes", "comments"], ["views"]],
        substack: [["opens"], ["recipients"]],
        twitch: [["avg_viewers"], "audience"],
        podcast: [["downloads_30d"], "audience"],
        photography: [["saves"], ["views"]],
    };
    const [num, den] = ratio[kind];
    if (den === "audience") {
        const xs = recent.filter((w) => num.some((k) => k in w.metrics)).map((w) => sum(num, w) / Math.max(latest.account.audience, 1));
        if (xs.length && latest.account.audience > 0)
            out.engagement = xs.reduce((a, b) => a + b, 0) / xs.length;
    }
    else {
        const n = recent.reduce((s, w) => s + (sum(den, w) > 0 ? sum(num, w) : 0), 0);
        const d = recent.reduce((s, w) => s + sum(den, w), 0);
        if (d > 0)
            out.engagement = n / d;
    }
    return out;
}
