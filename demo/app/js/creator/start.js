/*
  Set up your show: the guided start for podcasters. Paste the feed, Orbe
  reads it and names the host, shows how that host gets downloads to Orbe
  (the measurement prefix where the host has a setting for it, the host's own
  export where it does not), proves the show is yours, then shows the first
  rating and what to do next. Every step is saved, so a creator can leave and
  come back to the same place.
*/
import { api, seg } from "../api.js";
import { CONSENTS } from "../terms.js";
import { action, actions, block, chip, check, failure, field, form, h, input, ok, panel, select, signed, title, when } from "../ui.js";
import { screenHead } from "../console-ui.js";

const STEPS = [
  ["feed", "Your feed"],
  ["host", "Your host"],
  ["verify", "Prove it is yours"],
  ["rating", "Your rating"],
  ["next", "What next"],
];

const PREFIX_WORDS = { live: "Live on your newest episodes", partial: "On some episodes", absent: "Not in the feed yet", wrong_show: "Another show's prefix", no_episodes: "No episodes to check" };
const PROOF_WORDS = { podcast_txt: "the code in your feed", prefix: "Orbe's prefix in your feed", owner_email: "the link sent to your feed's owner email" };

const save = (body) => api.put("/v1/me/podcasts/onboarding", body);

/** The steps as a list, the current one marked; finished steps can be opened again. */
function stepper(state, go) {
  const at = STEPS.findIndex(([k]) => k === state.onboarding.step);
  return h(
    "ol",
    { class: "ap-stepper", "aria-label": "Setting up your show" },
    STEPS.map(([key, name], i) => {
      const done = i < at;
      const here = i === at;
      const label = h("span", { class: "ap-stepper-name" }, name);
      const n = h("span", { class: "ap-stepper-n", "aria-hidden": "true" }, String(i + 1));
      return h(
        "li",
        { class: `ap-stepper-step${here ? " is-here" : ""}${done ? " is-done" : ""}`, "aria-current": here ? "step" : null },
        done && state.show ? h("button", { class: "ap-stepper-btn", type: "button", onclick: () => go(key) }, n, label, h("span", { class: "ob-sr" }, ", done: open again")) : h("span", { class: "ap-stepper-btn" }, n, label),
      );
    }),
  );
}

/* ---------- 1. the feed ---------- */

function feedStep(state, go) {
  const others = state.shows.filter((s) => s.showId !== state.show?.showId);
  return panel(
    "Your feed",
    h("p", null, "Paste your show's RSS feed: the public address your host gives you, the one Apple Podcasts and Spotify read. Orbe reads it to find your episodes and your host. Nothing changes for your listeners."),
    form(
      [field("RSS feed", input({ name: "feedUrl", type: "url", required: true, maxlength: 2000, placeholder: "https://", inputmode: "url", autocomplete: "url" }), "In your host's settings, often under Distribution or RSS.")],
      "Read my feed",
      async (d) => {
        const r = await api.post("/v1/me/podcasts", { feedUrl: String(d.get("feedUrl")).trim() });
        await save({ showId: r.show.showId, step: "host", route: r.setup.host.route });
        go();
        return `${r.show.title} found.`;
      },
      { primary: true },
    ),
    others.length
      ? h("div", { class: "ap-stack" }, h("p", { class: "ap-note" }, "Or carry on with a show you added before:"), actions(...others.map((s) => action(s.title, async () => (await save({ showId: s.showId, step: s.verified ? "rating" : "host" }), go(), "Opened.")))))
      : null,
  );
}

/* ---------- 2. the host ---------- */

function prefixCheck(s) {
  const out = h("div", { "aria-live": "polite" }, s.prefix ? h("p", { class: "ap-note" }, `Last check ${when(s.prefix.checkedAt)}: ${PREFIX_WORDS[s.prefix.status] ?? s.prefix.status}.`) : null);
  return h(
    "div",
    { class: "ap-stack" },
    actions(
      action("Check my feed", async () => {
        const r = await api.get(`/v1/me/podcasts/${seg(s.showId)}/prefix`);
        out.replaceChildren(
          h("p", null, chip(PREFIX_WORDS[r.prefix.status] ?? r.prefix.status, r.prefix.status === "live" ? "good" : "warn"), " ", r.prefix.message),
          r.prefix.otherPrefixes?.length ? h("p", { class: "ap-note" }, `Also in your chain: ${r.prefix.otherPrefixes.join(", ")}. Prefixes chain, so they can stay.`) : null,
        );
        return r.prefix.message;
      }),
    ),
    out,
  );
}

