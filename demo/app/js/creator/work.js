/*
  One work's own record, opened from the Library: what happened to it (the
  timeline Orbe builds from what it holds, each event linked to its source),
  notes and script kept in versions with a compare between any two,
  documents (links, or a small PDF or text file), and read-only share links
  that show only what is ticked. Not file storage: video stays where it is.
*/
import { api, apiHref, can, on, seg } from "../api.js";
import { retentionTab } from "./retention.js";
import { ago, cover, emptyState, section, toolShell } from "../console-ui.js";
import { icon } from "../icons.js";
import { KINDS } from "../terms.js";
import { action, actions, block, day, failure, h, signed, tabs, toast } from "../ui.js";

const W = (id) => `/v1/me/works/${seg(id)}`;
const MAX_BYTES = 5 * 1024 * 1024;

/** Lines removed and added between two texts, by their longest common run. Small inputs only, so a plain table does. */
export function lineDiff(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = x.length, m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) (out.push([" ", x[i]]), i++, j++);
    else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", x[i++]]);
    else out.push(["+", y[j++]]);
  }
  while (i < n) out.push(["-", x[i++]]);
  while (j < m) out.push(["+", y[j++]]);
  return out;
}

const KIND_ICON = { published: "play", read: "chart", rated: "chart", fix: "sparkle", booked: "megaphone", linked: "link", measured: "pulse", outcome: "check" };

function timelineTab(el, id) {
  // Sponsor reads are deals: left out for a role that does not see money.
  const DEALS = new Set(["booked", "linked", "measured", "outcome"]);
  block(el, () => api.get(`${W(id)}/timeline`), ({ timeline: all }) => {
    const timeline = can("read.money") ? all : all.filter((e) => !DEALS.has(e.kind));
    return timeline.length
      ? h("ol", { class: "cn-tl" }, timeline.map((e) =>
          h("li", { class: "cn-tl-item" },
            h("span", { class: "cn-tl-ico", "aria-hidden": "true" }, icon(KIND_ICON[e.kind] ?? "dots")),
            h("div", { class: "cn-tl-main" },
              h("p", { class: "cn-tl-t" }, e.title, h("time", { datetime: e.at }, day(e.at))),
              e.line ? h("p", { class: "cn-tl-d" }, e.line) : null,
              e.source ? h("a", { class: "cn-tl-src", href: e.source.startsWith("/v1/") ? apiHref(e.source) : e.source, target: /^https?:/.test(e.source) || e.source.startsWith("/v1/") ? "_blank" : null, rel: "noopener" }, "Source", icon("arrowRight")) : null,
            ),
          ),
        ))
      : emptyState("clock", "Nothing has happened to this work yet.");
  });
}

function notesTab(el, id) {
  const text = h("textarea", { class: "cn-notes-text", rows: 14, maxlength: 50000, "aria-label": "Notes and script", placeholder: "Notes, the script, what to try next time.", readonly: !can("content") });
  const versions = h("div", { class: "cn-notes-versions" });
  const compare = h("div", { class: "cn-notes-compare", "aria-live": "polite" });
  let latest = null;
  let list = [];
  const draw = (r) => {
    latest = r.latest;
    list = r.versions;
    if (document.activeElement !== text) text.value = r.latest?.body ?? "";
    versions.replaceChildren(
      list.length
        ? h("ol", { class: "cn-vlist" }, list.map((v) => h("li", null, h("span", { class: "cn-vlist-n" }, `Version ${v.version}`), h("span", { class: "cn-item-d" }, `${v.chars.toLocaleString("en-GB")} characters`), h("time", { datetime: v.createdAt }, ago(v.createdAt)))))
        : h("p", { class: "cn-item-d" }, "Every save is kept as a version."),
    );
    compare.replaceChildren(...(list.length >= 2 ? comparer() : [h("p", { class: "cn-item-d" }, "Save twice to compare two versions.")]));
  };
  function comparer() {
    const pick = (label, value) => h("select", { class: "ob-input ap-select", "aria-label": label }, list.map((v) => h("option", { value: String(v.version), selected: v.version === value }, `Version ${v.version}`)));
    const a = pick("Older version", list[1].version);
    const b = pick("Newer version", list[0].version);
    const out = h("div", { class: "cn-diff" });
    const run = async () => {
      try {
        const [x, y] = await Promise.all([api.get(`${W(id)}/notes/${a.value}`), api.get(`${W(id)}/notes/${b.value}`)]);
        const rows = lineDiff(x.note.body, y.note.body);
        out.replaceChildren(...rows.map(([k, line]) => h("div", { class: `cn-diff-row${k === "+" ? " is-add" : k === "-" ? " is-del" : ""}` }, h("span", { "aria-hidden": "true" }, k), h("span", null, k === "+" ? h("span", { class: "ob-sr" }, "Added: ") : k === "-" ? h("span", { class: "ob-sr" }, "Removed: ") : null, line || " "))));
      } catch (e) {
        out.replaceChildren(failure(e));
      }
    };
    a.addEventListener("change", run);
    b.addEventListener("change", run);
    run();
    return [h("div", { class: "cn-diff-pick" }, a, icon("arrowRight"), b), out];
  }
  const save = action("Save a version", async () => {
    const r = await api.put(`${W(id)}/notes`, { body: text.value });
    draw(r);
    return r.saved ? `Saved as version ${r.latest.version}.` : "No change to save.";
  }, { primary: true });
  el.append(
    h("div", { class: "cn-notes" },
      section({ title: "Notes and script", line: "Kept in versions: every save stays, and any two can be compared." }, text, can("content") ? actions(save) : null),
      h("div", { class: "cn-notes-side" }, section({ title: "Versions" }, versions), section({ title: "Compare" }, compare)),
    ),
  );
  block(versions, () => api.get(`${W(id)}/notes`), (r) => (draw(r), versions.childNodes[0] ?? null));
  void latest;
}

