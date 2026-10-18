/* Writes the static SVG exports from brand.js: `node build.mjs` from this folder. */
import { writeFileSync } from "node:fs";
import { grain, ditherOrb, creature, bars, pixelStripe, landscape, crayon, COLOURS as C } from "./brand.js";

const out = {
  "grain.svg": grain({ seed: 7, opacity: 0.22 }),
  "grain-light.svg": grain({ seed: 9, opacity: 0.28, tone: "#FBFAF6" }),
  "orb-paper.svg": ditherOrb({ fg: C.paper, seed: 3 }),
  "orb-cobalt.svg": ditherOrb({ fg: C.cobalt, seed: 5 }),
  "orb-ink.svg": ditherOrb({ fg: C.ink, seed: 8 }),
  "creature-cobalt.svg": creature({ seed: 1 }),
  "creature-ember.svg": creature({ seed: 4, body: C.ember, edge: C.paper, mark: C.cobalt }),
  "creature-sky.svg": creature({ seed: 9, body: C.sky, edge: C.paper, mark: C.cobalt, ring: C.ink }),
  "bars.svg": bars({ seed: 2 }),
  "pixel-stripe.svg": pixelStripe({ seed: 4 }),
  "landscape-sky.svg": landscape({ palette: "sky", seed: 43, w: 1600, h: 1000 }),
  "landscape-dawn.svg": landscape({ palette: "dawn", seed: 43, w: 1600, h: 1000 }),
  "landscape-noon.svg": landscape({ palette: "noon", seed: 11, w: 1600, h: 1000 }),
  "landscape-night.svg": landscape({ palette: "night", seed: 5, w: 1600, h: 1000 }),
  "crayon-underline.svg": crayon({ shape: "underline" }),
  "crayon-loop.svg": crayon({ shape: "loop", colour: C.ember }),
  "crayon-arrow.svg": crayon({ shape: "arrow", colour: C.ink }),
};
for (const [f, s] of Object.entries(out)) writeFileSync(new URL(f, import.meta.url), s + "\n");
console.log(Object.keys(out).join("\n"));
