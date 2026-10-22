/*
  The Sky band at the top of a home: one calm line, a quiet one under it,
  and the painted sky behind them (sky.js). The composer sits just below it,
  overlapping its foot.
*/
import { paintedSky } from "./sky.js";
import { h } from "./ui.js";

export const firstName = (name) => (name ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim().split(/\s+/)[0] || "";

/** The Sky band: one calm line, a quiet one, and the painted sky behind them. */
export function band(title, sub) {
  const sec = h("section", { class: "cn-band", "aria-labelledby": "band-h" },
    h("div", { class: "cn-band-in" },
      h("h1", { class: "cn-band-h", id: "band-h", tabindex: "-1", "data-title": "" }, title),
      h("p", { class: "cn-band-sub" }, sub),
    ),
  );
  paintedSky(sec);
  return sec;
}
