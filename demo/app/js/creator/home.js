/*
  Home: a one-line greeting, the composer that runs
  any tool, quick starts (with pictures: your own latest video where Orbe
  can show it) in the order of what you asked for help with, what is waiting on you, the figures that matter with their trend,
  Getting started from what is really done, your latest works, your rating
  part by part, and recent activity. Every figure comes from the API.
*/
import { api, bundle, can, on } from "../api.js";
import { alerts, ago, bars, checklist, cover, emptyState, rating, section, sparkline, stat, statStrip } from "../console-ui.js";
import { composer } from "../composer.js";
import { firstName } from "../band.js";
import { tile } from "../catalogue.js";
import { quickArt, workArt } from "../sky.js";
import { icon } from "../icons.js";
import { loadNotifications } from "../notify.js";
import { handleOf, KINDS, SIZE_RANGES, SOURCES } from "../terms.js";
import { block, h, plural, signed } from "../ui.js";

const MONEY_SOURCES = ["stripe", "patreon", "adsense"];
const OPEN_OFFER = ["sent", "countered"];
/** Who has the next move on the open offers: the one waiting on the creator named first. */
const yoursFirst = (open) => {
  const mine = open.filter((o) => o.state === "sent");
  if (mine.length) return `${mine[0].brandName} waits for you. `;
  return open.length ? "Each waits for the brand. " : "";
};

/* A part built after the first paint, in place of an empty marker: it sits below the fold, so nothing above it moves. */
function later(build) {
  const mark = h("div", { hidden: "" });
  const fill = () => mark.isConnected && mark.replaceWith(...build().flat().filter(Boolean));
  if (window.requestIdleCallback) requestAnimationFrame(() => requestIdleCallback(fill, { timeout: 400 }));
  else requestAnimationFrame(() => setTimeout(fill, 50));
  return mark;
}

const settle = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));

