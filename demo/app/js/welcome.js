/*
  The first sign-in: as few steps as earn their place, each skippable, kept
  on the server (GET and PUT /v1/me/welcome) so it resumes on any device.

  A creator: what you make; connect, add your show's feed or paste any
  handle, so there is a rating before any permission; then your place among
  creators your size, and what you want help with, which orders your home.
  A brand: who you are (the brand profile and its terms), then what you
  want, which orders the brand's home; with intelligence on, its market
  (the competitors it follows, and whether to start with a first brief or
  its category). Both end by inviting the team, which
  anyone can skip; only the account's owner ever sees the walkthrough.

  It takes the whole window, on the Sky field, with the console's frame put
  away; finishing or skipping lands on a home that is already filled in.
*/
import { api, on, seg } from "./api.js";
import { beginSignIn, openConnect } from "./connect-inline.js";
import { tile } from "./catalogue.js";
import { pill, pixelGrid } from "./console-ui.js";
import { paintedSky } from "./sky.js";
import { icon } from "./icons.js";
import { lockup } from "./shell.js";
import { BRAND_TERMS } from "./terms.js";
import { h, signed, toast } from "./ui.js";

/** Moving on from a step: to the server's next step when there is one (an added step such as a team invite), else finished. */
const onward = (w, from, change = {}) => {
  const after = w.steps[w.steps.indexOf(from) + 1];
  return after ? { ...change, step: after } : { ...change, finished: true };
};

const isLast = (w, step) => w.steps.indexOf(step) === w.steps.length - 1;

const put = (body) => api.put("/v1/me/welcome", body).then((r) => r.welcome);

/** A choice card: a tile (a glyph and its colour, or a node), a name and a line, pressed or not. one: only one of the set can be chosen, so its tick is round. */
function choice(name, line, glyph, k, pressed, onToggle, one = false) {
  const b = h("button", { class: `cn-wl-choice${one ? " cn-wl-choice--one" : ""}`, type: "button", "aria-pressed": String(pressed) }, typeof glyph === "string" ? tile(glyph, k, h) : glyph, h("span", { class: "cn-wl-choice-t" }, name), h("span", { class: "cn-wl-choice-d" }, line), h("span", { class: "cn-wl-tick", "aria-hidden": "true" }, icon("check")));
  b.addEventListener("click", () => {
    const now = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(now));
    onToggle(now);
  });
  return b;
}

/* How many steps this walkthrough has, set as it is drawn, so an added step counts. */
let total = 0;

function stepHead(n, of, title, line) {
  return [
    h("p", { class: "cn-wl-count" }, `Step ${n} of ${total || of}`),
    h("h1", { class: "cn-wl-h", tabindex: "-1", "data-title": "" }, title),
    line ? h("p", { class: "cn-wl-line" }, line) : null,
  ];
}

/** primary: the step's one action; false: a plain button beside an input or in a row. */
const button = (label, onclick, primary = true, type = "button") => h("button", { class: `cn-btn${primary ? " cn-btn--primary" : ""}`, type, onclick }, label);

/* ---------------------------------------------------------------- a creator */

/* What a creator makes: the key the server keeps, the name, a line, the glyph of its mark and how it reads in a sentence. */
const MAKES = [
  ["youtube", "YouTube", "Videos and Shorts", "play", "YouTube"],
  ["podcast", "A podcast", "Audio or video episodes", "mic", "a podcast"],
  ["newsletter", "A newsletter", "Posts to subscribers", "mail", "a newsletter"],
  ["tiktok", "TikTok", "Short videos. Read for sponsorships; not rated yet", "phone", "TikTok"],
  ["instagram", "Instagram", "A professional account. Read for sponsorships; not rated yet", "camera", "Instagram"],
  ["snapchat", "Snapchat", "Stories and Spotlight", "image", "Snapchat"],
  ["x", "X", "Posts and video", "megaphone", "X"],
  ["product", "A product brand", "Hardware, software or goods you make and sell", "box", "a product brand's shop"],
];
/* Short-form appears only where the server reads it. */
const shown = (k) => (k === "podcast" ? on("podcasts") : k === "tiktok" ? on("tiktok") : k === "instagram" ? on("instagram") : true);
/* A service's mark in Orbe's own tile style, as on Connections: one of Orbe's glyphs, no third-party logos. */
const markOf = (glyph) => h("span", { class: "cn-conn-mark cn-wl-mark", "data-group": "work", "aria-hidden": "true" }, icon(glyph));
/** "a, b or c". */
const orList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);

