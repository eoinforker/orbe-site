/*
  r5-5, The method. The hero shows the published weights adding up, step by
  step, into the example's rating, for every kind of work, so a visitor can check
  how the number is made. Every figure comes from the shared modules.
*/
import { example, ORDER, mathsFor, benchmark, EXAMPLE_LINE, signed, verdict } from "../assets/r5/examples.js";
import { focusAreas } from "../assets/engine/rating/browser.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { SELLER_FEE, PRICES } from "../assets/r5/terms.js";
import { value, gbp } from "../assets/js/valuation.js";
import { mountWordmark } from "../assets/r5/wordmark.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const easeOut = (t) => 1 - Math.pow(1 - t, 4);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PLATFORM = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photography" };
const KIND_NAME = { channel: "YouTube channel", newsletter: "Substack newsletter", stream: "Twitch stream", podcast: "Podcast", portfolio: "Photography portfolio" };
/* Example profit bands for the anonymised listings. Not engine output, and labelled as examples. */
const PROFIT_BAND = { channel: "£100k to £250k", newsletter: "£50k to £100k", stream: "£50k to £100k", podcast: "£25k to £50k", portfolio: "£25k to £50k" };

const fmt = (v) => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? "0.00" : signed(r);
};
/** Where a rating sits on the five-band scale, which runs from -3 to +3. */
const onScale = (r) => `${(Math.min(Math.max((r + 3) / 6, 0), 1) * 100).toFixed(2)}%`;

/* Derived metrics must be labelled as Orbe's own (YouTube API terms): once per rated card, merged with the example line. */
$$("[data-example-line]").forEach((el) => (el.textContent = `${EXAMPLE_LINE} Independently calculated by Orbe.`));

/* ------------------------------------------------------------------ */
/* The worked example: each published weight's share of the rating.   */
/* ------------------------------------------------------------------ */

const STEPS_CACHE = {};
function stepsFor(kind) {
  if (STEPS_CACHE[kind]) return STEPS_CACHE[kind];
  const r = example(kind).result;
  const raw = mathsFor(kind).map((m) => {
    const part = r.detail.parts.find((p) => p.name === m.name);
    const score = r.parts.find((p) => p.name === m.name)?.score ?? 50;
    return { name: m.name, weight: m.weight, score, exact: 2 * part.effectiveWeight * part.z };
  });
  // Round to hundredths so the shown parts add up exactly to the engine's rating (largest remainder).
  const target = Math.round(r.rating * 100);
  const cents = raw.map((s) => Math.round(s.exact * 100));
  let diff = target - cents.reduce((a, b) => a + b, 0);
  const order = raw.map((s, i) => [i, s.exact * 100 - cents[i]]).sort((x, y) => (diff > 0 ? y[1] - x[1] : x[1] - y[1]));
  for (let j = 0; diff !== 0 && j < order.length; j++) { const i = order[j][0]; cents[i] += Math.sign(diff); diff -= Math.sign(diff); }
  let run = 0;
  const steps = raw.map((s, i) => { const from = run; run = (run * 100 + cents[i]) / 100; return { ...s, add: cents[i] / 100, from, to: run }; });
  return (STEPS_CACHE[kind] = steps);
}

/* The hero card */
const card = $("#card");
const C = (k) => $(`[data-c="${k}"]`, card);
let cardValue = 0;
function setCardStatic(e) {
  C("name").textContent = e.name;
  C("handle").textContent = e.handle;
  C("platform").textContent = KIND_NAME[e.kind];
  C("size").textContent = e.sizeBand;
  C("peers").textContent = e.peers;
  const best = e.best.split(": ");
  C("best").innerHTML = `<b>${esc(best[0])}:</b> ${esc(best.slice(1).join(": "))}`;
}
function setCardValue(v) {
  cardValue = v;
  C("num").textContent = fmt(v);
  C("band").textContent = verdict(Math.round(v * 100) / 100);
  C("mark").style.left = onScale(v);
}
let cardTween = 0;
function tweenCard(to, ms) {
  cancelAnimationFrame(cardTween);
  const from = cardValue;
  if (still || ms === 0) return setCardValue(to);
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min((t - t0) / ms, 1);
    setCardValue(from + (to - from) * easeOut(k));
    if (k < 1) cardTween = requestAnimationFrame(tick);
  };
  cardTween = requestAnimationFrame(tick);
}

