/*
  Made-up pictures from fixed seeds, and the edits a copy picks up on its travels
  (resized, recompressed, cropped, brightened, re-coloured, stamped with a small
  overlay). The tests use them to tune the thresholds; the site's demo draws the
  same photo on a canvas. Landscapes and shapes only: no people, no faces.
*/
/** mulberry32: a small seeded generator, so every picture is the same on every run. */
export function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function blank(width, height, rgb = [255, 255, 255]) {
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
/* Skies and lands kept to blues, teals, greens, ochres and greys. */
const SKIES = [
    [[96, 150, 214], [214, 232, 244]],
    [[236, 160, 92], [250, 226, 170]],
    [[64, 120, 140], [190, 220, 214]],
    [[150, 170, 186], [232, 236, 236]],
];
const LANDS = [[58, 92, 62], [92, 112, 58], [120, 96, 62], [52, 74, 84], [84, 70, 52]];
/* 1D value noise for ridge lines, smooth between seeded knots. */
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
/**
  A made-up landscape photo: a sky, a sun, clouds, three ranges of hills, a lake
  on some seeds, trees on the nearest hill and a light film grain. Every layout
  choice comes from the seed, so two seeds give two unrelated pictures.
*/
export function makePhoto(seed, width = 480, height = 320) {
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
/** Gradients and flat shapes on a seed: a second family of test pictures, unlike the landscapes. */
export function makeShapes(seed, width = 320, height = 320) {
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
/** Seeded noise: the hardest case, nothing but grain. */
export function makeNoise(seed, width = 128, height = 128) {
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
/* ------------------------------------------------------------------ the edits */
const rgba = (img) => {
    if (img.data instanceof Uint8ClampedArray && img.data.length === img.width * img.height * 4)
        return img;
    throw new Error("expected RGBA pixels");
};
/** Resize by area averaging per channel (bilinear-like when enlarging). */
export function resize(src, width, height) {
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
export function crop(src, x, y, width, height) {
    const s = rgba(src);
    const out = blank(width, height);
    for (let r = 0; r < height; r++)
        out.data.set(s.data.subarray(((y + r) * s.width + x) * 4, ((y + r) * s.width + x + width) * 4), r * width * 4);
    return out;
}
/** Cut `frac` of each dimension away, split between the edges by `bias` (0.5 is centred). */
export function cropBy(src, frac, biasX = 0.5, biasY = 0.5) {
    const w = Math.round(src.width * (1 - frac)), h = Math.round(src.height * (1 - frac));
    return crop(src, Math.round((src.width - w) * biasX), Math.round((src.height - h) * biasY), w, h);
}
export function brightness(src, delta) {
    const s = rgba(src);
    const out = blank(s.width, s.height);
    for (let i = 0; i < s.data.length; i += 4) {
        out.data[i] = s.data[i] + delta;
        out.data[i + 1] = s.data[i + 1] + delta;
        out.data[i + 2] = s.data[i + 2] + delta;
    }
    return out;
}
/** A colour grade: each channel a mix of the three plus an offset (rows are R, G, B). */
export function grade(src, m = WARM_GRADE) {
    const s = rgba(src);
    const out = blank(s.width, s.height);
    for (let i = 0; i < s.data.length; i += 4) {
        const r = s.data[i], g = s.data[i + 1], b = s.data[i + 2];
        for (let k = 0; k < 3; k++)
            out.data[i + k] = m[k][0] * r + m[k][1] * g + m[k][2] * b + m[k][3];
    }
    return out;
}
/** A warm, faded film look: the re-colour a repost often carries. */
export const WARM_GRADE = [[0.9, 0.2, 0.05, 18], [0.12, 0.78, 0.08, 10], [0.08, 0.16, 0.55, 6]];
/** A small badge, the kind a reposting account stamps in a corner: a filled box with two light bars. */
export function overlay(src, frac = 0.18, corner = "br") {
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
/* JPEG's own quantisation tables (Annex K), scaled by quality the way libjpeg does. */
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
/**
  A JPEG round trip without the entropy coding: YCbCr, 8x8 DCT, quantised with
  the standard tables at `quality` (1 to 100), and back. The blocking and the lost
  detail are the real thing; only the file bytes are skipped.
*/
export function recompress(src, quality = 40) {
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
