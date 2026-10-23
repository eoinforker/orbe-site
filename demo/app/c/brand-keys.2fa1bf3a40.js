__o.d("js/brand/keys.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, seg } = __o.r("js/api.js");
const { actions, block, day, field, form, h, input, ok } = __o.r("js/ui.js");
const { codeBlock, screenHead, section } = __o.r("js/console-ui.js");
const { button, narrow, status, table, twoLine } = __o.r("js/cards.js");

const monthName = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const n = (x) => x.toLocaleString("en-GB");
async function render(main) {
const list = h("div", { class: "ap-stack" });
const shown = h("div", { class: "ap-stack", "aria-live": "polite" });
const make = narrow(form([field("Name", input({ name: "name", required: true, maxlength: 80, placeholder: "Reporting dashboard" }))], "Make a key", async (d, f) => {
const r = await api.post("/v1/keys", { name: String(d.get("name")).trim() });
f.reset();
shown.replaceChildren(ok(r.notice), codeBlock(r.secret, "Your new key, shown once"));
reload();
return "Key made.";
}));
make.classList.add("cn-form--row");
const reload = () =>
block(list, () => api.get("/v1/keys"), ({ keys, usage }) => [
section({ title: "Your keys", line: "Revoke a key and anything using it stops at once." },
keys.length
? table([["Name"], ["Key"], ["Last used"], ["Status"], [""]], [...keys].reverse().map((k) => [
twoLine(k.name, `Made ${day(k.createdAt)}`),
h("code", { class: "cn-code-inline" }, `${k.prefix}...`),
k.lastUsedAt ? day(k.lastUsedAt) : h("span", { class: "dl-quiet" }, "Never"),
k.revokedAt ? status(`Revoked ${day(k.revokedAt)}`, "off") : status("Live", "good"),
k.revokedAt ? null : actions(button("Revoke", async () => {
await api.del(`/v1/keys/${seg(k.id)}`);
reload();
return "Revoked.";
}, { quiet: true, danger: true, confirm: `Revoke ${k.name}? Anything using it stops working at once.` })),
]), { caption: "Your keys" })
: h("p", { class: "cn-label" }, "No keys yet. Make one above."),
),
usage.length
? section({ title: "Use by month", line: "What each key asked for, the counts billing reads." },
table([["Key"], ["Month"], ["Requests", "num"], ["Answered", "num"], ["Results", "num"]], [...usage].reverse().slice(0, 24).map((u) => [
keys.find((k) => k.id === u.keyId)?.name ?? "A key",
monthName(u.month),
n(u.requests),
n(u.answered),
n(u.units),
]), { caption: "Use by month" }))
: null,
]);
screenHead(main, "keys", { line: "For your own tools to read discovery and your roster through Orbe's data API. A key reaches only what your own sign-in would." }).append(
h("div", { class: "ap-stack" }, section({ title: "Make a key", line: "Name it so you can tell your keys apart. The key is shown once, here; keep it somewhere safe." }, make, shown), list),
);
await reload();
}
});
