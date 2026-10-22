/*
  Sponsorships: opt in, prices and settings, inventory, offers (accept,
  counter, decline), bookings (draft, live, remedy), guaranteed reads with
  their floor, and who you share figures with.
*/
import { api, on, seg } from "../api.js";
import { BOOKING_STATES, disclosure, guaranteeLine, measured, OFFER_STATES, priceLines, TONE, windowLine } from "../deal.js";
import { FORMATS, formatName, KINDS, unitOf } from "../terms.js";
import { action, actions, block, bps, check, chip, count, day, empty, field, form, h, input, money, ok, panel, pounds, rows, select, tabs, textarea, title, when } from "../ui.js";
import { screenHead } from "../console-ui.js";
import { assistantTab, finderTab } from "./deals.js";

/* ---------- offers ---------- */

function offerItem(o, notice, reload) {
  const open = o.state === "sent";
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, `${o.brandName}: ${formatName(o.format, o.kind)}`, " ", chip(o.state === "sent" ? "Waiting for you" : (OFFER_STATES[o.state] ?? o.state), TONE[o.state])),
      h("p", null, o.product),
      o.message ? h("blockquote", { class: "ap-quote" }, o.message) : null,
      rows([...priceLines(o), ["Publish between", windowLine(o.publishWindow)], open ? ["Answer by", when(o.expiresAt)] : null]),
      h("p", { class: "ap-guarantee" }, guaranteeLine(o)),
      o.counters?.length ? h("p", { class: "ap-note" }, `Your counters: ${o.counters.map((c) => `${money(c.price)} on ${day(c.at)}`).join("; ")}.`) : null,
      o.state === "countered" ? h("p", { class: "ap-note" }, "Waiting for the brand to answer your counter.") : null,
    ),
    open
      ? h(
          "div",
          { class: "ap-stack" },
          h("details", { class: "ap-more" }, h("summary", null, "Accept"),
            h("p", { class: "ap-notice" }, notice),
            form([check("I have read this and want to accept.", { name: "seen", required: true })], "Accept the offer", async () => {
              await api.post(`/v1/me/sponsorships/offers/${seg(o.id)}/accept`, { noticeShown: true });
              reload();
              return "Accepted. The booking is under Bookings.";
            }),
          ),
          h("details", { class: "ap-more" }, h("summary", null, "Counter"),
            form([field("Your price for the whole offer (£)", input({ name: "price", type: "number", min: "0.01", step: "0.01", required: true, inputmode: "decimal" }), "Before Orbe's fee, which the brand pays on top."), field("A note (optional)", textarea({ name: "note", maxlength: 1000 }))], "Send the counter", async (d) => {
              const note = String(d.get("note") ?? "").trim();
              await api.post(`/v1/me/sponsorships/offers/${seg(o.id)}/counter`, { price: Number(d.get("price")), ...(note ? { note } : {}) });
              reload();
              return "Counter sent.";
            }),
          ),
          h("details", { class: "ap-more" }, h("summary", null, "Decline"),
            form([field("Why (optional, kept for you only)", textarea({ name: "reason", maxlength: 1000 }))], "Decline the offer", async (d) => {
              const reason = String(d.get("reason") ?? "").trim();
              await api.post(`/v1/me/sponsorships/offers/${seg(o.id)}/decline`, reason ? { reason } : {});
              reload();
              return "Declined.";
            }, { primary: false }),
          ),
        )
      : null,
  );
}

function offersTab(el) {
  const reload = () =>
    block(
      el,
      () => api.get("/v1/me/sponsorships/offers"),
      ({ offers, notice }) => {
        const sorted = [...offers].sort((a, b) => (a.state === "sent" ? -1 : 0) - (b.state === "sent" ? -1 : 0) || b.sentAt.localeCompare(a.sentAt));
        return sorted.length ? h("ul", { class: "ap-list" }, sorted.map((o) => offerItem(o, notice, reload))) : empty("No offers yet. Brands in the network see what you offer under Prices.");
      },
    );
  reload();
}

/* ---------- bookings ---------- */

