/*
  "Your card": each made-up example's card, for every moment, kind, format and
  theme, drawn by the same code the API uses, with a PNG download.
  The choice lives in the query string, so the site can link to /card/?moment=best&kind=newsletter.
*/
import { ORDER, example, CARD_EXAMPLE_LINE } from "../assets/r5/examples.js";
import { renderCard, downloadPng, FORMATS, FORMAT_NAMES, THEME_NAMES } from "../assets/r5/card.js";
import { mountWordmark } from "../assets/r5/wordmark.js";

const KIND_LABEL = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photography" };
const MOMENT_LABEL = { best: "Personal best", rating: "Rating", season: "Year", size: "Up a size" };
const THEME_LABEL = { paper: "Paper", ink: "Ink", sun: "Sun" };

const OPTIONS = {
  moment: Object.entries(MOMENT_LABEL),
  kind: ORDER.map((k) => [k, KIND_LABEL[k] ?? k]),
  format: FORMAT_NAMES.map((f) => [f, FORMATS[f].name]),
  theme: THEME_NAMES.map((t) => [t, THEME_LABEL[t] ?? t]),
  picture: [["work", "Their work"], ["none", "No picture"]],
};

const params = new URLSearchParams(location.search);
const pick = (key) => {
  const want = key === "theme" && params.get(key) === "night" ? "ink" : params.get(key);
  return OPTIONS[key].some(([v]) => v === want) ? want : OPTIONS[key][0][0];
};
const state = Object.fromEntries(Object.keys(OPTIONS).map((k) => [k, pick(k)]));

const $ = (s) => document.querySelector(s);
const cardEl = $("[data-card]");
const stage = $("[data-stage]");
const sizeEl = $("[data-size]");
const dl = $("[data-download]");
$("[data-example]").textContent = CARD_EXAMPLE_LINE;
mountWordmark($(".wm"));

let svg = "";

function draw() {
  const e = example(state.kind);
  const c = e.card;
  svg = renderCard(e.result, {
    moment: state.moment, format: state.format, theme: state.theme, handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: "page",
    works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle,
    image: state.picture === "work" ? c.image : null,
  });
  cardEl.innerHTML = svg;
  const { width, height } = FORMATS[state.format];
  stage.style.setProperty("--ar", `${width} / ${height}`);
  stage.style.setProperty("--w", width);
  stage.style.setProperty("--h", height);
  stage.dataset.format = state.format;
  sizeEl.textContent = `${width} × ${height}`;
  for (const [key, value] of Object.entries(state)) {
    for (const b of document.querySelectorAll(`[data-control="${key}"] button`)) b.setAttribute("aria-pressed", String(b.value === value));
  }
  history.replaceState(null, "", `?${new URLSearchParams(state)}`);
}

for (const [key, opts] of Object.entries(OPTIONS)) {
  const seg = document.querySelector(`[data-control="${key}"]`);
  for (const [value, label] of opts) {
    const b = document.createElement("button");
    b.type = "button";
    b.value = value;
    b.textContent = label;
    b.addEventListener("click", () => {
      state[key] = value;
      draw();
    });
    seg.append(b);
  }
}

dl.addEventListener("click", async () => {
  const e = example(state.kind);
  dl.disabled = true;
  const label = dl.textContent;
  dl.textContent = "Preparing";
  try {
    await downloadPng(svg, `orbe-${e.handle.replace(/^@/, "")}-${state.moment}-${state.format}-${state.theme}.png`);
  } catch (err) {
    console.error(err);
    sizeEl.textContent = "Could not make the PNG. Try again.";
  } finally {
    dl.disabled = false;
    dl.textContent = label;
  }
});

draw();
