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

/* ---------- The example, from the engine: a made-up YouTube channel, because ratings open with YouTube ---------- */
const KIND = "channel";
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
const minus = (s) => s.replace("-", "−");
const byKey = Object.fromEntries(bm.rows.map((r) => [r.key, r]));
const first = bm.rows[0], last = bm.rows[bm.rows.length - 1];
const lower = (s) => s.replace(/^Under/, "under").replace(/^Over/, "over");
const work = ex.result.detail.workNoun;               // "upload"
const noun = spec.audienceNoun;                       // "subscribers"
const own = byKey[bm.example];
const independent = (ratingNotice(ex.platform).match(/^[^.]+\./) || [""])[0];

/* ---------- The first phone screen carries a real figure ---------- */
$("#fig").innerHTML = `<span class="fig-n">${minus(ex.signed)}</span><span class="fig-t"><i>${ex.band}.</i> ${ex.name}, against ${spec.peers} ${lower(own.label)}. A made-up example. ${independent}</span>`;
$("#fig").setAttribute("aria-label", `${minus(ex.signed)}, ${ex.band}. ${ex.name}, against ${spec.peers} ${lower(own.label)}. A made-up example. ${independent} See why.`);

/* ---------- One piece of work, three yardsticks: the smallest, the biggest, and its own size ---------- */
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
$("#v-lede").innerHTML = `A typical ${work} from <b>${ex.name}</b> reaches <b>${reachPart.raw}</b> of its ${noun}. The wrong yardstick gives the wrong verdict.`;
$("#yard-tab").textContent = `One ${ex.word}, three yardsticks`;
$("#yard").setAttribute("aria-label", `One ${ex.word}, against three sizes of ${spec.peers}`);
const yard = [
  { row: first },
  { row: last },
  { row: own, mine: true },
];
$("#yard").innerHTML = yard.map(({ row, mine }) => `
  <li class="y${mine ? " mine" : ""}">
    <span class="y-vs">${mine ? `Its own size, ${row.label}` : `Against ${spec.peers} ${lower(row.label)}`}</span>
    <span class="y-say"><span class="y-w">${say(beats(row), mine)}</span>${mine ? "" : '<span class="sr"> Not a fair comparison.</span>'}</span>
    <span class="y-n"><b>${beats(row)}</b> in 100</span>
  </li>`).join("");

/* Why both wrong verdicts are wrong: the small ones flatter, the giants flatter even more, and neither is the creator's size. */
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
const vSmall = VERDICT[say(beats(first))], vBig = VERDICT[say(beats(last))];
$("#v-why").innerHTML = `Against small ${spec.peers}, ${vSmall}. Against the giants, ${vBig}. <b>Neither is&nbsp;fair.</b>`;

/* ---------- The rating itself ---------- */
$("#rt-num").textContent = minus(ex.signed);
$("#rt-band").textContent = ex.band;
const EDGES = [-3.2, -2, -0.8, 0.8, 2, 3.2];
const posOf = (v) => {
  const x = Math.max(EDGES[0], Math.min(EDGES[5], v));
  for (let i = 0; i < 5; i++) if (x <= EDGES[i + 1]) return (i + (x - EDGES[i]) / (EDGES[i + 1] - EDGES[i])) * 20;
  return 100;
};
$("#scale").innerHTML = BANDS.map((b) => `<span class="c${b === ex.band ? " on" : ""}">${b}</span>`).join("") + `<span class="you"></span>`;
const scaleEl = $("#scale");
scaleEl.style.setProperty("--x", `${posOf(ex.rating)}%`);
scaleEl.style.setProperty("--x0", `${posOf(0)}%`);
const maths = mathsFor(KIND);
const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
$("#rt-parts").textContent = `${WORDS[maths.length] ?? maths.length} parts, weighted: ${[...maths].sort((a, b) => b.weight - a.weight).map((m) => `${m.name.toLowerCase()} ${m.weight}%`).join(", ")}. Reach is one of them.`;
$("#rt-foot").textContent = `${ex.name}, ${ex.sizeBand}. ${ratingNotice(ex.platform)} ${EXAMPLE_LINE}`;

/* ---------- For buyers: every made-up example, led by its size band, rated live ---------- */
$("#roll").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  return `<li><span class="rl-s">${span}<small>${unit}</small></span><span class="rl-n">${x.name}<small>${x.label}</small></span><b class="rl-r">${minus(x.signed)}</b><span class="rl-b">${x.band}</span></li>`;
}).join("");