/* The method beside it */
const method = $("#method");
const M = (k) => $(`[data-m="${k}"]`, method);
let methodKind = "channel";
let gen = 0;
let played = false;

function buildMethod(kind) {
  methodKind = kind;
  const e = example(kind);
  const steps = stepsFor(kind);
  const lo = Math.min(0, ...steps.map((s) => s.to)) - 0.25;
  const hi = Math.max(0.8, ...steps.map((s) => s.to)) + 0.2;
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  method.style.setProperty("--z0", `${X(0)}%`);
  method.style.setProperty("--g", `${X(0.8)}%`);
  $(".t0", method).textContent = X(0.8) - X(0) < 42 ? "0" : "0 typical";
  const rows = M("rows");
  rows.innerHTML = "";
  for (const s of steps) {
    const li = document.createElement("li");
    li.className = "m-row";
    const neg = s.add < 0;
    li.innerHTML = `
      <span class="m-name"><b>${esc(s.name)}<span class="w">${s.weight}%</span></b><small>beats ${s.score} in 100</small></span>
      <span class="m-track"><i class="m-bar${neg ? " neg" : ""}"></i><i class="m-conn"></i></span>
      <span class="m-c">${fmt(s.add)}</span>`;
    const bar = $(".m-bar", li);
    bar.style.setProperty("--from", `${X(Math.min(s.from, s.to))}%`);
    bar.style.setProperty("--w", `${Math.max(Math.abs(X(s.to) - X(s.from)), 0.6)}%`);
    bar.style.setProperty("--o", neg ? "right" : "left");
    $(".m-conn", li).style.setProperty("--to", `${X(s.to)}%`);
    rows.append(li);
  }
  const total = M("total");
  total.style.setProperty("--from", `${X(0)}%`);
  total.style.setProperty("--w", `${X(e.rating) - X(0)}%`);
  M("sumn").textContent = signed(e.rating);
  const opens = kind === "channel" ? "" : ` ${PLATFORM[kind]} ratings open after YouTube; the weights are published now.`;
  M("note").innerHTML = `Each part is placed among ${esc(e.peers)} the same size, weighted, then added. <b>Zero is typical.</b> Good starts at +0.8 and Great at +2.${opens}`;
  M("sr").textContent = `${steps.map((s) => `${s.name}, weighted ${s.weight}%, beats ${s.score} in 100, adds ${fmt(s.add)}`).join(". ")}. Together: ${signed(e.rating)}, ${verdict(e.rating)}.`;
}

/** Reset the worked example to nothing added yet. */
function zero() {
  $$(".m-row", method).forEach((r) => { r.classList.add("dim"); $(".m-bar", r).style.setProperty("--s", 0); r.style.setProperty("--co", 0); });
  M("total").style.setProperty("--s", 0);
  M("sum").style.setProperty("--co", 0);
  setCardValue(0);
}
function full() {
  $$(".m-row", method).forEach((r) => { r.classList.remove("dim"); $(".m-bar", r).style.setProperty("--s", 1); r.style.setProperty("--co", 1); });
  M("total").style.setProperty("--s", 1);
  M("sum").style.setProperty("--co", 1);
}

function grow(el, ms) {
  el.style.setProperty("--s", 1);
  if (still) return Promise.resolve();
  return el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ms, easing: EASE, fill: "backwards" }).finished.catch(() => {});
}

/** The signature: each weight adds its share, and the card's number and mark move with the running total. */
async function addUp() {
  const kind = methodKind;
  const steps = stepsFor(kind);
  const rating = example(kind).rating;
  const my = ++gen;
  const live = () => my === gen && methodKind === kind;
  played = true;
  const again = $("[data-again]", method);
  again.disabled = true;
  if (still) { full(); setCardValue(rating); again.disabled = false; return; }
  zero();
  await wait(260);
  const rows = $$(".m-row", method);
  const step = rows.length > 6 ? 340 : 420;
  for (let i = 0; i < rows.length; i++) {
    if (!live()) return;
    const r = rows[i], s = steps[i];
    r.classList.remove("dim");
    tweenCard(s.to, step);
    await grow($(".m-bar", r), step);
    r.style.setProperty("--co", 1);
    await wait(100);
  }
  if (!live()) return;
  M("sum").style.setProperty("--co", 1);
  await grow(M("total"), 520);
  if (!live()) return;
  setCardValue(rating);
  again.disabled = false;
}

