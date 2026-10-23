import { DAY_NAMES, featuresFor, timeTraits } from "./features.js";
import { assertPlain, capitalise, grouped, metricWords, minutes, quoted, times, topicWords } from "./format.js";
import { geoMean, geoRatio, hypergeomUpper, median, round } from "./stats.js";
import { clusterTitles } from "./topics.js";
import { formatNoun, guideWorks, mainFormat } from "./works.js";
/**
  PROVISIONAL: the fewest settled works before we look for patterns, the best
  tenth (at least three, at most ten) as "best", a trait needing three works
  with it and three without, and a pattern needing the best works to share it
  by at least 25 points more than overall with under a one in ten chance of
  luck. Tune against consented histories once we can see which patterns hold.
*/
export const HIGHLIGHTS_MIN_WORKS = 8;
export const TOP_SHARE = 0.1;
export const TOP_MIN = 3;
export const TOP_MAX = 10;
export const TRAIT_MIN = 3;
export const PATTERN_LIFT = 0.25;
export const PATTERN_P = 0.1;
const TRAIT_WORDS = {
    "title.question": "question title",
    "title.number": "number in the title",
    "title.first_person": "first-person title",
    "title.brackets": "brackets in the title",
    "title.short": "short title",
    "length.under": "shorter than usual",
    "timing.weekend": "weekend release",
    "timing.morning": "morning release",
    "timing.evening": "evening release",
    "rhythm.after_gap": "after a gap",
};
export function highlights(spec, history, o = {}) {
    const everything = guideWorks(spec, history, o.nowMs);
    const format = mainFormat(spec, everything);
    const works = everything.filter((w) => w.format === format);
    const accountId = history[0]?.account.id ?? "";
    const noun = formatNoun(spec, format);
    const nouns = `${noun}s`;
    const empty = { topGapDays: null, usualGapDays: null, topRecent: null, usualRecent: null, text: null };
    if (works.length < HIGHLIGHTS_MIN_WORKS) {
        return {
            accountId,
            kind: spec.kind,
            format,
            works: works.length,
            status: "not_enough_work",
            top: [],
            patterns: [],
            topics: [],
            rhythm: empty,
            length: { topSec: null, usualSec: null, text: null },
            summary: assertPlain(`Highlights need at least ${HIGHLIGHTS_MIN_WORKS} settled ${nouns} to tell a pattern from luck. You have ${works.length} so far.`),
            tier: "free",
        };
    }
    const ranked = [...works].sort((a, b) => b.multiple - a.multiple || (a.work.id < b.work.id ? -1 : 1));
    const topN = Math.min(TOP_MAX, Math.max(TOP_MIN, Math.round(works.length * TOP_SHARE)));
    const top = ranked.slice(0, topN);
    const topIds = new Set(top.map((w) => w.work.id));
    const features = [...featuresFor(spec, works, o), ...dayFeatures(o.timeZone)];
    const patterns = features.map((f) => pattern(f, works, topIds, nouns)).filter((p) => p !== null);
    patterns.sort((a, b) => rank(a.evidence) - rank(b.evidence) || a.p - b.p || (a.key < b.key ? -1 : 1));
    const clusters = clusterTitles(works.map((w) => w.work.title));
    const topicOf = new Map();
    const topics = clusters.map((c) => {
        const members = c.members.map((i) => works[i]);
        for (const m of members)
            topicOf.set(m.work.id, topicWords(c.terms));
        const topWith = members.filter((m) => topIds.has(m.work.id)).length;
        const p = hypergeomUpper(works.length, members.length, topN, topWith);
        const typical = geoMean(members.map((m) => m.multiple));
        const evidence = topWith >= 2 && p <= PATTERN_P ? "pattern" : members.length >= TRAIT_MIN ? "weak" : "not_enough";
        const best = topWith ? `, and ${topWith} of your ${topN} best ${topWith === 1 ? "is" : "are"} among them` : "";
        const text = `${capitalise(nouns)} about ${topicWords(c.terms)} (${members.length} of them) typically do ${times(typical)} times your usual${best}.`;
        return { terms: c.terms, works: members.length, typical: round(typical, 3), topWith, p: round(p, 4), evidence, text: assertPlain(text) };
    });
    topics.sort((a, b) => rank(a.evidence) - rank(b.evidence) || b.typical - a.typical);
    const patternKeys = new Set(patterns.filter((p) => p.evidence !== "not_enough").map((p) => p.key));
    const topWorks = top.map((w) => topWork(w, features, patternKeys, topicOf.get(w.work.id) ?? null, spec, o.timeZone));
    return {
        accountId,
        kind: spec.kind,
        format,
        works: works.length,
        status: "ok",
        top: topWorks,
        patterns,
        topics,
        rhythm: rhythm(top, works, nouns),
        length: lengthNote(top, works, nouns),
        summary: assertPlain(summary(topWorks, patterns, topics, nouns, works.length)),
        tier: "free",
    };
}
const rank = (e) => ({ pattern: 0, weak: 1, not_enough: 2 })[e];
function dayFeatures(timeZone) {
    return DAY_NAMES.map((day, i) => ({
        key: `day.${day.toLowerCase()}`,
        family: "timing",
        yes: `published on a ${day}`,
        no: `published on other days`,
        test: (w) => timeTraits(w.work.publishedAt, timeZone).weekday === i,
    }));
}
function pattern(f, works, topIds, nouns) {
    const applicable = works.filter((w) => f.test(w) !== undefined);
    const withIt = applicable.filter((w) => f.test(w));
    const without = applicable.filter((w) => !f.test(w));
    const top = applicable.filter((w) => topIds.has(w.work.id));
    const topWith = top.filter((w) => f.test(w)).length;
    if (!top.length || !withIt.length)
        return null;
    // Highlights are about what the best works share; traits they lack are the journal's business.
    if (topWith / top.length <= withIt.length / applicable.length)
        return null;
    const p = hypergeomUpper(applicable.length, withIt.length, top.length, topWith);
    const shareTop = topWith / top.length;
    const shareAll = withIt.length / applicable.length;
    const effect = withIt.length && without.length ? geoRatio(withIt.map((w) => w.multiple), without.map((w) => w.multiple)) : null;
    const enough = withIt.length >= TRAIT_MIN && without.length >= TRAIT_MIN && top.length >= TOP_MIN;
    const evidence = !enough ? "not_enough" : shareTop >= shareAll + PATTERN_LIFT && p <= PATTERN_P ? "pattern" : "weak";
    const family = f.key.startsWith("day.") ? "day" : f.family;
    const p0 = {
        key: f.key,
        family,
        phrase: f.yes,
        top: { with: topWith, of: top.length },
        all: { with: withIt.length, of: applicable.length },
        effect: effect === null ? null : round(effect, 3),
        p: round(p, 4),
        evidence,
        text: "",
    };
    p0.text = assertPlain(patternLine(p0, nouns));
    return p0;
}
const chance = (p) => (p >= 0.5 ? "quite likely by chance" : `a split you would see about 1 time in ${grouped(Math.max(2, Math.round(1 / p)))} by chance`);
export function patternLine(p, nouns) {
    if (p.evidence === "not_enough")
        return `Not enough evidence on ${nouns} ${p.phrase}: ${p.all.with} with it and ${p.all.of - p.all.with} without, and we need at least ${TRAIT_MIN} of each.`;
    const share = `${capitalise(nouns)} ${p.phrase}: ${p.top.with} of your ${p.top.of} best, against ${p.all.with} of all ${p.all.of}`;
    const eff = p.effect !== null && p.effect >= 1.1 ? ` They typically do ${times(p.effect)} times as well as the rest.` : "";
    if (p.evidence === "pattern")
        return `${share}, ${chance(p.p)}.${eff}`;
    return `${share}, which could easily be chance.`;
}
function topWork(w, features, patternKeys, topic, spec, timeZone) {
    const traits = [];
    for (const f of features) {
        if (f.key.startsWith("day.") || !TRAIT_WORDS[f.key])
            continue;
        if (f.test(w) && patternKeys.has(f.key))
            traits.push(TRAIT_WORDS[f.key]);
    }
    const t = timeTraits(w.work.publishedAt, timeZone);
    traits.push(`${DAY_NAMES[t.weekday]} ${t.daypart}`);
    if (w.work.durationSec > 0)
        traits.push(minutes(w.work.durationSec));
    if (topic)
        traits.push(`about ${topic}`);
    const primary = metricWords(spec.metrics.find((m) => m.key === spec.work.primary)?.name ?? spec.work.primary);
    const line = `${quoted(w.work.title)} did ${times(w.multiple)} times your usual ${primary}: ${traits.join(", ")}.`;
    return {
        workId: w.work.id,
        title: w.work.title,
        publishedAt: w.work.publishedAt,
        multiple: round(w.multiple, 3),
        matured: Math.round(w.matured),
        traits,
        topic,
        line: assertPlain(line),
    };
}
function rhythm(top, works, nouns) {
    const tg = top.map((w) => w.gapDays).filter((g) => g !== undefined);
    const ag = works.map((w) => w.gapDays).filter((g) => g !== undefined);
    if (tg.length < TOP_MIN || ag.length < HIGHLIGHTS_MIN_WORKS)
        return { topGapDays: null, usualGapDays: null, topRecent: null, usualRecent: null, text: null };
    const topGap = median(tg);
    const usualGap = median(ag);
    const topRecent = median(top.map((w) => w.recentCount));
    const usualRecent = median(works.map((w) => w.recentCount));
    const days = (d) => `${grouped(d, d < 10 ? 1 : 0)} days`;
    const ratio = topGap / Math.max(usualGap, 0.01);
    const shape = ratio > 1.5 ? "after a longer break than usual" : ratio < 0.67 ? "sooner after the last one than usual" : "on your usual rhythm";
    const text = `Your best ${nouns} came ${shape}: a median of ${days(topGap)} after the one before, against ${days(usualGap)} typically. This is a count of ${tg.length} works, so read it lightly.`;
    return { topGapDays: round(topGap, 2), usualGapDays: round(usualGap, 2), topRecent, usualRecent, text: assertPlain(text) };
}
function lengthNote(top, works, nouns) {
    const td = top.map((w) => w.work.durationSec).filter((d) => d > 0);
    const ad = works.map((w) => w.work.durationSec).filter((d) => d > 0);
    if (td.length < TOP_MIN || ad.length < HIGHLIGHTS_MIN_WORKS)
        return { topSec: null, usualSec: null, text: null };
    const topSec = median(td);
    const usualSec = median(ad);
    const ratio = topSec / usualSec;
    const shape = ratio < 0.85 ? "shorter than" : ratio > 1.15 ? "longer than" : "about the same length as";
    return { topSec, usualSec, text: assertPlain(`Your best ${nouns} run ${minutes(topSec)} at the median, ${shape} your usual ${minutes(usualSec)}.`) };
}
function summary(top, patterns, topics, nouns, n) {
    const out = [];
    if (top[0])
        out.push(`Your best ${nouns.slice(0, -1)} of the last ${n}, ${quoted(top[0].title)}, did ${times(top[0].multiple)} times your usual.`);
    const strong = patterns.filter((p) => p.evidence === "pattern").slice(0, 2);
    for (const p of strong)
        out.push(p.text);
    const topic = topics.find((t) => t.evidence === "pattern");
    if (topic)
        out.push(topic.text);
    if (!strong.length && !topic)
        out.push(`Nothing your best ${nouns} share stands out from chance yet. That usually changes as you publish more.`);
    return out.join(" ");
}
