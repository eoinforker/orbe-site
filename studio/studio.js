/*
  Orbe Studio, try A: the desktop.

  One sentence cycles through the people Orbe is for. With each word the tool on
  the desk reassembles, the file is renamed, and the rating, the terminal and
  the windows that depend on the creator are read again from the engine. It goes
  round once, settles on the first, and stops. Every figure is the engine's, for
  made-up creators, computed in this browser.
*/
import * as D from "./data.js";
import { createCells } from "./pixels.js";
import { WORDMARK } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { benchmark } from "../assets/r5/examples.js";
import { buyerPremium } from "../assets/engine/market/browser.js";
import { assessPlausibility } from "../assets/engine/podcast/browser.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const still = document.documentElement.classList.contains("still");
const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ================================================================ who Orbe is talking to, in their own words */
const CAST = [
  { id: "field", word: "field recording", file: "marsh_4am.wav", obj: "headphones" },
  { id: "night", word: "Let's Play", file: "stream_041.vod", obj: "controller" },
  { id: "stockpot", word: "recipe", file: "recipe.card", obj: "pan" },
  { id: "sixlegs", word: "macro shot", file: "roll_04.jpg", obj: "camera" },
  { id: "kettle", word: "explainer", file: "explainer.mp4", obj: "bulb" },
  { id: "clips", word: "speedrun", file: "speedrun.log", obj: "stopwatch" },
  { id: "margin", word: "newsletter", file: "letter_112.eml", obj: "envelope" },
  { id: "shed", word: "woodworking video", file: "shed_build.mov", obj: "chisel" },
  { id: "table", word: "podcast", file: "episode_88.mp3", obj: "mic" },
  { id: "diffs", word: "coding Short", file: "diff.short", obj: "code" },
];
const DESKS = {};
const deskOf = (id) => (DESKS[id] ??= D.madeUpDesk(id));
const personOf = (id) => D.PEOPLE.find((p) => p.id === id);
let cur = CAST[0];

/* ================================================================ the wordmark: its O holds the rating's level */
function drawWordmark(d) {
  const c = WORDMARK.text, f = d.rated ? d.reachScore / 100 : 0;
  const top = -633, bottom = -67, level = bottom - (bottom - top) * f;
  $("[data-wm]").innerHTML = `<defs><clipPath id="wm-o"><ellipse cx="332" cy="-350" rx="220" ry="283"/></clipPath></defs>
    <rect class="wm-fill" clip-path="url(#wm-o)" x="100" y="${level}" width="470" height="${bottom - level + 4}"/>
    ${["O", "r", "b", "e"].map((k) => `<path class="wm-ink" d="${c[k]}"/>`).join("")}`;
}

/* ================================================================ Odin's slot: 450ms width reflow, 360ms rise, 24ms per character */
function chars(word) {
  const w = document.createElement("span");
  w.className = "w8";
  for (const ch of word) { const c = document.createElement("span"); c.className = "c"; c.textContent = ch; w.appendChild(c); }
  return w;
}
function swapWord(slot, word) {
  const old = slot.querySelector(".w8:not(.out)");
  if (old && old.textContent === word) return;
  if (!old || still) { slot.replaceChildren(chars(word)); return; }
  const from = slot.getBoundingClientRect().width;
  const next = chars(word);
  old.classList.add("out");
  slot.appendChild(next);
  slot.style.width = "auto";
  const to = slot.getBoundingClientRect().width;
  slot.style.width = from + "px";
  slot.animate([{ width: from + "px" }, { width: to + "px" }], { duration: 450, easing: EASE, fill: "forwards" })
    .finished.then(() => { slot.getAnimations().forEach((a) => a.cancel()); slot.style.width = ""; }).catch(() => {});
  old.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 360, easing: EASE, fill: "forwards" });
  [...old.children].forEach((c, i) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: i * 12, fill: "forwards" }));
  setTimeout(() => old.remove(), 420);
  [...next.children].forEach((c, i) => c.animate([{ transform: "translateY(110%)" }, { transform: "translateY(0)" }], { duration: 360, delay: i * 24, easing: EASE, fill: "backwards" }));
}