let wantKind = "channel";
function setHero(kind, animate = true) {
  if (wantKind === kind) return;
  wantKind = kind;
  gen++;
  const e = example(kind);
  const swap = () => {
    if (wantKind !== kind) return;
    setCardStatic(e);
    buildMethod(kind);
    if (animate && !still) addUp();
    else { full(); setCardValue(e.rating); }
  };
  if (!animate || still) return swap();
  const els = [card, method];
  Promise.all(els.map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "linear", fill: "forwards" }).finished)).then(() => {
    if (wantKind !== kind) return;
    swap();
    els.forEach((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE, fill: "forwards" }));
  });
}

/* Kind selects: both forms, kept in step with the hero. */
const selects = $$("[data-kind-select]");
selects.forEach((sel) => {
  sel.addEventListener("change", () => {
    selects.forEach((o) => (o.value = sel.value));
    setHero(sel.value, sel.id === "k-hero");
  });
});

// First paint: the finished example. If the method is on screen, it starts from zero and adds up.
setCardStatic(example("channel"));
buildMethod("channel");
const firstInView = (() => { const r = method.getBoundingClientRect(); return r.top < innerHeight * 0.85 && r.bottom > 0; })();
if (firstInView && !still) zero(); else { full(); setCardValue(example("channel").rating); }
const io = new IntersectionObserver((entries) => {
  if (entries.some((x) => x.isIntersecting) && !played) {
    io.disconnect();
    document.fonts.ready.then(() => { if (!played) addUp(); });
  }
}, { threshold: 0.3 });
io.observe(method);
$("[data-again]").addEventListener("click", addUp);

/* ------------------------------------------------------------------ */
/* 2. The rating, every kind, read in full                            */
/* ------------------------------------------------------------------ */
const tabs = $("[data-tabs]");
tabs.innerHTML = ORDER.map((k, i) => `<button role="tab" id="tab-${k}" data-k="${k}" aria-controls="r-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${PLATFORM[k]}</button>`).join("");
const panel = $("#r-panel");
const R = (k) => $(`[data-r="${k}"]`, panel);
const weightsH = $("[data-weights-h]");
const weightsList = $("[data-weights]");

function tryLine(e) {
  const f = focusAreas(e.result)[0];
  if (f) return `<b>${esc(f.name)}</b> is the part to work on: better than ${f.score} in 100 ${esc(e.peers)} this size. ${esc(f.advice)}`;
  return `Nothing first. No part is below typical for ${esc(e.peers)} this size, so the report has nothing to fix yet.`;
}

