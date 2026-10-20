/*
  The delivery guarantee, on its own and browser-safe: the floor Orbe
  suggests from a creator's verified history, whether delivery met it, and
  the creator's share when it fell short. Bookings judge delivery with these
  functions, and the agent tools and the command line quote and check with
  the same ones, so a quote and a booking can never disagree.
*/
import { finalWindow } from "./formats.js";
import { windowFor } from "./stats.js";
import { BPS } from "./util.js";
/*
  PROVISIONAL defaults. No public standard for creator make-goods was found;
  podcast and newsletter make-goods are set deal by deal in insertion orders.
  Twitch's Bounty Board pays in part when a viewership target is missed, which
  is the model here: a make-good first, then pro rata above a floor. Replace
  with what brands and creators choose once offers let them set their own.
*/
export const DEFAULT_SHORTFALL = { toleranceBps: 500, floorBps: 5000, makeGoodDays: 30 };
/** The guarantee Orbe suggests: what the creator's verified history reaches three times in four (the lower quartile). */
export function suggestGuarantee(spec, stats, quantity = 1) {
    const day = finalWindow(spec);
    const w = windowFor(stats, day);
    if (!w || w.p25 === null || w.p25 <= 0)
        return null;
    const units = Math.floor(spec.quantity === "hour" ? w.p25 * quantity : w.p25);
    return units > 0 ? { day, units } : null;
}
/** Whether delivered units meet the guarantee, allowing the shortfall tolerance. */
export function guaranteeMet(g, toleranceBps, units) {
    return units * BPS >= g.units * (BPS - toleranceBps);
}
/**
  The creator's share of the price, in basis points, for delivery against the
  guarantee: delivered over guaranteed, capped at all of it. With the floor
  (a published, properly disclosed work that stays up), never below floorBps.
*/
export function proRataShareBps(g, floorBps, units, floor) {
    const share = Math.min(BPS, Math.floor((units * BPS) / g.units));
    return floor ? Math.max(floorBps, share) : share;
}
