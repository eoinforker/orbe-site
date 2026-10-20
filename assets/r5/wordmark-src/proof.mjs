// node proof.mjs <round> : builds proof html from carved.json and screenshots it at 1x and 2x
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const R = process.argv[2] || 'r';
const J = JSON.parse(fs.readFileSync('carved.json', 'utf8'));
const old = fs.readFileSync('/home/user/orbeold/site/assets/identity/a-lettering/concepts/A3.svg', 'utf8').replace(/<title>.*?<\/title>/, '');
const sv = (g, h, extra = '') => `<svg viewBox="${g.vb.x} ${g.vb.y} ${g.vb.w} ${g.vb.h}" style="height:${h}px;width:auto;display:block" fill="currentColor">${extra}<path d="${g.d}"/></svg>`;
const pick = (h) => (h <= 24 ? J.small : J.text);
const sizes = [16, 20, 24, 32, 48, 96];
const row = (bg, fg) => `<div class="row" style="background:${bg};color:${fg}">${sizes.map((h) => `<div class="c"><small>${h}${h <= 24 ? ' s' : ''}</small>${sv(pick(h), h)}</div>`).join('')}<div class="c"><small>16 text cut</small>${sv(J.text, 16)}</div></div>`;
const guides = (g) => { const { XH, ASC, CAP } = g.metrics; return [0, -XH, -CAP, -ASC].map((y) => `<line x1="-50" x2="${g.vb.w + 50}" y1="${y}" y2="${y}" stroke="#d33" stroke-width="2" opacity=".5"/>`).join(''); };
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;font:12px/1.2 monospace;background:#f3f1ea;color:#121412}
.row{display:flex;align-items:flex-end;gap:40px;padding:22px 30px}.c small{display:block;opacity:.5;margin-bottom:6px}
.big{padding:30px 40px;display:flex;gap:60px;align-items:flex-end}.ink{background:#121412;color:#f3f1ea}</style>
<div class="big">${sv(J.text, 240, guides(J.text))}<div><small>old A3</small>${old.replace('<svg ', '<svg style="height:120px;width:auto;display:block" ')}</div></div>
<div class="big ink">${sv(J.text, 240)}${sv(J.small, 120)}</div>
${row('#f3f1ea', '#121412')}${row('#121412', '#f3f1ea')}`;
fs.writeFileSync(`proof-${R}.html`, html);
const b = await chromium.launch();
for (const dsf of [1, 2]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dsf });
  await p.goto('file://' + process.cwd() + `/proof-${R}.html`);
  await p.screenshot({ path: `shots/${R}-${dsf}x.png`, fullPage: true });
  await p.close();
}
await b.close();
