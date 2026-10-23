__o.d("js/admin/campaign.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, apiHref, seg } = __o.r("js/api.js");
const { BOOKING_STATES, TONE } = __o.r("js/deal.js");
const { actions, block, bps, count, day, field, form, h, input, money, plural, select } = __o.r("js/ui.js");
const { emptyState, section, toolShell } = __o.r("js/console-ui.js");
const { tile } = __o.r("js/catalogue.js");
const { button, kv, narrow, status, table, twoLine } = __o.r("js/cards.js");
const { CAMPAIGN_STATES } = __o.r("js/brand/campaigns.js");

const PAYEES = [["creator", "The creator"], ["orbe", "Orbe's fee"], ["brand", "Refund to the brand"]];
const RECEIPTS = [["bank_transfer", "Bank transfer"], ["invoice_paid", "Invoice paid"]];
const gbp = (amount, currency) => money({ amount, currency });
function shortlistBox(el, c, reload) {
block(el, () => api.get(`/v1/admin/desk/campaigns/${seg(c.id)}/shortlist`), ({ shortlist: s }) => {
if (!s.picks.length) return emptyState("search", "No proven show fits yet.", [], s.notVerified ? `${plural(s.notVerified, "opted-in creator")} ${s.notVerified === 1 ? "has" : "have"} no proven show.` : null);
return [
h("p", { class: "cn-label" }, `${s.picks.length} proven shows inside the budget: ${gbp(s.spend.amount, s.spend.currency)} with Orbe's ${bps(s.feeBps)}, ${gbp(s.left.amount, s.left.currency)} left.${s.notVerified ? ` ${s.notVerified} opted-in creators are left out until their show is proven.` : ""}`),
form(
[
table([[""], ["Show"], ["Price", "num"], ["Guarantee"], ["At the floor"]], s.picks.map((p) => {
const name = `${p.show?.title ?? p.handle ?? "Show"}, ${p.displayName}`;
return [
h("input", { class: "cn-rowtick", type: "checkbox", name: "pick", value: `${p.creatorId} ${p.accountId}`, checked: true, "aria-label": `Send an offer to ${name}` }),
twoLine(p.show?.title ?? p.handle ?? "Show", p.displayName),
p.quote ? twoLine(money(p.price), `the brand pays ${money(p.quote.brandPays)}`) : money(p.price),
p.quote?.guarantee ? `${count(p.quote.guarantee.units)} ${p.quote.guarantee.unit} at ${p.quote.guarantee.day} days` : h("span", { class: "dl-quiet" }, "None: too little verified history"),
p.quote ? twoLine(`Creator ${money(p.quote.atFloor.creatorPayout)}`, `back to the brand ${money(p.quote.atFloor.brandRefund)}`) : null,
];
}), { caption: "Proven shows" }),
],
"Send offers to the chosen shows",
async (d) => {
const picks = d.getAll("pick").map((v) => {
const [creatorId, accountId] = String(v).split(" ");
return { creatorId, accountId };
});
if (!picks.length) throw new Error("Choose at least one show.");
const r = await api.post(`/v1/admin/desk/campaigns/${seg(c.id)}/offers`, { picks });
reload();
const failed = r.results.filter((x) => !x.ok);
return `${r.sent} sent.${failed.length ? ` Not sent: ${failed.map((x) => x.message).join(" ")}` : ""}`;
},
),
];
});
}
const INVOICE = { paid: ["Paid", "good"], void: ["Void", "off"] };
function invoiceBox(data, reload) {
const { campaign: c, invoices } = data;
const said = h("div", { "aria-live": "polite" });
const waiting = data.summary.rows.filter((r) => r.state === "awaiting_funds").length;
const link = (i, fmt, text, quiet) => h("a", { class: `cn-btn cn-btn--s${quiet ? " cn-btn--ghost" : ""}`, href: apiHref(`/v1/admin/desk/invoices/${seg(i.id)}?format=${fmt}`), target: "_blank", rel: "noopener" }, text);
return [
invoices.length
? h("div", { class: "cn-blocks" }, invoices.map(({ invoice: i, bookingIds }) =>
h("div", { class: "cn-block" },
h("div", { class: "cn-block-head" }, twoLine(i.number, `${money(i.gross)} with VAT (${money(i.net)} before VAT), ${bookingIds.length} bookings`), status(...(INVOICE[i.status] ?? ["Due", "warn"]))),
h("div", { class: "ap-actions" }, link(i, "html", "Open the invoice"), link(i, "markdown", "Markdown", true)),
i.status === "issued"
? narrow(form([field("Payment reference", input({ name: "reference", required: true, maxlength: 120 }), "As it appears on the bank statement.")], "Record the brand's payment", async (d) => {
await api.post(`/v1/admin/desk/invoices/${seg(i.id)}/paid`, { reference: String(d.get("reference")).trim() });
reload();
return "Recorded. The bookings on it are funded.";
}))
: null,
),
))
: h("p", { class: "cn-label" }, "No invoice yet."),
waiting
? actions(button("Invoice the accepted bookings", async () => {
const r = await api.post(`/v1/admin/desk/campaigns/${seg(c.id)}/invoice`, {});
said.replaceChildren(h("p", null, `${r.invoice.number} issued.`));
reload();
return `${r.invoice.number} issued.`;
}, { primary: true }))
: null,
said,
];
}
function bookingItem(r, reload) {
const owed = r.owedToCreator + r.owedToBrand > 0 || (r.orbeFee !== null && r.state === "verified");
return h("div", { class: "cn-block" },
h("div", { class: "cn-block-head" }, twoLine(r.show, r.creator), status(BOOKING_STATES[r.state] ?? r.state, TONE[r.state])),
kv([
["Price", gbp(r.price, r.currency)],
["Brand paid", r.fundedRef ? `${gbp(r.funded, r.currency)}, ref ${r.fundedRef}` : `Not yet (${gbp(r.funded, r.currency)} due)`],
["Guarantee", r.guarantee === null ? "None" : count(r.guarantee)],
["At 7 days", r.read7 === null ? "Not read yet" : count(r.read7)],
["At 30 days", r.read30 === null ? "Not read yet" : count(r.read30)],
r.shortfall ? ["Short by", count(r.shortfall)] : null,
r.creatorPayout !== null ? ["Settled", `Creator ${gbp(r.creatorPayout, r.currency)} (${r.creatorSharePct}%), Orbe ${gbp(r.orbeFee, r.currency)}, refund ${gbp(r.brandRefund ?? 0, r.currency)}`] : null,
r.owedToCreator ? ["Owed to the creator", gbp(r.owedToCreator, r.currency)] : null,
r.owedToBrand ? ["Owed to the brand", gbp(r.owedToBrand, r.currency)] : null,
]),
r.state === "awaiting_funds"
? h("details", { class: "ap-more" }, h("summary", null, "Record the brand's payment for this booking"),
narrow(form([field("How", select(RECEIPTS, { name: "method" })), field("Reference", input({ name: "reference", required: true, maxlength: 120 }))], "Record it", async (d) => {
await api.post(`/v1/admin/desk/bookings/${seg(r.bookingId)}/funded`, { method: String(d.get("method")), reference: String(d.get("reference")).trim() });
reload();
return "Recorded.";
}, { primary: false })))
: null,
owed
? h("details", { class: "ap-more" }, h("summary", null, "Record a payout you have made"),
narrow(form([field("To", select(PAYEES, { name: "payee" })), field("Reference", input({ name: "reference", required: true, maxlength: 120 }))], "Record it", async (d) => {
await api.post(`/v1/admin/desk/bookings/${seg(r.bookingId)}/payouts`, { payee: String(d.get("payee")), reference: String(d.get("reference")).trim() });
reload();
return "Recorded.";
}, { primary: false })))
: null,
);
}
function settleBox(c, reload) {
const said = h("div", { "aria-live": "polite" });
return [
actions(button("Run settlement", async () => {
const r = await api.post(`/v1/admin/desk/campaigns/${seg(c.id)}/settle`, {});
said.replaceChildren(
h("p", null, `${r.settled.length} settled.`),
r.waiting.length ? h("ul", { class: "cn-points" }, r.waiting.map((w) => h("li", null, `${w.bookingId}: ${w.reasons.join(" ")}`))) : null,
);
reload();
return `${r.settled.length} settled.`;
})),
said,
];
}
function totalsBox(c, s) {
const t = s.totals;
const m = (v) => gbp(v, s.currency);
return kv([
["Shows", count(s.shows)],
["Guaranteed", count(t.guarantee)],
["Delivered", count(t.delivered)],
["Short by", count(t.shortfall)],
["Creators' prices", m(t.price)],
["Brand paid in (before VAT)", m(t.funded)],
["To creators", `${m(t.creatorPayout)}; ${m(t.owedToCreator)} still to pay`],
["Orbe's fee", m(t.orbeFee)],
["Back to the brand", `${m(t.brandRefund)}; ${m(t.owedToBrand)} still to pay`],
]);
}
async function render(main, ctx) {
const body = h("div", { class: "ap-stack" });
toolShell(main, { title: "Desk campaign", tile: tile("products/sponsorships/", "spon", h, "l"), back: ["All desk campaigns", "/orbe-site/demo/app/desk"], tags: [["Orbe staff only", "straw"]] }).append(body);
const reload = () =>
block(body, () => api.get(`/v1/admin/desk/campaigns/${seg(ctx.params.id)}`), (data) => {
const { campaign: c, brand, summary: s } = data;
main.querySelector(".ap-h1").textContent = c.brief.title;
document.title = `${c.brief.title}: Orbe`;
const shortlist = h("div", { class: "ap-stack" });
const build = c.state === "open" ? h("details", { class: "ap-more" }, h("summary", null, "Build the shortlist from proven shows"), shortlist) : null;
build?.addEventListener("toggle", () => build.open && !shortlist.childElementCount && shortlistBox(shortlist, c, reload));
return [
section(
{ title: "Brief", line: brand.org },
kv([
["State", status(CAMPAIGN_STATES[c.state] ?? c.state, c.state === "open" ? "good" : "off")],
["Budget", `${money(c.brief.budget)}, Orbe's fee included`],
["Publish", `${day(c.brief.window.start)} to ${day(c.brief.window.end)}`],
["Payments", data.payments ?? "None set: SPONSOR_PAYMENTS"],
]),
),
build ? section({ title: "Shortlist", line: "Proven shows inside the budget, each with its quote." }, build) : null,
section({ title: "Invoice", line: "The brand pays Orbe's invoice; recording the payment funds the bookings on it." }, invoiceBox(data, reload)),
section({ title: "Bookings", line: "Each accepted offer, read at 7 and 30 days." }, s.rows.length ? h("div", { class: "cn-blocks" }, s.rows.map((r) => bookingItem(r, reload))) : emptyState("mail", data.offers.length ? `${data.offers.length} offers sent; none accepted yet.` : "No offers sent yet.", [])),
s.rows.some((r) => r.state === "verified" && r.creatorPayout === null)
? section({ title: "Settlement", line: "Runs the agreed settlement on every verified booking: the guarantee, pro rata above the floor after a shortfall, and Orbe's fee on what the creator earns. It writes down what is owed; you pay it and record each payment." }, settleBox(c, reload))
: null,
section({ title: "Summary", actions: h("a", { class: "cn-btn cn-btn--s", href: apiHref(`/v1/admin/desk/campaigns/${seg(c.id)}/summary?format=csv`), download: "" }, "CSV for the accountant") }, totalsBox(c, s)),
];
});
await reload();
}
});
