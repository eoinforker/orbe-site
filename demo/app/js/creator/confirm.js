/* The link a podcast's owner is emailed: pressing the button, signed in as the creator who asked, proves the show. */
import { api } from "../api.js";
import { failure, h, ok } from "../ui.js";
import { screenHead, section } from "../console-ui.js";
import { button } from "../cards.js";

export async function render(main, ctx) {
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
