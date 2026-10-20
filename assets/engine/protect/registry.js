/*
  The fingerprint registry, in memory: add a fingerprint, ask which registered
  works lie nearest to a picture. Lookups go through a BK-tree on Hamming distance,
  so a query visits a small part of the registry instead of every entry; the tests
  check it against a full scan and count how many hashes it touched.

  Every window of an image fingerprint is indexed, so a cropped copy finds its
  original. Storage (SQLite, with the API) can rebuild the tree from the hex
  hashes on start.
*/
import { hamming, toHex } from "./image.js";
import { compare, EDITED_MAX } from "./compare.js";
/** A BK-tree over 64-bit hashes. Hamming distance is a metric, so the triangle inequality prunes whole branches. */
export class BKTree {
    root = null;
    count = 0;
    /** Hash comparisons made by the last search, for measuring how much of the tree a query touched. */
    lastVisited = 0;
    get size() { return this.count; }
    add(hash, item) {
        this.count++;
        if (!this.root) {
            this.root = { hash, items: [item], kids: new Map() };
            return;
        }
        let node = this.root;
        for (;;) {
            const d = hamming(hash, node.hash);
            if (d === 0) {
                node.items.push(item);
                return;
            }
            const next = node.kids.get(d);
            if (!next) {
                node.kids.set(d, { hash, items: [item], kids: new Map() });
                return;
            }
            node = next;
        }
    }
    /** Every item whose hash is within `radius` bits, nearest first. */
    within(hash, radius) {
        const out = [];
        this.lastVisited = 0;
        if (!this.root)
            return out;
        const stack = [this.root];
        while (stack.length) {
            const node = stack.pop();
            const d = hamming(hash, node.hash);
            this.lastVisited++;
            if (d <= radius)
                for (const item of node.items)
                    out.push({ item, hash: node.hash, distance: d });
            for (const [k, kid] of node.kids)
                if (k >= d - radius && k <= d + radius)
                    stack.push(kid);
        }
        return out.sort((a, b) => a.distance - b.distance);
    }
    /** The k nearest items, searching outward until k are found or `maxRadius` is reached. */
    nearest(hash, k = 1, maxRadius = 64) {
        let visited = 0;
        for (let r = Math.min(4, maxRadius);; r = Math.min(maxRadius, r * 2)) {
            const hits = this.within(hash, r);
            visited += this.lastVisited;
            if (hits.length >= k || r >= maxRadius) {
                this.lastVisited = visited;
                return hits.slice(0, k);
            }
        }
    }
}
/* ------------------------------------------------------------------ rights references */
const FNV_OFFSET = 0xcbf29ce484222325n, FNV_PRIME = 0x100000001b3n, M64 = (1n << 64n) - 1n;
function fnv64(s) {
    let h = FNV_OFFSET;
    for (let i = 0; i < s.length; i++) {
        h ^= BigInt(s.charCodeAt(i));
        h = (h * FNV_PRIME) & M64;
    }
    return h.toString(16).padStart(16, "0");
}
/**
  A stable id for the rights record: `fp:<algo>:<hex>`. An image is referred to by
  its whole-frame pHash; a video by a 64-bit FNV-1a of its sampling interval and
  keyframe hashes, so the same file sampled the same way always gives the same id.
  The rights module stores this string; it never needs this module's types.
*/
export function toRightsRef(fp) {
    if ("algo" in fp)
        return `fp:${fp.algo}:${toHex(fp.hash)}`;
    if (fp.kind === "image")
        return `fp:phash:${toHex(fp.phash)}`;
    return `fp:vphash:${fnv64(`${fp.interval}|${fp.hashes.map(toHex).join("")}`)}`;
}
export function parseRightsRef(ref) {
    const m = /^fp:(phash|dhash|vphash):([0-9a-f]{16})$/.exec(ref);
    return m ? { algo: m[1], hex: m[2] } : null;
}
/**
  An in-memory registry. Each window's pHash goes into the tree under its entry,
  candidates come back from a radius search, and each candidate is then compared
  in full (both hashes, every window) for the verdict.
*/
export function createRegistry() {
    const tree = new BKTree();
    const byRef = new Map();
    let visited = 0;
    // A pHash radius wide enough to hold every "edited" score: score = (2p + d) / 3 <= EDITED_MAX means p <= 1.5 x EDITED_MAX.
    const radius = Math.floor(EDITED_MAX * 1.5);
    return {
        get size() { return byRef.size; },
        get lastVisited() { return visited; },
        add(e) {
            const ref = e.ref ?? toRightsRef(e.fingerprint);
            const existing = byRef.get(ref);
            if (existing)
                return existing;
            const entry = { ref, owner: e.owner, addedAt: e.addedAt, fingerprint: e.fingerprint, ...(e.title !== undefined ? { title: e.title } : {}) };
            byRef.set(ref, entry);
            for (const w of e.fingerprint.windows)
                tree.add(w.phash, ref);
            return entry;
        },
        get: (ref) => byRef.get(ref),
        query(fp, { k = 5, includeDifferent = false } = {}) {
            const refs = new Set();
            const hits = includeDifferent ? tree.nearest(fp.phash, k * WINDOW_FANOUT) : tree.within(fp.phash, radius);
            visited = tree.lastVisited;
            for (const h of hits)
                refs.add(h.item);
            const out = [];
            for (const ref of refs) {
                const entry = byRef.get(ref);
                const comparison = compare(entry.fingerprint, fp);
                if (includeDifferent || comparison.verdict !== "different")
                    out.push({ entry, comparison });
            }
            return out.sort((a, b) => a.comparison.score - b.comparison.score).slice(0, k);
        },
    };
}
/* Each entry sits in the tree once per window. */
const WINDOW_FANOUT = 10;
