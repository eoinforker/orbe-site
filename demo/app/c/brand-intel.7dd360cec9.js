__o.d("js/brand/intel.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render, marketSnapshot: () => marketSnapshot });
const { api, apiHref, can, seg } = __o.r("js/api.js");
const { emptyState, drawer, section, segmented, skeleton, stat, statStrip } = __o.r("js/console-ui.js");
const { screenHead } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { block, count, day, field, form, h, input, money, pct, plural, toast } = __o.r("js/ui.js");
const { SIZE_WORDS } = __o.r("js/terms.js");

const ROLE = { you: ["You", "sky"], competitor: ["Competitor", "line"], category: ["Your category", "line"] };
const FORM = { youtube: "YouTube", podcast: "Podcasts", newsletter: "Newsletters", twitch: "Twitch", tiktok: "TikTok", instagram: "Instagram" };
const BAND = SIZE_WORDS;
const WINDOWS = [["30", "30 days"], ["90", "90 days"], ["180", "6 months"], ["365", "A year"]];
const tag = (role) => h("span", { class: `cn-tag cn-tag--${ROLE[role][1]}` }, ROLE[role][0]);
const bar = (p) => {
const b = h("span", { class: "cn-part-bar" }, h("span"));
b.firstChild.style.setProperty("--p", String(Math.round(p * 1000) / 10));
return b;
};
function disclosureWords(d) {
const all = d.labelled + d.unclear + d.noneSeen;
if (!all) return "No reads to judge.";
if (d.labelled === all) return "Every read clearly labelled as an ad.";
return `Clearly labelled in ${d.labelled} of ${all}${d.unclear ? `, unclearly in ${d.unclear}` : ""}. Orbe cannot see a spoken label.`;
}

function breakdown(title, counts, words = (k) => k) {
const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
const total = entries.reduce((n, [, v]) => n + v, 0) || 1;
return h("div", { class: "bi-break" },
h("p", { class: "bi-h" }, title),
h("ul", { class: "cn-parts" }, entries.map(([k, v]) => h("li", { class: "cn-part" }, h("span", { class: "cn-part-n" }, words(k)), bar(v / total), h("span", { class: "cn-part-v" }, count(v))))),
);
}

function openSponsor(s, days) {
drawer(s.name, async () => {
const ev = await api.get(`/v1/brand/intel/evidence?sponsor=${seg(s.key)}&days=${days}`);
return [
h("div", { class: "bi-dw-head" }, tag(s.role), s.newEntrant ? h("span", { class: "cn-tag cn-tag--line" }, "New this month") : null),
h("dl", { class: "cn-kv bi-kv" },
...[
["Sponsored works", count(s.works)],
["Creators", count(s.creators)],
["Share of voice", pct(s.shareOfVoice)],
["A month", s.perMonth.toLocaleString("en-GB")],
["Came back", s.repeatRate === null ? "One creator so far" : `${pct(s.repeatRate)} of creators`],
["First seen", day(s.firstSeen)],
["Last seen", day(s.lastSeen)],
["Verified by Orbe", s.verified.reads ? `${count(s.verified.reads)} reads, ${count(s.verified.metGuarantee)} met their guarantee` : "None through Orbe yet"],
["Price", s.settled ? `${money(s.settled.low)} to ${money(s.settled.high)}, from ${plural(s.settled.count, "booking")} Orbe settled` : "Not shown: Orbe has not settled enough bookings with them"],
].flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)]),
),
h("p", { class: "cn-brand-line" }, disclosureWords(s.disclosure)),
h("div", { class: "bi-breaks" }, breakdown("By form", s.byForm, (k) => FORM[k] ?? k), breakdown("By size", s.byBand, (k) => BAND[k] ?? k), breakdown("Creators' genres", s.byGenre, (k) => k.charAt(0).toUpperCase() + k.slice(1)), breakdown("Placement", s.byPlacement)),
h("p", { class: "bi-h" }, "Creators"),
h("ul", { class: "bi-creators" }, s.creatorsSeen.map((c) => h("li", null, h("span", { class: c.named ? "bi-named" : "bi-anon" }, c.label), h("span", { class: "bi-num" }, `${plural(c.works, "work")}, last ${day(c.lastSeen)}`)))),
h("p", { class: "bi-h" }, `Where it was seen (${ev.evidence.length})`),
h("ul", { class: "cn-evidence" },
ev.evidence.map((e) =>
h("li", null,
h("p", { class: "cn-evidence-t" }, `${day(e.date)}, ${e.placement.toLowerCase()}, ${e.creator}`),
e.seen ? h("p", { class: "cn-evidence-q" }, `“${e.seen}”`) : null,
e.url ? h("a", { href: e.url, target: "_blank", rel: "noopener" }, "Open the public work", icon("external")) : null,
),
),
),
];
}, { wide: true });
}

