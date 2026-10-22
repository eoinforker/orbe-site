/*
  The app shell: who is signed in, the console's frame for a creator or a
  brand (shell.js), and routing in the browser under /app. Each screen is a
  module with render(main, ctx); ctx carries the user, the path's
  parameters, the query and go() to move elsewhere.
*/
import { api, boot as bootCall, bundle, can, features, signInWays } from "./api.js";
import { failure, h, loading, toast } from "./ui.js";
import { forgetNotifications } from "./notify.js";
import { ADMIN, BASE, BRAND, CREATOR, match, screensFor } from "./routes.js";
import { drawFrame, markHere } from "./shell.js";
import { signedOut } from "./install.js";

const main = document.getElementById("main");
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

export function go(path, opts = {}) {
  history[opts.replace ? "replaceState" : "pushState"](null, "", path);
  window.scrollTo(0, 0);
  render();
}

document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[href]");
  if (!a || a.target || a.hasAttribute("download") || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !(u.pathname === BASE || u.pathname.startsWith(`${BASE}/`))) return;
  e.preventDefault();
  go(u.pathname + u.search + u.hash);
});
window.addEventListener("popstate", () => render());
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
window.addEventListener("orbe:signed-out", () => {
  if (!user) return;
  user = null;
  render();
});

async function signOut() {
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
    const w = await api.get("/v1/me/welcome").then((r) => r.welcome, () => null);
    if (n !== seq) return;
    if (w?.due && rest() !== "welcome" && rest() !== "podcasts/confirm") {
      go(`${BASE}/welcome`, { replace: true });
      return;
    }
  }
  const table = screensFor(user, [...features]);
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
    main.replaceChildren(
      h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, role ? "Not part of your role" : off ? "Not available yet" : other ? "This is for the other side of Orbe" : "Nothing here"),
      h("p", { class: "ap-lede" }, role ? `As ${/^[aeiou]/.test(role) ? "an" : "a"} ${role} on ${user.team?.name ?? "this team"}, you do not see this. The owner can change your role in Settings, Team.` : off ? "This part of Orbe is switched off for now." : other ? `You are signed in as a ${user.type === "creator" ? "creator" : "brand"}. Sign out and back in with the other kind of account to open it.` : "That page is not part of the app."),
      table.length ? h("p", null, h("a", { class: "ob-lnk", href: `${BASE}/` }, "Go to the start")) : null,
    );
    settle();
    return;
  }
  if (user.type === "buyer" && found.route.brand && features.has("sponsorships")) {
    loading(main);
    try {
      if (!(await isBrand())) found = { route: BRAND.find((r) => r.path === "profile"), params: {}, setup: true };
    } catch (e) {
      main.replaceChildren(failure(e, () => render()));
      return;
    }
  }
  // An older path for a screen that has moved: the same screen, with the address bar saying where it lives now.
  if (found.moved !== null && found.moved !== undefined) history.replaceState(history.state, "", `${BASE}/${found.moved}${location.search}${location.hash}`);
  document.title = `${found.route.name}: Orbe`;
  markHere(found.route, found.params);
  // An invitation is a full page like the walkthrough, so it takes that layout before it draws.
  document.body.dataset.screen = found.route.path === "invite" ? "welcome" : found.route.path || "home";
  loading(main);
  try {
    // The screen's code and its first reads (one request, or none if the boot brought them) at the same time.
    const [m] = await Promise.all([import(found.route.module), bundle(rest() || "home")]);
    if (n !== seq) return;
    main.removeAttribute("aria-busy");
    main.replaceChildren();
    main.classList.remove("is-entering");
    void main.offsetWidth;
    main.classList.add("is-entering");
    await m.render(main, { ...ctx, params: found.params, setup: found.setup === true });
    if (found.route.path === "" && !tourLooked && n === seq) {
      tourLooked = true;
      const w = await api.get("/v1/me/welcome").then((r) => r.welcome, () => null);
      if (w?.tourDue && n === seq) (await import("./tour.js")).startTour(user);
    }
  } catch (e) {
    if (n !== seq) return;
    main.removeAttribute("aria-busy");
    main.replaceChildren(failure(e, () => render()));
  }
  settle();
}

/** After a navigation, focus moves to the new screen's title; not on the first load. */
function settle() {
  if (first) {
    first = false;
    return;
  }
  main.querySelector("[data-title]")?.focus({ preventScroll: true });
}

/* On a demo server, a line at the very top on every screen: nothing here is real. */
function demoBanner() {
  if (!signInWays().demo || document.querySelector(".cn-demo")) return;
  document.body.prepend(h("p", { class: "cn-demo", role: "note" }, h("b", null, "Demo"), " Everything here is made up: no real creator, brand, figure or payment."));
}

/* The side this browser last opened (a convenience only), so the screen's code can come while the boot is asked. */
const SIDE = "orbe.side";
function fetchScreenEarly() {
  try {
    const side = localStorage.getItem(SIDE);
    const found = side ? match(side === "buyer" ? BRAND : CREATOR, rest()) : null;
    if (found) import(found.route.module).catch(() => {});
  } catch {
    // Nothing remembered: the screen's code comes after the boot, as before.
  }
}

async function boot() {
  loading(main, "Loading your Orbe.");
  fetchScreenEarly();
  try {
    // One call: who is signed in, the frame's reads, and the first screen's own reads.
    user = await bootCall(rest() || "home");
  } catch (e) {
    main.replaceChildren(failure(e, boot));
    return;
  }
  try {
    if (user) localStorage.setItem(SIDE, user.type);
  } catch {
    // Not remembered: next time the code comes after the boot.
  }
  demoBanner();
  bootAt = Date.now();
  render();
}

boot();
