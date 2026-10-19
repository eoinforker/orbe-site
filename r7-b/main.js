/* Orbe r7-b: Orbe OS. Every figure comes from the engine via examples.js. */
import { example, benchmark, ORDER, BANDS, EXAMPLE_LINE, mathsFor, MODEL_VERSION } from "../assets/r5/examples.js";
import { ratingNotice } from "../assets/engine/rating/label.js";
import { SPECS } from "../assets/engine/rating/kinds.js";
import { mountWordmark } from "../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = root.classList.contains("rm");
const handleOf = (v) => cleanHandle(v).toLowerCase();

/* ---------- maths: the same reading of the engine as r6-e ---------- */
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* ================================================================ the orb
   One device, everywhere: a dithered sphere whose ink density is a real figure.
   The hero's is the creator's percentile; each yardstick's is that yardstick's;
   the rating's is where the rating sits on the normal curve; yours is empty. */
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
const orbs = new Map(); // canvas -> { p, shown, cell, born }
function rgb(hex) { const h = hex.trim().replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function dotColour(cv) { return rgb(getComputedStyle(cv).getPropertyValue("--dot") || "#6F1726"); }

function drawOrb(cv, t = 0) {
  const st = orbs.get(cv); if (!st) return;
  const w = cv.clientWidth; if (!w) return;
  const cell = st.cell ?? Math.max(3, Math.round(w / 84));
  const n = Math.max(12, Math.floor(w / cell));
  if (cv.width !== n) { cv.width = n; cv.height = n; }
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(n, n);
  const col = dotColour(cv);
  const a = -2.3 + 0.5 * Math.sin(t);
  const L = [Math.cos(a) * 0.62, Math.sin(a) * 0.62 - 0.1, 0.62]; const ll = Math.hypot(...L); L.forEach((v, i) => (L[i] = v / ll));
  const rr = n / 2 - 0.5;
  const target = Math.max(0, Math.min(1, (st.p ?? 0) / 100)) * st.shown;
  /* shade the sphere, then scale it so the disc's mean ink is the figure */
  const shade = new Float32Array(n * n); let sum = 0, cnt = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5 - n / 2) / rr, dy = (y + 0.5 - n / 2) / rr, d2 = dx * dx + dy * dy;
    if (d2 > 1) { shade[y * n + x] = -1; continue; }
    const lit = Math.max(0, dx * L[0] + dy * L[1] + Math.sqrt(1 - d2) * L[2]);
    const s = 0.08 + 0.92 * Math.pow(1 - lit, 1.3);
    shade[y * n + x] = s; sum += s; cnt++;
  }
  const mean = sum / cnt;
  let k = target / mean;
  /* a few passes so clipping at full ink does not under-fill dense orbs */
  for (let it = 0; it < 4; it++) { let m = 0; for (let i = 0; i < shade.length; i++) if (shade[i] >= 0) m += Math.min(1, shade[i] * k); m /= cnt; if (m > 0) k *= target / m; }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const s = shade[y * n + x]; if (s < 0) continue;
    const dx = (x + 0.5 - n / 2) / rr, dy = (y + 0.5 - n / 2) / rr, d = Math.hypot(dx, dy);
    const rim = d > 1 - 1.6 / rr && (x + y) % 2 === 0;
    const ink = Math.min(1, s * k);
    if (rim || ink * 64 > BAYER[(y % 8) * 8 + (x % 8)] + 0.5) { const q = (y * n + x) * 4; img.data[q] = col[0]; img.data[q + 1] = col[1]; img.data[q + 2] = col[2]; img.data[q + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}
function setOrb(cv, p, opts = {}) {
  const st = orbs.get(cv) ?? { shown: reduce ? 1 : 0, born: false };
  st.p = p; Object.assign(st, opts);
  orbs.set(cv, st);
  if (st.born || reduce) { st.shown = 1; drawOrb(cv); }
  else drawOrb(cv);
}
/* An orb builds its density from nothing the first time it is seen, in hard steps. */
function bear(cv) {
  const st = orbs.get(cv); if (!st || st.born) return;
  st.born = true;
  if (reduce) { st.shown = 1; drawOrb(cv); return; }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / 1100);
    st.shown = Math.round((1 - Math.pow(1 - t, 3)) * 12) / 12;
    drawOrb(cv);
    if (t < 1) setTimeout(() => requestAnimationFrame(step), 70);
  };
  requestAnimationFrame(step);
}
function redrawOrbs() { for (const cv of orbs.keys()) drawOrb(cv); }

