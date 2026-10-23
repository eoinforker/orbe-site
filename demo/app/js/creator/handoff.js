/*
  Hand it off: one card on Deals. The creator sets their rules once; Orbe's
  assistant answers offers inside them and shows what it did and why. What
  waits for a person sits in "Waiting on you" here, in the bell and in the
  deal's own drawer; what it did this week sits under it.

  Everything is read from GET /v1/me/deals/handoff (the Action view in the
  handoff service). A server without the feature answers 404, and the card
  then draws nothing. Agreeing is never hidden: an accept shows the accept
  notice before Approve, and Counter for me says that a brand accepting a
  counter agrees the deal.
*/
import { api, can, on, SentToOwner, seg } from "../api.js";
import { button, choice, table, twoLine } from "../cards.js";
import { ago, drawer, section } from "../console-ui.js";
import { formatName } from "../terms.js";
import { check, confirmBox, field, form, h, input, money, select, textarea, toast } from "../ui.js";

/* ---------------------------------------------------------------- words */

/* What each kind of action is called while it waits, while it is due, and once done. */
const VERB = {
  accept: ["Accept", "Accepting", "Accepted"],
  counter: ["Counter", "Countering", "Countered"],
  decline: ["Decline", "Declining", "Declined"],
};
const PLAIN = { done: 2, stopped: 0, dismissed: 0, failed: 0, superseded: 0, waiting: 0, scheduled: 1 };
const AFTER = { stopped: "Stopped", dismissed: "Left for you", failed: "Could not be done", superseded: "Replaced" };

const priced = (a) => (a.amount ? ` at ${money(a.amount)}` : "");

const clock = (iso, now = new Date()) => {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "";
  const hm = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return t.toDateString() === now.toDateString() ? hm : `${t.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at ${hm}`;
};

