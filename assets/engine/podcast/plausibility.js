/*
  Is a podcast's claimed or host-reported download count consistent with
  what can be seen in public? The model never accuses: each flag says what
  was compared, the numbers on both sides, an innocent reading where there
  is one, and how sure we are. Thresholds are deliberately loose and every
  one is provisional, named in PLAUSIBILITY_RULES: they are guesses until
  Orbe has measured (prefix) and host-reported numbers side by side for
  enough consenting shows to fit real tolerances. Replace them then, and
  publish the change with the maths version.
  Signals, strongest first: Orbe's own measurement; OP3's public counts;
  the claim's internal consistency; Podcast Index's record of the feed;
  YouTube views of the video versions; chart positions; public ratings.
*/
export const PLAUSIBILITY_RULES = {
    /** Orbe measured against a claim: different methods agree within this factor (provisional). */
    measuredTolerance: 1.5,
    /** Beyond this factor the claim and Orbe's count cannot both describe the same downloads (provisional). */
    measuredHard: 2,
    /** OP3 against a claim: looser, since OP3's rules and coverage differ from a host's (provisional). */
    op3Tolerance: 1.75,
    op3Hard: 3,
    /** Days of measurement before Orbe's own count is compared at all. */
    minMeasuredDays: 28,
    /** OP3 weeks of data before its count is compared. */
    minOp3Weeks: 4,
    /** A daily series this flat (coefficient of variation) over this many days, at this volume, is unusual (provisional). */
    flatCv: 0.02,
    flatMinDays: 14,
    flatMinMean: 50,
    /** Share of days that are exact hundreds before round numbers are worth a question (provisional). */
    roundShare: 0.5,
    roundMinMean: 200,
    /** Audio claimed per episode against YouTube views per episode, beyond which we note it (provisional, info only). */
    audioToVideoRatio: 100,
    minVideoMatches: 3,
    /** Monthly downloads above which a show with almost no public ratings is worth a question (provisional). */
    ratingsClaimMonthly: 250_000,
    ratingsFloor: 10,
    /** A daily sum that differs from the claimed total by more than this share (provisional). */
    totalTolerance: 0.05,
};
/** Bump when a threshold changes, so a report can say which rules it used. */
export const RULES_VERSION = "2026.10-provisional";
const median = (xs) => {
    if (!xs.length)
        return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (n) => Math.round(n).toLocaleString("en-GB");
function compare(flags, code, label, claim, other, tolerance, hard, innocent) {
    if (other <= 0 && claim <= 0)
        return;
    const ratio = other > 0 ? claim / other : Infinity;
    const evidence = { claimed: Math.round(claim), [label]: Math.round(other), ratio: Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : "no downloads seen" };
    if (ratio > hard)
        flags.push({ code, severity: "high", reason: `The claim of ${fmt(claim)} downloads in 30 days is more than ${hard} times the ${fmt(other)} ${label} for the same period.`, innocent, evidence });
    else if (ratio > tolerance)
        flags.push({ code, severity: "medium", reason: `The claim of ${fmt(claim)} downloads in 30 days is ${evidence.ratio} times the ${fmt(other)} ${label}.`, innocent, evidence });
    else if (ratio < 1 / hard)
        flags.push({ code: `${code}_low`, severity: "low", reason: `The claim of ${fmt(claim)} is well below the ${fmt(other)} ${label}.`, innocent: "A claim lower than the count is unusual but not a concern for buyers: it may be an older figure or a narrower one.", evidence });
}
export function assessPlausibility(input) {
    const R = PLAUSIBILITY_RULES;
    const flags = [];
    const used = [];
    const claim = input.claim;
    // Orbe's own count. A partial prefix undercounts, so it can only show a claim is too low, not too high.
    if (claim?.monthlyDownloads !== undefined && input.measured && input.measured.daysMeasured >= R.minMeasuredDays) {
        used.push("Measured by Orbe");
        if (input.measured.prefixCoverage === "live") {
            compare(flags, "measured_mismatch", "downloads measured by Orbe", claim.monthlyDownloads, input.measured.monthlyDownloads, R.measuredTolerance, R.measuredHard, "Hosts and Orbe filter bots and partial downloads differently, and a host may count listeners who reach the file without the prefix (some apps cache the old URL for a while).");
        }
    }
    if (claim?.monthlyDownloads !== undefined && input.op3 && input.op3.numWeeks >= R.minOp3Weeks) {
        used.push("OP3 public counts");
        compare(flags, "op3_mismatch", "downloads OP3 counted", claim.monthlyDownloads, input.op3.monthlyDownloads, R.op3Tolerance, R.op3Hard, "OP3 counts only requests through its prefix, and its rules differ from a host's.");
    }
    // The claim against itself.
    for (const e of claim?.episodes ?? []) {
        if (e.downloads_7d !== undefined && e.downloads_30d !== undefined && e.downloads_7d > e.downloads_30d) {
            flags.push({ code: "window_order", severity: "high", reason: "An episode has more downloads in its first week than in its first month, which cannot happen for one count.", evidence: { episode: e.guid, downloads_7d: e.downloads_7d, downloads_30d: e.downloads_30d } });
        }
        if (e.publishedAt > input.now.toISOString() && (e.downloads_7d ?? 0) > 0) {
            flags.push({ code: "future_episode", severity: "high", reason: "Downloads are claimed for an episode that is not published yet.", evidence: { episode: e.guid, publishedAt: e.publishedAt } });
        }
    }
    if (claim?.daily) {
        used.push("Claimed daily series");
        const days = Object.entries(claim.daily).sort(([a], [b]) => (a < b ? -1 : 1));
        const values = days.map(([, n]) => n);
        const sum = values.reduce((a, b) => a + b, 0);
        if (claim.dailyTotal !== undefined && claim.dailyTotal > 0 && Math.abs(sum - claim.dailyTotal) / claim.dailyTotal > R.totalTolerance) {
            flags.push({ code: "total_mismatch", severity: "medium", reason: `The daily figures add up to ${fmt(sum)}, not the ${fmt(claim.dailyTotal)} claimed for the same days.`, innocent: "Exports sometimes round or cut off the last day.", evidence: { sumOfDays: sum, claimedTotal: claim.dailyTotal } });
        }
        const firstEpisode = input.feed?.episodes.map((e) => e.publishedAt.slice(0, 10)).sort()[0];
        if (firstEpisode) {
            const before = days.filter(([d, n]) => d < firstEpisode && n > 0);
            if (before.length)
                flags.push({ code: "before_first_episode", severity: "medium", reason: `Downloads are claimed on ${before.length} days before the feed's first episode came out (${firstEpisode}).`, innocent: "Episodes can be removed from a feed later; the first episode we see may not be the first published.", evidence: { days: before.length, firstEpisode } });
        }
        if (values.length >= R.flatMinDays) {
            const mean = sum / values.length;
            const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
            if (mean >= R.flatMinMean && sd / mean < R.flatCv) {
                flags.push({ code: "flat_series", severity: "medium", reason: `Daily downloads barely move over ${values.length} days (they vary by under ${R.flatCv * 100}%), where real listening rises after each episode and dips at weekends.`, evidence: { days: values.length, mean: Math.round(mean), cv: Math.round((sd / mean) * 1000) / 1000 } });
            }
            const round = values.filter((v) => v > 0 && v % 100 === 0).length / values.length;
            if (mean >= R.roundMinMean && round >= R.roundShare) {
                flags.push({ code: "round_numbers", severity: "low", reason: `${Math.round(round * 100)}% of the daily figures are exact hundreds.`, innocent: "Some exports round small numbers.", evidence: { share: Math.round(round * 100) / 100 } });
            }
        }
    }
    if (input.index) {
        used.push("Podcast Index");
        if (input.index.dead)
            flags.push({ code: "feed_dead", severity: "medium", reason: "Podcast Index marks this feed as dead: it has stopped answering or moved.", innocent: "A feed that moved host and set a redirect can be marked dead at its old address.", evidence: { podcastIndexId: input.index.id } });
        const claimedEpisodes = claim?.episodes?.length ?? 0;
        if (input.index.episodeCount !== undefined && claimedEpisodes > input.index.episodeCount * 1.5 + 5) {
            flags.push({ code: "more_episodes_than_public", severity: "low", reason: `The claim covers ${claimedEpisodes} episodes; Podcast Index sees ${input.index.episodeCount} in the public feed.`, innocent: "Private, premium or deleted episodes are counted by hosts but are not in the public feed.", evidence: { claimed: claimedEpisodes, public: input.index.episodeCount } });
        }
    }
    const perEpisode = median((claim?.episodes ?? []).map((e) => e.downloads_30d).filter((n) => typeof n === "number"));
    const videos = input.videos ?? [];
    if (perEpisode !== null && videos.length >= R.minVideoMatches) {
        used.push("YouTube views of video episodes");
        const views = median(videos.map((v) => v.views));
        if (views > 0 && perEpisode / views > R.audioToVideoRatio) {
            flags.push({ code: "audio_far_above_video", severity: "info", reason: `A typical episode claims ${fmt(perEpisode)} audio downloads in a month against ${fmt(views)} YouTube views of its video.`, innocent: "Audio-first shows often post video as an afterthought; this alone means little.", evidence: { downloadsPerEpisode: perEpisode, viewsPerVideo: views } });
        }
    }
    if (input.bestChart)
        used.push("Chart positions");
    if (input.ratings) {
        used.push("Public ratings");
        if (claim?.monthlyDownloads !== undefined && claim.monthlyDownloads >= R.ratingsClaimMonthly && input.ratings.count < R.ratingsFloor && !input.bestChart) {
            flags.push({ code: "big_claim_little_public_trace", severity: "low", reason: `The show claims ${fmt(claim.monthlyDownloads)} downloads a month but has ${input.ratings.count} public ratings and no chart position we have seen.`, innocent: "Shows that grow through one platform's recommendations, or in countries we do not track, can leave little public trace.", evidence: { monthly: claim.monthlyDownloads, ratings: input.ratings.count } });
        }
    }
    let estimate = null;
    if (input.op3 && input.op3.numWeeks >= R.minOp3Weeks) {
        // OP3's count is a floor for listening through its prefix; we widen it upwards only, by the same provisional tolerance.
        estimate = { monthlyLow: input.op3.monthlyDownloads, monthlyHigh: Math.round(input.op3.monthlyDownloads * R.op3Tolerance), basis: "OP3's public count of downloads through its prefix", provenance: { basis: "public", method: "estimated" } };
    }
    const worst = flags.reduce((w, f) => (w === null || rank(f.severity) > rank(w) ? f.severity : w), null);
    let verdict;
    if (!claim)
        verdict = "not_enough_signal";
    else if (worst === "high")
        verdict = "inconsistent";
    else if (worst === "medium")
        verdict = "questions";
    else if (used.length === 0)
        verdict = "not_enough_signal";
    else
        verdict = worst ? "consistent_with_notes" : "consistent";
    return { verdict, flags, estimate, signalsUsed: used, rulesVersion: RULES_VERSION };
}
const rank = (s) => ({ info: 0, low: 1, medium: 2, high: 3 })[s];
