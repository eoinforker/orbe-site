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
__o.d("js/creator/connect.js", function (__x) {
"use strict";
__o.e(__x, { connections: () => connections, render: () => render });
const { api, can } = __o.r("js/api.js");
const { drawer, emptyState, section, skeleton } = __o.r("js/console-ui.js");
const { screenHead } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { confirmBox, count, day, failure, h, ok, plural, signed, toast, when } = __o.r("js/ui.js");
const { connectBody, mark, readLine, statePill, takeBack } = __o.r("js/connect-inline.js");

const RETURNED = {
denied: "You said no on the platform's screen, so nothing was connected.",
start_from_orbe: "Start the connection from Orbe, so it is tied to your account. Press Connect below.",
invalid_request: "The platform sent back an incomplete answer. Try connecting again.",
invalid_state: "That sign-in link had expired or was started elsewhere. Start again from here.",
};
const NAMES = { youtube_analytics: "YouTube", adsense: "AdSense", patreon: "Patreon", stripe: "Stripe", tiktok: "TikTok", instagram: "Instagram" };

function returned(q) {
const source = NAMES[q.get("source") ?? ""] ?? (q.get("connected") && q.get("connected") !== "1" ? q.get("connected").split(",").join(", ") : "The account");
if (q.get("connected")) return { ok: true, text: `${source} is connected.` };
const code = q.get("error");
if (code) return { ok: false, text: RETURNED[code] ?? `${source} was not connected (${code.replaceAll("_", " ")}). Try again, or write to Orbe if it keeps happening.` };
return null;
}


function firstRead(el, { started }) {
const line = h("p", { class: "cn-conn-progress-t", role: "status", "aria-live": "polite" }, "Reading what you connected.");
const bar = h("span", { class: "cn-conn-progress-bar" });
const extra = h("div", { class: "cn-conn-progress-more" });
el.replaceChildren(h("div", { class: "cn-conn-progress" }, h("span", { class: "cn-conn-progress-track", "aria-hidden": "true" }, bar), line, extra));
const t0 = started ?? Date.now();
let timer = 0;
const tick = async () => {
let p;
try {
p = await api.get("/v1/me/connections/progress");
} catch (e) {
line.textContent = e.message;
return;
}
const secs = Math.round((Date.now() - t0) / 1000);
const reading = p.accounts.filter((a) => a.stage === "reading" || a.stage === "rating");
const works = p.accounts.reduce((t, a) => t + a.works, 0);
const oldest = p.accounts.map((a) => a.backfill?.from).filter(Boolean).sort()[0];
if (!p.accounts.length) {
line.textContent = "Nothing read yet. Connect a source below to start.";
bar.style.inlineSize = "0%";
return;
}
if (p.done) {
bar.style.inlineSize = "100%";
const rated = p.accounts.filter((a) => a.rating);
line.textContent = rated.length
? `Rated ${rated.map((a) => `${a.account} at ${signed(a.rating.rating)}`).join(", ")} against creators your size. ${plural(works, "work")} read${oldest ? `, back to ${day(oldest)}` : ""}.`
: `${plural(works, "work")} read. ${p.accounts.find((a) => a.reason)?.reason ?? "Not enough to rate yet."}`;
extra.replaceChildren(h("a", { class: "cn-btn cn-btn--s", href: "/orbe-site/demo/app/library" }, icon("library"), "See your works"), rated.length ? h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: "/orbe-site/demo/app/" }, "Home") : null);
return;
}
bar.style.inlineSize = `${Math.min(95, 15 + (works / Math.max(works, 200)) * 70)}%`;
line.textContent = reading.some((a) => a.stage === "rating")
? `${plural(works, "work")} read${oldest ? `, back to ${day(oldest)}` : ""}. Rating them against creators your size.`
: `Reading your works${works ? `: ${plural(works, "work")} so far` : ""}.`;
if (secs < 120) timer = setTimeout(tick, secs < 10 ? 1000 : 2500);
else line.textContent += " This is taking longer than usual; it carries on without this page open.";
};
tick();
return () => clearTimeout(timer);
}