/** A server title as a sentence; a note waiting for the creator says the answer is theirs. */
const titled = (a) => {
  const t = a.kind === "note" && a.state === "waiting" ? String(a.title ?? "").replace(/^Your answer: /, "Yours to answer: ") : String(a.title ?? "");
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/** One line for an action, in the words its state calls for: "Accept Kettle and Seed at £900." */
export function headline(a, now = new Date()) {
  const v = VERB[a.kind];
  if (!v) return titled(a);
  const words = `${v[PLAIN[a.state] ?? 0]} ${a.brandName}${priced(a)}`;
  if (a.state === "scheduled") return `${words}${a.runAt ? `, at ${clock(a.runAt, now)} unless you stop it` : ""}.`;
  if (AFTER[a.state]) return `${AFTER[a.state]}: ${words.charAt(0).toLowerCase()}${words.slice(1)}.`;
  return `${words}.`;
}

/** What follows a counter, said plainly wherever one is shown. */
const counterLine = (a) => `A counter cannot be taken back. If ${a.brandName} accepts it, the deal is agreed.`;

/** The bell's and Home's items: each action waiting for a person, linked to where it is decided. */
export function queueItems(state) {
  return (state?.queue ?? [])
    .filter((a) => a.state === "waiting")
    .map((a) => {
      const line = headline(a).replace(/\.$/, "");
      // A note asks nothing to be approved: the answer is the creator's own.
      return { title: a.kind === "note" ? line : `Approve: ${line.charAt(0).toLowerCase()}${line.slice(1)}`, line: a.why, href: `/orbe-site/demo/app/deals?handoff=${seg(a.id)}`, kind: "handoff", id: a.id, offerId: a.offerId };
    });
}

/** The handoff state, or null where the feature is not on this server (404) or this role cannot see money. */
export async function readHandoff() {
  if (!on("deals_agent") || !can("read.money")) return null;
  try {
    return await api.get("/v1/me/deals/handoff");
  } catch (e) {
    if (e?.status === 404 || e?.status === 403) return null;
    throw e;
  }
}

const SENT = "Sent to the owner to approve. Nothing has changed yet.";

/**
  Whose Hand it off a card works on. The creator's own is the default; an
  agency's Roster passes a creator's (brand/roster-handoff.js), with the
  roster's address for it and what the creator's grant lets the manager do.
  The server has already narrowed each action's own can for the manager.
*/
export const OWN = {
  own: true,
  base: "/v1/me/deals/handoff",
  name: null,
  read: () => readHandoff(),
  /** Whether Rules and the switch are offered: a manager may always ask, and the server says where it went. */
  may: (action) => can(action),
};

/** A save the server sent to the creator to decide (202, waitingFor "creator"): its words, or null when it was done. */
const toCreator = (r) => (r?.waitingFor === "creator" ? r.message : null);

/* ---------------------------------------------------------------- one action */

const PERSON = { person: "Edited by you" };

function messageFold(a) {
  if (!a.message) return null;
  return h("details", { class: "dl-fold ho-msg" },
    h("summary", null, "The message"),
    h("article", { class: "cn-msg" },
      h("header", { class: "cn-msg-head" }, h("p", { class: "cn-msg-who" }, PERSON[a.message.draftedBy] ?? "Drafted by Orbe's assistant")),
      a.message.subject ? h("p", { class: "cn-msg-subject" }, a.message.subject) : null,
      h("p", { class: "cn-msg-body" }, a.message.body),
    ),
  );
}

/** What a person sees once an action has run: the toast after Approve or Do it now. */
const doneLine = (a) =>
  a.kind === "accept" ? `Accepted ${a.brandName}${priced(a)}. Money is held when they fund, and paid out on verified delivery.`
    : a.kind === "counter" ? `Counter sent to ${a.brandName}. If they accept it, the deal is agreed.`
      : a.kind === "decline" ? `Declined ${a.brandName}.`
        : "Done.";

/**
  One waiting or scheduled action with its buttons. A waiting accept carries
  the accept notice and a box to tick before Approve; Edit message opens the
  draft to change; Not this one leaves the offer for the creator. A scheduled
  one can be done now or stopped until its time.
*/
function actionItem(a, opts) {
  const scope = opts.scope ?? OWN;
  const changed = () => opts.changed?.(a);
  // The card's items carry an id for the bell's link; the drawer's copy of one must not repeat it.
  const head = h("p", { class: "ho-item-t", id: opts.inDrawer ? null : `ho-${a.id}`, tabindex: "-1" }, headline(a));
  const why = a.why ? h("p", { class: "ho-item-d" }, a.why) : null;
  const may = scope.may("business");
  let body = null;
  if (a.state === "scheduled") {
    body = may
      ? h("div", { class: "cn-dw-actions" },
          a.can?.approve ? button("Do it now", async () => {
            try {
              await api.post(`${scope.base}/actions/${seg(a.id)}/approve`, {});
            } catch (e) {
              if (e instanceof SentToOwner) return null;
              throw e;
            }
            // After the deal redraws (an accept opens its booking), so the line shows above the drawer.
            await opts.approved?.(a);
            toast(doneLine(a));
            return null;
          }, { primary: true }) : null,
          a.can?.stop ? button("Stop", async () => {
            await api.post(`${scope.base}/actions/${seg(a.id)}/stop`, {});
            changed();
            return "Stopped. Nothing was sent.";
          }) : null,
        )
      : null;
  } else if (a.state === "waiting") {
    const edit = a.can?.edit && a.can?.approve && a.message ? textarea({ name: "message", rows: 8, maxlength: 5000, value: a.message.body }) : null;
    const editField = edit ? field("Your message", edit, "Sent as you write it when you approve.") : null;
    // An email to a brand Orbe has no address for cannot go as it is: the address is asked for here, and Approve needs it.
    const to = a.needsEmail && a.can?.approve ? field(`${a.brandName}'s email address`, input({ name: "brandEmail", type: "email", required: true, maxlength: 254, autocomplete: "off", placeholder: "name@example.com" }), "Orbe sends it here. Without it, copy the message and send it yourself.") : null;
    if (editField) editField.hidden = true;
    const editBtn = editField ? button("Edit message", () => {
      editField.hidden = false;
      editBtn.hidden = true;
      edit.focus();
    }, { quiet: true }) : null;
    const note = a.kind === "note";
    const extra = [
      editBtn,
      note && a.offerId && opts.open && !opts.inDrawer && scope.own ? button("Open the offer", () => opts.open(a), { primary: true }) : null,
      note && a.can?.dismiss ? button("Clear", async () => {
        await api.post(`${scope.base}/actions/${seg(a.id)}/dismiss`, {});
        changed();
        return null;
      }, { quiet: true }) : null,
      !note && a.can?.dismiss ? button("Not this one", async () => {
        const sure = await confirmBox(scope.own ? `Orbe does nothing more with it, and ${a.brandName}'s offer stays for your own answer.` : `Orbe does nothing more with it, and ${a.brandName}'s offer stays for ${scope.name} to answer.`, { title: scope.own ? "Leave this one for you?" : `Leave this one for ${scope.name}?`, yes: "Not this one" });
        if (!sure) return null;
        await api.post(`${scope.base}/actions/${seg(a.id)}/dismiss`, {});
        changed();
        return "Left for you. Nothing was sent.";
      }, { quiet: true }) : null,
    ].filter(Boolean);
    body = may && a.can?.approve
      ? form(
          [
            a.notice ? h("p", { class: "dl-notice ho-notice" }, a.notice) : null,
            a.notice ? check("I have read this and want to accept.", { name: "seen", required: true }) : null,
            to,
            editField,
          ],
          "Approve",
          async (fd) => {
            const msg = edit && !editField.hidden ? String(fd.get("message") ?? "").trim() : "";
            try {
              const brandEmail = to ? String(fd.get("brandEmail") ?? "").trim() : "";
              await api.post(`${scope.base}/actions/${seg(a.id)}/approve`, { ...(a.notice ? { noticeShown: true } : {}), ...(brandEmail ? { email: brandEmail } : {}), ...(msg && msg !== a.message.body.trim() ? { message: msg } : {}) });
            } catch (e) {
              if (e instanceof SentToOwner) return SENT;
              throw e;
            }
            // After the deal redraws (an accept opens its booking), so the line shows above the drawer.
            await opts.approved?.(a);
            toast(doneLine(a));
            return null;
          },
          { extra },
        )
      : may && extra.length ? h("div", { class: "cn-dw-actions" }, extra) : null;
  }
  // Approve is the card's own small primary button, the same size as Do it now and Stop.
  body?.querySelector?.("button[type=submit]")?.setAttribute("class", "cn-btn cn-btn--s cn-btn--primary");
  return h("li", { class: `ho-item ho-item--${a.state}`, "data-id": a.id },
    head,
    why,
    a.kind === "counter" ? h("p", { class: "ho-item-d" }, counterLine(a)) : null,
    // On a roster, what the creator keeps for themselves says so instead of offering a button that would be refused.
    a.waitsFor ? h("p", { class: "ho-item-d ho-waits" }, a.waitsFor) : null,
    a.state === "waiting" ? messageFold(a) : null,
    body,
  );
}

/** A deal's own action, at the top of its drawer: what Orbe is about to do or waits to do, with the same buttons. */
export function dealHandoff(d, done) {
  const box = h("div", { class: "ho-deal" });
  readHandoff().then((s) => {
    const mine = (s?.queue ?? []).filter((a) => (d.kind === "offer" ? a.offerId === d.id : a.bookingId === d.id || (a.offerId && a.offerId === d.x?.offerId)));
    if (!mine.length) return;
    box.replaceChildren(
      h("p", { class: "ho-deal-t" }, "Orbe's assistant"),
      h("ul", { class: "ho-list" }, mine.map((a) => actionItem(a, { changed: done, approved: done, inDrawer: true }))),
    );
  }).catch(() => {});
  return box;
}

/**
  A deal's timeline with the assistant's entries between the brand's and the
  booking's. draw(entries) is Deals' own timeline; until the merged one comes
  (or where it cannot), the deal's own audit stays.
*/
export function dealTimeline(d, draw) {
  const box = h("div", null, draw(d.x.audit));
  if (!on("deals_agent") || !can("read.money")) return box;
  const q = d.kind === "booking" ? `booking=${seg(d.id)}` : `offer=${seg(d.id)}`;
  api.get(`/v1/me/deals/handoff/timeline?${q}`).then((r) => {
    // Drawn oldest first, as a deal's audit is, whatever order the answer keeps.
    if (r?.items?.length) box.replaceChildren(draw([...r.items].sort((x, y) => String(x.at ?? "").localeCompare(String(y.at ?? "")))));
  }).catch(() => {});
  return box;
}

/* ---------------------------------------------------------------- the rules */

/* The formats the assistant prices, by the sponsor module's names, as deals.js lists them. */
const PRICED = [["integration", "youtube"], ["dedicated", "youtube"], ["newsletter_slot", "substack"], ["podcast_read", "podcast"]];
const TONES = [["warm", "Warm"], ["brief", "Brief"], ["formal", "Formal"]];
const pence = (v) => (String(v ?? "").trim() === "" ? undefined : Math.round(Number(v) * 100));
const list = (fd, k) => String(fd.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const dayText = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const awayBox = (b) => check(`${dayText(b.start)} to ${dayText(b.end)}`, { name: "away", value: `${b.start}|${b.end}`, checked: true });

/** Dates away: each kept by a tick, and From and To with Add dates for another. */
function awayDates(blocked, scope = OWN) {
  const kept = h("div", { class: "ho-away" }, blocked.map(awayBox));
  const from = input({ type: "date", name: "awayFrom" });
  const to = input({ type: "date", name: "awayTo" });
  const say = h("p", { class: "ap-hint", "aria-live": "polite" });
  const add = h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => {
    if (!from.value || !to.value) return (say.textContent = "Choose both days first.");
    if (to.value < from.value) return (say.textContent = "The last day comes after the first.");
    if (kept.querySelectorAll("input[name=away]").length >= 20) return (say.textContent = "Up to 20 sets of dates.");
    kept.append(awayBox({ start: from.value, end: to.value }));
    say.textContent = `Added ${dayText(from.value)} to ${dayText(to.value)}.`;
    from.value = "";
    to.value = "";
    from.focus();
  } }, "Add dates");
  return h("fieldset", { class: "dl-fs" },
    h("legend", null, scope.own ? "Dates you are away" : `Dates ${scope.name} is away`),
    kept,
    h("div", { class: "cn-grid2" }, field("From", from), field("To", to)),
    h("div", null, add),
    say,
  );
}

