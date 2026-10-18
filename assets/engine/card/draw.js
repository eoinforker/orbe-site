import { clampLines, fitSize, measure, truncate, wrap } from "./metrics.js";
import { paletteFor } from "./themes.js";
import { drawLap, drawSizeUp, RY } from "./lap.js";
import { wordmarkCut } from "./wordmark.js";
export const FORMATS = {
    story: { width: 1080, height: 1920, name: "Story" },
    square: { width: 1080, height: 1080, name: "Square" },
    link: { width: 1200, height: 630, name: "Link preview" },
};
export const FORMAT_NAMES = Object.keys(FORMATS);
/*
  The Masthead type system: Schibsted Grotesk for the sentence, the figures and
  the words; Newsreader's italic for the band, the key and the window title;
  Commit Mono for the address only. Each face is named concretely, so a
  standalone SVG or a PNG with embedded fonts draws right, and also through the
  site's --sans, --serif and --mono, so a card inline on a page follows the page.
*/
const SANS = "'Schibsted Grotesk', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Newsreader, Georgia, serif";
const MONO = "'Commit Mono', ui-monospace, Menlo, monospace";
const FAMILY = {
    serif: { family: SERIF, css: "--serif", weight: 400 },
    serifItalic: { family: SERIF, css: "--serif", weight: 400, italic: true },
    sans: { family: SANS, css: "--sans", weight: 400 },
    sansMedium: { family: SANS, css: "--sans", weight: 500 },
    display: { family: SANS, css: "--sans", weight: 440 },
    mono: { family: MONO, css: "--mono", weight: 400 },
};
/** Escapes text and attribute values. Every string from a creator passes through here. */
export function escapeXml(s) {
    return s
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
const n = (x) => String(Math.round(x * 100) / 100);
function text(x, y, content, s) {
    const f = FAMILY[s.face];
    const attrs = [
        `x="${n(x)}"`,
        `y="${n(y)}"`,
        `font-family="${f.family}"`,
        `style="font-family:var(${f.css},${f.family})"`,
        `font-size="${n(s.size)}"`,
        `font-weight="${f.weight}"`,
        f.italic ? `font-style="italic"` : "",
        s.tracking ? `letter-spacing="${n(s.tracking)}"` : "",
        s.anchor && s.anchor !== "start" ? `text-anchor="${s.anchor}"` : "",
        `fill="${s.fill}"`,
    ].filter(Boolean);
    return `<text ${attrs.join(" ")}>${escapeXml(content)}</text>`;
}
/** The lap for the moment, with the work in its window. */
function lapWithWork(m, p, box, id) {
    const style = { cx: box.cx, cy: box.cy, r: box.r, ry: RY };
    const d = m.outward ? drawSizeUp(style) : drawLap(style, m.turns);
    const w = d.window;
    const out = [];
    const wry = w.r * RY;
    if (m.image) {
        out.push(`<clipPath id="${id}-w"><ellipse cx="${n(w.cx)}" cy="${n(w.cy)}" rx="${n(w.r)}" ry="${n(wry)}"/></clipPath>`);
        out.push(`<image href="${escapeXml(m.image.href)}" x="${n(w.cx - w.r)}" y="${n(w.cy - wry)}" width="${n(w.r * 2)}" height="${n(wry * 2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-w)"/>`);
    }
    else {
        out.push(`<ellipse cx="${n(w.cx)}" cy="${n(w.cy)}" rx="${n(w.r)}" ry="${n(wry)}" fill="${p.well}"/>`);
        out.push(windowTitle(m.windowText, w.cx, w.cy, w.r, p.wellInk));
    }
    if (d.hairline)
        out.push(`<path d="${d.hairline}" fill="none" stroke="${p.hair}" stroke-width="${n(Math.max(1.5, box.r * 0.007))}"/>`);
    out.push(`<path d="${d.stroke}" fill="${p.ink}" fill-rule="evenodd"/>`);
    out.push(`<circle cx="${n(d.ball.cx)}" cy="${n(d.ball.cy)}" r="${n(d.ball.r)}" fill="${p.accent}"/>`);
    return out.join("");
}
/** With no picture, the work's own title sits in the window, in the serif's italic. */
function windowTitle(s, cx, cy, r, fill) {
    const width = r * 1.36;
    let size = Math.round(r * 0.3);
    const min = Math.max(14, Math.round(r * 0.12));
    const fits = (z) => {
        const lines = wrap(s, "serifItalic", z, width);
        return lines.length <= 3 && lines.every((l) => measure(l, "serifItalic", z) <= width);
    };
    while (size > min && !fits(size))
        size -= 2;
    const lines = clampLines(s, "serifItalic", size, width, 3);
    const lh = size * 1.06;
    const y0 = cy - ((lines.length - 1) * lh) / 2 + size * 0.32;
    return lines.map((l, i) => text(cx, y0 + i * lh, l, { face: "serifItalic", size, fill, anchor: "middle", tracking: -0.01 * size })).join("");
}
/** The sentence at the largest size that fits its lines; cut only at the smallest. Returns lines, size and leading. */
function fitSentence(s, width, max, min, maxLines) {
    let size = max;
    const tr = (z) => -0.034 * z;
    const fits = (z) => {
        const lines = wrap(s, "display", z, width, tr(z));
        return lines.length <= maxLines && lines.every((l) => measure(l, "display", z, tr(z)) <= width);
    };
    while (size > min && !fits(size))
        size -= 2;
    // Balance the lines: the narrowest measure that keeps the same number of lines, so no word is left alone.
    const count = wrap(s, "display", size, width, tr(size)).length;
    let lo = width * 0.5, hi = width;
    if (count > 1 && count <= maxLines) {
        for (let i = 0; i < 18; i++) {
            const mid = (lo + hi) / 2;
            if (wrap(s, "display", size, mid, tr(size)).length <= count)
                hi = mid;
            else
                lo = mid;
        }
    }
    else
        hi = width;
    return { lines: clampLines(s, "display", size, hi + 1, maxLines, tr(size)), size, lh: size * 1.04 };
}
function sentence(m, p, x, lastBaseline, fit) {
    const top = lastBaseline - (fit.lines.length - 1) * fit.lh;
    return fit.lines.map((l, i) => text(x, top + i * fit.lh, l, { face: "display", size: fit.size, fill: p.ink, tracking: -0.034 * fit.size })).join("");
}
/**
  The figure row: the lead (and the band) in the serif in the accent, its
  words beside it in the sans, on two lines at most; under it when there is no room beside.
  Returns the SVG and the baseline of its last line.
*/
function figureRow(m, p, x, baseline, width, lead, rest) {
    const st = m.stat;
    const lt = -0.02 * lead;
    let leadSize = fitSize(st.lead, "display", width * 0.62, lead, lead * 0.5, -0.04);
    const out = [];
    out.push(text(x - leadSize * 0.02, baseline, st.lead, { face: "display", size: leadSize, fill: p.accent, tracking: -0.04 * leadSize }));
    let cursor = x + measure(st.lead, "display", leadSize, -0.04 * leadSize);
    if (st.band) {
        const gap = leadSize * 0.22;
        out.push(text(cursor + gap, baseline, st.band, { face: "serifItalic", size: leadSize, fill: p.accent, tracking: lt }));
        cursor += gap + measure(st.band, "serifItalic", leadSize, lt);
    }
    if (!st.rest)
        return { svg: out.join(""), height: 0 };
    const gap = rest * 0.55;
    const room = x + width - cursor - gap;
    const lh = rest * 1.22;
    if (room >= width * 0.3 && wrap(st.rest, "sans", rest, room).length <= 2) {
        const lines = clampLines(st.rest, "sans", rest, room, 2);
        const first = lines.length === 1 ? baseline : baseline - lh;
        lines.forEach((l, i) => out.push(text(cursor + gap, first + i * lh, l, { face: "sans", size: rest, fill: p.soft })));
        return { svg: out.join(""), height: 0 };
    }
    const lines = clampLines(st.rest, "sans", rest, width, 2);
    lines.forEach((l, i) => out.push(text(x, baseline + rest * 1.5 + i * lh, l, { face: "sans", size: rest, fill: p.soft })));
    return { svg: out.join(""), height: rest * 1.5 + (lines.length - 1) * lh };
}
/** The wordmark, drawn from its own path in the cut for its size, sitting on a baseline, right-aligned at x. */
function wordmark(xRight, baseline, h, fill) {
    const c = wordmarkCut(h);
    const s = h / c.height;
    const w = c.width * s;
    // The baseline is y = 0 in the mark's own units.
    return `<g transform="translate(${n(xRight - w - c.x * s)} ${n(baseline)}) scale(${Math.round(s * 100000) / 100000})" fill="${fill}"><path d="${c.path}"/></g>`;
}
/** The address, as large as `max` and never wider than the room it has. */
function address(m, p, x, y, width, max) {
    const size = fitSize(m.url, "mono", width, max, max * 0.62);
    return text(x, y, truncate(m.url, "mono", size, width), { face: "mono", size, fill: p.ink });
}
/** The label, once, small; any provisional note and example note after it. Two lines at most, the label never cut. */
function smallPrint(m, p, x, y, width, size) {
    const one = [m.label, m.small].filter(Boolean).join(" ");
    if (measure(one, "sans", size) <= width)
        return text(x, y, one, { face: "sans", size, fill: p.soft });
    const label = text(x, y, truncate(m.label, "sans", fitSize(m.label, "sans", width, size, size * 0.8), width), { face: "sans", size: fitSize(m.label, "sans", width, size, size * 0.8), fill: p.soft });
    if (!m.small)
        return label;
    const s2 = fitSize(m.small, "sans", width, size, size * 0.8);
    return label + text(x, y + size * 1.45, truncate(m.small, "sans", s2, width), { face: "sans", size: s2, fill: p.soft });
}
const twoLines = (m, size, width) => measure([m.label, m.small].filter(Boolean).join(" "), "sans", size) > width;
/* ------------------------------------------------------------------ */
/* Formats.                                                           */
/* ------------------------------------------------------------------ */
function story(m, p, id) {
    const W = 1080, M = 88, inner = W - 2 * M;
    const out = [];
    // Instagram and TikTok cover about the top 220px and bottom 250px; the label and link sit just above that.
    const small = 18;
    const smallY = twoLines(m, small, inner) ? 1638 : 1660;
    const urlY = smallY - 58;
    out.push(smallPrint(m, p, M, smallY, inner, small));
    out.push(address(m, p, M, urlY, inner - 210, 38));
    out.push(wordmark(W - M, urlY, 38, p.ink));
    const fig = figureRow(m, p, M, 0, inner, 88, 32);
    const figY = urlY - 118 - fig.height;
    out.push(figureRow(m, p, M, figY, inner, 88, 32).svg);
    const fit = fitSentence(m.sentence, inner, 104, 64, 3);
    const last = figY - 88 * 1.3;
    out.push(sentence(m, p, M, last, fit));
    const sentenceTop = last - (fit.lines.length - 1) * fit.lh - fit.size * 0.8;
    const keyY = sentenceTop - 70;
    out.push(text(W / 2, keyY, truncate(m.key, "serifItalic", 29, inner), { face: "serifItalic", size: 29, fill: p.soft, anchor: "middle" }));
    const top = 236, bottom = keyY - 66;
    const r = Math.min(400, (bottom - top) / 2 / RY);
    out.unshift(lapWithWork(m, p, { cx: W / 2, cy: (top + bottom) / 2, r }, id));
    return out.join("");
}
function square(m, p, id) {
    const W = 1080, M = 72, inner = W - 2 * M;
    const out = [];
    const small = 15;
    const smallY = twoLines(m, small, inner) ? 1018 : 1032;
    const urlY = smallY - 44;
    out.push(smallPrint(m, p, M, smallY, inner, small));
    out.push(address(m, p, M, urlY, inner - 170, 30));
    out.push(wordmark(W - M, urlY, 30, p.ink));
    const fig = figureRow(m, p, M, 0, inner, 62, 24);
    const figY = urlY - 86 - fig.height;
    out.push(figureRow(m, p, M, figY, inner, 62, 24).svg);
    const fit = fitSentence(m.sentence, inner, 72, 46, 2);
    const last = figY - 62 * 1.28;
    out.push(sentence(m, p, M, last, fit));
    const sentenceTop = last - (fit.lines.length - 1) * fit.lh - fit.size * 0.8;
    const keyY = sentenceTop - 50;
    out.push(text(W / 2, keyY, truncate(m.key, "serifItalic", 22, inner), { face: "serifItalic", size: 22, fill: p.soft, anchor: "middle" }));
    const top = 60, bottom = keyY - 46;
    const r = Math.min(330, (bottom - top) / 2 / RY);
    out.unshift(lapWithWork(m, p, { cx: W / 2, cy: (top + bottom) / 2, r }, id));
    return out.join("");
}
function link(m, p, id) {
    const W = 1200, H = 630, M = 60;
    const out = [];
    const r = (H - 2 * 52) / 2 / RY;
    const cx = W - M - r;
    out.push(lapWithWork(m, p, { cx, cy: H / 2, r }, id));
    const colW = cx - r - 56 - M;
    out.push(text(M, 92, truncate(m.key, "serifItalic", 17, colW), { face: "serifItalic", size: 17, fill: p.soft }));
    const fit = fitSentence(m.sentence, colW, 60, 38, 3);
    const first = 92 + 34 + fit.size * 0.8;
    fit.lines.forEach((l, i) => out.push(text(M, first + i * fit.lh, l, { face: "display", size: fit.size, fill: p.ink, tracking: -0.034 * fit.size })));
    const figY = first + (fit.lines.length - 1) * fit.lh + 46 * 1.4;
    out.push(figureRow(m, p, M, figY, colW, 46, 19).svg);
    const small = 13;
    const smallY = twoLines(m, small, colW) ? 584 : 598;
    out.push(smallPrint(m, p, M, smallY, colW, small));
    out.push(address(m, p, M, smallY - 38, colW - 120, 24));
    out.push(wordmark(M + colW, smallY - 38, 24, p.ink));
    return out.join("");
}
const LAYOUTS = { story, square, link };
/** A short, stable id prefix from the card's content, so two cards on one page never share a clip path. */
function hashId(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return `oc${(h >>> 0).toString(36)}`;
}
/** CSS inside SVG is XML text: markup characters are written as CSS escapes so nothing can close the style element. */
const safeCss = (css) => css.replace(/</g, "\\3c ").replace(/>/g, "\\3e ").replace(/&/g, "\\26 ");
export function drawCard(m, options = {}) {
    const format = (options.format && FORMATS[options.format] ? options.format : "square");
    const { width, height } = FORMATS[format];
    const p = paletteFor(options.theme);
    const id = (options.idPrefix ?? hashId(`${m.handle}|${m.name}|${m.moment}|${format}|${options.theme ?? ""}`)).replace(/[^A-Za-z0-9_-]/g, "") || "oc";
    const title = `${m.name}: ${m.sentence}`;
    const desc = [
        `${m.stat.lead}${m.stat.band ? ` ${m.stat.band}` : ""} ${m.stat.rest}.`,
        m.key,
        m.image?.alt ? `Picture: ${m.image.alt}.` : "",
        `${m.label} Model ${m.modelVersion}.`,
        m.url,
    ].join(" ").replace(/\s+/g, " ").trim();
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
        `<title>${escapeXml(title)}</title>`,
        `<desc>${escapeXml(desc)}</desc>`,
        options.fontCss ? `<style>${safeCss(options.fontCss)}</style>` : "",
        `<rect width="${width}" height="${height}" fill="${p.bg}"/>`,
        LAYOUTS[format](m, p, id),
        `</svg>`,
    ].join("");
}
