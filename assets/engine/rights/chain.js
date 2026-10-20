/*
  The hash chain. Each event's hash is SHA-256 over the canonical JSON of
  { seq, at, actor, type, data, prev }, and prev is the hash before it (64
  zeros for the first). Change any byte of any event and every hash after it
  stops matching, so the history is tamper-evident.
*/
import { sha256Hex } from "../core/hash.js";
import { canonical, timeMs } from "./canon.js";
import { checkEventBody, isId } from "./validate.js";
import { applyEvent, currentState } from "./state.js";
import { FORMAT, FORMAT_VERSION, GENESIS } from "./types.js";
export function hashEvent(e) {
    return sha256Hex(canonical({ seq: e.seq, at: e.at, actor: e.actor, type: e.type, data: e.data, prev: e.prev }));
}
/** Check every link: sequence, prev, the hash itself, and time never going backwards. */
export function verifyChain(events) {
    let prev = GENESIS;
    let last = -Infinity;
    for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.seq !== i)
            return { ok: false, seq: i, reason: `Event ${i} says it is number ${e.seq}` };
        if (e.prev !== prev)
            return { ok: false, seq: i, reason: `Event ${i} does not point at the event before it` };
        let h;
        try {
            h = hashEvent(e);
        }
        catch (err) {
            return { ok: false, seq: i, reason: `Event ${i} cannot be hashed: ${err.message}` };
        }
        if (h !== e.hash)
            return { ok: false, seq: i, reason: `Event ${i} has been changed since it was written: its hash no longer matches` };
        let t;
        try {
            t = timeMs(e.at);
        }
        catch {
            return { ok: false, seq: i, reason: `Event ${i} has no valid time` };
        }
        if (t < last)
            return { ok: false, seq: i, reason: `Event ${i} is dated before the event it follows` };
        last = t;
        prev = e.hash;
    }
    return { ok: true, head: prev, length: events.length };
}
export function createRecord(id, title) {
    if (!isId(id))
        throw new Error("A record id is lowercase letters, digits, dots, dashes or underscores");
    return { format: FORMAT, version: FORMAT_VERSION, id, ...(title ? { title } : {}), events: [] };
}
/**
  Add one event to the end of a record, after checking its shape, its time and
  its actor's authority. Returns a new record; the one passed in is not changed.
  Revoking is an event like any other: nothing is ever edited or removed.
*/
export function append(record, input) {
    const errs = checkEventBody(input);
    if (errs.length)
        return { ok: false, reason: errs.join("; ") };
    const chain = verifyChain(record.events);
    if (!chain.ok)
        return { ok: false, reason: `The record is broken at event ${chain.seq}: ${chain.reason}` };
    const last = record.events[record.events.length - 1];
    if (last && timeMs(input.at) < timeMs(last.at))
        return { ok: false, reason: `This event is dated ${input.at}, before the last event (${last.at})` };
    const seq = record.events.length;
    const body = { seq, at: input.at, actor: input.actor, type: input.type, data: structuredClone(input.data), prev: chain.head };
    const event = { ...body, hash: hashEvent(body) };
    const state = currentState(record.events);
    const why = applyEvent(state, event);
    if (why)
        return { ok: false, reason: why };
    return { ok: true, event, record: { ...record, events: [...record.events, event] } };
}
