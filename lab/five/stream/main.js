/*
  Today, for a made-up cosy stream on Twitch. Peony field and the pixel pieces
  from lab/pixel: the jar of a hundred streamers your size with your marble in
  it, and a room of pips for every night live, one pip per concurrent viewer.
  Every figure is the Orbe engine's, computed on load.
*/
import { $, esc, mountBar, mountFoot, mountCopy, STILL } from "../shared/ui.js";
import { today, n0, beatsFor, shortDate } from "../shared/today.js";
import { C, RGB, D, marble, drawJar, drawShelf, drawLid, jarProfile } from "../../pixel/assets/sprites.js";

const t = today("stream");
const follows = t.part("follows"), reach = t.part("reach");
const R = (x) => Math.round(x);
/* the stream that sat nearest eleven people: the quiet night that still counted */
const eleven = t.recent.reduce((a, w) => (Math.abs(w.metrics.avg_viewers - 11) < Math.abs(a.metrics.avg_viewers - 11) ? w : a), t.recent[0]);
const hoursEach = (w) => w.durationSec / 3600;

mountBar(t);
mountFoot(t, "Concurrents here are average viewers across a stream, as Twitch reports them.");

$("[data-size]").textContent = t.sizeBand;
$("[data-h1]").innerHTML = `${R(eleven.metrics.avg_viewers)} people stayed for all of &ldquo;${esc(eleven.title)}&rdquo;. It&nbsp;counted.`;
$("[data-lede]").textContent = `${t.body.works} streams since ${shortDate(t.body.since)}, ${n0(t.body.totals.hours_watched)} hours watched together and ${n0(t.body.totals.new_followers)} new follows. The regulars are turning into a room. Against streamers your size, your follow rate beats ${follows.score} in 100.`;
$("[data-bricks]").innerHTML = [
  ["Nights live", t.body.works], ["Hours streamed", n0(t.body.hours)], ["Hours watched", n0(t.body.totals.hours_watched)], ["New follows", n0(t.body.totals.new_followers)],
].map(([k, v]) => `<li><b class="num">${v}</b><span class="label">${k}</span></li>`).join("");

