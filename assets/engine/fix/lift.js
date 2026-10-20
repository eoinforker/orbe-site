import { sha256Hex } from "../core/hash.js";
import { DAY_MS, money } from "../core/util.js";
import { canonicalJSON } from "../loop/predict.js";
import { maturedShare } from "../rating/measure.js";
import { specFor } from "../rating/rate.js";
import { FIX_KIND } from "./diagnose.js";
export const FIX_VERSION = "fix-1";
/** PROVISIONAL: judge no sooner than two days after the change. */
export const MIN_WINDOW_DAYS = 2;
/** PROVISIONAL: a fix counts as a lift only if it added at least 15% more views than the baseline. */
export const LIFT_MIN = 0.15;
/** PROVISIONAL: the fee for a kept fix. Nothing is charged for a fix that is undone or did not lift. */
export const FIX_FEE = money(5, "GBP");
/** The share of an upload's eventual views expected by this age, on the rating's curve for YouTube views. */
export function viewsShare(ageDays) {
    const m = specFor(FIX_KIND).metrics.find((x) => x.key === "views")?.maturity;
    return maturedShare(m, ageDays);
}
export function sealBaseline(body) {
    return { ...body, seal: sha256Hex(canonicalJSON(body)) };
}
export function verifyBaseline(b) {
    const { seal, ...body } = b;
    return sha256Hex(canonicalJSON(body)) === seal;
}
export const BASELINE_RULE = "views added without the change = viewsAtChange / share(ageAtChange) * (share(ageNow) - share(ageAtChange)), share from the rating's YouTube views maturity";
/** Views the upload would have added between the change and `at` without it. */
export function expectedGain(b, at) {
    const pub = Date.parse(b.publishedAt);
    const a0 = (Date.parse(b.madeAt) - pub) / DAY_MS;
    const a1 = (Date.parse(at) - pub) / DAY_MS;
    return (b.viewsAtChange / viewsShare(a0)) * Math.max(0, viewsShare(a1) - viewsShare(a0));
}
export function judgeLift(b, at, viewsNow) {
    if (!verifyBaseline(b))
        return { status: "tampered", expectedGain: null, actualGain: null, lift: null, extraViews: null, fee: null, text: "The sealed baseline has been changed since it was made, so this fix cannot be judged or charged." };
    const windowDays = (Date.parse(at) - Date.parse(b.madeAt)) / DAY_MS;
    if (!(windowDays >= MIN_WINDOW_DAYS))
        return { status: "too_soon", expectedGain: null, actualGain: null, lift: null, extraViews: null, fee: null, text: `Too soon: judged ${MIN_WINDOW_DAYS} days after the change.` };
    const expected = expectedGain(b, at);
    const actual = Math.max(0, viewsNow - b.viewsAtChange);
    const lift = expected > 0 ? actual / expected - 1 : actual > 0 ? Infinity : 0;
    const extra = Math.round(actual - expected);
    const fmt = (n) => Math.round(n).toLocaleString("en-GB");
    if (lift >= LIFT_MIN) {
        return { status: "lifted", expectedGain: expected, actualGain: actual, lift, extraViews: extra, fee: FIX_FEE, text: `Kept: ${fmt(actual)} views since the change against ${fmt(expected)} expected without it (${Number.isFinite(lift) ? `+${Math.round(lift * 100)}%` : "from none"}).` };
    }
    return { status: "no_lift", expectedGain: expected, actualGain: actual, lift, extraViews: extra, fee: null, text: `No clear lift: ${fmt(actual)} views since the change against ${fmt(expected)} expected without it. The old title and thumbnail go back; no fee.` };
}
