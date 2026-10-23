/*
  Runs: ask Orbe to run a tool and keep what it found. The composer docks
  at the foot; each run lands in the feed above as a card with its answer
  and, when shown, its metadata (the tool, the account, the window, how long
  it took). Every run is the server's (POST /v1/runs), from the same
  services the tool's own screen reads, and kept for the team, so the feed is
  the same on every device (GET /v1/runs).
*/
import { api } from "../api.js";
import { ago, cover, pill, rating, serverRuns } from "../console-ui.js";
import { composer, STUDIO_TOOLS, toolsOn, WINDOWS } from "../composer.js";
import { TOOLS, tile } from "../catalogue.js";
import { icon } from "../icons.js";
import { KINDS } from "../terms.js";
import { count, h, money, signed } from "../ui.js";

const toolOf = (id) => STUDIO_TOOLS.find((t) => t.id === id) ?? STUDIO_TOOLS[0];
const META_KEY = "studio-meta";
// Off unless the person switched it on: the tool, account, window and timing are for checking a run, not for reading one.
const metaOn = () => {
  try {
    return localStorage.getItem(`orbe.tab.${META_KEY}`) === "on";
  } catch {
    return false;
  }
};

/* ---------------------------------------------------------------- the runs */

/** Runs one job on the server and returns the kept run as the feed draws it. */
export async function runJob(job) {
  const run = await serverRuns(null).run(job);
  return { id: run.id, at: run.at, job: run.job, out: run.outcome, ms: run.ms };
}

/* ---------------------------------------------------------------- drawing an answer */

function workAnswer({ top, others, note }) {
  const r = top.rating;
  return [
    note ? h("p", null, note) : null,
    h("a", { class: "cn-run-work", href: `/orbe-site/demo/app/works/${encodeURIComponent(top.id)}` },
      h("span", { class: "cn-work-art" }, cover(top.id, top.kind, r ? (r.rating + 1.5) / 3 : 0.3)),
      h("span", { class: "cn-run-work-main" },
        h("span", { class: "cn-run-work-t" }, top.title),
        h("span", { class: "cn-run-work-d" }, `${top.account.handle} · ${ago(top.publishedAt)}${top.reach ? ` · ${count(top.reach.value)} ${top.reach.label}` : ""}`),
        r
          ? h("span", { class: "cn-figure" }, rating(r.rating, { size: "", cls: "cn-figure-n" }), h("span", { class: "cn-figure-k" }, h("b", null, `${r.multiple.toFixed(2)} times your typical`), h("span", null, "Against creators the same size; zero is typical")))
          : h("span", { class: "cn-run-work-d" }, "Not rated yet: too new to compare."),
      ),
    ),
    others.length ? h("ul", { class: "cn-run-list" }, others.map((w) => h("li", null, h("a", { href: `/orbe-site/demo/app/works/${encodeURIComponent(w.id)}` }, w.title), w.rating ? rating(w.rating.rating) : h("span", { class: "cn-muted" }, "New")))) : null,
    r ? h("p", { class: "cn-label" }, r.notice) : null,
  ];
}

function channelAnswer({ account, result: res }) {
  const name = account?.title ?? account?.handle ?? "This channel";
  if (!res || res.status !== "rated") return [h("p", { class: "cn-run-say" }, `${name} is not rated yet.`), h("p", null, res?.message ?? "Not enough public works to compare yet.")];
  return [
    h("p", { class: "cn-run-who" }, name),
    h("div", { class: "cn-figure" }, rating(res.rating, { size: "", tag: "p", cls: "cn-figure-n" }), h("div", { class: "cn-figure-k" }, h("b", null, res.band), h("span", null, `Against YouTube channels with ${res.sizeBand} subscribers`))),
    h("ul", { class: "cn-parts" }, res.parts.map((p) => {
      const bar = h("span", { class: "cn-part-bar" }, h("span"));
      bar.firstChild.style.setProperty("--p", String(p.score));
      return h("li", { class: "cn-part" }, h("span", { class: "cn-part-n" }, p.name), bar, h("span", { class: "cn-part-v" }, `${p.score}/100`));
    })),
    h("p", { class: "cn-label" }, res.attribution?.notice ?? "Independently calculated by Orbe"),
  ];
}

