/* Campaigns: each brief and its state, and a new brief. */
import { api, seg } from "../api.js";
import { FORMATS, KINDS } from "../terms.js";
import { block, countryCodes, day, field, form, h, input, money, textarea } from "../ui.js";
import { emptyState, screenHead, section } from "../console-ui.js";
import { choice, narrow, picks, status, table, twoLine } from "../cards.js";

export const CAMPAIGN_TONE = { open: "good", closed: "off", cancelled: "off" };
export const CAMPAIGN_STATES = { draft: "Draft", open: "Open", closed: "Closed", cancelled: "Cancelled" };
/** A campaign's state as a pill, in words. */
export const campaignState = (state) => status(CAMPAIGN_STATES[state] ?? state, CAMPAIGN_TONE[state]);
const FORMAT_CHOICES = [...new Map(FORMATS.map((f) => [f.format, f.format === "dedicated" ? "Dedicated video or send" : f.name])).entries()];
const iso = (d) => d.toISOString().slice(0, 10);

function briefForm(ctx) {
  const now = new Date();
  const start = new Date(now.getTime() + 7 * 864e5);
  const end = new Date(now.getTime() + 49 * 864e5);
  return narrow(form(
    [
      field("Campaign name", input({ name: "title", required: true, maxlength: 120 })),
      field("What you are promoting", textarea({ name: "product", required: true, maxlength: 1000 }), "Creators read this when your offer arrives."),
      field("Budget (£)", input({ name: "budget", type: "number", min: "1", step: "1", required: true, inputmode: "numeric" }), "Everything you spend, Orbe's fee included."),
      picks("Where", "kinds", Object.entries(KINDS).filter(([k]) => k !== "photography").map(([k, name]) => [k, name, k === "podcast" || k === "youtube"])),
      picks("Formats", "formats", FORMAT_CHOICES.map(([f, name]) => [f, name, f === "podcast_read" || f === "integration"])),
      field("Countries (optional)", input({ name: "countries", maxlength: 200, placeholder: "GB, IE" }), "Two-letter codes, separated by commas. Empty means anywhere."),
      h("div", { class: "ap-pair" }, field("Publish from", input({ name: "start", type: "date", required: true, value: iso(start) })), field("Publish by", input({ name: "end", type: "date", required: true, value: iso(end) }))),
      h("div", { class: "ap-pair" }, field("Smallest audience (optional)", input({ name: "minAudience", type: "number", min: "0", step: "1" })), field("Largest audience (optional)", input({ name: "maxAudience", type: "number", min: "0", step: "1" }))),
      field("Most you will pay per 1,000 (£, optional)", input({ name: "cpm", type: "number", min: "0.01", step: "0.01" }), "Matches are scored against it, and the report measures it."),
      choice("Review each draft before it goes out", { name: "reviewDrafts", checked: true }),
      choice("Open it now", { name: "open", checked: true }, "So offers can be sent."),
    ],
    "Create the campaign",
    async (d) => {
      const num = (k) => {
        const v = String(d.get(k) ?? "").trim();
        return v === "" ? undefined : Number(v);
      };
      const kinds = d.getAll("kinds").map(String);
      const formats = d.getAll("formats").map(String);
      if (!formats.length) throw new Error("Choose at least one format.");
      const countries = countryCodes(d.get("countries"));
      const body = {
        title: String(d.get("title")).trim(),
        product: String(d.get("product")).trim(),
        budget: Number(d.get("budget")),
        kinds,
        formats,
        start: String(d.get("start")),
        end: String(d.get("end")),
        reviewDrafts: d.get("reviewDrafts") === "on",
        open: d.get("open") === "on",
        ...(countries.length ? { countries } : {}),
        ...(num("minAudience") !== undefined ? { minAudience: num("minAudience") } : {}),
        ...(num("maxAudience") !== undefined ? { maxAudience: num("maxAudience") } : {}),
        ...(num("cpm") !== undefined ? { kpis: { costPerThousandMax: num("cpm") } } : {}),
      };
      const r = await api.post("/v1/brand/campaigns", body);
      ctx.go(`/orbe-site/demo/app/campaigns/${seg(r.campaign.id)}`);
      return "Created.";
    },
  ));
}

export async function render(main, ctx) {
  const list = h("div", { class: "ap-stack" });
  const brief = h("details", { class: "ap-more cn-brief", open: ctx.query.get("new") === "1" }, h("summary", null, "Write a brief"), briefForm(ctx));
  screenHead(main, "campaigns", { line: "Write a brief, see creators matched from their verified records, and send offers at their price with a guarantee.", tags: [["Paid on verified delivery", "sky"]] }).append(
    h("div", { class: "ap-stack" }, list, section({ title: "New campaign", line: "A brief in; creators matched from their verified records out." }, brief)),
  );
  await block(list, () => api.get("/v1/brand/campaigns"), ({ campaigns }) =>
    section(
      { title: "Your campaigns", line: "Open one for its matches, offers and report." },
      campaigns.length
        ? table([["Campaign"], ["State"], ["Budget", "num"], ["Publish"]], [...campaigns].reverse().map((c) => [
            twoLine(h("a", { href: `/orbe-site/demo/app/campaigns/${seg(c.id)}` }, c.brief.title), `Started ${day(c.createdAt)}`),
            campaignState(c.state),
            money(c.brief.budget),
            `${day(c.brief.window.start)} to ${day(c.brief.window.end)}`,
          ]), { caption: "Your campaigns" })
        : emptyState("megaphone", "No campaigns yet.", [], "Write a brief below to see who fits."),
    ),
  );
}
