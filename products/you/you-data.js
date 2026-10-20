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
import { logZ, linearZ, normalCdf, median } from "../../assets/engine/rating/stats.js";
import { bandFor, RATING_SCALE } from "../../assets/engine/rating/rate.js";
import { seeded } from "../../assets/engine/rating/fixtures.js";
import { scaleSnapshot } from "../../assets/engine/rating/fixtures.js";
import { formatDisplay } from "../../assets/engine/rating/format.js";
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
  const shareLine = `${k.name}: “${best.work.title}” did ${times(best.multiple)} my typical ${w.work}. Rated ${minus(signed(r.rating))}, ${r.band}, against ${spec.peers} my size. ${RATING_LABEL}.`;

  return {
    k, spec, w, r, sizeBand, band: band.label, peers: spec.peers,
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
    snap, ...game(k, spec, w, snap, r, band, sizeBand, focus, best, byId),
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
   The game layer: a report for every work, levels, seasons, weekly
   challenges and (opt-in, coming) rivals. Every rule lives here as
   data, with its one-line explanation; you.js only draws what these
   return. The maths underneath is the engine's: each stat line is the
   engine's own part measure, run on one work, against the same
   provisional priors the rating uses. Rules marked provisional are
   Orbe's own, written on the page, and will change with the seasons.
   ================================================================== */

/** How a stat line is coloured: the thresholds the page uses everywhere (beats more than 55 in 100, fewer than 45). */
export const LINE_RULE = { better: 55, worse: 45 };
export const verdictOf = (score) => (score == null ? "none" : score > LINE_RULE.better ? "better" : score < LINE_RULE.worse ? "worse" : "typical");
export const VERDICT_WORDS = { better: "Better than typical", typical: "Typical", worse: "Below typical", none: "Not yet" };

const zOf = (part, prior, v) => (part.scale === "log" ? logZ(v, prior.median, prior.sigma) : linearZ(v, prior.median, prior.sigma));
const pctOf = (z) => Math.max(1, Math.min(99, Math.round(normalCdf(z) * 100)));

/*
  One line per part of the rating, for one work.
  - ratio and median parts: the engine's measure on this work alone, against your size band's prior.
  - momentum: the engine's measure with this work as the "recent" one, against the works before it.
  - hit rate: this work's figure against your own median, ranked among your own works.
  - cadence: the engine's cadence measure as it stood on the day this work went out.
*/
function workLines(spec, w, same, p, audience, bandKey) {
  const settledOlder = same.filter((x) => x.ageDays > p.ageDays && x.ageDays >= spec.minAgeDays);
  return spec.parts.map((part) => {
    const prior = priorFor(PROVISIONAL_PRIORS, spec, p.format, bandKey, part);
    const type = part.measure.type;
    const line = { key: part.key, name: part.name, weight: part.weight, type, against: "size", score: null, raw: null, value: null, typical: null, note: "", what: part.what, advice: part.advice };
    if (type === "ratio" || type === "median") {
      const got = measurePart(spec, part, [p], same, audience);
      if (got) { line.raw = got.value; line.score = pctOf(zOf(part, prior, got.value)); line.value = formatDisplay(part.display, got.display).value; }
      else line.note = `Reads once the ${w.work} is ${part.minAgeDays ?? spec.minAgeDays} days old.`;
      line.typical = `${formatDisplay(part.display, prior.median).value} typical at your size`;
    } else if (type === "momentum") {
      line.against = "own";
      const pool = [p, ...settledOlder.slice(0, part.measure.before)];
      const got = pool.length >= 4 ? measure(spec, { ...part.measure, recent: 1 }, pool, same, audience) : null;
      if (got) { line.raw = got.value; line.score = pctOf(zOf(part, prior, got.value)); line.value = `${formatDisplay(part.display, got.display).value} on the ${pool.length - 1} before it`; }
      else line.note = `Needs three earlier ${w.works} to compare with.`;
      line.typical = "where level with them is typical";
    } else if (type === "hits") {
      line.against = "own";
      const m = part.measure.metric;
      const mine = p.matured[m];
      const others = same.filter((x) => x !== p && x.ageDays >= spec.minAgeDays).slice(0, spec.maxWorks).map((x) => x.matured[m]).filter(Number.isFinite);
      if (Number.isFinite(mine) && others.length >= 3) {
        const mult = mine / Math.max(median(others), 1e-9);
        line.raw = mult;
        line.score = Math.max(1, Math.min(99, Math.round((100 * others.filter((v) => v < mine).length) / others.length)));
        line.hit = mult >= part.measure.multiple;
        line.value = `${times(mult)} your median${line.hit ? ", a hit" : ""}`;
      } else line.note = `Needs more ${w.works} to compare with.`;
      line.typical = `${part.measure.multiple}× your median makes a hit`;
    } else if (type === "cadence") {
      const then = same.filter((x) => x.ageDays >= p.ageDays).map((x) => ({ ...x, ageDays: x.ageDays - p.ageDays }));
      const got = measure(spec, part.measure, [], then, audience);
      if (got) { line.raw = got.value; line.score = pctOf(zOf(part, prior, got.value)); line.value = `${formatDisplay(part.display, got.display).value} when it went out`; }
      line.typical = `${formatDisplay(part.display, prior.median).value} typical at your size`;
    }
    line.verdict = verdictOf(line.score);
    return line;
  });
}

/* ---------------------------------------------------------------- levels */
/** Levels 1 to 10, shaped like a match rating: you gain or lose points by how a work did against what your level expects. */
export const LEVEL_RULE = {
  start: 500, perLevel: 100, top: 10, cap: 30, floor: 0, ceiling: 999,
  level: (pts) => Math.min(10, Math.floor(pts / 100) + 1),
  expects: (pts) => Math.round(pts / 10),
  move(score, pts) { return Math.max(-this.cap, Math.min(this.cap, Math.round(score - pts / 10))); },
  /** A work's score, 0 to 100: half against your own typical (the engine's work rating), half against your size (its stat lines, weighted as the rating weights them). */
  score(rating, lines) {
    const own = pctOf(rating / RATING_SCALE);
    const sized = lines.filter((l) => l.against === "size" && l.score != null);
    const wt = sized.reduce((t, l) => t + l.weight, 0);
    const size = wt ? Math.round(sized.reduce((t, l) => t + l.weight * l.score, 0) / wt) : own;
    return { own, size, score: Math.round((own + size) / 2) };
  },
  line: "Provisional rule: each released work scores 0 to 100 (half against your typical, half against your size) and moves your points by that score minus a tenth of your points, 30 at most. 100 points a level; weeks off never cost.",
};

/* ---------------------------------------------------------------- seasons */
export const SEASON_RULE = {
  resetShare: 0.25,
  of(ms) {
    const d = new Date(ms); const q = Math.floor(d.getUTCMonth() / 3);
    return { n: q + 1, year: d.getUTCFullYear(), start: Date.UTC(d.getUTCFullYear(), q * 3, 1), end: Date.UTC(d.getUTCFullYear(), q * 3 + 3, 1) };
  },
  reset(pts) { return Math.round(pts - (pts - LEVEL_RULE.start) * this.resetShare); },
  line: "Provisional: a season is a quarter, closing with the State of the Middle; on day one your points move a quarter of the way back to 500.",
};

/* ---------------------------------------------------------------- awards */
/** Two or three at most, in this order of priority. Each has a real rule, says why, and points at a next step. */
export const AWARD_LIMIT = 3;
const NEXT_FOR = {
  reach: (x) => `Before the next ${x.w.work}, put its title and first frame next to this one's. Reuse the pattern, not the topic.`,
  engagement: (x) => `People answered this one. End the next ${x.w.work} with the same kind of question.`,
};
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
    // Every scored line, against your size and against your own, must be in the "better" band. One weak line and it does not fire.
    id: "all-above",
    test: (x) => x.scored.length >= 3 && x.scored.every((l) => l.score > LINE_RULE.better) && {
      name: "Better than typical on every line",
      why: `All ${x.scored.length} lines beat more than ${LINE_RULE.better} in 100; the lowest was ${x.lowest.name.toLowerCase()} at ${x.lowest.score}.`,
      next: "Nothing to fix here. Keep the format and spend the next idea on the premise.",
    },
  },
  {
    // Only when nothing else was earned: something true to say about a steady work.
    id: "floor", fallback: true,
    test: (x) => x.multiple >= 1 && x.multiple < 1.5 && x.rating >= 0 && {
      name: "At or above your typical",
      why: `${times(x.multiple)} your typical ${x.w.work}, rated ${minus(signed(x.rating))} against your own median.`,
      next: "Floors are what grow. Keep the rhythm that got you here and try one new thing at a time.",
    },
  },
];

