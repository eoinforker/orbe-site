/*
  Round 9 B. The O of the wordmark is a glass; its liquid is the rating.
  Screen 2 is the same O as a record that only payouts can fill, and a small
  O that is Orbe's, which only fills when a deal moves money.
  Every figure is computed here from the engines: the rating example, the
  record engine's made-up channel, and the fee schedules.
*/
import { WORDMARK } from "../assets/r5/wordmark.js";
import { example } from "../assets/r5/examples.js";
import { suspiciousCreator } from "../assets/engine/record/browser.js";
import { successFee } from "../assets/engine/market/browser.js";
import { feeTermsFor, fundingFor } from "../assets/engine/sponsor/browser.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { Vessel, O_H, O_TOP, XL, XR, COUNTER_AREA, levelOf } from "./vessel.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const STILL = document.documentElement.classList.contains("still");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const bez = (x1, y1, x2, y2) => (t) => {
  /* cubic-bezier easing, solved for x by Newton steps */
  let x = t;
  for (let i = 0; i < 6; i++) {
    const cx = 3 * x * (1 - x) * (1 - x) * x1 + 3 * x * x * (1 - x) * x2 + x * x * x - t;
    const dx = 3 * (1 - x) * (1 - x) * x1 + 6 * x * (1 - x) * (x2 - x1) + 3 * x * x * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    x = clamp(x - cx / dx, 0, 1);
  }
  return 3 * x * (1 - x) * (1 - x) * y1 + 3 * x * x * (1 - x) * y2 + x * x * x;
};
const EASE_LIFT = bez(0.23, 1, 0.32, 1);      /* 520 ms, the lift */
const EASE_DROP = bez(0.55, 0, 0.25, 1);      /* 460 ms, falling back into the word */
const EASE_WIDTH = bez(0.45, 0, 0.2, 1);      /* scale changes on the jug */
const gbp = (p) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const gbp0 = (p) => (p % 100 ? gbp(p) : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(p / 100));
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/* ---------------------------------------------------------------- facts */
const ex = example("channel");
const beats = ex.result.parts.find((p) => p.key === "reach").score;
const nova = suspiciousCreator();
const month = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
const ads = nova.revenue.filter((l) => l.month === month && l.stream === "ads");
const EST = ads.find((l) => l.provenance.source === "youtube_analytics").gross.amount;
const PAID = ads.find((l) => l.provenance.source === "adsense").gross.amount;
const monthName = new Date(month).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const novaName = (nova.accounts.find((a) => a.kind === "youtube")?.title ?? "Nova Plays").replace(/\s*\(fixture\)/, "");
const SPONSOR = 300000, SALE = 6000000;
const SPONSOR_FEE = fundingFor({ amount: SPONSOR, currency: "GBP" }, feeTermsFor("network")).fee.amount;   /* 45,000p: 15%, paid by the brand */
const SALE_FEE = successFee({ amount: SALE, currency: "GBP" }).fee.amount;                                  /* 480,000p: 8%, from the proceeds */

for (const n of $$('[data-b="beats"]')) n.textContent = String(beats);
for (const n of $$('[data-b="signed"]')) n.textContent = ex.signed;
for (const n of $$('[data-b="band"]')) n.textContent = ex.band;
for (const n of $$('[data-b="band-line"]')) n.textContent = `Sample channel, ${ex.sizeBand.replace(/ channels$/, "")}`;
$('[data-b="est"]').textContent = gbp(EST);
$('[data-b="paid"]').textContent = gbp(PAID);
$('[data-b="nova-line"]').textContent = `${novaName}, a made-up channel from the Orbe record engine. Ad revenue for ${monthName}.`;
$(".ledger").setAttribute("aria-label", `${novaName}'s ad revenue for ${monthName}: YouTube estimated ${gbp(EST)}, which is not counted; AdSense paid ${gbp(PAID)}, which is.`);

/* ---------------------------------------------------------------- colours, read from the tokens so ?c=pink follows */
let C;
const readColours = () => {
  C = { ink: css("--orbe-ink"), liquid: css("--accent") || "#1F4BFF", sheen: css("--orbe-sky"), chalk: css("--orbe-chalk"), soft: css("--orbe-graphite"), air: "rgba(20,19,17,0.62)", wet: "rgba(251,250,246,0.86)" };
};
readColours();
const DPR = () => Math.min(2, window.devicePixelRatio || 1);

