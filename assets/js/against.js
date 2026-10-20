/*
  "Against creators your size", said the same way on every rating surface.
  The words come from the card's own againstLine (product/src/card/words.ts),
  and the band labels from the rating engine's size bands, so the site, the
  card and every report name the same peers and the same band:
  "against channels with 250k to 1M subscribers".
*/
import { againstLine, wordsFor } from "../engine/card/words.js";
import { SPECS } from "../engine/rating/kinds.js";

/** The size band label for an audience, from the engine's own bands ("250k to 1M"). */
export function bandLabel(kind, audience) {
  const bands = SPECS[kind]?.sizeBands ?? [];
  const n = Math.max(Number(audience) || 0, 0);
  return (bands.find((b) => n >= b.min && (b.max === undefined || n < b.max)) ?? bands[0])?.label ?? "";
}

/**
  "Against channels with 250k to 1M subscribers", no full stop, for the start
  of a line. Takes the engine's band label ("250k to 1M", "Under 10k") with or
  without the audience word after it.
*/
export function Against(kind, sizeBand) {
  const band = String(sizeBand ?? "").trim().replace(new RegExp(`\\s+${wordsFor(kind).audience}$`, "i"), "");
  return againstLine(kind, band).replace(/\.$/, "");
}

/** "against channels with 250k to 1M subscribers", for after a rating: "+1.23 against ...". */
export const against = (kind, sizeBand) => Against(kind, sizeBand).replace(/^A/, "a");

/** "+1.23 against channels with 250k to 1M subscribers". */
export const ratedAgainst = (signedRating, kind, sizeBand) => `${signedRating} ${against(kind, sizeBand)}`;
