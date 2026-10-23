/*
  The composer: one box to ask Orbe to run a tool, as on Home and docked at
  the foot of Runs. Chips choose the tool, the account and the window;
  Run (or Ctrl Enter, Cmd Enter on a Mac) hands a job to onRun. With the
  tool on "Ask Orbe", the job goes as tool "auto" with the sentence as
  typed, and the server reads it (services/intent.ts): an @handle rates a
  channel, an amount checks an offer, "sponsor" finds brands, a window
  ("this month") sets the window, and what is left is a title.
*/
import { can, canRateChannels, on } from "./api.js";
import { tile } from "./catalogue.js";
import { icon } from "./icons.js";
import { h } from "./ui.js";

/** The tools Runs runs, in the order the tool chip lists them. */
export const STUDIO_TOOLS = [
  { id: "auto", name: "Ask Orbe", line: "Orbe picks the tool from your words", glyph: "products/you/", k: "rec" },
  { id: "rate-work", name: "Rate a work", line: "A work of yours, against creators the same size", glyph: "products/rate/", k: "also", feature: "rating", hint: "A title, or leave empty for your best in the window" },
  { id: "rate-channel", name: "Rate a channel", line: "Any YouTube channel, by @handle", glyph: "products/rate/", k: "also", feature: "rating", hint: "@handle, channel id or link" },
  { id: "offer", name: "Check an offer", line: "Is this offer fair for your size?", glyph: "products/offer/", k: "spon", feature: "sponsorships", needs: "read.money", hint: "The amount offered, like 450" },
  { id: "price", name: "Price a slot", line: "What your results support, per format", glyph: "products/sponsorships/", k: "spon", feature: "sponsorships", needs: "read.money", hint: "Leave empty, or name a format" },
  { id: "sponsor", name: "Sponsors like you", line: "Brands that sponsor creators like you", glyph: "products/selling/", k: "sell", hint: "Leave empty, or a word to filter by" },
  { id: "explain", name: "Explain my rating", line: "Your rating, in plain English", glyph: "products/diligence/", k: "rec", feature: "rating", hint: "Leave empty" },
];

export const WINDOWS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]];

/** The tools that can answer here: switched on, allowed for this role, and (for a channel) a server that can read public YouTube. */
export const toolsOn = () => STUDIO_TOOLS.filter((t) => (!t.feature || on(t.feature)) && can(t.needs) && (t.id !== "rate-channel" || canRateChannels()));

/** A chip with a hidden native select over it, so it is a real control everywhere, phones included. */
function chip(label, options, value, render, onChange) {
  const sel = h("select", { "aria-label": label }, options.map(([v, text]) => h("option", { value: v, selected: v === value }, text)));
  const face = h("span", { class: "cn-cchip-face" });
  const draw = () => face.replaceChildren(...[render(sel.value)].flat().filter(Boolean));
  sel.addEventListener("change", () => {
    draw();
    onChange(sel.value);
  });
  draw();
  return { node: h("label", { class: "cn-cchip" }, face, icon("chevron", { cls: "cn-i--chev" }), sel), set: (v) => ((sel.value = v), draw()) };
}

/**
  composer({ accounts, onRun, initial, placeholder }) returns { node, focus,
  setTool, busy }. accounts: [{ id, handle, kind }]. onRun gets
  { tool, text, account, window }, tool "auto" for Ask Orbe.
*/
export function composer({ accounts = [], onRun, initial = {}, placeholder }) {
  const tools = toolsOn();
  const job = { tool: tools.some((t) => t.id === initial.tool) ? initial.tool : "auto", account: initial.account ?? "all", window: initial.window ?? "30" };
  const text = h("textarea", { class: "cn-composer-text", rows: 1, placeholder: placeholder ?? "Rate a work, check an offer, find a sponsor...", "aria-label": "What should Orbe run?", maxlength: 300 });
  text.value = initial.text ?? "";
  const grow = () => {
    text.style.height = "auto";
    text.style.height = `${Math.min(180, text.scrollHeight)}px`;
  };
  text.addEventListener("input", grow);
  const toolChip = chip("Tool", tools.map((t) => [t.id, t.name]), job.tool, (v) => {
    const t = tools.find((x) => x.id === v);
    return [tile(t.glyph, t.k, h), h("span", null, t.name)];
  }, (v) => {
    job.tool = v;
    const t = tools.find((x) => x.id === v);
    text.placeholder = t.hint ?? placeholder ?? "Rate a work, check an offer, find a sponsor...";
  });
  const accountChip = chip("Account", [["all", "All accounts"], ...accounts.map((a) => [a.id, a.handle])], job.account, (v) => [icon("user"), h("span", null, v === "all" ? "All accounts" : accounts.find((a) => a.id === v)?.handle ?? "Account")], (v) => (job.account = v));
  const windowChip = chip("Window", WINDOWS, job.window, (v) => [icon("clock"), h("span", { class: "cn-cchip-k" }, "Last"), h("span", null, WINDOWS.find(([k]) => k === v)?.[1] ?? v)], (v) => (job.window = v));
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const run = h("button", { class: "cn-run", type: "submit" }, "Run", h("kbd", { class: "cn-kbd" }, mac ? "⌘ ↵" : "Ctrl ↵"));
  const submit = (e) => {
    e?.preventDefault();
    const words = text.value.trim();
    if (job.tool === "auto" && !words) {
      text.focus();
      return;
    }
    onRun({ tool: job.tool, text: words, account: job.account, window: job.window });
  };
  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) submit(e);
  });
  const node = h("form", { class: "cn-composer", onsubmit: submit, role: "search" },
    text,
    h("div", { class: "cn-composer-bar" },
      h("div", { class: "cn-composer-chips" }, toolChip.node, accounts.length > 1 ? accountChip.node : null, windowChip.node),
      h("span", { class: "cn-composer-hint" }, "Shift ↵ for a new line"),
      run,
    ),
  );
  // An empty box is one line already; only a text given at the start needs measuring, once it is on the page.
  if (text.value) requestAnimationFrame(grow);
  return {
    node,
    focus: () => text.focus(),
    setText: (v) => ((text.value = v), grow()),
    setTool: (v) => {
      job.tool = v;
      toolChip.set(v);
    },
    busy: (on2) => (run.disabled = on2),
  };
}
