/*
  Settings: a list of sections on the left and the chosen one beside it.
  Each section is a view over routes the app already uses, so nothing here
  is a second copy of a screen: connections, the plan and API keys render
  their own screens' modules inside the section.
*/
import { api, can, currentTeam, on, seg } from "./api.js";
import { settingsFor } from "./catalogue.js";
import { card, emptyState, section } from "./console-ui.js";
import { icon } from "./icons.js";
import { action, actions, block, count, day, field, form, h, input, plural, when } from "./ui.js";

const initials = (s) => (s || "O").replace(/\(.*?\)/g, "").trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))));

/** A screen module drawn inside a section, without its own page title (the section has one). */
async function embed(el, load, ctx) {
  const m = await load();
  const host = h("div", { class: "cn-embed" });
  el.append(host);
  await m.render(host, ctx);
  // The section already names it: the screen's own head, line, tags and tab bar go.
  for (const t of host.querySelectorAll(".ap-h1, .ap-lede, .cn-tp-head, .cn-tp-line, .cn-tags, .cn-ts > .cn-tp-tabs, .cn-back")) t.remove();
}

/** "Mozilla/5.0 (Macintosh...) ... Chrome/141" to "Chrome on a Mac". */
export function deviceName(ua) {
  if (!ua) return "A browser";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl|node|undici/i.test(ua) ? "A program" : "A browser";
  const os = /iPhone|iPad/.test(ua) ? "an iPhone or iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "a Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return os ? `${browser} on ${os}` : browser;
}

/** Keys belong to a brand or an agency: false until one of the two profiles is set up. */
async function keysOpen() {
  try {
    await api.get("/v1/keys");
    return true;
  } catch (e) {
    if (e.code === "not_a_brand_or_manager") return false;
    throw e;
  }
}

/** Start the first-sign-in walkthrough again, and the short tour after it. */
function tourCard(ctx) {
  return section({ title: "The walkthrough", line: "The few questions from your first sign-in, and the short tour of the console after them." },
    actions(action("Start it again", async () => {
      await api.put("/v1/me/welcome", { restart: true });
      ctx.go("/orbe-site/demo/app/welcome");
    })),
  );
}

async function deleteCard() {
  const { eraseBox } = await import("./creator/record.js");
  return section({ title: "Delete account", line: "Deletes your account and everything Orbe holds about you, including what was read through your connections.", cls: "cn-card--danger" }, h("p", null, "Brands with finished bookings keep their own invoices. This cannot be undone."), eraseBox());
}

/** Said once where a role cannot change something, instead of a button that would be refused. */
function readOnly(text) {
  const t = currentTeam();
  return h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, text ?? `Only the team's owner${t?.role === "viewer" ? "" : " and managers"} can change this. You are ${t?.role === "editor" ? "an" : "a"} ${t?.role ?? "member"} on ${t?.name ?? "this team"}.`));
}

const needsProfile = () =>
  emptyState("key", "Keys and their use belong to a brand or an agency. Set one up first.", [["Set up the brand", "/orbe-site/demo/app/settings/brand", true], ["Set up a roster", "/orbe-site/demo/app/roster"]]);

