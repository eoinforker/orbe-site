/*
  The report as Markdown, for pasting into a data room, an email or a deal
  memo. Same content and order as the HTML; every number is a link to its
  entry in the figure index.
*/
import { formatFigure } from "./figures.js";
import { STREAM_LABEL } from "./ledger.js";
import { formatDate, formatMonth } from "./util.js";
/** Markdown table cells cannot hold pipes or newlines. */
const cell = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const n = (f) => `[${formatFigure(f)}](#fig-${f.id})`;
const nOr = (f, missing = "not measured") => (f ? n(f) : `_${missing}_`);
const txt = (t) => cell(t.t).replace(/\{(\d+)\}/g, (_, i) => n(t.f[Number(i)]));
function table(head, rows, numeric = []) {
    const align = head.map((_, i) => (numeric.includes(i) ? "---:" : "---"));
    return [`| ${head.map(cell).join(" | ")} |`, `| ${align.join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n") + "\n";
}
export function renderMarkdown(r) {
    const out = [];
    const who = r.preparedFor.kind === "buyer" ? `prepared for buyer ${r.preparedFor.buyerId}` : r.preparedFor.kind === "creator" ? "prepared for the creator" : "public view";
    out.push(`# Orbe Verified: ${r.creator.displayName}`);
    out.push(`${formatMonth(r.period.from)} to ${formatMonth(r.period.to)}, ${r.currency}. Generated ${formatDate(r.generatedAt)}, ${who}. Report ${r.id}, ${r.version}.`);
    out.push(`**${r.verdict.label}.** ${txt(r.verdict.summary)}`);
    if (r.headline.length)
        out.push(r.headline.map((f) => `- ${f.label}: **${n(f)}**`).join("\n"));
    if (r.keyPoints.length) {
        out.push(`## What matters`);
        out.push(r.keyPoints.map((p) => `- **${p.tone === "good" ? "Agrees" : p.severity}**: ${txt(p.text)} ([detail](#${p.ref}))`).join("\n"));
    }
    else if (r.mode === "public" && r.checkSummary.performed.value) {
        const c = r.checkSummary;
        out.push(`## Checks`, `Cross-checks run: ${n(c.performed)}. Rows matched: ${n(c.matched)}; without a counterpart: ${n(c.unmatched)}; contradicted: ${n(c.contradicted)}.`);
    }
    if (r.revenue) {
        const t = r.revenue.ttm;
        out.push(`## Revenue`);
        if (t.byStream.length)
            out.push(table(["Stream", "Last twelve months", "Share"], [...t.byStream.map((s) => [STREAM_LABEL[s.stream], n(s.total), n(s.share)]), ["**Total**", `**${n(t.total)}**`, ""]], [1, 2]));
        else
            out.push(`Last twelve months: ${n(t.total)}`);
        if (t.byMonth.length) {
            const streams = t.byStream.map((s) => s.stream);
            out.push(`### By month`);
            out.push(table(["Month", ...streams.map((s) => STREAM_LABEL[s]), "Total"], t.byMonth.map((m) => [formatMonth(m.month), ...streams.map((s) => (m.byStream[s] ? n(m.byStream[s]) : "")), n(m.total)]), streams.map((_, i) => i + 1).concat(streams.length + 1)));
        }
        if (r.mode !== "public") {
            const g = r.revenue.growth;
            out.push(`### Growth`);
            out.push([
                `- Last twelve months against the twelve before: ${nOr(g.ttmYoY)}`,
                `- Last three months against a year earlier: ${nOr(g.last3YoY)}`,
                `- Underlying monthly trend: ${nOr(g.monthlyTrend)}`,
                ...(g.note ? [`- _${g.note}_`] : []),
            ].join("\n"));
            const s = r.revenue.seasonality;
            out.push(`### Seasonality`);
            if (s.method === "insufficient")
                out.push("_Too few months with revenue to describe seasonality._");
            else {
                out.push(`- Best month against weakest: ${nOr(s.peakToTrough)}\n- Share earned October to December: ${nOr(s.q4Share)}\n- Month-to-month variation: ${nOr(s.variation)}`);
                if (s.index.length)
                    out.push(table(s.index.map((i) => formatMonth(`2000-${String(i.calendarMonth).padStart(2, "0")}-01`).slice(0, 3)), [s.index.map((i) => n(i.figure))], s.index.map((_, i) => i)));
            }
        }
    }
    if (r.findings.length) {
        out.push(`## Cross-checks`);
        for (const f of r.findings)
            out.push(finding(f));
    }
    if (r.concentration && r.platform) {
        const c = r.concentration;
        out.push(`## Concentration and platforms`);
        out.push(`- Largest payer: ${c.top ? `${c.top.name}, ${n(c.top.share)}` : "none named"}\n- Three largest payers: ${n(c.top3Share)}\n- Herfindahl index of payers (0 to 10,000): ${n(c.hhi)}\n- From many small payers: ${n(c.dispersedShare)}`);
        if (c.counterparties.length)
            out.push(table(["Payer", "Last twelve months", "Share"], c.counterparties.map((x) => [cell(x.name), n(x.total), n(x.share)]), [1, 2]));
        out.push(table(["Audience the money rests on", "Last twelve months", "Share"], r.platform.byAudience.map((x) => [cell(x.name), n(x.total), n(x.share)]), [1, 2]));
        out.push(table(["Paid through", "Last twelve months", "Share"], r.platform.byPayer.map((x) => [cell(x.name), n(x.total), n(x.share)]), [1, 2]));
    }
    if (r.retention.length) {
        out.push(`## Retention`);
        for (const x of r.retention)
            out.push(`### ${x.subject}\n- Average monthly churn: ${nOr(x.monthlyChurn)}\n- Retained over the year: ${nOr(x.retention12)}\n- Net revenue retention: ${nOr(x.netRevenueRetention)}\n\n_${x.note}_`);
    }
    if (r.audience.length || r.cadence.length || r.faceDependence) {
        out.push(`## Audience and cadence`);
        for (const a of r.audience) {
            out.push(`### @${a.handle}\n- Audience: ${n(a.audience)}\n- Median views per work: ${nOr(a.medianViews)}\n- Median views as a share of audience: ${nOr(a.viewsPerFollower)}\n- Engagement per view: ${nOr(a.engagementRate)}${r.mode === "public" ? "" : `\n- Reading: ${a.verdict}`}`);
            if (a.jumps.length)
                out.push(table(["Audience change", "Before", "After", "Change", "Explained by"], a.jumps.map((j) => [`${formatDate(j.from)} to ${formatDate(j.to)}`, n(j.before), n(j.after), n(j.gain), j.explainedBy ? cell(j.explainedBy) : j.severity]), [1, 2, 3]));
            if (a.spikes.length)
                out.push(table(["Work", "Views", "Engagement", "Usual engagement"], a.spikes.map((s) => [cell(s.title), n(s.views), n(s.engagementRate), n(s.medianEngagementRate)]), [1, 2, 3]));
        }
        if (r.cadence.length)
            out.push(table(["Account", "Works in the last year", "Usual gap", "Longest gap", "Since the last", "Recent pace", "Risk"], r.cadence.map((c) => [`@${c.handle}`, n(c.works12m), nOr(c.medianGapDays, ""), nOr(c.longestGapDays, ""), nOr(c.daysSinceLast, ""), nOr(c.recentVsPrior, ""), c.risk]), [1, 2, 3, 4, 5]));
        if (r.faceDependence)
            out.push(`Face dependence: **${r.faceDependence.level}**, declared by the ${r.faceDependence.declaredBy.replace("_", " ")} on ${formatDate(r.faceDependence.declaredAt)}; not measured by Orbe.${r.faceDependence.note ? ` ${r.faceDependence.note}` : ""}`);
    }
    if (r.coverage) {
        const c = r.coverage;
        out.push(`## Coverage`);
        out.push(`- Read from connected sources: ${n(c.connectedShare)}\n- Agreed by a second source: ${n(c.corroboratedShare)}\n- Resting on uploads alone: ${n(c.uploadedShare)}`);
        const mark = { connected: "C", uploaded: "U", public: "P", no_record: ".", gap: "x" };
        if (c.streams.length) {
            out.push(table(["Stream", ...c.months.map((m) => formatMonth(m).slice(0, 3))], c.streams.map((s) => [STREAM_LABEL[s], ...c.months.map((m) => {
                    const x = c.cells.find((y) => y.stream === s && y.month === m);
                    return `${mark[x.status]}${x.corroborated ? "+" : ""}`;
                })])) + "\n_C connected, U uploaded, P public, . no record, x missing from a monthly stream, + agreed by a second source._");
        }
    }
    if (r.flags.length) {
        out.push(`## Anomalies and risks`);
        const order = ["high", "medium", "low", "info"];
        out.push([...r.flags].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity)).map((f) => `- <a id="${f.id}"></a>**${f.severity} ${f.category}: ${f.title}.** ${txt(f.detail)}`).join("\n"));
    }
    if (r.scope.checked.length || r.scope.notChecked.length) {
        out.push(`## Scope`);
        out.push(`### Checked\n${r.scope.checked.map((i) => `- **${i.title}.** ${i.text}`).join("\n")}`);
        out.push(`### Not checked\n${r.scope.notChecked.map((i) => `- **${i.title}.** ${i.text}`).join("\n")}`);
        if (r.scope.leftOut.length)
            out.push(`### Left out\n${r.scope.leftOut.map((l) => `- **${l.title}.** ${txt(l.text)}`).join("\n")}`);
        if (r.scope.method.length)
            out.push(`### Method\n${r.scope.method.map((m) => txt(m)).join("\n\n")}`);
    }
    if (r.provenance.length) {
        out.push(`## Sources`);
        out.push(table(["Ref", "Source", "Account", "First read", "Last read", "Freshness", "Items"], r.provenance.map((p) => [`<a id="prov-${p.id}"></a>${p.id}`, cell(p.label), `\`${p.accountId}\``, formatDate(p.firstCheckedAt), formatDate(p.lastCheckedAt), p.freshness, String(p.lineCount + p.snapshotCount)]), [6]));
    }
    out.push(`## Figure index`);
    out.push(table(["Figure", "Value", "Basis", "Sources"], r.figures.map((f) => [`<a id="fig-${f.id}"></a>${cell(f.label)}${f.note ? ` _(${cell(f.note)})_` : ""}`, formatFigure(f), f.basis, f.prov.length ? f.prov.map((p) => `[${p}](#prov-${p})`).join(" ") : "_method_"]), [1]));
    out.push(`---\n\n_${r.disclaimer}_`);
    return out.join("\n\n") + "\n";
}
function finding(f) {
    const sides = f.rows[0]?.sides.map((s) => s.label) ?? [];
    const hasDiff = f.rows.some((r) => r.difference);
    const rows = f.rows.map((r) => [
        cell(r.label),
        ...sides.map((_, i) => (r.sides[i] ? n(r.sides[i].figure) : "")),
        ...(hasDiff ? [r.difference ? n(r.difference) : ""] : []),
        r.status,
        r.note ? txt(r.note) : "",
    ]);
    return [
        `### <a id="${f.id}"></a>${txt(f.title)}`,
        `**${f.status}**, severity ${f.severity}. ${txt(f.detail)}`,
        `_Tolerance: ${txt(f.tolerance)}_`,
        table(["", ...sides, ...(hasDiff ? ["Difference"] : []), "Status", "Note"], rows, sides.map((_, i) => i + 1).concat(hasDiff ? [sides.length + 1] : [])),
    ].join("\n\n");
}
