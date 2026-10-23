__o.d("js/composer.js", function (__x) {
"use strict";
__o.e(__x, { STUDIO_TOOLS: () => STUDIO_TOOLS, WINDOWS: () => WINDOWS, toolsOn: () => toolsOn, composer: () => composer });
const { can, canRateChannels, on } = __o.r("js/api.js");
const { tile } = __o.r("js/catalogue.js");
const { icon } = __o.r("js/icons.js");
const { h } = __o.r("js/ui.js");


const STUDIO_TOOLS = [
{ id: "auto", name: "Ask Orbe", line: "Orbe picks the tool from your words", glyph: "products/you/", k: "rec" },
{ id: "rate-work", name: "Rate a work", line: "A work of yours, against creators the same size", glyph: "products/rate/", k: "also", feature: "rating", hint: "A title, or leave empty for your best in the window" },
{ id: "rate-channel", name: "Rate a channel", line: "Any YouTube channel, by @handle", glyph: "products/rate/", k: "also", feature: "rating", hint: "@handle, channel id or link" },
{ id: "offer", name: "Check an offer", line: "Is this offer fair for your size?", glyph: "products/offer/", k: "spon", feature: "sponsorships", needs: "read.money", hint: "The amount offered, like 450" },
{ id: "price", name: "Price a slot", line: "What your results support, per format", glyph: "products/sponsorships/", k: "spon", feature: "sponsorships", needs: "read.money", hint: "Leave empty, or name a format" },
{ id: "sponsor", name: "Sponsors like you", line: "Brands that sponsor creators like you", glyph: "products/selling/", k: "sell", hint: "Leave empty, or a word to filter by" },
{ id: "explain", name: "Explain my rating", line: "Your rating, in plain English", glyph: "products/diligence/", k: "rec", feature: "rating", hint: "Leave empty" },
];
const WINDOWS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]];

const toolsOn = () => STUDIO_TOOLS.filter((t) => (!t.feature || on(t.feature)) && can(t.needs) && (t.id !== "rate-channel" || canRateChannels()));

function chip(label, options, value, render, onChange) {
const sel = h("select", { "aria-label": label }, options.map(([v, text]) => h("option", { value: v, selected: v === value }, text)));
const face = h("span", { class: "cn-cchip-face" });
const draw = () => face.replaceChildren(...[render(sel.value)].flat().filter(Boolean));
sel.addEventListener("change", () => {
draw();
onChange(sel.value);
});
draw();
return { node: h("label", { class: "cn-cchip" }, face, icon("chevron", { cls: "cn-i--chev" }), sel), set: (v) => ((sel.value = v), draw()) };
}

