/*
  Orbe r9-c. The Sentence: one line holds the business, the visitor finishes it,
  and each clause opens its proof in place (the yardstick dial, the record, the
  fees). Then The Read: a paper window reads a made-up payout export a month a
  line, and the orb fills only as each month is read.

  Every figure comes from the Orbe engine: the rating examples from
  assets/r5/examples.js, the record from the record engine's made-up channel.
*/
import { example, benchmark, ORDER } from "../assets/r5/examples.js";
import { SPECS } from "../assets/engine/rating/browser.js";
import { suspiciousCreator } from "../assets/engine/record/browser.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { mountWordmark } from "../assets/r5/wordmark.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const root = document.documentElement;
const still = root.classList.contains("still");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeQuint = (t) => 1 - Math.pow(1 - t, 5);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const gbp = (pence, cur = "£") => cur + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Odin's measured word change */
const T = { width: 450, char: 360, stagger: 24, curve: "cubic-bezier(0.45, 0, 0.2, 1)", rise: "cubic-bezier(0.22, 1, 0.36, 1)" };

/* ================================================================ slots: a word that changes in place */
function wordEl(text) {
  const w = document.createElement("span");
  w.className = "w";
  w.setAttribute("aria-hidden", "true");
  for (const ch of text) {
    const c = document.createElement("span");
    c.className = "c";
    c.textContent = ch;
    w.appendChild(c);
  }
  return w;
}

/* Prepare a slot once: an invisible strut keeps its baseline while both words are lifted out of flow. */
function initSlot(slot, text) {
  const extra = $$(":scope > :not(.w)", slot);
  slot.textContent = "";
  const strut = document.createElement("span");
  strut.className = "strut"; strut.setAttribute("aria-hidden", "true"); strut.textContent = "​";
  const said = document.createElement("span");
  said.className = "vh"; said.textContent = text;
  slot.append(strut, said, wordEl(text), ...extra);
  slot.dataset.text = text;
}

function finishSlot(slot) {
  for (const a of slot.getAnimations({ subtree: true })) a.finish();
  for (const o of $$(".w.out", slot)) o.remove();
  for (const n of $$(".w.abs", slot)) n.classList.remove("abs");
  slot.style.width = "";
}

/** Swap a slot's word: the old one lifts out as its letters fade, the new letters rise 24ms apart, and the slot's width eases over 450ms so the sentence reflows instead of jumping. */
function swap(slot, text, { animate = !still, onDone } = {}) {
  if (slot.dataset.text === text) return;
  finishSlot(slot);
  clearTimeout(slot._t);
  slot.dataset.text = text;
  $(".vh", slot).textContent = text;
  const old = $(".w", slot);
  const neu = wordEl(text);
  if (!animate) { old.replaceWith(neu); onDone?.(); return; }
  const w0 = slot.getBoundingClientRect().width;
  const oldW = old.getBoundingClientRect().width;
  old.classList.add("abs", "out");
  neu.classList.add("abs");
  old.after(neu);
  const newW = neu.getBoundingClientRect().width;
  const w1 = w0 - oldW + newW;
  slot.style.width = w0 + "px";
  void slot.offsetWidth;
  slot.style.width = w1 + "px";
  old.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: T.char, easing: T.curve, fill: "forwards" });
  $$(".c", old).forEach((c, i) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: i * T.stagger * 0.5, easing: "linear", fill: "forwards" }));
  const cs = $$(".c", neu);
  cs.forEach((c, i) => c.animate(
    [{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1, offset: 1 }],
    { duration: T.char, delay: 40 + i * T.stagger, easing: T.rise, fill: "backwards" },
  ));
  const total = Math.max(T.width, 40 + T.char + (cs.length - 1) * T.stagger) + 20;
  slot._t = setTimeout(() => { finishSlot(slot); onDone?.(); }, total);
}

/* ================================================================ the orb: flat, area-true */
/* The fill line sits where the filled share of the disc's AREA equals the figure, so 93 fills 93%. */
function heightFor(f, R) {
  if (f <= 0) return 0;
  if (f >= 1) return 2 * R;
  let lo = 0, hi = 2 * R;
  const total = Math.PI * R * R;
  for (let i = 0; i < 40; i++) {
    const h = (lo + hi) / 2;
    const a = R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(Math.max(0, 2 * R * h - h * h));
    if (a / total < f) lo = h; else hi = h;
  }
  return (lo + hi) / 2;
}
let orbId = 0;
function makeOrb(svg) {
  const id = "orbclip" + ++orbId;
  svg.innerHTML = `<defs><clipPath id="${id}"><circle cx="50" cy="50" r="47"/></clipPath></defs><rect class="fill" x="0" y="100" width="100" height="0" clip-path="url(#${id})"/><circle class="rim" cx="50" cy="50" r="47" vector-effect="non-scaling-stroke" stroke-width="1.5"/>`;
  svg._f = 0;
  return svg;
}
function setOrb(svg, f) {
  svg._f = f;
  const h = heightFor(clamp(f, 0, 1), 47);
  const r = svg.querySelector(".fill");
  r.setAttribute("y", String(97 - h));
  r.setAttribute("height", String(h));
}
function tweenOrb(svg, to, ms = 600, delay = 0) {
  cancelAnimationFrame(svg._raf);
  clearTimeout(svg._delay);
  if (still || ms === 0) { setOrb(svg, to); return; }
  const from = svg._f;
  svg._delay = setTimeout(() => {
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / ms, 0, 1);
      setOrb(svg, from + (to - from) * easeQuint(t));
      if (t < 1) svg._raf = requestAnimationFrame(step);
    };
    svg._raf = requestAnimationFrame(step);
  }, delay);
}

