/*
  View models the API serves: the creator's show dashboard (private), and an
  opt-in public stats page. Pure functions of data already counted, so the
  API layer decides who may see which and the store decides what is kept.
  Every number block says which tier it rests on, in the words of
  PROVENANCE_METHODS: estimated from public signals, measured by Orbe, or
  read from your host.
*/
import { PROVENANCE_METHODS } from "../core/types.js";
import { enclosureKey } from "../ingest/browser.js";
import { totals } from "./aggregate.js";
import { chartName } from "./charts.js";
/** Smart link clicks, one per listener, show and day, so a double tap is one click. */
export function summariseClicks(records, showId) {
    const seen = new Set();
    const byApp = {};
    const bySource = {};
    let total = 0;
    for (const r of records) {
        if (r.kind !== "click" || r.showId !== showId || r.method !== "GET")
            continue;
        const k = `${r.at.slice(0, 10)}|${r.listener}|${r.target}`;
        if (seen.has(k))
            continue;
        seen.add(k);
        total++;
        byApp[r.target] = (byApp[r.target] ?? 0) + 1;
        const via = r.via ?? "direct";
        bySource[via] = (bySource[via] ?? 0) + 1;
    }
    return { total, byApp, bySource };
}
/** Downloads per episode over the days given, with first-week and first-month counts where the days cover them. */
export function episodeRows(days, feed) {
    const first = days[0]?.day ?? "9999-12-31";
    const keyOf = new Map(feed.enclosures.map((e) => [e.guid, enclosureKey(e.url)]));
    return feed.episodes.map((e) => {
        const key = keyOf.get(e.guid);
        const pub = e.publishedAt.slice(0, 10);
        const sumTo = (n) => {
            if (!key || pub < first)
                return null;
            const last = new Date(Date.parse(`${pub}T00:00:00Z`) + (n - 1) * 864e5).toISOString().slice(0, 10);
            return days.filter((d) => d.day >= pub && d.day <= last).reduce((a, d) => a + (d.byEpisode[key] ?? 0), 0);
        };
        const downloads = key ? days.reduce((a, d) => a + (d.byEpisode[key] ?? 0), 0) : 0;
        return { guid: e.guid, title: e.title, publishedAt: e.publishedAt, downloads, downloads_7d: sumTo(7), downloads_30d: sumTo(30) };
    });
}
export function buildDashboard(i) {
    const tiers = [
        { method: "estimated", label: PROVENANCE_METHODS.estimated, available: i.publicSignals.length > 0, note: i.publicSignals.length ? `From ${i.publicSignals.join(", ")}.` : "No public signals for this show yet." },
        { method: "measured", label: PROVENANCE_METHODS.measured, available: i.prefix?.status === "live" || i.prefix?.status === "partial", note: i.prefix ? i.prefix.message : "Add the Orbe prefix in your host to start measuring." },
        { method: "reported", label: PROVENANCE_METHODS.reported, available: i.hostConnected, note: i.hostConnected ? "Your host's own download figures, read with your API key." : "Connect your host to compare its figures with Orbe's." },
    ];
    const show = { showId: i.showId, title: i.feed.title, feedUrl: i.feedUrl };
    if (i.feed.imageUrl)
        show.imageUrl = i.feed.imageUrl;
    return {
        show,
        tiers,
        downloadsMethod: i.downloadsMethod,
        downloadsLabel: i.downloadsMethod ? PROVENANCE_METHODS[i.downloadsMethod] : null,
        downloads: {
            total: i.days.reduce((a, d) => a + d.downloads, 0),
            byDay: i.days.map((d) => ({ day: d.day, downloads: d.downloads })),
            byEpisode: episodeRows(i.days, i.feed),
            byApp: totals(i.days, (d) => d.byApp),
            byCountry: totals(i.days, (d) => d.byCountry),
        },
        prefix: i.prefix,
        charts: { best: i.bestCharts.map((b) => ({ chart: chartName(b.chart), best: b.best, on: b.on, latest: b.latest, latestOn: b.latestOn })), moments: i.moments },
        ratings: i.ratings,
        links: summariseClicks(i.clicks, i.showId),
        promos: i.promos,
        plausibility: i.plausibility,
    };
}
/** Provisional: on the public page, apps and countries under this share are folded into "Other". */
export const PUBLIC_MIN_SHARE = 0.05;
/** Provisional: a public page shows nothing below this many downloads in 30 days, where single listeners could be inferred. */
export const PUBLIC_MIN_DOWNLOADS = 100;
/** Two significant figures: public numbers are for scale, not audit. */
export const roughly = (n) => {
    if (n < 100)
        return n;
    const p = 10 ** (Math.floor(Math.log10(n)) - 1);
    return Math.round(n / p) * p;
};
const shares = (b) => {
    const total = Object.values(b).reduce((a, n) => a + n, 0);
    if (!total)
        return [];
    const out = [];
    let other = 0;
    for (const [name, n] of Object.entries(b).sort((x, y) => y[1] - x[1])) {
        if (name === "Unknown" || name === "Other" || n / total < PUBLIC_MIN_SHARE)
            other += n;
        else
            out.push({ name, share: Math.round((n / total) * 100) / 100 });
    }
    if (other)
        out.push({ name: "Other", share: Math.round((other / total) * 100) / 100 });
    return out;
};
/**
  The opt-in public page: rounded totals, weekly not daily, shares not
  counts, no episode detail, no links, no promos, no plausibility notes.
  Hidden unless the creator opted in and there is enough to show safely.
*/
export function buildPublicStats(d, optedIn) {
    if (!optedIn)
        return { status: "hidden", reason: "The creator has not made their stats public." };
    if (!d.downloadsMethod || d.downloadsMethod === "estimated")
        return { status: "hidden", reason: "There are no measured or host-reported downloads to show yet." };
    const last30 = d.downloads.byDay.slice(-30);
    const n30 = last30.reduce((a, x) => a + x.downloads, 0);
    if (n30 < PUBLIC_MIN_DOWNLOADS)
        return { status: "hidden", reason: `Public stats appear once a show has ${PUBLIC_MIN_DOWNLOADS} downloads in 30 days.` };
    const weekly = [];
    for (let i = 0; i + 7 <= d.downloads.byDay.length; i += 7) {
        const w = d.downloads.byDay.slice(i, i + 7);
        weekly.push({ weekStarting: w[0].day, downloads: roughly(w.reduce((a, x) => a + x.downloads, 0)) });
    }
    return {
        status: "shown",
        title: d.show.title,
        label: d.downloadsLabel,
        downloads30d: roughly(n30),
        weekly,
        appShares: shares(d.downloads.byApp),
        countryShares: shares(d.downloads.byCountry),
        charts: d.charts.best,
        ratings: d.ratings.map((r) => ({ platform: r.platform, country: r.country, average: r.latest.average, count: r.latest.count })),
    };
}
/**
  For the sponsorship network's delivery checks: an episode's measured or
  host-reported downloads at 7 and 30 days, with the tier it rests on.
*/
export function deliveryFor(rows, guid, method) {
    const r = rows.find((x) => x.guid === guid);
    return r ? { downloads_7d: r.downloads_7d, downloads_30d: r.downloads_30d, method, label: method ? PROVENANCE_METHODS[method] : null } : null;
}
