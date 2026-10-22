/*
  Buy guaranteed reads, as easily as buying ads: a brief, then Orbe's
  proposal (shows and channels at the creator's own price, Orbe's fee on
  top, the guaranteed floor each creator's record supports), then one
  confirmation that sends an offer to each. Nothing is booked until a
  creator accepts; the brand then pays each accepted read, held by the
  payments partner until delivery is verified.

  /app/reads is a new checkout; /app/reads/:id is where its reads stand.
*/
import { api, asks, can, SentToOwner, seg } from "../api.js";
import { cover, pill, screenHead, section, segmented, skeleton, stat, statStrip } from "../console-ui.js";
import { BOOKING_STATES, OFFER_STATES } from "../deal.js";
import { icon } from "../icons.js";
import { FORMATS, KINDS, unitOf } from "../terms.js";
import { block, check, confirmBox, count, day, failure, field, h, input, money, plural, textarea, toast } from "../ui.js";

const GOALS = [["awareness", "Awareness"], ["launch", "A launch"], ["sales", "Sales"], ["always_on", "Always on"]];
const GOAL_WORDS = Object.fromEntries(GOALS);
const iso = (d) => d.toISOString().slice(0, 10);
const FORMAT_CHOICES = [...new Map(FORMATS.map((f) => [f.format, f.format === "dedicated" ? "Dedicated video or send" : f.name])).entries()];
const sum = (xs) => ({ amount: xs.reduce((n, x) => n + x.amount, 0), currency: xs[0]?.currency ?? "GBP" });

const OFFER_TONE = { sent: "running", countered: "needs", accepted: "done", declined: "off", withdrawn: "off", expired: "off" };
const BOOKING_TONE = { awaiting_funds: "needs", in_production: "running", draft_review: "needs", changes_requested: "needs", ready: "running", live: "live", short: "failed", make_good: "needs", paid: "done", cancelled: "off", disputed: "failed" };
const DISCLOSURE = { pass: ["done", "Labelled"], needs_attestation: ["needs", "Needs the creator's word"], fail: ["failed", "Label missing"] };

/* ---------------------------------------------------------------- the brief */

function briefFields() {
  const now = new Date();
  return {
    goal: "awareness",
    el: h("div", { class: "bi-brief" },
      field("What you are promoting", textarea({ name: "product", required: true, maxlength: 1000, placeholder: "A made-up oat drink, launching in the UK" }), "Creators read this when your offer arrives."),
      h("div", { class: "ap-pair" },
        field("Campaign name", input({ name: "title", required: true, maxlength: 120, placeholder: "Spring launch" })),
        field("Budget (£)", input({ name: "budget", type: "number", min: "1", step: "1", required: true, inputmode: "numeric", placeholder: "5000" }), "Everything you spend, Orbe's fee included."),
      ),
      h("fieldset", { class: "ap-fieldset" }, h("legend", null, "Where"), Object.entries(KINDS).filter(([k]) => k !== "photography").map(([k, name]) => check(name, { name: "kinds", value: k, checked: k === "podcast" || k === "youtube" }))),
      h("fieldset", { class: "ap-fieldset" }, h("legend", null, "Formats"), FORMAT_CHOICES.map(([f, name]) => check(name, { name: "formats", value: f, checked: f === "podcast_read" || f === "integration" }))),
      h("div", { class: "ap-pair" },
        field("Publish from", input({ name: "start", type: "date", required: true, value: iso(new Date(now.getTime() + 7 * 864e5)) })),
        field("Publish by", input({ name: "end", type: "date", required: true, value: iso(new Date(now.getTime() + 49 * 864e5)) })),
      ),
      h("details", { class: "ap-more" }, h("summary", null, "Audience"),
        field("Countries", input({ name: "countries", maxlength: 200, placeholder: "GB, IE" }), "Two-letter codes, separated by commas. Empty means anywhere."),
        h("div", { class: "ap-pair" }, field("Smallest audience", input({ name: "minAudience", type: "number", min: "0", step: "1" })), field("Largest audience", input({ name: "maxAudience", type: "number", min: "0", step: "1" }))),
        check("Review each draft before it goes out", { name: "reviewDrafts", checked: true }),
      ),
    ),
  };
}

