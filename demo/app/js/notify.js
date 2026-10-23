/*
  Notifications: what is waiting on this person, read from the same API the
  screens use. Nothing is stored for them. The first read comes with the
  console's boot; after that the list is read again when the person comes
  back to the tab, at most once a minute, and less often while nothing
  changes (up to every fifteen minutes), never on every move between screens.
*/
import { api, can, currentTeam, on } from "./api.js";
import { plural } from "./ui.js";
import { headline, queueItems } from "./creator/handoff.js";

const CREATOR_MOVES = { in_production: "Deliver", changes_requested: "Revise the draft for", ready: "Go live for", short: "Choose a remedy for", make_good: "Make good for" };
const BRAND_MOVES = { awaiting_funds: "Fund the booking with", draft_review: "Review the draft from" };

const settle = (p) => p.then((v) => v, () => null);
/* A read for the list: kept from the boot on the first look, asked afresh on a refresh. */
const kept = (path) => api.get(path);
const afresh = (path) => api.fresh(path);
let cached = { at: 0, items: [], key: "" };

/** Approvals: the owner sees what waits for them; anyone else sees what they asked for and is still waiting. */
async function approvalItems(get) {
  const team = currentTeam();
  if (!team) return [];
  const r = await settle(get("/v1/team/approvals?state=pending"));
  // The assistant's own proposals are shown once, by handoffItems, where the accept notice is read before Approve.
  const list = (r?.approvals ?? []).filter((a) => !String(a.requestedBy?.id ?? "").startsWith("assistant:"));
  if (!list.length) return [];
  const href = "/orbe-site/demo/app/settings/team?tab=approvals";
  if (team.role === "owner") {
    const first = list[0];
    return [{ title: list.length === 1 ? "A request waits for you" : `${plural(list.length, "request")} wait for you`, line: first.summary, href, kind: "approval", count: list.length, n: list.length }];
  }
  return [{ title: `Waiting for the owner: ${plural(list.length, "request")}`, line: list[0].summary, href, kind: "approval", count: 0, n: list.length }];
}

/** How many requests wait for this person to decide, for the bell and the palette. */
export async function approvalsWaiting(user) {
  const items = await loadNotifications(user);
  return items.find((i) => i.kind === "approval")?.count ?? 0;
}

/** Forget the last read, so the next open of the bell asks again (after something changed). */
export const forgetNotifications = () => (cached = { at: 0, items: [], key: "" });

/**
  Hand it off: each proposal of Orbe's assistant waiting for a person, as
  "Approve: accept Kettle & Crumb at £900", opening the item on Deals. A
  server without the feature answers 404, and nothing is shown.
*/
async function handoffItems(get) {
  if (!on("deals_agent") || !can("read.money")) return { items: [], offers: new Set() };
  const s = await settle(get("/v1/me/deals/handoff"));
  return { items: queueItems(s), offers: new Set((s?.queue ?? []).map((a) => a.offerId).filter(Boolean)) };
}

async function creatorItems(get) {
  if (!can("read.money")) return [];
  const [offers, bookings, intros, rosters, handoff] = await Promise.all([
    on("sponsorships") ? settle(get("/v1/me/sponsorships/offers")) : null,
    on("sponsorships") ? settle(get("/v1/me/sponsorships/bookings")) : null,
    settle(get("/v1/me/introductions")),
    on("brand_data") ? settle(get("/v1/me/rosters")) : null,
    handoffItems(get),
  ]);
  const out = [];
  // An offer the assistant is answering is listed once: as its proposal while it waits for a person, and not at all while its answer is due.
  out.push(...handoff.items.slice(0, 3).map((i) => ({ ...i, total: handoff.items.length, n: 1 })));
  if (handoff.items.length > 3) out.push({ title: `${handoff.items.length - 3} more waiting on Deals`, line: "Orbe's assistant waits for your say on each.", href: "/orbe-site/demo/app/deals", n: handoff.items.length - 3 });
  const open = (offers?.offers ?? []).filter((o) => o.state === "sent" && !handoff.offers.has(o.id));
  if (open.length) out.push({ title: `Answer ${plural(open.length, "sponsorship offer")}`, line: `${open[0].brandName} is waiting. Offers lapse if not answered.`, href: "/orbe-site/demo/app/deals", n: open.length });
  for (const b of (bookings?.bookings ?? []).filter((x) => CREATOR_MOVES[x.state]).slice(0, 4)) out.push({ title: `${CREATOR_MOVES[b.state]} ${b.brandName}`, line: "A booking is waiting on you.", href: "/orbe-site/demo/app/deals?tab=bookings" });
  const asked = (intros?.introductions ?? []).filter((i) => i.status === "requested");
  if (asked.length) out.push({ title: `${plural(asked.length, "buyer")} asked to be introduced`, line: "Approve or decline before the request lapses.", href: "/orbe-site/demo/app/selling", n: asked.length });
  const invited = (rosters?.rosters ?? []).filter((r) => r.state === "invited");
  for (const r of invited.slice(0, 2)) out.push({ title: `${r.org} invited you to their roster`, line: "Join or decline from your record.", href: "/orbe-site/demo/app/record" });
  return out;
}