function documentsTab(el, id) {
  const list = h("div");
  const reload = () =>
    block(list, () => api.get(`${W(id)}/documents`), ({ documents }) =>
      documents.length
        ? h("ul", { class: "cn-docs" }, documents.map((d) =>
            h("li", { class: "cn-doc" },
              h("span", { class: "cn-doc-ico", "aria-hidden": "true" }, icon(d.kind === "link" ? "link" : "doc")),
              h("div", { class: "cn-doc-main" },
                d.kind === "link" ? h("a", { href: d.url, target: "_blank", rel: "noopener" }, d.title) : h("a", { href: apiHref(`${W(id)}/documents/${seg(d.id)}/file`) }, d.title),
                h("p", { class: "cn-item-d" }, d.kind === "link" ? new URL(d.url).hostname : `${d.mediaType === "application/pdf" ? "PDF" : "Text"}, ${Math.max(1, Math.round(d.size / 1024))} KB`, `, added ${day(d.createdAt)}`),
              ),
              can("content") && actions(action("Remove", async () => {
                await api.del(`${W(id)}/documents/${seg(d.id)}`);
                reload();
                return "Removed.";
              }, { danger: true, confirm: `Remove ${d.title}?` })),
            ),
          ))
        : emptyState("doc", "No documents on this work yet.", [], "Briefs, contracts and licences as PDF or text, or a link to where the footage lives."),
    );
  const linkTitle = h("input", { class: "ob-input", name: "title", placeholder: "Edit on Frame.io", maxlength: 120, required: true, "aria-label": "Link name" });
  const linkUrl = h("input", { class: "ob-input", name: "url", type: "url", placeholder: "https://", required: true, "aria-label": "Link address" });
  const linkForm = h("form", { class: "cn-doc-form", onsubmit: async (e) => {
    e.preventDefault();
    try {
      await api.post(`${W(id)}/documents/link`, { title: linkTitle.value.trim(), url: linkUrl.value.trim() });
      e.target.reset();
      toast("Link added.");
      reload();
    } catch (err) {
      if (err.code !== "sent_to_owner") toast(err.message);
    }
  } }, linkTitle, linkUrl, h("button", { class: "cn-btn cn-btn--s", type: "submit" }, icon("link"), "Add link"));
  const file = h("input", { class: "ob-sr", type: "file", accept: "application/pdf,text/plain,text/markdown,.md,.txt,.pdf", id: "doc-file" });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    file.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) return toast("Documents are up to 5 MB. Link to anything larger.");
    const type = f.type || (/\.md$/i.test(f.name) ? "text/markdown" : /\.txt$/i.test(f.name) ? "text/plain" : "");
    try {
      await api.upload(`${W(id)}/documents/file`, f, type, f.name.replace(/\.[^.]+$/, ""));
      toast(`${f.name} added.`);
      reload();
    } catch (err) {
      if (err.code !== "sent_to_owner") toast(err.message);
    }
  });
  el.append(
    section({ title: "Documents", line: "Links to where the footage lives, and small documents: PDF or text, up to 5 MB. Only you can open them." },
      list,
      can("content") ? h("div", { class: "cn-doc-add" }, linkForm, h("label", { class: "cn-btn cn-btn--s", for: "doc-file" }, icon("plus"), "Add a PDF or text file"), file) : null,
    ),
  );
  reload();
}

