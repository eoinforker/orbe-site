/*
  Fix: each YouTube upload young enough to fix, judged against creators
  the same size; options generated and checked for one upload, with those held
  back and why; a fix proposed, approved with a tap (thumbnails always), and
  undone with one. YouTube's permission to change a title or thumbnail is asked
  for only once Fix is on for a channel.
*/
import { api, seg } from "../api.js";
import { action, actions, block, check, chip, count, day, empty, failure, form, h, money, ok, panel, pct, plural, title } from "../ui.js";
import { screenHead } from "../console-ui.js";

const FIX_STATES = { proposed: "Waiting for your tap", approved: "Approved, going live", applied: "Live, being measured", kept: "Kept: it lifted the work", reverted: "Put back", cancelled: "Cancelled" };
const FIX_TONE = { kept: "good", applied: "good", reverted: "off", cancelled: "off" };
const TARGET = { title: "the title", thumbnail: "the thumbnail", both: "the title and the thumbnail" };
const STATUS = { underperforming: "Behind creators its size", on_track: "On track", too_young: "Too young to judge", too_old: "Too old to fix", not_eligible: "Not one Fix can help" };
const ISSUES = {
  empty: "it was empty",
  too_long: "it is over YouTube's 100 characters",
  same_as_current: "it is the same as the current one",
  new_number: "it adds a number the video does not have",
  off_topic: "it shares no subject word with the video",
  shouting: "it is mostly capitals",
  not_https: "the image is not on a secure address",
};
const RETURNED = {
  denied: "You said no on Google's screen, so Orbe still cannot change anything on YouTube.",
  not_granted: "Google's screen came back without the permission ticked. Try again and leave it ticked.",
  invalid_request: "Google sent back an incomplete answer. Try again.",
};

function returned(q) {
  if (q.get("permission") === "granted") return ok("YouTube's permission is in place. Nothing changes without your tap, except titles where you turned automatic titles on.");
  const e = q.get("error");
  return e ? failure({ message: RETURNED[e] ?? `YouTube's permission was not given (${e.replaceAll("_", " ")}).` }) : null;
}

function settingsBox(ch, reload) {
  const s = ch.settings;
  return h(
    "div",
    { class: "ap-stack" },
    !s.connected ? h("p", { class: "ap-note" }, "Connect YouTube Analytics for this channel first, under ", h("a", { href: "/orbe-site/demo/app/settings/connections" }, "Connect"), ".") : null,
    form(
      [check("Fix on for this channel", { name: "enabled", checked: s.enabled }), check("Change titles on their own when Orbe finds a better one. A new thumbnail always waits for your tap.", { name: "autoTitles", checked: s.autoTitles })],
      "Save",
      async (d) => {
        const enabled = d.get("enabled") === "on";
        await api.put("/v1/me/fixes/settings", { accountId: ch.accountId, enabled, autoTitles: enabled && d.get("autoTitles") === "on" });
        reload();
        return "Saved.";
      },
      { primary: false },
    ),
    s.permission
      ? h(
          "div",
          { class: "ap-notice" },
          h("p", null, s.permission.why),
          actions(
            action("Give YouTube's permission", async () => {
              const r = await api.post("/v1/me/fixes/permission/start", { accountId: ch.accountId });
              window.location.assign(r.authorizeUrl);
            }, { primary: true }),
          ),
        )
      : s.enabled && s.youtubeWrite
        ? h("p", { class: "ap-note" }, "YouTube's permission is in place.")
        : null,
  );
}

