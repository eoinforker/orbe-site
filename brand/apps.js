/*
  The three applications, each drawn at its native size from the parts the
  site uses today: tokens, components, the Carved wordmark, the archive's
  brush painter (r6-g) and the rating window with its band rule (r6-a).
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

/* The rating window, as r6-a and r6-e set it: ink bar, the figure, the band word, the rule. */
const ratingWindow = (e) => `
  <figure class="o-window ap-win">
    <figcaption class="o-window-bar"><span>Orbe Rating</span><span>${e.handle}</span></figcaption>
    <div class="o-window-body">
      <p class="ap-fig"><span>${minus(e.signed)}</span> <i>${e.band}</i></p>
      ${bandRule(e)}
      <p class="ap-winline">${e.name}, against ${e.peers} ${e.sizeBand}. Independently calculated by Orbe.</p>
    </div>
  </figure>`;

/* ------------------------------------------------------------------ 1. home page hero */
const hero = {
  name: "Home page hero", w: 1440, h: 900,
  note: "The field and the giant grotesk carry the energy; the folder form and the painted ground carry the warmth; the rating window carries the figure.",
  render: () => {
    const e = example("channel");
    return `
  <div class="ap-hero" data-surface="field">
    <canvas class="ap-paint ap-ground" data-scene="hero" data-seed="43"></canvas>
    <nav class="ap-nav">${WM}<span><a class="o-pill">The rating</a><a class="o-pill">For buyers</a></span></nav>
    <h1 class="o-display ap-h">Your work, rated against creators your size.</h1>
    <div class="o-folder ap-form"><span class="o-folder-tab">Hold your handle</span>
      <p class="o-lede">Free, for good. Ratings open with YouTube: connect your channel to see yours.</p>
      <div class="ap-row"><label class="o-input"><span class="o-input-pre">orbe.vc/@</span><input placeholder="yourhandle" tabindex="-1"></label><span class="o-btn">Reserve</span></div>
    </div>
    <div class="ap-herowin">${ratingWindow(e)}<p class="ap-made">${EXAMPLE_LINE}</p></div>
  </div>`;
  },
};

/* ------------------------------------------------------------------ 2. social post */
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

/* ------------------------------------------------------------------ 3. email header */
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

export const APPS = { hero, social, email };

/* Lay the brush strokes into every canvas under root, at its rendered size. */
const EMBER = { ink: "#FF5A1F" };
export function paint(root, scheme) {
  for (const c of root.querySelectorAll("canvas.ap-paint")) {
    const scene = c.dataset.scene;
    paintCanvas(c, scene, scene === "underline" ? EMBER : PALETTES[scheme === "pink" ? "pink" : "blue"], +c.dataset.seed || 7);
  }
}