/** A failed step in words a creator can act on: never an internal id or the server's set-up. */
function plainly(err, name) {
  if (["source_unavailable", "integration_unavailable", "provider_not_live"].includes(err?.code)) return `${name} can't be connected here yet.`;
  if (!err?.status || err.status >= 500) return "That did not go through. Try again in a moment.";
  return err.message;
}
const HELP = [
  ["grow", "Grow", "Know what works against creators your size", "products/rate/", "also"],
  ["earn", "Earn", "Fair prices, and sponsor reads paid on delivery", "products/sponsorships/", "spon"],
  ["protect", "Protect", "Find copies of your work", "products/protect/", "rec"],
];

/* Set when the walkthrough gave the person a name, so finishing reloads the frame that shows it. */
let named = false;

function makeStep(w, next, ctx) {
  const picked = new Set(w.answers.makes ?? []);
  const had = (ctx.user.displayName ?? "").trim();
  const name = h("input", { class: "cn-field-input", name: "displayName", maxlength: 80, autocomplete: "name", value: had });
  const status = h("p", { class: "cn-wl-status", role: "status" });
  return [
    ...stepHead(numberOf("make", 1), 3, "Tell Orbe about you", null),
    h("label", { class: "cn-wl-field cn-wl-name" }, h("span", null, "Your name"), name, h("small", null, "Brands and buyers you agree to work with see it.")),
    h("p", { class: "cn-wl-sub" }, "What do you make? Choose all that apply."),
    h("div", { class: "cn-wl-choices cn-wl-choices--top0", role: "group", "aria-label": "What you make" }, MAKES.filter(([k]) => shown(k)).map(([k, n, d, glyph]) => choice(n, d, markOf(glyph), null, picked.has(k), (yes) => (yes ? picked.add(k) : picked.delete(k))))),
    status,
    h("div", { class: "cn-wl-actions" }, button("Continue", async (e) => {
      const given = name.value.trim();
      if (given && given !== had) {
        e.target.disabled = true;
        try {
          await api.patch("/v1/me", { displayName: given });
          ctx.user.displayName = given;
          named = true;
        } catch (err) {
          e.target.disabled = false;
          status.textContent = plainly(err, "Your name");
          return;
        }
      }
      await next({ step: "connect", answers: { makes: [...picked] } });
    })),
  ];
}

/* What GET /v1/me/sources says about each work source, by its kind (youtube, podcast, substack, tiktok, instagram); null when it could not be read. */
let sources = null;
/* Whether the server can rate a public channel from its handle (GET /v1/me/welcome says); an older server that does not say is taken at its word as able. */
let canRate = true;
/** Whether Orbe can connect a source here: on when the list could not be read, so a slow server hides nothing. */
const ready = (kind) => {
  if (!sources) return true;
  const s = sources.get(kind);
  return !!s && (s.availability === "ready" || s.state !== "not_connected");
};

/** The kinds of work Orbe can connect on this server. */
const CONNECTS = ["youtube", "podcast", "newsletter", "tiktok", "instagram"];
const canConnect = (k) => shown(k) && ready(k === "newsletter" ? "substack" : k);
/**
  Whether the connect step has anything to offer on this server: a source
  Orbe can connect here, or a public channel to rate. Decided from the server
  alone, before anything is chosen, so the count of steps never changes on
  the way; with nothing at all, the step is left out rather than shown empty.
*/
function connectable() {
  if (on("rating") && canRate) return true;
  return CONNECTS.some(canConnect);
}

/* The steps this walkthrough shows, in order, set as it is drawn, so each step's number counts only those shown. */
let order = [];
const numberOf = (id, n) => (order.includes(id) ? order.indexOf(id) + 1 : n);

