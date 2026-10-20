/*
  Rights: the page. Every rule comes from the engine's rights module
  (site/assets/engine/rights, built from product/src/rights): the hash chain,
  authority, the state at a moment, Can we use this?, expiry and the files.
  This file writes the made-up programme as events through that engine, then
  lays it out. Nothing leaves the browser.
*/
import { shell, $, $$, esc, day, download, readText } from "../assets/shell.js";
import {
  createRecord, append, verifyChain, currentState, canUse, grantStatus, expiring, conflicts,
  exportJson, importJson, expiryCalendar, mayLicense, timeMs, CHANNELS,
} from "../../assets/engine/rights/browser.js";

shell("rights");

/* ---------------------------------------------------------------- the made-up programme */
const DEMO_NOW = "2026-10-20T12:00:00Z";
const BRAND = "brand:harbour-oats";
const AGENCY = "agency:tidewater";
const NAMES = {
  [BRAND]: "Harbour Oats",
  [AGENCY]: "Tidewater Talent",
  "creator:ada-fennimore": "Ada Fennimore",
  "creator:bram-toller": "Bram Toller",
  "creator:cleo-marsh": "Cleo Marsh",
  "creator:dev-arkwright": "Dev Arkwright",
  "creator:esme-rowan": "Esme Rowan",
  "creator:fin-hallow": "Fin Hallow",
};
const CH_WORDS = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", pinterest: "Pinterest", x: "X", snapchat: "Snapchat", web: "Website", email: "Email", retail: "In store", ooh: "Outdoor", tv: "TV", print: "Print" };
const GBP = (pounds) => ({ amount: pounds * 100, currency: "GBP" });

