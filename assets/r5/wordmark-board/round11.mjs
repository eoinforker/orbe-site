import { build } from "./final.mjs";
const list = [];
const add = (id, title, idea, g) => list.push({ id, title, idea, d: g.O + g.loop + g.ball + g.rbe });
add("s1", "S1", "sweep 312", build({ sweep: 312 }));
add("s2", "S2", "sweep 326", build({ sweep: 326 }));
add("s3", "S3", "sweep 318 scale .64 ball 23", build({ sweep: 318, scale: 0.64, ball: 23 }));
add("s4", "S4", "merge 3 o'clock, sweep 320", build({ at: -20, sweep: 320 }));
export const candidates = list;
