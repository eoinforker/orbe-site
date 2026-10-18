/*
  holo: an Orbe identity card in foil. Tilt it (pointer, or the phone
  itself) and the foil catches the light, a field of small balls comes up
  on the side you turned, and the portrait tile flips its two tones.

  The creator on the card is made up and labelled as an example.

  Essentials kept from the spec:
  - the printed body never changes; everything above it is light landing
    on it (three foil layers with their own parallax rate, blend and filter)
  - two springs: the tilt follows the pointer, the sheet follows the tilt,
    and the sheet's speed drives a velocity smear
  - a kick on release so the card swings past and settles
  - idle drift when untouched, eased in from wherever the pointer left it,
    and a grab ease when the pointer arrives
  - the pattern reveal and the tile flip both start past a threshold of tilt
  - the tile is a plainer material: a hard two tone with a highlight, no
    rainbow; positive and negative copies, the negative shown through a
    travelling mask (a filter cannot invert half an element)
  - the loop sleeps once everything has settled under the pointer

  Usage: import { mount } from "./holo.js";
         const fx = mount(el, { name, since, stats }); fx.destroy();
*/

const MAX_TILT = 14;
const LAYER_SLOTS = 3;

// Foil hues, warm to cool. The violet pillar of the source is swapped for
// a pink and the periwinkle for a clean blue.
const PILLARS = [
  "hsl(2, 100%, 73%)",
  "hsl(48, 100%, 69%)",
  "hsl(93, 100%, 69%)",
  "hsl(182, 100%, 74%)",
  "hsl(205, 100%, 72%)",
  "hsl(342, 100%, 78%)",
];

function rainbow(angle, space, hues = PILLARS) {
  const stops = hues
    .map((c, i) => `${c} calc(${space} * ${i + 1})`)
    .concat(`${hues[0]} calc(${space} * ${hues.length + 1})`)
    .join(", ");
  return `repeating-linear-gradient(${angle}, ${stops})`;
}

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E")`;

const FOIL = {
  layers: [
    {
      img: rainbow("10deg", "8%"),
      size: "380% 380%",
      rate: 1,
      blend: "overlay",
      filter: "brightness(1.08) contrast(2.3) saturate(1.5)",
      base: 0.26,
      gain: 0.6,
    },
    {
      img: rainbow("104deg", "13%"),
      size: "300% 300%",
      rate: -0.7,
      blend: "color-dodge",
      filter: "brightness(.82) contrast(2) saturate(1.7)",
      base: 0.12,
      gain: 0.3,
    },
    {
      // fine print lines, the grain of the foil itself
      img:
        "repeating-linear-gradient(96deg, rgba(255,255,255,.5) 0px, rgba(255,255,255,0) 2px, rgba(0,0,0,.16) 3px, rgba(255,255,255,0) 5px)",
      size: "auto",
      rate: 1.8,
      blend: "overlay",
      filter: "contrast(1.3)",
      base: 0.1,
      gain: 0.26,
    },
  ],
  parallax: 0.26,
  bloom: 0.55,
  glare: 0.42,
};

// Portrait for the tile: grey values only, the two tones are applied in
// CSS. A head, shoulders and a round mic: a creator, not a stock face.
const PORTRAIT = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'>` +
    `<rect width='100' height='120' fill='#e9e9e9'/>` +
    `<circle cx='76' cy='22' r='30' fill='#d2d2d2'/>` +
    `<path d='M8 120c2-26 18-40 42-40s40 14 42 40z' fill='#3a3a3a'/>` +
    `<path d='M42 70h16v14c0 5-16 5-16 0z' fill='#8d8d8d'/>` +
    `<ellipse cx='50' cy='52' rx='19' ry='22' fill='#a3a3a3'/>` +
    `<path d='M30 50c0-18 9-27 21-27s21 9 20 25c-6-7-14-11-22-11s-14 5-19 13z' fill='#1c1c1c'/>` +
    `<circle cx='43' cy='54' r='1.8' fill='#262626'/><circle cx='58' cy='54' r='1.8' fill='#262626'/>` +
    `<path d='M45 64q5 4 10 0' stroke='#262626' stroke-width='1.8' fill='none' stroke-linecap='round'/>` +
    `<rect x='71' y='78' width='3' height='26' fill='#1c1c1c'/>` +
    `<circle cx='72.5' cy='74' r='8' fill='#1c1c1c'/><circle cx='72.5' cy='74' r='5' fill='#5a5a5a'/>` +
    `</svg>`,
)}")`;

