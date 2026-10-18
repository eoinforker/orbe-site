import { example, benchmark, BANDS, EXAMPLE_LINE, ORDER, MODEL_VERSION } from "../assets/r5/examples.js";
import { SPECS, RATING_NOTICE } from "../assets/engine/rating/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { bars, COLOURS as C } from "../assets/brand/brand.js";

const $ = (s, el = document) => el.querySelector(s);
const root = document.documentElement;
root.classList.add("js");
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}

mountWordmark($("#wm"), { animate: !reduce });
mountWordmark($("#wm2"), { animate: false });

/* ---------- Schemes, from the brand tokens: blue leads, pink is the alternative ---------- */
const PAL = {
  blue: { field: C.sky, orb: [31, 75, 255], bars: [C.ember, C.cobalt] },
  pink: { field: C.peony, orb: [251, 250, 246], bars: [C.ember, C.claret] },
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
  drawBars();
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
const rows = bm.rows.map((row) => {
  const mine = row.key === bm.example;
  return { ...row, mine, beats: mine ? ownScore : Math.round(phi(Math.log(measured / row.value) / sigma) * 100) };
});
const pct = (v) => `${Math.round(v * 1000) / 10}%`.replace(".0%", "%");
const sizeOf = (row) => (row.key === "seed" ? "Under 10k" : row.key === "top" ? "Over 5M" : row.label);
const SAYS = { seed: "Looks behind.", rise: "Looks fine.", low: "Looks good.", high: "Looks great.", top: "Looks like genius. It isn’t." };
const minus = (s) => s.replace("-", "−");
const own = rows.find((x) => x.mine);

/* ---------- Hero window: the engine at work on the example ---------- */
$("#dg-ver").textContent = `model ${MODEL_VERSION}`;
const dgLine = $("#dg-line"), dgBar = $("#dg-bar"), dgOut = $("#dg-out");
const dgSteps = [
  `Reading ${ex.handle}`,
  `Reach ${reachPart.raw} of subscribers`,
  `Against ${ex.peers} ${own.label}`,
  `Typical for that size: ${pct(own.value)}`,
];
function dgEnd() {
  dgLine.textContent = `${ex.name} against ${ex.peers} ${own.label}`;
  dgBar.style.width = "100%";
  dgOut.innerHTML = `<b>${minus(ex.signed)}</b><span>${ex.band}</span>`;
}

/* ---------- The upload: one small painting, the same in every window (a made-up creator's frame) ---------- */
const UPLOAD = `<svg viewBox="0 0 44 33" aria-hidden="true"><rect width="44" height="33" fill="#D6F6FD"/><circle cx="31" cy="10" r="5" fill="#FF5A1F"/><path d="M0 19 C8 13 14 14 21 18 S35 14 44 17 V33 H0Z" fill="#4D9AD0"/><path d="M0 23 C10 19 20 21 28 23 S40 21 44 22 V33 H0Z" fill="#8E9A4A"/><path d="M0 28 C12 26 26 27 44 26 V33 H0Z" fill="#262B12"/><path d="M6 27 l1.5 -5 M9 27 l-1 -4 M36 26 l1 -5 M39 26 l-1.2 -3.5" stroke="#EED56A" stroke-width="1.2" stroke-linecap="round"/></svg>`;

/* ---------- The signature: one upload, six sizes, six verdicts ---------- */
$("#v-lede").innerHTML = `A typical upload from <b>${ex.name}</b> reaches <b>${reachPart.raw}</b> of its subscribers. Hold it against every size of channel and the verdict changes six times.`;

const order = [...rows.filter((x) => !x.mine), own];
const stack = $("#stack");
stack.innerHTML = order.map((row, i) => row.mine ? `
  <article class="ow vw mine" style="--i:${i}" aria-label="Against ${ex.peers} ${row.label}, its own size">
    <span class="ow-tab">Its own size: ${row.label}</span>
    <div class="vw-row"><span class="thumb">${UPLOAD}</span><span class="vw-txt"><span class="vw-say">The one Orbe rates.</span><span class="vw-typ">Typical here ${pct(row.value)}</span></span><span class="vw-n" aria-label="beats ${row.beats} in 100"><b>${row.beats}</b><span class="vw-in" aria-hidden="true">in 100</span></span></div>
    <div class="rt">
      <div class="rt-top">
        <p class="rt-num num" id="rt-num" aria-label="Rating ${ex.signed}"></p>
        <p class="rt-band"><span class="k">Rating</span>${ex.band}</p>
      </div>
      <p class="rt-who"><b>${ex.name}</b> <span>${ex.label}, ${ex.sizeBand}</span></p>
      <div class="scale" id="scale" aria-hidden="true"></div>
      <ul class="parts">${ex.parts.map((p) => `<li><span class="p-n">${p.name}</span><span class="p-v">${p.value}</span><span class="p-b"><i style="--w:${p.score}%"></i></span><span class="p-s">${p.score}</span></li>`).join("")}</ul>
      <p class="rt-foot">Independently calculated by Orbe.<br><span>${EXAMPLE_LINE}</span></p>
    </div>
  </article>` : `
  <article class="ow vw" style="--i:${i}" aria-label="Against ${ex.peers} ${sizeOf(row)}: beats ${row.beats} in 100. ${SAYS[row.key]}">
    <span class="ow-tab" aria-hidden="true">vs ${sizeOf(row)}</span>
    <div class="vw-row" aria-hidden="true"><span class="thumb">${UPLOAD}</span><span class="vw-txt"><span class="vw-say">${SAYS[row.key]}</span><span class="vw-typ">Typical here ${pct(row.value)}</span></span><span class="vw-n"><b>${row.beats}</b><span class="vw-in">in 100</span></span></div>
  </article>`).join("");
const wins = [...stack.children];

/* The rating, digit by digit, so it can roll in once. Figures settle; they never bounce. */
const num = $("#rt-num");
const digits = [];
for (const ch of ex.signed) {
  if (/\d/.test(ch)) {
    const d = document.createElement("span");
    d.className = "d";
    d.setAttribute("aria-hidden", "true");
    const col = document.createElement("span");
    col.innerHTML = "0123456789".split("").map((n) => `<span>${n}</span>`).join("");
    d.appendChild(col);
    num.appendChild(d);
    digits.push({ col, to: +ch });
  } else {
    const s = document.createElement("span");
    s.setAttribute("aria-hidden", "true");
    if (ch === ".") s.className = "p";
    s.textContent = ch === "-" ? "−" : ch;
    num.appendChild(s);
  }
}
const setDigits = (anim) => digits.forEach(({ col, to }, i) => {
  if (anim) col.style.transition = `transform 1.1s cubic-bezier(0.16,1,0.3,1) ${0.15 + (digits.length - i) * 0.06}s`;
  col.style.transform = `translateY(${-to}em)`;
});

const EDGES = [-3.2, -2, -0.8, 0.8, 2, 3.2];
const posOf = (v) => {
  const x = Math.max(EDGES[0], Math.min(EDGES[5], v));
  for (let i = 0; i < 5; i++) if (x <= EDGES[i + 1]) return (i + (x - EDGES[i]) / (EDGES[i + 1] - EDGES[i])) * 20;
  return 100;
};
$("#scale").innerHTML = BANDS.map((b) => `<span class="c${b === ex.band ? " on" : ""}">${b}</span>`).join("") + `<span class="you" style="--x:${posOf(ex.rating)}%"></span>`;

/* ---------- The line worth posting: the rating, said the way a creator would say it ---------- */
$("#quote").innerHTML = `My last upload had better reach than <em>${ownScore} in 100</em> ${ex.peers} my size.`;
$("#quote-cap").innerHTML = `<b>${ex.name}</b>, ${minus(ex.signed)} <i>${ex.band}</i> against ${ex.peers} with ${ex.sizeBand}. Zero is typical for creators your size. Independently calculated by Orbe. ${EXAMPLE_LINE}`;

$("#notice").textContent = `Every creator and figure on this page is a made-up example, rated live by the Orbe engine. ${RATING_NOTICE} YouTube, Substack and Twitch are trademarks of their owners.`;

/* ---------- The working, down the desktop margin ---------- */
$("#vert").textContent = [
  "orbe.rating", ex.label.toLowerCase(), ex.sizeBand, `reach ${measured.toFixed(4)}`, `typical ${reachPart.prior.median.toFixed(2)}`,
  `sigma ${sigma.toFixed(2)}`, `z ${reachPart.z.toFixed(4)}`, `beats ${ownScore} in 100`, `rating ${ex.signed}`, `model ${MODEL_VERSION}`,
].join("  /  ");

/* ---------- The orb: an 8x8 Bayer dither behind the headline, one per view ---------- */
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
function orb(cv) {
  const w = cv.clientWidth; if (!w) return;
  const cell = w > 500 ? 4 : 3;
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

/* ---------- The close: two fat bars crossing behind the form, clear of the headline ---------- */
function drawBars() {
  const host = $("#bars");
  const wide = innerWidth >= 900;
  const [a, b] = PAL[pal].bars;
  const lines = wide
    ? [[0.5, 1.04, 1.06, 0.3, a], [0.3, 0.86, 1.08, 1.1, b]]
    : [[-0.15, 1.0, 1.15, 0.66, a], [0.35, 1.08, 1.2, 0.86, b]];
  host.innerHTML = bars({ w: wide ? 1440 : 390, h: wide ? 900 : 1000, lines, weight: wide ? 0.07 : 0.11 }).replace("<svg ", '<svg preserveAspectRatio="none" ');
}

const orbs = document.querySelectorAll(".orb");
let ow = innerWidth;
addEventListener("resize", () => { if (Math.abs(innerWidth - ow) > 40) { ow = innerWidth; orbs.forEach(orb); drawBars(); } });
setPalette(pal, false);

/* ---------- Motion, or its end state ---------- */
function fillRating(anim) { setDigits(anim); root.classList.add("rated"); }
function playStack() {
  wins.forEach((w, i) => setTimeout(() => {
    w.classList.add("in");
    if (w.classList.contains("mine")) { fillRating(true); setTimeout(() => stack.classList.add("struck"), 700); }
  }, 120 + i * (i === wins.length - 1 ? 560 : 420)));
}
function playDialog() {
  let k = 0;
  const step = () => {
    if (k < dgSteps.length) { dgLine.textContent = dgSteps[k]; dgBar.style.width = `${((k + 1) / (dgSteps.length + 1)) * 100}%`; k++; setTimeout(step, 360); }
    else dgEnd();
  };
  step();
}

if (reduce) {
  wins.forEach((w) => w.classList.add("in"));
  stack.classList.add("struck");
  fillRating(false);
  dgEnd();
  root.classList.add("ready");
} else {
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      if (e.target === stack) playStack();
      if (e.target.id === "dialog") playDialog();
      io.unobserve(e.target);
    }
  }, { threshold: 0.2 });
  io.observe(stack);
  io.observe($("#dialog"));
}

/* ---------- Reserve, top and bottom: the handle, lower-cased, and the kind of work it is for ---------- */
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
