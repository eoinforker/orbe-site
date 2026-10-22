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
export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

/* ---------- layout ---------- */

/** The page title, focused after each navigation so a screen reader hears where it is. */
export const title = (text, lede) => [h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, text), lede ? h("p", { class: "ap-lede" }, lede) : null].filter(Boolean);

/** Orbe's one panel: a window with its name in the bar. */
export function panel(name, ...body) {
  const id = nextId("p");
  return h("section", { class: "ob-win ap-win", "aria-labelledby": id }, h("div", { class: "ob-win-bar" }, h("h2", { class: "ob-win-title", id }, name)), h("div", { class: "ob-win-body" }, ...body));
}

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

function detailList(details) {
  if (Array.isArray(details) && details.length) return h("ul", { class: "ap-details" }, details.map((d) => h("li", null, d.path ? `${d.path}: ${d.message}` : d.message)));
  return null;
}

/** An API error as the API wrote it, with the request id to quote to Orbe. */
export function failure(err, retry) {
  // Sent to the owner is not a failure: say where it went, calmly.
  if (err?.code === "sent_to_owner")
    return h("div", { class: "ap-msg ap-msg--wait", role: "status" }, h("p", null, err.message), h("a", { class: "ob-lnk", href: "/orbe-site/demo/app/settings/team?tab=approvals" }, "See the request"));
  return h(
    "div",
    { class: "ap-msg", role: "alert" },
    h("p", null, err?.message ?? "Something went wrong."),
    detailList(err?.details),
    err?.requestId ? h("p", { class: "ap-ref" }, `Reference ${err.requestId}`) : null,
    retry ? h("button", { class: "ap-quiet", type: "button", onclick: retry }, "Try again") : null,
  );
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
  loading(el, opts.loadingText);
  try {
    const data = await load();
    el.removeAttribute("aria-busy");
    el.replaceChildren(...[render(data)].flat(Infinity).filter(Boolean));
  } catch (e) {
    el.removeAttribute("aria-busy");
    if (opts.soon && notBuiltYet(e)) el.replaceChildren(soon(opts.soon[0], opts.soon[1]));
    else el.replaceChildren(failure(e, () => block(el, load, render, opts)));
  }
}

/** A short confirmation at the foot of the window, gone after a few seconds; read out once. With link, it carries one way on and stays a little longer. */
export function toast(text, link) {
  let region = document.querySelector(".cn-toasts");
  if (!region) {
    region = h("div", { class: "cn-toasts", "aria-hidden": "true" });
    document.body.append(region);
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

function setBusy(btn, busy) {
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.textContent = "Working";
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  } else {
    btn.textContent = btn.dataset.label ?? btn.textContent;
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
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
    const back = document.activeElement;
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
      back?.focus?.({ preventScroll: true });
      resolve(answer);
    });
    document.body.append(d);
    d.showModal();
    (danger ? no : go).focus();
  });
}

/* ---------- tabs, the one thing the app remembers ---------- */

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

/** Tabs within a screen, with arrow keys; the last one chosen is remembered on this device. */
export function tabs(key, items, initial) {
  const list = h("div", { class: "ap-tabs", role: "tablist", "aria-label": key });
  const panelEl = h("div", { class: "ap-tabpanel", role: "tabpanel", tabindex: "0" });
  const buttons = items.map((it) =>
    h("button", { class: "ap-tab", type: "button", role: "tab", id: `tab-${key}-${it.id}`, "aria-controls": "", "aria-selected": "false", tabindex: "-1", onclick: () => choose(it.id, true) }, it.label),
  );
  list.append(...buttons);
  const pid = nextId("tp");
  panelEl.id = pid;
  for (const b of buttons) b.setAttribute("aria-controls", pid);
  function choose(id, keep) {
    const i = Math.max(0, items.findIndex((x) => x.id === id));
    buttons.forEach((b, j) => {
      b.setAttribute("aria-selected", String(i === j));
      b.tabIndex = i === j ? 0 : -1;
    });
    panelEl.setAttribute("aria-labelledby", buttons[i].id);
    if (keep) remember(key, items[i].id);
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
    choose(items[to].id, true);
  });
  choose(initial && items.some((x) => x.id === initial) ? initial : (remembered(key) ?? items[0].id), false);
  return h("div", { class: "ap-tabset" }, list, panelEl);
}
