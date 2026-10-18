/* Orbe r6-e: the story. Every figure comes from the engine via examples.js. */
import { example, ORDER, BANDS, EXAMPLE_LINE, mathsFor } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

document.documentElement.classList.add("js");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let reduce = false;
try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
const wide = matchMedia("(min-width: 1024px)");
const handleOf = (v) => cleanHandle(v).toLowerCase();

/* ---------- the brand colour: Blue or Pink, mapped to the tokens' data-scheme ---------- */
const swatches = $$(".swatch button");
function setColour(c, save) {
  document.documentElement.dataset.c = c;
  document.documentElement.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  if (save) {
    try { localStorage.setItem("orbe-r6e-colour", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
setColour(document.documentElement.dataset.c === "pink" ? "pink" : "blue", false);
swatches.forEach((b) => b.addEventListener("click", () => setColour(b.dataset.c, true)));

/* ---------- the painting: cut-paper layers drawn in code, flat colour, one ember sun ---------- */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/* A smooth line through points (Catmull-Rom as Béziers). */
function curve(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function ridge(r, w, f, step = 30) {
  const pts = [];
  for (let x = -20; x < w + 20; x += step) pts.push([x, f(x) + (r() - 0.5) * 2]);
  pts.push([w + 20, f(w + 20)]);
  return pts;
}
const shape = (pts, h) => `${curve(pts)} L${pts.at(-1)[0]} ${h} L${pts[0][0]} ${h} Z`;
function poplar(x, base, h, wid) {
  return `M${x} ${base} C${x - wid} ${base - h * 0.25} ${x - wid * 0.8} ${base - h * 0.75} ${x} ${base - h} C${x + wid * 0.8} ${base - h * 0.75} ${x + wid} ${base - h * 0.25} ${x} ${base}Z`;
}
/* Trees for a width: a stand of poplars and one round tree, repeated across wide ground. */
function grove(w) {
  const stands = [];
  for (let o = 0; o < w; o += 390) stands.push([o + 52, 58, 9], [o + 68, 72, 10], [o + 84, 50, 8], [o + 342, 46, 8]);
  return stands.filter(([x]) => x < w);
}

function paint(svg, { w = 390, h = 300, seed = 7, sun = true, hz = 0 } = {}) {
  const r = rng(seed);
  const farF = (x) => 150 + hz + Math.sin(x / 70 + 1.2) * 9 + Math.sin(x / 23) * 2;
  const midF = (x) => 190 + hz + Math.sin((x / 390) * Math.PI * 2 + 0.4) * 12 - Math.sin(x / 95 + 0.4) * 8;
  const fieldF = (x) => 230 + hz + Math.sin(x / 120) * 5;
  const groundF = (x) => 264 + hz + Math.sin(x / 80 + 2) * 5;
  const far = ridge(r, w, farF), mid = ridge(r, w, midF), field = ridge(r, w, fieldF, 40), ground = ridge(r, w, groundF, 40);
  const id = `l${seed}`;
  let s = `<rect class="l-sky" x="-20" y="0" width="${w + 40}" height="${h}"/>`;
  if (sun) s += `<circle class="l-sun" cx="${w * 0.77}" cy="${132 + hz}" r="30"/>`;
  s += `<path class="l-far" d="${shape(far, h)}"/>`;
  s += `<clipPath id="${id}m"><path d="${shape(mid, h)}"/></clipPath><path class="l-mid" d="${shape(mid, h)}"/>`;
  s += `<g clip-path="url(#${id}m)">`;
  for (let k = 0; k < 3; k++) s += `<path class="l-stripe" d="${curve(mid.map(([x, y]) => [x, y + 10 + k * 9]))}"/>`;
  s += `</g>`;
  for (const [x, hh, ww] of grove(w)) s += `<path class="l-tree" d="${poplar(x, midF(x) + 6, hh, ww)}"/>`;
  for (let o = 236; o < w; o += 390) { const tb = midF(o) + 4; s += `<path class="l-tree" d="M${o - 22} ${tb} c-6 -20 6 -36 22 -38 c16 2 28 18 22 38 Z"/>`; }
  s += `<clipPath id="${id}f"><path d="${shape(field, h)}"/></clipPath><path class="l-field" d="${shape(field, h)}"/>`;
  s += `<g clip-path="url(#${id}f)">`;
  /* furrows run to one point past the field, so it lies flat */
  for (let x0 = -w; x0 < w * 2; x0 += 34) { const vx = w / 2 + (x0 - w / 2) * 0.22; s += `<path class="l-furrow" d="M${x0} ${h} L${vx.toFixed(1)} ${fieldF(vx) - 2}"/>`; }
  s += `</g>`;
  s += `<path class="l-ground" d="${shape(ground, h + 2)}"/>`;
  svg.innerHTML = s;
}
const land = $("[data-land]");
if (land) paint(land, { seed: 7 });
const landHero = $("[data-land-hero]");
if (landHero) paint(landHero, { seed: 31, w: 1440, sun: false, hz: 10 });

/* ---------- every kind can play the story ---------- */
const initials = { channel: "FR", newsletter: "MN", stream: "NS", podcast: "LT", portfolio: "LP" };
const trayLabel = { channel: "Channel", newsletter: "Newsletter", stream: "Stream", podcast: "Podcast", portfolio: "Photos" };
const tray = $("[data-tray]");
tray.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false"><span class="tr-av" aria-hidden="true">${initials[k]}</span><span class="tr-k">${trayLabel[k]}</span></button>`).join("");

let kind = "channel";
let said = "";
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
function setKind(k, { recount = true } = {}) {
  kind = k;
  const e = example(k);
  /* Newsletters lead with new paying subscribers, not opens: tracked opens include machine opens. */
  const lead = k === "newsletter" ? e.result.parts.find((p) => p.key === "conversion") : e.parts[0];
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => e.result.parts.find((p) => p.key === key)) : e.parts;
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, size: e.sizeBand, lead: String(lead.score), peers: e.peers, fact: firstSentence(e, lead),
    initials: initials[k], signed: e.signed, band: e.band,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    line1: EXAMPLE_LINE, line2: EXAMPLE_LINE, line3: EXAMPLE_LINE + " Painting drawn by Orbe.",
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-ms]").style.setProperty("--to", lead.score / 100);
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  $("[data-parts]").innerHTML = parts.map((p) => `<li><b>${p.score}</b><span>${p.name}<small>${p.value}</small></span></li>`).join("");
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";
  if (recount && cur >= 0 && cur < 2) for (const el of $$("[data-count]", moments[cur])) countUp(el);
  const m1 = $(".m1");
  m1.classList.remove("fill"); void m1.offsetWidth; m1.classList.add("fill");
}
tray.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });

/* ---------- the second door: every example, rated live ---------- */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  return `<li><span class="rl-av" aria-hidden="true">${initials[k]}</span><span class="rl-n">${x.name}<small>${x.label}, ${x.sizeBand}</small></span><b class="rl-r">${x.signed}</b><span class="rl-b">${x.band}</span></li>`;
}).join("");

