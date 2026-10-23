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
__o.d("js/sky.js", function (__x) {
"use strict";
__o.e(__x, { paint: () => paint, paintedSky: () => paintedSky, quickArt: () => quickArt, thumbOf: () => thumbOf, workArt: () => workArt });


function rnd(seed) {
let s = seed % 2147483647 || 1;
return () => {
s = (s * 16807) % 2147483647;
return (s - 1) / 2147483646;
};
}

const SKY = [148, 230, 255];
const SKY_HI = [191, 239, 255];
const SKY_LO = [169, 233, 255];
const PALE = [198, 241, 255];
const WATER = [77, 154, 208];
const CHALK = [251, 250, 246];
const PAPER = [243, 240, 232];
const PEONY = [242, 135, 158];
const LIGHT = [255, 244, 214];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

function wash(x, cx, cy, rx, ry, angle, col, a) {
x.save();
x.translate(cx, cy);
x.rotate(angle);
x.scale(rx / ry, 1);
const g = x.createRadialGradient(0, 0, 0, 0, 0, ry);
g.addColorStop(0, rgba(col, a));
g.addColorStop(0.5, rgba(col, a * 0.8));
g.addColorStop(1, rgba(col, 0));
x.fillStyle = g;
x.beginPath();
x.arc(0, 0, ry, 0, Math.PI * 2);
x.fill();
x.restore();
}

function streak(x, cx, cy, len, thick, angle, col, a) {
x.save();
x.translate(cx, cy);
x.rotate(angle);
const g = x.createLinearGradient(-len / 2, 0, len / 2, 0);
g.addColorStop(0, rgba(col, 0));
g.addColorStop(0.5, rgba(col, a));
g.addColorStop(1, rgba(col, 0));
x.fillStyle = g;
x.beginPath();
x.ellipse(0, 0, len / 2, thick, 0, 0, Math.PI * 2);
x.fill();
x.restore();
}

function paint(x, w, h, seed = 7) {
const r = rnd(seed);
const base = x.createLinearGradient(0, 0, 0, h);
base.addColorStop(0, rgba(SKY_HI, 1));
base.addColorStop(0.6, rgba(SKY, 1));
base.addColorStop(1, rgba(SKY_LO, 1));
x.fillStyle = base;
x.fillRect(0, 0, w, h);
const s = Math.max(w, h * 2) / 1440;

const cool = [[CHALK, 0.85], [PAPER, 0.75], [WATER, 0.3], [SKY, 0.9], [PALE, 0.9]];
for (let i = 0; i < 88; i++) {
const [col, a] = cool[Math.floor(r() * cool.length)];
wash(x, r() * w, r() * h, (120 + r() * 300) * s, (60 + r() * 120) * s, -0.2 + r() * 0.15, col, a);
}


const warm = Array.from({ length: 3 }, () => [w * (0.6 + r() * 0.34), h * r() * 0.34, (180 + r() * 200) * s, (70 + r() * 70) * s]);
for (const [cx, cy, rx, ry] of warm) wash(x, cx, cy, rx, ry, -0.15, LIGHT, 0.9);
for (const [cx, cy, rx, ry] of warm.slice(0, 2)) wash(x, cx + rx * 0.08, cy, rx * 0.55, ry * 0.55, -0.15, PEONY, 0.3);

for (let i = 0; i < 16; i++) streak(x, r() * w, r() * h, (80 + r() * 260) * s, (2 + r() * 4) * s, -0.35, r() < 0.55 ? CHALK : [127, 211, 245], 0.4);

const v = x.createLinearGradient(0, 0, 0, h);
v.addColorStop(0, rgba(PALE, 0));
v.addColorStop(0.35, rgba([214, 245, 255], 0.3));
v.addColorStop(0.62, rgba([214, 245, 255], 0.2));
v.addColorStop(1, rgba([214, 245, 255], 0));
x.fillStyle = v;
x.fillRect(0, 0, w, h);
}

const fields = new Map();
function stored(key) {
try {
const url = localStorage.getItem(key);
if (url) fields.set(key, url);
return url;
} catch {
return null;
}
}

function paintedSky(host, opts = {}) {
const canvas = document.createElement("canvas");
canvas.className = `cn-sky${opts.drift === false ? "" : " cn-sky--drift"}`;
canvas.setAttribute("aria-hidden", "true");
host.prepend(canvas);
let painted = 0;
function draw() {
const rect = host.getBoundingClientRect();
const w = Math.max(1, Math.round(rect.width * 1.12));
const ht = Math.max(1, Math.round(rect.height * 1.12));
if (painted && Math.abs(painted - w) < 80) return;
painted = w;

const k = 0.5;
canvas.width = Math.round(w * k);
canvas.height = Math.round(ht * k);
const x = canvas.getContext("2d");
const seed = opts.seed ?? 7;
const field = `${seed}.${canvas.width}x${canvas.height}`;
const key = `orbe.sky.${field}`;
const kept = fields.get(key) ?? stored(key);
if (kept) {
const img = new Image();
img.onload = () => { if (canvas.width === img.width && canvas.height === img.height) x.drawImage(img, 0, 0); };
img.src = kept;
return;
}
if (w < 2) return;
x.setTransform(k, 0, 0, k, 0, 0);
paint(x, w, ht, seed);
x.setTransform(1, 0, 0, 1, 0, 0);

const keep = () => {
try {
const url = canvas.toDataURL("image/webp", 0.85);
if (!url.startsWith("data:image/webp")) return;
fields.set(key, url);

for (const k of Object.keys(localStorage)) if (k.startsWith(`orbe.sky.${seed}.`) && k !== key) localStorage.removeItem(k);
localStorage.setItem(`orbe.sky.${field}`, url);
} catch {

}
};
(window.requestIdleCallback ?? ((f) => setTimeout(f, 200)))(keep);
}
draw();
const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
ro?.observe(host);
return { node: canvas, destroy: () => { ro?.disconnect(); canvas.remove(); } };
}

const C = { sky: "#94E6FF", pale: "#BDEFFF", water: "#4D9AD0", chalk: "#FBFAF6", paper: "#F3F0E8", cobalt: "#1F4BFF", deep: "#0E2AAE", straw: "#F5D34A", peony: "#F2879E", claret: "#6F1726", ink: "#141311" };
const ART = {

video(x, w, h) {
const g = x.createLinearGradient(0, 0, w, h);
g.addColorStop(0, C.pale);
g.addColorStop(1, C.sky);
x.fillStyle = g;
x.fillRect(0, 0, w, h);
[[-14, C.deep], [0, C.cobalt], [14, C.water]].forEach(([deg, col], i) => {
x.save();
x.translate(w / 2 + (i - 1) * w * 0.2, h * 0.58);
x.rotate((deg * Math.PI) / 180);
const fw = w * 0.25, fh = h * 0.64;
x.fillStyle = "rgba(20,19,17,0.14)";
x.fillRect(-fw / 2 + 4, -fh / 2 + 6, fw, fh);
const f = x.createLinearGradient(0, -fh / 2, 0, fh / 2);
f.addColorStop(0, i === 1 ? C.straw : C.chalk);
f.addColorStop(1, col);
x.fillStyle = f;
x.fillRect(-fw / 2, -fh / 2, fw, fh);
x.restore();
});
},

sponsor(x, w, h) {
x.fillStyle = C.straw;
x.fillRect(0, 0, w, h);
const cols = [C.ink, C.cobalt, C.peony, C.chalk, C.deep, C.chalk];
const cw = w * 0.21, ch = h * 0.27;
for (let i = 0; i < 6; i++) {
const cx = w * (0.17 + (i % 3) * 0.33), cy = h * (0.3 + Math.floor(i / 3) * 0.41);
x.fillStyle = cols[i];
x.beginPath();
if (x.roundRect) x.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 8);
else x.rect(cx - cw / 2, cy - ch / 2, cw, ch);
x.fill();
}
},

offer(x, w, h) {
x.fillStyle = C.deep;
x.fillRect(0, 0, w, h);
x.fillStyle = C.sky;
x.fillRect(w * 0.17, h * 0.57, w * 0.28, h * 0.08);
x.fillRect(w * 0.55, h * 0.48, w * 0.28, h * 0.08);
x.fillStyle = C.chalk;
x.fillRect(w * 0.49, h * 0.2, w * 0.015, h * 0.58);
x.strokeStyle = C.chalk;
x.lineWidth = Math.max(2, w * 0.014);
x.beginPath();
x.moveTo(w * 0.31, h * 0.57);
x.lineTo(w * 0.69, h * 0.48);
x.stroke();
x.fillStyle = C.straw;
x.beginPath();
x.arc(w * 0.5, h * 0.2, h * 0.055, 0, Math.PI * 2);
x.fill();
},

rate(x, w, h) {
x.fillStyle = C.ink;
x.fillRect(0, 0, w, h);
x.strokeStyle = "rgba(251,250,246,0.28)";
x.lineWidth = Math.max(1.5, w * 0.008);
x.beginPath();
x.moveTo(w * 0.08, h * 0.7);
x.bezierCurveTo(w * 0.35, h * 0.66, w * 0.6, h * 0.62, w * 0.92, h * 0.58);
x.stroke();
x.strokeStyle = C.sky;
x.lineWidth = Math.max(2.5, w * 0.016);
x.beginPath();
x.moveTo(w * 0.08, h * 0.76);
x.bezierCurveTo(w * 0.4, h * 0.72, w * 0.55, h * 0.3, w * 0.92, h * 0.22);
x.stroke();
x.fillStyle = C.straw;
x.beginPath();
x.arc(w * 0.92, h * 0.22, h * 0.05, 0, Math.PI * 2);
x.fill();
},

protect(x, w, h) {
x.fillStyle = C.sky;
x.fillRect(0, 0, w, h);
[[0.3, C.chalk], [0.7, C.paper]].forEach(([cx, col]) => {
x.fillStyle = col;
x.fillRect(w * cx - w * 0.16, h * 0.2, w * 0.32, h * 0.6);
x.fillStyle = C.deep;
x.fillRect(w * cx - w * 0.1, h * 0.32, w * 0.2, h * 0.2);
x.fillStyle = C.water;
x.fillRect(w * cx - w * 0.1, h * 0.6, w * 0.14, h * 0.05);
});
},

podcast(x, w, h) {
x.fillStyle = C.peony;
x.fillRect(0, 0, w, h);
x.fillStyle = C.claret;
const n = 9;
for (let i = 0; i < n; i++) {
const bh = h * (0.18 + 0.5 * Math.abs(Math.sin(i * 1.1 + 0.6)));
x.fillRect(w * (0.14 + (i * 0.72) / n), h / 2 - bh / 2, w * 0.045, bh);
}
},
};

function quickArt(kind, w = 72, h = 48) {
const canvas = document.createElement("canvas");
canvas.className = "cn-qart";
canvas.setAttribute("aria-hidden", "true");
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = Math.round(w * dpr);
canvas.height = Math.round(h * dpr);
const x = canvas.getContext("2d");
x.scale(dpr, dpr);
(ART[kind] ?? ART.rate)(x, w, h);
return canvas;
}

function thumbOf(work) {
const m = /[?&]v=([\w-]{11})/.exec(work?.url ?? "");
return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function workArt(work, kind) {
const src = thumbOf(work);
if (!src) return quickArt(kind);
const img = document.createElement("img");
img.className = "cn-qart";
img.alt = "";
img.decoding = "async";
img.loading = "lazy";
img.referrerPolicy = "no-referrer";
img.addEventListener("error", () => img.replaceWith(quickArt(kind)), { once: true });
img.src = src;
return img;
}
});
__o.d("js/welcome.js", function (__x) {
"use strict";
__o.e(__x, { registerStep: () => registerStep, render: () => render });
const { api, on, seg } = __o.r("js/api.js");
const { beginSignIn, openConnect } = __o.r("js/connect-inline.js");
const { tile } = __o.r("js/catalogue.js");
const { pill, pixelGrid } = __o.r("js/console-ui.js");
const { paintedSky } = __o.r("js/sky.js");
const { icon } = __o.r("js/icons.js");
const { lockup } = __o.r("js/shell.js");
const { BRAND_TERMS } = __o.r("js/terms.js");
const { h, signed, toast } = __o.r("js/ui.js");


const onward = (w, from, change = {}) => {
const after = w.steps[w.steps.indexOf(from) + 1];
return after ? { ...change, step: after } : { ...change, finished: true };
};
const isLast = (w, step) => w.steps.indexOf(step) === w.steps.length - 1;
const put = (body) => api.put("/v1/me/welcome", body).then((r) => r.welcome);

function choice(name, line, glyph, k, pressed, onToggle, one = false) {
const b = h("button", { class: `cn-wl-choice${one ? " cn-wl-choice--one" : ""}`, type: "button", "aria-pressed": String(pressed) }, typeof glyph === "string" ? tile(glyph, k, h) : glyph, h("span", { class: "cn-wl-choice-t" }, name), h("span", { class: "cn-wl-choice-d" }, line), h("span", { class: "cn-wl-tick", "aria-hidden": "true" }, icon("check")));
b.addEventListener("click", () => {
const now = b.getAttribute("aria-pressed") !== "true";
b.setAttribute("aria-pressed", String(now));
onToggle(now);
});
return b;
}

let total = 0;
function stepHead(n, of, title, line) {
return [
h("p", { class: "cn-wl-count" }, `Step ${n} of ${total || of}`),
h("h1", { class: "cn-wl-h", tabindex: "-1", "data-title": "" }, title),
line ? h("p", { class: "cn-wl-line" }, line) : null,
];
}

const button = (label, onclick, primary = true, type = "button") => h("button", { class: `cn-btn${primary ? " cn-btn--primary" : ""}`, type, onclick }, label);


const MAKES = [
["youtube", "YouTube", "Videos and Shorts", "play", "YouTube"],
["podcast", "A podcast", "Audio or video episodes", "mic", "a podcast"],
["newsletter", "A newsletter", "Posts to subscribers", "mail", "a newsletter"],
["tiktok", "TikTok", "Short videos. Read for sponsorships; not rated yet", "phone", "TikTok"],
["instagram", "Instagram", "A professional account. Read for sponsorships; not rated yet", "camera", "Instagram"],
["snapchat", "Snapchat", "Stories and Spotlight", "image", "Snapchat"],
["x", "X", "Posts and video", "megaphone", "X"],
["product", "A product brand", "Hardware, software or goods you make and sell", "box", "a product brand's shop"],
];

const shown = (k) => (k === "podcast" ? on("podcasts") : k === "tiktok" ? on("tiktok") : k === "instagram" ? on("instagram") : true);

const markOf = (glyph) => h("span", { class: "cn-conn-mark cn-wl-mark", "data-group": "work", "aria-hidden": "true" }, icon(glyph));

const orList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);

function plainly(err, name) {
if (["source_unavailable", "integration_unavailable", "provider_not_live"].includes(err?.code)) return `${name} can't be connected here yet.`;
if (!err?.status || err.status >= 500) return "That did not go through. Try again in a moment.";
return err.message;
}
const HELP = [
["grow", "Grow", "Know what works against creators your size", "products/rate/", "also"],
["earn", "Earn", "Fair prices, and sponsor reads paid on delivery", "products/sponsorships/", "spon"],
["protect", "Protect", "Find copies of your work", "products/protect/", "rec"],
];

let named = false;
function makeStep(w, next, ctx) {
const picked = new Set(w.answers.makes ?? []);
const had = (ctx.user.displayName ?? "").trim();
const name = h("input", { class: "cn-field-input", name: "displayName", maxlength: 80, autocomplete: "name", value: had });
const status = h("p", { class: "cn-wl-status", role: "status" });
return [
...stepHead(numberOf("make", 1), 3, "Tell Orbe about you", null),
h("label", { class: "cn-wl-field cn-wl-name" }, h("span", null, "Your name"), name, h("small", null, "Brands and buyers you agree to work with see it.")),
h("p", { class: "cn-wl-sub" }, "What do you make? Choose all that apply."),
h("div", { class: "cn-wl-choices cn-wl-choices--top0", role: "group", "aria-label": "What you make" }, MAKES.filter(([k]) => shown(k)).map(([k, n, d, glyph]) => choice(n, d, markOf(glyph), null, picked.has(k), (yes) => (yes ? picked.add(k) : picked.delete(k))))),
status,
h("div", { class: "cn-wl-actions" }, button("Continue", async (e) => {
const given = name.value.trim();
if (given && given !== had) {
e.target.disabled = true;
try {
await api.patch("/v1/me", { displayName: given });
ctx.user.displayName = given;
named = true;
} catch (err) {
e.target.disabled = false;
status.textContent = plainly(err, "Your name");
return;
}
}
await next({ step: "connect", answers: { makes: [...picked] } });
})),
];
}

let sources = null;

let canRate = true;

const ready = (kind) => {
if (!sources) return true;
const s = sources.get(kind);
return !!s && (s.availability === "ready" || s.state !== "not_connected");
};

const CONNECTS = ["youtube", "podcast", "newsletter", "tiktok", "instagram"];
const canConnect = (k) => shown(k) && ready(k === "newsletter" ? "substack" : k);

function connectable() {
if (on("rating") && canRate) return true;
return CONNECTS.some(canConnect);
}

let order = [];
const numberOf = (id, n) => (order.includes(id) ? order.indexOf(id) + 1 : n);
function connectStep(w, next, ctx) {
const chosen = new Set(w.answers.makes?.length ? w.answers.makes : ["youtube"]);

const others = !CONNECTS.some((k) => chosen.has(k) && canConnect(k)) && !(on("rating") && canRate);
const makes = others ? new Set(CONNECTS.filter(canConnect)) : chosen;
const status = h("p", { class: "cn-wl-status", role: "status" });
const ways = [];
const missing = [];
const nameOf = (k) => MAKES.find((m) => m[0] === k)?.[4] ?? k;

const signIn = (name, start) => async (e) => {
e.target.disabled = true;
status.textContent = "";
try {
await put({ step: "rating" });
await beginSignIn(start, "/orbe-site/demo/app/welcome");
} catch (err) {
await put({ step: "connect" }).catch(() => {});
e.target.disabled = false;
status.textContent = plainly(err, name);
}
};
if (makes.has("youtube")) {
if (ready("youtube")) {
ways.push(h("div", { class: "cn-wl-way" },
h("div", null, h("p", { class: "cn-wl-way-t" }, "Your YouTube channel"), h("p", { class: "cn-wl-way-d" }, "Read only, through Google. Orbe never posts or changes anything.")),
button("Continue with YouTube", signIn("YouTube", "/v1/me/connections/youtube_analytics/start"), false),
));
} else missing.push("youtube");
}
if (makes.has("podcast") && on("podcasts")) {
if (ready("podcast")) {
const feed = h("input", { class: "cn-field-input", type: "url", name: "feedUrl", placeholder: "https://your-host.com/feed.xml", "aria-label": "Your show's RSS feed", inputmode: "url", autocomplete: "url", required: true });
ways.push(h("form", { class: "cn-wl-way", onsubmit: async (e) => {
e.preventDefault();
const btn = e.target.querySelector("button");
btn.disabled = true;
status.textContent = "Reading your feed.";
try {
const r = await api.post("/v1/me/podcasts", { feedUrl: feed.value.trim() });
await api.put("/v1/me/podcasts/onboarding", { showId: r.show.showId, step: "host", route: r.setup.host.route });
status.textContent = `${r.show.title} found. Finish its set-up under Podcasts whenever you like.`;
await next({ step: "rating" });
} catch (err) {
btn.disabled = false;
status.textContent = plainly(err, "Your show");
}
} },
h("div", null, h("p", { class: "cn-wl-way-t" }, "Your show's feed"), h("p", { class: "cn-wl-way-d" }, "The public RSS address your host gives you. Nothing changes for listeners.")),
h("div", { class: "cn-wl-inline" }, feed, button("Add", null, false, "submit")),
));
} else missing.push("podcast");
}
if (makes.has("newsletter")) {
if (ready("substack")) {
ways.push(h("div", { class: "cn-wl-way" },
h("div", null, h("p", { class: "cn-wl-way-t" }, "Your newsletter"), h("p", { class: "cn-wl-way-d" }, "Your Substack export, guided in six steps. Orbe remembers the publication.")),
button("Add your Substack", () => openConnect("substack", ctx, { back: "/orbe-site/demo/app/welcome" }), false),
));
} else missing.push("newsletter");
}
for (const p of ["tiktok", "instagram"]) {
if (!makes.has(p) || !shown(p)) continue;
const name = nameOf(p);
if (!ready(p)) {
missing.push(p);
continue;
}
ways.push(h("div", { class: "cn-wl-way" },
h("div", null, h("p", { class: "cn-wl-way-t" }, `Your ${name} account`), h("p", { class: "cn-wl-way-d" }, `Read only, on ${name}'s own sign-in page. Orbe never posts.`)),
button(`Continue with ${name}`, signIn(name, p === "tiktok" ? "/v1/me/social/tiktok/start" : "/v1/me/social/instagram/start"), false),
));
}

for (const k of ["snapchat", "x", "product"]) if (makes.has(k)) missing.push(k);
if (others) missing.splice(0, missing.length, ...[...chosen].filter((k) => !canConnect(k)));
const owned = ways.length;
if (on("rating") && canRate) {
const handle = h("input", { class: "cn-field-input", name: "handle", placeholder: "@handle", "aria-label": "Any YouTube channel's handle", autocomplete: "off", required: true, value: w.answers.handle ?? "" });
ways.push(h("form", { class: "cn-wl-way cn-wl-way--quiet", onsubmit: async (e) => {
e.preventDefault();
const btn = e.target.querySelector("button");
btn.disabled = true;
status.textContent = "";

const r = await api.get(`/v1/rate/youtube/${seg(handle.value.trim())}`).catch((err) => ({ err }));
btn.disabled = false;
if (r.err) {
status.textContent = r.err.code === "rating_unavailable" || r.err.code === "rating_pending_youtube_review" ? "Orbe can't rate public YouTube channels here yet. Carry on, and connect your own channel when it can." : plainly(r.err, "That channel");
return;
}
await next({ step: "rating", answers: { handle: handle.value.trim() } });
} },
h("div", null, h("p", { class: "cn-wl-way-t" }, ways.length ? "Or see a rating now" : "See a rating now"), h("p", { class: "cn-wl-way-d" }, "Any YouTube channel, from its public works. No permission needed.")),
h("div", { class: "cn-wl-inline" }, handle, button("Rate", null, false, "submit")),
));
}
const later = missing.length
? h("p", { class: "cn-wl-later" }, others
? `Orbe can't connect ${orList(missing.map(nameOf))} here yet. If you also make one of these, bring it in now; if not, carry on.`
: `Orbe can't connect ${orList(missing.map(nameOf))} here yet, so there is nothing to do for ${missing.length === 1 ? "it" : "them"} now. Carry on; everything else works without ${missing.length === 1 ? "it" : "them"}.`)
: null;
return [
...stepHead(numberOf("connect", 2), 3, "Bring in your work", others ? null : owned ? (ways.length > owned ? "Connect what is yours, or paste any handle to see how Orbe rates." : "Connect what is yours. Orbe only reads.") : ways.length ? "Paste any YouTube handle to see how Orbe rates." : null),
others ? later : null,
ways.length ? h("div", { class: "cn-wl-ways" }, ways) : null,
others ? null : later,
status,
h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "make" }) }, "Back"), button("Continue", () => next({ step: "rating" }))),
];
}

