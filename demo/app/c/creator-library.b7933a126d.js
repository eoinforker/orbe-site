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
__o.d("js/creator/library.js", function (__x) {
"use strict";
__o.e(__x, { worksQuery: () => worksQuery, fromAddress: () => fromAddress, toAddress: () => toAddress, render: () => render });
const { api, can, on, seg } = __o.r("js/api.js");
const { ago, cover, emptyState, pill, rating, segmented } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { menu } = __o.r("js/shell.js");
const { openConnect } = __o.r("js/connect-inline.js");
const { virtualTable } = __o.r("js/table.js");
const { count, failure, h, signed, toast } = __o.r("js/ui.js");

const PAGE = 200;

const PICK_MAX = 5000;

const AHEAD = 120;
const KIND_NAMES = { youtube: "YouTube", podcast: "Podcasts", substack: "Newsletters", twitch: "Streams", photography: "Photography" };
const KIND_ONE = { youtube: "YouTube", podcast: "Podcast", substack: "Newsletter", twitch: "Stream", photography: "Photo" };
const KIND_ICON = { youtube: "play", podcast: "pulse", substack: "mail", twitch: "monitor", photography: "image" };
const BANDS = [["", "Any rating"], ["well_above", "Well above typical"], ["above", "Above typical"], ["below", "Below typical"], ["well_below", "Well below typical"], ["unrated", "Not rated yet"]];
const FIXES = [["", "Any Fix status"], ["any", "Has a fix"], ["open", "Fix in progress"], ["kept", "Fix kept"], ["reverted", "Fix put back"], ["none", "No fix"]];
const FIX_WORDS = { proposed: "Proposed", approved: "Approved", applied: "Live", kept: "Kept", reverted: "Put back", cancelled: "Cancelled" };
const FIX_TONE = { proposed: "needs", approved: "needs", applied: "running", kept: "done", reverted: "coming", cancelled: "coming" };
const NAMED_DIR = new Set(["title", "kind", "account"]);
const VIEW_KEY = "library-view";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dayOf = (iso) => (iso ? DAY.format(new Date(iso)) : "");
const COLS_KEY = "library-cols";
const NONE = () => ({ kind: "", account: "", band: "", fix: "", sponsor: false, favourites: false, collection: "", from: "", to: "" });
const recall = (key, fallback) => {
try {
return localStorage.getItem(`orbe.tab.${key}`) ?? fallback;
} catch {
return fallback;
}
};
const keep = (key, value) => {
try {
localStorage.setItem(`orbe.tab.${key}`, value);
} catch {

}
};
const duration = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null);
const strength = (w) => (w.rating ? Math.max(0, Math.min(1, (w.rating.rating + 1.5) / 3)) : 0.3);
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
const age = (d) => (d < 1 ? "Today" : d < 60 ? `${d}d` : d < 730 ? `${Math.round(d / 30)}mo` : `${Math.round(d / 365)}y`);

function worksQuery(st, cursor = null, limit = PAGE) {
const q = new URLSearchParams({ table: "1", limit: String(limit), sort: st.sort, dir: st.dir });
if (st.view === "favourites") q.set("favourites", "1");
else if (st.view.startsWith("kind:")) q.set("kind", st.view.slice(5));
else if (st.view.startsWith("col:")) q.set("collection", st.view.slice(4));
for (const [k, v] of Object.entries(st.filters)) if (v) q.set(k, v === true ? "1" : v);
if (st.q) q.set("q", st.q);
if (cursor) q.set("cursor", cursor);
return `/v1/me/works?${q}`;
}

const SORTS = new Set(["title", "kind", "account", "published", "reach", "rating", "typical", "fix", "sponsor", "deals", "clips", "starred"]);
const ADDRESS = ["view", "q", "sort", "dir", "layout", ...Object.keys(NONE())];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fromAddress(query) {
if (!ADDRESS.some((k) => query.has(k))) return null;
const filters = NONE();
for (const k of Object.keys(filters)) {
const v = query.get(k);
if (v === null) continue;
if (typeof filters[k] === "boolean") filters[k] = v === "1";
else if ((k !== "from" && k !== "to") || DATE.test(v)) filters[k] = v.slice(0, 100);
}
const sort = SORTS.has(query.get("sort")) ? query.get("sort") : "published";
const dir = ["asc", "desc"].includes(query.get("dir")) ? query.get("dir") : NAMED_DIR.has(sort) ? "asc" : "desc";


const named = query.get("view") ?? "";
const view = named === "favourites" || /^(?:kind:[a-z_]{1,40}|col:[\w-]{1,80})$/.test(named) ? named : "all";
const layout = query.get("layout") ?? (named === "gallery" || named === "table" ? named : null);
return { view, q: (query.get("q") ?? "").trim().slice(0, 100), sort, dir, filters, mode: layout === "gallery" || layout === "table" ? layout : "" };
}

function toAddress(st) {
const p = new URLSearchParams();
if (st.view !== "all") p.set("view", st.view);
for (const [k, v] of Object.entries(st.filters)) if (v) p.set(k, v === true ? "1" : v);
if (st.q) p.set("q", st.q);
if (st.sort !== "published") p.set("sort", st.sort);
if (st.dir !== (NAMED_DIR.has(st.sort) ? "asc" : "desc")) p.set("dir", st.dir);
if (st.mode === "gallery") p.set("layout", "gallery");
const q = p.toString();
return `/orbe-site/demo/app/library${q ? `?${q}` : ""}`;
}

function savedFilters(ctx) {
try {
const kept = JSON.parse(localStorage.getItem(`orbe.tab.library-filters.${ctx.user?.person?.id ?? ctx.user?.id ?? ""}`) || "{}");
return Object.fromEntries(Object.entries(kept).filter(([k, v]) => k in NONE() && typeof v === typeof NONE()[k]));
} catch {
return {};
}
}
async function render(main, ctx) {

if (ctx.query.get("work")) return ctx.go(`/orbe-site/demo/app/works/${seg(ctx.query.get("work"))}`, { replace: true });
const filtersKey = `library-filters.${ctx.user?.person?.id ?? ctx.user?.id ?? ""}`;
const st = fromAddress(ctx.query) ?? { view: "all", q: "", sort: "published", dir: "desc", filters: { ...NONE(), ...savedFilters(ctx) }, mode: "" };
st.mode ||= recall(VIEW_KEY, "");

const kept = history.state?.library ?? null;
const writeAddress = () => {
const to = toAddress(st);
if (to !== location.pathname + location.search) history.replaceState(history.state, "", to);
};
const holdPlace = () => history.replaceState({ ...history.state, library: { picked: [...selection].slice(0, PICK_MAX), top: table?.body.scrollTop ?? 0, y: window.scrollY } }, "", location.href);
let hidden = new Set(recall(COLS_KEY, "age,typical").split(",").filter(Boolean));
let data = null;
let rows = [];
let cursor = null;
let fetching = null;
let generation = 0;
let table = null;
const selection = new Set();
const phone = matchMedia("(max-width: 720px)");
const side = h("nav", { class: "cn-lib-side", "aria-label": "Library" });
const title = h("h1", { class: "cn-lib-title", tabindex: "-1", "data-title": "" }, "Library");
const countEl = h("span", { class: "cn-lib-count" });
const stage = h("div", { class: "cn-lib-stage", "aria-live": "polite" });
const more = h("div", { class: "cn-more" });
const bulkBar = h("div", { class: "cn-bulk", hidden: true, role: "region", "aria-label": "Selected works" });
const filterBar = h("div", { class: "cn-lib-filters" });
const searchInput = h("input", { class: "cn-field-input", type: "search", placeholder: "Search", "aria-label": "Search your works by title", autocomplete: "off", maxlength: 100, value: st.q });

let timer = null;
let whole = null;

let searched = Boolean(st.q);
searchInput.addEventListener("input", () => {
clearTimeout(timer);
const q = searchInput.value.trim();
const pool = whole ?? (data && !cursor && !searched ? { data, rows } : null);
if (pool) {
whole = pool;
st.q = q;
writeAddress();
const words = q.toLowerCase();
rows = q ? pool.rows.filter((w) => w.title.toLowerCase().includes(words)) : [...pool.rows];
data = { ...pool.data, total: rows.length };
countEl.textContent = q ? `${count(rows.length)} of ${count(pool.data.total)}` : `${count(pool.data.total)} ${pool.data.total === 1 ? "work" : "works"}`;
draw();
return;
}
timer = setTimeout(() => {
st.q = q;
load(false, true);
}, 150);
});
const modes = segmented("View", [["table", "Table", "list"], ["gallery", "Gallery", "grid"]], st.mode || "table", (v) => {
st.mode = v;
keep(VIEW_KEY, v);
writeAddress();
draw();
}, { cls: "cn-seg--s", iconOnly: true });

const colsMenu = menu([icon("sliders"), h("span", null, "Columns")], () => colRows(), { cls: "cn-btn cn-btn--s", panel: "cn-menu--end cn-menu--cols", aria: "Columns to show" });
const colsBtn = colsMenu.firstChild;
const exportBtn = h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => exportCsv(false) }, icon("doc"), "Export");
main.append(
h("div", { class: "cn-lib" },
side,
h("section", { class: "cn-lib-main" },
h("header", { class: "cn-lib-head" },
h("div", null, title, countEl),
filterBar,
h("div", { class: "cn-lib-tools" },
on("media") && can("content") ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: "/orbe-site/demo/app/media" }, icon("plus"), "Drop in a video") : null,
h("label", { class: "cn-field" }, icon("search"), searchInput),
modes,
colsMenu,
exportBtn,
),
),
bulkBar,
stage,
more,
),
),
);
const viewName = () => {
if (st.view === "all") return "Library";
if (st.view === "favourites") return "Starred";
if (st.view.startsWith("kind:")) return KIND_NAMES[st.view.slice(5)] ?? st.view.slice(5);
return data?.collections.find((c) => `col:${c.id}` === st.view)?.name ?? "Collection";
};
function drawSide() {
const link = (view, ico, text, n) =>
h("button", { class: "cn-lib-link", type: "button", "aria-current": String(st.view === view), onclick: () => { st.view = view; load(); } },
icon(ico), h("span", null, text), n === null ? null : h("span", { class: "cn-lib-n" }, count(n)));
const kinds = Object.entries(data?.counts.byKind ?? {}).sort((a, b) => b[1] - a[1]);

const adder = can("content") ? h("button", { class: "cn-lib-add", type: "button", "aria-label": "New collection", title: "New collection", onclick: () => newCollection() }, icon("plus")) : null;
side.replaceChildren(...[
h("p", { class: "cn-menu-group" }, "Library"),
link("all", "library", "All", data?.counts.all ?? null),
link("favourites", "star", "Starred", data?.counts.favourites ?? null),

on("media") ? h("a", { class: "cn-lib-link", href: "/orbe-site/demo/app/media" }, icon("play"), h("span", null, "Videos")) : null,
kinds.length > 1 ? [h("p", { class: "cn-menu-group" }, "By kind"), kinds.map(([k, n]) => link(`kind:${k}`, KIND_ICON[k] ?? "doc", KIND_NAMES[k] ?? k, n))] : null,
h("p", { class: "cn-menu-group" }, h("span", null, "Collections"), adder),
(data?.collections ?? []).map((c) => link(`col:${c.id}`, "folder", c.name, c.count)),
data && !data.collections.length ? h("p", { class: "cn-hist-empty cn-lib-hint" }, "Group works to send or compare.") : null,
].flat(Infinity).filter(Boolean));
}
function newCollection(then) {
const field = h("input", { type: "text", maxlength: 60, placeholder: "Name the collection", "aria-label": "Collection name" });
const row = h("form", { class: "cn-lib-new" }, field, h("button", { class: "cn-btn cn-btn--xs", type: "submit" }, "Add"));
row.addEventListener("submit", async (e) => {
e.preventDefault();
const name = field.value.trim();
if (!name) return;
try {
const { collection } = await api.post("/v1/me/collections", { name });
if (then) return then(collection);
st.view = `col:${collection.id}`;
await load();
} catch (err) {
row.after(failure(err));
}
});
field.addEventListener("keydown", (e) => e.key === "Escape" && row.remove());
side.querySelector(".cn-lib-add")?.closest(".cn-menu-group")?.after(row);
field.focus();
}


