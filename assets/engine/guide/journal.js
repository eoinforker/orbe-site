import { featuresFor } from "./features.js";
import { assertPlain, capitalise, times } from "./format.js";
import { benjaminiHochberg, bootstrapRatio, geoRatio, hashSeed, permutationP, round } from "./stats.js";
import { formatNoun, guideWorks, mainFormat } from "./works.js";
/**
  PROVISIONAL thresholds, chosen for honesty over excitement: at least five
  works on each side before we compare at all, a false discovery rate of 10%
  across a creator's comparisons, and an interval wider than a factor of two
  is called wide. Revisit once we can check calibration on consented
  histories (how often "clear" findings hold in the creator's next works).
*/
export const JOURNAL_MIN_GROUP = 5;
export const JOURNAL_FDR = 0.1;
export const WIDE_RANGE = 2;
export const RESAMPLES = 2000;
export function journal(spec, history, o = {}) {
    const works = guideWorks(spec, history, o.nowMs);
    const accountId = history[0]?.account.id ?? "";
    const minGroup = o.minGroup ?? JOURNAL_MIN_GROUP;
    const fdr = o.fdr ?? JOURNAL_FDR;
    const resamples = o.resamples ?? RESAMPLES;
    const seedBase = o.seed ?? "orbe-journal";
    const noun = `${formatNoun(spec, mainFormat(spec, works))}s`;
    const raw = featuresFor(spec, works, o).map((f) => split(f, works));
    const testable = raw.filter((r) => r.yes.length >= minGroup && r.no.length >= minGroup);
    const stats = testable.map((r) => {
        const seed = hashSeed(`${seedBase}/${accountId}/${r.feature.key}`);
        return { r, p: permutationP(r.yes, r.no, seed, resamples), interval: bootstrapRatio(r.yes, r.no, seed ^ 0x9e3779b9, resamples) };
    });
    const qs = benjaminiHochberg(stats.map((s) => s.p));
    const byKey = new Map(stats.map((s, i) => [s.r.feature.key, { ...s, q: qs[i] }]));
    const entries = raw.map((r) => {
        const s = byKey.get(r.feature.key);
        const ratio = r.yes.length && r.no.length ? geoRatio(r.yes, r.no) : NaN;
        const better = !(ratio < 1) ? "yes" : "no";
        const effect = better === "yes" ? ratio : 1 / ratio;
        const effectInterval = s ? (better === "yes" ? { low: s.interval.low, high: s.interval.high } : { low: 1 / s.interval.high, high: 1 / s.interval.low }) : null;
        const verdict = !s ? "not_enough" : s.q <= fdr && (s.interval.low > 1 || s.interval.high < 1) ? "clear" : "unclear";
        const entry = {
            key: r.feature.key,
            family: r.feature.family,
            yes: r.feature.yes,
            no: r.feature.no,
            n: { yes: r.yes.length, no: r.no.length },
            ratio: Number.isFinite(ratio) ? round(ratio, 3) : NaN,
            interval: s ? { low: round(s.interval.low, 3), high: round(s.interval.high, 3), level: s.interval.level } : null,
            p: s ? round(s.p, 4) : null,
            q: s ? round(s.q, 4) : null,
            verdict,
            better,
            effect: Number.isFinite(effect) ? round(effect, 3) : NaN,
            effectInterval: effectInterval && { low: round(effectInterval.low, 3), high: round(effectInterval.high, 3) },
            text: "",
        };
        entry.text = assertPlain(journalLine(entry, noun, minGroup, stats.length));
        return entry;
    });
    const order = { clear: 0, unclear: 1, not_enough: 2 };
    entries.sort((a, b) => order[a.verdict] - order[b.verdict] || (b.effect || 0) - (a.effect || 0) || (a.key < b.key ? -1 : 1));
    return { accountId, kind: spec.kind, works: works.length, tested: stats.length, fdr, entries, summary: assertPlain(journalSummary(entries, noun, works.length, stats.length)), tier: "free" };
}
/** Format splits compare raw multiples, because a work's own-format baseline would hide the difference between formats. */
function split(feature, works) {
    const yes = [];
    const no = [];
    for (const w of works) {
        const t = feature.test(w);
        if (t === undefined)
            continue;
        (t ? yes : no).push(feature.family === "format" ? w.rawMultiple : w.multiple);
    }
    return { feature, yes, no };
}
const range = (i) => `${times(i.low)} to ${times(i.high)}`;
/** One sentence per comparison, in the voice of a friend who knows statistics and refuses to oversell. */
export function journalLine(e, noun, minGroup, tested) {
    const Works = capitalise(noun);
    const [good, bad] = e.better === "yes" ? [e.yes, e.no] : [e.no, e.yes];
    const [nGood, nBad] = e.better === "yes" ? [e.n.yes, e.n.no] : [e.n.no, e.n.yes];
    if (e.verdict === "not_enough") {
        const few = Math.min(e.n.yes, e.n.no);
        const side = e.n.yes <= e.n.no ? e.yes : e.no;
        return `Not enough evidence yet on ${noun} ${side}: ${few === 0 ? "none so far" : `only ${few}`}. We compare once there are at least ${minGroup} on each side.`;
    }
    const ci = e.effectInterval;
    const counts = `(${nGood} against ${nBad} ${noun})`;
    if (e.verdict === "clear") {
        const also = tested > 1 ? ` It still stands out after allowing for the ${tested} comparisons we ran.` : "";
        return `${Works} ${good} did ${times(e.effect)} times better than ${noun} ${bad} ${counts}. The likely range is ${range(ci)}.${also}`;
    }
    if (e.effect < 1.1)
        return `${Works} ${e.yes} and ${noun} ${e.no} did about the same ${counts}: the range runs from ${range(ci)}.`;
    const wide = ci.high / Math.max(ci.low, 1e-9) > WIDE_RANGE;
    return `${Works} ${good} did ${times(e.effect)} times better ${counts}, but ${wide ? "the range is wide" : "the range still includes no difference"}: ${range(ci)}. It could be chance, so keep watching.`;
}
function journalSummary(entries, noun, works, tested) {
    if (!tested)
        return `Your journal fills in as you publish. With ${works} settled ${noun} there is not yet enough on both sides of any comparison.`;
    const clear = entries.filter((e) => e.verdict === "clear");
    const lead = `We compared ${tested} things across your last ${works} ${noun}.`;
    const close = "These are patterns in your own history, not proof of cause, and the ranges narrow as you publish more.";
    if (!clear.length)
        return `${lead} None stands out clearly yet. ${close}`;
    return `${lead} ${clear.length === 1 ? "One stands out" : `${clear.length} stand out`}. ${close}`;
}
