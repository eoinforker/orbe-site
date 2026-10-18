/*
  creator-tiles: procedural creator work for the image sphere and the image galaxy.
  No photos and no people: podcast covers, video thumbnails, newsletter mastheads and
  stream cards, all with made up names, drawn on canvas in Orbe colours with a grain
  pass, returned as data URLs. Seeded, so a page draws the same set each visit.

  creatorTiles({ count, seed, size }) -> Promise<[{ url, w, h, kind, name }]>
*/

const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, serif';
const MONO = '"Commit Mono", ui-monospace, Menlo, monospace';

const C = {
  sky: "#9EE9FB", cobalt: "#1F4BFF", ink: "#141311", paper: "#F3F0E8", ember: "#FF5A1F",
  peony: "#F2879E", claret: "#6F1726", mist: "#D6F6FD", blush: "#FBD9E0", straw: "#EED56A",
  meadow: "#8E9A4A", water: "#4D9AD0", chalk: "#FBFAF6", lime: "#C6F432", mint: "#9FF0C8",
};

// bg, ink, accent. Brand first, a few vivid extras. No purples.
const PALETTES = [
  [C.cobalt, C.chalk, C.sky],
  [C.sky, C.ink, C.ember],
  [C.ember, C.ink, C.paper],
  [C.peony, C.claret, C.chalk],
  [C.claret, C.blush, C.peony],
  [C.straw, C.ink, C.cobalt],
  [C.paper, C.ink, C.ember],
  [C.ink, C.paper, C.lime],
  [C.meadow, C.chalk, C.straw],
  [C.water, C.chalk, C.ink],
  [C.lime, C.ink, C.cobalt],
  [C.mint, C.ink, C.ember],
  [C.blush, C.claret, C.ember],
  [C.mist, C.cobalt, C.ember],
];

const PODCASTS = ["Half Volume", "Slow Money Club", "Kettle Talk", "Night Shift Radio", "The Long Edit", "Two Mics In", "Small Rooms", "Pocket Almanac"];
const THUMBS = ["i tried it for 30 days", "we rebuilt the studio", "the honest budget", "what a year pays", "one take only", "first paid sponsor", "allotment vlog no. 9", "cheap lens, big look"];
const LETTERS = ["Tuesday Letters", "The Crumb", "Second Draft", "Margins", "Small Batch", "The Fold", "Postscript", "Field Day"];
const STREAMS = ["cosy build night", "speedrun sundays", "sketch with me", "late kitchen", "jam session", "map drawing"];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grain(ctx, w, h, rand, amt) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function fitText(ctx, text, font, maxW, start, min) {
  let s = start;
  for (; s > min; s -= 1) {
    ctx.font = font.replace("%", s + "px");
    if (ctx.measureText(text).width <= maxW) break;
  }
  return s;
}

function wrap(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function podcast(ctx, w, h, p, name, rand) {
  const [bg, ink, acc] = p;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // a speaker cone of rings, off centre
  const cx = w * (0.55 + rand() * 0.25), cy = h * (0.35 + rand() * 0.2);
  ctx.strokeStyle = acc;
  for (let r = w * 0.06, i = 0; r < w * 0.9; r += w * 0.07, i++) {
    ctx.lineWidth = w * (i % 2 ? 0.012 : 0.03);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = acc;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.07, 0, Math.PI * 2); ctx.fill();
  // title block
  ctx.fillStyle = bg; ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = ink;
  const s = fitText(ctx, name, `italic 600 % ${SERIF}`, w * 0.86, w * 0.16, 10);
  ctx.font = `italic 600 ${s}px ${SERIF}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, w * 0.07, h * 0.8);
  ctx.font = `500 ${Math.round(w * 0.045)}px ${MONO}`;
  ctx.fillText(`EP. ${Math.floor(rand() * 180) + 3}`, w * 0.07, h * 0.92);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.floor(rand() * 50) + 18} MIN`, w * 0.93, h * 0.92);
  ctx.textAlign = "left";
}

function thumb(ctx, w, h, p, name, rand) {
  const [bg, ink, acc] = p;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // a split field and a big arrow, the thumbnail grammar without a face
  ctx.fillStyle = acc;
  ctx.fillRect(w * 0.62, 0, w * 0.38, h);
  ctx.save();
  ctx.translate(w * 0.81, h * 0.46);
  ctx.rotate(-0.5 + rand() * 0.3);
  ctx.fillStyle = ink;
  const a = h * 0.22;
  ctx.beginPath();
  ctx.moveTo(-a, -a * 0.25); ctx.lineTo(a * 0.2, -a * 0.25); ctx.lineTo(a * 0.2, -a * 0.7);
  ctx.lineTo(a, 0); ctx.lineTo(a * 0.2, a * 0.7); ctx.lineTo(a * 0.2, a * 0.25); ctx.lineTo(-a, a * 0.25);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = ink;
  ctx.font = `900 ${Math.round(h * 0.17)}px ${SANS}`;
  const lines = wrap(ctx, name.toUpperCase(), w * 0.56).slice(0, 3);
  lines.forEach((l, i) => ctx.fillText(l, w * 0.05, h * 0.27 + i * h * 0.18));
  // duration chip
  const t = `${Math.floor(rand() * 22) + 4}:${String(Math.floor(rand() * 60)).padStart(2, "0")}`;
  ctx.font = `600 ${Math.round(h * 0.07)}px ${MONO}`;
  const tw = ctx.measureText(t).width;
  ctx.fillStyle = C.ink;
  ctx.fillRect(w - tw - w * 0.06, h * 0.8, tw + w * 0.035, h * 0.12);
  ctx.fillStyle = C.chalk;
  ctx.fillText(t, w - tw - w * 0.042, h * 0.885);
}