$("#notice").textContent = `Every creator and figure on this page is a made-up example, rated live by the Orbe engine. ${RATING_NOTICE} YouTube, Substack and Twitch are trademarks of their owners.`;

/*
  ---------- The wrong yardsticks, as stickers ----------
  Five wrong yardsticks and the fair one. Fling (or, on a touch screen, tap) the wrong ones
  away; "your size" is pinned and stays. On touch the stickers take no drags at all, so a
  thumb on the band scrolls the page as usual.
*/
const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, serif';
const MONO = '"Commit Mono", ui-monospace, Menlo, monospace';
const FAIR = "your size";
const stickerHost = $("#stickers");
const cap = $("#y-cap");
let touch = false;
try { touch = matchMedia("(hover: none), (pointer: coarse)").matches; } catch {}
stickerHost.classList.toggle("tap", touch);
const gone = new Set();
let stickerFx = null;
let defs = [];
const els = () => [...stickerHost.querySelectorAll("canvas")];

function caption() {
  const left = defs.filter((d) => d.word !== FAIR && !gone.has(d.word)).length;
  if (left === 0) {
    cap.innerHTML = `<b>Only your size is left.</b> It&rsquo;s the one yardstick Orbe rates you against. <button type="button" class="y-again">Put them back</button>`;
    stickerHost.classList.add("won");
    /* The fair one comes to the middle of the emptied band, so it never grows past the edge. */
    const f = stickerHost.querySelector("canvas.fair");
    if (f) {
      const h = stickerHost.getBoundingClientRect(), r = f.getBoundingClientRect();
      f.style.setProperty("--fx", `${Math.round(h.left + h.width / 2 - (r.left + r.width / 2))}px`);
      f.style.setProperty("--fy", `${Math.round(h.top + h.height / 2 - (r.top + r.height / 2))}px`);
    }
  } else {
    const verb = touch ? "Tap" : "Fling";
    cap.innerHTML = `<b>The wrong yardsticks.</b> ${verb} them away.${gone.size ? ` ${WORDS[left] ?? left} to go.` : ""}`;
    stickerHost.classList.remove("won");
  }
}
cap.addEventListener("click", (e) => {
  if (!e.target.closest(".y-again")) return;
  gone.clear();
  stickers();
  caption();
});

function stickers() {
  const pink = pal === "pink";
  const deep = pink ? C.claret : C.cobalt;
  const wide = innerWidth >= 900;
  /* Positions as fractions of the band. On the phone the fair one shares the first row with "the top 1%", so the answer is on the first screen; on desktop it sits in the middle of a looser field. */
  const at = wide
    ? { "the top 1%": [0.26, 0.15], viral: [0.84, 0.18], [FAIR]: [0.34, 0.5], followers: [0.85, 0.5], "the charts": [0.18, 0.85], "vanity views": [0.7, 0.86] }
    : { "the top 1%": [0.27, 0.15], [FAIR]: [0.76, 0.17], viral: [0.24, 0.5], followers: [0.72, 0.52], "the charts": [0.5, 0.85] };
  const all = [
    { word: "the top 1%", font: SANS, weight: 800, style: "normal", base: C.chalk, fill: deep, rot: -7 },
    { word: "viral", font: MONO, weight: 600, style: "normal", base: C.ember, fill: C.ink, rot: 6 },
    { word: FAIR, font: SERIF, weight: 700, style: "normal", base: deep, fill: C.chalk, rot: -2 },
    { word: "the charts", font: SERIF, weight: 500, style: "italic", base: C.straw, fill: C.ink, rot: 5 },
    { word: "followers", font: SANS, weight: 500, style: "italic", base: pink ? C.sky : C.peony, fill: C.ink, rot: -4 },
    { word: "vanity views", font: SANS, weight: 800, style: "normal", base: C.ink, fill: pink ? C.peony : C.sky, rot: 3 },
  ];
  /* The phone band is narrow, so it carries four wrong yardsticks, not five. */
  defs = all.filter((d) => at[d.word] && !gone.has(d.word)).map((d) => ({ ...d, x: at[d.word][0], y: at[d.word][1] }));
  if (stickerFx) stickerFx.destroy();
  stickerFx = mount(stickerHost, { stickers: defs });
  els().forEach((c, i) => {
    c.dataset.word = defs[i].word;
    if (defs[i].word === FAIR) c.classList.add("fair");
  });
  caption();
}