function connectStep(w, next, ctx) {
  const chosen = new Set(w.answers.makes?.length ? w.answers.makes : ["youtube"]);
  // Nothing chosen can be connected here, but something else can: offer that, in case they make it too.
  const others = !CONNECTS.some((k) => chosen.has(k) && canConnect(k)) && !(on("rating") && canRate);
  const makes = others ? new Set(CONNECTS.filter(canConnect)) : chosen;
  const status = h("p", { class: "cn-wl-status", role: "status" });
  const ways = [];
  const missing = [];
  const nameOf = (k) => MAKES.find((m) => m[0] === k)?.[4] ?? k;
  /** A platform's own sign-in, coming back to the walkthrough. */
  const signIn = (name, start) => async (e) => {
    e.target.disabled = true;
    status.textContent = "";
    try {
      await put({ step: "rating" });
      await beginSignIn(start, "/orbe-site/demo/app/welcome");
    } catch (err) {
      await put({ step: "connect" }).catch(() => {});
      e.target.disabled = false;
      status.textContent = plainly(err, name);
    }
  };
  if (makes.has("youtube")) {
    if (ready("youtube")) {
      ways.push(h("div", { class: "cn-wl-way" },
        h("div", null, h("p", { class: "cn-wl-way-t" }, "Your YouTube channel"), h("p", { class: "cn-wl-way-d" }, "Read only, through Google. Orbe never posts or changes anything.")),
        button("Continue with YouTube", signIn("YouTube", "/v1/me/connections/youtube_analytics/start"), false),
      ));
    } else missing.push("youtube");
  }
  if (makes.has("podcast") && on("podcasts")) {
    if (ready("podcast")) {
      const feed = h("input", { class: "cn-field-input", type: "url", name: "feedUrl", placeholder: "https://your-host.com/feed.xml", "aria-label": "Your show's RSS feed", inputmode: "url", autocomplete: "url", required: true });
      ways.push(h("form", { class: "cn-wl-way", onsubmit: async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector("button");
        btn.disabled = true;
        status.textContent = "Reading your feed.";
        try {
          const r = await api.post("/v1/me/podcasts", { feedUrl: feed.value.trim() });
          await api.put("/v1/me/podcasts/onboarding", { showId: r.show.showId, step: "host", route: r.setup.host.route });
          status.textContent = `${r.show.title} found. Finish its set-up under Podcasts whenever you like.`;
          await next({ step: "rating" });
        } catch (err) {
          btn.disabled = false;
          status.textContent = plainly(err, "Your show");
        }
      } },
        h("div", null, h("p", { class: "cn-wl-way-t" }, "Your show's feed"), h("p", { class: "cn-wl-way-d" }, "The public RSS address your host gives you. Nothing changes for listeners.")),
        h("div", { class: "cn-wl-inline" }, feed, button("Add", null, false, "submit")),
      ));
    } else missing.push("podcast");
  }
  if (makes.has("newsletter")) {
    if (ready("substack")) {
      ways.push(h("div", { class: "cn-wl-way" },
        h("div", null, h("p", { class: "cn-wl-way-t" }, "Your newsletter"), h("p", { class: "cn-wl-way-d" }, "Your Substack export, guided in six steps. Orbe remembers the publication.")),
        button("Add your Substack", () => openConnect("substack", ctx, { back: "/orbe-site/demo/app/welcome" }), false),
      ));
    } else missing.push("newsletter");
  }
  for (const p of ["tiktok", "instagram"]) {
    if (!makes.has(p) || !shown(p)) continue;
    const name = nameOf(p);
    if (!ready(p)) {
      missing.push(p);
      continue;
    }
    ways.push(h("div", { class: "cn-wl-way" },
      h("div", null, h("p", { class: "cn-wl-way-t" }, `Your ${name} account`), h("p", { class: "cn-wl-way-d" }, `Read only, on ${name}'s own sign-in page. Orbe never posts.`)),
      button(`Continue with ${name}`, signIn(name, p === "tiktok" ? "/v1/me/social/tiktok/start" : "/v1/me/social/instagram/start"), false),
    ));
  }
  // Chosen, with nothing Orbe can connect for it yet: said once, calmly, and never in the way.
  for (const k of ["snapchat", "x", "product"]) if (makes.has(k)) missing.push(k);
  if (others) missing.splice(0, missing.length, ...[...chosen].filter((k) => !canConnect(k)));
  const owned = ways.length;
  if (on("rating") && canRate) {
    const handle = h("input", { class: "cn-field-input", name: "handle", placeholder: "@handle", "aria-label": "Any YouTube channel's handle", autocomplete: "off", required: true, value: w.answers.handle ?? "" });
    ways.push(h("form", { class: "cn-wl-way cn-wl-way--quiet", onsubmit: async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      status.textContent = "";
      // Read it here, so a handle Orbe cannot rate is said on this step rather than after it.
      const r = await api.get(`/v1/rate/youtube/${seg(handle.value.trim())}`).catch((err) => ({ err }));
      btn.disabled = false;
      if (r.err) {
        status.textContent = r.err.code === "rating_unavailable" || r.err.code === "rating_pending_youtube_review" ? "Orbe can't rate public YouTube channels here yet. Carry on, and connect your own channel when it can." : plainly(r.err, "That channel");
        return;
      }
      await next({ step: "rating", answers: { handle: handle.value.trim() } });
    } },
      h("div", null, h("p", { class: "cn-wl-way-t" }, ways.length ? "Or see a rating now" : "See a rating now"), h("p", { class: "cn-wl-way-d" }, "Any YouTube channel, from its public works. No permission needed.")),
      h("div", { class: "cn-wl-inline" }, handle, button("Rate", null, false, "submit")),
    ));
  }
  const later = missing.length
    ? h("p", { class: "cn-wl-later" }, others
        ? `Orbe can't connect ${orList(missing.map(nameOf))} here yet. If you also make one of these, bring it in now; if not, carry on.`
        : `Orbe can't connect ${orList(missing.map(nameOf))} here yet, so there is nothing to do for ${missing.length === 1 ? "it" : "them"} now. Carry on; everything else works without ${missing.length === 1 ? "it" : "them"}.`)
    : null;
  return [
    ...stepHead(numberOf("connect", 2), 3, "Bring in your work", others ? null : owned ? (ways.length > owned ? "Connect what is yours, or paste any handle to see how Orbe rates." : "Connect what is yours. Orbe only reads.") : ways.length ? "Paste any YouTube handle to see how Orbe rates." : null),
    others ? later : null,
    ways.length ? h("div", { class: "cn-wl-ways" }, ways) : null,
    others ? null : later,
    status,
    h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "make" }) }, "Back"), button("Continue", () => next({ step: "rating" }))),
  ];
}

