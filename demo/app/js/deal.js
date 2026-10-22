/* Offers and bookings, said the same way to a creator and to a brand. */
import { unitOf } from "./terms.js";
import { bps, count, day, h, money } from "./ui.js";

export const OFFER_STATES = { sent: "Waiting for the creator", countered: "Countered", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn", expired: "Expired" };

export const BOOKING_STATES = {
  awaiting_funds: "Waiting for funds",
  in_production: "In production",
  draft_review: "Draft with the brand",
  changes_requested: "Changes asked for",
  ready: "Ready to publish",
  live: "Live, being measured",
  short: "Short of the guarantee",
  make_good: "Make-good due",
  verified: "Delivery verified",
  paid: "Paid",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

export const TONE = { paid: "good", verified: "good", live: "good", accepted: "good", short: "warn", make_good: "warn", disputed: "warn", changes_requested: "warn", declined: "off", withdrawn: "off", expired: "off", cancelled: "off" };

/** The creator's price with Orbe's fee on top, which the brand pays. */
export function withFee(price, feeBps) {
  return { amount: price.amount + Math.round((price.amount * feeBps) / 10_000), currency: price.currency };
}

/** The guarantee and its floor, in one sentence, from what the offer or booking froze. */
export function guaranteeLine(x) {
  const unit = unitOf(x.format, x.kind);
  if (!x.guarantee) return "No delivery guarantee: the creator is paid once the work is live, disclosed and verified.";
  const s = x.shortfall;
  return `Guaranteed ${count(x.guarantee.units)} ${unit} at ${x.guarantee.day} ${x.guarantee.day === 1 ? "day" : "days"}. Within ${bps(s.toleranceBps)} counts as delivered. If it falls short: a make-good within ${s.makeGoodDays} days, or paid in proportion, never under ${bps(s.floorBps)} of the price.`;
}

export const priceLines = (x) => [
  ["Creator's price", money(x.price)],
  [`Orbe's fee (${bps(x.fee.bps)}, paid by the ${x.fee.payer})`, money({ amount: withFee(x.price, x.fee.bps).amount - x.price.amount, currency: x.price.currency })],
  ["The brand pays", money(withFee(x.price, x.fee.bps))],
];

export const windowLine = (w) => `${day(w.start)} to ${day(w.end)}`;

/** What Orbe read for each window of a booking. */
export function measured(b) {
  const unit = unitOf(b.format, b.kind);
  if (!b.measurements?.length) return null;
  return h("ul", { class: "ap-plain" }, b.measurements.map((m) => h("li", null, `${count(m.units)} ${unit} at ${m.day} ${m.day === 1 ? "day" : "days"}, read ${day(m.recordedAt)} (${m.how.replaceAll("_", " ")})`)));
}

/** A linked work's disclosure check, rule by rule where something needs attention. */
export function disclosure(w) {
  const d = w.disclosure;
  if (!d) return null;
  const said = { pass: "Disclosure checked: every required rule is met.", needs_attestation: "Disclosure: nothing failed, but some rules need your word.", fail: "Disclosure: a required rule is missing or weak." }[d.status] ?? d.status;
  const open = d.results.filter((r) => r.status !== "met" && r.status !== "attested");
  return h("div", null, h("p", { class: d.status === "fail" ? "ap-warn" : "ap-note" }, said), open.length ? h("ul", { class: "ap-plain" }, open.map((r) => h("li", null, `${r.rule}: ${r.status}. ${r.evidence}`))) : null);
}
