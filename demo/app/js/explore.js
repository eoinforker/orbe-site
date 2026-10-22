/*
  Explore: every Orbe tool on one page, by what it does, each with its tile,
  a line, whether it is live here, needs a connection first, or is coming,
  and whether it has an API and an MCP twin. A live tool opens in the
  console; a coming one opens its page on the site.
*/
import { api, on } from "./api.js";
import { GROUP_LINES, siteHref, tile, toolsFor } from "./catalogue.js";
import { cover, emptyState, pill } from "./console-ui.js";
import { icon } from "./icons.js";
import { screensFor } from "./routes.js";
import { features } from "./api.js";
import { h } from "./ui.js";

/** Tools that do little until an account is connected. */
const NEEDS_ACCOUNT = new Set(["record", "fix", "sponsorships", "offer", "sell", "report", "plan"]);

export async function render(main, ctx) {
  const tools = toolsFor(ctx.user, screensFor(ctx.user, [...features])).filter((t) => t.status !== "off");
  let connected = true;
  if (ctx.user.type === "creator") connected = await api.get("/v1/me").then((me) => me.accounts.length > 0, () => true);
  const statusOf = (t) => (t.status === "coming" ? ["coming", "Coming"] : !connected && NEEDS_ACCOUNT.has(t.id) ? ["needs", "Connect first"] : ["live", "Live"]);
  const groups = [...new Set(tools.map((t) => t.group))];
  const st = { group: "All", q: "" };
  const grid = h("div");
  const search = h("input", { class: "cn-field-input", type: "search", placeholder: "Search tools", "aria-label": "Search tools", autocomplete: "off" });
  const filters = h("div", { class: "cn-filters", role: "group", "aria-label": "Filter by group" });

  const card = (t) => {
    const [state, text] = statusOf(t);
    const href = t.status === "coming" ? siteHref(t.site ?? "products/") : `/orbe-site/demo/app/${t.path}`;
    return h("a", { class: "cn-toolcard", href, target: t.status === "coming" ? "_blank" : null, rel: t.status === "coming" ? "noopener" : null },
      h("span", { class: "cn-toolcard-art" }, cover(t.id, t.k, 0.55), tile(t.glyph, t.k, h), pill(state, text)),
      h("span", { class: "cn-toolcard-body" },
        h("span", { class: "cn-toolcard-t" }, t.name, icon(t.status === "coming" ? "external" : "arrowRight")),
        h("span", { class: "cn-toolcard-d" }, t.line),
        h("span", { class: "cn-toolcard-foot" },
          h("span", { class: "cn-tag" }, t.group),
          t.api?.method && t.api.method !== "MCP" ? h("span", { class: "cn-tag cn-tag--line" }, "API") : null,
          t.api?.mcp ? h("span", { class: "cn-tag cn-tag--line" }, "MCP") : null,
        ),
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
        h("div", { class: "cn-tools-grid" }, shown.filter((t) => t.group === g).map(card)),
      ]),
    );
  }
  search.addEventListener("input", () => {
    st.q = search.value.trim();
    draw();
  });

  main.append(
    h("header", { class: "cn-pagehead" },
      h("div", null, h("p", { class: "cn-eyebrow" }, `${tools.length} tools`), h("h1", { class: "cn-h1", tabindex: "-1", "data-title": "" }, "Explore"), h("p", { class: "cn-sub" }, ctx.user.type === "creator" ? "Every tool for growing, earning from and protecting your work, each against creators the same size." : "Every tool for booking guaranteed reads and finding creators by their results.")),
      on("rating") && ctx.user.type === "creator" ? h("a", { class: "cn-btn cn-btn--primary", href: "/orbe-site/demo/app/studio" }, icon("studio"), "Run a tool") : null,
    ),
    h("div", { class: "cn-explore-bar" }, h("label", { class: "cn-field" }, icon("search"), search), filters),
    grid,
  );
  draw();
}
