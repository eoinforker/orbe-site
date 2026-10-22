/*
  Diligence report: the report a buyer reads first. Run issues a free Orbe
  Verified report of the record as it stands (POST /v1/me/reports); the
  result is the record's verdict and what a buyer will ask about, with the
  whole record to open; history is every report issued.
*/
import { api, apiHref } from "../api.js";
import { TOOLS, tile } from "../catalogue.js";
import { historyList, pill, stat, statStrip, toolPage } from "../console-ui.js";
import { action, actions, block, day, h } from "../ui.js";
import { exportLinks, figure, keyPoints, sentence } from "./record.js";

const TOOL = TOOLS.find((t) => t.id === "report");

export async function render(main, ctx, opts = {}) {
  const out = h("div", { class: "cn-result-body rc-report" });
  const hist = h("div");
  let page = null;
  const load = () =>
    Promise.all([
      block(out, () => api.get("/v1/me/record"), ({ report: r }) => {
        page.status("done", "Ready", r.verdict);
        return [
          h("div", { class: "rc-hero-top" }, pill(r.verdict.status === "verified" ? "done" : "needs", r.verdict.label), r.period ? h("span", { class: "cn-tag cn-tag--line" }, `${day(r.period.from)} to ${day(r.period.to)}`) : null),
          h("p", { class: "rc-hero-t" }, sentence(r.verdict.summary, r.currency)),
          r.headline?.length ? statStrip(r.headline.slice(0, 4).map((f) => stat({ label: f.label.replace("@@", "@"), value: figure(f, r.currency) }))) : null,
          keyPoints(r),
          h("div", { class: "cn-dw-actions" }, exportLinks()),
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