/* ---------------------------------------------------------------- one loop for both scenes, only while something moves */
let raf = 0, last = 0;
const scenes = [];
function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
function frame(now) {
  const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000));
  last = now;
  let busy = false;
  for (const s of scenes) busy = s.tick(dt, now) || busy;
  raf = busy ? requestAnimationFrame(frame) : 0;
}

/* =============================================================== 1. the O */
const hero = $("[data-hero]");
const hcv = $("[data-hero-cv]");
const hctx = hcv.getContext("2d");
const svg = $("[data-mark]");
const slot = $("[data-o-slot]");
const target = $("[data-o-target]");
const reading = $("[data-reading]");
const SAMPLE = beats / 100;

/* the wordmark: the O path stays in the SVG as the no-script fallback; the canvas draws the O */
const W = WORDMARK.text;
$("[data-m-o]").setAttribute("d", W.O);
$("[data-m-r]").setAttribute("d", W.r);
$("[data-m-b]").setAttribute("d", W.b);
$("[data-m-e]").setAttribute("d", W.e);

const hv = new Vessel(SAMPLE);
const H = {
  mode: "word", t0: 0, dur: 0, from: null, box: null,
  prev: null, vel: { x: 0, y: 0 }, aMove: 0,
  ptr: { x: 0, t: 0, vx: 0, a: 0, live: false },
  tilt: { lp: null, hp: 0, a: 0 },
  drain: null, w: 0, h: 0, visible: true, labels: true,
};

function slotBox() {
  const hr = hero.getBoundingClientRect(), r = svg.getBoundingClientRect();
  const sx = r.width / 2040;
  return { x: r.left - hr.left, y: r.top - hr.top + (O_TOP + 742) * sx, h: O_H * sx };
}
function targetBox() {
  const hr = hero.getBoundingClientRect(), r = target.getBoundingClientRect();
  return { x: r.left - hr.left, y: r.top - hr.top, h: r.height };
}
function sizeHero() {
  const r = hero.getBoundingClientRect();
  H.w = r.width; H.h = r.height;
  hcv.width = Math.round(r.width * DPR()); hcv.height = Math.round(r.height * DPR());
  hero.style.setProperty("--close", `${-(720 / 2040) * svg.getBoundingClientRect().width}px`);
}

function heroMarks(box) {
  const s = box.h / O_H;
  const counterPx = 566 * s;
  if (counterPx < 150) return [];
  const big = counterPx > 330;
  const size = big ? 12 : 11;
  const live = H.drain ? 1 - H.drain.p : 1;
  return [
    { frac: 0.5, text: ["TYPICAL FOR YOUR SIZE", "TYPICAL"], side: "l", pos: "above", size, weight: 1 },
    { frac: 0.5, text: "0", side: "r", pos: "above", size, rule: false },
    { frac: SAMPLE, text: [`BEATS ${beats} IN 100`, `${beats} IN 100`], side: "l", pos: "below", size, rule: false, alpha: live },
  ];
}

