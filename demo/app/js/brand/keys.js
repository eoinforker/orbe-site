/*
  Data API keys, for a brand's or agency's own tools to read discovery and the
  roster under /v1/data. Each key is shown once; usage is counted per key and
  month, which is what billing reads.
*/
import { api, seg } from "../api.js";
import { action, actions, block, chip, day, empty, field, form, h, input, ok, panel, title } from "../ui.js";

const monthName = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export async function render(main) {
  const list = h("div", { class: "ap-stack" });
  const shown = h("div", { class: "ap-stack", "aria-live": "polite" });
  const reload = () =>
    block(list, () => api.get("/v1/keys"), ({ keys, usage }) => [
      keys.length
        ? h("ul", { class: "ap-list" }, [...keys].reverse().map((k) => {
            const mine = usage.filter((u) => u.keyId === k.id).reverse();
            return h("li", { class: "ap-item ap-item--block" },
              h("div", { class: "ap-item-main" },
                h("p", { class: "ap-says" }, k.name, " ", k.revokedAt ? chip(`Revoked ${day(k.revokedAt)}`, "off") : chip("Live", "good")),
                h("p", { class: "ap-note" }, h("code", { class: "ap-code" }, `${k.prefix}...`), ` Made ${day(k.createdAt)}${k.lastUsedAt ? `, last used ${day(k.lastUsedAt)}` : ", never used"}.`),
                mine.length
                  ? h("ul", { class: "ap-plain" }, mine.slice(0, 6).map((u) => h("li", null, `${monthName(u.month)}: ${u.requests.toLocaleString("en-GB")} requests, ${u.answered.toLocaleString("en-GB")} answered, ${u.units.toLocaleString("en-GB")} results`)))
                  : h("p", { class: "ap-note" }, "No requests yet."),
              ),
              k.revokedAt ? null : actions(action("Revoke", async () => {
                await api.del(`/v1/keys/${seg(k.id)}`);
                reload();
                return "Revoked.";
              }, { danger: true, confirm: `Revoke ${k.name}? Anything using it stops working at once.` })),
            );
          }))
        : empty("No keys yet."),
      form([field("Name", input({ name: "name", required: true, maxlength: 80, placeholder: "Reporting dashboard" }), "So you can tell your keys apart.")], "Make a key", async (d, f) => {
        const r = await api.post("/v1/keys", { name: String(d.get("name")).trim() });
        f.reset();
        shown.replaceChildren(ok(r.notice), h("p", null, h("code", { class: "ap-code ap-wrap" }, r.secret)), actions(action("Copy the key", async () => {
          await navigator.clipboard.writeText(r.secret);
          return "Copied.";
        })));
        reload();
        return "Key made.";
      }),
    ]);
  main.append(
    ...title("API keys", "For your own tools to read discovery and your roster through Orbe's data API. A key reaches only what your own sign-in would."),
    panel("Keys", shown, list),
  );
  await reload();
}
