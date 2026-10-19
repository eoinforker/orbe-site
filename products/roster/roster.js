/*
  The roster view for managers: the page. Every figure comes from roster-data.js,
  which composes the engine's rating, sponsor and record modules. This file only
  lays them out, sorts, filters, opens a creator in place, and builds the files.
*/
import { shell, $, $$, esc, count, money, bps, icon, copyText, copyLabel, day } from "../assets/shell.js";
import {
  buildRoster, build, ROSTER, invite, leave, pitchLine, rateCardCSV, KINDS, SHARE_LABEL, RECORD_LABEL,
  MADE_UP_LINE, RATING_LABEL, RATING_BANDS, MODEL_VERSION, RATE_CARD_VERSION, DEFAULT_TAKE_RATE, FIXTURE_NOW, FX_RATE,
} from "./roster-data.js";

shell("roster");

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
let rows = buildRoster();
const state = { kind: "", band: "", sort: "rating", dir: -1, open: null };

/* ---------------------------------------------------------------- columns */
const RECORD_ORDER = { payouts: 3, estimate: 2, none: 1, withheld: 0 };
const rated = (r) => r.shown.rating && r.rating?.status === "rated";
const priced = (r) => r.shown.prices && r.prices?.status === "priced" && r.prices.main?.s?.status === "suggested";
const pctNum = (s) => Number(String(s).replace("−", "-").replace(/[^\d.+-]/g, ""));
const per = (r) => (r.prices?.quantity === "hour" ? "an hour" : "a placement");
const range = (s) => `${money(s.low)} to ${money(s.high)}`;
const notShared = (what = "Not shared") => `<span class="ns">${what}</span>`;

const COLS = [
  { key: "name", label: "Creator", sort: (r) => r.name.toLowerCase(), cell: nameCell },
  { key: "rating", label: "Orbe Rating", num: true, sort: (r) => (rated(r) ? r.rating.rating : null), cell: (r) => (rated(r) ? `<b class="fig">${esc(r.rating.signed)}</b> <span class="band-w">${esc(r.rating.band)}</span>` : notShared(r.share === "invited" ? "Waiting" : "Not shared")) },
  { key: "size", label: "Size band", sort: (r) => (rated(r) ? r.audience : null), cell: (r) => (rated(r) ? esc(r.rating.sizeBand) : notShared("")) },
  { key: "beats", label: "Beats", hint: "Of 100 their size", num: true, sort: (r) => (rated(r) ? r.rating.beats : null), cell: (r) => (rated(r) ? `<b class="fig">${r.rating.beats}</b><span class="of"> in 100</span>` : notShared("")) },
  { key: "momentum", label: "Momentum", hint: "Against their own", num: true, sort: (r) => (rated(r) && r.rating.momentum ? pctNum(r.rating.momentum.value) : null), cell: (r) => (rated(r) && r.rating.momentum ? `<span class="fig">${esc(r.rating.momentum.value)}</span>` : notShared("")) },
  { key: "latest", label: "Latest work", hint: "Against their own typical", num: true, sort: (r) => (rated(r) && r.rating.latest ? r.rating.latest.multiple : null), cell: (r) => (rated(r) && r.rating.latest ? `<span class="fig">${r.rating.latest.multiple.toFixed(1)}×</span><span class="of"> typical</span>` : notShared("")) },
  { key: "price", label: "Main format price", num: true, sort: (r) => (priced(r) ? r.prices.main.s.low.amount : null), cell: priceCell },
  { key: "record", label: "Record", sort: (r) => (r.shown.rating ? RECORD_ORDER[r.record?.status] ?? 0 : null), cell: recordCell },
];

function nameCell(r) {
  const k = KINDS[r.kind];
  const cs = r.share === "left" ? "left" : r.share;
  return `<button type="button" class="name-btn" aria-expanded="${state.open === r.id}" aria-controls="d-${esc(r.id)}" data-open="${esc(r.id)}">${esc(r.name)}</button>
    <span class="row-meta">${esc(k?.label ?? r.kind)}${r.audience ? `, ${count(r.audience)}` : ""} <span class="cs cs-${cs}">${esc(SHARE_LABEL[r.share])}</span></span>`;
}
function priceCell(r) {
  if (!r.shown.rating) return notShared("");
  if (!r.shown.prices) return notShared();
  if (r.prices?.status !== "priced") return `<span class="ns">No sponsor format</span>`;
  const s = r.prices.main.s;
  if (s?.status !== "suggested") return `<span class="ns">Not enough data</span>`;
  return `<span class="fig">${esc(range(s))}</span><span class="of"> ${esc(per(r))}, ${esc(r.prices.main.name.toLowerCase())}</span>`;
}
function recordCell(r) {
  if (!r.shown.rating) return notShared("");
  const st = r.record?.status ?? "withheld";
  if (st === "withheld") return notShared();
  const cls = { payouts: "good", estimate: "warn", none: "" }[st];
  return `<span class="tag ${cls}">${esc(RECORD_LABEL[st])}</span>`;
}