const BODY = ["#E6FAFE", "#C9F2FC", "#A8EBFB", "#D9F6FD"];
const TILE = ["#1F4BFF", "#D6F6FD"];

const DEFAULTS = {
  name: "Mara Quill",
  since: "making videos since march 2021",
  stats: ["48k subs", "rpm £5.80", "rated against 312 creators her size"],
  label: "example creator",
};

const CSS = `
.ox-holo { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; perspective: 1100px; container-type: size; background: linear-gradient(180deg, #FBFAF6 0%, #EFEBE1 100%); user-select: none; -webkit-user-select: none; touch-action: pan-y; }
.ox-holo-card { position: relative; width: min(86cqw, calc(76cqh * 1.55)); aspect-ratio: 1.55; border-radius: 4.6cqmin; transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transform-style: preserve-3d; will-change: transform; container-type: inline-size; isolation: isolate; overflow: hidden; box-shadow: 0 1px 0 rgba(20,19,17,.06), 0 22px 36px -22px rgba(20,19,17,.42); }
.ox-holo-card > div { position: absolute; inset: 0; pointer-events: none; }
.ox-holo-body { background: var(--body-grad); }
.ox-holo-pattern, .ox-holo-pattern-lit { background-image: radial-gradient(circle at 50% 50%, var(--pat) 0 31%, transparent 33%); background-size: 6.2cqw 6.2cqw; background-position: var(--l1-x, 50%) var(--l1-y, 50%); }
.ox-holo-pattern { --pat: rgba(31,75,255,.30); opacity: var(--reveal, 0); -webkit-mask-image: linear-gradient(var(--reveal-angle, 0deg), transparent 28%, #000 92%); mask-image: linear-gradient(var(--reveal-angle, 0deg), transparent 28%, #000 92%); }
.ox-holo-pattern-lit { --pat: rgba(255,255,255,.9); mix-blend-mode: overlay; opacity: calc(var(--reveal, 0) * .9); -webkit-mask-image: radial-gradient(circle at var(--reveal-x, 50%) var(--reveal-y, 50%), #000 0, transparent 46%); mask-image: radial-gradient(circle at var(--reveal-x, 50%) var(--reveal-y, 50%), #000 0, transparent 46%); }
.ox-holo-foil { background-image: var(--l1-img); background-size: var(--l1-size); background-position: var(--l1-x) var(--l1-y); background-blend-mode: var(--l1-bgblend); mix-blend-mode: var(--l1-blend); filter: var(--l1-filter); opacity: var(--l1-o); }
.ox-holo-foil-b { background-image: var(--l2-img); background-size: var(--l2-size); background-position: var(--l2-x) var(--l2-y); background-blend-mode: var(--l2-bgblend); mix-blend-mode: var(--l2-blend); filter: var(--l2-filter); opacity: var(--l2-o); }
.ox-holo-foil-c { background-image: var(--l3-img); background-size: var(--l3-size); background-position: var(--l3-x) var(--l3-y); background-blend-mode: var(--l3-bgblend); mix-blend-mode: var(--l3-blend); filter: var(--l3-filter); opacity: var(--l3-o); }
.ox-holo-smear { background-image: repeating-linear-gradient(var(--smear-angle, 0deg), ${PILLARS[0]} 0 3%, ${PILLARS[2]} 3% 6%, ${PILLARS[4]} 6% 9%, ${PILLARS[5]} 9% 12%); mix-blend-mode: soft-light; opacity: calc(var(--smear, 0) * .5); }
.ox-holo-noise { background-image: ${GRAIN}; background-size: 120px 120px; mix-blend-mode: multiply; opacity: .22; }
.ox-holo-glare { background-image: radial-gradient(farthest-corner circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,.75) 0%, rgba(255,255,255,.18) 30%, rgba(20,19,17,.14) 95%); mix-blend-mode: overlay; opacity: calc(var(--glare-o, .4) * (.45 + var(--off, 0) * .55)); }
.ox-holo-sheen { background-image: linear-gradient(115deg, transparent calc(var(--gx, 50%) - 22%), rgba(255,255,255,.34) var(--gx, 50%), transparent calc(var(--gx, 50%) + 22%)); mix-blend-mode: soft-light; }
.ox-holo-edge { border-radius: inherit; box-shadow: inset 2px 0 0 rgba(255,255,255, calc(var(--edge-l, 0) * .8)), inset -2px 0 0 rgba(255,255,255, calc(var(--edge-r, 0) * .8)), inset 0 2px 0 rgba(255,255,255, calc(var(--edge-t, 0) * .8)), inset 0 -2px 0 rgba(255,255,255, calc(var(--edge-b, 0) * .8)); }
.ox-holo-content { display: grid; grid-template-columns: 1fr auto; gap: 3cqw; padding: 6cqw 6.4cqw 6cqw; color: #141311; }
.ox-holo-text { display: flex; flex-direction: column; min-width: 0; text-shadow: var(--emboss-x, 0) var(--emboss-y, 0) 0 rgba(255,255,255,.6), calc(var(--emboss-x, 0) * -1) calc(var(--emboss-y, 0) * -1) 0 rgba(20,19,17,.10); }
.ox-holo-mark { font: 800 3.6cqw/1 var(--sans, sans-serif); letter-spacing: -0.04em; color: #1F4BFF; margin: 0; display: flex; align-items: center; gap: .9cqw; }
.ox-holo-mark i { width: 2.5cqw; height: 2.5cqw; border-radius: 50%; background: #1F4BFF; display: inline-block; }
.ox-holo-name { font: 500 8.4cqw/0.95 var(--serif, Georgia, serif); letter-spacing: -0.025em; margin: auto 0 1.2cqw; }
.ox-holo-since { font: 500 2.75cqw/1.2 var(--sans, sans-serif); margin: 0; color: #24464D; }
.ox-holo-stats { font: 400 2.3cqw/1.5 var(--mono, monospace); margin: 3.2cqw 0 0; color: #141311; }
.ox-holo-stats span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ox-holo-label { font: 500 2.1cqw/1 var(--mono, monospace); text-transform: lowercase; color: #24464D; text-align: right; margin: 0 0 2cqw; }
.ox-holo-right { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; }
.ox-holo-tile { position: relative; width: 25cqw; aspect-ratio: 5 / 6; border-radius: 2.4cqw; overflow: hidden; isolation: isolate; background: var(--tile-light); box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 6px 14px -8px rgba(20,19,17,.5); }
.ox-holo-tile > div { position: absolute; inset: 0; }
.ox-holo-tile-photo, .ox-holo-tile-neg { background-image: var(--tile-src); background-size: 112% auto; background-position: var(--tile-x, 50%) 40%; filter: grayscale(1) brightness(1.15) contrast(9); }
.ox-holo-tile-neg { filter: grayscale(1) brightness(1.15) contrast(9) invert(1); -webkit-mask-image: linear-gradient(var(--tile-sweep-angle, 0deg), #000 calc(var(--tile-invert, 0) * 120% - 10%), transparent calc(var(--tile-invert, 0) * 120% + 4%)); mask-image: linear-gradient(var(--tile-sweep-angle, 0deg), #000 calc(var(--tile-invert, 0) * 120% - 10%), transparent calc(var(--tile-invert, 0) * 120% + 4%)); }
.ox-holo-tile-tone { background: var(--tile-light); mix-blend-mode: multiply; }
.ox-holo-tile-duo { background: var(--tile-dark); mix-blend-mode: lighten; }
.ox-holo-tile-grain { background-image: ${GRAIN}; background-size: 90px 90px; mix-blend-mode: multiply; opacity: .35; }
.ox-holo-tile-gloss { background: linear-gradient(calc(var(--tile-sweep-angle, 0deg) + 180deg), rgba(255,255,255,.0) 40%, rgba(255,255,255,.35) 62%, rgba(255,255,255,0) 78%); mix-blend-mode: soft-light; opacity: calc(.3 + var(--off, 0) * .7); }
`;

