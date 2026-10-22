/* Orbe Fix: know an upload underperformed creators its size, generate new titles and thumbnails through a router of models, check them, swap with approval, and keep and charge only on lift. */
export { diagnose, FIX_KIND, FIX_MIN_AGE_DAYS, FIX_MAX_AGE_DAYS, UNDER_Z, CTR_SHORTFALL } from "./diagnose.js";
export { generateTitles, generateThumbnails, generateJson, rulesTitles, titleRequest, thumbnailPrompt, TITLE_SYSTEM, TITLE_MAX, OPENROUTER_URL, FAL_URL, REPLICATE_URL } from "./router.js";
export { checkOption, gate, SUBJECT_MIN_LETTERS, SHOUTING_SHARE } from "./check.js";
export { judgeLift, sealBaseline, verifyBaseline, expectedGain, viewsShare, BASELINE_RULE, FIX_VERSION, MIN_WINDOW_DAYS, LIFT_MIN, FIX_FEE } from "./lift.js";
export { propose, approve, applied, undo, judge, youtubeCalls, FixError, YT_VIDEOS, YT_THUMBNAILS } from "./swap.js";
export { readRetention, RETENTION_VERSION, DROP_FACTOR, DROP_MIN, TYPICAL_BAND, MAX_CUTS } from "./retention.js";
