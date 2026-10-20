/*
  The one piece of art on a product band (../../assets/orbe/scene.js), in the
  band's colour pair and dressed on the lattice (light outline, dotted fills,
  up to three small clusters). One object per page, and only on these:

    rate          an orb filled to the made-up channel's place in its hundred (beats 93 in 100)
    podcasts      a studio microphone
    sponsorships  a camera: one lens with a crescent, nothing beside it to make a face
    roster        one orb group: three of the made-up roster's creators in depth, each at its own level
    hub           a small orb at the made-up channel's level

  On a desktop only (1100px up); on a tablet or phone the band is words
  alone, and the art never changes the band's height on any screen.
  Selling, Diligence and the card carry no art: they are money and trust
  pages, and stay clean. Levels come from the engine: the made-up channel in
  ../../assets/r5/examples.js and the made-up roster in ../roster/roster-data.js.
*/
import { mountScene, orb, orbDepth, mic, camera } from "../../assets/orbe/scene.js";

/* `light` is the outline and the light dots, `dark` the dark dots, `specks` the clusters' colours */
const COMPOSE = {
  rate: ({ levels: [you = 50] = [] }) => ({
    light: "water", dark: "ink", specks: { colors: ["sky", "water", "ember"], n: 3 },
    item: { make: orb({ level: you / 100, rim: ["chalk", "mist", "sky", "water"], liquid: ["mist", "sky", "water", "press"], tint: "mist" }), size: [120, 250] },
  }),
  podcasts: () => ({
    light: "blush", dark: "claret", specks: { colors: ["claret", "blush", "ember"], n: 3 },
    item: { make: mic({ head: ["chalk", "blush", "peony", "claret"], body: ["peony", "claret", "ink"], metal: ["blush", "claret", "ink"], slot: "claret" }), size: [180, 320], cut: 0.32 },
  }),
  sponsorships: () => ({
    light: "chalk", dark: "ink", specks: { colors: ["ink", "chalk", "ember"], n: 3 },
    item: { make: camera({ body: ["graphite", "soot", "ink"], plate: ["chalk", "linen", "stone"], barrel: ["stone", "graphite", "soot"], glass: ["water", "press", "ink"] }), size: [120, 230], bleed: 0.05 },
  }),
  roster: ({ levels = [50, 50, 50] }) => ({
    light: "chalk", dark: "ink", specks: { colors: ["stone", "water", "ember"], n: 3 },
    item: { make: orbDepth({ levels: levels.map((n) => n / 100), rim: ["chalk", "paper", "stone", "graphite"], liquid: ["mist", "sky", "water", "press"], tint: "chalk" }), size: [200, 380] },
  }),
  hub: ({ levels: [you = 50] = [] }) => ({
    light: "chalk", dark: "ink", specks: { colors: ["water", "chalk"], n: 2 },
    item: { make: orb({ level: you / 100, rim: ["chalk", "mist", "water", "press"], liquid: ["mist", "cobalt", "press", "ink"], tint: "chalk" }), size: [96, 150], cut: 0.3 },
  }),
};

/* the engine's figures for the bands that show a level */
async function levelsFor(key) {
  if (key === "rate" || key === "hub") {
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
  /* desktop only: under 1100px the band's words take its width, so the piece would sit cramped in a corner; there it stays clean */
  return mountScene(band, { ...compose(await levelsFor(key)), minWidth: 1100, label: key, seed: key.length * 7 + 3 });
}