/* ---------------------------------------------------------------- the table */
const thead = $("[data-head]");
const tbody = $("[data-body]");
const sortSel = $("[data-f-sort]");
sortSel.innerHTML = COLS.flatMap((c) => (c.num || c.key === "name" || c.key === "record" || c.key === "size"
  ? [`<option value="${c.key}:-1">${esc(c.label)}${c.key === "name" ? ", Z to A" : ", highest first"}</option>`, `<option value="${c.key}:1">${esc(c.label)}${c.key === "name" ? ", A to Z" : ", lowest first"}</option>`]
  : [])).join("");

function head() {
  thead.innerHTML = COLS.map((c) => {
    const on = state.sort === c.key;
    const sort = on ? (state.dir > 0 ? "ascending" : "descending") : "none";
    const glyph = on ? icon(state.dir > 0 ? "up" : "down", { size: 16, className: "sort-i" }) : `<span class="sort-i sort-none" aria-hidden="true"></span>`;
    return `<th scope="col" class="c-${c.key}${c.num ? " r" : ""}" aria-sort="${sort}"><button type="button" class="sort-btn" data-sort="${c.key}">${esc(c.label)}${glyph}</button>${c.hint ? `<span class="th-hint">${esc(c.hint)}</span>` : ""}</th>`;
  }).join("");
  sortSel.value = `${state.sort}:${state.dir}`;
}

function visible() {
  const col = COLS.find((c) => c.key === state.sort);
  const list = rows.filter((r) => (!state.kind || r.kind === state.kind) && (!state.band || (state.band === "none" ? !rated(r) : rated(r) && r.rating.band === state.band)));
  return list.sort((a, b) => {
    const x = col.sort(a), y = col.sort(b);
    if (x === null && y === null) return a.name.localeCompare(b.name);
    if (x === null) return 1;
    if (y === null) return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * state.dir || a.name.localeCompare(b.name);
  });
}

function render() {
  head();
  const list = visible();
  tbody.innerHTML = list.map((r) => {
    const open = state.open === r.id;
    return `<tr class="r-row${open ? " is-open" : ""}${r.shown.rating ? "" : " is-quiet"}" data-row="${esc(r.id)}" id="row-${esc(r.id)}">${COLS.map((c) => `<td class="c-${c.key}${c.num ? " r" : ""}" data-label="${esc(c.label)}">${c.cell(r)}</td>`).join("")}</tr>
      <tr class="d-row" id="d-${esc(r.id)}"${open ? "" : " hidden"}><td colspan="${COLS.length}">${open ? detail(r) : ""}</td></tr>`;
  }).join("") || `<tr><td colspan="${COLS.length}" class="empty">No creators match. Clear a filter to see them again.</td></tr>`;
  $("[data-count]").textContent = String(rows.length);
  const hidden = rows.length - list.length;
  $("[data-say]").textContent = `${list.length} of ${rows.length} shown${hidden ? `, ${hidden} filtered out` : ""}. Sorted by ${COLS.find((c) => c.key === state.sort).label.replace(/^(?!Orbe)\w/, (ch) => ch.toLowerCase())}, ${state.dir > 0 ? "lowest" : "highest"} first.`;
  sits();
  files();
}

thead.addEventListener("click", (e) => {
  const b = e.target.closest("[data-sort]");
  if (!b) return;
  const k = b.dataset.sort;
  state.dir = state.sort === k ? -state.dir : k === "name" ? 1 : -1;
  state.sort = k;
  render();
  $(`[data-sort="${k}"]`).focus();
});
sortSel.addEventListener("change", () => { const [k, d] = sortSel.value.split(":"); state.sort = k; state.dir = Number(d); render(); });
$("[data-f-kind]").addEventListener("change", (e) => { state.kind = e.target.value; render(); });
$("[data-f-band]").addEventListener("change", (e) => { state.band = e.target.value; render(); });

