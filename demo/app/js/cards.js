/*
  The pieces every working screen draws its cards with, so a set-up screen,
  a campaign or the desk reads like Home, the Library and Deals: a table in
  the Deals manner, label and value rows, a status pill from a tone, choices
  as quiet pills, a form kept to a readable width, and a row's own buttons.

  Structure only: console.css styles every class here.
*/
import { pill } from "./console-ui.js";
import { action, h } from "./ui.js";

/** A table edge to edge in its card. heads: [label, "num"?]; rows: arrays of cells (a td passes as it is), or { cells, cls, skip }. */
export function table(heads, rows, opts = {}) {
  const num = heads.map(([, kind]) => kind === "num");
  return h("div", { class: "dl-wrap" },
    h("table", { class: `dl-table cn-dt${opts.cls ? ` ${opts.cls}` : ""}` },
      opts.caption ? h("caption", { class: "ob-sr" }, opts.caption) : null,
      h("thead", null, h("tr", null, heads.map(([label], i) => h("th", { scope: "col", class: num[i] ? "dl-num" : null }, label)))),
      h("tbody", null, rows.filter(Boolean).map((r) => {
        // skip: how many leading columns a cell spanning rows above already fills.
        const { cells, cls = null, skip = 0 } = Array.isArray(r) ? { cells: r } : r;
        // Each cell carries its column's name, so on a phone a row reads as a short list of labelled values.
        return h("tr", { class: [cls, skip ? "cn-tr-cont" : null].filter(Boolean).join(" ") || null },
          cells.map((c, i) => (c instanceof HTMLTableCellElement ? c : h("td", { class: num[i + skip] ? "dl-num" : null, "data-label": heads[i + skip]?.[0] ?? "" }, h("span", { class: "cn-dt-v" }, c)))));
      })),
    ),
  );
}

/** A cell's main words with a quieter line under them. */
export const twoLine = (main, sub) => h("span", { class: "cn-two" }, h("span", { class: "cn-cell-t" }, main), sub ? h("span", { class: "dl-sub" }, sub) : null);

/** Label and value rows, as Settings shows them. */
export const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))));

const TONES = { good: "done", warn: "needs", bad: "failed", off: "off" };
/** A status pill from the older tones (good, warn, off); no tone is a plain, quiet pill. */
export const status = (text, tone) => pill(TONES[tone] ?? "idle", text);

/** A form kept to a width a line of it can be read at. */
export function narrow(form) {
  form.classList.add("cn-form");
  return form;
}

/** Several choices at once, as quiet pills that fill when chosen. options: [value, label, checked?]. */
export function picks(legend, name, options) {
  return h("fieldset", { class: "cn-picks" },
    h("legend", null, legend),
    h("div", { class: "cn-picks-row" },
      options.map(([value, label, checked]) => h("label", { class: "cn-pick" }, h("input", { type: "checkbox", name, value, checked: !!checked }), h("span", null, label))),
    ),
  );
}

/** One yes or no, as a line with a switch-like box: the box stays a real checkbox. */
export function choice(label, props = {}, hint) {
  return h("label", { class: "cn-choice" }, h("input", { type: "checkbox", ...props }), h("span", { class: "cn-choice-t" }, label, hint ? h("span", { class: "dl-sub" }, hint) : null));
}

/** A row's or a card's own button: the console's small button, with action()'s busy state, confirmation and error. */
export function button(label, run, opts = {}) {
  const b = action(label, run, opts);
  b.className = `cn-btn cn-btn--s${opts.primary ? " cn-btn--primary" : opts.quiet ? " cn-btn--ghost" : ""}`;
  return b;
}
