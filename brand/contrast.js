/*
  The contrast table, computed (WCAG 2.2 relative luminance). The brand book
  renders it live and docs/BRAND.md prints the same numbers.
  use: "text" needs 4.5 (AA) or 7 (AAA); "large" is 24px+ or 18.66px+ bold and
  needs 3 (AA) or 4.5 (AAA); "shape" is a non-text mark and needs 3.
*/
export const HEX = {
  Sky: "#9EE9FB", Cobalt: "#1F4BFF", Ink: "#141311", Paper: "#F3F0E8", Ember: "#FF5A1F", Peony: "#F2879E", Claret: "#6F1726",
  Chalk: "#FBFAF6", Linen: "#E7E2D7", Mist: "#D6F6FD", Blush: "#FBD9E0", Graphite: "#5D584F", Stone: "#A29E95",
  "Sky soft ink": "#24464D", "Peony soft ink": "#4D1F28",
  Positive: "#0A6B3A", "Positive tint": "#DDF1E4", Negative: "#B8291A", "Negative tint": "#FBDAD3", Warning: "#8A5800", "Warning fill": "#FFC23D", "Warning tint": "#FFE7AD",
};

const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** [foreground, background, how it is used, scheme] */
export const PAIRS = [
  ["Ink", "Sky", "text", "Blue"], ["Sky soft ink", "Sky", "text", "Blue"], ["Cobalt", "Sky", "large", "Blue"], ["Ink", "Paper", "text", "Both"],
  ["Graphite", "Paper", "text", "Both"], ["Cobalt", "Paper", "text", "Blue"], ["Chalk", "Cobalt", "text", "Blue"], ["Ink", "Mist", "text", "Blue"],
  ["Sky", "Ink", "text", "Blue"], ["Paper", "Ink", "text", "Both"], ["Stone", "Ink", "text", "Both"], ["Ember", "Ink", "text", "Both"],
  ["Ink", "Ember", "text", "Both"], ["Cobalt", "Sky", "shape", "Blue"], ["Ember", "Sky", "shape", "Blue"], ["Ember", "Paper", "shape", "Both"],
  ["Ink", "Peony", "text", "Pink"], ["Peony soft ink", "Peony", "text", "Pink"], ["Claret", "Peony", "text", "Pink"], ["Peony", "Ink", "text", "Pink"],
  ["Claret", "Paper", "text", "Pink"], ["Paper", "Claret", "text", "Pink"], ["Ink", "Blush", "text", "Pink"], ["Paper", "Peony", "text", "Pink"],
  ["Positive", "Paper", "text", "Both"], ["Positive", "Positive tint", "text", "Both"], ["Negative", "Paper", "text", "Both"], ["Negative", "Negative tint", "text", "Both"],
  ["Warning", "Paper", "text", "Both"], ["Warning", "Warning tint", "text", "Both"], ["Ink", "Warning fill", "text", "Both"], ["Stone", "Paper", "text", "Both"],
];

export function grade(r, use) {
  if (use === "shape") return { aa: r >= 3, aaa: null };
  if (use === "large") return { aa: r >= 3, aaa: r >= 4.5 };
  return { aa: r >= 4.5, aaa: r >= 7 };
}
