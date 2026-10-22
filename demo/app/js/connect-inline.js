/*
  Connecting, wherever the need is. One sheet for every source on the
  Connections page, usable from any screen (the Library's empty state, a
  work's Viewers tab, the walkthrough, Deals):

    import { openConnect } from "./connect-inline.js";
    openConnect("youtube", ctx);          // a source id, or the first one starting with it

  A platform sign-in is three steps from any of them: press Continue, allow
  read access on the platform's own page, land back where you were. The
  place to come back to is kept for this tab only (sessionStorage) and is
  spent by the Connections page the platform returns to.

  Nothing here decides a status: the sheet draws what GET /v1/me/sources
  says about the source, and offers no button where Orbe cannot connect it.
*/
import { api, can, on } from "./api.js";
import { drawer, pill } from "./console-ui.js";
import { icon } from "./icons.js";
import { confirmBox, count, day, field, form, h, input, plural, toast } from "./ui.js";
import { CONSENTS } from "./terms.js";

const BACK = "orbe.connect.back";
const BACK_FOR_MS = 15 * 60_000;

/** Keeps the place to come back to after a platform's sign-in. */
export function rememberBack(path) {
  try {
    sessionStorage.setItem(BACK, JSON.stringify({ path, at: Date.now() }));
  } catch (e) {}
}

/** The place to come back to, once: null when there is none or it is stale. */
export function takeBack() {
  try {
    const raw = sessionStorage.getItem(BACK);
    sessionStorage.removeItem(BACK);
    const v = raw ? JSON.parse(raw) : null;
    return v && Date.now() - v.at < BACK_FOR_MS && typeof v.path === "string" && v.path.startsWith("/orbe-site/demo/app") ? v.path : null;
  } catch (e) {
    return null;
  }
}

/**
  Runs a connecting step; the first time, Orbe needs the creator's consent to
  read what they connect, so it asks once (saying what it allows and what
  withdrawing it removes) and carries on.
*/
export async function withConsent(run) {
  try {
    return await run();
  } catch (e) {
    if (e.code !== "consent_required") throw e;
    const c = CONSENTS.connect;
    if (!(await confirmBox(`${c.grants} You can withdraw it at any time: ${c.revoking}`, { title: "Allow Orbe to read what you connect?", yes: "Allow and continue" }))) throw new Error("Nothing was connected.");
    await api.post("/v1/me/consents", { scope: "connect" });
    return run();
  }
}

/** Starts a platform's sign-in, coming back to `back` (here, by default). */
export async function beginSignIn(start, back = location.pathname + location.search) {
  rememberBack(back);
  const r = await withConsent(() => api.post(start, {}));
  location.assign(r.authorizeUrl ?? r.url);
}

/* ---------------------------------------------------------------- words */

export const STATE = {
  connected: ["done", "Connected"],
  public: ["needs", "Read from public data"],
  attention: ["failed", "Needs attention"],
  not_connected: ["idle", "Not connected"],
};
export const AVAILABLE = {
  approval: ["needs", "Waiting on the platform"],
  unavailable: ["coming", "Not here yet"],
  export: ["coming", "Export only"],
  coming: ["coming", "Coming"],
};

/** The pill for a source: its state once there is one, otherwise whether Orbe can connect it. */
export function statePill(s) {
  if (s.state !== "not_connected" || s.availability === "ready") return pill(...STATE[s.state]);
  return pill(...(AVAILABLE[s.availability] ?? AVAILABLE.coming));
}

const MARK = { youtube: "YT", podcast: "Po", substack: "Su", tiktok: "Tk", instagram: "Ig", stripe: "St", patreon: "Pa", adsense: "Ad", mcp: "AI" };
/** A service's mark, drawn in Orbe's own tile style: no third-party logos. */
export function mark(s) {
  const key = s.id.split(":")[0] === "post" || s.id.split(":")[0] === "tool" ? s.id.split(":")[1] : s.id.split(":")[0];
  const letters = MARK[key] ?? s.name.replace(/[^A-Za-z]/g, "").slice(0, 2);
  return h("span", { class: "cn-conn-mark", "data-group": s.group, "aria-hidden": "true" }, letters);
}

