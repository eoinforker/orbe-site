__o.d("js/brand/profile.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api, currentTeam } = __o.r("js/api.js");
const { BRAND_TERMS } = __o.r("js/terms.js");
const { block, check, day, field, form, h, input } = __o.r("js/ui.js");
const { screenHead, section } = __o.r("js/console-ui.js");
const { narrow } = __o.r("js/cards.js");

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

if (!brand && currentTeam()?.kind === "agency") location.assign("/orbe-site/demo/app/");
else if (!brand) ctx.go("/orbe-site/demo/app/");
return "Saved.";
},
));
}
async function render(main, ctx) {
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

const load = () => api.get("/v1/brand/profile").catch((e) => {
if (e.code === "not_a_brand") return { brand: null };
throw e;
});
await block(body, load, ({ brand }) =>
brand
? section({ title: "Brand profile", line: `Signed in as ${brand.email}. Terms accepted ${day(brand.termsAcceptedAt)}.` }, profileForm(brand, ctx))
: section({ title: "Brand profile", line: "There is no brand on this sign-in yet. Set one up to write briefs and book reads." }, profileForm(null, ctx)));
}
});
