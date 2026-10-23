__o.d("js/creator/confirm.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api } = __o.r("js/api.js");
const { failure, h, ok } = __o.r("js/ui.js");
const { screenHead, section } = __o.r("js/console-ui.js");
const { button } = __o.r("js/cards.js");

async function render(main, ctx) {
const token = ctx.query.get("token") ?? "";
const out = h("div", { "aria-live": "polite" });
screenHead(main, "podcasts", { title: "Confirm your show", line: "The last step of proving a show is yours." }).append(
section(
{ title: "Prove it is yours", line: "This link was sent to the owner email in your feed." },
token
? h("div", { class: "ap-actions" }, button("Confirm the show", async () => {
const r = await api.post("/v1/me/podcasts/confirm-owner", { token });
out.replaceChildren(ok(`${r.show.title} is proven yours.`), h("p", null, h("a", { class: "cn-btn cn-btn--s", href: "/orbe-site/demo/app/podcasts" }, "Carry on setting up the show")));
return "Confirmed.";
}, { primary: true }))
: failure({ message: "This link is not complete. Open it again from the email." }),
out,
),
);
}
});