/** "214 works, 2019 to 2026", for what has been read. */
export function readLine(s) {
  const bits = s.items.map((i) => `${count(i.n)} ${i.label}`);
  if (s.backfill) bits.push(`back to ${day(s.backfill.from)}`);
  return bits.join(", ");
}

/* ---------------------------------------------------------------- the sheet */

const steps = (...items) => h("ol", { class: "cn-conn-steps" }, items.map((t) => h("li", null, t)));

function signInBody(s, back, close) {
  const btn = h("button", { class: "cn-btn", type: "button" }, icon("plug"), s.state === "attention" ? `Reconnect ${s.name}` : `Continue to ${s.name}`);
  const status = h("p", { class: "cn-conn-status", role: "status" });
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.textContent = `Opening ${s.name}'s sign-in.`;
    try {
      await beginSignIn(s.connect.start, back);
    } catch (e) {
      btn.disabled = false;
      status.textContent = e.message;
    }
  });
  void close;
  return [
    steps("Press Continue.", `Sign in on ${s.name}'s own page and allow read access. Orbe never sees your password.`, "You come straight back here, and Orbe starts reading."),
    h("div", { class: "cn-conn-go" }, btn),
    status,
  ];
}

function substackBody(s, done) {
  const pub = (s.account ?? "").replace(/^https?:\/\//, "");
  const where = h("a", { href: pub ? `https://${pub.includes(".") ? pub : `${pub}.substack.com`}/publish/settings#exports` : "https://substack.com/sign-in", target: "_blank", rel: "noopener" }, "your Substack dashboard");
  return [
    steps(
      "Type your publication's address below.",
      h("span", null, "Open ", where, " in a new tab."),
      "Go to Settings, then Exports, and press Create new export.",
      "Download it when Substack is ready (it arrives as a .zip).",
      "Open the .zip and find the subscribers file (it ends .csv).",
      "Choose that file here and press Upload.",
    ),
    form(
      [
        field("Publication", input({ name: "publication", required: true, maxlength: 200, placeholder: "yourname.substack.com", value: pub, autocomplete: "url" })),
        field("Subscribers file (CSV)", input({ name: "file", type: "file", accept: ".csv,text/csv", required: true }), "Up to 5 MB. Only the owner can download it, so it proves the publication is yours."),
      ],
      "Upload",
      async (d, f) => {
        const file = d.get("file");
        if (!(file instanceof File) || !file.size) throw new Error("Choose the CSV file first.");
        if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB.");
        const content = await file.text();
        const r = await withConsent(() => api.post("/v1/me/uploads/substack_export", { content, filename: file.name, publication: String(d.get("publication")).trim() }));
        f.reset();
        done(`Substack read: ${r.summary.works ? plural(r.summary.works, "post") : "the export"} on your record.`);
        return "Read.";
      },
    ),
  ];
}

function feedBody(done) {
  return [
    steps("Copy your show's RSS address from your podcast host.", "Paste it here and press Add.", "Prove it is yours under Podcasts, by a tag, Orbe's prefix or an email to the feed's owner."),
    form([field("Feed address", input({ name: "feedUrl", type: "url", required: true, maxlength: 2000, placeholder: "https://", inputmode: "url" }), "The public feed. Nothing changes for listeners.")], "Add", async (d, f) => {
      const r = await api.post("/v1/me/podcasts", { feedUrl: String(d.get("feedUrl")).trim() });
      f.reset();
      done(`${r.show.title} added. Prove it is yours under Podcasts.`);
      return "Added.";
    }),
  ];
}

function stripeKeyBody(done) {
  return [
    steps("In Stripe, open Developers, then API keys.", "Create a restricted key with read access only.", "Paste it here. Orbe refuses a secret key."),
    form([field("Restricted key", input({ name: "key", required: true, pattern: "rk_(live|test)_[A-Za-z0-9]+", autocomplete: "off", spellcheck: "false" }), "Starts rk_live_ or rk_test_.")], "Connect", async (d, f) => {
      const r = await withConsent(() => api.post("/v1/me/connections/stripe/key", { key: String(d.get("key")).trim() }));
      f.reset();
      done(`Stripe connected (${r.connected.sourceAccountId}).`);
      return "Connected.";
    }),
  ];
}

function keyBody(s, done) {
  const controls = s.connect.fields.map((f) => field(f.label, input({ name: f.key, type: f.kind === "secret" ? "password" : f.kind === "url" ? "url" : "text", autocomplete: "off", required: !f.optional }), f.help));
  return [
    form(controls, "Connect", async (d) => {
      const credentials = Object.fromEntries([...d].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
      await api.put(s.connect.path, { credentials });
      done(`${s.name} connected.`);
      return "Connected.";
    }),
    h("p", { class: "cn-item-d" }, "Sealed before it is stored, and used only when you send or export."),
  ];
}

function relayBody(s, done) {
  const btn = h("button", { class: "cn-btn", type: "button" }, icon("external"), "Open the linking page");
  btn.addEventListener("click", async () => {
    try {
      const r = await api.post(s.connect.path, {});
      window.open(r.url, "_blank", "noopener");
      done(r.note);
    } catch (e) {
      toast(e.message);
    }
  });
  return [h("p", null, s.line), h("div", { class: "cn-conn-go" }, btn)];
}

/** The body of the connect sheet for one source. `done` is called with a line to say once something is connected. */
export function connectBody(s, { back, close = () => {}, done = () => {} } = {}) {
  const head = h("div", { class: "cn-conn-sheet-head" }, mark(s), h("div", null, h("p", { class: "cn-item-t" }, s.name, " ", statePill(s)), h("p", { class: "cn-item-d" }, s.line)));
  if (!can("owner")) return [head, h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, "Only the team's owner connects accounts. Ask them to connect it."))];
  if (s.availability !== "ready" && s.state === "not_connected") return [head, h("p", { class: "cn-conn-unavailable" }, s.unavailableLine)];
  const finish = (line) => {
    toast(line);
    close();
    done(line);
  };
  const k = s.connect.kind;
  const body =
    k === "oauth" || k === "integration" ? signInBody(s, back, close)
    : k === "substack" ? substackBody(s, finish)
    : k === "feed" ? feedBody(finish)
    : k === "stripe_key" ? stripeKeyBody(finish)
    : k === "key" ? keyBody(s, finish)
    : k === "relay" && on("relay") ? relayBody(s, finish)
    : k === "page" ? [h("a", { class: "cn-btn", href: s.connect.href }, icon("plug"), "Set it up")]
    : [h("p", { class: "cn-item-d" }, "Nothing to connect: it works as it is.")];
  return [head, ...body];
}

