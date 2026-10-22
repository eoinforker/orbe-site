/*
  Connect: accounts through each platform's own sign-in (YouTube Analytics,
  AdSense, Patreon, Stripe), a Stripe restricted key, a Substack export, and
  podcasts (register the feed, prove it is yours, check the prefix).
*/
import { api, on, seg } from "../api.js";
import { SOURCES } from "../terms.js";
import { action, actions, block, chip, count, day, empty, failure, field, form, h, input, ok, panel, title, when } from "../ui.js";
import { screenHead } from "../console-ui.js";

const RETURNED = {
  denied: "You said no on the platform's screen, so nothing was connected.",
  start_from_orbe: "Start the connection from Orbe, so it is tied to your account. Press Connect below.",
  invalid_request: "The platform sent back an incomplete answer. Try connecting again.",
};

/* TikTok and Instagram: read only, each behind its own feature. */
const SOCIAL = {
  tiktok: { start: "/v1/me/social/tiktok/start", gone: "/v1/me/social/tiktok", name: "TikTok", what: "Your profile and your recent public videos, read only. Captions are checked for sponsorships; the rating does not cover TikTok yet." },
  instagram: { start: "/v1/me/social/instagram/start", gone: "/v1/me/social/instagram", name: "Instagram", what: "A professional (business or creator) account: profile, posts and their likes and comments, read only." },
};

function socialPanel() {
  const list = h("div");
  const live = [on("tiktok") ? "tiktok" : null, on("instagram") ? "instagram" : null].filter(Boolean);
  const reload = () =>
    block(list, () => api.get("/v1/me/social"), ({ connections }) =>
      h("ul", { class: "ap-list" },
        live.map((p) => {
          const c = connections.find((x) => x.platform === p);
          return h("li", { class: "ap-item" },
            h("div", { class: "ap-item-main" },
              h("p", { class: "ap-says" }, SOCIAL[p].name, " ", c ? chip("Connected", "good") : null),
              h("p", { class: "ap-note" }, c ? `@${c.handle}${c.followers !== null ? `, ${count(c.followers)} followers` : ""}; ${count(c.posts)} posts kept, read ${when(c.readAt ?? c.connectedAt)}.` : SOCIAL[p].what),
            ),
            actions(
              c
                ? action("Disconnect", async () => {
                    const r = await api.del(SOCIAL[p].gone);
                    await reload();
                    return `Disconnected. ${count(r.removed.posts)} posts removed.`;
                  }, { danger: true, confirm: `Disconnect ${SOCIAL[p].name}? Every post Orbe read from it is deleted.` })
                : action(`Connect ${SOCIAL[p].name}`, async () => {
                    const r = await api.post(SOCIAL[p].start, {});
                    window.location.assign(r.authorizeUrl);
                  }),
            ),
          );
        }),
      ),
    );
  reload();
  return panel("Short-form", h("p", null, "Signed in on the platform's own page. Orbe reads only, never posts, and deletes anything not read again within 30 days."), list);
}

function returnedNotice(q) {
  const source = SOURCES[q.get("source") ?? ""]?.name ?? SOCIAL[q.get("source") ?? ""]?.name ?? "The account";
  if (q.get("connected") === "1") return ok(`${source} is connected. Orbe has read it and your record now includes it.`);
  const code = q.get("error");
  if (code) return failure({ message: RETURNED[code] ?? `${source} was not connected (${code.replaceAll("_", " ")}). Try again, or write to Orbe if it keeps happening.` });
  return null;
}

const summaryLine = (s) =>
  [s.claimed ? "Account claimed." : null, s.works ? `${count(s.works)} works read.` : null, s.revenueLines ? `${count(s.revenueLines)} money lines read.` : null, ...(s.warnings ?? [])].filter(Boolean).join(" ") || "Read.";

