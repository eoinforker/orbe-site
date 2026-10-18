/*
  Counting downloads from the prefix logs, in the style of the IAB Tech Lab
  Podcast Measurement Technical Guidelines v2.2:
  - only GET requests count; HEAD and other methods are not downloads;
  - known bots, crawlers, feed parsers and blank user agents are removed;
  - one download per listener (hashed IP plus user agent) per episode per
    24-hour window; we use the UTC day, which the daily salt enforces anyway;
  - a listener's requests for an episode must between them ask for at least
    a minute of audio, judged from the Range headers, so players probing the
    first bytes (bytes=0-1) or the file's end do not count;
  - a listener hash with implausibly many downloads in a day is removed as
    abuse (IAB asks for filtering of abnormal activity).
  A redirect service sees what was asked for, not what was served, so the
  minute test is on requested bytes. That is the main way our counts can
  differ from a host's that serves the bytes itself; HOSTS.md says so.
*/
import { enclosureKey } from "../ingest/browser.js";
import { appOf, isBot, platformOf } from "./useragents.js";
/** IAB's minimum: a download must be at least one minute of content. */
export const MIN_SECONDS = 60;
/** Provisional: 128 kbit/s, a common podcast MP3 rate, for files whose size and length we do not know. */
export const DEFAULT_BYTES_PER_SECOND = 16_000;
/** Provisional: more distinct episode downloads than this from one listener hash in a day is treated as abuse. Tune from real logs. */
export const MAX_DOWNLOADS_PER_LISTENER_DAY = 40;
/** "bytes=0-1, 100-, -500" into ranges. Null for a malformed header, which is treated as no range. */
export function parseRange(header) {
    if (!header)
        return null;
    const m = /^\s*bytes\s*=\s*(.+)$/i.exec(header);
    if (!m)
        return null;
    const out = [];
    for (const part of m[1].split(",")) {
        const p = /^\s*(\d*)\s*-\s*(\d*)\s*$/.exec(part);
        if (!p || (p[1] === "" && p[2] === ""))
            return null;
        if (p[1] === "")
            out.push({ start: null, end: null, suffix: Number(p[2]) });
        else
            out.push({ start: Number(p[1]), end: p[2] === "" ? null : Number(p[2]), suffix: null });
    }
    return out;
}
/**
  Bytes a request asks for. Infinity for a whole-file request, or an open
  range when the file size is unknown, since the player will read on.
*/
export function requestedBytes(range, fileBytes) {
    const ranges = parseRange(range);
    if (!ranges)
        return Infinity;
    let total = 0;
    for (const r of ranges) {
        if (r.suffix !== null)
            total += r.suffix;
        else if (r.end === null)
            total += fileBytes ? Math.max(0, fileBytes - (r.start ?? 0)) : Infinity;
        else
            total += Math.max(0, r.end - (r.start ?? 0) + 1);
    }
    return total;
}
/** The bytes in a minute of this episode: from its size and length when the feed gives both. */
export function minuteBytes(file, minSeconds = MIN_SECONDS) {
    const rate = file?.bytes && file.durationSec && file.durationSec > 0 ? file.bytes / file.durationSec : DEFAULT_BYTES_PER_SECOND;
    return rate * minSeconds;
}
export const episodeKeyOf = (target) => enclosureKey(target) ?? target.split(/[?#]/)[0].toLowerCase();
export function countDownloads(records, opts = {}) {
    const excluded = { notGet: 0, bot: 0, tooSmall: 0, duplicate: 0, abuse: 0, notDownload: 0 };
    const groups = new Map();
    let requests = 0;
    for (const r of records) {
        if (r.kind !== "download") {
            excluded.notDownload++;
            continue;
        }
        requests++;
        if (r.method !== "GET") {
            excluded.notGet++;
            continue;
        }
        if (isBot(r.ua)) {
            excluded.bot++;
            continue;
        }
        const k = `${r.at.slice(0, 10)}\u001f${r.showId}\u001f${episodeKeyOf(r.target)}\u001f${r.listener}`;
        const g = groups.get(k);
        if (g)
            g.push(r);
        else
            groups.set(k, [r]);
    }
    const counted = [];
    for (const [k, rs] of groups) {
        const [day, showId, episodeKey, listener] = k.split("\u001f");
        const file = opts.fileFor?.(episodeKey);
        const asked = rs.reduce((a, r) => a + requestedBytes(r.range, file?.bytes), 0);
        if (asked < minuteBytes(file, opts.minSeconds)) {
            excluded.tooSmall += rs.length;
            continue;
        }
        excluded.duplicate += rs.length - 1;
        const first = rs.reduce((a, b) => (a.at <= b.at ? a : b));
        counted.push({ day, at: first.at, showId, episodeKey, listener, app: appOf(first.ua), platform: platformOf(first.ua), country: first.country });
    }
    // Abuse: a listener hash downloading more episodes in a day than a person could.
    const perListener = new Map();
    for (const d of counted)
        perListener.set(`${d.day}|${d.listener}`, (perListener.get(`${d.day}|${d.listener}`) ?? 0) + 1);
    const max = opts.maxPerListenerDay ?? MAX_DOWNLOADS_PER_LISTENER_DAY;
    const downloads = counted.filter((d) => {
        const over = (perListener.get(`${d.day}|${d.listener}`) ?? 0) > max;
        if (over)
            excluded.abuse++;
        return !over;
    });
    downloads.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    return { downloads, requests, excluded };
}
