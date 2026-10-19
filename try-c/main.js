/*
  Try C, "The letter". The cover's word swaps the kind of creator with Odin's
  reflow (the slot's width over 450 ms, new letters rising 24 ms apart), and the
  Sunday note beneath it is rewritten from that creator's own engine figures.
  It plays through the five kinds once, lands back on the channel and stops.
*/
import { figures, example, ORDER, count } from "./figures.js";
import { wordmarkSVG } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { readFeedDetails, sampleDashboard } from "../assets/engine/podcast/browser.js";
import { mountPixel } from "./pixel.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";

/* ---------------------------------------------------------------- the wordmark, as masthead and as signature */
for (const el of $$("[data-wordmark], [data-sig]")) {
  const h = parseFloat(getComputedStyle(el).height) || 24;
  el.appendChild(wordmarkSVG({ cut: h <= 24.5 ? "small" : "text" }));
}

/* ---------------------------------------------------------------- each kind, in its own words */
const VOICE = {
  channel: { word: "channel", works: "uploads", one: "upload" },
  newsletter: { word: "newsletter", works: "issues", one: "issue" },
  stream: { word: "stream", works: "streams", one: "stream" },
  podcast: { word: "podcast", works: "episodes", one: "episode" },
  portfolio: { word: "photos", works: "photo sets", one: "set" },
};
const num = (s) => (String(s).match(/[+-]?[\d.,]+%?/) ?? [""])[0];
function letterFor(kind) {
  const e = example(kind);
  const v = VOICE[kind];
  const p = (k) => e.parts.find((x) => x.key === k) ?? e.result.parts.find((x) => x.key === k);
  const reach = p("reach");
  const multiple = e.best.match(/([\d.]+)×/)?.[1] ?? "";
  const detail = {
    channel: () => `A typical upload reaches ${num(reach.value)} of your subscribers, and your newest ten are running ${p("momentum").value} against the twenty before them.`,
    newsletter: () => `A typical issue is opened by ${num(reach.value)} of the people it is sent to, and ${num(p("engagement").value)} of those who open it click through. Opens are only half of it, so clicks count here too.`,
    stream: () => `A typical night holds ${num(reach.value)} of your followers at once, and you win ${num(p("follows").value)} follows for every 1,000 hours watched. That is a room people chose to spend the evening in.`,
    podcast: () => `A typical episode is downloaded by ${num(reach.value)} of your followers in its first week, and listeners hear ${num(p("completion").value)} of it. That beats ${p("completion").score} in 100 shows your size.`,
    portfolio: () => `A typical set is seen by ${num(reach.value)} of your followers, and ${num(p("saves").value)} of views end in a save: people keeping your work to come back to.`,
  }[kind]();
  return {
    word: v.word,
    handle: e.handle,
    name: e.name,
    open: `Your ${v.works}, read properly this week, against ${e.peers} with ${e.sizeBand}.`,
    signed: e.signed,
    band: e.band,
    beat: `You beat ${reach.score} in 100 ${e.peers} your size.`,
    detail,
    best: `The best of your last twelve ${v.works} did ${multiple} times your typical ${v.one}.`,
  };
}

