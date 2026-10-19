/*
  Orbe pixel hero. A jar on a shelf holds the hundred creators your size, one
  glass marble each, sorted from the bottom up. Every marble you beat is solid
  Cobalt, every one ahead of you is Straw, and yours is Ember, filled to your
  score. The line across the middle is typical. The other kinds wait on the
  shelf in their own jars; a receipt shows what the rating was read from, and
  a ledger shows the only times Orbe is paid. Every figure is live from the
  Orbe engine, for a made-up creator.

  Motion explains once and stops: the marbles tick into the jar on load (200ms a
  tick, 12 ticks, 2.4s), and switching kind walks your marble to its new place
  a row a tick, turning the marbles it passes. Reduced motion paints the end.
*/
import { mountWordmark } from "../../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../../assets/r5/reserve.js";
import { example, ORDER } from "../../assets/r5/examples.js";
import { SELLER_FEE } from "../../assets/r5/terms.js";
import { feeTermsFor } from "../../assets/engine/sponsor/browser.js";
import { C, RGB, D, marble, drawJar, drawShelf, drawLid, drawMiniJar, drawReceipt, drawLedger, drawLabel, jarProfile, ICONS, ICON_KEYS } from "./assets/sprites.js";
import { crowd } from "./assets/creators.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const still = document.documentElement.classList.contains("still");

/* ---------------------------------------------------------------- the data */
const PEERS = { channel: "channels", newsletter: "newsletters", stream: "streams", podcast: "podcasts", portfolio: "photographers" };
const KINDS = { channel: "Channels", newsletter: "Newsletters", stream: "Streams", podcast: "Podcasts", portfolio: "Photographers" };
const CACHE = {};
function dataFor(kind) {
  if (CACHE[kind]) return CACHE[kind];
  const ex = example(kind);
  const beats = ex.result.parts.find((p) => p.key === "reach").score;
  return (CACHE[kind] = { kind, beats, handle: ex.handle, band: ex.sizeBand, signed: ex.signed, verdict: ex.band, parts: ex.parts, names: crowd(kind, ex.handle) });
}
/* The fees, from the engine's sponsorship terms and the published seller fee. */
const SPONSOR = `${feeTermsFor("direct").bps / 100} to ${feeTermsFor("network").bps / 100}%`;
const SALE = (() => { const m = SELLER_FEE.match(/\d+%/g) ?? []; return m.length ? `${m[0].replace("%", "")} to ${m[m.length - 1]}` : ""; })();

/* ---------------------------------------------------------------- the scene, in cells */
const IW = 110;               /* inside the jar: eleven marbles fit the row you are in */
const JW = IW + 6;            /* rim, glass and a cell of air each side */
const PITCH = 10;             /* a cell of air between rows */
const GAP = 4;                /* room for the typical line between row 5 and row 6 */
const HEAD = 7;               /* air above the top row */
const BODY = 2 * (4 * PITCH + D) + GAP + HEAD;
const JH = jarProfile(BODY).length;
const TOP = 16;               /* mouth, neck and shoulder rows above the body */
const SHELF = 7;
const ROWX = [1, 6, 0, 5, 1, 6, 0, 4, 1, 5]; /* each row's stagger, hand set so no two look alike */
const ROWH = 6;               /* one line of type on the receipt and ledger, in cells */

/* ---------------------------------------------------------------- state */
const hero = $(".hero");
const art = $(".art");
const canvas = $(".scene");
const ctx = canvas.getContext("2d");
const tip = $(".tip");
const typ = $(".typ");
const live = $('[data-b="live"]');
let L = null;
let kind = "channel";
let data = dataFor(kind);
let you = data.beats;         /* how many of the hundred sit below you */
const shown = new Array(101).fill(true);
let lit = null;               /* what the pointer is on: { t: "m", p }, { t: "typ" } or { t: "jar", k } */
let tipOn = false;
let ticking = false;
let placed = [];              /* marbles as drawn this frame */
let minis = [];               /* small jars as drawn this frame */

/* ---------------------------------------------------------------- marbles in the jar */
/* Position p runs 0 to 100 from the bottom; the marble at `b` is yours, and its
   row holds eleven. */
function marbles(b) {
  const out = [];
  const yr = Math.min(9, Math.floor(b / 10)), yc = b - yr * 10;
  for (let p = 0; p <= 100; p++) {
    let row, col;
    const k = p < b ? p : p - 1;
    if (p === b) { row = yr; col = yc; }
    else {
      row = Math.floor(k / 10); col = k % 10;
      if (row === yr && col >= yc) col += 1;
    }
    const stagger = row === yr ? 0 : ROWX[row];
    const x = L.jx + 3 + stagger + col * (D + 1);
    const y = L.jy + TOP + BODY - D - row * PITCH - (row >= 5 ? GAP : 0);
    out.push({ p, k, x, y, look: p === b ? "you" : p < b ? "beaten" : "ahead" });
  }
  return out;
}
function typicalY() { return L.jy + TOP + BODY - D - 4 * PITCH - 3; }

