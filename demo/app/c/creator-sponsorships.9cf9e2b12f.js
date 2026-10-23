__o.d("js/connect-inline.js", function (__x) {
"use strict";
__o.e(__x, { rememberBack: () => rememberBack, takeBack: () => takeBack, withConsent: () => withConsent, beginSignIn: () => beginSignIn, STATE: () => STATE, AVAILABLE: () => AVAILABLE, statePill: () => statePill, mark: () => mark, readLine: () => readLine, connectBody: () => connectBody, findSource: () => findSource, openConnect: () => openConnect, connectButton: () => connectButton, connectEmpty: () => connectEmpty });
const { api, can, on } = __o.r("js/api.js");
const { drawer, emptyState, pill } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { confirmBox, count, day, field, form, h, input, plural, toast } = __o.r("js/ui.js");
const { CONSENTS } = __o.r("js/terms.js");

const BACK = "orbe.connect.back";
const BACK_FOR_MS = 15 * 60_000;

function rememberBack(path) {
try {
sessionStorage.setItem(BACK, JSON.stringify({ path, at: Date.now() }));
} catch (e) {}
}

function takeBack() {
try {
const raw = sessionStorage.getItem(BACK);
sessionStorage.removeItem(BACK);
const v = raw ? JSON.parse(raw) : null;
return v && Date.now() - v.at < BACK_FOR_MS && typeof v.path === "string" && v.path.startsWith("/orbe-site/demo/app") ? v.path : null;
} catch (e) {
return null;
}
}

async function withConsent(run) {
try {
return await run();
} catch (e) {
if (e.code !== "consent_required") throw e;
const c = CONSENTS.connect;
if (!(await confirmBox(`${c.grants} You can withdraw it at any time. Withdrawing it ${c.revoking[0].toLowerCase()}${c.revoking.slice(1)}`, { title: "Allow Orbe to read what you connect?", yes: "Allow and continue" }))) throw new Error("Nothing was connected.");
await api.post("/v1/me/consents", { scope: "connect" });
return run();
}
}

async function beginSignIn(start, back = location.pathname + location.search) {
rememberBack(back);
const r = await withConsent(() => api.post(start, {}));
location.assign(r.authorizeUrl ?? r.url);
}

const STATE = {
connected: ["done", "Connected"],
public: ["needs", "Read from public data"],
attention: ["failed", "Needs attention"],
not_connected: ["idle", "Not connected"],
};
const AVAILABLE = {
approval: ["needs", "Waiting on the platform"],
unavailable: ["coming", "Not here yet"],
export: ["coming", "Export only"],
coming: ["coming", "Coming"],
};

function statePill(s) {
if (s.state !== "not_connected" || s.availability === "ready") return pill(...STATE[s.state]);
return pill(...(AVAILABLE[s.availability] ?? AVAILABLE.coming));
}

const GLYPH = {
youtube: "play", podcast: "mic", transistor: "mic", buzzsprout: "mic",
substack: "mail", buttondown: "mail", beehiiv: "mail", kit: "mail", mailchimp: "mail", mailcheap: "mail", ghost: "doc",
tiktok: "phone", instagram: "camera", facebook: "megaphone", threads: "megaphone", linkedin: "megaphone", bluesky: "megaphone", x: "megaphone",
stripe: "card", patreon: "earn", adsense: "earn",
dropbox: "folder", google_drive: "folder", dropbox_sign: "doc", notion: "doc", webhooks: "bolt", exports: "grid", mcp: "sparkle",
};
const BY_GROUP = { work: "play", money: "card", post: "megaphone", tools: "plug", ai: "sparkle" };

function mark(s) {
const key = s.id.split(":")[0] === "post" || s.id.split(":")[0] === "tool" ? s.id.split(":")[1] : s.id.split(":")[0];
return h("span", { class: "cn-conn-mark", "data-group": s.group, "aria-hidden": "true" }, icon(GLYPH[key] ?? BY_GROUP[s.group] ?? "plug"));
}

function readLine(s) {
const bits = s.items.map((i) => `${count(i.n)} ${i.label}`);
if (s.backfill) bits.push(`back to ${day(s.backfill.from)}`);
return bits.join(", ");
}

const steps = (...items) => h("ol", { class: "cn-conn-steps" }, items.map((t) => h("li", null, t)));
function signInBody(s, back, close) {
const btn = h("button", { class: "cn-btn", type: "button" }, icon("plug"), s.state === "attention" ? `Reconnect ${s.name}` : `Continue to ${s.name}`);
const status = h("p", { class: "cn-conn-status", role: "status" });
btn.addEventListener("click", async () => {
btn.disabled = true;
status.textContent = `Opening ${s.name}'s sign-in.`;
try {
await beginSignIn(s.connect.start, back);
} catch (e) {
btn.disabled = false;
status.textContent = e.message;
}
});
void close;
return [
steps("Press Continue.", `Sign in on ${s.name}'s own page and allow read access. Orbe never sees your password.`, "You come straight back here, and Orbe starts reading."),
h("div", { class: "cn-conn-go" }, btn),
status,
];
}
function substackBody(s, done) {
const pub = (s.account ?? "").replace(/^https?:\/\//, "");
const where = h("a", { href: pub ? `https://${pub.includes(".") ? pub : `${pub}.substack.com`}/publish/settings#exports` : "https://substack.com/sign-in", target: "_blank", rel: "noopener" }, "your Substack dashboard");
return [
steps(
"Type your publication's address below.",
h("span", null, "Open ", where, " in a new tab."),
"Go to Settings, then Exports, and press Create new export.",
"Download it when Substack is ready (it arrives as a .zip).",
"Open the .zip and find the subscribers file (it ends .csv).",
"Choose that file here and press Upload.",
),
form(
[
field("Publication", input({ name: "publication", required: true, maxlength: 200, placeholder: "yourname.substack.com", value: pub, autocomplete: "url" })),
field("Subscribers file (CSV)", input({ name: "file", type: "file", accept: ".csv,text/csv", required: true }), "Up to 5 MB. Only the owner can download it, so it proves the publication is yours."),
],
"Upload",
async (d, f) => {
const file = d.get("file");
if (!(file instanceof File) || !file.size) throw new Error("Choose the CSV file first.");
if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB.");
const content = await file.text();
const r = await withConsent(() => api.post("/v1/me/uploads/substack_export", { content, filename: file.name, publication: String(d.get("publication")).trim() }));
f.reset();
done(`Substack read: ${r.summary.works ? plural(r.summary.works, "post") : "the export"} on your record.`);
return "Read.";
},
),
];
}
function feedBody(done) {
return [
steps("Copy your show's RSS address from your podcast host.", "Paste it here and press Add.", "Prove it is yours under Podcasts, by a tag, Orbe's prefix or an email to the feed's owner."),
form([field("Feed address", input({ name: "feedUrl", type: "url", required: true, maxlength: 2000, placeholder: "https://", inputmode: "url" }), "The public feed. Nothing changes for listeners.")], "Add", async (d, f) => {
const r = await api.post("/v1/me/podcasts", { feedUrl: String(d.get("feedUrl")).trim() });
f.reset();
done(`${r.show.title} added. Prove it is yours under Podcasts.`);
return "Added.";
}),
];
}
function stripeKeyBody(done) {
return [
steps("In Stripe, open Developers, then API keys.", "Create a restricted key with read access only.", "Paste it here. Orbe refuses a secret key."),
form([field("Restricted key", input({ name: "key", required: true, pattern: "rk_(live|test)_[A-Za-z0-9]+", autocomplete: "off", spellcheck: "false" }), "Starts rk_live_ or rk_test_.")], "Connect", async (d, f) => {
const r = await withConsent(() => api.post("/v1/me/connections/stripe/key", { key: String(d.get("key")).trim() }));
f.reset();
done(`Stripe connected (${r.connected.sourceAccountId}).`);
return "Connected.";
}),
];
}
function keyBody(s, done) {
const controls = s.connect.fields.map((f) => field(f.label, input({ name: f.key, type: f.kind === "secret" ? "password" : f.kind === "url" ? "url" : "text", autocomplete: "off", required: !f.optional }), f.help));
return [
form(controls, "Connect", async (d) => {
const credentials = Object.fromEntries([...d].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
await api.put(s.connect.path, { credentials });
done(`${s.name} connected.`);
return "Connected.";
}),
h("p", { class: "cn-item-d" }, "Sealed before it is stored, and used only when you send or export."),
];
}
function relayBody(s, done) {
const btn = h("button", { class: "cn-btn", type: "button" }, icon("external"), "Open the linking page");
btn.addEventListener("click", async () => {
try {
const r = await api.post(s.connect.path, {});
window.open(r.url, "_blank", "noopener");
done(r.note);
} catch (e) {
toast(e.message);
}
});
return [h("p", null, s.line), h("div", { class: "cn-conn-go" }, btn)];
}

function connectBody(s, { back, close = () => {}, done = () => {} } = {}) {
const head = h("div", { class: "cn-conn-sheet-head" }, mark(s), h("div", null, h("p", { class: "cn-item-t" }, s.name, " ", statePill(s)), h("p", { class: "cn-item-d" }, s.line)));
if (!can("owner")) return [head, h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, "Only the team's owner connects accounts. Ask them to connect it."))];
if (s.availability !== "ready" && s.state === "not_connected") return [head, h("p", { class: "cn-conn-unavailable" }, s.unavailableLine)];
const finish = (line) => {
toast(line);
close();
done(line);
};
const k = s.connect.kind;
const body =
k === "oauth" || k === "integration" ? signInBody(s, back, close)
: k === "substack" ? substackBody(s, finish)
: k === "feed" ? feedBody(finish)
: k === "stripe_key" ? stripeKeyBody(finish)
: k === "key" ? keyBody(s, finish)
: k === "relay" && on("relay") ? relayBody(s, finish)
: k === "page" ? [h("a", { class: "cn-btn", href: s.connect.href }, icon("plug"), "Set it up")]
: [h("p", { class: "cn-item-d" }, "Nothing to connect: it works as it is.")];
return [head, ...body];
}

const findSource = (groups, id) => groups.flatMap((g) => g.sources).find((s) => s.id === id || s.id.startsWith(`${id}:`) || s.id === `post:${id}` || s.id === `tool:${id}`);

function openConnect(id, ctx, { back, done } = {}) {
const here = back ?? location.pathname + location.search;
return drawer("Connect", async (close) => {
let data;
try {
data = await api.get("/v1/me/sources");
} catch (e) {
return h("p", null, e.message);
}
const s = findSource(data.groups, id);
if (!s) return [h("p", null, "That can't be connected here."), h("a", { class: "cn-btn cn-btn--ghost", href: "/orbe-site/demo/app/connections" }, "All connections")];
return [...connectBody(s, { back: here, close, done: (line) => (done ? done(line) : ctx?.reload?.()) }), h("p", { class: "cn-item-d cn-conn-more" }, h("a", { href: "/orbe-site/demo/app/connections" }, "All your connections"))];
});
}

const connectButton = (id, label, ctx, opts = {}) =>
h("button", { class: `cn-btn${opts.ghost ? " cn-btn--ghost" : ""}`, type: "button", onclick: () => openConnect(id, ctx, opts) }, icon("plug"), label);

function connectEmpty(iconName, text, more, ctx) {
const all = ["All connections", "/orbe-site/demo/app/connections"];
const box = h("div", null, emptyState(iconName, text, [all], more));
if (!can("content")) return box;
api.get("/v1/me/sources").then((r) => {
const ready = new Set((r.groups.find((g) => g.id === "work")?.sources ?? []).filter((x) => x.availability === "ready").map((x) => x.id.split(":")[0]));
const ways = [
ready.has("youtube") ? ["Connect YouTube", () => openConnect("youtube", ctx)] : null,
on("podcasts") && ready.has("podcast") ? ["Add a podcast feed", () => openConnect("podcast", ctx)] : null,
ready.has("substack") ? ["Add your Substack", () => openConnect("substack", ctx)] : null,
].filter(Boolean);
if (ways.length) box.replaceChildren(emptyState(iconName, text, [...ways.map(([label, go], i) => [label, go, i === 0]), all], more));
}, () => {});
return box;
}
});
__o.d("js/creator/deals.js", function (__x) {
"use strict";
__o.e(__x, { finderTab: () => finderTab, assistantTab: () => assistantTab, dealsFeatures: () => dealsFeatures });
const { api, can, on, seg } = __o.r("js/api.js");
const { emptyState, pill, section, segmented, skeleton } = __o.r("js/console-ui.js");
const { connectEmpty } = __o.r("js/connect-inline.js");
const { formatName } = __o.r("js/terms.js");
const { action, block, confirmBox, count, day, field, form, h, input, money, textarea, toast, when } = __o.r("js/ui.js");

const STAGE_WORDS = { found: "Found", drafted: "Drafted", waiting: "Waiting on you", countered: "Countered", agreed: "Agreed", closed: "Closed" };
const STAGE_TONE = { found: "idle", drafted: "idle", waiting: "needs", countered: "running", agreed: "done", closed: "off" };
const fmt = (f) => formatName(f).toLowerCase();
const row = (...btns) => h("div", { class: "cn-dw-actions" }, btns);

function disclosureLine(d) {
const all = d.labelled + d.unclear + d.noneSeen;
if (!all) return null;
if (d.labelled === all) return "Always labelled as an ad.";
if (!d.labelled) return `No clear ad label seen in ${all === 1 ? "the read" : `${all} reads`}. Orbe may not see a spoken one.`;
return `Labelled clearly in ${d.labelled} of ${all}${d.unclear ? `, unclearly in ${d.unclear}` : ""}. Orbe may not see a spoken label.`;
}

const like = (acc) => `${acc.peerWord ?? "channels"} like yours`;
function brandRow(b, acc, goAssistant) {
const more = h("details", { class: "dl-fold" }, h("summary", null, `Where it was seen (${b.evidence.length})`),
h("ul", { class: "cn-evidence" },
b.evidence.map((e) =>
h("li", null,
h("p", { class: "cn-evidence-t" }, `${day(e.date)}, ${e.placement.toLowerCase()}${e.creator ? `, ${e.creator}` : ""}`),
e.seen ? h("p", { class: "cn-evidence-q" }, `“${e.seen}”`) : null,
e.url ? h("a", { href: e.url, target: "_blank", rel: "noopener" }, "Open the public work") : null,
),
),
),
);
const draft =
on("deals_agent") && can("business")
? action("Draft outreach", async () => {
const made = await api.post("/v1/me/deals/threads", { brandName: b.name });
await api.post(`/v1/me/deals/threads/${seg(made.thread.id)}/outreach`, {});
goAssistant?.();
return `A draft to ${b.name} is waiting under Assistant. Nothing has been sent.`;
})
: null;
return h("li", { class: "cn-brand" },
h("div", { class: "cn-brand-main" },
h("p", { class: "cn-brand-name" }, b.name, " ", b.confirmed ? null : h("span", { class: "cn-tag" }, "Detected name")),
h("p", { class: "cn-brand-line" }, `Seen with ${count(b.peers)} ${like(acc)}, ${count(b.deals)} reads, most recently ${day(b.lastSeen)}. Usually: ${b.typicalFormat.toLowerCase()}.`),
disclosureLine(b.disclosure) ? h("p", { class: "cn-brand-line cn-brand-line--quiet" }, disclosureLine(b.disclosure)) : null,
b.settled ? h("p", { class: "cn-brand-line" }, `Orbe settled ${count(b.settled.count)} bookings with them at ${money(b.settled.low)} to ${money(b.settled.high)}.`) : null,
more,
),
draft ? row(draft) : null,
);
}
function finderTab(el, goAssistant) {
el.replaceChildren(skeleton(4));
return block(el, () => api.get("/v1/me/sponsor-finder"), ({ accounts }) => {
if (!accounts.length) return connectEmpty("search", "Connect an account or add your show first.", "Orbe finds creators like you from your own account.", { reload: () => finderTab(el, goAssistant) });

const found = accounts.filter((a) => a.brands.length || a.yourRange.length);
const bare = accounts.filter((a) => !found.includes(a));
const quiet = bare.length
? section(
{ title: found.length ? "Nothing found yet" : "Sponsors like you", line: `For ${bare.map((a) => a.handle).join(", ")}.` },
emptyState("search", bare.some((a) => a.alike ?? a.peers.length) ? "No brands seen with creators like you yet." : "No creators like you found yet.", [], bare.some((a) => a.alike ?? a.peers.length) ? "Orbe reads their public works in the background, each at most once a week. Look again in a day or two." : "As more creators your size join Orbe, this fills in."),
h("details", { class: "dl-fold" }, h("summary", null, "How this is worked out"),
h("ul", { class: "cn-points" }, [...new Set(bare.flatMap((a) => [...a.notes, a.notice]))].map((n) => h("li", null, n))),
),
h("p", { class: "cn-label" }, bare[0].label),
)
: null;
return [...found.map((acc) =>
section(
{ title: acc.handle, line: `${count(acc.alike ?? acc.peers.length)} ${like(acc)}, matched on ${acc.basis === "topic" ? "the words in your titles and your size" : "your size"}.` },
acc.yourRange.length ? h("p", { class: "cn-range" }, "Your own results support ", acc.yourRange.map((r, i) => [i ? "; " : "", h("b", null, `${money(r.low)} to ${money(r.high)}`), ` for ${fmt(r.format)}`]), ".") : null,
acc.brands.length
? h("ul", { class: "cn-brands" }, acc.brands.map((b) => brandRow(b, acc, goAssistant)))
: emptyState("search", (acc.alike ?? acc.peers.length) ? `No brands seen with ${like(acc)} yet.` : `No ${like(acc)} found yet.`, [], (acc.alike ?? acc.peers.length) ? "Orbe reads their public works in the background, each at most once a week. Look again in a day or two." : "As more creators your size join Orbe, this fills in."),
acc.withheld.youtube ? h("p", { class: "cn-label" }, `${count(acc.withheld.youtube)} YouTube reads withheld. ${acc.withheld.reason}`) : null,
h("details", { class: "dl-fold" }, h("summary", null, "How this is worked out"),
h("ul", { class: "cn-points" }, [...acc.notes, acc.notice].map((n) => h("li", null, n))),
),
h("p", { class: "cn-label" }, acc.label),
),
), quiet].filter(Boolean);
});
}

function messageView(t, m, reload) {
const [subjectLine, ...rest] = m.body.startsWith("Subject: ") ? m.body.split("\n\n") : [null, m.body];
const who = m.direction === "in" ? t.brandName : m.direction === "note" ? "Orbe's assistant" : m.status === "draft" ? "Draft for you" : "You";
const status = m.status === "draft" ? pill("needs", "Not sent") : m.status === "sent" ? pill("done", `Sent ${when(m.sentAt)}`) : m.status === "sent_by_you" ? pill("done", "Sent by you") : m.status === "discarded" ? pill("idle", "Discarded") : null;
const draftActions =
m.status === "draft" && can("business")
? row(
t.brandEmail
? action("Send", async () => {

const { review } = await api.get(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/review`);
const blocked = review.checks.filter((c) => c.blocking && !c.ok);
if (blocked.length) throw { message: blocked.map((c) => c.text).join(" "), details: blocked.map((c) => ({ path: c.id, message: c.text })) };
const warn = review.checks.filter((c) => !c.blocking && !c.ok).map((c) => c.text);
const sure = await confirmBox([...warn, `Subject: ${review.subject}.`, "Replies go to your own email, and the email carries an unsubscribe link."].join(" "), { title: `Send to ${t.brandEmail}?`, yes: "Send" });
if (!sure) return null;
await api.post(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/send`, {});
reload();
return `Sent to ${t.brandEmail}. Replies come to you.`;
}, { primary: true })
: null,
action("Copy", async () => {
await navigator.clipboard.writeText(m.body.replace(/^Subject: /, ""));
return "Copied.";
}),
action("I sent it myself", async () => {
await api.post(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/mark`, { as: "sent_by_you" });
reload();
return "Marked as sent.";
}),
action("Discard", async () => {
await api.post(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/mark`, { as: "discarded" });
reload();
return "Discarded.";
}, { danger: true }),
)
: null;
return h("article", { class: `cn-msg cn-msg--${m.direction}` },
h("header", { class: "cn-msg-head" }, h("p", { class: "cn-msg-who" }, who), status, h("p", { class: "cn-msg-at" }, when(m.createdAt))),
subjectLine ? h("p", { class: "cn-msg-subject" }, subjectLine.replace(/^Subject: /, "")) : null,
h("p", { class: "cn-msg-body" }, rest.join("\n\n")),
m.facts.length ? h("details", { class: "dl-fold" }, h("summary", null, `Every figure, and where it came from (${m.facts.length})`), h("ul", { class: "cn-points" }, m.facts.map((f) => h("li", null, f.text)))) : null,
m.guidance.length ? h("ul", { class: "cn-points cn-points--guide" }, m.guidance.map((g) => h("li", null, g))) : null,
draftActions,
);
}
function threadView(t, reload) {
const d = h("details", { class: "cn-thread" },
h("summary", { class: "cn-thread-sum" },
h("span", { class: "cn-thread-brand" }, t.brandName),
pill(STAGE_TONE[t.stage], STAGE_WORDS[t.stage]),
h("span", { class: "cn-thread-at" }, when(t.updatedAt)),
),
);
d.addEventListener("toggle", () => {
if (!d.open || d.childElementCount > 1) return;
d.append(
h("div", { class: "cn-thread-body" },
t.messages.map((m) => messageView(t, m, reload)),
!t.brandEmail && can("business")
? form([field("The brand's email address", input({ name: "email", type: "email", required: true, maxlength: 254 }), "So a draft can be sent from Orbe, with replies going to you.")], "Add", async (fd) => {
await api.patch(`/v1/me/deals/threads/${seg(t.id)}`, { brandEmail: String(fd.get("email")).trim() });
reload();
return "Added.";
}, { primary: false })
: null,
can("business")
? row(
t.origin === "finder" && !t.messages.some((m) => m.status === "draft") ? action("Draft outreach", async () => {
await api.post(`/v1/me/deals/threads/${seg(t.id)}/outreach`, {});
reload();
return "Drafted. Nothing has been sent.";
}) : null,
t.stage !== "agreed" ? action("Mark agreed", async () => {
await api.patch(`/v1/me/deals/threads/${seg(t.id)}`, { stage: "agreed" });
reload();
return "Marked agreed.";
}) : null,
t.stage !== "closed" ? action("Close", async () => {
await api.patch(`/v1/me/deals/threads/${seg(t.id)}`, { stage: "closed" });
reload();
return "Closed.";
}, { danger: true }) : null,
)
: null,
),
);
});
return d;
}

function sendingSection(x, reload) {
const status = x.paused ? pill("needs", "Paused") : pill("done", `${x.sentToday} of ${x.dailyLimit} today`);
const checks = x.checks.length ? h("ul", { class: "cn-sendchecks" }, x.checks.map((c) => h("li", { class: c.ok ? "is-ok" : c.blocking ? "is-bad" : "is-warn" }, c.text))) : null;
return section(
{ title: "Sending", line: x.verified ? `From ${x.fromAddress}, your own domain.` : "From Orbe's address, with replies going to you. Your own domain sends once its records check out.", actions: status },
x.paused
? h("div", { class: "cn-banner" }, h("p", null, `Paused: ${x.paused}`), can("owner") ? row(action("Resume", async () => {
await api.post("/v1/me/deals/sender/resume", {});
reload();
return "Resumed.";
}, { primary: true })) : h("p", null, "The team's owner can resume sending."))
: null,
can("owner")
? form([
field("Send from", input({ name: "fromAddress", type: "email", maxlength: 254, value: x.fromAddress ?? "", placeholder: "deals@yourname.com", autocomplete: "off" }), "An address at your own domain. Leave empty to send from Orbe's address."),
field("DKIM selector", input({ name: "dkimSelector", maxlength: 63, value: x.dkimSelector ?? "", placeholder: "pm", autocomplete: "off" }), `Your email provider shows it with the DKIM record. Your domain also needs ${x.returnPath.host} pointing to ${x.returnPath.target}.`),
], "Save and check", async (fd) => {
const from = String(fd.get("fromAddress") ?? "").trim();
await api.put("/v1/me/deals/sender", { fromAddress: from || null, dkimSelector: String(fd.get("dkimSelector") ?? "").trim() || null });
if (from) await api.post("/v1/me/deals/sender/check", {});
reload();
return from ? "Saved and checked." : "Orbe's address sends again.";
}, { primary: false })
: null,
checks,
);
}
function assistantTab(el) {
let filter = "open";
const reload = () =>
block(el, () => Promise.all([api.get("/v1/me/deals"), api.get("/v1/me/deals/sender")]).then(([d, x]) => ({ ...d, sender: x.sender })), ({ assistant: a, threads, sender }) => {
const counts = Object.fromEntries(Object.keys(STAGE_WORDS).map((s) => [s, threads.filter((t) => t.stage === s).length]));
const shown = threads.filter((t) => (filter === "open" ? !["agreed", "closed"].includes(t.stage) : t.stage === filter));
const list = h("div", { class: "cn-threads" });
const draw = () => list.replaceChildren(...(shown.length ? shown.map((t) => threadView(t, reload)) : [emptyState("mail", filter === "open" ? "Nothing open." : `Nothing ${STAGE_WORDS[filter].toLowerCase()}.`, [], a.enabled ? "Offers in Orbe, brands you write to and emails you paste in all appear here." : "Switch on Hand it off, above, to have offers answered as they arrive.")]));
draw();
return [
section(
{ title: "Conversations", line: a.enabled ? "Your rules live in Hand it off, above. Replies and outreach wait for your tap." : "Hand it off, above, is off. Your rules live there.", actions: a.enabled ? pill("done", "On") : pill("idle", "Off") },
segmented("Show", [["open", `Open ${threads.filter((t) => !["agreed", "closed"].includes(t.stage)).length}`], ["waiting", `Waiting on you ${counts.waiting}`], ["countered", `Countered ${counts.countered}`], ["agreed", `Agreed ${counts.agreed}`]], filter, (v) => {
filter = v;
reload();
}, { cls: "cn-seg--scroll" }),
list,
),
can("business")
? section({ title: "A brand emailed you?", line: a.forwardingAddress ? `Forward it to ${a.forwardingAddress}, or paste it here.` : "Paste it here, headers and all. A reply is drafted with a fair-price check; nothing is sent." },
a.forwardingAddress ? h("p", { class: "cn-code-inline" }, h("code", null, a.forwardingAddress)) : null,
form([field("The email", textarea({ name: "email", rows: 6, required: true, maxlength: 50000, placeholder: "From: ...\nSubject: ...\n\nHello ..." }))], "Draft a reply", async (fd, f) => {
const r = await api.post("/v1/me/deals/emails", { email: String(fd.get("email")) });
f.reset();
filter = "open";
reload();
return `Saved, with a draft reply to ${r.thread.brandName}.`;
}),
)
: null,
sendingSection(sender, reload),
];
});
return reload();
}
const dealsFeatures = () => ({ finder: on("sponsor_finder"), assistant: on("deals_agent") });
});
__o.d("js/creator/sponsorships.js", function (__x) {
"use strict";
__o.e(__x, { dealsOf: () => dealsOf, render: () => render });
const { api, can, on, seg } = __o.r("js/api.js");
const { BOOKING_STATES, guaranteeLine, OFFER_STATES, priceLines, windowLine } = __o.r("js/deal.js");
const { FORMATS, formatName, KINDS, unitOf } = __o.r("js/terms.js");
const { drawer, emptyState, pill, sampleTag, screenHead, section, segmented, skeleton, stat, statStrip } = __o.r("js/console-ui.js");
const { connectButton, connectEmpty, findSource } = __o.r("js/connect-inline.js");
const { icon } = __o.r("js/icons.js");
const { action, block, bps, check, confirmBox, count, day, field, form, h, input, money, pounds, select, tabs, textarea, toast, when } = __o.r("js/ui.js");
const { assistantTab, finderTab } = __o.r("js/creator/deals.js");
const { dealHandoff, dealTimeline, handoffCard } = __o.r("js/creator/handoff.js");


const OPEN_BOOKING = ["awaiting_funds", "in_production", "draft_review", "changes_requested", "ready", "live", "short", "make_good", "disputed"];
const DONE_BOOKING = ["verified", "paid"];

const MOVE = {
sent: "you", countered: "brand", awaiting_funds: "brand", in_production: "you", draft_review: "brand", changes_requested: "you",
ready: "you", live: "orbe", short: "you", make_good: "you", disputed: "orbe", verified: "orbe",
};
const MOVE_WORDS = { you: "You", brand: "The brand", orbe: "Orbe is measuring" };
const PILL = {
sent: "needs", countered: "running", accepted: "done", declined: "off", withdrawn: "off", expired: "off",
awaiting_funds: "idle", in_production: "needs", draft_review: "running", changes_requested: "needs", ready: "needs", live: "running",
short: "needs", make_good: "needs", verified: "done", paid: "done", disputed: "needs", cancelled: "off",
};
const STAGE = { ...OFFER_STATES, sent: "Offer waiting for you", countered: "Countered, with the brand", ...BOOKING_STATES };
const sum = (list, f = (x) => x.price) => list.reduce((n, x) => n + (f(x)?.amount ?? 0), 0);
const gbp = (pence, currency = "GBP") => money({ amount: pence, currency });
const lastAt = (x) => (x.audit?.length ? x.audit[x.audit.length - 1].at : null) ?? x.respondedAt ?? x.sentAt ?? x.acceptedAt;

function dealsOf(offers, bookings) {
const booked = new Set(bookings.map((b) => b.offerId));
const fromOffers = offers.filter((o) => !booked.has(o.id) && o.state !== "accepted").map((o) => ({
kind: "offer", id: o.id, x: o, brand: o.brandName, format: o.format, k: o.kind, state: o.state,
group: ["sent", "countered"].includes(o.state) ? "offers" : "closed",
price: o.counters?.length && o.state === "countered" ? o.counters[o.counters.length - 1].price : o.price,
next: o.state === "sent" ? ["Answer by", o.expiresAt] : o.state === "countered" ? ["Brand answers by", o.expiresAt] : null,
at: lastAt(o),
}));
const fromBookings = bookings.map((b) => ({
kind: "booking", id: b.id, x: b, brand: b.brandName, format: b.format, k: b.kind, state: b.state,
group: DONE_BOOKING.includes(b.state) ? "done" : OPEN_BOOKING.includes(b.state) ? "progress" : "closed",
price: b.price,
next: b.state === "awaiting_funds" ? ["Funds by", b.funding?.payBy] : ["in_production", "ready", "make_good"].includes(b.state) ? ["Publish by", b.publishWindow?.end] : b.state === "draft_review" ? ["Review by", b.draft?.reviewBy] : null,
at: lastAt(b),
}));
return [...fromOffers, ...fromBookings].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}
const yours = (d) => MOVE[d.state] === "you";

function moneyStrip(deals) {
const open = deals.filter((d) => d.group === "offers");
const progress = deals.filter((d) => d.group === "progress");
const verified = deals.filter((d) => d.state === "verified");
const paid = deals.filter((d) => d.state === "paid");
const waiting = deals.filter(yours);

if (!deals.length) return null;
return statStrip([
stat({ label: "Waiting on you", value: count(waiting.length), line: waiting.length ? waiting.slice(0, 2).map((d) => d.brand).join(", ") : "Nothing needs you now." }),
open.length ? stat({ label: "Open offers", value: gbp(sum(open)), line: `${count(open.length)} ${open.length === 1 ? "offer" : "offers"}, yours in full` }) : null,
progress.length ? stat({ label: "Booked", value: gbp(sum(progress)), line: `${count(progress.length)} in progress, money held where funded` }) : null,
verified.length ? stat({ label: "Verified", value: gbp(sum(verified)), line: "Delivered and checked, payout next" }) : null,
paid.length ? stat({ label: "Paid out", value: gbp(sum(paid)), line: `${count(paid.length)} paid to you` }) : null,
].filter(Boolean));
}

const FILTERS = [
["all", "All"],
["you", "Waiting on you"],
["offers", "Offers"],
["progress", "In progress"],
["done", "Done"],
["closed", "Closed"],
];
const passes = (d, f) => (f === "all" ? d.group !== "closed" : f === "you" ? yours(d) : d.group === f);
function dealRow(d, open) {
const move = MOVE[d.state];
return h("tr", { class: `dl-row${yours(d) ? " is-yours" : ""}`, tabindex: "0", "data-id": d.id, onclick: () => open(d), onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(d)) },
h("td", { class: "dl-brand" }, h("span", { class: "dl-brand-n" }, d.brand), h("span", { class: "dl-sub" }, `${formatName(d.format, d.k)} on ${KINDS[d.k] ?? d.k}`)),
h("td", { class: "dl-stage" }, pill(PILL[d.state] ?? "idle", STAGE[d.state] ?? d.state)),
h("td", { class: "dl-num" }, money(d.price)),
h("td", { class: "dl-move" }, move ? MOVE_WORDS[move] : h("span", { class: "dl-quiet" }, "Nobody")),
h("td", { class: "dl-next" }, d.next?.[1] ? [h("span", { class: "dl-sub" }, d.next[0]), " ", day(d.next[1])] : h("span", { class: "dl-quiet" }, "None")),
h("td", { class: "dl-at" }, d.at ? day(d.at) : ""),
);
}
function pipeline(deals, ctx) {
let filter = deals.some(yours) ? "you" : "all";
let q = "";
const counts = Object.fromEntries(FILTERS.map(([f]) => [f, deals.filter((d) => passes(d, f)).length]));
const tbody = h("tbody");
const empty = h("div");
const table = h("table", { class: "dl-table" },
h("thead", null, h("tr", null, ["Brand", "Stage", "Price", "Whose move", "Next date", "Updated"].map((t, i) => h("th", { scope: "col", class: i === 2 ? "dl-num" : null }, t)))),
tbody,
);
const draw = () => {
const shown = deals.filter((d) => passes(d, filter) && (!q || d.brand.toLowerCase().includes(q)));
tbody.replaceChildren(...shown.map((d) => dealRow(d, (x) => openDeal(x, ctx))));
table.hidden = !shown.length;
empty.hidden = !!shown.length;
empty.replaceChildren(shown.length ? "" : emptyState("earn", q ? `No deal with "${q}".` : filter === "you" ? "Nothing waits on you." : "Nothing here.", [], filter === "all" ? "Offers from brands, and the bookings they become, appear here." : null));
};
draw();
const search = h("input", { class: "cn-field-input dl-search", type: "search", placeholder: "Find a brand", "aria-label": "Find a brand", oninput: (e) => ((q = e.target.value.trim().toLowerCase()), draw()) });
return section(
{ title: "Pipeline", line: "Every offer and the booking it becomes. Open one for its terms, timeline and evidence.", actions: [sampleTag(), search] },
segmented("Show", FILTERS.map(([f, label]) => [f, `${label} ${counts[f]}`]), filter, (v) => ((filter = v), draw()), { cls: "cn-seg--scroll" }),
h("div", { class: "dl-wrap" }, table),
empty,
);
}

const AUDIT = {
"offer.sent": "Offer sent by the brand", "offer.revised": "Offer revised", "offer.countered": "You countered", "offer.accepted": "You accepted", "offer.declined": "You declined",
"offer.expired": "Offer lapsed unanswered", "offer.withdrawn": "Withdrawn by the brand", "offer.closed_opt_out": "Closed when you opted out",
"booking.opened": "Booking opened", "funding.requested": "Funds asked of the brand", "funding.held": "Money held until delivery is verified", "funding.held_again": "Money held again",
"funding.frozen": "Money frozen", "funding.unfrozen": "Money released from the freeze", "funding.amount_mismatch": "Funded amount did not match", "funding.refund_instructed": "Refund instructed",
"draft.submitted": "Draft sent for review", "draft.changes_requested": "Brand asked for changes", "draft.approved": "Draft approved", "draft.auto_approved": "Draft approved when review time ran out",
"work.live": "Published and linked", "work.make_good_live": "Make-good published", "work.removed": "Work removed", "content.approved": "Brand approved the content",
"delivery.measured": "Delivery read", "delivery.short": "Delivery short of the guarantee", "delivery.verified": "Delivery verified", "remedy.make_good": "Make-good chosen",
"dispute.opened": "Dispute opened", "dispute.resolved": "Dispute resolved", "payout.instructed": "Payout instructed", "payout.confirmed": "Paid out",
"booking.cancelled": "Booking cancelled", "booking.cancelled_by_brand": "Cancelled by the brand", "booking.lapsed_unfunded": "Lapsed: not funded in time", "booking.lapsed_unpublished": "Lapsed: not published in time",
};
const WHO = { buyer: "Brand", creator: "You", system: "Orbe", escrow_partner: "Money held", admin: "Orbe staff", orbe: "Orbe", assistant: "Orbe's assistant" };
function timeline(audit) {
if (!audit?.length) return h("p", { class: "cn-label" }, "No events yet.");
return h("ol", { class: "dl-tl" },
[...audit].reverse().map((e) =>
h("li", { class: "dl-tl-i" },
h("span", { class: "dl-tl-dot", "aria-hidden": "true" }),
h("p", { class: "dl-tl-t" }, AUDIT[e.action] ?? e.title ?? String(e.action ?? "").replace(/[._]/g, " ").replace(/^./, (c) => c.toUpperCase())),

e.why ? h("p", { class: "dl-tl-d dl-tl-why" }, `Why: ${e.why}`) : null,
h("p", { class: "dl-tl-d" }, `${WHO[e.actor?.role] ?? "Orbe"}, ${when(e.at)}`),
),
),
);
}
const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)]));
const dwSec = (title, ...body) => h("section", { class: "cn-dw-sec" }, h("div", { class: "cn-dw-sec-h" }, h("h3", null, title)), ...body);

