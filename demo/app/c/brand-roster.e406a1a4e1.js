__o.d("js/brand/roster-handoff.js", function (__x) {
"use strict";
__o.e(__x, { rosterHandoff: () => rosterHandoff });
const { api, seg } = __o.r("js/api.js");
const { button, status, twoLine } = __o.r("js/cards.js");
const { drawer, emptyState, sampleTag, section } = __o.r("js/console-ui.js");
const { handoffCard, headline } = __o.r("js/creator/handoff.js");
const { confirmBox, form, h, check, money, toast } = __o.r("js/ui.js");

const GRANT_WORDS = {
none: "They approve every change",
rules: "You set the rules",
approve: "You approve",
both: "You set the rules and approve",
};

const grantLine = (r) => {
if (!r.shares) return "Shares no deals with you";
const g = r.grant ?? { grant: "none", max: null };
const words = GRANT_WORDS[g.grant] ?? GRANT_WORDS.none;
return g.max && (g.grant === "approve" || g.grant === "both") ? `${words}, up to £${Number(g.max).toLocaleString("en-GB")}` : words;
};

const BULK = ["accept", "counter", "decline", "chase_funds", "chase_payout"];
const hm = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function nextCell(r) {
if (!r.shares) return h("span", { class: "dl-quiet" }, "Not shared");
if (!r.next) return h("span", { class: "dl-quiet" }, r.enabled ? "Nothing waiting" : "Off");
const sub = r.next.state === "scheduled" && r.next.runAt ? `At ${hm(r.next.runAt)} unless stopped` : r.next.creatorAct ? `${r.creator.name} decides` : "You decide";
return twoLine(r.next.title, sub);
}

const COLS = [
{ key: "name", label: "Creator", by: (r) => r.creator.name.toLowerCase() },
{ key: "on", label: "Hand it off", by: (r) => (r.shares ? (r.enabled ? 2 : 1) : 0) },
{ key: "waiting", label: "Waiting", num: true, by: (r) => r.counts?.waiting ?? -1 },
{ key: "done", label: "Done this week", num: true, by: (r) => r.counts?.doneThisWeek ?? -1 },
{ key: "held", label: "Money held", num: true, by: (r) => r.held?.amount ?? -1 },
{ key: "next", label: "Next", by: (r) => (r.next ? (r.next.state === "waiting" ? `0${r.next.title}` : `1${r.next.runAt ?? ""}`) : "2") },
];

function rosterTable(rows, open, sort) {
const col = COLS.find((c) => c.key === sort.key) ?? COLS[0];
const sorted = [...rows].sort((a, b) => {
const x = col.by(a);
const y = col.by(b);
const d = x < y ? -1 : x > y ? 1 : 0;
return (sort.dir === "asc" ? d : -d) || a.creator.name.localeCompare(b.creator.name);
});
const body = h("tbody");
const head = h("thead", null, h("tr", null, COLS.map((c) => {
const on = c.key === col.key;
return h("th", { scope: "col", class: c.num ? "dl-num" : null, "aria-sort": on ? (sort.dir === "asc" ? "ascending" : "descending") : "none" },
h("button", { class: `rh-sort${on ? " is-on" : ""}`, type: "button", onclick: () => sort.set(c.key) }, c.label, h("span", { class: "rh-dir", "aria-hidden": "true" }, on ? (sort.dir === "asc" ? "↑" : "↓") : "")),
);
})));
const rowsEls = sorted.map((r, i) =>
h("tr", { class: "dl-row rh-row", tabindex: i === 0 ? "0" : "-1", "data-id": r.creator.id, onclick: () => open(r) },
h("td", { "data-label": "Creator" }, twoLine(r.creator.name, grantLine(r))),
h("td", { "data-label": "Hand it off" }, h("span", { class: "cn-dt-v" }, r.shares ? status(r.enabled ? "On" : "Off", r.enabled ? "good" : "off") : status("Not shared", "off"))),
h("td", { class: "dl-num", "data-label": "Waiting" }, h("span", { class: "cn-dt-v" }, r.counts ? String(r.counts.waiting) : "")),
h("td", { class: "dl-num", "data-label": "Done this week" }, h("span", { class: "cn-dt-v" }, r.counts ? String(r.counts.doneThisWeek) : "")),
h("td", { class: "dl-num", "data-label": "Money held" }, h("span", { class: "cn-dt-v" }, r.held ? money(r.held) : r.shares ? h("span", { class: "dl-quiet" }, "None") : "")),
h("td", { "data-label": "Next" }, h("span", { class: "cn-dt-v" }, nextCell(r))),
),
);
body.append(...rowsEls);
body.addEventListener("keydown", (e) => {
const row = e.target.closest?.("tr");
if (!row) return;
const i = rowsEls.indexOf(row);
const to = { ArrowDown: i + 1, j: i + 1, ArrowUp: i - 1, k: i - 1, Home: 0, End: rowsEls.length - 1 }[e.key];
if (e.key === "Enter" || e.key === " ") {
e.preventDefault();
open(sorted[i]);
return;
}
if (to === undefined || to < 0 || to >= rowsEls.length) return;
e.preventDefault();
row.tabIndex = -1;
rowsEls[to].tabIndex = 0;
rowsEls[to].focus();
});
return h("div", { class: "dl-wrap" },
h("table", { class: "dl-table cn-dt rh-table" }, h("caption", { class: "ob-sr" }, "Hand it off for each creator on your roster. Use the arrow keys to move and Enter to open."), head, body),
);
}

function queueItem(a, picked, onPick, open) {
const eligible = a.can?.approve && BULK.includes(a.kind);
const box = eligible ? h("input", { type: "checkbox", class: "rh-pick", checked: picked.has(a.id), "aria-label": `Pick: ${headline(a)} for ${a.creator.name}` }) : null;
box?.addEventListener("change", () => onPick(a, box.checked));
return h("li", { class: `ho-item ho-item--${a.state} rh-item`, "data-id": a.id },
h("div", { class: "rh-item-row" },
box ?? h("span", { class: "rh-pick-gap", "aria-hidden": "true" }),
h("div", { class: "rh-item-main" },
h("p", { class: "rh-who" }, a.creator.name),
h("p", { class: "ho-item-t" }, headline(a)),
a.why ? h("p", { class: "ho-item-d" }, a.why) : null,
a.waitsFor ? h("p", { class: "ho-item-d ho-waits" }, a.waitsFor) : null,
),
button("Open", () => open(a.creator, a.id), { quiet: true }),
),
);
}

function queueGroup(id, title, items, picked, onPick, open) {
if (!items.length) return null;
return h("section", { class: "ho-group rh-queue", "aria-labelledby": id },
h("h3", { class: "ho-h", id }, title, h("span", { class: "ho-n" }, String(items.length))),
h("ul", { class: "ho-list" }, items.map((a) => queueItem(a, picked, onPick, open))),
);
}

function approvePicked(items, done) {
const accepts = items.filter((a) => a.kind === "accept");
const others = items.filter((a) => a.kind !== "accept");
const send = async (list, seen) => {
const r = await api.post("/v1/roster/handoff/approve", { items: list.map((a) => ({ creatorId: a.creator.id, actionId: a.id, ...(seen.has(a.id) ? { noticeShown: true } : {}) })) });
const failed = r.results.filter((x) => !x.ok);
toast(failed.length ? `${r.done} done. ${failed.length} could not be: ${failed[0].error?.message ?? "refused"}` : `${r.done} done.${list.some((a) => a.kind === "counter") ? " A counter a brand accepts agrees the deal." : ""}`);
done();
};
if (!accepts.length) {
return confirmBox(`${items.map((a) => `${a.creator.name}: ${headline(a)}`).join(" ")}${others.some((a) => a.kind === "counter") ? " A counter cannot be taken back. If a brand accepts it, the deal is agreed." : ""}`, { title: `Approve ${items.length}?`, yes: `Approve ${items.length}` }).then((yes) => (yes ? send(items, new Set()) : null));
}
drawer(`Approve ${items.length}`, (close) => {
const f = form(
[
others.length ? h("ul", { class: "ho-list" }, others.map((a) => h("li", { class: "ho-item" }, h("p", { class: "rh-who" }, a.creator.name), h("p", { class: "ho-item-t" }, headline(a))))) : null,
...accepts.map((a) => h("fieldset", { class: "dl-fs" },
h("legend", null, `${a.creator.name}: ${headline(a)}`),
a.notice ? h("p", { class: "dl-notice ho-notice" }, a.notice) : null,
check(`I have read this and want to accept for ${a.creator.name}.`, { name: "seen", value: a.id }),
)),
],
`Approve ${items.length}`,
async (fd) => {
const seen = new Set(fd.getAll("seen").map(String));
await send(items, seen);
close();
return null;
},
);
f.classList.add("cn-form");
const submit = f.querySelector("button[type=submit]");
submit?.setAttribute("class", "cn-btn cn-btn--primary");

const boxes = [...f.querySelectorAll("input[name=seen]")];
const sync = () => submit && (submit.disabled = boxes.some((b) => !b.checked));
boxes.forEach((b) => b.addEventListener("change", sync));
sync();
return [h("p", { class: "dl-notice" }, "Each accept agrees a deal for its creator. Money is held when the brand funds, and paid out on verified delivery."), f];
});
return null;
}

function openCreator(creator, focusId, changed) {
const base = `/v1/roster/handoff/creators/${seg(creator.id)}`;
let view = null;
const scope = {
own: false,
base,
name: creator.name,
get rules() {
return !!view?.can?.rules;
},
read: async () => {
view = await api.get(base);
return view.handoff;
},

may: (action) => action === "business",
};
drawer(`${creator.name}: Hand it off`, () => [handoffCard({ scope, focus: focusId ?? undefined, changed })], { wide: true, onClose: changed });
}

function rosterHandoff() {
const slot = h("div", { class: "rh-slot" });
const sort = { key: "waiting", dir: "desc", set: null };
const picked = new Map();
const bar = h("div", { class: "cn-bulk", hidden: true, role: "region", "aria-label": "Picked items" });
let data = null;
const load = async () => {
try {
data = await api.get("/v1/roster/handoff");
} catch (e) {
if (e?.status === 404 || e?.status === 403) return slot.replaceChildren();
throw e;
}

for (const id of [...picked.keys()]) if (!data.queue.some((a) => a.id === id && a.can?.approve)) picked.delete(id);
draw();
};
const changed = () => slot.isConnected && load();
const open = (creator, focusId) => openCreator(creator, focusId, changed);
const drawBar = () => {
const n = picked.size;
bar.hidden = n === 0;
if (!n) return bar.replaceChildren();
bar.replaceChildren(
h("span", { class: "cn-bulk-n" }, `${n} picked`),
h("span", { class: "cn-bulk-sep", "aria-hidden": "true" }),
button(`Approve ${n}`, () => approvePicked([...picked.values()], () => (picked.clear(), changed())), { primary: true }),
button("Clear", () => {
picked.clear();
slot.querySelectorAll(".rh-pick").forEach((b) => (b.checked = false));
drawBar();
}, { quiet: true }),
);
};
const draw = () => {
const d = data;
const keep = slot.contains(document.activeElement) ? (document.activeElement.closest("[data-id]")?.dataset.id ?? null) : null;
if (!d.creators.length) {
slot.replaceChildren(section({ title: "Hand it off across your roster", line: "Each creator's Hand it off, run from here within what they let your agency do." },
emptyState("people", "No creators on your roster yet.", [], "Once a creator joins and links your agency as a manager, their Hand it off shows here: what waits, what was done and the money held.")));
return drawBar();
}
sort.set = (key) => {
sort.dir = sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : COLS.find((c) => c.key === key)?.num ? "desc" : "asc";
sort.key = key;
draw();
slot.querySelector(`th[aria-sort]:not([aria-sort=none]) button`)?.focus();
};
const s = d.summary;
const queue = d.queue ?? [];

const yours = queue.filter((a) => a.state === "waiting" && !a.waitsFor);
const theirs = queue.filter((a) => a.state === "waiting" && a.waitsFor);
const soon = queue.filter((a) => a.state === "scheduled");
const parts = [`${yours.length} waiting on you`, theirs.length ? `${theirs.length} on the creator` : null, soon.length ? `${soon.length} about to happen` : null].filter(Boolean);
const line = `On for ${s.on} of ${s.creators}. ${parts.join(", ")}.${s.held.amount ? ` ${money(s.held)} held until delivery is verified.` : ""}`;
const onPick = (a, yes) => {
if (yes) picked.set(a.id, a);
else picked.delete(a.id);
drawBar();
};
slot.replaceChildren(
section({ title: "Hand it off across your roster", line, actions: sampleTag(), cls: "rh" },
rosterTable(d.creators, (r) => (r.shares ? open(r.creator) : toast(`${r.creator.name} shares no deals with your agency.`)), sort),
queueGroup("rh-q", "Waiting on you", yours, picked, onPick, open),
queueGroup("rh-t", "Waiting on the creator", theirs, picked, onPick, open),
queueGroup("rh-s", "About to happen", soon, picked, onPick, open),
queue.length ? null : h("p", { class: "ho-empty" }, "Nothing waits. New offers are answered inside each creator's rules."),
),
bar,
);
drawBar();
if (keep) slot.querySelector(`[data-id="${CSS.escape(keep)}"]`)?.focus({ preventScroll: true });
};
load().catch(() => slot.replaceChildren());
return slot;
}
});
__o.d("js/brand/roster.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, can, on, seg } = __o.r("js/api.js");
const { BOOKING_STATES } = __o.r("js/deal.js");
const { formatName, KINDS, sizeWords } = __o.r("js/terms.js");
const { actions, block, check, count, day, field, form, h, input, plural } = __o.r("js/ui.js");
const { emptyState, rating, screenHead, section, stat, statStrip } = __o.r("js/console-ui.js");
const { button, narrow, status, table, twoLine } = __o.r("js/cards.js");
const { rosterHandoff } = __o.r("js/brand/roster-handoff.js");

const LINK_STATES = { invited: ["Invited", null], active: ["On the roster", "good"], declined: ["Declined", "off"], left: ["Left", "off"], removed: ["Removed", "off"], withdrawn: ["Withdrawn", "off"] };

const JUDGED = ["short", "make_good", "verified", "paid"];
function setup(terms, reload) {
return section(
{ title: "Set up your agency", line: "Agencies and managers invite the creators they represent. Each creator decides whether to join and can leave at any time." },
narrow(form(
[
field("Agency or management company", input({ name: "org", required: true, maxlength: 120, autocomplete: "organization" })),
h("div", { class: "cn-terms" }, h("p", { class: "cn-terms-t" }, "Manager terms"), h("p", null, terms)),
check("I accept the manager terms.", { name: "accept", required: true }),
],
"Set up the agency",
async (d) => {
await api.put("/v1/manager/profile", { org: String(d.get("org")).trim(), acceptTerms: true });
reload();
return "Set up.";
},
)),
);
}

function creatorRows(m) {
const accounts = m.accounts.length ? m.accounts : [null];
const who = h("td", { rowspan: String(accounts.length), class: "cn-td-top" }, twoLine(m.creator.displayName || "A creator", `On the roster since ${day(m.joinedAt)}`));
return accounts.map((a, i) => {
const lead = i === 0 ? [who] : [];
if (!a) return { cells: [...lead, h("span", { class: "dl-quiet" }, "No account shared yet"), null, null, null, null] };
const judged = a.uploads.filter((u) => u.atSize);
const n = (r) => judged.filter((u) => u.atSize.result === r).length;
return {
skip: i === 0 ? 0 : 1,
cells: [
...lead,
twoLine(a.handle, [KINDS[a.kind] ?? a.kind, ...a.notes].join(". ")),
sizeWords(a.sizeBand, a.kind),
a.rating ? [rating(a.rating.rating), h("span", { class: "dl-sub" }, a.rating.band)] : h("span", { class: "dl-quiet" }, "Not rated yet"),
a.rating?.beats !== null && a.rating?.beats !== undefined ? `Beats ${a.rating.beats} in 100` : h("span", { class: "dl-quiet" }, "Not yet"),
judged.length ? twoLine(`${n("above")} above, ${n("within")} inside, ${n("below")} below`, `the middle half, of ${plural(judged.length, "work")}`) : h("span", { class: "dl-quiet" }, "None judged yet"),
],
};
});
}

function oneNotice(notices) {
const by = notices.map((t) => /not provided or endorsed by (.+?)\.?$/.exec(t)?.[1]);
if (notices.length < 2 || by.some((x) => !x)) return notices.join(" ");
const parties = [...new Set(by.flatMap((x) => x.split(/,\s*|\s+or\s+/)))];
const list = parties.length < 2 ? parties.join("") : `${parties.slice(0, -1).join(", ")} or ${parties.at(-1)}`;
return `Independently calculated by Orbe. It is not a platform metric, and it is not provided or endorsed by ${list}.`;
}
function rosterCards(r, invites, reload) {
const s = r.summary;
const bands = Object.entries(s.bands ?? {}).map(([band, n]) => `${n} ${band}`).join(", ");

const notices = [...new Set(r.members.flatMap((m) => m.accounts.map((a) => a.rating?.notice).filter(Boolean)))];
const deliveries = r.members.flatMap((m) => m.deliveries.map((d) => ({ ...d, name: m.creator.displayName || "A creator" })));
const names = new Map(r.members.map((m) => [m.creator.id, m.creator.displayName || "A creator"]));
return [
statStrip([
stat({ label: "On the roster", value: count(s.creators), line: s.invited ? `${plural(s.invited, "invite")} waiting` : "No invites waiting" }),
stat({ label: "Rated", value: `${count(s.rated)} of ${count(s.creators)}`, line: bands || "Rated once an account is connected" }),
stat({ label: "Guaranteed reads", value: count(s.guaranteed), line: s.guaranteed ? `${s.met} met, ${s.short} short` : "None booked yet" }),
]),

on("deals_agent") && can("read.money") ? rosterHandoff() : null,
section(
{ title: "Creators", line: "What each creator chose to share with you, read fresh each time you open the Roster." },
r.members.length
? [
table([["Creator"], ["Account"], ["Size"], ["Rating", "num"], ["Reach at its size"], ["Recent works"]], r.members.flatMap(creatorRows), { cls: "cn-roster-table", caption: "Creators on the roster" }),
h("p", { class: "cn-label" }, oneNotice(notices)),
]
: emptyState("people", "Nobody has joined yet.", [], "Invite a creator below. Nothing is shared until they say yes."),
),
deliveries.length
? section(
{ title: "Guaranteed reads", line: "Each booked read against the guarantee the brand and the creator agreed." },
table([["Creator"], ["Brand"], ["Format"], ["Delivered", "num"], ["Guaranteed", "num"], ["Status"]], deliveries.map((d) => [
d.name,
d.brandName,
formatName(d.format),
count(d.delivered),
twoLine(count(d.guarantee.units), `at ${d.guarantee.day} days`),
d.met ? status("Met", "good") : JUDGED.includes(d.state) ? status("Short", "warn") : status(BOOKING_STATES[d.state] ?? d.state),
]), { caption: "Guaranteed reads" }),
)
: null,
invitesCard(invites, names, reload),
];
}
function invitesCard(invites, names, reload) {
const invite = narrow(form(
[field("Creator's email", input({ name: "email", type: "email", required: true, maxlength: 254, autocomplete: "off", placeholder: "name@example.com" }))],
"Invite",
async (d, f) => {
await api.post("/v1/manager/invites", { email: String(d.get("email")).trim() });
f.reset();
reload();
return "Invited.";
},
));
invite.classList.add("cn-form--row");
return section(
{ title: "Invites", line: "They are asked to sign in to Orbe with this address and decide. Nothing is shared until they say yes." },
invite,
invites.length
? table([["Creator"], ["Status"], ["Invited"], ["Answered"], [""]], [...invites].reverse().map((i) => {
const [word, tone] = LINK_STATES[i.state] ?? [i.state, null];

const who = (i.creatorId && names.get(i.creatorId)) || i.email;
return [
who,
status(word, tone),
day(i.invitedAt),
i.answeredAt ? day(i.answeredAt) : h("span", { class: "dl-quiet" }, "Not yet"),
["invited", "active"].includes(i.state)
? actions(button(i.state === "invited" ? "Withdraw" : "Remove", async () => {
await api.del(`/v1/manager/invites/${seg(i.id)}`);
reload();
return "Done.";
}, { quiet: true, danger: true, confirm: i.state === "active" ? `Remove ${who} from the roster? You stop seeing their figures at once.` : `Withdraw the invite to ${who}?` }))
: null,
];
}), { cls: "cn-invites-table", caption: "Invites" })
: h("p", { class: "cn-label" }, "No invites yet."),
);
}
async function render(main) {
const body = h("div", { class: "ap-stack" });
const head = screenHead(main, "roster", { line: "The creators you represent, with what each chose to share with you.", tags: [["Shared by consent"]] });
head.append(body);
const reload = () =>
block(body, async () => {
const { manager, terms } = await api.get("/v1/manager/profile");
if (!manager) return { manager, terms };
const [roster, { invites }] = await Promise.all([api.get("/v1/roster"), api.get("/v1/manager/invites")]);
return { manager, roster, invites };
}, ({ manager, terms, roster, invites }) =>
manager
? [...rosterCards(roster, invites, reload), h("p", { class: "cn-label" }, `${manager.org}. Manager terms accepted ${day(manager.termsAcceptedAt)}.`)]
: setup(terms, reload),
);
await reload();
}
});
