/*
  The shared header and footer for every Orbe page.

    import { mountHeader, mountFooter } from "../assets/orbe/chrome.js";
    const footer = mountFooter(document.querySelector("[data-ob-footer]"), { root: "../" });
    const header = mountHeader(document.querySelector("[data-ob-header]"), { root: "../" });

  root is the page's relative path to the site root ("./" at the root,
  "../" one folder down, "../../" two down). Every link is built from it.

  The header, the one navigation on every page: the lockup (the Portal, then
  the Carved wordmark, both in currentColor), the Products menu (the four
  pillars, Grow, Earn, Protect and Teams, as columns, each tool with one line
  on it, and All products), How it works, For teams, Pricing and the Reserve
  button; on a phone, a Menu button and a sheet with every tool, grouped by
  pillar. At the
  very top it has no bar and each part takes the colour of the field under it;
  once the page moves it is a solid bar (Paper, or Ink over a dark field), so
  text never shows through. A field says what it is with data-head="light" or
  data-head="dark"; that is all a page has to do. Nothing runs between
  crossings: one IntersectionObserver on a one pixel line through the header,
  and a passive scroll listener that only flips a flag.

  The footer: the public footer (one compact column per pillar, then Orbe
  and Legal), the
  honesty line, and the whole wordmark looping through the six product pairs
  while it is on screen, its O filled to a made-up creator's place in their
  hundred. Reduced motion holds one still frame.
*/
import { mountWordmark, WORDMARK } from "../r5/wordmark.js";
import { ease, reducedMotion } from "./ease.js";
import { portalMarkup } from "./mark.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);

/*
  Orbe in four pillars, each with a short line, and every tool under its
  pillar by path from the site root: its name, one line on what it does,
  and its colour pair. The header's Products menu sets the four as columns,
  the phone sheet as grouped sections, and the footer as compact columns.
*/
export const PILLARS = [
  ["Grow", "Know where you stand, and get better.", [
    ["Your Orbe", "products/you/", "Your home: a report for every piece.", "also"],
    ["Rate my work", "products/rate/", "Against creators your size. Free.", "also"],
    ["Podcasts", "products/podcasts/", "Free measurement, for good.", "pod"],
  ]],
  ["Earn", "Get paid fairly when money moves.", [
    ["Sponsorships", "products/sponsorships/", "Price a slot, match brand briefs.", "spon"],
    ["Fair offer check", "products/offer/", "Is this offer fair for your size?", "spon"],
    ["Selling", "products/selling/", "An indicative value, fees in full.", "sell"],
    ["Diligence", "products/diligence/", "The report a buyer reads first.", "rec"],
  ]],
  ["Protect", "Your work, and who may use it.", [
    ["Protect", "products/protect/", "Find your work anywhere.", "rec"],
    ["Rights", "products/rights/", "Who may use what, until when.", "note"],
  ]],
  ["Teams", "For the people around creators.", [
    ["Roster", "products/roster/", "Every creator you look after.", "note"],
    ["For teams", "teams/", "Rights tooling for brands.", "spon"],
    ["For developers", "developers/", "Orbe for agents, over MCP.", "pod"],
  ]],
];
/* every entry in the menu, flat, in pillar order */
export const PRODUCTS = PILLARS.flatMap(([, , items]) => items);
export const ALL_PRODUCTS = ["All products", "products/", "Every tool, by pillar, running in your browser."];

/* the links beside the Products menu ("#..." is the homepage's own anchor) */
export const NAV = [["How it works", "#tools"], ["For teams", "teams/"], ["Pricing", "pricing/"]];

/* the sheet on a phone leads with Your Orbe, the home, then groups the rest by PILLARS; SHEET is the same set, flat */
export const LEAD = PRODUCTS[0];
export const SHEET = [...PRODUCTS.map(([t, p]) => [t, p]), ALL_PRODUCTS.slice(0, 2)];

/* the public footer, by path from the site root: one compact column per pillar, then Orbe; "#..." entries are the homepage's own anchors */
export const FOOTER = [
  ...PILLARS.map(([h, , items]) => [h, items.map(([t, p]) => [t, p])]),
  ["Orbe", [["Pricing", "pricing/"], ["Brand", "brand/"], ["Terms", "legal/terms.html"], ["Privacy", "legal/privacy.html"]]],
];