/* ---------------------------------------------------------------- challenges */
/** Three a week: two from your weakest parts, one from your best work. None asks you to post more. */
export const PACING_LINE = "None of these asks you to post more. One work at your usual pace can clear all three, and a week off pauses the clock without costing a point.";
const TITLE_WORD = { youtube: "title", substack: "subject line", podcast: "title", twitch: "stream title" };
export const CHALLENGES = {
  // Packaging is the lever for reach: a short title is read whole on a phone.
  reach: {
    when: (x) => TITLE_WORD[x.kind],
    title: (x) => `Try a ${TITLE_WORD[x.kind]} under 50 characters on your next ${x.w.work}`,
    tip: (x) => `Reach is ${x.lever === "reach" ? "your lowest part" : "one of your lower parts"}, and short ${TITLE_WORD[x.kind]}s are read whole on a phone.`,
    check: (x, wk) => wk.title.length < 50 && `“${wk.title}” is ${wk.title.length} characters.`,
  },
  // Any other part: one work above typical for your size on that line.
  part: {
    title: (x, part) => `Get ${part.name.toLowerCase()} above typical for your size on one ${x.w.work}`,
    tip: (x, part) => part.advice,
    check: (x, wk, part) => { const l = wk.lines.find((y) => y.key === part.key); return l?.score != null && l.score > 50 && `“${wk.title}”: ${l.value}, beats ${l.score} in 100.`; },
  },
  followup: {
    title: (x) => `Post a follow-up to “${x.best.title}” within 7 days`,
    tip: (x) => `It did ${times(x.best.multiple)} your typical. Hits come from ideas, so the next one borrows its premise.`,
    // You tag the follow-up when you post it; Orbe checks the date. Nothing is tagged in the demo.
    check: (x, wk) => wk.followUpOf === x.best.id && `“${wk.title}” is tagged as the follow-up.`,
    tagged: true,
  },
};

