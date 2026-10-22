/*
  Sell: what the business could be worth and why, the report a buyer reads
  first, listings through the ready check with the success fee agreement,
  and introductions from vetted buyers.

  Three reads at most for the first view: the valuation, the listings and
  the introductions (the frame's own read), all in the boot call's list.
*/
import { api, on, seg } from "../api.js";
import { checklist, emptyState, pill, screenHead, section, skeleton, stat, statStrip } from "../console-ui.js";
import { action, block, bps, check, count, day, failure, field, form, h, input, money, pct, tabs, textarea, toast, when } from "../ui.js";

const inputs = { margin: 50, face: 30 };

const LISTING_PILL = { draft: "idle", live: "live", under_offer: "running", withdrawn: "off", sold: "done" };
const LISTING_WORDS = { draft: "Draft", live: "Live to vetted buyers", under_offer: "Under offer", withdrawn: "Withdrawn", sold: "Sold" };
const INTRO_PILL = { requested: "needs", introduced: "done", declined: "off", lapsed: "off", closed: "off" };

const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))));
const fold = (label, ...body) => h("details", { class: "dl-fold" }, h("summary", null, label), ...body);
const signedX = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}x`;

/* ---------------------------------------------------------------- value */

/** How the multiple was built: the starting point, then each factor up or down. */
function factors(v) {
  if (!v.factors?.length) return null;
  const top = Math.max(...v.factors.map((f) => Math.abs(f.effect)), 0.01);
  return h("ol", { class: "sl-factors" },
    v.factors.map((f) =>
      h("li", { class: `sl-factor${f.key === "base" ? " is-base" : f.effect < 0 ? " is-down" : " is-up"}` },
        h("span", { class: "sl-factor-v" }, f.key === "base" ? `${f.effect.toFixed(2)}x` : signedX(f.effect)),
        h("span", { class: "sl-factor-bar", "aria-hidden": "true" }, size(h("span"), Math.abs(f.effect) / top)),
        h("p", { class: "sl-factor-t" }, f.reason),
      ),
    ),
    h("li", { class: "sl-factor is-total" }, h("span", { class: "sl-factor-v" }, `${v.multiples.low.toFixed(1)}x to ${v.multiples.high.toFixed(1)}x`), h("span"), h("p", { class: "sl-factor-t" }, "A year's profit, the range a buyer might pay.")),
  );
}
/** Sized through the style object: the content policy refuses style attributes. */
const size = (el, share) => ((el.style.width = `${Math.max(4, Math.round(share * 100))}%`), el);

function valueTab(el) {
  const out = h("div", { class: "sl", "aria-live": "polite" });
  const run = () => {
    out.replaceChildren(skeleton(5));
    return block(
      out,
      () => Promise.all([
        api.get(`/v1/me/valuation?margin=${inputs.margin / 100}&faceDependence=${inputs.face / 100}`),
        api.get("/v1/me/listings").catch(() => ({ listings: [] })),
        api.get("/v1/me/introductions").catch(() => ({ introductions: [] })),
      ]),
      ([{ valuation: v, leftOut, notice }, { listings }, { introductions }]) => {
        const liveListings = listings.filter((l) => ["live", "under_offer"].includes(l.status));
        const asked = introductions.filter((i) => i.status === "requested");
        return [
          statStrip([
            stat({ label: "Indicative value", value: v.range ? `${money(v.range.low)} to ${money(v.range.high)}` : "No range yet", line: v.multiples ? `${v.multiples.low.toFixed(1)}x to ${v.multiples.high.toFixed(1)}x a year's profit, confidence ${v.confidence}` : null }),
            v.ttmProfit ? stat({ label: "Profit, last twelve months", value: money(v.ttmProfit), line: v.ttmRevenue ? `On ${money(v.ttmRevenue)} revenue, at your ${inputs.margin}% margin` : null }) : null,
            typeof v.verifiedShare === "number" ? stat({ label: "Revenue verified", value: pct(v.verifiedShare), line: `${count(v.monthsOfData ?? 0)} months of data` }) : null,
            stat({ label: "Listings", value: count(liveListings.length), line: asked.length ? `${count(asked.length)} ${asked.length === 1 ? "buyer asks" : "buyers ask"} for an introduction` : "No buyer waiting on you", tone: asked.length ? "warn" : null, links: asked.length ? [["Answer", "/orbe-site/demo/app/selling?tab=introductions"]] : [] }),
          ]),
          h("div", { class: "rc-cols" },
            section({ title: "How the range is built", line: "Each factor moves the multiple of a year's profit up or down." }, factors(v) ?? h("ul", { class: "cn-points" }, (v.reasons ?? []).map((r) => h("li", null, r)))),
            section({ title: "Your inputs", line: "Change them and the range is worked out again. Nothing is saved or shared." }, inputsForm(run),
              leftOut?.length ? h("p", { class: "cn-label" }, `Left out: ${leftOut.map((x) => (typeof x === "string" ? x : `${x.currency ?? ""} ${x.reason ?? ""}`.trim())).join("; ")}.`) : null,
              notice ? h("p", { class: "cn-label" }, notice) : null,
            ),
          ),
          h("p", { class: "cn-label" }, v.label),
        ];
      },
    );
  };
  el.append(out);
  run();
}

