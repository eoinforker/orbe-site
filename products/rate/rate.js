/*
  Rate my work: the creator's own export or typed figures, rated by the
  product's engine (site/assets/engine, built from product/src). Nothing is
  sent anywhere. The last file per account is remembered on this device only,
  so a later upload can show new personal bests.
*/
import { shell, $, $$, esc, count, day, today, readText, dropZone, segmented, store, nodash, icon, fold, sourcesList, ask } from "../assets/shell.js";
import { rate, rateWorks, topStat, focusAreas, explain, personalBests, recordMetric, isRated, SPECS, signed as engineSigned, ratingNotice, RATING_LABEL, MODEL_VERSION } from "../../assets/engine/rating/browser.js";
import { fixtureSnapshot, FIXTURE_NOW } from "../../assets/engine/rating/browser.js";
import { readCreatorExport, EXPORT_FORMATS, accountIdFor, workIdFor } from "../../assets/engine/ingest/browser.js";
import { example } from "../../assets/r5/examples.js";
import { against } from "../../assets/js/against.js";

shell("rate");

$("[data-live] [data-mv]").textContent = MODEL_VERSION;

// A true minus on ratings, as the brand writes them (−0.20).
const signed = (x) => engineSigned(x).replace(/^-/, "\u2212");
const KIND_WORD = { youtube: "Subscribers", substack: "Free and paid subscribers", podcast: "Followers", twitch: "Followers", photography: "Followers" };
const HAS_LENGTH = { youtube: true, podcast: true, twitch: true };
const ui = { mode: "upload" };

/* ---------- mode ---------- */
segmented($("[data-mode]"), (v) => {
  ui.mode = v;
  $("[data-upload]").classList.toggle("hide", v !== "upload");
  $("[data-manual]").classList.toggle("hide", v !== "manual");
});

/* ---------- upload ---------- */
let picked = null;
$("[data-exported]").value = today();
$("[data-where]").innerHTML = EXPORT_FORMATS.map((f) => `<li><span><b>${esc(f.label)}.</b> ${esc(f.where)}</span></li>`).join("");
dropZone($("[data-drop]"), $("[data-file]"), (file) => {
  picked = { name: file.name, read: () => readText(file) };
  $("[data-picked]").textContent = `Chosen: ${file.name}. It stays on this device.`;
});
for (const b of $$("[data-sample]")) {
  b.addEventListener("click", async () => {
    const res = await fetch(`../fixtures/${b.dataset.sample}`);
    const text = await res.text();
    picked = { name: b.dataset.sample, read: async () => text, sample: true };
    $("[data-picked]").textContent = `Using ${b.dataset.sample}: a made-up file, for trying the tool.`;
    $("[data-audience]").value = b.dataset.aud;
    $("[data-title]").value = b.dataset.name;
    $("[data-exported]").value = "2026-10-18";
    $("[data-upload]").requestSubmit();
  });
}
$("[data-upload]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("[data-up-err]");
  err.textContent = "";
  if (!picked) return void (err.textContent = "Choose an export file first, or try a made-up one.");
  const audience = Number($("[data-audience]").value);
  if (!(audience > 0)) return void (err.textContent = "Add your followers or subscribers: parts of the rating are measured against them.");
  const exported = $("[data-exported]").value || today();
  try {
    const text = await picked.read();
    const read = await readCreatorExport(text, { exportedAt: `${exported}T23:00:00.000Z`, audience, title: $("[data-title]").value.trim() || undefined });
    show(read.snapshot, `${exported}T23:00:00.000Z`, {
      source: `${read.label} export: ${read.used} works read, ${read.skipped} left out.`,
      sources: [
        { kind: "file", label: `${picked.name}, a ${read.label} export`, provenance: `${read.used} works read, ${read.skipped} left out. Read on this device; exported ${day(exported)}.${picked.sample ? " A made-up file." : ""}` },
        { kind: "typed", label: `${count(audience)} followers or subscribers`, provenance: "Typed by you. Exports rarely carry it." },
      ],
      warnings: read.warnings, sample: !!picked.sample,
    });
  } catch (x) {
    err.textContent = nodash(x?.message || "We could not read that file.");
  }
});

