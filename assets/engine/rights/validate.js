/*
  Shape checks for the rights record. Each returns a list of plain-English
  errors, empty when the thing is well formed. Authority (who may do what) is
  checked when the events are replayed, in state.ts.
*/
import { isInstant, isTime, timeMs } from "./canon.js";
import { CHANNELS, CONSENT_SCOPES, EVENT_TYPES, MEDIA, PARTY_KINDS, USES, WHOLE, WORK_KINDS, FORMAT, FORMAT_VERSION } from "./types.js";
const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PARTY = new RegExp(`^(${PARTY_KINDS.join("|")}):[a-z0-9][a-z0-9-]{0,62}$`);
const TERRITORY = /^(WW|[A-Z]{2})$/;
const CURRENCY = /^[A-Z]{3}$/;
const HASH = /^[0-9a-f]{64}$/;
export const isId = (v) => typeof v === "string" && ID.test(v);
export const isParty = (v) => typeof v === "string" && PARTY.test(v);
export const partyKind = (p) => p.slice(0, p.indexOf(":"));
export const isChannel = (v) => typeof v === "string" && (CHANNELS.includes(v) || /^other:[a-z0-9-]{1,32}$/.test(v));
const text = (v, max = 200) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
function need(errs, ok, msg) {
    if (!ok)
        errs.push(msg);
}
export function checkWork(w, at = "work") {
    const e = [];
    if (!isObj(w))
        return [`${at} must be an object`];
    need(e, isId(w.id), `${at}.id must be a lowercase id`);
    need(e, isParty(w.creator) && partyKind(String(w.creator)) === "creator", `${at}.creator must be a creator party, like creator:ada`);
    need(e, WORK_KINDS.includes(w.kind), `${at}.kind must be one of ${WORK_KINDS.join(", ")}`);
    need(e, text(w.title), `${at}.title must be 1 to 200 characters`);
    need(e, isTime(w.created), `${at}.created must be a date or an RFC 3339 time`);
    need(e, w.fingerprint === undefined || text(w.fingerprint), `${at}.fingerprint, when given, must be a string`);
    return e;
}
export function checkOwners(owners, at = "owners") {
    if (!Array.isArray(owners) || owners.length === 0)
        return [`${at} must be a non-empty list`];
    const e = [];
    const seen = new Set();
    let sum = 0;
    owners.forEach((o, i) => {
        if (!isObj(o) || !isParty(o.party) || !Number.isSafeInteger(o.shareBps) || o.shareBps <= 0) {
            e.push(`${at}[${i}] needs a party and a positive whole shareBps`);
            return;
        }
        if (seen.has(o.party))
            e.push(`${at}[${i}] repeats ${o.party}`);
        seen.add(o.party);
        sum += o.shareBps;
    });
    if (!e.length && sum !== WHOLE)
        e.push(`${at} shares must add up to ${WHOLE} basis points, not ${sum}`);
    return e;
}
export function checkConsent(c, at = "consent") {
    const e = [];
    if (!isObj(c))
        return [`${at} must be an object`];
    need(e, isId(c.id), `${at}.id must be a lowercase id`);
    need(e, isParty(c.creator) && partyKind(String(c.creator)) === "creator", `${at}.creator must be a creator party`);
    need(e, isParty(c.team) && c.team !== c.creator, `${at}.team must be another party`);
    need(e, CONSENT_SCOPES.includes(c.scope), `${at}.scope must be one of ${CONSENT_SCOPES.join(", ")}`);
    need(e, c.until === undefined || isTime(c.until), `${at}.until, when given, must be a date or time`);
    return e;
}
export function checkGrant(g, at = "grant") {
    const e = [];
    if (!isObj(g))
        return [`${at} must be an object`];
    need(e, isId(g.id), `${at}.id must be a lowercase id`);
    need(e, isParty(g.brand), `${at}.brand must be a party, like brand:harbour-oats`);
    need(e, isId(g.work), `${at}.work must be a work id`);
    need(e, Array.isArray(g.channels) && g.channels.length > 0 && g.channels.every(isChannel) && new Set(g.channels).size === g.channels.length, `${at}.channels must list one or more known channels, each once`);
    need(e, MEDIA.includes(g.media), `${at}.media must be organic, paid or both`);
    need(e, Array.isArray(g.territory) && g.territory.length > 0 && g.territory.every((t) => typeof t === "string" && TERRITORY.test(t)), `${at}.territory must list ISO country codes or WW`);
    need(e, isTime(g.start), `${at}.start must be a date or time`);
    need(e, isTime(g.end), `${at}.end must be a date or time`);
    if (isTime(g.start) && isTime(g.end))
        need(e, timeMs(g.end, "end") > timeMs(g.start), `${at}.end must come after its start`);
    const f = g.fee;
    need(e, f === null || (isObj(f) && Number.isSafeInteger(f.amount) && f.amount >= 0 && typeof f.currency === "string" && CURRENCY.test(f.currency)), `${at}.fee must be null or { amount in minor units, currency }`);
    need(e, typeof g.whitelisting === "boolean", `${at}.whitelisting must be true or false`);
    need(e, typeof g.ads === "boolean", `${at}.ads must be true or false`);
    if (g.media === "organic")
        need(e, g.whitelisting !== true && g.ads !== true, `${at}: an organic-only grant cannot allow whitelisting or ads`);
    need(e, g.note === undefined || text(g.note, 500), `${at}.note, when given, must be up to 500 characters`);
    return e;
}
export function checkUsage(u, at = "usage") {
    const e = [];
    if (!isObj(u))
        return [`${at} must be an object`];
    need(e, isId(u.id), `${at}.id must be a lowercase id`);
    need(e, isParty(u.brand), `${at}.brand must be a party`);
    need(e, isId(u.work), `${at}.work must be a work id`);
    need(e, isChannel(u.channel), `${at}.channel must be a known channel`);
    need(e, USES.includes(u.use), `${at}.use must be one of ${USES.join(", ")}`);
    need(e, isTime(u.from), `${at}.from must be a date or time`);
    need(e, u.until === null || isTime(u.until), `${at}.until must be null or a date or time`);
    need(e, u.where === undefined || text(u.where, 300), `${at}.where, when given, must be up to 300 characters`);
    return e;
}
/** The body of one event: its type, actor, time and data. */
export function checkEventBody(ev, at = "event") {
    if (!isObj(ev))
        return [`${at} must be an object`];
    const e = [];
    need(e, isInstant(ev.at), `${at}.at must be an RFC 3339 time with an offset`);
    need(e, isParty(ev.actor), `${at}.actor must be a party, like creator:ada`);
    if (!EVENT_TYPES.includes(ev.type))
        return [...e, `${at}.type must be one of ${EVENT_TYPES.join(", ")}`];
    const d = ev.data;
    if (!isObj(d))
        return [...e, `${at}.data must be an object`];
    const k = `${at}.data`;
    switch (ev.type) {
        case "work.registered":
            e.push(...checkWork(d.work, `${k}.work`));
            break;
        case "ownership.set":
            need(e, isId(d.work), `${k}.work must be a work id`);
            e.push(...checkOwners(d.owners, `${k}.owners`));
            break;
        case "ownership.transferred":
            need(e, isId(d.work), `${k}.work must be a work id`);
            need(e, isParty(d.from) && isParty(d.to) && d.from !== d.to, `${k}.from and .to must be two different parties`);
            need(e, Number.isSafeInteger(d.shareBps) && d.shareBps > 0 && d.shareBps <= WHOLE, `${k}.shareBps must be 1 to ${WHOLE}`);
            break;
        case "consent.granted":
            e.push(...checkConsent(d.consent, `${k}.consent`));
            break;
        case "consent.revoked":
            need(e, isId(d.id), `${k}.id must be a consent id`);
            need(e, d.reason === undefined || text(d.reason, 500), `${k}.reason, when given, must be up to 500 characters`);
            break;
        case "grant.issued":
            e.push(...checkGrant(d.grant, `${k}.grant`));
            break;
        case "grant.extended":
            need(e, isId(d.id), `${k}.id must be a grant id`);
            need(e, isTime(d.end), `${k}.end must be a date or time`);
            break;
        case "grant.revoked":
            need(e, isId(d.id), `${k}.id must be a grant id`);
            need(e, text(d.reason, 500), `${k}.reason must say why, in up to 500 characters`);
            break;
        case "usage.reported":
            e.push(...checkUsage(d.usage, `${k}.usage`));
            break;
        case "usage.ended":
            need(e, isId(d.id), `${k}.id must be a usage id`);
            need(e, isTime(d.until), `${k}.until must be a date or time`);
            break;
    }
    return e;
}
/** A whole record's envelope and every event's shape (not the chain: see verifyChain). */
export function checkRecordShape(r) {
    if (!isObj(r))
        return ["The file is not a JSON object"];
    const e = [];
    need(e, r.format === FORMAT, `format must be "${FORMAT}"`);
    need(e, r.version === FORMAT_VERSION, `version must be "${FORMAT_VERSION}" (this reader knows v${FORMAT_VERSION} only)`);
    need(e, isId(r.id), "id must be a lowercase id");
    need(e, r.title === undefined || text(r.title), "title, when given, must be up to 200 characters");
    if (!Array.isArray(r.events))
        return [...e, "events must be a list"];
    r.events.forEach((ev, i) => {
        const at = `events[${i}]`;
        e.push(...checkEventBody(ev, at));
        if (isObj(ev)) {
            need(e, ev.seq === i, `${at}.seq must be ${i}`);
            need(e, typeof ev.prev === "string" && HASH.test(ev.prev), `${at}.prev must be 64 lowercase hex characters`);
            need(e, typeof ev.hash === "string" && HASH.test(ev.hash), `${at}.hash must be 64 lowercase hex characters`);
            const extra = Object.keys(ev).filter((k) => !["seq", "at", "actor", "type", "data", "prev", "hash"].includes(k));
            need(e, extra.length === 0, `${at} has fields the format does not define: ${extra.join(", ")}`);
        }
    });
    return e;
}
