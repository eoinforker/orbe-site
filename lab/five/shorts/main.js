/*
  Today, for a made-up coding Shorts channel. An Ink desktop with 1-bit windows
  (the lab/desk chrome, drawn in HTML), a terminal that reads the record, and
  every figure from the Orbe engine on load.
*/
import { $, esc, mountBar, mountFoot, mountCopy, STILL } from "../shared/ui.js";
import { today, n0, beatsFor, shortDate } from "../shared/today.js";

const t = today("shorts");
const reach = t.part("reach"), cadence = t.part("cadence"), momentum = t.part("momentum"), hits = t.part("hits");
const war = t.recent.find((w) => w.war);
const days = (w) => Math.round(w.ageDays);
const onCourse = (w) => w.multiple * t.typical.views;
const latestBeats = beatsFor(t, "reach", onCourse(t.latest) / t.audience);
const weeks = Math.round((Date.parse("2026-10-18") - t.body.since) / (7 * 86400000));

mountBar(t);
mountFoot(t, "A Short is anything up to three minutes; Orbe rates Shorts against Shorts.");

/* ---------------------------------------------------------------- the terminal */
const lines = [
  ["$", "orbe today"],
  ["", `reading ${t.body.works} Shorts from ${t.handle} ... done`],
  ["", `size     ${t.sizeBand}`],
  ["", `rating   ${t.signed}  ${t.band}`],
  ["", `#1       ${t.top.name.toLowerCase()}, ${t.top.value}: beats ${t.top.score} in 100`],
  ["", `latest   "${t.latest.title}"  ${t.latest.multiple.toFixed(1)}x your typical`],
  ["$", ""],
];
const term = $("[data-term]");
const render = (n) => {
  term.innerHTML = lines.slice(0, n).map(([p, l], i) => `<span class="${p ? "p" : "o"}">${p ? "$ " : "  "}${esc(l)}${i === n - 1 && p && !l ? '<i class="cur"></i>' : ""}</span>`).join("\n");
};
if (STILL) render(lines.length);
else { let n = 0; const tick = () => { render(++n); if (n < lines.length) setTimeout(tick, n === 1 ? 420 : 260); }; tick(); }

$("[data-h1]").innerHTML = `${t.body.works} Shorts shipped in ${weeks} weeks. Channels your size: you out-ship ${cadence.score}&nbsp;in&nbsp;100.`;
$("[data-lede]").textContent = `${n0(t.body.totals.views)} views, ${n0(t.body.totals.comments)} comments, and a channel people now come to when a thing confuses them. Scripted in the morning, shipped by lunch, most days of the month. That is how a reference gets built.`;

/* ---------------------------------------------------------------- the number */
$("[data-rating]").textContent = t.signed;
$("[data-band]").textContent = `${t.band}. Zero is a typical channel with ${t.sizeBand}.`;
$("[data-bricks]").innerHTML = [
  ["shorts", n0(t.body.works)], ["minutes", n0(t.body.hours * 60)], ["views", n0(t.body.totals.views)], ["a month", cadence.value.replace(" a month", "")],
].map(([k, v]) => `<li><b>${v}</b><span>${k}</span></li>`).join("");

/* ---------------------------------------------------------------- the latest Short */
$("[data-latest]").innerHTML = `<p class="kv"><span>shipped</span>${days(t.latest)} days ago, ${esc(shortDate(t.latest.date))}</p>
  <h3 class="lt">${esc(t.latest.title)}</h3>
  <div class="two">
    <p><span>vs your typical</span><b>${t.latest.multiple.toFixed(1)}x</b>on course for ${n0(onCourse(t.latest))} views (${t.latest.signed})</p>
    <p><span>vs channels your size</span><b>${latestBeats}/100</b>its views alone would beat ${latestBeats} in 100</p>
  </div>`;

