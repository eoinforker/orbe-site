const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
/** Numbers as written: "1,516" is 1516, "2.6%" is 2.6, "1 in 13" gives 1 and 13. */
export function numbersIn(text) {
    return (text.match(NUMBER) ?? []).map((m) => Number(m.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}
/** Facts in a fixed order, so ids are stable for the same inputs and the prompt caches well. */
export function buildFacts(input) {
    const out = [];
    const add = (source, ref, text) => {
        if (text && text.trim())
            out.push({ source, ref, text: text.trim() });
    };
    const r = input.report;
    if (r) {
        add("report", "report.text", r.text);
        for (const b of r.bests)
            add("bests", `report.best:${b.metric}`, b.line);
        add("report", "report.celebrate", r.celebrate.line);
        add("report", "report.watch", r.watch.line);
    }
    const h = input.highlights;
    if (h) {
        if (h.status !== "ok")
            add("highlights", "highlights.summary", h.summary);
        h.top.forEach((t, i) => add("highlights", `highlights.top:${i}`, t.line));
        for (const p of h.patterns.filter((x) => x.evidence === "pattern"))
            add("highlights", `highlights.pattern:${p.key}`, p.text);
        h.topics.forEach((t, i) => {
            if (t.evidence !== "not_enough")
                add("highlights", `highlights.topic:${i}`, t.text);
        });
        add("highlights", "highlights.rhythm", h.rhythm.text);
        add("highlights", "highlights.length", h.length.text);
    }
    const j = input.journal;
    if (j) {
        add("journal", "journal.summary", j.summary);
        for (const e of j.entries)
            if (e.verdict !== "not_enough" && (e.verdict === "clear" || e.effect >= 1.2))
                add("journal", `journal:${e.key}`, e.text);
    }
    const rs = input.research;
    if (rs?.status === "ok")
        rs.points.forEach((p) => add("research", `research.${p.metric}`, p.text));
    const g = input.rating;
    if (g) {
        add("rating", "rating.top", g.topStat ?? null);
        for (const f of g.focus ?? [])
            add("rating", `rating.focus:${f.key}`, `${f.name} is below typical for your size. ${f.advice}`);
    }
    return out.map((f, i) => ({ ...f, id: `F${i + 1}`, numbers: numbersIn(f.text) }));
}
export const factByRef = (facts, ref) => facts.find((f) => f.ref === ref);
export const factsByPrefix = (facts, prefix) => facts.filter((f) => f.ref.startsWith(prefix));
