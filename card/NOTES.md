# The card: notes

## The idea

The lap. The O of Orbe goes round as a measure. One lap is the yardstick the card names, said once in italic under the drawing: your usual work, your old best, or a hundred creators your size. The stroke goes round as far as you went and lands on the ball. Past one lap the O closes and the stroke carries on inside it as a finer lap; short of one, the O stays open, with a hairline for the rest of the lap. The creator's own work (their thumbnail, cover, show art or photo) sits in the window inside the laps, so the card frames their work rather than ours. It is what Orbe does, drawn: every lap measured against your own last one.

The runner-up, the sticker (the work full-bleed with a paper sticker carrying the same words and a small lap), stays on the concepts board at `concepts/` so the founder can choose.

## A card is a moment

| Moment | The sentence | The figure | One lap is |
|---|---|---|---|
| Personal best, minutes after posting | "My best first day yet." or "New personal best: most views on an upload." | 238,091, past my old best of 210,770 | my old best |
| Without a record: best of the last twelve | "My new upload is my best of the last twelve." | 1.8× my usual upload | my usual upload |
| Rating | "Better reach than 86 in 100 newsletters my size." | +1.12 *Good*, Orbe Rating against newsletters with 10k to 50k subscribers | 100 newsletters my size |
| Year or season | "25 uploads in 2026 so far." | 2.3× my usual upload, for the best of them | my usual upload |
| Up a size | "Moved up a size." | 250k to 1M subscribers, up from 100k to 250k | (the stroke winds out from the old size, a hairline ring inside) |

The sentence comes first and is said in the creator's voice; the number and band back it. Without the data a moment needs, the card falls back to the rating.

## Reading order (two seconds)

1. The drawing, with the creator's work in it.
2. The sentence.
3. The figure, in the accent, which is also the colour of the ball: they are the same fact.
4. The address and the wordmark.
5. The label, once, small: "Independently calculated by Orbe" (with "not YouTube" on YouTube cards), then "On provisional benchmarks" while true and any example note.

## Decisions

- **Identity.** The A3 "Carved" wordmark, drawn from its own path in the cut for its size. Masthead type: Schibsted Grotesk for the sentence, figures (proportional lining figures) and words; Newsreader's italic for the band, the key and a window title; Commit Mono for the address only. Text names each face and also goes through `var(--sans)`, `var(--serif)` and `var(--mono)`, so an inline card follows the page.
- **The lap's drawing** is A3's O: a ring with a gentle vertical stress (heavier on the sides), 1.09 times as tall as wide. The inner laps are waisted and flare at their ends, like the wordmark's strokes. Drawn to the measure up to four laps; past that the figure says the rest.
- **The work.** Any image the creator supplies, or reads in from their own public work with their consent, is cropped to fill the window. Only an image data URI or an https URL is drawn. Without one, the window holds the work's title in italic, else the name.
- **Three themes**, one flat field each: Paper (ink lap, orange ball), Ink (paper lap, orange ball), Sun (orange field, ink lap, paper ball). No gradients, glows, seals, badges or ticks.
- **Formats.** Story keeps everything between the top 220px and the bottom 240px that Instagram and TikTok cover. Square and story stack the drawing over the words; the link preview puts the words left and the drawing right.
- **Type set with care.** Sentences are fitted and then balanced so no word sits alone, and "86 in 100" never breaks.
- **One drawing everywhere.** The page, the PNG and the API's SVG are the same code (`product/src/card`, built into `assets/engine/card`).

## Files

- `index.html`, `main.js`, `style.css`: the card page, with moment, kind, format, theme and picture switchers and Download PNG.
- `../assets/r5/card.js`: the browser wrapper (render, embed fonts, rasterise).
- `../assets/r5/artwork.js`: the made-up artwork for the five made-up creators.
- `../assets/r5/examples.js`: each example's moments (`example(kind).card`), all from the engine.
- `concepts/`: the board, with round one, the chosen lap, the runner-up and screenshots in `concepts/shots/`.

## When the identity files change

The wordmark is the final A3 from `site/assets/r5/wordmark.js`, both cuts ("text" from 25px tall, "small" below, as on the site), copied into `product/src/card/wordmark.ts`; regenerate that file if the drawing changes. `site/assets/fonts.css` does not carry the Masthead faces yet, so the card and this page use the identity board's files (`site/assets/identity/d-type/fonts`). When fonts.css lands: point `SITE_FONTS` in `product/src/card/fonts.ts` at the final files, drop the temporary `@font-face` block at the top of `style.css`, re-measure `metrics-data.ts` if the files differ, then `npm run build:engine`.

## Rounds

1. The sun over a horizon (the first card). The founder's verdict: a template, not a moment; it led with a number; none of the creator's work; a stock metaphor; too much small print.
2. Nine concepts at story and square (board, round one). Kept the lap and the sticker.
3. The lap built into the production renderer: moments, the window, balanced type, the label once.
4. Moved to the chosen identity: A3's carved O, Masthead type, mono for the address only.
