/*
  The app shell: who is signed in, the console's frame for a creator or a
  brand (shell.js), and routing in the browser under /app. Each screen is a
  module with render(main, ctx); ctx carries the user, the path's
  parameters, the query and go() to move elsewhere.
*/
import { api, boot as bootCall, bundle, can, features, seg, signInWays } from "./api.js";
import { failure, h, loading, toast } from "./ui.js";
import { forgetNotifications } from "./notify.js";
import { ADMIN, BASE, BRAND, CREATOR, match, screensFor } from "./routes.js";
import { drawFrame, markHere } from "./shell.js";
import { signedOut } from "./install.js";

let main = document.getElementById("main");
let framed = null;

let user = null;
let brandReady = null;
let seq = 0;
let first = true;
/* The walkthrough is looked up once a visit; the tour once per finished walkthrough. */
let welcomeLooked = false;
let tourLooked = false;
window.addEventListener("orbe:welcome-done", () => (tourLooked = false));

const rest = () => {
  const p = location.pathname;
  return p === BASE || p.startsWith(`${BASE}/`) ? p.slice(BASE.length).replace(/^\/+|\/+$/g, "") : "";
};

/* A new screen opens at the top; going back or forward leaves the scroll where the browser puts it. */
let toTop = false;

export function go(path, opts = {}) {
  const before = location.href;
  history[opts.replace ? "replaceState" : "pushState"](null, "", path);
  if (tabOnly(before)) return;
  toTop = true;
  render();
}

/*
  A thing's tabs live in its address (?tab=, ui.js tabs). When only the tab
  changed (Back or Forward between tabs, or a link to another tab of the same
  work), the tabs answer it themselves and the screen is not drawn again.
*/
function tabOnly(before) {
  const a = new URL(before);
  const b = new URL(location.href);
  if (a.pathname !== b.pathname) return false;
  a.searchParams.delete("tab");
  b.searchParams.delete("tab");
  if (a.search !== b.search) return false;
  const set = main.querySelector("[data-address-tabs]");
  if (!set) return false;
  set.dispatchEvent(new Event("orbe:address"));
  return true;
}
/* The address the screen on show was drawn for, so Back between its tabs is told apart from Back to another screen. */
let shown = location.href;

const inApp = (a) => {
  if (!a || a.target || a.hasAttribute("download")) return null;
  const u = new URL(a.href, location.href);
  return u.origin === location.origin && (u.pathname === BASE || u.pathname.startsWith(`${BASE}/`)) ? u : null;
};

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const u = inApp(e.target.closest?.("a[href]"));
  if (!u) return;
  e.preventDefault();
  go(u.pathname + u.search + u.hash);
});

