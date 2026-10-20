/*
  Your Orbe, media: every creator on this page is made up, so every picture,
  clip and sound is made here, in the browser, from a seed per work, and
  labelled Made up. Pictures are abstract scenes on the site's pixel lattice
  (cells a little smaller than their pitch, shading by leaving cells out),
  in brand colours only: horizons, discs, water, hills and one object. No
  faces, no figures.

  For a real creator the player takes the video IDs and feed URLs already in
  their export instead (see REAL_MEDIA and MEDIA_SOURCES in ./you-data.js):
  the YouTube embedded player and thumbnails, and the podcast feed's audio.
  That path is written below and switched off in the demo.
*/
import { speech, melody, mixOver, normalise, encodeWav } from "../../assets/engine/protect/audiosynth.js";
import { AUDIO_RATE } from "../../assets/engine/protect/audio.js";
import { seeded } from "../../assets/engine/rating/fixtures.js";
import { clock } from "./you-data.js";

const C = {
  sky: "#9EE9FB", cobalt: "#1F4BFF", ink: "#141311", paper: "#F3F0E8", chalk: "#FBFAF6", linen: "#E7E2D7", mist: "#D6F6FD",
  water: "#4D9AD0", meadow: "#8E9A4A", ochre: "#C9A84C", straw: "#EED56A", dawn: "#F2A58E", peony: "#F2879E", stone: "#A29E95", grove: "#262B12", soot: "#2A2824",
};
/* Moods: top of the sky, low sky, the disc, the land or water, the object. */
const MOODS = [
  { top: C.mist, low: C.sky, disc: C.straw, land: C.water, far: C.cobalt, obj: C.ink },
  { top: C.dawn, low: C.straw, disc: C.chalk, land: C.water, far: C.soot, obj: C.ink },
  { top: C.ink, low: C.cobalt, disc: C.straw, land: C.soot, far: C.grove, obj: C.sky },
  { top: C.linen, low: C.mist, disc: C.dawn, land: C.meadow, far: C.grove, obj: C.ink },
  { top: C.sky, low: C.mist, disc: C.chalk, land: C.meadow, far: C.water, obj: C.cobalt },
  { top: C.peony, low: C.dawn, disc: C.straw, land: C.cobalt, far: C.ink, obj: C.ink },
];
const OBJECTS = ["tower", "arch", "mast", "bell", "tree", "dish", "boat", "none"];

/** The look of one scene, fixed by its seed. */
function sceneOf(seed) {
  const r = seeded(seed);
  return {
    mood: MOODS[Math.floor(r() * MOODS.length)],
    horizon: 0.55 + r() * 0.15,
    water: r() < 0.5,
    discX: 0.15 + r() * 0.7, discY: 0.18 + r() * 0.2, discR: 0.09 + r() * 0.07,
    obj: OBJECTS[Math.floor(r() * OBJECTS.length)], objX: 0.2 + r() * 0.6,
    ph: [r() * 6.28, r() * 6.28, r() * 6.28], amp: 0.04 + r() * 0.06,
    speckle: seed,
  };
}

