/*
  Plan: Creator Pro (its price always labelled provisional), predictions
  sealed before a work goes out and checked openly afterwards, and the
  rating's history.
*/
import { api, on, seg } from "../api.js";
import { action, actions, block, chip, count, day, empty, failure, field, form, h, input, ok, panel, pct, plural, select, signed, title, when } from "../ui.js";
import { screenHead } from "../console-ui.js";

const HORIZONS = ["1h", "1d", "7d", "30d"];

export function planBox(el) {
  block(el, () => api.get("/v1/me/plan"), ({ plan: p }) => {
    const said = h("div", { "aria-live": "polite" });
    const e = p.entitlements;
    const pro = p.plan === "pro";
    return [
      h("p", null, chip(pro ? "Creator Pro" : "Free", pro ? "good" : undefined), p.status && !pro ? ` ${p.status}` : ""),
      h("ul", { class: "ap-plain" },
        h("li", null, e.predictionsPerMonth === null ? "Unlimited sealed predictions." : `${plural(e.predictionsPerMonth, "sealed prediction")} a month; ${p.usage.predictionsLeft} left until ${day(p.usage.resetsAt)}.`),
        h("li", null, e.historyDays === null ? "Your whole rating history, as long as Orbe keeps it." : `Rating history for the last ${plural(e.historyDays, "day")}.`),
        h("li", null, e.refresh === "daily" ? "Your accounts read daily." : "Your accounts read on the standard schedule."),
      ),
      h("p", { class: "ap-notice" }, `Creator Pro: ${p.price.label}`),
      pro
        ? [
            p.cancelAt ? h("p", null, `Ends ${day(p.cancelAt)}; it will not renew.`) : p.currentPeriodEnd ? h("p", { class: "ap-note" }, `Renews ${day(p.currentPeriodEnd)}.`) : null,
            p.cancelAt ? null : actions(action("Cancel Creator Pro", async () => {
              const r = await api.post("/v1/me/plan/cancel", {});
              said.replaceChildren(ok(r.note));
              return r.note;
            }, { danger: true, confirm: "Cancel Creator Pro? You keep it to the end of the month you paid for." })),
          ]
        : p.checkoutUrl
          ? h("p", null, h("a", { class: "ob-lnk ob-lnk--s", href: p.checkoutUrl, rel: "noopener" }, "Finish paying for Creator Pro"))
          : actions(action("Start Creator Pro", async () => {
              try {
                const r = await api.post("/v1/me/plan/checkout", {});
                window.location.assign(r.checkout.url);
              } catch (err) {
                if (err.status === 503) {
                  said.replaceChildren(h("p", { class: "ap-notice" }, err.message));
                  return err.message;
                }
                throw err;
              }
            }, { primary: true })),
      !p.available && !pro ? h("p", { class: "ap-note" }, "Creator Pro is not open yet. Everything free keeps working.") : null,
      said,
    ];
  });
}

function predictionItem(p) {
  const pr = p.prediction;
  const o = p.outcome;
  const last = o ? HORIZONS.filter((k) => o.readings?.[k]).at(-1) : null;
  const reading = last ? o.readings[last] : null;
  const where = reading && pr ? (reading.value < pr.range.p25 ? ["Under the range", "warn"] : reading.value > pr.range.p75 ? ["Above the range", "good"] : ["Inside the range", "good"]) : null;
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, `Prediction ${p.seq}`, " ", where ? chip(where[0], where[1]) : chip(o?.done ? "Checked" : "Waiting")),
      pr ? h("p", null, `Expected ${count(pr.range.p25)} to ${count(pr.range.p75)} ${pr.metric} by ${pr.horizonDays} days.`) : h("p", { class: "ap-note" }, "The figures are withheld under the retention rules; the seal still stands."),
      reading ? h("p", null, `At ${last}: ${count(reading.value)}.`) : null,
      o?.workId ? h("p", null, h("a", { href: `/orbe-site/demo/app/works/${seg(o.workId)}` }, "Open the work")) : null,
      o?.note ? h("p", { class: "ap-note" }, o.note) : null,
      h("p", { class: "ap-note" }, `Sealed ${when(p.madeAt)}${p.releaseAt ? ` for release ${when(p.releaseAt)}` : ""}. Seal `, h("code", { class: "ap-code" }, p.seal.slice(0, 12))),
    ),
  );
}

function linkForm(preds, uploads, reload) {
  const open = preds.filter((p) => !p.outcome?.workId);
  if (!open.length || !uploads.length) return null;
  return h("details", { class: "ap-more" }, h("summary", null, "Link a planned prediction to the work it became"),
    form(
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
    ),
  );
}

