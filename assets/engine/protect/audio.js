/*
  Audio fingerprints in the landmark style: the loudest points of a spectrogram
  (its constellation), paired within a target zone, each pair hashed into 32 bits
  with the time it starts. A copy keeps most of its loudest points even when it is
  recompressed, turned down, buried in noise or talked over, so enough pairs
  survive to find it, and the pairs agree on one time offset, so an excerpt can be
  found inside a longer recording by voting.

  Pipeline: mono, resampled to 11,025 Hz; STFT with a 1,024-point Hann window and
  a 256-sample hop (about 23 ms a frame); peaks that are the loudest in +/-10 bins
  and +/-5 frames and well above the recording's own median, at most 32 a second;
  each peak paired with up to 6 later peaks 2 to 63 frames on and within 96 bins.
  Hash: f1 (9 bits) | f2 (9 bits) | dt (6 bits), in the low 24 bits of a 32-bit word.

  Limits, measured in audio.test.ts and said plainly:
  - Speed and pitch. The hashes hold exact frequency bins and frame gaps, so a copy
    sped up, slowed down or pitch-shifted by 1% or more is usually missed, and by 2%
    it is missed every time in the tests.
  - Short excerpts. Speech is found from about 2 seconds. Music needs about 5 seconds,
    because a melody repeats itself and its true offset needs more votes to stand out.
  - Sweeps. A lone frequency sweep (a chirp) is found under each edit alone, but not
    under voice-over, noise, quieting and MP3-like loss all at once, nor as a short
    excerpt: its peaks move bin from frame to frame, so few exact pairs survive.
  - Held pure tones give few peaks; real music and speech give plenty.

  Pure functions with no dependencies; the browser decodes files with
  AudioContext.decodeAudioData and hands the samples here.
*/
export const AUDIO_RATE = 11025;
export const FFT_SIZE = 1024;
export const HOP = 256;
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
/** Seconds per STFT frame. */
export const FRAME_SECONDS = HOP / AUDIO_RATE;
/* ------------------------------------------------------------------ mono and resampling */
export function toMono(input) {
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
/**
  Resample with a windowed-sinc filter (8 zero crossings, Hann window). Going down,
  the filter's cutoff follows the new rate so nothing above it folds back in.
*/
export function resampleAudio(x, from, to = AUDIO_RATE) {
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
/* ------------------------------------------------------------------ FFT */
/** An in-place iterative radix-2 FFT. `re` and `im` must have the same power-of-two length. */
export function fft(re, im) {
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
/** Log-magnitude spectrogram in dB: frames x BINS, row by row. */
export function spectrogram(x) {
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
/* ------------------------------------------------------------------ peaks and hashes */
/** The constellation: points loudest in their neighbourhood and well above the recording's median, thinned to a steady density. */
export function pickPeaks(spec) {
    const { frames, bins, db } = spec;
    if (!frames)
        return [];
    // Max over +/-PEAK_DF bins, then over +/-PEAK_DT frames (separable).
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
    // At most PEAKS_PER_SECOND in each one-second block, strongest first.
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
export const packHash = (f1, f2, dt) => (((f1 & 511) << 15) | ((f2 & 511) << 6) | (dt & 63)) >>> 0;
export const unpackHash = (h) => ({ f1: (h >>> 15) & 511, f2: (h >>> 6) & 511, dt: h & 63 });
/** Pair each peak with up to FANOUT later peaks in its target zone. */
export function landmarks(peaks) {
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
/** Fingerprint decoded audio (any rate, any channels). */
export function fingerprintAudio(input) {
    const mono = resampleAudio(toMono(input), input.sampleRate);
    return fingerprintSamples(mono);
}
/** Fingerprint mono samples already at AUDIO_RATE. */
export function fingerprintSamples(mono) {
    const peaks = pickPeaks(spectrogram(mono));
    const { hashes, frames } = landmarks(peaks);
    const flat = peaks.flat();
    const big = flat.some((v) => v > 65535);
    return { kind: "audio", duration: mono.length / AUDIO_RATE, hashes, frames, peaks: big ? Uint32Array.from(flat) : Uint16Array.from(flat) };
}
/** The fewest pairs agreeing on one offset that count as a match. */
export const MIN_ALIGNED = 20;
/** The winning offset must beat every other by this factor. */
export const CLEAR_RATIO = 3;
/** "Same recording" when the lengths differ by no more than this share (or 1 s), and the audio lines up within SAME_SHIFT seconds. */
export const SAME_SLACK = 0.1;
export const SAME_SHIFT = 1.5;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const AUDIO_WORDS = {
    same: "The same recording, start to finish. It may have been re-encoded, turned up or down, or had noise or another sound added.",
    contains: "This file contains your audio.",
    different: "Different audio. None of your recording was found in it.",
};
/** An index from hash to the frames it occurs at, for voting. */
export function hashIndex(fp) {
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
/** Vote on offsets: suspect frame minus original frame for every shared hash. Exported for the registry. */
export function vote(original, index) {
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
/** Read the votes into a match: the best offset (with its neighbours, for a frame of jitter), the stretch it covers and the verdict. */
export function readVotes(votes, original, suspect) {
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
    // The shared stretch: from the first to the last agreeing pair, trimming stray outliers (the outer 2%).
    const lo = times[Math.floor(times.length * 0.02)] ?? 0, hi = times[Math.ceil(times.length * 0.98) - 1] ?? 0;
    const originalStart = lo * FRAME_SECONDS;
    const duration = times.length ? (hi - lo) * FRAME_SECONDS + (DT_MAX * FRAME_SECONDS) / 2 : 0;
    const offset = Math.max(0, originalStart + bestD * FRAME_SECONDS);
    const found = bestN >= MIN_ALIGNED && bestN >= CLEAR_RATIO * Math.max(1, runnerUp);
    // Same recording: the two run the same length (within SAME_SLACK) and line up at the start (within SAME_SHIFT seconds).
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
/** Find the original's audio in a suspected copy: a whole re-upload, an excerpt inside a compilation, or a clip of it. */
export function matchAudio(original, suspect) {
    return readVotes(vote(original, hashIndex(suspect)), original, suspect);
}
export const audioToJSON = (a) => ({ kind: "audio", duration: a.duration, hashes: [...a.hashes], frames: [...a.frames], peaks: [...a.peaks] });
export const audioFromJSON = (j) => ({ kind: "audio", duration: j.duration, hashes: Uint32Array.from(j.hashes), frames: Uint32Array.from(j.frames), peaks: j.peaks.some((v) => v > 65535) ? Uint32Array.from(j.peaks) : Uint16Array.from(j.peaks) });
