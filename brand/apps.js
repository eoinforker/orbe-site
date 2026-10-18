/*
  The seven applications, each drawn at its native size from the brand's own
  parts: tokens, components, brand.js, the Carved wordmark and the product's
  card renderer. Every figure comes from the Orbe engine's made-up examples
  and says so. render(scheme) returns HTML; mount(root, scheme) fills the
  live parts (cards, wordmarks).
*/
import { example, CARD_EXAMPLE_LINE } from "../assets/r5/examples.js";
import { renderCard } from "../assets/r5/card.js";
import { WORDMARK } from "../assets/r5/wordmark.js";
import { creature, ditherOrb, bars, pixelStripe, landscape, crayon, COLOURS as C } from "../assets/brand/brand.js";

const W0 = WORDMARK.text;
const WM = `<svg class="wm" viewBox="${W0.vb}" role="img" aria-label="Orbe" fill="currentColor">${["O", "r", "b", "e"].map((k) => `<path d="${W0[k]}"/>`).join("")}</svg>`;
const scape = (scheme) => (scheme === "pink" ? "dawn" : "sky");
const deep = (scheme) => (scheme === "pink" ? C.claret : C.cobalt);
const field = (scheme) => (scheme === "pink" ? C.peony : C.sky);
const cache = new Map();
const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));
const fmt = new Intl.NumberFormat("en-GB");

function card(kind, theme, prefix) {
  const e = example(kind), c = e.card;
  try {
    return renderCard(e.result, { moment: "rating", format: "square", theme, handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: prefix, works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image })
      .replace(/ width="\d+" height="\d+"/, "");
  } catch { return ""; }
}
function pbCard(kind, theme, prefix) {
  const e = example(kind), c = e.card;
  try {
    return renderCard(e.result, { moment: c.personalBest ? "best" : "rating", format: "square", theme, handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: prefix, works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image })
      .replace(/ width="\d+" height="\d+"/, "");
  } catch { return card(kind, theme, prefix); }
}

/* ------------------------------------------------------------------ 1. home page hero */
const hero = {
  name: "Home page hero", w: 1440, h: 900,
  note: "The field, the giant grotesk and a creature carry the energy; the painted ground and the folder carry the warmth; the card is the product, drawn by its own renderer.",
  render: (s) => `
  <div class="ap-hero" data-surface="field">
    <div class="ap-bars">${memo("bars" + s, () => bars({ w: 1440, h: 900, weight: 0.07, lines: [[0.62, 0.2, 0.93, 0.07, C.ember], [0.9, 0.62, 1.08, 0.5, deep(s)]] }))}</div>
    <div class="ap-ground">${memo("ls-hero" + s, () => landscape({ w: 1440, h: 420, palette: scape(s), seed: 43, horizon: 0.2, grainOpacity: 0.4, sky: false }))}</div>
    <nav class="ap-nav">${WM}<span><a class="o-pill">The rating</a><a class="o-pill">For buyers</a><a class="o-btn is-small">Reserve your handle</a></span></nav>
    <h1 class="o-display ap-h">Your work, rated against creators <span class="ap-loop">your size.${crayon({ shape: "loop", colour: C.ember, w: 600, h: 190, seed: 4, weight: 5 })}</span></h1>
    <div class="o-folder ap-form"><span class="o-folder-tab"><span class="ap-tabnum">[01]</span> Reserve your handle</span>
      <p class="o-lede">A channel, a newsletter, a podcast, a portfolio: each one rated fairly, against its own kind. Free, for good.</p>
      <div class="ap-row"><label class="o-input"><span class="o-input-pre">orbe.vc/@</span><input placeholder="yourhandle" tabindex="-1"></label><span class="o-btn">Reserve</span></div>
    </div>
    <figure class="ap-card" data-card="channel">${memo("card-hero" + s, () => card("channel", "paper", "h" + s))}</figure>
    <div class="ap-critter o-pixelated">${creature({ seed: 4, body: C.ember, edge: C.paper, mark: deep(s), cell: 7 })}</div>
  </div>`,
};

/* ------------------------------------------------------------------ 2. the card */
const cardApp = {
  name: "The card", w: 1080, h: 1080,
  note: "Unchanged: the product's card, in the scheme's theme. The creator's own picture sits in the window; the ball and the figure share the accent.",
  render: (s) => `<div class="ap-card-full">${memo("card-full" + s, () => pbCard("channel", s === "pink" ? "pink" : "blue", "c" + s))}</div>`,
};

