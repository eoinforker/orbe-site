__o.d("js/creator/record.js", function (__x) {
"use strict";
__o.e(__x, { figure: () => figure, sentence: () => sentence, keyPoints: () => keyPoints, exportLinks: () => exportLinks, STATUS_PILL: () => STATUS_PILL, eraseBox: () => eraseBox, render: () => render });
const { api, apiHref, on, seg } = __o.r("js/api.js");
const { CONSENTS, handleOf, KINDS, unitOf } = __o.r("js/terms.js");
const { bars, emptyState, historyList, pill, rating, screenHead, section, skeleton, sparkline, stat, statStrip } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { action, block, check, count, day, field, form, h, input, ok, signed, tabs, toast } = __o.r("js/ui.js");

const GRANTABLE = ["connect", "rate_public", "verified_profile", "benchmarks", "listing"];

function figure(f, currency) {
const v = f.value;
if (v === null || v === undefined) return "not known";
switch (f.unit) {
case "money":
return new Intl.NumberFormat("en-GB", { style: "currency", currency: f.currency ?? currency ?? "GBP", maximumFractionDigits: 0 }).format(v / 100);
case "percent":
return `${Math.round(v * 100)}%`;
case "change":
return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 100))}%`;
case "rating":
return signed(v);
default:
return typeof v === "number" ? v.toLocaleString("en-GB") : String(v);
}
}

function sentence(text, currency) {
if (!text) return null;
if (typeof text === "string") return text;
const out = [];
let last = 0;
for (const m of text.t.matchAll(/\{(\d+)\}/g)) {
out.push(text.t.slice(last, m.index));
const f = text.f[Number(m[1])];
out.push(f ? h("b", { title: f.label }, figure(f, currency)) : m[0]);
last = m.index + m[0].length;
}
out.push(text.t.slice(last));
return out;
}
const TONE_WORDS = { concern: "Concern", note: "Note", strength: "Strength", positive: "Strength" };

const CONCERN_WORDS = { high: "Concern", medium: "Worth explaining", low: "Note" };

function keyPoints(r) {
if (!r.keyPoints?.length) return null;
return h("ul", { class: "rc-points" },
r.keyPoints.map((k) =>
h("li", { class: `rc-point rc-point--${k.tone}` },
h("span", { class: "rc-point-cue" }, k.tone === "concern" ? (CONCERN_WORDS[k.severity] ?? TONE_WORDS.concern) : TONE_WORDS[k.tone] ?? k.tone),
h("p", { class: "rc-point-t" }, sentence(k.text, r.currency)),
),
),
);
}

const exportLinks = () => [
h("a", { class: "cn-btn cn-btn--s", href: apiHref("/v1/me/record?format=html"), target: "_blank", rel: "noopener" }, icon("external"), "Open the full record"),
h("a", { class: "cn-btn cn-btn--s", href: apiHref("/v1/me/record?format=markdown"), target: "_blank", rel: "noopener" }, icon("doc"), "Markdown"),
];
const STATUS_PILL = { verified: "done", verified_with_exceptions: "needs", partly_verified: "needs", not_checked: "idle" };
const monthName = (m) => new Date(`${m.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

function hero(r, goShare) {
return h("section", { class: "rc-hero" },
h("div", { class: "rc-hero-main" },
h("div", { class: "rc-hero-top" }, pill(STATUS_PILL[r.verdict.status] ?? "idle", r.verdict.label), r.period ? h("span", { class: "cn-tag cn-tag--line" }, `${day(r.period.from)} to ${day(r.period.to)}`) : null),
h("p", { class: "rc-hero-t" }, sentence(r.verdict.summary, r.currency)),
h("p", { class: "cn-label" }, `Prepared ${day(r.generatedAt)}. Every figure carries the source it was read from and when.`),
),
h("div", { class: "rc-hero-acts" }, h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "button", onclick: goShare }, icon("link"), "Share"), exportLinks()),
);
}
function headline(r) {
const months = r.revenue?.ttm?.byMonth ?? [];
const series = months.map((m) => m.total?.value ?? null);
const figs = r.headline ?? [];
if (!figs.length) return null;
return statStrip(figs.slice(0, 4).map((f, i) =>
stat({
label: f.label.replace("@@", "@"),
value: figure(f, r.currency),
spark: i === 0 && f.unit === "money" ? sparkline(series, "Revenue by month") : null,
tone: f.unit === "change" && f.value < 0 ? "warn" : null,
line: i ? null : f.basis === "connected" ? "Read from connected sources" : f.basis === "uploaded" ? "From files you uploaded" : null,
}),
));
}