const setFilter = (k, v) => {
st.filters[k] = v;
keep(filtersKey, JSON.stringify(st.filters));

refocusFilter = v ? `chip:${k === "to" ? "dates" : k}` : nextAlong(k === "to" ? "dates" : k);
drawFilters();
load();
};

const nextAlong = (key) => {
const chips = [...filterBar.querySelectorAll("[data-f^='chip:']")].map((b) => b.dataset.f);
const i = chips.indexOf(`chip:${key}`);
return chips[i + 1] ?? chips[i - 1] ?? "filter";
};
let refocusFilter = null;
const accountName = (id) => (data?.accounts ?? []).find((a) => a.id === id)?.handle ?? "An account";
const collectionName = (id) => (data?.collections ?? []).find((c) => c.id === id)?.name ?? "A collection";
const fields = () => [
!st.view.startsWith("kind:") && Object.keys(data?.counts.byKind ?? {}).length > 1 ? { key: "kind", name: "Kind", icon: "grid", options: Object.keys(data.counts.byKind).map((k) => [k, KIND_ONE[k] ?? k]) } : null,
(data?.accounts ?? []).length > 1 ? { key: "account", name: "Account", icon: "user", options: data.accounts.map((a) => [a.id, a.handle]) } : null,
{ key: "band", name: "Rating", icon: "chart", options: BANDS.slice(1) },
{ key: "sponsor", name: "Has a sponsor read", icon: "megaphone", flag: true },
on("fix") ? { key: "fix", name: "Fix status", icon: "sparkle", options: FIXES.slice(1) } : null,
st.view !== "favourites" ? { key: "favourites", name: "Starred", icon: "star", flag: true } : null,
!st.view.startsWith("col:") && (data?.collections ?? []).length ? { key: "collection", name: "Collection", icon: "folder", options: data.collections.map((c) => [c.id, c.name]) } : null,
{ key: "dates", name: "Published", icon: "clock", dates: true },
].filter(Boolean);
const chipText = (f) => {
const v = st.filters;
if (f.dates) return [h("span", { class: "cn-fchip-k" }, "Published"), v.from && v.to ? `${dayOf(v.from)} to ${dayOf(v.to)}` : v.from ? `since ${dayOf(v.from)}` : `by ${dayOf(v.to)}`];
if (f.flag) return f.name;
const word = f.key === "account" ? accountName(v.account) : f.key === "collection" ? collectionName(v.collection) : (f.options.find(([k]) => k === v[f.key])?.[1] ?? v[f.key]);
return [h("span", { class: "cn-fchip-k" }, f.key === "fix" ? "Fix" : f.name), word];
};
const isSet = (f) => (f.dates ? Boolean(st.filters.from || st.filters.to) : Boolean(st.filters[f.key]));