function toggle(id, { focus = true, scroll = false } = {}) {
  state.open = state.open === id ? null : id;
  render();
  const btn = $(`[data-open="${CSS.escape(id)}"]`);
  if (scroll) $(`#row-${CSS.escape(id)}`)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  if (focus) btn?.focus({ preventScroll: scroll });
}
tbody.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) return toggle(open.dataset.open);
  const copy = e.target.closest("[data-copy]");
  if (copy) return void copyText(copy, copy.dataset.copy);
  const lv = e.target.closest("[data-leave]");
  if (lv) return leaveRoster(lv.dataset.leave);
  // A click anywhere else on a creator's row opens it too (the name is the keyboard way in).
  const row = e.target.closest("tr.r-row");
  if (row && !e.target.closest("a, button, input, select, summary")) toggle(row.dataset.row, { focus: false });
});

/* ---------------------------------------------------------------- one creator, in place */
function detail(r) {
  if (!r.shown.rating) {
    return `<div class="detail quiet"><p>${r.share === "left" ? `<b>${esc(r.name)} has left the roster.</b> Their consent was withdrawn, so nothing of theirs is shown, kept or exported here.` : `<b>${esc(r.name)} has been invited.</b> Nothing is shown until they accept, and then only what they choose to share.${r.pending ? " This invite lives on this device only: with the API, Orbe emails it and the creator decides." : ""}`}</p></div>`;
  }
  const R = r.rating;
  const k = KINDS[r.kind];
  const line = pitchLine(r);
  return `<div class="detail">
    <div class="d-head">
      <div><p class="d-k mono">${esc(k.label)} ${esc(k.noun)}, made up. ${esc(r.handle)}, ${count(r.audience)} ${esc(R.sizeBand.split(" ").pop())}</p>
        <p class="d-big"><span class="disp">${esc(R.signed)}</span> <span class="band-w">${esc(R.band)}</span></p>
        <p class="small">Zero is typical for ${esc(R.peers)} with ${esc(R.sizeBand.replace(/^(Under|Over)/, (w) => w.toLowerCase()))}. ${esc(RATING_LABEL)}.</p></div>
      <div class="pitch"><p class="pitch-k mono">For a pitch email</p><p class="pitch-line">${esc(line)}</p><button type="button" class="btn btn-sm" data-copy="${esc(line)}">${copyLabel("Copy the line")}</button></div>
    </div>
    <div class="d-grid">
      <section class="win" data-pair="note" aria-label="The rating's parts"><div class="win-bar"><h4 class="win-title">rating_parts.txt</h4><span class="win-ctl"><span class="win-tag">Of 100 their size</span></span></div>
        <div class="win-body"><ul class="parts">${R.parts.map((p) => `<li><span class="p-n">${esc(p.name)}</span><span class="p-v">${esc(p.value)}</span><span class="p-t" aria-hidden="true"><i style="width:${Math.max(2, p.score)}%"></i><b class="p-mid"></b></span><span class="p-s">beats <b>${p.score}</b> in 100</span><span class="p-w">${esc(p.what)}</span></li>`).join("")}</ul>
        ${R.unavailable?.length ? `<p class="small">Set aside, no figures: ${esc(R.unavailable.map((u) => u.name ?? u.key ?? u).join(", "))}.</p>` : ""}
        <p class="small">Model ${esc(R.modelVersion)}${R.provisional ? ", on provisional priors" : ""}. The middle mark is typical.</p></div></section>
      <section class="win" data-pair="note" aria-label="The last twelve works"><div class="win-bar"><h4 class="win-title">last_twelve.txt</h4><span class="win-ctl"><span class="win-tag">Against their typical</span></span></div>
        <div class="win-body">${twelve(r)}</div></section>
      <section class="win" data-pair="spon" aria-label="Rate card"><div class="win-bar"><h4 class="win-title">rate_card.txt</h4><span class="win-ctl"><span class="win-tag">Sponsor engine</span></span></div>
        <div class="win-body">${card(r)}</div></section>
      <section class="win" data-pair="rec" aria-label="The Record"><div class="win-bar"><h4 class="win-title">record.txt</h4><span class="win-ctl"><span class="win-tag">Record engine</span></span></div>
        <div class="win-body">${record(r)}</div></section>
    </div>
    <p class="d-foot small">${esc(r.name)} chose to share: ${[r.shown.rating && "the rating", r.shown.prices && "prices", r.shown.record && "the Record"].filter(Boolean).join(", ")}. They can leave this roster at any time. <button type="button" class="link-btn" data-leave="${esc(r.id)}">See what happens when a creator leaves</button></p>
  </div>`;
}

