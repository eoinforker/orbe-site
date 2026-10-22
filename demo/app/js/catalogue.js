/*
  The console's map: every Orbe tool (for Explore, the tab menus, the command
  palette and each tool's API tab), the tabs across the top, the settings
  sections and the resources menu. A tool names a screen in routes.js by its
  path, so it is live only when that screen is open to this person on this
  server (their side, staff or not, and the FEATURES that are on). A tool
  with no screen yet is shown as coming, linked to its page on the site.

  Tiles mirror the site's Products menu (site/assets/orbe/chrome.js): the same
  five by five pixel glyphs and the same colour pairs, Orbe Fix with its own
  Claret and Peony. The web app test checks the glyphs still match the site.
*/
import { on } from "./api.js";
import { roleCan } from "./routes.js";

/* by the site's path, as in chrome.js GLYPH */
export const GLYPH = {
  "products/you/": ".###.|#...#|#.#.#|#...#|.###.",
  "products/rate/": "....#|..#.#|..#.#|#.#.#|#.#.#",
  "products/fix/": "....#|...#.|#.#..|.#...|#.#..",
  "products/podcasts/": "..#..|#.#.#|#.#.#|#.#.#|..#..",
  "products/sponsorships/": "#####|#...#|#####|.....|#####",
  "products/offer/": ".....|....#|...#.|#.#..|.#...",
  "products/selling/": ".####|...##|..#.#|.#..#|#....",
  "products/diligence/": "###..|.....|#####|.....|####.",
  "products/protect/": "#####|#####|#####|.###.|..#..",
  "products/rights/": "###..|#.#..|#####|..#.#|..###",
  "products/roster/": "#.#.#|.....|#.#.#|.....|#.#.#",
  "teams/": "##.##|##.##|.....|##.##|##.##",
  "developers/": "#....|.#...|..#..|.#...|#.###",
};

/**
  Every tool. path: the app screen it opens (null: not in the app yet, see
  site). group: where it sits in Explore and the menus. api: the same thing
  as a call (method and path on this API) and as an MCP tool, when there is
  one; the tool page's API tab shows them. nav: false keeps a tool out of the
  tab menus: one input and one answer belongs in the composer and Explore,
  and anything about the account belongs in Settings. local: it runs on the
  person's own device and stores nothing.
*/
const tool = (o) => ({ side: "creator", api: null, site: null, nav: true, local: false, ...o });

