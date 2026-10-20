/*
  Your Orbe, the creator home: one made-up creator at a time, every figure
  worked out live by the Orbe engine (./you-data.js). The header, footer and
  trail are the shared system's (../../assets/orbe/).
*/
import { mountHeader, mountFooter } from "../../assets/orbe/chrome.js";
import { mountTrail } from "../../assets/orbe/trail.js";
import { portalMarkup } from "../../assets/orbe/mark.js";
import { reducedMotion } from "../../assets/orbe/ease.js";
import { MODEL_VERSION } from "../../assets/engine/rating/browser.js";
import { KINDS, creator, count, gbp, gbpExact, minus, times, FX_RATE, SELLING, RATING_LABEL, FIXTURE_NOW, PERIOD_WORDS, workReport, kindOfWork, LEVEL_RULE, SEASON_RULE, PACING_LINE, VERDICT_WORDS, LINE_RULE } from "./you-data.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const still = reducedMotion();
const signedN = (n, dp = 2) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(dp)}`;
const dateOf = (iso, opts = { day: "numeric", month: "short" }) => new Date(iso).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" }).replace("Sept", "Sep");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window: the page works without it */ } },
};

/* ---------------------------------------------------------------- the shared chrome */
mountFooter($("[data-ob-footer]"), { root: "../../" });
mountHeader($("[data-ob-header]"), { root: "../../", current: "products/you/" });
mountTrail({ loud: ".yo-hero" });

$("[data-date]").textContent = `Your Orbe · ${dateOf(FIXTURE_NOW, { weekday: "long", day: "numeric", month: "long" })}`;

/* ---------------------------------------------------------------- the switcher */
const kindsEl = $("[data-kinds]");
kindsEl.innerHTML = KINDS.map((k) => `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-k="${k.key}">${esc(k.tab)}</button>`).join("");
const radios = [...kindsEl.querySelectorAll("button")];
function pick(key, { focus = false, animate = true } = {}) {
  for (const b of radios) {
    const on = b.dataset.k === key;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  }
  store.set("orbe-you-kind", key);
  render(creator(key), animate);
}
kindsEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) pick(b.dataset.k); });
kindsEl.addEventListener("keydown", (e) => {
  const i = radios.findIndex((b) => b.getAttribute("aria-checked") === "true");
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  let j = null;
  if (step) j = (i + step + radios.length) % radios.length;
  if (e.key === "Home") j = 0;
  if (e.key === "End") j = radios.length - 1;
  if (j === null) return;
  e.preventDefault();
  pick(radios[j].dataset.k, { focus: true });
});

/* ---------------------------------------------------------------- render */
let C = null;
let shareWhich = "best";

function render(c, animate) {
  C = c;
  shareWhich = "best";
  hero(c, animate);
  skills(c);
  highlights(c);
  compare(c, current);
  season(c);
  levels(c);
  share(c);
  $("[data-print]").textContent = `${c.k.name} (${c.k.handle}) is made up: the creator, the ${c.w.works} and their titles are invented for this page, and every figure is worked out live from them by the Orbe engine, maths version ${MODEL_VERSION}. Benchmarks for ${c.peers} your size are the engine's provisional starting baselines, replaced by measured ones as creators consent to be counted. Sponsorship prices use the provisional rate card, converted at ${FX_RATE} pounds per dollar; the Record example is a different made-up channel, built to show an estimate and a payout disagreeing.`;
}

const OPENERS = {
  Great: (c) => [`Hello, ${c.k.name}.`, "A big stretch. Enjoy this one."],
  Good: (c) => [`Hello, ${c.k.name}.`, `You're ahead of ${c.peers} your size.`],
  Average: (c) => [`Hello, ${c.k.name}.`, "A typical stretch, and that's how big things get built."],
  Subpar: (c) => [`Hello, ${c.k.name}.`, "A quiet stretch. Nothing here decays while you rest."],
  Poor: (c) => [`Hello, ${c.k.name}.`, "A quiet stretch. Nothing here decays while you rest."],
};

function hero(c, animate) {
  const [hi, soft] = OPENERS[c.verdict](c);
  $("[data-hello]").textContent = hi;
  $("[data-hello-soft]").textContent = soft;
  const lastWeek = c.trend.at(-2)?.rating;
  const delta = lastWeek == null ? null : c.rating - lastWeek;
  const move = delta == null ? "" : Math.abs(delta) < 0.005 ? "level with last week" : `${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(2)} on last week`;
  $("[data-lede]").textContent = `Your rating is ${c.signed}, ${move}. Your best ${c.w.work} of ${PERIOD_WORDS} did ${times(c.best.multiple)} your own typical.`;
  $("[data-made]").textContent = `${c.k.name} is a made-up ${c.spec.name}, rated live by the Orbe engine.`;
  $("[data-file]").textContent = `${c.k.handle.slice(1)}_rating.txt`;
  $("[data-band]").textContent = c.verdict;
  $("[data-band-note]").textContent = `Zero is typical for ${c.peers} with ${c.sizeBand}.`;
  $("[data-beats]").textContent = c.reachScore;
  $("[data-beats-note]").textContent = `Your reach beats ${c.reachScore} in 100 ${c.peers} your size: ${c.reachValue} on a typical ${c.w.work}.`;
  const first = c.trend.find((t) => t.rating !== null);
  const hiT = c.trend.reduce((a, t) => (t.rating !== null && t.rating > a.rating ? t : a), first);
  $("[data-trend-note]").textContent = `Eight weeks ago ${minus(signedN(first.rating))}. High ${minus(signedN(hiT.rating))} on ${dateOf(hiT.at)}.`;
  $("[data-trend]").innerHTML = trendSvg(c.trend);
  $("[data-score-cap]").textContent = `${RATING_LABEL}. Each point is the same ${c.w.works} rated as they stood that week. Rate again whenever you like.`;
  $(".yo-score").setAttribute("aria-label", `${c.k.name}, made up: rating ${c.signed}, ${c.verdict}. Reach beats ${c.reachScore} in 100 ${c.peers} your size.`);
  heroLevel(c);
  countUp($("[data-rating]"), c.rating, animate);
}

