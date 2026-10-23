__o.d("js/tools/rate.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, seg } = __o.r("js/api.js");
const { TOOLS, tile } = __o.r("js/catalogue.js");
const { emptyState, historyList, rating, serverRuns, skeleton, toolPage } = __o.r("js/console-ui.js");
const { failure, field, form, h, input, plural, signed } = __o.r("js/ui.js");

const TOOL = TOOLS.find((t) => t.id === "rate");
function resultView(r) {
const res = r.result;
const name = r.account?.title ?? r.account?.handle ?? "This channel";
if (!res || res.status !== "rated") return [h("p", { class: "cn-run-say" }, `${name} is not rated yet.`), h("p", null, res?.message ?? "Not enough public works to compare yet.")];
return [
h("p", { class: "cn-run-who" }, `${name}${r.account?.handle ? `, ${r.account.handle}` : ""}`),
h("div", { class: "cn-figure" }, rating(res.rating, { size: "", tag: "p", cls: "cn-figure-n" }), h("div", { class: "cn-figure-k" }, h("b", null, res.band), h("span", null, `Against YouTube channels with ${res.sizeBand} subscribers, from ${plural(res.detail?.works ?? 0, "work")}. Zero is typical.`))),
h("ul", { class: "cn-parts" }, res.parts.map((p) => {
const bar = h("span", { class: "cn-part-bar" }, h("span"));
bar.firstChild.style.setProperty("--p", String(p.score));
return h("li", { class: "cn-part", title: p.what }, h("span", { class: "cn-part-n" }, p.name), bar, h("span", { class: "cn-part-v" }, `${p.score}/100`));
})),
h("p", { class: "cn-label" }, res.attribution?.notice ?? ""),
];
}
async function render(main, ctx) {
const runs = serverRuns("rate-channel");
const out = h("div", { class: "cn-result-body" });
const hist = h("div");
const asEntry = (r) => ({ id: r.id, label: r.job.text, summary: r.outcome.ok ? (r.outcome.data.result?.status === "rated" ? `${signed(r.outcome.data.result.rating)}, ${r.outcome.data.result.band}` : "Not rated yet") : "Did not run", at: r.at });
const drawHistory = async () => hist.replaceChildren(historyList((await runs.list().catch(() => [])).map(asEntry), "Channels you rate show here, on every device you use.", (e) => `/orbe-site/demo/app/rate?handle=${encodeURIComponent(e.label)}`));
let page = null;
const run = async (handle) => {
page.status("running", "Running");
out.replaceChildren(skeleton(5));
try {

const kept = await runs.run({ text: handle });
if (!kept.outcome.ok) throw kept.outcome.error;
const r = kept.outcome.data;
out.replaceChildren(...resultView(r));
page.status("done", "Done", r);
await drawHistory();
} catch (e) {
out.replaceChildren(failure(e, () => run(handle)));
page.status("failed", "Failed", { error: { code: e.code, message: e.message } });
}
};
const handleInput = input({ name: "handle", required: true, maxlength: 200, placeholder: "@handle, channel id or link", autocomplete: "off", value: ctx.query.get("handle") ?? "" });
page = toolPage({
tool: tile(TOOL.glyph, TOOL.k, h, "l"),
title: "Rate a channel",
line: "Any YouTube channel, against creators the same size. Zero is typical; the maths is published.",
tags: [["Live", "sky"], ["Free"], ["Public works only", "line"]],
api: TOOL.api,
inputs: form([field("Channel", handleInput, "Public works only; nothing is stored about the channel.")], "Run", async (d) => {
const handle = String(d.get("handle")).trim();
history.replaceState(null, "", `/orbe-site/demo/app/rate?handle=${encodeURIComponent(handle)}`);
await run(handle);
}),
results: out,
history: hist,
historyNote: "Your team, every device",
});
main.append(page.node);
await drawHistory();
const q = ctx.query.get("handle");
if (q) await run(q);
else out.replaceChildren(emptyState("chart", "Type a channel's handle and press Run.", ctx.user.type === "creator" ? [["Rate your own works", "/orbe-site/demo/app/library"]] : [], "The result is the same rating agents get from orbe_rate."));
}
});