function heroTick(dt, now) {
  if (!H.visible && H.mode === "word" && hv.still && !H.drain) return false;
  let box;
  if (H.mode === "up" || H.mode === "down") {
    const p = clamp((now - H.t0) / H.dur, 0, 1);
    const e = H.mode === "up" ? EASE_LIFT(p) : EASE_DROP(p);
    const to = H.mode === "up" ? targetBox() : slotBox();
    box = { x: lerp(H.from.x, to.x, e), y: lerp(H.from.y, to.y, e), h: lerp(H.from.h, to.h, e) };
    if (p >= 1) {
      H.mode = H.mode === "up" ? "lifted" : "word";
      if (H.mode === "lifted") hero.classList.add("landed");
    }
  } else box = H.mode === "lifted" ? targetBox() : slotBox();

  /* the glass's own acceleration, in O units: what the liquid feels */
  const s = box.h / O_H;
  const c = { x: box.x + box.h * 0.457, y: box.y + box.h / 2 };
  if (H.prev && dt > 0) {
    const vx = (c.x - H.prev.x) / dt, vy = (c.y - H.prev.y) / dt;
    const ax = (vx - H.vel.x) / dt, ay = (vy - H.vel.y) / dt;
    H.vel = { x: vx, y: vy };
    H.aMove = lerp(H.aMove, (ax / s) * 0.55, 1 - Math.exp(-dt / 0.03));
    hv.gEff = clamp(14400 + (-(ay / s)) * 0.3, 14400 * 0.5, 14400 * 1.6);
  }
  H.prev = c;
  if (H.mode === "word" || H.mode === "lifted") { H.vel = { x: 0, y: 0 }; H.aMove *= Math.exp(-dt / 0.03); hv.gEff = 14400; }

  /* pointer: a moving hand nudges the glass */
  if (now - H.ptr.t > 90) H.ptr.a *= Math.exp(-dt / 0.05);
  /* tilt: high-passed, so a held tilt settles back to a level reading */
  if (H.tilt.lp !== null) { H.tilt.lp = lerp(H.tilt.lp, H.tilt.raw, 1 - Math.exp(-dt / 0.45)); H.tilt.a = -14400 * Math.sin(((H.tilt.raw - H.tilt.lp) * Math.PI) / 180); }
  const A = H.aMove + (H.ptr.a / s) * 0.22 + H.tilt.a;
  hv.A = STILL ? 0 : clamp(A, -14400 * 0.5, 14400 * 0.5);

  if (H.drain) {
    const p = clamp((now - H.drain.t0) / H.drain.dur, 0, 1);
    H.drain.p = p;
    const e = H.drain.to > H.drain.from ? EASE_LIFT(p) : p * p * (3 - 2 * p);
    hv.frac = lerp(H.drain.from, H.drain.to, e);
    if (p >= 1) { const done = H.drain.done; H.drain = null; done && done(); }
  }
  if (STILL) hv.rest(); else hv.step(dt);

  hctx.setTransform(1, 0, 0, 1, 0, 0);
  hctx.clearRect(0, 0, hcv.width, hcv.height);
  hv.draw(hctx, box, { px: DPR(), liquid: C.liquid, sheen: C.sheen, ink: C.ink, air: C.air, wet: C.wet, marks: heroMarks(box) });
  H.box = box;
  return H.mode === "up" || H.mode === "down" || !!H.drain || !hv.still || Math.abs(H.ptr.a) > 5 || Math.abs(H.tilt.a) > 5;
}
scenes.push({ tick: heroTick });

let suppressFocus = false;
function lift() {
  if (H.mode === "lifted" || H.mode === "up") return;
  H.from = H.box || slotBox();
  H.mode = STILL ? "lifted" : "up"; H.t0 = performance.now(); H.dur = 520;
  hero.classList.add("lifted");
  if (STILL) hero.classList.add("landed");
  reading.inert = false;
  slot.setAttribute("aria-expanded", "true");
  kick();
  setTimeout(() => $("[data-r-h]").focus({ preventScroll: true }), STILL ? 0 : 260);
}
function drop({ refocus = true } = {}) {
  if (H.mode === "word" || H.mode === "down") return;
  const hadFocus = reading.contains(document.activeElement);
  H.from = H.box || targetBox();
  H.mode = STILL ? "word" : "down"; H.t0 = performance.now(); H.dur = 460;
  hero.classList.remove("landed", "lifted");
  reading.inert = true;
  slot.setAttribute("aria-expanded", "false");
  if (refocus && hadFocus) { suppressFocus = true; slot.focus({ preventScroll: true }); setTimeout(() => (suppressFocus = false), 0); }
  kick();
}
slot.addEventListener("click", () => (H.mode === "word" || H.mode === "down" ? lift() : drop()));
slot.addEventListener("focus", () => { if (!suppressFocus && slot.matches(":focus-visible")) lift(); });
$("[data-open]").addEventListener("click", lift);
$("[data-close]").addEventListener("click", () => drop());
target.addEventListener("click", () => drop());
reading.addEventListener("click", (e) => { if (e.target === reading) drop({ refocus: false }); });
hero.addEventListener("keydown", (e) => { if (e.key === "Escape" && (H.mode === "lifted" || H.mode === "up")) { e.preventDefault(); drop(); } });
reading.addEventListener("focusout", (e) => { if (e.relatedTarget && !hero.contains(e.relatedTarget)) drop({ refocus: false }); });