/* A wrong yardstick leaves: it flies off and fades, and is not drawn again. */
function away(c, dir = 1) {
  const w = c.dataset.word;
  if (!w || w === FAIR || gone.has(w)) return;
  gone.add(w);
  c.classList.add("away");
  c.style.setProperty("--dx", `${dir * 60}px`);
  c.style.setProperty("--dr", `${dir * 24}deg`);
  caption();
}

/* Desktop and mouse: a real fling (a drag of some distance) sends it away; a click only wobbles. */
let grab = null;
stickerHost.addEventListener("pointerdown", (e) => {
  const c = e.target.closest("canvas");
  if (!c || touch) return;
  grab = { c, x: e.clientX, y: e.clientY, dx: 0, d: 0 };
});
stickerHost.addEventListener("pointermove", (e) => {
  if (!grab) return;
  grab.dx = e.clientX - grab.x;
  grab.d = Math.max(grab.d, Math.hypot(grab.dx, e.clientY - grab.y));
});
const release = () => {
  if (!grab) return;
  const g = grab; grab = null;
  if (g.d > 40) setTimeout(() => away(g.c, g.dx < 0 ? -1 : 1), reduce ? 0 : 260);
};
stickerHost.addEventListener("pointerup", release);
stickerHost.addEventListener("pointercancel", release);

/* Touch: tap only. The nearest wrong yardstick under the finger flicks away. */
stickerHost.addEventListener("click", (e) => {
  if (!touch) return;
  let best = null, bd = Infinity;
  for (const c of els()) {
    if (c.classList.contains("away") || c.classList.contains("fair")) continue;
    const r = c.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
    const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (d < bd) { bd = d; best = c; }
  }
  if (best) { const r = best.getBoundingClientRect(); away(best, e.clientX < r.left + r.width / 2 ? 1 : -1); }
});

let ow = innerWidth;
addEventListener("resize", () => { if ((ow < 900) !== (innerWidth < 900)) { ow = innerWidth; stickers(); } });
setPalette(pal, false);

/*
  ---------- The one gesture on paper: as the window comes into view, each wrong verdict is
  struck through in turn, then the rating counts up from zero (typical) to its own figure in
  about 600ms while the marker slides along the scale. The band is named, and set bold on the
  scale, only when the count lands, so the figure and the band never disagree.
  Reduced motion: already struck, already counted.
  ----------
*/
const yardEl = $("#yard");
const numEl = $("#rt-num");
function countIn() {
  const to = ex.rating, t0 = performance.now(), dur = 600;
  const tick = (now) => {
    const k = Math.min(1, Math.max(0, (now - t0) / dur));
    const e = 1 - Math.pow(1 - k, 3);
    numEl.textContent = k < 1 ? minus((to * e >= 0 ? "+" : "-") + Math.abs(to * e).toFixed(2)) : minus(ex.signed);
    if (k < 1) requestAnimationFrame(tick);
    else root.classList.add("landed");
  };
  requestAnimationFrame(tick);
}
if (reduce || !("IntersectionObserver" in window)) {
  yardEl.classList.add("struck");
  root.classList.add("ready", "counted", "landed");
} else {
  root.classList.add("pre");
  numEl.textContent = minus("+0.00");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    setTimeout(() => yardEl.classList.add("struck"), 150);
    setTimeout(() => { root.classList.add("counted"); countIn(); }, 800);
  }, { threshold: 0.55 });
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
    if (h) input.value = h;
    if (!h) { note.innerHTML = "<b>Type the handle you want.</b> Letters, numbers, dots and dashes."; input.focus(); return; }
    const kind = KIND_WORD[sel.value] ?? "channel";
    const res = await reserve({ handle: h, kind });
    if (res.ok && res.via === "api") note.innerHTML = `<b>@${h} is held for you.</b> We'll check it's yours when ratings open.`;
    else if (res.ok) note.innerHTML = `<b>Your email app has the request for @${h}.</b> Send it and the handle is held. We'll check it's yours when ratings open.`;
    else if (res.reason === "taken") note.innerHTML = `<b>@${h} is taken.</b> Try another.`;
  });
});
