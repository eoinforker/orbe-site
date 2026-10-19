/*
  The open sky. Every figure on this page is computed here, live, by the Orbe
  engine's own made-up examples: the rating (examples.js), the record's
  estimate against payout (record engine), the sponsorship price (sponsor
  engine), the indicative value and fees (market engine) and the plausibility
  check (podcast engine). Nothing is sent anywhere.
*/
import { example, mathsFor, benchmark, MODEL_VERSION } from "../assets/r5/examples.js";
import { reserve } from "../assets/r5/reserve.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { suspiciousCreator } from "../assets/engine/record/browser.js";
import { inventoryFromStats, feeTermsFor } from "../assets/engine/sponsor/browser.js";
import { valuate, DEFAULT_FEE_SCHEDULE, DEFAULT_BUYER_PREMIUM } from "../assets/engine/market/browser.js";
import { assessPlausibility, prefixFor } from "../assets/engine/podcast/browser.js";
import { focusAreas, topStat } from "../assets/engine/rating/browser.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reduce = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();
const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const count = (n) => nf.format(Math.round(n));
const pounds = (pence, dp = 0) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const short = (pence) => { const p = pence / 100; return p >= 1e6 ? `£${p / 1e6}M` : p >= 1e3 ? `£${p / 1e3}k` : `£${p}`; };
const pct = (bps) => `${bps / 100}%`;
const set = (sel, text) => { for (const el of $$(sel)) el.textContent = text; };

if (!reduce) document.documentElement.classList.add("anim");

/* ---------- the wordmark ---------- */
mountWordmark($("[data-wordmark]"), { animate: !reduce });
mountWordmark($("[data-wordmark-sig]"), { animate: false });
set("[data-mv]", MODEL_VERSION);

/* ---------- the rating, every kind in its own words ---------- */
const SAY = {
  channel: "Your uploads, against channels your size.",
  newsletter: "Your issues, against letters your size. Paid sign-ups count.",
  stream: "Your nights live, against streams your size.",
  podcast: "Your episodes, against shows your size.",
  portfolio: "Your frames, against portfolios your size. Saves and licences count.",
};
const best = (e) => e.result.parts.reduce((a, p) => (p.score > a.score ? p : a), e.result.parts[0]);

function rollFigure(el, text) {
  if (reduce || !el.animate) { el.textContent = text; return; }
  el.textContent = "";
  [...text].forEach((c, i) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = c;
    el.appendChild(s);
    s.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, delay: i * 24, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "backwards" });
  });
}

function showKind(kind, first = false) {
  const e = example(kind);
  const b = best(e);
  set('[data-r="initial"]', e.name[0]);
  set('[data-r="name"]', e.name);
  set('[data-r="handle"]', e.handle);
  const fig = $('[data-r="signed"]');
  fig.setAttribute("aria-label", e.signed);
  if (first) fig.textContent = e.signed; else rollFigure(fig, e.signed);
  set('[data-r="band"]', e.band);
  set('[data-r="beat"]', `You beat ${b.score} in 100 ${e.peers} your size.`);
  set('[data-r="say"]', SAY[kind]);
  set('[data-r="band-size"]', e.sizeBand);
  set('[data-r="peers"]', e.peers);
  $('[data-r="parts"]').innerHTML = e.parts.map((p) => `<li><span>${esc(p.name)}</span><span class="tr" role="img" aria-label="${esc(p.name)}: beats ${p.score} in 100. The tick is typical."><i style="width:${first || reduce ? p.score : 0}%"></i></span><span class="sc">${p.score}</span></li>`).join("");
  if (!first && !reduce) requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-r="parts"] i').forEach((i, n) => { i.style.width = `${e.parts[n].score}%`; })));
  $('[data-r="weights"]').innerHTML = mathsFor(kind).map((m) => `<li><span>${esc(m.name)}</span><span>${m.weight}%</span></li>`).join("");
  drawMic(b.score);
  set("[data-you-t]", `You, ahead of ${b.score} in 100`);
  $("[data-mic]")?.setAttribute("aria-label", `A microphone drawn in cells. The one orange cell is you: ahead of ${b.score} in 100 ${e.peers} your size.`);
}

