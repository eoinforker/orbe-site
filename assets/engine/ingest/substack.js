/*
  Substack has no API, so creators upload exports. Two kinds are read:

  - The subscriber list (email_list CSV from Settings, Exports, or the
    Subscribers page export). Only counts are kept: free, paid, comp. Emails
    are read to de-duplicate and then dropped; they never leave this function.
  - Post stats (the Stats page export, or posts.csv from the full export):
    one Work per post with recipients, opens, views, likes, comments,
    restacks and new subscribers where the file has them.

  Column names drift between export versions, so each field is matched by a
  list of aliases. The aliases are our reading of exports seen so far: add
  new ones here when a creator's file does not match, never reshape the file.
*/
import { systemClock } from "../core/util.js";
import { cellNumber, mapColumns, normaliseHeader, parseCsv } from "./csv.js";
import { parseLooseDate } from "./dates.js";
import { InvalidInputError } from "./errors.js";
import { accountIdFor, workIdFor } from "./ids.js";
import { UPLOAD_POLICY } from "./refresh.js";
import { emptyResult } from "./result.js";
const SUBSCRIBER_COLUMNS = {
    email: ["email", "email address", "subscriber email"],
    plan: ["plan", "subscription type", "type", "subscription"],
    active: ["active_subscription", "active", "is active"],
    expiry: ["expiry", "expires", "expires at", "expiry date"],
    createdAt: ["created_at", "subscription date", "start date", "subscribed at", "created"],
};
const POST_COLUMNS = {
    postId: ["post_id", "id", "post id"],
    title: ["title", "post title", "post"],
    date: ["post_date", "date", "published", "publish date", "email_sent_at", "post date"],
    published: ["is_published", "published?"],
    recipients: ["recipients", "sent", "delivered", "emails sent", "audience size"],
    opens: ["opens", "unique opens", "opened"],
    views: ["views", "total views", "web views"],
    newFree: ["new free subscriptions", "new free subscribers", "free signups", "signups"],
    newPaid: ["new paid subscriptions", "new paid subscribers", "paid upgrades"],
    likes: ["likes", "hearts"],
    comments: ["comments"],
    restacks: ["restacks"],
};
/** Which export this is, from its header. */
export function detectExport(header) {
    const h = header.map(normaliseHeader);
    const has = (names) => names.some((n) => h.includes(normaliseHeader(n)));
    if (has(SUBSCRIBER_COLUMNS.email))
        return "subscribers";
    if (has(POST_COLUMNS.title) && (has(POST_COLUMNS.date) || has(POST_COLUMNS.postId)))
        return "posts";
    return null;
}
/** Substack's plan labels to three buckets. Unknown labels count as free, the safe side for a verified record. */
export function planOf(plan, active) {
    const p = plan.trim().toLowerCase();
    if (/comp|gift|complimentary/.test(p))
        return "comp";
    if (/paid|month|year|annual|founding|founder/.test(p))
        return "paid";
    if (active !== undefined && /^(true|yes|1)$/i.test(active.trim()) && p !== "free" && p !== "")
        return "paid";
    return "free";
}
const PUBLICATION = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*$/;
function account(platformId, audience) {
    return { id: accountIdFor("substack", platformId), creatorId: null, kind: "substack", platformId, handle: platformId, title: platformId, audience };
}
/** A publication is named by its domain, e.g. "example.substack.com". */
export function normalisePublication(input) {
    const s = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!PUBLICATION.test(s))
        throw new InvalidInputError(`Not a publication domain: ${input}`, "substack_export");
    return s;
}
function readSubscribers(table, platformId, result, provenance, today) {
    const col = mapColumns(table.header, SUBSCRIBER_COLUMNS);
    const seen = new Set();
    const counts = { free: 0, paid: 0, comp: 0 };
    let expired = 0;
    let blank = 0;
    for (const { cells } of table.rows) {
        const email = (cells[col.email] ?? "").trim().toLowerCase();
        if (!email) {
            blank++;
            continue;
        }
        if (seen.has(email))
            continue;
        seen.add(email);
        // An expiry in the past means the paid plan lapsed; Substack keeps the row.
        const expiry = col.expiry >= 0 ? parseLooseDate(cells[col.expiry] ?? "") : null;
        let plan = planOf(col.plan >= 0 ? (cells[col.plan] ?? "") : "", col.active >= 0 ? cells[col.active] : undefined);
        if (plan === "paid" && expiry !== null && expiry < today) {
            plan = "free";
            expired++;
        }
        counts[plan]++;
    }
    const total = counts.free + counts.paid + counts.comp;
    const acct = account(platformId, total);
    result.snapshot = { account: acct, works: [], provenance };
    for (const plan of ["free", "paid", "comp"])
        result.facts.push({ accountId: acct.id, key: `${plan}_subscribers`, value: counts[plan], provenance });
    if (table.rows.length - blank > seen.size)
        result.warnings.push(`${table.rows.length - blank - seen.size} repeated emails were counted once`);
    if (blank)
        result.warnings.push(`${blank} rows without an email were skipped`);
    if (expired)
        result.warnings.push(`${expired} paid plans had expired and were counted as free`);
    if (col.plan < 0)
        result.warnings.push("No plan column found; every subscriber counted as free");
    result.warnings.push("Subscriber upload: posts were not read, so works is empty by design");
}
function readPosts(table, platformId, result, provenance) {
    const col = mapColumns(table.header, POST_COLUMNS);
    const acctId = accountIdFor("substack", platformId);
    const works = [];
    const keys = new Set();
    for (const { line, cells } of table.rows) {
        const title = (cells[col.title] ?? "").trim();
        const date = col.date >= 0 ? parseLooseDate(cells[col.date] ?? "") : null;
        if (col.published >= 0 && /^(false|no|0)$/i.test((cells[col.published] ?? "").trim()))
            continue;
        if (!title || !date) {
            result.warnings.push(`Line ${line}: no ${!title ? "title" : "readable date"}, skipped`);
            continue;
        }
        const postId = col.postId >= 0 ? (cells[col.postId] ?? "").trim() : "";
        const key = postId || `${title}|${date}`;
        if (keys.has(key)) {
            result.warnings.push(`Line ${line}: repeats post ${postId || title}, skipped`);
            continue;
        }
        keys.add(key);
        const metrics = {};
        const put = (name, idx) => {
            const n = idx >= 0 ? cellNumber(cells[idx]) : null;
            if (n !== null)
                metrics[name] = n;
        };
        put("recipients", col.recipients);
        put("opens", col.opens);
        put("views", col.views);
        put("newFreeSubscribers", col.newFree);
        put("newPaidSubscribers", col.newPaid);
        put("likes", col.likes);
        put("comments", col.comments);
        put("restacks", col.restacks);
        // Computed, not read: the export's own rate is rounded and its denominator varies by version.
        if (metrics.recipients > 0 && metrics.opens !== undefined)
            metrics.openRate = metrics.opens / metrics.recipients;
        works.push({ id: workIdFor("substack", `${platformId}|${key}`), accountId: acctId, kind: "substack", title, publishedAt: `${date}T00:00:00.000Z`, durationSec: 0, metrics });
    }
    // Audience is unknown from a posts file; 0 here, the subscriber upload sets it.
    result.snapshot = { account: account(platformId, 0), works, provenance };
    result.warnings.push("Posts upload: audience comes from the subscriber export, recorded as 0 here");
}
export function createSubstackExport(config = {}) {
    const clock = config.clock ?? systemClock;
    async function readUpload(input) {
        const platformId = normalisePublication(input.platformAccountId);
        const table = parseCsv(input.content);
        const kind = detectExport(table.header);
        if (!kind)
            throw new InvalidInputError("This file is neither a Substack subscriber export nor a post stats export", "substack_export");
        const now = clock();
        const checkedAt = now.toISOString();
        const result = emptyResult("substack_export", UPLOAD_POLICY, checkedAt);
        const provenance = { source: "substack_export", accountId: platformId, checkedAt, basis: "uploaded" };
        if (kind === "subscribers")
            readSubscribers(table, platformId, result, provenance, checkedAt.slice(0, 10));
        else
            readPosts(table, platformId, result, provenance);
        return result;
    }
    return { source: "substack_export", kind: "substack", basis: "uploaded", scopes: [], refresh: UPLOAD_POLICY, readUpload };
}
