/*
  Two tabs inside Sponsorships, each behind its own feature:

  - Sponsors like you (sponsor_finder): brands that sponsor channels like
    yours, from their public works, with the evidence, how clearly they
    were labelled, and a price only where Orbe can stand behind one.
  - Assistant (deals_agent): the conversations Orbe's assistant keeps
    (found, drafted, waiting on you, countered, agreed), each with its
    drafts, and how its emails are sent. Its rules, and what it may do
    without asking, live in Hand it off on Deals (handoff.js); a reply or
    outreach email never goes without a person's tap.
*/
import { api, can, on, seg } from "../api.js";
import { emptyState, pill, section, segmented, skeleton } from "../console-ui.js";
import { connectEmpty } from "../connect-inline.js";
import { formatName } from "../terms.js";
import { action, block, confirmBox, count, day, field, form, h, input, money, textarea, toast, when } from "../ui.js";

const STAGE_WORDS = { found: "Found", drafted: "Drafted", waiting: "Waiting on you", countered: "Countered", agreed: "Agreed", closed: "Closed" };
const STAGE_TONE = { found: "idle", drafted: "idle", waiting: "needs", countered: "running", agreed: "done", closed: "off" };
const fmt = (f) => formatName(f).toLowerCase();
const row = (...btns) => h("div", { class: "cn-dw-actions" }, btns);

/* ---------------------------------------------------------------- sponsors like you */

function disclosureLine(d) {
  const all = d.labelled + d.unclear + d.noneSeen;
  if (!all) return null;
  if (d.labelled === all) return "Always labelled as an ad.";
  if (!d.labelled) return `No clear ad label seen in ${all === 1 ? "the read" : `${all} reads`}. Orbe may not see a spoken one.`;
  return `Labelled clearly in ${d.labelled} of ${all}${d.unclear ? `, unclearly in ${d.unclear}` : ""}. Orbe may not see a spoken label.`;
}

/* What creators like this account are called: channels, shows, newsletters (services/finder.ts PEER_WORDS). */
const like = (acc) => `${acc.peerWord ?? "channels"} like yours`;

function brandRow(b, acc, goAssistant) {
  const more = h("details", { class: "dl-fold" }, h("summary", null, `Where it was seen (${b.evidence.length})`),
    h("ul", { class: "cn-evidence" },
      b.evidence.map((e) =>
        h("li", null,
          h("p", { class: "cn-evidence-t" }, `${day(e.date)}, ${e.placement.toLowerCase()}${e.creator ? `, ${e.creator}` : ""}`),
          e.seen ? h("p", { class: "cn-evidence-q" }, `“${e.seen}”`) : null,
          e.url ? h("a", { href: e.url, target: "_blank", rel: "noopener" }, "Open the public work") : null,
        ),
      ),
    ),
  );
  const draft =
    on("deals_agent") && can("business")
      ? action("Draft outreach", async () => {
          const made = await api.post("/v1/me/deals/threads", { brandName: b.name });
          await api.post(`/v1/me/deals/threads/${seg(made.thread.id)}/outreach`, {});
          goAssistant?.();
          return `A draft to ${b.name} is waiting under Assistant. Nothing has been sent.`;
        })
      : null;
  return h("li", { class: "cn-brand" },
    h("div", { class: "cn-brand-main" },
      h("p", { class: "cn-brand-name" }, b.name, " ", b.confirmed ? null : h("span", { class: "cn-tag" }, "Detected name")),
      h("p", { class: "cn-brand-line" }, `Seen with ${count(b.peers)} ${like(acc)}, ${count(b.deals)} reads, most recently ${day(b.lastSeen)}. Usually: ${b.typicalFormat.toLowerCase()}.`),
      disclosureLine(b.disclosure) ? h("p", { class: "cn-brand-line cn-brand-line--quiet" }, disclosureLine(b.disclosure)) : null,
      b.settled ? h("p", { class: "cn-brand-line" }, `Orbe settled ${count(b.settled.count)} bookings with them at ${money(b.settled.low)} to ${money(b.settled.high)}.`) : null,
      more,
    ),
    draft ? row(draft) : null,
  );
}