function workBlock(w) {
const d = w.disclosure;
const open = d ? d.results.filter((r) => r.status !== "met" && r.status !== "attested") : [];
return h("div", { class: "dl-work" },
h("p", { class: "dl-work-t" }, w.workId ? h("a", { href: `/orbe-site/demo/app/works/${seg(w.workId)}` }, w.title) : w.title, w.role === "make_good" ? h("span", { class: "cn-tag cn-tag--straw" }, "Make-good") : null),
h("p", { class: "dl-sub" }, `Published ${day(w.publishedAt)}`, w.url ? [" · ", h("a", { href: w.url, target: "_blank", rel: "noopener" }, "Open it", icon("external"))] : null),
d ? h("p", { class: `dl-disc dl-disc--${d.status}` }, d.status === "pass" ? "Disclosure checked: every required rule is met." : d.status === "fail" ? "Disclosure: a required rule is missing or weak." : "Disclosure: nothing failed, but some rules need your word.") : null,
open.length ? h("ul", { class: "cn-points" }, open.map((r) => h("li", null, `${r.rule} ${r.evidence}`))) : null,
);
}
function readings(b) {
if (!b.measurements?.length) return h("p", { class: "cn-label" }, b.state === "live" ? "Orbe reads delivery at each window from the day it went live." : "No readings yet.");
const unit = unitOf(b.format, b.kind);
return h("table", { class: "dl-mini" },
h("thead", null, h("tr", null, h("th", { scope: "col" }, "Window"), h("th", { scope: "col", class: "dl-num" }, unit.charAt(0).toUpperCase() + unit.slice(1)), h("th", { scope: "col" }, "Read"))),
h("tbody", null, b.measurements.map((m) => h("tr", null, h("td", null, `${m.day} ${m.day === 1 ? "day" : "days"}`), h("td", { class: "dl-num" }, count(m.units)), h("td", null, `${day(m.recordedAt)}, ${m.how.replaceAll("_", " ")}`)))),
);
}
const SOURCE_OF = { youtube: "youtube", podcast: "podcast", substack: "substack" };

