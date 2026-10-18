/*
  Pence arithmetic for the money side. Every amount here is an integer number of
  minor units, and every rate is in basis points (1% = 100 bps), so the fee maths
  is exact and a test can pin it to the penny.
*/
export const BPS = 10_000;
/** £ to pence, for constants and tests. Throws on fractions of a penny so a typo cannot hide. */
export const pounds = (n) => {
    const p = Math.round(n * 100);
    if (Math.abs(p - n * 100) > 1e-6)
        throw new Error(`£${n} is not a whole number of pence`);
    return p;
};
export const assertPence = (n, what = "amount") => {
    if (!Number.isSafeInteger(n))
        throw new Error(`${what} must be a whole number of pence, got ${n}`);
};
/** amount × rate, rounded half up to the penny. Exact for any amount a creator deal could reach. */
export const applyBps = (amount, bps) => {
    assertPence(amount);
    if (!Number.isInteger(bps) || bps < 0)
        throw new Error(`Rate must be whole basis points, got ${bps}`);
    const product = amount * bps;
    if (!Number.isSafeInteger(product))
        return Number((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
    return Math.floor((product + 5000) / BPS);
};
export const gbp = (amount) => ({ amount, currency: "GBP" });
export const sameCurrency = (a, b) => {
    if (a.currency !== b.currency)
        throw new Error(`Cannot combine ${a.currency} with ${b.currency}`);
};
export const sumMoney = (items, currency) => {
    let amount = 0;
    for (const m of items) {
        if (m.currency !== currency)
            throw new Error(`Cannot combine ${m.currency} with ${currency}`);
        amount += m.amount;
    }
    return { amount, currency };
};
const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };
/** "£220,000" or "£1,234.56": whole pounds are shown without pence. */
export const formatMoney = (m) => {
    const sign = m.amount < 0 ? "-" : "";
    const abs = Math.abs(m.amount);
    const whole = Math.floor(abs / 100).toLocaleString("en-GB");
    const pence = abs % 100;
    return `${sign}${SYMBOL[m.currency]}${whole}${pence ? `.${String(pence).padStart(2, "0")}` : ""}`;
};
/** "£220k", "£1.2M": for ranges and bands, where false precision would mislead. */
export const formatCompact = (m) => {
    const s = SYMBOL[m.currency];
    const p = m.amount / 100;
    const sign = p < 0 ? "-" : "";
    const a = Math.abs(p);
    if (a >= 1e6)
        return `${sign}${s}${trim((a / 1e6).toFixed(2))}M`;
    if (a >= 1e3)
        return `${sign}${s}${trim((a / 1e3).toFixed(1))}k`;
    return `${sign}${s}${Math.round(a)}`;
};
const trim = (x) => x.replace(/\.?0+$/, "");
/** Round to the nearest `step` pence; used to keep indicative figures honest about their precision. */
export const roundTo = (amount, step) => Math.round(amount / step) * step;
export const pct = (x, dp = 0) => `${(x * 100).toFixed(dp)}%`;
