/*
  The deals engine for browsers and the MCP server: rules, decisions and
  template drafts, with no model, no storage and no network. draft.ts is
  left out on purpose: it imports the model router.
*/
export { DEFAULT_LIMITS, FORMAT_PLURAL, LimitsError, parseLimits, summariseRules } from "./limits.js";
export { AGENT_MAX_COUNTERS, FORMAT_WORDS, moneyText } from "./judge.js";
export { DECIDE_VERSION, GRACE_MINUTES, RULE_ORDER, UNIT_WORDS, autonomyOf, counterLadder, decideOffer } from "./decide.js";
export { DRAFTED_LINE, VOICE_KINDS, sentByLine, voiceDraft } from "./voice.js";