/* The level badge: level, points to the next, and what the last work added or cost. */
function heroLevel(c) {
  const L = c.level;
  const last = L.last;
  const moved = last ? `<a class="yo-lv-last" href="#work=${esc(last.id)}" data-ret="lv-${esc(last.id)}">“${esc(last.title)}”</a> ${last.move === 0 ? "held your points level" : `${last.move > 0 ? "added" : "cost"} ${delta(last.move, " pts")}`}` : "";
  $("[data-lv]").innerHTML = `<p class="yo-lv-badge" aria-hidden="true"><span class="yo-lv-k">Level</span><span class="yo-lv-n">${L.level}</span></p>
    <div class="yo-lv-say">
      <p class="yo-lv-top"><b>Level ${L.level}</b><span class="yo-lv-pts">${count(L.points)} pts</span><a class="yo-season-badge" href="#season">Season ${c.season.n}</a></p>
      <div class="yo-lv-bar" role="img" aria-label="${L.toNext == null ? "Top level" : `${L.into} of ${L.perLevel} points into level ${L.level}, ${L.toNext} to level ${L.level + 1}`}"><span style="--v:${L.toNext == null ? 100 : L.into}"></span></div>
      <p class="ob-note">${L.toNext == null ? "The top level." : `${L.toNext} points to level ${L.level + 1}.`} ${moved}</p>
    </div>`;
}

function countUp(el, target, animate) {
  cancelAnimationFrame(el._raf);
  const final = signedN(target);
  if (still || !animate) { el.textContent = final; return; }
  const t0 = performance.now();
  const dur = 600;
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const v = target * (1 - (1 - t) ** 3);
    el.textContent = t < 1 ? signedN(v) : final;
    if (t < 1) el._raf = requestAnimationFrame(tick);
  };
  el._raf = requestAnimationFrame(tick);
}

function trendSvg(trend) {
  const pts = trend.filter((t) => t.rating !== null);
  const w = 560, h = 132, pl = 34, pr = 14, pt = 14, pb = 26;
  const vals = pts.map((p) => p.rating);
  const lo = Math.min(...vals) - 0.35, hi = Math.max(...vals) + 0.35;
  const x = (i) => pl + (i * (w - pl - pr)) / Math.max(pts.length - 1, 1);
  const y = (v) => pt + ((hi - v) * (h - pt - pb)) / (hi - lo);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join("");
  const area = `${line}L${x(pts.length - 1).toFixed(1)},${y(lo).toFixed(1)}L${x(0).toFixed(1)},${y(lo).toFixed(1)}Z`;
  const guides = [[-0.8, ""], [0, ""], [0.8, ""], [2, ""]].filter(([v]) => v >= lo && v <= hi);
  const mid = (lo + hi) / 2;
  if (!guides.length) guides.push([Math.round(mid * 10) / 10, ""]);
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Rating each week: ${pts.map((p) => `${dateOf(p.at)} ${minus(signedN(p.rating))}`).join(", ")}." preserveAspectRatio="none">
    ${guides.map(([v, l]) => `<line class="yo-g${v === 0 ? " yo-g0" : ""}" x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="yo-ax" x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v === 0 ? "0" : minus(signedN(v, v % 1 ? 1 : 0))}</text>`).join("")}
    <path class="yo-area" d="${area}"/>
    <path class="yo-line" d="${line}"/>
    ${pts.map((p, i) => `<circle class="yo-dot${i === pts.length - 1 ? " yo-dot-now" : ""}" cx="${x(i).toFixed(1)}" cy="${y(p.rating).toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3}"><title>${dateOf(p.at)}: ${minus(signedN(p.rating))}</title></circle>`).join("")}
    ${[0, pts.length - 1].map((i) => `<text class="yo-ax" x="${x(i).toFixed(1)}" y="${h - 6}" text-anchor="${i ? "end" : "start"}">${i ? "Today" : dateOf(pts[i].at)}</text>`).join("")}
  </svg>`;
}

/* A small up or down delta: an arrow glyph (the system's arrow mask, turned) and the points. */
const delta = (d, unit = "") => d == null ? "" : d === 0
  ? `<span class="yo-d yo-d0"><span class="ob-sr">level</span>\u00b10${unit}</span>`
  : `<span class="yo-d ${d > 0 ? "yo-d-up" : "yo-d-dn"}"><span class="yo-d-a" aria-hidden="true"></span><span class="ob-sr">${d > 0 ? "up" : "down"} </span>${Math.abs(d)}${unit}</span>`;

/* ---------------------------------------------------------------- skills */
function skills(c) {
  $("[data-skills]").innerHTML = c.skills.map((s) => {
    const d = s.lastScore == null ? null : s.score - s.lastScore;
    const tag = s.top ? `<span class="yo-tag yo-tag-top">Your #1 stat</span>` : s.weak ? `<span class="yo-tag">Your lever</span>` : "";
    return `<li class="yo-skill">
      <div class="yo-skill-head">
        <h3 class="yo-skill-name">${esc(s.name)} ${tag}</h3>
        <p class="yo-skill-beats"><span class="yo-skill-n">${s.score}</span><span class="yo-skill-of">beats ${s.score} in 100</span>${delta(d)}</p>
      </div>
      <div class="yo-bar" role="img" aria-label="${esc(s.name)}: beats ${s.score} in 100 ${esc(c.peers)} your size. Typical is 50.">
        <span class="yo-bar-fill${s.score > 55 ? " yo-up" : s.score < 45 ? " yo-dn" : ""}" style="--v:${s.score}"></span>
        <span class="yo-bar-mid" aria-hidden="true"></span>
      </div>
      <p class="ob-note yo-skill-what"><b>${esc(s.value)}</b> against ${esc(s.typical)} typical at your size. ${esc(s.what)}</p>
    </li>`;
  }).join("");
}

