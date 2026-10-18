# The card: notes

## The idea

A sun over a horizon. The horizon is zero, typical for creators of your kind and size. The sun rises with your rating, through faint lines where Good (+0.8) and Great (+2) begin, and sinks when work runs under typical. It is Orbe's orb doing a job: it explains the number at a glance, and it reads as a poster, not a dashboard.

## Reading order (two seconds)

1. Whose: the name in the serif, then the platform.
2. The picture: how high the sun is.
3. The number and its band, set large on the ground: "+1.12 Good".
4. Against whom: "Against newsletters with 10k to 50k subscribers."
5. The #1 stat (percentile against creators that size) and the best of the last twelve works (against the creator's own median).
6. orbe.vc/@handle, the wordmark, and the small print.

## Decisions

- **Two flat fields.** Sky and ground, split by the horizon. No gradients, glows, seals, badges or ticks. The orb is a plain disc clipped by the ground.
- **Three themes, all from the r5 palette.** Paper (paper sky, ink ground, orange sun), Night (ink sky, paper ground, paper moon), Sun (orange sky, ink ground, paper sun).
- **Type.** Timeless Serif for the name, figure and italic band; Timeless Sans for stats and the link; Paper Mono for labels and the scale. A true minus for negative ratings.
- **Formats.** Square for feeds. Story keeps essentials out of the top 220px and bottom 180px that Instagram and TikTok cover, and always stacks the band under the figure. Link preview puts the stats in a right column.
- **Every kind in its own words.** Uploads, issues, streams, episodes, photo sets; subscribers or followers; channels, newsletters, streamers, shows, photographers.
- **Honest.** "Best of the last twelve", not "personal best", unless an all-time best exists. The small print carries "Independently calculated by Orbe", the model version, "on provisional benchmarks" while it is true, and on this page "A made-up creator, rated live by the Orbe engine."
- **One drawing everywhere.** The page, the PNG and the API's SVG are the same code (`product/src/card`, built into `assets/engine/card`).

## Rounds

1. Figure standing on a single horizon line, sun beside it. Orb collided with the figure in story; dead sky; scale labels hidden.
2. Two-tone poster, figure moved to the ground. Much stronger.
3. Labels above their lines; link preview stats restacked.
4. Band drops under the figure when it does not fit; story layout fixed.
5. Edge cases: long names wrap, long URLs fit, markup escaped, negative and off-scale ratings.
6. Story always stacked; small print on two lines so the independence label is never cut.