async function firstRating(w) {
if (!on("rating")) return null;
const own = await api.get("/v1/me/rating").catch(() => null);
const rated = (own?.ratings ?? []).find((r) => r.result?.status === "rated");
if (rated) return { who: rated.handle || "Your channel", result: rated.result, own: true };
if (!w.answers.handle) return null;
const r = await api.get(`/v1/rate/youtube/${seg(w.answers.handle)}`).catch(() => null);
if (r?.result?.status === "rated") return { who: r.account?.handle ?? w.answers.handle, result: r.result, own: false };
return r?.result?.message ? { who: w.answers.handle, result: null, message: r.result.message } : null;
}

const SAMPLES = {
youtube: { who: "A sample channel (made up)", sizeBand: "10k to 100k", rating: 1.24, band: "Good", parts: [{ name: "Reach", score: 81 }] },
podcast: { who: "A sample show (made up)", sizeBand: "5k to 25k", rating: 0.96, band: "Good", parts: [{ name: "Completion", score: 77 }] },
newsletter: { who: "A sample newsletter (made up)", sizeBand: "1k to 10k", rating: 1.08, band: "Good", parts: [{ name: "Engagement", score: 74 }] },
};
function sampleFor(w) {
const makes = w.answers.makes ?? [];
const kind = makes.includes("youtube") || !makes.length ? "youtube" : makes.includes("podcast") ? "podcast" : makes.includes("newsletter") ? "newsletter" : "youtube";
const x = SAMPLES[kind];
return { who: x.who, result: { rating: x.rating, band: x.band, sizeBand: x.sizeBand, parts: x.parts }, sample: true };
}

