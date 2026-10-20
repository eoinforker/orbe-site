/*
  A small client for the Claude Messages API over fetch, with no SDK. It
  sends one request with a cached system prompt and a JSON schema for the
  answer, and returns the parsed JSON or a typed error. fetch is injected, so
  tests run on recorded-shape fixtures and nothing here touches the network
  unless the API layer passes the real fetch.

  Request shape, per the Claude API reference (October 2026):
  - POST https://api.anthropic.com/v1/messages with x-api-key and
    anthropic-version: 2023-06-01.
  - Structured output through output_config.format of type json_schema.
  - The stable system prompt as a text block with cache_control ephemeral, so
    repeat calls read it from the prompt cache.
  - Adaptive thinking is the default on the current Opus, so thinking is not
    sent; effort is set explicitly because its default there is medium.
  - Server-side refusal fallbacks ("default" routing) under the beta header
    server-side-fallback-2026-07-01. A refusal that survives the fallback is
    returned as an error, never parsed as an answer.
*/
export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
/** The latest capable model at the time of writing. Override with ORBE_ANTHROPIC_MODEL or the model option. */
export const DEFAULT_MODEL = "claude-opus-5-5";
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";
export const KEY_ENV = "ORBE_ANTHROPIC_KEY";
export const MODEL_ENV = "ORBE_ANTHROPIC_MODEL";
export class ClaudeError extends Error {
    kind;
    status;
    /** Seconds the API asked us to wait, from retry-after. */
    retryAfter;
    constructor(kind, message, status, retryAfter) {
        super(message);
        this.name = "ClaudeError";
        this.kind = kind;
        this.status = status;
        this.retryAfter = retryAfter;
    }
}
/** The request body, built apart from sending so tests can check it byte for byte. */
export function buildBody(req, o) {
    return {
        model: o.model ?? DEFAULT_MODEL,
        max_tokens: o.maxTokens ?? 16000,
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: req.user }],
        output_config: { effort: o.effort ?? "medium", format: { type: "json_schema", schema: req.schema } },
        ...(o.fallbacks === false ? {} : { fallbacks: "default" }),
    };
}
const retryable = (status) => status === 408 || status === 409 || status === 429 || status >= 500;
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Sends one request and parses the JSON answer. Throws ClaudeError; never returns a partial answer. */
export async function callClaude(req, o) {
    const body = JSON.stringify(buildBody(req, o));
    const headers = {
        "content-type": "application/json",
        "x-api-key": o.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        ...(o.fallbacks === false ? {} : { "anthropic-beta": FALLBACK_BETA }),
    };
    const retries = o.retries ?? 2;
    const sleep = o.sleep ?? defaultSleep;
    let last;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0)
            await sleep(backoff(attempt, last));
        let res;
        try {
            const signal = o.timeoutMs ? AbortSignal.timeout(o.timeoutMs) : undefined;
            res = await o.fetch(o.url ?? ANTHROPIC_URL, { method: "POST", headers, body, signal });
        }
        catch (e) {
            const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
            last = new ClaudeError(timeout ? "timeout" : "network", e instanceof Error ? e.message : String(e));
            continue;
        }
        const text = await res.text();
        if (!res.ok) {
            const after = Number(res.headers?.get("retry-after") ?? NaN);
            last = new ClaudeError("http", `Claude API returned ${res.status}: ${errorMessage(text)}`, res.status, Number.isFinite(after) ? after : undefined);
            if (retryable(res.status))
                continue;
            throw last;
        }
        return parseMessage(text);
    }
    throw last ?? new ClaudeError("network", "Claude API request failed");
}
function backoff(attempt, last) {
    const after = last?.retryAfter;
    if (after !== undefined && after >= 0)
        return Math.min(after * 1000, 30_000);
    return Math.min(500 * 2 ** (attempt - 1), 8000);
}
function errorMessage(text) {
    try {
        const j = JSON.parse(text);
        return j.error?.message ?? text.slice(0, 200);
    }
    catch {
        return text.slice(0, 200);
    }
}
/** Reads a Messages API response: refusals and truncation are errors; thinking blocks are skipped; the text block is the JSON. */
export function parseMessage(raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    }
    catch {
        throw new ClaudeError("bad_json", "Claude API response was not JSON");
    }
    if (msg.stop_reason === "refusal")
        throw new ClaudeError("refusal", `Claude declined the request${msg.stop_details?.category ? ` (${msg.stop_details.category})` : ""}`);
    if (msg.stop_reason === "max_tokens")
        throw new ClaudeError("max_tokens", "Claude's answer was cut off at max_tokens");
    const text = (msg.content ?? [])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("");
    if (!text.trim())
        throw new ClaudeError("no_text", "Claude's answer had no text block");
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        throw new ClaudeError("bad_json", "Claude's answer did not parse as JSON");
    }
    return { value, model: msg.model ?? "", usage: msg.usage ?? {}, id: msg.id ?? "", stopReason: msg.stop_reason ?? "" };
}
/** The key, from the environment the API layer passes (process.env in production). Empty means "no key". */
export const keyFrom = (env) => {
    const k = env[KEY_ENV]?.trim();
    return k ? k : null;
};
