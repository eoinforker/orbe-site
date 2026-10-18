/*
  What Orbe charges, as pure functions in integer pence.

  One rule (MODEL.md Part 6): Orbe earns a percentage when money moves. Sellers
  pay a success fee from the proceeds on completion, and nothing if the
  business does not sell. Buyers pay a premium on top of the price at
  completion, instead of memberships. Escrow is passed through at the
  partner's cost. Every number lives in a schedule object rather than in the
  code, and the memberships model of Part 3 stays available as
  MEMBERSHIP_SCHEDULE so the two can be compared.
*/
import { BPS, applyBps, assertPence, pounds } from "./money.js";
/** MODEL.md Part 3: 8% to £500k, 5% on £500k to £2M, 3% above, £4,000 minimum. No launch rate by default. */
export const DEFAULT_FEE_SCHEDULE = {
    version: "2026.10-proposed",
    currency: "GBP",
    tiers: [
        { upTo: pounds(500_000), rateBps: 800 },
        { upTo: pounds(2_000_000), rateBps: 500 },
        { upTo: null, rateBps: 300 },
    ],
    minimum: pounds(4_000),
    launch: null,
};
/** MODEL.md open decision 2: "5% for the first 20 deals". Opt in by passing this schedule. */
export const LAUNCH_FEE_SCHEDULE = {
    ...DEFAULT_FEE_SCHEDULE,
    version: "2026.10-launch",
    launch: { rateBps: 500, firstDeals: 20, minimumApplies: true },
};
export function validateSchedule(s) {
    if (s.tiers.length === 0)
        throw new Error("A fee schedule needs at least one tier");
    let last = 0;
    s.tiers.forEach((t, i) => {
        if (!Number.isInteger(t.rateBps) || t.rateBps < 0 || t.rateBps > BPS)
            throw new Error(`Tier ${i} rate out of range`);
        const isLast = i === s.tiers.length - 1;
        if (t.upTo === null && !isLast)
            throw new Error("Only the last tier can be open-ended");
        if (isLast && t.upTo !== null)
            throw new Error("The last tier must be open-ended");
        if (t.upTo !== null) {
            assertPence(t.upTo, "Tier ceiling");
            if (t.upTo <= last)
                throw new Error("Tier ceilings must rise");
            last = t.upTo;
        }
    });
    assertPence(s.minimum, "Minimum fee");
    if (s.minimum < 0)
        throw new Error("Minimum fee cannot be negative");
    if (s.launch) {
        if (!Number.isInteger(s.launch.firstDeals) || s.launch.firstDeals < 0)
            throw new Error("Launch deal count must be a whole number");
        if (!Number.isInteger(s.launch.rateBps) || s.launch.rateBps < 0 || s.launch.rateBps > BPS)
            throw new Error("Launch rate out of range");
    }
}
/** The marginal slices of a price under a set of tiers. */
export function feeSlices(price, tiers) {
    const slices = [];
    let from = 0;
    for (const t of tiers) {
        if (price <= from)
            break;
        const to = t.upTo === null ? price : Math.min(price, t.upTo);
        slices.push({ from, to, rateBps: t.rateBps, fee: applyBps(to - from, t.rateBps) });
        from = to;
    }
    return slices;
}
/**
  The seller's success fee on a completed sale.
  `dealNumber` is this deal's 1-based position among Orbe's completed deals; it only
  matters when the schedule carries a launch rate.
*/
export function successFee(salePrice, schedule = DEFAULT_FEE_SCHEDULE, opts = {}) {
    validateSchedule(schedule);
    if (salePrice.currency !== schedule.currency)
        throw new Error(`Schedule is in ${schedule.currency}, price is in ${salePrice.currency}`);
    const price = salePrice.amount;
    assertPence(price, "Sale price");
    if (price <= 0)
        throw new Error("Sale price must be positive");
    const launch = schedule.launch;
    const onLaunch = launch !== null && opts.dealNumber !== undefined && opts.dealNumber >= 1 && opts.dealNumber <= launch.firstDeals;
    if (launch && opts.dealNumber === undefined) {
        // Silently charging the full rate during a launch offer would break a promise to a creator.
        throw new Error("This schedule has a launch rate, so the deal number is required");
    }
    const slices = onLaunch ? [{ from: 0, to: price, rateBps: launch.rateBps, fee: applyBps(price, launch.rateBps) }] : feeSlices(price, schedule.tiers);
    const tiered = slices.reduce((a, s) => a + s.fee, 0);
    const minimumApplies = !onLaunch || launch.minimumApplies;
    let fee = tiered;
    let minimumApplied = false;
    if (minimumApplies && tiered < schedule.minimum) {
        fee = schedule.minimum;
        minimumApplied = true;
    }
    // A fee larger than the price would leave the seller owing money for selling; never do that.
    const cappedAtPrice = fee > price;
    if (cappedAtPrice)
        fee = price;
    return {
        salePrice,
        fee: { amount: fee, currency: salePrice.currency },
        effectiveRateBps: Math.round((fee * BPS) / price),
        slices,
        minimumApplied,
        launchRateApplied: onLaunch,
        cappedAtPrice,
        scheduleVersion: schedule.version,
    };
}
/** MODEL.md Part 3, the memberships model: £1,200 and £9,000 a year, reports £2,500 or £1,500. Prices exclude VAT. */
export const MEMBERSHIP_BUYER_PRICING = {
    version: "2026.10-proposed",
    currency: "GBP",
    access: "paid",
    plans: { member: pounds(1_200), institutional: pounds(9_000) },
    report: { standard: pounds(2_500), member: pounds(1_500) },
    reportCharge: "upfront",
};
/*
  MODEL.md Part 6, the take rate: access is free but vetted, and an Orbe Verified
  report is included, charged at £1,500 only if the buyer walks away after
  receiving it. £1,500 is the old member price, at the bottom of Flippa's
  reported $1.5k to $2.5k diligence packs and about a quarter of a $6,490 QoE
  Lite. PROVISIONAL: replace with what walk-away buyers actually accept.
*/
export const TAKE_RATE_BUYER_PRICING = {
    version: "2026.10-take-rate",
    currency: "GBP",
    access: "vetted",
    plans: { member: 0, institutional: 0 },
    report: { standard: pounds(1_500), member: pounds(1_500) },
    reportCharge: "walk_away",
};
/** The take rate is the default (MODEL.md Part 6); the memberships pricing stays available as an alternative. */
export const DEFAULT_BUYER_PRICING = TAKE_RATE_BUYER_PRICING;
export const membershipPrice = (plan, pricing = DEFAULT_BUYER_PRICING) => ({
    amount: pricing.plans[plan],
    currency: pricing.currency,
});
/** Institutional members get "everything above", so they pay the member price for reports too. */
export const reportPrice = (plan, pricing = DEFAULT_BUYER_PRICING) => ({
    amount: plan === "none" ? pricing.report.standard : pricing.report.member,
    currency: pricing.currency,
});
/*
  The buyer's premium: a percentage of the price the buyer pays on top, at
  completion, in place of memberships (MODEL.md Part 6). It uses the same marginal
  tier machinery as the seller's fee. PROVISIONAL rate: 2% to £2M and 1% above,
  with a £1,000 minimum. Comparables (MODEL.md Part 6 has the sources): TrustMRR
  splits its 3% closing fee 50:50, so its buyers pay 1.5%; Ten-X, an online
  property auction venue, charges buyers 3%; Palico charges buyers of fund
  secondaries 1% on the first $10M, tiering down; auction houses charge 20% to
  28%, a different market. With the 8% seller fee the total on a typical £220k
  deal is 10%, level with Flippa's seller fee alone and below Empire Flippers' 15%.
*/
export const DEFAULT_BUYER_PREMIUM = {
    version: "2026.10-buyer-premium",
    currency: "GBP",
    tiers: [
        { upTo: pounds(2_000_000), rateBps: 200 },
        { upTo: null, rateBps: 100 },
    ],
    minimum: pounds(1_000),
    launch: null,
};
/** The buyer's premium on a completed sale, or null when the schedule has none. */
export function buyerPremium(salePrice, schedule = DEFAULT_BUYER_PREMIUM) {
    if (schedule === null)
        return null;
    if (schedule.launch)
        throw new Error("The buyer's premium has no launch rate");
    return successFee(salePrice, schedule);
}
/*
  MODEL.md Part 6: Orbe earns a percentage when money moves, and charges no
  fixed fees except the financing file fee. Investments: 20% carry is the
  common syndicate lead's carry (AngelList leads, SeedLegals' guide), and 2% is a
  small one-off fee, under the 5% to 7% some UK leads charge and level with the
  2.5% monitoring fee the Angel CoFund allows. Both are the partner vehicle's
  terms. Orbe takes a share of the one-off fee only: its carry share is zero
  until the founder decides whether carry is compatible with never taking a
  stake. PROVISIONAL throughout.
*/
export const TAKE_RATE = {
    name: "take_rate",
    version: "2026.10-take-rate",
    seller: DEFAULT_FEE_SCHEDULE,
    buyerPremium: DEFAULT_BUYER_PREMIUM,
    buyers: TAKE_RATE_BUYER_PRICING,
    tailMonths: 24,
    sponsorship: { networkBps: 1500, directBps: 500, payer: "brand" },
    investments: { carryBps: 2000, dealFeeBps: 200, orbeFeeShare: null, orbeCarryShare: 0 },
    financingFilePrice: pounds(250),
};
/** The take rate with the seller's launch rate (5% for the first 20 deals): MODEL.md open decision. */
export const TAKE_RATE_LAUNCH = { ...TAKE_RATE, version: "2026.10-take-rate-launch", seller: LAUNCH_FEE_SCHEDULE };
/**
  The memberships model as MODEL.md Part 3 first set it out: seller success fee,
  paid memberships, reports bought up front, no buyer's premium and no tail
  clause. Kept so the original tables stay reproducible and the two can be compared.
*/
export const MEMBERSHIP_SCHEDULE = {
    name: "memberships",
    version: "2026.10-memberships",
    seller: DEFAULT_FEE_SCHEDULE,
    buyerPremium: null,
    buyers: MEMBERSHIP_BUYER_PRICING,
    tailMonths: null,
    sponsorship: null,
    investments: null,
    financingFilePrice: pounds(250),
};
export const DEFAULT_MARKET_SCHEDULE = TAKE_RATE;
export function validateMarketSchedule(m) {
    validateSchedule(m.seller);
    if (m.buyerPremium) {
        validateSchedule(m.buyerPremium);
        if (m.buyerPremium.launch)
            throw new Error("The buyer's premium has no launch rate");
        if (m.buyerPremium.currency !== m.seller.currency)
            throw new Error("Seller fee and buyer's premium must share a currency");
    }
    if (m.tailMonths !== null && (!Number.isInteger(m.tailMonths) || m.tailMonths < 1 || m.tailMonths > 60))
        throw new Error("A tail is 1 to 60 whole months");
    if (m.sponsorship) {
        for (const bps of [m.sponsorship.networkBps, m.sponsorship.directBps])
            if (!Number.isInteger(bps) || bps < 0 || bps >= BPS / 2)
                throw new Error("A sponsorship take rate is whole basis points under 50%");
    }
    if (m.investments) {
        const { carryBps, dealFeeBps, orbeFeeShare, orbeCarryShare } = m.investments;
        if (!Number.isInteger(carryBps) || carryBps < 0 || carryBps > 3000)
            throw new Error("Carry must be 0% to 30%");
        if (!Number.isInteger(dealFeeBps) || dealFeeBps < 0 || dealFeeBps > 1000)
            throw new Error("The investment fee must be 0% to 10%");
        if (orbeFeeShare !== null && !(orbeFeeShare >= 0 && orbeFeeShare <= 1))
            throw new Error("Orbe's share of the fee is 0 to 1");
        if (!(orbeCarryShare >= 0 && orbeCarryShare <= 1))
            throw new Error("Orbe's share of the carry is 0 to 1");
    }
    assertPence(m.financingFilePrice, "Financing file price");
    if (m.buyers.access === "vetted" && (m.buyers.plans.member !== 0 || m.buyers.plans.institutional !== 0))
        throw new Error("Vetted access is free");
}
export const DEFAULT_ESCROW_SPLIT = { buyerBps: 5000, sellerBps: 5000 };
/**
  Splits the escrow partner's fee between the parties. Orbe adds nothing.
  An odd penny goes to the seller, because the seller's share is taken from proceeds
  by the partner and so never needs a separate payment.
*/
export function splitEscrowFee(partnerFee, split = DEFAULT_ESCROW_SPLIT) {
    assertPence(partnerFee.amount, "Escrow fee");
    if (partnerFee.amount < 0)
        throw new Error("Escrow fee cannot be negative");
    if (split.buyerBps + split.sellerBps !== BPS || split.buyerBps < 0 || split.sellerBps < 0)
        throw new Error("Escrow split must add up to 100%");
    const buyer = Math.floor((partnerFee.amount * split.buyerBps) / BPS);
    return { buyer: { amount: buyer, currency: partnerFee.currency }, seller: { amount: partnerFee.amount - buyer, currency: partnerFee.currency } };
}
/*
  UK standard rate of VAT, 20%. Orbe's fees and prices are quoted before VAT.
  Whether VAT applies to a given seller or buyer (reverse charge for overseas
  businesses, for example) is a place-of-supply question for Orbe's accountant,
  so it is a parameter everywhere rather than a constant buried in a sum.
*/
export const DEFAULT_VAT_RATE_BPS = 2000;
/** The money flow of one completed deal, as instructions for the escrow partner. Orbe never holds any of it. */
export function settlement(salePrice, partnerFee, opts = {}) {
    if (partnerFee.currency !== salePrice.currency)
        throw new Error("Escrow fee and price must share a currency");
    const fee = successFee(salePrice, opts.schedule ?? DEFAULT_FEE_SCHEDULE, { dealNumber: opts.dealNumber });
    const premium = buyerPremium(salePrice, opts.buyerPremium === undefined ? DEFAULT_BUYER_PREMIUM : opts.buyerPremium);
    const parts = splitEscrowFee(partnerFee, opts.split ?? DEFAULT_ESCROW_SPLIT);
    const c = salePrice.currency;
    const vatRate = opts.vatRateBps ?? DEFAULT_VAT_RATE_BPS;
    const vat = applyBps(fee.fee.amount, vatRate);
    const premiumNet = premium?.fee.amount ?? 0;
    const premiumVat = applyBps(premiumNet, vatRate);
    const orbe = fee.fee.amount + vat + premiumNet + premiumVat;
    const sellerReceives = salePrice.amount - fee.fee.amount - vat - parts.seller.amount;
    if (sellerReceives < 0)
        throw new Error("Fees exceed the sale price");
    return {
        salePrice,
        successFee: fee,
        feeVat: { amount: vat, currency: c },
        buyerPremium: premium,
        premiumVat: { amount: premiumVat, currency: c },
        escrow: { partnerFee, buyerShare: parts.buyer, sellerShare: parts.seller },
        buyerPays: { amount: salePrice.amount + premiumNet + premiumVat + parts.buyer.amount, currency: c },
        sellerReceives: { amount: sellerReceives, currency: c },
        orbeReceives: { amount: orbe, currency: c },
    };
}
