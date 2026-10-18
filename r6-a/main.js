import { example, benchmark, BANDS, EXAMPLE_LINE, CARD_EXAMPLE_LINE, MODEL_VERSION } from "../assets/r5/examples.js";
import { SPECS } from "../assets/engine/rating/browser.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { renderCard } from "../assets/r5/card.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s, el = document) => el.querySelector(s);
const root = document.documentElement;
root.classList.add("js");
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}

mountWordmark($("#wm"), { animate: true });
mountWordmark($("#wm2"), { animate: false });

/* ---------- Palettes: the founder's choice. Blue (fal) or Pink (TypeSafe). ---------- */
const PAL = {
  pink: { field: "#F2879E", orb: [251, 248, 242] },
  blue: { field: "#9EE9FB", orb: [31, 75, 255] },
};
let pal = root.dataset.c === "blue" ? "blue" : "pink";
const paletteBtns = document.querySelectorAll(".palette button");
function setPalette(c, save) {
  pal = c;
  root.dataset.c = c;
  paletteBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = PAL[c].field;
  if (save) {
    try { localStorage.setItem("orbe-c", c); } catch {}
    try { const u = new URL(location.href); if (u.searchParams.has("c")) { u.searchParams.set("c", c); history.replaceState(null, "", u); } } catch {}
  }
  orbs.forEach(orb);
  drawCard();
}
paletteBtns.forEach((b) => b.addEventListener("click", () => setPalette(b.dataset.c, true)));

/* ---------- The example, from the engine ---------- */
const ex = example("channel");
const r = ex.result;
const spec = SPECS[ex.platform];
const reachPart = r.detail.parts.find((p) => p.key === "reach");
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
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const SAYS = { seed: "Looks behind.", rise: "Looks fine.", low: "Looks good.", high: "Looks great.", top: "Looks like genius. It isn’t." };
const minus = (s) => s.replace("-", "−");

/* ---------- Hero dialog: the engine at work on the example ---------- */
$("#dg-title").textContent = `Orbe.engine`;
$("#dg-ver").textContent = MODEL_VERSION;
const dgLine = $("#dg-line"), dgBar = $("#dg-bar"), dgOut = $("#dg-out");
const own = rows.find((x) => x.mine);
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

/* ---------- The signature: one upload, six sizes, six verdicts ---------- */
$("#v-lede").innerHTML = `A typical upload from <b>${ex.name}</b> reaches <b>${reachPart.raw}</b> of its subscribers. Hold it against every size of channel and the verdict changes six times.`;

const order = [...rows.filter((x) => !x.mine), own];
const stack = $("#stack");
stack.innerHTML = order.map((row, i) => row.mine ? `
  <article class="vw mine" style="--i:${i}" aria-label="Against ${ex.peers} ${row.label}, its own size">
    <div class="win-bar vw-bar"><span>Upload.vs_${slug(row.label)}</span><span>Its own size</span></div>
    <div class="vw-row"><canvas class="thumb" aria-hidden="true"></canvas><span class="vw-txt"><span class="vw-vs mono">vs ${row.label}, typical ${pct(row.value)}</span><span class="vw-say">The one Orbe rates.</span></span><span class="vw-n" aria-label="beats ${row.beats} in 100">${row.beats}</span></div>
    <div class="rt">
      <div class="rt-top">
        <p class="rt-num num" id="rt-num" aria-label="Rating ${ex.signed}"></p>
        <p class="rt-band"><span class="mono">Rating</span>${ex.band}</p>
      </div>
      <p class="rt-who"><b>${ex.name}</b> <span class="mono">${ex.label}, ${ex.sizeBand}</span></p>
      <div class="scale" id="scale" aria-hidden="true"></div>
      <ul class="parts">${ex.parts.map((p) => `<li><span class="p-n">${p.name}</span><span class="p-v mono">${p.value}</span><span class="p-b"><i style="--w:${p.score}%"></i></span><span class="p-s">${p.score}</span></li>`).join("")}</ul>
      <p class="rt-foot mono">Independently calculated by Orbe.<br><span>${EXAMPLE_LINE}</span></p>
    </div>
  </article>` : `
  <article class="vw" style="--i:${i}" aria-label="Against ${ex.peers} ${sizeOf(row)}: beats ${row.beats} in 100. ${SAYS[row.key]}">
    <div class="vw-row"><canvas class="thumb" aria-hidden="true"></canvas><span class="vw-txt"><span class="vw-vs mono">vs ${sizeOf(row)}, typical ${pct(row.value)}</span><span class="vw-say">${SAYS[row.key]}</span></span><span class="vw-n" aria-hidden="true">${row.beats}</span></div>
  </article>`).join("");
const wins = [...stack.children];

/* The rating, digit by digit, so it can roll in. */
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
  if (anim) col.style.transition = `transform 1s cubic-bezier(0.16,1,0.3,1) ${0.15 + (digits.length - i) * 0.06}s`;
  col.style.transform = `translateY(${-to}em)`;
});

