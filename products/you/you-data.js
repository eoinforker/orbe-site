/*
  Your Orbe: every figure on the page, worked out live by the Orbe engine
  (site/assets/engine) for one made-up creator of each kind. The creators,
  their works and their titles are invented; the maths is the real engine's.

  The creators are the same made-up ones every page shows (site/assets/r5/examples.js),
  built from the same seeds, so a figure here matches the figure there.
*/
import { rate, rateWorks, topStat, focusAreas, explain, personalBests, personalBestLine, recordMetric, SPECS, FIXTURE_NOW, fixtureSnapshot, signed, RATING_LABEL } from "../../assets/engine/rating/browser.js";
import { maturedShare, prepare, measure, measurePart } from "../../assets/engine/rating/measure.js";
import { priorFor, PROVISIONAL_PRIORS } from "../../assets/engine/rating/priors.js";
import { logZ, linearZ, normalCdf, median, clampZ } from "../../assets/engine/rating/stats.js";
import { bandFor, RATING_SCALE } from "../../assets/engine/rating/rate.js";
import { seeded } from "../../assets/engine/rating/fixtures.js";
import { scaleSnapshot } from "../../assets/engine/rating/fixtures.js";
import { formatDisplay } from "../../assets/engine/rating/format.js";
import { against } from "../../assets/js/against.js";
import { inventoryFromStats, specsForKind } from "../../assets/engine/sponsor/browser.js";
import { DEFAULT_FEE_SCHEDULE, MIN_MONTHS, formatMoney } from "../../assets/engine/market/browser.js";
import { suspiciousCreator } from "../../assets/engine/record/browser.js";

export { RATING_LABEL, FIXTURE_NOW };

const DAY = 86400000;
const NOW = Date.parse(FIXTURE_NOW);
/** "This period": the last five weeks, and the five before them for "last period". */
export const PERIOD_DAYS = 35;
export const PERIOD_WORDS = "the last five weeks";
const WEEKS = 8;

/* The made-up creators, one per kind, as examples.js builds them. Titles of works are invented too. */
export const KINDS = [
  {
    key: "channel", tab: "YouTube", kind: "youtube", name: "Field Recordings", handle: "@fieldrecordings", pair: "rec",
    o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 },
    titles: ["Why a cathedral hums at night", "Recording rain on twelve roofs", "The quietest room in Wales", "A foghorn, slowed down 40 times", "What a glacier sounds like inside", "Contact mics on a suspension bridge", "Birdsong at 4am, one street over", "The hum under every city", "Ice on a frozen lake sings", "A whole day of one bell", "Wind through a broken fence", "Trains heard from a tunnel"],
  },
  {
    key: "newsletter", tab: "Newsletter", kind: "substack", name: "Margin Notes", handle: "@marginnotes", pair: "note",
    o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 },
    titles: ["The pencil notes in library books", "On reading slowly again", "Ten books I keep lending out", "What the second-hand shop knows", "Marginalia, a field guide", "The book I could not finish", "Letters from a reading group", "Why I underline in ink", "The index is the best part", "A year of reading on trains", "Notes on a found postcard", "Books that read you back"],
  },
  {
    key: "stream", tab: "Twitch", kind: "twitch", name: "Night Shift", handle: "@nightshift", pair: "also",
    o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 },
    titles: ["Cosy farm sim until sunrise", "Chat picks every road", "The no map challenge", "Speedrun practice, again", "Building the lighthouse", "Blind run of the new patch", "Chat versus the final boss", "Fishing until we catch it", "Night drive, lo-fi radio", "The 100 crate run", "Rebuilding the old base", "Last stream of the season"],
  },
  {
    key: "podcast", tab: "Podcast", kind: "podcast", name: "The Long Table", handle: "@thelongtable", pair: "pod",
    o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 },
    titles: ["Who gets the last potato", "Dinner with strangers", "The recipe my nan hid", "Arguing about gravy", "One pan, four opinions", "The kitchen table years", "What we ate in 1994", "Feeding twelve on a budget", "The best bread we ever got wrong", "Our worst dinner party", "Leftovers, ranked", "A whole episode on soup"],
  },
  {
    key: "portfolio", tab: "Photography", kind: "photography", name: "Low Tide Prints", handle: "@lowtideprints", pair: "spon",
    o: { audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1 },
    titles: ["Estuary at first light", "Mudflats, thirty seconds", "The pier in a sea fret", "Low water, long shadows", "Gulls over the sandbar", "Blue hour at the harbour", "Rust on the old jetty", "Fog lifting off the river", "Tide lines in November", "Wet sand mirror", "The last boat in", "Salt marsh at dusk"],
  },
];

/* Each kind's own words. */
const WORDS = {
  youtube: { work: "upload", works: "uploads", unit: "views", move: "Publish" },
  substack: { work: "issue", works: "issues", unit: "opens", move: "Send" },
  twitch: { work: "stream", works: "streams", unit: "average viewers", move: "Go live" },
  podcast: { work: "episode", works: "episodes", unit: "downloads in 7 days", move: "Publish" },
  photography: { work: "photo set", works: "photo sets", unit: "views", move: "Post" },
};

const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const count = (n) => nf.format(Math.round(n));
export const gbp = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" }).replace(/\.00$/, "");
export const gbpExact = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" });
export const minus = (s) => String(s).replace(/^-/, "−");
export const times = (m) => `${m >= 10 ? Math.round(m) : m.toFixed(1)}×`;
const dayName = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).replace("Sept", "Sep");

/* The made-up snapshot as of today, with invented titles on its works. */
function baseSnapshot(k) {
  const snap = fixtureSnapshot({ kind: k.kind, noise: 0.25, ...k.o, title: k.name });
  snap.account.handle = k.handle;
  snap.works.forEach((w, i) => { w.title = k.titles[i % k.titles.length]; });
  return snap;
}

/*
  The same works as they would have read on an earlier day: works not yet
  published drop out, and each metric is scaled back along the engine's own
  maturity curve to the age it had then. That gives an honest history to
  rate week by week and to find personal bests in.
*/
function asOf(snap, spec, at) {
  const atIso = new Date(at).toISOString();
  const works = snap.works
    .filter((w) => Date.parse(w.publishedAt) <= at)
    .map((w) => {
      const pub = Date.parse(w.publishedAt);
      const nowAge = (NOW - pub) / DAY;
      const thenAge = (at - pub) / DAY;
      const metrics = {};
      for (const m of spec.metrics) {
        if (!(m.key in w.metrics)) continue;
        if (m.unit === "ratio" || !m.maturity) { metrics[m.key] = w.metrics[m.key]; continue; }
        metrics[m.key] = w.metrics[m.key] * (maturedShare(m.maturity, thenAge) / maturedShare(m.maturity, nowAge));
      }
      return { ...w, metrics };
    });
  return { ...snap, works, provenance: { ...snap.provenance, checkedAt: atIso } };
}

const display = (part, x) => formatDisplay(part.display, x);

const CACHE = {};
export const creator = (key) => (CACHE[key] ??= build(KINDS.find((k) => k.key === key)));