function settingsDrawer(settings, onSaved) {
drawer("Your market", (close) => {
const list = h("ul", { class: "bi-chips" });
const names = [...settings.competitors];
const draw = () =>
list.replaceChildren(...names.map((n, i) => h("li", { class: "bi-chip" }, h("span", null, n), h("button", { class: "cn-iconbtn", type: "button", "aria-label": `Remove ${n}`, onclick: () => (names.splice(i, 1), draw()) }, icon("close")))));
draw();
const add = input({ name: "competitor", maxlength: 120, placeholder: "A brand you compete with", autocomplete: "off" });
add.addEventListener("keydown", (e) => {
if (e.key !== "Enter") return;
e.preventDefault();
const v = add.value.trim();
if (v && names.length < 20 && !names.some((x) => x.toLowerCase() === v.toLowerCase())) names.push(v);
add.value = "";
draw();
});
return form(
[
field("What you sell", input({ name: "category", maxlength: 40, value: settings.category ?? "", placeholder: "Breakfast foods" }), "Brands on Orbe that sell the same thing make up your category."),
field("Competitors", add, "Press Enter to add each. Any brand seen in public works can be followed, on Orbe or not."),
list,
],
"Save",
async (d) => {
const r = await api.put("/v1/brand/intel/settings", { category: String(d.get("category") ?? "").trim(), competitors: names });
close();
onSaved(r.settings);
toast("Your market is saved.");
},
);
});
}

function watchlists(el, intel) {
const load = () =>
block(el, () => api.get("/v1/brand/watchlists"), ({ watchlists: ws }) => [
ws.length
? h("ul", { class: "bi-watch" },
ws.map((w) =>
h("li", { class: "bi-watch-item" },
h("div", { class: "bi-watch-main" },
h("p", { class: "cn-brand-name" }, w.name),
h("p", { class: "cn-brand-line" }, w.sponsors.join(", ")),
h("p", { class: "cn-brand-line cn-brand-line--quiet" },
w.thisWeek.length ? w.thisWeek.map((n) => `${n.sponsor}: ${plural(n.works, "new work")}`).join("; ") + "." : "Nothing new this week.",
w.alerts ? " Weekly email on." : " Emails off."),
),
can("business")
? h("div", { class: "ap-actions" },
h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: async () => (await api.put(`/v1/brand/watchlists/${seg(w.id)}`, { name: w.name, sponsors: w.sponsors, alerts: !w.alerts }), toast(w.alerts ? "Emails off for this watchlist." : "Weekly emails on."), load()) }, w.alerts ? "Turn emails off" : "Turn emails on"),
h("button", { class: "cn-btn cn-btn--xs cn-btn--ghost", type: "button", onclick: async () => (await api.del(`/v1/brand/watchlists/${seg(w.id)}`), toast("Watchlist removed."), load()) }, "Remove"),
)
: null,
),
))
: emptyState("bell", "No watchlists yet.", [], "Follow a few sponsors and Orbe emails you once a week when they show up in new public works."),
can("business")
? h("details", { class: "ap-more" }, h("summary", null, "New watchlist"),
form(
[
field("Name", input({ name: "name", required: true, maxlength: 80, placeholder: "Granola rivals" })),
field("Sponsors", input({ name: "sponsors", required: true, maxlength: 2000, value: intel.settings.competitors.join(", ") }), "Separated by commas."),
],
"Save and email me weekly",
async (d) => {
const sponsors = String(d.get("sponsors")).split(",").map((x) => x.trim()).filter(Boolean);
await api.post("/v1/brand/watchlists", { name: String(d.get("name")).trim(), sponsors });
load();
return "Saved. The first email comes within a week, only if something is new.";
},
))
: null,
]);
load();
}

