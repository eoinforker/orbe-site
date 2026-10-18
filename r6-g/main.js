import { example, ORDER, CARD_EXAMPLE_LINE, benchmark, mathsFor } from "../assets/r5/examples.js";
import { renderCard } from "../assets/r5/card.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";

/* ---------------------------------------------------------------- painter
   Every picture on the page is painted here, stroke by stroke: tapered
   ribbons laid in layers (sky, far hills, tree line, field, grass), then
   roughened and dry-brushed by SVG turbulence. Nothing is an image file. */

/* The brand palettes paint the archive's own pictures (hero and close); a creator's artwork keeps its own colours. */
const HERO = {
  blue: { sky: ["#9EE9FB", "#B6F0FC", "#86DDF5", "#A9ECFA"], streak: ["#F4F8F2", "#1F4BFF"], far: ["#1F4BFF", "#3E6BFF", "#5FC3E0"], trees: ["#1E2410", "#2C3316", "#161B0C", "#3C4219"], treeLit: ["#B98A35", "#D9B656"], field: ["#C9B04E", "#B99A45", "#D8BC64", "#8E9A4A", "#E1CB7E"], grass: ["#EED56A", "#F4E7A8", "#E3C04F"], low: ["#7E8A42", "#E9D9B8", "#1F4BFF"] },
  pink: { sky: ["#F2879E", "#F49DB0", "#EE7A93", "#F6B3C1"], streak: ["#FBE3E6", "#F7EEDF"], far: ["#4F7F62", "#F6B3C1", "#2F5A44"], trees: ["#1A2414", "#25301B", "#121A0E", "#33401F"], treeLit: ["#E9B44C", "#F6B3C1"], field: ["#8EA35B", "#A3AE62", "#C6B26A", "#6F8A4A", "#D8C27A"], grass: ["#F6D3DA", "#EFC85A", "#FBEFC6"], low: ["#5D7340", "#F2879E", "#2F3A1A"] },
};
let PALETTE = "blue";

const SCHEMES = {
  // The marsh at 4am: coral dawn, a cold blue band, black-green trees, ochre reeds
  channel: { sky: ["#8DBFE2", "#A7CFEA", "#74AEDA", "#B9D8EC"], streak: ["#F2DCC8", "#F7EEDF"], far: ["#4D9AD0", "#6FB0C9", "#3F8C86"], trees: ["#262B12", "#33381A", "#1C200E", "#454719"], treeLit: ["#B98A35", "#D3A447"], field: ["#C9A84C", "#B99A45", "#D8BC64", "#8E9A4A", "#E1CB7E"], grass: ["#EED56A", "#E3C04F", "#F5E6A6"], low: ["#7E8A42", "#E9D9B8", "#3A3F18"] },
  // On keeping a commonplace book: high blue, pink meadow
  newsletter: { sky: ["#3E95D8", "#2F86CF", "#5AA8E0", "#2A7BC4"], streak: ["#CFE4F4", "#F4F1EA"], far: ["#E9A08E", "#D98D7A"], trees: ["#24301A", "#30381B", "#1B2412"], treeLit: ["#B98C3B", "#D3A447"], field: ["#E7A58F", "#E8B4A0", "#D9907B", "#8EA35B", "#C6B26A"], grass: ["#F0D46A", "#E6C255", "#F6E2A0"], low: ["#2B3318", "#A39B87", "#F2E9DA"] },
  // Night 212: a late sky, one warm window of light
  stream: { sky: ["#1E3A44", "#24454F", "#173039", "#2C505A"], streak: ["#3E6A72", "#E9B86A"], far: ["#2D5B54", "#3D6B5F"], trees: ["#0F1A14", "#16221A", "#0B140F"], treeLit: ["#F0A64A", "#F6C46E"], field: ["#2E4A3A", "#355440", "#3E5E3E", "#5C6B3E"], grass: ["#C9A34A", "#E2BD5A", "#8E8A4E"], low: ["#0F1A14", "#425447", "#E9B86A"] },
  // Episode 61: Bread. Wheat, warm noon
  podcast: { sky: ["#F3D27A", "#EFC35E", "#F6DE98", "#E9B84E"], streak: ["#FBEFC6", "#F2A26C"], far: ["#7FA66A", "#95B07A"], trees: ["#33391A", "#3E4520", "#262B12"], treeLit: ["#C67A2E", "#DA9A3E"], field: ["#E2A845", "#D8973A", "#EAC160", "#C98A36", "#B97E35"], grass: ["#F5DC86", "#F0C860", "#FAEBB8"], low: ["#7A5A2A", "#E9D8B0", "#33391A"] },
  // Camber, low water: grey-blue sky, wet sand, a teal channel
  portfolio: { sky: ["#B9CAD0", "#A9BFC8", "#C9D5D6", "#9DB4BF"], streak: ["#E7ECE8", "#F2C9A8"], far: ["#4E8A8E", "#3F7D84", "#6FA3A2"], trees: ["#2E3B34", "#3A4A40", "#26322C"], treeLit: ["#B48A5A", "#C9A270"], field: ["#CDB892", "#D8C6A0", "#BDA77E", "#7FA6A6", "#E2D5B6"], grass: ["#EADDBA", "#D8C092", "#F3EBD4"], low: ["#5B6A62", "#EFE9DA", "#2E3B34"] },
};

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