/*
  A screen's code and first reads are asked for the moment a pointer comes to
  rest on a link to it, a finger lands on one, or the keyboard reaches it, so
  the click usually finds everything waiting. Reads a screen makes that the
  boot does not bundle are named here by route.
*/
let table = [];
const WARM = {
  "works/:id": (p) => [`/v1/me/works/${seg(p.id)}/full`],
};
const screenOf = (path) => (path === BASE ? "" : path.slice(BASE.length).replace(/^\/+|\/+$/g, ""));
function warm(found, screen) {
  import(found.route.module).catch(() => {});
  bundle(screen || "home").catch(() => {});
  for (const path of WARM[found.route.path]?.(found.params) ?? []) api.warm(path).catch(() => {});
}
let rested = 0;
function warmLink(e) {
  if (!user) return;
  // A table row opens through the link laid under its cells.
  const a = e.target.closest?.("a[href]") ?? e.target.closest?.(".cn-vt-tr")?.querySelector(":scope > a[href]");
  const u = inApp(a);
  if (!u) return;
  const screen = screenOf(u.pathname);
  const found = match(table, screen);
  if (!found) return;
  clearTimeout(rested);
  // A pointer passing over on its way elsewhere asks for nothing; one that stays for a moment is about to click.
  if (e.type === "pointerover" && e.pointerType === "mouse") rested = setTimeout(() => warm(found, screen), 60);
  else warm(found, screen);
}
document.addEventListener("pointerover", warmLink, { passive: true });
document.addEventListener("pointerout", () => clearTimeout(rested), { passive: true });
document.addEventListener("touchstart", warmLink, { passive: true });
document.addEventListener("focusin", warmLink);
window.addEventListener("popstate", () => {
  const was = shown;
  shown = location.href;
  if (!tabOnly(was)) render();
});
// A manager's request that needs the owner: wherever it was made, say so once, with the way to it.
window.addEventListener("orbe:sent-to-owner", () => {
  forgetNotifications();
  window.dispatchEvent(new Event("orbe:notes-changed"));
  toast("Sent to the owner to approve. Nothing has happened yet.", { href: `${BASE}/settings/team?tab=approvals`, label: "See the request" });
});
// The installed app opened from its kept first call, and the server's answer differed: read it in, and draw
// the screen again if the person has not started on it yet.
// Once a visit: a second read of the boot is itself checked behind, and must not start a loop.
let bootAt = 0;
let reread = false;
window.addEventListener("orbe:boot-changed", async () => {
  if (!user || reread) return;
  reread = true;
  try {
    user = await bootCall(rest() || "home");
  } catch {
    return;
  }
  const busy = main.contains(document.activeElement) && document.activeElement !== main;
  if (!user || (Date.now() - bootAt < 10_000 && !busy)) render();
});
// A notification tapped while Orbe is open.
window.addEventListener("orbe:open", (e) => {
  const u = new URL(e.detail, location.href);
  if (u.origin === location.origin && (u.pathname === BASE || u.pathname.startsWith(`${BASE}/`))) go(u.pathname + u.search);
});
/*
  One team per page. The session works in one team for every tab of this
  browser, so when it moves (a switch in another tab, or Back bringing up a
  page kept from before a switch), this page starts again in the team the
  server now acts for, and says so once. The server refuses any call made
  for the old team (409 team_changed), so nothing is read or done meanwhile.
*/
const MOVED = "orbe.team-moved";
let restarting = false;
function teamMoved() {
  if (restarting) return;
  restarting = true;
  keepFrame(null);
  try {
    sessionStorage.setItem(MOVED, "1");
  } catch {
    // Not said afterwards; the page still starts again in the right team.
  }
  location.reload();
}
let switching = false;
window.addEventListener("orbe:switching", (e) => (switching = e.detail === true));
window.addEventListener("orbe:team-changed", () => switching || teamMoved());
window.addEventListener("pageshow", async (e) => {
  if (!e.persisted || !user) return;
  try {
    const s = await (await fetch("/v1/auth/session", { credentials: "same-origin", headers: { accept: "application/json" } })).json();
    if ((s?.team?.id ?? null) !== (user.team?.id ?? null) || (s?.user?.id ?? null) !== (user.person ?? user).id) teamMoved();
  } catch {
    // Offline: the next call to the server says if the team moved.
  }
});
try {
  new BroadcastChannel("orbe-team").addEventListener("message", (e) => {
    // This page's own switch reaches its own channel too; it is already on its way to the team.
    if (user && !switching && e.data?.team && e.data.team !== user.team?.id) teamMoved();
  });
} catch {
  // No channel between tabs here: the server's refusal still catches it.
}
window.addEventListener("orbe:signed-out", () => {
  keepFrame(null);
  if (!user) return;
  user = null;
  render();
});

async function signOut() {
  keepFrame(null);
  try {
    await api.post("/v1/auth/logout");
  } catch {
    // Signed out already, or the session had lapsed: either way, start again.
  }
  user = null;
  brandReady = null;
  go(`${BASE}/signin`);
}

/** A buyer becomes a brand by filling in the brand profile; until then every brand screen asks for it. */
async function isBrand() {
  if (brandReady !== null) return brandReady;
  try {
    await api.get("/v1/brand/profile");
    brandReady = true;
  } catch (e) {
    if (e.code === "not_a_brand") brandReady = false;
    else throw e;
  }
  return brandReady;
}

