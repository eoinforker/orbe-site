/** Hours after release each horizon is read at. */
export const HORIZONS = { "1h": 1, "1d": 24, "7d": 7 * 24, "30d": 30 * 24 };
export const HORIZON_ORDER = ["1h", "1d", "7d", "30d"];
/** An empty outcome for a sealed prediction, once the work's real release time is known. */
export function outcomeFor(p, releaseAt) {
    if (Date.parse(releaseAt) <= Date.parse(p.madeAt))
        throw new Error("The work was released before the prediction was sealed, so it cannot be scored.");
    return { predictionId: p.id, workId: p.workId, creatorId: p.creatorId, kind: p.kind, sizeBand: p.sizeBand, metric: p.metric, releaseAt, readings: {} };
}
/** Adds one reading. Returns a new outcome; the old one is untouched. */
export function recordReading(o, horizon, reading) {
    if (o.readings[horizon])
        throw new Error(`The ${horizon} reading is already recorded and is never rewritten.`);
    if (!(Number.isFinite(reading.value) && reading.value >= 0))
        throw new Error("A reading must be a count of zero or more.");
    const due = Date.parse(o.releaseAt) + HORIZONS[horizon] * 36e5;
    if (Date.parse(reading.checkedAt) < due)
        throw new Error(`The ${horizon} reading was taken before ${horizon} had passed.`);
    return { ...o, readings: { ...o.readings, [horizon]: reading } };
}
/** The horizons still to read at a moment, in order. */
export const dueReadings = (o, at) => HORIZON_ORDER.filter((h) => !o.readings[h] && Date.parse(at) >= Date.parse(o.releaseAt) + HORIZONS[h] * 36e5);