/* ================================================================ sound and touch at a detent */
let audio = null;
function wakeAudio() {
  if (audio || still) return;
  try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio = null; }
}
function click(strong = false) {
  if (navigator.vibrate) { try { navigator.vibrate(strong ? 10 : 6); } catch {} }
  if (!audio) return;
  try {
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime;
    const len = Math.floor(audio.sampleRate * 0.012);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = audio.createBufferSource(); src.buffer = buf;
    const bp = audio.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = (strong ? 2600 : 3400) * (0.94 + Math.random() * 0.12); bp.Q.value = 3;
    const g = audio.createGain(); g.gain.value = strong ? 0.22 : 0.1;
    src.connect(bp).connect(g).connect(audio.destination);
    src.start(t);
  } catch {}
}
addEventListener("pointerdown", wakeAudio, { once: true, capture: true });
addEventListener("keydown", wakeAudio, { once: true, capture: true });

/* ================================================================ the engine's figures */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* The yardstick: the example's reach read against every size band's prior; its own band is the engine's score. */
function yardstick(kind) {
  const e = example(kind);
  const spec = SPECS[e.platform];
  const part = e.result.detail.parts.find((p) => p.key === "reach");
  const prior = spec.parts.find((p) => p.key === "reach").prior;
  const own = e.result.parts.find((p) => p.key === "reach").score;
  const bm = benchmark(kind);
  const banded = typeof prior.median === "object";
  const beats = (row) => (row.key === bm.example || !banded ? own : clamp(Math.round(phi(Math.log(part.measured / prior.median[row.key]) / prior.sigma) * 100), 1, 99));
  const k = (n) => (n >= 1e6 ? n / 1e6 + "M" : n >= 1e3 ? n / 1e3 + "k" : String(n));
  const rows = bm.rows.map((r) => {
    const band = spec.sizeBands.find((b) => b.key === r.key);
    const short = band.min === 0 ? "<" + k(band.max) : k(band.min) + "+";
    return { key: r.key, label: r.label, short, beats: beats(r) };
  });
  return { e, spec, rows, home: rows.findIndex((r) => r.key === bm.example), noun: spec.audienceNoun, own };
}

const KINDS = Object.fromEntries(ORDER.map((k) => {
  const e = example(k);
  return [k, { key: k, word: e.word, label: e.label, name: e.name, handle: e.handle, peers: e.peers, n: yardstick(k).own }];
}));

/* The record engine's made-up channel: what was paid, month by month, and the estimates it does not keep. */
const NOVA = (() => {
  const c = suspiciousCreator();
  const SRC = { adsense: "AdSense", stripe: "Stripe", patreon: "Patreon", invoice_upload: "Invoice", substack_export: "Substack" };
  const months = [...new Set(c.revenue.map((l) => l.month))].sort();
  const rows = months.map((m) => {
    const paid = c.revenue.filter((l) => l.month === m && l.provenance.source !== "youtube_analytics");
    const srcs = [...new Set(paid.map((l) => SRC[l.provenance.source] ?? l.provenance.source))];
    return { month: m.slice(0, 7), sources: srcs.join(", "), amount: paid.reduce((a, l) => a + l.gross.amount, 0) };
  });
  const estimates = c.revenue.filter((l) => l.provenance.source === "youtube_analytics");
  const last = months.at(-1);
  const ads = c.revenue.filter((l) => l.month === last && l.stream === "ads");
  const est = ads.find((l) => l.provenance.source === "youtube_analytics").gross.amount;
  const paid = ads.find((l) => l.provenance.source === "adsense").gross.amount;
  const name = (c.accounts.find((a) => a.kind === "youtube")?.title ?? "Nova Plays").replace(/\s*\(fixture\)/, "");
  const monthName = new Date(last).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { name, rows, estimates: estimates.length, estimateSum: estimates.reduce((a, l) => a + l.gross.amount, 0), est, paid, monthName, total: rows.reduce((a, r) => a + r.amount, 0) };
})();

/* ================================================================ 1. the sentence */
const S = { kind: "channel", handle: "" };
const sentence = $("[data-sentence]");
const whoBtn = $("[data-who]");
const who = $("[data-who-slot]");
const num = $("[data-num]");
const lineOrb = makeOrb($("[data-orb='line']"));
const noteText = $("[data-note-text]");
initSlot(who, "your channel");
initSlot(num, String(KINDS.channel.n));

