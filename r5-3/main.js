import { ORDER, example, mathsFor, benchmark, EXAMPLE_LINE } from "../assets/r5/examples.js";
import { reserve, cleanHandle } from "../assets/r5/reserve.js";
import { SELLER_FEE, PRICES } from "../assets/r5/terms.js";
import { value, gbp } from "../assets/js/valuation.js";
import { mountWordmark } from "../assets/r5/wordmark.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wide = matchMedia("(min-width: 1181px)");
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* Where each kind of work is published, in the words a creator would use. */
const KIND = {
  channel: { opt: "YouTube", noun: "YouTube channel", a: "a YouTube channel", after: "" },
  newsletter: { opt: "Substack", noun: "Substack newsletter", a: "a Substack newsletter", after: "Substack" },
  stream: { opt: "Twitch", noun: "Twitch streamer", a: "a Twitch streamer", after: "Twitch" },
  podcast: { opt: "Podcast", noun: "Podcast", a: "a podcast", after: "podcasts" },
  portfolio: { opt: "Photography", noun: "Photographer", a: "a photographer", after: "photography" },
};

/*
  The record behind each example: what a creator would connect, and the profit it shows.
  The buyer's listing is drawn from exactly this, with the name withheld and figures banded.
*/
const RECORD = {
  channel: { profit: 142300, sources: [["YouTube Analytics", "14 Oct"], ["AdSense, trailing year", "14 Oct"], ["Stripe, memberships", "14 Oct"], ["Sponsor invoices", "12 Oct"]] },
  newsletter: { profit: 96400, sources: [["Substack, subscribers and payouts", "14 Oct"], ["Stripe, paid plans", "14 Oct"], ["Sponsor invoices", "11 Oct"]] },
  stream: { profit: 188500, sources: [["Twitch, subscriptions and bits", "15 Oct"], ["YouTube, past broadcasts", "15 Oct"], ["Sponsor invoices", "13 Oct"]] },
  podcast: { profit: 71900, sources: [["Podcast host, downloads", "13 Oct"], ["Ad network statements", "13 Oct"], ["Listener memberships", "12 Oct"]] },
  portfolio: { profit: 58200, sources: [["Licensing agency statements", "14 Oct"], ["Print shop orders", "14 Oct"], ["Stripe, commissions", "10 Oct"]] },
};
const exact = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;
const profitBand = (n) => (n < 50e3 ? "Under £50k" : n < 100e3 ? "£50k to £100k" : n < 250e3 ? "£100k to £250k" : n < 500e3 ? "£250k to £500k" : "£500k and over");
const lastChecked = (k) => RECORD[k].sources[0][1];

/** One record, two views: the creator's card and the buyer's row are both read from this. */
function view(k) {
  const e = example(k);
  const r = RECORD[k];
  return {
    ...e,
    noun: KIND[k].noun,
    profit: r.profit,
    sources: r.sources,
    listing: { title: `${KIND[k].noun}, ${e.sizeBand}`, rating: e.band, profit: `${profitBand(r.profit)} a year`, checked: `Checked ${lastChecked(k)}` },
  };
}

/* Ratings are derived metrics: say once per card that Orbe calculates them, beside the example label. */
$$("[data-example]").forEach((el) => (el.textContent = `${EXAMPLE_LINE} Independently calculated by Orbe.`));
$$('[data-p="membership"]').forEach((el) => (el.textContent = PRICES.membership));
$$('[data-p="report"]').forEach((el) => (el.innerHTML = `${PRICES.report}<small>${PRICES.reportMember} for members</small>`));
$$('[data-p="reportFull"]').forEach((el) => (el.textContent = `${PRICES.report} a business, or ${PRICES.reportMember} for members`));
$("[data-fee]").textContent = `${SELLER_FEE[0].toUpperCase()}${SELLER_FEE.slice(1)}.`;

/* The drawn wordmark: it plays once in the nav, and sits still in the footer. */
mountWordmark($(".nav .wm"));
mountWordmark($(".foot .wm"), { animate: false });

const heroSelect = $("#kind");

/* ---------- 1. The hero card and the buyer's listing ---------- */
const hc = $(".hc");
const f = (n) => $(`[data-f="${n}"]`, hc);
const lst = $(".lst");
const l = (n) => $(`[data-l="${n}"]`, lst);