function demoEvents() {
  const [ada, bram, cleo, dev, esme, fin] = Object.keys(NAMES).slice(2);
  const g = (id, work, o) => ({ id, brand: BRAND, work, territory: ["GB"], fee: null, whitelisting: false, ads: false, ...o });
  const E = [];
  let n = 0;
  const at = (date) => `${date}T09:${String(n++ % 60).padStart(2, "0")}:00Z`;
  const ev = (date, actor, type, data) => E.push({ at: at(date), actor, type, data });
  const work = (date, creator, id, kind, title, created) => ev(date, creator, "work.registered", { work: { id, creator, kind, title, created } });
  const consent = (date, creator, scope) => ev(date, creator, "consent.granted", { consent: { id: `c-${creator.split(":")[1].split("-")[0]}-${scope}`, creator, team: AGENCY, scope } });

  for (const c of [ada, bram, cleo, dev, fin]) consent("2026-03-02", c, "roster");
  for (const c of [ada, bram, cleo, dev, fin]) consent("2026-03-02", c, "license");
  consent("2026-03-03", esme, "roster");
  work("2026-03-10", bram, "bram-commute", "video", "Cycle commute, oat bar test", "2026-03-08");
  ev("2026-03-20", AGENCY, "grant.issued", { grant: g("hb-01", "bram-commute", { channels: ["tiktok", "youtube"], media: "paid", start: "2026-04-01", end: "2026-09-30", fee: GBP(900), whitelisting: true, ads: true }) });
  ev("2026-04-10", BRAND, "usage.reported", { usage: { id: "u-commute-tt", brand: BRAND, work: "bram-commute", channel: "tiktok", use: "whitelisting", from: "2026-04-10", until: null, where: "Whitelisted ad from the creator's handle" } });
  work("2026-05-02", cleo, "cleo-overnight", "video", "Three overnight oats in ten minutes", "2026-04-28");
  ev("2026-05-12", AGENCY, "grant.issued", { grant: g("hb-02", "cleo-overnight", { channels: ["instagram", "tiktok", "youtube", "web"], media: "both", territory: ["WW"], start: "2026-05-15", end: "2026-11-02", fee: GBP(2400), ads: true }) });
  work("2026-05-20", ada, "ada-trailhead", "video", "Porridge at the trailhead", "2026-05-18");
  ev("2026-05-28", AGENCY, "grant.issued", { grant: g("hb-03", "ada-trailhead", { channels: ["instagram", "tiktok"], media: "both", territory: ["GB", "IE"], start: "2026-06-01", end: "2027-05-31", fee: GBP(1200), whitelisting: true }) });
  work("2026-06-15", ada, "ada-flatlay", "photo", "Breakfast flat lay, set of six", "2026-06-12");
  ev("2026-06-25", ada, "grant.issued", { grant: g("hb-04", "ada-flatlay", { channels: ["instagram", "pinterest", "web"], media: "organic", start: "2026-07-01", end: "2026-10-28", note: "Gifted product, no fee" }) });
  work("2026-07-08", fin, "fin-unboxing", "video", "Unboxing the winter range", "2026-07-06");
  ev("2026-07-20", AGENCY, "grant.issued", { grant: g("hb-05", "fin-unboxing", { channels: ["instagram"], media: "paid", start: "2026-08-01", end: "2027-01-31", fee: GBP(800), whitelisting: true }) });
  work("2026-07-22", dev, "dev-early-run", "video", "Five am run, then breakfast", "2026-07-21");
  ev("2026-07-28", AGENCY, "grant.issued", { grant: g("hb-06", "dev-early-run", { channels: ["instagram"], media: "organic", start: "2026-08-01", end: "2026-10-24" }) });
  work("2026-08-30", esme, "esme-fin-duet", "video", "Duet: the oat milk taste test", "2026-08-28");
  ev("2026-08-30", esme, "ownership.set", { work: "esme-fin-duet", owners: [{ party: esme, shareBps: 6000 }, { party: fin, shareBps: 4000 }] });
  ev("2026-09-01", AGENCY, "grant.issued", { grant: g("hb-07", "cleo-overnight", { channels: ["email", "retail"], media: "paid", start: "2026-09-01", end: "2027-02-28", fee: GBP(600) }) });
  ev("2026-09-01", BRAND, "usage.reported", { usage: { id: "u-unbox-ig", brand: BRAND, work: "fin-unboxing", channel: "instagram", use: "paid", from: "2026-09-01", until: null, where: "Paid placement, edited cut" } });
  ev("2026-09-10", esme, "grant.issued", { grant: g("hb-08", "esme-fin-duet", { channels: ["tiktok", "instagram"], media: "both", start: "2026-09-15", end: "2027-01-15", fee: GBP(1800), whitelisting: true }) });
  work("2026-09-12", esme, "esme-window", "photo", "Kitchen window, morning light", "2026-09-11");
  ev("2026-09-24", esme, "grant.issued", { grant: g("hb-09", "esme-window", { channels: ["web", "print", "ooh"], media: "paid", start: "2026-10-01", end: "2027-09-30", fee: GBP(3000), ads: true }) });
  ev("2026-09-28", AGENCY, "grant.issued", { grant: g("hb-10", "dev-early-run", { channels: ["instagram", "facebook"], media: "paid", territory: ["GB", "IE"], start: "2026-10-01", end: "2027-03-31", fee: GBP(1500), whitelisting: true, ads: true }) });
  ev("2026-10-02", AGENCY, "grant.issued", { grant: g("hb-11", "fin-unboxing", { channels: ["youtube", "tiktok"], media: "both", start: "2026-11-01", end: "2027-04-30", fee: GBP(1100) }) });
  ev("2026-10-14", fin, "grant.revoked", { id: "hb-05", reason: "The paid cut was edited in a way the creator had not approved" });
  ev("2026-10-14", BRAND, "usage.ended", { id: "u-unbox-ig", until: "2026-10-14" });

  let r = createRecord("harbour-oats-ugc-2026", "Harbour Oats UGC programme (made up)");
  for (const e of E) {
    const res = append(r, e);
    if (!res.ok) throw new Error(`Demo event refused: ${res.reason}`);
    r = res.record;
  }
  return r;
}

/* ---------------------------------------------------------------- page state */
const view = { record: null, state: null, now: DEMO_NOW, demo: true, tampered: null, file: "harbour_oats_ugc.rights.json" };
const f = { status: "", creator: "", channel: "" };

const nameOf = (p) => NAMES[p] ?? p.split(":")[1].split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const workOf = (id) => view.state.works[id];
const chWord = (c) => CH_WORDS[c] ?? c.replace(/^other:/, "");
const money = (fee) => (fee ? new Intl.NumberFormat("en-GB", { style: "currency", currency: fee.currency, maximumFractionDigits: fee.amount % 100 ? 2 : 0 }).format(fee.amount / 100) : "None");
const dateOf = (s) => (s.length === 10 ? day(s) : day(new Date(timeMs(s)).toISOString()));
const today = () => view.now.slice(0, 10);

