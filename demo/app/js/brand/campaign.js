/*
  One campaign: its brief and state, matches with a quote and the guaranteed
  floor, offers, and the campaign report.
*/
import { api, apiHref, seg } from "../api.js";
import { guaranteeLine, OFFER_STATES, priceLines, TONE, windowLine, withFee } from "../deal.js";
import { formatName, SHORTFALL, TAKE_RATE, unitOf } from "../terms.js";
import { action, actions, block, bps, chip, count, day, empty, field, form, h, input, money, panel, rows, tabs, textarea, title, words } from "../ui.js";
import { screenHead } from "../console-ui.js";
import { CAMPAIGN_TONE } from "./campaigns.js";

const FIT_TONE = { strong: "good", partial: undefined, miss: "warn", unknown: "off" };

/** The guarantee Orbe suggests from a creator's verified history: the lower quartile at the format's last window. */
async function suggestedGuarantee(m) {
  const r = await api.get(`/v1/brand/creators/${seg(m.creatorId)}`);
  const item = r.inventory.items.find((i) => i.accountId === m.accountId && i.format === m.format);
  const windows = [...(item?.stats.windows ?? [])].sort((a, b) => a.day - b.day);
  const last = windows.at(-1);
  return { day: last?.day ?? null, units: last?.p25 ? Math.floor(last.p25) : null, n: last?.n ?? 0, note: last?.note ?? null, unit: item?.stats.unit ?? unitOf(m.format, m.kind) };
}

function quoteBox(m, campaign, onSent) {
  const box = h("div", { class: "ap-stack" });
  block(box, () => suggestedGuarantee(m), (g) => {
    const total = withFee(m.price, TAKE_RATE.networkBps);
    return [
      rows([
        ["Creator's price", money(m.price)],
        [`Orbe's fee (${bps(TAKE_RATE.networkBps)})`, money({ amount: total.amount - m.price.amount, currency: total.currency })],
        ["You pay", money(total)],
        m.expectedUnits ? ["Expected", `${count(m.expectedUnits)} ${g.unit}${m.expectedCpm ? `, ${money(m.expectedCpm)} per 1,000` : ""}`] : null,
      ]),
      g.units
        ? h("p", { class: "ap-guarantee" }, `Guaranteed floor: ${count(g.units)} ${g.unit} at ${g.day} days, what this creator's verified history reaches three times in four. Short by more than ${bps(SHORTFALL.toleranceBps)} means a make-good within ${SHORTFALL.makeGoodDays} days or a refund in proportion; the creator is never paid under ${bps(SHORTFALL.floorBps)} of the price for a disclosed read that stays up.`)
        : h("p", { class: "ap-note" }, `No guarantee to suggest yet: ${g.note ?? "not enough verified readings"}. You can still offer one; the creator decides.`),
      form(
        [
          field("Price for the creator (£)", input({ name: "price", type: "number", min: "0.01", step: "0.01", value: String(m.price.amount / 100), required: true, inputmode: "decimal" }), "Their list price. Orbe's fee is added on top."),
          field(`Guarantee: ${g.unit} at ${g.day ?? 30} days (optional)`, input({ name: "units", type: "number", min: "1", step: "1", value: g.units ? String(g.units) : "" }), "Leave empty for no guarantee."),
          field("A note to the creator (optional)", textarea({ name: "message", maxlength: 2000 })),
        ],
        "Send the offer",
        async (d) => {
          const price = Number(d.get("price"));
          const units = String(d.get("units") ?? "").trim();
          const message = String(d.get("message") ?? "").trim();
          await api.post(`/v1/brand/campaigns/${seg(campaign.id)}/offers`, {
            creatorId: m.creatorId,
            accountId: m.accountId,
            format: m.format,
            ...(Math.round(price * 100) !== m.price.amount ? { price } : {}),
            ...(units ? { guarantee: { day: g.day ?? 30, units: Number(units) } } : {}),
            ...(message ? { message } : {}),
          });
          onSent();
          return "Offer sent. The creator has seven days to answer.";
        },
      ),
    ];
  });
  return box;
}

