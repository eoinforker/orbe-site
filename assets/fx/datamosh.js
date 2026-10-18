/*
  datamosh: a corrupted video decode in Orbe colours.

  Flat blocks fall through a FIXED column grid, snap open through the middle
  of the frame and squeeze shut again. Nothing moves horizontally.

  Essentials kept from the spec:
  - column edges at x = W * (i/N)^1.65, N = 11: narrow left, wide right
  - tile boundaries from one sigmoid, odd tile count so one tile takes the bulge
  - the phase is never wrapped; tile identity is derived from it
  - the curve extends linearly past both ends instead of clamping
  - mirrored exponential spring inside each tile step
  - per column phase offset of a fraction of a tile: the zig zag
  - colours indexed by tile identity, white and near blacks recur often
  - tiles bleed past their bottom edge and paint bottom up

  Usage: import { mount } from "./datamosh.js";
         const fx = mount(el, { seed }); fx.destroy();
*/

// Brand colours plus white and near blacks, leaning on the blue scheme so
// the card reads as the Orbe field breaking up, not a candy glitch. Claret
// and meadow were tried and dropped: with peony they went wine and olive.
// Index roles match the strip builder: 0 white, 5 and 8 the darks.
export const PALETTE = [
  "#FFFFFF", // white
  "#9EE9FB", // sky
  "#EED56A", // straw
  "#1F4BFF", // cobalt
  "#FF5A1F", // ember, the spark
  "#141311", // ink
  "#F2879E", // peony
  "#4D9AD0", // water
  "#0A0908", // deep near black
  "#D6F6FD", // mist
  "#1636C4", // deep cobalt
];

const COLS = 11;
const POWER = 1.65;
const TILES = 15;
// a touch slower than the source (0.2): still restless, less frantic
const CYCLE = 0.26;
const STAGGER = 0.006;
const STRETCH = 8.5;
const EARLY = 1.0;
const SPRING_K = 1.6;
const BLEED = 0.012;
const COL_PHASE = -0.4;
const SPRING_NORM = 1 - Math.exp(-SPRING_K);

function springStep(p) {
  const half = (t) => (1 - Math.exp(-SPRING_K * t)) / SPRING_NORM;
  return p < 0.5 ? 0.5 * half(2 * p) : 1 - 0.5 * half(2 * (1 - p));
}