/* ================================================================ the hero */
const cells = createCells($("[data-cells]"), { still, colours: { cobalt: css("--orbe-cobalt"), ink: css("--orbe-ink"), chalk: css("--orbe-chalk"), ember: css("--orbe-ember") } });
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
function heroFor(c, { animate = true } = {}) {
  cur = c;
  const d = deskOf(c.id), p = personOf(c.id), W = d.words;
  swapWord($("[data-slot]"), c.word);
  $("[data-h1-sr]").textContent = `Your ${c.word}, rated against creators your size.`;
  cells.show(c.obj, { animate });
  $("[data-obj-title]").textContent = c.file;
  drawWordmark(d);
  $("[data-rating]").textContent = d.signed;
  $("[data-tag]").textContent = `${d.name}, made up, ${d.reachScore} in 100`;
  $("[data-rate-line]").innerHTML = `<b>${esc(d.band)}.</b> Zero is typical for ${esc(d.peersLine)}. Most people are near it, and that is how big things get built.`;
  const L = d.latest;
  const pad = (k) => k.padEnd(9, " ");
  $("[data-term]").innerHTML = [
    `$ orbe today`,
    `  read ${d.works.length} ${esc(d.workWord === "Short" ? "Shorts" : W.works)} from ${esc(p.handle)}`,
    `  ${pad("rating")}${esc(d.signed)}  ${esc(d.band)}`,
    `  ${pad("reach")}beats ${d.reachScore} in 100`,
    L ? `  ${pad("latest")}“${esc(clip(L.title, 18))}” ${L.multiple != null ? `${L.multiple.toFixed(2)}x` : "new"}` : "",
    `  <span class="c-dim"># ${esc(clip(p.say, 38))}</span>`,
  ].filter(Boolean).join("\n");
  checksum(d);
  for (const f of DEPENDS) f(d);
}
async function checksum(d) {
  try {
    const body = JSON.stringify({ name: d.name, rating: d.rating, band: d.band, parts: d.parts.map((p) => [p.key, p.score]), model: D.MODEL_VERSION });
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)));
    $("[data-checksum]").textContent = `orbe ${D.MODEL_VERSION} ` + btoa(String.fromCharCode(...h)).replace(/=+$/, "").slice(0, 22);
  } catch { $("[data-checksum]").textContent = ""; }
}

/* the sentence goes round once, comes home to the first, and stops; it can be paused */
const pauseBtn = $("[data-pause]");
let step = 0, timer = 0, paused = false, done = false;
function tick() {
  step++;
  const c = CAST[step % CAST.length];
  heroFor(c);
  if (step >= CAST.length) { done = true; pauseBtn.textContent = "Again"; pauseBtn.setAttribute("aria-pressed", "false"); return; }
  timer = setTimeout(tick, 2600);
}
pauseBtn.addEventListener("click", () => {
  if (done) { done = false; step = 0; paused = false; pauseBtn.textContent = "Pause"; timer = setTimeout(tick, 600); return; }
  paused = !paused;
  pauseBtn.setAttribute("aria-pressed", String(paused));
  pauseBtn.textContent = paused ? "Play" : "Pause";
  clearTimeout(timer);
  if (!paused) timer = setTimeout(tick, 600);
});

/* ================================================================ the wall: one window component, every product */
let wid = 0;
function win({ size = "s", title, body, more, open = false }) {
  const id = `w${++wid}`;
  const el = document.createElement("section");
  el.className = `w ${size}${more ? "" : " no-more"}`;
  el.setAttribute("aria-labelledby", `${id}-t`);
  el.innerHTML = `<div class="tb"><span class="tb-box" aria-hidden="true"></span><h3 class="tb-t" id="${id}-t">${esc(title)}</h3><button class="tb-x" type="button" aria-expanded="false" aria-controls="${id}-b">open</button></div>
    <div class="wb" id="${id}-b">${body}${more ? `<div class="w-more">${more}</div>` : ""}</div>`;
  const b = $(".tb-x", el);
  b?.addEventListener("click", () => {
    const on = !el.hasAttribute("data-open");
    el.toggleAttribute("data-open", on);
    b.setAttribute("aria-expanded", String(on));
    b.textContent = on ? "close" : "open";
    if (on && !still) el.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 240, easing: EASE });
  });
  if (open) b?.click();
  return el;
}
const DEPENDS = [];
const wall = $("[data-wall]");
const T = D.TAKE_RATE;
const pct = (bps) => `${bps / 100}%`;

