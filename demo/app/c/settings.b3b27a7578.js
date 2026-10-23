__o.d("js/settings.js", function (__x) {
"use strict";
__o.e(__x, { deviceName: () => deviceName, render: () => render });
const { api, can, currentTeam, on, seg } = __o.r("js/api.js");
const { settingsFor } = __o.r("js/catalogue.js");
const { card, emptyState, section } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { KINDS } = __o.r("js/terms.js");
const { action, actions, block, count, day, field, form, h, input, plural, when } = __o.r("js/ui.js");

const initials = (s) => (s || "O").replace(/\(.*?\)/g, "").trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))));

async function embed(el, load, ctx) {
const m = await load();
const host = h("div", { class: "cn-embed" });
el.append(host);
await m.render(host, ctx);

for (const t of host.querySelectorAll(".ap-h1, .ap-lede, .cn-tp-head, .cn-tp-line, .cn-tags, .cn-ts > .cn-tp-tabs, .cn-back")) t.remove();
}

function deviceName(ua) {
if (!ua) return "A browser";
const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl|node|undici/i.test(ua) ? "A program" : "A browser";
const os = /iPhone|iPad/.test(ua) ? "an iPhone or iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "a Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
return os ? `${browser} on ${os}` : browser;
}

async function keysOpen() {
try {
await api.get("/v1/keys");
return true;
} catch (e) {
if (e.code === "not_a_brand_or_manager") return false;
throw e;
}
}


function untilChanged(f) {
const btn = f.querySelector("[type=submit]");
const now = () => JSON.stringify([...new FormData(f)].map(([k, v]) => [k, String(v).trim()]));
let base = now();
const check = () => (btn.disabled = now() === base);
f.addEventListener("input", check);

f.addEventListener("saved", () => ((base = now()), setTimeout(check)));
check();
return f;
}
function tourCard(ctx) {
return section({ title: "The walkthrough", line: "The few questions from your first sign-in, and the short tour of the console after them." },
actions(action("Start it again", async () => {
await api.put("/v1/me/welcome", { restart: true });
ctx.go("/orbe-site/demo/app/welcome");
})),
);
}
async function deleteCard() {
const { eraseBox } = await __o.i("js/settings.js", "./creator/record.js");
return section({ title: "Delete account", line: "Deletes your account and everything Orbe holds about you, including what was read through your connections.", cls: "cn-card--danger" }, h("p", null, "Brands with finished bookings keep their own invoices. This cannot be undone."), eraseBox());
}