function pickDifferent(from, avoid, len) {
  for (let i = 1; i <= len; i++) {
    const c = (from + i) % len;
    if (!avoid.includes(c)) return c;
  }
  return from;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Datamosh {
  constructor(host, seed, palette) {
    this.ok = false;
    this.host = host;
    this.seed = seed;
    this.palette = palette;
    this.ro = null;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.raf = 0;
    this.running = false;
    this.lastT = 0;
    this.elapsed = 0;
    this.edges = [];
    this.strip = [];
    this.tick = this.tick.bind(this);

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(canvas);
    this.canvas = canvas;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.ok = true;

    this.buildColours();
    this.measure();

    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => {
        this.measure();
        if (!this.running) this.draw();
      });
      this.ro.observe(host);
    }
  }

  // White and the darks recur often so the strip never goes flat mid tone.
  buildColours() {
    const rand = mulberry32(this.seed);
    const len = this.palette.length;
    const WHITE = 0;
    const DARKS = [8, 5];
    const HUES = [1, 2, 3, 4, 6, 7, 9, 10];
    const LEN = 61;
    const strip = [];
    let lastHue = -1;

    for (let n = 0; n < LEN; n++) {
      const r = rand();
      let next;
      if (r < 0.26) {
        next = WHITE;
      } else if (r < 0.42) {
        next = DARKS[Math.floor(rand() * DARKS.length)];
      } else {
        let h = HUES[Math.floor(rand() * HUES.length)];
        if (h === lastHue) h = HUES[(HUES.indexOf(h) + 1) % HUES.length];
        lastHue = h;
        next = h;
      }
      if (n > 0 && next === strip[n - 1]) next = pickDifferent(next, [strip[n - 1]], len);
      strip.push(next);
    }
    if (strip[LEN - 1] === strip[0]) {
      strip[LEN - 1] = pickDifferent(strip[LEN - 1], [strip[LEN - 2], strip[0]], len);
    }
    this.strip = strip;
  }

  measure() {
    const r = this.host.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.round(r.width * this.dpr));
    this.h = Math.max(1, Math.round(r.height * this.dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx.imageSmoothingEnabled = false;
    // fixed for the life of the card: the non uniform grid reads as perspective
    this.edges = [];
    for (let i = 0; i <= COLS; i++) {
      this.edges.push(Math.round(this.w * Math.pow(i / COLS, POWER)));
    }
  }

  tileEdge(k) {
    const u = k / TILES;
    // linear past both ends, never clamped, or the top edge flickers
    if (u < 0) return u * 0.05;
    if (u > 1) return 1 + (u - 1) * 0.05;
    const v = Math.pow(u, EARLY);
    const a = Math.pow(v, STRETCH);
    return a / (a + Math.pow(1 - v, STRETCH));
  }

  draw() {
    const ctx = this.ctx, h = this.h, edges = this.edges;
    const len = this.strip.length;
    const bleed = Math.round(BLEED * h);

    for (let i = 0; i < COLS; i++) {
      const x0 = edges[i];
      const cw = edges[i + 1] - x0;
      if (cw <= 0) continue;

      const delay = (COLS - 1 - i) * STAGGER;
      const t = this.elapsed - delay;
      const raw = t <= 0 ? 0 : t / CYCLE;

      const linear = raw + i * COL_PHASE;
      const step = Math.floor(linear);
      const frac = linear - step;
      const flow = step + springStep(frac);

      const base = -Math.floor(flow);
      // bottom up so each overhang laps over the tile below
      for (let n = TILES + 2; n >= -2; n--) {
        const id = base + n;
        const k = id + flow;
        const top = Math.round(this.tileEdge(k) * h);
        const bot = Math.round(this.tileEdge(k + 1) * h) + bleed;
        if (bot <= top || bot <= 0 || top >= h) continue;
        const y = Math.max(0, top);
        const th = Math.min(h, bot) - y;
        if (th <= 0) continue;
        const s = id - i;
        ctx.fillStyle = this.palette[this.strip[((s % len) + len) % len]];
        ctx.fillRect(x0, y, cw, th);
      }
    }
  }

  tick(now) {
    if (!this.running) return;
    const dt = this.lastT ? Math.min(0.05, (now - this.lastT) / 1000) : 0;
    this.lastT = now;
    this.elapsed += dt;
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  }

  start() {
    if (this.running || !this.ok) return;
    this.running = true;
    this.lastT = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  renderStill() {
    if (!this.ok) return;
    this.elapsed = CYCLE * 0.45 + COLS * STAGGER;
    this.draw();
  }

  destroy() {
    this.stop();
    if (this.ro) this.ro.disconnect();
    this.ro = null;
    this.canvas.remove();
  }
}

export function mount(el, opts = {}) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const palette = opts.palette && opts.palette.length === PALETTE.length ? opts.palette : PALETTE;
  const seed = opts.seed != null ? opts.seed : 1 + Math.floor(Math.random() * 9999);

  if (!el.hasAttribute("role")) el.setAttribute("role", "img");
  if (!el.hasAttribute("aria-label")) {
    el.setAttribute("aria-label", "A corrupted video decode: fixed columns of flat Orbe colour, each falling on its own fast clock. Tiles snap open through the middle of the frame and squeeze shut at the top and bottom, staggered column by column.");
  }
  el.style.backgroundColor = palette[8];
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";

  let engine = null;
  let created = false;
  let destroyed = false;
  let raf = 0;
  let onScreen = false;
  let hidden = document.hidden;

  const sync = () => {
    if (!engine || !engine.ok || reduced || destroyed) return;
    if (onScreen && !hidden) engine.start();
    else engine.stop();
  };

  const create = () => {
    if (created) return;
    created = true;
    raf = requestAnimationFrame(() => {
      if (destroyed) return;
      engine = new Datamosh(el, seed, palette);
      if (!engine.ok) return;
      if (reduced) engine.renderStill();
      else sync();
    });
  };

  const io = new IntersectionObserver((es) => {
    onScreen = es.some((e) => e.isIntersecting);
    if (onScreen && !created) create();
    if (created) sync();
  }, { rootMargin: "200px" });
  io.observe(el);

  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  return {
    destroy() {
      destroyed = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (raf) cancelAnimationFrame(raf);
      if (engine) engine.destroy();
      engine = null;
    },
  };
}
