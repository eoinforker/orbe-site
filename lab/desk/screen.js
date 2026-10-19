/*
  The monitor's screen: one 1-bit window drawn the way a 1983 desktop drew it.
  Drawn at its native 256 x 192 pixels in Departure Mono (a pixel face cut for 11px steps),
  thresholded to two inks, then scaled up six times with no smoothing so every pixel stays square.
*/
export const W = 256, H = 192, SCALE = 6;
const INK = "#141311", PAPER = "#F3F0E8";
const INK_RGB = [0x14, 0x13, 0x11], PAPER_RGB = [0xf3, 0xf0, 0xe8];
const F1 = '11px "Departure Mono"', F2 = '22px "Departure Mono"';

export function createScreen() {
  const lo = document.createElement("canvas");
  lo.width = W; lo.height = H;
  const g = lo.getContext("2d", { willReadFrequently: true });
  const hi = document.createElement("canvas");
  hi.width = W * SCALE; hi.height = H * SCALE;
  const h = hi.getContext("2d");
  h.imageSmoothingEnabled = false;

  const clock = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  function text(s, x, y, font = F1, color = INK, align = "left") {
    g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = "alphabetic";
    g.fillText(s, Math.round(x), Math.round(y));
  }
  const rect = (x, y, w, hh, c = INK) => { g.fillStyle = c; g.fillRect(x, y, w, hh); };
  const frame = (x, y, w, hh, c = INK) => { rect(x, y, w, 1, c); rect(x, y + hh - 1, w, 1, c); rect(x, y, 1, hh, c); rect(x + w - 1, y, 1, hh, c); };
  const measure = (s, font) => { g.font = font; return g.measureText(s).width; };

  function windowChrome(x, y, w, hh, title) {
    rect(x + 2, y + 2, w, hh, INK);          // the hard drop shadow
    rect(x, y, w, hh, PAPER);
    frame(x, y, w, hh);
    rect(x, y, w, 14, INK);                  // title bar
    text(title, x + 5, y + 11, F1, PAPER);
    frame(x + w - 12, y + 3, 8, 8, PAPER);   // zoom box
    rect(x + w - 9, y + 6, 2, 2, PAPER);
    frame(x + 2, y + 16, w - 4, hh - 18);    // the inner rule: a groove inside the frame
  }

  function desktop() {
    rect(0, 0, W, H, PAPER);
    // a 1-bit stipple for the desktop
    g.fillStyle = INK;
    for (let y = 16; y < H; y += 2) for (let x = (y / 2) % 2 ? 0 : 2; x < W; x += 4) g.fillRect(x, y, 1, 1);
    rect(0, 0, W, 14, PAPER);
    rect(0, 14, W, 1, INK);
    // the menu glyph: a small orb, filled
    g.save(); g.beginPath(); g.arc(9.5, 7, 4.5, 0, Math.PI * 2); g.clip(); rect(4, 8, 12, 6); g.restore();
    g.beginPath(); g.arc(9.5, 7, 4.5, 0, Math.PI * 2); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
    text("File  Edit  Rating", 21, 11);
    text(clock, W - 6, 11, F1, INK, "right");
  }

  /* d: { handle, n, peers, sizeBand }, fill: share of the hundred drawn so far, flash: the figure blinks open */
  function draw(d, fill = 1, flash = false) {
    desktop();
    const x = 7, y = 21, w = 240, hh = 164;
    windowChrome(x, y, w, hh, `orbe/${d.handle}/rating`);
    const bx = x + 9, bw = w - 18;
    let by = y + 41;

    // the sentence at 22px, the figure in reverse
    const a = "You beat ";
    let cx = bx;
    text(a, cx, by, F2); cx += measure(a, F2);
    const fig = String(d.n), fw = measure(fig, F2);
    if (!flash) { rect(cx - 2, by - 17, fw + 4, 21); text(fig, cx, by, F2, PAPER); }
    else { frame(cx - 2, by - 17, fw + 4, 21); text(fig, cx, by, F2); }
    by += 23;
    const l2 = `in 100 ${d.peers}`;
    if (measure(l2, F2) <= bw) { text(l2, bx, by, F2); }
    else { text("in 100", bx, by, F2); by += 23; text(d.peers, bx, by, F2); }
    by += 23;
    text("your size.", bx, by, F2);

    // the hundred: fifty by two, filled to the figure
    by += 12;
    const shown = Math.round(d.n * fill);
    for (let i = 0; i < 100; i++) {
      const cx2 = bx + (i % 50) * 4, cy = by + Math.floor(i / 50) * 4;
      if (i < shown) rect(cx2, cy, 3, 3);
      else rect(cx2 + 1, cy + 1, 1, 1);
    }
    // the size band, under the hundred
    text(d.sizeBand, bx, by + 22);

    threshold();
    h.drawImage(lo, 0, 0, W * SCALE, H * SCALE);
  }

  // two inks only, the way a 1-bit screen shows it
  function threshold() {
    const img = g.getImageData(0, 0, W, H), p = img.data;
    for (let i = 0; i < p.length; i += 4) {
      const lum = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      const c = lum < 132 ? INK_RGB : PAPER_RGB;
      p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  return { canvas: hi, draw };
}