function build(k) {
  const spec = SPECS[k.kind];
  const w = WORDS[k.kind];
  const snap = baseSnapshot(k);
  const r = rate(snap, FIXTURE_NOW);
  const bandIndex = spec.sizeBands.findIndex((b) => b.key === r.detail.bandKey);
  const band = spec.sizeBands[bandIndex];
  const sizeBand = `${band.label.replace(/^Under/, "under").replace(/^Over/, "over")} ${spec.audienceNoun}`;

  /* ---------- the trend: the rating each Sunday for eight weeks, from the history above ---------- */
  const history = [];
  for (let i = WEEKS - 1; i >= 0; i--) history.push(asOf(snap, spec, NOW - i * 7 * DAY));
  const trend = history.map((s) => {
    const x = rate(s, s.provenance.checkedAt);
    return { at: s.provenance.checkedAt, rating: x.status === "rated" ? x.rating : null };
  });
  const last = rate(asOf(snap, spec, NOW - PERIOD_DAYS * DAY), new Date(NOW - PERIOD_DAYS * DAY).toISOString());

  /* ---------- skills: the rating's parts as percentiles against the size band ---------- */
  const top = topStat(r);
  const focus = focusAreas(r);
  const skills = r.parts.map((p) => {
    const d = r.detail.parts.find((x) => x.key === p.key);
    const partSpec = spec.parts.find((x) => x.key === p.key);
    const before = last.status === "rated" ? last.parts.find((x) => x.key === p.key) : null;
    return {
      key: p.key, name: p.name, score: p.score, value: p.value, what: p.what,
      typical: display(partSpec, d.prior.median).value,
      lastScore: before?.score ?? null,
      top: top?.key === p.key, weak: focus[0]?.key === p.key,
    };
  });

  /* ---------- highlights from this period's works ---------- */
  const rated = rateWorks(snap, FIXTURE_NOW);
  const byId = new Map(snap.works.map((x) => [x.id, x]));
  const withWork = rated.map((x) => ({ ...x, work: byId.get(x.workId) }));
  const matured = withWork.filter((x) => x.matured);
  const inPeriod = matured.filter((x) => x.ageDays <= PERIOD_DAYS);
  const pool = inPeriod.length ? inPeriod : matured.slice(0, 4);
  const best = pool.reduce((a, x) => (x.multiple > a.multiple ? x : a), pool[0]);
  const primaryMetric = spec.work.primary;
  const typicalPrimary = best.work.metrics[primaryMetric] / best.multiple;

  // The quiet one: a work that beat your typical without being the headline. Where the kind measures a
  // response (likes, clicks, saves, follows), the work whose response ran furthest above your usual comes first.
  const recent12 = matured.slice(0, 12).filter((x) => x.workId !== best.workId);
  let quiet = null;
  const sec = spec.work.secondary;
  if (sec) {
    const ratio = (wk) => sec.numerator.reduce((t, m) => t + (wk.metrics[m] ?? 0), 0) / Math.max(wk.metrics[sec.denominator] ?? 0, 1e-9);
    const ratios = recent12.map((x) => ratio(x.work)).sort((a, b) => a - b);
    const usual = ratios[Math.floor(ratios.length / 2)];
    const q = recent12.map((x) => ({ ...x, times: ratio(x.work) / usual })).filter((x) => x.times >= 1.15).sort((a, b) => b.times - a.times)[0];
    if (q) quiet = { ...q, kind: "response", ratio: ratio(q.work), usual };
  }
  if (!quiet) {
    const q = recent12.filter((x) => x.multiple > 1 && x.multiple < best.multiple).sort((a, b) => b.multiple - a.multiple)[0];
    if (q) quiet = { ...q, kind: "steady" };
  }

  // Personal bests over the eight weeks: the newest record that fell, with the previous one.
  const events = personalBests(history).filter((e) => e.previous !== null);
  const countRecords = spec.records.filter((rec) => (spec.metrics.find((m) => m.key === rec.metric)?.unit ?? "count") === "count");
  const pbEvent = events.filter((e) => countRecords.some((rec) => recordMetric(rec) === e.metric)).at(-1) ?? null;
  let pb = null;
  if (pbEvent) {
    const rec = spec.records.find((x) => recordMetric(x) === pbEvent.metric);
    pb = { ...pbEvent, label: rec.label, line: personalBestLine(pbEvent, k.kind), work: byId.get(pbEvent.workId), on: dayName(Date.parse(pbEvent.at)) };
  } else {
    const standing = personalBests(snap, { includeBaseline: true }).filter((e) => e.previous !== null && countRecords.some((rec) => recordMetric(rec) === e.metric))[0];
    if (standing) {
      const rec = spec.records.find((x) => recordMetric(x) === standing.metric);
      pb = { ...standing, label: rec.label, line: personalBestLine(standing, k.kind), work: byId.get(standing.workId), on: null };
    }
  }

  // The streak: works in a row, newest first, at or above three quarters of your own typical. Your floor, holding.
  let streak = 0;
  for (const x of matured) { if (x.multiple >= 0.75) streak++; else break; }
  // And the rhythm: weeks in a row, back from today, with something out.
  const pubs = snap.works.map((x) => Date.parse(x.publishedAt));
  let weeks = 0;
  for (let i = 0; i < 52; i++) { const hi = NOW - i * 7 * DAY, lo = hi - 7 * DAY; if (pubs.some((p) => p > lo && p <= hi)) weeks++; else break; }

  const weekRow = Array.from({ length: 12 }, (_, i) => { const hi = NOW - i * 7 * DAY, lo = hi - 7 * DAY; return pubs.filter((p) => p > lo && p <= hi).length; }).reverse();

  /* ---------- compare ---------- */
  const reach = r.detail.parts.find((p) => p.key === "reach");
  const reachSpec = spec.parts.find((p) => p.key === "reach");
  const compareSize = skills.map((s) => ({ key: s.key, name: s.name, you: s.value, them: s.typical, score: s.score }));
  const comparePast = {
    then: last.status === "rated" ? last.rating : null,
    thenBand: last.status === "rated" ? last.band : null,
    rows: skills.map((s) => ({ key: s.key, name: s.name, now: s.score, then: s.lastScore })),
  };
  let levelUp = null;
  const next = spec.sizeBands[bandIndex + 1];
  if (next) {
    const kx = next.min / Math.max(snap.account.audience, 1);
    const up = rate(scaleSnapshot(snap, kx), FIXTURE_NOW);
    const nextReach = spec.parts.find((p) => p.key === "reach");
    const nextPrior = nextReach.prior.formats?.[r.detail.format]?.median ?? nextReach.prior.median;
    const nextMedian = typeof nextPrior === "number" ? nextPrior : nextPrior[next.key];
    const typicalNow = r.detail.typical[primaryMetric];
    levelUp = {
      label: `${next.label.replace(/^Over/, "over")} ${spec.audienceNoun}`,
      at: count(next.min),
      audienceNeeded: next.min - snap.account.audience,
      rating: up.status === "rated" ? up.rating : null,
      band: up.status === "rated" ? up.band : null,
      rows: up.status === "rated" ? up.parts.map((p) => ({ key: p.key, name: p.name, now: r.parts.find((x) => x.key === p.key)?.score ?? null, then: p.score })) : [],
      // The typical work at the bottom of the next band, from its reach prior, against yours today.
      theirTypical: nextMedian * next.min,
      yourTypical: typicalNow,
      reachThem: display(reachSpec, nextMedian).value,
    };
  }

  /* ---------- three next moves, from the engine's own advice ---------- */
  const moves = [];
  const byScore = [...r.parts].sort((a, b) => a.score - b.score);
  const lever = focus[0] ?? { ...byScore[0], advice: r.detail.parts.find((d) => d.key === byScore[0].key).advice };
  const leverWhy = lever.score < 50
    ? `${lever.name} beats ${lever.score} in 100 ${spec.peers} your size, your lowest part right now.`
    : `${lever.name} sits at ${lever.score} in 100, right about typical for your size. Everything else is ahead of it, so it is where the next point comes from.`;
  moves.push({ title: `Your next lever: ${lever.name.toLowerCase()}`, body: lever.advice, why: leverWhy, api: false });
  moves.push({ title: `Make the sequel to \u201c${best.work.title}\u201d`, body: `It did ${times(best.multiple)} your typical ${w.work}. Hits come from ideas, not effort, so borrow its premise while it is fresh.`, why: `Your best ${w.work} of ${PERIOD_WORDS}, against your own median.`, api: false });
  moves.push({ title: `See why your best ${w.works} worked`, body: `The full guide sets your best tenth against the rest on title, length, day and topic, and says how sure it is. It needs your history, so it reads it for you after every post.`, why: "The after-post guide, from your own connected numbers.", api: true });

  /* ---------- levels you grow into ---------- */
  const sponsor = sponsorQuote(k, snap, r);
  const rec = record();

  /* ---------- the line for the share card ---------- */
  const shareLine = `${k.name}: “${best.work.title}” did ${times(best.multiple)} my typical ${w.work}. Rated ${minus(signed(r.rating))}, ${r.band}, ${against(k.kind, band.label)}. ${RATING_LABEL}.`;

  return {
    k, spec, w, r, sizeBand, band: band.label, peers: spec.peers, against: against(k.kind, band.label),
    rating: r.rating, signed: minus(signed(r.rating)), verdict: r.band,
    reachScore: r.parts.find((p) => p.key === "reach").score, reachValue: r.parts.find((p) => p.key === "reach").value,
    works: r.detail.works, explain: explain(r),
    trend, last: comparePast,
    skills, top, focus,
    weekRow, best: { ...best, typicalPrimary, on: dayName(Date.parse(best.work.publishedAt)) }, quiet, pb, streak, weeks,
    recent: matured.slice(0, 12).map((x) => ({ id: x.workId, m: x.multiple, title: x.work.title })).reverse(),
    compareSize, levelUp,
    moves,
    sponsor, rec,
    shareLine, primaryUnit: w.unit,
    audience: snap.account.audience,
    snap, ...game(k, spec, w, snap, r, band, sizeBand, best, last),
  };
}

