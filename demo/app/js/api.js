/*
  The one way the app talks to the API: same origin, the session cookie, and
  the CSRF token from GET /v1/auth/session on every write. Errors come back in
  the API's own shape, { error: { code, message, details, requestId } }, and
  are thrown as ApiError so every screen can show the message as written.

  Every path is written out in full at the call (api.get("/v1/me")), so the
  web app test can find each one and check it against the router.
*/

import { roleCan } from "./routes.js";

let csrf = null;

/** The features this server offers (GET /v1/auth/session), so screens leave out what is switched off. */
export const features = new Set();
export const on = (feature) => features.has(feature);

/** The ways in this server offers (Google, email, the development stand-in), from GET /v1/auth/session. */
let ways = { google: false, email: true, dev: false };
export const signInWays = () => ways;

export class ApiError extends Error {
  constructor(status, code, message, details, requestId) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

/** A manager's request that needs the owner: the API answers 202 and nothing has happened yet. */
export class SentToOwner extends ApiError {
  constructor(body) {
    super(202, "sent_to_owner", "Sent to the owner to approve. Nothing has happened yet.");
    this.approval = body?.approval ?? null;
  }
}

/** A route that another change is still building answers a plain 404 here until it lands. */
export const notBuiltYet = (e) => e instanceof ApiError && e.status === 404 && e.code === "not_found";

async function send(method, path, body, retried, file) {
  const headers = { accept: "application/json" };
  if (file) Object.assign(headers, { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, file.range ? { "content-range": file.range } : {});
  else if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET" && csrf) headers["x-csrf-token"] = csrf;
  let res;
  try {
    res = await fetch(path, { method, headers, credentials: "same-origin", body: file ? file.blob : body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "network", "Orbe could not be reached. Check your connection and try again.");
  }
  const type = res.headers.get("content-type") ?? "";
  const data = res.status === 204 ? null : type.includes("application/json") ? await res.json().catch(() => null) : await res.text();
  // Asked of the owner rather than done: the screen treats it as not done, and the console says where it went.
  if (res.status === 202 && data?.waitingFor === "owner") {
    window.dispatchEvent(new CustomEvent("orbe:sent-to-owner", { detail: data }));
    throw new SentToOwner(data);
  }
  if (res.ok) return data;
  const err = data && typeof data === "object" && data.error ? data.error : null;
  const e = new ApiError(res.status, err?.code ?? "error", err?.message ?? `Something went wrong (${res.status}). Try again.`, err?.details, err?.requestId ?? res.headers.get("x-request-id"));
  // A stale token (a new session in another tab) is fetched again once.
  if (e.code === "csrf_failed" && !retried) {
    await session();
    return send(method, path, body, true, file);
  }
  if (e.status === 401) window.dispatchEvent(new CustomEvent("orbe:signed-out"));
  throw e;
}

/** Who is signed in, and a fresh CSRF token. */
export async function session() {
  const s = await send("GET", "/v1/auth/session", undefined, true);
  csrf = s?.csrfToken ?? null;
  features.clear();
  for (const f of s?.features ?? []) features.add(f);
  if (s?.signIn) ways = s.signIn;
  team = s?.team ?? null;
  if (!s?.user) return null;
  // The console shows the screens of the team's account (a brand's, a creator's); the person stays who they are.
  return team ? { ...s.user, type: team.account.type, person: s.user, team } : s.user;
}

/** The team this session works in, from the last session read: its name, kind, your role and what you may do. */
let team = null;
export const currentTeam = () => team;

/** Whether this person's role on the team allows an action (see ROLE_CAN); with no team, the account is theirs. */
export const can = (action) => roleCan(team?.role, action);
/** Whether the action would go to the owner to approve rather than happen. */
export const asks = (action) => team?.role === "manager" && ["money", "consent", "rights"].includes(action);

export const api = {
  get: (path) => send("GET", path),
  post: (path, body = {}) => send("POST", path, body),
  put: (path, body = {}) => send("PUT", path, body),
  patch: (path, body = {}) => send("PATCH", path, body),
  del: (path, body) => send("DELETE", path, body),
  /** A file sent as it is, with its type and name. */
  upload: (path, blob, type, name) => send("POST", path, undefined, false, { blob, type, name }),
  /** One chunk of a large file, at its offset (Drop in a video): resumable, so a dropped connection carries on. */
  chunk: (path, blob, start, total) => send("PUT", path, undefined, false, { blob, type: "application/octet-stream", name: "chunk", range: `bytes ${start}-${start + blob.size - 1}/${total}` }),
};

/** A page of the API the browser opens itself (an HTML or Markdown report), same origin with the cookie. */
export const apiHref = (path) => (window.orbeDemo ? window.orbeDemo.href(path) : path);

/** A path segment from data, encoded. */
export const seg = (s) => encodeURIComponent(String(s));
