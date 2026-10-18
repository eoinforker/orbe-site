import { mountWordmark } from "../assets/r5/wordmark.js";
import { example, CARD_EXAMPLE_LINE } from "../assets/r5/examples.js";
import { renderCard } from "../assets/r5/card.js";
import { creature, ditherOrb, bars, pixelStripe, landscape, crayon, COLOURS as C } from "../assets/brand/brand.js";
import { APPS } from "./apps.js";
import { PAIRS, HEX, ratio, grade } from "./contrast.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

/* ------------------------------------------------------------------ the scheme */
const q = new URLSearchParams(location.search).get("scheme");
let scheme = q === "pink" || q === "blue" ? q : store.get("orbe-brand-scheme") === "pink" ? "pink" : "blue";
const deep = () => (scheme === "pink" ? C.claret : C.cobalt);

/* ------------------------------------------------------------------ swatches */
const SW = {
  primary: [
    ["Sky", C.sky, "The field. Half of every brand page.", "50%"], ["Cobalt", C.cobalt, "The one action, links, the ball.", "7%"],
    ["Ink", C.ink, "Type, borders, windows.", "18%"], ["Paper", C.paper, "Reading, product, the card.", "22%"], ["Ember", C.ember, "The spark. Decoration only.", "3%"],
  ],
  pink: [["Peony", C.peony, "Field, alternative scheme", "50%"], ["Claret", C.claret, "Action and accent", "5%"], ["Ink", C.ink, "Type; the action", "20%"], ["Paper", C.paper, "Reading, product", "22%"], ["Ember", C.ember, "The spark", "3%"]],
  papers: [["Chalk", C.chalk, "Windows, inputs"], ["Paper", C.paper, "The page"], ["Linen", C.linen, "Wells, product ground"], ["Mist", C.mist, "Sky tint"], ["Blush", C.blush, "Peony tint"]],
  inks: [["Ink", C.ink, "Type"], ["Soot", C.soot, "Pressed, night panels"], ["Graphite", C.graphite, "Secondary text"], ["Stone", C.stone, "Text on ink only"]],
  painterly: [["Meadow", C.meadow], ["Ochre", C.ochre], ["Straw", C.straw], ["Grove", C.grove], ["Water", C.water], ["Dawn", C.dawn], ["Peony", C.peony, "The dawn sky"]],
  functional: [["Positive", "#0A6B3A", "Read, connected"], ["Positive tint", "#DDF1E4"], ["Negative", "#B8291A", "Failed, cannot read"], ["Negative tint", "#FBDAD3"], ["Warning", "#8A5800", "Partly read"], ["Warning fill", "#FFC23D", "Dot, fill"], ["Warning tint", "#FFE7AD"], ["Focus", C.cobalt, "3px ring, 3px gap"]],
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
const onColour = (h) => (ratio(h, C.ink) >= ratio(h, C.chalk) ? C.ink : C.chalk);

function swatches() {
  for (const box of $$("[data-swatches]")) {
    box.innerHTML = SW[box.dataset.swatches].map(([name, hex, role, share]) => `
      <div class="bk-sw"><div class="bk-sw-chip" style="background:${hex};color:${onColour(hex)}"><b>${name}</b>${share ? `<span class="o-label">${share}</span>` : ""}</div>
      <div class="bk-sw-meta"><code>${hex}</code><code>RGB ${rgb(hex)}</code>${role ? `<span>${role}</span>` : ""}</div></div>`).join("");
  }
  const prop = scheme === "pink"
    ? [["Peony", C.peony, 50], ["Paper", C.paper, 22], ["Ink", C.ink, 20], ["Claret", C.claret, 5], ["Ember", C.ember, 3]]
    : [["Sky", C.sky, 50], ["Paper", C.paper, 22], ["Ink", C.ink, 18], ["Cobalt", C.cobalt, 7], ["Ember", C.ember, 3]];
  $("[data-proportions]").innerHTML = prop.map(([n, c, p]) => `<span style="--c:${c};--p:${p};--t:${onColour(c)}">${n} ${p}</span>`).join("");
  const pairs = [["Ink on Sky", C.ink, C.sky], ["Chalk on Cobalt", C.chalk, C.cobalt], ["Ink on Paper", C.ink, C.paper], ["Cobalt on Paper", C.cobalt, C.paper], ["Sky on Ink", C.sky, C.ink], ["Ink on Ember", C.ink, C.ember], ["Ember on Ink", C.ember, C.ink], ["Ink on Peony", C.ink, C.peony]];
  $("[data-pairs]").innerHTML = pairs.map(([n, f, b]) => `<div class="bk-pair" style="background:${b};color:${f}"><b>Aa 0.71</b><span>${n} · ${ratio(f, b).toFixed(2)}:1</span></div>`).join("");
}

function contrast() {
  const yes = (v) => (v === null ? '<span class="na">n/a</span>' : v ? '<span class="pass">Pass</span>' : '<span class="fail">Fail</span>');
  $("[data-contrast] tbody").innerHTML = PAIRS.map(([f, b, use, sch]) => {
    const r = ratio(HEX[f], HEX[b]), g = grade(r, use);
    return `<tr><td><span class="chip" style="color:${HEX[f]};background:${HEX[b]}">Aa</span>${f} on ${b}</td><td>${use}</td><td>${sch}</td><td>${r.toFixed(2)}:1</td><td>${yes(g.aa)}</td><td>${yes(g.aaa)}</td></tr>`;
  }).join("");
}

function pscale() {
  const steps = [[12, 500, "label"], [13, 400, "meta"], [14, 400, "body"], [16, 600, "strong"], [20, 700, "h3"], [24, 700, "h2"], [32, 700, "h1"], [48, 700, "figure"]];
  $("[data-pscale]").innerHTML = steps.map(([px, w, n]) => `<span><b style="font:${w} ${px}px/1 var(--font-text);letter-spacing:${px > 20 ? "-0.02em" : "0"}">${px >= 32 ? "+0.71" : "Downloads"}</b><small>${px} · ${w} · ${n}</small></span>`).join("");
}

/* ------------------------------------------------------------------ pictures */
const CRITTERS = {
  cover: () => ({ seed: 4, body: C.ember, edge: C.paper, mark: deep(), cell: 8 }),
  blue: () => ({ seed: 1, body: C.cobalt, edge: C.paper, mark: C.ember, cell: 8 }),
  pink: () => ({ seed: 1, body: C.claret, edge: C.blush, mark: C.ember, cell: 8 }),
  tile: () => ({ seed: 9, body: deep(), edge: C.paper, mark: C.ember, cell: 8 }),
};
let frame = 0;
function drawCritters() {
  for (const el of $$("[data-critter]")) {
    if (el.dataset.off === "1" && el.innerHTML) continue;
    const cfg = CRITTERS[el.dataset.critter]();
    el.innerHTML = creature({ ...cfg, phase: (frame % 8) / 8 });
  }
}

function pictures() {
  const pal = scheme === "pink" ? "dawn" : "sky";
  const ground = $("[data-scape=cover]");
  const w = Math.max(390, Math.round(ground.clientWidth || 1440)), h = Math.max(200, Math.round(ground.clientHeight || 320));
  ground.innerHTML = landscape({ w, h, palette: pal, seed: 43, horizon: 0.22, grainOpacity: 0.45 });
  const cov = $("[data-bars]");
  const cw = cov.clientWidth || 1440, ch = cov.clientHeight || 900, wide = cw > 760;
  cov.innerHTML = bars({ w: cw, h: ch, weight: wide ? 0.06 : 0.045, lines: wide ? [[0.6, 0.16, 0.95, 0.04, C.ember], [0.82, 0.5, 1.06, 0.36, deep()]] : [[0.62, 0.05, 1.05, 0.0, C.ember], [0.78, 0.6, 1.08, 0.52, deep()]] });
  $("[data-scape=tile]").innerHTML = landscape({ w: 900, h: 300, palette: pal, seed: 11, horizon: 0.45 });
  $("[data-orb]").innerHTML = ditherOrb({ fg: scheme === "pink" ? C.peony : C.sky, seed: 3, cells: 64, cell: 5 });
  $("[data-bartile]").innerHTML = bars({ w: 400, h: 200, weight: 0.13, lines: [[0.1, 0.75, 0.6, 0.2, C.ember], [0.5, 0.85, 0.92, 0.45, deep()]] });
  $("[data-stripe]").innerHTML = pixelStripe({ w: 1200, cell: 12, colours: [deep(), C.sky, C.ink, C.ember], seed: 4 });
  $("[data-crayons]").innerHTML = crayon({ shape: "loop", colour: C.ember, seed: 4, weight: 6 }) + crayon({ shape: "underline", colour: deep(), seed: 8 }) + crayon({ shape: "arrow", colour: C.ink, seed: 2, weight: 7 });
  drawCritters();
}

function frames() {
  const pod = example("podcast"), ch = example("channel"), nl = example("newsletter");
  const cardSvg = (() => { try { const c = nl.card; return renderCard(nl.result, { moment: "rating", format: "square", theme: "paper", handle: nl.handle, name: nl.name, note: CARD_EXAMPLE_LINE, idPrefix: "fr", works: c.works, image: c.image, workTitle: c.workTitle }).replace(/ width="\d+" height="\d+"/, ""); } catch { return ""; } })();
  $("[data-frames]").innerHTML = `
    <figure class="bk-frame"><div class="o-brackets"><img alt="Show art for The Long Table, a made-up podcast" src="${pod.card.image?.href ?? ""}"></div><figcaption class="o-small"><span class="o-pill is-tip"><b>artefact 61</b> [${pod.card.workTitle.toLowerCase()}]</span><br>Corner brackets: an email, a report, a dashboard header.</figcaption></figure>
    <figure class="bk-frame"><div class="o-folder"><span class="o-folder-tab">[01] Field Recordings</span><img alt="Artwork for Field Recordings, a made-up channel" src="${ch.card.image?.href ?? ""}"></div><figcaption class="o-small">A folder: the archive, a profile, a buyer's file.</figcaption></figure>
    <figure class="bk-frame"><div class="bk-cardmini">${cardSvg}</div><figcaption class="o-small">The card's window: the work inside the lap, unchanged.</figcaption></figure>`;
}

function motion() {
  const E = [
    ["Settle", "--ease-settle", [0.16, 1, 0.3, 1], "UI, panels, a figure counting up. 220 to 420ms.", 700],
    ["Standard", "--ease-standard", [0.4, 0, 0.2, 1], "State changes: tabs, toggles, hovers. 220ms.", 500],
    ["Play", "--ease-play", [0.34, 1.56, 0.64, 1], "Creatures, pills, dealt cards. Never money.", 700],
    ["Chisel", "--ease-chisel", [0.65, 0, 0.35, 1], "The wordmark's cut, once, 1.1s.", 1100],
  ];
  $("[data-motion]").innerHTML = E.map(([n, v, [a, b, c, d], use, ms]) => {
    const P = (x, y) => `${(x * 100).toFixed(1)},${(100 - y * 80 - 10).toFixed(1)}`;
    return `<div class="bk-ease" style="--e:var(${v});--d:${ms}ms"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M${P(0, 0)} L${P(1, 1)}" stroke="rgba(20,19,17,.15)" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/><path d="M${P(0, 0)} C${P(a, b)} ${P(c, d)} ${P(1, 1)}" stroke="${scheme === "pink" ? C.claret : C.cobalt}" stroke-width="2.5" fill="none" vector-effect="non-scaling-stroke"/></svg><div class="track"><span class="dot"></span></div><b>${n}</b><code>${v}: cubic-bezier(${a}, ${b}, ${c}, ${d})</code><p>${use}</p></div>`;
  }).join("");
}
let motionOn = false;
if (!reduce) {
  setInterval(() => { if (motionOn) for (const b of $$(".bk-ease")) b.classList.toggle("is-run"); }, 1600);
  new IntersectionObserver((es) => { motionOn = es.some((e) => e.isIntersecting); }).observe($("[data-motion]"));
}

/* ------------------------------------------------------------------ applications */
const LAYOUT = [["hero", 12], ["card", 6], ["social", 6], ["dashboard", 12], ["email", 6], ["stripe", 6], ["deck", 12]];
function apps() {
  const box = $("[data-apps]");
  box.innerHTML = LAYOUT.map(([k, span], i) => {
    const a = APPS[k];
    return `<figure class="bk-app ${span === 6 ? "is-half" : ""}"><div class="bk-app-frame" style="aspect-ratio:${a.w}/${a.h}"><div class="app" style="width:${a.w}px;height:${a.h}px" data-app="${k}" aria-hidden="true">${a.render(scheme)}</div></div>
      <figcaption><span class="o-label">${String(i + 1).padStart(2, "0")}</span><b>${a.name}</b><span>${a.note}</span></figcaption></figure>`;
  }).join("");
  fit();
}
function fit() {
  for (const el of $$(".bk-app-frame")) {
    const app = el.firstElementChild;
    app.style.transform = `scale(${el.clientWidth / parseFloat(app.style.width)})`;
  }
}
new ResizeObserver(() => fit()).observe(document.body);

/* ------------------------------------------------------------------ wiring */
function setScheme(s, first = false) {
  scheme = s;
  document.documentElement.dataset.scheme = s;
  for (const b of $$("[data-scheme-set]")) b.setAttribute("aria-pressed", String(b.dataset.schemeSet === s));
  store.set("orbe-brand-scheme", s);
  if (!first) { const u = new URL(location.href); u.searchParams.set("scheme", s); history.replaceState(null, "", u); }
  swatches(); pictures(); motion(); apps();
}
for (const b of $$("[data-scheme-set]")) b.addEventListener("click", () => setScheme(b.dataset.schemeSet));

mountWordmark($(".bk-top .wm"));
mountWordmark($(".bk-foot .wm"), { animate: false });
contrast(); pscale(); frames();
setScheme(scheme, true);

let lastW = innerWidth;
addEventListener("resize", () => { if (Math.abs(innerWidth - lastW) > 80) { lastW = innerWidth; pictures(); } });

// creatures walk at about nine frames a second, only while on screen
if (!reduce) {
  const seen = new Set();
  const io = new IntersectionObserver((es) => { for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); });
  for (const el of $$("[data-critter]")) io.observe(el);
  setInterval(() => {
    if (!seen.size) return;
    frame++;
    for (const el of seen) el.innerHTML = creature({ ...CRITTERS[el.dataset.critter](), phase: (frame % 8) / 8 });
  }, 110);
}
document.body.dataset.ready = "1";
