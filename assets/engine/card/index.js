/*
  The Orbe card: the shareable picture of a moment (a personal best, the
  rating, a season, moving up a size), as SVG, for orbe.vc/@handle/card.svg,
  the Open Graph image and the download button. The picture is the lap: the
  wordmark's O going round as far as you went, one lap being the yardstick,
  with the creator's own work in its window.
  Pure functions only, so `npm run build:engine` can ship it to the browser.
*/
import { cardModel } from "./model.js";
import { drawCard } from "./draw.js";
export { cardModel, cardLabel, figureOf, monthOf, normaliseHandle, safeImage, splitValue, topPart, MOMENTS } from "./model.js";
export { drawCard, escapeXml, FORMATS, FORMAT_NAMES } from "./draw.js";
export { drawLap, drawSizeUp, clampTurns, oWeights, MAX_TURNS, MIN_TURNS, RY } from "./lap.js";
export { WORDMARK_CUTS, WORDMARK_DESCENT, WORDMARK_PATH, WORDMARK_RATIO, WORDMARK_SMALL_MAX, WORDMARK_VIEWBOX, wordmarkCut } from "./wordmark.js";
export { THEMES, THEME_NAMES, paletteFor } from "./themes.js";
export { WORDS, wordsFor, againstLine } from "./words.js";
export { fontFaceCss, base64, SITE_FONTS } from "./fonts.js";
export { measure } from "./metrics.js";
/** The card for a rating: the words from cardModel, drawn by drawCard. */
export function renderCard(rating, account, options = {}) {
    return drawCard(cardModel(rating, account, options), options);
}
/**
  Headers for serving a card as its own file (orbe.vc/@handle/card.svg). The
  SVG carries no script, and the policy makes sure none could run if it did.
*/
export const CARD_HEADERS = {
    "content-type": "image/svg+xml; charset=utf-8",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src data: https:; img-src data:",
    "x-content-type-options": "nosniff",
    "cache-control": "public, max-age=3600",
};
/** A key that changes whenever anything printed on the card would, for ETags and caches. */
export function cardCacheKey(rating, account, options = {}) {
    const parts = [
        rating.kind, rating.rating, rating.band, rating.sizeBand, rating.modelVersion, rating.computedAt,
        rating.parts.map((p) => `${p.key}:${p.score}:${p.value}`).join(","),
        account.handle, account.name, options.format ?? "square", options.theme ?? "paper",
        options.provisional ? 1 : 0, options.note ?? "", options.host ?? "", options.path ?? "",
        (options.works ?? []).map((w) => `${w.multiple}:${w.ageDays ?? ""}:${w.matured === false ? 0 : 1}`).join(","),
        options.personalBest ? `${options.personalBest.value}|${options.personalBest.previous ?? ""}|${options.personalBest.label}|${options.personalBest.best.value}|${options.personalBest.best.previous ?? ""}|${options.personalBest.best.at}` : "",
        options.moment ?? "", options.workTitle ?? "", options.image?.href ? `${options.image.href.length}:${hashOf(options.image.href)}` : "", options.image?.alt ?? "",
        options.season ? `${options.season.name}|${options.season.works.map((w) => `${w.multiple}:${w.matured === false ? 0 : 1}`).join(",")}` : "",
        options.sizeUp ? `${options.sizeUp.from}|${options.sizeUp.to}` : "",
    ];
    return `card-${CARD_VERSION}-${hashOf(parts.join("|"))}`;
}
function hashOf(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
}
/** Bumped whenever the drawing changes, so cached cards are redrawn. */
export const CARD_VERSION = "2026.10.2";
