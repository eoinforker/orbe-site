/*
  Every figure on this page, computed live by the Orbe engine. The creators,
  claims and revenue are made up; the arithmetic is the engine's own.
*/
import { example, benchmark, mathsFor, ORDER, verdict } from "../assets/r5/examples.js";
import { suspiciousCreator, buildRecord, cleanCreator, FIXTURE_NOW as RECORD_NOW } from "../assets/engine/record/browser.js";
import { assessPlausibility, RULES_VERSION } from "../assets/engine/podcast/browser.js";
import { inventoryFromStats } from "../assets/engine/sponsor/browser.js";
import { valuate, successFee, buyerPremium, TAKE_RATE } from "../assets/engine/market/browser.js";

export { example, ORDER, verdict };

const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const count = (n) => nf.format(Math.round(n));
export const gbp = (pence, dp = 0) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(pence / 100);
const short = (pence) => {
  const p = pence / 100;
  return p >= 1e6 ? `£${(p / 1e6).toFixed(p >= 1e7 ? 0 : 1)}M` : p >= 1e3 ? `£${Math.round(p / 1e3)}k` : `£${Math.round(p)}`;
};

/* 2. The Record: the made-up channel built to disagree, what YouTube estimated against what AdSense paid. */
function record() {
  const nova = suspiciousCreator();
  const last = [...new Set(nova.revenue.map((l) => l.month))].sort().at(-1);
  const ads = nova.revenue.filter((l) => l.month === last && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics");
  const paid = ads.find((l) => l.provenance.source === "adsense");
  const month = new Date(last.length <= 10 ? `${last.slice(0, 7)}-15T12:00:00Z` : last).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return { estimate: gbp(est.gross.amount, 2), paid: gbp(paid.gross.amount, 2), month };
}

/* 4. Plausibility: the podcast page's own made-up claim that does not add up. */
function plausibility() {
  const daily = {};
  const now = Date.parse(RECORD_NOW);
  for (let i = 0; i < 21; i++) daily[new Date(now - (21 - i) * 864e5).toISOString().slice(0, 10)] = 10000;
  const episodes = [["2026-09-02", 9000, 8200], ["2026-09-09", 11000, 15000], ["2026-09-16", 10000, 14800]].map(([d, a, b], i) => ({ guid: `claimed-${i + 1}`, publishedAt: `${d}T06:00:00.000Z`, downloads_7d: a, downloads_30d: b }));
  const p = assessPlausibility({
    claim: { basis: "claimed", monthlyDownloads: 310000, episodes, daily, dailyTotal: 230000 },
    measured: null,
    op3: { asof: RECORD_NOW, monthlyDownloads: 52000, weeklyDownloads: [], weeklyAvgDownloads: 52000 / 4.3, numWeeks: 8 },
    index: { id: 0, title: "", url: "", episodeCount: 22, dead: 0 },
    feed: null,
    videos: [900, 1100, 760, 1300].map((views, i) => ({ episodeGuid: `v${i}`, videoWorkId: `v${i}`, videoTitle: "", views, daysApart: 0, similarity: 1, firstFrameCount: false })),
    bestChart: null,
    ratings: { count: 4 },
    now: new Date(RECORD_NOW),
  });
  const words = { consistent: "Consistent", consistent_with_notes: "Consistent, with notes", questions: "Questions to ask", inconsistent: "Inconsistent", not_enough_signal: "Not enough signal" };
  const high = p.flags.filter((f) => f.severity === "high").length;
  return { verdict: words[p.verdict] ?? p.verdict, flags: p.flags.length, high, signals: p.signalsUsed.length, estimate: p.estimate ? `${count(p.estimate.monthlyLow)} to ${count(p.estimate.monthlyHigh)}` : null, rules: RULES_VERSION };
}

/* 5. Sponsorships: the sponsorships page's own made-up channel, priced in dollars as the rate cards are. */
function sponsorship() {
  const units = [21000, 18000, 25000, 19500, 30000, 17000, 22500];
  const rate = 0.75;
  const fx = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * rate), currency: "GBP" } : null);
  const { inventory } = inventoryFromStats({ kind: "youtube", audience: 85000, units, price: null, currency: "GBP", fx, rating: { band: "Good", rating: 0 }, at: RECORD_NOW });
  const it = inventory.items[0];
  const s = it.suggestion;
  return { range: `${gbp(s.low.amount)} to ${gbp(s.high.amount)}`, name: it.name, rate };
}

/* 6. Selling: the selling page's own made-up channel, valued on two years of three streams. */
function selling() {
  const months = [];
  for (let i = 23; i >= 0; i--) { const d = new Date(Date.UTC(2026, 8 - i, 1)); months.push(d.toISOString().slice(0, 10)); }
  const streams = [["ads", 6200], ["sponsorship", 3800, "Brindle Coffee (made up)"], ["memberships", 1500]];
  const declared = [];
  for (const [stream, pounds, who] of streams) months.forEach((month, i) => {
    const age = months.length - 1 - i;
    const k = age < 12 ? 1 : 1 / 1.18;
    declared.push({ month, gross: { amount: Math.round(pounds * 100 * k), currency: "GBP" }, stream, counterparty: who });
  });
  const v = valuate({ kind: "youtube", revenue: [], declared, costs: { basis: "declared_margin", margin: 0.62 }, faceDependence: 0.6 });
  const mid = Math.round((v.range.low.amount + v.range.high.amount) / 2 / 100000) * 100000;
  const fee = successFee({ amount: mid, currency: "GBP" });
  const prem = buyerPremium({ amount: mid, currency: "GBP" });
  const amt = (x) => x?.fee?.amount ?? x?.amount?.amount ?? x?.total?.amount ?? x?.amount;
  return { range: `${short(v.range.low.amount)} to ${short(v.range.high.amount)}`, confidence: v.confidence, at: short(mid), fee: gbp(amt(fee)), premium: gbp(amt(prem)) };
}

/* 7. Diligence: the record engine's clean made-up creator, how much of a year was read at source. */
function diligence() {
  const c = cleanCreator();
  const rec = buildRecord(c, { now: RECORD_NOW });
  const counted = rec.lines.filter((l) => l.role === "counted");
  const months = new Set(counted.map((l) => l.month)).size;
  const sources = new Set(counted.map((l) => l.source)).size;
  return { months, sources, checks: rec.checks?.length ?? null };
}

/* 9. The guide and 10. the State of the Middle, from the rating engine. */
function guide(kind = "channel") {
  const e = example(kind);
  return e.best.replace(/^Best of the last twelve: /, "").replace(/\.$/, "");
}
function middle(kind = "channel") {
  const b = benchmark(kind);
  const row = b.rows.find((r) => r.key === b.example);
  return { label: row.label, value: `${Math.round(row.value * 100)}%`, title: b.title, line: b.line };
}

let CACHE = null;
export function figures() {
  if (CACHE) return CACHE;
  const safe = (f) => { try { return f(); } catch (x) { console.warn("Orbe figures:", x?.message); return null; } };
  CACHE = {
    rate: example("channel"),
    record: safe(record),
    plausibility: safe(plausibility),
    sponsorship: safe(sponsorship),
    selling: safe(selling),
    diligence: safe(diligence),
    guide: safe(guide),
    middle: safe(middle),
    maths: mathsFor("channel"),
    take: TAKE_RATE,
  };
  return CACHE;
}
