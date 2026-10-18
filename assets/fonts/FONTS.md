# Fonts

The site's type is "Masthead": Schibsted Grotesk for headlines, interface and figures; Newsreader for the italic line and serif text; Commit Mono for addresses, handles and dates only. `../fonts.css` defines the families and sets `--sans`, `--serif` and `--mono`. `../r5/type.css` routes figures and labels by role.

## Files in use

| File | Family | Axes kept | Source | Licence |
|---|---|---|---|---|
| `SchibstedGrotesk-Latin-VF.woff2` | Schibsted Grotesk, roman | wght 400 to 900 | google/fonts `ofl/schibstedgrotesk/SchibstedGrotesk[wght].ttf` (v1.100) | SIL OFL 1.1, `SchibstedGrotesk-OFL.txt` |
| `SchibstedGrotesk-Italic-Latin-VF.woff2` | Schibsted Grotesk, italic | wght 400 to 900 | google/fonts `SchibstedGrotesk-Italic[wght].ttf` | SIL OFL 1.1 |
| `Newsreader-Latin-VF.woff2` | Newsreader, roman | wght 300 to 700, opsz 6 to 72 | google/fonts `ofl/newsreader/Newsreader[opsz,wght].ttf` (v1.003) | SIL OFL 1.1, `Newsreader-OFL.txt` |
| `Newsreader-Italic-Latin-VF.woff2` | Newsreader, italic | wght 300 to 700, opsz 6 to 72 | google/fonts `Newsreader-Italic[opsz,wght].ttf` | SIL OFL 1.1 |
| `CommitMono-Latin-VF.woff2` | Commit Mono, upright | wght 400 to 600 | github.com/eigilnikolajsen/commit-mono `src/fonts/fontlab/CommitMonoV143-VF.ttf` (v1.143) | SIL OFL 1.1, `CommitMono-OFL.txt` |

### How they were made

Full upstream files, not Fontsource builds: Fontsource's Latin subsets drop OpenType features (its Schibsted has no `case`, `calt`, `zero`, `sups` or `ordn`; its Newsreader has no `case`, `sups` or `ordn`). Each file was subset with fonttools to the Latin range (U+0000 to 00FF, U+0131, U+0152 to 0153, U+02BB to 02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000 to 206F, U+20AC, U+2122, U+2190 to 2199, U+2212, U+2215, U+2260, U+2264 to 2265, U+FEFF, U+FFFD), keeping these features where the font has them: `kern mark mkmk ccmp locl liga calt rvrn case pnum tnum lnum onum zero frac numr dnom sups ordn`. Newsreader's weight range was narrowed to 300 to 700 and Commit Mono's to 400 to 600 (upright only) with the fonttools instancer. Output is woff2 (brotli).

Kept: Schibsted `calt case ccmp dnom frac liga locl numr ordn pnum sups tnum zero`, Newsreader `case liga ordn pnum rvrn sups tnum`, both with `kern mark mkmk`. Commit Mono has no layout features in its upstream variable file; it needs none here.

To rebuild: `pip install --target <scratch> fonttools brotli`, then `python3 subset.py <scratch> <upstream> <out>` (`subset.py` here). Never install into the repo.

## Kept, not used

- `TimelessSansVF.woff2`, `TimelessSerifVF.woff2`, `TimelessSerifItalicVF.woff2`: **Timeless is not OFL.** It is under the bespoke "Timeless Free Font License 1.2". Its terms must be checked before any use, in any page, image or product. The files stay only so archived boards render as they were; `fonts.css` still declares them for that reason, and no current page asks for them.
- `PaperMonoVF.woff2`: Paper Mono, SIL OFL 1.1 (`PaperMono-OFL.txt`). Replaced by Commit Mono.