function hostStep(state, go) {
  const { show: s, setup } = state;
  if (!setup) return panel("Your host", failure({ message: state.feedError ?? "Orbe could not read your feed just now." }, () => go()));
  const host = setup.host;
  const named = host.detected ? `Your show is hosted on ${host.host}.` : "We could not tell your host from the feed.";
  const route = state.onboarding.route ?? host.route;
  const unconfirmed = host.confirmed ? null : h("p", { class: "ap-note" }, "These steps are our best knowledge of the host's settings, not yet checked against its dashboard. If the menu has moved, search the settings for \"prefix\".");
  const next = actions(action("Next: prove it is yours", async () => (await save({ step: "verify", route }), go(), "Saved."), { primary: true }));
  if (route === "export") {
    const how = state.exports.find((x) => (host.host === "Spotify for Creators" ? x.format === "spotify_for_creators" : x.format === "podcast_host"));
    return panel(
      "Your host",
      h("p", { class: "ap-says" }, named),
      h("p", null, host.route === "export" ? host.why : "You chose to upload your host's own export instead of adding a prefix."),
      h("p", null, "So your figures come from the export your host gives you: you upload it after proving the show is yours, and Orbe labels them as read from your host."),
      how ? h("p", { class: "ap-note" }, `Where to find it: ${how.where} We have not checked this against the dashboard yet.`) : null,
      next,
      host.route === "prefix" ? actions(action("Use the prefix instead", async () => (await save({ route: "prefix" }), go(), "Saved."))) : null,
    );
  }
  return panel(
    "Your host",
    h("p", { class: "ap-says" }, named),
    h("p", null, `${host.why} Orbe's prefix goes in front of your episode files: each download passes through Orbe, is counted under published rules, and goes straight on to your host.`),
    h("ol", { class: "ap-steps" }, setup.steps.steps.map((t) => h("li", null, t))),
    h("p", null, "Your prefix: ", h("code", { class: "ap-code" }, setup.prefix)),
    unconfirmed,
    prefixCheck(s),
    next,
    h("details", { class: "ap-more" }, h("summary", null, "Cannot add a prefix?"), h("p", { class: "ap-note" }, "Upload the episode export your host gives you instead. Orbe will not count downloads itself, but you get a rating from your host's figures."), actions(action("Upload an export instead", async () => (await save({ route: "export" }), go(), "Saved.")))),
  );
}

/* ---------- 3. ownership ---------- */

function verifyStep(state, go) {
  const { show: s, setup } = state;
  const next = actions(action("Next: your rating", async () => (await save({ step: "rating" }), go(), "Saved."), { primary: true }));
  if (s.verified) return panel("Prove it is yours", ok(`Proven yours by ${PROOF_WORDS[s.verified.method] ?? s.verified.method}.`), next);
  if (!setup) return panel("Prove it is yours", failure({ message: state.feedError ?? "Orbe could not read your feed just now." }, () => go()));
  const status = h("div", { "aria-live": "polite" });
  const verify = (method, label) =>
    action(label, async () => {
      if (method === "owner_email") {
        const r = await api.post(`/v1/me/podcasts/${seg(s.showId)}/verify`, { method });
        status.replaceChildren(ok(`A link is on its way to ${r.sentTo}. Open it signed in here; it lasts until ${when(r.expiresAt)}. Then come back to this page.`));
        return "Sent.";
      }
      await api.post(`/v1/me/podcasts/${seg(s.showId)}/verify`, { method });
      await save({ step: "rating" });
      go();
      return "Proven.";
    });
  const route = state.onboarding.route ?? setup.host.route;
  return panel(
    "Prove it is yours",
    h("p", null, "Only the person who controls a feed can change it or read its owner email, so either proves the show is yours. One way is enough."),
    h(
      "ol",
      { class: "ap-steps" },
      h("li", null, "Add this tag to your feed, in your host's custom tags or podcast:txt field, then press the button. Hosts can take a few minutes to update the feed.", h("code", { class: "ap-code" }, setup.txt.tag), actions(verify("podcast_txt", "Check for the tag"))),
      route === "prefix" ? h("li", null, "Or, once Orbe's prefix is on your episodes, use that as the proof.", actions(verify("prefix", "Check for the prefix"))) : null,
      h("li", null, setup.ownerEmail ? `Or have a one-time link sent to the owner email in your feed (${setup.ownerEmail}).` : "Your feed shows no owner email, so this way is closed.", setup.ownerEmail ? actions(verify("owner_email", "Email the owner")) : null),
    ),
    status,
  );
}

/* ---------- 4. the rating ---------- */