/** The rating to reveal: the creator's own when there is one, else the handle they pasted; null when there is none to show. */
async function firstRating(w) {
  if (!on("rating")) return null;
  const own = await api.get("/v1/me/rating").catch(() => null);
  const rated = (own?.ratings ?? []).find((r) => r.result?.status === "rated");
  if (rated) return { who: rated.handle || "Your channel", result: rated.result, own: true };
  if (!w.answers.handle) return null;
  const r = await api.get(`/v1/rate/youtube/${seg(w.answers.handle)}`).catch(() => null);
  if (r?.result?.status === "rated") return { who: r.account?.handle ?? w.answers.handle, result: r.result, own: false };
  return r?.result?.message ? { who: w.answers.handle, result: null, message: r.result.message } : null;
}

/*
  With nothing of theirs to rate yet (nothing connects on this server, or
  they carried on without), the step still shows what Orbe tells a creator:
  a sample, made up and labelled as one, for the kind of work they make.
  Every figure below is invented; none describes a real creator.
*/
const SAMPLES = {
  youtube: { who: "A sample channel (made up)", sizeBand: "10k to 100k", rating: 1.24, band: "Good", parts: [{ name: "Reach", score: 81 }] },
  podcast: { who: "A sample show (made up)", sizeBand: "5k to 25k", rating: 0.96, band: "Good", parts: [{ name: "Completion", score: 77 }] },
  newsletter: { who: "A sample newsletter (made up)", sizeBand: "1k to 10k", rating: 1.08, band: "Good", parts: [{ name: "Engagement", score: 74 }] },
};
function sampleFor(w) {
  const makes = w.answers.makes ?? [];
  const kind = makes.includes("youtube") || !makes.length ? "youtube" : makes.includes("podcast") ? "podcast" : makes.includes("newsletter") ? "newsletter" : "youtube";
  const x = SAMPLES[kind];
  return { who: x.who, result: { rating: x.rating, band: x.band, sizeBand: x.sizeBand, parts: x.parts }, sample: true };
}

