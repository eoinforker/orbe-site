/*
  r5-4, Not the top 1%.
  One state (the kind of work) drives everything on the page: the crowd in the
  hero, the rating section, the maths, the record and the benchmark. The mark
  on the crowd travels to the example's place among creators its size whenever
  the kind changes, and its number is the rating, so the diagram and the words
  can never disagree. The far right tail of the same curve is the top 1%: the
  crowd the headline says you are not measured against.
*/
import { ORDER, example, mathsFor, benchmark, EXAMPLE_LINE, verdict, signed } from "/assets/r5/examples.js";
import { reserve, cleanHandle } from "/assets/r5/reserve.js";
import { SELLER_FEE, PRICES } from "/assets/r5/terms.js";
import { value, gbp } from "/assets/js/valuation.js";
import { mountWordmark } from "/assets/r5/wordmark.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const still = () => reduce.matches;
const minus = (n) => (n < 0 ? "−" : n > 0 ? "+" : "") + Math.abs(n);
const svgEl = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const SINGULAR = { channel: "channel", newsletter: "newsletter", stream: "stream", podcast: "podcast", portfolio: "photographer" };
const PLATFORM = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "podcasts", portfolio: "photography" };
const peerLine = (d) => `${d.peers} with ${d.sizeBand}`;
const pct = (x) => `${+(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

const state = { kind: "channel", shown: 0, target: 0 };
const data = Object.fromEntries(ORDER.map((k) => [k, example(k)]));

$$("[data-example]").forEach((p) => (p.textContent = EXAMPLE_LINE));

/* A quiet crossfade in place: the old words never leave an empty frame. */
function fade(el) {
  if (still() || !el.animate) return;
  el.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
}

/* ---------------------------------------------------------------- The crowd */
const scaleFig = $("[data-scale]");
const svg = $(".scale-svg");
const S = { W: 0, H: 0 };
let mark = null;
let bandText = [];
const TOP1 = 2.326; // The 99th percentile of the curve: everything to its right is the top 1%.

const X = (r) => S.padL + ((r + 3) / 6) * (S.W - S.padL - S.padR);
const Y = (r) => S.base - S.amp * Math.exp(-(r * r) / 2);

function drawScale() {
  const W = svg.clientWidth, H = svg.clientHeight;
  if (!W || !H) return;
  const small = W < 560;
  Object.assign(S, { W, H, small, padL: 1, padR: 1 });
  S.base = H - (small ? 50 : 58);
  S.top = small ? 122 : 118;
  S.amp = S.base - S.top;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();

  const defs = svgEl("defs", {}, svg);
  const pat = svgEl("pattern", { id: "hatch", width: 4, height: 4, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  svgEl("line", { class: "s-hatch", x1: 0, y1: 0, x2: 0, y2: 4 }, pat);

  // Band dividers, from the axis up to the curve, so the bands are cut from the crowd itself.
  for (const b of [-2, -0.8, 0.8, 2]) svgEl("line", { class: "s-div", x1: X(b), x2: X(b), y1: S.base, y2: Y(b) + 0.5 }, svg);

  // The top 1%: the far right tail, a flat hatched region under the curve.
  let tail = `M${X(TOP1).toFixed(2)} ${S.base}`;
  for (let r = TOP1; r <= 3.0001; r += 0.02) tail += `L${X(r).toFixed(2)} ${Y(r).toFixed(2)}`;
  tail += `L${X(3).toFixed(2)} ${S.base}Z`;
  svgEl("path", { class: "s-tail", d: tail }, svg);
  svgEl("line", { class: "s-tail-edge", x1: X(TOP1), x2: X(TOP1), y1: S.base, y2: Y(TOP1) - 0.5 }, svg);

  // The crowd: creators of the same kind and size. Zero sits under its peak.
  let d = "";
  for (let r = -3; r <= 3.0001; r += 0.02) d += `${d ? "L" : "M"}${X(r).toFixed(2)} ${Y(r).toFixed(2)}`;
  svgEl("path", { class: "s-curve", d }, svg);

  // Axis and ticks, every 0.2.
  svgEl("line", { class: "s-axis", x1: X(-3), x2: X(3), y1: S.base, y2: S.base }, svg);
  for (let i = -15; i <= 15; i++) {
    const r = i / 5, maj = i % 5 === 0;
    svgEl("line", { class: `s-tick${maj ? " maj" : ""}`, x1: X(r), x2: X(r), y1: S.base, y2: S.base + (maj ? 8 : 4) }, svg);
    if (maj) {
      const n = i / 5;
      const t = svgEl("text", { class: `s-lab${n === 0 ? " zero" : ""}`, x: X(r), y: S.base + 22, "text-anchor": n === -3 ? "start" : n === 3 ? "end" : "middle" }, svg);
      t.textContent = n === 0 ? "0" : minus(n);
    }
  }
  // Band names, centred in their bands.
  bandText = [["Poor", -2.5], ["Subpar", -1.4], ["Average", 0], ["Good", 1.4], ["Great", 2.5]].map(([name, at]) => {
    const t = svgEl("text", { class: "s-band", x: X(at), y: S.base + (small ? 42 : 48), "text-anchor": "middle" }, svg);
    t.textContent = name;
    return t;
  });

  // Zero: typical for creators this size.
  svgEl("line", { class: "s-zero", x1: X(0), x2: X(0), y1: S.base, y2: Y(0) }, svg);
  const z = svgEl("text", { class: "s-note", x: X(0) - 10, y: Y(0) - 10, "text-anchor": "end" }, svg);
  z.textContent = small ? "Typical" : "Typical for their size";

  // The label for the tail: a bracket over exactly the top 1%, and two short lines above it.
  const bx0 = X(TOP1), bx1 = X(3), by = Y(TOP1) - (small ? 8 : 12);
  svgEl("path", { class: "s-bracket", d: `M${bx0} ${by + 5}V${by}H${bx1}V${by + 5}` }, svg);
  const mid = (bx0 + bx1) / 2, gap = small ? 52 : 16;
  svgEl("line", { class: "s-leader", x1: mid, x2: mid, y1: by, y2: by - gap }, svg);
  const lines = small ? ["Not who you're", "measured against."] : ["Not who you're measured against."];
  const lh = small ? 17 : 20;
  let y = by - gap - 8;
  for (const text of [...lines].reverse()) {
    const t = svgEl("text", { class: "s-top1-n", x: bx1, y, "text-anchor": "end" }, svg);
    t.textContent = text; y -= lh;
  }
  const t1 = svgEl("text", { class: "s-top1", x: bx1, y: y + 1, "text-anchor": "end" }, svg);
  t1.textContent = "The top 1%";

  // You: a number on a line, landing on the crowd.
  const g = svgEl("g", { class: "s-you" }, svg);
  mark = {
    drop: svgEl("line", { class: "s-you-drop", y2: S.base }, g),
    line: svgEl("line", { class: "s-you-line", y1: 4 }, g),
    ring: svgEl("circle", { class: "s-you-ring", r: small ? 5 : 6 }, g),
    num: svgEl("text", { class: "s-you-num", y: small ? 40 : 56 }, g),
    name: svgEl("text", { class: "s-you-name", y: small ? 62 : 84 }, g),
  };
  mark.n = svgEl("tspan", {}, mark.num);
  mark.b = svgEl("tspan", { class: "s-you-band", dx: small ? 8 : 12 }, mark.num);
  mark.nm = svgEl("tspan", {}, mark.name);
  mark.h = svgEl("tspan", { class: "s-you-handle", dx: 8 }, mark.name);
  mark.side = sideFor(state.target);
  renderMark(state.shown);
}

const sideFor = (r) => (X(r) > S.W - (S.small ? 150 : 300) ? "end" : "start");

function renderMark(r) {
  if (!mark) return;
  const x = X(r), y = Y(r);
  for (const l of [mark.line, mark.drop]) { l.setAttribute("x1", x); l.setAttribute("x2", x); }
  mark.line.setAttribute("y2", y);
  mark.drop.setAttribute("y1", y);
  mark.ring.setAttribute("cx", x); mark.ring.setAttribute("cy", y);
  const lx = mark.side === "end" ? x - 12 : x + 12;
  for (const t of [mark.num, mark.name]) { t.setAttribute("x", lx); t.setAttribute("text-anchor", mark.side); }
  const d = data[state.kind];
  mark.n.textContent = signed(r);
  mark.b.textContent = verdict(r);
  mark.nm.textContent = d.name;
  mark.h.textContent = S.small ? "" : d.handle;
  const on = verdict(r);
  bandText.forEach((t) => t.classList.toggle("on", t.textContent === on));
}

/* Travel: the mark rides the crowd to its place. */
let raf = 0;
function travel(to, dur = 900) {
  cancelAnimationFrame(raf);
  state.target = to;
  if (mark) mark.side = sideFor(to);
  const from = state.shown;
  if (still() || !mark || from === to) { setShown(to); return; }
  const t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    setShown(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else setShown(to);
  };
  raf = requestAnimationFrame(step);
}
function setShown(r) {
  state.shown = Math.round(r * 100) / 100;
  renderMark(r);
}

function fillHero(d) {
  const pl = $('[data-f="peerline"]');
  pl.textContent = peerLine(d);
  $('[data-f="scalecap"]').textContent = `${d.name}, a made-up ${SINGULAR[d.kind]}, is rated ${d.signed}, ${d.band}, against ${peerLine(d)}. Zero is typical for them. The top 1% sit in the far right tail of the same curve.`;
  return pl;
}

/* ---------------------------------------------------------------- Rating section */
const rd = $(".rd");
const rdParts = $('[data-g="parts"]', rd);
rdParts.innerHTML = [0, 1, 2].map(() => `<li><span class="n"></span><span class="v"></span><span class="w"></span><div class="pr" aria-hidden="true"><i class="mid"></i><i class="fill"></i><i class="m"></i></div><p class="pr-l"><span class="pl"></span></p></li>`).join("");

function tryLine(d) {
  const r = d.result;
  const low = [...r.parts].sort((a, b) => a.score - b.score)[0];
  if (!low) return "";
  if (low.score < 50) {
    const advice = r.detail.parts.find((p) => p.key === low.key)?.advice ?? "";
    return `<b>${low.name}</b>, which beats ${low.score} in 100. ${advice}`;
  }
  return `Nothing is below typical for ${d.peers} this size. The lowest part is <b>${low.name}</b>, at ${low.score} in 100, so the report would start there.`;
}

function fillRating(d) {
  $('[data-g="name"]', rd).textContent = d.name;
  $('[data-g="sizeBand"]', rd).textContent = `${d.handle}, ${d.sizeBand}`;
  $('[data-g="num"]', rd).textContent = d.signed;
  $('[data-g="band"]', rd).textContent = d.band;
  $('[data-g="explain"]', rd).textContent = d.explain;
  $('[data-g="try"]', rd).innerHTML = tryLine(d);
  $$("li", rdParts).forEach((li, i) => {
    const p = d.parts[i];
    li.querySelector(".n").textContent = p.name;
    li.querySelector(".v").textContent = p.value;
    li.querySelector(".w").textContent = p.what;
    const pr = li.querySelector(".pr");
    pr.style.setProperty("--at", `${p.score}%`);
    const f = pr.querySelector(".fill");
    f.style.left = `${Math.min(50, p.score)}%`;
    f.style.width = `${Math.abs(p.score - 50)}%`;
    li.querySelector(".pl").innerHTML = `Beats <b>${p.score}</b> in 100 ${d.peers} this size`;
  });
}

// The maths for the chosen kind: one line cut by the weights, then what each part measures.
function fillMaths(d) {
  const m = mathsFor(d.kind);
  $('[data-g="peers"]').textContent = d.peers;
  $("[data-weights]").innerHTML = m.map((p) => `<div class="w" style="--w:${p.weight}%"><span>${p.weight}%</span></div>`).join("");
  $("[data-wlist]").innerHTML = m.map((p) => `<div><dt>${p.name}</dt><dd class="wt">${p.weight}%</dd><dd>${p.what}</dd></div>`).join("");
}

/* ---------------------------------------------------------------- Record */
const SOURCES = {
  channel: [["YouTube Analytics", "14 Oct"], ["AdSense, last twelve months", "14 Oct"], ["Stripe, memberships", "14 Oct"], ["Sponsor invoices", "12 Oct"]],
  newsletter: [["Substack, subscribers", "14 Oct"], ["Substack, opens", "14 Oct"], ["Stripe, paid subscriptions", "14 Oct"], ["Sponsor invoices", "11 Oct"]],
  stream: [["Twitch, viewers", "14 Oct"], ["Twitch, subscriptions", "14 Oct"], ["Twitch payouts", "13 Oct"], ["Sponsor invoices", "12 Oct"]],
  podcast: [["Podcast host, downloads", "14 Oct"], ["Podcast host, completion", "14 Oct"], ["Ad network payouts", "13 Oct"], ["Sponsor invoices", "10 Oct"]],
  portfolio: [["Licensing statements", "14 Oct"], ["Print shop orders", "14 Oct"], ["Stripe, commissions", "13 Oct"], ["Client invoices", "11 Oct"]],
};
function fillRecord(d, animate) {
  $('[data-r="handle"]').textContent = d.handle;
  $('[data-r="sources"]').innerHTML = SOURCES[d.kind].map(([s, at], i) => `<li class="${animate ? "in" : ""}" style="animation-delay:${i * 60}ms"><span>${s}</span><span class="d">Checked ${at}</span></li>`).join("");
}

/* ---------------------------------------------------------------- The State of the Middle */
function fillBench(kind) {
  const b = benchmark(kind);
  const max = Math.max(...b.rows.map((r) => r.value));
  $("[data-bench-q]").textContent = `${b.title}. ${b.what}`;
  $("[data-bench]").innerHTML = b.rows.map((r) => `<li class="${r.key === b.example ? "hi" : ""}"><span class="t">${r.label}</span><span class="b"><i style="--w:${(r.value / max) * 100}%"></i></span><span class="n">${pct(r.value)}</span></li>`).join("");
  $("[data-bench-line]").textContent = b.line;
}

/* Hold the rating section at its tallest kind, so switching kinds never moves the page. */
function reserveHeights() {
  const boxes = [$("[data-fade]"), $("#maths")];
  boxes.forEach((b) => (b.style.minHeight = ""));
  const max = boxes.map(() => 0);
  for (const k of ORDER) {
    fillRating(data[k]); fillMaths(data[k]);
    boxes.forEach((b, i) => (max[i] = Math.max(max[i], b.offsetHeight)));
  }
  fillRating(data[state.kind]); fillMaths(data[state.kind]);
  boxes.forEach((b, i) => (b.style.minHeight = `${max[i]}px`));
}

/* ---------------------------------------------------------------- One state */
function setKind(kind, { from = "user" } = {}) {
  if (!data[kind]) return;
  const d = data[kind];
  const changed = kind !== state.kind;
  state.kind = kind;
  $$("[data-tabs] [role=tab]").forEach((b) => {
    const on = b.dataset.k === kind;
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
  });
  if (from !== "init") $$("select[name=kind]").forEach((s) => { if (!s.matches(":focus")) s.value = kind; });

  const pl = fillHero(d);
  fillRating(d);
  fillMaths(d);
  fillBench(kind);
  fillRecord(d, changed && from !== "init" && !still());
  if (changed) { fade(pl); fade($("[data-fade]")); fade($("#maths")); }
  travel(d.rating);
}

// Tabs: click and arrow keys, roving focus.
$$("[data-tabs]").forEach((list) => {
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[role=tab]");
    if (b) setKind(b.dataset.k);
  });
  list.addEventListener("keydown", (e) => {
    const tabs = $$("[role=tab]", list);
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    setKind(tabs[j].dataset.k);
    tabs[j].focus();
  });
});
$$("select[name=kind]").forEach((s) => s.addEventListener("change", () => setKind(s.value, { from: "select" })));

/* ---------------------------------------------------------------- Reserve */
function doneCopy(h, kind, via) {
  const lead = via === "api"
    ? `<b>@${h}</b> is held for you.`
    : `We've written the email that holds <b>@${h}</b>. Send it and the handle is kept.`;
  const opens = kind === "channel" ? "We'll check it's yours when ratings open with YouTube." : `We'll check it's yours when ratings open: YouTube first, then ${PLATFORM[kind]}.`;
  return `<p class="done-t">${lead} ${opens}</p>
    <div class="own"><span class="own-url">orbe.vc/@${h}</span><button type="button" class="copy" data-copy="https://orbe.vc/@${h}">Copy link</button></div>
    <p class="done-f">Your card will live at this address. <a href="#rating" data-go>See how a ${SINGULAR[kind]} your size is read</a> <button type="button" class="edit" data-edit>Change</button></p>`;
}
$$("[data-form]").forEach((form) => {
  const box = form.closest(".reserve");
  const input = $("input", form), select = $("select", form), note = $("[data-note]", box), done = $("[data-done]", box);
  const noteText = note.textContent;
  input.addEventListener("input", () => { form.classList.remove("err"); note.textContent = noteText; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = cleanHandle(input.value).toLowerCase();
    if (!h) { form.classList.add("err"); note.textContent = "Type the handle you'd like, as it appears on your page."; input.focus(); return; }
    const kind = select.value;
    setKind(kind, { from: "submit" });
    const res = await reserve({ handle: h, kind });
    if (!res.ok) { form.classList.add("err"); note.textContent = res.reason === "taken" ? `@${h} is already requested. Try another.` : "That didn't go through. Try again, or write to hello@orbe.vc."; return; }
    const handle = res.handle.toLowerCase();
    done.innerHTML = doneCopy(handle, kind, res.via);
    done.hidden = false;
    box.classList.add("is-done");
    requestAnimationFrame(() => done.classList.add("on"));
    const handed = $("[data-handed]");
    handed.innerHTML = `<b>@${handle}</b>, here's how a ${SINGULAR[kind]} your size is read.`;
    handed.hidden = false;
    const copy = $("[data-copy]", done);
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = "Copied"; }
      catch { copy.textContent = "Select and copy"; const r = document.createRange(); r.selectNodeContents($(".own-url", done)); getSelection().removeAllRanges(); getSelection().addRange(r); }
      setTimeout(() => (copy.textContent = "Copy link"), 2200);
    });
    $("[data-edit]", done).addEventListener("click", () => {
      done.classList.remove("on"); done.hidden = true; box.classList.remove("is-done"); input.focus(); input.select();
    });
    done.focus({ preventScroll: true });
  });
});
$$("[data-focus]").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  const t = document.getElementById(a.dataset.focus);
  t.scrollIntoView({ behavior: still() ? "auto" : "smooth", block: "center" });
  t.focus({ preventScroll: true });
}));

