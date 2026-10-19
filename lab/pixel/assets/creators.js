/*
  The other ninety nine creators in each jar. Made up, built from plain words with
  a fixed seed per kind, so the same handle sits in the same place every visit.
*/
const A = ["quiet", "salt", "north", "slow", "lantern", "copper", "tidal", "small", "late", "open", "still", "amber", "pine", "harbour", "paper", "hollow", "wild", "kettle", "linen", "orchard", "night", "river", "chalk", "brass", "long", "fern", "moss", "cedar", "dune", "glass", "winter", "signal"];
const B = {
  channel: ["works", "studio", "tapes", "reels", "lab", "frames", "garage", "bench", "kitchen", "atlas", "rooms", "trails"],
  newsletter: ["notes", "letters", "dispatch", "digest", "post", "margins", "weekly", "press", "ledger", "almanac", "pages", "memo"],
  stream: ["live", "shift", "arcade", "radio", "booth", "rig", "speedrun", "lounge", "channel", "deck", "hours", "club"],
  podcast: ["table", "hour", "talks", "radio", "show", "sessions", "rounds", "room", "tapes", "minutes", "chorus", "stories"],
  portfolio: ["prints", "light", "frames", "film", "plates", "negatives", "studio", "atelier", "grain", "lens", "darkroom", "views"],
};

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const CACHE = {};
/** Ninety nine made up handles for a kind, never repeating, never the example's own. */
export function crowd(kind, own) {
  if (CACHE[kind]) return CACHE[kind];
  const r = rng([...kind].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const nouns = B[kind] ?? B.channel;
  const seen = new Set([own.replace(/^@/, "")]);
  const out = [];
  while (out.length < 99) {
    const h = A[Math.floor(r() * A.length)] + nouns[Math.floor(r() * nouns.length)];
    if (seen.has(h)) continue;
    seen.add(h);
    out.push("@" + h);
  }
  return (CACHE[kind] = out);
}