/** The figure counting up to the rating as the grid fills, so the number lands with the last square. Still under reduced motion. */
function countUp(el, to) {
  el.textContent = signed(to);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const start = performance.now();
  const ms = 900;
  const step = (t) => {
    const k = Math.min(1, (t - start) / ms);
    el.textContent = signed(to * (1 - (1 - k) ** 3));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
    else el.textContent = signed(to);
  };
  requestAnimationFrame(step);
}

/** Your place among creators your size: your own rating, the channel you pasted, or a labelled sample. Read before it is drawn, so nothing on it changes after. */
async function ratingStep(w, next) {
  const help = new Set(w.answers.help ?? []);
  const r = (await firstRating(w).catch(() => null)) ?? (on("rating") ? sampleFor(w) : null);
  let reveal = null;
  if (r) {
    const part = r.result?.parts?.find((p) => /reach|downloads|opens/i.test(p.name)) ?? r.result?.parts?.[0];
    // The final figure, unseen, holds the width, so the band beside it never moves while the count runs.
    const figure = h("span");
    const num = h("span", { class: "cn-wl-num" }, h("span", { class: "cn-wl-num-hold" }, r.result ? signed(r.result.rating) : ""), figure);
    if (r.result) countUp(figure, r.result.rating);
    reveal = h("div", { class: `cn-wl-reveal${r.sample ? " cn-wl-reveal--sample" : ""}` },
      h("div", { class: "cn-wl-reveal-grid" }, pixelGrid(part ? part.score + 1 : null, { cls: "is-reveal", label: part ? `${r.who}: better than ${part.score} in 100 creators the same size on ${part.name.toLowerCase()}` : undefined })),
      h("div", { class: "cn-wl-reveal-say" },
        r.sample ? h("p", { class: "cn-wl-sample" }, "Sample") : null,
        ...(r.result
          ? [
              // The figure is read once, whole: the count is for the eye.
              h("p", { class: "cn-wl-figure" }, h("span", { class: "ob-sr" }, `${signed(r.result.rating)}, ${r.result.band}`), h("span", { class: "cn-wl-fig", "aria-hidden": "true" }, num, h("span", { class: "cn-wl-band" }, r.result.band))),
              h("p", { class: "cn-wl-line" }, `${r.who}, against ${r.result.sizeBand} creators the same size. Zero is typical.${part ? ` On ${part.name.toLowerCase()}, ahead of ${part.score} in 100.` : ""}`),
              r.sample ? null : h("p", { class: "cn-label" }, r.result.attribution?.notice ?? "Independently calculated by Orbe"),
            ]
          : [h("p", { class: "cn-wl-line" }, r.message)]),
      ),
    );
  }
  return [
    ...stepHead(numberOf("rating", 3), 3, r?.sample ? "What Orbe will tell you" : reveal ? "Your place among creators your size" : "What do you want help with?", r?.sample ? "How Orbe rates work against creators the same size. Yours takes its place once Orbe can read a channel, a show or a newsletter of yours." : reveal ? null : "Choose all that apply; your home leads with them. Your rating shows there once Orbe can read a channel, a show or a newsletter of yours."),
    reveal,
    reveal ? h("p", { class: "cn-wl-sub" }, "What do you want help with? Choose all that apply.") : null,
    h("div", { class: `cn-wl-choices cn-wl-choices--row${reveal ? "" : " cn-wl-choices--top"}`, role: "group", "aria-label": "What you want help with" }, HELP.map(([k, n, d, g, c]) => choice(n, d, g, c, help.has(k), (yes) => (yes ? help.add(k) : help.delete(k))))),
    h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: order.includes("connect") ? "connect" : "make" }) }, "Back"), button(isLast(w, "rating") ? "Open my Orbe" : "Continue", () => next(onward(w, "rating", { answers: { help: [...help] } })))),
  ];
}

/* ---------------------------------------------------------------- a brand */

const WANTS = [
  ["reads", "Guaranteed reads", "Paid in full only on verified delivery", "products/sponsorships/", "spon"],
  ["discovery", "Find creators", "By their results at their size", "products/rate/", "also"],
  ["rights", "Usage rights", "Who may use what, until when", "products/rights/", "note"],
];