function noteFor() {
  if (S.handle) return `@${S.handle}'s own number arrives when ratings open. Reserve @${S.handle} below and it is waiting for you.`;
  const k = KINDS[S.kind];
  return `${k.name} is a made-up ${k.word}, rated live by the Orbe engine.`;
}

function render({ animate = !still } = {}) {
  const k = KINDS[S.kind];
  swap(who, S.handle ? "@" + S.handle : "your " + k.word, { animate });
  if (S.handle) {
    num.classList.add("blank");
    swap(num, "  ", { animate });
    tweenOrb(lineOrb, 0, animate ? 450 : 0);
  } else {
    num.classList.remove("blank");
    swap(num, String(k.n), { animate });
    tweenOrb(lineOrb, k.n / 100, animate ? 700 : 0, animate ? 120 : 0);
  }
  noteText.textContent = noteFor();
  for (const b of $$("[data-kinds] .kind")) b.setAttribute("aria-checked", String(!S.handle && b.dataset.k === S.kind));
  const sel = $("[data-r-kind]");
  if (sel) sel.value = S.kind;
  if (openProof === "size") dial.load(S.kind, { sweep: false });
}

/* The first load: Odin's blur entrance on the sentence, then the number rises and the orb fills. */
if (still) {
  setOrb(lineOrb, KINDS.channel.n / 100);
} else {
  sentence.classList.add("enter");
  const cs = $$(".w .c", num);
  cs.forEach((c, i) => c.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: T.char, delay: 1000 + i * T.stagger, easing: T.rise, fill: "backwards" }));
  tweenOrb(lineOrb, KINDS.channel.n / 100, 900, 1000);
}

/* ---------------------------------------------------------------- finishing the sentence */
const finish = $("[data-finish]");
const kindsEl = $("[data-kinds]");
kindsEl.innerHTML = ORDER.map((k) => `<button type="button" class="kind" role="radio" aria-checked="${k === S.kind}" data-k="${k}" tabindex="${k === S.kind ? 0 : -1}"><span>your ${esc(KINDS[k].word)}</span><span class="k-n">${KINDS[k].n} in 100</span></button>`).join("");
const kindBtns = $$(".kind", kindsEl);
const finishInput = $("[data-finish-input]");

function placeFinish() {
  const host = finish.offsetParent || finish.parentElement;
  const hr = host.getBoundingClientRect();
  const r = whoBtn.getBoundingClientRect();
  const w = finish.offsetWidth;
  finish.style.top = r.bottom - hr.top + 10 + "px";
  finish.style.left = clamp(r.left - hr.left, 0, Math.max(0, hr.width - w - 0)) + "px";
}
function openFinish() {
  finish.hidden = false;
  whoBtn.setAttribute("aria-expanded", "true");
  placeFinish();
  const cur = kindBtns.find((b) => b.getAttribute("aria-checked") === "true") ?? kindBtns[0];
  kindBtns.forEach((b) => (b.tabIndex = b === cur ? 0 : -1));
  cur.focus({ preventScroll: true });
}
function closeFinish(refocus = true) {
  if (finish.hidden) return;
  finish.hidden = true;
  whoBtn.setAttribute("aria-expanded", "false");
  if (refocus) whoBtn.focus({ preventScroll: true });
}
whoBtn.addEventListener("click", () => (finish.hidden ? openFinish() : closeFinish()));
whoBtn.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" || ev.key === " " || ev.key === "ArrowDown") { ev.preventDefault(); openFinish(); }
});
function pickKind(k) {
  S.kind = k; S.handle = "";
  render();
}
kindsEl.addEventListener("click", (ev) => {
  const b = ev.target.closest(".kind"); if (!b) return;
  pickKind(b.dataset.k);
  closeFinish();
});
kindsEl.addEventListener("keydown", (ev) => {
  const i = kindBtns.indexOf(document.activeElement);
  if (i < 0) return;
  let j = null;
  if (ev.key === "ArrowDown" || ev.key === "ArrowRight") j = (i + 1) % kindBtns.length;
  if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") j = (i - 1 + kindBtns.length) % kindBtns.length;
  if (ev.key === "Home") j = 0;
  if (ev.key === "End") j = kindBtns.length - 1;
  if (j === null) return;
  ev.preventDefault();
  kindBtns.forEach((b, n) => (b.tabIndex = n === j ? 0 : -1));
  kindBtns[j].focus();
  pickKind(kindBtns[j].dataset.k);
});
$("[data-finish-form]").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const h = cleanHandle(finishInput.value).toLowerCase();
  if (!h) { finishInput.focus(); return; }
  S.handle = h;
  render();
  const rh = $("[data-r-handle]");
  rh.value = h; syncReserve();
  closeFinish();
});
finish.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { ev.preventDefault(); closeFinish(); } });
document.addEventListener("pointerdown", (ev) => { if (!finish.hidden && !finish.contains(ev.target) && !whoBtn.contains(ev.target)) closeFinish(false); });
finish.addEventListener("focusout", (ev) => { if (ev.relatedTarget && !finish.contains(ev.relatedTarget) && ev.relatedTarget !== whoBtn) closeFinish(false); });
addEventListener("resize", () => { if (!finish.hidden) placeFinish(); });

