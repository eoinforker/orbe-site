# Orbe, the shared system

The homepage (`site/try-d/`, promoted to `site/index.html`) is built on these files. Every other page can move onto them the same way. This guide covers the files, the tokens, the components, and how a page mounts the header, footer and trail.

| File | What it is |
| --- | --- |
| `orbe.css` | Tokens and components: page, grain, gradient light, type ladder, buttons, links, fields, the window with its colour pairs, chips, the stat strip, focus, the header and the footer. |
| `chrome.js` | `mountHeader` and `mountFooter`, the shared header (the lockup: the Portal, then the Carved wordmark) and the public footer with the looping wordmark. |
| `mark.js` | The Portal, Orbe's mark: both cuts as paths, `portalMarkup` (bare, currentColor), `tileMarkup` (on a coloured tile) and `LOCKUP`, the lockup's numbers. `.ob-lockup` in `orbe.css` sets the mark beside the wordmark. |
| `trail.js` | `mountTrail`, the pointer trail for any page. |
| `ease.js` | The one easing as a function (`ease`), its CSS string (`EASE`) and `reducedMotion()`. |
| `scene.js` | `mountScene`, a band's crafted lattice objects in the free space beside its words, and the objects themselves. |

Everything is built on the palette in `../brand/tokens.css` (`--orbe-*`, plus `--rule`, `--rule-strong`, `--action-press` and the font stacks). Classes and custom properties use the `ob-` prefix, so this file can sit beside the older `../brand/components.css` (`.o-*`) while a page moves across.

## Mounting a page

```html
<html lang="en-GB" data-scheme="blue">
<head>
  <link rel="icon" href="../assets/r5/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../assets/r5/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/fonts.css">
  <link rel="stylesheet" href="../assets/brand/tokens.css">
  <link rel="stylesheet" href="../assets/orbe/orbe.css">
  <link rel="stylesheet" href="page.css">
</head>
<body class="ob-page ob-grain">
  <a class="ob-skip" href="#main">Skip to the content</a>
  <header data-ob-header></header>
  <main id="main">
    <section class="ob-lit" data-head="light">
      <div class="ob-layer">...</div>
    </section>
  </main>
  <footer data-ob-footer></footer>
  <script type="module">
    import { mountHeader, mountFooter } from "../assets/orbe/chrome.js";
    import { mountTrail } from "../assets/orbe/trail.js";
    mountFooter(document.querySelector("[data-ob-footer]"), { root: "../" });
    mountHeader(document.querySelector("[data-ob-header]"), { root: "../", current: "products/rate/" });
    mountTrail({ loud: ".ob-lit" });
  </script>
</body>
</html>
```

- `root` is the page's relative path to the site root: `"./"` at the root, `"../"` one folder down, `"../../"` two folders down. Every header and footer link is built from it.
- `home` defaults to `root`. On the homepage itself, pass `home: "./"` so its anchors (`#reserve`, `#tools`) stay on the page.
- `current` is the active product path, such as `"products/rate/"`. That link gets `aria-current="page"`.
- Mount the footer before the header. The header then sees the footer's fields. If a page adds fields later, call `header.rescan()`.
- `mountFooter` accepts `people`, a list of `{ name, beats }` from the engine, for the looping wordmark. Without it, the footer reads the made-up creators in `../r5/examples.js`. Pass `note` to change the honesty line. It must still say the creators are made up and that Orbe calculated the figures.

## The header on a phone

Up to 720px the links and the Reserve button move into a sheet. The bar keeps the wordmark and a Menu button (44px). The sheet is full width, solid Paper, under the bar: every product as a 56px row with a hairline, the Reserve button at full width, then Brand, Terms and Privacy. Focus stays inside it (the Menu button included) while it is open; Escape, the button, any link in it, or the screen growing past 720px closes it, and the page behind does not scroll.

## How the header picks its colours

Every field the header can sit over declares itself with `data-head="light"` or `data-head="dark"`. That covers sections, bands, and any window whose body is dark. Nothing else is needed.

- **At the very top of the page:** the header has no bar. Each part (the mark, the links and the button) takes the colour of the smallest field under its own centre.
- **Once the page scrolls:** the header becomes a solid bar, so text never runs under it. Over light fields it is solid Paper with a hairline and the soft shadow. Over dark fields it is solid Ink with Paper words, and the Reserve button switches to the light variant. There is no blur and no glass.
- **Timing:** changes take 160ms.
- **Cost:** one IntersectionObserver on a 1px line through the header, plus a passive scroll listener that only flips a flag.

## The pointer trail

`mountTrail({ loud, quiet = 0.45 })` adds one fixed canvas (`.ob-trail`, z-index 1). It draws over section backgrounds and under anything marked `.ob-layer` (z-index 2), so wrap each section's content in `.ob-layer` or give it `position: relative; z-index: 2`.

