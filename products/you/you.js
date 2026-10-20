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
import { KINDS, creator, count, gbp, gbpExact, minus, times, FX_RATE, SELLING, RATING_LABEL, FIXTURE_NOW, PERIOD_WORDS, workReport, kindOfWork, LEVEL_RULE, SEASON_RULE, PACING_LINE, BANDS, BAND_LINE, THIN_RULE, BREAKDOWN_LINE, GAUGE_RULE, FOCUS_RULE, MEDIA_LINE, bandOf, seedOf } from "./you-data.js";
import { thumbURL, mountPlayer } from "./you-media.js";

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

/* The level badge: an arc that fills by level, in a cool-to-warm palette that never reaches red. */
function badgeSvg(level, tone, size = 64) {
  const r = 25, cx = 32, cy = 32, start = 210, sweep = Math.max(6, 300 * (level / 10));
  const pt = (a) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = pt(start), [x1, y1] = pt(start + sweep), [t1x, t1y] = pt(start + 300);
  return `<svg class="yo-badge yo-tone-${tone}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${cx}" cy="${cy}" r="31" class="yo-badge-disc"/>
    <path class="yo-badge-track" d="M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 1 1 ${t1x.toFixed(2)},${t1y.toFixed(2)}"/>
    <path class="yo-badge-arc" d="M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}"/>
    <text x="32" y="33" class="yo-badge-n" text-anchor="middle" dominant-baseline="central">${level}</text>
  </svg>`;
}
const LEVEL_TONES = ["t1", "t2", "t2", "t3", "t3", "t3", "t3", "t4", "t4", "t5"];

