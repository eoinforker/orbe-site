/*
  Library: every work on your claimed accounts, across YouTube, podcasts and
  newsletters, as a table you can compare by (GET /v1/me/works?table=1) or as
  a gallery. The table sorts by any column and filters by kind, account,
  rating band, sponsor read, Fix status, stars, collection and dates, all on
  the server; it pages by cursor and draws only the rows on screen, so a
  catalogue of thousands scrolls smoothly. Select rows to star them, file
  them in a collection or export them. A row opens its work page; ?work= opens
  the older drawer, for links from elsewhere.
*/
import { api, ApiError, can, on, seg } from "../api.js";
import { ago, cover, drawer, emptyState, pill, segmented } from "../console-ui.js";
import { tile } from "../catalogue.js";
import { icon } from "../icons.js";
import { KINDS } from "../terms.js";
import { openConnect } from "../connect-inline.js";
import { virtualTable } from "../table.js";
import { count, day, failure, h, signed, toast } from "../ui.js";

const PAGE = 200;
/** Rows fetched ahead of the reader, so a steady scroll never meets a blank row. */
const AHEAD = 120;
const KIND_NAMES = { youtube: "YouTube", podcast: "Podcasts", substack: "Newsletters", twitch: "Streams", photography: "Photography" };
const KIND_ONE = { youtube: "YouTube", podcast: "Podcast", substack: "Newsletter", twitch: "Stream", photography: "Photo" };
const KIND_ICON = { youtube: "play", podcast: "pulse", substack: "mail", twitch: "monitor", photography: "image" };
const BANDS = [["", "Any rating"], ["well_above", "Well above typical"], ["above", "Above typical"], ["below", "Below typical"], ["well_below", "Well below typical"], ["unrated", "Not rated yet"]];
const FIXES = [["", "Any Fix status"], ["any", "Has a fix"], ["open", "Fix in progress"], ["kept", "Fix kept"], ["reverted", "Fix put back"], ["none", "No fix"]];
const FIX_WORDS = { proposed: "Proposed", approved: "Approved", applied: "Live", kept: "Kept", reverted: "Put back", cancelled: "Cancelled" };
const FIX_TONE = { proposed: "needs", approved: "needs", applied: "running", kept: "done", reverted: "coming", cancelled: "coming" };
const NAMED_DIR = new Set(["title", "kind", "account"]);
const VIEW_KEY = "library-view";
/** One formatter for every row: building a new one per date was the table's slowest call while scrolling. */
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dayOf = (iso) => (iso ? DAY.format(new Date(iso)) : "");
const COLS_KEY = "library-cols";

const recall = (key, fallback) => {
  try {
    return localStorage.getItem(`orbe.tab.${key}`) ?? fallback;
  } catch {
    return fallback;
  }
};
const keep = (key, value) => {
  try {
    localStorage.setItem(`orbe.tab.${key}`, value);
  } catch {
    // Not remembered on this device: the choice holds for this visit.
  }
};

const duration = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null);
const strength = (w) => (w.rating ? Math.max(0, Math.min(1, (w.rating.rating + 1.5) / 3)) : 0.3);
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
const age = (d) => (d < 1 ? "Today" : d < 60 ? `${d}d` : d < 730 ? `${Math.round(d / 30)}mo` : `${Math.round(d / 365)}y`);

/** The table query the API takes, from the library's state. */
export function worksQuery(st, cursor = null, limit = PAGE) {
  const q = new URLSearchParams({ table: "1", limit: String(limit), sort: st.sort, dir: st.dir });
  if (st.view === "favourites") q.set("favourites", "1");
  else if (st.view.startsWith("kind:")) q.set("kind", st.view.slice(5));
  else if (st.view.startsWith("col:")) q.set("collection", st.view.slice(4));
  for (const [k, v] of Object.entries(st.filters)) if (v) q.set(k, v === true ? "1" : v);
  if (st.q) q.set("q", st.q);
  if (cursor) q.set("cursor", cursor);
  return `/v1/me/works?${q}`;
}

