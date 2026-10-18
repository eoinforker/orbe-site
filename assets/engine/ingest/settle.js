/*
  Settlement: how much of what a source says was earned has been seen
  arriving as payouts. This is the arithmetic behind "read from payouts, not
  estimates" (docs/PAYOUTS.md). It judges nothing: the record decides what a
  gap means. It only adds up, per source account and currency, what each
  measure says, and labels every line with the words the product may use.
*/
const measureOf = (l) => l.measure ?? "earned";
/** Groups lines by source, platform account and currency, then by month. */
export function summariseSettlement(lines) {
    const groups = new Map();
    for (const l of lines) {
        const key = [l.provenance.source, l.provenance.accountId, l.gross.currency].join("|");
        let g = groups.get(key);
        if (!g) {
            g = { source: l.provenance.source, platformAccountId: l.provenance.accountId, currency: l.gross.currency, months: new Map() };
            groups.set(key, g);
        }
        let m = g.months.get(l.month);
        if (!m) {
            m = { month: l.month, earned: 0, estimated: 0, invoiced: 0, paidOut: 0, traced: null };
            g.months.set(l.month, m);
        }
        const measure = measureOf(l);
        if (measure === "paid_out")
            m.paidOut += l.gross.amount;
        else
            m[measure] += l.gross.amount;
        if (measure === "earned" && l.tracedToPayout !== undefined)
            m.traced = (m.traced ?? 0) + l.tracedToPayout;
    }
    return [...groups.values()]
        .map((g) => {
        const months = [...g.months.values()].sort((a, b) => a.month.localeCompare(b.month));
        const sum = (k) => months.reduce((s, m) => s + m[k], 0);
        const tracedMonths = months.filter((m) => m.traced !== null);
        const traced = tracedMonths.length ? tracedMonths.reduce((s, m) => s + (m.traced ?? 0), 0) : null;
        const earned = sum("earned");
        const paidOut = sum("paidOut");
        return {
            source: g.source,
            platformAccountId: g.platformAccountId,
            currency: g.currency,
            months,
            earned,
            estimated: sum("estimated"),
            invoiced: sum("invoiced"),
            paidOut,
            traced,
            tracedShare: traced !== null && earned > 0 ? Math.min(1, Math.max(0, traced / earned)) : null,
            paidOutShare: earned > 0 ? paidOut / earned : null,
        };
    })
        .sort((a, b) => a.source.localeCompare(b.source) || a.platformAccountId.localeCompare(b.platformAccountId) || a.currency.localeCompare(b.currency));
}
/** Counts for a status line: how many payouts were read, paid and fully traced. */
export function payoutStats(payouts) {
    const paid = payouts.filter((p) => p.status === "paid");
    const arrivals = paid.map((p) => p.arrivalDate).filter((d) => d !== null).sort();
    return {
        read: payouts.length,
        paid: paid.length,
        traced: paid.filter((p) => p.trace === "traced").length,
        mismatched: paid.filter((p) => p.trace === "mismatch").length,
        pending: payouts.filter((p) => p.status === "pending" || p.status === "in_transit").length,
        failed: payouts.filter((p) => p.status === "failed" || p.status === "canceled").length,
        lastArrival: arrivals.length ? arrivals[arrivals.length - 1] : null,
    };
}
const SOURCE_NAME = {
    stripe: "Stripe",
    adsense: "Google AdSense",
    patreon: "Patreon",
    youtube_analytics: "YouTube Analytics",
    invoice_upload: "your uploaded invoices",
};
/** The customer-facing basis of a line, in the exact words docs/PAYOUTS.md allows. */
export function basisLabel(line) {
    const name = SOURCE_NAME[line.provenance.source] ?? line.provenance.source;
    const uploaded = line.provenance.basis === "uploaded";
    switch (measureOf(line)) {
        case "paid_out":
            return uploaded
                ? { tag: "Paid out", text: `Paid out, from a ${name} statement the creator uploaded.`, fromPayouts: false }
                : { tag: "Paid out", text: `Paid out, read from ${name}'s payout records.`, fromPayouts: true };
        case "estimated":
            return { tag: "Estimated", text: `Estimated by ${name}. Not money received.`, fromPayouts: false };
        case "invoiced":
            return { tag: "Invoiced", text: "Invoiced. Not proof that money arrived.", fromPayouts: false };
        case "earned": {
            const t = line.tracedToPayout;
            if (t !== undefined && line.gross.amount > 0 && t >= line.gross.amount) {
                return { tag: "Traced to payouts", text: `Earned, and traced charge by charge into ${name} payouts that were paid.`, fromPayouts: true };
            }
            if (t !== undefined && t > 0)
                return { tag: "Partly traced", text: `Earned; part of it is traced into ${name} payouts that were paid, the rest is not yet paid out.`, fromPayouts: false };
            return { tag: "Earned", text: `Earned, as recorded by ${name}. Not yet matched to a payout.`, fromPayouts: false };
        }
    }
}