/* ------------------------------------------------------------------ 3. podcast dashboard */
const EPISODES = ["Bread", "Salt", "Olive oil", "Rice", "Butter", "Tomatoes", "Coffee", "Lemons", "Honey", "Cheese", "Eggs", "Pepper"];
function dashboard(s) {
  const e = example("podcast");
  const works = e.card.works.slice(0, 12);
  const typical = 7077; // the engine's typical first week for this made-up show (explain text)
  const max = Math.max(...works.map((w) => w.multiple), 1.2);
  const barsHtml = works.slice().reverse().map((w, i, a) => {
    const last = i === a.length - 1;
    return `<span class="${last ? "is-new" : ""}" style="--h:${((w.multiple / max) * 100).toFixed(1)}%"><i>${w.multiple.toFixed(1)}×</i></span>`;
  }).join("");
  const rows = works.slice(0, 6).map((w, i) => `<tr><td><b>${61 - i}</b> ${EPISODES[i]}</td><td class="mono">${dateAgo(w.ageDays)}</td><td>${fmt.format(Math.round(typical * w.multiple))}</td><td>${w.multiple.toFixed(2)}×</td><td>${w.rating >= 0 ? "+" : "−"}${Math.abs(w.rating).toFixed(2)}</td></tr>`).join("");
  const parts = e.parts.map((p) => `<li><span>${p.name}</span><em>${p.value}</em><b class="ap-meter" style="--v:${p.score}%"></b><span class="o-tnum">Beats ${p.score} in 100</span></li>`).join("");
  const art = e.card.image?.href ?? "";
  return `
  <div class="ap-dash">
    <header class="ap-dbar">${WM}<span class="o-pill is-on">The Long Table</span><span class="mono soft">orbe.vc/@thelongtable</span><span class="ap-sp"></span><span class="o-status is-positive">Downloads measured by Orbe</span><span class="mono soft">checked 18 Oct 2026</span></header>
    <aside class="ap-rail"><a class="is-on">Overview</a><a>Episodes</a><a>Listeners</a><a>Charts</a><a>Sponsors</a><a>Your record</a><div class="ap-railfoot o-label">A made-up show,<br>with sample data</div></aside>
    <main class="ap-main">
      <section class="o-folder ap-show"><span class="o-folder-tab"><span class="ap-tabnum">[01]</span> Your show</span>
        <div class="o-brackets ap-art"><img alt="" src="${art}"></div>
        <div><h2 class="o-serif">The Long Table</h2><p class="mono soft">@thelongtable · podcast · ${e.sizeBand}</p><p class="ap-best">${e.best}</p></div>
        <div class="ap-rating"><span class="o-pill is-tip"><b>Measured against</b> ${e.sizeBand}</span><p><span class="o-figure">${e.signed.replace("-", "−")}</span> <span class="o-band">${e.band}</span></p><p class="soft small">Zero is typical for shows this size. Independently calculated by Orbe.</p></div>
      </section>
      <section class="o-window ap-chart"><div class="o-window-bar"><span>Each episode against your typical one</span><span>last 12</span></div><div class="o-window-body"><div class="ap-cols" style="--typ:${((1 / max) * 100).toFixed(1)}%">${barsHtml}<em>typical</em></div></div></section>
      <section class="o-window ap-parts"><div class="o-window-bar"><span>The rating, part by part</span><span>model 2026.10</span></div><div class="o-window-body"><ul>${parts}</ul></div></section>
      <section class="o-window ap-table"><div class="o-window-bar"><span>Episodes</span><span>first week</span></div><div class="o-window-body"><table><thead><tr><th>Episode</th><th>Out</th><th>Downloads</th><th>× typical</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      <section class="o-window ap-tiers"><div class="o-window-bar"><span>Where these figures come from</span><span></span></div><div class="o-window-body">
        <p class="o-status is-positive">Measured by Orbe</p><p class="small soft">Downloads, counted from Orbe's own prefix under published rules.</p>
        <p class="o-status">Estimated from public signals</p><p class="small soft">Chart positions. Labelled as estimates wherever shown.</p>
        <p class="o-status is-warning">Read from your host</p><p class="small soft">Not connected. <a>Connect your host</a></p></div></section>
    </main>
  </div>`;
}
function dateAgo(days) {
  const d = new Date(Date.UTC(2026, 9, 18) - Math.round(days) * 86400000);
  return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
}
const dash = { name: "Product: the podcast dashboard", w: 1440, h: 900, note: "Paper, windows and tabular figures: the precise side. The show's own art sits in corner brackets; every block says where its figures came from.", render: (s) => memo("dash" + s, () => dashboard(s)) };

