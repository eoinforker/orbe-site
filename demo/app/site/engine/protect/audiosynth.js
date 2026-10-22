/*
  Made-up audio from fixed seeds, and the things that happen to a copy: an
  MP3-like low-pass and requantisation, a volume change, added noise, music or a
  voice over the top, an excerpt dropped into a compilation. The tests tune the
  matcher on these; the site's demo plays the same clips. A WAV encoder lets the
  browser play them. Nothing here is a real recording.
*/
import { rng } from "./synth.js";
import { AUDIO_RATE } from "./audio.js";
const TAU = Math.PI * 2;
/* A note's loudness over time: quick attack, gentle decay, short release. */
function envelope(i, n, rate) {
    const a = Math.min(1, i / (0.01 * rate));
    const r = Math.min(1, (n - i) / (0.03 * rate));
    return a * r * (0.6 + 0.4 * Math.exp(-i / (0.25 * rate)));
}
/** A sequence of pure tones, 0.1 to 0.4 s each, between 200 and 2,500 Hz. */
export function tones(seed, seconds, rate = AUDIO_RATE) {
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
/** Linear chirps up and down, 0.3 to 1 s each, with a quieter second voice an octave up. */
export function chirps(seed, seconds, rate = AUDIO_RATE) {
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
/** A melody on a major scale, each note with five harmonics, over a quiet bass line. */
export function melody(seed, seconds, rate = AUDIO_RATE) {
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
/* Vowel formants (F1, F2, F3 in Hz), roughly as in adult speech. */
const VOWELS = [[730, 1090, 2440], [270, 2290, 3010], [300, 870, 2240], [530, 1840, 2480], [570, 840, 2410], [640, 1190, 2390]];
/**
  Speech-like sound: syllables of a voiced buzz (a pitch of 90 to 230 Hz that
  wanders) shaped by vowel formants, with hissy consonant bursts and pauses.
*/
export function speech(seed, seconds, rate = AUDIO_RATE) {
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
/* ------------------------------------------------------------------ what happens to a copy */
/** Scale by a gain in dB. */
export function gain(x, db) {
    const g = 10 ** (db / 20);
    return x.map((v) => v * g);
}
const power = (x) => { let s = 0; for (const v of x)
    s += v * v; return s / Math.max(1, x.length); };
/** Add seeded white noise at a signal-to-noise ratio in dB. */
export function addNoise(x, snrDb, seed = 1) {
    const r = rng(seed);
    const sd = Math.sqrt(power(x) / 10 ** (snrDb / 10));
    return x.map((v) => v + sd * Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r()));
}
/** Mix another sound over the top, `db` relative to the first in power. */
export function mixOver(x, over, db) {
    const k = Math.sqrt(power(x) / Math.max(1e-12, power(over))) * 10 ** (db / 20);
    return x.map((v, i) => v + k * (over[i % over.length] ?? 0));
}
/** A windowed-sinc low-pass at `cutoff` Hz (63 taps). */
export function lowpass(x, cutoff, rate = AUDIO_RATE) {
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
/** Round every sample to `bits` of resolution. */
export function requantise(x, bits) {
    const q = 2 ** (bits - 1);
    return x.map((v) => Math.max(-1, Math.min(1, Math.round(v * q) / q)));
}
/** What a low-bitrate MP3 leaves: no top end above 3.5 kHz and coarse samples. Not real MP3; the loss that matters here. */
export const mp3Like = (x, rate = AUDIO_RATE) => requantise(lowpass(x, 3500, rate), 8);
/** Play back faster or slower by `factor` (pitch moves with it, like a sped-up re-upload). */
export function speed(x, factor) {
    const n = Math.floor(x.length / factor);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const t = i * factor, k = Math.floor(t), f = t - k;
        out[i] = (x[k] ?? 0) * (1 - f) + (x[k + 1] ?? 0) * f;
    }
    return out;
}
export function concat(...parts) {
    const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
        out.set(p, at);
        at += p.length;
    }
    return out;
}
export const slice = (x, from, to, rate = AUDIO_RATE) => x.slice(Math.round(from * rate), Math.round(to * rate));
/** Scale so the loudest sample sits at `peak`. */
export function normalise(x, peak = 0.9) {
    let m = 0;
    for (const v of x)
        m = Math.max(m, Math.abs(v));
    return m ? x.map((v) => (v * peak) / m) : x;
}
/** A 16-bit mono WAV file, so a browser can play generated audio from a Blob. */
export function encodeWav(x, rate = AUDIO_RATE) {
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
