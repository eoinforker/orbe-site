import { deleteBy, nextRefreshDue } from "./refresh.js";
import { InvalidInputError } from "./errors.js";
import { isIsoDate } from "./ids.js";
/** An empty result stamped with its check time and refresh dates; connectors fill in the rest. */
export function emptyResult(source, policy, checkedAt) {
    return {
        source,
        checkedAt,
        nextRefreshDue: nextRefreshDue(policy, checkedAt),
        deleteBy: deleteBy(policy, checkedAt),
        snapshot: null,
        revenue: [],
        daily: [],
        workMetrics: [],
        facts: [],
        payouts: [],
        tokens: null,
        quota: null,
        warnings: [],
    };
}
/** Ranges are inclusive calendar dates; a reversed or malformed one is our bug, so fail loudly. */
export function checkRange(range, source) {
    if (!isIsoDate(range.start) || !isIsoDate(range.end))
        throw new InvalidInputError(`Range must be YYYY-MM-DD dates, got ${range.start} to ${range.end}`, source);
    if (range.start > range.end)
        throw new InvalidInputError(`Range starts after it ends: ${range.start} to ${range.end}`, source);
}