const EDGES = [-3.2, -2, -0.8, 0.8, 2, 3.2];
const posOf = (v) => {
  const x = Math.max(EDGES[0], Math.min(EDGES[5], v));
  for (let i = 0; i < 5; i++) if (x <= EDGES[i + 1]) return (i + (x - EDGES[i]) / (EDGES[i + 1] - EDGES[i])) * 20;
  return 100;
};
const scale = $("#scale");
scale.innerHTML = BANDS.map((b) => `<span class="c${b === ex.band ? " on" : ""}">${b}</span>`).join("") + `<span class="you" style="--x:${posOf(ex.rating)}%"></span>`;

/* ---------- The card, drawn by the product's own code ---------- */
$("#cd-title").textContent = `Card ${ex.handle}`;
function drawCard() {
  const c = ex.card;
  const svg = renderCard(ex.result, {
    moment: "rating", format: "square", theme: `ink-${pal}`, handle: ex.handle, name: ex.name, note: CARD_EXAMPLE_LINE, idPrefix: "r6a",
    works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image,
  });
  $("#cd-svg").innerHTML = svg;
  const el = $("#cd-svg svg");
  if (el) { el.removeAttribute("width"); el.removeAttribute("height"); el.setAttribute("aria-hidden", "true"); }
}

/* ---------- The working, down the desktop margin ---------- */
$("#vert").textContent = [
  "orbe.rating", ex.label.toLowerCase(), ex.sizeBand, `reach ${measured.toFixed(4)}`, `typical ${reachPart.prior.median.toFixed(2)}`,
  `sigma ${sigma.toFixed(2)}`, `z ${reachPart.z.toFixed(4)}`, `beats ${ownScore} in 100`, `rating ${ex.signed}`, `model ${MODEL_VERSION}`,
].join("  /  ");

/* ---------- Dither: an 8x8 Bayer orb (the hero) and the one upload's thumbnail, repeated ---------- */
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
function orb(cv) {
  const w = cv.clientWidth; if (!w) return;
  const cell = w > 500 ? 4 : 3;
  const n = Math.floor(w / cell);
  cv.width = n; cv.height = n;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(n, n);
  const L = [-0.55, -0.62, 0.56]; const ll = Math.hypot(...L); L.forEach((v, i) => (L[i] = v / ll));
  const C = PAL[pal].orb;
  const rr = n / 2 - 1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5 - n / 2) / rr, dy = (y + 0.5 - n / 2) / rr, d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const lit = Math.max(0, dx * L[0] + dy * L[1] + Math.sqrt(1 - d2) * L[2]);
    const ink = Math.min(0.92, 0.03 + 0.95 * Math.pow(lit, 1.5));
    if (ink * 64 > BAYER[(y % 8) * 8 + (x % 8)] + 0.5) { const k = (y * n + x) * 4; img.data[k] = C[0]; img.data[k + 1] = C[1]; img.data[k + 2] = C[2]; img.data[k + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}
/* The upload: a dithered landscape frame (sun, hills, water), the same pixels in every window. */
function thumb() {
  const W = 24, H = 18;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d"); const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sun = Math.hypot(x - 16.5, y - 5.5) < 3.4 ? 0.05 : 1;
    const hill = y > 9 + 2.6 * Math.sin(x / 3.4) ? 0.82 : 0;
    const water = y > 14 ? 0.5 + 0.25 * ((x + y) % 3 === 0) : 0;
    const sky = 0.12 + (y / H) * 0.22;
    const v = Math.min(1, Math.max(water || hill || sky, 0)) * sun;
    const on = v * 64 > BAYER[(y % 8) * 8 + (x % 8)] + 0.5;
    const k = (y * W + x) * 4; const g = on ? 18 : 250; img.data[k] = g; img.data[k + 1] = g + (on ? 2 : -2); img.data[k + 2] = g + (on ? 0 : -8); img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
const T = thumb();
document.querySelectorAll(".thumb").forEach((cv) => { cv.width = T.width; cv.height = T.height; cv.getContext("2d").drawImage(T, 0, 0); });

const orbs = document.querySelectorAll(".orb");
let ow = innerWidth;
addEventListener("resize", () => { if (Math.abs(innerWidth - ow) > 40) { ow = innerWidth; orbs.forEach(orb); } });
setPalette(pal, false);

/* ---------- Motion, or its end state ---------- */
function fillRating(anim) {
  setDigits(anim);
  root.classList.add("rated");
}
function playStack() {
  stack.classList.add("play");
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
  stack.classList.add("play", "struck");
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
  }, { threshold: 0.3 });
  io.observe(stack);
  const dg = $("#dialog");
  if (dg.offsetParent) io.observe(dg); else dgEnd();
}

/* ---------- Reserve, top and bottom ---------- */
document.querySelectorAll("[data-reserve]").forEach((form) => {
  const note = $(".r-note", form);
  const input = $("input", form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = cleanHandle(input.value);
    if (!h) { note.innerHTML = "<b>Type the handle you want.</b> Letters, numbers, dots and dashes."; input.focus(); return; }
    const res = await reserve({ handle: h, kind: "channel" });
    if (res.ok && res.via === "api") note.innerHTML = `<b>@${h} is yours.</b> Ratings open with YouTube: connect your channel to see yours.`;
    else if (res.ok) note.innerHTML = `<b>Your email app has the request for @${h}.</b> Send it and the handle is held.`;
    else if (res.reason === "taken") note.innerHTML = `<b>@${h} is taken.</b> Try another.`;
  });
});