function setReport(kind, animate = true) {
  const e = example(kind);
  $$("button", tabs).forEach((b) => { const on = b.dataset.k === kind; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
  panel.setAttribute("aria-labelledby", `tab-${kind}`);
  const fill = () => {
    R("name").innerHTML = `${esc(e.name)} <span class="r-num">${esc(e.signed)} <i>${esc(e.band)}</i></span>`;
    R("size").textContent = `${e.handle} / ${KIND_NAME[kind]} / ${e.sizeBand}`;
    R("explain").textContent = e.explain;
    R("parts").innerHTML = e.parts.map((p) => `
      <li class="r-part">
        <div class="p-top"><span class="p-name">${esc(p.name)}</span><span class="p-val">${esc(p.value)}</span></div>
        <div class="p-bar" aria-hidden="true"><i style="--p:${p.score / 100}"></i></div>
        <p class="p-beat">Beats ${p.score} in 100 ${esc(e.peers)} this size.</p>
      </li>`).join("");
    R("try").innerHTML = tryLine(e);
    const best = e.best.split(": ");
    R("best").innerHTML = `<b>${esc(best[0])}:</b> ${esc(best.slice(1).join(": "))}`;
    weightsH.textContent = `The weights for ${PLATFORM[kind]}, in full`;
    weightsList.innerHTML = mathsFor(kind).map((m) => `
      <div><dt>${esc(m.name)}</dt><dd class="w">${m.weight}%</dd><dd class="what">${esc(m.what)}</dd><dd class="wbar" aria-hidden="true"><i style="--w:${m.weight}"></i></dd></div>`).join("");
  };
  if (!animate || still) return fill();
  const fadeEls = [panel, weightsList];
  fadeEls.forEach((el) => el.classList.add("fade"));
  setTimeout(() => { fill(); requestAnimationFrame(() => fadeEls.forEach((el) => el.classList.remove("fade"))); }, 150);
}
tabs.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) setReport(b.dataset.k); });
tabs.addEventListener("keydown", (ev) => {
  const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
  if (!(ev.key in keys)) return;
  ev.preventDefault();
  const btns = $$("button", tabs);
  let i = btns.findIndex((b) => b.getAttribute("aria-selected") === "true");
  const k = keys[ev.key];
  i = k === "first" ? 0 : k === "last" ? btns.length - 1 : (i + k + btns.length) % btns.length;
  btns[i].focus();
  btns[i].scrollIntoView({ block: "nearest", inline: "nearest" });
  setReport(btns[i].dataset.k);
});
setReport("channel", false);

/* ------------------------------------------------------------------ */
/* 3. The record becomes a listing                                    */
/* ------------------------------------------------------------------ */
const ch = example("channel");
$('[data-rec="rating"]').innerHTML = `${esc(ch.signed)} <i>${esc(ch.band)}</i>`;
$('[data-l="title"]').textContent = `${KIND_NAME.channel}, ${ch.sizeBand}`;
$('[data-l="rating"]').textContent = ch.band;

const flowEl = $("[data-flow]");
const svg = $(".wires", flowEl);
const rec = $(".rec", flowEl);
const lst = $(".lst", flowEl);
const NS = "http://www.w3.org/2000/svg";
const KEYS = ["rating", "profit", "sources"];
let wires = [];

function centreY(el, box) {
  const r = el.getBoundingClientRect();
  return r.top + r.height / 2 - box.top;
}
function layoutWires() {
  svg.replaceChildren();
  wires = [];
  const box = flowEl.getBoundingClientRect();
  const a = rec.getBoundingClientRect();
  const b = lst.getBoundingClientRect();
  const side = b.left > a.right; // record and listing side by side
  const ws = KEYS.map((k) => {
    const from = k === "sources" ? $(".sources li", rec) : $(`[data-from="${k}"]`, rec);
    return { k, y1: centreY(from, box), y2: centreY($(`[data-to="${k}"]`, lst), box) };
  });
  let paths;
  if (side) {
    const x1 = a.right - box.left, x2 = b.left - box.left;
    // Each wire takes its own lane so none cross: rising wires take the inner lanes, falling ones the outer.
    const up = ws.filter((w) => w.y2 < w.y1).sort((p, q) => p.y1 - q.y1);
    const down = ws.filter((w) => w.y2 >= w.y1).sort((p, q) => q.y1 - p.y1);
    const lanes = [...up, ...down];
    const gap = (x2 - x1) / (lanes.length + 1);
    paths = lanes.map((w, i) => {
      const c = x1 + gap * (i + 1), dy = w.y2 - w.y1, r = Math.min(8, Math.abs(dy) / 2), s = Math.sign(dy);
      const d = Math.abs(dy) < 1 ? `M${x1},${w.y1} H${x2}` : `M${x1},${w.y1} H${c - r} Q${c},${w.y1} ${c},${w.y1 + s * r} V${w.y2 - s * r} Q${c},${w.y2} ${c + r},${w.y2} H${x2}`;
      return { ...w, d, x1, x2 };
    });
  } else {
    // Stacked: the wires run down the right-hand margin, the top one outermost.
    const x1 = a.right - box.left, x2 = b.right - box.left;
    paths = ws.map((w, i) => {
      const c = Math.max(x1, x2) + 8 + (ws.length - 1 - i) * 7, r = 6;
      const d = `M${x1},${w.y1} H${c - r} Q${c},${w.y1} ${c},${w.y1 + r} V${w.y2 - r} Q${c},${w.y2} ${c - r},${w.y2} H${x2}`;
      return { ...w, d, x1, x2 };
    });
  }
  for (const w of paths) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", w.d);
    const c1 = document.createElementNS(NS, "circle");
    c1.setAttribute("cx", w.x1); c1.setAttribute("cy", w.y1); c1.setAttribute("r", 2.75);
    const c2 = document.createElementNS(NS, "circle");
    c2.setAttribute("cx", w.x2); c2.setAttribute("cy", w.y2); c2.setAttribute("r", 2.75);
    svg.append(p, c1, c2);
    wires.push({ ...w, p, c1, c2 });
  }
  wires.sort((p, q) => KEYS.indexOf(p.k) - KEYS.indexOf(q.k));
}

