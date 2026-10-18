/*
  Disclosure checks: is the sponsored work labelled as an ad the way the law
  and the platform require, where its audience is?

  The rules are data (DISCLOSURE_RULES), each with its source. Orbe checks what
  it can read: the title, the description or sponsor block, a transcript if
  the creator gives one, and the platform's own paid-promotion flag. What it
  cannot read (a spoken or on-screen disclosure in a video) the creator
  attests to, and the result says it was attested, not checked.

  This is a check, not legal advice: the creator and the brand stay
  responsible for disclosure (YouTube and Twitch both say so). A failed
  required check blocks payout until the creator fixes the work, because a
  hidden ad is a banned practice under the UK's DMCC Act 2024 and a deceptive
  one under the FTC Act.
*/
export const JURISDICTIONS = ["UK", "US"];
/** Labels each regime accepts, lower case. A leading "#" is optional. */
export const ACCEPTED_LABELS = {
    UK: ["ad", "advert", "advertisement", "advertisement feature"],
    US: ["ad", "advert", "advertisement", "sponsored", "paid partnership", "paid promotion", "paid advertisement", "sponsored advertising content"],
};
/** Labels that look like disclosure but are not enough on their own. */
export const WEAK_LABELS = {
    UK: ["sponsored", "sp", "spon", "in collaboration with", "in association with", "thanks to", "supported by", "collab", "gifted", "aff", "affiliate", "partner", "ambassador"],
    US: ["sp", "spon", "collab", "promoted", "thanks to", "ambassador", "partner"],
};
/**
  How much of a description counts as "upfront": roughly what YouTube and
  email clients show before "more" or the fold. PROVISIONAL: platforms change
  their truncation; re-measure per platform.
*/
export const UPFRONT_CHARS = 125;
const VIDEO = ["youtube", "twitch"];
const ALL = ["youtube", "substack", "podcast", "twitch", "photography"];
const ASA = { label: "ASA and CMA, Influencers' guide to making clear that ads are ads", url: "https://www.asa.org.uk/news/new-guidance-launched-for-social-influencers.html" };
const ASA_LEWIS = { label: "Lewis Silkin, ASA report on influencer transparency (May 2025)", url: "https://www.lewissilkin.com/en/insights/2025/05/09/asa-publishes-new-report-on-influencer-transparency-102kaqy" };
const DMCC = { label: "RPC, CMA guidance under the DMCC Act: hidden advertising is a banned practice (2025)", url: "https://www.rpclegal.com/snapshots/advertising-and-marketing/autumn-2025/cma-publishes-updated-principles-for-social-media-platforms-on-reviews-and-endorsements/" };
const FTC_VIDEO = { label: "Tubefilter, the FTC says #ad in a video description is not enough (2023)", url: "https://www.tubefilter.com/2023/07/05/heads-up-creators-the-ftc-says-ad-in-your-video-description-is-not-enough-disclosure/" };
const FTC_NATIVE = { label: "FTC, Native advertising: a guide for businesses", url: "https://ftc.gov/tips-advice/business-center/guidance/native-advertising-guide-businesses" };
const FTC_WARN = { label: "ZwillGen, FTC warning letters on endorsements", url: "https://www.zwillgen.com/ftc-state-ag/ftc-warning-letters-violations-endorsements-testimonials/" };
const YT = { label: "YouTube Help, Paid product placements, endorsements and sponsorships", url: "https://support.google.com/youtube/answer/154235?hl=en-AU" };
const TWITCH = { label: "Lindsey Gamble, Twitch's branded content disclosure tool", url: "https://www.lindseygamble.com/blog/twitch-branded-content-disclosure-tool" };
export const DISCLOSURE_RULES = [
    {
        id: "uk.label_upfront",
        scope: "UK",
        kinds: ALL,
        check: "label_upfront",
        severity: "required",
        rule: 'Label it "Ad" or "#ad" upfront, before anyone engages with it. "Sponsored", "in collaboration with", "thanks to" and "#gifted" are not enough on their own.',
        sources: [ASA, ASA_LEWIS, DMCC],
    },
    {
        id: "uk.spoken",
        scope: "UK",
        kinds: ["podcast"],
        check: "spoken",
        severity: "required",
        rule: "Say that it is an ad at the start of the read, since listeners cannot see a label.",
        sources: [ASA],
    },
    {
        id: "us.label_upfront",
        scope: "US",
        kinds: ALL,
        check: "label_upfront",
        severity: "required",
        rule: 'Use a clear label such as "Ad", "Advertisement" or "Sponsored" where it will be seen, in front of or above the content, not many lines into a caption. "Promoted" and "#sp" are ambiguous.',
        sources: [FTC_NATIVE, FTC_WARN],
    },
    {
        id: "us.spoken",
        scope: "US",
        kinds: ["youtube", "twitch", "podcast"],
        check: "spoken",
        severity: "required",
        rule: "Say it in the video or audio itself. A hashtag in the description alone is not enough for video.",
        sources: [FTC_VIDEO],
    },
    {
        id: "us.on_screen",
        scope: "US",
        kinds: VIDEO,
        check: "on_screen",
        severity: "required",
        rule: "Show it on screen as well as saying it, with the endorsement, and again if people may join part way through.",
        sources: [FTC_VIDEO],
    },
    {
        id: "us.sponsor_named",
        scope: "US",
        kinds: ALL,
        check: "sponsor_named",
        severity: "recommended",
        rule: "Name the sponsor: a label that does not say who paid may still be inadequate.",
        sources: [FTC_WARN],
    },
    {
        id: "youtube.paid_promotion",
        scope: "platform",
        kinds: ["youtube"],
        check: "platform_flag",
        severity: "required",
        rule: 'Tick "My video contains paid promotion" in the video details. YouTube then shows "Includes paid promotion" to viewers. It does not replace a label.',
        sources: [YT],
    },
    {
        id: "twitch.branded_content",
        scope: "platform",
        kinds: ["twitch"],
        check: "platform_flag",
        severity: "required",
        rule: 'Mark the stream as "Branded Content" in Stream Manager for the sponsored part. It does not replace saying so on stream.',
        sources: [TWITCH],
    },
];
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Where a label appears as a whole word or hashtag, or -1. */
function findLabel(text, labels) {
    let best = null;
    for (const label of labels) {
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])#?${escapeRe(label).replace(/ /g, "\\s*")}(?=$|[^\\p{L}\\p{N}])`, "iu");
        const m = re.exec(text);
        if (m) {
            const index = m.index + m[1].length;
            if (!best || index < best.index)
                best = { label, index };
        }
    }
    return best;
}
function labelUpfront(j, input) {
    const title = norm(input.title);
    const desc = input.description === null ? null : norm(input.description);
    const accepted = ACCEPTED_LABELS[j];
    const inTitle = findLabel(title, accepted);
    if (inTitle)
        return { status: "met", evidence: `"${inTitle.label}" is in the title.` };
    if (desc !== null) {
        const inDesc = findLabel(desc, accepted);
        if (inDesc && inDesc.index < UPFRONT_CHARS)
            return { status: "met", evidence: `"${inDesc.label}" opens the description (character ${inDesc.index + 1}).` };
        if (inDesc)
            return { status: "weak", evidence: `"${inDesc.label}" is in the description but only at character ${inDesc.index + 1}, after the part people see first.` };
    }
    const weak = findLabel(`${title} ${desc ?? ""}`, WEAK_LABELS[j]);
    if (weak)
        return { status: "weak", evidence: `"${weak.label}" is used, which is not a clear enough label here.` };
    if (desc === null)
        return { status: "unreadable", evidence: "No label in the title, and the description could not be read." };
    return { status: "missing", evidence: "No ad label in the title or the start of the description." };
}
function spoken(input) {
    if (input.transcript !== null) {
        const t = norm(input.transcript);
        const hit = findLabel(t.slice(0, 600), ["ad", "advert", "advertisement", "sponsored", "sponsor", "paid promotion", "paid partnership"]);
        if (hit)
            return { status: "met", evidence: `The transcript says "${hit.label}" near the start.` };
        if (input.attestations.spoken)
            return { status: "attested", evidence: "Not found near the start of the transcript, but the creator confirms they said it." };
        return { status: "missing", evidence: "The transcript does not say it is an ad near the start." };
    }
    if (input.attestations.spoken)
        return { status: "attested", evidence: "The creator confirms they said it; Orbe cannot hear the work." };
    return { status: "unreadable", evidence: "Orbe cannot hear the work. Confirm you said it, or add a transcript." };
}
function evaluate(rule, input) {
    switch (rule.check) {
        case "label_upfront":
            return labelUpfront(rule.scope === "platform" ? "US" : rule.scope, input);
        case "spoken":
            return spoken(input);
        case "on_screen":
            return input.attestations.onScreen
                ? { status: "attested", evidence: "The creator confirms it is shown on screen; Orbe cannot see the video." }
                : { status: "unreadable", evidence: "Orbe cannot see the video. Confirm the label is on screen." };
        case "platform_flag":
            if (input.platformFlag === true)
                return { status: "met", evidence: "The platform reports the paid promotion flag as set." };
            if (input.platformFlag === false)
                return { status: "missing", evidence: "The platform reports the paid promotion flag as not set." };
            if (input.attestations.platformFlag)
                return { status: "attested", evidence: "The platform did not say, but the creator confirms the flag is set." };
            return { status: "unreadable", evidence: "The platform did not say whether the flag is set. Confirm you set it." };
        case "sponsor_named": {
            const name = norm(input.brandName).trim();
            const text = norm(`${input.title} ${input.description ?? ""} ${input.transcript ?? ""}`);
            return name && text.includes(name) ? { status: "met", evidence: `${input.brandName} is named.` } : { status: "missing", evidence: `${input.brandName} is not named in what Orbe can read.` };
        }
    }
}
export function rulesFor(kind, jurisdictions) {
    return DISCLOSURE_RULES.filter((r) => r.kinds.includes(kind) && (r.scope === "platform" || jurisdictions.includes(r.scope)));
}
export function checkDisclosure(input, at) {
    const results = rulesFor(input.kind, input.jurisdictions).map((r) => {
        const { status, evidence } = evaluate(r, input);
        return { id: r.id, scope: r.scope, severity: r.severity, rule: r.rule, status, evidence, sources: r.sources };
    });
    const required = results.filter((r) => r.severity === "required");
    const failed = required.some((r) => r.status === "missing" || r.status === "weak");
    const unsure = required.some((r) => r.status === "unreadable");
    return { status: failed ? "fail" : unsure ? "needs_attestation" : "pass", results, checkedAt: at };
}