function masthead(ctx, w, h, p, name, rand) {
  const [, , acc] = p;
  const paper = rand() > 0.5 ? C.paper : C.chalk;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.ink;
  const s = fitText(ctx, name, `600 % ${SERIF}`, w * 0.86, w * 0.17, 10);
  ctx.font = `600 ${s}px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText(name, w / 2, h * 0.14);
  ctx.font = `500 ${Math.round(w * 0.032)}px ${MONO}`;
  ctx.fillText(`NO. ${Math.floor(rand() * 240) + 12}  ·  SUNDAY POST`, w / 2, h * 0.205);
  ctx.textAlign = "left";
  ctx.fillRect(w * 0.07, h * 0.225, w * 0.86, Math.max(1, h * 0.004));
  ctx.fillRect(w * 0.07, h * 0.235, w * 0.86, Math.max(1, h * 0.002));
  // lead image: a block of colour with a sun or a hill
  ctx.fillStyle = acc;
  ctx.fillRect(w * 0.07, h * 0.27, w * 0.86, h * 0.33);
  ctx.fillStyle = p[0] === paper ? C.ink : p[0];
  ctx.beginPath(); ctx.arc(w * (0.3 + rand() * 0.4), h * 0.6, w * 0.24, Math.PI, 0); ctx.fill();
  // body lines
  ctx.fillStyle = "rgba(20,19,17,0.22)";
  for (let col = 0; col < 2; col++) {
    for (let i = 0; i < 8; i++) {
      const lw = w * (0.32 + (i === 7 ? -0.14 : rand() * 0.08));
      ctx.fillRect(w * 0.07 + col * w * 0.45, h * 0.65 + i * h * 0.04, Math.min(lw, w * 0.41), h * 0.014);
    }
  }
}

function stream(ctx, w, h, p, name, rand) {
  const bg = rand() > 0.5 ? C.ink : C.cobalt;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // a pixel skyline of chunky squares
  const q = Math.round(w / 16);
  for (let x = 0; x < w; x += q) {
    const top = h * (0.5 + rand() * 0.3);
    for (let y = Math.floor(top / q) * q; y < h; y += q) {
      ctx.fillStyle = rand() > 0.82 ? p[2] : (rand() > 0.5 ? "rgba(243,240,232,0.10)" : "rgba(243,240,232,0.04)");
      ctx.fillRect(x, y, q - 2, q - 2);
    }
  }
  ctx.fillStyle = C.ember;
  ctx.fillRect(w * 0.05, h * 0.08, w * 0.15, h * 0.11);
  ctx.fillStyle = C.chalk;
  ctx.font = `600 ${Math.round(h * 0.07)}px ${MONO}`;
  ctx.fillText("LIVE", w * 0.065, h * 0.165);
  ctx.font = `800 ${Math.round(h * 0.15)}px ${SANS}`;
  const lines = wrap(ctx, name, w * 0.86).slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, w * 0.05, h * 0.4 + i * h * 0.16));
}

const KINDS = [
  { kind: "podcast", ar: 1, draw: podcast, names: PODCASTS },
  { kind: "thumb", ar: 16 / 9, draw: thumb, names: THUMBS },
  { kind: "masthead", ar: 4 / 5, draw: masthead, names: LETTERS },
  { kind: "stream", ar: 16 / 10, draw: stream, names: STREAMS },
];

export async function creatorTiles({ count = 24, seed = 11, size = 320 } = {}) {
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load(`italic 600 40px ${SERIF}`),
      document.fonts.load(`600 40px ${SERIF}`),
      document.fonts.load(`900 40px ${SANS}`),
      document.fonts.load(`800 40px ${SANS}`),
      document.fonts.load(`600 40px ${MONO}`),
    ].map((p) => p.catch(() => {})));
  }
  const rand = rng(seed);
  const used = {};
  const out = [];
  for (let i = 0; i < count; i++) {
    const k = KINDS[i % KINDS.length];
    const n = used[k.kind] || 0;
    used[k.kind] = n + 1;
    const name = k.names[(n + Math.floor(seed)) % k.names.length];
    const p = PALETTES[Math.floor(rand() * PALETTES.length)];
    const w = k.ar >= 1 ? size : Math.round(size * k.ar);
    const h = k.ar >= 1 ? Math.round(size / k.ar) : size;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    k.draw(ctx, w, h, p, name, rand);
    grain(ctx, w, h, rand, 26);
    out.push({ url: c.toDataURL("image/jpeg", 0.86), w, h, kind: k.kind, name });
  }
  return out;
}
