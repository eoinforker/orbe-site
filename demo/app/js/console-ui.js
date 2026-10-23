/*
  The console's building blocks, on top of ui.js: stat cells with a
  sparkline, the Getting started checklist, empty states, cards, the pixel
  grid of a place among creators the same size, a work's pixel cover, a
  segmented control, a drawer, skeletons, code to copy, and a tool's page
  (Playground and API tabs, inputs, a result with its status, history).

  Structure only: console.css styles every cn-* class, so the look changes
  without touching this file. Inline styles are refused by the app's content
  policy, so sizes that vary are set as custom properties through the CSSOM.
*/
import { api } from "./api.js";
import { TOOLS, tile } from "./catalogue.js";
import { icon } from "./icons.js";
import { h, nextId, opener, refocus, signed } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
const setVar = (el, name, value) => (el.style.setProperty(name, String(value)), el);

/** A small line of values with a soft area under it, scaled to its own range; null with fewer than two points. */
export function sparkline(values, label, opts = {}) {
  const v = (values ?? []).filter((x) => typeof x === "number" && Number.isFinite(x));
  if (v.length < 2) return null;
  const w = 120;
  const ht = 36;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, ht - 3 - ((x - lo) / span) * (ht - 8)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${ht}`, class: `cn-spark${opts.tone ? ` cn-spark--${opts.tone}` : ""}`, role: "img", "aria-label": label ?? `Trend over ${v.length} readings`, preserveAspectRatio: "none" });
  svg.append(
    svgEl("polygon", { class: "cn-spark-area", points: `0,${ht} ${line} ${w},${ht}` }),
    svgEl("polyline", { class: "cn-spark-line", points: line, fill: "none", "vector-effect": "non-scaling-stroke" }),
  );
  const [lx, ly] = pts[pts.length - 1];
  svg.append(svgEl("circle", { class: "cn-spark-dot", cx: lx.toFixed(1), cy: ly.toFixed(1), r: 2.2 }));
  return svg;
}

/** Bars for counts, newest last; null when there is nothing to draw. */
export function bars(values, label) {
  const v = (values ?? []).filter((x) => typeof x === "number" && Number.isFinite(x));
  if (!v.length || Math.max(...v) <= 0) return null;
  const hi = Math.max(...v);
  return h("span", { class: "cn-bars", role: "img", "aria-label": label ?? `${v.length} periods` },
    v.map((x) => setVar(h("span", { class: "cn-bar" }), "--v", Math.max(0.06, x / hi).toFixed(3))));
}

/** One cell of a stat strip: label, figure, a line under it, a trend, and links. */
export function stat({ label, value, line, spark, links = [], tone }) {
  return h("section", { class: `cn-stat${tone ? ` cn-stat--${tone}` : ""}` },
    h("p", { class: "cn-stat-label" }, label),
    h("div", { class: "cn-stat-row" }, h("p", { class: "cn-stat-value" }, value), spark ?? null),
    line ? h("p", { class: "cn-stat-line" }, line) : null,
    links.length ? h("div", { class: "cn-stat-links" }, links.map(([text, href]) => h("a", { class: "cn-btn cn-btn--xs", href }, text))) : null,
  );
}

export const statStrip = (cells) => h("div", { class: "cn-strip" }, cells.filter(Boolean));

/** Getting started: steps done are ticked and struck through; the first not done is the one to do. */
export function checklist(steps) {
  const firstOpen = steps.findIndex((s) => !s.done);
  return h("ol", { class: "cn-checks" },
    steps.map((s, i) =>
      h("li", { class: `cn-check${s.done ? " is-done" : ""}${i === firstOpen ? " is-next" : ""}` },
        h("span", { class: "cn-check-mark", "aria-hidden": "true" }, s.done ? icon("check") : null),
        h("div", { class: "cn-check-main" },
          s.done || !s.href ? h("p", { class: "cn-check-t" }, s.name) : h("a", { class: "cn-check-t", href: s.href }, s.name),
          s.line && !s.done ? h("p", { class: "cn-check-d" }, s.line) : null,
        ),
        i === firstOpen && s.href ? h("a", { class: "cn-check-go", href: s.href, "aria-hidden": "true", tabindex: "-1" }, "Start", icon("arrowRight")) : null,
        h("span", { class: "ob-sr" }, s.done ? "Done" : "Not done yet"),
      ),
    ),
  );
}

/** The alert strip: only when something is waiting on this person, each a link to where it is done. */
export function alerts(items) {
  if (!items?.length) return null;
  return h("section", { class: "cn-alerts", "aria-label": "Waiting on you" },
    items.slice(0, 3).map((n) => h("a", { class: "cn-alert", href: n.href }, h("span", { class: "cn-alert-dot", "aria-hidden": "true" }), h("span", { class: "cn-alert-t" }, n.title), h("span", { class: "cn-alert-d" }, n.line), icon("arrowRight"))),
  );
}

/** Nothing here yet: an icon, a line (and a smaller one), and up to two actions as [label, href or function, primary]. */
export function emptyState(iconName, text, actions = [], more) {
  return h("div", { class: "cn-empty" },
    h("span", { class: "cn-empty-ico" }, icon(iconName)),
    h("p", { class: "cn-empty-t" }, text),
    more ? h("p", { class: "cn-empty-d" }, more) : null,
    actions.length
      ? h("div", { class: "cn-empty-actions" },
          actions.map(([label, to, primary]) =>
            typeof to === "function"
              ? h("button", { class: `cn-btn cn-btn--s${primary ? " cn-btn--primary" : ""}`, type: "button", onclick: to }, label)
              : h("a", { class: `cn-btn cn-btn--s${primary ? " cn-btn--primary" : ""}`, href: to }, label),
          ))
      : null,
  );
}

/** A section with a heading row (title, optional line, optional actions on the right) and a body. */
export function card(title, ...body) {
  return h("section", { class: "cn-card" }, title ? h("header", { class: "cn-card-head" }, h("h2", { class: "cn-h2" }, title)) : null, h("div", { class: "cn-card-body" }, ...body));
}

export function section({ title, line, actions, cls }, ...body) {
  return h("section", { class: `cn-card${cls ? ` ${cls}` : ""}` },
    h("header", { class: "cn-card-head" }, h("div", null, h("h2", { class: "cn-h2" }, title), line ? h("p", { class: "cn-card-line" }, line) : null), actions ? h("div", { class: "cn-card-actions" }, actions) : null),
    h("div", { class: "cn-card-body" }, ...body),
  );
}

/**
  A place among a hundred creators the same size: a ten by ten grid, filled
  up to the place, the place itself marked. place is 1 to 100 (how many in
  100 this one beats, plus one), or null for an empty grid.
*/
export function pixelGrid(place, opts = {}) {
  const p = place === null || place === undefined ? null : Math.max(1, Math.min(100, Math.round(place)));
  const grid = h("div", { class: `cn-grid100${opts.cls ? ` ${opts.cls}` : ""}`, role: "img", "aria-label": p === null ? "No place yet" : opts.label ?? `Better than ${p - 1} in 100` });
  for (let i = 0; i < 100; i++) {
    // Filled from the bottom left, row by row, as the site's grid fills.
    const row = 9 - Math.floor(i / 10);
    const col = i % 10;
    const cell = h("span", { class: `cn-cell${p !== null && i < p - 1 ? " is-on" : ""}${p !== null && i === p - 1 ? " is-you" : ""}` });
    setVar(cell, "--r", row + 1);
    setVar(cell, "--c", col + 1);
    setVar(cell, "--i", i);
    grid.append(cell);
  }
  return grid;
}

/* A small seeded generator, so a work's cover is the same every time it is drawn. */
function seeded(text) {
  let x = 2166136261;
  for (const ch of String(text)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return () => {
    x = Math.imul(x ^ (x >>> 15), 2246822507);
    x = Math.imul(x ^ (x >>> 13), 3266489909);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
}

/**
  A work's cover, drawn from its id: a field of pixels in its kind's colour
  pair, denser where the work did better against creators the same size.
  Never a picture of the work: Orbe keeps no thumbnails.
*/
export function cover(seedText, k, strength = 0.5) {
  const rnd = seeded(seedText);
  const cols = 32;
  const rows = 18;
  const svg = svgEl("svg", { viewBox: `0 0 ${cols} ${rows}`, class: "cn-cover-art", "shape-rendering": "crispEdges", "aria-hidden": "true", preserveAspectRatio: "xMidYMid slice" });
  const lift = Math.max(0, Math.min(1, strength));
  // A skyline of columns, smoothed so neighbours agree, higher where the work did better.
  let prev = 4 + rnd() * 4;
  let drift = 0;
  for (let x = 0; x < cols; x++) {
    drift = drift * 0.7 + (rnd() - 0.5) * 3;
    const want = 3 + lift * 9 + drift + (rnd() - 0.5) * 3;
    const ht = Math.max(1, Math.min(rows - 3, Math.round(prev * 0.55 + want * 0.45)));
    prev = ht;
    svg.append(svgEl("rect", { x, y: rows - ht, width: 1, height: ht, class: "cn-px-a" }));
    svg.append(svgEl("rect", { x, y: rows - ht, width: 1, height: 1, class: "cn-px-b" }));
    // A few loose pixels above, as the site's pixel fields have.
    if (rnd() < 0.12) svg.append(svgEl("rect", { x, y: Math.max(0, rows - ht - 2 - Math.floor(rnd() * 4)), width: 1, height: 1, class: "cn-px-b" }));
  }
  return h("span", { class: "cn-cover", "data-k": k }, svg);
}

/** A segmented control. options: [value, label, iconName?]. */
export function segmented(label, options, value, onChange, opts = {}) {
  const wrap = h("div", { class: `cn-seg${opts.cls ? ` ${opts.cls}` : ""}`, role: "radiogroup", "aria-label": label });
  const btns = options.map(([v, text, ico]) =>
    h("button", { class: "cn-seg-btn", type: "button", role: "radio", "aria-checked": String(v === value), title: opts.iconOnly ? text : null, "aria-label": opts.iconOnly ? text : null, onclick: () => pick(v) }, ico ? icon(ico) : null, opts.iconOnly ? null : text),
  );
  function pick(v) {
    btns.forEach((b, i) => b.setAttribute("aria-checked", String(options[i][0] === v)));
    onChange(v);
  }
  wrap.append(...btns);
  return wrap;
}

/**
  A rating, drawn one way wherever it appears: the same face, with a real
  minus sign, in Sky above zero and in the text colour at or below it.
  size s sits in a row of a table or list; a figure passes its own class.
*/
export const rating = (value, { size = "s", tag = "span", cls = "" } = {}) =>
  h(tag, { class: `cn-rating${size ? ` cn-rating--${size}` : ""}${value > 0 ? " is-up" : ""}${cls ? ` ${cls}` : ""}` }, signed(value));

/** A status pill: idle, running, done, failed, live, coming, off. */
export const pill = (state, text) => h("span", { class: `cn-pill cn-pill--${state}` }, h("span", { class: "cn-pill-dot", "aria-hidden": "true" }), text);

/** Grey bars where content is about to be. */
export const skeleton = (n = 3, cls = "") => h("div", { class: `cn-skel${cls ? ` ${cls}` : ""}`, "aria-hidden": "true" }, Array.from({ length: n }, () => h("span", { class: "cn-skel-line" })));

/** A block of text to copy, with a button that copies it. */
export function codeBlock(text, label) {
  const btn = h("button", { class: "cn-code-copy", type: "button", "aria-label": `Copy ${label ?? "code"}` }, icon("copy"), h("span", null, "Copy"));
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.lastChild.textContent = "Copied";
    } catch {
      btn.lastChild.textContent = "Select and copy";
    }
    setTimeout(() => (btn.lastChild.textContent = "Copy"), 2000);
  });
  return h("div", { class: "cn-code" }, h("div", { class: "cn-code-bar" }, h("span", null, label ?? ""), btn), h("pre", null, h("code", null, text)));
}

/**
  A panel that slides in from the right (from the bottom on a phone), as a
  modal dialog: Escape and the backdrop close it, focus returns to where it
  was. build(close) returns its body. Returns close.
*/
export function drawer(label, build, opts = {}) {
  const back = opener();
  const d = h("dialog", { class: `cn-drawer${opts.wide ? " cn-drawer--wide" : ""}`, "aria-label": label });
  const close = () => d.open && d.close();
  const closeBtn = h("button", { class: "cn-iconbtn", type: "button", "aria-label": "Close", onclick: close }, icon("close"));
  const body = h("div", { class: "cn-drawer-body" });
  d.append(h("div", { class: "cn-drawer-bar" }, h("p", { class: "cn-drawer-label" }, label), closeBtn), body);
  d.addEventListener("click", (e) => e.target === d && close());
  d.addEventListener("close", () => {
    d.remove();
    opts.onClose?.();
    refocus(back);
  });
  document.body.append(d);
  d.showModal();
  Promise.resolve(build(close)).then((kids) => body.replaceChildren(...[kids].flat().filter(Boolean)));
  closeBtn.focus({ focusVisible: false });
  return close;
}

/**
  A tool's page, laid out as a model page is: its tile, its name and path,
  tags, then Playground and API tabs. The Playground has the inputs on the
  left and the result on the right, with a status and a JSON view of the
  last answer; history underneath. The tool fills inputs, result and history.
*/
export function toolPage({ tool, title, line, tags = [], inputs, results, history, api, historyNote = "Your team, every device" }) {
  const id = nextId("tp");
  const status = h("span", { class: "cn-result-status" }, pill("idle", "Idle"));
  const json = h("pre", { class: "cn-json", hidden: true }, h("code", null, "Run the tool to see its answer as JSON."));
  const preview = h("div", { class: "cn-result-body", "aria-live": "polite" }, results);
  const view = segmented("Result view", [["preview", "Preview", "image"], ["json", "JSON", "code"]], "preview", (v) => {
    preview.hidden = v !== "preview";
    json.hidden = v !== "json";
  }, { cls: "cn-seg--s" });
  const play = h("div", { class: "cn-tp-panel", id: `${id}-play`, role: "tabpanel", "aria-labelledby": `${id}-t-play` },
    h("div", { class: "cn-play" },
      h("section", { class: "cn-play-in", "aria-label": "Input" }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h2" }, "Input")), h("div", { class: "cn-play-body" }, inputs)),
      h("section", { class: "cn-play-out", "aria-label": "Result" }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h2" }, "Result"), status, h("span", { class: "cn-grow" }), view), h("div", { class: "cn-play-body" }, preview, json)),
    ),
    history ? h("section", { class: "cn-play-hist", "aria-labelledby": `${id}-hist` }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h2", id: `${id}-hist` }, "History"), h("span", { class: "cn-play-note" }, historyNote)), h("div", { class: "cn-play-body" }, history)) : null,
  );
  const apiPanel = h("div", { class: "cn-tp-panel", id: `${id}-api`, role: "tabpanel", "aria-labelledby": `${id}-t-api`, hidden: true }, api ? apiTab(api) : null);
  const tabBtn = (key, text) => h("button", { class: "cn-tp-tab", type: "button", role: "tab", id: `${id}-t-${key}`, "aria-controls": `${id}-${key}`, "aria-selected": String(key === "play"), onclick: () => select(key) }, text);
  const tabs = [tabBtn("play", "Playground"), api ? tabBtn("api", "API") : null].filter(Boolean);
  function select(key) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.id.endsWith(`-t-${key}`))));
    play.hidden = key !== "play";
    apiPanel.hidden = key !== "api";
  }
  const node = h("div", { class: "cn-tp" },
    pageHead({ tileNode: tool ?? null, title, line, tags }),
    h("div", { class: "cn-tp-tabs", role: "tablist", "aria-label": "Views" }, tabs),
    play,
    apiPanel,
  );
  return {
    node,
    /** Sets the status pill and, when given, the JSON view's text. */
    status(state, text, answer) {
      status.replaceChildren(pill(state, text));
      if (answer !== undefined) json.firstChild.textContent = JSON.stringify(answer, null, 2);
    },
  };
}

/** The API tab: the same tool as an HTTP call and as an MCP tool. */
export function apiTab(api) {
  const curl = api.method === "MCP"
    ? null
    : `curl ${api.method === "GET" ? "" : `-X ${api.method} `}"https://api.orbe.vc${api.path}" \\\n  -H "Cookie: orbe_session=..."${api.method === "GET" ? "" : ' \\\n  -H "X-CSRF-Token: ..."'}`;
  return h("div", { class: "cn-api" },
    h("div", { class: "cn-api-main" },
      curl ? [h("h2", { class: "cn-h2" }, "HTTP"), h("p", { class: "cn-api-line" }, h("span", { class: `cn-method cn-method--${api.method.toLowerCase()}` }, api.method), h("code", null, api.path)), codeBlock(curl, "curl")] : null,
      api.mcp
        ? [h("h2", { class: "cn-h2" }, "MCP"), h("p", { class: "cn-api-line" }, h("span", { class: "cn-method cn-method--mcp" }, "TOOL"), h("code", null, api.mcp)), codeBlock(`claude mcp add orbe -- npx -y orbe-mcp\n# then ask: "Use ${api.mcp} on ..."`, "Claude Code, once published")]
        : null,
    ),
    h("aside", { class: "cn-api-side" },
      h("h2", { class: "cn-h2" }, "Notes"),
      api.note ? h("p", null, api.note) : null,
      h("p", null, "Signed-in calls use your session cookie and, for anything that changes data, the CSRF token from GET /v1/auth/session. The MCP server is not on npm yet."),
      h("p", null, "Wherever a rating is shown to a person, show its label with it: Independently calculated by Orbe."),
    ),
  );
}

