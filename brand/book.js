import { mountWordmark } from "../assets/r5/wordmark.js";
import { example, benchmark, mathsFor } from "../assets/r5/examples.js";
import { SPECS } from "../assets/engine/rating/browser.js";
import { COLOURS as C } from "../assets/brand/brand.js";
import { paintCanvas, PALETTES } from "../r6-g/painter.js";
import { paintCanvas as paintStory, PALETTES as STORY_PALETTES } from "../r6-e/painter.js";
import { mount as mountStamp } from "../assets/fx/stamptype.js";
import { APPS, paint as paintApp, bandRule } from "./apps.js";
import { PAIRS, HEX, ratio, grade } from "./contrast.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const minus = (s) => s.replace("-", "−");

/* ------------------------------------------------------------------ the scheme */
let scheme = document.documentElement.dataset.scheme === "pink" ? "pink" : "blue";

/* ------------------------------------------------------------------ the lead example: the YouTube channel, from the engine */
const ex = example("channel");
const spec = SPECS[ex.platform];
const reach = ex.parts.find((p) => p.key === "reach");
const reachRaw = ex.result.detail.parts.find((p) => p.key === "reach");
const work = ex.result.detail.workNoun;
const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven"];
const nParts = mathsFor("channel").length;

function story() {
  $("[data-story]").innerHTML = `
    <p class="bk-st-k">Where ${ex.handle} stands</p>
    <p class="bk-st-h"><span>You beat</span><b>${reach.score}</b><span>in 100 ${ex.peers} your size.</span></p>
    <div class="bk-st-track" aria-hidden="true"><span class="bar"><i style="width:${reach.score}%"></i></span><span>Reach, one of ${WORDS[nParts]} parts</span><span>of 100</span></div>
    <p class="bk-st-p">A typical ${work} from ${ex.name} reaches ${reachRaw.raw} of its ${spec.audienceNoun}. The rating weighs all ${WORDS[nParts]}: ${minus(ex.signed)}, ${ex.band}.</p>`;
  const noun = ex.peers.replace(/s$/, "");
  const said = `My ${noun} is rated ${minus(ex.signed)}, ${ex.band}, against ${ex.peers} my size.`;
  $("[data-post-win]").innerHTML = `<p class="bk-pw-bar"><span>Orbe Rating</span><span>${ex.handle}</span></p><p class="bk-pw-fig"><b>${minus(ex.signed)}</b> <i>${ex.band}</i></p><p class="bk-pw-line">Independently calculated by Orbe.</p>`;
  $("[data-said]").textContent = said;
  $("[data-post-link]").textContent = `orbe.vc/${ex.handle}`;
  const copied = $("[data-copied]");
  $("[data-copy]").addEventListener("click", async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(`${said} orbe.vc/${ex.handle}`); ok = true; } catch {}
    copied.textContent = ok ? "Copied. Paste it under your next post." : `Select and copy: ${said}`;
  });
  $("[data-fig]").innerHTML = `${minus(ex.signed)} <span class="o-band">${ex.band}</span>`;
}

