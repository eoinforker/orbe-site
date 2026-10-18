/*
  An indicative range, not an offer. Small creator businesses tend to change
  hands on a multiple of yearly profit; where in the range you land depends on
  how steady the channel is and how much of it depends on the creator's face.
*/
export function value(i) {
    const ads = (i.views * 12 * i.rpm) / 1000;
    const revenue = ads + i.sponsors + i.other;
    const profit = revenue * i.margin;
    let mLow = 1.4, mHigh = 2.4;
    const notes = [];
    const diversified = (i.sponsors + i.other) / Math.max(revenue, 1);
    if (diversified > 0.4) {
        mLow += 0.2;
        mHigh += 0.4;
        notes.push("More than 40% of revenue isn't AdSense, which buyers like.");
    }
    if (i.faceDependence > 0.66) {
        mLow -= 0.3;
        mHigh -= 0.4;
        notes.push("The channel leans on the creator's face, so most buyers will want a handover period or an earn-out.");
    }
    else if (i.faceDependence < 0.33) {
        mLow += 0.2;
        mHigh += 0.3;
        notes.push("The format can run without the creator on screen, which widens the pool of buyers.");
    }
    if (i.age < 2) {
        mLow -= 0.3;
        mHigh -= 0.4;
        notes.push("Under two years of history; buyers will discount for it.");
    }
    mLow = Math.max(0.8, mLow);
    mHigh = Math.max(mLow + 0.4, mHigh);
    return { revenue, profit, low: profit * mLow, high: profit * mHigh, mLow, mHigh, notes };
}
export const gbp = (n) => n >= 1e6 ? `£${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M` : n >= 1e3 ? `£${Math.round(n / 1e3)}k` : `£${Math.round(n)}`;
