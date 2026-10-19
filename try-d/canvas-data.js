/*
  The canvas: every figure on this page, computed here by the Orbe engine.
  Six made-up creators, one per kind of work the headline names, each built
  from a fixed seed so the page reads the same on every load. The slider
  scales every count on every work by one factor, so only reach moves, and
  the engine rates the result again. Names are invented; none is a real
  creator, channel or show.
*/
import { rate, rateWorks, fixtureSnapshot, FIXTURE_NOW, SPECS, signed, RATING_LABEL } from "../assets/engine/rating/browser.js";
import { normalCdf } from "../assets/engine/rating/stats.js";
import { mathsFor, benchmark, example, ORDER as BENCH_KINDS, BENCHMARK_LINE, EXAMPLE_LINE } from "../assets/r5/examples.js";
import { successFee, buyerPremium, TAKE_RATE, formatMoney } from "../assets/engine/market/browser.js";
import { inventoryFromStats } from "../assets/engine/sponsor/browser.js";
import { assessPlausibility, prefixUrl, RULES_VERSION, sampleDashboard, readFeedDetails } from "../assets/engine/podcast/browser.js";
import { suspiciousCreator } from "../assets/engine/record/browser.js";

export { signed, RATING_LABEL, EXAMPLE_LINE, BENCHMARK_LINE, mathsFor, benchmark, TAKE_RATE, RULES_VERSION, FIXTURE_NOW };

/* The six, in the order the headline turns. Field Recordings and the other two from examples.js keep their exact seeds. */
export const KINDS = [
  { key: "explainer", word: "explainer", label: "Explainer", name: "Field Recordings", handle: "@fieldrecordings", colour: "sky",
    unit: "views", noun: "upload", o: { kind: "youtube", audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1, noise: 0.25 },
    line: "Sound, explained one recording at a time. Still being found months after it goes up." },
  { key: "devlog", word: "devlog", label: "Devlog", name: "Moth Engine", handle: "@mothengine", colour: "straw",
    unit: "views", noun: "devlog", o: { kind: "youtube", audience: 18000, reach: 1.3, engagement: 1.9, hitEvery: 6, seed: 4, noise: 0.25, everyDays: 14 },
    line: "A game built in public, a fortnight at a time. The commits are the script." },
  { key: "podcast", word: "podcast", label: "Podcast", name: "The Long Table", handle: "@thelongtable", colour: "peony",
    unit: "downloads in 7 days", noun: "episode", o: { kind: "podcast", audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3, noise: 0.25 },
    line: "Twice a month, two hosts and a long table. Downloads, not guesses." },
  { key: "letsplay", word: "Let’s Play", label: "Let’s Play", name: "Second Save Slot", handle: "@secondsaveslot", colour: "sky",
    unit: "views", noun: "episode", o: { kind: "youtube", audience: 60000, reach: 1.2, engagement: 1.4, hitEvery: 4, seed: 9, noise: 0.3, everyDays: 3 },
    line: "One playthrough, every other night, all the way to the credits." },
  { key: "recipe", word: "recipe", label: "Recipe", name: "One Pan Thursdays", handle: "@onepanthursdays", colour: "straw",
    unit: "views", noun: "recipe", o: { kind: "youtube", audience: 9000, reach: 1.1, engagement: 2.1, hitEvery: 5, seed: 12, noise: 0.25 },
    line: "A weeknight dinner in one pan, filmed on a phone propped on the kettle." },
  { key: "longexposure", word: "long exposure", label: "Long exposure", name: "Low Tide Prints", handle: "@lowtideprints", colour: "peony",
    unit: "views", noun: "photo", o: { kind: "photography", audience: 60000, reach: 1, engagement: 1, hitEvery: 5, seed: 1, noise: 0.25 },
    line: "Thirty second exposures of the estuary at first light. Three keepers a morning." },
];

const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const count = (n) => nf.format(Math.round(n));
export const gbp = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" }).replace(/\.00$/, "");
export const gbpExact = (pence) => formatMoney({ amount: Math.round(pence), currency: "GBP" });
export const minus = (s) => String(s).replace(/^-/, "−");

