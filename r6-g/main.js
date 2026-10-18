import { example, EXAMPLE_LINE, benchmark, mathsFor, MODEL_VERSION } from "../assets/r5/examples.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { paintCanvas, PALETTES, grainTile } from "./painter.js";

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
const fmt = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);

function fill(kind, animate) {
  const e = example(kind);
  const b = benchmark(kind);
  const i = b.rows.findIndex((r) => r.key === b.example);
  const here = b.rows[i], prev = b.rows[i - 1], next = b.rows[i + 1];
  const noun = e.sizeBand.replace(here.label, "").trim();

  $("[data-band-here]").textContent = e.sizeBand;
  $("[data-band-prev]").textContent = prev ? `${prev.label} ${noun}` : "";
  $("[data-band-next]").textContent = next ? `${next.label} ${noun}` : "";
  $(".peek-a").hidden = !prev; $(".peek-b").hidden = !next;

  $("[data-nb-title]").textContent = `The typical ${SINGULAR[e.peers] || e.peers} this size`;
  $("[data-nb-value]").textContent = `Reach ${pct(here.value)}, rating 0.00, by definition`;

  $("[data-code]").textContent = `No. ${CODE[kind]}, ${e.label}`;
  $("[data-model]").textContent = `Model ${MODEL_VERSION}`;
  $("[data-name]").textContent = e.name;
  $("[data-who]").textContent = `${e.handle} · ${PLATFORM[e.platform] || e.label}`;
  $("[data-band]").textContent = e.band;
  $("[data-tip]").innerHTML = `Measured against <b></b>`;
  $("[data-tip] b").textContent = e.sizeBand;
  $("[data-typical]").textContent = `Zero is typical for ${e.peers} this size.`;

  const ol = $("[data-parts]");
  ol.replaceChildren(...e.parts.map((p, j) => {
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

  // [03]: the line this creator would post
  $("[data-line-a]").textContent = `Zero is typical for ${e.peers} my size. I’m at`;
  $("[data-line-n]").textContent = e.signed;
  $("[data-line-who]").textContent = e.handle;
  $("[data-line-band]").textContent = `${e.band}, against ${e.peers} with ${e.sizeBand}.`;

  requestAnimationFrame(paintAll);
  countTo(e.rating, animate);
}

let raf;
function countTo(target, animate) {
  const out = $("[data-rating]");
  cancelAnimationFrame(raf);
  // hold the width of the final figure while it counts, so the band beside it never moves
  out.style.minWidth = "";
  out.textContent = fmt(target);
  out.style.minWidth = out.getBoundingClientRect().width + "px";
  if (!animate || reduce) return;
  const t0 = performance.now(), dur = 1100;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
    out.textContent = fmt(target * ease);
    if (k < 1) raf = requestAnimationFrame(tick);
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
  countTo(example(current).rating, true);
}

function switchKind(kind) {
  if (kind === current) return;
  current = kind;
  for (const t of $$(".kinds [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.kind === kind));
  if (reduce || !opened) { fill(kind, false); return; }
  drawer.classList.remove("open");
  drawer.classList.add("closing");
  setTimeout(() => {
    fill(kind, false);
    drawer.classList.remove("closing");
    void drawer.offsetWidth;
    drawer.classList.add("open");
    countTo(example(kind).rating, true);
  }, 420);
}

/* ---------------------------------------------------------------- boot */

function hero() {
  const e = example("channel");
  $("[data-h-rating]").textContent = e.signed;
  $("[data-h-band]").textContent = e.band;
  $("[data-h-name]").textContent = e.name;
  $("[data-h-peers]").textContent = `${e.peers} with ${e.sizeBand}`;
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
