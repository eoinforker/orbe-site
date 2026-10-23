__o.d("js/creator/retention.js", function (__x) {
"use strict";
__o.e(__x, { retentionTab: () => retentionTab });
const { api, seg } = __o.r("js/api.js");
const { emptyState } = __o.r("js/console-ui.js");
const { block, h } = __o.r("js/ui.js");

const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

function sketch(r) {
const W = 600, H = 120;
const x = (sec) => (sec / r.durationSec) * W;
return h("svg", { class: "cn-ret-svg", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Still watching after the opening: ${Math.round(r.opening.stillWatching * 100)} in 100; at the end: ${Math.round(r.endWatching * 100)} in 100.` },
...r.cuts.map((c) => h("rect", { class: "cn-ret-cut", x: x(c.fromSec), y: 0, width: Math.max(2, x(c.toSec) - x(c.fromSec)), height: H })),
h("line", { class: "cn-ret-open", x1: x(r.opening.sec), y1: 0, x2: x(r.opening.sec), y2: H }),
...r.drops.map((d) => h("circle", { class: "cn-ret-drop", cx: x(d.fromSec), cy: H / 2, r: 4 })),
);
}
function retentionTab(el, id) {
return block(el, () => api.get(`/v1/me/retention/${seg(id)}`), ({ retention: t }) => {
if (!t.available) {
return emptyState("pulse", t.reason, t.action === "connect" ? [["Connect YouTube", "/orbe-site/demo/app/settings/connections", true]] : []);
}
const r = t.reading;
const vs = r.opening.vsTypical ? `, ${r.opening.vsTypical === "typical" ? "typical" : `${r.opening.vsTypical} typical`} for videos this long` : "";
return [
h("p", { class: "cn-run-who" }, `${Math.round(r.opening.stillWatching * 100)} in every 100 viewers are still watching at ${mmss(r.opening.sec)}${vs}.`),
sketch(r),
r.cuts.length
? h("ul", { class: "cn-run-list cn-run-list--wide" }, r.cuts.map((c) => h("li", null, h("span", null, h("b", null, `${mmss(c.fromSec)} to ${mmss(c.toSec)}`)), h("span", { class: "cn-hist-d" }, c.why))))
: h("p", null, "No stretch stands out to cut: viewers leave at an even pace."),
r.drops.length ? h("p", { class: "cn-label" }, `Steepest drops at ${r.drops.map((d) => mmss(d.fromSec)).join(", ")}.`) : null,
h("p", { class: "cn-label" }, r.basis),
];
});
}
});
__o.d("js/creator/work.js", function (__x) {
"use strict";
__o.e(__x, { lineDiff: () => lineDiff, versusChart: () => versusChart, facts: () => facts, render: () => render });
const { api, apiHref, can, on, seg } = __o.r("js/api.js");
const { retentionTab } = __o.r("js/creator/retention.js");
const { nameHere } = __o.r("js/shell.js");
const { ago, cover, emptyState, rating, section, toolShell } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { KINDS } = __o.r("js/terms.js");
const { action, actions, block, day, failure, h, notThere, plural, signed, tabs, toast } = __o.r("js/ui.js");

const W = (id) => `/v1/me/works/${seg(id)}`;
const MAX_BYTES = 5 * 1024 * 1024;

function lineDiff(a, b) {
const x = a.split("\n");
const y = b.split("\n");
const n = x.length, m = y.length;
const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const out = [];
let i = 0, j = 0;
while (i < n && j < m) {
if (x[i] === y[j]) (out.push([" ", x[i]]), i++, j++);
else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", x[i++]]);
else out.push(["+", y[j++]]);
}
while (i < n) out.push(["-", x[i++]]);
while (j < m) out.push(["+", y[j++]]);
return out;
}

const MEDIA_KINDS = ["youtube", "twitch", "podcast"];

const dropIn = (kind) => (kind === "podcast" ? "Drop in the episode's video" : kind === "twitch" ? "Drop in the stream's recording" : "Drop in the video");

const TIMED_KINDS = ["youtube", "twitch", "podcast"];
const KIND_ICON = { published: "play", read: "chart", rated: "chart", fix: "sparkle", booked: "megaphone", linked: "link", measured: "pulse", outcome: "check" };
function notesTab(el, id) {
const text = h("textarea", { class: "cn-notes-text", rows: 14, maxlength: 50000, "aria-label": "Notes and script", placeholder: "Notes, the script, what to try next time.", readonly: !can("content") });
const versions = h("div", { class: "cn-notes-versions" });
const compare = h("div", { class: "cn-notes-compare", "aria-live": "polite" });
let latest = null;
let list = [];
const draw = (r) => {
latest = r.latest;
list = r.versions;
if (document.activeElement !== text) text.value = r.latest?.body ?? "";
versions.replaceChildren(
list.length
? h("ol", { class: "cn-vlist" }, list.map((v) => h("li", null, h("span", { class: "cn-vlist-n" }, `Version ${v.version}`), h("span", { class: "cn-item-d" }, `${v.chars.toLocaleString("en-GB")} characters`), h("time", { datetime: v.createdAt }, ago(v.createdAt)))))
: h("p", { class: "cn-item-d" }, "Every save is kept as a version."),
);
compare.replaceChildren(...(list.length >= 2 ? comparer() : [h("p", { class: "cn-item-d" }, "Save twice to compare two versions.")]));
};
function comparer() {
const pick = (label, value) => h("select", { class: "ob-input ap-select", "aria-label": label }, list.map((v) => h("option", { value: String(v.version), selected: v.version === value }, `Version ${v.version}`)));
const a = pick("Older version", list[1].version);
const b = pick("Newer version", list[0].version);
const out = h("div", { class: "cn-diff" });
const run = async () => {
try {
const [x, y] = await Promise.all([api.get(`${W(id)}/notes/${a.value}`), api.get(`${W(id)}/notes/${b.value}`)]);
const rows = lineDiff(x.note.body, y.note.body);
out.replaceChildren(...rows.map(([k, line]) => h("div", { class: `cn-diff-row${k === "+" ? " is-add" : k === "-" ? " is-del" : ""}` }, h("span", { "aria-hidden": "true" }, k), h("span", null, k === "+" ? h("span", { class: "ob-sr" }, "Added: ") : k === "-" ? h("span", { class: "ob-sr" }, "Removed: ") : null, line || " "))));
} catch (e) {
out.replaceChildren(failure(e));
}
};
a.addEventListener("change", run);
b.addEventListener("change", run);
run();
return [h("div", { class: "cn-diff-pick" }, a, icon("arrowRight"), b), out];
}

const save = action("Save a version", async () => {
const body = text.value;
const before = [...versions.childNodes];
if (body !== (latest?.body ?? "")) {
const pending = h("li", { class: "is-pending" }, h("span", { class: "cn-vlist-n" }, `Version ${(list[0]?.version ?? 0) + 1}`), h("span", { class: "cn-item-d" }, `${body.length.toLocaleString("en-GB")} characters`), h("time", null, "Saving"));
const ol = versions.querySelector(".cn-vlist");
if (ol) ol.prepend(pending);
else versions.replaceChildren(h("ol", { class: "cn-vlist" }, pending));
}
try {
const r = await api.put(`${W(id)}/notes`, { body });
draw(r);
return r.saved ? `Saved as version ${r.latest.version}.` : "No change to save.";
} catch (e) {
versions.replaceChildren(...before);
throw e;
}
}, { primary: true });

text.addEventListener("keydown", (e) => {
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && can("content")) {
e.preventDefault();
save.click();
}
});
el.append(
h("div", { class: "cn-notes" },
section({ title: "Notes and script", line: "Kept in versions: every save stays, and any two can be compared." }, text, can("content") ? actions(save) : null),
h("div", { class: "cn-notes-side" }, section({ title: "Versions" }, versions), section({ title: "Compare" }, compare)),
),
);
block(versions, () => api.get(`${W(id)}/notes`), (r) => (draw(r), versions.childNodes[0] ?? null));
void latest;
}
function documentsTab(el, id) {
const list = h("div");
const reload = () =>
block(list, () => api.get(`${W(id)}/documents`), ({ documents }) =>
documents.length
? h("ul", { class: "cn-docs" }, documents.map((d) =>
h("li", { class: "cn-doc" },
h("span", { class: "cn-doc-ico", "aria-hidden": "true" }, icon(d.kind === "link" ? "link" : "doc")),
h("div", { class: "cn-doc-main" },
d.kind === "link" ? h("a", { href: d.url, target: "_blank", rel: "noopener" }, d.title) : h("a", { href: apiHref(`${W(id)}/documents/${seg(d.id)}/file`) }, d.title),
h("p", { class: "cn-item-d" }, d.kind === "link" ? new URL(d.url).hostname : `${d.mediaType === "application/pdf" ? "PDF" : "Text"}, ${Math.max(1, Math.round(d.size / 1024))} KB`, `, added ${day(d.createdAt)}`),
),
can("content") && actions(action("Remove", async () => {
await api.del(`${W(id)}/documents/${seg(d.id)}`);
reload();
return "Removed.";
}, { danger: true, confirm: `Remove ${d.title}?` })),
),
))
: emptyState("doc", "No documents on this work yet.", [], "Briefs, contracts and licences as PDF or text, or a link to where the footage lives."),
);
const linkTitle = h("input", { class: "ob-input", name: "title", placeholder: "Edit on Frame.io", maxlength: 120, required: true, "aria-label": "Link name" });
const linkUrl = h("input", { class: "ob-input", name: "url", type: "url", placeholder: "https://", required: true, "aria-label": "Link address" });
const linkForm = h("form", { class: "cn-doc-form", onsubmit: async (e) => {
e.preventDefault();
try {
await api.post(`${W(id)}/documents/link`, { title: linkTitle.value.trim(), url: linkUrl.value.trim() });
e.target.reset();
toast("Link added.");
reload();
} catch (err) {
if (err.code !== "sent_to_owner") toast(err.message);
}
} }, linkTitle, linkUrl, h("button", { class: "cn-btn cn-btn--s", type: "submit" }, icon("link"), "Add link"));
const file = h("input", { class: "ob-sr", type: "file", accept: "application/pdf,text/plain,text/markdown,.md,.txt,.pdf", id: "doc-file" });
file.addEventListener("change", async () => {
const f = file.files?.[0];
file.value = "";
if (!f) return;
if (f.size > MAX_BYTES) return toast("Documents are up to 5 MB. Link to anything larger.");
const type = f.type || (/\.md$/i.test(f.name) ? "text/markdown" : /\.txt$/i.test(f.name) ? "text/plain" : "");
try {
await api.upload(`${W(id)}/documents/file`, f, type, f.name.replace(/\.[^.]+$/, ""));
toast(`${f.name} added.`);
reload();
} catch (err) {
if (err.code !== "sent_to_owner") toast(err.message);
}
});
el.append(
section({ title: "Documents", line: "Links to where the footage lives, and small documents: PDF or text, up to 5 MB. Only you can open them." },
list,
can("content") ? h("div", { class: "cn-doc-add" }, linkForm, h("label", { class: "cn-btn cn-btn--s", for: "doc-file" }, icon("plus"), "Add a PDF or text file"), file) : null,
),
);
reload();
}
function shareTab(el, id) {
const list = h("div");
const made = h("div", { "aria-live": "polite" });
const reload = () =>
block(list, () => api.get(`${W(id)}/shares`), ({ shares }) =>
shares.length
? h("ul", { class: "cn-list" }, shares.map((x) =>
h("li", { class: "cn-share" },
h("div", null,
h("p", { class: "cn-item-t" }, x.label ?? "Share link", h("span", { class: `cn-pill cn-pill--${x.live ? "done" : "off"}` }, h("span", { class: "cn-pill-dot" }), x.live ? "Live" : x.revokedAt ? "Revoked" : "Expired")),
h("p", { class: "cn-item-d" }, `${[x.parts.timeline && "timeline", x.parts.rating && "rating", x.parts.deliveries && "sponsor reads", x.parts.documents.length && `${x.parts.documents.length} document${x.parts.documents.length === 1 ? "" : "s"}`].filter(Boolean).join(", ")}. ${x.live ? `Until ${day(x.expiresAt)}.` : ""}`),
),
x.live ? actions(action("Revoke", async () => {
await api.del(`${W(id)}/shares/${seg(x.id)}`);
reload();
return "Revoked. The link stops working at once.";
}, { danger: true })) : null,
),
))
: emptyState("link", "No share links yet.", [], "A brand, an editor or a buyer sees only what you tick, until the link expires or you revoke it."),
);
const box = (name, label, checked) => h("label", { class: "cn-tick" }, h("input", { type: "checkbox", name, checked }), h("span", null, label));
const docs = h("div", { class: "cn-ticks" });
api.get(`${W(id)}/documents`).then(({ documents }) => docs.replaceChildren(...documents.map((d) => box(`doc:${d.id}`, d.title, false)))).catch(() => {});
const days = h("select", { class: "ob-input ap-select", name: "days", "aria-label": "Lasts" }, [[1, "1 day"], [7, "7 days"], [30, "30 days"], [90, "90 days"]].map(([v, t]) => h("option", { value: String(v), selected: v === 7 }, t)));
const label = h("input", { class: "ob-input", name: "label", maxlength: 80, placeholder: "For the brand", "aria-label": "Who it is for" });
const f = h("form", { class: "cn-share-form", onsubmit: async (e) => {
e.preventDefault();
const d = new FormData(f);
try {
const r = await api.post(`${W(id)}/shares`, {
parts: { timeline: d.has("timeline"), rating: d.has("rating"), deliveries: d.has("deliveries"), documents: [...d.keys()].filter((k) => k.startsWith("doc:")).map((k) => k.slice(4)) },
days: Number(days.value),
label: label.value.trim() || undefined,
});
const link = h("input", { class: "ob-input", readonly: true, value: r.url, "aria-label": "Share link", onfocus: (ev) => ev.target.select() });
made.replaceChildren(h("div", { class: "cn-banner" }, h("p", null, r.notice), h("div", { class: "cn-doc-form" }, link, h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "button", onclick: async () => { try { await navigator.clipboard.writeText(r.url); toast("Link copied."); } catch { link.select(); } } }, icon("copy"), "Copy"))));
reload();
} catch (err) {
if (err.code !== "sent_to_owner") toast(err.message);
}
} },
h("fieldset", { class: "cn-ticks" }, h("legend", null, "Show"), box("timeline", "Timeline", true), box("rating", "Rating", true), box("deliveries", "Sponsor reads and proof", false)),
h("fieldset", null, h("legend", null, "Documents"), docs),
h("div", { class: "cn-doc-form" }, label, days, h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "submit" }, "Make a link")),
);
el.append(section({ title: "Share a read-only link", line: "For a brand, an editor or a buyer. Never indexed; shown once; ends when it expires or you revoke it." }, f, made), section({ title: "Your links" }, list));
reload();
}

const NAMES = { new_free: "New free subscribers", new_paid: "New paid subscribers", views: "Views", likes: "Likes", comments: "Comments", shares: "Shares", downloads: "Downloads", opens: "Opens", clicks: "Clicks", watchTimeMin: "Watch time (minutes)", averageViewDurationSec: "Average view (seconds)", subscribersGained: "Subscribers gained", impressions: "Impressions", ctr: "Click-through" };
const nameOf = (k) => NAMES[k] ?? k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const n0 = (x) => (typeof x === "number" && Number.isFinite(x) ? Math.round(x).toLocaleString("en-GB") : "None yet");
const short = (x) => {
if (typeof x !== "number" || !Number.isFinite(x)) return "None yet";
const a = Math.abs(x);
return a >= 1e6 ? `${(x / 1e6).toFixed(a >= 1e7 ? 0 : 1)}m` : a >= 1e4 ? `${Math.round(x / 1e3)}k` : a >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : String(Math.round(x));
};
const pct = (x, digits = 1) => (typeof x === "number" && Number.isFinite(x) ? `${(x * 100).toFixed(digits)}%` : "None yet");
const mins = (sec) => (sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}` : "Unknown");
const SVG = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, ...kids) => {
const el = document.createElementNS(SVG, tag);
for (const [k, v] of Object.entries(attrs ?? {})) if (v !== null && v !== undefined) el.setAttribute(k, String(v));
el.append(...kids.filter(Boolean));
return el;
};

function versusChart(v) {

const narrow = matchMedia("(max-width: 560px)").matches;
const W = narrow ? 360 : 720, H = narrow ? 230 : 220, L = narrow ? 40 : 52, R = 14, T = 14, B = 30;
const days = v.curve.map((p) => p.day);
const maxDay = Math.max(...days, v.atAge.day);
const pts = (v.points ?? []).filter((p) => p.value > 0);
const vals = [...v.curve.flatMap((p) => [p.p25, p.p75]), ...pts.map((p) => p.value)].filter((x) => x > 0);
const lo = Math.log10(Math.max(1, Math.min(...vals) * 0.8));
const hi = Math.log10(Math.max(...vals) * 1.15);
const x = (d) => L + (Math.sqrt(Math.max(d, 0)) / Math.sqrt(maxDay)) * (W - L - R);
const y = (val) => T + (1 - (Math.log10(Math.max(val, 1)) - lo) / (hi - lo || 1)) * (H - T - B);
const band = [...v.curve.map((p) => `${x(p.day).toFixed(1)},${y(p.p75).toFixed(1)}`), ...[...v.curve].reverse().map((p) => `${x(p.day).toFixed(1)},${y(p.p25).toFixed(1)}`)].join(" ");
const mid = v.curve.map((p) => `${x(p.day).toFixed(1)},${y(p.median).toFixed(1)}`).join(" ");
const ticksY = [];

for (const steps of [[1, 2, 3, 5, 7], [1, 2, 5], [1, 3], [1]]) {
ticksY.length = 0;
for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) for (const m of steps) { const val = m * 10 ** e; if (Math.log10(val) >= lo && Math.log10(val) <= hi) ticksY.push(val); }
if (ticksY.length <= 5) break;
}
const ticksX = (narrow ? [1, 7, 30, 90, 365] : [1, 2, 7, 14, 30, 90, 180, 365]).filter((d) => d <= maxDay);
const label = `${nameOf(v.metric)} against creators the same size. At ${v.atAge.day < 1 ? "under a day" : `${Math.round(v.atAge.day)} days`}: ${v.atAge.value === null ? "no reading" : n0(v.atAge.value)}, where the middle half is ${n0(v.atAge.p25)} to ${n0(v.atAge.p75)}.`;
const ageOf = (d) => (d < 1 ? "Under a day" : `Day ${Math.round(d)}`);

const tipText = svg("text", { class: "cn-wp-tip-t" });
const tipBox = svg("rect", { class: "cn-wp-tip-b", rx: 6, height: 26 });
const tip = svg("g", { class: "cn-wp-tip", visibility: "hidden", "aria-hidden": "true" }, tipBox, tipText);
const show = (p) => {
const text = `${ageOf(p.day)}: ${n0(p.value)} ${nameOf(v.metric).toLowerCase()}`;
const w = text.length * 6.6 + 18;
const tx = Math.min(Math.max(x(p.day) - w / 2, 2), W - w - 2);
const ty = y(p.value) > T + 40 ? y(p.value) - 38 : y(p.value) + 14;
tipBox.setAttribute("x", tx.toFixed(1));
tipBox.setAttribute("y", ty.toFixed(1));
tipBox.setAttribute("width", w.toFixed(1));
tipText.setAttribute("x", (tx + 9).toFixed(1));
tipText.setAttribute("y", (ty + 17).toFixed(1));
tipText.textContent = text;
tip.setAttribute("visibility", "visible");
};
const hide = () => tip.setAttribute("visibility", "hidden");
return svg("svg", { class: `cn-wp-chart${narrow ? " cn-wp-chart--narrow" : ""}`, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label },
...ticksY.map((t) => svg("g", null, svg("line", { class: "cn-wp-grid", x1: L, x2: W - R, y1: y(t), y2: y(t) }), svg("text", { class: "cn-wp-axis", x: L - 8, y: y(t) + 4, "text-anchor": "end" }, short(t)))),
...ticksX.map((d) => svg("text", { class: "cn-wp-axis", x: x(d) > W - R - 24 ? W - R : x(d), y: H - 8, "text-anchor": x(d) > W - R - 24 ? "end" : "middle" }, d === 1 ? "1 day" : `${d} days`)),
svg("polygon", { class: "cn-wp-band", points: band }),
svg("polyline", { class: "cn-wp-mid", points: mid, fill: "none" }),
svg("line", { class: "cn-wp-today", x1: x(v.atAge.day), x2: x(v.atAge.day), y1: T, y2: H - B }),
...pts.map((p) => svg("circle", { class: `cn-wp-dot${p.basis === "connected" ? " is-connected" : ""}`, cx: x(p.day), cy: y(p.value), r: 5 })),
...pts.map((p) => {
const hit = svg("circle", { class: "cn-wp-hit", cx: x(p.day), cy: y(p.value), r: narrow ? 18 : 12, tabindex: "0", "aria-label": `${ageOf(p.day)}: ${n0(p.value)}` });
hit.addEventListener("pointerenter", () => show(p));
hit.addEventListener("pointerdown", () => show(p));
hit.addEventListener("focus", () => show(p));

hit.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && hide());
hit.addEventListener("blur", hide);
return hit;
}),
tip,
);
}

const barOf = (score) => {
const el = h("span", { class: "cn-wp-part-bar", "aria-hidden": "true" });
el.style.setProperty("--v", Math.max(0.02, score / 100).toFixed(3));
return el;
};
const PART_NAMES = { reach: "Reach", engagement: "Engagement", depth: "Depth", consistency: "Consistency", growth: "Growth" };

function facts(f) {
const w = f.work;
const v = f.versus;
const m = f.metrics ?? {};
const out = [];
const add = (label, value, tone) => out.push([label, value, tone]);
add("Published", day(w.publishedAt));
add("Age", w.ageDays < 1 ? "Under a day" : `${w.ageDays} days`);
add("Weekday", new Date(w.publishedAt).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }));
if (TIMED_KINDS.includes(w.kind) && w.durationSec) add("Length", mins(w.durationSec));
add("Kind", KINDS[w.kind] ?? w.kind);
add("Channel", w.account.handle);
for (const k of Object.keys(m)) add(nameOf(k), n0(m[k]));
if (m.views > 0) {
if (typeof m.likes === "number") add("Likes per view", pct(m.likes / m.views, 2));
if (typeof m.comments === "number") add("Comments per 1,000 views", (m.comments / m.views * 1000).toFixed(1));
if (w.ageDays > 0) add("Views a day, on average", n0(m.views / Math.max(1, w.ageDays)));
}
add("Rating", w.rating ? signed(w.rating.rating) : "Not rated yet", w.rating ? (w.rating.rating > 0 ? "up" : "down") : null);
add("Against your typical", w.rating?.multiple ? `${w.rating.multiple.toFixed(2)}×` : "None yet");
add("Times rated", String(f.ratingHistory.length));
add("Rank on the channel", f.channel.rank ? `${f.channel.rank.position} of ${f.channel.rank.of}` : "None yet");
add("Size band", f.channel.sizeBand ?? "None yet");
add("Channel audience", n0(f.channel.audience));
add("Channel rating", f.channel.rating ? `${signed(f.channel.rating.rating)} (${f.channel.rating.band})` : "None yet");
add("Works on the channel", n0(f.channel.works));
for (const p of f.channel.rating?.parts ?? []) add(`Channel ${PART_NAMES[p.key]?.toLowerCase() ?? p.name.toLowerCase()}`, `${Math.round(p.score)} in 100`);
if (v) {
add("Place among creators your size", v.place === null ? "None yet" : `Better than ${v.place - 1} in 100`, v.place !== null && v.place >= 50 ? "up" : "down");
add("Against the middle", v.ofMedian === null ? "None yet" : `${v.ofMedian.toFixed(2)}×`);
add("Middle half at this age", `${short(v.atAge.p25)} to ${short(v.atAge.p75)}`);
add("Middle at this age", n0(v.atAge.median));
for (const s of v.milestones) add(`Usual at ${s.label}`, `${short(s.p25)} to ${short(s.p75)}`);
add("Format", v.format);
}