export const TOOLS = [
  // Grow
  tool({ id: "rate", nav: false, path: "rate", name: "Rate a channel", line: "Any YouTube channel, against creators the same size.", group: "Grow", k: "also", glyph: "products/rate/", site: "products/rate/",
    api: { method: "GET", path: "/v1/rate/youtube/{handle}", mcp: "orbe_rate", note: "Public uploads only. The rating carries its label wherever it is shown." } }),
  tool({ id: "record", path: "record", name: "Your record", line: "Your verified results and who may see them.", group: "Earn", k: "rec", glyph: "products/you/", site: "products/you/",
    api: { method: "GET", path: "/v1/me/record", mcp: "orbe_explain_rating", note: "JSON by default; add ?format=html or ?format=markdown." } }),
  tool({ id: "podcasts", path: "start", name: "Podcasts", line: "Free measurement and a page for your show.", group: "Grow", k: "pod", glyph: "products/podcasts/", site: "products/podcasts/",
    api: { method: "GET", path: "/v1/me/podcasts", mcp: "orbe_podcast_plausibility", note: "The MCP tool checks whether a download claim fits public signals." } }),
  tool({ id: "fix", path: "fix", name: "Orbe Fix", line: "New titles and thumbnails, kept only on lift.", group: "Grow", k: "fix", glyph: "products/fix/", site: "products/fix/",
    api: { method: "GET", path: "/v1/me/fixes", mcp: "orbe_diagnose_upload", note: "orbe_judge_fix says whether a change lifted an upload." } }),
  tool({ id: "plan", path: "plan", name: "Predictions", line: "Seal a forecast before an upload; checked after.", group: "Grow", k: "note", glyph: "products/you/",
    api: { method: "GET", path: "/v1/me/predictions", mcp: null, note: "Each seal is chained to the one before and added to a public log." } }),
  tool({ id: "media", nav: false, path: "media", feature: "media", name: "Drop in a video", line: "Clips, captions and words from one video, ready to send.", group: "Grow", k: "also", glyph: "products/podcasts/",
    api: { method: "POST", path: "/v1/me/media/items", mcp: null, note: "Then PUT the file in chunks to the upload address it returns, with Content-Range." } }),
  // Earn
  tool({ id: "sponsorships", path: "sponsorships", name: "Sponsorships", line: "Price a slot, answer offers, deliver reads.", group: "Earn", k: "spon", glyph: "products/sponsorships/", site: "products/sponsorships/",
    api: { method: "GET", path: "/v1/me/sponsorships/inventory", mcp: "orbe_price_sponsorship", note: "orbe_quote_guaranteed_read quotes a read paid only on verified delivery." } }),
  tool({ id: "finder", nav: false, path: "sponsorships?tab=finder", screen: "sponsorships", feature: "sponsor_finder", name: "Sponsors like you", line: "Brands that sponsor channels like yours, from their public uploads.", group: "Earn", k: "spon", glyph: "products/sponsorships/",
    api: { method: "GET", path: "/v1/me/sponsor-finder", mcp: null, note: "Detected in public works; a price only where Orbe settled one or your own results support it." } }),
  tool({ id: "assistant", nav: false, path: "sponsorships?tab=assistant", screen: "sponsorships", feature: "deals_agent", name: "Deals assistant", line: "Finds, drafts and counters inside your limits. Never accepts.", group: "Earn", k: "sell", glyph: "products/offer/",
    api: { method: "GET", path: "/v1/me/deals", mcp: null, note: "Drafts are sent only on your tap, and say Orbe's assistant drafted them." } }),
  tool({ id: "offer", nav: false, path: "offer", name: "Fair offer check", line: "Is this offer fair for your size?", group: "Earn", k: "spon", glyph: "products/offer/", site: "products/offer/",
    api: { method: "GET", path: "/v1/me/sponsorships/inventory", mcp: "orbe_fair_offer", note: "The check sets an offer against the range your own results support." } }),
  tool({ id: "sell", path: "sell", name: "Selling", line: "An indicative value; fees in full, never a cut.", group: "Earn", k: "sell", glyph: "products/selling/", site: "products/selling/",
    api: { method: "GET", path: "/v1/me/valuation?margin={margin}&faceDependence={faceDependence}", mcp: "orbe_value_business", note: "Margin and face dependence are 0 to 1." } }),
  tool({ id: "report", nav: false, path: "report", name: "Diligence report", line: "The report a buyer reads first.", group: "Earn", k: "rec", glyph: "products/diligence/", site: "products/diligence/",
    api: { method: "POST", path: "/v1/me/reports", mcp: null, note: "Issues a free Orbe Verified report of your record as it stands." } }),
  // Protect
  tool({ id: "protect", nav: false, local: true, path: "protect", name: "Protect", line: "Is this a copy of your work? Checked on your device.", group: "Protect", k: "rec", glyph: "products/protect/", site: "products/protect/" }),
  tool({ id: "rights", nav: false, path: null, name: "Rights", line: "Who may use what, until when.", group: "Protect", k: "note", glyph: "products/rights/", site: "products/rights/" }),
  // Connect
  tool({ id: "connect", nav: false, path: "connect", name: "Connections", line: "YouTube, podcasts, Stripe and Patreon.", group: "Connect", k: "note", glyph: "products/roster/",
    api: { method: "GET", path: "/v1/me/connections", mcp: null, note: "Grants without their secrets." } }),
  tool({ id: "developers", nav: false, path: "developers", name: "For developers", line: "Orbe for agents, over MCP.", group: "Connect", k: "pod", glyph: "developers/", site: "developers/",
    api: { method: "MCP", path: "orbe-mcp", mcp: "orbe_rate", note: "Twelve tools, worked out on your machine." } }),

  // Brand side
  tool({ side: "buyer", id: "intel", nav: false, path: "intelligence", feature: "brand_intel", name: "Intelligence", line: "Who sponsors in your category, and which creators your competitors back.", group: "Intelligence", k: "rec", glyph: "products/diligence/",
    api: { method: "GET", path: "/v1/brand/intel?days={days}", mcp: null, note: "Add &format=csv for a spreadsheet. Every row links to the public works it was counted from." } }),
  tool({ side: "buyer", id: "reads", nav: false, path: "reads", feature: "reads_checkout", name: "Buy guaranteed reads", line: "A brief in, reads at the creator's price out. Paid only on verified delivery.", group: "Campaigns", k: "spon", glyph: "products/offer/",
    api: { method: "POST", path: "/v1/brand/checkout/proposal", mcp: "orbe_quote_guaranteed_read", note: "Then POST /v1/brand/checkout with the picks. Nothing is booked until each creator accepts." } }),
  tool({ side: "buyer", id: "campaigns", path: "campaigns", name: "Campaigns", line: "Briefs, matches and offers.", group: "Campaigns", k: "spon", glyph: "products/sponsorships/", site: "teams/",
    api: { method: "GET", path: "/v1/brand/campaigns", mcp: "orbe_quote_guaranteed_read", note: "Matches come ranked, each with its reasons." } }),
  tool({ side: "buyer", id: "bookings", path: "bookings", name: "Bookings", line: "Fund, review and approve reads.", group: "Campaigns", k: "sell", glyph: "products/selling/",
    api: { method: "GET", path: "/v1/brand/bookings", mcp: "orbe_check_delivery", note: "Delivery is read at source, and short reads are made good." } }),
  tool({ side: "buyer", id: "profile", nav: false, path: "profile", name: "Brand profile", line: "Who you are and the terms you accept.", group: "Campaigns", k: "note", glyph: "teams/",
    api: { method: "GET", path: "/v1/brand/profile", mcp: null, note: "" } }),
  tool({ side: "buyer", id: "discover", path: "discover", name: "Discover", line: "Creators by results at their size.", group: "Discover", k: "also", glyph: "products/rate/",
    api: { method: "GET", path: "/v1/brand/discover?kinds={kinds}&bands={bands}", mcp: "orbe_benchmark", note: "Anonymised until a creator accepts an offer from you." } }),
  tool({ side: "buyer", id: "roster", path: "roster", name: "Roster", line: "Every creator you look after.", group: "Discover", k: "note", glyph: "products/roster/", site: "products/roster/",
    api: { method: "GET", path: "/v1/roster", mcp: null, note: "Built fresh each time it is opened." } }),
  tool({ side: "buyer", id: "brand-rate", nav: false, path: "rate", name: "Rate a channel", line: "Any YouTube channel, against creators its size.", group: "Discover", k: "also", glyph: "products/rate/",
    api: { method: "GET", path: "/v1/rate/youtube/{handle}", mcp: "orbe_rate", note: "Public uploads only." } }),
  tool({ side: "buyer", id: "keys", nav: false, path: "keys", name: "API keys", line: "Keys for the data API.", group: "Developers", k: "pod", glyph: "developers/",
    api: { method: "GET", path: "/v1/data/discover", mcp: null, note: "Send a key as a bearer token." } }),
  tool({ side: "buyer", id: "brand-developers", nav: false, path: "developers", name: "MCP and agents", line: "Orbe for agents, over MCP.", group: "Developers", k: "pod", glyph: "developers/",
    api: { method: "MCP", path: "orbe-mcp", mcp: "orbe_rate", note: "Twelve tools, worked out on your machine." } }),
];

