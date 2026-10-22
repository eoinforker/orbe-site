/*
  Signing in: Continue with Google first (when this server has a Google
  client), then an emailed link that works once and lasts 15 minutes. A
  creator or a brand, chosen once here. Outside production, with no Google
  client, a clearly labelled development stand-in signs in at once.
*/
import { api } from "./api.js";
import { BASE } from "./routes.js";
import { segmented } from "./console-ui.js";
import { paintedSky } from "./sky.js";
import { icon } from "./icons.js";
import { lockup, portal } from "./shell.js";
import { field, form, h, input } from "./ui.js";

/* Google's own mark for its sign-in button, as its branding guidelines ask. */
function googleG() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("class", "cn-g");
  svg.setAttribute("aria-hidden", "true");
  for (const [fill, d] of [
    ["#FFC107", "M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"],
    ["#FF3D00", "M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"],
    ["#4CAF50", "M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"],
    ["#1976D2", "M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"],
  ]) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("fill", fill);
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

const ERRORS = {
  google_off: "Google sign-in is not switched on here yet. Use your email instead.",
  google_cancelled: "You stopped at Google's screen, so nothing changed. Try again, or use your email.",
  google_expired: "That sign-in took too long or was started in another window. Start again.",
  google_state: "That sign-in was not started from this browser. Start again from here.",
  google_failed: "Google's answer could not be checked, so you were not signed in. Try again, or use your email.",
  google_unverified: "Google has not verified that email address, so Orbe cannot sign you in with it. Use your email instead.",
};

const NEXT = /^\/[A-Za-z0-9/_\-.~%?=&]*$/;

