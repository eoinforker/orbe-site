/*
  Your Orbe: every figure on the page, worked out live by the Orbe engine
  (site/assets/engine) for one made-up creator of each kind. The creators,
  their works and their titles are invented; the maths is the real engine's.

  The creators are the same made-up ones every page shows (site/assets/r5/examples.js),
  built from the same seeds, so a figure here matches the figure there.
*/
import { rate, rateWorks, topStat, focusAreas, explain, personalBests, personalBestLine, recordMetric, SPECS, FIXTURE_NOW, fixtureSnapshot, signed, RATING_LABEL } from "../../assets/engine/rating/browser.js";
import { maturedShare } from "../../assets/engine/rating/measure.js";
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
