/*
  The pointer trail, for any Orbe page.

    import { mountTrail } from "../assets/orbe/trail.js";
    mountTrail({ loud: ".hero" });

  Where a mouse moves, a light confetti of the lattice follows it: cells a
  little smaller than the 11.28px pitch, softly rounded, half see-through,
  each lifted off the paper by the soft shadow. They fade and drift up two
  pixels over 0.9s; a click on something that is not a control scatters a
  small cluster. The cells sit on the page (they scroll with it), on one
  fixed canvas that draws over the fields and under anything marked
  .ob-layer, so it never covers words.

  Colours come from the --ob-trail custom property of whatever is under the
  pointer (three colours, space separated), so each section sets its own.
  Inside the loud selector it is at full strength; elsewhere it is quieter
  and lighter. Off on touch, off under reduced motion, and idle-free: no
  frame runs once the last cell has gone.
*/
import { ease, reducedMotion } from "./ease.js";

export function mountTrail({ loud = null, quiet = 0.45, cell = 11.28, life = 900, max = 40 } = {}) {
  let fine = false;
  try { fine = matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) {}
  if (!fine || reducedMotion()) return { stop() {} };

  const cv = document.createElement("canvas");
  cv.className = "ob-trail";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");
  const INSET = 1.6, DRIFT = 2;
  let cells = [], raf = 0, dpr = 1, last = "";

  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    cv.style.width = `${innerWidth}px`; cv.style.height = `${innerHeight}px`;
    if (cells.length && !raf) raf = requestAnimationFrame(draw);
  };
  const draw = (now) => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    cells = cells.filter((c) => now - c.t < life);
    ctx.shadowColor = "rgba(20, 19, 17, 0.14)";
    ctx.shadowBlur = 3 * dpr; ctx.shadowOffsetY = 1 * dpr;
    const s = (cell - INSET * 2) * dpr, rad = 2 * dpr, sx = scrollX, sy = scrollY;
    for (const c of cells) {
      const e = ease(Math.max(0, (now - c.t) / life));
      ctx.globalAlpha = c.a * (1 - e);
      ctx.fillStyle = c.c;
      const x = (c.x * cell + INSET - sx) * dpr, y = (c.y * cell + INSET - DRIFT * e - sy) * dpr;
      if (x < -s || y < -s || x > cv.width || y > cv.height) continue;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, s, s, rad); else ctx.rect(x, y, s, s);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = cells.length ? requestAnimationFrame(draw) : 0;
  };
  /* three colours from the element under the pointer */
  const palette = (el) => {
    const v = el ? getComputedStyle(el).getPropertyValue("--ob-trail").trim() : "";
    const list = v.split(/\s+(?![^(]*\))/).filter(Boolean);
    return list.length ? list : ["#9EE9FB", "#EED56A", "#F2879E"];
  };
  const add = (x, y, now, pal, strength) => {
    const i = (((x * 7 + y * 3) % pal.length) + pal.length) % pal.length;
    cells.push({ x, y, t: now, c: pal[i], a: (0.35 + (((x * 13 + y * 29) % 11 + 11) % 11 / 10) * 0.25) * strength });
    if (cells.length > max) cells.splice(0, cells.length - max);
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const at = (e) => [Math.floor((e.clientX + scrollX) / cell), Math.floor((e.clientY + scrollY) / cell)];
  const isLoud = (t) => !loud || !!t.closest?.(loud);

  const move = (e) => {
    if (e.pointerType !== "mouse" || e.buttons) return;
    const [x, y] = at(e), k = `${x},${y}`;
    if (k === last) return;
    const t = e.target instanceof Element ? e.target : document.body;
    const strong = isLoud(t), pal = palette(t), str = strong ? 1 : quiet;
    const now = performance.now(), [px, py] = last ? last.split(",").map(Number) : [x, y];
    /* a fast move fills a few cells between, every other one (every third when quiet), so the line stays light */
    const n = Math.min(6, Math.max(Math.abs(x - px), Math.abs(y - py))), stepBy = strong ? 2 : 3;
    for (let i = stepBy; i < n; i += stepBy) add(Math.round(px + ((x - px) * i) / n), Math.round(py + ((y - py) * i) / n), now - (n - i) * 8, pal, str);
    last = k;
    add(x, y, now, pal, str);
  };
  const down = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const t = e.target instanceof Element ? e.target : document.body;
    if (t.closest("a, button, input, select, textarea, label, summary, [role=button], [data-grip]")) return;
    const [x, y] = at(e), now = performance.now(), pal = palette(t), str = isLoud(t) ? 1 : quiet;
    for (const [dx, dy] of [[0, 0], [1, -1], [-1, 0], [1, 1], [-2, -1], [0, 2], [2, 0]]) add(x + dx, y + dy, now - Math.abs(dx + dy) * 40, pal, str);
  };
  const leave = () => { last = ""; };
  let rs = 0;
  const resize = () => { clearTimeout(rs); rs = setTimeout(size, 80); };

  size();
  addEventListener("pointermove", move, { passive: true });
  addEventListener("pointerdown", down, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  addEventListener("resize", resize);
  return {
    stop() {
      removeEventListener("pointermove", move); removeEventListener("pointerdown", down); removeEventListener("resize", resize);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf); cv.remove();
    },
  };
}