function answer(out) {
  if (!out.ok) return [h("p", { class: "cn-run-say cn-tone--bad" }, out.error?.message ?? "That did not run."), out.error?.requestId ? h("p", { class: "cn-label" }, `Reference ${out.error.requestId}`) : null];
  const d = out.data;
  switch (out.kind) {
    case "none":
      return [h("p", { class: "cn-run-say" }, d.text), h("p", null, "Try another title, a longer window, or all accounts.")];
    case "work":
      return workAnswer(d);
    case "channel":
      return channelAnswer(d);
    case "offer":
      return [
        h("p", { class: "cn-run-who" }, `${money({ amount: d.pence, currency: d.currency })} for ${d.slot}`),
        h("p", { class: `cn-verdict cn-tone--${d.verdict.tone}` }, d.verdict.say),
        h("p", null, d.verdict.why),
      ];
    case "unpriced":
      return [
        h("p", { class: "cn-run-say" }, "Orbe cannot judge this offer yet."),
        h("p", null, "A slot needs enough verified results for Orbe to suggest a range. Here is what each slot is waiting for:"),
        h("ul", { class: "cn-run-list" }, d.items.map((it) => h("li", null, h("span", null, `${it.name}, ${it.handle}`), h("span", { class: "cn-hist-d" }, it.suggestion?.reason ?? "No suggestion yet")))),
      ];
    case "price":
      return d.items.length
        ? [h("ul", { class: "cn-run-list cn-run-list--wide" }, d.items.map((it) => h("li", null, h("span", null, h("b", null, it.name), ` on ${it.handle}`), h("span", { class: "cn-hist-d" }, it.suggestion?.status === "suggested" ? `${money(it.suggestion.low)} to ${money(it.suggestion.high)}` : it.suggestion?.reason ?? "No suggestion yet"))))]
        : [h("p", { class: "cn-run-say" }, "No slot matches.")];
    case "sponsor": {
      // Runs kept before brands were named and grouped carry rows per account; they read the same way.
      const brands = d.brands ?? [...new Map((d.rows ?? []).flatMap((r) => r.brands).filter((b) => b.brandName).map((b) => [b.brandName, { name: b.brandName, line: "" }])).values()];
      const yours = (d.yours ?? []).map((y) => (y.size ? `${y.handle} (${y.size})` : y.handle));
      return [
        brands.length
          ? h("ul", { class: "cn-run-list" }, brands.slice(0, 8).map((b) => h("li", null, h("span", null, b.name), h("span", { class: "cn-hist-d" }, b.line))))
          : h("p", { class: "cn-run-say" }, "No brand has sponsored enough creators your size to show yet."),
        yours.length ? h("p", null, `Compared with: ${yours.join(", ")}.`) : null,
        d.basis ? h("p", null, d.basis) : null,
        d.notice ?? d.rows?.[0]?.notice ? h("p", { class: "cn-label" }, d.notice ?? d.rows[0].notice) : null,
      ];
    }
    case "explain":
      return d.rows.length
        ? d.rows.map((r) => h("div", { class: "cn-run-explain" }, h("p", { class: "cn-run-who" }, `${r.handle} on ${KINDS[r.kind] ?? r.kind}${r.rating === null ? "" : `: ${signed(r.rating)}, ${r.band}`}`), h("p", null, r.explanation), r.explanation.includes(r.notice ?? "\u0000") ? null : h("p", { class: "cn-label" }, r.notice)))
        : [h("p", { class: "cn-run-say" }, "Nothing to explain yet: no account of yours is rated.")];
    default:
      return [];
  }
}

