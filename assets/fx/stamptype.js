/*
  stamptype: a kinetic type poster loop for Orbe.

  Four lines of type on flat highlight bars hop in from the edges one axis at
  a time, park to be read, then scatter off, and the next world flies in
  before the last one has left. Whatever moves stamps its flat silhouette
  where it just was; stamps live sixteen frames and vanish all at once.

  Essentials kept from the spec:
  - choreography is breakpoint data at 20fps on a 10Hz step, never eased
  - stamps are computed fresh each frame from the tracks (no accumulation)
  - silhouette is the rounded bar unioned with the glyphs stroked fat
  - all bars first, then all inks, so no row bites the row above
  - passes overlap by twelve frames; the field swaps as a hard cut
  - long lines condense horizontally rather than shrink
  - square 600 space composition letterboxed in the card

  Usage: import { mount } from "./stamptype.js";
         const fx = mount(el, { worlds, scheme: "blue" }); fx.destroy();
*/

const TICK_MS = 50;
const STEP = 2;
const STAMP_TTL = 16;
const PARK_IN = 28;
const PARK_OUT = 76;
const PASS_END = 93;
const PARK_FRAMES = 48;
const PASS_OVERLAP = 12;
const FIELD_SWAP = 5;

/*
  Palette rule: field and bar far apart in BOTH hue and value, and ink
  near black or near white, at AA or better on its bar. Only the brand
  colours: Sky, Ink, Cobalt, Ember and Paper in blue; the pink set trades
  Cobalt and Sky for Claret and Peony, so peony never meets cobalt. No
  paint colours (Straw, Water, Meadow and the rest stay in the paintings).
*/
const LINES = [
  ["rated against", "creators", "your size,", "not the charts."],
  ["read from", "payouts,", "not from", "estimates."],
  ["free for", "creators.", "we earn when", "money moves."],
  ["your size,", "your record,", "your real", "numbers."],
  ["a fair read", "on the work", "you already", "put out."],
];

export const WORLDS = [
  // cobalt field, paper bar, ink: deep blue against warm pale
  { bg: "#1F4BFF", bar: "#F3F0E8", ink: "#141311", lines: LINES[0] },
  // ink field, sky bar, ink: near black against pale cyan
  { bg: "#141311", bar: "#9EE9FB", ink: "#141311", lines: LINES[1] },
  // paper field, cobalt bar, chalk ink: warm pale against saturated deep
  { bg: "#F3F0E8", bar: "#1F4BFF", ink: "#FBFAF6", lines: LINES[2] },
  // sky field, ink bar, sky ink: pale cyan against near black
  { bg: "#9EE9FB", bar: "#141311", ink: "#9EE9FB", lines: LINES[3] },
  // ember field, ink bar, paper ink: hot orange against neutral dark
  { bg: "#FF5A1F", bar: "#141311", ink: "#F3F0E8", lines: LINES[4] },
];

export const WORLDS_PINK = [
  // claret field, paper bar, ink: deep red against warm pale
  { bg: "#6F1726", bar: "#F3F0E8", ink: "#141311", lines: LINES[0] },
  // ink field, peony bar, ink: near black against pink
  { bg: "#141311", bar: "#F2879E", ink: "#141311", lines: LINES[1] },
  // paper field, claret bar, blush ink: warm pale against deep red
  { bg: "#F3F0E8", bar: "#6F1726", ink: "#FBD9E0", lines: LINES[2] },
  // peony field, ink bar, peony ink: pink against near black
  { bg: "#F2879E", bar: "#141311", ink: "#F2879E", lines: LINES[3] },
  // ember field, ink bar, paper ink: hot orange against neutral dark
  { bg: "#FF5A1F", bar: "#141311", ink: "#F3F0E8", lines: LINES[4] },
];

const HEADLINE = 71 / 600;
const BAR_PAD_X = 10 / 600;
const BAR_PAD_TOP = 11 / 600;
const BAR_PAD_BOTTOM = 8 / 600;
const BAR_RADIUS = 11 / 600;
const BAR_STROKE = 16 / 600;
const LINE_RIGHT_MARGIN = 24 / 600;
const CONDENSE_MIN = 0.72;

