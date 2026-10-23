/*
  Hand it off across your roster: on the Roster screen, one row per creator
  (on or off, what waits, what was done this week, money held, what is
  next), then one queue of what waits across them, each with the creator's
  name. Opening a creator shows their Hand it off card and rules, as the
  manager may act on them.

  What the manager may do for each creator is the grant that creator set on
  the agency's link; the server narrows every action to it (GET
  /v1/roster/handoff), so a button that would be refused is never drawn and
  the item says it waits for the creator instead. Approving several at once
  takes counters, declines and reminders; an accept joins only once its own
  accept notice has been read and ticked; emails are approved one at a time.
*/
import { api, seg } from "../api.js";
import { button, status, twoLine } from "../cards.js";
import { drawer, emptyState, sampleTag, section } from "../console-ui.js";
import { handoffCard, headline } from "../creator/handoff.js";
import { confirmBox, form, h, check, money, toast } from "../ui.js";

const GRANT_WORDS = {
  none: "They approve every change",
  rules: "You set the rules",
  approve: "You approve",
  both: "You set the rules and approve",
};
/** What the creator lets the agency do, in a few words. */
const grantLine = (r) => {
  if (!r.shares) return "Shares no deals with you";
  const g = r.grant ?? { grant: "none", max: null };
  const words = GRANT_WORDS[g.grant] ?? GRANT_WORDS.none;
  return g.max && (g.grant === "approve" || g.grant === "both") ? `${words}, up to £${Number(g.max).toLocaleString("en-GB")}` : words;
};

/** The kinds that may be approved together; accepts only with their notice ticked. */
const BULK = ["accept", "counter", "decline", "chase_funds", "chase_payout"];

const hm = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** The row's next step, said plainly. */
function nextCell(r) {
  if (!r.shares) return h("span", { class: "dl-quiet" }, "Not shared");
  if (!r.next) return h("span", { class: "dl-quiet" }, r.enabled ? "Nothing waiting" : "Off");
  const sub = r.next.state === "scheduled" && r.next.runAt ? `At ${hm(r.next.runAt)} unless stopped` : r.next.creatorAct ? `${r.creator.name} decides` : "You decide";
  return twoLine(r.next.title, sub);
}

/* The columns: label, what they sort by, and whether they are numbers. */
const COLS = [
  { key: "name", label: "Creator", by: (r) => r.creator.name.toLowerCase() },
  { key: "on", label: "Hand it off", by: (r) => (r.shares ? (r.enabled ? 2 : 1) : 0) },
  { key: "waiting", label: "Waiting", num: true, by: (r) => r.counts?.waiting ?? -1 },
  { key: "done", label: "Done this week", num: true, by: (r) => r.counts?.doneThisWeek ?? -1 },
  { key: "held", label: "Money held", num: true, by: (r) => r.held?.amount ?? -1 },
  { key: "next", label: "Next", by: (r) => (r.next ? (r.next.state === "waiting" ? `0${r.next.title}` : `1${r.next.runAt ?? ""}`) : "2") },
];

