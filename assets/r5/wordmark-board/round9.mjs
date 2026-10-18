import { build } from "./final.mjs";
const list = [];
const add = (id, title, idea, g) => list.push({ id, title, idea, d: g.O + g.loop + g.ball + g.rbe });
add("q1", "Q1", "bite 10, taper from deepest point", build({ bite: 10, t0: -0.01, tin: 0.09 }));
add("q2", "Q2", "bite 18, taper", build({ bite: 18, t0: -0.01, tin: 0.1 }));
export const candidates = list;
