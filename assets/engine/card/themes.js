/*
  Three themes from the site's palette (site/r5-*). One flat field each, the
  lap in ink or paper, and the ball in the one accent. No gradients.
*/
const PAPER = "#f3f0e8";
const INK = "#141311";
const SUN = "#ff5a1f";
const BABY = "#9ee9fb";
const DEEP = "#1f4bff";
const PINK = "#f2879e";
const CLARET = "#6f1726";
export const THEMES = {
    /** Paper field, ink lap, the ball in the site's orange. */
    paper: { bg: PAPER, ink: INK, soft: "#5d584f", hair: "rgba(20,19,17,0.22)", accent: "#e8480f", well: "#e7e2d7", wellInk: INK },
    /** Ink field, paper lap, the orange ball. */
    ink: { bg: INK, ink: PAPER, soft: "#a29e95", hair: "rgba(243,240,232,0.26)", accent: SUN, well: "#24221f", wellInk: PAPER },
    /** The accent field: ink lap, a paper ball. */
    sun: { bg: SUN, ink: INK, soft: "#4a1a07", hair: "rgba(20,19,17,0.3)", accent: PAPER, well: "#ff7a45", wellInk: INK },
    /** The brand palettes being compared on the site: fal's baby blue with its deep blue, and TypeSafe's pink with claret. */
    blue: { bg: BABY, ink: INK, soft: "#24464d", hair: "rgba(20,19,17,0.24)", accent: DEEP, well: "#c9f3fd", wellInk: INK },
    pink: { bg: PINK, ink: INK, soft: "#4d1f28", hair: "rgba(20,19,17,0.26)", accent: CLARET, well: "#f7b3c1", wellInk: INK },
    /** Ink fields with the brand colour as the ball. */
    "ink-blue": { bg: INK, ink: PAPER, soft: "#a29e95", hair: "rgba(243,240,232,0.26)", accent: BABY, well: "#24221f", wellInk: PAPER },
    "ink-pink": { bg: INK, ink: PAPER, soft: "#a29e95", hair: "rgba(243,240,232,0.26)", accent: PINK, well: "#24221f", wellInk: PAPER },
};
export const THEME_NAMES = Object.keys(THEMES);
/** The first card called the ink theme "night"; old links still work. */
const ALIASES = { night: "ink" };
export const paletteFor = (theme) => {
    const key = ALIASES[theme ?? ""] ?? theme ?? "paper";
    return THEMES[key] ?? THEMES.paper;
};
