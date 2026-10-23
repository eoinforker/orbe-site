__o.d("js/band.js", function (__x) {
"use strict";
__o.e(__x, { firstName: () => firstName, band: () => band });
const { paintedSky } = __o.r("js/sky.js");
const { h } = __o.r("js/ui.js");

const firstName = (name) => (name ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim().split(/\s+/)[0] || "";

function band(title, sub) {
const sec = h("section", { class: "cn-band", "aria-labelledby": "band-h" },
h("div", { class: "cn-band-in" },
h("h1", { class: "cn-band-h", id: "band-h", tabindex: "-1", "data-title": "" }, title),
h("p", { class: "cn-band-sub" }, sub),
),
);
paintedSky(sec);
return sec;
}
});
__o.d("js/composer.js", function (__x) {
"use strict";
__o.e(__x, { STUDIO_TOOLS: () => STUDIO_TOOLS, WINDOWS: () => WINDOWS, toolsOn: () => toolsOn, composer: () => composer });
const { can, canRateChannels, on } = __o.r("js/api.js");
const { tile } = __o.r("js/catalogue.js");
const { icon } = __o.r("js/icons.js");
const { h } = __o.r("js/ui.js");


const STUDIO_TOOLS = [
{ id: "auto", name: "Ask Orbe", line: "Orbe picks the tool from your words", glyph: "products/you/", k: "rec" },
{ id: "rate-work", name: "Rate a work", line: "A work of yours, against creators the same size", glyph: "products/rate/", k: "also", feature: "rating", hint: "A title, or leave empty for your best in the window" },
{ id: "rate-channel", name: "Rate a channel", line: "Any YouTube channel, by @handle", glyph: "products/rate/", k: "also", feature: "rating", hint: "@handle, channel id or link" },
{ id: "offer", name: "Check an offer", line: "Is this offer fair for your size?", glyph: "products/offer/", k: "spon", feature: "sponsorships", needs: "read.money", hint: "The amount offered, like 450" },
{ id: "price", name: "Price a slot", line: "What your results support, per format", glyph: "products/sponsorships/", k: "spon", feature: "sponsorships", needs: "read.money", hint: "Leave empty, or name a format" },
{ id: "sponsor", name: "Sponsors like you", line: "Brands that sponsor creators like you", glyph: "products/selling/", k: "sell", hint: "Leave empty, or a word to filter by" },
{ id: "explain", name: "Explain my rating", line: "Your rating, in plain English", glyph: "products/diligence/", k: "rec", feature: "rating", hint: "Leave empty" },
];
const WINDOWS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]];

const toolsOn = () => STUDIO_TOOLS.filter((t) => (!t.feature || on(t.feature)) && can(t.needs) && (t.id !== "rate-channel" || canRateChannels()));

function chip(label, options, value, render, onChange) {
const sel = h("select", { "aria-label": label }, options.map(([v, text]) => h("option", { value: v, selected: v === value }, text)));
const face = h("span", { class: "cn-cchip-face" });
const draw = () => face.replaceChildren(...[render(sel.value)].flat().filter(Boolean));
sel.addEventListener("change", () => {
draw();
onChange(sel.value);
});
draw();
return { node: h("label", { class: "cn-cchip" }, face, icon("chevron", { cls: "cn-i--chev" }), sel), set: (v) => ((sel.value = v), draw()) };
}

function composer({ accounts = [], onRun, initial = {}, placeholder }) {
const tools = toolsOn();
const job = { tool: tools.some((t) => t.id === initial.tool) ? initial.tool : "auto", account: initial.account ?? "all", window: initial.window ?? "30" };
const text = h("textarea", { class: "cn-composer-text", rows: 1, placeholder: placeholder ?? "Rate a work, check an offer, find a sponsor...", "aria-label": "What should Orbe run?", maxlength: 300 });
text.value = initial.text ?? "";
const grow = () => {
text.style.height = "auto";
text.style.height = `${Math.min(180, text.scrollHeight)}px`;
};
text.addEventListener("input", grow);
const toolChip = chip("Tool", tools.map((t) => [t.id, t.name]), job.tool, (v) => {
const t = tools.find((x) => x.id === v);
return [tile(t.glyph, t.k, h), h("span", null, t.name)];
}, (v) => {
job.tool = v;
const t = tools.find((x) => x.id === v);
text.placeholder = t.hint ?? placeholder ?? "Rate a work, check an offer, find a sponsor...";
});
const accountChip = chip("Account", [["all", "All accounts"], ...accounts.map((a) => [a.id, a.handle])], job.account, (v) => [icon("user"), h("span", null, v === "all" ? "All accounts" : accounts.find((a) => a.id === v)?.handle ?? "Account")], (v) => (job.account = v));
const windowChip = chip("Window", WINDOWS, job.window, (v) => [icon("clock"), h("span", { class: "cn-cchip-k" }, "Last"), h("span", null, WINDOWS.find(([k]) => k === v)?.[1] ?? v)], (v) => (job.window = v));
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const run = h("button", { class: "cn-run", type: "submit" }, "Run", h("kbd", { class: "cn-kbd" }, mac ? "⌘ ↵" : "Ctrl ↵"));
const submit = (e) => {
e?.preventDefault();
const words = text.value.trim();
if (job.tool === "auto" && !words) {
text.focus();
return;
}
onRun({ tool: job.tool, text: words, account: job.account, window: job.window });
};
text.addEventListener("keydown", (e) => {
if (e.key === "Enter" && !e.shiftKey && !e.isComposing) submit(e);
});
const node = h("form", { class: "cn-composer", onsubmit: submit, role: "search" },
text,
h("div", { class: "cn-composer-bar" },
h("div", { class: "cn-composer-chips" }, toolChip.node, accounts.length > 1 ? accountChip.node : null, windowChip.node),
h("span", { class: "cn-composer-hint" }, "Shift ↵ for a new line"),
run,
),
);

if (text.value) requestAnimationFrame(grow);
return {
node,
focus: () => text.focus(),
setText: (v) => ((text.value = v), grow()),
setTool: (v) => {
job.tool = v;
toolChip.set(v);
},
busy: (on2) => (run.disabled = on2),
};
}
});
__o.d("js/creator/home.js", function (__x) {
"use strict";
__o.e(__x, { startSteps: () => startSteps, activity: () => activity, leadPart: () => leadPart, quickFor: () => quickFor, render: () => render });
const { api, bundle, can, on } = __o.r("js/api.js");
const { alerts, ago, bars, checklist, cover, emptyState, rating, section, sparkline, stat, statStrip } = __o.r("js/console-ui.js");
const { composer } = __o.r("js/composer.js");
const { firstName } = __o.r("js/band.js");
const { tile } = __o.r("js/catalogue.js");
const { quickArt, workArt } = __o.r("js/sky.js");
const { icon } = __o.r("js/icons.js");
const { loadNotifications } = __o.r("js/notify.js");
const { handleOf, KINDS, SIZE_RANGES, SOURCES } = __o.r("js/terms.js");
const { block, h, plural, signed } = __o.r("js/ui.js");

const MONEY_SOURCES = ["stripe", "patreon", "adsense"];
const OPEN_OFFER = ["sent", "countered"];

function later(build) {
const mark = h("div", { hidden: "" });
const fill = () => mark.isConnected && mark.replaceWith(...build().flat().filter(Boolean));
if (window.requestIdleCallback) requestAnimationFrame(() => requestIdleCallback(fill, { timeout: 400 }));
else requestAnimationFrame(() => setTimeout(fill, 50));
return mark;
}
const settle = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));

