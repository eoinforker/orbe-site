/*
  The brand book. Mounts the shared header, footer and trail, then fills the
  specimens from the live tokens and components, so every colour, ratio and
  part on the page is the one the site uses.
*/
import { mountHeader, mountFooter, NAV } from "../assets/orbe/chrome.js";
import { mountTrail } from "../assets/orbe/trail.js";
import { EASE, reducedMotion } from "../assets/orbe/ease.js";
import { mountWordmark, WORDMARK } from "../assets/r5/wordmark.js";
import { portalMarkup, tileMarkup } from "../assets/orbe/mark.js";
import { icon, ICON_NAMES } from "../assets/icons/icons.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
const reduce = reducedMotion();

/* ---------------------------------------------------------------- chrome: footer first, so the header sees its fields */
mountFooter($("[data-ob-footer]"), { root: "../" });
const header = mountHeader($("[data-ob-header]"), { root: "../" });
mountTrail({ loud: ".bk-cover, [data-loud]" });

/* ---------------------------------------------------------------- colour maths, from computed styles */
const probe = document.createElement("i");
probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
document.body.appendChild(probe);
/* any CSS colour (a token, a color-mix) to [r, g, b] in 0..255 */
function rgbOf(css) {
  probe.style.color = "";
  probe.style.color = css;
  const v = getComputedStyle(probe).color;
  let m = v.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  m = v.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (m) return [m[1] * 255, m[2] * 255, m[3] * 255];
  return [0, 0, 0];
}
const hex = (rgb) => "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = (rgb) => {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const fmt = (r) => `${r.toFixed(2).replace(/0$/, "")} to 1`;

/* ---------------------------------------------------------------- the mark */
/*
  A lockup: the Portal (its small cut under 50px of word height, so under
  48px of mark), then the Carved wordmark, both in currentColor. The sizes
  and the gap come from .ob-lockup in orbe.css.
*/
function mountLockup(el, { animate = false } = {}) {
  el.innerHTML = `<span class="ob-lockup-mark">${portalMarkup({ cut: "small" })}</span><span data-lockup-wm></span>`;
  mountWordmark($("[data-lockup-wm]", el), { animate });
  /* the mark's cut by the size it renders at: the drawing from 48px up */
  const markBox = $(".ob-lockup-mark", el);
  if (markBox.getBoundingClientRect().height >= 48) markBox.innerHTML = portalMarkup({ cut: "text" });
}
const big = $("[data-lockup-big]");
mountLockup(big);
$$("[data-lockup]").forEach((el) => mountLockup(el));
$("[data-recut]").addEventListener("click", () => {
  const fresh = document.createElement("span");
  fresh.className = "ob-lockup";
  fresh.setAttribute("role", "img");
  fresh.setAttribute("aria-label", "Orbe");
  $(".bk-clear").replaceChildren(fresh);
  mountLockup(fresh, { animate: !reduce });
});

/* the Portal on its tiles: Ink on Sky is the avatar, Paper on Cobalt the app icon */
const TILES = {
  sky: { bg: "var(--orbe-sky)", fg: "var(--orbe-ink)" },
  cobalt: { bg: "var(--orbe-cobalt)", fg: "var(--orbe-paper)", radius: 0.22 },
  paper: { bg: "var(--orbe-paper)", fg: "var(--orbe-ink)" },
  ink: { bg: "var(--orbe-ink)", fg: "var(--orbe-paper)" },
};
$$("[data-tile]").forEach((el) => { el.innerHTML = tileMarkup(TILES[el.dataset.tile]); });