/* ---------------------------------------------------------------- pixel helpers */
const cellSize = () => (document.documentElement.clientWidth >= 1100 ? 3 : 2);
function paint(canvas, W, H, cell, fn) {
  const buf = new Uint8Array(W * H);
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; };
  fn(put);
  canvas.width = W; canvas.height = H;
  Object.assign(canvas.style, { width: W * cell + "px", height: H * cell + "px" });
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i]; if (!c) continue;
    const [r, g, b] = RGB[c];
    img.data.set([r, g, b, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------------------------------------------------------------- the jar: a hundred streamers your size, and you */
const IW = 110, JW = IW + 6, PITCH = 10, GAP = 4, HEAD = 7, TOP = 16, SHELF = 7;
const BODY = 2 * (4 * PITCH + D) + GAP + HEAD;
const JH = jarProfile(BODY).length;
const ROWX = [1, 6, 0, 5, 1, 6, 0, 4, 1, 5];
const YOU = follows.score;
let shown = STILL ? 101 : 0;
function drawJarScene() {
  const cell = cellSize();
  const W = JW + 24, jx = 12, jy = 14, H = jy + JH + SHELF + 16;
  const wrap = $("[data-jar-wrap]");
  paint($("[data-jar]"), W, H, cell, (put) => {
    drawJar(put, jx, jy, JW, BODY);
    drawLid(put, jx + 1, jy - 1, JW - 2, 22);
    drawShelf(put, 0, jy + JH, W - 1, SHELF);
    const ty = jy + TOP + BODY - D - 4 * PITCH - 3;
    for (let x = jx - 5; x <= jx + JW - 1; x++) put(x, ty, C.INK);
    const yr = Math.min(9, Math.floor(YOU / 10)), yc = YOU - yr * 10;
    let n = 0;
    for (let p = 0; p <= 100; p++) {
      const k = p < YOU ? p : p - 1;
      let row, col;
      if (p === YOU) { row = yr; col = yc; } else { row = Math.floor(k / 10); col = k % 10; if (row === yr && col >= yc) col += 1; }
      if (n++ >= shown && p !== YOU) continue;
      if (p === YOU && shown < 101) continue;
      const x = jx + 3 + (row === yr ? 0 : ROWX[row]) + col * (D + 1);
      const y = jy + TOP + BODY - D - row * PITCH - (row >= 5 ? GAP : 0);
      for (const [dx, dy, c] of marble(p === YOU ? "you" : p < YOU ? "beaten" : "ahead", 100)) put(x + dx, y + dy, c);
      if (p === YOU) { wrap.style.setProperty("--yx", `${(x + D) * cell + 6}px`); wrap.style.setProperty("--yy", `${(y + D / 2) * cell}px`); }
    }
    wrap.style.setProperty("--ty", `${ty * cell}px`);
    wrap.style.setProperty("--tx", `${(jx + JW) * cell + 6}px`);
  });
}
$("[data-jtag-you]").innerHTML = `<b>you</b>, ahead of ${YOU}`;
$("[data-jar-cap]").innerHTML = `<b>The jar.</b> A hundred streamers with ${esc(t.sizeBand)}, sorted by follow rate. Blue marbles are behind you, straw ones ahead. Yours is the ember one, at ${YOU}. The line is typical.`;
const jarArt = $("[data-jar-wrap]");
jarArt.setAttribute("role", "img");
jarArt.setAttribute("aria-label", `A pixel jar of a hundred marbles on a shelf. ${YOU} blue marbles sit below yours: your follow rate beats ${YOU} in 100 streamers your size.`);
drawJarScene();
if (!STILL) {
  /* the marbles pour in by the handful, then yours lands last, once */
  const pour = () => { shown = Math.min(101, shown + 9); drawJarScene(); if (shown < 101) setTimeout(pour, 90); };
  setTimeout(pour, 300);
}

/* ---------------------------------------------------------------- the number and the latest stream */
$("[data-rating]").textContent = t.signed;
$("[data-band]").innerHTML = `<b>${t.band}.</b> Zero is typical for streamers with ${esc(t.sizeBand)}. Most weeks are, and that is how big things get built.`;
const L = t.latest, lm = L.metrics;
$("[data-latest-t]").textContent = L.title;
$("[data-latest]").innerHTML = [
  ["Concurrents", R(lm.avg_viewers)], ["Peak", R(lm.peak_viewers)], ["New follows", R(lm.new_followers)], ["Hours watched", R(lm.hours_watched)],
].map(([k, v]) => `<div><dt class="label">${k}</dt><dd class="num">${v}</dd></div>`).join("");
const latestBeats = beatsFor(t, "reach", lm.avg_viewers / t.audience);
$("[data-latest-say]").innerHTML = `<b>${L.multiple.toFixed(1)}x</b> your typical night of ${R(t.typical.avg_viewers)} concurrents (${L.signed}). Against streamers your size, a night like that holds more of its followers than ${latestBeats} in 100.`;

/* ---------------------------------------------------------------- every night in the room */
const nights = [...t.recent].reverse();
function drawRooms() {
  const cell = cellSize();
  const wrap = $("[data-rooms]").parentElement;
  const avail = Math.floor(wrap.clientWidth / cell);
  const PER = 5, P = 3, S = 4;                      /* five pips a row, three cells each, four apart */
  const colW = PER * S + 2;
  const phone = avail < nights.length * (colW + 4);
  const cols = phone ? 6 : 12, gap = phone ? 3 : Math.floor((avail - 12 * colW) / 11);
  const rowsMax = Math.ceil(Math.max(...nights.map((w) => R(w.metrics.avg_viewers))) / PER);
  const colH = rowsMax * S + 4;
  const bands = phone ? 2 : 1;
  const W = Math.min(avail, cols * colW + (cols - 1) * gap), H = bands * (colH + 8);
  paint($("[data-rooms]"), W, H, cell, (put) => {
    nights.forEach((w, i) => {
      const band = Math.floor(i / cols), ci = i % cols;
      const x0 = ci * (colW + gap), base = band * (colH + 8) + colH;
      const v = R(w.metrics.avg_viewers), f = R(w.metrics.new_followers);
      for (let x = x0; x < x0 + colW; x++) put(x, base + 1, C.INK);
      for (let k = 0; k < v; k++) {
        const r = Math.floor(k / PER), c = k % PER;
        const px = x0 + 1 + c * S, py = base - 2 - r * S;
        const col = k < f ? C.EMBER : w === eleven ? C.INK : C.COBALT;
        for (let a = 0; a < P; a++) for (let b = 0; b < P; b++) put(px + a, py - b, col);
      }
      if (w === eleven) {
        const nx = x0 * cell, ny = (base - Math.ceil(v / PER) * S - 4) * cell;
        $("[data-room-note]").style.cssText = `left:${Math.min(nx, W * cell - 220)}px;top:${Math.max(0, ny - 64)}px`;
      }
    });
  });
}
$("[data-room-note]").textContent = `${R(eleven.metrics.avg_viewers)} people, ${hoursEach(eleven)} hours. In your rating like any other night.`;
$("[data-rooms]").setAttribute("role", "img");
$("[data-rooms]").setAttribute("aria-label", `Twelve rooms of pips, one pip per concurrent viewer: from ${R(Math.min(...nights.map((w) => w.metrics.avg_viewers)))} to ${R(Math.max(...nights.map((w) => w.metrics.avg_viewers)))} people a night.`);
drawRooms();
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { drawRooms(); drawJarScene(); }, 80); });
$("[data-room-list]").innerHTML = nights.map((w) => `<li${w === eleven ? ' class="is-eleven"' : ""}><span class="d">${esc(shortDate(w.date))}</span><span class="tt">${esc(w.title)}</span><b class="num">${R(w.metrics.avg_viewers)}</b></li>`).join("");
$("[data-counted]").innerHTML = `<b>The quiet one counted too.</b> &ldquo;${esc(eleven.title)}&rdquo;: ${R(eleven.metrics.avg_viewers)} concurrents for ${hoursEach(eleven)} hours, ${R(eleven.metrics.hours_watched)} hours watched, ${R(eleven.metrics.new_followers)} new follows. It sits in your rating at ${eleven.signed}, the same way your biggest nights do.`;

