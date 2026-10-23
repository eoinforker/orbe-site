__o.d("js/creator/fix.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, seg } = __o.r("js/api.js");
const { actions, block, count, day, failure, form, h, money, ok, pct, plural } = __o.r("js/ui.js");
const { emptyState, screenHead, section } = __o.r("js/console-ui.js");
const { button, choice, status, table, twoLine } = __o.r("js/cards.js");

const FIX_STATES = { proposed: "Waiting for your tap", approved: "Approved, going live", applied: "Live, being measured", kept: "Kept: it lifted the work", reverted: "Put back", cancelled: "Cancelled" };
const FIX_TONE = { kept: "good", applied: "good", reverted: "off", cancelled: "off" };
const TARGET = { title: "the title", thumbnail: "the thumbnail", both: "the title and the thumbnail" };
const STATUS = { underperforming: "Behind creators its size", on_track: "On track", too_young: "Too young to judge", too_old: "Too old to fix", not_eligible: "Not one Fix can help" };
const ISSUES = {
empty: "it was empty",
too_long: "it is over YouTube's 100 characters",
same_as_current: "it is the same as the current one",
new_number: "it adds a number the video does not have",
off_topic: "it shares no subject word with the video",
shouting: "it is mostly capitals",
not_https: "the image is not on a secure address",
};
const RETURNED = {
denied: "You said no on Google's screen, so Orbe still cannot change anything on YouTube.",
not_granted: "Google's screen came back without the permission ticked. Try again and leave it ticked.",
invalid_request: "Google sent back an incomplete answer. Try again.",
};
function returned(q) {
if (q.get("permission") === "granted") return ok("YouTube's permission is in place. Nothing changes without your tap, except titles where you turned automatic titles on.");
const e = q.get("error");
return e ? failure({ message: RETURNED[e] ?? `YouTube's permission was not given (${e.replaceAll("_", " ")}).` }) : null;
}
function settingsBox(ch, reload) {
const s = ch.settings;
return h(
"div",
{ class: "ap-stack" },
!s.connected ? h("p", { class: "cn-label" }, "Connect YouTube Analytics for this channel first, under ", h("a", { href: "/orbe-site/demo/app/settings/connections" }, "Connections"), ".") : null,
form(
[
choice("Fix on for this channel", { name: "enabled", checked: s.enabled }, "Orbe judges each new work and offers new options when one falls behind."),
choice("Change titles on their own", { name: "autoTitles", checked: s.autoTitles }, "When Orbe finds a better one. A new thumbnail always waits for your tap."),
],
"Save",
async (d) => {
const enabled = d.get("enabled") === "on";
await api.put("/v1/me/fixes/settings", { accountId: ch.accountId, enabled, autoTitles: enabled && d.get("autoTitles") === "on" });
reload();
return "Saved.";
},
{ primary: false },
),
s.permission
? h("div", { class: "cn-banner" },
h("p", null, s.permission.why),
actions(button("Give YouTube's permission", async () => {
const r = await api.post("/v1/me/fixes/permission/start", { accountId: ch.accountId });
window.location.assign(r.authorizeUrl);
}, { primary: true })),
)
: s.enabled && s.youtubeWrite
? h("p", { class: "cn-label" }, "YouTube's permission is in place.")
: null,
);
}
function optionsBox(u, reload) {
const box = h("div", { class: "ap-stack", "aria-live": "polite" });
const generate = button("Generate options", async () => {
const r = await api.post("/v1/me/fixes/generate", { workId: u.workId });
const titles = r.options.filter((o) => o.kind === "title");
const thumbs = r.options.filter((o) => o.kind === "thumbnail");
const notes = (o) => (o.notes?.length ? h("span", { class: "dl-sub" }, o.notes.join(" ")) : null);
box.replaceChildren(
h("p", { class: "cn-label" }, r.note),
form(
[
titles.length
? h("fieldset", { class: "ap-fieldset" }, h("legend", null, "New title"),
h("label", { class: "ap-check" }, h("input", { type: "radio", name: "title", value: "", checked: true }), h("span", null, "Keep the current title")),
titles.map((o) => h("label", { class: "ap-check" }, h("input", { type: "radio", name: "title", value: o.id }), h("span", null, o.title, notes(o)))))
: h("p", { class: "cn-label" }, "No new title passed the checks."),
thumbs.length
? h("fieldset", { class: "ap-fieldset" }, h("legend", null, "New thumbnail (always waits for your tap)"), h("div", { class: "ap-thumbs" },
h("label", { class: "ap-thumb" }, h("input", { type: "radio", name: "thumb", value: "", checked: true }), h("span", null, "Keep the current thumbnail")),
thumbs.map((o, i) => h("label", { class: "ap-thumb" }, h("input", { type: "radio", name: "thumb", value: o.id }), h("img", { src: o.imageUrl, alt: `Thumbnail option ${i + 1}`, loading: "lazy", width: "320", height: "180" })))))
: h("p", { class: "cn-label" }, "No thumbnail options. Orbe never draws its own."),
],
"Propose this change",
async (fd) => {
const optionIds = [fd.get("title"), fd.get("thumb")].filter(Boolean).map(String);
if (!optionIds.length) throw new Error("Choose a new title, a new thumbnail, or both.");
const p = await api.post("/v1/me/fixes", { workId: u.workId, optionIds });
if (p.problem) {
box.append(failure({ message: p.problem }));
return null;
}
reload();
return "Proposed.";
},
),
r.held.length
? h("details", { class: "ap-more" }, h("summary", null, `Held back (${r.held.length})`),
h("ul", { class: "cn-points" }, r.held.map((x) => h("li", null, x.option.kind === "title" ? `"${x.option.title}"` : "A thumbnail", `: held back because ${x.issues.map((i) => ISSUES[i] ?? i.replaceAll("_", " ")).join(", and ")}.`, x.notes.length ? ` ${x.notes.join(" ")}` : ""))))
: null,
r.failed.length ? h("p", { class: "cn-label" }, `${plural(r.failed.length, "provider")} did not answer, so the next one was asked.`) : null,
);
return `${plural(r.options.length, "option")} ready.`;
}, { primary: true });
box.append(actions(generate));
return box;
}
function fixRow(f, reload) {
const moves = [];
if (f.state === "proposed")
moves.push(button(f.after.thumbnailUrl !== f.before.thumbnailUrl ? "Approve: send it to YouTube" : "Approve", async () => {
await api.post(`/v1/me/fixes/${seg(f.id)}/approve`, {});
reload();
return "Approved.";
}, { primary: true }));
if (["proposed", "approved", "applied", "kept"].includes(f.state))
moves.push(button(f.state === "proposed" || f.state === "approved" ? "Cancel" : "Undo", async () => {
await api.post(`/v1/me/fixes/${seg(f.id)}/undo`, {});
reload();
return "Undone.";
}, { quiet: true, danger: true, confirm: "Put the old title and thumbnail back? An undone fix is never charged." }));
if (f.state === "applied")
moves.push(button("Check now", async () => {
const r = await api.get(`/v1/me/fixes/${seg(f.id)}`);
reload();
return FIX_STATES[r.fix.state] ?? r.fix.state;
}, { quiet: true }));
const titled = f.before.title !== f.after.title;
const thumb = f.before.thumbnailUrl !== f.after.thumbnailUrl;
return [
titled ? twoLine(f.after.title, `Was: ${f.before.title}`) : h("span", { class: "cn-cell-t" }, "A new thumbnail"),
twoLine(f.result?.text ?? (thumb && titled ? "Title and thumbnail" : f.mode === "auto" ? "Automatic title" : ""), f.fee ? `Fee ${money(f.fee)}, because it lifted the work` : null),
status(FIX_STATES[f.state] ?? f.state, FIX_TONE[f.state]),
day(f.createdAt),
moves.length ? actions(moves) : null,
];
}
function uploadItem(u, ch, reload) {
const d = u.diagnosis;
const behind = d?.status === "underperforming";
return h(
"div",
{ class: "cn-block" },
h("div", { class: "cn-block-head" },
twoLine(h("a", { href: `/orbe-site/demo/app/works/${seg(u.workId)}?tab=fix` }, u.title), `Published ${day(u.publishedAt)}, ${count(u.views)} views`),
status(STATUS[d?.status] ?? "Not judged", behind ? "warn" : d?.status === "on_track" ? "good" : "off"),
),
d?.expected ? h("p", null, `Creators your size typically have ${count(d.expected.median)} by now (middle half ${count(d.expected.p25)} to ${count(d.expected.p75)}).`) : null,
behind ? h("p", null, d.why, d.target ? h("strong", null, ` Change ${TARGET[d.target]}.`) : null) : null,
u.fixes.length ? table([["Change"], ["Result"], ["Status"], ["Started"], [""]], u.fixes.map((f) => fixRow(f, reload)), { caption: `Fixes to ${u.title}` }) : null,
behind && ch.settings.enabled && !u.fixes.some((f) => ["proposed", "approved", "applied"].includes(f.state)) ? optionsBox(u, reload) : null,
);
}
async function render(main, ctx) {
const body = h("div", { class: "ap-stack" });
screenHead(main, "fix", { line: "Works that fall behind creators your size, what to change, and new options to try. A change stays, and is charged, only if it lifts the work; one tap puts the old one back.", tags: [["Live", "sky"], ["Paid only on lift"], ["YouTube"]] }).append(body);
const reload = () =>
block(body, () => api.get("/v1/me/fixes"), (r) => [
returned(ctx.query),
r.channels.length
? r.channels.map((ch) => {

const only = ctx.query.get("work");
const behind = ch.uploads.filter((u) => (only ? u.workId === only : u.diagnosis?.status === "underperforming" || u.fixes.length));
const rest = ch.uploads.length - behind.length;
return [
section({ title: `${ch.handle || ch.title} on YouTube`, line: ch.settings.enabled ? "Fix is on for this channel." : "Fix is off for this channel. Turn it on to generate options." }, settingsBox(ch, reload)),
section(
{ title: "Works behind creators your size", line: rest ? `${plural(rest, "other work")} on track, too young or too old to judge.` : null },
behind.length ? h("div", { class: "cn-blocks" }, behind.map((u) => uploadItem(u, ch, reload))) : emptyState("check", "Nothing is falling behind creators your size right now.", []),
),
];
})
: section({ title: "No YouTube channel yet" }, emptyState("plug", "Fix works on YouTube channels.", [["Connect YouTube Analytics", "/orbe-site/demo/app/settings/connections", true]])),
h("p", { class: "cn-label" }, `Judged ${plural(r.judgedAfterDays, "day")} or more after the change: kept with at least ${pct(r.liftNeeded)} more views than its own pace, for ${money(r.fee)} a kept fix (provisional). Otherwise it goes back, free.`),
]);
await reload();
}
});