/*
  The menus come in two directions, the same on a phone and a desktop:
    "a"  the index: product names set large in the display face, pillars
         as numbered mono heads down the left, nothing else
    "b"  the catalogue: Your Orbe as a Sky tile, then every tool as a row
         with a small pixel tile in its colour pair and one line on it
  ?menu=a or ?menu=b picks one (for review); MENU is the default. The
  choice is set on <html data-menu> so the CSS can scope to it.
*/
export const MENU = "b";
function menuDirection() {
  try { const q = new URLSearchParams(location.search).get("menu"); if (q === "a" || q === "b") return q; } catch (e) {}
  return MENU;
}

/* each tool's pixel glyph, five by five, drawn in its pair's word colour on its pair's field */
const GLYPH = {
  "products/you/": ".###.|#...#|#.#.#|#...#|.###.",
  "products/rate/": "....#|..#.#|..#.#|#.#.#|#.#.#",
  "products/podcasts/": "..#..|#.#.#|#.#.#|#.#.#|..#..",
  "products/sponsorships/": "#####|#...#|#####|.....|#####",
  "products/offer/": ".....|....#|...#.|#.#..|.#...",
  "products/selling/": ".####|...##|..#.#|.#..#|#....",
  "products/diligence/": "###..|.....|#####|.....|####.",
  "products/protect/": "#####|#####|#####|.###.|..#..",
  "products/rights/": "###..|#.#..|#####|..#.#|..###",
  "products/roster/": "#.#.#|.....|#.#.#|.....|#.#.#",
  "teams/": "##.##|##.##|.....|##.##|##.##",
  "developers/": "#....|.#...|..#..|.#...|#.###",
};
function glyph(path, k) {
  const g = GLYPH[path];
  if (!g) return "";
  const cells = g.split("|").flatMap((row, y) => [...row].map((c, x) => (c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ""))).join("");
  return `<span class="ob-px" data-k="${k}" aria-hidden="true"><svg viewBox="0 0 5 5" shape-rendering="crispEdges" focusable="false">${cells}</svg></span>`;
}

