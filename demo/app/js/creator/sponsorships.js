/*
  Deals: every sponsorship in one place. The money at the top (waiting on
  you, open offers, booked, verified, paid out), then the pipeline: offers
  and bookings as one list with a stage, a price and whose move it is,
  filtered and searched; each opens a drawer with its terms, its timeline
  (the booking's own audit trail), the work it lives on with the disclosure
  check and delivery readings, and the moves that are yours to make. Prices,
  inventory, Sponsors like you and the assistant sit beside it as tabs.

  Three reads at most: the status, the offers and the bookings, all named in
  the boot call's list for this screen so it starts in one request.
*/
import { api, can, on, seg } from "../api.js";
import { BOOKING_STATES, guaranteeLine, OFFER_STATES, priceLines, windowLine } from "../deal.js";
import { FORMATS, formatName, KINDS, unitOf } from "../terms.js";
import { drawer, emptyState, pill, screenHead, section, segmented, skeleton, stat, statStrip } from "../console-ui.js";
import { connectButton, connectEmpty, findSource } from "../connect-inline.js";
import { icon } from "../icons.js";
import { action, block, bps, check, confirmBox, count, day, field, form, h, input, money, pounds, select, tabs, textarea, toast, when } from "../ui.js";
import { assistantTab, finderTab } from "./deals.js";
import { dealHandoff, dealTimeline, handoffCard } from "./handoff.js";

/* ---------------------------------------------------------------- the model: offers and bookings as one list of deals */

const OPEN_BOOKING = ["awaiting_funds", "in_production", "draft_review", "changes_requested", "ready", "live", "short", "make_good", "disputed"];
const DONE_BOOKING = ["verified", "paid"];
/** Whose move it is, by state: you, the brand, Orbe, or nobody (a closed deal). */
const MOVE = {
  sent: "you", countered: "brand", awaiting_funds: "brand", in_production: "you", draft_review: "brand", changes_requested: "you",
  ready: "you", live: "orbe", short: "you", make_good: "you", disputed: "orbe", verified: "orbe",
};
const MOVE_WORDS = { you: "You", brand: "The brand", orbe: "Orbe is measuring" };
const PILL = {
  sent: "needs", countered: "running", accepted: "done", declined: "off", withdrawn: "off", expired: "off",
  awaiting_funds: "idle", in_production: "needs", draft_review: "running", changes_requested: "needs", ready: "needs", live: "running",
  short: "needs", make_good: "needs", verified: "done", paid: "done", disputed: "needs", cancelled: "off",
};
const STAGE = { ...OFFER_STATES, sent: "Offer waiting for you", countered: "Countered, with the brand", ...BOOKING_STATES };

const sum = (list, f = (x) => x.price) => list.reduce((n, x) => n + (f(x)?.amount ?? 0), 0);
const gbp = (pence, currency = "GBP") => money({ amount: pence, currency });
const lastAt = (x) => (x.audit?.length ? x.audit[x.audit.length - 1].at : null) ?? x.respondedAt ?? x.sentAt ?? x.acceptedAt;