function deliverySource(x, ctx) {
const id = SOURCE_OF[x.kind];
const box = h("div", { class: "dl-src" });
if (!id || !["in_production", "draft_review", "changes_requested", "ready", "live", "short", "make_good"].includes(x.state)) return null;
api.get("/v1/me/sources").then(({ groups }) => {
const src = findSource(groups, id);
if (!src) return;
box.replaceChildren(src.state === "connected"
? h("p", { class: "cn-label" }, `Delivery is read from your connected ${src.name} for the exact window.`)
: h("div", { class: "dl-src-row" },
h("p", { class: "dl-notice" }, `${src.name} is not connected, so delivery is read from public counts, which can be provisional. Connected, Orbe reads your own analytics for the exact window.`),
connectButton(id, `Connect ${src.name}`, ctx, { done: () => ctx.reload() }),
));
}).catch(() => {});
return box;
}
function openDeal(d, ctx) {
drawer(`${d.brand}: ${formatName(d.format, d.k)}`, (close) => {
const x = d.x;
const done = () => (close(), ctx.reload());
const head = h("div", { class: "dl-dw-head" },
pill(PILL[d.state] ?? "idle", STAGE[d.state] ?? d.state),
MOVE[d.state] ? h("span", { class: "cn-tag" }, `Next move: ${MOVE_WORDS[MOVE[d.state]]}`) : null,
);
const terms = kv([
...priceLines(x),
["Publish between", windowLine(x.publishWindow)],
d.kind === "offer" && x.state === "sent" ? ["Answer by", when(x.expiresAt)] : null,
d.kind === "booking" ? ["Money", x.funding?.holdStatus === "held" ? `${money(x.funding.total)} held since ${day(x.funding.fundedAt)}` : x.funding?.fundedAt ? `Funded ${day(x.funding.fundedAt)}` : "Not funded yet"] : null,
x.reviewDraft ? ["Draft review", "The brand sees a draft first"] : null,
x.outcome ? ["Outcome", `${x.outcome.reason} You receive ${bps(x.outcome.creatorShareBps)} of the price.`] : null,
]);
return [
on("deals_agent") && can("read.money") ? dealHandoff(d, done) : null,
head,
d.kind === "offer" && x.product ? h("p", { class: "dl-product" }, x.product) : null,
x.message ? h("blockquote", { class: "dl-quote" }, x.message) : null,
x.counters?.length ? h("p", { class: "cn-label" }, `Your counters: ${x.counters.map((c) => `${money(c.price)} on ${day(c.at)}`).join("; ")}.`) : null,
x.declineReason ? h("p", { class: "cn-label" }, `Your reason, kept for you: ${x.declineReason}`) : null,
can("business") ? moves(d, done) : null,
dwSec("Terms", terms, h("p", { class: "dl-guarantee" }, guaranteeLine(x))),
d.kind === "booking" ? dwSec("The work", x.works?.length ? x.works.map(workBlock) : h("p", { class: "cn-label" }, "Not published yet. Link it here once it is live."), readings(x), deliverySource(x, ctx)) : null,
dwSec("Timeline", dealTimeline(d, timeline)),
];
}, { wide: true });
}


