/*
  The one easing, cubic-bezier(0.6, 0.04, 0.3, 1), as a function of time for
  canvas and counting work. CSS uses var(--ob-ease); scripts use EASE (the
  string, for the Web Animations API) or ease(t) (0 to 1 in, 0 to 1 out).
*/
export const EASE = "cubic-bezier(0.6, 0.04, 0.3, 1)";
function bezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => { let t = x; for (let i = 0; i < 6; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; } return Y(Math.max(0, Math.min(1, t))); };
}
export const ease = bezier(0.6, 0.04, 0.3, 1);
export const reducedMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
