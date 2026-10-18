import { SPECS } from "./kinds.js";
import { formatMetric, signed } from "./format.js";
import { focusAreas, isRated, specFor, topStat } from "./rate.js";
import { ratingNotice } from "./label.js";
/*
  explain(): the rating in plain English, for the site and for reports. Each
  kind's opening sentences are data in its spec; the closing ones (overall
  verdict, #1 stat, the one to work on) are shared, so every kind reads alike.
*/
/** Shared closing sentences, after the kind's own. */
export const CLOSING = [
    "Overall that rates {rating}, {band}, where zero is typical for {peers} with {sizeBand} {audienceNoun}.",
    "Its strongest stat is {top.name}, better than {top.score} in 100.",
    "The one to work on is {weak.name}: {weak.advice}",
];
const PROVISIONAL_NOTE = "These comparisons use Orbe's provisional benchmarks, which are replaced by measured ones as creators of this kind and size consent to be counted.";
const LOW_CONFIDENCE_NOTE = "With only {works} {worksNoun} to go on, the scores are pulled towards typical until there are more.";
/** Fills {placeholders}; returns null when any cannot be filled, so the sentence is left out rather than half-written. */
export function fill(template, values) {
    let missing = false;
    const out = template.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_, key) => {
        const v = values[key];
        if (v === undefined)
            missing = true;
        return v ?? "";
    });
    return missing ? null : out;
}
export function explainValues(result, specs = SPECS) {
    const spec = specFor(result.kind, specs);
    const v = {
        title: result.title,
        peers: spec.peers,
        audienceNoun: spec.audienceNoun,
        kindName: spec.name,
        sizeBand: result.sizeBand.replace(/^Under/, "under").replace(/^Over/, "over"),
    };
    if (!isRated(result))
        return v;
    const d = result.detail;
    Object.assign(v, {
        rating: signed(result.rating),
        band: result.band,
        workNoun: d.workNoun,
        worksNoun: `${d.workNoun}s`,
        works: String(d.works),
        format: d.formatName,
    });
    for (const [k, x] of Object.entries(d.typical)) {
        const unit = spec.metrics.find((m) => m.key === k)?.unit ?? "count";
        v[`typical.${k}`] = formatMetric(unit, x);
    }
    for (const p of d.parts) {
        const s = result.parts.find((x) => x.key === p.key);
        v[`part.${p.key}.value`] = p.display;
        v[`part.${p.key}.raw`] = p.raw;
        v[`part.${p.key}.score`] = String(s.score);
    }
    const top = topStat(result, specs);
    if (top && top.score > 50)
        Object.assign(v, { "top.name": top.name, "top.value": top.value, "top.score": String(top.score) });
    const weak = focusAreas(result)[0];
    if (weak && weak.key !== top?.key)
        Object.assign(v, { "weak.name": weak.name, "weak.advice": weak.advice });
    return v;
}
/** A plain-English paragraph explaining a rating, or why there is not one yet. */
export function explain(result, specs = SPECS) {
    if (!isRated(result))
        return result.message;
    const spec = specFor(result.kind, specs);
    const values = explainValues(result, specs);
    const sentences = [...spec.explain, ...CLOSING].map((t) => fill(t, values)).filter((s) => s !== null);
    if (result.detail.confidence === "low")
        sentences.push(fill(LOW_CONFIDENCE_NOTE, values));
    if (result.detail.provisional)
        sentences.push(PROVISIONAL_NOTE);
    // Always last: YouTube's derived-metrics policy requires the rating to be labelled as Orbe's own, wherever it is explained.
    sentences.push(ratingNotice(result.kind));
    return sentences.map(capitalise).join(" ");
}
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