/* payouts.ledger: the Record, estimate against paid */
const rec = D.madeUpRecord();
const dis = rec.disagree;
const ledger = win({
  size: "m", title: "payouts.ledger",
  body: `<p class="w-lab">${esc(dis.name)}, made up. ${esc(D.monthName(dis.month))}, ad revenue.</p>
    <div class="race">
      <div><p class="px num"><span class="struck" data-est>${D.gbp(0, { pence: true })}</span></p><div class="stip" aria-hidden="true"><i data-est-bar></i></div><p class="w-lab">YouTube Analytics, estimated</p></div>
      <div><p class="px num" data-paid>${D.gbp(0, { pence: true })}</p><div class="stip" aria-hidden="true"><i data-paid-bar></i></div><p class="w-lab">Google AdSense, paid</p></div>
    </div>
    <p class="w-line">Read from payouts, not estimates. The record keeps what was paid, through a Stripe App that can only read.</p>`,
  more: `<p>The Stripe App asks for seven read-only permissions (payouts, balance, balance transaction sources, charges, invoices, subscriptions and events) and none that writes. One install covers direct sales and every newsletter platform that charges through your own Stripe.</p><p class="w-api">The record reads live once the Orbe API is switched on. Here it is the record engine's made-up channel.</p>`,
});
wall.append(ledger);
const sellSlot = document.createComment("sell");
wall.append(sellSlot);
function race() {
  const est = $("[data-est]", ledger), paid = $("[data-paid]", ledger), eb = $("[data-est-bar]", ledger), pb = $("[data-paid-bar]", ledger);
  const E = dis.estimate, P = dis.paid;
  const end = () => { est.textContent = D.gbp(E, { pence: true }); paid.textContent = D.gbp(P, { pence: true }); eb.style.width = "100%"; pb.style.width = `${(P / E) * 100}%`; est.classList.add("on"); };
  if (still) return end();
  const t0 = performance.now();
  const f = (now) => {
    const t = now - t0;
    /* the estimate ticks up in steps; the payout arrives and settles */
    const ue = Math.min(1, t / 1600), up = Math.min(1, t / 1100);
    const ve = Math.round((E * Math.floor(ue * 26)) / 26), vp = Math.round(P * (1 - Math.pow(1 - up, 3)));
    est.textContent = D.gbp(ve, { pence: true }); paid.textContent = D.gbp(vp, { pence: true });
    eb.style.width = `${(ve / E) * 100}%`; pb.style.width = `${(vp / E) * 100}%`;
    if (ue < 1 || up < 1) requestAnimationFrame(f); else { end(); }
  };
  requestAnimationFrame(f);
}
if (still) race(); else new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); race(); } }, { threshold: 0.6 }).observe(ledger);

/* sponsor.quote */
const sponsor = win({ title: "sponsor.quote", body: `<div data-sp></div>`, more: `<p>A brand's brief is matched against opted-in creators and shortlisted within its budget. In the browser the creators are made up; with the API, delivery is read at source and bookings run through a payments partner.</p>` });
$("[data-sp]", sponsor).outerHTML = `<p class="w-lab" data-sp-lab></p><p class="px px-s num" data-sp-fig></p><p class="w-line">${pct(T.sponsorship.networkBps)} when Orbe finds the brand, ${pct(T.sponsorship.directBps)} when you bring it. Paid by the brand, never from your price.</p><a class="w-link" href="../products/sponsorships/">Price my sponsorship</a>`;
DEPENDS.push((d) => {
  const p = D.priceDeal(d);
  const s = p?.items.find((i) => i.suggestion?.status === "suggested");
  $("[data-sp-lab]", sponsor).textContent = s ? `${d.name}, made up. ${s.name}, a placement.` : `${d.name}, made up.`;
  $("[data-sp-fig]", sponsor).textContent = s ? `${D.money(s.suggestion.low)} to ${D.money(s.suggestion.high)}` : "Soon";
});
wall.append(sponsor);

/* podcasts.feed */
wall.append(win({
  title: "podcasts.feed",
  body: `<p class="w-lab">Measurement, free for good</p><p class="px px-s num">£0</p><p class="w-line">The Chartable replacement. Orbe's prefix goes in front of each episode file and counts downloads by IAB-style rules, with no IP address kept.</p><a class="w-link" href="../products/podcasts/">Measure my podcast</a>`,
  more: `<p>A dashboard by day, episode, app and country; Apple and Spotify charts; smart links; and host connectors for Buzzsprout, Transistor, Captivate, Simplecast, Podbean, Spreaker and Omny Studio through your own key. Audience comes in three labelled tiers: estimated, measured by Orbe, read from your host.</p>`,
}));