/**
  The roster's table: sortable by any column (the header's buttons), and
  moved through by keyboard (the arrows, or j and k, Home and End; Enter
  opens). One row holds the tab stop at a time, so the table is one stop.
*/
function rosterTable(rows, open, sort) {
  const col = COLS.find((c) => c.key === sort.key) ?? COLS[0];
  const sorted = [...rows].sort((a, b) => {
    const x = col.by(a);
    const y = col.by(b);
    const d = x < y ? -1 : x > y ? 1 : 0;
    return (sort.dir === "asc" ? d : -d) || a.creator.name.localeCompare(b.creator.name);
  });
  const body = h("tbody");
  const head = h("thead", null, h("tr", null, COLS.map((c) => {
    const on = c.key === col.key;
    return h("th", { scope: "col", class: c.num ? "dl-num" : null, "aria-sort": on ? (sort.dir === "asc" ? "ascending" : "descending") : "none" },
      h("button", { class: `rh-sort${on ? " is-on" : ""}`, type: "button", onclick: () => sort.set(c.key) }, c.label, h("span", { class: "rh-dir", "aria-hidden": "true" }, on ? (sort.dir === "asc" ? "↑" : "↓") : "")),
    );
  })));
  const rowsEls = sorted.map((r, i) =>
    h("tr", { class: "dl-row rh-row", tabindex: i === 0 ? "0" : "-1", "data-id": r.creator.id, onclick: () => open(r) },
      h("td", { "data-label": "Creator" }, twoLine(r.creator.name, grantLine(r))),
      h("td", { "data-label": "Hand it off" }, h("span", { class: "cn-dt-v" }, r.shares ? status(r.enabled ? "On" : "Off", r.enabled ? "good" : "off") : status("Not shared", "off"))),
      h("td", { class: "dl-num", "data-label": "Waiting" }, h("span", { class: "cn-dt-v" }, r.counts ? String(r.counts.waiting) : "")),
      h("td", { class: "dl-num", "data-label": "Done this week" }, h("span", { class: "cn-dt-v" }, r.counts ? String(r.counts.doneThisWeek) : "")),
      h("td", { class: "dl-num", "data-label": "Money held" }, h("span", { class: "cn-dt-v" }, r.held ? money(r.held) : r.shares ? h("span", { class: "dl-quiet" }, "None") : "")),
      h("td", { "data-label": "Next" }, h("span", { class: "cn-dt-v" }, nextCell(r))),
    ),
  );
  body.append(...rowsEls);
  body.addEventListener("keydown", (e) => {
    const row = e.target.closest?.("tr");
    if (!row) return;
    const i = rowsEls.indexOf(row);
    const to = { ArrowDown: i + 1, j: i + 1, ArrowUp: i - 1, k: i - 1, Home: 0, End: rowsEls.length - 1 }[e.key];
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(sorted[i]);
      return;
    }
    if (to === undefined || to < 0 || to >= rowsEls.length) return;
    e.preventDefault();
    row.tabIndex = -1;
    rowsEls[to].tabIndex = 0;
    rowsEls[to].focus();
  });
  return h("div", { class: "dl-wrap" },
    h("table", { class: "dl-table cn-dt rh-table" }, h("caption", { class: "ob-sr" }, "Hand it off for each creator on your roster. Use the arrow keys to move and Enter to open."), head, body),
  );
}

/** A queue item: the creator, what Orbe proposes or is about to do, and why; a box to pick it where it can be approved with others. */
function queueItem(a, picked, onPick, open) {
  const eligible = a.can?.approve && BULK.includes(a.kind);
  const box = eligible ? h("input", { type: "checkbox", class: "rh-pick", checked: picked.has(a.id), "aria-label": `Pick: ${headline(a)} for ${a.creator.name}` }) : null;
  box?.addEventListener("change", () => onPick(a, box.checked));
  return h("li", { class: `ho-item ho-item--${a.state} rh-item`, "data-id": a.id },
    h("div", { class: "rh-item-row" },
      box ?? h("span", { class: "rh-pick-gap", "aria-hidden": "true" }),
      h("div", { class: "rh-item-main" },
        h("p", { class: "rh-who" }, a.creator.name),
        h("p", { class: "ho-item-t" }, headline(a)),
        a.why ? h("p", { class: "ho-item-d" }, a.why) : null,
        a.waitsFor ? h("p", { class: "ho-item-d ho-waits" }, a.waitsFor) : null,
      ),
      button("Open", () => open(a.creator, a.id), { quiet: true }),
    ),
  );
}

/** One group of the queue under its heading, with how many; nothing when it is empty. */
function queueGroup(id, title, items, picked, onPick, open) {
  if (!items.length) return null;
  return h("section", { class: "ho-group rh-queue", "aria-labelledby": id },
    h("h3", { class: "ho-h", id }, title, h("span", { class: "ho-n" }, String(items.length))),
    h("ul", { class: "ho-list" }, items.map((a) => queueItem(a, picked, onPick, open))),
  );
}