function choices(f) {
if (f.dates) return datePicker();
return [
h("p", { class: "cn-menu-group" }, f.name),
f.options.map(([v, t]) =>
h("button", { class: "cn-item cn-item--row", type: "button", "data-close": "", "aria-pressed": String(st.filters[f.key] === v), onclick: () => setFilter(f.key, v) },
h("span", { class: "cn-item-ico" }, st.filters[f.key] === v ? icon("check") : null), h("span", { class: "cn-item-t" }, t))),
];
}
function fieldList() {
const open = fields().filter((f) => !isSet(f));
if (!open.length) return h("p", { class: "cn-menu-group" }, "Every filter is on.");
return [
h("p", { class: "cn-menu-group" }, "Filter by"),
open.map((f) =>
h("button", { class: "cn-item cn-item--row", type: "button", "data-close": f.flag ? "" : null, onclick: (e) => {
if (f.flag) return setFilter(f.key, true);

e.stopPropagation();
const panel = e.currentTarget.closest(".cn-menu");
panel.replaceChildren(...[choices(f)].flat(Infinity).filter(Boolean));
panel.querySelector("button")?.focus({ preventScroll: true });
} }, h("span", { class: "cn-item-ico" }, icon(f.icon)), h("span", { class: "cn-item-t" }, f.name), f.flag ? null : icon("chevronRight", { cls: "cn-item-go" }))),
];
}

const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const daysAgo = (n) => iso(new Date(Date.now() - n * 86_400_000));
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
function datePicker() {
let first = st.filters.from || null;
let last = st.filters.to || null;
const anchor = new Date(`${(last || first || today()).slice(0, 7)}-01T00:00:00Z`);
const wrap = h("div", { class: "cn-cal" });
const setRange = (from, to) => {
st.filters.from = from ?? "";
setFilter("to", to ?? "");
};
const presets = [["Last 7 days", 7], ["Last 30 days", 30], ["Last 90 days", 90], ["Last 12 months", 365]];
function draw() {
const y = anchor.getUTCFullYear();
const m = anchor.getUTCMonth();
const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const now = today();
const cells = [];
for (let i = 0; i < lead; i++) cells.push(h("span", { "aria-hidden": "true" }));
for (let d = 1; d <= days; d++) {
const key = iso(new Date(Date.UTC(y, m, d)));
const picked = key === first || key === last;
const within = first && last && key > first && key < last;
cells.push(h("button", { type: "button", class: `cn-cal-d${picked ? " is-on" : ""}${within ? " is-in" : ""}${key === now ? " is-today" : ""}`, disabled: key > now, "aria-pressed": String(picked), "aria-label": dayOf(key), onclick: (e) => {
if (!first || last) [first, last] = [key, null];
else if (key < first) [first, last] = [key, first];
else last = key;

if (first && last) {
e.currentTarget.setAttribute("data-close", "");
return setRange(first, last);
}
e.stopPropagation();
draw();
} }, String(d)));
}
const step = (n) => (e) => {
e.stopPropagation();
anchor.setUTCMonth(anchor.getUTCMonth() + n);
draw();
};
wrap.replaceChildren(
h("div", { class: "cn-cal-presets" }, presets.map(([t, n]) => h("button", { class: "cn-item cn-item--row", type: "button", "data-close": "", onclick: () => setRange(daysAgo(n), now) }, h("span", { class: "cn-item-t" }, t)))),
h("div", { class: "cn-cal-month" },
h("div", { class: "cn-cal-head" },
h("button", { class: "cn-iconbtn", type: "button", "aria-label": "Month before", onclick: step(-1) }, icon("chevronRight", { cls: "cn-flip" })),
h("p", { "aria-live": "polite" }, MONTH.format(anchor)),
h("button", { class: "cn-iconbtn", type: "button", "aria-label": "Month after", disabled: iso(anchor).slice(0, 7) >= now.slice(0, 7), onclick: step(1) }, icon("chevronRight"))),
h("div", { class: "cn-cal-grid", role: "group", "aria-label": MONTH.format(anchor) }, ["M", "T", "W", "T", "F", "S", "S"].map((d) => h("span", { class: "cn-cal-w", "aria-hidden": "true" }, d)), cells),
h("p", { class: "cn-cal-hint" }, first && !last ? `From ${dayOf(first)}: pick the last day` : "Pick the first day, then the last")),
);
}
draw();
return wrap;
}

const named = (wrap, f) => ((wrap.firstChild.dataset.f = f), wrap);
function drawFilters() {
const live = fields().filter(isSet);
const any = Object.values(st.filters).some(Boolean);
const had = refocusFilter ?? (filterBar.contains(document.activeElement) ? document.activeElement.closest("[data-f]")?.dataset.f : null);
refocusFilter = null;
filterBar.replaceChildren(...[
named(menu([icon("filter"), h("span", null, "Filter")], fieldList, { cls: "cn-menubtn--box cn-filterbtn", panel: "cn-menu--filter" }), "filter"),
live.map((f) =>
h("div", { class: "cn-fchip" },
named(menu(chipText(f), () => choices(f), { cls: "cn-fchip-b", panel: f.dates ? "cn-menu--filter cn-menu--cal" : "cn-menu--filter", aria: `${f.name}: change` }), `chip:${f.key}`),
h("button", { class: "cn-fchip-x", type: "button", "data-f": `x:${f.key}`, "aria-label": `Remove ${f.name}`, onclick: () => (f.dates ? (st.filters.from = "", setFilter("to", "")) : setFilter(f.key, f.flag ? false : "")) }, icon("close")))),
any ? h("button", { class: "cn-btn cn-btn--xs cn-btn--ghost", type: "button", "data-f": "clear", onclick: () => { st.filters = NONE(); keep(filtersKey, ""); refocusFilter = "filter"; drawFilters(); load(); } }, "Clear") : null,
].flat().filter(Boolean));
if (had) (filterBar.querySelector(`[data-f="${had}"]`) ?? filterBar.querySelector('[data-f="filter"]'))?.focus({ preventScroll: true });
}