/** Getting started, from what is really done. */
export function startSteps(me, ratings, sponsorship) {
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

/** What happened lately, newest first, from dates the API already gives. */
export function activity(me, ratings, offers, bookings, history = []) {
  // A rating is worked out again on every visit, so its time is when it first read as it does now (from the kept trend), not this moment.
  const keptAt = (r) => {
    const h = [...(history.find((a) => a.accountId === r.accountId)?.ratings ?? [])].filter((x) => x.computedAt).sort((x, y) => String(x.computedAt).localeCompare(String(y.computedAt)));
    // Within a twentieth of a point is the same reading: figures maturing by the hour move it a hundredth or two.
    const same = (x) => Math.abs(x.rating - r.result.rating) < 0.05;
    let i = h.length - 1;
    if (i < 0 || !same(h[i])) return r.result.computedAt;
    while (i > 0 && same(h[i - 1])) i--;
    return h[i].computedAt;
  };
  const items = [
    ...me.connections.map((c) => ({ at: c.createdAt, text: `Connected ${SOURCES[c.source]?.name ?? c.source}`, icon: "link" })),
    ...ratings.filter((r) => r.result?.computedAt).map((r) => ({ at: keptAt(r), text: `Rated ${r.handle || "an account"}: ${r.result.status === "rated" ? signed(r.result.rating) : "not yet"}`, icon: "chart" })),
    ...offers.filter((o) => o.createdAt ?? o.sentAt).map((o) => ({ at: o.createdAt ?? o.sentAt, text: `Offer from ${o.brandName}`, icon: "megaphone" })),
    ...bookings.filter((b) => b.createdAt ?? b.acceptedAt).map((b) => ({ at: b.createdAt ?? b.acceptedAt, text: `Booking with ${b.brandName}`, icon: "bolt" })),
    { at: me.creator.createdAt, text: "Joined Orbe", icon: "sparkle" },
  ];
  return items.filter((i) => i.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 6);
}

/** The part a creator leads with: reach where it was measured, else their strongest. */
export function leadPart(result) {
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

/* Quick starts: [name, line, where, colour pair, feature, what it helps with, role needed, picture]. */
const QUICK = [
  ["Drop in a video", "Cut clips and write posts", "/orbe-site/demo/app/media", "also", "media", "grow", "content", "video"],
  ["Rate a work", "Against creators your size", "/orbe-site/demo/app/runs?tool=rate-work", "also", "rating", "grow", null, "rate"],
  ["Sponsors like you", "Brands that sponsor creators like you", "/orbe-site/demo/app/runs?tool=sponsor", "sell", null, "earn", "read.money", "sponsor"],
  ["Check an offer", "Is it fair for your size?", "/orbe-site/demo/app/runs?tool=offer", "spon", "sponsorships", "earn", "read.money", "offer"],
  ["Check a copy", "Is this your work? On your device", "/orbe-site/demo/app/protect", "rec", null, "protect", null, "protect"],
  ["Set up a podcast", "Free measurement, always", "/orbe-site/demo/app/podcasts", "pod", "podcasts", "grow", null, "podcast"],
];

/** Three quick starts: for what you make (a podcast's set-up only for someone who makes one), then what you asked for help with first. */
export function quickFor(help = [], makes = [], hasShow = false) {
  const want = new Set(help);
  const podcast = makes.includes("podcast") && !hasShow;
  const open = QUICK.filter(([, , , , f, , needs, art]) => (!f || on(f)) && can(needs) && (art !== "podcast" || podcast || (!makes.length && !hasShow)));
  const first = (q) => (q[7] === "podcast" && podcast ? 0 : want.has(q[5]) ? 1 : 2);
  return [...open].sort((a, b) => first(a) - first(b)).slice(0, 3);
}

/* A quick start's picture: for rating, the creator's own latest video where Orbe can show it; otherwise that task's art. */
const pictureFor = (art, latest) => (art === "rate" && latest ? workArt(latest, art) : quickArt(art));

function quickCards(help, latest, makes, hasShow) {
  return h("nav", { class: "cn-quick", "aria-label": "Quick starts" },
    quickFor(help, makes, hasShow).map(([t, d, href, , , , , art]) =>
      h("a", { class: "cn-qcard", href }, pictureFor(art, latest), h("span", null, h("span", { class: "cn-qcard-t" }, t), h("span", { class: "cn-qcard-d" }, d)), icon("chevronRight")),
    ),
  );
}

/** Works per week for the last eight weeks, oldest first. */
const perWeek = (works) => Array.from({ length: 8 }, (_, i) => works.filter((w) => w.ageDays >= (7 - i) * 7 && w.ageDays < (8 - i) * 7).length);

const workRow = (w) =>
  h("a", { class: "cn-mini", href: `/orbe-site/demo/app/works/${encodeURIComponent(w.id)}` },
    cover(w.id, w.kind, w.rating ? (w.rating.rating + 1.5) / 3 : 0.3),
    h("span", { class: "cn-mini-main" }, h("span", { class: "cn-mini-t" }, w.title), h("span", { class: "cn-mini-d" }, `${w.account.handle}, ${ago(w.publishedAt)}`)),
    w.rating ? h("span", { class: `cn-score${w.rating.rating > 0 ? " cn-score--up" : ""}` }, signed(w.rating.rating)) : h("span", { class: "cn-score cn-score--down" }, "New"),
  );

function ratingCard(rated) {
  const res = rated.result;
  // The figure, and the way to the Record, are in the strip at the top; here, only what it is made of.
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

/** One line: hello, by first name when Orbe knows it. */
function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = firstName(name);
  return h("h1", { class: "cn-home-hi", tabindex: "-1", "data-title": "" }, first ? `${part}, ${first}.` : `${part}.`);
}

export async function render(main, ctx) {
  const body = h("div");
  main.append(body);
  await block(
    body,
    async () => {
      const none = Promise.resolve(null);
      // Home's first reads come in one request (with the boot on a first visit); each read below is then kept.
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
      const recent = activity(me, ratings, offers, bookings, history);
      const month = works.filter((w) => w.ageDays <= 30);
      const viaGoogle = ctx.query.get("via") === "google" && !me.connections.some((c) => c.source === "youtube_analytics");
      const box = composer({
        accounts: me.accounts.map((a) => ({ id: a.id, handle: a.handle || a.title, kind: a.kind })),
        onRun: (job) => ctx.go(`/orbe-site/demo/app/runs?${new URLSearchParams({ run: "1", tool: job.tool, q: job.text, account: job.account, window: job.window })}`),
      });
      const done = steps.filter((s) => s.done).length;
      const progress = h("span", { class: "cn-progress" }, h("span", { class: "cn-progress-bar" }, h("span")), `${done} of ${steps.length}`);
      progress.querySelector(".cn-progress-bar span").style.setProperty("--p", String(done / steps.length));
      // Setting the account up is the owner's: someone working on another's team is not asked to.
      const showStart = steps.some((x) => !x.done) && !hidden() && can("owner");
      // Nearly there: Getting started shrinks to one line naming the next step.
      const nearly = done >= 5;
      const hide = (e) => {
        try {
          localStorage.setItem(HIDE, "1");
        } catch {
          // Not remembered: it hides for this visit only.
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
      // Nothing connected yet: one way in, said once, in place of figures that would all read zero.
      const fresh = !me.accounts.length;
      const firstConnect = fresh && !viaGoogle
        ? h("section", { class: "cn-banner" }, h("p", null, "Your rating, your works and fair prices for offers all start from an account Orbe can read. Orbe only reads."), can("owner") ? h("a", { class: "cn-btn cn-btn--primary cn-btn--s", href: "/orbe-site/demo/app/settings/connections" }, "Connect your first account") : null)
        : null;
      const start = () => h("div", { class: "cn-start" },
        section({ title: "Welcome to Orbe", line: "A few steps to a rating and a record brands can trust.", actions: progress }, checklist(steps)),
        fresh ? null : latest(),
      );
      // Hello to whoever is signed in, which on someone else's team is not the account's owner.
      const head = greeting((ctx.user.person ?? me.creator).displayName);
      // Someone who came to Orbe through another team and has not set up their own account: offered here, once, never forced.
      const ownSetUp = welcomeDue && can("owner")
        ? h("section", { class: "cn-banner", "aria-label": "Set up your account" },
            h("p", null, h("b", null, "Set up your own account."), " A few questions, then your place among creators your size."),
            h("div", { class: "cn-banner-actions" },
              h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: async (e) => {
                const card = e.target.closest(".cn-banner");
                // The way in that the set-up would have given takes its place.
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
          on("sponsorships") && can("read.money") ? stat({ label: "Offers waiting", value: String(openOffers.length), line: `${yoursFirst(openOffers)}${plural(moving.length, "booking")} under way.`, links: [["Deals", "/orbe-site/demo/app/deals"]] }) : null,
        ]),
      ];
      // Below the fold, built once the top has painted: Getting started, the rating part by part and recent activity.
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
      // One width for everything. On a phone: the composer, then what is waiting on you, then the figures; the rest follows.
      if (matchMedia("(max-width: 899px)").matches) {
        const [own, waiting, banner, figures] = needs;
        return h("div", { class: "cn-home cn-home--top" }, head, own, box.node, waiting, banner, figures, later(() => [quickCards(help, works[0], makes, hasShow), ...rest()]));
      }
      return h("div", { class: "cn-home cn-home--top" }, head, box.node, quickCards(help, works[0], makes, hasShow), needs, later(rest));
    },
  );
}