function countUp(el, to) {
el.textContent = signed(to);
if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
const start = performance.now();
const ms = 900;
const step = (t) => {
const k = Math.min(1, (t - start) / ms);
el.textContent = signed(to * (1 - (1 - k) ** 3));
if (k < 1 && el.isConnected) requestAnimationFrame(step);
else el.textContent = signed(to);
};
requestAnimationFrame(step);
}

async function ratingStep(w, next) {
const help = new Set(w.answers.help ?? []);
const r = (await firstRating(w).catch(() => null)) ?? (on("rating") ? sampleFor(w) : null);
let reveal = null;
if (r) {
const part = r.result?.parts?.find((p) => /reach|downloads|opens/i.test(p.name)) ?? r.result?.parts?.[0];

const figure = h("span");
const num = h("span", { class: "cn-wl-num" }, h("span", { class: "cn-wl-num-hold" }, r.result ? signed(r.result.rating) : ""), figure);
if (r.result) countUp(figure, r.result.rating);
reveal = h("div", { class: `cn-wl-reveal${r.sample ? " cn-wl-reveal--sample" : ""}` },
h("div", { class: "cn-wl-reveal-grid" }, pixelGrid(part ? part.score + 1 : null, { cls: "is-reveal", label: part ? `${r.who}: better than ${part.score} in 100 creators the same size on ${part.name.toLowerCase()}` : undefined })),
h("div", { class: "cn-wl-reveal-say" },
r.sample ? h("p", { class: "cn-wl-sample" }, "Sample") : null,
...(r.result
? [

h("p", { class: "cn-wl-figure" }, h("span", { class: "ob-sr" }, `${signed(r.result.rating)}, ${r.result.band}`), h("span", { class: "cn-wl-fig", "aria-hidden": "true" }, num, h("span", { class: "cn-wl-band" }, r.result.band))),
h("p", { class: "cn-wl-line" }, `${r.who}, against ${r.result.sizeBand} creators the same size. Zero is typical.${part ? ` On ${part.name.toLowerCase()}, ahead of ${part.score} in 100.` : ""}`),
r.sample ? null : h("p", { class: "cn-label" }, r.result.attribution?.notice ?? "Independently calculated by Orbe"),
]
: [h("p", { class: "cn-wl-line" }, r.message)]),
),
);
}
return [
...stepHead(numberOf("rating", 3), 3, r?.sample ? "What Orbe will tell you" : reveal ? "Your place among creators your size" : "What do you want help with?", r?.sample ? "How Orbe rates work against creators the same size. Yours takes its place once Orbe can read a channel, a show or a newsletter of yours." : reveal ? null : "Choose all that apply; your home leads with them. Your rating shows there once Orbe can read a channel, a show or a newsletter of yours."),
reveal,
reveal ? h("p", { class: "cn-wl-sub" }, "What do you want help with? Choose all that apply.") : null,
h("div", { class: `cn-wl-choices cn-wl-choices--row${reveal ? "" : " cn-wl-choices--top"}`, role: "group", "aria-label": "What you want help with" }, HELP.map(([k, n, d, g, c]) => choice(n, d, g, c, help.has(k), (yes) => (yes ? help.add(k) : help.delete(k))))),
h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: order.includes("connect") ? "connect" : "make" }) }, "Back"), button(isLast(w, "rating") ? "Open my Orbe" : "Continue", () => next(onward(w, "rating", { answers: { help: [...help] } })))),
];
}