/*
  The two directions' markup: the desktop panel's inside and the phone
  sheet's nav. Every item that rises in on open carries --i, its place in
  the stagger.
*/
function menuMarkup(dir, href, cur) {
  const n2 = (i) => String(i + 1).padStart(2, "0");
  const allLink = (cls) => `<a class="${cls}" href="${esc(href(ALL_PRODUCTS[1]))}"${cur(ALL_PRODUCTS[1])}><span class="ob-dd-t">${esc(ALL_PRODUCTS[0])}</span><span class="ob-dd-d">${esc(ALL_PRODUCTS[2])}</span></a>`;
  if (dir === "a") {
    let r = 0;
    const panel = `
          <div class="ob-ix-cols">${PILLARS.map(([h, , items], i) => `
            <div class="ob-ix-col">
              <p class="ob-ix-h" id="ob-dd-g${i}" style="--i:${i}"><span>${n2(i)}</span>${esc(h)}</p>
              <ul class="ob-ix-list" aria-labelledby="ob-dd-g${i}">${items.map(([t, p, d]) => `
                <li style="--i:${i + (r++ % 4) + 1}"><a href="${esc(href(p))}"${cur(p)}><span class="ob-dd-t">${esc(t)}</span><span class="ob-dd-d">${esc(d)}</span></a></li>`).join("")}
              </ul>
            </div>`).join("")}
          </div>
          ${allLink("ob-ix-all")}`;
    const sheet = PILLARS.map(([h, , items], i) => `
        <div class="ob-ix-g" role="group" aria-labelledby="ob-sh-g${i}" style="--i:${i}">
          <p class="ob-ix-gh" id="ob-sh-g${i}"><span>${n2(i)}</span>${esc(h)}</p>
          <div class="ob-ix-gl">${items.map(([t, p]) => `<a href="${esc(href(p))}"${cur(p)}>${esc(t)}</a>`).join("")}</div>
        </div>`).join("");
    return { panel, sheet };
  }
  const [lt, lp, ld] = LEAD;
  const panel = `
          <div class="ob-cat">
            <a class="ob-cat-lead" href="${esc(href(lp))}"${cur(lp)} style="--i:0">
              <span class="ob-cat-mark">${portalMarkup({ cut: "small" })}</span>
              <span class="ob-cat-lt">${esc(lt)}</span>
              <span class="ob-cat-ld">${esc(ld)}</span>
              <span class="ob-cat-go">Open your Orbe</span>
            </a>
            <div class="ob-cat-cols">${PILLARS.map(([h, , items], i) => `
              <div class="ob-cat-col">
                <p class="ob-cat-h" id="ob-dd-g${i}" style="--i:${i + 1}">${esc(h)}</p>
                <ul class="ob-cat-list" aria-labelledby="ob-dd-g${i}">${items.filter(([, p]) => p !== lp).map(([t, p, d, k], j) => `
                  <li style="--i:${i + j + 2}"><a href="${esc(href(p))}"${cur(p)}>${glyph(p, k)}<span class="ob-dd-t">${esc(t)}</span><span class="ob-dd-d">${esc(d)}</span></a></li>`).join("")}
                </ul>
              </div>`).join("")}
            </div>
          </div>
          ${allLink("ob-cat-all")}`;
  const sheet = `
        <a class="ob-cat-lead" href="${esc(href(lp))}"${cur(lp)} style="--i:0"><span class="ob-cat-mark">${portalMarkup({ cut: "small" })}</span><span class="ob-cat-lt">${esc(lt)}</span><span class="ob-cat-ld">${esc(ld)}</span></a>${PILLARS.map(([h, , items], i) => `
        <div class="ob-cat-g" role="group" aria-labelledby="ob-sh-g${i}" style="--i:${i + 1}">
          <p class="ob-cat-h" id="ob-sh-g${i}">${esc(h)}</p>
          <div class="ob-cat-gl">${items.filter(([, p]) => p !== lp).map(([t, p, , k]) => `<a href="${esc(href(p))}"${cur(p)}>${glyph(p, k)}<span>${esc(t)}</span></a>`).join("")}</div>
        </div>`).join("")}`;
  return { panel, sheet };
}

/*
  Where a link goes. home is the homepage's URL from this page (root by
  default; "./" on the homepage itself), and the homepage's anchors resolve
  against it, so on the homepage they stay on the page.
*/
function linker({ root = "./", home }) {
  const h = home ?? root;
  return (to) => (to.startsWith("#") ? (h === "./" || h === "" ? to : `${h}${to}`) : `${root}${to}`);
}

