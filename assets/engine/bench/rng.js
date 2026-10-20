/*
  Seeded randomness. The bootstrap and the synthetic population must give the
  same answer on every run and every machine, so nothing here touches Math.random.
*/
/** FNV-1a, 32 bit: a stable hash for turning labels into seeds. */
export const hashString = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};
/** mulberry32: small, fast and good enough for resampling. Returns values in [0, 1). */
export const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
/** A generator keyed by labels, so each cohort's bootstrap is independent of build order. */
export const seededRng = (...parts) => mulberry32(hashString(parts.join("|")));
/** Standard normal by Box-Muller. */
export const normal = (rng) => {
    const u = 1 - rng();
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
