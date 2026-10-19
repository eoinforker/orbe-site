/*
  r7-c press: the stamp type press, printing one creator's numbers straight onto the field.
  Adapted from ../assets/fx/stamptype.js (the same choreography data, the same 10Hz step and
  the same stamp silhouettes: a bar unioned with its glyphs stroked fat). What changes here:
  - no sheet: the field is the page's own Sky, so the canvas is transparent and only the
    bars and their stamps print;
  - the square composition is pinned to the right edge of a wider canvas and bleeds past it,
    so the stamps of a line flying in from the left cross under the headline;
  - it runs once: every world prints, parks to be read and scatters, then the first world
    prints again and stays. Nothing loops. pause() and play() let the reader stop it.
  - reduced motion draws the first world parked, at once.

  mount(el, { worlds, font, bleed, onState }) -> { play, pause, playing, destroy }
    worlds  [{ bar, ink, lines: [4 strings] }]
    bleed   share of the square that hangs past the right edge (0 to 0.3)
    onState (state) => void, with "playing", "paused" or "done"
*/

const TICK_MS = 50;
const STEP = 2;
const STAMP_TTL = 16;
const PARK_IN = 28;
const PARK_FRAMES = 48;
const PASS_FRAMES = 93;
const PASS_PITCH = PASS_FRAMES - 12;

const HEADLINE = 71 / 600;
const BAR_PAD_X = 10 / 600;
const BAR_PAD_TOP = 11 / 600;
const BAR_PAD_BOTTOM = 8 / 600;
const BAR_RADIUS = 11 / 600;
const BAR_STROKE = 16 / 600;
const LINE_RIGHT_MARGIN = 24 / 600;
const CONDENSE_MIN = 0.72;
const REF = 600;

/* [frame, x, y] breakpoints in a 600 square, linear between them on purpose: the stutter is the print */
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
const PARKED_X = TRACKS.map((t) => posAt(t, PARK_IN)[0]);
/* each pass parks from frame 28 to 76, then the track carries on */
const toTrack = (f) => (f > PARK_IN && f < PARK_IN + PARK_FRAMES ? PARK_IN : f);

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