/* The object, in unit space (x, y in 0..1 of the frame, y down), at its base on the horizon. */
function objectAt(s, x, y, aspect) {
  const bx = s.objX, by = s.horizon, dx = (x - bx) * aspect, dy = by - y;
  switch (s.obj) {
    case "tower": return Math.abs(dx) < 0.03 && dy > 0 && dy < 0.42 || (Math.abs(dx) < 0.06 && dy > 0.36 && dy < 0.44);
    case "arch": { const d = Math.hypot(dx, dy); return dy > 0 && d < 0.26 && d > 0.19; }
    case "mast": return (Math.abs(dx) < 0.012 && dy > 0 && dy < 0.5) || (dy > 0.08 && dy < 0.38 && dx > 0 && dx < (0.38 - dy) * 0.6);
    case "bell": { const t = (dy - 0.06) / 0.3; return dy > 0.06 && dy < 0.36 && Math.abs(dx) < 0.07 + 0.08 * (1 - t) || (Math.abs(dx) < 0.012 && dy > 0.36 && dy < 0.42); }
    case "tree": return (Math.abs(dx) < 0.015 && dy > 0 && dy < 0.12) || (dy > 0.1 && dy < 0.46 && Math.abs(dx) < (0.46 - dy) * 0.45);
    case "dish": { const d = Math.hypot(dx, dy - 0.26); return (d < 0.15 && dy - 0.26 > dx * 0.4) || (Math.abs(dx) < 0.015 && dy > 0 && dy < 0.26); }
    case "boat": return (dy > -0.02 && dy < 0.05 && Math.abs(dx) < 0.14 - (0.05 - dy) * 0.8) || (Math.abs(dx - 0.01) < 0.01 && dy > 0.05 && dy < 0.3) || (dy > 0.08 && dy < 0.28 && dx > 0.02 && dx < (0.28 - dy) * 0.7);
    default: return false;
  }
}

/** The colour of one cell at time t (seconds), or null for a cell left out. */
function cellColour(s, u, v, t, aspect) {
  const m = s.mood;
  const hz = s.horizon;
  // The disc drifts slowly across the sky as the clip plays.
  const cx = s.discX + t * 0.008, cy = s.discY + Math.sin(t * 0.2) * 0.01;
  if (objectAt(s, u, v, aspect)) return m.obj;
  if (v < hz) {
    if (Math.hypot((u - cx) * aspect, v - cy) < s.discR) return m.disc;
    const far = hz - 0.05 - s.amp * (0.6 + 0.4 * Math.sin(u * 7 + s.ph[0]));
    if (!s.water && v > far) return m.far;
    return v < hz * 0.45 ? m.top : m.low;
  }
  if (s.water) {
    // Water: bands that travel sideways with time, and the disc's reflection.
    const band = Math.sin(v * 22 + u * 3 - t * 1.6 + s.ph[1]);
    if (Math.abs((u - cx) * aspect) < s.discR * 0.6 && band > 0.2) return m.disc;
    return band > 0.7 ? m.low : m.land;
  }
  const ridge = hz + 0.06 + s.amp * Math.sin(u * 5 + s.ph[2]);
  return v < ridge ? m.far : m.land;
}

/** Draws a scene on a 2D context as lattice cells. */
export function drawScene(ctx, seed, cols, rows, width, height, t = 0) {
  const s = sceneOf(seed);
  const cw = width / cols, ch = height / rows;
  const gap = Math.max(0.6, cw * 0.14), rad = Math.min(2, cw * 0.2);
  const aspect = width / height;
  const leave = seeded(s.speckle ^ 0x9e37);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, width, height);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const out = leave() < 0.025; // shading by omission: a few cells are left out
      const col = cellColour(s, (i + 0.5) / cols, (j + 0.5) / rows, t, aspect);
      if (out || !col) continue;
      ctx.fillStyle = col;
      const x = i * cw + gap / 2, y = j * ch + gap / 2, w = cw - gap, h = ch - gap;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.fill(); } else ctx.fillRect(x, y, w, h);
    }
  }
}

/* ---------------------------------------------------------------- thumbnails */
const SHAPES = { youtube: [32, 18], twitch: [32, 18], podcast: [20, 20], photography: [24, 16], substack: [30, 12] };
const THUMBS = new Map();
/** A stable thumbnail for a work, as an image URL (a data URL, made once and cached). */
export function thumbURL(kind, seed, px = 6, density = 1) {
  const key = `${kind}:${seed}:${px}:${density}`;
  if (THUMBS.has(key)) return THUMBS.get(key);
  const [cols, rows] = SHAPES[kind].map((n) => n * density);
  const cv = document.createElement("canvas");
  cv.width = cols * px; cv.height = rows * px;
  drawScene(cv.getContext("2d"), seed, cols, rows, cv.width, cv.height, 0);
  const url = cv.toDataURL("image/png");
  THUMBS.set(key, url);
  return url;
}
export const thumbShape = (kind) => SHAPES[kind];

