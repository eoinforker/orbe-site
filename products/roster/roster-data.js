/*
  The roster's figures, every one from the Orbe engine (site/assets/engine).
  Pure: no DOM, so it runs in the browser and under Node for checks.

  The creators are made up. Each is a seeded fixture from the rating engine
  (fixtureSnapshot, the same generator Orbe's tests use), so the roster reads
  the same on every load and no figure is typed by hand:
    rating, band, size band, sub-scores, momentum, work ratings   rating engine: rate(), rateWorks()
    delivery at each format's price window                         rating engine's own maturity curve (maturedShare)
    price range per format, with reasons                           sponsor engine: inventoryFromStats()
    the Record: revenue, how much was read from payouts            record engine: buildRecord()
    what each creator shares                                       record engine's liveConsent() over this roster's consents

  The engine has no roster or manager yet; this module only composes its calls.
*/
import { rate, rateWorks, fixtureSnapshot, FIXTURE_NOW, SPECS, signed, RATING_LABEL, RATING_NOTICE, RATING_BANDS, MODEL_VERSION } from "../../assets/engine/rating/browser.js";
import { maturedShare } from "../../assets/engine/rating/measure.js";
import { inventoryFromStats, specsForKind, optIn, RATE_CARD_VERSION, DEFAULT_TAKE_RATE } from "../../assets/engine/sponsor/browser.js";
import { buildRecord, liveConsent } from "../../assets/engine/record/browser.js";

export { RATING_LABEL, RATING_NOTICE, RATING_BANDS, MODEL_VERSION, RATE_CARD_VERSION, DEFAULT_TAKE_RATE, FIXTURE_NOW };

/** Every name below is invented for this page. None is a real creator, channel, show or person. */
export const MADE_UP_LINE = "Made-up creators, generated from fixed seeds and rated live by the Orbe engine. None is a real person, channel or show.";

/* The kinds, in the words a manager uses. */
export const KINDS = {
  youtube: { label: "YouTube", noun: "channel", works: "uploads", unit: "views" },
  substack: { label: "Newsletter", noun: "newsletter", works: "issues", unit: "opens" },
  twitch: { label: "Twitch", noun: "stream", works: "streams", unit: "average viewers" },
  podcast: { label: "Podcast", noun: "show", works: "episodes", unit: "downloads in 7 days" },
  photography: { label: "Photography", noun: "portfolio", works: "photos", unit: "views" },
};

/*
  The roster. `o` feeds the rating engine's fixture generator: audience, reach
  and engagement against the provisional typical (1 is typical), how often a
  hit lands, and the seed. `share` is what the creator chose to share with
  this roster; `record` is which of their money is connected to Orbe.
*/
export const ROSTER = [
  { id: "tinroof", name: "Tin Roof Workshop", handle: "@tinroofworkshop", o: { kind: "youtube", audience: 4200, reach: 3.5, engagement: 2.5, hitEvery: 4, seed: 3 }, share: "accepted", record: "payouts" },
  { id: "gazetteer", name: "Pocket Gazetteer", handle: "@pocketgazetteer", o: { kind: "youtube", audience: 38000, reach: 0.5, engagement: 0.6, hitEvery: 9, seed: 5 }, share: "accepted", record: "uploads" },
  { id: "slowgears", name: "Slow Gears Garage", handle: "@slowgearsgarage", o: { kind: "youtube", audience: 395000, reach: 1.2, engagement: 1.3, hitEvery: 6, seed: 14 }, share: "accepted", record: "payouts" },
  { id: "allotment", name: "The Allotment Ledger", handle: "@allotmentledger", o: { kind: "substack", audience: 2800, reach: 1.3, engagement: 1.6, hitEvery: 6, seed: 8 }, share: "accepted", record: "payouts" },
  { id: "weekday", name: "Weekday Atlas", handle: "@weekdayatlas", o: { kind: "substack", audience: 31000, reach: 0.6, engagement: 0.7, hitEvery: 9, seed: 2 }, share: "rating", record: "uploads" },
  { id: "quiethours", name: "Quiet Hours Club", handle: "@quiethoursclub", o: { kind: "twitch", audience: 6500, reach: 1.4, engagement: 1.5, hitEvery: 5, seed: 31 }, share: "accepted", record: "uploads" },
  { id: "lantern", name: "Lantern Raid Nights", handle: "@lanternraid", o: { kind: "twitch", audience: 48000, reach: 0.55, engagement: 0.7, hitEvery: 8, seed: 17 }, share: "rating", record: "none" },
  { id: "backroom", name: "Back Room Wireless", handle: "@backroomwireless", o: { kind: "podcast", audience: 3200, reach: 1.1, engagement: 1.2, hitEvery: 6, seed: 11 }, share: "invited", record: "none" },
  { id: "harbour", name: "Harbour Lights Hour", handle: "@harbourlightshour", o: { kind: "podcast", audience: 18000, reach: 1.25, engagement: 1.3, hitEvery: 5, seed: 6 }, share: "accepted", record: "none" },
  { id: "northlight", name: "North Light Plates", handle: "@northlightplates", o: { kind: "photography", audience: 22000, reach: 1.1, engagement: 1.2, hitEvery: 5, seed: 9 }, share: "accepted", record: "payouts" },
];