async function render() {
  const n = ++seq;
  shown = location.href;
  const query = new URLSearchParams(location.search);
  const ctx = { user, params: {}, query, go, refresh: () => render(), brandSaved: () => (brandReady = true) };
  if (!user) {
    framed = null;
    // Whoever signs in next must not open on the last person's kept first call.
    signedOut();
    await drawFrame(null, [], { go, signOut });
    document.title = "Sign in: Orbe";
    document.body.dataset.screen = "signin";
    const m = await import("./signin.js");
    if (n !== seq) return;
    main.replaceChildren();
    m.render(main, { ...ctx, ways: signInWays() });
    settle();
    return;
  }
  // Signed in, the sign-in page is the start.
  if (rest() === "signin") {
    go(`${BASE}/${location.search}`, { replace: true });
    return;
  }
  // A new person meets the walkthrough first, wherever they arrive (a platform's sign-in returns here too),
  // unless they came to join a team or are working in someone else's: that team's set-up is not theirs.
  if (rest() === "invite" || (user.team && user.team.role !== "owner")) welcomeLooked = true;
  if (!welcomeLooked) {
    welcomeLooked = true;
    // Someone already on another team has used Orbe: their own account's set-up waits on Home as a card, never in the way.
    const [w, teams] = await Promise.all([api.get("/v1/me/welcome").then((r) => r.welcome, () => null), api.get("/v1/teams").then((r) => r.teams, () => [])]);
    if (n !== seq) return;
    if (w?.due && teams.length < 2 && rest() !== "welcome" && rest() !== "podcasts/confirm") {
      go(`${BASE}/welcome`, { replace: true });
      return;
    }
  }
  table = screensFor(user, [...features]);
  if (framed !== user) {
    framed = user;
    await drawFrame(user, table, { go, signOut });
  }
  let found = match(table, rest());
  // A side whose start screen is switched off starts at its first screen that is on.
  const first = table.find((r) => !r.hidden && r.path !== "");
  if (!found && rest() === "" && first) {
    go(`${BASE}/${first.path}`, { replace: true });
    return;
  }
  if (!found) {
    const own = user.type === "creator" ? CREATOR : BRAND;
    const off = match([...own, ...((user.roles ?? []).includes("admin") ? ADMIN : [])], rest());
    const other = off ? null : match(user.type === "creator" ? BRAND : CREATOR, rest());
    // A screen the person's role on this team does not include says so, rather than that it is switched off.
    const role = off?.route.needs && !can(off.route.needs) ? user.team?.role ?? null : null;
    document.title = "Not here: Orbe";
    markHere(off?.route ?? { path: rest(), name: "Not here", hidden: true }, off?.params);
    main.replaceChildren(
      h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, role ? "Not part of your role" : off ? "Not available yet" : other ? "This is for the other side of Orbe" : "Nothing here"),
      h("p", { class: "ap-lede" }, role ? `As ${/^[aeiou]/.test(role) ? "an" : "a"} ${role} on ${user.team?.name ?? "this team"}, you do not see this. The owner can change your role in Settings, Team.` : off ? "This part of Orbe is switched off for now." : other ? `You are signed in as a ${user.type === "creator" ? "creator" : "brand"}. Sign out and back in with the other kind of account to open it.` : "That page is not part of the app."),
      table.length ? h("p", null, h("a", { class: "ob-lnk", href: `${BASE}/` }, "Go to Home")) : null,
    );
    settle();
    return;
  }
  if (user.type === "buyer" && found.route.brand && features.has("sponsorships")) {
    loading(main);
    try {
      const brand = await isBrand();
      if (n !== seq) return;
      // An agency works from its roster: Home is the Roster, and a brand's own screens say what they are for.
      if (!brand && user.team?.kind === "agency") {
        if (table.some((r) => r.path === "roster")) {
          // A brand's own screen (Intelligence, Campaigns) typed in: the Roster, saying once why.
          if (found.route.path !== "") toast(`${found.route.name} is for brands buying sponsorships. Your creators and their deals are in the Roster.`);
          go(`${BASE}/roster`, { replace: true });
          return;
        }
        document.title = `${found.route.name}: Orbe`;
        markHere(found.route, found.params);
        main.replaceChildren(
          h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, found.route.name),
          h("p", { class: "ap-lede" }, `This part of Orbe is for brands buying sponsorships. ${user.team.name} is an agency: your creators and their deals are in the Roster.`),
          h("p", null, h("a", { class: "ob-lnk", href: `${BASE}/roster` }, "Go to the Roster")),
        );
        settle();
        return;
      }
      if (!brand) found = { route: BRAND.find((r) => r.path === "profile"), params: {}, setup: true };
    } catch (e) {
      main.removeAttribute("aria-busy");
      main.replaceChildren(failure(e, () => render()));
      return;
    }
  }
  // An older path for a screen that has moved: the same screen, with the address bar saying where it lives now.
  if (found.moved !== null && found.moved !== undefined) history.replaceState(history.state, "", `${BASE}/${found.moved}${location.search}${location.hash}`);
  document.title = `${found.route.name}: Orbe`;
  markHere(found.route, found.params);
  // An invitation is a full page like the walkthrough, so it takes that layout; set at the swap, so the screen being left keeps its own.
  const layout = found.route.path === "invite" ? "welcome" : found.route.path || "home";
  // The screen being left stays in place while the next one's code and reads arrive; only a wait long enough to notice shows the next one's head and shape.
  main.setAttribute("aria-busy", "true");
  const slow = setTimeout(() => n === seq && waiting(found.route, layout), 150);
  try {
    // The screen's code and its first reads (one request, or none if the boot brought them, or a pointer on the link already asked) at the same time.
    const [m] = await Promise.all([import(found.route.module), bundle(rest() || "home"), ...(WARM[found.route.path]?.(found.params) ?? []).map((p) => api.warm(p).catch(() => {}))]);
    clearTimeout(slow);
    if (n !== seq) return;
    await swap(() => m.render(main, { ...ctx, params: found.params, setup: found.setup === true }), layout);
    if (found.route.path === "" && !tourLooked && n === seq) {
      tourLooked = true;
      const w = await api.get("/v1/me/welcome").then((r) => r.welcome, () => null);
      if (w?.tourDue && n === seq) (await import("./tour.js")).startTour(user);
    }
  } catch (e) {
    clearTimeout(slow);
    if (n !== seq) return;
    document.body.dataset.screen = layout;
    main.removeAttribute("aria-busy");
    // The screen keeps its name over what went wrong, so the page still says where it is.
    main.replaceChildren(h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, found.route.name), failure(e, () => render()));
  }
  settle();
}