function consentForm(state, go) {
  const missing = ["connect", "rate_public"].filter((k) => !state.consents[k]);
  if (!missing.length) return null;
  return panel(
    "Your say first",
    h("p", null, "Orbe keeps nothing about your show without these. You can revoke either at any time from Record, and what it covers goes with it."),
    form(
      missing.map((k) => check(`${CONSENTS[k].name}. ${CONSENTS[k].grants}`, { name: k, required: true })),
      "Agree and carry on",
      async () => {
        for (const scope of missing) await api.post("/v1/me/consents", { scope });
        go();
        return "Saved.";
      },
    ),
  );
}

function followersForm(s, go) {
  return panel(
    "Your followers",
    h("p", null, "Feeds do not carry a follower count, and Orbe compares your show with shows the same size. Add the followers your apps show you; your show's page says the figure is declared by you."),
    form(
      [field("Followers", input({ name: "followers", type: "number", min: "1", max: "50000000", step: "1", required: true, inputmode: "numeric", value: s.followers ? String(s.followers) : null }), "Apple Podcasts Connect and Spotify for Creators each show a follower count. Add them together, or use the larger.")],
      "Save followers",
      async (d) => {
        await api.put(`/v1/me/podcasts/${seg(s.showId)}/followers`, { followers: Number(d.get("followers")) });
        go();
        return "Saved.";
      },
    ),
  );
}

function exportForm(state, go, label) {
  const s = state.show;
  const out = h("div", { "aria-live": "polite" });
  return h(
    "div",
    { class: "ap-stack" },
    form(
      [
        field("Export file (CSV)", input({ name: "file", type: "file", accept: ".csv,text/csv", required: true }), "Up to 5 MB. Orbe reads each episode's first 7 and 30 days and matches it to your feed by title and date."),
        field("Kind of export", select([["", "Work it out from the file"], ...state.exports.map((x) => [x.format, x.label])], { name: "format" })),
      ],
      label,
      async (d, f) => {
        const file = d.get("file");
        if (!(file instanceof File) || !file.size) throw new Error("Choose the CSV file first.");
        if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB.");
        const body = { content: await file.text(), filename: file.name };
        const format = String(d.get("format") ?? "");
        if (format) body.format = format;
        const r = await api.post(`/v1/me/podcasts/${seg(s.showId)}/export`, body);
        f.reset();
        out.replaceChildren(
          ok(`${r.summary.label} export read: ${r.summary.matched} episode${r.summary.matched === 1 ? "" : "s"} matched.`),
          r.summary.warnings.length ? h("ul", { class: "ap-plain" }, r.summary.warnings.map((w) => h("li", null, w))) : null,
        );
        go();
        return "Uploaded.";
      },
      { primary: true },
    ),
    out,
  );
}

function ratingView(state) {
  const r = state.rating;
  if (!r || !r.result) return null;
  const res = r.result;
  if (res.status !== "rated") return h("div", { class: "ap-stack" }, h("p", { class: "ap-says" }, "Not rated yet."), h("p", null, res.message));
  const parts = res.parts.map((p) => h("li", { class: "ap-part" }, h("span", { class: "ap-part-name" }, p.name), h("span", { class: "ap-part-value" }, p.value), h("span", { class: "ap-part-score" }, `better than ${p.score} in 100 shows your size`)));
  return h(
    "div",
    { class: "ap-stack" },
    h("div", { class: "ap-rating" }, h("p", { class: "ap-figure", "aria-label": `Rating ${signed(res.rating)}` }, signed(res.rating)), h("div", null, chip(res.band), h("p", { class: "ap-note" }, `Against shows your size (${res.sizeBand} followers), where zero is typical.`))),
    h("ul", { class: "ap-parts" }, parts),
    r.explanation ? h("p", null, r.explanation) : null,
    h("p", { class: "ap-label" }, r.notice),
  );
}

function ratingStep(state, go) {
  const s = state.show;
  const route = state.onboarding.route ?? state.setup?.host.route ?? "prefix";
  const next = actions(action("Next: what to do with it", async () => (await save({ step: "next" }), go(), "Saved."), { primary: !!state.rating?.result }));
  const consent = consentForm(state, go);
  if (consent) return consent;
  if (state.ratingWaits === "verify") return panel("Your rating", h("p", null, "Prove the show is yours first: the rating is worked out from figures only its owner can give Orbe."), actions(action("Back to proving it", async () => (await save({ step: "verify" }), go(), "Saved."))));
  if (state.ratingWaits === "followers" || !s.followers) return followersForm(s, go);
  const rated = state.rating?.result?.status === "rated";
  const measured = state.measured?.days ?? 0;
  const figures =
    route === "export"
      ? panel(rated ? "Upload a newer export" : "Your host's figures", rated ? null : h("p", null, "Upload the episode export your host gives you. Orbe reads it, labels the figures as read from your host, and rates the show at once."), exportForm(state, go, rated ? "Upload again" : "Upload and rate"))
      : panel(
          "Measured by Orbe",
          h("p", null, measured ? `Orbe has counted ${measured} day${measured === 1 ? "" : "s"} of downloads through your prefix so far.` : "Orbe starts counting the day your prefix is live in the feed."),
          h("p", { class: "ap-note" }, rated ? "Orbe rates the show again as each new episode's first week is counted." : "Your measured rating appears once three episodes each have a full first week counted. Orbe rates it then without you doing anything."),
          rated ? null : h("details", { class: "ap-more" }, h("summary", null, "A rating today, from your host's export"), h("p", { class: "ap-note" }, "Upload the episode export from your host and Orbe rates the show now, labelling those figures as read from your host. Measured figures take over episode by episode as they arrive."), exportForm(state, go, "Upload and rate")),
        );
  return h("div", { class: "ap-stack" }, panel("Your rating", ratingView(state) ?? h("p", null, "Your show is not rated yet. The figures below are how it will be."), next), figures);
}

