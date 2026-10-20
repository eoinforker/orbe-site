/*
  The loop: predictions sealed before release, the outcomes that follow,
  how well the two agree, and the deal outcomes behind sponsorship prices.
  Data an agent cannot generate, because it only exists once a real work
  or a real deal has happened. Every file here is browser-safe (browser.ts).
*/
export { predict, predictRange, reachPart, seal, sealOf, verifySeal, verifyChain, canonicalJSON, isPrediction, daysSince, PREDICTOR_VERSION, HORIZON_DAYS, Z_QUARTILE } from "./predict.js";
export { outcomeFor, recordReading, dueReadings, HORIZONS, HORIZON_ORDER } from "./outcomes.js";
export { calibrate, score, statsOf, dominatedBy, MIN_COHORT, DOMINANCE_SHARE } from "./calibration.js";
export { validateDeal, countable, dealAggregates, renewalLine, PLACEMENTS } from "./deals.js";