function matchItem(m, campaign, onSent) {
  const d = h("details", { class: "ap-more" }, h("summary", null, "Quote and offer"));
  d.addEventListener("toggle", () => d.open && d.childElementCount === 1 && d.append(quoteBox(m, campaign, onSent)));
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, m.displayName || "A creator", m.handle ? ` (${m.handle})` : "", " ", chip(`Fit ${m.score} in 100`)),
      m.format ? h("p", { class: "ap-note" }, `${formatName(m.format, m.kind)}${m.price ? `, ${money(m.price)} before Orbe's fee` : ""}`) : null,
      h("ul", { class: "ap-reasons" }, m.reasons.map((r) => h("li", null, chip(words(r.fit), FIT_TONE[r.fit]), " ", r.sentence))),
    ),
    !m.excluded && m.price && m.accountId ? d : null,
  );
}

function matchesTab(el, campaign) {
  block(el, () => api.get(`/v1/brand/campaigns/${seg(campaign.id)}/matches`), ({ matches, shortlist }) => {
    const fit = matches.filter((m) => !m.excluded);
    const out = matches.filter((m) => m.excluded);
    return [
      campaign.state !== "open" ? h("p", { class: "ap-note" }, "Offers can be sent only while the campaign is open.") : null,
      shortlist?.picks?.length ? h("p", { class: "ap-says" }, `Orbe's shortlist: ${shortlist.picks.length} for ${money(shortlist.spend)}, leaving ${money(shortlist.left)} of the budget.`) : null,
      fit.length ? h("ul", { class: "ap-list" }, fit.map((m) => matchItem(m, campaign, () => {
        el.replaceChildren();
        matchesTab(el, campaign);
      }))) : empty("No creator in the network fits this brief yet. Only creators who opted in are ever shown."),
      out.length ? h("details", { class: "ap-more" }, h("summary", null, `Not a fit (${out.length})`), h("ul", { class: "ap-list" }, out.map((m) => matchItem(m, campaign)))) : null,
    ];
  });
}

function offersTab(el, campaign) {
  const reload = () =>
    block(el, () => api.get(`/v1/brand/campaigns/${seg(campaign.id)}/offers`), ({ offers }) =>
      offers.length
        ? h("ul", { class: "ap-list" }, offers.map((o) =>
            h("li", { class: "ap-item ap-item--block" },
              h("div", { class: "ap-item-main" },
                h("p", { class: "ap-says" }, formatName(o.format, o.kind), " ", chip(OFFER_STATES[o.state] ?? o.state, TONE[o.state])),
                rows([...priceLines(o), ["Publish between", windowLine(o.publishWindow)], ["Sent", day(o.sentAt)]]),
                h("p", { class: "ap-guarantee" }, guaranteeLine(o)),
                o.counters?.length ? h("p", null, `The creator countered at ${money(o.counters.at(-1).price)}${o.counters.at(-1).note ? `: "${o.counters.at(-1).note}"` : "."}`) : null,
              ),
              ["sent", "countered"].includes(o.state)
                ? actions(
                    o.state === "countered"
                      ? action(`Accept ${money(withFee(o.counters.at(-1).price, o.fee.bps))} with the fee`, async () => {
                          await api.post(`/v1/brand/offers/${seg(o.id)}/accept-counter`, {});
                          reload();
                          return "Accepted. Fund it under Bookings.";
                        }, { primary: true })
                      : null,
                    action("Withdraw", async () => {
                      await api.post(`/v1/brand/offers/${seg(o.id)}/withdraw`, {});
                      reload();
                      return "Withdrawn.";
                    }, { danger: true, confirm: "Withdraw this offer?" }),
                  )
                : null,
            ),
          ))
        : empty("No offers yet. Send one from Matches."),
    );
  reload();
}

const figureText = (f) => (f.kind === "money" ? money({ amount: f.value, currency: f.currency ?? "GBP" }) : count(f.value));