/* ---------- 5. what next ---------- */

function nextStep(state, go, ctx) {
  const s = state.show;
  const page = state.page;
  const pagePanel = page?.published
    ? panel(
        "Your show's page",
        ok("Your show's page is public."),
        h("p", null, h("a", { class: "ob-lnk", href: page.url }, "Open your show's page")),
        h("p", { class: "ap-note" }, "Brands can book a guaranteed read from it, and other podcasters can rate their own show. Take it down at any time; it is gone at once."),
        actions(action("Take the page down", async () => (await api.del(`/v1/me/podcasts/${seg(s.showId)}/page`), go(), "Taken down."), { danger: true, confirm: "Take your show's public page down?" })),
      )
    : panel(
        "Publish your show's page",
        h("p", null, "A public page with your show's name, art, rating against shows its size, recent episodes rated and a share card. Download figures stay private."),
        form(
          state.consents.verified_profile ? [] : [check(`${CONSENTS.verified_profile.name}. ${CONSENTS.verified_profile.grants}`, { name: "verified_profile", required: true })],
          "Publish the page",
          async () => {
            if (!state.consents.verified_profile) await api.post("/v1/me/consents", { scope: "verified_profile" });
            await api.post(`/v1/me/podcasts/${seg(s.showId)}/page`, {});
            go();
            return "Published.";
          },
          { primary: true },
        ),
      );
  const sponsor = panel(
    "Sponsorships",
    state.sponsorships.optedIn
      ? h("p", null, "You take sponsorships through Orbe. Set your price for a host-read spot under Sponsorships.")
      : h("p", null, "Opt in and brands can book host-read spots with a guaranteed number of downloads, checked against your own figures. You set the price and say yes to each offer."),
    h("p", null, h("a", { class: "ob-lnk", href: "/orbe-site/demo/app/sponsorships" }, state.sponsorships.optedIn ? "Open Sponsorships" : "Opt in to sponsorships")),
  );
  return h(
    "div",
    { class: "ap-stack" },
    pagePanel,
    sponsor,
    actions(
      action(
        "Finish",
        async () => {
          await save({ finished: true });
          ctx.go("/orbe-site/demo/app/");
          return "Done.";
        },
        { primary: true },
      ),
    ),
  );
}

export async function render(main, ctx) {
  const body = h("div", { class: "ap-stack" });
  screenHead(main, "podcasts", { title: "Podcasts", line: "Set up your show in five short steps: free measurement, a page for your show, and a rating against shows your size. Orbe saves each step, so you can leave and come back.", tags: [["Free, for good", "sky"]] }).append(body);
  const go = async (step) => {
    if (step) await save({ step });
    await draw();
  };
  const draw = () =>
    block(
      body,
      () => api.get("/v1/me/podcasts/onboarding"),
      (state) => {
        const step = state.show ? state.onboarding.step : "feed";
        const view = { feed: feedStep, host: hostStep, verify: verifyStep, rating: ratingStep, next: nextStep }[step] ?? feedStep;
        const shown = { ...state, onboarding: { ...state.onboarding, step } };
        return [
          stepper(shown, go),
          state.show ? h("p", { class: "ap-note" }, "Show: ", h("strong", null, state.show.title), state.show.verified ? [" ", chip("Proven", "good")] : null) : null,
          view(shown, go, ctx),
          state.onboarding.finishedAt || state.show ? null : h("div", { class: "ap-bar" }, h("p", { class: "ap-note" }, "Not a podcaster? Connect a channel, newsletter or money source instead."), actions(action("Skip this", async () => (await save({ finished: true }), ctx.go("/orbe-site/demo/app/settings/connections"), "Skipped.")))),
        ];
      },
      { loadingText: "Loading your show." },
    );
  await draw();
}
