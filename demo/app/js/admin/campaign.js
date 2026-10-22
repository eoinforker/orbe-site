/*
  One campaign at the desk, top to bottom in the order it runs: shortlist
  proven shows with their quote, send offers (creators accept in their own
  app), invoice the brand and record its payment, follow delivery at 7 and 30
  days, run settlement, record each payout, and export the summary.
*/
import { api, apiHref, seg } from "../api.js";
import { BOOKING_STATES, TONE } from "../deal.js";
import { action, actions, block, bps, check, chip, count, day, empty, field, form, h, input, money, panel, rows, select, title } from "../ui.js";
import { toolShell } from "../console-ui.js";

const PAYEES = [["creator", "The creator"], ["orbe", "Orbe's fee"], ["brand", "Refund to the brand"]];
const RECEIPTS = [["bank_transfer", "Bank transfer"], ["invoice_paid", "Invoice paid"]];
const gbp = (amount, currency) => money({ amount, currency });

function shortlistBox(el, c, reload) {
  block(el, () => api.get(`/v1/admin/desk/campaigns/${seg(c.id)}/shortlist`), ({ shortlist: s }) => {
    if (!s.picks.length) return empty(`No proven show fits yet.${s.notVerified ? ` ${s.notVerified} opted-in creators have no proven show.` : ""}`);
    return [
      h("p", { class: "ap-note" }, `${s.picks.length} proven shows inside the budget: ${gbp(s.spend.amount, s.spend.currency)} with Orbe's ${bps(s.feeBps)}, ${gbp(s.left.amount, s.left.currency)} left.${s.notVerified ? ` ${s.notVerified} opted-in creators are left out until their show is proven.` : ""}`),
      form(
        [
          h("ul", { class: "ap-list" }, s.picks.map((p) =>
            h("li", { class: "ap-item ap-item--block" },
              check(`${p.show?.title ?? p.handle ?? "Show"}, ${p.displayName}`, { name: "pick", value: `${p.creatorId} ${p.accountId}`, checked: true }),
              p.quote
                ? rows([
                    ["Price", `${money(p.price)}; the brand pays ${money(p.quote.brandPays)}`],
                    ["Guarantee", p.quote.guarantee ? `${count(p.quote.guarantee.units)} ${p.quote.guarantee.unit} at ${p.quote.guarantee.day} days` : "None: too little verified history"],
                    ["At the floor", `Creator ${money(p.quote.atFloor.creatorPayout)}, back to the brand ${money(p.quote.atFloor.brandRefund)}`],
                  ])
                : null,
            ),
          )),
        ],
        "Send offers to the chosen shows",
        async (d) => {
          const picks = d.getAll("pick").map((v) => {
            const [creatorId, accountId] = String(v).split(" ");
            return { creatorId, accountId };
          });
          if (!picks.length) throw new Error("Choose at least one show.");
          const r = await api.post(`/v1/admin/desk/campaigns/${seg(c.id)}/offers`, { picks });
          reload();
          const failed = r.results.filter((x) => !x.ok);
          return `${r.sent} sent.${failed.length ? ` Not sent: ${failed.map((x) => x.message).join(" ")}` : ""}`;
        },
      ),
    ];
  });
}

