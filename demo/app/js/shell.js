/*
  The console's frame: the top bar (the Portal and wordmark, who you are,
  the breadcrumb, search, the plan, resources, notifications and your
  menu), the tabs with their tool menus, the phone sheet, and the command
  palette. It draws from catalogue.js and the screens this person may open,
  so a switched-off feature leaves no trace here.

  Everything here is structure and behaviour; how it looks is console.css,
  whose class names (cn-*) are the contract the screens share.
*/
import { api, can, currentTeam, on } from "./api.js";
import { RESOURCES, settingsFor, siteHref, tabsFor, tile, toolsFor } from "./catalogue.js";
import { icon } from "./icons.js";
import { approvalsWaiting, loadNotifications } from "./notify.js";
import { setTheme, theme } from "./theme-switch.js";
import { h, nextId } from "./ui.js";
import { PORTAL } from "../site/mark.js";

const BASE = "/orbe-site/demo/app";
const href = (path) => (path ? `${BASE}/${path}` : `${BASE}/`);

let state = { user: null, screens: [], tabs: [], tools: [], go: null, signOut: null };
const top = () => document.querySelector("[data-top]");
const tabsEl = () => document.querySelector("[data-tabs]");

/** The Portal, drawn from the site's own path, in currentColor. */
export function portal(cls = "cn-portal") {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "8.5 8.5 83 83");
  svg.setAttribute("class", cls);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const p = document.createElementNS(NS, "path");
  p.setAttribute("fill", "currentColor");
  p.setAttribute("fill-rule", "evenodd");
  p.setAttribute("d", PORTAL.small);
  svg.append(p);
  return svg;
}

/** The lockup: the Portal, then the wordmark, both in the colour of the words around them. */
export const lockup = (cls = "") => h("span", { class: `cn-lockup${cls ? ` ${cls}` : ""}` }, portal(), h("span", { class: "cn-wordmark", role: "img", "aria-label": "Orbe" }));

/* ---------------------------------------------------------------- menus */

let openMenu = null;

function closeMenus() {
  if (!openMenu) return;
  const { btn, panel } = openMenu;
  btn.setAttribute("aria-expanded", "false");
  panel.hidden = true;
  openMenu = null;
}

/** A button that opens a panel under it; Escape, a click outside or a choice closes it. */
export function menu(label, build, opts = {}) {
  const id = nextId("menu");
  const btn = h("button", { class: `cn-menubtn${opts.cls ? ` ${opts.cls}` : ""}`, type: "button", "aria-expanded": "false", "aria-controls": id, "aria-label": opts.aria ?? null, title: opts.title ?? null }, label);
  const panel = h("div", { class: `cn-menu${opts.panel ? ` ${opts.panel}` : ""}${opts.end ? " cn-menu--end" : ""}`, id, hidden: true });
  const open = async () => {
    panel.replaceChildren(...[await build()].flat(Infinity).filter(Boolean));
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    openMenu = { btn, panel };
  };
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const was = openMenu?.btn === btn;
    closeMenus();
    if (was) return;
    await open();
    panel.querySelector("a, button, input")?.focus({ preventScroll: true });
  });
  btn.addEventListener("keydown", async (e) => {
    if (e.key !== "ArrowDown" || openMenu?.btn === btn) return;
    e.preventDefault();
    closeMenus();
    await open();
    panel.querySelector("a, button")?.focus({ preventScroll: true });
  });
  panel.addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = [...panel.querySelectorAll("a, button")];
    const i = items.indexOf(document.activeElement);
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  });
  panel.addEventListener("click", (e) => {
    if (e.target.closest("a, [data-close]")) closeMenus();
  });
  return h("div", { class: "cn-menuwrap" }, btn, panel);
}

document.addEventListener("click", (e) => {
  if (openMenu && !openMenu.panel.contains(e.target)) closeMenus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && openMenu) {
    const { btn } = openMenu;
    closeMenus();
    btn.focus();
  }
});

