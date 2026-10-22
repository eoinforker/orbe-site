/* The brand profile: the organisation, what it sells (matched against creators' exclusions), and the brand terms. */
import { api } from "../api.js";
import { BRAND_TERMS } from "../terms.js";
import { block, check, day, field, form, h, input, panel, title } from "../ui.js";

function profileForm(brand, ctx) {
  return form(
    [
      field("Organisation", input({ name: "org", required: true, maxlength: 120, value: brand?.org ?? "", autocomplete: "organization" })),
      field("What you sell", input({ name: "category", required: true, maxlength: 40, value: brand?.category ?? "" }), "One word or two, for example fintech or skincare. Creators who exclude it are never shown to you."),
      h("div", { class: "ap-terms" }, h("p", { class: "ap-cue" }, "Brand terms"), h("p", null, BRAND_TERMS)),
      check("I accept the brand terms.", { name: "acceptTerms", required: true, checked: !!brand?.termsAcceptedAt }),
    ],
    brand ? "Save" : "Set up the brand",
    async (d) => {
      await api.put("/v1/brand/profile", { org: String(d.get("org")).trim(), category: String(d.get("category")).trim(), acceptTerms: true });
      ctx.brandSaved();
      if (!brand) ctx.go("/orbe-site/demo/app/");
      return "Saved.";
    },
  );
}

export async function render(main, ctx) {
  if (ctx.setup) {
    main.append(h("div", { class: "ap-narrow" }, ...title("Set up your brand", "Brands write briefs, see creators matched from their verified records, and book reads they pay for in full only on verified delivery."), panel("Brand profile", profileForm(null, ctx)), h("p", { class: "ap-note" }, "Here for an agency or management company? ", h("a", { href: "/orbe-site/demo/app/roster" }, "Set up your roster"), " instead.")));
    return;
  }
  const body = h("div");
  main.append(h("div", { class: "ap-narrow" }, ...title("Brand profile"), body));
  await block(body, () => api.get("/v1/brand/profile"), ({ brand }) => [
    panel("Brand profile", profileForm(brand, ctx), h("p", { class: "ap-note" }, `Signed in as ${brand.email}. Terms accepted ${day(brand.termsAcceptedAt)}.`)),
  ]);
}