/* ---------------------------------------------------------------- players */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const frameSeed = (seed, i) => (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;

/**
  Mounts the player for a work report into `el`. Returns { destroy, seek(f), play(), state() }.
  `media` comes from mediaFor() in you-data.js; `moments` from the report.
*/
export function mountPlayer(el, { media, moments, title, work, still }) {
  if (media.real) return realPlayer(el, media, moments, title);
  if (media.player === "video") return videoPlayer(el, media, moments, title, work, still);
  if (media.player === "audio") return audioPlayer(el, media, moments, title, work);
  if (media.player === "image") return imagePlayer(el, media, moments, title);
  return issuePlayer(el, media, moments, title);
}

const markers = (moments, label) => moments.top.map((m, k) => `<button type="button" class="yo-pl-mark" style="--f:${m.f.toFixed(4)}" data-moment="${k}" aria-label="${esc(label(m))}"><span aria-hidden="true">${k + 1}</span></button>`).join("");
const momentList = (moments) => `<ol class="yo-pl-moments">${moments.top.map((m, k) => `<li><button type="button" class="yo-pl-mo" data-moment="${k}"><b class="num">${esc(m.at)}</b><span>${m.y}% ${esc(moments.unit)}${m.lift > 0 ? `, ${m.lift} above ${moments.frames ? "the set" : "the curve"}` : ""}</span></button></li>`).join("")}</ol>`;

/* A made-up clip, drawn live on a canvas with its own controls. */
function videoPlayer(el, media, moments, title, work, still) {
  const total = media.durationSec || 900, clip = media.clipSec;
  el.innerHTML = `<div class="yo-pl yo-pl-video">
      <div class="yo-pl-stage"><canvas class="yo-pl-canvas" width="960" height="540" role="img" aria-label="Made-up clip for “${esc(title)}”: an abstract lattice scene."></canvas><span class="yo-pl-tag">Made up</span></div>
      <div class="yo-pl-bar">
        <button type="button" class="yo-pl-play" data-play aria-label="Play the made-up clip"><span class="yo-pl-icon" aria-hidden="true"></span></button>
        <div class="yo-pl-track">
          <input type="range" class="yo-pl-range" min="0" max="1000" value="0" step="1" aria-label="Position in the clip" data-range>
          <div class="yo-pl-marks">${markers(moments, (m) => `Jump to ${m.at}, ${m.y}% ${moments.unit}`)}</div>
        </div>
        <p class="yo-pl-time num" data-time aria-live="off">0:00 / ${clock(total)}</p>
      </div>
      ${momentList(moments)}
      <p class="ob-note yo-pl-note">A ${clip}-second made-up stand-in for the whole ${clock(total)}, so each second covers ${Math.round(total / clip)} seconds of the real thing. Moments sit at the same point along it.</p>
    </div>`;
  const cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
  const range = el.querySelector("[data-range]"), btn = el.querySelector("[data-play]"), timeEl = el.querySelector("[data-time]");
  let pos = 0, playing = false, raf = 0, t0 = 0, p0 = 0;
  const cols = 48, rows = 27;
  const draw = () => drawScene(ctx, media.seed, cols, rows, cv.width, cv.height, pos * clip);
  const show = () => {
    range.value = String(Math.round(pos * 1000));
    timeEl.textContent = `${clock(pos * total)} / ${clock(total)}`;
    el.dataset.pos = pos.toFixed(3);
    btn.setAttribute("aria-label", playing ? "Pause the made-up clip" : "Play the made-up clip");
    btn.classList.toggle("is-playing", playing);
    draw();
  };
  const tick = (now) => {
    pos = Math.min(1, p0 + (now - t0) / 1000 / clip);
    show();
    if (pos >= 1) { playing = false; show(); return; }
    raf = requestAnimationFrame(tick);
  };
  const play = () => { if (pos >= 1) pos = 0; playing = true; t0 = performance.now(); p0 = pos; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); show(); };
  const pause = () => { playing = false; cancelAnimationFrame(raf); show(); };
  const seek = (f) => { pos = Math.max(0, Math.min(1, f)); if (playing) { t0 = performance.now(); p0 = pos; } show(); };
  btn.addEventListener("click", () => (playing ? pause() : play()));
  range.addEventListener("input", () => seek(Number(range.value) / 1000));
  for (const b of el.querySelectorAll("[data-moment]")) b.addEventListener("click", () => { seek(moments.top[Number(b.dataset.moment)].f); if (!still && !playing) play(); });
  show();
  return { destroy: () => cancelAnimationFrame(raf), seek, play, state: () => ({ pos, playing }) };
}