const stamps = $$(".src-when", rec);
const dates = stamps.map((s) => s.textContent);
const targets = KEYS.map((k) => $(`[data-to="${k}"]`, lst));
let flowed = false;
function settleFlow() {
  stamps.forEach((s, i) => { s.textContent = dates[i]; s.parentElement.classList.remove("wait"); });
  targets.forEach((t) => t.classList.remove("wait"));
  layoutWires();
  flowEl.classList.add("drawn");
}
if (still) {
  requestAnimationFrame(settleFlow);
} else {
  stamps.forEach((s) => { s.textContent = "Reading"; s.parentElement.classList.add("wait"); });
  targets.forEach((t) => t.classList.add("wait"));
  const fio = new IntersectionObserver(async ([en]) => {
    if (!en.isIntersecting || flowed) return;
    flowed = true;
    fio.disconnect();
    await document.fonts.ready;
    for (let i = 0; i < stamps.length; i++) {
      await wait(i ? 300 : 400);
      stamps[i].textContent = dates[i];
      stamps[i].parentElement.classList.remove("wait");
    }
    await wait(300);
    layoutWires();
    flowEl.classList.add("drawn");
    for (const w of wires) {
      const src = w.k === "sources" ? $(".sources", rec) : $(`[data-from="${w.k}"]`, rec);
      src.classList.add("hl");
      const len = w.p.getTotalLength();
      w.p.style.strokeDasharray = `${len}`;
      w.c2.style.opacity = 0;
      await w.p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 620, easing: EASE, fill: "both" }).finished.catch(() => {});
      w.c2.style.opacity = 1;
      $(`[data-to="${w.k}"]`, lst).classList.remove("wait");
      setTimeout(() => src.classList.remove("hl"), 700);
      await wait(140);
    }
  }, { threshold: 0.45 });
  fio.observe(flowEl);
}
let resizeT;
addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (flowEl.classList.contains("drawn")) { layoutWires(); } }, 120);
});

/* Value and terms */
$("[data-fee]").textContent = `${SELLER_FEE[0].toUpperCase()}${SELLER_FEE.slice(1)}.`;
const profitIn = $("#profit");
function val() {
  const profit = Number(profitIn.value);
  const rpm = 6;
  const v = value({ views: (profit * 0.55 * 1000) / (12 * rpm), rpm, sponsors: profit * 0.35, other: profit * 0.1, margin: 1, faceDependence: 0.5, age: 9 });
  $('[data-v="low"]').textContent = gbp(v.low);
  $('[data-v="high"]').textContent = gbp(v.high);
  $('[data-v="mult"]').textContent = `${v.mLow.toFixed(1)} to ${v.mHigh.toFixed(1)} times a year's profit, from what similar businesses sold for.`;
  $('[data-v="profit"]').textContent = gbp(profit);
  profitIn.setAttribute("aria-valuetext", `${gbp(profit)} a year`);
}
profitIn.addEventListener("input", val);
val();

