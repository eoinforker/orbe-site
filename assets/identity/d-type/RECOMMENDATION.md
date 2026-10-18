# Typeface options: ranked shortlist

Status: options only, per the founder. Nothing is chosen, refined or swapped into the site. Full specimens are in board.html; screenshots in shots/.

All candidate faces are SIL Open Font License 1.1 (checked in each @fontsource package.json and LICENSE). Files and licence texts are in fonts/<family>/. The current Timeless Sans and Timeless Serif are under the bespoke "Timeless Free Font License 1.2", not OFL; Paper Mono is OFL.

## Shortlist

1. **Masthead**: Schibsted Grotesk (display, UI, figures) + Newsreader (italic turn, card text) + Commit Mono (handles only). A grotesk with a newsroom's backbone, the best open italic, and figures with weight at £142,300. Recommended for refinement.
2. **Ledger**: Inter, Display optical size (display, UI, figures) + Newsreader + Commit Mono. Faultless and calm, the safest financial-grade choice, but Inter is everyone's face.
3. **Broadsheet**: Newsreader (headlines and big figures) + Inter (UI, body) + Geist Mono. The most editorial and ownable; reads as a publication before a financial product, and its plus sign is thin.

Also shown and ranked lower: Schibsted with Literata (4), Geist with Source Serif 4 (5), Timeless kept with figures fixed (6), IBM Plex (7), Instrument (8), Fraunces (9).

## Findings that hold whichever faces are chosen

- Set big figures (+0.64, £142,300) in the display sans with proportional lining figures. Keep tabular figures for columns and live counters only.
- Keep mono only for addresses and dates (orbe.vc/@handle). Scores, weights and percentiles go in the sans with tabular figures.
- Fontsource subsets drop some OpenType features (case forms, stylistic sets). For production, take the full upstream files and subset them ourselves.
