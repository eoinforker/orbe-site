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
import { KINDS, creator, count, gbp, gbpExact, minus, times, FX_RATE, SELLING, RATING_LABEL, FIXTURE_NOW, PERIOD_WORDS } from "./you-data.js";

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
  moves(c);
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
  const move = delta == null ? "" : Math.abs(delta) < 0.005 ? "level with last Sunday" : `${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(2)} on last Sunday`;
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
  $("[data-score-cap]").textContent = `${RATING_LABEL}. Each Sunday is the same ${c.w.works} rated as they stood that day.`;
  $(".yo-score").setAttribute("aria-label", `${c.k.name}, made up: rating ${c.signed}, ${c.verdict}. Reach beats ${c.reachScore} in 100 ${c.peers} your size.`);
  countUp($("[data-rating]"), c.rating, animate);
}

let raf = 0;
function countUp(el, target, animate) {
  cancelAnimationFrame(raf);
  const final = signedN(target);
  if (still || !animate) { el.textContent = final; return; }
  const t0 = performance.now();
  const dur = 600;
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const v = target * (1 - (1 - t) ** 3);
    el.textContent = t < 1 ? signedN(v) : final;
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
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
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Rating each Sunday: ${pts.map((p) => `${dateOf(p.at)} ${minus(signedN(p.rating))}`).join(", ")}." preserveAspectRatio="none">
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
    id: "best", pair: "rec", kicker: `Best of ${PERIOD_WORDS}`, fig: times(c.best.multiple), unit: `your typical ${c.w.work}`,
    title: c.best.work.title,
    line: `${count(c.best.work.metrics[p])} ${c.w.unit} against your typical ${count(c.best.typicalPrimary)}. Out since ${c.best.on}.`,
    share: { fig: times(c.best.multiple), unit: `my typical ${c.w.work}`, title: c.best.work.title },
  });
  if (c.quiet) {
    const q = c.quiet;
    cards.push({
      id: "quiet", pair: "note", kicker: "The quiet one", fig: q.kind === "response" ? times(q.times) : times(q.multiple),
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
      id: "pb", pair: "spon", kicker: c.pb.on ? "Personal best" : "Your standing record", fig: count(c.pb.value), unit: c.pb.label,
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
  return `<div class="yo-strip12" role="img" aria-label="Your last ${c.recent.length} ${esc(c.w.works)} against your typical: ${c.recent.map((r) => times(r.m)).join(", ")}.">
    <div class="yo-strip12-bars">${c.recent.map((r) => `<span class="${r.id === c.best.workId ? "yo-on" : r.m >= 1 ? "yo-over" : ""}" style="--h:${((r.m / top) * 100).toFixed(1)}%" title="${esc(r.title)}: ${times(r.m)}"></span>`).join("")}
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

/* ---------------------------------------------------------------- next moves */
function moves(c) {
  $("[data-moves]").innerHTML = c.moves.map((m, i) => `<li class="yo-move">
    <p class="yo-move-n" aria-hidden="true">${i + 1}</p>
    <div class="yo-move-say">
      <div class="ob-chips">${m.api ? `<span class="ob-chip" data-i="source">With the API</span>` : `<span class="ob-chip" data-i="time">Works today</span>`}</div>
      <h3 class="yo-move-t">${esc(m.title)}</h3>
      <p>${esc(m.body)}</p>
      <p class="ob-note">Why: ${esc(m.why)}</p>
    </div>
  </li>`).join("");
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
  const h = highlightCards(c).find((x) => x.id === shareWhich) ?? highlightCards(c)[0];
  const sh = h.share;
  const line = sh.pb
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

/* ---------------------------------------------------------------- start */
const saved = store.get("orbe-you-kind");
const fromHash = location.hash.slice(1);
const first = KINDS.some((k) => k.key === fromHash) ? fromHash : KINDS.some((k) => k.key === saved) ? saved : KINDS[0].key;
pick(first, { animate: true });
