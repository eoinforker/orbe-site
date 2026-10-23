/*
  The agency or manager area, on the same buyer sign-in as a brand: the
  agency profile and its terms, the roster itself, and invites by email.
  A creator joins only after reading what the agency would see, and can
  leave at any time; the roster is built fresh each time it is opened.
  For an agency that is not also a brand this is Home.
*/
import { api, can, on, seg } from "../api.js";
import { BOOKING_STATES } from "../deal.js";
import { formatName, KINDS, sizeWords } from "../terms.js";
import { actions, block, check, count, day, field, form, h, input, plural } from "../ui.js";
import { emptyState, rating, screenHead, section, stat, statStrip } from "../console-ui.js";
import { button, narrow, status, table, twoLine } from "../cards.js";
import { rosterHandoff } from "./roster-handoff.js";

const LINK_STATES = { invited: ["Invited", null], active: ["On the roster", "good"], declined: ["Declined", "off"], left: ["Left", "off"], removed: ["Removed", "off"], withdrawn: ["Withdrawn", "off"] };
/** Delivery states that have been judged against the guarantee (services/roster.ts JUDGED). */
const JUDGED = ["short", "make_good", "verified", "paid"];

function setup(terms, reload) {
  return section(
    { title: "Set up your agency", line: "Agencies and managers invite the creators they represent. Each creator decides whether to join and can leave at any time." },
    narrow(form(
      [
        field("Agency or management company", input({ name: "org", required: true, maxlength: 120, autocomplete: "organization" })),
        h("div", { class: "cn-terms" }, h("p", { class: "cn-terms-t" }, "Manager terms"), h("p", null, terms)),
        check("I accept the manager terms.", { name: "accept", required: true }),
      ],
      "Set up the agency",
      async (d) => {
        await api.put("/v1/manager/profile", { org: String(d.get("org")).trim(), acceptTerms: true });
        reload();
        return "Set up.";
      },
    )),
  );
}

/** Each creator's accounts as rows, the creator named once beside them. */
function creatorRows(m) {
  const accounts = m.accounts.length ? m.accounts : [null];
  const who = h("td", { rowspan: String(accounts.length), class: "cn-td-top" }, twoLine(m.creator.displayName || "A creator", `On the roster since ${day(m.joinedAt)}`));
  return accounts.map((a, i) => {
    const lead = i === 0 ? [who] : [];
    if (!a) return { cells: [...lead, h("span", { class: "dl-quiet" }, "No account shared yet"), null, null, null, null] };
    const judged = a.uploads.filter((u) => u.atSize);
    const n = (r) => judged.filter((u) => u.atSize.result === r).length;
    return {
      skip: i === 0 ? 0 : 1,
      cells: [
        ...lead,
        twoLine(a.handle, [KINDS[a.kind] ?? a.kind, ...a.notes].join(". ")),
        sizeWords(a.sizeBand, a.kind),
        a.rating ? [rating(a.rating.rating), h("span", { class: "dl-sub" }, a.rating.band)] : h("span", { class: "dl-quiet" }, "Not rated yet"),
        a.rating?.beats !== null && a.rating?.beats !== undefined ? `Beats ${a.rating.beats} in 100` : h("span", { class: "dl-quiet" }, "Not yet"),
        judged.length ? twoLine(`${n("above")} above, ${n("within")} inside, ${n("below")} below`, `the middle half, of ${plural(judged.length, "work")}`) : h("span", { class: "dl-quiet" }, "None judged yet"),
      ],
    };
  });
}

/** The platforms' notices as one line: "Independently calculated by Orbe. It is not a platform metric, and it is not provided or endorsed by a, b or c." */
function oneNotice(notices) {
  const by = notices.map((t) => /not provided or endorsed by (.+?)\.?$/.exec(t)?.[1]);
  if (notices.length < 2 || by.some((x) => !x)) return notices.join(" ");
  const parties = [...new Set(by.flatMap((x) => x.split(/,\s*|\s+or\s+/)))];
  const list = parties.length < 2 ? parties.join("") : `${parties.slice(0, -1).join(", ")} or ${parties.at(-1)}`;
  return `Independently calculated by Orbe. It is not a platform metric, and it is not provided or endorsed by ${list}.`;
}

