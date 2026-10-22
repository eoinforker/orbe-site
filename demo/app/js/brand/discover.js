/*
  Discover: creators who opted in to sponsorships and to being found, searched
  by kind, size band, topic words, how many creators their size they beat,
  format and price. Results are anonymised refs until the creator accepts an
  offer from this brand; an offer can be sent to a ref.
*/
import { api, seg } from "../api.js";
import { FORMATS, formatName, KINDS } from "../terms.js";
import { block, check, chip, count, empty, field, form, h, input, money, panel, plural, select, signed, textarea, title, words } from "../ui.js";
import { screenHead } from "../console-ui.js";

const BANDS = ["seed", "rise", "low", "mid", "high", "top"];
const FORMAT_KEYS = [...new Set(FORMATS.map((f) => f.format))];
const CHECK = { below: "under Orbe's suggestion", within: "inside Orbe's suggested range", above: "over Orbe's suggestion" };

function offerForm(account, campaigns) {
  const open = campaigns.filter((c) => c.state === "open");
  if (!open.length) return h("p", { class: "ap-note" }, "Open a campaign to send an offer.");
  const offerings = account.offerings.filter((o) => o.available);
  if (!offerings.length) return h("p", { class: "ap-note" }, "Nothing on offer right now.");
  return form(
    [
      field("Campaign", select(open.map((c) => [c.id, c.brief.title]), { name: "campaign" })),
      field("Format", select(offerings.map((o) => [o.format, o.name]), { name: "format" })),
      field("Price for the creator (£, optional)", input({ name: "price", type: "number", min: "0.01", step: "0.01", inputmode: "decimal" }), "Empty sends their list price. Orbe's fee is added on top."),
      field("Guarantee at the format's last window (optional)", input({ name: "units", type: "number", min: "1", step: "1" }), "Views, downloads, opens or viewer-hours. Empty for no guarantee."),
      field("A note (optional)", textarea({ name: "message", maxlength: 2000 })),
    ],
    "Send the offer",
    async (d) => {
      const format = String(d.get("format"));
      const o = offerings.find((x) => x.format === format);
      const lastDay = Math.max(...(o?.delivery ?? []).map((w) => w.day), 1);
      const price = String(d.get("price") ?? "").trim();
      const units = String(d.get("units") ?? "").trim();
      const message = String(d.get("message") ?? "").trim();
      await api.post(`/v1/brand/campaigns/${seg(String(d.get("campaign")))}/offers`, {
        ref: account.ref,
        format,
        ...(price ? { price: Number(price) } : {}),
        ...(units ? { guarantee: { day: lastDay, units: Number(units) } } : {}),
        ...(message ? { message } : {}),
      });
      return "Offer sent. The creator stays anonymous to you unless they accept.";
    },
  );
}

function uploadsLine(uploads) {
  const judged = uploads.filter((u) => u.atSize);
  if (!judged.length) return null;
  const n = (r) => judged.filter((u) => u.atSize.result === r).length;
  return h("p", { class: "ap-note" }, `Recent works against creators the same size: ${n("above")} above the middle half, ${n("within")} inside, ${n("below")} below.`);
}

function accountBlock(a, campaigns) {
  const d = h("details", { class: "ap-more" }, h("summary", null, "Send an offer"));
  d.addEventListener("toggle", () => d.open && d.childElementCount === 1 && d.append(offerForm(a, campaigns)));
  return h(
    "div",
    { class: "ap-stack ap-account" },
    h("p", { class: "ap-says" }, `${KINDS[a.kind] ?? a.kind}${a.handle ? `, ${a.handle}` : ""}`, " ", chip(`Size ${a.sizeBand}`)),
    a.rating ? h("p", null, `Rating ${signed(a.rating.rating)}, ${a.rating.band}${a.rating.beats !== null ? `; reach beats ${a.rating.beats} in 100 creators its size` : ""}.`) : null,
    a.offerings.length
      ? h("ul", { class: "ap-plain" }, a.offerings.map((o) => {
          const w = [...o.delivery].sort((x, y) => x.day - y.day).at(-1);
          return h("li", null, `${o.name}: ${o.rateCard.listPrice ? money(o.rateCard.listPrice) : "price on request"}${o.rateCard.check ? `, ${CHECK[o.rateCard.check]}` : ""}${w?.median ? `; typically ${count(w.median)} at ${w.day} days` : ""}${o.available ? "" : " (paused)"}`);
        }))
      : null,
    uploadsLine(a.uploads),
    a.rating ? h("p", { class: "ap-label" }, a.rating.notice) : null,
    d,
  );
}