/* ---------- manual ---------- */
const rowsEl = $("[data-rows]");
function metricsFor(kind) {
  return SPECS[kind].metrics.map((m) => ({ key: m.key, name: m.name, unit: m.unit }));
}
function rowMarkup(kind, i, v = {}) {
  const ms = metricsFor(kind);
  return `<div class="panel" style="padding:12px" data-row>
    <div class="fields cols2">
      <label class="field"><span>Title</span><input class="ob-input" data-f="title" value="${esc(v.title ?? "")}" placeholder="Work ${i + 1}"></label>
      <label class="field"><span>Published</span><input class="ob-input" type="date" data-f="date" value="${esc(v.date ?? "")}"></label>
      ${HAS_LENGTH[kind] ? `<label class="field"><span>Length, minutes</span><input class="ob-input" type="number" min="0" step="any" inputmode="decimal" data-f="minutes" value="${esc(v.minutes ?? "")}"></label>` : ""}
      ${ms.map((m) => `<label class="field"><span>${esc(m.name)}${m.unit === "ratio" ? ", %" : m.unit === "minor_units" ? ", £" : ""}</span><input class="ob-input" type="number" min="0" step="any" inputmode="decimal" data-m="${m.key}" data-unit="${m.unit}" value="${esc(v[m.key] ?? "")}"></label>`).join("")}
    </div>
    <div class="btns" style="margin-top:8px"><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-remove>Remove</button></div>
  </div>`;
}
function resetRows(kind, n = 3) {
  rowsEl.innerHTML = Array.from({ length: n }, (_, i) => rowMarkup(kind, i)).join("");
  $("[data-m-aud-label]").textContent = KIND_WORD[kind];
  $("[data-m-hint]").textContent = `Today's numbers for each ${SPECS[kind].formats[0].noun}. Leave a box empty if you don't know it: missing is treated as unknown, never zero.`;
}
rowsEl.addEventListener("click", (e) => { if (e.target.matches("[data-remove]")) e.target.closest("[data-row]").remove(); });
$("[data-kind]").addEventListener("change", () => resetRows($("[data-kind]").value));
$("[data-add]").addEventListener("click", () => rowsEl.insertAdjacentHTML("beforeend", rowMarkup($("[data-kind]").value, $$("[data-row]").length)));
$("[data-fill]").addEventListener("click", () => {
  const kind = $("[data-kind]").value;
  const base = { youtube: { views: 9000, likes: 380, comments: 40, minutes: 14 }, substack: { recipients: 12000, opens: 5600, clicks: 420, new_paid: 4, new_free: 60 }, podcast: { downloads_7d: 1300, downloads_30d: 1900, completion: 64, minutes: 48 }, twitch: { avg_viewers: 140, peak_viewers: 260, hours_watched: 520, new_followers: 45, minutes: 210 }, photography: { views: 4200, saves: 180, licences: 2, licence_revenue: 120 } }[kind];
  const aud = { youtube: 48000, substack: 12500, podcast: 4200, twitch: 9000, photography: 30000 }[kind];
  $("[data-m-audience]").value = aud;
  $("[data-m-title]").value = "A made-up creator";
  const now = Date.now();
  rowsEl.innerHTML = Array.from({ length: 8 }, (_, i) => {
    const k = [1, 0.8, 1.3, 0.9, 1.1, 2.2, 0.85, 1.05][i];
    const v = { title: `Made-up work ${8 - i}`, date: new Date(now - (4 + i * 7) * 864e5).toISOString().slice(0, 10) };
    for (const [m, n] of Object.entries(base)) v[m] = m === "minutes" || m === "completion" ? n : Math.round(n * k);
    return rowMarkup(kind, i, v);
  }).join("");
});
resetRows("youtube");

