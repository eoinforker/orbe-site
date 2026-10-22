/*
  The concierge desk, for Orbe staff: campaigns run by hand for brands while
  payments are recorded by staff. Set up a brand, write its brief, then run
  each campaign from its own page.
*/
import { api, seg } from "../api.js";
import { block, check, chip, day, empty, field, form, h, input, money, panel, select, textarea, title } from "../ui.js";
import { toolShell } from "../console-ui.js";

const STATE_TONE = { open: "good", closed: "off", cancelled: "off" };
const iso = (d) => d.toISOString().slice(0, 10);

function brandForm(reload) {
  return h("details", { class: "ap-more" }, h("summary", null, "Set up a brand"),
    form(
      [
        field("Organisation", input({ name: "org", required: true, maxlength: 120 })),
        field("Contact email", input({ name: "email", type: "email", required: true, maxlength: 254 }), "They can sign in with it later to follow the campaign."),
        field("Category", input({ name: "category", required: true, maxlength: 40, placeholder: "sleep" }), "Matched against the categories creators exclude."),
        check("The brand has accepted the brand terms in writing", { name: "terms", required: true }),
      ],
      "Save the brand",
      async (d, f) => {
        await api.post("/v1/admin/desk/brands", { org: String(d.get("org")).trim(), email: String(d.get("email")).trim(), category: String(d.get("category")).trim(), termsAccepted: d.get("terms") === "on" });
        f.reset();
        reload();
        return "Brand saved.";
      },
    ),
  );
}

function campaignForm(brands, ctx) {
  if (!brands.length) return empty("Set up a brand first.");
  const now = new Date();
  return form(
    [
      field("Brand", select(brands.map((b) => [b.id, b.org]), { name: "brandId" })),
      field("Campaign name", input({ name: "title", required: true, maxlength: 120 })),
      field("What is being promoted", textarea({ name: "product", required: true, maxlength: 1000 }), "Creators read this when the offer arrives."),
      field("Budget (£)", input({ name: "budget", type: "number", min: "1", step: "1", required: true, inputmode: "numeric" }), "Everything the brand spends, Orbe's fee included."),
      field("Countries (optional)", input({ name: "countries", maxlength: 200, value: "GB" }), "Two-letter codes, separated by commas."),
      h("div", { class: "ap-pair" }, field("Publish from", input({ name: "start", type: "date", required: true, value: iso(new Date(now.getTime() + 7 * 864e5)) })), field("Publish by", input({ name: "end", type: "date", required: true, value: iso(new Date(now.getTime() + 49 * 864e5)) }))),
      check("The brand reviews each draft", { name: "reviewDrafts" }),
    ],
    "Create and open it",
    async (d) => {
      const countries = String(d.get("countries") ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
      const r = await api.post("/v1/admin/desk/campaigns", {
        brandId: String(d.get("brandId")),
        title: String(d.get("title")).trim(),
        product: String(d.get("product")).trim(),
        budget: Number(d.get("budget")),
        kinds: ["podcast"],
        formats: ["podcast_read"],
        start: String(d.get("start")),
        end: String(d.get("end")),
        reviewDrafts: d.get("reviewDrafts") === "on",
        ...(countries.length ? { countries } : {}),
      });
      ctx.go(`/orbe-site/demo/app/desk/campaigns/${seg(r.campaign.id)}`);
      return "Created.";
    },
  );
}

export async function render(main, ctx) {
  const list = h("div");
  const create = h("div");
  toolShell(main, { title: "Desk", line: "Campaigns run by hand for brands. Staff record each payment; nothing moves money on its own.", tags: [["Orbe staff only", "straw"]] }).append(
    h("div", { class: "ap-stack" }, panel("Campaigns", list), panel("New campaign", create)),
  );
  const reload = () =>
    block(create, () => api.get("/v1/admin/desk/brands"), ({ brands }) => [
      h("p", { class: "ap-note" }, "Podcasts, host-read spots."),
      campaignForm(brands, ctx),
      brandForm(reload),
    ]);
  reload();
  await block(list, () => api.get("/v1/admin/desk/campaigns"), ({ campaigns }) =>
    campaigns.length
      ? h("ul", { class: "ap-list" }, campaigns.map((c) =>
          h("li", { class: "ap-item" },
            h("div", { class: "ap-item-main" },
              h("p", { class: "ap-says" }, h("a", { href: `/orbe-site/demo/app/desk/campaigns/${seg(c.id)}` }, c.title), " ", chip(c.state, STATE_TONE[c.state])),
              h("p", { class: "ap-note" }, `${c.brand ?? "Brand"}. ${money(c.budget)} budget. Publish ${day(c.window.start)} to ${day(c.window.end)}.`),
            ),
          ),
        ))
      : empty("No campaigns yet."),
  );
}