function profileStep(w, next, ctx) {
  const org = h("input", { class: "cn-field-input", name: "org", required: true, maxlength: 120, autocomplete: "organization", placeholder: "Harbour Oats" });
  const cat = h("input", { class: "cn-field-input", name: "category", required: true, maxlength: 40, placeholder: "Breakfast foods" });
  const terms = h("input", { type: "checkbox", name: "acceptTerms", required: true });
  const status = h("p", { class: "cn-wl-status", role: "status" });
  const f = h("form", { class: "cn-wl-form", onsubmit: async (e) => {
    e.preventDefault();
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      if (on("sponsorships")) await api.put("/v1/brand/profile", { org: org.value.trim(), category: cat.value.trim(), acceptTerms: true });
      await api.patch("/v1/buyer/me", { org: org.value.trim() });
      ctx.brandSaved();
      await next({ step: "wants" });
    } catch (err) {
      btn.disabled = false;
      status.textContent = err.message;
    }
  } },
    h("label", { class: "cn-wl-field" }, h("span", null, "Brand"), org),
    on("sponsorships") ? h("label", { class: "cn-wl-field" }, h("span", null, "What you sell"), cat, h("small", null, "One word or two. Creators who exclude it are never shown to you.")) : null,
    on("sponsorships") ? h("details", { class: "cn-wl-terms" }, h("summary", null, "The brand terms"), h("p", null, BRAND_TERMS)) : null,
    on("sponsorships") ? h("label", { class: "cn-wl-check" }, terms, h("span", null, "I accept the brand terms.")) : null,
    status,
    h("div", { class: "cn-wl-actions" }, button("Continue", null, true, "submit")),
  );
  if (!on("sponsorships")) cat.required = false;
  return [...stepHead(1, 2, "Who are you booking for?", "Creators see this when you send an offer."), f];
}

function wantsStep(w, next) {
  const picked = new Set(w.answers.wants ?? []);
  return [
    ...stepHead(2, 2, "What do you want from Orbe?", "Choose all that apply. Your home leads with them."),
    h("div", { class: "cn-wl-choices" }, WANTS.map(([k, n, d, g, c]) => choice(n, d, g, c, picked.has(k), (yes) => (yes ? picked.add(k) : picked.delete(k))))),
    h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "profile" }) }, "Back"), button(isLast(w, "wants") ? "Open Orbe" : "Continue", () => next(onward(w, "wants", { answers: { wants: [...picked] } })))),
  ];
}

/* ---------------------------------------------------------------- a brand's market */

const STARTS = [
  ["brief", "My first brief", "Reads at each creator's price, paid on verified delivery", "products/offer/", "spon"],
  ["category", "Show me my category", "Who sponsors what you sell, with the evidence", "products/diligence/", "rec"],
];

/** Who the brand competes with, and where it starts once in. Shown only with brand intelligence on. */
function marketStep(w, next) {
  const names = [];
  const list = h("ul", { class: "bi-chips" });
  const draw = () => list.replaceChildren(...names.map((n, i) => h("li", { class: "bi-chip" }, h("span", null, n), h("button", { class: "cn-iconbtn", type: "button", "aria-label": `Remove ${n}`, onclick: () => (names.splice(i, 1), draw()) }, icon("close")))));
  const add = h("input", { class: "cn-field-input", name: "competitor", maxlength: 120, autocomplete: "off", placeholder: "A brand you compete with, then Enter" });
  const take = () => {
    const v = add.value.trim();
    if (v && names.length < 10 && !names.some((x) => x.toLowerCase() === v.toLowerCase())) names.push(v);
    add.value = "";
    draw();
  };
  add.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    take();
  });
  let start = w.answers.start ?? (on("reads_checkout") ? "brief" : "category");
  const starts = STARTS.filter(([k]) => k === "category" || on("reads_checkout"));
  const cards = starts.map(([k, n, d, g, c]) => {
    const b = choice(n, d, g, c, start === k, () => {
      start = k;
      cards.forEach((x, i) => x.setAttribute("aria-pressed", String(starts[i][0] === k)));
    }, true);
    return b;
  });
  const status = h("p", { class: "cn-wl-status", role: "status" });
  return [
    ...stepHead(numberOf("market", w.steps.indexOf("market") + 1), w.steps.length, "Who do you compete with?", "Orbe follows their sponsorships across YouTube, podcasts and newsletters, with the public works as evidence."),
    h("div", { class: "cn-wl-form" }, h("label", { class: "cn-wl-field" }, h("span", null, "Competitors"), add, h("small", null, "Up to ten. Any brand, on Orbe or not.")), list),
    starts.length > 1 ? h("p", { class: "cn-wl-sub" }, "Where do you want to start?") : null,
    starts.length > 1 ? h("div", { class: "cn-wl-choices cn-wl-choices--row" }, cards) : null,
    status,
    h("div", { class: "cn-wl-actions" },
      h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "wants" }) }, "Back"),
      button(isLast(w, "market") ? "Open Orbe" : "Continue", async (e) => {
        take();
        e.target.disabled = true;
        try {
          if (names.length) await api.put("/v1/brand/intel/settings", { competitors: names });
          await next(onward(w, "market", { answers: { start } }));
        } catch (err) {
          e.target.disabled = false;
          status.textContent = err.message;
        }
      }),
    ),
  ];
}

