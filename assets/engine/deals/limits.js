import { SPONSOR_FORMATS } from "../sponsor/formats.js";
import { FORMAT_WORDS, moneyText } from "./judge.js";
export const DEFAULT_LIMITS = {
    minimums: {},
    formats: [],
    avoidCategories: [],
    avoidBrands: [],
    exclusivityMaxDays: null,
    leadDays: 7,
    autoCounter: false,
    outreach: true,
    maxReadsPerMonth: null,
    blockedDates: [],
    accept: { mode: "ask" },
    autoDecline: true,
    tone: { style: "warm", signOff: "" },
    outbound: { on: false, perWeek: 3, autoSend: false },
    chase: true,
    modelDrafts: false,
};
export const TONE_STYLES = ["warm", "brief", "formal"];
/** The most date ranges a creator may block out. */
export const MAX_BLOCKED = 20;
/** The longest sign-off. */
export const MAX_SIGN_OFF = 40;
/** The most a minimum may be: £1,000,000 a placement, so a slip of the keyboard is caught. */
export const MAX_MINIMUM = 100_000_000;
export class LimitsError extends Error {
    problems;
    constructor(problems) {
        super(`The limits are not valid: ${problems.map((p) => `${p.path} ${p.message}`).join("; ")}`);
        this.name = "LimitsError";
        this.problems = problems;
    }
}
const words = (xs, path, problems) => {
    if (xs === undefined)
        return [];
    if (!Array.isArray(xs) || xs.length > 50 || !xs.every((x) => typeof x === "string" && x.trim().length > 0 && x.length <= 80)) {
        problems.push({ path, message: "must be a list of up to 50 names, each up to 80 characters" });
        return [];
    }
    return [...new Set(xs.map((x) => x.trim()))];
};
/** Checks limits as a creator sends them, filling what they leave out from the defaults. */
export function parseLimits(raw) {
    const r = (raw ?? {});
    const problems = [];
    const minimums = {};
    if (r.minimums !== undefined) {
        if (typeof r.minimums !== "object" || r.minimums === null || Array.isArray(r.minimums))
            problems.push({ path: "minimums", message: "must be an object of format to pence" });
        else
            for (const [k, v] of Object.entries(r.minimums)) {
                if (!SPONSOR_FORMATS.includes(k))
                    problems.push({ path: `minimums.${k}`, message: `is not a format; use ${SPONSOR_FORMATS.join(", ")}` });
                else if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_MINIMUM)
                    problems.push({ path: `minimums.${k}`, message: "must be whole pence from 0 to 100,000,000" });
                else if (v > 0)
                    minimums[k] = v;
            }
    }
    let formats = [];
    if (r.formats !== undefined) {
        if (!Array.isArray(r.formats) || !r.formats.every((f) => SPONSOR_FORMATS.includes(f)))
            problems.push({ path: "formats", message: `must list formats from ${SPONSOR_FORMATS.join(", ")}` });
        else
            formats = [...new Set(r.formats)];
    }
    const avoidCategories = words(r.avoidCategories, "avoidCategories", problems).map((c) => c.toLowerCase());
    const avoidBrands = words(r.avoidBrands, "avoidBrands", problems);
    let exclusivityMaxDays = DEFAULT_LIMITS.exclusivityMaxDays;
    if (r.exclusivityMaxDays !== undefined && r.exclusivityMaxDays !== null) {
        if (typeof r.exclusivityMaxDays !== "number" || !Number.isInteger(r.exclusivityMaxDays) || r.exclusivityMaxDays < 0 || r.exclusivityMaxDays > 365)
            problems.push({ path: "exclusivityMaxDays", message: "must be whole days from 0 to 365, or null" });
        else
            exclusivityMaxDays = r.exclusivityMaxDays;
    }
    let leadDays = DEFAULT_LIMITS.leadDays;
    if (r.leadDays !== undefined) {
        if (typeof r.leadDays !== "number" || !Number.isInteger(r.leadDays) || r.leadDays < 0 || r.leadDays > 120)
            problems.push({ path: "leadDays", message: "must be whole days from 0 to 120" });
        else
            leadDays = r.leadDays;
    }
    const bool = (k) => {
        if (r[k] === undefined)
            return DEFAULT_LIMITS[k];
        if (typeof r[k] !== "boolean")
            problems.push({ path: k, message: "must be true or false" });
        return r[k] === true;
    };
    let maxReadsPerMonth = DEFAULT_LIMITS.maxReadsPerMonth;
    if (r.maxReadsPerMonth !== undefined && r.maxReadsPerMonth !== null) {
        if (typeof r.maxReadsPerMonth !== "number" || !Number.isInteger(r.maxReadsPerMonth) || r.maxReadsPerMonth < 1 || r.maxReadsPerMonth > 60)
            problems.push({ path: "maxReadsPerMonth", message: "must be a whole number from 1 to 60, or null" });
        else
            maxReadsPerMonth = r.maxReadsPerMonth;
    }
    const out = {
        minimums,
        formats,
        avoidCategories,
        avoidBrands,
        exclusivityMaxDays,
        leadDays,
        autoCounter: bool("autoCounter"),
        outreach: bool("outreach"),
        maxReadsPerMonth,
        blockedDates: parseBlocked(r.blockedDates, problems),
        accept: parseAccept(r.accept, problems),
        autoDecline: bool("autoDecline"),
        tone: parseTone(r.tone, problems),
        outbound: parseOutbound(r.outbound, problems),
        chase: bool("chase"),
        modelDrafts: bool("modelDrafts"),
    };
    if (problems.length)
        throw new LimitsError(problems);
    return out;
}
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day written as YYYY-MM-DD. */
export const isIsoDay = (s) => typeof s === "string" && ISO_DAY.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
function parseBlocked(v, problems) {
    if (v === undefined || v === null)
        return [];
    if (!Array.isArray(v) || v.length > MAX_BLOCKED) {
        problems.push({ path: "blockedDates", message: `must be a list of up to ${MAX_BLOCKED} date ranges` });
        return [];
    }
    const out = [];
    v.forEach((x, i) => {
        if (!isObject(x) || !isIsoDay(x.start) || !isIsoDay(x.end))
            problems.push({ path: `blockedDates[${i}]`, message: "must have a start and an end, each a day written as 2026-12-20" });
        else if (x.end < x.start)
            problems.push({ path: `blockedDates[${i}].end`, message: "must be on or after the start" });
        else
            out.push({ start: x.start, end: x.end });
    });
    return out.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}