/**
  The rules drawer: the least taken per format, who and what to avoid, the
  month's most and the dates away, then what Orbe may do without asking,
  and its voice. Saving while off switches it on.
*/
export function rulesDrawer(state, reload, ctx = {}) {
  const scope = ctx.scope ?? OWN;
  // The card is drawn again once the drawer has closed and handed the focus back to Rules, so the new Rules keeps it.
  let saved = false;
  drawer(scope.own ? "Your rules" : `${scope.name}'s rules`, (close) => {
    const l = state.rules ?? {};
    const acc = l.accept ?? { mode: "ask" };
    const autoAccept = acc.mode === "auto";
    const above = input({ name: "above", type: "number", min: "1", step: "1", inputmode: "decimal", value: autoAccept ? String(acc.above / 100) : "", "aria-label": "Accept at or above, in pounds" });
    const notice = ctx.notice || state.acceptNotice || null;
    const consent = h("div", { class: "ho-consent" },
      notice ? h("p", { class: "dl-notice ho-notice" }, notice) : null,
      check("I have read this and want Orbe to accept for me.", { name: "acceptSeen", checked: autoAccept }),
    );
    const ask = h("input", { type: "radio", name: "acceptMode", value: "ask", checked: !autoAccept });
    const auto = h("input", { type: "radio", name: "acceptMode", value: "auto", checked: autoAccept });
    const sync = () => {
      consent.hidden = !auto.checked;
      above.disabled = !auto.checked;
      above.required = auto.checked;
      consent.querySelector("input").required = auto.checked;
    };
    ask.addEventListener("change", sync);
    auto.addEventListener("change", sync);
    sync();
    const tone = l.tone ?? { style: "warm", signOff: "" };
    const f = form(
      [
        h("fieldset", { class: "dl-fs" },
          h("legend", null, scope.own ? "Least you take" : `Least ${scope.name} takes`),
          h("div", { class: "cn-grid2" }, PRICED.map(([fm, kind]) => field(`${formatName(fm, kind)} (£)`, input({ name: `min_${fm}`, type: "number", min: "0", step: "1", inputmode: "decimal", value: l.minimums?.[fm] ? String(l.minimums[fm] / 100) : "" })))),
        ),
        field("Brands to avoid", input({ name: "avoidBrands", value: (l.avoidBrands ?? []).join(", "), maxlength: 2000 }), "Separated by commas."),
        field("Categories to avoid", input({ name: "avoidCategories", value: (l.avoidCategories ?? []).join(", "), maxlength: 2000 }), "As brands give them, for example gambling, crypto."),
        h("div", { class: "cn-grid2" },
          field("Most reads a month", input({ name: "maxReads", type: "number", min: "1", max: "60", step: "1", value: l.maxReadsPerMonth ?? "" }), "Leave empty for no limit."),
          field("Notice (days)", input({ name: "leadDays", type: "number", min: "0", max: "120", step: "1", value: l.leadDays ?? 7, required: true }), "The least time before a read goes live."),
        ),
        awayDates(l.blockedDates ?? [], scope),
        h("fieldset", { class: "dl-fs ho-alone" },
          h("legend", null, "What Orbe may do without asking"),
          choice("Decline for me", { name: "autoDecline", checked: l.autoDecline !== false, role: "switch" }, "When an offer breaks a rule above: a brand or category you avoid, dates you are away, too little notice or a full month. You have 30 minutes to stop it."),
          choice("Counter for me", { name: "autoCounter", checked: !!l.autoCounter, role: "switch" }, "Below your floor, at most twice. If a brand accepts a counter, the deal is agreed, with no further tap from you. Money is held until delivery is verified."),
          choice("Remind brands to fund", { name: "chase", checked: l.chase !== false, role: "switch" }, "A short email from Orbe to a brand that has not funded an agreed booking."),
        ),
        scope.own
          ? h("fieldset", { class: "dl-fs ho-accept" },
              h("legend", null, "Accepting"),
              h("label", { class: "ap-check" }, ask, h("span", null, "Always ask me")),
              h("label", { class: "ap-check ho-above" }, auto, h("span", null, "Accept for me at or above £"), above),
              consent,
            )
          // Accepting for a creator is theirs alone to switch on or change: they read the accept notice themselves.
          : h("div", { class: "dl-fs ho-accept" },
              h("p", { class: "ho-h" }, "Accepting"),
              h("p", { class: "ho-item-d" }, `${autoAccept ? `Accepts for ${scope.name} at or above ${money({ amount: acc.above, currency: "GBP" })}.` : `Always asks ${scope.name} before accepting.`} Only ${scope.name} can change this.`),
            ),
        h("div", { class: "cn-grid2" },
          field("Tone", select(TONES, { name: "tone", value: tone.style })),
          field("Sign off as", input({ name: "signOff", maxlength: 40, value: tone.signOff ?? "", autocomplete: "off" })),
        ),
        state.models?.available ? choice("Draft with a model", { name: "modelDrafts", checked: !!l.modelDrafts, role: "switch" }, "Off unless you turn it on. A draft that names a figure Orbe cannot show is replaced by a plain one.") : null,
      ],
      state.enabled ? "Save rules" : "Save and switch on",
      async (fd) => {
        const minimums = {};
        for (const [fm] of PRICED) {
          const v = pence(fd.get(`min_${fm}`));
          if (v) minimums[fm] = v;
        }
        const max = String(fd.get("maxReads") ?? "").trim();
        const blockedDates = fd.getAll("away").map((x) => String(x).split("|")).map(([start, end]) => ({ start, end }));
        const from = String(fd.get("awayFrom") ?? "");
        const to = String(fd.get("awayTo") ?? "");
        if (from && to && to >= from) blockedDates.push({ start: from, end: to });
        const mode = !scope.own ? acc : fd.get("acceptMode") === "auto"
          ? { mode: "auto", above: pence(fd.get("above")), noticeShownAt: acc.mode === "auto" && acc.noticeShownAt ? acc.noticeShownAt : new Date().toISOString() }
          : { mode: "ask" };
        const { outbound: _skip, ...kept } = l;
        const rules = {
          ...kept,
          minimums,
          avoidBrands: list(fd, "avoidBrands"),
          avoidCategories: list(fd, "avoidCategories"),
          maxReadsPerMonth: max === "" ? null : Number(max),
          leadDays: Number(fd.get("leadDays") || 0),
          blockedDates,
          autoDecline: fd.get("autoDecline") === "on",
          autoCounter: fd.get("autoCounter") === "on",
          chase: fd.get("chase") === "on",
          accept: mode,
          tone: { style: String(fd.get("tone") || "warm"), signOff: String(fd.get("signOff") ?? "").trim() },
          ...(state.models?.available ? { modelDrafts: fd.get("modelDrafts") === "on" } : {}),
        };
        try {
          const r = await api.put(scope.base, { ...(state.enabled ? {} : { enabled: true }), rules });
          const asked = toCreator(r);
          if (asked) return asked;
        } catch (e) {
          if (e instanceof SentToOwner) return SENT;
          throw e;
        }
        // Saving sets aside what waited under the old rules; a pass now decides it again, so the card is never left empty for a minute.
        await api.post(`${scope.base}/run`, {}).catch(() => {});
        saved = true;
        close();
        toast(state.enabled ? "Rules saved. New offers are answered inside them." : "Hand it off is on. New offers are answered within a minute.");
        return null;
      },
    );
    f.classList.add("cn-form", "ho-rules-form");
    return [h("p", { class: "dl-notice" }, scope.own ? "Orbe answers offers inside these rules and shows you why each time. Anything outside them waits for you." : scope.rules ? `Orbe answers ${scope.name}'s offers inside these rules. ${scope.name} lets you change them; each change is in their activity.` : `Orbe answers ${scope.name}'s offers inside these rules. A change you save goes to ${scope.name} to approve, with each old and new value.`), f];
  }, { wide: true, onClose: () => saved && reload() });
}