/* The yardstick window: one upload against the smallest, the biggest and its own size (r6-a's maths). */
function yard() {
  const bm = benchmark("channel");
  const sigma = spec.parts.find((p) => p.key === "reach").prior.sigma;
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  const beats = (row) => (row.key === bm.example ? reach.score : Math.max(1, Math.min(99, Math.round(phi(Math.log(reachRaw.measured / row.value) / sigma) * 100))));
  const byKey = Object.fromEntries(bm.rows.map((r) => [r.key, r]));
  const lower = (s) => s.replace(/^Under/, "under").replace(/^Over/, "over");
  /* r6-a's words, so the book quotes the page. */
  const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
  const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
  const rows = [
    { row: bm.rows[0] },
    { row: bm.rows[bm.rows.length - 1] },
    { row: byKey[bm.example], mine: true },
  ].map((r) => ({ ...r, say: say(beats(r.row), r.mine) }));
  $("[data-yard-tab]").textContent = `One ${work}, three yardsticks`;
  $("[data-yard]").innerHTML = rows.map(({ row, say, mine }) => `
    <li class="${mine ? "mine" : ""}"><span class="vs">${mine ? `Its own size, ${row.label}` : `Against ${ex.peers} ${lower(row.label)}`}</span><span class="say">${say}${mine ? "" : '<span class="bk-sr"> Not a fair comparison.</span>'}</span><span class="n"><b>${beats(row)}</b> in 100</span></li>`).join("");
  $("[data-why]").innerHTML = `Against small ${ex.peers}, ${VERDICT[rows[0].say]}. Against the giants, ${VERDICT[rows[1].say]}. <b>Neither is fair.</b>`;
  $("[data-rt]").innerHTML = `<p class="bk-rt-top"><span>${minus(ex.signed)}</span><i>${ex.band}</i></p>${bandRule(ex)}<p class="bk-rt-foot">${ex.name}, ${ex.sizeBand}. A made-up creator, rated live by the Orbe engine.</p>`;
  const el = $("[data-yard]");
  if (reduce || !("IntersectionObserver" in window)) { el.classList.add("struck"); return; }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setTimeout(() => el.classList.add("struck"), 350); io.disconnect(); } }, { threshold: 0.6 });
  io.observe(el);
}

/* The brush: one ember stroke under the figure, ink bars as long as each part's score. */
function brush() {
  $("[data-brush]").innerHTML = `
    <p class="bk-b-fig"><span class="bk-b-under">${minus(ex.signed)}<canvas class="bk-paint" data-scene="underline" data-seed="5" aria-hidden="true"></canvas></span></p>
    <ol class="bk-b-parts">${ex.parts.map((p) => `<li><span>${p.name}</span><canvas class="bk-paint" data-scene="bar" data-seed="${p.score}" data-score="${p.score}" aria-hidden="true"></canvas><b>${p.score}</b></li>`).join("")}</ol>`;
}

const INK = { ink: C.ink }, EMBER = { ink: C.ember };
function paintAll() {
  for (const c of $$("canvas.bk-paint")) {
    const s = c.dataset.scene;
    if (c.dataset.painter === "e") { paintStory(c, s, STORY_PALETTES[scheme], +c.dataset.seed || 7); continue; }
    paintCanvas(c, s, s === "underline" ? EMBER : s === "bar" ? INK : PALETTES[scheme], +c.dataset.seed || 7, c.dataset.score);
  }
}