/** Every deal once: an offer until it is accepted, then its booking. */
export function dealsOf(offers, bookings) {
  const booked = new Set(bookings.map((b) => b.offerId));
  const fromOffers = offers.filter((o) => !booked.has(o.id) && o.state !== "accepted").map((o) => ({
    kind: "offer", id: o.id, x: o, brand: o.brandName, format: o.format, k: o.kind, state: o.state,
    group: ["sent", "countered"].includes(o.state) ? "offers" : "closed",
    price: o.counters?.length && o.state === "countered" ? o.counters[o.counters.length - 1].price : o.price,
    next: o.state === "sent" ? ["Answer by", o.expiresAt] : o.state === "countered" ? ["Brand answers by", o.expiresAt] : null,
    at: lastAt(o),
  }));
  const fromBookings = bookings.map((b) => ({
    kind: "booking", id: b.id, x: b, brand: b.brandName, format: b.format, k: b.kind, state: b.state,
    group: DONE_BOOKING.includes(b.state) ? "done" : OPEN_BOOKING.includes(b.state) ? "progress" : "closed",
    price: b.price,
    next: b.state === "awaiting_funds" ? ["Funds by", b.funding?.payBy] : ["in_production", "ready", "make_good"].includes(b.state) ? ["Publish by", b.publishWindow?.end] : b.state === "draft_review" ? ["Review by", b.draft?.reviewBy] : null,
    at: lastAt(b),
  }));
  return [...fromOffers, ...fromBookings].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

const yours = (d) => MOVE[d.state] === "you";

/* ---------------------------------------------------------------- the money at the top */

function moneyStrip(deals) {
  const open = deals.filter((d) => d.group === "offers");
  const progress = deals.filter((d) => d.group === "progress");
  const verified = deals.filter((d) => d.state === "verified");
  const paid = deals.filter((d) => d.state === "paid");
  const waiting = deals.filter(yours);
  // No deal yet: no row of noughts. With some, only the stages that hold one.
  if (!deals.length) return null;
  return statStrip([
    stat({ label: "Waiting on you", value: count(waiting.length), line: waiting.length ? waiting.slice(0, 2).map((d) => d.brand).join(", ") : "Nothing needs you now." }),
    open.length ? stat({ label: "Open offers", value: gbp(sum(open)), line: `${count(open.length)} ${open.length === 1 ? "offer" : "offers"}, yours in full` }) : null,
    progress.length ? stat({ label: "Booked", value: gbp(sum(progress)), line: `${count(progress.length)} in progress, money held where funded` }) : null,
    verified.length ? stat({ label: "Verified", value: gbp(sum(verified)), line: "Delivered and checked, payout next" }) : null,
    paid.length ? stat({ label: "Paid out", value: gbp(sum(paid)), line: `${count(paid.length)} paid to you` }) : null,
  ].filter(Boolean));
}

/* ---------------------------------------------------------------- the pipeline */

const FILTERS = [
  ["all", "All"],
  ["you", "Waiting on you"],
  ["offers", "Offers"],
  ["progress", "In progress"],
  ["done", "Done"],
  ["closed", "Closed"],
];
const passes = (d, f) => (f === "all" ? d.group !== "closed" : f === "you" ? yours(d) : d.group === f);

function dealRow(d, open) {
  const move = MOVE[d.state];
  return h("tr", { class: `dl-row${yours(d) ? " is-yours" : ""}`, tabindex: "0", "data-id": d.id, onclick: () => open(d), onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(d)) },
    h("td", { class: "dl-brand" }, h("span", { class: "dl-brand-n" }, d.brand), h("span", { class: "dl-sub" }, `${formatName(d.format, d.k)} on ${KINDS[d.k] ?? d.k}`)),
    h("td", { class: "dl-stage" }, pill(PILL[d.state] ?? "idle", STAGE[d.state] ?? d.state)),
    h("td", { class: "dl-num" }, money(d.price)),
    h("td", { class: "dl-move" }, move ? MOVE_WORDS[move] : h("span", { class: "dl-quiet" }, "Nobody")),
    h("td", { class: "dl-next" }, d.next?.[1] ? [h("span", { class: "dl-sub" }, d.next[0]), " ", day(d.next[1])] : h("span", { class: "dl-quiet" }, "None")),
    h("td", { class: "dl-at" }, d.at ? day(d.at) : ""),
  );
}

function pipeline(deals, ctx) {
  let filter = deals.some(yours) ? "you" : "all";
  let q = "";
  const counts = Object.fromEntries(FILTERS.map(([f]) => [f, deals.filter((d) => passes(d, f)).length]));
  const tbody = h("tbody");
  const empty = h("div");
  const table = h("table", { class: "dl-table" },
    h("thead", null, h("tr", null, ["Brand", "Stage", "Price", "Whose move", "Next date", "Updated"].map((t, i) => h("th", { scope: "col", class: i === 2 ? "dl-num" : null }, t)))),
    tbody,
  );
  const draw = () => {
    const shown = deals.filter((d) => passes(d, filter) && (!q || d.brand.toLowerCase().includes(q)));
    tbody.replaceChildren(...shown.map((d) => dealRow(d, (x) => openDeal(x, ctx))));
    table.hidden = !shown.length;
    empty.hidden = !!shown.length;
    empty.replaceChildren(shown.length ? "" : emptyState("earn", q ? `No deal with "${q}".` : filter === "you" ? "Nothing waits on you." : "Nothing here.", [], filter === "all" ? "Offers from brands, and the bookings they become, appear here." : null));
  };
  draw();
  const search = h("input", { class: "cn-field-input dl-search", type: "search", placeholder: "Find a brand", "aria-label": "Find a brand", oninput: (e) => ((q = e.target.value.trim().toLowerCase()), draw()) });
  return section(
    { title: "Pipeline", line: "Every offer and the booking it becomes. Open one for its terms, timeline and evidence.", actions: search },
    segmented("Show", FILTERS.map(([f, label]) => [f, `${label} ${counts[f]}`]), filter, (v) => ((filter = v), draw()), { cls: "cn-seg--scroll" }),
    h("div", { class: "dl-wrap" }, table),
    empty,
  );
}

/* ---------------------------------------------------------------- one deal, whole */

const AUDIT = {
  "offer.sent": "Offer sent by the brand", "offer.revised": "Offer revised", "offer.countered": "You countered", "offer.accepted": "You accepted", "offer.declined": "You declined",
  "offer.expired": "Offer lapsed unanswered", "offer.withdrawn": "Withdrawn by the brand", "offer.closed_opt_out": "Closed when you opted out",
  "booking.opened": "Booking opened", "funding.requested": "Funds asked of the brand", "funding.held": "Money held until delivery is verified", "funding.held_again": "Money held again",
  "funding.frozen": "Money frozen", "funding.unfrozen": "Money released from the freeze", "funding.amount_mismatch": "Funded amount did not match", "funding.refund_instructed": "Refund instructed",
  "draft.submitted": "Draft sent for review", "draft.changes_requested": "Brand asked for changes", "draft.approved": "Draft approved", "draft.auto_approved": "Draft approved when review time ran out",
  "work.live": "Published and linked", "work.make_good_live": "Make-good published", "work.removed": "Work removed", "content.approved": "Brand approved the content",
  "delivery.measured": "Delivery read", "delivery.short": "Delivery short of the guarantee", "delivery.verified": "Delivery verified", "remedy.make_good": "Make-good chosen",
  "dispute.opened": "Dispute opened", "dispute.resolved": "Dispute resolved", "payout.instructed": "Payout instructed", "payout.confirmed": "Paid out",
  "booking.cancelled": "Booking cancelled", "booking.cancelled_by_brand": "Cancelled by the brand", "booking.lapsed_unfunded": "Lapsed: not funded in time", "booking.lapsed_unpublished": "Lapsed: not published in time",
};
const WHO = { buyer: "Brand", creator: "You", system: "Orbe", escrow_partner: "Money held", admin: "Orbe staff", orbe: "Orbe", assistant: "Orbe's assistant" };

