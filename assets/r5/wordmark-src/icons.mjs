// The O alone, recut for small squares: paper O on an ink tile.
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const f = (n) => +n.toFixed(2);
// oval as path from extremes with handle factor k
const ov = (l, t, r, b, k, ccw) => { const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
  const p = [[cx, t], [r, cy], [cx, b], [l, cy]];
  const segs = ccw ? `M${f(cx)} ${f(t)}C${f(cx - k * rx)} ${f(t)} ${f(l)} ${f(cy - k * ry)} ${f(l)} ${f(cy)}C${f(l)} ${f(cy + k * ry)} ${f(cx - k * rx)} ${f(b)} ${f(cx)} ${f(b)}C${f(cx + k * rx)} ${f(b)} ${f(r)} ${f(cy + k * ry)} ${f(r)} ${f(cy)}C${f(r)} ${f(cy - k * ry)} ${f(cx + k * rx)} ${f(t)} ${f(cx)} ${f(t)}Z`
    : `M${f(cx)} ${f(t)}C${f(cx + k * rx)} ${f(t)} ${f(r)} ${f(cy - k * ry)} ${f(r)} ${f(cy)}C${f(r)} ${f(cy + k * ry)} ${f(cx + k * rx)} ${f(b)} ${f(cx)} ${f(b)}C${f(cx - k * rx)} ${f(b)} ${f(l)} ${f(cy + k * ry)} ${f(l)} ${f(cy)}C${f(l)} ${f(cy - k * ry)} ${f(cx - k * rx)} ${f(t)} ${f(cx)} ${f(t)}Z`;
  return segs; };
// size: tile units; h: O height; side/top: stroke weights; rad: corner radius
function icon({ size, h, side, top, rad, ratio = 0.915, dy = 0 }) {
  const w = h * ratio, l = (size - w) / 2, t = (size - h) / 2 + dy;
  const O = ov(l, t, l + w, t + h, 0.565, false) + ov(l + side, t + top, l + w - side, t + h - top, 0.6, true);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><title>Orbe</title><rect width="${size}" height="${size}" rx="${rad}" fill="#121412"/><path fill="#f3f1ea" d="${O}"/></svg>\n`;
}
const V = {
  'favicon.svg': icon({ size: 32, h: 24, side: 5, top: 4, rad: 7, ratio: 22 / 24 }),       // also the 32 png
  'favicon-16.svg': icon({ size: 16, h: 12, side: 2.5, top: 2, rad: 3.5, ratio: 11 / 12 }),  // hinted 16: horizontals on whole pixels
  'touch.svg': icon({ size: 180, h: 110, side: 19.5, top: 13.5, rad: 0 }),  // iOS rounds it
  'app.svg': icon({ size: 512, h: 300, side: 52, top: 37, rad: 0 }),         // Stripe App: square, safe inside a circle
};
fs.mkdirSync('icons', { recursive: true });
for (const [k, v] of Object.entries(V)) fs.writeFileSync('icons/' + k, v);
const b = await chromium.launch();
const shot = async (svgName, out, px) => { const p = await b.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>` + V[svgName]);
  await p.screenshot({ path: out, omitBackground: true }); await p.close(); };
await shot('favicon.svg', 'icons/favicon-32.png', 32);
await shot('favicon-16.svg', 'icons/favicon-16.png', 16);
await shot('touch.svg', 'icons/apple-touch-icon.png', 180);
await shot('app.svg', 'icons/icon-512.png', 512);
await b.close();