/* A tapered, slightly wavering ribbon from (x0,y0) to (x1,y1). */
function ribbon(R, x0, y0, x1, y1, w, bend = 0) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (x0 + x1) / 2 + nx * bend, cy = (y0 + y1) / 2 + ny * bend;
  const N = Math.max(6, Math.min(26, Math.round(len / 18)));
  const top = [], bot = [];
  const startTaper = 0.2 + R() * 0.5, endTaper = 0.15 + R() * 0.4;
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const px = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const py = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const taper = Math.min(1, t / startTaper * 1.4 + 0.25, (1 - t) / endTaper * 1.2 + 0.2);
    const h = (w / 2) * taper * (0.82 + R() * 0.36);
    top.push([px + nx * h, py + ny * h]);
    bot.push([px - nx * h * (0.85 + R() * 0.3), py - ny * h * (0.85 + R() * 0.3)]);
  }
  const pts = top.concat(bot.reverse());
  return "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z";
}

let uid = 0;
function filters(svg, seed, s) {
  const id = "p" + ++uid;
  const defs = el("defs", {}, svg);
  // Brush: rough edges, then dry streaks that run along the stroke (horizontal or vertical)
  const mk = (name, fx, fy, scale, cut) => {
    const f = el("filter", { id: id + name, x: "-8%", y: "-8%", width: "116%", height: "116%", "color-interpolation-filters": "sRGB" }, defs);
    // two passes: a slow wobble for the hand, then a fine bite for the bristle edge
    el("feTurbulence", { type: "fractalNoise", baseFrequency: `${0.006 / s} ${0.018 / s}`, numOctaves: 2, seed, result: "w" }, f);
    el("feDisplacementMap", { in: "SourceGraphic", in2: "w", scale: 9 * s * scale, xChannelSelector: "R", yChannelSelector: "G", result: "r0" }, f);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: `${0.07 / s} ${0.16 / s}`, numOctaves: 3, seed: seed + 2, result: "w2" }, f);
    el("feDisplacementMap", { in: "r0", in2: "w2", scale: 10 * s, xChannelSelector: "R", yChannelSelector: "G", result: "r" }, f);
    // dry brush: long bristle gaps along the stroke, mostly near the edges of the paint
    el("feTurbulence", { type: "fractalNoise", baseFrequency: `${fx / s} ${fy / s}`, numOctaves: 3, seed: seed + 7, result: "n" }, f);
    el("feColorMatrix", { in: "n", type: "matrix", values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${cut} 0 0 0 ${0.4 - cut * 0.3}`, result: "m" }, f);
    el("feComposite", { in: "r", in2: "m", operator: "in" }, f);
    return `url(#${id + name})`;
  };
  const crayon = el("filter", { id: id + "c", x: "0", y: "0", width: "100%", height: "100%" }, defs);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.85, numOctaves: 2, seed: seed + 3, result: "g" }, crayon);
  el("feColorMatrix", { in: "g", type: "matrix", values: "0 0 0 0 0.14  0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 -1.6 1.0" }, crayon);
  return {
    h: mk("h", 0.005, 0.09, 1, 4.6),   // long horizontal drags
    v: mk("v", 0.16, 0.006, 0.7, 4.0), // vertical flicks
    d: mk("d", 0.05, 0.05, 1.2, 2.4),  // dabs, for foliage
    grain: `url(#${id}c)`,
  };
}