if (w.kind === "youtube" || f.fixes.length) {
add("Fixes tried", String(f.fixes.length));
add("Fixes kept", String(f.fixes.filter((x) => x.kept).length));
const lifts = f.fixes.map((x) => x.lift).filter((x) => typeof x === "number");
add("Best lift", lifts.length ? pct(Math.max(...lifts), 0) : "None yet");
}
add("Predictions sealed", String(f.predictions.length));
if (MEDIA_KINDS.includes(w.kind) || f.media.clips || f.media.words || f.media.sends) {
add("Clips made", String(f.media.clips));
add("Words written", String(f.media.words));
add("Sends", String(f.media.sends));
}
add("Sponsor reads found", String(f.reads.length));
if (can("read.money")) {
add("Deals on it", String(f.deals.length));
add("Delivery verified", String(f.deals.filter((d) => d.verified).length));
}
add("Notes versions", String(f.notes.versions));
add("Documents", String(f.documents.length));
if (f.shares !== null) add("Live share links", String(f.shares));
add("Events on record", String(f.timeline.length));
add("Sources read", String(f.readings.length));
add("Last read", f.readings[0] ? ago(f.readings[0].checkedAt) : "Never");
return out;
}

const SHOWN = 16;
function factsSection(all) {
const grid = h("dl", { class: "cn-wp-facts" }, all.map(([label, value, tone]) => h("div", { class: `cn-wp-fact${tone ? ` is-${tone}` : ""}` }, h("dt", null, label), h("dd", null, value))));
const more = all.length > SHOWN
? h("button", { class: "cn-btn cn-btn--xs", type: "button", "aria-expanded": "false", onclick: (e) => {
const open = grid.classList.toggle("is-all");
e.currentTarget.setAttribute("aria-expanded", String(open));
e.currentTarget.textContent = open ? "Show fewer" : `Show all ${all.length}`;
} }, `Show all ${all.length}`)
: null;
return section({ title: "Every figure", line: "What Orbe holds on this work and its channel.", actions: more }, grid);
}
function overviewTab(el, f) {
const parts = f.channel.rating?.parts ?? [];
const next = nextStep(f);

el.append(
next ? h("section", { class: "cn-wp-nextline", "aria-label": "Next step" }, h("p", null, h("b", null, "Next step. "), next[0]), next[1] ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: next[1] }, next[2] ?? "Open") : null) : null,
h("div", { class: "cn-wp-cols" },
section({ title: "The channel, part by part", line: "Each part against creators of the same kind and size, out of 100." },
parts.length
? h("ul", { class: "cn-wp-parts" }, parts.map((p) => h("li", null, h("span", { class: "cn-wp-part-n" }, p.name), barOf(p.score), h("b", null, Math.round(p.score)), h("span", { class: "cn-item-d" }, p.value))))
: emptyState("chart", "No channel rating yet.", [], "It appears after the first read of the channel."),
),
section({ title: "What happened to it", line: "Built from what Orbe holds, newest first, each with its source." }, timelineList(f.timeline.slice(0, 12), f.work.kind)),
),
);
}

