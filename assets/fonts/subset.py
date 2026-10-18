# Subsets the upstream Masthead fonts to Latin woff2, keeping case forms and figure features (see FONTS.md).
# Usage: python3 subset.py <dir with fonttools+brotli> <upstream dir: gf/ and cm/repo/> <out dir>
import sys; sys.path.insert(0, sys.argv[1])
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer
up, out = sys.argv[2], sys.argv[3]
LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+2260,U+2264-2265,U+00D7,U+FEFF,U+FFFD"
FEATS = "kern,mark,mkmk,ccmp,locl,liga,calt,rvrn,case,pnum,tnum,lnum,onum,zero,frac,numr,dnom,sups,ordn"
jobs = [
  (f"{up}/gf/schibstedgrotesk_SchibstedGrotesk[wght].ttf", "SchibstedGrotesk-Latin-VF.woff2", None),
  (f"{up}/gf/schibstedgrotesk_SchibstedGrotesk-Italic[wght].ttf", "SchibstedGrotesk-Italic-Latin-VF.woff2", None),
  (f"{up}/gf/newsreader_Newsreader[opsz,wght].ttf", "Newsreader-Latin-VF.woff2", {"wght": (300, 700)}),
  (f"{up}/gf/newsreader_Newsreader-Italic[opsz,wght].ttf", "Newsreader-Italic-Latin-VF.woff2", {"wght": (300, 700)}),
  (f"{up}/cm/repo/src/fonts/fontlab/CommitMonoV143-VF.ttf", "CommitMono-Latin-VF.woff2", {"wght": (400, 600), "ital": 0}),
]
for src, name, limits in jobs:
    f = TTFont(src)
    if limits:
        f = instancer.instantiateVariableFont(f, limits); f.save(out + '/_tmp.ttf'); f = TTFont(out + '/_tmp.ttf')
    opts = subset.Options()
    opts.layout_features = FEATS.split(",")
    opts.flavor = "woff2"
    opts.name_IDs = ["*"]; opts.name_languages = ["*"]; opts.notdef_outline = True
    opts.hinting = True; opts.drop_tables += ["DSIG"]
    s = subset.Subsetter(opts)
    s.populate(unicodes=subset.parse_unicodes(LATIN))
    s.subset(f)
    f.flavor = "woff2"; f.save(f"{out}/{name}")
    g = TTFont(f"{out}/{name}")
    feats = sorted({fr.FeatureTag for fr in g['GSUB'].table.FeatureList.FeatureRecord}) if 'GSUB' in g else []
    import os
    print(name, os.path.getsize(f"{out}/{name}"), len(g.getGlyphOrder()), feats, sorted({fr.FeatureTag for fr in g['GPOS'].table.FeatureList.FeatureRecord}) if 'GPOS' in g else [], [(a.axisTag, a.minValue, a.maxValue) for a in g['fvar'].axes] if 'fvar' in g else '')