$("[data-manual]").addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-m-err]");
  err.textContent = "";
  const kind = $("[data-kind]").value;
  const audience = Number($("[data-m-audience]").value);
  if (!(audience > 0)) return void (err.textContent = `Add your ${KIND_WORD[kind].toLowerCase()}.`);
  const title = $("[data-m-title]").value.trim() || "My work";
  const platformId = `typed:${title.toLowerCase()}`;
  const accountId = accountIdFor(kind, platformId);
  const works = [];
  for (const [i, row] of $$("[data-row]").entries()) {
    const date = $('[data-f="date"]', row).value;
    if (!date) continue;
    const metrics = {};
    for (const inp of $$("[data-m]", row)) {
      if (inp.value === "") continue;
      const n = Number(inp.value);
      if (!Number.isFinite(n) || n < 0) continue;
      metrics[inp.dataset.m] = inp.dataset.unit === "ratio" ? n / 100 : inp.dataset.unit === "minor_units" ? Math.round(n * 100) : n;
    }
    const minutes = Number($('[data-f="minutes"]', row)?.value || 0);
    const t = $('[data-f="title"]', row).value.trim() || `Work ${i + 1}`;
    works.push({ id: workIdFor(kind, `${platformId}|${t}|${date}`), accountId, kind, title: t, publishedAt: `${date}T12:00:00.000Z`, durationSec: Math.round(minutes * 60), metrics, platformId: `${t}|${date}` });
  }
  if (works.length < 1) return void (err.textContent = "Add at least one work with a publish date.");
  const at = new Date().toISOString();
  const snapshot = { account: { id: accountId, creatorId: null, kind, platformId, handle: title, title, audience }, works, provenance: { source: "invoice_upload", accountId: platformId, checkedAt: at, basis: "uploaded" } };
  show(snapshot, at, { source: `${works.length} works you typed.`, sources: [{ kind: "typed", label: `${works.length} works and ${count(audience)} ${KIND_WORD[kind].toLowerCase()}`, provenance: `Typed by you on ${day(at)}. Missing boxes count as unknown, never zero.` }], warnings: [] });
});

