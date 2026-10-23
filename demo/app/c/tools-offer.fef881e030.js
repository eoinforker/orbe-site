__o.d("js/tools/offer.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api } = __o.r("js/api.js");
const { TOOLS, tile } = __o.r("js/catalogue.js");
const { emptyState, historyList, serverRuns, toolPage } = __o.r("js/console-ui.js");
const { block, field, form, h, input, money, select } = __o.r("js/ui.js");

const TOOL = TOOLS.find((t) => t.id === "offer");
async function render(main) {
const body = h("div");
main.append(body);
await block(body, () => api.get("/v1/me/sponsorships/inventory"), ({ inventory }) => {
const items = inventory.items.filter((it) => it.suggestion?.status === "suggested");
const runs = serverRuns("offer");
const out = h("div", { class: "cn-result-body" });
const hist = h("div");
const asEntry = (r) => ({ id: r.id, label: r.outcome.ok && r.outcome.kind === "offer" ? `${money({ amount: r.outcome.data.pence, currency: r.outcome.data.currency })} for ${r.outcome.data.slot}` : r.job.text, summary: r.outcome.ok && r.outcome.kind === "offer" ? r.outcome.data.verdict.say : "Not judged", at: r.at });
const drawHistory = async () => hist.replaceChildren(historyList((await runs.list().catch(() => [])).map(asEntry), "Offers you check show here, on every device you use."));
drawHistory();
out.replaceChildren(
items.length
? emptyState("scales", "Choose the slot, type what the brand offered, and press Run.")
: emptyState("scales", "Orbe needs a priced slot with enough results to suggest a range.", [["Set your prices", "/orbe-site/demo/app/deals?tab=prices", true], ["Open Runs", "/orbe-site/demo/app/runs?tool=price"]], "Each slot says what it is waiting for in Studio's Price a slot."),
);
const page = toolPage({
tool: tile(TOOL.glyph, TOOL.k, h, "l"),
title: "Check an offer",
line: "Is this offer fair for your size? Checked against the range your own results support, never a guess.",
tags: [["Live", "sky"], ["Free"], ["Uses your verified results", "line"]],
api: TOOL.api,
inputs: items.length
? form([
field("Slot", select(items.map((it, i) => [String(i), `${it.name} on ${it.handle}`]), { name: "slot" })),
field("Offered, in pounds", input({ name: "amount", type: "number", min: "1", step: "1", required: true, inputmode: "decimal", placeholder: "450" }), "The fee for this one slot, before any agency cut."),
], "Run", async (d) => {
const it = items[Number(d.get("slot"))];
const pence = Math.round(Number(d.get("amount")) * 100);
const kept = await runs.run({ text: String(pence / 100), slot: `${it.accountId}:${it.format}`, account: it.accountId });
if (!kept.outcome.ok) throw kept.outcome.error;
if (kept.outcome.kind !== "offer") throw { message: "Orbe cannot judge this offer yet: the slot needs more verified results." };
const v = kept.outcome.data.verdict;
out.replaceChildren(
h("p", { class: "cn-run-who" }, `${money({ amount: pence, currency: it.suggestion.low.currency })} for ${it.name} on ${it.handle}`),
h("p", { class: `cn-verdict cn-tone--${v.tone}` }, v.say),
h("p", null, v.why),
it.listPrice ? h("p", { class: "cn-label" }, `Your own price for this slot is ${money(it.listPrice)}.`) : null,
h("ul", { class: "cn-run-list" }, it.suggestion.reasons.map((r) => h("li", null, r))),
);
page.status("done", "Done", { slot: it.name, handle: it.handle, offered: pence, suggestion: it.suggestion, verdict: v });
await drawHistory();
})
: h("p", { class: "cn-hist-empty" }, "Nothing to check against yet."),
results: out,
history: hist,
historyNote: "Your team, every device",
});
return page.node;
});
}
});