function fillCard(k) {
  const d = view(k);
  f("name").textContent = d.name;
  f("handle").textContent = d.handle;
  f("noun").textContent = `${d.noun}, ${d.sizeBand}`;
  f("num").textContent = d.signed;
  f("band").textContent = d.band;
  f("peers").textContent = d.peers;
  f("parts").innerHTML = d.parts
    .map((p) => `<li><span class="p-n">${p.name}</span><span class="p-v">${p.value}</span><span class="p-bar"><i style="transform:scaleX(${p.score / 100})"></i></span><span class="p-s">Beats ${p.score} in 100<span class="p-peers"> ${d.peers} this size</span></span></li>`)
    .join("");
  f("profit").textContent = exact(d.profit);
  f("src").textContent = `${d.sources.length} sources, checked ${lastChecked(k)}`;
}

/* The card holds the height of its tallest kind, so the tour never moves the page. */
function lockCard() {
  hc.style.minHeight = "";
  let h = 0;
  for (const k of ORDER) { fillCard(k); h = Math.max(h, hc.offsetHeight); }
  fillCard(current);
  hc.style.minHeight = `${h}px`;
}

function fillListing(k, state) {
  const d = view(k);
  l("title").textContent = d.listing.title;
  $('[data-f="checked"]', lst).textContent = d.listing.checked;
  $(".x", l("creator")).textContent = d.name;
  $(".x", l("rating")).textContent = d.signed;
  $(".b", l("rating")).textContent = d.listing.rating;
  $(".x", l("profit")).textContent = exact(d.profit);
  $(".b", l("profit")).textContent = d.listing.profit;
  ["creator", "rating", "profit"].forEach((n) => {
    l(n).classList.toggle("wait", state === "wait");
    l(n).classList.remove("exact");
  });
}

/*
  The wires: each field the buyer sees runs back to the field on the creator's card it came from.
  Side by side, three wires cross the gap between the doors. Stacked on a phone, two wires run
  straight down the card's edges into the strip beneath it: rating on the left, profit on the right.
*/
const svg = $(".wires");
const NS = "http://www.w3.org/2000/svg";
let paths = [];

function el(tag, attrs) {
  const n = document.createElementNS(NS, tag);
  for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v);
  return n;
}
const R = (n) => Math.round(n * 2) / 2;

function layoutWires() {
  svg.replaceChildren();
  paths = [];
  const box = $(".doors").getBoundingClientRect();
  const card = hc.getBoundingClientRect();
  const rel = (r) => ({ l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, y: r.top + r.height / 2 - box.top });
  const c = rel(card);

  if (wide.matches) {
    const x1 = c.r;
    const x2 = rel($("dt", l("creator").parentElement).getBoundingClientRect()).l - 7;
    const ws = [["name", "creator"], ["num", "rating"], ["profit", "profit"]].map(([from, to]) => {
      const a = rel(f(from).getBoundingClientRect());
      const b = rel($("dt", l(to).parentElement).getBoundingClientRect());
      return { from, to, y1: R(a.y), y2: R(b.y) };
    });
    /* Each wire takes its own lane: falling wires, lowest first, then rising wires, so none cross. */
    const down = ws.filter((w) => w.y2 >= w.y1).sort((a, b) => b.y1 - a.y1);
    const up = ws.filter((w) => w.y2 < w.y1).sort((a, b) => a.y1 - b.y1);
    const lanes = [...up, ...down];
    const gap = (x2 - x1) / (lanes.length + 1);
    lanes.forEach((w, i) => {
      const cx = R(x1 + gap * (i + 1));
      const dy = w.y2 - w.y1;
      const r = Math.min(6, Math.abs(dy) / 2);
      const s = Math.sign(dy);
      const d = Math.abs(dy) < 1
        ? `M${x1},${w.y1} H${x2}`
        : `M${x1},${w.y1} H${cx - r} Q${cx},${w.y1} ${cx},${w.y1 + s * r} V${w.y2 - s * r} Q${cx},${w.y2} ${cx + r},${w.y2} H${x2}`;
      add(d, x1, w.y1, x2, w.y2, w);
    });
  } else {
    const num = rel(f("num").getBoundingClientRect());
    const prof = rel(f("profit").getBoundingClientRect());
    const rt = rel($("dt", l("rating").parentElement).getBoundingClientRect());
    const pt = rel($(".b", l("profit")).getBoundingClientRect());
    const xl = R(c.l + 9), xr = R(c.r - 9);
    const yr = R(num.t + num.height * 0.55 || num.y), ytr = R(rt.y);
    const yp = R(prof.y), ytp = R(pt.y);
    const r = 6;
    const a1 = R(num.l - 5), a2 = R(rt.l - 6);
    add(`M${a1},${yr} H${xl + r} Q${xl},${yr} ${xl},${yr + r} V${ytr - r} Q${xl},${ytr} ${xl + r},${ytr} H${a2}`, a1, yr, a2, ytr, { from: "num", to: "rating", y1: yr });
    const b1 = R(prof.r + 5), b2 = R(pt.r + 6);
    add(`M${b1},${yp} H${xr - r} Q${xr},${yp} ${xr},${yp + r} V${ytp - r} Q${xr},${ytp} ${xr - r},${ytp} H${b2}`, b1, yp, b2, ytp, { from: "profit", to: "profit", y1: yp });
  }
  paths.sort((a, b) => a.y1 - b.y1);
}
function add(d, xa, ya, xb, yb, w) {
  const p = el("path", { d });
  const a = el("circle", { cx: xa, cy: ya, r: 2.5 });
  const b = el("circle", { cx: xb, cy: yb, r: 2.5 });
  svg.append(p, a, b);
  paths.push({ p, a, b, from: w.from, to: w.to, y1: w.y1 });
}