/*
  A sponsorship quote from the creator's own delivery: each recent work's
  primary figure at the format's price window, priced on the provisional rate
  card. The rate card is in dollars; Orbe never guesses exchange rates, so the
  conversion is the one the Sponsorships page shows, named on the page.
*/
export const FX_RATE = 0.75;
const FX = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * FX_RATE), currency: "GBP" } : null);
function sponsorQuote(k, snap, r) {
  const fmts = specsForKind(k.kind);
  if (!fmts.length) {
    // Photography sells licences, not slots: the record shows what they paid.
    const spec = SPECS[k.kind];
    const year = snap.works.filter((w) => (NOW - Date.parse(w.publishedAt)) / DAY <= 365);
    const pence = year.reduce((t, w) => t + (w.metrics.licence_revenue ?? 0), 0);
    const licences = year.reduce((t, w) => t + (w.metrics.licences ?? 0), 0);
    return { kind: "licences", pence, licences, works: year.length, noun: spec.formats[0].noun };
  }
  const f = fmts[0];
  const metric = f.windowedMetric ? f.windowedMetric[f.priceWindow] : f.metric;
  const units = snap.works
    .filter((w) => (NOW - Date.parse(w.publishedAt)) / DAY >= f.priceWindow)
    .slice(0, 8)
    .map((w) => w.metrics[metric])
    .filter((x) => Number.isFinite(x) && x > 0);
  const { inventory } = inventoryFromStats({ kind: k.kind, audience: snap.account.audience, units, price: null, currency: "GBP", fx: FX, rating: { band: r.band, rating: r.rating }, at: FIXTURE_NOW });
  const items = inventory.items.filter((i) => i.suggestion?.status === "suggested").map((i) => ({ name: i.name, low: i.suggestion.low.amount, high: i.suggestion.high.amount, per: i.suggestion.per, expected: i.suggestion.expected }));
  return { kind: "slots", items, works: units.length, window: f.priceWindow, unit: f.unit };
}

/* The record engine's made-up channel built to disagree: what YouTube estimated against what AdSense paid. */
let REC = null;
function record() {
  if (REC) return REC;
  const nova = suspiciousCreator();
  const lastMonth = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
  const ads = nova.revenue.filter((l) => l.month === lastMonth && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source === "adsense");
  return (REC = { month: lastMonth, estimate: est.gross.amount, paid: paid.gross.amount });
}

/* Selling: the fee schedule and the minimum history, from the market engine. */
export const SELLING = {
  minMonths: MIN_MONTHS,
  tiers: DEFAULT_FEE_SCHEDULE.tiers.map((t) => ({ upTo: t.upTo, pct: t.rateBps / 100 })),
  minimum: DEFAULT_FEE_SCHEDULE.minimum,
};

/* ==================================================================
   The game layer. Two numbers, as a match platform keeps them:
   - the Orbe Rating is performance: signed, zero is typical for your
     size, and it can go down;
   - the Level is progress: craft points that only ever go up.
   Every rule below is data with its one-line explanation, written on
   the page; you.js only draws what these return. The maths underneath
   each line is the engine's own part measure, run on one work, against
   the same provisional priors the rating uses. Rules marked provisional
   are Orbe's own and will change with the seasons.
   ================================================================== */

const round2 = (x) => Math.round(x * 100) / 100;
/** Your own spread: the median distance from your median, scaled to match a standard deviation (1.4826). */
const madSpread = (xs) => { if (xs.length < 2) return 0; const m = median(xs); return 1.4826 * median(xs.map((x) => Math.abs(x - m))); };
const zOf = (part, prior, v) => (part.scale === "log" ? logZ(v, prior.median, prior.sigma) : linearZ(v, prior.median, prior.sigma));
const pctOf = (z) => Math.max(1, Math.min(99, Math.round(normalCdf(z) * 100)));
const hashId = (id) => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