export function render(main, ctx) {
  const ways = ctx.ways ?? { google: false, email: true, dev: false };
  const here = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || "/" : "/";
  // An invitation link keeps its token through sign-in, so the person lands back on it.
  const next = here === "/signin" ? ctx.query.get("next") ?? "/" : here === "/invite" ? `${here}${location.search}` : here;
  const safeNext = NEXT.test(next) ? next : "/";
  let as = ctx.query.get("as") === "brand" ? "buyer" : "creator";

  const seg = segmented("Signing in as", [["creator", "Creator"], ["buyer", "Brand"]], as, (v) => choose(v));
  const googleLink = h("a", { class: "cn-btn cn-btn--google", href: "#" }, googleG(), "Continue with Google");
  const setGoogle = () => (googleLink.href = `/v1/auth/google/start?as=${as}&next=${encodeURIComponent(safeNext)}`);
  const lede = h("p", { class: "cn-auth-lede" });
  const setLede = () =>
    (lede.textContent = as === "creator" ? "Your rating, your verified record, sponsorships and selling, in one place." : "Briefs, guaranteed reads and creators found by their results.");
  function choose(v) {
    as = v;
    setGoogle();
    setLede();
  }
  setGoogle();
  setLede();

  const box = h("div", { class: "cn-auth-email" });
  const ask = () =>
    box.replaceChildren(
      form([field("Email", input({ type: "email", name: "email", autocomplete: "email", required: true, maxlength: 254, inputmode: "email", placeholder: "you@example.com" }))], "Email me a link", async (data) => {
        const email = String(data.get("email")).trim();
        await api.post("/v1/auth/magic-link", { email, as, next: safeNext });
        sent(email);
      }, { primary: !ways.google }),
    );
  const sent = (email) =>
    box.replaceChildren(
      h("div", { class: "ap-sent", role: "status" },
        h("p", { class: "ap-says" }, "Check your email."),
        h("p", null, `If ${email} can sign in, a link is on its way. Open it on this device and press Sign in. It works once and lasts 15 minutes.`),
        h("button", { class: "ap-quiet", type: "button", onclick: ask }, "Use a different address"),
      ),
    );
  ask();

  const dev = ways.dev
    ? h("details", { class: "cn-auth-dev" },
        h("summary", null, "Development sign-in"),
        h("p", { class: "ap-note" }, "This server has no Google client and is not in production, so this stands in for Google: it signs in at once with any address. It does not exist in production."),
        form([field("Email", input({ type: "email", name: "email", required: true, maxlength: 254, value: "ada.seed@example.test" }))], "Sign in now", async (data) => {
          await api.post("/v1/auth/dev", { email: String(data.get("email")).trim(), as });
          location.assign(`${BASE}${safeNext === "/" ? "/" : safeNext}`);
        }, { primary: false }),
      )
    : null;

  const err = ERRORS[ctx.query.get("error") ?? ""];
  // Arriving from an invitation: say which team, then sign in as the side that team is.
  const invited = h("div", { class: "cn-auth-invite", hidden: true });
  const token = here === "/invite" ? ctx.query.get("token") : null;
  if (token)
    import("./invite.js").then(({ invitationCard }) => invitationCard(token)).then((inv) => {
      if (inv.state !== "open") return;
      invited.hidden = false;
      invited.replaceChildren(h("span", { class: "cn-teamtile cn-teamtile--m", "data-kind": inv.team.kind, "aria-hidden": "true" }, inv.team.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()), h("p", null, h("b", null, `You are invited to ${inv.team.name}`), h("span", null, `Sign in with ${inv.email} to join as ${inv.role === "editor" ? "an" : "a"} ${inv.role}.`)));
      const side = inv.team.kind === "creator" ? "creator" : "buyer";
      if (side !== as) seg.querySelector(`[role=radio]:nth-child(${side === "creator" ? 1 : 2})`)?.click();
    }, () => {});
  main.append(
    h("div", { class: "cn-auth" },
      h("div", { class: "cn-auth-side" },
        h("div", { class: "cn-auth-top" }, h("a", { href: "https://orbe.vc/", "aria-label": "Orbe, the site" }, lockup()), h("a", { href: "https://orbe.vc/products/" }, "All products")),
        h("div", { class: "cn-auth-card" },
          portal("cn-portal"),
          h("h1", { class: "cn-auth-h", tabindex: "-1", "data-title": "" }, token ? "Sign in to join" : "Welcome to Orbe"),
          invited,
          lede,
          seg,
          err ? h("p", { class: "ap-msg", role: "alert" }, err) : null,
          ways.google ? [googleLink, h("p", { class: "cn-or" }, h("span", null, "or"))] : null,
          box,
          dev,
          h("p", { class: "cn-auth-terms" },
            "By continuing you agree to Orbe's ",
            h("a", { href: "https://orbe.vc/legal/terms.html", target: "_blank", rel: "noopener" }, "Terms"),
            " and ",
            h("a", { href: "https://orbe.vc/legal/privacy.html", target: "_blank", rel: "noopener" }, "Privacy notice"),
            ". No password: Orbe never asks for your platform passwords.",
          ),
        ),
        h("p", { class: "cn-auth-help" }, "Free for creators. Brands pay only on verified delivery."),
      ),
      h("aside", { class: "cn-auth-art", "aria-label": "An example rating, made up" },
        h("div", { class: "cn-auth-window" },
          h("div", { class: "cn-auth-wbar" }, h("span", null, "each_upload.txt"), h("span", null, "Made up")),
          h("div", { class: "cn-auth-wbody" },
            h("div", { class: "cn-auth-big" }, h("b", null, "+1.23"), h("span", null, "Good")),
            h("p", null, "A made-up channel, against channels with 250k to 1M subscribers. Zero is typical."),
            h("p", null, "A typical upload reaches 37% of subscribers. That beats 93 in 100 channels its size."),
          ),
        ),
        h("p", { class: "cn-auth-caption" }, "Every upload, rated against creators your size. Independently calculated by Orbe."),
      ),
    ),
  );
  const art = main.querySelector(".cn-auth-art");
  if (art) paintedSky(art, { seed: 11 });
}