function timeline(audit) {
  if (!audit?.length) return h("p", { class: "cn-label" }, "No events yet.");
  return h("ol", { class: "dl-tl" },
    [...audit].reverse().map((e) =>
      h("li", { class: "dl-tl-i" },
        h("span", { class: "dl-tl-dot", "aria-hidden": "true" }),
        h("p", { class: "dl-tl-t" }, AUDIT[e.action] ?? e.title ?? String(e.action ?? "").replace(/[._]/g, " ").replace(/^./, (c) => c.toUpperCase())),
        // The assistant's own entries say why (Hand it off's timeline, handoff.js), timed in UTC as every entry is.
        e.why ? h("p", { class: "dl-tl-d dl-tl-why" }, `Why: ${e.why}`) : null,
        h("p", { class: "dl-tl-d" }, `${WHO[e.actor?.role] ?? "Orbe"}, ${when(e.at)}`),
      ),
    ),
  );
}

const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)]));
const dwSec = (title, ...body) => h("section", { class: "cn-dw-sec" }, h("div", { class: "cn-dw-sec-h" }, h("h3", null, title)), ...body);

/** A linked work: its title (to its page in the Library), the disclosure check rule by rule where something needs attention. */
function workBlock(w) {
  const d = w.disclosure;
  const open = d ? d.results.filter((r) => r.status !== "met" && r.status !== "attested") : [];
  return h("div", { class: "dl-work" },
    h("p", { class: "dl-work-t" }, w.workId ? h("a", { href: `/orbe-site/demo/app/works/${seg(w.workId)}` }, w.title) : w.title, w.role === "make_good" ? h("span", { class: "cn-tag cn-tag--straw" }, "Make-good") : null),
    h("p", { class: "dl-sub" }, `Published ${day(w.publishedAt)}`, w.url ? [" · ", h("a", { href: w.url, target: "_blank", rel: "noopener" }, "Open it", icon("external"))] : null),
    d ? h("p", { class: `dl-disc dl-disc--${d.status}` }, d.status === "pass" ? "Disclosure checked: every required rule is met." : d.status === "fail" ? "Disclosure: a required rule is missing or weak." : "Disclosure: nothing failed, but some rules need your word.") : null,
    open.length ? h("ul", { class: "cn-points" }, open.map((r) => h("li", null, `${r.rule} ${r.evidence}`))) : null,
  );
}

function readings(b) {
  if (!b.measurements?.length) return h("p", { class: "cn-label" }, b.state === "live" ? "Orbe reads delivery at each window from the day it went live." : "No readings yet.");
  const unit = unitOf(b.format, b.kind);
  return h("table", { class: "dl-mini" },
    h("thead", null, h("tr", null, h("th", { scope: "col" }, "Window"), h("th", { scope: "col", class: "dl-num" }, unit.charAt(0).toUpperCase() + unit.slice(1)), h("th", { scope: "col" }, "Read"))),
    h("tbody", null, b.measurements.map((m) => h("tr", null, h("td", null, `${m.day} ${m.day === 1 ? "day" : "days"}`), h("td", { class: "dl-num" }, count(m.units)), h("td", null, `${day(m.recordedAt)}, ${m.how.replaceAll("_", " ")}`)))),
  );
}

const SOURCE_OF = { youtube: "youtube", podcast: "podcast", substack: "substack" };

/**
  Where the booking's delivery is read from: a quiet line when its account is
  connected, and a way to connect it here when it is not. Read when the drawer
  opens, so the screen's own first view stays at three reads.
*/
function deliverySource(x, ctx) {
  const id = SOURCE_OF[x.kind];
  const box = h("div", { class: "dl-src" });
  if (!id || !["in_production", "draft_review", "changes_requested", "ready", "live", "short", "make_good"].includes(x.state)) return null;
  api.get("/v1/me/sources").then(({ groups }) => {
    const src = findSource(groups, id);
    if (!src) return;
    box.replaceChildren(src.state === "connected"
      ? h("p", { class: "cn-label" }, `Delivery is read from your connected ${src.name} for the exact window.`)
      : h("div", { class: "dl-src-row" },
          h("p", { class: "dl-notice" }, `${src.name} is not connected, so delivery is read from public counts, which can be provisional. Connected, Orbe reads your own analytics for the exact window.`),
          connectButton(id, `Connect ${src.name}`, ctx, { done: () => ctx.reload() }),
        ));
  }).catch(() => {});
  return box;
}