/**
  Approving the picked items together. Counters say they cannot be taken
  back; each accept shows its own notice with its own box to tick, and only
  the ticked accepts are sent.
*/
function approvePicked(items, done) {
  const accepts = items.filter((a) => a.kind === "accept");
  const others = items.filter((a) => a.kind !== "accept");
  const send = async (list, seen) => {
    const r = await api.post("/v1/roster/handoff/approve", { items: list.map((a) => ({ creatorId: a.creator.id, actionId: a.id, ...(seen.has(a.id) ? { noticeShown: true } : {}) })) });
    const failed = r.results.filter((x) => !x.ok);
    toast(failed.length ? `${r.done} done. ${failed.length} could not be: ${failed[0].error?.message ?? "refused"}` : `${r.done} done.${list.some((a) => a.kind === "counter") ? " A counter a brand accepts agrees the deal." : ""}`);
    done();
  };
  if (!accepts.length) {
    return confirmBox(`${items.map((a) => `${a.creator.name}: ${headline(a)}`).join(" ")}${others.some((a) => a.kind === "counter") ? " A counter cannot be taken back. If a brand accepts it, the deal is agreed." : ""}`, { title: `Approve ${items.length}?`, yes: `Approve ${items.length}` }).then((yes) => (yes ? send(items, new Set()) : null));
  }
  drawer(`Approve ${items.length}`, (close) => {
    const f = form(
      [
        others.length ? h("ul", { class: "ho-list" }, others.map((a) => h("li", { class: "ho-item" }, h("p", { class: "rh-who" }, a.creator.name), h("p", { class: "ho-item-t" }, headline(a))))) : null,
        ...accepts.map((a) => h("fieldset", { class: "dl-fs" },
          h("legend", null, `${a.creator.name}: ${headline(a)}`),
          a.notice ? h("p", { class: "dl-notice ho-notice" }, a.notice) : null,
          check(`I have read this and want to accept for ${a.creator.name}.`, { name: "seen", value: a.id }),
        )),
      ],
      `Approve ${items.length}`,
      async (fd) => {
        const seen = new Set(fd.getAll("seen").map(String));
        await send(items, seen);
        close();
        return null;
      },
    );
    f.classList.add("cn-form");
    const submit = f.querySelector("button[type=submit]");
    submit?.setAttribute("class", "cn-btn cn-btn--primary");
    // Approve waits, greyed, until every accept's notice is ticked: never the browser's own bubble.
    const boxes = [...f.querySelectorAll("input[name=seen]")];
    const sync = () => submit && (submit.disabled = boxes.some((b) => !b.checked));
    boxes.forEach((b) => b.addEventListener("change", sync));
    sync();
    return [h("p", { class: "dl-notice" }, "Each accept agrees a deal for its creator. Money is held when the brand funds, and paid out on verified delivery."), f];
  });
  return null;
}

/** One creator's Hand it off in a drawer: their card, and their rules behind Rules, as the agency may act on them. */
function openCreator(creator, focusId, changed) {
  const base = `/v1/roster/handoff/creators/${seg(creator.id)}`;
  let view = null;
  const scope = {
    own: false,
    base,
    name: creator.name,
    get rules() {
      return !!view?.can?.rules;
    },
    read: async () => {
      view = await api.get(base);
      return view.handoff;
    },
    // Rules and the switch are always offered: within the grant they save, otherwise the change goes to the creator.
    may: (action) => action === "business",
  };
  drawer(`${creator.name}: Hand it off`, () => [handoffCard({ scope, focus: focusId ?? undefined, changed })], { wide: true, onClose: changed });
}

