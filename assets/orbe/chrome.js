/*
  The shared header and footer for every Orbe page.

    import { mountHeader, mountFooter } from "../assets/orbe/chrome.js";
    const footer = mountFooter(document.querySelector("[data-ob-footer]"), { root: "../" });
    const header = mountHeader(document.querySelector("[data-ob-header]"), { root: "../" });

  root is the page's relative path to the site root ("./" at the root,
  "../" one folder down, "../../" two down). Every link is built from it.

  The header: the lockup (the Portal, then the Carved wordmark, both in
  currentColor), the product links and the Reserve button. At the
  very top it has no bar and each part takes the colour of the field under it;
  once the page moves it is a solid bar (Paper, or Ink over a dark field), so
  text never shows through. A field says what it is with data-head="light" or
  data-head="dark"; that is all a page has to do. Nothing runs between
  crossings: one IntersectionObserver on a one pixel line through the header,
  and a passive scroll listener that only flips a flag.

  The footer: the public footer (Products, For creators, Company, Legal), the
  honesty line, and the whole wordmark looping through the six product pairs
  while it is on screen, its O filled to a made-up creator's place in their
  hundred. Reduced motion holds one still frame.
*/
import { mountWordmark, WORDMARK } from "../r5/wordmark.js";
import { ease, reducedMotion } from "./ease.js";
import { portalMarkup } from "./mark.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);

/* the product links in the header, by path from the site root */
export const NAV = [
  ["Ratings", "products/rate/"],
  ["Podcasts", "products/podcasts/"],
  ["Sponsorships", "products/sponsorships/"],
  ["Selling", "products/selling/"],
];

/* the sheet on a phone: every product, then every tool */
export const SHEET = [
  ["Rate my work", "products/rate/"],
  ["Podcasts", "products/podcasts/"],
  ["Sponsorships", "products/sponsorships/"],
  ["Selling", "products/selling/"],
  ["Diligence", "products/diligence/"],
  ["Roster", "products/roster/"],
  ["Every tool", "products/"],
];

/* the public footer, by path from the site root; "#..." entries are the homepage's own anchors */
export const FOOTER = [
  ["Products", [["Rate my work", "products/rate/"], ["Podcasts", "products/podcasts/"], ["Sponsorships", "products/sponsorships/"], ["Selling", "products/selling/"], ["Diligence", "products/diligence/"], ["Roster", "products/roster/"]]],
  ["For creators", [["Reserve your handle", "#reserve"], ["How it works", "#tools"], ["Every tool", "products/"]]],
  ["Company", [["Brand", "brand/"]]],
  ["Legal", [["Terms", "legal/terms.html"], ["Privacy", "legal/privacy.html"]]],
];

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
  bar.innerHTML = `
    <a class="ob-bar-mark ob-lockup" data-part href="${esc(home ?? root)}" aria-label="Orbe, home"><span class="ob-lockup-mark">${portalMarkup({ cut: "small" })}</span><span data-ob-wordmark></span></a>
    <nav class="ob-bar-links" aria-label="Products">${NAV.map(([t, p]) => `<a data-part href="${esc(href(p))}"${p === current ? " aria-current=\"page\"" : ""}>${esc(t)}</a>`).join("")}</nav>
    <a class="ob-btn ob-btn--s" data-part href="${esc(href("#reserve"))}"><span class="ob-orb" aria-hidden="true"></span>${esc(reserve)}</a>
    <button class="ob-bar-menu" data-part type="button" aria-expanded="false" aria-controls="ob-sheet">Menu<i aria-hidden="true"></i></button>
    <div class="ob-sheet" id="ob-sheet" hidden>
      <nav class="ob-sheet-nav" aria-label="Products">${SHEET.map(([t, p]) => `<a href="${esc(href(p))}"${p === current ? " aria-current=\"page\"" : ""}>${esc(t)}</a>`).join("")}</nav>
      <a class="ob-btn" href="${esc(href("#reserve"))}"><span class="ob-orb" aria-hidden="true"></span>${esc(reserve)}</a>
      <p class="ob-sheet-small"><a href="${esc(href("brand/"))}">Brand</a><a href="${esc(href("legal/terms.html"))}">Terms</a><a href="${esc(href("legal/privacy.html"))}">Privacy</a></p>
    </div>`;
  const reduce = reducedMotion();
  mountWordmark(bar.querySelector("[data-ob-wordmark]"), { animate: animate ?? !reduce });

  const parts = [...bar.querySelectorAll("[data-part]")];
  const under = new Set();
  let fields = [], io = null, solid = false, open = false;

  /*
    The menu, on a phone: a full-width sheet under the bar with every
    product, the Reserve button and the small links. Focus stays inside it
    (the menu button included) until it closes: Escape, the button again,
    any link in it, or the screen growing past a phone.
  */
  const menuBtn = bar.querySelector(".ob-bar-menu"), sheet = bar.querySelector(".ob-sheet");
  const focusables = () => [menuBtn, ...sheet.querySelectorAll("a[href], button")];
  function setMenu(on, { focus = true } = {}) {
    if (on === open) return;
    open = on;
    sheet.hidden = !on;
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
  return { el: bar, refresh: theme, rescan: watch };
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
        <p class="ob-foot-sign">Made by people who refresh the same pages you do.</p>
      </div>
      <nav class="ob-foot-cols" aria-label="Footer">${FOOTER.map(([h, links]) => `
        <div class="ob-foot-col"><h3>${esc(h)}</h3><ul>${links.map(([t, p]) => `<li><a href="${esc(href(p))}">${esc(t)}</a></li>`).join("")}</ul></div>`).join("")}
      </nav>
    </div>
    <p class="ob-foot-line"><span>${esc(note)}</span><span>Free for creators, for good.</span></p>
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
    if (t >= TURN) { turn++; t0 = now; t = 0; setPair(turn); }
    at = t;
    frame(t, people[turn % people.length]);
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