/* ---------------------------------------------------------------- layout */
function layout() {
  const vw = document.documentElement.clientWidth;
  const cell = vw >= 1700 ? 4 : vw >= 768 ? 3 : 2;
  const wide = vw >= 1280;
  const heroH = hero.clientHeight;
  const rightGap = wide ? 16 : vw >= 768 ? 24 : 12;
  const mj = cell === 2 ? { w: 12, h: 26, gap: 3 } : { w: 22, h: 40, gap: 7 };
  const minisW = 4 * mj.w + 3 * mj.gap;
  /* everything in cells, measured from the jar's left edge */
  const shelfLeft = -(minisW + 2 * mj.gap + 6);
  const originX = shelfLeft - 1;
  const jarLeftPx = vw - rightGap - JW * cell;
  const left = jarLeftPx + originX * cell;
  const W = Math.ceil((vw - left) / cell);
  const shelfPx = wide ? heroH - 168 : vw >= 768 ? 470 : 344;
  const shelfY = Math.round(shelfPx / cell);
  const H = shelfY + SHELF + 14;
  L = { cell, wide, left, W, H, jx: -originX, jy: shelfY - JH, shelfY, mj, shelfLeft: shelfLeft - originX, vw };
  canvas.width = W; canvas.height = H;
  Object.assign(canvas.style, { width: W * cell + "px", height: H * cell + "px" });
  Object.assign(art.style, { left: left + "px", top: "0px", width: vw - left + "px", height: H * cell + "px" });
  art.style.setProperty("--cell", cell + "px");
  const root = document.documentElement.style;
  root.setProperty("--jar-x", jarLeftPx + "px");
  root.setProperty("--shelf-y", (shelfY + SHELF) * cell + "px");
  root.setProperty("--shelf-x", left + (L.shelfLeft + 18) * cell + "px");
  place();
  draw();
}

/* where the words sit on the drawn pieces, in cells */
function receiptBox() {
  const w = 52, x = L.jx + JW - w - 4, h = L.jy - 20;
  return { x, w, h, t: h - 6 - 7 * ROWH - 10 };
}
function ledgerBox() {
  const w = 62, h = 4 * ROWH + 7;
  return { x: L.jx - w - 10, y: 30, w, h };
}
function labelBox() { return { x: L.jx + 4, y: L.shelfY + 2, w: Math.round(236 / L.cell), h: Math.round(22 / L.cell) }; }

function place() {
  const c = L.cell;
  const px = (v) => v * c + "px";
  const r = receiptBox();
  const rc = $(".receipt");
  rc.hidden = !L.wide;
  Object.assign(rc.style, { left: px(r.x + 4), top: px(r.t), width: px(r.w - 8) });
  const g = ledgerBox();
  const lg = $(".ledger");
  lg.hidden = !L.wide;
  Object.assign(lg.style, { left: px(g.x + 4), top: px(g.y + 2), width: px(g.w - 8) });
  art.style.setProperty("--row", px(ROWH));
  const lb = labelBox();
  Object.assign($(".shelf-label").style, { left: px(lb.x), top: px(lb.y), width: px(lb.w), height: px(lb.h) });
  Object.assign(typ.style, { left: px(L.jx + JW - 3), top: typicalY() * c + c / 2 + "px" });
}