function heroLevel(c) {
  const L = c.level;
  const span = L.next == null ? 1 : L.next - L.from;
  const into = L.next == null ? 1 : (L.points - L.from) / span;
  const last = L.last;
  const nextLv = Math.min(10, L.level + 1);
  $("[data-lv]").innerHTML = `${badgeSvg(L.level, L.tone)}
    <div class="yo-lv-say">
      <p class="yo-lv-top"><b>Level ${L.level}</b><span class="yo-lv-pts num">${count(L.points)}${L.next == null ? "" : ` / ${count(L.next)}`}</span><a class="yo-season-badge" href="#season">Season ${c.season.n}</a></p>
      <div class="yo-lv-row">
        <div class="yo-lv-bar" role="img" aria-label="${L.next == null ? "Top level" : `${count(L.points)} of ${count(L.next)} craft points: ${count(L.next - L.points)} to level ${nextLv}`}"><span style="--v:${(into * 100).toFixed(1)}"></span></div>
        ${L.next == null ? "" : `<span class="yo-lv-next" title="Level ${nextLv}">${badgeSvg(nextLv, LEVEL_TONES[nextLv - 1], 26)}</span>`}
      </div>
      <p class="ob-note">${last ? `<a class="yo-lv-last" href="#work=${esc(last.id)}" data-ret="lv-${esc(last.id)}">\u201c${esc(last.title)}\u201d</a> added <b>+${last.cp}</b> craft points. ` : ""}Craft points only go up.</p>
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

/* A band, in words first and colour second. The middle band carries no colour. */
const bandChip = (b) => `<span class="yo-band-chip" data-band="${b.key}">${esc(b.short)}</span>`;
const thumb = (c, id, px = 6, cls = "") => `<img class="yo-th ${cls}" src="${thumbURL(c.k.kind, seedOf(id), px)}" alt="" decoding="async">`;

/* ---------------------------------------------------------------- skills */
function skills(c) {
  $("[data-skills]").innerHTML = c.skills.map((s) => {
    const d = s.lastScore == null ? null : s.score - s.lastScore;
    const tag = s.top ? `<span class="yo-tag yo-tag-top">Your #1 stat</span>` : c.focusArea?.key === s.key ? `<span class="yo-tag">Your focus</span>` : "";
    const b = bandOf(s.score, c.thinCreator);
    return `<li class="yo-skill">
      <div class="yo-skill-head">
        <h3 class="yo-skill-name">${esc(s.name)} ${tag}</h3>
        <p class="yo-skill-beats"><span class="yo-skill-n">${s.score}</span><span class="yo-skill-of">beats ${s.score} in 100</span>${delta(d)}</p>
      </div>
      <div class="yo-bar" role="img" aria-label="${esc(s.name)}: beats ${s.score} in 100 ${esc(c.peers)} your size, ${b.word.toLowerCase()}.">
        <span class="yo-bar-fill" data-band="${b.key}" style="--v:${s.score}"></span>
        <span class="yo-bar-mid" aria-hidden="true"></span>
      </div>
      <p class="ob-note yo-skill-what">${bandChip(b)} <b>${esc(s.value)}</b> against ${esc(s.typical)} typical at your size. ${esc(s.what)}</p>
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
    id: "streak", pair: "pod", kicker: "Your floor", fig: `${c.streak} in a row`, unit: `at three quarters of your typical or better`,
    title: "",
    line: c.streak >= 3 ? `Your last ${c.streak} ${c.w.works} all held your floor. A run of quality, not of posting, and you built it.` : `Floors grow one work at a time. Your next ${c.w.work} starts the run.`,
    share: { fig: `${c.streak} in a row`, unit: `${c.w.works} at my own floor or better`, title: "" },
  });
  return cards;
}

/* The last twelve works as thumbnails, each with its rating against your size, coloured by band. */
function thumbsRow(c) {
  const rows = c.recent.map((r) => c.byWork.get(r.id)).filter(Boolean);
  $("[data-thumbs]").innerHTML = `<p class="yo-thumbs-k"><span class="yo-sub">Your last ${rows.length} ${esc(c.w.works)}, oldest first</span><span class="ob-chip" data-i="record">Made-up pictures</span></p>
    <ol class="yo-thumbs-row">${rows.map((x) => `<li><a class="yo-tw" href="#work=${esc(x.id)}" data-ret="strip-${esc(x.id)}" aria-label="\u201c${esc(x.title)}\u201d, rated ${x.rating == null ? "too early to say" : minus(signedN(x.rating))}, ${esc(x.band.word.toLowerCase())}. Open its report.">
      ${thumb(c, x.id, 5)}
      <span class="yo-tw-r num" data-band="${x.band.key}">${x.rating == null ? "new" : minus(signedN(x.rating))}</span>
    </a></li>`).join("")}</ol>`;
}

function highlights(c) {
  thumbsRow(c);
  const cards = highlightCards(c);
  $("[data-hl-soft]").textContent = `The best of ${PERIOD_WORDS}.`;
  $("[data-highlights]").innerHTML = cards.map((h) => `<article class="ob-win yo-hl-card" data-pair="${h.pair}" data-head="light">
      <div class="ob-win-bar"><span class="ob-win-title">${esc(h.kicker)}</span><button type="button" class="ob-win-btn ob-hit" data-share="${h.id}" aria-pressed="${h.id === shareWhich}">${h.id === shareWhich ? "On your card" : "Put on card"}</button></div>
      <div class="ob-win-body">
        <p class="yo-hl-fig num">${esc(h.fig)}</p>
        <p class="ob-k">${esc(h.unit)}</p>
        ${h.title ? `<h3 class="yo-hl-title">“${esc(h.title)}”</h3>` : ""}
        ${h.work ? `<a class="yo-hl-th" href="#work=${esc(h.work)}" tabindex="-1" aria-hidden="true">${thumb(c, h.work, h.id === "best" ? 12 : 6)}</a>` : ""}
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
  if (v === "form") {
    // Recent form: your last five works against your last thirty, line by line, against your own usual.
    const up = c.form.filter((f) => f.delta != null && f.delta >= 5).length, dn = c.form.filter((f) => f.delta != null && f.delta <= -5).length;
    const ids = c.recentSettled;
    el.innerHTML = `<div class="yo-cmp-say">
        <p class="yo-cmp-big">Your last ${ids.length} against your last ${Math.min(30, c.workList.filter((x) => x.settled).length)}: <b>${up} up</b>, <b>${dn} down</b>, the rest level.</p>
        <p class="ob-note">Each figure is the middle score of those ${esc(c.w.works)} on that line, in 100 ${esc(c.peers)} your size (momentum and hit rate against your own). A move of under 5 reads as level.</p>
        <ol class="yo-form-th">${ids.map((id) => { const x = c.byWork.get(id); return `<li><a href="#work=${esc(id)}" data-ret="form-${esc(id)}" aria-label="\u201c${esc(x.title)}\u201d: open its report">${thumb(c, id, 3)}</a></li>`; }).join("")}</ol>
      </div>
      <div class="yo-tbl-wrap"><table class="yo-tbl yo-form">
        <caption class="ob-sr">Recent form: your last ${ids.length} works against your last 30</caption>
        <thead><tr><th scope="col">Line</th><th scope="col">Last 30</th><th scope="col">Last ${ids.length}</th><th scope="col" class="yo-r">Form</th></tr></thead>
        <tbody>${c.form.map((f) => `<tr><th scope="row">${esc(f.name)}</th><td>${f.usual ?? "n/a"}</td><td>${f.recent ?? "n/a"}</td><td class="yo-r">${f.delta == null ? "n/a" : Math.abs(f.delta) < 5 ? '<span class="yo-d yo-d0"><span class="ob-sr">level</span>level</span>' : delta(f.delta)}</td></tr>`).join("")}</tbody>
      </table></div>`;
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

/* ---------------------------------------------------------------- the season: this month, your focus, the recap */
const dayMonth = (ms) => dateOf(new Date(ms).toISOString());
let ssCurrent = "month";
const ssTabs = [...document.querySelectorAll("[data-ss-tabs] [role=tab]")];
function setSsTab(v, focus = false) {
  ssCurrent = v;
  for (const t of ssTabs) {
    const on = t.dataset.v === v;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    if (on) { $("[data-ss]").setAttribute("aria-labelledby", t.id); if (focus) t.focus(); }
  }
  season(C);
}
for (const t of ssTabs) t.addEventListener("click", () => setSsTab(t.dataset.v));
$("[data-ss-tabs]").addEventListener("keydown", (e) => {
  const i = ssTabs.findIndex((t) => t.dataset.v === ssCurrent);
  const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  const j = step ? (i + step + ssTabs.length) % ssTabs.length : e.key === "Home" ? 0 : e.key === "End" ? ssTabs.length - 1 : null;
  if (j === null) return;
  e.preventDefault();
  setSsTab(ssTabs[j].dataset.v, true);
});

function season(c) {
  const S = c.season;
  $("[data-season-name]").textContent = `Season ${S.n}.`;
  const el = $("[data-ss]");
  if (ssCurrent === "month") {
    const M = c.mission;
    const done = M.steps.filter((x) => x.done).length;
    el.innerHTML = `<div class="yo-ms">
        <div class="yo-ms-head"><h3 class="yo-ms-t">${esc(M.name)}</h3><p class="ob-note"><b class="num">${done} of ${M.steps.length}</b> done, any order · ${M.daysLeft} days left · the same five for every creator</p></div>
        <ol class="yo-ms-steps">${M.steps.map((x, i) => `<li class="yo-ms-step${x.done ? " is-done" : ""}">
          <span class="yo-ms-mark" aria-hidden="true">${x.done ? '<span class="yo-ch-tick"></span>' : i + 1}</span>
          <div class="yo-ms-say">
            <p class="yo-ms-st">${esc(x.title)} <span class="yo-ms-state">${x.done ? "Done" : x.tagged ? "Open · you tag it" : "Open"}</span></p>
            ${x.done ? `<p class="ob-note"><a href="#work=${esc(x.done.id)}" data-ret="ms-${i}">${esc(x.done.why)}</a></p>` : ""}
          </div>
        </li>`).join("")}</ol>
        <p class="ob-note yo-ms-pace">${esc(PACING_LINE)} <span class="ob-chip" data-i="record">Reflections and tags are made up</span></p>
      </div>`;
    return;
  }
  if (ssCurrent === "focus") {
    const F = c.focusArea;
    el.innerHTML = `<div class="yo-fc">
        ${F ? `<div class="yo-fc-card">
          ${F.cheer ? `<p class="yo-fc-cheer">You hit your goal for ${esc(F.cheer.name.toLowerCase())}: ${F.cheer.from} to ${F.cheer.to} in 100. Nice work. We’ve swapped in the next one.</p>` : ""}
          <p class="yo-sub">Your focus, one at a time</p>
          <h3 class="yo-fc-t">${esc(F.name)}</h3>
          <div class="yo-fc-goal">
            <p><b class="num">${F.score}</b><span>now, ${esc(F.band.word.toLowerCase())}</span></p>
            <span class="yo-fc-arrow" aria-hidden="true"></span>
            <p><b class="num">${F.goal}</b><span>the goal: ${esc(F.goalBand.word.toLowerCase())}</span></p>
          </div>
          <p>${esc(F.advice)}</p>
          <details class="yo-fc-why"><summary>Why this one?</summary>
            <p class="ob-note">It has the most to gain: weight ${F.importance} × applies to ${Math.round(F.relevance * 100)}% of your ${esc(c.w.works)} × a gap of ${F.gap} to the next band. ${F.ranked[1] ? `Next in line: ${esc(F.ranked[1].name.toLowerCase())}.` : ""} How it is measured: ${esc(F.what)}</p>
            <p class="ob-note">${esc(FOCUS_RULE.line)}</p>
          </details>
        </div>` : `<div class="yo-fc-card"><h3 class="yo-fc-t">Nothing to fix right now.</h3><p>Every part a single work can move is already in its top band for ${esc(c.peers)} your size.</p></div>`}
        <div class="yo-st">
          <p class="yo-sub">Your strengths</p>
          ${c.strengths.length ? `<ul class="yo-st-list">${c.strengths.map((x) => `<li class="yo-st-b"><b>${esc(x.name)}</b><span>${esc(x.line)} ${x.score} in 100.</span></li>`).join("")}</ul>` : `<p class="ob-note">A strength appears here when a part reaches above typical for your size.</p>`}
          <p class="ob-note">Strengths are who you are across your work, not prizes for one ${esc(c.w.work)}.</p>
        </div>
      </div>`;
    return;
  }
  const I = S.identity;
  el.innerHTML = `<div class="yo-rc">
      <div class="yo-rc-id">
        <p class="yo-sub">Season ${S.n}, ${S.year} so far</p>
        <p class="yo-rc-name">This season you were <b>${esc(I.name)}</b>.</p>
        <p class="ob-note">${esc(I.line)}</p>
        <dl class="yo-ss-dl">
          <div><dt>${esc(c.w.works[0].toUpperCase() + c.w.works.slice(1))}</dt><dd class="num">${S.works}</dd></div>
          <div><dt>Season high</dt><dd class="num">${S.high ? `<a href="#work=${esc(S.high.id)}" data-ret="ss-high">${minus(signedN(S.high.rating))}</a>` : "n/a"}</dd></div>
          <div><dt>Levels gained</dt><dd class="num">+${S.levelsGained}</dd></div>
        </dl>
        <button type="button" class="ob-btn yo-rc-card" data-recap-card><span class="ob-orb" aria-hidden="true"></span><span>Put the recap on your card</span></button>
      </div>
      <div class="yo-rc-vs">
        <p class="yo-sub">You against your own best season</p>
        <table class="yo-tbl yo-seasons"><caption class="ob-sr">Your seasons: works, the middle rating and the season high</caption>
          <thead><tr><th scope="col">Season</th><th scope="col">${esc(c.w.works[0].toUpperCase() + c.w.works.slice(1))}</th><th scope="col">Middle</th><th scope="col" class="yo-r">High</th></tr></thead>
          <tbody>${[...S.all].reverse().map((x) => `<tr${x.current ? ' class="is-now"' : ""}><th scope="row">Season ${x.n}, ${x.year}${x.current ? " (now)" : x.best ? " (best)" : ""}</th><td>${x.count}</td><td>${x.median == null ? "n/a" : minus(signedN(x.median))}</td><td class="yo-r">${x.high ? minus(signedN(x.high.rating)) : "n/a"}</td></tr>`).join("")}</tbody>
        </table>
        <p class="ob-note">${S.best && S.median != null ? (S.median > S.best.median ? `So far this season beats your best, Season ${S.best.n} (${minus(signedN(S.best.median))} in the middle).` : `Your best is Season ${S.best.n}, ${minus(signedN(S.best.median))} in the middle. This season has ${S.daysLeft} days to go.`) : "Your first full season becomes the one to beat."} Season highs are kept for good.</p>
        <p class="ob-note">${esc(SEASON_RULE.line)} <span class="ob-chip" data-i="source">Benchmarks with the API</span></p>
      </div>
    </div>`;
  el.querySelector("[data-recap-card]").addEventListener("click", () => {
    shareWhich = "recap";
    for (const o of document.querySelectorAll("[data-share]")) { o.setAttribute("aria-pressed", "false"); o.textContent = "Put on card"; }
    share(C);
    const h = $("#yo-share-h"); h.setAttribute("tabindex", "-1"); h.scrollIntoView({ block: "start" }); h.focus({ preventScroll: true });
  });
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
  if (shareWhich === "recap") {
    h = { kicker: `Season ${c.season.n} recap`, share: { fig: c.season.identity.name, unit: c.season.identity.line, title: "", recap: true } };
  }
  if (shareWhich.startsWith("work:")) {
    const R = workReport(c, shareWhich.slice(5));
    if (R) h = { kicker: "Work report", share: { fig: R.signed, unit: `${R.band.word}, against ${c.peers} my size`, title: R.title, work: true, id: R.id } };
  }
  const sh = h.share;
  const line = sh.recap
    ? `${c.k.name}: this season I was ${sh.fig}. ${sh.unit} Level ${c.level.level}. ${RATING_LABEL}.`
    : sh.work
    ? `${c.k.name}: “${sh.title}” rated ${sh.fig}, ${sh.unit.toLowerCase()}. ${RATING_LABEL}.`
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
      ${sh.work ? `<img class="yo-card-th" src="${thumbURL(c.k.kind, seedOf(sh.id), 8)}" alt="Made-up picture for \u201c${esc(sh.title)}\u201d">` : ""}
      <p class="yo-card-fig num${sh.recap ? " yo-card-fig--word" : ""}">${esc(sh.fig)}</p>
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

/* Where the result came from: each line's signed share of the rating, positive right, negative left. */
function breakdownHtml(R, c) {
  const used = R.lines.filter((l) => l.contribution != null);
  const max = Math.max(0.2, ...used.map((l) => Math.abs(l.contribution)));
  const sorted = [...used].sort((a, b) => b.contribution - a.contribution);
  return `<ol class="yo-bd" aria-label="Each line's share of the rating, adding up to ${esc(R.signed)}">${sorted.map((l) => {
    const w = (Math.abs(l.contribution) / max) * 50;
    return `<li class="yo-bd-row"><span class="yo-bd-name">${esc(l.name)}</span><span class="yo-bd-track" aria-hidden="true"><span class="yo-bd-bar ${l.contribution >= 0 ? "is-plus" : "is-minus"}" style="--w:${w.toFixed(1)}%"></span></span><span class="yo-bd-v num">${l.contribution === 0 ? "0.00" : minus(signedN(l.contribution))}</span></li>`;
  }).join("")}
    <li class="yo-bd-row yo-bd-total"><span class="yo-bd-name">The rating</span><span class="yo-bd-track" aria-hidden="true"></span><span class="yo-bd-v num">${esc(R.signed)}</span></li>
  </ol>`;
}

/* The consistency gauge: this work against your own spread. */
function gaugeSvg(pos) {
  const r = 46, cx = 60, cy = 56;
  const pt = (f) => { const a = Math.PI * (1 - f); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const arc = (f0, f1) => { const [x0, y0] = pt(f0), [x1, y1] = pt(f1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
  const [nx, ny] = pt(pos);
  return `<svg class="yo-gauge" viewBox="0 0 120 64" aria-hidden="true">
    <path class="yo-gauge-lo" d="${arc(0, 0.3)}"/><path class="yo-gauge-mid" d="${arc(0.3, 0.7)}"/><path class="yo-gauge-hi" d="${arc(0.7, 1)}"/>
    <line class="yo-gauge-needle" x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"/><circle cx="${cx}" cy="${cy}" r="4" class="yo-gauge-hub"/>
  </svg>`;
}

function statLine(l, R, c) {
  const tag = l.key === R.mvp ? '<span class="yo-tag yo-tag-top">MVP stat</span>' : l.key === R.held ? '<span class="yo-tag yo-tag-held">Held it back</span>' : "";
  const against = l.against === "own" ? "against your own" : `against ${c.peers} your size`;
  return `<li class="yo-sl">
    <div class="yo-sl-head">
      <h3 class="yo-sl-name">${esc(l.name)} ${tag}</h3>
      <p class="yo-sl-n">${l.score == null ? '<span class="yo-sl-of">too early</span>' : `<span class="num">${l.score}</span><span class="yo-sl-of">in 100</span>`}</p>
    </div>
    ${l.score == null ? "" : `<div class="yo-bar" role="img" aria-label="${esc(l.name)}: beats ${l.score} in 100 ${against}, ${esc(l.band.word.toLowerCase())}."><span class="yo-bar-fill" data-band="${l.band.key}" style="--v:${l.score}"></span><span class="yo-bar-mid" aria-hidden="true"></span></div>`}
    <p class="ob-note yo-sl-what">${l.score == null ? esc(l.note) : `${bandChip(l.band)} <b>${esc(l.value)}</b>, ${esc(l.typical)}${l.against === "own" ? " (against your own)" : ""}.${l.band.thinned ? " Too few works to call it low." : ""}`}</p>
  </li>`;
}

let player = null;
function renderReport(id) {
  const c = C;
  const R = workReport(c, id);
  if (!R) return false;
  player?.destroy(); player = null;
  const t = (n) => `${count(n)}`;
  const fw = R.firstWeek;
  const cp = R.cp;
  const cpParts = [["shipped", cp.ship], ["reflection", cp.reflect], ["experiment", cp.experiment], ["beat your size", cp.beat]].filter(([, v]) => v > 0);
  reportEl.innerHTML = `<div class="yo-wrap yo-rp">
    <nav class="yo-r-nav" aria-label="Work report">
      <button type="button" class="yo-r-back" data-r-back><span class="yo-r-arrow" aria-hidden="true"></span>Your Orbe</button>
      <p class="yo-r-step">${R.older ? `<a href="#work=${esc(R.older)}" data-r-step aria-label="Older ${esc(c.w.work)}">Older</a>` : ""}${R.newer ? `<a href="#work=${esc(R.newer)}" data-r-step aria-label="Newer ${esc(c.w.work)}">Newer</a>` : ""}</p>
    </nav>
    <div class="yo-r-id">
      <p class="ob-cue">Work report · ${esc(c.k.name)} · out ${esc(R.on)}</p>
      <h1 class="ob-h2 yo-r-title" id="yo-r-title" tabindex="-1">“${esc(R.title)}”</h1>
    </div>

    <div class="yo-r-top">
      <section class="yo-r-player" aria-label="The work, made up" data-player></section>
      <div class="yo-r-score">
        <div class="yo-r-big">
          <p class="ob-k">Rating against ${esc(c.peers)} your size</p>
          <p class="ob-figure yo-fig" data-r-fig>${esc(R.signed)}</p>
          <p class="yo-band">${bandChip(R.band)} <span>Zero is typical for ${esc(c.peers)} with ${esc(c.sizeBand)}.</span></p>
        </div>
        <div class="yo-r-own">
          ${R.gaugePos == null ? "" : gaugeSvg(R.gaugePos)}
          <p><b>${esc(R.gauge ?? "Too early to say")}</b> <span class="ob-note">against your own usual: ${R.multiple == null ? "n/a" : `${times(R.multiple)} your typical`}, ${t(R.primary)} ${esc(R.unit)} against ${t(R.typical ?? 0)}.</span></p>
        </div>
        <ul class="yo-r-facts">
          <li><b class="num">${R.rank ? `#${R.rank}` : "n/a"}</b><span>${R.rank ? `of your last ${R.of} ${esc(c.w.works)}` : `older than your last ${R.of}`}</span></li>
          <li><b class="num">+${cp.total}</b><span>craft points: ${cpParts.map(([k, v]) => `${v} ${k}`).join(", ") || "none this week"}${cp.taper < 1 ? ` (${cp.nth}th work of its week, at ${cp.taper * 100}%)` : ""}</span></li>
        </ul>
      </div>
    </div>

    <div class="yo-r-grid">
      <div class="yo-r-main">
        <section class="yo-r-sec" aria-labelledby="yo-r-bd">
          <div class="yo-r-sec-head"><h2 class="yo-r-h" id="yo-r-bd">Where the result came from</h2><p class="ob-note">${esc(BREAKDOWN_LINE)}</p></div>
          ${R.rating == null ? `<p class="yo-r-empty">Too early to say: this ${esc(c.w.work)} is still settling.</p>` : breakdownHtml(R, c)}
        </section>
        <section class="yo-r-sec" aria-labelledby="yo-r-lines">
          <div class="yo-r-sec-head"><h2 class="yo-r-h" id="yo-r-lines">Line by line</h2><p class="ob-note">${esc(BAND_LINE)}</p></div>
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
      </div>

      <aside class="yo-r-side" aria-label="Awards, next time, your notes and sharing">
        <section class="yo-r-sec" aria-labelledby="yo-r-aw">
          <h2 class="yo-r-h" id="yo-r-aw">Awards</h2>
          ${R.awards.length ? `<ul class="yo-aw">${R.awards.map((a) => `<li class="yo-aw-i"><p class="yo-aw-n">${esc(a.name)}</p><p class="ob-note"><b>Why:</b> ${esc(a.why)}</p><p class="ob-note"><b>Next:</b> ${esc(a.next)}</p></li>`).join("")}</ul>` : `<p class="yo-r-empty">No award this time. A quiet ${esc(c.w.work)} costs nothing here, and your craft points still went up.</p>`}
        </section>
        <section class="yo-r-sec" aria-labelledby="yo-r-next">
          <h2 class="yo-r-h" id="yo-r-next">Next time</h2>
          <ol class="yo-nx">${R.next.map((m) => `<li><p class="yo-move-t">${esc(m.title)}</p><p>${esc(m.body)}</p><p class="ob-note">Why: ${esc(m.why)}</p></li>`).join("")}</ol>
        </section>
        <section class="yo-r-sec" aria-labelledby="yo-r-j">
          <h2 class="yo-r-h" id="yo-r-j">Your notes</h2>
          <dl class="yo-jn">
            <div><dt>Experiment</dt><dd>${R.journal.experiment ? esc(R.journal.experiment) : '<span class="ob-note">None declared. Declaring one before you post earns 5 craft points, whatever the result.</span>'}</dd></div>
            <div><dt>Reflection</dt><dd>${R.journal.reflect ? `“${esc(R.journal.reflect)}”` : '<span class="ob-note">None yet. One line on what you tried earns 5 craft points.</span>'}</dd></div>
          </dl>
          <p class="ob-chips"><span class="ob-chip" data-i="record">Made up</span></p>
        </section>
        <section class="yo-r-sec yo-r-share" aria-labelledby="yo-r-sh">
          <h2 class="yo-r-h" id="yo-r-sh">Share as a card</h2>
          <p class="yo-line">${esc(R.shareLine)}</p>
          <button type="button" class="ob-btn" data-r-card><span class="ob-orb" aria-hidden="true"></span><span>Put it on your card</span></button>
        </section>
      </aside>
    </div>
    <p class="ob-note yo-r-print">${esc(RATING_LABEL)}. Lines against your size use the engine’s provisional baselines for ${esc(c.peers)} with ${esc(c.sizeBand)}; momentum and hit rate are against your own ${esc(c.w.works)}. ${esc(GAUGE_RULE.line)} ${esc(THIN_RULE.line)} ${esc(MEDIA_LINE)}</p>
  </div>`;
  player = mountPlayer(reportEl.querySelector("[data-player]"), { media: R.media, moments: R.moments, title: R.title, work: c.w.work, still });
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
  player?.destroy(); player = null;
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