const WANTS = [
["reads", "Guaranteed reads", "Paid in full only on verified delivery", "products/sponsorships/", "spon"],
["discovery", "Find creators", "By their results at their size", "products/rate/", "also"],
["rights", "Usage rights", "Who may use what, until when", "products/rights/", "note"],
];
function profileStep(w, next, ctx) {
const org = h("input", { class: "cn-field-input", name: "org", required: true, maxlength: 120, autocomplete: "organization", placeholder: "Harbour Oats" });
const cat = h("input", { class: "cn-field-input", name: "category", required: true, maxlength: 40, placeholder: "Breakfast foods" });
const terms = h("input", { type: "checkbox", name: "acceptTerms", required: true });
const status = h("p", { class: "cn-wl-status", role: "status" });
const f = h("form", { class: "cn-wl-form", onsubmit: async (e) => {
e.preventDefault();
const btn = f.querySelector("[type=submit]");
btn.disabled = true;
try {
if (on("sponsorships")) await api.put("/v1/brand/profile", { org: org.value.trim(), category: cat.value.trim(), acceptTerms: true });
await api.patch("/v1/buyer/me", { org: org.value.trim() });
ctx.brandSaved();
await next({ step: "wants" });
} catch (err) {
btn.disabled = false;
status.textContent = err.message;
}
} },
h("label", { class: "cn-wl-field" }, h("span", null, "Brand"), org),
on("sponsorships") ? h("label", { class: "cn-wl-field" }, h("span", null, "What you sell"), cat, h("small", null, "One word or two. Creators who exclude it are never shown to you.")) : null,
on("sponsorships") ? h("details", { class: "cn-wl-terms" }, h("summary", null, "The brand terms"), h("p", null, BRAND_TERMS)) : null,
on("sponsorships") ? h("label", { class: "cn-wl-check" }, terms, h("span", null, "I accept the brand terms.")) : null,
status,
h("div", { class: "cn-wl-actions" }, button("Continue", null, true, "submit")),
);
if (!on("sponsorships")) cat.required = false;
return [...stepHead(1, 2, "Who are you booking for?", "Creators see this when you send an offer."), f];
}
function wantsStep(w, next) {
const picked = new Set(w.answers.wants ?? []);
return [
...stepHead(2, 2, "What do you want from Orbe?", "Choose all that apply. Your home leads with them."),
h("div", { class: "cn-wl-choices" }, WANTS.map(([k, n, d, g, c]) => choice(n, d, g, c, picked.has(k), (yes) => (yes ? picked.add(k) : picked.delete(k))))),
h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "profile" }) }, "Back"), button(isLast(w, "wants") ? "Open Orbe" : "Continue", () => next(onward(w, "wants", { answers: { wants: [...picked] } })))),
];
}

