__o.d("js/tools/protect.js", function (__x) {
"use strict";
__o.e(__x, { render: () => render });
const { compare, fingerprintAudio, fingerprintImage, matchAudio } = __o.r("site/engine/protect/index.js");
const { emptyState, pill, screenHead } = __o.r("js/console-ui.js");
const { icon } = __o.r("js/icons.js");
const { h } = __o.r("js/ui.js");

const PICTURE = { same: "Same picture", edited: "Edited copy", different: "Different" };
const SOUND = { same: "Same recording", contains: "Contains your audio", different: "Different" };
async function pixels(file) {
const bmp = await createImageBitmap(file);
const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
const c = document.createElement("canvas");
c.width = Math.max(1, Math.round(bmp.width * k));
c.height = Math.max(1, Math.round(bmp.height * k));
const ctx = c.getContext("2d", { willReadFrequently: true });
ctx.drawImage(bmp, 0, 0, c.width, c.height);
bmp.close?.();
const d = ctx.getImageData(0, 0, c.width, c.height);
return { width: d.width, height: d.height, data: d.data, channels: 4 };
}
async function sound(file) {
const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
const audio = await new Ctx(1, 1, 44100).decodeAudioData(await file.arrayBuffer());
const channels = [];
for (let c = 0; c < audio.numberOfChannels; c++) channels.push(audio.getChannelData(c));
return { sampleRate: audio.sampleRate, channels };
}

async function print(file) {
if (file.type.startsWith("image/")) return { kind: "image", name: file.name, fp: fingerprintImage(await pixels(file)) };
if (file.type.startsWith("audio/")) return { kind: "audio", name: file.name, fp: fingerprintAudio(await sound(file)) };
throw new Error("Choose a picture or a sound file.");
}
function slot(label, line, onFile) {
const input = h("input", { class: "ob-sr", type: "file", accept: "image/*,audio/*" });
const name = h("span", { class: "cn-drop-d" }, line);
const zone = h("label", { class: "cn-drop" }, input, h("span", { class: "cn-drop-ico" }, icon("image")), h("span", { class: "cn-drop-t" }, label), name);
const take = (file) => {
if (!file) return;
name.textContent = file.name;
zone.classList.add("is-set");
onFile(file);
};
input.addEventListener("change", () => take(input.files?.[0]));
zone.addEventListener("dragover", (e) => (e.preventDefault(), zone.classList.add("is-over")));
zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
zone.addEventListener("drop", (e) => {
e.preventDefault();
zone.classList.remove("is-over");
take(e.dataTransfer?.files?.[0]);
});
return zone;
}
async function render(main) {
const body = screenHead(main, "protect", {
title: "Protect",
line: "Is this a copy of your work? Add your original and the file you found: Orbe compares them on this device, so nothing is uploaded.",
tags: [["On this device", "sky"], ["Pictures and audio"], ["Free"]],
});
const files = { a: null, b: null };
const status = h("span", { class: "cn-result-status" }, pill("idle", "Waiting for two files"));
const out = h("div", { class: "cn-result-body", "aria-live": "polite" }, emptyState("shield", "Add both files to compare them.", [], "A match is a reason to look, not a claim: commentary and parody can use work fairly."));
const run = async () => {
if (!files.a || !files.b) return;
status.replaceChildren(pill("running", "Comparing"));
try {
const [a, b] = await Promise.all([print(files.a), print(files.b)]);
if (a.kind !== b.kind) throw new Error("Compare a picture with a picture, or a sound with a sound.");
const r = a.kind === "image" ? compare(a.fp, b.fp) : matchAudio(a.fp, b.fp);
const verdict = a.kind === "image" ? PICTURE[r.verdict] : SOUND[r.verdict];
const found = r.verdict !== "different";
status.replaceChildren(pill(found ? "done" : "idle", verdict));
out.replaceChildren(
h("div", { class: "cn-figure" }, h("p", { class: `cn-verdict${found ? " is-found" : ""}` }, verdict)),
h("p", null, r.words),
a.kind === "image"
? h("p", { class: "cn-label" }, `Score ${r.score} of 64, where 6 or under is the same picture and 14 or under an edited copy.`)
: h("p", { class: "cn-label" }, `${r.aligned} landmark pairs agree on one offset; confidence ${Math.round(r.confidence * 100)}%.`),
found ? h("p", { class: "cn-label" }, "Watching the web for copies on your behalf is not built yet; this checks a file you found.") : null,
);
} catch (e) {
status.replaceChildren(pill("failed", "Could not compare"));
out.replaceChildren(emptyState("shield", e.message || "That file could not be read here.", [], "Pictures: JPEG, PNG, WebP. Sound: MP3, WAV, M4A."));
}
};
body.append(
h("div", { class: "cn-play" },
h("section", { class: "cn-play-in", "aria-label": "Files" },
h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h3" }, "Files")),
h("div", { class: "cn-play-body cn-drops" },
slot("Your original", "A picture or a sound file", (f) => ((files.a = f), run())),
slot("The file you found", "The copy you want to check", (f) => ((files.b = f), run())),
),
),
h("section", { class: "cn-play-out", "aria-label": "Result" }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h3" }, "Result"), status), h("div", { class: "cn-play-body" }, out)),
),
);
}
});
__o.d("site/engine/protect/audio.js", function (__x) {
"use strict";
__o.e(__x, { AUDIO_RATE: () => AUDIO_RATE, FFT_SIZE: () => FFT_SIZE, HOP: () => HOP, FRAME_SECONDS: () => FRAME_SECONDS, toMono: () => toMono, resampleAudio: () => resampleAudio, fft: () => fft, spectrogram: () => spectrogram, pickPeaks: () => pickPeaks, packHash: () => packHash, unpackHash: () => unpackHash, landmarks: () => landmarks, fingerprintAudio: () => fingerprintAudio, fingerprintSamples: () => fingerprintSamples, MIN_ALIGNED: () => MIN_ALIGNED, CLEAR_RATIO: () => CLEAR_RATIO, SAME_SLACK: () => SAME_SLACK, SAME_SHIFT: () => SAME_SHIFT, AUDIO_WORDS: () => AUDIO_WORDS, hashIndex: () => hashIndex, vote: () => vote, readVotes: () => readVotes, matchAudio: () => matchAudio, audioToJSON: () => audioToJSON, audioFromJSON: () => audioFromJSON });

const AUDIO_RATE = 11025;
const FFT_SIZE = 1024;
const HOP = 256;
const BINS = FFT_SIZE / 2;
const MIN_BIN = 4;
const PEAK_DF = 10;
const PEAK_DT = 5;
const PEAKS_PER_SECOND = 32;
const FLOOR_DB = 12;
const FANOUT = 6;
const DT_MIN = 2;
const DT_MAX = 63;
const DF_MAX = 96;

const FRAME_SECONDS = HOP / AUDIO_RATE;

function toMono(input) {
const ch = input.channels;
if (!ch.length)
return new Float32Array(0);
const n = ch[0].length;
const out = new Float32Array(n);
for (const c of ch)
for (let i = 0; i < n; i++)
out[i] += c[i] / ch.length;
return out;
}

function resampleAudio(x, from, to = AUDIO_RATE) {
if (from === to)
return Float32Array.from(x);
const ratio = from / to;
const n = Math.floor(x.length / ratio);
const out = new Float32Array(n);
const fc = Math.min(1, 1 / ratio) * 0.95;
const half = Math.ceil(8 / fc);
for (let i = 0; i < n; i++) {
const t = i * ratio;
const c = Math.floor(t);
let s = 0, w = 0;
for (let k = c - half + 1; k <= c + half; k++) {
if (k < 0 || k >= x.length)
continue;
const d = t - k;
const a = Math.PI * d * fc;
const sinc = d === 0 ? 1 : Math.sin(a) / a;
const win = 0.5 + 0.5 * Math.cos((Math.PI * d) / (half + 1));
const h = sinc * win;
s += x[k] * h;
w += h;
}
out[i] = w ? s / w : 0;
}
return out;
}


function fft(re, im) {
const n = re.length;
if (n & (n - 1))
throw new Error("fft: length must be a power of two");
for (let i = 1, j = 0; i < n; i++) {
let bit = n >> 1;
for (; j & bit; bit >>= 1)
j ^= bit;
j ^= bit;
if (i < j) {
let t = re[i];
re[i] = re[j];
re[j] = t;
t = im[i];
im[i] = im[j];
im[j] = t;
}
}
for (let len = 2; len <= n; len <<= 1) {
const ang = (-2 * Math.PI) / len;
const wr = Math.cos(ang), wi = Math.sin(ang);
for (let i = 0; i < n; i += len) {
let cr = 1, ci = 0;
for (let k = 0; k < len / 2; k++) {
const a = i + k, b = a + len / 2;
const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
re[b] = re[a] - xr;
im[b] = im[a] - xi;
re[a] += xr;
im[a] += xi;
const t = cr * wr - ci * wi;
ci = cr * wi + ci * wr;
cr = t;
}
}
}
}
const HANN = Float64Array.from({ length: FFT_SIZE }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT_SIZE));

function spectrogram(x) {
const frames = x.length >= FFT_SIZE ? Math.floor((x.length - FFT_SIZE) / HOP) + 1 : 0;
const db = new Float32Array(frames * BINS);
const re = new Float64Array(FFT_SIZE), im = new Float64Array(FFT_SIZE);
for (let f = 0; f < frames; f++) {
const o = f * HOP;
for (let i = 0; i < FFT_SIZE; i++) {
re[i] = x[o + i] * HANN[i];
im[i] = 0;
}
fft(re, im);
for (let b = 0; b < BINS; b++)
db[f * BINS + b] = 10 * Math.log10(re[b] * re[b] + im[b] * im[b] + 1e-10);
}
return { frames, bins: BINS, db };
}


function pickPeaks(spec) {
const { frames, bins, db } = spec;
if (!frames)
return [];

const fmax = new Float32Array(db.length);
for (let t = 0; t < frames; t++)
for (let b = 0; b < bins; b++) {
let m = -Infinity;
for (let k = Math.max(0, b - PEAK_DF); k <= Math.min(bins - 1, b + PEAK_DF); k++)
m = Math.max(m, db[t * bins + k]);
fmax[t * bins + b] = m;
}
const sample = Array.from({ length: Math.min(4000, db.length) }, (_, i) => db[Math.floor((i * db.length) / Math.min(4000, db.length))]).sort((a, b) => a - b);
const floor = sample[Math.floor(sample.length / 2)] + FLOOR_DB;
const loudest = sample[sample.length - 1];
const cands = [];
for (let t = 0; t < frames; t++)
for (let b = MIN_BIN; b < bins; b++) {
const v = db[t * bins + b];
if (v < floor || v < loudest - 70 || v !== fmax[t * bins + b])
continue;
let top = true;
for (let k = Math.max(0, t - PEAK_DT); k <= Math.min(frames - 1, t + PEAK_DT) && top; k++)
if (k !== t && fmax[k * bins + b] > v)
top = false;
if (top)
cands.push([t, b, v]);
}

const block = Math.round(1 / FRAME_SECONDS);
const kept = [];
const byBlock = new Map();
for (const c of cands) {
const k = Math.floor(c[0] / block);
let a = byBlock.get(k);
if (!a)
byBlock.set(k, (a = []));
a.push(c);
}
for (const a of byBlock.values())
for (const c of a.sort((p, q) => q[2] - p[2]).slice(0, PEAKS_PER_SECOND))
kept.push([c[0], c[1]]);
return kept.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}
const packHash = (f1, f2, dt) => (((f1 & 511) << 15) | ((f2 & 511) << 6) | (dt & 63)) >>> 0;
const unpackHash = (h) => ({ f1: (h >>> 15) & 511, f2: (h >>> 6) & 511, dt: h & 63 });

function landmarks(peaks) {
const hs = [], fs = [];
for (let i = 0; i < peaks.length; i++) {
const [t1, f1] = peaks[i];
let n = 0;
for (let j = i + 1; j < peaks.length && n < FANOUT; j++) {
const [t2, f2] = peaks[j];
const dt = t2 - t1;
if (dt < DT_MIN)
continue;
if (dt > DT_MAX)
break;
if (Math.abs(f2 - f1) > DF_MAX)
continue;
hs.push(packHash(f1, f2, dt));
fs.push(t1);
n++;
}
}
return { hashes: Uint32Array.from(hs), frames: Uint32Array.from(fs) };
}

function fingerprintAudio(input) {
const mono = resampleAudio(toMono(input), input.sampleRate);
return fingerprintSamples(mono);
}

function fingerprintSamples(mono) {
const peaks = pickPeaks(spectrogram(mono));
const { hashes, frames } = landmarks(peaks);
const flat = peaks.flat();
const big = flat.some((v) => v > 65535);
return { kind: "audio", duration: mono.length / AUDIO_RATE, hashes, frames, peaks: big ? Uint32Array.from(flat) : Uint16Array.from(flat) };
}

const MIN_ALIGNED = 20;

const CLEAR_RATIO = 3;

const SAME_SLACK = 0.1;
const SAME_SHIFT = 1.5;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const AUDIO_WORDS = {
same: "The same recording, start to finish. It may have been re-encoded, turned up or down, or had noise or another sound added.",
contains: "This file contains your audio.",
different: "Different audio. None of your recording was found in it.",
};

function hashIndex(fp) {
const m = new Map();
for (let i = 0; i < fp.hashes.length; i++) {
const h = fp.hashes[i];
let a = m.get(h);
if (!a)
m.set(h, (a = []));
a.push(fp.frames[i]);
}
return m;
}

function vote(original, index) {
const votes = new Map();
for (let i = 0; i < original.hashes.length; i++) {
const hits = index.get(original.hashes[i]);
if (!hits)
continue;
const t = original.frames[i];
for (const s of hits) {
const d = s - t;
let a = votes.get(d);
if (!a)
votes.set(d, (a = []));
a.push(t);
}
}
return votes;
}

function readVotes(votes, original, suspect) {
let bestD = 0, bestN = 0;
const near = (d) => (votes.get(d - 1)?.length ?? 0) + (votes.get(d)?.length ?? 0) + (votes.get(d + 1)?.length ?? 0);
for (const d of votes.keys()) {
const n = near(d);
if (n > bestN || (n === bestN && d < bestD)) {
bestN = n;
bestD = d;
}
}
let runnerUp = 0;
for (const d of votes.keys())
if (Math.abs(d - bestD) > 3)
runnerUp = Math.max(runnerUp, near(d));
const times = [...(votes.get(bestD - 1) ?? []), ...(votes.get(bestD) ?? []), ...(votes.get(bestD + 1) ?? [])].sort((a, b) => a - b);

const lo = times[Math.floor(times.length * 0.02)] ?? 0, hi = times[Math.ceil(times.length * 0.98) - 1] ?? 0;
const originalStart = lo * FRAME_SECONDS;
const duration = times.length ? (hi - lo) * FRAME_SECONDS + (DT_MAX * FRAME_SECONDS) / 2 : 0;
const offset = Math.max(0, originalStart + bestD * FRAME_SECONDS);
const found = bestN >= MIN_ALIGNED && bestN >= CLEAR_RATIO * Math.max(1, runnerUp);

const longer = Math.max(original.duration, suspect.duration);
const same = found && Math.abs(original.duration - suspect.duration) <= Math.max(1, SAME_SLACK * longer) && Math.abs(bestD * FRAME_SECONDS) <= SAME_SHIFT;
const verdict = same ? "same" : found ? "contains" : "different";
const clarity = 1 - Math.max(1, runnerUp) / Math.max(1, bestN);
const strength = 1 - Math.exp(-bestN / (MIN_ALIGNED * 1.5));
const confidence = found ? Math.round(Math.max(0, clarity * strength) * 100) / 100 : Math.round(Math.min(0.3, clarity * strength) * 100) / 100;
const words = verdict === "contains"
? `${AUDIO_WORDS.contains} Your audio appears at ${clock(offset)} to ${clock(offset + duration)} in it, about ${Math.max(1, Math.round(duration))} s taken from ${clock(originalStart)} into yours.`
: AUDIO_WORDS[verdict];
return { verdict, offset: round2(offset), originalStart: round2(originalStart), duration: round2(duration), aligned: bestN, runnerUp, confidence, words };
}
const round2 = (x) => Math.round(x * 100) / 100;

function matchAudio(original, suspect) {
return readVotes(vote(original, hashIndex(suspect)), original, suspect);
}
const audioToJSON = (a) => ({ kind: "audio", duration: a.duration, hashes: [...a.hashes], frames: [...a.frames], peaks: [...a.peaks] });
const audioFromJSON = (j) => ({ kind: "audio", duration: j.duration, hashes: Uint32Array.from(j.hashes), frames: Uint32Array.from(j.frames), peaks: j.peaks.some((v) => v > 65535) ? Uint32Array.from(j.peaks) : Uint16Array.from(j.peaks) });
});
__o.d("site/engine/protect/audiosynth.js", function (__x) {
"use strict";
__o.e(__x, { tones: () => tones, chirps: () => chirps, melody: () => melody, speech: () => speech, gain: () => gain, addNoise: () => addNoise, mixOver: () => mixOver, lowpass: () => lowpass, requantise: () => requantise, mp3Like: () => mp3Like, speed: () => speed, concat: () => concat, slice: () => slice, normalise: () => normalise, encodeWav: () => encodeWav });
const { rng } = __o.r("site/engine/protect/synth.js");
const { AUDIO_RATE } = __o.r("site/engine/protect/audio.js");

const TAU = Math.PI * 2;

function envelope(i, n, rate) {
const a = Math.min(1, i / (0.01 * rate));
const r = Math.min(1, (n - i) / (0.03 * rate));
return a * r * (0.6 + 0.4 * Math.exp(-i / (0.25 * rate)));
}

function tones(seed, seconds, rate = AUDIO_RATE) {
const r = rng(seed);
const out = new Float32Array(Math.round(seconds * rate));
for (let at = 0; at < out.length;) {
const n = Math.round((0.1 + r() * 0.3) * rate);
const f = 200 + r() * 2300;
for (let i = 0; i < n && at + i < out.length; i++)
out[at + i] = 0.5 * envelope(i, n, rate) * Math.sin((TAU * f * i) / rate);
at += n;
}
return out;
}

function chirps(seed, seconds, rate = AUDIO_RATE) {
const r = rng(seed);
const out = new Float32Array(Math.round(seconds * rate));
for (let at = 0; at < out.length;) {
const n = Math.round((0.3 + r() * 0.7) * rate);
const f0 = 150 + r() * 1500, f1 = 150 + r() * 2500;
let ph = 0;
for (let i = 0; i < n && at + i < out.length; i++) {
const f = f0 + ((f1 - f0) * i) / n;
ph += (TAU * f) / rate;
out[at + i] = envelope(i, n, rate) * (0.45 * Math.sin(ph) + 0.15 * Math.sin(2 * ph));
}
at += n;
}
return out;
}
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];

function melody(seed, seconds, rate = AUDIO_RATE) {
const r = rng(seed);
const out = new Float32Array(Math.round(seconds * rate));
const root = 196 * 2 ** (Math.floor(r() * 7) / 12);
const beat = 0.18 + r() * 0.2;
const amps = [0.3, 0.16, 0.1, 0.06, 0.04];
for (let at = 0, k = 0; at < out.length; k++) {
const n = Math.round(beat * (1 + Math.floor(r() * 3)) * rate);
const f = root * 2 ** (SCALE[Math.floor(r() * SCALE.length)] / 12);
const bass = (root / 2) * 2 ** (SCALE[(k >> 2) % 5] / 12);
for (let i = 0; i < n && at + i < out.length; i++) {
const e = envelope(i, n, rate);
let s = 0;
for (let h = 0; h < amps.length; h++)
s += amps[h] * Math.sin((TAU * f * (h + 1) * i) / rate);
out[at + i] = e * s + 0.12 * Math.sin((TAU * bass * (at + i)) / rate);
}
at += n;
}
return out;
}

const VOWELS = [[730, 1090, 2440], [270, 2290, 3010], [300, 870, 2240], [530, 1840, 2480], [570, 840, 2410], [640, 1190, 2390]];

function speech(seed, seconds, rate = AUDIO_RATE) {
const r = rng(seed);
const noise = rng(seed ^ 0x51ed);
const out = new Float32Array(Math.round(seconds * rate));
const pitch = 90 + r() * 140;
for (let at = 0; at < out.length;) {
if (r() < 0.3) {
const n = Math.round((0.04 + r() * 0.08) * rate);
for (let i = 0; i < n && at + i < out.length; i++)
out[at + i] = 0.12 * (noise() - 0.5) * envelope(i, n, rate);
at += n;
}
const n = Math.round((0.12 + r() * 0.22) * rate);
const v = VOWELS[Math.floor(r() * VOWELS.length)];
const glide = (r() - 0.5) * 0.3;
for (let i = 0; i < n && at + i < out.length; i++) {
const f0 = pitch * (1 + (glide * i) / n);
let s = 0;
for (let h = 1; f0 * h < rate / 2 && h < 40; h++) {
const fh = f0 * h;
let g = 0;
for (let k = 0; k < 3; k++)
g += Math.exp(-(((fh - v[k]) / (80 + 40 * k)) ** 2)) / (k + 1);
s += g * Math.sin((TAU * fh * i) / rate);
}
out[at + i] = 0.25 * envelope(i, n, rate) * s;
}
at += n + Math.round(r() * 0.12 * rate);
}
return out;
}


function gain(x, db) {
const g = 10 ** (db / 20);
return x.map((v) => v * g);
}
const power = (x) => { let s = 0; for (const v of x)
s += v * v; return s / Math.max(1, x.length); };

function addNoise(x, snrDb, seed = 1) {
const r = rng(seed);
const sd = Math.sqrt(power(x) / 10 ** (snrDb / 10));
return x.map((v) => v + sd * Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r()));
}

