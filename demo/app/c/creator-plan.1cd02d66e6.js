__o.d("js/creator/plan.js", function (__x) {
"use strict";
__o.e(__x, { planBox: () => planBox, render: () => render });
const { api, on, seg } = __o.r("js/api.js");
const { actions, block, count, day, failure, field, form, h, input, ok, pct, plural, select, when } = __o.r("js/ui.js");
const { emptyState, rating, screenHead, section, segmented, sparkline } = __o.r("js/console-ui.js");
const { KINDS } = __o.r("js/terms.js");
const { button, kv, narrow, status, table, twoLine } = __o.r("js/cards.js");

const HORIZONS = ["1h", "1d", "7d", "30d"];
function planBox(el) {
block(el, () => api.get("/v1/me/plan"), ({ plan: p }) => {
const said = h("div", { "aria-live": "polite" });
const e = p.entitlements;
const pro = p.plan === "pro";
return [
kv([
["Plan", status(pro ? "Creator Pro" : "Free", pro ? "good" : undefined)],
["Sealed predictions", e.predictionsPerMonth === null ? "Unlimited" : `${count(e.predictionsPerMonth)} a month; ${p.usage.predictionsLeft} left until ${day(p.usage.resetsAt)}`],
["Rating history", e.historyDays === null ? "All Orbe keeps" : `The last ${plural(e.historyDays, "day")}`],
["Accounts read", e.refresh === "daily" ? "Daily" : "On the standard schedule"],
p.status && !pro ? ["Status", p.status] : null,
]),
h("p", { class: "cn-label" }, `Creator Pro: ${p.price.label}`),
pro
? [
p.cancelAt ? h("p", null, `Ends ${day(p.cancelAt)}; it will not renew.`) : p.currentPeriodEnd ? h("p", null, `Renews ${day(p.currentPeriodEnd)}.`) : null,
p.cancelAt ? null : actions(button("Cancel Creator Pro", async () => {
const r = await api.post("/v1/me/plan/cancel", {});
said.replaceChildren(ok(r.note));
return r.note;
}, { danger: true, confirm: "Cancel Creator Pro? You keep it to the end of the month you paid for." })),
]
: p.checkoutUrl
? h("p", null, h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: p.checkoutUrl, rel: "noopener" }, "Finish paying for Creator Pro"))
: actions(button("Start Creator Pro", async () => {
try {
const r = await api.post("/v1/me/plan/checkout", {});
window.location.assign(r.checkout.url);
} catch (err) {
if (err.status === 503) {
said.replaceChildren(h("p", { class: "cn-label" }, err.message));
return err.message;
}
throw err;
}
}, { primary: true })),
!p.available && !pro ? h("p", { class: "cn-label" }, "Creator Pro is not open yet. Everything free keeps working.") : null,
said,
];
});
}
const HORIZON_WORDS = { "1h": "1 hour", "1d": "1 day", "7d": "7 days", "30d": "30 days" };

