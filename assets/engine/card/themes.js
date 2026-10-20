/*
  Three themes from the site's palette (site/r5-*). One flat field each, the
  lap in ink or paper, and the ball in the one accent. No gradients.
*/
const PAPER = "#f3f0e8";
const INK = "#141311";
const SUN = "#ff5a1f";
const STRAW = "#f5d34a";
const BABY = "#94e6ff";
const DEEP_COBALT = "#0e2aae";
const DEEP = "#1f4bff";
const PINK = "#f2879e";
const CLARET = "#6f1726";
export const THEMES = {
    /** Paper field, ink lap, the ball and its figure in Cobalt (5.3:1 on Paper; the orange read at 3.3). Soft words in Graphite, 10.8:1. */
    paper: { bg: PAPER, ink: INK, soft: "#38342e", hair: "rgba(20,19,17,0.22)", accent: DEEP, well: "#e7e2d7", wellInk: INK },
    /** Ink field, paper lap, the orange ball. */
    ink: { bg: INK, ink: PAPER, soft: "#c2beb5", hair: "rgba(243,240,232,0.26)", accent: SUN, well: "#24221f", wellInk: PAPER },
    /** The sun: a Straw field (Ink on it 12.6:1), an ink lap, the ball and its figure in deep Cobalt (7.3:1). */
    sun: { bg: STRAW, ink: INK, soft: "#38342e", hair: "rgba(20,19,17,0.3)", accent: DEEP_COBALT, well: "#f8e597", wellInk: INK },
    /** The brand palettes being compared on the site: fal's baby blue with its deep blue, and TypeSafe's pink with claret. */
    blue: { bg: BABY, ink: INK, soft: "#1f3c43", hair: "rgba(20,19,17,0.24)", accent: DEEP_COBALT, well: "#d6f6fd", wellInk: INK },
    pink: { bg: PINK, ink: INK, soft: "#3a1219", hair: "rgba(20,19,17,0.26)", accent: CLARET, well: "#f7b3c1", wellInk: INK },
    /** Ink fields with the brand colour as the ball. */
    "ink-blue": { bg: INK, ink: PAPER, soft: "#c2beb5", hair: "rgba(243,240,232,0.26)", accent: BABY, well: "#24221f", wellInk: PAPER },
    "ink-pink": { bg: INK, ink: PAPER, soft: "#c2beb5", hair: "rgba(243,240,232,0.26)", accent: PINK, well: "#24221f", wellInk: PAPER },
};
export const THEME_NAMES = Object.keys(THEMES);
/** The first card called the ink theme "night"; old links still work. */
const ALIASES = { night: "ink" };
export const paletteFor = (theme) => {
    const key = ALIASES[theme ?? ""] ?? theme ?? "paper";
    return THEMES[key] ?? THEMES.paper;
};
