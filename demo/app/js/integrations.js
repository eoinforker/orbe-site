/*
  Settings, Integrations: every place Orbe can post to and every tool it
  works with, each with the status the server worked out (live, needs the
  platform's approval, not set up on this server, export only, coming) and
  one line on what it does for the creator. Nothing here decides a status:
  the API reads code, configuration and approvals, and this shows it.

  Connecting is the owner's: a sign-in through Orbe's app on the platform,
  a key pasted here, or the fast path's own linking page, which names its
  vendor. Webhooks, exports and Notion sit with the tools. Orbe staff also
  see the platform approvals checklist.

  Feature switches read here: on("integrations") for the section itself,
  on("relay") for the fast path, on("x") for X.
*/
import { api, apiHref, can, on, seg } from "./api.js";
import { card, codeBlock, drawer, emptyState, pill, section, skeleton } from "./console-ui.js";
import { icon } from "./icons.js";
import { action, actions, check, confirmBox, day, field, form, h, input, toast, when } from "./ui.js";

export const STATUS = {
  live: ["live", "Live"],
  needs_approval: ["needs", "Needs the platform's approval"],
  needs_key: ["coming", "Not set up here yet"],
  export_only: ["coming", "Export only"],
  coming: ["coming", "Coming"],
};
const statusPill = (s) => pill(...(STATUS[s] ?? STATUS.coming));
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false));

const GROUPS = [
  ["Video and social", (d) => d.category === "video" || d.category === "social"],
  ["Newsletters and blogs", (d) => d.category === "newsletter" || d.category === "blog"],
  ["Podcast hosts", (d) => d.category === "podcast"],
];
const TOOL_GROUPS = [["files", "Files"], ["agreements", "Agreements"], ["automation", "Automation and exports"], ["agents", "AI assistants"]];

export async function renderIntegrations(el, ctx) {
  const notice = new URLSearchParams(location.search);
  if (notice.get("connected")) toast(`Connected: ${notice.get("connected").split(",").join(", ")}.`);
  if (notice.get("error")) toast(notice.get("error"));
  if (!on("integrations")) return el.append(emptyState("plug", "Integrations are not switched on here yet."));
  const owner = can("owner");
  const body = h("div", { class: "ap-stack" }, skeleton(4));
  el.append(body);
  const draw = async () => {
    let data;
    try {
      data = await api.get("/v1/me/integrations");
    } catch (e) {
      return put(body, emptyState("plug", e.message));
    }
    put(body,
      owner ? null : h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, "Only the team's owner connects or removes integrations. You can see what is connected.")),
      ...GROUPS.map(([name, test]) => {
        const list = data.destinations.filter(test).filter((d) => d.id !== "x" || on("x"));
        return list.length ? section({ title: name }, h("ul", { class: "cn-list" }, list.map((d) => destinationRow(d, owner, draw)))) : null;
      }),
      on("relay") ? relaySection(data.relays, owner, draw) : null,
      ...TOOL_GROUPS.map(([g, name]) => {
        const list = data.tools.filter((t) => t.group === g);
        return list.length ? section({ title: name }, h("ul", { class: "cn-list" }, list.map((t) => toolRow(t, owner, draw, ctx)))) : null;
      }),
      (ctx.user.roles ?? []).includes("admin") ? await approvals() : null,
    );
  };
  await draw();
}

function row(name, line, status, connected, buttons) {
  return h("li", { class: "cn-share" },
    h("div", null,
      h("p", { class: "cn-item-t" }, name, connected ? pill("done", `Connected: ${connected.account ?? "yes"}`) : statusPill(status)),
      h("p", { class: "cn-item-d" }, line),
    ),
    h("div", { class: "cn-md-ways" }, buttons.filter(Boolean)),
  );
}

async function signIn(oauth) {
  try {
    const r = await api.post(`/v1/me/integrations/${seg(oauth)}/start`, {});
    location.assign(r.authorizeUrl);
  } catch (e) {
    toast(e.message);
  }
}

async function remove(id, name, redraw) {
  if (!(await confirmBox(`Disconnect ${name}? Orbe stops posting there and forgets the key or token.`, { yes: "Disconnect", danger: true }))) return;
  try {
    await api.del(`/v1/me/integrations/${seg(id)}`);
    toast(`${name} disconnected.`);
    redraw();
  } catch (e) {
    toast(e.message);
  }
}