/* pointer and tilt */
hero.addEventListener("pointermove", (e) => {
  const t = e.timeStamp || performance.now();
  const dt = (t - H.ptr.t) / 1000;
  if (H.ptr.live && dt > 0.004 && dt < 0.1) {
    const vx = (e.clientX - H.ptr.x) / dt;
    const a = (vx - H.ptr.vx) / dt;
    H.ptr.vx = lerp(H.ptr.vx, vx, 0.5);
    H.ptr.a = clamp(lerp(H.ptr.a, a, 0.35), -60000, 60000);
    kick();
  }
  H.ptr.live = true; H.ptr.x = e.clientX; H.ptr.t = t;
}, { passive: true });
hero.addEventListener("pointerleave", () => { H.ptr.live = false; });
function onTilt(e) {
  const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  const raw = ang === 90 ? e.beta : ang === -90 || ang === 270 ? -e.beta : ang === 180 ? -e.gamma : e.gamma;
  if (raw == null) return;
  H.tilt.raw = clamp(raw, -40, 40);
  if (H.tilt.lp === null) H.tilt.lp = H.tilt.raw;
  kick();
}
if (!STILL && "DeviceOrientationEvent" in window) {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    /* iOS asks once, on the first touch of the page */
    const ask = () => { DeviceOrientationEvent.requestPermission().then((r) => { if (r === "granted") addEventListener("deviceorientation", onTilt); }).catch(() => {}); };
    hero.addEventListener("touchend", ask, { once: true, passive: true });
  } else addEventListener("deviceorientation", onTilt);
}

/* reserving: the O drains to empty (no number we have not measured) and drops back into the word */
const status = document.createElement("p");
status.className = "lede-status fine"; status.hidden = true; status.setAttribute("aria-live", "polite");
$("[data-lede]").appendChild(status);
function showSample() {
  status.hidden = true;
  H.drain = { t0: performance.now(), dur: STILL ? 1 : 700, from: hv.frac, to: SAMPLE, p: 0 };
  kick();
}
for (const form of $$("[data-reserve]")) {
  const input = $("input", form);
  const note = form.parentElement.querySelector("[data-note]") || form.nextElementSibling;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = cleanHandle(input.value).toLowerCase();
    if (!h) { note.textContent = "Type your handle first, as it appears after the @."; note.classList.add("err"); input.focus(); return; }
    note.classList.remove("err");
    const res = await reserve({ handle: h, kind: "channel" });
    note.textContent = res.via === "api" ? `orbe.vc/@${h} is reserved for you.` : `Your email app has opened with a request for orbe.vc/@${h}. Send it and the handle is yours.`;
    if (form.closest("[data-hero]")) {
      H.drain = { t0: performance.now(), dur: STILL ? 1 : 720, from: hv.frac, to: 0, p: 0, done: () => {
        drop();
        status.hidden = false;
        status.innerHTML = "";
        status.append(`orbe.vc/@${h} is on its way to you. Your O stays empty until it is measured. `);
        const b = document.createElement("button"); b.type = "button"; b.className = "link"; b.textContent = "Show the sample again";
        b.addEventListener("click", showSample); status.append(b);
      } };
      kick();
    }
  });
}

/* =============================================================== 2. only money fills it */
const fig = $("[data-fig]");
const mcv = $("[data-money-cv]");
const mctx = mcv.getContext("2d");
const jugYou = $('[data-jug="you"]'), jugOrbe = $('[data-jug="orbe"]');
const youN = $("[data-you]"), orbeN = $("[data-orbe]"), orbeLine = $("[data-orbe-line]"), live = $("[data-money-live]");
const vy = new Vessel(0), vo = new Vessel(0);
const M = {
  cap: 1000000, capFrom: 1000000, capTo: 1000000, capT0: 0, capOld: 1000000,
  you: 0, orbe: 0, est: 0, mist: null, drops: [], queue: [], visible: false, played: false, running: null,
  ox: 0, oy: 0, w: 0, h: 0,
};
function sizeMoney() {
  const r = mcv.getBoundingClientRect();
  M.w = r.width; M.h = r.height;
  mcv.width = Math.round(r.width * DPR()); mcv.height = Math.round(r.height * DPR());
}
function jugBox(el) {
  const c = mcv.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - c.left, y: r.top - c.top, h: r.height };
}
const zToY = (box, z) => box.y + (-z - O_TOP) * (box.h / O_H);
const xToU = (box, x) => (x - box.x) / (box.h / O_H);
const uToX = (box, u) => box.x + u * (box.h / O_H);
const orbeCap = (by, bo) => M.cap * (bo.h / by.h) ** 2;   /* one unit of liquid is the same money in both glasses */