/** One row of a tool menu: tile, name, one line, and a mark when it is not open yet. */
const toolLink = (t) =>
  t.status === "coming"
    ? h("a", { class: "cn-item", href: siteHref(t.site ?? "products/"), target: "_blank", rel: "noopener" }, tile(t.glyph, t.k, h), h("span", { class: "cn-item-t" }, t.name, h("span", { class: "cn-soon" }, "Coming")), h("span", { class: "cn-item-d" }, t.line))
    : h("a", { class: "cn-item", href: href(t.path), "data-path": t.path }, tile(t.glyph, t.k, h), h("span", { class: "cn-item-t" }, t.name), h("span", { class: "cn-item-d" }, t.line));

/** A row in a plain menu: an icon, a name, and a line under it when there is one. */
const row = (iconName, name, line, props = {}) =>
  h(props.href ? "a" : "button", { class: `cn-item${line ? "" : " cn-item--row"}`, type: props.href ? null : "button", ...props }, h("span", { class: "cn-item-ico" }, icon(iconName)), h("span", { class: "cn-item-t" }, name), line ? h("span", { class: "cn-item-d" }, line) : null);

/* ---------------------------------------------------------------- the frame */

function initials(user) {
  const from = (user.displayName || user.email || "O").replace(/\(.*?\)/g, "").trim();
  const parts = from.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "O") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function avatarMenu() {
  const u = state.user;
  const choice = (value, label, ico) =>
    h("button", { class: "cn-themebtn", type: "button", "aria-pressed": String(theme() === value), "aria-label": label, title: label, "data-close": "", onclick: () => setTheme(value) }, icon(ico));
  return menu(h("span", { class: "cn-avatar" }, initials(u)), () => [
    h("div", { class: "cn-menu-head" },
      h("span", { class: "cn-avatar cn-avatar--m", "aria-hidden": "true" }, initials(u)),
      h("div", null, h("p", { class: "cn-item-t" }, u.displayName || (u.type === "creator" ? "Creator" : "Brand")), u.email ? h("p", { class: "cn-item-d cn-wrap" }, u.email) : null),
    ),
    row("settings", "Settings", null, { href: href("settings/account") }),
    row("shield", "Where you are signed in", null, { href: href("settings/security") }),
    h("div", { class: "cn-menu-sep" }),
    h("div", { class: "cn-menu-theme" }, h("span", { class: "cn-item-t" }, "Theme"), h("div", { class: "cn-themes", role: "group", "aria-label": "Theme" }, choice("system", "Match my device", "monitor"), choice("dark", "Ink", "moon"), choice("light", "Paper", "sun"))),
    h("div", { class: "cn-menu-sep" }),
    row("logout", "Sign out", null, { onclick: () => { closeMenus(); state.signOut(); } }),
  ], { aria: "Your account", end: true, cls: "cn-menubtn--avatar", panel: "cn-menu--account" });
}

function resourcesMenu() {
  return menu([icon("book"), icon("chevron", { cls: "cn-i--chev" })], () =>
    RESOURCES.map(([group, links]) => [
      h("p", { class: "cn-menu-group" }, group),
      links.map(([name, path, ico]) => row(ico, name, null, { href: siteHref(path), target: "_blank", rel: "noopener" })),
    ]),
  { aria: "Resources", title: "Resources", end: true, cls: "cn-menubtn--box", panel: "cn-menu--resources" });
}

