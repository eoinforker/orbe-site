/*
  The team: who works on this account and what each may do, the requests
  waiting for the owner, who did what, agencies linked to a creator's team,
  and what managers may do without asking. It lives in Settings (Team);
  /app/team and /app/team/approvals, linked from emails, lead there.

  The server decides every permission (src/api/teams/policy.ts). This only
  leaves out what a role cannot use, so nobody meets a refusal: editors and
  viewers see the people but not their addresses, and nothing about money.
*/
import { api, seg } from "./api.js";
import { emptyState, pill, section, segmented, skeleton } from "./console-ui.js";
import { icon } from "./icons.js";
import { action, block, confirmBox, day, failure, h, plural, toast, when } from "./ui.js";

const ROLE_LINE = {
  owner: "Everything, including payouts, deleting the account and handing the team over.",
  manager: "Offers, campaigns and deliveries. Money, sharing and rights wait for the owner.",
  editor: "The Library, notes, documents, Orbe Fix and ratings. No deals or money.",
  viewer: "Reads the record and reports. Changes nothing.",
};
const KIND = { creator: "Creator team", brand: "Brand team", agency: "Agency" };
const rank = { viewer: 0, editor: 1, manager: 2, owner: 3 };
const roleName = (r) => r[0].toUpperCase() + r.slice(1);
const an = (r) => (r === "editor" || r === "owner" ? "an" : "a");
const initials = (s) => (s || "O").replace(/\(.*?\)/g, "").trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const pounds = (n) => `£${Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

/** /app/team and /app/team/:section: the Team area is in Settings. */
export function render(main, ctx) {
  const tab = ctx.params.section ?? ctx.query.get("tab");
  ctx.go(`/orbe-site/demo/app/settings/team${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`, { replace: true });
}

/** A small, quiet button in a row. */
const quiet = (label, run, opts = {}) => action(label, run, opts);

/** The Team section of Settings. */
export async function renderTeam(el, ctx) {
  const holder = h("div", { class: "cn-team" }, skeleton(3));
  el.append(holder);
  let data;
  try {
    const [mine, team] = await Promise.all([api.get("/v1/teams"), api.get("/v1/team")]);
    data = { ...mine, detail: team };
  } catch (e) {
    holder.replaceChildren(failure(e, () => (holder.remove(), renderTeam(el, ctx))));
    return;
  }
  const { active, transfersForYou, detail } = data;
  const isOwner = active.role === "owner";
  const leads = rank[active.role] >= rank.manager && active.via === "member";

  const offers = transfersForYou.map((t) =>
    h("div", { class: "cn-banner cn-banner--team" },
      h("span", { class: "cn-banner-ico" }, icon("people")),
      h("div", { class: "cn-banner-main" }, h("p", { class: "cn-item-t" }, `You have been offered ${t.name}`), h("p", { class: "cn-item-d" }, "As owner you would hold its payouts and decide every request. The current owner stays on as a manager.")),
      h("div", { class: "cn-banner-actions" },
        quiet("Decline", async () => {
          await api.post(`/v1/teams/${seg(t.teamId)}/transfer/decline`);
          location.reload();
        }),
        quiet("Accept ownership", async () => {
          await api.post(`/v1/teams/${seg(t.teamId)}/transfer/accept`);
          location.reload();
        }, { primary: true }),
      ),
    ),
  );

  const head = h("header", { class: "cn-teamhead" },
    h("span", { class: "cn-teamtile cn-teamtile--l", "data-kind": active.kind, "aria-hidden": "true" }, initials(active.name)),
    h("div", { class: "cn-teamhead-main" },
      h("p", { class: "cn-teamhead-t" }, active.name),
      h("p", { class: "cn-teamhead-d" }, `${KIND[active.kind] ?? "Team"}, ${plural(detail.members, "person", "people")}. ${active.role === "owner" ? "You own it." : `You are ${an(active.role)} ${active.role}${active.agency ? `, through ${active.agency.org}` : ""}.`}`),
    ),
    isOwner ? quiet("Rename", () => rename(head, active)) : null,
  );

  const waiting = detail.approvalsWaiting;
  const tabs = [
    { id: "people", label: "People", draw: (box) => people(box, active, isOwner, leads, detail) },
    { id: "approvals", label: waiting ? `Approvals ${waiting}` : "Approvals", draw: (box) => approvals(box, isOwner, leads) },
    leads ? { id: "activity", label: "Activity", draw: (box) => activity(box) } : null,
    leads && active.kind !== "brand" ? { id: "agencies", label: active.kind === "agency" ? "Creators" : "Agencies", draw: (box) => agencies(box, active, isOwner) } : null,
    isOwner ? { id: "rules", label: "Rules", draw: (box) => rules(box) } : null,
  ].filter(Boolean);
  const asked = ctx.query.get("tab");
  let current = tabs.some((t) => t.id === asked) ? asked : "people";
  const body = h("div", { class: "cn-team-body" });
  const draw = () => {
    body.replaceChildren();
    tabs.find((t) => t.id === current).draw(body);
  };
  const bar = segmented("Team", tabs.map((t) => [t.id, t.label]), current, (id) => {
    current = id;
    history.replaceState(null, "", `/orbe-site/demo/app/settings/team?tab=${id}`);
    draw();
  });
  holder.replaceChildren(...offers, head, h("div", { class: "cn-team-tabs" }, bar), body);
  draw();
}

/** The team's name, edited where it stands. */
function rename(head, active) {
  const t = head.querySelector(".cn-teamhead-t");
  const input = h("input", { class: "cn-field-input cn-teamhead-input", value: active.name, maxlength: 80, "aria-label": "Team name" });
  const save = async () => {
    const name = input.value.trim();
    if (!name || name === active.name) return input.replaceWith(t);
    try {
      await api.patch("/v1/team", { name });
      active.name = name;
      t.textContent = name;
      input.replaceWith(t);
      toast("Renamed. Everyone on the team sees the new name.");
    } catch (e) {
      input.after(failure(e));
    }
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") input.replaceWith(t);
  });
  input.addEventListener("blur", save);
  t.replaceWith(input);
  input.focus();
  input.select();
}

/* ---------------------------------------------------------------- people */

function people(box, active, isOwner, leads, detail) {
  const list = h("div", { class: "cn-stack" });
  let channels = null;
  // Channels a person can be limited to: the creator team's claimed accounts, read once.
  const loadChannels = () => (channels ??= active.kind === "creator" && isOwner ? api.get("/v1/me").then((r) => r.accounts ?? [], () => []) : Promise.resolve([]));

  const reload = () =>
    block(list, () => api.get("/v1/team/members"), ({ members, invitations }) => {
      const open = invitations.filter((i) => i.state === "open");
      const transfer = detail.transfer;
      return [
        leads ? inviteCard(isOwner, loadChannels, reload, new URLSearchParams(location.search).get("invite") === "1") : null,
        section({ title: "People", line: leads ? "Everyone who can open this account, and what each may do." : "Everyone who can open this account." },
          h("ul", { class: "cn-people" },
            members.map((m) => personRow(m, { isOwner, leads, transfer, reload, loadChannels })),
          ),
        ),
        open.length
          ? section({ title: "Invited", line: "Each link works once, for its address, for 7 days." },
              h("ul", { class: "cn-people" },
                open.map((i) =>
                  h("li", { class: "cn-person cn-person--invite" },
                    h("span", { class: "cn-avatar cn-avatar--m cn-avatar--empty", "aria-hidden": "true" }, icon("mail")),
                    h("div", { class: "cn-person-main" }, h("p", { class: "cn-item-t" }, i.email), h("p", { class: "cn-item-d" }, `${roleName(i.role)}${i.scope ? `, ${plural(i.scope.length, "channel")}` : ""}. Until ${day(i.expiresAt)}.`)),
                    h("div", { class: "cn-person-actions" },
                      quiet("Send again", async () => {
                        await api.post("/v1/team/invitations", { email: i.email, role: i.role, ...(i.scope ? { scope: i.scope } : {}) });
                        reload();
                        return `Sent again to ${i.email}. The old link no longer works.`;
                      }),
                      quiet("Withdraw", async () => {
                        await api.del(`/v1/team/invitations/${seg(i.id)}`);
                        reload();
                        return "Withdrawn. The link no longer works.";
                      }, { danger: true, confirm: `Withdraw the invitation to ${i.email}? The link stops working at once.` }),
                    ),
                  ),
                ),
              ),
            )
          : null,
        rolesCard(),
        active.via === "member" && !isOwner
          ? section({ title: "Leave this team", line: "You would need a new invitation to come back." },
              h("div", { class: "cn-card-actions" }, quiet("Leave the team", async () => {
                await api.post("/v1/team/leave");
                location.assign("/orbe-site/demo/app/");
              }, { danger: true, confirm: `Leave ${active.name}? You would lose access at once.` })),
            )
          : null,
      ];
    });
  box.append(list);
  reload();
}

function personRow(m, { isOwner, leads, transfer, reload, loadChannels }) {
  const offered = transfer && transfer.to === m.id;
  const manageable = leads && m.role !== "owner" && (isOwner || rank[m.role] < rank.manager);
  const roleCtl =
    isOwner && m.role !== "owner"
      ? h("label", { class: "cn-rolepick" },
          h("span", { class: "ob-sr" }, `Role for ${m.name}`),
          h("select", {
            class: "cn-select-input",
            onchange: async (e) => {
              const role = e.target.value;
              try {
                await api.patch(`/v1/team/members/${seg(m.id)}`, { role });
                toast(`${m.name} is now ${an(role)} ${role}.`);
                reload();
              } catch (err) {
                e.target.value = m.role;
                e.target.closest("li").append(failure(err));
              }
            },
          }, ["manager", "editor", "viewer"].map((r) => h("option", { value: r, selected: r === m.role }, roleName(r)))),
          icon("chevron", { cls: "cn-i--chev" }),
        )
      : h("span", { class: `cn-role cn-role--${m.role}` }, roleName(m.role));
  return h("li", { class: "cn-person" },
    h("span", { class: "cn-avatar cn-avatar--m", "aria-hidden": "true" }, initials(m.name)),
    h("div", { class: "cn-person-main" },
      h("p", { class: "cn-item-t" }, m.name, m.isAccount ? h("span", { class: "cn-chip" }, "Account holder") : null, offered ? h("span", { class: "cn-chip cn-chip--here" }, "Offered ownership") : null),
      h("p", { class: "cn-item-d" }, [m.email, m.scope ? plural(m.scope.length, "channel") : m.role === "owner" ? null : "Every channel", `Joined ${day(m.joinedAt)}`].filter(Boolean).join(". ")),
    ),
    roleCtl,
    manageable
      ? h("div", { class: "cn-person-actions" },
          isOwner && m.scope !== undefined ? quiet("Channels", () => channelsDialog(m, loadChannels, reload)) : null,
          isOwner && !offered
            ? quiet("Make owner", async () => {
                await api.post("/v1/team/transfer", { to: m.id });
                reload();
                return `${m.name} has been offered the team. Nothing changes until they accept.`;
              }, { confirm: `Offer ${m.name} ownership? Once they accept, they hold payouts and decide requests, and you stay on as a manager.` })
            : null,
          isOwner && offered
            ? quiet("Withdraw offer", async () => {
                await api.del("/v1/team/transfer");
                reload();
                return "Offer withdrawn.";
              })
            : null,
          quiet("Remove", async () => {
            await api.del(`/v1/team/members/${seg(m.id)}`);
            reload();
            return `${m.name} can no longer open this team.`;
          }, { danger: true, confirm: `Remove ${m.name} from the team? They lose access at once.` }),
        )
      : null,
  );
}

/** Limit a person to some channels, or give them every one. */
async function channelsDialog(m, loadChannels, reload) {
  const accounts = await loadChannels();
  if (!accounts.length) {
    toast("This team has no channels to limit to yet.");
    return;
  }
  const picked = new Set(m.scope ?? accounts.map((a) => a.id));
  const boxes = accounts.map((a) =>
    h("label", { class: "cn-tick" },
      h("input", { type: "checkbox", checked: picked.has(a.id), onchange: (e) => (e.target.checked ? picked.add(a.id) : picked.delete(a.id)) }),
      h("span", null, a.handle || a.title || a.id), h("span", { class: "cn-item-d" }, a.kind),
    ),
  );
  const d = h("dialog", { class: "cn-confirm cn-confirm--wide", "aria-label": `Channels for ${m.name}` },
    h("p", { class: "cn-confirm-t" }, `Channels for ${m.name}`),
    h("p", { class: "cn-confirm-d" }, "They see only the works, ratings and deals of the channels ticked."),
    h("div", { class: "cn-ticks" }, boxes),
  );
  const done = h("button", { class: "cn-btn cn-btn--primary", type: "button" }, "Save");
  const cancel = h("button", { class: "cn-btn cn-btn--ghost", type: "button" }, "Cancel");
  d.append(h("div", { class: "cn-confirm-actions" }, cancel, done));
  cancel.addEventListener("click", () => d.close());
  done.addEventListener("click", async () => {
    const all = picked.size === accounts.length;
    if (!picked.size) return toast("Tick at least one channel.");
    try {
      await api.patch(`/v1/team/members/${seg(m.id)}`, { scope: all ? [] : [...picked] });
      d.close();
      toast(all ? `${m.name} sees every channel.` : `${m.name} sees ${plural(picked.size, "channel")}.`);
      reload();
    } catch (e) {
      d.append(failure(e));
    }
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}

/** Inviting someone: their address, the role, and for a creator team's owner, which channels. */
function inviteCard(isOwner, loadChannels, reload, focus) {
  const roles = isOwner ? ["manager", "editor", "viewer"] : ["editor", "viewer"];
  let role = "editor";
  const line = h("p", { class: "cn-item-d cn-invite-line" }, ROLE_LINE[role]);
  const email = h("input", { class: "cn-field-input", type: "email", name: "email", required: true, autocomplete: "off", placeholder: "name@example.com", "aria-label": "Email address" });
  const seg = segmented("Role", roles.map((r) => [r, roleName(r)]), role, (r) => {
    role = r;
    line.textContent = ROLE_LINE[r];
  }, { small: true });
  const scope = h("div", { class: "cn-invite-scope", hidden: true });
  const picked = new Set();
  const limit = isOwner
    ? h("button", {
        class: "cn-linkbtn", type: "button",
        onclick: async (e) => {
          const accounts = await loadChannels();
          if (!accounts.length) return toast("This team has no channels to limit to yet.");
          e.target.hidden = true;
          scope.hidden = false;
          scope.replaceChildren(h("p", { class: "cn-label" }, "Only these channels"), h("div", { class: "cn-ticks" }, accounts.map((a) => h("label", { class: "cn-tick" }, h("input", { type: "checkbox", onchange: (ev) => (ev.target.checked ? picked.add(a.id) : picked.delete(a.id)) }), h("span", null, a.handle || a.title || a.id)))));
        },
      }, "Limit to some channels")
    : null;
  const send = h("button", { class: "cn-btn cn-btn--primary", type: "submit" }, "Send invitation");
  const msg = h("div");
  const f = h("form", { class: "cn-invite", novalidate: false },
    h("div", { class: "cn-invite-row" }, h("label", { class: "cn-field cn-invite-email" }, icon("mail"), email), seg, send),
    line,
    limit,
    scope,
    msg,
  );
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.replaceChildren();
    const address = email.value.trim();
    if (!address) return email.focus();
    send.disabled = true;
    try {
      await api.post("/v1/team/invitations", { email: address, role, ...(picked.size ? { scope: [...picked] } : {}) });
      email.value = "";
      toast(`Invitation sent to ${address}. The link works once and lasts 7 days.`);
      reload();
    } catch (err) {
      msg.replaceChildren(failure(err));
    } finally {
      send.disabled = false;
    }
  });
  if (focus) requestAnimationFrame(() => email.focus());
  return section({ title: "Invite someone", line: "They sign in with their own account. Nothing of yours is shared with them beyond this team." }, f);
}

/** What each role may do, in one quiet table. */
function rolesCard() {
  const yes = (t) => h("td", null, t === true ? h("span", { class: "cn-yes" }, icon("check"), h("span", { class: "ob-sr" }, "Yes")) : t === "ask" ? h("span", { class: "cn-ask" }, "Asks the owner") : h("span", { class: "cn-no", "aria-label": "No" }, "No"));
  const rows = [
    ["See the record and reports", true, true, true, true],
    ["Library, notes, Orbe Fix", true, true, true, false],
    ["See deals and money", true, true, false, false],
    ["Answer offers, run campaigns", true, true, false, false],
    ["Commit money, share data, grant rights", true, "ask", false, false],
    ["Connections, payouts, delete", true, false, false, false],
  ];
  return h("details", { class: "cn-card cn-roles" },
    h("summary", { class: "cn-card-head" }, h("span", null, h("span", { class: "cn-h3" }, "What each role may do"), h("span", { class: "cn-card-line" }, "The owner can let managers do more alone, under Rules.")), icon("chevron", { cls: "cn-i--chev" })),
    h("div", { class: "cn-card-body cn-roles-body" },
      h("table", { class: "cn-table" },
        h("thead", null, h("tr", null, h("th", { scope: "col" }, ""), ["Owner", "Manager", "Editor", "Viewer"].map((r) => h("th", { scope: "col" }, r)))),
        h("tbody", null, rows.map(([what, ...cells]) => h("tr", null, h("th", { scope: "row" }, what), cells.map(yes)))),
      ),
    ),
  );
}

/* ---------------------------------------------------------------- approvals */

const STATE = { pending: ["running", "Waiting"], approved: ["done", "Approved"], declined: ["off", "Declined"], failed: ["failed", "Could not be done"], cancelled: ["off", "Withdrawn"] };

function approvals(box, isOwner, leads) {
  const list = h("div", { class: "cn-stack" });
  let show = "pending";
  const filter = segmented("Show", [["pending", "Waiting"], ["all", "Everything"]], show, (v) => {
    show = v;
    reload();
  }, { small: true });
  const reload = () =>
    block(list, () => (show === "pending" ? api.get("/v1/team/approvals?state=pending") : api.get("/v1/team/approvals")), ({ approvals: items }) =>
      items.length
        ? h("ul", { class: "cn-approvals" }, items.map((a) => approvalCard(a, isOwner, reload)))
        : emptyState("check", show === "pending" ? "Nothing waiting." : "No requests yet.", [], isOwner ? "When a manager asks to commit money, share data or grant rights, it waits here for you, and the bell shows it." : "When something you ask for needs the owner, it waits here until they decide."),
    );
  box.append(h("div", { class: "cn-team-bar" }, h("p", { class: "cn-item-d" }, isOwner ? "Requests from your team that need your say. Each runs exactly as asked, only once you approve." : leads ? "Requests on this team. Only the owner decides." : "What you have asked the owner for."), filter), list);
  reload();
}

function approvalCard(a, isOwner, reload) {
  const [tone, word] = STATE[a.state] ?? ["off", a.state];
  const decide = (yes) => async () => {
    const ok = await confirmBox(
      yes ? `${a.summary}. It runs now, exactly as ${a.requestedBy.name} asked.` : `${a.requestedBy.name} is told it was declined. Nothing is done.`,
      { yes: yes ? "Approve" : "Decline", danger: !yes, title: yes ? "Approve this request?" : "Decline this request?" },
    );
    if (!ok) return;
    try {
      const r = await api.post(`/v1/team/approvals/${seg(a.id)}/${yes ? "approve" : "decline"}`, {});
      toast(yes ? (r.approval.state === "approved" ? "Approved and done." : `Approved, but it could not be done: ${r.approval.note ?? "refused"}.`) : "Declined. Nothing was done.");
      window.dispatchEvent(new Event("orbe:notes-changed"));
      reload();
    } catch (e) {
      card.append(failure(e));
    }
  };
  const card = h("li", { class: `cn-approval cn-approval--${a.state}` },
    h("div", { class: "cn-approval-main" },
      h("p", { class: "cn-approval-t" }, a.summary),
      h("p", { class: "cn-item-d" }, `Asked ${when(a.requestedAt)}${a.decidedAt ? `. Decided ${when(a.decidedAt)}` : ""}${a.note ? `. ${a.note}` : ""}`),
    ),
    a.amount !== null ? h("p", { class: "cn-approval-amt" }, pounds(a.amount)) : null,
    pill(tone, word),
    a.state === "pending"
      ? h("div", { class: "cn-approval-actions" },
          isOwner
            ? [
                h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: decide(false) }, "Decline"),
                h("button", { class: "cn-btn cn-btn--primary", type: "button", onclick: decide(true) }, "Approve"),
              ]
            : quiet("Withdraw", async () => {
                await api.post(`/v1/team/approvals/${seg(a.id)}/cancel`);
                window.dispatchEvent(new Event("orbe:notes-changed"));
                reload();
                return "Withdrawn.";
              }),
        )
      : null,
  );
  return card;
}

/* ---------------------------------------------------------------- activity */

const VERBS = {
  "member.joined": "joined the team",
  "member.left": "left the team",
  "member.removed": "removed someone",
  "member.changed": "changed someone's place",
  "invitation.sent": "sent an invitation",
  "invitation.withdrawn": "withdrew an invitation",
  "approval.requested": "asked for approval",
  "approval.approved": "approved a request",
  "approval.declined": "declined a request",
  "approval.failed": "approved a request that could not be done",
  "approval.withdrawn": "withdrew a request",
  "owner.offered": "offered the team to someone",
  "owner.accepted": "became the owner",
  "owner.declined": "declined ownership",
  "rule.changed": "changed what managers may do alone",
  "link.requested": "asked a creator to link",
  "link.accepted": "let an agency in",
  "link.changed": "changed an agency's role",
  "link.ended": "ended an agency link",
  "team.updated": "changed the team's details",
};
const KINDS = [["all", "Everything"], ["people", "People"], ["approvals", "Approvals"], ["work", "Work"]];
const kindOf = (a) => (/^(member|invitation|owner|link)\./.test(a.action) ? "people" : a.action.startsWith("approval.") ? "approvals" : /^(rule|team)\./.test(a.action) ? "people" : "work");

function describe(a) {
  if (VERBS[a.action]) return `${VERBS[a.action]}${a.detail ? `: ${a.detail}` : ""}`;
  const [method, path = ""] = a.action.split(" ");
  const verb = method === "DELETE" ? "removed" : method === "POST" ? "did" : "changed";
  return `${verb} ${path.replace(/^\/v1\/(me|brand|buyer)\//, "").replace(/\/:\w+/g, "").replace(/[/-]/g, " ").trim()}`;
}

function activity(box) {
  const list = h("div", { class: "cn-stack" });
  let kind = "all";
  let who = "";
  let rows = [];
  const people = h("select", { class: "cn-select-input", "aria-label": "Person", onchange: (e) => ((who = e.target.value), draw()) }, h("option", { value: "" }, "Everyone"));
  const draw = () => {
    const shown = rows.filter((a) => (kind === "all" || kindOf(a) === kind) && (!who || a.actor.name === who));
    if (!shown.length) return list.replaceChildren(emptyState("clock", rows.length ? "Nothing matches." : "Nothing yet.", [], "Every change anyone makes on this team is kept here, with who made it. It cannot be edited."));
    const days = new Map();
    for (const a of shown) {
      const d = day(a.at);
      if (!days.has(d)) days.set(d, []);
      days.get(d).push(a);
    }
    list.replaceChildren(...[...days].map(([d, items]) =>
      h("section", { class: "cn-log-day" },
        h("p", { class: "cn-log-date" }, d),
        h("ol", { class: "cn-log" }, items.map((a) =>
          h("li", { class: "cn-log-item" },
            h("span", { class: "cn-avatar cn-avatar--s", "aria-hidden": "true" }, initials(a.actor.name)),
            h("p", { class: "cn-log-t" }, h("b", null, a.actor.name), " ", describe(a)),
            h("time", { class: "cn-log-at", datetime: a.at }, new Date(a.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })),
          ),
        )),
      ),
    ));
  };
  box.append(
    h("div", { class: "cn-team-bar" }, segmented("Kind", KINDS, kind, (v) => ((kind = v), draw()), { small: true }), h("label", { class: "cn-rolepick" }, people, icon("chevron", { cls: "cn-i--chev" }))),
    list,
  );
  block(list, () => api.get("/v1/team/activity?limit=200"), ({ activity: items }) => {
    rows = [...items].sort((a, b) => (a.at < b.at ? 1 : -1));
    const names = [...new Set(items.map((a) => a.actor.name))].sort();
    people.append(...names.map((n) => h("option", { value: n }, n)));
    draw();
    return [...list.childNodes];
  });
}

/* ---------------------------------------------------------------- agencies */

function agencies(box, active, isOwner) {
  const list = h("div", { class: "cn-stack" });
  const agency = active.kind === "agency";
  const reload = () =>
    block(list, () => api.get("/v1/team/links"), ({ links }) => [
      agency ? linkAsk(reload) : null,
      links.length
        ? section({ title: agency ? "Creators you work with" : "Agencies", line: agency ? "Each creator's owner chose what you may do. Either side can end it." : "Agencies see what the role you chose sees. You can change or end it at any time." },
            h("ul", { class: "cn-people" }, links.map((l) =>
              h("li", { class: "cn-person" },
                h("span", { class: "cn-teamtile cn-teamtile--m", "data-kind": agency ? "creator" : "agency", "aria-hidden": "true" }, initials(agency ? (l.creator?.name ?? l.email) : l.agency.org)),
                h("div", { class: "cn-person-main" },
                  h("p", { class: "cn-item-t" }, agency ? (l.creator?.name ?? l.email) : l.agency.org),
                  h("p", { class: "cn-item-d" }, `${roleName(l.role)}. Asked ${day(l.invitedAt)}${l.answeredAt ? `, answered ${day(l.answeredAt)}` : ""}.`),
                ),
                pill(l.state === "active" ? "live" : l.state === "invited" ? "running" : "off", l.state === "invited" ? "Asked" : l.state === "active" ? "Linked" : "Ended"),
                h("div", { class: "cn-person-actions" },
                  !agency && l.state === "invited" && isOwner
                    ? quiet(`Let them in as ${l.role}`, async () => {
                        await api.post(`/v1/team/links/${seg(l.id)}/accept`, { noticeShown: true, role: l.role });
                        reload();
                        return "Linked. You can change or end it at any time.";
                      }, { primary: true, confirm: `${l.agency.org} will see what ${an(l.role)} ${l.role} sees on your team, and nothing of your other teams.` })
                    : null,
                  l.state === "active" || l.state === "invited"
                    ? quiet(l.state === "active" ? "End link" : "Withdraw", async () => {
                        await api.del(`/v1/team/links/${seg(l.id)}`);
                        reload();
                        return "Ended. Access stopped at once.";
                      }, { danger: true, confirm: l.state === "active" ? "End this link? Access stops at once." : "Withdraw this request?" })
                    : null,
                ),
              ),
            )),
          )
        : emptyState("link", agency ? "No creators linked yet." : "No agencies linked.", [], agency ? "Ask a creator by email. Nothing is shared until their owner says yes." : "An agency you work with can ask to link. You choose what they may do, and can end it at any time."),
    ]);
  box.append(list);
  reload();
}

function linkAsk(reload) {
  let role = "viewer";
  const email = h("input", { class: "cn-field-input", type: "email", required: true, placeholder: "creator@example.com", "aria-label": "Creator's email" });
  const msg = h("div");
  const f = h("form", { class: "cn-invite" },
    h("div", { class: "cn-invite-row" }, h("label", { class: "cn-field cn-invite-email" }, icon("mail"), email), segmented("Ask for", [["manager", "Manager"], ["editor", "Editor"], ["viewer", "Viewer"]], role, (r) => (role = r), { small: true }), h("button", { class: "cn-btn cn-btn--primary", type: "submit" }, "Ask to link")),
    msg,
  );
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.post("/v1/team/links", { email: email.value.trim(), role });
      email.value = "";
      toast("Asked. Nothing is shared until they say yes.");
      reload();
    } catch (err) {
      msg.replaceChildren(failure(err));
    }
  });
  return section({ title: "Ask a creator to link", line: "Their owner chooses whether to let you in, and as what." }, f);
}