function connectedList(el) {
  return block(
    el,
    () => api.get("/v1/me/connections"),
    ({ connections }) =>
      connections.length
        ? h(
            "ul",
            { class: "ap-list" },
            connections.map((c) =>
              h(
                "li",
                { class: "ap-item" },
                h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, SOURCES[c.source]?.name ?? c.source), h("p", { class: "ap-note" }, `${c.sourceAccountId ?? "Account"}, connected ${day(c.createdAt)}`)),
                actions(
                  action(
                    "Stop reading",
                    async () => {
                      const r = await api.del(`/v1/me/connections/${seg(c.id)}`);
                      el.before(ok(r.note));
                      await connectedList(el);
                      return "Disconnected.";
                    },
                    { confirm: `Stop reading ${SOURCES[c.source]?.name ?? c.source}?`, danger: true },
                  ),
                ),
              ),
            ),
          )
        : empty("Nothing connected yet."),
  );
}

function oauthPanel(highlight) {
  return panel(
    "Connect through the platform",
    h("p", null, "You sign in on the platform's own page and choose what to share. Orbe reads only; it never posts, moves money or keeps a password."),
    h(
      "ul",
      { class: "ap-list" },
      Object.entries(SOURCES).map(([source, s]) =>
        h(
          "li",
          { class: `ap-item${highlight === source ? " ap-item--here" : ""}` },
          h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, s.name), h("p", { class: "ap-note" }, s.what)),
          actions(
            action(`Connect ${s.name}`, async () => {
              const r = await api.post(`/v1/me/connections/${seg(source)}/start`, {});
              window.location.assign(r.authorizeUrl);
            }),
          ),
        ),
      ),
    ),
    h(
      "details",
      { class: "ap-more" },
      h("summary", null, "Or give Stripe a restricted key"),
      h("p", { class: "ap-note" }, "In Stripe: Developers, API keys, create a restricted key with read access only. Orbe refuses a secret key."),
      form(
        [field("Restricted key", input({ name: "key", required: true, pattern: "rk_(live|test)_[A-Za-z0-9]+", autocomplete: "off", spellcheck: "false" }), "Starts rk_live_ or rk_test_."), field("Stripe account id (optional)", input({ name: "stripeAccountId", pattern: "acct_[A-Za-z0-9]+", autocomplete: "off" }))],
        "Connect with the key",
        async (d, f) => {
          const body = { key: String(d.get("key")).trim() };
          const acct = String(d.get("stripeAccountId") ?? "").trim();
          if (acct) body.stripeAccountId = acct;
          const r = await api.post("/v1/me/connections/stripe/key", body);
          f.reset();
          return `Stripe connected (${r.connected.sourceAccountId}). ${summaryLine(r.summary)}`;
        },
      ),
    ),
  );
}

function substackPanel() {
  return panel(
    "Substack export",
    h("p", null, "Download the subscriber export from your Substack dashboard (Settings, Exports) and upload it here. Only the owner can download it, so it claims the publication. Up to 5 MB."),
    form(
      [field("Publication", input({ name: "publication", required: true, maxlength: 200, placeholder: "yourname.substack.com" })), field("Export file (CSV)", input({ name: "file", type: "file", accept: ".csv,text/csv", required: true }))],
      "Upload",
      async (d, f) => {
        const file = d.get("file");
        if (!(file instanceof File) || !file.size) throw new Error("Choose the CSV file first.");
        if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB.");
        const r = await api.post("/v1/me/uploads/substack_export", { content: await file.text(), filename: file.name, publication: String(d.get("publication")).trim() });
        f.reset();
        return summaryLine(r.summary);
      },
    ),
  );
}

const PREFIX_WORDS = { live: "Live on your newest episodes", partial: "On some episodes", absent: "Not in the feed yet", wrong_show: "Another show's prefix", no_episodes: "No episodes to check" };

