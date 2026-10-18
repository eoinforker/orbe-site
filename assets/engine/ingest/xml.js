/*
  A small, strict XML reader for feeds. It handles elements, attributes,
  text, CDATA, comments, processing instructions and a DOCTYPE (skipped).
  It never expands DTD entities, so entity-expansion attacks have nothing to
  expand. Names keep their prefix (itunes:duration), which is how feeds are
  read in practice: prefixes in podcast feeds are conventional and stable.
*/
import { InvalidInputError } from "./errors.js";
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, ref) => {
        if (ref[0] === "#") {
            const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
            return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
        }
        // Unknown named entities (HTML ones in sloppy feeds) are left as written rather than guessed.
        return NAMED[ref] ?? whole;
    });
}
const NAME = /[A-Za-z_:][-A-Za-z0-9_:.]*/y;
const fail = (msg, at) => {
    throw new InvalidInputError(`XML: ${msg} at offset ${at}`);
};
export function parseXml(src) {
    const text = src.replace(/^﻿/, "");
    const root = { name: "#document", attrs: {}, children: [], text: "" };
    const stack = [root];
    let i = 0;
    const top = () => stack[stack.length - 1];
    while (i < text.length) {
        const lt = text.indexOf("<", i);
        if (lt === -1) {
            top().text += decodeEntities(text.slice(i));
            break;
        }
        if (lt > i)
            top().text += decodeEntities(text.slice(i, lt));
        i = lt;
        if (text.startsWith("<!--", i)) {
            const end = text.indexOf("-->", i + 4);
            if (end === -1)
                fail("unterminated comment", i);
            i = end + 3;
        }
        else if (text.startsWith("<![CDATA[", i)) {
            const end = text.indexOf("]]>", i + 9);
            if (end === -1)
                fail("unterminated CDATA", i);
            top().text += text.slice(i + 9, end);
            i = end + 3;
        }
        else if (text.startsWith("<?", i)) {
            const end = text.indexOf("?>", i + 2);
            if (end === -1)
                fail("unterminated processing instruction", i);
            i = end + 2;
        }
        else if (text.startsWith("<!", i)) {
            // DOCTYPE, possibly with an internal subset in brackets. Skipped, never interpreted.
            let depth = 0;
            let j = i + 2;
            for (; j < text.length; j++) {
                if (text[j] === "[")
                    depth++;
                else if (text[j] === "]")
                    depth--;
                else if (text[j] === ">" && depth <= 0)
                    break;
            }
            if (j >= text.length)
                fail("unterminated declaration", i);
            i = j + 1;
        }
        else if (text[i + 1] === "/") {
            NAME.lastIndex = i + 2;
            const m = NAME.exec(text);
            if (!m)
                fail("bad closing tag", i);
            const name = m[0];
            const end = text.indexOf(">", NAME.lastIndex);
            if (end === -1)
                fail("unterminated closing tag", i);
            const open = stack.pop();
            if (!open || open === root || open.name !== name)
                fail(`</${name}> does not match <${open?.name ?? "nothing"}>`, i);
            i = end + 1;
        }
        else {
            NAME.lastIndex = i + 1;
            const m = NAME.exec(text);
            if (!m)
                fail("bad tag", i);
            const el = { name: m[0], attrs: {}, children: [], text: "" };
            let j = NAME.lastIndex;
            let selfClosing = false;
            for (;;) {
                while (j < text.length && /\s/.test(text[j]))
                    j++;
                if (j >= text.length)
                    fail(`unterminated <${el.name}>`, i);
                if (text[j] === ">") {
                    j++;
                    break;
                }
                if (text.startsWith("/>", j)) {
                    selfClosing = true;
                    j += 2;
                    break;
                }
                NAME.lastIndex = j;
                const a = NAME.exec(text);
                if (!a)
                    fail(`bad attribute in <${el.name}>`, j);
                j = NAME.lastIndex;
                while (/\s/.test(text[j] ?? ""))
                    j++;
                if (text[j] !== "=")
                    fail(`attribute ${a[0]} without a value`, j);
                j++;
                while (/\s/.test(text[j] ?? ""))
                    j++;
                const q = text[j];
                if (q !== '"' && q !== "'")
                    fail(`unquoted attribute ${a[0]}`, j);
                const close = text.indexOf(q, j + 1);
                if (close === -1)
                    fail(`unterminated attribute ${a[0]}`, j);
                el.attrs[a[0]] = decodeEntities(text.slice(j + 1, close));
                j = close + 1;
            }
            top().children.push(el);
            if (!selfClosing)
                stack.push(el);
            i = j;
        }
    }
    if (stack.length > 1)
        fail(`<${top().name}> is never closed`, text.length);
    const docRoot = root.children[0];
    if (!docRoot)
        fail("no root element", 0);
    return docRoot;
}
export const child = (el, name) => el?.children.find((c) => c.name === name);
export const childrenNamed = (el, name) => el?.children.filter((c) => c.name === name) ?? [];
/** Trimmed text of the first child with this name, or undefined when absent or blank. */
export function childText(el, name) {
    const t = child(el, name)?.text.trim();
    return t ? t : undefined;
}
