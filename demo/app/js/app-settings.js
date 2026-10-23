/*
  Settings, App and notifications: installing Orbe on this device, and the
  four moments it may tell this person about (GET /v1/me/push). Each person
  chooses for themselves; the switch for this device subscribes it with the
  browser's push service, and the list shows every device they have added.
*/
import { api, currentTeam, seg } from "./api.js";
import { emptyState, section } from "./console-ui.js";
import { install, installable, installState, registration } from "./install.js";
import { action, actions, block, day, failure, h, toast } from "./ui.js";

const ROLE_WORDS = { owner: "owners", manager: "managers", editor: "editors" };
const forRoles = (roles) => {
  const w = roles.map((r) => ROLE_WORDS[r] ?? r);
  const said = w.length > 1 ? `${w.slice(0, -1).join(", ")} and ${w.at(-1)}` : w[0];
  return `For ${said} on a team.`;
};

const key = (b64u) => {
  const s = atob(b64u.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** A switch that moves on the press; change answers false when the save failed, and the switch goes back. */
const toggle = (label, on, change) => {
  const b = h("button", { class: "cn-toggle", type: "button", role: "switch", "aria-checked": String(on), "aria-label": label }, h("span", { class: "cn-toggle-sw", "aria-hidden": "true" }));
  let busy = false;
  b.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    const next = b.getAttribute("aria-checked") !== "true";
    b.setAttribute("aria-checked", String(next));
    b.setAttribute("aria-busy", "true");
    try {
      if ((await change(next)) === false) b.setAttribute("aria-checked", String(!next));
    } finally {
      busy = false;
      b.removeAttribute("aria-busy");
    }
  });
  return b;
};

function installCard() {
  const box = h("div");
  const draw = () => {
    const s = installState();
    box.replaceChildren(
      s === "installed"
        ? h("p", null, "Orbe is installed on this device. It opens from your home screen or dock, straight to your console.")
        : s === "offer"
          ? h("div", { class: "ap-stack" },
              h("p", null, "Open Orbe like an app: from your home screen or dock, in its own window, quick even on a slow connection."),
              actions(action("Install Orbe", async () => ((await install()) ? "Installing Orbe." : null), { primary: true })))
          : s === "apple"
            ? h("div", { class: "ap-stack" },
                h("p", null, "On an iPhone or iPad, add Orbe from Safari:"),
                h("ol", { class: "cn-steps" }, h("li", null, "Tap Share, the square with an arrow."), h("li", null, "Choose Add to Home Screen, then Add.")),
                h("p", { class: "cn-item-d" }, "Notifications come to Orbe once it is on your Home Screen."))
            : h("p", null, "This browser does not offer to install Orbe. Chrome and Edge do, and Safari on an iPhone or iPad from Add to Home Screen."),
    );
  };
  draw();
  window.addEventListener("orbe:install-changed", () => box.isConnected && draw());
  return section({ title: "Install Orbe", line: "The console as an app on this device." }, box);
}

/** This device's push subscription, if it has one. */
async function current() {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function turnOn(state, device) {
  const reg = await registration();
  if (!reg) throw new Error("Orbe is still getting ready on this device. Try again in a moment.");
  const asked = await Notification.requestPermission();
  if (asked !== "granted") throw new Error("Notifications are blocked for Orbe in this browser's settings. Allow them there, then try again.");
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(state.publicKey) }));
  const j = sub.toJSON();
  await api.post("/v1/me/push/subscriptions", { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth }, device });
}

async function turnOff() {
  const sub = await current();
  if (!sub) return;
  await api.post("/v1/me/push/unsubscribe", { endpoint: sub.endpoint });
  await sub.unsubscribe().catch(() => {});
}

