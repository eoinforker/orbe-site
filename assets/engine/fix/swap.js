import { BASELINE_RULE, FIX_VERSION, judgeLift, sealBaseline } from "./lift.js";
export class FixError extends Error {
}
const step = (f, at, state, by, note) => ({
    ...f,
    state,
    history: [...f.history, { at, state, by, ...(note ? { note } : {}) }],
});
export function propose(input) {
    if (!input.gate.allowed || !input.gate.mode)
        throw new FixError(input.gate.reasons.join(" ") || "This upload cannot be fixed.");
    const title = input.chosen.find((o) => o.kind === "title");
    const thumb = input.chosen.find((o) => o.kind === "thumbnail");
    if (!title && !thumb)
        throw new FixError("Choose a new title, a new thumbnail, or both.");
    const after = { title: title?.kind === "title" ? title.title : input.before.title, thumbnailUrl: thumb?.kind === "thumbnail" ? thumb.imageUrl : input.before.thumbnailUrl };
    // A person looks at every thumbnail, so a new one always waits for the creator.
    const mode = thumb ? "approval" : input.gate.mode;
    const f = { id: input.id, workId: input.workId, videoId: input.videoId, publishedAt: input.publishedAt, mode, state: "proposed", before: input.before, after, options: input.chosen.map((o) => o.id), baseline: null, result: null, fee: null, history: [] };
    return mode === "auto" ? step(step(f, input.at, "proposed", "orbe"), input.at, "approved", "orbe", "Automatic: the creator opted in for titles on this channel.") : step(f, input.at, "proposed", "orbe");
}
export function approve(f, at) {
    if (f.state !== "proposed")
        throw new FixError(`Only a proposed fix can be approved; this one is ${f.state}.`);
    return step(f, at, "approved", "creator");
}
/** Records that the change went live, sealing the baseline from the views at that moment. */
export function applied(f, at, viewsAtChange) {
    if (f.state !== "approved")
        throw new FixError(`Only an approved fix can be applied; this one is ${f.state}.`);
    const baseline = sealBaseline({ fixId: f.id, workId: f.workId, madeAt: at, publishedAt: f.publishedAt, viewsAtChange, rule: BASELINE_RULE, version: FIX_VERSION });
    return { ...step(f, at, "applied", "orbe"), baseline };
}
/** One tap from the creator. Before it is live nothing changes on YouTube; after, the old packaging goes back. Never a fee. */
export function undo(f, at) {
    if (f.state === "proposed" || f.state === "approved")
        return step(f, at, "cancelled", "creator");
    if (f.state === "applied" || f.state === "kept")
        return { ...step(f, at, "reverted", "creator", "Undone by the creator."), fee: null };
    throw new FixError(`This fix is already ${f.state}.`);
}
/** Judges an applied fix: kept and charged on lift, put back with no fee otherwise. Too soon leaves it running. */
export function judge(f, at, viewsNow) {
    if (f.state !== "applied" || !f.baseline)
        throw new FixError(`Only an applied fix can be judged; this one is ${f.state}.`);
    const result = judgeLift(f.baseline, at, viewsNow);
    if (result.status === "too_soon")
        return { ...f, result };
    if (result.status === "lifted")
        return { ...step(f, at, "kept", "orbe", result.text), result, fee: result.fee };
    return { ...step(f, at, "reverted", "orbe", result.text), result, fee: null };
}
export const YT_VIDEOS = "https://www.googleapis.com/youtube/v3/videos?part=snippet";
export const YT_THUMBNAILS = "https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=";
/**
  The requests that put `to` live. videos.update replaces the whole snippet,
  so the caller passes the snippet it has just read (categoryId is required)
  and only the title is changed in it.
*/
export function youtubeCalls(f, direction, snippet) {
    const [from, to] = direction === "apply" ? [f.before, f.after] : [f.after, f.before];
    const calls = [];
    if (to.title !== from.title)
        calls.push({ method: "PUT", url: YT_VIDEOS, body: { id: f.videoId, snippet: { ...snippet, title: to.title } }, note: `Title to "${to.title}".` });
    if (to.thumbnailUrl !== from.thumbnailUrl && to.thumbnailUrl)
        calls.push({ method: "POST", url: YT_THUMBNAILS + encodeURIComponent(f.videoId), upload: to.thumbnailUrl, note: "Thumbnail: upload the image at this address." });
    return calls;
}
