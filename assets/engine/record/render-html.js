/*
  The report as one print-ready HTML file: semantic markup, inline CSS, no
  scripts, no external requests. Calm and editorial, in the site's palette:
  paper, ink, and one orange used only for contradictions. No seals or badges:
  the verdict is a plain sentence, set in the type of the text around it.
  Every number is a link to its entry in the figure index, which names the
  sources behind it.
*/
import { formatFigure } from "./figures.js";
import { STREAM_LABEL } from "./ledger.js";
import { escapeHtml as esc, formatDate, formatMonth } from "./util.js";
const CSS = `
:root{--paper:#f3f0e8;--ink:#141311;--soft:#5f5a52;--line:rgba(20,19,17,.14);--faint:rgba(20,19,17,.05);--sun:#ff5a1f;
--serif:"Timeless Serif",Georgia,"Times New Roman",serif;--sans:"Timeless Sans","Helvetica Neue",Arial,sans-serif;--mono:"Paper Mono",ui-monospace,Menlo,Consolas,monospace}
*{box-sizing:border-box}
html{background:var(--paper);color:var(--ink)}
body{margin:0;font:400 15px/1.55 var(--sans);-webkit-font-smoothing:antialiased}
main{max-width:860px;margin:0 auto;padding:56px 28px 80px}
h1,h2,h3{font-family:var(--serif);font-weight:400;letter-spacing:-.02em;margin:0}
h1{font-size:56px;line-height:.95;letter-spacing:-.035em;margin:18px 0 0}
h2{font-size:30px;line-height:1.05;margin:0 0 18px}
h3{font-size:20px;line-height:1.2;margin:0 0 8px}
p{margin:0 0 12px;max-width:62ch}
section{border-top:1px solid var(--line);padding:36px 0 8px}
.eyebrow,.meta,th,.mono{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
.meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0}
.verdict{margin:22px 0 0}
.verdict strong{font-weight:600}
.headline{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;margin:32px 0 0;border-top:1px solid var(--ink)}
.headline div{padding:14px 14px 0 0}
.headline dt{font:400 11px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
.headline dd{margin:6px 0 0;font:400 32px/1 var(--serif);letter-spacing:-.03em}
a{color:inherit}
a.n{text-decoration:none;border-bottom:1px dotted var(--soft);font-variant-numeric:tabular-nums}
a.n:hover{border-bottom-color:var(--ink)}
nav ol{columns:2;margin:0;padding-left:18px;font-size:14px}
table{width:100%;border-collapse:collapse;margin:8px 0 22px;font-size:13px;font-variant-numeric:tabular-nums}
th{text-align:left;font-weight:400;padding:8px 8px 6px 0;border-bottom:1px solid var(--ink);vertical-align:bottom}
td{padding:7px 8px 7px 0;border-bottom:1px solid var(--line);vertical-align:top}
td.num,th.num{text-align:right}
tfoot td{border-top:1px solid var(--ink);border-bottom:0;font-weight:500}
.points{list-style:none;padding:0;margin:0}
.points li{display:grid;grid-template-columns:92px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.tag{font:400 11px/1.6 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
.tag.high,.st.contradicted{color:var(--sun)}
.st{font:400 11px/1.6 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.st.unmatched{color:var(--soft);font-style:italic}
article{margin:0 0 26px}
article .small,.small{font-size:13px;color:var(--soft)}
.grid td{text-align:center;font-family:var(--mono);font-size:12px}
.grid td:first-child{text-align:left;font-family:var(--sans)}
.legend{font-size:12px;color:var(--soft)}
dl.kv{display:grid;grid-template-columns:minmax(180px,1fr) 2fr;gap:6px 18px;margin:0 0 18px}
dl.kv dt{color:var(--soft)}
dl.kv dd{margin:0}
.scope{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.scope ul{padding-left:18px;margin:0}
.scope li{margin:0 0 10px}
footer{border-top:1px solid var(--ink);margin-top:40px;padding-top:16px;font-size:12px;color:var(--soft)}
@media (max-width:640px){main{padding:32px 16px 56px}h1{font-size:40px}.scope{grid-template-columns:1fr}nav ol{columns:1}.points li{grid-template-columns:1fr;gap:2px}table{display:block;overflow-x:auto}}
@page{size:A4;margin:16mm 14mm}
@media print{html{background:#fff}main{max-width:none;padding:0}section{break-inside:auto}article,tr,.headline,.points li{break-inside:avoid}h2,h3{break-after:avoid}thead{display:table-header-group}a.n{border-bottom:0}nav{display:none}}
`;
const n = (f) => `<a class="n" href="#fig-${esc(f.id)}" title="${esc(f.label)}">${esc(formatFigure(f))}</a>`;
const nOr = (f, missing = "not measured") => (f ? n(f) : `<span class="small">${missing}</span>`);
/** Text with its figures linked. The template is escaped first; placeholders survive escaping untouched. */
const txt = (t) => esc(t.t).replace(/\{(\d+)\}/g, (_, i) => n(t.f[Number(i)]));
const STATUS_LABEL = { matched: "Matched", unmatched: "Unmatched", contradicted: "Contradicted" };
const st = (s) => `<span class="st ${s}">${STATUS_LABEL[s]}</span>`;
const sev = (s) => `<span class="tag ${s}">${s}</span>`;
function table(head, rows, numeric = [], foot) {
    const cls = (i) => (numeric.includes(i) ? ` class="num"` : "");
    return `<table><thead><tr>${head.map((h, i) => `<th${cls(i)} scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows
        .map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join("")}</tr>`)
        .join("")}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td${cls(i)}>${c}</td>`).join("")}</tr></tfoot>` : ""}</table>`;
}
export function renderHtml(report) {
    const sections = [];
    const add = (id, title, html) => {
        if (html)
            sections.push({ id, title, html });
    };
    add("summary", "What matters", summary(report));
    add("revenue", "Revenue", revenue(report));
    add("checks", "Cross-checks", checks(report));
    add("concentration", "Concentration and platforms", concentration(report));
    add("retention", "Retention", retention(report));
    add("audience", "Audience and cadence", audience(report));
    add("coverage", "Coverage", coverage(report));
    add("flags", "Anomalies and risks", flags(report));
    add("scope", "Scope", scope(report));
    add("sources", "Sources", sources(report.provenance));
    add("figures", "Figure index", figureIndex(report));
    const prepared = report.preparedFor.kind === "buyer" ? `Prepared for buyer ${esc(report.preparedFor.buyerId)}` : report.preparedFor.kind === "creator" ? "Prepared for the creator" : "Public view";
    return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Orbe Verified: ${esc(report.creator.displayName)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<header>
<p class="meta"><span>Orbe Verified</span><span>${prepared}</span><span>${esc(formatDate(report.generatedAt))}</span><span>${esc(report.id)}</span></p>
<h1>${esc(report.creator.displayName)}</h1>
<p class="meta" style="margin-top:12px"><span>${esc(formatMonth(report.period.from))} to ${esc(formatMonth(report.period.to))}</span><span>${report.currency}</span><span>${esc(report.version)}</span></p>
<p class="verdict" data-status="${report.verdict.status}"><strong>${esc(report.verdict.label)}.</strong> ${txt(report.verdict.summary)}</p>
${report.headline.length ? `<dl class="headline">${report.headline.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${n(f)}</dd></div>`).join("")}</dl>` : ""}
</header>
<nav aria-label="Contents"><p class="eyebrow" style="margin:28px 0 8px">Contents</p><ol>${sections.map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`).join("")}</ol></nav>
${sections.map((s) => `<section id="${s.id}" aria-labelledby="${s.id}-h"><h2 id="${s.id}-h">${s.title}</h2>${s.html}</section>`).join("\n")}
<footer><p>${esc(report.disclaimer)}</p><p>Every number in this report links to the figure index, which names the sources and read dates behind it.</p></footer>
</main>
</body>
</html>
`;
}
function summary(r) {
    if (!r.keyPoints.length)
        return r.mode === "public" ? publicSummary(r) : "<p>No exceptions to report.</p>";
    return `<ol class="points">${r.keyPoints
        .map((p) => `<li><span class="tag ${p.severity}">${p.tone === "good" ? "agrees" : p.severity}</span><span>${txt(p.text)} <a class="small" href="#${esc(p.ref)}">Detail</a></span></li>`)
        .join("")}</ol>`;
}
function publicSummary(r) {
    const c = r.checkSummary;
    if (!c.performed.value)
        return "";
    return `<p>Cross-checks run between the creator's sources: ${n(c.performed)}. Rows matched: ${n(c.matched)}; without a counterpart: ${n(c.unmatched)}; contradicted: ${n(c.contradicted)}.</p>`;
}
function revenue(r) {
    const rev = r.revenue;
    if (!rev)
        return "";
    const t = rev.ttm;
    let html = `<p>Gross revenue by the month it belongs to, counted once where two sources describe the same money.</p>`;
    if (t.byStream.length) {
        html += table(["Stream", "Last twelve months", "Share"], t.byStream.map((s) => [STREAM_LABEL[s.stream], n(s.total), n(s.share)]), [1, 2], ["Total", n(t.total), ""]);
    }
    else
        html += `<dl class="kv"><dt>Last twelve months</dt><dd>${n(t.total)}</dd></dl>`;
    if (t.byMonth.length) {
        const streams = t.byStream.map((s) => s.stream);
        html += `<h3>By month</h3>${table(["Month", ...streams.map((s) => STREAM_LABEL[s]), "Total"], t.byMonth.map((m) => [formatMonth(m.month), ...streams.map((s) => (m.byStream[s] ? n(m.byStream[s]) : "")), n(m.total)]), streams.map((_, i) => i + 1).concat(streams.length + 1))}`;
    }
    const g = rev.growth;
    if (r.mode !== "public") {
        html += `<h3>Growth</h3><dl class="kv"><dt>Last twelve months against the twelve before</dt><dd>${nOr(g.ttmYoY)}</dd><dt>Last three months against a year earlier</dt><dd>${nOr(g.last3YoY)}</dd><dt>Underlying monthly trend</dt><dd>${nOr(g.monthlyTrend)}</dd></dl>${g.note ? `<p class="small">${esc(g.note)}</p>` : ""}`;
        const s = rev.seasonality;
        html += `<h3>Seasonality</h3>`;
        if (s.method === "insufficient")
            html += `<p class="small">Too few months with revenue to describe seasonality.</p>`;
        else {
            html += `<dl class="kv"><dt>Best month against weakest</dt><dd>${nOr(s.peakToTrough)}</dd><dt>Share earned October to December</dt><dd>${nOr(s.q4Share)}</dd><dt>Month-to-month variation</dt><dd>${nOr(s.variation)}</dd></dl>`;
            if (s.index.length) {
                html += `<p class="small">Seasonal index: each calendar month's revenue against its year's average, over every full year in the record. Above one is a stronger month.</p>${table(s.index.map((i) => formatMonth(`2000-${String(i.calendarMonth).padStart(2, "0")}-01`).slice(0, 3)), [s.index.map((i) => n(i.figure))], s.index.map((_, i) => i))}`;
            }
            else
                html += `<p class="small">A seasonal index needs two full years of records.</p>`;
        }
    }
    return html;
}
function findingHtml(f) {
    const sideNames = f.rows[0]?.sides.map((s) => s.label) ?? [];
    const hasDiff = f.rows.some((r) => r.difference);
    const rows = f.rows.map((r) => [
        esc(r.label),
        ...sideNames.map((_, i) => (r.sides[i] ? `${n(r.sides[i].figure)}${r.sides[i].label !== sideNames[i] ? ` <span class="small">${esc(r.sides[i].label)}</span>` : ""}` : "")),
        ...(hasDiff ? [r.difference ? n(r.difference) : ""] : []),
        st(r.status),
        r.note ? `<span class="small">${txt(r.note)}</span>` : "",
    ]);
    const head = ["", ...sideNames.map(esc), ...(hasDiff ? ["Difference"] : []), "Status", "Note"];
    return `<article id="${esc(f.id)}"><p class="eyebrow">${st(f.status)} &middot; ${sev(f.severity)} &middot; ${esc(f.subject)}</p><h3>${txt(f.title)}</h3><p>${txt(f.detail)}</p><p class="small">Tolerance: ${txt(f.tolerance)}</p>${table(head, rows, sideNames.map((_, i) => i + 1).concat(hasDiff ? [sideNames.length + 1] : []))}</article>`;
}
function checks(r) {
    if (r.mode === "public")
        return "";
    if (!r.findings.length)
        return `<p>No two sources described the same money or audience, so no cross-check could run. See Scope.</p>`;
    return r.findings.map(findingHtml).join("");
}
function concentration(r) {
    const c = r.concentration;
    const p = r.platform;
    if (!c || !p)
        return "";
    let html = `<dl class="kv"><dt>Largest payer</dt><dd>${c.top ? `${esc(c.top.name)}, ${n(c.top.share)}` : "none named"}</dd><dt>Three largest payers</dt><dd>${n(c.top3Share)}</dd><dt>Herfindahl index of payers (0 to 10,000)</dt><dd>${n(c.hhi)}</dd><dt>From many small payers (ads, subscribers, buyers)</dt><dd>${n(c.dispersedShare)}</dd></dl>`;
    if (c.counterparties.length)
        html += table(["Payer", "Last twelve months", "Share"], c.counterparties.map((x) => [esc(x.name), n(x.total), n(x.share)]), [1, 2]);
    html += `<h3>Platforms</h3><p class="small">Who pays, and whose audience the money depends on.${p.dependent ? " The business depends on one platform." : ""}</p>`;
    html += table(["Audience the money rests on", "Last twelve months", "Share"], p.byAudience.map((x) => [esc(x.name), n(x.total), n(x.share)]), [1, 2]);
    html += table(["Paid through", "Last twelve months", "Share"], p.byPayer.map((x) => [esc(x.name), n(x.total), n(x.share)]), [1, 2]);
    return html;
}
function retention(r) {
    if (!r.retention.length)
        return "";
    return r.retention
        .map((x) => `<h3>${esc(x.subject)}</h3><dl class="kv"><dt>Average monthly churn</dt><dd>${nOr(x.monthlyChurn)}</dd><dt>Retained over the year</dt><dd>${nOr(x.retention12)}</dd><dt>Net revenue retention</dt><dd>${nOr(x.netRevenueRetention)}</dd></dl><p class="small">${esc(x.note)}</p>`)
        .join("");
}
const VERDICT_LABEL = { consistent: "Consistent", watch: "Worth a question", suspicious: "Needs an answer", insufficient: "Too little data" };
function audience(r) {
    if (!r.audience.length && !r.cadence.length && !r.faceDependence)
        return "";
    let html = "";
    for (const a of r.audience) {
        html += `<h3>@${esc(a.handle)}</h3><dl class="kv"><dt>Audience</dt><dd>${n(a.audience)}</dd><dt>Median views per work</dt><dd>${nOr(a.medianViews)}</dd><dt>Median views as a share of audience</dt><dd>${nOr(a.viewsPerFollower)}</dd><dt>Engagement per view</dt><dd>${nOr(a.engagementRate)}</dd>${r.mode === "public" ? "" : `<dt>Reading</dt><dd>${VERDICT_LABEL[a.verdict]}${a.benchmark ? ` <span class="small">against ${esc(a.benchmark)}</span>` : ""}</dd>`}</dl>`;
        if (a.jumps.length)
            html += table(["Audience change", "Before", "After", "Change", "Explained by"], a.jumps.map((j) => [`${esc(formatDate(j.from))} to ${esc(formatDate(j.to))}`, n(j.before), n(j.after), n(j.gain), j.explainedBy ? esc(j.explainedBy) : sev(j.severity)]), [1, 2, 3]);
        if (a.spikes.length)
            html += table(["Work with views but little engagement", "Views", "Engagement", "Usual engagement"], a.spikes.map((s) => [esc(s.title), n(s.views), n(s.engagementRate), n(s.medianEngagementRate)]), [1, 2, 3]);
    }
    if (r.cadence.length) {
        html += `<h3>Cadence</h3>${table(["Account", "Works in the last year", "Usual gap", "Longest gap", "Since the last", "Recent pace", "Risk"], r.cadence.map((c) => [`@${esc(c.handle)}`, n(c.works12m), nOr(c.medianGapDays, ""), nOr(c.longestGapDays, ""), nOr(c.daysSinceLast, ""), nOr(c.recentVsPrior, ""), esc(c.risk)]), [1, 2, 3, 4, 5])}`;
    }
    if (r.faceDependence) {
        const f = r.faceDependence;
        html += `<h3>Face dependence</h3><p>${esc(f.level === "central" ? "Central: the creator is the product." : f.level === "partial" ? "Partial: the creator's presence matters." : "None: the work stands without the creator on camera.")} <span class="small">Declared by the ${esc(f.declaredBy.replace("_", " "))} on ${esc(formatDate(f.declaredAt))}; not measured by Orbe.${f.note ? ` ${esc(f.note)}` : ""}</span></p>`;
    }
    return html;
}
const MARK = { connected: "&#9679;", uploaded: "&#9680;", public: "&#9675;", no_record: "&middot;", gap: "&times;" };
function coverage(r) {
    const c = r.coverage;
    if (!c)
        return "";
    let html = `<dl class="kv"><dt>Read from connected sources</dt><dd>${n(c.connectedShare)}</dd><dt>Agreed by a second source</dt><dd>${n(c.corroboratedShare)}</dd><dt>Resting on uploads alone</dt><dd>${n(c.uploadedShare)}</dd></dl>`;
    if (c.streams.length) {
        html += `<div class="grid">${table(["Stream", ...c.months.map((m) => formatMonth(m).slice(0, 3))], c.streams.map((s) => [
            STREAM_LABEL[s],
            ...c.months.map((m) => {
                const cell = c.cells.find((x) => x.stream === s && x.month === m);
                return `<span title="${esc(`${cell.status.replace("_", " ")}${cell.sources.length ? `: ${cell.sources.join(", ")}` : ""}`)}">${MARK[cell.status]}${cell.corroborated ? "+" : ""}</span>`;
            }),
        ]))}</div><p class="legend">&#9679; connected source &nbsp; &#9680; uploaded &nbsp; &#9675; public &nbsp; &middot; no record &nbsp; &times; missing from a monthly stream &nbsp; + agreed by a second source</p>`;
    }
    if (c.bySource.length) {
        html += table(["Source", "From", "To", "Months in the last year"], c.bySource.map((b) => [`<a href="#prov-${esc(b.provId)}">${esc(b.provId)}</a> ${esc(r.provenance.find((p) => p.id === b.provId)?.label ?? b.source)}`, formatMonth(b.from), formatMonth(b.to), `<a class="n" href="#prov-${esc(b.provId)}">${b.monthsInPeriod}</a>`]), [3]);
    }
    return html;
}
function flags(r) {
    if (!r.flags.length)
        return r.mode === "public" ? "" : "<p>None found.</p>";
    const order = ["high", "medium", "low", "info"];
    const sorted = [...r.flags].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    return `<ol class="points">${sorted.map((f) => `<li id="${esc(f.id)}"><span class="tag ${f.severity}">${f.severity} ${esc(f.category)}</span><span><strong>${esc(f.title)}.</strong> ${txt(f.detail)}</span></li>`).join("")}</ol>`;
}
function scope(r) {
    const s = r.scope;
    if (!s.checked.length && !s.notChecked.length)
        return "";
    const list = (items) => `<ul>${items.map((i) => `<li><strong>${esc(i.title)}.</strong> ${esc(i.text)}</li>`).join("")}</ul>`;
    let html = `<div class="scope"><div><h3>Checked</h3>${list(s.checked)}</div><div><h3>Not checked</h3>${list(s.notChecked)}</div></div>`;
    if (s.leftOut.length)
        html += `<h3>Left out</h3><ul>${s.leftOut.map((l) => `<li><strong>${esc(l.title)}.</strong> ${txt(l.text)}</li>`).join("")}</ul>`;
    if (s.method.length)
        html += `<h3>Method</h3>${s.method.map((m) => `<p class="small">${txt(m)}</p>`).join("")}`;
    return html;
}
function sources(prov) {
    if (!prov.length)
        return "";
    return `<p class="small">Every read behind this report. Freshness is judged against each source's own window (see Method).</p>${table(["Ref", "Source", "Account", "First read", "Last read", "Freshness", "Items"], prov.map((p) => [
        `<span id="prov-${esc(p.id)}" class="mono">${esc(p.id)}</span>`,
        esc(p.label),
        `<span class="mono">${esc(p.accountId)}</span>`,
        esc(formatDate(p.firstCheckedAt)),
        esc(formatDate(p.lastCheckedAt)),
        esc(p.freshness),
        String(p.lineCount + p.snapshotCount),
    ]), [6])}`;
}
function figureIndex(r) {
    return `<p class="small">Every number above, with the reads it was computed from. Figures with no source are Orbe's published method constants, or counts of things absent.</p>${table(["Figure", "Value", "Basis", "Sources"], r.figures.map((f) => [
        `<span id="fig-${esc(f.id)}">${esc(f.label)}</span>${f.note ? `<br><span class="small">${esc(f.note)}</span>` : ""}`,
        esc(formatFigure(f)),
        esc(f.basis),
        f.prov.length ? f.prov.map((p) => `<a href="#prov-${esc(p)}">${esc(p)}</a>`).join(" ") : `<span class="small">method</span>`,
    ]), [1])}`;
}