function rosterCards(r, invites, reload) {
  const s = r.summary;
  const bands = Object.entries(s.bands ?? {}).map(([band, n]) => `${n} ${band}`).join(", ");
  // One label per platform the ratings come from, said once under the table.
  const notices = [...new Set(r.members.flatMap((m) => m.accounts.map((a) => a.rating?.notice).filter(Boolean)))];
  const deliveries = r.members.flatMap((m) => m.deliveries.map((d) => ({ ...d, name: m.creator.displayName || "A creator" })));
  const names = new Map(r.members.map((m) => [m.creator.id, m.creator.displayName || "A creator"]));
  return [
    statStrip([
      stat({ label: "On the roster", value: count(s.creators), line: s.invited ? `${plural(s.invited, "invite")} waiting` : "No invites waiting" }),
      stat({ label: "Rated", value: `${count(s.rated)} of ${count(s.creators)}`, line: bands || "Rated once an account is connected" }),
      stat({ label: "Guaranteed reads", value: count(s.guaranteed), line: s.guaranteed ? `${s.met} met, ${s.short} short` : "None booked yet" }),
    ]),
    // Hand it off across the roster: drawn once its own read is in, so the roster never waits for it.
    on("deals_agent") && can("read.money") ? rosterHandoff() : null,
    section(
      { title: "Creators", line: "What each creator chose to share with you, read fresh each time you open the Roster." },
      r.members.length
        ? [
            table([["Creator"], ["Account"], ["Size"], ["Rating", "num"], ["Reach at its size"], ["Recent works"]], r.members.flatMap(creatorRows), { cls: "cn-roster-table", caption: "Creators on the roster" }),
            h("p", { class: "cn-label" }, oneNotice(notices)),
          ]
        : emptyState("people", "Nobody has joined yet.", [], "Invite a creator below. Nothing is shared until they say yes."),
    ),
    deliveries.length
      ? section(
          { title: "Guaranteed reads", line: "Each booked read against the guarantee the brand and the creator agreed." },
          table([["Creator"], ["Brand"], ["Format"], ["Delivered", "num"], ["Guaranteed", "num"], ["Status"]], deliveries.map((d) => [
            d.name,
            d.brandName,
            formatName(d.format),
            count(d.delivered),
            twoLine(count(d.guarantee.units), `at ${d.guarantee.day} days`),
            d.met ? status("Met", "good") : JUDGED.includes(d.state) ? status("Short", "warn") : status(BOOKING_STATES[d.state] ?? d.state),
          ]), { caption: "Guaranteed reads" }),
        )
      : null,
    invitesCard(invites, names, reload),
  ];
}

function invitesCard(invites, names, reload) {
  const invite = narrow(form(
    [field("Creator's email", input({ name: "email", type: "email", required: true, maxlength: 254, autocomplete: "off", placeholder: "name@example.com" }))],
    "Invite",
    async (d, f) => {
      await api.post("/v1/manager/invites", { email: String(d.get("email")).trim() });
      f.reset();
      reload();
      return "Invited.";
    },
  ));
  invite.classList.add("cn-form--row");
  return section(
    { title: "Invites", line: "They are asked to sign in to Orbe with this address and decide. Nothing is shared until they say yes." },
    invite,
    invites.length
      ? table([["Creator"], ["Status"], ["Invited"], ["Answered"], [""]], [...invites].reverse().map((i) => {
          const [word, tone] = LINK_STATES[i.state] ?? [i.state, null];
          // Once a creator has joined, the roster knows their name; until then only the address it was sent to, masked.
          const who = (i.creatorId && names.get(i.creatorId)) || i.email;
          return [
            who,
            status(word, tone),
            day(i.invitedAt),
            i.answeredAt ? day(i.answeredAt) : h("span", { class: "dl-quiet" }, "Not yet"),
            ["invited", "active"].includes(i.state)
              ? actions(button(i.state === "invited" ? "Withdraw" : "Remove", async () => {
                  await api.del(`/v1/manager/invites/${seg(i.id)}`);
                  reload();
                  return "Done.";
                }, { quiet: true, danger: true, confirm: i.state === "active" ? `Remove ${who} from the roster? You stop seeing their figures at once.` : `Withdraw the invite to ${who}?` }))
              : null,
          ];
        }), { cls: "cn-invites-table", caption: "Invites" })
      : h("p", { class: "cn-label" }, "No invites yet."),
  );
}

export async function render(main) {
  const body = h("div", { class: "ap-stack" });
  const head = screenHead(main, "roster", { line: "The creators you represent, with what each chose to share with you.", tags: [["Shared by consent"]] });
  head.append(body);
  const reload = () =>
    block(body, async () => {
      const { manager, terms } = await api.get("/v1/manager/profile");
      if (!manager) return { manager, terms };
      const [roster, { invites }] = await Promise.all([api.get("/v1/roster"), api.get("/v1/manager/invites")]);
      return { manager, roster, invites };
    }, ({ manager, terms, roster, invites }) =>
      manager
        ? [...rosterCards(roster, invites, reload), h("p", { class: "cn-label" }, `${manager.org}. Manager terms accepted ${day(manager.termsAcceptedAt)}.`)]
        : setup(terms, reload),
    );
  await reload();
}
