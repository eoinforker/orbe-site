/*
  word-stickers: a scatter of die-cut vinyl word stickers you can grab and fling.
  Each word is set in a different face (a small type specimen). The sticker is made on
  canvas, not baked art: the word is rendered offscreen, its silhouette is DILATED by
  the border width (the filled word stamped many times around rings of that radius, so
  the outline follows the true letter shapes, counters and all), that dilated shape is
  the die-cut base, the coloured word goes on top, and one soft drop shadow lifts the
  whole sticker off the page. Each sticker is an absolutely positioned canvas at a
  scattered position and slight rotation.

  Physics, no library: drag with the pointer (grab, grabbing), the sticker follows with
  an ease and its per frame velocity is tracked; on release it is thrown with that
  momentum, integrated each frame, decayed by friction, given a little spin, and it
  bounces off the card edges (flip and damp) until it settles. A tap gives a wobble.
  Canvas 2D path only (the source's peel shader is not ported).

  mount(el, opts) -> { destroy }
    opts.stickers  [{ word, font, weight, style, fill, base, x, y, rot }]  x, y as 0..1
*/

const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, serif';
const MONO = '"Commit Mono", ui-monospace, Menlo, monospace';

const DEFAULT_STICKERS = [
  { word: "views", font: SANS, weight: 800, style: "normal", base: "#FBFAF6", fill: "#1F4BFF", x: 0.2, y: 0.24, rot: -8 },
  { word: "renewals", font: SERIF, weight: 500, style: "italic", base: "#EED56A", fill: "#6F1726", x: 0.68, y: 0.2, rot: 6 },
  { word: "payout", font: MONO, weight: 600, style: "normal", base: "#FF5A1F", fill: "#141311", x: 0.8, y: 0.62, rot: -5 },
  { word: "your size", font: SERIF, weight: 700, style: "normal", base: "#1F4BFF", fill: "#FBFAF6", x: 0.3, y: 0.6, rot: 4 },
  { word: "sponsor", font: SANS, weight: 500, style: "italic", base: "#F2879E", fill: "#141311", x: 0.56, y: 0.84, rot: -3 },
  { word: "ship it", font: SANS, weight: 900, style: "normal", base: "#C6F432", fill: "#141311", x: 0.2, y: 0.84, rot: 9 },
  { word: "open rate", font: SERIF, weight: 400, style: "italic", base: "#141311", fill: "#9EE9FB", x: 0.6, y: 0.38, rot: -6 },
];

const FRICTION = 0.92;
const BOUNCE = 0.55;
const MIN_VEL = 0.05;
const THROW_SCALE = 0.7;
const GRAB_SCALE = 1.12;
const SCALE_EASE = 0.12;
const DRAG_EASE = 0.28;
const SPIN_FROM_THROW = 0.18;
const SPIN_FRICTION = 0.9;
const APPEAR_EASE = 0.09;
const APPEAR_STAGGER_MS = 140;
const TAP_SLOP = 5;

function fontString(d, size) {
  return `${d.style || "normal"} ${d.weight} ${size}px ${d.font}`;
}

// The die-cut sticker: dilated base, word on top, one soft shadow under it all.
function renderSticker(d, size, dpr) {
  const border = Math.max(5, Math.round(size * 0.15));
  const shadowBlur = Math.round(size * 0.22);
  const shadowY = Math.round(size * 0.08);
  const font = fontString(d, size);

  const meas = document.createElement("canvas").getContext("2d");
  meas.font = font;
  const m = meas.measureText(d.word);
  const ascent = Math.max(m.actualBoundingBoxAscent || 0, size * 0.72);
  const descent = Math.max(m.actualBoundingBoxDescent || 0, size * 0.16);
  const left = Math.max(0, m.actualBoundingBoxLeft || 0);
  const textW = Math.max(m.width, left + (m.actualBoundingBoxRight || m.width));

  const pad = border + 2;
  const sW = Math.ceil(textW + pad * 2);
  const sH = Math.ceil(ascent + descent + pad * 2);
  const bx = pad + left;
  const by = pad + ascent;

  // 1. the base: the word stamped around rings out to the border radius
  const base = document.createElement("canvas");
  base.width = Math.ceil(sW * dpr);
  base.height = Math.ceil(sH * dpr);
  const b = base.getContext("2d");
  b.scale(dpr, dpr);
  b.font = font;
  b.textBaseline = "alphabetic";
  b.fillStyle = d.base;
  for (let r = border; r > 0.5; r -= 1) {
    // enough stamps that the ring has no scallops at this pixel density
    const stamps = Math.max(16, Math.ceil(r * Math.PI * 2 * dpr * 0.6));
    for (let a = 0; a < stamps; a++) {
      const ang = (a / stamps) * Math.PI * 2;
      b.fillText(d.word, bx + Math.cos(ang) * r, by + Math.sin(ang) * r);
    }
  }
  b.fillText(d.word, bx, by);
  // 2. the word on top
  b.fillStyle = d.fill;
  b.fillText(d.word, bx, by);

  // 3. one soft shadow under the whole sticker, in a padded outer canvas
  const sp = shadowBlur + shadowY;
  const cssW = sW + sp * 2;
  const cssH = sH + sp * 2;
  const out = document.createElement("canvas");
  out.width = Math.ceil(cssW * dpr);
  out.height = Math.ceil(cssH * dpr);
  const o = out.getContext("2d");
  o.shadowColor = "rgba(20, 19, 17, 0.28)";
  o.shadowBlur = shadowBlur * dpr;
  o.shadowOffsetY = shadowY * dpr;
  o.drawImage(base, sp * dpr, sp * dpr);
  return { canvas: out, w: cssW, h: cssH, inset: sp };
}

