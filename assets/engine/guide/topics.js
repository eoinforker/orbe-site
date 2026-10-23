/*
  Topic clusters from titles: TF-IDF vectors, cosine similarity, and
  average-link agglomerative clustering. No dependencies and no learning:
  a creator can see exactly why two titles were grouped (shared words).
*/
/** Common English words that say nothing about a topic. Kept short on purpose: titles are short. */
const STOPWORDS = new Set(("a an and are as at be been but by can could did do does for from get got had has have how i if in into is it its " +
    "just me my not of on or our out over so than that the their them then there these they this to too up us was we " +
    "were what when where which who why will with you your yours i'm i've im ive dont don't vs via new part episode ep " +
    "issue stream live set photo photos video edition week weekly no all more most very about after before again one full tried worth lesson really thing way reason").split(" "));
/** Lower case words of three letters or more, numbers dropped, a light plural stem so "cities" meets "city". */
export function tokens(title) {
    const words = title
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .normalize("NFC")
        .split(/[^\p{L}\p{N}']+/u)
        .map((w) => w.replace(/^'+|'+$/g, ""))
        .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOPWORDS.has(w));
    return words.map(stem).filter((w) => !STOPWORDS.has(w));
}
export function stem(w) {
    if (w.length > 4 && w.endsWith("ies"))
        return `${w.slice(0, -3)}y`;
    if (w.length > 4 && w.endsWith("es") && /(ches|shes|sses|xes)$/.test(w))
        return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !/(ss|is|us)$/.test(w))
        return w.slice(0, -1);
    return w;
}
/** L2-normalised TF-IDF vectors, with smoothed idf so a word in every title still counts a little. */
export function tfidf(docs) {
    const n = docs.length;
    const df = new Map();
    for (const d of docs)
        for (const t of new Set(d))
            df.set(t, (df.get(t) ?? 0) + 1);
    return docs.map((d) => {
        const tf = new Map();
        for (const t of d)
            tf.set(t, (tf.get(t) ?? 0) + 1);
        const v = new Map();
        let norm = 0;
        for (const [t, c] of tf) {
            const w = c * (Math.log((1 + n) / (1 + df.get(t))) + 1);
            v.set(t, w);
            norm += w * w;
        }
        norm = Math.sqrt(norm);
        if (norm > 0)
            for (const [t, w] of v)
                v.set(t, w / norm);
        return v;
    });
}
export function cosine(a, b) {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let s = 0;
    for (const [t, w] of small) {
        const o = large.get(t);
        if (o !== undefined)
            s += w * o;
    }
    return s;
}
/**
  Average-link clustering: repeatedly merge the two most similar clusters
  until no pair is at least `threshold` similar. Ties break on the lowest
  indices, so the result never depends on the order of equal scores.

  The link between two clusters is the mean similarity of their members.
  It is kept in a matrix and updated on each merge (the merged cluster's
  link to any other is the size-weighted mean of its two parts' links),
  so a merge costs one pass over the live clusters rather than a fresh
  sum over every member pair. The result is the same clustering: the
  update is exact up to floating-point rounding, far inside the 1e-12
  tolerance the comparison already allows for ties.
*/
export function clusterTitles(titles, threshold = 0.25, minSize = 3) {
    const docs = titles.map(tokens);
    const vecs = tfidf(docs);
    const n = titles.length;
    // link[a * n + b]: the mean similarity between clusters a and b, named by their first member.
    const link = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        link[i * n + i] = 1;
        for (let j = i + 1; j < n; j++)
            link[i * n + j] = link[j * n + i] = cosine(vecs[i], vecs[j]);
    }
    // Live clusters, sorted by first member, as in the plain version.
    let clusters = Array.from({ length: n }, (_, i) => [i]).filter((c) => docs[c[0]].length > 0);
    /*
      Each live cluster keeps its best partner among the clusters after it, found
      by the same rule as the full scan (the first that beats the running best by
      more than 1e-12). A merge only changes rows that pointed at the two merged
      clusters or that now see a better link to the merged one, so most merges
      touch a handful of rows instead of every pair.
    */
    const bestVal = new Float64Array(n).fill(-1);
    const bestAt = new Int32Array(n).fill(-1);
    const scanRow = (pos) => {
        const k = clusters[pos][0];
        let best = -1;
        let at = -1;
        for (let j = pos + 1; j < clusters.length; j++) {
            const v = link[k * n + clusters[j][0]];
            if (v > best + 1e-12) {
                best = v;
                at = clusters[j][0];
            }
        }
        bestVal[k] = best;
        bestAt[k] = at;
    };
    for (let i = 0; i < clusters.length; i++)
        scanRow(i);
    for (;;) {
        let best = -1;
        let bi = -1;
        for (let i = 0; i < clusters.length; i++) {
            const k = clusters[i][0];
            if (bestAt[k] >= 0 && bestVal[k] > best + 1e-12) {
                best = bestVal[k];
                bi = i;
            }
        }
        if (bi < 0 || best < threshold)
            break;
        const a = clusters[bi];
        const ka = a[0];
        const kb = bestAt[ka];
        const bj = clusters.findIndex((c) => c[0] === kb);
        const b = clusters[bj];
        const merged = [...a, ...b].sort((x, y) => x - y);
        const na = a.length;
        const nb = b.length;
        // The merged cluster keeps a's first member, so it keeps a's place in the order.
        for (const c of clusters) {
            const k = c[0];
            if (k === ka || k === kb)
                continue;
            const v = (na * link[ka * n + k] + nb * link[kb * n + k]) / (na + nb);
            link[ka * n + k] = link[k * n + ka] = v;
        }
        clusters[bi] = merged;
        clusters.splice(bj, 1);
        for (let i = 0; i < clusters.length; i++) {
            const k = clusters[i][0];
            if (i === bi || bestAt[k] === ka || bestAt[k] === kb)
                scanRow(i);
            else if (i < bi && link[k * n + ka] > bestVal[k] - 1e-12)
                scanRow(i);
        }
    }
    return clusters
        .filter((c) => c.length >= minSize)
        .map((members) => ({ members, terms: topTerms(members.map((i) => vecs[i]), members.map((i) => docs[i])) }))
        .sort((a, b) => b.members.length - a.members.length || a.members[0] - b.members[0]);
}
/** The words that carry a cluster: summed weight, but only words in at least half its titles (or two, if small). */
function topTerms(vecs, docs, k = 3) {
    const weight = new Map();
    const count = new Map();
    for (const v of vecs)
        for (const [t, w] of v)
            weight.set(t, (weight.get(t) ?? 0) + w);
    for (const d of docs)
        for (const t of new Set(d))
            count.set(t, (count.get(t) ?? 0) + 1);
    const need = Math.max(2, Math.ceil(docs.length / 2));
    const ranked = [...weight.entries()]
        .filter(([t]) => (count.get(t) ?? 0) >= need)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const chosen = ranked.length ? ranked : [...weight.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    return chosen.slice(0, k).map(([t]) => t);
}
