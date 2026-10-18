/*
  Who did what, and when. Listings, introductions and deals each keep an
  append-only trail, because the record of an introduction is Orbe's evidence
  that it introduced and did not arrange (MODEL.md Part 4).
*/
export const SYSTEM = { role: "system", id: "system" };
export const entry = (at, actor, action, subject, detail) => detail ? { at, actor, action, subject, detail } : { at, actor, action, subject };
