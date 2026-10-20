/*
  Each product band's scene (../../assets/orbe/scene.js): a hero object, a
  companion or two and scattered clusters, in the band's colour pair, dressed
  on the lattice (light outline, dotted fills). Levels are figures from the
  engine: the made-up channel's reach (beats 93 in 100) and the made-up show's
  from ../../assets/r5/examples.js, and the made-up roster's creators from
  ../roster/roster-data.js. The selling orb and the small orbs sit at the
  middle, where zero (typical) is.

    rate          an orb filled to the made-up channel's place in its hundred, and the hundred on the half lattice
    podcasts      a studio microphone, the bulb, and a small orb at the made-up show's level
    sponsorships  a price tag on its string (no words on it), the microphone tool and a small Ember orb
    selling       a large orb, Straw in the Cobalt band, a price tag and the bulb
    diligence     a magnifier over a record (one row that does not match), the bulb and a small orb
    roster        a roster in depth: three of the made-up roster's creators as orbs, one in front, each at its own level, with the game pad and the microphone
    hub           an orb, a price tag and the microphone
    card          an orb in Ember (you) and the bulb
  Cameras stay out (a lens with a dot reads as an eye), and so do small tags
  and, on the dark bands, small orbs.
*/
import { mountScene, orb, hundred, orbDepth, mic, tag, magnifier, tool } from "../../assets/orbe/scene.js";

