/*
  The view model for a creator's public page at orbe.vc/@handle. It exists
  only for a creator who has opted in (a live verified_profile consent) and
  shows only what they chose. There is no seal or badge (docs/NORTHSTAR.md,
  decision 2): verification shows only as a plain statement of where the
  figures were read, the day they were last read, and how much of last year's
  revenue comes from connected accounts.
*/
import { collectFigures, concat, figure, plain, say } from "./figures.js";
import { STREAM_LABEL } from "./ledger.js";
import { buildReport } from "./report.js";
import { SOURCE_LABEL } from "./sources.js";
import { PRIVATE_BY_DEFAULT } from "./types.js";
import { formatDate } from "./util.js";
export const PROFILE_BASE_URL = "https://orbe.vc";
/**
  The public never sees YouTube Analytics data. YouTube's Developer Policies let
  compiled Analytics data be shown only to the channel owner and the people they
  authorise, and a public page has no such reader, so revenue and snapshots read
  through youtube_analytics are left out before the profile is built. AdSense,
  Stripe and the other sources are unaffected.
*/
export function withoutYouTubeAnalytics(input) {
    return {
        ...input,
        revenue: input.revenue.filter((l) => l.provenance.source !== "youtube_analytics"),
        snapshots: input.snapshots.filter((s) => s.provenance.source !== "youtube_analytics"),
    };
}
export function buildPublicProfile(input, opts = {}) {
    input = withoutYouTubeAnalytics(input);
    const res = buildReport(input, { kind: "public" }, opts);
    if (!res.ok)
        return res;
    const { report, record } = res;
    const settings = input.publicSettings ?? PRIVATE_BY_DEFAULT;
    const primary = [...record.accounts].sort((a, b) => b.audience - a.audience)[0];
    const handle = (opts.handle ?? primary?.handle ?? input.creator.id).replace(/^@/, "");
    const path = `/@${encodeURIComponent(handle)}`;
    const latestAudience = (accountId) => {
        if (!settings.audience)
            return null;
        const fromReport = report.audience.find((a) => a.accountId === accountId)?.audience;
        if (fromReport)
            return fromReport;
        const snaps = record.snapshots.filter((s) => s.snapshot.account.id === accountId).sort((a, b) => a.snapshot.provenance.checkedAt.localeCompare(b.snapshot.provenance.checkedAt));
        const last = snaps[snaps.length - 1];
        return last ? figure(`profile.audience.${accountId}`, `Audience, @${last.snapshot.account.handle}`, last.snapshot.account.audience, "count", [last.provId], { basis: last.snapshot.provenance.basis }) : null;
    };
    const ttm = report.revenue?.ttm ?? null;
    const profile = {
        path,
        url: `${opts.baseUrl ?? PROFILE_BASE_URL}${path}`,
        handle,
        displayName: input.creator.displayName,
        statement: freshnessStatement(record, { showSources: settings.sources }),
        accounts: record.accounts.map((a) => ({ kind: a.kind, handle: a.handle, title: a.title, audience: latestAudience(a.id) })),
        rating: report.rating,
        revenue: {
            ttm: ttm?.total ?? null,
            streams: (ttm?.byStream ?? []).map((s) => ({ stream: s.stream, label: STREAM_LABEL[s.stream], share: s.share })),
        },
        checks: settings.checks ? report.checkSummary : null,
        sources: settings.sources
            ? report.provenance
                .filter((p) => p.source !== "declared")
                .map((p) => ({ id: p.id, label: p.label, freshness: p.freshness, lastCheckedAt: p.lastCheckedAt }))
            : [],
        provenance: report.provenance,
        figures: [],
        generatedAt: report.generatedAt,
    };
    profile.figures = [...collectFigures({ ...profile, provenance: [] }).values()].sort((a, b) => a.id.localeCompare(b.id));
    return { ok: true, profile };
}
const hasDisagreements = (record) => record.findings.some((f) => f.status === "contradicted" && (f.severity === "medium" || f.severity === "high")) || record.flags.some((f) => f.severity === "high");
/** "Stripe", "Stripe and Google AdSense", "Stripe, Patreon and Google AdSense". */
function listNames(names) {
    if (names.length <= 1)
        return names.join("");
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
/**
  The statement reads the full record, though the profile shows only what the
  creator chose: with sources hidden, it gives the day but neither the source
  names nor the share.
*/
export function freshnessStatement(record, opts = {}) {
    const showSources = opts.showSources ?? true;
    const connected = record.provenance.filter((p) => p.basis === "connected" && p.lineCount > 0);
    const disagreements = hasDisagreements(record);
    if (!connected.length) {
        return { status: "not_connected", text: plain("No revenue source is connected yet."), sources: [], firstReadAt: null, lastReadAt: null, connectedShare: null, disagreements };
    }
    const named = [...new Set(connected.map((p) => SOURCE_LABEL[p.source] ?? p.label))];
    const firstReadAt = connected.map((p) => p.firstCheckedAt).sort()[0];
    const lastReadAt = connected.map((p) => p.lastCheckedAt).sort().reverse()[0];
    const status = connected.some((p) => p.freshness === "fresh") ? "fresh" : connected.some((p) => p.freshness === "ageing") ? "ageing" : "lapsed";
    const sources = showSources ? named : [];
    const share = showSources ? record.coverage.connectedShare : null;
    const where = sources.length ? listNames(sources) : "connected accounts";
    const parts = [plain(`Read from ${where} on ${formatDate(lastReadAt)}.`)];
    if (share)
        parts.push(say `${share} of last year's revenue is from connected accounts.`);
    if (disagreements)
        parts.push(plain("Some figures from different sources do not yet agree."));
    return { status, text: concat(parts), sources, firstReadAt, lastReadAt, connectedShare: share, disagreements };
}