/* ---------------------------------------------------------------- the clauses open their proofs, one at a time */
let openProof = null;
const clauses = $$("[data-clause]");
function setProof(key) {
  const next = key === openProof ? null : key;
  for (const c of clauses) c.setAttribute("aria-expanded", String(c.dataset.clause === next));
  for (const p of $$("[data-proof]")) {
    const on = p.dataset.proof === next;
    if (on) {
      p.hidden = false;
      if (still) p.classList.add("open");
      else requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add("open")));
    } else if (!p.hidden) {
      p.classList.remove("open");
      p.hidden = true;
    }
  }
  openProof = next;
  if (next) {
    const plate = $(`[data-proof="${next}"]`);
    setTimeout(() => {
      const r = plate.getBoundingClientRect();
      const fullH = plate.querySelector(".proof-in").scrollHeight + 28;
      const over = r.top + fullH - innerHeight + 24;
      if (over > 0) scrollBy({ top: Math.min(over, r.top - 80), behavior: still ? "auto" : "smooth" });
    }, still ? 0 : 60);
  }
  if (next === "size") dial.load(S.kind, { sweep: !still });
  if (next === "record") $$("[data-months] li").forEach((li) => { li.style.animation = "none"; void li.offsetWidth; li.style.animation = ""; });
}
for (const c of clauses) {
  c.addEventListener("click", (ev) => { ev.preventDefault(); setProof(c.dataset.clause); });
  c.addEventListener("keydown", (ev) => { if (ev.key === " ") { ev.preventDefault(); setProof(c.dataset.clause); } });
}

