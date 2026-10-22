/*
  The composer: one box to ask Orbe to run a tool, as on Home and docked at
  the foot of Runs. Chips choose the tool, the account and the window;
  Run (or Ctrl Enter, Cmd Enter on a Mac) hands a job to onRun. With the
  tool on "Ask Orbe", the words choose: an @handle rates a channel, an
  amount checks an offer, "sponsor" finds brands, a title rates a work.
*/
import { can, on } from "./api.js";
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
  { id: "sponsor", name: "Find a sponsor", line: "Brands sponsoring creators like you", glyph: "products/selling/", k: "sell", hint: "Leave empty, or a word to filter by" },
  { id: "explain", name: "Explain my rating", line: "Your rating, in plain English", glyph: "products/diligence/", k: "rec", feature: "rating", hint: "Leave empty" },
];

export const WINDOWS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]];

export const toolsOn = () => STUDIO_TOOLS.filter((t) => (!t.feature || on(t.feature)) && can(t.needs));

/** Which tool a few words ask for, when the tool chip is on Ask Orbe. */
export function detect(text) {
  const tool = guess(text);
  // A tool this person's role cannot run falls back to rating the work.
  return toolsOn().some((t) => t.id === tool) || !STUDIO_TOOLS.some((t) => t.id === tool) ? tool : "rate-work";
}

function guess(text) {
  const q = text.trim();
  if (/^@[\w.-]{2,}$/.test(q) || /youtube\.com\/|youtu\.be\//i.test(q) || /^UC[\w-]{20,}$/.test(q)) return "rate-channel";
  if (/^(?:£|gbp\s*)?\s*\d[\d,]*(?:\.\d+)?\s*(?:k|pounds?|gbp)?$/i.test(q) || /\b(?:offer|offered|offering)\b.*\d/i.test(q)) return "offer";
  if (/\bsponsor|\bbrands?\b/i.test(q)) return "sponsor";
  if (/\bpric(?:e|ing)\b|\brate card\b|\bcharge\b/i.test(q)) return "price";
  if (/\bexplain\b|\bwhy\b.*\brating\b|\bmy rating\b/i.test(q)) return "explain";
  return "rate-work";
}

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
  { tool, text, account, window } with tool already resolved from Ask Orbe.
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
    const tool = job.tool === "auto" ? detect(words) : job.tool;
    if (job.tool === "auto" && !words) {
      text.focus();
      return;
    }
    onRun({ tool, text: words, account: job.account, window: job.window });
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