/* The inverse of the normal CDF, by bisection on the engine's own normalCdf. */
function probit(p) {
  let lo = -4, hi = 4;
  for (let i = 0; i < 48; i++) { const mid = (lo + hi) / 2; if (normalCdf(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

const BASE = {};
function base(key) {
  if (BASE[key]) return BASE[key];
  const k = KINDS.find((x) => x.key === key);
  const snap = fixtureSnapshot({ ...k.o, title: k.name });
  snap.account.handle = k.handle;
  const spec = SPECS[k.o.kind];
  return (BASE[key] = { k, snap, spec });
}

/* Every count on every work times f. Ratios (completion) stay as they are. */
function scaled(snap, spec, f) {
  if (f === 1) return snap;
  const ratio = new Set(spec.metrics.filter((m) => m.unit === "ratio").map((m) => m.key));
  return { ...snap, works: snap.works.map((w) => ({ ...w, metrics: Object.fromEntries(Object.entries(w.metrics).map(([m, v]) => [m, ratio.has(m) ? v : v * f])) })) };
}

/**
  The rating for one kind with every work scaled by f. Returns the rating,
  the band, the reach part's percentile (the "beats N in 100"), the typical
  work's primary figure, and the hundred: reach for a hundred creators your
  size, read off the engine's prior for the band, with yours in its place.
*/
export function rated(key, f = 1) {
  const { k, snap, spec } = base(key);
  const r = rate(scaled(snap, spec, f), FIXTURE_NOW);
  const reach = r.parts.find((p) => p.key === "reach");
  const reachDetail = r.detail.parts.find((p) => p.key === "reach");
  const typical = r.detail.typical[spec.work.primary];
  const median = reachDetail.prior.median, sigma = reachDetail.prior.sigma;
  const hundred = Array.from({ length: 100 }, (_, i) => median * Math.exp(sigma * probit((i + 0.5) / 100)));
  return {
    k, spec, rating: r.rating, signed: minus(signed(r.rating)), band: r.band, beats: reach.score, reachValue: reach.value,
    reachMeasured: reachDetail.measured, typical, sizeBand: `${r.sizeBand} ${spec.audienceNoun}`, peers: spec.peers,
    hundred, median, workNoun: r.detail.workNoun, works: r.detail.works, result: r,
  };
}

/* The newest matured work against the creator's own typical, for the guide. */
export function newest(key) {
  const { snap } = base(key);
  const w = rateWorks(snap, FIXTURE_NOW).filter((x) => x.matured)[0];
  return w;
}

/* ---------------------------------------------------------------- money */
const P = (pounds) => Math.round(pounds * 100);
export function sale(pounds) {
  const price = { amount: P(pounds), currency: "GBP" };
  const fee = successFee(price);
  const prem = buyerPremium(price);
  return {
    price: price.amount, fee: fee.fee.amount, feeRate: fee.effectiveRateBps / 100, minimum: fee.minimumApplied, slices: fee.slices,
    premium: prem.fee.amount, premiumMinimum: prem.minimumApplied, net: price.amount - fee.fee.amount, buyerPays: price.amount + prem.fee.amount,
  };
}

const FX = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * 0.75), currency: "GBP" } : null);
/** A sponsorship quote from five recent uploads' views at 30 days, priced on the provisional rate card. */
export function quote(views30) {
  const v = Math.round(views30);
  const units = [0.92, 1.04, 0.97, 1.1, 0.95].map((x) => Math.round(v * x));
  const { inventory } = inventoryFromStats({ kind: "youtube", audience: 412000, units, price: null, currency: "GBP", fx: FX, at: FIXTURE_NOW });
  return inventory.items.map((i) => ({ format: i.format, name: i.name, s: i.suggestion }));
}

/** The plausibility check on a made-up claim, against a made-up public count (as on the Podcasts page). */
export const OP3_SAMPLE = 52000;
export function plausible(claim) {
  return assessPlausibility({
    claim: { monthlyDownloads: Math.round(claim) },
    op3: { asof: FIXTURE_NOW, monthlyDownloads: OP3_SAMPLE, weeklyDownloads: [], weeklyAvgDownloads: OP3_SAMPLE / 4.3, numWeeks: 8 },
    now: new Date(FIXTURE_NOW),
  });
}

export const prefixed = (show, url) => prefixUrl(show, url);

/** The record engine's made-up channel built to disagree: what YouTube estimated against what AdSense paid. */
export function disagree() {
  const nova = suspiciousCreator();
  const last = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
  const ads = nova.revenue.filter((l) => l.month === last && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source === "adsense");
  return { month: last, estimate: est.gross.amount, paid: paid.gross.amount };
}

/* ---------------------------------------------------------------- the Sunday note */

/* Each kind's own words for its work. */
const WORKS = {
  explainer: ["uploads", "upload"], devlog: ["devlogs", "devlog"], podcast: ["episodes", "episode"],
  letsplay: ["episodes", "episode"], recipe: ["recipes", "recipe"], longexposure: ["photos", "photo"],
};
const num = (s) => (String(s).match(/[+-]?[\d.,]+%?/) ?? [""])[0];
const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth", "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-ninth", "thirtieth", "thirty-first"];

/** The date the note was sent, in words: the engine's own day. */
export function noteDate() {
  const d = new Date(FIXTURE_NOW);
  const day = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${day} the ${ORD[d.getUTCDate()]} of ${month}, ${d.getUTCFullYear()}`;
}

/** The note for one kind, from the engine's own figures for that made-up creator. */
export function letterFor(key) {
  const r = rated(key, 1);
  const k = r.k;
  const [works, one] = WORKS[key];
  const part = (p) => r.result.parts.find((x) => x.key === p);
  const reach = part("reach");
  const { snap } = base(key);
  const top = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured).slice(0, 12).reduce((a, w) => (w.multiple > a.multiple ? w : a));
  const beats = Math.max(1, Math.min(99, reach.score));
  const detail = {
    explainer: () => `A typical upload reaches ${num(reach.value)} of your subscribers, and your newest ten are running ${minus(part("momentum").value)} against the twenty before them. Still being found, months on.`,
    devlog: () => `A typical devlog reaches ${num(reach.value)} of your subscribers, and your newest ten are running ${minus(part("momentum").value)} against the twenty before them. The build is the story.`,
    podcast: () => `A typical episode is downloaded by ${num(reach.value)} of your followers in its first week, and listeners hear ${num(part("completion").value)} of it. People stay at the table.`,
    letsplay: () => `A typical episode reaches ${num(reach.value)} of your subscribers, and your newest ten are running ${minus(part("momentum").value)} against the twenty before them. The playthrough has regulars.`,
    recipe: () => `A typical recipe reaches ${num(reach.value)} of your subscribers, and ${num(part("engagement").value)} of viewers like or comment. People are cooking along.`,
    longexposure: () => `A typical photo is seen by ${num(reach.value)} of your followers, and ${num(part("saves").value)} of views end in a save: people keeping your work to come back to.`,
  }[key]();
  return {
    name: k.name, handle: k.handle, signed: r.signed, rating: r.rating, band: r.band,
    open: `Your ${works}, read properly this week, against ${r.peers} with ${r.sizeBand.replace(/^Under/, "under")}.`,
    beat: `You beat ${beats} in 100 ${r.peers} your size.`,
    detail,
    best: `The best of your last twelve ${works} did ${top.multiple.toFixed(1)} times your typical ${one}.`,
  };
}

/* ---------------------------------------------------------------- after_post.txt: the guide's in-browser part */

const clamp99 = (n) => Math.max(1, Math.min(99, n));

/** The made-up creator's five newest settled works, newest first, for the picker. */
export function recentWorks(key) {
  const { snap, spec } = base(key);
  const [, one] = WORKS[key];
  return rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured).slice(0, 5).map((w) => {
    const work = snap.works.find((x) => x.id === w.workId);
    const days = Math.round(w.ageDays);
    return { id: w.workId, days, label: `${days} ${days === 1 ? "day" : "days"} ago`, soFar: work.metrics[spec.work.primary], one };
  });
}

/**
  How one work did: against the creator's own typical (the engine's multiple,
  adjusted for its age), against creators their size (its reach set on the
  engine's prior for their band), then three next steps by rule, from those
  figures and the rating's own advice.
*/
export function afterPost(key, i) {
  const { k, snap, spec } = base(key);
  const r = rated(key, 1).result;
  const [works, one] = WORKS[key];
  const all = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured);
  const w = all[i];
  const pick = recentWorks(key)[i];
  const typical = r.detail.typical[spec.work.primary];
  const audience = snap.account.audience;
  const prior = r.detail.parts.find((p) => p.key === "reach").prior;
  const share = (w.multiple * typical) / audience;
  const peersBeat = clamp99(Math.round(normalCdf(Math.log(share / prior.median) / prior.sigma) * 100));
  const pct = (x) => `${x * 100 < 10 ? (x * 100).toFixed(1) : Math.round(x * 100)}%`;
  const mx = w.multiple.toFixed(1), m = Number(mx);
  const twelve = all.slice(0, 12);
  const top = twelve.reduce((a, x) => (x.multiple > a.multiple ? x : a));
  const parts = [...r.parts].sort((a, b) => a.score - b.score || (a.key < b.key ? -1 : 1));
  const weak = parts[0], strong = parts.at(-1);
  const advice = r.detail.parts.find((p) => p.key === weak.key).advice;
  const tail = advice.split(". ").slice(1).join(". ") || advice;
  const steps = [
    m >= 1.2 ? { do: `Make a follow-up while this ${one} is still being found.`, why: `It is running ${mx} times your typical ${one}.` }
      : m <= 0.8 ? { do: "Give it a week before you change anything.", why: `It is at ${mx} times your typical ${one}, allowing for its age.` }
      : { do: "Keep the format, and change one thing next time.", why: `It landed at ${mx} times your typical ${one}, so one change will show.` },
    { do: `Work on ${weak.name.toLowerCase()}. ${tail.charAt(0).toUpperCase()}${tail.slice(1)}`, why: `It is your quietest part, better than ${weak.score} in 100 ${spec.peers} your size.` },
    weak.key === "hits" || top.workId === w.workId
      ? { do: `Protect your ${strong.name.toLowerCase()}.`, why: `It is your strongest part, better than ${strong.score} in 100 ${spec.peers} your size.` }
      : { do: `Set it beside your best of the last twelve ${works}.`, why: `That one did ${top.multiple.toFixed(1)} times your typical ${one}.` },
  ];
  return {
    name: k.name, one, unit: k.unit, label: pick.label, soFar: count(pick.soFar),
    multiple: w.multiple, own: `${mx}×`, ownLine: m > 1 ? `above your typical ${one}` : m < 1 ? `below your typical ${one}` : `right at your typical ${one}`,
    share: pct(share), typicalShare: pct(prior.median), audienceNoun: spec.audienceNoun, peers: spec.peers, peersBeat, steps,
  };
}

/* ---------------------------------------------------------------- where_you_sit.txt: The State of the Middle */

export const benchKinds = () => BENCH_KINDS.map((key) => ({ key, label: example(key).label }));
/** The typical reach for every size band of one kind, and where its made-up creator sits. */
export function middle(kind) {
  const b = benchmark(kind);
  const ex = example(kind);
  const spec = SPECS[ex.platform];
  const reach = ex.parts.find((p) => p.key === "reach");
  const pct = (x) => `${x * 100 < 10 ? (x * 100).toFixed(1).replace(/\.0$/, "") : Math.round(x * 100)}%`;
  return {
    what: b.what, peers: spec.peers, audienceNoun: spec.audienceNoun, line: b.line,
    rows: b.rows.map((r) => ({ key: r.key, label: r.label, value: pct(r.value) })),
    at: b.example, name: ex.name, own: reach?.value, beats: reach?.score,
  };
}

/* ---------------------------------------------------------------- podcast_prefix.txt: the made-up sample dashboard */

/** The podcast page's own sample: made-up listening for the made-up feed, through the engine's counter. */
export function podcastSample(xml, showId) {
  const feed = readFeedDetails(xml);
  const d = sampleDashboard({ feed, feedUrl: "https://example.invalid/long-table/feed.xml", showId, through: FIXTURE_NOW.slice(0, 10) }).dashboard;
  const apps = Object.entries(d.downloads.byApp).sort((a, b) => b[1] - a[1]);
  return { title: feed.title, total: d.downloads.total, byDay: d.downloads.byDay, apps };
}