function openDeal(d, ctx) {
  drawer(`${d.brand}: ${formatName(d.format, d.k)}`, (close) => {
    const x = d.x;
    const done = () => (close(), ctx.reload());
    const head = h("div", { class: "dl-dw-head" },
      pill(PILL[d.state] ?? "idle", STAGE[d.state] ?? d.state),
      MOVE[d.state] ? h("span", { class: "cn-tag" }, `Next move: ${MOVE_WORDS[MOVE[d.state]]}`) : null,
    );
    const terms = kv([
      ...priceLines(x),
      ["Publish between", windowLine(x.publishWindow)],
      d.kind === "offer" && x.state === "sent" ? ["Answer by", when(x.expiresAt)] : null,
      d.kind === "booking" ? ["Money", x.funding?.holdStatus === "held" ? `${money(x.funding.total)} held since ${day(x.funding.fundedAt)}` : x.funding?.fundedAt ? `Funded ${day(x.funding.fundedAt)}` : "Not funded yet"] : null,
      x.reviewDraft ? ["Draft review", "The brand sees a draft first"] : null,
      x.outcome ? ["Outcome", `${x.outcome.reason} You receive ${bps(x.outcome.creatorShareBps)} of the price.`] : null,
    ]);
    return [
      on("deals_agent") && can("read.money") ? dealHandoff(d, done) : null,
      head,
      d.kind === "offer" && x.product ? h("p", { class: "dl-product" }, x.product) : null,
      x.message ? h("blockquote", { class: "dl-quote" }, x.message) : null,
      x.counters?.length ? h("p", { class: "cn-label" }, `Your counters: ${x.counters.map((c) => `${money(c.price)} on ${day(c.at)}`).join("; ")}.`) : null,
      x.declineReason ? h("p", { class: "cn-label" }, `Your reason, kept for you: ${x.declineReason}`) : null,
      can("business") ? moves(d, done) : null,
      dwSec("Terms", terms, h("p", { class: "dl-guarantee" }, guaranteeLine(x))),
      d.kind === "booking" ? dwSec("The work", x.works?.length ? x.works.map(workBlock) : h("p", { class: "cn-label" }, "Not published yet. Link it here once it is live."), readings(x), deliverySource(x, ctx)) : null,
      dwSec("Timeline", dealTimeline(d, timeline)),
    ];
  }, { wide: true });
}

/* ---------------------------------------------------------------- the moves that are yours */

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

/** The Library's works on the booking's account, to pick the one that went live, so the deal links to its work page. */
function libraryPick(b) {
  const sel = h("select", { name: "libraryWork", class: "cn-field-input dl-pick" }, h("option", { value: "" }, "Not in the Library yet"));
  api.get("/v1/me/works?limit=60&offset=0&sort=newest").then(({ works }) => {
    const mine = works.filter((w) => !b.accountId || w.account?.id === b.accountId);
    sel.append(...mine.map((w) => h("option", { value: w.id, "data-title": w.title, "data-at": w.publishedAt }, `${w.title}, ${day(w.publishedAt)}`)));
  }).catch(() => {});
  sel.addEventListener("change", () => {
    const o = sel.selectedOptions[0];
    const f = sel.form;
    if (!o?.value || !f) return;
    if (!f.title.value) f.title.value = o.dataset.title;
    if (!f.publishedAt.value) f.publishedAt.value = new Date(o.dataset.at).toISOString().slice(0, 16);
  });
  return field("The work in your Library", sel, "So the deal opens its work page. The work's page shows its figures beside the deal.");
}

function liveForm(b, done, makeGood) {
  return form(
    [
      libraryPick(b),
      field("Link to the published work", input({ name: "url", type: "url", required: true, maxlength: 2000, inputmode: "url" })),
      field("Title", input({ name: "title", required: true, maxlength: 500 })),
      field("Published", input({ name: "publishedAt", type: "datetime-local", required: true }), "In your own time zone."),
      field("Description or show notes", textarea({ name: "description", maxlength: 20000 }), "Orbe checks the disclosure in it against UK and US rules and the platform's."),
      h("fieldset", { class: "dl-fs" }, h("legend", null, "What you did"), check("The platform's paid promotion label is on", { name: "platformFlag" }), check("I said it was sponsored out loud", { name: "spoken" }), check("It is marked on screen", { name: "onScreen" })),
    ],
    makeGood ? "Link the make-good" : "Link the live work",
    async (fd) => {
      const url = String(fd.get("url")).trim();
      const pid = platformId(url);
      const description = String(fd.get("description") ?? "");
      await api.post(`/v1/me/sponsorships/bookings/${seg(b.id)}/live`, {
        workId: String(fd.get("libraryWork") || "") || `wk_live_${pid}`.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 64),
        platformWorkId: pid,
        url,
        title: String(fd.get("title")).trim(),
        publishedAt: new Date(String(fd.get("publishedAt"))).toISOString(),
        ...(description.trim() ? { description } : {}),
        platformFlag: fd.get("platformFlag") === "on",
        attestations: { spoken: fd.get("spoken") === "on", onScreen: fd.get("onScreen") === "on", platformFlag: fd.get("platformFlag") === "on" },
        ...(makeGood ? { makeGood: true } : {}),
      });
      toast("Linked. Orbe reads delivery at each window from here.");
      done();
    },
  );
}

