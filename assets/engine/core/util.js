/** Prefixed ids read well in logs and URLs: cr_..., ac_..., wk_... */
export const id = (prefix) => `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
export const money = (pounds, currency = "GBP") => ({ amount: Math.round(pounds * 100), currency });
export const addMoney = (a, b) => {
    if (a.currency !== b.currency)
        throw new Error(`Cannot add ${a.currency} to ${b.currency}`);
    return { amount: a.amount + b.amount, currency: a.currency };
};
export const systemClock = () => new Date();
export const fixedClock = (iso) => () => new Date(iso);
export const DAY_MS = 864e5;