/* The last twelve matured works against the creator's own typical: up is better than their typical, down is under it, on a doubling scale. */
function twelve(r) {
  const ws = r.rating.last12.slice().reverse();
  const W = 360, H = 150, pad = { l: 34, r: 8, t: 10, b: 22 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const lim = 2; // 4x either way
  const y = (m) => pad.t + ih / 2 - (Math.max(-lim, Math.min(lim, Math.log2(m))) / lim) * (ih / 2);
  const bw = iw / ws.length, gap = 4;
  const n = r.rating.workNoun;
  const bars = ws.map((w, i) => {
    const x = pad.l + i * bw + gap / 2, y0 = y(1), y1 = y(w.multiple);
    const top = Math.min(y0, y1), h = Math.max(1.5, Math.abs(y1 - y0));
    const ago = Math.round(w.ageDays);
    return `<g><rect class="${w.multiple >= 1 ? "up" : "dn"}" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - gap).toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${ago} days ago: ${w.multiple.toFixed(2)}× their typical ${esc(n)}</title></rect></g>`;
  }).join("");
  const grid = [4, 2, 1, 0.5, 0.25].map((m) => `<line class="${m === 1 ? "zero" : "gl"}" x1="${pad.l}" x2="${W - pad.r}" y1="${y(m)}" y2="${y(m)}"/><text class="ax" x="${pad.l - 6}" y="${y(m) + 4}" text-anchor="end">${m >= 1 ? m : m === 0.5 ? "½" : "¼"}×</text>`).join("");
  const best = ws.reduce((a, w) => (w.multiple > a.multiple ? w : a), ws[0]);
  const above = ws.filter((w) => w.multiple >= 1).length;
  const latest = r.rating.latest;
  return `<svg class="tw" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`The last ${ws.length} ${n}s against ${r.name}'s own typical: ${above} at or above it, the best ${best.multiple.toFixed(1)} times typical, the latest ${latest.multiple.toFixed(1)} times.`)}">${grid}${bars}<text class="ax" x="${pad.l}" y="${H - 6}">Oldest</text><text class="ax" x="${W - pad.r}" y="${H - 6}" text-anchor="end">Latest</text></svg>
    <p class="tw-say"><b>${above}</b> of ${ws.length} at or above their typical ${esc(n)}. Best <b>${best.multiple.toFixed(1)}×</b>, latest <b>${latest.multiple.toFixed(1)}×</b> (rated ${esc(latest.signed)}).</p>
    <p class="small">Momentum ${esc(r.rating.momentum?.value ?? "n/a")}: ${esc((r.rating.momentum?.what ?? "").toLowerCase())}</p>`;
}

const BASIS = { own_history: "Their own completed sponsorships", comparables: "Creators their kind and size", rate_card: "Provisional rate card" };
function card(r) {
  if (!r.shown.prices) return `<p>${notShared("Prices not shared.")}</p><p class="small">${esc(r.name)} shares the rating only. Their prices stay with them.</p>`;
  const p = r.prices;
  if (p.status !== "priced") return `<p class="small">${esc(p.reason)}</p>`;
  return `<ul class="fmts">${p.items.map((it) => {
    const s = it.s;
    if (s?.status !== "suggested") return `<li><h5 class="f-h">${esc(it.name)}</h5><p class="small">${esc(s?.reason ?? "No suggestion yet.")}</p></li>`;
    return `<li><h5 class="f-h">${esc(it.name)}</h5><p class="f-p disp">${esc(range(s))}</p><p class="small">${s.per === "hour" ? "An hour" : "A placement"}. ${count(s.expected.units)} ${esc(s.expected.unit)} expected at ${s.expected.day} ${s.expected.day === 1 ? "day" : "days"}, at ${esc(money(s.cpm.low, { pence: true }))} to ${esc(money(s.cpm.high, { pence: true }))} per 1,000.</p>
      <details class="fold"><summary>${icon("caret", { size: 16, className: "caret" })}<span>The reasons <span class="meta">${s.reasons.length}</span></span></summary><div class="fold-body"><ul class="reasons">${s.reasons.map((x) => `<li><span>${esc(x.replace(/ read at source\./, ", from this made-up creator's works."))}</span></li>`).join("")}</ul><p class="small">Evidence: ${esc(BASIS[s.basis])}, rate card ${esc(s.version || RATE_CARD_VERSION)}.</p></div></details></li>`;
  }).join("")}</ul><p class="small">From the last ${p.units.length} ${esc(KINDS[r.kind].works)}' ${esc(p.unit)} at ${p.window} ${p.window === 1 ? "day" : "days"}. Dollar cards converted at ${FX_RATE} pounds per dollar, an example rate.</p>`;
}

function record(r) {
  const rec = r.record;
  if (rec.status === "withheld") return `<p>${notShared("The Record is not shared.")}</p><p class="small">Only the creator decides who sees their money.</p>`;
  if (rec.status === "none") return `<p class="rec-st">${esc(RECORD_LABEL.none)}</p><p class="small">${rec.twitch ? "Twitch income cannot be verified at all, so a Twitch Record is never read from payouts." : `${esc(r.name)} has not connected a payout source. With the API, they connect read-only Stripe or AdSense and the Record reads what was paid.`}</p>`;
  const src = rec.sources[0];
  return `<p class="rec-st"><span class="tag ${rec.status === "payouts" ? "good" : "warn"}">${esc(RECORD_LABEL[rec.status])}</span></p>
    <dl class="dl rec-dl"><dt>Revenue, last 12 months</dt><dd class="fig">${esc(money(rec.ttm, { pence: true }))}</dd>
    <dt>Read from a connected payout source</dt><dd class="fig">${Math.round(rec.connected * 100)}%</dd>
    <dt>From uploads only</dt><dd class="fig">${Math.round(rec.uploaded * 100)}%</dd>
    <dt>Source, read</dt><dd>${esc({ stripe: "Stripe", invoice_upload: "Uploaded invoices" }[src.source] ?? src.source)}, ${esc(day(src.checkedAt))}</dd></dl>
    ${rec.flags.length ? `<ul class="flags-l">${rec.flags.map((f) => `<li><span class="tag ${f.severity === "high" ? "bad" : "warn"}">${f.severity === "high" ? "Ask" : "Note"}</span> ${esc(f.title)}</li>`).join("")}</ul>` : ""}
    <p class="small">${rec.twitch ? "Twitch income cannot be verified, so this is invoices only. " : ""}Made-up figures, derived from this creator's own engine prices. The checks are the record engine's.</p>`;
}

/* Leaving: every consent is revoked at once; the engine then shows nothing. */
function leaveRoster(id) {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return;
  const src = ROSTER.find((c) => c.id === id);
  rows[i] = build({ ...src, share: "left" }, leave(rows[i].consents));
  state.open = id;
  render();
  $(`[data-open="${CSS.escape(id)}"]`)?.focus();
}

/* ---------------------------------------------------------------- where the roster sits */
function sits() {
  const list = rows.filter(rated).sort((a, b) => b.rating.rating - a.rating.rating);
  const lo = -3, hi = 3;
  const x = (v) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100;
  const edges = [lo, -2, -0.8, 0.8, 2, hi];
  const names = ["Poor", "Subpar", "Average", "Good", "Great"];
  const zones = names.map((n, i) => `<span class="zone z-${i}" style="left:${x(edges[i])}%;width:${x(edges[i + 1]) - x(edges[i])}%"></span>`).join("");
  const scale = names.map((n, i) => `<span style="left:${(x(edges[i]) + x(edges[i + 1])) / 2}%">${n}</span>`).join("");
  const waiting = rows.length - list.length;
  $("[data-sits]").innerHTML = `<ol class="sits-list">${list.map((r) => `<li><button type="button" class="sits-name" data-jump="${esc(r.id)}">${esc(r.name)}<span class="sits-k">${esc(KINDS[r.kind].label)}, ${esc(r.rating.sizeBand)}</span></button>
      <span class="track" aria-hidden="true">${zones}<span class="zero"></span><span class="mark" style="left:${x(r.rating.rating)}%" title="${esc(`${r.name}: ${r.rating.signed}, ${r.rating.band}`)}"></span></span><span class="sits-v fig">${esc(r.rating.signed)}</span></li>`).join("")}</ol>
    <div class="scale" aria-hidden="true"><span class="scale-in">${scale}<span class="scale-0" style="left:50%">0</span></span></div>
    <p class="small">Each mark is one creator on the same scale: zero is typical for their own size, from ${"−"}3 to +3. ${waiting ? `${waiting} not shown: invited, or not sharing yet.` : ""} ${esc(RATING_LABEL)}.</p>`;
}
$("[data-sits]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-jump]");
  if (!b) return;
  state.kind = ""; state.band = "";
  $("[data-f-kind]").value = ""; $("[data-f-band]").value = "";
  if (state.open === b.dataset.jump) state.open = null;
  toggle(b.dataset.jump, { scroll: true });
});

