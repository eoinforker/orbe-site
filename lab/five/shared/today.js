/*
  Five made-up creators for the Today screens. Every figure on every page is
  computed here, live, by the Orbe engine: a fixture snapshot built from a fixed
  seed (so a page reads the same on every load), then rate, rateWorks, explain,
  topStat and personalBests. Names, handles and titles are invented. Nothing
  here is a real creator or a real observation.
*/
import { rate, rateWorks, explain, topStat, personalBests, recordMetric, fixtureSnapshot, FIXTURE_NOW, SPECS, signed } from "../../../assets/engine/rating/browser.js";

export const MADE_UP_LINE = "A made-up creator, rated live by the Orbe engine.";
export const ORDER = ["science", "shorts", "stream", "macro", "shed"];

const CREATORS = {
  science: {
    name: "Pendulum Hours", handle: "@pendulumhours", label: "Science explainers",
    o: { kind: "youtube", audience: 180000, reach: 1.5, engagement: 1.5, hitEvery: 5, seed: 6, everyDays: 10, durationSec: 1560, n: 24, noise: 0.25 },
    titles: [
      "Why does a kettle sing before it boils?", "The 30 seconds that explain the tides", "How cold is space, really?",
      "A cloud chamber in a fish tank", "What a bee sees", "The maths of a perfect skimming stone",
      "Why mirrors flip left, not up", "Can you hear a black hole?", "Lightning, slowed 10,000 times",
      "Is glass a liquid? No. Here is why.", "Rust, explained with one nail", "Why sunsets go orange",
    ],
  },
  shorts: {
    name: "Semicolon Weather", handle: "@semicolonweather", label: "Coding Shorts",
    o: { kind: "youtube", audience: 40000, reach: 1.8, engagement: 1.6, hitEvery: 4, seed: 10, everyDays: 1, durationSec: 48, n: 40, noise: 0.3 },
    titles: [
      "Why 0.1 + 0.2 is not 0.3", "git stash in 30 seconds", "Off by one, explained with stairs",
      "NaN is not NaN. Here is why.", "Big O with a deck of cards", "The email regex (almost)",
      "Recursion, but Russian dolls", "null vs undefined, round one", "Your first Dockerfile in 45s",
      "What a hash map actually does", "Binary search on a bookshelf", "Debounce, explained with a lift",
      "Why your CSS will not centre", "async/await in 50 seconds", "SQL joins as a dinner party", "The one git command I use daily",
      "What a pointer really is", "Unicode broke my string length", "DNS in one breath", "Merge vs rebase, calmly",
    ],
    /* the Short with the most comments in the last twelve gets this title: the comment war is the engine's own count */
    war: "Tabs vs spaces. I said what I said.",
  },
  stream: {
    name: "Lanterns and Tea", handle: "@lanternsandtea", label: "Cosy stream",
    o: { kind: "twitch", audience: 900, reach: 1.3, engagement: 1.6, hitEvery: 6, seed: 7, everyDays: 2.5, durationSec: 3 * 3600, n: 30, noise: 0.25 },
    titles: [
      "Lighthouse village, part 3", "Cosy farm, day 41", "Rainy night jigsaw", "Building the tea house",
      "Fishing for the golden carp", "Sunday pottery", "First look: tiny island builder", "Garden tour and chat",
      "Knitting sim, yes really", "Night market build", "Snow day stream", "Finishing the orchard",
    ],
  },
  macro: {
    name: "Dew Hours", handle: "@dewhours", label: "Macro insects",
    o: { kind: "photography", audience: 12000, reach: 1.3, engagement: 1.6, hitEvery: 5, seed: 6, everyDays: 7, n: 25, noise: 0.25 },
    titles: [
      "The 4am dew, canal meadow", "Damselfly wings, backlit", "Weevil on a nettle", "Frost on a lacewing",
      "Hoverfly at 5:1", "Jumping spider, 64 frame stack", "Shieldbug nymphs", "Ladybird larva on a rose",
      "Moth scales at 10x", "Orb weaver after rain", "Beetle on bramble", "Mayfly at the weir",
    ],
  },
  shed: {
    name: "Shed Number Four", handle: "@shednumberfour", label: "Dad and his shed",
    o: { kind: "youtube", audience: 3000, reach: 2.2, engagement: 1.8, hitEvery: 5, seed: 7, everyDays: 14, durationSec: 1100, n: 20, noise: 0.3 },
    titles: [
      "Fixing the shed door (finally)", "The lads rate my new workbench", "Restoring a rusty hand plane",
      "Bird box with the kids", "Shed tour, autumn", "Sharpening chisels the slow way",
      "I built a shelf and it is level", "Ten quid of car boot tools", "Rain on the shed roof",
      "A mallet from an old table leg", "Workbench, part two", "Painting the shed (help)",
    ],
  },
};

