/*
  Library: every work on your claimed accounts, across YouTube, podcasts and
  newsletters (GET /v1/me/works). A list on the left (all, starred, by kind,
  your collections), search, sort and three sizes; each work opens a drawer
  with its rating against creators the same size, what Orbe Fix would do,
  the guaranteed reads delivered in it, and rights, which are coming.
*/
import { api, can, on, seg } from "../api.js";
import { ago, cover, drawer, emptyState, segmented } from "../console-ui.js";
import { tile } from "../catalogue.js";
import { icon } from "../icons.js";
import { KINDS } from "../terms.js";
import { count, day, failure, h, signed } from "../ui.js";

const PAGE = 60;
const KIND_NAMES = { youtube: "YouTube", podcast: "Podcasts", substack: "Newsletters", twitch: "Streams", photography: "Photography" };
const KIND_ICON = { youtube: "play", podcast: "pulse", substack: "mail", twitch: "monitor", photography: "image" };
const SORTS = [["newest", "Newest"], ["oldest", "Oldest"], ["best", "Best rated"], ["worst", "Needs work"]];
const SIZE_KEY = "library-size";

const remembered = () => {
  try {
    return localStorage.getItem(`orbe.tab.${SIZE_KEY}`) ?? "m";
  } catch {
    return "m";
  }
};
const remember = (v) => {
  try {
    localStorage.setItem(`orbe.tab.${SIZE_KEY}`, v);
  } catch {
    // Not remembered on this device: the size holds for this visit.
  }
};

const duration = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null);
const strength = (w) => (w.rating ? Math.max(0, Math.min(1, (w.rating.rating + 1.5) / 3)) : 0.3);

/** The query the API takes, from the library's state. */
export function worksQuery(st, offset = 0) {
  const q = new URLSearchParams({ limit: String(PAGE), offset: String(offset), sort: st.sort });
  if (st.view === "favourites") q.set("favourites", "1");
  else if (st.view.startsWith("kind:")) q.set("kind", st.view.slice(5));
  else if (st.view.startsWith("col:")) q.set("collection", st.view.slice(4));
  if (st.q) q.set("q", st.q);
  return `/v1/me/works?${q}`;
}