function load(record, { now = DEMO_NOW, demo = true, file } = {}) {
  view.record = record;
  view.now = now;
  view.demo = demo;
  view.tampered = null;
  if (file) view.file = file;
  refresh();
}

function refresh() {
  view.state = currentState(view.record.events);
  const chain = verifyChain(view.record.events);
  const broken = $("[data-broken]");
  broken.hidden = chain.ok;
  broken.textContent = chain.ok ? "" : `This record's chain is broken at event ${chain.seq}. Rows shown from it cannot be trusted until it is verified again.`;
  $("[data-made-up]").hidden = !view.demo;
  $("[data-file]").textContent = view.file;
  $("[data-asof]").textContent = `As of ${day(today())}`;
  fillFilters();
  table();
  fillCheck();
  fillAdd();
  check();
  log();
}

/* ---------------------------------------------------------------- the table */
const running = () => new Map(conflicts(view.state, view.now).map((c) => [c.check.grant ?? "", c]));

function chip(st) {
  switch (st.kind) {
    case "live": return `<span class="st st-live">Live</span>`;
    case "expiring": return `<span class="st st-soon">Expiring in ${st.days} day${st.days === 1 ? "" : "s"}</span>`;
    case "expired": return `<span class="st st-expired">Expired</span>`;
    case "revoked": return `<span class="st st-revoked">Revoked</span>`;
    case "upcoming": return `<span class="st st-upcoming">Starts in ${st.days} day${st.days === 1 ? "" : "s"}</span>`;
  }
}

function useWords(g) {
  const m = { organic: "Organic", paid: "Paid", both: "Organic and paid" }[g.media];
  const extra = [g.whitelisting && "whitelisting", g.ads && "ads"].filter(Boolean);
  return `${m}${extra.length ? `, ${extra.join(" and ")}` : ""}`;
}

function rows() {
  const run = running();
  return Object.values(view.state.grants)
    .map((g) => ({ g, st: grantStatus(g, view.now), w: workOf(g.work), run: run.get(g.id) }))
    .sort((a, b) => timeMs(a.g.end, "end") - timeMs(b.g.end, "end"));
}

function table() {
  const all = rows();
  const list = all.filter(({ g, st, w, run }) =>
    (!f.status || (f.status === "running" ? !!run : st.kind === f.status)) &&
    (!f.creator || w?.creator === f.creator) &&
    (!f.channel || g.channels.includes(f.channel)));
  $("[data-count]").textContent = all.length;
  $("[data-say]").textContent = list.length === all.length ? `All ${all.length} grants, soonest end first` : `${list.length} of ${all.length} grants`;
  $("[data-body]").innerHTML = list.length ? list.map(({ g, st, w, run }) => `<tr${st.kind === "revoked" || st.kind === "expired" ? ' class="is-off"' : ""}>
    <td class="c-who" data-label="Creator and work"><b>${esc(nameOf(w?.creator ?? ""))}</b><span class="sub-l">${esc(w?.title ?? g.work)}</span><span class="sub-l mono">${esc(g.id)}${w && w.owners.length > 1 ? `, co-owned ${w.owners.map((o) => `${esc(nameOf(o.party).split(" ")[0])} ${o.shareBps / 100}%`).join(", ")}` : ""}</span></td>
    <td data-label="Channels">${esc(g.channels.map(chWord).join(", "))}<span class="sub-l">${esc(g.territory.join(", ") === "WW" ? "Worldwide" : g.territory.join(", "))}</span></td>
    <td data-label="Use">${esc(useWords(g))}</td>
    <td data-label="Window" class="c-when">${esc(dateOf(g.start))} to ${esc(dateOf(g.end))}</td>
    <td data-label="Fee" class="r fig">${esc(money(g.fee))}</td>
    <td data-label="Status" class="c-st">${chip(st)}${run ? `<span class="flag">Still running</span>` : ""}${st.kind === "revoked" ? `<span class="sub-l">${esc(dateOf(g.revokedAt))}, by ${esc(nameOf(g.revokedBy))}: ${esc(g.revokedReason)}</span>` : ""}</td>
  </tr>`).join("") : `<tr><td colspan="6" class="empty">No grant matches these filters.</td></tr>`;

  const k = (kind) => all.filter((r) => r.st.kind === kind).length;
  const soon = expiring(all.map((r) => r.g), view.now, 30).length;
  const run = all.filter((r) => r.run).length;
  $("[data-tally]").innerHTML = `<b>${k("live") + k("expiring")}</b> in force, <b>${soon}</b> ending within 30 days, <b>${k("expired")}</b> expired, <b>${k("revoked")}</b> revoked.${run ? ` <span class="flag-say"><b>${run}</b> still running after its right ended.</span>` : ""}`;
}

