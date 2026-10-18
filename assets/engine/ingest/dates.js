/*
  Dates typed by people or spreadsheets: 2026-09-14, 14/09/2026, 14 Sep 2026,
  or a full timestamp. Slashed dates are day first by default, as in the UK;
  a US file says so with "mdy". Two-digit years are refused rather than guessed.
*/
import { isIsoDate } from "./ids.js";
const pad = (n) => String(n).padStart(2, "0");
/** A calendar date, YYYY-MM-DD, or null when the text is not one. */
export function parseLooseDate(text, order = "dmy") {
    const t = text.trim();
    if (!t)
        return null;
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(t);
    if (m && !/[T ]/.test(t)) {
        const iso = `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
        return isIsoDate(iso) ? iso : null;
    }
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
    if (m) {
        const [a, b] = [Number(m[1]), Number(m[2])];
        const [day, month] = order === "dmy" ? [a, b] : [b, a];
        const iso = `${m[3]}-${pad(month)}-${pad(day)}`;
        return isIsoDate(iso) ? iso : null;
    }
    if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2}$/.test(t))
        return null;
    // Month names and timestamps: let the engine read them, then take the UTC calendar date.
    if (!/[a-zA-Z]{3}|T\d|\d:\d/.test(t))
        return null;
    const ms = Date.parse(/[a-zA-Z]{3}/.test(t) && !/(Z|[+-]\d{2}:?\d{2}|GMT|UTC)$/.test(t) && !/\d:\d/.test(t) ? `${t} UTC` : t);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
}