const fold = (label, ...body) => h("details", { class: "dl-fold" }, h("summary", null, label), ...body);

function moves(d, done) {
  const x = d.x;
  const box = (...kids) => h("div", { class: "dl-moves" }, ...kids);
  if (d.kind === "offer") {
    if (x.state !== "sent") return null;
    // Accepting is the one primary move; countering and declining sit beside it, quieter.
    const accept = fold("Accept",
      h("p", { class: "dl-notice" }, d.notice ?? ""),
      form([check("I have read this and want to accept.", { name: "seen", required: true })], "Accept the offer", async () => {
        await api.post(`/v1/me/sponsorships/offers/${seg(x.id)}/accept`, { noticeShown: true });
        toast("Accepted. The booking is in your pipeline.");
        done();
      }),
    );
    accept.classList.add("dl-fold--primary");
    return box(
      accept,
      fold("Counter",
        form([field("Your price for the whole offer (£)", input({ name: "price", type: "number", min: "0.01", step: "0.01", required: true, inputmode: "decimal" }), "Yours in full: Orbe's fee is paid by the brand on top."), field("A note (optional)", textarea({ name: "note", maxlength: 1000 }))], "Send the counter", async (fd) => {
          const note = String(fd.get("note") ?? "").trim();
          await api.post(`/v1/me/sponsorships/offers/${seg(x.id)}/counter`, { price: Number(fd.get("price")), ...(note ? { note } : {}) });
          toast("Counter sent.");
          done();
        }),
      ),
      fold("Decline",
        form([field("Why (optional, kept for you only)", textarea({ name: "reason", maxlength: 1000 }))], "Decline the offer", async (fd) => {
          const reason = String(fd.get("reason") ?? "").trim();
          await api.post(`/v1/me/sponsorships/offers/${seg(x.id)}/decline`, reason ? { reason } : {});
          toast("Declined.");
          done();
        }, { primary: false }),
      ),
    );
  }
  const draft = () =>
    fold(x.state === "changes_requested" ? "Send a new draft" : "Send a draft for review",
      form([field("A note for the brand", textarea({ name: "note", maxlength: 2000 }), "Where to find the draft, and anything they should know.")], "Send the draft", async (fd) => {
        const note = String(fd.get("note") ?? "").trim();
        await api.post(`/v1/me/sponsorships/bookings/${seg(x.id)}/draft`, note ? { note } : {});
        toast("Draft sent.");
        done();
      }),
    );
  const live = (mg) => fold(mg ? "Link the make-good" : "Link the published work", liveForm(x, done, mg));
  switch (x.state) {
    case "awaiting_funds":
      return box(h("p", { class: "dl-notice" }, `Waiting for ${x.brandName} to fund it, by ${when(x.funding.payBy)}. Do not start until it is funded.`));
    case "in_production":
      return box(x.reviewDraft ? draft() : live(false));
    case "changes_requested":
      return box(draft());
    case "draft_review":
      return box(h("p", { class: "dl-notice" }, `With ${x.brandName}${x.draft?.reviewBy ? ` until ${when(x.draft.reviewBy)}; after that it is approved for them` : ""}.`));
    case "ready":
      return box(live(false));
    case "short":
      return box(
        h("p", { class: "dl-notice" }, `Delivery fell short of the guarantee. Choose: publish a make-good within ${x.shortfall.makeGoodDays} days, or be paid in proportion, never under ${bps(x.shortfall.floorBps)} of the price.`),
        h("div", { class: "cn-dw-actions" },
          action("Make it good", async () => {
            await api.post(`/v1/me/sponsorships/bookings/${seg(x.id)}/remedy`, { choice: "make_good" });
            done();
            return "Make-good chosen.";
          }, { primary: true }),
          action("Take pro rata", async () => {
            await api.post(`/v1/me/sponsorships/bookings/${seg(x.id)}/remedy`, { choice: "pro_rata" });
            done();
            return "Pro rata chosen.";
          }, { confirm: "Take the pro rata payment? This settles the booking." }),
        ),
      );
    case "make_good":
      return box(live(true));
    default:
      return null;
  }
}

/* ---------------------------------------------------------------- who sees your private figures */

function sharesSection(status, deals, reload) {
  if (!status.shares.length) return null;
  const nameOf = (id) => deals.find((d) => d.x.brandId === id)?.brand ?? "A brand";
  return section(
    { title: "Who sees your private figures", line: "Accepting an offer lets that brand see the delivery figures Orbe reads for the sponsored work. Stopping removes them from its report." },
    h("ul", { class: "cn-list" }, status.shares.map((s) =>
      h("li", { class: "cn-item cn-item--row" },
        h("div", { class: "cn-item-main" }, h("p", { class: "cn-item-t" }, nameOf(s.brandId)), h("p", { class: "cn-item-d" }, `Since ${day(s.grantedAt)}`)),
        can("consent") ? action("Stop sharing", async () => {
          await api.del(`/v1/me/sponsorships/shares/${seg(s.brandId)}`);
          reload();
          return "Stopped. Your private figures are out of their report.";
        }, { danger: true, confirm: "Stop sharing your figures with this brand? They are removed from its campaign report." }) : null,
      ),
    )),
  );
}