function fillFilters() {
  const creators = [...new Set(Object.values(view.state.works).map((w) => w.creator))].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const channels = [...new Set(Object.values(view.state.grants).flatMap((g) => g.channels))].sort();
  const sel = (el, first, items, label, val) => { el.innerHTML = `<option value="">${first}</option>${items.map((v) => `<option value="${esc(v)}">${esc(label(v))}</option>`).join("")}`; el.value = items.includes(val) ? val : ""; };
  sel($("[data-f-creator]"), "Every creator", creators, nameOf, f.creator);
  sel($("[data-f-channel]"), "Every channel", channels, chWord, f.channel);
  f.creator = $("[data-f-creator]").value;
  f.channel = $("[data-f-channel]").value;
}
$("[data-f-status]").addEventListener("change", (e) => { f.status = e.target.value; table(); });
$("[data-f-creator]").addEventListener("change", (e) => { f.creator = e.target.value; table(); });
$("[data-f-channel]").addEventListener("change", (e) => { f.channel = e.target.value; table(); });

/* ---------------------------------------------------------------- Can we use this? */
const checkForm = $("[data-check]");
const workOptions = () => Object.values(view.state.works).map((w) => `<option value="${esc(w.id)}">${esc(w.title)}, ${esc(nameOf(w.creator))}</option>`).join("");

function fillCheck() {
  const fm = checkForm.elements;
  const keep = { work: fm.work.value, brand: fm.brand.value, channel: fm.channel.value };
  $("[data-c-work]").innerHTML = workOptions();
  const brands = [...new Set(Object.values(view.state.grants).map((g) => g.brand))];
  $("[data-c-brand]").innerHTML = brands.map((b) => `<option value="${esc(b)}">${esc(nameOf(b))}</option>`).join("");
  $("[data-c-channel]").innerHTML = CHANNELS.map((c) => `<option value="${c}">${esc(chWord(c))}</option>`).join("");
  if (keep.work && view.state.works[keep.work]) fm.work.value = keep.work;
  else if (view.state.works["bram-commute"]) fm.work.value = "bram-commute";
  if (brands.includes(keep.brand)) fm.brand.value = keep.brand;
  fm.channel.value = keep.channel || "tiktok";
  if (!keep.work) fm.use.value = "whitelisting";
  if (!fm.at.value) fm.at.value = today();
}

function check() {
  const fm = checkForm.elements;
  const out = $("[data-answer]");
  if (!fm.work.value || !fm.brand.value) { out.innerHTML = `<p class="small">This record has no works or grants to check yet.</p>`; return; }
  if (!fm.at.value) { out.innerHTML = `<p class="small">Choose a date.</p>`; return; }
  const q = { brand: fm.brand.value, work: fm.work.value, channel: fm.channel.value, at: fm.at.value, use: fm.use.value, ...(fm.territory.value ? { territory: fm.territory.value } : {}) };
  const a = canUse(view.state, q);
  const w = workOf(q.work);
  const words = plain(a.reason);
  out.innerHTML = `<div class="ans ${a.allowed ? "yes" : "no"}"><p class="ans-big">${a.allowed ? "Yes" : "No"}</p><p class="ans-why">${esc(words)}.</p><p class="small">${esc(w ? `${w.title}, ${nameOf(w.creator)}` : q.work)}, ${esc(chWord(q.channel))}, ${esc(day(q.at))}. Checked against ${view.record.events.length} events, head ${esc(view.state.head.slice(0, 8))}.</p></div>`;
}
checkForm.addEventListener("input", check);
checkForm.addEventListener("change", check);
checkForm.addEventListener("submit", (e) => { e.preventDefault(); check(); });

/* ---------------------------------------------------------------- Add a grant */
const addForm = $("[data-add]");
const parties = () => [...new Set(view.record.events.flatMap((e) => [e.actor, e.data?.consent?.team, e.data?.work?.creator]).filter(Boolean))];

