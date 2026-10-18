import { example, benchmark, BANDS, EXAMPLE_LINE, ORDER, MATHS } from "../assets/r5/examples.js";
import { SPECS, RATING_NOTICE } from "../assets/engine/rating/browser.js";
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
  blue: { field: C.sky, orb: [31, 75, 255] },
  pink: { field: C.peony, orb: [251, 250, 246] },
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
  orbs.forEach(orb);
}
paletteBtns.forEach((b) => b.addEventListener("click", () => setPalette(b.dataset.c, true)));

/* ---------- The example, from the engine ---------- */
const ex = example("channel");
const spec = SPECS[ex.platform];
const reachPart = ex.result.detail.parts.find((p) => p.key === "reach");
const measured = reachPart.measured;
const sigma = spec.parts.find((p) => p.key === "reach").prior.sigma;
const bm = benchmark("channel");
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const ownScore = ex.parts.find((p) => p.key === "reach").score;
const beats = (row) => (row.key === bm.example ? ownScore : Math.round(phi(Math.log(measured / row.value) / sigma) * 100));
const minus = (s) => s.replace("-", "−");
const byKey = Object.fromEntries(bm.rows.map((r) => [r.key, r]));
const sizeOf = (row) => (row.key === "seed" ? "under 10k" : row.key === "top" ? "over 5M" : row.label);

/* ---------- One upload, three yardsticks: the smallest, the biggest, and its own size ---------- */
$("#v-lede").innerHTML = `A typical upload from <b>${ex.name}</b> reaches <b>${reachPart.raw}</b> of its subscribers. The wrong yardstick gives the wrong verdict.`;

const yard = [
  { row: byKey.seed, say: "Looks behind." },
  { row: byKey.top, say: "Looks like genius." },
  { row: byKey[bm.example], say: "Ahead on reach.", mine: true },
];
$("#yard").innerHTML = yard.map(({ row, say, mine }) => `
  <li class="y${mine ? " mine" : ""}">
    <span class="y-vs">${mine ? `Its own size, ${row.label}` : `Against channels ${sizeOf(row)}`}</span>
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
$("#rt-parts").textContent = `Five parts, weighted: ${MATHS.map((m) => `${m.name.toLowerCase()} ${m.weight}%`).join(", ")}.`;
$("#rt-foot").textContent = `${ex.name}, ${ex.sizeBand}. Independently calculated by Orbe. ${EXAMPLE_LINE}`;

$("#notice").textContent = `Every creator and figure on this page is a made-up example, rated live by the Orbe engine. ${RATING_NOTICE} YouTube, Substack and Twitch are trademarks of their owners.`;

/* ---------- The orb: an 8x8 Bayer dither, beside the headline ---------- */
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
function orb(cv) {
  const w = cv.clientWidth; if (!w) return;
  const cell = w > 400 ? 4 : 3;
  const n = Math.floor(w / cell);
  cv.width = n; cv.height = n;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(n, n);
  const L = [-0.55, -0.62, 0.56]; const ll = Math.hypot(...L); L.forEach((v, i) => (L[i] = v / ll));
  const col = PAL[pal].orb;
  const rr = n / 2 - 1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5 - n / 2) / rr, dy = (y + 0.5 - n / 2) / rr, d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const lit = Math.max(0, dx * L[0] + dy * L[1] + Math.sqrt(1 - d2) * L[2]);
    const ink = Math.min(0.92, 0.03 + 0.95 * Math.pow(lit, 1.5));
    if (ink * 64 > BAYER[(y % 8) * 8 + (x % 8)] + 0.5) { const k = (y * n + x) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}
const orbs = document.querySelectorAll(".orb");
let ow = innerWidth;
addEventListener("resize", () => { if (Math.abs(innerWidth - ow) > 40) { ow = innerWidth; orbs.forEach(orb); } });
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
