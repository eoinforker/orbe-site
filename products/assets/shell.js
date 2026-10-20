/*
  Shared by every product page, on the shared system (../../assets/orbe/):
  the header, the footer and the pointer trail from orbe/chrome.js and
  orbe/trail.js, the quiet products tab row under the header, the small
  print, and small DOM and formatting helpers, file reading, and per-tab
  storage that never leaves this browser.
*/
import { mountHeader, mountFooter } from "../../assets/orbe/chrome.js";
import { mountTrail } from "../../assets/orbe/trail.js";
import { icon } from "../../assets/icons/icons.js";

export { icon };

export const TOOLS = [
  { key: "hub", href: "", label: "All products" },
  { key: "rate", href: "rate/", label: "Rate my work" },
  { key: "podcasts", href: "podcasts/", label: "Podcasts" },
  { key: "sponsorships", href: "sponsorships/", label: "Sponsorships" },
  { key: "selling", href: "selling/", label: "Selling" },
  { key: "diligence", href: "diligence/", label: "Diligence" },
  { key: "roster", href: "roster/", label: "Roster" },
];

/* The products tab row's markup. Each page carries it in its HTML (so nothing moves at first
   paint); `shell` builds it only for a page that does not. */
export function tabsHTML(current, depth = 1) {
  const up = "../".repeat(depth);
  return `<nav class="pr-tabs" aria-label="Orbe products">${TOOLS.map((t) => `<a href="${up}${t.href}"${t.key === current ? ' aria-current="page"' : ""}>${t.label}</a>`).join("")}</nav>`;
}

/*
  Pages call this first. `depth` is how many folders below /products/ the page sits.
  The footer mounts before the header, so the header sees every field.
*/
export function shell(current, depth = 1) {
  const root = "../".repeat(depth + 1);
  const main = document.querySelector("main");
  let foot = document.querySelector("[data-ob-footer]");
  if (!foot) { foot = document.createElement("footer"); foot.dataset.obFooter = ""; (main ?? document.body).after(foot); }
  let head = document.querySelector("[data-ob-header]");
  if (!head) { head = document.createElement("header"); head.dataset.obHeader = ""; document.body.prepend(head); }
  if (!document.querySelector(".pr-tabs")) {
    const band = document.querySelector(".pr-band .wrap") ?? main;
    band?.insertAdjacentHTML("afterbegin", tabsHTML(current, depth));
  }
  smallPrint(main);
  mountFooter(foot, { root });
  const header = mountHeader(head, { root, current: current === "hub" ? "products/" : `products/${current}/` });
  mountTrail({ loud: ".pr-band" });
  // The band's scene: its own object in the free space beside the words (bands.js).
  import("./bands.js").then((m) => m.mountBand(current)).catch(() => {});
  tabs(document.querySelector(".pr-tabs"));
  fades(document.querySelector(".page-tabs"));
  // Static disclosures get the same caret as the ones the tools build.
  for (const sum of document.querySelectorAll("details.fold > summary")) if (!sum.querySelector(".o-icon")) sum.insertAdjacentHTML("afterbegin", icon("caret", { size: 16, className: "caret" }));
  return header;
}

/* A row that scrolls fades at whichever edge has more to show. */
function fades(row) {
  if (!row) return;
  const edges = () => {
    const more = row.scrollWidth - row.clientWidth;
    row.classList.toggle("fade-l", more > 1 && row.scrollLeft > 1);
    row.classList.toggle("fade-r", more > 1 && row.scrollLeft < more - 1);
  };
  row.addEventListener("scroll", edges, { passive: true });
  addEventListener("resize", edges);
  requestAnimationFrame(edges);
}

/* On a phone the tab row scrolls: the current tab is centred in the row without moving the page. */
function tabs(row) {
  if (!row) return;
  fades(row);
  const cur = row.querySelector('[aria-current="page"]');
  if (cur && row.scrollWidth > row.clientWidth) {
    const r = row.getBoundingClientRect();
    const c = cur.getBoundingClientRect();
    row.scrollLeft += c.left + c.width / 2 - (r.left + row.clientWidth / 2);
  }
}

/* The small print under every tool: what runs where, and what every figure is. */
function smallPrint(main) {
  if (!main || main.querySelector(".pr-print")) return;
  const f = document.createElement("section");
  f.className = "pr-print wrap";
  f.dataset.head = "light";
  f.setAttribute("aria-label", "The small print");
  f.innerHTML = `<p class="ob-note">Everything on these pages runs in your browser. What you type or upload stays on this device: there is no server behind them, and nothing is sent anywhere. Every creator, show, brand and figure in an example is made up and labelled so.</p>
  <p class="ob-note">Ratings, bands, sub-scores and benchmarks are independently calculated by Orbe, not provided by YouTube, Spotify, Apple or any other platform. Valuations and prices are indicative only: not advice, not a formal valuation and not an offer. Platform names are trademarks of their owners. <a href="mailto:hello@orbe.vc">hello@orbe.vc</a></p>`;
  main.append(f);
}

