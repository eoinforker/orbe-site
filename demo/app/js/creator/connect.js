/*
  Connections: every source in one place and one vocabulary.

  Grouped as the creator thinks of them: where the work lives, where the
  money comes from (only for roles that may read money), where Orbe can
  post, files and tools, AI and developers. Each tile says one thing about
  the person (connected as which account, read from public data, needs
  attention with the fix, or not connected) and, separately, whether Orbe
  can connect it here at all. Both come from GET /v1/me/sources; nothing on
  this page works a status out for itself.

  After a platform's sign-in the browser lands here (?connected=1 or
  ?error=). If the person started from another screen, they go straight
  back there (connect-inline.js keeps the place). Otherwise the first read
  shows as a live line until the first rating lands.

  Settings, Connections and the old Integrations section both draw this page.
*/
import { api, can } from "../api.js";
import { drawer, emptyState, section, skeleton } from "../console-ui.js";
import { screenHead } from "../console-ui.js";
import { icon } from "../icons.js";
import { confirmBox, count, day, failure, h, ok, plural, signed, toast, when } from "../ui.js";
import { connectBody, mark, readLine, statePill, takeBack } from "../connect-inline.js";

const RETURNED = {
  denied: "You said no on the platform's screen, so nothing was connected.",
  start_from_orbe: "Start the connection from Orbe, so it is tied to your account. Press Connect below.",
  invalid_request: "The platform sent back an incomplete answer. Try connecting again.",
  invalid_state: "That sign-in link had expired or was started elsewhere. Start again from here.",
};
const NAMES = { youtube_analytics: "YouTube", adsense: "AdSense", patreon: "Patreon", stripe: "Stripe", tiktok: "TikTok", instagram: "Instagram" };

/** What came back from a platform's sign-in, as one line; null when nothing did. */
function returned(q) {
  const source = NAMES[q.get("source") ?? ""] ?? (q.get("connected") && q.get("connected") !== "1" ? q.get("connected").split(",").join(", ") : "The account");
  if (q.get("connected")) return { ok: true, text: `${source} is connected.` };
  const code = q.get("error");
  if (code) return { ok: false, text: RETURNED[code] ?? `${source} was not connected (${code.replaceAll("_", " ")}). Try again, or write to Orbe if it keeps happening.` };
  return null;
}

/* ---------------------------------------------------------------- the first read */

/** A live line from just after connecting until the first rating lands, then the rating and where to look. */
function firstRead(el, { started }) {
  const line = h("p", { class: "cn-conn-progress-t", role: "status", "aria-live": "polite" }, "Reading what you connected.");
  const bar = h("span", { class: "cn-conn-progress-bar" });
  const extra = h("div", { class: "cn-conn-progress-more" });
  el.replaceChildren(h("div", { class: "cn-conn-progress" }, h("span", { class: "cn-conn-progress-track", "aria-hidden": "true" }, bar), line, extra));
  const t0 = started ?? Date.now();
  let timer = 0;
  const tick = async () => {
    let p;
    try {
      p = await api.get("/v1/me/connections/progress");
    } catch (e) {
      line.textContent = e.message;
      return;
    }
    const secs = Math.round((Date.now() - t0) / 1000);
    const reading = p.accounts.filter((a) => a.stage === "reading" || a.stage === "rating");
    const works = p.accounts.reduce((t, a) => t + a.works, 0);
    const oldest = p.accounts.map((a) => a.backfill?.from).filter(Boolean).sort()[0];
    if (!p.accounts.length) {
      line.textContent = "Nothing read yet. Connect a source below to start.";
      bar.style.inlineSize = "0%";
      return;
    }
    if (p.done) {
      bar.style.inlineSize = "100%";
      const rated = p.accounts.filter((a) => a.rating);
      line.textContent = rated.length
        ? `Rated ${rated.map((a) => `${a.account} at ${signed(a.rating.rating)}`).join(", ")} against creators your size. ${plural(works, "work")} read${oldest ? `, back to ${day(oldest)}` : ""}.`
        : `${plural(works, "work")} read. ${p.accounts.find((a) => a.reason)?.reason ?? "Not enough to rate yet."}`;
      extra.replaceChildren(h("a", { class: "cn-btn cn-btn--s", href: "/orbe-site/demo/app/library" }, icon("library"), "See your works"), rated.length ? h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: "/orbe-site/demo/app/" }, "Home") : null);
      return;
    }
    bar.style.inlineSize = `${Math.min(95, 15 + (works / Math.max(works, 200)) * 70)}%`;
    line.textContent = reading.some((a) => a.stage === "rating")
      ? `${plural(works, "work")} read${oldest ? `, back to ${day(oldest)}` : ""}. Rating them against creators your size.`
      : `Reading your works${works ? `: ${plural(works, "work")} so far` : ""}.`;
    if (secs < 120) timer = setTimeout(tick, secs < 10 ? 1000 : 2500);
    else line.textContent += " This is taking longer than usual; it carries on without this page open.";
  };
  tick();
  return () => clearTimeout(timer);
}

