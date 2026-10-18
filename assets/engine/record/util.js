/*
  Small helpers the record needs: calendar months, plain statistics, and
  formatting for people. Months are always the first day, "YYYY-MM-01", in UTC,
  matching RevenueLine.month in core.
*/
import { DAY_MS } from "../core/util.js";
const MONTH = /^(\d{4})-(\d{2})/;
/** The month an ISO date or month string belongs to, as "YYYY-MM-01". */
export function monthOf(iso) {
    const m = MONTH.exec(iso);
    if (!m)
        throw new Error(`Not an ISO date: ${iso}`);
    return `${m[1]}-${m[2]}-01`;
}
export function monthOfDate(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
export function addMonths(month, n) {
    const m = MONTH.exec(month);
    if (!m)
        throw new Error(`Not a month: ${month}`);
    const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + n;
    const y = Math.floor(total / 12);
    const mo = total - y * 12 + 1;
    return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-01`;
}
/** Whole months from a to b: 0 when equal, negative when b is earlier. */
export function monthDiff(a, b) {
    const ma = MONTH.exec(a);
    const mb = MONTH.exec(b);
    if (!ma || !mb)
        throw new Error(`Not months: ${a}, ${b}`);
    return (Number(mb[1]) - Number(ma[1])) * 12 + (Number(mb[2]) - Number(ma[2]));
}
/** Inclusive list of months from `from` to `to`. Empty when `to` is before `from`. */
export function monthRange(from, to) {
    const out = [];
    for (let i = 0, n = monthDiff(from, to); i <= n; i++)
        out.push(addMonths(from, i));
    return out;
}
/** 1 to 12. */
export const calendarMonth = (month) => Number(month.slice(5, 7));
export const daysBetween = (fromIso, to) => ((typeof to === "string" ? Date.parse(to) : to.getTime()) - Date.parse(fromIso)) / DAY_MS;
export const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs) => (xs.length ? sum(xs) / xs.length : 0);
export function median(xs) {
    if (!xs.length)
        return 0;
    const s = [...xs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export function stdev(xs) {
    if (xs.length < 2)
        return 0;
    const m = mean(xs);
    return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}
/** Least-squares slope of ys against 0, 1, 2, ... */
export function slope(ys) {
    const n = ys.length;
    if (n < 2)
        return 0;
    const mx = (n - 1) / 2;
    const my = mean(ys);
    let num = 0;
    let den = 0;
    ys.forEach((y, x) => {
        num += (x - mx) * (y - my);
        den += (x - mx) ** 2;
    });
    return den ? num / den : 0;
}
/** Relative gap between two amounts, measured against the larger, 0 to 1. */
export function relativeGap(a, b) {
    const base = Math.max(Math.abs(a), Math.abs(b));
    return base === 0 ? 0 : Math.abs(a - b) / base;
}
export const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };
/** Whole units with thousands separators: "£12,340". Negative as "-£120". */
export function formatMoney(minor, currency) {
    const whole = Math.round(Math.abs(minor) / 100);
    return `${minor < 0 ? "-" : ""}${SYMBOL[currency]}${whole.toLocaleString("en-GB")}`;
}
export function formatPercent(fraction, dp = 1) {
    return `${(fraction * 100).toFixed(dp)}%`;
}
export const formatCount = (n) => Math.round(n).toLocaleString("en-GB");
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Mar 2026". */
export const formatMonth = (month) => `${MONTH_NAMES[calendarMonth(month) - 1]} ${month.slice(0, 4)}`;
/** "18 Oct 2026". */
export function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** Counterparty names as people type them: "ACME Ltd." and "Acme Limited" are one company. */
export function normaliseName(name) {
    return name
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\b(ltd|limited|inc|llc|plc|gmbh|co|corp|corporation|the|uk|group)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
export function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
/** Deterministic, readable slug for figure and finding ids. */
export const slug = (s) => s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