function paint(svg, schemeKey, seed = 3) {
  const box = svg.getBoundingClientRect();
  const W = Math.max(200, Math.round(box.width || 400)), H = Math.max(160, Math.round(box.height || 300));
  const key = `${schemeKey === "hero" ? PALETTE : schemeKey}:${W}x${H}:${seed}:${getComputedStyle(svg).getPropertyValue("--hz")}`;
  if (svg.dataset.painted === key) return;
  svg.dataset.painted = key;
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const S = schemeKey === "hero" ? HERO[PALETTE] : SCHEMES[schemeKey];
  const R = rng(seed * 977 + W);
  const s = Math.max(0.55, Math.min(1.6, Math.sqrt(W * H) / 560));
  const F = filters(svg, seed, s);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const layers = [];
  const layer = (filter, stage) => { const g = el("g", { filter, class: "layer", style: `--i:${stage}` }, svg); layers.push(g); return g; };
  const stroke = (g, fill, d, op = 1) => el("path", { d, fill, opacity: op }, g);

  const hzf = parseFloat(getComputedStyle(svg).getPropertyValue("--hz")) || 0.5;
  const hz = H * (hzf + R() * 0.04); // horizon
  el("rect", { width: W, height: H, fill: S.sky[0] }, svg);

  // Sky: long horizontal drags, layered
  let g = layer(F.h, 0);
  for (let i = 0; i < 18; i++) {
    const y = R() * hz * 1.05, w = Math.max(hz * (0.12 + R() * 0.22), 22);
    const x0 = -W * 0.2 + R() * W * 0.5, x1 = x0 + W * (0.5 + R() * 0.9);
    stroke(g, pick(S.sky), ribbon(R, x0, y, x1, y + (R() - 0.5) * H * 0.05, w, (R() - 0.5) * H * 0.04), 0.75 + R() * 0.25);
  }
  for (let i = 0; i < 7; i++) {
    const y = R() * hz * 0.95, w = Math.max(hz * (0.03 + R() * 0.06), 6);
    const x0 = R() * W * 0.8, x1 = x0 + W * (0.15 + R() * 0.4);
    stroke(g, pick(S.streak), ribbon(R, x0, y, x1, y - H * 0.01, w, H * 0.01), 0.55 + R() * 0.4);
  }

  // Ground wash under the field, unbrushed so no sky shows through it
  el("rect", { x: 0, y: hz + H * 0.015, width: W, height: H - hz, fill: S.field[1], class: "layer", style: "--i:1" }, svg);

  // Far band: hills and water at the horizon
  g = layer(F.h, 1);
  for (let i = 0; i < 9; i++) {
    const y = hz - H * (0.02 - R() * 0.06), w = H * (0.02 + R() * 0.05);
    const x0 = -W * 0.1 + R() * W * 0.6, x1 = x0 + W * (0.3 + R() * 0.7);
    stroke(g, pick(S.far), ribbon(R, x0, y, x1, y + (R() - 0.5) * H * 0.03, w, -H * 0.02), 0.85);
  }

  // Tree line: clusters of dabs, a few tall trees, lit edges
  g = layer(F.d, 2);
  const clusters = 3 + Math.floor(R() * 3);
  for (let c = 0; c < clusters; c++) {
    const cx = (c + 0.2 + R() * 0.6) / clusters * W, spread = W * (0.07 + R() * 0.12);
    const tall = Math.min(hz * 0.8, H * (0.08 + R() * (c % 2 ? 0.2 : 0.1)));
    for (let i = 0; i < 34; i++) {
      const x = cx + (R() - 0.5) * spread * 2;
      const fall = 1 - Math.abs(x - cx) / (spread * 1.1);
      const top = hz - tall * Math.max(0.15, fall) * (0.6 + R() * 0.5);
      const len = tall * (0.25 + R() * 0.45) + 6, ang = (R() - 0.5) * 1.2;
      stroke(g, pick(S.trees), ribbon(R, x, top + len, x + Math.sin(ang) * len, top, W * (0.02 + R() * 0.035) + 6), 0.95);
    }
    // the trunk mass down to the horizon
    stroke(g, pick(S.trees), ribbon(R, cx - spread, hz + H * 0.02, cx + spread, hz + H * 0.01, H * (0.04 + R() * 0.04), -H * 0.04));
    for (let i = 0; i < 5; i++) {
      const x = cx + (R() - 0.2) * spread, y = hz - tall * (0.3 + R() * 0.5);
      stroke(g, pick(S.treeLit), ribbon(R, x, y, x + W * 0.015, y - H * 0.025, W * 0.008 + H * 0.006), 0.8);
    }
  }

  // Field: wide horizontal bands down to the foot, over a ground wash
  g = layer(F.h, 3);
  for (let i = 0; i < 11; i++) {
    const t = R(), y = hz + (H - hz) * (t * 1.05), w = (H - hz) * (0.18 + R() * 0.32);
    const x0 = -W * 0.3 + R() * W * 0.6, x1 = x0 + W * (0.6 + R() * 0.9);
    const fill = t > 0.72 && R() > 0.4 ? pick(S.low) : pick(S.field);
    stroke(g, fill, ribbon(R, x0, y, x1, y + (R() - 0.5) * H * 0.04, w, (R() - 0.5) * H * 0.05), 0.8 + R() * 0.2);
  }

  // Grass: vertical flicks in the foreground, the last thing the brush does
  g = layer(F.v, 4);
  const n = Math.round(W / 9);
  for (let i = 0; i < n; i++) {
    const x = R() * W, base = H * (0.82 + R() * 0.2), len = (H - hz) * (0.12 + R() * 0.38);
    if (R() < 0.45) continue;
    stroke(g, pick(S.grass), ribbon(R, x, base, x + (R() - 0.3) * W * 0.04, base - len, W * 0.006 + 4 + R() * 5), 0.75 + R() * 0.25);
  }

  // Crayon grain over everything
  el("rect", { width: W, height: H, filter: F.grain, opacity: 0.55, class: "grain" }, svg);

  if (!reduce) {
    svg.classList.remove("painted");
    svg.classList.add("painting-in");
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("painted")));
  }
}

