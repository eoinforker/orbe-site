/*
  design-tiles: one short Orbe sentence set as solid colour tiles packed
  edge to edge into a single bar, which keeps reshuffling its swatches.

  Essentials kept from the spec:
  - one tile per word, auto sized to the word, no gaps, uniform height,
    the whole bar rounded as one unit
  - each tile's fill is built from per glyph rects that hug the letters'
    real ink (measured from the live font), so the top edge steps with
    the ascenders; hovering a letter lifts its rect a touch
  - the brand's five colours (Ink, Cobalt, Sky, Ember, Paper; Claret and
    Peony in place of Cobalt and Sky in pink), text colour baked in
  - fly in: each tile wipes open left to right with clip-path (never
    scaleX, so the type never distorts), a small rise and a fade, staggered
  - idle shuffle: each tile re rolls on its own timer by trading swatches
    with another tile; hovering a tile re rolls it at once
  - reduced motion shows the assembled bar, still

  Usage: import { mount } from "./design-tiles.js";
         const fx = mount(el, { words, scheme: "blue" }); fx.destroy();
*/

export const WORDS = ["rated", "against", "creators", "your", "size"];

// The brand's five, text colour baked in: Ink, Cobalt, Sky, Ember, Paper.
// No paint colours: Meadow, Straw, Water and the rest stay in the paintings.
export const SWATCHES = [
  { bg: "#141311", fg: "#F3F0E8" }, // Ink
  { bg: "#1F4BFF", fg: "#FBFAF6" }, // Cobalt
  { bg: "#9EE9FB", fg: "#141311" }, // Sky
  { bg: "#FF5A1F", fg: "#141311" }, // Ember
  { bg: "#F3F0E8", fg: "#141311" }, // Paper
];

// The pink scheme swaps Cobalt and Sky for Claret and Peony. Cobalt never
// appears here, so peony never sits beside it.
export const SWATCHES_PINK = [
  { bg: "#141311", fg: "#F3F0E8" }, // Ink
  { bg: "#6F1726", fg: "#FBD9E0" }, // Claret
  { bg: "#F2879E", fg: "#141311" }, // Peony
  { bg: "#FF5A1F", fg: "#141311" }, // Ember
  { bg: "#F3F0E8", fg: "#141311" }, // Paper
];

// The field each scheme sets the bar on. The tile that wears the field's own
// colour reads as a word set straight on the field, so it never ends a row.
export const GROUND = { blue: "#9EE9FB", pink: "#F2879E" };

const SVGNS = "http://www.w3.org/2000/svg";
const REF_FS = 100;
const BASELINE_Y = 100;
const BAND_ASCENT = 82;
const BAND_DESCENT = 34;
const PAD_Y = 9;
const PAD_X = 9;

const FLY_STAGGER = 130;
const FLY_MS = 760;
const SHUFFLE_MIN = 1300;
const SHUFFLE_MAX = 3200;
// A colour change is wiped in left to right, never interpolated: a blend of
// Cobalt into Ember or Paper passes through lilac, and purple is banned.
const COLOR_MS = 420;
const EASE = "cubic-bezier(.16,1,.3,1)";

// Glyph metrics from canvas: pen position by prefix width (keeps kerning),
// ink top and bottom from the glyph's own bounding box.
function measureWord(word, family, weight) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = `${weight} ${REF_FS}px ${family}`;
  const glyphs = [];
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const x = ctx.measureText(word.slice(0, i)).width;
    const m = ctx.measureText(ch);
    glyphs.push({
      ch,
      x,
      w: m.width,
      top: BASELINE_Y - (m.actualBoundingBoxAscent || REF_FS * 0.7),
      bottom: BASELINE_Y + (m.actualBoundingBoxDescent || 0),
    });
  }
  return { glyphs, width: ctx.measureText(word).width };
}

/* Peony and cobalt never touch: BRAND keeps the two schemes' leads apart. */
const CLASH = { "#F2879E": "#1F4BFF", "#1F4BFF": "#F2879E" };
const bad = (x, y) => !!x && !!y && (x.bg === y.bg || CLASH[x.bg] === y.bg);

const schemeOf = (opts) => {
  const s = opts.scheme || document.documentElement.getAttribute("data-scheme");
  return s === "pink" ? "pink" : "blue";
};

