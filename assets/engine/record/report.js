/*
  The Orbe Verified report: the record, arranged for a buyer, with a verdict,
  the points that matter, and a scope section that says exactly what was and
  was not checked. buildReport refuses unless the creator has agreed to share
  with this buyer, or the reader is the creator. A public view is the same
  report redacted to what the creator chose to show.
*/
import { sha256Hex } from "../core/hash.js";
import { systemClock } from "../core/util.js";
import { gate } from "./consent.js";
import { collectFigures, concat, figure, plain, say } from "./figures.js";
import { buildRecord } from "./record.js";
import { FRESHNESS_WINDOWS, SOURCE_LABEL } from "./sources.js";
import { PRIVATE_BY_DEFAULT } from "./types.js";
import { formatMonth } from "./util.js";
export const REPORT_VERSION = "orbe-verified/2026.10";
/*
  No price lives here. Reports are not sold up front: under the take rate
  (docs/MODEL.md Part 6) a report is included for a vetted buyer and charged
  only if the buyer walks away after receiving it. That charge, its waivers and
  its invoice belong to src/market/reports.ts, so this module only builds the
  report.
*/
/**
  Provisional verdict thresholds: how much revenue must come from connected
  sources before Orbe calls the record verified. A judgement to revisit with
  the first buyers.
*/
export const VERDICT_RULES = { verifiedConnectedShare: 0.8, partlyBelow: 0.5 };
export const DISCLAIMER = "This report describes what Orbe read from the sources listed, on the dates shown. It is not an audit, a Quality of Earnings review, a valuation, or financial or investment advice. When a business is for sale, Orbe introduces buyers and sellers only: it does not advise on, negotiate or arrange the sale, and it does not hold the purchase money.";
/**
  Builds the report for one reader. The consent gate runs before anything is
  read, so a refused report computes nothing.
*/
export function buildReport(input, audience, opts = {}) {
    const clock = opts.clock ?? systemClock;
    const now = clock();
    const refusal = gate(audience, input.creator.id, input.consents, now);
    if (refusal)
        return { ok: false, refusal };
    const record = buildRecord(input, { ...opts, clock: () => now });
    const full = assemble(input, record, audience);
    if (audience.kind !== "public")
        return { ok: true, report: full, record };
    return { ok: true, report: redact(full, input.publicSettings ?? PRIVATE_BY_DEFAULT), record };
}
function assemble(input, record, audience) {
    const m = record.metrics;
    const mode = audience.kind;
    const verdict = verdictOf(record);
    const headline = [
        m.ttm.total,
        record.coverage.connectedShare,
        record.coverage.corroboratedShare,
        m.growth.ttmYoY,
        m.concentration.top?.share ?? null,
        ...record.rating.map((r) => r.figure),
    ].filter((f) => !!f);
    const findings = record.findings;
    const report = {
        kind: "orbe_verified_report",
        version: REPORT_VERSION,
        id: reportId(record, audience),
        mode,
        creator: { id: input.creator.id, displayName: input.creator.displayName },
        preparedFor: audience,
        generatedAt: record.asOf,
        period: { from: record.months[0], to: record.months[record.months.length - 1], months: record.months },
        currency: record.currency,
        verdict,
        headline,
        keyPoints: keyPoints(record),
        provenance: record.provenance,
        coverage: record.coverage,
        revenue: { ttm: m.ttm, growth: m.growth, seasonality: m.seasonality },
        concentration: m.concentration,
        platform: m.platform,
        retention: m.retention,
        audience: m.audience,
        cadence: m.cadence,
        faceDependence: m.faceDependence,
        findings,
        checkSummary: summariseChecks(findings, record.checks),
        flags: record.flags,
        rating: record.rating.map((r) => ({
            handle: record.accounts.find((a) => a.id === r.rating.accountId)?.handle ?? r.rating.accountId,
            band: r.rating.band,
            modelVersion: r.rating.modelVersion,
            figure: r.figure,
        })),
        scope: scope(record, audience),
        figures: [],
        disclaimer: DISCLAIMER,
    };
    report.figures = indexFigures(report);
    return report;
}
function reportId(record, audience) {
    const who = audience.kind === "buyer" ? audience.buyerId : audience.kind;
    return `ovr_${sha256Hex(`${record.creatorId}|${who}|${record.asOf}`).slice(0, 20)}`;
}
function indexFigures(report) {
    const { figures: _skip, ...rest } = report;
    return [...collectFigures(rest).values()].sort((a, b) => a.id.localeCompare(b.id));
}
function summariseChecks(findings, checks) {
    const prov = [...new Set(findings.flatMap((f) => f.rows.flatMap((r) => r.sides.flatMap((x) => x.figure.prov))))];
    const count = (key, label, v) => figure(`checks.${key}`, label, v, "count", prov);
    const total = (k) => findings.reduce((a, f) => a + f.counts[k], 0);
    return {
        performed: count("performed", "Cross-checks run", checks.filter((c) => c.performed).length),
        matched: count("matched", "Rows matched", total("matched")),
        unmatched: count("unmatched", "Rows without a counterpart", total("unmatched")),
        contradicted: count("contradicted", "Rows contradicted", total("contradicted")),
    };
}
const RANK = { info: 0, low: 1, medium: 2, high: 3 };
function verdictOf(record) {
    const share = record.coverage.connectedShare;
    const serious = record.findings.filter((f) => f.status === "contradicted" && RANK[f.severity] >= RANK.medium);
    const highFlags = record.flags.filter((f) => f.severity === "high");
    if (record.metrics.ttm.total.value <= 0) {
        return {
            status: "not_checked",
            label: "Not yet checked",
            summary: plain("No revenue was read for the last year, so there is nothing to check yet. Connect a source that pays you, and the record fills in from there."),
        };
    }
    if (!record.checks.some((c) => c.performed)) {
        return {
            status: "not_checked",
            label: "Not yet checked",
            summary: say `${share} of the last year's revenue was read from connected sources, but no cross-check could run yet: a check needs two sources that describe the same money, such as Stripe charges and Stripe payouts.`,
        };
    }
    if (share.value < VERDICT_RULES.partlyBelow) {
        return {
            status: "partly_verified",
            label: "Partly verified",
            summary: say `Only ${share} of the last year's revenue was read from a connected source. The rest rests on uploads, so most of this record is the creator's own account of it.`,
        };
    }
    const exceptions = serious.length + highFlags.length;
    if (share.value >= VERDICT_RULES.verifiedConnectedShare && !exceptions) {
        return {
            status: "verified",
            label: "Verified",
            summary: say `${share} of the last year's revenue was read from connected sources, and every cross-check that could run found the sources in agreement or within tolerance.`,
        };
    }
    if (!exceptions) {
        return {
            status: "verified_with_exceptions",
            label: "Verified, with exceptions",
            summary: say `${share} of the last year's revenue was read from connected sources and no check contradicts it. The rest rests on uploads that no connected source confirms.`,
        };
    }
    const n = figure("verdict.exceptions", "Exceptions needing an answer", exceptions, "count", [], {
        note: "Contradicted checks of medium or high severity, plus high-severity flags",
    });
    return {
        status: "verified_with_exceptions",
        label: "Verified, with exceptions",
        summary: say `${share} of the last year's revenue was read from connected sources. Exceptions needing an answer from the creator before a buyer relies on the figures: ${n}.`,
    };
}
function keyPoints(record) {
    const points = [];
    const provOf = (rows) => [...new Set(rows.flatMap((r) => r.sides.flatMap((s) => s.figure.prov)))];
    for (const f of record.findings) {
        if (f.status === "matched") {
            const n = figure(`kp.${f.id}.rows`, "Rows compared", f.counts.matched, "count", provOf(f.rows));
            points.push({ tone: "good", severity: "info", text: say `${f.subject}: every compared row agrees (${n}).`, ref: f.id });
            continue;
        }
        const off = f.rows.filter((r) => r.status !== "matched");
        const n = figure(`kp.${f.id}.off`, "Rows that did not match", off.length, "count", provOf(off));
        const what = f.counts.contradicted ? "disagree or lack a counterpart" : "lack a counterpart";
        points.push({ tone: "concern", severity: f.severity, text: concat([say `${f.subject}: ${n} rows ${what}.`, f.title]), ref: f.id });
    }
    for (const fl of record.flags) {
        if (RANK[fl.severity] < RANK.medium)
            continue;
        points.push({ tone: fl.category === "data" ? "note" : "concern", severity: fl.severity, text: concat([plain(`${fl.title}.`), fl.detail]), ref: fl.id });
    }
    // Concerns first, by severity; good news last.
    const order = (p) => (p.tone === "good" ? -1 : RANK[p.severity]);
    return points.sort((a, b) => order(b) - order(a)).slice(0, 12);
}
/* Scope: built from what ran, never from what could have. */
const STANDING_NOT_CHECKED = [
    { title: "Bank records", text: "No bank statements or open-banking data were provided. Orbe did not see any bank account, so no figure here is confirmed against money in the bank." },
    { title: "Costs and profit", text: "Orbe reads revenue only. Nothing in this report describes costs, margins or profit." },
    { title: "Tax", text: "Tax returns, VAT registration and the tax treatment of any income were not checked." },
    {
        title: "Contracts",
        text: "The contracts behind sponsorships, memberships and licences were not read. Uploaded invoices were taken as uploaded and checked only against payments Orbe could see.",
    },
    {
        title: "Ownership and rights",
        text: "Ownership of the channel, brand, domain, content and any music or footage rights was not checked beyond the creator's ability to log in to each connected account.",
    },
    { title: "Identity", text: "Orbe confirmed that whoever connected each account could log in to it. It did not check identity documents." },
    { title: "The future", text: "Nothing here forecasts future revenue or audience." },
];
function scope(record, audience) {
    const checked = [
        { title: "Provenance", text: "Every figure carries the source it came from, the account it was read from and the date it was read." },
        {
            title: "Freshness",
            text: `Each source was judged against its own window: ${record.provenance
                .filter((p) => p.source !== "orbe_rating" && p.source !== "declared")
                .map((p) => `${p.label}: ${p.freshness}`)
                .join("; ")}.`,
        },
        {
            title: "Consent",
            text: audience.kind === "buyer"
                ? "Connected data was used only under the creator's live consent to connect, and this report was shared under the creator's live consent to show their record to this buyer."
                : "Connected data was used only under the creator's live consent to connect.",
        },
        { title: "Double counting", text: "Where two sources describe the same money, only the more authoritative was counted and the other used to corroborate it." },
    ];
    for (const c of record.checks.filter((c) => c.performed))
        checked.push({ title: checkTitle(c), text: c.text });
    if (record.metrics.audience.length) {
        checked.push({
            title: "Audience signals",
            text: `Engagement against audience size, sudden audience changes and view spikes, from public and connected reads of ${record.metrics.audience.map((a) => `@${a.handle}`).join(", ")}.`,
        });
    }
    const notChecked = record.checks.filter((c) => !c.performed).map((c) => ({ title: checkTitle(c), text: c.text }));
    notChecked.push(...STANDING_NOT_CHECKED);
    if (!record.snapshots.some((s) => s.snapshot.provenance.basis === "connected")) {
        notChecked.push({ title: "Audience behind the login", text: "No audience data was read through the creator's own login, so audience figures are public counts only." });
    }
    if (!record.metrics.faceDependence) {
        notChecked.push({ title: "Face dependence", text: "Nobody declared how much the business depends on the creator appearing in it, and Orbe does not measure it." });
    }
    else {
        notChecked.push({ title: "Face dependence", text: `Declared by the ${record.metrics.faceDependence.declaredBy.replace("_", " ")}; Orbe did not measure it.` });
    }
    const leftOut = record.exclusions.map((e) => ({
        title: `${SOURCE_LABEL[e.source]}: ${e.reason.replace(/_/g, " ")}`,
        text: say `${figure(`scope.excl.${e.reason}.${e.source}`, "Items left out", e.lineIds.length + e.snapshotAccountIds.length, "count", [])} left out. ${e.detail}.`,
    }));
    const method = [
        plain(`Freshness windows: ${Object.entries(FRESHNESS_WINDOWS)
            .filter(([s]) => record.provenance.some((p) => p.source === s))
            .map(([s, w]) => `${SOURCE_LABEL[s]} fresh for ${w.freshDays} days, stale after ${w.staleAfterDays} (${w.why})`)
            .join("; ")}.`),
        plain("Tolerances, freshness windows and risk thresholds are Orbe's provisional judgements, published so a reader can disagree with them, and will be replaced by measured distributions as verified records accumulate."),
        plain(`Revenue is gross, in ${record.currency}, by the month it belongs to. The trailing twelve months run ${formatMonth(record.months[0])} to ${formatMonth(record.months[record.months.length - 1])}; the current month is left out until complete.`),
    ];
    return { checked, notChecked, leftOut, method };
}
const CHECK_TITLE = {
    stripe_charges_vs_payouts: "Stripe charges against payouts",
    adsense_vs_youtube_analytics: "AdSense against YouTube Analytics",
    substack_vs_stripe: "Substack against Stripe",
    invoices_vs_settlements: "Invoices against payments",
    audience_public_vs_connected: "Public audience against connected",
};
/** Only checks that run once per account name their subject; the rest run once per creator. */
const checkTitle = (c) => c.check === "stripe_charges_vs_payouts" || c.check === "audience_public_vs_connected"
    ? `${CHECK_TITLE[c.check]} (${c.subject.replace(/^Stripe /, "")})`
    : CHECK_TITLE[c.check];
