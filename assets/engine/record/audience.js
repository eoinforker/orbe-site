/*
  Audience quality and cadence, from snapshots. These are signals for a buyer
  to ask about, never verdicts: a subscriber jump can be a breakout video, and
  views with little engagement can be honest paid promotion.
*/
import { basisOfEntries, figure } from "./figures.js";
import { daysBetween, median, slug } from "./util.js";
/**
  Provisional constants, all judgements to be replaced by measured
  distributions from the benchmarks module (pass `benchmarks` to use them now):
  - floors below which views or engagement look thin for the audience size;
  - what counts as a jump (a gain over 2% of the audience at five times the
    usual daily pace, never less than 0.05% of the audience a day);
  - what counts as a spike (five times the median views at a third of the
    median engagement rate).
*/
export const AUDIENCE_RULES = {
    minWorks: 5,
    /** Works younger than this have not settled, so their counts are left out of medians. */
    settleDays: 14,
    viewsPerFollowerFloor: { youtube: 0.01, substack: 0.1, twitch: 0.002, podcast: 0.02, photography: 0.005 },
    engagementFloor: { youtube: 0.005, substack: 0.002, twitch: 0.01, podcast: 0, photography: 0.005 },
    jumpMinShare: 0.02,
    jumpMultiple: 5,
    jumpDailyFloorShare: 0.0005,
    breakoutMultiple: 3,
    spikeViews: 5,
    spikeEngagement: 0.35,
};
export const CADENCE_RULES = {
    minWorks: 3,
    recentDays: 90,
    windowDays: 365,
};
/** Metric names differ by kind and connector; the first present wins. */
export const VIEW_KEYS = {
    youtube: ["views", "viewCount"],
    substack: ["views", "opens"],
    twitch: ["averageViewers", "avgViewers", "views"],
    podcast: ["downloads", "plays"],
    photography: ["views", "impressions"],
};
export const ENGAGEMENT_KEYS = ["likes", "likeCount", "comments", "commentCount", "restacks", "shares", "saves", "chatMessages", "favourites"];
const viewsOf = (w, kind) => {
    for (const k of VIEW_KEYS[kind])
        if (typeof w.metrics[k] === "number")
            return w.metrics[k];
    return null;
};
const engagementOf = (w) => ENGAGEMENT_KEYS.reduce((a, k) => a + (typeof w.metrics[k] === "number" ? w.metrics[k] : 0), 0);
function snapshotsByAccount(prep) {
    const m = new Map();
    for (const s of prep.snapshots)
        m.set(s.snapshot.account.id, [...(m.get(s.snapshot.account.id) ?? []), s]);
    for (const list of m.values())
        list.sort((a, b) => a.snapshot.provenance.checkedAt.localeCompare(b.snapshot.provenance.checkedAt));
    return m;
}
/** Latest version of every work seen across an account's snapshots. */
function latestWorks(snaps) {
    const m = new Map();
    for (const s of snaps)
        for (const w of s.snapshot.works)
            m.set(w.id, { work: w, provId: s.provId });
    return [...m.values()];
}
export function audienceSignals(prep, benchmarks) {
    const out = [];
    for (const [accountId, snaps] of [...snapshotsByAccount(prep)].sort((a, b) => a[0].localeCompare(b[0]))) {
        const latest = snaps[snaps.length - 1];
        const account = latest.snapshot.account;
        const kind = account.kind;
        const id = `aud.${slug(account.handle || accountId)}`;
        const audience = figure(`${id}.audience`, `Audience, @${account.handle}`, account.audience, "count", [latest.provId], {
            basis: basisOfEntries([prep.provById.get(latest.provId)]),
        });
        const works = latestWorks(snaps).filter(({ work }) => {
            const age = daysBetween(work.publishedAt, prep.now);
            return age >= AUDIENCE_RULES.settleDays && age <= CADENCE_RULES.windowDays && viewsOf(work, kind) !== null;
        });
        const prov = [...new Set(works.map((w) => w.provId))];
        const basis = basisOfEntries(prov.map((p) => prep.provById.get(p)));
        const views = works.map(({ work }) => viewsOf(work, kind));
        const rates = works.map(({ work }) => (viewsOf(work, kind) > 0 ? engagementOf(work) / viewsOf(work, kind) : 0));
        const medViews = median(views);
        const medRate = median(rates);
        const enough = works.length >= AUDIENCE_RULES.minWorks;
        const medianViews = enough ? figure(`${id}.median_views`, `Median views per work, @${account.handle}`, medViews, "count", prov, { basis }) : null;
        const viewsPerFollower = enough && account.audience > 0
            ? figure(`${id}.vpf`, `Median views as a share of audience, @${account.handle}`, medViews / account.audience, "percent", [...prov, latest.provId], { basis })
            : null;
        const engagementRate = enough && medViews > 0 ? figure(`${id}.engagement`, `Median engagement per view, @${account.handle}`, medRate, "percent", prov, { basis }) : null;
        const bVpf = benchmarks?.(kind, account.audience, "views_per_follower") ?? null;
        const bEng = benchmarks?.(kind, account.audience, "engagement_rate") ?? null;
        const vpfFloor = bVpf?.p10 ?? AUDIENCE_RULES.viewsPerFollowerFloor[kind];
        const engFloor = bEng?.p10 ?? AUDIENCE_RULES.engagementFloor[kind];
        const thin = (!!viewsPerFollower && viewsPerFollower.value < vpfFloor) || (!!engagementRate && engagementRate.value < engFloor);
        const jumps = findJumps(snaps, prep, id, medViews);
        const spikes = [];
        if (enough && medViews > 0 && medRate > 0) {
            works.forEach(({ work, provId }, i) => {
                if (views[i] >= AUDIENCE_RULES.spikeViews * medViews && rates[i] <= AUDIENCE_RULES.spikeEngagement * medRate) {
                    const wid = `${id}.spike.${slug(work.id)}`;
                    spikes.push({
                        workId: work.id,
                        title: work.title,
                        publishedAt: work.publishedAt,
                        views: figure(`${wid}.views`, `Views, "${work.title}"`, views[i], "count", [provId], { basis }),
                        engagementRate: figure(`${wid}.engagement`, `Engagement per view, "${work.title}"`, rates[i], "percent", [provId], { basis }),
                        medianEngagementRate: engagementRate,
                    });
                }
            });
        }
        const unexplained = jumps.filter((j) => !j.explainedBy && j.severity !== "info");
        const verdict = unexplained.some((j) => j.severity === "high") || spikes.length >= 2 || (unexplained.length > 0 && spikes.length > 0)
            ? "suspicious"
            : unexplained.length || spikes.length || thin
                ? "watch"
                : enough
                    ? "consistent"
                    : "insufficient";
        out.push({
            accountId,
            handle: account.handle,
            kind,
            audience,
            worksMeasured: works.length,
            medianViews,
            viewsPerFollower,
            engagementRate,
            benchmark: bVpf?.cohort ?? bEng?.cohort ?? (thin ? "Provisional Orbe floors, not yet measured benchmarks" : null),
            jumps,
            spikes,
            verdict,
        });
    }
    return out;
}
function findJumps(snaps, prep, id, medViews) {
    // One reading per day: the last of the day.
    const daily = new Map();
    for (const s of snaps)
        daily.set(s.snapshot.provenance.checkedAt.slice(0, 10), s);
    const seq = [...daily.values()];
    if (seq.length < 2)
        return [];
    const steps = seq.slice(1).map((s, i) => {
        const a = seq[i];
        const days = Math.max(daysBetween(a.snapshot.provenance.checkedAt, s.snapshot.provenance.checkedAt), 0.5);
        const gain = s.snapshot.account.audience - a.snapshot.account.audience;
        return { a, b: s, days, gain, perDay: gain / days };
    });
    const usual = median(steps.map((s) => s.perDay));
    const works = latestWorks(snaps);
    const kind = seq[0].snapshot.account.kind;
    const out = [];
    // Mark each step, then merge consecutive steps in the same direction into one episode.
    const marks = steps.map((st) => {
        const before = st.a.snapshot.account.audience;
        const floor = Math.max(usual, before * AUDIENCE_RULES.jumpDailyFloorShare);
        if (st.gain > before * AUDIENCE_RULES.jumpMinShare && st.perDay > AUDIENCE_RULES.jumpMultiple * floor)
            return 1;
        if (st.gain < -before * AUDIENCE_RULES.jumpMinShare)
            return -1;
        return 0;
    });
    for (let i = 0; i < steps.length; i++) {
        if (!marks[i])
            continue;
        let j = i;
        while (j + 1 < steps.length && marks[j + 1] === marks[i])
            j++;
        const first = steps[i];
        const last = steps[j];
        const isDrop = marks[i] < 0;
        i = j;
        const before = first.a.snapshot.account.audience;
        const after = last.b.snapshot.account.audience;
        const from = first.a.snapshot.provenance.checkedAt;
        const to = last.b.snapshot.provenance.checkedAt;
        // A breakout upload published shortly before or during the jump explains it.
        const breakout = isDrop
            ? undefined
            : works.find(({ work }) => {
                const v = viewsOf(work, kind);
                return (v !== null &&
                    medViews > 0 &&
                    v >= AUDIENCE_RULES.breakoutMultiple * medViews &&
                    daysBetween(work.publishedAt, from) <= 7 &&
                    daysBetween(work.publishedAt, to) >= 0);
            });
        const share = Math.abs(after - before) / Math.max(before, 1);
        const severity = breakout ? "info" : isDrop ? "medium" : share > 0.1 ? "high" : "medium";
        const jid = `${id}.jump.${from.slice(0, 10)}`;
        const prov = [first.a.provId, last.b.provId];
        const basis = basisOfEntries(prov.map((p) => prep.provById.get(p)));
        out.push({
            from,
            to,
            before: figure(`${jid}.before`, `Audience on ${from.slice(0, 10)}`, before, "count", [first.a.provId], { basis }),
            after: figure(`${jid}.after`, `Audience on ${to.slice(0, 10)}`, after, "count", [last.b.provId], { basis }),
            gain: figure(`${jid}.gain`, isDrop ? "Audience lost" : "Audience gained", after - before, "count", prov, { basis }),
            explainedBy: breakout ? breakout.work.title : null,
            severity,
        });
    }
    return out;
}
export function cadenceSignals(prep) {
    const out = [];
    for (const [accountId, snaps] of [...snapshotsByAccount(prep)].sort((a, b) => a[0].localeCompare(b[0]))) {
        const account = snaps[snaps.length - 1].snapshot.account;
        const id = `cad.${slug(account.handle || accountId)}`;
        const works = latestWorks(snaps).filter(({ work }) => {
            const age = daysBetween(work.publishedAt, prep.now);
            return age >= 0 && age <= CADENCE_RULES.windowDays;
        });
        const prov = [...new Set(works.map((w) => w.provId))];
        const basis = basisOfEntries(prov.map((p) => prep.provById.get(p)));
        const dates = works.map((w) => w.work.publishedAt).sort();
        const works12m = figure(`${id}.works`, `Works published in the last year, @${account.handle}`, dates.length, "count", prov, { basis });
        if (dates.length < CADENCE_RULES.minWorks) {
            out.push({ accountId, handle: account.handle, works12m, medianGapDays: null, longestGapDays: null, daysSinceLast: null, recentVsPrior: null, risk: "insufficient" });
            continue;
        }
        const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
        const medGap = median(gaps);
        const longest = Math.max(...gaps);
        const since = daysBetween(dates[dates.length - 1], prep.now);
        const recent = dates.filter((d) => daysBetween(d, prep.now) <= CADENCE_RULES.recentDays).length / CADENCE_RULES.recentDays;
        const prior = dates.filter((d) => daysBetween(d, prep.now) > CADENCE_RULES.recentDays).length / (CADENCE_RULES.windowDays - CADENCE_RULES.recentDays);
        const ratio = prior > 0 ? recent / prior : null;
        const risk = (since > 3 * medGap && since > 30) || (ratio !== null && ratio < 0.5)
            ? "high"
            : (longest > 4 * medGap && longest > 30) || (ratio !== null && ratio < 0.75)
                ? "medium"
                : "low";
        out.push({
            accountId,
            handle: account.handle,
            works12m,
            medianGapDays: figure(`${id}.median_gap`, `Usual gap between works, @${account.handle}`, medGap, "days", prov, { basis }),
            longestGapDays: figure(`${id}.longest_gap`, `Longest gap between works, @${account.handle}`, longest, "days", prov, { basis }),
            daysSinceLast: figure(`${id}.since_last`, `Days since the last work, @${account.handle}`, since, "days", prov, { basis }),
            recentVsPrior: ratio === null ? null : figure(`${id}.recent_vs_prior`, `Publishing pace, last three months against the nine before, @${account.handle}`, ratio, "multiple", prov, { basis }),
            risk,
        });
    }
    return out;
}