/* ---------------------------------------------------------------- bands */
/** Five percentile bands, 10 / 20 / 40 / 20 / 10. The middle 40% is plain typical and carries no colour. */
export const BANDS = [
  { key: "top", at: 90, word: "Well above typical", short: "Well above" },
  { key: "up", at: 70, word: "Above typical", short: "Above" },
  { key: "mid", at: 30, word: "Typical", short: "Typical" },
  { key: "low", at: 10, word: "A little below typical", short: "A little below" },
  { key: "bottom", at: 0, word: "Below typical", short: "Below" },
];
export const BAND_LINE = "Bands are percentiles: the top 10% is well above typical, the next 20% above, the middle 40% typical, then a little below and below. Below is never red.";
/** Thin data is never called below typical: under this many works to go on, a low reading shows as Typical. */
export const THIN_RULE = { works: 10, line: "With fewer than 10 works to compare with, nothing is called below typical." };
export function bandOf(pct, thin = false) {
  if (pct == null) return { key: "none", word: "Too early to say", short: "Too early" };
  const b = BANDS.find((x) => pct >= x.at);
  return thin && b.at < 30 ? { ...BANDS[2], thinned: true } : b;
}
export const isBelow = (b) => b.key === "low" || b.key === "bottom";

/* ---------------------------------------------------------------- one work's lines */
/*
  - ratio and median parts: the engine's measure on this work alone, against your size band's prior;
  - momentum: the engine's measure with this work as the recent one, against the works before it;
  - hit rate: this work's figure against your own median, scored with the engine's per-work spread;
  - cadence: the engine's cadence measure as it stood on the day this work went out.
  Each line carries a z-score, so its share of the work's rating can be shown and summed.
*/
function workLines(spec, w, same, p, audience, bandKey, thinCreator) {
  const settledOlder = same.filter((x) => x.ageDays > p.ageDays && x.ageDays >= spec.minAgeDays);
  return spec.parts.map((part) => {
    const prior = priorFor(PROVISIONAL_PRIORS, spec, p.format, bandKey, part);
    const type = part.measure.type;
    const line = { key: part.key, name: part.name, weight: part.weight, type, against: "size", z: null, score: null, raw: null, value: null, typical: null, note: "", what: part.what, advice: part.advice, pool: null };
    if (type === "ratio" || type === "median") {
      const got = measurePart(spec, part, [p], same, audience);
      if (got) { line.raw = got.value; line.z = zOf(part, prior, got.value); line.value = formatDisplay(part.display, got.display).value; }
      else line.note = `Too early to say: reads once the ${w.work} is ${part.minAgeDays ?? spec.minAgeDays} days old.`;
      line.typical = `${formatDisplay(part.display, prior.median).value} typical at your size`;
    } else if (type === "momentum") {
      line.against = "own";
      const pool = [p, ...settledOlder.slice(0, part.measure.before)];
      line.pool = pool.length - 1;
      const got = pool.length >= 4 ? measure(spec, { ...part.measure, recent: 1 }, pool, same, audience) : null;
      if (got) { line.raw = got.value; line.z = zOf(part, prior, got.value); line.value = `${formatDisplay(part.display, got.display).value} on the ${pool.length - 1} before it`; }
      else line.note = `Too early to say: needs three earlier ${w.works}.`;
      line.typical = "level with them is typical";
    } else if (type === "hits") {
      line.against = "own";
      const m = part.measure.metric;
      const mine = p.matured[m];
      const others = same.filter((x) => x !== p && x.ageDays >= spec.minAgeDays).slice(0, spec.maxWorks).map((x) => x.matured[m]).filter(Number.isFinite);
      line.pool = others.length;
      if (Number.isFinite(mine) && others.length >= 3) {
        const mult = mine / Math.max(median(others), 1e-9);
        line.raw = mult;
        line.z = clampZ(Math.log(Math.max(mult, 1e-3)) / spec.work.sigma);
        line.hit = mult >= part.measure.multiple;
        line.value = `${times(mult)} your median${line.hit ? ", a hit" : ""}`;
      } else line.note = `Too early to say: needs more ${w.works}.`;
      line.typical = `${part.measure.multiple}× your median makes a hit`;
    } else if (type === "cadence") {
      const then = same.filter((x) => x.ageDays >= p.ageDays).map((x) => ({ ...x, ageDays: x.ageDays - p.ageDays }));
      const got = measure(spec, part.measure, [], then, audience);
      if (got) { line.raw = got.value; line.z = zOf(part, prior, got.value); line.value = `${formatDisplay(part.display, got.display).value} when it went out`; }
      line.typical = `${formatDisplay(part.display, prior.median).value} typical at your size`;
    }
    if (line.z != null) line.score = pctOf(line.z);
    line.thin = thinCreator || (line.against === "own" && (line.pool ?? 0) < THIN_RULE.works);
    line.band = bandOf(line.score, line.thin);
    return line;
  });
}

/**
  Where the result came from: the work's rating is the engine's own formula (twice the weighted mean
  of the parts' z-scores) run on this work's lines, so each line's signed share adds up to it exactly.
*/
export const BREAKDOWN_LINE = "Each line's share is twice its weight times how far it sits from typical; the shares add up to the rating.";
function breakdown(lines) {
  const used = lines.filter((l) => l.z != null);
  const W = used.reduce((t, l) => t + l.weight, 0);
  for (const l of lines) l.contribution = l.z == null || !W ? null : round2(RATING_SCALE * (l.weight / W) * l.z);
  return round2(used.reduce((t, l) => t + l.contribution, 0));
}

/* ---------------------------------------------------------------- against your own usual */
/** The consistency gauge: this work against your own spread, the middle 40% of your own works being on par. */
export const GAUGE_RULE = {
  cut: 0.524, // the 30th and 70th percentiles of a normal curve
  of(z) { return z > this.cut ? "Overperforming" : z < -this.cut ? "Underperforming" : "On par"; },
  line: "Against your own spread: your middle 40% is on par, your top 30% overperforming, your bottom 30% underperforming.",
};

/* ---------------------------------------------------------------- the level: craft points that only go up */
export const LEVEL_RULE = {
  thresholds: [0, 60, 150, 280, 450, 670, 950, 1300, 1750, 2300],
  ship: 10, reflect: 5, experiment: 5,
  /** Beating creators your size: 2 points just above typical, rising to 10 at the 90th percentile. Never negative. */
  beat: (pct) => (pct > 50 ? Math.round(2 + 8 * Math.min(1, (pct - 50) / 40)) : 0),
  /** The nth work in a calendar week: the first three in full, the next two at half, then nothing more. */
  taper: (nth) => (nth <= 3 ? 1 : nth <= 5 ? 0.5 : 0),
  level(pts) { let l = 1; this.thresholds.forEach((t, i) => { if (pts >= t) l = i + 1; }); return l; },
  next(pts) { return this.thresholds.find((t) => t > pts) ?? null; },
  line: "Provisional: craft points only go up. Shipping a work earns 10, a one-line reflection 5, a declared experiment 5, and beating creators your size 2 to 10. A week's first three works count in full, the next two at half, then nothing. No decay, no resets.",
};
/** Badge tiers: a cool palette that warms with level, never red. */
export const LEVEL_TIERS = [{ upTo: 1, tone: "t1" }, { upTo: 3, tone: "t2" }, { upTo: 7, tone: "t3" }, { upTo: 9, tone: "t4" }, { upTo: 10, tone: "t5" }];
export const tierOf = (level) => LEVEL_TIERS.find((t) => level <= t.upTo).tone;