/*
  A wait long enough to notice: the next screen's name at once, as its head
  will say it, with quiet shapes where its body will be, laid out the way
  that screen lays out (the Library's list beside its side, a work's figure
  and chart above its tabs), so nothing jumps when it arrives.
*/
const bars = (n) => h("span", { class: "cn-skel", "aria-hidden": "true" }, Array.from({ length: n }, () => h("span", { class: "cn-skel-line" })));
const quiet = (cls) => h("span", { class: `cn-skel-q ${cls}`, "aria-hidden": "true" });
/** A working screen's head as toolShell draws it (its tile, name and line), with its body's shape under it. */
const toolPage = (body) => (name) =>
  h("div", { class: "cn-tp cn-ts" },
    h("header", { class: "cn-tp-head cn-ph" }, quiet("cn-skel-q--tile"), h("div", { class: "cn-tp-names" }, h("h1", { class: "cn-tp-title ap-h1", tabindex: "-1", "data-title": "" }, name), quiet("cn-skel-q--line"))),
    h("div", { class: "cn-ts-work cn-skel", "aria-hidden": "true" }, body()),
  );
const SHAPES = {
  library: (name) =>
    h("div", { class: "cn-lib cn-lib--wait" },
      h("nav", { class: "cn-lib-side", "aria-hidden": "true" }, bars(6)),
      h("section", { class: "cn-lib-main" },
        h("header", { class: "cn-lib-head" }, h("div", null, h("h1", { class: "cn-lib-title", tabindex: "-1", "data-title": "" }, name), quiet("cn-skel-q--count")), h("span", { class: "cn-grow" }), quiet("cn-skel-q--tools")),
        h("div", { class: "cn-vt cn-vt--skel", "aria-hidden": "true" }, h("div", { class: "cn-vt-head" }), Array.from({ length: 8 }, () => h("div", { class: "cn-vt-tr" }, h("span", { class: "cn-vt-skel" })))),
      ),
    ),
  deals: toolPage(() => [h("div", { class: "cn-skel-q--stats" }, [0, 1, 2, 3].map(() => quiet("cn-skel-q--stat"))), quiet("cn-skel-q--tabs"), quiet("cn-skel-q--panel")]),
  record: toolPage(() => [quiet("cn-skel-q--tabs"), quiet("cn-skel-q--panel")]),
  explore: (name) => [
    h("header", { class: "cn-pagehead cn-pagehead--s" }, h("div", null, h("h1", { class: "cn-h1", tabindex: "-1", "data-title": "" }, name), quiet("cn-skel-q--line"))),
    h("div", { class: "cn-skel", "aria-hidden": "true" },
      h("div", { class: "cn-explore-bar" }, quiet("cn-skel-q--search")),
      h("div", { class: "cn-toolrows" }, Array.from({ length: 6 }, () => quiet("cn-skel-q--toolrow"))),
    ),
  ],
  "works/:id": (name) => [
    h("div", { class: "cn-tp cn-ts" }, h("header", { class: "cn-tp-head cn-ph" }, h("div", { class: "cn-tp-names" }, h("h1", { class: "cn-tp-title ap-h1", tabindex: "-1", "data-title": "" }, name)))),
    h("div", { class: "cn-skel-hero", "aria-hidden": "true" }, h("span", { class: "cn-skel-box" }), h("span", { class: "cn-skel-box" })),
    bars(4),
  ],
};
function waiting(route, layout, who = user) {
  document.body.dataset.screen = layout;
  main.setAttribute("aria-busy", "true");
  const shape = route.path === "" && who?.type === "creator" ? () => homeShape(who) : SHAPES[route.path];
  main.replaceChildren(
    h("p", { class: "ob-sr", role: "status" }, `Loading ${route.name}.`),
    ...[(shape ?? ((name) => [h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, name), h("div", { class: "cn-loading" }, bars(4))]))(route.name)].flat(),
  );
}