export const GROUP_LINES = {
  Grow: "Each upload, rated against creators your size.",
  Earn: "Get paid fairly when money moves.",
  Protect: "Your work, and who may use it.",
  Connect: "What Orbe reads for you, and how agents reach it.",
  Intelligence: "Your market, from public works, with the evidence.",
  Campaigns: "Guaranteed reads, paid only on verified delivery.",
  Discover: "Creators found by their results, not their followers.",
  Developers: "The data API and MCP.",
};

/**
  The tabs. A tab is a link (path) or a menu of tools (groups); "Settings"
  is a menu of the settings sections. icon names a line icon in icons.js.
*/
export const CREATOR_TABS = [
  { name: "Home", path: "", icon: "home" },
  { name: "Library", path: "library", icon: "library" },
  { name: "Grow", icon: "chart", groups: ["Grow"] },
  { name: "Earn", icon: "earn", groups: ["Earn"] },
  { name: "Explore", path: "explore", icon: "explore" },
];

export const BRAND_TABS = [
  { name: "Home", path: "", icon: "home" },
  { name: "Intelligence", path: "intelligence", icon: "chart" },
  { name: "Campaigns", path: "campaigns", icon: "megaphone" },
  { name: "Bookings", path: "bookings", icon: "bolt" },
  { name: "Discover", path: "discover", icon: "people" },
  { name: "Roster", path: "roster", icon: "grid" },
  { name: "Explore", path: "explore", icon: "explore" },
];

export const ADMIN_TABS = [{ name: "Desk", path: "desk", icon: "bolt" }];