/* ---------- wordmarks ---------- */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });

/* ---------- numbers that arrive: once, from zero, no bounce ---------- */
function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (reduce || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  const dur = 900;
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, (now - t0) / dur);
    el.textContent = sign + (target * ease(t)).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ---------- the story ---------- */
const moments = $$(".mo");
const fills = $$("[data-fill]");
const N = moments.length;
let cur = -1;
let paused = false;
const phone = $(".phone");

function setScene(i, { replay = false } = {}) {
  const changed = i !== cur;
  cur = i;
  document.body.dataset.scene = String(i);
  const k = Math.min(i, N - 1);
  for (const p of $$("[data-pos2]")) p.textContent = String(k + 1).padStart(2, "0");
  const pos = $("[data-pos]"); if (pos) pos.textContent = String(k + 1);
  for (const f of fills) {
    f.style.setProperty("--a", k / N);
    f.style.setProperty("--b", (k + 1) / N);
    if (wide.matches && !reduce && (changed || replay)) { f.classList.remove("run"); void f.offsetWidth; f.classList.add("run"); }
    else if (!wide.matches || reduce) f.classList.remove("run");
  }
  moments.forEach((q, n) => q.classList.toggle("is-on", n === i));
  const p = moments[i];
  if (p && changed) {
    const first = !p.classList.contains("seen");
    p.classList.add("seen");
    if (i === 0) { p.classList.remove("fill"); void p.offsetWidth; p.classList.add("fill"); }
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
  if (ev.target.closest("a, button, input, select, label, form, textarea, .win, blockquote")) return;
  const dir = ev.clientX < innerWidth * 0.3 ? -1 : 1;
  if ((dir > 0 && cur >= N - 1) || (dir < 0 && cur <= 0)) return;
  goPhone(cur + dir);
});

/* Desktop: the story plays in the phone, with a pause, and the page wears its colour. */
function show(i) { setScene(((i % N) + N) % N, { replay: true }); }
function setPaused(v) {
  paused = v;
  phone.classList.toggle("is-paused", v);
  const b = $("[data-pause]");
  b.setAttribute("aria-pressed", String(v));
  b.textContent = v ? "Play" : "Pause";
}
function framed() {
  if (wide.matches) {
    for (const f of fills) f.style.setProperty("--dur", "6000ms");
    show(cur < 0 || cur > N - 1 ? 0 : cur);
  } else {
    moments.forEach((q) => q.classList.remove("is-on"));
    setScene(sceneFromScroll());
  }
}
fills[1]?.addEventListener("animationend", () => {
  if (!wide.matches || reduce || paused) return;
  if (cur === N - 1) { setPaused(true); return; }
  show(cur + 1);
});
for (const b of $$("[data-go], [data-step]")) b.addEventListener("click", () => show(cur + Number(b.dataset.go ?? b.dataset.step)));
$("[data-pause]").addEventListener("click", () => { setPaused(!paused); if (!paused) show(cur); });
if (reduce) setPaused(true);
wide.addEventListener?.("change", framed);

setKind("channel", { recount: false });
framed();

/* ---------- the rating is the post: copy the line ---------- */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  try { await navigator.clipboard.writeText(text); out.textContent = "Copied. Paste it under your next post."; }
  catch { out.textContent = text; }
});

/* ---------- reserving a handle: one handle and one kind, everywhere ---------- */
const handles = $$("[data-handle]");
const mirrors = $$("[data-mirror]");
function syncHandles(src) {
  for (const h of handles) if (h !== src) h.value = src.value;
  const h = handleOf(src.value);
  for (const m of mirrors) m.textContent = h || "yourhandle";
  document.body.classList.toggle("typed", !!h);
}
for (const h of handles) h.addEventListener("input", () => syncHandles(h));
for (const k of $$("[data-kind]")) k.addEventListener("change", () => setKind(k.value));


/* The reply bar carries the handle into the last moment. */
$("[data-jump]").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("[data-handle]", ev.currentTarget);
  syncHandles(input);
  goPhone(N - 1);
  const target = $(".stack-form " + (handleOf(input.value) ? "button" : "input"));
  setTimeout(() => target.focus({ preventScroll: true }), reduce ? 0 : 600);
});

for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-done"); input.focus(); return; }
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
