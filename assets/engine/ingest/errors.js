/*
  Typed failures from the outside world. Callers branch on `code`, not on
  message text, so the scheduler can tell "ask the creator to reconnect"
  from "try again tomorrow" from "try again in a minute".
*/
export class IngestError extends Error {
    code;
    source;
    /** HTTP status when the failure came from a response. */
    status;
    constructor(code, message, source = null, status = null) {
        super(message);
        this.name = "IngestError";
        this.code = code;
        this.source = source;
        this.status = status;
    }
}
/** The creator revoked access, or the refresh token no longer works. Ask them to reconnect. */
export class RevokedTokenError extends IngestError {
    constructor(message, source = null, status = 401) {
        super("revoked", message, source, status);
        this.name = "RevokedTokenError";
    }
}
/** Authenticated, but the grant lacks a scope or permission the call needs. */
export class ForbiddenError extends IngestError {
    reason;
    constructor(message, source = null, reason = null) {
        super("forbidden", message, source, 403);
        this.name = "ForbiddenError";
        this.reason = reason;
    }
}
/** A daily allowance is spent. Retrying today will not help. */
export class QuotaExhaustedError extends IngestError {
    /** When the allowance is expected to reset, if known. */
    resetsAt;
    constructor(message, source = null, resetsAt = null, status = 403) {
        super("quota_exhausted", message, source, status);
        this.name = "QuotaExhaustedError";
        this.resetsAt = resetsAt;
    }
}
export class NotFoundError extends IngestError {
    constructor(message, source = null, status = 404) {
        super("not_found", message, source, status);
        this.name = "NotFoundError";
    }
}
/** Too many requests for now. `retryAfterMs` is the server's hint when it gave one. */
export class RateLimitedError extends IngestError {
    retryAfterMs;
    constructor(message, source = null, retryAfterMs = null) {
        super("rate_limited", message, source, 429);
        this.name = "RateLimitedError";
        this.retryAfterMs = retryAfterMs;
    }
}
/** The platform failed (5xx or a malformed reply). Usually worth a retry. */
export class UpstreamError extends IngestError {
    constructor(message, source = null, status = null) {
        super("upstream", message, source, status);
        this.name = "UpstreamError";
    }
}
export class NetworkError extends IngestError {
    constructor(message, source = null) {
        super("network", message, source, null);
        this.name = "NetworkError";
    }
}
/** Bad input from us or the creator: a malformed handle, an unreadable file, a full-access key. */
export class InvalidInputError extends IngestError {
    constructor(message, source = null) {
        super("invalid_input", message, source, null);
        this.name = "InvalidInputError";
    }
}
/** Orbe itself is missing a key or client id. */
export class ConfigError extends IngestError {
    constructor(message, source = null) {
        super("config", message, source, null);
        this.name = "ConfigError";
    }
}
/** Worth retrying: the same call may succeed later in this run. */
export const isTransient = (e) => e instanceof RateLimitedError || e instanceof UpstreamError || e instanceof NetworkError;
export const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const DEFAULT_RETRY = {
    retries: 3,
    baseMs: 500,
    maxMs: 30_000,
    maxRetryAfterMs: 120_000,
    sleep: defaultSleep,
    random: Math.random,
    shouldRetry: isTransient,
};
/**
  Exponential backoff with full jitter, so many refreshes failing together do
  not retry in lockstep. A server's Retry-After wins over our own schedule.
*/
export async function withRetry(fn, options = {}) {
    const o = { ...DEFAULT_RETRY, ...options };
    for (let attempt = 0;; attempt++) {
        try {
            return await fn(attempt);
        }
        catch (e) {
            if (attempt >= o.retries || !o.shouldRetry(e))
                throw e;
            const hinted = e instanceof RateLimitedError ? e.retryAfterMs : null;
            if (hinted !== null && hinted > o.maxRetryAfterMs)
                throw e;
            const backoff = Math.min(o.maxMs, o.baseMs * 2 ** attempt) * o.random();
            await o.sleep(hinted ?? Math.round(backoff));
        }
    }
}
