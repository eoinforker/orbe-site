__o.d("js/brand/bookings.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, seg } = __o.r("js/api.js");
const { BOOKING_STATES, disclosure, guaranteeLine, measured, priceLines, TONE, windowLine } = __o.r("js/deal.js");
const { formatName } = __o.r("js/terms.js");
const { action, actions, block, bps, chip, day, empty, field, form, h, money, rows, textarea, title, when } = __o.r("js/ui.js");
const { screenHead } = __o.r("js/console-ui.js");

function moves(b, reload) {
if (b.state === "awaiting_funds") {
const link = b.funding.checkoutUrl ? h("a", { class: "ob-lnk ob-lnk--s", href: b.funding.checkoutUrl, target: "_blank", rel: "noopener" }, "Pay now") : null;
return h("div", { class: "ap-stack" },
h("p", null, `Pay ${money(b.funding.total)} by ${when(b.funding.payBy)}. It is held until delivery is verified, and the creator starts once it has arrived.`),
link ?? actions(action("Fund this booking", async () => {
const r = await api.post(`/v1/brand/bookings/${seg(b.id)}/fund`, {});
reload();
return r.checkoutUrl ? "Ready to pay." : "Funding started.";
}, { primary: true })),
);
}
if (b.state === "draft_review")
return h("div", { class: "ap-stack" },
h("p", null, `The creator sent a draft${b.draft.note ? `: "${b.draft.note}"` : "."}${b.draft.reviewBy ? ` Answer by ${when(b.draft.reviewBy)}, or it is approved for you.` : ""}`),
actions(action("Approve the draft", async () => {
await api.post(`/v1/brand/bookings/${seg(b.id)}/review`, { decision: "approve" });
reload();
return "Approved.";
}, { primary: true })),
h("details", { class: "ap-more" }, h("summary", null, "Ask for changes"),
form([field("What should change", textarea({ name: "reason", required: true, maxlength: 2000 }), `Round ${b.draft.rounds + 1}. A booking allows two rounds of changes.`)], "Send", async (d) => {
await api.post(`/v1/brand/bookings/${seg(b.id)}/review`, { decision: "changes", reason: String(d.get("reason")).trim() });
reload();
return "Sent to the creator.";
}, { primary: false }),
),
);
if (b.state === "live" && !b.contentApprovedAt)
return h("div", { class: "ap-stack" },
h("p", { class: "ap-note" }, "You have 72 hours from going live to raise a problem with the content itself. The numbers need no review: they are read at source."),
actions(action("Approve the content", async () => {
await api.post(`/v1/brand/bookings/${seg(b.id)}/approve-content`, {});
reload();
return "Content approved.";
})),
);
return null;
}
async function render(main) {
const body = h("div");
screenHead(main, "bookings", { line: "Every accepted offer: money held until Orbe verifies delivery, and only then paid to the creator.", tags: [["Held until verified", "sky"]] }).append(body);
const reload = () =>
block(body, async () => {
const [{ bookings }, { campaigns }] = await Promise.all([api.get("/v1/brand/bookings"), api.get("/v1/brand/campaigns")]);
const ids = [...new Set(bookings.map((b) => b.creatorId))];
const names = Object.fromEntries(
await Promise.all(ids.map((id) => api.get(`/v1/brand/creators/${seg(id)}`).then((r) => [id, r.creator.displayName], () => [id, null]))),
);
return { bookings, campaigns, names };
}, ({ bookings, campaigns, names }) =>
bookings.length
? h("ul", { class: "ap-list" }, [...bookings].reverse().map((b) =>
h("li", { class: "ap-item ap-item--block" },
h("div", { class: "ap-item-main" },
h("p", { class: "ap-says" }, `${names[b.creatorId] || "A creator"}: ${formatName(b.format, b.kind)}`, " ", chip(BOOKING_STATES[b.state] ?? b.state, TONE[b.state])),
h("p", { class: "ap-note" }, campaigns.find((c) => c.id === b.campaignId)?.brief.title ?? ""),
rows([...priceLines(b), ["Publish between", windowLine(b.publishWindow)], b.funding.fundedAt ? ["Held since", day(b.funding.fundedAt)] : null, b.outcome ? ["Outcome", `${b.outcome.reason} The creator receives ${bps(b.outcome.creatorShareBps)} of the price.`] : null]),
h("p", { class: "ap-guarantee" }, guaranteeLine(b)),
b.works.map((w) => h("div", { class: "ap-work" }, h("p", null, w.url ? h("a", { href: w.url, target: "_blank", rel: "noopener" }, w.title) : w.title), disclosure(w))),
measured(b),
),
moves(b, reload),
),
))
: empty("No bookings yet. A booking is made when a creator accepts your offer."),
);
await reload();
}
});