/* ---------------------------------------------------------------- consent */
/*
  What a creator shares with a roster. The engine's consent records are
  { creatorId, scope, grantedAt, revokedAt }; this roster adds three scopes of
  its own (core has none for managers yet) and keeps the engine's own:
  "sponsorships" (the sponsor engine's opt-in) and "connect" (which the record
  engine requires before it reads any connected source).
*/
export const SCOPES = { rating: "roster_rating", prices: "roster_prices", record: "roster_record" };
const SHARE = {
  invited: [],
  rating: ["roster_rating"],
  accepted: ["roster_rating", "roster_prices", "roster_record", "sponsorships", "connect"],
};
export const SHARE_LABEL = { invited: "Invited", rating: "Rating only", accepted: "Accepted", left: "Left the roster" };
const GRANTED = "2026-09-01T09:00:00.000Z";

export function consentsFor(c) {
  return (SHARE[c.share] ?? []).map((scope) => (scope === "sponsorships" ? optIn(c.id, GRANTED) : { creatorId: c.id, scope, grantedAt: GRANTED, revokedAt: null }));
}
/** Whether a scope is live for this creator right now, read with the record engine's own liveConsent. */
export const shares = (consents, id, key, at = new Date(FIXTURE_NOW)) => liveConsent(consents, id, SCOPES[key] ?? key, at) !== null;
/** Leaving: every consent revoked at once, as core's revoke does. Nothing is shown from then on. */
export const leave = (consents, at = new Date(FIXTURE_NOW).toISOString()) => consents.map((c) => ({ ...c, revokedAt: c.revokedAt ?? at }));

/* ---------------------------------------------------------------- the rating */
const clampBeats = (n) => Math.max(1, Math.min(99, Math.round(n)));
export const minus = (s) => String(s).replace(/^-/, "−");

function snapshotOf(c) {
  const snap = fixtureSnapshot({ noise: 0.25, ...c.o, id: `ac_roster_${c.id}`, title: c.name });
  snap.account.handle = c.handle;
  snap.account.creatorId = c.id;
  return snap;
}