function reportTab(el, campaign) {
  block(el, () => api.get(`/v1/brand/campaigns/${seg(campaign.id)}/report`), ({ report: r }) => [
    r.lines.length
      ? r.lines.map((l) =>
          panel(
            `${l.creatorName} ${l.handle ? `(${l.handle})` : ""}`.trim(),
            h("p", null, l.formatName, " ", chip(l.state.replaceAll("_", " "), TONE[l.state])),
            l.works.map((w) => h("p", null, w.url ? h("a", { href: w.url, target: "_blank", rel: "noopener" }, w.title) : w.title, `, published ${day(w.publishedAt)}${w.removedAt ? `, taken down ${day(w.removedAt)}` : ""}`)),
            rows([...l.delivery, ...l.money].map((f) => [f.label, figureText(f)])),
            l.guarantee ? h("p", { class: "ap-guarantee" }, `Guaranteed ${count(l.guarantee.units)} ${l.guarantee.unit} at ${l.guarantee.day} days.`) : null,
            l.outcome ? h("p", null, `${l.outcome.reason} The creator receives ${bps(l.outcome.creatorShareBps)} of the price.`) : null,
          ),
        )
      : empty("Nothing delivered yet. Each read appears here, with the source it was read from, once it is live."),
    r.totals.length ? panel("Totals", rows(r.totals.map((f) => [f.label, figureText(f)]))) : null,
    r.effective.length ? panel("What it cost", rows(r.effective.map((e) => [`Verified ${e.unit}`, `${count(e.units)}${e.cpm ? `, ${money(e.cpm)} per 1,000` : ""}`]))) : null,
    r.kpis.length ? panel("Against your goals", h("ul", { class: "ap-plain" }, r.kpis.map((k) => h("li", null, chip(k.status.replaceAll("_", " "), k.status === "met" ? "good" : k.status === "missed" ? "warn" : "off"), " ", k.detail)))) : null,
    r.withheld.length ? h("p", { class: "ap-note" }, `${r.withheld.length} private readings are withheld because the creator is not sharing them with you.`) : null,
    panel("How it is measured", h("ul", { class: "ap-plain" }, r.method.map((m) => h("li", null, m))), h("p", { class: "ap-links" }, h("a", { class: "ob-lnk ob-lnk--s", href: apiHref(`/v1/brand/campaigns/${seg(campaign.id)}/report?format=html`), target: "_blank", rel: "noopener" }, "Open the full report"), " ", h("a", { class: "ob-lnk ob-lnk--s", href: apiHref(`/v1/brand/campaigns/${seg(campaign.id)}/report?format=markdown`), target: "_blank", rel: "noopener" }, "As Markdown"))),
  ]);
}

function stateActions(c, reload) {
  const move = (state, label, opts) => action(label, async () => {
    await api.post(`/v1/brand/campaigns/${seg(c.id)}/state`, { state });
    reload();
    return `Campaign ${state}.`;
  }, opts);
  if (c.state === "draft") return actions(move("open", "Open the campaign", { primary: true }), move("cancelled", "Cancel", { danger: true, confirm: "Cancel this campaign?" }));
  if (c.state === "open") return actions(move("closed", "Close it", { confirm: "Close the campaign? No new offers can be sent; bookings carry on." }), move("cancelled", "Cancel", { danger: true, confirm: "Cancel this campaign?" }));
  return null;
}

export async function render(main, ctx) {
  const body = h("div", { class: "ap-stack" });
  screenHead(main, "campaigns", { title: "Campaign", line: "", back: ["All campaigns", "/orbe-site/demo/app/campaigns"] }).append(body);
  const reload = () =>
    block(body, () => api.get("/v1/brand/campaigns"), ({ campaigns }) => {
      const c = campaigns.find((x) => x.id === ctx.params.id);
      if (!c) return empty("No such campaign.");
      const b = c.brief;
      main.querySelector(".ap-h1").textContent = b.title;
      document.title = `${b.title}: Orbe`;
      return [
        panel(
          "Brief",
          h("p", null, chip(c.state, CAMPAIGN_TONE[c.state])),
          h("p", null, b.product),
          rows([
            ["Budget", `${money(b.budget)}, Orbe's fee included`],
            ["Formats", b.formats.map((f) => formatName(f)).join(", ")],
            ["Publish", windowLine(b.window)],
            ["Where", b.audience.countries.length ? b.audience.countries.join(", ") : "Anywhere"],
            ["Drafts", b.reviewDrafts ? "You review each one" : "No review"],
          ]),
          stateActions(c, reload),
        ),
        tabs("campaign", [
          { id: "matches", label: "Matches", render: (el) => matchesTab(el, c) },
          { id: "offers", label: "Offers", render: (el) => offersTab(el, c) },
          { id: "report", label: "Report", render: (el) => reportTab(el, c) },
        ], ctx.query.get("tab")),
      ];
    });
  await reload();
}