/* ---------------------------------------------------------------- the card */

/** The week's lines: what Orbe did, newest first, each with why. */
function doneList(recent, limit) {
  return h("ul", { class: "ho-list ho-list--done" }, recent.slice(0, limit).map((a) =>
    h("li", { class: "ho-done" },
      h("p", { class: "ho-item-t" }, headline(a)),
      h("p", { class: "ho-item-d" }, [a.why, a.kind === "counter" && a.state === "done" ? counterLine(a) : null].filter(Boolean).join(" ")),
      h("time", { class: "ho-at", datetime: a.doneAt ?? a.createdAt }, ago(a.doneAt ?? a.createdAt)),
    ),
  ));
}

function allDone(recent) {
  drawer("Done this week", () => [
    h("p", { class: "dl-notice" }, "Everything Orbe's assistant did or proposed in the last seven days, with the rule it followed."),
    table([["What"], ["Why"], ["When"]], recent.map((a) => [twoLine(headline(a), a.kind === "counter" && a.state === "done" ? counterLine(a) : null), a.why ?? "", ago(a.doneAt ?? a.createdAt)]), { caption: "Done this week" }),
  ], { wide: true });
}

/** A group of actions under its heading, with how many; nothing when there are none. */
function group(id, title, items, opts) {
  if (!items.length) return null;
  id = `${opts.scope?.own === false ? "hr" : "ho"}-${id}`;
  return h("section", { class: "ho-group", "aria-labelledby": id },
    h("h3", { class: "ho-h", id }, title, h("span", { class: "ho-n" }, String(items.length))),
    h("ul", { class: "ho-list" }, items.map((a) => actionItem(a, opts))),
  );
}