/* ---------------------------------------------------------------- the files */
let csvUrl = null;
function files() {
  const csv = rateCardCSV(rows);
  if (csvUrl) URL.revokeObjectURL(csvUrl);
  csvUrl = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  $("[data-csv]").href = csvUrl;
  summary();
}

function summary() {
  const body = rows.map((r) => {
    const name = `<td class="s-name">${esc(r.name)}</td>`;
    if (!r.shown.rating) return `<tr>${name}<td colspan="2" class="ns">${r.share === "left" ? "Left the roster" : "Invited, nothing shared yet"}</td></tr>`;
    const R = r.rating;
    const rt = `<td>${esc(R.signed)} ${esc(R.band)}, beats ${R.beats} in 100</td>`;
    if (!r.shown.prices) return `<tr>${name}${rt}<td class="ns">Prices not shared</td></tr>`;
    if (r.prices.status !== "priced") return `<tr>${name}${rt}<td class="ns">No sponsor format yet</td></tr>`;
    const list = r.prices.items.map((it) => `<li><span>${esc(it.name)}</span><span class="fig">${it.s?.status === "suggested" ? `${esc(range(it.s))} ${it.s.per === "hour" ? "an hour" : "each"}` : "Not enough data"}</span></li>`).join("");
    return `<tr>${name}${rt}<td><ul class="s-fmts">${list}</ul></td></tr>`;
  }).join("");
  $("[data-summary]").innerHTML = `<p class="sum-h">Roster rate cards <span class="mono">made up</span></p>
    <table class="tbl sum-t"><thead><tr><th scope="col">Creator</th><th scope="col">Orbe Rating, against their size</th><th scope="col">Suggested price, by format</th></tr></thead><tbody>${body}</tbody></table>
    <p class="small">${esc(MADE_UP_LINE)} Ratings: ${esc(RATING_LABEL)}, model ${esc(MODEL_VERSION)}. Prices are the sponsor engine's suggestions on rate card ${esc(RATE_CARD_VERSION)}, converted at ${FX_RATE} pounds per dollar (an example rate). Indicative, not offers.</p>`;
  $("[data-sum-date]").textContent = `As of ${day(FIXTURE_NOW)}`;
}
$("[data-print]").addEventListener("click", () => print());