function tipBars(node, tips) {
if (!node) return node;
[...node.children].forEach((bar, i) => {
bar.dataset.tip = tips[i];
bar.tabIndex = 0;
bar.setAttribute("aria-label", tips[i]);

bar.addEventListener("pointerdown", (e) => {
if (e.pointerType === "mouse") return;
for (const b of node.children) b.classList.toggle("is-tip", b === bar);
});
});
node.removeAttribute("role");
node.setAttribute("aria-label", "Revenue by month");
return node;
}

const KEY = [["corr", "is-connected is-corr", "Connected, corroborated"], ["connected", "is-connected", "Connected"], ["uploaded", "is-uploaded", "Uploaded"], ["missing", "is-missing", "Not read"]];

function revenueSection(r) {
const months = r.revenue?.ttm?.byMonth ?? [];
const cov = r.coverage;
if (!months.length && !cov?.cells?.length) return null;
const cell = (stream, month) => cov.cells.find((c) => c.stream === stream && c.month === month);
const stateOf = (c) => (!c || !["connected", "uploaded"].includes(c.status) ? "missing" : c.status === "connected" && c.corroborated ? "corr" : c.status);
const present = new Set((cov?.streams ?? []).flatMap((st) => (cov.months ?? []).map((m) => stateOf(cell(st, m)))));
const word = (c) => (!c || c.status === "missing" ? "Not read" : `${c.status === "connected" ? "Connected" : "Uploaded"}${c.corroborated ? ", corroborated" : ""}`);
return section(
{ title: "Revenue by month", line: cov ? `${figure(cov.connectedShare ?? { value: 0, unit: "percent" })} read from connected sources, ${figure(cov.corroboratedShare ?? { value: 0, unit: "percent" })} agreed by a second source.` : null },
months.length
? h("div", { class: "rc-rev" },
tipBars(bars(months.map((m) => m.total?.value ?? 0), "Revenue by month"), months.map((m) => `${monthName(m.month)}: ${figure(m.total, r.currency)}`)),
h("div", { class: "rc-rev-x" }, months.map((m) => h("span", { title: `${m.total?.label}: ${figure(m.total, r.currency)}` }, monthName(m.month)))),
)
: null,
cov?.cells?.length
? h("div", { class: "rc-cov", role: "table", "aria-label": "How each month was read" },
cov.streams.map((s) =>
h("div", { class: "rc-cov-row", role: "row" },
h("span", { class: "rc-cov-s", role: "rowheader" }, s.charAt(0).toUpperCase() + s.slice(1)),
h("span", { class: "rc-cov-cells" }, cov.months.map((m) => {
const c = cell(s, m);
return h("span", { class: `rc-cov-c is-${c?.status ?? "missing"}${c?.corroborated ? " is-corr" : ""}`, role: "cell", title: `${monthName(m)}: ${word(c)}`, "aria-label": `${monthName(m)}: ${word(c)}` });
})),
),
),

h("p", { class: "rc-cov-key" }, KEY.filter(([k]) => present.has(k)).map(([, cls, label]) => h("span", { class: "rc-cov-k" }, h("span", { class: `rc-cov-c ${cls}` }), label))),
)
: null,
);
}

