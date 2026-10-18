import { mountWordmark } from "../assets/r5/wordmark.js";
import { example, ORDER, EXAMPLE_LINE, CARD_EXAMPLE_LINE } from "../assets/r5/examples.js";
import { renderCard } from "../assets/r5/card.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

/* The brand colour: ?c=blue or ?c=pink, else the last choice, else pink. */
const root = document.documentElement;
function setColour(c, save) {
  root.dataset.c = c;
  $$(".swatch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === c)));
  if (save) { try { localStorage.setItem("orbe-c", c); } catch (e) {} }
  drawCard();
}

/* The art: the Carved wordmark, cut in once, and small again at the foot. */
mountWordmark($("#mark"), { animate: true });
mountWordmark($("#foot-mark"), { animate: false });

/* The reel: a second copy of the lettering so the loop never shows a gap. */
$$(".reel-track").forEach((track) => {
  [...track.children].forEach((li) => { const c = li.cloneNode(true); c.dataset.copy = ""; track.appendChild(c); });
});

/* The rating, set as lettering. Every figure comes from the engine. */
const piece = $("#piece");
const LABEL = { channel: "Channel", newsletter: "Newsletter", stream: "Stream", podcast: "Podcast", portfolio: "Photography" };
const tabs = $("#kinds");
ORDER.forEach((k, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.setAttribute("role", "tab"); b.textContent = LABEL[k]; b.dataset.kind = k;
  b.setAttribute("aria-selected", i === 0 ? "true" : "false");
  b.tabIndex = i === 0 ? 0 : -1;
  b.addEventListener("click", () => show(k, true));
  tabs.appendChild(b);
});
tabs.addEventListener("keydown", (ev) => {
  const bs = [...tabs.children], i = bs.indexOf(document.activeElement);
  if (i < 0 || !["ArrowRight", "ArrowLeft"].includes(ev.key)) return;
  const n = bs[(i + (ev.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
  n.focus(); show(n.dataset.kind, true);
});
$("#p-line").textContent = EXAMPLE_LINE;

const ease = (t) => 1 - Math.pow(1 - t, 4);
let raf = 0;
function setNumber(v) {
  const s = Math.abs(v).toFixed(2).split(".");
  $("#p-sign").textContent = v < 0 ? "−" : "+";
  $("#p-int").textContent = s[0];
  $("#p-dec").textContent = s[1];
}

function show(kind, animate) {
  const e = example(kind);
  tabs.querySelectorAll("button").forEach((b) => { const on = b.dataset.kind === kind; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  $("#p-name").textContent = e.name;
  $("#p-band").textContent = e.band;
  $("#p-num").setAttribute("aria-label", `${e.signed}, ${e.band}`);
  $("#p-foot").textContent = `Against ${e.peers} with ${e.sizeBand}`;
  $("#parts").innerHTML = e.parts.map((p) => `<div><dt>${p.name}</dt><dd>Beats <b>${p.score}<small> in 100</small></b>its size</dd></div>`).join("");
  cancelAnimationFrame(raf);
  if (!animate || reduce) { setNumber(e.rating); piece.classList.remove("is-setting"); return; }
  /* The rating arrives from zero, because zero is typical. */
  piece.classList.add("is-setting");
  const target = e.rating, dur = 1100;
  let t0 = 0;
  const step = (now) => {
    t0 ||= now;
    const t = Math.min(1, (now - t0) / dur);
    setNumber(target * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else piece.classList.remove("is-setting");
  };
  raf = requestAnimationFrame(step);
}

show("channel", false);
if (!reduce && "IntersectionObserver" in window) {
  setNumber(0); piece.classList.add("is-setting");
  const io = new IntersectionObserver((es) => {
    if (!es.some((x) => x.isIntersecting)) return;
    io.disconnect();
    show(tabs.querySelector('[aria-selected="true"]').dataset.kind, true);
  }, { threshold: 0.5 });
  io.observe(piece);
}

/* The card: the real one, drawn by the product's own code, in the brand theme for the current colour. */
function drawCard() {
  const e = example("channel"), c = e.card;
  $("#card-svg").innerHTML = renderCard(e.result, {
    moment: "rating", format: "square", theme: root.dataset.c === "blue" ? "ink-blue" : "ink-pink", handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: "r6c",
    works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image,
  });
  const svg = $("#card-svg svg");
  if (svg) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `${e.name}'s Orbe card: ${e.signed}, ${e.band}.`); }
  $("#card-line").textContent = CARD_EXAMPLE_LINE;
}
setColour(root.dataset.c === "blue" ? "blue" : "pink", false);
$$(".swatch button").forEach((b) => b.addEventListener("click", () => setColour(b.dataset.set, true)));

/* The sign: the handle, lettered as you type it, and held in the brand colour once reserved. */
const sign = $("#hsign"), signName = $("#hs-name"), signFoot = $("#hs-foot");
function fitSign() {
  const box = sign.querySelector(".hs-h");
  const w = box.clientWidth - 24, len = (signName.textContent.length + 0.7) || 1;
  const sz = Math.max(26, Math.min(innerWidth >= 900 ? 112 : 76, w / (len * 0.46)));
  box.style.setProperty("--sz", `${sz.toFixed(1)}px`);
}
function letter(h) {
  if (sign.classList.contains("is-held") && h === signName.textContent) return;
  sign.classList.remove("is-held");
  signName.textContent = h || "yourhandle";
  sign.classList.toggle("is-typed", !!h);
  signFoot.textContent = h ? "Yours to reserve" : "Not yet reserved";
  fitSign();
}
fitSign();
addEventListener("resize", fitSign);

$$("[data-handle]").forEach((input) => input.addEventListener("input", () => {
  const h = cleanHandle(input.value);
  $$("[data-handle]").forEach((o) => { if (o !== input) o.value = input.value; });
  letter(h);
}));

$$("[data-claim]").forEach((form) => form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const input = form.querySelector("[data-handle]"), note = form.querySelector("[data-note]");
  const h = cleanHandle(input.value);
  if (!h) { note.textContent = "Type the handle you want first."; input.focus(); return; }
  letter(h);
  sign.classList.add("is-held");
  if (form !== sign.parentElement.querySelector("[data-claim]")) sign.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  const r = await reserve({ handle: h, kind: "channel" });
  if (r.ok && r.via === "api") { signFoot.textContent = "Reserved. Yours."; note.innerHTML = `<b>@${h} is yours.</b> Ratings open with YouTube: connect your channel to see yours. Newsletters and podcasts next.`; }
  else if (r.ok) { signFoot.textContent = "Held once your email arrives"; note.innerHTML = `<b>One step left:</b> send the email we wrote for you and @${h} is held.`; }
  else { sign.classList.remove("is-held"); signFoot.textContent = "Taken. Try another."; note.textContent = `@${h} is taken. Try another.`; }
}));
