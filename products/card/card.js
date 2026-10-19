/* The creator's own card: their rating from Rate my work (this tab only) and their own optional picture. */
import { shell, $, store, segmented, readImage } from "../assets/shell.js";
import { renderCard, downloadPng, FORMATS } from "../../assets/r5/card.js";

shell("card");

const data = store.session.json("orbe-products-card");
if (!data?.result) {
  $("[data-none]").classList.remove("hide");
} else {
  $("[data-has]").classList.remove("hide");
  const s = { moment: data.personalBest ? "best" : "rating", format: "square", theme: "paper", image: store.session.get("orbe-products-card-image") };
  $("[data-name]").value = data.name ?? "";
  $("[data-handle]").value = data.handle ?? "";
  $("[data-src]").textContent = data.sample ? "From a made-up file: this card shows an invented creator." : "From your own numbers, rated in this browser.";
  let svg = "";
  const draw = () => {
    svg = renderCard(data.result, {
      moment: s.moment, format: s.format, theme: s.theme, idPrefix: "mine",
      handle: $("[data-handle]").value.trim() || "@you", name: $("[data-name]").value.trim() || "My work",
      works: data.works, personalBest: data.personalBest ?? undefined, season: data.season, workTitle: data.workTitle,
      image: s.image ? { href: s.image, alt: "The creator's own picture" } : null,
      note: data.sample ? "A made-up creator, for trying Orbe." : undefined,
    });
    $("[data-card]").innerHTML = svg;
    const { width, height } = FORMATS[s.format];
    const box = $("[data-card]");
    box.style.setProperty("--ar", `${width} / ${height}`);
    box.style.setProperty("--w", width);
    box.style.setProperty("--h", height);
    $("[data-size]").textContent = `${width} × ${height}`;
    $("[data-thumb]").classList.toggle("hide", !s.image);
    $("[data-noimg]").classList.toggle("hide", !s.image);
    if (s.image) $("[data-thumb]").src = s.image;
  };
  const momentPick = segmented($("[data-moment]"), (v) => { s.moment = v; draw(); });
  segmented($("[data-format]"), (v) => { s.format = v; draw(); });
  segmented($("[data-theme]"), (v) => { s.theme = v; draw(); });
  for (const i of [$("[data-name]"), $("[data-handle]")]) i.addEventListener("input", draw);
  $("[data-image]").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    s.image = await readImage(f);
    store.session.set("orbe-products-card-image", s.image);
    draw();
  });
  $("[data-noimg]").addEventListener("click", () => { s.image = null; try { sessionStorage.removeItem("orbe-products-card-image"); } catch {} $("[data-image]").value = ""; draw(); });
  $("[data-download]").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try { await downloadPng(svg, `orbe-card-${s.moment}-${s.format}.png`); } catch (x) { console.warn(x); $("[data-size]").textContent = "Could not make the PNG. Try again."; } finally { b.disabled = false; }
  });
  momentPick(s.moment);
}
