/*
  Video fingerprints: the pHash of a keyframe every N seconds, and a sliding
  match that finds a clip of an original inside a longer video (a compilation,
  a reaction, a re-upload with an intro), with the offset and a confidence.

  The caller samples the frames (in the browser, a video element drawn to a
  canvas; on a server, any decoder). This module only sees pixels and times.
*/
import { pHash, hamming, toHex, fromHex } from "./image.js";
export const DEFAULT_INTERVAL = 1;
/** The times to sample a video of `duration` seconds, every `interval` seconds, staying clear of the very end. */
export function sampleTimes(duration, interval = DEFAULT_INTERVAL) {
    if (!(duration > 0) || !(interval > 0))
        return [];
    const out = [];
    for (let t = Math.min(interval / 2, duration / 2); t < duration - 0.05; t += interval)
        out.push(Math.round(t * 1000) / 1000);
    return out.length ? out : [duration / 2];
}
/** Fingerprint from sampled frames. Frames are sorted by time. */
export function fingerprintVideo(frames, interval = DEFAULT_INTERVAL, duration) {
    const sorted = [...frames].sort((a, b) => a.t - b.t);
    return { kind: "video", interval, times: sorted.map((f) => f.t), hashes: sorted.map((f) => pHash(f.image)), ...(duration !== undefined ? { duration } : {}) };
}
/** A keyframe distance at or under this counts as the same shot. */
export const FRAME_MATCH_MAX = 12;
/** The fewest keyframes in a row that count as a found clip. */
export const MIN_RUN = 3;
function nearest(times, t) {
    let lo = 0, hi = times.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] < t)
            lo = mid + 1;
        else
            hi = mid;
    }
    if (lo > 0 && Math.abs(times[lo - 1] - t) <= Math.abs(times[lo] - t))
        return lo - 1;
    return lo;
}
/* The best stretch of matching keyframes for one shift (long time = clip time + shift). One miss inside a stretch is forgiven. */
function bestRun(clip, long, shift, tol) {
    let best = null;
    let cur = null;
    let misses = 0;
    let pending = 0;
    const close = () => { if (cur && cur.matched >= 1 && (!best || cur.matched > best.matched || (cur.matched === best.matched && cur.sum / (cur.end - cur.start + 1) < best.sum / (best.end - best.start + 1))))
        best = cur; cur = null; misses = 0; pending = 0; };
    for (let i = 0; i < clip.hashes.length; i++) {
        const t = clip.times[i] + shift;
        const j = nearest(long.times, t);
        if (Math.abs(long.times[j] - t) > tol) {
            close();
            continue;
        }
        const d = hamming(clip.hashes[i], long.hashes[j]);
        if (d <= FRAME_MATCH_MAX) {
            if (!cur)
                cur = { shift, start: i, end: i, matched: 0, sum: 0, hit: 0 };
            cur.end = i;
            cur.matched++;
            cur.sum += d + pending;
            cur.hit += d;
            misses = 0;
            pending = 0;
        }
        else if (cur && misses === 0 && i + 1 < clip.hashes.length) {
            misses = 1;
            pending = d;
        }
        else
            close();
    }
    close();
    return best;
}
/**
  Find where any stretch of the clip appears inside the longer video. Every
  alignment is tried, stepping by the finer of the two sampling intervals, so the
  two can be sampled at different rates and the clip may appear only in part.
  Each clip keyframe is compared with the long video's nearest keyframe in time;
  the longest run of matching keyframes wins, closer frames breaking ties.
*/
export function findClip(clip, long) {
    const none = { found: false, offset: 0, clipStart: 0, length: 0, meanDistance: 32, matched: 0, compared: 0, coverage: 0, confidence: 0 };
    if (!clip.hashes.length || !long.hashes.length)
        return none;
    const step = Math.min(clip.interval, long.interval) / 2;
    const tol = Math.max(clip.interval, long.interval) * 0.6;
    const lo = long.times[0] - clip.times[clip.times.length - 1];
    const hi = long.times[long.times.length - 1] - clip.times[0];
    const runs = [];
    for (let shift = Math.floor(lo / step) * step; shift <= hi + 1e-9; shift += step) {
        const r = bestRun(clip, long, shift, tol);
        if (r)
            runs.push(r);
    }
    if (!runs.length)
        return none;
    const mean = (r) => r.sum / (r.end - r.start + 1);
    runs.sort((a, b) => b.matched - a.matched || mean(a) - mean(b));
    const best = runs[0];
    const span = best.end - best.start + 1;
    const offset = clip.times[best.start] + best.shift;
    // The best rival: a run that does not sit on the same stretch of the long video.
    const rival = runs.find((r) => Math.abs(clip.times[r.start] + r.shift - offset) > Math.max(clip.interval, long.interval) * 2);
    const closeness = Math.max(0, 1 - best.hit / best.matched / 32);
    const length = Math.min(1, best.matched / 6);
    const clarity = rival ? Math.max(0, 1 - rival.matched / best.matched) : 1;
    const confidence = Math.round(closeness * (0.4 + 0.6 * length) * (0.5 + 0.5 * clarity) * 100) / 100;
    return {
        found: best.matched >= MIN_RUN,
        offset: Math.round(Math.max(0, offset) * 100) / 100,
        clipStart: Math.round(clip.times[best.start] * 100) / 100,
        length: Math.round((clip.times[best.end] - clip.times[best.start] + clip.interval) * 100) / 100,
        meanDistance: Math.round(mean(best) * 10) / 10,
        matched: best.matched,
        compared: span,
        coverage: Math.round((span / clip.hashes.length) * 100) / 100,
        confidence,
    };
}
export const videoToJSON = (v) => ({ kind: "video", interval: v.interval, times: v.times, hashes: v.hashes.map(toHex), ...(v.duration !== undefined ? { duration: v.duration } : {}) });
export const videoFromJSON = (j) => ({ kind: "video", interval: j.interval, times: j.times, hashes: j.hashes.map(fromHex), ...(j.duration !== undefined ? { duration: j.duration } : {}) });
