/*
  Orbe's desk: the sentence, the engine, and the desk they drive.
  Every figure comes from the Orbe engine at load: the rating engine rates five made-up creators,
  the record engine reads a made-up channel's payouts. Nothing on the desk is typed in by hand.
*/
import { example } from "../../assets/r5/examples.js";
import { suspiciousCreator } from "../../assets/engine/record/browser.js";
import { TAKE_RATE } from "../../assets/engine/market/browser.js";
import { reserve, cleanHandle } from "../../assets/r5/reserve.js";
import { mountWordmark } from "../../assets/r5/wordmark.js";

const $ = (s, r = document) => r.querySelector(s);
const root = document.documentElement;
const still = root.classList.contains("still");
const hasGL = root.classList.contains("gl");

/* ================================================================ the engine */
const gbp = (pence) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
const SOURCE = { adsense: "AdSense" };
const NOVA = (() => {
  const c = suspiciousCreator();
  const months = [...new Set(c.revenue.map((l) => l.month))].sort();
  const last = months.at(-1);
  const ads = c.revenue.filter((l) => l.month === last && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source !== "youtube_analytics");
  const name = (c.accounts.find((a) => a.kind === "youtube")?.title ?? "Nova Plays").replace(/\s*\(fixture\)/, "");
  const month = new Date(last).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { name, month, est: est.gross.amount, paid: paid.gross.amount, via: SOURCE[paid.provenance.source] ?? paid.provenance.source };
})();

/* the fees, as the market engine's schedule states them */
const pct = (bps) => `${bps / 100}%`;
const FEES = [
  { rate: "Free", what: "Your rating and record", free: true },
  { rate: pct(TAKE_RATE.sponsorship.networkBps), what: "A sponsor Orbe finds", who: "paid by the brand" },
  { rate: pct(TAKE_RATE.sponsorship.directBps), what: "A sponsor you bring", who: "paid by the brand" },
  { rate: pct(TAKE_RATE.seller.tiers[0].rateBps), what: "Selling, to £500k", who: "if it sells" },
  { rate: pct(TAKE_RATE.buyerPremium.tiers[0].rateBps), what: "Buyer's premium", who: "paid by the buyer" },
];

const WORD = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "podcast", portfolio: "photos" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function kindData(key) {
  const e = example(key);
  const reach = e.parts.find((p) => p.key === "reach") ?? e.parts[0];
  const n = reach.score;
  const pb = e.card.personalBest;
  const paper = key === "channel"
    ? { who: NOVA.name, what: `Ad revenue, ${NOVA.month}`, struckLabel: "Estimate", struck: gbp(NOVA.est), keptLabel: "Paid", kept: gbp(NOVA.paid),
        note: [`Read from the ${NOVA.via} payout.`, "The estimate is not kept."], source: "Made up, read live by the Orbe record engine." }
    : { who: e.handle, what: cap(pb.label), struckLabel: "Was", struck: pb.previous, keptLabel: "Now", kept: pb.value,
        note: ["A personal best, counted from", `${e.name}'s own works.`], source: "Made up, rated live by the Orbe engine." };
  return {
    key, word: WORD[key], n, handle: e.handle, name: e.name, peers: e.peers,
    window: { handle: e.handle, n, peers: e.peers, sizeBand: e.sizeBand, parts: e.parts.map((p) => ({ name: p.name, score: p.score })) },
    paper,
    sayWindow: `On the monitor, a window called orbe/${e.handle}/rating says: You beat ${n} in 100 ${e.peers} your size. ${e.name} is a made-up ${e.label.toLowerCase()}, rated live by the Orbe engine.`,
    sayPaper: `On the paper, the record for ${paper.who}, ${paper.what.toLowerCase()}: ${paper.struckLabel.toLowerCase()} ${paper.struck}, struck through. ${paper.keptLabel} ${paper.kept}.`,
  };
}
const ROUND = ["channel", "newsletter", "stream", "podcast", "portfolio", "channel"];
const DATA = Object.fromEntries([...new Set(ROUND)].map((k) => [k, kindData(k)]));