function shareOfVoice(sponsors, days, max = 10) {
return h("ul", { class: "bi-sov" },
sponsors.slice(0, max).map((s) =>
h("li", null,
h("button", { class: "bi-sov-row", type: "button", onclick: () => openSponsor(s, days) },
h("span", { class: "bi-sov-name" }, s.name, tag(s.role)),
bar(s.shareOfVoice),
h("span", { class: "bi-num" }, pct(s.shareOfVoice)),
),
),
),
);
}
function competitorTable(rows, days) {
return h("div", { class: "bi-tablewrap" },
h("table", { class: "cn-table bi-table" },
h("thead", null, h("tr", null, ["Sponsor", "Works", "Creators", "A month", "Came back", "Where", "Last seen", ""].map((t, i) => h("th", { scope: "col", class: i >= 1 && i <= 4 || i === 6 ? "bi-num" : null }, t)))),
h("tbody", null,
rows.map((s) =>
h("tr", null,
h("th", { scope: "row" }, h("span", { class: "bi-rowname" }, s.name), " ", s.newEntrant ? h("span", { class: "cn-tag cn-tag--line" }, "New") : null),
h("td", { class: "bi-num", "data-label": "Works" }, count(s.works)),
h("td", { class: "bi-num", "data-label": "Creators" }, count(s.creators)),
h("td", { class: "bi-num", "data-label": "A month" }, s.perMonth.toLocaleString("en-GB")),
h("td", { class: "bi-num", "data-label": "Came back" }, s.repeatRate === null ? "None yet" : pct(s.repeatRate)),
h("td", { "data-label": "Where" }, Object.keys(s.byForm).map((f) => FORM[f] ?? f).join(", ")),
h("td", { class: "bi-num", "data-label": "Last seen" }, day(s.lastSeen)),
h("td", { class: "bi-go" }, h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: () => openSponsor(s, days) }, "Evidence")),
),
),
),
),
);
}
function market(el, intel, days, openSettings) {
const comp = intel.sponsors.filter((s) => s.role === "competitor");
const cat = intel.sponsors.filter((s) => s.role === "category");
if (!intel.sponsors.length)
return el.replaceChildren(
emptyState("chart", intel.settings.competitors.length || intel.settings.category ? "Nothing seen in your market in this window yet." : "Tell Orbe who you compete with.", can("business") ? [["Set up your market", openSettings, true]] : [], "Orbe reads public videos, show notes and newsletters for sponsorships. Name your competitors and say what you sell."),
);
el.replaceChildren(
statStrip([
stat({ label: "Sponsored works", value: count(intel.totals.works), line: `In your market, ${day(intel.window.from)} to today.` }),
stat({ label: "Sponsors", value: count(intel.totals.sponsors), line: `${plural(comp.length, "competitor")}, ${plural(cat.length, "brand")} in your category.` }),
stat({ label: "Creators", value: count(intel.totals.creators), line: "Who ran a read for your market." }),
stat({ label: "New entrants", value: count(intel.newEntrants.length), line: intel.newEntrants.length ? intel.newEntrants.slice(0, 3).join(", ") : "No one new in 30 days." }),
]),
h("div", { class: "bi-grid" },
section({ title: "Share of voice", line: "Sponsored works in your market, by sponsor. Open one for its evidence." }, shareOfVoice(intel.sponsors, days)),
section({ title: "Your competitors", line: comp.length ? "Who they sponsor, how often, and whether creators come back." : "None of your competitors seen in this window." },
comp.length ? competitorTable(comp, days) : null,
intel.unseen.length ? h("p", { class: "cn-label" }, `Not seen yet: ${intel.unseen.join(", ")}.`) : null,
),
),
cat.length ? section({ title: "Your category", line: "Brands on Orbe that sell what you sell." }, competitorTable(cat, days)) : null,
h("details", { class: "ap-more bi-notes" }, h("summary", null, "How Orbe counts this"),
h("ul", { class: "cn-points" }, [...intel.notes, intel.notice].map((n) => h("li", null, n))),
intel.withheld.youtube ? h("p", { class: "cn-label" }, `${count(intel.withheld.youtube)} YouTube reads withheld. ${intel.withheld.reason}`) : null,
),
h("p", { class: "cn-label" }, intel.label),
);
}
async function render(main) {
const work = screenHead(main, "intel", {
line: "Who sponsors in your category, which creators your competitors back, and how it delivered, from public works.",
tags: [["Every figure has its evidence", "sky"], [`Provisional: £249 a month`, "line"]],
});
let days = "90";
let intel = null;
const body = h("div", { class: "bi-body" }, skeleton(6));
const lists = h("div");
const openSettings = () => settingsDrawer(intel?.settings ?? { category: null, competitors: [] }, () => load());
const csv = h("a", { class: "cn-btn cn-btn--s", href: apiHref(`/v1/brand/intel?format=csv&days=${days}`), download: "" }, icon("doc"), "Export CSV");
const bar = h("div", { class: "bi-bar" },
segmented("Window", WINDOWS, days, (v) => ((days = v), (csv.href = apiHref(`/v1/brand/intel?format=csv&days=${days}`)), load())),
h("div", { class: "bi-bar-end" }, csv, can("business") ? h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: openSettings }, icon("sliders"), "Your market") : null),
);
work.append(bar, body, section({ title: "Watchlists", line: "Sponsors you follow, with a weekly email when they appear in new public works." }, lists));
async function load() {
await block(body, () => api.get(`/v1/brand/intel?days=${days}`), (r) => {
intel = r.intel;
const el = h("div", { class: "bi-market" });
market(el, intel, days, openSettings);
return el;
});
}
await load();
if (intel) watchlists(lists, intel);
}