const starBtn = (w, cls = "cn-star cn-star--row") => {
const b = h("button", { class: cls, type: "button", "aria-pressed": String(w.favourite), "aria-label": w.favourite ? `Unstar ${w.title}` : `Star ${w.title}`, disabled: !can("content") }, icon("star", { filled: w.favourite }));
b.addEventListener("click", async (e) => {
e.stopPropagation();
e.preventDefault();
const next = !w.favourite;
w.favourite = next;
table?.refresh();
if (st.mode === "gallery") draw();
try {
await api.put(`/v1/me/works/${seg(w.id)}/favourite`, { favourite: next });
data.counts.favourites += next ? 1 : -1;
drawSide();
if (st.view === "favourites" && !next) load();
} catch (err) {
w.favourite = !next;
table?.refresh();
if (st.mode === "gallery") draw();
toast(err.message ?? "That did not save.");
}
});
return b;
};
const thumb = (w) =>
w.thumb
? h("img", { class: "cn-thumb", src: w.thumb, alt: "", loading: "lazy", decoding: "async", width: 64, height: 36, referrerpolicy: "no-referrer" })
: h("span", { class: "cn-thumb cn-thumb--kind", "data-k": w.kind }, icon(KIND_ICON[w.kind] ?? "doc"));
const ratingCell = (w) => {
if (!w.rating) return h("span", { class: "cn-muted" }, "New");
const r = rating(w.rating.rating);
r.title = w.rating.notice;
return r;
};

const kindIcons = new Map();
function fillThumb(cell, w) {
if (w.thumb) {
let img = cell._img;
if (!img) {
img = cell._img = h("img", { class: "cn-thumb", alt: "", loading: "lazy", decoding: "async", width: 72, height: 40, referrerpolicy: "no-referrer" });
}
if (img.getAttribute("src") !== w.thumb) img.src = w.thumb;
if (cell.firstChild !== img) cell.replaceChildren(img);
return;
}
let box = cell._kind;
if (!box) box = cell._kind = h("span", { class: "cn-thumb cn-thumb--kind" });
if (box.dataset.k !== w.kind) {
box.dataset.k = w.kind;
if (!kindIcons.has(w.kind)) kindIcons.set(w.kind, icon(KIND_ICON[w.kind] ?? "doc"));
box.replaceChildren(kindIcons.get(w.kind).cloneNode(true));
}
if (cell.firstChild !== box) cell.replaceChildren(box);
}
function fillTitle(cell, w) {
if (!cell._t) {
cell._t = h("span", { class: "cn-cell-t" });
cell._d = h("span", { class: "cn-cell-d" });
cell._stack = h("div", { class: "cn-cell-stack" }, cell._t, cell._d);
}
if (cell.firstChild !== cell._stack) cell.replaceChildren(cell._stack);
if (cell._t.textContent !== w.title) cell._t.textContent = w.title;
const d = [KIND_ONE[w.kind] ?? w.kind, age(w.ageDays), w.reach ? `${short(w.reach.value)} ${w.reach.label}` : null].filter(Boolean).join(" · ");
if (cell._d.textContent !== d) cell._d.textContent = d;
}
function fillRating(cell, w) {
if (!cell._r) cell._r = h("span");
const r = cell._r;
if (cell.firstChild !== r) cell.replaceChildren(r);
const cls = w.rating ? `cn-rating cn-rating--s${w.rating.rating > 0 ? " is-up" : ""}` : "cn-muted";
if (r.className !== cls) r.className = cls;
const text = w.rating ? signed(w.rating.rating) : "New";
if (r.textContent !== text) r.textContent = text;
r.title = w.rating?.notice ?? "";
}

function fillTick(cell, w) {
let box = cell._box;
if (!box) {
box = cell._box = h("input", { type: "checkbox", class: "cn-rowtick", onmousedown: (e) => e.shiftKey && e.preventDefault(), onclick: (e) => {
e.stopPropagation();
toggle(cell._w, e.shiftKey);
box.focus({ preventScroll: true });
} });
}
cell._w = w;
if (cell.firstChild !== box) cell.replaceChildren(box);
const on = selection.has(w.id);
if (box.checked !== on) box.checked = on;
const label = `Select ${w.title}`;
if (box.getAttribute("aria-label") !== label) box.setAttribute("aria-label", label);
}

let headTick = null;
function drawHeadTick() {
if (!headTick) return;
const loaded = rows.filter(Boolean);
const n = loaded.reduce((k, w) => k + (selection.has(w.id) ? 1 : 0), 0);
headTick.checked = n > 0 && n === loaded.length;
headTick.indeterminate = n > 0 && n < loaded.length;
}
function columnsFor() {
if (phone.matches) {


return [
vacant("thumb") ? null : { key: "thumb", label: "", width: "72px", fill: fillThumb },
{ key: "title", label: "Work", width: "minmax(0, 1fr)", fill: fillTitle },
{ key: "rating", label: "Rating", width: "64px", align: "end", sort: true, fill: fillRating },
].filter(Boolean);
}
const all = [
can("content") ? { key: "select", label: "Select", width: "32px", always: true, headCell: () => {
headTick = h("input", { type: "checkbox", class: "cn-rowtick", "aria-label": "Select every loaded work", onclick: (e) => selectAll(e.target.checked) });
drawHeadTick();
return headTick;
}, fill: fillTick } : null,
{ key: "thumb", label: "", width: "64px", cell: thumb },
{ key: "title", label: "Title", width: "minmax(180px, 3fr)", sort: true, always: true, cell: (w) => h("span", { class: "cn-cell-t" }, w.title), title: (w) => w.title },
{ key: "kind", label: "Kind", width: "84px", sort: true, cell: (w) => KIND_ONE[w.kind] ?? w.kind },
{ key: "account", label: "Account", width: "minmax(90px, 1fr)", sort: true, cell: (w) => h("span", { class: "cn-cell-d" }, w.account.handle) },
{ key: "published", label: "Published", width: "96px", sort: true, cell: (w) => h("span", { class: "cn-num" }, dayOf(w.publishedAt)) },
{ key: "age", label: "Age", width: "60px", align: "end", sort: "published", cell: (w) => h("span", { class: "cn-num" }, age(w.ageDays)) },
{ key: "reach", label: "Reach", width: "112px", align: "end", sort: true, cell: (w) => (w.reach ? h("span", { class: "cn-num", title: `${count(w.reach.value)} ${w.reach.label}` }, short(w.reach.value), h("small", null, ` ${w.reach.label.split(" ")[0]}`)) : h("span", { class: "cn-muted" }, "None yet")) },
{ key: "rating", label: "Rating", width: "72px", align: "end", sort: true, always: true, cell: ratingCell },
{ key: "typical", label: "vs your typical", width: "112px", align: "end", sort: true, cell: (w) => (w.rating?.multiple ? h("span", { class: `cn-num${w.rating.multiple >= 1 ? " cn-up" : ""}` }, `${w.rating.multiple.toFixed(2)}×`) : h("span", { class: "cn-muted" }, "None")) },
on("fix") ? { key: "fix", label: "Fix", width: "96px", sort: true, cell: (w) => (w.fix ? pill(FIX_TONE[w.fix.state] ?? "idle", FIX_WORDS[w.fix.state] ?? w.fix.state) : null) } : null,
{ key: "sponsor", label: "Sponsor read", width: "minmax(90px, 1fr)", sort: true, cell: (w) => (w.sponsor ? h("span", { class: "cn-cell-d" }, w.sponsor.brand) : null) },
data?.columns.deals && on("sponsorships") ? { key: "deals", label: "Deals", width: "56px", align: "end", sort: true, cell: (w) => (w.deals ? h("span", { class: "cn-num" }, String(w.deals)) : null) } : null,
on("media") ? { key: "clips", label: "Clips", width: "60px", align: "end", sort: true, cell: (w) => (w.clips ? h("span", { class: "cn-num" }, String(w.clips)) : null) } : null,
{ key: "starred", label: [icon("star"), h("span", { class: "ob-sr" }, "Starred")], width: "44px", align: "center", sort: true, always: true, cell: (w) => starBtn(w) },
].filter(Boolean);
return all.filter((c) => c.always || (!hidden.has(c.key) && !vacant(c.key)));
}