const SECTIONS = {
  async account(el, ctx) {
    const u = ctx.user;
    if (u.type === "creator") {
      // Only the owner deletes the account; only those who run it rename it.
      const del = can("owner") ? await deleteCard() : null;
      await block(el, () => api.get("/v1/me"), ({ creator, accounts }) => [
        section({ title: "Personal profile", line: "How you appear to brands and buyers you choose to work with." },
          h("div", { class: "cn-profile" }, h("span", { class: "cn-avatar cn-avatar--l", "aria-hidden": "true" }, initials(creator.displayName || creator.email)), h("div", null, h("p", { class: "cn-item-t" }, creator.displayName || "No name yet"), h("p", { class: "cn-item-d" }, creator.email))),
          can("business")
            ? form([field("Name", input({ name: "displayName", required: true, maxlength: 80, autocomplete: "name", value: creator.displayName }), "Brands and buyers you agree to work with see this name.")], "Save", async (d) => {
                await api.patch("/v1/me", { displayName: String(d.get("displayName")).trim() });
                return "Saved.";
              })
            : readOnly(),
        ),
        section({ title: "Email and sign-in", line: "No password: Orbe never asks for one, or for your platform passwords." },
          kv([["Email", creator.email], ["Ways in", "Continue with Google, or an emailed link"], ["Account", "Creator"], ["Joined", day(creator.createdAt)]]),
          h("p", { class: "cn-label" }, "To change the email on your account, write to Orbe from the address you use now."),
        ),
        card("Your accounts",
          accounts.length
            ? h("ul", { class: "cn-list" }, accounts.map((a) => h("li", null, h("span", null, a.handle || a.title), h("span", { class: "cn-item-d" }, `${a.kind}${a.audience ? `, ${count(a.audience)} audience` : ""}`))))
            : emptyState("link", "No accounts claimed yet.", [["Connect an account", "/orbe-site/demo/app/settings/connections", true]]),
        ),
        tourCard(ctx),
        del,
      ]);
    } else {
      await block(el, () => api.get("/v1/buyer/me"), ({ buyer }) => [
        section({ title: "Organisation", line: "Who creators see when you book them." },
          h("div", { class: "cn-profile" }, h("span", { class: "cn-avatar cn-avatar--l", "aria-hidden": "true" }, initials(buyer.org || buyer.email)), h("div", null, h("p", { class: "cn-item-t" }, buyer.org || "No organisation yet"), h("p", { class: "cn-item-d" }, buyer.email))),
          can("business")
            ? form([field("Organisation", input({ name: "org", required: true, maxlength: 120, autocomplete: "organization", value: buyer.org }))], "Save", async (d) => {
                await api.patch("/v1/buyer/me", { org: String(d.get("org")).trim() });
                return "Saved.";
              })
            : readOnly(),
        ),
        section({ title: "Email and sign-in", line: "No password: Orbe never asks for one." }, kv([["Email", buyer.email], ["Ways in", "Continue with Google, or an emailed link"], ["Account", "Brand"], ["Joined", day(buyer.createdAt)]])),
        tourCard(ctx),
      ]);
    }
  },
  async team(el, ctx) {
    const m = await import("./team.js");
    await m.renderTeam(el, ctx);
  },
  async integrations(el, ctx) {
    const m = await import("./integrations.js");
    await m.renderIntegrations(el, ctx);
  },
  async sharing(el, ctx) {
    const m = await import("./sharing.js");
    await m.renderSharing(el, ctx);
  },
  async connections(el, ctx) {
    if (!can("owner")) {
      // Connections are the owner's: others see what is read, and nothing to press.
      el.append(readOnly("Only the owner connects or removes accounts. You can see what Orbe reads for this team."));
      await embed(el, () => import("./creator/connect.js"), ctx);
      el.querySelector(".cn-embed")?.classList.add("cn-readonly");
      return;
    }
    await embed(el, () => import("./creator/connect.js"), ctx);
  },
  async plan(el) {
    const m = await import("./creator/plan.js");
    const box = h("div", { class: "ap-stack" });
    el.append(card("Your plan", box));
    m.planBox(box);
    await block(el.appendChild(h("div")), async () => {
      const [me, plan] = await Promise.all([api.get("/v1/me"), api.get("/v1/me/plan").catch(() => null)]);
      return { me, plan: plan?.plan ?? null };
    }, ({ me, plan }) => card("This month",
      h("dl", { class: "ap-figs" },
        plan ? h("div", { class: "ap-figs-row" }, h("dt", null, "Predictions sealed"), h("dd", null, `${plan.usage.predictionsThisMonth} of ${plan.entitlements.predictionsPerMonth}`)) : null,
        h("div", { class: "ap-figs-row" }, h("dt", null, "Accounts claimed"), h("dd", null, String(me.accounts.length))),
        h("div", { class: "ap-figs-row" }, h("dt", null, "Sources read"), h("dd", null, String(me.connections.length))),
        plan ? h("div", { class: "ap-figs-row" }, h("dt", null, "Rating history kept"), h("dd", null, plural(plan.entitlements.historyDays, "day"))) : null,
      ),
      plan ? h("p", { class: "ap-note" }, `Counts start again ${day(plan.usage.resetsAt)}.`) : null,
    ));
  },
  async brand(el, ctx) {
    await embed(el, () => import("./brand/profile.js"), ctx);
  },
  async keys(el, ctx) {
    if (!(await keysOpen())) return el.append(needsProfile());
    await embed(el, () => import("./brand/keys.js"), ctx);
  },
  async metrics(el) {
    const m = await import("./metrics.js");
    await m.render(el);
  },
  async mcp(el, ctx) {
    await embed(el, () => import("./tools/developers.js"), ctx);
  },
  async security(el) {
    const draw = () =>
      block(el, () => api.get("/v1/auth/sessions"), ({ sessions }) =>
        card("Where you are signed in",
          h("ul", { class: "cn-list" }, sessions.map((x) =>
            h("li", { class: "cn-session" },
              h("div", null, h("span", { class: "cn-session-ico" }, icon(/iPhone|Android/.test(x.userAgent ?? "") ? "monitor" : "monitor")), h("div", null, h("p", { class: "cn-item-t" }, deviceName(x.userAgent), x.current ? h("span", { class: "cn-chip cn-chip--here" }, "This device") : null), h("p", { class: "cn-item-d" }, `Signed in ${day(x.createdAt)}, last seen ${when(x.lastSeenAt)}`))),
              x.current ? null : actions(action("Sign out", async () => {
                await api.del(`/v1/auth/sessions/${seg(x.id)}`);
                draw();
                return "Signed out on that device.";
              }, { danger: true })),
            ),
          )),
          h("p", { class: "ap-note" }, "A session lasts 30 days from its last use. Signing out here ends it at once."),
        ),
      );
    await draw();
  },
};

