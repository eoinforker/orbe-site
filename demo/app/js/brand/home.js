/*
  A brand's home: a one-line greeting, as on a creator's home, a
  command box (buy reads, see the market, find creators, fund a booking, in
  the order of what the brand said it wants), the brand's market at the
  centre when intelligence is on, the figures that matter, Getting started
  from what is really done, what is waiting on the brand, and the latest
  campaigns.
*/
import { api, bundle, on, seg } from "../api.js";
import { alerts, checklist, cover, emptyState, section, skeleton, stat, statStrip } from "../console-ui.js";
import { tile } from "../catalogue.js";
import { icon } from "../icons.js";
import { loadNotifications } from "../notify.js";
import { openPalette } from "../shell.js";
import { block, day, h, money, plural } from "../ui.js";
import { campaignState } from "./campaigns.js";
import { marketSnapshot } from "./intel.js";

const settle = (p) => p.then((v) => ({ ok: true, v }), () => ({ ok: false }));
const WAITING = ["awaiting_funds", "draft_review"];
const HELD = ["in_production", "draft_review", "changes_requested", "ready", "live", "short", "make_good"];

/** Getting started for a brand, from what is really done. */
export function brandSteps({ brand, campaigns, bookings, keys, intel }) {
  return [
    { name: "Set up the brand", line: "Your organisation, what you sell and the brand terms.", done: Boolean(brand), href: "/orbe-site/demo/app/settings/brand" },
    on("brand_intel") ? { name: "Name your competitors", line: "See who they sponsor, and how it delivered.", done: Boolean(intel?.settings?.competitors?.length), href: "/orbe-site/demo/app/intelligence" } : null,
    on("sponsorships") ? { name: "Write your first brief", line: "Budget, formats and when it should run.", done: campaigns.length > 0, href: on("reads_checkout") ? "/orbe-site/demo/app/reads" : "/orbe-site/demo/app/campaigns?new=1" } : null,
    on("sponsorships") ? { name: "Open a campaign and send an offer", line: "At the creator's price, with a guarantee.", done: campaigns.some((c) => c.state !== "draft"), href: "/orbe-site/demo/app/campaigns" } : null,
    on("sponsorships") ? { name: "Fund your first booking", line: "The money is held until delivery is verified.", done: bookings.some((b) => b.funding?.fundedAt), href: "/orbe-site/demo/app/bookings" } : null,
    on("brand_data") ? { name: "Make a data API key", line: "Discovery from your own systems.", done: keys.length > 0, href: "/orbe-site/demo/app/settings/keys" } : null,
  ].filter(Boolean);
}

/** The greeting and the command box; its shortcuts ordered by what the brand wants first. */
function band(wants = []) {
  const box = h("input", { class: "cn-composer-text cn-composer-text--one", type: "search", placeholder: "Find a campaign, creator, tool or setting", "aria-label": "Search Orbe", autocomplete: "off" });
  const chips = [
    on("reads_checkout") ? ["reads", h("a", { class: "cn-cchip", href: "/orbe-site/demo/app/reads" }, tile("products/offer/", "spon", h), "Buy guaranteed reads")] : null,
    on("brand_intel") ? ["discovery", h("a", { class: "cn-cchip", href: "/orbe-site/demo/app/intelligence" }, tile("products/diligence/", "rec", h), "See your market")] : null,
    on("sponsorships") && !on("reads_checkout") ? ["reads", h("a", { class: "cn-cchip", href: "/orbe-site/demo/app/campaigns?new=1" }, tile("products/sponsorships/", "spon", h), "Write a brief")] : null,
    on("brand_data") ? ["discovery", h("a", { class: "cn-cchip", href: "/orbe-site/demo/app/discover" }, tile("products/rate/", "also", h), "Find creators")] : null,
    on("sponsorships") ? ["reads", h("a", { class: "cn-cchip", href: "/orbe-site/demo/app/bookings" }, tile("products/selling/", "sell", h), "Fund a booking")] : null,
  ].filter(Boolean);
  const first = chips.filter(([k]) => wants.includes(k));
  const form = h("form", { class: "cn-composer", role: "search", onsubmit: (e) => { e.preventDefault(); openPalette(box.value.trim()); } },
    box,
    h("div", { class: "cn-composer-bar" },
      h("div", { class: "cn-composer-chips" }, [...first, ...chips.filter((c) => !first.includes(c))].map(([, el]) => el)),
      h("button", { class: "cn-run", type: "submit" }, "Search", h("kbd", { class: "cn-kbd" }, "\u21B5")),
    ),
  );
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  // A brand's account carries the organisation's name, not a person's, so the greeting names no one.
  return [h("h1", { class: "cn-home-hi", tabindex: "-1", "data-title": "" }, `${part}.`), form];
}