/* ---------------------------------------------------------------- Odin's word slot */
const slot = $("[data-slot]");
const slotSr = $("[data-slot-sr]");
const chars = (word) => [...word].map((c) => `<span class="ch">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");
let measurer;
function widthOf(word) {
  if (!measurer) {
    measurer = slot.cloneNode(false);
    measurer.removeAttribute("data-slot");
    measurer.style.cssText = "position:absolute;visibility:hidden;width:auto;transition:none;left:-9999px;top:0";
    slot.parentNode.appendChild(measurer);
  }
  measurer.innerHTML = `<span class="slot-w">${chars(word)}</span>`;
  return measurer.getBoundingClientRect().width;
}
function setWord(word, animate) {
  slotSr.textContent = word;
  const next = document.createElement("span");
  next.className = "slot-w";
  next.innerHTML = chars(word);
  if (!animate) {
    slot.style.width = "";
    slot.replaceChildren(next);
    return;
  }
  const from = slot.getBoundingClientRect().width;
  const to = widthOf(word);
  const old = slot.querySelector(".slot-w");
  slot.style.width = `${from}px`;
  void slot.offsetWidth;
  slot.style.width = `${to}px`;
  if (old) {
    old.classList.add("old");
    for (const c of $$(".ch", old)) c.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], { duration: 360, easing: EASE, fill: "forwards" });
    setTimeout(() => old.remove(), 380);
  }
  slot.appendChild(next);
  $$(".ch", next).forEach((c, i) => c.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 450, delay: i * 24, easing: EASE, fill: "backwards" }));
  clearTimeout(setWord.t);
  setWord.t = setTimeout(() => { slot.style.width = ""; }, 480);
}

/* ---------------------------------------------------------------- the letter */
const body = $("[data-body]");
const F = (k) => $(`[data-f="${k}"]`);
function riseText(el, text) {
  el.innerHTML = chars(text);
  $$(".ch", el).forEach((c, i) => c.animate([{ transform: "translateY(40%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 450, delay: i * 24, easing: EASE, fill: "backwards" }));
}
function fill(L, animate) {
  F("handle").textContent = L.handle;
  F("name").textContent = L.name;
  F("open").textContent = L.open;
  if (animate) riseText(F("signed"), L.signed); else F("signed").textContent = L.signed;
  F("band").textContent = L.band;
  F("beat").textContent = L.beat;
  F("detail").textContent = L.detail;
  F("best").textContent = L.best;
}
let current = "channel";
function show(kind, { animate = !reduce } = {}) {
  if (kind === current && animate) return;
  current = kind;
  const L = letterFor(kind);
  for (const b of $$("[data-kind]")) b.setAttribute("aria-pressed", String(b.dataset.kind === kind));
  const sel = $("[data-res-kind]");
  if (sel) sel.value = kind === "portfolio" ? "photography" : kind;
  setWord(L.word, animate);
  art?.(kind);
  if (!animate) { fill(L, false); return; }
  body.classList.add("swap");
  setTimeout(() => { fill(L, true); body.classList.remove("swap"); }, 220);
}
fill(letterFor("channel"), false);
const artEl = $("[data-art]");
const art = artEl ? mountPixel(artEl, "channel", { reduce }) : null;

/* Once through the five, back to the channel, then still. A pause is always offered while it plays. */
const pauseBtn = $("[data-pause]");
let tour = null;
function stopTour() {
  clearInterval(tour); tour = null;
  pauseBtn.hidden = true;
}
function startTour() {
  if (reduce) return;
  const seq = [...ORDER.slice(1), "channel"];
  let i = 0;
  pauseBtn.hidden = false;
  tour = setInterval(() => {
    show(seq[i++]);
    if (i >= seq.length) stopTour();
  }, 3400);
}
pauseBtn.addEventListener("click", stopTour);
for (const b of $$("[data-kind]")) b.addEventListener("click", () => { stopTour(); show(b.dataset.kind); });

/* ---------------------------------------------------------------- one entrance, once */
function enter() {
  if (reduce) return;
  const lines = $$(".cover .ln, .cover .lede, .cover .sub, .cover .kinds, .cover .cta");
  lines.forEach((el, i) => el.animate([{ transform: "translateY(34px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 920, delay: 120 + i * 70, easing: EASE, fill: "backwards" }));
  $("[data-letter]").animate([{ transform: "translateY(34px) scale(0.97)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 1100, delay: 320, easing: EASE, fill: "backwards" });
}
enter();
setTimeout(startTour, reduce ? 0 : 2600);

/* ---------------------------------------------------------------- the contents */
const X = figures();
const r = X.rate;
const reach = r.parts.find((p) => p.key === "reach");
const T = X.take;
const ENTRIES = [
  {
    title: "Rate my work", href: "../products/rate/", promise: "Your work, rated against creators your size.",
    big: esc(r.signed), fig: `${esc(r.band)}, beats ${reach.score} in 100. Made up.`, src: "",
    fee: "Free, for good.",
    more: `Upload the export you already have, from YouTube Studio, Substack, your podcast host or Spotify for Creators, and get the number, the band and a percentile for each part. Zero is typical. It runs on your device and nothing is uploaded.`,
  },
  {
    title: "The Record", promise: "Read from payouts, not estimates.",
    big: X.record ? esc(X.record.paid) : "", fig: X.record ? `paid, not <s>${esc(X.record.estimate)}</s>. Made up.` : "", src: "",
    fee: "Free.", api: true,
    more: `A read-only Stripe App with seven read permissions and none that writes. Where YouTube estimated one figure and AdSense paid another, your record keeps the one you were paid. One install covers direct sales and any newsletter platform that charges through your own Stripe.`,
  },
  {
    title: "Podcasts", href: "../products/podcasts/", promise: "Free measurement, now Chartable has gone.",
    big: `<span data-pod>&nbsp;</span>`, fig: "downloads in 28 days. A made-up show.", src: "",
    fee: "Free, for good.",
    more: `Put Orbe's prefix in front of each episode file and it counts downloads by IAB-style rules, with a daily-salted listener hash in place of an IP address. A dashboard by day, episode, app and country, charts, smart links, and connectors for the hosts you already use.`,
  },
  {
    title: "Plausibility check", href: "../products/podcasts/#plausibility", promise: "A download claim, against the public signals.",
    big: X.plausibility ? `${X.plausibility.flags} flags` : "", fig: X.plausibility ? `${esc(X.plausibility.verdict)}: 310,000 claimed. Made up.` : "", src: "",
    fee: "Free.",
    more: `Paste a claim and the public signals beside it. The check flags what doesn't add up by severity, and gives the innocent reading where there is one. Every threshold is provisional and versioned.`,
  },
  {
    title: "Sponsorships", href: "../products/sponsorships/", promise: "A fair price for your slot, and briefs that fit it.",
    big: X.sponsorship ? esc(X.sponsorship.range) : "", fig: "an integrated read, 85k subscribers. Made up.", src: "",
    fee: `${T.sponsorship.networkBps / 100}% if Orbe finds the brand, ${T.sponsorship.directBps / 100}% if you bring it. Paid by the brand, never from your price.`, api: "Matching and bookings",
    more: `Priced from what your recent works actually delivered, with the reasons and the rate cards behind it, for each format you make. A brand's brief is matched against creators who opted in and shortlisted within its budget. Free for creators.`,
  },
  {
    title: "Selling", href: "../products/selling/", promise: "What it might be worth, every factor explained.",
    big: X.selling ? esc(X.selling.range) : "", fig: X.selling ? `indicative, confidence ${esc(X.selling.confidence)}. Made up.` : "", src: "",
    fee: `Seller: 8% to £500k, 5% to £2M, 3% above, £4,000 minimum, nothing if it doesn't sell. Buyer's premium: 2%, 1% above £2M, £1,000 minimum.`,
    more: X.selling ? `Most people just like knowing. If you ever do sell, the fee is worked out slice by slice: on a ${esc(X.selling.at)} sale the seller pays ${esc(X.selling.fee)} and the buyer's premium is ${esc(X.selling.premium)}. Indicative only, and not advice, a valuation or an offer.` : "",
  },
  {
    title: "Diligence", href: "../products/diligence/", promise: "The report a buyer reads before an offer.",
    big: X.diligence ? `${X.diligence.months} months` : "", fig: X.diligence ? `read from ${X.diligence.sources} sources. Made up.` : "", src: "",
    fee: "£1,500, charged only if the buyer walks away.",
    more: `Every verified figure with where it came from and the day it was read, the cross-checks, what could not be checked and why, and the questions to ask. Download it or print it.`,
  },
  {
    title: "Lending", promise: "A lender reads the same record you do.",
    big: "", fig: "", src: "",
    fee: "A fixed fee per file.", api: true,
    more: `A lender reads what you were paid, at source and only with your consent, rather than an estimate. Orbe charges a fixed fee for each file.`,
  },
  {
    title: "The guide", promise: "After every post, three next steps.",
    big: X.guide ? esc(X.guide.match(/[\d.]+×/)?.[0].replace("×", "x") ?? "") : "", fig: "a typical upload, best of twelve. Made up.", src: "",
    fee: "Free.", api: true,
    more: `An after-post report against your own start and against creators your size at the same age, why the best works worked, and three next steps. Every suggestion cites a figure of your own, and nothing is claimed as cause.`,
  },
  {
    title: "The State of the Middle", promise: "What the middle actually earns, each season.",
    big: X.middle ? esc(X.middle.value) : "", fig: X.middle ? `typical reach, channels ${esc(X.middle.label)}` : "", src: "",
    fee: "Free to read.", api: true,
    more: X.middle ? `${esc(X.middle.line)} A versioned dataset each season from consenting creators' read records, with a plain-English summary and where you sit.` : "",
  },
];
const plus = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
$("[data-index]").innerHTML = ENTRIES.map((e, i) => {
  const no = String(i + 1).padStart(2, "0");
  const id = `more-${no}`;
  const title = e.href ? `<a href="${e.href}">${esc(e.title)}</a>` : esc(e.title);
  const api = e.api ? `<span class="e-api">${e.api === true ? "Switches on with the API" : `${esc(e.api)} switch on with the API`}</span>` : "";
  return `<li class="entry">
    <div class="entry-row">
      <span class="e-no" aria-hidden="true">${no}</span>
      <div><h3 class="e-title">${title}</h3><p class="e-promise">${esc(e.promise)}</p></div>
      <p class="e-fig">${e.big ? `<span class="e-big">${e.big}</span>` : ""}${e.fig ? `<span class="e-line">${e.fig}${e.src ? `. <span class="e-src">${e.src}</span>` : ""}</span>` : ""}</p>
      <p class="e-fee">${esc(e.fee)}${api}</p>
      <button type="button" class="e-more" aria-expanded="false" aria-controls="${id}" aria-label="More about ${esc(e.title)}">${plus}</button>
    </div>
    <div class="e-detail" id="${id}" hidden><p class="e-detail-in">${e.more}${e.href ? ` <a href="${e.href}">Open the tool</a>.` : ""}</p></div>
  </li>`;
}).join("");