function adjust(v, a, b, c, d) {
  return c + ((d - c) * (v - a)) / (b - a);
}
function clamp(v, min = -1, max = 1) {
  return Math.min(Math.max(v, min), max);
}

class Follow {
  constructor(stiffness) {
    this.k = stiffness;
    this.value = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.speed = 0;
  }
  step() {
    const px = this.value.x;
    const py = this.value.y;
    this.value.x += (this.target.x - this.value.x) * this.k;
    this.value.y += (this.target.y - this.value.y) * this.k;
    this.velocity.x = this.value.x - px;
    this.velocity.y = this.value.y - py;
    const raw = Math.min(1, Math.hypot(this.velocity.x, this.velocity.y) * 14);
    this.speed += (raw - this.speed) * (raw > this.speed ? 0.45 : 0.06);
  }
  get settled() {
    return (
      Math.abs(this.target.x - this.value.x) < 0.0006 &&
      Math.abs(this.target.y - this.value.y) < 0.0006 &&
      this.speed < 0.004
    );
  }
}

class Kick {
  constructor() {
    this.amount = { x: 0, y: 0 };
    this.life = 0;
  }
  fire(v, gain = 2.6) {
    if (Math.hypot(v.x, v.y) < 0.002) return;
    this.amount = { x: v.x * gain, y: v.y * gain };
    this.life = 1;
  }
  step() {
    if (this.life <= 0) return { x: 0, y: 0 };
    this.life = Math.max(0, this.life - 0.035);
    const e = Math.sin(this.life * Math.PI) * this.life;
    return { x: this.amount.x * e, y: this.amount.y * e };
  }
  get active() {
    return this.life > 0;
  }
}