function runCard(entry) {
  const t = toolOf(entry.job.tool);
  const out = entry.out;
  const state = !out ? "running" : out.ok ? "done" : "failed";
  return h("article", { class: "cn-runcard", tabindex: "-1", "aria-label": entry.job.asked || entry.job.text || t.name, "data-tool": t.id, "data-q": `${entry.job.asked ?? ""} ${entry.job.text} ${t.name}`.toLowerCase() },
    h("header", { class: "cn-runcard-head" },
      tile(t.glyph, t.k, h),
      h("div", { class: "cn-runcard-main" }, h("p", { class: "cn-runcard-q" }, entry.job.asked || entry.job.text || t.name), h("p", { class: "cn-runcard-tool" }, entry.job.asked || entry.job.text ? t.name : t.line)),
      pill(state, state === "running" ? "Running" : state === "done" ? "Done" : "Failed"),
    ),
    h("div", { class: "cn-runcard-body" }, out ? answer(out) : h("span", { class: "cn-skel" }, h("span", { class: "cn-skel-line" }), h("span", { class: "cn-skel-line" }), h("span", { class: "cn-skel-line" }))),
    h("footer", { class: "cn-runcard-meta" },
      h("span", null, `tool ${t.id}`),
      h("span", null, `account ${entry.job.account === "all" ? "all" : entry.accountName ?? entry.job.account}`),
      h("span", null, `window ${WINDOWS.find(([k]) => k === entry.job.window)?.[1].toLowerCase() ?? entry.job.window}`),
      entry.ms !== undefined ? h("span", null, `${entry.ms} ms`) : null,
      h("time", { datetime: entry.at }, new Date(entry.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })),
    ),
  );
}

/* Suggestions that answer only from your own works, and the Connections tool that brings them in. */
const NEEDS_WORKS = new Set(["rate-work", "sponsor", "explain"]);
const CONNECT = TOOLS.find((t) => t.id === "connect") ?? { glyph: "products/you/", k: "rec" };

/* ---------------------------------------------------------------- the screen */

