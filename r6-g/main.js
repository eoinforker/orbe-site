import { example, EXAMPLE_LINE, benchmark, mathsFor } from "../assets/r5/examples.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { paintCanvas, PALETTES, grainTile } from "./painter.js";
import { SPECS } from "../assets/engine/rating/browser.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

/* ---------------------------------------------------------------- paintings */

let scheme = root.dataset.scheme === "pink" ? "pink" : "blue";
const INK = { ink: "#141311" }, EMBER = { ink: "#FF5A1F" };

function paintAll() {
  for (const c of $$("canvas.paint")) {
    const scene = c.dataset.scene;
    const pal = scene === "underline" ? EMBER : scene === "bar" ? INK : PALETTES[scheme];
    paintCanvas(c, scene, pal, +c.dataset.seed || 7, c.dataset.score);
  }
}

/* ---------------------------------------------------------------- the rating */

const pct = (v) => (v < 0.02 ? (v * 100).toFixed(1) : Math.round(v * 100)) + "%";
const SINGULAR = { channels: "channel", newsletters: "newsletter", streamers: "streamer", shows: "show", photographers: "photographer" };
const PLATFORM = { youtube: "YouTube channel", substack: "Substack newsletter", twitch: "Twitch stream", podcast: "Podcast", photography: "Photography" };
const CODE = { channel: "01", newsletter: "02", stream: "03", podcast: "04", portfolio: "05" };
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/* the folder label: what is filed in it, e.g. "Channels, 250k to 1M" */
const filed = (peers, label) => `${cap(peers)}, ${label}`;
/* the part each kind leads with: a newsletter is read by paid conversion first, not its open rate */
const LEAD = { newsletter: "conversion" };
/* what the typical neighbour is read by: the same part the sheet leads with, from the engine's baseline */
function typicalLine(e, here) {
  const lead = LEAD[e.kind] && SPECS[e.platform].parts.find((p) => p.key === LEAD[e.kind]);
  if (lead && lead.display?.as === "perThousand") return `${lead.name} ${(lead.prior.median * 1000).toFixed(2)} per 1,000, rating 0.00, by definition`;
  return `Reach ${pct(here.value)}, rating 0.00, by definition`;
}
const fmt = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);

function fill(kind, animate) {
  const e = example(kind);
  const b = benchmark(kind);
  const i = b.rows.findIndex((r) => r.key === b.example);
  const here = b.rows[i];
  // the drawer reads as a scale: the next size up just behind yours, the size above that at the back
  const front = b.rows[i + 1] || b.rows[i - 1], back = b.rows[i + 1] ? b.rows[i + 2] : b.rows[i - 2];

  $("[data-band-here]").textContent = filed(e.peers, here.label);
  $("[data-band-prev]").textContent = front ? filed(e.peers, front.label) : "";
  $("[data-band-next]").textContent = back ? filed(e.peers, back.label) : "";
  $("[data-flap]").textContent = e.name;
  $(".peek-a").hidden = !front; $(".peek-b").hidden = !back;

  $("[data-nb-title]").textContent = `The typical ${SINGULAR[e.peers] || e.peers} this size`;
  $("[data-nb-value]").textContent = typicalLine(e, here);

  $("[data-code]").textContent = PLATFORM[e.platform] || e.label;
  $("[data-name]").textContent = e.name;
  $("[data-who]").textContent = e.handle;
  $("[data-band]").textContent = e.band;
  $("[data-tip]").innerHTML = `Measured against <b></b>`;
  $("[data-tip] b").textContent = e.sizeBand;
  $("[data-typical]").textContent = `Zero is typical for ${e.peers} this size.`;

  const ol = $("[data-parts]");
  const parts = LEAD[kind] ? [...e.parts].sort((x, y) => (y.key === LEAD[kind]) - (x.key === LEAD[kind])) : e.parts;
  ol.replaceChildren(...parts.map((p, j) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="p-name"></span><span class="p-beat">Beats <b></b> in 100</span><span class="p-bar"><canvas class="paint" data-scene="bar" aria-hidden="true"></canvas></span>`;
    li.querySelector(".p-name").textContent = p.name;
    li.querySelector(".p-beat b").textContent = p.score;
    const c = li.querySelector("canvas");
    c.dataset.score = p.score; c.dataset.seed = 3 + j * 5 + +CODE[kind];
    c.style.transitionDelay = `${0.45 + j * 0.12}s`;
    return li;
  }));

  $("[data-maths]").replaceChildren(...mathsFor(kind).map((m) => {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><b></b>`;
    li.querySelector("span").textContent = m.name;
    li.querySelector("b").textContent = m.weight + "%";
    li.title = m.what;
    return li;
  }));

  // the line this creator would post
  $("[data-line-a]").textContent = `Zero is typical for ${e.peers} my size. I’m at`;
  $("[data-line-n]").textContent = e.signed;
  $("[data-line-who]").textContent = e.handle;
  $("[data-line-band]").textContent = `${e.band}, against ${e.peers} with ${e.sizeBand}.`;

  requestAnimationFrame(paintAll);
  countTo(e, animate);
}

let raf;
/* The sheet's figure. While it counts, the band word is hidden; it appears only beside the finished figure. */
function countTo(e, animate) {
  const out = $("[data-rating]"), score = out.parentElement;
  cancelAnimationFrame(raf);
  // hold the width of the final figure while it counts, so the band beside it never moves
  out.style.minWidth = "";
  out.textContent = e.signed;
  out.style.minWidth = out.getBoundingClientRect().width + "px";
  if (!animate || reduce) { score.classList.remove("counting"); return; }
  score.classList.add("counting");
  const t0 = performance.now(), dur = 900;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    out.textContent = k < 1 ? fmt(e.rating * settle(k)) : e.signed;
    if (k < 1) raf = requestAnimationFrame(tick);
    else score.classList.remove("counting");
  };
  out.textContent = fmt(0);
  raf = requestAnimationFrame(tick);
}