class Orientation {
  constructor() {
    this.base = null;
    this.range = 22;
  }
  read(e) {
    if (e.beta == null || e.gamma == null) return null;
    if (!this.base) {
      this.base = { beta: e.beta, gamma: e.gamma };
      return { x: 0, y: 0 };
    }
    return {
      x: clamp((e.gamma - this.base.gamma) / this.range),
      y: clamp((e.beta - this.base.beta) / this.range),
    };
  }
}

function applyFoil(card) {
  const s = card.style;
  s.setProperty("--tile-src", PORTRAIT);
  s.setProperty("--body-grad", `linear-gradient(115deg, ${BODY.join(", ")})`);
  s.setProperty("--tile-dark", TILE[0]);
  s.setProperty("--tile-light", TILE[1]);
  s.setProperty("--glare-o", String(FOIL.glare));
  for (let i = 0; i < LAYER_SLOTS; i++) {
    const n = `--l${i + 1}`;
    const L = FOIL.layers[i];
    s.setProperty(`${n}-img`, L.img);
    s.setProperty(`${n}-size`, L.size);
    s.setProperty(`${n}-bgblend`, L.bgBlend || "normal");
    s.setProperty(`${n}-blend`, L.blend);
    s.setProperty(`${n}-filter`, L.filter);
  }
}

