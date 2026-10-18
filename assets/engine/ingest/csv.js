/*
  An RFC 4180 CSV reader, plus the forgiving bits real exports need: a byte
  order mark, CRLF or LF or CR, quoted fields with commas, quotes and line
  breaks, semicolon or tab files from spreadsheet locales, and blank lines.
*/
import { InvalidInputError } from "./errors.js";
/** Picks the delimiter that appears most in the header line, outside quotes. */
export function detectDelimiter(text) {
    const firstLine = text.replace(/^﻿/, "").split(/\r\n|\n|\r/, 1)[0] ?? "";
    let best = ",";
    let bestCount = 0;
    for (const d of [",", ";", "\t"]) {
        let count = 0;
        let quoted = false;
        for (const ch of firstLine) {
            if (ch === '"')
                quoted = !quoted;
            else if (ch === d && !quoted)
                count++;
        }
        if (count > bestCount) {
            best = d;
            bestCount = count;
        }
    }
    return best;
}
/** Splits CSV text into records of fields. Throws on an unterminated quote, since the rest of the file would be misread. */
export function parseCsvRecords(text, delimiter = detectDelimiter(text)) {
    const src = text.replace(/^﻿/, "");
    const records = [];
    let cells = [];
    let field = "";
    let quoted = false;
    let wasQuoted = false;
    let line = 1;
    let recordLine = 1;
    const endField = () => {
        cells.push(wasQuoted ? field : field.trim());
        field = "";
        wasQuoted = false;
    };
    const endRecord = () => {
        endField();
        // A blank line is one empty, unquoted cell: skip it.
        if (!(cells.length === 1 && cells[0] === ""))
            records.push({ line: recordLine, cells });
        cells = [];
    };
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"') {
                if (src[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else
                    quoted = false;
            }
            else {
                if (ch === "\n" || (ch === "\r" && src[i + 1] !== "\n"))
                    line++;
                field += ch;
            }
            continue;
        }
        if (ch === '"' && field.trim() === "" && !wasQuoted) {
            quoted = true;
            wasQuoted = true;
            field = "";
        }
        else if (ch === delimiter) {
            endField();
        }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n")
                i++;
            endRecord();
            line++;
            recordLine = line;
        }
        else if (wasQuoted) {
            // Spaces after a closing quote are padding. Other text ("abc"def) is malformed; keep it rather than lose data.
            if (ch !== " " && ch !== "\t")
                field += ch;
        }
        else {
            field += ch;
        }
    }
    if (quoted)
        throw new InvalidInputError(`CSV: a quoted field opened on line ${recordLine} is never closed`);
    if (field !== "" || wasQuoted || cells.length > 0)
        endRecord();
    return records;
}
export function parseCsv(text) {
    const records = parseCsvRecords(text);
    if (records.length === 0)
        throw new InvalidInputError("CSV: the file is empty");
    const [head, ...rows] = records;
    return { header: head.cells, rows };
}
/** "Open rate (%)" and "open_rate" both become "openrate", so exports with tweaked headers still match. */
export const normaliseHeader = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
/**
  Finds each wanted column by its aliases. Returns an index per key, or -1.
  Exact normalised matches win over prefix matches, so "views" does not grab "viewsunique".
*/
export function mapColumns(header, aliases) {
    const norm = header.map(normaliseHeader);
    const out = {};
    for (const key of Object.keys(aliases)) {
        const wanted = aliases[key].map(normaliseHeader);
        out[key] = norm.findIndex((h) => wanted.includes(h));
    }
    return out;
}
/** Reads a cell as a number: "1,234", "12.5%", "" (null), "-" (null). */
export function cellNumber(cell) {
    if (cell === undefined)
        return null;
    const t = cell.trim().replace(/,/g, "").replace(/%$/, "");
    if (t === "" || t === "-" || t.toLowerCase() === "n/a")
        return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}
