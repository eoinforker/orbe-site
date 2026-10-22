/*
  The app's screens, by who is signed in. Plain data, so the web app test can
  read it to load every screen. Paths are under /app; a screen's module is
  loaded the first time it is opened.

  A screen with a feature is shown only when the server offers that feature
  (FEATURES, read from GET /v1/auth/session); the desk is only for staff.
*/
export const BASE = "/orbe-site/demo/app";

/*
  What each role on a team may do, mirrored from src/api/teams/policy.ts so
  the console never offers what a role cannot use. The server still decides:
  this only hides. A manager's money, consent and rights are allowed here
  because they go to the owner to approve.
*/
export const ROLE_CAN = {
  "read.money": ["owner", "manager"],
  content: ["owner", "manager", "editor"],
  business: ["owner", "manager"],
  money: ["owner", "manager"],
  consent: ["owner", "manager"],
  rights: ["owner", "manager"],
  owner: ["owner"],
};
export const roleCan = (role, action) => !action || !ROLE_CAN[action] || ROLE_CAN[action].includes(role ?? "owner");

/* Every account is a team. The Team area lives in Settings; /team and /team/approvals (linked from emails) lead there. Joining from an invitation link has its own page. */
const TEAM = [
  { path: "team", name: "Team", module: "./team.js", also: ["team/:section"], hidden: true },
  { path: "invite", name: "Join a team", module: "./invite.js", hidden: true },
];

export const CREATOR = [
  { path: "", name: "Home", module: "./creator/home.js" },
  { path: "explore", name: "Explore", module: "./explore.js" },
  { path: "library", name: "Library", module: "./creator/library.js" },
  { path: "library/:id", name: "Work", module: "./creator/work.js", hidden: true, under: "library" },
  // Drop in a video: reached from the Library, Explore and the composer, so no tab of its own.
  { path: "media", name: "Drop in a video", module: "./creator/media.js", hidden: true, under: "library", feature: "media", needs: "content" },
  { path: "media/:id", name: "Video", module: "./creator/media.js", hidden: true, under: "library", feature: "media" },
  { path: "studio", name: "Studio", module: "./creator/studio.js" },
  { path: "rate", name: "Rate a channel", module: "./tools/rate.js", feature: "rating" },
  { path: "offer", name: "Fair offer check", module: "./tools/offer.js", feature: "sponsorships", needs: "read.money" },
  { path: "report", name: "Diligence report", module: "./creator/report.js", feature: "record", needs: "read.money" },
  { path: "protect", name: "Protect", module: "./tools/protect.js" },
  { path: "developers", name: "For developers", module: "./tools/developers.js" },
  { path: "settings", name: "Settings", module: "./settings.js", also: ["settings/:section"] },
  ...TEAM,
  // The first sign-in: a few questions, then the console.
  { path: "welcome", name: "Welcome", module: "./welcome.js", hidden: true },
  // The API sends people back to /connections after a platform's sign-in.
  { path: "connect", name: "Connect", module: "./creator/connect.js", also: ["connections"] },
  { path: "record", name: "Record", module: "./creator/record.js", feature: "record", needs: "read.money" },
  { path: "sponsorships", name: "Sponsorships", module: "./creator/sponsorships.js", feature: "sponsorships", needs: "read.money" },
  // Google sends the browser back to /fixes after the YouTube permission screen.
  { path: "fix", name: "Fix", module: "./creator/fix.js", also: ["fixes"], feature: "fix" },
  { path: "plan", name: "Plan", module: "./creator/plan.js", needs: "read.money" },
  { path: "sell", name: "Sell", module: "./creator/sell.js", needs: "read.money" },
  // Podcasts first: a creator with nothing connected starts here, and can leave and come back.
  { path: "start", name: "Podcasts", module: "./creator/start.js", also: ["podcasts"], feature: "podcasts" },
  // The link a podcast's owner is emailed to prove the show.
  { path: "podcasts/confirm", name: "Confirm your show", module: "./creator/confirm.js", hidden: true, feature: "podcasts" },
];

/* A buyer sign-in can be a brand, an agency, or both: brand screens ask for the brand profile first, the rest do not. */
export const BRAND = [
  { path: "", name: "Home", module: "./brand/home.js", brand: true },
  { path: "intelligence", name: "Intelligence", module: "./brand/intel.js", brand: true, feature: "brand_intel" },
  { path: "explore", name: "Explore", module: "./explore.js" },
  { path: "rate", name: "Rate a channel", module: "./tools/rate.js", feature: "rating" },
  { path: "campaigns", name: "Campaigns", module: "./brand/campaigns.js", brand: true, feature: "sponsorships", needs: "read.money" },
  { path: "campaigns/:id", name: "Campaign", module: "./brand/campaign.js", hidden: true, under: "campaigns", brand: true, feature: "sponsorships", needs: "read.money" },
  { path: "bookings", name: "Bookings", module: "./brand/bookings.js", brand: true, feature: "sponsorships", needs: "read.money" },
  // Self-serve guaranteed reads: a new checkout, and where one stands. It opens campaigns, so it sits under them.
  { path: "reads", name: "Buy guaranteed reads", module: "./brand/reads.js", also: ["reads/:id"], hidden: true, under: "campaigns", brand: true, feature: "reads_checkout", needs: "read.money" },
  { path: "discover", name: "Discover", module: "./brand/discover.js", brand: true, feature: "brand_data" },
  { path: "roster", name: "Roster", module: "./brand/roster.js", feature: "brand_data" },
  { path: "keys", name: "API keys", module: "./brand/keys.js", feature: "brand_data", needs: "read.money" },
  { path: "profile", name: "Brand profile", module: "./brand/profile.js", feature: "sponsorships" },
  { path: "developers", name: "MCP and agents", module: "./tools/developers.js" },
  { path: "settings", name: "Settings", module: "./settings.js", also: ["settings/:section"] },
  ...TEAM,
  { path: "welcome", name: "Welcome", module: "./welcome.js", hidden: true },
];

/* Orbe staff only (ADMIN_EMAILS), on top of a creator or buyer sign-in: the concierge campaign desk. */
export const ADMIN = [
  { path: "desk", name: "Desk", module: "./admin/desk.js", feature: "sponsorships", admin: true },
  { path: "desk/campaigns/:id", name: "Desk campaign", module: "./admin/campaign.js", hidden: true, under: "desk", feature: "sponsorships", admin: true },
];

/** The screens this person may open on this server: their side's, the desk for staff, less any feature switched off or beyond their role on the team. */
export function screensFor(user, features) {
  const on = new Set(features ?? []);
  const own = user.type === "creator" ? CREATOR : BRAND;
  const staff = (user.roles ?? []).includes("admin") ? ADMIN : [];
  const role = user.team?.role;
  return [...own, ...staff].filter((r) => (!r.feature || on.has(r.feature)) && roleCan(role, r.needs));
}

/** The screen for a path under /app (no leading or trailing slash), with its parameters. */
export function match(table, rest) {
  const segs = rest === "" ? [] : rest.split("/");
  for (const route of table) {
    for (const p of [route.path, ...(route.also ?? [])]) {
      const parts = p === "" ? [] : p.split("/");
      if (parts.length !== segs.length) continue;
      const params = {};
      if (parts.every((part, i) => (part.startsWith(":") ? ((params[part.slice(1)] = decodeURIComponent(segs[i])), segs[i] !== "") : part === segs[i]))) return { route, params };
    }
  }
  return null;
}