/** A YouTube link's video id, or the link itself, as the work's platform id. */
function platformId(url) {
  try {
    const u = new URL(url);
    const id = u.hostname.endsWith("youtu.be") ? u.pathname.slice(1) : (u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop());
    return (id || url).slice(0, 200);
  } catch {
    return url.slice(0, 200);
  }
}

function liveForm(b, reload, makeGood) {
  return form(
    [
      field("Link to the published work", input({ name: "url", type: "url", required: true, maxlength: 2000, inputmode: "url" })),
      field("Title", input({ name: "title", required: true, maxlength: 500 })),
      field("Published", input({ name: "publishedAt", type: "datetime-local", required: true }), "In your own time zone."),
      field("Description or show notes", textarea({ name: "description", maxlength: 20000 }), "Orbe checks the disclosure in it against UK and US rules and the platform's."),
      h("fieldset", { class: "ap-fieldset" }, h("legend", null, "What you did"), check("The platform's paid promotion label is on", { name: "platformFlag" }), check("I said it was sponsored out loud", { name: "spoken" }), check("It is marked on screen", { name: "onScreen" })),
    ],
    makeGood ? "Link the make-good" : "Link the live work",
    async (d) => {
      const url = String(d.get("url")).trim();
      const pid = platformId(url);
      const description = String(d.get("description") ?? "");
      await api.post(`/v1/me/sponsorships/bookings/${seg(b.id)}/live`, {
        workId: `wk_live_${pid}`.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 64),
        platformWorkId: pid,
        url,
        title: String(d.get("title")).trim(),
        publishedAt: new Date(String(d.get("publishedAt"))).toISOString(),
        ...(description.trim() ? { description } : {}),
        platformFlag: d.get("platformFlag") === "on",
        attestations: { spoken: d.get("spoken") === "on", onScreen: d.get("onScreen") === "on", platformFlag: d.get("platformFlag") === "on" },
        ...(makeGood ? { makeGood: true } : {}),
      });
      reload();
      return "Linked. Orbe reads delivery at each window from here.";
    },
  );
}

function bookingMoves(b, reload) {
  const draft = () =>
    h("details", { class: "ap-more" }, h("summary", null, b.state === "changes_requested" ? "Send a new draft" : "Send a draft for review"),
      form([field("A note for the brand", textarea({ name: "note", maxlength: 2000 }), "Where to find the draft, and anything they should know.")], "Send the draft", async (d) => {
        const note = String(d.get("note") ?? "").trim();
        await api.post(`/v1/me/sponsorships/bookings/${seg(b.id)}/draft`, note ? { note } : {});
        reload();
        return "Draft sent.";
      }),
    );
  const live = (mg) => h("details", { class: "ap-more" }, h("summary", null, mg ? "Link the make-good" : "Link the published work"), liveForm(b, reload, mg));
  switch (b.state) {
    case "awaiting_funds":
      return h("p", { class: "ap-note" }, `Waiting for ${b.brandName} to fund it, by ${when(b.funding.payBy)}. Do not start until it is funded.`);
    case "in_production":
      return b.reviewDraft ? draft() : live(false);
    case "changes_requested":
      return draft();
    case "draft_review":
      return h("p", { class: "ap-note" }, `With ${b.brandName}${b.draft.reviewBy ? ` until ${when(b.draft.reviewBy)}; after that it is approved for them` : ""}.`);
    case "ready":
      return live(false);
    case "short":
      return h(
        "div",
        { class: "ap-stack" },
        h("p", null, `Delivery fell short of the guarantee. Choose: publish a make-good within ${b.shortfall.makeGoodDays} days, or be paid in proportion, never under ${bps(b.shortfall.floorBps)} of the price.`),
        actions(
          action("Make it good", async () => {
            await api.post(`/v1/me/sponsorships/bookings/${seg(b.id)}/remedy`, { choice: "make_good" });
            reload();
            return "Make-good chosen.";
          }, { primary: true }),
          action("Take pro rata", async () => {
            await api.post(`/v1/me/sponsorships/bookings/${seg(b.id)}/remedy`, { choice: "pro_rata" });
            reload();
            return "Pro rata chosen.";
          }, { confirm: "Take the pro rata payment? This settles the booking." }),
        ),
      );
    case "make_good":
      return live(true);
    default:
      return null;
  }
}

