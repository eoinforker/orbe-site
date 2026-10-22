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
import { lockup, portal } from "./shell.js";
import { BRAND_TERMS } from "./terms.js";
import { failure, h, signed, toast } from "./ui.js";

/** Moving on from a step: to the server's next step when there is one (an added step such as a team invite), else finished. */
const onward = (w, from, change = {}) => {
  const after = w.steps[w.steps.indexOf(from) + 1];
  return after ? { ...change, step: after } : { ...change, finished: true };
};

const isLast = (w, step) => w.steps.indexOf(step) === w.steps.length - 1;

const put = (body) => api.put("/v1/me/welcome", body).then((r) => r.welcome);

/** A choice card: a tile, a name and a line, pressed or not. */
function choice(name, line, glyph, k, pressed, onToggle) {
  const b = h("button", { class: "cn-wl-choice", type: "button", "aria-pressed": String(pressed) }, tile(glyph, k, h), h("span", { class: "cn-wl-choice-t" }, name), h("span", { class: "cn-wl-choice-d" }, line), h("span", { class: "cn-wl-tick", "aria-hidden": "true" }, icon("check")));
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

const MAKES = [
  ["youtube", "YouTube", "Videos and Shorts", "products/rate/", "also"],
  ["podcast", "A podcast", "Audio or video episodes", "products/podcasts/", "pod"],
  ["newsletter", "A newsletter", "Posts to subscribers", "products/diligence/", "rec"],
  ["tiktok", "TikTok", "Short videos. Read for sponsorships; not rated yet", "products/roster/", "note"],
  ["instagram", "Instagram", "A professional account. Read for sponsorships; not rated yet", "teams/", "note"],
];
/* Short-form appears only where the server reads it. */
const shown = (k) => (k === "podcast" ? on("podcasts") : k === "tiktok" ? on("tiktok") : k === "instagram" ? on("instagram") : true);
const HELP = [
  ["grow", "Grow", "Know what works against creators your size", "products/rate/", "also"],
  ["earn", "Earn", "Fair prices, and sponsor reads paid on delivery", "products/sponsorships/", "spon"],
  ["protect", "Protect", "Find copies of your work", "products/protect/", "rec"],
];

function makeStep(w, next) {
  const picked = new Set(w.answers.makes ?? []);
  return [
    ...stepHead(1, 3, "What do you make?", "Choose all that apply. Orbe rates each against creators the same size."),
    h("div", { class: "cn-wl-choices" }, MAKES.filter(([k]) => shown(k)).map(([k, n, d, g, c]) => choice(n, d, g, c, picked.has(k), (yes) => (yes ? picked.add(k) : picked.delete(k))))),
    h("div", { class: "cn-wl-actions" }, button("Continue", () => next({ step: "connect", answers: { makes: [...picked] } }))),
  ];
}

function connectStep(w, next, ctx) {
  const makes = new Set(w.answers.makes?.length ? w.answers.makes : ["youtube"]);
  const status = h("p", { class: "cn-wl-status", role: "status" });
  const ways = [];
  if (makes.has("youtube")) {
    ways.push(h("div", { class: "cn-wl-way" },
      h("div", null, h("p", { class: "cn-wl-way-t" }, "Your YouTube channel"), h("p", { class: "cn-wl-way-d" }, "Read only, through Google. Orbe never posts or changes anything.")),
      button("Continue with YouTube", async (e) => {
        e.target.disabled = true;
        try {
          await put({ step: "rating" });
          await beginSignIn("/v1/me/connections/youtube_analytics/start", "/orbe-site/demo/app/welcome");
        } catch (err) {
          e.target.disabled = false;
          status.textContent = err.message;
        }
      }, false),
    ));
  }
  if (makes.has("podcast") && on("podcasts")) {
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
        status.textContent = err.message;
      }
    } },
      h("div", null, h("p", { class: "cn-wl-way-t" }, "Your show's feed"), h("p", { class: "cn-wl-way-d" }, "The public RSS address your host gives you. Nothing changes for listeners.")),
      h("div", { class: "cn-wl-inline" }, feed, button("Add", null, false, "submit")),
    ));
  }
  if (makes.has("newsletter")) {
    ways.push(h("div", { class: "cn-wl-way" },
      h("div", null, h("p", { class: "cn-wl-way-t" }, "Your newsletter"), h("p", { class: "cn-wl-way-d" }, "Your Substack export, guided in six steps. Orbe remembers the publication.")),
      button("Add your Substack", () => openConnect("substack", ctx, { back: "/orbe-site/demo/app/welcome" }), false),
    ));
  }
  for (const p of ["tiktok", "instagram"]) {
    if (!makes.has(p) || !shown(p)) continue;
    const name = p === "tiktok" ? "TikTok" : "Instagram";
    ways.push(h("div", { class: "cn-wl-way" },
      h("div", null, h("p", { class: "cn-wl-way-t" }, `Your ${name} account`), h("p", { class: "cn-wl-way-d" }, `Read only, on ${name}'s own sign-in page. Orbe never posts.`)),
      button(`Continue with ${name}`, async (e) => {
        e.target.disabled = true;
        try {
          await put({ step: "rating" });
          await beginSignIn(p === "tiktok" ? "/v1/me/social/tiktok/start" : "/v1/me/social/instagram/start", "/orbe-site/demo/app/welcome");
        } catch (err) {
          e.target.disabled = false;
          status.textContent = err.message;
        }
      }, false),
    ));
  }
  if (on("rating")) {
    const handle = h("input", { class: "cn-field-input", name: "handle", placeholder: "@handle", "aria-label": "Any YouTube channel's handle", autocomplete: "off", required: true, value: w.answers.handle ?? "" });
    ways.push(h("form", { class: "cn-wl-way cn-wl-way--quiet", onsubmit: async (e) => {
      e.preventDefault();
      await next({ step: "rating", answers: { handle: handle.value.trim() } });
    } },
      h("div", null, h("p", { class: "cn-wl-way-t" }, "Or see a rating now"), h("p", { class: "cn-wl-way-d" }, "Any YouTube channel, from its public works. No permission needed.")),
      h("div", { class: "cn-wl-inline" }, handle, button("Rate", null, false, "submit")),
    ));
  }
  return [
    ...stepHead(2, 3, "Bring in your work", "Connect what is yours, or paste any handle to see how Orbe rates."),
    h("div", { class: "cn-wl-ways" }, ways),
    status,
    h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "make" }) }, "Back"), button("Continue", () => next({ step: "rating" }))),
  ];
}