const ticks = (cap) => { const step = cap / 5; return [1, 2, 3, 4, 5].map((i) => i * step); };
const kfmt = (p) => `£${new Intl.NumberFormat("en-GB").format(p / 100000)}k`;

function moneyMarks(by) {
  const s = by.h / O_H, size = 566 * s > 300 ? 12 : 11;
  const marks = [];
  const p = M.capT0 ? clamp((performance.now() - M.capT0) / 450, 0, 1) : 1;
  const sets = M.capOld !== M.capTo && p < 1 ? [[ticks(M.capOld), 1 - p], [ticks(M.capTo), p]] : [[ticks(M.capTo), 1]];
  for (const [list, a] of sets) for (const v of list) {
    const f = v / M.cap;
    if (f > 0.995 || f < 0.02) continue;
    marks.push({ frac: f, tick: 10, side: "r", text: kfmt(v), pos: "mid", size, alpha: a, rightInset: 18 });
  }
  if (M.est > 0) marks.push({ frac: EST / M.cap, dash: true, side: "l", pos: "above", size, alpha: M.est * (M.cap > 1000000 || used.size ? 0 : 1), text: [`EST. ${gbp(EST)}, NOT COUNTED`, `EST. ${gbp(EST)}`, "EST."], reserve: 48 });
  if (M.you > 0) marks.push({ frac: M.you / M.cap, side: "l", pos: "below", size, rule: false, text: [`PAID ${gbp(M.you)}`, "PAID"], reserve: 48 });
  return marks;
}