/* ---------- storage that fails quietly (private windows, blocked storage) ---------- */
const safe = (area) => ({
  get(k) { try { return area().getItem(k); } catch { return null; } },
  set(k, v) { try { area().setItem(k, v); return true; } catch { return false; } },
  json(k) { try { const v = area().getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  put(k, v) { try { area().setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
});
export const store = { local: safe(() => localStorage), session: safe(() => sessionStorage) };

/* ---------- DOM ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function html(el, markup) { el.innerHTML = markup; return el; }

/* Segmented control: buttons with data-v inside `el`. */
export function segmented(el, onPick) {
  const pick = (v) => { for (const b of $$("button", el)) b.setAttribute("aria-pressed", String(b.dataset.v === v)); onPick(v); };
  for (const b of $$("button", el)) b.addEventListener("click", () => pick(b.dataset.v));
  return pick;
}

/* ---------- formatting (British English, no dashes) ---------- */
const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const count = (n) => (n === null || n === undefined || !Number.isFinite(n) ? "n/a" : nf.format(Math.round(n)));
export function money(m, { pence = false } = {}) {
  if (!m) return "n/a";
  const sym = { GBP: "£", USD: "$", EUR: "€" }[m.currency] ?? "";
  const v = m.amount / 100;
  return `${v < 0 ? "\u2212" : ""}${sym}${new Intl.NumberFormat("en-GB", { minimumFractionDigits: pence ? 2 : 0, maximumFractionDigits: pence ? 2 : 0 }).format(Math.abs(v))}`;
}
export const pct = (x, dp = 0) => (x === null || x === undefined ? "n/a" : `${(x * 100).toFixed(dp)}%`);
export const bps = (b) => `${(b / 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
export const day = (iso) => (iso ? new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace("Sept", "Sep") : "");
export const today = () => new Date().toISOString().slice(0, 10);
const regions = (() => { try { return new Intl.DisplayNames(["en-GB"], { type: "region" }); } catch { return null; } })();
export const country = (code) => { if (!code || code === "Unknown" || code === "Other") return code || "Unknown"; try { return regions?.of(code.toUpperCase()) ?? code; } catch { return code; } };
/* Copy is checked for dashes: replace any that slip in from data. */
export const nodash = (s) => String(s ?? "").replace(/\s*[\u2013\u2014]\s*/g, ", ");

/* ---------- files ---------- */
export const readText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(file); });

/* An image as a JPEG data URI no wider or taller than `max` px, so it fits in storage and on a card. */
export async function readImage(file, max = 900) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* A drop zone around a file input: drag a file on, or tap to choose. */
export function dropZone(zone, input, onFile) {
  input.addEventListener("change", () => input.files[0] && onFile(input.files[0]));
  for (const ev of ["dragenter", "dragover"]) zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("over"); });
  for (const ev of ["dragleave", "drop"]) zone.addEventListener(ev, () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f); });
}

export function download(name, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* Copy, then say so on the button itself for a moment (the button keeps its width). */
export async function copyText(btn, text) {
  try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement("textarea"); t.value = text; document.body.append(t); t.select(); try { document.execCommand("copy"); } catch {} t.remove(); }
  const label = btn.querySelector("[data-label]") ?? btn;
  const was = label.textContent;
  btn.style.minWidth = `${btn.offsetWidth}px`;
  label.textContent = "Copied";
  setTimeout(() => { label.textContent = was; btn.style.minWidth = ""; }, 1400);
}

/* A copy button's inner markup: the copy glyph and a label that can change. */
export const copyLabel = (word = "Copy") => `${icon("copy", { size: 16 })}<span data-label>${word}</span>`;

/* ---------- the guide's working, in plain HTML ----------
   fold(): a <details> that keeps the answer on show and folds how Orbe got there
   (AI Elements Reasoning, Quartz Reasoning: still text, a count in the summary, no shimmer).
   sourcesList(): where each figure came from, with its provenance (AI Elements Sources).
   ask(): a step that waits on the person, with Deny and Allow (Quartz ToolCall awaiting
   permission, AI Elements Confirmation). It resolves to one line saying what happened. */
export function fold(title, meta, body, { open = false } = {}) {
  return `<details class="fold"${open ? " open" : ""}><summary>${icon("caret", { size: 16, className: "caret" })}<span>${title}${meta ? ` <span class="meta">${meta}</span>` : ""}</span></summary><div class="fold-body">${body}</div></details>`;
}

const SOURCE_GLYPH = { file: "record", typed: "person", link: "link", connected: "source", engine: "chart", public: "search" };
export function sourcesList(items) {
  return `<ul class="sources">${items.map((s) => `<li>${icon(SOURCE_GLYPH[s.kind] ?? "record", { size: 16 })}<span class="src-t">${s.url ? `<a href="${esc(s.url)}" rel="noopener noreferrer" target="_blank">${esc(s.label)}</a>` : esc(s.label)}</span>${s.provenance ? `<span class="src-p">${esc(s.provenance)}</span>` : ""}</li>`).join("")}</ul>`;
}

export function ask(el, { title, body, call, allow = "Allow", deny = "Deny", onAllow, onDeny, allowed, denied, then }) {
  el.innerHTML = `<div class="ask" role="group" aria-labelledby="${el.id || (el.id = `ask-${Math.random().toString(36).slice(2, 8)}`)}-t">
    <div class="ask-head"><h3 id="${el.id}-t">${esc(title)}</h3><span class="state waiting">Waiting on you</span></div>
    <div class="ask-body"><p>${esc(body)}</p>${call ? `<div class="ask-call">${esc(call)}</div>` : ""}</div>
    <div class="ask-acts"><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-deny>${esc(deny)}</button><button class="ob-btn ob-btn--s" type="button" data-allow><span class="ob-orb" aria-hidden="true"></span>${esc(allow)}</button></div>
  </div>`;
  const settle = (ok) => {
    const r = ok ? onAllow?.() : onDeny?.();
    const line = ok ? allowed : denied;
    el.innerHTML = `<p class="ask-done" tabindex="-1"><span class="state ${ok ? "good" : ""}">${ok ? "Allowed" : "Denied"}</span><span>${esc(typeof line === "function" ? line(r) : line)}</span></p>`;
    el.firstElementChild.focus({ preventScroll: true });
    then?.(ok, r);
  };
  el.querySelector("[data-allow]").addEventListener("click", () => settle(true));
  el.querySelector("[data-deny]").addEventListener("click", () => settle(false));
}

/* ---------- small charts (single series, hover titles, with a table view) ---------- */
export function barsList(entries, { label = (k) => k, max } = {}) {
  const top = max ?? Math.max(1, ...entries.map(([, n]) => n));
  return `<ul class="bars">${entries.map(([k, n]) => `<li><span class="bl" title="${esc(label(k))}">${esc(label(k))}</span><span class="bt"><span class="bf" style="width:${Math.max(1.5, (100 * n) / top).toFixed(1)}%"></span></span><span class="bn">${count(n)}</span></li>`).join("")}</ul>`;
}

/* Vertical bars over days, drawn as an SVG with a <title> per bar for hover. */
export function dayChart(series, { height, unit = "downloads", width } = {}) {
  const w = width ?? (innerWidth < 640 ? 380 : 720);
  height ??= w < 500 ? 200 : 180;
  const pad = { l: 34, r: 6, t: 8, b: 22 };
  const max = Math.max(1, ...series.map((d) => d.value));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const bw = iw / series.length;
  const gap = Math.min(2, bw * 0.25);
  const y = (v) => pad.t + ih - (v / top) * ih;
  let g = "";
  for (let v = 0; v <= top; v += step) g += `<line class="grid-l" x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${count(v)}</text>`;
  const bars = series.map((d, i) => {
    const h = Math.max(0, (d.value / top) * ih);
    const x = pad.l + i * bw + gap / 2;
    const r = Math.min(4, (bw - gap) / 2, h);
    const x2 = x + bw - gap;
    const yb = pad.t + ih;
    const path = h <= 0 ? "" : `M${x},${yb}V${yb - h + r}Q${x},${yb - h} ${x + r},${yb - h}H${x2 - r}Q${x2},${yb - h} ${x2},${yb - h + r}V${yb}Z`;
    return `<g><rect x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${ih}" fill="transparent"><title>${esc(day(d.label))}: ${count(d.value)} ${unit}</title></rect>${path ? `<path class="bar" d="${path}"><title>${esc(day(d.label))}: ${count(d.value)} ${unit}</title></path>` : ""}</g>`;
  }).join("");
  const ticks = [0, Math.floor(series.length / 2), series.length - 1].map((i) => `<text class="ax" x="${pad.l + i * bw + bw / 2}" y="${height - 6}" text-anchor="${i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}">${esc(day(series[i].label).replace(/ \d{4}$/, ""))}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${height}" role="img" aria-label="${esc(unit)} by day">${g}${bars}${ticks}</svg>`;
}
function niceStep(max) {
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
}

/* What works today, as one ruled table (the pages carry it in their HTML; this builds it for one that does not). */
export function liveStrip({ live, local, api }) {
  // Open on a wide screen; folded on a phone so the tool's first control is on screen.
  const open = matchMedia("(min-width: 760px)").matches;
  return `<details class="fold live-fold"${open ? " open" : ""}><summary>${icon("caret", { size: 16, className: "caret" })}<span>What works today</span></summary>
  <dl class="live">
    <div><dt>Live now</dt><dd>${live}</dd></div>
    <div><dt>In your browser</dt><dd>${local}</dd></div>
    <div><dt>With the API</dt><dd>${api}</dd></div>
  </dl></details>`;
}