/* ---------------------------------------------------------------- one tile */

function facts(s) {
  const bits = [];
  if (s.account) bits.push(h("span", null, h("b", null, s.state === "public" ? "Account " : "Connected as "), s.account));
  const read = readLine(s);
  if (read) bits.push(h("span", null, read));
  if (s.lastReadAt) bits.push(h("span", null, `Last read ${when(s.lastReadAt)}`));
  if (s.nextReadAt) bits.push(h("span", null, `Next read ${day(s.nextReadAt)}`));
  return bits.length ? h("p", { class: "cn-conn-facts" }, bits) : null;
}

function tile(s, { owner, redraw, openSheet }) {
  const buttons = [];
  if (owner) {
    const ready = s.availability === "ready" || s.state !== "not_connected";
    if (s.id === "tool:webhooks" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => import("../integrations.js").then((m) => m.webhooksDrawer(owner)) }, icon("bolt"), "Webhooks"));
    else if (s.id === "tool:exports" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => import("../integrations.js").then((m) => m.exportsDrawer()) }, icon("doc"), "Export"));
    else if (s.id === "tool:notion" && s.state === "connected") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => import("../integrations.js").then((m) => m.notionDrawer()) }, "Send to Notion"));
    else if (s.state === "attention" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => openSheet(s) }, icon("plug"), `Reconnect ${s.name}`));
    else if (s.state === "public" && s.availability === "ready") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => openSheet(s) }, icon("plug"), "Connect to verify"));
    else if (s.state === "not_connected" && ready && s.connect.kind !== "none") buttons.push(h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => openSheet(s) }, icon("plug"), "Connect"));
    else if (s.state === "connected" && s.connect.kind === "substack") buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => openSheet(s) }, "Upload a newer export"));
    if (s.refresh && s.state !== "not_connected") buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: (e) => readAgain(s, e.currentTarget, redraw) }, "Read again"));
    if (s.connect.kind === "page" && s.id.startsWith("podcast:")) buttons.push(h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: s.connect.href }, "Manage the show"));
    if (s.disconnect) buttons.push(h("button", { class: "cn-btn cn-btn--s cn-btn--ghost cn-conn-off", type: "button", onclick: () => disconnect(s, redraw) }, "Disconnect"));
  }
  return h("li", { class: `cn-conn-tile cn-conn-tile--${s.state}`, "data-source": s.id },
    mark(s),
    h("div", { class: "cn-conn-main" },
      h("p", { class: "cn-conn-name" }, s.name, statePill(s)),
      h("p", { class: "cn-conn-line" }, s.line),
      facts(s),
      s.attention ? h("p", { class: "cn-conn-attention" }, icon("status"), h("span", null, h("b", null, s.attention.message), " ", s.attention.fix)) : null,
      s.state !== "connected" && s.availability !== "ready" && s.unavailableLine ? h("p", { class: "cn-conn-unavailable" }, s.unavailableLine) : null,
    ),
    buttons.length ? h("div", { class: "cn-conn-actions" }, buttons) : null,
  );
}

async function readAgain(s, btn, redraw) {
  btn.disabled = true;
  btn.textContent = "Reading";
  try {
    const r = await api.post(s.refresh.path, {});
    toast(r.note ?? `${s.name} read again.`);
    redraw();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Read again";
    toast(e.message);
  }
}