function briefOf(f) {
  const d = new FormData(f);
  const num = (k) => {
    const v = String(d.get(k) ?? "").trim();
    return v === "" ? undefined : Number(v);
  };
  const formats = d.getAll("formats").map(String);
  if (!formats.length) throw new Error("Choose at least one format.");
  const countries = String(d.get("countries") ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
  return {
    title: String(d.get("title")).trim(),
    product: String(d.get("product")).trim(),
    budget: Number(d.get("budget")),
    kinds: d.getAll("kinds").map(String),
    formats,
    start: String(d.get("start")),
    end: String(d.get("end")),
    reviewDrafts: d.get("reviewDrafts") === "on",
    ...(countries.length ? { countries } : {}),
    ...(num("minAudience") !== undefined ? { minAudience: num("minAudience") } : {}),
    ...(num("maxAudience") !== undefined ? { maxAudience: num("maxAudience") } : {}),
  };
}

/* ---------------------------------------------------------------- the proposal */

function readCard(r, chosen, onToggle) {
  const unit = unitOf(r.format, r.kind);
  const include = h("input", { type: "checkbox", checked: chosen.has(r.creatorId), "aria-label": `Include ${r.handle ?? r.displayName}` });
  const floor = h("input", { type: "checkbox", checked: r.guarantee !== null, disabled: r.guarantee === null });
  include.addEventListener("change", () => onToggle(r, include.checked, floor.checked));
  floor.addEventListener("change", () => onToggle(r, include.checked, floor.checked));
  const top = r.reasons.filter((x) => x.fit === "strong").slice(0, 2);
  return h("li", { class: `bi-read${chosen.has(r.creatorId) ? " is-in" : ""}` },
    h("label", { class: "bi-read-pick" }, include),
    h("div", { class: "bi-read-main" },
      h("p", { class: "bi-read-who" }, r.handle ? `@${r.handle.replace(/^@+/, "")}` : r.displayName, h("span", { class: "bi-read-fmt" }, r.formatName)),
      h("p", { class: "cn-brand-line" },
        r.expectedUnits ? `About ${count(r.expectedUnits)} ${unit}${r.expectedCpm ? `, ${money(r.expectedCpm)} per 1,000` : ""}. ` : "",
        r.guarantee ? `Guaranteed floor: ${count(r.guarantee.units)} ${unit} at ${r.guarantee.day} days.` : "No floor to guarantee yet: not enough verified readings.",
      ),
      top.length ? h("p", { class: "cn-brand-line cn-brand-line--quiet" }, top.map((x) => x.sentence).join(" ")) : null,
      r.guarantee ? h("label", { class: "ap-check bi-read-floor" }, floor, h("span", null, "Include the guarantee")) : null,
    ),
    h("div", { class: "bi-read-price" },
      h("p", { class: "bi-read-total" }, money(r.total)),
      h("p", { class: "cn-label" }, `${money(r.price)} + ${money(r.fee)} fee`),
      h("p", { class: "bi-score", title: "How well this read fits your brief, out of 100" }, `Fit ${r.score}`),
    ),
  );
}

function proposalView(p, brief, goal, ctx) {
  const reads = [...p.picks, ...p.alternates];
  const chosen = new Map(p.picks.map((r) => [r.creatorId, { guarantee: r.guarantee !== null }]));
  const list = h("ul", { class: "bi-reads" });
  const alts = h("ul", { class: "bi-reads" });
  const summary = h("div", { class: "bi-summary" });
  const status = h("div", { class: "ap-status", "aria-live": "polite" });
  const send = h("button", { class: "cn-btn cn-btn--primary", type: "button" }, "Send offers");

  const draw = () => {
    const toggle = (r, on, g) => {
      if (on) chosen.set(r.creatorId, { guarantee: g });
      else chosen.delete(r.creatorId);
      draw();
    };
    const set = new Set(chosen.keys());
    list.replaceChildren(...reads.filter((r) => set.has(r.creatorId)).map((r) => readCard(r, set, toggle)));
    alts.replaceChildren(...reads.filter((r) => !set.has(r.creatorId)).map((r) => readCard(r, set, toggle)));
    const picked = reads.filter((r) => set.has(r.creatorId));
    const total = picked.length ? sum(picked.map((r) => r.total)) : { amount: 0, currency: p.budget.currency };
    const over = total.amount > p.budget.amount;
    summary.replaceChildren(
      h("div", { class: "bi-summary-figs" },
        h("p", null, h("b", null, plural(picked.length, "read")), h("span", null, GOAL_WORDS[goal])),
        h("p", null, h("b", { class: over ? "cn-tone--bad" : "" }, money(total)), h("span", null, `of ${money(p.budget)}${over ? ", over budget" : ""}`)),
      ),
      send,
    );
    send.disabled = !picked.length || over;
    send.textContent = picked.length ? `Send ${plural(picked.length, "offer")}` : "Choose a read";
  };

  send.addEventListener("click", async () => {
    const picks = [...chosen.entries()].map(([creatorId, o]) => {
      const r = reads.find((x) => x.creatorId === creatorId);
      return { creatorId, accountId: r.accountId, format: r.format, guarantee: o.guarantee };
    });
    const yes = await confirmBox(
      `Each creator gets an offer at their own price, with Orbe's fee of ${p.terms.takeRateBps / 100}% on top. Nothing is booked until they accept. You pay each read when it is accepted, and the payments partner holds the money until delivery is verified.${asks("money") ? " As a manager, this goes to the owner to approve first." : ""}`,
      { yes: send.textContent, title: "Send these offers?" },
    );
    if (!yes) return;
    send.disabled = true;
    status.replaceChildren();
    try {
      const r = await api.post("/v1/brand/checkout", { brief, goal, picks });
      toast(r.failed.length ? `${plural(r.sent.length, "offer")} sent; ${plural(r.failed.length, "creator")} could not be offered.` : `${plural(r.sent.length, "offer")} sent. Nothing is booked until each creator accepts.`);
      ctx.go(`/orbe-site/demo/app/reads/${seg(r.campaign.id)}`);
    } catch (e) {
      send.disabled = false;
      if (e instanceof SentToOwner) return status.replaceChildren(h("p", { class: "ap-ok" }, "Sent to the owner to approve. Nothing has been offered yet."));
      status.replaceChildren(failure(e));
    }
  });

  draw();
  return [
    h("div", { class: "bi-proposal" },
      h("div", { class: "bi-proposal-main" },
        section({ title: "Orbe's proposal", line: p.picks.length ? "The best fits for your brief that your budget covers together. Untick to leave one out." : "No creator fits this brief and budget yet." }, list),
        p.alternates.length ? section({ title: "Also a good fit", line: "Tick to add. The total updates as you go." }, alts) : null,
        h("ul", { class: "cn-points" }, p.notes.map((n) => h("li", null, n))),
      ),
      h("aside", { class: "bi-proposal-side" }, summary, status),
    ),
  ];
}

/* ---------------------------------------------------------------- a new checkout */

function newCheckout(work, ctx) {
  const fields = briefFields();
  let goal = "awareness";
  const out = h("div");
  const f = h("form", { class: "ap-form bi-form" },
    h("div", { class: "bi-goal" }, h("p", { class: "bi-h" }, "What is it for?"), segmented("Goal", GOALS, goal, (v) => (goal = v))),
    fields.el,
    h("div", { class: "ap-actions" }, h("button", { class: "cn-btn cn-btn--primary", type: "submit" }, "See who fits", icon("arrowRight"))),
  );
  const status = h("div", { class: "ap-status", "aria-live": "polite" });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.replaceChildren();
    let brief;
    try {
      brief = briefOf(f);
    } catch (err) {
      return status.replaceChildren(failure(err));
    }
    out.replaceChildren(skeleton(5));
    out.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    try {
      const { proposal } = await api.post("/v1/brand/checkout/proposal", { brief });
      out.replaceChildren(...proposalView(proposal, brief, goal, ctx));
      out.querySelector(".cn-h2")?.focus?.();
    } catch (err) {
      out.replaceChildren();
      status.replaceChildren(failure(err));
    }
  });
  const past = h("div");
  work.append(section({ title: "Your brief", line: "Orbe proposes shows and channels from their verified records. Nothing is sent until you confirm." }, f, status), out, section({ title: "Your checkouts", line: "Where each read stands." }, past));
  block(past, () => api.get("/v1/brand/checkout"), ({ checkouts }) =>
    checkouts.length
      ? h("ul", { class: "cn-links" }, checkouts.map((c) => h("a", { class: "cn-mini", href: `/orbe-site/demo/app/reads/${seg(c.campaign.id)}` }, cover(c.campaign.id, "spon", 0.6), h("span", null, h("span", { class: "cn-mini-t" }, c.campaign.brief.title), h("span", { class: "cn-mini-d" }, `${GOAL_WORDS[c.goal]}, ${plural(c.reads.length, "read")}, from ${day(c.campaign.brief.window.start)}`)))))
      : h("p", { class: "cn-brand-line" }, "None yet."),
  );
}

