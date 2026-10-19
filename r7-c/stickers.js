/*
  r7-c stickers: the wrong verdicts as die-cut vinyl, flung onto the yardstick window.
  Adapted from ../assets/fx/word-stickers.js (same die-cut: the word's silhouette dilated
  by the border, the word on top, a flat hard ink shadow). What changes here:
  - the entrance is a throw: each sticker flies in from outside the window, spinning,
    and lands on its row with a slap (an overshoot and a squash), one after another;
  - the size follows the host, so a phone gets stickers that fit its rows;
  - reduced motion places every sticker where it lands, still, and dragging still works.
  Drag and fling them away like the original: momentum, friction, bounce off the edges.

  mount(el, { stickers: [{ word, font, weight, style, fill, base, x, y, rot, from }], size }) -> { destroy }
    x, y are 0..1 of the host; from is the side it is thrown from: "left" | "right" | "top".
*/

const FRICTION = 0.92;
const BOUNCE = 0.55;
const MIN_VEL = 0.05;
const THROW_SCALE = 0.7;
const GRAB_SCALE = 1.1;
const DRAG_EASE = 0.28;
const SPIN_FROM_THROW = 0.18;
const SPIN_FRICTION = 0.9;
const FLIGHT_MS = 520;
const STAGGER_MS = 260;
const TAP_SLOP = 5;

const fontString = (d, size) => `${d.style || "normal"} ${d.weight} ${size}px ${d.font}`;

function renderSticker(d, size, dpr) {
  const border = Math.max(4, Math.round(size * 0.14));
  const off = Math.max(3, Math.round(size * 0.09));
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

  const base = document.createElement("canvas");
  base.width = Math.ceil(sW * dpr);
  base.height = Math.ceil(sH * dpr);
  const b = base.getContext("2d");
  b.scale(dpr, dpr);
  b.font = font;
  b.fillStyle = d.base;
  for (let r = border; r > 0.5; r -= 1) {
    const n = Math.max(16, Math.ceil(r * Math.PI * 2 * dpr * 0.6));
    for (let a = 0; a < n; a++) {
      const ang = (a / n) * Math.PI * 2;
      b.fillText(d.word, bx + Math.cos(ang) * r, by + Math.sin(ang) * r);
    }
  }
  b.fillText(d.word, bx, by);
  b.fillStyle = d.fill;
  b.fillText(d.word, bx, by);

  const cssW = sW + off * 2;
  const cssH = sH + off * 2;
  const out = document.createElement("canvas");
  out.width = Math.ceil(cssW * dpr);
  out.height = Math.ceil(cssH * dpr);
  const o = out.getContext("2d");
  const s = document.createElement("canvas");
  s.width = base.width; s.height = base.height;
  const sc = s.getContext("2d");
  sc.drawImage(base, 0, 0);
  sc.globalCompositeOperation = "source-in";
  sc.fillStyle = d.shadow || "#141311";
  sc.fillRect(0, 0, s.width, s.height);
  o.drawImage(s, off * 2 * dpr, off * 2 * dpr);
  o.drawImage(base, off * dpr, off * dpr);
  return { canvas: out, w: cssW, h: cssH, inset: off };
}

const backOut = (t) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

