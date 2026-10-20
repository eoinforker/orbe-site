/*
  A picture's fingerprint, and the verdict when two are compared.

  The fingerprint keeps the dHash and pHash of the whole frame, plus the pHash and
  dHash of nine windows each 90% of the frame (the centre, four corners, four edges).
  A copy cropped by about a tenth then lands close to one of those windows, even
  though a crop moves every cell of the whole-frame hash.

  The verdict reads a score in bits: (2 x pHash distance + dHash distance) / 3,
  taken from whichever window lines up best. pHash counts double because it holds
  steady under recompression, re-colouring and overlays; dHash breaks ties.

    score <= SAME_MAX (6), whole frame   the same picture, perhaps resized, re-saved, brightened or re-coloured
    score <= EDITED_MAX (14)             likely an edited copy: cropped, stamped, strongly re-graded or heavily recompressed
    above                                different pictures

  Tuned on the seeded pictures in synth.ts (protect.test.ts holds the cases):
  resizing scores 0 to 1, recompression at quality 30 up to 4, brightness and a
  colour grade up to 4, a 10% crop up to 11, a small overlay up to 7, and a crop,
  resize, overlay and recompression together up to 11. Unrelated pictures, landscapes
  of the same family included, score 16 or more and usually near 32. These are
  thresholds for a person to review, never for an automatic claim.
*/
import { dHash, pHash, hamming, toHex, fromHex } from "./image.js";
import { toGrey } from "./image.js";
export const SAME_MAX = 6;
export const EDITED_MAX = 14;
export const WINDOWS = [
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
/** Fingerprint a picture from its raw pixels (RGBA from a canvas, RGB or grey). */
export function fingerprintImage(img) {
    const g = toGrey(img);
    const windows = WINDOWS.map((w) => { const c = cut(g, w); return { dhash: dHash(c), phash: pHash(c) }; });
    return { kind: "image", width: img.width, height: img.height, dhash: windows[0].dhash, phash: windows[0].phash, windows };
}
export const scoreOf = (pDist, dDist) => Math.round(((2 * pDist + dDist) / 3) * 10) / 10;
export function verdictOf(score, whole) {
    if (score <= SAME_MAX && whole)
        return "same";
    if (score <= EDITED_MAX)
        return "edited";
    return "different";
}
export const VERDICT_WORDS = {
    same: "The same picture. It may have been resized, re-saved, brightened or re-coloured, but what it shows has not changed.",
    edited: "Very likely a copy of your picture, edited: cropped, stamped, strongly re-graded or heavily recompressed.",
    different: "Different pictures. Nothing here suggests one was made from the other.",
};
/**
  Compare an original (its full fingerprint, with windows) against a suspected
  copy (only its whole frame is used). Order matters: the windows are the original's.
*/
export function compare(original, suspect) {
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
export function imageToJSON(fp) {
    return { kind: "image", width: fp.width, height: fp.height, dhash: toHex(fp.dhash), phash: toHex(fp.phash), windows: fp.windows.map((w) => [toHex(w.dhash), toHex(w.phash)]) };
}
export function imageFromJSON(j) {
    const windows = j.windows.map(([d, p]) => ({ dhash: fromHex(d), phash: fromHex(p) }));
    return { kind: "image", width: j.width, height: j.height, dhash: fromHex(j.dhash), phash: fromHex(j.phash), windows };
}