/* ---------------------------------------------------------------- seasons */
export const SEASON_RULE = {
  of(ms) {
    const d = new Date(ms); const q = Math.floor(d.getUTCMonth() / 3);
    return { n: q + 1, year: d.getUTCFullYear(), start: Date.UTC(d.getUTCFullYear(), q * 3, 1), end: Date.UTC(d.getUTCFullYear(), q * 3 + 3, 1) };
  },
  line: "A season is a quarter and closes with the State of the Middle, the seasonal benchmarks for your size. Nothing resets: your level carries over and every season high is kept for good.",
};

/* ---------------------------------------------------------------- the journal, made up for the demo */
/* Reflections and experiments are things a creator writes; these made-up ones are seeded per work. */
const JOURNAL = {
  youtube: {
    experiments: ["The sound first, the explanation after", "A question in the title", "A cold open, no intro", "One shot held for ten seconds"],
    reflections: ["The cold open did the work. Keep it.", "Too long before the first sound. Cut sooner.", "The comments asked where it was. Say it on screen.", "The middle sagged. Trim the second walk."],
  },
  substack: {
    experiments: ["A subject line that asks a question", "One link, high up", "Send at 7am instead of noon", "Open on a quote"],
    reflections: ["The first line carried it. Start with the find.", "Too many links at the bottom.", "Replies wanted more pictures of the pages.", "The postscript got more clicks than the body."],
  },
  twitch: {
    experiments: ["The big moment in the middle, not the start", "A chat poll every hour", "A fixed go-live time", "Raid out to a smaller stream"],
    reflections: ["Chat stayed for the build. Do more of it.", "The first hour dragged. Start with the challenge.", "The poll woke chat up.", "Ended too abruptly. Give a goodbye segment."],
  },
  podcast: {
    experiments: ["Cut the warm-up to one minute", "Say what listeners get in the first minute", "A guest with their own audience", "A title that names the question"],
    reflections: ["The cold open kept people. Keep it.", "The tangent at minute ten lost them.", "Listeners wrote in about the recipe. Do a follow-up.", "Ran long. Two episodes next time."],
  },
  photography: {
    experiments: ["Lead with the strongest frame", "Post at blue hour", "A set with one clear theme", "Licensing link on every frame"],
    reflections: ["The first frame did the work.", "Too many similar frames. Cut to eight.", "Saves came from the quiet frames.", "The caption mattered more than expected."],
  },
};
function journalFor(kind, id, settled) {
  const r = seeded(hashId(id));
  const j = JOURNAL[kind];
  const reflect = settled && r() < 0.6 ? j.reflections[Math.floor(r() * j.reflections.length)] : null;
  const experiment = r() < 0.3 ? j.experiments[Math.floor(r() * j.experiments.length)] : null;
  const triedFocus = r() < 0.25;
  return { reflect, experiment, triedFocus };
}

/* ---------------------------------------------------------------- focus, one at a time */
/** importance × relevance × gap to the next band. Cadence is never a focus: Orbe does not ask anyone to post more often. */
export const FOCUS_RULE = {
  exclude: ["cadence"],
  minRelevance: 1 / 6,
  goals: [10, 30, 70, 90],
  line: "Your focus is the part with the most to gain: its weight in the rating × how often it applies to your work × the gap to the next band. Parts that apply to under a sixth of your works are left out, and so is cadence.",
};
function focusFor(spec, parts, relevance) {
  const out = parts
    .filter((p) => !FOCUS_RULE.exclude.includes(p.key) && (relevance[p.key] ?? 0) >= FOCUS_RULE.minRelevance)
    .map((p) => {
      const part = spec.parts.find((x) => x.key === p.key);
      const goal = FOCUS_RULE.goals.find((g) => g > p.score) ?? null;
      const gap = goal == null ? 0 : goal - p.score;
      return { key: p.key, name: p.name, score: p.score, value: p.value, goal, gap, importance: part.weight, relevance: relevance[p.key], priority: part.weight * relevance[p.key] * gap, advice: part.advice, what: part.what };
    })
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.priority - a.priority || (a.key < b.key ? -1 : 1));
  return { pick: out[0] ?? null, ranked: out };
}

/* ---------------------------------------------------------------- strengths: identities, not awards */
/** A part you hold at Above typical or better earns its name. About a dozen, across the kinds. */
export const STRENGTH_AT = 70;
export const STRENGTHS = {
  reach: { name: "Gets seen", line: "Your work reaches more of your audience than most your size." },
  engagement: { name: "Starts conversations", line: "People answer your work." },
  momentum: { name: "On the rise", line: "Your newest work is running ahead of the work before it." },
  hits: { name: "Hit maker", line: "More of your work breaks out than most." },
  cadence: { name: "Steady hand", line: "A rhythm you keep, without bursts." },
  hold: { name: "Holds the room", line: "Viewers stay after the peak." },
  follows: { name: "Wins followers", line: "Watching turns into following." },
  completion: { name: "Heard to the end", line: "Listeners stay to the last minute." },
  tail: { name: "Evergreen", line: "Your episodes keep finding listeners for weeks." },
  conversion: { name: "Turns readers paid", line: "Readers move to paid more often than most." },
  growth: { name: "Grows the list", line: "Your issues bring in new readers." },
  saves: { name: "Kept and saved", line: "People keep your work to come back to." },
  licensing: { name: "Sells the frame", line: "Your frames get licensed." },
};

/* ---------------------------------------------------------------- the season recap identity */
/** Drawn from your best line this season. Always flattering, always true: the fallback names what you did. */
export const IDENTITY_AT = 55;
export const IDENTITIES = {
  reach: "The Headliner", engagement: "The Conversation Starter", momentum: "The Climber", hits: "The Hit Maker",
  cadence: "The Steady Hand", hold: "The Room Holder", follows: "The Recruiter", completion: "The Finisher",
  tail: "The Evergreen", conversion: "The Closer", growth: "The Grower", saves: "The Keeper", licensing: "The Seller",
};
export const IDENTITY_FALLBACK = "The Regular";

/* ---------------------------------------------------------------- the monthly mission */
/** Five craft steps, any order, the same for every creator. Never a reach target. */
export const PACING_LINE = "None of these asks you to post more. One work this month can clear all five, and a month off costs nothing: unfinished steps simply lapse.";
export const MISSION = {
  name: (ms) => `${new Date(ms).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} mission`,
  steps: [
    { key: "ship", title: (x) => `Ship one ${x.w.work}, at your usual pace`, check: (x, wk) => wk && `“${wk.title}” went out on ${dayName(wk.at)}.` },
    { key: "reflect", title: () => "Write a one-line reflection on a work report", check: (x, wk) => wk?.journal.reflect && `On “${wk.title}”: “${wk.journal.reflect}”` },
    { key: "experiment", title: () => "Declare an experiment before you post", check: (x, wk) => wk?.journal.experiment && `On “${wk.title}”: ${wk.journal.experiment.toLowerCase()}.` },
    { key: "focus", title: (x) => `Try your focus tip on one ${x.w.work}`, check: (x, wk) => wk?.journal.triedFocus && `You tagged “${wk.title}”.`, tagged: true },
    { key: "revisit", title: (x) => `Give an older ${x.w.work} a second life: a new title, a re-cut or a re-share`, check: () => null, tagged: true },
  ],
};

