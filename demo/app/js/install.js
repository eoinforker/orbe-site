/*
  The installed app, on the page's side. Only a build names its service
  worker (<meta name="orbe-sw">), so the source never registers one.

  - Registers the worker once the page has loaded, so it never competes with
    the first paint.
  - A new version waits until the person says so: a line at the foot of the
    window, "A new version of Orbe is ready", and the page reloads on Reload.
  - Offline, a line says so; the kept screens still open.
  - Keeps the browser's install offer for Settings, App and notifications,
    and says how to add Orbe on an iPhone or iPad, where there is no offer.
  - Passes the worker's news on as window events: "orbe:boot-changed" (the
    kept first call was out of date) and "orbe:open" (a notification was
    tapped while Orbe was open).
*/
import { h } from "./ui.js";

const url = document.querySelector('meta[name="orbe-sw"]')?.content ?? null;
const sw = "serviceWorker" in navigator ? navigator.serviceWorker : null;

/** True where this page can have a worker: a build, in a browser that has them. */
export const installable = Boolean(url && sw);

let offer = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  offer = e;
  window.dispatchEvent(new Event("orbe:install-changed"));
});
window.addEventListener("appinstalled", () => {
  offer = null;
  window.dispatchEvent(new Event("orbe:install-changed"));
});

const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const apple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Where this device stands: installed already, offered by the browser, an iPhone or iPad (added by hand), or neither. */
export function installState() {
  if (standalone()) return "installed";
  if (offer) return "offer";
  if (apple()) return "apple";
  return "none";
}

/** Shows the browser's own install offer; resolves true if the person accepted. */
export async function install() {
  if (!offer) return false;
  const e = offer;
  offer = null;
  e.prompt();
  const { outcome } = await e.userChoice;
  window.dispatchEvent(new Event("orbe:install-changed"));
  return outcome === "accepted";
}

let ready = null;
/** The worker's registration once it is active, or null where there is none. */
export const registration = () => ready ?? Promise.resolve(null);

/** Tell the worker the person signed out, so the first call it kept is no one's. */
export function signedOut() {
  sw?.controller?.postMessage({ type: "signed-out" });
}

function bar(text, ...more) {
  return h("div", { class: "cn-appline", role: "status" }, h("span", null, text), ...more);
}

let offlineLine = null;
function online() {
  if (navigator.onLine) {
    offlineLine?.remove();
    offlineLine = null;
  } else if (!offlineLine) {
    offlineLine = bar("You are offline. What you see was kept from your last visit.");
    document.body.append(offlineLine);
  }
}

let accepted = false;
function offerUpdate(waiting) {
  if (document.querySelector(".cn-appline--update")) return;
  const line = bar(
    "A new version of Orbe is ready.",
    h("button", {
      class: "cn-appline-b",
      type: "button",
      onclick: () => {
        accepted = true;
        line.remove();
        waiting.postMessage({ type: "skip-waiting" });
      },
    }, "Reload"),
  );
  line.classList.add("cn-appline--update");
  document.body.append(line);
}

if (installable) {
  window.addEventListener("online", online);
  window.addEventListener("offline", online);
  if (!navigator.onLine) online();
  sw.addEventListener("controllerchange", () => {
    // The first install takes over quietly; only a version the person accepted reloads the page.
    if (accepted) location.reload();
  });
  sw.addEventListener("message", (e) => {
    const t = e.data?.type;
    if (t === "boot-changed") window.dispatchEvent(new Event("orbe:boot-changed"));
    else if (t === "open" && typeof e.data.url === "string") window.dispatchEvent(new CustomEvent("orbe:open", { detail: e.data.url }));
  });
  const start = async () => {
    const reg = await sw.register(url, { scope: "/orbe-site/demo/app/" }).catch(() => null);
    if (!reg) return null;
    const watch = (w) => w?.addEventListener("statechange", () => w.state === "installed" && sw.controller && offerUpdate(w));
    if (reg.waiting && sw.controller) offerUpdate(reg.waiting);
    reg.addEventListener("updatefound", () => watch(reg.installing));
    return sw.ready;
  };
  ready = new Promise((resolve) => {
    const go = () => start().then(resolve, () => resolve(null));
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  });
}