/* ---------------------------------------------------------------- prices and settings */

function pricesTab(el, status, refresh) {
  const here = { reload: refresh };
  el.replaceChildren(skeleton(4));
  block(el, () => api.get("/v1/me"), (me) => {
    const s = status.settings;
    const offering = (accountId, format) => s.offerings.find((o) => o.accountId === accountId && o.format === format);
    const rowsFor = me.accounts.flatMap((a) =>
      FORMATS.filter((f) => f.kind === a.kind).map((f) => {
        const o = offering(a.id, f.format);
        const key = `${a.id}|${f.format}`;
        return h("tr", null,
          h("th", { scope: "row" }, h("span", { class: "dl-brand-n" }, f.name), h("span", { class: "dl-sub" }, a.handle || KINDS[a.kind])),
          h("td", null, input({ name: `price:${key}`, type: "number", min: "0.01", step: "0.01", value: o?.price ? String(pounds(o.price)) : "", inputmode: "decimal", "aria-label": `Price for ${f.name} on ${a.handle || KINDS[a.kind]}, in pounds`, class: "cn-field-input dl-price" })),
          h("td", null, select([["off", "Not offered"], ["on", "Taking bookings"], ["paused", "Offered, paused"]], { name: `state:${key}`, value: o ? (o.available ? "on" : "paused") : "off", "aria-label": `Status for ${f.name}` })),
        );
      }),
    );
    const blackouts = s.blackouts.map((b, i) => check(`${day(b.start)} to ${day(b.end)}`, { name: `keep:${i}`, checked: true }));
    const save = form(
      [
        rowsFor.length
          ? h("div", { class: "dl-wrap" }, h("table", { class: "dl-table dl-table--form" }, h("thead", null, h("tr", null, h("th", { scope: "col" }, "Placement"), h("th", { scope: "col" }, "Your price (£)"), h("th", { scope: "col" }, "Status"))), h("tbody", null, rowsFor)))
          : connectEmpty("link", "Connect an account first: you sell placements on accounts Orbe has read.", null, here),
        h("div", { class: "cn-grid2" },
          field("Categories you will not work with", input({ name: "excluded", value: s.excludedCategories.join(", "), maxlength: 600 }), "Separated by commas, for example gambling, alcohol."),
          field("Days of notice you need", input({ name: "notice", type: "number", min: "0", max: "365", step: "1", value: String(s.minNoticeDays), required: true })),
          field("Your subject (optional)", input({ name: "vertical", value: s.vertical ?? "", maxlength: 40 }), "For matching, for example finance or cooking."),
          field("Pounds to one US dollar (optional)", input({ name: "usdRate", type: "number", min: "0.0001", max: "1000", step: "0.0001", inputmode: "decimal", value: s.usdRate ?? "" }), "Some suggested prices start from published rates in US dollars. Give the rate to convert them at, for example 0.79; Orbe does not guess one."),
        ),
        h("fieldset", { class: "dl-fs" }, h("legend", null, "Dates you are not available"), blackouts.length ? blackouts : h("p", { class: "cn-label" }, "None."),
          h("div", { class: "cn-grid2" }, field("From", input({ name: "bFrom", type: "date" })), field("To", input({ name: "bTo", type: "date" })))),
      ],
      "Save prices and settings",
      async (fd) => {
        const offerings = [];
        for (const a of me.accounts)
          for (const f of FORMATS.filter((x) => x.kind === a.kind)) {
            const key = `${a.id}|${f.format}`;
            const state = fd.get(`state:${key}`);
            if (state === "off") continue;
            const price = String(fd.get(`price:${key}`) ?? "").trim();
            offerings.push({ accountId: a.id, format: f.format, ...(price ? { price: Number(price) } : {}), available: state === "on" });
          }
        const kept = s.blackouts.filter((_, i) => fd.get(`keep:${i}`) === "on");
        const from = String(fd.get("bFrom") ?? "");
        const to = String(fd.get("bTo") ?? "");
        if (from && to) kept.push({ start: from, end: to });
        const vertical = String(fd.get("vertical") ?? "").trim();
        await api.put("/v1/me/sponsorships/settings", {
          offerings,
          excludedCategories: String(fd.get("excluded") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
          minNoticeDays: Number(fd.get("notice")),
          blackouts: kept,
          ...(vertical ? { vertical } : {}),
          ...(Number(fd.get("usdRate")) > 0 ? { usdRate: Number(fd.get("usdRate")) } : {}),
        });
        refresh();
        return "Saved.";
      },
    );
    return section({ title: "Prices and settings", line: "What brands in the network can book, at your price. Orbe's fee is paid by the brand on top." }, can("business") ? save : h("p", { class: "cn-label" }, "Your role on this team can see prices but not change them."));
  });
}

/* ---------------------------------------------------------------- inventory */

function windowText(w, unit) {
  if (w.median === null) return w.note ?? "Not enough readings yet.";
  return `${count(w.median)} ${unit} typical, middle half ${count(w.p25)} to ${count(w.p75)}, from ${count(w.n)} works`;
}

/* A word when a price sits far from what the creator's results support: a nudge, never a rule. */
function priceNudge(price, sug) {
  if (!price || sug?.status !== "suggested") return null;
  if (price.amount > sug.high.amount * 1.5) return `Well above the ${money(sug.low)} to ${money(sug.high)} your results support; brands may pass.`;
  if (price.amount < sug.low.amount * 0.67) return `Well below the ${money(sug.low)} to ${money(sug.high)} your results support.`;
  return null;
}

function inventoryTab(el) {
  el.replaceChildren(skeleton(4));
  block(el, () => api.get("/v1/me/sponsorships/inventory"), ({ inventory: inv }) => [
    inv.items.length
      ? h("div", { class: "dl-inv" }, inv.items.map((it) => {
          const unit = it.stats.unit ?? unitOf(it.format, it.kind);
          const sug = it.suggestion;
          return section(
            { title: `${it.name} on ${it.handle}`, line: it.description, actions: it.available ? pill("live", "Taking bookings") : pill("idle", "Paused") },
            statStrip([
              stat({ label: "Your price", value: it.listPrice ? money(it.listPrice) : "Not set", line: priceNudge(it.listPrice, sug) }),
              sug?.status === "suggested" ? stat({ label: sug.provisional ? "Orbe suggests, provisionally" : "Orbe suggests", value: `${money(sug.low)} to ${money(sug.high)}`, line: sug.per === "hour" ? "An hour" : null }) : null,
              it.stats.consistency !== null ? stat({ label: "Steadiness", value: `${Math.round(it.stats.consistency * 100)} in 100` }) : null,
            ]),
            kv(it.stats.windows.map((w) => [`At ${w.day} ${w.day === 1 ? "day" : "days"}`, windowText(w, unit)])),
            // The sources behind a suggestion are for those who ask, not the first thing a creator reads.
            sug?.status === "suggested" && sug.reasons.length ? h("details", { class: "dl-fold" }, h("summary", null, "How this is worked out"), h("ul", { class: "cn-points" }, sug.reasons.map((r) => h("li", null, r)))) : sug && sug.status !== "suggested" ? h("p", { class: "cn-label" }, sug.reason) : null,
          );
        }))
      : emptyState("earn", "Nothing offered yet.", [], "Set a price under Prices and it appears here with what your results support."),
    inv.geography.map((g) =>
      g.status === "shown"
        ? section({ title: "Audience by country", line: g.measure }, kv(g.shares.slice(0, 8).map((s) => [s.country, `${Math.round(s.share * 100)}%`])))
        : h("p", { class: "cn-label" }, g.reason),
    ),
    [...inv.ratings.map((r) => r.notice), ...inv.notes].map((n) => h("p", { class: "cn-label" }, n)),
  ]);
}

/* ---------------------------------------------------------------- opting in and discovery */

/* A quiet banner under the money: one line, and the terms and the choice behind Opt in. */
function optInSection(reload) {
  return h("section", { class: "dl-optin", "aria-label": "Take sponsorships through Orbe" },
    h("div", { class: "dl-optin-text" },
      h("p", { class: "dl-optin-t" }, "Take sponsorships through Orbe"),
      h("p", { class: "dl-optin-d" }, "Brands in the network see what you offer and your prices; money is held until delivery is verified.")),
    can("consent")
      ? h("details", { class: "dl-fold dl-fold--primary" }, h("summary", null, "Opt in"),
          h("div", { class: "dl-optin-more" },
            h("p", null, "Brands in Orbe's network see what you offer, your prices and your public figures. Your private figures go to one brand only, and only when you accept its offer."),
            h("p", null, "The brand pays before you start; the money is held until delivery is verified, then paid to you. Orbe's fee is paid by the brand, on top of your price. Orbe stays free for creators."),
            form([check("I want brands in the network to see my offerings.", { name: "accept", required: true })], "Opt in", async () => {
              await api.post("/v1/me/sponsorships/opt-in", { accept: true });
              reload();
              return "You are in.";
            })))
      : h("p", { class: "cn-label" }, "The team's owner decides whether to take sponsorships through Orbe."),
  );
}

/* A choice in the status line's menu that undoes something: asked first, in the action's own words. */
const undoRow = (label, iconName, question, run) =>
  h("button", { class: "cn-item cn-item--row", type: "button", onclick: async () => {
    if (!(await confirmBox(question, { yes: label, danger: true }))) return;
    try {
      toast(await run());
    } catch (err) {
      toast(err.message);
    }
  } }, h("span", { class: "cn-item-ico" }, icon(iconName)), h("span", { class: "cn-item-t" }, label));

/* A small menu of the choices that undo: a disclosure, closed by a choice, Escape or a click elsewhere. */
function more(rows) {
  const d = h("details", { class: "cn-menuwrap dl-more" }, h("summary", { class: "cn-btn cn-btn--s", "aria-label": "Sponsorship choices" }, icon("dots")), h("div", { class: "cn-menu cn-menu--end" }, rows));
  const away = (e) => {
    if (!d.contains(e.target)) d.open = false;
  };
  d.addEventListener("toggle", () => (d.open ? document.addEventListener("click", away) : document.removeEventListener("click", away)));
  d.addEventListener("click", (e) => e.target.closest(".cn-item") && (d.open = false));
  d.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !d.open) return;
    e.stopPropagation();
    d.open = false;
    d.querySelector("summary").focus();
  });
  return d;
}