/* ---------------------------------------------------------------- highlights */
function highlightCards(c) {
  const p = c.spec.work.primary;
  const cards = [];
  cards.push({
    id: "best", pair: "rec", work: c.best.workId, kicker: `Best of ${PERIOD_WORDS}`, fig: times(c.best.multiple), unit: `your typical ${c.w.work}`,
    title: c.best.work.title,
    line: `${count(c.best.work.metrics[p])} ${c.w.unit} against your typical ${count(c.best.typicalPrimary)}. Out since ${c.best.on}.`,
    share: { fig: times(c.best.multiple), unit: `my typical ${c.w.work}`, title: c.best.work.title },
  });
  if (c.quiet) {
    const q = c.quiet;
    cards.push({
      id: "quiet", pair: "note", work: q.workId, kicker: "The quiet one", fig: q.kind === "response" ? times(q.times) : times(q.multiple),
      unit: q.kind === "response" ? "your usual response" : `your typical ${c.w.work}`,
      title: q.work.title,
      line: q.kind === "response"
        ? `People answered it more than anything else lately, even without the biggest numbers.`
        : `Nobody made a fuss, and it still did ${times(q.multiple)} your typical. It is the one to look at twice.`,
      share: { fig: times(q.kind === "response" ? q.times : q.multiple), unit: q.kind === "response" ? "my usual response" : `my typical ${c.w.work}`, title: q.work.title },
    });
  }
  if (c.pb) {
    cards.push({
      id: "pb", pair: "spon", work: c.pb.workId, kicker: c.pb.on ? "Personal best" : "Your standing record", fig: count(c.pb.value), unit: c.pb.label,
      title: c.pb.work?.title ?? "",
      line: c.pb.on ? `Your previous best was ${count(c.pb.previous)}. It fell on ${c.pb.on}.` : `The best you have done. The one before it was ${count(c.pb.previous)}.`,
      share: { fig: count(c.pb.value), unit: c.pb.label, title: c.pb.work?.title ?? "", pb: true },
    });
  }
  cards.push({
    id: "streak", pair: "pod", kicker: "Streak", fig: `${c.weeks} ${c.weeks === 1 ? "week" : "weeks"}`, unit: `in a row with a new ${c.w.work}`,
    title: "",
    line: c.streak >= 3 ? `And your last ${c.streak} ${c.w.works} all landed at three quarters of your typical or better. That is a floor, and you built it.` : `Steady beats bursts. The rhythm is what the rating's cadence part reads.`,
    share: { fig: `${c.weeks} weeks`, unit: `in a row with a new ${c.w.work}`, title: "" },
  });
  return cards;
}

/* The last twelve works against your own typical (the line at 1\u00d7), this one marked. */
function strip(c, h) {
  const top = Math.max(2, ...c.recent.map((r) => r.m));
  return `<div class="yo-strip12">
    <div class="yo-strip12-bars" role="group" aria-label="Your last ${c.recent.length} ${esc(c.w.works)} against your typical, oldest first. Each opens its report.">${c.recent.map((r) => `<a href="#work=${esc(r.id)}" data-ret="strip-${esc(r.id)}" class="${r.id === c.best.workId ? "yo-on" : r.m >= 1 ? "yo-over" : ""}" style="--h:${((r.m / top) * 100).toFixed(1)}%" aria-label="“${esc(r.title)}”, ${times(r.m)} your typical. Open its report." title="${esc(r.title)}: ${times(r.m)}"></a>`).join("")}
      <i class="yo-strip12-one" style="--h:${((1 / top) * 100).toFixed(1)}%" aria-hidden="true"></i></div>
    <p class="yo-strip12-k" aria-hidden="true"><span>Your last ${c.recent.length} ${esc(c.w.works)}</span><span>1\u00d7 is your typical</span></p>
  </div>`;
}

function highlights(c) {
  const cards = highlightCards(c);
  $("[data-hl-soft]").textContent = `The best of ${PERIOD_WORDS}.`;
  $("[data-highlights]").innerHTML = cards.map((h) => `<article class="ob-win yo-hl-card" data-pair="${h.pair}" data-head="light">
      <div class="ob-win-bar"><span class="ob-win-title">${esc(h.kicker)}</span><button type="button" class="ob-win-btn ob-hit" data-share="${h.id}" aria-pressed="${h.id === shareWhich}">${h.id === shareWhich ? "On your card" : "Put on card"}</button></div>
      <div class="ob-win-body">
        <p class="yo-hl-fig num">${esc(h.fig)}</p>
        <p class="ob-k">${esc(h.unit)}</p>
        ${h.title ? `<h3 class="yo-hl-title">“${esc(h.title)}”</h3>` : ""}
        ${h.id === "best" ? strip(c, h) : ""}
        ${h.id === "streak" ? `<ol class="yo-weeks" aria-label="The last 12 weeks, oldest first: ${c.weekRow.map((n) => (n ? `${n} out` : "none")).join(", ")}.">${c.weekRow.map((n, i) => `<li class="${n ? "yo-wk-on" : ""}${i >= 12 - c.weeks ? " yo-wk-run" : ""}"><span class="ob-sr">${n}</span></li>`).join("")}</ol>` : ""}
        <p class="ob-note ob-win-end">${esc(h.line)}</p>
        ${h.work ? `<a class="ob-lnk ob-lnk--s yo-open" href="#work=${esc(h.work)}" data-ret="hl-${h.id}">Open the work report</a>` : ""}
      </div>
    </article>`).join("");
  for (const b of document.querySelectorAll("[data-share]")) b.addEventListener("click", () => {
    shareWhich = b.dataset.share;
    for (const o of document.querySelectorAll("[data-share]")) { const on = o === b; o.setAttribute("aria-pressed", String(on)); o.textContent = on ? "On your card" : "Put on card"; }
    share(C);
  });
}