function travel(path, ms) {
  return new Promise((done) => {
    const len = path.getTotalLength();
    const dot = el("circle", { r: 3, class: "pulse" });
    svg.appendChild(dot);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const p = path.getPointAtLength(len * e);
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
      if (k < 1) requestAnimationFrame(step);
      else { dot.remove(); done(); }
    };
    requestAnimationFrame(step);
  });
}

/* A field arrives as the exact figure, then settles into what a buyer is allowed to see. */
async function arrive(name) {
  const dd = l(name);
  dd.classList.remove("wait");
  dd.classList.add("exact");
  await wait(700);
  dd.classList.remove("exact");
}

let flowId = 0;
let drawn = false;
async function flow() {
  const id = ++flowId;
  layoutWires();
  if (reduce) { ["creator", "rating", "profit"].forEach((n) => l(n).classList.remove("wait", "exact")); drawn = true; svg.classList.remove("idle"); return; }
  const first = !drawn;
  drawn = true;
  if (first) paths.forEach(({ p, a, b }) => { const len = p.getTotalLength(); p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = `${len}`; a.style.opacity = 0; b.style.opacity = 0; });
  svg.classList.remove("idle");
  const wired = new Set(paths.map((p) => p.to));
  const steps = ["creator", "rating", "profit"].map((n) => paths.find((p) => p.to === n) || { to: n });
  for (const st of steps) {
    if (id !== flowId) return;
    if (!wired.has(st.to)) { await wait(first ? 200 : 80); arrive(st.to); continue; }
    const src = f(st.from);
    src.classList.add("hl");
    if (first) {
      const len = st.p.getTotalLength();
      st.a.style.opacity = 1;
      const ms = Math.min(1100, 420 + len * 0.9);
      st.p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
      await wait(ms * 0.82);
    } else {
      await travel(st.p, Math.min(900, 380 + st.p.getTotalLength() * 0.5));
    }
    if (id !== flowId) return;
    st.b.style.opacity = 1;
    arrive(st.to);
    setTimeout(() => src.classList.remove("hl"), 700);
    await wait(first ? 180 : 90);
  }
}

let current = "channel";
async function show(k) {
  if (k === current) return;
  current = k;
  if (reduce) { fillCard(k); fillListing(k, "done"); layoutWires(); return; }
  hc.classList.add("swap");
  ["creator", "rating", "profit"].forEach((n) => l(n).classList.add("wait"));
  await wait(240);
  fillCard(k);
  fillListing(k, "wait");
  hc.classList.remove("swap");
  await wait(200);
  if (drawn) flow();
}

fillCard("channel");
fillListing("channel", reduce ? "done" : "wait");