/* small: the favicon tile at 16, 24 and 32, and the bare small cut at the same sizes */
$("[data-small]").innerHTML = [16, 24, 32, 48].map((n) => `<span class="bk-small-i"><span class="bk-small-pair"><span class="bk-small-tile" style="width:${n}px;height:${n}px">${tileMarkup({ bg: "var(--orbe-cobalt)", fg: "var(--orbe-paper)", cut: n < 48 ? "small" : "text", radius: 0.22 })}</span><span class="bk-small-bare" style="width:${n}px;height:${n}px">${portalMarkup({ cut: n < 48 ? "small" : "text" })}</span></span><code class="ob-mono">${n}px${n < 48 ? ", small cut" : ""}</code></span>`).join("");
$$("[data-small] svg").forEach((svg) => { svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%"); });

/* the don'ts, drawn: rotated, with an effect, outlined */
$("[data-donts]").innerHTML = [["rot", "Never rotated"], ["fx", "Never with effects"], ["line", "Never outlined"]]
  .map(([k, t]) => `<figure class="bk-dont bk-dont-${k}"><div class="bk-dont-box" aria-hidden="true">${portalMarkup({ cut: "text" })}</div><figcaption class="bk-cap">${t}</figcaption></figure>`).join("");

/* the orb: the O of the mark, its counter filled to a place in the hundred */
{
  const c = WORDMARK.text, counter = "M" + c.O.split("M")[2];
  const top = -633, bottom = -67;
  const host = $("[data-orb-svg]");
  host.innerHTML = `<svg viewBox="-12 -725 688 750" fill="currentColor" focusable="false">
    <defs><clipPath id="bk-orb-c"><path d="${counter}"/></clipPath></defs>
    <rect x="100" width="470" y="${bottom}" height="0" clip-path="url(#bk-orb-c)" fill-opacity="0.32" data-level/>
    <line x1="100" x2="570" y1="${(top + bottom) / 2}" y2="${(top + bottom) / 2}" stroke="currentColor" stroke-width="6" stroke-dasharray="18 14" clip-path="url(#bk-orb-c)" opacity="0.5"/>
    <path d="${c.O}"/>
  </svg>`;
  const level = $("[data-level]", host), out = $("[data-orb-out]"), input = $("[data-orb-n]");
  const set = (n) => {
    const y = bottom - (bottom - top) * (n / 100);
    level.setAttribute("y", y); level.setAttribute("height", bottom - y);
    out.textContent = `${n} in 100`;
  };
  input.addEventListener("input", () => set(+input.value));
  set(+input.value);
}

/* ---------------------------------------------------------------- colour */
const PRIMARY = [
  ["Sky", "--orbe-sky", "The field"],
  ["Ink", "--orbe-ink", "Type and the primary button"],
  ["Paper", "--orbe-paper", "The page, where people read"],
  ["Cobalt", "--orbe-cobalt", "The band, focus, the light button’s orb"],
  ["Ember", "--orbe-ember", "The single you"],
];
const REST = [
  ["Chalk", "--orbe-chalk", "Title rows, cards"],
  ["Linen", "--orbe-linen", "Hover on Paper"],
  ["Mist", "--orbe-mist", "A tint of Sky"],
  ["Graphite", "--orbe-graphite", "Soft words, first lines"],
  ["Stone", "--orbe-stone", "Soft words on Ink only"],
  ["Deep cobalt", "--action-press", "The selling pair’s field"],
  ["Straw", "--orbe-straw", "Accent, as art"],
  ["Peony", "--orbe-peony", "Accent, as art"],
  ["Claret", "--orbe-claret", "Words on Peony"],
  ["Blush", "--orbe-blush", "A tint of Peony"],
];
const swatch = ([name, token, role]) => {
  const v = hex(rgbOf(`var(${token})`));
  return `<div class="bk-sw"><div class="bk-sw-c" style="--c: var(${token})"></div><div class="bk-sw-t"><span class="bk-sw-n">${esc(name)}</span><span class="bk-sw-r">${esc(role)}</span><span class="bk-sw-h">${v}</span><span class="bk-sw-h">${esc(token)}</span></div></div>`;
};
$("[data-swatches=primary]").innerHTML = PRIMARY.map(swatch).join("");
$("[data-swatches=rest]").innerHTML = REST.map(swatch).join("");

const PAIRS = [
  ["note", "The Sunday note", "sunday_note.txt"],
  ["spon", "Sponsorships", "sponsorship_quote.txt"],
  ["sell", "Selling", "selling.txt"],
  ["rec", "The Record", "estimate_vs_paid.txt"],
  ["pod", "Podcasts", "podcast_prefix.txt"],
  ["also", "Benchmarks and the rest", "where_you_sit.txt"],
];
const DARK = new Set(["sell", "also"]);
$("[data-pairs]").innerHTML = PAIRS.map(([k, name, file]) => {
  const r = ratio(rgbOf(`var(--ob-p-${k}-fg)`), rgbOf(`var(--ob-p-${k}-bg)`));
  return `<article class="ob-win" data-pair="${k}" data-head="${DARK.has(k) ? "dark" : "light"}">
    <div class="ob-win-bar"><span class="ob-win-title">${esc(file)}</span></div>
    <div class="ob-win-body"><p class="bk-pair-aa" aria-hidden="true">Aa</p><p class="bk-pair-row"><span>${esc(name)}</span><span class="bk-ratio">${fmt(r)}</span></p></div>
  </article>`;
}).join("");

const KINDS = [
  ["explainer", "Explainer"], ["devlog", "Devlog"], ["podcast", "Podcast"],
  ["letsplay", "Let’s Play"], ["recipe", "Recipe"], ["longexposure", "Long exposure"],
];
$("[data-kinds]").innerHTML = KINDS.map(([k, label]) => `<div class="bk-kind" data-kind="${k}"><span class="bk-kind-n">${esc(label)}</span><span class="bk-kind-you">You</span><span class="bk-ratio" data-kr></span></div>`).join("");
$$(".bk-kind").forEach((el) => {
  const cs = getComputedStyle(el);
  const r = ratio(rgbOf(cs.getPropertyValue("--cfg").trim()), rgbOf(cs.getPropertyValue("--cbg").trim()));
  $("[data-kr]", el).textContent = fmt(r);
});

/* ---------------------------------------------------------------- type: the ladder, sized by the live tokens */
const LADDER = [
  ["--ob-t12", "Labels, captions, chips", "Checked 18 Oct 2026"],
  ["--ob-t14", "Notes, links, the header", "Free for creators, for good."],
  ["--ob-t16", "Body and buttons", "Your work, read properly."],
  ["--ob-t18", "The lede", "Rated against your size."],
  ["--ob-t24", "Small heads", "Know what a slot is worth."],
  ["--ob-t32", "Section heads", "Every figure live."],
  ["--ob-t48", "Large heads", "Zero is typical."],
  ["--ob-t-figure", "The rating", "+1.23", true],
  ["--ob-t-giant", "The closing line", "Goliath.", true],
  ["--ob-t-hero", "The hero", "Rated.", true],
];
function ladder() {
  $("[data-ladder]").innerHTML = LADDER.map(([t, use, sample, display]) => {
    probe.style.fontSize = `var(${t})`;
    const px = Math.round(parseFloat(getComputedStyle(probe).fontSize));
    return `<div class="bk-step"><div class="bk-step-k"><code>${esc(t)}</code><span>${px}px · ${esc(use)}</span></div><p class="bk-step-s${display ? " is-display" : ""}" style="font-size: var(${t})">${esc(sample)}</p></div>`;
  }).join("");
}
ladder();
let lt = 0;
addEventListener("resize", () => { clearTimeout(lt); lt = setTimeout(ladder, 150); });

/* ---------------------------------------------------------------- components */
$$("[data-try]").forEach((b) => b.addEventListener("click", () => { $("[data-try-say]").textContent = "Pressed. It goes down 1px and comes back."; }));

/* the window: paint its body with any of the six pairs */
const win = $("[data-demo-win]"), pick = $("[data-pair-pick]");
pick.innerHTML = PAIRS.map(([k, name]) => `<button type="button" data-k="${k}" aria-pressed="${k === "spon"}" style="--dot: var(--ob-p-${k}-bg)">${esc(name.replace(/^The /, ""))}</button>`).join("");
pick.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]");
  if (!b) return;
  const k = b.dataset.k;
  win.dataset.pair = k;
  win.dataset.head = DARK.has(k) ? "dark" : "light";
  $$("button", pick).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
});

