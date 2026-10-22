/*
  Joining a team from an invitation link (/orbe-site/demo/app/invite?token=...): the team,
  the role offered and what it may do, then one button. The link works once,
  for the address it was sent to, until it expires; the server checks all
  three. It takes the whole window on the painted sky, like the walkthrough.
*/
import { api, seg } from "./api.js";
import { paintedSky } from "./sky.js";
import { icon } from "./icons.js";
import { lockup } from "./shell.js";
import { failure, h } from "./ui.js";

const ROLE_LINE = {
  manager: "You can answer offers, run campaigns and deliveries. Money, sharing and rights wait for the owner.",
  editor: "You can work on the Library, notes, documents, Fix and ratings. Deals and money stay with the owner.",
  viewer: "You can read the record and reports. You change nothing.",
};
const KIND = { creator: "creator team", brand: "brand team", agency: "agency" };
const initials = (s) => (s || "O").trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** The invitation, said plainly: shown here and on the sign-in page before someone signs in. */
export async function invitationCard(token) {
  const { invitation: inv } = await api.get(`/v1/teams/invitations/${seg(token)}`);
  return inv;
}

export async function render(main) {
  document.body.dataset.screen = "welcome";
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const card = h("div", { class: "cn-wl-card cn-join" });
  const stage = h("div", { class: "cn-wl" },
    h("header", { class: "cn-wl-top" }, h("a", { class: "cn-mark", href: "/orbe-site/demo/app/", "aria-label": "Orbe" }, lockup()), h("a", { class: "cn-wl-skip", href: "/orbe-site/demo/app/" }, "Not now")),
    h("div", { class: "cn-wl-main" }, card),
  );
  main.append(stage);
  requestAnimationFrame(() => card.classList.add("is-in"));
  paintedSky(stage, { seed: 19 });
  const done = (title, line) => card.replaceChildren(h("span", { class: "cn-join-ico", "aria-hidden": "true" }, icon("link")), h("h1", { class: "cn-wl-h", tabindex: "-1", "data-title": "" }, title), h("p", { class: "cn-wl-line" }, line), h("div", { class: "cn-wl-actions" }, h("a", { class: "cn-btn cn-btn--primary", href: "/orbe-site/demo/app/" }, "Go to your Orbe")));
  if (!token) return done("This link has no invitation in it", "Open the link from the email again, or ask the team for a new one.");
  let inv;
  try {
    inv = await invitationCard(token);
  } catch (e) {
    return card.replaceChildren(failure(e));
  }
  if (inv.state !== "open") return done(inv.state === "accepted" ? "This invitation has been used" : inv.state === "expired" ? "This invitation has expired" : "This invitation was withdrawn", "Ask the team for a new one. Each link works once, for 7 days.");
  const status = h("p", { class: "cn-wl-status", role: "status" });
  const join = h("button", { class: "cn-btn cn-btn--primary", type: "button" }, "Join the team");
  join.addEventListener("click", async () => {
    join.disabled = true;
    status.textContent = "";
    try {
      await api.post("/v1/teams/invitations/accept", { token });
      location.assign("/orbe-site/demo/app/");
    } catch (e) {
      join.disabled = false;
      status.textContent = e.message;
    }
  });
  card.replaceChildren(
    h("span", { class: "cn-teamtile cn-teamtile--xl", "data-kind": inv.team.kind, "aria-hidden": "true" }, initials(inv.team.name)),
    h("p", { class: "cn-wl-count" }, `An invitation to a ${KIND[inv.team.kind] ?? "team"}`),
    h("h1", { class: "cn-wl-h", tabindex: "-1", "data-title": "" }, `Join ${inv.team.name}`),
    h("p", { class: "cn-wl-line" }, `As ${inv.role === "editor" ? "an" : "a"} ${inv.role}. ${ROLE_LINE[inv.role] ?? ""}`),
    h("dl", { class: "cn-join-facts" },
      h("div", null, h("dt", null, "Sent to"), h("dd", null, inv.email)),
      h("div", null, h("dt", null, "Works until"), h("dd", null, new Date(inv.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }))),
    ),
    status,
    h("div", { class: "cn-wl-actions" }, join),
    h("p", { class: "cn-wl-terms cn-join-note" }, "Joining shares nothing of yours with the team. You can leave at any time from Settings."),
  );
  card.querySelector("[data-title]")?.focus({ preventScroll: true });
}