function platformId(url) {
try {
const u = new URL(url);
const id = u.hostname.endsWith("youtu.be") ? u.pathname.slice(1) : (u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop());
return (id || url).slice(0, 200);
} catch {
return url.slice(0, 200);
}
}

function libraryPick(b) {
const sel = h("select", { name: "libraryWork", class: "cn-field-input dl-pick" }, h("option", { value: "" }, "Not in the Library yet"));
api.get("/v1/me/works?limit=60&offset=0&sort=newest").then(({ works }) => {
const mine = works.filter((w) => !b.accountId || w.account?.id === b.accountId);
sel.append(...mine.map((w) => h("option", { value: w.id, "data-title": w.title, "data-at": w.publishedAt }, `${w.title}, ${day(w.publishedAt)}`)));
}).catch(() => {});
sel.addEventListener("change", () => {
const o = sel.selectedOptions[0];
const f = sel.form;
if (!o?.value || !f) return;
if (!f.title.value) f.title.value = o.dataset.title;
if (!f.publishedAt.value) f.publishedAt.value = new Date(o.dataset.at).toISOString().slice(0, 16);
});
return field("The work in your Library", sel, "So the deal opens its work page. The work's page shows its figures beside the deal.");
}
function liveForm(b, done, makeGood) {
return form(
[
libraryPick(b),
field("Link to the published work", input({ name: "url", type: "url", required: true, maxlength: 2000, inputmode: "url" })),
field("Title", input({ name: "title", required: true, maxlength: 500 })),
field("Published", input({ name: "publishedAt", type: "datetime-local", required: true }), "In your own time zone."),
field("Description or show notes", textarea({ name: "description", maxlength: 20000 }), "Orbe checks the disclosure in it against UK and US rules and the platform's."),
h("fieldset", { class: "dl-fs" }, h("legend", null, "What you did"), check("The platform's paid promotion label is on", { name: "platformFlag" }), check("I said it was sponsored out loud", { name: "spoken" }), check("It is marked on screen", { name: "onScreen" })),
],
makeGood ? "Link the make-good" : "Link the live work",
async (fd) => {
const url = String(fd.get("url")).trim();
const pid = platformId(url);
const description = String(fd.get("description") ?? "");
await api.post(`/v1/me/sponsorships/bookings/${seg(b.id)}/live`, {
workId: String(fd.get("libraryWork") || "") || `wk_live_${pid}`.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 64),
platformWorkId: pid,
url,
title: String(fd.get("title")).trim(),
publishedAt: new Date(String(fd.get("publishedAt"))).toISOString(),
...(description.trim() ? { description } : {}),
platformFlag: fd.get("platformFlag") === "on",
attestations: { spoken: fd.get("spoken") === "on", onScreen: fd.get("onScreen") === "on", platformFlag: fd.get("platformFlag") === "on" },
...(makeGood ? { makeGood: true } : {}),
});
toast("Linked. Orbe reads delivery at each window from here.");
done();
},
);
}
const fold = (label, ...body) => h("details", { class: "dl-fold" }, h("summary", null, label), ...body);
function moves(d, done) {
const x = d.x;
const box = (...kids) => h("div", { class: "dl-moves" }, ...kids);
if (d.kind === "offer") {
if (x.state !== "sent") return null;

const accept = fold("Accept",
h("p", { class: "dl-notice" }, d.notice ?? ""),
form([check("I have read this and want to accept.", { name: "seen", required: true })], "Accept the offer", async () => {
await api.post(`/v1/me/sponsorships/offers/${seg(x.id)}/accept`, { noticeShown: true });
toast("Accepted. The booking is in your pipeline.");
done();
}),
);
accept.classList.add("dl-fold--primary");
return box(
accept,
fold("Counter",
form([field("Your price for the whole offer (£)", input({ name: "price", type: "number", min: "0.01", step: "0.01", required: true, inputmode: "decimal" }), "Yours in full: Orbe's fee is paid by the brand on top."), field("A note (optional)", textarea({ name: "note", maxlength: 1000 }))], "Send the counter", async (fd) => {
const note = String(fd.get("note") ?? "").trim();
await api.post(`/v1/me/sponsorships/offers/${seg(x.id)}/counter`, { price: Number(fd.get("price")), ...(note ? { note } : {}) });
toast("Counter sent.");
done();
}),
),
fold("Decline",
form([field("Why (optional, kept for you only)", textarea({ name: "reason", maxlength: 1000 }))], "Decline the offer", async (fd) => {
const reason = String(fd.get("reason") ?? "").trim();
await api.post(`/v1/me/sponsorships/offers/${seg(x.id)}/decline`, reason ? { reason } : {});
toast("Declined.");
done();
}, { primary: false }),
),
);
}
const draft = () =>
fold(x.state === "changes_requested" ? "Send a new draft" : "Send a draft for review",
form([field("A note for the brand", textarea({ name: "note", maxlength: 2000 }), "Where to find the draft, and anything they should know.")], "Send the draft", async (fd) => {
const note = String(fd.get("note") ?? "").trim();
await api.post(`/v1/me/sponsorships/bookings/${seg(x.id)}/draft`, note ? { note } : {});
toast("Draft sent.");
done();
}),
);
const live = (mg) => fold(mg ? "Link the make-good" : "Link the published work", liveForm(x, done, mg));
switch (x.state) {
case "awaiting_funds":
return box(h("p", { class: "dl-notice" }, `Waiting for ${x.brandName} to fund it, by ${when(x.funding.payBy)}. Do not start until it is funded.`));
case "in_production":
return box(x.reviewDraft ? draft() : live(false));
case "changes_requested":
return box(draft());
case "draft_review":
return box(h("p", { class: "dl-notice" }, `With ${x.brandName}${x.draft?.reviewBy ? ` until ${when(x.draft.reviewBy)}; after that it is approved for them` : ""}.`));
case "ready":
return box(live(false));
case "short":
return box(
h("p", { class: "dl-notice" }, `Delivery fell short of the guarantee. Choose: publish a make-good within ${x.shortfall.makeGoodDays} days, or be paid in proportion, never under ${bps(x.shortfall.floorBps)} of the price.`),
h("div", { class: "cn-dw-actions" },
action("Make it good", async () => {
await api.post(`/v1/me/sponsorships/bookings/${seg(x.id)}/remedy`, { choice: "make_good" });
done();
return "Make-good chosen.";
}, { primary: true }),
action("Take pro rata", async () => {
await api.post(`/v1/me/sponsorships/bookings/${seg(x.id)}/remedy`, { choice: "pro_rata" });
done();
return "Pro rata chosen.";
}, { confirm: "Take the pro rata payment? This settles the booking." }),
),
);
case "make_good":
return box(live(true));
default:
return null;
}
}

