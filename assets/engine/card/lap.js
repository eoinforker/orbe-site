/*
  The lap: the card's one drawing, grown from the wordmark's O.

  In the wordmark the O goes round once as the letter and then carries on into
  a finer inner lap that lands on a small ball. On the card that gesture is a
  measure. One lap is the yardstick (your usual work, your old best, or a
  hundred creators your size); the stroke goes round as far as you went and
  lands on the ball. 1.8x your usual is the O and four fifths of a second lap,
  which is very nearly the wordmark itself. Less than one lap leaves the O open,
  with a hairline showing the rest of the lap.

  Pure geometry: numbers in, path data out.
*/
/** Most turns drawn. Past this the stroke is simply at its fullest; the figure beside it says the rest. */
export const MAX_TURNS = 4;
/** Least shown, so a tiny figure still draws a visible stroke. */
export const MIN_TURNS = 0.06;
const TAU = Math.PI * 2;
/** Where the pen starts: two o'clock, as in the wordmark. Angles run anticlockwise. */
const START = (32 / 180) * Math.PI;
const n = (x) => String(Math.round(x * 10) / 10);
/** The stroke's weight at an angle: heavy on the sides, fine at the top and bottom, like the O's stress. */
const weight = (a, thick, thin) => thin + (thick - thin) * Math.cos(a) ** 2;
/** A ribbon along a centreline given by radius-at-progress, as one closed outline. */
function ribbon(s, from, to, radius, thick, thin, taper = 0) {
    const ry = s.ry ?? 1.065;
    const span = Math.abs(to - from);
    const steps = Math.max(16, Math.ceil(span * 220));
    const outer = [], inner = [];
    let end = [s.cx, s.cy];
    let endR = 0;
    for (let i = 0; i <= steps; i++) {
        const k = from + ((to - from) * i) / steps;
        const a = START + k * TAU;
        const r = radius(k);
        let w = weight(a, thick, thin);
        // A short lead-in from the wall, so a lap leaves the O with a crisp crotch rather than a hard edge.
        if (taper > 0 && i / steps < taper)
            w *= 0.25 + 0.75 * ((i / steps) / taper);
        const x = s.cx + Math.cos(a) * r, y = s.cy - Math.sin(a) * r * ry;
        const ux = Math.cos(a), uy = -Math.sin(a) * ry;
        const ul = Math.hypot(ux, uy) || 1;
        outer.push(`${n(x + (ux / ul) * w / 2)} ${n(y + (uy / ul) * w / 2)}`);
        inner.push(`${n(x - (ux / ul) * w / 2)} ${n(y - (uy / ul) * w / 2)}`);
        end = [x, y];
        endR = r;
    }
    return { d: `M${outer.join("L")}L${inner.reverse().join("L")}Z`, end, endR };
}
/** An ellipse ring of varying weight as two closed contours (even-odd), the O itself. */
function ring(s, rc, thick, thin) {
    const ry = s.ry ?? 1.065;
    const steps = 240;
    const out = [], inn = [];
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * TAU;
        const w = weight(a, thick, thin);
        const ux = Math.cos(a), uy = -Math.sin(a) * ry;
        const ul = Math.hypot(ux, uy) || 1;
        const x = s.cx + Math.cos(a) * rc, y = s.cy - Math.sin(a) * rc * ry;
        out.push(`${n(x + (ux / ul) * w / 2)} ${n(y + (uy / ul) * w / 2)}`);
        inn.push(`${n(x - (ux / ul) * w / 2)} ${n(y - (uy / ul) * w / 2)}`);
    }
    return `M${out.join("L")}ZM${inn.reverse().join("L")}Z`;
}
const ellipse = (s, r) => {
    const ry = (s.ry ?? 1.065) * r;
    return `M${n(s.cx - r)} ${n(s.cy)}A${n(r)} ${n(ry)} 0 1 0 ${n(s.cx + r)} ${n(s.cy)}A${n(r)} ${n(ry)} 0 1 0 ${n(s.cx - r)} ${n(s.cy)}Z`;
};
/** Clamps a measure to what the drawing shows; anything not a number draws as one lap. */
export function clampTurns(turns) {
    if (!Number.isFinite(turns))
        return 1;
    return Math.max(MIN_TURNS, Math.min(MAX_TURNS, turns));
}
/** The O's proportions at a given outer radius, from the wordmark: 102 at the sides, 30 at top and bottom, on a 340 radius. */
export function oWeights(r) {
    const thick = r * 0.2;
    return { thick, thin: thick * 0.3, lapThick: thick * 0.4, lapThin: thick * 0.13, ball: thick * 0.3 };
}
/**
  The lap for a measure: `turns` is how far round, one lap being the yardstick.
  From one turn up, the O closes and the rest runs inside it as finer laps
  stepping inward; under one turn the O stays open.
*/
export function drawLap(s, turnsIn) {
    const turns = clampTurns(turnsIn);
    const w = oWeights(s.r);
    const ry = s.ry ?? 1.065;
    const rc = s.r - w.thick / 2; // centreline of the O
    const pad = w.thick * 0.3;
    if (turns < 1) {
        const rib = ribbon(s, 0, turns, () => rc, w.thick, w.thin);
        const ball = { cx: rib.end[0], cy: rib.end[1], r: w.ball * 1.35 };
        return {
            stroke: rib.d,
            hairline: ellipse(s, rc),
            ball,
            window: { cx: s.cx, cy: s.cy, r: (rc - w.thick / 2 - pad) },
            turns,
        };
    }
    // The O, closed: the first lap. Then the inner lap leaves its wall at two o'clock.
    const extra = turns - 1;
    // The lap leaves the O's wall at two o'clock, its outer edge sunk into the wall, so the two make one
    // crisp crotch like the b's shoulder leaving its stem; it peels away as it steps inward.
    const wallAtStart = rc - weight(START, w.thick, w.thin) / 2;
    const first = wallAtStart - weight(START, w.lapThick, w.lapThin) / 2 + w.lapThick * 0.35;
    // Each extra lap steps inward; the step shrinks when there are many, so the window stays open.
    const minWindow = s.r * 0.42;
    const room = first - minWindow - w.lapThick;
    const gap = extra > 0 ? Math.min(w.thick * 0.66, room / Math.max(1, extra)) : 0;
    const radius = (k) => first - gap * k;
    const parts = [ring(s, rc, w.thick, w.thin)];
    let end = [s.cx + Math.cos(START) * first, s.cy - Math.sin(START) * first * ry];
    let innermost = first;
    if (extra > 0.001) {
        const rib = ribbon(s, 0, extra, radius, w.lapThick, w.lapThin);
        parts.push(rib.d);
        end = rib.end;
        // The window sits inside the innermost point the lap reaches.
        innermost = radius(extra);
    }
    const ballR = w.ball * 1.35;
    return {
        stroke: parts.join(""),
        hairline: null,
        ball: { cx: end[0], cy: end[1], r: ballR },
        window: { cx: s.cx, cy: s.cy, r: Math.max(s.r * 0.3, innermost - w.lapThick / 2 - pad * 0.7) },
        turns,
    };
}
/**
  Moving up a size: the old size is a hairline ring inside; the stroke leaves
  it and winds out once to the new O, landing just short of the wall.
*/
export function drawSizeUp(s) {
    const w = oWeights(s.r);
    const rc = s.r - w.thick / 2;
    const old = rc * 0.62;
    const wallIn = rc - w.thick / 2 - w.lapThick * 0.9;
    const rib = ribbon(s, 0, 0.94, (k) => old + (wallIn - old) * k, w.lapThick, w.lapThin);
    return {
        stroke: ring(s, rc, w.thick, w.thin) + rib.d,
        hairline: ellipse(s, old),
        ball: { cx: rib.end[0], cy: rib.end[1], r: w.ball * 1.35 },
        window: { cx: s.cx, cy: s.cy, r: old - w.lapThick * 0.9 },
        turns: 1,
    };
}