/**
  What a tool ran, kept on the server for the team (GET and POST /v1/runs),
  so a run made on a phone is there on the laptop. run() asks the server to
  run the tool and keep it; list() reads the newest first.
*/
export function serverRuns(tool, max = 8) {
  const q = (extra = {}) => new URLSearchParams({ ...(tool ? { tool } : {}), limit: String(max), ...extra });
  return {
    list: async (search) => (await api.get(`/v1/runs?${q(search ? { q: search } : {})}`)).runs,
    run: async (job) => (await api.post("/v1/runs", { ...(tool ? { tool } : {}), ...job })).run,
    clear: () => api.del("/v1/runs"),
  };
}

/** A history list: each entry a row with its label, a line and when. */
export function historyList(entries, emptyText, hrefOf) {
  if (!entries.length) return h("p", { class: "cn-hist-empty" }, emptyText);
  return h("ul", { class: "cn-hist" },
    entries.map((e) => h("li", null, hrefOf ? h("a", { href: hrefOf(e) }, e.label) : h("span", null, e.label), h("span", { class: "cn-hist-d" }, e.summary), e.at ? h("time", { class: "cn-hist-t", datetime: e.at }, ago(e.at)) : null)),
  );
}

/** "Now", "5m", "3h", "2d", or the date. */
export function ago(isoText, now = Date.now()) {
  const t = Date.parse(isoText);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "Now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d`;
  dayMonth ??= new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  return dayMonth.format(new Date(t));
}
let dayMonth = null;

