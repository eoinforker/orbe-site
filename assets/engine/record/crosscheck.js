/*
  The verification itself: where two sources describe the same money or the
  same audience, compare them. Each check produces one Finding per subject
  (a Stripe account, a channel) with a row per month or per invoice, and logs
  whether it ran, so the scope section never claims a check that did not.
*/
import { figure, moneyFigure, plain, say } from "./figures.js";
import { SOURCE_LABEL } from "./sources.js";
import { addMonths, daysBetween, formatMonth, monthDiff, monthRange, normaliseName, relativeGap, slug, sum } from "./util.js";
/**
  Provisional tolerances. Each is a reasoned guess, not a measurement:
  - Stripe UK card fees run from about 1.5% to over 3% for international
    cards, plus refunds and disputes, so payouts up to 6% below charges are
    ordinary. Replace with the fee rate read from Stripe balance transactions
    once the connector supplies it.
  - AdSense finalised earnings usually differ from YouTube Analytics estimates
    by small deductions for invalid traffic; 5% is a starting band, to be
    replaced by the measured spread across connected channels.
  - Invoice amounts allow 2% for rounding and card surcharges, and 3 months
    for payment terms.
  - YouTube shows public subscriber counts to three significant figures, so a
    public count can be up to 1% below the true one.
  - Materiality: a gap under 1% of a year's revenue is never worse than low.
*/
export const TOLERANCES = {
    stripeFeeMax: 0.06,
    stripeSlack: 0.02,
    adsenseVsAnalytics: 0.05,
    substackVsStripe: 0.03,
    invoiceAmount: 0.02,
    invoiceWindowMonths: 3,
    audiencePublicVsConnected: 0.01,
    materiality: 0.01,
};
const SEVERITY_ORDER = ["info", "low", "medium", "high"];
export const maxSeverity = (xs) => xs.reduce((a, b) => (SEVERITY_ORDER.indexOf(b) > SEVERITY_ORDER.indexOf(a) ? b : a), "info");
/** Severity grows with the relative gap, but an immaterial amount stays low. */
export function gapSeverity(gap, relative, ctx) {
    const s = relative <= 0.15 ? "low" : relative <= 0.3 ? "medium" : "high";
    return immaterial(Math.abs(gap), ctx) ? "low" : s;
}
const immaterial = (gap, ctx) => ctx.ttmRevenue > 0 && gap < ctx.tol.materiality * ctx.ttmRevenue;
/**
  Monthly rows are judged on their relative gap first, then together: a gap
  that is small in any one month but repeats can still matter, and one that
  adds up to little stays low.
*/
function capImmaterial(rows, ctx) {
    const off = rows.filter((r) => r.status !== "matched" && r.severity !== "info");
    const gap = sum(off.map((r) => Math.abs(r.difference?.value ?? 0)));
    if (!immaterial(gap, ctx))
        return;
    for (const r of off)
        if (r.severity === "medium" || r.severity === "high")
            r.severity = "low";
}
const relSeverity = (relative) => (relative <= 0.15 ? "low" : relative <= 0.3 ? "medium" : "high");
export function runCrossChecks(ctx) {
    const out = { findings: [], checks: [], supersede: new Map() };
    stripeChargesVsPayouts(ctx, out);
    adsenseVsAnalytics(ctx, out);
    substackVsStripe(ctx, out);
    invoicesVsSettlements(ctx, out);
    audiencePublicVsConnected(ctx, out);
    return out;
}
function finding(check, subject, title, detail, tolerance, rows) {
    const counts = { matched: 0, unmatched: 0, contradicted: 0 };
    for (const r of rows)
        counts[r.status]++;
    const status = counts.contradicted ? "contradicted" : counts.unmatched ? "unmatched" : "matched";
    return {
        id: `f-${slug(check)}-${slug(subject)}`,
        check,
        subject,
        status,
        severity: maxSeverity(rows.map((r) => r.severity)),
        title,
        detail,
        tolerance,
        rows,
        counts,
    };
}
const byMonth = (lines) => {
    const m = new Map();
    for (const l of lines)
        m.set(l.month, [...(m.get(l.month) ?? []), l]);
    return m;
};
const total = (lines) => sum((lines ?? []).map((l) => l.amount));
const corroborate = (a, b) => {
    for (const l of a)
        l.corroboratedBy.push(...b.map((x) => x.line.id));
    for (const l of b)
        l.corroboratedBy.push(...a.map((x) => x.line.id));
};
/* Stripe charges against Stripe payouts, per Stripe account. */
function stripeChargesVsPayouts(ctx, out) {
    const { prep, tol } = ctx;
    const cur = prep.currency;
    const stripe = prep.lines.filter((l) => l.source === "stripe");
    const accounts = [...new Set(stripe.map((l) => l.line.provenance.accountId))].sort();
    if (!accounts.length) {
        out.checks.push({ check: "stripe_charges_vs_payouts", subject: "Stripe", performed: false, text: "No Stripe account was connected." });
        return;
    }
    const low = 1 - tol.stripeFeeMax - tol.stripeSlack;
    const high = 1 + tol.stripeSlack;
    const inBand = (c, p) => c > 0 && p >= c * low && p <= c * high;
    for (const acct of accounts) {
        const subject = `Stripe ${acct}`;
        const lines = stripe.filter((l) => l.line.provenance.accountId === acct);
        const charges = lines.filter((l) => l.measure === "earned");
        const payouts = lines.filter((l) => l.measure === "paid_out");
        if (!payouts.length || !charges.length) {
            out.checks.push({
                check: "stripe_charges_vs_payouts",
                subject,
                performed: false,
                text: !payouts.length
                    ? `Stripe payouts were not supplied for ${acct}, so charges were not reconciled to money paid out.`
                    : `Only payouts were supplied for ${acct}; there were no charges to reconcile them against.`,
            });
            continue;
        }
        for (const p of payouts)
            p.role = "settlement";
        const cm = byMonth(charges);
        const pm = byMonth(payouts);
        const all = [...cm.keys(), ...pm.keys()].sort();
        const months = monthRange(all[0], all[all.length - 1]);
        const lastMonth = months[months.length - 1];
        const rows = [];
        const id = (m, side) => `chk.stripe.${slug(acct)}.${m.slice(0, 7)}.${side}`;
        for (const m of months) {
            const c = total(cm.get(m));
            const p = total(pm.get(m));
            if (c === 0 && p === 0)
                continue;
            const cf = moneyFigure(id(m, "charges"), `Stripe charges, ${formatMonth(m)}`, cm.get(m) ?? [], cur);
            const pf = moneyFigure(id(m, "payouts"), `Stripe payouts, ${formatMonth(m)}`, pm.get(m) ?? [], cur);
            const diff = figure(id(m, "gap"), `Charges less payouts, ${formatMonth(m)}`, c - p, "money", [...cf.prov, ...pf.prov], { currency: cur });
            const lineIds = [...(cm.get(m) ?? []), ...(pm.get(m) ?? [])].map((l) => l.line.id);
            const base = { key: m, label: formatMonth(m), sides: [{ label: "Charges", figure: cf }, { label: "Payouts", figure: pf }], difference: diff, lineIds };
            if (inBand(c, p)) {
                rows.push({ ...base, status: "matched", severity: "info" });
                corroborate(cm.get(m) ?? [], pm.get(m) ?? []);
                continue;
            }
            // A payout often lands in the month after the charge, so look across the month boundary.
            const prev = addMonths(m, -1);
            const next = addMonths(m, 1);
            const timing = inBand(c + total(cm.get(prev)), p + total(pm.get(prev))) || inBand(c + total(cm.get(next)), p + total(pm.get(next)));
            if (timing) {
                rows.push({ ...base, status: "matched", severity: "info", note: plain("Matched across the month boundary: payouts lag charges by a few days.") });
                corroborate(cm.get(m) ?? [], pm.get(m) ?? []);
            }
            else if (p === 0) {
                rows.push({
                    ...base,
                    status: "unmatched",
                    severity: m === lastMonth ? "info" : relSeverity(1),
                    note: plain(m === lastMonth ? "No payout yet; it may arrive next month." : "Charges with no payout in this or the next month."),
                });
            }
            else if (c === 0) {
                rows.push({
                    ...base,
                    status: "contradicted",
                    severity: relSeverity(1),
                    note: plain("Money was paid out with no charges in the record to explain it."),
                });
            }
            else {
                const expected = c * (1 - tol.stripeFeeMax / 2);
                rows.push({
                    ...base,
                    status: "contradicted",
                    severity: relSeverity(relativeGap(expected, p)),
                    note: p > c ? plain("More was paid out than was charged.") : plain("Payouts fall short of charges by more than fees and refunds explain."),
                });
            }
        }
        capImmaterial(rows, ctx);
        const C = moneyFigure(`chk.stripe.${slug(acct)}.charges`, `Stripe charges, ${acct}, all months`, charges, cur);
        const P = moneyFigure(`chk.stripe.${slug(acct)}.payouts`, `Stripe payouts, ${acct}, all months`, payouts, cur);
        out.findings.push(finding("stripe_charges_vs_payouts", subject, say `Stripe payouts of ${P} against charges of ${C}`, inBand(C.value, P.value)
            ? plain("Over the whole period, money paid out is consistent with money charged less fees and refunds.")
            : plain("Over the whole period, money paid out does not square with money charged; see the months below."), say `Payouts may sit up to ${pct("tol.stripe.fee", tol.stripeFeeMax)} below charges for fees and refunds, with ${pct("tol.stripe.slack", tol.stripeSlack)} either side for rounding and timing.`, rows));
        out.checks.push({
            check: "stripe_charges_vs_payouts",
            subject,
            performed: true,
            text: `Stripe charges reconciled to Stripe payouts for ${acct}, month by month, ${formatMonth(months[0])} to ${formatMonth(lastMonth)}.`,
        });
    }
}
/** Tolerance figures are method constants, not data: their provenance is Orbe's published method. */
const pct = (id, v) => figure(id, "Tolerance", v, "percent", [], { note: "Orbe method constant (provisional)" });
const windowFig = (months) => figure("tol.invoice.window", "Payment window", months, "months", [], { note: "Orbe method constant (provisional)" });
/* AdSense finalised ad earnings against YouTube Analytics estimated revenue, across the creator's channels. */
function adsenseVsAnalytics(ctx, out) {
    const { prep, tol } = ctx;
    const cur = prep.currency;
    const ads = prep.lines.filter((l) => l.source === "adsense" && l.line.stream === "ads" && l.measure !== "paid_out");
    const yta = prep.lines.filter((l) => l.source === "youtube_analytics" && l.line.stream === "ads");
    if (!ads.length || !yta.length) {
        out.checks.push({
            check: "adsense_vs_youtube_analytics",
            subject: "YouTube ad revenue",
            performed: false,
            text: !ads.length && !yta.length
                ? "Neither AdSense nor YouTube Analytics revenue was connected."
                : !ads.length
                    ? "AdSense was not connected, so YouTube Analytics revenue estimates were not checked against finalised earnings."
                    : "YouTube Analytics revenue was not connected, so AdSense earnings were not checked against YouTube's estimates.",
        });
        return;
    }
    compareMonthly(ctx, out, {
        check: "adsense_vs_youtube_analytics",
        subject: "YouTube ad revenue",
        a: { label: "AdSense", lines: ads },
        b: { label: "YouTube Analytics", lines: yta },
        tolerance: tol.adsenseVsAnalytics,
        tolText: say `AdSense finalised earnings and YouTube Analytics estimates may differ by up to ${pct("tol.adsense", tol.adsenseVsAnalytics)} a month. AdSense can also hold income from websites, which YouTube does not see.`,
        onGap: (a, b) => a > b
            ? { note: plain("AdSense paid more than YouTube estimated; deductions normally make it the other way round."), soft: false }
            : { note: plain("AdSense paid less than YouTube estimated, beyond the usual deductions."), soft: false },
        checkText: "AdSense finalised ad earnings compared with YouTube Analytics estimated ad revenue, month by month",
        currency: cur,
    });
}
/* Substack's export of paid subscriptions against Stripe, which takes Substack's payments. */
function substackVsStripe(ctx, out) {
    const { prep, tol } = ctx;
    const sub = prep.lines.filter((l) => l.source === "substack_export" && l.line.stream === "subscriptions" && l.measure !== "paid_out");
    if (!sub.length)
        return;
    const stripe = prep.lines.filter((l) => l.source === "stripe" && l.line.stream === "subscriptions" && l.measure === "earned");
    if (!stripe.length) {
        out.checks.push({
            check: "substack_vs_stripe",
            subject: "Substack subscriptions",
            performed: false,
            text: "Stripe subscription charges were not connected, so the Substack export was not checked against the payments behind it.",
        });
        return;
    }
    compareMonthly(ctx, out, {
        check: "substack_vs_stripe",
        subject: "Substack subscriptions",
        a: { label: "Substack export", lines: sub },
        b: { label: "Stripe", lines: stripe },
        tolerance: tol.substackVsStripe,
        tolText: say `Substack's export and Stripe's subscription charges may differ by up to ${pct("tol.substack", tol.substackVsStripe)} a month for refunds and timing.`,
        onGap: (a, b) => b > a
            ? { note: plain("Stripe holds more subscription income than Substack reports: expected if the creator also sells subscriptions elsewhere through the same Stripe account. Worth asking."), soft: true }
            : { note: plain("Substack reports more subscription income than reached Stripe."), soft: false },
        checkText: "Substack's exported subscription revenue compared with Stripe subscription charges, month by month",
        currency: prep.currency,
    });
}
function compareMonthly(ctx, out, p) {
    const am = byMonth(p.a.lines);
    const bm = byMonth(p.b.lines);
    const aMonths = [...am.keys()].sort();
    const bMonths = [...bm.keys()].sort();
    // Only the months both sources could have covered: a source connected later is not a contradiction.
    const from = aMonths[0] > bMonths[0] ? aMonths[0] : bMonths[0];
    const to = aMonths[aMonths.length - 1] < bMonths[bMonths.length - 1] ? aMonths[aMonths.length - 1] : bMonths[bMonths.length - 1];
    const s = slug(p.subject);
    const rows = [];
    const months = monthRange(from, to);
    for (const m of months) {
        const al = am.get(m) ?? [];
        const bl = bm.get(m) ?? [];
        const a = total(al);
        const b = total(bl);
        const af = moneyFigure(`chk.${s}.${m.slice(0, 7)}.a`, `${p.a.label}, ${formatMonth(m)}`, al, p.currency);
        const bf = moneyFigure(`chk.${s}.${m.slice(0, 7)}.b`, `${p.b.label}, ${formatMonth(m)}`, bl, p.currency);
        const diff = figure(`chk.${s}.${m.slice(0, 7)}.gap`, `${p.a.label} less ${p.b.label}, ${formatMonth(m)}`, a - b, "money", [...af.prov, ...bf.prov], {
            currency: p.currency,
        });
        const base = { key: m, label: formatMonth(m), sides: [{ label: p.a.label, figure: af }, { label: p.b.label, figure: bf }], difference: diff, lineIds: [...al, ...bl].map((l) => l.line.id) };
        if (!al.length || !bl.length) {
            rows.push({ ...base, status: "unmatched", severity: "low", note: plain(`${!al.length ? p.a.label : p.b.label} has no record for this month.`) });
            continue;
        }
        const rel = relativeGap(a, b);
        if (rel <= p.tolerance) {
            rows.push({ ...base, status: "matched", severity: "info" });
            corroborate(al, bl);
            continue;
        }
        const g = p.onGap(a, b);
        rows.push({ ...base, status: "contradicted", severity: g.soft ? "low" : relSeverity(rel), note: g.note });
    }
    capImmaterial(rows, ctx);
    const A = moneyFigure(`chk.${s}.a`, `${p.a.label}, ${formatMonth(from)} to ${formatMonth(to)}`, p.a.lines.filter((l) => l.month >= from && l.month <= to), p.currency);
    const B = moneyFigure(`chk.${s}.b`, `${p.b.label}, ${formatMonth(from)} to ${formatMonth(to)}`, p.b.lines.filter((l) => l.month >= from && l.month <= to), p.currency);
    const f = finding(p.check, p.subject, say `${p.a.label} ${A} against ${p.b.label} ${B}`, rows.every((r) => r.status === "matched")
        ? plain(`The two sources agree in every month both cover.`)
        : plain(`The two sources disagree or leave gaps in some months; see the rows below.`), p.tolText, rows);
    out.findings.push(f);
    out.checks.push({ check: p.check, subject: p.subject, performed: true, text: `${p.checkText}, ${formatMonth(from)} to ${formatMonth(to)}.` });
}
/* Uploaded invoices against money that arrived through a connected source. */
function invoicesVsSettlements(ctx, out) {
    const { prep, tol } = ctx;
    const cur = prep.currency;
    const invoices = prep.lines.filter((l) => l.measure === "invoiced").sort((a, b) => a.month.localeCompare(b.month) || b.amount - a.amount);
    if (!invoices.length)
        return;
    const settleSet = new Set(ctx.settlementSources);
    const candidates = prep.lines.filter((l) => settleSet.has(l.source) &&
        (l.measure === "earned" || l.measure === "paid_out") &&
        l.line.stream !== "subscriptions" &&
        l.line.stream !== "memberships");
    const sources = ctx.settlementSources.map((s) => SOURCE_LABEL[s]).join(" or ");
    if (!candidates.length) {
        const connected = prep.lines.some((l) => settleSet.has(l.source));
        out.checks.push({
            check: "invoices_vs_settlements",
            subject: "Uploaded invoices",
            performed: false,
            text: connected
                ? `${sources} was connected but holds no payments other than subscriptions, so uploaded invoices stand on the creator's upload alone. Bank records were not provided.`
                : `No payment source that could settle invoices (${sources}) was connected, so uploaded invoices stand on the creator's upload alone. Bank records were not provided.`,
        });
        return;
    }
    const used = new Set();
    const matched = new Map();
    const sameName = (a, b) => {
        if (!a || !b)
            return false;
        const x = normaliseName(a);
        const y = normaliseName(b);
        return x.length >= 3 && y.length >= 3 && (x === y || x.includes(y) || y.includes(x));
    };
    const inWindow = (inv, c) => {
        const lag = monthDiff(inv.month, c.month);
        return lag >= 0 && lag <= tol.invoiceWindowMonths;
    };
    // First pass: one invoice to one payment, by name and amount, nearest month first.
    for (const inv of invoices) {
        let best = null;
        for (const c of candidates) {
            if (used.has(c.line.id) || !inWindow(inv, c))
                continue;
            const gap = relativeGap(inv.amount, c.amount);
            const named = sameName(inv.line.counterparty, c.line.counterparty);
            // Without a name, only an almost exact amount in a compatible stream counts, so a product sale cannot pass for a sponsor.
            const compatible = c.line.stream === inv.line.stream || c.line.stream === "other";
            const ok = named ? gap <= tol.invoiceAmount : !c.line.counterparty && compatible && gap <= tol.invoiceAmount / 4;
            if (!ok)
                continue;
            const score = monthDiff(inv.month, c.month) + gap + (named ? 0 : 10);
            if (!best || score < best.score)
                best = { c, score };
        }
        if (best) {
            used.add(best.c.line.id);
            matched.set(inv.line.id, [best.c]);
        }
    }
    // Second pass: one payment can settle several invoices to the same counterparty, since connectors sum a month's charges.
    for (const c of candidates) {
        if (used.has(c.line.id) || !c.line.counterparty)
            continue;
        const open = invoices.filter((i) => !matched.has(i.line.id) && sameName(i.line.counterparty, c.line.counterparty) && inWindow(i, c)).slice(0, 8);
        const subset = findSubset(open, c.amount, tol.invoiceAmount);
        if (subset && subset.length > 1) {
            used.add(c.line.id);
            for (const i of subset)
                matched.set(i.line.id, [c]);
        }
    }
    const rows = [];
    for (const inv of invoices) {
        const name = inv.line.counterparty ?? "Unnamed counterparty";
        const label = `${name}, invoiced ${formatMonth(inv.month)}`;
        const key = `${slug(name)}.${inv.month.slice(0, 7)}.${slug(inv.line.id)}`;
        const invFig = moneyFigure(`chk.inv.${key}.invoice`, `Invoice to ${name}, ${formatMonth(inv.month)}`, [inv], cur);
        const paid = matched.get(inv.line.id);
        if (paid) {
            const settle = paid[0];
            const payFig = moneyFigure(`chk.inv.${key}.paid`, `Payment from ${settle.line.counterparty ?? "unnamed payer"}, ${formatMonth(settle.month)}`, paid, cur);
            const shared = invoices.filter((i) => matched.get(i.line.id)?.[0] === settle).length > 1;
            rows.push({
                key,
                label,
                status: "matched",
                severity: "info",
                sides: [{ label: "Invoice", figure: invFig }, { label: `${settle.platform} ${formatMonth(settle.month)}`, figure: payFig }],
                note: shared
                    ? plain("Settled together with other invoices to the same counterparty in one payment.")
                    : settle.line.counterparty
                        ? undefined
                        : plain("Matched on amount and timing only: the payment carries no counterparty name."),
                lineIds: [inv.line.id, settle.line.id],
            });
            corroborate([inv], paid);
            // Money that arrived as a counted charge replaces the invoice in totals; a payout settles it but is never revenue.
            if (settle.measure === "earned")
                out.supersede.set(inv.line.id, settle.line.id);
            continue;
        }
        const near = candidates
            .filter((c) => !used.has(c.line.id) && inWindow(inv, c) && sameName(inv.line.counterparty, c.line.counterparty))
            .sort((a, b) => relativeGap(inv.amount, a.amount) - relativeGap(inv.amount, b.amount))[0];
        if (near) {
            used.add(near.line.id);
            const payFig = moneyFigure(`chk.inv.${key}.paid`, `Payment from ${near.line.counterparty}, ${formatMonth(near.month)}`, [near], cur);
            const gap = figure(`chk.inv.${key}.gap`, `Invoice less payment, ${name}`, inv.amount - near.amount, "money", [inv.provId, near.provId], { currency: cur });
            rows.push({
                key,
                label,
                status: "contradicted",
                severity: gapSeverity(inv.amount - near.amount, relativeGap(inv.amount, near.amount), ctx),
                sides: [{ label: "Invoice", figure: invFig }, { label: `${near.platform} ${formatMonth(near.month)}`, figure: payFig }],
                difference: gap,
                note: say `The same counterparty paid a different amount. Totals count the ${near.platform} payment, not the invoice, so the gap of ${gap} is left out.`,
                lineIds: [inv.line.id, near.line.id],
            });
            if (near.measure === "earned")
                out.supersede.set(inv.line.id, near.line.id);
            continue;
        }
        rows.push({
            key,
            label,
            status: "unmatched",
            severity: "low",
            sides: [{ label: "Invoice", figure: invFig }],
            note: say `No payment from this counterparty reached ${sources} within ${windowFig(tol.invoiceWindowMonths)}. It may have been paid by bank transfer, which Orbe did not see.`,
            lineIds: [inv.line.id],
        });
    }
    const I = moneyFigure("chk.inv.total", "Invoiced, all uploaded invoices", invoices, cur);
    const M = moneyFigure("chk.inv.matched", "Invoiced and found paid", invoices.filter((i) => rows.find((r) => r.lineIds[0] === i.line.id)?.status === "matched"), cur);
    out.findings.push(finding("invoices_vs_settlements", "Uploaded invoices", say `${M} of ${I} in uploaded invoices found paid through ${sources}`, plain("Each uploaded invoice was looked for among payments from the same counterparty, at a matching amount, within the payment window."), say `Amounts may differ by up to ${pct("tol.invoice", tol.invoiceAmount)}; payment may land up to ${windowFig(tol.invoiceWindowMonths)} after the invoice month.`, rows));
    out.checks.push({
        check: "invoices_vs_settlements",
        subject: "Uploaded invoices",
        performed: true,
        text: `Uploaded invoices matched to payments received through ${sources}. Payments made outside ${sources}, such as bank transfers, were not visible.`,
    });
}
/** Smallest-first subset of invoices whose sum is within tolerance of a payment. Inputs are capped at 8, so 256 subsets at most. */
function findSubset(items, target, tolerance) {
    let best = null;
    for (let mask = 1; mask < 1 << items.length; mask++) {
        const pick = items.filter((_, i) => mask & (1 << i));
        if (relativeGap(sum(pick.map((p) => p.amount)), target) <= tolerance && (!best || pick.length < best.length))
            best = pick;
    }
    return best;
}
/* The audience a platform shows publicly against what the creator's own login reports. */
function audiencePublicVsConnected(ctx, out) {
    const { prep, tol } = ctx;
    const byAccount = new Map();
    for (const s of prep.snapshots) {
        const e = byAccount.get(s.snapshot.account.id) ?? { pub: [], con: [] };
        if (s.snapshot.provenance.basis === "public")
            e.pub.push(s);
        else if (s.snapshot.provenance.basis === "connected")
            e.con.push(s);
        byAccount.set(s.snapshot.account.id, e);
    }
    let any = false;
    for (const [accountId, { pub, con }] of [...byAccount].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (!pub.length || !con.length)
            continue;
        const handle = (con[0] ?? pub[0]).snapshot.account.handle;
        const rows = [];
        for (const c of con) {
            // Compare with the public read nearest in time; a week apart is too far to tell growth from error.
            const near = [...pub].sort((a, b) => Math.abs(daysBetween(a.snapshot.provenance.checkedAt, c.snapshot.provenance.checkedAt)) -
                Math.abs(daysBetween(b.snapshot.provenance.checkedAt, c.snapshot.provenance.checkedAt)))[0];
            if (Math.abs(daysBetween(near.snapshot.provenance.checkedAt, c.snapshot.provenance.checkedAt)) > 3)
                continue;
            const day = c.snapshot.provenance.checkedAt.slice(0, 10);
            const pv = near.snapshot.account.audience;
            const cv = c.snapshot.account.audience;
            const pf = figure(`chk.aud.${slug(accountId)}.${day}.public`, `Public audience, @${handle}`, pv, "count", [near.provId], { basis: "public" });
            const cf = figure(`chk.aud.${slug(accountId)}.${day}.connected`, `Connected audience, @${handle}`, cv, "count", [c.provId], { basis: "connected" });
            const rel = relativeGap(pv, cv);
            const base = { key: day, label: day, sides: [{ label: "Public", figure: pf }, { label: "Connected", figure: cf }], lineIds: [] };
            if (rel <= tol.audiencePublicVsConnected)
                rows.push({ ...base, status: "matched", severity: "info" });
            else
                rows.push({
                    ...base,
                    status: "contradicted",
                    severity: rel <= 0.05 ? "low" : rel <= 0.15 ? "medium" : "high",
                    note: plain("The public count and the count behind the creator's login disagree beyond rounding."),
                });
        }
        if (!rows.length)
            continue;
        any = true;
        out.findings.push(finding("audience_public_vs_connected", `@${handle}`, plain(`Public audience of @${handle} against the creator's connected account`), plain("A match also shows the connected login belongs to the public account being described."), say `Public counts may be rounded down by up to ${pct("tol.audience", tol.audiencePublicVsConnected)}.`, rows));
        out.checks.push({
            check: "audience_public_vs_connected",
            subject: `@${handle}`,
            performed: true,
            text: `The public audience count of @${handle} compared with the count read through the creator's own login.`,
        });
    }
    if (!any) {
        out.checks.push({
            check: "audience_public_vs_connected",
            subject: "Audience",
            performed: false,
            text: "No account was read both publicly and through the creator's login within three days, so audience counts were not cross-checked.",
        });
    }
}