let chosen = recall(COLS_KEY, null) !== null;
const HAS = { thumb: (w) => w.thumb, fix: (w) => w.fix, sponsor: (w) => w.sponsor, deals: (w) => w.deals, clips: (w) => w.clips };
function vacant(key) {
const pool = whole ?? (data ? { data, rows } : null);
if (chosen || !HAS[key] || !pool || pool.rows.length < pool.data.total) return false;
return !pool.rows.some((w) => w && HAS[key](w));
}
const colKeys = () => [["thumb", "Thumbnail"], ["kind", "Kind"], ["account", "Account"], ["published", "Published"], ["age", "Age"], ["reach", "Reach"], ["typical", "vs your typical"], on("fix") ? ["fix", "Fix"] : null, ["sponsor", "Sponsor read"], data?.columns.deals && on("sponsorships") ? ["deals", "Deals"] : null, on("media") ? ["clips", "Clips"] : null].filter(Boolean);
function colRows() {
const keys = colKeys();
return [
h("p", { class: "cn-menu-group" }, "Columns to show"),
keys.map(([k, t]) => {
const shown = () => !hidden.has(k) && !vacant(k);
const b = h("button", { class: "cn-item cn-item--row", type: "button", role: "menuitemcheckbox", "aria-checked": String(shown()), onclick: () => {

if (!chosen) for (const [x] of keys) if (vacant(x)) hidden.add(x);
chosen = true;
if (hidden.has(k)) hidden.delete(k);
else hidden.add(k);
keep(COLS_KEY, [...hidden].join(","));
b.setAttribute("aria-checked", String(shown()));
b.firstChild.replaceChildren(shown() ? icon("check") : "");
draw();
} }, h("span", { class: "cn-item-ico" }, shown() ? icon("check") : null), h("span", { class: "cn-item-t" }, t));
return b;
}),
];
}
function drawColsMenu() {
colsMenu.hidden = phone.matches;
colsBtn.disabled = st.mode === "gallery";
colsBtn.title = st.mode === "gallery" ? "The gallery has no columns" : "";
}


const tooMany = () => toast(`Up to ${count(PICK_MAX)} works at once. Narrow the filters, or do it in parts.`);

let anchor = -1;
function toggle(w, range = false) {
const i = rows.indexOf(w);
if (range && anchor >= 0 && i >= 0) {
for (let n = Math.min(anchor, i); n <= Math.max(anchor, i); n++) {
const r = rows[n];
if (!r || selection.has(r.id)) continue;
if (selection.size >= PICK_MAX) {
tooMany();
break;
}
selection.add(r.id);
}
} else if (selection.has(w.id)) selection.delete(w.id);
else if (selection.size >= PICK_MAX) return tooMany();
else selection.add(w.id);
anchor = i;
drawBulk();
table?.refresh();
}
function selectAll(onOff) {
for (const w of rows) {
if (!w) continue;
if (!onOff) selection.delete(w.id);
else if (selection.size < PICK_MAX) selection.add(w.id);
else {
tooMany();
break;
}
}
drawBulk();
table?.refresh();
}
async function bulk(action, collection) {
const ids = [...selection];
try {
await api.post("/v1/me/works/bulk", { action, ids, ...(collection ? { collection } : {}) });
toast(action === "star" ? `Starred ${ids.length}` : action === "unstar" ? `Unstarred ${ids.length}` : action === "add" ? `Added ${ids.length} to the collection` : `Took ${ids.length} out of the collection`);
selection.clear();
await load(true);

table?.body.focus({ preventScroll: true });
} catch (e) {
toast(e.message ?? "That did not save.");
}
}
const clearPicked = () => {

const onBox = table?.el.contains(document.activeElement) && document.activeElement.matches(".cn-rowtick");
selection.clear();
anchor = -1;
drawBulk();
table?.refresh();
if (!onBox) table?.body.focus({ preventScroll: true });
};

function drawBulk() {
const was = bulkBar.contains(document.activeElement) ? document.activeElement.dataset.b : null;
drawHeadTick();
const shown = !bulkBar.hidden;
bulkBar.hidden = selection.size === 0;

if (shown !== !bulkBar.hidden) requestAnimationFrame(fit);
if (!selection.size) return bulkBar.replaceChildren();
const cols = data?.collections ?? [];

const act = (b, ico, text, run) => h("button", { class: "cn-btn cn-btn--xs", type: "button", "data-b": b, "aria-label": text, title: text, onclick: run }, ico, h("span", { class: "cn-bulk-t" }, text));
const into = menu([icon("folder"), h("span", { class: "cn-bulk-t" }, "Add to collection"), icon("chevron", { cls: "cn-i--chev" })], () => [
cols.map((c) => h("button", { class: "cn-item cn-item--row", type: "button", "data-close": "", onclick: () => bulk("add", c.id) }, h("span", { class: "cn-item-ico" }, icon("folder")), h("span", { class: "cn-item-t" }, c.name))),
h("button", { class: "cn-item cn-item--row", type: "button", "data-close": "", onclick: () => newCollection((c) => bulk("add", c.id)) }, h("span", { class: "cn-item-ico" }, icon("plus")), h("span", { class: "cn-item-t" }, "New collection")),
], { cls: "cn-btn cn-btn--xs", panel: "cn-menu--up", aria: "Add to collection", title: "Add to collection" });
into.firstChild.dataset.b = "add";
bulkBar.replaceChildren(...[
h("span", { class: "cn-bulk-n" }, `${count(selection.size)} selected`),
h("button", { class: "cn-iconbtn cn-bulk-x", type: "button", "data-b": "clear", "aria-label": "Clear the selection", title: "Clear the selection (Esc)", onclick: clearPicked }, icon("close")),
h("span", { class: "cn-bulk-sep", "aria-hidden": "true" }),

starredAll() ? act("star", icon("star"), "Unstar", () => bulk("unstar")) : act("star", icon("star", { filled: true }), "Star", () => bulk("star")),
into,
st.view.startsWith("col:") ? act("remove", icon("close"), "Take out of this collection", () => bulk("remove", st.view.slice(4))) : null,
act("export", icon("doc"), "Export", () => exportCsv(true)),
].filter(Boolean));
if (was) bulkBar.querySelector(`[data-b="${was}"]`)?.focus({ preventScroll: true });
}
const starredAll = () => {
const picked = rows.filter((w) => w && selection.has(w.id));
return picked.length > 0 && picked.length === selection.size && picked.every((w) => w.favourite);
};