function moneyTick(dt, now) {
  if (!M.visible && !M.drops.length && !M.mist) return false;
  const by = jugBox(jugYou), bo = jugBox(jugOrbe);
  const sY = by.h / O_H;
  /* the jug's scale */
  if (M.capT0) {
    const p = clamp((now - M.capT0) / 450, 0, 1);
    M.cap = lerp(M.capFrom, M.capTo, EASE_WIDTH(p));
    if (p >= 1) { M.capT0 = 0; M.capOld = M.capTo; }
  }
  const g = 2900 * (by.h / 480);
  /* spawn queued drops on their clock */
  while (M.queue.length && M.queue[0].at <= now) {
    const q = M.queue.shift();
    const area = (q.amount / M.cap) * COUNTER_AREA;
    M.drops.push({ ...q, r: Math.sqrt(area / Math.PI) * sY, vx: q.vx || 0, vy: q.vy || 0 });
  }
  /* fly */
  for (const d of M.drops) {
    d.vy += g * dt; d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.divert && !d.diverted && d.y > by.y - 4) {
      /* the lip: Orbe's share leaves the stream for the small O on a ballistic arc */
      d.diverted = true; d.to = "orbe";
      const tx = uToX(bo, 332), ty = zToY(bo, vo.level) - d.r, T = 0.36;
      d.vx = (tx - d.x) / T; d.vy = (ty - d.y - 0.5 * g * T * T) / T;
    }
    const box = d.to === "orbe" ? bo : by, v = d.to === "orbe" ? vo : vy;
    const u = xToU(box, d.x);
    if (u > XL && u < XR) {
      const sy = zToY(box, v.surfaceAt(u));
      if (d.y + d.r * 0.6 >= sy && (!d.divert || d.diverted)) {
        d.done = true;
        if (d.to === "orbe") M.orbe += d.amount; else M.you += d.amount;
        v.impulse(u, clamp((d.vy / (box.h / O_H)) * 0.0045 * (d.r / (box.h * 0.05)), 0, 900));
        d.land && d.land();
      }
    }
    if (!d.done && d.y > M.h + 80) { d.done = true; if (d.to === "orbe") M.orbe += d.amount; else M.you += d.amount; d.land && d.land(); }
  }
  M.drops = M.drops.filter((d) => !d.done);
  /* mist: the estimate rises through the O and leaves through the top */
  if (M.mist) {
    const p = clamp((now - M.mist.t0) / 1500, 0, 1);
    M.mist.p = p;
    if (p >= 1) M.mist = null;
  }
  if (M.estT0) { M.est = clamp((now - M.estT0) / 260, 0, 1); if (M.est >= 1) M.estT0 = 0; }

  vy.frac = M.you / M.cap;
  vo.frac = M.orbe / orbeCap(by, bo);
  if (STILL) { vy.rest(); vo.rest(); } else { vy.step(dt); vo.step(dt); }

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, mcv.width, mcv.height);
  const o = { px: DPR(), liquid: C.liquid, sheen: C.sheen, ink: C.ink, air: C.air, wet: C.wet };
  const px = DPR();
  mctx.setTransform(px, 0, 0, px, 0, 0);
  /* drops first: they fall behind the front of the glass, into the counter */
  for (const d of M.drops) {
    const st = 1 + clamp(Math.hypot(d.vx, d.vy) / (g * 0.9), 0, 0.55);
    mctx.save();
    mctx.translate(d.x, d.y);
    mctx.rotate(Math.atan2(d.vy, d.vx) - Math.PI / 2);
    mctx.beginPath(); mctx.ellipse(0, 0, d.r / Math.sqrt(st), d.r * st, 0, 0, Math.PI * 2);
    mctx.fillStyle = C.liquid; mctx.fill();
    mctx.restore();
  }
  vy.draw(mctx, by, { ...o, marks: moneyMarks(by) });
  vo.draw(mctx, bo, { ...o, marks: [] });
  mctx.setTransform(px, 0, 0, px, 0, 0);
  if (M.mist) drawMist(by);
  updateFigures();
  return !!(M.capT0 || M.queue.length || M.drops.length || M.mist || M.estT0 || !vy.still || !vo.still || (M.running && M.running.until > now));
}
scenes.push({ tick: moneyTick });

function drawMist(by) {
  const p = M.mist.p;
  const s = by.h / O_H;
  const y0 = by.y + by.h + 12, y1 = by.y - 70;
  const y = lerp(y0, y1, bez(0.3, 0.1, 0.4, 1)(p));
  const estY = zToY(by, levelOf(EST / M.cap));
  if (!M.estShown && y <= estY) { M.estShown = true; M.estT0 = performance.now(); }
  const a = p < 0.18 ? p / 0.18 : p > 0.62 ? Math.max(0, 1 - (p - 0.62) / 0.38) : 1;
  const text = `est. ${gbp(EST)}`;
  const fs = clamp(15 * (by.h / 480), 12, 16);
  mctx.font = `500 ${fs}px "Commit Mono", ui-monospace, monospace`;
  mctx.textAlign = "left"; mctx.textBaseline = "middle";
  /* the letters loosen as they rise, each on its own drift, so the figure thins like vapour */
  const cx = by.x + by.h * 0.457;
  const widths = [...text].map((ch) => mctx.measureText(ch).width);
  const spread = 1 + p * 0.9;
  const total = widths.reduce((a2, b) => a2 + b, 0) * spread;
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    const ph = i * 1.7;
    const dy = Math.sin(p * 5 + ph) * 3 * p - p * p * 22 * ((i % 3) / 2);
    mctx.globalAlpha = a * 0.78 * (1 - p * 0.35 * ((i * 7) % 5) / 4);
    mctx.fillStyle = C.soft;
    mctx.fillText(ch, x, y + dy);
    x += widths[i] * spread;
  });
  mctx.globalAlpha = 1;
  void s;
}

/* figures follow the liquid exactly: each drop adds its own pence as it lands */
let shown = { you: -1, orbe: -1 };
function updateFigures() {
  if (shown.you !== M.you) { youN.textContent = gbp(M.you); shown.you = M.you; }
  if (shown.orbe !== M.orbe) { orbeN.textContent = gbp0(M.orbe); shown.orbe = M.orbe; }
}