/* One status line: where you stand and Orbe's fee. Leaving search or opting out sit in its menu, each asked first; becoming findable stays in view. */
function statusBar(status, reload) {
  const findable = on("brand_data") && status.discoverable;
  const undo = can("consent")
    ? [
        findable ? undoRow("Stop being discoverable", "search", "Leave every brand search now? You can come back at any time.", async () => {
          const r = await api.del("/v1/me/sponsorships/discoverable");
          reload();
          return r.removed[0];
        }) : null,
        undoRow("Opt out", "close", "Opt out? Open offers close; bookings you have agreed stay.", async () => {
          await api.del("/v1/me/sponsorships/opt-in");
          reload();
          return "Opted out.";
        }),
      ]
    : [];
  const join = on("brand_data") && !status.discoverable && can("consent")
    ? fold("Let brands find you",
        h("p", { class: "dl-notice" }, status.discoverableNotice),
        form([check("I have read this and want brands to be able to find me.", { name: "seen", required: true })], "Make me discoverable", async () => {
          await api.post("/v1/me/sponsorships/discoverable", { noticeShown: true });
          reload();
          return "You are discoverable.";
        }),
      )
    : null;
  return h("div", { class: "dl-status" },
    pill("live", findable ? "Opted in, discoverable" : "Opted in"),
    h("p", { class: "dl-status-t" }, `Orbe's fee is ${bps(status.takeRate.networkBps)}, paid by the ${status.takeRate.payer} on top of your price.`),
    h("div", { class: "dl-status-acts" },
      join,
      undo.length ? more(undo) : null,
    ),
  );
}

