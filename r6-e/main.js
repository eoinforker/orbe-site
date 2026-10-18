/* Orbe r6-e: Wrapped, the story. Every figure comes from the engine via examples.js. */
import { example, ORDER, BANDS, EXAMPLE_LINE, CARD_EXAMPLE_LINE } from "../assets/r5/examples.js";
import { renderCard, downloadPng } from "../assets/r5/card.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

document.documentElement.classList.add("js");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const wide = matchMedia("(min-width: 1024px)");

/* ---------- the brand colour: Blue or Pink ---------- */
const swatches = $$(".swatch button");
let cardSvg = "";
function setColour(c, save) {
  document.documentElement.dataset.c = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  if (save) {
    try { localStorage.setItem("orbe-r6e-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
  if (cardSvg) drawCard();
}
setColour(document.documentElement.dataset.c === "pink" ? "pink" : "blue", false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- the made-up newsletter, rated live ---------- */
const e = example("newsletter");
/* The story leads with new paying subscribers, not opens: tracked opens include machine opens. */
const reach = e.parts.find((p) => p.key === "conversion") ?? e.parts[0];
const paidSentence = e.explain.split(/(?<=\.) /).find((x) => /paying/.test(x));
const firstSentence = paidSentence ? paidSentence.split(", better than")[0].replace(/\.$/, "") + "." : reach.what;

const bind = {
  size: e.sizeBand,
  reach: String(reach.score),
  peers: e.peers,
  peers2: e.peers,
  reachWhat: firstSentence,
  signed: e.signed,
  band: e.band,
  handle: e.handle,
  handle2: e.handle,
  handle3: e.handle,
  season: e.card.season.name,
  exampleLine: EXAMPLE_LINE,
  exampleLine2: EXAMPLE_LINE,
  cardLine: CARD_EXAMPLE_LINE,
};
for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) el.textContent = bind[el.dataset.b];

$("[data-strip]").innerHTML = Array.from({ length: 100 }, (_, k) => `<i${k < reach.score ? ' class="in"' : ""} style="--k:${k}"></i>`).join("");
$("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
$("[data-parts]").innerHTML = e.parts.map((p) => `<li><b>${p.score}</b><span>${p.name}<small>${p.value}</small></span></li>`).join("");

/* ---------- the real card, drawn by the product's own code, in the brand theme for the colour ---------- */
const c = e.card;
function drawCard() {
  cardSvg = renderCard(e.result, {
    moment: "best", format: "story", theme: document.documentElement.dataset.c === "pink" ? "pink" : "blue", handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: "r6e",
    works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image,
  });
  $("[data-card]").innerHTML = cardSvg;
}
drawCard();
$("[data-save]").addEventListener("click", async (ev) => {
  const b = ev.currentTarget;
  b.disabled = true;
  try { await downloadPng(cardSvg, "orbe-marginnotes-best-story.png"); b.textContent = "Saved"; }
  catch { b.textContent = "Try again"; }
  b.disabled = false;
});

/* ---------- the second door: every example, rated live ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  return `<li><span class="rl-n">${x.name}<small>${x.label}, ${x.sizeBand}</small></span><b class="rl-r">${x.signed}</b><span class="rl-b">${x.band}</span></li>`;
}).join("");

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- numbers that arrive ---------- */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (reduce || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  const dur = 1000;
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  el.setAttribute("aria-label", final);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    el.textContent = sign + (target * ease(t)).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ---------- the story ---------- */
const moments = $$(".mo");
const bars = $$(".bars i");
const N = moments.length;
let cur = -1;

function setScene(i, { replayBar = false } = {}) {
  const changed = i !== cur;
  cur = i;
  document.body.dataset.scene = String(i);
  bars.forEach((b, k) => {
    b.classList.toggle("done", k < i);
    if (k === i && (changed || replayBar)) { b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); }
    else if (k !== i) b.classList.remove("on");
  });
  const pos = $("[data-pos]"); if (pos && i < N) pos.textContent = String(i + 1);
  moments.forEach((q, k) => q.classList.toggle("is-on", k === i));
  const p = moments[i];
  if (p && changed) {
    const first = !p.classList.contains("seen");
    p.classList.add("seen");
    for (const el of $$("[data-count]", p)) if (wide.matches || first) countUp(el);
  }
}

/* Phone: the page scrolls; the moment at the middle of the screen is the scene. Past the story, scene 4+. */
const panels = $$(".panel");
function sceneFromScroll() {
  const mid = innerHeight * 0.5;
  for (let k = panels.length - 1; k >= 0; k--) if (panels[k].getBoundingClientRect().top <= mid) return N + k;
  for (let k = N - 1; k >= 0; k--) if (moments[k].getBoundingClientRect().top <= mid) return k;
  return 0;
}
let ticking = false;
addEventListener("scroll", () => {
  if (wide.matches || ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; const s = sceneFromScroll(); if (s !== cur) setScene(s); });
}, { passive: true });

function goPhone(i) {
  const t = moments[Math.max(0, Math.min(N - 1, i))];
  t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/* Tap the right of a moment for the next, the left for the one before. */
$(".story").addEventListener("click", (ev) => {
  if (wide.matches) return;
  if (ev.target.closest("a, button, input, select, label, form, textarea, .post")) return;
  if (cur >= N - 1) return;
  goPhone(ev.clientX < innerWidth * 0.3 ? cur - 1 : cur + 1);
});

/* Desktop: the story plays in the phone, and the page wears its colour. */
function show(i) { setScene(((i % N) + N) % N, { replayBar: true }); }
function framed() {
  if (wide.matches) {
    bars.forEach((b, k) => b.style.setProperty("--dur", k === N - 1 ? "8000ms" : "5200ms"));
    show(cur < 0 || cur > N - 1 ? 0 : cur);
  } else {
    moments.forEach((q) => q.classList.remove("is-on"));
    setScene(sceneFromScroll());
  }
}
$(".bars").addEventListener("animationend", (ev) => {
  if (!wide.matches || reduce) return;
  if (ev.target === bars[cur]) show(cur + 1);
});
for (const b of $$("[data-go], [data-step]")) b.addEventListener("click", () => show(cur + Number(b.dataset.go ?? b.dataset.step)));
wide.addEventListener?.("change", framed);
framed();

/* ---------- reserving a handle: one handle and one kind, everywhere ---------- */
const handles = $$("[data-handle]");
const kinds = $$("[data-kind]");
const mirrors = $$("[data-mirror]");
const peersYou = $("[data-peers-you]");
function syncHandles(src) {
  for (const h of handles) if (h !== src) h.value = src.value;
  const h = cleanHandle(src.value);
  for (const m of mirrors) m.textContent = h || "yourhandle";
  document.body.classList.toggle("typed", !!h);
}
for (const h of handles) h.addEventListener("input", () => syncHandles(h));
function syncKind(src) {
  for (const k of kinds) if (k !== src) k.value = src.value;
  peersYou.textContent = example(src.value).peers;
}
for (const k of kinds) k.addEventListener("change", () => syncKind(k));

$("[data-peek]").addEventListener("click", () => { if (wide.matches) show(N - 1); else goPhone(N - 1); });

/* The reply bar carries the handle into the last moment. */
$("[data-jump]").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("[data-handle]", ev.currentTarget);
  syncHandles(input);
  goPhone(N - 1);
  const target = $(".stack-form " + (cleanHandle(input.value) ? "button" : "input"));
  setTimeout(() => target.focus({ preventScroll: true }), reduce ? 0 : 600);
});

for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = cleanHandle(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-done"); input.focus(); return; }
    const kind = $("select", form).value;
    const res = await reserve({ handle: h, kind });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is yours. Ratings open with YouTube: connect your channel to see yours.`
      : `Your email has opened with the request for @${h}. Send it and orbe.vc/@${h} is held for you.`;
  });
}