function optionsBox(u, reload) {
  const box = h("div", { class: "ap-stack", "aria-live": "polite" });
  const generate = action("Generate options", async () => {
    const r = await api.post("/v1/me/fixes/generate", { workId: u.workId });
    const titles = r.options.filter((o) => o.kind === "title");
    const thumbs = r.options.filter((o) => o.kind === "thumbnail");
    const notes = (o) => (o.notes?.length ? h("span", { class: "ap-note" }, ` ${o.notes.join(" ")}`) : null);
    box.replaceChildren(
      h("p", { class: "ap-note" }, r.note),
      form(
        [
          titles.length
            ? h("fieldset", { class: "ap-fieldset" }, h("legend", null, "New title"),
                h("label", { class: "ap-check" }, h("input", { type: "radio", name: "title", value: "", checked: true }), h("span", null, "Keep the current title")),
                titles.map((o) => h("label", { class: "ap-check" }, h("input", { type: "radio", name: "title", value: o.id }), h("span", null, o.title, notes(o)))))
            : h("p", { class: "ap-note" }, "No new title passed the checks."),
          thumbs.length
            ? h("fieldset", { class: "ap-fieldset" }, h("legend", null, "New thumbnail (always waits for your tap)"), h("div", { class: "ap-thumbs" },
                h("label", { class: "ap-thumb" }, h("input", { type: "radio", name: "thumb", value: "", checked: true }), h("span", null, "Keep the current thumbnail")),
                thumbs.map((o, i) => h("label", { class: "ap-thumb" }, h("input", { type: "radio", name: "thumb", value: o.id }), h("img", { src: o.imageUrl, alt: `Thumbnail option ${i + 1}`, loading: "lazy", width: "320", height: "180" })))))
            : h("p", { class: "ap-note" }, "No thumbnail options. Orbe never draws its own."),
        ],
        "Propose this change",
        async (fd) => {
          const optionIds = [fd.get("title"), fd.get("thumb")].filter(Boolean).map(String);
          if (!optionIds.length) throw new Error("Choose a new title, a new thumbnail, or both.");
          const p = await api.post("/v1/me/fixes", { workId: u.workId, optionIds });
          if (p.problem) {
            box.append(failure({ message: p.problem }));
            return null;
          }
          reload();
          return "Proposed.";
        },
      ),
      r.held.length
        ? h("details", { class: "ap-more" }, h("summary", null, `Held back (${r.held.length})`),
            h("ul", { class: "ap-plain" }, r.held.map((x) => h("li", null, x.option.kind === "title" ? `"${x.option.title}"` : "A thumbnail", `: held back because ${x.issues.map((i) => ISSUES[i] ?? i.replaceAll("_", " ")).join(", and ")}.`, x.notes.length ? ` ${x.notes.join(" ")}` : ""))))
        : null,
      r.failed.length ? h("p", { class: "ap-note" }, `${plural(r.failed.length, "provider")} did not answer, so the next one was asked.`) : null,
    );
    return `${plural(r.options.length, "option")} ready.`;
  }, { primary: true });
  box.append(actions(generate));
  return box;
}

function fixItem(f, reload) {
  const moves = [];
  if (f.state === "proposed")
    moves.push(action(f.after.thumbnailUrl !== f.before.thumbnailUrl ? "Approve: send it to YouTube" : "Approve the change", async () => {
      await api.post(`/v1/me/fixes/${seg(f.id)}/approve`, {});
      reload();
      return "Approved.";
    }, { primary: true }));
  if (["proposed", "approved", "applied", "kept"].includes(f.state))
    moves.push(action(f.state === "proposed" || f.state === "approved" ? "Cancel" : "Undo", async () => {
      await api.post(`/v1/me/fixes/${seg(f.id)}/undo`, {});
      reload();
      return "Undone.";
    }, { danger: true, confirm: "Put the old title and thumbnail back? An undone fix is never charged." }));
  if (f.state === "applied")
    moves.push(action("Check now", async () => {
      const r = await api.get(`/v1/me/fixes/${seg(f.id)}`);
      reload();
      return FIX_STATES[r.fix.state] ?? r.fix.state;
    }));
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", null, chip(FIX_STATES[f.state] ?? f.state, FIX_TONE[f.state]), f.mode === "auto" ? " Automatic title" : ""),
      f.before.title !== f.after.title ? h("p", null, h("span", { class: "ap-cue" }, "Was "), f.before.title, h("br"), h("span", { class: "ap-cue" }, "Now "), f.after.title) : null,
      f.before.thumbnailUrl !== f.after.thumbnailUrl ? h("p", { class: "ap-note" }, "A new thumbnail.") : null,
      f.result?.text ? h("p", null, f.result.text) : null,
      f.fee ? h("p", { class: "ap-note" }, `Fee ${money(f.fee)}, because it lifted the work.`) : null,
      h("p", { class: "ap-note" }, `Started ${day(f.createdAt)}.`),
    ),
    moves.length ? actions(moves) : null,
  );
}