/* ---------------------------------------------------------------- where a checkout stands */

function readRow(r) {
  const b = r.booking;
  const label = r.handle ? `@${r.handle.replace(/^@+/, "")}` : "A creator";
  const delivery = b?.delivery?.length ? b.delivery.map((d) => `${count(d.units)} at ${d.day} days`).join(", ") : "Not read yet";
  const work = b?.works?.[0];
  return h("tr", null,
    h("th", { scope: "row" }, label, h("span", { class: "bi-read-fmt" }, r.format.replaceAll("_", " "))),
    h("td", { "data-label": "Offer" }, pill(OFFER_TONE[r.offer.state] ?? "idle", OFFER_STATES[r.offer.state] ?? r.offer.state)),
    h("td", { "data-label": "Booking" }, b ? pill(BOOKING_TONE[b.state] ?? "idle", BOOKING_STATES[b.state] ?? b.state) : h("span", { class: "cn-label" }, "Not booked")),
    h("td", { class: "bi-num", "data-label": "Price" }, money(r.offer.price)),
    h("td", { class: "bi-num", "data-label": "Guarantee" }, r.offer.guarantee ? `${count(r.offer.guarantee.units)} at ${r.offer.guarantee.day} days` : "None"),
    h("td", { class: "bi-num", "data-label": "Delivered" }, delivery),
    h("td", { "data-label": "Disclosure" }, work ? pill(...(DISCLOSURE[work.disclosure.status] ?? ["idle", work.disclosure.status])) : h("span", { class: "cn-label" }, "Not live")),
  );
}

