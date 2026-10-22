/* Record: the verified record, the share link, and consents (grant and revoke, showing what revoking removes). */
import { api, apiHref, on, seg } from "../api.js";
import { CONSENTS } from "../terms.js";
import { screenHead } from "../console-ui.js";
import { action, actions, block, chip, day, empty, field, form, h, input, ok, panel, signed, tabs, title } from "../ui.js";

const GRANTABLE = ["connect", "rate_public", "verified_profile", "benchmarks", "listing"];

/** A record figure in its own unit. */
export function figure(f, currency) {
  const v = f.value;
  if (v === null || v === undefined) return "not known";
  switch (f.unit) {
    case "money":
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: f.currency ?? currency ?? "GBP", maximumFractionDigits: 0 }).format(v / 100);
    case "percent":
      return `${Math.round(v * 100)}%`;
    case "change":
      return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 100))}%`;
    case "rating":
      return signed(v);
    default:
      return typeof v === "number" ? v.toLocaleString("en-GB") : String(v);
  }
}

/** The record's sentences carry their figures as {0}, {1}: each is shown in bold, with its label to hover. */
export function sentence(text, currency) {
  if (!text) return null;
  if (typeof text === "string") return text;
  const out = [];
  let last = 0;
  for (const m of text.t.matchAll(/\{(\d+)\}/g)) {
    out.push(text.t.slice(last, m.index));
    const f = text.f[Number(m[1])];
    out.push(f ? h("b", { title: f.label }, figure(f, currency)) : m[0]);
    last = m.index + m[0].length;
  }
  out.push(text.t.slice(last));
  return out;
}

function recordTab(el) {
  block(
    el,
    async () => {
      const [rec, reps] = await Promise.all([api.get("/v1/me/record"), api.get("/v1/me/reports")]);
      return { report: rec.report, reports: reps.reports };
    },
    ({ report: r, reports }) => [
      h(
        "section",
        { class: "ap-win ob-win", "data-pair": "rec", "aria-labelledby": "verdict-h" },
        h("div", { class: "ob-win-bar" }, h("h2", { class: "ob-win-title", id: "verdict-h" }, "Verified record")),
        h(
          "div",
          { class: "ob-win-body" },
          h("p", { class: "ap-verdict" }, r.verdict.label),
          h("p", null, sentence(r.verdict.summary, r.currency)),
          r.period ? h("p", { class: "ap-note" }, `${day(r.period.from)} to ${day(r.period.to)}, prepared ${day(r.generatedAt)}.`) : null,
        ),
      ),
      r.headline?.length
        ? panel("Headline figures", h("dl", { class: "ap-figs" }, r.headline.map((f) => h("div", { class: "ap-figs-row" }, h("dt", null, f.label.replace("@@", "@")), h("dd", null, figure(f, r.currency))))))
        : null,
      r.keyPoints?.length
        ? panel(
            "What a buyer will ask about",
            h("ul", { class: "ap-points" }, r.keyPoints.map((k) => h("li", { class: `ap-point ap-point--${k.tone}` }, h("span", { class: "ap-cue" }, k.tone === "concern" ? `Concern, ${k.severity}` : k.tone), h("p", null, sentence(k.text, r.currency))))),
          )
        : null,
      panel(
        "The whole record",
        h("p", null, "Every figure with the source it was read from and when."),
        h("p", { class: "ap-links" }, h("a", { class: "ob-lnk ob-lnk--s", href: apiHref("/v1/me/record?format=html"), target: "_blank", rel: "noopener" }, "Open the full record"), " ", h("a", { class: "ob-lnk ob-lnk--s", href: apiHref("/v1/me/record?format=markdown"), target: "_blank", rel: "noopener" }, "As Markdown")),
        r.disclaimer ? h("p", { class: "ap-note" }, typeof r.disclaimer === "string" ? r.disclaimer : sentence(r.disclaimer, r.currency)) : null,
      ),
      panel(
        "Seller's reports",
        reports.length ? h("ul", { class: "ap-list" }, reports.map((x) => h("li", { class: "ap-item" }, h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, x.forBuyer ? "For a buyer" : "Your own copy"), h("p", { class: "ap-note" }, `${x.status}, ${day(x.issuedAt ?? x.createdAt)}`))))) : empty("No report issued yet."),
        h("p", { class: "ap-note" }, "A free Orbe Verified report of your record as it stands today, to keep or to show."),
        actions(
          action("Issue a report", async () => {
            await api.post("/v1/me/reports", {});
            recordTab(el);
            return "Report issued.";
          }),
        ),
      ),
    ],
  );
}

function shareTab(el) {
  block(
    el,
    () => api.get("/v1/me"),
    (me) => {
      const live = me.consents.some((c) => c.scope === "verified_profile" && !c.revokedAt);
      const published = !!me.creator.profilePublishedAt;
      const account = [...me.accounts].sort((a, b) => b.audience - a.audience)[0];
      const handle = account?.handle?.replace(/^@/, "");
      const link = handle ? `${location.origin}/@${encodeURIComponent(handle)}` : null;
      const toggle = action(published ? "Unpublish my profile" : "Publish my profile", async () => {
        await api.post("/v1/me/profile", { published: !published });
        shareTab(el);
        return published ? "Unpublished." : "Published.";
      }, { primary: !published });
      return panel(
        "Share link",
        h("p", null, published ? `Published on ${day(me.creator.profilePublishedAt)}.` : "Your profile is not published. Nothing about you is public until you publish it."),
        !live ? h("p", { class: "ap-note" }, "Publishing needs the public profile consent, under Consents.") : null,
        link && published
          ? h(
              "div",
              { class: "ap-stack" },
              h("p", null, h("code", { class: "ap-code ap-wrap" }, link)),
              actions(
                action("Copy the link", async () => {
                  await navigator.clipboard.writeText(link);
                  return "Copied.";
                }),
                h("a", { class: "ob-lnk ob-lnk--s", href: link, target: "_blank", rel: "noopener" }, "Open it"),
              ),
              h("p", { class: "ap-note" }, "The link shows your card while your profile is published and rated. A YouTube channel's rating is shown in public only once YouTube has accepted Orbe's use of derived figures, so until then a YouTube card answers not found."),
            )
          : null,
        live || published ? actions(toggle) : null,
      );
    },
  );
}

const EFFECT_WORDS = {
  oauthTokens: "connections",
  revenueLines: "money lines",
  workMetrics: "connected figures",
  works: "works",
  snapshots: "snapshots",
  provenance: "source records",
  refreshes: "scheduled reads",
  reports: "reports withdrawn",
  profileUnpublished: "profile unpublished",
  workRatings: "upload ratings",
  ratings: "ratings",
  personalBests: "personal bests",
  excluded: "benchmarks left",
  contributions: "benchmark contributions",
  listings: "listings withdrawn",
  introductions: "introductions closed",
};

const removedLine = (r) => {
  const parts = Object.entries(r.effects ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${n.toLocaleString("en-GB")} ${EFFECT_WORDS[k] ?? k}`);
  return parts.length ? `Revoked. Removed: ${parts.join(", ")}.` : "Revoked. Nothing else was held under it.";
};

