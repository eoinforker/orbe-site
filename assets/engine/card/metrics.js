import { CHARS, WIDTHS } from "./metrics-data.js";
const INDEX = new Map([...CHARS].map((ch, i) => [ch, i]));
/** The average lower-case advance, used for characters we never measured (other scripts, emoji). */
const fallback = (face) => {
    const w = WIDTHS[face];
    let sum = 0;
    for (let c = 97; c <= 122; c++)
        sum += w[INDEX.get(String.fromCharCode(c))];
    return sum / 26;
};
const FALLBACK = {
    serif: fallback("serif"),
    serifItalic: fallback("serifItalic"),
    sans: fallback("sans"),
    sansMedium: fallback("sansMedium"),
    mono: fallback("mono"),
};
/** The width of a line of text in pixels, with tracking in pixels per character as SVG applies it. */
export function measure(text, face, size, tracking = 0) {
    let units = 0;
    let n = 0;
    for (const raw of text) {
        // A no-break space measures as a space.
        const ch = raw === "\u00a0" ? " " : raw;
        const i = INDEX.get(ch);
        // Wide characters (CJK, emoji) are about a full em; anything else unknown gets the average.
        units += i !== undefined ? WIDTHS[face][i] : (ch.codePointAt(0) ?? 0) > 0x2e80 ? 1000 : FALLBACK[face];
        n++;
    }
    return (units / 1000) * size + tracking * Math.max(0, n - 1);
}
/** The largest size, at most `max` and at least `min`, at which the text fits the width. */
export function fitSize(text, face, width, max, min, trackingEm = 0) {
    const at1 = measure(text, face, 1, trackingEm);
    if (at1 <= 0)
        return max;
    return Math.max(min, Math.min(max, Math.floor(width / at1)));
}
/**
  Breaks text into lines no wider than the width; a single word wider than the
  line is kept whole and cut later. Only ordinary spaces break: a no-break space
  keeps "86 in 100" on one line.
*/
export function wrap(text, face, size, width, tracking = 0) {
    const words = text.split(/[ \t\n\r]+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && measure(next, face, size, tracking) > width) {
            lines.push(line);
            line = word;
        }
        else {
            line = next;
        }
    }
    if (line)
        lines.push(line);
    return lines;
}
/** Shortens text with an ellipsis until it fits. */
export function truncate(text, face, size, width, tracking = 0) {
    if (measure(text, face, size, tracking) <= width)
        return text;
    const chars = [...text];
    while (chars.length > 1 && measure(chars.join("") + "…", face, size, tracking) > width)
        chars.pop();
    return chars.join("").trimEnd() + "…";
}
/** Wraps to at most `maxLines`, truncating the last line if the text runs over. */
export function clampLines(text, face, size, width, maxLines, tracking = 0) {
    const lines = wrap(text, face, size, width, tracking);
    if (lines.length <= maxLines)
        return lines.map((l) => truncate(l, face, size, width, tracking));
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = truncate(lines.slice(maxLines - 1).join(" "), face, size, width, tracking);
    return kept;
}