function startSteps(me, ratings, sponsorship) {
const live = (scope) => me.consents.some((c) => c.scope === scope && !c.revokedAt);
const steps = [
{ name: "Create your Orbe account", done: true },
{ name: "Tell Orbe your name", line: "Brands and buyers you agree to work with see it.", done: Boolean(me.creator.displayName), href: "/orbe-site/demo/app/settings/account" },
{ name: "Let Orbe read what you connect", line: "Nothing is read without it; revoke at any time.", done: live("connect"), href: "/orbe-site/demo/app/record?tab=consents" },
{ name: on("podcasts") ? "Connect a channel or set up your show" : "Connect a channel", line: "Your rating starts from an account you show is yours.", done: me.accounts.length > 0, href: on("podcasts") ? "/orbe-site/demo/app/podcasts" : "/orbe-site/demo/app/settings/connections" },
on("rating") ? { name: "Get your first rating", line: "Against creators the same size, where zero is typical.", done: ratings.some((r) => r.result?.status === "rated"), href: "/orbe-site/demo/app/record" } : null,
{ name: "Connect where your money comes in", line: "Stripe, Patreon or AdSense, read only.", done: me.connections.some((c) => MONEY_SOURCES.includes(c.source)), href: "/orbe-site/demo/app/settings/connections" },
on("sponsorships") ? { name: "Open to sponsorships", line: "Price a slot once; offers arrive priced from your record.", done: Boolean(sponsorship?.optedIn), href: "/orbe-site/demo/app/deals" } : null,
];
return steps.filter(Boolean);
}