export function mount(el, opts = {}) {
  const words = opts.words || WORDS;
  const scheme = schemeOf(opts);
  const swatches = opts.swatches || (scheme === "pink" ? SWATCHES_PINK : SWATCHES);
  const ground = opts.ground === undefined ? GROUND[scheme] : opts.ground;
  const family = opts.font || "\"Newsreader\", Georgia, serif";
  const weight = opts.weight || "560";
  const reduced =
    opts.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (getComputedStyle(el).position === "static") el.style.position = "relative";

  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    webkitUserSelect: "none",
  });
  if (ground) root.style.background = ground;
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", words.join(" "));

  const bar = document.createElement("div");
  Object.assign(bar.style, {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
  });
  // On a narrow card the bar folds once, at the word that best halves it.
  const brk = document.createElement("span");
  Object.assign(brk.style, { flexBasis: "100%", height: "0", display: "none" });
  root.appendChild(bar);
  el.appendChild(root);

  // A row end is the first and last tile, plus either side of the fold.
  let split = -1;
  const isEnd = (i, n) => i === 0 || i === n - 1 || i === split || i === split - 1;
  const fits = (arr, i) => {
    const sw = arr[i];
    if (ground && sw.bg.toLowerCase() === String(ground).toLowerCase() && isEnd(i, arr.length)) return false;
    return !bad(sw, arr[i - 1]) && !bad(sw, arr[i + 1]);
  };
  const valid = (arr) => arr.every((_, i) => fits(arr, i));
  // Start from the swatch order, rotated until the field colour sits inside a row.
  const initial = () => {
    for (let r = 0; r < swatches.length; r++) {
      const arr = words.map((_, i) => swatches[(i + r) % swatches.length]);
      if (valid(arr)) return arr;
    }
    return words.map((_, i) => swatches[i % swatches.length]);
  };
  const start = initial();
  const tiles = words.map((word, i) => {
    const sw = start[i];
    const outer = document.createElement("span");
    Object.assign(outer.style, {
      display: "block",
      position: "relative",
      flex: "0 0 auto",
      clipPath: "inset(0 100% 0 0)",
      transform: "translateY(10px)",
      opacity: "0",
      transition: `clip-path ${FLY_MS}ms ${EASE}, transform ${FLY_MS}ms ${EASE}, opacity ${Math.round(FLY_MS * 0.6)}ms ease`,
    });
    const svg = document.createElementNS(SVGNS, "svg");
    svg.style.display = "block";
    svg.style.overflow = "visible";
    const g = document.createElementNS(SVGNS, "g");
    const text = document.createElementNS(SVGNS, "text");
    text.setAttribute("font-size", String(REF_FS));
    text.style.fill = sw.fg;
    text.style.fontFamily = family;
    text.style.fontWeight = weight;
    text.style.letterSpacing = "0";
    text.textContent = word;
    svg.appendChild(g);
    svg.appendChild(text);
    outer.appendChild(svg);
    bar.appendChild(outer);
    return { outer, svg, g, text, word, swatch: sw, rects: [], vbW: 100, nextShuffle: 0, done: "inset(0 0 0 0)" };
  });

  const layout = () => {
    let total = 0;
    for (const t of tiles) {
      const m = measureWord(t.word, family, weight);
      t.g.replaceChildren();
      t.rects = [];
      const bandTop = BASELINE_Y - BAND_ASCENT;
      const bandBottom = BASELINE_Y + BAND_DESCENT;
      const width = m ? m.width : t.word.length * 50;
      if (m) {
        // One rect per glyph, from this pen position to the next, its height
        // set by the glyph's own ink. The first and last carry the side pad.
        for (let i = 0; i < m.glyphs.length; i++) {
          const gl = m.glyphs[i];
          const next = m.glyphs[i + 1];
          const left = i === 0 ? -PAD_X : gl.x;
          const right = next ? next.x : width + PAD_X;
          const top = Math.max(bandTop, Math.min(gl.top, BASELINE_Y - 50) - PAD_Y);
          const r = document.createElementNS(SVGNS, "rect");
          r.setAttribute("x", String(left));
          r.setAttribute("width", String(right - left + 2));
          r.setAttribute("y", String(top));
          r.setAttribute("height", String(bandBottom - top));
          r.style.fill = t.swatch.bg;
          r.style.transition = "y 160ms ease, height 160ms ease";
          t.g.appendChild(r);
          t.rects.push({ el: r, x0: left, x1: right, baseY: top, baseH: bandBottom - top, hovered: false });
        }
      }
      t.text.setAttribute("x", "0");
      t.text.setAttribute("y", String(BASELINE_Y));
      t.vbW = width + PAD_X * 2;
      t.svg.setAttribute("viewBox", `${-PAD_X} ${bandTop} ${t.vbW} ${bandBottom - bandTop}`);
      total += t.vbW;
    }
    // Fit the bar: as tall as allowed, never wider than the card. If one
    // line would set the type too small, fold it into two rows.
    const vbH = BAND_ASCENT + BAND_DESCENT;
    const maxW = el.clientWidth * 0.88;
    const maxH = Math.min(el.clientHeight * 0.34, 72);
    let hpx = Math.min(maxH, (maxW * vbH) / total);
    split = -1;
    if (hpx < 34 && tiles.length > 1) {
      let best = Infinity;
      let acc = 0;
      for (let i = 0; i < tiles.length - 1; i++) {
        acc += tiles[i].vbW;
        const wide = Math.max(acc, total - acc);
        if (wide < best) {
          best = wide;
          split = i + 1;
        }
      }
      hpx = Math.min(maxH, (maxW * vbH) / best);
    }
    hpx = Math.max(18, hpx);
    brk.remove();
    if (split > 0) {
      bar.insertBefore(brk, tiles[split].outer);
      brk.style.display = "block";
    }
    // A fold can move a row end onto the field coloured tile: trade it inward.
    if (!valid(tiles.map((t) => t.swatch))) {
      const fix = initial();
      tiles.forEach((t, i) => paint(t, fix[i]));
    }
    // Round the outer ends of each row, so each row reads as one unit.
    const rad = Math.round(hpx * 0.16);
    tiles.forEach((t, i) => {
      t.svg.style.height = `${hpx}px`;
      t.svg.style.width = `${((t.vbW * hpx) / vbH).toFixed(2)}px`;
      const first = i === 0 || i === split;
      const last = i === tiles.length - 1 || i === split - 1;
      const r = `${first ? rad : 0}px ${last ? rad : 0}px ${last ? rad : 0}px ${first ? rad : 0}px`;
      t.done = `inset(0 0 0 0 round ${r})`;
      t.hidden = `inset(0 100% 0 0 round ${r})`;
      if (revealed) t.outer.style.clipPath = t.done;
      else t.outer.style.clipPath = t.hidden;
    });
  };

  const paint = (t, sw, wipe = false) => {
    t.swatch = sw;
    const id = (t.wipeId = (t.wipeId ?? 0) + 1);
    const apply = () => {
      for (const r of t.rects) r.el.style.fill = sw.bg;
      t.text.style.fill = sw.fg;
    };
    t.wipe?.remove();
    t.wipe = null;
    if (!wipe || reduced || !t.rects.length) return apply();
    // The new colour arrives as a copy of the tile, uncovered left to right;
    // the tile underneath takes the colour when the copy has fully landed.
    const ov = t.svg.cloneNode(true);
    for (const r of ov.querySelectorAll("rect")) Object.assign(r.style, { transition: "none", fill: sw.bg });
    Object.assign(ov.querySelector("text").style, { transition: "none", fill: sw.fg });
    Object.assign(ov.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", clipPath: "inset(0 100% 0 0)", transition: `clip-path ${COLOR_MS}ms cubic-bezier(.5,0,.2,1)` });
    t.outer.appendChild(ov);
    t.wipe = ov;
    ov.getBoundingClientRect();
    ov.style.clipPath = "inset(0 0 0 0)";
    setTimeout(() => {
      if (t.wipeId !== id) return;
      apply();
      ov.remove();
      t.wipe = null;
    }, COLOR_MS + 40);
  };
  // A re roll trades swatches with another tile, so every tile keeps its own
  // colour and the rules (field colour inside a row, no clash) always hold.
  const recolor = (t) => {
    const i = tiles.indexOf(t);
    const cur = tiles.map((o) => o.swatch);
    const order = tiles.map((_, j) => j).filter((j) => j !== i).sort(() => Math.random() - 0.5);
    for (const j of order) {
      const next = cur.slice();
      [next[i], next[j]] = [next[j], next[i]];
      if (!valid(next)) continue;
      paint(tiles[i], next[i], true);
      paint(tiles[j], next[j], true);
      return;
    }
  };

  const hoverLetter = (t, e) => {
    const rect = t.svg.getBoundingClientRect();
    if (rect.width < 1) return;
    const vb = t.svg.viewBox.baseVal;
    const scale = vb.width / rect.width;
    const grow = 4 * scale;
    const px = vb.x + ((e.clientX - rect.left) / rect.width) * vb.width;
    for (const r of t.rects) {
      const hit = px >= r.x0 && px < r.x1;
      if (hit === r.hovered) continue;
      r.hovered = hit;
      r.el.style.y = `${hit ? r.baseY - grow : r.baseY}px`;
      r.el.style.height = `${hit ? r.baseH + grow : r.baseH}px`;
    }
  };
  const clearHover = (t) => {
    for (const r of t.rects) {
      if (!r.hovered) continue;
      r.hovered = false;
      r.el.style.y = `${r.baseY}px`;
      r.el.style.height = `${r.baseH}px`;
    }
  };

  const cleanup = [];
  for (const t of tiles) {
    const enter = () => {
      if (!reduced) recolor(t);
    };
    const move = (e) => hoverLetter(t, e);
    const leave = () => clearHover(t);
    t.svg.addEventListener("pointerenter", enter);
    t.svg.addEventListener("pointermove", move);
    t.svg.addEventListener("pointerleave", leave);
    cleanup.push(() => {
      t.svg.removeEventListener("pointerenter", enter);
      t.svg.removeEventListener("pointermove", move);
      t.svg.removeEventListener("pointerleave", leave);
    });
  }

  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    tiles.forEach((t, i) => {
      const id = window.setTimeout(() => {
        t.outer.style.clipPath = t.done;
        t.outer.style.transform = "translateY(0)";
        t.outer.style.opacity = "1";
      }, i * FLY_STAGGER);
      cleanup.push(() => window.clearTimeout(id));
    });
    const assembled = performance.now() + tiles.length * FLY_STAGGER + FLY_MS;
    for (const t of tiles) {
      t.nextShuffle = assembled + SHUFFLE_MIN + Math.random() * (SHUFFLE_MAX - SHUFFLE_MIN);
    }
  };

  const still = () => {
    revealed = true;
    for (const t of tiles) {
      t.outer.style.transition = "none";
      t.outer.style.clipPath = t.done;
      t.outer.style.transform = "none";
      t.outer.style.opacity = "1";
    }
  };

  let raf = 0;
  let running = false;
  let onScreen = false;
  let hidden = document.hidden;
  let destroyed = false;

  const loop = () => {
    raf = 0;
    const now = performance.now();
    for (const t of tiles) {
      if (t.nextShuffle && now >= t.nextShuffle) {
        recolor(t);
        t.nextShuffle = now + SHUFFLE_MIN + Math.random() * (SHUFFLE_MAX - SHUFFLE_MIN);
      }
    }
    if (running) raf = requestAnimationFrame(loop);
  };

  const sync = () => {
    const should = onScreen && !hidden && !reduced && !destroyed;
    if (should === running) return;
    running = should;
    if (should) {
      reveal();
      // a tile whose timer lapsed while paused waits its turn again
      const now = performance.now();
      for (const t of tiles) {
        if (t.nextShuffle && t.nextShuffle < now) t.nextShuffle = now + Math.random() * SHUFFLE_MIN;
      }
      raf = requestAnimationFrame(loop);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  layout();
  if (reduced) still();

  const io = new IntersectionObserver(
    (es) => {
      onScreen = es.some((e) => e.isIntersecting);
      sync();
    },
    { threshold: 0.2 },
  );
  io.observe(el);
  const onVis = () => {
    hidden = document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVis);
  const ro = new ResizeObserver(() => layout());
  ro.observe(el);

  if (document.fonts && document.fonts.load) {
    document.fonts.load(`${weight} 40px ${family}`).then(() => {
      if (!destroyed) layout();
    }, () => {});
  }

  return {
    destroy() {
      destroyed = true;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cleanup.forEach((fn) => fn());
      root.remove();
    },
  };
}