function predictionsTab(el, f) {
el.append(
section({ title: "Predictions", line: "Sealed before release, checked openly after, including when they missed." },
f.predictions.length
? h("ul", { class: "cn-list" }, f.predictions.map((p) => h("li", { class: "cn-item" }, h("p", { class: "cn-item-t" }, p.range ? `${n0(p.range.p25)} to ${n0(p.range.p75)} ${nameOf(p.metric ?? "views").toLowerCase()} at ${p.horizonDays ?? 30} days` : "A sealed prediction"), h("p", { class: "cn-item-d" }, `Sealed ${day(p.madeAt)}. ${p.done ? "Checked." : "Waiting for its horizon."}`))))
: emptyState("clock", "No prediction was sealed for this work.", on("predictions_publishing") ? [["Seal one for your next work", "/orbe-site/demo/app/predictions"]] : []),
),
);
}
function nextStep(f) {
const v = f.versus;
if (f.work.kind === "youtube" && on("fix") && v?.place !== null && v?.place < 25 && f.work.ageDays <= 60) return ["It is behind creators your size. Fix can try a new title and keep it only if it lifts.", `/orbe-site/demo/app/works/${seg(f.work.id)}?tab=fix`, "Try a fix"];
if (on("media") && MEDIA_KINDS.includes(f.work.kind) && !f.media.items) return [f.work.kind === "podcast" ? "Filmed the episode? Turn its video into clips, an article or a newsletter issue." : "Turn it into clips, an article or a newsletter issue.", `/orbe-site/demo/app/media?work=${seg(f.work.id)}`, dropIn(f.work.kind)];
if (!f.notes.versions) return ["Keep the script and what to try next time with it.", `/orbe-site/demo/app/works/${seg(f.work.id)}?tab=notes`, "Add notes"];
return null;
}