- **Look:** cells sit on the 11.28px lattice and scroll with the page. They fade over 0.9s. A click on anything that is not a control scatters a small cluster.
- **Colours:** read from `--ob-trail` on the element under the pointer, as three colours separated by spaces. The default is Sky, Straw and Peony. A section sets its own: `.my-band { --ob-trail: var(--orbe-sky) var(--orbe-chalk) var(--orbe-straw); }`.
- **Strength:** full inside the `loud` selector, and `quiet` (0.45) with sparser cells everywhere else.
- **When it is off:** on touch, and under reduced motion. No frame runs once the last cell has gone.

## The band scene

`mountScene(band, { items, light, dark, specks, calm = 44, ceiling = ".pr-tabs", within = ".wrap" })` draws a lattice composition into a band: a hero object, a companion or two, and small clusters scattered round them. The products pages mount theirs through `site/products/assets/bands.js`, one composition per product, in its colour pair.

```js
import { mountScene, orb, hundred, tool } from "../assets/orbe/scene.js";
mountScene(document.querySelector(".pr-band"), {
  light: "water", dark: "ink", specks: { colors: ["sky", "water", "ember"], n: 12 },
  items: [
    { make: orb({ level: 0.93, rim: ["chalk", "mist", "sky", "water"], liquid: ["mist", "sky", "water", "press"] }), size: [130, 250] },
    { make: hundred({ n: 93 }), size: [82, 82], cut: 0, ring: 0 },
    { make: tool({ key: "explainer", dark: ["water", "press"], body: ["mist", "sky"], accent: "ember" }), size: [160, 160] },
  ],
});
```

- **The cast:**
  - `orb({ level, rim, liquid, tint })`, filled by area, so 0.5 is exactly the middle;
  - `orbDepth({ levels })`, one orb in front with up to two behind it to one side;
  - `orbRow({ levels, sizes })`;
  - `hundred({ n, on, off })`, always 82px, on the half lattice;
  - `mic(...)`, `tag(...)` (no words on it) and `magnifier(...)`;
  - `tool({ key, dark, body, accent })`, a creator tool from `../../pixels.js` (`explainer`, `podcast`, `letsplay`) on the half lattice.

  Colours are brand names (`sky`, `press`, `claret`) or hex, given as gradient stops from lit to shade. Each product keeps its own pair, with Ember as the accent; never lime or violet. Levels come from the engine and are labelled made up where the page shows them.
- **The dress:** every object gets a one cell outline in `light` (an item can set `ring`, `0` for none, and its own `light`). Dark tones get `light` dots on a diamond lattice and light tones get sparse `dark` dots, on the band's own lattice. Edges and highlights stay plain.
- **Clusters:** `specks: { colors, n }` scatters shapes of two to six cells round the hero. They keep the full calm from the words, 3 cells from every object and 8 from each other.
- **Placement:** every word (by its line boxes), chip, link, control and window in the band is a no-go zone, and so is everything above `ceiling`.
  - The hero takes the largest size in its `size` range (in px) that keeps `calm` px of clear band round it, in the spot with the most room.
  - It may bleed off the band's right or bottom edge by up to `cut` of its cells (0.3 by default; never the left or top). Its centre stays over the `within` column, so wide margins stay empty.
  - Companions keep 0.62 of the calm (an item can set its own factor as `calm`) and 3 cells from the objects already placed, and sit as near the hero as they can. A companion that does not fit is left out.
  - When the hero cannot fit, nothing is drawn, so on most phones the band stays text only.
- **Motion:** after the fonts load, each object rises into place up its columns, an orb fills to its level, and the clusters arrive last, nearest first. That takes under two seconds, then no frame runs. Reduced motion draws the final state. A ResizeObserver redraws the final state when the band changes size.
- **Faces:** no pair of small marks side by side, ever. Orbs carry no bubbles, highlights are single crescents, grilles and ledger rows are lines, and clusters are never one cell. The game pad loses Select and Start. Cameras (a lens with a dot), the moth and the pan stay out, and so do small orbs on dark bands, whose empty glass reads as a hole.
- **CSS:** `.ob-scene` in `orbe.css` puts the canvas at z-index 1, under `.ob-layer`. The band needs `position: relative`.

## Tokens (`--ob-*`)