/* ---------------------------------------------------------------- compare */
let current = "size";
const tabs = [...document.querySelectorAll("[data-cmp-tabs] [role=tab]")];
function setTab(v, focus = false) {
  current = v;
  for (const t of tabs) {
    const on = t.dataset.v === v;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    if (on) { $("[data-cmp]").setAttribute("aria-labelledby", t.id); if (focus) t.focus(); }
  }
  compare(C, v);
}
for (const t of tabs) t.addEventListener("click", () => setTab(t.dataset.v));
$("[data-cmp-tabs]").addEventListener("keydown", (e) => {
  const i = tabs.findIndex((t) => t.dataset.v === current);
  const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  let j = step ? (i + step + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
  if (j === null) return;
  e.preventDefault();
  setTab(tabs[j].dataset.v, true);
});

const pair = (name, a, b, la, lb, flip = false) => `<li class="yo-pair">
  <p class="yo-pair-name">${esc(name)} ${a != null && b != null ? delta(flip ? b - a : a - b) : ""}</p>
  <div class="yo-pair-bars">
    <span class="yo-pb yo-pb-them" style="--v:${b ?? 0}"><span class="ob-sr">${esc(lb)}: </span>${b ?? "n/a"}</span>
    <span class="yo-pb yo-pb-you" style="--v:${a ?? 0}"><span class="ob-sr">${esc(la)}: </span>${a ?? "n/a"}</span>
  </div>
</li>`;

function compare(c, v) {
  const el = $("[data-cmp]");
  if (v === "size") {
    const reach = c.compareSize.find((r) => r.key === "reach");
    const ahead = c.compareSize.filter((r) => r.score > 55).length;
    el.innerHTML = `<div class="yo-cmp-say">
        <p class="yo-cmp-big">You are ahead of typical on <b>${ahead} of ${c.compareSize.length}</b> parts.</p>
        <p class="ob-note">A typical ${esc(c.peers.replace(/s$/, ""))} with ${esc(c.sizeBand)} gets ${esc(reach.them)}. You get ${esc(reach.you)}.</p>
      </div>
      <div class="yo-tbl-wrap"><table class="yo-tbl">
        <caption class="ob-sr">You against typical at your size</caption>
        <thead><tr><th scope="col">Part</th><th scope="col">You</th><th scope="col">Typical at your size</th><th scope="col" class="yo-r">Beats in 100</th></tr></thead>
        <tbody>${c.compareSize.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td>${esc(r.you)}</td><td>${esc(r.them)}</td><td class="yo-r">${delta(r.score - 50)} <b class="${r.score > 55 ? "yo-good" : r.score < 45 ? "yo-low" : ""}">${r.score}</b></td></tr>`).join("")}</tbody>
      </table></div>`;
    return;
  }
  if (v === "past") {
    const then = c.last.then;
    const d = then == null ? null : c.rating - then;
    el.innerHTML = `<div class="yo-cmp-say">
        <p class="yo-cmp-big">${then == null ? "Five weeks ago there was not enough to rate yet." : `${minus(signedN(then))} then, <b>${c.signed}</b> now.`}</p>
        <p class="ob-note">${d == null ? "" : Math.abs(d) < 0.05 ? "Holding steady. Most stretches are, and that is fine." : d > 0 ? `Up ${d.toFixed(2)}. Whatever you changed, it shows.` : `Down ${Math.abs(d).toFixed(2)}. A softer stretch; the parts below show where.`} Each part is how many in 100 ${esc(c.peers)} your size you beat.</p>
        <p class="yo-key"><span class="yo-key-them">Five weeks ago</span><span class="yo-key-you">Now</span></p>
      </div>
      <ul class="yo-pairs">${c.last.rows.map((r) => pair(r.name, r.now, r.then, "Now", "Five weeks ago")).join("")}</ul>`;
    return;
  }
  const L = c.levelUp;
  if (!L) {
    el.innerHTML = `<div class="yo-cmp-say"><p class="yo-cmp-big">You are in the biggest size band there is for ${esc(c.peers)}.</p><p class="ob-note">From here, the only comparison left is you against you.</p></div>`;
    return;
  }
  const clears = L.yourTypical >= L.theirTypical;
  el.innerHTML = `<div class="yo-cmp-say">
      <p class="yo-cmp-big">The next size up is <b>${esc(L.label)}</b>.</p>
      <p class="ob-note">A typical ${esc(c.w.work)} there reaches ${esc(L.reachThem)}: about ${count(L.theirTypical)} ${esc(c.w.unit)} at ${L.at}. Yours get ${count(L.yourTypical)} today. ${clears ? "Your work already clears that bar. What is left is audience, and that follows the work." : "That is the gap to close, one work at a time."}</p>
      <dl class="yo-strip">
        <div><dt>${esc(c.spec.audienceNoun[0].toUpperCase() + c.spec.audienceNoun.slice(1))} to go</dt><dd>${count(L.audienceNeeded)}</dd></div>
        <div><dt>Your rating there, same habits</dt><dd>${L.rating == null ? "n/a" : `${minus(signedN(L.rating))} ${esc(L.band)}`}</dd></div>
      </dl>
      <p class="ob-note">Only the parts that depend on size move. The arrows show where you would land there.</p>
      <p class="yo-key"><span class="yo-key-them">At ${esc(L.label)}</span><span class="yo-key-you">At your size now</span></p>
    </div>
    <ul class="yo-pairs">${L.rows.map((r) => pair(r.name, r.now, r.then, "At your size now", `At ${L.label}`, true)).join("")}</ul>`;
}

/* ---------------------------------------------------------------- the season: level, challenges, rivals */
const dayMonth = (ms) => dateOf(new Date(ms).toISOString());
function season(c) {
  const S = c.season, L = c.level;
  $("[data-season-name]").textContent = `Season ${S.n}.`;
  const doneN = c.challenges.filter((x) => x.done).length;
  $("[data-chal-h]").textContent = `Three for this week · ${doneN} of 3 done`;
  $("[data-challenges]").innerHTML = c.challenges.map((x, i) => `<li class="yo-ch${x.done ? " yo-ch-done" : ""}">
      <p class="yo-ch-mark" aria-hidden="true">${x.done ? '<span class="yo-ch-tick"></span>' : i + 1}</p>
      <div class="yo-ch-say">
        <p class="yo-ch-state">${x.done ? '<span class="ob-chip">Done</span>' : x.tagged ? '<span class="ob-chip">Open · you tag it</span>' : '<span class="ob-chip">Open</span>'}<span class="yo-ch-from">From: ${esc(x.from)}</span></p>
        <h4 class="yo-ch-t">${esc(x.title)}</h4>
        <p class="ob-note">${x.done ? `Done by <a href="#work=${esc(x.done.id)}" data-ret="ch-${i}">${esc(x.done.why)}</a>` : esc(x.tip)}</p>
      </div>
    </li>`).join("");
  $("[data-pacing]").textContent = `${PACING_LINE} New three in ${c.weekEndsDays} ${c.weekEndsDays === 1 ? "day" : "days"}.`;
  const lc = S.levelChange, pc = S.pointsChange;
  $("[data-season]").innerHTML = `<div class="yo-ss">
      <p class="yo-ss-top"><span class="yo-season-badge yo-season-badge--lg">Season ${S.n}</span><span class="ob-note">${dayMonth(S.start)} to ${dayMonth(S.end - 86400000)} · ${S.daysLeft} days left</span></p>
      <dl class="yo-ss-dl">
        <div><dt>${esc(c.w.works[0].toUpperCase() + c.w.works.slice(1))}</dt><dd class="num">${S.works}</dd></div>
        <div><dt>Best</dt><dd class="num">${S.best ? `<a href="#work=${esc(S.best.id)}" data-ret="ss-best">${minus(signedN(S.best.rating))}</a>` : "n/a"}</dd></div>
        <div><dt>Level</dt><dd class="num">${lc === 0 ? `${L.level}` : `${S.startLevel} to ${L.level}`} ${delta(pc, " pts")}</dd></div>
      </dl>
      <p class="ob-note">${esc(LEVEL_RULE.line)}</p>
      <p class="ob-note">${esc(SEASON_RULE.line)} <span class="ob-chip" data-i="source">Benchmarks with the API</span></p>
    </div>
    <div class="yo-rv">
      <p class="yo-rv-h"><span class="yo-sub">Rivals</span><span class="ob-chips"><span class="ob-chip">Coming, opt-in</span><span class="ob-chip" data-i="record">Made up</span></span></p>
      <ul class="yo-rv-list" aria-label="Three anonymous ${esc(c.peers)} your size near your level">${c.rivals.map((r) => `<li><span class="yo-rv-who">A ${esc(c.peers.replace(/s$/, ""))} with ${esc(r.band)}</span><span class="yo-rv-lv">Level ${r.level}</span></li>`).join("")}</ul>
      <p class="ob-note">Only people who opt in, by size and level, never by name.</p>
    </div>`;
}

/* ---------------------------------------------------------------- levels */
function levels(c) {
  const s = c.sponsor;
  let spon;
  if (s.kind === "slots" && s.items.length) {
    const it = s.items[0];
    spon = {
      state: "open", stateText: "Open at your size", name: "Sponsorships", href: "../sponsorships/", cta: "Price a slot",
      say: `At your size, brands pay about <b>${gbp(it.low)} to ${gbp(it.high)}</b> for ${it.per === "hour" ? "an hour" : "a slot"}.`,
      note: `From what your last ${s.works} ${esc(c.w.works)} delivered. The brand pays our fee.`,
    };
  } else {
    spon = {
      state: "open", stateText: "Open at your size", name: "Licensing", href: "../sponsorships/", cta: "See how pricing works",
      say: `Your ${esc(s.noun)}s earned <b>${gbpExact(s.pence)}</b> in licences this year.`,
      note: "For photographers, licensing is the sponsorship.",
    };
  }
  const items = [
    spon,
    {
      state: "ready", stateText: "With the API", name: "The Record", href: "../diligence/", cta: "See a record",
      say: "Read from payouts, not estimates.",
      note: `Made-up example: YouTube estimated ${gbpExact(c.rec.estimate)}, AdSense paid <b>${gbpExact(c.rec.paid)}</b>.`,
    },
    {
      state: "later", stateText: "When you have a team", name: "Roster", href: "../roster/", cta: "See a roster",
      say: "Your manager sees you like this.",
      note: "Rated against your own size, with your rate card ready.",
    },
    {
      state: "later", stateText: "When it's time", name: "Selling", href: "../selling/", cta: "What's it worth",
      say: "Most people just like knowing what it's worth.",
      note: `Nothing to pay unless it sells. ${SELLING.tiers[0].pct}% to ${gbp(SELLING.tiers[0].upTo)}, ${gbp(SELLING.minimum)} minimum.`,
    },
  ];
  $("[data-levels]").innerHTML = items.map((l) => `<li class="yo-level" data-state="${l.state}">
      <p class="yo-level-state"><span class="yo-orb" aria-hidden="true"></span>${esc(l.stateText)}</p>
      <h3 class="ob-h3">${esc(l.name)}</h3>
      <p class="yo-level-say">${l.say}</p>
      <p class="ob-note">${l.note}</p>
      <a class="ob-lnk ob-lnk--s yo-level-a" href="${l.href}">${esc(l.cta)}</a>
    </li>`).join("");
}

/* ---------------------------------------------------------------- the share card */
function share(c) {
  let h = highlightCards(c).find((x) => x.id === shareWhich) ?? highlightCards(c)[0];
  if (shareWhich.startsWith("work:")) {
    const R = workReport(c, shareWhich.slice(5));
    if (R) h = { kicker: "Work report", share: { fig: R.signed, unit: `${R.band}, ${times(R.multiple ?? 0)} my typical ${c.w.work}`, title: R.title, work: true } };
  }
  const sh = h.share;
  const line = sh.work
    ? `${c.k.name}: “${sh.title}” rated ${sh.fig}, ${sh.unit}. Level ${c.level.level}, against ${c.peers} my size. ${RATING_LABEL}.`
    : sh.pb
    ? `${c.k.name}: new personal best, ${sh.unit} (${sh.fig}). Rated ${c.signed}, ${c.verdict}, against ${c.peers} my size. ${RATING_LABEL}.`
    : sh.title
      ? `${c.k.name}: “${sh.title}” did ${sh.fig} ${sh.unit}. Rated ${c.signed}, ${c.verdict}, against ${c.peers} my size. ${RATING_LABEL}.`
      : `${c.k.name}: ${sh.fig} ${sh.unit}. Rated ${c.signed}, ${c.verdict}, against ${c.peers} my size. ${RATING_LABEL}.`;
  $("[data-line]").textContent = line;
  $("[data-copied]").textContent = "";
  const cells = [[0, 3], [1, 3], [1, 2], [2, 3], [2, 2], [2, 1], [3, 3], [3, 2], [3, 1], [3, 0]];
  $("[data-card]").innerHTML = `<div class="yo-card-in">
      <div class="yo-card-top"><span class="yo-card-mark">${portalMarkup({ cls: "yo-card-portal" })}<span>Orbe</span></span><span class="ob-cue">${esc(h.kicker)}</span></div>
      <p class="yo-card-fig num">${esc(sh.fig)}</p>
      <p class="yo-card-unit">${esc(sh.unit)}</p>
      ${sh.title ? `<p class="yo-card-title">“${esc(sh.title)}”</p>` : ""}
      <div class="yo-card-foot">
        <p><b>${esc(c.k.name)}</b> ${esc(c.k.handle)}<br>Rated ${esc(c.signed)}, ${esc(c.verdict)}, against ${esc(c.peers)} my size.</p>
        <svg class="yo-lattice" viewBox="0 0 45.12 45.12" aria-hidden="true">${cells.map(([x, y]) => `<rect x="${x * 11.28 + 1}" y="${y * 11.28 + 1}" width="9.28" height="9.28" rx="1"/>`).join("")}</svg>
      </div>
      <p class="yo-card-label">${RATING_LABEL}. Made up.</p>
    </div>
    <figcaption class="ob-sr" id="yo-card-cap">A card to post: ${esc(line)}</figcaption>`;
}

$("[data-copy]").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const text = $("[data-line]").textContent;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.append(t); t.select();
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    t.remove();
  }
  const label = btn.querySelector("[data-label]");
  btn.style.minWidth = `${btn.offsetWidth}px`;
  label.textContent = ok ? "Copied" : "Select it above";
  $("[data-copied]").textContent = ok ? "Copied. Paste it anywhere." : "Your browser blocked copying. Select the line above and copy it by hand.";
  setTimeout(() => { label.textContent = "Copy the line"; btn.style.minWidth = ""; }, 1600);
});

/* ---------------------------------------------------------------- the work report */
const reportEl = $("[data-report]");
const heroEl = $(".yo-hero");
const bodyEl = $(".yo-body");
let openedFromPage = false;
let returnTo = null;

document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#work="]');
  if (!a || reportEl.contains(a)) return;
  openedFromPage = true;
  returnTo = { y: window.scrollY, ret: a.dataset.ret ?? null };
});

const lineSvgW = 560;
function weekSvg(R, c) {
  const pts = R.firstWeek;
  const w = lineSvgW, h = 168, pl = 12, pr = 12, pt = 24, pb = 30;
  const vals = pts.flatMap((p) => [p.you, p.usual]);
  const lo = Math.log(Math.min(...vals) * 0.8), hi = Math.log(Math.max(...vals) * 1.15);
  const x = (i) => pl + 40 + (i * (w - pl - pr - 80)) / (pts.length - 1);
  const y = (v) => pt + ((hi - Math.log(v)) * (h - pt - pb)) / (hi - lo);
  const path = (k) => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" preserveAspectRatio="none">
    ${pts.map((p, i) => `<line class="yo-g" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${pt - 10}" y2="${h - pb + 4}"/><text class="yo-ax" x="${x(i).toFixed(1)}" y="${h - 8}" text-anchor="middle">${p.label}</text>`).join("")}
    <path class="yo-wk-usual" d="${path("usual")}"/>
    <path class="yo-line" d="${path("you")}"/>
    ${pts.map((p, i) => `<circle class="yo-dot${p.reached ? " yo-dot-now" : " yo-dot-proj"}" cx="${x(i).toFixed(1)}" cy="${y(p.you).toFixed(1)}" r="5"/><circle class="yo-dot yo-dot-usual" cx="${x(i).toFixed(1)}" cy="${y(p.usual).toFixed(1)}" r="3"/>`).join("")}
  </svg>`;
}

function momentsSvg(M) {
  const w = lineSvgW, h = 132, pl = 4, pr = 4, pt = 22, pb = 6;
  const n = M.pts.length;
  const x = (i) => pl + (i * (w - pl - pr)) / (n - 1);
  const y = (v) => pt + ((100 - v) * (h - pt - pb)) / 100;
  if (M.frames) {
    const bw = (w - pl - pr) / n;
    const tops = new Set(M.top.map((t) => t.i));
    return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" preserveAspectRatio="none">${M.pts.map((v, i) => `<rect class="${tops.has(i) ? "yo-mo-on" : "yo-mo-bar"}" x="${(pl + i * bw + 3).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${(h - pb - y(v)).toFixed(1)}" rx="3"/>`).join("")}</svg>`;
  }
  const line = M.pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" preserveAspectRatio="none">
    <path class="yo-area" d="${line}L${x(n - 1).toFixed(1)},${h - pb}L${x(0).toFixed(1)},${h - pb}Z"/>
    <path class="yo-line" d="${line}"/>
    ${M.top.map((t, k) => `<line class="yo-mo-tick" x1="${x(t.i).toFixed(1)}" x2="${x(t.i).toFixed(1)}" y1="${pt - 14}" y2="${h - pb}"/><circle class="yo-dot yo-dot-now" cx="${x(t.i).toFixed(1)}" cy="${y(t.y).toFixed(1)}" r="5"/>`).join("")}
  </svg>`;
}

function statLine(l, R, c) {
  const tag = l.key === R.mvp ? '<span class="yo-tag yo-tag-top">MVP stat</span>' : l.key === R.held ? '<span class="yo-tag yo-tag-held">Held it back</span>' : "";
  const against = l.against === "own" ? "against your own" : `against ${c.peers} your size`;
  return `<li class="yo-sl" data-v="${l.verdict}">
    <div class="yo-sl-head">
      <h3 class="yo-sl-name">${esc(l.name)} ${tag}</h3>
      <p class="yo-sl-n">${l.score == null ? '<span class="yo-sl-of">not yet</span>' : `<span class="num">${l.score}</span><span class="yo-sl-of">in 100</span>`}</p>
    </div>
    ${l.score == null ? "" : `<div class="yo-bar" role="img" aria-label="${esc(l.name)}: beats ${l.score} in 100 ${against}. ${VERDICT_WORDS[l.verdict]}."><span class="yo-bar-fill yo-v-${l.verdict}" style="--v:${l.score}"></span><span class="yo-bar-mid" aria-hidden="true"></span></div>`}
    <p class="ob-note yo-sl-what">${l.score == null ? esc(l.note) : `<span class="yo-vchip yo-vchip-${l.verdict}">${VERDICT_WORDS[l.verdict]}</span> <b>${esc(l.value)}</b>, ${esc(l.typical)}.`}</p>
  </li>`;
}

function renderReport(id) {
  const c = C;
  const R = workReport(c, id);
  if (!R) return false;
  const t = (n) => `${count(n)}`;
  const pts = R.points;
  const reach = R.reach ? `<li><b class="num">${R.reach.score}</b><span>in 100 ${esc(c.peers)} your size beaten on reach</span></li>` : "";
  const fw = R.firstWeek;
  reportEl.innerHTML = `<div class="yo-wrap yo-rp">
    <nav class="yo-r-nav" aria-label="Work report">
      <button type="button" class="yo-r-back" data-r-back><span class="yo-r-arrow" aria-hidden="true"></span>Your Orbe</button>
      <p class="yo-r-step">${R.older ? `<a href="#work=${esc(R.older)}" data-r-step aria-label="Older ${esc(c.w.work)}">Older</a>` : ""}${R.newer ? `<a href="#work=${esc(R.newer)}" data-r-step aria-label="Newer ${esc(c.w.work)}">Newer</a>` : ""}</p>
    </nav>

    <header class="yo-r-head">
      <div class="yo-r-id">
        <p class="ob-cue">Work report · ${esc(c.k.name)} · out ${esc(R.on)}</p>
        <h1 class="ob-h2 yo-r-title" id="yo-r-title" tabindex="-1">“${esc(R.title)}”</h1>
        <p class="yo-made"><span class="ob-chip" data-i="record">Made up</span> <span>A made-up ${esc(c.w.work)}, rated live by the Orbe engine.</span></p>
      </div>
      <div class="yo-r-score">
        <div class="yo-r-big">
          <p class="ob-k">This ${esc(c.w.work)}’s rating</p>
          <p class="ob-figure yo-fig" data-r-fig>${esc(R.signed)}</p>
          <p class="yo-band"><b>${esc(R.band ?? "Not yet")}</b> Zero is your own typical ${esc(c.w.work)}.</p>
        </div>
        <ul class="yo-r-facts">
          <li><b class="num">${R.multiple == null ? "n/a" : times(R.multiple)}</b><span>your typical: ${t(R.primary)} ${esc(R.unit)} against ${t(R.typical ?? 0)}</span></li>
          ${reach}
          <li><b class="num">${R.rank ? `#${R.rank}` : "n/a"}</b><span>${R.rank ? `of your last ${R.of} ${esc(c.w.works)}` : `older than your last ${R.of}`}</span></li>
          <li><b class="num">${pts ? `${pts.move > 0 ? "+" : pts.move < 0 ? "−" : "±"}${Math.abs(pts.move)}` : "0"}</b><span>${pts ? `level points: scored ${R.score}, your level expected ${pts.expects}` : `level points: counts once it settles`}</span></li>
        </ul>
      </div>
    </header>

    <div class="yo-r-grid">
      <div class="yo-r-main">
        <section class="yo-r-sec" aria-labelledby="yo-r-lines">
          <div class="yo-r-sec-head"><h2 class="yo-r-h" id="yo-r-lines">Performance, line by line</h2><p class="ob-note">One line per part of the rating. Typical is 50; better than ${LINE_RULE.better} or below ${LINE_RULE.worse} is called out.</p></div>
          <ol class="yo-sls">${R.lines.map((l) => statLine(l, R, c)).join("")}</ol>
        </section>

        <section class="yo-r-sec" aria-labelledby="yo-r-week">
          <div class="yo-r-sec-head"><h2 class="yo-r-h" id="yo-r-week">The first week</h2><p class="ob-note">${fw ? `${esc(c.w.unit[0].toUpperCase() + c.w.unit.slice(1))} along the engine’s maturity curve, against your usual ${esc(c.w.work)}. Hourly readings come with the API.` : ""}</p></div>
          ${fw ? `<div class="yo-wk">
            <div class="yo-wk-chart">${weekSvg(R, c)}</div>
            <table class="yo-tbl yo-wk-tbl"><caption class="ob-sr">The first week against your usual</caption>
              <thead><tr><th scope="col">At</th><th scope="col">This ${esc(c.w.work)}</th><th scope="col">Your usual</th></tr></thead>
              <tbody>${fw.map((p) => `<tr><th scope="row">${p.label}</th><td>${t(p.you)}${p.reached ? "" : ' <span class="yo-proj">projected</span>'}</td><td>${t(p.usual)}</td></tr>`).join("")}</tbody>
            </table>
            <p class="yo-key"><span class="yo-key-you">This ${esc(c.w.work)}</span><span class="yo-key-them">Your usual</span></p>
          </div>` : `<p class="yo-r-empty">${esc(c.w.work[0].toUpperCase() + c.w.work.slice(1))} numbers are final when it ends, so there is no first-week curve to wait for.</p>`}
        </section>

        <section class="yo-r-sec" aria-labelledby="yo-r-mo">
          <div class="yo-r-sec-head"><h2 class="yo-r-h" id="yo-r-mo">Top moments</h2><p class="ob-chips"><span class="ob-chip" data-i="record">Made up</span><span class="ob-chip" data-i="source">With the API</span></p></div>
          <div class="yo-mo">
            <div class="yo-mo-chart">${momentsSvg(R.moments)}</div>
            <ol class="yo-mo-list">${R.moments.top.map((m) => `<li><b class="num">${esc(m.at)}</b><span>${m.y}% ${esc(R.moments.unit)}${R.moments.frames ? "" : `, up ${m.lift} points`}</span></li>`).join("")}</ol>
            <p class="ob-note">The parts that held people best. It needs the platform’s retention data, which only arrives with the API, so this shape is made up.</p>
          </div>
        </section>
      </div>

      <aside class="yo-r-side" aria-label="Awards, next time and sharing">
        <section class="yo-r-sec" aria-labelledby="yo-r-aw">
          <h2 class="yo-r-h" id="yo-r-aw">Awards</h2>
          ${R.awards.length ? `<ul class="yo-aw">${R.awards.map((a) => `<li class="yo-aw-i"><p class="yo-aw-n">${esc(a.name)}</p><p class="ob-note"><b>Why:</b> ${esc(a.why)}</p><p class="ob-note"><b>Next:</b> ${esc(a.next)}</p></li>`).join("")}</ul>` : `<p class="yo-r-empty">No award this time. A quiet ${esc(c.w.work)} costs nothing here, and the next one starts fresh.</p>`}
        </section>
        <section class="yo-r-sec" aria-labelledby="yo-r-next">
          <h2 class="yo-r-h" id="yo-r-next">Next time</h2>
          <ol class="yo-nx">${R.next.map((m) => `<li><p class="yo-move-t">${esc(m.title)}</p><p>${esc(m.body)}</p><p class="ob-note">Why: ${esc(m.why)}</p></li>`).join("")}</ol>
        </section>
        <section class="yo-r-sec yo-r-share" aria-labelledby="yo-r-sh">
          <h2 class="yo-r-h" id="yo-r-sh">Share as a card</h2>
          <p class="yo-line">${esc(R.shareLine)}</p>
          <button type="button" class="ob-btn" data-r-card><span class="ob-orb" aria-hidden="true"></span><span>Put it on your card</span></button>
        </section>
      </aside>
    </div>
    <p class="ob-note yo-r-print">${esc(RATING_LABEL)}. Lines against your size use the engine’s provisional baselines for ${esc(c.peers)} with ${esc(c.sizeBand)}; momentum and hit rate are against your own ${esc(c.w.works)}. ${esc(LEVEL_RULE.line)}</p>
  </div>`;
  reportEl.querySelector("[data-r-back]").addEventListener("click", closeToPage);
  for (const a of reportEl.querySelectorAll("[data-r-step]")) a.addEventListener("click", (e) => { e.preventDefault(); location.replace(a.getAttribute("href")); });
  reportEl.querySelector("[data-r-card]").addEventListener("click", () => {
    shareWhich = `work:${id}`;
    share(C);
    for (const o of document.querySelectorAll("[data-share]")) { o.setAttribute("aria-pressed", "false"); o.textContent = "Put on card"; }
    returnTo = { y: null, focus: "#yo-share-h" };
    closeToPage();
  });
  const fig = reportEl.querySelector("[data-r-fig]");
  if (R.rating != null) countUp(fig, R.rating, true);
  return true;
}

function closeToPage() {
  if (openedFromPage) { openedFromPage = false; history.back(); return; }
  history.pushState(null, "", location.pathname + location.search);
  route();
}

let reportOpen = false;
function route() {
  const m = /^#work=(.+)$/.exec(location.hash);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const kk = kindOfWork(id);
    if (kk) {
      if (C?.k.key !== kk) pick(kk, { animate: false });
      if (renderReport(id)) {
        reportOpen = true;
        heroEl.hidden = true; bodyEl.hidden = true; reportEl.hidden = false;
        document.title = `${C.byWork.get(id).title} · Your Orbe`;
        window.scrollTo({ top: 0, behavior: "instant" });
        reportEl.querySelector("#yo-r-title").focus({ preventScroll: true });
        return;
      }
    }
  }
  if (!reportOpen) return;
  reportOpen = false;
  openedFromPage = false;
  reportEl.hidden = true; reportEl.innerHTML = ""; heroEl.hidden = false; bodyEl.hidden = false;
  document.title = "Your Orbe";
  const back = returnTo; returnTo = null;
  if (back?.focus) { const el = $(back.focus); el?.setAttribute("tabindex", "-1"); el?.scrollIntoView({ block: "start" }); el?.focus({ preventScroll: true }); return; }
  if (back?.y != null) window.scrollTo({ top: back.y, behavior: "instant" });
  const el = back?.ret ? document.querySelector(`[data-ret="${CSS.escape(back.ret)}"]`) : null;
  if (el) el.focus({ preventScroll: true }); else if (!back) $("#main").scrollIntoView();
}
window.addEventListener("hashchange", route);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && reportOpen) { e.preventDefault(); closeToPage(); } });

/* ---------------------------------------------------------------- start */
const saved = store.get("orbe-you-kind");
const fromHash = location.hash.slice(1);
const first = KINDS.some((k) => k.key === fromHash) ? fromHash : KINDS.some((k) => k.key === saved) ? saved : KINDS[0].key;
pick(first, { animate: !/^#work=/.test(location.hash) });
route();