function bell() {
  const dot = h("span", { class: "cn-dot", hidden: true });
  // A request waiting for the owner shows as a number; anything else as a dot.
  const mark = (items) => {
    const n = items.find((i) => i.kind === "approval")?.count ?? 0;
    dot.hidden = items.length === 0;
    dot.textContent = n ? String(n) : "";
    dot.classList.toggle("cn-dot--n", n > 0);
  };
  const wrap = menu([icon("bell"), dot], async () => {
    const items = await loadNotifications(state.user);
    mark(items);
    const head = h("div", { class: "cn-menu-title" }, h("p", null, "Notifications"), h("span", { class: "cn-count" }, String(items.length)));
    if (!items.length) return [head, h("div", { class: "cn-menu-empty" }, h("span", { class: "cn-empty-ico" }, icon("bell")), h("p", { class: "cn-item-t" }, "All caught up"), h("p", { class: "cn-item-d" }, "Offers, bookings and introductions that need you show here."))];
    return [head, items.map((n) => h("a", { class: `cn-note${n.kind === "approval" ? " cn-note--approval" : ""}`, href: n.href }, h("span", { class: "cn-note-dot", "aria-hidden": "true" }), h("span", { class: "cn-item-t" }, n.title), h("span", { class: "cn-item-d" }, n.line)))];
  }, { aria: "Notifications", title: "Notifications", end: true, cls: "cn-menubtn--box", panel: "cn-menu--notes" });
  loadNotifications(state.user).then(mark).catch(() => {});
  window.addEventListener("orbe:notes-changed", () => loadNotifications(state.user).then(mark).catch(() => {}));
  return wrap;
}

/** The plan chip: what this account is on, linked to where it changes. Only where there is a plan to change. */
async function planChip() {
  const u = state.user;
  const pix = h("span", { class: "cn-chip-px", "aria-hidden": "true" }, Array.from({ length: 9 }, () => h("span")));
  if (u.type === "creator" && on("pro") && can("read.money")) {
    const name = h("span", null, "Free");
    const chip = h("a", { class: "cn-planchip", href: href("settings/plan") }, pix, name, icon("chevron", { cls: "cn-i--chev" }));
    api.get("/v1/me/plan").then(({ plan }) => (name.textContent = plan.plan === "pro" ? "Creator Pro" : "Free plan")).catch(() => {});
    return chip;
  }
  return null;
}

function searchButton() {
  const kbd = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
  return h("button", { class: "cn-search", type: "button", onclick: () => openPalette(""), "aria-keyshortcuts": "Control+K Meta+K" }, icon("search"), h("span", { class: "cn-search-t" }, "Search anything"), h("kbd", { class: "cn-kbd" }, kbd));
}

/* ---------------------------------------------------------------- the team switcher */

const KIND = { creator: "Creator", brand: "Brand", agency: "Agency" };
const roleWord = (r) => r[0].toUpperCase() + r.slice(1);

/** A team's square: its initials on the kind's colour (Sky a creator, Straw a brand, Peony an agency). */
const teamTile = (name, kind, size = "") =>
  h("span", { class: `cn-teamtile${size ? ` cn-teamtile--${size}` : ""}`, "data-kind": kind, "aria-hidden": "true" }, initials({ displayName: name }));

/** The person's name, for the menu's head. */
const personName = (u) => (u.displayName || u.email || "").replace(/\s*\(.*?\)\s*/g, " ").trim() || "You";

let teamsCache = null;
const loadTeams = () => (teamsCache ??= api.get("/v1/teams").catch(() => null));

async function switchTo(teamId) {
  await api.put("/v1/teams/active", { teamId });
  // Every screen, menu and figure belongs to the team: start the console again in it.
  location.assign(href(""));
}

/** The team rows of the switcher: each with its role, the one you are in ticked. */
async function teamRows() {
  const r = await loadTeams();
  if (!r) return [];
  return r.teams.map((t) =>
    h("button", { class: "cn-item cn-teamrow", type: "button", role: "menuitemradio", "aria-checked": String(t.id === r.active.id), "data-close": "", onclick: () => (t.id === r.active.id ? null : switchTo(t.id)) },
      teamTile(t.name, t.kind, "s"),
      h("span", { class: "cn-item-t" }, t.name),
      h("span", { class: "cn-item-d" }, `${roleWord(t.role)}${t.agency ? `, through ${t.agency.org}` : ""}`),
      h("span", { class: "cn-teamrow-tick", "aria-hidden": "true" }, icon("check")),
    ),
  );
}