/* ---------------------------------------------------------------- the comment war */
const warTimes = war.metrics.comments / t.typical.comments;
$("[data-war]").innerHTML = `<p class="kv"><span>loudest of the twelve</span>${esc(shortDate(war.date))}</p>
  <h3 class="lt">${esc(war.title)}</h3>
  <p class="warn"><b>${n0(war.metrics.comments)}</b> comments. ${warTimes.toFixed(1)}x your typical Short.</p>
  <p class="muted">Every one of them counts towards engagement (${t.part("engagement").value}, beats ${t.part("engagement").score} in 100), whichever side they were on. Orbe stays neutral on indentation.</p>`;

/* ---------------------------------------------------------------- shipped: the bars */
const works = [...t.recent].reverse();
const max = Math.max(...works.map((w) => w.multiple), 2);
const ship = $("[data-ship]");
ship.setAttribute("role", "img");
ship.setAttribute("aria-label", `Your last twelve Shorts against your own typical, from ${works[0].multiple.toFixed(1)} times to ${works[works.length - 1].multiple.toFixed(1)} times. The best was ${t.best.title}, ${t.best.multiple.toFixed(1)} times.`);
ship.style.setProperty("--one-n", String(1 / max));
const bi = works.indexOf(t.best);
ship.innerHTML = works.map((w) => `<div class="b${w === t.best ? " best" : ""}${w.war ? " war" : ""}"><span class="m">${w.multiple.toFixed(1)}x</span><i style="height:${(w.multiple / max) * 100}%"></i><span class="d">${esc(shortDate(w.date))}</span></div>`).join("")
  + `<span class="one" aria-hidden="true">1x</span><span class="note hand" aria-hidden="true" style="${bi > 5 ? `right:${((11 - bi) / 12) * 100 + 9}%;text-align:right` : `left:${(bi / 12) * 100 + 9}%`}">${t.best.multiple.toFixed(1)}x. "${esc(t.best.title)}"<br>best of the twelve</span>`;

/* ---------------------------------------------------------------- readings */
$("[data-parts]").innerHTML = t.parts.map((p) => `<li><span class="pn">${esc(p.name.toLowerCase())}</span><span class="pr" aria-hidden="true"><i style="width:${p.score}%"></i></span><b>${p.score}</b><span class="pv">${esc(p.value)}</span></li>`).join("");

/* ---------------------------------------------------------------- the Sunday commit */
const rec = t.records.find((r) => r.metric === "views");
$("[data-log]").innerHTML = `<p class="commit">commit sunday-${esc(shortDate(new Date("2026-10-18")).toLowerCase().replace(" ", "-"))}</p>
  <p class="kv"><span>Author:</span>Orbe</p>
  <p class="msg">Read ${t.body.works} Shorts. Shipped ${cadence.value}.<br>Newest ten at ${momentum.value} on the twenty before: typical, and typical is fine.<br>${hits.value} of Shorts did twice your median.<br>Record still holds: ${rec ? `${n0(rec.value)} views on "${esc(rec.title)}" (${esc(shortDate(rec.date))})` : "none yet"}.</p>`;

/* ---------------------------------------------------------------- the sponsor DM */
$("[data-dm]").innerHTML = `<p class="kv"><span>from:</span>"partnerships" &lt;unknown sender&gt;</p>
  <p class="kv"><span>attachment:</span>demo_build.zip</p>
  <p class="msg">Before you open the attachment: real sponsors do not need you to install anything. If this one is real, here is your slot: a typical Short reaches ${n0(t.typical.views)} people, ${reach.value}, and beats ${reach.score} in 100 channels your size. Name your price from that.</p>`;

/* ---------------------------------------------------------------- the line */
const line = `${t.body.works} Shorts in ${weeks} weeks. Against channels our size we out-ship ${cadence.score} in 100, and the tabs vs spaces thread is still going. Rated ${t.signed} (${t.band}), independently calculated by Orbe.`;
$("[data-line]").textContent = line;
mountCopy($("[data-copy]"), line, $("[data-copied]"));
