/*
  Image fingerprints on raw pixels: dHash and pHash, 64 bits each, and the
  Hamming distance between two of them. Pure functions with no dependencies,
  so the same code runs in Node and, compiled, in the browser on canvas pixels.

  A fingerprint is a summary of how light falls across the picture, not the
  picture. It cannot be turned back into the image.
*/
const MASK64 = (1n << 64n) - 1n;
/** Luminance (ITU-R BT.601 weights). Transparent pixels are laid on white, as a page shows them. */
export function toGrey(img) {
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
/* For each target cell, the source cells it covers and how much of each (a box filter that handles any ratio). */
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
/** Resample a grey plane to tw x th by area averaging, so any source size lands on the same small grid. */
export function resample(g, tw, th) {
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
/* A Grey plane is a Float64Array with one value per pixel; anything else is converted. */
const asGrey = (img) => (img.data instanceof Float64Array && img.data.length === img.width * img.height ? img : toGrey(img));
/**
  dHash: shrink to 9x8 and set a bit wherever a cell is brighter than its right-hand
  neighbour. Fast and steady under resizing, recompression and brightness.
*/
export function dHash(img) {
    const s = resample(asGrey(img), 9, 8).data;
    let h = 0n;
    for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++)
            h = (h << 1n) | (s[y * 9 + x] > s[y * 9 + x + 1] ? 1n : 0n);
    return h;
}
/* cos((2x+1) u pi / 2N) for N = 32 and u < 8: the only DCT rows pHash reads. */
const N = 32;
const COS = Array.from({ length: 8 }, (_, u) => Float64Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))));
/** The 8x8 lowest-frequency DCT-II coefficients of a 32x32 grey plane, row (vertical frequency) by column. */
export function lowDct(g32) {
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
/**
  pHash: shrink to 32x32 grey, take the DCT, keep the 8x8 lowest frequencies and set
  a bit wherever a coefficient is above their median. The DC term (the picture's
  average brightness) is left out of the median, and its own bit is replaced by the
  sign of the first horizontal against the first vertical term, so all 64 bits carry
  shape and none carries plain brightness.
*/
export function pHash(img) {
    const d = lowDct(resample(asGrey(img), N, N));
    const ac = Array.from(d.subarray(1));
    const sorted = [...ac].sort((a, b) => a - b);
    const median = (sorted[31] + sorted[32]) / 2;
    let h = d[1] > d[8] ? 1n : 0n;
    for (let i = 1; i < 64; i++)
        h = (h << 1n) | (d[i] > median ? 1n : 0n);
    return h;
}
/** How many of the 64 bits differ: 0 is identical, about 32 is what two unrelated pictures give. */
export function hamming(a, b) {
    let x = (a ^ b) & MASK64;
    let n = 0;
    while (x) {
        x &= x - 1n;
        n++;
    }
    return n;
}
/** Sixteen lowercase hex digits, the form a hash is stored and shown in. */
export function toHex(h) {
    return (h & MASK64).toString(16).padStart(16, "0");
}
export function fromHex(hex) {
    if (!/^[0-9a-f]{16}$/i.test(hex))
        throw new Error(`fromHex: "${hex}" is not 16 hex digits`);
    return BigInt(`0x${hex}`);
}
/** The 64 bits as a grid, row by row from the top left, for drawing an 8x8 picture of a hash. */
export function bits(h) {
    return Array.from({ length: 64 }, (_, i) => ((h >> BigInt(63 - i)) & 1n) === 1n);
}