/* The hero orb turns its light slowly, at about eight frames a second. */
const heroOrb = $('[data-orb="hero"]');
let heroOn = true;
if (!reduce) {
  let t = 0;
  setInterval(() => { if (!heroOn || document.hidden || !orbs.get(heroOrb)?.born) return; t += 0.09; drawOrb(heroOrb, t); }, 125);
  new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(heroOrb);
}

/* ================================================================ scheme */
const swatches = $$(".swatch button");
function setScheme(c, save) {
  root.dataset.scheme = c;
  swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === c)));
  redrawOrbs();
  if (save) {
    try { localStorage.setItem("orbe-r7b-scheme", c); } catch {}
    try { const u = new URL(location.href); u.searchParams.set("c", c); history.replaceState(null, "", u); } catch {}
  }
}
swatches.forEach((b) => b.addEventListener("click", () => setScheme(b.dataset.c, true)));
swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === root.dataset.scheme)));

/* ================================================================ the dock: every kind can play */
const dockLabel = { channel: "YouTube", newsletter: "Substack", stream: "Twitch", podcast: "Podcast", portfolio: "Photos" };
const leadKey = (k) => (k === "newsletter" ? "conversion" : "reach");
const leadOf = (k) => { const e = example(k); return e.result.parts.find((p) => p.key === leadKey(k)); };
const dock = $("[data-dock]");
dock.innerHTML = ORDER.map((k) => `<button type="button" data-tk="${k}" aria-pressed="false" aria-label="${dockLabel[k]}: ${example(k).name}, beats ${leadOf(k).score} in 100"><canvas class="orb orb-d" aria-hidden="true"></canvas><span class="dk-l">${dockLabel[k]}</span><span class="dk-n mono">${leadOf(k).score}</span></button>`).join("");
$$("[data-tk]").forEach((b) => setOrb($("canvas", b), leadOf(b.dataset.tk).score, { cell: 2 }));

/* ================================================================ binding the story */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function firstSentence(e, lead) {
  const ss = e.explain.match(/[^.]+(?:\.\d+[^.]*)*\./g) ?? [e.explain];
  const hit = ss.find((x) => (lead.key === "conversion" ? /paying/ : /beats/).test(x)) ?? ss[0];
  return hit.split(/, (?:which beats|better than)/)[0].replace(/\.$/, "").trim() + ".";
}
let kind = "channel";
let said = "";
function setKind(k, { replay = true } = {}) {
  kind = k;
  const e = example(k);
  const lead = leadOf(k);
  const parts = k === "newsletter" ? ["conversion", "engagement", "growth"].map((key) => e.result.parts.find((p) => p.key === key)) : e.parts;
  const count = WORDS[mathsFor(k).length] ?? String(mathsFor(k).length);
  said = `My ${e.word} is rated ${e.signed}, ${e.band}, against ${e.peers} my size.`;
  const bind = {
    handle: e.handle, lead: String(lead.score), dens: (lead.score / 100).toFixed(2), peers: e.peers, fact: firstSentence(e, lead),
    signed: e.signed, band: e.band,
    weights: `The weights for ${e.peers}: ${mathsFor(k).map((m) => `${m.name} ${m.weight}%`).join(", ")}.`,
    notice: ratingNotice(e.platform), said: `“${said}”`,
    partOf: `${lead.name}, one of ${count} parts`,
    weighs: `The rating weighs all ${count}: ${e.signed}, ${e.band}.`,
    line: EXAMPLE_LINE,
    orbline: `The orb is ${lead.score}% ink: its density is where this ${e.word} stands.`,
  };
  for (const el of $$("[data-b]")) if (bind[el.dataset.b] != null) { el.textContent = bind[el.dataset.b]; delete el.dataset.final; }
  $("[data-meter]").style.setProperty("--to", lead.score / 100);
  const pos = Math.max(0, Math.min(1, (e.rating + 3) / 6));
  $("[data-dot]").style.setProperty("--x", pos);
  $("[data-bands]").innerHTML = BANDS.map((b) => `<li${b === e.band ? ' class="is" aria-current="true"' : ""}>${b}</li>`).join("");
  $("[data-parts]").innerHTML = parts.map((p) => `<li><b class="mono">${p.score}</b><span class="pt-bar" aria-hidden="true"><i style="--to:${p.score / 100}"></i></span><span class="pt-n">${p.name}<small>${p.value}</small></span></li>`).join("");
  for (const b of $$("[data-tk]")) b.setAttribute("aria-pressed", String(b.dataset.tk === k));
  for (const s of $$("[data-kind]")) s.value = k;
  $("[data-peers-you]").textContent = e.peers;
  $("[data-copied]").textContent = "";

  const ratingP = Math.round(phi(e.rating) * 100);
  const rail = $("[data-rail]");
  if (rail) rail.textContent = ["orbe.rating", e.handle, e.label.toLowerCase(), e.sizeBand, `${lead.name.toLowerCase()} ${lead.value}`, `beats ${lead.score} in 100`, `orb density ${(lead.score / 100).toFixed(2)}`, `rating ${e.signed}`, e.band.toLowerCase(), `model ${MODEL_VERSION}`].join("  /  ");
  setOrb(heroOrb, lead.score);
  setOrb($('[data-orb="rating"]'), ratingP, { cell: 3 });
  setOrb($('[data-orb="post"]'), ratingP, { cell: 3 });
  setYard(k);
  if (replay) {
    for (const el of $$("[data-count]")) if (isSeen(el)) countUp(el);
    if (yardSeen) runYard();
  }
}

