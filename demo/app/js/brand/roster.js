/*
  The agency or manager area, on the same buyer sign-in as a brand: the
  agency profile and its terms, invites by email, and the roster itself.
  A creator joins only after reading what the agency would see, and can
  leave at any time; the roster is built fresh each time it is opened.
*/
import { api, seg } from "../api.js";
import { formatName, KINDS } from "../terms.js";
import { action, actions, block, check, chip, count, day, empty, field, form, h, input, panel, plural, signed, title } from "../ui.js";
import { screenHead } from "../console-ui.js";

const LINK_STATES = { invited: "Invited", active: "On the roster", declined: "Declined", left: "Left", removed: "Removed", withdrawn: "Withdrawn" };

function setup(el, terms, reload) {
  el.replaceChildren(
    panel(
      "Set up your agency",
      h("p", null, "Agencies and managers invite the creators they represent. Each creator decides whether to join and can leave at any time."),
      form(
        [
          field("Agency or management company", input({ name: "org", required: true, maxlength: 120, autocomplete: "organization" })),
          h("div", { class: "ap-terms" }, h("p", { class: "ap-cue" }, "Manager terms"), h("p", null, terms)),
          check("I accept the manager terms.", { name: "accept", required: true }),
        ],
        "Set up the agency",
        async (d) => {
          await api.put("/v1/manager/profile", { org: String(d.get("org")).trim(), acceptTerms: true });
          reload();
          return "Set up.";
        },
      ),
    ),
  );
}

function invitesPanel() {
  const list = h("div");
  const reload = () =>
    block(list, () => api.get("/v1/manager/invites"), ({ invites }) =>
      invites.length
        ? h("ul", { class: "ap-list" }, [...invites].reverse().map((i) =>
            h("li", { class: "ap-item" },
              h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, i.email, " ", chip(LINK_STATES[i.state] ?? i.state, i.state === "active" ? "good" : i.state === "invited" ? undefined : "off")), h("p", { class: "ap-note" }, `Invited ${day(i.invitedAt)}.`)),
              ["invited", "active"].includes(i.state)
                ? actions(action(i.state === "invited" ? "Withdraw" : "Remove", async () => {
                    await api.del(`/v1/manager/invites/${seg(i.id)}`);
                    reload();
                    return "Done.";
                  }, { danger: true, confirm: i.state === "active" ? `Remove ${i.email} from the roster? You stop seeing their figures at once.` : `Withdraw the invite to ${i.email}?` }))
                : null,
            ),
          ))
        : empty("No invites yet."),
    );
  reload();
  return panel(
    "Invites",
    form([field("Creator's email", input({ name: "email", type: "email", required: true, autocomplete: "off" }), "They are asked to sign in to Orbe with this address and decide. Nothing is shared until they say yes.")], "Invite", async (d, f) => {
      await api.post("/v1/manager/invites", { email: String(d.get("email")).trim() });
      f.reset();
      reload();
      return "Invited.";
    }),
    list,
  );
}

function member(m) {
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, m.creator.displayName || "A creator"), h("p", { class: "ap-note" }, `On the roster since ${day(m.joinedAt)}.`)),
    m.accounts.map((a) => {
      const judged = a.uploads.filter((u) => u.atSize);
      const n = (r) => judged.filter((u) => u.atSize.result === r).length;
      return h("div", { class: "ap-stack ap-account" },
        h("p", null, `${KINDS[a.kind] ?? a.kind}, ${a.handle}`, " ", chip(`Size ${a.sizeBand}`)),
        a.rating ? h("p", null, `Orbe Rating ${signed(a.rating.rating)}, ${a.rating.band}${a.rating.beats !== null ? `; reach beats ${a.rating.beats} in 100 creators its size` : ""}.`) : h("p", { class: "ap-note" }, "Not rated yet."),
        judged.length ? h("p", { class: "ap-note" }, `Recent uploads against creators the same size: ${n("above")} above the middle half, ${n("within")} inside, ${n("below")} below.`) : null,
        a.notes.map((x) => h("p", { class: "ap-note" }, x)),
        a.rating ? h("p", { class: "ap-label" }, a.rating.notice) : null,
      );
    }),
    m.deliveries.length
      ? h("ul", { class: "ap-plain" }, m.deliveries.map((d) => h("li", null, `${d.brandName}, ${formatName(d.format)}: ${count(d.delivered)} of ${count(d.guarantee.units)} guaranteed at ${d.guarantee.day} days${d.met ? ", met" : ""}.`)))
      : null,
  );
}

function rosterPanel() {
  const box = h("div", { class: "ap-stack" });
  block(box, () => api.get("/v1/roster"), (r) => [
    h("p", { class: "ap-says" }, `${plural(r.summary.creators, "creator")} on the roster, ${r.summary.invited} invited. ${r.summary.rated} rated.`),
    r.summary.guaranteed ? h("p", { class: "ap-note" }, `Guaranteed reads: ${r.summary.guaranteed}, of which ${r.summary.met} met and ${r.summary.short} short.`) : null,
    r.members.length ? h("ul", { class: "ap-list" }, r.members.map(member)) : empty("Nobody has joined yet."),
  ]);
  return panel("Roster", box);
}

export async function render(main) {
  const body = h("div", { class: "ap-stack" });
  screenHead(main, "roster", { line: "For agencies and managers: the creators you represent, with what each chose to share with you.", tags: [["Shared by consent"]] }).append(body);
  const reload = () =>
    block(body, () => api.get("/v1/manager/profile"), ({ manager, terms }) => {
      if (!manager) {
        const el = h("div");
        setup(el, terms, reload);
        return el;
      }
      return [h("p", { class: "ap-note" }, `${manager.org}. Manager terms accepted ${day(manager.termsAcceptedAt)}.`), rosterPanel(), invitesPanel()];
    });
  await reload();
}