/* ================================================================ the yardstick dial */
const dial = (() => {
  const svg = $("[data-dial-svg]");
  const labels = $("[data-dial-labels]");
  const hit = $("[data-dial-hit]");
  const roNum = $("[data-ro-num]");
  const roBand = $("[data-ro-band]");
  const roSay = $("[data-ro-say]");
  const roFig = $(".ro-fig");
  const roFine = $("[data-ro-fine]");
  initSlot(roNum, "93");
  const W = 600, H = 336, CX = 300, CY = 300, R = 246, M = (14 * Math.PI) / 180;
  const NS = "http://www.w3.org/2000/svg";
  let Y = null, N = 6, pos = 3, vel = 0, target = 3, shown = -1, raf = 0, seq = [], dragging = false;

  const ang = (p) => Math.PI - M - (p * (Math.PI - 2 * M)) / (N - 1);
  const pt = (a, r) => [CX + r * Math.cos(a), CY - r * Math.sin(a)];
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const pct = ([x, y]) => `left:${((x / W) * 100).toFixed(3)}%;top:${((y / H) * 100).toFixed(3)}%`;

  function draw() {
    svg.textContent = "";
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.appendChild(el("path", { class: "arc", d: `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}` }));
    for (let d = 0; d <= 180; d += 3) {
      const a = (d * Math.PI) / 180;
      const [x1, y1] = pt(a, R), [x2, y2] = pt(a, R - 9);
      svg.appendChild(el("line", { class: "tk", x1, y1, x2, y2 }));
    }
    const a0 = ang(Y.home) + 0.05, a1 = ang(Y.home) - 0.05;
    const [hx0, hy0] = pt(a0, R + 9), [hx1, hy1] = pt(a1, R + 9);
    svg.appendChild(el("path", { class: "home", d: `M${hx0} ${hy0} A${R + 9} ${R + 9} 0 0 1 ${hx1} ${hy1}` }));
    for (let i = 0; i < N; i++) {
      const [x1, y1] = pt(ang(i), R + 1), [x2, y2] = pt(ang(i), R - 20);
      svg.appendChild(el("line", { class: "tk maj", x1, y1, x2, y2 }));
    }
    svg.appendChild(el("line", { class: "needle", x1: CX, y1: CY, x2: CX, y2: CY, "data-needle": "" }));
    svg.appendChild(el("circle", { class: "hub", cx: CX, cy: CY, r: 11 }));
    svg.appendChild(el("circle", { class: "hub-c", cx: CX, cy: CY, r: 3.5 }));
    labels.innerHTML = Y.rows.map((r, i) => {
      const home = i === Y.home ? " is-home" : "";
      return `<span class="lb-b${home}" style="${pct(pt(ang(i), R + 32))}">${esc(r.short)}</span><span class="lb-n${home}" style="${pct(pt(ang(i), R - 40))}">${r.beats}</span>`;
    }).join("");
  }

  function needle() {
    const [x, y] = pt(ang(pos), R - 58);
    const [tx, ty] = pt(ang(pos) + Math.PI, 18);
    const n = svg.querySelector("[data-needle]");
    n.setAttribute("x1", tx.toFixed(2)); n.setAttribute("y1", ty.toFixed(2));
    n.setAttribute("x2", x.toFixed(2)); n.setAttribute("y2", y.toFixed(2));
    const i = clamp(Math.round(pos), 0, N - 1);
    if (i !== shown) { read(i, shown !== -1); shown = i; return true; }
    return false;
  }

  function sayFor(i) {
    const peers = Y.e.peers, noun = Y.e.result.detail.workNoun;
    if (i === Y.home) return `Creators your size: the only fair yardstick, and the number Orbe gives.`;
    if (i === N - 1) return `Giants reach a small share of a huge audience, so against them you look brilliant. It flatters you and tells you nothing.`;
    if (i === 0) return `A tiny audience sees more of each ${noun}, so against tiny ${peers} you look ordinary when you are not.`;
    return i > Y.home
      ? `Bigger ${peers} reach a smaller share of their audience, so you look better than you are.`
      : `Smaller ${peers} reach a bigger share of a smaller audience, so you look worse than you are.`;
  }
  function read(i, animate) {
    const r = Y.rows[i];
    swap(roNum, String(r.beats), { animate: animate && !still });
    roBand.textContent = `${r.label} ${Y.noun}`;
    roSay.textContent = sayFor(i);
    roFig.classList.toggle("is-home", i === Y.home);
    hit.setAttribute("aria-valuenow", String(i));
    hit.setAttribute("aria-valuetext", `${r.label} ${Y.noun}: you beat ${r.beats} in 100${i === Y.home ? ", your size" : ""}`);
  }

  /* A spring detent (stiffness 400, damping 30): a hair of overshoot, then it sits. */
  function spring(to, { onSettle } = {}) {
    target = to;
    cancelAnimationFrame(raf);
    if (still) { pos = to; vel = 0; needle(); onSettle?.(); return; }
    let last = performance.now();
    const step = (now) => {
      let dt = Math.min(0.032, (now - last) / 1000); last = now;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240);
        const acc = -400 * (pos - target) - 30 * vel;
        vel += acc * h; pos += vel * h; dt -= h;
      }
      const crossed = needle();
      if (crossed && dragging === false && userMoved) click(Math.round(pos) === Y.home);
      if (Math.abs(pos - target) < 0.002 && Math.abs(vel) < 0.01) { pos = target; vel = 0; needle(); onSettle?.(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function tween(from, to, ms) {
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / ms, 0, 1);
        pos = from + (to - from) * easeIO(t); vel = 0;
        needle();
        if (t < 1) raf = requestAnimationFrame(step); else res();
      };
      raf = requestAnimationFrame(step);
    });
  }
  const wait = (ms) => new Promise((res) => seq.push(setTimeout(res, ms)));
  function stopSeq() { seq.forEach(clearTimeout); seq = []; cancelAnimationFrame(raf); run++; }
  let run = 0, userMoved = false;

  /* Opening: the pointer starts on the giants, swings to the tiny channels, and clicks home to your size. Under 2s, once. */
  async function sweep() {
    const me = ++run;
    pos = N - 1; vel = 0; shown = -1; needle();
    await wait(320); if (me !== run) return;
    cancelAnimationFrame(raf);
    await tween(N - 1, 0, 820); if (me !== run) return;
    await wait(140); if (me !== run) return;
    spring(Y.home, { onSettle: () => {} });
    seq.push(setTimeout(() => { if (me === run) click(true); }, 150));
  }

  function load(kind, { sweep: doSweep = false } = {}) {
    stopSeq();
    Y = yardstick(kind);
    N = Y.rows.length;
    hit.setAttribute("aria-valuemax", String(N - 1));
    draw();
    roFine.textContent = `Reach for ${Y.e.name}, a made-up ${Y.e.word}. Turn the dial: drag it, or use the arrow keys.`;
    userMoved = false;
    if (doSweep) { sweep(); return; }
    pos = Y.home; vel = 0; shown = -1; needle();
  }

  /* dragging */
  const toP = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W, y = ((ev.clientY - r.top) / r.height) * H;
    let a = Math.atan2(CY - y, x - CX);
    if (a < -Math.PI / 2) a += 2 * Math.PI;
    return clamp((Math.PI - M - a) / ((Math.PI - 2 * M) / (N - 1)), -0.2, N - 1 + 0.2);
  };
  let lastP = 0, lastT = 0;
  hit.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    stopSeq(); userMoved = true; dragging = true;
    hit.setPointerCapture(ev.pointerId);
    hit.focus({ preventScroll: true });
    lastP = pos; lastT = performance.now();
    pos = toP(ev);
    if (needle()) click(Math.round(pos) === Y.home);
    ev.preventDefault();
  });
  hit.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const now = performance.now();
    const p = toP(ev);
    vel = ((p - lastP) / Math.max(1, now - lastT)) * 1000 * 0.4;
    lastP = p; lastT = now; pos = p;
    if (needle()) click(Math.round(pos) === Y.home);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    const flick = clamp(pos + vel * 0.08, 0, N - 1);
    spring(clamp(Math.round(flick), 0, N - 1));
  };
  hit.addEventListener("pointerup", release);
  hit.addEventListener("pointercancel", release);
  hit.addEventListener("keydown", (ev) => {
    let to = null;
    const cur = Math.round(target);
    if (ev.key === "ArrowRight" || ev.key === "ArrowUp") to = cur + 1;
    if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") to = cur - 1;
    if (ev.key === "Home") to = 0;
    if (ev.key === "End") to = N - 1;
    if (ev.key === "Enter" || ev.key === " ") to = Y.home;
    if (to === null) return;
    ev.preventDefault();
    stopSeq(); userMoved = true;
    spring(clamp(to, 0, N - 1));
  });

  return { load };
})();

