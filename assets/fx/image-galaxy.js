/*
  image-galaxy: a perspective field of small pieces of creator work drifting behind
  text. Each tile sits at a spread out position and a depth (translateZ under a CSS
  perspective), drifts upward on its own with parallax by speed, grows as it nears the
  bottom and shrinks as it rises, and wraps forever (leaves one edge, comes back at the
  other). Far tiles are dimmed by a paper overlay. Scrolling the page pushes the drift
  along with it. Plain DOM transforms, no WebGL.

  The field is inserted as the first child of el, so anything already inside el (a
  headline, say) sits on top of it.

  mount(el, opts) -> { destroy }
    opts.images  [{ url, w, h }]   default: procedural creator tiles (no photos)
    opts.count   tile count when generating (default 26)
    opts.veil    the dimming overlay colour (default a mist paper)
*/

import { creatorTiles } from "./creator-tiles.js";

const lerp = (a, b, t) => (1 - t) * a + t * b;

const CONFIG = { speed: 0.7, ease: 0.12, scaleEase: 0.25, scrollMultiplier: 0.6, scaleMin: 0.5, scaleMax: 1.15 };
const Z_POOL = [-200, -150, -100, -50, 0, 50, 100, 150, 200];
const SPEED_POOL = [0.55, 0.75, 1, 1.3, 1.6];

function buildParticles(n) {
  const cols = Math.max(3, Math.round(Math.sqrt(n) * 1.4));
  const left = 6;
  const step = (100 - left * 2) / (cols - 1);
  const rows = Math.ceil(n / cols);
  const slots = Array.from({ length: n }, (_, i) => i).sort(() => 0.5 - Math.random());
  return Array.from({ length: n }, (_, i) => {
    const z = Z_POOL[(i * 4) % Z_POOL.length];
    const opacity = z < 0 ? Math.max(0.45, 1 + z / 300) : 1;
    const slot = slots[i];
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = left + col * step + (Math.random() - 0.5) * step * 0.5;
    const y = ((row + 0.5) / rows) * 100 + (Math.random() - 0.5) * (100 / rows) * 0.6;
    return { x: Math.max(1, Math.min(92, x)), y: ((y % 100) + 100) % 100, speed: SPEED_POOL[i % SPEED_POOL.length], z, opacity };
  });
}