function ratingOf(c, snap) {
  const spec = SPECS[c.o.kind];
  const r = rate(snap, FIXTURE_NOW);
  if (r.status !== "rated") return { status: r.status, message: r.message };
  const reach = r.parts.find((p) => p.key === "reach");
  const momentum = r.parts.find((p) => p.key === "momentum");
  const works = rateWorks(snap, FIXTURE_NOW).filter((w) => w.matured);
  const latest = works[0];
  const last12 = works.slice(0, 12);
  return {
    status: "rated",
    rating: r.rating,
    signed: minus(signed(r.rating)),
    band: r.band,
    sizeBand: `${r.sizeBand} ${spec.audienceNoun}`,
    sizeKey: r.detail.bandKey,
    peers: spec.peers,
    beats: clampBeats(reach.score),
    reach,
    momentum: momentum ? { score: momentum.score, value: minus(momentum.value), what: momentum.what } : null,
    latest: latest ? { multiple: latest.multiple, rating: latest.rating, signed: minus(signed(latest.rating)), ageDays: latest.ageDays } : null,
    last12: last12.map((w) => ({ multiple: w.multiple, rating: w.rating, ageDays: w.ageDays })),
    parts: r.parts.map(({ key, name, score, value, what }) => ({ key, name, score, value: minus(value), what })),
    unavailable: r.detail.unavailable,
    workNoun: r.detail.workNoun,
    formatName: r.detail.formatName,
    confidence: r.detail.confidence,
    provisional: r.detail.provisional,
    modelVersion: r.modelVersion,
    result: r,
  };
}

/* ---------------------------------------------------------------- the sponsor engine */
/*
  The sponsor engine prices from what recent works delivered at each format's
  price window (views at 30 days, opens at 7, downloads at 30, average viewers).
  The fixture holds each work's counts at its age, so this reads them back to
  the window with the rating engine's own maturity curve: value at age, over
  the share matured by that age, times the share matured by the window.
*/
export function deliveryAtWindow(snap, kind, formatSpec, n = 7) {
  const rspec = SPECS[kind];
  const now = Date.parse(FIXTURE_NOW);
  const key = formatSpec.windowedMetric?.[formatSpec.priceWindow] ?? formatSpec.metric;
  const m = rspec.metrics.find((x) => x.key === key);
  if (!m) return [];
  return snap.works
    .map((w) => ({ w, age: (now - Date.parse(w.publishedAt)) / 864e5 }))
    .filter(({ w, age }) => age >= formatSpec.priceWindow && Number.isFinite(w.metrics[key]))
    .sort((a, b) => a.age - b.age)
    .slice(0, n)
    .map(({ w, age }) => Math.round((w.metrics[key] / maturedShare(m.maturity, age)) * maturedShare(m.maturity, formatSpec.priceWindow)));
}

/** Pounds per dollar for the rate cards, which are in dollars. An example, not a live rate, and labelled so. */
export const FX_RATE = 0.75;
const fx = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * FX_RATE), currency: "GBP" } : null);

function pricesOf(c, snap, rating) {
  const specs = specsForKind(c.o.kind);
  if (!specs.length) return { status: "none", reason: `The sponsor engine has no ${KINDS[c.o.kind].label.toLowerCase()} format yet. Licensing is priced elsewhere.` };
  const units = deliveryAtWindow(snap, c.o.kind, specs[0]);
  const { inventory, note } = inventoryFromStats({
    kind: c.o.kind, audience: snap.account.audience, units, price: null, currency: "GBP", fx,
    rating: rating.status === "rated" ? { band: rating.band, rating: rating.rating } : null, at: FIXTURE_NOW,
  });
  const items = inventory.items.map((i) => ({ format: i.format, name: i.name, description: i.description, s: i.suggestion, stats: i.stats }));
  return { status: "priced", units, unit: specs[0].unit, window: specs[0].priceWindow, quantity: specs[0].quantity, items, main: items[0], note };
}