/* the slider's figure */
const views = $("[data-views]"), viewsOut = $("[data-views-out]");
const nf = new Intl.NumberFormat("en-GB");
views.addEventListener("input", () => { viewsOut.textContent = nf.format(+views.value); });

/* the header, three still copies: the same markup chrome.js writes */
$$("[data-bar-demo]").forEach((bar) => {
  const state = bar.dataset.barDemo, on = state === "dark" ? "dark" : "light";
  bar.innerHTML = `<span class="ob-bar-mark ob-lockup" data-part data-on="${on}"><span class="ob-lockup-mark">${portalMarkup({ cut: "small" })}</span><span data-wm-bar></span></span>
    <span class="ob-bar-links">${NAV.map(([t]) => `<a data-part data-on="${on}">${esc(t)}</a>`).join("")}</span>
    <span class="ob-btn ob-btn--s bk-fake" data-part data-on="${on}"><span class="ob-orb" aria-hidden="true"></span>Reserve your handle</span>
    <span class="ob-bar-menu" data-part data-on="${on}">Menu<i></i></span>`;
  mountWordmark($("[data-wm-bar]", bar), { animate: false });
});

/* icons: the whole set, bold at 16 and regular at 24 */
$$("[data-ibtn]").forEach((b) => { b.innerHTML = icon(b.dataset.ibtn, { size: 20 }); });
$("[data-icons]").innerHTML = ICON_NAMES.map((n) => `<div class="bk-icon"><span class="bk-icon-g">${icon(n, { size: 16 })}${icon(n, { size: 24 })}</span><code>${esc(n)}</code></div>`).join("");