export function mount(el, opts = {}) {
  const host = el;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // A cool veil: paper over cobalt reads periwinkle, mist keeps it blue.
  const veil = opts.veil || "#E4F3F1";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";

  const field = document.createElement("div");
  field.setAttribute("aria-hidden", "true");
  Object.assign(field.style, {
    position: "absolute", inset: "0", perspective: "800px", perspectiveOrigin: "50% 50%",
    pointerEvents: "none", zIndex: "0", isolation: "isolate", transform: "translateZ(0)", transformStyle: "flat",
  });
  host.insertBefore(field, host.firstChild);

  let nodes = [];
  let defs = [];
  let scroll = { current: 0, target: 0, last: 0 };
  let directionSign = 1;
  let direction = "down";
  let containerHeight = 0;
  let containerOffsetHeight = 0;
  let raf = 0, running = false, disposed = false, lastTime = 0;

  const tileWidth = () => Math.round(Math.max(54, Math.min(112, host.clientWidth * 0.08)));

  const layout = () => {
    const rect = field.getBoundingClientRect();
    const small = host.clientWidth < 700;
    const tw = tileWidth();
    nodes.forEach((node, i) => {
      const d = defs[i];
      node.overlay.style.opacity = `${1 - d.opacity}`;
      node.el.style.width = `${Math.round(tw * node.ratio)}px`;
      const left = small ? (i % 4) * 24 + (d.x % 14) : d.x;
      node.el.style.left = `${left}%`;
      node.el.style.top = `${d.y}%`;
      node.speed = d.speed;
      node.z = d.z;
      node.el.style.transform = "translate3d(0, 0px, 0)";
      const box = node.el.getBoundingClientRect();
      node.extra = 0;
      node.height = box.height;
      node.top = box.top - rect.top;
      node.position = 0;
      node.currentScale = 1;
    });
    containerHeight = field.clientHeight;
    containerOffsetHeight = containerHeight * 0.1;
    scroll = { current: 0, target: 0, last: 0 };
  };

  const update = (dt) => {
    scroll.target += CONFIG.speed * dt * directionSign;
    scroll.current = lerp(scroll.current, scroll.target, CONFIG.ease);
    direction = scroll.current < scroll.last ? "down" : "up";
    for (const t of nodes) {
      t.position = -scroll.current * t.speed - t.extra;
      const bottom = t.position + t.top + t.height;
      const isBefore = bottom < -containerOffsetHeight;
      const isAfter = bottom > containerHeight + containerOffsetHeight;
      if (direction === "up" && isBefore) t.extra -= containerHeight + containerOffsetHeight + t.height;
      if (direction === "down" && isAfter) t.extra += containerHeight + containerOffsetHeight + t.height;
      t.position = -scroll.current * t.speed - t.extra;
      const top = t.position + t.top;
      const f = Math.max(0, Math.min(1, top / containerHeight));
      const targetScale = CONFIG.scaleMin + f * (CONFIG.scaleMax - CONFIG.scaleMin);
      t.currentScale = dt === 0 ? targetScale : lerp(t.currentScale, targetScale, CONFIG.scaleEase);
      t.el.style.transform = `translate3d(0, ${t.position.toFixed(2)}px, ${t.z}px) scale(${t.currentScale.toFixed(4)})`;
    }
    scroll.last = scroll.current;
  };

  const tick = (now) => {
    if (!running) return;
    const dt = lastTime ? Math.min(2, (now - lastTime) / 16.667) : 1;
    lastTime = now;
    update(dt);
    raf = requestAnimationFrame(tick);
  };

  const build = (list) => {
    defs = buildParticles(list.length);
    nodes = list.map((img) => {
      const wrap = document.createElement("div");
      Object.assign(wrap.style, {
        position: "absolute", willChange: "transform", transformOrigin: "50% 50%",
        borderRadius: "4px", overflow: "hidden", boxShadow: "0 1px 0 rgba(20,19,17,0.12)",
      });
      const im = document.createElement("img");
      im.src = img.url;
      im.alt = "";
      im.draggable = false;
      Object.assign(im.style, { display: "block", width: "100%", height: "auto" });
      const ov = document.createElement("div");
      Object.assign(ov.style, { position: "absolute", inset: "0", background: veil });
      wrap.appendChild(im);
      wrap.appendChild(ov);
      field.appendChild(wrap);
      const ratio = img.w && img.h ? Math.min(1.25, Math.max(0.8, img.w / img.h)) : 1;
      return { el: wrap, overlay: ov, ratio, speed: 1, z: 0, extra: 0, height: 0, top: 0, position: 0, currentScale: 1 };
    });
    // Image heights come from the data URLs; wait for them before measuring.
    Promise.all(nodes.map((n) => {
      const im = n.el.firstChild;
      return im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; });
    })).then(() => {
      if (disposed) return;
      layout();
      update(0);
      sync();
    });
  };

  if (opts.images && opts.images.length) build(opts.images);
  else creatorTiles({ count: opts.count || 22, seed: 23, size: 240 }).then((t) => { if (!disposed) build(t); });

  // The page's own scroll pushes the drift, in its direction.
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (reduced || !running || !dy) return;
    const v = Math.max(-60, Math.min(60, dy));
    scroll.target += v * CONFIG.scrollMultiplier;
    directionSign = Math.sign(dy);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const start = () => {
    if (running || disposed || !nodes.length) return;
    running = true;
    lastTime = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  let onScreen = false;
  let hidden = document.hidden;
  function sync() {
    if (reduced) return;
    if (onScreen && !hidden) start(); else stop();
  }
  const io = new IntersectionObserver((es) => { onScreen = es[0] ? es[0].isIntersecting : false; sync(); }, { threshold: 0 });
  io.observe(host);
  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  let lastW = host.clientWidth, lastH = host.clientHeight, resizeT = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (host.clientWidth === lastW && host.clientHeight === lastH) return;
      lastW = host.clientWidth; lastH = host.clientHeight;
      if (!nodes.length) return;
      layout();
      update(0);
    }, 120);
  });
  ro.observe(host);

  return {
    destroy() {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimeout(resizeT);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      if (field.parentNode) field.parentNode.removeChild(field);
      nodes = [];
    },
  };
}
