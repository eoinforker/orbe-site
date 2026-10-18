/* Calendar months as "YYYY-MM-01" strings, the shape RevenueLine.month uses. */
const MONTH = /^(\d{4})-(\d{2})-01$/;
export const isMonth = (m) => {
    const r = MONTH.exec(m);
    return r !== null && Number(r[2]) >= 1 && Number(r[2]) <= 12;
};
export const assertMonth = (m) => {
    if (!isMonth(m))
        throw new Error(`Expected a month like 2026-09-01, got ${m}`);
};
const toIndex = (m) => {
    assertMonth(m);
    return Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
};
const fromIndex = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`;
export const addMonths = (m, n) => fromIndex(toIndex(m) + n);
/** Whole months from a to b; positive when b is later. */
export const monthsBetween = (a, b) => toIndex(b) - toIndex(a);
/** The month an ISO date falls in. */
export const monthOf = (iso) => `${iso.slice(0, 7)}-01`;
/** The n months ending with `last`, oldest first. */
export const monthWindow = (last, n) => Array.from({ length: n }, (_, i) => addMonths(last, i - n + 1));
export const addDays = (iso, days) => new Date(Date.parse(iso) + days * 864e5).toISOString();