function predictionsBox(el) {
  const reload = () =>
    block(el, async () => {
      const [list, me, fixes] = await Promise.all([api.get("/v1/me/predictions"), api.get("/v1/me"), on("fix") ? api.get("/v1/me/fixes").catch(() => ({ channels: [] })) : { channels: [] }]);
      return { list, accounts: me.accounts, uploads: fixes.channels.flatMap((c) => c.uploads) };
    }, ({ list, accounts, uploads }) => {
      const checks = h("div", { class: "ap-stack", "aria-live": "polite" });
      const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 16);
      return [
        h("p", { class: "ap-notice" }, list.notice),
        h("p", { class: "ap-note" }, list.plan.predictionsLeft === null ? "Unlimited this month." : `${list.plan.predictionsLeft} left this month.`),
        accounts.length
          ? h("details", { class: "ap-more" }, h("summary", null, "Seal a prediction for your next work"),
              form(
                [
                  field("Account", select(accounts.map((a) => [a.id, `${a.handle || a.title} (${a.kind})`]), { name: "accountId" })),
                  field("Going out", input({ name: "releaseAt", type: "datetime-local", required: true, value: tomorrow }), "In your own time zone. The seal proves the prediction came first."),
                  field("Length in minutes", input({ name: "minutes", type: "number", min: "0", max: "2880", step: "1", required: true, value: "12" }), "Under a minute counts as a Short."),
                ],
                "Seal it",
                async (d) => {
                  await api.post("/v1/me/predictions", { accountId: String(d.get("accountId")), releaseAt: new Date(String(d.get("releaseAt"))).toISOString(), durationSec: Math.round(Number(d.get("minutes")) * 60) });
                  reload();
                  return "Sealed.";
                },
              ),
            )
          : null,
        list.predictions.length ? h("ul", { class: "ap-list" }, [...list.predictions].reverse().map(predictionItem)) : empty("No predictions yet."),
        linkForm(list.predictions, uploads, reload),
        h("div", { class: "ap-bar" },
          on("predictions_publishing") ? h("p", null, list.published ? "Shown on your public profile." : "Not shown on your public profile.") : null,
          actions(
            on("predictions_publishing")
              ? action(list.published ? "Stop showing them" : "Show them on my profile", async () => {
                  await api.post("/v1/me/predictions/publish", { published: !list.published });
                  reload();
                  return "Saved.";
                })
              : null,
            action("Check the seals", async () => {
              const { verification: v } = await api.get("/v1/me/predictions/verify");
              checks.replaceChildren(v.ok ? ok(`All ${plural(v.count, "seal")} check out${v.withheld ? `, ${v.withheld} with figures withheld` : ""}.`) : failure({ message: `${plural(v.problems.length, "problem")}: ${v.problems.map((x) => `prediction ${x.seq} ${x.problem.replaceAll("_", " ")}`).join("; ")}.` }));
              return v.ok ? "The seals check out." : "Problems found.";
            }),
            action("How well they held", async () => {
              const { calibration: c } = await api.get("/v1/me/predictions/calibration");
              checks.replaceChildren(
                c.mine.stats
                  ? h("p", null, `Of ${plural(c.mine.n, "checked prediction")}, ${pct(c.mine.stats.inside)} landed inside the range (a fair range holds about ${pct(c.expectedInside)}), ${pct(c.mine.stats.above)} above and ${pct(c.mine.stats.below)} below.`)
                  : h("p", { class: "ap-note" }, `Too few checked predictions to judge yet: it takes ${c.minCohort}.`),
              );
              return "Calibration shown.";
            }),
          ),
        ),
        checks,
      ];
    });
  reload();
}

function historyBox(el) {
  block(el, () => api.get("/v1/me/history"), (r) => [
    h("p", { class: "ap-note" }, r.historyDays === null ? "All the history Orbe keeps." : `The last ${plural(r.historyDays, "day")}. Creator Pro shows all Orbe keeps.`),
    r.accounts.map((a) =>
      h("div", { class: "ap-stack" },
        h("p", { class: "ap-says" }, a.handle || a.kind),
        a.ratings.length
          ? h("ul", { class: "ap-plain" }, a.ratings.slice(-8).reverse().map((x) => h("li", null, `${day(x.computedAt)}: ${signed(x.rating)}, ${x.band}`)))
          : h("p", { class: "ap-note" }, "No ratings kept in this window."),
      ),
    ),
    h("p", { class: "ap-label" }, `${r.label}. ${r.kept}`),
  ]);
}

export async function render(main) {
  const plan = h("div", { class: "ap-stack" });
  const preds = h("div", { class: "ap-stack" });
  const hist = h("div", { class: "ap-stack" });
  screenHead(main, "plan", { line: "Seal a forecast before a work goes out; it is checked openly after. Your rating over time sits beside it.", tags: [["Sealed and chained"]] }).append(
    h("div", { class: "ap-stack" }, panel("Predictions", preds), on("rating") ? panel("Rating history", hist) : null),
  );
  predictionsBox(preds);
  if (on("rating")) historyBox(hist);
}
