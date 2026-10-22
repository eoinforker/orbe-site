/*
  Step 3 of Orbe Fix: generate options through a router of models. Orbe
  builds no models; generation is a commodity and the judgement around it is
  the product. Text goes to OpenRouter or Claude, images to fal or Replicate,
  in the order the caller configures, falling through to the next provider
  on any failure. With no provider configured, rulesTitles() still gives
  plain edits of the creator's own title, made by rule and labelled so.

  fetch is injected, so tests run on recorded-shape responses and nothing
  here touches the network unless the API layer passes the real fetch.
  Request shapes as documented by each provider in October 2026:
  - OpenRouter: POST /api/v1/chat/completions, Bearer key, OpenAI-style
    messages, response_format json_object.
  - fal: POST https://fal.run/<model>, "Key <key>", { prompt, image_size,
    num_images }, answering { images: [{ url }] }.
  - Replicate: POST /v1/models/<owner>/<name>/predictions with Prefer: wait,
    { input: { prompt, aspect_ratio, num_outputs } }, answering { output }.

  Browser-safe: no node: imports.
*/
import { callClaude } from "../guide/claude.js";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const FAL_URL = "https://fal.run/";
export const REPLICATE_URL = "https://api.replicate.com/v1/models/";
/** YouTube's limit on a title. */
export const TITLE_MAX = 100;
export const TITLE_SYSTEM = [
    "You write alternative YouTube titles for an upload that is underperforming creators its size.",
    "Keep the creator's voice and the video's real subject. Never promise anything the title and description do not support: no new numbers, names, claims or outcomes.",
    "Prefer the creator's own winning patterns when given. No clickbait, no all capitals, at most 70 characters.",
    'Answer only with JSON: {"titles": ["...", "..."]}.',
].join(" ");
export function titleRequest(g) {
    const n = g.count ?? 4;
    return [
        `Current title: ${g.title}`,
        g.description ? `Description: ${g.description.slice(0, 1500)}` : null,
        g.diagnosis.styleHints.length ? `The creator's best uploads share: ${g.diagnosis.styleHints.join("; ")}.` : null,
        `Why it needs a fix: ${g.diagnosis.why}`,
        `Write ${n} alternative titles.`,
    ]
        .filter(Boolean)
        .join("\n");
}
export function thumbnailPrompt(g) {
    const hints = g.diagnosis.styleHints.length ? ` In the creator's own style: ${g.diagnosis.styleHints.join(", ")}.` : "";
    return `A YouTube thumbnail, 16:9, for a video titled "${g.title}". One clear subject, high contrast, readable at small size, at most three words of text, nothing the video does not show.${hints}`;
}
const optionId = (kind, i, provider) => `${kind}_${provider}_${i + 1}`;
/** Titles from the first text provider that answers; the rules when none is configured or all fail. */
export async function generateTitles(g, r) {
    const attempts = [];
    for (const p of r.text ?? []) {
        try {
            const titles = p.name === "anthropic" ? await viaClaude(g, p, r.fetch) : await viaOpenRouter(g, p, r.fetch);
            const clean = uniqueTitles(titles, g.title).slice(0, g.count ?? 4);
            if (!clean.length)
                throw new Error("No usable titles in the answer.");
            return { options: clean.map((title, i) => ({ id: optionId("title", i, p.name), kind: "title", title, source: { provider: p.name, model: p.model } })), attempts };
        }
        catch (e) {
            attempts.push({ provider: p.name, model: p.model, error: e.message });
        }
    }
    const rules = rulesTitles(g.title);
    return { options: rules.map((title, i) => ({ id: optionId("title", i, "rules"), kind: "title", title, source: { provider: "rules", model: null } })), attempts };
}
/** Thumbnails from the first image provider that answers. With none, no thumbnails: Orbe never draws its own. */
export async function generateThumbnails(g, r) {
    const attempts = [];
    const prompt = thumbnailPrompt(g);
    const n = g.count ?? 3;
    for (const p of r.image ?? []) {
        try {
            const urls = p.name === "fal" ? await viaFal(prompt, n, g.thumbnailUrl, p, r.fetch) : await viaReplicate(prompt, n, p, r.fetch);
            const ok = urls.filter((u) => /^https:\/\//.test(u)).slice(0, n);
            if (!ok.length)
                throw new Error("No image URLs in the answer.");
            return { options: ok.map((imageUrl, i) => ({ id: optionId("thumbnail", i, p.name), kind: "thumbnail", imageUrl, prompt, source: { provider: p.name, model: p.model } })), attempts };
        }
        catch (e) {
            attempts.push({ provider: p.name, model: p.model, error: e.message });
        }
    }
    return { options: [], attempts };
}
/**
  Any JSON answer from the first text provider that gives one: the deals
  assistant's drafts use the same router and keys as Fix. Null when no
  provider is configured or every one failed; the caller then uses its rules.
*/
export async function generateJson(system, user, schema, r) {
    const attempts = [];
    for (const p of r.text ?? []) {
        try {
            if (p.name === "anthropic") {
                const out = await callClaude({ system, user, schema }, { apiKey: p.apiKey, fetch: r.fetch, model: p.model, effort: "low", retries: 0 });
                return { value: out.value, source: { provider: p.name, model: p.model }, attempts };
            }
            const json = (await postJson(r.fetch, OPENROUTER_URL, { authorization: `Bearer ${p.apiKey}` }, {
                model: p.model,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                response_format: { type: "json_object" },
            }));
            const content = json.choices?.[0]?.message?.content;
            if (typeof content !== "string")
                throw new Error("The answer has no message.");
            let value;
            try {
                value = JSON.parse(content);
            }
            catch {
                throw new Error("The message was not JSON.");
            }
            return { value, source: { provider: p.name, model: p.model }, attempts };
        }
        catch (e) {
            attempts.push({ provider: p.name, model: p.model, error: e.message });
        }
    }
    return { value: null, source: null, attempts };
}
/*
  The rules: plain edits of the creator's own words, so nothing new is
  claimed. Drop a trailing segment after a separator (series names and
  channel tags push the subject out of view), then shorten to the first
  60 characters at a word boundary.
*/
export function rulesTitles(title) {
    const t = title.trim().replace(/\s+/g, " ");
    const out = [];
    const cut = t.split(/\s[|:/]\s|\s#\d+$|\s\(.*\)$|\s\[.*\]$/)[0].trim();
    if (cut && cut !== t)
        out.push(cut);
    if (t.length > 60) {
        const short = t.slice(0, 61).replace(/\s+\S*$/, "").replace(/[\s,;:|]+$/, "");
        if (short && short !== t)
            out.push(short);
    }
    return uniqueTitles(out, title);
}
function uniqueTitles(titles, current) {
    const seen = new Set([norm(current)]);
    const out = [];
    for (const t of titles) {
        if (typeof t !== "string")
            continue;
        const s = t.trim().replace(/\s+/g, " ");
        if (!s || s.length > TITLE_MAX || seen.has(norm(s)))
            continue;
        seen.add(norm(s));
        out.push(s);
    }
    return out;
}
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
async function postJson(f, url, headers, body) {
    const res = await f(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok)
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("The answer was not JSON.");
    }
}
function titlesFrom(json) {
    const t = json?.titles;
    if (!Array.isArray(t))
        throw new Error("The answer has no titles list.");
    return t;
}
async function viaOpenRouter(g, p, f) {
    const json = (await postJson(f, OPENROUTER_URL, { authorization: `Bearer ${p.apiKey}` }, {
        model: p.model,
        messages: [
            { role: "system", content: TITLE_SYSTEM },
            { role: "user", content: titleRequest(g) },
        ],
        response_format: { type: "json_object" },
    }));
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string")
        throw new Error("The answer has no message.");
    try {
        return titlesFrom(JSON.parse(content));
    }
    catch (e) {
        throw new Error(e instanceof SyntaxError ? "The message was not JSON." : e.message);
    }
}
async function viaClaude(g, p, f) {
    const schema = { type: "object", required: ["titles"], additionalProperties: false, properties: { titles: { type: "array", items: { type: "string" } } } };
    const r = await callClaude({ system: TITLE_SYSTEM, user: titleRequest(g), schema }, { apiKey: p.apiKey, fetch: f, model: p.model, effort: "low", retries: 0 });
    return titlesFrom(r.value);
}
async function viaFal(prompt, n, reference, p, f) {
    const body = { prompt, image_size: "landscape_16_9", num_images: n };
    if (reference)
        body.image_url = reference;
    const json = (await postJson(f, FAL_URL + p.model, { authorization: `Key ${p.apiKey}` }, body));
    return (json.images ?? []).map((i) => i.url).filter((u) => typeof u === "string");
}
async function viaReplicate(prompt, n, p, f) {
    const json = (await postJson(f, `${REPLICATE_URL}${p.model}/predictions`, { authorization: `Bearer ${p.apiKey}`, prefer: "wait" }, { input: { prompt, aspect_ratio: "16:9", num_outputs: n } }));
    if (json.error)
        throw new Error(String(json.error));
    const out = Array.isArray(json.output) ? json.output : [json.output];
    return out.filter((u) => typeof u === "string");
}