/** A creator's Home before its reads: the greeting as Home will say it, the composer's box and, on a wide screen, the quick starts' row. */
function homeShape(who) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = ((who.person ?? who).displayName ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim().split(/\s+/)[0] || "";
  return h("div", { class: "cn-home cn-home--top" },
    h("h1", { class: "cn-home-hi", tabindex: "-1", "data-title": "" }, first ? `${part}, ${first}.` : `${part}.`),
    h("div", { class: "cn-composer cn-skel cn-skel-composer", "aria-hidden": "true" }),
    matchMedia("(max-width: 899px)").matches ? null : h("div", { class: "cn-quick", "aria-hidden": "true" }, [0, 1, 2].map(() => quiet("cn-skel-q--quick"))),
  );
}

/*
  The old screen gives way to the new one in a short cross-fade where the
  browser has view transitions (only the working area moves; the frame stays
  still), and in a quick rise where it does not. Nothing moves under reduced
  motion. The new screen is drawn before the picture is taken, but a screen
  still reading is not waited on for long.
*/
const still = matchMedia("(prefers-reduced-motion: reduce)");
async function swap(draw, layout) {
  const put = () => {
    // Each screen gets a fresh working area: screens differ in width, and a new box is not a shift of the old one.
    const fresh = main.cloneNode(false);
    fresh.removeAttribute("aria-busy");
    fresh.classList.remove("is-entering");
    main.replaceWith(fresh);
    main = fresh;
    document.body.dataset.screen = layout;
    if (toTop) window.scrollTo(0, 0);
    toTop = false;
    return draw();
  };
  if (still.matches || first || !document.startViewTransition) {
    const done = put();
    if (!still.matches && !first) {
      main.classList.remove("is-entering");
      void main.offsetWidth;
      main.classList.add("is-entering");
    }
    return done;
  }
  let done;
  const vt = document.startViewTransition(() => {
    done = put();
    return Promise.race([done, new Promise((r) => setTimeout(r, 80))]);
  });
  vt.ready.catch(() => {});
  await vt.updateCallbackDone;
  return done;
}

