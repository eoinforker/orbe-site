/*
  @font-face rules for a card that must carry its own fonts: a PNG made in the
  browser, or an SVG served on its own. Pure, so it runs anywhere; the caller
  reads the font files (the API from disk, the browser with fetch).
*/
/** The site's font files, by the names in site/assets/fonts.css. */
export const SITE_FONTS = [
    { file: "TimelessSerifVF.woff2", family: "Timeless Serif", style: "normal" },
    { file: "TimelessSerifItalicVF.woff2", family: "Timeless Serif", style: "italic" },
    { file: "TimelessSansVF.woff2", family: "Timeless Sans", style: "normal" },
    { file: "PaperMonoVF.woff2", family: "Paper Mono", style: "normal" },
];
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Base64 without Buffer or btoa, so the same code runs in Node and the browser. */
export function base64(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
        out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
        out += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
        out += c === undefined ? "=" : B64[c & 63];
    }
    return out;
}
const cssString = (s) => `"${s.replace(/["\\\n\r]/g, "")}"`;
export function fontFaceCss(files) {
    return files
        .map((f) => {
        const src = typeof f.data === "string" ? f.data : `data:font/woff2;base64,${base64(f.data)}`;
        return `@font-face{font-family:${cssString(f.family)};src:url(${cssString(src)}) format("woff2");font-weight:100 900;font-style:${f.style ?? "normal"};}`;
    })
        .join("");
}