/* ---------- result ---------- */
const out = $("[data-out]");
// The per work table and the sources sit under both columns at desktop width, so an open table has the page to itself.
const wide = $("[data-out-wide]");
function show(snapshot, at, meta) {
  const kind = snapshot.account.kind;
  const spec = SPECS[kind];
  const result = rate(snapshot, at);
  const key = `orbe-rate-history:${snapshot.account.id}`;
  const prev = meta.sample ? null : store.local.json(key);
  // A file is kept on this device only once the person allows it; after that, the newest replaces it.
  if (prev) store.local.put(key, snapshot);
  const titles = new Map(snapshot.works.map((w) => [w.id, w.title]));

  if (!isRated(result)) {
    wide.replaceChildren();
    out.innerHTML = `<div class="panel stack"><p class="tag warn">Not rated yet</p><h2 class="h2">${esc(nodash(result.message))}</h2>
      <p class="sub">Have ${result.have}, need ${result.need}. ${esc(meta.source)}</p>${warnings(meta.warnings)}</div>`;
    return;
  }
  const d = result.detail;
  const works = rateWorks(snapshot, at);
  const top = topStat(result);
  const focus = focusAreas(result);
  const standing = personalBests(snapshot, { includeBaseline: true });
  const fresh = prev ? personalBests([prev, snapshot]).filter((p) => p.at === snapshot.provenance.checkedAt) : [];
  const label = (pb) => spec.records.find((r) => recordMetric(r) === pb.metric)?.label ?? pb.metric;
  const latestRecord = new Map();
  for (const pb of standing) latestRecord.set(pb.metric, pb);
  const records = [...latestRecord.values()];
  const english = `<p>${esc(nodash(explain(result)))}</p>
      ${top ? `<p class="note">${esc(nodash(top.line))}</p>` : ""}
      ${focus.length ? `<ul class="reasons">${focus.map((f) => `<li><span><b style="font-weight:500">${esc(f.name)}.</b> ${esc(nodash(f.advice))}</span></li>`).join("")}</ul>` : ""}`;

  out.innerHTML = `
    <div class="panel stack">
      ${meta.preload ? `<div class="sample"><span><b>A made-up YouTube channel.</b> Shown until you rate your own: upload an export or type your works and this is replaced.</span></div>` : meta.sample ? `<div class="sample"><span><b>Made-up file.</b> This creator and the numbers in the file are invented, for trying the tool.</span></div>` : ""}
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <p class="small">${esc(snapshot.account.title)}</p>
          <div class="big num" aria-label="Orbe Rating ${esc(signed(result.rating))}">${esc(signed(result.rating))}</div>
        </div>
        <span class="tag acc band">${esc(result.band)}</span>
      </div>
      <p class="sub" style="margin-top:0"><b style="font-weight:500">${esc(signed(result.rating))} ${esc(against(kind, result.sizeBand))}.</b> Zero is typical. ${d.provisional ? "On provisional benchmarks: the engine's starting baselines, replaced by measured ones as creators consent to be counted." : ""}</p>
      <p class="small">${esc(ratingNotice(kind))}</p>
      <p class="small rate-next"><a class="ob-lnk ob-lnk--s" href="../you/">Next: Your Orbe, your home</a> A report for every piece, your level and your focus areas.</p>
      ${d.confidence && d.confidence !== "normal" ? `<p class="note warn">Confidence is ${esc(d.confidence)}: with ${d.works} ${esc(d.formatName)}, sub-scores are pulled towards typical until there are ten.</p>` : ""}
    </div>

    <div class="panel stack">
      <h2 class="h3">Sub-scores</h2>
      <p class="small" style="margin-top:4px">Each is a percentile ${esc(against(kind, result.sizeBand))}: 50 is typical.</p>
      <ul class="stack">${result.parts.map((p) => `
        <li class="score">
          <div class="row" style="justify-content:space-between;gap:8px"><b style="font-weight:500">${esc(p.name)}</b><span class="small">${esc(p.value)} · better than ${p.score} in 100</span></div>
          <div class="bt"><span class="bf" style="width:${p.score}%"></span><span class="mid"></span></div>
          <p class="small">${esc(p.what)}</p>
        </li>`).join("")}</ul>
      ${d.unavailable?.length ? `<p class="note plain">Set aside for missing numbers: ${esc(d.unavailable.map((u) => u.name ?? u.key ?? u).join(", "))}. The rest were reweighted.</p>` : ""}
    </div>

    ${meta.preload ? `<div class="panel stack">${fold("In plain English", "and what to work on", `<div class="stack">${english}</div>`, { open: innerWidth >= 900 })}</div>` : `<div class="panel stack">
      <h2 class="h3">In plain English</h2>
      ${english}
    </div>`}

    ${meta.preload ? "" : `<div class="panel stack">
      <h2 class="h3">Your records</h2>
      ${fresh.length ? `<ul class="reasons">${fresh.map((p) => `<li><span><b style="font-weight:500">New personal best since your last file:</b> ${esc(label(p))}, ${count(p.value)}${p.previous !== null ? ` (was ${count(p.previous)})` : ""}, on “${esc(titles.get(p.workId) ?? "a work")}”.</span></li>`).join("")}</ul>` : `<p class="small">${prev ? "No new records since the last file you rated here." : meta.sample ? "Made-up files are never kept, so records here start from this file." : "Keep this file on this device below, then rate a newer export after your next post: new personal bests show here."}</p>`}
      ${records.length ? `<ul class="reasons">${records.map((p) => `<li><span>Best ${esc(label(p).replace(/^best /, ""))}: ${count(p.value)}, “${esc(titles.get(p.workId) ?? "a work")}”${p.previous !== null ? `, ahead of your next best ${count(p.previous)}` : ""}.</span></li>`).join("")}</ul>` : `<p class="small">Records need at least four works with the same number.</p>`}
      ${meta.sample ? "" : `<div data-keep id="keep-${esc(snapshot.account.id).replace(/[^a-z0-9-]/gi, "")}"></div>`}
    </div>`}

    <div class="panel stack" data-wide>
      ${fold(`Each ${esc(d.workNoun)} against your own typical`, `${Math.min(15, works.length)} ${esc(d.workNoun)}s`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(d.workNoun[0].toUpperCase() + d.workNoun.slice(1))}</th><th>Published</th><th class="r">Rating</th><th class="r">× typical</th></tr></thead><tbody>
        ${works.slice(0, 15).map((w) => `<tr><td>${esc(titles.get(w.workId) ?? "")}${w.matured ? "" : ' <span class="tag">early</span>'}</td><td class="nw">${esc(day(snapshot.works.find((x) => x.id === w.workId)?.publishedAt))}</td><td class="r">${esc(signed(w.rating))}</td><td class="r">${w.multiple.toFixed(2)}</td></tr>`).join("")}
      </tbody></table></div>`)}
    </div>

    <div class="panel stack" data-wide>
      ${fold("Where these numbers come from", `${(meta.sources?.length ?? 0) + 1} sources`, sourcesList([
        ...(meta.sources ?? [{ kind: "typed", label: meta.source }]),
        { kind: "engine", label: `The Orbe Rating, maths version ${result.modelVersion}`, provenance: `Independently calculated by Orbe ${against(kind, result.sizeBand)}${d.provisional ? ", on provisional benchmarks" : ""}.` },
      ]))}
      ${warnings(meta.warnings)}
    </div>`;

  wide.replaceChildren(...out.querySelectorAll(":scope > [data-wide]"));

  // The card's moments, from the engine, handed to the card page in this tab only.
  let personalBest = null;
  for (const rec of spec.records) {
    const unit = spec.metrics.find((x) => x.key === rec.metric)?.unit;
    const pb = latestRecord.get(recordMetric(rec));
    if (pb && unit === "count" && pb.previous) { personalBest = { best: pb, label: rec.label, value: count(pb.value), previous: count(pb.previous) }; break; }
  }
  const now = new Date(at);
  const dayOfYear = (now - Date.UTC(now.getUTCFullYear(), 0, 1)) / 864e5;
  const best = works.filter((w) => w.matured).reduce((a, w) => (!a || w.multiple > a.multiple ? w : a), null);
  if (meta.preload) return countUp($(".big", out), result.rating, $(".band", out));
  store.session.put("orbe-products-card", {
    result, kind, name: snapshot.account.title, handle: `@${snapshot.account.title.toLowerCase().replace(/[^a-z0-9]+/g, "")}`.slice(0, 24),
    works: d.workRatings, personalBest, season: { name: `${now.getUTCFullYear()} so far`, works: works.filter((w) => (w.ageDays ?? 0) <= dayOfYear) },
    workTitle: best ? titles.get(best.workId) : snapshot.account.title, sample: !!meta.sample,
  });
  const keep = $("[data-keep]");
  if (keep && prev) keptLine(keep, key);
  else if (keep) ask(keep, {
    title: "Keep this file on this device?",
    body: "Then your next upload can show new personal bests. It stays in this browser only, never on a server, until you forget it.",
    call: `Save ${snapshot.works.length} works for ${snapshot.account.title} in this browser's storage`,
    allow: "Keep it", deny: "Don't keep",
    onAllow: () => store.local.put(key, snapshot),
    allowed: (ok) => (ok ? "Kept on this device. Rate a newer export after your next post to see new bests." : "This browser blocks storage, so nothing was kept."),
    denied: "Not kept. Nothing from this file stays on this device.",
    then: (ok, stored) => ok && stored && keptLine(keep, key, true),
  });
  if (innerWidth < 900) out.firstElementChild?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function warnings(list) {
  if (!list?.length) return "";
  const shown = list.slice(0, 6);
  return fold("Notes on reading your file", `${list.length}`, `<ul class="reasons">${shown.map((w) => `<li><span>${esc(nodash(w))}</span></li>`).join("")}${list.length > shown.length ? `<li><span>and ${list.length - shown.length} more.</span></li>` : ""}</ul>`);
}

