import { ageWords, assertPlain, metricValue, metricWords, ordinal, quoted, times } from "./format.js";
import { median } from "./stats.js";
import { formatOf, formatNoun, guideWorks, maturedShare, metricSpec, readingsByWork, sizeBandOf, sortHistory } from "./works.js";
/** How many of the creator's recent works of the same format the start is ranked against. */
export const CURVE_WORKS = 20;
/** The fewest comparable works before we compare at all. */
export const CURVE_MIN = 3;
/** A start this far above or below the expected counts as notable. PROVISIONAL: replace with the measured spread of starts. */
export const NOTABLE = 1.2;
/** A ratio such as likes per view is too noisy to judge on fewer readers than this. PROVISIONAL. */
export const SECONDARY_MIN_DENOMINATOR = 50;
/** The moments a report is worth sending again, in hours. */
export const CHECKPOINTS_HOURS = [1, 6, 24, 72, 168, 720];
export class ReportError extends Error {
}
export function afterPostReport(input) {
    const history = sortHistory(input.history);
    const latest = [...history].reverse().find((s) => s.works.some((w) => w.id === input.workId));
    if (!latest)
        throw new ReportError(`No snapshot contains work ${input.workId}`);
    const work = latest.works.find((w) => w.id === input.workId);
    const spec = input.rating.specFor(latest.account.kind);
    const primary = spec.work.primary;
    const pm = metricSpec(spec, primary);
    const checkedMs = Date.parse(latest.provenance.checkedAt);
    const ageHours = Math.max(0, (checkedMs - Date.parse(work.publishedAt)) / 36e5);
    const value = work.metrics[primary];
    if (!(typeof value === "number" && Number.isFinite(value)))
        throw new ReportError(`Work ${input.workId} has no ${primary} yet`);
    const format = formatOf(spec, work.durationSec);
    const noun = formatNoun(spec, format);
    const metricName = metricWords(pm?.name ?? primary);
    // Comparisons use only what was known when the report is made, never later readings.
    const known = history.filter((s) => Date.parse(s.provenance.checkedAt) <= checkedMs);
    const settled = guideWorks(spec, known, checkedMs).filter((w) => w.format === format && w.work.id !== work.id);
    const typical = settled.length >= CURVE_MIN ? median(settled.slice(-CURVE_WORKS).map((w) => w.matured)) : null;
    const ownCurve = curve(spec, known, work, format, ageHours, typical);
    const peers = peerCompare(spec, input.rating.peerPrior, latest.account.audience, work, format, ageHours, value);
    const share = maturedShare(pm?.maturity, ageHours / 24);
    const projection = pm?.maturity ? { matured: value / share, multipleOfTypical: typical ? value / share / typical : null } : null;
    const secondary = secondaryCompare(spec, work, settled.map((s) => s.work));
    const bests = input.rating
        .personalBests(known)
        .filter((b) => b.workId === work.id)
        .reduce((acc, b) => acc.set(b.metric, b), new Map());
    const reportBests = dedupeStarts([...bests.values()])
        .map((b) => ({ ...b, fresh: b.at === latest.provenance.checkedAt, line: input.rating.personalBestLine(b, spec.kind) }))
        .sort((a, b) => Number(b.fresh) - Number(a.fresh) || Number(a.metric.includes("@")) - Number(b.metric.includes("@")) || (a.metric < b.metric ? -1 : 1));
    const ctx = { spec, work, noun, ageHours, value, metricName, unit: pm?.unit ?? "count", final: !pm?.maturity, ownCurve, peers, secondary, bests: reportBests, projection };
    const celebrate = celebrateLine(ctx, history);
    const watch = watchLine(ctx);
    // When the celebration is the curve comparison, the curve sentence already says it.
    const curveIsNews = celebrate.key.startsWith("curve.");
    const text = [headline(ctx), curveSentence(ctx, !curveIsNews || celebrate.key === "curve.ahead"), peerSentence(ctx), curveIsNews ? null : celebrate.line, watch.line].filter((s) => !!s);
    return {
        accountId: latest.account.id,
        kind: spec.kind,
        workId: work.id,
        title: work.title,
        format,
        checkedAt: latest.provenance.checkedAt,
        ageHours: Math.round(ageHours * 100) / 100,
        metric: primary,
        metricName,
        value,
        ownCurve,
        peers,
        projection: projection && { matured: Math.round(projection.matured), multipleOfTypical: projection.multipleOfTypical === null ? null : Math.round(projection.multipleOfTypical * 1000) / 1000 },
        secondary,
        bests: reportBests,
        celebrate: { key: celebrate.key, line: assertPlain(celebrate.line) },
        watch: { key: watch.key, line: assertPlain(watch.line) },
        notification: assertPlain(notification(ctx)),
        text: assertPlain(text.join(" ")),
        tier: "free",
    };
}
/**
  A work an hour old that beats every first hour also beats every first day
  at that moment, so the rating reports both. The shortest one says it.
*/
function dedupeStarts(bests) {
    const age = (m) => Number(m.split("@")[1]?.replace("h", "") ?? Infinity);
    return bests.filter((b) => !bests.some((o) => o !== b && o.at === b.at && o.value === b.value && o.metric.split("@")[0] === b.metric.split("@")[0] && age(o.metric) < age(b.metric)));
}
/** A work's value at an age, from its readings: the nearest reading close enough, or a straight line between two either side. */
export function valueAtAge(readings, metric, ageHours) {
    const rs = readings.filter((r) => typeof r.metrics[metric] === "number").sort((a, b) => a.ageHours - b.ageHours);
    if (!rs.length)
        return undefined;
    let nearest;
    for (const r of rs)
        if (!nearest || Math.abs(Math.log(Math.max(r.ageHours, 0.01) / Math.max(ageHours, 0.01))) < Math.abs(Math.log(Math.max(nearest.ageHours, 0.01) / Math.max(ageHours, 0.01))))
            nearest = r;
    // Within a quarter either way, a reading is "the same age".
    if (nearest && nearest.ageHours >= ageHours / 1.25 && nearest.ageHours <= ageHours * 1.25)
        return nearest.metrics[metric];
    const before = [...rs].reverse().find((r) => r.ageHours <= ageHours);
    const after = rs.find((r) => r.ageHours >= ageHours);
    if (!before || !after || after.ageHours === before.ageHours)
        return undefined;
    const f = (ageHours - before.ageHours) / (after.ageHours - before.ageHours);
    return before.metrics[metric] + f * (after.metrics[metric] - before.metrics[metric]);
}
function curve(spec, history, work, format, ageHours, typical) {
    const primary = spec.work.primary;
    const value = work.metrics[primary];
    const { works, readings } = readingsByWork(history);
    const peers = [...works.values()]
        .filter((w) => w.id !== work.id && w.kind === spec.kind && formatOf(spec, w.durationSec) === format && Date.parse(w.publishedAt) < Date.parse(work.publishedAt))
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, CURVE_WORKS);
    const final = !metricSpec(spec, primary)?.maturity;
    const values = peers
        .map((w) => {
        const rs = readings.get(w.id) ?? [];
        return final ? rs.at(-1)?.metrics[primary] : valueAtAge(rs, primary, ageHours);
    })
        .filter((v) => typeof v === "number" && Number.isFinite(v));
    if (values.length >= CURVE_MIN) {
        const expected = median(values);
        return { basis: final ? "final" : "observed", expected, multiple: value / Math.max(expected, 1e-9), rank: 1 + values.filter((v) => v > value).length, of: values.length + 1 };
    }
    if (typical === null)
        return null;
    const expected = typical * maturedShare(metricSpec(spec, primary)?.maturity, ageHours / 24);
    return { basis: "modelled", expected, multiple: value / Math.max(expected, 1e-9), rank: null, of: 0 };
}
/** The spec's provisional prior for a part, for when no published prior is injected. */
export function provisionalPeerPrior(spec, format, band, partKey) {
    const part = spec.parts.find((p) => p.key === partKey);
    if (!part)
        return undefined;
    const source = part.prior.formats?.[format] ?? part.prior;
    const m = typeof source.median === "number" ? source.median : source.median[band];
    return m === undefined ? undefined : { median: m, sigma: source.sigma, source: "provisional" };
}
/** The part whose measure is the primary metric over the audience (or over a metric of the work): reach, in every kind today. */
const reachPart = (spec) => spec.parts.find((p) => p.measure.type === "ratio" && p.measure.numerator?.length === 1 && p.measure.numerator[0] === spec.work.primary && p.measure.aggregate === "median");
function peerCompare(spec, port, audience, work, format, ageHours, value) {
    const part = reachPart(spec);
    if (!part)
        return null;
    const band = sizeBandOf(spec, audience);
    const prior = port?.(spec.kind, format, band.key, part.key) ?? provisionalPeerPrior(spec, format, band.key, part.key);
    if (!prior)
        return null;
    const den = part.measure.denominator === "audience" ? audience : work.metrics[part.measure.denominator ?? ""];
    if (!(typeof den === "number" && den > 0))
        return null;
    const expected = prior.median * den * maturedShare(metricSpec(spec, spec.work.primary)?.maturity, ageHours / 24);
    return { band: band.key, bandLabel: band.label, expected, multiple: value / Math.max(expected, 1e-9), priorSource: prior.source };
}
function secondaryCompare(spec, work, previous) {
    const sec = spec.work.secondary;
    if (!sec || sec.denominator === "audience")
        return null;
    const ratio = (w) => {
        const den = w.metrics[sec.denominator];
        if (!(typeof den === "number" && den >= SECONDARY_MIN_DENOMINATOR))
            return undefined;
        let num = 0;
        for (const k of sec.numerator) {
            const v = w.metrics[k];
            if (typeof v !== "number")
                return undefined;
            num += v;
        }
        return num / den;
    };
    const mine = ratio(work);
    const theirs = previous.map(ratio).filter((x) => x !== undefined);
    if (mine === undefined || theirs.length < CURVE_MIN)
        return null;
    const typical = median(theirs);
    if (!(typical > 0))
        return null;
    const names = sec.numerator.map((k) => metricSpec(spec, k)?.name.toLowerCase() ?? k);
    const den = metricSpec(spec, sec.denominator)?.name.toLowerCase() ?? sec.denominator;
    return { name: names.join(" and "), per: `per 100 ${den}`, value: mine, typical, multiple: mine / typical };
}
const when = (c) => (c.final ? "" : ` in its ${ageWords(c.ageHours)}`);
const val = (c, x) => metricValue(c.unit, x);
function headline(c) {
    if (c.final)
        return `${quoted(c.work.title)} finished with ${val(c, c.value)} ${c.metricName}.`;
    return `${quoted(c.work.title)} has ${val(c, c.value)} ${c.metricName}${when(c)}.`;
}
function curveSentence(c, withRank = true) {
    const o = c.ownCurve;
    if (!o)
        return `It is your first ${c.noun} we can compare, so this report fills in from your next one.`;
    const usual = c.final ? `your usual ${c.noun}` : `your usual ${c.noun} at the same age`;
    const rel = o.multiple >= 1.1 ? `${times(o.multiple)} times ${usual}` : o.multiple <= 0.9 ? `${times(o.multiple)} times ${usual}` : `in line with ${usual}`;
    const rank = withRank && o.rank !== null && o.rank <= 3 && o.of >= 5 ? ` It is your ${o.rank === 1 ? "best" : `${ordinal(o.rank)} best`} ${c.final ? c.noun : "start"} of the last ${o.of}.` : "";
    const basis = o.basis === "modelled" ? " (estimated from your typical curve)" : "";
    return `That is ${rel}${basis}, where you would usually have about ${val(c, o.expected)}.${rank}`;
}
function peerSentence(c) {
    const p = c.peers;
    if (!p)
        return null;
    const sizes = `${c.spec.peers} with ${p.bandLabel.charAt(0).toLowerCase()}${p.bandLabel.slice(1)} ${c.spec.audienceNoun}`;
    const at = c.final ? "" : " by this age";
    const prov = p.priorSource === "provisional" ? ", on provisional benchmarks" : "";
    const rel = p.multiple >= 1.1 ? `ahead of` : p.multiple <= 0.9 ? `behind` : `level with`;
    return `Typical ${sizes} would have about ${val(c, p.expected)}${at}${prov}, so you are ${rel} them.`;
}
function celebrateLine(c, history) {
    const fresh = c.bests.find((b) => b.fresh) ?? c.bests[0];
    if (fresh)
        return { key: `best.${fresh.metric}`, line: fresh.line };
    const o = c.ownCurve;
    if (o && o.rank !== null && o.rank <= 3 && o.of >= 5)
        return { key: "curve.rank", line: `This is your ${o.rank === 1 ? "best" : `${ordinal(o.rank)} best`} ${c.final ? c.noun : `start in ${c.noun}s`} of the last ${o.of}.` };
    if (o && o.multiple >= NOTABLE)
        return { key: "curve.ahead", line: `It is running ${times(o.multiple)} times ahead of your usual ${c.final ? c.noun : "start"}.` };
    if (c.peers && c.peers.multiple >= NOTABLE)
        return { key: "peers.ahead", line: `It is ${times(c.peers.multiple)} times what ${c.spec.peers} your size typically see${c.final ? "" : " by now"}.` };
    if (c.secondary && c.secondary.multiple >= NOTABLE)
        return { key: "secondary.ahead", line: `People who find it respond more than usual: ${per100(c.secondary.value)} ${c.secondary.name} ${c.secondary.per}, against your usual ${per100(c.secondary.typical)}.` };
    if (c.secondary && c.secondary.multiple >= 0.95)
        return { key: "secondary.steady", line: `The people finding it respond as they usually do, with ${per100(c.secondary.value)} ${c.secondary.name} ${c.secondary.per}.` };
    return rhythmCelebration(c, history);
}
/**
  When the numbers give nothing to cheer yet, the act of publishing still
  counts: the creator's rhythm, from their own dates.
*/
function rhythmCelebration(c, history) {
    const { works } = readingsByWork(history);
    const pub = Date.parse(c.work.publishedAt);
    const sameKind = [...works.values()].filter((w) => w.kind === c.spec.kind).map((w) => Date.parse(w.publishedAt));
    const inMonth = sameKind.filter((t) => t <= pub && t > pub - 30 * 864e5).length;
    const before = sameKind.filter((t) => t < pub).sort((a, b) => b - a)[0];
    if (before !== undefined && pub - before > 21 * 864e5)
        return { key: "rhythm.back", line: `It is your first ${c.noun} in ${Math.round((pub - before) / 864e5)} days. Coming back is the hardest part, and it is done.` };
    if (inMonth >= 2)
        return { key: "rhythm.month", line: `It is your ${ordinal(inMonth)} ${c.noun} in 30 days, so your rhythm is holding.` };
    return { key: "published", line: `It is out, and every ${c.noun} adds to what your journal can tell you.` };
}
const per100 = (x) => {
    const v = x * 100;
    return v >= 10 ? String(Math.round(v)) : v.toFixed(1);
};
const nextCheckpoint = (hours) => CHECKPOINTS_HOURS.find((h) => h > hours * 1.25);
function watchLine(c) {
    const next = nextCheckpoint(c.ageHours);
    const again = next ? ` Look again after its ${ageWords(next)}.` : "";
    const o = c.ownCurve;
    if (o && o.multiple <= 1 / NOTABLE)
        return { key: "curve.behind", line: `It is running at ${times(o.multiple)} times your usual ${c.final ? c.noun : "start"}.${c.final ? " One stream is one data point, so judge the next few together." : ` Early numbers swing a lot.${again}`}` };
    if (c.secondary && c.secondary.multiple <= 1 / NOTABLE)
        return { key: "secondary.behind", line: `Watch ${c.secondary.name}: ${per100(c.secondary.value)} ${c.secondary.per}, against your usual ${per100(c.secondary.typical)}.` };
    if (c.peers && c.peers.multiple <= 1 / NOTABLE && (!o || o.multiple >= 0.9))
        return { key: "peers.behind", line: `You are on your own usual pace, but still behind ${c.spec.peers} your size. Reach is the part to work on over time, not on this ${c.noun}.` };
    if (c.final)
        return { key: "next", line: `Watch whether your next ${c.noun}s hold this level.` };
    return { key: "pace", line: `Watch whether it keeps this pace.${again}` };
}
function notification(c) {
    const t = quoted(c.work.title, 40);
    const b = c.bests.find((x) => x.fresh) ?? c.bests[0];
    if (b)
        return `${t}: ${b.line}`;
    const o = c.ownCurve;
    if (o && (o.multiple >= 1.1 || o.multiple <= 0.9))
        return `${t}: ${val(c, c.value)} ${c.metricName}${when(c)}, ${times(o.multiple)} times your usual ${c.final ? c.noun : "start"}.`;
    return `${t}: ${val(c, c.value)} ${c.metricName}${when(c)}, right on your usual ${c.final ? "level" : "pace"}.`;
}
