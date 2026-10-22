/*
  The tools around the Connections page: the webhooks, exports and Notion
  drawers, and the staff-only platform approvals checklist. Connecting and
  every status now live on the Connections page (creator/connect.js), drawn
  from GET /v1/me/sources; the old Integrations section of Settings draws
  that same page, so links and the platforms' sign-in returns still land.
*/
import { api, apiHref } from "./api.js";
import { card, codeBlock, drawer, emptyState, pill, section, skeleton } from "./console-ui.js";
import { icon } from "./icons.js";
import { action, actions, check, day, field, form, h, input, when } from "./ui.js";

const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false));

/** Settings, Integrations: the Connections page, and for Orbe staff the approvals checklist under it. */
export async function renderIntegrations(el, ctx) {
  const { connections } = await import("./creator/connect.js");
  await connections(el, ctx);
  if ((ctx.user.roles ?? []).includes("admin")) {
    const a = await approvals();
    if (a) el.append(a);
  }
}

const EVENT_NAMES = { "deal.agreed": "A deal agreed", "read.verified": "A read verified", "rating.ready": "A rating ready", "clip.rendered": "A clip made", "media.sent": "Something sent", "agreement.signed": "An agreement signed" };

export function webhooksDrawer(owner) {
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

const EXPORTS = [["works", "Works"], ["ratings", "Ratings"], ["deals", "Deals"], ["sends", "Everything sent"]];

export function exportsDrawer() {
  drawer("Export", () => [
    h("p", null, "Each downloads as a CSV. In Google Sheets, choose File, Import, Upload, and pick the file."),
    h("ul", { class: "cn-list" }, EXPORTS.map(([k, name]) => h("li", { class: "cn-share" }, h("p", { class: "cn-item-t" }, name), h("a", { class: "cn-btn cn-btn--s", href: apiHref(`/v1/me/exports/${k}`), download: `orbe-${k}.csv` }, icon("doc"), "CSV")))),
  ]);
}

export function notionDrawer() {
  drawer("Send to Notion", () => [
    h("p", null, "One page for each row, up to 100, in the database you connected."),
    actions(...EXPORTS.map(([k, name]) => action(name, async () => {
      const r = await api.post("/v1/me/exports/notion", { kind: k });
      return `${r.pages} pages made in Notion.`;
    }))),
  ]);
}

export async function approvals() {
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