function consentsTab(el) {
  const said = h("div", { "aria-live": "polite" });
  const draw = () =>
    block(
      el,
      () => api.get("/v1/me/consents"),
      ({ consents }) => {
        const liveOf = (scope) => consents.find((c) => c.scope === scope && !c.revokedAt);
        const shares = consents.filter((c) => c.scope === "share_with_buyer" && !c.revokedAt);
        const revoke = (scope, buyerId) => async () => {
          const r = await api.del(buyerId ? `/v1/me/consents/${seg(scope)}?buyerId=${seg(buyerId)}` : `/v1/me/consents/${seg(scope)}`);
          said.replaceChildren(ok(removedLine(r.revoked)));
          draw();
          return removedLine(r.revoked);
        };
        return [
          said,
          h(
            "ul",
            { class: "ap-list" },
            GRANTABLE.map((scope) => {
              const c = CONSENTS[scope];
              const live = liveOf(scope);
              return h(
                "li",
                { class: "ap-item ap-item--block" },
                h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, c.name, " ", live ? chip(`Given ${day(live.grantedAt)}`, "good") : chip("Not given")), h("p", null, c.grants), live ? h("p", { class: "ap-note" }, `Revoking it: ${c.revoking}`) : null),
                actions(
                  live
                    ? action("Revoke", revoke(scope), { danger: true, confirm: `Revoke "${c.name}"? ${c.revoking}` })
                    : action("Give consent", async () => {
                        await api.post("/v1/me/consents", { scope });
                        draw();
                        return "Consent given.";
                      }),
                ),
              );
            }),
            shares.map((s) =>
              h(
                "li",
                { class: "ap-item ap-item--block" },
                h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, CONSENTS.share_with_buyer.name, " ", chip(`Since ${day(s.grantedAt)}`, "good")), h("p", null, CONSENTS.share_with_buyer.grants), h("p", { class: "ap-note" }, `Revoking it: ${CONSENTS.share_with_buyer.revoking}`)),
                actions(action("Revoke", revoke("share_with_buyer", s.buyerId), { danger: true, confirm: `Stop sharing with this buyer? ${CONSENTS.share_with_buyer.revoking}` })),
              ),
            ),
          ),
          eraseBox(),
        ];
      },
    );
  draw();
}