function applyFrame(card, tilt, sheet, motion) {
  const { x, y } = tilt;
  const s = card.style;
  s.setProperty("--rx", `${(-y * MAX_TILT).toFixed(2)}deg`);
  s.setProperty("--ry", `${(x * MAX_TILT).toFixed(2)}deg`);

  const p = FOIL.parallax;
  for (let i = 0; i < LAYER_SLOTS; i++) {
    const t = p * FOIL.layers[i].rate;
    const n = `--l${i + 1}`;
    s.setProperty(`${n}-x`, `${adjust(sheet.x, -1, 1, 50 - t * 100, 50 + t * 100).toFixed(1)}%`);
    s.setProperty(`${n}-y`, `${adjust(sheet.y, -1, 1, 50 - t * 100, 50 + t * 100).toFixed(1)}%`);
  }

  const off = Math.min(1, Math.hypot(x, y));
  s.setProperty("--off", off.toFixed(3));

  // The balls come up only once the card is tilted past a third.
  const softOff = Math.min(1, Math.hypot(sheet.x, sheet.y));
  const HEART_FROM = 0.34;
  const r = clamp((softOff - HEART_FROM) / (1 - HEART_FROM), 0, 1);
  s.setProperty("--reveal", (r * r * (3 - 2 * r) * 0.9).toFixed(3));
  const ang = Math.atan2(sheet.y, sheet.x) * (180 / Math.PI);
  s.setProperty("--reveal-angle", `${(ang + 90).toFixed(0)}deg`);
  s.setProperty("--reveal-x", `${adjust(sheet.x, -1, 1, 78, 22).toFixed(1)}%`);
  s.setProperty("--reveal-y", `${adjust(sheet.y, -1, 1, 78, 22).toFixed(1)}%`);

  // One angle where the foil lines up with the light and runs brighter.
  const SPOT = { x: -0.42, y: -0.36 };
  const hit = Math.max(0, 1 - Math.hypot(sheet.x - SPOT.x, sheet.y - SPOT.y) / 0.34);
  const spot = hit * hit * (3 - 2 * hit);
  const time = motion.time || 0;
  const breath = 0.5 + 0.5 * Math.sin(time * 0.5) * Math.cos(time * 0.31);
  for (let i = 0; i < LAYER_SLOTS; i++) {
    const L = FOIL.layers[i];
    let o = Math.max(0, L.base + off * L.gain * (FOIL.bloom / 0.5));
    o *= 1 + spot * 0.85;
    o *= 0.94 + breath * 0.06;
    s.setProperty(`--l${i + 1}-o`, Math.min(1, o).toFixed(3));
  }

  s.setProperty("--gx", `${adjust(x, -1, 1, 12, 88).toFixed(1)}%`);
  s.setProperty("--gy", `${adjust(y, -1, 1, 12, 88).toFixed(1)}%`);
  s.setProperty("--tile-x", `${adjust(sheet.x, -1, 1, 58, 42).toFixed(1)}%`);

  const FLIP_FROM = 0.52;
  const flip = clamp((softOff - FLIP_FROM) / (1 - FLIP_FROM), 0, 1);
  s.setProperty("--tile-invert", flip.toFixed(3));
  s.setProperty("--tile-sweep-angle", `${(ang + 90).toFixed(0)}deg`);

  const speed = motion.speed || 0;
  const vel = motion.velocity || { x: 0, y: 0 };
  if (Math.hypot(vel.x, vel.y) > 0.0001) {
    s.setProperty("--smear-angle", `${(Math.atan2(vel.y, vel.x) * (180 / Math.PI)).toFixed(0)}deg`);
  }
  s.setProperty("--smear", (Math.min(1, speed) * 0.8).toFixed(3));

  s.setProperty("--emboss-x", `${(-x * 0.9).toFixed(2)}px`);
  s.setProperty("--emboss-y", `${(-y * 0.9).toFixed(2)}px`);
  s.setProperty("--edge-l", Math.max(0, -x).toFixed(3));
  s.setProperty("--edge-r", Math.max(0, x).toFixed(3));
  s.setProperty("--edge-t", Math.max(0, -y).toFixed(3));
  s.setProperty("--edge-b", Math.max(0, y).toFixed(3));
}

function injectCss() {
  if (document.getElementById("ox-holo-css")) return;
  const st = document.createElement("style");
  st.id = "ox-holo-css";
  st.textContent = CSS;
  document.head.appendChild(st);
}

function esc(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
}