function notificationsBody(state, sub, device, redraw) {
  if (!state.available) return [emptyState("bell", "Notifications are not set up on this server yet.")];
  const here = sub ? state.devices.find((d) => sub.endpoint.endsWith(d.endpointEnd)) : null;
  const apple = installState() === "apple";
  // On an iPhone or iPad only the app added to the Home Screen may show notifications.
  const supported = installable && !apple && "PushManager" in window && "Notification" in window;
  const said = h("div");
  const thisDevice = supported
    ? h("ul", { class: "cn-rules" },
        h("li", { class: "cn-rule" },
          h("div", { class: "cn-person-main" }, h("p", { class: "cn-item-t" }, "On this device"), h("p", { class: "cn-item-d" }, here ? `${here.device}: on since ${day(here.createdAt)}.` : "Off. Turn it on to hear about the moments below here.")),
          toggle("Notifications on this device", Boolean(here), async (on) => {
            said.replaceChildren();
            try {
              if (on) await turnOn(state, device);
              else await turnOff();
              toast(on ? "Notifications are on for this device." : "Notifications are off for this device.");
              redraw();
            } catch (e) {
              said.replaceChildren(failure(e));
              return false;
            }
          }),
        ))
    : h("p", null, !installable && "serviceWorker" in navigator ? "Notifications come with Orbe's published app, not this development copy." : apple ? "Add Orbe to your Home Screen first (see Install Orbe above); notifications come to the installed app." : "This browser cannot show Orbe's notifications.");

  const names = state.names;
  const moments = h("ul", { class: "cn-rules" },
    Object.keys(names).map((m) =>
      h("li", { class: "cn-rule" },
        h("div", { class: "cn-person-main" }, h("p", { class: "cn-item-t" }, names[m]), h("p", { class: "cn-item-d" }, forRoles(state.roles[m]))),
        toggle(names[m], state.moments[m], async (on) => {
          said.replaceChildren();
          try {
            await api.put("/v1/me/push/moments", { [m]: on });
            redraw();
          } catch (e) {
            said.replaceChildren(failure(e));
            return false;
          }
        }),
      ),
    ),
  );

  const devices = state.devices.length
    ? h("ul", { class: "cn-list" }, state.devices.map((d) =>
        h("li", { class: "cn-device" },
          h("div", null, h("p", { class: "cn-item-t" }, d.device, d === here ? h("span", { class: "cn-chip cn-chip--here" }, "This device") : null), h("p", { class: "cn-item-d" }, d.lastOkAt ? `Added ${day(d.createdAt)}, last reached ${day(d.lastOkAt)}` : `Added ${day(d.createdAt)}`)),
          actions(action("Remove", async () => {
            if (d === here) await sub.unsubscribe().catch(() => {});
            await api.del(`/v1/me/push/subscriptions/${seg(d.id)}`);
            redraw();
            return "Removed. That device hears nothing more from Orbe.";
          }, { danger: true })),
        )))
    : null;

  return [
    section({ title: "This device", line: "Each device is turned on by itself." }, thisDevice, said),
    section({ title: "What Orbe tells you", line: "Four moments, and nothing else. A notification never shows an amount or a brand's name." }, moments),
    devices
      ? section({ title: "Your devices", line: "Everywhere you turned notifications on.", actions: action("Send a test", async () => {
          const r = await api.post("/v1/me/push/test");
          return r.queued === 1 ? "Sent. It arrives within a minute." : `Sent to ${r.queued} devices. They arrive within a minute.`;
        }) }, devices)
      : null,
  ];
}

export async function renderAppSettings(el, deviceName) {
  if (installable) el.append(installCard());
  const host = h("div", { class: "ap-stack" });
  el.append(host);
  const device = deviceName(navigator.userAgent);
  const draw = () =>
    block(host, async () => {
      const [state, sub] = await Promise.all([api.get("/v1/me/push"), current().catch(() => null)]);
      return { state, sub };
    }, ({ state, sub }) => notificationsBody(state, sub, device, draw));
  await draw();
  // Not a team setting: said once, so a manager knows the switches are theirs alone.
  if (currentTeam()) host.after(h("p", { class: "ap-note" }, "These choices are yours alone, on every team you belong to."));
}
