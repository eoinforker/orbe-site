__o.d("js/brand/campaign.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, apiHref, seg } = __o.r("js/api.js");
const { guaranteeLine, OFFER_STATES, priceLines, TONE, windowLine, withFee } = __o.r("js/deal.js");
const { formatName, SHORTFALL, TAKE_RATE, unitOf } = __o.r("js/terms.js");
const { actions, block, bps, count, day, field, form, h, input, money, tabs, textarea, words } = __o.r("js/ui.js");
const { drawer, emptyState, screenHead, section } = __o.r("js/console-ui.js");
const { button, kv, narrow, status, table, twoLine } = __o.r("js/cards.js");
const { campaignState } = __o.r("js/brand/campaigns.js");

const FIT_TONE = { strong: "good", partial: undefined, miss: "warn", unknown: "off" };

async function suggestedGuarantee(m) {
const r = await api.get(`/v1/brand/creators/${seg(m.creatorId)}`);
const item = r.inventory.items.find((i) => i.accountId === m.accountId && i.format === m.format);
const windows = [...(item?.stats.windows ?? [])].sort((a, b) => a.day - b.day);
const last = windows.at(-1);
return { day: last?.day ?? null, units: last?.p25 ? Math.floor(last.p25) : null, n: last?.n ?? 0, note: last?.note ?? null, unit: item?.stats.unit ?? unitOf(m.format, m.kind) };
}
function quoteBox(m, campaign, onSent) {
const box = h("div", { class: "ap-stack" });
block(box, () => suggestedGuarantee(m), (g) => {
const total = withFee(m.price, TAKE_RATE.networkBps);
return [
kv([
["Creator's price", money(m.price)],
[`Orbe's fee (${bps(TAKE_RATE.networkBps)})`, money({ amount: total.amount - m.price.amount, currency: total.currency })],
["You pay", money(total)],
m.expectedUnits ? ["Expected", `${count(m.expectedUnits)} ${g.unit}${m.expectedCpm ? `, ${money(m.expectedCpm)} per 1,000` : ""}`] : null,
]),
g.units
? h("p", { class: "cn-banner" }, `Guaranteed floor: ${count(g.units)} ${g.unit} at ${g.day} days, what this creator's verified history reaches three times in four. Short by more than ${bps(SHORTFALL.toleranceBps)} means a make-good within ${SHORTFALL.makeGoodDays} days or a refund in proportion; the creator is never paid under ${bps(SHORTFALL.floorBps)} of the price for a disclosed read that stays up.`)
: h("p", { class: "cn-label" }, `No guarantee to suggest yet: ${g.note ?? "not enough verified readings"}. You can still offer one; the creator decides.`),
narrow(form(
[
field("Price for the creator (£)", input({ name: "price", type: "number", min: "0.01", step: "0.01", value: String(m.price.amount / 100), required: true, inputmode: "decimal" }), "Their list price. Orbe's fee is added on top."),
field(`Guarantee: ${g.unit} at ${g.day ?? 30} days (optional)`, input({ name: "units", type: "number", min: "1", step: "1", value: g.units ? String(g.units) : "" }), "Leave empty for no guarantee."),
field("A note to the creator (optional)", textarea({ name: "message", maxlength: 2000 })),
],
"Send the offer",
async (d) => {
const price = Number(d.get("price"));
const units = String(d.get("units") ?? "").trim();
const message = String(d.get("message") ?? "").trim();
await api.post(`/v1/brand/campaigns/${seg(campaign.id)}/offers`, {
creatorId: m.creatorId,
accountId: m.accountId,
format: m.format,
...(Math.round(price * 100) !== m.price.amount ? { price } : {}),
...(units ? { guarantee: { day: g.day ?? 30, units: Number(units) } } : {}),
...(message ? { message } : {}),
});
onSent();
return "Offer sent. The creator has seven days to answer.";
},
)),
];
});
return box;
}
const FIT_WORDS = { strong: "strong", partial: "partial", miss: "a miss", unknown: "unknown" };

const reasonsList = (m) => h("ul", { class: "cn-reasons" }, m.reasons.map((r) => h("li", null, status(words(r.fit), FIT_TONE[r.fit]), h("span", null, r.sentence))));
function openQuote(m, campaign, onSent) {
drawer(`Quote and offer: ${m.displayName || "A creator"}`, (close) => [
h("p", { class: "cn-label" }, `${formatName(m.format, m.kind)}${m.handle ? `, ${m.handle}` : ""}. Fit ${m.score} in 100.`),
reasonsList(m),
campaign.state === "open" && !m.excluded && m.price && m.accountId ? quoteBox(m, campaign, () => (close(), onSent())) : null,
], { wide: true });
}
function matchRow(m, campaign, onSent) {
const tally = Object.entries(m.reasons.reduce((t, r) => ((t[r.fit] = (t[r.fit] ?? 0) + 1), t), {})).map(([fit, n]) => `${n} ${FIT_WORDS[fit] ?? fit}`).join(", ");
return [
twoLine(m.displayName || "A creator", m.handle),
m.format ? twoLine(formatName(m.format, m.kind), m.price ? `${money(m.price)} before Orbe's fee` : null) : h("span", { class: "dl-quiet" }, "No format fits"),
twoLine(`${m.score} in 100`, tally),
actions(button(!m.excluded && m.price && m.accountId && campaign.state === "open" ? "Quote and offer" : "Why", async () => void openQuote(m, campaign, onSent), { quiet: true })),
];
}
function matchesTab(el, campaign) {
block(el, () => api.get(`/v1/brand/campaigns/${seg(campaign.id)}/matches`), ({ matches, shortlist }) => {
const fit = matches.filter((m) => !m.excluded);
const out = matches.filter((m) => m.excluded);
const again = () => {
el.replaceChildren();
matchesTab(el, campaign);
};
const heads = [["Creator"], ["Format"], ["Fit"], [""]];
return section(
{ title: "Matches", line: shortlist?.picks?.length ? `Orbe's shortlist: ${shortlist.picks.length} for ${money(shortlist.spend)}, leaving ${money(shortlist.left)} of the budget.` : "Creators who opted in, ranked by how well they fit the brief." },
campaign.state !== "open" ? h("p", { class: "cn-label" }, "Offers can be sent only while the campaign is open.") : null,
fit.length ? table(heads, fit.map((m) => matchRow(m, campaign, again)), { caption: "Matches" }) : emptyState("people", "No creator in the network fits this brief yet.", [], "Only creators who opted in are ever shown."),
out.length ? h("details", { class: "ap-more" }, h("summary", null, `Not a fit (${out.length})`), table(heads, out.map((m) => matchRow(m, campaign, again)), { caption: "Not a fit" })) : null,
);
});
}
function offersTab(el, campaign) {
const reload = () =>
block(el, () => api.get(`/v1/brand/campaigns/${seg(campaign.id)}/offers`), ({ offers }) =>
section(
{ title: "Offers", line: "Each offer sent for this campaign and where it stands." },
offers.length
? h("div", { class: "cn-blocks" }, offers.map((o) =>
h("div", { class: "cn-block" },
h("div", { class: "cn-block-head" }, twoLine(formatName(o.format, o.kind), `Sent ${day(o.sentAt)}`), status(OFFER_STATES[o.state] ?? o.state, TONE[o.state])),
kv([...priceLines(o), ["Publish between", windowLine(o.publishWindow)]]),
h("p", { class: "cn-label" }, guaranteeLine(o)),
o.counters?.length ? h("p", null, `The creator countered at ${money(o.counters.at(-1).price)}${o.counters.at(-1).note ? `: "${o.counters.at(-1).note}"` : "."}`) : null,
["sent", "countered"].includes(o.state)
? actions(
o.state === "countered"
? button(`Accept ${money(withFee(o.counters.at(-1).price, o.fee.bps))} with the fee`, async () => {
await api.post(`/v1/brand/offers/${seg(o.id)}/accept-counter`, {});
reload();
return "Accepted. Fund it under Bookings.";
}, { primary: true })
: null,
button("Withdraw", async () => {
await api.post(`/v1/brand/offers/${seg(o.id)}/withdraw`, {});
reload();
return "Withdrawn.";
}, { quiet: true, danger: true, confirm: "Withdraw this offer?" }),
)
: null,
),
))
: emptyState("mail", "No offers yet.", [], "Send one from Matches."),
),
);
reload();
}
const figureText = (f) => (f.kind === "money" ? money({ amount: f.value, currency: f.currency ?? "GBP" }) : count(f.value));
function reportTab(el, campaign) {
const href = (fmt) => apiHref(`/v1/brand/campaigns/${seg(campaign.id)}/report?format=${fmt}`);
block(el, () => api.get(`/v1/brand/campaigns/${seg(campaign.id)}/report`), ({ report: r }) => [
r.lines.length
? r.lines.map((l) =>
section(
{ title: `${l.creatorName}${l.handle ? ` (${l.handle})` : ""}`, line: l.formatName, actions: status(words(l.state), TONE[l.state]) },
l.works.length ? table([["Work"], ["Published"]], l.works.map((w) => [w.url ? h("a", { href: w.url, target: "_blank", rel: "noopener" }, w.title) : w.title, `${day(w.publishedAt)}${w.removedAt ? `, taken down ${day(w.removedAt)}` : ""}`]), { caption: "Works" }) : null,
kv([...l.delivery, ...l.money].map((f) => [f.label, figureText(f)])),
l.guarantee ? h("p", { class: "cn-label" }, `Guaranteed ${count(l.guarantee.units)} ${l.guarantee.unit} at ${l.guarantee.day} days.`) : null,
l.outcome ? h("p", null, `${l.outcome.reason} The creator receives ${bps(l.outcome.creatorShareBps)} of the price.`) : null,
),
)
: section({ title: "Delivery" }, emptyState("chart", "Nothing delivered yet.", [], "Each read appears here, with the source it was read from, once it is live.")),
r.totals.length ? section({ title: "Totals" }, kv(r.totals.map((f) => [f.label, figureText(f)]))) : null,
r.effective.length ? section({ title: "What it cost" }, kv(r.effective.map((e) => [`Verified ${e.unit}`, `${count(e.units)}${e.cpm ? `, ${money(e.cpm)} per 1,000` : ""}`]))) : null,
r.kpis.length ? section({ title: "Against your goals" }, table([["Goal"], ["Status"]], r.kpis.map((k) => [k.detail, status(words(k.status), k.status === "met" ? "good" : k.status === "missed" ? "warn" : "off")]), { caption: "Against your goals" })) : null,
r.withheld.length ? h("p", { class: "cn-label" }, `${r.withheld.length} private readings are withheld because the creator is not sharing them with you.`) : null,
section(
{ title: "How it is measured", actions: [h("a", { class: "cn-btn cn-btn--s", href: href("html"), target: "_blank", rel: "noopener" }, "Full report"), h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: href("markdown"), target: "_blank", rel: "noopener" }, "Markdown")] },
h("ul", { class: "cn-points" }, r.method.map((m) => h("li", null, m))),
),
]);
}
function stateActions(c, reload) {
const move = (state, label, opts) => button(label, async () => {
await api.post(`/v1/brand/campaigns/${seg(c.id)}/state`, { state });
reload();
return `Campaign ${state}.`;
}, opts);
if (c.state === "draft") return actions(move("cancelled", "Cancel", { quiet: true, danger: true, confirm: "Cancel this campaign?" }), move("open", "Open the campaign", { primary: true }));
if (c.state === "open") return actions(move("cancelled", "Cancel", { quiet: true, danger: true, confirm: "Cancel this campaign?" }), move("closed", "Close it", { confirm: "Close the campaign? No new offers can be sent; bookings carry on." }));
return null;
}
async function render(main, ctx) {
const body = h("div", { class: "ap-stack" });
screenHead(main, "campaigns", { title: "Campaign", line: "", back: ["All campaigns", "/orbe-site/demo/app/campaigns"] }).append(body);
const reload = () =>
block(body, () => api.get("/v1/brand/campaigns"), ({ campaigns }) => {
const c = campaigns.find((x) => x.id === ctx.params.id);
if (!c) return emptyState("megaphone", "No such campaign.", [["All campaigns", "/orbe-site/demo/app/campaigns"]]);
const b = c.brief;
main.querySelector(".ap-h1").textContent = b.title;
document.title = `${b.title}: Orbe`;
return [
section(
{ title: "Brief", line: b.product, actions: stateActions(c, reload) },
kv([
["State", campaignState(c.state)],
["Budget", `${money(b.budget)}, Orbe's fee included`],
["Formats", b.formats.map((f) => formatName(f)).join(", ")],
["Publish", windowLine(b.window)],
["Where", b.audience.countries.length ? b.audience.countries.join(", ") : "Anywhere"],
["Drafts", b.reviewDrafts ? "You review each one" : "No review"],
]),
),
tabs("campaign", [
{ id: "matches", label: "Matches", render: (el) => matchesTab(el, c) },
{ id: "offers", label: "Offers", render: (el) => offersTab(el, c) },
{ id: "report", label: "Report", render: (el) => reportTab(el, c) },
], new URLSearchParams(location.search).get("tab"), { address: true }),
];
});
await reload();
}
});