const onEscape = (e) => {
if (!stage.isConnected) return document.removeEventListener("keydown", onEscape, true);
if (e.key !== "Escape" || !selection.size) return;
if (document.querySelector(".cn-menu:not([hidden]), dialog[open]")) return;
if (e.target.matches?.("input:not([type=checkbox]), textarea") && e.target.value) return;
e.preventDefault();
clearPicked();
};
document.addEventListener("keydown", onEscape, true);

async function fetchMore(limit = PAGE) {
if (fetching || !cursor) return fetching;
const gen = generation;
fetching = api.get(worksQuery(st, cursor, limit)).then((page) => {
if (gen !== generation) return;
rows.push(...page.works);
cursor = page.cursor;

if (selection.size) drawHeadTick();
}).finally(() => {
fetching = null;
});
await fetching;
if (gen !== generation) return;
if (table) table.redraw();
else if (st.mode === "gallery") drawGallery();
}

async function exportCsv(onlySelected) {

const body = Object.fromEntries(new URLSearchParams(worksQuery(st).split("?")[1]));
delete body.table;
delete body.limit;
if (onlySelected) body.ids = [...selection];
exportBtn.disabled = true;
try {
const res = await api.post("/v1/me/works/export", body, { file: true });
const n = Number(res.headers.get("x-orbe-export-rows") ?? 0);
const more = res.headers.get("x-orbe-next-cursor");
const a = h("a", { href: URL.createObjectURL(await res.blob()), download: `orbe-library-${new Date().toISOString().slice(0, 10)}.csv` });
document.body.append(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(a.href), 4000);
toast(`Exported ${count(n)} ${n === 1 ? "work" : "works"}${more ? "; the file says how to fetch the rest" : ""}`);
} catch (e) {
stage.prepend(failure(e));
} finally {
exportBtn.disabled = false;
}
}
async function load(keepPlace = false, typing = false) {
const gen = ++generation;
writeAddress();
cursor = null;
fetching = null;
if (!typing) whole = null;

stage.classList.add("is-stale");
const slow = keepPlace || !stage.firstChild
? 0
: setTimeout(() => {
if (gen !== generation) return;
table?.destroy();
table = null;
stage.replaceChildren(h("div", { class: "cn-vt cn-vt--skel", "aria-hidden": "true" }, Array.from({ length: 8 }, () => h("div", { class: "cn-vt-tr" }, h("span", { class: "cn-vt-skel" })))));
}, 150);
if (!keepPlace && !stage.firstChild) stage.replaceChildren(h("div", { class: "cn-vt cn-vt--skel", "aria-hidden": "true" }, Array.from({ length: 8 }, () => h("div", { class: "cn-vt-tr" }, h("span", { class: "cn-vt-skel" })))));
let first;
try {
first = await api.get(worksQuery(st, null, PAGE));
} catch (e) {
clearTimeout(slow);
stage.classList.remove("is-stale");
if (gen !== generation) return;
if (e.status === 404 && st.view.startsWith("col:")) {
st.view = "all";
return load();
}
table = null;
stage.replaceChildren(failure(e, () => load()));
return;
}
if (gen !== generation) return;
clearTimeout(slow);
stage.classList.remove("is-stale");
searched = Boolean(st.q);
data = first;
rows = [...first.works];
cursor = first.cursor;
for (const id of [...selection]) if (!rows.some((w) => w.id === id) && !keepPlace) selection.delete(id);
title.textContent = viewName();
countEl.textContent = data.total ? `${count(data.total)} ${data.total === 1 ? "work" : "works"}` : "";
if (!st.mode) st.mode = data.counts.all >= 20 ? "table" : "gallery";
drawSide();
drawFilters();
drawBulk();
draw(keepPlace);
}

let connectable;