const PUBLISHED_ICON = { substack: "mail", photography: "image" };
function timelineList(timeline, kind) {
return timeline.length
? h("ol", { class: "cn-tl" }, timeline.map((e) =>
h("li", { class: "cn-tl-item" },
h("span", { class: "cn-tl-ico", "aria-hidden": "true" }, icon((e.kind === "published" && PUBLISHED_ICON[kind]) || KIND_ICON[e.kind] || "dots")),
h("div", { class: "cn-tl-main" },
h("p", { class: "cn-tl-t" }, e.title, h("time", { datetime: e.at }, day(e.at))),
e.line ? h("p", { class: "cn-tl-d" }, e.line) : null,
e.source ? h("a", { class: "cn-tl-src", href: e.source.startsWith("/v1/") ? apiHref(e.source) : e.source, target: /^https?:/.test(e.source) || e.source.startsWith("/v1/") ? "_blank" : null, rel: "noopener" }, "Source", icon("arrowRight")) : null,
),
),
))
: emptyState("clock", "Nothing has happened to this work yet.");
}
function fixTab(el, f) {
const eligible = f.work.kind === "youtube";
el.append(
section({ title: "Fix on this work", line: eligible ? "New titles and thumbnails, kept only if they lift the work against its own sealed pace." : "Fix works on YouTube videos only: other platforms give no way to change a title or thumbnail." },
f.fixes.length
? h("ul", { class: "cn-list" }, f.fixes.map((x) => h("li", { class: "cn-item cn-wp-fix" },
h("p", { class: "cn-item-t" }, x.before && x.after ? [`"${x.before}"`, icon("arrowRight"), `"${x.after}"`] : `A ${x.target ?? "title"} fix`),
h("p", { class: "cn-item-d" }, [x.state === "kept" ? "Kept" : x.state === "reverted" ? "Put back" : x.state[0].toUpperCase() + x.state.slice(1), typeof x.lift === "number" ? `${Math.round(x.lift * 100)}% against its own pace` : null, `started ${day(x.createdAt)}`].filter(Boolean).join(", ")),
)))
: emptyState("sparkle", eligible ? "No fix has been tried on this work." : "Nothing to fix here."),
eligible && on("fix") && can("content") ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: `/orbe-site/demo/app/fix?work=${seg(f.work.id)}` }, icon("sparkle"), "Look for new options") : null,
),
);
}
function clipsTab(el, f) {
el.append(
section({ title: "Clips and words from this work", line: "Made in Drop in a video: every clip, article, issue and send stays linked here." },
f.media.list.length
? h("ul", { class: "cn-list" }, f.media.list.map((x) => h("li", { class: "cn-item" }, h("a", { class: "cn-item-t", href: `/orbe-site/demo/app/media/${seg(x.id)}` }, x.title), h("p", { class: "cn-item-d" }, `${plural(x.clips, "clip")}, ${plural(x.words, "draft")}, ${plural(x.sends, "send")}`))))
: emptyState("play", "Nothing made from this work yet.", on("media") && can("content") ? [[dropIn(f.work.kind), `/orbe-site/demo/app/media?work=${seg(f.work.id)}`, true]] : []),
),
);
}
function dealsTab(el, f) {
el.append(
section({ title: "Deals on this work", line: "Guaranteed reads delivered in it, measured at source." },
f.deals.length
? h("ul", { class: "cn-list" }, f.deals.map((d) => h("li", { class: "cn-item" },
h("p", { class: "cn-item-t" }, d.brandName ?? "A brand", h("span", { class: `cn-pill cn-pill--${d.verified ? "done" : "coming"}` }, h("span", { class: "cn-pill-dot" }), d.settled ? "Settled" : d.verified ? "Delivery verified" : "Waiting for delivery")),
h("p", { class: "cn-item-d" }, [d.format, d.guarantee?.units ? `guaranteed ${n0(d.guarantee.units)} ${d.guarantee.metric ?? "views"}` : null, ...d.measurements.map((m) => `day ${m.day}: ${n0(m.units)}`), d.price ? `${(d.price.amount / 100).toLocaleString("en-GB", { style: "currency", currency: d.price.currency })}` : null].filter(Boolean).join(", ")),
h("a", { class: "cn-btn cn-btn--xs", href: "/orbe-site/demo/app/deals?tab=bookings" }, "Open the booking"),
)))
: emptyState("megaphone", "No deal is linked to this work."),
),
section({ title: "Sponsor reads found in it", line: "From the work's own public text. Orbe found these; they are not deals booked through Orbe." },
f.reads.length
? h("ul", { class: "cn-list" }, f.reads.map((r) => h("li", { class: "cn-item" }, h("p", { class: "cn-item-t" }, r.brand), h("p", { class: "cn-item-d" }, [r.placement, `${Math.round(r.confidence * 100)}% confident`, plural(r.evidence, "piece of evidence", "pieces of evidence"), r.d30 !== null ? `${n0(r.d30)} at 30 days` : r.d7 !== null ? `${n0(r.d7)} at 7 days` : null].filter(Boolean).join(", ")))))
: emptyState("search", "No sponsor read found in this work."),
),
);
}
function rightsTab(el, f) {
const licences = f.documents.filter((d) => /licen|rights|contract|agreement|release/i.test(d.title));
el.append(
section({ title: "Rights and licences", line: "Who may use this work, and until when. Keep each licence or contract on the work so it travels with the record." },
licences.length
? h("ul", { class: "cn-docs" }, licences.map((d) => h("li", { class: "cn-doc" }, h("span", { class: "cn-doc-ico", "aria-hidden": "true" }, icon(d.kind === "link" ? "link" : "doc")), h("div", { class: "cn-doc-main" }, d.kind === "link" ? h("a", { href: d.url, target: "_blank", rel: "noopener" }, d.title) : h("a", { href: apiHref(`${W(f.work.id)}/documents/${seg(d.id)}/file`) }, d.title), h("p", { class: "cn-item-d" }, `Added ${day(d.createdAt)}`)))))
: emptyState("doc", "No licence or contract on this work yet.", can("content") ? [["Add one under Notes", `/orbe-site/demo/app/works/${seg(f.work.id)}?tab=notes`]] : [], "Granting rights from Orbe itself is coming; until then, keep the paperwork here."),
),
);
}
function recordTab(el, f) {
el.append(
h("div", { class: "cn-tp-actions" }, h("a", { class: "cn-btn cn-btn--s", href: apiHref(`${W(f.work.id)}/export`) }, icon("doc"), "Export everything")),
section({ title: "The record", line: "Everything that happened to this work, each with its source." }, timelineList(f.timeline, f.work.kind)),
);
if (can("consent")) {
const share = h("div");
shareTab(share, f.work.id);
el.append(share);
}
}
async function render(main, ctx) {
const id = ctx.params.id;
const body = toolShell(main, { title: "Work", back: ["Library", "/orbe-site/demo/app/library"] });

const load = () => api.get(`${W(id)}/full`).catch((e) => {
if (e.code === "work_not_found") return null;
throw e;
});
await block(body, load, (f) => {
if (!f) {
nameHere("Not found");
return notThere(main, "No work with that address", "It may have been taken off its channel, or the link is mistyped.", ["Back to the Library", "/orbe-site/demo/app/library"]);
}
const w = f.work;
main.querySelector(".ap-h1").textContent = w.title;
document.title = `${w.title}: Orbe`;
nameHere(w.title);
const head = main.querySelector(".cn-tp-head");
head.prepend(h("span", { class: "cn-work-thumb" }, w.kind === "youtube" && /^[\w-]{11}$/.test(w.sourceKey ?? "") ? h("img", { src: `https://i.ytimg.com/vi/${w.sourceKey}/mqdefault.jpg`, alt: "", width: 160, height: 90, decoding: "async", onerror: (e) => e.target.replaceWith(cover(w.id, w.kind, w.rating ? (w.rating.rating + 1.5) / 3 : 0.3)) }) : cover(w.id, w.kind, w.rating ? (w.rating.rating + 1.5) / 3 : 0.3)));
const v = f.versus;
const all = facts(f);
const legend = v ? h("p", { class: "cn-wp-legend" }, h("span", { class: "cn-wp-key is-band" }), "Middle half of creators your size", h("span", { class: "cn-wp-key is-mid" }), "Their middle", h("span", { class: "cn-wp-key is-dot" }), "This work") : null;

head.querySelector(".cn-tp-names").append(h("p", { class: "cn-tp-line" }, [w.account.handle, KINDS[w.kind] ?? w.kind, `published ${day(w.publishedAt)}`].join(", "), ".", w.url ? [" ", h("a", { href: w.url, target: "_blank", rel: "noopener" }, "Open the work")] : null));
return [
h("div", { class: "cn-wp-hero" },
h("section", { class: "cn-wp-score", "aria-label": "Rating" },
h("p", { class: "cn-stat-label" }, "Rated against creators the same size"),
w.rating ? rating(w.rating.rating, { size: "", tag: "p", cls: "cn-wp-big" }) : h("p", { class: "cn-wp-big" }, "Not rated yet"),
h("p", { class: "cn-stat-line" }, w.rating ? "Zero is typical for creators your size." : "A rating appears after its first read."),
v ? h("dl", { class: "cn-wp-miles" }, v.milestones.map((s) => h("div", null, h("dt", null, s.label), h("dd", null, `${short(s.p25)} to ${short(s.p75)}`)))) : null,
v && v.place !== null ? h("p", { class: "cn-wp-place" }, `Better than ${v.place - 1} in 100 creators your size at this age.`) : null,
),
h("section", { class: "cn-wp-plot", "aria-label": "Views against creators the same size" },
v ? [versusChart(v), legend] : emptyState("chart", "No comparison yet.", [], "It appears once Orbe knows the channel's audience."),
),
),
tabs("work", [
{ id: "overview", label: "Overview", render: (el) => (overviewTab(el, f), el.append(factsSection(all))) },

w.kind === "youtube" ? { id: "viewers", label: "Viewers", render: (el) => (on("retention") ? retentionTab(el, id) : el.append(emptyState("pulse", "Where viewers leave needs YouTube Analytics connected.", [["Connect YouTube", "/orbe-site/demo/app/settings/connections", true]]))) } : null,
w.kind === "youtube" ? { id: "fix", label: "Fix", render: (el) => fixTab(el, f) } : null,
MEDIA_KINDS.includes(w.kind) || f.media.list.length ? { id: "clips", label: "Clips and words", render: (el) => clipsTab(el, f) } : null,
{ id: "predictions", label: "Predictions", render: (el) => predictionsTab(el, f) },
can("read.money") ? { id: "deals", label: "Deals", render: (el) => dealsTab(el, f) } : null,
{ id: "rights", label: "Rights", render: (el) => rightsTab(el, f) },
{ id: "notes", label: "Notes", render: (el) => (notesTab(el, id), documentsTab(el, id)) },
{ id: "record", label: "Record", render: (el) => recordTab(el, f) },
].filter(Boolean), ctx.query.get("tab"), { address: true, alias: { documents: "notes", share: "record", timeline: "record" } }),
];
});
}
});
