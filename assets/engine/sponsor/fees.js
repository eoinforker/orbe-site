/*
  Orbe's take rate on sponsorships, and the settlement of one booking.

  Free for creators: by default the brand pays Orbe's fee on top of the
  creator's price, so the creator keeps 100% of what they charge. Orbe earns
  only when a sponsorship completes: the fee is held with the brand's payment
  and released to Orbe in proportion to what the creator is paid. A
  cancellation refunds it; a shortfall reduces it.

  PROVISIONAL default (docs in README "Take rate"):
  - 15% on network deals, where Orbe matched the brand to the creator. Below
    beehiiv's Ad Network (about 20%), Agentio (20% of spend), SparkLoop's
    Partner Network (20% plus 3.5%) and Paved's marketplace (30%), and the
    same as Passionfroot's 15% sourcing fee; above flat 10% listing
    marketplaces (Swapstack, Collabstr), because Orbe also verifies delivery
    at source and enforces make-goods.
  - 5% on direct deals, where the creator brings their own sponsor and uses
    Orbe for verified delivery and safe payment. Passionfroot charges the same
    5% on creator-sourced deals.
  Replace with what brands accept and what wins creators, measured from
  completed bookings; every booking keeps the terms it was agreed on.
*/
import { BPS, applyBps, assertPence } from "./util.js";
export const DEFAULT_TAKE_RATE = { version: "2026.10-provisional", networkBps: 1500, directBps: 500, payer: "brand" };
export function validateTakeRate(r) {
    for (const bps of [r.networkBps, r.directBps]) {
        if (!Number.isInteger(bps) || bps < 0 || bps >= BPS / 2)
            throw new Error("A take rate must be whole basis points under 50%");
    }
    if (r.payer !== "brand" && r.payer !== "creator")
        throw new Error("The fee is paid by the brand or the creator");
}
export function feeTermsFor(source, rate = DEFAULT_TAKE_RATE) {
    validateTakeRate(rate);
    return { version: rate.version, bps: source === "network" ? rate.networkBps : rate.directBps, payer: rate.payer, source };
}
/** What the brand pays in advance into the partner, and how it splits if delivery is in full. */
export function fundingFor(price, terms) {
    assertPence(price.amount, "price");
    const fee = applyBps(price.amount, terms.bps);
    const total = terms.payer === "brand" ? price.amount + fee : price.amount;
    return { price, fee: { amount: fee, currency: price.currency }, total: { amount: total, currency: price.currency } };
}
/**
  How a funded booking pays out when the creator has earned a share of the
  price. The fee follows what the creator earns, so a refunded booking
  earns Orbe nothing. Rounding lands on the brand's refund, never on the creator.
*/
export function settle(price, terms, creatorShareBps) {
    if (!Number.isInteger(creatorShareBps) || creatorShareBps < 0 || creatorShareBps > BPS)
        throw new Error("A share is 0 to 10,000 basis points");
    const funded = fundingFor(price, terms).total.amount;
    const earned = applyBps(price.amount, creatorShareBps);
    const fee = applyBps(earned, terms.bps);
    const c = price.currency;
    if (terms.payer === "brand") {
        return { creatorShareBps, creatorPayout: { amount: earned, currency: c }, orbeFee: { amount: fee, currency: c }, brandRefund: { amount: funded - earned - fee, currency: c }, total: { amount: funded, currency: c } };
    }
    return { creatorShareBps, creatorPayout: { amount: earned - fee, currency: c }, orbeFee: { amount: fee, currency: c }, brandRefund: { amount: funded - earned, currency: c }, total: { amount: funded, currency: c } };
}