/* ------------------------------------------------------------------ swatches */
const SW = {
  primary: [["Sky", C.sky, "The field. Half of every brand page.", "50%"], ["Cobalt", C.cobalt, "The one action, links.", "7%"], ["Ink", C.ink, "Type, borders, windows.", "18%"], ["Paper", C.paper, "Reading and product.", "22%"], ["Ember", C.ember, "The spark.", "3%"]],
  pink: [["Peony", C.peony], ["Claret", C.claret], ["Ink", C.ink], ["Paper", C.paper], ["Ember", C.ember], ["Blush", C.blush]],
  papers: [["Chalk", C.chalk], ["Paper", C.paper], ["Linen", C.linen], ["Mist", C.mist], ["Blush", C.blush]],
  inks: [["Ink", C.ink], ["Soot", C.soot], ["Graphite", C.graphite], ["Stone", C.stone]],
  painterly: [["Meadow", C.meadow], ["Ochre", C.ochre], ["Straw", C.straw], ["Grove", C.grove], ["Water", C.water], ["Dawn", C.dawn]],
  functional: [["Positive", HEX.Positive], ["Negative", HEX.Negative], ["Warning", HEX.Warning], ["Warning fill", HEX["Warning fill"]]],
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
const onColour = (h) => (ratio(h, C.ink) >= ratio(h, C.chalk) ? C.ink : C.chalk);

function swatches() {
  $("[data-swatches=primary]").innerHTML = SW.primary.map(([name, hex, role, share]) => `
    <div class="bk-sw"><div class="bk-sw-chip" style="background:${hex};color:${onColour(hex)}"><b>${name}</b><span class="o-label">${share}</span></div>
    <div class="bk-sw-meta"><code>${hex}</code><code>RGB ${rgb(hex)}</code><span>${role}</span></div></div>`).join("");
  for (const box of $$("[data-chips]")) {
    box.className = "bk-chips";
    box.innerHTML = SW[box.dataset.chips].map(([name, hex]) => `<span class="bk-chip"><i style="background:${hex}"></i><b>${name}</b><code>${hex}</code></span>`).join("");
  }
  const prop = scheme === "pink"
    ? [["Peony", C.peony, 50], ["Paper", C.paper, 22], ["Ink", C.ink, 20], ["Claret", C.claret, 5], ["Ember", C.ember, 3]]
    : [["Sky", C.sky, 50], ["Paper", C.paper, 22], ["Ink", C.ink, 18], ["Cobalt", C.cobalt, 7], ["Ember", C.ember, 3]];
  $("[data-prop-label]").textContent = scheme === "pink" ? "The proportions on a page, pink-led" : "The proportions on a page, blue-led";
  $("[data-proportions]").setAttribute("aria-label", prop.map(([n, , p]) => `${n} ${p} percent`).join(", "));
  $("[data-proportions]").innerHTML = prop.map(([n, c, p]) => `<span style="--c:${c};--p:${p};--t:${onColour(c)}">${p >= 18 ? `${n} ${p}` : p >= 7 ? p : ""}</span>`).join("");
}

function contrast() {
  const yes = (v) => (v === null ? '<span class="na">n/a</span>' : v ? '<span class="pass">Pass</span>' : '<span class="fail">Fail</span>');
  const row = ([f, b, use, sch]) => {
    const r = ratio(HEX[f], HEX[b]), g = grade(r, use);
    return `<tr><td><span class="chip" style="color:${HEX[f]};background:${HEX[b]}">Aa</span>${f} on ${b}</td><td>${use}</td><td>${sch}</td><td>${r.toFixed(2)}:1</td><td>${yes(g.aa)}</td><td>${yes(g.aaa)}</td></tr>`;
  };
  const half = Math.ceil(PAIRS.length / 2);
  const table = (rows) => `<div class="bk-tablewrap"><table class="bk-contrast"><thead><tr><th>Pair</th><th>Use</th><th>Scheme</th><th>Ratio</th><th>AA</th><th>AAA</th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table></div>`;
  $("[data-contrast]").innerHTML = table(PAIRS.slice(0, half)) + table(PAIRS.slice(half));
  const fails = PAIRS.filter(([f, b, use]) => !grade(ratio(HEX[f], HEX[b]), use).aa);
  $("[data-csum]").textContent = `${PAIRS.length} pairs, ${PAIRS.length - fails.length} pass AA. The ${fails.length} that fail are never used for text or for meaning.`;
}

/* ------------------------------------------------------------------ motion */
function motion() {
  const E = [
    ["Settle", "--ease-settle", [0.16, 1, 0.3, 1], "Panels, a figure counting up. 220 to 420ms.", 700],
    ["Standard", "--ease-standard", [0.4, 0, 0.2, 1], "Tabs, toggles, hovers. 220ms.", 500],
    ["Play", "--ease-play", [0.34, 1.56, 0.64, 1], "Pills, stickers. Never money.", 700],
    ["Chisel", "--ease-chisel", [0.65, 0, 0.35, 1], "The wordmark's cut, once, 1.1s.", 1100],
  ];
  $("[data-motion]").innerHTML = E.map(([n, v, [a, b, c, d], use, ms]) => {
    const P = (x, y) => `${(x * 100).toFixed(1)},${(100 - y * 80 - 10).toFixed(1)}`;
    return `<div class="bk-ease" style="--e:var(${v});--d:${ms}ms"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M${P(0, 0)} L${P(1, 1)}" stroke="rgba(20,19,17,.15)" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/><path d="M${P(0, 0)} C${P(a, b)} ${P(c, d)} ${P(1, 1)}" stroke="${scheme === "pink" ? C.claret : C.cobalt}" stroke-width="2.5" fill="none" vector-effect="non-scaling-stroke"/></svg><div class="track"><span class="dot"></span></div><b>${n}</b><code>${v}</code><p>${use}</p></div>`;
  }).join("");
}
let motionOn = false;
if (!reduce) {
  setInterval(() => { if (motionOn) for (const b of $$(".bk-ease")) b.classList.toggle("is-run"); }, 1600);
  new IntersectionObserver((es) => { motionOn = es.some((e) => e.isIntersecting); }).observe($("[data-motion]"));
}

/* ------------------------------------------------------------------ applications */
const LAYOUT = ["phone", "hero", "social", "email"];
let appOn = "hero";
const TAB = { phone: "Homepage, phone", hero: "Homepage, desktop", social: "Social post", email: "Email header" };
function apps() {
  const tabs = `<div class="bk-apptabs" role="group" aria-label="Which application">${LAYOUT.map((k) => `<button type="button" data-app-set="${k}" aria-pressed="${k === appOn}">${TAB[k]}</button>`).join("")}</div>`;
  $("[data-apps]").innerHTML = tabs + LAYOUT.map((k, i) => {
    const a = APPS[k];
    return `<figure class="bk-app${k === appOn ? " is-on" : ""}${a.w < 600 ? " is-tall" : ""}" data-app-fig="${k}" style="--ar:${(a.w / a.h).toFixed(4)}"><div class="bk-app-frame" style="aspect-ratio:${a.w}/${a.h}"><div class="app" style="width:${a.w}px;height:${a.h}px" data-app="${k}" aria-hidden="true" inert>${a.render(scheme)}</div></div>
      <figcaption><span class="o-label">${String(i + 1).padStart(2, "0")}</span><b>${a.name}</b><span>${a.note}</span></figcaption></figure>`;
  }).join("");
  for (const b of $$("[data-app-set]")) b.addEventListener("click", () => {
    appOn = b.dataset.appSet;
    for (const t of $$("[data-app-set]")) t.setAttribute("aria-pressed", String(t === b));
    for (const f of $$("[data-app-fig]")) f.classList.toggle("is-on", f.dataset.appFig === appOn);
    fit();
  });
  fit();
}
function fit() {
  for (const el of $$(".bk-app-frame")) {
    const app = el.firstElementChild;
    if (!el.clientWidth) continue;
    app.style.transform = `scale(${el.clientWidth / parseFloat(app.style.width)})`;
  }
  for (const el of $$(".bk-app-frame .app")) paintApp(el, scheme);
}

/* ------------------------------------------------------------------ live pieces from the motion lab */
let stamp = null;
let stampWanted = false;
function mountStampNow() {
  if (!stampWanted) return;
  try { if (stamp) stamp.destroy(); } catch {}
  try { stamp = mountStamp($("[data-stamp]"), { scheme }); } catch { stamp = null; }
}
function fx() {
  const st = $("[data-stamp]");
  const go = () => { if (stampWanted) return; stampWanted = true; mountStampNow(); };
  if (!("IntersectionObserver" in window)) go();
  else { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { go(); io.disconnect(); } }, { rootMargin: "200px" }); io.observe(st); }
}

/* ------------------------------------------------------------------ wiring */
function setScheme(s, first = false) {
  scheme = s;
  document.documentElement.dataset.scheme = s;
  for (const b of $$("[data-scheme-set]")) b.setAttribute("aria-pressed", String(b.dataset.schemeSet === s));
  if (!first) {
    store.set("orbe-brand-scheme", s);
    try { const u = new URL(location.href); u.searchParams.set("scheme", s); history.replaceState(null, "", u); } catch {}
  }
  swatches(); motion(); apps(); paintAll();
  if (!first) mountStampNow();
}
for (const b of $$("[data-scheme-set]")) b.addEventListener("click", () => setScheme(b.dataset.schemeSet));

mountWordmark($("[data-wm]"), { animate: !reduce });
story(); yard(); brush(); contrast(); fx();
setScheme(scheme, true);

let lastW = innerWidth;
new ResizeObserver(() => { fit(); if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; paintAll(); } }).observe(document.body);
document.fonts?.ready.then(() => paintAll());
document.body.dataset.ready = "1";
