import { example, benchmark, BANDS, EXAMPLE_LINE, ORDER, mathsFor } from "../assets/r5/examples.js";
import { SPECS, RATING_NOTICE, ratingNotice } from "../assets/engine/rating/browser.js";
import { mount } from "../assets/fx/word-stickers.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { COLOURS as C } from "../assets/brand/brand.js";

const $ = (s, el = document) => el.querySelector(s);
const root = document.documentElement;
root.classList.add("js");
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}

mountWordmark($("#wm"), { animate: !reduce });
mountWordmark($("#wm2"), { animate: false });

/* ---------- Schemes, from the brand tokens: blue leads, pink is the alternative ---------- */
const PAL = {
  blue: { field: C.sky },
  pink: { field: C.peony },
};
let pal = root.dataset.scheme === "pink" ? "pink" : "blue";
const paletteBtns = document.querySelectorAll(".palette button");
function setPalette(c, save) {
  pal = c;
  root.dataset.scheme = c;
  paletteBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = PAL[c].field;
  if (save) {
    try { localStorage.setItem("orbe-c", c); } catch {}
    try { const u = new URL(location.href); for (const k of ["c", "scheme"]) if (u.searchParams.has(k)) u.searchParams.set(k, c); history.replaceState(null, "", u); } catch {}
  }
  if (stickerHost) stickers();
}
paletteBtns.forEach((b) => b.addEventListener("click", () => setPalette(b.dataset.c, true)));

/* ---------- The example, from the engine: a made-up stream rated Good, strong on reach ---------- */
const KIND = "stream";
const ex = example(KIND);
const spec = SPECS[ex.platform];
const reachPart = ex.result.detail.parts.find((p) => p.key === "reach");
const measured = reachPart.measured;
const sigma = spec.parts.find((p) => p.key === "reach").prior.sigma;
const bm = benchmark(KIND);
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const ownScore = ex.parts.find((p) => p.key === "reach").score;
/* A percentile: never "100 in 100", never "0 in 100". */
const beats = (row) => (row.key === bm.example ? ownScore : Math.max(1, Math.min(99, Math.round(phi(Math.log(measured / row.value) / sigma) * 100))));
const minus = (s) => s.replace("-", "\u2212");
const byKey = Object.fromEntries(bm.rows.map((r) => [r.key, r]));
const first = bm.rows[0], last = bm.rows[bm.rows.length - 1];
const lower = (s) => s.replace(/^Under/, "under").replace(/^Over/, "over");
const work = ex.result.detail.workNoun;               // "stream"
const noun = spec.audienceNoun;                       // "followers"

/* ---------- One piece of work, three yardsticks: the smallest, the biggest, and its own size ---------- */
$("#v-lede").innerHTML = `A typical ${work} from <b>${ex.name}</b> holds <b>${reachPart.raw}</b> of its ${noun} at once. The wrong yardstick gives the wrong verdict.`;
$("#yard-tab").textContent = `One ${work}, three yardsticks`;
$("#yard").setAttribute("aria-label", `One ${work}, against three sizes of ${spec.peers}`);
const yard = [
  { row: first, say: "Looks fine." },
  { row: last, say: "Looks like genius." },
  { row: byKey[bm.example], say: "Ahead of most.", mine: true },
];
$("#yard").innerHTML = yard.map(({ row, say, mine }) => `
  <li class="y${mine ? " mine" : ""}">
    <span class="y-vs">${mine ? `Its own size, ${row.label}` : `Against ${spec.peers} ${lower(row.label)}`}</span>
    <span class="y-say">${say}${mine ? "" : '<span class="sr"> Not a fair comparison.</span>'}</span>
    <span class="y-n"><b>${beats(row)}</b> in 100</span>
  </li>`).join("");

/* ---------- The rating itself ---------- */
$("#rt-num").textContent = minus(ex.signed);
$("#rt-band").textContent = ex.band;
const EDGES = [-3.2, -2, -0.8, 0.8, 2, 3.2];
const posOf = (v) => {
  const x = Math.max(EDGES[0], Math.min(EDGES[5], v));
  for (let i = 0; i < 5; i++) if (x <= EDGES[i + 1]) return (i + (x - EDGES[i]) / (EDGES[i + 1] - EDGES[i])) * 20;
  return 100;
};
$("#scale").innerHTML = BANDS.map((b) => `<span class="c${b === ex.band ? " on" : ""}">${b}</span>`).join("") + `<span class="you" style="--x:${posOf(ex.rating)}%"></span>`;
const maths = mathsFor(KIND);
const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
$("#rt-parts").textContent = `${WORDS[maths.length] ?? maths.length} parts, weighted: ${[...maths].sort((a, b) => b.weight - a.weight).map((m) => `${m.name.toLowerCase()} ${m.weight}%`).join(", ")}. Reach is one of them.`;
$("#rt-foot").textContent = `${ex.name}, ${ex.sizeBand}. ${ratingNotice(ex.platform)} ${EXAMPLE_LINE}`;