function connectActions() {
if (!can("content")) return [["See your connections", "/orbe-site/demo/app/connections"]];
if (connectable === undefined) {
connectable = api.get("/v1/me/sources").then(
(r) => new Set((r.groups.find((g) => g.id === "work")?.sources ?? []).filter((x) => x.availability === "ready").map((x) => x.id.split(":")[0])),
() => null,
).then((set) => {
connectable = set;
if (data && !data.total) draw();
});
return [];
}
if (connectable instanceof Promise) return [];
const ready = (k) => !connectable || connectable.has(k);
const here = { back: "/orbe-site/demo/app/library", done: () => load() };
const ways = [
ready("youtube") ? ["Connect YouTube", () => openConnect("youtube", ctx, here)] : null,
on("podcasts") && ready("podcast") ? ["Add a podcast feed", () => openConnect("podcast", ctx, here)] : null,
ready("substack") ? ["Add your Substack", () => openConnect("substack", ctx, here)] : null,
].filter(Boolean);
return [...ways.map(([label, go], i) => [label, go, i === 0]), ["All connections", "/orbe-site/demo/app/connections"]];
}
function emptyView() {
const filtered = Object.values(st.filters).some(Boolean);
return st.q
? emptyState("search", `Nothing called "${st.q}" here.`, [["Clear the search", () => { searchInput.value = ""; st.q = ""; load(); }]])
: filtered
? emptyState("filter", "No works match these filters.", [["Clear filters", () => { st.filters = NONE(); keep(filtersKey, ""); load(); }]])
: st.view === "favourites"
? emptyState("star", "Star the works you come back to, and they wait here.", [["See all works", () => { st.view = "all"; load(); }]])
: st.view.startsWith("col:")
? emptyState("folder", "This collection is empty.", [["Add works", () => { st.view = "all"; load(); }]], "Select works in the table and add them, or add one from its page.")
: emptyState("library", "Your works show here once Orbe can read an account of yours.", connectActions(), "Every video, episode and post, each rated against creators the same size.");
}
function draw(keepPlace = false) {
modes.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-checked", String(["table", "gallery"][i] === st.mode)));
drawColsMenu();
if (!data) return;
if (!data.total) {
table?.destroy();
table = null;
stage.replaceChildren(emptyView());
more.replaceChildren();
return;
}
if (st.mode === "gallery") {
table?.destroy();
table = null;
return drawGallery();
}
more.replaceChildren();
const top = keepPlace && table ? table.body.scrollTop : 0;

const inTable = table?.el.contains(document.activeElement) ? (document.activeElement.closest(".cn-vt-sort")?.dataset.key ?? "") : null;
table?.destroy();
const cols = columnsFor();
table = virtualTable({
label: "Works",
columns: cols,
rowHeight: phone.matches ? 60 : 48,
overscan: phone.matches ? 12 : 6,
total: data.total,
rowAt: (i) => rows[i] ?? null,
href: (w) => `/orbe-site/demo/app/works/${seg(w.id)}`,
selection,
sort: { key: st.sort, dir: st.dir },
totals: !phone.matches,
onSort: (key) => {
if (st.sort === key) st.dir = st.dir === "asc" ? "desc" : "asc";
else {
st.sort = key;
st.dir = NAMED_DIR.has(key) ? "asc" : "desc";
}
load();
},
onNeed: (i) => {
if (i >= rows.length && cursor) fetchMore(Math.min(500, Math.max(PAGE, i - rows.length + 60)));
},
onNear: (last) => {
if (last + AHEAD > rows.length && cursor) fetchMore(PAGE);
},
onToggle: (w, e) => (can("content") ? toggle(w, e?.shiftKey) : null),
});
stage.replaceChildren(table.el);
if (inTable !== null) (inTable ? table.el.querySelector(`.cn-vt-sort[data-key="${inTable}"]`) : table.body)?.focus({ preventScroll: true });

if (!(whole && st.q)) table.setTotals(totalsRow(cols));

requestAnimationFrame(() => setTimeout(fit));
if (top) table.body.scrollTop = top;
}
function totalsRow(cols) {
const t = data.totals;
const reach = t.reach[0];
const mixed = t.reach.length > 1;
return cols.map((c) => {
const cell = (...v) => h("div", { class: "cn-vt-td", "data-align": c.align ?? null }, ...v);
switch (c.key) {

case "title": return cell(h("b", null, `${count(t.works)} ${t.works === 1 ? "work" : "works"}`), mixed ? h("span", { class: "cn-vt-sum" }, t.reach.map((r) => `${short(r.value)} ${r.label.split(" ")[0]}`).join(", ")) : null);
case "reach": return cell(reach && !mixed ? h("span", { class: "cn-num", title: `${count(reach.value)} ${reach.label}` }, short(reach.value), h("small", null, ` ${reach.label.split(" ")[0]}`)) : "");
case "rating": return cell(t.averageRating === null ? "" : h("span", { class: "cn-num", title: `Average of ${count(t.rated)} rated` }, h("small", null, "avg "), rating(t.averageRating)));
case "sponsor": return cell(t.sponsorReads ? `${count(t.sponsorReads)} with a read` : "");
case "deals": return cell(t.deals ? h("span", { class: "cn-num" }, count(t.deals)) : "");
case "clips": return cell(t.clips ? h("span", { class: "cn-num" }, count(t.clips)) : "");
case "starred": return cell(t.starred ? h("span", { class: "cn-num" }, count(t.starred)) : "");
default: return cell("");
}
});
}

function fit() {
if (!table) return;
const top = table.body.getBoundingClientRect().top + window.scrollY;
const foot = (phone.matches ? 16 : 64) + (bulkBar.hidden ? 0 : bulkBar.offsetHeight + 12);
table.body.style.height = `${Math.max(320, window.innerHeight - (top - window.scrollY) - foot)}px`;
}
let fitFrame = 0;
const onResize = () => {
if (!fitFrame) fitFrame = requestAnimationFrame(() => { fitFrame = 0; fit(); });
};
window.addEventListener("resize", onResize, { passive: true });
phone.addEventListener?.("change", () => draw());

const card = (w) => {
const dur = duration(w.durationSec);
return h("article", { class: "cn-work" },
starBtn(w, "cn-star"),
h("a", { class: "cn-work-open", href: `/orbe-site/demo/app/works/${seg(w.id)}`, "aria-label": `Open ${w.title}` },
h("span", { class: "cn-work-art" },
w.thumb ? h("img", { class: "cn-work-img", src: w.thumb, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }) : cover(w.id, w.kind, strength(w)),
h("span", { class: "cn-work-kind" }, KIND_ONE[w.kind] ?? w.kind),
w.rating ? h("span", { class: `cn-work-score${w.rating.rating > 0 ? " is-up" : ""}`, title: w.rating.notice }, signed(w.rating.rating)) : null,
dur ? h("span", { class: "cn-work-dur" }, dur) : null,
),
),
h("div", null,
h("p", { class: "cn-work-t" }, w.title),
h("p", { class: "cn-work-d" }, [w.account.handle, ago(w.publishedAt), w.reach ? `${count(w.reach.value)} ${w.reach.label}` : null].filter(Boolean).join(" · ")),
),
);
};
function drawGallery() {
stage.replaceChildren(h("div", { class: "cn-works", "data-size": "m" }, rows.filter(Boolean).map(card)));
more.replaceChildren(...(cursor ? [h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => fetchMore() }, `Load ${Math.min(PAGE, data.total - rows.length)} more`)] : []));
}