const SEEDS = { channel: 3, newsletter: 11, stream: 5, podcast: 8, portfolio: 21, hero: 43 };
function paintAll() {
  for (const svg of $$("svg[data-paint]")) {
    if (!svg.getClientRects().length) continue;
    const k = svg.dataset.scheme;
    paint(svg, k, (SEEDS[k] || 3) + (svg.dataset.paint === "close" ? 17 : 0));
  }
}

/* ---------------------------------------------------------------- the rating */

const pct = (v) => (v < 0.02 ? (v * 100).toFixed(1) : Math.round(v * 100)) + "%";
const SINGULAR = { channels: "channel", newsletters: "newsletter", streamers: "streamer", shows: "show", photographers: "photographer" };
const PLATFORM = { youtube: "YouTube channel", substack: "Substack newsletter", twitch: "Twitch stream", podcast: "Podcast", photography: "Photography" };
const CODE = { channel: "01", newsletter: "02", stream: "03", podcast: "04", portfolio: "05" };

function fill(kind, animate) {
  const e = example(kind);
  const b = benchmark(kind);
  const i = b.rows.findIndex((r) => r.key === b.example);
  const here = b.rows[i], prev = b.rows[i - 1], next = b.rows[i + 1];
  const noun = e.sizeBand.replace(here.label, "").trim();

  $("[data-band-here]").textContent = e.sizeBand;
  $("[data-band-prev]").textContent = prev ? `${prev.label} ${noun}` : "";
  $("[data-band-next]").textContent = next ? `${next.label} ${noun}` : "";
  $(".peek-a").hidden = !prev; $(".peek-b").hidden = !next;

  $("[data-nb-title]").textContent = `The typical ${SINGULAR[e.peers] || e.peers} this size`;
  $("[data-nb-value]").textContent = `Reach ${pct(here.value)} · rating 0.00, by definition`;

  $("[data-artefact]").textContent = `artefact: ${CODE[kind]}-${e.handle.slice(1, 4)} [${e.card.workTitle.toLowerCase()}]`;
  $("[data-name]").textContent = e.name;
  $("[data-who]").textContent = `${e.handle} · ${PLATFORM[e.platform] || e.label}`;
  $("[data-band]").textContent = e.band;
  $("[data-tip]").innerHTML = `Measured against <b></b>`;
  $("[data-tip] b").textContent = e.sizeBand;
  $("[data-typical]").textContent = `Zero is typical for ${e.peers} this size.`;

  const ol = $("[data-parts]");
  ol.replaceChildren(...e.parts.map((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="p-name"></span><span class="p-val"></span><span class="p-bar"><svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path class="track" d="M0,5 L100,5"/><path class="mark" d="M0,5 L${p.score},5"/></svg></span><span class="p-beat">Beats ${p.score} in 100</span>`;
    li.querySelector(".p-name").textContent = p.name;
    li.querySelector(".p-val").textContent = p.value;
    li.style.setProperty("--s", p.score / 100);
    return li;
  }));

  const art = $(".card-art svg");
  art.dataset.scheme = kind;
  paint(art, kind, SEEDS[kind]);

  $("[data-maths]").replaceChildren(...mathsFor(kind).map((m) => {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><b></b>`;
    li.querySelector("span").textContent = m.name;
    li.querySelector("b").textContent = m.weight + "%";
    li.title = m.what;
    return li;
  }));

  drawCard(kind);
  countTo(e.rating, animate);
}

