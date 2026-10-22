/*
  Notifications: what is waiting on this person, read from the same API the
  screens use. Nothing is stored for them; each open of the bell asks again
  (at most once a minute), so the list is never stale and never invented.
*/
import { api, can, currentTeam, on } from "./api.js";
import { plural } from "./ui.js";

const CREATOR_MOVES = { in_production: "Deliver", changes_requested: "Revise the draft for", ready: "Go live for", short: "Choose a remedy for", make_good: "Make good for" };
const BRAND_MOVES = { awaiting_funds: "Fund the booking with", draft_review: "Review the draft from" };

const settle = (p) => p.then((v) => v, () => null);
let cached = { at: 0, items: [], key: "" };

/** Approvals: the owner sees what waits for them; anyone else sees what they asked for and is still waiting. */
async function approvalItems() {
  const team = currentTeam();
  if (!team) return [];
  const r = await settle(api.get("/v1/team/approvals?state=pending"));
  const list = r?.approvals ?? [];
  if (!list.length) return [];
  const href = "/orbe-site/demo/app/settings/team?tab=approvals";
  if (team.role === "owner") {
    const first = list[0];
    return [{ title: list.length === 1 ? "A request waits for you" : `${plural(list.length, "request")} wait for you`, line: first.summary, href, kind: "approval", count: list.length }];
  }
  return [{ title: `Waiting for the owner: ${plural(list.length, "request")}`, line: list[0].summary, href, kind: "approval", count: 0 }];
}

/** How many requests wait for this person to decide, for the bell and the palette. */
export async function approvalsWaiting(user) {
  const items = await loadNotifications(user);
  return items.find((i) => i.kind === "approval")?.count ?? 0;
}

/** Forget the last read, so the next open of the bell asks again (after something changed). */
export const forgetNotifications = () => (cached = { at: 0, items: [], key: "" });

async function creatorItems() {
  if (!can("read.money")) return [];
  const [offers, bookings, intros, rosters] = await Promise.all([
    on("sponsorships") ? settle(api.get("/v1/me/sponsorships/offers")) : null,
    on("sponsorships") ? settle(api.get("/v1/me/sponsorships/bookings")) : null,
    settle(api.get("/v1/me/introductions")),
    on("brand_data") ? settle(api.get("/v1/me/rosters")) : null,
  ]);
  const out = [];
  const open = (offers?.offers ?? []).filter((o) => o.state === "sent");
  if (open.length) out.push({ title: `Answer ${plural(open.length, "sponsorship offer")}`, line: `${open[0].brandName} is waiting. Offers lapse if not answered.`, href: "/orbe-site/demo/app/sponsorships" });
  for (const b of (bookings?.bookings ?? []).filter((x) => CREATOR_MOVES[x.state]).slice(0, 4)) out.push({ title: `${CREATOR_MOVES[b.state]} ${b.brandName}`, line: "A booking is waiting on you.", href: "/orbe-site/demo/app/sponsorships?tab=bookings" });
  const asked = (intros?.introductions ?? []).filter((i) => i.status === "requested");
  if (asked.length) out.push({ title: `${plural(asked.length, "buyer")} asked to be introduced`, line: "Approve or decline before the request lapses.", href: "/orbe-site/demo/app/sell" });
  const invited = (rosters?.rosters ?? []).filter((r) => r.state === "invited");
  for (const r of invited.slice(0, 2)) out.push({ title: `${r.org} invited you to their roster`, line: "Join or decline from your record.", href: "/orbe-site/demo/app/record" });
  return out;
}

async function brandItems() {
  if (!on("sponsorships") || !can("read.money")) return [];
  const bookings = await settle(api.get("/v1/brand/bookings"));
  const out = [];
  for (const b of (bookings?.bookings ?? []).filter((x) => BRAND_MOVES[x.state] || (x.state === "live" && !x.contentApprovedAt)).slice(0, 5)) {
    const who = `a creator (${String(b.format ?? "read").replaceAll("_", " ")})`;
    out.push({ title: BRAND_MOVES[b.state] ? `${BRAND_MOVES[b.state]} ${who}` : `Approve the content from ${who}`, line: "A booking is waiting on you.", href: "/orbe-site/demo/app/bookings" });
  }
  return out;
}

/** What is waiting on this person: { title, line, href } each. */
export async function loadNotifications(user) {
  const key = `${user.type}:${user.id}:${currentTeam()?.id ?? ""}`;
  if (cached.key === key && Date.now() - cached.at < 60_000) return cached.items;
  const [approvals, own] = await Promise.all([approvalItems(), user.type === "creator" ? creatorItems() : brandItems()]);
  const items = [...approvals, ...own];
  cached = { at: Date.now(), items, key };
  return items;
}