/* ---------------------------------------------------------------- the header */
export function mountHeader(target, { root = "./", home, current = "", reserve = "Reserve your handle", animate } = {}) {
  const href = linker({ root, home });
  const bar = target.tagName === "HEADER" ? target : document.createElement("header");
  if (bar !== target) target.replaceWith(bar);
  bar.className = "ob-bar";
  bar.dataset.obBar = "";
  const cur = (p) => (p === current ? " aria-current=\"page\"" : "");
  /* the Products button is underlined on a product page; For teams and Pricing underline their own links */
  const inMenu = current && current.startsWith("products/") && [...PRODUCTS.map(([, p]) => p), ALL_PRODUCTS[1]].includes(current);
  const dir = menuDirection();
  document.documentElement.dataset.menu = dir;
  const menu = menuMarkup(dir, href, cur);
  bar.innerHTML = `
    <a class="ob-bar-mark ob-lockup" data-part href="${esc(home ?? root)}" aria-label="Orbe, home"><span class="ob-lockup-mark">${portalMarkup({ cut: "small" })}</span><span data-ob-wordmark></span></a>
    <nav class="ob-bar-links" aria-label="Main">
      <div class="ob-dd">
        <button class="ob-dd-btn${inMenu ? " is-here" : ""}" data-part type="button" aria-expanded="false" aria-controls="ob-dd-panel">Products<i aria-hidden="true"></i></button>
        <div class="ob-dd-panel" id="ob-dd-panel" data-dir="${dir}" hidden>${menu.panel}
        </div>
      </div>${NAV.map(([t, p]) => `<a data-part href="${esc(href(p))}"${cur(p)}>${esc(t)}</a>`).join("")}
    </nav>
    <a class="ob-btn ob-btn--s" data-part href="${esc(href("#reserve"))}"><span class="ob-orb" aria-hidden="true"></span>${esc(reserve)}</a>
    <button class="ob-bar-menu" data-part type="button" aria-expanded="false" aria-controls="ob-sheet">Menu<i aria-hidden="true"></i></button>
    <div class="ob-sheet" id="ob-sheet" data-dir="${dir}" hidden>
      <nav class="ob-sheet-nav" aria-label="Products">${menu.sheet}
      </nav>
      <div class="ob-sheet-foot" style="--i:5">
        <a class="ob-btn" href="${esc(href("#reserve"))}"><span class="ob-orb" aria-hidden="true"></span>${esc(reserve)}</a>
        <p class="ob-sheet-small">${[...NAV.filter(([, p]) => p !== "teams/"), ALL_PRODUCTS.slice(0, 2)].map(([t, p]) => `<a href="${esc(href(p))}"${cur(p)}>${esc(t)}</a>`).join("")}</p>
      </div>
    </div>`;
  const reduce = reducedMotion();
  mountWordmark(bar.querySelector("[data-ob-wordmark]"), { animate: animate ?? !reduce });

  /* open at once; close with a 140ms fade (is-out), or at once under reduced motion */
  const show = (el, on) => {
    clearTimeout(el._out);
    el.classList.remove("is-out");
    if (on || reduce) { el.hidden = !on; return; }
    el.classList.add("is-out");
    el._out = setTimeout(() => { el.classList.remove("is-out"); el.hidden = true; }, 140);
  };

  const parts = [...bar.querySelectorAll("[data-part]")];
  const under = new Set();
  let fields = [], io = null, solid = false, open = false;

  /*
    The menu, on a phone: a full-width sheet under the bar that fits one
    390 by 844 screen: every tool by pillar (as menuMarkup draws it for the
    direction), the Reserve button, then How it works, Pricing and All
    products in one quiet row. Focus stays inside it
    (the menu button included) until it closes: Escape, the button again,
    any link in it, or the screen growing past a phone.
  */
  const menuBtn = bar.querySelector(".ob-bar-menu"), sheet = bar.querySelector(".ob-sheet");
  const focusables = () => [menuBtn, ...sheet.querySelectorAll("a[href], button")];
  function setMenu(on, { focus = true } = {}) {
    if (on === open) return;
    open = on;
    show(sheet, on);
    menuBtn.setAttribute("aria-expanded", String(on));
    menuBtn.firstChild.textContent = on ? "Close" : "Menu";
    document.documentElement.classList.toggle("ob-sheet-on", on);
    theme();
    if (on && focus) sheet.querySelector("a[href]")?.focus();
    else if (!on && focus) menuBtn.focus();
  }
  menuBtn.addEventListener("click", () => setMenu(!open));
  sheet.addEventListener("click", (e) => { if (e.target.closest("a[href]")) setMenu(false, { focus: false }); });
  bar.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); setMenu(false); return; }
    if (e.key !== "Tab") return;
    const f = focusables(), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  try { matchMedia("(min-width: 721px)").addEventListener("change", (m) => { if (m.matches) setMenu(false, { focus: false }); }); } catch (e) {}

  /*
    The Products menu, from a tablet up: a button that shows a panel under
    the bar, the four pillars as columns with every tool under its pillar. A disclosure, not an application menu: Tab moves
    through the links as usual, and the arrow keys move between them too.
    Escape closes it and puts focus back on the button; so does the button.
    A click outside it, focus leaving it, any link in it, or the screen
    shrinking to a phone closes it without moving focus.
  */
  const dd = bar.querySelector(".ob-dd"), ddBtn = dd.querySelector(".ob-dd-btn"), panel = dd.querySelector(".ob-dd-panel");
  const ddLinks = () => [...panel.querySelectorAll("a[href]")];
  let ddOpen = false;
  function setDd(on, { focus = false } = {}) {
    if (on === ddOpen) return;
    ddOpen = on;
    show(panel, on);
    ddBtn.setAttribute("aria-expanded", String(on));
    if (!on && focus) ddBtn.focus();
  }
  ddBtn.addEventListener("click", () => setDd(!ddOpen));
  ddBtn.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
    setDd(true);
    const l = ddLinks();
    (e.key === "ArrowDown" ? l[0] : l[l.length - 1])?.focus();
  });
  dd.addEventListener("keydown", (e) => {
    if (!ddOpen) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDd(false, { focus: true }); return; }
    const l = ddLinks(), i = l.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: l.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    l[(to + l.length) % l.length].focus();
  });
  panel.addEventListener("click", (e) => { if (e.target.closest("a[href]")) setDd(false); });
  dd.addEventListener("focusout", (e) => { if (ddOpen && e.relatedTarget && !dd.contains(e.relatedTarget)) setDd(false); });
  document.addEventListener("pointerdown", (e) => { if (ddOpen && !dd.contains(e.target)) setDd(false); });
  try { matchMedia("(max-width: 720px)").addEventListener("change", (m) => { if (m.matches) setDd(false); }); } catch (e) {}

  /*
    Which field is under each part. Transparent: each part takes the
    smallest field under its own centre, so a dark window under the links
    turns only the links. Solid: the bar takes the smallest field that
    spans most of the page under its line, and every part follows the bar.
  */
  function theme() {
    const B = bar.getBoundingClientRect(), y = B.top + B.height / 2;
    const live = [...under].filter((el) => !el.classList.contains("shut") && el.isConnected).map((el) => [el, el.getBoundingClientRect()]).filter(([, r]) => r.top <= y && r.bottom >= y);
    const pick = (x, wide) => {
      let best = null, area = Infinity;
      for (const [el, r] of live) {
        if (r.left > x || r.right < x) continue;
        if (wide && r.width < innerWidth * 0.6) continue;
        const A = r.width * r.height;
        if (A < area || (A === area && best?.contains(el))) { best = el; area = A; }
      }
      return best?.dataset.head ?? "light";
    };
    if (solid || open) {
      const on = open ? "light" : pick(B.left + B.width / 2, true);
      if (bar.dataset.solid !== on) bar.dataset.solid = on;
      for (const p of parts) if (p.dataset.on !== on) p.dataset.on = on;
    } else {
      if (bar.hasAttribute("data-solid")) bar.removeAttribute("data-solid");
      for (const p of parts) {
        const P = p.getBoundingClientRect(), on = pick(P.left + P.width / 2, false);
        if (p.dataset.on !== on) p.dataset.on = on;
      }
    }
  }
  function watch() {
    io?.disconnect();
    under.clear();
    /* a window's title row is Chalk whatever its body is */
    document.querySelectorAll(".ob-win-bar:not([data-head])").forEach((b) => { b.dataset.head = "light"; });
    fields = [...document.querySelectorAll("[data-head]")].filter((el) => !bar.contains(el));
    const B = bar.getBoundingClientRect(), mid = Math.round(B.top + B.height / 2);
    io = new IntersectionObserver((es) => {
      for (const e of es) e.isIntersecting ? under.add(e.target) : under.delete(e.target);
      theme();
    }, { rootMargin: `${-mid}px 0px ${-(innerHeight - mid - 1)}px 0px`, threshold: 0 });
    fields.forEach((f) => io.observe(f));
  }
  const onScroll = () => { const s = scrollY > 4; if (s !== solid) { solid = s; theme(); } };
  if ("IntersectionObserver" in window) {
    watch();
    let rs = 0;
    addEventListener("resize", () => { clearTimeout(rs); rs = setTimeout(watch, 120); });
    new MutationObserver(theme).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-head", "class"] });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  theme();
  return { el: bar, refresh: theme, rescan: watch, close: () => { setDd(false); setMenu(false, { focus: false }); } };
}

