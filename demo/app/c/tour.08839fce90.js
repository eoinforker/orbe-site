__o.d("js/tour.js", function (__x) {
"use strict";
__o.e(__x, { startTour: () => startTour });
const { api, canRateChannels } = __o.r("js/api.js");
const { h, refocus } = __o.r("js/ui.js");

const visible = (el) => {
if (!el) return false;
const r = el.getBoundingClientRect();
return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

function tabStop(name, path) {
const tab = document.querySelector(`[data-tab="${name}"] .cn-tab`);
if (visible(tab)) return { el: tab };
const docked = document.querySelector(`[data-dock] [data-path="${path}"]`);
if (visible(docked)) return { el: docked };
const more = document.querySelector("[data-dock] button");
return visible(more) ? { el: more, more: true } : { el: null };
}
function stopsFor(user) {
const creator = user.type === "creator";
const touch = matchMedia("(pointer: coarse)").matches;
const search = () => document.querySelector("[data-top] .cn-search");
const keyName = /Mac|iPhone|iPad/.test(navigator.platform) ? "Cmd K" : "Ctrl K";
return [
{ find: () => ({ el: document.querySelector(".cn-composer") }), title: creator ? "Ask Orbe" : "Start anything here", line: () => (creator ? "Rate a work, check an offer or find a sponsor. Type in your own words, or pick the tool from the chip." : "Search, or jump straight to a brief, creators or a booking.") },
{ find: () => ({ el: visible(search()) ? search() : null }), title: "Search anything", line: () => `${touch ? "The magnifier at the top" : keyName} finds any tool, setting or work by its title.${canRateChannels() ? " Type @handle to rate a channel." : ""}` },
creator
? { find: () => tabStop("Library", "library"), title: "Your Library", line: (s) => `${s.more ? "Under More: e" : "E"}very work you publish, each rated against creators your size, with what to fix and the deals on it.` }
: { find: () => tabStop("Campaigns", "campaigns"), title: "Campaigns", line: (s) => `${s.more ? "Under More: w" : "W"}rite a brief, see creators matched by their results, and send offers with a guarantee.` },
{ find: () => tabStop("Explore", "explore"), title: "Explore", line: (s) => `${s.more ? "Under More: e" : "E"}very Orbe tool in one place, with what is live and what is coming.` },
];
}
let running = null;

function startTour(user, opts = {}) {
if (running) return;
const stops = stopsFor(user).filter((s) => s.find().el);
if (!stops.length) return;
let at = 0;
const ring = h("div", { class: "cn-spot", "aria-hidden": "true" });
const card = h("div", { class: "cn-tour", role: "dialog", "aria-modal": "true", "aria-labelledby": "cn-tour-t", tabindex: "-1" });
const layer = h("div", { class: "cn-tour-layer" }, ring, card);
const end = async () => {
window.removeEventListener("resize", place);
window.removeEventListener("scroll", place, true);
document.removeEventListener("keydown", keys, true);
document.removeEventListener("focusin", hold, true);
layer.remove();
running = null;
refocus(back);
await api.put("/v1/me/welcome", { tourDone: true }).catch(() => {});
};
const back = document.activeElement;

function place() {
const el = stops[at].find().el;
if (!el) return;
const r = el.getBoundingClientRect();
const pad = 6;
Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
const cw = Math.min(340, window.innerWidth - 32);
const dock = document.querySelector("[data-dock]");
const floor = visible(dock) && !dock.contains(el) ? dock.getBoundingClientRect().top : window.innerHeight;
const ch = card.offsetHeight || 190;
const below = r.bottom + pad + 10 + ch + 8 <= floor;
const left = Math.max(16, Math.min(window.innerWidth - cw - 16, r.left + r.width / 2 - cw / 2));
Object.assign(card.style, { width: `${cw}px`, left: `${left}px`, top: below ? `${r.bottom + pad + 10}px` : "auto", bottom: below ? "auto" : `${Math.max(window.innerHeight - r.top + pad + 10, window.innerHeight - floor + 8)}px` });
}
function draw() {
const s = stops[at];
const found = s.find();
const el = found.el;

if (!el.closest("[data-top], [data-dock]")) el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
card.replaceChildren(
h("p", { class: "cn-tour-n" }, `${at + 1} of ${stops.length}`),
h("p", { class: "cn-tour-t", id: "cn-tour-t" }, s.title),
h("p", { class: "cn-tour-d" }, s.line(found)),
h("div", { class: "cn-tour-actions" },
h("button", { class: "cn-btn cn-btn--ghost cn-btn--s", type: "button", onclick: end }, "Skip"),
h("span", { class: "cn-grow" }),
at > 0 ? h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => go(-1) }, "Back") : null,
h("button", { class: "cn-btn cn-btn--primary cn-btn--s", type: "button", onclick: () => (at === stops.length - 1 ? end() : go(1)) }, at === stops.length - 1 ? "Done" : "Next"),
),
);
place();
requestAnimationFrame(place);
card.focus({ preventScroll: true });
}
const go = (d) => {
at = Math.max(0, Math.min(stops.length - 1, at + d));
draw();
};

function hold(e) {
if (!layer.contains(e.target)) card.focus({ preventScroll: true });
}
function keys(e) {
if (e.key === "Escape") (e.preventDefault(), end());
else if (e.key === "ArrowRight") (e.preventDefault(), at === stops.length - 1 ? end() : go(1));
else if (e.key === "ArrowLeft") (e.preventDefault(), go(-1));
else if (e.key === "Tab") {

const items = [...card.querySelectorAll("button")];
const i = items.indexOf(document.activeElement);
e.preventDefault();
items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
}
}
running = layer;
document.body.append(layer);
window.addEventListener("resize", place);
window.addEventListener("scroll", place, true);
document.addEventListener("keydown", keys, true);
document.addEventListener("focusin", hold, true);
draw();
void opts;
}
});