async function disconnect(s, redraw) {
  if (!(await confirmBox(s.disconnect.removes, { title: `Disconnect ${s.name}${s.account ? ` (${s.account})` : ""}?`, yes: "Disconnect", danger: true }))) return;
  try {
    const r = await api.del(s.disconnect.path);
    toast(r?.note ?? `${s.name} disconnected.`);
    redraw();
  } catch (e) {
    toast(e.message);
  }
}

/* ---------------------------------------------------------------- the page */

function summaryLine(sum) {
  const bits = [];
  bits.push(sum.connected ? plural(sum.connected, "source") + " connected" : "Nothing connected yet");
  if (sum.publicOnly) bits.push(`${count(sum.publicOnly)} read from public data`);
  if (sum.works) bits.push(`${plural(sum.works, "work")} read`);
  if (sum.attention) bits.push(`${plural(sum.attention, "needs", "need")} attention`);
  return bits.join(" · ");
}

/**
  A group of sources. Where Orbe posts and the tools hold many Orbe can't
  connect here yet: those fold under one line, so what you can use comes first.
*/
function group(g, draw) {
  const later = g.id === "post" || g.id === "tools" ? g.sources.filter((s) => s.state === "not_connected" && s.availability !== "ready") : [];
  const now = g.sources.filter((s) => !later.includes(s));
  return section({ title: g.name, line: g.line, cls: `cn-conn-group cn-conn-group--${g.id}` },
    now.length ? h("ul", { class: "cn-conn-list" }, now.map(draw)) : null,
    later.length
      ? h("details", { class: "cn-conn-later" },
          h("summary", null, `Not here yet: ${later.map((s) => s.name).join(", ")}`),
          h("ul", { class: "cn-conn-list" }, later.map(draw)))
      : null,
  );
}

const ALIAS = { youtube_analytics: "youtube" };

/** Draws every source into `el`. Exported for Settings, which hosts the same page. */
export async function connections(el, ctx) {
  const owner = can("owner");
  const q = ctx.query ?? new URLSearchParams(location.search);
  const came = returned(q);
  if (came) {
    const back = takeBack();
    if (back && !back.startsWith(location.pathname)) {
      toast(came.text);
      return ctx.go(back, { replace: true });
    }
  }
  const notice = h("div");
  const progress = h("div");
  const body = h("div", { class: "cn-conn" }, skeleton(6));
  el.append(h("div", { class: "ap-stack" }, notice, progress, body));
  if (came) notice.replaceChildren(came.ok ? ok(came.text) : failure({ message: came.text }));
  let stop = () => {};
  const draw = async () => {
    let data;
    try {
      data = await api.get("/v1/me/sources");
    } catch (e) {
      return body.replaceChildren(emptyState("plug", e.message));
    }
    const openSheet = (s) => drawer(`Connect ${s.name}`, (close) => connectBody(s, { back: location.pathname, close, done: () => draw() }));
    body.replaceChildren(...[
      h("p", { class: "cn-conn-summary" }, summaryLine(data.summary)),
      owner ? null : h("p", { class: "cn-readonly-note" }, icon("shield"), h("span", null, "Only the team's owner connects or removes sources. You can see what Orbe reads for this team.")),
      owner && !data.canConnect ? h("p", { class: "cn-conn-consent" }, icon("shield"), h("span", null, "Connecting starts with your consent to read what you connect. Orbe asks for it as you connect your first source.")) : null,
      ...data.groups.map((g) => group(g, (s) => tile(s, { owner, redraw: draw, openSheet }))),
    ].filter(Boolean));
    // ?connect=youtube from any link, or Home's older ?source=youtube_analytics: open that sheet.
    const asked = q.get("connect") ?? (came ? null : q.get("source"));
    const here = asked ? (ALIAS[asked] ?? asked) : null;
    if (here && owner) {
      const s = data.groups.flatMap((g) => g.sources).find((x) => x.id === here || x.id.startsWith(`${here}:`));
      if (s) openSheet(s);
    }
    const reading = data.summary.works === 0 && data.summary.connected + data.summary.publicOnly > 0;
    if (((came?.ok && q.get("source")) || reading) && !progress.childElementCount) stop = firstRead(progress, {});
  };
  await draw();
  return () => stop();
}

export async function render(main, ctx) {
  const head = screenHead(main, "connect", { line: "Everything Orbe reads for you and everything it can post to, with what each one holds. You can stop any of it here." });
  await connections(head, ctx);
}