export async function render(main, ctx) {
  const body = h("div", { class: "cn-home" });
  const top = h("div", { class: "cn-home cn-home--top" });
  // The brand's market is the home's centrepiece when intelligence is on. It loads on its own, so the rest never waits for it.
  const centre = on("brand_intel") ? h("div", { class: "bi-centre" }, skeleton(4)) : null;
  main.append(top, ...(centre ? [h("div", { class: "cn-home" }, centre)] : []), body);
  // Home's first reads come in one request (with the boot on a first visit); each read below is then kept.
  await bundle("home");
  const wants = await api.get("/v1/me/welcome").then((r) => r.welcome.answers.wants ?? [], () => []);
  top.append(...band(wants));
  if (centre) marketSnapshot().then((el) => centre.replaceChildren(el), () => centre.remove());
  await block(body, async () => {
    const [profile, campaigns, bookings, keys, waitingOn, intel] = await Promise.all([
      on("sponsorships") ? settle(api.get("/v1/brand/profile")) : settle(api.get("/v1/buyer/me")),
      on("sponsorships") ? settle(api.get("/v1/brand/campaigns")) : null,
      on("sponsorships") ? settle(api.get("/v1/brand/bookings")) : null,
      on("brand_data") ? settle(api.get("/v1/keys")) : null,
      loadNotifications(ctx.user).catch(() => []),
      on("brand_intel") ? api.get("/v1/brand/intel/settings").catch(() => null) : null,
    ]);
    return {
      brand: profile.ok ? (profile.v.brand ?? profile.v.buyer) : null,
      campaigns: campaigns?.ok ? campaigns.v.campaigns : [],
      bookings: bookings?.ok ? bookings.v.bookings : [],
      keys: keys?.ok ? keys.v.keys : [],
      waitingOn,
      intel,
    };
  }, (d) => {
    const open = d.campaigns.filter((c) => c.state === "open");
    const waiting = d.bookings.filter((b) => WAITING.includes(b.state) || (b.state === "live" && !b.contentApprovedAt));
    const held = d.bookings.filter((b) => HELD.includes(b.state) && b.funding?.fundedAt);
    const heldTotal = held.reduce((n, b) => n + (b.funding?.total?.amount ?? 0), 0);
    const steps = brandSteps(d);
    const done = steps.filter((x) => x.done).length;
    return [
      alerts(d.waitingOn),
      statStrip([
        on("sponsorships") ? stat({ label: "Open campaigns", value: String(open.length), line: `${plural(d.campaigns.length, "campaign")} in all`, links: [["Campaigns", "/orbe-site/demo/app/campaigns"]] }) : null,
        on("sponsorships") ? stat({ label: "Waiting on you", value: String(waiting.length), line: waiting.length ? "Fund, review or approve." : "Nothing waiting on you.", links: [["Bookings", "/orbe-site/demo/app/bookings"]] }) : null,
        on("sponsorships") ? stat({ label: "Held for delivery", value: money({ amount: heldTotal, currency: "GBP" }), line: held.length ? `${plural(held.length, "booking")} funded, paid out only on verified delivery.` : "Nothing held now." }) : null,
      ]),
      h("div", { class: "cn-start" },
        steps.some((x) => !x.done) ? section({ title: "Welcome to Orbe", line: "From a brief to a read delivered and verified.", actions: h("span", { class: "cn-progress" }, `${done} of ${steps.length}`) }, checklist(steps)) : null,
        on("sponsorships")
          ? section({ title: "Latest campaigns", line: plural(d.campaigns.length, "campaign"), actions: h("a", { class: "cn-btn cn-btn--xs", href: "/orbe-site/demo/app/campaigns" }, "All") },
              d.campaigns.length
                ? h("div", { class: "cn-links" }, [...d.campaigns].reverse().slice(0, 5).map((c) => h("a", { class: "cn-mini", href: `/orbe-site/demo/app/campaigns/${seg(c.id)}` }, cover(c.id, "spon", 0.6), h("span", null, h("span", { class: "cn-mini-t" }, c.brief.title), h("span", { class: "cn-mini-d" }, day(c.brief.window.start))), campaignState(c.state))))
                : emptyState("megaphone", "No campaigns yet.", [["Write a brief", "/orbe-site/demo/app/campaigns?new=1", true]], "A brief is a budget, the formats and when it should run."),
            )
          : emptyState("megaphone", "Sponsorships are switched off on this server.", on("brand_data") ? [["Find creators", "/orbe-site/demo/app/discover", true]] : []),
      ),
    ];
  });
}
