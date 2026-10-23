/*
  Drop in a video. One screen with two views:

    /app/media       drop a video in (it uploads in chunks and resumes if
                     the connection drops), and every video so far
    /app/media/:id   one video: the player and its steps (checked,
                     transcribed, moments found), then Moments, Clips,
                     Words and Send

  Orbe's judgement is in each: moments are ranked against creators the same
  size; a paid read is never cut in half, and anything carrying one shows
  its disclosure; words cite what was said; nothing leaves Orbe without a
  tap, and a manager's send goes to the owner first.
*/
import { api, apiHref, asks, can, on, seg } from "../api.js";
import { TOOLS, tile } from "../catalogue.js";
import { ago, cover, drawer, emptyState, pill, section, segmented, skeleton, toolShell } from "../console-ui.js";
import { icon } from "../icons.js";
import { confirmBox, failure, h, notThere, tabs, toast } from "../ui.js";
import { nameHere } from "../shell.js";

/* A bar's fill, its width set through the style object: the console's Content Security Policy refuses style attributes. */
const fillTo = (cls, pct) => {
  const el = h("span", { class: cls });
  el.style.width = `${pct}%`;
  return el;
};

const I = (id) => `/v1/me/media/items/${seg(id)}`;
const TYPES = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska" };
/** replaceChildren without nulls: a missing part is left out, never written as "null". */
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clock = (sec) => {
  const t = Math.max(0, Math.floor(sec));
  const hh = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${hh ? `${hh}:${String(m).padStart(2, "0")}` : m}:${String(t % 60).padStart(2, "0")}`;
};
const size = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1).replace(/\.0$/, "")} GB` : b >= 1024 ** 2 ? `${Math.round(b / 1024 ** 2)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ASPECTS = [["9:16", "9:16"], ["1:1", "1:1"], ["16:9", "16:9"]];
const STATUS = { uploading: ["running", "Arriving"], uploaded: ["running", "Checking"], ready: ["done", "Ready"], failed: ["failed", "Could not use it"] };
const STEP_NAMES = { probe: "Checked", transcribe: "Transcribed", moments: "Moments found", render: "Clip", draft: "Words" };
const DRAFTS = [["article", "Article"], ["newsletter", "Newsletter"], ["show_notes", "Show notes"]];
const STATUS_PILL = { live: ["live", "Live"], needs_approval: ["needs", "Needs approval"], needs_key: ["coming", "Export"], export_only: ["coming", "Export"], coming: ["coming", "Export"] };
/* TikTok's privacy levels, as its creator_info names them; none is chosen for the person (TikTok's rule). */
const TIKTOK_PRIVACY = [["PUBLIC_TO_EVERYONE", "Everyone"], ["MUTUAL_FOLLOW_FRIENDS", "Friends"], ["FOLLOWER_OF_CREATOR", "Followers"], ["SELF_ONLY", "Only me"]];
const YOUTUBE_PRIVACY = [["public", "Public"], ["unlisted", "Unlisted"], ["private", "Private"]];

export async function render(main, ctx) {
  if (ctx.params.id) return one(main, ctx.params.id, ctx);
  return list(main);
}

/* ---------------------------------------------------------------- every video, and the drop zone */

async function list(main) {
  const t = TOOLS.find((x) => x.id === "media");
  const body = toolShell(main, {
    tool: t,
    title: "Drop in a video",
    line: "Clips for every format with captions in your style, moments ranked against creators your size, and words from what you said. Paid reads are never cut in half.",
    tags: [["9:16, 1:1 and 16:9"], ["Captions"], ["Article, newsletter, show notes"], ["Paid reads kept whole", "sky"]],
    tile: t ? tile(t.glyph, t.k, h, "l") : null,
    back: ["Library", "/orbe-site/demo/app/library"],
  });
  const note = h("div");
  const uploads = h("div", { class: "cn-md-uploads", "aria-live": "polite" });
  const grid = h("div", { class: "cn-md-grid" }, skeleton(3, "cn-md-skel"));
  const input = h("input", { class: "ob-sr", type: "file", accept: "video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv", multiple: true, id: "md-file" });
  const zone = h("label", { class: "cn-md-drop", for: "md-file" },
    h("span", { class: "cn-md-drop-ico", "aria-hidden": "true" }, icon("plus")),
    h("span", { class: "cn-md-drop-t" }, "Drop a video here, or choose one"),
    h("span", { class: "cn-md-drop-d" }, "MP4, MOV, WebM or MKV, up to 4 GB and three hours. It carries on if your connection drops."),
  );
  let limits = { chunkBytes: 8 * 1024 * 1024 };
  const take = (files) => {
    for (const f of files) upload(f);
  };
  input.addEventListener("change", () => {
    take([...(input.files ?? [])]);
    input.value = "";
  });
  for (const ev of ["dragenter", "dragover"]) zone.addEventListener(ev, (e) => (e.preventDefault(), zone.classList.add("is-over")));
  for (const ev of ["dragleave", "drop"]) zone.addEventListener(ev, () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    take([...(e.dataTransfer?.files ?? [])].filter((f) => /^video\//.test(f.type) || /\.(mp4|m4v|mov|webm|mkv)$/i.test(f.name)));
  });

  async function upload(file) {
    const type = file.type && Object.values(TYPES).includes(file.type) ? file.type : TYPES[(file.name.split(".").pop() ?? "").toLowerCase()];
    const bar = h("span", { class: "cn-md-bar-fill" });
    const label = h("span", { class: "cn-md-up-d" }, "Starting");
    const row = h("div", { class: "cn-md-up" }, h("span", { class: "cn-md-up-t" }, file.name), label, h("span", { class: "cn-md-bar", role: "progressbar", "aria-label": `${file.name} uploading` }, bar));
    uploads.prepend(row);
    try {
      if (!type) throw new Error("Send an MP4, MOV, WebM or MKV video.");
      const made = await api.post("/v1/me/media/items", { fileName: file.name.slice(0, 200), size: file.size, type, title: file.name.replace(/\.[^.]+$/, "").slice(0, 140) });
      let at = made.upload.received;
      const step = made.upload.chunkBytes ?? limits.chunkBytes;
      while (at < file.size) {
        const end = Math.min(file.size, at + step);
        for (let tries = 0; ; tries++) {
          try {
            const r = await api.chunk(`${I(made.item.id)}/upload`, file.slice(at, end), at, file.size);
            at = r.received;
            break;
          } catch (e) {
            if (e.code === "upload_gap" && typeof e.details?.received === "number") {
              at = e.details.received;
              break;
            }
            if (tries >= 4) throw e;
            label.textContent = "Connection dropped. Trying again.";
            await sleep(1000 * 2 ** tries);
          }
        }
        const share = at / file.size;
        bar.style.width = `${(share * 100).toFixed(1)}%`;
        row.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(Math.round(share * 100)));
        label.textContent = `${size(at)} of ${size(file.size)}`;
      }
      label.textContent = "Arrived. Checking it.";
      row.classList.add("is-done");
      toast(`${file.name} arrived.`, [`Open it`, `/orbe-site/demo/app/media/${made.item.id}`]);
      load();
    } catch (e) {
      row.classList.add("is-failed");
      label.textContent = e.message;
    }
  }

  async function load() {
    try {
      const o = await api.get("/v1/me/media");
      limits = o.limits ?? limits;
      put(meter, usageStrip(o.usage));
      put(note, 
        o.transcription.configured
          ? null
          : h("div", { class: "cn-banner cn-banner--warn" }, icon("bolt"), h("p", null, "Clips work now. Transcripts, moments and words need a transcription key on the server, so they wait until one is added.")),
      );
      put(grid, 
        ...(o.items.length
          ? o.items.map((it) => {
              const [state, text] = STATUS[it.status] ?? ["idle", it.status];
              return h("a", { class: "cn-md-card", href: `/orbe-site/demo/app/media/${it.id}` },
                h("span", { class: "cn-md-cover" }, cover(it.id, "also", 0.55), it.durationSec ? h("span", { class: "cn-md-dur" }, clock(it.durationSec)) : null),
                h("span", { class: "cn-md-card-t" }, it.title),
                h("span", { class: "cn-md-card-d" }, pill(state, it.status === "uploading" ? `Arriving, ${Math.floor((it.received / it.size) * 100)}%` : text), h("span", null, ago(it.createdAt))),
              );
            })
          : [emptyState("play", "No videos yet.", [], "Drop one in above. Orbe finds the moments, makes the clips and writes it up.")]),
      );
    } catch (e) {
      put(grid, failure(e, load));
    }
  }

  const meter = h("div");
  body.append(note, meter, can("content") ? zone : null, input, uploads, section({ title: "Your videos" }, grid));
  load();
}

/*
  The month's allowance, plainly: free, with more unlocked by every
  sponsorship settled through Orbe. Creator Pro is mentioned only as an
  optional extra for heavy video work, never as the way to the core.
*/
function usageStrip(u) {
  if (!u) return null;
  const bar = (used, of) => h("span", { class: "cn-md-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(Math.round(of)), "aria-valuenow": String(Math.round(used)) }, fillTo(`cn-md-bar-fill${used >= of ? " is-full" : ""}`, Math.min(100, (used / Math.max(1, of)) * 100).toFixed(1)));
  const renews = new Date(u.resetsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  const out = u.minutes.left <= 0;
  return h("section", { class: `cn-md-usage${out ? " is-out" : ""}`, "aria-label": "This month's allowance" },
    h("div", { class: "cn-md-use" },
      h("p", { class: "cn-md-use-k" }, "Video minutes"),
      h("p", { class: "cn-md-use-v" }, h("b", null, `${Math.round(u.minutes.used)}`), ` of ${u.minutes.monthly}`),
      bar(u.minutes.used, u.minutes.monthly),
    ),
    h("div", { class: "cn-md-use" },
      h("p", { class: "cn-md-use-k" }, "Storage"),
      h("p", { class: "cn-md-use-v" }, h("b", null, size(u.storage.used)), ` of ${size(u.storage.allowance)}`),
      bar(u.storage.used, u.storage.allowance),
    ),
    h("div", { class: "cn-md-use" },
      h("p", { class: "cn-md-use-k" }, "Sends"),
      h("p", { class: "cn-md-use-v" }, h("b", null, String(u.sends.used)), ` of ${u.sends.allowance}`),
      bar(u.sends.used, u.sends.allowance),
    ),
    h("p", { class: "cn-md-use-note" },
      out ? `This month's minutes are used. They renew on ${renews}. ` : `Free, and renews on ${renews}. `,
      u.minutes.unlocked ? `${u.minutes.unlocked} of your minutes come from sponsorships settled through Orbe. ` : `Every £100 you are paid through a sponsorship on Orbe adds ${u.settled.perHundred.minutes} minutes a month. `,
      u.pro.offered ? h("a", { href: "/orbe-site/demo/app/settings/plan" }, "Heavy video work? Creator Pro adds more, optionally.") : null,
    ),
  );
}