/* Public redaction. */
const PUBLIC_CHECK_TEXT = {
    stripe_charges_vs_payouts: "Money charged through Stripe compared with money Stripe paid out, month by month.",
    adsense_vs_youtube_analytics: "YouTube's revenue estimates compared with what AdSense finalised, month by month.",
    substack_vs_stripe: "Substack's subscription figures compared with the payments behind them.",
    invoices_vs_settlements: "Uploaded invoices looked for among payments received.",
    audience_public_vs_connected: "The public audience count compared with the count behind the creator's login.",
};
/** Scope for a public page: which kinds of check ran, without account ids, months or counterparties. */
function publicScope(r) {
    const ran = [...new Set(r.findings.map((f) => f.check))];
    return {
        checked: [
            { title: "Provenance", text: "Every figure carries the source it came from and the date it was read." },
            ...ran.map((c) => ({ title: CHECK_TITLE[c], text: PUBLIC_CHECK_TEXT[c] })),
        ],
        notChecked: STANDING_NOT_CHECKED,
        leftOut: [],
        method: [],
    };
}
/** Revenue bands for public profiles, in minor units. Wide on purpose: a profile signals size, it does not disclose. */
export const PUBLIC_REVENUE_BANDS = [0, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 200_000_000];
export function bandFor(minor) {
    let low = 0;
    for (const b of PUBLIC_REVENUE_BANDS)
        if (minor >= b)
            low = b;
    const i = PUBLIC_REVENUE_BANDS.indexOf(low);
    return { low, high: PUBLIC_REVENUE_BANDS[i + 1] ?? null };
}
/**
  Keeps only what the creator chose to show. Never public, whatever the
  settings: counterparties, monthly detail, the rows behind checks, flags,
  retention, declared inputs, and the platform account ids in provenance.
*/
export function redact(report, settings) {
    const r = report;
    const ttm = r.revenue?.ttm ?? null;
    const headline = [];
    let revenue = null;
    if (ttm && settings.revenue !== "hidden") {
        const total = settings.revenue === "band" ? { ...ttm.total, unit: "money_band", band: bandFor(ttm.total.value), value: bandFor(ttm.total.value).low } : ttm.total;
        headline.push(total);
        revenue = {
            ttm: {
                total,
                byStream: settings.streams
                    ? ttm.byStream.map((s) => ({ stream: s.stream, share: s.share, total: settings.revenue === "exact" ? s.total : { ...s.total, unit: "money_band", band: bandFor(s.total.value), value: bandFor(s.total.value).low } }))
                    : [],
                byMonth: [],
            },
            growth: { ttmYoY: null, last3YoY: null, monthlyTrend: null, note: "" },
            seasonality: { method: "insufficient", index: [], peakToTrough: null, q4Share: null, variation: null },
        };
    }
    if (settings.sources && r.coverage)
        headline.push(r.coverage.connectedShare);
    if (settings.rating)
        headline.push(...r.rating.map((x) => x.figure));
    const out = {
        ...r,
        mode: "public",
        preparedFor: { kind: "public" },
        verdict: { ...r.verdict, summary: settings.sources ? r.verdict.summary : plain(r.verdict.label) },
        headline,
        keyPoints: [],
        // Provenance stays even when sources are not featured, so every public number still says where it came from.
        provenance: r.provenance.map((p) => ({ ...p, accountId: "withheld" })),
        coverage: null,
        revenue,
        concentration: null,
        platform: null,
        retention: [],
        audience: settings.audience
            ? r.audience.map((a) => ({ ...a, jumps: [], spikes: [], verdict: "insufficient", benchmark: null }))
            : [],
        cadence: [],
        faceDependence: null,
        findings: [],
        checkSummary: settings.checks ? r.checkSummary : summariseChecks([], []),
        flags: [],
        rating: settings.rating ? r.rating : [],
        scope: settings.checks ? publicScope(r) : { checked: [], notChecked: [], leftOut: [], method: [] },
        figures: [],
    };
    out.figures = indexFigures(out);
    return out;
}