/* ---------------------------------------------------------------- awards for a single work */
export const AWARD_LIMIT = 3;
const NEXT_FOR = {
  reach: (x) => `Before the next ${x.w.work}, put its title and first frame next to this one's. Reuse the pattern, not the topic.`,
  engagement: (x) => `People answered this one. End the next ${x.w.work} with the same kind of question.`,
};
const atLeastAbove = (l) => l.band.key === "top" || l.band.key === "up";
export const AWARDS = [
  {
    id: "record",
    test: (x) => x.record && {
      name: `Holds your record: ${x.record.label}`,
      why: `${count(x.record.value)}${x.record.previous != null ? `, past your previous best of ${count(x.record.previous)}` : ""}.`,
      next: `Records fall to repeats of what worked. Write down what was different about this ${x.w.work} before you plan the next.`,
    },
  },
  {
    id: "beat",
    test: (x) => x.multiple >= 1.5 && {
      name: `Beat your typical by ${times(x.multiple)}`,
      why: `${count(x.primary)} ${x.w.unit} against your typical ${count(x.typical)}.`,
      next: `Make the follow-up while it is warm: the same premise from a new angle, within a couple of ${x.w.works}.`,
    },
  },
  {
    id: "best-of",
    test: (x) => x.bestOf && {
      name: `Best ${x.bestOf.name.toLowerCase()} in ${x.of} ${x.w.works}`,
      why: `${x.bestOf.value}, the highest of your last ${x.of}.`,
      next: (NEXT_FOR[x.bestOf.key] ?? ((y) => `Your ${x.bestOf.name.toLowerCase()} peaked here. Name the one thing you did differently and do it on purpose next ${y.w.work}.`))(x),
    },
  },
  {
    // Every scored line must be Above typical or better. One typical or weak line and it does not fire.
    id: "all-above",
    test: (x) => x.scored.length >= 3 && x.scored.every(atLeastAbove) && {
      name: "Above typical on every line",
      why: `All ${x.scored.length} lines are above typical; the lowest was ${x.lowest.name.toLowerCase()} at ${x.lowest.score} in 100.`,
      next: "Nothing to fix here. Keep the format and spend the next idea on the premise.",
    },
  },
  {
    // Only when nothing else was earned, and only for a work at or above your own typical.
    id: "floor", fallback: true,
    test: (x) => x.multiple >= 1 && x.multiple < 1.5 && x.ownRating >= 0 && {
      name: "At or above your typical",
      why: `${times(x.multiple)} your typical ${x.w.work}.`,
      next: "Floors are what grow. Keep the rhythm that got you here and try one new thing at a time.",
    },
  },
];

/* ---------------------------------------------------------------- top moments, made up until the API */
const MOMENT_AXIS = {
  youtube: { n: 30, unit: "still watching" },
  twitch: { n: 30, unit: "of the peak watching" },
  podcast: { n: 30, unit: "still listening" },
  substack: { n: 20, unit: "still reading", label: (f) => `${Math.round(f * 100)}% down` },
  photography: { n: 12, unit: "stopped on it", frames: true, label: (f, i) => `Frame ${i + 1}` },
};
export const clock = (sec) => { const s = Math.round(sec); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`; };
/** Moments are picked against this work's own average, so a calm work still gets its best parts. */
function madeUpMoments(kind, seed, durationSec) {
  const ax = MOMENT_AXIS[kind];
  const rand = seeded(seed);
  const pts = [];
  let v = 100;
  for (let i = 0; i < ax.n; i++) {
    if (ax.frames) pts.push(Math.round(25 + rand() * 60));
    else { pts.push(Math.round(v)); v = Math.min(96, Math.max(8, v * (0.93 + rand() * 0.05) + (rand() > 0.82 ? 6 + rand() * 6 : 0))); }
  }
  const avg = pts.reduce((t, y) => t + y, 0) / pts.length;
  // A moment is where the work held people above its own curve (the average of its neighbours), or for
  // frames, the frames people stopped on most against the set's own average. Three, spread apart.
  const near = (i) => { const xs = pts.slice(Math.max(0, i - 3), i + 4).filter((_, k, a) => a.length && k !== Math.min(3, i)); return xs.reduce((t, y) => t + y, 0) / xs.length; };
  const lifts = pts.map((y, i) => ({ i, lift: ax.frames ? y - avg : y - near(i) }))
    .filter((m) => ax.frames || m.i > 0)
    .sort((a, b) => b.lift - a.lift || a.i - b.i)
    .reduce((got, m) => (got.length < 3 && got.every((g) => Math.abs(g.i - m.i) >= ax.n / 6) ? [...got, m] : got), [])
    .sort((a, b) => a.i - b.i);
  const label = (f, i) => (ax.label ? ax.label(f, i) : clock(f * (durationSec || 900)));
  return { pts, unit: ax.unit, frames: !!ax.frames, avg: Math.round(avg), top: lifts.map((m) => { const f = m.i / (ax.n - 1); return { i: m.i, f, at: label(f, m.i), y: pts[m.i], lift: Math.round(m.lift) }; }) };
}

/* ---------------------------------------------------------------- media */
/*
  Every creator here is made up, so every picture, clip and sound is generated in the browser
  (./you-media.js) and labelled Made up. For a real creator the same player takes the video IDs and
  feed URLs already in their export: the YouTube embedded player and thumbnails, and the podcast
  feed's audio enclosure. That path is below, data-driven, and switched off in the demo.
*/
export const REAL_MEDIA = false;
export const MEDIA_LINE = "For a real creator this uses the video IDs and feed URLs already in their export: the YouTube embedded player and its thumbnails, and the podcast feed's audio.";
export const MEDIA_SOURCES = {
  youtube: (w) => w.youtubeId && { type: "embed", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(w.youtubeId)}?enablejsapi=1`, thumb: `https://i.ytimg.com/vi/${encodeURIComponent(w.youtubeId)}/hqdefault.jpg`, seek: (sec) => `&start=${Math.floor(sec)}` },
  podcast: (w) => w.enclosureUrl && { type: "audio", src: w.enclosureUrl },
};
const PLAYER = { youtube: "video", twitch: "video", podcast: "audio", photography: "image", substack: "issue" };
export function mediaFor(kind, work, seed) {
  const real = REAL_MEDIA && MEDIA_SOURCES[kind]?.(work);
  return { player: PLAYER[kind], kind, seed, durationSec: work.durationSec || 0, clipSec: 24, real: real || null };
}

/* ---------------------------------------------------------------- the whole layer, for one creator */
function isoWeek(ms) { const d = new Date(ms); const day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); }