/* ---------------------------------------------------------------- the record engine */
/*
  Revenue lines for the record engine, derived from the creator's own engine
  figures so nothing is typed: sponsorship income is the low end of the sponsor
  engine's price for their main format, one placement in the months a seeded
  draw picks; photography licence income is the fixture works' own
  licence_revenue. "payouts" lines are read from a connected Stripe account
  (charges, then a payout), "uploads" are invoices the creator uploaded.
  Twitch income cannot be verified at all, so a Twitch creator is never read
  from payouts here, as in the product.
*/
const MONTHS = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.UTC(2026, 8 - i, 1)); return d.toISOString().slice(0, 10); }).reverse();
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function recordInputOf(c, snap, prices, consents) {
  const source = c.o.kind === "twitch" && c.record === "payouts" ? "uploads" : c.record;
  const creator = { id: c.id, displayName: `${c.name} (made up)` };
  const account = { ...snap.account, createdAt: "2021-01-01T00:00:00.000Z", country: "GB" };
  const base = { creator, accounts: [account], snapshots: [], revenue: [], consents };
  if (source === "none") return base;
  const recent = "2026-10-16T09:00:00.000Z";
  const prov = source === "payouts"
    ? { source: "stripe", accountId: `acct_made_up_${c.id}`, checkedAt: recent, basis: "connected" }
    : { source: "invoice_upload", accountId: `upload_made_up_${c.id}`, checkedAt: "2026-10-08T09:00:00.000Z", basis: "uploaded" };
  const amounts = {};
  if (c.o.kind === "photography") {
    for (const w of snap.works) { const m = `${w.publishedAt.slice(0, 7)}-01`; amounts[m] = (amounts[m] ?? 0) + Math.round(w.metrics.licence_revenue ?? 0); }
  } else if (prices.status === "priced" && prices.main.s?.status === "suggested") {
    const per = prices.main.s.low.amount * (prices.quantity === "hour" ? 2 : 1);
    const draw = seeded(c.o.seed * 97);
    for (const m of MONTHS) if (draw() < 0.55) amounts[m] = per;
  }
  let n = 0;
  const id = () => `rv_made_up_${c.id}_${String(++n).padStart(3, "0")}`;
  for (const m of MONTHS) {
    const a = amounts[m];
    if (!a) continue;
    const stream = c.o.kind === "photography" ? "licensing" : "sponsorship";
    base.revenue.push({ id: id(), accountId: prov.accountId, month: m, stream, gross: { amount: a, currency: "GBP" }, provenance: prov, counterparty: c.o.kind === "photography" ? `Licence buyer ${"ABC"[MONTHS.indexOf(m) % 3]} (made up)` : `Sponsor ${"ABCD"[MONTHS.indexOf(m) % 4]} (made up)` });
    if (source === "payouts") base.revenue.push({ id: id(), accountId: prov.accountId, month: m, stream: "other", gross: { amount: Math.round(a * 0.972), currency: "GBP" }, provenance: prov, counterparty: "Stripe payout", measure: "paid_out" });
  }
  return base;
}

export const RECORD_LABEL = { payouts: "Read from payouts", estimate: "Estimate only", none: "Not connected", withheld: "Not shared" };

function recordOf(c, snap, prices, consents) {
  if (!shares(consents, c.id, "record")) return { status: "withheld" };
  const input = recordInputOf(c, snap, prices, consents);
  if (!input.revenue.length) return { status: "none", twitch: c.o.kind === "twitch" };
  const rec = buildRecord(input, { clock: () => new Date(FIXTURE_NOW) });
  const connected = rec.coverage.connectedShare.value ?? 0;
  const uploaded = rec.coverage.uploadedShare.value ?? 0;
  const ttm = rec.metrics.ttm.total;
  return {
    status: connected >= 0.5 ? "payouts" : "estimate",
    twitch: c.o.kind === "twitch",
    ttm: { amount: ttm.value, currency: ttm.currency ?? "GBP" },
    connected, uploaded,
    sources: rec.provenance.map((p) => ({ source: p.source, basis: p.basis, checkedAt: p.checkedAt })),
    months: rec.months.length,
    flags: rec.flags.map((f) => ({ severity: f.severity, title: f.title })),
    findings: rec.findings.length,
    asOf: rec.asOf,
  };
}

