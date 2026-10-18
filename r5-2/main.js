import { ORDER, example, MATHS, EXAMPLE_LINE } from "../assets/r5/examples.js";
import { reserve, cleanHandle, MAILBOX } from "../assets/r5/reserve.js";
import { SELLER_FEE, PRICES } from "../assets/r5/terms.js";
import { value, gbp } from "../assets/js/valuation.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const wait = (ms) => new Promise((r) => setTimeout(r, still.matches ? 0 : ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* How each kind is named, and where ratings open for it. */
const KIND = {
  channel: { platform: "YouTube", card: "YouTube channel", after: "" },
  newsletter: { platform: "Substack", card: "Newsletter", after: "Substack" },
  stream: { platform: "Twitch", card: "Twitch stream", after: "Twitch" },
  podcast: { platform: "Podcast", card: "Podcast", after: "podcasts" },
  portfolio: { platform: "Photography", card: "Photography", after: "photography" },
};

/* The sources an example record would be checked against, per kind. */
const SOURCES = {
  channel: [["YouTube Analytics", "Views, watch time and subscribers", "14 Oct"], ["AdSense", "Ad revenue, the trailing year", "14 Oct"], ["Stripe", "Memberships and products", "14 Oct"], ["Sponsor invoices", "Sponsor income, by brand", "12 Oct"]],
  newsletter: [["Substack", "Subscribers, opens and paid conversion", "14 Oct"], ["Stripe", "Paid subscriptions and churn", "14 Oct"], ["Sponsor invoices", "Sponsorship income, by issue", "12 Oct"]],
  stream: [["Twitch", "Viewers, subscribers and hours streamed", "14 Oct"], ["Twitch payouts", "Subscriptions, Bits and ads", "14 Oct"], ["YouTube Analytics", "Clips and past broadcasts", "14 Oct"], ["Sponsor invoices", "Sponsor income, by brand", "11 Oct"]],
  podcast: [["Host analytics", "Downloads by episode, first 30 days", "14 Oct"], ["Ad network statements", "Ad revenue, the trailing year", "13 Oct"], ["Sponsor invoices", "Host-read sponsorships", "12 Oct"]],
  portfolio: [["Licensing statements", "Licences and royalties, by image", "14 Oct"], ["Print shop orders", "Editions released and sold", "14 Oct"], ["Stripe", "Direct sales and commissions", "13 Oct"]],
};

document.documentElement.classList.add("js");
$$("[data-example-line]").forEach((el) => (el.textContent = EXAMPLE_LINE));