export async function render(main, ctx) {
  const me = await api.get("/v1/me");
  const accounts = me.accounts.map((a) => ({ id: a.id, handle: a.handle || a.title, kind: a.kind, platformId: a.platformId }));
  const store = serverRuns(null, 30);
  const named = (e) => ({ ...e, accountName: accounts.find((a) => a.id === e.job.account)?.handle });
  let entries = (await store.list().catch(() => [])).map((r) => named({ id: r.id, at: r.at, job: r.job, out: r.outcome, ms: r.ms }));
  const feed = h("div", { class: "cn-runs", "data-meta": metaOn() ? "on" : "off", "aria-live": "polite" });
  const filterInput = h("input", { class: "cn-field-input", type: "search", placeholder: "Search runs", "aria-label": "Search runs" });
  const toolSel = h("select", { "aria-label": "Filter by tool" }, h("option", { value: "" }, "All tools"), toolsOn().filter((t) => t.id !== "auto").map((t) => h("option", { value: t.id }, t.name)));
  const toolFace = h("span", null, "All tools");
  const meta = h("button", { class: "cn-toggle", type: "button", role: "switch", "aria-checked": String(metaOn()) }, h("span", null, "Show metadata"), h("span", { class: "cn-toggle-sw", "aria-hidden": "true" }));
  meta.addEventListener("click", () => {
    const next = meta.getAttribute("aria-checked") !== "true";
    meta.setAttribute("aria-checked", String(next));
    feed.dataset.meta = next ? "on" : "off";
    try {
      localStorage.setItem(`orbe.tab.${META_KEY}`, next ? "on" : "off");
    } catch {
      // Holds for this visit only.
    }
  });
  const heading = h("h1", { class: "cn-studio-title", tabindex: "-1", "data-title": "" }, "Runs");
  const clear = h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", "aria-label": "Clear runs", onclick: async () => { await store.clear().catch(() => null); entries = []; draw(); heading.focus({ preventScroll: true }); } }, icon("trash"), h("span", null, "Clear"));
  const applyFilter = () => {
    const words = filterInput.value.trim().toLowerCase();
    for (const card of feed.querySelectorAll(".cn-runcard")) card.hidden = Boolean((toolSel.value && card.dataset.tool !== toolSel.value) || (words && !card.dataset.q.includes(words)));
  };
  filterInput.addEventListener("input", applyFilter);
  toolSel.addEventListener("change", () => {
    toolFace.textContent = toolSel.selectedOptions[0].textContent;
    applyFilter();
  });

  const box = composer({
    accounts,
    initial: { tool: ctx.query.get("tool") ?? undefined },
    onRun: (job) => go(job),
  });

  function suggestions() {
    // Each goes through Ask Orbe as worded, so the words shown are the words that work (intent.test.ts reads this list).
    const s = [
      ["rate-work", "Rate my best work this month"],
      ["offer", "Check a £450 offer"],
      ["sponsor", "Sponsors like you"],
      ["explain", "Explain my rating"],
    ].filter(([id]) => toolsOn().some((t) => t.id === id) && (accounts.length || !NEEDS_WORKS.has(id)));
    // With nothing connected, the first step is connecting; the offer check works without it.
    const connect = accounts.length ? null : h("a", { href: "/orbe-site/demo/app/connections" }, tile(CONNECT.glyph, CONNECT.k, h), "Connect an account");
    return h("div", { class: "cn-suggest" }, connect, s.map(([id, label]) => {
      const t = toolOf(id);
      return h("button", { type: "button", onclick: () => go({ tool: "auto", text: label, account: "all", window: "30" }) }, tile(t.glyph, t.k, h), label);
    }));
  }

  const tools = [h("label", { class: "cn-field" }, icon("search"), filterInput), h("label", { class: "cn-select" }, icon("filter"), toolFace, icon("chevron"), toolSel), h("span", { class: "cn-grow" }), meta, clear];

  // Searching, filtering, metadata and clearing only mean something once there are runs.
  const bar = h("div", { class: "cn-studio-bar" }, ...tools);
  function draw() {
    bar.hidden = !entries.length;
    feed.replaceChildren(
      ...(entries.length
        ? [...entries].reverse().map(runCard)
        : [h("div", { class: "cn-studio-empty" },
            h("span", { class: "cn-empty-ico" }, icon("studio")),
            h("h2", { class: "cn-studio-q" }, "What should Orbe run?"),
            h("p", null, "Rate a work, check an offer, price a slot or see sponsors like you. Every answer comes from your own results, against creators the same size."),
            suggestions(),
          )]),
    );
    applyFilter();
  }

  async function go(job) {
    // Shown at once as running; replaced by the server's kept run when it answers.
    const pending = named({ id: `pending-${Date.now()}`, at: new Date().toISOString(), job });
    const had = entries.length;
    entries = [pending, ...entries].slice(0, 30);
    // Add the one card rather than redrawing the feed, so the tap paints at once.
    if (had) {
      if (had >= 30) feed.firstElementChild?.remove();
      feed.append(runCard(pending));
      applyFilter();
    } else draw();
    box.busy(true);
    try {
      const kept = named(await runJob(job));
      entries = [kept, ...entries.filter((e) => e !== pending)].slice(0, 30);
    } catch (e) {
      pending.out = { ok: false, error: { message: e.message, requestId: e.requestId } };
    }
    box.busy(false);
    box.setText("");
    // Typing in the composer, focus stays there for the next question; otherwise (a suggestion, a run from Home) it goes to the answer.
    const typing = box.node.contains(document.activeElement);
    draw();
    const newest = feed.lastElementChild;
    if (!typing && newest?.matches(".cn-runcard")) {
      // Marked too, so a screen still arriving (a run asked from Home) settles on the answer rather than the title.
      newest.dataset.focusFirst = "";
      newest.focus({ preventScroll: true });
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  main.append(
    h("div", { class: "cn-studio" },
      h("header", { class: "cn-pagehead cn-pagehead--s" }, h("div", null, heading)),
      bar,
      feed,
      h("div", { class: "cn-dock" }, box.node),
    ),
  );
  draw();
  if (ctx.query.get("run") === "1") {
    const job = { tool: ctx.query.get("tool") ?? "auto", text: ctx.query.get("q") ?? "", account: ctx.query.get("account") ?? "all", window: ctx.query.get("window") ?? "30" };
    // Ask Orbe: the server reads the sentence for the tool, what it needs and the window.
    history.replaceState(null, "", "/orbe-site/demo/app/runs");
    box.setTool("auto");
    // Not waited on: the screen arrives at once with the run in it, and focus moves to the answer when it comes.
    go(job);
  } else box.focus();
}
