import { minutes } from "./format.js";
import { median } from "./stats.js";
export function titleTraits(title) {
    const t = title.trim();
    const words = t.split(/\s+/).filter(Boolean).length;
    return {
        words,
        number: /\d/.test(t),
        question: /\?\s*$/.test(t) || /^(how|why|what|which|who|when|where|is|are|can|should|do|does|did|will|would)\b/i.test(t),
        firstPerson: /\b(i|i'm|i've|i'd|i'll|me|my|mine|we|we're|we've|our|us)\b/i.test(t.replace(/[‘’]/g, "'")),
        brackets: /[[\](){}]/.test(t),
    };
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Day and hour in the creator's own time zone (IANA name), because "evening" means their evening. */
export function timeTraits(iso, timeZone = "UTC") {
    const key = `${timeZone}|${iso}`;
    const hit = TRAITS.get(key);
    if (hit)
        return { ...hit };
    const out = readTimeTraits(iso, timeZone);
    if (TRAITS.size >= TRAITS_MAX)
        TRAITS.clear();
    TRAITS.set(key, out);
    return { ...out };
}
/*
  A formatter is slow to build and these run once per work per feature, so
  one formatter is kept per time zone and each answer is remembered (a few
  thousand at most; the memo starts again when it fills).
*/
const FORMATTERS = new Map();
const TRAITS = new Map();
const TRAITS_MAX = 20_000;
function readTimeTraits(iso, timeZone) {
    let format = FORMATTERS.get(timeZone);
    if (!format) {
        format = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "numeric", hourCycle: "h23" });
        FORMATTERS.set(timeZone, format);
    }
    const parts = format.formatToParts(new Date(iso));
    const weekday = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "Mon");
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
    const daypart = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 22 ? "evening" : "night";
    return { weekday, hour, weekend: weekday === 0 || weekday === 6, daypart };
}
/**
  The length that splits a kind's works into "shorter" and "longer" in the
  journal. PROVISIONAL: round numbers creators already talk about (twelve
  minutes for a YouTube upload, three hours for a stream, 45 minutes for an
  episode), not measurements. Replace with the cohort median length per kind
  once bench publishes durations.
*/
export const LENGTH_SPLIT_SEC = { youtube: 12 * 60, twitch: 3 * 3600, podcast: 45 * 60 };
/** The yes or no features for a creator's works. Length and format features only appear when the kind has them. */
export function featuresFor(spec, works, o = {}) {
    const tz = o.timeZone ?? "UTC";
    const title = (w) => titleTraits(w.work.title);
    const time = (w) => timeTraits(w.work.publishedAt, tz);
    const words = median(works.map((w) => title(w).words));
    const gaps = works.map((w) => w.gapDays).filter((g) => g !== undefined);
    const typicalGap = gaps.length ? median(gaps) : NaN;
    const features = [
        { key: "title.question", family: "title", yes: "with a question in the title", no: "without a question in the title", test: (w) => title(w).question },
        { key: "title.number", family: "title", yes: "with a number in the title", no: "without a number in the title", test: (w) => title(w).number },
        { key: "title.first_person", family: "title", yes: "with a first-person title (I, my, we)", no: "without a first-person title", test: (w) => title(w).firstPerson },
        { key: "title.brackets", family: "title", yes: "with brackets in the title", no: "without brackets in the title", test: (w) => title(w).brackets },
    ];
    if (Number.isFinite(words) && words >= 3)
        features.push({ key: "title.short", family: "title", yes: `with short titles (under ${Math.round(words)} words)`, no: "with longer titles", test: (w) => title(w).words < Math.round(words) });
    const split = LENGTH_SPLIT_SEC[spec.kind];
    const main = works.filter((w) => w.work.durationSec > 0);
    if (split && main.length) {
        const longFormat = spec.formats.find((f) => !f.durationSec)?.key;
        features.push({
            key: "length.under",
            family: "length",
            yes: `under ${minutes(split)}`,
            no: `of ${minutes(split)} or more`,
            // Shorts are judged as their own format, so the length split is within the main format only.
            test: (w) => (w.work.durationSec > 0 && (spec.formats.length < 2 || w.format === longFormat) ? w.work.durationSec < split : undefined),
        });
    }
    if (spec.formats.length > 1) {
        const def = spec.formats.find((f) => !f.durationSec);
        for (const f of spec.formats.filter((x) => x.durationSec))
            features.push({ key: `format.${f.key}`, family: "format", yes: `that are ${f.name}`, no: `that are ${def.name}`, test: (w) => w.format === f.key });
    }
    features.push({ key: "timing.weekend", family: "timing", yes: "published at the weekend", no: "published on weekdays", test: (w) => time(w).weekend }, { key: "timing.morning", family: "timing", yes: "published in the morning (5am to noon)", no: "published later in the day", test: (w) => time(w).daypart === "morning" }, { key: "timing.evening", family: "timing", yes: "published in the evening (5pm to 10pm)", no: "published at other times", test: (w) => time(w).daypart === "evening" });
    if (Number.isFinite(typicalGap) && typicalGap > 0) {
        features.push({
            key: "rhythm.after_gap",
            family: "rhythm",
            yes: `published after a gap (more than ${Math.round(2 * typicalGap)} days since the last)`,
            no: "published on your usual rhythm",
            test: (w) => (w.gapDays === undefined ? undefined : w.gapDays > 2 * typicalGap),
        });
    }
    for (const tag of tagKeys(o.tags)) {
        const label = o.tagLabels?.[tag] ?? tag.replace(/_/g, " ");
        features.push({ key: `tag.${tag}`, family: "tag", yes: `you marked "${label}"`, no: `not marked "${label}"`, test: (w) => o.tags?.[w.work.id]?.[tag] });
    }
    return features;
}
const tagKeys = (tags) => [...new Set(Object.values(tags ?? {}).flatMap((t) => Object.keys(t)))].sort();