const tabs = $$('[role="tab"]');
function select(tab, focus = true) {
  for (const t of tabs) { const on = t === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; }
  $("#rate-panel").setAttribute("aria-labelledby", tab.id);
  if (focus) tab.focus();
  showKind(tab.dataset.kind);
}
for (const t of tabs) {
  t.addEventListener("click", () => select(t, false));
  t.addEventListener("keydown", (ev) => {
    const i = tabs.indexOf(t);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
    if (to === undefined) return;
    ev.preventDefault();
    select(tabs[(to + tabs.length) % tabs.length]);
  });
}

/* ---------- the microphone: 40 by 70 cells at 11.28px, three colours, shaded by omission ---------- */
const CELL = 11.28;
const COLS = 40, ROWS = 70, CX = 20;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function region(x, y) {
  const px = x + 0.5, py = y + 0.5;
  const dx = px - CX;
  if (py >= 37 && py < 41 && Math.abs(dx) <= 13) return "collar";
  const bodyHalf = 9 - ((py - 41) / 15) * 3;
  if (py >= 41 && py < 56 && Math.abs(dx) <= bodyHalf) return "body";
  const cy = Math.min(26, Math.max(14, py));
  if (Math.hypot(dx, py - cy) <= 12) return "grille";
  if (Math.hypot(Math.abs(dx) - 16, py - 25) <= 2.6) return "knob";
  if (Math.abs(dx) >= 15 && Math.abs(dx) <= 17 && py >= 25 && py < 49) return "yoke";
  if (py >= 47 && py < 49 && Math.abs(dx) <= 17) return "yoke";
  if (py >= 49 && Math.abs(dx) <= 2) return "pole";
  if (py >= 67 && Math.abs(dx) <= 9) return "pole";
  return null;
}
const MIC = (() => {
  const cells = [];
  const at = new Map();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const r = region(x, y); if (r) { at.set(`${x},${y}`, r); cells.push({ x, y, r }); } }
  const soft = (r) => r === "grille" || r === "body";
  for (const c of cells) {
    if (!soft(c.r)) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => at.get(`${c.x + a},${c.y + b}`));
    if (n.some((r) => !r || (r !== c.r && !soft(r) && r !== "collar"))) c.rim = true;
  }
  const dots = [];
  for (const c of cells) {
    if (c.rim) continue;
    const dx = c.x + 0.5 - CX;
    if (c.r === "grille" && (c.x + c.y) % 2 === 0) {
      const shade = dx > 3 ? (dx - 3) / 9 : c.y > 30 ? (c.y - 30) / 10 : 0; /* light from the top left; the right and the foot fall into shadow */
      if (hash(c.x, c.y) >= shade) { c.dot = true; dots.push(c); }
    }
    if (c.r === "body" && (dx < -4 && dx > -6) && c.y % 2 === 0) c.dot = true;
    if (c.r === "collar" && c.y === 39 && c.x % 2 === 0 && Math.abs(dx) < 11) c.dot = true;
    if (c.r === "knob" && Math.abs(Math.abs(dx) - 16) < 0.6 && Math.abs(c.y + 0.5 - 25) < 0.6) c.dot = true;
  }
  dots.sort((a, b) => b.y - a.y || a.x - b.x);
  return { cells, dots };
})();
function drawMic(score) {
  const svg = $("[data-mic-svg]");
  if (!svg) return;
  const you = MIC.dots[Math.round((score / 100) * (MIC.dots.length - 1))];
  const f = (n) => (n * CELL).toFixed(2);
  const out = [];
  for (const c of MIC.cells) {
    const ink = c.rim || c.r === "collar" || c.r === "yoke" || c.r === "knob" || c.r === "pole";
    out.push(`<rect x="${f(c.x)}" y="${f(c.y)}" width="${f(1)}" height="${f(1)}" fill="${ink ? "#141311" : "#1F4BFF"}"/>`);
  }
  for (const c of MIC.cells) {
    if (!c.dot || c === you) continue;
    out.push(`<rect x="${f(c.x + 0.25)}" y="${f(c.y + 0.25)}" width="${f(0.5)}" height="${f(0.5)}" fill="#FBFAF6"/>`);
  }
  out.push(`<rect x="${f(you.x)}" y="${f(you.y)}" width="${f(1)}" height="${f(1)}" fill="#FF5A1F"/>`);
  svg.innerHTML = out.join("");
  const lab = $("[data-you]");
  lab.style.left = `${((you.x + 0.5) / COLS) * 100}%`;
  lab.style.top = `${(you.y / ROWS) * 100}%`;
}