const STARTS = [
["brief", "My first brief", "Reads at each creator's price, paid on verified delivery", "products/offer/", "spon"],
["category", "Show me my category", "Who sponsors what you sell, with the evidence", "products/diligence/", "rec"],
];

function marketStep(w, next) {
const names = [];
const list = h("ul", { class: "bi-chips" });
const draw = () => list.replaceChildren(...names.map((n, i) => h("li", { class: "bi-chip" }, h("span", null, n), h("button", { class: "cn-iconbtn", type: "button", "aria-label": `Remove ${n}`, onclick: () => (names.splice(i, 1), draw()) }, icon("close")))));
const add = h("input", { class: "cn-field-input", name: "competitor", maxlength: 120, autocomplete: "off", placeholder: "A brand you compete with, then Enter" });
const take = () => {
const v = add.value.trim();
if (v && names.length < 10 && !names.some((x) => x.toLowerCase() === v.toLowerCase())) names.push(v);
add.value = "";
draw();
};
add.addEventListener("keydown", (e) => {
if (e.key !== "Enter") return;
e.preventDefault();
take();
});
let start = w.answers.start ?? (on("reads_checkout") ? "brief" : "category");
const starts = STARTS.filter(([k]) => k === "category" || on("reads_checkout"));
const cards = starts.map(([k, n, d, g, c]) => {
const b = choice(n, d, g, c, start === k, () => {
start = k;
cards.forEach((x, i) => x.setAttribute("aria-pressed", String(starts[i][0] === k)));
}, true);
return b;
});
const status = h("p", { class: "cn-wl-status", role: "status" });
return [
...stepHead(numberOf("market", w.steps.indexOf("market") + 1), w.steps.length, "Who do you compete with?", "Orbe follows their sponsorships across YouTube, podcasts and newsletters, with the public works as evidence."),
h("div", { class: "cn-wl-form" }, h("label", { class: "cn-wl-field" }, h("span", null, "Competitors"), add, h("small", null, "Up to ten. Any brand, on Orbe or not.")), list),
starts.length > 1 ? h("p", { class: "cn-wl-sub" }, "Where do you want to start?") : null,
starts.length > 1 ? h("div", { class: "cn-wl-choices cn-wl-choices--row" }, cards) : null,
status,
h("div", { class: "cn-wl-actions" },
h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "wants" }) }, "Back"),
button(isLast(w, "market") ? "Open Orbe" : "Continue", async (e) => {
take();
e.target.disabled = true;
try {
if (names.length) await api.put("/v1/brand/intel/settings", { competitors: names });
await next(onward(w, "market", { answers: { start } }));
} catch (err) {
e.target.disabled = false;
status.textContent = err.message;
}
}),
),
];
}


