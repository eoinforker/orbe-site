/*
  Made-up artwork for the five made-up creators in examples.js: a thumbnail,
  a cover, a stream still, show art and a photograph, drawn here in flat
  colour so the card has a creator's own picture to frame. No real creator's
  work is used. Text inside uses system fonts, because an image drawn inside
  the card cannot reach the page's fonts.

  artwork(kind) returns { title, alt, svg, href }: href is a data: URI the card can embed.
*/

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
}
const f = (x) => Math.round(x * 10) / 10;

function fieldRecordings() {
  const w = 1600, h = 900, r = rng(11);
  const out = [];
  out.push(`<rect width="${w}" height="${h}" fill="#1e3836"/>`);
  out.push(`<rect y="600" width="${w}" height="300" fill="#29504b"/>`);
  out.push(`<path d="M0 560 C120 540 200 520 300 535 C420 552 520 500 640 515 C760 530 860 505 980 520 C1100 535 1240 500 1380 518 C1480 530 1560 520 1600 515 L1600 610 L0 610 Z" fill="#14302d"/>`);
  out.push(`<rect y="596" width="${w}" height="8" fill="#3d6b64"/>`);
  out.push(`<rect y="650" width="${w}" height="4" fill="#356059"/><rect x="200" y="700" width="700" height="3" fill="#356059"/><rect x="900" y="760" width="560" height="3" fill="#356059"/>`);
  for (let i = 0; i < 90; i++) {
    const x = r() * w;
    const top = 330 + r() * 250;
    const lean = (r() - 0.5) * 80;
    const sw = 3 + r() * 5;
    out.push(`<path d="M${f(x)} ${h} Q${f(x + lean * 0.3)} ${f((top + h) / 2)} ${f(x + lean)} ${f(top)}" stroke="#0d201e" stroke-width="${f(sw)}" fill="none" stroke-linecap="round"/>`);
    if (r() < 0.35) out.push(`<rect x="${f(x + lean - 7)}" y="${f(top - 6)}" width="14" height="54" rx="7" fill="#4a3424" transform="rotate(${f(lean / 6)} ${f(x + lean)} ${f(top + 20)})"/>`);
  }
  // A boom pole and a furry windshield, coming in from the right.
  out.push(`<path d="M1620 70 L1120 400" stroke="#0a0a0a" stroke-width="16" stroke-linecap="round"/>`);
  const cx = 1060, cy = 432, pts = [];
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    const k = a % 2 ? 1 : 1.12 + r() * 0.08;
    pts.push(`${f(cx + Math.cos(t) * 128 * k)} ${f(cy + Math.sin(t) * 58 * k)}`);
  }
  out.push(`<path d="M${pts.join(" L")} Z" fill="#c4b494" transform="rotate(-33 ${cx} ${cy})"/>`);
  out.push(`<text x="86" y="230" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="170" letter-spacing="-6" fill="#f3ecd8">THE MARSH</text>`);
  out.push(`<text x="86" y="386" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="170" letter-spacing="-6" fill="#e9c45a">AT 4AM</text>`);
  return { w, h, body: out.join("") };
}