function inputsForm(run) {
  return form(
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
  );
}

/* ---------------------------------------------------------------- listings */

const readiness = (r) => checklist(r.items.map((i) => ({ name: i.label, line: i.detail, done: i.done })));

function listingCard(l, reload) {
  const f = l.facts;
  const status = h("div", { "aria-live": "polite" });
  const moves = [];
  if (l.status === "draft")
    moves.push(action("Submit for the ready check", async () => {
      try {
        await api.post(`/v1/me/listings/${seg(l.id)}/submit`, { margin: inputs.margin / 100, faceDependence: inputs.face / 100 });
      } catch (e) {
        if (e.code === "not_ready" && e.details?.readiness) {
          status.replaceChildren(failure(e), readiness(e.details.readiness));
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
  return section(
    { title: l.title, line: l.listedAt ? `Listed ${day(l.listedAt)}. Buyers see an anonymised card.` : "Not listed. Buyers see nothing until it passes the ready check.", actions: pill(LISTING_PILL[l.status] ?? "idle", LISTING_WORDS[l.status] ?? l.status) },
    f
      ? statStrip([
          stat({ label: "Revenue, last twelve months", value: money(f.ttmRevenue) }),
          stat({ label: "Profit", value: money(f.ttmProfit) }),
          f.indicative ? stat({ label: "Indicative value", value: `${money(f.indicative.low)} to ${money(f.indicative.high)}` }) : null,
          stat({ label: "Verified", value: pct(f.verifiedShare), line: `${f.verifiedMonths} months${f.ratingBand ? `, rated ${f.ratingBand}` : ""}` }),
        ])
      : l.status === "draft" ? h("p", { class: "cn-label" }, `The ready check uses your margin (${inputs.margin}%) and how much it depends on you (${inputs.face}%) from Value.`) : null,
    l.readiness ? fold(`Ready check: ${l.readiness.items.filter((i) => i.done).length} of ${l.readiness.items.length}`, readiness(l.readiness)) : null,
    moves.length ? h("div", { class: "cn-dw-actions" }, moves) : null,
    status,
  );
}

function feeSection() {
  const box = h("div");
  const reload = () =>
    block(box, () => api.get("/v1/me/fee-agreement"), (a) => [
      h("p", { class: "sl-text" }, a.text),
      h("table", { class: "dl-mini sl-tiers" },
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "Sale price"), h("th", { scope: "col", class: "dl-num" }, "Fee"))),
        h("tbody", null, a.schedule.tiers.map((t, i, all) => h("tr", null,
          h("td", null, t.upTo === null ? `Above ${money({ amount: all[i - 1]?.upTo ?? 0, currency: a.schedule.currency })}` : `${i ? `${money({ amount: all[i - 1].upTo, currency: a.schedule.currency })} to ` : "Up to "}${money({ amount: t.upTo, currency: a.schedule.currency })}`),
          h("td", { class: "dl-num" }, bps(t.rateBps)),
        ))),
      ),
      h("p", { class: "cn-label" }, `At least ${money({ amount: a.schedule.minimum, currency: a.schedule.currency })}. The fee applies to a sale to an introduced buyer for ${a.tailMonths} months after the introduction.`),
      a.signed
        ? h("p", null, pill("done", `Signed ${day(a.signed.acceptedAt)}`))
        : form([check("I agree to the success fee on these terms.", { name: "accept", required: true })], "Sign the agreement", async () => {
            await api.post("/v1/me/fee-agreement", { accept: true, version: a.version });
            reload();
            return "Signed.";
          }),
    ]);
  return { box, reload };
}

function listingsTab(el) {
  const list = h("div", { class: "sl" });
  const reload = () =>
    block(list, () => api.get("/v1/me/listings"), ({ listings }) =>
      listings.length ? listings.map((l) => listingCard(l, reload)) : emptyState("folder", "No listings.", [], "A listing is for vetted buyers only, and goes live only through the ready check."),
    );
  reload();
  const fee = feeSection();
  fee.reload();
  el.append(
    h("div", { class: "sl" },
      list,
      section({ title: "Start a listing", line: "Say what it is, not who you are: buyers see an anonymised card." },
        form([field("A title buyers will see", input({ name: "title", required: true, maxlength: 120 }))], "Create the draft", async (d, f) => {
          await api.post("/v1/me/listings", { title: String(d.get("title")).trim() });
          f.reset();
          reload();
          return "Draft created.";
        }, { primary: false }),
      ),
      section({ title: "Success fee agreement", line: "A fee in full on a sale to a buyer Orbe introduced; never a cut of anything else." }, fee.box),
    ),
  );
}

/* ---------------------------------------------------------------- introductions */

function introductionsTab(el) {
  const reload = () =>
    block(el, () => api.get("/v1/me/introductions"), ({ introductions }) =>
      section(
        { title: "Introductions", line: "Buyers who asked to be introduced. Approving shares your full file with that buyer and both of your emails." },
        introductions.length
          ? h("ul", { class: "rc-rows" }, introductions.map((i) =>
              h("li", { class: "rc-row" },
                h("div", { class: "rc-row-main" },
                  h("p", { class: "rc-row-t" }, i.buyer.org, " ", pill(INTRO_PILL[i.status] ?? "idle", i.status.charAt(0).toUpperCase() + i.status.slice(1))),
                  i.note ? h("blockquote", { class: "dl-quote" }, i.note) : null,
                  h("p", { class: "cn-label" }, [`Asked ${day(i.requestedAt)}`, i.status === "requested" && i.expiresAt ? `lapses ${when(i.expiresAt)}` : null, i.buyer.email].filter(Boolean).join(", ")),
                ),
                i.status === "requested"
                  ? h("div", { class: "cn-dw-actions" },
                      action("Approve and share my file", async () => {
                        await api.post(`/v1/me/introductions/${seg(i.id)}/approve`, {});
                        reload();
                        return "Introduced. You both have each other's email.";
                      }, { primary: true, confirm: "Approve? This buyer may then read your full file, and you are introduced by email." }),
                      fold("Decline",
                        form([field("Why (optional, kept for you only)", textarea({ name: "reason", maxlength: 1000 }))], "Decline", async (d) => {
                          const reason = String(d.get("reason") ?? "").trim();
                          await api.post(`/v1/me/introductions/${seg(i.id)}/decline`, reason ? { reason } : {});
                          toast("Declined.");
                          reload();
                        }, { primary: false }),
                      ),
                    )
                  : null,
              ),
            ))
          : emptyState("people", "No buyer has asked yet.", [], "A vetted buyer who reads your listing can ask to be introduced; you decide."),
      ),
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