function intro() {
  if (M.played) return;
  M.played = true;
  if (STILL) { M.you = PAID; M.est = 1; M.estShown = true; kick(); return; }
  const now = performance.now();
  M.mist = { t0: now, p: 0 };
  M.estShown = false;
  const by = jugBox(jugYou);
  const n = 36;
  const parts = split(PAID, n);
  const cx = by.x + by.h * 0.457;
  parts.forEach((amount, i) => {
    const j = Math.sin(i * 12.9898) * 0.5;
    M.queue.push({ at: now + 640 + i * 19, amount, x: cx + j * by.h * 0.03, y: by.y - 46, to: "you" });
  });
  kick();
}
/* split pence into n drops that sum exactly */
function split(total, n) {
  const base = Math.floor(total / n), out = Array(n).fill(base);
  for (let i = 0; i < total - base * n; i++) out[i] += 1;
  return out;
}

/* deals */
const deals = $$("[data-deal]");
const pourOut = $("[data-pour-out]");
const used = new Set();
function setRunning(on) { for (const d of deals) d.setAttribute("aria-disabled", on || used.has(d.dataset.deal) ? "true" : "false"); }
function runDeal(kind, origin) {
  if (M.running || used.has(kind)) return;
  if (!M.played) intro();
  const by = jugBox(jugYou), bo = jugBox(jugOrbe);
  const now = performance.now();
  const ox = origin ? clamp(origin.x, uToX(by, XL + 60), uToX(by, XR - 60)) : by.x + by.h * 0.457;
  const oy = Math.min(origin ? origin.y : by.y - 46, by.y - 30);
  used.add(kind);
  setRunning(true);
  let start = now;
  const net = kind === "sale" ? SALE - SALE_FEE : SPONSOR;
  const needed = M.you + net;
  if (needed > M.capTo * 0.9) {
    const caps = [1000000, 2000000, 5000000, 10000000, 20000000];
    const cap = caps.find((c) => needed <= c * 0.9) ?? caps.at(-1);
    M.capOld = M.capTo; M.capFrom = M.cap; M.capTo = cap; M.capT0 = STILL ? 0 : now;
    if (STILL) { M.cap = cap; M.capOld = cap; }
    start += 480;
  }
  const finish = () => {
    M.running = null; setRunning(false); pourOut.hidden = false;
    const line = kind === "sale" ? `${gbp0(SALE_FEE)} from the ${gbp0(SALE)} sale, 8%. You keep ${gbp0(SALE - SALE_FEE)}.` : `${gbp0(SPONSOR_FEE)} from the brand, 15% on top. You keep all ${gbp0(SPONSOR)}.`;
    orbeLine.textContent = used.size > 1 ? `${line} Orbe in all: ${gbp0(M.orbe)}.` : line;
    live.textContent = `${kind === "sale" ? "Sale" : "Sponsorship"} added. Paid to you: ${gbp(M.you)}. Orbe: ${line}`;
  };
  if (STILL) {
    if (kind === "sale") { M.you += SALE - SALE_FEE; M.orbe += SALE_FEE; } else { M.you += SPONSOR; M.orbe += SPONSOR_FEE; }
    M.running = null; finish(); kick(); return;
  }
  let pending = 0;
  const land = () => { if (--pending === 0) finish(); };
  if (kind === "sponsor") {
    const per = SPONSOR / 20;
    for (let i = 0; i < 20; i++) { pending++; M.queue.push({ at: start + i * 30, amount: per, x: ox + Math.sin(i * 7.1) * by.h * 0.012, y: oy, to: "you", land }); }
    /* the brand pays Orbe's 15% on top, from its own side: exactly SPONSOR_FEE in drops of the same size */
    const k = Math.round(SPONSOR_FEE / per);
    for (let i = 0; i < k; i++) { pending++; M.queue.push({ at: start + 160 + i * 150, amount: SPONSOR_FEE / k, x: uToX(bo, 332) + (i - 1) * 3, y: bo.y - bo.h * 0.9, to: "orbe", land }); }
  } else {
    const n = 25, per = SALE / n, k = Math.round(SALE_FEE / per);
    const pick = new Set(Array.from({ length: k }, (_, i) => Math.round(((i + 0.5) * n) / k)));
    for (let i = 0; i < n; i++) { pending++; M.queue.push({ at: start + i * 28, amount: per, x: ox + Math.sin(i * 5.3) * by.h * 0.012, y: oy, to: "you", divert: pick.has(i), land }); }
  }
  M.running = { until: now + 4000 };
  M.queue.sort((a, b) => a.at - b.at);
  kick();
}
pourOut.addEventListener("click", () => {
  if (M.running) return;
  used.clear(); M.drops = []; M.queue = [];
  M.you = PAID; M.orbe = 0; M.cap = M.capTo = M.capFrom = M.capOld = 1000000; M.capT0 = 0;
  vy.rest(); vo.rest();
  orbeLine.textContent = "No deal, no fee.";
  setRunning(false); pourOut.hidden = true;
  deals[0].focus();
  kick();
});

