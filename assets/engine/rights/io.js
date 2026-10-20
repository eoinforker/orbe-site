/*
  Files: the record as JSON (the open format) and the expiry dates as an
  iCalendar file (RFC 5545) for any calendar app.
*/
import { timeMs } from "./canon.js";
import { verifyChain } from "./chain.js";
import { currentState, endLabel } from "./state.js";
import { checkRecordShape } from "./validate.js";
/** The record as pretty-printed JSON. Hashes are over canonical JSON, so the layout here does not matter. */
export function exportJson(record) {
    return `${JSON.stringify(record, null, 2)}\n`;
}
/** Read a record: parse, check every field, verify the chain, replay it. Errors say what is wrong and where. */
export function importJson(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (err) {
        return { ok: false, errors: [`Not JSON: ${err.message}`] };
    }
    const errors = checkRecordShape(parsed);
    if (errors.length)
        return { ok: false, errors: errors.slice(0, 50) };
    const record = parsed;
    const chain = verifyChain(record.events);
    if (!chain.ok)
        return { ok: false, errors: [`The chain is broken at event ${chain.seq}: ${chain.reason}`] };
    return { ok: true, record, state: currentState(record.events) };
}
/* ---------------------------------------------------------------- iCalendar */
const icsText = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateOnly = (d) => d.replace(/-/g, "");
/** Fold a content line at 75 octets, as RFC 5545 asks, never splitting a character. */
function fold(line) {
    const enc = new TextEncoder();
    const out = [];
    let cur = "";
    let size = 0;
    for (const ch of line) {
        const n = enc.encode(ch).length;
        if (size + n > (out.length ? 74 : 75)) {
            out.push(cur);
            cur = "";
            size = 0;
        }
        cur += ch;
        size += n;
    }
    out.push(cur);
    return out.join("\r\n ");
}
/**
  One event per grant end: an all-day event on the last day for a bare-date end,
  or a 15-minute event at the instant otherwise, with a reminder `alarmDays`
  before (14 by default). Revoked grants are left out. Stable UIDs, so a
  re-import updates rather than duplicates.
*/
export function expiryCalendar(grants, opts) {
    const now = timeMs(opts.now);
    const alarm = opts.alarmDays ?? 14;
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Orbe//Rights Record v0//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText(opts.name ?? "Usage rights expiring")}`];
    const live = grants.filter((g) => !(g.revokedAt && timeMs(g.revokedAt) <= now)).sort((a, b) => timeMs(a.end, "end") - timeMs(b.end, "end") || a.id.localeCompare(b.id));
    for (const g of live) {
        const title = opts.titleOf ? opts.titleOf(g) : `Usage right ends: ${g.work} for ${g.brand}`;
        lines.push("BEGIN:VEVENT", `UID:${g.id}@orbe-rights-record`, `DTSTAMP:${stamp(now)}`);
        if (g.end.length === 10) {
            const next = new Date(timeMs(g.end, "end")).toISOString().slice(0, 10);
            lines.push(`DTSTART;VALUE=DATE:${dateOnly(g.end)}`, `DTEND;VALUE=DATE:${dateOnly(next)}`);
        }
        else {
            lines.push(`DTSTART:${stamp(timeMs(g.end))}`, "DURATION:PT15M");
        }
        lines.push(`SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(`Grant ${g.id}. Channels: ${g.channels.join(", ")}. Media: ${g.media}. Territory: ${g.territory.join(", ")}. Ends ${endLabel(g)}${g.end.length === 10 ? " (last day)" : ""}.`)}`, "TRANSP:TRANSPARENT", "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(title)}`, `TRIGGER:-P${alarm}D`, "END:VALARM", "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return `${lines.map(fold).join("\r\n")}\r\n`;
}