function mixOver(x, over, db) {
const k = Math.sqrt(power(x) / Math.max(1e-12, power(over))) * 10 ** (db / 20);
return x.map((v, i) => v + k * (over[i % over.length] ?? 0));
}

function lowpass(x, cutoff, rate = AUDIO_RATE) {
const taps = 63, m = (taps - 1) / 2, fc = cutoff / rate;
const h = Float64Array.from({ length: taps }, (_, i) => { const d = i - m; const s = d === 0 ? 2 * fc : Math.sin(TAU * fc * d) / (Math.PI * d); return s * (0.54 - 0.46 * Math.cos((TAU * i) / (taps - 1))); });
const sum = h.reduce((a, b) => a + b, 0);
const out = new Float32Array(x.length);
for (let i = 0; i < x.length; i++) {
let s = 0;
for (let k = 0; k < taps; k++) {
const j = i - k + m;
if (j >= 0 && j < x.length)
s += x[j] * h[k];
}
out[i] = s / sum;
}
return out;
}

function requantise(x, bits) {
const q = 2 ** (bits - 1);
return x.map((v) => Math.max(-1, Math.min(1, Math.round(v * q) / q)));
}

const mp3Like = (x, rate = AUDIO_RATE) => requantise(lowpass(x, 3500, rate), 8);