function sharesSection(status, deals, reload) {
if (!status.shares.length) return null;
const nameOf = (id) => deals.find((d) => d.x.brandId === id)?.brand ?? "A brand";
return section(
{ title: "Who sees your private figures", line: "Accepting an offer lets that brand see the delivery figures Orbe reads for the sponsored work. Stopping removes them from its report." },
h("ul", { class: "cn-list" }, status.shares.map((s) =>
h("li", { class: "cn-item cn-item--row" },
h("div", { class: "cn-item-main" }, h("p", { class: "cn-item-t" }, nameOf(s.brandId)), h("p", { class: "cn-item-d" }, `Since ${day(s.grantedAt)}`)),
can("consent") ? action("Stop sharing", async () => {
await api.del(`/v1/me/sponsorships/shares/${seg(s.brandId)}`);
reload();
return "Stopped. Your private figures are out of their report.";
}, { danger: true, confirm: "Stop sharing your figures with this brand? They are removed from its campaign report." }) : null,
),
)),
);
}

function pricesTab(el, status, refresh) {
const here = { reload: refresh };
el.replaceChildren(skeleton(4));
block(el, () => api.get("/v1/me"), (me) => {
const s = status.settings;
const offering = (accountId, format) => s.offerings.find((o) => o.accountId === accountId && o.format === format);
const rowsFor = me.accounts.flatMap((a) =>
FORMATS.filter((f) => f.kind === a.kind).map((f) => {
const o = offering(a.id, f.format);
const key = `${a.id}|${f.format}`;
return h("tr", null,
h("th", { scope: "row" }, h("span", { class: "dl-brand-n" }, f.name), h("span", { class: "dl-sub" }, a.handle || KINDS[a.kind])),
h("td", null, input({ name: `price:${key}`, type: "number", min: "0.01", step: "0.01", value: o?.price ? String(pounds(o.price)) : "", inputmode: "decimal", "aria-label": `Price for ${f.name} on ${a.handle || KINDS[a.kind]}, in pounds`, class: "cn-field-input dl-price" })),
h("td", null, select([["off", "Not offered"], ["on", "Taking bookings"], ["paused", "Offered, paused"]], { name: `state:${key}`, value: o ? (o.available ? "on" : "paused") : "off", "aria-label": `Status for ${f.name}` })),
);
}),
);
const blackouts = s.blackouts.map((b, i) => check(`${day(b.start)} to ${day(b.end)}`, { name: `keep:${i}`, checked: true }));
const save = form(
[
rowsFor.length
? h("div", { class: "dl-wrap" }, h("table", { class: "dl-table dl-table--form" }, h("thead", null, h("tr", null, h("th", { scope: "col" }, "Placement"), h("th", { scope: "col" }, "Your price (£)"), h("th", { scope: "col" }, "Status"))), h("tbody", null, rowsFor)))
: connectEmpty("link", "Connect an account first: you sell placements on accounts Orbe has read.", null, here),
h("div", { class: "cn-grid2" },
field("Categories you will not work with", input({ name: "excluded", value: s.excludedCategories.join(", "), maxlength: 600 }), "Separated by commas, for example gambling, alcohol."),
field("Days of notice you need", input({ name: "notice", type: "number", min: "0", max: "365", step: "1", value: String(s.minNoticeDays), required: true })),
field("Your subject (optional)", input({ name: "vertical", value: s.vertical ?? "", maxlength: 40 }), "For matching, for example finance or cooking."),
field("Pounds to one US dollar (optional)", input({ name: "usdRate", type: "number", min: "0.0001", max: "1000", step: "0.0001", inputmode: "decimal", value: s.usdRate ?? "" }), "Some suggested prices start from published rates in US dollars. Give the rate to convert them at, for example 0.79; Orbe does not guess one."),
),
h("fieldset", { class: "dl-fs" }, h("legend", null, "Dates you are not available"), blackouts.length ? blackouts : h("p", { class: "cn-label" }, "None."),
h("div", { class: "cn-grid2" }, field("From", input({ name: "bFrom", type: "date" })), field("To", input({ name: "bTo", type: "date" })))),
],
"Save prices and settings",
async (fd) => {
const offerings = [];
for (const a of me.accounts)
for (const f of FORMATS.filter((x) => x.kind === a.kind)) {
const key = `${a.id}|${f.format}`;
const state = fd.get(`state:${key}`);
if (state === "off") continue;
const price = String(fd.get(`price:${key}`) ?? "").trim();
offerings.push({ accountId: a.id, format: f.format, ...(price ? { price: Number(price) } : {}), available: state === "on" });
}
const kept = s.blackouts.filter((_, i) => fd.get(`keep:${i}`) === "on");
const from = String(fd.get("bFrom") ?? "");
const to = String(fd.get("bTo") ?? "");
if (from && to) kept.push({ start: from, end: to });
const vertical = String(fd.get("vertical") ?? "").trim();
await api.put("/v1/me/sponsorships/settings", {
offerings,
excludedCategories: String(fd.get("excluded") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
minNoticeDays: Number(fd.get("notice")),
blackouts: kept,
...(vertical ? { vertical } : {}),
...(Number(fd.get("usdRate")) > 0 ? { usdRate: Number(fd.get("usdRate")) } : {}),
});
refresh();
return "Saved.";
},
);
return section({ title: "Prices and settings", line: "What brands in the network can book, at your price. Orbe's fee is paid by the brand on top." }, can("business") ? save : h("p", { class: "cn-label" }, "Your role on this team can see prices but not change them."));
});
}

function windowText(w, unit) {
if (w.median === null) return w.note ?? "Not enough readings yet.";
return `${count(w.median)} ${unit} typical, middle half ${count(w.p25)} to ${count(w.p75)}, from ${count(w.n)} works`;
}

function priceNudge(price, sug) {
if (!price || sug?.status !== "suggested") return null;
if (price.amount > sug.high.amount * 1.5) return `Well above the ${money(sug.low)} to ${money(sug.high)} your results support; brands may pass.`;
if (price.amount < sug.low.amount * 0.67) return `Well below the ${money(sug.low)} to ${money(sug.high)} your results support.`;
return null;
}
function inventoryTab(el) {
el.replaceChildren(skeleton(4));
block(el, () => api.get("/v1/me/sponsorships/inventory"), ({ inventory: inv }) => [
inv.items.length
? h("div", { class: "dl-inv" }, inv.items.map((it) => {
const unit = it.stats.unit ?? unitOf(it.format, it.kind);
const sug = it.suggestion;
return section(
{ title: `${it.name} on ${it.handle}`, line: it.description, actions: it.available ? pill("live", "Taking bookings") : pill("idle", "Paused") },
statStrip([
stat({ label: "Your price", value: it.listPrice ? money(it.listPrice) : "Not set", line: priceNudge(it.listPrice, sug) }),
sug?.status === "suggested" ? stat({ label: sug.provisional ? "Orbe suggests, provisionally" : "Orbe suggests", value: `${money(sug.low)} to ${money(sug.high)}`, line: sug.per === "hour" ? "An hour" : null }) : null,
it.stats.consistency !== null ? stat({ label: "Steadiness", value: `${Math.round(it.stats.consistency * 100)} in 100` }) : null,
]),
kv(it.stats.windows.map((w) => [`At ${w.day} ${w.day === 1 ? "day" : "days"}`, windowText(w, unit)])),

sug?.status === "suggested" && sug.reasons.length ? h("details", { class: "dl-fold" }, h("summary", null, "How this is worked out"), h("ul", { class: "cn-points" }, sug.reasons.map((r) => h("li", null, r)))) : sug && sug.status !== "suggested" ? h("p", { class: "cn-label" }, sug.reason) : null,
);
}))
: emptyState("earn", "Nothing offered yet.", [], "Set a price under Prices and it appears here with what your results support."),
inv.geography.map((g) =>
g.status === "shown"
? section({ title: "Audience by country", line: g.measure }, kv(g.shares.slice(0, 8).map((s) => [s.country, `${Math.round(s.share * 100)}%`])))
: h("p", { class: "cn-label" }, g.reason),
),
[...inv.ratings.map((r) => r.notice), ...inv.notes].map((n) => h("p", { class: "cn-label" }, n)),
]);
}


function optInSection(reload) {
return h("section", { class: "dl-optin", "aria-label": "Take sponsorships through Orbe" },
h("div", { class: "dl-optin-text" },
h("p", { class: "dl-optin-t" }, "Take sponsorships through Orbe"),
h("p", { class: "dl-optin-d" }, "Brands in the network see what you offer and your prices; money is held until delivery is verified.")),
can("consent")
? h("details", { class: "dl-fold dl-fold--primary" }, h("summary", null, "Opt in"),
h("div", { class: "dl-optin-more" },
h("p", null, "Brands in Orbe's network see what you offer, your prices and your public figures. Your private figures go to one brand only, and only when you accept its offer."),
h("p", null, "The brand pays before you start; the money is held until delivery is verified, then paid to you. Orbe's fee is paid by the brand, on top of your price. Orbe stays free for creators."),
form([check("I want brands in the network to see my offerings.", { name: "accept", required: true })], "Opt in", async () => {
await api.post("/v1/me/sponsorships/opt-in", { accept: true });
reload();
return "You are in.";
})))
: h("p", { class: "cn-label" }, "The team's owner decides whether to take sponsorships through Orbe."),
);
}

const undoRow = (label, iconName, question, run) =>
h("button", { class: "cn-item cn-item--row", type: "button", onclick: async () => {
if (!(await confirmBox(question, { yes: label, danger: true }))) return;
try {
toast(await run());
} catch (err) {
toast(err.message);
}
} }, h("span", { class: "cn-item-ico" }, icon(iconName)), h("span", { class: "cn-item-t" }, label));

function more(rows) {
const d = h("details", { class: "cn-menuwrap dl-more" }, h("summary", { class: "cn-btn cn-btn--s", "aria-label": "Sponsorship choices" }, icon("dots")), h("div", { class: "cn-menu cn-menu--end" }, rows));
const away = (e) => {
if (!d.contains(e.target)) d.open = false;
};
d.addEventListener("toggle", () => (d.open ? document.addEventListener("click", away) : document.removeEventListener("click", away)));
d.addEventListener("click", (e) => e.target.closest(".cn-item") && (d.open = false));
d.addEventListener("keydown", (e) => {
if (e.key !== "Escape" || !d.open) return;
e.stopPropagation();
d.open = false;
d.querySelector("summary").focus();
});
return d;
}

function statusBar(status, reload) {
const findable = on("brand_data") && status.discoverable;
const undo = can("consent")
? [
findable ? undoRow("Stop being discoverable", "search", "Leave every brand search now? You can come back at any time.", async () => {
const r = await api.del("/v1/me/sponsorships/discoverable");
reload();
return r.removed[0];
}) : null,
undoRow("Opt out", "close", "Opt out? Open offers close; bookings you have agreed stay.", async () => {
await api.del("/v1/me/sponsorships/opt-in");
reload();
return "Opted out.";
}),
]
: [];
const join = on("brand_data") && !status.discoverable && can("consent")
? fold("Let brands find you",
h("p", { class: "dl-notice" }, status.discoverableNotice),
form([check("I have read this and want brands to be able to find me.", { name: "seen", required: true })], "Make me discoverable", async () => {
await api.post("/v1/me/sponsorships/discoverable", { noticeShown: true });
reload();
return "You are discoverable.";
}),
)
: null;
return h("div", { class: "dl-status" },
pill("live", findable ? "Opted in, discoverable" : "Opted in"),
h("p", { class: "dl-status-t" }, `Orbe's fee is ${bps(status.takeRate.networkBps)}, paid by the ${status.takeRate.payer} on top of your price.`),
h("div", { class: "dl-status-acts" },
join,
undo.length ? more(undo) : null,
),
);
}

async function render(main, ctx) {
const body = h("div", { class: "dl" });
screenHead(main, "sponsorships", { title: "Deals", line: "Every deal in one place: offers priced from your verified record, bookings paid in full only when delivery is verified.", tags: [["Live", "sky"], ["Paid on verified delivery"]] }).append(body);

let asked = ctx.query.get("handoff");
if (asked) {
const u = new URL(location.href);
u.searchParams.delete("handoff");
history.replaceState(history.state, "", u);
}

const reload = (opts = {}) => {
body.replaceChildren(skeleton(6));
return block(
body,
() => Promise.all([api.get("/v1/me/sponsorships"), api.get("/v1/me/sponsorships/offers"), api.get("/v1/me/sponsorships/bookings")]),
([status, { offers, notice }, { bookings }]) => {
const deals = dealsOf(offers, bookings).map((d) => (d.kind === "offer" ? { ...d, notice } : d));
const here = { reload };
const wanted = opts.open?.offerId ? deals.find((d) => d.x.offerId === opts.open.offerId) ?? deals.find((d) => d.id === opts.open.offerId) : null;
if (wanted) queueMicrotask(() => openDeal(wanted, here));

const handoff = on("deals_agent") && can("read.money") ? handoffCard({ notice, reload, focus: asked }) : null;
asked = null;
const goAssistant = () => document.getElementById("tab-deals-assistant")?.click();
const extra = [
on("sponsor_finder") ? { id: "finder", label: "Sponsors like you", render: (el) => finderTab(el, on("deals_agent") ? goAssistant : null) } : null,
on("deals_agent") ? { id: "assistant", label: "Assistant", render: assistantTab } : null,
].filter(Boolean);


if (!status.optedIn && !deals.length) return [moneyStrip(deals), handoff, optInSection(reload), extra.length ? tabs("deals", extra, ctx.query.get("tab")) : null];
return [
moneyStrip(deals),
handoff,
status.optedIn ? statusBar(status, reload) : optInSection(reload),
tabs("deals", [
{ id: "pipeline", label: "Pipeline", render: (el) => el.append(pipeline(deals, here), sharesSection(status, deals, reload) ?? "") },
status.optedIn ? { id: "prices", label: "Prices", render: (el) => pricesTab(el, status, reload) } : null,
status.optedIn ? { id: "inventory", label: "Inventory", render: inventoryTab } : null,
...extra,
].filter(Boolean), ctx.query.get("tab")),
];
},
);
};
await reload();
}
});
