/*
  The sponsor module for the browser engine: formats, delivery stats,
  pricing and the rate cards, inventory, briefs, matching and the take rate.
  Payments, settlement, bookings and webhooks stay server side (index.ts);
  nothing here imports node: modules.
*/
export { SPONSOR_FORMATS, FORMAT_SPECS, specFor, specsForKind, finalWindow, unitsFor, SIZE_BANDS, sizeBandFor } from "./formats.js";
export { optIn, hasOptedIn } from "./consent.js";
export { deliveryStats, windowFor, STATS_DEFAULTS } from "./stats.js";
export { PROVISIONAL_RATE_CARDS, RATE_CARD_VERSION, rateCardFor } from "./ratecards.js";
export { suggestPrice, PRICING_DEFAULTS, BAND_ADJUSTMENT, UNEVEN_BELOW } from "./pricing.js";
export { DEFAULT_SETTINGS, buildInventory, RATING_LABEL } from "./inventory.js";
export { BRAND_TERMS, validateBrief, defaultJurisdictions } from "./campaigns.js";
export { MATCH_WEIGHTS, rankCreators, shortlist } from "./matching.js";
export { DEFAULT_TAKE_RATE, feeTermsFor, fundingFor, settle } from "./fees.js";
export { DEFAULT_SHORTFALL, suggestGuarantee, guaranteeMet, proRataShareBps } from "./guarantee.js";
export { formatMoney, formatCount } from "./util.js";
export { inventoryFromStats, previewBrief, sampleCandidates, TYPED_NOTE, SAMPLE_CREATORS_LABEL } from "./preview.js";