/*
  Each band: `light` is the outline and the light dots, `dark` the dark dots,
  `specks` the clusters' colours (the pair's own, with Ember as the accent).
  The hero comes first; companions follow in the order they are wanted.
*/
const COMPOSE = {
  rate: ({ levels: [you = 50] = [] }) => ({
    light: "water", dark: "ink", specks: { colors: ["sky", "water", "mist", "ember"], n: 12 },
    items: [
      { make: orb({ level: you / 100, rim: ["chalk", "mist", "sky", "water"], liquid: ["mist", "sky", "water", "press"], tint: "mist" }), size: [130, 250] },
      { make: hundred({ n: you, on: ["mist", "sky", "water"], off: "soot" }), size: [82, 82], cut: 0, ring: 0 },
    ],
  }),
  podcasts: ({ levels: [n = 50] = [] }) => ({
    light: "blush", dark: "claret", specks: { colors: ["claret", "blush", "ember", "chalk"], n: 12 },
    items: [
      { make: mic({ head: ["chalk", "blush", "peony", "claret"], body: ["peony", "claret", "ink"], metal: ["blush", "claret", "ink"], slot: "claret" }), size: [220, 340], cut: 0.32 },
      { make: tool({ key: "explainer", dark: ["claret", "ink"], body: ["chalk", "blush"], accent: "ember" }), size: [160, 160], cut: 0.35 },
      { make: orb({ level: n / 100, rim: ["chalk", "blush", "peony", "claret"], liquid: ["blush", "ember", "claret", "ink"], tint: "chalk" }), size: [70, 100] },
    ],
  }),
  sponsorships: () => ({
    light: "chalk", dark: "ink", specks: { colors: ["ink", "chalk", "ochre", "ember"], n: 12 },
    items: [
      { make: tag({ card: ["chalk", "#F7EBB9", "straw", "ochre"], ring: ["chalk", "straw", "ochre"], string: "ink" }), size: [150, 260] },
      { make: tool({ key: "podcast", dark: ["soot", "ink"], body: ["chalk", "#F7EBB9"], accent: "ember" }), size: [160, 160], cut: 0.35 },
      { make: orb({ level: 0.5, rim: ["chalk", "dawn", "ember", "claret"], liquid: ["dawn", "ember", "claret", "#3A0B13"], tint: "chalk" }), size: [70, 100] },
    ],
  }),
  selling: () => ({
    light: "sky", dark: "ink", specks: { colors: ["straw", "sky", "chalk", "ember"], n: 12 },
    items: [
      { make: orb({ level: 0.5, rim: ["chalk", "mist", "sky", "cobalt"], liquid: ["chalk", "straw", "ochre", "#7A6420"], tint: "sky" }), size: [160, 320] },
      { make: tag({ card: ["chalk", "#F7EBB9", "straw", "ochre"], ring: ["chalk", "straw", "ochre"], string: "chalk" }), size: [120, 160] },
      { make: tool({ key: "explainer", dark: ["ink", "soot"], body: ["chalk", "sky"], accent: "straw" }), size: [160, 160], cut: 0.35 },
    ],
  }),
  diligence: () => ({
    light: "chalk", dark: "press", specks: { colors: ["press", "chalk", "cobalt", "ember"], n: 12 },
    items: [
      { make: magnifier({ ring: ["mist", "cobalt", "press", "ink"], glass: "mist", rows: ["water", "press"], accent: "ember" }), size: [170, 300] },
      { make: tool({ key: "explainer", dark: ["press", "ink"], body: ["chalk", "mist"], accent: "ember" }), size: [160, 160], cut: 0.35 },
      { make: orb({ level: 0.5, rim: ["chalk", "mist", "water", "press"], liquid: ["mist", "cobalt", "press", "ink"], tint: "chalk" }), size: [70, 100] },
    ],
  }),
  roster: ({ levels = [50, 50, 50] }) => ({
    light: "chalk", dark: "ink", specks: { colors: ["ink", "stone", "water", "ember"], n: 12 },
    items: [
      { make: orbDepth({ levels: levels.map((n) => n / 100), rim: ["chalk", "paper", "stone", "graphite"], liquid: ["mist", "sky", "water", "press"], tint: "chalk" }), size: [240, 400] },
      { make: tool({ key: "letsplay", dark: ["soot", "ink"], body: ["chalk", "linen"], accent: "ember" }), size: [160, 160], cut: 0.35 },
      { make: tool({ key: "podcast", dark: ["soot", "ink"], body: ["chalk", "linen"], accent: "water" }), size: [160, 160], cut: 0.35 },
    ],
  }),
  hub: ({ levels: [you = 50] = [] }) => ({
    light: "chalk", dark: "ink", specks: { colors: ["ink", "chalk", "cobalt", "ember"], n: 10 },
    items: [
      { make: orb({ level: you / 100, rim: ["chalk", "mist", "water", "press"], liquid: ["mist", "cobalt", "press", "ink"], tint: "chalk" }), size: [110, 190] },
      { make: tag({ card: ["chalk", "#F7EBB9", "straw", "ochre"], ring: ["chalk", "straw", "ochre"], string: "ink" }), size: [120, 150] },
      { make: tool({ key: "podcast", dark: ["press", "ink"], body: ["chalk", "mist"], accent: "ember" }), size: [160, 160], cut: 0.35 },
    ],
  }),
  card: ({ levels: [you = 50] = [] }) => ({
    light: "dawn", dark: "ink", specks: { colors: ["ember", "dawn", "sky", "claret"], n: 12 },
    items: [
      { make: orb({ level: you / 100, rim: ["chalk", "dawn", "ember", "claret"], liquid: ["dawn", "ember", "claret", "#3A0B13"], tint: "dawn" }), size: [130, 240] },
      /* on a dark band a small orb's empty glass reads as a dark hole, so the companion here is the bulb */
      { make: tool({ key: "explainer", dark: ["ember", "claret"], body: ["chalk", "dawn"], accent: "sky" }), size: [160, 160], cut: 0.35 },
    ],
  }),
};

/* the engine's figures for the bands that show a level */
async function levelsFor(key) {
  if (key === "podcasts") {
    const { example } = await import("../../assets/r5/examples.js");
    return { levels: [example("podcast").parts[0].score] };
  }
  if (key === "rate" || key === "hub" || key === "card") {
    const { example } = await import("../../assets/r5/examples.js");
    return { levels: [example("channel").parts[0].score] };
  }
  if (key === "roster") {
    const { buildRoster } = await import("../roster/roster-data.js");
    /* three creators in depth, the largest audience in front, each filled to where they stand in their hundred */
    const rows = buildRoster().filter((r) => r.shown?.rating && r.rating?.status === "rated").slice(0, 3).sort((a, b) => (b.audience || 0) - (a.audience || 0));
    return { levels: rows.map((r) => r.rating.beats) };
  }
  return {};
}

export async function mountBand(key) {
  const band = document.querySelector(".pr-band");
  const compose = COMPOSE[key];
  if (!band || !compose) return null;
  return mountScene(band, { ...compose(await levelsFor(key)), label: key, seed: key.length * 7 + 3 });
}