/**
  The section on the Roster. Draws nothing where the server has no Hand it
  off (404) or this role cannot see deals (403).
*/
export function rosterHandoff() {
  const slot = h("div", { class: "rh-slot" });
  const sort = { key: "waiting", dir: "desc", set: null };
  const picked = new Map();
  const bar = h("div", { class: "cn-bulk", hidden: true, role: "region", "aria-label": "Picked items" });
  let data = null;

  const load = async () => {
    try {
      data = await api.get("/v1/roster/handoff");
    } catch (e) {
      if (e?.status === 404 || e?.status === 403) return slot.replaceChildren();
      throw e;
    }
    // Picks that are no longer waiting are let go.
    for (const id of [...picked.keys()]) if (!data.queue.some((a) => a.id === id && a.can?.approve)) picked.delete(id);
    draw();
  };
  const changed = () => slot.isConnected && load();
  const open = (creator, focusId) => openCreator(creator, focusId, changed);

  const drawBar = () => {
    const n = picked.size;
    bar.hidden = n === 0;
    if (!n) return bar.replaceChildren();
    bar.replaceChildren(
      h("span", { class: "cn-bulk-n" }, `${n} picked`),
      h("span", { class: "cn-bulk-sep", "aria-hidden": "true" }),
      button(`Approve ${n}`, () => approvePicked([...picked.values()], () => (picked.clear(), changed())), { primary: true }),
      button("Clear", () => {
        picked.clear();
        slot.querySelectorAll(".rh-pick").forEach((b) => (b.checked = false));
        drawBar();
      }, { quiet: true }),
    );
  };

  const draw = () => {
    const d = data;
    const keep = slot.contains(document.activeElement) ? (document.activeElement.closest("[data-id]")?.dataset.id ?? null) : null;
    if (!d.creators.length) {
      slot.replaceChildren(section({ title: "Hand it off across your roster", line: "Each creator's Hand it off, run from here within what they let your agency do." },
        emptyState("people", "No creators on your roster yet.", [], "Once a creator joins and links your agency as a manager, their Hand it off shows here: what waits, what was done and the money held.")));
      return drawBar();
    }
    sort.set = (key) => {
      sort.dir = sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : COLS.find((c) => c.key === key)?.num ? "desc" : "asc";
      sort.key = key;
      draw();
      slot.querySelector(`th[aria-sort]:not([aria-sort=none]) button`)?.focus();
    };
    const s = d.summary;
    const queue = d.queue ?? [];
    // One queue, in three groups: what you decide, what each creator keeps for themselves, and what is about to happen.
    const yours = queue.filter((a) => a.state === "waiting" && !a.waitsFor);
    const theirs = queue.filter((a) => a.state === "waiting" && a.waitsFor);
    const soon = queue.filter((a) => a.state === "scheduled");
    const parts = [`${yours.length} waiting on you`, theirs.length ? `${theirs.length} on the creator` : null, soon.length ? `${soon.length} about to happen` : null].filter(Boolean);
    const line = `On for ${s.on} of ${s.creators}. ${parts.join(", ")}.${s.held.amount ? ` ${money(s.held)} held until delivery is verified.` : ""}`;
    const onPick = (a, yes) => {
      if (yes) picked.set(a.id, a);
      else picked.delete(a.id);
      drawBar();
    };
    slot.replaceChildren(
      section({ title: "Hand it off across your roster", line, actions: sampleTag(), cls: "rh" },
        rosterTable(d.creators, (r) => (r.shares ? open(r.creator) : toast(`${r.creator.name} shares no deals with your agency.`)), sort),
        queueGroup("rh-q", "Waiting on you", yours, picked, onPick, open),
        queueGroup("rh-t", "Waiting on the creator", theirs, picked, onPick, open),
        queueGroup("rh-s", "About to happen", soon, picked, onPick, open),
        queue.length ? null : h("p", { class: "ho-empty" }, "Nothing waits. New offers are answered inside each creator's rules."),
      ),
      bar,
    );
    drawBar();
    if (keep) slot.querySelector(`[data-id="${CSS.escape(keep)}"]`)?.focus({ preventScroll: true });
  };
  load().catch(() => slot.replaceChildren());
  return slot;
}