/* sell.price: indicative value and every fee, on a quiet slider */
let v = null;
try { v = D.valueOf(rec, { margin: 0.62, face: 0.2 }); } catch {}
const sell = win({
  size: "m", title: "sell.price",
  body: `<p class="w-lab">${esc(rec.accountTitle)}, made up. Indicative value.</p>
    <p class="px num">${v?.range ? `${D.money(v.range.low)} to ${D.money(v.range.high)}` : "Not yet"}</p>
    <label class="w-lab" for="sale">If it sold for <b data-sale-out></b></label>
    <input class="w-range" id="sale" type="range" min="0" max="100" step="1" value="40" data-sale>
    <dl class="w-kv two" data-fees></dl>
    <p class="w-line">For the day you want it. Until then, keep building. <a class="w-link" href="../products/selling/">Value my business</a></p>`,
  more: v ? `<p>${v.multiples.low}x to ${v.multiples.high}x a year's profit of ${D.money(v.ttmProfit)}, on ${D.money(v.ttmRevenue)} revenue, ${Math.round(v.verifiedShare * 100)}% of it verified. ${esc(D.INDICATIVE_LABEL)}</p><p>Fees are worked out slice by slice, like income tax, so they never jump at a line. Escrow is passed through at cost.</p>` : "",
});
const saleOf = (u) => { const lo = 50_000_00, hi = 5_000_000_00; return Math.round(Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * (u / 100)) / 1000_00) * 1000_00; };
function fees() {
  const price = saleOf(+$("[data-sale]", sell).value);
  const f = D.successFee({ amount: price, currency: "GBP" });
  const b = buyerPremium({ amount: price, currency: "GBP" });
  $("[data-sale-out]", sell).textContent = D.gbp(price);
  $("[data-sale]", sell).setAttribute("aria-valuetext", D.gbp(price));
  $("[data-fees]", sell).innerHTML = `<dt>Seller fee${f.minimumApplied ? ", the £4,000 minimum" : ""}</dt><dd>${D.money(f.fee)}</dd>
    <dt>Buyer's premium${b.minimumApplied ? ", the £1,000 minimum" : ""}</dt><dd>${D.money(b.fee)}</dd>
    <dt class="tot">You keep</dt><dd class="tot">${D.gbp(price - f.fee.amount)}</dd>
    <dt>If it doesn't sell</dt><dd>£0</dd>`;
}
sellSlot.replaceWith(sell);
$("[data-sale]", sell).addEventListener("input", fees);
fees();

/* check.claim: the plausibility check, on its own made-up claim */
const daily = {}; for (let i = 0; i < 21; i++) daily[new Date(Date.UTC(2026, 8, 20 + i)).toISOString().slice(0, 10)] = 10000;
let pl = null;
try {
  pl = assessPlausibility({
    claim: { basis: "claimed", monthlyDownloads: 310000, daily, dailyTotal: 230000 },
    measured: null,
    op3: { asof: "2026-10-18T00:00:00.000Z", monthlyDownloads: 52000, weeklyDownloads: [], weeklyAvgDownloads: 52000 / 4.3, numWeeks: 8 },
    index: { id: 0, title: "", url: "", episodeCount: 22, dead: 0 }, feed: null, videos: [], bestChart: null, ratings: { count: 4 }, now: new Date("2026-10-18T12:00:00Z"),
  });
} catch {}
const VERDICT = { consistent: "Consistent", consistent_with_notes: "With notes", questions: "Questions", inconsistent: "Inconsistent", not_enough_signal: "Not enough" };
wall.append(win({
  title: "check.claim",
  body: `<p class="w-lab">A made-up claim, checked</p><p class="px px-s">${esc(VERDICT[pl?.verdict] ?? "Checked")}</p><p class="w-line">310,000 downloads a month, claimed.${pl?.estimate ? ` Public signals say ${D.count(pl.estimate.monthlyLow)} to ${D.count(pl.estimate.monthlyHigh)}.` : ""} Every threshold provisional.</p><a class="w-link" href="../products/podcasts/">Check a claim</a>`,
  more: pl ? `<p>${pl.flags.length} flags, each with an innocent reading where there is one: ${pl.flags.slice(0, 3).map((f) => esc(D.nodash(f.reason))).join(" ")}</p><p class="w-api">Rules ${esc(pl.rulesVersion)}.</p>` : "",
}));

