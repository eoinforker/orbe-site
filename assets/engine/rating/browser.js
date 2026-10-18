/* The rating engine for the browser: everything in index.ts except what needs the file system. */
export { rate, rateWork, rateWorks, topStat, focusAreas, bandFor, isRated, specFor, RATING_BANDS, RATING_SCALE } from "./rate.js";
export { personalBests, personalBestLine, recordMetric } from "./bests.js";
export { explain } from "./explain.js";
export { RATING_LABEL, RATING_NOTICE, ESTIMATE_NOTICE, ratingNotice, attributionFor, PLATFORM_NAME, MATHS_URL } from "./label.js";
export { MODEL_VERSION, PROVISIONAL_PRIORS, provisionalPriors, priorFor } from "./priors.js";
export { SPECS } from "./kinds.js";
export { signed } from "./format.js";
export { fixtureSnapshot, FIXTURE_NOW } from "./fixtures.js";