/** Settings sections, grouped as the settings list shows them. side: which sign-ins see it. */
export const SETTINGS = [
  { id: "account", name: "Account", line: "Your name, email, the walkthrough, and deleting your account.", side: "both", icon: "user", group: "General" },
  { id: "brand", name: "Brand profile", line: "Who you are to creators, and the terms you accept.", side: "buyer", feature: "sponsorships", icon: "megaphone", group: "General" },
  { id: "connections", name: "Connections", line: "Accounts Orbe reads for you.", side: "creator", icon: "link", group: "General" },
  { id: "team", name: "Team", line: "The people on this account, what each may do, and what waits for the owner.", side: "both", icon: "people", group: "General" },
  { id: "integrations", name: "Integrations", line: "Where Orbe posts for you, and the tools it works with.", side: "creator", feature: "integrations", icon: "plug", group: "General" },
  { id: "sharing", name: "Sharing", line: "Your public page, shared ratings, emails and your invitation link.", side: "both", icon: "link", group: "General", anyOf: ["creator_pages", "share_cards", "habit_email", "referrals"] },
  { id: "plan", name: "Plan and usage", line: "Free for creators; the optional plan for heavy use, and what you have used.", side: "creator", feature: "pro", icon: "card", group: "Billing", needs: "read.money" },
  { id: "keys", name: "API keys", line: "Keys for the data API, and what each has used.", side: "buyer", feature: "brand_data", icon: "key", group: "Developer", needs: "read.money" },
  { id: "mcp", name: "MCP and agents", line: "Use Orbe from Claude and other AI tools.", side: "both", icon: "plug", group: "Developer" },
  { id: "security", name: "Security", line: "Where you are signed in.", side: "both", icon: "shield", group: "Security" },
  { id: "metrics", name: "Metrics", line: "What investors ask, counted from Orbe's own records. Staff only.", side: "both", icon: "chart", group: "Staff", staff: true },
];

/** The resources menu: Orbe's public pages, grouped. Paths on the public site; a leading "/" is this server. */
export const RESOURCES = [
  ["Developer resources", [["For developers", "developers/", "code"], ["The published maths", "/v1/maths?format=markdown", "doc"], ["For agents (llms.txt)", "llms.txt", "sparkle"]]],
  ["Learning", [["How the rating works", "products/rate/", "chart"], ["Answers", "answers/", "book"], ["All products", "products/", "grid"]]],
  ["Company", [["Pricing", "pricing/", "card"], ["For teams", "teams/", "people"], ["Brand", "brand/", "image"]]],
  ["Legal", [["Terms", "legal/terms.html", "doc"], ["Privacy", "legal/privacy.html", "shield"]]],
];

/** The public site, for the resources menu. The app is served on the API's host, the site on its own. */
export const SITE = "/orbe-site/";
export const siteHref = (p) => (p.startsWith("/") ? p : `${SITE}${p}`);

/** This person's tools, each with its status: live (screen open), off (switched off here), or coming (no screen yet). */
export function toolsFor(user, screens) {
  const open = new Set(screens.map((r) => r.path));
  const side = user.type === "creator" ? "creator" : "buyer";
  // A tool inside another screen (feature) is live only when its own feature is on, too.
  return TOOLS.filter((t) => t.side === side).map((t) => ({ ...t, status: t.path === null ? "coming" : open.has(t.screen ?? t.path) && (!t.feature || on(t.feature)) ? "live" : "off" }));
}

/** Tabs for this person, each menu cut to the tools whose screens they may open. */
export function tabsFor(user, screens) {
  const open = new Set(screens.map((r) => r.path));
  const tools = toolsFor(user, screens).filter((t) => t.status === "live" && t.nav);
  const base = user.type === "creator" ? CREATOR_TABS : BRAND_TABS;
  const staff = (user.roles ?? []).includes("admin") ? ADMIN_TABS : [];
  return [...base, ...staff]
    .map((tab) => (tab.groups ? { ...tab, items: tools.filter((t) => tab.groups.includes(t.group)) } : tab))
    .filter((tab) => (tab.items ? tab.items.length > 0 : open.has(tab.path)));
}

/** Settings sections for this person. */
export const settingsFor = (user, on) =>
  SETTINGS.filter((s) => (!s.staff || (user.roles ?? []).includes("admin")) && (s.side === "both" || s.side === user.type) && (!s.feature || on(s.feature)) && (!s.anyOf || s.anyOf.some((f) => on(f) && (user.type === "creator" || f === "referrals"))) && roleCan(user.team?.role, s.needs));

/** A tool's tile: its pixel glyph on its pair's field, as an SVG built from data. */
export function tile(glyphPath, k, h, size) {
  const g = GLYPH[glyphPath] ?? "";
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 5 5");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("focusable", "false");
  g.split("|").forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== "#") return;
      const r = document.createElementNS(NS, "rect");
      for (const [a, v] of [["x", x], ["y", y], ["width", 1], ["height", 1]]) r.setAttribute(a, String(v));
      svg.append(r);
    }),
  );
  return h("span", { class: `cn-tile${size ? ` cn-tile--${size}` : ""}`, "data-k": k, "aria-hidden": "true" }, svg);
}