/* ================================================================ three yardsticks */
const say = (n, mine) => (mine ? "Ahead of most." : n >= 97 ? "Looks like genius." : n >= 75 ? "Looks great." : n >= 45 ? "Looks ordinary." : "Looks weak.");
const VERDICT = { "Looks like genius.": "a genius", "Looks great.": "great", "Looks ordinary.": "ordinary", "Looks weak.": "weak" };
let banded = true;
function setYard(k) {
  const e = example(k);
  const spec = SPECS[e.platform];
  const key = leadKey(k);
  const part = e.result.detail.parts.find((p) => p.key === key);
  const prior = spec.parts.find((p) => p.key === key).prior;
  const own = e.result.parts.find((p) => p.key === key).score;
  const bm = benchmark(k);
  banded = typeof prior.median === "object";
  const typical = (row) => (banded ? prior.median[row.key] : prior.median);
  const beats = (row) => (row.key === bm.example ? own : Math.max(1, Math.min(99, Math.round(phi(Math.log(part.measured / typical(row)) / prior.sigma) * 100))));
  const first = bm.rows[0], last = bm.rows[bm.rows.length - 1], mine = bm.rows.find((r) => r.key === bm.example);
  const what = part.name.toLowerCase();
  const rows = [[first, false], [last, false], [mine, true]];
  const stack = $("[data-yard]");
  stack.setAttribute("aria-label", `One ${e.word}'s ${what}, against three sizes of ${e.peers}`);
  stack.innerHTML = rows.map(([row, m], i) => {
    const n = beats(row);
    const unfair = !m && banded;
    return `<div class="win yw${m ? " mine" : ""}${unfair ? " unfair" : ""}" data-win style="--i:${i}">
      <div class="tb" data-tb>${unfair ? `<button type="button" class="tb-box tb-close" data-l="${row.label}" aria-label="Close the ${row.label} yardstick" aria-expanded="true"></button>` : '<span class="tb-box" aria-hidden="true"></span>'}<span class="tb-t"><span class="tb-w">yardstick </span>${i + 1}/3<span class="tb-shut">, not fair</span></span><span class="tb-r">${m ? "its size" : `${row.label}: ${n}`}</span></div>
      <div class="ybody"><div class="wb yb">
        <canvas class="orb orb-y" aria-hidden="true"></canvas>
        <div class="y-txt">
          <p class="mono k">${m ? `Its size, ${row.label}` : `Against ${row.label}`}</p>
          <p class="y-say"><span class="y-w">${say(n, m || !banded)}</span>${unfair ? '<span class="y-x mono"> Not fair</span>' : ""}</p>
          <p class="mono y-what">${part.name}, beats in 100</p>
        </div>
        <b class="y-n">${n}</b>
      </div></div>
    </div>`;
  }).join("");
  $$(".yw", stack).forEach((w, i) => setOrb($("canvas", w), beats(rows[i][0]), { cell: 2 }));
  $("[data-yard-why]").textContent = banded
    ? `Against small ${e.peers}, ${VERDICT[say(beats(first))]}. Against the giants, ${VERDICT[say(beats(last))]}.`
    : "Size does not move paid conversion.";
  $("[data-yard-h]").textContent = banded ? "Neither is fair." : "Every yardstick is fair here.";
  for (const b of $$(".tb-close", stack)) b.addEventListener("click", () => {
    const w = b.closest(".yw");
    const shut = !w.classList.contains("closed");
    w.classList.toggle("closed", shut);
    w.classList.add("struck");
    b.setAttribute("aria-expanded", String(!shut));
    b.setAttribute("aria-label", `${shut ? "Reopen" : "Close"} the ${b.dataset.l} yardstick`);
  });
  winObs && $$("[data-win]", stack).forEach((w) => winObs.observe(w));
  for (const w of $$(".yw", stack)) bindDrag(w);
}
let yardSeen = false;
let yardTimers = [];
function runYard() {
  yardTimers.forEach(clearTimeout); yardTimers = [];
  const ws = $$(".yw");
  const unfair = ws.filter((w) => w.classList.contains("unfair"));
  const mine = ws.find((w) => w.classList.contains("mine"));
  const shut = (w) => { w.classList.add("closed"); const b = $(".tb-close", w); if (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", `Reopen the ${b.dataset.l} yardstick`); } };
  if (reduce) { unfair.forEach((w) => { w.classList.add("struck"); shut(w); }); mine?.classList.add("fair"); return; }
  const at = (ms, f) => yardTimers.push(setTimeout(f, ms));
  unfair.forEach((w, i) => at(900 + i * 450, () => w.classList.add("struck")));
  unfair.forEach((w, i) => at(2100 + i * 380, () => shut(w)));
  at(2100 + unfair.length * 380, () => mine?.classList.add("fair"));
}

/* ================================================================ windows: open, stack, drag */
let z = 10;
let winObs = null;
if ("IntersectionObserver" in window) {
  winObs = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add("open"); winObs.unobserve(e.target); }
  }, { threshold: 0.12 });
}
function bindDrag(w) {
  const tb = $("[data-tb]", w); if (!tb || tb.dataset.bound) return;
  tb.dataset.bound = "1";
  let sx = 0, sy = 0, bx = 0, by = 0, lo = 0, hi = 0, top = 0, id = null;
  w.addEventListener("pointerdown", () => { w.style.zIndex = ++z; });
  tb.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest("button, a") || ev.button > 0) return;
    id = ev.pointerId; tb.setPointerCapture(id);
    sx = ev.clientX; sy = ev.clientY;
    bx = +w.dataset.dx || 0; by = +w.dataset.dy || 0;
    const r = w.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    lo = bx + (6 - r.left); hi = bx + (vw - 14 - r.right);
    top = by - (r.top + scrollY) + 50;
    w.classList.add("dragging");
  });
  tb.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== id) return;
    const dx = Math.max(lo, Math.min(hi, bx + ev.clientX - sx));
    const dy = Math.max(top, by + ev.clientY - sy);
    w.dataset.dx = dx; w.dataset.dy = dy;
    w.style.setProperty("--dx", dx + "px"); w.style.setProperty("--dy", dy + "px");
  });
  const end = (ev) => { if (ev.pointerId !== id) return; id = null; w.classList.remove("dragging"); };
  tb.addEventListener("pointerup", end); tb.addEventListener("pointercancel", end);
}
for (const w of $$("[data-win]")) { bindDrag(w); if (winObs && !reduce) winObs.observe(w); else w.classList.add("open"); }
/* a window a keyboard reaches opens at once, so nothing focusable is ever invisible */
document.addEventListener("focusin", (ev) => { const w = ev.target.closest?.("[data-win]"); if (w) w.classList.add("open"); });
/* windows go home when the screen changes width, so nothing is left off the edge */
let lastW = innerWidth;
addEventListener("resize", () => {
  if (Math.abs(innerWidth - lastW) < 40) return;
  lastW = innerWidth;
  for (const w of $$("[data-win]")) { delete w.dataset.dx; delete w.dataset.dy; w.style.removeProperty("--dx"); w.style.removeProperty("--dy"); }
  redrawOrbs();
});