/**
  A working screen's head, kept short so the work starts high: the tile, the
  title and one quiet line on a row, with the screen's own actions at the
  end. The tags and the whole description wait behind About.
*/
function pageHead({ tileNode, title, line, tags = [], actions }) {
  const more = tags.length || (line && line.length > 96);
  let about = null;
  if (more) {
    about = h("details", { class: "cn-about" },
      h("summary", { class: "cn-btn cn-btn--s cn-btn--ghost", "aria-label": `About ${title}` }, icon("doc"), h("span", null, "About")),
      h("div", { class: "cn-about-panel" }, line ? h("p", null, line) : null, tags.length ? h("div", { class: "cn-tags" }, tags.map(([text, tone]) => h("span", { class: `cn-tag${tone ? ` cn-tag--${tone}` : ""}` }, text))) : null),
    );
    const shut = (e) => {
      if (!about.contains(e.target) || e.key === "Escape") about.open = false;
    };
    about.addEventListener("toggle", () => {
      for (const [type, fn] of [["click", shut], ["keydown", shut]]) (about.open ? document.addEventListener : document.removeEventListener).call(document, type, fn);
    });
  }
  return h("header", { class: "cn-tp-head cn-ph" },
    tileNode ?? null,
    h("div", { class: "cn-tp-names" },
      h("h1", { class: "cn-tp-title ap-h1", tabindex: "-1", "data-title": "" }, title),
      line ? h("p", { class: "cn-tp-line", title: more ? line : null }, line) : null,
    ),
    about || actions ? h("div", { class: "cn-ts-actions" }, about, actions ?? null) : null,
  );
}