function marginNotes() {
  const w = 1456, h = 816;
  const out = [];
  out.push(`<rect width="${w}" height="${h}" fill="#2b3f33"/>`);
  out.push(`<g transform="rotate(-5 700 420)">`);
  out.push(`<rect x="360" y="70" width="620" height="800" fill="#f1eadb"/>`);
  for (let i = 0; i < 17; i++) {
    const len = i % 6 === 5 ? 250 : 400 - ((i * 37) % 70);
    out.push(`<rect x="470" y="${150 + i * 38}" width="${len}" height="11" rx="2" fill="#b9b09f"/>`);
  }
  out.push(`<path d="M440 150 L440 800" stroke="#c4432a" stroke-width="3"/>`);
  out.push(`<path d="M392 300 c10 -16 22 -14 26 0 c4 14 -12 22 -18 10 M388 420 l30 0 M394 440 l20 0" stroke="#c4432a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  out.push(`<path d="M470 382 L840 382" stroke="#c4432a" stroke-width="5" stroke-linecap="round"/>`);
  out.push(`</g>`);
  out.push(`<g transform="rotate(28 1140 520)"><rect x="1060" y="300" width="40" height="440" fill="#e3b532"/><rect x="1060" y="300" width="40" height="40" fill="#d58a7a"/><path d="M1060 740 L1080 800 L1100 740 Z" fill="#e9d2a8"/><path d="M1074 782 L1080 800 L1086 782 Z" fill="#2a2a2a"/></g>`);
  out.push(`<circle cx="1250" cy="180" r="118" fill="#e8e2d4"/><circle cx="1250" cy="180" r="82" fill="#5b3b28"/><circle cx="1250" cy="180" r="82" fill="none" stroke="#7a5238" stroke-width="10"/>`);
  return { w, h, body: out.join("") };
}

function nightShift() {
  const w = 1600, h = 900, r = rng(5);
  const out = [];
  out.push(`<rect width="${w}" height="${h}" fill="#0f1828"/>`);
  out.push(`<rect x="90" y="90" width="560" height="520" fill="#16243a"/>`);
  for (let i = 0; i < 9; i++) {
    const bx = 90 + i * 64, bh = 140 + r() * 260;
    out.push(`<rect x="${bx}" y="${f(610 - bh)}" width="58" height="${f(bh)}" fill="#22334f"/>`);
    for (let j = 0; j < 12; j++) if (r() < 0.32) out.push(`<rect x="${f(bx + 8 + (j % 3) * 16)}" y="${f(610 - bh + 14 + Math.floor(j / 3) * 26)}" width="9" height="12" fill="#f0c04c"/>`);
  }
  out.push(`<path d="M90 90 h560 v520 h-560 Z M366 90 v520 M90 350 h560" stroke="#2e3b50" stroke-width="16" fill="none"/>`);
  out.push(`<rect y="690" width="${w}" height="210" fill="#2a1f17"/>`);
  out.push(`<rect x="820" y="250" width="640" height="380" rx="10" fill="#0a0d12"/>`);
  out.push(`<rect x="840" y="270" width="600" height="340" fill="#3e7f94"/>`);
  out.push(`<path d="M840 520 L960 420 L1040 480 L1160 360 L1300 500 L1440 430 L1440 610 L840 610 Z" fill="#245566"/>`);
  out.push(`<path d="M840 560 L1440 560 L1440 610 L840 610 Z" fill="#183c49"/>`);
  out.push(`<rect x="1110" y="630" width="60" height="60" fill="#0a0d12"/>`);
  out.push(`<path d="M940 900 C950 760 1020 720 1110 712 C1200 720 1270 760 1280 900 Z" fill="#06080b"/>`);
  out.push(`<circle cx="1110" cy="640" r="78" fill="#06080b"/>`);
  out.push(`<path d="M1024 650 C1024 540 1196 540 1196 650" stroke="#c9543a" stroke-width="18" fill="none"/>`);
  out.push(`<rect x="1004" y="618" width="34" height="70" rx="14" fill="#c9543a"/><rect x="1182" y="618" width="34" height="70" rx="14" fill="#c9543a"/>`);
  out.push(`<text x="90" y="810" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="150" letter-spacing="-5" fill="#f0c04c">NIGHT 212</text>`);
  return { w, h, body: out.join("") };
}

function longTable() {
  const w = 1000, h = 1000;
  const out = [];
  out.push(`<rect width="${w}" height="${h}" fill="#e7dac2"/>`);
  out.push(`<rect x="330" y="0" width="340" height="${h}" fill="#8b5a39"/>`);
  for (let i = 0; i < 4; i++) {
    const y = 300 + i * 190;
    for (const x of [400, 600]) {
      out.push(`<circle cx="${x}" cy="${y}" r="62" fill="#f6f1e6"/><circle cx="${x}" cy="${y}" r="40" fill="none" stroke="#e1d6c2" stroke-width="5"/>`);
      out.push(`<circle cx="${x === 400 ? 470 : 530}" cy="${y - 70}" r="16" fill="none" stroke="#f6f1e6" stroke-width="5"/>`);
    }
  }
  out.push(`<circle cx="500" cy="395" r="24" fill="#e3742d"/><circle cx="530" cy="415" r="22" fill="#e3742d"/><circle cx="478" cy="420" r="20" fill="#d9662a"/>`);
  out.push(`<rect x="0" y="0" width="${w}" height="210" fill="#2b2119"/>`);
  out.push(`<text x="500" y="138" text-anchor="middle" font-family="Georgia, serif" font-size="96" letter-spacing="-2" fill="#f1e6d0">The Long Table</text>`);
  return { w, h, body: out.join("") };
}

function lowTide() {
  const w = 1500, h = 1000, r = rng(3);
  const out = [];
  out.push(`<rect width="${w}" height="${h}" fill="#cfd3cc"/>`);
  out.push(`<path d="M0 360 L180 330 C260 300 330 250 420 262 C520 276 560 330 640 345 L1500 352 L1500 380 L0 380 Z" fill="#59625c"/>`);
  out.push(`<rect y="372" width="${w}" height="28" fill="#93a4a2"/>`);
  out.push(`<rect y="398" width="${w}" height="602" fill="#bba788"/>`);
  out.push(`<path d="M0 470 C300 440 520 520 760 486 C1000 452 1220 520 1500 470 L1500 540 C1220 590 1000 520 760 556 C520 590 300 512 0 548 Z" fill="#a9bab6"/>`);
  out.push(`<path d="M200 760 C420 700 520 820 760 780 C980 744 1100 860 1380 800 L1500 830 L1500 900 C1200 940 980 820 760 870 C520 920 380 810 120 860 Z" fill="#aebfba"/>`);
  for (let i = 0; i < 26; i++) {
    const y = 600 + i * 15 + r() * 6, x = r() * 900;
    out.push(`<path d="M${f(x)} ${f(y)} q60 -8 120 0 t120 0" stroke="#a48f6e" stroke-width="3" fill="none"/>`);
  }
  out.push(`<rect x="1040" y="560" width="14" height="70" rx="6" fill="#26282a"/><circle cx="1047" cy="548" r="11" fill="#26282a"/>`);
  out.push(`<rect x="1040" y="634" width="14" height="50" rx="6" fill="#26282a" opacity="0.25"/>`);
  return { w, h, body: out.join("") };
}


const DRAW = {
  channel: { draw: fieldRecordings, title: "The marsh at 4am", alt: "A reed bed at dusk with a boom microphone, titled The marsh at 4am" },
  newsletter: { draw: marginNotes, title: "On keeping a commonplace book", alt: "A page of notes with a pencil and a cup of coffee on a green desk" },
  stream: { draw: nightShift, title: "Night 212", alt: "A streamer in headphones at a desk at night, titled Night 212" },
  podcast: { draw: longTable, title: "Episode 61: Bread", alt: "Show art for The Long Table: a long table laid with plates, seen from above" },
  portfolio: { draw: lowTide, title: "Camber, low water", alt: "Tidal sand flats with a lone figure and a headland" },
};

function toBase64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const CACHE = {};
export function artwork(kind) {
  if (CACHE[kind]) return CACHE[kind];
  const d = DRAW[kind];
  if (!d) return null;
  const a = d.draw();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}" preserveAspectRatio="xMidYMid slice">${a.body}</svg>`;
  return (CACHE[kind] = { title: d.title, alt: d.alt, svg, href: `data:image/svg+xml;base64,${toBase64(svg)}` });
}