/** One creator's recent uploads against creators the same size, read fresh by ref. */
function uploadsDetail(ref) {
  const d = h("details", { class: "ap-more" }, h("summary", null, "Recent works"));
  const box = h("div", { class: "ap-stack" });
  d.append(box);
  d.addEventListener("toggle", () => {
    if (!d.open || box.dataset.loaded) return;
    box.dataset.loaded = "1";
    block(box, () => api.get(`/v1/brand/discover/${seg(ref)}`), ({ creator }) =>
      creator.accounts.map((a) =>
        a.uploads.length
          ? h("ul", { class: "ap-plain" }, a.uploads.slice(0, 8).map((u) => h("li", null, `${u.title ?? "A work"}, ${u.published}: ${u.atSize ? `${u.atSize.result === "within" ? "inside" : u.atSize.result} the middle half (${count(u.atSize.p25)} to ${count(u.atSize.p75)} ${u.atSize.metric} at ${u.atSize.day} days)` : "not compared yet"}`)))
          : h("p", { class: "ap-note" }, "No works to compare yet."),
      ),
    );
  });
  return d;
}

function resultItem(r, campaigns) {
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, r.shared && r.creator ? r.creator.displayName : "An anonymous creator", " ", r.shared ? chip("Shared with you", "good") : chip("Anonymised")),
      r.vertical ? h("p", { class: "ap-note" }, `Subject: ${r.vertical}`) : null,
    ),
    r.accounts.map((a) => accountBlock(a, campaigns)),
    r.notes.length ? h("p", { class: "ap-note" }, r.notes.join(" ")) : null,
    uploadsDetail(r.ref),
  );
}

function queryOf(d) {
  const q = new URLSearchParams();
  for (const k of d.getAll("kinds")) q.append("kinds", String(k));
  for (const b of d.getAll("bands")) q.append("bands", String(b));
  for (const f of d.getAll("formats")) q.append("formats", String(f));
  for (const k of ["q", "beatsAtLeast", "priceMin", "priceMax"]) {
    const v = String(d.get(k) ?? "").trim();
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function render(main) {
  const list = h("div", { class: "ap-stack" });
  let campaigns = [];
  const load = (query) =>
    block(list, async () => {
      const [r, c] = await Promise.all([api.get("/v1/brand/discover" + query), api.get("/v1/brand/campaigns")]);
      campaigns = c.campaigns;
      return r;
    }, (r) => [
      h("p", { class: "ap-says" }, `${plural(r.total, "creator")} found${r.total > r.results.length ? `, the first ${r.results.length} shown` : ""}.`),
      r.results.length ? h("ul", { class: "ap-list" }, r.results.map((x) => resultItem(x, campaigns))) : empty("No creator matches. Fewer filters find more."),
      (r.notes ?? []).map((n) => h("p", { class: "ap-note" }, n)),
      h("p", { class: "ap-label" }, `${r.label}.`),
    ]);
  screenHead(main, "discover", { line: "Creators who chose to be found, by their results against creators their size. Anonymised until a creator accepts an offer from you.", tags: [["Opt-in creators only", "sky"]] }).append(
    h("div", { class: "ap-stack" },
      panel(
        "Search",
        form(
          [
            h("fieldset", { class: "ap-fieldset" }, h("legend", null, "Where"), h("div", { class: "ap-inline" }, Object.entries(KINDS).filter(([k]) => k !== "photography").map(([k, n]) => check(n, { name: "kinds", value: k })))),
            h("fieldset", { class: "ap-fieldset" }, h("legend", null, "Size, smallest to largest"), h("div", { class: "ap-inline" }, BANDS.map((b) => check(words(b), { name: "bands", value: b })))),
            h("fieldset", { class: "ap-fieldset" }, h("legend", null, "Format"), h("div", { class: "ap-inline" }, FORMAT_KEYS.map((f) => check(f === "dedicated" ? "Dedicated video or send" : formatName(f), { name: "formats", value: f })))),
            field("Topic words", input({ name: "q", maxlength: 200, placeholder: "budgeting, cooking" })),
            field("Reach beats at least this many in 100 creators their size", input({ name: "beatsAtLeast", type: "number", min: "0", max: "100", step: "1" })),
            h("div", { class: "ap-pair" }, field("Price from (£)", input({ name: "priceMin", type: "number", min: "0", step: "1" })), field("Price to (£)", input({ name: "priceMax", type: "number", min: "0", step: "1" }))),
          ],
          "Search",
          async (d) => {
            await load(queryOf(d));
          },
          { primary: false },
        ),
      ),
      panel("Creators", list),
    ),
  );
  await load("");
}