function drawCard(kind) {
  const e = example(kind), c = e.card;
  const holder = $("[data-card]");
  try {
    holder.innerHTML = renderCard(e.result, {
      moment: "rating", format: "square", theme: PALETTE === "pink" ? "pink" : "blue", handle: e.handle, name: e.name, note: CARD_EXAMPLE_LINE, idPrefix: "g",
      works: c.works, personalBest: c.personalBest, season: c.season, sizeUp: c.sizeUp, workTitle: c.workTitle, image: c.image,
    });
    const svg = holder.querySelector("svg");
    if (svg) { svg.removeAttribute("width"); svg.removeAttribute("height"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `${e.name}'s Orbe card: ${e.signed}, ${e.band}`); }
  } catch { holder.textContent = ""; }
  $("[data-card-cap]").textContent = `artefact ${CODE[kind]} [${e.name.toLowerCase()}, square card]`;
}

let raf;
function countTo(target, animate) {
  const out = $("[data-rating]");
  const fmt = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);
  cancelAnimationFrame(raf);
  if (!animate || reduce) { out.textContent = fmt(target); return; }
  const t0 = performance.now(), dur = 1100;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
    out.textContent = fmt(target * ease);
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  out.textContent = fmt(0);
  raf = requestAnimationFrame(tick);
}