/* ---------------------------------------------------------------- one video */

async function one(main, id, ctx) {
  const body = toolShell(main, { title: "Video", back: ["Videos", "/orbe-site/demo/app/media"] });
  const st = { d: null, style: { on: true, font: "sans", size: "medium", colour: "paper", position: "lower", words: 4, box: true }, redraw: new Set() };
  const player = h("video", { class: "cn-md-player", controls: true, preload: "metadata", playsinline: true });
  const status = h("div", { class: "cn-md-status" }, skeleton(3));
  let timer = null;

  async function refresh() {
    try {
      st.d = await api.get(I(id));
    } catch (e) {
      // A video that is not there is a page of its own, without the tool under it.
      if (e.code === "video_not_found") {
        nameHere("Not found");
        notThere(main, "No video with that address", "It may have been deleted, or the link is mistyped.", ["Back to your videos", "/orbe-site/demo/app/media"]);
      } else put(status, failure(e, refresh));
      return;
    }
    const d = st.d;
    main.querySelector(".ap-h1").textContent = d.item.title;
    document.title = `${d.item.title}: Orbe`;
    if (d.item.status === "ready" && !player.src) player.src = `${apiHref(`${I(id)}/source`)}#t=0.5`;
    drawStatus();
    for (const f of st.redraw) f();
    const busy = d.item.status === "uploaded" || d.jobs.some((j) => j.status === "queued" || j.status === "running");
    clearTimeout(timer);
    if (busy && main.isConnected) timer = setTimeout(refresh, 1500);
  }

  function drawStatus() {
    const d = st.d;
    const latest = (k) => d.jobs.find((j) => j.kind === k);
    const steps = ["probe", "transcribe", "moments"].map((k) => {
      const j = latest(k);
      const done = k === "probe" ? d.item.status === "ready" : k === "transcribe" ? Boolean(d.transcript) : d.moments.length > 0;
      const state = j?.status === "running" ? "running" : j?.status === "queued" ? "running" : done ? "done" : j?.status === "failed" ? "failed" : "idle";
      return h("li", { class: "cn-md-step" },
        pill(state, STEP_NAMES[k]),
        state === "running" ? h("span", { class: "cn-md-bar" }, fillTo("cn-md-bar-fill", Math.round((j?.progress ?? 0) * 100))) : null,
        state === "failed" ? h("span", { class: "cn-item-d" }, j.error) : null,
      );
    });
    const reads = d.transcript?.reads ?? [];
    put(status, 
      h("ul", { class: "cn-md-steps" }, steps),
      d.item.status === "failed" ? h("p", { class: "cn-banner cn-banner--warn" }, d.item.error) : null,
      d.item.probe ? h("p", { class: "cn-item-d" }, `${clock(d.item.durationSec)}, ${d.item.probe.width} by ${d.item.probe.height}, ${size(d.item.size)}${d.transcript ? `. Transcribed by ${d.transcript.provider}` : ""}.`) : null,
      reads.length
        ? h("div", { class: "cn-md-read" }, h("span", { class: "cn-tag cn-tag--straw" }, "Paid read"), h("p", null, reads.map((r) => `${r.brand ?? "A sponsor"}, ${clock(r.s)} to ${clock(r.e)}`).join("; "), ". Clips keep it whole, with its disclosure, or leave it out."))
        : null,
      d.priors?.expected ? h("p", { class: "cn-item-d" }, `For channels your size, Shorts usually reach ${d.priors.expected.p25.toLocaleString("en-GB")} to ${d.priors.expected.p75.toLocaleString("en-GB")} ${d.priors.expected.metric}. Moments are ranked against that.`) : null,
      linker(),
    );
  }

  function linker() {
    const d = st.d;
    if (!can("content")) return null;
    const sel = h("select", { class: "ob-input ap-select", "aria-label": "The work this video became" }, h("option", { value: "" }, d.item.workId ? "Linked to a work" : "Not linked to a work yet"));
    api.get("/v1/me/works?limit=30&sort=newest").then(({ works }) => {
      put(sel, h("option", { value: "" }, "Not linked to a work"), ...works.map((w) => h("option", { value: w.id, selected: w.id === d.item.workId }, w.title)));
    }).catch(() => {});
    sel.addEventListener("change", async () => {
      try {
        await api.patch(I(id), sel.value ? { workId: sel.value } : { unlink: true });
        toast(sel.value ? "Linked. Its clips, words and sends now show on the work's record." : "Unlinked.");
      } catch (e) {
        toast(e.message);
      }
    });
    return h("div", { class: "cn-md-link" }, h("label", null, h("span", { class: "cn-item-d" }, "Its record"), sel), d.item.workId ? h("a", { class: "cn-btn cn-btn--xs", href: `/orbe-site/demo/app/works/${seg(d.item.workId)}?tab=clips` }, "Open the work") : null);
  }

  const watch = (f) => (st.redraw.add(f), f);

  body.append(
    h("div", { class: "cn-md-top" }, h("div", { class: "cn-md-stage" }, player), section({ title: "Steps", cls: "cn-md-side" }, status)),
    tabs("media", [
      { id: "moments", label: "Moments", render: (el) => momentsTab(el) },
      { id: "clips", label: "Clips", render: (el) => clipsTab(el) },
      { id: "words", label: "Words", render: (el) => wordsTab(el) },
      can("consent") || asks("consent") ? { id: "send", label: "Send", render: (el) => sendTab(el) } : null,
    ].filter(Boolean), ctx.query.get("tab"), { address: true }),
  );

  /* -------- Moments */
  function momentsTab(el) {
    st.redraw.clear();
    const out = h("div");
    el.append(styleRow(), out);
    watch(() => {
      const d = st.d;
      if (!d) return put(out, skeleton(4));
      if (d.item.status !== "ready") return put(out, emptyState("clock", "The video is still being checked."));
      if (!d.transcript) {
        const tj = d.jobs.find((j) => j.kind === "transcribe");
        return put(out, emptyState("pulse", tj && tj.status !== "failed" && tj.status !== "cancelled" ? "Transcribing." : "No transcript yet.", can("content") && !(tj && ["queued", "running"].includes(tj.status)) ? [["Transcribe it", () => step("transcribe"), true]] : [], tj?.error ?? "Moments and words come from what you said."));
      }
      if (!d.moments.length) return put(out, emptyState("sparkle", "No moments yet.", can("content") ? [["Find moments", () => step("moments"), true]] : []));
      put(out, h("ol", { class: "cn-md-moments" }, d.moments.map((m, i) => momentCard(m, i))));
    })();
  }

  function momentCard(m, i) {
    let aspect = "9:16";
    const carries = m.reasons.some((r) => /paid read/i.test(r));
    return h("li", { class: "cn-md-moment" },
      h("div", { class: "cn-md-score", "aria-label": `Score ${Math.round(m.score)} out of 100` }, h("b", null, String(Math.round(m.score))), h("span", null, i === 0 ? "Best" : "Score")),
      h("div", { class: "cn-md-m-main" },
        h("p", { class: "cn-item-t" }, m.title),
        h("p", { class: "cn-item-d" }, `${clock(m.startSec)} to ${clock(m.endSec)}, ${Math.round(m.endSec - m.startSec)} seconds${m.source === "assistant" ? ", picked with the assistant" : ""}`),
        h("blockquote", { class: "cn-md-quote" }, m.quote),
        h("ul", { class: "cn-md-reasons" }, m.reasons.map((r) => h("li", null, r))),
      ),
      h("div", { class: "cn-md-m-act" },
        carries ? h("span", { class: "cn-tag cn-tag--straw" }, "Carries the paid read") : null,
        h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => preview(m.startSec) }, icon("play"), "Preview"),
        can("content") ? segmented("Format", ASPECTS, aspect, (v) => (aspect = v), { cls: "cn-seg--s" }) : null,
        can("content") ? h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "button", onclick: () => makeClip({ momentId: m.id, startSec: m.startSec, endSec: m.endSec, aspect }) }, "Make the clip") : null,
      ),
    );
  }

  function preview(sec) {
    player.currentTime = sec;
    player.play?.().catch(() => {});
    player.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }

  function styleRow() {
    if (!can("content")) return null;
    const font = h("select", { class: "ob-input ap-select", "aria-label": "Caption font" }, [["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(([v, t]) => h("option", { value: v }, t)));
    font.addEventListener("change", () => (st.style.font = font.value));
    const on = h("input", { type: "checkbox", checked: true });
    on.addEventListener("change", () => (st.style.on = on.checked));
    const swatch = (v, label) => h("button", { class: `cn-md-sw cn-md-sw--${v}`, type: "button", role: "radio", "aria-checked": String(st.style.colour === v), "aria-label": label, onclick: (e) => {
      st.style.colour = v;
      e.currentTarget.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b === e.currentTarget)));
    } });
    return h("div", { class: "cn-md-style", role: "group", "aria-label": "Caption style" },
      h("span", { class: "cn-menu-group" }, "Captions"),
      h("label", { class: "cn-tick" }, on, h("span", null, "On")),
      font,
      segmented("Caption size", [["small", "S"], ["medium", "M"], ["large", "L"]], st.style.size, (v) => (st.style.size = v), { cls: "cn-seg--s" }),
      h("span", { class: "cn-md-sws", role: "radiogroup", "aria-label": "Caption colour" }, swatch("paper", "Paper"), swatch("straw", "Straw"), swatch("sky", "Sky")),
      segmented("Caption position", [["lower", "Low"], ["middle", "Mid"], ["upper", "High"]], st.style.position, (v) => (st.style.position = v), { cls: "cn-seg--s" }),
    );
  }

  async function step(kind, payload) {
    try {
      if (kind === "transcribe") await api.post(`${I(id)}/transcribe`, {});
      else if (kind === "moments") await api.post(`${I(id)}/moments`, {});
      else await api.post(`${I(id)}/drafts`, payload);
      toast(kind === "transcribe" ? "Transcribing." : kind === "moments" ? "Finding moments." : "Writing it.");
      refresh();
    } catch (e) {
      toast(e.message);
    }
  }

  /** A clip: on a cut through a paid read, offers both ways out instead. */
  async function makeClip(b, onDone) {
    try {
      const r = await api.post(`${I(id)}/renders`, { ...b, style: st.style });
      toast("Rendering. It appears under Clips.", ["Clips", `/orbe-site/demo/app/media/${id}?tab=clips`]);
      onDone?.(r);
      refresh();
    } catch (e) {
      if (e.code !== "cuts_paid_read") return toast(e.message);
      const x = e.details;
      drawer("That would cut a paid read", (close) => [
        h("p", null, e.message),
        h("div", { class: "cn-md-ways" },
          h("button", { class: "cn-btn cn-btn--primary", type: "button", onclick: () => (close(), makeClip({ ...b, momentId: undefined, startSec: x.takeWhole.startSec, endSec: x.takeWhole.endSec }, onDone)) }, `Take it whole, ${clock(x.takeWhole.startSec)} to ${clock(x.takeWhole.endSec)}`),
          h("button", { class: "cn-btn", type: "button", onclick: () => (close(), makeClip({ ...b, momentId: undefined, startSec: x.leaveOut.startSec, endSec: x.leaveOut.endSec }, onDone)) }, `Leave it out, ${clock(x.leaveOut.startSec)} to ${clock(x.leaveOut.endSec)}`),
        ),
        h("p", { class: "cn-item-d" }, "Taken whole, the clip shows the disclosure while the read plays."),
      ]);
    }
  }

  /* -------- Clips */
  function clipsTab(el) {
    st.redraw.clear();
    const out = h("div");
    el.append(out);
    watch(() => {
      const d = st.d;
      if (!d) return put(out, skeleton(3));
      if (!d.renders.length) return put(out, emptyState("play", "No clips yet.", [], "Make one from a moment, or trim any part yourself.", ), can("content") && d.item.status === "ready" ? h("div", { class: "cn-md-ways" }, h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => trim({ startSec: 0, endSec: Math.min(30, d.item.durationSec), aspect: "9:16", clip: null }) }, icon("plus"), "Trim a clip yourself")) : null);
      const byClip = new Map();
      for (const r of d.renders) byClip.set(r.clip, [...(byClip.get(r.clip) ?? []), r]);
      put(out, 
        can("content") ? h("div", { class: "cn-md-ways" }, h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => trim({ startSec: 0, endSec: Math.min(30, d.item.durationSec), aspect: "9:16", clip: null }) }, icon("plus"), "Trim a clip yourself")) : null,
        h("div", { class: "cn-md-clips" }, [...byClip.values()].map((revs) => clipCard(revs))),
      );
    })();
  }

  function clipCard(revs) {
    const r = revs[0];
    const [state, text] = r.status === "ready" ? ["done", "Ready"] : r.status === "failed" ? ["failed", "Failed"] : ["running", "Rendering"];
    return h("article", { class: "cn-md-clip" },
      h("div", { class: `cn-md-frame cn-md-frame--${r.aspect.replace(":", "x")}` },
        r.status === "ready" ? h("video", { src: apiHref(`${I(id)}/renders/${seg(r.id)}/file`), controls: true, preload: "metadata", playsinline: true }) : h("span", { class: "cn-md-frame-wait" }, r.status === "failed" ? icon("close") : icon("clock")),
      ),
      h("div", { class: "cn-md-clip-meta" },
        h("p", { class: "cn-item-t" }, `${clock(r.startSec)} to ${clock(r.endSec)}`, pill(state, text)),
        h("p", { class: "cn-item-d" }, `${r.aspect}, revision ${r.revision}${revs.length > 1 ? ` of ${revs.length}` : ""}${r.size ? `, ${size(r.size)}` : ""}${r.crop?.how === "detail" ? ", framed on the detail" : ""}`),
        r.disclosure ? h("span", { class: "cn-tag cn-tag--straw" }, r.disclosure) : null,
        r.error ? h("p", { class: "cn-item-d" }, r.error) : null,
        h("div", { class: "cn-md-ways" },
          r.status === "ready" ? h("a", { class: "cn-btn cn-btn--s", href: apiHref(`${I(id)}/renders/${seg(r.id)}/file?download=1`), download: "" }, icon("doc"), "Download") : null,
          can("content") ? h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => trim({ startSec: r.startSec, endSec: r.endSec, aspect: r.aspect, clip: r.clip, centreX: r.crop?.centreX }) }, icon("sliders"), "Trim or reframe") : null,
        ),
      ),
    );
  }

  function trim(v) {
    const dur = st.d.item.durationSec;
    const s = h("input", { type: "range", min: 0, max: dur, step: 0.1, value: v.startSec, "aria-label": "Start" });
    const e = h("input", { type: "range", min: 0, max: dur, step: 0.1, value: v.endSec, "aria-label": "End" });
    const cx = h("input", { type: "range", min: 0, max: 1, step: 0.01, value: v.centreX ?? 0.5, "aria-label": "Frame from left to right" });
    let auto = typeof v.centreX !== "number";
    cx.addEventListener("input", () => (auto = false));
    const read = h("output", { class: "cn-md-trim-out" });
    const sync = () => {
      if (Number(e.value) < Number(s.value) + 1) e.value = String(Math.min(dur, Number(s.value) + 1));
      read.textContent = `${clock(Number(s.value))} to ${clock(Number(e.value))}, ${Math.round(Number(e.value) - Number(s.value))} seconds`;
    };
    s.addEventListener("input", () => (sync(), (player.currentTime = Number(s.value))));
    e.addEventListener("input", sync);
    sync();
    let aspect = v.aspect;
    drawer(v.clip ? "Trim or reframe this clip" : "Trim a clip", (close) => [
      h("p", { class: "cn-item-d" }, "A new revision is made; the earlier one stays."),
      h("label", { class: "cn-md-trim" }, h("span", null, "Start"), s),
      h("label", { class: "cn-md-trim" }, h("span", null, "End"), e),
      read,
      segmented("Format", ASPECTS, aspect, (x) => (aspect = x)),
      h("label", { class: "cn-md-trim" }, h("span", null, "Frame"), cx),
      h("p", { class: "cn-item-d" }, "Leave Frame alone and Orbe frames on the detail in the picture."),
      h("div", { class: "cn-md-ways" }, h("button", { class: "cn-btn cn-btn--primary", type: "button", onclick: () => (close(), makeClip({ clip: v.clip ?? undefined, startSec: Number(s.value), endSec: Number(e.value), aspect, centreX: auto ? undefined : Number(cx.value) })) }, "Render it")),
    ], { wide: true });
  }

  /* -------- Words */
  function wordsTab(el) {
    st.redraw.clear();
    let kind = "article";
    const out = h("div");
    const exportRow = h("div", { class: "cn-md-ways" });
    el.append(segmented("Kind", DRAFTS, kind, (v) => ((kind = v), draw(true)), { cls: "cn-md-kinds" }), out, section({ title: "Transcript", line: "Subtitles and plain text, to upload anywhere." }, exportRow));
    let shownVersion = null;
    function draw(force) {
      const d = st.d;
      if (!d) return put(out, skeleton(5));
      put(exportRow, ...(d.transcript ? [["srt", "SRT subtitles"], ["vtt", "WebVTT subtitles"], ["txt", "Text with times"]].map(([f, t]) => h("a", { class: "cn-btn cn-btn--s", href: apiHref(`${I(id)}/export?what=transcript&format=${f}`) }, icon("doc"), t)) : [h("p", { class: "cn-item-d" }, "There is no transcript yet.")]));
      if (!d.transcript) return put(out, emptyState("doc", "Words come from the transcript.", [], "Transcribe the video under Moments first."));
      const dr = d.drafts.find((x) => x.kind === kind);
      const job = d.jobs.find((j) => j.kind === "draft" && j.payload?.kind === kind && ["queued", "running"].includes(j.status));
      if (!dr) return put(out, emptyState("doc", job ? "Writing it." : `No ${DRAFTS.find(([k]) => k === kind)[1].toLowerCase()} yet.`, job || !can("content") ? [] : [["Write it", () => step("draft", { kind }), true]], "In your voice, from what you said. Every paragraph cites the moment it comes from."));
      if (!force && shownVersion === dr.version) return;
      shownVersion = dr.version;
      const t = h("input", { class: "ob-input", value: dr.title, maxlength: 200, "aria-label": "Title", readonly: !can("content") });
      const b = h("textarea", { class: "cn-notes-text", rows: 18, "aria-label": "Words", readonly: !can("content") }, dr.body);
      const versions = h("div");
      api.get(`${I(id)}/drafts/${seg(kind)}`).then(({ versions: vs }) => put(versions, h("ol", { class: "cn-vlist" }, vs.map((v) => h("li", null, h("span", { class: "cn-vlist-n" }, `Version ${v.version}`), h("span", { class: "cn-item-d" }, v.source === "person" ? "Your edit" : v.source === "assistant" ? "Drafted, cited" : "Your sentences"), h("time", { datetime: v.createdAt }, ago(v.createdAt))))))).catch(() => {});
      put(out, 
        h("div", { class: "cn-md-words" },
          section({ title: DRAFTS.find(([k]) => k === kind)[1], line: dr.source === "assistant" ? "Drafted from the transcript; every paragraph cites what you said, and anything it could not cite was left out." : dr.source === "rules" ? "Your own sentences, tidied, with the paid read left out." : "Your edit." },
            dr.disclosure ? h("p", { class: "cn-md-read" }, h("span", { class: "cn-tag cn-tag--straw" }, "Disclosure"), h("span", null, `${dr.disclosure}. It stays in, even if you take it out.`)) : null,
            t, b,
            h("div", { class: "cn-md-ways" },
              can("content") ? h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "button", onclick: async () => {
                try {
                  await api.put(`${I(id)}/drafts/${seg(kind)}`, { title: t.value.trim() || dr.title, body: b.value });
                  toast("Saved as a new version.");
                  refresh();
                } catch (e) {
                  toast(e.message);
                }
              } }, "Save a version") : null,
              can("content") ? h("button", { class: "cn-btn cn-btn--s cn-btn--ghost", type: "button", onclick: () => step("draft", { kind }) }, icon("sparkle"), "Write it again") : null,
              h("a", { class: "cn-btn cn-btn--s", href: apiHref(`${I(id)}/export?what=${seg(kind)}&format=md`) }, icon("doc"), "Markdown"),
              h("a", { class: "cn-btn cn-btn--s", href: apiHref(`${I(id)}/export?what=${seg(kind)}&format=html`) }, icon("doc"), "HTML"),
            ),
          ),
          h("div", { class: "cn-md-words-side" }, section({ title: "Versions" }, versions)),
        ),
      );
    }
    watch(() => draw(false))();
  }

  /* -------- Send */
  function sendTab(el) {
    st.redraw.clear();
    const what = h("select", { class: "ob-input ap-select", "aria-label": "What to send" });
    const provs = h("div", { class: "cn-md-provs" }, skeleton(4));
    const log = h("div");
    let providers = [];
    const fill = () => {
      const d = st.d;
      if (!d) return;
      const keep = what.value;
      const opts = [
        ...d.drafts.map((x) => [`draft:${x.kind}`, `${DRAFTS.find(([k]) => k === x.kind)[1]}: ${x.title}`]),
        ...d.renders.filter((r) => r.status === "ready").map((r) => [`render:${r.id}`, `Clip ${r.aspect}, ${clock(r.startSec)} to ${clock(r.endSec)}`]),
        ...(d.item.status === "ready" ? [["audio:full", "The episode's audio, for a podcast host"]] : []),
      ];
      put(what, ...(opts.length ? opts.map(([v, t]) => h("option", { value: v, selected: v === keep }, t)) : [h("option", { value: "" }, "Make a clip or write it up first")]));
      put(log, 
        d.sends.length
          ? h("ul", { class: "cn-list" }, d.sends.map((x) => h("li", { class: "cn-share" },
              h("div", null,
                h("p", { class: "cn-item-t" }, providers.find((p) => p.id === x.provider)?.name ?? x.provider, pill(x.status === "sent" ? "done" : "failed", x.status === "failed" ? "Not sent" : x.mode === "export" ? "Exported" : x.mode === "publish" ? "Published" : x.mode === "schedule" ? "Scheduled" : "Draft")),
                h("p", { class: "cn-item-d" }, `${x.what === "draft" ? x.targetId.replace("_", " ") : "Clip"}, ${ago(x.createdAt)}${x.error ? `: ${x.error}` : ""}`),
              ),
              x.remoteUrl ? h("a", { class: "cn-btn cn-btn--s cn-btn--ghost", href: x.remoteUrl, target: "_blank", rel: "noopener" }, icon("external"), "Open") : null,
            )))
          : emptyState("megaphone", "Nothing sent yet.", [], "Every send and export is kept here and on the work's record."),
      );
      drawProviders();
    };
    function drawProviders() {
      const [kind] = what.value.split(":");
      const isClip = kind === "render";
      const fits = (p) => (kind === "audio" ? p.capabilities.includes("publish_audio") : isClip ? p.capabilities.some((c) => c === "publish_video" || c === "publish_short") : p.capabilities.includes("publish_post"));
      const groups = [["Newsletters and blogs", (p) => p.category === "newsletter" || p.category === "blog"], ["Video and social", (p) => (p.category === "video" || p.category === "social") && (p.id !== "x" || on("x"))], ["Podcast hosts", (p) => p.category === "podcast"]];
      put(provs, ...groups.map(([name, test]) => {
        const list = providers.filter(test).filter(fits);
        if (!list.length) return null;
        return h("div", null, h("p", { class: "cn-menu-group" }, name), h("ul", { class: "cn-list" }, list.map(providerRow)));
      }).filter(Boolean));
      if (!provs.children.length) put(provs, emptyState("megaphone", "Pick something to send."));
    }
    function providerRow(p) {
      const relay = p.viaRelay && p.viaRelay.connected ? p.viaRelay : null;
      const [state, text] = relay ? ["live", `Via ${relay.name}`] : (STATUS_PILL[p.status] ?? STATUS_PILL.coming);
      const live = p.status === "live" || Boolean(relay);
      const connected = Boolean(p.connected) || Boolean(relay);
      const viaOauth = p.status === "live" && p.auth === "oauth";
      return h("li", { class: "cn-share" },
        h("div", null,
          h("p", { class: "cn-item-t" }, p.name, pill(p.connected ? "done" : state, p.connected ? `Connected: ${p.connected.account}` : text)),
          h("p", { class: "cn-item-d" }, relay ? `Posts through ${relay.name}'s approved app until ${p.name} reviews Orbe's own.` : p.note),
        ),
        h("div", { class: "cn-md-ways" },
          live && !connected && can("owner") ? (viaOauth || on("integrations") && p.auth !== "key" ? h("a", { class: "cn-btn cn-btn--s", href: "/orbe-site/demo/app/settings/integrations" }, icon("plug"), "Connect") : h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => connect(p) }, icon("plug"), "Connect")) : null,
          live && connected ? h("button", { class: "cn-btn cn-btn--s cn-btn--primary", type: "button", disabled: !what.value, onclick: () => sendTo(p, relay) }, asks("consent") ? "Ask to send" : "Send") : null,
          !live ? h("button", { class: "cn-btn cn-btn--s", type: "button", disabled: !what.value || what.value.startsWith("audio"), onclick: () => exportFor(p) }, icon("doc"), "Export") : null,
        ),
      );
    }
    function connect(p) {
      drawer(`Connect ${p.name}`, (close) => {
        const fields = p.fields.map((f) => h("label", { class: "cn-md-field" }, h("span", null, f.label), h("input", { class: "ob-input", name: f.key, type: f.kind === "secret" ? "password" : f.kind === "url" ? "url" : "text", autocomplete: "off", required: !f.optional }), h("span", { class: "cn-item-d" }, f.help)));
        const f = h("form", { class: "cn-md-form", onsubmit: async (e) => {
          e.preventDefault();
          const credentials = Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
          try {
            await api.put(`/v1/me/media/providers/${seg(p.id)}`, { credentials });
            toast(`${p.name} connected.`);
            close();
            loadProviders();
          } catch (err) {
            f.querySelector(".cn-md-err")?.remove();
            f.append(h("p", { class: "cn-md-err", role: "alert" }, err.message));
          }
        } }, ...fields, h("p", { class: "cn-item-d" }, "The key is sealed before it is stored, and used only when you send. "), h("a", { href: p.docs, target: "_blank", rel: "noopener" }, `${p.name}'s guide`), h("div", { class: "cn-md-ways" }, h("button", { class: "cn-btn cn-btn--primary", type: "submit" }, "Connect")));
        return f;
      });
    }
    function sendTo(p, relay) {
      const [kind, target] = what.value.split(":");
      const modes = relay ? ["publish", "schedule"] : p.modes;
      let mode = modes[0];
      const when = h("input", { class: "ob-input", type: "datetime-local", "aria-label": "When" });
      // Choices a platform makes the person take, never defaulted: privacy (YouTube, TikTok), TikTok's music confirmation, X's cost.
      const privacyList = p.id === "youtube" ? YOUTUBE_PRIVACY : p.id === "tiktok" && !relay ? TIKTOK_PRIVACY : null;
      const privacy = privacyList ? h("select", { class: "ob-input ap-select", "aria-label": "Who can see it" }, h("option", { value: "" }, "Choose who can see it"), privacyList.map(([v, t]) => h("option", { value: v }, t))) : null;
      const music = p.id === "tiktok" && !relay ? h("input", { type: "checkbox" }) : null;
      const cost = p.id === "x" ? h("input", { type: "checkbox" }) : null;
      const choiceBox = h("div", { class: "ap-stack" },
        privacy ? h("label", { class: "cn-md-field" }, h("span", null, "Who can see it"), privacy) : null,
        music ? h("label", { class: "ap-check" }, music, h("span", null, "By posting, I agree to TikTok's Music Usage Confirmation.")) : null,
        cost ? h("label", { class: "ap-check" }, cost, h("span", null, "X charges per post, about $0.015, or $0.20 when the post has a link. I accept the cost.")) : null,
      );
      const showChoices = () => (choiceBox.hidden = mode !== "publish" && !cost);
      drawer(`Send to ${p.name}`, (close) => [
        h("p", null, what.selectedOptions[0]?.textContent ?? ""),
        relay ? h("p", { class: "cn-item-d" }, `Posted through ${relay.name}'s approved app. ${relay.name} holds the ${p.name} token; Orbe keeps the post and its receipt.`) : null,
        segmented("How", modes.map((m) => [m, m === "draft" ? (p.id === "tiktok" ? "To your TikTok inbox" : "As a draft") : m === "publish" ? "Publish now" : "Schedule"]), mode, (v) => ((mode = v), (when.hidden = v !== "schedule"), showChoices())),
        (when.hidden = mode !== "schedule", when),
        (showChoices(), choiceBox),
        h("p", { class: "cn-item-d" }, asks("consent") ? "It goes to the team's owner to approve first. Nothing is sent until they do." : "Nothing goes until you press Send. A draft lands in your account unsent."),
        h("div", { class: "cn-md-ways" }, h("button", { class: "cn-btn cn-btn--primary", type: "button", onclick: async () => {
          if (mode === "publish" && !(await confirmBox(`Publish this on ${p.name} now?`, { yes: "Publish" }))) return;
          try {
            const choices = { ...(privacy && privacy.value ? { privacy: privacy.value } : {}), ...(music ? { musicConsent: music.checked } : {}), ...(cost ? { costAccepted: cost.checked } : {}) };
            const r = await api.post(`${I(id)}/sends`, { provider: p.id, what: kind, target: kind === "audio" ? "full" : target, mode, scheduledFor: mode === "schedule" && when.value ? new Date(when.value).toISOString() : undefined, confirm: true, choices });
            toast(r.send.status === "sent" ? (mode === "draft" ? `In ${p.name} as a draft.` : mode === "publish" ? `Published on ${p.name}.` : `Scheduled on ${p.name}.`) : r.send.error);
            close();
            refresh();
          } catch (e) {
            if (e.code !== "sent_to_owner") toast(e.message);
            else close();
          }
        } }, asks("consent") ? "Ask the owner" : "Send")),
      ]);
    }
    async function exportFor(p) {
      const [kind, target] = what.value.split(":");
      try {
        await api.post(`${I(id)}/sends`, { provider: p.id, what: kind, target, mode: "draft", confirm: true });
        refresh();
      } catch (e) {
        if (e.code !== "sent_to_owner") return toast(e.message);
        return;
      }
      if (kind === "render") window.location.assign(apiHref(`${I(id)}/renders/${seg(target)}/file?download=1`));
      else window.location.assign(apiHref(`${I(id)}/export?what=${seg(target)}&format=${p.id === "substack" ? "html" : "md"}`));
      toast(p.id === "substack" ? "Downloaded. Open it, copy all, and paste into Substack's editor." : `Downloaded. ${p.note}`);
    }
    async function loadProviders() {
      try {
        providers = (await api.get("/v1/me/media/providers")).providers;
        drawProviders();
      } catch (e) {
        put(provs, failure(e, loadProviders));
      }
    }
    what.addEventListener("change", drawProviders);
    el.append(section({ title: "Send", line: "Live where the provider's API allows it; export where it does not. Nothing leaves without your tap." }, h("label", { class: "cn-md-field" }, h("span", null, "What"), what), provs), section({ title: "Sent and exported" }, log));
    loadProviders().then(() => watch(fill)());
  }

  await refresh();
}