function activity(me, ratings, offers, bookings) {
const items = [
...me.connections.map((c) => ({ at: c.createdAt, text: `Connected ${SOURCES[c.source]?.name ?? c.source}`, icon: "link" })),
...ratings.filter((r) => r.result?.computedAt).map((r) => ({ at: r.result.computedAt, text: `Rated ${r.handle || "an account"}: ${r.result.status === "rated" ? signed(r.result.rating) : "not yet"}`, icon: "chart" })),
...offers.filter((o) => o.createdAt).map((o) => ({ at: o.createdAt, text: `Offer from ${o.brandName}`, icon: "megaphone" })),
...bookings.filter((b) => b.createdAt).map((b) => ({ at: b.createdAt, text: `Booking with ${b.brandName}`, icon: "bolt" })),
{ at: me.creator.createdAt, text: "Joined Orbe", icon: "sparkle" },
];
return items.filter((i) => i.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 6);
}

function leadPart(result) {
const parts = result?.parts ?? [];
return parts.find((p) => /reach|downloads|opens/i.test(p.name)) ?? [...parts].sort((a, b) => b.score - a.score)[0] ?? null;
}
const HIDE = "orbe.hide.start";
const hidden = () => {
try {
return localStorage.getItem(HIDE) === "1";
} catch {
return false;
}
};

const QUICK = [
["Drop in a video", "Clips, words and sends", "/orbe-site/demo/app/media", "also", "media", "grow", "content", "video"],
["Rate a work", "Against creators your size", "/orbe-site/demo/app/runs?tool=rate-work", "also", "rating", "grow", null, "rate"],
["Sponsors like you", "Brands that sponsor creators like you", "/orbe-site/demo/app/runs?tool=sponsor", "sell", null, "earn", "read.money", "sponsor"],
["Check an offer", "Is it fair for your size?", "/orbe-site/demo/app/runs?tool=offer", "spon", "sponsorships", "earn", "read.money", "offer"],
["Check a copy", "Is this your work? On your device", "/orbe-site/demo/app/protect", "rec", null, "protect", null, "protect"],
["Set up a podcast", "Free measurement, always", "/orbe-site/demo/app/podcasts", "pod", "podcasts", "grow", null, "podcast"],
];

function quickFor(help = [], makes = [], hasShow = false) {
const want = new Set(help);
const podcast = makes.includes("podcast") && !hasShow;
const open = QUICK.filter(([, , , , f, , needs, art]) => (!f || on(f)) && can(needs) && (art !== "podcast" || podcast || (!makes.length && !hasShow)));
const first = (q) => (q[7] === "podcast" && podcast ? 0 : want.has(q[5]) ? 1 : 2);
return [...open].sort((a, b) => first(a) - first(b)).slice(0, 3);
}

const pictureFor = (art, latest) => (art === "rate" && latest ? workArt(latest, art) : quickArt(art));
function quickCards(help, latest, makes, hasShow) {
return h("nav", { class: "cn-quick", "aria-label": "Quick starts" },
quickFor(help, makes, hasShow).map(([t, d, href, , , , , art]) =>
h("a", { class: "cn-qcard", href }, pictureFor(art, latest), h("span", null, h("span", { class: "cn-qcard-t" }, t), h("span", { class: "cn-qcard-d" }, d)), icon("chevronRight")),
),
);
}