function showDetail(show, reload) {
  const box = h("div", { class: "ap-stack" });
  block(
    box,
    () => api.get(`/v1/me/podcasts/${seg(show.showId)}`),
    ({ show: s, setup }) => {
      const status = h("div", { "aria-live": "polite" });
      const verify = (method, label) =>
        action(label, async () => {
          if (method === "owner_email") {
            const r = await api.post(`/v1/me/podcasts/${seg(s.showId)}/verify`, { method });
            status.replaceChildren(ok(`A link is on its way to ${r.sentTo}. Open it signed in here; it lasts until ${when(r.expiresAt)}.`));
            return "Sent.";
          }
          await api.post(`/v1/me/podcasts/${seg(s.showId)}/verify`, { method });
          reload();
          return "Proven.";
        });
      return [
        s.verified
          ? ok(`Proven yours by ${s.verified.method.replaceAll("_", " ")} on ${day(s.verified.at)}.`)
          : h(
              "div",
              { class: "ap-stack" },
              h("p", { class: "ap-says" }, "Prove it is yours, one of three ways."),
              h("ol", { class: "ap-steps" },
                h("li", null, "Add this tag to your feed, in your host's custom tags or podcast:txt field, then press the button.", h("code", { class: "ap-code" }, setup.txt.tag), actions(verify("podcast_txt", "Check for the tag"))),
                h("li", null, "Or put Orbe's prefix on your episodes (below), then press the button.", actions(verify("prefix", "Check for the prefix"))),
                h("li", null, setup.ownerEmail ? `Or have a link sent to the owner email in your feed (${setup.ownerEmail}).` : "Your feed shows no owner email, so this route is closed.", setup.ownerEmail ? actions(verify("owner_email", "Email the owner")) : null),
              ),
              status,
            ),
        h("p", { class: "ap-says" }, "Measure downloads with Orbe's prefix"),
        h("ol", { class: "ap-steps" }, setup.steps.steps.map((t) => h("li", null, t))),
        h("p", null, "Your prefix: ", h("code", { class: "ap-code" }, setup.prefix)),
        prefixBox(s),
        h("p", { class: "ap-note" }, "Smart link once proven: ", h("code", { class: "ap-code" }, setup.smartLink)),
        actions(
          action(
            "Remove this show",
            async () => {
              await api.del(`/v1/me/podcasts/${seg(s.showId)}`);
              reload();
              return "Removed.";
            },
            { danger: true, confirm: `Remove ${s.title} from Orbe?` },
          ),
        ),
      ];
    },
  );
  return box;
}

function prefixBox(s) {
  const out = h("div", { "aria-live": "polite" }, s.prefix ? h("p", { class: "ap-note" }, `Last check ${day(s.prefix.checkedAt)}: ${PREFIX_WORDS[s.prefix.status] ?? s.prefix.status}. ${s.prefix.message}`) : null);
  return h(
    "div",
    null,
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

function podcastsPanel() {
  const list = h("div");
  const reload = () =>
    block(
      list,
      () => api.get("/v1/me/podcasts"),
      ({ shows }) =>
        shows.length
          ? h(
              "ul",
              { class: "ap-list" },
              shows.map((s) => {
                const d = h("details", { class: "ap-more" }, h("summary", null, s.verified ? "Prefix and smart link" : "Prove it is yours"));
                d.addEventListener("toggle", () => d.open && d.childElementCount === 1 && d.append(showDetail(s, reload)), { once: false });
                return h(
                  "li",
                  { class: "ap-item ap-item--block" },
                  h("div", { class: "ap-item-main" }, h("p", { class: "ap-says" }, s.title, " ", s.verified ? chip("Proven", "good") : chip("Not proven yet")), h("p", { class: "ap-note ap-wrap" }, s.feedUrl)),
                  d,
                );
              }),
            )
          : empty("No shows yet. Register your feed below."),
    );
  reload();
  return panel(
    "Podcasts",
    list,
    form([field("Feed address", input({ name: "feedUrl", type: "url", required: true, maxlength: 2000, placeholder: "https://", inputmode: "url" }), "The public RSS feed your host gives you.")], "Register the feed", async (d, f) => {
      const r = await api.post("/v1/me/podcasts", { feedUrl: String(d.get("feedUrl")).trim() });
      f.reset();
      reload();
      return `${r.show.title} is registered. Open it to prove it is yours.`;
    }),
  );
}

export async function render(main, ctx) {
  const connected = h("div");
  screenHead(main, "connect", { line: "Every figure on your record is read at source, with your consent, and you can stop any of it here." }).append(
    h("div", { class: "ap-stack" },
      returnedNotice(ctx.query),
      panel("Connected", connected),
      oauthPanel(ctx.query.get("connect") ?? ctx.query.get("source")),
      substackPanel(),
      on("podcasts") ? podcastsPanel() : null,
      on("tiktok") || on("instagram") ? socialPanel() : null,
    ),
  );
  await connectedList(connected);
}