export function mount(el, opts = {}) {
  const defs = opts.stickers || [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = el;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = host.clientWidth || 1;
  let H = host.clientHeight || 1;
  let zTop = 5;
  let disposed = false;
  const sizeOf = () => (opts.size ? opts.size(W) : Math.max(22, Math.min(46, W * 0.07)));

  const items = defs.map((def) => {
    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    c.className = "stk";
    Object.assign(c.style, { position: "absolute", left: "0", top: "0", cursor: "grab", touchAction: "none", transformOrigin: "50% 50%", willChange: "transform", zIndex: "4" });
    host.appendChild(c);
    return { def, el: c, w: 0, h: 0, inset: 0, x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, rot: def.rot || 0, vr: 0, scale: 1, sq: 0, dragging: false, fly: reduced ? 1 : 0, flyAt: 0, hx: 0, hy: 0 };
  });

  const clampInside = (it) => {
    const i = it.inset;
    it.x = Math.max(-i, Math.min(W - it.w + i, it.x));
    it.y = Math.max(-i, Math.min(H - it.h + i, it.y));
  };
  const draw = (it) => {
    const r = renderSticker(it.def, sizeOf(), dpr);
    it.el.width = r.canvas.width; it.el.height = r.canvas.height;
    it.el.style.width = `${r.w}px`; it.el.style.height = `${r.h}px`;
    const ctx = it.el.getContext("2d");
    ctx.clearRect(0, 0, it.el.width, it.el.height);
    ctx.drawImage(r.canvas, 0, 0);
    it.w = r.w; it.h = r.h; it.inset = r.inset;
  };
  const home = (it) => { it.hx = it.def.x * W - it.w / 2; it.hy = it.def.y * H - it.h / 2; };
  const place = (it) => {
    let x = it.x, y = it.y, rot = it.rot, s = it.scale;
    if (it.fly < 1) {
      /* in flight: from outside the window to home, spinning down to its resting angle */
      const t = it.flyAt ? Math.max(0, it.fly) : 0;
      const k = backOut(t);
      const from = it.def.from || "left";
      const fx = from === "left" ? -it.w - 40 : from === "right" ? W + 40 : it.hx;
      const fy = from === "top" ? -it.h - 60 : it.hy - H * 0.35;
      x = fx + (it.hx - fx) * k;
      y = fy + (it.hy - fy) * k;
      rot = it.rot + (1 - k) * (from === "right" ? 70 : -70);
      s = it.flyAt ? 1 : 0;
    }
    const sx = s * (1 + it.sq), sy = s * (1 - it.sq);
    it.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  };
  const layout = () => {
    for (const it of items) {
      draw(it); home(it);
      it.x = it.hx; it.y = it.hy; it.tx = it.x; it.ty = it.y;
      it.vx = it.vy = it.vr = 0;
      clampInside(it); place(it);
    }
  };
  layout();

  let drag = null;
  for (const it of items) {
    const onDown = (e) => {
      e.preventDefault();
      if (it.fly < 1) { it.fly = 1; }
      const r = host.getBoundingClientRect();
      it.dragging = true; it.vx = it.vy = it.vr = 0;
      it.el.style.cursor = "grabbing"; it.el.style.zIndex = String(++zTop);
      drag = { it, dx: e.clientX - r.left - it.x, dy: e.clientY - r.top - it.y, sx: e.clientX, sy: e.clientY, moved: 0 };
      try { it.el.setPointerCapture(e.pointerId); } catch {}
      wake();
    };
    const onMove = (e) => {
      if (!drag || drag.it !== it) return;
      const r = host.getBoundingClientRect();
      it.tx = e.clientX - r.left - drag.dx; it.ty = e.clientY - r.top - drag.dy;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      if (reduced) { it.x = it.tx; it.y = it.ty; clampInside(it); place(it); }
    };
    const onUp = (e) => {
      if (!drag || drag.it !== it) return;
      const tap = drag.moved < TAP_SLOP;
      it.dragging = false; it.el.style.cursor = "grab";
      try { it.el.releasePointerCapture(e.pointerId); } catch {}
      drag = null;
      if (reduced) { it.vx = it.vy = 0; return; }
      if (tap) { it.vx = it.vy = 0; it.sq = 0.12; }
      else { it.vx *= THROW_SCALE; it.vy *= THROW_SCALE; it.vr = it.vx * SPIN_FROM_THROW; }
      wake();
    };
    it.el.addEventListener("pointerdown", onDown);
    it.el.addEventListener("pointermove", onMove);
    it.el.addEventListener("pointerup", onUp);
    it.el.addEventListener("pointercancel", onUp);
  }

  let raf = 0, running = false, started = false, last = 0, onScreen = false, hidden = document.hidden;
  const step = (now) => {
    raf = 0;
    if (!running) return;
    const k = last ? Math.min(2.5, (now - last) / 16.667) : 1;
    last = now;
    let busy = false;
    for (const it of items) {
      if (it.fly < 1) {
        if (it.flyAt && now >= it.flyAt) {
          it.fly = Math.min(1, (now - it.flyAt) / FLIGHT_MS);
          if (it.fly >= 1) { it.x = it.hx; it.y = it.hy; it.sq = 0.16; it.el.style.zIndex = String(++zTop); }
        }
        busy = true; place(it); continue;
      }
      const ts = it.dragging ? GRAB_SCALE : 1;
      if (Math.abs(ts - it.scale) > 0.001) { it.scale += (ts - it.scale) * (1 - Math.pow(0.88, k)); busy = true; } else it.scale = ts;
      if (Math.abs(it.sq) > 0.002) { it.sq *= -Math.pow(0.6, k); busy = true; } else it.sq = 0;
      if (it.dragging) {
        const e = 1 - Math.pow(1 - DRAG_EASE, k);
        const nx = it.x + (it.tx - it.x) * e, ny = it.y + (it.ty - it.y) * e;
        it.vx = (nx - it.x) / k; it.vy = (ny - it.y) / k;
        it.x = nx; it.y = ny; clampInside(it); place(it); busy = true; continue;
      }
      if (Math.abs(it.vx) >= MIN_VEL || Math.abs(it.vy) >= MIN_VEL || Math.abs(it.vr) >= 0.02) {
        busy = true;
        it.x += it.vx * k; it.y += it.vy * k; it.rot += it.vr * k;
        const i = it.inset;
        if (it.x < -i) { it.x = -i; it.vx = -it.vx * BOUNCE; it.vr = -it.vr * BOUNCE; }
        else if (it.x > W - it.w + i) { it.x = W - it.w + i; it.vx = -it.vx * BOUNCE; it.vr = -it.vr * BOUNCE; }
        if (it.y < -i) { it.y = -i; it.vy = -it.vy * BOUNCE; }
        else if (it.y > H - it.h + i) { it.y = H - it.h + i; it.vy = -it.vy * BOUNCE; }
        const f = Math.pow(FRICTION, k);
        it.vx *= f; it.vy *= f; it.vr *= Math.pow(SPIN_FRICTION, k);
        if (Math.abs(it.vx) < MIN_VEL) it.vx = 0;
        if (Math.abs(it.vy) < MIN_VEL) it.vy = 0;
        if (Math.abs(it.vr) < 0.02) it.vr = 0;
      }
      place(it);
    }
    if (busy) raf = requestAnimationFrame(step); else last = 0;
  };
  const wake = () => { if (!running || raf) return; last = 0; raf = requestAnimationFrame(step); };
  const start = () => {
    if (running || disposed) return;
    running = true;
    if (!started) {
      started = true;
      const t0 = performance.now() + 250;
      items.forEach((it, i) => (it.flyAt = t0 + i * STAGGER_MS));
    }
    wake();
  };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; };
  const sync = () => { if (reduced) return; if (onScreen && !hidden) start(); else stop(); };
  const io = new IntersectionObserver((es) => { onScreen = es[0] ? es[0].isIntersecting : false; sync(); }, { threshold: 0.45 });
  io.observe(host);
  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  let rt = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const nw = host.clientWidth || 1, nh = host.clientHeight || 1;
      if (nw === W && nh === H) return;
      W = nw; H = nh;
      for (const it of items) { draw(it); home(it); it.x = it.hx; it.y = it.hy; it.tx = it.x; it.ty = it.y; clampInside(it); place(it); }
    }, 100);
  });
  ro.observe(host);

  if (document.fonts && document.fonts.load) {
    Promise.all(defs.map((d) => document.fonts.load(fontString(d, 40), d.word).catch(() => {}))).then(() => {
      if (disposed) return;
      for (const it of items) { draw(it); home(it); if (it.fly >= 1 && !it.dragging && !it.vx && !it.vy) { it.x = it.hx; it.y = it.hy; } clampInside(it); place(it); }
    });
  }

  return {
    destroy() {
      disposed = true; stop(); io.disconnect(); ro.disconnect(); clearTimeout(rt);
      document.removeEventListener("visibilitychange", onVis);
      for (const it of items) it.el.remove();
    },
  };
}
