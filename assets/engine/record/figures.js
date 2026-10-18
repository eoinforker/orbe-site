/*
  Figures and Text are how the record keeps its promise that every number has
  provenance. Code never formats a number into prose directly: it builds a
  Figure and puts it in a Text with the `say` template, and renderers link it.
*/
import { formatCount, formatMoney, formatPercent, SYMBOL } from "./util.js";
export function figure(id, label, value, unit, prov, opts = {}) {
    const ids = [...new Set(prov)].sort();
    const f = { kind: "figure", id, label, value, unit, prov: ids, basis: opts.basis ?? "none" };
    if (opts.currency)
        f.currency = opts.currency;
    if (opts.note)
        f.note = opts.note;
    return f;
}
/** A money figure from ledger lines: its provenance and basis come from the lines themselves. */
export function moneyFigure(id, label, lines, currency, value) {
    const total = value ?? lines.reduce((a, l) => a + l.amount, 0);
    return figure(id, label, total, "money", lines.map((l) => l.provId), { currency, basis: basisOf(lines) });
}
/** A figure derived from others carries their provenance. */
export function derived(id, label, value, unit, from, opts = {}) {
    const parts = from.filter((f) => !!f);
    return figure(id, label, value, unit, parts.flatMap((f) => f.prov), { basis: mergeBasis(parts.map((f) => f.basis)), ...opts });
}
export function basisOf(lines) {
    return mergeBasis(lines.map((l) => l.basis));
}
export function mergeBasis(bases) {
    const set = new Set(bases.filter((b) => b !== "none"));
    if (set.size === 0)
        return "none";
    if (set.size === 1)
        return [...set][0];
    return "mixed";
}
/** Basis for figures built from provenance entries directly (snapshots, ratings). */
export const basisOfEntries = (entries) => mergeBasis(entries.map((e) => e.basis));
/**
  Tagged template for prose with figures:
  say`Stripe paid out ${payouts} against ${charges}` keeps both numbers linked.
  Strings interpolate as plain text.
*/
export function say(strings, ...values) {
    const f = [];
    let t = strings[0];
    values.forEach((v, i) => {
        if (typeof v === "object") {
            t += `{${f.length}}`;
            f.push(v);
        }
        else {
            t += String(v);
        }
        t += strings[i + 1];
    });
    return { t, f };
}
export const plain = (t) => ({ t, f: [] });
/** Joins Texts with a separator, renumbering placeholders so each still points at its own figure. */
export function concat(texts, sep = " ") {
    const f = [];
    const parts = texts.map((x) => {
        const offset = f.length;
        f.push(...x.f);
        return x.t.replace(/\{(\d+)\}/g, (_, i) => `{${Number(i) + offset}}`);
    });
    return { t: parts.join(sep), f };
}
/** How a figure reads to a person. */
export function formatFigure(f) {
    switch (f.unit) {
        case "money":
            return formatMoney(f.value, f.currency ?? "GBP");
        case "money_band": {
            const c = f.currency ?? "GBP";
            if (!f.band)
                return "withheld";
            if (f.band.high === null)
                return `over ${formatMoney(f.band.low, c)}`;
            if (f.band.low === 0)
                return `under ${formatMoney(f.band.high, c)}`;
            return `${SYMBOL[c]}${short(f.band.low)} to ${SYMBOL[c]}${short(f.band.high)}`;
        }
        case "percent":
            return formatPercent(f.value, Math.abs(f.value) < 0.1 && f.value !== 0 ? 1 : 0);
        case "change":
            return `${f.value > 0 ? "+" : ""}${formatPercent(f.value, Math.abs(f.value) < 0.1 && f.value !== 0 ? 1 : 0)}`;
        case "ratio":
            return f.value.toFixed(2);
        case "multiple":
            return `${f.value.toFixed(1)}x`;
        case "count":
            return formatCount(f.value);
        case "index":
            return formatCount(f.value);
        case "days":
            return `${Math.round(f.value)} ${Math.round(f.value) === 1 ? "day" : "days"}`;
        case "rating":
            return `${f.value > 0 ? "+" : ""}${f.value.toFixed(2)}`;
        case "months":
            return `${Math.round(f.value)} ${Math.round(f.value) === 1 ? "month" : "months"}`;
    }
}
/** £250k, £1.2M, from minor units. */
function short(minor) {
    const units = minor / 100;
    if (units >= 1e6)
        return `${(units / 1e6).toFixed(units % 1e6 === 0 ? 0 : 1)}M`;
    if (units >= 1e3)
        return `${Math.round(units / 1e3)}k`;
    return String(Math.round(units));
}
/** Plain-text rendering of a Text, for logs and tests. Renderers do their own linking. */
export function textToString(text) {
    return text.t.replace(/\{(\d+)\}/g, (_, i) => formatFigure(text.f[Number(i)]));
}
/** Every Figure reachable from a value, by id. Used for the report's figure index. */
export function collectFigures(value, into = new Map()) {
    if (Array.isArray(value)) {
        for (const v of value)
            collectFigures(v, into);
    }
    else if (value && typeof value === "object") {
        const o = value;
        if (o.kind === "figure" && typeof o.id === "string") {
            const existing = into.get(o.id);
            if (existing && existing.value !== o.value)
                throw new Error(`Two figures share the id ${o.id} with different values`);
            into.set(o.id, o);
            return into;
        }
        for (const v of Object.values(o))
            collectFigures(v, into);
    }
    return into;
}
