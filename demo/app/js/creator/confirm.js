/* The link a podcast's owner is emailed: pressing the button, signed in as the creator who asked, proves the show. */
import { api } from "../api.js";
import { actions, action, failure, h, ok, panel, title } from "../ui.js";

export async function render(main, ctx) {
  const token = ctx.query.get("token") ?? "";
  const out = h("div", { "aria-live": "polite" });
  main.append(
    h("div", { class: "ap-narrow" },
      title("Confirm your show"),
      panel(
        "Prove it is yours",
        token
          ? [
              h("p", null, "This link was sent to the owner email in your feed. Press the button to prove the show is yours."),
              actions(action("Confirm the show", async () => {
                const r = await api.post("/v1/me/podcasts/confirm-owner", { token });
                out.replaceChildren(ok(`${r.show.title} is proven yours.`), h("p", null, h("a", { class: "ob-lnk", href: "/orbe-site/demo/app/settings/connections" }, "Set up its prefix and smart link")));
                return "Confirmed.";
              }, { primary: true })),
            ]
          : failure({ message: "This link is not complete. Open it again from the email." }),
        out,
      ),
    ),
  );
}