const perWeek = (works) => Array.from({ length: 8 }, (_, i) => works.filter((w) => w.ageDays >= (7 - i) * 7 && w.ageDays < (8 - i) * 7).length);
const workRow = (w) =>
h("a", { class: "cn-mini", href: `/orbe-site/demo/app/works/${encodeURIComponent(w.id)}` },
cover(w.id, w.kind, w.rating ? (w.rating.rating + 1.5) / 3 : 0.3),
h("span", { class: "cn-mini-main" }, h("span", { class: "cn-mini-t" }, w.title), h("span", { class: "cn-mini-d" }, `${w.account.handle}, ${ago(w.publishedAt)}`)),
w.rating ? h("span", { class: `cn-score${w.rating.rating > 0 ? " cn-score--up" : ""}` }, signed(w.rating.rating)) : h("span", { class: "cn-score cn-score--down" }, "New"),
);
function ratingCard(rated) {
const res = rated.result;

const unit = SIZE_RANGES[rated.kind]?.unit;
return section({ title: "What the rating is made of", line: `${handleOf(rated.handle, rated.kind)} on ${KINDS[rated.kind] ?? rated.kind}, against ${res.sizeBand}${unit ? ` ${unit}` : ""}` },
h("ul", { class: "cn-parts" }, res.parts.map((p) => {
const bar = h("span", { class: "cn-part-bar" }, h("span"));
bar.firstChild.style.setProperty("--p", String(p.score));
return h("li", { class: "cn-part" }, h("span", { class: "cn-part-n" }, p.name), bar, h("span", { class: "cn-part-v" }, `${p.score}/100`));
})),
h("p", { class: "cn-label" }, rated.notice ?? "Independently calculated by Orbe"),
);
}