/* ---------------------------------------------------------------- texture and motion */
/* the pixel objects, from the homepage's own pieces */
{
  const PIECES = [["explainer", "Explainer"], ["devlog", "Devlog"], ["podcast", "Podcast"], ["letsplay", "Let’s Play"], ["recipe", "Recipe"], ["longexposure", "Long exposure"]];
  const cv = $("[data-piece]"), seg = $("[data-piece-pick]");
  seg.innerHTML = PIECES.map(([k, t], i) => `<button type="button" data-k="${k}" aria-pressed="${i === 0}">${esc(t)}</button>`).join("");
  import("../pixels.js").then(({ mountArt }) => {
    const art = mountArt(cv);
    art.show("explainer", false);
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b || b.getAttribute("aria-pressed") === "true") return;
      $$("button", seg).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      art.show(b.dataset.k, !reduce);
    });
  }).catch(() => { cv.closest(".bk-piece").hidden = true; });
}

/* the trail's note says what this device will do */
let fine = false;
try { fine = matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) {}
if (reduce) $("[data-trail-say]").textContent = "The trail is off here: this device asks for reduced motion.";
else if (!fine) $("[data-trail-say]").textContent = "The trail is off on touch. With a mouse, cells land on this 11.28px lattice.";

/* the easing, played once per press */
{
  const track = $("[data-track]"), dot = $("i", track);
  let out = false;
  $("[data-play]").addEventListener("click", (e) => {
    const w = track.clientWidth - dot.offsetWidth - 12;
    const from = out ? w : 0, to = out ? 0 : w;
    out = !out;
    e.currentTarget.textContent = out ? "Play it back" : "Play once";
    if (reduce || !dot.animate) { dot.style.transform = `translateX(${to}px)`; return; }
    dot.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: 900, easing: EASE, fill: "forwards" });
  });
}
$("[data-rm]").textContent = reduce ? "on" : "off";

header.rescan();