export function mount(el, opts = {}) {
  const defs = opts.stickers && opts.stickers.length ? opts.stickers : DEFAULT_STICKERS;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = el;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.style.userSelect = "none";
  host.style.webkitUserSelect = "none";

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = host.clientWidth || 1;
  let H = host.clientHeight || 1;
  let zTop = 1;
  let disposed = false;
  const cleanup = [];

  const fontPx = () => Math.max(30, Math.min(66, (W > 40 ? W : 640) * 0.085));

  const items = defs.map((def) => {
    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    Object.assign(c.style, {
      position: "absolute", left: "0", top: "0", cursor: "grab", touchAction: "none",
      transformOrigin: "50% 50%", willChange: "transform",
    });
    host.appendChild(c);
    return {
      def, el: c, w: 0, h: 0, inset: 0,
      x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0,
      rot: def.rot || 0, vr: 0, wobble: 0, wobbleT: 0,
      scale: 1, dragging: false,
      appear: reduced ? 1 : 0, appearAt: 0,
    };
  });

  // Edges are tested against the sticker itself, not its shadow padding.
  const clampInside = (it) => {
    const i = it.inset;
    it.x = Math.max(-i, Math.min(W - it.w + i, it.x));
    it.y = Math.max(-i, Math.min(H - it.h + i, it.y));
  };

  const draw = (it) => {
    const r = renderSticker(it.def, fontPx(), dpr);
    it.el.width = r.canvas.width;
    it.el.height = r.canvas.height;
    it.el.style.width = `${r.w}px`;
    it.el.style.height = `${r.h}px`;
    const ctx = it.el.getContext("2d");
    ctx.clearRect(0, 0, it.el.width, it.el.height);
    ctx.drawImage(r.canvas, 0, 0);
    it.w = r.w; it.h = r.h; it.inset = r.inset;
  };

  const place = (it) => {
    const a = it.appearAt > 0 || reduced ? it.appear : 0;
    const s = it.scale * a;
    const rot = it.rot + it.wobble;
    it.el.style.transform = `translate(${it.x.toFixed(2)}px, ${it.y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
  };

  const layout = () => {
    for (const it of items) {
      draw(it);
      it.x = it.def.x * W - it.w / 2;
      it.y = it.def.y * H - it.h / 2;
      it.tx = it.x; it.ty = it.y;
      it.vx = it.vy = it.vr = 0;
      clampInside(it);
      place(it);
    }
  };
  layout();

  // Dragging
  let drag = null;
  const rect = () => host.getBoundingClientRect();
  items.forEach((it) => {
    const onDown = (e) => {
      e.preventDefault();
      const r = rect();
      it.dragging = true;
      it.vx = it.vy = it.vr = 0;
      it.el.style.cursor = "grabbing";
      it.el.style.zIndex = String(++zTop);
      drag = {
        it, id: e.pointerId,
        dx: e.clientX - r.left - it.x, dy: e.clientY - r.top - it.y,
        sx: e.clientX, sy: e.clientY, moved: 0,
      };
      try { it.el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      wake();
    };
    const onMove = (e) => {
      if (!drag || drag.it !== it) return;
      const r = rect();
      it.tx = e.clientX - r.left - drag.dx;
      it.ty = e.clientY - r.top - drag.dy;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      if (reduced) {
        it.x = it.tx; it.y = it.ty;
        clampInside(it);
        place(it);
      }
    };
    const onUp = (e) => {
      if (!drag || drag.it !== it) return;
      const tap = drag.moved < TAP_SLOP;
      it.dragging = false;
      it.el.style.cursor = "grab";
      try { it.el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      drag = null;
      if (reduced) { it.vx = it.vy = 0; return; }
      if (tap) {
        it.vx = it.vy = 0;
        it.wobbleT = 1;
      } else {
        it.vx *= THROW_SCALE;
        it.vy *= THROW_SCALE;
        it.vr = it.vx * SPIN_FROM_THROW;
      }
      wake();
    };
    it.el.addEventListener("pointerdown", onDown);
    it.el.addEventListener("pointermove", onMove);
    it.el.addEventListener("pointerup", onUp);
    it.el.addEventListener("pointercancel", onUp);
    cleanup.push(() => {
      it.el.removeEventListener("pointerdown", onDown);
      it.el.removeEventListener("pointermove", onMove);
      it.el.removeEventListener("pointerup", onUp);
      it.el.removeEventListener("pointercancel", onUp);
    });
  });

  // Physics loop: runs while on screen and something is moving, then idles.
  let raf = 0;
  let running = false;
  let entranceStarted = false;
  let last = 0;
  let onScreen = false;
  let hidden = document.hidden;

  const step = (now) => {
    raf = 0;
    if (!running) return;
    const k = last ? Math.min(2.5, (now - last) / 16.667) : 1;
    last = now;
    let busy = false;

    for (const it of items) {
      if (it.appearAt > 0 && now >= it.appearAt && it.appear < 1) {
        it.appear += (1 - it.appear) * (1 - Math.pow(1 - APPEAR_EASE, k));
        if (it.appear > 0.999) it.appear = 1;
      }
      if (it.appear < 1) busy = true;

      const ts = it.dragging ? GRAB_SCALE : 1;
      if (Math.abs(ts - it.scale) > 0.001) { it.scale += (ts - it.scale) * (1 - Math.pow(1 - SCALE_EASE, k)); busy = true; }
      else it.scale = ts;

      if (it.wobbleT > 0) {
        it.wobbleT = Math.max(0, it.wobbleT - 0.018 * k);
        const t = 1 - it.wobbleT;
        it.wobble = Math.sin(t * Math.PI * 7) * 7 * it.wobbleT * it.wobbleT;
        busy = true;
      } else it.wobble = 0;

      if (it.dragging) {
        const e = 1 - Math.pow(1 - DRAG_EASE, k);
        const nx = it.x + (it.tx - it.x) * e;
        const ny = it.y + (it.ty - it.y) * e;
        it.vx = (nx - it.x) / k;
        it.vy = (ny - it.y) / k;
        it.x = nx; it.y = ny;
        clampInside(it);
        place(it);
        busy = true;
        continue;
      }

      const moving = Math.abs(it.vx) >= MIN_VEL || Math.abs(it.vy) >= MIN_VEL || Math.abs(it.vr) >= 0.02;
      if (moving) {
        busy = true;
        it.x += it.vx * k;
        it.y += it.vy * k;
        it.rot += it.vr * k;
        const i = it.inset;
        if (it.x < -i) { it.x = -i; it.vx = -it.vx * BOUNCE; it.vr = -it.vr * BOUNCE; }
        else if (it.x > W - it.w + i) { it.x = W - it.w + i; it.vx = -it.vx * BOUNCE; it.vr = -it.vr * BOUNCE; }
        if (it.y < -i) { it.y = -i; it.vy = -it.vy * BOUNCE; }
        else if (it.y > H - it.h + i) { it.y = H - it.h + i; it.vy = -it.vy * BOUNCE; }
        const f = Math.pow(FRICTION, k);
        it.vx *= f; it.vy *= f;
        it.vr *= Math.pow(SPIN_FRICTION, k);
        if (Math.abs(it.vx) < MIN_VEL) it.vx = 0;
        if (Math.abs(it.vy) < MIN_VEL) it.vy = 0;
        if (Math.abs(it.vr) < 0.02) it.vr = 0;
      }
      place(it);
    }
    if (busy) raf = requestAnimationFrame(step);
    else last = 0;
  };

  const wake = () => {
    if (!running || raf) return;
    last = 0;
    raf = requestAnimationFrame(step);
  };

  const start = () => {
    if (running || disposed) return;
    running = true;
    if (!entranceStarted) {
      entranceStarted = true;
      const order = [...items].sort((a, b) => a.def.x - b.def.x);
      const t0 = performance.now() + 150;
      order.forEach((it, i) => (it.appearAt = t0 + i * APPEAR_STAGGER_MS));
    }
    wake();
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  const sync = () => {
    if (reduced) return;
    if (onScreen && !hidden) start();
    else stop();
  };
  const io = new IntersectionObserver((es) => { onScreen = es[0] ? es[0].isIntersecting : false; sync(); }, { threshold: 0.1 });
  io.observe(host);
  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  let resizeT = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const nw = host.clientWidth || 1;
      const nh = host.clientHeight || 1;
      if (nw < 2 || nh < 2 || (nw === W && nh === H)) return;
      const sx = nw / W, sy = nh / H;
      W = nw; H = nh;
      for (const it of items) {
        const cx = (it.x + it.w / 2) * sx;
        const cy = (it.y + it.h / 2) * sy;
        draw(it);
        it.x = cx - it.w / 2; it.y = cy - it.h / 2;
        it.tx = it.x; it.ty = it.y;
        clampInside(it);
        place(it);
      }
    }, 100);
  });
  ro.observe(host);

  // Warm every face first, so the die-cut hugs the real glyphs, not a fallback.
  if (document.fonts && document.fonts.load) {
    Promise.all(defs.map((d) => document.fonts.load(fontString(d, 40), d.word).catch(() => {}))).then(() => {
      if (disposed) return;
      for (const it of items) {
        const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
        draw(it);
        it.x = cx - it.w / 2; it.y = cy - it.h / 2;
        clampInside(it);
        place(it);
      }
    });
  }

  return {
    destroy() {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimeout(resizeT);
      document.removeEventListener("visibilitychange", onVis);
      cleanup.forEach((fn) => fn());
      items.forEach((it) => it.el.parentNode && it.el.parentNode.removeChild(it.el));
    },
  };
}