/* ================================================================ the record proof */
$("[data-rec-est]").textContent = gbp(NOVA.est);
$("[data-rec-paid]").textContent = gbp(NOVA.paid);
$("[data-rec-say]").textContent = `YouTube estimated ${gbp(NOVA.est)} of ad revenue for ${NOVA.monthName}. AdSense paid ${gbp(NOVA.paid)}. The record holds what was paid.`;
$("[data-rec-fine]").textContent = `${NOVA.name}, a made-up channel from the Orbe record engine: ${NOVA.rows.length} months, every one read from a payout.`;
$("[data-months]").innerHTML = NOVA.rows.map((r, i) => `<li style="--i:${i}" title="${r.month}"></li>`).join("");
$("[data-months]").setAttribute("aria-label", `${NOVA.rows.length} months, every one read from a payout, none estimated`);

/* ================================================================ 2. the read */
const term = $("[data-term]");
const linesEl = $("[data-lines]");
const sumEl = $("[data-sum]");
const termOrb = makeOrb($("[data-orb='term']"));
const termCount = $("[data-term-count]");
const termHint = $("[data-term-hint]");
const runBtn = $("[data-run]");
let reading = 0, readDone = false, current = null;

const EXAMPLE = {
  path: `example / ${NOVA.name.toLowerCase().replace(/\s+/g, "-")}-payouts.csv`,
  cmd: `read ${NOVA.name.toLowerCase().replace(/\s+/g, "-")}-payouts.csv`,
  cur: "£",
  rows: NOVA.rows,
  skipped: { label: `YouTube estimates, ${NOVA.estimates} rows`, amount: NOVA.estimateSum },
  extra: `${NOVA.monthName}: YouTube estimated ${gbp(NOVA.est)}, AdSense paid ${gbp(NOVA.paid)}.`,
  total: NOVA.total,
};

function layout(doc) {
  current = doc;
  $("[data-term-path]").textContent = doc.path;
  $("[data-term-cmd]").textContent = doc.cmd;
  const n = doc.rows.length;
  linesEl.innerHTML = doc.rows.map((r) => `<li class="ln"><span>${esc(r.month)}</span><span class="src">${esc(r.sources)}</span><span class="amt">${esc(gbp(r.amount, doc.cur))}</span><span class="st">read</span></li>`).join("")
    + (doc.skipped ? `<li class="ln est-ln"><span>all</span><span class="src">${esc(doc.skipped.label)}</span><span class="amt"><s>${esc(gbp(doc.skipped.amount, doc.cur))}</s></span><span class="st">skipped</span></li>` : "");
  sumEl.innerHTML = [
    `<p class="big">${n} month${n === 1 ? "" : "s"} read. 0 estimated.</p>`,
    doc.extra ? `<p>${esc(doc.extra)}</p>` : "",
    `<p>paid in ${n} month${n === 1 ? "" : "s"}: ${esc(gbp(doc.total, doc.cur))}</p>`,
    `<p class="fee">fee so far: <b>£0.00</b></p>`,
  ].join("");
  termCount.textContent = `0 of ${n} month${n === 1 ? "" : "s"}`;
  setOrb(termOrb, 0);
}

function finishRead(doc) {
  const n = doc.rows.length;
  $$(".ln", linesEl).forEach((l) => l.classList.add("on"));
  $$("p", sumEl).forEach((p) => p.classList.add("on"));
  termCount.textContent = `${n} of ${n} month${n === 1 ? "" : "s"}`;
  setOrb(termOrb, n ? 1 : 0);
  termHint.textContent = doc === EXAMPLE ? "Read. Press Enter to read it again, or drop your own export." : "Read in this browser. Nothing was uploaded.";
  runBtn.innerHTML = `${doc === EXAMPLE ? "Read it again" : "Read the example"} <kbd>Enter</kbd>`;
  readDone = true;
}