/* ---------------------------------------------------------------- one creator, all of it */
export function build(c, consents = consentsFor(c)) {
  const kind = KINDS[c.o.kind];
  const base = { id: c.id, name: c.name, handle: c.handle, kind: c.o.kind, kindLabel: kind.label, audience: c.o.audience, share: c.share, consents };
  if (c.share === "left" || !shares(consents, c.id, "rating")) return { ...base, shown: { rating: false, prices: false, record: false } };
  const snap = snapshotOf(c);
  const rating = ratingOf(c, snap);
  const showPrices = shares(consents, c.id, "prices");
  const prices = pricesOf(c, snap, rating);
  return {
    ...base,
    shown: { rating: true, prices: showPrices, record: shares(consents, c.id, "record") },
    rating,
    prices: showPrices ? prices : null,
    record: recordOf(c, snap, prices, consents),
  };
}

export const buildRoster = () => ROSTER.map((c) => build(c));

/** A pending row from the invite form: nothing computed, nothing shown, until the creator accepts. */
export function invite({ name, email, kind }) {
  const id = `invite_${Math.abs([...`${name}${email}`].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)).toString(36)}`;
  return { id, name, handle: "", kind, kindLabel: KINDS[kind]?.label ?? kind, audience: null, share: "invited", email, consents: [], shown: { rating: false, prices: false, record: false }, pending: true };
}

/* ---------------------------------------------------------------- lines and files */
export const pitchLine = (row) => `${row.name} beats ${row.rating.beats} in 100 ${row.rating.peers} their size. ${RATING_LABEL}.`;

const money = (m) => (m ? `${m.currency === "GBP" ? "£" : "$"}${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(m.amount / 100)}` : "");
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** The roster-wide rate card, one row per creator and format, only what each creator shares. */
export function rateCardCSV(rows) {
  const head = ["Creator (made up)", "Kind", "Consent", "Size band", "Orbe Rating", "Band", "Beats N in 100 their size", "Format", "Price low", "Price high", "Per", "Expected delivery", "Basis", "Rate card", "Record", "Note"];
  const out = [head];
  for (const r of rows) {
    const common = [r.name, r.kindLabel, SHARE_LABEL[r.share] ?? r.share];
    if (!r.shown.rating) { out.push([...common, "", "", "", "", "", "", "", "", "", "", "", "", "Nothing shared yet"]); continue; }
    const rt = r.rating.status === "rated" ? [r.rating.sizeBand, r.rating.signed.replace("−", "-"), r.rating.band, r.rating.beats] : ["", "", "", ""];
    const rec = RECORD_LABEL[r.record.status];
    if (!r.shown.prices || !r.prices) { out.push([...common, ...rt, "", "", "", "", "", "", "", rec, "Rating only: prices not shared"]); continue; }
    if (r.prices.status !== "priced") { out.push([...common, ...rt, "", "", "", "", "", "", "", rec, r.prices.reason]); continue; }
    for (const it of r.prices.items) {
      const s = it.s;
      if (s?.status !== "suggested") { out.push([...common, ...rt, it.name, "", "", "", "", "", "", rec, s?.reason ?? ""]); continue; }
      out.push([...common, ...rt, it.name, money(s.low), money(s.high), s.per === "hour" ? "hour" : "placement", `${s.expected.units} ${s.expected.unit} at ${s.expected.day} days`, { own_history: "Own sponsorships", comparables: "Creators their kind and size", rate_card: "Provisional rate card" }[s.basis], s.version || RATE_CARD_VERSION, rec, `Converted at ${FX_RATE} pounds per dollar, an example rate`]);
    }
  }
  out.push([]);
  out.push([MADE_UP_LINE]);
  out.push([`Ratings, bands and percentiles: ${RATING_LABEL}. Prices are indicative suggestions, not offers. Model ${MODEL_VERSION}, rate card ${RATE_CARD_VERSION}, as of ${FIXTURE_NOW.slice(0, 10)}.`]);
  return out.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