/* ================================================================ the sentence: Odin's word change, measured */
const slot = $("[data-slot]");
const EASE_W = "cubic-bezier(0.45, 0, 0.2, 1)";
function chars(word) {
  const w = document.createElement("span");
  w.className = "w";
  w.setAttribute("data-w", "");
  for (const ch of word) { const c = document.createElement("span"); c.className = "c"; c.textContent = ch; w.appendChild(c); }
  return w;
}
function swapWord(word) {
  const old = slot.querySelector(".w:not(.out)");
  if (old && old.textContent === word) return;
  const from = slot.getBoundingClientRect().width;
  const next = chars(word);
  if (old) old.classList.add("out");
  slot.appendChild(next);
  slot.style.width = "auto";
  const to = slot.getBoundingClientRect().width;
  slot.style.width = from + "px";
  slot.animate([{ width: from + "px" }, { width: to + "px" }], { duration: 450, easing: EASE_W, fill: "forwards" })
    .finished.then(() => { slot.getAnimations().forEach((a) => a.cancel()); slot.style.width = ""; }).catch(() => {});
  if (old) {
    old.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 360, easing: EASE_W, fill: "forwards" });
    [...old.children].forEach((c, i) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: i * 12, easing: "linear", fill: "forwards" }));
    setTimeout(() => old.remove(), 420);
  }
  [...next.children].forEach((c, i) => c.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 360, delay: i * 24, easing: EASE_W, fill: "backwards" }));
}

/* ================================================================ the desk */
const canvas = $("[data-desk]");
const stage = $("[data-stage]");
const hint = $("[data-hint]");
let desk = null;

function describe(d) {
  $("[data-say-window]").textContent = d.sayWindow;
  $("[data-say-paper]").textContent = d.sayPaper;
  canvas.setAttribute("aria-label", `Orbe's desk. The orb is filled to ${d.n} in 100.`);
}
function show(key, { instant = false } = {}) {
  const d = DATA[key];
  if (!instant) swapWord(d.word);
  describe(d);
  labelFor(d);
  desk?.setKind(d, { instant });
  if (!hasGL) stillFor(key);
}

const ASKED = (() => { try { const k = new URLSearchParams(location.search).get("kind"); return k && DATA[k] ? k : null; } catch { return null; } })();
/* without WebGL the desk is a rendered still per kind, painted as the hero's background so it always sits under the type */
const heroEl = $("[data-hero]");
function stillFor(key) {
  heroEl.style.setProperty("--still-d", `url("assets/still-${key}.webp")`);
  heroEl.style.setProperty("--still-m", `url("assets/still-${key}-phone.webp")`);
}
async function boot() {
  describe(DATA.channel);
  if (!hasGL) stillFor(ASKED ?? "channel");
  labelFor(DATA.channel);
  for (const k of [...new Set(ROUND)]) if (tags["rack-" + k]) tags["rack-" + k].textContent = DATA[k].n;
  if (!hasGL) return;
  try {
    const hero = $("[data-hero]");
    // the room the desk is framed into: under the sentence, running down behind the form
    const act = $("[data-reserve]");
    const room = () => {
      const h = hero.getBoundingClientRect(), s = stage.getBoundingClientRect(), a = act.getBoundingClientRect();
      const top = s.top - h.top, bottom = a.top - h.top + (innerWidth < 720 ? -10 : a.height * 0.5);
      return { left: s.left - h.left, top, width: s.width, height: bottom - top };
    };
    await document.fonts.load('11px "Departure Mono"');
    await Promise.all(['500 30px "Commit Mono"', '600 64px "Schibsted Grotesk"', '400 38px "Schibsted Grotesk"'].map((f) => document.fonts.load(f).catch(() => {})));
    const { createDesk } = await import("./scene.js");
    desk = await createDesk({ canvas, room, still, onFirstFrame: () => { canvas.classList.add("ready"); canvas.dispatchEvent(new Event("desk:ready")); } });
    desk.setKind(DATA[ASKED ?? "channel"], { instant: true });
    if (ASKED) { swapWord(DATA[ASKED].word); labelFor(DATA[ASKED]); describe(DATA[ASKED]); }
    desk.setLedger(FEES);
    desk.setRack(Object.fromEntries(Object.values(DATA).map((d) => [d.key, d.n / 100])));
    desk.onFrame = placeTags;
    desk.onTouch = () => { hint.classList.remove("on"); };
    if (!still) {
      desk.drop();
      setTimeout(() => hint.classList.add("on"), 1400);
    }
    window.__desk = desk;
  } catch (err) {
    console.warn("The desk could not be drawn; showing the still.", err);
    root.classList.remove("gl"); root.classList.add("nogl");
    stillFor(ASKED ?? "channel");
    canvas.dispatchEvent(new Event("desk:ready"));
  }
}