function game(k, spec, w, snap, r, band, sizeBand, best, last) {
  const audience = snap.account.audience;
  const prepared = prepare(spec, snap.works, NOW);
  const own = new Map(rateWorks(snap, FIXTURE_NOW).map((x) => [x.workId, x]));
  const settledAll = prepared.filter((p) => p.ageDays >= spec.minAgeDays);
  const thinCreator = settledAll.length < THIN_RULE.works;

  // Your own spread, per format: how far your works usually sit from your own median.
  const spread = {};
  for (const f of new Set(prepared.map((p) => p.format))) {
    const logs = settledAll.filter((p) => p.format === f).map((p) => own.get(p.work.id)).filter(Boolean).map((x) => Math.log(Math.max(x.multiple, 1e-3)));
    spread[f] = Math.max(madSpread(logs), 0.1);
  }

  const works = prepared.map((p) => {
    const same = prepared.filter((x) => x.format === p.format);
    const lines = workLines(spec, w, same, p, audience, band.key, thinCreator);
    const settled = p.ageDays >= spec.minAgeDays;
    const rating = settled ? breakdown(lines) : null;
    const o = own.get(p.work.id);
    const zOwn = o ? Math.log(Math.max(o.multiple, 1e-3)) / spread[p.format] : null;
    const pct = rating == null ? null : pctOf(rating / RATING_SCALE);
    return {
      id: p.work.id, title: p.work.title, at: Date.parse(p.work.publishedAt), ageDays: p.ageDays, p, lines, settled,
      rating, pct, band: bandOf(pct, thinCreator && pct != null && pct < 30),
      multiple: o?.multiple ?? null, ownRating: o?.rating ?? null, zOwn, gauge: zOwn == null ? null : GAUGE_RULE.of(zOwn),
      journal: journalFor(k.kind, p.work.id, settled),
    };
  });
  const byWork = new Map(works.map((x) => [x.id, x]));

  // Craft points: replayed oldest first, never subtracted, tapered by the work's place in its week.
  let pts = 0;
  const weekCount = new Map();
  for (const x of [...works].sort((a, b) => a.at - b.at)) {
    const wk = isoWeek(x.at);
    const nth = (weekCount.get(wk) ?? 0) + 1;
    weekCount.set(wk, nth);
    const t = LEVEL_RULE.taper(nth);
    const cp = {
      nth, taper: t,
      ship: Math.round(LEVEL_RULE.ship * t),
      reflect: x.journal.reflect ? Math.round(LEVEL_RULE.reflect * t) : 0,
      experiment: x.journal.experiment ? Math.round(LEVEL_RULE.experiment * t) : 0,
      beat: x.pct == null ? 0 : LEVEL_RULE.beat(x.pct),
    };
    cp.total = cp.ship + cp.reflect + cp.experiment + cp.beat;
    cp.before = pts;
    pts += cp.total;
    cp.after = pts;
    x.cp = cp;
  }
  const newest = [...works].sort((a, b) => b.at - a.at)[0];
  const lv = LEVEL_RULE.level(pts);
  const next = LEVEL_RULE.next(pts);
  const level = {
    points: pts, level: lv, tone: tierOf(lv), next, from: LEVEL_RULE.thresholds[lv - 1],
    last: newest && { id: newest.id, title: newest.title, cp: newest.cp.total, settled: newest.settled },
  };

  // Seasons: chapters, never resets. Season highs are kept for good.
  const seasons = [];
  for (const x of [...works].sort((a, b) => a.at - b.at)) {
    const s = SEASON_RULE.of(x.at);
    let row = seasons.find((y) => y.start === s.start);
    if (!row) { row = { ...s, works: [], startPoints: x.cp.before }; seasons.push(row); }
    row.works.push(x);
    row.endPoints = x.cp.after;
  }
  for (const s of seasons) {
    const rated = s.works.filter((x) => x.rating != null);
    s.count = s.works.length;
    s.median = rated.length ? round2(median(rated.map((x) => x.rating))) : null;
    s.high = rated.reduce((a, x) => (!a || x.rating > a.rating ? x : a), null);
    s.levelsGained = LEVEL_RULE.level(s.endPoints) - LEVEL_RULE.level(s.startPoints);
    s.cp = s.endPoints - s.startPoints;
  }
  const nowS = SEASON_RULE.of(NOW);
  const current = seasons.find((s) => s.start === nowS.start) ?? { ...nowS, works: [], count: 0, median: null, high: null, levelsGained: 0, cp: 0 };
  const pastFull = seasons.filter((s) => s.start !== nowS.start && s.median != null && s.works.filter((x) => x.rating != null).length >= 3);
  const bestSeason = pastFull.reduce((a, s) => (!a || s.median > a.median ? s : a), null);

  // The recap identity, from your best line this season.
  const seasonRated = current.works.filter((x) => x.settled);
  const lineMedians = spec.parts.map((part) => {
    const xs = seasonRated.map((x) => x.lines.find((l) => l.key === part.key)?.score).filter((v) => v != null);
    return { key: part.key, name: part.name, median: xs.length ? Math.round(median(xs)) : null, n: xs.length };
  }).filter((x) => x.median != null);
  const topLine = lineMedians.reduce((a, x) => (!a || x.median > a.median ? x : a), null);
  const identity = topLine && topLine.median >= IDENTITY_AT
    ? { name: IDENTITIES[topLine.key], key: topLine.key, line: `Your ${topLine.name.toLowerCase()} beat ${topLine.median} in 100 on a typical ${w.work} this season, your best line.` }
    : { name: IDENTITY_FALLBACK, key: null, line: `${current.count} ${current.count === 1 ? w.work : w.works} out this season, at your own pace.` };
  const season = {
    n: nowS.n, year: nowS.year, start: nowS.start, end: nowS.end, daysLeft: Math.ceil((nowS.end - NOW) / DAY),
    works: current.count, high: current.high && { id: current.high.id, title: current.high.title, rating: current.high.rating },
    median: current.median, levelsGained: current.levelsGained, cp: current.cp, identity, topLine,
    best: bestSeason && { n: bestSeason.n, year: bestSeason.year, median: bestSeason.median, count: bestSeason.count, high: bestSeason.high && { id: bestSeason.high.id, title: bestSeason.high.title, rating: bestSeason.high.rating } },
    all: seasons.map((s) => ({ n: s.n, year: s.year, count: s.count, median: s.median, high: s.high && { id: s.high.id, title: s.high.title, rating: s.high.rating }, current: s.start === nowS.start, best: s === bestSeason })),
  };

  // Focus: one at a time, with a cheer when the last one was met.
  const relevance = {};
  for (const part of spec.parts) relevance[part.key] = settledAll.length ? works.filter((x) => x.settled && x.lines.find((l) => l.key === part.key)?.score != null).length / works.filter((x) => x.settled).length : 0;
  const nowFocus = focusFor(spec, r.parts, relevance);
  const thenFocus = last.status === "rated" ? focusFor(spec, last.parts, relevance).pick : null;
  let cheer = null;
  if (thenFocus && nowFocus.pick && thenFocus.key !== nowFocus.pick.key) {
    const nowScore = r.parts.find((p) => p.key === thenFocus.key)?.score;
    if (nowScore != null && nowScore >= thenFocus.goal) cheer = { name: thenFocus.name, from: thenFocus.score, to: nowScore, goal: thenFocus.goal };
  }
  const focusArea = nowFocus.pick && { ...nowFocus.pick, band: bandOf(nowFocus.pick.score), goalBand: bandOf(nowFocus.pick.goal), ranked: nowFocus.ranked, cheer };

  const strengths = r.parts.filter((p) => p.score >= STRENGTH_AT && STRENGTHS[p.key]).sort((a, b) => b.score - a.score).map((p) => ({ key: p.key, score: p.score, ...STRENGTHS[p.key] }));

  // Recent form: your last five works against your last thirty, line by line.
  const settledNewest = works.filter((x) => x.settled).sort((a, b) => a.ageDays - b.ageDays);
  const last5 = settledNewest.slice(0, 5), last30 = settledNewest.slice(0, 30);
  const form = spec.parts.map((part) => {
    const med = (xs) => { const v = xs.map((x) => x.lines.find((l) => l.key === part.key)?.score).filter((s) => s != null); return v.length ? Math.round(median(v)) : null; };
    const a = med(last5), b = med(last30);
    return { key: part.key, name: part.name, recent: a, usual: b, delta: a == null || b == null ? null : a - b };
  });

  // This month's mission.
  const monthStart = Date.UTC(new Date(NOW).getUTCFullYear(), new Date(NOW).getUTCMonth(), 1);
  const monthEnd = Date.UTC(new Date(NOW).getUTCFullYear(), new Date(NOW).getUTCMonth() + 1, 1);
  const inMonth = works.filter((x) => x.at >= monthStart).sort((a, b) => b.at - a.at);
  const mx = { w };
  const mission = {
    name: MISSION.name(NOW), daysLeft: Math.ceil((monthEnd - NOW) / DAY),
    steps: MISSION.steps.map((st) => {
      let done = null;
      for (const wk of inMonth) { const why = st.check(mx, wk); if (why) { done = { id: wk.id, why }; break; } }
      return { key: st.key, title: st.title(mx), done, tagged: !!st.tagged };
    }),
  };

  return { workList: works, byWork, level, season, focusArea, strengths, form, mission, recentSettled: last5.map((x) => x.id), thinCreator, primaryKey: spec.work.primary };
}

