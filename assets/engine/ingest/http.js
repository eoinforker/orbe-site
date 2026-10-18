/*
  Every connector talks HTTP through an injected fetch, so tests replay
  fixtures and production can add timeouts, logging or a proxy in one place.
*/
import { IngestError, NetworkError, NotFoundError, RateLimitedError, RevokedTokenError, UpstreamError, ForbiddenError, withRetry } from "./errors.js";
/** Builds a query string, repeating keys for arrays (Stripe's expand[] and Patreon's include). */
export function withQuery(url, query = {}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null)
            continue;
        if (Array.isArray(v))
            for (const item of v)
                params.append(k, String(item));
        else
            params.append(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}
/** Retry-After is either delta seconds or an HTTP date. Returns milliseconds from now, or null. */
export function parseRetryAfter(value, now) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed))
        return Math.round(Number(trimmed) * 1000);
    const at = Date.parse(trimmed);
    if (Number.isNaN(at))
        return null;
    return Math.max(0, at - now.getTime());
}
export function defaultError({ source, status, headers, now, url }) {
    const where = `${source} ${redact(url)}`;
    if (status === 401)
        return new RevokedTokenError(`${where}: unauthorised`, source, status);
    if (status === 403)
        return new ForbiddenError(`${where}: forbidden`, source);
    if (status === 404)
        return new NotFoundError(`${where}: not found`, source, status);
    if (status === 429)
        return new RateLimitedError(`${where}: rate limited`, source, parseRetryAfter(headers.get("retry-after"), now));
    return new UpstreamError(`${where}: HTTP ${status}`, source, status);
}
/** Keys and tokens must never reach logs, so strip them from URLs in messages. */
export function redact(url) {
    return url.replace(/([?&](?:key|access_token|client_secret|refresh_token)=)[^&]*/gi, "$1***");
}
async function readBody(res) {
    const text = await res.text();
    if (!text)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
/** One request, no retries. Throws typed errors for non-2xx and for network failure. */
export async function requestJson(req) {
    let res;
    try {
        res = await req.fetch(req.url, { method: req.method ?? "GET", headers: req.headers, body: req.body });
    }
    catch (e) {
        throw new NetworkError(`${req.source} ${redact(req.url)}: ${e.message}`, req.source);
    }
    const body = await readBody(res);
    if (!res.ok) {
        const ctx = { source: req.source, status: res.status, body, headers: res.headers, now: req.now(), url: req.url };
        throw (req.mapError ?? defaultError)(ctx);
    }
    if (body === null || typeof body !== "object") {
        throw new UpstreamError(`${req.source} ${redact(req.url)}: expected JSON`, req.source, res.status);
    }
    return body;
}
/** For feeds and files: the body as text. Same error mapping as requestJson. */
export async function requestText(req) {
    let res;
    try {
        res = await req.fetch(req.url, { method: req.method ?? "GET", headers: req.headers, body: req.body });
    }
    catch (e) {
        throw new NetworkError(`${req.source} ${redact(req.url)}: ${e.message}`, req.source);
    }
    const text = await res.text();
    if (!res.ok) {
        let body = text;
        try {
            body = JSON.parse(text);
        }
        catch {
            // Not JSON: keep the text.
        }
        throw (req.mapError ?? defaultError)({ source: req.source, status: res.status, body, headers: res.headers, now: req.now(), url: req.url });
    }
    return { text, url: res.url || req.url, contentType: res.headers.get("content-type") };
}
/** A request that retries transient failures with backoff. */
export const requestJsonWithRetry = (req, retry = {}) => withRetry(() => requestJson(req), retry);
export const formBody = (fields) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(fields))
        if (v !== undefined)
            p.append(k, v);
    return p.toString();
};