/* ---------------------------------------------------------------- Value */
const range = $("#profit");
const ticksSvg = $("[data-ticks]");
const slideMark = document.createElement("i");
slideMark.className = "slide-mark";
range.parentElement.appendChild(slideMark);
let tickEls = [];
const THUMB = 14;
function drawTicks() {
  const W = ticksSvg.clientWidth;
  if (!W) return;
  ticksSvg.setAttribute("viewBox", `0 0 ${W} 40`);
  ticksSvg.replaceChildren();
  const min = +range.min, max = +range.max, stepV = +range.step;
  tickEls = [];
  for (let v = min; v <= max; v += stepV) {
    const x = THUMB / 2 + ((v - min) / (max - min)) * (W - THUMB);
    const maj = v === min || v === max;
    tickEls.push([v, svgEl("line", { x1: x, x2: x, y1: maj ? 8 : 14, y2: maj ? 32 : 26, class: maj ? "maj" : "" }, ticksSvg)]);
  }
  val();
}
function val() {
  const profit = +range.value, rpm = 4;
  const v = value({ views: (profit * 0.55 * 1000) / (12 * rpm), rpm, sponsors: profit * 0.35, other: profit * 0.1, margin: 1, faceDependence: 0.5, age: 9 });
  $('[data-v="low"]').textContent = gbp(v.low);
  $('[data-v="high"]').textContent = gbp(v.high);
  $('[data-v="mult"]').textContent = `${v.mLow.toFixed(1)} to ${v.mHigh.toFixed(1)} times a year's profit, from what similar businesses sold for.`;
  $('[data-v="profit"]').textContent = gbp(profit);
  range.setAttribute("aria-valuetext", `${gbp(profit)} profit a year, valued at ${gbp(v.low)} to ${gbp(v.high)}`);
  const W = ticksSvg.clientWidth;
  const k = (profit - +range.min) / (+range.max - +range.min);
  slideMark.style.left = `${THUMB / 2 + k * (W - THUMB)}px`;
  tickEls.forEach(([tv, l]) => l.classList.toggle("on", tv <= profit));
}
range.addEventListener("input", val);
$("[data-fee]").textContent = SELLER_FEE.charAt(0).toUpperCase() + SELLER_FEE.slice(1);