/** Beside the mark: the team this person works in, and every other team they are on. The person sits beneath. */
function teamSwitcher() {
  const u = state.user;
  const team = currentTeam();
  const fallback = (u.displayName || u.email || "").replace(/\s*\(.*?\)\s*/g, " ").trim() || (u.type === "creator" ? "Creator" : "Brand");
  const name = team?.name ?? fallback;
  const kind = team?.kind ?? (u.type === "creator" ? "creator" : "brand");
  const t = h("span", { class: "cn-who-t" }, name);
  const leads = team && team.via === "member" && (team.role === "owner" || team.role === "manager");
  return menu([teamTile(name, kind), t, h("span", { class: "cn-who-k" }, KIND[kind] ?? "Team"), icon("chevron", { cls: "cn-i--chev" })], async () => [
    h("div", { class: "cn-menu-head cn-menu-head--team" },
      h("span", { class: "cn-avatar cn-avatar--m", "aria-hidden": "true" }, initials(u.person ?? u)),
      h("div", null, h("p", { class: "cn-item-t" }, personName(u.person ?? u)), (u.person ?? u).email ? h("p", { class: "cn-item-d cn-wrap" }, (u.person ?? u).email) : null),
    ),
    h("p", { class: "cn-menu-group" }, "Teams"),
    h("div", { role: "group", "aria-label": "Teams" }, await teamRows()),
    h("div", { class: "cn-menu-sep" }),
    row("people", "Team settings", null, { href: `${href("settings/team")}` }),
    leads ? row("plus", "Invite people", null, { href: `${href("settings/team")}?tab=people&invite=1` }) : null,
  ], { aria: `Team: ${name}. Switch team`, cls: "cn-who cn-switcher", panel: "cn-menu--team" });
}

/** Draws the frame for a signed-in person, or nothing but the page for the sign-in screen. */
export async function drawFrame(user, screens, opts) {
  state = { user, screens, tabs: user ? tabsFor(user, screens) : [], tools: user ? toolsFor(user, screens) : [], go: opts.go, signOut: opts.signOut };
  const bar = top();
  document.body.classList.toggle("cn--out", !user);
  if (!user) {
    bar.replaceChildren();
    bar.hidden = true;
    tabsEl().hidden = true;
    return;
  }
  bar.hidden = false;
  const mark = h("a", { class: "cn-mark", href: href(""), "aria-label": "Orbe, home" }, lockup());
  const crumbs = h("nav", { class: "cn-crumbs", "aria-label": "Breadcrumb", "data-crumbs": "" });
  bar.replaceChildren(
    h("button", { class: "cn-sheetbtn", type: "button", "aria-label": "Menu", onclick: () => openSheet() }, icon("menu")),
    mark,
    h("span", { class: "cn-slash", "aria-hidden": "true" }, "/"),
    teamSwitcher(),
    crumbs,
    h("div", { class: "cn-tools" }, searchButton(), await planChip(), resourcesMenu(), bell(), avatarMenu()),
  );
  drawTabs();
}

function settingsMenu() {
  const sections = settingsFor(state.user, on);
  return menu([icon("settings"), h("span", null, "Settings"), icon("chevron", { cls: "cn-i--chev" })], () =>
    sections.map((s) => row(s.icon, s.name, s.line, { href: href(`settings/${s.id}`) })),
  { cls: "cn-tab", panel: "cn-menu--tools cn-menu--settings" });
}

function drawTabs() {
  const el = tabsEl();
  el.hidden = false;
  el.replaceChildren(
    h("ul", { class: "cn-tablist" },
      state.tabs.map((tab) =>
        h("li", { class: "cn-tabitem", "data-tab": tab.name },
          tab.items
            ? menu([icon(tab.icon), h("span", null, tab.name), icon("chevron", { cls: "cn-i--chev" })], () => {
                const groups = [...new Set(tab.items.map((t) => t.group))];
                return groups.map((g) => [groups.length > 1 ? h("p", { class: "cn-menu-group" }, g) : null, tab.items.filter((t) => t.group === g).map(toolLink)]).concat(
                  h("a", { class: "cn-menu-foot", href: href("explore") }, icon("explore"), h("span", null, "Explore every tool"), icon("arrowRight")),
                );
              }, { cls: "cn-tab", panel: `cn-menu--tools${tab.items.length > 4 ? " cn-menu--two" : ""}` })
            : h("a", { class: "cn-tab", href: href(tab.path), "data-path": tab.path }, icon(tab.icon), h("span", null, tab.name)),
        ),
      ),
      h("li", { class: "cn-tabitem", "data-tab": "Settings" }, settingsMenu()),
    ),
  );
}

