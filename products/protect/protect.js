/*
  Protect: the page. Every fingerprint, distance and verdict comes from the
  engine (../../assets/engine/protect/), the same code as product/src/protect.
  Pictures and videos are decoded here, by the browser, onto a canvas. Nothing
  is uploaded: there is no network call on this page beyond its own files.
*/
import { shell, $, $$, esc, dropZone } from "../assets/shell.js";
import {
  fingerprintImage, compare, bits, toHex, toRightsRef, makePhoto, cropBy, resize, grade, recompress,
  sampleTimes, fingerprintVideo, findClip, SAME_MAX, EDITED_MAX, MIN_RUN,
} from "../../assets/engine/protect/index.js";

shell("protect");

const VERDICT = { same: "Same picture", edited: "Edited copy", different: "Different" };
const DEMO_SEED = 7;
const UNRELATED_SEED = 23;

/* ---------------------------------------------------------------- drawing */

/* A hash as an 8x8 grid of squares; cells that differ from `against` are ringed. */
function grid(hash, { against, label }) {
  const b = bits(hash);
  const o = against === undefined ? null : bits(against);
  let cells = "";
  b.forEach((on, i) => {
    const x = (i % 8) * 10, y = Math.floor(i / 8) * 10;
    const diff = o && o[i] !== on;
    cells += `<rect x="${x + 1}" y="${y + 1}" width="8" height="8" rx="1" class="${on ? "on" : "off"}${diff ? " diff" : ""}"/>`;
  });
  return `<svg class="bitgrid" viewBox="0 0 80 80" role="img" aria-label="${esc(label)}">${cells}</svg>`;
}

function toCanvas(img, cls = "thumb") {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.className = cls;
  c.getContext("2d").putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  return c;
}

/* Pixels from a canvas source, scaled so the longer side is at most `max` (the fingerprint does not depend on size). */
function pixelsOf(source, w, h, max = 640) {
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { width: d.width, height: d.height, data: d.data, channels: 4, canvas: c };
}

async function decodeImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return pixelsOf(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const verdictChip = (v) => `<span class="vd vd-${v}">${VERDICT[v]}</span>`;
const scoreLine = (c) => `Score <b class="fig">${c.score}</b> of 64 &middot; pHash <b class="fig">${c.bestP}</b>, dHash <b class="fig">${c.bestD}</b> bits apart${c.window !== "whole" ? `, against the ${esc(c.window)} of the original` : ""}`;

/* ---------------------------------------------------------------- the demo */

/* A real JPEG round trip through the browser's own encoder, at low quality. Falls back to the engine's if the browser will not. */
async function jpegCopy(img) {
  try {
    const c = toCanvas(resize(img, Math.round(img.width * 0.75), Math.round(img.height * 0.75)));
    const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("no blob"))), "image/jpeg", 0.2));
    const px = await decodeImage(blob);
    return { width: px.width, height: px.height, data: px.data, channels: 4 };
  } catch {
    return recompress(img, 20);
  }
}