/* ---------------------------------------------------------------- one work's report */
export function workReport(c, id) {
  const x = c.byWork.get(id);
  if (!x) return null;
  const { spec, w } = c;
  const p = x.p;
  const recent12 = c.recent.map((r) => c.byWork.get(r.id)).filter(Boolean);
  const inRecent = recent12.some((y) => y.id === id);
  const ranked = [...recent12].sort((a, b) => b.rating - a.rating);
  const rank = inRecent ? ranked.findIndex((y) => y.id === id) + 1 : null;
  const primary = p.matured[spec.work.primary];
  const typical = x.multiple ? primary / x.multiple : null;
  const scored = x.lines.filter((l) => l.score != null);
  const mvp = scored.reduce((a, l) => (!a || l.score > a.score ? l : a), null);
  const lowest = scored.reduce((a, l) => (!a || l.score < a.score ? l : a), null);
  const held = lowest && lowest.score < 50 && lowest !== mvp ? lowest : null;
  const sizeLines = x.lines.filter((l) => l.against === "size" && l.score != null && (l.type === "ratio" || l.type === "median"));

  let bestOf = null;
  if (inRecent && recent12.length >= 4) for (const l of sizeLines) {
    const others = recent12.filter((y) => y.id !== id).map((y) => y.lines.find((z) => z.key === l.key)?.raw).filter((v) => v != null);
    if (others.length >= 3 && others.every((v) => l.raw > v) && (!bestOf || l.score > bestOf.score)) bestOf = l;
  }
  const holders = new Map();
  for (const e of personalBests(c.snap, { includeBaseline: true })) holders.set(e.metric, e);
  let record = null;
  for (const [metric, e] of holders) if (e.workId === id) {
    const rec = spec.records.find((y) => recordMetric(y) === metric);
    const unit = spec.metrics.find((m) => m.key === metric.split("@")[0])?.unit ?? "count";
    if (unit === "count" && rec) { record = { label: rec.label, value: e.value, previous: e.previous }; break; }
  }
  const ax = { w, peers: c.peers, multiple: x.multiple ?? 0, ownRating: x.ownRating ?? 0, primary, typical, bestOf, of: recent12.length, record, sizeLines, scored, lowest };
  const earned = AWARDS.filter((a) => !a.fallback).map((a) => { const got = a.test(ax); return got ? { id: a.id, ...got } : null; }).filter(Boolean);
  const awards = (earned.length ? earned : AWARDS.filter((a) => a.fallback).map((a) => { const got = a.test(ax); return got ? { id: a.id, ...got } : null; }).filter(Boolean)).slice(0, AWARD_LIMIT);

  const metric = spec.metrics.find((m) => m.key === spec.work.primary);
  const firstWeek = metric.maturity && typical ? [1 / 24, 1, 7].map((age) => {
    const share = maturedShare(metric.maturity, age);
    return { age, label: age < 1 ? "1 hour" : age === 1 ? "1 day" : "7 days", you: primary * share, usual: typical * share, reached: p.ageDays >= age };
  }) : null;

  const next = [];
  if (held) next.push({ title: `Fix ${held.name.toLowerCase()} first`, body: held.advice, why: `${held.name} beat ${held.score} in 100 here (${held.value}), this ${w.work}'s weakest line.` });
  if (mvp) next.push(x.multiple >= 1.5
    ? { title: `Make the sequel to “${x.title}”`, body: `It did ${times(x.multiple)} your typical, led by ${mvp.name.toLowerCase()}. Borrow the premise while it is fresh.`, why: `${mvp.name} was this ${w.work}'s best line: ${mvp.value}.` }
    : { title: `Keep ${mvp.name.toLowerCase()}`, body: `${mvp.value}, beating ${mvp.score} in 100. ${held ? `Keep that while you fix ${held.name.toLowerCase()}.` : "Whatever you did here, do it on purpose next time."}`, why: `${mvp.name} was this ${w.work}'s best line.` });

  const idx = recent12.findIndex((y) => y.id === id);
  const seed = hashId(id);
  return {
    id, title: x.title, on: dayName(x.at), ageDays: x.ageDays, settled: x.settled,
    rating: x.rating, signed: x.rating == null ? "n/a" : minus(signed(x.rating)), pct: x.pct, band: x.band,
    multiple: x.multiple, gauge: x.gauge, zOwn: x.zOwn, gaugePos: x.zOwn == null ? null : normalCdf(Math.max(-3, Math.min(3, x.zOwn))), primary, typical, unit: w.unit,
    rank, of: recent12.length, cp: x.cp, journal: x.journal,
    lines: x.lines, mvp: mvp?.key ?? null, held: held?.key ?? null,
    firstWeek, awards,
    moments: madeUpMoments(c.k.kind, seed % 100000, p.work.durationSec),
    media: mediaFor(c.k.kind, p.work, seed),
    next: next.slice(0, 2),
    older: idx > 0 ? recent12[idx - 1].id : null, newer: idx >= 0 && idx < recent12.length - 1 ? recent12[idx + 1].id : null,
    shareLine: `${c.k.name}: “${x.title}” rated ${x.rating == null ? "n/a" : minus(signed(x.rating))} ${c.against}, ${x.band.word.toLowerCase()}. ${RATING_LABEL}.`,
  };
}

/** Which made-up creator a work belongs to, from its id. */
export const kindOfWork = (id) => KINDS.find((k) => String(id).startsWith(`wk_fixture_${k.kind}_`))?.key ?? null;
/** A stable seed for a work's generated pictures and sound. */
export const seedOf = hashId;