/* ---------------------------------------------------------------- the footer */
export function mountFooter(target, { root = "./", home, people, note = "Independently calculated by Orbe. Every creator on this page is made up.", reduce } = {}) {
  const href = linker({ root, home });
  const foot = target.tagName === "FOOTER" ? target : document.createElement("footer");
  if (foot !== target) target.replaceWith(foot);
  foot.className = "ob-foot";
  foot.dataset.head = "light";
  foot.setAttribute("aria-labelledby", "ob-foot-h");
  foot.innerHTML = `
    <h2 class="ob-sr" id="ob-foot-h">Orbe</h2>
    <div class="ob-foot-top">
      <div class="ob-foot-intro">
        <a class="ob-foot-mark" href="${esc(home ?? root)}" aria-label="Orbe, home"><span data-ob-foot-wm></span></a>
        <p class="ob-foot-sign">Creator tooling. <span>Your unfair advantage.</span></p>
      </div>
      <nav class="ob-foot-cols" aria-label="Footer">${FOOTER.map(([h, links]) => `
        <div class="ob-foot-col"><h3>${esc(h)}</h3><ul>${links.map(([t, p]) => `<li><a href="${esc(href(p))}">${esc(t)}</a></li>`).join("")}</ul></div>`).join("")}
      </nav>
    </div>
    <p class="ob-foot-line"><span>${esc(note)}</span><span>The core is free for creators, for good. Orbe earns from teams, from optional Pro, and when money moves.</span></p>
    <div class="ob-giant-mark" data-head="light" aria-hidden="true">
      <p class="ob-giant-cap" data-ob-giant-cap></p>
      <div class="ob-giant-svg" data-ob-giant-svg></div>
    </div>`;
  mountWordmark(foot.querySelector("[data-ob-foot-wm]"), { animate: false });
  const box = foot.querySelector(".ob-giant-mark");
  const still = reduce ?? (reducedMotion() || !("IntersectionObserver" in window));
  const go = (list) => mountGiant(box, foot.querySelector("[data-ob-giant-svg]"), foot.querySelector("[data-ob-giant-cap]"), list, { reduce: still });
  if (people?.length) go(people);
  else import("../r5/examples.js").then(({ example, ORDER }) => go(ORDER.map((k) => {
    const e = example(k), reach = e.result.parts.find((p) => p.key === "reach");
    return { name: e.name, beats: Math.max(1, Math.min(99, Math.round(reach?.score ?? 50))) };
  })));
  return { el: foot };
}