| Group | Tokens |
| --- | --- |
| Type ladder | `--ob-t12 14 16 18 24 32 48`, then the fluid roles `--ob-t-title` (a page's title, 32 to 52px), `--ob-t-head` (a section head, 24 to 34px), `--ob-t-hero`, `--ob-t-figure` and `--ob-t-giant`. That is 12 sizes, none under 12px. The fluid ones grow between 390 and 1440 and stop there. |
| Layout | `--ob-g` (gutter: 16px on a phone, then fluid from 32px at 768 to 56px at 1440), `--ob-max` (1328px, where content stops growing), `--ob-edge` (the gutter, or more where the cap leaves room: a full-bleed band's side padding), `--ob-gap` (24px, 16 on a phone), `--ob-sec` (space between sections: 48, 64, then 80 from 1024), `--ob-head` (header height), `--ob-win-row` (window title row) |
| Motion | `--ob-ease`, the only easing, with no overshoot. In script, use `ease()` from `ease.js`. |
| Shadow | `--ob-lift` (the soft stack) and `--ob-lift-held` (a held window). There are no glows. |
| Ink | `--ob-ink` and `--ob-ink-soft`, the contextual ink. Colour pairs re-point them, along with `--rule`, `--rule-strong` and `--ob-focus`. |
| Texture | `--ob-grain` (page grain) and `--ob-grit` (coarser grain for coloured fields) |
| Shape | `--ob-arrow` (the arrow mask) |
| Colour pairs | `--ob-p-{note,spon,sell,rec,pod,also}-{bg,fg,lt,dk}`, one pair per product |
| Trail | `--ob-trail` |

- **Widths:** phone to 720, tablet 721 to 1023, desktop 1024 to 1439, wide from 1440 (the content is capped and centred). Pages use these four and no others.
- **Touch:** under a coarse pointer every control is at least 44px tall, by its own height or by a hit area that reaches past its edges without moving anything (`.ob-hit` adds one to a page's own small control). Footer links get real 44px rows.
- **Radii:** there are four. 4px for fields and small controls, 8px for buttons and cards, 12px for windows and bands, and the pill for chips and orbs.
- **Grid:** 12 columns.

## Components

- **Page:** `.ob-page` on `body` sets Paper, Ink, the text face and the reset. It also gives a pointer cursor to everything you can press. `.ob-grain` on `body` adds the fixed, multiplied grain (`::after`, z-index 60), which is off under reduced transparency.
- **Gradient light:** `.ob-lit` makes a field lit from the top left with grit. It is Sky by default; set `--ob-field` for another colour, or add `.ob-lit-cobalt` for the Cobalt band.
- **Layering:** `.ob-layer` lifts content above the trail.
- **Type:** `.ob-display` (hero), `.ob-title` (a page's title, two tones with `.ob-h2-soft`), `.ob-giant` (closing line), `.ob-figure` (big rating), `.ob-h2` with `.ob-h2-soft` for the two-tone heading, `.ob-h3`, `.ob-lede`, `.ob-says`, `.ob-note`, `.ob-k` (label), `.ob-cue` (mono stage direction) and `.ob-mono`.
- **Buttons:**
  - Primary: `<a class="ob-btn"><span class="ob-orb" aria-hidden="true"></span>See where you stand</a>`. It has an Ink gradient, a 1px top highlight, the soft stack and the orb, which fills on hover. Hover lifts the highlight; press drops it 1px.
  - Light, on dark fields: add `.ob-btn--light` for the Chalk to Paper gradient and a Cobalt orb.
  - Small: add `.ob-btn--s`.
  - Secondary: `<a class="ob-btn-q">How it works<span class="ob-q ob-q--down" aria-hidden="true"></span></a>`. Use `.ob-q--up` for an upward arrow and no modifier for one pointing right. Add `.ob-btn-q--light` on dark fields.
- **Links:** `.ob-lnk` is underlined with an arrow; `.ob-lnk--s` is the inline, small version.
- **Fields:** `.ob-input`, which has a 16px font so phones do not zoom, and `.ob-range`.
- **Window:**

  ```html
  <article class="ob-win" data-pair="spon" data-head="light">
    <div class="ob-win-bar"><span class="ob-win-title">sponsorship_quote.txt</span><a class="ob-win-lnk" href="...">Open</a></div>
    <div class="ob-win-body">
      <p class="ob-says">Know what a slot is worth.</p>
      <div class="ob-card">...the live control...</div>
      <p class="ob-note ob-win-end">...</p>
    </div>
  </article>
  ```

  `data-pair` is one of `note`, `spon`, `sell`, `rec`, `pod` or `also`. It paints the body as that product's colour pair, and inside it every ink, rule and focus ring follows. Use `.ob-win-ctl` and `.ob-win-btn` for title-row controls. A window whose body is dark (`sell`, `also`) also takes `data-head="dark"`.
- **Chips:** `<span class="ob-chip" data-i="source">With the API</span>` inside `.ob-chips`. The available icons are `source`, `payout`, `record` and `time`.
- **Stat strip:** `<dl class="ob-strip"><div><dt>Fee</dt><dd>£17,600</dd></div>...</dl>`, three figures with hairlines between them.
- **Focus:** a 2px `:focus-visible` ring in `--ob-focus` (Cobalt, or the pair's ink inside a window), and `.ob-skip` for the skip link.

## Rules that still apply

- No em or en dashes anywhere, code included.
- No purple, no glows, no faces, no badges or seals.
- Engine figures are labelled made up.
- Run `node scripts/check-site.mjs <your folder>` before you ship. It must report 0 findings.
