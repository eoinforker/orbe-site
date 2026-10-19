/*
  The light Today screen: one shared layout any creator can wear. The page
  passes the creator's words; every figure still comes from the engine.
*/
import { $, esc, mountBar, mountFoot, mountCopy } from "./ui.js";
import { n0, shortDate } from "./today.js";

export function renderLight(t, w) {
  mountBar(t);
  mountFoot(t, w.footNote ?? "");
  const main = $("[data-main]");
  const works = [...t.recent].reverse();
  main.innerHTML = `
  <section class="hero">
    <p class="label kicker">${esc(t.name)} &middot; ${esc(w.kindLine)} &middot; ${esc(t.sizeBand)}</p>
    <h1 class="h1">${w.h1}</h1>
    <p class="lede">${esc(w.lede)}</p>
    <ul class="bricks">${w.bricks.map(([k, v]) => `<li><b class="num">${v}</b><span class="label">${esc(k)}</span></li>`).join("")}</ul>
  </section>
  <section class="tonight">
    <div class="num"><p class="label">The number</p><p class="big num">${t.signed}</p><p><b>${t.band}.</b> Zero is typical for ${esc(t.peers)} with ${esc(t.sizeBand)}. Most weeks are, and that is how big things get built.</p></div>
    <div class="latest"><p class="label">Your latest ${esc(w.workWord)}</p><h2 class="lt">${esc(t.latest.title)}</h2>
      <dl class="stats">${w.latestStats.map(([k, v]) => `<div><dt class="label">${esc(k)}</dt><dd class="num">${v}</dd></div>`).join("")}</dl>
      <p class="latest-say">${w.latestSay}</p></div>
  </section>
  <section class="fig" aria-labelledby="fig-h">
    <h2 class="label" id="fig-h">Your last twelve ${esc(w.workWord)}s, each against your own typical</h2>
    <div class="chart" data-chart role="img" aria-label="${esc(`Your last twelve ${w.workWord}s against your own typical. Best: ${t.best.title}, ${t.best.multiple.toFixed(1)} times your typical.`)}"></div>
    <ol class="list">${t.recent.map((x) => `<li><span class="d">${esc(shortDate(x.date))}</span><span class="tt">${esc(x.title)}</span><b class="num">${x.multiple.toFixed(1)}x</b></li>`).join("")}</ol>
  </section>
  <section class="parts" aria-labelledby="parts-h"><h2 class="label" id="parts-h">Against 100 ${esc(t.peers)} your size</h2>
    <ul>${t.parts.map((p) => `<li><span class="pn">${esc(p.name)}</span><span class="pv">${esc(p.value)}</span><span class="pr" aria-hidden="true"><i style="width:${p.score}%"></i></span><b class="num">${p.score}<small> in 100</small></b><span class="pw">${esc(p.what)}</span></li>`).join("")}</ul></section>
  <section class="note" aria-labelledby="note-h"><p class="label" id="note-h">${esc(w.noteTitle)}</p><div class="letter">${w.letter}<p class="sign" aria-label="Orbe"><span data-sign></span></p></div></section>
  ${w.quiet ? `<p class="quiet">${w.quiet}</p>` : ""}
  <section class="post" id="line" aria-labelledby="post-h" tabindex="-1"><h2 class="label" id="post-h">Your line to post</h2><blockquote data-line></blockquote>
    <div class="row"><button class="copy" type="button" data-copy>Copy the line</button><p class="copied" role="status" aria-live="polite" data-copied></p></div></section>`;
  import("../../../assets/r5/wordmark.js").then(({ mountWordmark }) => mountWordmark($("[data-sign]"), { animate: false }));
  $("[data-line]").textContent = w.line;
  mountCopy($("[data-copy]"), w.line, $("[data-copied]"));

  /* the chart: one bar per work against 1x, and one pencil note at the best */
  const chart = $("[data-chart]");
  const draw = () => {
    const W = Math.max(300, chart.clientWidth), phone = W < 640, H = phone ? 260 : 320, T = 70, B = 30;
    const max = Math.max(...works.map((x) => x.multiple), 2);
    const bw = (W / works.length) * 0.62, xs = (i) => (W / works.length) * (i + 0.19);
    const y = (m) => T + (1 - m / max) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
    works.forEach((x, i) => {
      s += `<rect x="${xs(i)}" y="${y(x.multiple)}" width="${bw}" height="${H - B - y(x.multiple)}" class="${x === t.best ? "bar best" : "bar"}"/>`;
      if (!phone || i % 3 === 2) s += `<text x="${xs(i) + bw / 2}" y="${H - 10}" text-anchor="middle" class="ax">${esc(shortDate(x.date))}</text>`;
    });
    s += `<line x1="0" x2="${W}" y1="${y(1)}" y2="${y(1)}" class="one"/><text x="${W}" y="${y(1) - 6}" text-anchor="end" class="ax">1x, your typical</text>`;
    const bi = works.indexOf(t.best), bx = xs(bi) + bw / 2, by = y(t.best.multiple);
    const left = bi > 6, tx = left ? bx - 30 : bx + 30;
    s += `<ellipse cx="${bx}" cy="${by - 12}" rx="${bw * 0.6 + 6}" ry="12" class="ring" transform="rotate(-6 ${bx} ${by - 12})"/>`;
    s += `<text x="${tx}" y="${Math.max(24, by - 34)}" text-anchor="${left ? "end" : "start"}" class="hand-n">${esc(w.chartNote)}</text>`;
    chart.innerHTML = s + "</svg>";
  };
  draw();
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(draw, 80); });
}
export { n0, shortDate };
