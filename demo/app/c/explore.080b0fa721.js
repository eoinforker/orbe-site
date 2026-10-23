__o.d("js/explore.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, notHere, on } = __o.r("js/api.js");
const { GROUP_LINES, tile, toolsFor } = __o.r("js/catalogue.js");
const { emptyState, pill } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { screensFor } = __o.r("js/routes.js");
const { features } = __o.r("js/api.js");
const { h } = __o.r("js/ui.js");


const NEEDS_ACCOUNT = new Set(["record", "fix", "sponsorships", "offer", "sell", "report", "plan"]);
async function render(main, ctx) {
const all = toolsFor(ctx.user, screensFor(ctx.user, [...features])).filter((t) => t.status !== "off");

const screenOf = (t) => (t.path ?? "").split("?")[0];

const tools = all.filter((t) => !(t.path ?? "").includes("?") || !all.some((x) => x !== t && x.path === screenOf(t))).sort((a, b) => Number(notHere(a)) - Number(notHere(b)));
let connected = true;
if (ctx.user.type === "creator") connected = await api.get("/v1/me").then((me) => me.accounts.length > 0, () => true);
const statusOf = (t) => (t.status === "coming" ? ["coming", "Coming"] : notHere(t) ? ["coming", "Not on this server"] : !connected && NEEDS_ACCOUNT.has(t.id) ? ["needs", "Connect first"] : ["live", "Live"]);
const groups = [...new Set(tools.map((t) => t.group))];
const st = { group: "All", q: "" };
const grid = h("div");
const search = h("input", { class: "cn-field-input", type: "search", placeholder: "Search tools", "aria-label": "Search tools", autocomplete: "off" });
const filters = h("div", { class: "cn-filters", role: "group", "aria-label": "Filter by group" });

const card = (t) => {
const [state, text] = statusOf(t);
const coming = t.status === "coming";
return h(coming ? "div" : "a", { class: `cn-toolrow${coming ? " cn-toolrow--coming" : ""}`, href: coming ? null : `/orbe-site/demo/app/${t.path}` },
tile(t.glyph, t.k, h),
h("span", { class: "cn-toolrow-body" },
h("span", { class: "cn-toolrow-t" }, t.name, state === "live" ? null : pill(state, text)),
h("span", { class: "cn-toolrow-d" }, t.line),
),
h("span", { class: "cn-toolrow-end" },
t.api?.method && t.api.method !== "MCP" ? h("span", { class: "cn-tag cn-tag--line" }, "API") : null,
t.api?.mcp ? h("span", { class: "cn-tag cn-tag--line" }, "MCP") : null,
coming ? null : icon("arrowRight"),
),
);
};
function draw() {
const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
const shown = tools.filter((t) => (st.group === "All" || t.group === st.group) && words.every((w) => `${t.name} ${t.line} ${t.group}`.toLowerCase().includes(w)));
filters.replaceChildren(
...["All", ...groups].map((g) => h("button", { class: "cn-filter", type: "button", "aria-pressed": String(st.group === g), onclick: () => { st.group = g; draw(); } }, g, h("span", { class: "cn-filter-n" }, String(g === "All" ? tools.length : tools.filter((t) => t.group === g).length)))),
);
if (!shown.length) {
grid.replaceChildren(emptyState("search", `No tool matches "${st.q}".`, [["Show every tool", () => { st.q = ""; st.group = "All"; search.value = ""; draw(); }]]));
return;
}
const inGroups = st.group === "All" ? groups.filter((g) => shown.some((t) => t.group === g)) : [st.group];
grid.replaceChildren(
...inGroups.flatMap((g) => [
h("div", { class: "cn-group-h" }, h("h2", null, g), h("p", null, GROUP_LINES[g] ?? "")),
h("div", { class: "cn-toolrows" }, shown.filter((t) => t.group === g).map(card)),
]),
);
}
search.addEventListener("input", () => {
st.q = search.value.trim();
draw();
});
main.append(
h("header", { class: "cn-pagehead cn-pagehead--s" },
h("div", null, h("h1", { class: "cn-h1", tabindex: "-1", "data-title": "" }, "Explore"), h("p", { class: "cn-sub" }, ctx.user.type === "creator" ? "Tools to grow, earn from and protect your work, each against creators your size." : "Every tool for booking guaranteed reads and finding creators by their results.")),
on("rating") && ctx.user.type === "creator" ? h("a", { class: "cn-btn cn-btn--primary", href: "/orbe-site/demo/app/runs" }, icon("studio"), "Run a tool") : null,
),
h("div", { class: "cn-explore-bar" }, h("label", { class: "cn-field" }, icon("search"), search), filters),
grid,
);
draw();
}
});
