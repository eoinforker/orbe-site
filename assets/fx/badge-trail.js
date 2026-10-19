/*
  badge-trail: the wrong yardsticks drop behind the cursor as small ink
  bars, hold for a beat and flick away.

  Essentials kept from the spec:
  - the trail spawns on the raw pointer path, rate limited by time AND by
    distance travelled, so a still cursor cannot stack badges in place
  - hard non overlap: a candidate rect (inflated by a gap) is tested against
    every live badge and the drop is skipped if it would touch one
  - words from a shuffled bag, all in one ink (the hue walker is kept for
    the old API), intensity from pointer speed
  - slam in along the direction of travel, hold with a sub pixel wobble,
    flick out thinner and rotated; neighbours get a small shove on a drop
  - a ghost cursor takes over after the pointer leaves, so the card is
    never dead; touch drags lay the trail too
  - DOM badges, measured from the live mono font

  Usage: import { mount } from "./badge-trail.js";
         const fx = mount(el); fx.destroy();
*/

export const WORDS = [
  "the top 1%",
  "viral",
  "followers",
  "the charts",
  "vanity views",
  "trending",
  "the giants",
  "likes",
];

// Static examples for reduced motion: ink words on the plate, nothing else.
const STATIC = ["the top 1%", "viral", "followers", "the charts", "vanity views"].map((text) => ({ text, color: "#141311" }));

const FONT_PX = 12;
const PAD_X = 4;
const PAD_Y = 2;
const RADIUS = 3;
const GAP = 3;
const DROP_MS = 45;
const MIN_TRAVEL = 14;
const APPEAR_MS = 110;
const HOLD_MS = 520;
const FADE_MS = 240;
const LIFE_MS = APPEAR_MS + HOLD_MS + FADE_MS;
const MAX_LIVE = 24;
const SLAM_OFFSET = 5;
const SLAM_OVERSHOOT = 1.03;
const IDLE_WOBBLE = 0.35;
const IDLE_BREATH = 0.01;
const SPECIAL_EVERY = 15;
const SCRAMBLE_MS = 130;
const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789%";
const SPEED_FULL = 40;
const INTENSITY_FLOOR = 0.35;
const REPEL_PX = 3;
const REPEL_RANGE = 64;
const REPEL_CHASE = 0.16;
const REPEL_DECAY = 0.05;
const GHOST_IDLE_MS = 600;
const GHOST_BLEND_MS = 420;
const HUE_STEP = 24;
const FONT_FAMILY = "\"Commit Mono\", ui-monospace, \"SF Mono\", Menlo, monospace";

function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const hex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Walk the wheel but jump the blue violet, lilac and magenta band (225 to 330).
function makeHueWalker(seed) {
  let h = seed;
  return (intensity = 1) => {
    h = (h + HUE_STEP) % 360;
    if (h > 225 && h < 330) h = 330 + (h - 225) * 0.05;
    const t = Math.max(0, Math.min(1, intensity));
    return hslHex(h, 0.6 + 0.35 * t, 0.72 - 0.12 * t);
  };
}

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hits(x, y, w, h, b) {
  return x < b.x + b.w + GAP && x + w + GAP > b.x && y < b.y + b.h + GAP && y + h + GAP > b.y;
}

function motionOf(b, clock) {
  const age = clock - b.born;
  let opacity = 1;
  let scale = 1;
  let scaleY = 1;
  let rot = 0;
  let dx = 0;
  let dy = 0;
  if (age < APPEAR_MS) {
    const t = age / APPEAR_MS;
    const spring = 1 - Math.pow(1 - t, 3);
    opacity = Math.min(1, t * 1.4);
    scale = 0.9 + 0.1 * spring + (SLAM_OVERSHOOT - 1) * Math.sin(Math.PI * t);
    const back = (1 - spring) * SLAM_OFFSET;
    dx = -b.dirX * back;
    dy = -b.dirY * back;
  } else if (age > APPEAR_MS + HOLD_MS) {
    const t = Math.min(1, (age - APPEAR_MS - HOLD_MS) / FADE_MS);
    const e = t * t;
    opacity = 1 - t;
    scale = 1 - 0.2 * e;
    scaleY = 1 - 0.45 * e;
    rot = b.exitRot * e;
  }
  if (age >= APPEAR_MS) {
    const p = clock * 0.004 + b.seed;
    dx += Math.sin(p) * IDLE_WOBBLE * opacity;
    dy += Math.cos(p * 1.3 + 0.7) * IDLE_WOBBLE * opacity;
    scale += Math.sin(p * 0.9) * IDLE_BREATH * opacity;
  }
  return { dx, dy, scale, scaleY, rot, opacity };
}

function badgeStyle(s) {
  Object.assign(s.style, {
    position: "absolute",
    left: "0",
    top: "0",
    fontFamily: FONT_FAMILY,
    fontSize: `${FONT_PX}px`,
    lineHeight: "1",
    fontWeight: "500",
    whiteSpace: "nowrap",
    padding: `${PAD_Y}px ${PAD_X}px`,
    borderRadius: `${RADIUS}px`,
    letterSpacing: "0",
    color: "#F3F0E8",
    pointerEvents: "none",
  });
}