function invoiceBox(data, reload) {
  const { campaign: c, invoices } = data;
  const said = h("div", { "aria-live": "polite" });
  const waiting = data.summary.rows.filter((r) => r.state === "awaiting_funds").length;
  return [
    invoices.length
      ? h("ul", { class: "ap-list" }, invoices.map(({ invoice: i, bookingIds }) =>
          h("li", { class: "ap-item ap-item--block" },
            h("p", { class: "ap-says" }, i.number, " ", chip(i.status === "paid" ? "Paid" : i.status === "void" ? "Void" : "Due", i.status === "paid" ? "good" : i.status === "void" ? "off" : undefined)),
            h("p", null, `${money(i.gross)} with VAT (${money(i.net)} before VAT), ${bookingIds.length} bookings.`),
            h("p", { class: "ap-links" }, h("a", { class: "ob-lnk ob-lnk--s", href: apiHref(`/v1/admin/desk/invoices/${seg(i.id)}?format=html`), target: "_blank", rel: "noopener" }, "Open the invoice"), " ", h("a", { class: "ob-lnk ob-lnk--s", href: apiHref(`/v1/admin/desk/invoices/${seg(i.id)}?format=markdown`), target: "_blank", rel: "noopener" }, "As Markdown")),
            i.status === "issued"
              ? form([field("Payment reference", input({ name: "reference", required: true, maxlength: 120 }), "As it appears on the bank statement.")], "Record the brand's payment", async (d) => {
                  await api.post(`/v1/admin/desk/invoices/${seg(i.id)}/paid`, { reference: String(d.get("reference")).trim() });
                  reload();
                  return "Recorded. The bookings on it are funded.";
                })
              : null,
          ),
        ))
      : empty("No invoice yet."),
    waiting
      ? actions(action("Invoice the accepted bookings", async () => {
          const r = await api.post(`/v1/admin/desk/campaigns/${seg(c.id)}/invoice`, {});
          said.replaceChildren(h("p", null, `${r.invoice.number} issued.`));
          reload();
          return `${r.invoice.number} issued.`;
        }, { primary: true }))
      : null,
    said,
  ];
}

function bookingItem(r, reload) {
  const owed = r.owedToCreator + r.owedToBrand > 0 || (r.orbeFee !== null && r.state === "verified");
  return h("li", { class: "ap-item ap-item--block" },
    h("p", { class: "ap-says" }, `${r.show}, ${r.creator}`, " ", chip(BOOKING_STATES[r.state] ?? r.state, TONE[r.state])),
    rows([
      ["Price", gbp(r.price, r.currency)],
      ["Brand paid", r.fundedRef ? `${gbp(r.funded, r.currency)}, ref ${r.fundedRef}` : `Not yet (${gbp(r.funded, r.currency)} due)`],
      ["Guarantee", r.guarantee === null ? "None" : count(r.guarantee)],
      ["At 7 days", r.read7 === null ? "Not read yet" : count(r.read7)],
      ["At 30 days", r.read30 === null ? "Not read yet" : count(r.read30)],
      r.shortfall ? ["Short by", count(r.shortfall)] : null,
      r.creatorPayout !== null ? ["Settled", `Creator ${gbp(r.creatorPayout, r.currency)} (${r.creatorSharePct}%), Orbe ${gbp(r.orbeFee, r.currency)}, refund ${gbp(r.brandRefund ?? 0, r.currency)}`] : null,
      r.owedToCreator ? ["Owed to the creator", gbp(r.owedToCreator, r.currency)] : null,
      r.owedToBrand ? ["Owed to the brand", gbp(r.owedToBrand, r.currency)] : null,
    ]),
    r.state === "awaiting_funds"
      ? h("details", { class: "ap-more" }, h("summary", null, "Record the brand's payment for this booking"),
          form([field("How", select(RECEIPTS, { name: "method" })), field("Reference", input({ name: "reference", required: true, maxlength: 120 }))], "Record it", async (d) => {
            await api.post(`/v1/admin/desk/bookings/${seg(r.bookingId)}/funded`, { method: String(d.get("method")), reference: String(d.get("reference")).trim() });
            reload();
            return "Recorded.";
          }, { primary: false }))
      : null,
    owed
      ? h("details", { class: "ap-more" }, h("summary", null, "Record a payout you have made"),
          form([field("To", select(PAYEES, { name: "payee" })), field("Reference", input({ name: "reference", required: true, maxlength: 120 }))], "Record it", async (d) => {
            await api.post(`/v1/admin/desk/bookings/${seg(r.bookingId)}/payouts`, { payee: String(d.get("payee")), reference: String(d.get("reference")).trim() });
            reload();
            return "Recorded.";
          }, { primary: false }))
      : null,
  );
}