main.addEventListener("click", (e) => e.target.closest?.("a[href]") && holdPlace(), true);
await load();
if (kept && data) {
for (const id of kept.picked ?? []) if (selection.size < PICK_MAX) selection.add(id);
drawBulk();
table?.refresh();
if (table && kept.top) table.body.scrollTop = kept.top;
else if (kept.y) window.scrollTo(0, kept.y);
}
}
});
__o.d("js/table.js", function (__x) {
"use strict";
__o.e(__x, { virtualTable: () => virtualTable });
const { h } = __o.r("js/ui.js");

const OVERSCAN = 6;

const MARGIN = 3;

const GAP = 10;
const PAD = 12;
function virtualTable(o) {
const { label, columns, rowHeight, href, selection, sort } = o;

const overscan = Math.max(OVERSCAN, o.overscan ?? OVERSCAN);
let total = o.total;
let active = -1;
const template = columns.map((c) => c.width).join(" ");


const floor = columns.reduce((n, c) => n + (Number(/^(?:minmax\()?(\d+)px/.exec(c.width)?.[1]) || 0), 0) + (columns.length - 1) * GAP + 2 * PAD;
const head = h("div", { class: "cn-vt-head", role: "row" },
columns.map((c) => {
const key = c.sort === true ? c.key : c.sort;
if (c.headCell) return h("div", { class: "cn-vt-th", role: "columnheader", "data-align": c.align ?? null }, c.headCell());
if (!key) return h("div", { class: "cn-vt-th", role: "columnheader", "data-align": c.align ?? null }, c.label);
const on = sort?.key === key;
return h("div", { class: "cn-vt-th", role: "columnheader", "aria-sort": on ? (sort.dir === "asc" ? "ascending" : "descending") : "none", "data-align": c.align ?? null },
h("button", { class: "cn-vt-sort", type: "button", "data-on": String(on), "data-key": key, onclick: () => o.onSort?.(key) }, c.label, h("span", { class: "cn-vt-dir", "aria-hidden": "true" }, on ? (sort.dir === "asc" ? "↑" : "↓") : "")));
}),
);
const spacer = h("div", { class: "cn-vt-spacer" });
const rowsEl = h("div", { class: "cn-vt-rows", role: "rowgroup" });
const body = h("div", { class: "cn-vt-body", tabindex: "0", role: "rowgroup", "aria-label": `${label}, use j and k to move, Enter to open, x to select` }, spacer, rowsEl);
const foot = o.totals ? h("div", { class: "cn-vt-foot", role: "row" }) : null;
const el = h("div", { class: "cn-vt", role: "grid", "aria-label": label, "aria-rowcount": String(total) }, head, body, foot);

el.style.setProperty("--cols", template);
el.style.setProperty("--row", `${rowHeight}px`);
el.style.setProperty("--floor", `${floor}px`);

const pool = [];
function rowEl() {
const cells = columns.map((c) => h("div", { class: "cn-vt-td", role: "gridcell", "data-align": c.align ?? null, "data-col": c.key }));
const link = h("a", { class: "cn-vt-link", tabindex: "-1" });
const r = h("div", { class: "cn-vt-tr", role: "row" }, link, cells);
r._cells = cells;
r._link = link;
r._index = -1;
r._id = null;

r.addEventListener("mousedown", (e) => e.shiftKey && o.onToggle && e.preventDefault());
r.addEventListener("click", (e) => {
if (e.target.closest("button, input, a:not(.cn-vt-link), label")) return;
if (e.shiftKey && o.onToggle) {
e.preventDefault();
const row = r._id ? o.rowAt(r._index) : null;
if (row) o.onToggle(row, e);
return;
}
if (r._id && e.target !== link) link.click();
});
return r;
}
function mark(r, key, on) {
const v = on ? "true" : "false";
if (r.dataset[key] !== v) r.dataset[key] = v;
}
function paint(r, i) {
const row = o.rowAt(i);
const id = row ? row.id : null;

if (r._y !== i) {
r._y = i;
r.style.transform = `translateY(${i * rowHeight}px)`;
r.setAttribute("aria-rowindex", String(i + 2));
}
mark(r, "active", i === active);
mark(r, "selected", Boolean(id && selection?.has(id)));
if (r._index === i && r._id === id && !r._dirty) return;
r._index = i;
r._id = id;
r._dirty = false;
if (!row) {
r._link.removeAttribute("href");
mark(r, "skel", true);
r._cells.forEach((c, n) => {
c._skel = true;
c.replaceChildren(n === 0 ? "" : h("span", { class: "cn-vt-skel" }));
});
o.onNeed?.(i);
return;
}
mark(r, "skel", false);
r._link.href = href(row);
r._link.setAttribute("aria-label", `Open ${row.title}`);
columns.forEach((c, n) => {
const cell = r._cells[n];


if (c.fill && !cell._skel) c.fill(cell, row);
else {
cell._skel = false;
if (c.fill) {
cell.replaceChildren();
c.fill(cell, row);
} else cell.replaceChildren(c.cell(row) ?? "");
}
if (c.title) cell.title = c.title(row) ?? "";
});
}
let frame = 0;


let drawnFirst = 0;
let drawnLast = 0;
let stale = true;
function draw() {
frame = 0;
const top = body.scrollTop;
const height = body.clientHeight || 600;
const seeFirst = Math.floor(top / rowHeight);
const seeLast = Math.ceil((top + height) / rowHeight);



if (!stale && drawnFirst <= Math.max(0, seeFirst - MARGIN) && drawnLast >= Math.min(total, seeLast + MARGIN)) return;
const first = Math.max(0, seeFirst - overscan);
const last = Math.min(total, seeLast + overscan);
drawnFirst = first;
drawnLast = last;
stale = false;
const need = Math.max(0, last - first);
while (pool.length < need) {
const r = rowEl();
pool.push(r);
rowsEl.append(r);
}

const want = new Set();
for (let i = first; i < last; i++) want.add(i);
const free = [];
for (const r of pool) {
if (want.has(r._index)) want.delete(r._index);
else free.push(r);
}
const gaps = [...want];
for (let n = 0; n < free.length; n++) {
const r = free[n];
if (n < gaps.length) {
if (r._off) { r._off = false; r.dataset.off = "false"; }
paint(r, gaps[n]);
} else {


if (!r._off) { r._off = true; r.dataset.off = "true"; }
r._index = -1;
}
}
for (const r of pool) if (!r._off && r._index >= first && r._index < last) paint(r, r._index);
o.onNear?.(last);
}
const schedule = () => {
if (!frame) frame = requestAnimationFrame(draw);
};

const invalidate = () => {
stale = true;
schedule();
};
body.addEventListener("scroll", schedule, { passive: true });
const ro = typeof ResizeObserver === "function" ? new ResizeObserver(invalidate) : null;
ro?.observe(body);
function setActive(i, scroll = true) {
if (!total) return;
active = Math.max(0, Math.min(total - 1, i));
if (scroll) {
const y = active * rowHeight;
if (y < body.scrollTop) body.scrollTop = y;
else if (y + rowHeight > body.scrollTop + body.clientHeight) body.scrollTop = y + rowHeight - body.clientHeight;
}
for (const r of pool) mark(r, "active", r._index === active);
invalidate();
}
body.addEventListener("keydown", (e) => {
if (e.metaKey || e.ctrlKey || e.altKey) return;
const k = e.key;
if (k === "j" || k === "ArrowDown") setActive(active + 1);
else if (k === "k" || k === "ArrowUp") setActive(active - 1);
else if (k === "Home") setActive(0);
else if (k === "End") setActive(total - 1);
else if (k === "PageDown") setActive(active + Math.floor(body.clientHeight / rowHeight));
else if (k === "PageUp") setActive(active - Math.floor(body.clientHeight / rowHeight));
else if (k === "Enter" && active >= 0) {
const row = o.rowAt(active);
if (row) pool.find((r) => r._index === active)?._link.click();
} else if ((k === "x" || k === "X" || k === " ") && active >= 0) {
const row = o.rowAt(active);
if (row) o.onToggle?.(row, e);
} else return;
e.preventDefault();
});
body.addEventListener("focus", () => {
if (active < 0 && total) setActive(Math.floor(body.scrollTop / rowHeight), false);
});
function update(n) {
total = n;
el.setAttribute("aria-rowcount", String(n + 1));
spacer.style.height = `${n * rowHeight}px`;
if (active >= n) active = n - 1;
invalidate();
}
update(total);
return {
el,
body,
update,

redraw: invalidate,

refresh() {
for (const r of pool) r._dirty = true;
invalidate();
},
setTotals(nodes) {
if (foot) foot.replaceChildren(...nodes);
},
scrollTop() {
body.scrollTop = 0;
active = -1;
},
destroy() {
ro?.disconnect();
if (frame) cancelAnimationFrame(frame);
},
};
}
});
