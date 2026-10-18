/*
  Raw request logs from the measurement service. A record never holds an IP
  address: only the day's listener hash, the user agent, the requested byte
  range, and a country looked up before the IP was dropped. Raw logs are kept
  a short, configurable time (RAW_LOG_DAYS) and then deleted; what lasts is
  the daily counts made from them.
*/
/** Provisional: two weeks covers recounting a late day and debugging, and no more. Configurable per deployment. */
export const RAW_LOG_DAYS = 14;
/** User agents are long and free text; this is plenty to classify one and caps what a log line can carry. */
export const MAX_UA_LENGTH = 400;
export function memoryLogStore() {
    let records = [];
    return {
        append: (r) => void records.push(r),
        read: (start, end) => records.filter((r) => r.at.slice(0, 10) >= start && r.at.slice(0, 10) <= end),
        purgeBefore(day) {
            const days = new Set(records.filter((r) => r.at.slice(0, 10) < day).map((r) => r.at.slice(0, 10)));
            records = records.filter((r) => r.at.slice(0, 10) >= day);
            return days.size;
        },
        all: () => [...records],
    };
}
/** The first day to keep under a retention of `keepDays`, counting today. */
export const retentionCutoff = (now, keepDays = RAW_LOG_DAYS) => new Date(now.getTime() - (keepDays - 1) * 864e5).toISOString().slice(0, 10);
