import { build } from "./final.mjs";
import { O_plain, r, b, e } from "./letters.mjs";
const list = [];
const g = build();
list.push({ id: "final", title: "Final: The lap", idea: "One stroke goes round twice: once as the O, the world, then a second lap inside as a hairline that comes to rest on a small ball just short of where it began.", d: g.O + g.loop + g.ball + g.rbe });
const a = O_plain(0, { tilt: -23.4, Sr: 116, H: 26, ki: 0.6 }); const rr = r(a.adv + 40), bb = b(rr.adv + 42), ee = e(bb.adv + 48);
list.push({ id: "axis", title: "Runner-up: Axis", idea: "The O's stress is tilted 23.4 degrees, the Earth's axial tilt.", d: a.d + rr.d + bb.d + ee.d });
export const candidates = list;
