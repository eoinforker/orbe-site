/* Sell: the indicative value, listings through the ready check, the success fee agreement and introductions. */
import { api, on, seg } from "../api.js";
import { screenHead } from "../console-ui.js";
import { action, actions, block, bps, check, chip, day, empty, failure, field, form, h, input, money, panel, pct, rows, tabs, textarea, title, when } from "../ui.js";

const inputs = { margin: 50, face: 30 };

const LISTING_TONE = { live: "good", under_offer: "good", withdrawn: "off", sold: "good" };

function valueTab(el) {
  const out = h("div", { class: "ap-stack", "aria-live": "polite" });
  const run = () =>
    block(
      out,
      () => api.get(`/v1/me/valuation?margin=${inputs.margin / 100}&faceDependence=${inputs.face / 100}`),
      ({ valuation: v, leftOut, notice }) => [
        v.range
          ? h("div", { class: "ap-rating" }, h("p", { class: "ap-figure ap-figure--money" }, `${money(v.range.low)} to ${money(v.range.high)}`), h("p", { class: "ap-note" }, `${v.multiples.low.toFixed(1)} to ${v.multiples.high.toFixed(1)} times a year's profit. Confidence ${v.confidence}.`))
          : h("p", { class: "ap-says" }, "No range yet."),
        h("ul", { class: "ap-plain" }, (v.reasons ?? []).map((r) => h("li", null, r))),
        leftOut?.length ? h("p", { class: "ap-note" }, `Left out: ${leftOut.map((x) => (typeof x === "string" ? x : `${x.currency ?? ""} ${x.reason ?? ""}`.trim())).join("; ")}.`) : null,
        h("p", { class: "ap-label" }, v.label),
        notice ? h("p", { class: "ap-note" }, notice) : null,
      ],
    );
  el.append(
    panel(
      "Indicative value",
      form(
        [
          field("Profit margin (%)", input({ name: "margin", type: "number", min: "-100", max: "100", step: "1", value: String(inputs.margin), required: true }), "Of revenue, after your costs."),
          field("How much the business depends on you (%)", input({ name: "face", type: "number", min: "0", max: "100", step: "5", value: String(inputs.face), required: true }), "0 runs without you on screen; 100 is all you."),
        ],
        "Work it out",
        async (d) => {
          inputs.margin = Number(d.get("margin"));
          inputs.face = Number(d.get("face"));
          await run();
        },
        { primary: false },
      ),
      out,
    ),
  );
  run();
}

function readinessList(readiness) {
  return h("ul", { class: "ap-checklist" }, readiness.items.map((i) => h("li", { class: i.done ? "is-done" : "is-open" }, h("span", { class: "ap-cue" }, i.done ? "Done" : "To do"), h("span", null, `${i.label}. ${i.detail}`))));
}

function listingItem(l, reload) {
  const f = l.facts;
  const status = h("div", { "aria-live": "polite" });
  const moves = [];
  if (l.status === "draft")
    moves.push(action("Submit for the ready check", async () => {
      try {
        await api.post(`/v1/me/listings/${seg(l.id)}/submit`, { margin: inputs.margin / 100, faceDependence: inputs.face / 100 });
      } catch (e) {
        if (e.code === "not_ready" && e.details?.readiness) {
          status.replaceChildren(failure(e), readinessList(e.details.readiness));
          return "Not ready yet.";
        }
        throw e;
      }
      reload();
      return "Listed.";
    }, { primary: true }));
  if (["live", "under_offer", "draft"].includes(l.status))
    moves.push(action("Withdraw", async () => {
      await api.post(`/v1/me/listings/${seg(l.id)}/withdraw`, {});
      reload();
      return "Withdrawn.";
    }, { danger: true, confirm: "Withdraw this listing? Open introductions close, and buyers holding a report owe nothing." }));
  if (l.status === "withdrawn")
    moves.push(action("Reopen as a draft", async () => {
      await api.post(`/v1/me/listings/${seg(l.id)}/reopen`, {});
      reload();
      return "Reopened.";
    }));
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, l.title, " ", chip(l.status.replaceAll("_", " "), LISTING_TONE[l.status])),
      f
        ? rows([
            ["Revenue, last twelve months", money(f.ttmRevenue)],
            ["Profit", money(f.ttmProfit)],
            f.indicative ? ["Indicative value", `${money(f.indicative.low)} to ${money(f.indicative.high)}`] : null,
            ["Verified", `${pct(f.verifiedShare)} of revenue, ${f.verifiedMonths} months`],
            f.ratingBand ? ["Rating band", f.ratingBand] : null,
          ])
        : h("p", { class: "ap-note" }, l.status === "draft" ? `The ready check uses your margin (${inputs.margin}%) and how much it depends on you (${inputs.face}%) from Value.` : null),
      l.listedAt ? h("p", { class: "ap-note" }, `Listed ${day(l.listedAt)}.`) : null,
      l.readiness ? readinessList(l.readiness) : null,
    ),
    moves.length ? actions(moves) : null,
    status,
  );
}

