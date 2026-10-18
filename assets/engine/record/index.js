/*
  The record module's public surface. Everything else in this folder is an
  implementation detail and may change.
*/
export { buildRecord } from "./record.js";
export { buildReport, redact, bandFor, DISCLAIMER, REPORT_VERSION, VERDICT_RULES, PUBLIC_REVENUE_BANDS } from "./report.js";
export { renderHtml } from "./render-html.js";
export { renderMarkdown } from "./render-markdown.js";
export { buildPublicProfile, withoutYouTubeAnalytics, freshnessStatement, PROFILE_BASE_URL } from "./profile.js";
export { gate, isLive, liveConsent } from "./consent.js";
export { TOLERANCES } from "./crosscheck.js";
export { FRESHNESS_WINDOWS, OVERLAPS, defaultMeasure, freshnessOf } from "./sources.js";
export { THRESHOLDS } from "./metrics.js";
export { AUDIENCE_RULES, CADENCE_RULES } from "./audience.js";
export { RISK_RULES } from "./flags.js";
export { formatFigure, textToString } from "./figures.js";
export { PRIVATE_BY_DEFAULT } from "./types.js";