export function mount(el, opts = {}) {
  const reduced =
    opts.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";
  if (!el.style.background) el.style.background = opts.plate || "#FBFAF6";
  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    "A pale card that drops a trail of the wrong yardsticks, like the top 1%, viral and followers, in ink behind the cursor. On touch, drag a finger across it.",
  );

  const layer = document.createElement("div");
  Object.assign(layer.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  el.appendChild(layer);

  if (reduced) {
    Object.assign(layer.style, {
      display: "flex",
      flexWrap: "wrap",
      alignContent: "center",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "0 32px",
    });
    for (const b of STATIC) {
      const s = document.createElement("span");
      badgeStyle(s);
      Object.assign(s.style, { position: "static", background: b.color });
      s.textContent = b.text;
      layer.appendChild(s);
    }
    return { destroy: () => layer.remove() };
  }

  if (!fine) el.style.touchAction = "none";

  // Measure the real advance so the AABB matches what is drawn.
  const ctx = document.createElement("canvas").getContext("2d");
  const badgeH = Math.round(FONT_PX + PAD_Y * 2);
  const badgeW = (text) => {
    let wpx = text.length * FONT_PX * 0.62;
    if (ctx) {
      ctx.font = `500 ${FONT_PX}px ${FONT_FAMILY}`;
      wpx = ctx.measureText(text).width;
    }
    return Math.ceil(wpx) + PAD_X * 2;
  };

  let onScreen = false;
  let hidden = document.hidden;
  let raf = 0;
  let seq = 0;
  const live = [];
  let rpx = -1;
  let rpy = -1;
  let px = -1;
  let py = -1;
  let lastDropT = 0;
  let lastDropX = 0;
  let lastDropY = 0;
  let haveLast = false;
  let leftAt = -Infinity;
  let blendFromX = 0;
  let blendFromY = 0;
  let prevPx = -1;
  let prevPy = -1;
  let dropCount = 0;
  let lastNow = 0;
  let destroyed = false;

  let bag = [];
  const nextWord = () => {
    if (bag.length === 0) bag = shuffled(WORDS.length);
    return WORDS[bag.pop()];
  };
  const nextColor = makeHueWalker(Math.random() * 230);

  // A slow wandering point standing in for a cursor that is not there.
  const ghostPoint = (t, w, h) => [
    w * 0.5 + (Math.sin(t * 0.00156) * 0.3 + Math.sin(t * 0.00465 + 2.3) * 0.11) * w,
    h * 0.5 + (Math.sin(t * 0.00219 + 1.7) * 0.3 + Math.cos(t * 0.0063 + 0.6) * 0.12) * h,
  ];

  const tick = (now) => {
    raf = 0;
    const dtFrames = lastNow ? Math.min(4, (now - lastNow) / 16.6667) : 1;
    lastNow = now;
    const w = el.clientWidth;
    const h = el.clientHeight;

    if (rpx >= 0) {
      px = rpx;
      py = rpy;
    } else if (now - leftAt >= GHOST_IDLE_MS) {
      const [gx, gy] = ghostPoint(now, w, h);
      const k = Math.min(1, (now - leftAt - GHOST_IDLE_MS) / GHOST_BLEND_MS);
      if (isFinite(leftAt) && k < 1) {
        px = blendFromX + (gx - blendFromX) * k;
        py = blendFromY + (gy - blendFromY) * k;
      } else {
        px = gx;
        py = gy;
      }
    } else {
      px = -1;
      py = -1;
    }

    for (let i = live.length - 1; i >= 0; i--) {
      if (now - live[i].born >= LIFE_MS) {
        live[i].node.remove();
        live.splice(i, 1);
      }
    }

    if (px >= 0 && live.length < MAX_LIVE) {
      const travelled = haveLast ? Math.hypot(px - lastDropX, py - lastDropY) : Infinity;
      if (now - lastDropT >= DROP_MS && travelled >= MIN_TRAVEL) {
        const text = nextWord();
        const bw = badgeW(text);
        const bh = badgeH;
        const x = Math.max(0, Math.min(w - bw, px - bw / 2));
        const y = Math.max(0, Math.min(h - bh, py - bh / 2));
        if (!live.some((b) => hits(x, y, bw, bh, b))) {
          let dx = prevPx >= 0 ? px - prevPx : 0;
          let dy = prevPy >= 0 ? py - prevPy : -1;
          const speed = prevPx >= 0 ? Math.hypot(px - prevPx, py - prevPy) / dtFrames : 0;
          const dm = Math.hypot(dx, dy) || 1;
          dx /= dm;
          dy /= dm;
          const intensity =
            INTENSITY_FLOOR + (1 - INTENSITY_FLOOR) * Math.max(0, Math.min(1, speed / SPEED_FULL));
          const cx = x + bw / 2;
          const cy = y + bh / 2;
          for (const b of live) {
            const vx = b.x + b.w / 2 - cx;
            const vy = b.y + b.h / 2 - cy;
            const d = Math.hypot(vx, vy) || 1;
            if (d < REPEL_RANGE) {
              const push = REPEL_PX * (1 - d / REPEL_RANGE);
              b.tgtX += (vx / d) * push;
              b.tgtY += (vy / d) * push;
            }
          }
          const special = dropCount % SPECIAL_EVERY === SPECIAL_EVERY - 1;
          const color = nextColor(intensity);
          const node = document.createElement("span");
          badgeStyle(node);
          // one ink for every word: the wrong yardsticks, never a rainbow
          void color;
          node.style.background = special ? "#F3F0E8" : "#141311";
          node.style.color = special ? "#141311" : "#F3F0E8";
          if (special) node.style.boxShadow = "inset 0 0 0 1.5px #141311";
          node.style.willChange = "opacity, transform";
          node.style.width = `${bw}px`;
          node.style.height = `${bh}px`;
          node.style.boxSizing = "border-box";
          node.style.textAlign = "center";
          layer.appendChild(node);
          live.push({
            id: seq++,
            node,
            x,
            y,
            w: bw,
            h: bh,
            text,
            born: now,
            dirX: dx,
            dirY: dy,
            exitRot: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5),
            seed: Math.random() * 1000,
            offX: 0,
            offY: 0,
            tgtX: 0,
            tgtY: 0,
          });
          dropCount++;
          lastDropT = now;
          lastDropX = px;
          lastDropY = py;
          haveLast = true;
        }
      }
    }
    prevPx = px;
    prevPy = py;

    const n = live.length;
    const chaseK = 1 - Math.pow(1 - REPEL_CHASE, dtFrames);
    const decayK = 1 - Math.pow(1 - REPEL_DECAY, dtFrames);
    for (let i = 0; i < n; i++) {
      const b = live[i];
      const depth = n > 1 ? 1 - i / (n - 1) : 0;
      b.offX += (b.tgtX - b.offX) * chaseK;
      b.offY += (b.tgtY - b.offY) * chaseK;
      b.tgtX *= 1 - decayK;
      b.tgtY *= 1 - decayK;

      const age = now - b.born;
      let label = b.text;
      if (age < SCRAMBLE_MS && b.text.length > 1) {
        const locked = Math.floor((age / SCRAMBLE_MS) * b.text.length);
        label = "";
        for (let c = 0; c < b.text.length; c++) {
          label +=
            c < locked || b.text[c] === " "
              ? b.text[c]
              : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      if (b.node.textContent !== label) b.node.textContent = label;

      const m = motionOf(b, now);
      const ds = 1 - depth * 0.06;
      b.node.style.opacity = (m.opacity * (1 - depth * 0.12)).toFixed(3);
      b.node.style.transform =
        `translate(${(b.x + m.dx + b.offX).toFixed(2)}px, ${(b.y + m.dy + b.offY).toFixed(2)}px) ` +
        `scale(${(m.scale * ds).toFixed(3)}, ${(m.scale * ds * m.scaleY).toFixed(3)}) rotate(${m.rot.toFixed(2)}deg)`;
    }

    if (onScreen && !hidden && !destroyed) raf = requestAnimationFrame(tick);
  };

  const sync = () => {
    const should = onScreen && !hidden && !destroyed;
    if (should && !raf) {
      lastNow = 0;
      raf = requestAnimationFrame(tick);
    } else if (!should && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const local = (e) => {
    const r = el.getBoundingClientRect();
    rpx = e.clientX - r.left;
    rpy = e.clientY - r.top;
  };
  const onMove = (e) => {
    if (e.pointerType === "touch" && e.buttons === 0) return;
    local(e);
    if (e.pointerType === "touch") e.preventDefault();
  };
  const onDown = (e) => {
    local(e);
    if (e.pointerType === "touch") e.preventDefault();
  };
  const onLeave = () => {
    if (px >= 0) {
      blendFromX = px;
      blendFromY = py;
    }
    rpx = -1;
    rpy = -1;
    leftAt = performance.now();
  };
  const onUp = (e) => {
    if (e.pointerType !== "mouse") onLeave();
  };

  const io = new IntersectionObserver(
    (es) => {
      onScreen = es.some((e) => e.isIntersecting);
      sync();
    },
    { threshold: 0.15 },
  );
  io.observe(el);
  const onVis = () => {
    hidden = document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVis);
  // Badges clamp to the card on spawn; on resize the live ones just finish.
  const ro = new ResizeObserver(() => {
    for (const b of live) {
      b.x = Math.max(0, Math.min(el.clientWidth - b.w, b.x));
      b.y = Math.max(0, Math.min(el.clientHeight - b.h, b.y));
    }
  });
  ro.observe(el);

  el.addEventListener("pointermove", onMove, { passive: false });
  el.addEventListener("pointerdown", onDown, { passive: false });
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onLeave);

  return {
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onLeave);
      layer.remove();
    },
  };
}
