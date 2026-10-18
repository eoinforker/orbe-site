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

/* ---------- a painting, drawn by hand in code: cut shapes, carved marks, no filters ---------- */
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
/* A ridge: y at x, as a gentle shape with a little hand wobble. */
function ridge(r, w, f, step = 26) {
  const pts = [];
  for (let x = -20; x < w + 20; x += step) pts.push([x, f(x) + (r() - 0.5) * 3]);
  pts.push([w + 20, f(w + 20)]);
  return pts;
}
const shape = (pts, h) => `${curve(pts)} L${pts.at(-1)[0]} ${h} L${pts[0][0]} ${h} Z`;
/* A gouge: a tapered cut, like a lino tool leaves. */
function gouge(x, y, len, ang, wid) {
  const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len, nx = -Math.sin(ang) * wid, ny = Math.cos(ang) * wid;
  const mx = x + dx / 2, my = y + dy / 2;
  return `M${x.toFixed(1)} ${y.toFixed(1)} Q${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)} Q${(mx - nx * 0.4).toFixed(1)} ${(my - ny * 0.4).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Z`;
}
function poplar(x, base, h, wid) {
  return `M${x} ${base} C${x - wid} ${base - h * 0.25} ${x - wid * 0.8} ${base - h * 0.75} ${x} ${base - h} C${x + wid * 0.8} ${base - h * 0.75} ${x + wid} ${base - h * 0.25} ${x} ${base}Z`;
}

function paint(svg, { w = 390, h = 300, seed = 7, sun = true, trees = true, hz = 0 } = {}) {
  const r = rng(seed);
  const farF = (x) => 150 + hz + Math.sin(x / 70 + 1.2) * 9 + Math.sin(x / 23) * 3;
  const midF = (x) => 188 + hz + (x / w) * 26 - Math.sin(x / 95 + 0.4) * 16;
  const fieldF = (x) => 228 + hz - (x / w) * 14 + Math.sin(x / 60) * 4;
  const groundF = (x) => 262 + hz + Math.sin(x / 80 + 2) * 6;
  const far = ridge(r, w, farF), mid = ridge(r, w, midF), field = ridge(r, w, fieldF, 30), ground = ridge(r, w, groundF, 34);
  const id = `l${seed}`;
  let s = "";
  if (sun) {
    s += `<circle class="l-sun" cx="300" cy="${128 + hz}" r="40"/>`;
    for (let k = 0; k < 5; k++) s += `<path class="l-sun-cut" d="M${268 + k * 2} ${112 + hz + k * 9} q${30 - k * 1} ${-3 + (r() - 0.5) * 2} ${62 - k * 4} 0" />`;
  }
  s += `<path class="l-far" d="${shape(far, h)}"/>`;
  /* far water: two flat carved lines */
  for (let k = 0; k < 9; k++) { const x = r() * w, y = farF(x) + 8 + r() * 12; s += `<path class="l-cut-soft" d="${gouge(x, y, 14 + r() * 26, (r() - 0.5) * 0.06, 0.9)}"/>`; }
  s += `<clipPath id="${id}m"><path d="${shape(mid, h)}"/></clipPath>`;
  s += `<path class="l-mid" d="${shape(mid, h)}"/>`;
  s += `<g clip-path="url(#${id}m)">`;
  for (let k = 0; k < 7; k++) {
    const off = 9 + k * 7;
    const pts = mid.map(([x, y]) => [x, y + off + Math.sin(x / 40 + k) * 1.2]);
    s += `<path class="l-stripe" d="${curve(pts)}" style="stroke-width:${(2.6 - k * 0.15).toFixed(2)}"/>`;
  }
  s += `</g>`;
  if (trees) {
    for (const [x, hh, ww] of [[52, 58, 9], [68, 72, 10], [84, 50, 8], [342, 46, 8]]) {
      const b = midF(x) + 6;
      s += `<path class="l-tree" d="${poplar(x, b, hh, ww)}"/><path class="l-tree-cut" d="M${x} ${b - 6} L${x} ${b - hh * 0.8}"/>`;
      for (let k = 0; k < 4; k++) s += `<path class="l-cut" d="${gouge(x - 1, b - hh * (0.25 + k * 0.15), ww * 0.7, -0.5, 0.8)}"/>`;
    }
    const tx = 236, tb = midF(tx) + 4;
    s += `<path class="l-tree" d="M${tx} ${tb} m-22 0 c-6 -20 6 -36 22 -38 c16 2 28 18 22 38 Z"/>`;
    for (let k = 0; k < 4; k++) s += `<path class="l-cut" d="${gouge(tx - 14 + k * 6, tb - 12 - k * 5, 10, -0.9 + k * 0.2, 1)}"/>`;
  }
  s += `<clipPath id="${id}f"><path d="${shape(field, h)}"/></clipPath>`;
  s += `<path class="l-field" d="${shape(field, h)}"/>`;
  s += `<g clip-path="url(#${id}f)">`;
  /* furrows that run to a point beyond the field, so the field lies flat */
  for (let k = -9; k <= 18; k++) {
    const x0 = 120 + k * 32, x1 = 195 + k * 7;
    s += `<path class="l-furrow" d="M${x0} ${h} Q${(x0 + x1) / 2 + (r() - 0.5) * 6} ${fieldF(x1) + 30} ${x1} ${fieldF(x1) - 4}"/>`;
  }
  s += `</g>`;
  s += `<path class="l-ground" d="${shape(ground, h + 2)}"/>`;
  /* grass, cut into the ground by hand: short upward gouges along the ridge */
  for (let x = -6; x < w + 6; x += 5 + r() * 6) {
    const y = groundF(x) + 4 + r() * 6;
    s += `<path class="l-cut" d="${gouge(x, y, 7 + r() * 9, -Math.PI / 2 + (r() - 0.5) * 0.7, 1.1)}"/>`;
  }
  for (let k = 0; k < 26; k++) {
    const x = r() * w, y = groundF(x) + 18 + r() * (h - groundF(x) - 18);
    if (y > h - 2) continue;
    s += `<path class="l-cut-soft" d="${gouge(x, y, 8 + r() * 16, (r() - 0.5) * 0.25, 1)}"/>`;
  }
  svg.innerHTML = s;
}
const land = $("[data-land]");
if (land) paint(land, { seed: 7 });
const land2 = $("[data-land2]");
if (land2) paint(land2, { seed: 19, sun: false, trees: false });
const land3 = $("[data-land3]");
if (land3) paint(land3, { seed: 31, w: 1440, sun: false, trees: true, hz: 20 });

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
    weights: mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", "),
    notice: ratingNotice(e.platform), said: `“${said}”`,
    line1: EXAMPLE_LINE, line2: EXAMPLE_LINE, line3: EXAMPLE_LINE + " Painting drawn by Orbe.",
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-ms]").style.setProperty("--to", lead.score / 100);
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}><span>${b}</span></li>`).join("");
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
  if (ev.target.closest("a, button, input, select, label, form, textarea, .sticker, blockquote")) return;
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

$("[data-peek]").addEventListener("click", () => { if (wide.matches) show(N - 1); else goPhone(N - 1); });

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
