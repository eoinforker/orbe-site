/*
  Today, for a made-up science explainer channel. Sky field, graph paper, a
  photographed glass orb filled to where its views sit among channels its size,
  and a figure of the last twelve uploads with notes in the margin. Every figure
  is the Orbe engine's, computed on load.
*/
import { $, esc, mountBar, mountFoot, mountCopy, STILL } from "../shared/ui.js";
import { today, n0, beatsFor, shortDate, NOW } from "../shared/today.js";

const t = today("science");
const reach = t.part("reach");
const days = (w) => Math.round(w.ageDays);
const onCourse = (w) => w.multiple * t.typical.views;
const latestBeats = beatsFor(t, "reach", onCourse(t.latest) / t.audience);
const byTitle = (w) => `“${w.title}”`;

mountBar(t);
mountFoot(t, "Orbe reads views, likes and comments; retention stays in your YouTube Studio.");

/* ---------------------------------------------------------------- the hero */
$("[data-size]").textContent = t.sizeBand;
$("[data-h1]").innerHTML = `Your views beat <em>${reach.score}</em> in&nbsp;100 channels your&nbsp;size.`;
$("[data-lede]").textContent = `${t.body.works} uploads since ${shortDate(t.body.since)}. ${Math.round(t.body.hours)} hours of explaining, and ${n0(t.body.totals.views)} views between them. Every one is a brick in a library people come back to, and it only gets bigger.`;
$("[data-body]").innerHTML = [
  ["Uploads", n0(t.body.works)], ["Hours published", t.body.hours.toFixed(1)], ["Views", n0(t.body.totals.views)], ["Likes", n0(t.body.totals.likes)], ["Comments", n0(t.body.totals.comments)],
].map(([k, v]) => `<div><dt class="label">${k}</dt><dd class="num">${v}</dd></div>`).join("");

/* ---------------------------------------------------------------- the plate: the orb */
for (const n of document.querySelectorAll("[data-beats]")) n.textContent = reach.score;
$("[data-plate-cap]").textContent = `Views on a typical upload, ${reach.value}, against 100 channels with ${t.sizeBand}. The line cut round the glass is typical for your size. The blue sits at ${reach.score}.`;
const plate = $("[data-hero]");
plate.setAttribute("role", "img");
plate.setAttribute("aria-label", `A glass orb on paper, filled with blue to ${reach.score} in 100, above the line engraved at typical for your size.`);
/* the orb drawn flat, the line at typical and the blue at the score (the level mapping) */
function drawDots() {
  const lv = (p) => (p <= 0.5 ? 0.965 * (2 * p - 1) : 0.6 * (2 * p - 1));
  const y = 50 - lv(reach.score / 100) * 48, h = Math.sqrt(Math.max(0, 48 * 48 - (50 - y) ** 2));
  $("[data-dots]").outerHTML = `<svg class="dots" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="in"><circle cx="50" cy="50" r="47"/></clipPath></defs>
    <rect x="0" y="${y}" width="100" height="${100 - y}" fill="#1F4BFF" clip-path="url(#in)"/><ellipse cx="50" cy="${y}" rx="${h}" ry="${h * 0.18}" fill="#4D7BFF" clip-path="url(#in)"/>
    <circle cx="50" cy="50" r="48" fill="none" stroke="#141311" stroke-width="1.2"/><ellipse cx="50" cy="50" rx="48" ry="7" fill="none" stroke="#141311" stroke-width="0.6" stroke-dasharray="1.5 1.5"/></svg>`;
}
function placeSlot() {
  const h = plate.getBoundingClientRect();
  const rp = Math.min(h.width, h.height) * 0.27;
  plate.style.setProperty("--cx", `${h.width * 0.35}px`);
  plate.style.setProperty("--cy", `${h.height * 0.54}px`);
  plate.style.setProperty("--rp", `${rp}px`);
}
placeSlot();
addEventListener("resize", placeSlot);
plate.classList.add("fallback");
drawDots();

/* ---------------------------------------------------------------- the number and the latest upload */
$("[data-rating]").textContent = t.signed;
$("[data-band]").innerHTML = `<b>${t.band}.</b> Zero is a typical channel with ${esc(t.sizeBand)}.`;
$("[data-score-say]").textContent = `Your strongest reading is ${t.top.name.toLowerCase()}: ${t.top.value}, better than ${t.top.score} in 100. The one to work on is cadence, at ${t.part("cadence").value}. A steady rhythm you can keep beats a burst.`;
$("[data-latest-t]").textContent = byTitle(t.latest);
$("[data-own]").textContent = `${t.latest.multiple.toFixed(1)}x`;
$("[data-own-say]").textContent = `your typical upload, ${days(t.latest)} days in (${t.latest.signed}). On course for about ${n0(onCourse(t.latest))} views.`;
$("[data-peer]").textContent = `${latestBeats} in 100`;
$("[data-peer-say]").textContent = `If it lands there, its views alone beat ${latestBeats} in 100 channels your size.`;
$("[data-hook]").textContent = `The 30-second hook is yours to judge in Studio; Orbe doesn't read retention. What the views say: ${days(t.latest)} days in, the kettle is already ahead of your typical.`;