function ratingsSection(hist) {
const accounts = (hist?.accounts ?? []).map((a) => ({ ...a, ratings: [...a.ratings].sort((x, y) => x.computedAt.localeCompare(y.computedAt)) }));
const rated = accounts.filter((a) => a.ratings.length);
return section(
{ title: "Rating history", line: hist ? `${hist.label}. ${hist.historyDays ? `The last ${hist.historyDays} days on your plan.` : "Everything Orbe keeps."}` : null },
rated.length
? h("ul", { class: "rc-ratings" }, rated.map((a) => {
const last = a.ratings[a.ratings.length - 1];
const first = a.ratings[0];
const moved = last.rating - first.rating;
return h("li", { class: "rc-rating" },
h("div", { class: "rc-rating-who" }, h("p", { class: "rc-rating-h" }, handleOf(a.handle, a.kind)), h("p", { class: "dl-sub" }, `${KINDS[a.kind] ?? a.kind}, ${count(a.ratings.length)} ${a.ratings.length === 1 ? "reading" : "readings"} since ${day(first.computedAt)}`)),
sparkline(a.ratings.map((x) => x.rating), `Rating of ${a.handle} over time`) ?? h("span"),
h("div", { class: "rc-rating-now" }, rating(last.rating, { size: "", tag: "p", cls: "rc-rating-v" }), h("p", { class: "dl-sub" }, `${last.band}${a.ratings.length > 1 ? `, ${moved >= 0 ? "up" : "down"} ${signed(Math.abs(moved)).replace(/^\+/, "")}` : ""}`)),
);
}))
: emptyState("star", "No rating kept yet.", [["Rate a channel", "/orbe-site/demo/app/rate"]], "A rating is kept while your public rating consent lasts, once an account has enough matured works."),
);
}

const DELIVERED = ["live", "short", "make_good", "verified", "paid", "disputed"];

const grow = (el, n) => ((el.style.flexGrow = String(n)), el);
const DISC_WORDS = { pass: "Every rule met", needs_attestation: "Needs your word", fail: "A rule missing" };
function deliveriesSection(bookings) {
const done = bookings.filter((b) => DELIVERED.includes(b.state) && b.works?.length);
const works = done.flatMap((b) => b.works.map((w) => ({ b, w })));
const tally = { pass: 0, needs_attestation: 0, fail: 0 };
for (const { w } of works) if (w.disclosure) tally[w.disclosure.status] = (tally[w.disclosure.status] ?? 0) + 1;
const checked = tally.pass + tally.needs_attestation + tally.fail;
const verified = done.filter((b) => ["verified", "paid"].includes(b.state));
return section(
{ title: "Sponsored deliveries", line: "Bookings through Orbe, read at source after they went live, with how each was disclosed.", actions: h("a", { class: "cn-btn cn-btn--xs", href: "/orbe-site/demo/app/deals" }, "All deals") },
works.length
? [
h("div", { class: "rc-disc" },
h("p", { class: "rc-disc-h" }, h("b", null, checked ? `${Math.round((tally.pass / checked) * 100)}%` : "None"), " fully disclosed", h("span", { class: "dl-sub" }, ` ${count(verified.length)} of ${count(done.length)} deliveries verified`)),
checked ? h("div", { class: "rc-disc-bar", role: "img", "aria-label": `${tally.pass} met every rule, ${tally.needs_attestation} need your word, ${tally.fail} missing a rule` },
["pass", "needs_attestation", "fail"].map((k) => (tally[k] ? grow(h("span", { class: `rc-disc-seg rc-disc-seg--${k}` }), tally[k]) : null))) : null,
h("p", { class: "rc-disc-key" }, ["pass", "needs_attestation", "fail"].map((k) => h("span", { class: `rc-disc-k rc-disc-k--${k}` }, `${DISC_WORDS[k]} ${tally[k]}`))),
),
h("div", { class: "dl-wrap" }, h("table", { class: "dl-table" },
h("thead", null, h("tr", null, ["Work", "Brand", "Delivered", "Disclosure", "State"].map((t, i) => h("th", { scope: "col", class: i === 2 ? "dl-num" : null }, t)))),
h("tbody", null, works.map(({ b, w }) => {
const m = b.measurements?.[b.measurements.length - 1];
return h("tr", null,
h("td", { class: "dl-brand" }, w.workId ? h("a", { class: "dl-brand-n", href: `/orbe-site/demo/app/works/${seg(w.workId)}` }, w.title) : h("span", { class: "dl-brand-n" }, w.title), h("span", { class: "dl-sub" }, `Published ${day(w.publishedAt)}`)),
h("td", { class: "dl-move" }, b.brandName),
h("td", { class: "dl-num" }, m ? `${count(m.units)} ${unitOf(b.format, b.kind)}` : h("span", { class: "dl-quiet" }, "Reading")),
h("td", { class: "dl-next" }, w.disclosure ? h("span", { class: `dl-disc dl-disc--${w.disclosure.status}` }, DISC_WORDS[w.disclosure.status] ?? w.disclosure.status) : h("span", { class: "dl-quiet" }, "Not checked")),
h("td", { class: "dl-stage" }, pill(["verified", "paid"].includes(b.state) ? "done" : b.state === "live" ? "running" : "needs", { live: "Measuring", verified: "Verified", paid: "Paid", short: "Short", make_good: "Make-good due", disputed: "Disputed" }[b.state])),
);
})),
)),
]
: emptyState("earn", "No sponsored delivery yet.", [["Deals", "/orbe-site/demo/app/deals"]], "A booking through Orbe is read at source once it is live, and its delivery and disclosure land here."),
);
}