/* ================================================================ seen: orbs build, numbers count, yardsticks strike */
function isSeen(el) { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }
const seenObs = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    const t = e.target;
    if (t.tagName === "CANVAS") bear(t);
    else if (t.matches("[data-count]")) countUp(t);
    else if (t.matches("[data-yard]")) { yardSeen = true; runYard(); }
    seenObs.unobserve(t);
  }
}, { threshold: 0.25 });

function countUp(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent.trim());
  const m = final.match(/^([+\-−]?)(\d+(?:\.\d+)?)(.*)$/);
  if (reduce || !m) return;
  const [, sign, num, rest] = m;
  const dp = (num.split(".")[1] || "").length;
  const target = parseFloat(num);
  const t0 = performance.now();
  el.setAttribute("aria-label", final);
  const step = (now) => {
    if (el.dataset.final !== final) return;
    const t = Math.min(1, Math.max(0, (now - t0) / 900));
    el.textContent = sign + (target * (1 - Math.pow(1 - t, 4))).toFixed(dp) + rest;
    if (t < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(step);
}

/* ================================================================ buyers: every example, by size */
$("[data-roll]").innerHTML = ORDER.map((k) => {
  const x = example(k);
  const [, span = x.sizeBand, unit = ""] = x.sizeBand.match(/^(.*\d\S*)\s+(\D+)$/) ?? [];
  return `<li><span class="rl-s mono">${span}<small>${unit}</small></span><span class="rl-n">${x.name}<small>${x.label}</small></span><b class="rl-r">${x.signed}</b><span class="rl-b mono">${x.band}</span></li>`;
}).join("");

/* ================================================================ the empty orb: yours */
setOrb($('[data-orb="you"]'), 0);

/* ================================================================ wordmarks, clock */
const wm = $("[data-wordmark]");
if (wm) mountWordmark(wm, { animate: !reduce });
for (const el of $$("[data-wordmark-small]")) mountWordmark(el, { animate: false });
const clock = $("[data-clock]");
const tick = () => { try { clock.textContent = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(",", ""); } catch {} };
tick(); setInterval(tick, 30000);

/* ================================================================ start */
setKind("channel", { replay: false });
$("[data-dock]").addEventListener("click", (ev) => { const b = ev.target.closest("[data-tk]"); if (b) setKind(b.dataset.tk); });
for (const k of $$("[data-kind]")) k.addEventListener("change", () => setKind(k.value));
for (const cv of orbs.keys()) seenObs.observe(cv);
for (const el of $$("[data-count]")) seenObs.observe(el);
seenObs.observe($("[data-yard]"));
if (document.fonts) document.fonts.ready.then(redrawOrbs);

/* ================================================================ the rating is the post: copy the line */
$("[data-copy]").addEventListener("click", async () => {
  const e = example(kind);
  const text = `${said} Independently calculated by Orbe. orbe.vc/${e.handle}`;
  const out = $("[data-copied]");
  try { await navigator.clipboard.writeText(text); out.textContent = "Copied. Paste it under your next post."; }
  catch { out.textContent = text; }
});

/* ================================================================ reserving a handle */
const handles = $$("[data-handle]");
function syncHandles(src) {
  for (const h of handles) if (h !== src) h.value = src.value;
  const h = handleOf(src.value);
  for (const m of $$("[data-mirror]")) m.textContent = h || "yourhandle";
  document.body.classList.toggle("typed", !!h);
}
for (const h of handles) h.addEventListener("input", () => syncHandles(h));
for (const form of $$("[data-reserve]")) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const note = $("[data-note]", form);
    const input = $("[data-handle]", form);
    const h = handleOf(input.value);
    if (!h) { note.textContent = "Type the handle you want first."; note.classList.add("is-done"); input.focus(); return; }
    input.value = h;
    syncHandles(input);
    const res = await reserve({ handle: h, kind: $("select", form).value });
    note.classList.add("is-done");
    note.textContent = res.via === "api"
      ? `@${h} is held for you. We'll check it's yours when ratings open with YouTube.`
      : `Your email has opened with the request for @${h}. Send it and the handle is held. We'll check it's yours when ratings open.`;
  });
}