function shareTab(el, id) {
  const list = h("div");
  const made = h("div", { "aria-live": "polite" });
  const reload = () =>
    block(list, () => api.get(`${W(id)}/shares`), ({ shares }) =>
      shares.length
        ? h("ul", { class: "cn-list" }, shares.map((x) =>
            h("li", { class: "cn-share" },
              h("div", null,
                h("p", { class: "cn-item-t" }, x.label ?? "Share link", h("span", { class: `cn-pill cn-pill--${x.live ? "done" : "off"}` }, h("span", { class: "cn-pill-dot" }), x.live ? "Live" : x.revokedAt ? "Revoked" : "Expired")),
                h("p", { class: "cn-item-d" }, `${[x.parts.timeline && "timeline", x.parts.rating && "rating", x.parts.deliveries && "sponsor reads", x.parts.documents.length && `${x.parts.documents.length} document${x.parts.documents.length === 1 ? "" : "s"}`].filter(Boolean).join(", ")}. ${x.live ? `Until ${day(x.expiresAt)}.` : ""}`),
              ),
              x.live ? actions(action("Revoke", async () => {
                await api.del(`${W(id)}/shares/${seg(x.id)}`);
                reload();
                return "Revoked. The link stops working at once.";
              }, { danger: true })) : null,
            ),
          ))
        : emptyState("link", "No share links yet.", [], "A brand, an editor or a buyer sees only what you tick, until the link expires or you revoke it."),
    );
  const box = (name, label, checked) => h("label", { class: "cn-tick" }, h("input", { type: "checkbox", name, checked }), h("span", null, label));
  const docs = h("div", { class: "cn-ticks" });
  api.get(`${W(id)}/documents`).then(({ documents }) => docs.replaceChildren(...documents.map((d) => box(`doc:${d.id}`, d.title, false)))).catch(() => {});
  const days = h("select", { class: "ob-input ap-select", name: "days", "aria-label": "Lasts" }, [[1, "1 day"], [7, "7 days"], [30, "30 days"], [90, "90 days"]].map(([v, t]) => h("option", { value: String(v), selected: v === 7 }, t)));
  const label = h("input", { class: "ob-input", name: "label", maxlength: 80, placeholder: "For the brand", "aria-label": "Who it is for" });
  const f = h("form", { class: "cn-share-form", onsubmit: async (e) => {
    e.preventDefault();
    const d = new FormData(f);
    try {
      const r = await api.post(`${W(id)}/shares`, {
        parts: { timeline: d.has("timeline"), rating: d.has("rating"), deliveries: d.has("deliveries"), documents: [...d.keys()].filter((k) => k.startsWith("doc:")).map((k) => k.slice(4)) },
        days: Number(days.value),
        label: label.value.trim() || undefined,
      });
      const link = h("input", { class: "ob-input", readonly: true, value: r.url, "aria-label": "Share link", onfocus: (ev) => ev.target.select() });
      made.replaceChildren(h("div", { class: "cn-banner" }, h("p", null, r.notice), h("div", { class: "cn-doc-form" }, link, h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "button", onclick: async () => { try { await navigator.clipboard.writeText(r.url); toast("Link copied."); } catch { link.select(); } } }, icon("copy"), "Copy"))));
      reload();
    } catch (err) {
      if (err.code !== "sent_to_owner") toast(err.message);
    }
  } },
    h("fieldset", { class: "cn-ticks" }, h("legend", null, "Show"), box("timeline", "Timeline", true), box("rating", "Rating", true), box("deliveries", "Sponsor reads and proof", false)),
    h("fieldset", null, h("legend", null, "Documents"), docs),
    h("div", { class: "cn-doc-form" }, label, days, h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "submit" }, "Make a link")),
  );
  el.append(section({ title: "Share a read-only link", line: "For a brand, an editor or a buyer. Never indexed; shown once; ends when it expires or you revoke it." }, f, made), section({ title: "Your links" }, list));
  reload();
}

export async function render(main, ctx) {
  const id = ctx.params.id;
  const body = toolShell(main, { title: "Work", back: ["Library", "/orbe-site/demo/app/library"] });
  await block(body, () => api.get(W(id)), ({ work: w }) => {
    main.querySelector(".ap-h1").textContent = w.title;
    document.title = `${w.title}: Orbe`;
    const head = main.querySelector(".cn-tp-head");
    head.prepend(h("span", { class: "cn-work-thumb" }, cover(w.id, w.kind, w.rating ? (w.rating.rating + 1.5) / 3 : 0.3)));
    head.querySelector(".cn-tp-path b").textContent = w.account.handle;
    return [
      h("p", { class: "cn-tp-line" }, [KINDS[w.kind] ?? w.kind, `published ${day(w.publishedAt)}`, w.rating ? `rated ${signed(w.rating.rating)} against creators the same size` : "not rated yet"].join(", "), ".", w.url ? [" ", h("a", { href: w.url, target: "_blank", rel: "noopener" }, "Open the work")] : null),
      h("div", { class: "cn-tp-actions" }, h("a", { class: "cn-btn cn-btn--s", href: apiHref(`${W(id)}/export`) }, icon("doc"), "Export everything")),
      tabs("work", [
        { id: "timeline", label: "Timeline", render: (el) => timelineTab(el, id) },
        { id: "notes", label: "Notes", render: (el) => notesTab(el, id) },
        { id: "documents", label: "Documents", render: (el) => documentsTab(el, id) },
        on("retention") && w.kind === "youtube" ? { id: "viewers", label: "Viewers", render: (el) => retentionTab(el, id) } : null,
        // Sharing is consent: the owner's, or a manager's request for the owner.
        can("consent") ? { id: "share", label: "Share", render: (el) => shareTab(el, id) } : null,
      ].filter(Boolean), ctx.query.get("tab")),
    ];
  });
}
