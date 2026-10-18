/*
  Shared by every product page: the header and tabs, the Blue / Pink palette
  (the founder's choice, as on the site), small DOM and formatting helpers,
  file reading, and per-tab storage that never leaves this browser.
*/
import { mountWordmark } from "../../assets/r5/wordmark.js";

export const TOOLS = [
  { key: "hub", href: "", label: "All products" },
  { key: "rate", href: "rate/", label: "Rate my work" },
  { key: "podcasts", href: "podcasts/", label: "Podcasts" },
  { key: "sponsorships", href: "sponsorships/", label: "Sponsorships" },
  { key: "selling", href: "selling/", label: "Selling" },
  { key: "diligence", href: "diligence/", label: "Diligence report" },
  { key: "card", href: "card/", label: "Your card" },
];

/* Pages call this first. `depth` is how many folders below /products/ the page sits. */
export function shell(current, depth = 1) {
  const up = "../".repeat(depth);
  const header = document.createElement("header");
  header.className = "top";
  header.innerHTML = `
    <div class="wrap top-in">
      <a class="wm" href="${up}../" aria-label="Orbe, home">Orbe</a>
      <a class="crumb" href="${up}">Products</a>
      <span class="top-gap"></span>
      <div class="pal" role="group" aria-label="Brand colour">
        <button type="button" data-c="blue" aria-pressed="true"><span class="sw sw-blue"></span>Blue</button>
        <button type="button" data-c="pink" aria-pressed="false"><span class="sw sw-pink"></span>Pink</button>
      </div>
    </div>
    <nav class="tabs" aria-label="Products">${TOOLS.map((t) => `<a href="${up}${t.href}"${t.key === current ? ' aria-current="page"' : ""}>${t.label}</a>`).join("")}</nav>`;
  document.body.prepend(header);
  const skip = document.createElement("a");
  skip.className = "skip";
  skip.href = "#main";
  skip.textContent = "Skip to content";
  document.body.prepend(skip);
  mountWordmark(header.querySelector(".wm"), { animate: false });
  palette(header);
  const cur = header.querySelector('.tabs [aria-current="page"]');
  if (cur && cur.offsetLeft > innerWidth - 80) cur.scrollIntoView({ inline: "center", block: "nearest" });
  footer();
}

function palette(root) {
  const set = (c, save) => {
    if (c !== "blue" && c !== "pink") return;
    document.documentElement.dataset.c = c;
    for (const b of root.querySelectorAll(".pal button")) b.setAttribute("aria-pressed", String(b.dataset.c === c));
    if (save) store.local.set("orbe-palette", c);
    document.dispatchEvent(new CustomEvent("palette", { detail: c }));
  };
  set(new URLSearchParams(location.search).get("c") || store.local.get("orbe-palette") || "blue", false);
  for (const b of root.querySelectorAll(".pal button")) b.addEventListener("click", () => set(b.dataset.c, true));
}

function footer() {
  const main = document.querySelector("main");
  if (!main || main.querySelector(".foot")) return;
  const f = document.createElement("footer");
  f.className = "foot";
  f.innerHTML = `<p>Everything on these pages runs in your browser. What you type or upload stays on this device: there is no server behind them, and nothing is sent anywhere. Every creator, show, brand and figure in an example is made up and labelled so.</p>
  <p>Ratings, bands, sub-scores and benchmarks are independently calculated by Orbe, not provided by YouTube, Spotify, Apple or any other platform. Valuations and prices are indicative only: not advice, not a formal valuation and not an offer. Platform names are trademarks of their owners. <a href="mailto:hello@orbe.vc">hello@orbe.vc</a></p>`;
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
  return `${v < 0 ? "-" : ""}${sym}${new Intl.NumberFormat("en-GB", { minimumFractionDigits: pence ? 2 : 0, maximumFractionDigits: pence ? 2 : 0 }).format(Math.abs(v))}`;
}
export const pct = (x, dp = 0) => (x === null || x === undefined ? "n/a" : `${(x * 100).toFixed(dp)}%`);
export const bps = (b) => `${(b / 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
export const day = (iso) => (iso ? new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
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

export async function copyText(btn, text) {
  try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement("textarea"); t.value = text; document.body.append(t); t.select(); try { document.execCommand("copy"); } catch {} t.remove(); }
  const was = btn.textContent;
  btn.textContent = "Copied";
  setTimeout(() => (btn.textContent = was), 1400);
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

/* The three-way status strip every tool shows. */
export function liveStrip({ live, local, api }) {
  return `<div class="live" aria-label="What works today">
    <div><b><span class="dot dot-live"></span>Live now</b>${live}</div>
    <div><b><span class="dot dot-local"></span>In your browser only</b>${local}</div>
    <div><b><span class="dot dot-api"></span>When the Orbe API is deployed</b>${api}</div>
  </div>`;
}