export function finderTab(el, goAssistant) {
  el.replaceChildren(skeleton(4));
  return block(el, () => api.get("/v1/me/sponsor-finder"), ({ accounts }) => {
    if (!accounts.length) return connectEmpty("search", "Connect an account or add your show first.", "Orbe finds creators like you from your own account.", { reload: () => finderTab(el, goAssistant) });
    // Accounts with nothing found yet share one empty state, rather than one each.
    const found = accounts.filter((a) => a.brands.length || a.yourRange.length);
    const bare = accounts.filter((a) => !found.includes(a));
    const quiet = bare.length
      ? section(
          { title: found.length ? "Nothing found yet" : "Sponsors like you", line: `For ${bare.map((a) => a.handle).join(", ")}.` },
          emptyState("search", bare.some((a) => a.alike ?? a.peers.length) ? "No brands seen with creators like you yet." : "No creators like you found yet.", [], bare.some((a) => a.alike ?? a.peers.length) ? "Orbe reads their public works in the background, each at most once a week. Look again in a day or two." : "As more creators your size join Orbe, this fills in."),
          h("details", { class: "dl-fold" }, h("summary", null, "How this is worked out"),
            h("ul", { class: "cn-points" }, [...new Set(bare.flatMap((a) => [...a.notes, a.notice]))].map((n) => h("li", null, n))),
          ),
          h("p", { class: "cn-label" }, bare[0].label),
        )
      : null;
    return [...found.map((acc) =>
      section(
        { title: acc.handle, line: `${count(acc.alike ?? acc.peers.length)} ${like(acc)}, matched on ${acc.basis === "topic" ? "the words in your titles and your size" : "your size"}.` },
        acc.yourRange.length ? h("p", { class: "cn-range" }, "Your own results support ", acc.yourRange.map((r, i) => [i ? "; " : "", h("b", null, `${money(r.low)} to ${money(r.high)}`), ` for ${fmt(r.format)}`]), ".") : null,
        acc.brands.length
          ? h("ul", { class: "cn-brands" }, acc.brands.map((b) => brandRow(b, acc, goAssistant)))
          : emptyState("search", (acc.alike ?? acc.peers.length) ? `No brands seen with ${like(acc)} yet.` : `No ${like(acc)} found yet.`, [], (acc.alike ?? acc.peers.length) ? "Orbe reads their public works in the background, each at most once a week. Look again in a day or two." : "As more creators your size join Orbe, this fills in."),
        acc.withheld.youtube ? h("p", { class: "cn-label" }, `${count(acc.withheld.youtube)} YouTube reads withheld. ${acc.withheld.reason}`) : null,
        h("details", { class: "dl-fold" }, h("summary", null, "How this is worked out"),
          h("ul", { class: "cn-points" }, [...acc.notes, acc.notice].map((n) => h("li", null, n))),
        ),
        h("p", { class: "cn-label" }, acc.label),
      ),
    ), quiet].filter(Boolean);
  });
}

/* ---------------------------------------------------------------- the assistant */

