/*
  The concierge desk, for Orbe staff: campaigns run by hand for brands while
  payments are recorded by staff. Set up a brand, write its brief, then run
  each campaign from its own page.
*/
import { api, seg } from "../api.js";
import { block, check, countryCodes, day, field, form, h, input, money, select, textarea } from "../ui.js";
import { emptyState, section, toolShell } from "../console-ui.js";
import { tile } from "../catalogue.js";
import { choice, narrow, status, table, twoLine } from "../cards.js";
import { CAMPAIGN_STATES } from "../brand/campaigns.js";

const STATE_TONE = { open: "good", closed: "off", cancelled: "off" };
const iso = (d) => d.toISOString().slice(0, 10);

function brandForm(reload) {
  return section({ title: "Set up a brand", line: "A brand the desk runs campaigns for. They can sign in with the contact email later to follow along." },
    narrow(form(
      [
        field("Organisation", input({ name: "org", required: true, maxlength: 120 })),
        field("Contact email", input({ name: "email", type: "email", required: true, maxlength: 254 })),
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
    )),
  );
}

function campaignForm(brands, ctx) {
  if (!brands.length) return emptyState("megaphone", "Set up a brand first.", []);
  const now = new Date();
  return narrow(form(
    [
      field("Brand", select(brands.map((b) => [b.id, b.org]), { name: "brandId" })),
      field("Campaign name", input({ name: "title", required: true, maxlength: 120 })),
      field("What is being promoted", textarea({ name: "product", required: true, maxlength: 1000 }), "Creators read this when the offer arrives."),
      field("Budget (£)", input({ name: "budget", type: "number", min: "1", step: "1", required: true, inputmode: "numeric" }), "Everything the brand spends, Orbe's fee included."),
      field("Countries (optional)", input({ name: "countries", maxlength: 200, value: "GB" }), "Two-letter codes, separated by commas."),
      h("div", { class: "ap-pair" }, field("Publish from", input({ name: "start", type: "date", required: true, value: iso(new Date(now.getTime() + 7 * 864e5)) })), field("Publish by", input({ name: "end", type: "date", required: true, value: iso(new Date(now.getTime() + 49 * 864e5)) }))),
      choice("The brand reviews each draft", { name: "reviewDrafts" }),
    ],
    "Create and open it",
    async (d) => {
      const countries = countryCodes(d.get("countries"));
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
  ));
}

export async function render(main, ctx) {
  const list = h("div", { class: "ap-stack" });
  const create = h("div", { class: "ap-stack" });
  toolShell(main, { title: "Desk", tile: tile("products/sponsorships/", "spon", h, "l"), line: "Campaigns run by hand for brands. Staff record each payment; nothing moves money on its own.", tags: [["Orbe staff only", "straw"]] }).append(
    h("div", { class: "ap-stack" }, list, create),
  );
  const reload = () =>
    block(create, () => api.get("/v1/admin/desk/brands"), ({ brands }) => [
      section({ title: "New campaign", line: "Podcasts, host-read spots." }, campaignForm(brands, ctx)),
      brandForm(reload),
    ]);
  reload();
  await block(list, () => api.get("/v1/admin/desk/campaigns"), ({ campaigns }) =>
    section(
      { title: "Campaigns", line: "Open one to run it, from the shortlist to the payouts." },
      campaigns.length
        ? table([["Campaign"], ["State"], ["Budget", "num"], ["Publish"]], campaigns.map((c) => [
            twoLine(h("a", { href: `/orbe-site/demo/app/desk/campaigns/${seg(c.id)}` }, c.title), c.brand ?? "Brand"),
            status(CAMPAIGN_STATES[c.state] ?? c.state, STATE_TONE[c.state]),
            money(c.budget),
            `${day(c.window.start)} to ${day(c.window.end)}`,
          ]), { caption: "Desk campaigns" })
        : emptyState("bolt", "No campaigns yet.", []),
    ),
  );
}