$("#notice").textContent = `Every creator and figure on this page is a made-up example, rated live by the Orbe engine. ${RATING_NOTICE} YouTube, Substack and Twitch are trademarks of their owners.`;

/* ---------- Word stickers: creator words to grab and fling, on the hero field ---------- */
const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, serif';
const MONO = '"Commit Mono", ui-monospace, Menlo, monospace';
const stickerHost = $("#stickers");
let stickerFx = null;
function stickers() {
  const pink = pal === "pink";
  const deep = pink ? C.claret : C.cobalt;
  const wide = innerWidth >= 900;
  /* Positions as fractions of the band: a wide, short band on the phone, a taller field on desktop. */
  const at = wide
    ? [[0.2, 0.2], [0.66, 0.16], [0.82, 0.5], [0.3, 0.52], [0.6, 0.82], [0.18, 0.84]]
    : [[0.18, 0.17], [0.34, 0.5], [0.74, 0.2], [0.26, 0.84], [0.74, 0.82], [0.78, 0.5]];
  const defs = [
    { word: "views", font: SANS, weight: 800, style: "normal", base: C.chalk, fill: deep, rot: -8 },
    { word: "your size", font: SERIF, weight: 700, style: "normal", base: deep, fill: C.chalk, rot: 4 },
    { word: "payout", font: MONO, weight: 600, style: "normal", base: C.ember, fill: C.ink, rot: -5 },
    { word: "open rate", font: SERIF, weight: 400, style: "italic", base: C.ink, fill: pink ? C.peony : C.sky, rot: -6 },
    { word: "sponsor", font: SANS, weight: 500, style: "italic", base: pink ? C.sky : C.peony, fill: C.ink, rot: -3 },
    { word: "renewals", font: SERIF, weight: 500, style: "italic", base: C.straw, fill: C.ink, rot: 7 },
  ].map((d, i) => ({ ...d, x: at[i][0], y: at[i][1] }));
  if (stickerFx) stickerFx.destroy();
  stickerFx = mount(stickerHost, { stickers: defs });
}

let ow = innerWidth;
addEventListener("resize", () => { if ((ow < 900) !== (innerWidth < 900)) { ow = innerWidth; stickers(); } });
setPalette(pal, false);

/* ---------- Motion: the two wrong verdicts are struck once the list is read. Reduced motion: already struck. ---------- */
const yardEl = $("#yard");
if (reduce || !("IntersectionObserver" in window)) {
  yardEl.classList.add("struck");
  root.classList.add("ready");
} else {
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { setTimeout(() => yardEl.classList.add("struck"), 350); io.disconnect(); }
  }, { threshold: 0.6 });
  io.observe(yardEl);
}

/* ---------- Reserve: the handle, lower-cased, and the kind of work it is for ---------- */
const KIND_WORD = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "podcast", portfolio: "photography portfolio" };
document.querySelectorAll("[data-reserve]").forEach((form) => {
  const note = $(".r-note", form);
  const input = $("input", form);
  const sel = $("select", form);
  sel.innerHTML = ORDER.map((k) => `<option value="${k}">${KIND_WORD[k] ?? k}</option>`).join("");
  input.addEventListener("input", () => { const p = input.selectionStart; input.value = input.value.toLowerCase(); try { input.setSelectionRange(p, p); } catch {} });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = cleanHandle(input.value).toLowerCase();
    if (!h) { note.innerHTML = "<b>Type the handle you want.</b> Letters, numbers, dots and dashes."; input.focus(); return; }
    const kind = KIND_WORD[sel.value] ?? "channel";
    const res = await reserve({ handle: h, kind });
    if (res.ok && res.via === "api") note.innerHTML = `<b>@${h} is held for you.</b> We'll check it's yours when ratings open.`;
    else if (res.ok) note.innerHTML = `<b>Your email app has the request for @${h}.</b> Send it and the handle is held. We'll check it's yours when ratings open.`;
    else if (res.reason === "taken") note.innerHTML = `<b>@${h} is taken.</b> Try another.`;
  });
});