/* The signature: the drawer is shut until you reach it; then your size's folder lifts and opens to your rating, filed. */
const drawer = $("[data-drawer]");
let current = "channel", opened = false;

function open() {
  if (opened) return;
  opened = true;
  drawer.classList.add("open");
  countTo(example(current), true);
}

/* Switching kind: the old sheet stays whole while the folder closes over it, then sheet, labels, neighbour
   and flap all change in one frame, and the folder opens on the new sheet. Nothing mixes two kinds. */
let swapT;
function switchKind(kind) {
  if (kind === current) return;
  current = kind;
  for (const t of $$(".kinds [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.kind === kind));
  clearTimeout(swapT);
  if (reduce || !opened) { fill(kind, false); return; }
  drawer.classList.remove("open");
  drawer.classList.add("closing");
  swapT = setTimeout(() => {
    fill(kind, false);
    drawer.classList.remove("closing");
    void drawer.offsetWidth;
    drawer.classList.add("open");
    countTo(example(kind), true);
  }, 380);
}

/* ---------------------------------------------------------------- boot */

/* --ease-settle, cubic-bezier(0.16, 1, 0.3, 1), solved for x so the count lands like the panels do */
function bezier(x1, y1, x2, y2) {
  const f = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; }
    return f(y1, y2, t);
  };
}
const settle = bezier(0.16, 1, 0.3, 1);

/* The first screen's figure counts in once, the first time it is seen, so the eye lands on it. */
function hero() {
  const e = example("channel");
  const out = $("[data-h-rating]");
  $("[data-h-band]").textContent = e.band;
  $("[data-h-name]").textContent = e.name;
  $("[data-h-peers]").textContent = `${e.peers} with ${e.sizeBand}`;
  $("[data-pv-band]").textContent = filed(e.peers, benchmark("channel").rows.find((r) => r.key === benchmark("channel").example).label);
  $("[data-pv-name]").textContent = e.name;
  $("[data-pv-n]").textContent = `Rated against ${e.peers} its size`;
  // hold the final figure's width while it counts, so the band beside it never moves
  const hold = () => {
    const now = out.textContent;
    out.style.minWidth = ""; out.textContent = e.signed;
    out.style.minWidth = out.getBoundingClientRect().width + "px";
    out.textContent = now;
  };
  out.textContent = e.signed; hold();
  if (document.fonts) document.fonts.ready.then(hold);
  if (reduce || !("IntersectionObserver" in window)) return;
  out.textContent = fmt(0);
  const line = out.parentElement;
  line.classList.add("counting");
  const run = () => {
    const t0 = performance.now(), dur = 700;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      out.textContent = k < 1 ? fmt(e.rating * settle(k)) : e.signed;
      if (k < 1) requestAnimationFrame(tick);
      else line.classList.remove("counting");
    };
    requestAnimationFrame(tick);
  };
  // start once the type has settled, so the count is seen rather than finished before the fonts land
  const watch = () => {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.6 });
    io.observe(out);
  };
  const after = () => setTimeout(watch, Math.max(0, 260 - performance.now()));
  if (document.fonts) document.fonts.ready.then(after); else after();
}

function forms() {
  for (const f of $$("[data-reserve]")) {
    const note = $("[data-note]", f), kind = $("select", f), input = $("input", f);
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const h = cleanHandle(input.value).toLowerCase();
      if (!h) { note.textContent = "Type the handle you’d like, and we’ll write the request out for you."; input.focus(); return; }
      const k = kind.value;
      const res = await reserve({ handle: h, kind: k });
      if (res.ok) {
        const e = example(k);
        note.textContent = res.via === "api"
          ? `We have your request for @${h}. We’ll check it’s yours when ratings open. Here is how a ${e.word} your size is read.`
          : `Your email app has the request for @${h} written out. Send it, and we’ll check the handle is yours when ratings open. Here is how a ${e.word} your size is read.`;
        switchKind(k);
        setTimeout(() => $("#rating").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }), 900);
      } else if (res.reason === "taken") {
        note.textContent = `@${h} is already requested. Try another.`;
      }
    });
  }
}

/* The brand colour, for the founder to choose: Blue (recommended) or Pink. Maps to the tokens' data-scheme. */
function setScheme(c, save) {
  if (c !== "blue" && c !== "pink") return;
  scheme = c;
  root.dataset.scheme = c;
  for (const b of $$(".palette button")) b.setAttribute("aria-pressed", String(b.dataset.c === c));
  if (save) { try { localStorage.setItem("orbe-r6g-c", c); } catch {} }
  paintAll();
}

function boot() {
  try { root.style.setProperty("--grain", `url(${grainTile()})`); } catch {}
  mountWordmark($("[data-wordmark]"), { animate: !reduce });
  mountWordmark($("[data-wordmark-foot]"), { animate: false });
  $("[data-example-line]").textContent = EXAMPLE_LINE;
  hero();
  setScheme(scheme, false);
  for (const b of $$(".palette button")) b.addEventListener("click", () => setScheme(b.dataset.c, true));
  fill("channel", false);
  forms();

  for (const t of $$(".kinds [role=tab]")) t.addEventListener("click", () => switchKind(t.dataset.kind));

  if (reduce || !("IntersectionObserver" in window)) { drawer.classList.add("open", "still"); opened = true; }
  else {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { open(); io.disconnect(); } }, { threshold: 0.28 });
    io.observe(drawer);
  }

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(paintAll, 200); });
  if (document.fonts) document.fonts.ready.then(paintAll);
  if (location.hash === "#open") open();
}

boot();