/** Finds a source by id, or the first whose id starts with the given one ("youtube" finds "youtube:acc_1"). */
export const findSource = (groups, id) => groups.flatMap((g) => g.sources).find((s) => s.id === id || s.id.startsWith(`${id}:`) || s.id === `post:${id}` || s.id === `tool:${id}`);

/**
  Opens the connect sheet for a source from any screen, and brings the person
  back to `back` (where they are now, by default) after a platform's sign-in.
*/
export function openConnect(id, ctx, { back, done } = {}) {
  const here = back ?? location.pathname + location.search;
  return drawer("Connect", async (close) => {
    let data;
    try {
      data = await api.get("/v1/me/sources");
    } catch (e) {
      return h("p", null, e.message);
    }
    const s = findSource(data.groups, id);
    if (!s) return [h("p", null, "That can't be connected here."), h("a", { class: "cn-btn cn-btn--ghost", href: "/orbe-site/demo/app/connections" }, "All connections")];
    return [...connectBody(s, { back: here, close, done: (line) => (done ? done(line) : ctx?.reload?.()) }), h("p", { class: "cn-item-d cn-conn-more" }, h("a", { href: "/orbe-site/demo/app/connections" }, "All your connections"))];
  });
}

/** A button that opens the connect sheet, for any screen. */
export const connectButton = (id, label, ctx, opts = {}) =>
  h("button", { class: `cn-btn${opts.ghost ? " cn-btn--ghost" : ""}`, type: "button", onclick: () => openConnect(id, ctx, opts) }, icon("plug"), label);