const ROSTER_STATES = { invited: "Invited", active: "On their roster", declined: "Declined", left: "Left", removed: "Removed by them", withdrawn: "Invite withdrawn" };

/** Agencies and managers who asked to see your figures: join after the notice, decline, or leave at any time. */
function rostersTab(el) {
  const said = h("div", { "aria-live": "polite" });
  const draw = () =>
    block(el, () => api.get("/v1/me/rosters"), ({ rosters }) => [
      said,
      rosters.length
        ? h("ul", { class: "ap-list" }, rosters.map((r) =>
            h("li", { class: "ap-item ap-item--block" },
              h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, r.org, " ", chip(ROSTER_STATES[r.state] ?? r.state, r.state === "active" ? "good" : r.state === "invited" ? undefined : "off")), h("p", { class: "ap-note" }, `Invited ${day(r.invitedAt)}${r.answeredAt ? `, answered ${day(r.answeredAt)}` : ""}.`)),
              r.state === "invited"
                ? h("div", { class: "ap-stack" },
                    h("p", { class: "ap-notice" }, r.notice),
                    form([check("I have read this and want to join.", { name: "seen", required: true })], "Join their roster", async () => {
                      await api.post(`/v1/me/rosters/${seg(r.id)}/accept`, { noticeShown: true });
                      draw();
                      return "Joined.";
                    }),
                    actions(action("Decline", async () => {
                      await api.post(`/v1/me/rosters/${seg(r.id)}/decline`, {});
                      draw();
                      return "Declined.";
                    })),
                  )
                : r.state === "active"
                  ? actions(action("Leave their roster", async () => {
                      const out = await api.del(`/v1/me/rosters/${seg(r.id)}`);
                      said.replaceChildren(ok(out.removed.join(" ")));
                      draw();
                      return out.removed[0];
                    }, { danger: true, confirm: `Leave ${r.org}'s roster? They stop seeing your figures at once.` }))
                  : null,
            ),
          ))
        : empty("No agency has invited you. An agency or manager who works with you can invite you by email; nothing is shared until you say yes."),
    ]);
  draw();
}

export function eraseBox() {
  return h(
    "details",
    { class: "ap-more" },
    h("summary", null, "Erase your account"),
    h("p", null, "Deletes your account and everything Orbe holds about you. It cannot be undone."),
    form([field('Type "delete my account" to confirm', input({ name: "confirm", required: true, autocomplete: "off", pattern: "delete my account" }))], "Erase everything", async (d) => {
      await api.del("/v1/me", { confirm: String(d.get("confirm")) });
      window.location.assign("/orbe-site/demo/app/");
      return "Erased.";
    }, { primary: false }),
  );
}

export async function render(main, ctx) {
  const body = screenHead(main, "record", { title: "Your record", line: "What Orbe has read at source, what it checked, and who may see it.", tags: [["Verified", "sky"], ["Yours to share"]] });
  body.append(
    tabs("record", [
      { id: "record", label: "Record", render: recordTab },
      { id: "share", label: "Share", render: shareTab },
      { id: "consents", label: "Consents", render: consentsTab },
      on("brand_data") ? { id: "agencies", label: "Agencies", render: rostersTab } : null,
    ].filter(Boolean), ctx.query.get("tab")),
  );
}