export function mount(el, opts = {}) {
  const worlds = opts.worlds;
  const bleed = opts.bleed ?? 0.1;
  const onState = opts.onState || (() => {});
  const reduced = opts.still || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const lines = worlds.map((w) => w.lines.map((text, i) => ({ text, track: i })));
  const metrics = new Map();
  let family = opts.font || '"Schibsted Grotesk", sans-serif';
  let W = 0, H = 0, dpr = 1;

  /* one run: every world once, then the first world again, parked */
  const END = worlds.length * PASS_PITCH + PARK_IN + 20;
  const STILL = PARK_IN + 20;
  let tick = reduced ? END : 0, acc = 0, last = 0, raf = 0, running = false, done = reduced, destroyed = false;

  const measure = (line) => {
    const room = REF - PARKED_X[line.track] - LINE_RIGHT_MARGIN * REF;
    const key = line.track + "|" + line.text;
    const got = metrics.get(key);
    if (got) return got;
    ctx.font = "600 " + HEADLINE * REF + "px " + family;
    const m = ctx.measureText(line.text);
    const raw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const sx = raw > room ? Math.max(CONDENSE_MIN, room / raw) : 1;
    const met = { dx: m.actualBoundingBoxLeft * sx, asc: m.actualBoundingBoxAscent, w: raw * sx, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, sx };
    metrics.set(key, met);
    return met;
  };
  const text = (str, x, y, m, stroke) => {
    ctx.font = "600 " + HEADLINE * REF + "px " + family;
    ctx.save();
    ctx.translate(x, y);
    if (m.sx !== 1) ctx.scale(m.sx, 1);
    if (stroke) ctx.strokeText(str, 0, 0);
    ctx.fillText(str, 0, 0);
    ctx.restore();
  };
  const silhouette = (line, x, y, colour) => {
    const m = measure(line);
    ctx.fillStyle = colour;
    ctx.beginPath();
    roundRect(ctx, x - BAR_PAD_X * REF, y - BAR_PAD_TOP * REF, m.w + BAR_PAD_X * REF * 2, m.h + (BAR_PAD_TOP + BAR_PAD_BOTTOM) * REF, BAR_RADIUS * REF);
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = BAR_STROKE * REF;
    ctx.lineJoin = "round";
    text(line.text, x + m.dx, y + m.asc, m, true);
  };
  const place = (line, f) => posAt(TRACKS[line.track], toTrack(f));
  const stamps = (wi, f) => {
    const step0 = Math.floor(f / STEP) * STEP;
    for (let s = step0; s > f - STAMP_TTL; s -= STEP) {
      if (s < STEP) break;
      for (const line of lines[wi]) {
        const a = place(line, s - STEP), b = place(line, s);
        if (!a || !b) continue;
        if (Math.abs(a[0] - b[0]) < 1.5 && Math.abs(a[1] - b[1]) < 1.5) continue;
        silhouette(line, a[0], a[1], worlds[wi].bar);
      }
    }
  };
  const live = (wi, f) => {
    const placed = [];
    for (const line of lines[wi]) { const p = place(line, f); if (p) placed.push([line, p]); }
    for (const [line, p] of placed) silhouette(line, p[0], p[1], worlds[wi].bar);
    ctx.fillStyle = worlds[wi].ink;
    for (const [line, p] of placed) { const m = measure(line); text(line.text, p[0] + m.dx, p[1] + m.asc, m, false); }
  };

  function draw(t) {
    if (!W || destroyed) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = H / REF;
    const ox = W - H * (1 - bleed);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, 0);
    const n = worlds.length;
    const pass = Math.floor(t / PASS_PITCH);
    const wi = pass % n;
    const f = t - pass * PASS_PITCH;
    const prevF = f + PASS_PITCH;
    const overlapping = pass > 0 && prevF <= PASS_FRAMES;
    const prev = (wi - 1 + n) % n;
    if (overlapping) stamps(prev, prevF);
    stamps(wi, f);
    if (overlapping) live(prev, prevF);
    live(wi, f);
  }

  function resize() {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    draw(tick);
  }

  const loop = (now) => {
    if (!running) return;
    acc += Math.max(0, Math.min(now - last, 250));
    last = now;
    const t = Math.min(END, Math.floor(acc / TICK_MS));
    if (t !== tick) { tick = t; draw(tick); }
    if (tick >= END) { running = false; done = true; onState("done"); return; }
    raf = requestAnimationFrame(loop);
  };
  function play() {
    if (running || destroyed) return;
    if (done) { done = false; acc = 0; tick = 0; }
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
    onState("playing");
  }
  function pause() {
    if (!running) return;
    running = false; cancelAnimationFrame(raf);
    onState("paused");
  }

  resize();
  if (document.fonts && document.fonts.load) {
    const first = family.split(",")[0].replace(/["']/g, "").trim();
    document.fonts.load('600 40px "' + first + '"').then(() => { if (!destroyed) { metrics.clear(); draw(tick); } }, () => {});
  }
  /* start once the press is on screen; leaving the screen pauses it, coming back resumes */
  let auto = !reduced, onScreen = false;
  const io = new IntersectionObserver((es) => {
    onScreen = es.some((x) => x.isIntersecting);
    if (!auto) return;
    if (onScreen && !document.hidden) play(); else if (running) { running = false; cancelAnimationFrame(raf); }
  }, { threshold: 0.2 });
  io.observe(el);
  const onVis = () => { if (auto && running && document.hidden) { running = false; cancelAnimationFrame(raf); } else if (auto && !done && onScreen && !document.hidden) play(); };
  document.addEventListener("visibilitychange", onVis);
  let rt = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 100); });
  ro.observe(el);
  if (reduced) onState("done");

  return {
    play() { auto = true; play(); },
    pause() { auto = false; pause(); },
    get playing() { return running; },
    get done() { return done; },
    still() { auto = false; running = false; cancelAnimationFrame(raf); tick = STILL; done = true; draw(tick); },
    destroy() {
      destroyed = true; running = false; cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect(); clearTimeout(rt);
      document.removeEventListener("visibilitychange", onVis);
      canvas.remove();
    },
  };
}
