import { build } from "./final.mjs";
const list = [];
const add = (id, title, idea, g) => list.push({ id, title, idea, d: g.O + g.loop + g.ball + g.rbe });
add("k1", "K1", "ccw, merge 2 o'clock, sweep 282", build());
add("k2", "K2", "ccw, merge 2:30, sweep 290, scale .6", build({ at: -30, sweep: 290 }));
add("k3", "K3", "ccw, merge 1:30, sweep 270", build({ at: -55, sweep: 270 }));
add("k4", "K4", "ccw, merge 2 o'clock, sweep 300, scale .56", build({ sweep: 300, scale: 0.56 }));
export const candidates = list;