const count = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const n0 = (x) => count.format(Math.round(x));
export const money = (minor) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(minor / 100);
const DAY = 86400000;
const dateOf = (iso) => new Date(iso);
export const NOW = new Date(FIXTURE_NOW);
export const dayName = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const shortDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function build(key) {
  const c = CREATORS[key];
  const spec = SPECS[c.o.kind];
  const snap = fixtureSnapshot({ ...c.o, title: c.name });
  snap.account.handle = c.handle;
  const byId = new Map(snap.works.map((w, i) => [w.id, { w, i }]));
  const r = rate(snap, FIXTURE_NOW);
  const rated = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured);
  /* the newest twelve that count, oldest first for charts */
  const recent = rated.slice(0, 12).map((x) => {
    const { w, i } = byId.get(x.workId);
    return { id: x.workId, i, title: c.titles[i] ?? `An earlier ${r.detail.workNoun}`, rating: x.rating, signed: signed(x.rating), multiple: x.multiple, ageDays: x.ageDays, date: dateOf(w.publishedAt), metrics: w.metrics, durationSec: w.durationSec };
  });
  if (c.war) {
    const loud = recent.reduce((a, w) => ((w.metrics.comments ?? 0) > (a.metrics.comments ?? 0) ? w : a), recent[0]);
    c.titles[loud.i] = c.war;
    loud.title = c.war;
    loud.war = true;
  }
  const latest = recent[0];
  const best = recent.reduce((a, w) => (w.multiple > a.multiple ? w : a), recent[0]);
  const quiet = recent.reduce((a, w) => (w.multiple < a.multiple ? w : a), recent[0]);
  const part = (k) => r.parts.find((p) => p.key === k);
  /* standing records: the best each record metric has reached on any work Orbe has read */
  const records = personalBests(snap, { includeBaseline: true }).filter((p) => p.previous != null).map((p) => {
    const rec = spec.records.find((x) => recordMetric(x) === p.metric);
    const { w, i } = byId.get(p.workId);
    return { metric: p.metric, label: rec?.label ?? p.metric, value: p.value, previous: p.previous, title: c.titles[i] ?? null, date: dateOf(w.publishedAt), workId: p.workId, newest: i === 0, first: i === snap.works.length - 1 };
  });
  /* the body of work so far: every work in the record, and the primary metric summed across them */
  const primary = spec.work.primary;
  const oldest = snap.works[snap.works.length - 1];
  const body = { works: snap.works.length, since: dateOf(oldest.publishedAt), total: snap.works.reduce((s, w) => s + (w.metrics[primary] ?? 0), 0), primary, hours: snap.works.reduce((s, w) => s + (w.durationSec ?? 0), 0) / 3600, totals: Object.fromEntries(spec.metrics.map((m) => [m.key, snap.works.reduce((s, w) => s + (w.metrics[m.key] ?? 0), 0)])) };
  return {
    key, ...c, body, spec, kind: c.o.kind, peers: spec.peers, audience: c.o.audience, audienceNoun: spec.audienceNoun,
    sizeBand: `${r.sizeBand.replace(/^Under/, "under").replace(/^Over/, "over")} ${spec.audienceNoun}`, rating: r.rating, signed: signed(r.rating), band: r.band,
    parts: r.parts, part, top: topStat(r), explain: explain(r), result: r, typical: r.detail.typical,
    workNoun: r.detail.workNoun, works: r.detail.works, recent, latest, best, quiet, records,
  };
}

const CACHE = {};
export const today = (key) => (CACHE[key] ??= build(key));
export { signed, FIXTURE_NOW };

import { normalCdf } from "../../../assets/engine/rating/stats.js";
/**
  Where one value would sit against the engine's prior for this creator's size:
  the same z-score and percentile the engine uses for a part, applied to a single
  work's figure. Never 0 or 100 in 100.
*/
export function beatsFor(t, partKey, value) {
  const part = t.spec.parts.find((p) => p.key === partKey);
  const band = t.result.detail.bandKey;
  const median = typeof part.prior.median === "object" ? part.prior.median[band] : part.prior.median;
  const z = part.scale === "log" ? Math.log(Math.max(value, 1e-9) / median) / part.prior.sigma : (value - median) / part.prior.sigma;
  return Math.max(1, Math.min(99, Math.round(normalCdf(z) * 100)));
}