/** Marks an element so the card gives it the focus back when it is drawn again. */
const keepAs = (el, key) => ((el.dataset.keep = key), el);

/** A switch on the card: the change is sent at once and the box goes back if it is refused or asked of the owner. */
function switchRow(label, checked, hint, send, say, keep) {
  const row = choice(label, { checked, role: "switch" }, hint);
  const box = row.querySelector("input");
  box.dataset.keep = keep;
  // Held while the change is sent, but never disabled: a disabled box drops the keyboard's focus.
  let busy = false;
  box.addEventListener("change", async () => {
    if (busy) return (box.checked = !box.checked);
    const want = box.checked;
    busy = true;
    box.setAttribute("aria-busy", "true");
    try {
      await send(want);
    } catch (e) {
      box.checked = !want;
      say(e instanceof SentToOwner ? SENT : e.message ?? "That did not work. Try again.");
    } finally {
      busy = false;
      box.removeAttribute("aria-busy");
    }
  });
  return row;
}

/**
  The card on Deals, after the money: off, a line and Set your rules; on, the
  rules in a few lines, what waits on you, what was done this week, and
  proposing your slots to brands. ctx: { notice, reload, focus }, focus
  being an action's id to bring into view (from the bell).
  Draws nothing where the server has no Hand it off.
*/
export function handoffCard(ctx = {}) {
  const scope = ctx.scope ?? OWN;
  const slot = h("div", { class: "ho-slot" });
  let timer = 0;
  const load = async (focusId) => {
    clearTimeout(timer);
    let s;
    let sender = null;
    try {
      [s, sender] = await Promise.all([scope.read(), scope.own && on("deals_agent") && can("read.money") ? api.get("/v1/me/deals/sender").then((r) => r.sender, () => null) : null]);
    } catch {
      return;
    }
    if (!s || !slot.isConnected) return slot.replaceChildren();
    // Whatever had the focus (a switch, Rules) has it again once the card is drawn afresh.
    const keep = slot.contains(document.activeElement) ? document.activeElement.dataset.keep : null;
    slot.replaceChildren(draw(s, sender));
    if (keep) slot.querySelector(`[data-keep="${keep}"]`)?.focus({ preventScroll: true });
    // A countdown that has run out: read again once the assistant has acted, while the card is still on screen.
    const due = (s.queue ?? []).filter((a) => a.state === "scheduled" && a.runAt).map((a) => Date.parse(a.runAt)).filter(Number.isFinite);
    const soonest = due.length ? Math.min(...due) - Date.now() + 65_000 : null;
    if (soonest !== null && soonest < 3_600_000) timer = setTimeout(() => slot.isConnected && load(), Math.max(5_000, soonest));
    if (focusId) reveal(focusId);
  };
  const reveal = (id) => {
    const item = slot.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!item) return toast("That one is no longer waiting. What Orbe did is under Done this week.");
    item.classList.add("is-asked");
    item.querySelector("details")?.setAttribute("open", "");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    item.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    // Focus moves to it for a screen reader; the highlight shows where it is, so no ring is drawn.
    item.querySelector(".ho-item-t")?.focus({ preventScroll: true, focusVisible: false });
  };
  const draw = (s, sender) => {
    const note = h("div", { class: "ho-say", role: "status" });
    const say = (text) => note.replaceChildren(h("p", null, text));
    const changed = () => (load(), ctx.changed?.());
    const approved = (a) => (ctx.reload ? ctx.reload({ open: a.offerId ? { offerId: a.offerId } : null }) : changed());
    const open = ctx.reload ? (a) => ctx.reload({ open: { offerId: a.offerId } }) : null;
    const editRules = () => rulesDrawer(s, changed, { ...ctx, scope });
    const tag = s.demo ? h("span", { class: "cn-tag cn-tag--line" }, "Sample data") : null;
    if (!s.enabled) {
      return section(
        { title: "Hand it off", line: scope.own ? "Set your rules once. Orbe answers new offers inside them. Nothing is agreed unless your rules allow it." : `Off for ${scope.name}. Orbe answers new offers inside their rules once it is on. Nothing is agreed unless the rules allow it.`, actions: tag, cls: "ho ho--off" },
        scope.may("business") ? h("div", { class: "cn-dw-actions" }, button(scope.own ? "Set your rules" : "Set rules", () => editRules(), { primary: true })) : h("p", { class: "ho-item-d" }, "The team's owner sets the rules."),
        note,
      );
    }
    const queue = s.queue ?? [];
    const recent = s.recent ?? [];
    // An entry Orbe replaced with a fresh decision is in See all, not among the few the card shows.
    const shown = recent.filter((a) => a.state !== "superseded");
    // The switch has its own visible words, so Rules beside it is never read as its name.
    const head = [
      tag,
      scope.may("business")
        ? switchRow("Answering offers", true, null, async () => {
            const asked = toCreator(await api.put(scope.base, { enabled: false }));
            if (asked) throw new Error(asked);
            toast("Hand it off is off. Nothing waiting was sent.");
            changed();
          }, say, "handoff")
        : null,
      scope.may("business") ? keepAs(button("Rules", () => editRules(), { quiet: true }), "rules") : null,
    ];
    const paused = sender?.paused ? h("p", { class: "ho-paused" }, "Sending is paused after bounces. Orbe will draft but not send.") : null;
    const outbound = s.outbound ?? { on: false, perWeek: 3, sentThisWeek: 0 };
    const outHint = `Up to ${outbound.perWeek} ${outbound.perWeek === 1 ? "brand" : "brands"} a week that sponsor creators like you. Each email waits for your approval.${outbound.on && outbound.sentThisWeek ? ` ${outbound.sentThisWeek} sent this week.` : ""}`;
    const foot = h("div", { class: "ho-foot" },
      scope.may("consent")
        ? switchRow("Propose my slots to brands", !!outbound.on, outHint, async (want) => {
            await api.put("/v1/me/deals/handoff/outbound", { on: want, perWeek: outbound.perWeek });
            toast(want ? "On. Each email waits for your approval." : "Off. Orbe writes to no brand on its own.");
            changed();
          }, say, "outbound")
        : h("p", { class: "ho-item-d" }, outbound.on ? `Proposing ${scope.own ? "your" : `${scope.name}'s`} slots to up to ${outbound.perWeek} brands a week.` : `Not proposing ${scope.own ? "your" : `${scope.name}'s`} slots to brands.`),
      s.demo && scope.own && can("business")
        ? button("Send a made-up offer", async () => {
            const r = await api.post("/v1/me/deals/handoff/demo-offer", {});
            const first = r?.actions?.[0];
            await load(first?.id);
            return first ? `Made-up offer in. ${headline(first)}` : "Sent. Orbe answers it within a minute.";
          })
        : null,
    );
    return section(
      { title: "Hand it off", line: "On. New offers are answered within a minute.", actions: head, cls: "ho" },
      s.summary?.length ? h("ul", { class: "ho-rules", "aria-label": scope.own ? "Your rules" : `${scope.name}'s rules` }, s.summary.map((line) => h("li", null, line))) : null,
      paused,
      note,
      group("waiting", scope.own ? "Waiting on you" : "Waiting", queue.filter((a) => a.state === "waiting"), { changed, approved, open, scope }),
      group("soon", "About to happen", queue.filter((a) => a.state === "scheduled"), { changed, approved, scope }),
      recent.length
        ? h("section", { class: "ho-group", "aria-labelledby": "ho-done" },
            h("h3", { class: "ho-h", id: "ho-done" }, "Done this week"),
            shown.length ? doneList(shown, 3) : null,
            recent.length > Math.min(shown.length, 3) ? h("div", null, button("See all", () => allDone(recent), { quiet: true })) : null,
          )
        : null,
      !queue.length && !recent.length ? h("p", { class: "ho-empty" }, "Nothing yet. New offers will show here with what Orbe did and why.") : null,
      foot,
    );
  };
  load(ctx.focus ?? undefined);
  return slot;
}