function speed(x, factor) {
const n = Math.floor(x.length / factor);
const out = new Float32Array(n);
for (let i = 0; i < n; i++) {
const t = i * factor, k = Math.floor(t), f = t - k;
out[i] = (x[k] ?? 0) * (1 - f) + (x[k + 1] ?? 0) * f;
}
return out;
}
function concat(...parts) {
const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
let at = 0;
for (const p of parts) {
out.set(p, at);
at += p.length;
}
return out;
}
const slice = (x, from, to, rate = AUDIO_RATE) => x.slice(Math.round(from * rate), Math.round(to * rate));

function normalise(x, peak = 0.9) {
let m = 0;
for (const v of x)
m = Math.max(m, Math.abs(v));
return m ? x.map((v) => (v * peak) / m) : x;
}

function encodeWav(x, rate = AUDIO_RATE) {
const buf = new ArrayBuffer(44 + x.length * 2);
const v = new DataView(buf);
const str = (o, s) => { for (let i = 0; i < s.length; i++)
v.setUint8(o + i, s.charCodeAt(i)); };
str(0, "RIFF");
v.setUint32(4, 36 + x.length * 2, true);
str(8, "WAVE");
str(12, "fmt ");
v.setUint32(16, 16, true);
v.setUint16(20, 1, true);
v.setUint16(22, 1, true);
v.setUint32(24, rate, true);
v.setUint32(28, rate * 2, true);
v.setUint16(32, 2, true);
v.setUint16(34, 16, true);
str(36, "data");
v.setUint32(40, x.length * 2, true);
for (let i = 0; i < x.length; i++)
v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 32767, true);
return new Uint8Array(buf);
}
});
__o.d("site/engine/protect/compare.js", function (__x) {
"use strict";
__o.e(__x, { SAME_MAX: () => SAME_MAX, EDITED_MAX: () => EDITED_MAX, WINDOWS: () => WINDOWS, fingerprintImage: () => fingerprintImage, scoreOf: () => scoreOf, verdictOf: () => verdictOf, VERDICT_WORDS: () => VERDICT_WORDS, compare: () => compare, imageToJSON: () => imageToJSON, imageFromJSON: () => imageFromJSON });
const { dHash, pHash, hamming, toHex, fromHex } = __o.r("site/engine/protect/image.js");
const { toGrey } = __o.r("site/engine/protect/image.js");

const SAME_MAX = 6;
const EDITED_MAX = 14;
const WINDOWS = [
{ keep: 1, x: 0.5, y: 0.5, name: "whole" },
{ keep: 0.9, x: 0.5, y: 0.5, name: "centre" },
{ keep: 0.9, x: 0, y: 0, name: "top left" },
{ keep: 0.9, x: 1, y: 0, name: "top right" },
{ keep: 0.9, x: 0, y: 1, name: "bottom left" },
{ keep: 0.9, x: 1, y: 1, name: "bottom right" },
{ keep: 0.9, x: 0.5, y: 0, name: "top" },
{ keep: 0.9, x: 0.5, y: 1, name: "bottom" },
{ keep: 0.9, x: 0, y: 0.5, name: "left" },
{ keep: 0.9, x: 1, y: 0.5, name: "right" },
];
function cut(g, w) {
if (w.keep >= 1)
return g;
const cw = Math.max(1, Math.round(g.width * w.keep)), ch = Math.max(1, Math.round(g.height * w.keep));
const x0 = Math.round((g.width - cw) * w.x), y0 = Math.round((g.height - ch) * w.y);
const data = new Float64Array(cw * ch);
for (let y = 0; y < ch; y++)
data.set(g.data.subarray((y0 + y) * g.width + x0, (y0 + y) * g.width + x0 + cw), y * cw);
return { width: cw, height: ch, data };
}

function fingerprintImage(img) {
const g = toGrey(img);
const windows = WINDOWS.map((w) => { const c = cut(g, w); return { dhash: dHash(c), phash: pHash(c) }; });
return { kind: "image", width: img.width, height: img.height, dhash: windows[0].dhash, phash: windows[0].phash, windows };
}
const scoreOf = (pDist, dDist) => Math.round(((2 * pDist + dDist) / 3) * 10) / 10;
function verdictOf(score, whole) {
if (score <= SAME_MAX && whole)
return "same";
if (score <= EDITED_MAX)
return "edited";
return "different";
}
const VERDICT_WORDS = {
same: "The same picture. It may have been resized, re-saved, brightened or re-coloured, but what it shows has not changed.",
edited: "Very likely a copy of your picture, edited: cropped, stamped, strongly re-graded or heavily recompressed.",
different: "Different pictures. Nothing here suggests one was made from the other.",
};

function compare(original, suspect) {
let best = { i: 0, d: 64, p: 64, s: 99 };
original.windows.forEach((w, i) => {
const d = hamming(w.dhash, suspect.dhash), p = hamming(w.phash, suspect.phash), s = scoreOf(p, d);
if (s < best.s)
best = { i, d, p, s };
});
const verdict = verdictOf(best.s, best.i === 0);
const where = WINDOWS[best.i].name;
const words = verdict === "edited" && best.i > 0 ? `${VERDICT_WORDS.edited.replace(/\.$/, "")}. It lines up best with the ${where} of your original, so it looks cropped.` : VERDICT_WORDS[verdict];
return {
dDistance: hamming(original.dhash, suspect.dhash),
pDistance: hamming(original.phash, suspect.phash),
window: where,
bestD: best.d,
bestP: best.p,
score: best.s,
verdict,
words,
};
}
function imageToJSON(fp) {
return { kind: "image", width: fp.width, height: fp.height, dhash: toHex(fp.dhash), phash: toHex(fp.phash), windows: fp.windows.map((w) => [toHex(w.dhash), toHex(w.phash)]) };
}
function imageFromJSON(j) {
const windows = j.windows.map(([d, p]) => ({ dhash: fromHex(d), phash: fromHex(p) }));
return { kind: "image", width: j.width, height: j.height, dhash: fromHex(j.dhash), phash: fromHex(j.phash), windows };
}
});
__o.d("site/engine/protect/image.js", function (__x) {
"use strict";
__o.e(__x, { toGrey: () => toGrey, resample: () => resample, dHash: () => dHash, lowDct: () => lowDct, pHash: () => pHash, hamming: () => hamming, toHex: () => toHex, fromHex: () => fromHex, bits: () => bits });

const MASK64 = (1n << 64n) - 1n;

function toGrey(img) {
const { width, height, data } = img;
const n = width * height;
if (!(width > 0 && height > 0))
throw new Error("toGrey: the image has no pixels");
const ch = img.channels ?? (data.length / n);
if (ch !== 1 && ch !== 3 && ch !== 4)
throw new Error(`toGrey: ${data.length} values do not fit ${width}x${height} at 1, 3 or 4 channels`);
const out = new Float64Array(n);
for (let i = 0; i < n; i++) {
if (ch === 1) {
out[i] = data[i];
continue;
}
const o = i * ch;
const y = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
if (ch === 4) {
const a = data[o + 3] / 255;
out[i] = y * a + 255 * (1 - a);
}
else
out[i] = y;
}
return { width, height, data: out };
}

function boxWeights(n, tn) {
const out = [];
const span = n / tn;
for (let i = 0; i < tn; i++) {
let a = i * span;
let b = (i + 1) * span;
if (span < 1) {
const c = (a + b) / 2;
a = Math.max(0, c - 0.5);
b = Math.min(n, c + 0.5);
}
const row = [];
let total = 0;
for (let s = Math.floor(a); s < Math.ceil(b) && s < n; s++) {
const w = Math.min(b, s + 1) - Math.max(a, s);
if (w > 1e-9) {
row.push([s, w]);
total += w;
}
}
for (const r of row)
r[1] /= total;
out.push(row);
}
return out;
}

function resample(g, tw, th) {
const wx = boxWeights(g.width, tw);
const wy = boxWeights(g.height, th);
const mid = new Float64Array(tw * g.height);
for (let y = 0; y < g.height; y++) {
const row = y * g.width;
for (let x = 0; x < tw; x++) {
let s = 0;
for (const [sx, w] of wx[x])
s += g.data[row + sx] * w;
mid[y * tw + x] = s;
}
}
const out = new Float64Array(tw * th);
for (let y = 0; y < th; y++) {
for (let x = 0; x < tw; x++) {
let s = 0;
for (const [sy, w] of wy[y])
s += mid[sy * tw + x] * w;
out[y * tw + x] = s;
}
}
return { width: tw, height: th, data: out };
}

const asGrey = (img) => (img.data instanceof Float64Array && img.data.length === img.width * img.height ? img : toGrey(img));

function dHash(img) {
const s = resample(asGrey(img), 9, 8).data;
let h = 0n;
for (let y = 0; y < 8; y++)
for (let x = 0; x < 8; x++)
h = (h << 1n) | (s[y * 9 + x] > s[y * 9 + x + 1] ? 1n : 0n);
return h;
}

const N = 32;
const COS = Array.from({ length: 8 }, (_, u) => Float64Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))));