/* ---------------------------------------------------------------- invite */
const form = $("[data-invite]");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = form.elements;
  const err = $("[data-invite-err]");
  const ok = $("[data-invite-ok]");
  err.textContent = ""; ok.textContent = "";
  for (const el of [f.name, f.email]) el.removeAttribute("aria-invalid");
  const name = f.name.value.trim();
  const email = f.email.value.trim();
  if (!name) { f.name.setAttribute("aria-invalid", "true"); f.name.focus(); return void (err.textContent = "Add their name or channel."); }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { f.email.setAttribute("aria-invalid", "true"); f.email.focus(); return void (err.textContent = "Add an email address like name@example.com."); }
  const row = invite({ name: name.slice(0, 60), email, kind: f.kind.value });
  if (rows.some((r) => r.id === row.id)) return void (err.textContent = "That creator is already invited.");
  rows.push(row);
  state.kind = ""; state.band = "";
  $("[data-f-kind]").value = ""; $("[data-f-band]").value = "";
  render();
  form.reset();
  ok.textContent = `${name} is on the roster as invited. Nothing is shown until they accept. This stays on this device.`;
});

/* ---------------------------------------------------------------- the rest of the page */
$("[data-made-up]").innerHTML = `<b>Made up.</b> ${esc(MADE_UP_LINE)}`;
$("[data-label-line]").textContent = `Ratings, bands and percentiles: ${RATING_LABEL}. Model ${MODEL_VERSION}, on provisional priors. Prices from rate card ${RATE_CARD_VERSION}, as of ${day(FIXTURE_NOW)}.`;
$("[data-fair-foot]").textContent = `"Beats N in 100" is the reach part's percentile among creators of the same kind and size band. ${RATING_LABEL}.`;
$("[data-net]").textContent = `${bps(DEFAULT_TAKE_RATE.networkBps)}, paid by the brand`;
$("[data-dir]").textContent = `${bps(DEFAULT_TAKE_RATE.directBps)}, paid by the brand`;
render();
