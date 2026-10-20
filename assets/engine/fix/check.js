/*
  The guardrails. Every option is checked against the video before a creator
  sees it, so nothing Orbe offers is misleading, and every fix is checked
  against the creator's deals and permissions before anything changes.

  The text checks are deliberately blunt: a new number, or a title that
  shares no subject word with the current title and description, is held
  back rather than judged clever. They are PROVISIONAL and named, so they can
  be tuned once creators have reviewed real options.

  Browser-safe: no node: imports.
*/
import { TITLE_MAX } from "./router.js";
/** PROVISIONAL: words of four letters or more count as subject words; a title over half in capitals is shouting. */
export const SUBJECT_MIN_LETTERS = 4;
export const SHOUTING_SHARE = 0.5;
const STOP = new Set(["this", "that", "with", "from", "your", "what", "when", "will", "have", "about", "they", "them", "then", "than", "into", "just", "like", "more", "most", "only", "over", "some", "very", "were", "which", "here", "there", "their", "these", "those", "does", "make", "made"]);
const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
const subjectWords = (s) => new Set(words(s).filter((w) => w.length >= SUBJECT_MIN_LETTERS && !STOP.has(w) && !/^\d+$/.test(w)).map(stem));
const numbers = (s) => new Set((s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "")));
const stem = (w) => w.replace(/(ing|ers|ies|es|s|ed)$/, "");
const capsShare = (s) => {
    const ws = s.match(/\p{L}{2,}/gu) ?? [];
    return ws.length ? ws.filter((w) => w === w.toUpperCase()).length / ws.length : 0;
};
export function checkOption(option, current) {
    const issues = [];
    const notes = [];
    if (option.kind === "thumbnail") {
        if (!/^https:\/\//.test(option.imageUrl))
            issues.push("not_https");
        notes.push("A person must look at every thumbnail before it goes up: Orbe cannot see whether an image shows something the video does not.");
        return { optionId: option.id, ok: !issues.length, issues, notes };
    }
    const t = option.title.trim();
    const source = `${current.title} ${current.description ?? ""}`;
    if (!t)
        issues.push("empty");
    if (t.length > TITLE_MAX)
        issues.push("too_long");
    if (t.toLowerCase() === current.title.trim().toLowerCase())
        issues.push("same_as_current");
    const known = numbers(source);
    const fresh = [...numbers(t)].filter((n) => !known.has(n));
    if (fresh.length) {
        issues.push("new_number");
        notes.push(`Mentions ${fresh.join(", ")}, which the title and description do not.`);
    }
    const subject = subjectWords(source);
    const own = subjectWords(t);
    if (own.size && ![...own].some((w) => subject.has(w)))
        issues.push("off_topic");
    if (capsShare(t) > SHOUTING_SHARE && capsShare(current.title) <= SHOUTING_SHARE)
        issues.push("shouting");
    return { optionId: option.id, ok: !issues.length, issues, notes };
}
/** Whether a fix may go ahead on this upload, and whether it needs the creator's tap or may run on its own. */
export function gate(ctx) {
    const reasons = [];
    if (ctx.liveSponsorship && !ctx.liveSponsorship.brandAgreed)
        reasons.push(`The upload carries a live sponsorship for ${ctx.liveSponsorship.brand}; it changes only if the brand agrees.`);
    if (!ctx.youtubeWrite)
        reasons.push("The creator has not given YouTube permission to change titles and thumbnails.");
    if (ctx.openFix)
        reasons.push("A fix is already running on this upload; judge it or undo it first.");
    if (reasons.length)
        return { allowed: false, mode: null, reasons };
    return { allowed: true, mode: ctx.autoOptIn ? "auto" : "approval", reasons: [] };
}