async function status(work, ctx) {
  const body = h("div", { class: "bi-market" }, skeleton(5));
  work.append(body);
  const load = () =>
    block(body, () => api.get(`/v1/brand/checkout/${seg(ctx.params.id)}`), ({ checkout: c }) => {
      const accepted = c.reads.filter((r) => r.booking);
      const live = accepted.filter((r) => ["live", "short", "make_good", "paid"].includes(r.booking.state));
      const title = work.closest(".cn-tp")?.querySelector(".ap-h1");
      if (title) title.textContent = c.campaign.brief.title;
      const pay = c.toFund.amount > 0 && can("money")
        ? h("button", { class: "cn-btn cn-btn--primary", type: "button", onclick: async (e) => {
            const yes = await confirmBox(`Pay ${money(c.toFund)} for the accepted reads? The payments partner holds it until each delivery is verified.${asks("money") ? " As a manager, this goes to the owner to approve first." : ""}`, { yes: "Pay accepted reads" });
            if (!yes) return;
            e.target.disabled = true;
            try {
              const r = await api.post(`/v1/brand/checkout/${seg(c.campaign.id)}/fund`, {});
              const link = r.funded.find((x) => x.checkoutUrl)?.checkoutUrl;
              toast(link ? "Opening the payment page." : `${plural(r.funded.length, "read")} sent for payment.`);
              if (link) window.open(link, "_blank", "noopener");
              load();
            } catch (err) {
              e.target.disabled = false;
              if (!(err instanceof SentToOwner)) toast(err.message);
            }
          } }, `Pay ${money(c.toFund)}`)
        : null;
      return [
        statStrip([
          stat({ label: "Offers sent", value: count(c.reads.length), line: `${GOAL_WORDS[c.goal]}. Publish ${day(c.campaign.brief.window.start)} to ${day(c.campaign.brief.window.end)}.` }),
          stat({ label: "Accepted", value: count(accepted.length), line: "Booked only once a creator says yes." }),
          stat({ label: "To pay", value: money(c.toFund), line: c.toFund.amount ? "For reads accepted and waiting for funds." : "Nothing waiting on you." }),
          stat({ label: "Live", value: count(live.length), line: "Delivery is read at 7 and 30 days; you get an email each time." }),
        ]),
        section({ title: "Every read", line: "Offer, booking, delivery and disclosure, as they stand.", actions: [pay, h("a", { class: "cn-btn cn-btn--xs", href: `${c.reportHref}?format=html`, target: "_blank", rel: "noopener" }, "Full report", icon("external"))] },
          h("div", { class: "bi-tablewrap" },
            h("table", { class: "cn-table bi-table" },
              h("thead", null, h("tr", null, ["Creator", "Offer", "Booking", "Price", "Guarantee", "Delivered", "Disclosure"].map((t, i) => h("th", { scope: "col", class: i >= 3 && i <= 5 ? "bi-num" : null }, t)))),
              h("tbody", null, c.reads.map(readRow)),
            ),
          ),
        ),
        h("p", { class: "cn-label" }, "Disclosure is checked on each published work against UK and US rules, platform labels included where Orbe can read them."),
      ];
    });
  await load();
}

export async function render(main, ctx) {
  const id = ctx.params.id;
  const work = screenHead(main, "reads", {
    title: id ? "Your reads" : "Buy guaranteed reads",
    line: id ? "Every read in this checkout, from offer to verified delivery." : "Tell Orbe what you want. Pay only for reads delivered and verified.",
    tags: [["Paid on verified delivery", "sky"], ["Creators set their own price", "line"]],
    back: id ? ["Buy more reads", "/orbe-site/demo/app/reads"] : null,
  });
  if (!id) return newCheckout(work, ctx);
  await status(work, ctx);
}

