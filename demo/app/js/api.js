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

/** Whether this server can rate a public YouTube channel (GET /v1/auth/session). */
let ratesChannels = true;
export const canRateChannels = () => ratesChannels;
/** A tool this server cannot run (Rate a channel with no public YouTube reads): offered last, and says so. */
export const notHere = (t) => t?.path === "rate" && !ratesChannels;

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

/*
  A read the console has just been given (by GET /v1/boot) is kept for a short
  while, so the frame and the screen that both need it ask once between them.
  Two identical reads in flight share one request. Any write forgets every
  kept read, so what a screen shows after a change is read again.
*/
const KEEP_MS = 10_000;
const kept = new Map();
const inflight = new Map();

const keep = (path, promise) => {
  // A kept refusal is still a refusal: nothing is unhandled while it waits to be read.
  promise.catch(() => {});
  kept.set(path, { at: Date.now(), promise });
};

/** Forget every kept read: after a write, a sign-out or a team switch. */
export function forget() {
  kept.clear();
}

/** A part of a boot answer as the route's own answer: its body, or its refusal thrown as ApiError. */
const asAnswer = (part) => (part.error ? Promise.reject(new ApiError(part.status, part.error.code, part.error.message, part.error.details)) : Promise.resolve(part.body));

function prime(parts) {
  for (const [path, part] of Object.entries(parts ?? {})) keep(path, asAnswer(part));
}

function read(path) {
  const k = kept.get(path);
  if (k && Date.now() - k.at < KEEP_MS) return k.promise;
  if (k) kept.delete(path);
  let p = inflight.get(path);
  if (!p) {
    p = send("GET", path).finally(() => inflight.delete(path));
    inflight.set(path, p);
  }
  return p;
}

/* Calls that are about the session itself, not the team a page shows: they never carry the page's team. */
const UNTEAMED = /^\/v1\/(boot(?!\?.*frame=0)|auth\/|teams\/active|teams\/invitations\/accept)/;

/** A route that another change is still building answers a plain 404 here until it lands. */
export const notBuiltYet = (e) => e instanceof ApiError && e.status === 404 && e.code === "not_found";

async function send(method, path, body, retried, file, raw) {
  const headers = { accept: "application/json" };
  if (file) Object.assign(headers, { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, file.range ? { "content-range": file.range } : {});
  else if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET" && csrf) headers["x-csrf-token"] = csrf;
  // The team this page was drawn for: the server refuses (409 team_changed) if the session has moved to another.
  if (team && !UNTEAMED.test(path)) headers["x-orbe-team"] = team.id;
  let res;
  try {
    res = await fetch(path, { method, headers, credentials: "same-origin", body: file ? file.blob : body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "network", "Orbe could not be reached. Check your connection and try again.");
  }
  const type = res.headers.get("content-type") ?? "";
  // Any write may change what a kept read says: forget them all, whatever the answer.
  if (method !== "GET") {
    forget();
    bundled.clear();
  }
  // A file the server built (an export): the answer itself, for its bytes and headers.
  if (raw && res.ok) return res;
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
    return send(method, path, body, true, file, raw);
  }
  if (e.status === 401) {
    forget();
    window.dispatchEvent(new CustomEvent("orbe:signed-out"));
  }
  // Another tab (or a page brought back by Back) moved the session to another team: the console starts again in it.
  if (e.code === "team_changed") {
    forget();
    window.dispatchEvent(new CustomEvent("orbe:team-changed"));
  }
  throw e;
}

/** Who is signed in, and a fresh CSRF token. */
export async function session() {
  return apply(await send("GET", "/v1/auth/session", undefined, true));
}

/** The screens that have a set of first reads on the server (GET /v1/boot?screen=), as the boot lists them. */
const BUNDLED = new Set();
const bundled = new Map();

/**
  The console's first call: who is signed in, and every read the frame needs,
  plus the first screen's own when it has a set. One request instead of many.
*/
export async function boot(screen) {
  const b = await send("GET", screen ? `/v1/boot?screen=${encodeURIComponent(screen)}` : "/v1/boot", undefined, true);
  forget();
  bundled.clear();
  BUNDLED.clear();
  for (const s of b?.screens ?? []) BUNDLED.add(s);
  prime(b?.parts);
  if (BUNDLED.has(screen)) bundled.set(screen, Date.now());
  return apply(b?.session);
}

/** A screen's first reads in one request (GET /v1/boot?screen=&frame=0), unless the boot has just brought them. */
export async function bundle(screen) {
  if (!BUNDLED.has(screen)) return;
  const at = bundled.get(screen);
  if (at && Date.now() - at < KEEP_MS) return;
  const b = await read(`/v1/boot?screen=${encodeURIComponent(screen)}&frame=0`).catch(() => null);
  if (!b) return;
  prime(b.parts);
  bundled.set(screen, Date.now());
}

function apply(s) {
  csrf = s?.csrfToken ?? null;
  features.clear();
  for (const f of s?.features ?? []) features.add(f);
  ratesChannels = s?.ratesChannels !== false;
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
  get: (path) => read(path),
  /** A read asked for ahead of need (a pointer on a link to its screen): kept for a short while, so the screen finds it waiting. */
  warm: (path) => {
    const k = kept.get(path);
    if (k && Date.now() - k.at < KEEP_MS) return k.promise;
    const p = read(path);
    keep(path, p);
    return p;
  },
  /** A read that skips anything kept, for a refresh the person asked for. */
  fresh: (path) => {
    kept.delete(path);
    return read(path);
  },
  /** With { file: true }, a successful answer comes back as the response itself (an export to save). */
  post: (path, body = {}, opts) => send("POST", path, body, false, undefined, opts?.file === true),
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