/**
  The head every working screen shares with the tool pages: its tile, its
  path and name, a line, tags, and two views, the screen itself and, when
  the tool has one, its API (the same call over HTTP and as an MCP tool).
  Returns the element the screen draws into. The title keeps the ap-h1
  class, so a screen can rename itself once it knows what it shows.
*/
export function toolShell(main, { tool, title, line, tags = [], tile: tileNode, back }) {
  const work = h("div", { class: "cn-ts-work" });
  // The same thing as an API call and an MCP tool: one quiet button, opening a drawer, so a screen keeps one row of tabs.
  const apiBtn = tool?.api ? h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => drawer(`${tool.name}: API`, () => apiTab(tool.api), { wide: true }) }, icon("code"), "API") : null;
  main.append(
    h("div", { class: "cn-tp cn-ts" },
      back ? h("p", { class: "cn-back" }, h("a", { href: back[1] }, icon("arrowRight", { cls: "cn-i--back" }), back[0])) : null,
      pageHead({ tileNode, title, line, tags, actions: apiBtn }),
      work,
    ),
  );
  return work;
}

/** toolShell for a screen named in the catalogue by its tool id: its tile, name and API come from there. */
export function screenHead(main, toolId, opts = {}) {
  const t = TOOLS.find((x) => x.id === toolId);
  return toolShell(main, { tool: t, title: opts.title ?? t?.name ?? "", line: opts.line ?? t?.line, tags: opts.tags ?? [], tile: t ? tile(t.glyph, t.k, h, "l") : null, back: opts.back });
}