function parseAccept(v, problems) {
    if (v === undefined || v === null)
        return { mode: "ask" };
    if (!isObject(v) || (v.mode !== "ask" && v.mode !== "auto")) {
        problems.push({ path: "accept.mode", message: "must be ask or auto" });
        return { mode: "ask" };
    }
    if (v.mode === "ask")
        return { mode: "ask" };
    const before = problems.length;
    if (typeof v.above !== "number" || !Number.isInteger(v.above) || v.above < 1 || v.above > MAX_MINIMUM)
        problems.push({ path: "accept.above", message: "must be whole pence from 1 to 100,000,000" });
    if (typeof v.noticeShownAt !== "string" || !Number.isFinite(Date.parse(v.noticeShownAt)))
        problems.push({ path: "accept.noticeShownAt", message: "must be when the accept notice was shown: Orbe accepts for you only after you have read it" });
    if (problems.length > before)
        return { mode: "ask" };
    return { mode: "auto", above: v.above, noticeShownAt: new Date(Date.parse(v.noticeShownAt)).toISOString() };
}
function parseTone(v, problems) {
    if (v === undefined || v === null)
        return { ...DEFAULT_LIMITS.tone };
    if (!isObject(v)) {
        problems.push({ path: "tone", message: "must be an object with a style and a sign-off" });
        return { ...DEFAULT_LIMITS.tone };
    }
    let style = DEFAULT_LIMITS.tone.style;
    if (v.style !== undefined) {
        if (!TONE_STYLES.includes(v.style))
            problems.push({ path: "tone.style", message: `must be ${TONE_STYLES.join(", ")}` });
        else
            style = v.style;
    }
    let signOff = DEFAULT_LIMITS.tone.signOff;
    if (v.signOff !== undefined) {
        // No digits: every number in a draft must come from a fact.
        if (typeof v.signOff !== "string" || v.signOff.trim().length > MAX_SIGN_OFF || /[\d\r\n]/.test(v.signOff))
            problems.push({ path: "tone.signOff", message: `must be up to ${MAX_SIGN_OFF} characters on one line, with no digits` });
        else
            signOff = v.signOff.trim();
    }
    return { style, signOff };
}
function parseOutbound(v, problems) {
    if (v === undefined || v === null)
        return { ...DEFAULT_LIMITS.outbound };
    if (!isObject(v)) {
        problems.push({ path: "outbound", message: "must be an object with on and perWeek" });
        return { ...DEFAULT_LIMITS.outbound };
    }
    let on = DEFAULT_LIMITS.outbound.on;
    if (v.on !== undefined) {
        if (typeof v.on !== "boolean")
            problems.push({ path: "outbound.on", message: "must be true or false" });
        else
            on = v.on;
    }
    let perWeek = DEFAULT_LIMITS.outbound.perWeek;
    if (v.perWeek !== undefined) {
        if (typeof v.perWeek !== "number" || !Number.isInteger(v.perWeek) || v.perWeek < 1 || v.perWeek > 5)
            problems.push({ path: "outbound.perWeek", message: "must be a whole number from 1 to 5" });
        else
            perWeek = v.perWeek;
    }
    if (v.autoSend !== undefined && v.autoSend !== false)
        problems.push({ path: "outbound.autoSend", message: "must be false: every outbound email waits for you" });
    return { on, perWeek, autoSend: false };
}
/** Formats in the plural, for rules lines: "Set a floor for podcast reads". */
export const FORMAT_PLURAL = {
    integration: "integrations",
    dedicated: "dedicated videos",
    newsletter_slot: "newsletter slots",
    podcast_read: "podcast reads",
    stream_segment: "stream segments",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "20 December" from an ISO day or timestamp, read in UTC. */
export function dayText(iso) {
    const d = new Date(Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
/** "November" from "2026-11". */
export const monthText = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
/** "a, b and c". */
export const listText = (xs) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
/** The rules card's lines, in plain words. */
export function summariseRules(l) {
    const lines = [];
    const floors = Object.entries(l.minimums).map(([f, p]) => `${moneyText({ amount: p, currency: "GBP" })} ${FORMAT_WORDS[f]}`);
    lines.push(floors.length ? `Floors: ${floors.join(", ")}.` : "No floors yet: Orbe asks you about every price.");
    if (l.formats.length)
        lines.push(`Only ${listText(l.formats.map((f) => FORMAT_PLURAL[f]))}.`);
    const never = [...l.avoidCategories, ...l.avoidBrands];
    if (never.length)
        lines.push(`Never: ${never.join(", ")}.`);
    const when = [];
    if (l.maxReadsPerMonth !== null)
        when.push(`Up to ${l.maxReadsPerMonth} ${l.maxReadsPerMonth === 1 ? "read" : "reads"} a month.`);
    if (l.blockedDates.length)
        when.push(`Away ${listText(l.blockedDates.map((b) => (b.start === b.end ? dayText(b.start) : `${dayText(b.start)} to ${dayText(b.end)}`)))}.`);
    when.push(`${l.leadDays} ${l.leadDays === 1 ? "day's" : "days'"} notice.`);
    lines.push(when.join(" "));
    const acts = [l.autoCounter ? "Counters for you." : "Asks before countering."];
    acts.push(l.accept.mode === "auto" ? `Accepts for you at or above ${moneyText({ amount: l.accept.above, currency: "GBP" })}.` : "Always asks before accepting.");
    if (!l.autoDecline)
        acts.push("Asks before declining.");
    lines.push(acts.join(" "));
    return lines;
}
