/*
  The first pass over the inputs: decide what the record may use and give every
  line and snapshot a provenance entry. Anything left out is kept as an
  Exclusion with its reason, so the report can say exactly what it did not use.
*/
import { PROVENANCE_METHODS } from "../core/types.js";
import { systemClock } from "../core/util.js";
import { liveConsent } from "./consent.js";
import { defaultMeasure, freshnessOf, PAYER, SOURCE_AUDIENCE, SOURCE_LABEL } from "./sources.js";
import { addMonths, monthOf, monthOfDate, monthRange } from "./util.js";
/** Up to three years: enough for two year-on-year comparisons and a seasonal index. */
export const HISTORY_MONTHS = 36;
class Registry {
    byKey = new Map();
    add(p, what) {
        const read = what === "line" ? "revenue" : "audience";
        // Estimated, measured and host-reported audiences of one show are different claims, so each gets its own entry.
        const k = `${p.source}\u001f${p.accountId}\u001f${p.basis}\u001f${read}${p.method ? `\u001f${p.method}` : ""}`;
        let e = this.byKey.get(k);
        if (!e) {
            const key = { source: p.source, accountId: p.accountId, basis: p.basis, what: read };
            if (p.method)
                key.method = p.method;
            e = { key, checks: [], lines: 0, snapshots: 0 };
            this.byKey.set(k, e);
        }
        e.checks.push(p.checkedAt);
        if (what === "line")
            e.lines++;
        else
            e.snapshots++;
        return k;
    }
    /** Stable ids p1, p2, ... in source then account order, so the same inputs give the same report. */
    finish(now) {
        const keys = [...this.byKey.keys()].sort();
        const idFor = new Map();
        const entries = keys.map((k, i) => {
            const e = this.byKey.get(k);
            const sorted = [...e.checks].sort();
            const last = sorted[sorted.length - 1];
            const f = freshnessOf(e.key.source, last, now);
            const id = `p${i + 1}`;
            idFor.set(k, id);
            const entry = {
                id,
                source: e.key.source,
                label: `${SOURCE_LABEL[e.key.source]}, ${e.key.what}, ${e.key.method ? PROVENANCE_METHODS[e.key.method].toLowerCase() : e.key.basis}`,
                accountId: e.key.accountId,
                basis: e.key.basis,
                firstCheckedAt: sorted[0],
                lastCheckedAt: last,
                freshness: f.status,
                ageDays: Math.floor(f.ageDays),
                lineCount: e.lines,
                snapshotCount: e.snapshots,
            };
            if (e.key.method)
                entry.method = e.key.method;
            return entry;
        });
        return { entries, idFor };
    }
}
class Exclusions {
    groups = new Map();
    add(reason, source, detail, ref) {
        const k = `${reason}\u001f${source}`;
        let g = this.groups.get(k);
        if (!g) {
            g = { reason, source, detail, lineIds: [], snapshotAccountIds: [] };
            this.groups.set(k, g);
        }
        if (ref.lineId)
            g.lineIds.push(ref.lineId);
        if (ref.snapshotAccountId)
            g.snapshotAccountIds.push(ref.snapshotAccountId);
    }
    list() {
        return [...this.groups.values()];
    }
}
export function prepare(input, opts = {}) {
    const now = (opts.clock ?? systemClock)();
    const creatorId = input.creator.id;
    const classify = opts.classify ?? defaultMeasure;
    const hasConnectConsent = liveConsent(input.consents, creatorId, "connect", now) !== null;
    const ex = new Exclusions();
    // Accounts that belong to someone else never enter the record.
    const accounts = input.accounts.filter((a) => a.creatorId === null || a.creatorId === creatorId);
    const foreign = new Set(input.accounts.filter((a) => !accounts.includes(a)).map((a) => a.id));
    const kindOf = new Map(accounts.map((a) => [a.id, a.kind]));
    const lastComplete = addMonths(monthOfDate(now), -1);
    const months = monthRange(addMonths(lastComplete, -11), lastComplete);
    const historyStart = addMonths(lastComplete, -(HISTORY_MONTHS - 1));
    // Shared reasons a connected read cannot be used, for lines and snapshots alike.
    const blocked = (p) => {
        if (p.basis === "connected" && !hasConnectConsent) {
            return { reason: "no_connect_consent", detail: "Read through the creator's login without a live consent to connect" };
        }
        const f = freshnessOf(p.source, p.checkedAt, now);
        if (f.overHardLimit) {
            return { reason: "youtube_terms_expired", detail: "Older than the 30 days YouTube allows API data to be kept without a refresh" };
        }
        return null;
    };
    const registry = new Registry();
    const seen = new Set();
    const kept = [];
    for (const line of input.revenue) {
        const source = line.provenance.source;
        if (seen.has(line.id)) {
            ex.add("duplicate_id", source, "The same line id was supplied twice; the first was kept", { lineId: line.id });
            continue;
        }
        seen.add(line.id);
        if (foreign.has(line.accountId)) {
            ex.add("foreign_account", source, "The line's account belongs to another creator", { lineId: line.id });
            continue;
        }
        const b = blocked(line.provenance);
        if (b) {
            ex.add(b.reason, source, b.detail, { lineId: line.id });
            continue;
        }
        const month = monthOf(line.month);
        if (month > lastComplete) {
            ex.add("incomplete_month", source, "The month is not complete yet, so its figures would change", { lineId: line.id });
            continue;
        }
        if (month < historyStart) {
            ex.add("outside_history", source, "Older than the three years the record covers", { lineId: line.id });
            continue;
        }
        kept.push({ line, key: registry.add(line.provenance, "line"), month });
    }
    const snaps = [];
    for (const s of input.snapshots) {
        const source = s.provenance.source;
        if (foreign.has(s.account.id) || (s.account.creatorId !== null && s.account.creatorId !== creatorId)) {
            ex.add("foreign_account", source, "The snapshot's account belongs to another creator", { snapshotAccountId: s.account.id });
            continue;
        }
        const b = blocked(s.provenance);
        if (b) {
            ex.add(b.reason, source, b.detail, { snapshotAccountId: s.account.id });
            continue;
        }
        snaps.push({ snapshot: s, key: registry.add(s.provenance, "snapshot") });
    }
    const members = [];
    for (const period of input.memberships ?? []) {
        const source = period.provenance.source;
        if (foreign.has(period.accountId)) {
            ex.add("foreign_account", source, "The membership counts belong to another creator's account", {});
            continue;
        }
        const b = blocked(period.provenance);
        if (b) {
            ex.add(b.reason, source, b.detail, {});
            continue;
        }
        const month = monthOf(period.month);
        if (month > lastComplete || month < historyStart)
            continue;
        members.push({ period, month, key: registry.add(period.provenance, "snapshot") });
    }
    const currency = opts.currency ?? dominantCurrency(kept.map((k) => k.line));
    const { entries, idFor } = registry.finish(now);
    const lines = [];
    for (const { line, key, month } of kept) {
        let amount = line.gross.amount;
        if (line.gross.currency !== currency) {
            const converted = opts.fx ? opts.fx(line.gross, currency, month) : null;
            if (!converted || converted.currency !== currency) {
                ex.add("no_fx_rate", line.provenance.source, `No exchange rate from ${line.gross.currency} to ${currency} was provided`, { lineId: line.id });
                continue;
            }
            amount = converted.amount;
        }
        const source = line.provenance.source;
        lines.push({
            line,
            provId: idFor.get(key),
            measure: classify(line),
            month,
            amount,
            source,
            basis: line.provenance.basis,
            platform: PAYER[source],
            audienceKind: kindOf.get(line.accountId) ?? SOURCE_AUDIENCE[source] ?? null,
            role: "counted",
            corroboratedBy: [],
        });
    }
    // A provenance entry whose every line was dropped for FX still describes a read, so it stays.
    const earliest = lines.reduce((m, l) => (l.month < m ? l.month : m), lastComplete);
    const history = monthRange(earliest < months[0] ? earliest : months[0], lastComplete);
    return {
        now,
        asOf: now.toISOString(),
        currency,
        months,
        history,
        provenance: entries,
        provById: new Map(entries.map((e) => [e.id, e])),
        lines,
        snapshots: snaps.map((s) => ({ snapshot: s.snapshot, provId: idFor.get(s.key) })),
        memberships: members.map((m) => ({ period: m.period, month: m.month, provId: idFor.get(m.key) })),
        accounts,
        exclusions: ex.list(),
        hasConnectConsent,
    };
}
/** The currency holding the most money, compared in minor units (rough, but only used to choose). */
function dominantCurrency(lines) {
    const totals = new Map();
    for (const l of lines)
        totals.set(l.gross.currency, (totals.get(l.gross.currency) ?? 0) + Math.abs(l.gross.amount));
    let best = "GBP";
    let max = -1;
    for (const [c, t] of totals) {
        if (t > max) {
            best = c;
            max = t;
        }
    }
    return best;
}