/* Three tempos, as at Steel: a line a month every 72ms, the orb chasing each month over 300ms, then the summary in a beat. Under 2.5s in all. */
function runRead(doc = EXAMPLE) {
  const me = ++reading;
  readDone = false;
  layout(doc);
  if (still) { finishRead(doc); return; }
  termHint.textContent = "Reading. Only payouts count; estimates are skipped.";
  const lines = $$(".ln", linesEl), sums = $$("p", sumEl);
  const n = doc.rows.length;
  const every = Math.min(72, 1700 / Math.max(1, n));
  lines.forEach((l, i) => setTimeout(() => {
    if (me !== reading) return;
    l.classList.add("on");
    if (i < n) {
      termCount.textContent = `${i + 1} of ${n} month${n === 1 ? "" : "s"}`;
      tweenOrb(termOrb, (i + 1) / n, 300);
    }
  }, i * every));
  const t1 = lines.length * every + 160;
  sums.forEach((p, i) => setTimeout(() => { if (me === reading) p.classList.add("on"); }, t1 + i * 90));
  setTimeout(() => { if (me === reading) finishRead(doc); }, t1 + sums.length * 90 + 40);
}

layout(EXAMPLE);
if (still) finishRead(EXAMPLE);
else if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); if (!readDone && reading === 0) runRead(EXAMPLE); }
  }, { threshold: 0.35 });
  io.observe(term);
}
runBtn.addEventListener("click", () => runRead(EXAMPLE));

/* reading the visitor's own export, in the browser */
const fileIn = $("[data-file]");
$("[data-open]").addEventListener("click", () => fileIn.click());
fileIn.addEventListener("change", () => { const f = fileIn.files?.[0]; if (f) readFile(f); fileIn.value = ""; });
let depth = 0;
term.addEventListener("dragenter", (ev) => { ev.preventDefault(); depth++; term.classList.add("is-over"); });
term.addEventListener("dragover", (ev) => { ev.preventDefault(); });
term.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) term.classList.remove("is-over"); });
term.addEventListener("drop", (ev) => {
  ev.preventDefault(); depth = 0; term.classList.remove("is-over");
  const f = ev.dataTransfer?.files?.[0]; if (f) readFile(f);
});

