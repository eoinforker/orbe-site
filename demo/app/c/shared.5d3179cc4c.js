__o.d("js/brand/campaigns.js", function (__x) {
"use strict";
__o.e(__x, { CAMPAIGN_TONE: () => CAMPAIGN_TONE, CAMPAIGN_STATES: () => CAMPAIGN_STATES, campaignState: () => campaignState, render: () => render });
const { api, seg } = __o.r("js/api.js");
const { FORMATS, KINDS } = __o.r("js/terms.js");
const { block, countryCodes, day, field, form, h, input, money, textarea } = __o.r("js/ui.js");
const { emptyState, screenHead, section } = __o.r("js/console-ui.js");
const { choice, narrow, picks, status, table, twoLine } = __o.r("js/cards.js");

const CAMPAIGN_TONE = { open: "good", closed: "off", cancelled: "off" };
const CAMPAIGN_STATES = { draft: "Draft", open: "Open", closed: "Closed", cancelled: "Cancelled" };

const campaignState = (state) => status(CAMPAIGN_STATES[state] ?? state, CAMPAIGN_TONE[state]);
const FORMAT_CHOICES = [...new Map(FORMATS.map((f) => [f.format, f.format === "dedicated" ? "Dedicated video or send" : f.name])).entries()];
const iso = (d) => d.toISOString().slice(0, 10);
function briefForm(ctx) {
const now = new Date();
const start = new Date(now.getTime() + 7 * 864e5);
const end = new Date(now.getTime() + 49 * 864e5);
return narrow(form(
[
field("Campaign name", input({ name: "title", required: true, maxlength: 120 })),
field("What you are promoting", textarea({ name: "product", required: true, maxlength: 1000 }), "Creators read this when your offer arrives."),
field("Budget (£)", input({ name: "budget", type: "number", min: "1", step: "1", required: true, inputmode: "numeric" }), "Everything you spend, Orbe's fee included."),
picks("Where", "kinds", Object.entries(KINDS).filter(([k]) => k !== "photography").map(([k, name]) => [k, name, k === "podcast" || k === "youtube"])),
picks("Formats", "formats", FORMAT_CHOICES.map(([f, name]) => [f, name, f === "podcast_read" || f === "integration"])),
field("Countries (optional)", input({ name: "countries", maxlength: 200, placeholder: "GB, IE" }), "Two-letter codes, separated by commas. Empty means anywhere."),
h("div", { class: "ap-pair" }, field("Publish from", input({ name: "start", type: "date", required: true, value: iso(start) })), field("Publish by", input({ name: "end", type: "date", required: true, value: iso(end) }))),
h("div", { class: "ap-pair" }, field("Smallest audience (optional)", input({ name: "minAudience", type: "number", min: "0", step: "1" })), field("Largest audience (optional)", input({ name: "maxAudience", type: "number", min: "0", step: "1" }))),
field("Most you will pay per 1,000 (£, optional)", input({ name: "cpm", type: "number", min: "0.01", step: "0.01" }), "Matches are scored against it, and the report measures it."),
choice("Review each draft before it goes out", { name: "reviewDrafts", checked: true }),
choice("Open it now", { name: "open", checked: true }, "So offers can be sent."),
],
"Create the campaign",
async (d) => {
const num = (k) => {
const v = String(d.get(k) ?? "").trim();
return v === "" ? undefined : Number(v);
};
const kinds = d.getAll("kinds").map(String);
const formats = d.getAll("formats").map(String);
if (!formats.length) throw new Error("Choose at least one format.");
const countries = countryCodes(d.get("countries"));
const body = {
title: String(d.get("title")).trim(),
product: String(d.get("product")).trim(),
budget: Number(d.get("budget")),
kinds,
formats,
start: String(d.get("start")),
end: String(d.get("end")),
reviewDrafts: d.get("reviewDrafts") === "on",
open: d.get("open") === "on",
...(countries.length ? { countries } : {}),
...(num("minAudience") !== undefined ? { minAudience: num("minAudience") } : {}),
...(num("maxAudience") !== undefined ? { maxAudience: num("maxAudience") } : {}),
...(num("cpm") !== undefined ? { kpis: { costPerThousandMax: num("cpm") } } : {}),
};
const r = await api.post("/v1/brand/campaigns", body);
ctx.go(`/orbe-site/demo/app/campaigns/${seg(r.campaign.id)}`);
return "Created.";
},
));
}
async function render(main, ctx) {
const list = h("div", { class: "ap-stack" });
const brief = h("details", { class: "ap-more cn-brief", open: ctx.query.get("new") === "1" }, h("summary", null, "Write a brief"), briefForm(ctx));
screenHead(main, "campaigns", { line: "Write a brief, see creators matched from their verified records, and send offers at their price with a guarantee.", tags: [["Paid on verified delivery", "sky"]] }).append(
h("div", { class: "ap-stack" }, list, section({ title: "New campaign", line: "A brief in; creators matched from their verified records out." }, brief)),
);
await block(list, () => api.get("/v1/brand/campaigns"), ({ campaigns }) =>
section(
{ title: "Your campaigns", line: "Open one for its matches, offers and report." },
campaigns.length
? table([["Campaign"], ["State"], ["Budget", "num"], ["Publish"]], [...campaigns].reverse().map((c) => [
twoLine(h("a", { href: `/orbe-site/demo/app/campaigns/${seg(c.id)}` }, c.brief.title), `Started ${day(c.createdAt)}`),
campaignState(c.state),
money(c.brief.budget),
`${day(c.brief.window.start)} to ${day(c.brief.window.end)}`,
]), { caption: "Your campaigns" })
: emptyState("megaphone", "No campaigns yet.", [], "Write a brief below to see who fits."),
),
);
}
});
__o.d("js/deal.js", function (__x) {
"use strict";
__o.e(__x, { OFFER_STATES: () => OFFER_STATES, BOOKING_STATES: () => BOOKING_STATES, TONE: () => TONE, withFee: () => withFee, guaranteeLine: () => guaranteeLine, priceLines: () => priceLines, windowLine: () => windowLine, measured: () => measured, disclosure: () => disclosure });
const { unitOf } = __o.r("js/terms.js");
const { bps, count, day, h, money } = __o.r("js/ui.js");

const OFFER_STATES = { sent: "Waiting for the creator", countered: "Countered", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn", expired: "Expired" };
const BOOKING_STATES = {
awaiting_funds: "Waiting for funds",
in_production: "In production",
draft_review: "Draft with the brand",
changes_requested: "Changes asked for",
ready: "Ready to publish",
live: "Live, being measured",
short: "Short of the guarantee",
make_good: "Make-good due",
verified: "Delivery verified",
paid: "Paid",
disputed: "Disputed",
cancelled: "Cancelled",
};
const TONE = { paid: "good", verified: "good", live: "good", accepted: "good", short: "warn", make_good: "warn", disputed: "warn", changes_requested: "warn", declined: "off", withdrawn: "off", expired: "off", cancelled: "off" };

function withFee(price, feeBps) {
return { amount: price.amount + Math.round((price.amount * feeBps) / 10_000), currency: price.currency };
}

function guaranteeLine(x) {
const unit = unitOf(x.format, x.kind);
if (!x.guarantee) return "No delivery guarantee: the creator is paid once the work is live, disclosed and verified.";
const s = x.shortfall;
return `Guaranteed ${count(x.guarantee.units)} ${unit} at ${x.guarantee.day} ${x.guarantee.day === 1 ? "day" : "days"}. Within ${bps(s.toleranceBps)} counts as delivered. If it falls short: a make-good within ${s.makeGoodDays} days, or paid in proportion, never under ${bps(s.floorBps)} of the price.`;
}
const priceLines = (x) => [
["Creator's price", money(x.price)],
[`Orbe's fee (${bps(x.fee.bps)}, paid by the ${x.fee.payer})`, money({ amount: withFee(x.price, x.fee.bps).amount - x.price.amount, currency: x.price.currency })],
["The brand pays", money(withFee(x.price, x.fee.bps))],
];
const windowLine = (w) => `${day(w.start)} to ${day(w.end)}`;

function measured(b) {
const unit = unitOf(b.format, b.kind);
if (!b.measurements?.length) return null;
return h("ul", { class: "ap-plain" }, b.measurements.map((m) => h("li", null, `${count(m.units)} ${unit} at ${m.day} ${m.day === 1 ? "day" : "days"}, read ${day(m.recordedAt)} (${m.how.replaceAll("_", " ")})`)));
}

function disclosure(w) {
const d = w.disclosure;
if (!d) return null;
const said = { pass: "Disclosure checked: every required rule is met.", needs_attestation: "Disclosure: nothing failed, but some rules need your word.", fail: "Disclosure: a required rule is missing or weak." }[d.status] ?? d.status;
const open = d.results.filter((r) => r.status !== "met" && r.status !== "attested");
return h("div", null, h("p", { class: d.status === "fail" ? "ap-warn" : "ap-note" }, said), open.length ? h("ul", { class: "ap-plain" }, open.map((r) => h("li", null, `${r.rule}: ${r.status}. ${r.evidence}`))) : null);
}
});
