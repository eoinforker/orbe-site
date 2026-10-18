/*
  Ids are derived from the platform's own ids, never random, so reading the
  same channel, video or month twice produces the same row and the store
  updates it instead of adding a duplicate.
*/
import { sha256Hex } from "../core/hash.js";
/** Same shape as core's random ids (prefix plus 20 hex) so they mix freely. */
export function stableId(prefix, ...parts) {
    const hash = sha256Hex(parts.join("\u001f"));
    return `${prefix}_${hash.slice(0, 20)}`;
}
/**
  An account is identified by its platform kind and platform id, not by the
  connector, so a channel read publicly and through Analytics is one account.
  Money-only sources (Stripe, Patreon, AdSense, invoices) key on their source.
*/
export const accountIdFor = (platform, platformId) => stableId("ac", platform, platformId);
export const workIdFor = (kind, platformWorkId) => stableId("wk", kind, platformWorkId);
export const revenueLineIdFor = (source, platformAccountId, month, stream, currency, key = "") => stableId("rv", source, platformAccountId, month, stream, currency, key);
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** True for a real calendar date in YYYY-MM-DD. */
export function isIsoDate(s) {
    const m = ISO_DATE.exec(s);
    if (!m)
        return false;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.toISOString().slice(0, 10) === s;
}
/**
  First day of the month, in UTC. A bare date string is taken at face value
  (no timezone shift); a timestamp or Date is read in UTC.
*/
export function monthOf(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}/.test(value) && value.length <= 10)
        return `${value.slice(0, 7)}-01`;
    const d = value instanceof Date ? value : new Date(typeof value === "number" ? value : Date.parse(value));
    if (Number.isNaN(d.getTime()))
        throw new RangeError(`Not a date: ${String(value)}`);
    return `${d.toISOString().slice(0, 7)}-01`;
}
export const addDays = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);
export const toIsoDate = (d) => d.toISOString().slice(0, 10);
/** Unix seconds for midnight UTC at the start of a date. */
export const unixStart = (isoDate) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 1000);
