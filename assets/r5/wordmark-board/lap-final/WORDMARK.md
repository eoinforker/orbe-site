# Orbe wordmark: The lap

## The idea

The O of Orbe is one stroke that goes round twice: once as the letter, the world, then a second, finer lap inside it that comes to rest on a small ball just short of where it began. It is an orb and its orbit in one movement of the pen, and every lap is measured against your own last one, which is what Orbe does for creators.

It is lettering, not a symbol: take the lap away and you still have a well-made serif Orbe; keep it and the O carries the name's meaning.

## Files

| File | Use |
|---|---|
| `wordmark.svg` | The mark, ink by default. `fill="currentColor"`, so it takes the colour of its parent when inlined. As an `<img>` it renders black. |
| `wordmark.js` | `mountWordmark(el, { animate = true })` inserts the inline SVG (accessible name "Orbe") and plays the reveal once. `wordmarkSVG()` returns the bare SVG element with no motion. |
| `favicon.svg` | The O alone, recut heavier for 16 to 32px, paper on an ink tile. |
| `favicon-32.png` | 32px PNG of the favicon for places that cannot take SVG. |
| `wordmark-board/` | The board (`index.html`) with the final, the runner-up and the explorations, plus the source drawing (`letters.mjs`, `final.mjs`). |

### Wiring it in

```html
<link rel="icon" href="../assets/r5/favicon.svg" type="image/svg+xml">
<link rel="icon" href="../assets/r5/favicon-32.png" sizes="32x32" type="image/png">

<a class="wm" href="#top" aria-label="Orbe, home">Orbe</a>
<script type="module">
  import { mountWordmark } from "../assets/r5/wordmark.js";
  mountWordmark(document.querySelector(".wm"));                      // nav: plays once
  mountWordmark(document.querySelector(".foot .wm"), { animate: false }); // footer: still
</script>
```

- Leave the text "Orbe" in the HTML. It is the no-JS fallback, and `mountWordmark` replaces it.
- **Size:** set `--wm-h` on the link or any ancestor. The default is `0.78em`, so with the current `.wm` font sizes (23 to 28px) it lands at 18 to 22px tall. For example, use `.top { --wm-h: 20px }`. `--wm-va` nudges the vertical alignment (default `-0.02em`).
- **Reverse:** use `color: var(--paper)` on the parent. There is no second file, and the same goes for any colour.
- The reveal plays on mount if the mark is on screen, otherwise the first time it scrolls into view. Until the moment it plays, the mark is fully drawn, so it is never stuck half drawn. With `prefers-reduced-motion: reduce` or `animate: false` it renders still.

## The reveal (1.24s, once)

One pen draws the O anticlockwise from 2 o'clock, the way an O is written, then carries on without lifting into the inner lap at the same speed (1.0s, one ease in and out across both). Then the ball lands with a small overshoot (0.24s). The r, b and e are present from the first frame, so the name is never unreadable. The motion is the idea: the pen goes round twice and lands. The animation is done with masks on the static paths, which are removed when it ends, so the resting mark is exactly `wordmark.svg`.

## Construction

All of it is drawn as paths on a 1000 unit em (`wordmark-board/letters.mjs`, `final.mjs`), in the spirit of Timeless Serif so it sits with the site's type.

- **Metrics:** baseline 0, x-height 492, cap 700, ascender 738, round overshoot 12. The viewBox is `0 16 2025 756`, and the baseline sits 12 units above its bottom edge.
- **O:** 680 by 724, near round like Timeless's O, with vertical stress: 102 at the sides and 30 at the top and bottom. The outline uses a handle ratio of 0.56 and the squarer counter 0.60.
- **The lap:** the O's own counter, scaled to 60 percent (the letter holds a smaller copy of itself, measured against its own size). It is set tangent to the counter at 2 o'clock and 10 units into the wall, so it leaves the wall with a crisp acute crotch, the same logic as the b's shoulder leaving its stem. It travels 306 degrees anticlockwise, 11 units at top and bottom and swelling to 37 on its upright sides, so it carries the O's stress.
- **Ball:** a 24 unit ball that rhymes with the r's 45 unit ball terminal. It stops with clear air from the wall, just short of where the lap began.
- **r:** a wedge flag, an arched shoulder thinning from 76 to 32 into a pendant ball, and a bracketed slab foot.
- **b:** a wedge flag, a 94 stem, a bowl with its stress on the right and an angled heel at the baseline.
- **e:** a 96 stroke, the bar at 53 percent of the x-height and an angled terminal.
- **Spacing:** O to r 40, r to b 42, b to e 48 (side to side, optically set).

## Clear space

Keep clear space of **one third of the mark's height** on every side, which is roughly the gap between the x-height and the top of the b. That is 6px at the 18px nav size and 67px at 200px. Nothing (text, rules, card edges) comes inside it.

## Minimum size

- **Screen:** 14px tall. The lap holds to 14px on high-density screens and 16px on standard ones. Below 16px tall on a standard screen, use the favicon instead of the wordmark.
- **Favicon:** 16px and up. It has its own heavier cut and is never a scaled-down wordmark.
- **Print:** 5mm tall.

## Do

- Use it in one flat colour: ink on paper, paper on ink, or ink on sky.
- Size it by height (`--wm-h`), keep its proportions, and give it its clear space.
- Let the reveal play once, in the nav, on load. Use it still everywhere else (footer, repeated marks).
- Use the favicon O on its own where a square is needed: tabs, app icons, avatars.

## Don't

- Don't typeset "Orbe" in Timeless Serif as a stand-in. Use the drawn mark.
- Don't recolour the lap or the ball separately, outline the mark, add shadows, glows or gradients, or put it on a busy image.
- Don't stretch, slant, rotate, re-space or set it in capitals.
- Don't loop the animation, play it on hover, or play it on every instance on a page.
- Don't put the O inside a circle, seal, badge or tick, or use the lap as a free-standing symbol apart from the favicon.
- Don't use it below the minimum size. Switch to the favicon.
