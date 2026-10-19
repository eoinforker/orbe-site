/*
  The four applications. The first two are the homepage itself, loaded live
  at its native size. The post and the email are drawn at native size from
  the parts the site uses today: tokens, components, the Carved wordmark, the
  brush painter and the rating window with its band rule.
  Every figure comes from the Orbe engine's made-up examples and says so.
  render(scheme) returns HTML; paint(root, scheme) lays the brush strokes
  into its canvases once the HTML is in the page.
*/
import { example, EXAMPLE_LINE } from "../assets/r5/examples.js";
import { WORDMARK } from "../assets/r5/wordmark.js";
import { paintCanvas, PALETTES } from "../r6-g/painter.js";

const W0 = WORDMARK.text;
const WM = `<svg class="wm" viewBox="${W0.vb}" role="img" aria-label="Orbe" fill="currentColor">${["O", "r", "b", "e"].map((k) => `<path d="${W0[k]}"/>`).join("")}</svg>`;
const minus = (s) => s.replace("-", "−");
const BANDS = ["Poor", "Subpar", "Average", "Good", "Great"];
const EDGES = [-3.2, -2, -0.8, 0.8, 2, 3.2];
export function bandPos(v) {
  const x = Math.max(EDGES[0], Math.min(EDGES[5], v));
  for (let i = 0; i < 5; i++) if (x <= EDGES[i + 1]) return (i + (x - EDGES[i]) / (EDGES[i + 1] - EDGES[i])) * 20;
  return 100;
}
/* The band rule: five bands on a heavy ink rule, a square marker where the rating sits. */
export const bandRule = (e) => `<div class="ap-scale" aria-hidden="true">${BANDS.map((b) => `<span class="${b === e.band ? "on" : ""}">${b}</span>`).join("")}<i style="left:${bandPos(e.rating).toFixed(1)}%"></i></div>`;

/* ------------------------------------------------------------------ 1 and 2. the homepage itself
   Not redrawn: the homepage at / is loaded live at its own size and scaled, so the
   book can never show a homepage that does not ship. The story is held on its first
   moment once the count has landed, so the frame reads as the first screen. */
const live = (w, h, label) => (scheme) => `<iframe class="ap-live" data-src="../?c=${scheme === "pink" ? "pink" : "blue"}" width="${w}" height="${h}" loading="lazy" tabindex="-1" title="${label}"></iframe>`;
const phone = {
  name: "The homepage on a phone", w: 390, h: 844,
  note: "The homepage at 390, live. The headline, the tray of five made-up creators, then the figure at display size: You beat 93 in 100 channels your size. The reply bar waits at the foot.",
  render: live(390, 844, "The homepage on a phone"),
};
const hero = {
  name: "The homepage on a desktop", w: 1440, h: 900,
  note: "The homepage at 1440, live. The headline and the reserve bar on the left; the story plays in a phone on the right, on its first moment here. Painted ground along the foot.",
  render: live(1440, 900, "The homepage on a desktop"),
};

/* ------------------------------------------------------------------ 3. social post */
const social = {
  name: "Social post", w: 1080, h: 1350,
  note: "Instagram portrait. One idea set huge, the figure with one ember brush stroke under it, painted ground at the foot. Something a creator would repost.",
  render: () => {
    const e = example("channel");
    return `
  <div class="ap-social" data-surface="field">
    <header>${WM}<span class="mono">how the rating works</span></header>
    <h2 class="o-display">Zero is typical.</h2>
    <p class="o-lede">Orbe rates your work against creators your size, never the top 1%. Above zero, you're ahead of them.</p>
    <p class="ap-sfig"><span class="ap-under">${minus(e.signed)}<canvas class="ap-paint" data-scene="underline" data-seed="5"></canvas></span> <i>${e.band}</i></p>
    <p class="ap-swho">${e.name}, against ${e.peers} ${e.sizeBand}. ${EXAMPLE_LINE}</p>
    <canvas class="ap-paint ap-sground" data-scene="hero" data-seed="21"></canvas>
  </div>`;
  },
};

/* ------------------------------------------------------------------ 4. email header */
const email = {
  name: "Email header: the after-post report", w: 1200, h: 640,
  note: "600px wide at 2x. Paper for reading, the creator's own art in corner brackets with a tooltip naming it, the figure set large and exact.",
  render: () => {
    const e = example("channel"), pb = e.card.personalBest;
    return `
  <div class="ap-email">
    <header data-surface="field">${WM}<span class="o-label">After-post report · 18 Oct 2026</span></header>
    <div class="ap-ebody">
      <div class="o-brackets ap-emailart"><img alt="" src="${e.card.image?.href ?? ""}"><span class="o-pill is-tip"><b>upload</b> ${e.card.workTitle.toLowerCase()}</span></div>
      <div>
        <h2 class="o-display is-3">Your most watched upload <span class="ap-under">yet.<canvas class="ap-paint" data-scene="underline" data-seed="8"></canvas></span></h2>
        <p class="o-lede">${pb ? `${pb.value} views on ${e.card.workTitle}, past your old best of ${pb.previous}.` : e.best}</p>
        <p class="o-label ap-soft">A made-up channel, rated by the Orbe engine</p>
      </div>
    </div>
  </div>`;
  },
};

export const APPS = { phone, hero, social, email };

/* Lay the brush strokes into every canvas under root, at its rendered size. */
const EMBER = { ink: "#FF5A1F" };
export function paint(root, scheme) {
  for (const f of root.querySelectorAll("iframe.ap-live")) hold(f);
  for (const c of root.querySelectorAll("canvas.ap-paint")) {
    const scene = c.dataset.scene;
    paintCanvas(c, scene, scene === "underline" ? EMBER : PALETTES[scheme === "pink" ? "pink" : "blue"], +c.dataset.seed || 7);
  }
}

/* Hold the live homepage on its first moment: its progress fill stops, so the story never turns. */
function hold(f) {
  // A frame loads only once it is shown: a page loaded inside a hidden tab would
  // start its count before it has frames to draw.
  if (!f.getClientRects().length) return;
  if (!f.getAttribute("src")) f.src = f.dataset.src;
  if (f.dataset.held) return;
  f.dataset.held = "1";
  const freeze = () => {
    try {
      const d = f.contentDocument;
      if (!d || d.querySelector("style[data-held]")) return;
      const st = d.createElement("style");
      st.dataset.held = "";
      st.textContent = ".prog-fill { animation-play-state: paused !important; } .skip { display: none !important; }";
      setTimeout(() => {
        d.head.append(st);
        // Every figure shows its final value, whatever the frame's clock did.
        for (const n of d.querySelectorAll("[data-count][data-final]")) n.textContent = n.dataset.final;
      }, 1400);
    } catch {}
  };
  f.addEventListener("load", () => { freeze(); f.dataset.loaded = "1"; });
  if (f.contentDocument?.readyState === "complete" && f.contentDocument.URL !== "about:blank") freeze();
}