function readOnly(text) {
const t = currentTeam();
return h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, text ?? `Only the team's owner${t?.role === "viewer" ? "" : " and managers"} can change this. You are ${t?.role === "editor" ? "an" : "a"} ${t?.role ?? "member"} on ${t?.name ?? "this team"}.`));
}
const needsProfile = () =>
emptyState("key", "Keys and their use belong to a brand or an agency. Set one up first.", [["Set up the brand", "/orbe-site/demo/app/settings/brand", true], ["Set up a roster", "/orbe-site/demo/app/roster"]]);
const SECTIONS = {
async account(el, ctx) {
const u = ctx.user;
if (u.type === "creator") {

const del = can("owner") ? await deleteCard() : null;
await block(el, () => api.get("/v1/me"), ({ creator, accounts }) => [
section({ title: "Personal profile", line: "How you appear to brands and buyers you choose to work with." },
h("div", { class: "cn-profile" }, h("span", { class: "cn-avatar cn-avatar--l", "aria-hidden": "true" }, initials(creator.displayName || creator.email)), h("div", null, h("p", { class: "cn-item-t" }, creator.displayName || "No name yet"), h("p", { class: "cn-item-d" }, creator.email))),
can("business")
? untilChanged(form([field("Name", input({ name: "displayName", required: true, maxlength: 80, autocomplete: "name", value: creator.displayName }), "Brands and buyers you agree to work with see this name.")], "Save", async (d, f) => {
await api.patch("/v1/me", { displayName: String(d.get("displayName")).trim() });
f.dispatchEvent(new Event("saved"));
return "Saved.";
}))
: readOnly(),
),
section({ title: "Email and sign-in", line: "No password: Orbe never asks for one, or for your platform passwords." },
kv([["Email", creator.email], ["Ways in", "Continue with Google, or an emailed link"], ["Account", "Creator"], ["Joined", day(creator.createdAt)]]),
h("p", { class: "cn-label" }, "To change the email on your account, write to Orbe from the address you use now."),
),
card("Your accounts",
accounts.length
? h("ul", { class: "cn-list" }, accounts.map((a) => h("li", null, h("span", null, a.handle || a.title), h("span", { class: "cn-item-d" }, `${KINDS[a.kind] ?? a.kind}${a.audience ? `, ${count(a.audience)} audience` : ""}`))))
: emptyState("link", "No accounts claimed yet.", [["Connect an account", "/orbe-site/demo/app/settings/connections", true]]),
),
tourCard(ctx),
del,
]);
} else {
await block(el, () => api.get("/v1/buyer/me"), ({ buyer }) => [
section({ title: "Organisation", line: "Who creators see when you book them." },
h("div", { class: "cn-profile" }, h("span", { class: "cn-avatar cn-avatar--l", "aria-hidden": "true" }, initials(buyer.org || buyer.email)), h("div", null, h("p", { class: "cn-item-t" }, buyer.org || "No organisation yet"), h("p", { class: "cn-item-d" }, buyer.email))),
can("business")
? untilChanged(form([field("Organisation", input({ name: "org", required: true, maxlength: 120, autocomplete: "organization", value: buyer.org }))], "Save", async (d, f) => {
await api.patch("/v1/buyer/me", { org: String(d.get("org")).trim() });
f.dispatchEvent(new Event("saved"));
return "Saved.";
}))
: readOnly(),
),
section({ title: "Email and sign-in", line: "No password: Orbe never asks for one." }, kv([["Email", buyer.email], ["Ways in", "Continue with Google, or an emailed link"], ["Account", "Brand"], ["Joined", day(buyer.createdAt)]])),
tourCard(ctx),
]);
}
},
async app(el) {
const m = await __o.i("js/settings.js", "./app-settings.js");
await m.renderAppSettings(el, deviceName);
},
async team(el, ctx) {
const m = await __o.i("js/settings.js", "./team.js");
await m.renderTeam(el, ctx);
},
async sharing(el, ctx) {
const m = await __o.i("js/settings.js", "./sharing.js");
await m.renderSharing(el, ctx);
},
async connections(el, ctx) {

const m = await __o.i("js/settings.js", "./creator/connect.js");
await m.connections(el, ctx);
},
async plan(el) {
const m = await __o.i("js/settings.js", "./creator/plan.js");
const box = h("div", { class: "ap-stack" });
el.append(card("Your plan", box));
m.planBox(box);
await block(el.appendChild(h("div")), async () => {
const [me, plan] = await Promise.all([api.get("/v1/me"), api.get("/v1/me/plan").catch(() => null)]);
return { me, plan: plan?.plan ?? null };
}, ({ me, plan }) => card("This month",
h("dl", { class: "ap-figs" },
plan ? h("div", { class: "ap-figs-row" }, h("dt", null, "Predictions sealed"), h("dd", null, `${plan.usage.predictionsThisMonth} of ${plan.entitlements.predictionsPerMonth}`)) : null,
h("div", { class: "ap-figs-row" }, h("dt", null, "Accounts claimed"), h("dd", null, String(me.accounts.length))),
h("div", { class: "ap-figs-row" }, h("dt", null, "Sources read"), h("dd", null, String(me.connections.length))),
plan ? h("div", { class: "ap-figs-row" }, h("dt", null, "Rating history kept"), h("dd", null, plural(plan.entitlements.historyDays, "day"))) : null,
),
plan ? h("p", { class: "ap-note" }, `Counts start again ${day(plan.usage.resetsAt)}.`) : null,
));
},
async brand(el, ctx) {
await embed(el, () => __o.i("js/settings.js", "./brand/profile.js"), ctx);
},
async keys(el, ctx) {
if (!(await keysOpen())) return el.append(needsProfile());
await embed(el, () => __o.i("js/settings.js", "./brand/keys.js"), ctx);
},
async metrics(el) {
const m = await __o.i("js/settings.js", "./metrics.js");
await m.render(el);
},
async mcp(el, ctx) {
await embed(el, () => __o.i("js/settings.js", "./tools/developers.js"), ctx);
},
async security(el) {
const draw = () =>
block(el, () => api.get("/v1/auth/sessions"), ({ sessions }) =>
card("Where you are signed in",
h("ul", { class: "cn-list" }, sessions.map((x) =>
h("li", { class: "cn-session" },
h("div", null, h("span", { class: "cn-session-ico" }, icon(/iPhone|Android/.test(x.userAgent ?? "") ? "monitor" : "monitor")), h("div", null, h("p", { class: "cn-item-t" }, deviceName(x.userAgent), x.current ? h("span", { class: "cn-chip cn-chip--here" }, "This device") : null), h("p", { class: "cn-item-d" }, `Signed in ${day(x.createdAt)}, last seen ${when(x.lastSeenAt)}`))),
x.current ? null : actions(action("Sign out", async () => {
await api.del(`/v1/auth/sessions/${seg(x.id)}`);
draw();
return "Signed out on that device.";
}, { danger: true })),
),
)),
h("p", { class: "ap-note" }, "A session lasts 30 days from its last use. Signing out here ends it at once."),
),
);
await draw();
},
};
async function render(main, ctx) {

if (ctx.params.section === "integrations") return ctx.go(`/orbe-site/demo/app/settings/connections${location.search}`, { replace: true });
const sections = settingsFor(ctx.user, on);
const id = sections.some((s) => s.id === ctx.params.section) ? ctx.params.section : sections[0].id;
const here = sections.find((s) => s.id === id);

if (ctx.params.section && ctx.params.section !== id) history.replaceState(history.state, "", `/orbe-site/demo/app/settings/${id}${location.search}`);
const panel = h("div", { class: "cn-settings-panel" });
const groups = [...new Set(sections.map((s) => s.group))];
const find = h("input", { class: "cn-field-input", type: "search", placeholder: "Search settings", "aria-label": "Search settings" });
const nav = h("nav", { class: "cn-settings-nav", "aria-label": "Settings" },
h("label", { class: "cn-field cn-settings-search" }, icon("search"), find),
groups.map((g) => [

h("ul", { "data-group": g }, sections.filter((s) => s.group === g).map((s) => h("li", { "data-words": `${s.name} ${s.line}`.toLowerCase() }, h("a", { class: "cn-settings-link", href: `/orbe-site/demo/app/settings/${s.id}`, "aria-current": s.id === id ? "page" : null }, icon(s.icon), s.name)))),
]),
);
find.addEventListener("input", () => {
const q = find.value.trim().toLowerCase();
for (const li of nav.querySelectorAll("li")) li.hidden = Boolean(q) && !li.dataset.words.includes(q);
});

main.append(
h("header", { class: "cn-pagehead cn-pagehead--s" }, h("div", null, h("h1", { class: "cn-h1", tabindex: "-1", "data-title": "" }, here.name), h("p", { class: "cn-sub" }, here.line))),
h("div", { class: "cn-settings" },
nav,
h("div", { class: "cn-settings-main" }, panel),
),
);
await SECTIONS[id](panel, ctx);
}
});
