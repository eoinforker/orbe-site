# Orbe, the shared system

The homepage (`site/try-d/`, promoted to `site/index.html`) is built on these files. Every other page can move onto them the same way. This guide covers the files, the tokens, the components, and how a page mounts the header, footer and trail.

| File | What it is |
| --- | --- |
| `orbe.css` | Tokens and components: page, grain, gradient light, type ladder, buttons, links, fields, the window with its colour pairs, chips, the stat strip, focus, the header and the footer. |
| `chrome.js` | `mountHeader` and `mountFooter`, the shared header (the lockup, the Products menu, How it works, For teams, Pricing and the Reserve button: the one navigation on every page) and the public footer with the looping wordmark. `PILLARS` is the one list of what Orbe is: four pillars (Grow, Earn, Protect, Teams), each with a short line and its tools, each tool with one line on it and its colour pair. `PRODUCTS` is the same tools, flat; `LEAD` is Your Orbe, the home; `NAV`, `SHEET`, `FOOTER` and `ALL_PRODUCTS` are built from them. |
| `mark.js` | The Portal, Orbe's mark: both cuts as paths, `portalMarkup` (bare, currentColor), `tileMarkup` (on a coloured tile) and `LOCKUP`, the lockup's numbers. `.ob-lockup` in `orbe.css` sets the mark beside the wordmark. |
| `trail.js` | `mountTrail`, the pointer trail for any page. |
| `ease.js` | The one easing as a function (`ease`), its CSS string (`EASE`) and `reducedMotion()`. |
| `scene.js` | `mountScene`, a product band's one crafted lattice object in the free space on its right, and the objects themselves. |

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
- `current` is the active product path, such as `"products/rate/"`. That link gets `aria-current="page"` in the Products menu and the phone sheet, and the Products button is underlined.
- Mount the footer before the header. The header then sees the footer's fields. If a page adds fields later, call `header.rescan()`.
- `mountFooter` accepts `people`, a list of `{ name, beats }` from the engine, for the looping wordmark. Without it, the footer reads the made-up creators in `../r5/examples.js`. Pass `note` to change the honesty line. It must still say the creators are made up and that Orbe calculated the figures.

## Orbe's four pillars

Orbe is creator tooling in four pillars, and every list of tools on the site uses them in this order, with these names:

| Pillar | Short line | Tools |
| --- | --- | --- |
| Grow | Know where you stand, and get better. | Your Orbe (the home), Rate my work, Podcasts |
| Earn | Get paid fairly when money moves. | Sponsorships, Fair offer check, Selling, Diligence |
| Protect | Your work, and who may use it. | Protect (fingerprints for images, video and audio), Rights |
| Teams | For the people around creators. | Roster, For teams, For developers |

Edit `PILLARS` in `chrome.js` to add or move a tool; the menu, the phone sheet and the footer follow. The products page (`site/products/`) groups its cards the same way. Chips use four labels only: Works today, With the API, Coming and Made up.

## The Products menu

From 721px up the header holds the lockup, a Products button, How it works, For teams, Pricing and the Reserve button. There is no second row of links under it on any page.

- **The panel:** a mega menu in solid Paper under the bar, across the content column (from gutter to gutter), 12px radius, the held shadow. The four pillars are four columns with hairlines between them (two by two on a tablet): the pillar's name in mono capitals and its short line, then each tool (a small swatch in its colour pair, its name, one line on what it does). All products sits under a hairline across the bottom. The page you are on is Chalk with its name underlined.
- **Keyboard:** the button carries `aria-expanded`. Enter or Space opens it; the arrow keys open it too and move between the links in reading order, column by column (Home and End as well), and Tab moves through them as usual. Each pillar's list is labelled by its heading. Escape closes it and puts focus back on the button.
- **Closing:** the button, Escape, any link, a click outside it, focus leaving it, or the screen shrinking to a phone.
- **Colours:** the button is a header part, so it recolours with the links over light and dark fields; the panel stays Paper. The Products button is underlined on a product page; For teams and Pricing underline their own links.

## The header on a phone

Up to 720px the links and the Reserve button move into a sheet. The bar keeps the wordmark and a Menu button (44px). The sheet is full width, solid Paper, and starts under the bar (which turns opaque Paper while it is open), so nothing ever scrolls under the logo or Close. It fits one 390 by 844 screen without scrolling: Your Orbe as the one large lead link, then the four pillars, each a compact mono heading with its short line and its tools two to a row (18px, 44px rows), then the Reserve button at full height, then one quiet row of How it works, For teams, Pricing and All products. Brand, Terms and Privacy live in the footer. Focus stays inside the sheet (the Menu button included) while it is open; Escape, the button, any link in it, or the screen growing past 720px closes it, and the page behind does not scroll.

## The footer

One compact column per pillar (Grow, Earn, Protect, Teams), then Orbe (Reserve your handle, How it works, All products, Pricing, Brand) and Legal: six columns beside the mark on a desktop, three on a tablet, two on a phone.

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

`mountScene(band, { item, light, dark, specks, calm = 44, ceiling = ".ob-bar", within = ".wrap", side = 0.5, minWidth = 0 })` draws one lattice object into a band. The product pages mount theirs through `site/products/assets/bands.js`: Rate, Podcasts, Sponsorships, Roster and the hub carry one; Selling, Diligence and the card carry none.

```js
import { mountScene, orb } from "../assets/orbe/scene.js";
mountScene(document.querySelector(".pr-band"), {
  light: "water", dark: "ink", specks: { colors: ["sky", "ember"], n: 3 },
  item: { make: orb({ level: 0.93, rim: ["chalk", "mist", "sky", "water"], liquid: ["mist", "sky", "water", "press"] }), size: [120, 250] },
});
```

- **The cast:** `orb({ level, rim, liquid, tint })` (filled by area, so 0.5 is the middle), `orbDepth({ levels })` (one orb in front, up to two behind to one side), `mic(...)`, `camera(...)` and `tool({ key })` (the bulb, microphone or game pad from `../../pixels.js`, on the half lattice). Colours are brand names or hex, as gradient stops from lit to shade.
- **One piece:** one object per band, never companions. `specks` adds at most three small clusters (two to six cells) near it.
- **The dress:** a one cell outline in `light`, `light` dots on a diamond lattice over dark tones, sparse `dark` dots over light ones. Edges and highlights stay plain.
- **Placement:** every word (by line boxes), chip, link, control and window in the band is a no-go zone, and so is everything above the bottom of `ceiling` (the fixed header bar). The object takes the largest size in `size` (px) that keeps `calm` px clear, with its centre in the right part of the `within` column (from `side`, a fraction of it). It leans on the open bottom or right edge (about `bleed`, 0.15 by default, never more than `cut`, 0.3). Below `minWidth`, or when nothing fits, the canvas hides. The canvas is absolute, so the band never changes height.
- **Motion:** after the fonts load the object rises up its columns once and an orb fills to its level, then nothing runs. Reduced motion draws the final state. A ResizeObserver redraws the final state.
- **Faces:** no pair of small marks side by side. Orbs have no bubbles and one crescent; grilles are lines; clusters are never one cell. The camera has one lens with a crescent, no catchlight dot, no viewfinder window and no flash. The moth, the pan and the homepage camera stay out.
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