/* diligence.report */
wall.append(win({
  title: "diligence.report",
  body: `<p class="w-lab">For a vetted buyer</p><p class="px px-s num">${D.gbp(T.buyers.report.standard)}</p><p class="w-line">Every verified figure with where it came from and the day it was read. Charged only if the buyer walks away.</p><a class="w-link" href="../products/diligence/">Read a report</a>`,
  more: `<p>The cross-checks, what could not be checked and why, and the questions to ask, generated in the browser from three labelled made-up creators: one clean, one built to fail checks, one messy.</p>`,
}));

/* guide.next: three next steps, from the creator's own numbers */
const guide = win({ title: "guide.next", body: `<p class="w-lab" data-g-lab></p><p class="px px-s num">3</p><ol class="w-line" data-g style="margin:0;padding-left:20px"></ol><p class="w-api">Rules stand in today. The full guide after every post switches on with the API.</p>` });
DEPENDS.push((d) => {
  const pb = d.bests.find((b) => b.metric === d.primary) ?? d.bests[0];
  const steps = [pb ? `The record to beat: ${pb.label}, ${D.count(pb.value)}.` : null, d.top ? `Keep ${d.top.name.toLowerCase()}; it beats ${d.top.score} in 100.` : null, d.latest?.multiple != null ? `Your latest did ${d.latest.multiple.toFixed(2)}x your typical.` : null].filter(Boolean).slice(0, 3);
  $("[data-g-lab]", guide).textContent = `${d.name}, made up. After the latest post.`;
  $("[data-g]", guide).innerHTML = steps.map((s) => `<li>${esc(s)}</li>`).join("");
});
wall.append(guide);

/* lending.file */
wall.append(win({ title: "lending.file", body: `<p class="w-lab">Financing, when you want it</p><p class="px px-s num">${D.gbp(T.financingFilePrice)}</p><p class="w-line">A fixed fee per file, the one fixed fee Orbe charges.</p><p class="w-api">Provisional. Switches on with the API.</p>` }));

/* sunday.note: dated and signed */
const note = win({ title: "sunday.note", body: `<p class="w-lab" data-n-date></p><p class="w-letter" data-n></p><p class="w-lab">Orbe</p>` });
DEPENDS.push((d) => {
  const B = D.bricksOf(d);
  $("[data-n-date]", note).textContent = new Date(d.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  $("[data-n]", note).innerHTML = `Hello, ${esc(d.name)}. ${esc(B.works)}${B.since ? `, ${esc(B.since)}` : ""}. Nothing to fix. <em>See you Sunday.</em>`;
});
wall.append(note);

/* state_of_the_middle.csv */
const bm = benchmark("channel");
const row = bm.rows.find((r) => r.key === bm.example) ?? bm.rows[0];
wall.append(win({
  title: "state_of_the_middle.csv",
  body: `<p class="w-lab">kind,size,typical_reach</p><p class="px px-s num">${Math.round(row.value * 100)}%</p><p class="w-line">A typical upload from a channel with ${esc(row.label)} subscribers reaches about this share of them. What the middle earns and how its work performs, published free each season.</p><p class="w-api">${esc(bm.line)}</p>`,
}));

$("[data-wall-note]").textContent = "Every creator and figure on the wall is made up and computed in your browser by the Orbe engine. Independently calculated by Orbe.";
$("[data-model]").textContent = D.MODEL_VERSION;

/* ================================================================ reserve */
$("[data-res]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#handle"), status = $("[data-res-status]");
  const h = cleanHandle(input.value);
  if (!h) { status.textContent = "Type the handle you'd like, like fieldrecordings."; input.focus(); return; }
  status.textContent = `Opening your email with the request for @${h}, so nothing is sent without you seeing it.`;
  const r = await reserve({ handle: h, kind: deskOf(cur.id).words.kind === "portfolio" ? "photography" : deskOf(cur.id).words.kind });
  if (r?.ok && r.via === "api") status.textContent = `You're in the book, @${h}. We'll check it's yours when ratings open.`;
  else if (r && !r.ok && r.reason === "taken") status.textContent = `@${h} is taken. Try another.`;
});

/* ================================================================ go */
heroFor(CAST[0], { animate: false });
addEventListener("resize", () => cells.size());
if (!still) { pauseBtn.hidden = false; timer = setTimeout(tick, 2600); }
window.orbeStudio = { heroFor, CAST };
