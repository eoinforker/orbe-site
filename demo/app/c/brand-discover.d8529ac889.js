__o.d("js/brand/discover.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, seg } = __o.r("js/api.js");
const { FORMATS, formatName, KINDS, sizeWords } = __o.r("js/terms.js");
const { actions, block, count, field, form, h, input, money, plural, select, textarea } = __o.r("js/ui.js");
const { drawer, emptyState, rating, screenHead, section } = __o.r("js/console-ui.js");
const { button, narrow, picks, status, table, twoLine } = __o.r("js/cards.js");

const BANDS = ["seed", "rise", "low", "mid", "high", "top"];
const FORMAT_KEYS = [...new Set(FORMATS.map((f) => f.format))];
const CHECK = { below: "under Orbe's suggestion", within: "inside Orbe's suggested range", above: "over Orbe's suggestion" };
function offerForm(account, campaigns) {
const open = campaigns.filter((c) => c.state === "open");
if (!open.length) return h("p", { class: "cn-label" }, "Open a campaign to send an offer.");
const offerings = account.offerings.filter((o) => o.available);
if (!offerings.length) return h("p", { class: "cn-label" }, "Nothing on offer right now.");
return narrow(form(
[
field("Campaign", select(open.map((c) => [c.id, c.brief.title]), { name: "campaign" })),
field("Format", select(offerings.map((o) => [o.format, o.name]), { name: "format" })),
field("Price for the creator (£, optional)", input({ name: "price", type: "number", min: "0.01", step: "0.01", inputmode: "decimal" }), "Empty sends their list price. Orbe's fee is added on top."),
field("Guarantee at the format's last window (optional)", input({ name: "units", type: "number", min: "1", step: "1" }), "Views, downloads, opens or viewer-hours. Empty for no guarantee."),
field("A note (optional)", textarea({ name: "message", maxlength: 2000 })),
],
"Send the offer",
async (d) => {
const format = String(d.get("format"));
const o = offerings.find((x) => x.format === format);
const lastDay = Math.max(...(o?.delivery ?? []).map((w) => w.day), 1);
const price = String(d.get("price") ?? "").trim();
const units = String(d.get("units") ?? "").trim();
const message = String(d.get("message") ?? "").trim();
await api.post(`/v1/brand/campaigns/${seg(String(d.get("campaign")))}/offers`, {
ref: account.ref,
format,
...(price ? { price: Number(price) } : {}),
...(units ? { guarantee: { day: lastDay, units: Number(units) } } : {}),
...(message ? { message } : {}),
});
return "Offer sent. The creator stays anonymous to you unless they accept.";
},
));
}

function recentWorks(ref, label) {
drawer(`Recent works: ${label}`, async () => {
const box = h("div", { class: "ap-stack" });
await block(box, () => api.get(`/v1/brand/discover/${seg(ref)}`), ({ creator }) =>
creator.accounts.map((a) =>
section({ title: `${KINDS[a.kind] ?? a.kind}${a.handle ? `, ${a.handle}` : ""}` },
a.uploads.length
? table([["Work"], ["Against creators its size"]], a.uploads.slice(0, 8).map((u) => [
twoLine(u.title ?? "A work", u.published),
u.atSize ? twoLine(`${u.atSize.result === "within" ? "Inside" : u.atSize.result === "above" ? "Above" : "Below"} the middle half`, `${count(u.atSize.p25)} to ${count(u.atSize.p75)} ${u.atSize.metric} at ${u.atSize.day} days`) : h("span", { class: "dl-quiet" }, "Not compared yet"),
]), { caption: "Recent works" })
: h("p", { class: "cn-label" }, "No works to compare yet."),
),
),
);
return box;
}, { wide: true });
}

function priceCell(a) {
const priced = a.offerings.filter((o) => o.rateCard.listPrice);
if (!priced.length) return h("span", { class: "dl-quiet" }, a.offerings.length ? "On request" : "Nothing on offer");
const o = priced.reduce((x, y) => (y.rateCard.listPrice.amount < x.rateCard.listPrice.amount ? y : x));
const w = [...o.delivery].sort((x, y) => x.day - y.day).at(-1);
return twoLine(money(o.rateCard.listPrice), [o.name, w?.median ? `typically ${count(w.median)} at ${w.day} days` : null, o.available ? null : "paused"].filter(Boolean).join(", "));
}
function resultRows(r, campaigns) {
const name = r.shared && r.creator ? r.creator.displayName : "An anonymous creator";
const accounts = r.accounts.length ? r.accounts : [null];
const who = h("td", { rowspan: String(accounts.length), class: "cn-td-top" },
twoLine(name, [r.vertical ? `Subject: ${r.vertical}` : null, ...r.notes].filter(Boolean).join(". ") || null),
h("div", { class: "cn-td-tags" }, r.shared ? status("Shared with you", "good") : status("Anonymised"), button("Recent works", async () => void recentWorks(r.ref, name), { quiet: true })),
);
return accounts.map((a, i) => {
const lead = i === 0 ? [who] : [];
if (!a) return { cells: [...lead, h("span", { class: "dl-quiet" }, "No account"), null, null, null, null, null] };
const offer = button("Send an offer", async () => void drawer(`Send an offer: ${KINDS[a.kind] ?? a.kind}${a.handle ? `, ${a.handle}` : ""}`, () => offerForm(a, campaigns)), { quiet: true });
return {
skip: i === 0 ? 0 : 1,
cells: [
...lead,
twoLine(a.handle ?? "Not shared", KINDS[a.kind] ?? a.kind),
sizeWords(a.sizeBand, a.kind),
a.rating ? [rating(a.rating.rating), h("span", { class: "dl-sub" }, a.rating.band)] : h("span", { class: "dl-quiet" }, "Not rated"),
a.rating?.beats !== null && a.rating?.beats !== undefined ? `Beats ${a.rating.beats} in 100` : h("span", { class: "dl-quiet" }, "Not yet"),
priceCell(a),
a.offerings.some((o) => o.available) ? actions(offer) : null,
],
};
});
}
function queryOf(d) {
const q = new URLSearchParams();
for (const k of d.getAll("kinds")) q.append("kinds", String(k));
for (const b of d.getAll("bands")) q.append("bands", String(b));
for (const f of d.getAll("formats")) q.append("formats", String(f));
for (const k of ["q", "beatsAtLeast", "priceMin", "priceMax"]) {
const v = String(d.get(k) ?? "").trim();
if (v) q.set(k, v);
}
const s = q.toString();
return s ? `?${s}` : "";
}
async function render(main) {
const list = h("div", { class: "ap-stack" });
let campaigns = [];
const load = (query) =>
block(list, async () => {
const [r, c] = await Promise.all([api.get("/v1/brand/discover" + query), api.get("/v1/brand/campaigns")]);
campaigns = c.campaigns;
return r;
}, (r) => {
const notices = [...new Set(r.results.flatMap((x) => x.accounts.map((a) => a.rating?.notice).filter(Boolean)))];
return section(
{ title: "Creators", line: `${plural(r.total, "creator")} found${r.total > r.results.length ? `, the first ${r.results.length} shown` : ""}.` },
r.results.length
? table([["Creator"], ["Account"], ["Size"], ["Rating", "num"], ["Reach at its size"], ["From"], [""]], r.results.flatMap((x) => resultRows(x, campaigns)), { cls: "cn-roster-table", caption: "Creators found" })
: emptyState("search", "No creator matches.", [], "Fewer filters find more."),
(r.notes ?? []).map((n) => h("p", { class: "cn-label" }, n)),
notices.length ? notices.map((t) => h("p", { class: "cn-label" }, t)) : h("p", { class: "cn-label" }, `${r.label}.`),
);
});
const search = narrow(form(
[
picks("Where", "kinds", Object.entries(KINDS).filter(([k]) => k !== "photography")),
picks("Size, smallest to largest", "bands", BANDS.map((b) => [b, sizeWords(b)])),
picks("Format", "formats", FORMAT_KEYS.map((f) => [f, f === "dedicated" ? "Dedicated video or send" : formatName(f)])),
field("Topic words", input({ name: "q", maxlength: 200, placeholder: "budgeting, cooking" })),
h("details", { class: "ap-more" }, h("summary", null, "Reach and price"),
field("Reach beats at least this many in 100 creators their size", input({ name: "beatsAtLeast", type: "number", min: "0", max: "100", step: "1", inputmode: "numeric" })),
h("div", { class: "ap-pair" }, field("Price from (£)", input({ name: "priceMin", type: "number", min: "0", step: "1", inputmode: "numeric" })), field("Price to (£)", input({ name: "priceMax", type: "number", min: "0", step: "1", inputmode: "numeric" }))),
),
],
"Search",
async (d) => {
await load(queryOf(d));
},
));
screenHead(main, "discover", { line: "Creators who chose to be found, by their results against creators their size. Anonymised until a creator accepts an offer from you.", tags: [["Opt-in creators only", "sky"]] }).append(
h("div", { class: "ap-stack" }, section({ title: "Find creators", line: "Choose none in a group to include them all." }, search), list),
);
await load("");
}
});