/* ---------------------------------------------------------------- readings */
$("[data-parts]").innerHTML = t.parts.map((p) => `<li><span class="pn">${esc(p.name)}</span><span class="pv">${esc(p.value)}</span><span class="pips" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(p.score / 10) ? "on" : ""}"></i>`).join("")}</span><b class="num">${p.score}<small> in 100</small></b><span class="pw">${esc(p.what)}</span></li>`).join("");

/* ---------------------------------------------------------------- the monthly note */
const first = t.records.find((r) => r.metric === "avg_viewers");
const oct = t.recent.filter((w) => w.date.getUTCMonth() === 9);
const bestOct = oct.reduce((a, w) => (w.multiple > a.multiple ? w : a), oct[0]);
$("[data-letter]").innerHTML = `<p class="hello">Hello, Lanterns and Tea.</p>
  <p>October so far: ${oct.length} nights live. Your best was &ldquo;${esc(bestOct.title)}&rdquo; on ${esc(shortDate(bestOct.date))}, ${R(bestOct.metrics.avg_viewers)} concurrents and ${R(bestOct.metrics.new_followers)} new follows, ${bestOct.multiple.toFixed(1)}x your typical night.</p>
  ${first ? `<p>Your ${first.first ? "very first stream" : "stream"} on ${esc(shortDate(first.date))} still holds your record: ${R(first.value)} concurrents. Its two month anniversary was this month. The room has been there since day one.</p>` : ""}
  <p>Nothing to fix. See you Sunday.</p>
  <p class="sign" aria-label="Orbe"><span data-sign></span></p>`;
import("../../../assets/r5/wordmark.js").then(({ mountWordmark }) => mountWordmark($("[data-sign]"), { animate: false }));

/* ---------------------------------------------------------------- the line */
const line = `${R(eleven.metrics.avg_viewers)} people stayed for all of ${eleven.title}, and ${n0(t.body.totals.new_followers)} of you have followed since ${shortDate(t.body.since)}. Against streamers our size, our follow rate beats ${follows.score} in 100. Thank you for being the room. Independently calculated by Orbe.`;
$("[data-line]").textContent = line;
mountCopy($("[data-copy]"), line, $("[data-copied]"));