/* ---------------------------------------------------------------- more steps */

/*
  The slot for steps that other parts of Orbe add, such as "Invite your team"
  once teams land: register a view for a step id, and add the same id to the
  side's steps on the server (services/welcome.ts). A step the server lists
  with no view here is skipped over, so the two can land in either order.
*/
const EXTRA = { creator: {}, buyer: {} };
/** when, if given, says whether the step shows on this server (a feature that is on); a step it turns away is skipped. */
export function registerStep(side, id, view, when) {
  EXTRA[side][id] = when ? Object.assign((...a) => view(...a), { when }) : view;
}

/* ---------------------------------------------------------------- the team */

const INVITE_ROLES = [["manager", "Manager", "Offers and campaigns; money waits for you"], ["editor", "Editor", "The work itself, no money"], ["viewer", "Viewer", "Reads, changes nothing"]];

/** Inviting the people who work with you: up to three addresses, each with a role. Skippable, and done again any time in Settings. */
function teamStep(w, next) {
  const rows = h("div", { class: "cn-wl-invites" });
  const status = h("p", { class: "cn-wl-status", role: "status" });
  const addRow = (focus) => {
    if (rows.childElementCount >= 3) return;
    const n = rows.childElementCount + 1;
    const email = h("input", { class: "cn-field-input", type: "email", name: `email${n}`, maxlength: 254, autocomplete: "off", placeholder: n === 1 ? "editor@example.com" : "name@example.com", "aria-label": `Email ${n}` });
    const role = h("select", { class: "cn-select-input", name: `role${n}`, "aria-label": `Role ${n}` }, INVITE_ROLES.map(([v, t]) => h("option", { value: v, selected: v === (n === 1 ? "editor" : "manager") }, t)));
    email.addEventListener("input", label);
    rows.append(h("div", { class: "cn-wl-invite" }, h("label", { class: "cn-field" }, icon("mail"), email), h("label", { class: "cn-select" }, role, icon("chevron", { cls: "cn-i--chev" }))));
    more.hidden = rows.childElementCount >= 3;
    if (focus) email.focus();
  };
  const more = h("button", { class: "cn-linkbtn", type: "button", onclick: () => addRow(true) }, icon("plus"), "Add another");
  // One way on: it sends only once an address is given; with none it simply opens Orbe, so no second skip is needed beside "Skip for now".
  const send = button("Open Orbe", null, true, "submit");
  function label() {
    send.textContent = [...rows.querySelectorAll("input")].some((i) => i.value.trim() && i.checkValidity()) ? "Send and open Orbe" : "Open Orbe";
  }
  const f = h("form", { class: "cn-wl-form", onsubmit: async (e) => {
    e.preventDefault();
    const wanted = [...rows.children].map((r) => ({ email: r.querySelector("input").value.trim(), role: r.querySelector("select").value })).filter((x) => x.email);
    if (!wanted.length) return next(onward(w, "team"));
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true;
    status.textContent = "";
    const sent = [];
    for (const x of wanted) {
      try {
        await api.post("/v1/team/invitations", x);
        sent.push(x.email);
      } catch (err) {
        btn.disabled = false;
        status.textContent = `${x.email}: ${err.message}`;
        return;
      }
    }
    toast(sent.length === 1 ? `Invitation sent to ${sent[0]}.` : `${sent.length} invitations sent.`);
    await next(onward(w, "team"));
  } },
    rows,
    more,
    h("ul", { class: "cn-wl-roles" }, INVITE_ROLES.map(([, t, d]) => h("li", null, h("b", null, t), " ", d))),
    status,
    h("div", { class: "cn-wl-actions" }, send),
  );
  addRow(false);
  return [
    ...stepHead(numberOf("team", w.steps.indexOf("team") + 1), w.steps.length, "Who works with you?", "Invite an editor, a manager or anyone who helps. They sign in with their own account, and you decide what each may do."),
    f,
  ];
}

