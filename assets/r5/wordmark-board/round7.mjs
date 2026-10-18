import { build } from "./final.mjs";
const list = [];
const add = (id, title, idea, g) => list.push({ id, title, idea, d: g.O + g.loop + g.ball + g.rbe });
add("h1", "H1", "final candidate", build());
add("h2", "H2", "scale .62", build({ scale: 0.62 }));
export const candidates = list;