const TRACKS = [
  [[1, 181, -100], [3, 181, 11], [6, 165, 16], [7, 128, 16], [10, 110, 16],
    [11, 72, 16], [13, 69, 38], [15, 70, 90], [16, 70, 94], [17, 97, 94],
    [19, 165, 94], [20, 170, 94], [21, 154, 94], [23, 117, 94], [24, 114, 94],
    [25, 114, 115], [27, 114, 168], [28, 114, 172], [76, 114, 172], [77, 114, 142],
    [79, 114, 66], [82, 96, 61], [84, 47, 61], [86, 108, 61], [88, 195, 61],
    [91, 195, -120]],
  [[12, -540, 273], [15, 16, 273], [18, 20, 267], [20, 20, 251], [22, 29, 251],
    [24, 53, 251], [28, 53, 240], [76, 53, 240], [80, 31, 240], [82, 31, 225],
    [84, 31, 184], [86, 0, 184], [88, 37, 264], [90, 76, 264], [93, -560, 264]],
  [[8, 640, 375], [11, 97, 375], [14, 90, 365], [15, 90, 343], [18, 85, 341],
    [19, 72, 341], [22, 71, 332], [24, 71, 308], [28, 49, 308], [76, 49, 308],
    [80, 49, 297], [84, 49, 319], [87, 49, 266], [88, 49, 264], [90, 88, 263],
    [93, 660, 263]],
  [[4, 620, 498], [7, 118, 498], [8, 104, 498], [12, 104, 487], [13, 77, 487],
    [15, 9, 487], [16, 4, 487], [17, 4, 469], [19, 4, 424], [22, 20, 420],
    [23, 58, 420], [26, 61, 408], [28, 61, 376], [76, 61, 376], [80, 31, 376],
    [83, 84, 376], [85, 63, 376], [87, 4, 376], [90, 0, 376], [93, -540, 376]],
];

const REF = 600;
const PARK_DELTA = PARK_FRAMES - (PARK_OUT - PARK_IN);
const PASS_FRAMES = PASS_END + PARK_DELTA;
const PASS_PITCH = PASS_FRAMES - PASS_OVERLAP;

function toTrack(f) {
  if (f <= PARK_IN) return f;
  if (f >= PARK_IN + PARK_FRAMES) return f - PARK_DELTA;
  return PARK_IN;
}

