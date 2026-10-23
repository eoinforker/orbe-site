/** A plain thousands grouping that does not depend on the host's locale data. */
export function grouped(n, dp = 0) {
    const fixed = Math.abs(n).toFixed(dp);
    const [whole, frac] = fixed.split(".");
    const g = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${n < 0 && Number(fixed) !== 0 ? "-" : ""}${g}${frac ? `.${frac}` : ""}`;
}
/** A multiple to one decimal place: 1.43 reads "1.4". Never "1.0" for a real difference; that reads "about the same". */
export const times = (x) => x.toFixed(x >= 10 ? 0 : 1);
export const pct = (x) => `${(x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0)}%`;
/** A metric value in sentences, in its own unit. Money arrives in minor units. */
export function metricValue(unit, x) {
    switch (unit) {
        case "count":
            return grouped(Math.round(x));
        case "hours":
            return grouped(x, x < 10 ? 1 : 0);
        case "ratio":
            return pct(x);
        case "minor_units":
            return grouped(x / 100, 2);
    }
}
export const plural = (noun, n) => (n === 1 ? noun : noun.endsWith("s") ? noun : `${noun}s`);
/** "first hour", "first 6 hours", "first day", "first 3 days". */
export function ageWords(hours) {
    if (hours < 1.5)
        return "first hour";
    if (hours < 22)
        return `first ${Math.round(hours)} hours`;
    const days = hours / 24;
    if (days < 1.5)
        return "first day";
    if (days < 13.5)
        return `first ${Math.round(days)} days`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "first week" : `first ${weeks} weeks`;
}
export const ordinal = (n) => {
    const words = ["", "", "second", "third", "fourth", "fifth"];
    if (n >= 2 && n <= 5)
        return words[n];
    const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
    return `${n}${s}`;
};
export const minutes = (sec) => {
    const m = Math.round(sec / 60);
    if (m < 90)
        return `${m} ${plural("minute", m)}`;
    return `${Number((sec / 3600).toFixed(1))} hours`;
};
/** What one work is called, plural, when no format noun is to hand. */
export const WORKS_NOUN = {
    youtube: "uploads",
    substack: "issues",
    twitch: "streams",
    podcast: "episodes",
    photography: "photo sets",
};
export const WORK_NOUN = {
    youtube: "upload",
    substack: "issue",
    twitch: "stream",
    podcast: "episode",
    photography: "photo set",
};
export const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** Copy must never carry an em or en dash. The last line of defence before text leaves the module. */
export function assertPlain(text) {
    if (/[\u2013\u2014]/.test(text))
        throw new Error(`Copy must not contain em or en dashes: ${text}`);
    return text;
}
/** Model output is cleaned rather than trusted: dashes become commas or "to", so copy stays house style. */
export function plainify(text) {
    return text
        .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2")
        .replace(/\s*[\u2013\u2014]\s*/g, ", ")
        .replace(/,\s*,/g, ",")
        .trim();
}
/** Quote a title for a sentence, shortened if long. */
export const quoted = (title, max = 60) => {
    const t = title.trim();
    return `"${t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t}"`;
};
/** "Downloads in 7 days" reads "downloads" in a sentence; the window is in the age words already. */
export const metricWords = (name) => name.replace(/\s+in \d+ days?$/i, "").toLowerCase();
/** A topic's defining words as a phrase: ["budget", "travel", "lisbon"] reads "budget and travel". */
export const topicWords = (terms) => (terms.length > 1 ? `${terms[0]} and ${terms[1]}` : (terms[0] ?? "this topic"));
