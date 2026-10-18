import { build } from "./final.mjs";
const list = [];
const add = (id, title, idea, g) => list.push({ id, title, idea, d: g.O + g.loop + g.ball + g.rbe });
add("g1", "G1", "sweep 296", build());
add("g2", "G2", "sweep 278", build({ sweep: 278 }));
add("g3", "G3", "sweep 262, scale .58", build({ sweep: 262, scale: 0.58 }));
add("g4", "G4", "merge 2 o'clock, sweep 280", build({ at: -48, sweep: 280 }));
export const candidates = list;
