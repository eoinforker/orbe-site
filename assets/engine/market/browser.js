/*
  The market module for the browser engine: the indicative valuation, the
  take-rate fee schedule (seller's fee, buyer's premium, settlement) and the
  tail clause terms. Escrow webhooks and deals stay server side (index.ts);
  nothing here imports node: modules.
*/
export { valuate, INDICATIVE_LABEL, VALUATION_MODEL_VERSION, BASE_MULTIPLE, BASE_HALF_WIDTH, VERIFIED_WEIGHT, MIN_MONTHS } from "./valuation.js";
export { TAKE_RATE, TAKE_RATE_LAUNCH, MEMBERSHIP_SCHEDULE, DEFAULT_MARKET_SCHEDULE, successFee, buyerPremium, settlement, splitEscrowFee, DEFAULT_FEE_SCHEDULE, DEFAULT_BUYER_PREMIUM, DEFAULT_VAT_RATE_BPS, } from "./fees.js";
export { BUYER_TERMS, BUYER_TERMS_VERSION, assessOffPlatformCompletion, addCalendarMonths } from "./introductions.js";
export { formatMoney } from "./money.js";
export { tailScenario } from "./preview.js";
