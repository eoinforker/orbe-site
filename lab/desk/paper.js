/*
  The top sheet of the paper stack: the record, set like a printed slip.
  Two figures, the one the record refuses struck through and the one it keeps.
*/
export const PW = 768, PH = 1075;
const INK = "#141311", SOFT = "#5D584F", COBALT = "#1F4BFF", EMBER = "#FF5A1F", PAPER = "#FBFAF6", RULE = "rgba(20,19,17,0.22)";
const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
const MONO = '"Commit Mono", ui-monospace, Menlo, monospace';

export function createPaper() {
  const c = document.createElement("canvas");
  c.width = PW; c.height = PH;
  const g = c.getContext("2d");

  const text = (s, x, y, font, color = INK, align = "left", track = 0) => {
    g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = "alphabetic";
    if ("letterSpacing" in g) g.letterSpacing = `${track}px`;
    g.fillText(s, x, y);
    const w = g.measureText(s).width - track;
    if ("letterSpacing" in g) g.letterSpacing = "0px";
    return w;
  };

  /* r: { who, what, struckLabel, struck, keptLabel, kept, note, source } */
  function draw(r) {
    g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
    const m = 64;
    text("THE RECORD", m, 112, `500 30px ${MONO}`, INK, "left", 3);
    text("orbe.vc", PW - m, 112, `500 30px ${MONO}`, SOFT, "right");
    g.fillStyle = INK; g.fillRect(m, 140, PW - 2 * m, 3);

    text(r.who, m, 236, `600 64px ${SANS}`, INK, "left", -1.5);
    text(r.what, m, 296, `400 38px ${SANS}`, SOFT);

    g.fillStyle = RULE; g.fillRect(m, 352, PW - 2 * m, 2);
    text(r.struckLabel.toUpperCase(), m, 420, `500 30px ${MONO}`, SOFT, "left", 3);
    const sw = text(r.struck, m - 4, 528, `500 104px ${SANS}`, SOFT, "left", -3);
    g.fillStyle = EMBER; g.fillRect(m - 10, 488, sw + 20, 9);

    g.fillStyle = RULE; g.fillRect(m, 590, PW - 2 * m, 2);
    text(r.keptLabel.toUpperCase(), m, 658, `500 30px ${MONO}`, SOFT, "left", 3);
    text(r.kept, m - 6, 790, `600 136px ${SANS}`, COBALT, "left", -5);

    g.fillStyle = RULE; g.fillRect(m, 850, PW - 2 * m, 2);
    let y = 912;
    for (const line of r.note) { text(line, m, y, `400 34px ${SANS}`, INK); y += 46; }
    text(r.source, m, PH - 56, `400 26px ${SANS}`, SOFT);
  }
  return { canvas: c, draw };
}

/*
  The fee ledger: a small card ruled like a price list. Every rate comes from the market engine's fee schedule.
*/
export const LW = 640, LH = 860;
export function createLedger() {
  const c = document.createElement("canvas");
  c.width = LW; c.height = LH;
  const g = c.getContext("2d");
  const text = (s, x, y, font, color = INK, align = "left", track = 0) => {
    g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = "alphabetic";
    if ("letterSpacing" in g) g.letterSpacing = `${track}px`;
    g.fillText(s, x, y);
    if ("letterSpacing" in g) g.letterSpacing = "0px";
  };
  /* rows: [{ what, rate, who }] */
  function draw(rows) {
    g.fillStyle = "#E7E2D7"; g.fillRect(0, 0, LW, LH);
    g.fillStyle = PAPER; g.fillRect(14, 14, LW - 28, LH - 28);
    const m = 52;
    text("FEES", m, 98, `500 30px ${MONO}`, INK, "left", 3);
    text("from the engine", LW - m, 98, `400 26px ${MONO}`, SOFT, "right");
    g.fillStyle = INK; g.fillRect(m, 124, LW - 2 * m, 3);
    let y = 214;
    for (const r of rows) {
      text(r.rate, m, y, `600 70px ${SANS}`, r.free ? COBALT : INK, "left", -2);
      text(r.what, m + 6, y + 44, `400 30px ${SANS}`, INK);
      if (r.who) text(r.who, LW - m, y, `400 26px ${SANS}`, SOFT, "right");
      y += 112;
      g.fillStyle = RULE; g.fillRect(m, y - 34, LW - 2 * m, 2);
    }
  }
  return { canvas: c, draw };
}