const EXTRA = { creator: {}, buyer: {} };

function registerStep(side, id, view, when) {
EXTRA[side][id] = when ? Object.assign((...a) => view(...a), { when }) : view;
}

const INVITE_ROLES = [["manager", "Manager", "Offers and campaigns; money waits for you"], ["editor", "Editor", "The work itself, no money"], ["viewer", "Viewer", "Reads, changes nothing"]];

function teamStep(w, next) {
const rows = h("div", { class: "cn-wl-invites" });
const status = h("p", { class: "cn-wl-status", role: "status" });
const addRow = (focus) => {
if (rows.childElementCount >= 3) return;
const n = rows.childElementCount + 1;
const email = h("input", { class: "cn-field-input", type: "email", name: `email${n}`, maxlength: 254, autocomplete: "off", placeholder: n === 1 ? "editor@example.com" : "name@example.com", "aria-label": `Email ${n}` });
const role = h("select", { class: "cn-select-input", name: `role${n}`, "aria-label": `Role ${n}` }, INVITE_ROLES.map(([v, t]) => h("option", { value: v, selected: v === (n === 1 ? "editor" : "manager") }, t)));
email.addEventListener("input", label);
rows.append(h("div", { class: "cn-wl-invite" }, h("label", { class: "cn-field" }, icon("mail"), email), h("label", { class: "cn-select" }, role, icon("chevron", { cls: "cn-i--chev" }))));
more.hidden = rows.childElementCount >= 3;
if (focus) email.focus();
};
const more = h("button", { class: "cn-linkbtn", type: "button", onclick: () => addRow(true) }, icon("plus"), "Add another");

const send = button("Open Orbe", null, true, "submit");
function label() {
send.textContent = [...rows.querySelectorAll("input")].some((i) => i.value.trim() && i.checkValidity()) ? "Send and open Orbe" : "Open Orbe";
}
const f = h("form", { class: "cn-wl-form", onsubmit: async (e) => {
e.preventDefault();
const wanted = [...rows.children].map((r) => ({ email: r.querySelector("input").value.trim(), role: r.querySelector("select").value })).filter((x) => x.email);
if (!wanted.length) return next(onward(w, "team"));
const btn = f.querySelector("[type=submit]");
btn.disabled = true;
status.textContent = "";
const sent = [];
for (const x of wanted) {
try {
await api.post("/v1/team/invitations", x);
sent.push(x.email);
} catch (err) {
btn.disabled = false;
status.textContent = `${x.email}: ${err.message}`;
return;
}
}
toast(sent.length === 1 ? `Invitation sent to ${sent[0]}.` : `${sent.length} invitations sent.`);
await next(onward(w, "team"));
} },
rows,
more,
h("ul", { class: "cn-wl-roles" }, INVITE_ROLES.map(([, t, d]) => h("li", null, h("b", null, t), " ", d))),
status,
h("div", { class: "cn-wl-actions" }, send),
);
addRow(false);
return [
...stepHead(numberOf("team", w.steps.indexOf("team") + 1), w.steps.length, "Who works with you?", "Invite an editor, a manager or anyone who helps. They sign in with their own account, and you decide what each may do."),
f,
];
}
registerStep("creator", "team", teamStep);
registerStep("buyer", "team", teamStep);
registerStep("buyer", "market", marketStep, () => on("brand_intel"));