/* ---------------------------------------------------------------- Fig. 2: the last twelve */
const works = [...t.recent].reverse();
const chart = $("[data-chart]");
chart.setAttribute("role", "img");
chart.setAttribute("aria-label", `Your last twelve uploads against your own typical. Best: ${t.best.title}, ${t.best.multiple.toFixed(1)} times typical. Quietest: ${t.quiet.title}, ${t.quiet.multiple.toFixed(1)} times. Latest: ${t.latest.title}, ${t.latest.multiple.toFixed(1)} times.`);
function drawChart() {
  const W = Math.max(320, chart.clientWidth), phone = W < 640;
  const H = phone ? 300 : 380, L = phone ? 34 : 56, R = phone ? 12 : 24, T = phone ? 70 : 64, B = 40;
  const lo = -2, hi = 3;
  const x = (i) => L + ((W - L - R) * (i + 0.5)) / works.length;
  const y = (v) => T + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  for (let v = lo; v <= hi; v++) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? "zero" : "grid"}"/><text x="${L - 8}" y="${y(v) + 4}" class="ax" text-anchor="end">${v > 0 ? "+" : ""}${v}</text>`;
  s += `<text x="${W - R}" y="${y(0) - 8}" class="ax zero-t" text-anchor="end">your typical</text>`;
  works.forEach((w, i) => {
    const up = w.rating >= 0;
    s += `<line x1="${x(i)}" x2="${x(i)}" y1="${y(0)}" y2="${y(w.rating)}" class="stem"/>`;
    s += `<circle cx="${x(i)}" cy="${y(w.rating)}" r="${phone ? 5 : 7}" class="${up ? "dot" : "dot low"}"/>`;
    if (!phone || i % 3 === 2 || i === works.length - 1) s += `<text x="${x(i)}" y="${H - 14}" class="ax" text-anchor="middle">${shortDate(w.date)}</text>`;
  });
  /* margin notes, lettered by hand, each pointing at its upload */
  const note = (w, text, dx, dy, anchor) => {
    const i = works.indexOf(w), px = x(i), py = y(w.rating);
    const tx = Math.max(L + 4, Math.min(W - R - 4, px + dx)), ty = Math.max(16, Math.min(H - B - 8, py + dy));
    const mx = (px + tx) / 2 + (dy > 0 ? 14 : -14), my = (py + ty) / 2;
    s += `<path d="M${tx},${ty + (dy > 0 ? -18 : 6)} Q${mx},${my} ${px + (dx > 0 ? 9 : -9)},${py + (dy > 0 ? 8 : -8)}" class="arrow"/>`;
    s += `<text x="${tx}" y="${ty}" class="note" text-anchor="${anchor}">${text.map((l, k) => `<tspan x="${tx}" dy="${k ? "1.15em" : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  };
  const bi = works.indexOf(t.best);
  s += `<ellipse cx="${x(bi)}" cy="${y(t.best.rating)}" rx="${phone ? 13 : 17}" ry="${phone ? 11 : 14}" class="ring" transform="rotate(-12 ${x(bi)} ${y(t.best.rating)})"/>`;
  note(t.best, phone ? [`${t.best.multiple.toFixed(1)}x your typical`] : [`${t.best.multiple.toFixed(1)}x your typical.`, "Still the one people find."], bi > 6 ? -60 : 60, 30, bi > 6 ? "end" : "start");
  chart.innerHTML = s + "</svg>";
}
drawChart();
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(drawChart, 80); });
$("[data-list]").innerHTML = t.recent.map((w) => `<li><span class="d num">${shortDate(w.date)}</span><span class="tt">${esc(w.title)}</span><b class="num">${w.multiple.toFixed(1)}x</b></li>`).join("");

/* ---------------------------------------------------------------- the readings */
$("[data-parts]").innerHTML = t.parts.map((p) => `<li>
  <span class="p-n">${esc(p.name)}</span><span class="p-v">${esc(p.value)}</span>
  <span class="p-ruler" aria-hidden="true"><i style="width:${p.score}%"></i></span>
  <b class="p-s num">${p.score}<small> in 100</small></b>
  <span class="p-w">${esc(p.what)}</span></li>`).join("");

/* ---------------------------------------------------------------- the ritual */
const views = t.records.find((r) => r.metric === "views");
$("[data-sunday]").innerHTML = `<b>${esc(NOW.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }))}.</b> Orbe read all ${t.body.works} uploads this morning. Your views are up ${t.part("momentum").value} on the twenty before your newest ten, and ${t.part("hits").value} of your uploads do twice your own median or better. The library is growing in the right direction.`;
$("[data-record]").innerHTML = views ? `<b class="num">${n0(views.value)}</b> views on your ${esc(shortDate(views.date))} upload, the most on any upload so far. It took the record from one at ${n0(views.previous)}. The kettle has ${n0(views.value - onCourse(t.latest))} views to go.` : "";
$("[data-sponsor]").textContent = `Sponsors ask for views. Send them this: a typical upload reaches ${n0(t.typical.views)} people, ${reach.value}, and beats ${reach.score} in 100 channels your size. Independently calculated by Orbe.`;

/* ---------------------------------------------------------------- the line */
const line = `${t.body.works} uploads in, and our views beat ${reach.score} in 100 channels our size. Thank you for asking why with us. Rated ${t.signed} (${t.band}), independently calculated by Orbe.`;
$("[data-line]").textContent = line;
mountCopy($("[data-copy]"), line, $("[data-copied]"));
