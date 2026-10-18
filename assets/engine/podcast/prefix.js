/*
  The Orbe measurement prefix. A creator puts
    https://m.orbe.vc/p/<show id>/
  in front of their episode file URLs (most hosts have an "analytics prefix"
  setting). Each request then passes through Orbe, which logs it and
  redirects to the original. Like OP3's, the prefix keeps the rest of the URL
  as is, scheme optional, so it chains with other prefixes in either order.
*/
/** Provisional: the domain the founder must register and point at the service. */
export const DEFAULT_PREFIX_BASE = "https://m.orbe.vc/p/";
/** Show ids are ours: short, URL-safe, and never a guessable sequence. */
export const SHOW_ID = /^[a-z0-9][a-z0-9_-]{2,39}$/;
export const isShowId = (s) => SHOW_ID.test(s);
/** The prefix a show should use, ending in a slash. */
export function prefixFor(showId, base = DEFAULT_PREFIX_BASE) {
    if (!isShowId(showId))
        throw new RangeError(`Not a show id: ${showId}`);
    return `${base.endsWith("/") ? base : `${base}/`}${showId}/`;
}
/** An enclosure URL with the prefix in front: the scheme of the original is dropped, as hosts do. */
export function prefixUrl(showId, original, base = DEFAULT_PREFIX_BASE) {
    return prefixFor(showId, base) + original.replace(/^https?:\/\//i, "");
}
/**
  Reads "/p/<show>/<rest>" (rest with or without scheme) into the show and
  the URL to redirect to. Null when the path is not a prefix request, or when
  the target is not a plain http(s) URL on a public host.
*/
export function parsePrefixPath(pathAndQuery) {
    const m = /^\/p\/([^/]+)\/(.+)$/.exec(pathAndQuery);
    if (!m || !isShowId(m[1]))
        return null;
    let rest = m[2];
    // Some hosts and proxies collapse "//" after the scheme to "/".
    rest = rest.replace(/^(https?):\/(?!\/)/i, "$1://");
    const target = /^https?:\/\//i.test(rest) ? rest : `https://${rest}`;
    return isSafeTarget(target) ? { showId: m[1], target } : null;
}
/**
  The prefix redirects anywhere a creator's file lives, so it must not become
  an open redirect to internal addresses or to non-web schemes.
*/
export function isSafeTarget(url) {
    let u;
    try {
        u = new URL(url);
    }
    catch {
        return false;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:")
        return false;
    if (u.username || u.password)
        return false;
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!h.includes(".") && !h.includes(":"))
        return false;
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local"))
        return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))
        return false;
    if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80"))
        return false;
    return true;
}
/** Measurement prefixes other than ours that turn up in enclosure URLs, so we can tell creators what else is counting. */
export const KNOWN_PREFIXES = [
    { name: "OP3", pattern: /(^|\/\/|\/)op3\.dev\/e/i, status: "active" },
    { name: "Podtrac", pattern: /(^|\/\/|\/)(dts\.)?podtrac\.com\/pts\/redirect/i, status: "active" },
    { name: "Chartable", pattern: /(^|\/\/|\/)chtbl\.com\/track/i, status: "closed" },
    { name: "Podscribe", pattern: /(^|\/\/|\/)verifi\.podscribe\.com/i, status: "active" },
    { name: "Blubrry", pattern: /(^|\/\/|\/)media\.blubrry\.com/i, status: "active" },
    { name: "Podder", pattern: /(^|\/\/|\/)pdrl\.fm/i, status: "active" },
    { name: "Claritas (Analytic Owl)", pattern: /(^|\/\/|\/)arttrk\.com/i, status: "active" },
    { name: "Spotify Ad Analytics (Podsights)", pattern: /(^|\/\/|\/)pdst\.fm/i, status: "active" },
    { name: "Magellan AI", pattern: /(^|\/\/|\/)mgln\.ai/i, status: "active" },
];
/** Which prefixes an enclosure URL passes through, ours included. */
export function prefixChain(url, base = DEFAULT_PREFIX_BASE) {
    const host = base.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const esc = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const ours = new RegExp(`(?:^|//|/)${esc}/([a-z0-9][a-z0-9_-]{2,39})/`, "i").exec(url);
    const hits = KNOWN_PREFIXES.filter((p) => p.pattern.test(url));
    return { orbeShowId: ours ? ours[1].toLowerCase() : null, others: hits.filter((p) => p.status === "active").map((p) => p.name), closed: hits.filter((p) => p.status === "closed").map((p) => p.name) };
}
/**
  A show id for a new show: a readable slug of its title and a random tail,
  so ids read well in a prefix but are never a guessable sequence.
  `random` returns 0 to 1 (Math.random in a browser, crypto in the API).
*/
export function suggestShowId(title, random) {
    const slug = title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 28)
        .replace(/-+$/, "");
    let tail = "";
    for (let i = 0; i < 5; i++)
        tail += "abcdefghjkmnpqrstvwxyz23456789"[Math.floor(random() * 30) % 30];
    const id = `${slug || "show"}-${tail}`;
    return SHOW_ID.test(id) ? id : `show-${tail}`;
}