registerStep("creator", "team", teamStep);
registerStep("buyer", "team", teamStep);
registerStep("buyer", "market", marketStep, () => on("brand_intel"));

/* ---------------------------------------------------------------- the screen */

export async function render(main, ctx) {
  document.body.dataset.screen = "welcome";
  const card = h("div", { class: "cn-wl-card" });
  const dots = h("ol", { class: "cn-wl-dots", "aria-hidden": "true" });
  const stage = h("div", { class: "cn-wl" },
    h("header", { class: "cn-wl-top" }, h("a", { class: "cn-mark", href: "/orbe-site/demo/app/", "aria-label": "Orbe" }, lockup()), h("button", { class: "cn-wl-skip", type: "button", onclick: () => finish({ skipped: true }) }, "Skip for now")),
    h("div", { class: "cn-wl-main" }, dots, card),
  );
  main.append(stage);
  paintedSky(stage, { seed: 19 });
  const creator = ctx.user.type === "creator";
  const [{ welcome: first, canRate: rates }, list] = await Promise.all([api.get("/v1/me/welcome"), creator ? api.get("/v1/me/sources").catch(() => null) : null]);
  let w = first;
  canRate = rates !== false;
  sources = list ? new Map((list.groups.find((g) => g.id === "work")?.sources ?? []).map((x) => [x.id.split(":")[0], x])) : null;
  const extra = Object.fromEntries(Object.entries(EXTRA[ctx.user.type]).filter(([, v]) => !v.when || v.when()));
  const views = { ...(creator ? { make: makeStep, connect: connectStep, rating: ratingStep } : { profile: profileStep, wants: wantsStep }), ...extra };

  async function finish(change) {
    w = await put(change);
    window.dispatchEvent(new Event("orbe:welcome-done"));
    // A brand that chose where to start lands there; everyone else on a home already filled in.
    const start = creator || change.skipped ? null : w.answers.start;
    const to = start === "brief" && on("reads_checkout") ? "/orbe-site/demo/app/reads" : start === "category" && on("brand_intel") ? "/orbe-site/demo/app/intelligence" : "/orbe-site/demo/app/";
    // A name given here is the team's name too: a fresh load draws the frame with it.
    if (named) location.replace(to);
    else ctx.go(to, { replace: true });
  }
  async function next(change) {
    if (change.finished) return finish(change);
    w = await put(change);
    await draw();
  }
  let shownStep = null;
  async function draw() {
    // The steps shown: each the server lists with a view here, less connecting when there is nothing to connect.
    order = w.steps.filter((x) => views[x] && (x !== "connect" || connectable()));
    total = order.length;
    const at = order.indexOf(w.step);
    dots.replaceChildren(...order.map((_, i) => h("li", { class: i < at ? "is-done" : i === at ? "is-here" : "" })));
    if (at < 0) {
      // A step listed on the server with no view yet, or with nothing on it: move past it.
      const nextStep = w.steps.slice(w.steps.indexOf(w.step) + 1).find((x) => order.includes(x));
      return nextStep ? next({ step: nextStep }) : finish({ finished: true });
    }
    card.setAttribute("aria-busy", "true");
    const nodes = (await views[w.step](w, next, ctx)).filter(Boolean);
    card.removeAttribute("aria-busy");
    card.classList.remove("is-in");
    card.replaceChildren(...nodes);
    // A new step starts at its top: on a phone the last one was scrolled to its buttons.
    if (shownStep !== w.step) window.scrollTo(0, 0);
    shownStep = w.step;
    requestAnimationFrame(() => card.classList.add("is-in"));
    card.querySelector("[data-title]")?.focus({ preventScroll: true });
    document.title = `Welcome: Orbe`;
  }
  draw();
}