/* Detail expands in place: the row's height animates once, then sits at auto. */
for (const b of $$(".e-more")) b.addEventListener("click", () => {
  const panel = document.getElementById(b.getAttribute("aria-controls"));
  const open = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", String(open));
  const inner = panel.firstElementChild;
  if (open) {
    panel.hidden = false;
    const h = inner.getBoundingClientRect().height;
    if (reduce) { panel.style.height = "auto"; return; }
    panel.style.height = "0px"; void panel.offsetHeight; panel.style.height = `${h}px`;
    panel.addEventListener("transitionend", () => { if (b.getAttribute("aria-expanded") === "true") panel.style.height = "auto"; }, { once: true });
  } else {
    if (reduce) { panel.style.height = "0px"; panel.hidden = true; return; }
    panel.style.height = `${panel.getBoundingClientRect().height}px`; void panel.offsetHeight; panel.style.height = "0px";
    panel.addEventListener("transitionend", () => { if (b.getAttribute("aria-expanded") === "false") panel.hidden = true; }, { once: true });
  }
});

/* The podcast figure: the engine's own sample listening, over the made-up feed. */
(async () => {
  const out = $("[data-pod]");
  try {
    const xml = await (await fetch("../products/fixtures/made-up-feed.xml")).text();
    const feed = readFeedDetails(xml);
    const s = sampleDashboard({ feed, feedUrl: "https://example.invalid/feed.xml", showId: "thelongtable", through: "2026-10-18" });
    out.textContent = count(s.dashboard.downloads.total);
  } catch {
    out.textContent = "Sample";
  }
})();

/* ---------------------------------------------------------------- put your name down */
const form = $("[data-res]");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = form.elements;
  const h = cleanHandle(f.handle.value);
  const err = $("[data-res-err]");
  const done = $("[data-res-done]");
  done.textContent = "";
  if (!h) { err.textContent = "Type the handle you'd like to keep."; f.handle.setAttribute("aria-invalid", "true"); f.handle.focus(); return; }
  err.textContent = ""; f.handle.removeAttribute("aria-invalid");
  const res = await reserve({ handle: h, kind: f.kind.value });
  done.textContent = res.via === "api" ? `You're in the book, @${h}.` : `Your email app has the request for @${h}. Send it and the handle is held.`;
});