function bookingItem(b, reload) {
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, `${b.brandName}: ${formatName(b.format, b.kind)}`, " ", chip(BOOKING_STATES[b.state] ?? b.state, TONE[b.state])),
      rows([
        ["Your price", money(b.price)],
        ["Publish between", windowLine(b.publishWindow)],
        ["Money", b.funding.holdStatus === "held" ? `${money(b.funding.total)} held by the payments partner since ${day(b.funding.fundedAt)}` : b.funding.fundedAt ? `Funded ${day(b.funding.fundedAt)}` : "Not funded yet"],
        b.settlement ? ["Settled", "Paid through the payments partner"] : null,
        b.outcome ? ["Outcome", `${b.outcome.reason} You receive ${bps(b.outcome.creatorShareBps)} of the price.`] : null,
      ]),
      h("p", { class: "ap-guarantee" }, guaranteeLine(b)),
      b.works.map((w) => h("div", { class: "ap-work" }, h("p", null, w.url ? h("a", { href: w.url, target: "_blank", rel: "noopener" }, w.title) : w.title, w.role === "make_good" ? " (make-good)" : ""), disclosure(w))),
      measured(b),
    ),
    bookingMoves(b, reload),
  );
}

function bookingsTab(el, status) {
  const reload = () =>
    block(
      el,
      () => api.get("/v1/me/sponsorships/bookings"),
      ({ bookings }) => [
        bookings.length ? h("ul", { class: "ap-list" }, bookings.map((b) => bookingItem(b, reload))) : empty("No bookings yet. Accepting an offer makes one."),
        status.shares.length
          ? panel(
              "Who sees your private figures",
              h("p", null, "Accepting an offer lets that brand see the delivery figures Orbe reads from your connected accounts for the sponsored work. Stopping removes those figures from their campaign report."),
              h("ul", { class: "ap-list" }, status.shares.map((s) =>
                h("li", { class: "ap-item" },
                  h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, bookings.find((b) => b.brandId === s.brandId)?.brandName ?? "A brand"), h("p", { class: "ap-note" }, `Since ${day(s.grantedAt)}`)),
                  actions(action("Stop sharing", async () => {
                    await api.del(`/v1/me/sponsorships/shares/${seg(s.brandId)}`);
                    status.shares = status.shares.filter((x) => x.brandId !== s.brandId);
                    reload();
                    return "Stopped. Your private figures are out of their report.";
                  }, { danger: true, confirm: "Stop sharing your figures with this brand? They are removed from its campaign report." })),
                ),
              )),
            )
          : null,
      ],
    );
  reload();
}

/* ---------- prices and settings ---------- */