function checksSection(r) {
const c = r.checkSummary;
return section(
{ title: "What Orbe checked", line: "Cross-checks between sources, and what was and was not checked." },
c ? statStrip([c.performed, c.matched, c.unmatched, c.contradicted].filter(Boolean).map((f) => stat({ label: f.label, value: figure(f, r.currency), tone: f.id === "checks.contradicted" && f.value ? "warn" : null }))) : null,
r.scope ? h("details", { class: "dl-fold" }, h("summary", null, `Checked ${r.scope.checked?.length ?? 0}, not checked ${r.scope.notChecked?.length ?? 0}`),
h("dl", { class: "cn-kv" }, [...(r.scope.checked ?? []), ...(r.scope.notChecked ?? [])].map((x) => h("div", null, h("dt", null, x.title), h("dd", null, x.text)))),
) : null,
r.disclaimer ? h("p", { class: "cn-label" }, sentence(r.disclaimer, r.currency)) : null,
);
}

function noRevenue(hist, bookings) {
const rated = (hist?.accounts ?? []).some((a) => a.ratings?.length);
const delivered = bookings.some((b) => DELIVERED.includes(b.state) && b.works?.length);
return h("div", { class: "rc" },
emptyState("earn", "No revenue read yet.", [["Connect a source", "/orbe-site/demo/app/settings/connections", true]],
"Your record starts once Orbe reads money from a source you connect, such as Stripe or AdSense. Until then there is nothing to check or share."),
rated ? ratingsSection(hist) : null,
delivered ? deliveriesSection(bookings) : null,
);
}
function recordTab(el, goShare) {
el.replaceChildren(skeleton(6));
return block(
el,
() => Promise.all([api.get("/v1/me/record"), api.get("/v1/me/history").catch(() => null), api.get("/v1/me/sponsorships/bookings").catch(() => ({ bookings: [] }))]),
([{ report: r }, hist, { bookings }]) => !(r.revenue?.ttm?.total?.value > 0) ? noRevenue(hist, bookings ?? []) : h("div", { class: "rc" },
hero(r, goShare),
headline(r),
h("div", { class: "rc-cols" }, revenueSection(r), ratingsSection(hist)),
deliveriesSection(bookings ?? []),
r.keyPoints?.length ? section({ title: "What a buyer will ask about", line: "Answer these before a buyer relies on the figures." }, keyPoints(r)) : null,
checksSection(r),
),
);
}

