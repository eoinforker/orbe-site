/*
  Small helpers the sponsor module needs. Market and record each have their own
  copies of some of these; they are kept local so this module depends on core
  only (see CORE-REQUESTS.md).
*/
import { DAY_MS } from "../core/util.js";
export const BPS = 10_000;
export const assertPence = (n, what = "amount") => {
    if (!Number.isSafeInteger(n))
        throw new Error(`${what} must be a whole number of minor units, got ${n}`);
};
/** amount × rate in basis points, rounded half up to the penny. BigInt for amounts too large for exact floats. */
export const applyBps = (amount, bps) => {
    assertPence(amount);
    if (!Number.isInteger(bps) || bps < 0)
        throw new Error(`Rate must be whole basis points, got ${bps}`);
    const product = amount * bps;
    if (!Number.isSafeInteger(product))
        return Number((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
    return Math.floor((product + 5000) / BPS);
};
export const sameCurrency = (a, b) => {
    if (a.currency !== b.currency)
        throw new Error(`Cannot combine ${a.currency} with ${b.currency}`);
};
export const zero = (currency) => ({ amount: 0, currency });
const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };
/** "£2,400" or "£1,234.56": whole amounts are shown without pence. */
export const formatMoney = (m) => {
    const sign = m.amount < 0 ? "-" : "";
    const abs = Math.abs(m.amount);
    const whole = Math.floor(abs / 100).toLocaleString("en-GB");
    const pence = abs % 100;
    return `${sign}${SYMBOL[m.currency]}${whole}${pence ? `.${String(pence).padStart(2, "0")}` : ""}`;
};
export const formatCount = (n) => Math.round(n).toLocaleString("en-GB");
export const addDays = (iso, days) => new Date(Date.parse(iso) + days * DAY_MS).toISOString();
/** Whole and fractional days from a to b. */
export const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY_MS;
export const assertIso = (s, what) => {
    if (typeof s !== "string" || Number.isNaN(Date.parse(s)))
        throw new Error(`${what} must be an ISO date, got ${s}`);
};
/** Linear-interpolated quantile of an unsorted list; NaN for an empty one. */
export function quantile(values, q) {
    if (values.length === 0)
        return Number.NaN;
    const s = [...values].sort((a, b) => a - b);
    const pos = (s.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (values) => quantile(values, 0.5);
export const entry = (at, actor, action, subject, detail) => detail ? { at, actor, action, subject, detail } : { at, actor, action, subject };
export const SYSTEM = { role: "system", id: "system" };
/** A typed error the API can map to a 409 or 422: the request broke a business rule, not the server. */
export class SponsorError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "SponsorError";
        this.code = code;
    }
}
export const fail = (code, message) => {
    throw new SponsorError(code, message);
};
