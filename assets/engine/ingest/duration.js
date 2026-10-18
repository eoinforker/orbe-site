/*
  Three duration dialects: ISO 8601 from YouTube (PT1H2M3S), Twitch's
  "3h8m33s", and the podcast itunes:duration (seconds, MM:SS or HH:MM:SS).
  Each returns whole seconds, or null when the text is not a duration, so a
  bad value is visible rather than silently zero.
*/
const ISO = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
/** ISO 8601 duration to seconds. Years and months are refused: their length is ambiguous and YouTube never sends them. */
export function isoDurationSeconds(iso) {
    const s = iso.trim().toUpperCase();
    const m = ISO.exec(s);
    if (!m || s === "P" || s.endsWith("T"))
        return null;
    const [w, d, h, min, sec] = m.slice(1).map((v) => (v === undefined ? 0 : Number(v)));
    return Math.round(w * 604800 + d * 86400 + h * 3600 + min * 60 + sec);
}
/** Twitch's "1h2m3s", "45m10s" or "59s". */
export function twitchDurationSeconds(text) {
    const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text.trim());
    if (!m || text.trim() === "")
        return null;
    const [h, min, s] = m.slice(1).map((v) => Number(v ?? 0));
    return h * 3600 + min * 60 + s;
}
/** itunes:duration: "3600", "61:05", "1:01:05", with optional fractional seconds. */
export function itunesDurationSeconds(text) {
    const t = text.trim();
    if (/^\d+(\.\d+)?$/.test(t))
        return Math.round(Number(t));
    const parts = t.split(":");
    if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+(\.\d+)?$/.test(p)))
        return null;
    const nums = parts.map(Number);
    const [h, m, s] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
    return Math.round(h * 3600 + m * 60 + s);
}