function facts(s) {
const bits = [];
if (s.account) bits.push(h("span", null, h("b", null, s.state === "public" ? "Account " : "Connected as "), s.account));
const read = readLine(s);
if (read) bits.push(h("span", null, read));
if (s.lastReadAt) bits.push(h("span", null, `Last read ${when(s.lastReadAt)}`));
if (s.nextReadAt) bits.push(h("span", null, `Next read ${day(s.nextReadAt)}`));
return bits.length ? h("p", { class: "cn-conn-facts" }, bits) : null;
}
function tile(s, { owner, redraw, openSheet }) {
const buttons = [];
if (owner) {
const ready = s.availability === "ready" || s.state !== "not_connected";
if (s.id === "tool:webhooks" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => __o.i("js/creator/connect.js", "../integrations.js").then((m) => m.webhooksDrawer(owner)) }, icon("bolt"), "Webhooks"));
else if (s.id === "tool:exports" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => __o.i("js/creator/connect.js", "../integrations.js").then((m) => m.exportsDrawer()) }, icon("doc"), "Export"));
else if (s.id === "tool:notion" && s.state === "connected") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => __o.i("js/creator/connect.js", "../integrations.js").then((m) => m.notionDrawer()) }, "Send to Notion"));
else if (s.state === "attention" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => openSheet(s) }, icon("plug"), `Reconnect ${s.name}`));
else if (s.state === "public" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => openSheet(s) }, icon("plug"), "Connect to verify"));
else if (s.state === "not_connected" && ready && s.connect.kind !== "none") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => openSheet(s) }, icon("plug"), "Connect"));
else if (s.state === "connected" && s.connect.kind === "substack") buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => openSheet(s) }, "Upload a newer export"));
if (s.refresh && s.state !== "not_connected") buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: (e) => readAgain(s, e.currentTarget, redraw) }, "Read again"));
if (s.connect.kind === "page" && s.id.startsWith("podcast:")) buttons.push(h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: s.connect.href }, "Manage the show"));
if (s.disconnect) buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost cn-conn-off", type: "button", onclick: () => disconnect(s, redraw) }, "Disconnect"));
}
return h("li", { class: `cn-conn-tile cn-conn-tile--${s.state}`, "data-source": s.id },
mark(s),
h("div", { class: "cn-conn-main" },
h("p", { class: "cn-conn-name" }, s.name, statePill(s)),
h("p", { class: "cn-conn-line" }, s.line),
facts(s),
s.attention ? h("p", { class: "cn-conn-attention" }, icon("status"), h("span", null, h("b", null, s.attention.message), " ", s.attention.fix)) : null,
s.state !== "connected" && s.availability !== "ready" && s.unavailableLine ? h("p", { class: "cn-conn-unavailable" }, s.unavailableLine) : null,
),
buttons.length ? h("div", { class: "cn-conn-actions" }, buttons) : null,
);
}
async function readAgain(s, btn, redraw) {
btn.disabled = true;
btn.textContent = "Reading";
try {
const r = await api.post(s.refresh.path, {});
toast(r.note ?? `${s.name} read again.`);
redraw();
} catch (e) {
btn.disabled = false;
btn.textContent = "Read again";
toast(e.message);
}
}
async function disconnect(s, redraw) {
if (!(await confirmBox(s.disconnect.removes, { title: `Disconnect ${s.name}${s.account ? ` (${s.account})` : ""}?`, yes: "Disconnect", danger: true }))) return;
try {
const r = await api.del(s.disconnect.path);
toast(r?.note ?? `${s.name} disconnected.`);
redraw();
} catch (e) {
toast(e.message);
}
}

function summaryLine(sum) {
const bits = [];
bits.push(sum.connected ? plural(sum.connected, "source") + " connected" : "Nothing connected yet");
if (sum.publicOnly) bits.push(`${count(sum.publicOnly)} read from public data`);
if (sum.works) bits.push(`${plural(sum.works, "work")} read`);
if (sum.attention) bits.push(`${plural(sum.attention, "needs", "need")} attention`);
return bits.join(" · ");
}

function group(g, draw) {
const later = g.id === "post" || g.id === "tools" ? g.sources.filter((s) => s.state === "not_connected" && s.availability !== "ready") : [];
const now = g.sources.filter((s) => !later.includes(s));
return section({ title: g.name, line: g.line, cls: `cn-conn-group cn-conn-group--${g.id}` },
now.length ? h("ul", { class: "cn-conn-list" }, now.map(draw)) : null,
later.length
? h("details", { class: "cn-conn-later" },
h("summary", null, `Not here yet: ${later.map((s) => s.name).join(", ")}`),
h("ul", { class: "cn-conn-list" }, later.map(draw)))
: null,
);
}
const ALIAS = { youtube_analytics: "youtube" };

async function connections(el, ctx) {
const owner = can("owner");
const q = ctx.query ?? new URLSearchParams(location.search);
const came = returned(q);
if (came) {
const back = takeBack();
if (back && !back.startsWith(location.pathname)) {
toast(came.text);
return ctx.go(back, { replace: true });
}
}
const notice = h("div");
const progress = h("div");
const body = h("div", { class: "cn-conn" }, skeleton(6));
el.append(h("div", { class: "ap-stack" }, notice, progress, body));
if (came) notice.replaceChildren(came.ok ? ok(came.text) : failure({ message: came.text }));
let stop = () => {};
const draw = async () => {
let data;
try {
data = await api.get("/v1/me/sources");
} catch (e) {
return body.replaceChildren(emptyState("plug", e.message));
}
const openSheet = (s) => drawer(`Connect ${s.name}`, (close) => connectBody(s, { back: location.pathname, close, done: () => draw() }));
body.replaceChildren(...[
h("p", { class: "cn-conn-summary" }, summaryLine(data.summary)),
owner ? null : h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, "Only the team's owner connects or removes sources. You can see what Orbe reads for this team.")),
owner && !data.canConnect ? h("p", { class: "cn-conn-consent" }, icon("shield"), h("span", null, "Connecting starts with your consent to read what you connect. Orbe asks for it as you connect your first source.")) : null,
...data.groups.map((g) => group(g, (s) => tile(s, { owner, redraw: draw, openSheet }))),
].filter(Boolean));

const asked = q.get("connect") ?? (came ? null : q.get("source"));
const here = asked ? (ALIAS[asked] ?? asked) : null;
if (here && owner) {
const s = data.groups.flatMap((g) => g.sources).find((x) => x.id === here || x.id.startsWith(`${here}:`));
if (s) openSheet(s);
}
const reading = data.summary.works === 0 && data.summary.connected + data.summary.publicOnly > 0;
if (((came?.ok && q.get("source")) || reading) && !progress.childElementCount) stop = firstRead(progress, {});
};
await draw();
return () => stop();
}
async function render(main, ctx) {
const head = screenHead(main, "connect", { line: "Everything Orbe reads for you and everything it can post to, with what each one holds. You can stop any of it here." });
await connections(head, ctx);
}
});