function composer({ accounts = [], onRun, initial = {}, placeholder }) {
const tools = toolsOn();
const job = { tool: tools.some((t) => t.id === initial.tool) ? initial.tool : "auto", account: initial.account ?? "all", window: initial.window ?? "30" };
const text = h("textarea", { class: "cn-composer-text", rows: 1, placeholder: placeholder ?? "Rate a work, check an offer, find a sponsor...", "aria-label": "What should Orbe run?", maxlength: 300 });
text.value = initial.text ?? "";
const grow = () => {
text.style.height = "auto";
text.style.height = `${Math.min(180, text.scrollHeight)}px`;
};
text.addEventListener("input", grow);
const toolChip = chip("Tool", tools.map((t) => [t.id, t.name]), job.tool, (v) => {
const t = tools.find((x) => x.id === v);
return [tile(t.glyph, t.k, h), h("span", null, t.name)];
}, (v) => {
job.tool = v;
const t = tools.find((x) => x.id === v);
text.placeholder = t.hint ?? placeholder ?? "Rate a work, check an offer, find a sponsor...";
});
const accountChip = chip("Account", [["all", "All accounts"], ...accounts.map((a) => [a.id, a.handle])], job.account, (v) => [icon("user"), h("span", null, v === "all" ? "All accounts" : accounts.find((a) => a.id === v)?.handle ?? "Account")], (v) => (job.account = v));
const windowChip = chip("Window", WINDOWS, job.window, (v) => [icon("clock"), h("span", { class: "cn-cchip-k" }, "Last"), h("span", null, WINDOWS.find(([k]) => k === v)?.[1] ?? v)], (v) => (job.window = v));
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const run = h("button", { class: "cn-run", type: "submit" }, "Run", h("kbd", { class: "cn-kbd" }, mac ? "⌘ ↵" : "Ctrl ↵"));
const submit = (e) => {
e?.preventDefault();
const words = text.value.trim();
if (job.tool === "auto" && !words) {
text.focus();
return;
}
onRun({ tool: job.tool, text: words, account: job.account, window: job.window });
};
text.addEventListener("keydown", (e) => {
if (e.key === "Enter" && !e.shiftKey && !e.isComposing) submit(e);
});
const node = h("form", { class: "cn-composer", onsubmit: submit, role: "search" },
text,
h("div", { class: "cn-composer-bar" },
h("div", { class: "cn-composer-chips" }, toolChip.node, accounts.length > 1 ? accountChip.node : null, windowChip.node),
h("span", { class: "cn-composer-hint" }, "Shift ↵ for a new line"),
run,
),
);

if (text.value) requestAnimationFrame(grow);
return {
node,
focus: () => text.focus(),
setText: (v) => ((text.value = v), grow()),
setTool: (v) => {
job.tool = v;
toolChip.set(v);
},
busy: (on2) => (run.disabled = on2),
};
}
});
__o.d("js/creator/studio.js", function (__x) {
"use strict";
__o.e(__x, { runJob: () => runJob, render: () => render });
const { api } = __o.r("js/api.js");
const { ago, cover, pill, rating, serverRuns } = __o.r("js/console-ui.js");
const { composer, STUDIO_TOOLS, toolsOn, WINDOWS } = __o.r("js/composer.js");
const { TOOLS, tile } = __o.r("js/catalogue.js");
const { icon } = __o.r("js/icons.js");
const { KINDS } = __o.r("js/terms.js");
const { count, h, money, signed } = __o.r("js/ui.js");

const toolOf = (id) => STUDIO_TOOLS.find((t) => t.id === id) ?? STUDIO_TOOLS[0];
const META_KEY = "studio-meta";

const metaOn = () => {
try {
return localStorage.getItem(`orbe.tab.${META_KEY}`) === "on";
} catch {
return false;
}
};


async function runJob(job) {
const run = await serverRuns(null).run(job);
return { id: run.id, at: run.at, job: run.job, out: run.outcome, ms: run.ms };
}

function workAnswer({ top, others, note }) {
const r = top.rating;
return [
note ? h("p", null, note) : null,
h("a", { class: "cn-run-work", href: `/orbe-site/demo/app/works/${encodeURIComponent(top.id)}` },
h("span", { class: "cn-work-art" }, cover(top.id, top.kind, r ? (r.rating + 1.5) / 3 : 0.3)),
h("span", { class: "cn-run-work-main" },
h("span", { class: "cn-run-work-t" }, top.title),
h("span", { class: "cn-run-work-d" }, `${top.account.handle} · ${ago(top.publishedAt)}${top.reach ? ` · ${count(top.reach.value)} ${top.reach.label}` : ""}`),
r
? h("span", { class: "cn-figure" }, rating(r.rating, { size: "", cls: "cn-figure-n" }), h("span", { class: "cn-figure-k" }, h("b", null, `${r.multiple.toFixed(2)} times your typical`), h("span", null, "Against creators the same size; zero is typical")))
: h("span", { class: "cn-run-work-d" }, "Not rated yet: too new to compare."),
),
),
others.length ? h("ul", { class: "cn-run-list" }, others.map((w) => h("li", null, h("a", { href: `/orbe-site/demo/app/works/${encodeURIComponent(w.id)}` }, w.title), w.rating ? rating(w.rating.rating) : h("span", { class: "cn-muted" }, "New")))) : null,
r ? h("p", { class: "cn-label" }, r.notice) : null,
];
}
function channelAnswer({ account, result: res }) {
const name = account?.title ?? account?.handle ?? "This channel";
if (!res || res.status !== "rated") return [h("p", { class: "cn-run-say" }, `${name} is not rated yet.`), h("p", null, res?.message ?? "Not enough public works to compare yet.")];
return [
h("p", { class: "cn-run-who" }, name),
h("div", { class: "cn-figure" }, rating(res.rating, { size: "", tag: "p", cls: "cn-figure-n" }), h("div", { class: "cn-figure-k" }, h("b", null, res.band), h("span", null, `Against YouTube channels with ${res.sizeBand} subscribers`))),
h("ul", { class: "cn-parts" }, res.parts.map((p) => {
const bar = h("span", { class: "cn-part-bar" }, h("span"));
bar.firstChild.style.setProperty("--p", String(p.score));
return h("li", { class: "cn-part" }, h("span", { class: "cn-part-n" }, p.name), bar, h("span", { class: "cn-part-v" }, `${p.score}/100`));
})),
h("p", { class: "cn-label" }, res.attribution?.notice ?? "Independently calculated by Orbe"),
];
}
function answer(out) {
if (!out.ok) return [h("p", { class: "cn-run-say cn-tone--bad" }, out.error?.message ?? "That did not run."), out.error?.requestId ? h("p", { class: "cn-label" }, `Reference ${out.error.requestId}`) : null];
const d = out.data;
switch (out.kind) {
case "none":
return [h("p", { class: "cn-run-say" }, d.text), h("p", null, "Try another title, a longer window, or all accounts.")];
case "work":
return workAnswer(d);
case "channel":
return channelAnswer(d);
case "offer":
return [
h("p", { class: "cn-run-who" }, `${money({ amount: d.pence, currency: d.currency })} for ${d.slot}`),
h("p", { class: `cn-verdict cn-tone--${d.verdict.tone}` }, d.verdict.say),
h("p", null, d.verdict.why),
];
case "unpriced":
return [
h("p", { class: "cn-run-say" }, "Orbe cannot judge this offer yet."),
h("p", null, "A slot needs enough verified results for Orbe to suggest a range. Here is what each slot is waiting for:"),
h("ul", { class: "cn-run-list" }, d.items.map((it) => h("li", null, h("span", null, `${it.name}, ${it.handle}`), h("span", { class: "cn-hist-d" }, it.suggestion?.reason ?? "No suggestion yet")))),
];
case "price":
return d.items.length
? [h("ul", { class: "cn-run-list cn-run-list--wide" }, d.items.map((it) => h("li", null, h("span", null, h("b", null, it.name), ` on ${it.handle}`), h("span", { class: "cn-hist-d" }, it.suggestion?.status === "suggested" ? `${money(it.suggestion.low)} to ${money(it.suggestion.high)}` : it.suggestion?.reason ?? "No suggestion yet"))))]
: [h("p", { class: "cn-run-say" }, "No slot matches.")];
case "sponsor": {

const brands = d.brands ?? [...new Map((d.rows ?? []).flatMap((r) => r.brands).filter((b) => b.brandName).map((b) => [b.brandName, { name: b.brandName, line: "" }])).values()];
const yours = (d.yours ?? []).map((y) => (y.size ? `${y.handle} (${y.size})` : y.handle));
return [
brands.length
? h("ul", { class: "cn-run-list" }, brands.slice(0, 8).map((b) => h("li", null, h("span", null, b.name), h("span", { class: "cn-hist-d" }, b.line))))
: h("p", { class: "cn-run-say" }, "No brand has sponsored enough creators your size to show yet."),
yours.length ? h("p", null, `Compared with: ${yours.join(", ")}.`) : null,
d.basis ? h("p", null, d.basis) : null,
d.notice ?? d.rows?.[0]?.notice ? h("p", { class: "cn-label" }, d.notice ?? d.rows[0].notice) : null,
];
}
case "explain":
return d.rows.length
? d.rows.map((r) => h("div", { class: "cn-run-explain" }, h("p", { class: "cn-run-who" }, `${r.handle} on ${KINDS[r.kind] ?? r.kind}${r.rating === null ? "" : `: ${signed(r.rating)}, ${r.band}`}`), h("p", null, r.explanation), r.explanation.includes(r.notice ?? "\u0000") ? null : h("p", { class: "cn-label" }, r.notice)))
: [h("p", { class: "cn-run-say" }, "Nothing to explain yet: no account of yours is rated.")];
default:
return [];
}
}
function runCard(entry) {
const t = toolOf(entry.job.tool);
const out = entry.out;
const state = !out ? "running" : out.ok ? "done" : "failed";
return h("article", { class: "cn-runcard", tabindex: "-1", "aria-label": entry.job.asked || entry.job.text || t.name, "data-tool": t.id, "data-q": `${entry.job.asked ?? ""} ${entry.job.text} ${t.name}`.toLowerCase() },
h("header", { class: "cn-runcard-head" },
tile(t.glyph, t.k, h),
h("div", { class: "cn-runcard-main" }, h("p", { class: "cn-runcard-q" }, entry.job.asked || entry.job.text || t.name), h("p", { class: "cn-runcard-tool" }, entry.job.asked || entry.job.text ? t.name : t.line)),
pill(state, state === "running" ? "Running" : state === "done" ? "Done" : "Failed"),
),
h("div", { class: "cn-runcard-body" }, out ? answer(out) : h("span", { class: "cn-skel" }, h("span", { class: "cn-skel-line" }), h("span", { class: "cn-skel-line" }), h("span", { class: "cn-skel-line" }))),
h("footer", { class: "cn-runcard-meta" },
h("span", null, `tool ${t.id}`),
h("span", null, `account ${entry.job.account === "all" ? "all" : entry.accountName ?? entry.job.account}`),
h("span", null, `window ${WINDOWS.find(([k]) => k === entry.job.window)?.[1].toLowerCase() ?? entry.job.window}`),
entry.ms !== undefined ? h("span", null, `${entry.ms} ms`) : null,
h("time", { datetime: entry.at }, new Date(entry.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })),
),
);
}

const NEEDS_WORKS = new Set(["rate-work", "sponsor", "explain"]);
const CONNECT = TOOLS.find((t) => t.id === "connect") ?? { glyph: "products/you/", k: "rec" };

async function render(main, ctx) {
const me = await api.get("/v1/me");
const accounts = me.accounts.map((a) => ({ id: a.id, handle: a.handle || a.title, kind: a.kind, platformId: a.platformId }));
const store = serverRuns(null, 30);
const named = (e) => ({ ...e, accountName: accounts.find((a) => a.id === e.job.account)?.handle });
let entries = (await store.list().catch(() => [])).map((r) => named({ id: r.id, at: r.at, job: r.job, out: r.outcome, ms: r.ms }));
const feed = h("div", { class: "cn-runs", "data-meta": metaOn() ? "on" : "off", "aria-live": "polite" });
const filterInput = h("input", { class: "cn-field-input", type: "search", placeholder: "Search runs", "aria-label": "Search runs" });
const toolSel = h("select", { "aria-label": "Filter by tool" }, h("option", { value: "" }, "All tools"), toolsOn().filter((t) => t.id !== "auto").map((t) => h("option", { value: t.id }, t.name)));
const toolFace = h("span", null, "All tools");
const meta = h("button", { class: "cn-toggle", type: "button", role: "switch", "aria-checked": String(metaOn()) }, h("span", null, "Show metadata"), h("span", { class: "cn-toggle-sw", "aria-hidden": "true" }));
meta.addEventListener("click", () => {
const next = meta.getAttribute("aria-checked") !== "true";
meta.setAttribute("aria-checked", String(next));
feed.dataset.meta = next ? "on" : "off";
try {
localStorage.setItem(`orbe.tab.${META_KEY}`, next ? "on" : "off");
} catch {

}
});
const heading = h("h1", { class: "cn-studio-title", tabindex: "-1", "data-title": "" }, "Runs");
const clear = h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", "aria-label": "Clear runs", onclick: async () => { await store.clear().catch(() => null); entries = []; draw(); heading.focus({ preventScroll: true }); } }, icon("trash"), h("span", null, "Clear"));
const applyFilter = () => {
const words = filterInput.value.trim().toLowerCase();
for (const card of feed.querySelectorAll(".cn-runcard")) card.hidden = Boolean((toolSel.value && card.dataset.tool !== toolSel.value) || (words && !card.dataset.q.includes(words)));
};
filterInput.addEventListener("input", applyFilter);
toolSel.addEventListener("change", () => {
toolFace.textContent = toolSel.selectedOptions[0].textContent;
applyFilter();
});
const box = composer({
accounts,
initial: { tool: ctx.query.get("tool") ?? undefined },
onRun: (job) => go(job),
});
function suggestions() {

const s = [
["rate-work", "Rate my best work this month"],
["offer", "Check a £450 offer"],
["sponsor", "Sponsors like you"],
["explain", "Explain my rating"],
].filter(([id]) => toolsOn().some((t) => t.id === id) && (accounts.length || !NEEDS_WORKS.has(id)));

const connect = accounts.length ? null : h("a", { href: "/orbe-site/demo/app/connections" }, tile(CONNECT.glyph, CONNECT.k, h), "Connect an account");
return h("div", { class: "cn-suggest" }, connect, s.map(([id, label]) => {
const t = toolOf(id);
return h("button", { type: "button", onclick: () => go({ tool: "auto", text: label, account: "all", window: "30" }) }, tile(t.glyph, t.k, h), label);
}));
}

const tools = [h("label", { class: "cn-field" }, icon("search"), filterInput), h("label", { class: "cn-select" }, icon("filter"), toolFace, icon("chevron"), toolSel), h("span", { class: "cn-grow" }), meta, clear];
function draw() {
for (const el of tools) el.hidden = !entries.length;
feed.replaceChildren(
...(entries.length
? [...entries].reverse().map(runCard)
: [h("div", { class: "cn-studio-empty" },
h("span", { class: "cn-empty-ico" }, icon("studio")),
h("h2", { class: "cn-studio-q" }, "What should Orbe run?"),
h("p", null, "Rate a work, check an offer, price a slot or see sponsors like you. Every answer comes from your own results, against creators the same size."),
suggestions(),
)]),
);
applyFilter();
}
async function go(job) {

const pending = named({ id: `pending-${Date.now()}`, at: new Date().toISOString(), job });
const had = entries.length;
entries = [pending, ...entries].slice(0, 30);

if (had) {
if (had >= 30) feed.firstElementChild?.remove();
feed.append(runCard(pending));
applyFilter();
} else draw();
box.busy(true);
try {
const kept = named(await runJob(job));
entries = [kept, ...entries.filter((e) => e !== pending)].slice(0, 30);
} catch (e) {
pending.out = { ok: false, error: { message: e.message, requestId: e.requestId } };
}
box.busy(false);
box.setText("");

const typing = box.node.contains(document.activeElement);
draw();
const newest = feed.lastElementChild;
if (!typing && newest?.matches(".cn-runcard")) {

newest.dataset.focusFirst = "";
newest.focus({ preventScroll: true });
}
window.scrollTo({ top: document.body.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
main.append(
h("div", { class: "cn-studio" },
h("div", { class: "cn-studio-bar" }, heading, ...tools),
feed,
h("div", { class: "cn-dock" }, box.node),
),
);
draw();
if (ctx.query.get("run") === "1") {
const job = { tool: ctx.query.get("tool") ?? "auto", text: ctx.query.get("q") ?? "", account: ctx.query.get("account") ?? "all", window: ctx.query.get("window") ?? "30" };

history.replaceState(null, "", "/orbe-site/demo/app/runs");
box.setTool("auto");

go(job);
} else box.focus();
}
});