function pricesTab(el, status, refresh) {
  block(
    el,
    () => api.get("/v1/me"),
    (me) => {
      const s = status.settings;
      const offering = (accountId, format) => s.offerings.find((o) => o.accountId === accountId && o.format === format);
      const rowsFor = me.accounts.flatMap((a) =>
        FORMATS.filter((f) => f.kind === a.kind).map((f) => {
          const o = offering(a.id, f.format);
          const key = `${a.id}|${f.format}`;
          return h(
            "fieldset",
            { class: "ap-fieldset ap-offer" },
            h("legend", null, `${f.name} on ${a.handle || KINDS[a.kind]}`),
            field("Price (£)", input({ name: `price:${key}`, type: "number", min: "0.01", step: "0.01", value: o?.price ? String(pounds(o.price)) : "", inputmode: "decimal" }), f.format === "stream_segment" ? "Per hour, before Orbe's fee." : "Per placement, before Orbe's fee."),
            field("Status", select([["off", "Not offered"], ["on", "Taking bookings"], ["paused", "Offered, paused"]], { name: `state:${key}`, value: o ? (o.available ? "on" : "paused") : "off" })),
          );
        }),
      );
      const blackouts = s.blackouts.map((b, i) => check(`${day(b.start)} to ${day(b.end)}`, { name: `keep:${i}`, checked: true }));
      return form(
        [
          rowsFor.length ? rowsFor : empty("Connect an account first: you sell placements on accounts Orbe has read."),
          field("Categories you will not work with", input({ name: "excluded", value: s.excludedCategories.join(", "), maxlength: 600 }), "Separated by commas, for example gambling, alcohol."),
          field("Days of notice you need", input({ name: "notice", type: "number", min: "0", max: "365", step: "1", value: String(s.minNoticeDays), required: true })),
          field("Your subject (optional)", input({ name: "vertical", value: s.vertical ?? "", maxlength: 40 }), "For matching, for example finance or cooking."),
          h("fieldset", { class: "ap-fieldset" }, h("legend", null, "Dates you are not available"), blackouts.length ? blackouts : h("p", { class: "ap-note" }, "None."),
            h("div", { class: "ap-pair" }, field("From", input({ name: "bFrom", type: "date" })), field("To", input({ name: "bTo", type: "date" })))),
        ],
        "Save prices and settings",
        async (d) => {
          const offerings = [];
          for (const a of me.accounts)
            for (const f of FORMATS.filter((x) => x.kind === a.kind)) {
              const key = `${a.id}|${f.format}`;
              const state = d.get(`state:${key}`);
              if (state === "off") continue;
              const price = String(d.get(`price:${key}`) ?? "").trim();
              offerings.push({ accountId: a.id, format: f.format, ...(price ? { price: Number(price) } : {}), available: state === "on" });
            }
          const kept = s.blackouts.filter((_, i) => d.get(`keep:${i}`) === "on");
          const from = String(d.get("bFrom") ?? "");
          const to = String(d.get("bTo") ?? "");
          if (from && to) kept.push({ start: from, end: to });
          const vertical = String(d.get("vertical") ?? "").trim();
          await api.put("/v1/me/sponsorships/settings", {
            offerings,
            excludedCategories: String(d.get("excluded") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
            minNoticeDays: Number(d.get("notice")),
            blackouts: kept,
            ...(vertical ? { vertical } : {}),
          });
          refresh();
          return "Saved.";
        },
      );
    },
  );
}

/* ---------- inventory ---------- */

function windowText(w, unit) {
  if (w.median === null) return w.note ?? "Not enough readings yet.";
  return `Typically ${count(w.median)} ${unit} (middle half ${count(w.p25)} to ${count(w.p75)}), from ${count(w.n)} works.`;
}

function inventoryTab(el) {
  block(
    el,
    () => api.get("/v1/me/sponsorships/inventory"),
    ({ inventory: inv }) => [
      inv.items.length
        ? inv.items.map((it) => {
            const unit = it.stats.unit ?? unitOf(it.format, it.kind);
            const sug = it.suggestion;
            return panel(
              `${it.name} on ${it.handle}`,
              h("p", null, it.description),
              rows([
                ["Your price", it.listPrice ? money(it.listPrice) : "Not set"],
                ["Status", it.available ? "Taking bookings" : "Paused"],
                ...it.stats.windows.map((w) => [`At ${w.day} ${w.day === 1 ? "day" : "days"}`, windowText(w, unit)]),
                it.stats.consistency !== null ? ["Steadiness", `${Math.round(it.stats.consistency * 100)} in 100`] : null,
              ]),
              sug?.status === "suggested"
                ? h("div", { class: "ap-stack" }, h("p", { class: "ap-says" }, `Orbe suggests ${money(sug.low)} to ${money(sug.high)}${sug.per === "hour" ? " an hour" : ""}${sug.provisional ? ", provisionally" : ""}.`), h("ul", { class: "ap-plain" }, sug.reasons.map((r) => h("li", null, r))))
                : sug
                  ? h("p", { class: "ap-note" }, sug.reason)
                  : null,
            );
          })
        : empty("Nothing offered yet. Set prices under Prices."),
      inv.geography.map((g) => (g.status === "shown" ? panel("Audience by country", h("p", { class: "ap-note" }, g.measure), rows(g.shares.slice(0, 8).map((s) => [s.country, `${Math.round(s.share * 100)}%`]))) : h("p", { class: "ap-note" }, g.reason))),
      inv.ratings.map((r) => h("p", { class: "ap-label" }, r.notice)),
      inv.notes.map((n) => h("p", { class: "ap-note" }, n)),
    ],
  );
}

/* ---------- discovery: its own yes, on top of opting in ---------- */

function discoverableBox(status, reload) {
  const said = h("div", { "aria-live": "polite" });
  if (status.discoverable)
    return h("div", { class: "ap-stack" },
      h("div", { class: "ap-bar" },
        h("p", null, chip("Discoverable", "good"), " Brands can find you, anonymised, by your results against creators your size."),
        actions(action("Stop being discoverable", async () => {
          const r = await api.del("/v1/me/sponsorships/discoverable");
          said.replaceChildren(ok(r.removed.join(" ")));
          reload();
          return r.removed[0];
        }, { danger: true, confirm: "Leave every brand search now?" })),
      ),
      said,
    );
  return h("details", { class: "ap-more" }, h("summary", null, "Let brands find you"),
    h("p", { class: "ap-notice" }, status.discoverableNotice),
    form([check("I have read this and want brands to be able to find me.", { name: "seen", required: true })], "Make me discoverable", async () => {
      await api.post("/v1/me/sponsorships/discoverable", { noticeShown: true });
      reload();
      return "You are discoverable.";
    }),
  );
}

/* ---------- the screen ---------- */

function optInPanel(reload) {
  return panel(
    "Take sponsorships through Orbe",
    h("p", null, "Brands in Orbe's network see what you offer, your prices and your public figures. Your private figures go to one brand only, and only when you accept its offer."),
    h("p", null, "Money waits with a payments partner and is released when delivery is verified. Orbe's fee is paid by the brand, on top of your price. Orbe stays free for creators."),
    form([check("I want brands in the network to see my offerings.", { name: "accept", required: true })], "Opt in", async () => {
      await api.post("/v1/me/sponsorships/opt-in", { accept: true });
      reload();
      return "You are in.";
    }),
  );
}

export async function render(main, ctx) {
  const body = h("div", { class: "ap-stack" });
  screenHead(main, "sponsorships", { line: "Offers priced from your verified record, paid in full only when delivery is verified.", tags: [["Live", "sky"], ["Paid on verified delivery"]] }).append(body);
  const reload = () =>
    block(
      body,
      () => api.get("/v1/me/sponsorships"),
      (status) => {
        // Sponsors like you and the assistant work for deals anywhere, so they show whether or not you take offers through Orbe.
        const goAssistant = () => document.getElementById("tab-sponsorships-assistant")?.click();
        const extra = [
          on("sponsor_finder") ? { id: "finder", label: "Sponsors like you", render: (el) => finderTab(el, on("deals_agent") ? goAssistant : null) } : null,
          on("deals_agent") ? { id: "assistant", label: "Assistant", render: assistantTab } : null,
        ].filter(Boolean);
        if (!status.optedIn) return [optInPanel(reload), extra.length ? tabs("sponsorships", extra, ctx.query.get("tab")) : null];
        return [
          h("div", { class: "ap-bar" },
            h("p", null, chip("Opted in", "good"), ` Orbe's fee is ${bps(status.takeRate.networkBps)}, paid by the ${status.takeRate.payer} on top of your price.`),
            actions(action("Opt out", async () => {
              await api.del("/v1/me/sponsorships/opt-in");
              reload();
              return "Opted out.";
            }, { danger: true, confirm: "Opt out? Open offers close; bookings you have agreed stay." })),
          ),
          on("brand_data") ? discoverableBox(status, reload) : null,
          tabs("sponsorships", [
            { id: "offers", label: "Offers", render: offersTab },
            { id: "bookings", label: "Bookings", render: (el) => bookingsTab(el, status) },
            { id: "prices", label: "Prices", render: (el) => pricesTab(el, status, reload) },
            { id: "inventory", label: "Inventory", render: inventoryTab },
            ...extra,
          ], ctx.query.get("tab")),
        ];
      },
    );
  await reload();
}
