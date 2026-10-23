/*
  Small DOM helpers. Everything from the API goes in as text, never as HTML,
  so a title or a brand name cannot inject markup. Loading, error and "coming
  soon" states are drawn the same way on every screen.
*/
import { notBuiltYet } from "./api.js";

const PROPS = new Set(["value", "checked", "disabled", "selected", "indeterminate"]);

/** h("p", { class: "x", onclick: fn }, "text", child) */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

let uid = 0;
export const nextId = (p = "ap") => `${p}-${++uid}`;

/* ---------- words and numbers, in British English ---------- */

export function money(m) {
  if (!m) return "Not set";
  const whole = m.amount % 100 === 0;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: m.currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(m.amount / 100);
}
export const pounds = (m) => (m ? m.amount / 100 : "");
export const count = (n) => (n === null || n === undefined ? "None yet" : Math.round(n).toLocaleString("en-GB"));
export const pct = (x, dp = 0) => `${(x * 100).toFixed(dp)}%`;
export const bps = (b) => `${(b / 100).toLocaleString("en-GB")}%`;
export const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
export const when = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "";
/** A rating centred on zero, with a real minus sign. */
export const signed = (r) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(2)}`;
/** awaiting_funds to "Awaiting funds". */
export const words = (s) => {
  const t = String(s ?? "").replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
let numberFormat = null;
export const plural = (n, one, many = `${one}s`) => `${(numberFormat ??= new Intl.NumberFormat("en-GB")).format(n)} ${n === 1 ? one : many}`;

/* ---------- layout ---------- */

/** The page title, focused after each navigation so a screen reader hears where it is. */
export const title = (text, lede) => [h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, text), lede ? h("p", { class: "ap-lede" }, lede) : null].filter(Boolean);

/** A label and its value, as a definition list row. */
export const rows = (pairs) => h("dl", { class: "ap-dl" }, pairs.filter(Boolean).map(([k, v]) => [h("dt", null, k), h("dd", null, v)]));

export const chip = (text, tone) => h("span", { class: `ob-chip ap-chip${tone ? ` ap-chip--${tone}` : ""}` }, text);

/* ---------- states ---------- */

export function loading(el, text = "Loading.") {
  el.setAttribute("aria-busy", "true");
  el.replaceChildren(
    h("div", { class: "ap-loading cn-loading", role: "status" },
      h("span", { class: "ob-sr" }, text),
      h("span", { class: "cn-skel", "aria-hidden": "true" }, [0, 1, 2, 3].map(() => h("span", { class: "cn-skel-line" }))),
    ),
  );
}

/** A field's path in words, for an older server that sends no label: "countries[0]" reads "Countries". */
const pathWords = (path) => {
  const key = String(path).replace(/\[\d+\]/g, "").split(".").pop() || "";
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Each problem as the server said it in words; never a raw path or an index. A single problem the message already says is not repeated. */
function detailList(details, message) {
  if (!Array.isArray(details) || !details.length) return null;
  const lines = details.map((d) => d.say ?? (d.path && d.path !== "(body)" ? `${d.label ?? pathWords(d.path)} ${d.message}.` : `${d.message}.`)).filter((line) => line !== message);
  return lines.length ? h("ul", { class: "ap-details" }, lines.map((line) => h("li", null, line))) : null;
}

/** Words for an error the API did not write: a screen's code that could not be fetched, or a fault in it. Null for everything else. */
function unloaded(err) {
  if (!err || err.code) return null;
  const msg = String(err.message ?? "");
  if (/dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch|NetworkError|Load failed/i.test(msg))
    return navigator.onLine === false ? "You are offline. Connect again, then reload to open this part of Orbe." : "This part of Orbe did not load, perhaps because Orbe has just been updated. Reload to get it.";
  if (err instanceof TypeError || err instanceof ReferenceError || err instanceof SyntaxError) return "Something went wrong on this screen. Reload to try again.";
  return null;
}

/** An API error as the API wrote it, with the request id to quote to Orbe. */
export function failure(err, retry) {
  // Sent to the owner is not a failure: say where it went, calmly.
  if (err?.code === "sent_to_owner")
    return h("div", { class: "ap-msg ap-msg--wait", role: "status" }, h("p", null, err.message), h("a", { class: "ob-lnk", href: "/orbe-site/demo/app/settings/team?tab=approvals" }, "See the request"));
  // Offline is a state, not a fault: said calmly, and the screen tries again by itself once the connection is back.
  if (err?.code === "network" || (navigator.onLine === false && unloaded(err))) {
    const again = retry ?? (() => location.reload());
    const box = h("div", { class: "ap-msg ap-msg--wait", role: "status" },
      h("p", null, navigator.onLine === false ? "You are offline. This opens once you are connected again." : err.message),
      h("button", { class: "ap-quiet", type: "button", onclick: again }, "Try again"),
    );
    window.addEventListener("online", () => box.isConnected && again(), { once: true });
    return box;
  }
  // A part of the app that did not load, or a fault in its code, is said in words, never as the browser's message with its address.
  const plain = unloaded(err);
  if (plain)
    return h("div", { class: "ap-msg", role: "alert" }, h("p", null, plain), h("button", { class: "ap-quiet", type: "button", onclick: () => location.reload() }, "Reload"));
  return h(
    "div",
    { class: "ap-msg", role: "alert" },
    h("p", null, err?.message ?? "Something went wrong."),
    detailList(err?.details, err?.message),
    // The reference is for Orbe, not the reader: there when asked for.
    err?.requestId ? h("details", { class: "ap-ref" }, h("summary", null, "Reference for Orbe"), h("code", null, err.requestId)) : null,
    // Sending the same words again cannot fix them, and asking again for something not there finds nothing.
    retry && err?.code !== "invalid_request" && err?.status !== 404 ? h("button", { class: "ap-quiet", type: "button", onclick: retry }, "Try again") : null,
  );
}

/** Countries typed as "GB, IE": the codes, upper case, or a plain refusal before anything is sent. */
export function countryCodes(value) {
  const codes = String(value ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (codes.some((c) => !/^[A-Z]{2}$/.test(c))) throw new Error("Countries take two-letter codes separated by commas, like GB, IE.");
  return codes;
}

/** A work, video or deal that is not there (or not yours): a page that says so, with the way back, and nothing to retry. */
export function notThere(main, title, line, back) {
  document.title = "Not found: Orbe";
  main.replaceChildren(
    h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, title),
    h("p", { class: "ap-lede" }, line),
    h("p", null, h("a", { class: "ob-lnk", href: back[1] }, back[0])),
  );
}

/**
  Focus goes back where it was; when that is gone or hidden (a chip redrawn,
  a screen replaced, a menu closed), to the screen's title, so it is never left on the page itself.
*/
/**
  Where the focus goes back to when a drawer or dialog closes: the focused
  element, or, when an action button opened it, that button. A busy button
  is disabled while it runs, which leaves the focus on the page itself.
*/
export function opener() {
  const a = document.activeElement;
  return a && a !== document.body ? a : (document.querySelector("button[aria-busy=true]") ?? a);
}

export function refocus(el) {
  const to = el?.isConnected && el.getClientRects().length && el !== document.body && el !== document.documentElement ? el : (document.querySelector("main [data-title]") ?? document.querySelector("main"));
  to?.focus?.({ preventScroll: true });
}

export const ok = (text) => h("p", { class: "ap-ok", role: "status" }, text);

/** A feature whose API is still being built: said plainly, never shown as live. */
export function soon(name, text) {
  return h("div", { class: "ap-soon" }, h("span", { class: "ob-chip ob-chip--soon" }, "Coming soon"), h("h3", { class: "ap-h3" }, name), h("p", null, text));
}

export const empty = (text, ...more) => h("div", { class: "ap-empty" }, h("p", null, text), ...more);

/**
  Loads into a container: a loading line, then the render, or the error with
  a retry. With soon, a 404 from a route still being built shows "coming soon".
*/
export async function block(el, load, render, opts = {}) {
  // Read again over something already shown, the old content stays until the answer comes; only a wait long enough to notice shows the skeleton.
  let slow = 0;
  if (el.childElementCount && !el.querySelector(":scope > .cn-loading")) {
    el.setAttribute("aria-busy", "true");
    slow = setTimeout(() => loading(el, opts.loadingText), 150);
  } else loading(el, opts.loadingText);
  try {
    const data = await load();
    clearTimeout(slow);
    el.removeAttribute("aria-busy");
    el.replaceChildren(...[render(data)].flat(Infinity).filter(Boolean));
  } catch (e) {
    clearTimeout(slow);
    el.removeAttribute("aria-busy");
    if (opts.soon && notBuiltYet(e)) el.replaceChildren(soon(opts.soon[0], opts.soon[1]));
    else el.replaceChildren(failure(e, () => block(el, load, render, opts)));
  }
}

/** A short confirmation at the foot of the window, gone after a few seconds; read out once. With link, it carries one way on and stays a little longer. */
export function toast(text, link) {
  let region = document.querySelector(".cn-toasts");
  if (!region) {
    region = h("div", { class: "cn-toasts", "aria-hidden": "true", popover: "manual" });
    document.body.append(region);
  }
  // Raised into the top layer with each toast, so it shows above a drawer or dialog opened before it.
  if (region.showPopover) {
    if (region.matches(":popover-open")) region.hidePopover();
    region.showPopover();
  }
  const t = h("div", { class: `cn-toast${link ? " cn-toast--link" : ""}` }, h("span", null, text), link ? h("a", { class: "cn-toast-a", href: link.href, tabindex: "-1" }, link.label) : null);
  region.append(t);
  requestAnimationFrame(() => t.classList.add("is-in"));
  let held = false;
  t.addEventListener("pointerenter", () => (held = true));
  t.addEventListener("pointerleave", () => (held = false));
  const leave = () => {
    if (held) return setTimeout(leave, 800);
    t.classList.remove("is-in");
    setTimeout(() => t.remove(), 240);
  };
  setTimeout(leave, link ? 6000 : 3200);
  announce(link ? `${text} ${link.label}.` : text);
}

/** Said to a screen reader once, politely. */
export function announce(text) {
  const live = document.querySelector("[data-live]");
  if (!live) return;
  live.textContent = "";
  setTimeout(() => (live.textContent = text), 30);
}

/* ---------- forms ---------- */

export const input = (props) => h("input", { class: "ob-input", ...props });
export const textarea = (props) => h("textarea", { class: "ob-input ap-textarea", rows: 3, ...props });
export const select = (options, props) => h("select", { class: "ob-input ap-select", ...props }, options.map(([v, label]) => h("option", { value: v, selected: props?.value === v }, label)));

export function field(label, control, hint) {
  if (!control.id) control.id = nextId("f");
  let hintEl = null;
  if (hint) {
    hintEl = h("p", { class: "ap-hint", id: `${control.id}-hint` }, hint);
    control.setAttribute("aria-describedby", hintEl.id);
  }
  return h("div", { class: "ap-field" }, h("label", { for: control.id }, label), control, hintEl);
}

export function check(label, props = {}) {
  const box = h("input", { type: "checkbox", ...props });
  return h("label", { class: "ap-check" }, box, h("span", null, label));
}

/* Where focus was when a button went busy: a disabled button lets focus fall to the page, so it is put back after. */
const focusBefore = new WeakMap();
function setBusy(btn, busy) {
  if (busy) {
    focusBefore.set(btn, document.activeElement);
    btn.dataset.label = btn.textContent;
    btn.textContent = "Working";
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  } else {
    btn.textContent = btn.dataset.label ?? btn.textContent;
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    const was = focusBefore.get(btn);
    focusBefore.delete(btn);
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lost && was?.isConnected && was !== document.body) was.focus({ preventScroll: true });
  }
}

/**
  A form that calls the API. onSubmit gets the form's values and returns a
  line to confirm, or nothing; an error is shown under the button as the API
  wrote it. The browser's own checks (required, min, pattern) run first.
*/
export function form(controls, submitLabel, onSubmit, opts = {}) {
  const status = h("div", { class: "ap-status", "aria-live": "polite" });
  const btn = h("button", { class: opts.primary === false ? "ap-quiet" : "ob-btn ob-btn--s", type: "submit" }, submitLabel);
  const f = h("form", { class: "ap-form" }, controls, h("div", { class: "ap-actions" }, btn, opts.extra ?? null), status);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    setBusy(btn, true);
    status.replaceChildren();
    try {
      const said = await onSubmit(new FormData(f), f);
      if (said) {
        status.replaceChildren(ok(said));
        announce(said);
      }
    } catch (err) {
      status.replaceChildren(failure(err));
    } finally {
      if (btn.isConnected) setBusy(btn, false);
      // A Save that turns off once saved (nothing left to save) leaves focus in the form, on its first field, never on the page.
      setTimeout(() => {
        const a = document.activeElement;
        if (f.isConnected && (!a || a === document.body)) (btn.disabled ? f.querySelector("input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)") : btn)?.focus({ preventScroll: true });
      });
    }
  });
  return f;
}

/** A button that calls the API, with its error shown beside it. */
export function action(label, run, opts = {}) {
  const btn = h("button", { class: opts.primary ? "ob-btn ob-btn--s" : `ap-quiet${opts.danger ? " ap-quiet--danger" : ""}`, type: "button" }, label);
  btn.addEventListener("click", async () => {
    if (opts.confirm && !(await confirmBox(opts.confirm, { yes: label, danger: opts.danger }))) return;
    const host = btn.closest(".ap-actions") ?? btn.parentElement;
    host?.nextElementSibling?.classList.contains("ap-msg") && host.nextElementSibling.remove();
    setBusy(btn, true);
    try {
      const said = await run();
      if (said) toast(said);
    } catch (err) {
      host?.after(failure(err));
    } finally {
      if (btn.isConnected) setBusy(btn, false);
    }
  });
  return btn;
}

export const actions = (...btns) => h("div", { class: "ap-actions" }, btns);

/**
  Asks before something that matters: a small dialog in the console's voice,
  with the action's own words on its button. Escape or Cancel says no, and
  focus goes back where it was. Resolves true or false.
*/
export function confirmBox(text, { yes = "Confirm", danger = false, title } = {}) {
  return new Promise((resolve) => {
    const back = opener();
    const no = h("button", { class: "cn-btn cn-btn--ghost", type: "button", value: "no" }, "Cancel");
    const go = h("button", { class: `cn-btn ${danger ? "cn-btn--danger" : "cn-btn--primary"}`, type: "button", value: "yes" }, yes);
    const d = h("dialog", { class: "cn-confirm", "aria-label": title ?? yes },
      title ? h("p", { class: "cn-confirm-t" }, title) : null,
      h("p", { class: "cn-confirm-d" }, text),
      h("div", { class: "cn-confirm-actions" }, no, go),
    );
    let answer = false;
    no.addEventListener("click", () => d.close());
    go.addEventListener("click", () => ((answer = true), d.close()));
    d.addEventListener("click", (e) => e.target === d && d.close());
    d.addEventListener("close", () => {
      d.remove();
      refocus(back);
      resolve(answer);
    });
    document.body.append(d);
    d.showModal();
    (danger ? no : go).focus();
  });
}

/* ---------- tabs ---------- */

const remembered = (key) => {
  try {
    return localStorage.getItem(`orbe.tab.${key}`);
  } catch {
    return null;
  }
};
const remember = (key, id) => {
  try {
    localStorage.setItem(`orbe.tab.${key}`, id);
  } catch {
    // Private windows may refuse; the tab is simply not remembered.
  }
};

/**
  Tabs within a screen, with arrow keys. A screen's own tabs (Deals, Record)
  are remembered on this device. A thing's tabs (a work, a campaign, a video)
  are part of its address instead (opts.address): ?tab= says which is open,
  each choice is a step Back and Forward move through, and nothing carries
  over to the next work. opts.alias maps older tab names to current ones.
*/
export function tabs(key, items, initial, opts = {}) {
  const address = opts.address === true;
  const alias = opts.alias ?? {};
  const list = h("div", { class: "ap-tabs", role: "tablist", "aria-label": key });
  const panelEl = h("div", { class: "ap-tabpanel", role: "tabpanel", tabindex: "0" });
  const buttons = items.map((it) =>
    h("button", { class: "ap-tab", type: "button", role: "tab", id: `tab-${key}-${it.id}`, "aria-controls": "", "aria-selected": "false", tabindex: "-1", onclick: () => choose(it.id, "push") }, it.label),
  );
  list.append(...buttons);
  const pid = nextId("tp");
  panelEl.id = pid;
  for (const b of buttons) b.setAttribute("aria-controls", pid);
  let current = null;
  /*
    On a narrow screen the strip scrolls: an edge fades where more tabs wait
    beyond it, and the tab chosen is brought into view with the next one
    peeking, so no tab is ever off screen without a sign.
  */
  const edges = () => {
    const max = list.scrollWidth - list.clientWidth;
    const at = list.scrollLeft;
    const fade = max <= 1 ? "" : at <= 1 ? "end" : at >= max - 1 ? "start" : "both";
    if ((list.dataset.fade ?? "") !== fade) list.dataset.fade = fade;
  };
  const reveal = (b) => {
    if (list.scrollWidth <= list.clientWidth) return;
    const box = list.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    const room = 40;
    if (r.left < box.left + room) list.scrollLeft -= box.left + room - r.left;
    else if (r.right > box.right - room) list.scrollLeft += r.right - (box.right - room);
  };
  list.addEventListener("scroll", edges, { passive: true });
  if (typeof ResizeObserver === "function") new ResizeObserver(() => (edges(), current !== null && reveal(buttons[current]))).observe(list);
  const known = (id) => (items.some((x) => x.id === alias[id]) ? alias[id] : items.some((x) => x.id === id) ? id : null);
  /** how: "push" (a click), "replace" (an arrow key, or putting an older name right), or nothing (the address already says it). */
  function choose(id, how) {
    const i = Math.max(0, items.findIndex((x) => x.id === id));
    if (address && how) {
      const u = new URL(location.href);
      if (i === 0) u.searchParams.delete("tab");
      else u.searchParams.set("tab", items[i].id);
      if (u.href !== location.href) history[how === "push" ? "pushState" : "replaceState"](history.state, "", u);
    } else if (how) remember(key, items[i].id);
    if (current === i) return;
    current = i;
    buttons.forEach((b, j) => {
      b.setAttribute("aria-selected", String(i === j));
      b.tabIndex = i === j ? 0 : -1;
    });
    panelEl.setAttribute("aria-labelledby", buttons[i].id);
    reveal(buttons[i]);
    panelEl.replaceChildren();
    items[i].render(panelEl);
  }
  list.addEventListener("keydown", (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const to = e.key === "ArrowRight" ? (i + 1) % buttons.length : e.key === "ArrowLeft" ? (i - 1 + buttons.length) % buttons.length : e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    buttons[to].focus();
    // Moving along with the arrows is looking, not a step to go back through.
    choose(items[to].id, "replace");
  });
  const set = h("div", { class: "ap-tabset" }, list, panelEl);
  if (address) {
    // Back or Forward to the same thing with another tab: main.js hands the address here instead of drawing the screen again.
    set.dataset.addressTabs = "";
    set.addEventListener("orbe:address", () => {
      const had = buttons.includes(document.activeElement);
      choose(known(new URLSearchParams(location.search).get("tab")) ?? items[0].id);
      if (had) buttons[current].focus();
    });
    const want = known(initial);
    // An older or unknown tab name is put right in the address bar, so the address always names the tab shown.
    choose(want ?? items[0].id, initial && want !== initial ? "replace" : null);
  } else choose(initial && items.some((x) => x.id === initial) ? initial : (remembered(key) ?? items[0].id));
  return set;
}
