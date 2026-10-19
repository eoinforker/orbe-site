/*
  The examples every round 5 page shows: one made-up creator per kind of work,
  rated live in the browser by the Orbe engine (built from product/src/rating
  with `npm run build:engine`). Pages read only this module.
*/
import { rate, rateWorks, explain, signed, SPECS, MODEL_VERSION, fixtureSnapshot, FIXTURE_NOW, personalBests, recordMetric } from "../engine/rating/browser.js";
import { artwork } from "./artwork.js";

export const ORDER = ["channel", "newsletter", "stream", "podcast", "portfolio"];

/* Each example is a made-up creator, generated from a fixed seed so it reads the same every time. */
const MADE_UP = {
  channel: { kind: "youtube", word: "channel", label: "Channel", title: "Field Recordings", handle: "@fieldrecordings", show: ["reach", "momentum", "engagement"], o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 } },
  newsletter: { kind: "substack", word: "newsletter", label: "Newsletter", title: "Margin Notes", handle: "@marginnotes", show: ["reach", "conversion", "engagement"], o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 } },
  stream: { kind: "twitch", word: "stream", label: "Stream", title: "Night Shift", handle: "@nightshift", show: ["reach", "follows", "momentum"], o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 } },
  podcast: { kind: "podcast", word: "podcast", label: "Podcast", title: "The Long Table", handle: "@thelongtable", show: ["reach", "completion", "momentum"], o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 } },
  portfolio: { kind: "photography", word: "portfolio", label: "Photography", title: "Low Tide Prints", handle: "@lowtideprints", show: ["reach", "saves", "licensing"], o: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 } },
};

const sentences = (text, n) => (text.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [text]).slice(0, n).join("").trim();

function build(key) {
  const m = MADE_UP[key];
  const spec = SPECS[m.kind];
  const snap = fixtureSnapshot({ kind: m.kind, noise: 0.25, ...m.o, title: m.title });
  snap.account.handle = m.handle;
  const r = rate(snap, FIXTURE_NOW);
  const works = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured).slice(0, 12);
  const top = works.reduce((a, w) => (w.multiple > a.multiple ? w : a), works[0]);
  const parts = m.show.map((k) => r.parts.find((p) => p.key === k)).filter(Boolean).map(({ key, name, score, value, what }) => ({ key, name, score, value, what }));
  return {
    kind: key, platform: m.kind, word: m.word, label: m.label, name: m.title, handle: m.handle, peers: spec.peers,
    sizeBand: `${r.sizeBand} ${spec.audienceNoun}`, rating: r.rating, signed: signed(r.rating), band: r.band, parts,
    best: `Best of the last twelve: ${top.multiple.toFixed(1)}× a typical ${r.detail.workNoun}.`,
    explain: sentences(explain(r), 2),
    result: r,
    card: cardMoments(m, spec, snap, r),
  };
}

const count = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/*
  What each moment on the card needs, all from the engine and the made-up
  creator's own works: the standing record on the kind's first counted record
  (personal best), the year so far (season), and the size band below this one
  (up a size), plus the creator's made-up artwork.
*/
function cardMoments(m, spec, snap, r) {
  const all = rateWorks(snap, FIXTURE_NOW);
  const records = personalBests(snap, { includeBaseline: true });
  let personalBest = null;
  for (const rec of spec.records) {
    const unit = spec.metrics.find((x) => x.key === rec.metric)?.unit;
    const pb = records.find((p) => p.metric === recordMetric(rec));
    if (pb && unit === "count" && pb.previous) {
      personalBest = { best: pb, label: rec.label, value: count.format(pb.value), previous: count.format(pb.previous) };
      break;
    }
  }
  const now = new Date(FIXTURE_NOW);
  const year = now.getUTCFullYear();
  const dayOfYear = (now - Date.UTC(year, 0, 1)) / 86400000;
  const i = spec.sizeBands.findIndex((b) => b.key === r.detail.bandKey);
  const art = artwork(keyOf(m));
  return {
    works: r.detail.workRatings,
    personalBest,
    season: { name: `${year} so far`, works: all.filter((w) => (w.ageDays ?? 0) <= dayOfYear) },
    sizeUp: i > 0 ? { from: spec.sizeBands[i - 1].label, to: spec.sizeBands[i].label } : null,
    image: art ? { href: art.href, alt: art.alt } : null,
    workTitle: art?.title ?? m.title,
  };
}
const keyOf = (m) => Object.keys(MADE_UP).find((k) => MADE_UP[k] === m);

const CACHE = {};
export const example = (kind) => (CACHE[kind] ??= build(kind));

/** The published weights for a kind, as the engine uses them. Defaults to channels. */
export const mathsFor = (kind = "channel") => SPECS[MADE_UP[kind].kind].parts.map((p) => ({ name: p.name, weight: Math.round(p.weight * 100), what: p.what }));
export const MATHS = mathsFor("channel");
export const BANDS = ["Poor", "Subpar", "Average", "Good", "Great"];
export const verdict = (n) => (n >= 2 ? "Great" : n >= 0.8 ? "Good" : n > -0.8 ? "Average" : n > -2 ? "Subpar" : "Poor");
export { signed, MODEL_VERSION };

/** The one line that labels every example. True because every figure above is computed live by the engine. */
export const EXAMPLE_LINE = "A made-up creator, rated live by the Orbe engine.";

/** The line for a card: the artwork is made up too, and drawn by us. */
export const CARD_EXAMPLE_LINE = "A made-up creator and made-up artwork, rated live by the Orbe engine.";

/*
  The State of the Middle, until the first season is published: the engine's own
  starting baselines (provisional priors), not measured data. One series, so every
  page shows the same numbers and labels them the same way.
*/
export const BENCHMARK_LINE = "The engine's starting baselines. The first season replaces them with consented data.";
export function benchmark(kind = "channel") {
  const spec = SPECS[MADE_UP[kind].kind];
  const reach = spec.parts.find((p) => p.key === "reach");
  return {
    title: `Typical reach for ${spec.peers}, by size`,
    what: reach.what,
    rows: spec.sizeBands.map((b) => ({ key: b.key, label: b.label, value: reach.prior.median[b.key] })).filter((r) => r.value != null),
    example: example(kind).result.detail.bandKey,
    line: BENCHMARK_LINE,
  };
}