/* ---------- The number roll: only changed digits move, right to left ---------- */
function roll(el, text) {
  const chars = [...text];
  if (el.dataset.len !== String(chars.length)) {
    el.dataset.len = chars.length;
    el.innerHTML = chars.map((c) => (/\d/.test(c)
      ? `<span class="col-d"><span>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<span>${d}</span>`).join("")}</span></span>`
      : `<span class="ch${c === "." ? " dp" : ""}">${c}</span>`)).join("");
  }
  const cells = [...el.children];
  let k = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    const cell = cells[i], c = chars[i];
    if (cell.classList.contains("col-d")) {
      const strip = cell.firstElementChild;
      if (strip.style.getPropertyValue("--d") !== c) { strip.style.setProperty("--dl", `${k * 25}ms`); k++; }
      strip.style.setProperty("--d", c);
    } else cell.textContent = c;
  }
}

/* ---------- State: one kind for the whole page ---------- */
let kind = "channel";
let reserved = null;
let first = true;

const result = $("#result");
const SWAP = ".r-addr, .r-name, .r-meta, .r-zero, .r-parts, .r-foot p, .tally, .explain, .rec tbody, .rec .c-addr";
const swapEls = () => $$(SWAP);

function renderHero(e) {
  $('[data-r="handle"]').textContent = e.handle;
  $('[data-r="name"]').textContent = e.name;
  $('[data-r="label"]').textContent = KIND[e.kind].card;
  $('[data-r="size"]').textContent = e.sizeBand;
  $('[data-r="band"]').textContent = e.band;
  $('[data-r="ratingText"]').textContent = `Rating ${e.signed}, ${e.band}.`;
  $('[data-r="peers"]').textContent = e.peers;
  $('[data-r="best"]').textContent = e.best;
  $('[data-r="parts"]').innerHTML = e.parts.map((p) => `
    <li><span class="rp-n">${esc(p.name)} <span class="rp-b">beats ${p.score} in 100</span></span><span class="rp-v">${esc(p.value)}</span>
    <span class="rp-bar"><i style="--s:${first ? 0 : p.score}" data-s="${p.score}"></i></span></li>`).join("");
}

function renderReading(e, animateTicks) {
  const x = Math.max(0, Math.min(100, ((e.rating + 3) / 6) * 100));
  const mark = $("[data-mark]");
  mark.style.setProperty("--x", `${x}%`);
  mark.style.transform = `translateX(${(x / 100) * $(".sc-line").clientWidth}px)`;
  $('[data-s="rating"]').textContent = e.signed;
  $('[data-s="name"]').textContent = e.name;
  const W = $(".sc-line").clientWidth, lw = $(".sc-lab").offsetWidth;
  mark.classList.toggle("flip", (x / 100) * W + lw + 14 > W);
  $('[data-s="caption"]').textContent = `${e.name} rates ${e.signed}, ${e.band}. Zero is typical for ${e.peers} this size.`;
  $$(".sc-bands span").forEach((s) => s.classList.toggle("on", s.textContent === e.band));

  const list = $('[data-s="parts"]');
  if (!list.children.length) {
    list.innerHTML = [0, 1, 2].map(() => `<li class="t-row"><span class="t-n"></span><span class="t-v"></span>
      <span class="t-ticks" aria-hidden="true">${Array.from({ length: 100 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</span>
      <span class="t-what"><span class="w"></span><b></b></span></li>`).join("");
  }
  [...list.children].forEach((li, n) => {
    const p = e.parts[n];
    $(".t-n", li).textContent = p.name;
    $(".t-v", li).textContent = p.value;
    $(".w", li).textContent = p.what;
    $("b", li).textContent = `Beats ${p.score} in 100 ${e.peers} this size`;
    li.dataset.score = p.score;
    if (animateTicks) setTicks(li, p.score);
  });
  $(".explain").textContent = e.explain;
  pitchTicks();
}

function pitchTicks() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  $$(".t-ticks").forEach((t) => {
    const w = t.clientWidth;
    const tw = Math.max(1, Math.round(Math.min(2, w / 300) * dpr)) / dpr;
    t.style.setProperty("--tw", `${tw}px`);
    [...t.children].forEach((i, n) => (i.style.left = `${Math.round(((n * (w - tw)) / 99) * dpr) / dpr}px`));
  });
}

function setTicks(li, n) {
  $$(".t-ticks i", li).forEach((t, i) => t.classList.toggle("on", i < n));
}

function renderRecord(e) {
  $('[data-rec="handle"]').textContent = e.handle;
  $('[data-rec="rows"]').innerHTML = SOURCES[e.kind].map(([s, w, d], i) =>
    `<tr><td>${esc(s)}</td><td>${esc(w)}</td><td><span class="chk" style="--i:${i}">${esc(d)}</span></td></tr>`).join("");
}

function syncControls() {
  $$("[data-kind-select]").forEach((s) => (s.value = kind));
  $$("[data-tab]").forEach((b) => {
    const on = b.dataset.tab === kind;
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
  });
  if (!reserved) $("[data-note]").textContent = noteFor(kind);
}

const noteFor = (k) => k === "channel"
  ? "Ratings open with YouTube. Substack, Twitch, podcasts and photography follow."
  : `Ratings open with YouTube, then ${KIND[k].after}. Here's how a ${example(k).word} is read.`;

let readingSeen = false;
async function setKind(k) {
  if (!ORDER.includes(k)) return;
  const changed = k !== kind || first;
  kind = k;
  syncControls();
  if (!changed) return;
  const e = example(k);
  if (first) {
    renderHero(e); renderReading(e, false); renderRecord(e);
    roll($('[data-roll="rating"]'), e.signed);
    first = false;
    return;
  }
  const els = swapEls();
  els.forEach((el) => el && el.classList.add("xf"));
  roll($('[data-roll="rating"]'), e.signed);
  $('[data-r="band"]').textContent = e.band;
  renderReading(e, false);
  await wait(200);
  renderHero(e);
  renderRecord(e);
  renderReading(e, readingSeen);
  if (reserved) renderYou();
  requestAnimationFrame(() => {
    $$(".rp-bar i").forEach((i) => (i.style.setProperty("--s", i.dataset.s)));
    els.forEach((el) => el && el.classList.remove("xf"));
  });
}

/* ---------- Controls ---------- */
$$("[data-kind-select]").forEach((s) => s.addEventListener("change", () => setKind(s.value)));
const tabs = $$("[data-tab]");
tabs.forEach((b) => { const e = example(b.dataset.tab); $(".n", b).textContent = e.name; $(".r", b).textContent = e.signed; });
tabs.forEach((b, i) => {
  b.addEventListener("click", () => setKind(b.dataset.tab));
  b.addEventListener("keydown", (ev) => {
    const d = ev.key === "ArrowDown" || ev.key === "ArrowRight" ? 1 : ev.key === "ArrowUp" || ev.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    ev.preventDefault();
    const n = tabs[(i + d + tabs.length) % tabs.length];
    n.focus();
    setKind(n.dataset.tab);
  });
});
$$(".f-addr").forEach((a) => a.addEventListener("click", () => $("input", a).focus()));
$$("[data-focus]").forEach((a) => a.addEventListener("click", (ev) => {
  ev.preventDefault();
  const input = $("#" + a.dataset.focus);
  window.scrollTo({ top: 0, behavior: still.matches ? "auto" : "smooth" });
  input.focus({ preventScroll: true });
}));

/* ---------- Reserving: the address becomes yours ---------- */
const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function renderYou() {
  const { handle, via } = reserved;
  const e = example(kind);
  const h = $('[data-you="handle"]');
  const text = "@" + handle;
  if (h.dataset.h !== text) {
    h.dataset.h = text;
    h.setAttribute("aria-label", text);
    h.innerHTML = [...text].map((c, i) => `<span class="c" aria-hidden="true" style="--i:${i}">${esc(c)}</span>`).join("");
  }
  $('[data-you="meta"]').textContent = `${KIND[kind].card} · ${via === "api" ? "reserved" : "requested"} ${today}`;
  $('[data-you="slot"]').textContent = kind === "channel" ? "Opens with YouTube" : "Opens after YouTube";
  const opens = kind === "channel" ? "Ratings open with YouTube, and yours will be waiting." : `Ratings open with YouTube, then ${KIND[kind].after}, and yours will be waiting.`;
  $('[data-you="then"]').innerHTML = `${via === "api" ? `<b>@${esc(handle)}</b> is yours. ` : ""}${opens} Until then, here's how a ${e.word} your size is read, from a made-up ${e.word}.`;
}

async function submit(form, ev) {
  ev.preventDefault();
  const input = $("input", form);
  const k = $("select", form).value;
  const handle = cleanHandle(input.value);
  const isHero = form.id === "lookup";
  const note = isHero ? $("[data-note]") : $("[data-note2]");
  if (!handle) {
    form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
    note.textContent = "Type the handle you'd like, without the @.";
    input.focus();
    return;
  }
  const btn = $(".f-go", form);
  btn.disabled = true;
  btn.textContent = "Reserving";
  let res;
  try { res = await reserve({ handle, kind: k }); } catch { res = { ok: false, reason: "error" }; }
  btn.disabled = false;
  if (!res.ok) {
    btn.textContent = "Reserve my handle";
    note.innerHTML = res.reason === "taken"
      ? `<span class="h">@${esc(handle)}</span> is already held. Try another.`
      : `Something went wrong. Write to <a href="mailto:${MAILBOX}">${MAILBOX}</a> and we'll hold it by hand.`;
    return;
  }
  reserved = { handle: res.handle, via: res.via };
  $$(".field input").forEach((i) => (i.value = res.handle));
  $$(".f-go").forEach((b) => (b.textContent = res.via === "api" ? "Reserved" : "Requested"));
  $$("form.field").forEach((f) => f.classList.add("held"));
  const heroNote = res.via === "api"
    ? `<span class="h">orbe.vc/@${esc(res.handle)}</span> is yours.`
    : `Your email app has the request for <span class="h">@${esc(res.handle)}</span> written out. Send it and the handle is held. Nothing opened? Write to <a href="mailto:${MAILBOX}">${MAILBOX}</a>.`;
  $("[data-note]").innerHTML = heroNote;
  $("[data-note2]").innerHTML = res.via === "api"
    ? `<span class="h">@${esc(res.handle)}</span> is yours. Ratings open with YouTube.`
    : `Send the email that opened and <span class="h">@${esc(res.handle)}</span> is held for you.`;

  const changed = k !== kind;
  await setKind(k);
  if (changed) await wait(240);
  renderYou();
  const you = $("#you");
  you.hidden = false;
  result.classList.add("addressed");
  requestAnimationFrame(() => requestAnimationFrame(() => you.classList.add("open")));
  if (isHero) {
    const top = result.getBoundingClientRect().top;
    if (top > innerHeight * 0.62) result.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "start" });
  }
}
$$("form.field").forEach((f) => f.addEventListener("submit", (ev) => submit(f, ev)));
$$(".field input").forEach((i) => i.addEventListener("input", () => {
  $$(".f-go").forEach((b) => (b.textContent = "Reserve my handle"));
  $$("form.field").forEach((f) => f.classList.remove("held"));
}));

/* ---------- The maths, the terms and the prices ---------- */
$("[data-maths]").innerHTML = MATHS.map((m) => `<li style="--w:${m.weight}"><span class="m-bar">${m.weight}%</span><p class="m-name">${esc(m.name)}<span class="m-w">${m.weight}%</span></p><p class="m-what">${esc(m.what)}</p></li>`).join("");
$("[data-stack]").innerHTML = MATHS.map((m) => `<span style="flex:${m.weight}">${m.weight}%</span>`).join("");
$("[data-fee]").textContent = SELLER_FEE.charAt(0).toUpperCase() + SELLER_FEE.slice(1) + ".";
$$("[data-price]").forEach((el) => (el.textContent = PRICES[el.dataset.price]));

/* ---------- The value card ---------- */
const profit = $("#profit");
function renderValue() {
  const p = Number(profit.value);
  const rpm = 4.2;
  const v = value({ views: (p * 0.55 * 1000) / (12 * rpm), rpm, sponsors: p * 0.35, other: p * 0.1, margin: 1, faceDependence: 0.5, age: 9 });
  $('[data-v="low"]').textContent = gbp(v.low);
  $('[data-v="high"]').textContent = gbp(v.high);
  $('[data-v="profit"]').textContent = gbp(p);
  $('[data-v="mult"]').textContent = `${v.mLow.toFixed(1)} to ${v.mHigh.toFixed(1)} times a year's profit, from what similar businesses sold for.`;
  const pc = ((p - profit.min) / (profit.max - profit.min)) * 100;
  profit.style.setProperty("--p", `${pc}%`);
  profit.setAttribute("aria-valuetext", `${gbp(p)} a year`);
}
profit.addEventListener("input", renderValue);
renderValue();

/* ---------- First paint ---------- */
setKind("channel");
addEventListener("resize", () => renderReading(example(kind), readingSeen));

requestAnimationFrame(() => setTimeout(() => {
  result.classList.add("in");
  setTimeout(() => $$(".rp-bar i").forEach((i) => i.style.setProperty("--s", i.dataset.s)), still.matches ? 0 : 420);
}, still.matches ? 0 : 260));

/* The tallies fill the first time the reading is on screen; the record checks in row by row. */
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    if (en.target.classList.contains("tally")) {
      readingSeen = true;
      $$(".t-row", en.target).forEach((li) => setTicks(li, Number(li.dataset.score)));
    } else en.target.classList.remove("wait");
    io.unobserve(en.target);
  }
}, { rootMargin: "0px 0px -18% 0px" });
const src = $(".sources");
if (still.matches || !("IntersectionObserver" in window)) {
  readingSeen = true;
  $$(".t-row").forEach((li) => setTicks(li, Number(li.dataset.score)));
} else {
  io.observe($(".tally"));
  src.classList.add("wait");
  io.observe(src);
}