/* ---------------------------------------------------------------- drawing */
function draw() {
  const { W, H, jx, jy } = L;
  const buf = new Uint8Array(W * H);
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; };

  drawJar(put, jx, jy, JW, BODY);
  drawLid(put, jx + 1, jy - 1, JW - 2, 22);

  /* graduations up the left wall, every row, and the typical line right across */
  for (let r = 0; r < 10; r++) {
    if (r === 5) continue;
    const gy = jy + TOP + BODY - 1 - r * PITCH - (r >= 5 ? GAP : 0);
    put(jx - 2, gy, C.INK); put(jx - 3, gy, C.INK);
  }
  const ty = typicalY();
  for (let x = jx - 5; x <= jx + JW - 1; x++) put(x, ty, C.INK);
  put(jx - 5, ty - 1, C.INK); put(jx - 5, ty + 1, C.INK);

  /* the shelf, running off the right edge, its label, and the other kinds */
  drawShelf(put, L.shelfLeft, L.shelfY, W - 1, SHELF);
  const lb = labelBox();
  drawLabel(put, lb.x, lb.y, lb.w, lb.h);
  minis = [];
  ORDER.filter((k) => k !== kind).forEach((k, i) => {
    const x = L.shelfLeft + 2 * L.mj.gap + 2 + i * (L.mj.w + L.mj.gap);
    const y = L.shelfY - L.mj.h;
    const lift = lit && lit.t === "jar" && lit.k === k ? 2 : 0;
    drawMiniJar(put, x, y - lift, L.mj.w, L.mj.h, dataFor(k).beats);
    minis.push({ k, x, y: y - lift, w: L.mj.w, h: L.mj.h });
  });

  /* the receipt from above, and the ledger */
  if (L.wide) {
    const r = receiptBox();
    drawReceipt(put, r.x, r.w, r.h, [r.t + 3 * ROWH + 2, r.t + 6 * ROWH + 6]);
    const g = ledgerBox();
    drawLedger(put, g.x, g.y, g.w, g.h, [ROWH + 3]);
  }

  /* the marbles */
  placed = [];
  for (const m of marbles(you)) {
    if (!shown[m.p]) continue;
    const look = lit && lit.t === "m" && lit.p === m.p && m.look !== "you" ? "lit" : m.look;
    for (const [dx, dy, c] of marble(look, data.beats)) put(m.x + dx, m.y + dy, c);
    placed.push(m);
  }

  const img = ctx.createImageData(W, H);
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (!c) continue;
    const [r, g, b] = RGB[c];
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  placeTip();
}

/* ---------------------------------------------------------------- the tiny label */
function about(m) {
  if (m.look === "you") return { text: `${data.handle} beats ${data.beats}`, you: true };
  const beats = m.k + (m.p > you ? 1 : 0);
  return { text: `${data.names[m.k]} beats ${beats}` };
}
function placeTip() {
  const c = L.cell;
  if (!tipOn) { tip.hidden = true; return; }
  tip.classList.remove("is-you");
  if (lit && lit.t === "typ") {
    tip.textContent = "Typical: beats 50 in 100";
    tip.style.left = (L.jx + JW / 2) * c + "px";
    tip.style.top = typicalY() * c - 6 + "px";
  } else if (lit && lit.t === "jar") {
    const j = minis.find((x) => x.k === lit.k);
    if (!j) { lit = null; placeTip(); return; }
    const d = dataFor(lit.k);
    tip.textContent = `${KINDS[lit.k]}: ${d.handle} beats ${d.beats}`;
    tip.style.left = (j.x + j.w / 2) * c + "px";
    tip.style.top = j.y * c - 6 + "px";
  } else {
    const m = placed.find((x) => (lit && lit.t === "m" ? x.p === lit.p : x.look === "you"));
    if (!m) { tip.hidden = true; return; }
    const a = about(m);
    tip.textContent = a.text;
    tip.classList.toggle("is-you", !!a.you);
    tip.style.left = (m.x + D / 2) * c + "px";
    tip.style.top = m.y * c - 6 + "px";
  }
  tip.hidden = false;
}

function hit(e) {
  const r = canvas.getBoundingClientRect();
  const cx = Math.floor((e.clientX - r.left) / L.cell), cy = Math.floor((e.clientY - r.top) / L.cell);
  for (const m of placed) {
    const dx = cx - m.x, dy = cy - m.y;
    if (dx >= 0 && dy >= 0 && dx < D && dy < D && (dx - 4) ** 2 + (dy - 4) ** 2 <= 21) return { t: "m", p: m.p };
  }
  for (const j of minis) if (cx >= j.x && cx < j.x + j.w && cy >= j.y && cy < j.y + j.h + 2) return { t: "jar", k: j.k };
  if (Math.abs(cy - typicalY()) <= 2 && cx >= L.jx - 5 && cx <= L.jx + JW) return { t: "typ" };
  return null;
}
const same = (a, b) => a === b || (a && b && a.t === b.t && a.p === b.p && a.k === b.k);
function point(h) {
  if (h && h.t === "m" && h.p === you) h = null;
  if (same(h, lit)) return;
  lit = h;
  art.style.cursor = h && h.t === "jar" ? "pointer" : "";
  draw();
}

art.addEventListener("pointermove", (e) => { if (!ticking) point(hit(e)); });
art.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !ticking) point(null); });
art.addEventListener("click", (e) => {
  if (ticking) return;
  const h = hit(e);
  if (h && h.t === "jar") setKind(h.k);
  else if (e.pointerType !== "mouse") point(h);
});