function uploadItem(u, ch, reload) {
  const d = u.diagnosis;
  const behind = d?.status === "underperforming";
  return h(
    "li",
    { class: "ap-item ap-item--block" },
    h("div", { class: "ap-item-main" },
      h("p", { class: "ap-says" }, h("a", { href: `/orbe-site/demo/app/works/${seg(u.workId)}?tab=fix` }, u.title), " ", chip(STATUS[d?.status] ?? "Not judged", behind ? "warn" : d?.status === "on_track" ? "good" : "off")),
      h("p", { class: "ap-note" }, `Published ${day(u.publishedAt)}, ${count(u.views)} views.`),
      d?.expected ? h("p", null, `Creators your size typically have ${count(d.expected.median)} by now (middle half ${count(d.expected.p25)} to ${count(d.expected.p75)}).`) : null,
      behind ? h("p", null, d.why) : null,
      behind && d.target ? h("p", { class: "ap-says" }, `Change ${TARGET[d.target]}.`) : null,
    ),
    u.fixes.length ? h("ul", { class: "ap-list" }, u.fixes.map((f) => fixItem(f, reload))) : null,
    behind && ch.settings.enabled && !u.fixes.some((f) => ["proposed", "approved", "applied"].includes(f.state)) ? optionsBox(u, reload) : null,
  );
}

export async function render(main, ctx) {
  const body = h("div", { class: "ap-stack" });
  screenHead(main, "fix", { line: "Works that fall behind creators your size, what to change, and new options to try. A change stays, and is charged, only if it lifts the work; one tap puts the old one back.", tags: [["Live", "sky"], ["Paid only on lift"], ["YouTube"]] }).append(body);
  const reload = () =>
    block(body, () => api.get("/v1/me/fixes"), (r) => [
      returned(ctx.query),
      h("p", { class: "ap-note" }, `Judged ${plural(r.judgedAfterDays, "day")} or more after the change: kept with at least ${pct(r.liftNeeded)} more views than its own pace, for ${money(r.fee)} a kept fix (provisional). Otherwise it goes back, free.`),
      r.channels.length
        ? r.channels.map((ch) => {
            // Opened from a work's page (?work=): that upload alone, whatever its state.
            const only = ctx.query.get("work");
            const behind = ch.uploads.filter((u) => (only ? u.workId === only : u.diagnosis?.status === "underperforming" || u.fixes.length));
            const rest = ch.uploads.length - behind.length;
            return panel(
              `${ch.handle || ch.title} on YouTube`,
              settingsBox(ch, reload),
              behind.length ? h("ul", { class: "ap-list" }, behind.map((u) => uploadItem(u, ch, reload))) : empty("Nothing is falling behind creators your size right now."),
              rest ? h("p", { class: "ap-note" }, `${plural(rest, "other work")} on track, too young or too old to judge.`) : null,
              ch.settings.enabled ? null : h("p", { class: "ap-note" }, "Turn Fix on to generate options."),
            );
          })
        : empty("Fix works on YouTube channels. Connect YouTube Analytics to claim yours.", h("p", null, h("a", { class: "ob-lnk ob-lnk--s", href: "/orbe-site/demo/app/settings/connections" }, "Connect"))),
    ]);
  await reload();
}
