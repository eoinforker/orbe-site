__o.d("js/signin.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { api } = __o.r("js/api.js");
const { BASE } = __o.r("js/routes.js");
const { segmented } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { lockup } = __o.r("js/shell.js");
const { field, form, h, input } = __o.r("js/ui.js");


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
function render(main, ctx) {
const ways = ctx.ways ?? { google: false, email: true, dev: false };

if (ways.demo) {
location.replace("/v1/auth/demo");
return;
}
const here = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || "/" : "/";

const next = here === "/signin" ? ctx.query.get("next") ?? "/" : here === "/invite" ? `${here}${location.search}` : here;
const safeNext = NEXT.test(next) ? next : "/";
let as = ctx.query.get("as") === "brand" ? "buyer" : "creator";
const seg = segmented("Signing in as", [["creator", "Creator"], ["buyer", "Brand"]], as, (v) => choose(v));
const googleLink = h("a", { class: "cn-btn cn-btn--google", href: "#" }, googleG(), "Continue with Google");
const setGoogle = () => (googleLink.href = `/v1/auth/google/start?as=${as}&next=${encodeURIComponent(safeNext)}`);
const lede = h("p", { class: "cn-auth-lede" });
const setLede = () =>
(lede.textContent = as === "creator" ? "Run content, deals and the business in one place, beside the tools you already use." : "Briefs, guaranteed reads and creators found by their results, for brands, agencies and product companies.");
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

const invited = h("div", { class: "cn-auth-invite", hidden: true });
const token = here === "/invite" ? ctx.query.get("token") : null;
if (token)
__o.i("js/signin.js", "./invite.js").then(({ invitationCard }) => invitationCard(token)).then((inv) => {
if (inv.state !== "open") return;
invited.hidden = false;
invited.replaceChildren(h("span", { class: "cn-teamtile cn-teamtile--m", "data-kind": inv.team.kind, "aria-hidden": "true" }, inv.team.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()), h("p", null, h("b", null, `You are invited to ${inv.team.name}`), h("span", null, `Sign in with ${inv.email} to join as ${inv.role === "editor" ? "an" : "a"} ${inv.role}.`)));
const side = inv.team.kind === "creator" ? "creator" : "buyer";
if (side !== as) seg.querySelector(`[role=radio]:nth-child(${side === "creator" ? 1 : 2})`)?.click();
}, () => {});
main.append(
h("div", { class: "cn-auth" },
h("div", { class: "cn-auth-side" },
h("div", { class: "cn-auth-top" }, h("a", { href: "https://eoinforker.github.io/orbe-site/", "aria-label": "Orbe, the site" }, lockup()), h("a", { href: "https://eoinforker.github.io/orbe-site/products/" }, "All products")),
h("div", { class: "cn-auth-card" },
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
h("a", { href: "https://eoinforker.github.io/orbe-site/legal/terms.html", target: "_blank", rel: "noopener" }, "Terms"),
" and ",
h("a", { href: "https://eoinforker.github.io/orbe-site/legal/privacy.html", target: "_blank", rel: "noopener" }, "Privacy notice"),
". No password: Orbe never asks for your platform passwords.",
),
),
h("p", { class: "cn-auth-help" }, "Free for creators. Brands pay only on verified delivery."),
),
printSide(),
),
);
}

const EMPTY = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const PRINTS = ["garden", "drift", "night", "clouds"];
function printSide() {
let last = null;
try { last = localStorage.getItem("orbe.print"); } catch (e) {}
const pool = PRINTS.filter((n) => n !== last);
const pick = pool[Math.floor(Math.random() * pool.length)];
try { localStorage.setItem("orbe.print", pick); } catch (e) {}
const src = (k) => `${BASE}/art/signin/${pick}-${k}.webp`;
return h("aside", { class: "cn-auth-art", "data-print": pick, "aria-hidden": "true" },
h("picture", null,
h("source", { media: "(min-width: 900px)", srcset: `${src("1x")} 1x, ${src("2x")} 2x` }),
h("img", { class: "cn-auth-print", src: EMPTY, alt: "", width: 1000, height: 1250, decoding: "async", fetchpriority: "high" }),
),
);
}
});
