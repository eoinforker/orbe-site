/*
  Diligence report: the report a buyer reads first. Run issues a free Orbe
  Verified report of the record as it stands (POST /v1/me/reports); the
  result is the record's verdict and what a buyer will ask about, with the
  whole record to open; history is every report issued.
*/
import { api, apiHref } from "../api.js";
import { TOOLS, tile } from "../catalogue.js";
import { historyList, toolPage } from "../console-ui.js";
import { icon } from "../icons.js";
import { action, actions, block, h } from "../ui.js";
import { sentence } from "./record.js";

const TOOL = TOOLS.find((t) => t.id === "report");

export async function render(main, ctx, opts = {}) {
  const out = h("div", { class: "cn-result-body" });
  const hist = h("div");
  let page = null;
  const load = () =>
    Promise.all([
      block(out, () => api.get("/v1/me/record"), ({ report: r }) => {
        page.status("done", "Ready", r.verdict);
        return [
          h("p", { class: "cn-verdict" }, r.verdict.label),
          h("p", null, sentence(r.verdict.summary, r.currency)),
          r.keyPoints?.length ? h("ul", { class: "ap-points" }, r.keyPoints.map((k) => h("li", { class: `ap-point ap-point--${k.tone}` }, h("span", { class: "ap-cue" }, k.tone === "concern" ? `Concern, ${k.severity}` : k.tone), h("p", null, sentence(k.text, r.currency))))) : null,
          h("div", { class: "cn-dw-actions" },
            h("a", { class: "cn-btn cn-btn--s", href: apiHref("/v1/me/record?format=html"), target: "_blank", rel: "noopener" }, icon("external"), "Open the full record"),
            h("a", { class: "cn-btn cn-btn--s", href: apiHref("/v1/me/record?format=markdown"), target: "_blank", rel: "noopener" }, icon("doc"), "As Markdown"),
          ),
        ];
      }),
      block(hist, () => api.get("/v1/me/reports"), ({ reports }) =>
        historyList(reports.map((x) => ({ label: x.forBuyer ? "Issued for a buyer" : "Your own copy", summary: x.status, at: x.issuedAt ?? x.createdAt })), "No report issued yet."),
      ),
    ]);
  page = toolPage({
    tool: tile(TOOL.glyph, TOOL.k, h, "l"),
    title: "Diligence report",
    line: "The report a buyer reads first: your verified record, what a buyer will ask about, and where every figure came from.",
    tags: [["Live", "sky"], ["Free for creators"], ["Orbe Verified", "line"]],
    api: TOOL.api,
    inputs: h("div", { class: "cn-result-body" },
      h("p", null, "Issue a free Orbe Verified report of your record as it stands today, to keep or to show."),
      h("p", { class: "cn-label" }, "A buyer sees a report only with your consent."),
      actions(action("Run", async () => {
        page.status("running", "Running");
        await api.post("/v1/me/reports", {});
        await load();
        return "Report issued.";
      }, { primary: true })),
    ),
    results: out,
    history: hist,
    historyNote: "Every report issued",
  });
  // Inside Selling, the screen's own head already names it: only the workspace shows.
  if (opts.embedded) for (const el of page.node.querySelectorAll(":scope > .cn-tp-head, :scope > .cn-tp-line, :scope > .cn-tags, :scope > .cn-tp-tabs")) el.remove();
  main.append(page.node);
  await load();
}
