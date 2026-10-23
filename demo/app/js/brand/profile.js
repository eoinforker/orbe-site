/* The brand profile: the organisation, what it sells (matched against creators' exclusions), and the brand terms. */
import { api, currentTeam } from "../api.js";
import { BRAND_TERMS } from "../terms.js";
import { block, check, day, field, form, h, input } from "../ui.js";
import { screenHead, section } from "../console-ui.js";
import { narrow } from "../cards.js";

function profileForm(brand, ctx) {
  return narrow(form(
    [
      field("Organisation", input({ name: "org", required: true, maxlength: 120, value: brand?.org ?? "", autocomplete: "organization" })),
      field("What you sell", input({ name: "category", required: true, maxlength: 40, value: brand?.category ?? "" }), "One word or two, for example fintech or skincare. Creators who exclude it are never shown to you."),
      h("div", { class: "cn-terms" }, h("p", { class: "cn-terms-t" }, "Brand terms"), h("p", null, BRAND_TERMS)),
      check("I accept the brand terms.", { name: "acceptTerms", required: true, checked: !!brand?.termsAcceptedAt }),
    ],
    brand ? "Save" : "Set up the brand",
    async (d) => {
      await api.put("/v1/brand/profile", { org: String(d.get("org")).trim(), category: String(d.get("category")).trim(), acceptTerms: true });
      ctx.brandSaved();
      // An agency that has just become a brand too reads its session again, so the brand's tabs join the Roster.
      if (!brand && currentTeam()?.kind === "agency") location.assign("/orbe-site/demo/app/");
      else if (!brand) ctx.go("/orbe-site/demo/app/");
      return "Saved.";
    },
  ));
}

export async function render(main, ctx) {
  if (ctx.setup) {
    screenHead(main, "profile", { title: "Set up your brand", line: "Brands write briefs, see creators matched from their verified records, and book reads they pay for in full only on verified delivery." }).append(
      h("div", { class: "ap-stack" },
        section({ title: "Brand profile", line: "Who creators see when your offer arrives, and the terms you accept." }, profileForm(null, ctx)),
        h("p", { class: "cn-label" }, "Here for an agency or management company? ", h("a", { href: "/orbe-site/demo/app/roster" }, "Set up your roster"), " instead."),
      ),
    );
    return;
  }
  const body = h("div", { class: "ap-stack" });
  screenHead(main, "profile").append(body);
  // No brand yet (an agency, say) is not a failure: offer the form, in plain words.
  const load = () => api.get("/v1/brand/profile").catch((e) => {
    if (e.code === "not_a_brand") return { brand: null };
    throw e;
  });
  await block(body, load, ({ brand }) =>
    brand
      ? section({ title: "Brand profile", line: `Signed in as ${brand.email}. Terms accepted ${day(brand.termsAcceptedAt)}.` }, profileForm(brand, ctx))
      : section({ title: "Brand profile", line: "There is no brand on this sign-in yet. Set one up to write briefs and book reads." }, profileForm(null, ctx)));
}