function messageView(t, m, reload) {
  const [subjectLine, ...rest] = m.body.startsWith("Subject: ") ? m.body.split("\n\n") : [null, m.body];
  const who = m.direction === "in" ? t.brandName : m.direction === "note" ? "Orbe's assistant" : m.status === "draft" ? "Draft for you" : "You";
  const status = m.status === "draft" ? pill("needs", "Not sent") : m.status === "sent" ? pill("done", `Sent ${when(m.sentAt)}`) : m.status === "sent_by_you" ? pill("done", "Sent by you") : m.status === "discarded" ? pill("idle", "Discarded") : null;
  const draftActions =
    m.status === "draft" && can("business")
      ? row(
          t.brandEmail
            ? action("Send", async () => {
                // The same checks the send enforces, read first so the answer is never a surprise.
                const { review } = await api.get(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/review`);
                const blocked = review.checks.filter((c) => c.blocking && !c.ok);
                if (blocked.length) throw { message: blocked.map((c) => c.text).join(" "), details: blocked.map((c) => ({ path: c.id, message: c.text })) };
                const warn = review.checks.filter((c) => !c.blocking && !c.ok).map((c) => c.text);
                const sure = await confirmBox([...warn, `Subject: ${review.subject}.`, "Replies go to your own email, and the email carries an unsubscribe link."].join(" "), { title: `Send to ${t.brandEmail}?`, yes: "Send" });
                if (!sure) return null;
                await api.post(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/send`, {});
                reload();
                return `Sent to ${t.brandEmail}. Replies come to you.`;
              }, { primary: true })
            : null,
          action("Copy", async () => {
            await navigator.clipboard.writeText(m.body.replace(/^Subject: /, ""));
            return "Copied.";
          }),
          action("I sent it myself", async () => {
            await api.post(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/mark`, { as: "sent_by_you" });
            reload();
            return "Marked as sent.";
          }),
          action("Discard", async () => {
            await api.post(`/v1/me/deals/threads/${seg(t.id)}/messages/${seg(m.id)}/mark`, { as: "discarded" });
            reload();
            return "Discarded.";
          }, { danger: true }),
        )
      : null;
  return h("article", { class: `cn-msg cn-msg--${m.direction}` },
    h("header", { class: "cn-msg-head" }, h("p", { class: "cn-msg-who" }, who), status, h("p", { class: "cn-msg-at" }, when(m.createdAt))),
    subjectLine ? h("p", { class: "cn-msg-subject" }, subjectLine.replace(/^Subject: /, "")) : null,
    h("p", { class: "cn-msg-body" }, rest.join("\n\n")),
    m.facts.length ? h("details", { class: "dl-fold" }, h("summary", null, `Every figure, and where it came from (${m.facts.length})`), h("ul", { class: "cn-points" }, m.facts.map((f) => h("li", null, f.text)))) : null,
    m.guidance.length ? h("ul", { class: "cn-points cn-points--guide" }, m.guidance.map((g) => h("li", null, g))) : null,
    draftActions,
  );
}

function threadView(t, reload) {
  const d = h("details", { class: "cn-thread" },
    h("summary", { class: "cn-thread-sum" },
      h("span", { class: "cn-thread-brand" }, t.brandName),
      pill(STAGE_TONE[t.stage], STAGE_WORDS[t.stage]),
      h("span", { class: "cn-thread-at" }, when(t.updatedAt)),
    ),
  );
  d.addEventListener("toggle", () => {
    if (!d.open || d.childElementCount > 1) return;
    d.append(
      h("div", { class: "cn-thread-body" },
        t.messages.map((m) => messageView(t, m, reload)),
        !t.brandEmail && can("business")
          ? form([field("The brand's email address", input({ name: "email", type: "email", required: true, maxlength: 254 }), "So a draft can be sent from Orbe, with replies going to you.")], "Add", async (fd) => {
              await api.patch(`/v1/me/deals/threads/${seg(t.id)}`, { brandEmail: String(fd.get("email")).trim() });
              reload();
              return "Added.";
            }, { primary: false })
          : null,
        can("business")
          ? row(
              t.origin === "finder" && !t.messages.some((m) => m.status === "draft") ? action("Draft outreach", async () => {
                await api.post(`/v1/me/deals/threads/${seg(t.id)}/outreach`, {});
                reload();
                return "Drafted. Nothing has been sent.";
              }) : null,
              t.stage !== "agreed" ? action("Mark agreed", async () => {
                await api.patch(`/v1/me/deals/threads/${seg(t.id)}`, { stage: "agreed" });
                reload();
                return "Marked agreed.";
              }) : null,
              t.stage !== "closed" ? action("Close", async () => {
                await api.patch(`/v1/me/deals/threads/${seg(t.id)}`, { stage: "closed" });
                reload();
                return "Closed.";
              }, { danger: true }) : null,
            )
          : null,
      ),
    );
  });
  return d;
}

/* ---------------------------------------------------------------- sending */

function sendingSection(x, reload) {
  const status = x.paused ? pill("needs", "Paused") : pill("done", `${x.sentToday} of ${x.dailyLimit} today`);
  const checks = x.checks.length ? h("ul", { class: "cn-sendchecks" }, x.checks.map((c) => h("li", { class: c.ok ? "is-ok" : c.blocking ? "is-bad" : "is-warn" }, c.text))) : null;
  return section(
    { title: "Sending", line: x.verified ? `From ${x.fromAddress}, your own domain.` : "From Orbe's address, with replies going to you. Your own domain sends once its records check out.", actions: status },
    x.paused
      ? h("div", { class: "cn-banner" }, h("p", null, `Paused: ${x.paused}`), can("owner") ? row(action("Resume", async () => {
          await api.post("/v1/me/deals/sender/resume", {});
          reload();
          return "Resumed.";
        }, { primary: true })) : h("p", null, "The team's owner can resume sending."))
      : null,
    can("owner")
      ? form([
          field("Send from", input({ name: "fromAddress", type: "email", maxlength: 254, value: x.fromAddress ?? "", placeholder: "deals@yourname.com", autocomplete: "off" }), "An address at your own domain. Leave empty to send from Orbe's address."),
          field("DKIM selector", input({ name: "dkimSelector", maxlength: 63, value: x.dkimSelector ?? "", placeholder: "pm", autocomplete: "off" }), `Your email provider shows it with the DKIM record. Your domain also needs ${x.returnPath.host} pointing to ${x.returnPath.target}.`),
        ], "Save and check", async (fd) => {
          const from = String(fd.get("fromAddress") ?? "").trim();
          await api.put("/v1/me/deals/sender", { fromAddress: from || null, dkimSelector: String(fd.get("dkimSelector") ?? "").trim() || null });
          if (from) await api.post("/v1/me/deals/sender/check", {});
          reload();
          return from ? "Saved and checked." : "Orbe's address sends again.";
        }, { primary: false })
      : null,
    checks,
  );
}

export function assistantTab(el) {
  let filter = "open";
  const reload = () =>
    block(el, () => Promise.all([api.get("/v1/me/deals"), api.get("/v1/me/deals/sender")]).then(([d, x]) => ({ ...d, sender: x.sender })), ({ assistant: a, threads, sender }) => {
      const counts = Object.fromEntries(Object.keys(STAGE_WORDS).map((s) => [s, threads.filter((t) => t.stage === s).length]));
      const shown = threads.filter((t) => (filter === "open" ? !["agreed", "closed"].includes(t.stage) : t.stage === filter));
      const list = h("div", { class: "cn-threads" });
      const draw = () => list.replaceChildren(...(shown.length ? shown.map((t) => threadView(t, reload)) : [emptyState("mail", filter === "open" ? "Nothing open." : `Nothing ${STAGE_WORDS[filter].toLowerCase()}.`, [], a.enabled ? "Offers in Orbe, brands you write to and emails you paste in all appear here." : "Switch on Hand it off, above, to have offers answered as they arrive.")]));
      draw();
      return [
        section(
          { title: "Conversations", line: a.enabled ? "Your rules live in Hand it off, above. Replies and outreach wait for your tap." : "Hand it off, above, is off. Your rules live there.", actions: a.enabled ? pill("done", "On") : pill("idle", "Off") },
          segmented("Show", [["open", `Open ${threads.filter((t) => !["agreed", "closed"].includes(t.stage)).length}`], ["waiting", `Waiting on you ${counts.waiting}`], ["countered", `Countered ${counts.countered}`], ["agreed", `Agreed ${counts.agreed}`]], filter, (v) => {
            filter = v;
            reload();
          }, { cls: "cn-seg--scroll" }),
          list,
        ),
        can("business")
          ? section({ title: "A brand emailed you?", line: a.forwardingAddress ? `Forward it to ${a.forwardingAddress}, or paste it here.` : "Paste it here, headers and all. A reply is drafted with a fair-price check; nothing is sent." },
              a.forwardingAddress ? h("p", { class: "cn-code-inline" }, h("code", null, a.forwardingAddress)) : null,
              form([field("The email", textarea({ name: "email", rows: 6, required: true, maxlength: 50000, placeholder: "From: ...\nSubject: ...\n\nHello ..." }))], "Draft a reply", async (fd, f) => {
                const r = await api.post("/v1/me/deals/emails", { email: String(fd.get("email")) });
                f.reset();
                filter = "open";
                reload();
                return `Saved, with a draft reply to ${r.thread.brandName}.`;
              }),
            )
          : null,
        sendingSection(sender, reload),
      ];
    });
  return reload();
}

export const dealsFeatures = () => ({ finder: on("sponsor_finder"), assistant: on("deals_agent") });