function shareTab(el) {
el.replaceChildren(skeleton(4));
block(
el,
() => Promise.all([api.get("/v1/me"), api.get("/v1/me/reports")]),
([me, { reports }]) => {
const live = me.consents.some((c) => c.scope === "verified_profile" && !c.revokedAt);
const published = !!me.creator.profilePublishedAt;
const account = [...me.accounts].sort((a, b) => b.audience - a.audience)[0];
const handle = account?.handle?.replace(/^@/, "");
const link = handle ? `${location.origin}/@${encodeURIComponent(handle)}` : null;
const toggle = live || published
? action(published ? "Unpublish" : "Publish my card", async () => {
await api.post("/v1/me/profile", { published: !published });
shareTab(el);
return published ? "Unpublished." : "Published.";
}, { primary: !published, danger: published })
: null;
return h("div", { class: "rc" },
section(
{ title: "Your public card", line: published ? `Published ${day(me.creator.profilePublishedAt)}.` : "Not published. Nothing about you is public until you publish it.", actions: published ? pill("live", "Public") : pill("idle", "Private") },
link && published
? h("div", { class: "rc-link" },
h("code", { class: "rc-link-u" }, link),
h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: async () => { await navigator.clipboard.writeText(link); toast("Copied."); } }, icon("copy"), "Copy"),
h("a", { class: "cn-btn cn-btn--s", href: link, target: "_blank", rel: "noopener" }, icon("external"), "Open"),
)
: null,
!live ? h("p", { class: "cn-label" }, "Publishing needs the public profile consent, under Consents.") : null,
h("p", { class: "cn-label" }, "The card shows while your profile is published and rated. A YouTube channel's rating is public only once YouTube has accepted Orbe's use of derived figures; until then a YouTube card answers not found."),
toggle ? h("div", { class: "cn-dw-actions" }, toggle) : null,
),
section(
{ title: "The record as a file", line: "The whole record with every source, to open, print or keep as Markdown." },
h("div", { class: "cn-dw-actions" }, exportLinks()),
),
section(
{ title: "Reports", line: "A free Orbe Verified report of your record as it stands today, to keep or to show. A buyer sees one only with your consent.", actions: action("Issue a report", async () => {
await api.post("/v1/me/reports", {});
shareTab(el);
return "Report issued.";
}) },
historyList(reports.map((x) => ({ label: x.forBuyer ? "Issued for a buyer" : "Your own copy", summary: x.status, at: x.issuedAt ?? x.createdAt })), "No report issued yet."),
),
);
},
);
}