function splitRow(line, d) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function monthOf(s) {
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:[T\s].*)?$/))) return `${m[1]}-${m[2].padStart(2, "0")}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return `${m[3]}-${m[2].padStart(2, "0")}`;
  if ((m = s.toLowerCase().match(/^(?:\d{1,2}\s+)?([a-z]{3})[a-z]*\.?,?\s+(?:\d{1,2},?\s+)?(\d{4})$/)) && MONTHS.includes(m[1])) return `${m[2]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}`;
  return null;
}
function moneyOf(s) {
  if (!/\d/.test(s) || monthOf(s)) return null;
  let t = s.replace(/[£$€\s]|GBP|USD|EUR/gi, "");
  const neg = /^\(.*\)$/.test(t) || t.startsWith("-");
  t = t.replace(/[()\-+]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const v = Math.round(parseFloat(t) * 100);
  return neg ? -v : v;
}
function parseExport(text, fileName) {
  const rows0 = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!rows0.length) return null;
  const first = rows0[0];
  const d = [",", "\t", ";"].reduce((a, c) => (first.split(c).length > first.split(a).length ? c : a), ",");
  const rows = rows0.map((l) => splitRow(l, d));
  const hasDate = (r) => r.some((c) => monthOf(c));
  const head = hasDate(rows[0]) ? null : rows[0].map((h) => h.toLowerCase());
  const body = head ? rows.slice(1) : rows;
  const find = (re) => (head ? head.findIndex((h) => re.test(h)) : -1);
  const aCol = find(/amount|earning|revenue|gross|net|paid|payout|payment|total|value/);
  const sCol = find(/source|platform|product|type|description|name|payee|merchant|stream|network|item/);
  const cur = (text.match(/[£$€]/) ?? [""])[0] || (/\bUSD\b/.test(text) ? "$" : /\bEUR\b/.test(text) ? "€" : "£");
  const stem = fileName.replace(/\.[^.]+$/, "");
  const by = new Map();
  let skipped = 0, skippedSum = 0;
  for (const r of body) {
    const m = r.map(monthOf).find(Boolean);
    if (!m) continue;
    let amt = aCol >= 0 ? moneyOf(r[aCol] ?? "") : null;
    if (amt === null) { for (let i = r.length - 1; i >= 0; i--) { const v = moneyOf(r[i]); if (v !== null) { amt = v; break; } } }
    if (amt === null) continue;
    if (/estimat/i.test(r.join(" "))) { skipped++; skippedSum += amt; continue; }
    const src = sCol >= 0 && r[sCol] ? r[sCol] : stem;
    const g = by.get(m) ?? { month: m, sources: new Set(), amount: 0 };
    g.sources.add(src.slice(0, 24)); g.amount += amt; by.set(m, g);
  }
  const all = [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
  if (!all.length) return null;
  const shown = all.slice(-36).map((g) => ({ month: g.month, sources: [...g.sources].slice(0, 3).join(", ") + (g.sources.size > 3 ? ", more" : ""), amount: g.amount }));
  return {
    path: `your file / ${fileName}`,
    cmd: `read ${fileName}`,
    cur,
    rows: shown,
    skipped: skipped ? { label: `estimates, ${skipped} row${skipped === 1 ? "" : "s"}`, amount: skippedSum } : null,
    extra: all.length > shown.length ? `Showing the last ${shown.length} of ${all.length} months.` : "",
    total: shown.reduce((a, r) => a + r.amount, 0),
  };
}
function readFile(f) {
  if (f.size > 8 * 1024 * 1024) { termHint.textContent = "That file is over 8 MB. Try a monthly payout export."; return; }
  const r = new FileReader();
  r.onload = () => {
    const doc = parseExport(String(r.result ?? ""), f.name);
    if (!doc) { termHint.textContent = `No dates and amounts found in ${f.name}. Try a CSV export with a date and an amount column.`; return; }
    term.focus({ preventScroll: true });
    runRead(doc);
  };
  r.onerror = () => { termHint.textContent = "That file could not be read."; };
  r.readAsText(f);
}

/* ================================================================ shortcuts that really work */
const typing = (t) => t && (t.closest("input, select, textarea, [contenteditable='true']") || t.closest("[data-finish]"));
function inView(el, share = 0.3) {
  const r = el.getBoundingClientRect();
  const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  return vis > Math.min(r.height, innerHeight) * share;
}
function goRead() {
  const sec = $("#read");
  sec.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  term.focus({ preventScroll: true });
  setTimeout(() => runRead(EXAMPLE), still ? 0 : 520);
}
function goReserve() {
  $("#reserve").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  $("[data-r-handle]").focus({ preventScroll: true });
}
for (const a of $$("[data-go-read]")) a.addEventListener("click", (ev) => { ev.preventDefault(); goRead(); });
for (const a of $$("a[href='#reserve']")) a.addEventListener("click", (ev) => { ev.preventDefault(); goReserve(); });
document.addEventListener("keydown", (ev) => {
  if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey || typing(ev.target)) return;
  const k = ev.key.toLowerCase();
  if (k === "escape") { if (openProof) { const c = clauses.find((x) => x.dataset.clause === openProof); setProof(openProof); c?.focus(); } return; }
  if (ev.target.closest && ev.target.closest("[data-dial-hit]")) return;
  if (k === "r") { ev.preventDefault(); goReserve(); }
  else if (k === "w") { ev.preventDefault(); goRead(); }
  else if (k === "o" && inView(term)) { ev.preventDefault(); fileIn.click(); }
  else if (k === "enter") {
    const t = ev.target;
    const free = t === document.body || t === document.documentElement || t === term;
    if (free && inView(term)) { ev.preventDefault(); runRead(EXAMPLE); }
  }
});

/* ================================================================ 3. reserving a handle */
const rForm = $("[data-reserve]");
const rHandle = $("[data-r-handle]");
const rKind = $("[data-r-kind]");
const rNote = $("[data-r-note]");
rKind.innerHTML = ORDER.map((k) => `<option value="${k}">${esc(KINDS[k].label)}</option>`).join("");
rKind.value = S.kind;
function syncReserve() {
  const h = cleanHandle(rHandle.value).toLowerCase();
  $("[data-r-mirror]").textContent = h ? "@" + h : "my handle";
  rNote.classList.remove("is-error");
  rNote.innerHTML = `orbe.vc/@<span data-r-url>${esc(h || "yourhandle")}</span>`;
  rHandle.parentElement.classList.remove("is-error");
  rHandle.removeAttribute("aria-invalid");
}
rHandle.addEventListener("input", syncReserve);
rKind.addEventListener("change", () => { if (!S.handle && rKind.value !== S.kind) { S.kind = rKind.value; render(); } else S.kind = rKind.value; });
rForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const h = cleanHandle(rHandle.value).toLowerCase();
  if (!h) {
    rNote.textContent = "Type the handle you want first.";
    rNote.classList.add("is-error");
    rHandle.parentElement.classList.add("is-error");
    rHandle.setAttribute("aria-invalid", "true");
    rHandle.focus();
    return;
  }
  rHandle.value = h; syncReserve();
  const res = await reserve({ handle: h, kind: rKind.value });
  rNote.textContent = res.via === "api"
    ? `@${h} is held for you. We'll check it's yours when ratings open.`
    : `Your email app has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
});

/* ================================================================ wordmarks and nav */
mountWordmark($("[data-wordmark]"), { animate: false });
mountWordmark($("[data-wordmark-foot]"), { animate: false });
const nav = $("[data-nav]");
const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

/* Fonts can land after first layout; nothing here holds a measured width at rest, so only an open sheet needs placing again. */
document.fonts?.ready.then(() => { if (!finish.hidden) placeFinish(); });

/* For the review harness: the state of the page. */
window.__r9c = { S, dial, runRead, setProof, render, KINDS, NOVA };