export function mount(el, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const reduced =
    opts.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  injectCss();

  const host = document.createElement("div");
  host.className = "ox-holo";
  host.setAttribute("role", "img");
  host.setAttribute(
    "aria-label",
    `An example Orbe identity card for a made up creator, ${o.name}, ${o.since}, ${o.stats.join(", ")}. Its foil surface tilts and catches the light as the pointer moves across it.`,
  );
  host.innerHTML = `
    <div class="ox-holo-card">
      <div class="ox-holo-body"></div>
      <div class="ox-holo-pattern"></div>
      <div class="ox-holo-pattern-lit"></div>
      <div class="ox-holo-foil"></div>
      <div class="ox-holo-foil-b"></div>
      <div class="ox-holo-foil-c"></div>
      <div class="ox-holo-smear"></div>
      <div class="ox-holo-noise"></div>
      <div class="ox-holo-glare"></div>
      <div class="ox-holo-sheen"></div>
      <div class="ox-holo-content">
        <div class="ox-holo-text">
          <p class="ox-holo-mark"><i></i>orbe</p>
          <p class="ox-holo-name">${esc(o.name)}</p>
          <p class="ox-holo-since">${esc(o.since)}</p>
          <p class="ox-holo-stats">${o.stats.map((s) => `<span>${esc(s)}</span>`).join("")}</p>
        </div>
        <div class="ox-holo-right">
          <p class="ox-holo-label">${esc(o.label)}</p>
          <div class="ox-holo-tile">
            <div class="ox-holo-tile-photo"></div>
            <div class="ox-holo-tile-neg"></div>
            <div class="ox-holo-tile-tone"></div>
            <div class="ox-holo-tile-duo"></div>
            <div class="ox-holo-tile-grain"></div>
            <div class="ox-holo-tile-gloss"></div>
          </div>
        </div>
      </div>
      <div class="ox-holo-edge"></div>
    </div>`;
  el.appendChild(host);
  const card = host.querySelector(".ox-holo-card");
  applyFoil(card);

  const tilt = new Follow(0.16);
  const sheet = new Follow(0.09);
  const kick = new Kick();
  const t0 = performance.now();

  // Reduced motion: one still frame, tilted enough to show the foil.
  if (reduced) {
    const still = { x: 0.62, y: -0.48 };
    applyFrame(card, still, still, { time: 0 });
    return {
      destroy() {
        host.remove();
      },
    };
  }

  let raf = 0;
  let running = false;
  let onScreen = false;
  let hidden = document.hidden;
  let idle = 0;
  let touched = false;
  let release = 1;
  let handoff = { x: 0, y: 0 };
  let grab = 1;
  let grabFrom = { x: 0, y: 0 };
  let aim = { x: 0, y: 0 };

  const frame = () => {
    raf = 0;
    if (!touched) {
      idle += 0.0042;
      const drift = { x: Math.sin(idle) * 0.28, y: Math.cos(idle * 0.73) * 0.2 };
      release = Math.min(1, release + 0.016);
      const k = release * release;
      tilt.target = {
        x: handoff.x + (drift.x - handoff.x) * k,
        y: handoff.y + (drift.y - handoff.y) * k,
      };
    } else {
      grab = Math.min(1, grab + 0.018);
      const k = grab * grab;
      tilt.target = {
        x: grabFrom.x + (aim.x - grabFrom.x) * k,
        y: grabFrom.y + (aim.y - grabFrom.y) * k,
      };
    }
    const kk = kick.step();
    if (kk.x || kk.y) tilt.target = { x: tilt.target.x + kk.x, y: tilt.target.y + kk.y };

    tilt.step();
    sheet.target = tilt.value;
    sheet.step();
    applyFrame(card, tilt.value, sheet.value, {
      speed: sheet.speed,
      velocity: sheet.velocity,
      time: (performance.now() - t0) / 1000,
    });

    if (running && (!touched || grab < 1 || kick.active || !tilt.settled || !sheet.settled)) {
      raf = requestAnimationFrame(frame);
    }
  };

  const wake = () => {
    if (!running || raf) return;
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const should = onScreen && !hidden;
    if (should === running) return;
    running = should;
    if (should) wake();
    else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const onPointer = (e) => {
    const r = host.getBoundingClientRect();
    aim = {
      x: clamp(((e.clientX - r.left) / r.width) * 2 - 1),
      y: clamp(((e.clientY - r.top) / r.height) * 2 - 1),
    };
    if (!touched) {
      touched = true;
      grabFrom = { x: tilt.value.x, y: tilt.value.y };
      grab = 0;
    }
    release = 0;
    wake();
  };
  const onLeave = () => {
    if (!touched) return;
    touched = false;
    handoff = { x: tilt.value.x, y: tilt.value.y };
    release = 0;
    grab = 1;
    kick.fire(tilt.velocity);
    wake();
  };

  const orient = new Orientation();
  let orientActive = false;
  const onOrient = (e) => {
    const v = orient.read(e);
    if (!v) return;
    orientActive = true;
    touched = true;
    grab = 1;
    aim = v;
    wake();
  };

  const io = new IntersectionObserver(
    (es) => {
      onScreen = es.some((e) => e.isIntersecting);
      sync();
    },
    { rootMargin: "200px" },
  );
  io.observe(host);
  const onVis = () => {
    hidden = document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVis);
  // The card is sized in container units, so a resize needs no work here;
  // the observer only nudges a sleeping loop to repaint.
  const ro = new ResizeObserver(() => wake());
  ro.observe(host);

  host.addEventListener("pointermove", onPointer);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointercancel", onLeave);
  host.addEventListener("pointerup", (e) => {
    if (e.pointerType === "touch" && !orientActive) onLeave();
  });
  window.addEventListener("deviceorientation", onOrient);

  return {
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
      host.remove();
    },
  };
}
