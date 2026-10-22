/*
  Where viewers leave this upload (FEATURES=retention): the share still
  watching after the opening, the steepest drops, and up to three stretches
  worth tightening, read from YouTube Analytics with the creator's own
  connection (GET /v1/me/retention/:workId). Read only: cutting is theirs.
*/
import { api, seg } from "../api.js";
import { emptyState } from "../console-ui.js";
import { block, h } from "../ui.js";

const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/** The curve as a small line, the cuts shaded. No figures are drawn that the reading does not hold. */
function sketch(r) {
  const W = 600, H = 120;
  const x = (sec) => (sec / r.durationSec) * W;
  return h("svg", { class: "cn-ret-svg", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Still watching after the opening: ${Math.round(r.opening.stillWatching * 100)} in 100; at the end: ${Math.round(r.endWatching * 100)} in 100.` },
    ...r.cuts.map((c) => h("rect", { class: "cn-ret-cut", x: x(c.fromSec), y: 0, width: Math.max(2, x(c.toSec) - x(c.fromSec)), height: H })),
    h("line", { class: "cn-ret-open", x1: x(r.opening.sec), y1: 0, x2: x(r.opening.sec), y2: H }),
    ...r.drops.map((d) => h("circle", { class: "cn-ret-drop", cx: x(d.fromSec), cy: H / 2, r: 4 })),
  );
}

export function retentionTab(el, id) {
  return block(el, () => api.get(`/v1/me/retention/${seg(id)}`), ({ retention: t }) => {
    if (!t.available) {
      return emptyState("pulse", t.reason, t.action === "connect" ? [["Connect YouTube", "/orbe-site/demo/app/settings/connections", true]] : []);
    }
    const r = t.reading;
    const vs = r.opening.vsTypical ? `, ${r.opening.vsTypical === "typical" ? "typical" : `${r.opening.vsTypical} typical`} for videos this long` : "";
    return [
      h("p", { class: "cn-run-who" }, `${Math.round(r.opening.stillWatching * 100)} in every 100 viewers are still watching at ${mmss(r.opening.sec)}${vs}.`),
      sketch(r),
      r.cuts.length
        ? h("ul", { class: "cn-run-list cn-run-list--wide" }, r.cuts.map((c) => h("li", null, h("span", null, h("b", null, `${mmss(c.fromSec)} to ${mmss(c.toSec)}`)), h("span", { class: "cn-hist-d" }, c.why))))
        : h("p", null, "No stretch stands out to cut: viewers leave at an even pace."),
      r.drops.length ? h("p", { class: "cn-label" }, `Steepest drops at ${r.drops.map((d) => mmss(d.fromSec)).join(", ")}.`) : null,
      h("p", { class: "cn-label" }, r.basis),
    ];
  });
}