/* drag a deal in; a press or Enter drops it in too */
for (const el of deals) {
  let st = null, ghost = null, dragged = false;
  el.addEventListener("pointerdown", (e) => {
    if (el.getAttribute("aria-disabled") === "true" || e.button) return;
    st = { x: e.clientX, y: e.clientY, r: el.getBoundingClientRect() }; dragged = false;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!dragged && Math.hypot(dx, dy) > 6) {
      dragged = true;
      ghost = el.cloneNode(true); ghost.removeAttribute("data-deal"); ghost.classList.add("deal-ghost"); ghost.setAttribute("aria-hidden", "true");
      ghost.style.width = st.r.width + "px";
      document.body.appendChild(ghost);
      el.style.opacity = "0.3";
    }
    if (ghost) ghost.style.transform = `translate(${st.r.left + dx}px, ${st.r.top + dy}px)`;
  });
  const end = (e, cancel) => {
    if (!st) return;
    const s0 = st; st = null;
    if (!dragged) return;
    const r = jugYou.getBoundingClientRect();
    const over = !cancel && e.clientX > r.left - 40 && e.clientX < r.right + 40 && e.clientY > r.top - 140 && e.clientY < r.bottom + 20;
    const g = ghost; ghost = null;
    if (over) {
      const c = mcv.getBoundingClientRect();
      g.remove(); el.style.opacity = "";
      runDeal(el.dataset.deal, { x: e.clientX - c.left, y: e.clientY - c.top });
    } else {
      g.style.transition = "transform 220ms cubic-bezier(0.23, 1, 0.32, 1)";
      g.style.transform = `translate(${s0.r.left}px, ${s0.r.top}px)`;
      setTimeout(() => { g.remove(); el.style.opacity = ""; }, 230);
    }
  };
  el.addEventListener("pointerup", (e) => end(e, false));
  el.addEventListener("pointercancel", (e) => end(e, true));
  el.addEventListener("click", (e) => {
    if (dragged) { dragged = false; e.preventDefault(); return; }
    if (el.getAttribute("aria-disabled") === "true") return;
    runDeal(el.dataset.deal, null);
  });
}

/* ---------------------------------------------------------------- sizes, visibility, fonts */
function resize() { sizeHero(); sizeMoney(); vy.rest(); vo.rest(); kick(); }
if ("ResizeObserver" in window) { const ro = new ResizeObserver(resize); ro.observe(hero); ro.observe(fig); } else addEventListener("resize", resize);
resize();
if ("IntersectionObserver" in window) {
  new IntersectionObserver((es) => { for (const e of es) { H.visible = e.isIntersecting; if (H.visible) kick(); } }).observe(hero);
  new IntersectionObserver((es) => { for (const e of es) { M.visible = e.isIntersecting; if (M.visible) kick(); } }).observe(fig);
  new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.55) intro(); }, { threshold: [0.55] }).observe(fig);
} else { M.visible = true; intro(); }
/* the O arrives as if just set down: a single small slosh on load, settled within a second */
if (!STILL) { hv.v[1] = 260; hv.v[2] = -90; }
document.fonts && document.fonts.load('500 12px "Commit Mono"').then(() => kick(), () => {});
kick();
/* ?debug exposes the state, so the settle time can be measured in tests */
try { if (new URLSearchParams(location.search).has("debug")) window.__orbe = { hv, vy, vo, H, M, lift, drop }; } catch (e) {}