/* ================================================================ the labels: engine figures pinned to the objects */
const tagsEl = $("[data-tags]");
const tags = Object.fromEntries([...tagsEl.querySelectorAll("[data-tag]")].map((t) => [t.dataset.tag, t]));
function placeTags(at) {
  for (const k in tags) {
    const p = at[k];
    if (!p) continue;
    const t = tags[k], gap = t.classList.contains("tag-s") ? 8 : 14, w = t.offsetWidth;
    // kept on screen: the label slides along, its leader stays over the object
    const x = Math.max(8, Math.min(innerWidth - w - 8, p.x - w / 2));
    t.style.transform = `translate(${Math.round(x)}px, ${Math.round(p.y - t.offsetHeight - gap)}px)`;
    t.style.setProperty("--lead", `${Math.round(p.x - x)}px`);
  }
  tagsEl.classList.add("on");
}
function labelFor(d) {
  $("[data-tag-n]").textContent = d.n;
  $("[data-tag-peers]").textContent = d.peers;
  tags.paper.textContent = d.key === "channel" ? "Paid, not estimated" : "A personal best";
  for (const k of ROUND) tags["rack-" + k]?.classList.toggle("is-now", k === d.key);
}

/* ================================================================ once round, then stop; pause and replay */
const pauseBtn = $("[data-pause]");
const pauseLabel = $("[data-pause-label]");
const pauseIcon = $("[data-pause-icon]");
const ICON = { pause: "M3 2h2v8H3zM7 2h2v8H7z", play: "M3 1.5v9l7.5-4.5z" };
const HOLD = 1900;
let at = 0, timer = 0, paused = false;
function setButton(state) {
  pauseIcon.setAttribute("d", state === "pause" ? ICON.pause : ICON.play);
  pauseLabel.textContent = state === "pause" ? "Pause" : state === "resume" ? "Play" : "Again";
  pauseBtn.setAttribute("aria-pressed", String(state === "resume"));
  pauseBtn.setAttribute("aria-label", state === "pause" ? "Pause the changing word" : state === "resume" ? "Play the changing word" : "Play the changing word again");
}
function schedule(delay = HOLD) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (paused) return;
    at += 1;
    show(ROUND[at]);
    if (at < ROUND.length - 1) schedule();
    else setButton("again");
  }, delay);
}
pauseBtn.addEventListener("click", () => {
  if (at >= ROUND.length - 1) { at = 0; paused = false; setButton("pause"); schedule(600); return; }
  paused = !paused;
  setButton(paused ? "resume" : "pause");
  if (!paused) schedule(500); else clearTimeout(timer);
});

/* ================================================================ reserve */
const form = $("[data-reserve]");
const input = $("[data-r-handle]");
const note = $("[data-r-note]");
const field = form.querySelector(".field");
const kindNow = () => ROUND[at] === "portfolio" ? "photography" : ROUND[at];
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const h = cleanHandle(input.value).toLowerCase();
  if (!h) {
    note.textContent = "Type the handle you want first.";
    note.classList.add("is-error"); field.classList.add("is-error");
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  note.classList.remove("is-error"); field.classList.remove("is-error"); input.removeAttribute("aria-invalid");
  input.value = h;
  const res = await reserve({ handle: h, kind: kindNow() });
  note.textContent = res.via === "api"
    ? `@${h} is held for you. We'll check it's yours when ratings open.`
    : `Your email app has opened with the request for @${h}. Send it and the handle is held.`;
});
input.addEventListener("input", () => { if (input.value) { note.classList.remove("is-error"); field.classList.remove("is-error"); input.removeAttribute("aria-invalid"); } });

/* ================================================================ the band, from the same engine */
{
  const c = DATA.channel;
  $("[data-band-rating]").textContent = `${c.name} beats ${c.n} in 100 ${c.peers} its size on reach. Only creators your size count.`;
  $("[data-band-record]").textContent = `YouTube estimated ${gbp(NOVA.est)} for ${NOVA.name} in ${NOVA.month}. ${NOVA.via} paid ${gbp(NOVA.paid)}. The record keeps what was paid.`;
  $("[data-band-fees]").textContent = `Free to be rated. ${FEES[1].rate} when Orbe finds the sponsor, ${FEES[2].rate} when you bring one, both paid by the brand.`;
}

/* ================================================================ the menu on small screens */
{
  const btn = $("[data-menu]"), list = $("[data-nav-list]");
  btn.addEventListener("click", () => { const open = !list.classList.contains("open"); list.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && list.classList.contains("open")) { list.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.focus(); } });
}

/* ================================================================ go */
mountWordmark($("[data-wordmark]"), { animate: !still });
mountWordmark($("[data-wordmark-foot]"), { animate: false });
boot();
// the word goes round once, starting when the desk is on screen (or at once without WebGL)
if (!still) {
  pauseBtn.hidden = false;
  setButton("pause");
  const start = () => schedule(2200);
  if (hasGL) canvas.addEventListener("desk:ready", start, { once: true }); else schedule(2600);
}