/**
  After a navigation, focus moves to the new screen's title, or to what the
  screen marks as its answer (data-focus-first, as Runs marks a run asked
  from Home); not on the first load. Nothing is still loading.
*/
function settle() {
  main.removeAttribute("aria-busy");
  if (first) {
    first = false;
    return;
  }
  (main.querySelector("[data-focus-first]") ?? main.querySelector("[data-title]"))?.focus({ preventScroll: true });
}

/* On a demo server, or with the seed's sample data, a line at the very top on every screen: nothing here is real. */
function demoBanner() {
  const ways = signInWays();
  if (!(ways.demo || ways.sample) || document.querySelector(".cn-demo")) return;
  document.body.prepend(h("p", { class: "cn-demo", role: "note" }, h("b", null, ways.demo ? "Demo" : "Sample"), " Everything here is made up: no real creator, brand, figure or payment."));
}

/*
  What this browser last drew (a convenience only): the side, and the frame
  itself (who, which team and role, which features), so on a returning
  device the top bar, the tabs and the screen's shape are drawn at once from
  it, with no request, while the boot is asked over however slow a link. The
  boot's answer then draws the real frame in the same place. Never kept
  across a sign-out or a team switch, so a page never opens on a team it is
  not working in. A browser with nothing remembered shows a quiet loading
  line until the screen is known.
*/
const SIDE = "orbe.side";
const FRAME = "orbe.frame";
const keepFrame = (u) => {
  try {
    if (!u) return localStorage.removeItem(FRAME);
    const { type, id, displayName, email, roles, person, team } = u;
    localStorage.setItem(FRAME, JSON.stringify({ user: { type, id, displayName, email, roles, person, team }, features: [...features] }));
  } catch {
    // Not kept: the next open waits for the boot to draw its frame.
  }
};
window.addEventListener("orbe:switching", (e) => e.detail === true && keepFrame(null));
function fetchScreenEarly() {
  let found = null;
  let hint = null;
  try {
    const side = localStorage.getItem(SIDE);
    hint = side ? JSON.parse(localStorage.getItem(FRAME) ?? "null") : null;
    if (hint?.user?.type !== (side === "buyer" ? "buyer" : "creator")) hint = null;
    found = side ? match(hint ? screensFor(hint.user, hint.features) : side === "buyer" ? BRAND : CREATOR, rest()) : null;
  } catch {
    // Nothing remembered: the screen's code comes after the boot, as before.
  }
  if (found) import(found.route.module).catch(() => {});
  const full = ["welcome", "invite", "signin"].includes(found?.route.path ?? rest());
  if (hint && found && !full) {
    const screens = screensFor(hint.user, hint.features);
    drawFrame(hint.user, screens, { go, signOut, provisional: true });
    markHere(found.route, found.params);
    waiting(found.route, found.route.path || "home", hint.user);
  } else if (found && found.route.path && !full) waiting(found.route, found.route.path);
  else loading(main, "Loading your Orbe.");
}

async function boot() {
  fetchScreenEarly();
  try {
    // One call: who is signed in, the frame's reads, and the first screen's own reads.
    user = await bootCall(rest() || "home");
  } catch (e) {
    main.removeAttribute("aria-busy");
    main.replaceChildren(failure(e, boot));
    return;
  }
  try {
    if (user) localStorage.setItem(SIDE, user.type);
  } catch {
    // Not remembered: next time the code comes after the boot.
  }
  keepFrame(user);
  demoBanner();
  bootAt = Date.now();
  render();
  try {
    if (sessionStorage.getItem(MOVED) && user?.team) toast(`This page was open on another team. You are now working in ${user.team.name}.`);
    sessionStorage.removeItem(MOVED);
  } catch {
    // Nothing to say.
  }
}

boot();