/* ------------------------------------------------------------------ 4. social post */
const social = {
  name: "Social post", w: 1080, h: 1350,
  note: "Instagram portrait. One idea, set huge, with a creature and a dithered orb. Something a creator would repost.",
  render: (s) => `
  <div class="ap-social" data-surface="field">
    <div class="ap-orb o-pixelated">${memo("orb" + s, () => ditherOrb({ fg: deep(s), seed: 5, cells: 80, cell: 8 }))}</div>
    <p class="o-label ap-kicker">Orbe · how the rating works</p>
    <h2 class="o-display">Zero is typical.</h2>
    <p class="o-lede">Orbe rates your work against creators your size, never the top 1%. Above zero, you are ahead of them.</p>
    <div class="ap-critter2 o-pixelated">${creature({ seed: 1, body: deep(s), edge: field(s) === C.sky ? C.paper : C.blush, mark: C.ember, cell: 12 })}</div>
    <footer>${WM}<span class="mono">orbe.vc · free, for good</span></footer>
    <div class="ap-stripe">${memo("stripe" + s, () => pixelStripe({ w: 1080, cell: 10, colours: [deep(s), C.ink, C.ember, C.paper], seed: 6 }))}</div>
  </div>`,
};

/* ------------------------------------------------------------------ 5. email header */
const email = {
  name: "Email header: the after-post report", w: 1200, h: 640,
  note: "600px wide at 2x. Paper and serif for warmth, the creator's own art framed in corner brackets, the figure set large and exact.",
  render: (s) => {
    const e = example("podcast"), pb = e.card.personalBest;
    return `
  <div class="ap-email">
    <header data-surface="field">${WM}<span class="o-label">After-post report · 18 Oct 2026</span><span class="ap-ecrit o-pixelated">${creature({ seed: 4, body: C.ember, edge: C.paper, mark: C.cobalt, cell: 4 })}</span></header>
    <div class="o-brackets ap-emailart"><img alt="" src="${e.card.image?.href ?? ""}"><span class="o-pill is-tip"><b>artefact 61</b> [${e.card.workTitle.toLowerCase()}]</span></div>
    <h2 class="o-display is-3">Your best first week <span class="ap-under">yet.${crayon({ shape: "underline", colour: C.cobalt, w: 200, h: 60, seed: 8, weight: 7 })}</span></h2>
    <p class="o-lede">${pb ? `${pb.value} downloads in seven days, past your old best of ${pb.previous}.` : e.best}</p>
    <p class="o-label soft">A made-up show, rated by the Orbe engine</p>
  </div>`;
  },
};

/* ------------------------------------------------------------------ 6. Stripe App drawer */
const stripe = {
  name: "Stripe App drawer", w: 1440, h: 900,
  note: "Stripe draws the drawer with its own components, fonts and colours, so the brand arrives only through the icon, the words and the figures. The chrome here is neutral, not Stripe's.",
  render: () => `
  <div class="ap-stripe-ui">
    <div class="ap-host"><div class="ap-hostbar"></div><div class="ap-hostside"></div><div class="ap-hostmain"><i></i><i></i><i class="w"></i><i></i><i class="w"></i></div></div>
    <aside class="ap-drawer">
      <header><img src="../assets/r5/icon-512.png" alt=""><b>Orbe</b><span>×</span></header>
      <p class="ap-dstatus"><span class="dot"></span>Verified</p>
      <h3>Your Stripe revenue on Orbe is read from your payouts, not estimates.</h3>
      <ul><li>Payouts read from Stripe, each traced charge by charge.</li><li>Orbe reads payouts, balance transactions, charges, invoices and subscriptions. It cannot move money or change anything in Stripe.</li><li>Last read 18 Oct 2026.</li></ul>
      <span class="ap-dbtn">Open your Orbe record</span>
      <p class="ap-dnote">Sample account. Words from the app's own status logic.</p>
    </aside>
  </div>`,
};

/* ------------------------------------------------------------------ 7. pitch deck title */
const deck = {
  name: "Pitch deck: title slide", w: 1920, h: 1080,
  note: "The wordmark at full voice on the field, the one-line idea in Newsreader, a creature for personality. Confident, not corporate.",
  render: (s) => `
  <div class="ap-deck" data-surface="field">
    <div class="ap-bars">${memo("dbars" + s, () => bars({ w: 1920, h: 1080, weight: 0.065, lines: [[0.74, 0.12, 1.04, 0.02, C.ember], [0.5, 0.82, 0.62, 0.72, deep(s)]] }))}</div>
    <div class="ap-deckwm">${WM}</div>
    <p class="ap-deckline">A fair measure of every creator's work, and the money underneath it.</p>
    <div class="ap-deckscape"><div class="o-folder"><span class="o-folder-tab"><span class="ap-tabnum">[00]</span> The middle</span><div class="ap-deckpaint">${memo("dscape" + s, () => landscape({ w: 620, h: 380, palette: scape(s), seed: 21, horizon: 0.45 }))}</div></div></div>
    <div class="ap-critter3 o-pixelated">${creature({ seed: 9, body: deep(s), edge: C.paper, mark: C.ember, cell: 11 })}</div>
    <footer class="o-label"><span>Seed round</span><span>October 2026</span><span>orbe.vc</span></footer>
  </div>`,
};

export const APPS = { hero, card: cardApp, dashboard: dash, social, email, stripe, deck };
