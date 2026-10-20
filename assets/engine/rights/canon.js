/*
  Canonical JSON and time for the rights record. Both must give the same answer
  in every implementation, because the hash of an event is taken over its
  canonical JSON and every check compares instants.
*/
/**
  Canonical JSON: object keys sorted by UTF-16 code unit, no whitespace,
  strings escaped as ECMAScript JSON.stringify does, numbers only as safe
  integers, keys whose value is undefined left out. Anything else throws.
*/
export function canonical(v) {
    if (v === null)
        return "null";
    switch (typeof v) {
        case "string":
            return JSON.stringify(v);
        case "boolean":
            return v ? "true" : "false";
        case "number":
            if (!Number.isSafeInteger(v))
                throw new Error(`Canonical JSON takes safe integers only, not ${v}`);
            return String(v === 0 ? 0 : v);
        case "object": {
            if (Array.isArray(v))
                return `[${v.map((x) => canonical(x === undefined ? null : x)).join(",")}]`;
            const o = v;
            const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
            return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
        }
        default:
            throw new Error(`Canonical JSON cannot hold a ${typeof v}`);
    }
}
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/;
const DAY = 86_400_000;
const realDate = (y, m, d) => {
    const t = Date.UTC(y, m - 1, d);
    const x = new Date(t);
    return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d ? t : null;
};
export const isDate = (s) => typeof s === "string" && DATE.test(s) && realDate(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10)) !== null;
export const isInstant = (s) => typeof s === "string" && instantMs(s) !== null;
export const isTime = (s) => isDate(s) || isInstant(s);
/** Milliseconds for an RFC 3339 instant with an offset, or null. Leap seconds are not accepted. */
export function instantMs(s) {
    const m = INSTANT.exec(s);
    if (!m)
        return null;
    const day = realDate(+m[1], +m[2], +m[3]);
    const h = +m[4], mi = +m[5], sec = m[6] ? +m[6] : 0, ms = m[7] ? +m[7].padEnd(3, "0") : 0;
    if (day === null || h > 23 || mi > 59 || sec > 59)
        return null;
    let off = 0;
    if (m[8] !== "Z") {
        const oh = +m[8].slice(1, 3), om = +m[8].slice(4, 6);
        if (oh > 23 || om > 59)
            return null;
        off = (m[8][0] === "+" ? 1 : -1) * (oh * 60 + om) * 60_000;
    }
    return day + ((h * 60 + mi) * 60 + sec) * 1000 + ms - off;
}
/**
  A grant bound or a query time, in milliseconds. A bare date is read in UTC:
  as a start or a point it is that day's first instant; as an end it is
  inclusive, so it means the first instant of the next day (ends are exclusive).
*/
export function timeMs(s, edge = "point") {
    const d = DATE.exec(s);
    if (d) {
        const t = realDate(+d[1], +d[2], +d[3]);
        if (t === null)
            throw new Error(`Not a real date: ${s}`);
        return edge === "end" ? t + DAY : t;
    }
    const t = instantMs(s);
    if (t === null)
        throw new Error(`Not an RFC 3339 time with an offset: ${s}`);
    return t;
}
export const iso = (ms) => new Date(ms).toISOString();
export const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
/** Whole days from a to b, rounded up (a part day counts as a day). */
export const daysBetween = (a, b) => Math.ceil((b - a) / DAY);
export { DAY };