function greeting(name) {
const hour = new Date().getHours();
const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
const first = firstName(name);
return h("h1", { class: "cn-home-hi", tabindex: "-1", "data-title": "" }, first ? `${part}, ${first}.` : `${part}.`);
}
async function render(main, ctx) {
const body = h("div");
main.append(body);
await block(
body,
async () => {
const none = Promise.resolve(null);

await bundle("home");
const [me, own, history, offers, bookings, sponsorship, works, waitingOn, welcome] = await Promise.all([
api.get("/v1/me"),
on("rating") ? api.get("/v1/me/rating") : none,
on("rating") ? settle(api.get("/v1/me/history")) : none,
on("sponsorships") && can("read.money") ? settle(api.get("/v1/me/sponsorships/offers")) : none,
on("sponsorships") && can("read.money") ? settle(api.get("/v1/me/sponsorships/bookings")) : none,
on("sponsorships") && can("read.money") ? settle(api.get("/v1/me/sponsorships")) : none,
settle(api.get("/v1/me/works?limit=200")),
loadNotifications(ctx.user).catch(() => []),
api.get("/v1/me/welcome").then((r) => r.welcome, () => null),
]);
return {
me,
ratings: own?.ratings ?? [],
history: history?.ok ? history.v.accounts : [],
offers: offers?.ok ? offers.v.offers : [],
bookings: bookings?.ok ? bookings.v.bookings : [],
sponsorship: sponsorship?.ok ? sponsorship.v : null,
works: works.ok ? works.v.works : [],
waitingOn,
help: welcome?.answers?.help ?? [],
makes: welcome?.answers?.makes ?? [],
welcomeDue: welcome?.due === true,
};
},
(data) => {
if (!data) return null;
const { me, ratings, history, offers, bookings, sponsorship, works, waitingOn, help, makes, welcomeDue } = data;
const hasShow = me.accounts.some((a) => a.kind === "podcast");
const rated = [...ratings].filter((r) => r.result?.status === "rated").sort((a, b) => (b.result.detail?.works ?? 0) - (a.result.detail?.works ?? 0))[0];
const trend = history.find((a) => a.accountId === rated?.accountId)?.ratings.map((x) => x.rating) ?? [];
const openOffers = offers.filter((o) => OPEN_OFFER.includes(o.state));
const moving = bookings.filter((b) => !["paid", "cancelled", "verified"].includes(b.state));
const steps = startSteps(me, ratings, sponsorship);
const recent = activity(me, ratings, offers, bookings);
const month = works.filter((w) => w.ageDays <= 30);
const viaGoogle = ctx.query.get("via") === "google" && !me.connections.some((c) => c.source === "youtube_analytics");
const box = composer({
accounts: me.accounts.map((a) => ({ id: a.id, handle: a.handle || a.title, kind: a.kind })),
onRun: (job) => ctx.go(`/orbe-site/demo/app/runs?${new URLSearchParams({ run: "1", tool: job.tool, q: job.text, account: job.account, window: job.window })}`),
});
const done = steps.filter((s) => s.done).length;
const progress = h("span", { class: "cn-progress" }, h("span", { class: "cn-progress-bar" }, h("span")), `${done} of ${steps.length}`);
progress.querySelector(".cn-progress-bar span").style.setProperty("--p", String(done / steps.length));

const showStart = steps.some((x) => !x.done) && !hidden() && can("owner");

const nearly = done >= 5;
const hide = (e) => {
try {
localStorage.setItem(HIDE, "1");
} catch {

}
const line = e.target.closest(".cn-start-line");
if (line) return line.remove();
e.target.closest(".cn-section-head").nextElementSibling.remove();
e.target.closest(".cn-section-head").remove();
};
const nextOne = steps.find((x) => !x.done);
const startLine = () => h("section", { class: "cn-card cn-start-line", "aria-label": "Getting started" },
h("p", null, h("b", null, "Getting started."), " Next: ", nextOne.href ? h("a", { href: nextOne.href }, nextOne.name) : nextOne.name, "."),
progress,
h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: hide }, "Don't show this"),
);
const latest = () => section({ title: "Your latest works", line: plural(works.length, "work") + " in your library", actions: h("a", { class: "cn-btn cn-btn--xs", href: "/orbe-site/demo/app/library" }, "Library") },
works.length ? h("div", { class: "cn-links" }, works.slice(0, 5).map(workRow)) : emptyState("library", "Works you publish show here, each rated against creators your size.", [["Connect an account", "/orbe-site/demo/app/settings/connections", true]]),
);

const fresh = !me.accounts.length;
const firstConnect = fresh && !viaGoogle
? h("section", { class: "cn-banner" }, h("p", null, "Your rating, your works and fair prices for offers all start from an account Orbe can read. Orbe only reads."), can("owner") ? h("a", { class: "cn-btn cn-btn--primary cn-btn--s", href: "/orbe-site/demo/app/settings/connections" }, "Connect your first account") : null)
: null;
const start = () => h("div", { class: "cn-start" },
section({ title: "Welcome to Orbe", line: "A few steps to a rating and a record brands can trust.", actions: progress }, checklist(steps)),
fresh ? null : latest(),
);

const head = greeting((ctx.user.person ?? me.creator).displayName);

const ownSetUp = welcomeDue && can("owner")
? h("section", { class: "cn-banner", "aria-label": "Set up your account" },
h("p", null, h("b", null, "Set up your own account."), " A few questions, then your place among creators your size."),
h("div", { class: "cn-banner-actions" },
h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: async (e) => {
const card = e.target.closest(".cn-banner");

card.replaceWith(firstConnect ?? "");
await api.put("/v1/me/welcome", { skipped: true, tourDone: true }).catch(() => {});
} }, "Not now"),
h("a", { class: "cn-btn cn-btn--primary cn-btn--s", href: "/orbe-site/demo/app/welcome" }, "Start"),
),
)
: null;
const needs = [
ownSetUp,
alerts(waitingOn),
viaGoogle
? h("section", { class: "cn-banner", role: "status" }, h("p", null, "You signed in with Google. If your YouTube channel is on the same Google account, connect YouTube Analytics next to claim it."), h("a", { class: "cn-btn cn-btn--primary cn-btn--s", href: "/orbe-site/demo/app/connections?source=youtube_analytics" }, "Connect YouTube"))
: null,
fresh ? (ownSetUp ? null : firstConnect) : statStrip([
on("rating") ? stat({ label: "Rating", value: rated ? rating(rated.result.rating, { size: "" }) : "Not yet", line: rated ? `${rated.result.band} for ${rated.handle}, where zero is typical` : "Connect an account to be rated.", spark: sparkline(trend, "Your rating over time"), links: can("read.money") ? [["Record", "/orbe-site/demo/app/record"]] : [] }) : null,
stat({ label: "Works, last 30 days", value: String(month.length), line: `${plural(me.accounts.length, "account")} read`, spark: bars(perWeek(works), "Works published per week, last eight weeks"), links: [["Library", "/orbe-site/demo/app/library"]] }),
on("sponsorships") && can("read.money") ? stat({ label: "Offers waiting", value: String(openOffers.length), line: `${openOffers.length ? `${openOffers[0].brandName} first. ` : ""}${plural(moving.length, "booking")} under way.`, links: [["Deals", "/orbe-site/demo/app/deals"]] }) : null,
]),
];