async function demo() {
  const box = $("[data-demo]");
  const photo = makePhoto(DEMO_SEED, 480, 320);
  const original = fingerprintImage(photo);
  const suspects = [
    { name: "Cropped", how: "A tenth trimmed off, mostly from the left and bottom, then shrunk.", img: resize(cropBy(photo, 0.1, 0.8, 0.2), 400, 254) },
    { name: "Recompressed", how: "Saved again as a JPEG at 20% quality by your browser, at three quarters the size.", img: await jpegCopy(photo) },
    { name: "Re-coloured", how: "A warm, faded film grade over every pixel.", img: grade(photo) },
    { name: "Unrelated", how: "Another made-up landscape, from a different seed.", img: makePhoto(UNRELATED_SEED, 480, 320) },
  ];
  box.innerHTML = "";
  const head = document.createElement("figure");
  head.className = "dcard dcard-orig";
  head.append(toCanvas(photo));
  head.insertAdjacentHTML("beforeend", `<figcaption><span class="dname">The original</span><span class="small">Made up, seed ${DEMO_SEED}.</span><span class="dgrid">${grid(original.phash, { label: `The original's pHash, ${toHex(original.phash)}, as an 8 by 8 grid` })}<code class="ref">${esc(toRightsRef(original))}</code></span></figcaption>`);
  box.append(head);
  for (const s of suspects) {
    const fp = fingerprintImage(s.img);
    const c = compare(original, fp);
    const fig = document.createElement("figure");
    fig.className = `dcard dcard-${c.verdict}`;
    fig.append(toCanvas(s.img));
    fig.insertAdjacentHTML("beforeend", `<figcaption><span class="dname">${esc(s.name)} ${verdictChip(c.verdict)}</span><span class="small">${esc(s.how)}</span><span class="dgrid">${grid(fp.phash, { against: original.phash, label: `${s.name}: pHash ${toHex(fp.phash)}, ${c.pDistance} of 64 cells differ from the original` })}<span class="small">${scoreLine(c)}</span></span><span class="dwords">${esc(c.words)}</span></figcaption>`);
    box.append(fig);
  }
  const ref = $("[data-ref-sample]");
  if (ref) ref.textContent = toRightsRef(original);
}

/* ---------------------------------------------------------------- image check */

const imgs = { a: null, b: null };

function renderImageResult() {
  const out = $("[data-img-result]");
  if (!imgs.a || !imgs.b) { out.innerHTML = `<p class="small">${imgs.a || imgs.b ? "Now add the other picture." : "Add both pictures to compare them."}</p>`; return; }
  const c = compare(imgs.a.fp, imgs.b.fp);
  out.innerHTML = `<div class="verdict verdict-${c.verdict}"><p class="v-head">${verdictChip(c.verdict)} <span class="v-score"><b class="fig">${c.score}</b> <span class="small">score, of 64</span></span></p><p class="v-words">${esc(c.words)}</p><p class="small">${scoreLine(c)}. ${c.verdict === "different" ? "" : "A match is a reason to look, not a claim: commentary and parody can use work fairly. "}At ${SAME_MAX} or under it is the same picture; at ${EDITED_MAX} or under, an edited copy.</p></div>`;
}

for (const slot of $$("[data-slot]")) {
  const key = slot.dataset.slot;
  const out = $("[data-out]", slot);
  dropZone($("[data-drop]", slot), $("[data-file]", slot), async (file) => {
    out.innerHTML = `<p class="small">Reading ${esc(file.name)} on this device.</p>`;
    try {
      if (!file.type.startsWith("image/")) throw new Error("not an image");
      const px = await decodeImage(file);
      const fp = fingerprintImage(px);
      imgs[key] = { fp, name: file.name };
      const other = imgs[key === "a" ? "b" : "a"];
      out.innerHTML = "";
      px.canvas.className = "thumb";
      out.append(px.canvas);
      out.insertAdjacentHTML("beforeend", `<div class="fp-row">${grid(fp.phash, { against: key === "b" ? other?.fp.phash : undefined, label: `pHash of ${file.name}: ${toHex(fp.phash)}` })}<div class="fp-say"><span class="fname">${esc(file.name)}</span><code class="ref">${esc(toRightsRef(fp))}</code><span class="small">dHash ${toHex(fp.dhash)}</span></div></div>`);
      if (key === "a" && imgs.b) { const bo = $('[data-slot="b"] .bitgrid'); if (bo) bo.outerHTML = grid(imgs.b.fp.phash, { against: fp.phash, label: `pHash of ${imgs.b.name}: ${toHex(imgs.b.fp.phash)}` }); }
    } catch {
      imgs[key] = null;
      out.innerHTML = `<p class="err" role="alert">Your browser could not read that file as a picture. Try a JPEG, PNG or WebP.</p>`;
    }
    renderImageResult();
  });
}

/* ---------------------------------------------------------------- video check */

const vids = { a: null, b: null };
const MAX_SAMPLES = 240;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function seek(video, t) {
  return new Promise((res, rej) => {
    const done = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); res(); };
    const fail = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); rej(new Error("seek failed")); };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    video.currentTime = t;
  });
}

