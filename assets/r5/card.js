/*
  The Orbe card in the browser. The drawing is the product's own
  (product/src/card, built into ../engine/card by `npm run build:engine`), so
  the card here is the card the API serves at orbe.vc/@handle/card.svg.

  renderCard(result, { moment, format, theme, handle, name, note, works,
  personalBest, season, sizeUp, image, workTitle }) returns an SVG string.
  downloadPng(svg, filename) turns it into a PNG at full size and saves it.
*/
import { cardModel, drawCard, fontFaceCss, SITE_FONTS, FORMATS, FORMAT_NAMES, THEMES, THEME_NAMES, MOMENTS } from "../engine/card/index.js";

export { FORMATS, FORMAT_NAMES, THEMES, THEME_NAMES, MOMENTS };

/**
  result: a rating from the engine (`rate()`, or example(kind).result), which
  carries its per-work ratings and whether its benchmarks are provisional.
  The moment's data (example(kind).card has all of it) passes straight through;
  `image: null` draws the card without a picture.
*/
export function renderCard(result, { format = "square", theme = "paper", handle, name, note, fontCss, idPrefix, moment, works, personalBest, season, sizeUp, image, workTitle } = {}) {
  if (!result || result.status === "not_enough_work") throw new Error("There is no card until the account has a rating.");
  const model = cardModel(
    result,
    { handle: handle ?? result.handle ?? "", name: name ?? result.title ?? "" },
    {
      moment,
      works: works ?? result.detail?.workRatings,
      personalBest: personalBest ?? undefined,
      season: season ?? undefined,
      sizeUp: sizeUp ?? undefined,
      image,
      workTitle,
      provisional: result.detail?.provisional === true,
      note,
    },
  );
  return drawCard(model, { format, theme, fontCss, idPrefix });
}

let fontCssPromise = null;

/** The site fonts as data URIs, fetched once. An SVG drawn into a canvas cannot reach the page's fonts. */
export function embeddedFontCss() {
  fontCssPromise ??= Promise.all(
    SITE_FONTS.map(async (f) => {
      const res = await fetch(new URL(`../fonts/${f.file}`, import.meta.url));
      if (!res.ok) throw new Error(`Could not load ${f.file}`);
      return { family: f.family, style: f.style, data: new Uint8Array(await res.arrayBuffer()) };
    }),
  ).then(fontFaceCss);
  return fontCssPromise;
}

/** Puts the fonts into an SVG string that has none, just after the opening tag. */
export async function withFonts(svg) {
  if (svg.includes("@font-face")) return svg;
  const css = await embeddedFontCss();
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`);
}

/** Rasterises a card at its own size (or `scale` times it) to a PNG Blob. */
export async function toPngBlob(svg, { scale = 1 } = {}) {
  const full = await withFonts(svg);
  const w = Number(/width="(\d+)"/.exec(full)?.[1] ?? 1080);
  const h = Number(/height="(\d+)"/.exec(full)?.[1] ?? 1080);
  const url = URL.createObjectURL(new Blob([full], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = url;
    await img.decode();
    // Fonts inside an SVG image can land a beat after decode; one more frame is enough in practice.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Saves the card as a PNG. */
export async function downloadPng(svgString, filename = "orbe-card.png") {
  const blob = await toPngBlob(svgString);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