/* ---------------------------------------------------------------- Buyers */
$$("[data-p]").forEach((e) => (e.textContent = PRICES[e.dataset.p]));
const OFFERS = [
  { k: "Newsletter", s: "10k to 50k readers", p: "£80k to £120k", r: 1.04 },
  { k: "Channel", s: "250k to 1M subscribers", p: "£150k to £250k", r: 0.31 },
  { k: "Stream", s: "100 to 500 average viewers", p: "£60k to £90k", r: 2.12 },
  { k: "Photography", s: "100 to 500 licences a year", p: "£40k to £70k", r: 0.92 },
];
const mx = (r) => ((r + 3) / 6) * 100;
$("[data-offers]").innerHTML = OFFERS.map((o) => `<tr><td class="k">${o.k}</td><td class="s">${o.s}</td><td class="p">${o.p}</td><td class="r"><span class="mini"><svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><line class="ax" x1="0" x2="100" y1="7" y2="7" vector-effect="non-scaling-stroke"/><line class="z" x1="50" x2="50" y1="3" y2="11" vector-effect="non-scaling-stroke"/><line class="y" x1="${mx(o.r)}" x2="${mx(o.r)}" y1="0" y2="14" vector-effect="non-scaling-stroke"/></svg><b>${signed(o.r)}<i>${verdict(o.r)}</i></b></span></td></tr>`).join("");

/* ---------------------------------------------------------------- Wordmark: drawn once in the nav, still in the footer */
$$("[data-wordmark]").forEach((el, i) => mountWordmark(el, { animate: i === 0 }));

/* ---------------------------------------------------------------- Start */
setKind("channel", { from: "init" });
state.shown = 0;
drawScale();
drawTicks();
reserveHeights();
document.fonts?.ready.then(reserveHeights);
let pageW = innerWidth;
window.addEventListener("resize", () => { if (innerWidth !== pageW) { pageW = innerWidth; reserveHeights(); } });
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  if (svg.clientWidth === lastW && svg.clientHeight === lastH) return;
  lastW = svg.clientWidth; lastH = svg.clientHeight;
  drawScale();
}).observe(scaleFig);
window.addEventListener("resize", () => drawTicks());

// The first move: the mark starts at typical and travels to where this channel stands among channels its size.
if (still()) setShown(data.channel.rating);
else {
  setShown(0);
  setTimeout(() => travel(data.channel.rating, 1100), 450);
}
reduce.addEventListener?.("change", () => { if (still()) setShown(state.target); });