function settleBox(c, reload) {
  const said = h("div", { "aria-live": "polite" });
  return [
    h("p", { class: "ap-note" }, "Runs the agreed settlement on every verified booking: the guarantee, pro rata above the floor after a shortfall, and Orbe's fee on what the creator earns. It writes down what is owed; you pay it and record each payment."),
    actions(action("Run settlement", async () => {
      const r = await api.post(`/v1/admin/desk/campaigns/${seg(c.id)}/settle`, {});
      said.replaceChildren(
        h("p", null, `${r.settled.length} settled.`),
        r.waiting.length ? h("ul", { class: "ap-plain" }, r.waiting.map((w) => h("li", null, `${w.bookingId}: ${w.reasons.join(" ")}`))) : null,
      );
      reload();
      return `${r.settled.length} settled.`;
    })),
    said,
  ];
}

function totalsBox(c, s) {
  const t = s.totals;
  const m = (v) => gbp(v, s.currency);
  return [
    rows([
      ["Shows", count(s.shows)],
      ["Guaranteed", count(t.guarantee)],
      ["Delivered", count(t.delivered)],
      ["Short by", count(t.shortfall)],
      ["Creators' prices", m(t.price)],
      ["Brand paid in (before VAT)", m(t.funded)],
      ["To creators", `${m(t.creatorPayout)}; ${m(t.owedToCreator)} still to pay`],
      ["Orbe's fee", m(t.orbeFee)],
      ["Back to the brand", `${m(t.brandRefund)}; ${m(t.owedToBrand)} still to pay`],
    ]),
    h("p", { class: "ap-links" }, h("a", { class: "ob-lnk ob-lnk--s", href: apiHref(`/v1/admin/desk/campaigns/${seg(c.id)}/summary?format=csv`), download: "" }, "Download the CSV for the accountant")),
  ];
}

export async function render(main, ctx) {
  const body = h("div", { class: "ap-stack" });
  toolShell(main, { title: "Desk campaign", back: ["All desk campaigns", "/orbe-site/demo/app/desk"], tags: [["Orbe staff only", "straw"]] }).append(body);
  const reload = () =>
    block(body, () => api.get(`/v1/admin/desk/campaigns/${seg(ctx.params.id)}`), (data) => {
      const { campaign: c, brand, summary: s } = data;
      main.querySelector(".ap-h1").textContent = c.brief.title;
      document.title = `${c.brief.title}: Orbe`;
      const shortlist = h("div");
      const out = [
        panel(
          "Brief",
          h("p", null, `${brand.org}. `, chip(c.state, c.state === "open" ? "good" : "off")),
          rows([
            ["Budget", `${money(c.brief.budget)}, Orbe's fee included`],
            ["Publish", `${day(c.brief.window.start)} to ${day(c.brief.window.end)}`],
            ["Payments", data.payments ?? "None set: SPONSOR_PAYMENTS"],
          ]),
        ),
        c.state === "open"
          ? panel("Shortlist", h("details", { class: "ap-more" }, h("summary", null, "Build the shortlist from proven shows"), shortlist))
          : null,
        panel("Invoice", invoiceBox(data, reload)),
        panel("Bookings", s.rows.length ? h("ul", { class: "ap-list" }, s.rows.map((r) => bookingItem(r, reload))) : empty(data.offers.length ? `${data.offers.length} offers sent; none accepted yet.` : "No offers sent yet.")),
        s.rows.some((r) => r.state === "verified" && r.creatorPayout === null) ? panel("Settlement", settleBox(c, reload)) : null,
        panel("Summary", totalsBox(c, s)),
      ];
      const det = out[1]?.querySelector?.("details");
      det?.addEventListener("toggle", () => det.open && !shortlist.childElementCount && shortlistBox(shortlist, c, reload));
      return out;
    });
  await reload();
}
