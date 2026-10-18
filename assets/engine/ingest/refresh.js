/*
  Refresh policies. YouTube's terms are the strict one: API data may not be
  kept for more than 30 days without being refreshed, so every YouTube read
  records when it must be refreshed or deleted. Other platforms set no limit
  we know of, so Orbe's own cadence applies.
*/
import { DAY_MS } from "../core/util.js";
export const YOUTUBE_POLICY = {
    // Provisional cadence: weekly keeps ratings current well inside the 30 day limit; tune from scheduler cost data.
    refreshEveryDays: 7,
    maxAgeDays: 30,
    rule: "YouTube API Services Developer Policies: API data refreshed or deleted within 30 days",
};
export const monthlyPolicy = (rule) => ({
    // Provisional: money settles monthly, so a monthly read is enough until creators ask for fresher numbers.
    refreshEveryDays: 30,
    maxAgeDays: null,
    rule,
});
export const UPLOAD_POLICY = {
    // An upload cannot be refreshed by us; ask the creator for a new export each quarter (provisional).
    refreshEveryDays: 90,
    maxAgeDays: null,
    rule: "Uploaded by the creator; no platform limit. Ask for a fresh export.",
};
const plusDays = (iso, days) => new Date(Date.parse(iso) + days * DAY_MS).toISOString();
export const nextRefreshDue = (policy, checkedAt) => plusDays(checkedAt, policy.refreshEveryDays);
export const deleteBy = (policy, checkedAt) => policy.maxAgeDays === null ? null : plusDays(checkedAt, policy.maxAgeDays);
/** Where a stored read stands now. "must_delete" means refresh it this instant or delete it. */
export function freshness(policy, checkedAt, now) {
    const limit = deleteBy(policy, checkedAt);
    if (limit !== null && now.getTime() >= Date.parse(limit))
        return "must_delete";
    return now.getTime() >= Date.parse(nextRefreshDue(policy, checkedAt)) ? "due" : "fresh";
}