/* A made-up episode: synthetic speech over a quiet melody, made from the work's seed. */
function audioPlayer(el, media, moments, title) {
  const total = media.durationSec || 900, clip = 20;
  el.innerHTML = `<div class="yo-pl yo-pl-audio">
      <div class="yo-pl-pod">
        <img class="yo-pl-cover" src="${thumbURL("podcast", media.seed, 9, 1)}" alt="Made-up cover art for “${esc(title)}”: an abstract lattice scene." width="180" height="180">
        <div class="yo-pl-podside">
          <p class="yo-pl-tagline"><span class="ob-chip" data-i="record">Made up</span> <span class="ob-note" data-status role="status">Making the made-up audio…</span></p>
          <canvas class="yo-pl-wave" width="900" height="120" aria-hidden="true"></canvas>
          <div class="yo-pl-bar">
            <button type="button" class="yo-pl-play" data-play aria-label="Play the made-up episode" disabled><span class="yo-pl-icon" aria-hidden="true"></span></button>
            <div class="yo-pl-track">
              <input type="range" class="yo-pl-range" min="0" max="1000" value="0" step="1" aria-label="Position in the episode" data-range>
              <div class="yo-pl-marks">${markers(moments, (m) => `Jump to ${m.at}, ${m.y}% ${moments.unit}`)}</div>
            </div>
            <p class="yo-pl-time num" data-time>0:00 / ${clock(total)}</p>
          </div>
        </div>
      </div>
      ${momentList(moments)}
      <p class="ob-note yo-pl-note">A ${clip}-second made-up stand-in for the whole ${clock(total)}: generated speech over a quiet tune, no real voice. Moments sit at the same point along it.</p>
      <audio preload="auto" data-audio></audio>
    </div>`;
  const audio = el.querySelector("[data-audio]"), btn = el.querySelector("[data-play]"), range = el.querySelector("[data-range]"), timeEl = el.querySelector("[data-time]"), status = el.querySelector("[data-status]");
  const wave = el.querySelector(".yo-pl-wave"), wctx = wave.getContext("2d");
  let url = null, peaks = null, pending = null, dead = false;
  const drawWave = (f) => {
    wctx.clearRect(0, 0, wave.width, wave.height);
    if (!peaks) return;
    const n = peaks.length, bw = wave.width / n;
    for (let i = 0; i < n; i++) {
      const h = Math.max(2, peaks[i] * wave.height * 0.9);
      wctx.fillStyle = i / n <= f ? C.cobalt : C.stone;
      wctx.fillRect(i * bw + 1, (wave.height - h) / 2, bw - 2, h);
    }
  };
  const show = () => {
    const f = audio.duration ? audio.currentTime / audio.duration : 0;
    range.value = String(Math.round(f * 1000));
    timeEl.textContent = `${clock(f * total)} / ${clock(total)}`;
    el.dataset.pos = f.toFixed(3);
    btn.classList.toggle("is-playing", !audio.paused);
    btn.setAttribute("aria-label", audio.paused ? "Play the made-up episode" : "Pause the made-up episode");
    drawWave(f);
  };
  const seek = (f) => {
    if (!audio.duration) { pending = f; return; }
    audio.currentTime = Math.max(0, Math.min(audio.duration - 0.05, f * audio.duration));
    show();
  };
  // Generating takes a moment, so it runs after the report has drawn.
  setTimeout(() => {
    if (dead) return;
    const x = normalise(mixOver(speech(media.seed, clip), melody(media.seed ^ 0x5bd1, clip), -16));
    const per = Math.floor(x.length / 120);
    peaks = Array.from({ length: 120 }, (_, i) => { let m = 0; for (let k = i * per; k < (i + 1) * per; k++) m = Math.max(m, Math.abs(x[k])); return m; });
    url = URL.createObjectURL(new Blob([encodeWav(x, AUDIO_RATE)], { type: "audio/wav" }));
    audio.src = url;
    audio.addEventListener("loadedmetadata", () => { btn.disabled = false; status.textContent = "Ready. Generated in your browser."; if (pending != null) { const f = pending; pending = null; seek(f); } show(); }, { once: true });
    drawWave(0);
  }, 30);
  btn.addEventListener("click", () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  audio.addEventListener("timeupdate", show);
  audio.addEventListener("play", show);
  audio.addEventListener("pause", show);
  range.addEventListener("input", () => seek(Number(range.value) / 1000));
  for (const b of el.querySelectorAll("[data-moment]")) b.addEventListener("click", () => seek(moments.top[Number(b.dataset.moment)].f));
  return { destroy: () => { dead = true; audio.pause(); if (url) URL.revokeObjectURL(url); }, seek, play: () => audio.play().catch(() => {}), state: () => ({ pos: audio.duration ? audio.currentTime / audio.duration : 0, playing: !audio.paused, ready: !!audio.duration }) };
}

/* A photo set: the full image, and the set's frames to step through. */
function imagePlayer(el, media, moments, title) {
  const n = moments.pts.length;
  const top = new Map(moments.top.map((m, k) => [m.i, k]));
  el.innerHTML = `<div class="yo-pl yo-pl-image">
      <figure class="yo-pl-photo"><img data-photo alt="" width="960" height="640"><span class="yo-pl-tag">Made up</span><figcaption class="ob-note" data-cap></figcaption></figure>
      <div class="yo-pl-frames" role="group" aria-label="The ${n} frames in this set">${Array.from({ length: n }, (_, i) => `<button type="button" class="yo-pl-frame${top.has(i) ? " is-top" : ""}" data-frame="${i}" aria-pressed="false" aria-label="Frame ${i + 1}${top.has(i) ? `, a top moment: ${moments.pts[i]}% ${moments.unit}` : ""}"><img src="${thumbURL("photography", frameSeed(media.seed, i), 4)}" alt="" width="96" height="64">${top.has(i) ? `<span class="yo-pl-frame-n" aria-hidden="true">${top.get(i) + 1}</span>` : ""}</button>`).join("")}</div>
      ${momentList(moments)}
      <p class="ob-note yo-pl-note">Made-up frames, drawn from this set's seed. The top moments are the frames people stopped on most, against this set's own average.</p>
    </div>`;
  const img = el.querySelector("[data-photo]"), cap = el.querySelector("[data-cap]");
  let cur = 0;
  const show = (i) => {
    cur = i;
    img.src = thumbURL("photography", frameSeed(media.seed, i), 20, 2);
    img.alt = `Made-up frame ${i + 1} of “${title}”: an abstract lattice scene.`;
    cap.textContent = `Frame ${i + 1} of ${n}: ${moments.pts[i]}% ${moments.unit}.`;
    for (const b of el.querySelectorAll("[data-frame]")) b.setAttribute("aria-pressed", String(Number(b.dataset.frame) === i));
    el.dataset.pos = (i / (n - 1)).toFixed(3);
  };
  for (const b of el.querySelectorAll("[data-frame]")) b.addEventListener("click", () => show(Number(b.dataset.frame)));
  for (const b of el.querySelectorAll("[data-moment]")) b.addEventListener("click", () => show(moments.top[Number(b.dataset.moment)].i));
  show(moments.top[0]?.i ?? 0);
  return { destroy() {}, seek: (f) => show(Math.round(f * (n - 1))), play() {}, state: () => ({ pos: cur / (n - 1), playing: false }) };
}

/* A newsletter issue: the header, and the issue as blocks you can jump through to where readers stayed. */
function issuePlayer(el, media, moments, title) {
  const n = moments.pts.length;
  const r = seeded(media.seed);
  const top = new Map(moments.top.map((m, k) => [m.i, k]));
  el.innerHTML = `<div class="yo-pl yo-pl-issue">
      <div class="yo-pl-mast"><img src="${thumbURL("substack", media.seed, 14, 2)}" alt="Made-up header image for “${esc(title)}”: an abstract lattice scene." width="420" height="168"><span class="yo-pl-tag">Made up</span></div>
      <div class="yo-pl-read">
        <div class="yo-pl-doc" data-doc tabindex="0" aria-label="The made-up issue, as blocks; no real text">
          <p class="yo-pl-h">“${esc(title)}”</p>
          ${Array.from({ length: n }, (_, i) => `<div class="yo-pl-para${top.has(i) ? " is-top" : ""}" data-para="${i}">${((m) => Array.from({ length: m }, (_, k) => `<span style="--w:${k === m - 1 ? 40 + Math.floor(r() * 40) : 92 + Math.floor(r() * 8)}%"></span>`).join(""))(2 + Math.floor(r() * 3))}${top.has(i) ? `<b class="yo-pl-para-n">${top.get(i) + 1}</b>` : ""}</div>`).join("")}
        </div>
        <div class="yo-pl-depth" aria-hidden="true">${moments.pts.map((y) => `<i style="--y:${y}"></i>`).join("")}</div>
      </div>
      ${momentList(moments)}
      <p class="ob-note yo-pl-note">A made-up issue drawn as blocks, no real text. The bars on the right are how many were still reading at each block; the top moments are where reading held best.</p>
    </div>`;
  const doc = el.querySelector("[data-doc]");
  const go = (i) => {
    const p = el.querySelector(`[data-para="${i}"]`);
    doc.scrollTo({ top: p.offsetTop - doc.offsetTop - 8, behavior: "auto" });
    for (const q of el.querySelectorAll("[data-para]")) q.classList.toggle("is-on", q === p);
    el.dataset.pos = (i / (n - 1)).toFixed(3);
  };
  for (const b of el.querySelectorAll("[data-moment]")) b.addEventListener("click", () => go(moments.top[Number(b.dataset.moment)].i));
  return { destroy() {}, seek: (f) => go(Math.round(f * (n - 1))), play() {}, state: () => ({ pos: Number(el.dataset.pos ?? 0), playing: false }) };
}

/* For real creators: the official embed or the feed's own audio. Off in the demo (REAL_MEDIA is false). */
function realPlayer(el, media, moments, title) {
  const total = media.durationSec || 0;
  if (media.real.type === "embed") {
    const frame = (sec) => `<iframe class="yo-pl-embed" src="${esc(media.real.src + (sec ? media.real.seek(sec) : ""))}" title="${esc(title)}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    el.innerHTML = `<div class="yo-pl yo-pl-video"><div class="yo-pl-stage" data-stage>${frame(0)}</div>${momentList(moments)}</div>`;
    const seek = (f) => { el.querySelector("[data-stage]").innerHTML = frame(f * total); };
    for (const b of el.querySelectorAll("[data-moment]")) b.addEventListener("click", () => seek(moments.top[Number(b.dataset.moment)].f));
    return { destroy() {}, seek, play() {}, state: () => ({}) };
  }
  el.innerHTML = `<div class="yo-pl yo-pl-audio"><audio controls preload="metadata" src="${esc(media.real.src)}"></audio>${momentList(moments)}</div>`;
  const audio = el.querySelector("audio");
  const seek = (f) => { if (audio.duration) audio.currentTime = f * audio.duration; };
  for (const b of el.querySelectorAll("[data-moment]")) b.addEventListener("click", () => seek(moments.top[Number(b.dataset.moment)].f));
  return { destroy: () => audio.pause(), seek, play: () => audio.play(), state: () => ({}) };
}