/* ---------------------------------------------------------------- rules */

function rules(box) {
  const list = h("div", { class: "cn-stack" });
  const RULES = [
    ["money", "Commit money", "Accept deals, fund bookings, list for sale.", true],
    ["consent", "Share data and publish", "Opt in to sponsorships, share links, publish.", false],
    ["rights", "Grant rights", "Let others use the work.", false],
  ];
  const reload = () =>
    block(list, () => api.get("/v1/team/rules"), ({ rules: current }) => {
      const has = (a) => current.find((r) => r.action === a);
      return section({ title: "What managers may do alone", line: "By default these wait for you. Anything a manager does alone is still in Activity." },
        h("ul", { class: "cn-rules" }, RULES.map(([a, name, line, withAmount]) => {
          const rule = has(a);
          const amount = h("input", { class: "cn-field-input cn-rule-amt", type: "number", min: 0, step: 50, inputmode: "numeric", placeholder: "No limit", value: rule?.maxAmount ?? "", "aria-label": `${name}: up to, in pounds` });
          const save = async (on) => {
            const max = withAmount ? String(amount.value).trim() : "";
            try {
              await api.put("/v1/team/rules", on ? { action: a, ...(max ? { maxAmount: Number(max) } : {}) } : { action: a, on: "no" });
              toast(on ? (max ? `Managers may ${name.toLowerCase()} up to ${pounds(max)} alone.` : `Managers may ${name.toLowerCase()} alone.`) : `${name} waits for you again.`);
              reload();
            } catch (e) {
              list.append(failure(e));
            }
          };
          const sw = h("button", { class: "cn-toggle", type: "button", role: "switch", "aria-checked": String(Boolean(rule)), "aria-label": `${name}: managers alone`, onclick: () => save(!rule) }, h("span", { class: "cn-toggle-sw", "aria-hidden": "true" }));
          amount.addEventListener("change", () => save(true));
          return h("li", { class: "cn-rule" },
            h("div", { class: "cn-person-main" }, h("p", { class: "cn-item-t" }, name), h("p", { class: "cn-item-d" }, rule ? (rule.maxAmount === null ? "Managers alone, any amount." : `Managers alone, up to ${pounds(rule.maxAmount)}.`) : `Waits for you. ${line}`)),
            withAmount ? h("label", { class: "cn-rule-amtwrap", hidden: !rule }, h("span", { class: "cn-item-d" }, "Up to £"), amount) : null,
            sw,
          );
        })),
      );
    });
  box.append(list);
  reload();
}