/** The rating to reveal: the creator's own when there is one, else the handle they pasted. */
async function firstRating(w) {
  if (on("rating")) {
    const own = await api.get("/v1/me/rating").catch(() => null);
    const rated = (own?.ratings ?? []).find((r) => r.result?.status === "rated");
    if (rated) return { who: rated.handle || "Your channel", result: rated.result, own: true };
  }
  if (w.answers.handle && on("rating")) {
    const r = await api.get(`/v1/rate/youtube/${seg(w.answers.handle)}`);
    if (r.result?.status === "rated") return { who: r.account?.handle ?? w.answers.handle, result: r.result, own: false };
    return { who: w.answers.handle, result: null, message: r.result?.message };
  }
  return null;
}

function ratingStep(w, next) {
  const help = new Set(w.answers.help ?? []);
  const reveal = h("div", { class: "cn-wl-reveal", "aria-live": "polite" }, h("div", { class: "cn-wl-reveal-grid" }, pixelGrid(null)), h("div", { class: "cn-wl-reveal-say" }, pill("running", "Working it out")));
  firstRating(w).then((r) => {
    const part = r?.result?.parts?.find((p) => /reach|downloads|opens/i.test(p.name)) ?? r?.result?.parts?.[0];
    const grid = pixelGrid(part ? part.score + 1 : null, { cls: "is-reveal", label: part ? `${r.who}: better than ${part.score} in 100 creators the same size on ${part.name.toLowerCase()}` : undefined });
    reveal.firstChild.replaceChildren(grid);
    reveal.lastChild.replaceChildren(
      ...(r?.result
        ? [
            h("p", { class: "cn-wl-figure" }, signed(r.result.rating), h("span", null, r.result.band)),
            h("p", { class: "cn-wl-line" }, `${r.who}, against ${r.result.sizeBand} creators the same size. Zero is typical.${part ? ` On ${part.name.toLowerCase()}, ahead of ${part.score} in 100.` : ""}`),
            h("p", { class: "cn-label" }, r.result.attribution?.notice ?? "Independently calculated by Orbe"),
          ]
        : [h("p", { class: "cn-wl-line" }, r?.message ?? "Your place shows here once Orbe can read a channel, a show or a newsletter of yours. Connect one from your home whenever you are ready.")]),
    );
  }, (e) => reveal.lastChild.replaceChildren(failure(e)));
  return [
    ...stepHead(3, 3, "Your place among creators your size", null),
    reveal,
    h("p", { class: "cn-wl-sub" }, "What do you want help with first?"),
    h("div", { class: "cn-wl-choices cn-wl-choices--row" }, HELP.map(([k, n, d, g, c]) => choice(n, d, g, c, help.has(k), (yes) => (yes ? help.add(k) : help.delete(k))))),
    h("div", { class: "cn-wl-actions" }, h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next({ step: "connect" }) }, "Back"), button(isLast(w, "rating") ? "Open my Orbe" : "Continue", () => next(onward(w, "rating", { answers: { help: [...help] } })))),
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
    });
    return b;
  });
  const status = h("p", { class: "cn-wl-status", role: "status" });
  return [
    ...stepHead(w.steps.indexOf("market") + 1, w.steps.length, "Who do you compete with?", "Orbe follows their sponsorships across YouTube, podcasts and newsletters, with the public works as evidence."),
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
    const email = h("input", { class: "cn-field-input", type: "email", name: `email${n}`, autocomplete: "off", placeholder: n === 1 ? "editor@example.com" : "name@example.com", "aria-label": `Email ${n}` });
    const role = h("select", { class: "cn-select-input", name: `role${n}`, "aria-label": `Role ${n}` }, INVITE_ROLES.map(([v, t]) => h("option", { value: v, selected: v === (n === 1 ? "editor" : "manager") }, t)));
    rows.append(h("div", { class: "cn-wl-invite" }, h("label", { class: "cn-field" }, icon("mail"), email), h("label", { class: "cn-select" }, role, icon("chevron", { cls: "cn-i--chev" }))));
    more.hidden = rows.childElementCount >= 3;
    if (focus) email.focus();
  };
  const more = h("button", { class: "cn-linkbtn", type: "button", onclick: () => addRow(true) }, icon("plus"), "Add another");
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
    h("div", { class: "cn-wl-actions" },
      h("button", { class: "cn-btn cn-btn--ghost", type: "button", onclick: () => next(onward(w, "team")) }, "Not now"),
      button("Send and open Orbe", null, true, "submit"),
    ),
  );
  addRow(false);
  return [
    ...stepHead(w.steps.indexOf("team") + 1, w.steps.length, "Who works with you?", "Invite an editor, a manager or anyone who helps. They sign in with their own account, and you decide what each may do."),
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
  let w = (await api.get("/v1/me/welcome")).welcome;
  const creator = ctx.user.type === "creator";
  const extra = Object.fromEntries(Object.entries(EXTRA[ctx.user.type]).filter(([, v]) => !v.when || v.when()));
  const views = { ...(creator ? { make: makeStep, connect: connectStep, rating: ratingStep } : { profile: profileStep, wants: wantsStep }), ...extra };

  async function finish(change) {
    w = await put(change);
    window.dispatchEvent(new Event("orbe:welcome-done"));
    // A brand that chose where to start lands there; everyone else on a home already filled in.
    const start = creator || change.skipped ? null : w.answers.start;
    ctx.go(start === "brief" && on("reads_checkout") ? "/orbe-site/demo/app/reads" : start === "category" && on("brand_intel") ? "/orbe-site/demo/app/intelligence" : "/orbe-site/demo/app/", { replace: true });
  }
  async function next(change) {
    if (change.finished) return finish(change);
    w = await put(change);
    draw();
  }
  function draw() {
    const at = w.steps.indexOf(w.step);
    dots.replaceChildren(...w.steps.map((_, i) => h("li", { class: i < at ? "is-done" : i === at ? "is-here" : "" })));
    total = w.steps.filter((x) => views[x]).length;
    const view = views[w.step];
    if (!view) {
      // A step listed on the server with no view yet: move past it.
      const nextStep = w.steps.slice(at + 1).find((x) => views[x]);
      return nextStep ? next({ step: nextStep }) : finish({ finished: true });
    }
    card.classList.remove("is-in");
    card.replaceChildren(...view(w, next, ctx).filter(Boolean));
    // The last step carries the Portal, turning slowly: the way in is nearly done.
    if (w.steps.filter((x) => views[x]).at(-1) === w.step) card.prepend(h("span", { class: "cn-wl-portal", "aria-hidden": "true" }, portal("")));
    requestAnimationFrame(() => card.classList.add("is-in"));
    card.querySelector("[data-title]")?.focus({ preventScroll: true });
    document.title = `Welcome: Orbe`;
  }
  draw();
}