function feePanel() {
  const box = h("div");
  const reload = () =>
    block(box, () => api.get("/v1/me/fee-agreement"), (a) => [
      h("p", null, a.text),
      h("ul", { class: "ap-plain" }, a.schedule.tiers.map((t, i, all) => h("li", null, `${bps(t.rateBps)} ${t.upTo === null ? `above ${money({ amount: all[i - 1]?.upTo ?? 0, currency: a.schedule.currency })}` : `up to ${money({ amount: t.upTo, currency: a.schedule.currency })}`}`))),
      h("p", { class: "ap-note" }, `At least ${money({ amount: a.schedule.minimum, currency: a.schedule.currency })}. The fee applies to a sale to an introduced buyer for ${a.tailMonths} months after the introduction.`),
      a.signed
        ? h("p", null, chip(`Signed ${day(a.signed.acceptedAt)}`, "good"))
        : form([check("I agree to the success fee on these terms.", { name: "accept", required: true })], "Sign the agreement", async () => {
            await api.post("/v1/me/fee-agreement", { accept: true, version: a.version });
            reload();
            return "Signed.";
          }),
    ]);
  reload();
  return panel("Success fee agreement", box);
}

function listingsTab(el) {
  const list = h("div");
  const reload = () => block(list, () => api.get("/v1/me/listings"), ({ listings }) => (listings.length ? h("ul", { class: "ap-list" }, listings.map((l) => listingItem(l, reload))) : empty("No listings. A listing is for vetted buyers only, and goes live only through the ready check.")));
  reload();
  el.append(
    panel(
      "Listings",
      list,
      h("details", { class: "ap-more" }, h("summary", null, "Start a listing"),
        form([field("A title buyers will see", input({ name: "title", required: true, maxlength: 120 }), "Say what it is, not who you are: buyers see an anonymised card.")], "Create the draft", async (d, f) => {
          await api.post("/v1/me/listings", { title: String(d.get("title")).trim() });
          f.reset();
          reload();
          return "Draft created.";
        }),
      ),
    ),
    feePanel(),
  );
}

function introductionsTab(el) {
  const reload = () =>
    block(el, () => api.get("/v1/me/introductions"), ({ introductions }) =>
      introductions.length
        ? h("ul", { class: "ap-list" }, introductions.map((i) =>
            h("li", { class: "ap-item ap-item--block" },
              h("div", { class: "ap-item-main" },
                h("p", { class: "ap-says" }, i.buyer.org, " ", chip(i.status, i.status === "introduced" ? "good" : undefined)),
                i.note ? h("blockquote", { class: "ap-quote" }, i.note) : null,
                rows([["Asked", day(i.requestedAt)], i.status === "requested" && i.expiresAt ? ["Lapses", when(i.expiresAt)] : null, i.buyer.email ? ["Email", i.buyer.email] : null]),
              ),
              i.status === "requested"
                ? h("div", { class: "ap-stack" },
                    actions(action("Approve and share my file", async () => {
                      await api.post(`/v1/me/introductions/${seg(i.id)}/approve`, {});
                      reload();
                      return "Introduced. You both have each other's email.";
                    }, { primary: true, confirm: "Approve? This buyer may then read your full file, and you are introduced by email." })),
                    h("details", { class: "ap-more" }, h("summary", null, "Decline"),
                      form([field("Why (optional, kept for you only)", textarea({ name: "reason", maxlength: 1000 }))], "Decline", async (d) => {
                        const reason = String(d.get("reason") ?? "").trim();
                        await api.post(`/v1/me/introductions/${seg(i.id)}/decline`, reason ? { reason } : {});
                        reload();
                        return "Declined.";
                      }, { primary: false }),
                    ),
                  )
                : null,
            ),
          ))
        : empty("No buyer has asked yet."),
    );
  reload();
}

export async function render(main, ctx) {
  const body = screenHead(main, "sell", { line: "What your business could be worth, the report a buyer reads first, and selling to vetted buyers. Orbe introduces only: it does not advise, negotiate or hold money.", tags: [["Fees in full, never a cut"]] });
  body.append(
    tabs("sell", [
      { id: "value", label: "Value", render: valueTab },
      on("record") ? { id: "report", label: "Diligence report", render: async (el) => (await import("./report.js")).render(el, ctx, { embedded: true }) } : null,
      { id: "listings", label: "Listings", render: listingsTab },
      { id: "introductions", label: "Introductions", render: introductionsTab },
    ].filter(Boolean), ctx.query.get("tab")),
  );
}