export async function render(main, ctx) {
  const st = {
    view: ctx.query.get("view") ?? "all",
    q: "",
    sort: "published",
    dir: "desc",
    filters: { account: "", band: "", fix: "", sponsor: false, from: "", to: "" },
    mode: recall(VIEW_KEY, ""),
  };
  let hidden = new Set(recall(COLS_KEY, "age,typical").split(",").filter(Boolean));
  let data = null;
  let rows = [];
  let cursor = null;
  let fetching = null;
  let generation = 0;
  let table = null;
  const selection = new Set();
  const phone = matchMedia("(max-width: 720px)");

  const side = h("nav", { class: "cn-lib-side", "aria-label": "Library" });
  const title = h("h1", { class: "cn-lib-title", tabindex: "-1", "data-title": "" }, "Library");
  const countEl = h("span", { class: "cn-lib-count" });
  const stage = h("div", { class: "cn-lib-stage", "aria-live": "polite" });
  const more = h("div", { class: "cn-more" });
  const bulkBar = h("div", { class: "cn-bulk", hidden: true, role: "region", "aria-label": "Selected works" });
  const filterBar = h("div", { class: "cn-lib-filters" });
  const searchInput = h("input", { class: "cn-field-input", type: "search", placeholder: "Search titles", "aria-label": "Search your works", autocomplete: "off" });
  let timer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      st.q = searchInput.value.trim();
      load();
    }, 220);
  });
  const modes = segmented("View", [["table", "Table", "list"], ["gallery", "Gallery", "grid"]], st.mode || "table", (v) => {
    st.mode = v;
    keep(VIEW_KEY, v);
    draw();
  }, { cls: "cn-seg--s", iconOnly: true });
  const colsMenu = h("details", { class: "cn-colpick" });
  const exportBtn = h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => exportCsv(false) }, icon("doc"), "Export");

  main.append(
    h("div", { class: "cn-lib" },
      side,
      h("section", { class: "cn-lib-main" },
        h("header", { class: "cn-lib-head" },
          h("div", null, title, countEl),
          h("div", { class: "cn-lib-tools" },
            on("media") && can("content") ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: "/orbe-site/demo/app/media" }, icon("plus"), "Drop in a video") : null,
            h("label", { class: "cn-field" }, icon("search"), searchInput),
            modes,
            colsMenu,
            exportBtn,
          ),
        ),
        filterBar,
        bulkBar,
        stage,
        more,
      ),
    ),
  );

  const viewName = () => {
    if (st.view === "all") return "Library";
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
      link("all", "library", "All", data?.counts.all ?? null),
      link("favourites", "star", "Starred", data?.counts.favourites ?? null),
      // Drop in a video lives beside the works it becomes: clips, captions and words from one upload.
      on("media") ? h("a", { class: "cn-lib-link", href: "/orbe-site/demo/app/media" }, icon("play"), h("span", null, "Videos")) : null,
      kinds.length > 1 ? [h("p", { class: "cn-menu-group" }, "By kind"), kinds.map(([k, n]) => link(`kind:${k}`, KIND_ICON[k] ?? "doc", KIND_NAMES[k] ?? k, n))] : null,
      h("p", { class: "cn-menu-group" }, h("span", null, "Collections"), adder),
      (data?.collections ?? []).map((c) => link(`col:${c.id}`, "folder", c.name, c.count)),
      data && !data.collections.length ? h("p", { class: "cn-hist-empty cn-lib-hint" }, "Group works to send or compare.") : null,
    ].flat(Infinity).filter(Boolean));
  }

  function newCollection(then) {
    const field = h("input", { type: "text", maxlength: 60, placeholder: "Name the collection", "aria-label": "Collection name" });
    const row = h("form", { class: "cn-lib-new" }, field, h("button", { class: "cn-btn cn-btn--xs", type: "submit" }, "Add"));
    row.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = field.value.trim();
      if (!name) return;
      try {
        const { collection } = await api.post("/v1/me/collections", { name });
        if (then) return then(collection);
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

  /* ---------------------------------------------------------------- filters */
  const sel = (label, options, value, set) => {
    const s = h("select", { "aria-label": label, onchange: (e) => set(e.target.value) }, options.map(([v, t]) => h("option", { value: v, selected: v === value }, t)));
    const face = h("span", null, options.find(([v]) => v === value)?.[1] ?? options[0][1]);
    s.addEventListener("change", () => (face.textContent = options.find(([v]) => v === s.value)?.[1] ?? ""));
    return h("label", { class: `cn-select cn-select--s${value ? " is-set" : ""}` }, face, icon("chevron"), s);
  };
  const setFilter = (k, v) => {
    st.filters[k] = v;
    load();
  };
  function drawFilters() {
    const f = st.filters;
    const accounts = data?.accounts ?? [];
    const any = Object.values(f).some(Boolean);
    const dateInput = (k, label) => h("label", { class: `cn-date${f[k] ? " is-set" : ""}` }, h("span", null, label), h("input", { type: "date", value: f[k], "aria-label": `${label} date`, onchange: (e) => setFilter(k, e.target.value) }));
    filterBar.replaceChildren(...[
      icon("filter"),
      accounts.length > 1 ? sel("Account", [["", "Every account"], ...accounts.map((a) => [a.id, a.handle])], f.account, (v) => setFilter("account", v)) : null,
      sel("Rating", BANDS, f.band, (v) => setFilter("band", v)),
      on("fix") ? sel("Fix", FIXES, f.fix, (v) => setFilter("fix", v)) : null,
      h("button", { class: "cn-chipbtn", type: "button", "aria-pressed": String(f.sponsor), onclick: () => setFilter("sponsor", !f.sponsor) }, "Has a sponsor read"),
      dateInput("from", "From"),
      dateInput("to", "To"),
      any ? h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: () => { st.filters = { account: "", band: "", fix: "", sponsor: false, from: "", to: "" }; load(); } }, "Clear filters") : null,
    ].filter(Boolean));
  }

  /* ---------------------------------------------------------------- columns */
  const starBtn = (w, cls = "cn-star cn-star--row") => {
    const b = h("button", { class: cls, type: "button", "aria-pressed": String(w.favourite), "aria-label": w.favourite ? `Unstar ${w.title}` : `Star ${w.title}`, disabled: !can("content") }, icon("star", { filled: w.favourite }));
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const next = !w.favourite;
      w.favourite = next;
      table?.refresh();
      if (st.mode === "gallery") draw();
      try {
        await api.put(`/v1/me/works/${seg(w.id)}/favourite`, { favourite: next });
        data.counts.favourites += next ? 1 : -1;
        drawSide();
        if (st.view === "favourites" && !next) load();
      } catch {
        w.favourite = !next;
        table?.refresh();
      }
    });
    return b;
  };
  const thumb = (w) =>
    w.thumb
      ? h("img", { class: "cn-thumb", src: w.thumb, alt: "", loading: "lazy", decoding: "async", width: 64, height: 36, referrerpolicy: "no-referrer" })
      : h("span", { class: "cn-thumb cn-thumb--kind", "data-k": w.kind }, icon(KIND_ICON[w.kind] ?? "doc"));
  const ratingCell = (w) => (w.rating ? h("span", { class: `cn-score${w.rating.rating > 0 ? " cn-score--up" : ""}`, title: w.rating.notice }, signed(w.rating.rating)) : h("span", { class: "cn-muted" }, "New"));

  // Phone cells, updated in place (see columnsFor). Each keeps its nodes on the cell element.
  const kindIcons = new Map();
  function fillThumb(cell, w) {
    if (w.thumb) {
      let img = cell._img;
      if (!img) {
        img = cell._img = h("img", { class: "cn-thumb", alt: "", loading: "lazy", decoding: "async", width: 72, height: 40, referrerpolicy: "no-referrer" });
      }
      if (img.getAttribute("src") !== w.thumb) img.src = w.thumb;
      if (cell.firstChild !== img) cell.replaceChildren(img);
      return;
    }
    let box = cell._kind;
    if (!box) box = cell._kind = h("span", { class: "cn-thumb cn-thumb--kind" });
    if (box.dataset.k !== w.kind) {
      box.dataset.k = w.kind;
      if (!kindIcons.has(w.kind)) kindIcons.set(w.kind, icon(KIND_ICON[w.kind] ?? "doc"));
      box.replaceChildren(kindIcons.get(w.kind).cloneNode(true));
    }
    if (cell.firstChild !== box) cell.replaceChildren(box);
  }
  function fillTitle(cell, w) {
    if (!cell._t) {
      cell._t = h("span", { class: "cn-cell-t" });
      cell._d = h("span", { class: "cn-cell-d" });
      cell._stack = h("div", { class: "cn-cell-stack" }, cell._t, cell._d);
    }
    if (cell.firstChild !== cell._stack) cell.replaceChildren(cell._stack);
    if (cell._t.textContent !== w.title) cell._t.textContent = w.title;
    const d = [KIND_ONE[w.kind] ?? w.kind, age(w.ageDays), w.reach ? `${short(w.reach.value)} ${w.reach.label}` : null].filter(Boolean).join(" · ");
    if (cell._d.textContent !== d) cell._d.textContent = d;
  }
  function fillRating(cell, w) {
    if (!cell._r) cell._r = h("span");
    const r = cell._r;
    if (cell.firstChild !== r) cell.replaceChildren(r);
    const cls = w.rating ? `cn-score${w.rating.rating > 0 ? " cn-score--up" : ""}` : "cn-muted";
    if (r.className !== cls) r.className = cls;
    const text = w.rating ? signed(w.rating.rating) : "New";
    if (r.textContent !== text) r.textContent = text;
    r.title = w.rating?.notice ?? "";
  }

  function columnsFor() {
    const selectBox = (w) => h("input", { type: "checkbox", class: "cn-rowtick", checked: selection.has(w.id), "aria-label": `Select ${w.title}`, onclick: (e) => { e.stopPropagation(); toggle(w); } });
    if (phone.matches) {
      // On a phone each row is three cells whose nodes are made once and then updated in place as rows
      // are recycled (fill), so a fast scroll changes text and one attribute rather than building nodes.
      return [
        { key: "thumb", label: "", width: "72px", fill: fillThumb },
        { key: "title", label: "Work", width: "minmax(0, 1fr)", fill: fillTitle },
        { key: "rating", label: "Rating", width: "64px", align: "end", sort: true, fill: fillRating },
      ];
    }
    const all = [
      can("content") ? { key: "select", label: "Select", width: "32px", always: true, headCell: () => h("input", { type: "checkbox", class: "cn-rowtick", "aria-label": "Select every loaded work", checked: rows.length > 0 && rows.every((w) => w && selection.has(w.id)), onclick: (e) => { selectAll(e.target.checked); } }), cell: selectBox } : null,
      { key: "thumb", label: "", width: "64px", cell: thumb },
      { key: "title", label: "Title", width: "minmax(180px, 3fr)", sort: true, always: true, cell: (w) => h("span", { class: "cn-cell-t" }, w.title), title: (w) => w.title },
      { key: "kind", label: "Kind", width: "84px", sort: true, cell: (w) => KIND_ONE[w.kind] ?? w.kind },
      { key: "account", label: "Account", width: "minmax(90px, 1fr)", sort: true, cell: (w) => h("span", { class: "cn-cell-d" }, w.account.handle) },
      { key: "published", label: "Published", width: "96px", sort: true, cell: (w) => h("span", { class: "cn-num" }, dayOf(w.publishedAt)) },
      { key: "age", label: "Age", width: "60px", align: "end", sort: "published", cell: (w) => h("span", { class: "cn-num" }, age(w.ageDays)) },
      { key: "reach", label: "Reach", width: "92px", align: "end", sort: true, cell: (w) => (w.reach ? h("span", { class: "cn-num", title: `${count(w.reach.value)} ${w.reach.label}` }, short(w.reach.value), h("small", null, ` ${w.reach.label.split(" ")[0]}`)) : h("span", { class: "cn-muted" }, "None yet")) },
      { key: "rating", label: "Rating", width: "72px", align: "end", sort: true, always: true, cell: ratingCell },
      { key: "typical", label: "vs your typical", width: "112px", align: "end", sort: true, cell: (w) => (w.rating?.multiple ? h("span", { class: `cn-num${w.rating.multiple >= 1 ? " cn-up" : ""}` }, `${w.rating.multiple.toFixed(2)}×`) : h("span", { class: "cn-muted" }, "None")) },
      on("fix") ? { key: "fix", label: "Fix", width: "96px", sort: true, cell: (w) => (w.fix ? pill(FIX_TONE[w.fix.state] ?? "idle", FIX_WORDS[w.fix.state] ?? w.fix.state) : null) } : null,
      { key: "sponsor", label: "Sponsor read", width: "minmax(90px, 1fr)", sort: true, cell: (w) => (w.sponsor ? h("span", { class: "cn-cell-d" }, w.sponsor.brand) : null) },
      data?.columns.deals && on("sponsorships") ? { key: "deals", label: "Deals", width: "56px", align: "end", sort: true, cell: (w) => (w.deals ? h("span", { class: "cn-num" }, String(w.deals)) : null) } : null,
      on("media") ? { key: "clips", label: "Clips", width: "60px", align: "end", sort: true, cell: (w) => (w.clips ? h("span", { class: "cn-num" }, String(w.clips)) : null) } : null,
      { key: "starred", label: "Starred", width: "40px", align: "center", sort: true, always: true, cell: (w) => starBtn(w) },
    ].filter(Boolean);
    return all.filter((c) => c.always || !hidden.has(c.key));
  }

  function drawColsMenu() {
    const keys = [["thumb", "Thumbnail"], ["kind", "Kind"], ["account", "Account"], ["published", "Published"], ["age", "Age"], ["reach", "Reach"], ["typical", "vs your typical"], on("fix") ? ["fix", "Fix"] : null, ["sponsor", "Sponsor read"], data?.columns.deals && on("sponsorships") ? ["deals", "Deals"] : null, on("media") ? ["clips", "Clips"] : null].filter(Boolean);
    colsMenu.replaceChildren(
      h("summary", { class: "cn-btn cn-btn--s" }, icon("sliders"), "Columns"),
      h("div", { class: "cn-colpick-menu", role: "group", "aria-label": "Columns to show" },
        keys.map(([k, t]) => h("label", { class: "cn-colpick-row" }, h("input", { type: "checkbox", checked: !hidden.has(k), onchange: (e) => { if (e.target.checked) hidden.delete(k); else hidden.add(k); keep(COLS_KEY, [...hidden].join(",")); draw(); } }), t)),
      ),
    );
    colsMenu.hidden = st.mode === "gallery" || phone.matches;
  }

  /* ---------------------------------------------------------------- selection */
  function toggle(w) {
    if (selection.has(w.id)) selection.delete(w.id);
    else selection.add(w.id);
    drawBulk();
    table?.refresh();
  }
  function selectAll(onOff) {
    for (const w of rows) if (w) onOff ? selection.add(w.id) : selection.delete(w.id);
    drawBulk();
    table?.refresh();
  }
  async function bulk(action, collection) {
    const ids = [...selection];
    try {
      await api.post("/v1/me/works/bulk", { action, ids, ...(collection ? { collection } : {}) });
      toast(action === "star" ? `Starred ${ids.length}` : action === "unstar" ? `Unstarred ${ids.length}` : action === "add" ? `Added ${ids.length} to the collection` : `Took ${ids.length} out of the collection`);
      selection.clear();
      await load(true);
    } catch (e) {
      bulkBar.append(failure(e));
    }
  }
  function drawBulk() {
    bulkBar.hidden = selection.size === 0;
    if (!selection.size) return bulkBar.replaceChildren();
    const cols = data?.collections ?? [];
    const pick = h("select", { "aria-label": "Add to a collection", onchange: (e) => {
      const v = e.target.value;
      e.target.value = "";
      if (v === "+") newCollection((c) => bulk("add", c.id));
      else if (v) bulk("add", v);
    } }, h("option", { value: "" }, "Add to collection"), cols.map((c) => h("option", { value: c.id }, c.name)), h("option", { value: "+" }, "New collection"));
    bulkBar.replaceChildren(...[
      h("span", { class: "cn-bulk-n" }, `${count(selection.size)} selected`),
      h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: () => bulk("star") }, icon("star"), "Star"),
      h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: () => bulk("unstar") }, "Unstar"),
      h("label", { class: "cn-select cn-select--s" }, h("span", null, "Add to collection"), icon("chevron"), pick),
      st.view.startsWith("col:") ? h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: () => bulk("remove", st.view.slice(4)) }, "Take out of this collection") : null,
      h("button", { class: "cn-btn cn-btn--xs", type: "button", onclick: () => exportCsv(true) }, "Export selected"),
      h("button", { class: "cn-btn cn-btn--xs cn-bulk-clear", type: "button", onclick: () => { selection.clear(); drawBulk(); table?.refresh(); } }, "Clear"),
    ].filter(Boolean));
  }

  /* ---------------------------------------------------------------- data */
  async function fetchMore(limit = PAGE) {
    if (fetching || !cursor) return fetching;
    const gen = generation;
    fetching = api.get(worksQuery(st, cursor, limit)).then((page) => {
      if (gen !== generation) return;
      rows.push(...page.works);
      cursor = page.cursor;
    }).finally(() => {
      fetching = null;
    });
    await fetching;
    if (gen !== generation) return;
    if (table) table.redraw();
    else if (st.mode === "gallery") drawGallery();
  }

  /** The file is built by the server, so it holds only what this role may see and carries its export id. */
  async function exportCsv(onlySelected) {
    const q = new URLSearchParams(worksQuery(st).split("?")[1]);
    q.delete("limit");
    q.set("format", "csv");
    if (onlySelected) q.set("ids", [...selection].join(","));
    exportBtn.disabled = true;
    try {
      const res = await fetch(`/v1/me/works?${q}`, { credentials: "same-origin" });
      if (!res.ok) {
        const e = (await res.json().catch(() => null))?.error ?? {};
        throw new ApiError(res.status, e.code ?? "failed", e.message ?? "The export did not finish. Try again.", undefined, e.requestId);
      }
      const n = Number(res.headers.get("x-orbe-export-rows") ?? 0);
      const more = res.headers.get("x-orbe-next-cursor");
      const a = h("a", { href: URL.createObjectURL(await res.blob()), download: `orbe-library-${new Date().toISOString().slice(0, 10)}.csv` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(`Exported ${count(n)} ${n === 1 ? "work" : "works"}${more ? "; the file says how to fetch the rest" : ""}`);
    } catch (e) {
      stage.prepend(failure(e));
    } finally {
      exportBtn.disabled = false;
    }
  }

  async function load(keepPlace = false) {
    const gen = ++generation;
    cursor = null;
    fetching = null;
    if (!keepPlace) {
      table?.destroy();
      table = null;
      stage.replaceChildren(h("div", { class: "cn-vt cn-vt--skel", "aria-hidden": "true" }, Array.from({ length: 8 }, () => h("div", { class: "cn-vt-tr" }, h("span", { class: "cn-vt-skel" })))));
    }
    let first;
    try {
      first = await api.get(worksQuery(st, null, PAGE));
    } catch (e) {
      if (gen !== generation) return;
      if (e.status === 404 && st.view.startsWith("col:")) {
        st.view = "all";
        return load();
      }
      table = null;
      stage.replaceChildren(failure(e, () => load()));
      return;
    }
    if (gen !== generation) return;
    data = first;
    rows = [...first.works];
    cursor = first.cursor;
    for (const id of [...selection]) if (!rows.some((w) => w.id === id) && !keepPlace) selection.delete(id);
    title.textContent = viewName();
    countEl.textContent = data.total ? `${count(data.total)} ${data.total === 1 ? "work" : "works"}` : "";
    if (!st.mode) st.mode = data.counts.all >= 20 ? "table" : "gallery";
    drawSide();
    drawFilters();
    drawBulk();
    draw(keepPlace);
  }

  /** Connect in place, in the shared sheet, and come back to a Library that reloads with what arrived. */
  function connectActions() {
    if (!can("content")) return [["See your connections", "/orbe-site/demo/app/connections"]];
    const here = { back: "/orbe-site/demo/app/library", done: () => load() };
    return [
      ["Connect YouTube", () => openConnect("youtube", ctx, here), true],
      on("podcasts") ? ["Add a podcast feed", () => openConnect("podcast", ctx, here)] : null,
      ["Add your Substack", () => openConnect("substack", ctx, here)],
      ["All connections", "/orbe-site/demo/app/connections"],
    ].filter(Boolean);
  }

  function emptyView() {
    const filtered = Object.values(st.filters).some(Boolean);
    return st.q
      ? emptyState("search", `Nothing called "${st.q}" here.`, [["Clear the search", () => { searchInput.value = ""; st.q = ""; load(); }]])
      : filtered
        ? emptyState("filter", "No works match these filters.", [["Clear filters", () => { st.filters = { account: "", band: "", fix: "", sponsor: false, from: "", to: "" }; load(); }]])
        : st.view === "favourites"
          ? emptyState("star", "Star the works you come back to, and they wait here.", [["See all works", () => { st.view = "all"; load(); }]])
          : st.view.startsWith("col:")
            ? emptyState("folder", "This collection is empty.", [["Add works", () => { st.view = "all"; load(); }]], "Select works in the table and add them, or add one from its page.")
            : emptyState("library", "Your works show here once Orbe can read an account of yours.", connectActions(), "Every video, episode and post, each rated against creators the same size.");
  }

  function draw(keepPlace = false) {
    modes.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-checked", String(["table", "gallery"][i] === st.mode)));
    drawColsMenu();
    if (!data) return;
    if (!data.total) {
      table?.destroy();
      table = null;
      stage.replaceChildren(emptyView());
      more.replaceChildren();
      return;
    }
    if (st.mode === "gallery") {
      table?.destroy();
      table = null;
      return drawGallery();
    }
    more.replaceChildren();
    const top = keepPlace && table ? table.body.scrollTop : 0;
    table?.destroy();
    const cols = columnsFor();
    table = virtualTable({
      label: "Works",
      columns: cols,
      rowHeight: phone.matches ? 60 : 48,
      overscan: phone.matches ? 12 : 6,
      total: data.total,
      rowAt: (i) => rows[i] ?? null,
      href: (w) => `/orbe-site/demo/app/works/${seg(w.id)}`,
      selection,
      sort: { key: st.sort, dir: st.dir },
      totals: !phone.matches,
      onSort: (key) => {
        if (st.sort === key) st.dir = st.dir === "asc" ? "desc" : "asc";
        else {
          st.sort = key;
          st.dir = NAMED_DIR.has(key) ? "asc" : "desc";
        }
        load();
      },
      onNeed: (i) => {
        if (i >= rows.length && cursor) fetchMore(Math.min(500, Math.max(PAGE, i - rows.length + 60)));
      },
      onNear: (last) => {
        if (last + AHEAD > rows.length && cursor) fetchMore(PAGE);
      },
      onToggle: (w) => (can("content") ? toggle(w) : null),
    });
    stage.replaceChildren(table.el);
    table.setTotals(totalsRow(cols));
    // Measured after the first frame has laid the page out, so reading it costs nothing extra.
    requestAnimationFrame(() => setTimeout(fit));
    if (top) table.body.scrollTop = top;
  }

  function totalsRow(cols) {
    const t = data.totals;
    const reach = t.reach[0];
    return cols.map((c) => {
      const cell = (v) => h("div", { class: "cn-vt-td", "data-align": c.align ?? null }, v);
      switch (c.key) {
        case "title": return cell(h("b", null, `${count(t.works)} ${t.works === 1 ? "work" : "works"}`));
        case "reach": return cell(reach ? h("span", { class: "cn-num", title: t.reach.map((r) => `${count(r.value)} ${r.label}`).join(", ") }, short(reach.value), h("small", null, ` ${reach.label.split(" ")[0]}`)) : "");
        case "rating": return cell(t.averageRating === null ? "" : h("span", { class: "cn-num", title: `Average of ${count(t.rated)} rated` }, signed(t.averageRating)));
        case "sponsor": return cell(t.sponsorReads ? `${count(t.sponsorReads)} with a read` : "");
        case "deals": return cell(t.deals ? h("span", { class: "cn-num" }, count(t.deals)) : "");
        case "clips": return cell(t.clips ? h("span", { class: "cn-num" }, count(t.clips)) : "");
        case "starred": return cell(t.starred ? h("span", { class: "cn-num" }, count(t.starred)) : "");
        default: return cell("");
      }
    });
  }

  /** The table fills the screen below its header, so the page itself does not scroll twice. */
  function fit() {
    if (!table) return;
    const top = table.body.getBoundingClientRect().top + window.scrollY;
    const foot = phone.matches ? 16 : 64;
    table.body.style.height = `${Math.max(320, window.innerHeight - (top - window.scrollY) - foot)}px`;
  }
  let fitFrame = 0;
  const onResize = () => {
    if (!fitFrame) fitFrame = requestAnimationFrame(() => { fitFrame = 0; fit(); });
  };
  window.addEventListener("resize", onResize, { passive: true });
  phone.addEventListener?.("change", () => draw());

  /* ---------------------------------------------------------------- gallery */
  const card = (w) => {
    const dur = duration(w.durationSec);
    return h("article", { class: "cn-work" },
      starBtn(w, "cn-star"),
      h("a", { class: "cn-work-open", href: `/orbe-site/demo/app/works/${seg(w.id)}`, "aria-label": `Open ${w.title}` },
        h("span", { class: "cn-work-art" },
          w.thumb ? h("img", { class: "cn-work-img", src: w.thumb, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }) : cover(w.id, w.kind, strength(w)),
          h("span", { class: "cn-work-kind" }, KIND_ONE[w.kind] ?? w.kind),
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
  function drawGallery() {
    stage.replaceChildren(h("div", { class: "cn-works", "data-size": "m" }, rows.filter(Boolean).map(card)));
    more.replaceChildren(...(cursor ? [h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => fetchMore() }, `Load ${Math.min(PAGE, data.total - rows.length)} more`)] : []));
  }

  document.addEventListener("keydown", function slash(e) {
    if (!main.isConnected) return document.removeEventListener("keydown", slash);
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "")) {
      e.preventDefault();
      searchInput.focus();
    }
  });

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
        h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: `/orbe-site/demo/app/works/${seg(w.id)}` }, icon("doc"), "Open its record"),
        w.url ? h("a", { class: "cn-btn cn-btn--s", href: w.url, target: "_blank", rel: "noopener" }, icon("external"), "Open on YouTube") : null,
        h("a", { class: "cn-btn cn-btn--s", href: `/orbe-site/demo/app/runs?${new URLSearchParams({ run: "1", tool: "rate-work", q: w.title })}` }, icon("studio"), "Run it"),
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
            h("div", { class: "cn-dw-sec-h" }, h("h3", null, tile("products/fix/", "fix", h, "s"), "Fix"), upload?.diagnosis ? h("span", { class: `cn-pill cn-pill--${upload.diagnosis.status === "on_track" ? "done" : "needs"}` }, h("span", { class: "cn-pill-dot" }), upload.diagnosis.status === "on_track" ? "On track" : "Behind") : null),
            h("p", null, upload?.diagnosis?.why ?? "Fix looks at uploads from 1 to 60 days old. This one is outside that window."),
            fixRows.length ? h("p", null, `${fixRows.length} fix${fixRows.length === 1 ? "" : "es"} on this work: ${fixRows.map((f) => f.state).join(", ")}.`) : null,
            upload && upload.diagnosis.status !== "on_track" ? h("a", { class: "cn-btn cn-btn--s cn-btn--primary", href: "/orbe-site/demo/app/fix" }, "See options in Fix") : null,
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