const EFFECT_WORDS = {
oauthTokens: "connections",
revenueLines: "money lines",
workMetrics: "connected figures",
works: "works",
snapshots: "snapshots",
provenance: "source records",
refreshes: "scheduled reads",
reports: "reports withdrawn",
profileUnpublished: "profile unpublished",
workRatings: "work ratings",
ratings: "ratings",
personalBests: "personal bests",
excluded: "benchmarks left",
contributions: "benchmark contributions",
listings: "listings withdrawn",
introductions: "introductions closed",
};
const removedLine = (r) => {
const parts = Object.entries(r.effects ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${n.toLocaleString("en-GB")} ${EFFECT_WORDS[k] ?? k}`);
return parts.length ? `Revoked. Removed: ${parts.join(", ")}.` : "Revoked. Nothing else was held under it.";
};
const row = (title, tag, lines, acts) =>
h("li", { class: "rc-row" },
h("div", { class: "rc-row-main" }, h("p", { class: "rc-row-t" }, title, " ", tag), ...lines.filter(Boolean).map((l) => h("p", { class: "cn-label" }, l))),
acts ? h("div", { class: "cn-dw-actions" }, acts) : null,
);
const tag = (text, tone) => h("span", { class: `cn-tag${tone ? ` cn-tag--${tone}` : ""}` }, text);
function consentsTab(el) {
const said = h("div", { "aria-live": "polite" });
const draw = () =>
block(el, () => api.get("/v1/me/consents"), ({ consents }) => {
const liveOf = (scope) => consents.find((c) => c.scope === scope && !c.revokedAt);
const shares = consents.filter((c) => c.scope === "share_with_buyer" && !c.revokedAt);
const revoke = (scope, buyerId) => async () => {
const r = await api.del(buyerId ? `/v1/me/consents/${seg(scope)}?buyerId=${seg(buyerId)}` : `/v1/me/consents/${seg(scope)}`);
said.replaceChildren(ok(removedLine(r.revoked)));
draw();
return removedLine(r.revoked);
};
return [
said,
section(
{ title: "Consents", line: "What Orbe may do with your data. Revoking one removes what it held, at once." },
h("ul", { class: "rc-rows" },
GRANTABLE.map((scope) => {
const c = CONSENTS[scope];
const live = liveOf(scope);
return row(c.name, live ? tag(`Given ${day(live.grantedAt)}`, "sky") : tag("Not given"), [c.grants, live ? `Revoking it: ${c.revoking}` : null],
live
? action("Revoke", revoke(scope), { danger: true, confirm: `Revoke "${c.name}"? ${c.revoking}` })
: action("Give consent", async () => {
await api.post("/v1/me/consents", { scope });
draw();
return "Consent given.";
}));
}),
shares.map((s) =>
row(CONSENTS.share_with_buyer.name, tag(`Since ${day(s.grantedAt)}`, "sky"), [CONSENTS.share_with_buyer.grants, `Revoking it: ${CONSENTS.share_with_buyer.revoking}`],
action("Revoke", revoke("share_with_buyer", s.buyerId), { danger: true, confirm: `Stop sharing with this buyer? ${CONSENTS.share_with_buyer.revoking}` })),
),
),
),
section({ title: "Erase your account", cls: "cn-card--danger" }, eraseBox()),
];
});
draw();
}

const ROSTER_STATES = { invited: "Invited", active: "On their roster", declined: "Declined", left: "Left", removed: "Removed by them", withdrawn: "Invite withdrawn" };

function rostersTab(el) {
const said = h("div", { "aria-live": "polite" });
const draw = () =>
block(el, () => api.get("/v1/me/rosters"), ({ rosters }) => [
said,
section(
{ title: "Agencies", line: "An agency or manager who works with you can invite you by email; nothing is shared until you say yes." },
rosters.length
? h("ul", { class: "rc-rows" }, rosters.map((r) =>
row(r.org, tag(ROSTER_STATES[r.state] ?? r.state, r.state === "active" ? "sky" : r.state === "invited" ? "straw" : null), [`Invited ${day(r.invitedAt)}${r.answeredAt ? `, answered ${day(r.answeredAt)}` : ""}.`, r.state === "invited" ? r.notice : null],
r.state === "invited"
? [
form([check("I have read this and want to join.", { name: "seen", required: true })], "Join their roster", async () => {
await api.post(`/v1/me/rosters/${seg(r.id)}/accept`, { noticeShown: true });
draw();
return "Joined.";
}),
action("Decline", async () => {
await api.post(`/v1/me/rosters/${seg(r.id)}/decline`, {});
draw();
return "Declined.";
}),
]
: r.state === "active"
? action("Leave their roster", async () => {
const out = await api.del(`/v1/me/rosters/${seg(r.id)}`);
said.replaceChildren(ok(out.removed.join(" ")));
draw();
return out.removed[0];
}, { danger: true, confirm: `Leave ${r.org}'s roster? They stop seeing your figures at once.` })
: null),
))
: emptyState("people", "No agency has invited you."),
),
]);
draw();
}
function eraseBox() {
return h(
"details",
{ class: "dl-fold" },
h("summary", null, "Erase your account"),
h("p", { class: "cn-label" }, "Deletes your account and everything Orbe holds about you. It cannot be undone."),
form([field('Type "delete my account" to confirm', input({ name: "confirm", required: true, autocomplete: "off", pattern: "delete my account" }))], "Erase everything", async (d) => {
await api.del("/v1/me", { confirm: String(d.get("confirm")) });
window.location.assign("/orbe-site/demo/app/");
return "Erased.";
}, { primary: false }),
);
}
async function render(main, ctx) {
const body = screenHead(main, "record", { title: "Record", line: "What Orbe read at source, what it checked, and who may see it: proof to share with a brand or a buyer.", tags: [["Read at source", "sky"], ["Yours to share"]] });
const goShare = () => document.getElementById("tab-record-share")?.click();
body.append(
tabs("record", [
{ id: "record", label: "Record", render: (el) => recordTab(el, goShare) },
{ id: "share", label: "Share", render: shareTab },
{ id: "consents", label: "Consents", render: consentsTab },
on("brand_data") ? { id: "agencies", label: "Agencies", render: rostersTab } : null,
].filter(Boolean), ctx.query.get("tab")),
);
}
});