/* ---------------------------------------------------------------- top moments */
/** Retention needs the platform's analytics, which arrive with the API. Until then the report shows a made-up shape, labelled. */
const MOMENT_AXIS = {
  youtube: { n: 30, label: (i, n, d) => clock((i / n) * d), unit: "still watching" },
  podcast: { n: 30, label: (i, n, d) => clock((i / n) * d), unit: "still listening" },
  twitch: { n: 30, label: (i, n, d) => clock((i / n) * d), unit: "of the peak watching" },
  substack: { n: 20, label: (i, n) => `${Math.round((i / n) * 100)}% down`, unit: "still reading" },
  photography: { n: 12, label: (i) => `frame ${i + 1}`, unit: "stopped on it", frames: true },
};
const clock = (sec) => { const s = Math.round(sec); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`; };
function madeUpMoments(kind, seed, durationSec) {
  const ax = MOMENT_AXIS[kind];
  const rand = seeded(seed);
  const pts = [];
  let v = 100;
  for (let i = 0; i < ax.n; i++) {
    if (ax.frames) pts.push(Math.round(25 + rand() * 60));
    else { pts.push(Math.round(v)); v = Math.min(96, Math.max(8, v * (0.93 + rand() * 0.05) + (rand() > 0.82 ? 6 + rand() * 6 : 0))); }
  }
  // A moment is where the line rose, or for frames the frames people stopped on most.
  const lifts = pts.map((y, i) => ({ i, lift: ax.frames ? y : i ? y - pts[i - 1] : -1 })).filter((m) => ax.frames || (m.i > 0 && m.lift > 0)).sort((a, b) => b.lift - a.lift).reduce((got, m) => (got.length < 3 && got.every((g) => Math.abs(g.i - m.i) >= ax.n / 6) ? [...got, m] : got), []).sort((a, b) => a.i - b.i);
  return { pts, unit: ax.unit, frames: !!ax.frames, top: lifts.map((m) => ({ i: m.i, at: ax.label(m.i, ax.n, durationSec || 900), y: pts[m.i], lift: m.lift })) };
}

/* ---------------------------------------------------------------- the whole layer, for one creator */
function game(k, spec, w, snap, r, band, sizeBand, focus, best, byId) {
  const audience = snap.account.audience;
  const prepared = prepare(spec, snap.works, NOW);
  const rated = new Map(rateWorks(snap, FIXTURE_NOW).map((x) => [x.workId, x]));
  const primary = spec.work.primary;

  // Every work, with its lines and its score.
  const works = prepared.map((p) => {
    const same = prepared.filter((x) => x.format === p.format);
    const lines = workLines(spec, w, same, p, audience, band.key);
    const rr = rated.get(p.work.id);
    const settled = p.ageDays >= spec.minAgeDays;
    return {
      id: p.work.id, title: p.work.title, at: Date.parse(p.work.publishedAt), ageDays: p.ageDays, p, lines, settled,
      rating: rr?.rating ?? null, multiple: rr?.multiple ?? null,
      band: rr ? bandFor(rr.rating) : null,
      ...(rr ? LEVEL_RULE.score(rr.rating, lines) : { own: null, size: null, score: null }),
    };
  });
  const byWork = new Map(works.map((x) => [x.id, x]));

  // Levels and seasons: replay every settled work oldest first, resetting lightly at each season's first day.
  const events = works.filter((x) => x.settled && x.score != null).sort((a, b) => a.at - b.at);
  let pts = LEVEL_RULE.start;
  let season = events.length ? SEASON_RULE.of(events[0].at) : SEASON_RULE.of(NOW);
  const history = [];
  const resets = [];
  const settle = (until) => {
    while (season.end <= until) { const before = pts; season = SEASON_RULE.of(season.end); pts = SEASON_RULE.reset(pts); resets.push({ at: season.start, before, after: pts }); }
  };
  for (const e of events) {
    settle(e.at);
    const move = LEVEL_RULE.move(e.score, pts);
    const before = pts;
    pts = Math.max(LEVEL_RULE.floor, Math.min(LEVEL_RULE.ceiling, pts + move));
    e.points = { before, move, after: pts, expects: LEVEL_RULE.expects(before) };
    history.push(e);
  }
  settle(NOW);
  const nowSeason = SEASON_RULE.of(NOW);
  const seasonStartPts = resets.at(-1)?.at === nowSeason.start ? resets.at(-1).after : (history.find((h) => h.at >= nowSeason.start)?.points.before ?? pts);
  const lastMoved = history.at(-1) ?? null;
  const pending = works.filter((x) => !x.settled);
  const level = {
    points: pts, level: LEVEL_RULE.level(pts), into: pts % LEVEL_RULE.perLevel, perLevel: LEVEL_RULE.perLevel,
    toNext: LEVEL_RULE.level(pts) >= LEVEL_RULE.top ? null : LEVEL_RULE.perLevel - (pts % LEVEL_RULE.perLevel),
    expects: LEVEL_RULE.expects(pts),
    last: lastMoved && { id: lastMoved.id, title: lastMoved.title, move: lastMoved.points.move, score: lastMoved.score },
    pending: pending.map((x) => ({ id: x.id, title: x.title, inDays: Math.ceil(spec.minAgeDays - x.ageDays) })),
  };
  const inSeason = works.filter((x) => x.at >= nowSeason.start);
  const seasonBest = inSeason.filter((x) => x.rating != null).sort((a, b) => b.rating - a.rating)[0] ?? null;
  const seasonInfo = {
    n: nowSeason.n, year: nowSeason.year, start: nowSeason.start, end: nowSeason.end,
    daysLeft: Math.ceil((nowSeason.end - NOW) / DAY),
    works: inSeason.length,
    best: seasonBest && { id: seasonBest.id, title: seasonBest.title, rating: seasonBest.rating, multiple: seasonBest.multiple },
    startPoints: seasonStartPts, startLevel: LEVEL_RULE.level(seasonStartPts),
    pointsChange: pts - seasonStartPts, levelChange: LEVEL_RULE.level(pts) - LEVEL_RULE.level(seasonStartPts),
  };

  // This week's challenges, drawn from your weakest parts that a single work can move.
  const workLevel = r.parts.filter((x) => { const t = spec.parts.find((y) => y.key === x.key).measure.type; return t === "ratio" || t === "median"; }).sort((a, b) => a.score - b.score);
  const week = works.filter((x) => x.ageDays <= 7).sort((a, b) => a.ageDays - b.ageDays);
  const bestW = byWork.get(best.workId);
  const cx = { kind: k.kind, w, lever: workLevel[0]?.key, best: { id: best.workId, title: best.work.title, multiple: best.multiple } };
  const picks = workLevel.slice(0, 2).map((x) => {
    const part = spec.parts.find((y) => y.key === x.key);
    const t = CHALLENGES[x.key]?.when?.(cx) ? CHALLENGES[x.key] : CHALLENGES.part;
    return { t, part, from: `${part.name}: beats ${x.score} in 100 ${spec.peers} your size` };
  });
  picks.push({ t: CHALLENGES.followup, part: null, from: `Your best ${w.work} of ${PERIOD_WORDS}` });
  const challenges = picks.map(({ t, part, from }) => {
    let done = null;
    for (const wk of week) { const why = t.check(cx, wk, part); if (why) { done = { id: wk.id, why }; break; } }
    return { title: t.title(cx, part), tip: t.tip(cx, part), from, done, tagged: !!t.tagged };
  });
  const weekEnds = NOW + ((7 - new Date(NOW).getUTCDay()) % 7 || 7) * DAY;

  // Rivals: made up, three of your size within a level of yours. Names are never shown.
  const L = level.level;
  const rivals = [Math.min(10, L + 1), L, Math.max(1, L - 1)].map((lv, i) => ({ band: sizeBand, level: lv, note: ["a level up", "your level", "a level down"][lv - L + 1] ?? "", key: `r${i}` }));

  return { workList: works, byWork, level, season: seasonInfo, challenges, weekEndsDays: Math.round((weekEnds - NOW) / DAY), rivals, primaryKey: primary };
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
  // What held it back: the weakest line, whatever kind, if it is below typical.
  const lowest = scored.reduce((a, l) => (!a || l.score < a.score ? l : a), null);
  const held = lowest && lowest.score < 50 && lowest !== mvp ? lowest : null;
  const sizeLines = x.lines.filter((l) => l.against === "size" && l.score != null && (l.type === "ratio" || l.type === "median"));
  const reachLine = x.lines.find((l) => l.key === "reach");

  // Best line among the last twelve: the work-level line where this work's figure is the highest.
  let bestOf = null;
  if (inRecent && recent12.length >= 4) for (const l of sizeLines) {
    const others = recent12.filter((y) => y.id !== id).map((y) => y.lines.find((z) => z.key === l.key)?.raw).filter((v) => v != null);
    if (others.length >= 3 && others.every((v) => l.raw > v) && (!bestOf || l.score > bestOf.score)) bestOf = l;
  }
  // A standing record this work holds.
  const standing = personalBests(c.snap, { includeBaseline: true });
  const holders = new Map();
  for (const e of standing) holders.set(e.metric, e);
  let record = null;
  for (const [metric, e] of holders) if (e.workId === id) {
    const rec = spec.records.find((y) => recordMetric(y) === metric);
    const unit = spec.metrics.find((m) => m.key === metric.split("@")[0])?.unit ?? "count";
    if (unit === "count" && rec) { record = { label: rec.label, value: e.value, previous: e.previous }; break; }
  }
  const ax = { w, peers: c.peers, multiple: x.multiple ?? 0, rating: x.rating ?? 0, primary, typical, bestOf, of: recent12.length, record, sizeLines, scored, lowest };
  const earned = AWARDS.filter((a) => !a.fallback).map((a) => { const got = a.test(ax); return got ? { id: a.id, ...got } : null; }).filter(Boolean);
  const awards = (earned.length ? earned : AWARDS.filter((a) => a.fallback).map((a) => { const got = a.test(ax); return got ? { id: a.id, ...got } : null; }).filter(Boolean)).slice(0, AWARD_LIMIT);

  // The first week: this work and your usual, along the engine's maturity curve for the primary figure.
  const metric = spec.metrics.find((m) => m.key === spec.work.primary);
  const firstWeek = metric.maturity && typical ? [1 / 24, 1, 7].map((age) => {
    const share = maturedShare(metric.maturity, age);
    return { age, label: age < 1 ? "1 hour" : age === 1 ? "1 day" : "7 days", you: primary * share, usual: typical * share, reached: p.ageDays >= age };
  }) : null;

  // Next time: one move from what held it back, one from what carried it.
  const next = [];
  if (held) next.push({ title: `Fix ${held.name.toLowerCase()} first`, body: held.advice, why: `${held.name} beat ${held.score} in 100 here (${held.value}), this ${w.work}'s weakest line.` });
  if (mvp) next.push(x.multiple >= 1.5
    ? { title: `Make the sequel to “${x.title}”`, body: `It did ${times(x.multiple)} your typical, led by ${mvp.name.toLowerCase()}. Borrow the premise while it is fresh.`, why: `${mvp.name} was this ${w.work}'s best line: ${mvp.value}.` }
    : { title: `Keep ${mvp.name.toLowerCase()}`, body: `${mvp.value}, beating ${mvp.score} in 100. ${held ? `Keep that while you fix ${held.name.toLowerCase()}.` : "Whatever you did here, do it on purpose next time."}`, why: `${mvp.name} was this ${w.work}'s best line.` });

  const idx = recent12.findIndex((y) => y.id === id);
  return {
    id, title: x.title, on: dayName(x.at), ageDays: x.ageDays, settled: x.settled,
    rating: x.rating, signed: x.rating == null ? "n/a" : minus(signed(x.rating)), band: x.band,
    multiple: x.multiple, primary, typical, unit: w.unit,
    reach: reachLine?.score != null ? { score: reachLine.score, value: reachLine.value } : null,
    rank, of: recent12.length,
    score: x.score, own: x.own, size: x.size, points: x.points ?? null,
    lines: x.lines, mvp: mvp?.key ?? null, held: held?.key ?? null,
    firstWeek, awards,
    moments: madeUpMoments(c.k.kind, recent12.length + Number(id.slice(-3)) + 7, p.work.durationSec),
    next: next.slice(0, 2),
    older: idx > 0 ? recent12[idx - 1].id : null, newer: idx >= 0 && idx < recent12.length - 1 ? recent12[idx + 1].id : null,
    shareLine: `${c.k.name}: “${x.title}” rated ${x.rating == null ? "n/a" : minus(signed(x.rating))}, ${times(x.multiple ?? 0)} my typical ${w.work}. ${RATING_LABEL}.`,
  };
}

/** Which made-up creator a work belongs to, from its id. */
export const kindOfWork = (id) => KINDS.find((k) => String(id).startsWith(`wk_fixture_${k.kind}_`))?.key ?? null;
