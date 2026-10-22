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

/*
  The creator's screens. The work is the centre: the Library lists works and
  each opens its page (works/:id), where Fix, viewers, clips and words, deals
  and the record of that work live as tabs. The top tabs are Home, Library,
  Deals, Record and Explore (catalogue.js); everything else is reached from a
  work, from Explore or from the account menu. moved: older paths that still
  work, rewritten in the address bar to the one path each screen has now, so
  a menu label, a page title and a URL always say the same thing.
*/
export const CREATOR = [
  { path: "", name: "Home", module: "./creator/home.js" },
  { path: "library", name: "Library", module: "./creator/library.js" },
  { path: "works/:id", name: "Work", module: "./creator/work.js", moved: ["library/:id"], hidden: true, under: "library" },
  { path: "deals", name: "Deals", module: "./creator/sponsorships.js", moved: ["sponsorships"], feature: "sponsorships", needs: "read.money" },
  { path: "record", name: "Record", module: "./creator/record.js", feature: "record", needs: "read.money" },
  // Selling and the diligence report are actions on the record.
  { path: "selling", name: "Selling", module: "./creator/sell.js", moved: ["sell"], hidden: true, under: "record", needs: "read.money" },
  { path: "report", name: "Diligence report", module: "./creator/report.js", hidden: true, under: "record", feature: "record", needs: "read.money" },
  { path: "explore", name: "Explore", module: "./explore.js" },
  // Every run of a tool, from the composer or a tool page, kept on the server.
  { path: "runs", name: "Runs", module: "./creator/studio.js", moved: ["studio"], under: "explore" },
  { path: "rate", name: "Rate a channel", module: "./tools/rate.js", under: "explore", feature: "rating" },
  { path: "offer", name: "Fair offer check", module: "./tools/offer.js", under: "explore", feature: "sponsorships", needs: "read.money" },
  { path: "protect", name: "Protect", module: "./tools/protect.js", under: "explore" },
  { path: "developers", name: "For developers", module: "./tools/developers.js", under: "explore" },
  // Drop in a video: reached from the Library, a work's Clips and words tab, Explore and the composer.
  { path: "media", name: "Drop in a video", module: "./creator/media.js", hidden: true, under: "library", feature: "media", needs: "content" },
  { path: "media/:id", name: "Video", module: "./creator/media.js", hidden: true, under: "library", feature: "media" },
  // Fix across every work; each work's own Fix tab is where most people meet it. Google returns to /fixes after the YouTube permission screen.
  { path: "fix", name: "Fix", module: "./creator/fix.js", also: ["fixes"], under: "explore", feature: "fix" },
  { path: "predictions", name: "Predictions", module: "./creator/plan.js", moved: ["plan"], under: "explore", needs: "read.money" },
  { path: "settings", name: "Settings", module: "./settings.js", also: ["settings/:section"] },
  // Everything Orbe reads or posts to, from the account menu and wherever something needs connecting. A platform's sign-in returns here.
  { path: "connections", name: "Connections", module: "./creator/connect.js", moved: ["connect"] },
  // A podcast's set-up, part of Connections; a creator with nothing connected can start here and come back.
  { path: "podcasts", name: "Podcasts", module: "./creator/start.js", moved: ["start"], under: "connections", feature: "podcasts" },
  // The link a podcast's owner is emailed to prove the show.
  { path: "podcasts/confirm", name: "Confirm your show", module: "./creator/confirm.js", hidden: true, feature: "podcasts" },
  ...TEAM,
  // The first sign-in: a few questions, then the console.
  { path: "welcome", name: "Welcome", module: "./welcome.js", hidden: true },
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
    for (const p of [route.path, ...(route.also ?? []), ...(route.moved ?? [])]) {
      const parts = p === "" ? [] : p.split("/");
      if (parts.length !== segs.length) continue;
      const params = {};
      if (parts.every((part, i) => (part.startsWith(":") ? ((params[part.slice(1)] = decodeURIComponent(segs[i])), segs[i] !== "") : part === segs[i]))) {
        // A moved path answers with where the screen lives now, so the address bar can be put right.
        const moved = (route.moved ?? []).includes(p) ? route.path.split("/").map((part) => (part.startsWith(":") ? encodeURIComponent(params[part.slice(1)]) : part)).join("/") : null;
        return { route, params, moved };
      }
    }
  }
  return null;
}