function lowDct(g32) {
if (g32.width !== N || g32.height !== N)
throw new Error("lowDct: needs a 32x32 plane");
const rows = new Float64Array(N * 8);
for (let y = 0; y < N; y++)
for (let u = 0; u < 8; u++) {
let s = 0;
const c = COS[u];
for (let x = 0; x < N; x++)
s += g32.data[y * N + x] * c[x];
rows[y * 8 + u] = s;
}
const out = new Float64Array(64);
for (let v = 0; v < 8; v++)
for (let u = 0; u < 8; u++) {
let s = 0;
const c = COS[v];
for (let y = 0; y < N; y++)
s += rows[y * 8 + u] * c[y];
out[v * 8 + u] = s;
}
return out;
}

function pHash(img) {
const d = lowDct(resample(asGrey(img), N, N));
const ac = Array.from(d.subarray(1));
const sorted = [...ac].sort((a, b) => a - b);
const median = (sorted[31] + sorted[32]) / 2;
let h = d[1] > d[8] ? 1n : 0n;
for (let i = 1; i < 64; i++)
h = (h << 1n) | (d[i] > median ? 1n : 0n);
return h;
}

function hamming(a, b) {
let x = (a ^ b) & MASK64;
let n = 0;
while (x) {
x &= x - 1n;
n++;
}
return n;
}

