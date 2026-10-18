/*
  Decides which lines count towards revenue, so that money two sources both
  describe is counted once, and maps what each month and stream rests on.
*/
import { derived, moneyFigure } from "./figures.js";
import { OVERLAPS } from "./sources.js";
/** Streams that should arrive every month once they start, so a missing month is a gap rather than a quiet month. */
export const CONTINUOUS_STREAMS = ["ads", "subscriptions", "memberships"];
export const STREAM_ORDER = ["ads", "sponsorship", "subscriptions", "memberships", "products", "licensing", "tips", "other"];
export const STREAM_LABEL = {
    ads: "Ads",
    sponsorship: "Sponsorship",
    subscriptions: "Subscriptions",
    memberships: "Memberships",
    products: "Products",
    licensing: "Licensing",
    tips: "Tips",
    other: "Other",
};
export function assignRoles(prep, supersede) {
    for (const l of prep.lines) {
        if (l.measure === "paid_out")
            l.role = "settlement";
        else if (supersede.has(l.line.id)) {
            l.role = "superseded";
            l.supersededBy = supersede.get(l.line.id);
        }
        else
            l.role = "counted";
    }
    for (const o of OVERLAPS) {
        const groups = new Map();
        for (const l of prep.lines) {
            if (l.role !== "counted" || !o.sources.includes(l.source) || !o.streams.includes(l.line.stream))
                continue;
            const k = `${o.sameAccount ? l.line.accountId : "*"}|${l.line.stream}|${l.month}`;
            groups.set(k, [...(groups.get(k) ?? []), l]);
        }
        for (const g of groups.values()) {
            const winner = o.sources.find((s) => g.some((l) => l.source === s));
            for (const l of g)
                if (l.source !== winner)
                    l.role = "corroborating";
        }
    }
}
export const counted = (lines) => lines.filter((l) => l.role === "counted");
export function buildCoverage(prep) {
    const months = prep.months;
    const inTtm = new Set(months);
    const revenueLines = prep.lines.filter((l) => l.role === "counted" || l.role === "corroborating");
    const streams = STREAM_ORDER.filter((s) => revenueLines.some((l) => l.line.stream === s && inTtm.has(l.month)));
    const cells = [];
    for (const stream of streams) {
        const own = revenueLines.filter((l) => l.line.stream === stream);
        const span = own.map((l) => l.month).sort();
        const first = span[0];
        const last = span[span.length - 1];
        for (const month of months) {
            const here = own.filter((l) => l.month === month);
            let status;
            if (here.some((l) => l.basis === "connected"))
                status = "connected";
            else if (here.some((l) => l.basis === "uploaded"))
                status = "uploaded";
            else if (here.length)
                status = "public";
            else
                status = CONTINUOUS_STREAMS.includes(stream) && month > first && month < last ? "gap" : "no_record";
            cells.push({
                stream,
                month,
                status,
                corroborated: here.some((l) => l.corroboratedBy.length > 0),
                sources: [...new Set(here.map((l) => l.source))].sort(),
            });
        }
    }
    const bySource = [];
    for (const p of prep.provenance) {
        const own = prep.lines.filter((l) => l.provId === p.id);
        if (!own.length || p.source === "orbe_rating" || p.source === "declared")
            continue;
        const ms = own.map((l) => l.month).sort();
        bySource.push({ provId: p.id, source: p.source, from: ms[0], to: ms[ms.length - 1], monthsInPeriod: new Set(ms.filter((m) => inTtm.has(m))).size });
    }
    const ttm = counted(prep.lines).filter((l) => inTtm.has(l.month));
    const total = moneyFigure("ttm.total", "Revenue, trailing twelve months", ttm, prep.currency);
    const share = (id, label, pick) => {
        const part = moneyFigure(`${id}.amount`, label, pick, prep.currency);
        return derived(id, label, total.value > 0 ? part.value / total.value : 0, "percent", [part]);
    };
    // A line is corroborated when another source agrees with it, or when the line it replaced did.
    const corroborated = ttm.filter((l) => l.corroboratedBy.length > 0);
    return {
        months,
        streams,
        cells,
        bySource,
        connectedShare: share("coverage.connected", "Share of revenue read from connected sources", ttm.filter((l) => l.basis === "connected")),
        uploadedShare: share("coverage.uploaded", "Share of revenue resting on uploads alone", ttm.filter((l) => l.basis === "uploaded" && l.corroboratedBy.length === 0)),
        corroboratedShare: share("coverage.corroborated", "Share of revenue a second source agrees with", corroborated),
    };
}