async function fingerprintFile(file, interval, onStep) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise((res, rej) => { video.onloadeddata = res; video.onerror = () => rej(new Error("cannot play")); });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("no duration");
    // Keep long videos quick: widen the interval so there are at most MAX_SAMPLES keyframes.
    const step = Math.max(interval, Math.ceil((duration / MAX_SAMPLES) * 2) / 2);
    const times = sampleTimes(duration, step);
    const frames = [];
    let poster = null;
    for (let i = 0; i < times.length; i++) {
      await seek(video, times[i]);
      const px = pixelsOf(video, video.videoWidth, video.videoHeight, 160);
      if (!poster) poster = px.canvas;
      frames.push({ t: times[i], image: px });
      onStep(i + 1, times.length);
    }
    return { fp: fingerprintVideo(frames, step, duration), poster, duration };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function renderVideoResult() {
  const out = $("[data-vid-result]");
  if (!vids.a) { out.innerHTML = `<p class="small">${vids.b ? "Now add your own video." : "Videos your browser can play will work. Long videos take a moment: each sampled frame is read on this device."}</p>`; return; }
  if (!vids.b) { out.innerHTML = `<p class="small">Your video's fingerprint is ready: <b class="fig">${vids.a.fp.hashes.length}</b> keyframes, one every ${vids.a.fp.interval} s. Add a longer video to look for it inside.</p>`; return; }
  const m = findClip(vids.a.fp, vids.b.fp);
  const v = m.found ? "edited" : "different";
  const pct = Math.round(m.confidence * 100);
  out.innerHTML = m.found
    ? `<div class="verdict verdict-${v}"><p class="v-head"><span class="vd vd-edited">Found</span> <span class="v-score"><b class="fig">${pct}%</b> <span class="small">confidence</span></span></p><p class="v-words">Your video appears inside the longer one from <b>${clock(m.offset)}</b>: about ${Math.round(m.length)} s of it, starting ${clock(m.clipStart)} into yours.</p><p class="small">${m.matched} of ${m.compared} keyframes in that stretch match, ${m.meanDistance} bits apart on average. A person would review this before any claim.</p></div>`
    : `<div class="verdict verdict-different"><p class="v-head">${verdictChip("different")}</p><p class="v-words">Your video does not appear inside the longer one.</p><p class="small">The closest stretch had ${m.matched} matching keyframe${m.matched === 1 ? "" : "s"}; ${MIN_RUN} in a row are needed.</p></div>`;
}

for (const slot of $$("[data-vslot]")) {
  const key = slot.dataset.vslot;
  const out = $("[data-out]", slot);
  dropZone($("[data-drop]", slot), $("[data-file]", slot), async (file) => {
    out.innerHTML = `<p class="small" data-prog>Opening ${esc(file.name)} on this device.</p>`;
    vids[key] = null;
    renderVideoResult();
    try {
      if (!file.type.startsWith("video/")) throw new Error("not a video");
      const prog = $("[data-prog]", out);
      const r = await fingerprintFile(file, key === "a" ? 1 : 0.5, (i, n) => { prog.textContent = `Reading frame ${i} of ${n}.`; });
      vids[key] = { ...r, name: file.name };
      out.innerHTML = "";
      r.poster.className = "thumb";
      out.append(r.poster);
      out.insertAdjacentHTML("beforeend", `<div class="fp-row"><div class="fp-say"><span class="fname">${esc(file.name)}</span><span class="small">${clock(r.duration)} long, ${r.fp.hashes.length} keyframes</span><code class="ref">${esc(toRightsRef(r.fp))}</code></div></div><div class="strip" aria-label="Keyframe fingerprints">${r.fp.hashes.slice(0, 12).map((h, i) => grid(h, { label: `Keyframe at ${clock(r.fp.times[i])}: ${toHex(h)}` })).join("")}</div>`);
    } catch {
      out.innerHTML = `<p class="err" role="alert">Your browser could not play that file. Try an MP4 or WebM.</p>`;
    }
    renderVideoResult();
  });
}

demo().catch(() => { $("[data-demo]").innerHTML = `<p class="err" role="alert">The demo could not be drawn in this browser.</p>`; });