function verdict(p) {
const pr = p.prediction;
const o = p.outcome;
const last = o ? HORIZONS.filter((k) => o.readings?.[k]).at(-1) : null;
const reading = last ? o.readings[last] : null;
if (!reading || !pr) return { reading: null, last, pill: status(o?.done ? "Checked" : "Waiting") };
const where = reading.value < pr.range.p25 ? ["Under the range", "warn"] : reading.value > pr.range.p75 ? ["Above the range", "good"] : ["Inside the range", "good"];
return { reading, last, pill: status(...where) };
}
function predictionRow(p) {
const pr = p.prediction;
const o = p.outcome;
const v = verdict(p);
return [
twoLine(`Prediction ${p.seq}`, `Sealed ${when(p.madeAt)}`),
pr ? twoLine(`${count(pr.range.p25)} to ${count(pr.range.p75)}`, `${pr.metric} by ${pr.horizonDays} days`) : h("span", { class: "dl-quiet" }, "Withheld under the retention rules"),
v.reading ? twoLine(count(v.reading.value), `at ${HORIZON_WORDS[v.last] ?? v.last}`) : h("span", { class: "dl-quiet" }, p.releaseAt ? `Out ${day(p.releaseAt)}` : "Not yet"),
v.pill,
o?.workId ? h("a", { href: `/orbe-site/demo/app/works/${seg(o.workId)}` }, "Open the work") : h("code", { class: "cn-code-inline", title: "The seal" }, p.seal.slice(0, 12)),
];
}
function sealCard(accounts, reload) {
const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 16);
return section(
{ title: "Seal a prediction", line: "Before your next work goes out. The seal proves the prediction came first." },
narrow(form(
[
field("Account", select(accounts.map((a) => [a.id, `${a.handle || a.title} (${KINDS[a.kind] ?? a.kind})`]), { name: "accountId" })),
h("div", { class: "ap-pair" },
field("Going out", input({ name: "releaseAt", type: "datetime-local", required: true, value: tomorrow }), "In your own time zone."),
field("Length in minutes", input({ name: "minutes", type: "number", min: "0", max: "2880", step: "1", required: true, value: "12" }), "Under a minute counts as a Short."),
),
],
"Seal it",
async (d) => {
await api.post("/v1/me/predictions", { accountId: String(d.get("accountId")), releaseAt: new Date(String(d.get("releaseAt"))).toISOString(), durationSec: Math.round(Number(d.get("minutes")) * 60) });
reload();
return "Sealed.";
},
)),
);
}
function linkCard(preds, uploads, reload) {
const open = preds.filter((p) => !p.outcome?.workId);
if (!open.length || !uploads.length) return null;
return section(
{ title: "Link a prediction to its work", line: "A prediction sealed for a work you had not published yet is checked once it is linked." },
narrow(form(
[
field("Prediction", select(open.map((p) => [p.id, `Prediction ${p.seq}, sealed ${day(p.madeAt)}`]), { name: "id" })),
field("Work", select(uploads.map((u) => [u.workId, `${u.title} (${day(u.publishedAt)})`]), { name: "workId" })),
],
"Link them",
async (d) => {
await api.post(`/v1/me/predictions/${seg(String(d.get("id")))}/work`, { workId: String(d.get("workId")) });
reload();
return "Linked.";
},
{ primary: false },
)),
);
}
function predictionsBox(el) {
const reload = () =>
block(el, async () => {
const [list, me, fixes] = await Promise.all([api.get("/v1/me/predictions"), api.get("/v1/me"), on("fix") ? api.get("/v1/me/fixes").catch(() => ({ channels: [] })) : { channels: [] }]);
return { list, accounts: me.accounts, uploads: fixes.channels.flatMap((c) => c.uploads) };
}, ({ list, accounts, uploads }) => {
const checks = h("div", { class: "ap-stack", "aria-live": "polite" });
const left = list.plan.predictionsLeft === null ? "Unlimited this month." : `${list.plan.predictionsLeft} left this month.`;
const shown = on("predictions_publishing") ? (list.published ? " Shown on your public profile." : " Not on your public profile.") : "";
const tools = h("div", { class: "cn-card-actions" },
list.predictions.length
? [
button("Check the seals", async () => {
const { verification: v } = await api.get("/v1/me/predictions/verify");
checks.replaceChildren(v.ok ? ok(`All ${plural(v.count, "seal")} check out${v.withheld ? `, ${v.withheld} with figures withheld` : ""}.`) : failure({ message: `${plural(v.problems.length, "problem")}: ${v.problems.map((x) => `prediction ${x.seq} ${x.problem.replaceAll("_", " ")}`).join("; ")}.` }));
return v.ok ? "The seals check out." : "Problems found.";
}, { quiet: true }),
button("How well they held", async () => {
const { calibration: c } = await api.get("/v1/me/predictions/calibration");
checks.replaceChildren(
c.mine.stats
? h("p", null, `Of ${plural(c.mine.n, "checked prediction")}, ${pct(c.mine.stats.inside)} landed inside the range (a fair range holds about ${pct(c.expectedInside)}), ${pct(c.mine.stats.above)} above and ${pct(c.mine.stats.below)} below.`)
: h("p", { class: "cn-label" }, `Too few checked predictions to judge yet: it takes ${c.minCohort}.`),
);
return "Calibration shown.";
}, { quiet: true }),
]
: null,
on("predictions_publishing") && list.predictions.length
? button(list.published ? "Stop showing them" : "Show on my profile", async () => {
await api.post("/v1/me/predictions/publish", { published: !list.published });
reload();
return "Saved.";
})
: null,
);
return [
section(
{ title: "Your predictions", line: `${left}${shown}`, actions: tools },
h("p", null, list.notice),
list.predictions.length
? table([["Prediction"], ["Sealed range"], ["Reading", "num"], ["Where it landed"], [""]], [...list.predictions].reverse().map(predictionRow), { caption: "Your predictions" })
: emptyState("shield", "No predictions yet.", [], accounts.length ? "Seal one below before your next work goes out." : "Connect an account first, then seal a prediction before a work goes out."),
checks,
),
accounts.length ? sealCard(accounts, reload) : null,
linkCard(list.predictions, uploads, reload),
];
});
reload();
}
function historyBox(el) {
block(el, () => api.get("/v1/me/history"), (r) => {
const withRatings = r.accounts.filter((a) => a.ratings.length);
const kept = r.historyDays === null ? "All the history Orbe keeps." : `The last ${plural(r.historyDays, "day")}. Creator Pro shows all Orbe keeps.`;
if (!withRatings.length) return section({ title: "Rating history", line: kept }, emptyState("chart", "No ratings kept in this window.", []), h("p", { class: "cn-label" }, `${r.label}. ${r.kept}`));
const view = h("div", { class: "ap-stack" });
const draw = (id) => {
const a = withRatings.find((x) => x.accountId === id) ?? withRatings[0];
const newest = [...a.ratings].reverse();
view.replaceChildren(
h("div", { class: "cn-hist-spark" }, sparkline(a.ratings.map((x) => x.rating), `${a.handle || a.kind}: rating over ${plural(a.ratings.length, "reading")}`)),
table([["Read"], ["Rating", "num"], ["Band"], ["Size"]], newest.slice(0, 12).map((x) => [day(x.computedAt), rating(x.rating), x.band, x.sizeBand]), { caption: `Rating history, ${a.handle || a.kind}` }),
);
};
draw(withRatings[0].accountId);
return section(
{ title: "Rating history", line: kept },
withRatings.length > 1 ? segmented("Account", withRatings.map((a) => [a.accountId, `${a.handle || a.kind}`]), withRatings[0].accountId, draw, { cls: "cn-seg--scroll" }) : null,
view,
h("p", { class: "cn-label" }, `${r.label}. ${r.kept}`),
);
});
}
async function render(main) {
const preds = h("div", { class: "ap-stack" });
const hist = h("div", { class: "ap-stack" });
screenHead(main, "plan", { line: "Seal a forecast before a work goes out; it is checked openly after. Your rating over time sits beside it.", tags: [["Sealed and chained"]] }).append(
h("div", { class: "ap-stack" }, preds, on("rating") ? hist : null),
);
predictionsBox(preds);
if (on("rating")) historyBox(hist);
}
});
