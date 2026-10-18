import { againstLine, wordsFor } from "./words.js";
// Imported from the file, not rating/index.ts, so the browser card does not pull in the Node-only maths renderer.
import { RATING_LABEL } from "../rating/label.js";
export const MOMENTS = ["best", "rating", "season", "size"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-10-18T12:00:00Z" reads "October 2026"; an unreadable date reads as nothing rather than "Invalid Date". */
export function monthOf(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** Two decimals, always signed, with a true minus so a negative rating is not mistaken for a dash. */
export function figureOf(rating) {
    const r = Math.round(rating * 100) / 100;
    if (r === 0)
        return "0.00";
    return `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}`;
}
/** Handles are stored without the @ by some modules and with it by others; the card always shows one. */
export function normaliseHandle(handle) {
    const bare = handle.trim().replace(/^@+/, "").replace(/\s+/g, "");
    return bare ? `@${bare}` : "";
}
/**
  Splits a display value into the figure and its words, so the figure can be
  set large: "58% opened" into "58%" and "opened"; "1.4x the first week" into "1.4×".
*/
export function splitValue(value) {
    const m = /^([+\-−]?\d[\d.,]*(?:\s?%|x|×)?)(?:\s+(.*))?$/.exec(value.trim());
    if (!m)
        return { lead: value.trim(), rest: "" };
    return { lead: m[1].replace(/x$/, "×").replace(/\s%$/, "%"), rest: (m[2] ?? "").trim() };
}
/** The highest-scoring part, ties going to the heavier part listed first. */
export function topPart(parts) {
    let best = null;
    for (const p of parts)
        if (!best || p.score > best.score)
            best = p;
    return best;
}
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const count = (n) => COUNT_WORDS[n] ?? String(n);
const times = (m) => `${m.toFixed(1)}×`;
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
/** Accepts only pictures that cannot reach anywhere unexpected: an image data URI or an https URL. */
export function safeImage(image) {
    if (!image || typeof image.href !== "string")
        return null;
    const href = image.href.trim();
    const ok = /^data:image\/(png|jpeg|webp|gif|svg\+xml)(;[a-z0-9=._+-]+)*,[A-Za-z0-9+/=%._~-]*$/i.test(href) || /^https:\/\/[^\s"'<>()\\]+$/i.test(href);
    return ok ? { href, alt: image.alt?.trim() || undefined } : null;
}
/** The newest matured works, at most twelve. */
function recent(works) {
    const matured = works.filter((w) => w.matured !== false && Number.isFinite(w.multiple) && w.multiple >= 0);
    return [...matured].sort((a, b) => (a.ageDays ?? 0) - (b.ageDays ?? 0)).slice(0, 12);
}
/** The personal best, or the best of the last twelve when there is none worth saying. */
function bestMoment(o, w) {
    const pb = o.personalBest;
    if (pb) {
        const label = pb.label.trim().replace(/\.$/, "");
        const sentence = /^best\b/i.test(label) ? `My ${lowerFirst(label)} yet.` : `New personal best: ${lowerFirst(label)}.`;
        const prev = pb.best.previous;
        const hasPrev = prev !== null && Number.isFinite(prev) && prev > 0;
        return {
            moment: "best",
            sentence,
            stat: { lead: pb.value, rest: hasPrev && pb.previous ? `past my old best of ${pb.previous}` : hasPrev ? `past my old best` : "my first record" },
            key: hasPrev ? "One lap: my old best." : "One lap: my first record.",
            turns: hasPrev ? pb.best.value / prev : 1,
        };
    }
    const last = recent(o.works ?? []);
    if (last.length < 3)
        return null;
    const top = last.reduce((a, x) => (x.multiple > a.multiple ? x : a), last[0]);
    if (top.multiple <= 1)
        return null;
    const n = count(last.length);
    const newest = top === last[0];
    return {
        moment: "best",
        sentence: newest ? `My new ${w.work} is my best of the last ${n}.` : `My best ${w.work} of the last ${n}.`,
        stat: { lead: times(top.multiple), rest: `my usual ${w.work}` },
        key: `One lap: my usual ${w.work}.`,
        turns: top.multiple,
    };
}
function ratingMoment(r, w) {
    const p = topPart(r.parts);
    const stat = { lead: figureOf(r.rating), band: r.band, rest: `Orbe Rating, ${lowerFirst(againstLine(r.kind, r.sizeBand))}` };
    if (!p)
        return { moment: "rating", sentence: `${r.band} for a ${w.one} my size.`, stat, key: `One lap: typical for a ${w.one} my size.`, turns: 1 };
    const score = Math.max(0, Math.min(100, Math.round(p.score)));
    return {
        moment: "rating",
        sentence: `Better ${lowerFirst(p.name)} than ${score}\u00a0in\u00a0100 ${w.peers} my\u00a0size.`,
        stat,
        key: `One lap: 100 ${w.peers} my size.`,
        turns: score / 100,
    };
}
function seasonMoment(o, w) {
    const s = o.season;
    if (!s || !s.name.trim())
        return null;
    const done = s.works.filter((x) => x.matured !== false && Number.isFinite(x.multiple) && x.multiple >= 0);
    if (!done.length)
        return null;
    const top = done.reduce((a, x) => (x.multiple > a.multiple ? x : a), done[0]);
    const name = s.name.trim();
    return {
        moment: "season",
        sentence: `${done.length === 1 ? "One" : done.length} ${done.length === 1 ? w.work : w.works} in ${name}.`,
        stat: { lead: times(top.multiple), rest: `my usual ${w.work}, for the best of them` },
        key: `One lap: my usual ${w.work}.`,
        turns: top.multiple,
    };
}
function sizeMoment(o, w) {
    const s = o.sizeUp;
    if (!s || !s.to.trim() || !s.from.trim())
        return null;
    return {
        moment: "size",
        sentence: "Moved up a size.",
        stat: { lead: s.to.trim(), rest: `${w.audience}, up from ${s.from.trim()}` },
        key: `Inner ring: ${s.from.trim()}.`,
        turns: 1,
        outward: true,
    };
}
export function cardModel(rating, account, options = {}) {
    if (!Number.isFinite(rating.rating))
        throw new Error("A card needs a rating: this account has not been rated yet.");
    const words = wordsFor(rating.kind);
    const handle = normaliseHandle(account.handle);
    const host = options.host ?? "orbe.vc";
    const want = options.moment ?? (options.personalBest ? "best" : "rating");
    const said = (want === "best" ? bestMoment(options, words) : want === "season" ? seasonMoment(options, words) : want === "size" ? sizeMoment(options, words) : null) ??
        ratingMoment(rating, words);
    const name = account.name.trim() || handle || "Untitled";
    const note = options.note?.trim() || null;
    return {
        moment: said.moment,
        kind: rating.kind,
        words,
        name,
        handle,
        url: handle ? `${host}/${handle}` : host,
        rating: rating.rating,
        figure: figureOf(rating.rating),
        band: rating.band,
        against: againstLine(rating.kind, rating.sizeBand),
        month: monthOf(rating.computedAt),
        sentence: said.sentence,
        stat: said.stat,
        key: said.key,
        turns: said.turns,
        outward: said.outward === true,
        image: safeImage(options.image),
        windowText: options.workTitle?.trim() || name,
        label: cardLabel(rating.kind),
        small: [options.provisional ? "On provisional benchmarks." : "", note ?? ""].filter(Boolean).join(" "),
        note,
        modelVersion: rating.modelVersion,
    };
}
/** The small print every card carries. For YouTube it also says the number is not YouTube's. */
export function cardLabel(kind) {
    return kind === "youtube" ? `${RATING_LABEL}, not YouTube.` : `${RATING_LABEL}.`;
}