/* ---------------------------------------------------------------- the screen */

export async function render(main, ctx) {
  const body = h("div", { class: "dl" });
  screenHead(main, "sponsorships", { title: "Deals", line: "Every deal in one place: offers priced from your verified record, bookings paid in full only when delivery is verified.", tags: [["Live", "sky"], ["Paid on verified delivery"]] }).append(body);
  // From the bell (?handoff=<id>): the item is brought into view once, and the address keeps no trace of it.
  let asked = ctx.query.get("handoff");
  if (asked) {
    const u = new URL(location.href);
    u.searchParams.delete("handoff");
    history.replaceState(history.state, "", u);
  }
  /* opts.open: a deal to open once drawn again, by its offer (the booking an approved accept became). */
  const reload = (opts = {}) => {
    body.replaceChildren(skeleton(6));
    return block(
      body,
      () => Promise.all([api.get("/v1/me/sponsorships"), api.get("/v1/me/sponsorships/offers"), api.get("/v1/me/sponsorships/bookings")]),
      ([status, { offers, notice }, { bookings }]) => {
        const deals = dealsOf(offers, bookings).map((d) => (d.kind === "offer" ? { ...d, notice } : d));
        const here = { reload };
        const wanted = opts.open?.offerId ? deals.find((d) => d.x.offerId === opts.open.offerId) ?? deals.find((d) => d.id === opts.open.offerId) : null;
        if (wanted) queueMicrotask(() => openDeal(wanted, here));
        // Hand it off sits after the money and above the tabs; it reads after the first view, so Deals still starts in three reads.
        const handoff = on("deals_agent") && can("read.money") ? handoffCard({ notice, reload, focus: asked }) : null;
        asked = null;
        const goAssistant = () => document.getElementById("tab-deals-assistant")?.click();
        const extra = [
          on("sponsor_finder") ? { id: "finder", label: "Sponsors like you", render: (el) => finderTab(el, on("deals_agent") ? goAssistant : null) } : null,
          on("deals_agent") ? { id: "assistant", label: "Assistant", render: assistantTab } : null,
        ].filter(Boolean);
        // The assistant and Sponsors like you work for deals anywhere, so they show whether or not you take offers through Orbe.
        // The money comes first; whether you take offers through Orbe follows it, quietly.
        if (!status.optedIn && !deals.length) return [moneyStrip(deals), handoff, optInSection(reload), extra.length ? tabs("deals", extra, ctx.query.get("tab")) : null];
        return [
          moneyStrip(deals),
          handoff,
          status.optedIn ? statusBar(status, reload) : optInSection(reload),
          tabs("deals", [
            { id: "pipeline", label: "Pipeline", render: (el) => el.append(pipeline(deals, here), sharesSection(status, deals, reload) ?? "") },
            status.optedIn ? { id: "prices", label: "Prices", render: (el) => pricesTab(el, status, reload) } : null,
            status.optedIn ? { id: "inventory", label: "Inventory", render: inventoryTab } : null,
            ...extra,
          ].filter(Boolean), ctx.query.get("tab")),
        ];
      },
    );
  };
  await reload();
}