// Linear between breakpoints on purpose: the stutter comes from the data
// and the 10Hz step, and smoothing it kills the print snap.
function posAt(track, f) {
  if (f < track[0][0] || f > track[track.length - 1][0]) return null;
  for (let i = 1; i < track.length; i++) {
    if (f <= track[i][0]) {
      const [f0, x0, y0] = track[i - 1];
      const [f1, x1, y1] = track[i];
      const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
  }
  return null;
}

const PARKED_X = TRACKS.map((t) => (posAt(t, PARK_IN) || [0])[0]);

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class StampType {
  constructor(canvas, worlds) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ok = !!this.ctx;
    this.raf = 0;
    this.running = false;
    this.acc = 0;
    this.last = 0;
    this.drawnTick = -1;
    this.W = 0;
    this.H = 0;
    this.dpr = 1;
    this.family = "sans-serif";
    this.worlds = worlds;
    this.lines = worlds.map((w) => w.lines.map((text, i) => ({ text, track: i })));
    this.metrics = new Map();
    this.loop = this.loop.bind(this);
    if (this.ok) this.resize();
  }

  setFont(family) {
    this.family = family;
    this.metrics.clear();
    this.drawnTick = -1;
    if (!this.running) this.draw(this.stillTick());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.drawnTick = -1;
    // a resize lands on exactly the right residue: stamps are derived per frame
    this.draw(this.running ? this.currentTick() : this.stillTick());
  }

  currentTick() {
    return Math.floor(this.acc / TICK_MS) % (PASS_PITCH * this.worlds.length);
  }

  loop(now) {
    if (!this.running) return;
    // rAF time can trail performance.now() on the first frame: never step back
    this.acc += Math.max(0, Math.min(now - this.last, 250));
    this.last = now;
    const tick = this.currentTick();
    if (tick !== this.drawnTick) this.draw(tick);
    this.raf = requestAnimationFrame(this.loop);
  }

  start() {
    if (this.running || !this.ok) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  renderStill() { this.draw(this.stillTick()); }

  destroy() { this.stop(); this.ctx = null; }

  stillTick() { return PARK_IN + Math.floor(PARK_FRAMES / 2); }

  measure(ctx, text, size, room) {
    const key = size + "|" + room + "|" + text;
    const got = this.metrics.get(key);
    if (got) return got;
    ctx.font = "600 " + size * REF + "px " + this.family;
    const m = ctx.measureText(text);
    const raw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    // condense to the room the track leaves, never set smaller
    const sx = raw > room ? Math.max(CONDENSE_MIN, room / raw) : 1;
    const met = {
      dx: m.actualBoundingBoxLeft * sx,
      asc: m.actualBoundingBoxAscent,
      w: raw * sx,
      h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
      sx,
    };
    this.metrics.set(key, met);
    return met;
  }

  lineMetrics(ctx, line) {
    const room = REF - PARKED_X[line.track] - LINE_RIGHT_MARGIN * REF;
    return this.measure(ctx, line.text, HEADLINE, room);
  }

  place(line, f) { return posAt(TRACKS[line.track], toTrack(f)); }

  text(ctx, str, x, y, m, stroke) {
    ctx.font = "600 " + HEADLINE * REF + "px " + this.family;
    if (m.sx === 1) {
      if (stroke) ctx.strokeText(str, x, y);
      ctx.fillText(str, x, y);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(m.sx, 1);
    if (stroke) ctx.strokeText(str, 0, 0);
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  // The bar unioned with fat stroked glyphs: that union makes the drips.
  silhouette(ctx, line, x, y, color) {
    const m = this.lineMetrics(ctx, line);
    const padX = BAR_PAD_X * REF;
    const padT = BAR_PAD_TOP * REF;
    const padB = BAR_PAD_BOTTOM * REF;
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, x - padX, y - padT, m.w + padX * 2, m.h + padT + padB, BAR_RADIUS * REF);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = BAR_STROKE * REF;
    ctx.lineJoin = "round";
    this.text(ctx, line.text, x + m.dx, y + m.asc, m, true);
  }

  stamps(ctx, wi, f) {
    const world = this.worlds[wi];
    const lines = this.lines[wi];
    const step0 = Math.floor(f / STEP) * STEP;
    for (let s = step0; s > f - STAMP_TTL; s -= STEP) {
      if (s < STEP) break;
      for (const line of lines) {
        const a = this.place(line, s - STEP);
        const b = this.place(line, s);
        if (!a || !b) continue;
        if (Math.abs(a[0] - b[0]) < 1.5 && Math.abs(a[1] - b[1]) < 1.5) continue;
        this.silhouette(ctx, line, a[0], a[1], world.bar);
      }
    }
  }

  live(ctx, wi, f) {
    const world = this.worlds[wi];
    const placed = [];
    for (const line of this.lines[wi]) {
      const p = this.place(line, f);
      if (p) placed.push([line, p]);
    }
    // all bars first, then all inks
    for (const [line, p] of placed) this.silhouette(ctx, line, p[0], p[1], world.bar);
    ctx.fillStyle = world.ink;
    for (const [line, p] of placed) {
      const m = this.lineMetrics(ctx, line);
      this.text(ctx, line.text, p[0] + m.dx, p[1] + m.asc, m, false);
    }
  }

  draw(tick) {
    const ctx = this.ctx;
    if (!ctx || !this.W) return;
    this.drawnTick = tick;
    const W = this.W, H = this.H;
    const k = H / REF;
    const ox = (W - H) / 2;
    const n = this.worlds.length;

    const wi = Math.floor(tick / PASS_PITCH) % n;
    const f = tick - Math.floor(tick / PASS_PITCH) * PASS_PITCH;
    const prev = (wi - 1 + n) % n;
    const prevF = f + PASS_PITCH;
    const overlapping = prevF <= PASS_FRAMES;

    // the field is a hard cut under the densest part of the overlap
    const fieldWorld = f < FIELD_SWAP && overlapping ? prev : wi;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.worlds[fieldWorld].bg;
    ctx.fillRect(0, 0, W, H);

    ctx.setTransform(this.dpr * k, 0, 0, this.dpr * k, this.dpr * ox, 0);
    if (overlapping) this.stamps(ctx, prev, prevF);
    this.stamps(ctx, wi, f);
    if (overlapping) this.live(ctx, prev, prevF);
    this.live(ctx, wi, f);
  }
}

export function mount(el, opts = {}) {
  const scheme = opts.scheme || document.documentElement.getAttribute("data-scheme");
  const worlds = opts.worlds && opts.worlds.length ? opts.worlds : scheme === "pink" ? WORLDS_PINK : WORLDS;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!el.hasAttribute("role")) el.setAttribute("role", "img");
  if (!el.hasAttribute("aria-label")) {
    el.setAttribute("aria-label", "A looping type poster. Four lines about Orbe sit on flat colour bars, hop in from the edges, hold still to be read, then scatter off, leaving blocks of flat colour where they just were. Each pass repeats in a new palette with new words: " +
      worlds.map((w) => w.lines.join(" ")).join(" / "));
  }
  el.style.backgroundColor = worlds[0].bg;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(canvas);

  const engine = new StampType(canvas, worlds);
  let onScreen = false;
  let hidden = document.hidden;
  let destroyed = false;

  const sync = () => {
    if (!engine.ok || reduced || destroyed) return;
    if (onScreen && !hidden) engine.start();
    else engine.stop();
  };

  // font: Schibsted Grotesk from --sans, or whatever the caller passes
  const fontVar = (opts.font || getComputedStyle(el).getPropertyValue("--sans") || "").trim();
  const family = fontVar || '"Schibsted Grotesk", sans-serif';
  const first = family.split(",")[0].replace(/["']/g, "").trim();
  engine.setFont(family);
  if (document.fonts && document.fonts.load && first) {
    document.fonts.load('600 1em "' + first + '"').then(() => {
      if (!destroyed) engine.setFont(family);
    }, () => {});
  }

  if (reduced) engine.renderStill();

  const io = new IntersectionObserver((es) => {
    onScreen = es.some((e) => e.isIntersecting);
    sync();
  }, { threshold: 0.2 });
  io.observe(el);

  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  let rt = 0;
  const ro = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => {
        clearTimeout(rt);
        rt = setTimeout(() => { if (!destroyed) engine.resize(); }, 120);
      })
    : null;
  if (ro) ro.observe(el);

  return {
    destroy() {
      destroyed = true;
      io.disconnect();
      if (ro) ro.disconnect();
      clearTimeout(rt);
      document.removeEventListener("visibilitychange", onVis);
      engine.destroy();
      canvas.remove();
    },
  };
}