function toHex(h) {
return (h & MASK64).toString(16).padStart(16, "0");
}
function fromHex(hex) {
if (!/^[0-9a-f]{16}$/i.test(hex))
throw new Error(`fromHex: "${hex}" is not 16 hex digits`);
return BigInt(`0x${hex}`);
}

function bits(h) {
return Array.from({ length: 64 }, (_, i) => ((h >> BigInt(63 - i)) & 1n) === 1n);
}
});
__o.d("site/engine/protect/index.js", function (__x) {
"use strict";
__o.e(__x, { toGrey: () => __re0.toGrey, resample: () => __re0.resample, lowDct: () => __re0.lowDct, dHash: () => __re0.dHash, pHash: () => __re0.pHash, hamming: () => __re0.hamming, toHex: () => __re0.toHex, fromHex: () => __re0.fromHex, bits: () => __re0.bits, fingerprintImage: () => __re1.fingerprintImage, compare: () => __re1.compare, scoreOf: () => __re1.scoreOf, verdictOf: () => __re1.verdictOf, imageToJSON: () => __re1.imageToJSON, imageFromJSON: () => __re1.imageFromJSON, SAME_MAX: () => __re1.SAME_MAX, EDITED_MAX: () => __re1.EDITED_MAX, WINDOWS: () => __re1.WINDOWS, VERDICT_WORDS: () => __re1.VERDICT_WORDS, sampleTimes: () => __re2.sampleTimes, fingerprintVideo: () => __re2.fingerprintVideo, findClip: () => __re2.findClip, videoToJSON: () => __re2.videoToJSON, videoFromJSON: () => __re2.videoFromJSON, DEFAULT_INTERVAL: () => __re2.DEFAULT_INTERVAL, FRAME_MATCH_MAX: () => __re2.FRAME_MATCH_MAX, MIN_RUN: () => __re2.MIN_RUN, BKTree: () => __re3.BKTree, createRegistry: () => __re3.createRegistry, createAudioRegistry: () => __re3.createAudioRegistry, toRightsRef: () => __re3.toRightsRef, parseRightsRef: () => __re3.parseRightsRef, AUDIO_RATE: () => __re4.AUDIO_RATE, FFT_SIZE: () => __re4.FFT_SIZE, HOP: () => __re4.HOP, FRAME_SECONDS: () => __re4.FRAME_SECONDS, MIN_ALIGNED: () => __re4.MIN_ALIGNED, CLEAR_RATIO: () => __re4.CLEAR_RATIO, SAME_SLACK: () => __re4.SAME_SLACK, SAME_SHIFT: () => __re4.SAME_SHIFT, AUDIO_WORDS: () => __re4.AUDIO_WORDS, toMono: () => __re4.toMono, resampleAudio: () => __re4.resampleAudio, fft: () => __re4.fft, spectrogram: () => __re4.spectrogram, pickPeaks: () => __re4.pickPeaks, packHash: () => __re4.packHash, unpackHash: () => __re4.unpackHash, landmarks: () => __re4.landmarks, fingerprintAudio: () => __re4.fingerprintAudio, fingerprintSamples: () => __re4.fingerprintSamples, hashIndex: () => __re4.hashIndex, vote: () => __re4.vote, readVotes: () => __re4.readVotes, matchAudio: () => __re4.matchAudio, audioToJSON: () => __re4.audioToJSON, audioFromJSON: () => __re4.audioFromJSON, tones: () => __re5.tones, chirps: () => __re5.chirps, melody: () => __re5.melody, speech: () => __re5.speech, gain: () => __re5.gain, addNoise: () => __re5.addNoise, mixOver: () => __re5.mixOver, lowpass: () => __re5.lowpass, requantise: () => __re5.requantise, mp3Like: () => __re5.mp3Like, speed: () => __re5.speed, concat: () => __re5.concat, slice: () => __re5.slice, normalise: () => __re5.normalise, encodeWav: () => __re5.encodeWav, rng: () => __re6.rng, blank: () => __re6.blank, makePhoto: () => __re6.makePhoto, makeShapes: () => __re6.makeShapes, makeNoise: () => __re6.makeNoise, resize: () => __re6.resize, crop: () => __re6.crop, cropBy: () => __re6.cropBy, brightness: () => __re6.brightness, grade: () => __re6.grade, overlay: () => __re6.overlay, recompress: () => __re6.recompress, WARM_GRADE: () => __re6.WARM_GRADE });
const __re0 = __o.r("site/engine/protect/image.js");
const __re1 = __o.r("site/engine/protect/compare.js");
const __re2 = __o.r("site/engine/protect/video.js");
const __re3 = __o.r("site/engine/protect/registry.js");
const __re4 = __o.r("site/engine/protect/audio.js");
const __re5 = __o.r("site/engine/protect/audiosynth.js");
const __re6 = __o.r("site/engine/protect/synth.js");

});
__o.d("site/engine/protect/registry.js", function (__x) {
"use strict";
__o.e(__x, { BKTree: () => BKTree, toRightsRef: () => toRightsRef, parseRightsRef: () => parseRightsRef, createRegistry: () => createRegistry, createAudioRegistry: () => createAudioRegistry });
const { hamming, toHex } = __o.r("site/engine/protect/image.js");
const { compare, EDITED_MAX } = __o.r("site/engine/protect/compare.js");
const { readVotes } = __o.r("site/engine/protect/audio.js");


class BKTree {
root = null;
count = 0;

lastVisited = 0;
get size() { return this.count; }
add(hash, item) {
this.count++;
if (!this.root) {
this.root = { hash, items: [item], kids: new Map() };
return;
}
let node = this.root;
for (;;) {
const d = hamming(hash, node.hash);
if (d === 0) {
node.items.push(item);
return;
}
const next = node.kids.get(d);
if (!next) {
node.kids.set(d, { hash, items: [item], kids: new Map() });
return;
}
node = next;
}
}

within(hash, radius) {
const out = [];
this.lastVisited = 0;
if (!this.root)
return out;
const stack = [this.root];
while (stack.length) {
const node = stack.pop();
const d = hamming(hash, node.hash);
this.lastVisited++;
if (d <= radius)
for (const item of node.items)
out.push({ item, hash: node.hash, distance: d });
for (const [k, kid] of node.kids)
if (k >= d - radius && k <= d + radius)
stack.push(kid);
}
return out.sort((a, b) => a.distance - b.distance);
}

nearest(hash, k = 1, maxRadius = 64) {
let visited = 0;
for (let r = Math.min(4, maxRadius);; r = Math.min(maxRadius, r * 2)) {
const hits = this.within(hash, r);
visited += this.lastVisited;
if (hits.length >= k || r >= maxRadius) {
this.lastVisited = visited;
return hits.slice(0, k);
}
}
}
}

const FNV_OFFSET = 0xcbf29ce484222325n, FNV_PRIME = 0x100000001b3n, M64 = (1n << 64n) - 1n;
function fnv64(s) {
let h = FNV_OFFSET;
for (let i = 0; i < s.length; i++) {
h ^= BigInt(s.charCodeAt(i));
h = (h * FNV_PRIME) & M64;
}
return h.toString(16).padStart(16, "0");
}

function toRightsRef(fp) {
if ("algo" in fp)
return `fp:${fp.algo}:${toHex(fp.hash)}`;
if (fp.kind === "image")
return `fp:phash:${toHex(fp.phash)}`;
if (fp.kind === "audio") {
let txt = "";
for (let i = 0; i < fp.hashes.length; i++)
txt += `${fp.hashes[i].toString(36)}@${fp.frames[i].toString(36)},`;
return `fp:audio:${fnv64(txt)}`;
}
return `fp:vphash:${fnv64(`${fp.interval}|${fp.hashes.map(toHex).join("")}`)}`;
}
function parseRightsRef(ref) {
const m = /^fp:(phash|dhash|vphash|audio):([0-9a-f]{16})$/.exec(ref);
return m ? { algo: m[1], hex: m[2] } : null;
}

function createRegistry() {
const tree = new BKTree();
const byRef = new Map();
let visited = 0;

const radius = Math.floor(EDITED_MAX * 1.5);
return {
get size() { return byRef.size; },
get lastVisited() { return visited; },
add(e) {
const ref = e.ref ?? toRightsRef(e.fingerprint);
const existing = byRef.get(ref);
if (existing)
return existing;
const entry = { ref, owner: e.owner, addedAt: e.addedAt, fingerprint: e.fingerprint, ...(e.title !== undefined ? { title: e.title } : {}) };
byRef.set(ref, entry);
for (const w of e.fingerprint.windows)
tree.add(w.phash, ref);
return entry;
},
get: (ref) => byRef.get(ref),
query(fp, { k = 5, includeDifferent = false } = {}) {
const refs = new Set();
const hits = includeDifferent ? tree.nearest(fp.phash, k * WINDOW_FANOUT) : tree.within(fp.phash, radius);
visited = tree.lastVisited;
for (const h of hits)
refs.add(h.item);
const out = [];
for (const ref of refs) {
const entry = byRef.get(ref);
const comparison = compare(entry.fingerprint, fp);
if (includeDifferent || comparison.verdict !== "different")
out.push({ entry, comparison });
}
return out.sort((a, b) => a.comparison.score - b.comparison.score).slice(0, k);
},
};
}

const WINDOW_FANOUT = 10;

function createAudioRegistry() {
const postings = new Map(); 
const entries = [];
const byRef = new Map();
let visited = 0;
return {
get size() { return entries.length; },
get lastVisited() { return visited; },
add(e) {
const ref = e.ref ?? toRightsRef(e.fingerprint);
const at = byRef.get(ref);
if (at !== undefined)
return entries[at];
const entry = { ref, owner: e.owner, addedAt: e.addedAt, fingerprint: e.fingerprint, ...(e.title !== undefined ? { title: e.title } : {}) };
const id = entries.push(entry) - 1;
byRef.set(ref, id);
const fp = e.fingerprint;
for (let i = 0; i < fp.hashes.length; i++) {
const h = fp.hashes[i];
let p = postings.get(h);
if (!p)
postings.set(h, (p = []));
p.push(id, fp.frames[i]);
}
return entry;
},
get: (ref) => { const i = byRef.get(ref); return i === undefined ? undefined : entries[i]; },
query(suspect, { k = 5, includeDifferent = false } = {}) {

const votes = new Map();
visited = 0;
for (let i = 0; i < suspect.hashes.length; i++) {
const p = postings.get(suspect.hashes[i]);
if (!p)
continue;
const ts = suspect.frames[i];
for (let j = 0; j < p.length; j += 2) {
visited++;
const id = p[j], tr = p[j + 1];
let m = votes.get(id);
if (!m)
votes.set(id, (m = new Map()));
const d = ts - tr;
let a = m.get(d);
if (!a)
m.set(d, (a = []));
a.push(tr);
}
}
const out = [];
for (const [id, v] of votes) {
const entry = entries[id];
const match = readVotes(v, entry.fingerprint, suspect);
if (includeDifferent || match.verdict !== "different")
out.push({ entry, match });
}
return out.sort((a, b) => b.match.aligned - a.match.aligned).slice(0, k);
},
};
}
});
__o.d("site/engine/protect/synth.js", function (__x) {
"use strict";
__o.e(__x, { rng: () => rng, blank: () => blank, makePhoto: () => makePhoto, makeShapes: () => makeShapes, makeNoise: () => makeNoise, resize: () => resize, crop: () => crop, cropBy: () => cropBy, brightness: () => brightness, grade: () => grade, WARM_GRADE: () => WARM_GRADE, overlay: () => overlay, recompress: () => recompress });


function rng(seed) {
let a = seed >>> 0;
return () => {
a = (a + 0x6d2b79f5) >>> 0;
let t = a;
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
function blank(width, height, rgb = [255, 255, 255]) {
const data = new Uint8ClampedArray(width * height * 4);
for (let i = 0; i < width * height; i++) {
data[i * 4] = rgb[0];
data[i * 4 + 1] = rgb[1];
data[i * 4 + 2] = rgb[2];
data[i * 4 + 3] = 255;
}
return { width, height, data, channels: 4 };
}
const mix = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

const SKIES = [
[[96, 150, 214], [214, 232, 244]],
[[236, 160, 92], [250, 226, 170]],
[[64, 120, 140], [190, 220, 214]],
[[150, 170, 186], [232, 236, 236]],
];
const LANDS = [[58, 92, 62], [92, 112, 58], [120, 96, 62], [52, 74, 84], [84, 70, 52]];

function ridge(r, knots) {
const k = Array.from({ length: knots + 2 }, () => r());
return (x) => {
const p = x * knots;
const i = Math.floor(p);
const f = p - i;
const s = f * f * (3 - 2 * f);
return mix(k[i], k[i + 1], s);
};
}

function makePhoto(seed, width = 480, height = 320) {
const r = rng(seed);
const img = blank(width, height);
const d = img.data;
const [skyTop, skyLow] = SKIES[Math.floor(r() * SKIES.length)];
const horizon = 0.3 + r() * 0.35;
const sun = { x: r(), y: horizon * (0.25 + r() * 0.6), r: 0.05 + r() * 0.08 };
const clouds = Array.from({ length: 2 + Math.floor(r() * 4) }, () => ({ x: r(), y: r() * horizon * 0.8, w: 0.12 + r() * 0.22, h: 0.03 + r() * 0.05 }));
const layers = [0, 1, 2].map((i) => ({
base: horizon + i * (0.08 + r() * 0.1),
amp: 0.06 + r() * 0.16,
line: ridge(r, 3 + Math.floor(r() * 6)),
colour: mixRgb(LANDS[Math.floor(r() * LANDS.length)], [20, 26, 24], i * 0.22),
}));
const lake = r() < 0.5 ? { top: layers[1].base + 0.04 + r() * 0.06, x0: r() * 0.4, x1: 0.6 + r() * 0.4 } : null;
const trees = Array.from({ length: 6 + Math.floor(r() * 18) }, () => ({ x: r(), s: 0.03 + r() * 0.06 }));
const grain = rng(seed ^ 0x9e3779b9);
const front = layers[2];
for (let y = 0; y < height; y++) {
const v = y / height;
for (let x = 0; x < width; x++) {
const u = x / width;
let c = mixRgb(skyTop, skyLow, Math.min(1, v / Math.max(0.01, horizon + 0.1)));
const sd = Math.hypot((u - sun.x) * (width / height), v - sun.y);
if (sd < sun.r)
c = mixRgb(c, [255, 246, 214], 0.92);
else if (sd < sun.r * 2.2)
c = mixRgb(c, [255, 240, 200], 0.25 * (1 - (sd - sun.r) / (sun.r * 1.2)));
for (const cl of clouds) {
const e = ((u - cl.x) / cl.w) ** 2 + ((v - cl.y) / cl.h) ** 2;
if (e < 1)
c = mixRgb(c, [246, 248, 248], 0.75 * (1 - e));
}
for (const L of layers) {
const top = L.base - L.amp * L.line(u);
if (v > top)
c = mixRgb(L.colour, [L.colour[0] * 0.6, L.colour[1] * 0.6, L.colour[2] * 0.6], Math.min(1, (v - top) * 2.5));
}
if (lake && v > lake.top && u > lake.x0 && u < lake.x1 && v < front.base - front.amp * front.line(u)) {
c = mixRgb(mixRgb(skyLow, skyTop, 0.4), [40, 70, 90], Math.min(1, (v - lake.top) * 4));
}
for (const t of trees) {
const ground = front.base - front.amp * front.line(t.x);
const dx = Math.abs(u - t.x) * (width / height);
const h = t.s * 2.2;
if (v < ground + 0.01 && v > ground - h && dx < (t.s * 0.5 * (v - (ground - h))) / h)
c = [28, 52, 36];
}
const n = (grain() - 0.5) * 14;
const o = (y * width + x) * 4;
d[o] = c[0] + n;
d[o + 1] = c[1] + n;
d[o + 2] = c[2] + n;
}
}
return img;
}

function makeShapes(seed, width = 320, height = 320) {
const r = rng(seed);
const img = blank(width, height);
const a = [r() * 255, r() * 255, r() * 255];
const b = [r() * 255, r() * 255, r() * 255];
const angle = r() * Math.PI * 2;
const shapes = Array.from({ length: 4 + Math.floor(r() * 6) }, () => ({ kind: r() < 0.5 ? "c" : "r", x: r(), y: r(), s: 0.08 + r() * 0.25, c: [r() * 255, r() * 255, r() * 255] }));
const grain = rng(seed + 17);
for (let y = 0; y < height; y++)
for (let x = 0; x < width; x++) {
const u = x / width, v = y / height;
let c = mixRgb(a, b, Math.min(1, Math.max(0, 0.5 + (u - 0.5) * Math.cos(angle) + (v - 0.5) * Math.sin(angle))));
for (const s of shapes) {
const inside = s.kind === "c" ? Math.hypot(u - s.x, v - s.y) < s.s : Math.abs(u - s.x) < s.s && Math.abs(v - s.y) < s.s * 0.6;
if (inside)
c = mixRgb(s.c, s.c, 0);
}
const n = (grain() - 0.5) * 10;
const o = (y * width + x) * 4;
img.data[o] = c[0] + n;
img.data[o + 1] = c[1] + n;
img.data[o + 2] = c[2] + n;
}
return img;
}

function makeNoise(seed, width = 128, height = 128) {
const r = rng(seed);
const img = blank(width, height);
for (let i = 0; i < width * height; i++) {
const g = r() * 255;
img.data[i * 4] = g;
img.data[i * 4 + 1] = r() * 255;
img.data[i * 4 + 2] = r() * 255;
}
return img;
}

const rgba = (img) => {
if (img.data instanceof Uint8ClampedArray && img.data.length === img.width * img.height * 4)
return img;
throw new Error("expected RGBA pixels");
};

function resize(src, width, height) {
const s = rgba(src);
const out = blank(width, height);
const sx = s.width / width, sy = s.height / height;
for (let y = 0; y < height; y++)
for (let x = 0; x < width; x++) {
const x0 = x * sx, x1 = (x + 1) * sx, y0 = y * sy, y1 = (y + 1) * sy;
const acc = [0, 0, 0, 0];
let tw = 0;
for (let yy = Math.floor(y0); yy < Math.min(s.height, Math.ceil(y1)); yy++) {
const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
for (let xx = Math.floor(x0); xx < Math.min(s.width, Math.ceil(x1)); xx++) {
const w = wy * (Math.min(x1, xx + 1) - Math.max(x0, xx));
if (w <= 0)
continue;
const o = (yy * s.width + xx) * 4;
for (let k = 0; k < 4; k++)
acc[k] += s.data[o + k] * w;
tw += w;
}
}
const o = (y * width + x) * 4;
for (let k = 0; k < 4; k++)
out.data[o + k] = acc[k] / (tw || 1);
}
return out;
}
function crop(src, x, y, width, height) {
const s = rgba(src);
const out = blank(width, height);
for (let r = 0; r < height; r++)
out.data.set(s.data.subarray(((y + r) * s.width + x) * 4, ((y + r) * s.width + x + width) * 4), r * width * 4);
return out;
}

function cropBy(src, frac, biasX = 0.5, biasY = 0.5) {
const w = Math.round(src.width * (1 - frac)), h = Math.round(src.height * (1 - frac));
return crop(src, Math.round((src.width - w) * biasX), Math.round((src.height - h) * biasY), w, h);
}
function brightness(src, delta) {
const s = rgba(src);
const out = blank(s.width, s.height);
for (let i = 0; i < s.data.length; i += 4) {
out.data[i] = s.data[i] + delta;
out.data[i + 1] = s.data[i + 1] + delta;
out.data[i + 2] = s.data[i + 2] + delta;
}
return out;
}

function grade(src, m = WARM_GRADE) {
const s = rgba(src);
const out = blank(s.width, s.height);
for (let i = 0; i < s.data.length; i += 4) {
const r = s.data[i], g = s.data[i + 1], b = s.data[i + 2];
for (let k = 0; k < 3; k++)
out.data[i + k] = m[k][0] * r + m[k][1] * g + m[k][2] * b + m[k][3];
}
return out;
}

const WARM_GRADE = [[0.9, 0.2, 0.05, 18], [0.12, 0.78, 0.08, 10], [0.08, 0.16, 0.55, 6]];

function overlay(src, frac = 0.18, corner = "br") {
const s = rgba(src);
const out = { ...s, data: new Uint8ClampedArray(s.data) };
const w = Math.round(s.width * frac), h = Math.round(s.height * frac * 0.4);
const x0 = corner === "br" ? s.width - w - Math.round(s.width * 0.03) : Math.round(s.width * 0.03);
const y0 = corner === "br" ? s.height - h - Math.round(s.height * 0.03) : Math.round(s.height * 0.03);
for (let y = y0; y < y0 + h; y++)
for (let x = x0; x < x0 + w; x++) {
const ry = (y - y0) / h;
const bar = (ry > 0.25 && ry < 0.42) || (ry > 0.58 && ry < 0.75 && (x - x0) / w < 0.7);
const v = bar && (x - x0) / w > 0.1 && (x - x0) / w < 0.9 ? 245 : 24;
const o = (y * s.width + x) * 4;
out.data[o] = v;
out.data[o + 1] = v;
out.data[o + 2] = v;
}
return out;
}

const LUMA_Q = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const CHROMA_Q = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, ...Array(32).fill(99)];
const C8 = Array.from({ length: 8 }, (_, u) => Float64Array.from({ length: 8 }, (_, x) => (u === 0 ? Math.SQRT1_2 : 1) * 0.5 * Math.cos(((2 * x + 1) * u * Math.PI) / 16)));
function codeBlock(b, q) {
const t = new Float64Array(64), f = new Float64Array(64);
for (let y = 0; y < 8; y++)
for (let u = 0; u < 8; u++) {
let s = 0;
for (let x = 0; x < 8; x++)
s += b[y * 8 + x] * C8[u][x];
t[y * 8 + u] = s;
}
for (let v = 0; v < 8; v++)
for (let u = 0; u < 8; u++) {
let s = 0;
for (let y = 0; y < 8; y++)
s += t[y * 8 + u] * C8[v][y];
f[v * 8 + u] = Math.round(s / q[v * 8 + u]) * q[v * 8 + u];
}
for (let v = 0; v < 8; v++)
for (let x = 0; x < 8; x++) {
let s = 0;
for (let u = 0; u < 8; u++)
s += f[v * 8 + u] * C8[u][x];
t[v * 8 + x] = s;
}
for (let y = 0; y < 8; y++)
for (let x = 0; x < 8; x++) {
let s = 0;
for (let v = 0; v < 8; v++)
s += t[v * 8 + x] * C8[v][y];
b[y * 8 + x] = s;
}
}

function recompress(src, quality = 40) {
const s = rgba(src);
const q = Math.max(1, Math.min(100, quality));
const scale = q < 50 ? 5000 / q : 200 - 2 * q;
const table = (base) => base.map((v) => Math.max(1, Math.min(255, Math.floor((v * scale + 50) / 100))));
const tq = [table(LUMA_Q), table(CHROMA_Q), table(CHROMA_Q)];
const { width, height } = s;
const planes = [new Float64Array(width * height), new Float64Array(width * height), new Float64Array(width * height)];
for (let i = 0; i < width * height; i++) {
const r = s.data[i * 4], g = s.data[i * 4 + 1], b = s.data[i * 4 + 2];
planes[0][i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
planes[1][i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
planes[2][i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
}
const blk = new Float64Array(64);
for (let p = 0; p < 3; p++)
for (let by = 0; by < height; by += 8)
for (let bx = 0; bx < width; bx += 8) {
for (let y = 0; y < 8; y++)
for (let x = 0; x < 8; x++)
blk[y * 8 + x] = planes[p][Math.min(height - 1, by + y) * width + Math.min(width - 1, bx + x)];
codeBlock(blk, tq[p]);
for (let y = 0; y < 8 && by + y < height; y++)
for (let x = 0; x < 8 && bx + x < width; x++)
planes[p][(by + y) * width + bx + x] = blk[y * 8 + x];
}
const out = blank(width, height);
for (let i = 0; i < width * height; i++) {
const Y = planes[0][i] + 128, cb = planes[1], cr = planes[2];
out.data[i * 4] = Y + 1.402 * cr[i];
out.data[i * 4 + 1] = Y - 0.344136 * cb[i] - 0.714136 * cr[i];
out.data[i * 4 + 2] = Y + 1.772 * cb[i];
}
return out;
}
});
__o.d("site/engine/protect/video.js", function (__x) {
"use strict";
__o.e(__x, { DEFAULT_INTERVAL: () => DEFAULT_INTERVAL, sampleTimes: () => sampleTimes, fingerprintVideo: () => fingerprintVideo, FRAME_MATCH_MAX: () => FRAME_MATCH_MAX, MIN_RUN: () => MIN_RUN, findClip: () => findClip, videoToJSON: () => videoToJSON, videoFromJSON: () => videoFromJSON });
const { pHash, hamming, toHex, fromHex } = __o.r("site/engine/protect/image.js");

const DEFAULT_INTERVAL = 1;

function sampleTimes(duration, interval = DEFAULT_INTERVAL) {
if (!(duration > 0) || !(interval > 0))
return [];
const out = [];
for (let t = Math.min(interval / 2, duration / 2); t < duration - 0.05; t += interval)
out.push(Math.round(t * 1000) / 1000);
return out.length ? out : [duration / 2];
}

function fingerprintVideo(frames, interval = DEFAULT_INTERVAL, duration) {
const sorted = [...frames].sort((a, b) => a.t - b.t);
return { kind: "video", interval, times: sorted.map((f) => f.t), hashes: sorted.map((f) => pHash(f.image)), ...(duration !== undefined ? { duration } : {}) };
}

const FRAME_MATCH_MAX = 12;

const MIN_RUN = 3;
function nearest(times, t) {
let lo = 0, hi = times.length - 1;
while (lo < hi) {
const mid = (lo + hi) >> 1;
if (times[mid] < t)
lo = mid + 1;
else
hi = mid;
}
if (lo > 0 && Math.abs(times[lo - 1] - t) <= Math.abs(times[lo] - t))
return lo - 1;
return lo;
}

function bestRun(clip, long, shift, tol) {
let best = null;
let cur = null;
let misses = 0;
let pending = 0;
const close = () => { if (cur && cur.matched >= 1 && (!best || cur.matched > best.matched || (cur.matched === best.matched && cur.sum / (cur.end - cur.start + 1) < best.sum / (best.end - best.start + 1))))
best = cur; cur = null; misses = 0; pending = 0; };
for (let i = 0; i < clip.hashes.length; i++) {
const t = clip.times[i] + shift;
const j = nearest(long.times, t);
if (Math.abs(long.times[j] - t) > tol) {
close();
continue;
}
const d = hamming(clip.hashes[i], long.hashes[j]);
if (d <= FRAME_MATCH_MAX) {
if (!cur)
cur = { shift, start: i, end: i, matched: 0, sum: 0, hit: 0 };
cur.end = i;
cur.matched++;
cur.sum += d + pending;
cur.hit += d;
misses = 0;
pending = 0;
}
else if (cur && misses === 0 && i + 1 < clip.hashes.length) {
misses = 1;
pending = d;
}
else
close();
}
close();
return best;
}

function findClip(clip, long) {
const none = { found: false, offset: 0, clipStart: 0, length: 0, meanDistance: 32, matched: 0, compared: 0, coverage: 0, confidence: 0 };
if (!clip.hashes.length || !long.hashes.length)
return none;
const step = Math.min(clip.interval, long.interval) / 2;
const tol = Math.max(clip.interval, long.interval) * 0.6;
const lo = long.times[0] - clip.times[clip.times.length - 1];
const hi = long.times[long.times.length - 1] - clip.times[0];
const runs = [];
for (let shift = Math.floor(lo / step) * step; shift <= hi + 1e-9; shift += step) {
const r = bestRun(clip, long, shift, tol);
if (r)
runs.push(r);
}
if (!runs.length)
return none;
const mean = (r) => r.sum / (r.end - r.start + 1);
runs.sort((a, b) => b.matched - a.matched || mean(a) - mean(b));
const best = runs[0];
const span = best.end - best.start + 1;
const offset = clip.times[best.start] + best.shift;

const rival = runs.find((r) => Math.abs(clip.times[r.start] + r.shift - offset) > Math.max(clip.interval, long.interval) * 2);
const closeness = Math.max(0, 1 - best.hit / best.matched / 32);
const length = Math.min(1, best.matched / 6);
const clarity = rival ? Math.max(0, 1 - rival.matched / best.matched) : 1;
const confidence = Math.round(closeness * (0.4 + 0.6 * length) * (0.5 + 0.5 * clarity) * 100) / 100;
return {
found: best.matched >= MIN_RUN,
offset: Math.round(Math.max(0, offset) * 100) / 100,
clipStart: Math.round(clip.times[best.start] * 100) / 100,
length: Math.round((clip.times[best.end] - clip.times[best.start] + clip.interval) * 100) / 100,
meanDistance: Math.round(mean(best) * 10) / 10,
matched: best.matched,
compared: span,
coverage: Math.round((span / clip.hashes.length) * 100) / 100,
confidence,
};
}
const videoToJSON = (v) => ({ kind: "video", interval: v.interval, times: v.times, hashes: v.hashes.map(toHex), ...(v.duration !== undefined ? { duration: v.duration } : {}) });
const videoFromJSON = (j) => ({ kind: "video", interval: j.interval, times: j.times, hashes: j.hashes.map(fromHex), ...(j.duration !== undefined ? { duration: j.duration } : {}) });
});