export async function render(main, ctx) {
  const sections = settingsFor(ctx.user, on);
  const id = sections.some((s) => s.id === ctx.params.section) ? ctx.params.section : sections[0].id;
  const here = sections.find((s) => s.id === id);
  const panel = h("div", { class: "cn-settings-panel" });
  const groups = [...new Set(sections.map((s) => s.group))];
  const find = h("input", { class: "cn-field-input", type: "search", placeholder: "Search settings", "aria-label": "Search settings" });
  const nav = h("nav", { class: "cn-settings-nav", "aria-label": "Settings" },
    h("label", { class: "cn-field cn-settings-search" }, icon("search"), find),
    groups.map((g) => [
      // Few sections, so one list with no headings: a heading over one or two items says nothing.
      h("ul", { "data-group": g }, sections.filter((s) => s.group === g).map((s) => h("li", { "data-words": `${s.name} ${s.line}`.toLowerCase() }, h("a", { class: "cn-settings-link", href: `/orbe-site/demo/app/settings/${s.id}`, "aria-current": s.id === id ? "page" : null }, icon(s.icon), s.name)))),
    ]),
  );
  find.addEventListener("input", () => {
    const q = find.value.trim().toLowerCase();
    for (const li of nav.querySelectorAll("li")) li.hidden = Boolean(q) && !li.dataset.words.includes(q);
  });
  main.append(
    h("div", { class: "cn-settings" },
      nav,
      h("div", { class: "cn-settings-main" },
        h("header", { class: "cn-pagehead" }, h("div", null, h("p", { class: "cn-eyebrow" }, "Settings"), h("h1", { class: "cn-h1", tabindex: "-1", "data-title": "" }, here.name), h("p", { class: "cn-sub" }, here.line))),
        panel,
      ),
    ),
  );
  await SECTIONS[id](panel, ctx);
}
