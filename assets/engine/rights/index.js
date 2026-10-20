/* The rights module: Orbe Rights Record v0. Works, chain of title, consent scopes, usage grants, an append-only hash-chained history, and the checks a brand runs on it. See SPEC.md. */
export { FORMAT, FORMAT_VERSION, GENESIS, WHOLE, PARTY_KINDS, WORK_KINDS, CONSENT_SCOPES, SCOPE_WORDS, CHANNELS, MEDIA, USES, EVENT_TYPES } from "./types.js";
export { canonical, timeMs, instantMs, isDate, isInstant, isTime, daysBetween } from "./canon.js";
export { checkWork, checkOwners, checkConsent, checkGrant, checkUsage, checkEventBody, checkRecordShape, isId, isParty, isChannel, partyKind } from "./validate.js";
export { emptyState, hasConsent, mayLicense, applyEvent, currentState, grantStatus, expiring, canUse, conflicts, endLabel } from "./state.js";
export { hashEvent, verifyChain, createRecord, append } from "./chain.js";
export { exportJson, importJson, expiryCalendar } from "./io.js";
