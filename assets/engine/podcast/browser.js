/*
  The podcast module for the browser engine: the prefix and its set-up
  steps, the feed reader and prefix check, the podcast:txt code, the
  counter and dashboard view models, smart links, charts, promos and the
  plausibility model, plus the labelled sample dashboard. Nothing here
  imports node: modules; the measurement server, salts, file logs, owner
  emails and the public-signal clients stay in index.ts.
*/
export { PROVENANCE_METHODS } from "../core/types.js";
export { DEFAULT_PREFIX_BASE, SHOW_ID, isShowId, prefixFor, prefixUrl, parsePrefixPath, isSafeTarget, prefixChain, KNOWN_PREFIXES, suggestShowId } from "./prefix.js";
export { HOST_HOWTO, stepsFor } from "./howto.js";
export { checkPrefix, hostOf, HOST_DOMAINS, EPISODES_CHECKED } from "./verify.js";
export { readFeedDetails } from "./feed.js";
export { txtCode, txtTag } from "./txt.js";
export { countDownloads, MIN_SECONDS, MAX_DOWNLOADS_PER_LISTENER_DAY } from "./iab.js";
export { isBot, appOf, platformOf } from "./useragents.js";
export { dailyStats, totals, filesFromFeed } from "./aggregate.js";
export { buildDashboard, buildPublicStats, summariseClicks, episodeRows, roughly, PUBLIC_MIN_SHARE, PUBLIC_MIN_DOWNLOADS } from "./dashboard.js";
export { APPS, APP_NAMES, appLinks, chooseApp, landingPage, clickSource, isAppKey } from "./smartlinks.js";
export { chartName, BIG_CLIMB_PLACES } from "./charts.js";
export { MIN_REPORTABLE, ROUND_TO, PROMO_WINDOW_DAYS } from "./promos.js";
export { assessPlausibility, PLAUSIBILITY_RULES, RULES_VERSION } from "./plausibility.js";
export { RAW_LOG_DAYS } from "./logs.js";
export { sampleDashboard, SAMPLE_LABEL } from "./sample.js";
