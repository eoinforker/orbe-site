/*
  Anomalies (things in the data that look wrong), risks (things that are true
  and matter to a buyer) and data notes (what was left out and why), each with
  a severity. Cross-check findings carry their own severity and are not
  repeated here.
*/
import { derived, figure, plain, say } from "./figures.js";
import { counted, STREAM_LABEL } from "./ledger.js";
import { SOURCE_LABEL } from "./sources.js";
import { formatMonth, median, monthOf, slug, sum } from "./util.js";
/**
  Provisional thresholds: Orbe's starting judgement of what a buyer would want
  raised, to be tuned against what buyers actually ask about in the first
  reports, and against measured distributions once benchmarks exist.
*/
export const RISK_RULES = {
    topCounterpartyHigh: 0.5,
    topCounterpartyMedium: 0.3,
    uploadedShareMedium: 0.3,
    declineTtm: -0.2,
    declineLast3: -0.3,
    monthlyChurnMedium: 0.1,
    monthSpikeMultiple: 3,
};
const EXCLUSION_SEVERITY = {
    no_connect_consent: "medium",
    youtube_terms_expired: "medium",
    foreign_account: "high",
    duplicate_id: "low",
    no_fx_rate: "low",
    incomplete_month: "info",
    outside_history: "info",
};
const EXCLUSION_TITLE = {
    no_connect_consent: "Connected data left out: no live consent to connect",
    youtube_terms_expired: "YouTube data left out: older than 30 days",
    foreign_account: "Data from another creator's account left out",
    duplicate_id: "Repeated lines left out",
    no_fx_rate: "Lines in another currency left out",
    incomplete_month: "The current month is left out",
    outside_history: "Lines older than three years left out",
};
export function buildFlags(prep, coverage, metrics) {
    const flags = [];
    const add = (kind, category, severity, title, detail, lineIds = []) => {
        flags.push({ id: `flag-${slug(kind)}-${flags.filter((f) => f.kind === kind).length + 1}`, kind, category, severity, title, detail, lineIds });
    };
    const cur = prep.currency;
    const lines = counted(prep.lines);
    for (const e of prep.exclusions) {
        const n = e.lineIds.length + e.snapshotAccountIds.length;
        const count = figure(`excl.${e.reason}.${e.source}`, `Items left out, ${SOURCE_LABEL[e.source]}`, n, "count", [], { note: "Count of items the record did not use" });
        add(e.reason, "data", EXCLUSION_SEVERITY[e.reason], `${EXCLUSION_TITLE[e.reason]} (${SOURCE_LABEL[e.source]})`, say `Left out: ${count}. ${e.detail}.`, e.lineIds);
    }
    for (const p of prep.provenance) {
        if (p.freshness !== "stale" || p.source === "orbe_rating" || p.source === "declared")
            continue;
        const age = figure(`stale.${p.id}`, `Days since ${p.label} was read`, p.ageDays, "days", [p.id]);
        add("stale_source", "data", "medium", `${SOURCE_LABEL[p.source]} is stale`, say `Last read ${age} ago. Its figures may have changed since.`);
    }
    // Lines that look like the same money entered twice under different ids.
    const dupes = new Map();
    for (const l of lines) {
        const k = [l.source, l.line.provenance.accountId, l.line.accountId, l.month, l.line.stream, l.line.counterparty ?? "", l.line.gross.amount, l.line.gross.currency].join("|");
        dupes.set(k, [...(dupes.get(k) ?? []), l.line.id]);
    }
    for (const ids of dupes.values()) {
        if (ids.length < 2)
            continue;
        const l = lines.find((x) => x.line.id === ids[0]);
        const amt = figure(`dupe.${slug(ids[0])}`, `Repeated amount, ${formatMonth(l.month)}`, l.amount, "money", [l.provId], { currency: cur, basis: l.basis });
        add("possible_duplicate", "anomaly", "medium", `Possible double entry: ${SOURCE_LABEL[l.source]}, ${formatMonth(l.month)}`, say `${figure(`dupe.${slug(ids[0])}.n`, "Identical lines", ids.length, "count", [l.provId])} identical lines of ${amt} (${STREAM_LABEL[l.line.stream]}${l.line.counterparty ? `, ${l.line.counterparty}` : ""}). All are counted; ask whether they are separate payments.`, ids);
    }
    // Money dated before the account it belongs to existed.
    for (const a of prep.accounts) {
        if (!a.createdAt)
            continue;
        const created = monthOf(a.createdAt);
        // Any line, counted or not: an estimate dated before the account existed is as wrong as a payment.
        const early = prep.lines.filter((l) => l.line.accountId === a.id && l.month < created);
        if (!early.length)
            continue;
        const amt = figure(`early.${slug(a.id)}`, `Revenue dated before @${a.handle} existed`, sum(early.map((l) => l.amount)), "money", early.map((l) => l.provId), { currency: cur });
        add("before_account", "anomaly", "high", `Revenue dated before @${a.handle} was created`, say `${amt} is dated before the account was created. Either the dates or the account attribution are wrong.`, early.map((l) => l.line.id));
    }
    for (const stream of coverage.streams) {
        const gaps = coverage.cells.filter((c) => c.stream === stream && c.status === "gap");
        if (!gaps.length)
            continue;
        const n = figure(`gap.${stream}`, `Months missing, ${STREAM_LABEL[stream]}`, gaps.length, "count", [], { note: "Months inside the stream's span with no line from any source" });
        add("data_gap", "anomaly", "medium", `${STREAM_LABEL[stream]}: months missing`, say `${n} with no record inside a stream that otherwise arrives every month (${gaps.map((g) => formatMonth(g.month)).join(", ")}). Either the source was not read for those months or the income stopped.`);
    }
    const rows = metrics.ttm.byMonth;
    const med = median(rows.map((r) => r.total.value).filter((v) => v > 0));
    for (const r of rows) {
        if (r.total.value < 0)
            add("negative_month", "anomaly", "medium", `${formatMonth(r.month)} is negative`, say `Revenue of ${r.total}: refunds or reversals exceeded income.`);
        if (med > 0 && r.total.value > RISK_RULES.monthSpikeMultiple * med) {
            const sponsor = r.byStream.sponsorship?.value ?? 0;
            const lumpy = sponsor >= r.total.value / 2;
            const ratio = derived(`spike.${r.month.slice(0, 7)}`, `${formatMonth(r.month)} against a typical month`, r.total.value / med, "multiple", [r.total, metrics.ttm.total]);
            add("revenue_spike", "anomaly", lumpy ? "low" : "medium", `${formatMonth(r.month)} is far above a typical month`, lumpy ? say `${ratio} a typical month, mostly sponsorship, which is lumpy by nature.` : say `${ratio} a typical month, not explained by sponsorship. Ask what happened.`);
        }
    }
    const c = metrics.concentration;
    if (c.top && c.top.share.value > RISK_RULES.topCounterpartyMedium) {
        add("concentration", "risk", c.top.share.value > RISK_RULES.topCounterpartyHigh ? "high" : "medium", `One payer is a large share of revenue: ${c.top.name}`, say `${c.top.share} of the last year's revenue came from ${c.top.name}. Herfindahl index ${c.hhi}.`);
    }
    if (metrics.platform.dependent && metrics.platform.largestAudienceShare) {
        const top = metrics.platform.byAudience[0];
        add("platform_dependence", "risk", "medium", `Dependent on one platform: ${top.name}`, say `${metrics.platform.largestAudienceShare} of revenue rests on the ${top.name} audience. A change in its rules or reach moves the whole business.`);
    }
    if (coverage.uploadedShare.value > RISK_RULES.uploadedShareMedium) {
        add("uploaded_reliance", "risk", "medium", "Much of the revenue rests on uploads alone", say `${coverage.uploadedShare} of the last year's revenue comes from uploaded documents that no connected source corroborates.`);
    }
    const g = metrics.growth;
    if (g.ttmYoY && g.ttmYoY.value < RISK_RULES.declineTtm)
        add("decline", "risk", "medium", "Revenue is falling year on year", say `The last twelve months are ${g.ttmYoY} on the twelve before.`);
    else if (g.last3YoY && g.last3YoY.value < RISK_RULES.declineLast3)
        add("decline", "risk", "medium", "The last three months are well down on a year earlier", say `${g.last3YoY} against the same months a year earlier.`);
    for (const r of metrics.retention) {
        if (r.monthlyChurn && r.monthlyChurn.value > RISK_RULES.monthlyChurnMedium) {
            add("churn", "risk", "medium", `High churn: ${r.subject}`, say `An average of ${r.monthlyChurn} of paying members leave each month.`);
        }
    }
    for (const a of metrics.audience) {
        for (const j of a.jumps) {
            if (j.severity === "info")
                continue;
            const drop = j.gain.value < 0;
            add(drop ? "audience_drop" : "audience_jump", "anomaly", j.severity, drop ? `@${a.handle} lost audience suddenly` : `@${a.handle} gained audience suddenly, with no breakout work to explain it`, drop
                ? say `From ${j.before} to ${j.after} between ${j.from.slice(0, 10)} and ${j.to.slice(0, 10)}. Platforms remove inactive and fake accounts in purges like this.`
                : say `From ${j.before} to ${j.after} between ${j.from.slice(0, 10)} and ${j.to.slice(0, 10)}: a gain of ${j.gain}. Bought followers arrive like this; so do mentions elsewhere. Ask.`);
        }
        for (const s of a.spikes) {
            add("view_spike", "anomaly", "medium", `Views without engagement on @${a.handle}: "${s.title}"`, say `${s.views} views at an engagement rate of ${s.engagementRate}, against ${s.medianEngagementRate} usually. Paid promotion produces this honestly; bought views produce it dishonestly. Ask which.`);
        }
        if (a.verdict === "watch" && !a.jumps.length && !a.spikes.length && (a.viewsPerFollower || a.engagementRate)) {
            add("thin_engagement", "risk", "low", `Thin views or engagement for the size of @${a.handle}`, a.viewsPerFollower && a.engagementRate
                ? say `Median views are ${a.viewsPerFollower} of the audience, with ${a.engagementRate} engagement per view. Against: ${a.benchmark ?? "provisional floors"}.`
                : plain(`Below the floor for its kind. Against: ${a.benchmark ?? "provisional floors"}.`));
        }
    }
    for (const cd of metrics.cadence) {
        if (cd.risk !== "high" && cd.risk !== "medium")
            continue;
        add("cadence", "risk", cd.risk === "high" ? "medium" : "low", `Publishing has slowed or stopped on @${cd.handle}`, cd.daysSinceLast && cd.medianGapDays
            ? say `${cd.daysSinceLast} since the last work, against a usual gap of ${cd.medianGapDays}.${cd.recentVsPrior ? " Pace over the last three months against the nine before: " : ""}${cd.recentVsPrior ?? ""}`
            : plain("Publishing has slowed."));
    }
    const face = metrics.faceDependence;
    if (face && face.level !== "none") {
        add("face_dependence", "risk", face.level === "central" ? "medium" : "low", face.level === "central" ? "The creator is the product" : "The creator's presence matters to the work", plain(`Declared by the ${face.declaredBy.replace("_", " ")}, not measured by Orbe.${face.note ? ` ${face.note}` : ""} A sale needs the creator to stay on, or a plan for a new face.`));
    }
    return flags;
}
