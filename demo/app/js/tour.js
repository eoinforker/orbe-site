/*
  The short tour after the walkthrough: four stops on real elements (the
  composer, search, the Library or Campaigns, and Explore), one card beside
  each with Back, Next and Done. The rest of the console dims; the stop is
  ringed, not lit. Escape or Done ends it for good (PUT /v1/me/welcome
  { tourDone }); arrow keys move. On a phone the tabs live in the menu, so
  that stop points at the menu button. Reduced motion: no movement at all.
*/
import { api } from "./api.js";
import { h } from "./ui.js";

const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

function stopsFor(user) {
  const tab = (name) => document.querySelector(`[data-tab="${name}"] .cn-tab`);
  const phoneMenu = () => document.querySelector(".cn-sheetbtn");
  const creator = user.type === "creator";
  return [
    { find: () => document.querySelector(".cn-composer"), title: creator ? "Ask Orbe" : "Start anything here", line: creator ? "Rate a work, check an offer or find a sponsor. Type in your own words, or pick the tool from the chip." : "Search, or jump straight to a brief, creators or a booking." },
    { find: () => (visible(document.querySelector(".cn-search")) ? document.querySelector(".cn-search") : phoneMenu()), title: "Search anything", line: "Ctrl K (Cmd K on a Mac) finds any tool, setting or work by its title. Type @handle to rate a channel." },
    creator
      ? { find: () => (visible(tab("Library")) ? tab("Library") : phoneMenu()), title: "Your Library", line: "Every work you publish, each rated against creators your size, with what to fix and the deals on it." }
      : { find: () => (visible(tab("Campaigns")) ? tab("Campaigns") : phoneMenu()), title: "Campaigns", line: "Write a brief, see creators matched by their results, and send offers with a guarantee." },
    { find: () => (visible(tab("Explore")) ? tab("Explore") : phoneMenu()), title: "Explore", line: "Every Orbe tool in one place, with what is live and what is coming." },
  ];
}

let running = null;

/** Starts the tour; with force, even when it was finished before. */
export function startTour(user, opts = {}) {
  if (running) return;
  const stops = stopsFor(user).filter((s) => s.find());
  if (!stops.length) return;
  let at = 0;
  const ring = h("div", { class: "cn-spot", "aria-hidden": "true" });
  const card = h("div", { class: "cn-tour", role: "dialog", "aria-modal": "true", "aria-labelledby": "cn-tour-t", tabindex: "-1" });
  const layer = h("div", { class: "cn-tour-layer" }, ring, card);
  const end = async () => {
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", keys, true);
    layer.remove();
    running = null;
    back?.focus?.({ preventScroll: true });
    await api.put("/v1/me/welcome", { tourDone: true }).catch(() => {});
  };
  const back = document.activeElement;
  function place() {
    const el = stops[at].find();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 6;
    Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const cw = Math.min(340, window.innerWidth - 32);
    const below = r.bottom + 14 + 190 < window.innerHeight;
    const left = Math.max(16, Math.min(window.innerWidth - cw - 16, r.left + r.width / 2 - cw / 2));
    Object.assign(card.style, { width: `${cw}px`, left: `${left}px`, top: below ? `${r.bottom + pad + 10}px` : "auto", bottom: below ? "auto" : `${window.innerHeight - r.top + pad + 10}px` });
  }
  function draw() {
    const s = stops[at];
    const el = s.find();
    el.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card.replaceChildren(
      h("p", { class: "cn-tour-n" }, `${at + 1} of ${stops.length}`),
      h("p", { class: "cn-tour-t", id: "cn-tour-t" }, s.title),
      h("p", { class: "cn-tour-d" }, s.line),
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
  function keys(e) {
    if (e.key === "Escape") (e.preventDefault(), end());
    else if (e.key === "ArrowRight") (e.preventDefault(), at === stops.length - 1 ? end() : go(1));
    else if (e.key === "ArrowLeft") (e.preventDefault(), go(-1));
    else if (e.key === "Tab") {
      // Focus stays on the card while the tour is open.
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
  draw();
  void opts;
}