async function marketSnapshot() {
const { intel } = await api.get("/v1/brand/intel?days=90");
const named = intel.settings.competitors.length || intel.settings.category;
if (!intel.sponsors.length)
return section({ title: "Your market", line: "Who sponsors in your category, from public works." },
emptyState("chart", named ? "Nothing seen in your market in 90 days yet." : "Tell Orbe who you compete with.", [["Open intelligence", "/orbe-site/demo/app/intelligence", true]], "Orbe follows their sponsorships across YouTube, podcasts and newsletters."));
return section(
{ title: "Your market this quarter", line: `${plural(intel.totals.works, "sponsored work")} across ${plural(intel.totals.creators, "creator")}.`, actions: h("a", { class: "cn-btn cn-btn--xs", href: "/orbe-site/demo/app/intelligence" }, "Open intelligence") },
h("div", { class: "bi-snap" },
shareOfVoice(intel.sponsors, "90", 5),
h("div", { class: "bi-snap-side" },
h("p", { class: "bi-h" }, "New in the last 30 days"),
intel.newEntrants.length ? h("ul", { class: "bi-chips" }, intel.newEntrants.slice(0, 6).map((n) => h("li", { class: "bi-chip" }, h("span", null, n)))) : h("p", { class: "cn-brand-line" }, "No one new."),
),
),
);
}
});