/* The wires draw when the listing can be seen: at once side by side, on a phone when the strip scrolls in. */
const land = async () => {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  lockCard();
  document.documentElement.classList.remove("pre");
  hc.classList.add("on");
  if (reduce) { flow(); return; }
  if (wide.matches) { await wait(900); flow(); return; }
  layoutWires();
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    setTimeout(flow, 250);
  }, { rootMargin: "0px 0px -18% 0px", threshold: 0.2 });
  io.observe(lst);
};
land();

/* Anything that moves the card or the strip (a reservation, a wrap, a resize) re-routes the wires. */
let roT;
new ResizeObserver(() => {
  cancelAnimationFrame(roT);
  roT = requestAnimationFrame(() => { if (drawn) layoutWires(); });
}).observe($(".doors"));

let resizeT;
let lastW = innerWidth;
addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (innerWidth !== lastW) { lastW = innerWidth; lockCard(); }
    layoutWires();
    if (drawn) ["creator", "rating", "profit"].forEach((n) => l(n).classList.remove("wait"));
  }, 120);
});

/* One pass through every kind of work, then it rests on YouTube, where ratings open first. */
const pauseBtn = $(".hc-pause");
const tour = ["newsletter", "stream", "podcast", "portfolio", "channel"];
let tourAt = 0;
let tourTimer = null;
let paused = false;
let cardSeen = true;
new IntersectionObserver(([e]) => (cardSeen = e.isIntersecting), { threshold: 0.3 }).observe(hc);
function stopTour() {
  clearTimeout(tourTimer);
  tourTimer = null;
  tourAt = tour.length;
  pauseBtn.classList.add("gone");
}
function nextTour() {
  if (paused) return;
  if (tourAt >= tour.length) { pauseBtn.classList.add("gone"); return; }
  tourTimer = setTimeout(() => {
    if (paused) return;
    if (document.hidden || !cardSeen || !drawn) return nextTour();
    show(tour[tourAt++]);
    nextTour();
  }, 5200);
}
if (reduce) pauseBtn.classList.add("gone");
else nextTour();
pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "Play" : "Pause";
  pauseBtn.setAttribute("aria-pressed", String(paused));
  if (paused) clearTimeout(tourTimer);
  else nextTour();
});

function setKind(k) {
  show(k);
  selectTab(k, false);
  fillRecord(k);
  fillBench(k);
}
heroSelect.addEventListener("change", () => { stopTour(); setKind(heroSelect.value); });
$('[data-form="hero"]').addEventListener("focusin", stopTour);

/* ---------- 2. The rating, kind by kind: the maths, the plain English and what to try ---------- */
const tabs = $(".tabs");
tabs.innerHTML = ORDER.map((k, i) => `<button role="tab" id="tab-${k}" data-k="${k}" aria-controls="rc-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${KIND[k].opt}</button>`).join("");
const rc = $(".rc-body");
const plain = $(".plain");
const g = (n) => $(`[data-g="${n}"]`, n === "plainH" || n === "explain" || n === "tryK" || n === "try" ? plain : rc);

let currentTab = null;
function fillTab(k) {
  const d = example(k);
  const all = d.result.parts;
  const detail = d.result.detail.parts;
  const m = mathsFor(k);
  g("name").textContent = d.name;
  g("meta").textContent = `${KIND[k].noun}, ${d.sizeBand}`;
  const x = ((Math.max(-3, Math.min(3, d.rating)) + 3) / 6) * 100;
  g("you").style.setProperty("--x", `${x}%`);
  $("b", g("you")).textContent = `${d.signed} ${d.band}`;
  g("srScore").textContent = `${d.name} is rated ${d.signed}, ${d.band}.`;
  g("mathsH").textContent = `How ${KIND[k].a}'s rating is weighted`;
  g("exH").textContent = d.name;
  g("bar").innerHTML = m.map((p) => `<span style="--w:${p.weight}">${p.weight}%</span>`).join("");
  g("rows").innerHTML = m
    .map((p) => {
      const s = all.find((q) => q.name === p.name);
      return `<tr><th scope="row"><span class="w-n">${p.name}</span><span class="w-d">${p.what}</span></th><td class="w-w">${p.weight}%</td><td class="w-x">${s ? `<span>${s.value}</span><span class="w-s">beats ${s.score} in 100</span>` : ""}</td></tr>`;
    })
    .join("");
  g("plainH").textContent = `${d.name}, in plain English`;
  $("[data-card-link]").href = `../card/?kind=${k}`;
  g("explain").textContent = d.explain;
  const weakest = [...all].sort((a, b) => a.score - b.score || (detail.find((q) => q.key === b.key)?.weight ?? 0) - (detail.find((q) => q.key === a.key)?.weight ?? 0))[0];
  const advice = detail.find((q) => q.key === weakest.key)?.advice;
  g("tryK").innerHTML = `What to try <span>Weakest part: ${weakest.name}, beats ${weakest.score} in 100 ${d.peers} this size</span>`;
  g("try").textContent = advice ?? "";
}