function keptLine(el, key, focus = false) {
  el.innerHTML = `<p class="ask-done" tabindex="-1"><span class="state good">Kept on this device</span><span>Your last file is in this browser only. Rate a newer export after your next post to see new bests.</span><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-forget>Forget it</button></p>`;
  if (focus) el.firstElementChild.focus({ preventScroll: true });
  $("[data-forget]", el).addEventListener("click", () => {
    try { localStorage.removeItem(key); } catch {}
    el.innerHTML = `<p class="ask-done" tabindex="-1"><span class="state">Forgotten</span><span>Nothing from your files stays on this device.</span></p>`;
    el.firstElementChild.focus({ preventScroll: true });
  });
}

/* ---------- the opening result ----------
   The page opens on the made-up YouTube channel the products page rates (examples.js),
   rebuilt here with its works so every panel can show. If the rebuild ever drifts from
   the example, the made-up YouTube Studio file is rated instead. */
function countUp(el, target, band) {
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const final = el.textContent;
  if (band) band.style.visibility = "hidden";
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.min(1, Math.max(0, (now - t0) / 600));
    el.textContent = t < 1 ? signed(target * (1 - (1 - t) ** 3)) : final;
    if (t < 1) requestAnimationFrame(tick);
    else if (band) band.style.visibility = "";
  };
  requestAnimationFrame(tick);
}
const FIELD_TITLES = [
  "The marsh at 4am", "Rain on a tin roof, Skye", "Rookery at dusk", "Under the pier at Hastings",
  "Frost on the reed beds", "A beech wood in a gale", "Curlews over the Wash", "The last train out of Kemble",
  "Ice cracking on Loch Lomond", "Dawn chorus, mid Wales", "Shingle in an easterly", "Bees in the lime trees",
  "A thunderstorm comes up the valley", "Skylarks over Salisbury Plain", "Geese leaving the Solway",
  "Snow falling on a pine forest", "The tide fills Morecambe Bay", "Nightjars on the heath", "Inside a hollow oak",
  "Hail on a glasshouse", "Seals hauled out at Blakeney", "A brook after a week of rain", "Swifts over a market town",
  "Wind through a field of barley", "The quietest place in England",
];
async function preload() {
  const ex = example("channel");
  const snap = fixtureSnapshot({ kind: "youtube", noise: 0.25, audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1, title: ex.name });
  snap.account.handle = ex.handle;
  // The engine names its generated works by number; the made-up channel gets titles of its own, newest first.
  snap.works.forEach((w, i) => { w.title = FIELD_TITLES[i] ?? `Night walk, part ${i + 1}`; });
  if (Math.abs(rate(snap, FIXTURE_NOW).rating - ex.rating) < 1e-9) {
    return show(snap, FIXTURE_NOW, {
      preload: true, sample: true, warnings: [], source: `${ex.name}, a made-up YouTube channel.`,
      sources: [{ kind: "file", label: `${ex.name}, a made-up YouTube channel`, provenance: "Generated from a fixed seed: the same made-up channel the products page rates. Nothing in it is real, and nothing is kept." }],
    });
  }
  const text = await (await fetch("../fixtures/made-up-youtube-studio.csv")).text();
  const read = await readCreatorExport(text, { exportedAt: "2026-10-18T23:00:00.000Z", audience: 84000, title: "Bench Notes (made up)" });
  show(read.snapshot, "2026-10-18T23:00:00.000Z", { preload: true, sample: true, warnings: [], source: `${read.label} export, made up.`, sources: [{ kind: "file", label: "made-up-youtube-studio.csv, a made-up YouTube Studio export", provenance: `${read.used} works read. A made-up file.` }] });
}
preload().catch(() => {});