function fillAdd() {
  const fm = addForm.elements;
  const keep = fm.work.value;
  $("[data-a-work]").innerHTML = workOptions();
  if (keep && view.state.works[keep]) fm.work.value = keep;
  actors();
  const box = $("[data-a-channels]");
  if (!box.childElementCount) box.innerHTML = CHANNELS.slice(0, 8).map((c) => `<label class="chip-check"><input type="checkbox" name="channels" value="${c}"${c === "instagram" ? " checked" : ""}>${esc(chWord(c))}</label>`).join("");
  if (!fm.start.value) fm.start.value = today();
  if (!fm.end.value) { const d = new Date(`${today()}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 3); fm.end.value = d.toISOString().slice(0, 10); }
}

/* Everyone who appears in the record, with who may license this work listed first. */
function actors() {
  const fm = addForm.elements;
  const w = workOf(fm.work.value);
  const keep = fm.actor.value;
  const t = timeMs(view.now);
  const all = parties().filter((p) => !p.startsWith("brand:"));
  const may = w ? all.filter((p) => mayLicense(view.state, w.id, p, t)) : [];
  const rest = all.filter((p) => !may.includes(p));
  const opt = (p) => `<option value="${esc(p)}">${esc(nameOf(p))}</option>`;
  $("[data-a-actor]").innerHTML = `${may.length ? `<optgroup label="May license this work">${may.map(opt).join("")}</optgroup>` : ""}${rest.length ? `<optgroup label="No authority over it">${rest.map(opt).join("")}</optgroup>` : ""}`;
  if (all.includes(keep)) fm.actor.value = keep;
}
addForm.elements.work.addEventListener("change", actors);

function nextAt() {
  const last = view.record.events.at(-1);
  const base = Math.max(timeMs(view.now), last ? timeMs(last.at) + 1000 : 0);
  return new Date(base).toISOString().replace(/\.\d{3}Z$/, "Z");
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fm = addForm.elements;
  const err = $("[data-add-err]");
  const ok = $("[data-add-ok]");
  err.textContent = "";
  ok.textContent = "";
  for (const el of [fm.fee, fm.territory]) el.removeAttribute("aria-invalid");
  const channels = $$("input[name=channels]:checked", addForm).map((i) => i.value);
  const feeText = fm.fee.value.trim().replace(/[£,\s]/g, "");
  if (feeText && !/^\d+(\.\d{1,2})?$/.test(feeText)) { fm.fee.setAttribute("aria-invalid", "true"); err.textContent = "Write the fee in pounds, like 1200 or 1200.50, or leave it empty for none."; fm.fee.focus(); return; }
  const territory = fm.territory.value.toUpperCase().split(/[\s,]+/).filter(Boolean);
  if (!territory.length) { fm.territory.setAttribute("aria-invalid", "true"); err.textContent = "Name at least one country code, or WW for worldwide."; fm.territory.focus(); return; }
  const id = `hb-${String(Object.keys(view.state.grants).length + 1).padStart(2, "0")}${Math.random().toString(36).slice(2, 5)}`;
  const grant = {
    id, brand: $("[data-c-brand]").value || BRAND, work: fm.work.value, channels, media: fm.media.value, territory,
    start: fm.start.value, end: fm.end.value, fee: feeText ? { amount: Math.round(Number(feeText) * 100), currency: "GBP" } : null,
    whitelisting: fm.whitelisting.checked, ads: fm.ads.checked,
  };
  const res = append(view.record, { at: nextAt(), actor: fm.actor.value, type: "grant.issued", data: { grant } });
  if (!res.ok) { err.textContent = `Not added. ${plain(res.reason)}.`; return; }
  view.record = res.record;
  refresh();
  ok.textContent = `Added as event ${res.event.seq}, hash ${res.event.hash.slice(0, 12)}, chained to ${res.event.prev.slice(0, 12)}. On this device only.`;
});

/* Engine messages name parties, channels and times by id; say them in words. */
const CH_RE = new RegExp(`\\b(${CHANNELS.join("|")})\\b`, "g");
const plain = (s) => s
  .replace(/\b(brand|agency|creator|team):[a-z0-9-]+/g, (p) => nameOf(p))
  .replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?/g, (t) => dateOf(t))
  .replace(CH_RE, (c) => chWord(c))
  .replace(/event\.data\.grant\./g, "");

/* ---------------------------------------------------------------- the record */
function verdict() {
  const v = verifyChain(view.record.events);
  const el = $("[data-verdict]");
  el.className = `verdict ${v.ok ? "is-ok" : "is-bad"}`;
  el.innerHTML = v.ok
    ? `<b>Intact.</b> ${v.length} events, each hash matching. Head <span class="mono">${esc(v.head.slice(0, 16))}</span>.`
    : `<b>Broken at event ${v.seq}.</b> ${esc(v.reason)}.`;
}
$("[data-verify]").addEventListener("click", verdict);

$("[data-tamper]").addEventListener("click", () => {
  if (view.tampered) return;
  const ev = view.record.events.find((e) => e.type === "grant.issued" && e.data.grant.fee) ?? view.record.events.find((e) => e.type === "grant.issued");
  if (!ev) return;
  const events = structuredClone(view.record.events);
  const t = events[ev.seq];
  const was = t.data.grant.fee ? money(t.data.grant.fee) : "no fee";
  t.data.grant.fee = { amount: 1, currency: "GBP" };
  view.tampered = { seq: ev.seq, was };
  view.record = { ...view.record, events };
  refresh();
  $("[data-verdict]").className = "verdict";
  $("[data-verdict]").innerHTML = `Changed the fee on grant ${esc(t.data.grant.id)} (event ${ev.seq}) from ${esc(was)} to 1p, without rehashing. Now verify the chain.`;
});

$("[data-reset]").addEventListener("click", () => {
  load(demoEvents(), { file: "harbour_oats_ugc.rights.json" });
  $("[data-verdict]").className = "verdict";
  $("[data-verdict]").textContent = "The demo is back as it was written.";
  $("[data-import-err]").textContent = "";
});

$("[data-json]").addEventListener("click", () => download(view.file.endsWith(".json") ? view.file : `${view.record.id}.rights.json`, exportJson(view.record), "application/json"));
$("[data-ics]").addEventListener("click", () => {
  const titleOf = (g) => `Usage right ends: ${workOf(g.work)?.title ?? g.work} (${nameOf(workOf(g.work)?.creator ?? "")}) for ${nameOf(g.brand)}`;
  const ics = expiryCalendar(Object.values(view.state.grants).filter((g) => timeMs(g.end, "end") > timeMs(view.now)), { now: view.now, name: view.record.title ?? "Usage rights", titleOf });
  download(`${view.record.id}-expiry.ics`, ics, "text/calendar");
});

$("[data-import]").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  const out = $("[data-import-err]");
  out.textContent = "";
  if (!file) return;
  if (file.size > 5_000_000) { out.textContent = "That file is over 5 MB; a rights record is usually far smaller."; return; }
  const res = importJson(await readText(file));
  if (!res.ok) { out.innerHTML = `<p>Not imported. ${res.errors.length} problem${res.errors.length === 1 ? "" : "s"}:</p><ul>${res.errors.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`; return; }
  load(res.record, { now: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), demo: false, file: file.name });
  verdict();
  if (res.state.rejected.length) out.textContent = `${res.state.rejected.length} event${res.state.rejected.length === 1 ? "" : "s"} in this record carried no authority and changed nothing.`;
});

/* ---------------------------------------------------------------- the event log */
const TYPE_WORDS = {
  "work.registered": "registered a work", "ownership.set": "set co-owners", "ownership.transferred": "transferred a share",
  "consent.granted": "granted consent", "consent.revoked": "revoked consent", "grant.issued": "issued a grant",
  "grant.extended": "extended a grant", "grant.revoked": "revoked a grant", "usage.reported": "reported use", "usage.ended": "ended reported use",
};
function log() {
  const ev = view.record.events;
  $("[data-log-meta]").textContent = `${Math.min(8, ev.length)} of ${ev.length}`;
  $("[data-log]").innerHTML = ev.slice(-8).reverse().map((e) => {
    const what = e.data.grant?.id ?? e.data.id ?? e.data.work?.id ?? e.data.consent?.scope ?? e.data.usage?.id ?? e.data.work ?? "";
    return `<li><span class="mono l-n">${e.seq}</span><span class="l-w">${esc(nameOf(e.actor))} ${esc(TYPE_WORDS[e.type] ?? e.type)} <span class="mono">${esc(what)}</span><span class="sub-l">${esc(dateOf(e.at))}</span></span><span class="mono l-h" title="${esc(e.hash)}">${esc(e.hash.slice(0, 10))}</span></li>`;
  }).join("");
}

load(demoEvents());