function keyForm(title, fields, docs, submit, redraw) {
  drawer(title, (close) => {
    const controls = fields.map((f) => field(f.label, input({ name: f.key, type: f.kind === "secret" ? "password" : f.kind === "url" ? "url" : "text", autocomplete: "off", required: !f.optional }), f.help));
    return [
      form(controls, "Connect", async (d) => {
        const credentials = Object.fromEntries([...d].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
        await submit(credentials);
        close();
        redraw();
        return "Connected.";
      }),
      h("p", { class: "cn-item-d" }, "Sealed before it is stored, and used only when you send or export."),
      docs ? h("a", { href: docs, target: "_blank", rel: "noopener" }, "Their guide") : null,
    ];
  });
}

function destinationRow(d, owner, redraw) {
  const live = d.status === "live";
  const line = d.viaRelay ? `${d.note} Until then, ${d.viaRelay.name} can post for it.` : d.note;
  const buttons = [];
  if (owner && d.connected) buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => remove(d.id, d.name, redraw) }, "Disconnect"));
  else if (owner && live && d.auth === "oauth" && d.oauth) buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => signIn(d.oauth) }, icon("plug"), `Connect ${d.name}`));
  else if (owner && live && d.auth === "key") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => keyForm(`Connect ${d.name}`, d.fields, d.docs, (credentials) => api.put(`/v1/me/media/providers/${seg(d.id)}`, { credentials }), redraw) }, icon("plug"), "Connect"));
  buttons.push(h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: d.docs, target: "_blank", rel: "noopener", "aria-label": `${d.name}'s documentation` }, icon("external")));
  return row(d.name, line, d.status, d.connected, buttons);
}

function relaySection(relays, owner, redraw) {
  return section({ title: "The fast path", line: "For networks still reviewing Orbe's own app, a posting service that already holds their approvals. It is named wherever it is used, and Orbe keeps every post and its receipt." },
    h("ul", { class: "cn-list" }, relays.map((r) => row(r.name, r.note, r.status, r.connected, [
      owner && r.status === "live"
        ? h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: async () => {
            try {
              const out = r.connected ? await api.get(`/v1/me/integrations/relays/${seg(r.id)}/link`) : await api.post(`/v1/me/integrations/relays/${seg(r.id)}`, {});
              toast(out.note);
              window.open(out.url, "_blank", "noopener");
              redraw();
            } catch (e) {
              toast(e.message);
            }
          } }, icon("external"), r.connected ? `Link networks on ${r.name}` : `Start with ${r.name}`)
        : null,
    ]))),
  );
}

function toolRow(t, owner, redraw, ctx) {
  const buttons = [];
  if (t.id === "webhooks" && t.status === "live") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => webhooksDrawer(owner) }, icon("bolt"), "Webhooks"));
  if (t.id === "exports" && t.status === "live") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => exportsDrawer() }, icon("doc"), "Export"));
  if (t.id === "mcp") buttons.push(h("a", { class: "cn-btn cn-btn--s", href: "/orbe-site/demo/app/settings/mcp" }, icon("plug"), "Set up"));
  if (t.connected && owner) buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => remove(t.id, t.name, redraw) }, "Disconnect"));
  else if (owner && t.status === "live" && t.auth === "oauth") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => signIn(t.id) }, icon("plug"), `Connect ${t.name}`));
  else if (owner && t.status === "live" && t.auth === "key") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => keyForm(`Connect ${t.name}`, t.fields, t.docs, (credentials) => api.put(`/v1/me/integrations/tools/${seg(t.id)}`, { credentials }), redraw) }, icon("plug"), "Connect"));
  if (t.id === "notion" && t.connected) buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => notionDrawer() }, "Send to Notion"));
  void ctx;
  return row(t.name, t.line, t.status, t.connected, buttons);
}

const EVENT_NAMES = { "deal.agreed": "A deal agreed", "read.verified": "A read verified", "rating.ready": "A rating ready", "clip.rendered": "A clip made", "media.sent": "Something sent", "agreement.signed": "An agreement signed" };