/** An agency: what waits on it across its roster, the same list as the Roster's "Waiting on you". */
async function rosterItems(get) {
  if (currentTeam()?.kind !== "agency" || !on("deals_agent")) return [];
  const r = await settle(get("/v1/roster/handoff"));
  const mine = (r?.queue ?? []).filter((a) => a.state === "waiting" && !a.waitsFor);
  const items = mine.slice(0, 3).map((a) => {
    const line = headline(a).replace(/\.$/, "");
    return { title: `${a.creator.name}: ${a.kind === "note" ? line : `approve, ${line.charAt(0).toLowerCase()}${line.slice(1)}`}`, line: a.why, href: "/orbe-site/demo/app/roster", kind: "handoff", total: mine.length, n: 1 };
  });
  if (mine.length > 3) items.push({ title: `${mine.length - 3} more waiting on the Roster`, line: "Each waits for your say.", href: "/orbe-site/demo/app/roster", n: mine.length - 3 });
  return items;
}

async function brandItems(get) {
  if (!on("sponsorships") || !can("read.money")) return [];
  const [bookings, roster] = await Promise.all([currentTeam()?.brand === false ? null : settle(get("/v1/brand/bookings")), rosterItems(get)]);
  const out = [...roster];
  for (const b of (bookings?.bookings ?? []).filter((x) => BRAND_MOVES[x.state] || (x.state === "live" && !x.contentApprovedAt)).slice(0, 5)) {
    const who = `a creator (${String(b.format ?? "read").replaceAll("_", " ")})`;
    out.push({ title: BRAND_MOVES[b.state] ? `${BRAND_MOVES[b.state]} ${who}` : `Approve the content from ${who}`, line: "A booking is waiting on you.", href: "/orbe-site/demo/app/bookings" });
  }
  return out;
}

/** What is waiting on this person: { title, line, href } each. With fresh, asked again rather than kept. */
export async function loadNotifications(user, opts = {}) {
  const key = `${user.type}:${user.id}:${currentTeam()?.id ?? ""}`;
  if (!opts.fresh && cached.key === key && Date.now() - cached.at < 60_000) return cached.items;
  const get = opts.fresh ? afresh : kept;
  const [approvals, own] = await Promise.all([approvalItems(get), user.type === "creator" ? creatorItems(get) : brandItems(get)]);
  // The bell's number is everything waiting for the owner's say: the team's requests and the assistant's proposals, carried by the first of them.
  const owner = (currentTeam()?.role ?? "owner") === "owner";
  const proposals = own.find((i) => i.kind === "handoff")?.total ?? 0;
  const waiting = (approvals[0]?.count ?? 0) + (owner ? proposals : 0);
  const items = [...approvals, ...own].map((i) => (i.kind === "handoff" ? { ...i, kind: "approval", count: 0 } : i));
  const first = items.find((i) => i.kind === "approval");
  if (first) first.count = waiting;
  // One number for the badge and the panel's header: everything the list stands for.
  items.total = items.reduce((t, i) => t + (i.n ?? 1), 0);
  cached = { at: Date.now(), items, key };
  return items;
}

const MIN_GAP = 60_000;
const MAX_GAP = 15 * 60_000;

/**
  Keeps the bell current without asking on every screen: when the person comes
  back to the tab, the list is read afresh if the gap has passed. A read that
  finds nothing new doubles the gap (to fifteen minutes); a change resets it.
*/
let unwatch = null;
export function watchNotifications(user, show) {
  unwatch?.();
  let gap = MIN_GAP;
  let last = Date.now();
  let seen = "";
  const look = async () => {
    if (document.visibilityState === "hidden" || Date.now() - last < gap) return;
    last = Date.now();
    const items = await loadNotifications(user, { fresh: true }).catch(() => null);
    if (!items) return;
    const now = JSON.stringify(items);
    gap = now === seen ? Math.min(gap * 2, MAX_GAP) : MIN_GAP;
    seen = now;
    show(items);
  };
  loadNotifications(user).then((items) => {
    seen = JSON.stringify(items);
    show(items);
  }).catch(() => {});
  window.addEventListener("focus", look);
  document.addEventListener("visibilitychange", look);
  unwatch = () => {
    window.removeEventListener("focus", look);
    document.removeEventListener("visibilitychange", look);
  };
}