const rest = () => [
showStart && nearly ? startLine() : null,
showStart && !nearly
? [h("div", { class: "cn-section-head" }, h("div", null, h("h2", { class: "cn-h2" }, "Getting started"), h("p", null, "Start exploring what Orbe does for you.")), h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: hide }, "Don't show this")), start()]
: null,
fresh ? null : h("div", { class: "cn-twocol" },
rated ? ratingCard(rated) : showStart && !nearly ? null : latest(),
section({ title: "Recent activity" },
recent.length > 1
? h("ul", { class: "cn-feed" }, recent.map((a) => h("li", null, h("span", { class: "cn-item-ico" }, icon(a.icon)), h("span", null, a.text), h("time", { datetime: a.at }, ago(a.at)))))
: emptyState("clock", "Things you connect, ratings and offers show here as they happen.", [["Connect an account", "/orbe-site/demo/app/settings/connections"]]),
),
),
];

if (matchMedia("(max-width: 899px)").matches) {
const [own, waiting, banner, figures] = needs;
return h("div", { class: "cn-home cn-home--top" }, head, own, box.node, waiting, banner, figures, later(() => [quickCards(help, works[0], makes, hasShow), ...rest()]));
}
return h("div", { class: "cn-home cn-home--top" }, head, box.node, quickCards(help, works[0], makes, hasShow), needs, later(rest));
},
);
}
});
__o.d("js/sky.js", function (__x) {
"use strict";
__o.e(__x, { paint: () => paint, paintedSky: () => paintedSky, quickArt: () => quickArt, thumbOf: () => thumbOf, workArt: () => workArt });


function rnd(seed) {
let s = seed % 2147483647 || 1;
return () => {
s = (s * 16807) % 2147483647;
return (s - 1) / 2147483646;
};
}

const SKY = [148, 230, 255];
const SKY_HI = [191, 239, 255];
const SKY_LO = [169, 233, 255];
const PALE = [198, 241, 255];
const WATER = [77, 154, 208];
const CHALK = [251, 250, 246];
const PAPER = [243, 240, 232];
const PEONY = [242, 135, 158];
const LIGHT = [255, 244, 214];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

function wash(x, cx, cy, rx, ry, angle, col, a) {
x.save();
x.translate(cx, cy);
x.rotate(angle);
x.scale(rx / ry, 1);
const g = x.createRadialGradient(0, 0, 0, 0, 0, ry);
g.addColorStop(0, rgba(col, a));
g.addColorStop(0.5, rgba(col, a * 0.8));
g.addColorStop(1, rgba(col, 0));
x.fillStyle = g;
x.beginPath();
x.arc(0, 0, ry, 0, Math.PI * 2);
x.fill();
x.restore();
}

function streak(x, cx, cy, len, thick, angle, col, a) {
x.save();
x.translate(cx, cy);
x.rotate(angle);
const g = x.createLinearGradient(-len / 2, 0, len / 2, 0);
g.addColorStop(0, rgba(col, 0));
g.addColorStop(0.5, rgba(col, a));
g.addColorStop(1, rgba(col, 0));
x.fillStyle = g;
x.beginPath();
x.ellipse(0, 0, len / 2, thick, 0, 0, Math.PI * 2);
x.fill();
x.restore();
}

function paint(x, w, h, seed = 7) {
const r = rnd(seed);
const base = x.createLinearGradient(0, 0, 0, h);
base.addColorStop(0, rgba(SKY_HI, 1));
base.addColorStop(0.6, rgba(SKY, 1));
base.addColorStop(1, rgba(SKY_LO, 1));
x.fillStyle = base;
x.fillRect(0, 0, w, h);
const s = Math.max(w, h * 2) / 1440;

const cool = [[CHALK, 0.85], [PAPER, 0.75], [WATER, 0.3], [SKY, 0.9], [PALE, 0.9]];
for (let i = 0; i < 88; i++) {
const [col, a] = cool[Math.floor(r() * cool.length)];
wash(x, r() * w, r() * h, (120 + r() * 300) * s, (60 + r() * 120) * s, -0.2 + r() * 0.15, col, a);
}


const warm = Array.from({ length: 3 }, () => [w * (0.6 + r() * 0.34), h * r() * 0.34, (180 + r() * 200) * s, (70 + r() * 70) * s]);
for (const [cx, cy, rx, ry] of warm) wash(x, cx, cy, rx, ry, -0.15, LIGHT, 0.9);
for (const [cx, cy, rx, ry] of warm.slice(0, 2)) wash(x, cx + rx * 0.08, cy, rx * 0.55, ry * 0.55, -0.15, PEONY, 0.3);

for (let i = 0; i < 16; i++) streak(x, r() * w, r() * h, (80 + r() * 260) * s, (2 + r() * 4) * s, -0.35, r() < 0.55 ? CHALK : [127, 211, 245], 0.4);

const v = x.createLinearGradient(0, 0, 0, h);
v.addColorStop(0, rgba(PALE, 0));
v.addColorStop(0.35, rgba([214, 245, 255], 0.3));
v.addColorStop(0.62, rgba([214, 245, 255], 0.2));
v.addColorStop(1, rgba([214, 245, 255], 0));
x.fillStyle = v;
x.fillRect(0, 0, w, h);
}

const fields = new Map();
function stored(key) {
try {
const url = localStorage.getItem(key);
if (url) fields.set(key, url);
return url;
} catch {
return null;
}
}

function paintedSky(host, opts = {}) {
const canvas = document.createElement("canvas");
canvas.className = `cn-sky${opts.drift === false ? "" : " cn-sky--drift"}`;
canvas.setAttribute("aria-hidden", "true");
host.prepend(canvas);
let painted = 0;
function draw() {
const rect = host.getBoundingClientRect();
const w = Math.max(1, Math.round(rect.width * 1.12));
const ht = Math.max(1, Math.round(rect.height * 1.12));
if (painted && Math.abs(painted - w) < 80) return;
painted = w;

const k = 0.5;
canvas.width = Math.round(w * k);
canvas.height = Math.round(ht * k);
const x = canvas.getContext("2d");
const seed = opts.seed ?? 7;
const field = `${seed}.${canvas.width}x${canvas.height}`;
const key = `orbe.sky.${field}`;
const kept = fields.get(key) ?? stored(key);
if (kept) {
const img = new Image();
img.onload = () => { if (canvas.width === img.width && canvas.height === img.height) x.drawImage(img, 0, 0); };
img.src = kept;
return;
}
if (w < 2) return;
x.setTransform(k, 0, 0, k, 0, 0);
paint(x, w, ht, seed);
x.setTransform(1, 0, 0, 1, 0, 0);

const keep = () => {
try {
const url = canvas.toDataURL("image/webp", 0.85);
if (!url.startsWith("data:image/webp")) return;
fields.set(key, url);

for (const k of Object.keys(localStorage)) if (k.startsWith(`orbe.sky.${seed}.`) && k !== key) localStorage.removeItem(k);
localStorage.setItem(`orbe.sky.${field}`, url);
} catch {

}
};
(window.requestIdleCallback ?? ((f) => setTimeout(f, 200)))(keep);
}
draw();
const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
ro?.observe(host);
return { node: canvas, destroy: () => { ro?.disconnect(); canvas.remove(); } };
}

const C = { sky: "#94E6FF", pale: "#BDEFFF", water: "#4D9AD0", chalk: "#FBFAF6", paper: "#F3F0E8", cobalt: "#1F4BFF", deep: "#0E2AAE", straw: "#F5D34A", peony: "#F2879E", claret: "#6F1726", ink: "#141311" };
const ART = {

video(x, w, h) {
const g = x.createLinearGradient(0, 0, w, h);
g.addColorStop(0, C.pale);
g.addColorStop(1, C.sky);
x.fillStyle = g;
x.fillRect(0, 0, w, h);
[[-14, C.deep], [0, C.cobalt], [14, C.water]].forEach(([deg, col], i) => {
x.save();
x.translate(w / 2 + (i - 1) * w * 0.2, h * 0.58);
x.rotate((deg * Math.PI) / 180);
const fw = w * 0.25, fh = h * 0.64;
x.fillStyle = "rgba(20,19,17,0.14)";
x.fillRect(-fw / 2 + 4, -fh / 2 + 6, fw, fh);
const f = x.createLinearGradient(0, -fh / 2, 0, fh / 2);
f.addColorStop(0, i === 1 ? C.straw : C.chalk);
f.addColorStop(1, col);
x.fillStyle = f;
x.fillRect(-fw / 2, -fh / 2, fw, fh);
x.restore();
});
},

sponsor(x, w, h) {
x.fillStyle = C.straw;
x.fillRect(0, 0, w, h);
const cols = [C.ink, C.cobalt, C.peony, C.chalk, C.deep, C.chalk];
const cw = w * 0.21, ch = h * 0.27;
for (let i = 0; i < 6; i++) {
const cx = w * (0.17 + (i % 3) * 0.33), cy = h * (0.3 + Math.floor(i / 3) * 0.41);
x.fillStyle = cols[i];
x.beginPath();
if (x.roundRect) x.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 8);
else x.rect(cx - cw / 2, cy - ch / 2, cw, ch);
x.fill();
}
},

offer(x, w, h) {
x.fillStyle = C.deep;
x.fillRect(0, 0, w, h);
x.fillStyle = C.sky;
x.fillRect(w * 0.17, h * 0.57, w * 0.28, h * 0.08);
x.fillRect(w * 0.55, h * 0.48, w * 0.28, h * 0.08);
x.fillStyle = C.chalk;
x.fillRect(w * 0.49, h * 0.2, w * 0.015, h * 0.58);
x.strokeStyle = C.chalk;
x.lineWidth = Math.max(2, w * 0.014);
x.beginPath();
x.moveTo(w * 0.31, h * 0.57);
x.lineTo(w * 0.69, h * 0.48);
x.stroke();
x.fillStyle = C.straw;
x.beginPath();
x.arc(w * 0.5, h * 0.2, h * 0.055, 0, Math.PI * 2);
x.fill();
},

rate(x, w, h) {
x.fillStyle = C.ink;
x.fillRect(0, 0, w, h);
x.strokeStyle = "rgba(251,250,246,0.28)";
x.lineWidth = Math.max(1.5, w * 0.008);
x.beginPath();
x.moveTo(w * 0.08, h * 0.7);
x.bezierCurveTo(w * 0.35, h * 0.66, w * 0.6, h * 0.62, w * 0.92, h * 0.58);
x.stroke();
x.strokeStyle = C.sky;
x.lineWidth = Math.max(2.5, w * 0.016);
x.beginPath();
x.moveTo(w * 0.08, h * 0.76);
x.bezierCurveTo(w * 0.4, h * 0.72, w * 0.55, h * 0.3, w * 0.92, h * 0.22);
x.stroke();
x.fillStyle = C.straw;
x.beginPath();
x.arc(w * 0.92, h * 0.22, h * 0.05, 0, Math.PI * 2);
x.fill();
},

protect(x, w, h) {
x.fillStyle = C.sky;
x.fillRect(0, 0, w, h);
[[0.3, C.chalk], [0.7, C.paper]].forEach(([cx, col]) => {
x.fillStyle = col;
x.fillRect(w * cx - w * 0.16, h * 0.2, w * 0.32, h * 0.6);
x.fillStyle = C.deep;
x.fillRect(w * cx - w * 0.1, h * 0.32, w * 0.2, h * 0.2);
x.fillStyle = C.water;
x.fillRect(w * cx - w * 0.1, h * 0.6, w * 0.14, h * 0.05);
});
},

podcast(x, w, h) {
x.fillStyle = C.peony;
x.fillRect(0, 0, w, h);
x.fillStyle = C.claret;
const n = 9;
for (let i = 0; i < n; i++) {
const bh = h * (0.18 + 0.5 * Math.abs(Math.sin(i * 1.1 + 0.6)));
x.fillRect(w * (0.14 + (i * 0.72) / n), h / 2 - bh / 2, w * 0.045, bh);
}
},
};

function quickArt(kind, w = 72, h = 48) {
const canvas = document.createElement("canvas");
canvas.className = "cn-qart";
canvas.setAttribute("aria-hidden", "true");
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = Math.round(w * dpr);
canvas.height = Math.round(h * dpr);
const x = canvas.getContext("2d");
x.scale(dpr, dpr);
(ART[kind] ?? ART.rate)(x, w, h);
return canvas;
}

function thumbOf(work) {
const m = /[?&]v=([\w-]{11})/.exec(work?.url ?? "");
return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function workArt(work, kind) {
const src = thumbOf(work);
if (!src) return quickArt(kind);
const img = document.createElement("img");
img.className = "cn-qart";
img.alt = "";
img.decoding = "async";
img.loading = "lazy";
img.referrerPolicy = "no-referrer";
img.addEventListener("error", () => img.replaceWith(quickArt(kind)), { once: true });
img.src = src;
return img;
}
});