/*
  The giant mark. One turn, 3.6s, on the page's one easing:
    0 to 1000ms     the chisel cuts each stroke along its line, in writing
                    order, then the cut opens out to the flared ends
    900 to 2100ms   the O's counter fills, from empty, to a made-up
                    creator's place in their hundred, and settles there
    2700 to 3500ms  the cut closes and runs off the end of each stroke
    3500ms          the band takes the next product's colour pair
*/
const NS = "http://www.w3.org/2000/svg";
const svgEl = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const clamp = (t) => Math.max(0, Math.min(1, t));
const PAIRS = ["note", "spon", "sell", "rec", "pod", "also"];
const TURN = 3600;
const CUT = [[0, 420], [130, 360], [230, 450], [300, 540], [380, 680], [480, 760], [560, 840]];
const OPEN = [600, 1000], FILL = [900, 2100], CLOSE = [2700, 3000], AWAY = [2900, 3500];
const counterOf = (d) => "M" + d.split("M")[2];

export function mountGiant(box, svgHost, cap, people, { reduce = false } = {}) {
  const c = WORDMARK.text;
  const [x0, y0, w, h] = c.vb.split(" ").map(Number);
  const svg = svgEl("svg", { viewBox: c.vb, width: w, height: h, fill: "currentColor", focusable: "false" });
  const id = "ob-giant-" + Math.random().toString(36).slice(2, 8);
  const defs = svgEl("defs");
  const mask = svgEl("mask", { id: id + "m", maskUnits: "userSpaceOnUse", x: x0 - 200, y: y0 - 300, width: w + 400, height: h + 600 });
  const lines = c.spines.map(([, d, sw]) => { const p = svgEl("path", { d, fill: "none", stroke: "#fff", "stroke-linecap": "butt", "stroke-linejoin": "round" }); p.dataset.w = sw; mask.appendChild(p); return p; });
  const clip = svgEl("clipPath", { id: id + "c" });
  clip.appendChild(svgEl("path", { d: counterOf(c.O), transform: "translate(332 -350) scale(1.03) translate(-332 350)" }));
  defs.append(mask, clip);
  svg.appendChild(defs);
  const g = svgEl("g", { mask: `url(#${id}m)` });
  for (const k of ["O", "r", "b", "e"]) g.appendChild(svgEl("path", { d: c[k] }));
  const top = -633, bottom = -67;
  const level = svgEl("rect", { x: 100, width: 470, y: bottom, height: 0, "clip-path": `url(#${id}c)`, "fill-opacity": "0.32" });
  svg.append(g, level);
  svgHost.replaceChildren(svg);
  const lens = lines.map((p) => p.getTotalLength());
  lines.forEach((p, i) => p.setAttribute("stroke-dasharray", `${lens[i]} ${lens[i] * 2}`));

  const setLevel = (f) => { const y = bottom - (bottom - top) * f; level.setAttribute("y", y); level.setAttribute("height", bottom - y); };
  const setPair = (i) => {
    const k = PAIRS[i % PAIRS.length], who = people[i % people.length];
    box.style.setProperty("--gbg", `var(--ob-p-${k}-bg)`);
    box.style.setProperty("--gfg", `var(--ob-p-${k}-fg)`);
    /* the header reads this to pick its colours over the mark */
    box.dataset.head = k === "sell" || k === "also" ? "dark" : "light";
    cap.textContent = `${who.name} · ${who.beats} in 100 · made up`;
  };
  /* after the first turn the word stays whole: only the O's level and the colours move, so it is never seen empty */
  let prevBeats = 0;
  const hold = (t, who) => {
    lines.forEach((p, i) => { p.setAttribute("stroke-dashoffset", 0); p.setAttribute("stroke-width", +p.dataset.w * 0.86); });
    const k = ease(clamp(t / 1200));
    setLevel((prevBeats + (who.beats - prevBeats) * k) / 100);
  };
  const frame = (t, who) => {
    const open = ease(clamp((t - OPEN[0]) / (OPEN[1] - OPEN[0]))) - ease(clamp((t - CLOSE[0]) / (CLOSE[1] - CLOSE[0])));
    lines.forEach((p, i) => {
      const [a, b] = CUT[Math.min(i, CUT.length - 1)];
      const cut = ease(clamp((t - a) / (b - a)));
      const off = ease(clamp((t - AWAY[0] - i * 40) / (AWAY[1] - AWAY[0] - 240)));
      p.setAttribute("stroke-dashoffset", lens[i] * (1 - cut) - lens[i] * off);
      p.setAttribute("stroke-width", +p.dataset.w * 0.86 + open * 340);
    });
    const fill = ease(clamp((t - FILL[0]) / (FILL[1] - FILL[0]))) * (1 - ease(clamp((t - AWAY[0]) / (AWAY[1] - AWAY[0]))));
    setLevel((who.beats / 100) * fill);
  };

  setPair(0);
  if (reduce) { frame(2400, people[0]); return; }
  frame(0, people[0]);

  /* runs only while it is on screen, and picks up where it left off */
  let raf = 0, t0 = 0, turn = 0, shown = false, at = 0;
  const loop = (now) => {
    if (!t0) t0 = now - at;
    let t = now - t0;
    if (t >= TURN) { prevBeats = people[turn % people.length].beats; turn++; t0 = now; t = 0; setPair(turn); }
    at = t;
    if (turn === 0) frame(Math.min(t, 2400), people[0]);
    else hold(t, people[turn % people.length]);
    raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver((es) => {
    const on = es.some((e) => e.isIntersecting);
    if (on === shown) return;
    shown = on;
    if (on) raf = requestAnimationFrame(loop);
    else { cancelAnimationFrame(raf); t0 = 0; }
  }, { threshold: 0.15 }).observe(box);
}
