# Orbe wordmark: Carved

## The idea

Orbe is lettered the way names are cut into stone in the City of London: every stem narrows at its waist and flares out to a crisp, flat-cut end, with no serifs, so the word reads carved rather than printed. It is made to last and made by hand, which is what a record of your work should feel like to the creator who earned it and to the investor who relies on it.

## Files

| File | Use |
|---|---|
| `wordmark.svg` | The mark, text cut (25px tall and up). `fill="currentColor"`. As an `<img>` it renders black. |
| `wordmark-small.svg` | The small cut, for marks 16 to 24px tall when you place an SVG by hand. |
| `wordmark.js` | `mountWordmark(el, { animate = true })` inserts the inline SVG (accessible name "Orbe"), picks the cut from the height it renders at, and plays the reveal once. `wordmarkSVG({ cut })` returns the bare SVG with no motion (`cut: "text"` by default, or `"small"`). `WORDMARK` exports both cuts' paths and viewBoxes for code that draws without a DOM. |
| `favicon.svg`, `favicon-32.png`, `favicon-16.png` | The O alone, recut heavier and set on the pixel grid, paper on an ink tile. |
| `apple-touch-icon.png` | 180px, full-bleed ink square (iOS rounds the corners). |
| `icon-512.png` | 512px app icon, also at `stripe-app/icon.png` for the Stripe App. The O sits inside the central circle, so a round mask never cuts it. |
| `wordmark-src/` | The drawing (`carved.mjs`), the writer of `wordmark.js` and the SVGs (`emit.mjs`), the icons (`icons.mjs`) and proof sheets (`shots/`). |
| `wordmark-board/` | History: "The lap", the previous wordmark, with its board, sources and final files in `wordmark-board/lap-final/`. |

### Wiring it in

```html
<link rel="icon" href="../assets/r5/favicon.svg" type="image/svg+xml">
<link rel="icon" href="../assets/r5/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="../assets/r5/apple-touch-icon.png">

<a class="wm" href="#top" aria-label="Orbe, home">Orbe</a>
<script type="module">
  import { mountWordmark } from "../assets/r5/wordmark.js";
  mountWordmark(document.querySelector(".wm"));                           // nav: plays once
  mountWordmark(document.querySelector(".foot .wm"), { animate: false }); // footer: still
</script>
```

- Leave the text "Orbe" in the HTML. It is the no-JS fallback, and `mountWordmark` replaces it.
- **Size:** set `--wm-h` on the link or any ancestor (default `0.78em`). `--wm-va` nudges the vertical alignment (default `-0.02em`).
- **Reverse:** `color: var(--paper)` on the parent. Any flat colour works the same way.
- The reveal plays on mount if the mark is on screen, otherwise the first time it scrolls into view. Until then the mark is fully drawn, so it never sits half cut. With `prefers-reduced-motion: reduce` or `animate: false` it renders still.

## The reveal (1.1s, once)

A chisel cuts each stroke along its line in writing order: the O anticlockwise from the top, the r's stem then its arm, the b's stem then its bowl, the e from its bar round to its terminal. Each cut is a groove the width of the waist, so for a moment every stem is plain and parallel. Then the cut opens out and the flares arrive last, at the ends, as crisp corners. It shows the one idea (waist, then flare) and nothing else: no bounce, no fade, no loop.

## Construction

Drawn as paths on a 1000 unit em, baseline at y = 0 (`wordmark-src/carved.mjs`).

- **Metrics (text cut):** x-height 500, O cap 700, b ascender 742. Rounds overshoot by 13 at the cap and 11 at the x-height. viewBox `0 -742 2040 755`; the baseline sits 13 units above the bottom edge.
- **Stems:** 102 at the waist, flaring to 136 at the top and 142 at the foot (the foot is a touch wider so the letters stand). The flare reaches 118 units in from each end on a concave curve and the middle runs nearly straight: the chisel's entry, not a bulge. Every free end is cut flat.
- **O:** 664 by 726, vertical stress, 112 at the sides and 80 at top and bottom. The counter is a touch squarer than the outline (handle 0.60 against 0.565).
- **r:** the top of the stem is cut flat and runs straight on into the arm, which rises to the x-height overshoot and ends in a flat cut that is itself a small flare (98 at the tip against 84 in the arch). The arm leaves the stem in a thin crotch.
- **b:** a 742 stem with the same waist and flares. The bowl's counter is the stem's own concave side, and the bowl meets the stem in thin crotches top and bottom.
- **e:** 112 sides, a 60 bar at 54 percent of the x-height, and an aperture made by one straight cut at 38 degrees from the bar's end, so the terminal is a crisp angled end like the stems'.
- **Spacing:** O to r 56, r to b 34, b to e 62 (edge to edge at the flares), set as a word at 96 and 240px.
- **Small cut (16 to 24px):** the same drawing with heavier waists (118 against 140 to 146 at the ends), lower contrast in the rounds (O 122 by 94), x-height 510, a 70 bar, an opener e and looser spacing (74, 52, 80). `mountWordmark` switches at 24.5px tall. At 25px and up the text cut is used.

## Clear space

Keep clear space of **one third of the mark's height** on every side, which is roughly the gap between the x-height and the top of the b. That is 7px at the 22px nav size and 80px at 240px. Nothing (text, rules, card edges) comes inside it.

## Minimum size

- **Screen:** 16px tall, using the small cut. Below 16px use the favicon instead.
- **Favicon:** 16px and up. It has its own heavier cut on the pixel grid and is never a scaled-down wordmark.
- **Print:** 5mm tall.

## Do

- Use it in one flat colour: ink on paper, paper on ink, or ink on sky.
- Size it by height (`--wm-h`), keep its proportions, and give it its clear space.
- Let `mountWordmark` choose the cut. When placing an SVG by hand, use `wordmark-small.svg` at 16 to 24px and `wordmark.svg` above.
- Let the reveal play once, in the nav, on load. Use it still everywhere else.
- Use the favicon O on its own where a square is needed: tabs, app icons, avatars.

## Don't

- Don't set "Orbe" in Schibsted Grotesk or Newsreader as a stand-in. Use the drawn mark.
- Don't outline it, add shadows, glows or gradients, or put it on a busy image.
- Don't stretch, slant, rotate, re-space or set it in capitals, and don't round off the flat cuts.
- Don't loop the reveal, play it on hover, or play it on every instance on a page.
- Don't put the O inside a circle, seal, badge or tick, or add a symbol beside the word.
- Don't use the text cut below 25px or the small cut above 24px, and don't use either below 16px.