/* ------------------------------------------------------------------ */
/* 4. Buyers, investors and lenders                                   */
/* ------------------------------------------------------------------ */
$$("[data-p]").forEach((el) => (el.textContent = PRICES[el.dataset.p]));
$("[data-offers]").innerHTML = ORDER.map((k) => {
  const e = example(k);
  return `<tr><th scope="row">${esc(KIND_NAME[k])}</th><td>${esc(e.sizeBand)}</td><td>${PROFIT_BAND[k]}</td><td><span class="o-n">${esc(e.signed)}</span> <i>${esc(e.band)}</i></td></tr>`;
}).join("");
const bm = benchmark("channel");
$("[data-bench-sub]").textContent = `${bm.title}. ${bm.what}`;
const maxV = Math.max(...bm.rows.map((r) => r.value));
$("[data-bench]").innerHTML = bm.rows.map((r) => `
  <li class="${r.key === bm.example ? "here" : ""}"><span class="bl">${esc(r.label)}</span><span class="bt" aria-hidden="true"><i style="--v:${(r.value / maxV) * 100}"></i></span><span class="bv">${+(r.value * 100).toFixed(1)}%</span></li>`).join("");
$("[data-bench-line]").textContent = `${bm.line} The highlighted row is the size of the example channel above.`;

/* ------------------------------------------------------------------ */
/* Reserving a handle                                                 */
/* ------------------------------------------------------------------ */
const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function renderYou(slot, { handle, kind, via }) {
  const held = via === "api";
  const url = `orbe.vc/@${handle}`;
  slot.innerHTML = `
    <div class="you">
      <p class="you-k">${held ? "Held" : "Requested"} ${esc(today)}</p>
      <div class="you-top">
        <p class="you-addr">orbe.vc/<b>@${esc(handle)}</b></p>
        <button class="copy" type="button" data-url="https://${esc(url)}">Copy link</button>
      </div>
      <dl class="you-meta">
        <div><dt>Kind</dt><dd>${esc(KIND_NAME[kind])}</dd></div>
        <div><dt>Your rating</dt><dd class="slot">${kind === "channel" ? "Opens with YouTube" : "Opens after YouTube"}</dd></div>
      </dl>
      <p class="you-then">${held
        ? `@${esc(handle)} is held. We'll check it's yours when ratings open. Your card will live at this address.`
        : `We've written the email that holds @${esc(handle)}. Send it and the handle is kept. We'll check it's yours when ratings open, and your card will live at this address.`}</p>
    </div>`;
  const btn = $(".copy", slot);
  btn.addEventListener("click", async () => {
    const text = btn.dataset.url;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.position = "absolute"; t.style.left = "-9999px";
      document.body.append(t); t.select();
      try { ok = document.execCommand("copy"); } catch {}
      t.remove();
    }
    btn.textContent = ok ? "Copied" : text;
    setTimeout(() => (btn.textContent = "Copy link"), 2200);
  });
  slot.classList.add("on");
}

$$("form.reserve").forEach((form) => {
  const input = $("input", form), sel = $("select", form), err = $(".err", form);
  const inClose = !!form.closest(".close");
  input.addEventListener("input", () => { err.hidden = true; if (input.value.startsWith("@")) input.value = input.value.replace(/^@+/, ""); });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const kind = sel.value;
    const h = cleanHandle(input.value).toLowerCase();
    if (!h) { err.textContent = "Type the handle you'd like to keep."; err.hidden = false; input.focus(); return; }
    err.hidden = true;
    input.value = h;
    const res = await reserve({ handle: h, kind });
    if (!res.ok) {
      err.textContent = res.reason === "taken" ? `@${h} is already taken. Try another.` : "Type the handle you'd like to keep.";
      err.hidden = false;
      return;
    }
    const you = { handle: res.handle.toLowerCase(), kind, via: res.via };
    $$("button[type=submit]", form).forEach((b) => (b.textContent = res.via === "api" ? "Held" : "Requested"));
    if (inClose) {
      const slot = $("#you-close");
      renderYou(slot, you);
      slot.focus({ preventScroll: true });
      return;
    }
    const slot = $("#you-top");
    renderYou(slot, you);
    setReport(kind, false);
    $("#rating").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    slot.focus({ preventScroll: true });
  });
});

$$("[data-focus]").forEach((a) => a.addEventListener("click", (ev) => {
  ev.preventDefault();
  const input = document.getElementById(a.dataset.focus);
  input.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  input.focus({ preventScroll: true });
}));

/* The drawn wordmark: the reveal plays once in the nav; the footer's is still. */
$$("[data-wordmark]").forEach((el, i) => mountWordmark(el, { animate: i === 0 }));