async function selectTab(k, focus) {
  $$("button", tabs).forEach((b) => {
    const on = b.dataset.k === k;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on) {
      rc.setAttribute("aria-labelledby", b.id);
      if (focus) b.focus();
      if (tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: b.offsetLeft - 8, behavior: reduce ? "auto" : "smooth" });
    }
  });
  if (k === currentTab) return;
  const firstFill = currentTab === null;
  currentTab = k;
  if (reduce || firstFill) { fillTab(k); return; }
  rc.classList.add("swap");
  plain.classList.add("swap");
  await wait(180);
  fillTab(k);
  rc.classList.remove("swap");
  plain.classList.remove("swap");
}
tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { selectTab(b.dataset.k, false); fillBench(b.dataset.k); } });
tabs.addEventListener("keydown", (e) => {
  const i = ORDER.indexOf(currentTab);
  let n = null;
  if (e.key === "ArrowRight") n = ORDER[(i + 1) % ORDER.length];
  if (e.key === "ArrowLeft") n = ORDER[(i + ORDER.length - 1) % ORDER.length];
  if (e.key === "Home") n = ORDER[0];
  if (e.key === "End") n = ORDER[ORDER.length - 1];
  if (n) { e.preventDefault(); selectTab(n, true); fillBench(n); }
});
selectTab("channel", false);

/* ---------- 3. The record and the value ---------- */
let ticked = reduce;
function fillRecord(k) {
  const d = view(k);
  $('[data-r="url"]').textContent = `orbe.vc/${d.handle}`;
  $('[data-r="sources"]').innerHTML = d.sources
    .map(([s, when]) => `<li class="${ticked ? "" : "wait"}"><span>${s}</span><span data-when="Checked ${when}">${ticked ? `Checked ${when}` : "Reading"}</span></li>`)
    .join("");
  $('[data-r="profit"]').textContent = exact(d.profit);
}
fillRecord("channel");
if (!reduce) {
  const src = $('[data-r="sources"]');
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    $$("li", src).forEach((li, i) => setTimeout(() => {
      const s = $("[data-when]", li);
      s.textContent = s.dataset.when;
      li.classList.remove("wait");
      li.classList.add("done");
      if (i === $$("li", src).length - 1) ticked = true;
    }, 450 + i * 380));
  }, { threshold: 0.6 });
  io.observe(src);
}

const range = $("#profit");
function valuation() {
  const profit = Number(range.value);
  const rpm = 4.2;
  const v = value({ views: (profit * 0.55 * 1000) / (12 * rpm), rpm, sponsors: profit * 0.35, other: profit * 0.1, margin: 1, faceDependence: 0.5, age: 6 });
  $('[data-v="low"]').textContent = gbp(v.low);
  $('[data-v="high"]').textContent = gbp(v.high);
  $('[data-v="mult"]').textContent = `${v.mLow.toFixed(1)} to ${v.mHigh.toFixed(1)} times a year's profit, from what similar businesses sold for.`;
  $('[data-v="profit"]').textContent = gbp(profit);
  range.setAttribute("aria-valuetext", `${gbp(profit)} profit a year`);
}
range.addEventListener("input", valuation);
valuation();

/* ---------- 4. Buyers: the same records, as rows, and the benchmark from the engine ---------- */
$("[data-offers]").innerHTML = ["channel", "newsletter", "stream", "podcast"]
  .map((k) => {
    const d = view(k);
    return `<tr data-k="${k}"><td>${d.noun}</td><td>${d.sizeBand}</td><td>${profitBand(d.profit)}</td><td>${d.band}, ${d.signed}</td></tr>`;
  })
  .join("");