function webhooksDrawer(owner) {
  drawer("Webhooks", (close) => {
    const box = h("div", { class: "ap-stack" }, skeleton(3));
    const load = async () => {
      const w = await api.get("/v1/me/webhooks");
      put(box,
        w.webhooks.length
          ? h("ul", { class: "cn-list" }, w.webhooks.map((x) => h("li", { class: "cn-share" },
              h("div", null, h("p", { class: "cn-item-t" }, x.url, x.paused ? pill("failed", "Paused after failures") : null), h("p", { class: "cn-item-d" }, x.events.map((e) => EVENT_NAMES[e] ?? e).join(", "))),
              owner ? actions(
                action("Test", async () => (await api.post(`/v1/me/webhooks/${seg(x.id)}/test`, {}), "A test is on its way.")),
                x.paused ? action("Resume", async () => (await api.post(`/v1/me/webhooks/${seg(x.id)}/resume`, {}), load(), "Resumed.")) : null,
                action("Remove", async () => (await api.del(`/v1/me/webhooks/${seg(x.id)}`), load(), "Removed."), { danger: true }),
              ) : null,
            )))
          : emptyState("bolt", "No webhooks yet."),
        owner ? card("Add a webhook",
          form([
            field("Address", input({ name: "url", type: "url", required: true, placeholder: "https://", autocomplete: "off" }), "Orbe signs every delivery with your secret: x-orbe-signature, t=seconds,v1=HMAC-SHA256 of t.body."),
            h("fieldset", { class: "cn-md-field" }, h("legend", null, "Events"), ...w.events.map((e) => check(EVENT_NAMES[e] ?? e, { name: "events", value: e, checked: true }))),
          ], "Add", async (d) => {
            const r = await api.post("/v1/me/webhooks", { url: String(d.get("url")).trim(), events: d.getAll("events").map(String) });
            put(box, h("p", null, "Your signing secret, shown once:"), codeBlock(r.secret, "Signing secret"), h("p", { class: "cn-item-d" }, r.note), actions(action("Done", async () => load())));
            return "Added.";
          }),
        ) : null,
        w.deliveries.length ? card("Recent deliveries", h("ul", { class: "cn-list" }, w.deliveries.slice(0, 20).map((d) => h("li", null, h("span", null, EVENT_NAMES[d.event] ?? d.event), h("span", { class: "cn-item-d" }, `${d.status}${d.lastStatus ? `, ${d.lastStatus}` : ""}${d.lastError ? `, ${d.lastError}` : ""}, ${when(d.createdAt)}`))))) : null,
      );
    };
    load().catch((e) => put(box, emptyState("bolt", e.message)));
    void close;
    return box;
  });
}

const EXPORTS = [["works", "Your works"], ["ratings", "Ratings"], ["deals", "Deals"], ["sends", "Everything sent"]];

function exportsDrawer() {
  drawer("Export", () => [
    h("p", null, "Each downloads as a CSV. In Google Sheets, choose File, Import, Upload, and pick the file."),
    h("ul", { class: "cn-list" }, EXPORTS.map(([k, name]) => h("li", { class: "cn-share" }, h("p", { class: "cn-item-t" }, name), h("a", { class: "cn-btn cn-btn--s", href: apiHref(`/v1/me/exports/${k}`), download: `orbe-${k}.csv` }, icon("doc"), "CSV")))),
  ]);
}

function notionDrawer() {
  drawer("Send to Notion", () => [
    h("p", null, "One page for each row, up to 100, in the database you connected."),
    actions(...EXPORTS.map(([k, name]) => action(name, async () => {
      const r = await api.post("/v1/me/exports/notion", { kind: k });
      return `${r.pages} pages made in Notion.`;
    }))),
  ]);
}

async function approvals() {
  let a;
  try {
    a = await api.get("/v1/admin/integrations");
  } catch {
    return null;
  }
  return section({ title: "Platform approvals", line: "Staff only. What each platform must approve, what it unlocks, and which of Orbe's keys are set." },
    h("ul", { class: "cn-list" }, a.approvals.map((x) => h("li", { class: "cn-share" },
      h("div", null, h("p", { class: "cn-item-t" }, x.name, x.granted ? pill("done", "Approved") : pill("needs", "Not yet")), h("p", { class: "cn-item-d" }, `${x.unlocks}. Typically ${x.time}${x.verified ? "" : " (unverified)"}.`)),
      h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: x.source, target: "_blank", rel: "noopener", "aria-label": "The platform's page" }, icon("external")),
    ))),
    card("Orbe's keys", h("ul", { class: "cn-list" }, a.keys.map((k) => h("li", null, h("span", null, k.for), h("span", { class: "cn-item-d" }, `${k.set ? "Set" : "Not set"}: ${k.env}`))))),
    h("p", { class: "cn-item-d" }, a.note),
    h("p", { class: "cn-item-d" }, `Checked ${day(new Date().toISOString())}.`),
  );
}
