/* The hub: one made-up channel rated live by the engine, then the tools in the order you would use them. */
import { shell, $, esc } from "./assets/shell.js";
import { example, EXAMPLE_LINE } from "../assets/r5/examples.js";
import { RATING_LABEL } from "../assets/engine/rating/label.js";

shell("hub", 0);

const ex = example("channel");
const num = $("[data-num]");
const final = ex.signed;
const band = $("[data-band]");
band.textContent = ex.band;
$("[data-parts]").innerHTML = ex.parts.map((p) => `<span>${esc(p.name)} <b>${p.score}</b></span>`).join("");
$("[data-cap]").textContent = `${ex.name}: ${ex.parts[0].name.toLowerCase()} beats ${ex.parts[0].score} in 100 ${ex.peers} its size. Zero is typical. ${EXAMPLE_LINE} ${RATING_LABEL}.`;
num.closest("figure").setAttribute("aria-label", `${ex.name}, a made-up YouTube channel: ${final}, ${ex.band}.`);

// The number counts up once, from typical (zero) to the rating, and the band is set only when it lands; still under reduced motion.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (still) num.textContent = final;
else {
  band.style.visibility = "hidden";
  const target = ex.rating;
  const t0 = performance.now();
  const dur = 600;
  const tick = (now) => {
    const t = Math.min(1, Math.max(0, (now - t0) / dur));
    const v = target * (1 - (1 - t) ** 3);
    num.textContent = t < 1 ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}` : final;
    if (t < 1) requestAnimationFrame(tick);
    else band.style.visibility = "";
  };
  requestAnimationFrame(tick);
}