/* The signature: the drawer is shut until you reach it; then your size's folder lifts and opens to your card. */
const drawer = $("[data-drawer]");
let current = "channel", opened = false;

function open() {
  if (opened) return;
  opened = true;
  drawer.classList.add("open");
  countTo(example(current).rating, true);
}

function switchKind(kind) {
  if (kind === current) return;
  current = kind;
  for (const t of $$(".kinds [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.kind === kind));
  if (reduce || !opened) { fill(kind, false); return; }
  drawer.classList.remove("open");
  drawer.classList.add("closing");
  setTimeout(() => {
    fill(kind, false);
    drawer.classList.remove("closing");
    void drawer.offsetWidth;
    drawer.classList.add("open");
    countTo(example(kind).rating, true);
  }, 420);
}

/* ---------------------------------------------------------------- boot */

function hero() {
  const e = example("channel");
  $("[data-w-title]").textContent = `[${e.card.workTitle.toLowerCase()}]`;
  $("[data-w-name]").textContent = `${e.name}, ${e.handle}`;
  $("[data-w-rating]").textContent = e.signed;
  $("[data-w-band]").textContent = e.band;
  $("[data-w-line]").textContent = `Rated against ${e.peers} with ${e.sizeBand}. Independently calculated by Orbe.`;
}

function forms() {
  for (const f of $$("[data-reserve]")) {
    const note = $("[data-note]", f), kind = $("select", f), input = $("input", f);
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const h = cleanHandle(input.value);
      if (!h) { note.textContent = "Type the handle you'd like, and we'll file it for you."; input.focus(); return; }
      const k = kind.value;
      const res = await reserve({ handle: h, kind: k });
      if (res.ok) {
        const e = example(k);
        note.textContent = res.via === "api"
          ? `@${h} is filed under your name. Ratings open with YouTube: connect your channel to see yours. Here is how a ${e.word} your size is read.`
          : `Your email app has the request for @${h} written out. Send it and the handle is filed under your name. Here is how a ${e.word} your size is read.`;
        switchKind(k);
        setTimeout(() => $("#rating").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }), 900);
      } else if (res.reason === "taken") {
        note.textContent = `@${h} is already filed. Try another.`;
      }
    });
  }
}

/* The brand colour, for the founder to choose: Blue (fal) or Pink (TypeSafe). */
function setPalette(c, save) {
  if (c !== "blue" && c !== "pink") return;
  PALETTE = c;
  document.body.dataset.c = c;
  for (const b of $$(".palette button")) b.setAttribute("aria-pressed", String(b.dataset.c === c));
  if (save) { try { localStorage.setItem("orbe-r6g-c", c); } catch {} }
  paintAll();
  drawCard(current);
}
function palette() {
  let c = new URLSearchParams(location.search).get("c");
  if (!c) { try { c = localStorage.getItem("orbe-r6g-c"); } catch {} }
  setPalette(c || "blue", false);
  for (const b of $$(".palette button")) b.addEventListener("click", () => setPalette(b.dataset.c, true));
}

function boot() {
  mountWordmark($("[data-wordmark]"), { animate: !reduce });
  mountWordmark($("[data-wordmark-foot]"), { animate: false });
  $("[data-example-line]").textContent = CARD_EXAMPLE_LINE + " Every painting here is drawn in code.";
  hero();
  fill("channel", false);
  palette();
  forms();

  for (const t of $$(".kinds [role=tab]")) t.addEventListener("click", () => switchKind(t.dataset.kind));

  if (reduce || !("IntersectionObserver" in window)) { drawer.classList.add("open", "still"); opened = true; }
  else {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { open(); io.disconnect(); } }, { threshold: 0.28 });
    io.observe(drawer);
  }

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(paintAll, 250); });
  if (location.hash === "#open") open();
}

boot();
