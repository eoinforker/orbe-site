__o.d("js/sharing.js", function (__x) {
"use strict";
__o.e(__x, { renderSharing: () => renderSharing });
const { api, can, on, seg } = __o.r("js/api.js");
const { codeBlock, emptyState, pill, section } = __o.r("js/console-ui.js");
const { action, actions, block, check, day, h, plural, toast } = __o.r("js/ui.js");


function toggle(label, checked, save, hint, disabled = false) {
const box = check(label, { checked });
const input = box.querySelector("input");
input.disabled = disabled;

let busy = false;
input.addEventListener("change", async () => {
if (busy) {
input.checked = !input.checked;
return;
}
busy = true;
box.setAttribute("aria-busy", "true");
try {
toast(await save(input.checked));
} catch (err) {
input.checked = !input.checked;
toast(err.message ?? "That did not save.");
} finally {
busy = false;
box.removeAttribute("aria-busy");
}
});

const id = `hint-${Math.random().toString(36).slice(2, 8)}`;
if (hint) input.setAttribute("aria-describedby", id);
return h("div", { class: "cn-share-row" }, box, hint ? h("p", { class: "ap-hint", id }, hint) : null);
}
async function publicPage(el) {
await block(el, () => api.get("/v1/me/public-page"), (p) => {
const owner = can("consent");
return section(
{ title: "Your public page", line: "A page at your handle with your rating against creators your size. Nothing is public until you publish it." },
h("p", { class: "cn-item-d" }, pill(p.published ? "live" : "off", p.published ? "Published" : "Not published"), p.page ? h("a", { class: "cn-share-link", href: p.page, target: "_blank", rel: "noopener" }, p.page.replace(/^https?:\/\//, "")) : null),
owner
? actions(action(p.published ? "Take it down" : "Publish my page", async () => {
await api.post("/v1/me/profile", { published: !p.published });
return p.published ? "Your page is down." : "Your page is live.";
}, { primary: !p.published }))
: null,
owner ? toggle("Show my verified deliveries", p.settings.showDeliveries, async (v) => (await api.put("/v1/me/public-page", { showDeliveries: v }), v ? `Your ${plural(p.deliveries, "verified delivery", "verified deliveries")} will show.` : "Deliveries hidden."), "Guaranteed reads Orbe checked against your own figures.") : null,

owner && on("badges")
? toggle("Offer the verified badge", p.settings.badge, async (v) => (await api.put("/v1/me/public-page", { badge: v, showDeliveries: v || p.settings.showDeliveries }), v ? "Badge on." : "Badge off."),
p.deliveries || p.settings.badge ? "For your media kit or site." : "Available once Orbe verifies your first guaranteed read: the badge states only deliveries Orbe checked.",
!p.deliveries && !p.settings.badge)
: null,
on("badges") && p.badge ? [h("p", null, h("img", { src: p.badge.image, alt: "Your verified badge", height: 32 })), codeBlock(p.badge.embed, "Badge embed (HTML)")] : null,
);
});
}
async function shares(el) {
await block(el, () => Promise.all([api.get("/v1/me"), api.get("/v1/me/shares")]), ([me, list]) => {
const made = h("div");
const share = (a) =>
action(`Share ${a.title || a.handle}`, async () => {
const { share } = await api.post("/v1/me/shares", { accountId: a.id });
made.replaceChildren(codeBlock(share.url, "Your share link"), h("p", { class: "ap-hint" }, "Links unfurl with a picture of the rating in X, LinkedIn, Messages and Discord."));
return "Link made.";
});
return section(
{ title: "Share a rating", line: "A link and a picture of your rating as it is today, against creators your size. You can take any link down." },
me.accounts.length ? actions(...me.accounts.map(share)) : emptyState("link", "Connect an account to share its rating.", [["Connect an account", "/orbe-site/demo/app/settings/connections", true]]),
made,
list.shares.length
? h("ul", { class: "cn-list" }, list.shares.map((s) =>
h("li", null,
h("span", null, h("a", { class: "cn-share-link", href: s.url, target: "_blank", rel: "noopener" }, s.workTitle ?? s.name ?? s.figure), h("span", { class: "cn-item-d" }, ` ${s.figure}, ${plural(s.opens, "open")}, ${day(s.createdAt)}`)),
s.revokedAt ? pill("off", "Taken down") : action("Take down", async () => (await api.del(`/v1/me/shares/${seg(s.code)}`), "Link taken down."), { confirm: "Take this link down? Anyone who opens it will see it is gone." }),
)))
: null,
);
});
}
async function emails(el) {
await block(el, () => api.get("/v1/me/email-preferences"), ({ preferences }) =>
section({ title: "Emails", line: "Sign-in links and anything about money always come. The rest is your choice." },
toggle("A week after each new work", preferences.habit, async (v) => (await api.put("/v1/me/email-preferences", { habit: v }), v ? "You will hear from Orbe after each new work." : "No more emails after each new work."), "How it did against creators your size, and one next step."),
),
);
}
async function invite(el) {
await block(el, () => api.get("/v1/me/referral"), (r) =>
section({ title: "Invite people", line: "Your own link for creators and brands you know. Orbe counts who joins through it; nobody is paid for it." },
codeBlock(r.url, "Your invitation link"),
h("p", { class: "cn-item-d" }, `${plural(r.visits, "visit")}, ${plural(r.signups.creators, "creator")} and ${plural(r.signups.brands, "brand")} joined.`),
),
);
}
function pages() {
const links = [
on("rate_page") ? ["The free rating page", "/rate", "Anyone can rate a channel or a show against creators the same size."] : null,
on("sponsor_pages") ? ["Who sponsors creators", "/sponsors", "Brands named in public works, with the evidence."] : null,
].filter(Boolean);
if (!links.length) return null;
return section({ title: "Pages to send people to", line: "Public pages Orbe hosts, free to share." },
h("ul", { class: "cn-list" }, links.map(([t, href, d]) => h("li", null, h("span", null, h("a", { class: "cn-share-link", href, target: "_blank", rel: "noopener" }, t), h("span", { class: "cn-item-d" }, ` ${d}`))))),
);
}
async function renderSharing(el, ctx) {
const creator = ctx.user.type === "creator";
const parts = [
creator && on("creator_pages") ? publicPage : null,
creator && on("share_cards") && can("consent") ? shares : null,
creator && on("habit_email") ? emails : null,
on("referrals") ? invite : null,
].filter(Boolean);
for (const p of parts) {
const host = h("div", { class: "cn-share-part" });
el.append(host);
await p(host);
}
const more = pages();
if (more) el.append(more);
}
});