export async function render(main, ctx) {
  const st = { view: ctx.query.get("view") ?? "all", q: "", sort: "newest", size: remembered() };
  let data = null;
  let works = [];
  const side = h("nav", { class: "cn-lib-side", "aria-label": "Library" });
  const title = h("h1", { class: "cn-lib-title", tabindex: "-1", "data-title": "" }, "All works");
  const countEl = h("span", { class: "cn-lib-count" });
  const grid = h("div", { class: "cn-works", "data-size": st.size, "aria-live": "polite" });
  const more = h("div", { class: "cn-more" });
  const searchInput = h("input", { class: "cn-field-input", type: "search", placeholder: "Search titles", "aria-label": "Search your works", autocomplete: "off" });
  let timer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      st.q = searchInput.value.trim();
      load();
    }, 220);
  });
  const sortSel = h("select", { "aria-label": "Sort" }, SORTS.map(([v, t]) => h("option", { value: v }, t)));
  const sortFace = h("span", null, "Newest");
  sortSel.addEventListener("change", () => {
    st.sort = sortSel.value;
    sortFace.textContent = SORTS.find(([v]) => v === st.sort)[1];
    load();
  });
  const sizes = segmented("Card size", [["s", "Small"], ["m", "Medium"], ["l", "Large"]], st.size, (v) => {
    st.size = v;
    grid.dataset.size = v;
    remember(v);
  }, { cls: "cn-seg--s" });
  for (const [b, t] of [...sizes.children].map((b, i) => [b, ["S", "M", "L"][i]])) b.replaceChildren(t);

  main.append(
    h("div", { class: "cn-lib" },
      side,
      h("section", { class: "cn-lib-main" },
        h("header", { class: "cn-lib-head" },
          h("div", null, title, countEl),
          h("div", { class: "cn-lib-tools" },
            on("media") && can("content") ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: "/orbe-site/demo/app/media" }, icon("plus"), "Drop in a video") : null,
            h("label", { class: "cn-field" }, icon("search"), searchInput),
            h("label", { class: "cn-select" }, h("span", { class: "cn-select-k" }, "Sort"), sortFace, icon("chevron"), sortSel),
            sizes,
          ),
        ),
        grid,
        more,
      ),
    ),
  );

  const viewName = () => {
    if (st.view === "all") return "All works";
    if (st.view === "favourites") return "Starred";
    if (st.view.startsWith("kind:")) return KIND_NAMES[st.view.slice(5)] ?? st.view.slice(5);
    return data?.collections.find((c) => `col:${c.id}` === st.view)?.name ?? "Collection";
  };

  function drawSide() {
    const link = (view, ico, text, n) =>
      h("button", { class: "cn-lib-link", type: "button", "aria-current": String(st.view === view), onclick: () => { st.view = view; history.replaceState(null, "", view === "all" ? "/orbe-site/demo/app/library" : `/orbe-site/demo/app/library?view=${encodeURIComponent(view)}`); load(); } },
        icon(ico), h("span", null, text), n === null ? null : h("span", { class: "cn-lib-n" }, count(n)));
    const kinds = Object.entries(data?.counts.byKind ?? {}).sort((a, b) => b[1] - a[1]);
    // Viewers read the Library; making collections and starring are for those who work on it.
    const adder = can("content") ? h("button", { class: "cn-lib-add", type: "button", "aria-label": "New collection", title: "New collection", onclick: () => newCollection() }, icon("plus")) : null;
    side.replaceChildren(...[
      h("p", { class: "cn-menu-group" }, "Library"),
      link("all", "library", "All works", data?.counts.all ?? null),
      link("favourites", "star", "Starred", data?.counts.favourites ?? null),
      // Drop in a video lives beside the works it becomes: clips, captions and words from one upload.
      on("media") ? h("a", { class: "cn-lib-link", href: "/orbe-site/demo/app/media" }, icon("play"), h("span", null, "Videos"), null) : null,
      kinds.length > 1 ? [h("p", { class: "cn-menu-group" }, "By kind"), kinds.map(([k, n]) => link(`kind:${k}`, KIND_ICON[k] ?? "doc", KIND_NAMES[k] ?? k, n))] : null,
      h("p", { class: "cn-menu-group" }, h("span", null, "Collections"), adder),
      (data?.collections ?? []).map((c) => link(`col:${c.id}`, "folder", c.name, c.count)),
      data && !data.collections.length ? h("p", { class: "cn-hist-empty cn-lib-hint" }, "Group works to send or compare.") : null,
    ].flat(Infinity).filter(Boolean));
  }

  function newCollection() {
    const field = h("input", { type: "text", maxlength: 60, placeholder: "Name the collection", "aria-label": "Collection name" });
    const row = h("form", { class: "cn-lib-new" }, field, h("button", { class: "cn-btn cn-btn--xs", type: "submit" }, "Add"));
    row.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = field.value.trim();
      if (!name) return;
      try {
        const { collection } = await api.post("/v1/me/collections", { name });
        st.view = `col:${collection.id}`;
        await load();
      } catch (err) {
        row.after(failure(err));
      }
    });
    field.addEventListener("keydown", (e) => e.key === "Escape" && row.remove());
    side.querySelector(".cn-lib-add")?.closest(".cn-menu-group")?.after(row);
    field.focus();
  }

  const card = (w) => {
    const star = h("button", { class: "cn-star", type: "button", "aria-pressed": String(w.favourite), "aria-label": w.favourite ? `Unstar ${w.title}` : `Star ${w.title}`, disabled: !can("content") }, icon("star", { filled: w.favourite }));
    star.addEventListener("click", async (e) => {
      e.stopPropagation();
      const next = !w.favourite;
      try {
        await api.put(`/v1/me/works/${seg(w.id)}/favourite`, { favourite: next });
        w.favourite = next;
        star.setAttribute("aria-pressed", String(next));
        star.setAttribute("aria-label", next ? `Unstar ${w.title}` : `Star ${w.title}`);
        star.replaceChildren(icon("star", { filled: next }));
        data.counts.favourites += next ? 1 : -1;
        drawSide();
        if (st.view === "favourites" && !next) load();
      } catch {
        // The star stays as it was; nothing changed.
      }
    });
    const dur = duration(w.durationSec);
    return h("article", { class: "cn-work" },
      star,
      h("button", { class: "cn-work-open", type: "button", onclick: () => open(w.id), "aria-label": `Open ${w.title}` },
        h("span", { class: "cn-work-art" },
          cover(w.id, w.kind, strength(w)),
          h("span", { class: "cn-work-kind" }, KIND_NAMES[w.kind] === "Podcasts" ? "Podcast" : KIND_NAMES[w.kind] === "Newsletters" ? "Newsletter" : KIND_NAMES[w.kind] ?? w.kind),
          w.rating ? h("span", { class: `cn-work-score${w.rating.rating > 0 ? " is-up" : ""}`, title: w.rating.notice }, signed(w.rating.rating)) : null,
          dur ? h("span", { class: "cn-work-dur" }, dur) : null,
        ),
      ),
      h("div", null,
        h("p", { class: "cn-work-t" }, w.title),
        h("p", { class: "cn-work-d" }, [w.account.handle, ago(w.publishedAt), w.reach ? `${count(w.reach.value)} ${w.reach.label}` : null].filter(Boolean).join(" · ")),
      ),
    );
  };

  async function load(append = false) {
    const offset = append ? works.length : 0;
    if (!append) grid.replaceChildren(...Array.from({ length: 8 }, () => h("div", { class: "cn-work cn-work--skel", "aria-hidden": "true" }, h("span", { class: "cn-work-art cn-skel-line" }), h("span", { class: "cn-skel" }, h("span", { class: "cn-skel-line" }), h("span", { class: "cn-skel-line" })))));
    try {
      data = await api.get(worksQuery(st, offset));
      works = append ? [...works, ...data.works] : data.works;
    } catch (e) {
      if (e.status === 404 && st.view.startsWith("col:")) {
        st.view = "all";
        return load();
      }
      grid.replaceChildren(failure(e, () => load()));
      return;
    }
    title.textContent = viewName();
    countEl.textContent = data.total ? `${count(data.total)} ${data.total === 1 ? "work" : "works"}` : "";
    drawSide();
    if (!works.length) {
      grid.replaceChildren(
        st.q
          ? emptyState("search", `Nothing called "${st.q}" here.`, [["Clear the search", () => { searchInput.value = ""; st.q = ""; load(); }]])
          : st.view === "favourites"
            ? emptyState("star", "Star the works you come back to, and they wait here.", [["See all works", () => { st.view = "all"; load(); }]])
            : st.view.startsWith("col:")
              ? emptyState("folder", "This collection is empty.", [["Add works", () => { st.view = "all"; load(); }]], "Open any work and add it from its drawer.")
              : emptyState("library", "Your works show here once Orbe can read an account of yours.", [["Connect an account", "/orbe-site/demo/app/settings/connections", true], on("podcasts") ? ["Set up a podcast", "/orbe-site/demo/app/start"] : null].filter(Boolean), "Every upload, episode and post, each rated against creators the same size."),
      );
      more.replaceChildren();
      return;
    }
    grid.replaceChildren(...works.map(card));
    more.replaceChildren(works.length < data.total ? h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => load(true) }, `Load ${Math.min(PAGE, data.total - works.length)} more`) : null);
  }

  /** A work's drawer: what Orbe holds about it, each part from the API. */
  function open(workId) {
    const url = new URL(location.href);
    url.searchParams.set("work", workId);
    history.replaceState(null, "", url);
    drawer("Work", async () => {
      try {
        const [detail, fixes] = await Promise.all([
          api.get(`/v1/me/works/${seg(workId)}`),
          on("fix") ? api.get("/v1/me/fixes").catch(() => null) : null,
        ]);
        return drawerBody(detail, fixes);
      } catch (e) {
        return failure(e);
      }
    }, {
      onClose: () => {
        const u = new URL(location.href);
        u.searchParams.delete("work");
        history.replaceState(null, "", u);
      },
    });
  }

  function drawerBody({ work: w, deals, fixes: fixRows }, fixes) {
    const upload = fixes?.channels.flatMap((c) => c.uploads).find((u) => u.workId === w.id);
    const inCols = new Set(w.collections);
    const colBtns = h("div", { class: "cn-cols-in" },
      (data?.collections ?? []).map((c) =>
        h("button", { class: "cn-colbtn", type: "button", "aria-pressed": String(inCols.has(c.id)), disabled: !can("content"), onclick: async (e) => {
          const btn = e.currentTarget;
          const now = btn.getAttribute("aria-pressed") !== "true";
          try {
            await api[now ? "put" : "del"](`/v1/me/collections/${seg(c.id)}/works/${seg(w.id)}`);
            btn.setAttribute("aria-pressed", String(now));
            btn.firstChild.replaceWith(icon(now ? "check" : "plus"));
            c.count += now ? 1 : -1;
            drawSide();
          } catch {
            // Unchanged.
          }
        } }, icon(inCols.has(c.id) ? "check" : "plus"), c.name),
      ),
    );
    const dur = duration(w.durationSec);
    return [
      h("span", { class: "cn-work-art" }, cover(w.id, w.kind, strength(w)), w.rating ? h("span", { class: `cn-work-score${w.rating.rating > 0 ? " is-up" : ""}` }, signed(w.rating.rating)) : null),
      h("div", null,
        h("h2", { class: "cn-dw-title" }, w.title),
        h("p", { class: "cn-dw-meta" }, [w.account.handle, KINDS[w.kind] ?? w.kind, day(w.publishedAt)].join(" · ")),
      ),
      h("div", { class: "cn-dw-actions" },
        h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: `/orbe-site/demo/app/library/${seg(w.id)}` }, icon("doc"), "Open its record"),
        w.url ? h("a", { class: "cn-btn cn-btn--s", href: w.url, target: "_blank", rel: "noopener" }, icon("external"), "Open on YouTube") : null,
        h("a", { class: "cn-btn cn-btn--s", href: `/orbe-site/demo/app/studio?${new URLSearchParams({ run: "1", tool: "rate-work", q: w.title })}` }, icon("studio"), "Run in Studio"),
      ),
      h("section", { class: "cn-dw-sec" },
        h("div", { class: "cn-dw-sec-h" }, h("h3", null, tile("products/rate/", "also", h, "s"), "Against creators the same size")),
        w.rating
          ? [
              h("div", { class: "cn-figure" }, h("p", { class: "cn-figure-n" }, signed(w.rating.rating)), h("div", { class: "cn-figure-k" }, h("b", null, `${w.rating.multiple.toFixed(2)} times your typical`), h("span", null, `Zero is typical for creators your size. Rated ${ago(w.rating.computedAt)} ago`.replace("Just now ago", "just now")))),
              h("p", { class: "cn-label" }, w.rating.notice),
            ]
          : h("p", null, "Not rated yet. A work is rated once it is old enough to compare with creators the same size."),
      ),
      on("fix") && w.kind === "youtube"
        ? h("section", { class: "cn-dw-sec" },
            h("div", { class: "cn-dw-sec-h" }, h("h3", null, tile("products/fix/", "fix", h, "s"), "Orbe Fix"), upload?.diagnosis ? h("span", { class: `cn-pill cn-pill--${upload.diagnosis.status === "on_track" ? "done" : "needs"}` }, h("span", { class: "cn-pill-dot" }), upload.diagnosis.status === "on_track" ? "On track" : "Behind") : null),
            h("p", null, upload?.diagnosis?.why ?? "Orbe Fix looks at uploads from 1 to 60 days old. This one is outside that window."),
            fixRows.length ? h("p", null, `${fixRows.length} fix${fixRows.length === 1 ? "" : "es"} on this work: ${fixRows.map((f) => f.state).join(", ")}.`) : null,
            upload && upload.diagnosis.status !== "on_track" ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: "/orbe-site/demo/app/fix" }, "See options in Orbe Fix") : null,
          )
        : null,
      // Deals are money: only those whose role sees money see them.
      can("read.money")
        ? h("section", { class: "cn-dw-sec" },
            h("div", { class: "cn-dw-sec-h" }, h("h3", null, tile("products/sponsorships/", "spon", h, "s"), "Deals on it")),
            deals.length
              ? h("ul", { class: "cn-brands" }, deals.map((d) => h("li", null, h("span", null, d.brandName ?? "A brand"), h("span", { class: "cn-hist-d" }, d.state.replaceAll("_", " ")))))
              : h("p", null, on("sponsorships") ? "No guaranteed read was delivered in this work." : "Sponsorships are not switched on here."),
          )
        : null,
      data?.collections.length
        ? h("section", { class: "cn-dw-sec" }, h("div", { class: "cn-dw-sec-h" }, h("h3", null, icon("folder"), "Collections")), colBtns)
        : null,
      h("section", { class: "cn-dw-sec" },
        h("div", { class: "cn-dw-sec-h" }, h("h3", null, icon("doc"), "Details")),
        h("dl", { class: "cn-dl" },
          h("dt", null, "Published"), h("dd", null, day(w.publishedAt)),
          dur ? [h("dt", null, "Length"), h("dd", null, dur)] : null,
          w.reach ? [h("dt", null, "Reach"), h("dd", null, `${count(w.reach.value)} ${w.reach.label}`)] : null,
          h("dt", null, "Account"), h("dd", null, w.account.title),
        ),
      ),
    ];
  }

  await load();
  const want = ctx.query.get("work");
  if (want) open(want);
}