/* Keys: arrows walk the jar, Escape comes home. Announced for screen readers. */
art.addEventListener("keydown", (e) => {
  if (ticking) return;
  const cur = lit && lit.t === "m" ? lit.p : you;
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 10, ArrowDown: -10 }[e.key];
  if (e.key === "Escape") { point(null); return; }
  if (step === undefined) return;
  e.preventDefault();
  const p = Math.max(0, Math.min(100, cur + step));
  point({ t: "m", p });
  const m = placed.find((x) => x.p === p);
  if (m) live.textContent = `${about(m).text} in 100 ${PEERS[kind]} your size.`;
});
art.addEventListener("focus", () => { tipOn = true; placeTip(); });

/* ---------------------------------------------------------------- motion */
function rand(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }

/* The load: twelve ticks of 200ms. Marbles settle from the bottom up in loose
   handfuls, the way a jar fills when it is poured; yours lands last. */
function tickIn() {
  const r = rand(93);
  const at = marbles(you).map((m) => Math.min(10, Math.floor(((L.jy + TOP + BODY - m.y) / PITCH) * 0.95 + r() * 2.2)));
  at[you] = 11;
  shown.fill(false);
  ticking = true;
  let t = 0;
  draw();
  const id = setInterval(() => {
    for (let p = 0; p <= 100; p++) if (at[p] <= t) shown[p] = true;
    t++;
    draw();
    if (t > 11) { clearInterval(id); ticking = false; tipOn = true; placeTip(); }
  }, 200);
}

/* Switching kind: the label and the small jars change at once, then your marble
   walks to its new place a row a tick, and the marbles it passes turn from
   beaten to ahead, or back. */
function setKind(k) {
  if (k === kind) return;
  kind = k;
  data = dataFor(k);
  for (const b of $$(".kinds button")) b.setAttribute("aria-pressed", String(b.dataset.kind === k));
  words();
  lit = null;
  const target = data.beats;
  if (still || ticking) { you = target; draw(); return; }
  ticking = true;
  const id = setInterval(() => {
    const d = target - you;
    you += Math.sign(d) * Math.min(Math.abs(d), 10);
    draw();
    if (you === target) { clearInterval(id); ticking = false; placeTip(); }
  }, 200);
}

function words() {
  const set = (k, v) => { for (const n of $$(`[data-b="${k}"]`)) n.textContent = v; };
  set("handle", data.handle);
  set("beats", String(data.beats));
  set("peers", PEERS[kind]);
  set("kinds", KINDS[kind]);
  set("band", data.band);
  set("rating", `${data.signed} ${data.verdict}`);
  data.parts.forEach((p, i) => { set(`part${i}`, p.name); set(`score${i}`, String(p.score)); });
  live.textContent = `${data.handle} beats ${data.beats} in 100 ${PEERS[kind]} your size, on reach.`;
}

for (const b of $$(".kinds button")) b.addEventListener("click", () => setKind(b.dataset.kind));

/* ---------------------------------------------------------------- the fees on the ledger */
$('[data-b="fee-sponsor"]').textContent = SPONSOR;
$('[data-b="fee-sale"]').textContent = SALE;

/* ---------------------------------------------------------------- product icons, drawn as data */
for (const cv of $$("canvas[data-icon]")) {
  const rows = ICONS[cv.dataset.icon];
  const n = rows.length;
  cv.width = n; cv.height = n;
  const c2 = cv.getContext("2d");
  const img = c2.createImageData(n, n);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = ICON_KEYS[ch];
    if (!c) return;
    const i = (y * n + x) * 4, [r, g, b] = RGB[c];
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }));
  c2.putImageData(img, 0, 0);
}

/* ---------------------------------------------------------------- nav on phones */
const menu = $(".menu");
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
});
addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { menu.click(); menu.focus(); } });

/* ---------------------------------------------------------------- reserve */
const form = $(".reserve");
const said = $(".said");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const h = cleanHandle(form.handle.value);
  if (!h) { said.textContent = "Type the handle you want first."; form.handle.focus(); return; }
  said.textContent = `Opening your email with orbe.vc/@${h} written out.`;
  const r = await reserve({ handle: h, kind });
  if (r.via === "api") said.textContent = `Reserved: orbe.vc/@${h}.`;
});

/* ---------------------------------------------------------------- start */
mountWordmark($(".wm"), { animate: !still });
words();
layout();
let rz = 0;
addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
if (still) { tipOn = true; placeTip(); }
else if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); tickIn(); } });
  io.observe(canvas);
} else tickIn();
