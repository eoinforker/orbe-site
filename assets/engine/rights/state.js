/*
  Replaying the record: from the events to who owns what, which consents are
  live, and which grants stand, at any moment. Authority is checked here, at
  the time of each event, so a record carries its own rules: an event in the
  chain that its actor had no right to make is kept (the chain stays whole)
  but changes nothing, and is listed in state.rejected.
*/
import { daysBetween, isTime, iso, isoDay, timeMs } from "./canon.js";
import { isChannel, isId, isParty } from "./validate.js";
import { GENESIS, WHOLE } from "./types.js";
export const emptyState = () => ({ asOf: null, head: GENESIS, works: {}, consents: {}, grants: {}, usage: {}, rejected: [] });
/** Is there a live consent from creator to team for this scope at time t (ms)? */
export function hasConsent(state, creator, team, scope, t) {
    return Object.values(state.consents).some((c) => c.creator === creator &&
        c.team === team &&
        c.scope === scope &&
        timeMs(c.grantedAt) <= t &&
        (c.revokedAt === undefined || timeMs(c.revokedAt) > t) &&
        (c.until === undefined || timeMs(c.until, "end") > t));
}
const ownerOf = (state, work, party) => state.works[work]?.owners.some((o) => o.party === party) ?? false;
/** May this party license (issue or extend a grant on) this work at time t? Any owner, or a team holding the creator's live license consent. */
export function mayLicense(state, work, party, t) {
    const w = state.works[work];
    if (!w)
        return false;
    return ownerOf(state, work, party) || hasConsent(state, w.creator, party, "license", t);
}
/** Apply one event in place. Returns null when applied, or why it carried no authority. */
export function applyEvent(state, ev) {
    const t = timeMs(ev.at);
    const who = ev.actor;
    switch (ev.type) {
        case "work.registered": {
            const w = ev.data.work;
            if (state.works[w.id])
                return `Work ${w.id} is already registered`;
            if (who !== w.creator && !hasConsent(state, w.creator, who, "roster", t) && !hasConsent(state, w.creator, who, "claim", t))
                return `${who} cannot register work for ${w.creator} without a live roster or claim consent`;
            state.works[w.id] = { ...w, owners: [{ party: w.creator, shareBps: WHOLE }], chain: [{ seq: ev.seq, at: ev.at, by: who, kind: "created", to: w.creator, shareBps: WHOLE }] };
            return null;
        }
        case "ownership.set": {
            const w = state.works[ev.data.work];
            if (!w)
                return `No work ${ev.data.work}`;
            if (who !== w.creator)
                return `Only the creator can set co-owners`;
            if (w.owners.length !== 1 || w.owners[0].party !== w.creator)
                return `Co-owners can be set only while the creator owns the whole work; use transfers after that`;
            w.owners = ev.data.owners.map((o) => ({ ...o }));
            for (const o of ev.data.owners)
                if (o.party !== w.creator)
                    w.chain.push({ seq: ev.seq, at: ev.at, by: who, kind: "co-owners", from: w.creator, to: o.party, shareBps: o.shareBps });
            return null;
        }
        case "ownership.transferred": {
            const { work, from, to, shareBps } = ev.data;
            const w = state.works[work];
            if (!w)
                return `No work ${work}`;
            if (who !== from)
                return `Only ${from} can transfer their own share`;
            const src = w.owners.find((o) => o.party === from);
            if (!src || src.shareBps < shareBps)
                return `${from} holds ${src?.shareBps ?? 0} basis points of ${work}, not ${shareBps}`;
            src.shareBps -= shareBps;
            const dst = w.owners.find((o) => o.party === to);
            if (dst)
                dst.shareBps += shareBps;
            else
                w.owners.push({ party: to, shareBps });
            w.owners = w.owners.filter((o) => o.shareBps > 0);
            w.chain.push({ seq: ev.seq, at: ev.at, by: who, kind: "transfer", from, to, shareBps });
            return null;
        }
        case "consent.granted": {
            const c = ev.data.consent;
            if (state.consents[c.id])
                return `Consent ${c.id} already exists`;
            if (who !== c.creator)
                return `Only ${c.creator} can grant their own consent`;
            state.consents[c.id] = { ...c, grantedAt: ev.at };
            return null;
        }
        case "consent.revoked": {
            const c = state.consents[ev.data.id];
            if (!c)
                return `No consent ${ev.data.id}`;
            if (c.revokedAt)
                return `Consent ${c.id} is already revoked`;
            if (who !== c.creator && who !== c.team)
                return `Only the creator or the team can end consent ${c.id}`;
            c.revokedAt = ev.at;
            if (ev.data.reason)
                c.revokedReason = ev.data.reason;
            return null;
        }
        case "grant.issued": {
            const g = ev.data.grant;
            if (state.grants[g.id])
                return `Grant ${g.id} already exists`;
            if (!state.works[g.work])
                return `No work ${g.work}`;
            if (!mayLicense(state, g.work, who, t))
                return `${who} neither owns ${g.work} nor holds the creator's live license consent`;
            state.grants[g.id] = { ...g, channels: [...g.channels], territory: [...g.territory], fee: g.fee && { ...g.fee }, issuedBy: who, issuedAt: ev.at, extensions: [] };
            return null;
        }
        case "grant.extended": {
            const g = state.grants[ev.data.id];
            if (!g)
                return `No grant ${ev.data.id}`;
            if (g.revokedAt)
                return `Grant ${g.id} is revoked and cannot be extended`;
            if (!mayLicense(state, g.work, who, t))
                return `${who} cannot extend grant ${g.id}`;
            if (timeMs(ev.data.end, "end") <= timeMs(g.end, "end"))
                return `An extension must end later than ${g.end}`;
            g.extensions.push({ at: ev.at, by: who, from: g.end, to: ev.data.end });
            g.end = ev.data.end;
            return null;
        }
        case "grant.revoked": {
            const g = state.grants[ev.data.id];
            if (!g)
                return `No grant ${ev.data.id}`;
            if (g.revokedAt)
                return `Grant ${g.id} is already revoked`;
            if (who !== g.issuedBy && who !== g.brand && !mayLicense(state, g.work, who, t))
                return `${who} cannot revoke grant ${g.id}`;
            g.revokedAt = ev.at;
            g.revokedBy = who;
            g.revokedReason = ev.data.reason;
            return null;
        }
        case "usage.reported": {
            const u = ev.data.usage;
            if (state.usage[u.id])
                return `Usage ${u.id} already reported`;
            state.usage[u.id] = { ...u, reportedBy: who, reportedAt: ev.at };
            return null;
        }
        case "usage.ended": {
            const u = state.usage[ev.data.id];
            if (!u)
                return `No usage ${ev.data.id}`;
            u.until = ev.data.until;
            return null;
        }
    }
}
/**
  The state of the record at a moment: every event whose time is at or before
  `at` (all of them when `at` is left out), applied in order. Run verifyChain
  first: this trusts the order it is given.
*/
export function currentState(events, at) {
    const s = emptyState();
    const limit = at === undefined ? Infinity : timeMs(at);
    for (const ev of events) {
        if (timeMs(ev.at) > limit)
            break;
        const why = applyEvent(s, ev);
        if (why)
            s.rejected.push({ seq: ev.seq, type: ev.type, reason: why });
        s.head = ev.hash;
        s.asOf = ev.at;
    }
    return s;
}
/* ---------------------------------------------------------------- reading grants */
/** The end of a grant as people say it: the last day for a bare date, the instant otherwise. */
export const endLabel = (g) => g.end;
const startLabel = (g) => g.start;
export function grantStatus(g, now, soonDays = 30) {
    const t = timeMs(now);
    if (g.revokedAt && timeMs(g.revokedAt) <= t)
        return { kind: "revoked", since: g.revokedAt };
    const start = timeMs(g.start);
    const end = timeMs(g.end, "end");
    if (start > t)
        return { kind: "upcoming", days: daysBetween(t, start) };
    if (end <= t)
        return { kind: "expired", since: endLabel(g) };
    const days = daysBetween(t, end);
    return days <= soonDays ? { kind: "expiring", days } : { kind: "live" };
}
/** Grants that end after now and within the next `withinDays` days, soonest first. Revoked grants are left out. */
export function expiring(grants, now, withinDays) {
    const t = timeMs(now);
    const horizon = t + withinDays * 86_400_000;
    return grants
        .filter((g) => !(g.revokedAt && timeMs(g.revokedAt) <= t))
        .map((g) => ({ grant: g, end: timeMs(g.end, "end") }))
        .filter((x) => x.end > t && x.end <= horizon)
        .sort((a, b) => a.end - b.end || a.grant.id.localeCompare(b.grant.id))
        .map((x) => ({ grant: x.grant, endsAt: iso(x.end), days: daysBetween(t, x.end) }));
}
const USE_WORDS = { organic: "an organic post", paid: "paid media", whitelisting: "whitelisting from the creator's handle", ad: "the brand's own ad creative" };
function useFails(g, use) {
    if (use === "organic")
        return g.media === "paid" ? `Grant ${g.id} is for paid media only` : null;
    if (g.media === "organic")
        return `Grant ${g.id} is organic only: no ${USE_WORDS[use]}`;
    if (use === "whitelisting" && !g.whitelisting)
        return `Grant ${g.id} does not allow whitelisting`;
    if (use === "ad" && !g.ads)
        return `Grant ${g.id} does not allow use in ads`;
    return null;
}
/**
  May this brand use this work on this channel at this time? Yes with the grant
  that covers it (the one that runs longest, when grants overlap), or no with
  the reason from the grant that came closest.
*/
export function canUse(state, q) {
    if (!isParty(q.brand) || !isId(q.work) || !isChannel(q.channel) || !isTime(q.at))
        return { allowed: false, code: "bad-query", reason: "Name a brand, a work, a known channel and a date or time" };
    const work = state.works[q.work];
    if (!work)
        return { allowed: false, code: "no-work", reason: `No work ${q.work} in this record` };
    const t = timeMs(q.at);
    const use = q.use ?? "organic";
    const mine = Object.values(state.grants).filter((g) => g.brand === q.brand && g.work === q.work);
    if (!mine.length)
        return { allowed: false, code: "no-grant", reason: `No grant lets ${q.brand} use "${work.title}"` };
    // Each grant either covers the use or fails at a stage; the furthest stage gives the most useful reason.
    const STAGE = { channel: 0, use: 1, territory: 2, "not-started": 3, expired: 3, revoked: 4 };
    let best = null;
    const yes = [];
    for (const g of mine) {
        let fail = null;
        if (!g.channels.includes(q.channel))
            fail = { code: "channel", reason: `Not cleared for ${q.channel}. Grant ${g.id} covers ${g.channels.join(", ")}` };
        else if (useFails(g, use))
            fail = { code: "use", reason: useFails(g, use) };
        else if (q.territory && !g.territory.includes("WW") && !g.territory.includes(q.territory))
            fail = { code: "territory", reason: `Grant ${g.id} covers ${g.territory.join(", ")}, not ${q.territory}` };
        else if (timeMs(g.start) > t)
            fail = { code: "not-started", reason: `Grant ${g.id} starts ${startLabel(g)}` };
        else if (timeMs(g.end, "end") <= t)
            fail = { code: "expired", reason: `Grant ${g.id} ended ${endLabel(g)}${g.end.length === 10 ? " (last day)" : ""}` };
        else if (g.revokedAt && timeMs(g.revokedAt) <= t)
            fail = { code: "revoked", reason: `Grant ${g.id} was revoked ${isoDay(timeMs(g.revokedAt))} by ${g.revokedBy}: ${g.revokedReason}` };
        if (!fail)
            yes.push(g);
        else if (!best || STAGE[fail.code] > best.stage)
            best = { stage: STAGE[fail.code], ...fail, grant: g.id };
    }
    if (yes.length) {
        const g = yes.sort((a, b) => timeMs(b.end, "end") - timeMs(a.end, "end") || a.id.localeCompare(b.id))[0];
        return { allowed: true, grant: g.id, until: g.end, reason: `Yes, under grant ${g.id}, until ${endLabel(g)}${g.end.length === 10 ? " (last day)" : ""}` };
    }
    return { allowed: false, code: best.code, reason: best.reason, grant: best.grant };
}
/** Usage running at `at` that no grant covers, each with the reason. */
export function conflicts(state, at) {
    const t = timeMs(at);
    const out = [];
    for (const u of Object.values(state.usage)) {
        if (timeMs(u.from) > t || (u.until !== null && timeMs(u.until, "end") <= t))
            continue;
        const check = canUse(state, { brand: u.brand, work: u.work, channel: u.channel, at, use: u.use });
        if (!check.allowed)
            out.push({ usage: u, check });
    }
    return out;
}