/** Marks the current tab and writes the breadcrumb for a screen. */
export function markHere(route, params) {
  const here = route.under ?? route.path;
  const settings = here === "settings";
  let tabName = settings ? "Settings" : null;
  let item = null;
  for (const tab of state.tabs) {
    if (!tab.items && tab.path === here) tabName = tab.name;
    const found = tab.items?.find((i) => i.path === here);
    if (found && !tabName) [tabName, item] = [tab.name, found];
  }
  for (const li of tabsEl().querySelectorAll("[data-tab]")) {
    const tab = li.querySelector(".cn-tab");
    if (li.dataset.tab === tabName) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  const crumbs = top().querySelector("[data-crumbs]");
  if (!crumbs) return;
  const parts = [];
  if (tabName && tabName !== "Home") parts.push([tabName, null]);
  if (item) parts.push([item.name, href(item.path)]);
  else if (route.hidden || (route.path && !settings && tabName !== route.name)) parts.push([route.name, null]);
  if (settings) parts.push([settingsFor(state.user, on).find((s) => s.id === params?.section)?.name ?? "Account", null]);
  if (!parts.length) parts.push(["Home", null]);
  crumbs.replaceChildren(
    h("ol", null, parts.map(([name, link], i) => h("li", null, link && i < parts.length - 1 ? h("a", { href: link }, name) : h("span", { "aria-current": i === parts.length - 1 ? "page" : null }, name)))),
  );
}

/* ---------------------------------------------------------------- the phone sheet */

function openSheet() {
  const d = h("dialog", { class: "cn-sheet", "aria-label": "Orbe" });
  // The team you work in, first: on a phone the switcher lives here.
  const sheetTeams = h("div", { class: "cn-sheet-group cn-sheet-teams" }, h("p", { class: "cn-menu-group" }, "Team"));
  teamRows().then((rows) => (rows.length > 1 ? sheetTeams.append(...rows) : sheetTeams.append(...rows, row("people", "Team settings", null, { href: href("settings/team") }))));
  const close = () => d.close();
  d.append(
    h("div", { class: "cn-sheet-bar" }, lockup(), h("button", { class: "cn-iconbtn", type: "button", onclick: close, "aria-label": "Close" }, icon("close"))),
    h("button", { class: "cn-search cn-search--sheet", type: "button", onclick: () => { close(); openPalette(""); } }, icon("search"), h("span", { class: "cn-search-t" }, "Search anything")),
    sheetTeams,
    h("nav", { class: "cn-sheet-nav", "aria-label": "Orbe" },
      h("div", { class: "cn-sheet-main" }, state.tabs.filter((t) => !t.items).map((tab) => h("a", { class: "cn-sheet-link", href: href(tab.path) }, icon(tab.icon), h("span", null, tab.name)))),
      state.tabs.filter((t) => t.items).map((tab) => h("div", { class: "cn-sheet-group" }, h("p", { class: "cn-menu-group" }, tab.name), tab.items.map(toolLink))),
      h("div", { class: "cn-sheet-group" }, h("p", { class: "cn-menu-group" }, "Settings"), settingsFor(state.user, on).map((s) => row(s.icon, s.name, null, { href: href(`settings/${s.id}`) }))),
    ),
  );
  d.addEventListener("click", (e) => {
    if (e.target.closest("a") || e.target === d) close();
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}

/* ---------------------------------------------------------------- the command palette */

/** Everything the palette can open or do for this person, each with words to match on. */
export function commandsFor(user, tabs, sections, extra = [], tools = []) {
  const out = [];
  for (const tab of tabs) if (!tab.items) out.push({ group: "Go to", name: tab.name, line: "", href: href(tab.path), icon: tab.icon });
  for (const t of tools.length ? tools : tabs.flatMap((tab) => tab.items ?? []))
    if (t.status !== "off") out.push({ group: "Tools", name: t.name, line: t.line, href: t.status === "coming" ? siteHref(t.site ?? "products/") : href(t.path), external: t.status === "coming", tile: [t.glyph, t.k] });
  for (const s of sections) out.push({ group: "Settings", name: s.name, line: s.line, href: href(`settings/${s.id}`), icon: s.icon });
  out.push(...extra);
  return out;
}

/** The commands whose words contain every word typed, best first: name starts, then name contains, then the rest. */
export function matchCommands(commands, q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return commands;
  const scored = [];
  for (const c of commands) {
    const name = c.name.toLowerCase();
    const all = `${name} ${c.line.toLowerCase()} ${c.group.toLowerCase()}`;
    if (!words.every((w) => all.includes(w))) continue;
    scored.push([name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2, c]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, c]) => c);
}

let palette = null;
let worksCache = null;

/** The creator's works, once per visit, for the palette to find by title. */
async function paletteWorks() {
  if (state.user?.type !== "creator") return [];
  if (!worksCache) worksCache = api.get("/v1/me/works?limit=200").then((r) => r.works).catch(() => []);
  return worksCache;
}

function paletteExtras(q, works, waiting, teams) {
  const extra = [
    ...(waiting ? [{ group: "Actions", name: waiting === 1 ? "Decide a waiting request" : `Decide ${waiting} waiting requests`, line: "Approvals for your team", href: `${href("settings/team")}?tab=approvals`, icon: "check" }] : []),
    ...(teams?.teams ?? []).filter((t) => t.id !== teams.active.id).map((t) => ({ group: "Actions", name: `Switch to ${t.name}`, line: `${roleWord(t.role)} on this team`, run: () => switchTo(t.id), icon: "people" })),
    { group: "Actions", name: "Run a tool", line: "Rate a work, check an offer, find a sponsor", href: href("studio"), icon: "studio" },
    { group: "Actions", name: "Take the tour", line: "A short look around the console", run: () => import("./tour.js").then((m) => m.startTour(state.user, { force: true })), icon: "sparkle" },
    { group: "Actions", name: "Switch to Ink", line: "Dark theme", run: () => setTheme("dark"), icon: "moon" },
    { group: "Actions", name: "Switch to Paper", line: "Light theme", run: () => setTheme("light"), icon: "sun" },
    { group: "Actions", name: "Sign out", line: "End this session", run: () => state.signOut(), icon: "logout" },
  ].filter((x) => x.href !== href("studio") || state.screens.some((r) => r.path === "studio"));
  const handle = q.trim().match(/^@[\w.-]{2,}$/);
  if (handle && state.screens.some((r) => r.path === "rate")) extra.unshift({ group: "Rate", name: `Rate ${handle[0]}`, line: "A YouTube channel, against creators its size", href: `${href("rate")}?handle=${encodeURIComponent(handle[0])}`, icon: "chart" });
  if (q.trim().length >= 2) for (const w of works.slice(0, 200)) extra.push({ group: "Works", name: w.title, line: `${w.account.handle}, ${w.kind}`, href: `${href("library")}?work=${encodeURIComponent(w.id)}`, icon: "image" });
  return extra;
}

const ORDER = ["Rate", "Go to", "Tools", "Works", "Settings", "Actions"];

export async function openPalette(initial = "") {
  if (!state.user || palette) return;
  const sections = settingsFor(state.user, on);
  const input = h("input", { class: "cn-palette-input", type: "search", placeholder: "Search tools, works and settings, or type @handle", "aria-label": "Search Orbe", role: "combobox", "aria-expanded": "true", "aria-autocomplete": "list", autocomplete: "off" });
  const list = h("div", { class: "cn-palette-list", role: "listbox", id: nextId("pl"), "aria-label": "Results" });
  input.setAttribute("aria-controls", list.id);
  const foot = h("div", { class: "cn-palette-foot" }, h("span", null, h("kbd", { class: "cn-kbd" }, "↑"), h("kbd", { class: "cn-kbd" }, "↓"), " to move"), h("span", null, h("kbd", { class: "cn-kbd" }, "Enter"), " to open"), h("span", null, h("kbd", { class: "cn-kbd" }, "Esc"), " to close"));
  const d = h("dialog", { class: "cn-palette", "aria-label": "Search" }, h("div", { class: "cn-palette-box" }, icon("search"), input), list, foot);
  let shown = [];
  let at = 0;
  let works = [];
  let waiting = 0;
  let teams = null;
  const pick = (c) => {
    d.close();
    if (c.run) c.run();
    else if (c.external) window.open(c.href, "_blank", "noopener");
    else if (c.href) state.go(c.href);
  };
  const draw = () => {
    const all = matchCommands(commandsFor(state.user, state.tabs, sections, paletteExtras(input.value, works, waiting, teams), state.tools), input.value);
    const byGroup = ORDER.map((g) => [g, all.filter((c) => c.group === g).slice(0, g === "Works" ? 6 : 8)]).filter(([, cs]) => cs.length);
    shown = byGroup.flatMap(([, cs]) => cs);
    at = Math.min(at, Math.max(0, shown.length - 1));
    let i = 0;
    list.replaceChildren(
      ...(shown.length
        ? byGroup.map(([g, cs]) =>
            h("div", { class: "cn-palette-group", role: "group", "aria-label": g }, h("p", { class: "cn-menu-group" }, g),
              cs.map((c) => {
                const n = i++;
                return h("div", { class: "cn-option", role: "option", id: `${list.id}-${n}`, "aria-selected": String(n === at), onclick: () => pick(c), onmousemove: () => { if (at !== n) { at = n; mark(); } } },
                  c.tile ? tile(c.tile[0], c.tile[1], h, "s") : h("span", { class: "cn-item-ico" }, icon(c.icon ?? "arrowRight")),
                  h("span", { class: "cn-item-t" }, c.name),
                  h("span", { class: "cn-item-d" }, c.line || c.group),
                  h("span", { class: "cn-option-go", "aria-hidden": "true" }, icon(c.external ? "external" : "enter")),
                );
              }),
            ),
          )
        : [h("div", { class: "cn-menu-empty" }, h("span", { class: "cn-empty-ico" }, icon("search")), h("p", { class: "cn-item-t" }, "Nothing matches"), h("p", { class: "cn-item-d" }, "Try a tool's name, a work's title, a setting, or @handle."))]),
    );
    mark();
  };
  const mark = () => {
    list.querySelectorAll("[role=option]").forEach((o, n) => o.setAttribute("aria-selected", String(n === at)));
    if (shown.length) input.setAttribute("aria-activedescendant", `${list.id}-${at}`);
    else input.removeAttribute("aria-activedescendant");
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  };
  input.addEventListener("input", () => {
    at = 0;
    draw();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      at = (at + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
      mark();
    } else if (e.key === "Enter" && shown[at]) {
      e.preventDefault();
      pick(shown[at]);
    } else if (e.key === "Escape") {
      // A search field clears itself on the first Escape; here Escape always closes.
      e.preventDefault();
      d.close();
    }
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
  d.addEventListener("close", () => {
    d.remove();
    palette = null;
  });
  palette = d;
  document.body.append(d);
  d.showModal();
  input.value = typeof initial === "string" ? initial : "";
  draw();
  input.focus();
  [works, waiting, teams] = await Promise.all([paletteWorks(), approvalsWaiting(state.user).catch(() => 0), loadTeams()]);
  if (palette === d) draw();
}

document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable;
  if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (palette) palette.close();
    else openPalette();
  } else if (e.key === "/" && !typing && !palette) {
    e.preventDefault();
    openPalette();
  }
});