async function render(main, ctx) {
document.body.dataset.screen = "welcome";
const card = h("div", { class: "cn-wl-card" });
const dots = h("ol", { class: "cn-wl-dots", "aria-hidden": "true" });
const stage = h("div", { class: "cn-wl" },
h("header", { class: "cn-wl-top" }, h("a", { class: "cn-mark", href: "/orbe-site/demo/app/", "aria-label": "Orbe" }, lockup()), h("button", { class: "cn-wl-skip", type: "button", onclick: () => finish({ skipped: true }) }, "Skip for now")),
h("div", { class: "cn-wl-main" }, dots, card),
);
main.append(stage);
paintedSky(stage, { seed: 19 });
const creator = ctx.user.type === "creator";
const [{ welcome: first, canRate: rates }, list] = await Promise.all([api.get("/v1/me/welcome"), creator ? api.get("/v1/me/sources").catch(() => null) : null]);
let w = first;
canRate = rates !== false;
sources = list ? new Map((list.groups.find((g) => g.id === "work")?.sources ?? []).map((x) => [x.id.split(":")[0], x])) : null;
const extra = Object.fromEntries(Object.entries(EXTRA[ctx.user.type]).filter(([, v]) => !v.when || v.when()));
const views = { ...(creator ? { make: makeStep, connect: connectStep, rating: ratingStep } : { profile: profileStep, wants: wantsStep }), ...extra };
async function finish(change) {
w = await put(change);
window.dispatchEvent(new Event("orbe:welcome-done"));

const start = creator || change.skipped ? null : w.answers.start;
const to = start === "brief" && on("reads_checkout") ? "/orbe-site/demo/app/reads" : start === "category" && on("brand_intel") ? "/orbe-site/demo/app/intelligence" : "/orbe-site/demo/app/";

if (named) location.replace(to);
else ctx.go(to, { replace: true });
}
async function next(change) {
if (change.finished) return finish(change);
w = await put(change);
await draw();
}
let shownStep = null;
async function draw() {

order = w.steps.filter((x) => views[x] && (x !== "connect" || connectable()));
total = order.length;
const at = order.indexOf(w.step);
dots.replaceChildren(...order.map((_, i) => h("li", { class: i < at ? "is-done" : i === at ? "is-here" : "" })));
if (at < 0) {

const nextStep = w.steps.slice(w.steps.indexOf(w.step) + 1).find((x) => order.includes(x));
return nextStep ? next({ step: nextStep }) : finish({ finished: true });
}
card.setAttribute("aria-busy", "true");
const nodes = (await views[w.step](w, next, ctx)).filter(Boolean);
card.removeAttribute("aria-busy");
card.classList.remove("is-in");
card.replaceChildren(...nodes);

if (shownStep !== w.step) window.scrollTo(0, 0);
shownStep = w.step;
requestAnimationFrame(() => card.classList.add("is-in"));
card.querySelector("[data-title]")?.focus({ preventScroll: true });
document.title = `Welcome: Orbe`;
}
draw();
}
});