const pct = (v) => { const n = v * 100; return `${n < 10 ? n.toFixed(1) : Math.round(n)}%`; };
function fillBench(k) {
  const b = benchmark(k);
  const top = Math.max(...b.rows.map((r) => r.value));
  $('[data-bn="title"]').textContent = b.title;
  $('[data-bn="what"]').textContent = b.what;
  $('[data-bn="line"]').textContent = b.line;
  $('[data-bn="key"]').innerHTML = `<i></i>${example(k).name}'s size, ${example(k).sizeBand}`;
  $("[data-bench]").innerHTML = b.rows
    .map((r) => `<li class="${r.key === b.example ? "mid" : ""}"><span>${r.label}</span><span class="bar"><i style="width:${(r.value / top) * 100}%"></i></span><b>${pct(r.value)}</b></li>`)
    .join("");
}
fillBench("channel");

/* ---------- Reserving a handle ---------- */
const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
$$("input[name=handle]").forEach((i) => i.addEventListener("input", () => { if (i.value.startsWith("@")) i.value = i.value.replace(/^@+/, ""); }));

function youPanel(h, kind, via) {
  const held = via === "api";
  const k = KIND[kind];
  const opens = kind === "channel" ? "Opens with YouTube" : "Opens after YouTube";
  const word = example(kind).word;
  const chars = [...`@${h}`].map((c, i) => `<span class="c" style="--i:${i}">${esc(c)}</span>`).join("");
  return `<div class="you">
    <p class="you-addr" aria-label="orbe.vc/@${esc(h)}"><span class="pre" aria-hidden="true">orbe.vc/</span><span class="you-h" aria-hidden="true">${chars}</span></p>
    <p class="you-meta">${k.noun}, ${held ? "held" : "requested"} ${today}</p>
    <p class="you-slot"><span>Your rating</span><b>${opens}</b></p>
    <p class="you-then">${held ? "The handle is held." : "Send the email that opened and the handle is held."} We'll check it's yours when ratings open. Your card will live at this address.</p>
    <p class="you-acts"><button type="button" class="you-copy" data-link="https://orbe.vc/@${esc(h)}">Copy link</button><a href="#rating" data-k="${kind}">How ${KIND[kind].a} your size is read</a><a href="../card/?kind=${kind}">See the card you'll get</a></p>
  </div>`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest(".you-copy");
  if (b) {
    const link = b.dataset.link;
    try { await navigator.clipboard.writeText(link); }
    catch {
      const t = Object.assign(document.createElement("textarea"), { value: link });
      document.body.append(t); t.select();
      try { document.execCommand("copy"); } catch {}
      t.remove();
    }
    b.textContent = "Copied";
    b.classList.add("ok");
    setTimeout(() => { b.textContent = "Copy link"; b.classList.remove("ok"); }, 2200);
    return;
  }
  const a = e.target.closest(".you-acts a");
  if (a) { selectTab(a.dataset.k, false); }
});

$$(".reserve").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const which = form.dataset.form;
    const after = $(`[data-after="${which}"]`);
    const input = $("input[name=handle]", form);
    const kind = $("select[name=kind]", form).value;
    const h = cleanHandle(input.value).toLowerCase();
    if (!h) {
      after.innerHTML = "<p>Type the handle you'd like, without the @.</p>";
      input.focus();
      return;
    }
    stopTour();
    const btn = $("button", form);
    btn.disabled = true;
    let res;
    try { res = await reserve({ handle: h, kind }); } catch { res = { ok: false, reason: "error" }; }
    btn.disabled = false;
    if (!res.ok) {
      after.innerHTML = res.reason === "taken"
        ? `<p><b>@${esc(h)}</b> is already held. Try another.</p>`
        : `<p>Something went wrong. Write to <a href="mailto:hello@orbe.vc">hello@orbe.vc</a> and we'll hold it by hand.</p>`;
      return;
    }
    input.value = h;
    btn.textContent = res.via === "api" ? "Held" : "Requested";
    after.innerHTML = youPanel(h, kind, res.via);
    after.classList.add("has-you");
    if (heroSelect.value !== kind) heroSelect.value = kind;
    setKind(kind);
  });
});