showKind("channel", true);

/* ---------- folds: detail expands in place ---------- */
for (const f of $$("[data-fold]")) {
  const btn = $("button[aria-expanded]", f);
  const body = $(".fold-body", f);
  body.hidden = false;
  body.inert = true;
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open);
    body.classList.toggle("open", open);
    body.inert = !open;
  });
}

/* ---------- the record: estimate against payout, from the record engine, raced once ---------- */
try {
  const nova = suspiciousCreator();
  const last = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
  const ads = nova.revenue.filter((l) => l.month === last && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source === "adsense");
  if (est && paid) {
    const m = new Date(`${last}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).replace("Sept", "Sep");
    const read = new Date(paid.provenance.checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).replace("Sept", "Sep");
    const E = est.gross.amount, P = paid.gross.amount;
    set('[data-l="month"]', m);
    set('[data-t="rec-est"]', pounds(E, 2));
    set('[data-t="rec-paid"]', pounds(P, 2));
    set('[data-l="read"]', `Read ${read}`);
    set('[data-l="who"]', "made up");
    $("[data-race]").setAttribute("aria-label", `The Record, a made-up channel in ${m}: YouTube estimated ${pounds(E, 2)}, AdSense paid ${pounds(P, 2)}. Your record uses what was paid.`);
    const wE = $('[data-w="est"]'), wP = $('[data-w="paid"]');
    const nE = $('[data-l="est"]'), nP = $('[data-l="paid"]');
    const finish = () => { nE.textContent = pounds(E, 2); nP.textContent = pounds(P, 2); wE.style.width = "100%"; wP.style.width = `${(P / E) * 100}%`; $(".w-est").style.setProperty("--strike", 1); };
    if (reduce) finish();
    else {
      /* the race: both count in the same pounds per frame, in 24 steps, so the estimate simply runs longer; then it is struck */
      $(".w-est").style.setProperty("--strike", 0);
      wE.style.width = wP.style.width = "0%";
      nE.textContent = nP.textContent = pounds(0, 2);
      const STEPS = 24, STEP_MS = 70;
      let k = 0;
      setTimeout(() => {
        const t = setInterval(() => {
          k++;
          const v = (E * k) / STEPS;
          nE.textContent = pounds(Math.min(v, E), 2); wE.style.width = `${Math.min(1, v / E) * 100}%`;
          nP.textContent = pounds(Math.min(v, P), 2); wP.style.width = `${Math.min(1, v / E) * 100 > (P / E) * 100 ? (P / E) * 100 : (v / E) * 100}%`;
          if (k >= STEPS) { clearInterval(t); finish(); }
        }, STEP_MS);
      }, 1400);
    }
  }
} catch {}

/* ---------- a sponsorship price, from the sponsor engine ---------- */
try {
  const rate = 0.75;
  const fx = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * rate), currency: "GBP" } : null);
  const { inventory } = inventoryFromStats({ kind: "youtube", audience: 85000, units: [21000, 18000, 25000, 19500, 30000, 17000, 22500], price: null, currency: "GBP", fx, rating: { band: "Good", rating: 0 }, at: new Date().toISOString() });
  const item = inventory.items[0];
  const s = item.suggestion;
  if (s?.low) {
    const range = `${pounds(s.low.amount)} to ${pounds(s.high.amount)}`;
    set('[data-q="range"], [data-t="sp-range"]', range);
    set('[data-q="basis"]', `A placement, from ${count(s.expected.units)} ${s.expected.unit} at ${s.expected.day} days.`);
  }
  const net = pct(feeTermsFor("network").bps);
  const dir = pct(feeTermsFor("direct").bps);
  set('[data-q="net"], [data-t="sp-net"]', net);
  set('[data-q="dir"], [data-t="sp-dir"]', dir);
} catch {}

/* ---------- selling: the indicative value and the fee schedule, from the market engine ---------- */
const tiers = (sch) => sch.tiers.map((t, i) => (t.upTo == null ? `${pct(t.rateBps)} above` : `${pct(t.rateBps)} ${i ? "to" : "up to"} ${short(t.upTo)}`)).join(", ");
try {
  const now = new Date();
  const months = Array.from({ length: 24 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 24 + i, 1)).toISOString().slice(0, 10));
  const streams = [["ads", 6200], ["sponsorship", 3800, "Brindle Coffee (made up)"], ["memberships", 1500]];
  const declared = [];
  for (const [stream, amount, who] of streams) months.forEach((month, i) => { const k = 23 - i < 12 ? 1 : 1 / 1.18; declared.push({ month, gross: { amount: Math.round(amount * 100 * k), currency: "GBP" }, stream, counterparty: who }); });
  const v = valuate({ kind: "youtube", revenue: [], declared, costs: { basis: "declared_margin", margin: 0.62 }, faceDependence: 0.6 });
  set('[data-t="sell-range"]', `${pounds(v.range.low.amount)} to ${pounds(v.range.high.amount)}`);
  set('[data-t="sell-mult"]', `${v.multiples.low} to ${v.multiples.high} times a year's profit`);
} catch {}
const seller = `${tiers(DEFAULT_FEE_SCHEDULE)}, ${pounds(DEFAULT_FEE_SCHEDULE.minimum)} minimum`;
const buyer = `${tiers(DEFAULT_BUYER_PREMIUM)}, ${pounds(DEFAULT_BUYER_PREMIUM.minimum)} minimum`;
set('[data-t="sell-fee"]', `${seller.replace(/^./, (c) => c.toUpperCase())}. Nothing if it doesn't sell.`);

/* How Orbe earns, in full */
const EARNS = [
  ["Rating, record, podcasts, the guide", "Free for creators, for good. Nothing on the core behind a paywall."],
  ["Sponsorships", `${pct(feeTermsFor("network").bps)} when Orbe finds the brand, ${pct(feeTermsFor("direct").bps)} when you bring your own. Paid by the brand on top of your price, only when it completes.`],
  ["Selling", `A success fee from the proceeds, only if it sells: ${seller}.`],
  ["Buying", `Free once a buyer is vetted. A buyer's premium at completion: ${buyer}.`],
  ["Diligence", "Included. £1,500 only if a buyer walks away after reading it, and never if it shows the listing was wrong."],
  ["Lending", "One fixed fee per file, paid by the lender. Never a percentage of a loan. Escrow passes through at cost."],
];
$("[data-earns]").innerHTML = EARNS.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("");

/* ---------- the rating surface and the guide ---------- */
{
  const e = example("channel");
  const b = best(e);
  set('[data-t="rate-fig"]', e.signed);
  set('[data-t="rate-line"]', `${e.band}. You beat ${b.score} in 100 ${e.peers} your size.`);
  const top = topStat(e.result);
  const focus = focusAreas(e.result)[0];
  const typical = e.result.parts.filter((p) => p.score === 50).map((p) => p.name.toLowerCase());
  const steps = [
    `Keep doing what works: ${top.name.toLowerCase()}, ${top.value}, beats ${top.score} in 100.`,
    `${e.best.replace("Best of the last twelve", "Look again at your best of the twelve")}`,
    focus ? focus.advice : typical.length ? `Nothing to fix. ${typical.join(" and ").replace(/^./, (c) => c.toUpperCase())} ${typical.length > 1 ? "sit" : "sits"} at typical, and typical is a good word.` : "Nothing to fix this week.",
  ];
  $('[data-t="steps"]').innerHTML = steps.map((s) => `<li>${esc(s)}</li>`).join("");
}

/* ---------- the state of the middle: the engine's starting baselines ---------- */
{
  const bm = benchmark("channel");
  const max = Math.max(...bm.rows.map((r) => r.value));
  set('[data-t="bench-title"]', "Typical reach, channels by size");
  $('[data-t="bench"]').innerHTML = bm.rows.map((r) => `<li class="${r.key === bm.example ? "you" : ""}"><span>${esc(r.label)}</span><span class="tr" aria-hidden="true"><i style="width:${(r.value / max) * 100}%"></i></span><span class="v">${Math.round(r.value * 100)}%</span></li>`).join("");
}

/* ---------- podcasts and plausibility ---------- */
try { set('[data-t="prefix"]', prefixFor("thelongtable").replace(/^https:\/\//, "").replace("/p/", "/p/\u200b")); } catch {}
try {
  const now = new Date();
  const daily = {};
  for (let i = 0; i < 21; i++) daily[new Date(now - (21 - i) * 864e5).toISOString().slice(0, 10)] = 10000;
  const p = assessPlausibility({
    claim: { basis: "claimed", monthlyDownloads: 310000, daily, dailyTotal: 230000, episodes: [{ guid: "c1", publishedAt: "2026-09-02T06:00:00.000Z", downloads_7d: 9000, downloads_30d: 8200 }] },
    measured: null,
    op3: { asof: now.toISOString(), monthlyDownloads: 52000, weeklyDownloads: [], weeklyAvgDownloads: 52000 / 4.3, numWeeks: 8 },
    index: { id: 0, title: "", url: "", episodeCount: 22, dead: 0 },
    feed: null,
    videos: [900, 1100, 760, 1300].map((views, i) => ({ episodeGuid: `v${i}`, videoWorkId: `v${i}`, videoTitle: "", views, daysApart: 0, similarity: 1, firstFrameCount: false })),
    bestChart: null, ratings: { count: 4 }, now,
  });
  const V = { consistent: "Consistent", consistent_with_notes: "Consistent, with notes", questions: "Questions to ask", inconsistent: "Inconsistent", not_enough_signal: "Not enough signal" };
  set('[data-t="pl-claim"]', count(310000));
  set('[data-t="pl-public"]', count(52000));
  set('[data-t="pl-verdict"]', V[p.verdict] ?? p.verdict);
  set('[data-t="pl-flags"]', `${p.flags.length} ${p.flags.length === 1 ? "flag" : "flags"}`);
} catch {}

/* ---------- reserve your handle ---------- */
const form = $("[data-reserve]");
const note = $("[data-r-note]");
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const handle = form.elements.handle.value;
  const kind = form.elements.kind.value;
  if (!handle.trim()) { note.textContent = "Add the handle you'd like, and we'll hold it."; form.elements.handle.focus(); return; }
  const r = await reserve({ handle, kind });
  if (r.ok) {
    note.classList.add("ok");
    note.textContent = r.via === "api" ? `Held: orbe.vc/@${r.handle.toLowerCase()}. We'll check it's yours when ratings open.` : `Your email has opened with the request for @${r.handle.toLowerCase()} written out. Send it and the handle is held. We'll check it's yours when ratings open.`;
  } else {
    note.textContent = r.reason === "taken" ? "That handle is already held. Try another." : "Add the handle you'd like, and we'll hold it.";
  }
});
